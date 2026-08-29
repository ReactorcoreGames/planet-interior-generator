/* The info card, drawn on canvas — for export.
 *
 * THE SCREEN CARD IS DOM AND THIS ONE IS CANVAS, and they are deliberately two
 * renderers over ONE source (D53). `CC.Stats` produces `stats.lines`; the panel
 * prints them as `<dd>` elements and this file paints the same strings as
 * pixels. Neither computes anything, so neither can drift from the other or
 * from the render they sit beside.
 *
 * WHY IT EXISTS: a composed PNG — the body and its card in one image — is the
 * thing somebody hands round a table. That is what v2's `render/panel.js` did,
 * and this is its replacement.
 *
 * WHAT WAS TAKEN FROM v2 AND WHAT WAS NOT.
 *
 * Taken: every dimension is a FRACTION OF THE PANEL, never a pixel constant,
 * so the card is the same picture at 720px and 4320px — the same rule
 * `draw/canvas.js` enforces for the body. Taken: the layer-colour dots along
 * the bottom, which v2 had and which became this project's fingerprint strip.
 *
 * NOT taken: v2 silently DROPPED its verdict line when the card ran long
 * (`if (vy > cy + h * 0.01)`), so content vanished with no indication that it
 * had. Overflow here is handled by MEASURING FIRST and then fitting — see
 * `layoutFor` — and the card never clips or drops a line.
 *
 * THE FIT IS GRADUATED BY DETAIL LEVEL, because the levels have genuinely
 * different amounts to say:
 *
 *   compact    six lines. Fits one column at full size; no measures.
 *   standard   eight. May take a mild shrink.
 *   full       eleven, several of them prose. Two columns, a shrink, and a
 *              wider panel if it still does not fit.
 *
 * Nothing here knows what a planet is. It receives `stats` and paints it.
 *
 * Loaded after draw/scene.js; used by ui/export.js. */

var CC = CC || {};

CC.Card = (function () {
  "use strict";

  /* Every one of these is a fraction of the card's WIDTH unless the name says
   * otherwise, so the whole card scales with one number. */
  var PAD = 0.062;
  var TITLE = 0.088;
  var SUB = 0.040;
  var LABEL = 0.030;
  var VALUE = 0.040;
  var LINE_GAP = 0.020;   /* between a label and its value */
  var ROW_GAP = 0.032;    /* between one stat row and the next */
  var SWATCH = 0.042;

  var INK = "#efecf7";
  var INK_DIM = "#d5cbe8";
  var INK_FAINT = "#9d8fbe";
  var LINE = "#3a3152";
  var PANEL_BG = "rgba(20, 16, 32, 0.90)";

  /* The hazard badge colours, matching style.css so the exported card and the
   * on-screen one are the same object. */
  var RATING_INK = {
    "Benign": "#7fe0a8", "Mild": "#a8d98a", "Hazardous": "#e8cf72",
    "Severe": "#f0a05c", "Lethal": "#f47070", "Absolute": "#e05ce8"
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrap(ctx, text, maxW) {
    var words = String(text).split(" ");
    var lines = [], line = "";
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  var font = function (px, weight) {
    return (weight ? weight + " " : "") + Math.round(px) +
      "px 'Segoe UI', system-ui, sans-serif";
  };

  /* ---- measurement ------------------------------------------------------ */

  /* How tall the body of the card comes out at a given width, scale and column
   * count. Measured with the REAL font metrics and the real wrap, because a
   * line-count estimate is exactly the kind of proxy that disagrees at the
   * interesting sizes.
   *
   * Returns the height in pixels, plus the per-column split, so the drawing
   * pass can reuse the decision rather than making it a second time. */
  function measure(ctx, lines, w, scale, cols) {
    var pad = w * PAD;
    var colGap = cols > 1 ? w * 0.042 : 0;
    var colW = (w - pad * 2 - colGap * (cols - 1)) / cols;

    var blocks = [];
    for (var i = 0; i < lines.length; i++) {
      ctx.font = font(w * VALUE * scale);
      var body = wrap(ctx, lines[i].value, colW);
      var h = w * LABEL * scale + w * LINE_GAP * scale +
        body.length * (w * VALUE * scale * 1.30) + w * ROW_GAP * scale;
      blocks.push({ line: lines[i], body: body, h: h });
    }

    /* BALANCE THE COLUMNS BY HEIGHT, not by count. Splitting eleven rows as
     * 6/5 puts three prose paragraphs in one column and six one-liners in the
     * other, which looks broken.
     *
     * AND THE SPLIT IS CHOSEN, NOT STUMBLED INTO. The obvious version breaks
     * as soon as the running total crosses half the height — which OVERSHOOTS
     * whenever the crossing block is a tall one, since that whole block lands
     * in the first column. On a Full card that left the right column ending
     * ~80px short of the left, which reads as a layout bug rather than as two
     * columns.
     *
     * So every break point is tried and the one with the smallest imbalance
     * wins. Eleven rows means ten candidates; the cost is nothing and the
     * result is columns that actually end level. */
    var total = 0, b;
    for (b = 0; b < blocks.length; b++) total += blocks[b].h;

    var columns, tallest;
    if (cols < 2 || blocks.length < 2) {
      columns = [{ blocks: blocks, h: total }];
      tallest = total;
    } else {
      var bestSplit = 1, bestCost = Infinity;
      for (var split = 1; split < blocks.length; split++) {
        var hA = 0, hB = 0, k;
        for (k = 0; k < split; k++) hA += blocks[k].h;
        for (k = split; k < blocks.length; k++) hB += blocks[k].h;
        /* The cost is how tall the card ends up (the taller column decides)
         * plus the imbalance — so a split that is level but wasteful loses to
         * one that is level AND short. */
        var cost = Math.max(hA, hB) + Math.abs(hA - hB) * 0.5;
        if (cost < bestCost) { bestCost = cost; bestSplit = split; }
      }
      var colA = blocks.slice(0, bestSplit), colB = blocks.slice(bestSplit);
      var sum = function (arr) {
        var t = 0;
        for (var i = 0; i < arr.length; i++) t += arr[i].h;
        return t;
      };
      columns = [{ blocks: colA, h: sum(colA) }, { blocks: colB, h: sum(colB) }];
      tallest = Math.max(columns[0].h, columns[1].h);
    }

    return { height: tallest, columns: columns, colW: colW, colGap: colGap };
  }

  /* Choose a layout that FITS, escalating only as far as it has to.
   *
   * The ladder is ordered by how much each step costs the reader: a mild
   * shrink is barely noticeable, a second column changes the shape of the
   * card, and widening it takes space from the body. So they are tried in that
   * order rather than all at once — which is what makes a Compact card look
   * untouched and a Full one look deliberately laid out rather than squeezed.
   *
   * `maxW` is how wide the card is ALLOWED to grow; passing the current width
   * forbids growth entirely, which the card-only export does since there is
   * nothing to take room from. */
  function layoutFor(ctx, stats, lines, w, availH, maxW) {
    var headH = headerHeight(w, 1);
    var footH = footerHeight(w);

    var attempts = [
      { scale: 1.00, cols: 1 },
      { scale: 0.92, cols: 1 },
      { scale: 1.00, cols: 2 },
      { scale: 0.92, cols: 2 },
      { scale: 0.84, cols: 2 },
      { scale: 0.76, cols: 2 }
    ];

    var best = null;
    for (var i = 0; i < attempts.length; i++) {
      var a = attempts[i];
      /* A two-column card needs a wider panel to be worth it — two 130px
       * columns are worse than one 300px column. */
      var tryW = (a.cols > 1 && maxW > w) ? Math.min(maxW, w * 1.62) : w;
      var m = measure(ctx, lines, tryW, a.scale, a.cols);
      var total = headerHeight(tryW, a.cols) + m.height + footerHeight(tryW);
      best = { scale: a.scale, cols: a.cols, w: tryW, m: m, total: total };
      if (total <= availH) return best;
    }

    /* NOTHING FIT. Rather than clip — which is the v2 failure this file exists
     * to avoid — the card keeps the tightest layout and reports that it is
     * over; the caller grows the canvas to hold it. Content is never lost. */
    best.overflow = true;
    return best;
  }

  function headerHeight(w, cols) {
    return w * PAD + w * TITLE * 1.05 + w * SUB * 1.9 + w * 0.030;
  }

  function footerHeight(w) {
    return w * 0.034 + w * SWATCH * 1.5 + w * PAD;
  }

  /* ---- drawing ---------------------------------------------------------- */

  /* Paint the card into (x, y, w, h). Returns the height actually used, which
   * the caller needs when the card was allowed to size itself. */
  function draw(ctx, x, y, w, h, stats, opts) {
    opts = opts || {};
    var lines = filterLines(stats, opts.detail || "standard");
    var layout = layoutFor(ctx, stats, lines, w, h, opts.maxWidth || w);

    /* A layout may have chosen a wider card than it was offered. */
    w = layout.w;

    /* THE PANEL IS AS TALL AS ITS CONTENT, NEVER AS TALL AS ITS SLOT.
     *
     * It used to take the full offered height whenever it fitted, so a Compact
     * card — six lines in a frame sized for eleven — painted a slab of opaque
     * panel over the empty half. The background chosen in Output was hidden
     * behind it for no reason: nothing was drawn there.
     *
     * So the card takes `layout.total`, which is what `layoutFor` measured it
     * to actually need, and the scene shows through beneath. Overflow is the
     * same number by a different route — the layout that did not fit still
     * reports the height it needs, and the caller has already grown the canvas
     * to hold it. Clamped so a non-overflowing card can never exceed its slot. */
    var usedH = layout.overflow ? layout.total : Math.min(layout.total, h);

    ctx.save();
    ctx.textBaseline = "top";

    if (opts.background !== false) {
      ctx.fillStyle = PANEL_BG;
      ctx.strokeStyle = LINE;
      ctx.lineWidth = Math.max(1, w * 0.0032);
      roundRect(ctx, x, y, w, usedH, w * 0.026);
      ctx.fill();
      ctx.stroke();
    }

    var pad = w * PAD;
    var left = x + pad;
    var innerW = w - pad * 2;
    var cy = y + pad;

    /* --- header: name, type, hazard badge --- */
    ctx.fillStyle = INK;
    ctx.font = font(w * TITLE, "600");
    ctx.fillText(stats.name, left, cy);
    cy += w * TITLE * 1.05;

    ctx.font = font(w * SUB, "600");
    var typeText = stats.typeLabel.toUpperCase();
    ctx.fillStyle = INK_FAINT;
    ctx.fillText(typeText, left, cy);

    /* The badge sits on the same line, right-aligned — the two together are
     * "what is this and how much trouble". */
    var badge = stats.hazard.toUpperCase();
    var bw = ctx.measureText(badge).width + w * 0.044;
    var bh = w * SUB * 1.62;
    var bx = x + w - pad - bw;
    ctx.strokeStyle = RATING_INK[stats.hazard] || INK_FAINT;
    ctx.lineWidth = Math.max(1, w * 0.0032);
    roundRect(ctx, bx, cy - w * 0.010, bw, bh, bh / 2);
    ctx.stroke();
    ctx.fillStyle = RATING_INK[stats.hazard] || INK_FAINT;
    ctx.fillText(badge, bx + w * 0.022, cy);

    cy += w * SUB * 1.9;

    ctx.strokeStyle = LINE;
    ctx.lineWidth = Math.max(1, w * 0.0022);
    ctx.beginPath();
    ctx.moveTo(left, cy);
    ctx.lineTo(left + innerW, cy);
    ctx.stroke();
    cy += w * 0.030;

    /* --- the stat rows, in one or two columns --- */
    var scale = layout.scale;
    var bodyTop = cy;
    for (var c = 0; c < layout.m.columns.length; c++) {
      var col = layout.m.columns[c];
      var colX = left + c * (layout.m.colW + layout.m.colGap);
      var ry = bodyTop;

      for (var b = 0; b < col.blocks.length; b++) {
        var blk = col.blocks[b];
        ctx.fillStyle = INK_FAINT;
        ctx.font = font(w * LABEL * scale, "700");
        ctx.fillText(blk.line.label.toUpperCase(), colX, ry);
        ry += w * LABEL * scale + w * LINE_GAP * scale;

        ctx.fillStyle = INK_DIM;
        ctx.font = font(w * VALUE * scale);
        for (var l = 0; l < blk.body.length; l++) {
          ctx.fillText(blk.body[l], colX, ry);
          ry += w * VALUE * scale * 1.30;
        }
        ry += w * ROW_GAP * scale;
      }
    }

    /* --- the fingerprint strip, pinned to the bottom --- */
    drawFingerprint(ctx, left, y + usedH - footerHeight(w) + w * 0.034,
                    innerW, w, stats);

    ctx.restore();
    return { width: w, height: usedH, overflow: !!layout.overflow,
             columns: layout.m.columns.length, scale: scale };
  }

  /* The palette swatches plus the seed — the card's fingerprint (see
   * ui/infopanel.js, which draws the same strip in DOM). */
  function drawFingerprint(ctx, left, top, innerW, w, stats) {
    ctx.strokeStyle = LINE;
    ctx.lineWidth = Math.max(1, w * 0.0022);
    ctx.beginPath();
    ctx.moveTo(left, top - w * 0.026);
    ctx.lineTo(left + innerW, top - w * 0.026);
    ctx.stroke();

    var fp = stats.fingerprint || [];
    var sw = w * SWATCH;
    var gap = sw * 0.20;
    var sx = left;
    for (var i = 0; i < fp.length; i++) {
      ctx.fillStyle = fp[i].hex;
      roundRect(ctx, sx, top, sw, sw, sw * 0.22);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = Math.max(1, w * 0.0022);
      ctx.stroke();
      sx += sw + gap;
    }

    /* The seed, right-aligned, and TRUNCATED rather than allowed to run under
     * the swatches — the swatches are the identity, the seed is the lookup. */
    ctx.font = font(w * 0.030);
    ctx.fillStyle = INK_FAINT;
    var seed = String(stats.seed || "");
    var room = left + innerW - sx - w * 0.02;
    while (seed.length > 4 && ctx.measureText(seed).width > room) {
      seed = seed.slice(0, -2);
    }
    if (seed !== stats.seed) seed += "...";
    ctx.textAlign = "right";
    ctx.fillText(seed, left + innerW, top + sw * 0.28);
    ctx.textAlign = "left";
  }

  /* WHICH LINES EACH DETAIL LEVEL SHOWS — the one table, read by BOTH
   * renderers. ui/infopanel.js imports it from here rather than keeping its
   * own copy, and the dependency runs this way round because `draw/` must not
   * depend on `ui/`: the card is drawable with no interface present at all.
   *
   * Compact is the six MEASURED lines — everything that is a figure read off
   * the render. Standard adds the two sentences derived from those figures.
   * Full adds the flavour, which is the only part that involves a roll, and
   * which is filtered by the facts before it is rolled (see gen/stats.js).
   *
   * The split runs from "things the picture asserts" out to "things the
   * picture permits", so turning the level down never removes a fact and
   * leaves an inference standing on it. */
  /* THE LINE SETS COME FROM THE STAT TEMPLATE, not from here.
   *
   * This used to be a hardcoded table of solid-body keys — "size, gravity,
   * temp, climate, day, atmosphere, surface" — which made it the one place in
   * draw/ that knew what a particular family has. A gas giant's card would
   * have asked for a `surface` row that does not exist on it and quietly
   * dropped half its own content, because the keys simply would not match.
   *
   * Each family declares its own sets in js/gen/stats/<family>.js, for the
   * same reason it declares its own lines: which facts matter most is part of
   * the mindset, not a property of the card. A planet's compact card leads
   * with what the surface is like; a giant's leads with how far down you can
   * get. The fallback is only for a stats object built before templates
   * existed. */
  var FALLBACK_LEVELS = {
    compact: ["size", "gravity", "temp", "day", "atmosphere", "danger"],
    standard: ["size", "gravity", "temp", "climate", "day", "atmosphere",
               "surface", "danger"],
    full: null   /* null means every line, in the template's own order */
  };

  function levelKeys(stats, detail) {
    var levels = (stats && stats.levels) || FALLBACK_LEVELS;
    return Object.prototype.hasOwnProperty.call(levels, detail)
      ? levels[detail] : levels.standard;
  }

  function filterLines(stats, detail) {
    var keep = levelKeys(stats, detail);
    if (!keep) return stats.lines.slice();
    return stats.lines.filter(function (l) { return keep.indexOf(l.key) >= 0; });
  }

  /* What the card WANTS to be, before anything is drawn — so a composed export
   * can lay out the frame before it has a context to measure with. */
  function preferredWidth(frameW) {
    /* Just under a third of the frame, which is where v2 landed
     * (`panelW = w * 0.30`) and which leaves the body the larger share. */
    return Math.round(frameW * 0.315);
  }

  return {
    draw: draw,
    measure: measure,
    layoutFor: layoutFor,
    filterLines: filterLines,
    levelKeys: levelKeys,
    FALLBACK_LEVELS: FALLBACK_LEVELS,
    preferredWidth: preferredWidth,
    roundRect: roundRect,
    wrap: wrap
  };
})();
