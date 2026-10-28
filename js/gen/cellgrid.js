/* Cell grids — the `cellgrid` element: hundreds of small regular rectangles
 * on a polar grid, the workhorse of a built layer (MACHINE-WORLDS.md § "Layer
 * details"). Regularity is what makes a band read as constructed.
 *
 * ONE ELEMENT PER LAYER, like `texture`: a grid is a property of the whole
 * band, and its cells are defined by their neighbours, so there is nothing
 * for a size tier to mean. Three grids:
 *
 *   seams     panel seams: rows across the band, panels round it in a brick
 *             bond; a share of panels re-plated a shade lighter or darker,
 *             and small lights at the seam joints
 *   windows   window-light grids: module blocks laid round the band with
 *             gaps between them, each a grid of windows, lit or dark, in the
 *             accent hue or a cold white by block
 *   lattice   chips: tall blocks of a regular array of small square
 *             cells, set among the machinery's pipework
 *   hex       hex panelling: a quiet honeycomb of plate
 *
 * Every pitch is in BODY RADIUS, so a panel or a window is the same size at
 * every depth and every resolution; `count` (already scaled by Detail
 * density) decides how many panels, lit windows or cells there are.
 *
 * Every cell is [r0, r1, a0, a1, k]: radii, angles (radians), and a small
 * integer the primitive reads as its look. Drawn by
 * draw/primitives/cellgrid.js.
 *
 * gen/elemgen.js and gen/materials.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* PANEL SEAMS. `count` panels in all, split over 2-3 rows. Each row is
   * offset half a panel from the one below, the way plate is laid so no
   * seam runs straight through. */
  function seams(el, layer, count, rng) {
    var T = layer.thickness;
    var rows = clamp(Math.round(T / 0.018), 2, 4);
    var cols = Math.max(12, Math.round(count / rows));
    var pitch = TAU / cols;
    var edges = [];
    for (var k = 0; k <= rows; k++) edges.push(layer.inner + T * k / rows);
    el.rows = edges.slice(1, rows);
    el.cuts = [];
    el.cells = [];
    el.lights = [];
    var phase = rng() * pitch;
    for (k = 0; k < rows; k++) {
      var r0 = edges[k], r1 = edges[k + 1];
      var off = phase + (k % 2) * pitch / 2;
      for (var c = 0; c < cols; c++) {
        var a = off + c * pitch;
        el.cuts.push([r0, r1, a]);
        /* PLATING: about a third of the panels replaced at some point,
         * a shade off their neighbours. 1 lighter, 2 darker. */
        var u = rng();
        if (u < 0.34) el.cells.push([r0, r1, a, a + pitch, u < 0.15 ? 1 : 2]);
        /* HULL LIGHTS at the outer joints: running lights, mostly the
         * accent, every so often white. */
        if (k === rows - 1 && rng() < 0.42) {
          var lk = rng() < 0.75 ? 0 : 1, lr = lerp(r0, r1, 0.72);
          /* Dark, or the emergency red (2), by the body's activity. */
          var st = CC.Activity.gate(layer, lr, a, 11);
          if (st) el.lights.push([lr, a, st === 2 ? 2 : lk]);
        }
      }
    }
  }

  /* WINDOW GRIDS. Storeys at an even radial pitch, windows at an even pitch
   * of arc length; module blocks walk round the band with a gap of dark
   * plate between them. A block is lit in one light — the accent or a cold
   * white — so a district reads as one place. `count` is how many windows
   * are lit, spread over the blocks by each block's own occupancy.
   *
   * A BLOCK IS A SECTOR, and each storey fits its own whole number of
   * windows into it, so the grid holds on a disc as well as on a band: on
   * the power core, which runs to the centre, a block is a wedge whose
   * storeys carry fewer windows the deeper they sit. `depth` keeps the grid
   * clear of the very middle, where a wedge would be all point. */
  var WIN_PITCH = 0.0064;
  function windows(el, layer, count, rng, depth) {
    var T = layer.thickness;
    var rIn = layer.inner + T * depth[0], rOut = layer.inner + T * depth[1];
    var storeys = Math.max(2, Math.floor((rOut - rIn) * 0.92 / WIN_PITCH));
    var r0 = rIn + (rOut - rIn - storeys * WIN_PITCH) / 2;
    var unit = WIN_PITCH / (r0 + storeys * WIN_PITCH / 2);
    /* The chamber's real edges, for the containment rings that frame it
     * (gen/containment.js). */
    CC.Claims.note(layer, "chamber", [r0, r0 + storeys * WIN_PITCH]);

    /* The blocks, then their windows, then which windows are lit: the
     * share lit needs the total first. */
    var blocks = [];
    var rows = [];
    var total = 0;
    var a = rng() * unit * 6;
    while (a < TAU - unit * 4) {
      var span = Math.min(TAU - a - unit, unit * (4 + Math.floor(rng() * rng() * 22)));
      /* Full height, or a low block standing on the outer face or hung
       * from the inner one. */
      var h = rng() < 0.45 ? storeys : Math.max(2, Math.round(storeys * lerp(0.3, 0.8, rng())));
      var s0 = h === storeys ? 0 : (rng() < 0.5 ? 0 : storeys - h);
      var B = { a0: a, a1: a + span, s0: s0, h: h, white: rng() < 0.28,
                occ: lerp(0.35, 1.0, rng()) };
      blocks.push(B);
      for (var s = 0; s < h; s++) {
        var rr = r0 + (s0 + s) * WIN_PITCH;
        var n = Math.floor(span / (WIN_PITCH / (rr + WIN_PITCH / 2)));
        if (n < 1) continue;
        rows.push({ B: B, r: rr, n: n });
        total += n;
      }
      a += span + unit * (1 + Math.floor(rng() * rng() * 6));
    }
    var lit = clamp(count / Math.max(1, total * 0.68), 0.05, 1);

    el.blocks = [];
    el.cells = [];
    for (var b = 0; b < blocks.length; b++) {
      var K = blocks[b];
      var rb = r0 + K.s0 * WIN_PITCH;
      el.blocks.push([rb, rb + K.h * WIN_PITCH, K.a0, K.a1]);
    }
    for (var k = 0; k < rows.length; k++) {
      var R = rows[k], step = (R.B.a1 - R.B.a0) / R.n;
      /* Busier past the default (gen/activity.js `busy`). */
      var p = Math.min(1, lit * R.B.occ * CC.Activity.busy(layer));
      /* A whole storey dark now and then: a floor shut down. */
      var floorOn = rng() < 0.9;
      /* LIT IN RUNS along the storey, not window by window: a room is lit
       * or dark as a whole, and independent rolls read as static. A
       * two-state chain whose long-run share lit is `p`. */
      var on = rng() < p;
      /* The body's activity gates each run as a whole, so a room goes dark
       * or burns the emergency red as one (gen/activity.js). */
      var st = CC.Activity.gate(layer, R.r, R.B.a0, 12);
      for (var j = 0; j < R.n; j++) {
        var aa = R.B.a0 + j * step;
        if (j > 0 && rng() < 0.3) {
          on = rng() < p;
          st = CC.Activity.gate(layer, R.r, aa, 12);
        }
        /* 0 dark, 1 accent, 2 white, 3 emergency. Slits: wider along the
         * storey than across it, which is what makes them windows and not
         * dots. */
        var wk = floorOn && on ? (R.B.white ? 2 : 1) : 0;
        if (st === 0) wk = 0;
        else if (st === 2) wk = floorOn ? 3 : 0;
        el.cells.push([R.r + WIN_PITCH * 0.30, R.r + WIN_PITCH * 0.70,
                       aa + step * 0.12, aa + step * 0.88, wk]);
      }
    }
  }

  /* HEX PANELLING — a quiet honeycomb of plate. Pointy-topped hexes in
   * rows across the band, every other row offset half a cell. The ANGULAR
   * pitch is one figure for every row, taken at the band's middle, so the
   * cells tile exactly in angle; a cell is a few percent wider at the outer
   * edge than the inner, which no eye finds, where a per-row pitch would
   * break the tiling at every row. `count` is cells; a few are re-plated.
   *
   * Stored as centres, [r, a, k]; the primitive draws the outlines. */
  function hexes(el, layer, count, rng) {
    var T = layer.thickness;
    var rMid = layer.inner + T / 2;
    var area = Math.PI * (layer.outer * layer.outer - layer.inner * layer.inner);
    var size = Math.sqrt(area / Math.max(40, count) / 2.598);
    var cols = Math.max(12, Math.round(TAU * rMid / (Math.sqrt(3) * size)));
    var step = TAU / cols;
    var rows = Math.ceil(T / (1.5 * size)) + 2;
    var phase = rng() * step;
    el.hexSize = size;
    el.hexStep = step;
    el.hexMid = rMid;
    el.hexes = [];
    for (var i = 0; i < rows; i++) {
      var r = layer.inner + (i - 0.5) * 1.5 * size;
      for (var c = 0; c < cols; c++) {
        var u = rng();
        el.hexes.push([r, phase + (c + (i % 2) * 0.5) * step,
                       u < 0.05 ? 1 : (u < 0.11 ? 2 : 0)]);
      }
    }
  }

  /* CHIPS — technology set into the plant among its pipework (the user's
   * call, Session Z: first tried on the computation board, where they read
   * as so-so). Each chip sits on a block of a track grid at the board's
   * pitch (gen/materials.js), filled with a regular array of square cells, a
   * few of them lit. `count` is the number of cells. */
  function lattice(el, layer, count, rng) {
    var T = layer.thickness;
    var pitch = CC.Materials.circuitPitch(layer);
    var tracks = Math.max(2, Math.floor(T / pitch) - 1);
    el.blocks = [];
    el.cells = [];
    var made = 0, guard = 0;
    while (made < count && guard++ < 400) {
      /* TALL AND NARROW, running radially like the pipes they sit among
       * (the user, Session Z): 2-5 cells round, 3-9 down. */
      var w = 2 + Math.floor(rng() * 4);
      var h = Math.min(tracks - 1, 3 + Math.floor(rng() * 7));
      if (h < 1) break;
      var t0 = Math.floor(rng() * Math.max(1, tracks - h));
      var rb = layer.inner + pitch * (t0 + 0.5);
      var rr = rb + pitch * h / 2;
      var step = pitch / rr;
      var a0 = Math.round(rng() * TAU / step) * step;
      el.blocks.push([rb, rb + h * pitch, a0, a0 + w * step]);
      for (var i = 0; i < h; i++) {
        for (var j = 0; j < w; j++) {
          /* 0 idle; lit in the void lights' three colours and shares
           * (gen/shellwalls.js): 1 the accent, 2 cold white, 3 warning. */
          var u = rng(), on = Math.min(0.85, 0.34 * CC.Activity.busy(layer));
          var ck = u < 0.62 * on ? 1 : (u < 0.90 * on ? 2 : (u < on ? 3 : 0));
          /* Idle when the body's activity has it dark; 4 the emergency
           * red (gen/activity.js). */
          var cs = CC.Activity.gate(layer, rb + pitch * i, a0 + step * j, 13);
          if (cs === 0) ck = 0;
          else if (cs === 2) ck = 4;
          el.cells.push([rb + pitch * (i + 0.2), rb + pitch * (i + 0.8),
                         a0 + step * (j + 0.2), a0 + step * (j + 0.8), ck]);
          made++;
        }
      }
    }
  }

  CC.ElemGen.registerBuilder("cellgrid", function (recipe, layer, plan, count, rng) {
    var el = {
      kind: "cellgrid", grid: recipe.grid || "seams", tier: 0, angle: 0,
      radius: layer.inner + layer.thickness / 2,
      inner: Math.max(0, layer.inner), outer: layer.outer,
      alpha: recipe.alpha ? recipe.alpha[0] : 0.8,
      tone: recipe.tone || "accent", seed: rng()
    };
    if (el.grid === "windows") windows(el, layer, count, rng, recipe.depth || [0, 1]);
    else if (el.grid === "lattice") lattice(el, layer, count, rng);
    else if (el.grid === "hex") hexes(el, layer, count, rng);
    else seams(el, layer, count, rng);
    /* `claim: true`: each block's footprint (gen/claims.js). */
    if (recipe.claim && el.blocks) el.blocks.forEach(function (b) {
      CC.Claims.claim(layer, { r0: b[0], r1: b[1], a0: b[2], a1: b[3] });
    });
    return [el];
  });
})();
