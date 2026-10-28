/* Cell grids — drawing the `cellgrid` element (gen/cellgrid.js).
 *
 *   seams     re-plated panels as faint monochrome patches, then the seams:
 *             a dark cut with a lit lip beside it, so the plate reads as
 *             edges catching the light rather than as ruled lines; then the
 *             hull lights at the joints
 *   windows   each module block a dark plate, its windows on it: dark glass,
 *             or lit in the element's tone (the accent) or a cold white,
 *             each lit window with a faint spill round it
 *   lattice   each chip a dark body, idle cells pale grey, live ones in the
 *             void lights' three colours (draw/shellwalls.js): the accent,
 *             a cold white, a warning amber
 *   hex       re-plated cells as faint patches, the outlines as a faint
 *             dark seam with a lit lip — quiet, so the polish still shows
 *
 * Shading is monochrome (black and white at low alpha), as on the materials,
 * so it survives any recolour; colour comes only from `style`. The caller has
 * already clipped to the layer's band. Pixels enter only through `view`.
 *
 * draw/primitives.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;
  /* Segments per radian along an arc edge. */
  var STEP = 90 / TAU;

  function arcTo(ctx, view, r, a0, a1, first) {
    var n = Math.max(1, Math.ceil(Math.abs(a1 - a0) * STEP));
    for (var i = 0; i <= n; i++) {
      var p = view.at(r, a0 + (a1 - a0) * (i / n));
      if (first && i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
  }

  /* One polar cell as a closed subpath. */
  function cell(ctx, view, c) {
    arcTo(ctx, view, c[1], c[2], c[3], true);
    arcTo(ctx, view, c[0], c[3], c[2], false);
    ctx.closePath();
  }

  /* Fill every cell of look `k` (or every cell, k undefined) in one path. */
  function fillCells(ctx, view, cells, k, fill, grow) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (k !== undefined && c[4] !== k) continue;
      if (grow) {
        var dr = (c[1] - c[0]) * grow, da = (c[3] - c[2]) * grow;
        cell(ctx, view, [c[0] - dr, c[1] + dr, c[2] - da, c[3] + da]);
      } else cell(ctx, view, c);
    }
    ctx.fill();
  }

  function mono(white, a) {
    return (white ? "rgba(255,255,255," : "rgba(0,0,0,") + Math.max(0, Math.min(1, a)) + ")";
  }

  function drawSeams(ctx, view, el, style, red) {
    var a = el.alpha;
    fillCells(ctx, view, el.cells, 1, mono(true, 0.07 * a));
    fillCells(ctx, view, el.cells, 2, mono(false, 0.12 * a));

    /* The cuts, then the lit lip a pixel to one side of each. */
    for (var pass = 0; pass < 2; pass++) {
      var lip = pass === 1;
      ctx.strokeStyle = lip ? mono(true, 0.16 * a) : mono(false, 0.55 * a);
      ctx.lineWidth = view.lw(lip ? 0.5 : 0.8);
      ctx.beginPath();
      for (var i = 0; i < el.rows.length; i++) {
        var rr = el.rows[i] + (lip ? 0.9 / view.px(1) : 0);
        arcTo(ctx, view, rr, 0, TAU, true);
      }
      for (i = 0; i < el.cuts.length; i++) {
        var c = el.cuts[i];
        var da = lip ? 0.9 / view.px(c[1]) : 0;
        var p = view.at(c[0], c[2] + da), q = view.at(c[1], c[2] + da);
        ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
    }

    lights(ctx, view, el.lights, style, a, 0.0044, red);
  }

  /* Small square lights with a soft spill: [r, a, k], k 0 the style, 1 white,
   * 2 the emergency red (gen/activity.js). */
  function lights(ctx, view, list, style, a, size, red) {
    var s = Math.max(1.1, view.px(size));
    for (var pass = 0; pass < 2; pass++) {
      var halo = pass === 0;
      for (var k = 0; k < 3; k++) {
        ctx.fillStyle = k === 1 ? mono(true, 0.85 * a) : (k === 2 ? red : style);
        ctx.globalAlpha = halo ? 0.18 : 1;
        var h = halo ? s * 1.4 : s / 2;
        ctx.beginPath();
        for (var i = 0; i < list.length; i++) {
          if (list[i][2] !== k) continue;
          var p = view.at(list[i][0], list[i][1]);
          ctx.rect(p.x - h, p.y - h, h * 2, h * 2);
        }
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawWindows(ctx, view, el, style, red) {
    var a = el.alpha;
    var blocks = el.blocks.map(function (b) { return b.concat([0]); });
    fillCells(ctx, view, blocks, undefined, mono(false, 0.46 * a));
    ctx.strokeStyle = mono(false, 0.40 * a);
    ctx.lineWidth = view.lw(0.6);
    ctx.beginPath();
    for (var i = 0; i < blocks.length; i++) cell(ctx, view, blocks[i]);
    ctx.stroke();

    fillCells(ctx, view, el.cells, 0, mono(false, 0.22 * a));
    /* Spill first, faint and wider, then the glass. */
    ctx.globalAlpha = 0.16;
    fillCells(ctx, view, el.cells, 1, style, 0.55);
    fillCells(ctx, view, el.cells, 2, mono(true, 0.9 * a), 0.55);
    fillCells(ctx, view, el.cells, 3, red, 0.55);
    ctx.globalAlpha = 1;
    fillCells(ctx, view, el.cells, 1, style);
    fillCells(ctx, view, el.cells, 2, mono(true, 0.9 * a));
    fillCells(ctx, view, el.cells, 3, red);
  }

  function drawLattice(ctx, view, el, style) {
    var a = el.alpha;
    var blocks = el.blocks.map(function (b) { return b.concat([0]); });
    fillCells(ctx, view, blocks, undefined, mono(false, 0.42 * a));
    ctx.strokeStyle = mono(true, 0.14 * a);
    ctx.lineWidth = view.lw(0.5);
    ctx.beginPath();
    for (var i = 0; i < blocks.length; i++) cell(ctx, view, blocks[i]);
    ctx.stroke();

    /* Idle cells a pale grey, live ones in the void lights' colours, each
     * with a faint spill so a lit chip glows against the plant. */
    fillCells(ctx, view, el.cells, 0, mono(true, 0.26 * a));
    var k;
    ctx.globalAlpha = 0.18;
    for (k = 1; k <= 4; k++) fillCells(ctx, view, el.cells, k, style.halo[k - 1], 0.5);
    ctx.globalAlpha = 1;
    for (k = 1; k <= 4; k++) fillCells(ctx, view, el.cells, k, style.lights[k - 1]);
  }

  /* One hex outline, or its fill, as a closed subpath. The angular offset
   * of each corner is taken at the band's middle radius, as the generator
   * laid them, so neighbours share their edges exactly. */
  function hexPath(ctx, view, el, h, dr) {
    var s = el.hexSize, k = el.hexMid;
    for (var i = 0; i < 6; i++) {
      var t = Math.PI / 6 + i * Math.PI / 3;
      var p = view.at(h[0] + dr + s * Math.sin(t), h[1] + s * Math.cos(t) / k);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
  }

  /* Hex panelling: re-plated cells, then every outline in ONE path, so a
   * shared edge is not stroked twice darker than the rest, then the lip. */
  function drawHex(ctx, view, el) {
    var a = el.alpha, i;
    var fills = [[1, mono(true, 0.05 * a)], [2, mono(false, 0.07 * a)]];
    for (var f = 0; f < 2; f++) {
      ctx.fillStyle = fills[f][1];
      ctx.beginPath();
      for (i = 0; i < el.hexes.length; i++) {
        if (el.hexes[i][2] === fills[f][0]) hexPath(ctx, view, el, el.hexes[i], 0);
      }
      ctx.fill();
    }
    ctx.lineJoin = "miter";
    for (var pass = 0; pass < 2; pass++) {
      var lip = pass === 1;
      ctx.strokeStyle = lip ? mono(true, 0.10 * a) : mono(false, 0.22 * a);
      ctx.lineWidth = view.lw(lip ? 0.45 : 0.6);
      var dr = lip ? 0.8 / view.px(1) : 0;
      ctx.beginPath();
      for (i = 0; i < el.hexes.length; i++) hexPath(ctx, view, el, el.hexes[i], dr);
      ctx.stroke();
    }
  }

  function cellgrid(ctx, view, el, style) {
    ctx.save();
    if (el.grid === "hex") drawHex(ctx, view, el);
    else if (el.grid === "windows") drawWindows(ctx, view, el, style.tone, style.lights[3]);
    else if (el.grid === "lattice") drawLattice(ctx, view, el, style);
    else drawSeams(ctx, view, el, style.tone, style.lights[3]);
    ctx.restore();
  }

  /* The element's tone, and the void lights' three colours as the walls
   * draw them: a saturated spill and a paler core. */
  function cellgridStyle(colour, el, alpha) {
    var hsv = CC.ShellWallDraw.lightHsv({ accent: colour.accent }, colour);
    return {
      tone: CC.DrawDetails.toneColour(colour, el.tone, alpha),
      halo: hsv.map(function (h) { return CC.Color.hsva(h[0], h[1], h[2], alpha); }),
      lights: hsv.map(function (h) { return CC.Color.hsva(h[0], h[1] * 0.6, 1, alpha); })
    };
  }

  CC.Primitives.register({ "cellgrid": cellgrid });
  CC.Primitives.registerStyle("cellgrid", cellgridStyle);
})();
