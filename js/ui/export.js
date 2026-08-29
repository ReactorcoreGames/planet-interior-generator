/* PNG export, clipboard, and the shareable settings string.
 *
 * EXPORT RE-RENDERS; IT NEVER SCALES THE PREVIEW. The preview canvas is sized
 * to its CSS box at whatever the device pixel ratio happens to be, so reading
 * it back would give a picture whose size depended on the user's monitor. An
 * export instead builds a fresh offscreen canvas at the chosen resolution and
 * runs the same `CC.Scene.render` over the same cached body and details.
 *
 * WHICH IS WHY RESOLUTION INDEPENDENCE MATTERS HERE and not only in the
 * abstract: nothing in the generator consults `view.R`, so a 2160px export has
 * exactly the elements the 720px preview had, in the same places, at four
 * times the size. If a count ever did scale with resolution, this is the
 * feature that would expose it — which is why test/domtest.mjs asserts the op
 * count is identical at 360p and 2160p.
 *
 * THE MENU ITEMS ARE THE ONES PARAMETERS.md SPECIFIES, and each is a small
 * override on the current settings rather than a separate code path:
 *
 *   current      the settings exactly as they stand
 *   square       aspect forced to 1:1, keeping the chosen background
 *   composed     the body and its info card in one frame
 *   card         the info card alone, at the chosen resolution
 *   clipboard    same as `current`, written to the clipboard instead of a file
 *   settings     no image at all - the seed and every non-default control,
 *                as a short string
 *   factsheet    the card as markdown (ui/share.js)
 *
 * Loaded after js/ui/controls.js and before js/main.js, which hands it the
 * render callback it cannot get for itself. */

var CC = CC || {};

CC.Export = (function () {
  "use strict";

  /* Supplied by main.js: `renderTo(ctx, w, h, overrides)` draws the current
   * body at an arbitrary size with a few settings replaced. Injected rather
   * than reached for, so this module never learns about the cache or the
   * pipeline. */
  var renderTo = null;
  var getSettings = null;
  var getName = null;
  var getStats = null;
  var drawBackground = null;

  var ASPECTS = { "16:9": 16 / 9, "1:1": 1, "4:3": 4 / 3, "3:2": 3 / 2 };

  /* THE COMPOSED EXPORT HAS AN ASPECT FLOOR, and it is a real constraint
   * rather than a tidiness rule.
   *
   * The card takes a fixed share of the WIDTH (~31.5%), so the narrower the
   * frame the less is left for the body — and the body is sized off the
   * SHORTER axis, which in a tall frame is that shrinking width. Past a point
   * the two stop coexisting: the body is a dot in a third of the frame, or the
   * card is forced so narrow that `layoutFor` grows the canvas taller, which
   * makes the frame narrower still. A 9:16 composition is not a layout problem
   * with a clever answer; it is two things that do not fit beside each other.
   *
   * 4:3 is where the body area stops being the shorter axis by a comfortable
   * margin — `bodyAreaW` at 4:3 is about 0.85 of the height, so the disc is
   * still framed by its height and looks deliberate. Below that the export
   * falls back to this ratio rather than refusing, so a user who picked 1:1
   * gets the tabletop image they were going to get anyway instead of an error.
   *
   * The OTHER exports have no such floor: a body alone centres happily in any
   * frame, and the square export is defined by its ratio. */
  var COMPOSED_MIN_ASPECT = 4 / 3;

  /* Which ratio a composed export will actually use, and whether that differs
   * from what the control says. Exposed so the caller can tell the user their
   * 1:1 became a 4:3 rather than leaving them to notice. */
  function composedAspect(settings) {
    var want = ASPECTS[settings.aspect] || (16 / 9);
    if (want >= COMPOSED_MIN_ASPECT) {
      return { ratio: want, clamped: false, label: settings.aspect };
    }
    return { ratio: COMPOSED_MIN_ASPECT, clamped: true, label: "4:3" };
  }

  /* Vertical resolution is the control; the width follows from the aspect.
   * That is the right way round because "1080p" is a statement about height,
   * and it keeps a 1:1 export from being four times the pixels of a 16:9 one
   * at the same nominal setting. */
  function sizeFor(settings) {
    var h = parseInt(settings.resolution, 10) || 1080;
    var ratio = ASPECTS[settings.aspect] || (16 / 9);
    return { width: Math.round(h * ratio), height: h };
  }

  function makeCanvas(w, h) {
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  function mergeSettings(overrides) {
    return CC.Math.merge(getSettings(), overrides || {});
  }

  /* Render the current body to a fresh canvas at export size. */
  function renderCanvas(overrides) {
    var merged = mergeSettings(overrides);
    var size = sizeFor(merged);
    var canvas = makeCanvas(size.width, size.height);
    var ctx = canvas.getContext("2d");
    renderTo(ctx, size.width, size.height, merged);
    return { canvas: canvas, settings: merged, width: size.width, height: size.height };
  }

  /* ---- filenames -------------------------------------------------------- */

  /* PARAMETERS.md's token set. Kept as a plain replace rather than a template
   * engine, because there are five tokens and there will never be fifty. */
  function filenameFor(settings, kind) {
    var name = (getName ? getName() : "") || settings.seed || "body";
    var date = new Date();
    var stamp = date.getFullYear() + "-" +
      String(date.getMonth() + 1).padStart(2, "0") + "-" +
      String(date.getDate()).padStart(2, "0");

    var safe = String(name).replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    var ratio = String(settings.aspect || "16-9").replace(":", "-");
    return [safe || "body", settings.archetype || "body", stamp, ratio,
            kind === "current" ? null : kind]
      .filter(Boolean).join("_") + ".png";
  }

  /* ---- the actions ------------------------------------------------------ */

  /* Each menu item is a small OVERRIDE on the current settings, never a
   * separate code path — so a mode cannot drift from what the controls say.
   *
   * `card` is the one that changes the frame rather than a setting: it asks
   * for the composed layout, where the body takes the left and the info card
   * the right. */
  var MODES = {
    current: {},
    /* THE SQUARE EXPORT KEEPS THE CHOSEN BACKGROUND. It is a framing shortcut,
     * not a second body-only mode: "body only" here means "without the info
     * card", which every non-composed export already is.
     *
     * IT REPLACED A TRANSPARENT MODE. There was a separate
     * `body: { background: "transparent" }` item, and it was removed rather
     * than kept alongside — a 1:1 frame is the more versatile of the two, and
     * transparency is reachable from it anyway by setting the Output
     * background to Transparent and exporting the square. Two menu items for
     * one framing decision plus one background decision is the menu doing the
     * multiplying that the controls should. */
    square: { aspect: "1:1" },
    composed: { composed: true }
  };

  /* ---- the composed layout ----------------------------------------------
   *
   * Body left, card right — v2's `render169` proportions, which are the ones
   * worth keeping: `panelW = w * 0.30`, and crucially
   *
   *     bodyAreaW = w - panelW - margin * 2
   *
   * so the body centres in WHAT IS LEFT rather than in the whole frame. That
   * one line is the difference between a composed image and a card sitting on
   * top of a picture.
   *
   * WHAT IS NOT TAKEN FROM v2: it dropped content when the card ran long. Here
   * the card measures itself first (draw/card.js), and if the tightest layout
   * still does not fit, THE CANVAS GROWS to hold it. An export may therefore
   * come back slightly taller than the nominal aspect — which is the honest
   * trade, since the alternative is losing a line the user asked for. */
  function renderComposed(overrides) {
    var merged = mergeSettings(overrides);

    /* The aspect floor, applied here rather than in `sizeFor` — it is a fact
     * about THIS composition, not about export sizing in general. */
    var asp = composedAspect(merged);
    var h = parseInt(merged.resolution, 10) || 1080;
    var w = Math.round(h * asp.ratio);

    var margin = Math.round(h * 0.045);
    var cardW = CC.Card.preferredWidth(w);

    /* Measure before committing to a canvas size, so growth is decided once.
     * A scratch context is needed because measurement wants real font metrics
     * and there is no canvas yet. */
    var probe = makeCanvas(8, 8).getContext("2d");
    var lines = CC.Card.filterLines(getStats(), merged.infoDetail);
    var avail = h - margin * 2;
    var layout = CC.Card.layoutFor(probe, getStats(), lines, cardW, avail,
                                   Math.round(w * 0.42));
    cardW = layout.w;

    /* THE CANVAS GROWS RATHER THAN THE CARD CLIPPING. */
    if (layout.overflow) h = Math.ceil(layout.total + margin * 2);

    var canvas = makeCanvas(w, h);
    var ctx = canvas.getContext("2d");

    /* The background spans the whole frame, so the card sits ON the scene
     * rather than beside a differently-coloured panel. */
    CC.Canvas.drawBackground(ctx, w, h, merged.background || "solid", {
      color: merged.backgroundColor || "#05070e",
      color2: merged.backgroundColor2,
      angle: merged.backgroundAngle,
      stars: merged.stars === undefined ? true : !!merged.stars,
      seed: merged.seed,
      density: merged.starfieldDensity === undefined ? 0.6 : merged.starfieldDensity,
      scale: merged.nebulaScale === undefined ? 0.5 : merged.nebulaScale
    });

    var bodyAreaW = w - cardW - margin * 2;
    renderTo(ctx, w, h, merged,
             { x: 0, y: 0, width: bodyAreaW + margin, height: h });

    /* THE CARD IS CENTRED IN ITS COLUMN NOW THAT IT IS ONLY AS TALL AS ITS
     * CONTENT. Pinned to the top it read as a card that had failed to fill the
     * frame; centred against the body's own centre line, a Compact card reads
     * as a deliberately small label beside a planet. */
    var cardH = Math.min(layout.total, h - margin * 2);
    var cardY = layout.overflow ? margin : Math.round((h - cardH) / 2);

    CC.Card.draw(ctx, w - cardW - margin, cardY, cardW, cardH,
                 getStats(), { detail: merged.infoDetail, maxWidth: cardW });

    return { canvas: canvas, settings: merged, width: w, height: h,
             grew: !!layout.overflow,
             aspect: asp.label, aspectClamped: asp.clamped };
  }

  /* The card ALONE, at a size of its own choosing — a portrait image somebody
   * can drop into a document beside their own art. It cannot grow sideways,
   * because there is nothing to take the room from, so it grows downward. */
  function renderCard(overrides) {
    var merged = mergeSettings(overrides);
    var stats = getStats();
    var target = parseInt(merged.resolution, 10) || 1080;

    /* RESOLUTION SCALES THE CARD; IT DOES NOT DICTATE ITS HEIGHT.
     *
     * The control used to be read as a fraction of the WIDTH, which meant
     * "2160 px" produced a card 907px wide and whatever height its text needed —
     * the number appeared nowhere in the output, so the control did something
     * without doing what it said.
     *
     * THE OBVIOUS FIX IS WRONG, and it is worth recording why. Solving for the
     * width whose card is exactly `resolution` tall does make the number mean
     * the height — but the card has no aspect ratio of its own, so the width
     * has to absorb every difference in how much there is to say. A Compact
     * card of six lines needed to be 1490px WIDE to reach 1080px tall: a
     * near-square slab of enormous text. The control was honoured and the
     * output was worse.
     *
     * So resolution scales the card the way it scales everything else. The
     * width is a fixed fraction of it, the height follows from the content, and
     * a 2160px card is exactly a 1080px card at twice the size — same
     * proportions, same line breaks, twice the pixels. The number is honoured
     * in the sense that matters for a card: pick a bigger resolution and you
     * get a bigger card.
     *
     * THE HEIGHT IS THEREFORE THE CONTENT'S, which is the right answer for an
     * image with no frame: a Full card is genuinely taller than a Compact one,
     * and padding it out to a fixed height would only add blank panel — the
     * very thing the composed export was just fixed to stop doing.
     *
     * Redrawn at the target size rather than scaled from a smaller bitmap, so
     * the text is rasterized at the real font size. */
    var probe = makeCanvas(8, 8).getContext("2d");
    var lines = CC.Card.filterLines(stats, merged.infoDetail);

    var cardW = Math.round(target * 0.42);
    var layout = CC.Card.layoutFor(probe, stats, lines, cardW, 0, cardW);
    var h = Math.ceil(layout.total);

    var canvas = makeCanvas(cardW, h);
    var ctx = canvas.getContext("2d");
    CC.Card.draw(ctx, 0, 0, cardW, h, stats,
                 { detail: merged.infoDetail, maxWidth: cardW });

    return { canvas: canvas, settings: merged, width: cardW, height: h };
  }

  function canvasFor(kind) {
    if (kind === "composed") return renderComposed(MODES.composed);
    if (kind === "card") return renderCard({});
    return renderCanvas(MODES[kind] || {});
  }

  function savePng(kind) {
    var out = canvasFor(kind);
    var url;

    /* The filename must name the ratio the file ACTUALLY has. A composed
     * export whose aspect was clamped up to 4:3 would otherwise be called
     * `..._1-1_composed.png` while being a 4:3 image, which is the sort of
     * thing that is only discovered after it has been filed. */
    if (out.aspect) out.settings = CC.Math.merge(out.settings, { aspect: out.aspect });
    try {
      url = out.canvas.toDataURL("image/png");
    } catch (e) {
      return { ok: false, error: "canvas could not be encoded" };
    }

    var a = document.createElement("a");
    a.href = url;
    a.download = filenameFor(out.settings, kind);
    /* Not appended to the document: a detached anchor still dispatches a click
     * in every browser this ships to, and appending one means remembering to
     * remove it on every exit path including the throwing ones. */
    a.click();

    /* The message is the FILENAME AND THE PIXEL SIZE, because those are the
     * two things the user cannot check without going to their downloads
     * folder — and the size is where a surprise lives: a composed export may
     * have grown to hold a long card, or had its aspect clamped up to 4:3. */
    var msg = "Saved " + a.download + "  (" + out.width + "x" + out.height + ")";
    if (out.aspectClamped) msg += " - narrow aspects fall back to 4:3 here";
    else if (out.grew) msg += " - grew to fit the card";

    return { ok: true, filename: a.download, width: out.width, height: out.height,
             grew: !!out.grew, aspectClamped: !!out.aspectClamped, message: msg };
  }

  /* The clipboard path needs a Blob and a secure context, and older browsers
   * have neither. It reports rather than throws, so the caller can say
   * something useful instead of the menu appearing to do nothing.
   *
   * IT REPORTS TWICE, and the second report is the one that is true.
   *
   * The write is asynchronous — the encode is, and `clipboard.write` returns a
   * promise on top of that — so the synchronous return can only ever say "this
   * has been started". It used to say `{ ok: true }` there and stop, which
   * meant a clipboard write REJECTED for want of permission still flashed the
   * success colour: the one export whose result the user cannot see was also
   * the one lying about it.
   *
   * So `onDone` is called when the write actually settles, and the caller
   * shows the real outcome then. The synchronous return carries `pending` so
   * the caller knows to expect it and can say "copying…" in the meantime. */
  function copyImage(onDone) {
    var report = function (result) { if (onDone) onDone(result); };
    var out = renderCanvas({});

    if (!out.canvas.toBlob || typeof ClipboardItem === "undefined" ||
        !navigator.clipboard || !navigator.clipboard.write) {
      return { ok: false, error: "This browser can't copy images to the clipboard." };
    }

    out.canvas.toBlob(function (blob) {
      if (!blob) {
        report({ ok: false, error: "The image could not be encoded." });
        return;
      }
      try {
        var p = navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        if (p && p.then) {
          p.then(function () {
            report({ ok: true, message: "Image copied to clipboard",
                     width: out.width, height: out.height });
          }, function () {
            report({ ok: false,
                     error: "The browser refused clipboard access. Click the page, then try again." });
          });
        } else {
          report({ ok: true, message: "Image copied to clipboard" });
        }
      } catch (e) {
        report({ ok: false, error: "The browser refused clipboard access." });
      }
    }, "image/png");

    return { ok: true, pending: true, message: "Copying image…" };
  }

  /* ---- dispatch --------------------------------------------------------- */

  /* The text actions live in ui/share.js; this stays the one entry point the
   * menu calls, so a caller does not have to know which half an action lands
   * in. */
  /* `onDone` is optional and is called ONLY by the actions that settle
   * asynchronously — the two clipboard writes. Everything else is finished by
   * the time it returns, so a caller that only reads the return value still
   * gets the whole truth for those. */
  function run(action, onDone) {
    if (action === "clipboard") return copyImage(onDone);
    if (action === "settings") return CC.Share.copySettings(onDone);
    if (action === "factsheet") return CC.Share.saveFactsheet();
    return savePng(action);
  }

  function init(opts) {
    renderTo = opts.renderTo;
    getSettings = opts.getSettings;
    getName = opts.getName || null;
    getStats = opts.getStats || null;

    /* ui/share.js needs the same two accessors plus the filename helper, and
     * is handed them here rather than reaching for them itself. */
    CC.Share.init({
      getSettings: getSettings,
      getStats: getStats,
      filenameFor: filenameFor
    });
  }

  return {
    init: init,
    run: run,
    savePng: savePng,
    copyImage: copyImage,
    /* Re-exported so the menu, the tests and main.js keep ONE import site for
     * "export something", even though the text half lives in CC.Share. */
    copySettings: function () { return CC.Share.copySettings(); },
    settingsText: function () { return CC.Share.settingsText(); },
    factsheetText: function () { return CC.Share.factsheetText(); },
    looksLikeSettings: function (t) { return CC.Share.looksLikeSettings(t); },
    applySettingsText: function (t) { return CC.Share.applySettingsText(t); },
    saveFactsheet: function () { return CC.Share.saveFactsheet(); },
    renderComposed: renderComposed,
    renderCard: renderCard,
    canvasFor: canvasFor,
    filenameFor: filenameFor,
    sizeFor: sizeFor,
    renderCanvas: renderCanvas,
    ASPECTS: ASPECTS
  };
})();
