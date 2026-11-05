/* Application wiring: controls -> pipeline -> canvas.
 *
 * Exposes window.CelestialCutaway as the app's public surface. The test
 * harness drives the real DOM controls rather than this object; the API is
 * here so tests can inspect what actually got generated, and so a body can be
 * produced headlessly without a canvas.
 *
 * The settings object and the stage keys are in js/ui/gather.js, the interface
 * syncs in js/ui/sync.js. */

var CC = CC || {};

(function () {
  "use strict";

  var canvas = null;
  var ctx = null;
  var current = null;         /* the generated body */
  var currentPalette = null;  /* its colours */
  var currentDetails = null;  /* its detail element geometry */
  var currentStats = null;    /* its info card, derived from the two above */
  var frame = null;           /* pending animation frame */

  /* ---- settings ------------------------------------------------------- */

  function gather() { return CC.Gather.read(traitSalt); }

  /* ---- pipeline ------------------------------------------------------- */

  /* Settings -> a body description. No canvas involved, so this is callable
   * headlessly and is what the tests inspect. */
  function generate(settings) {
    var archetype = CC.Archetypes.get(settings.archetype);
    return CC.Structure.build(archetype, settings, settings.seed);
  }

  /* Body + settings -> a colour per layer. Separate from generate() because
   * the two stages run off independent RNG streams: a colour change must
   * never disturb the geometry, and this is what makes that structural
   * rather than a promise. */
  function palette(body, settings) {
    var archetype = CC.Archetypes.get(settings.archetype);
    return CC.Palette.build(body, archetype.colorProfile, settings, settings.seed);
  }

  /* Body + settings -> detail element geometry. */
  function details(body, settings) {
    return CC.Details.build(body, settings, settings.seed);
  }

  /* Re-roll traits without touching anything else.
   *
   * The salt rides in `settings.traitSalt`, which gen/traitroll.js folds into
   * its stream key — so the traits change while the seed, the structure, the
   * palette and every layer detail stay byte-identical. That separation is
   * the whole point of the per-stage RNG streams. */
  function rerollTraits() {
    traitSalt++;
    if (CC.TraitPicker) CC.TraitPicker.clear();
    requestDraw();
  }

  /* ---- stage caching ----------------------------------------------------
   *
   * ARCHITECTURE's caching table: a colour change redraws cached geometry
   * without regenerating it, and only a detail or structure change re-rolls.
   * The cache key is the set of settings a stage actually reads, so dragging
   * Saturation cannot re-roll a single element position — the guarantee is
   * structural rather than a promise. */

  var cache = { key: null, body: null, details: null };

  /* The outermost body-space radius the last render reached, which is what the
   * pan clamp bounds travel by. Cached from the render rather than recomputed,
   * because it folds in the atmosphere bulge and the outward traits that only
   * draw/scene.js measures. */
  var currentExtent = 1;

  /* Bumped by "Re-roll traits", which needs to produce a different roll from
   * the same seed and settings. Without it the cache key would be identical
   * and the button would do nothing — the silently-inert control the domtest
   * exists to catch. */
  var traitSalt = 0;

  /* ---- rendering ------------------------------------------------------ */

  function draw() {
    frame = null;
    if (!canvas) return;

    var settings = gather();

    /* Regenerate geometry only when a setting that shapes it has changed.
     * Element opacity and every colour control fall through to a redraw of
     * the cached geometry. */
    var key = CC.Gather.detailKey(settings, traitSalt);
    if (cache.key !== key) {
      cache.body = generate(settings);
      cache.details = details(cache.body, settings);
      cache.key = key;
    }
    current = cache.body;
    currentDetails = cache.details;

    /* Colour is cheap and depends on its own controls, so it is rebuilt every
     * draw rather than cached — it never touches geometry. */
    currentPalette = palette(current, settings);

    var fit = CC.Canvas.fitToDisplay(canvas);
    ctx = fit.ctx;

    /* THE INFO CARD MUST NOT BE A ZOOM CONTROL.
     *
     * The card is given room by padding `#preview`, which narrows the canvas.
     * In a wide window that changes nothing, because height is the shorter axis
     * either way — but on a 1280x800 or 1440x900 screen the padded width
     * becomes the shorter axis, and the body is sized off it. Turning the card
     * off then gave the width back and the body ZOOMED by up to 48%, running
     * off the bottom of the frame. It read as the card zooming the picture,
     * because that is what it was doing.
     *
     * THE CANVAS NO LONGER CHANGES SIZE WHEN THE CARD IS TOGGLED, which is
     * what finally closed this. The card used to be given room by padding the
     * preview; that shrank the canvas, which meant the body was being sized
     * from a box the card controlled, which is how a display toggle came to
     * resize and crop the render. It also cut the preview's background off
     * halfway under the card, because the background only reaches as far as the
     * canvas does.
     *
     * The canvas is now full-bleed at all times and the room the card needs is
     * a SHIFT of the body's centre. Read from the `--card-room` custom property
     * so the responsive ladder in style.css stays the single source of how much
     * room the card takes, exactly as the padding was.
     *
     * NOT CONDITIONAL ON `settings.showInfo`. The offset applies whether the
     * card is visible or not, so the composition is identical in both states
     * and toggling the card provably cannot disturb the render. */
    var offsetX = 0;
    var preview = canvas.parentNode;
    if (preview && typeof window !== "undefined" && window.getComputedStyle) {
      var room = window.getComputedStyle(preview).getPropertyValue("--card-room");
      offsetX = parseFloat(room) || 0;
      /* Never shift so far that the body leaves the frame on a window narrower
       * than the ladder anticipated. A body pushed off the left edge would be a
       * worse failure than a card overlapping it. */
      var cap = fit.width * 0.35;
      if (offsetX > cap) offsetX = cap;
    }

    /* While framed, the labels and scale bar lay out inside the guide's
     * rectangle, which is where the export's own corners are. */
    var chromeBox = CC.Framing ? CC.Framing.frameRect(fit.width, fit.height, settings.aspect) : null;

    var rendered = CC.Scene.render(ctx, fit.width, fit.height, current,
                    CC.Math.merge(settings, { offsetX: offsetX, chromeBox: chromeBox }),
                    currentPalette, currentDetails);

    /* THE FRAMING GESTURES READ THE VIEW THE RENDER ACTUALLY USED, rather than
     * recomputing the transform from settings. Two copies of that arithmetic
     * would be two chances to disagree, and the symptom would be a drag that
     * does not track the cursor — so there is only ever one, and it is this. */
    if (CC.Framing) {
      currentExtent = rendered.extent || 1;
      CC.Framing.setView(rendered.view);

      /* AFTER the scene and only on the preview canvas: the guide is chrome,
       * and `renderTo` — the path every export takes — never runs this line. */
      CC.Framing.drawGuide(ctx, fit.width, fit.height, settings.aspect);
    }

    /* THE STATS ARE DERIVED FROM WHAT WAS JUST DRAWN, not from the settings
     * alone — `current` and `currentDetails` are the body and the climate that
     * produced the pixels above. That ordering is the mechanical half of
     * HAZARDS.md's rule; there is no path by which the card can be built from
     * anything else. Cheap enough to rebuild every frame, and rebuilding it
     * means it can never be stale against the render beside it. */
    currentStats = CC.Stats.build(current, currentDetails, settings,
                                  CC.Archetypes.get(settings.archetype),
                                  currentPalette);
    if (CC.InfoPanel) {
      CC.InfoPanel.setVisible(settings.showInfo);
      if (settings.showInfo) CC.InfoPanel.render(currentStats, settings.infoDetail);
    }

    updateMeta(settings);

    /* Every change ends in a draw, whatever route it took, so this is where
     * the settings are saved (debounced, and only when they changed). */
    if (CC.Persist) CC.Persist.schedule();
  }

  /* Render the current body to an arbitrary context at an arbitrary size, with
   * a few settings overridden. This is what Export calls: it reuses the cached
   * body and detail geometry, so an export is the SAME world at a different
   * number of pixels rather than a fresh roll that happens to share a seed. */
  function renderTo(exportCtx, width, height, settings, region) {
    if (!current) draw();
    var pal = palette(current, settings);

    /* THE BODY MAY BE ASKED TO OCCUPY A SUB-REGION, which is what a composed
     * export needs: the card takes the right-hand third, so the body must
     * centre in what is left rather than in the whole canvas.
     *
     * Done by translating the context and handing the scene the REGION's
     * dimensions, rather than by teaching the scene about layout. The scene
     * centres in whatever box it is given and knows nothing about cards —
     * `draw/` stays free of composition, the same way it is free of role names
     * and zone logic (D23). */
    if (region) {
      exportCtx.save();
      exportCtx.translate(region.x, region.y);
      /* The background is painted across the WHOLE canvas by the caller, so
       * the region render must neither paint its own nor CLEAR what is there.
       * `transparent` would do the latter — see draw/scene.js. */
      CC.Scene.render(exportCtx, region.width, region.height, current,
                      CC.Math.merge(settings, { skipBackground: true }),
                      pal, currentDetails);
      exportCtx.restore();
      return;
    }

    CC.Scene.render(exportCtx, width, height, current, settings, pal, currentDetails);
  }

  /* Coalesce bursts of control changes into one render per frame, so dragging
   * a slider doesn't queue up work it will immediately throw away. */
  function requestDraw() {
    if (frame !== null) return;
    frame = (typeof requestAnimationFrame === "function")
      ? requestAnimationFrame(draw)
      : setTimeout(draw, 0);
  }

  function updateMeta(settings) {
    var name = document.getElementById("meta-name");
    var detail = document.getElementById("meta-detail");
    if (name) name.textContent = settings.seed;
    if (detail && current) {
      var parts = current.layers.map(function (l) { return l.role; });

      /* Rolled traits are shown here, because otherwise a body would carry
       * traits the user can see in the picture but nowhere in the interface —
       * and Randomize deliberately clears the picker to let the roll happen. */
      if (currentDetails && currentDetails.traits && currentDetails.traits.length) {
        var names = currentDetails.traits.map(function (t) { return t.label; });
        detail.textContent = parts.join("  ·  ") + "   —   " + names.join(", ");
      } else {
        detail.textContent = parts.join("  ·  ");
      }
    }
  }

  function init() {
    canvas = document.getElementById("stage");

    CC.Accordion.init(document);

    /* The section toggle and the help modal. Both are pure interface: neither
     * touches the pipeline, so neither asks for a redraw. */
    if (CC.Help) CC.Help.init();
    CC.Sync.setupSectionToggle();

    CC.Controls.bindAll(CC.Gather.CONTROL_SPECS);
    CC.Controls.setChangeHandler(function (id) {
      if (id === "keep-upright") CC.Sync.syncRotationEnabled();
      if (id === "background" || id === "stars") CC.Sync.syncBackgroundColour(canvas);
      if (id === "archetype") {
        var a = CC.Controls.get("archetype") || "planet";
        if (CC.TraitPicker) CC.TraitPicker.setArchetype(a);
        if (CC.PresetGallery) CC.PresetGallery.setArchetype(a);
        CC.Controls.syncAxisDials();
      }
      /* A nebula's traits depend on its form (`when`), so the list follows. */
      if (id === "nebula-form" && CC.TraitPicker) CC.TraitPicker.build();
      requestDraw();
    });

    /* The trait picker rebuilds itself on every change, since selecting one
     * trait can exclude others. A change there is a detail-stage change. */
    if (CC.TraitPicker) {
      CC.TraitPicker.init(document.getElementById("trait-list"), function () {
        requestDraw();
      }, gather);
      /* AND IT MUST BE TOLD WHICH BODY IT IS LOOKING AT, at init and not only
       * on change.
       *
       * The picker defaults to `planet` internally and only ever heard about
       * archetype CHANGES, so a page loaded with the control already restored
       * to `gas-giant` showed the PLANET's trait list — nothing had changed,
       * so nothing told it. The user found this by pressing F5 with a gas
       * giant selected, which is the one path no code here exercises.
       *
       * `PresetGallery` two blocks down already did exactly this; the picker
       * was simply missing the same line. */
      CC.TraitPicker.setArchetype(CC.Controls.get("archetype") || "planet");
    }

    /* AT INIT AS WELL AS ON CHANGE — see syncAxisDials, and D79/D114 before
     * it: a page restored with a star already selected fires no change event,
     * so a change-only hook is a control still wearing the planet's label. */
    CC.Controls.syncAxisDials();

    if (CC.InfoPanel) CC.InfoPanel.init(document.getElementById("info-panel"));

    /* The preset gallery. Applying one writes control values and nothing else,
     * so all it needs from here is a redraw — the same relationship the trait
     * picker has. */
    if (CC.PresetGallery) {
      CC.PresetGallery.init(document.getElementById("preset-gallery"), function () {
        CC.Sync.syncRotationEnabled();
        CC.Sync.syncBackgroundColour(canvas);
        requestDraw();
      });
      CC.PresetGallery.setArchetype(CC.Controls.get("archetype") || "planet");
    }

    /* Randomize lives in its own module but needs two things only main.js
     * owns: the trait salt, and the render loop. Handed over explicitly. */
    CC.Randomize.init({
      reroll: function () { traitSalt++; },
      draw: requestDraw
    });

    /* Framing. Handed the canvas it listens on, the render loop, and the
     * current extent for its pan clamp — the last of which only main.js can
     * know, since it is measured by the render. The zoom mapping stays inside
     * the module, so the slider and the gestures cannot drift apart. */
    if (CC.Framing) {
      CC.Framing.init({
        canvas: canvas,
        requestDraw: requestDraw,
        getExtent: function () { return currentExtent; }
      });
    }

    on("reroll-traits", "click", rerollTraits);

    CC.Sync.syncRotationEnabled();
    CC.Sync.syncBackgroundColour(canvas);

    on("randomize-btn", "click", CC.Randomize.run);
    on("seed-roll", "click", function () {
      CC.Controls.set("seed", CC.Randomize.randomSeed(CC.RNG.mulberry32(
        (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0)));
      requestDraw();
    });

    on("lock-all", "click", CC.Controls.lockAll);
    on("unlock-all", "click", CC.Controls.unlockAll);
    on("invert-locks", "click", CC.Controls.invertLocks);
    CC.Controls.initSectionLocks();

    /* The export menu, its feedback and the settings-paste import live in
     * ui/exportui.js; the keyboard map, initialised after it, in ui/keys.js. It is handed the four accessors
     * CC.Export needs — all of them closures over the pipeline and the current
     * body, which only main.js has — plus the render request and the two sync
     * helpers a settings import has to call, since a paste can change controls
     * that gate other controls. */
    CC.ExportUI.init({
      requestDraw: requestDraw,
      syncRotationEnabled: CC.Sync.syncRotationEnabled,
      syncBackgroundColour: function () { CC.Sync.syncBackgroundColour(canvas); },
      exportInit: {
        renderTo: renderTo,
        getSettings: gather,
        /* The generated name, so an exported file is called Kaross_planet_…
         * and not first-light_planet_…. The same name the card shows. */
        getName: function () { return currentStats ? currentStats.name : null; },
        /* The card as data, for the composed export, the card-only export and
         * the markdown factsheet — all three paint the same stats.lines the
         * on-screen panel shows. */
        getStats: function () { return currentStats; },
        /* Where the starfield bends round a black hole, for an export that
         * paints the background itself (draw/lens.js). */
        lensFor: function (w, h, s) {
          if (!current) draw();
          return CC.Scene.lens(w, h, current, s, currentDetails);
        },
        /* A settings string carries the trait salt, so restoring one has to
         * be able to put it back. */
        setTraitSalt: function (n) { traitSalt = n; }
      }
    });
    CC.Keys.init({ requestDraw: requestDraw });

    if (typeof window !== "undefined" && window.addEventListener) {
      /* THE PREVIEW'S OWN BOX IS WHAT THE CANVAS IS MEASURED INTO, so that is
       * what is watched. `resize` fires when the WINDOW changes, which is a
       * different question and one that can be answered before layout has
       * caught up; a `ResizeObserver` reports a box that has actually changed,
       * after layout, which is exactly the signal `fitToDisplay` needs.
       *
       * Both are kept: the observer is the accurate one, and the window event
       * still covers a change that moves the viewport without altering the
       * preview's box. `requestDraw` coalesces them into one render per frame,
       * so listening twice costs nothing. */
      window.addEventListener("resize", requestDraw);

      if (typeof ResizeObserver === "function") {
        var previewEl = document.getElementById("preview");
        if (previewEl) new ResizeObserver(requestDraw).observe(previewEl);
      }
    }

    /* THE SAVED SESSION, RESTORED BEFORE THE FIRST DRAW, so the app opens on
     * the body it was closed on rather than flashing the default first. It is
     * applied like a settings paste, and needs the same syncs afterwards. */
    if (CC.Persist) {
      CC.Persist.init({
        requestDraw: requestDraw,
        toast: CC.ExportUI.toast,
        afterApply: function () {
          CC.Sync.syncRotationEnabled();
          CC.Sync.syncBackgroundColour(canvas);
          CC.ExportUI.syncArchetypeConsumers();
        }
      });
      CC.Persist.restore();
    }

    draw();

    /* AND DRAW AGAIN ONCE LAYOUT HAS CERTAINLY SETTLED.
     *
     * `draw/canvas.js` now refuses to trust an unresolved 300x150 canvas box,
     * which is the defect's actual fix — the first body used to arrive as a
     * squished oval and correct itself on the next redraw. This is the belt to
     * that pair of braces: fonts, scrollbars and the panel's own layout can all
     * shift the preview's box slightly after the first paint, and re-measuring
     * on the next frame costs one render of cached geometry. Nothing is
     * re-rolled — `draw` reuses the stage cache — so this cannot change the
     * body, only the box it is measured into. */
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(function () { requestAnimationFrame(requestDraw); });
    }
  }

  function on(id, evt, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(evt, fn);
  }

  /* ---- public API ----------------------------------------------------- */

  var started = false;

  function start() {
    if (started) return;
    started = true;
    init();
  }

  var API = {
    version: "3.0.0-phase3",
    generate: generate,
    palette: palette,
    details: details,
    gather: gather,
    randomize: CC.Randomize.run,
    redraw: requestDraw,
    drawNow: draw,
    /* Exposed so a headless harness can start the app itself. jsdom's
     * "outside-only" script mode never fires DOMContentLoaded, so without
     * this a test would silently drive a UI that was never wired up. */
    init: start,
    get body() { return current; },
    get colours() { return currentPalette; },
    get elements() { return currentDetails; },
    /* The info card as data, so a probe can assert the numbers on it against
     * the body that produced them without parsing English out of the DOM. */
    get stats() { return currentStats; },
    renderTo: renderTo,
    CC: CC
  };

  if (typeof window !== "undefined") {
    window.CelestialCutaway = API;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start);
    } else {
      start();
    }
  }
})();
