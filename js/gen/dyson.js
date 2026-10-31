/* Built structures round a star — the builders for data/traits/dyson.js.
 * Drawn by draw/primitives/dyson.js.
 *
 *   dyson-shell   ONE element: the shell's cut edge
 *                   radius   the middle rail (body radii)
 *                   thick    inner rail to outer rail
 *                   rows     rows of triangles between them
 *                   n        cells round the whole circle
 *                   phase    the bearing of cell 0
 *                   plates   one flag per triangle, 2n per row: 1 plated,
 *                            0 open
 *                   ribEvery a heavy rib on every this-many cells
 *                   lights   [{ k, i }] a light on rail k at node i
 *                   cells    (unfinished only) one flag per cell, 0 in a gap
 *                            (not `built`, which placeOne stamps on every
 *                            built trait's element)
 *                   stubs    (unfinished only) [{ k, i0, i1 }] bare rail
 *                            reaching from a gap's end rib into the gap
 *
 * Lengths in body radii, counts in body space, so the shell is the same
 * structure at any zoom and resolution.
 *
 * gen/elemgen.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;
  function lerp(a, b, t) { return a + (b - a) * t; }

  CC.ElemGen.registerBuilder("dyson-shell", function (recipe, layer, plan, count, rng, opts) {
    var band = (opts && opts.orbit) || [1.22, 1.23];
    var r = lerp(band[0], band[1], rng());
    /* Rows of near-equilateral triangles: the cell pitch follows the row
     * height, so the mesh reads as a geodesic lattice and not a truss. */
    var thick = lerp(0.036, 0.044, rng());
    var rows = 3;
    var pitch = thick / rows * lerp(1.10, 1.25, rng());
    var n = Math.round(TAU * r / pitch);
    var el = {
      kind: "dyson-shell", tier: 0, angle: 0,
      radius: r,
      thick: thick,
      rows: rows,
      n: n,
      phase: rng() * TAU,
      alpha: recipe.alpha ? lerp(recipe.alpha[0], recipe.alpha[1], rng()) : 1,
      tone: recipe.tone || "lighter",
      seed: rng(),
      ribEvery: 10 + Math.floor(rng() * 7),
      plates: [],
      lights: []
    };
    /* PLATING IN RUNS, not a coin per cell: a shell is panelled outward
     * from its frames, so plated stretches and open stretches alternate.
     * How much is plated is one roll per body, 25-70%. */
    var cover = lerp(0.25, 0.70, rng());
    var on = rng() < cover;
    for (var i = 0; i < 2 * rows * n; i++) {
      if (rng() < 0.22) on = rng() < cover;
      el.plates.push(on ? 1 : 0);
    }
    for (i = 0; i < n; i++) {
      if (rng() < 0.10) el.lights.push({ k: 1 + Math.floor(rng() * (rows - 1)), i: i });
    }
    if (recipe.gaps) unbuilt(el, recipe.gaps, rng);
    el.size = el.thick;
    return [el];
  });

  /* AN UNFINISHED SHELL: 1-9 arcs where the lattice is not there yet, each
   * ending at a rib, because a shell goes up frame by frame and is panelled
   * from its frames. The circle is cut into as many sectors as gaps and one
   * gap falls somewhere in each, so they never merge (a gap is at least two
   * ribs long and leaves at least one rib of lattice in its sector);
   * together they open 15-80% of the circle, widened for variety on the
   * user's review (D305) — "half-built" in the outline, not only in the
   * plating. Past each end rib a rail or two runs on bare for a cell or
   * three, the construction front.
   *
   * Rolled AFTER everything else, and only when the trait asks, so a
   * finished shell's random sequence is untouched. */
  function unbuilt(el, gaps, rng) {
    var re = el.ribEvery, m = Math.ceil(el.n / re);
    var count = gaps[0] + Math.floor(rng() * (gaps[1] - gaps[0] + 1));
    var open = lerp(0.15, 0.80, rng());
    var sector = m / count;
    el.cells = [];
    for (var i = 0; i < el.n; i++) el.cells.push(1);
    el.stubs = [];
    for (var g = 0; g < count; g++) {
      var len = Math.max(2, Math.min(Math.floor(sector) - 2,
                Math.round(m * open / count * lerp(0.75, 1.25, rng()))));
      var s0 = Math.floor(g * sector + rng() * Math.max(1, Math.floor(sector) - len));
      var c0 = s0 * re, c1 = Math.min(el.n, (s0 + len) * re);
      for (i = c0; i < c1; i++) el.cells[i] = 0;
      /* The construction front: from each end rib into the gap. */
      for (var k = 0; k <= el.rows; k += el.rows) {
        if (rng() < 0.75) el.stubs.push({ k: k, i0: c0, i1: c0 + 1 + Math.floor(rng() * 3) });
        if (rng() < 0.75) el.stubs.push({ k: k, i0: c1 - 1 - Math.floor(rng() * 3), i1: c1 });
      }
    }
  }

  /* The frame's vertical reach, in body radii from the centre, that a slab
   * has to stay inside (gen/orbitalbuilt.js has the same figure). */
  var VREACH = 1.20;

  /* THE SWARM: 3-5 rows across the band, each evenly spaced round the whole
   * circle and staggered half a step against the last, one slab size per
   * row. Ordered, as the satellites taught (D294). Each slab lies along its
   * own radial (draw/primitives/dyson.js says why). */
  CC.ElemGen.registerBuilder("dyson-swarm", function (recipe, layer, plan, count, rng, opts) {
    var band = (opts && opts.orbit) || [1.31, 1.87];
    var rows = 3 + Math.floor(rng() * 3);
    var pitch = lerp(0.085, 0.11, rng());
    var phase = rng() * TAU;
    var el = {
      kind: "dyson-swarm", tier: 0, angle: 0, radius: band[1],
      alpha: recipe.alpha ? lerp(recipe.alpha[0], recipe.alpha[1], rng()) : 1,
      tone: recipe.tone || "lighter",
      seed: rng(),
      /* The stone's own hue and value, one per body: a grey-brown rock. */
      stone: { h: lerp(18, 40, rng()), s: lerp(0.20, 0.32, rng()), v: lerp(0.40, 0.50, rng()) },
      slabs: []
    };
    var reach = 0;
    for (var i = 0; i < rows; i++) {
      var r = lerp(band[0], band[1], i / (rows - 1));
      var w = lerp(0.034, 0.048, rng());
      var h = w * lerp(0.36, 0.48, rng());
      var n = Math.round(TAU * r / pitch);
      for (var k = 0; k < n; k++) {
        var a = phase + (k + (i % 2) * 0.5) * TAU / n;
        /* A slab lies along its radial, so its half-length is what reaches
         * toward the top of the frame. */
        if (Math.abs(r * Math.cos(a)) + w * 0.6 > VREACH) continue;
        /* The jagged side's five points between the ends; the other side
         * is the flat face. */
        var jag = [];
        for (var j = 0; j < 5; j++) jag.push(lerp(0.15, 0.6, rng()));
        el.slabs.push({ r: r, a: a, w: w, h: h, jag: jag,
                        win: rng(), port: rng() < 0.5 ? 1 : 2 });
        reach = Math.max(reach, r + w * 0.7);
      }
    }
    el.radius = reach || band[1];
    el.size = 0.01;
    return [el];
  });
})();
