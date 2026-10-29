/* The layer-name overlay — step 7 of the draw order (draw/scene.js).
 *
 * NAMES ONLY (PARAMETERS.md, Labels & Info). Each band gets its name, an
 * underline under the name, and a 1px leader from the underline to a dot
 * inside the band. No figures, no callouts, no legend: v2 hung stat nuggets
 * off its labels and the picture drowned in them.
 *
 * ---- THE LAYOUT ------------------------------------------------------------
 *
 * Every anchor sits on ONE RAY per side, up and out from the centre, at the
 * middle of its band. Walking a ray outward meets the bands in depth order,
 * so the anchors are already sorted top-to-bottom in the same order the
 * labels are stacked — which is what keeps the leaders from crossing. Each
 * label starts level with its own anchor and is then pushed apart from its
 * neighbours just far enough not to collide, keeping that order; a thin
 * band's leader bends where a thick one's runs nearly straight.
 *
 * "Both" deals the bands out alternately, outermost to the right. Adjacent
 * bands are the ones that crowd each other, so alternating gives every
 * label twice the room of a one-sided column.
 *
 * ---- WHAT IT IS SIZED FROM -------------------------------------------------
 *
 * THE FRAME, NOT THE BODY. Text and lines take their size from the canvas's
 * shorter axis, never from `view.R`: a label is a caption on the picture, so
 * a 20x close-up must not print 20x larger names. The anchors still come from
 * the view, because they have to land on the bands wherever framing put them.
 * A band whose anchor framing has pushed out of the canvas is simply not
 * labelled.
 *
 * DRAWN UNROTATED, after the scene's own rotation has been undone, so the
 * text reads level. The anchor is placed in body space and turned by the
 * body's rotation by hand, so it still lands on its band.
 *
 * Reads `layer.name`, resolved upstream (js/gen/structure.js); no role name
 * appears here. Loaded before js/draw/scene.js, which calls it. */

var CC = CC || {};

CC.OverlayDraw = (function () {
  "use strict";

  var FONT_PX = 15;        // at a 1000px shorter axis, Label text size 100%
  var RAY_DEG = 55;        // anchor ray, degrees clockwise from straight up
  var ROW_GAP = 1.55;      // minimum row spacing, in font heights
  var INK = "#e9edf3";
  var HALO = "rgba(4, 6, 12, 0.72)";

  /* Where in a band its anchor sits, as a body-space radius. The middle of
   * an ordinary band; partway out from a solid centre, so the dot is not
   * lost on the centre point; and just above the surface for an outward
   * layer, whose glow fades long before its nominal outer edge. */
  function anchorRadius(layer) {
    var span = layer.outer - layer.inner;
    if (layer.outward) return layer.inner + Math.min(span * 0.5, 0.05);
    if (layer.inner <= 0.001) return layer.outer * 0.45;
    return (layer.outer + layer.inner) / 2;
  }

  /* A screen bearing -> pixel point on the body, through the view so the
   * body's form warps it the same way it warps the band. */
  function anchorAt(view, r, screenAng, rot) {
    var p = view.at(r, screenAng - rot);
    var dx = p.x - view.cx, dy = p.y - view.cy;
    var c = Math.cos(rot), s = Math.sin(rot);
    return { x: view.cx + dx * c - dy * s, y: view.cy + dx * s + dy * c };
  }

  /* Push rows apart to at least `gap`, keeping their order, then pull the
   * whole stack back inside [lo, hi] if that pushed it out. */
  function spread(rows, gap, lo, hi) {
    for (var i = 1; i < rows.length; i++) {
      if (rows[i].y < rows[i - 1].y + gap) rows[i].y = rows[i - 1].y + gap;
    }
    var over = rows.length ? rows[rows.length - 1].y - hi : 0;
    if (over > 0) {
      for (var j = 0; j < rows.length; j++) rows[j].y -= over;
      for (var k = rows.length - 2; k >= 0; k--) {
        if (rows[k].y > rows[k + 1].y - gap) rows[k].y = rows[k + 1].y - gap;
      }
    }
    var under = rows.length ? lo - rows[0].y : 0;
    if (under > 0) for (var m = 0; m < rows.length; m++) rows[m].y += under;
  }

  function lighten(hex, t) {
    return CC.Color.mixHex(hex, "#ffffff", t);
  }

  function drawSide(ctx, view, box, rows, side, k, fontPx) {
    if (!rows.length) return;
    var margin = 12 * k;
    var lift = 3 * k;            // underline sits this far under the baseline
    var tail = 4 * k;            // underline overhang past the text

    /* The column starts clear of the furthest anchor on this side and of the
     * body's own edge, and is pulled back inside the frame if the text would
     * run off it. */
    var reach = 0;
    for (var i = 0; i < rows.length; i++) {
      reach = Math.max(reach, side * (rows[i].ax - view.cx));
    }
    reach = Math.max(reach + 24 * k, view.R * 1.1 + 12 * k);

    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      var w = ctx.measureText(row.name).width + tail;
      var x0;
      if (side > 0) {
        x0 = Math.min(view.cx + reach, box.x + box.w - margin - w);
      } else {
        x0 = Math.max(view.cx - reach, box.x + margin + w);
      }
      var x1 = x0 + side * w;
      var y = Math.round(row.y) + 0.5;

      /* The leader and the underline, as one stroke: anchor -> start of the
       * underline -> its far end. Drawn twice, a dark halo under the ink, so
       * it reads across a bright corona as well as against black sky. */
      ctx.beginPath();
      ctx.moveTo(row.ax, row.ay);
      ctx.lineTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.strokeStyle = HALO;
      ctx.lineWidth = 3 * k;
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1, k);
      ctx.beginPath();
      ctx.moveTo(row.ax, row.ay);
      ctx.lineTo(x0, y);
      ctx.stroke();
      /* The underline wears the band's own colour, lifted toward white, so
       * the eye can tie a name to its band without following the leader. */
      ctx.strokeStyle = row.tint;
      ctx.lineWidth = Math.max(1, 1.5 * k);
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(row.ax, row.ay, Math.max(1.5, 2.2 * k), 0, Math.PI * 2);
      ctx.fillStyle = HALO;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(row.ax, row.ay, Math.max(1, 1.4 * k), 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();

      ctx.textAlign = side > 0 ? "left" : "right";
      var tx = side > 0 ? x0 + tail * 0.5 : x0 - tail * 0.5;
      ctx.lineWidth = 3 * k;
      ctx.strokeStyle = HALO;
      ctx.strokeText(row.name, tx, y - lift);
      ctx.fillStyle = INK;
      ctx.fillText(row.name, tx, y - lift);
    }
  }

  function draw(ctx, view, body, palette, settings) {
    if (!settings || !settings.showLabels || !body || !body.layers) return;

    /* The frame: the export guide's rectangle while the preview is framed,
     * else the whole canvas. */
    var box = settings.chromeBox || { x: 0, y: 0, w: view.width, h: view.height };
    var k = Math.min(box.w, box.h) / 1000;
    var size = settings.labelSize === undefined ? 1 : settings.labelSize;
    var fontPx = Math.max(9, FONT_PX * k * size);
    var sideMode = settings.labelSide || "both";
    var rot = (body.rotation || 0) * Math.PI / 180;
    var ray = RAY_DEG * Math.PI / 180;

    var sides = { "1": [], "-1": [] };
    var dealt = 0;
    for (var i = 0; i < body.layers.length; i++) {
      var layer = body.layers[i];
      if (!(layer.outer > layer.inner)) continue;
      var side = sideMode === "left" ? -1
        : sideMode === "right" ? 1
        : (dealt % 2 === 0 ? 1 : -1);
      dealt++;

      var a = anchorAt(view, anchorRadius(layer), side * ray, rot);
      if (a.x < box.x || a.x > box.x + box.w || a.y < box.y || a.y > box.y + box.h) continue;

      var col = palette && palette.get ? palette.get(layer.role) : null;
      sides[String(side)].push({
        name: layer.name || layer.role,
        ax: a.x, ay: a.y, y: a.y,
        tint: col && col.hex ? lighten(col.hex, 0.45) : INK
      });
    }

    ctx.save();
    ctx.font = "600 " + Math.round(fontPx) + "px 'Segoe UI', system-ui, sans-serif";
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";

    var gap = fontPx * ROW_GAP;
    var lo = box.y + fontPx * 1.6, hi = box.y + box.h - fontPx * 0.8;
    for (var s in sides) {
      if (!sides.hasOwnProperty(s)) continue;
      var rows = sides[s];
      rows.sort(function (p, q) { return p.ay - q.ay; });
      spread(rows, gap, lo, hi);
      drawSide(ctx, view, box, rows, +s, Math.max(k, 0.5), fontPx);
    }
    ctx.restore();
  }

  return { draw: draw };
})();
