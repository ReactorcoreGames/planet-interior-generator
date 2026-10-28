/* Materials — the `texture` element: what a built layer is made of.
 *
 * ONE ELEMENT PER LAYER, carrying every mark, the way a mosaic is one element
 * carrying every cell: a material is a property of the whole band, not a
 * scatter of instances, so there is nothing for a size tier to mean.
 *
 * The element carries the band's radii, the material name, a tile strength
 * and the marks that are geometry rather than tile:
 *
 *   streaks   [{r, a, span, w, lit}]  brushed arcs round the band (metal,
 *                                     sleek, industrial, plant)
 *   pits      [{r, a, s}]             pour pits (concrete, plant)
 *   traces    [{pts: [[r, a]...], via}]  polar circuit traces (circuit)
 *   pipes     [{pts: [[r, a]...], w}]    pipe runs in parallel bundles (plant)
 *
 * Counts arrive already scaled by Detail density and Texture strength
 * (gen/details.js); Texture strength also scales the tile, so the slider
 * means the same here as on every rock. Drawn by draw/primitives/materials.js.
 *
 * gen/elemgen.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* How hard each material leans on the two tile registers
   * (draw/rocktexture.js): [grain, mottle]. */
  var TILE = {
    metal:      [0.26, 0.06],
    sleek:      [0.08, 0.02],
    plant:      [0.40, 0.18],
    concrete:   [0.50, 0.20],
    industrial: [0.42, 0.26],
    circuit:    [0.16, 0.04],
    /* Laid COARSE (draw/primitives/materials.js): one big mottle, blotched
     * and weathered — the outer armour the user picked from the first,
     * heavier tuning pass (Session Z). */
    rough:      [0.45, 0.65]
  };

  function streaks(layer, n, rng, short) {
    var out = [];
    var T = layer.thickness;
    for (var i = 0; i < n; i++) {
      var r = layer.inner + T * (0.02 + 0.96 * rng());
      /* Body-space length, so a streak is the same length at every depth. */
      var len = (short ? lerp(0.015, 0.06, rng()) : lerp(0.04, 0.22, rng() * rng() + 0.15));
      out.push({ r: r, a: rng() * TAU, span: len / Math.max(0.05, r),
                 w: rng() < 0.15 ? 1.4 : 0.6, lit: rng() < 0.55 });
    }
    return out;
  }

  function pits(layer, n, rng) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var t = CC.ElemGen.areaSpread(rng(), layer, 0.02, 0.98);
      out.push({ r: CC.ElemGen.radiusAt(layer, t), a: rng() * TAU,
                 s: lerp(0.0012, 0.0034, rng() * rng()) });
    }
    return out;
  }

  /* CIRCUIT TRACES on a polar grid: tracks at an even radial pitch, steps at
   * an even angular pitch measured at each track, so a cell is square-ish
   * at every depth. A trace runs along its track, jogs diagonally to a
   * neighbour (the board's 45 degrees), runs on, and ends in a via. */
  /* The board's track pitch, shared with the chips and pulses laid on it
   * (gen/cellgrid.js, gen/fixtures.js) so they sit on the same grid. */
  function circuitPitch(layer) {
    return Math.max(0.006, Math.min(0.012, layer.thickness / 14));
  }
  CC.Materials = { circuitPitch: circuitPitch };

  function traces(layer, n, rng) {
    var out = [];
    var T = layer.thickness;
    var pitch = circuitPitch(layer);
    var tracks = Math.max(2, Math.floor(T / pitch) - 1);
    for (var i = 0; i < n; i++) {
      var tr = Math.floor(rng() * tracks);
      var rOf = function (k) { return layer.inner + pitch * (k + 1); };
      var r = rOf(tr);
      var step = pitch / r;
      var a = Math.round(rng() * TAU / step) * step;
      var dir = rng() < 0.5 ? -1 : 1;
      var pts = [[r, a]];
      var legs = 1 + Math.floor(rng() * 3);
      for (var l = 0; l < legs; l++) {
        a += dir * step * (2 + Math.floor(rng() * 9));
        pts.push([rOf(tr), a]);
        if (l === legs - 1) break;
        var nt = tr + (rng() < 0.5 ? -1 : 1);
        if (nt < 0 || nt >= tracks) break;
        tr = nt;
        a += dir * pitch / rOf(tr);
        pts.push([rOf(tr), a]);
      }
      out.push({ pts: pts, via: rng() < 0.8, pad: rng() < 0.25 });
    }
    return out;
  }

  /* PIPE BUNDLES — 2-5 parallel pipes running radially ("vertically" in the
   * cutaway) through part of the band, some elbowing sideways mid-run and
   * carrying on. The elbows nest: the outer pipe of a bend turns first. */
  function pipes(layer, n, rng) {
    var out = [];
    var T = layer.thickness;
    for (var i = 0; i < n; i++) {
      var k = 2 + Math.floor(rng() * 4);
      var w = lerp(0.0050, 0.0105, rng());
      var pitch = w * 1.22;
      var a = rng() * TAU;
      var r0 = layer.inner + T * 0.6 * rng() * rng();
      var r1 = layer.outer - T * 0.6 * rng() * rng();
      if (r1 - r0 < T * 0.25) { r0 = layer.inner; r1 = layer.outer; }
      var rMid = lerp(r0, r1, 0.3 + 0.4 * rng());
      var bend = rng() < 0.55 ? (rng() < 0.5 ? -1 : 1) * lerp(0.01, 0.05, rng()) : 0;
      for (var j = 0; j < k; j++) {
        var aj = a + j * pitch / rMid;
        if (!bend) { out.push({ pts: [[r0, aj], [r1, aj]], w: w }); continue; }
        var rj = rMid - j * pitch * (bend > 0 ? 1 : -1);
        var d = bend / rj;
        out.push({ pts: [[r0, aj], [rj, aj], [rj, aj + d], [r1, aj + d]], w: w });
      }
    }
    return out;
  }

  CC.ElemGen.registerBuilder("texture", function (recipe, layer, plan, count, rng, opts) {
    var params = (opts && opts.params) || {};
    var strength = params.textureStrength === undefined ? 1 : params.textureStrength;
    var m = recipe.material || "metal";
    var el = {
      kind: "texture", material: m, tier: 0, angle: 0,
      radius: layer.inner + layer.thickness / 2,
      inner: Math.max(0, layer.inner), outer: layer.outer,
      alpha: recipe.alpha ? recipe.alpha[0] : 0.8,
      tile: (TILE[m] || TILE.metal).map(function (k) { return k * strength; }),
      tone: recipe.tone || "lighter", seed: rng()
    };
    if (m === "metal" || m === "sleek") el.streaks = streaks(layer, count, rng, false);
    else if (m === "plant") {
      el.pits = pits(layer, Math.round(count * 0.5), rng);
      el.streaks = streaks(layer, Math.round(count * 0.4), rng, true);
      el.pipes = pipes(layer, Math.max(2, Math.round(count / 9)), rng);
      /* `claim: true`: each straight leg of each pipe, so later details sit
       * between the bundles and inside their elbows (gen/claims.js). */
      if (recipe.claim) el.pipes.forEach(function (p) {
        for (var q = 1; q < p.pts.length; q++) {
          var A = p.pts[q - 1], B = p.pts[q];
          var r0 = Math.min(A[0], B[0]), pad = p.w / Math.max(0.05, r0);
          CC.Claims.claim(layer, { r0: r0 - p.w, r1: Math.max(A[0], B[0]) + p.w,
            a0: Math.min(A[1], B[1]) - pad, a1: Math.max(A[1], B[1]) + pad });
        }
      });
    }
    else if (m === "industrial") el.streaks = streaks(layer, count, rng, true);
    else if (m === "concrete") el.pits = pits(layer, count, rng);
    else if (m === "rough") {
      el.coarse = true;
      el.pits = pits(layer, count, rng);
      el.streaks = streaks(layer, Math.round(count * 0.4), rng, true);
    }
    else if (m === "circuit") {
      el.traces = traces(layer, count, rng);
      /* For the data pulses that ride them (gen/pulses.js). */
      CC.Claims.note(layer, "traces", el.traces);
    }
    return [el];
  });
})();
