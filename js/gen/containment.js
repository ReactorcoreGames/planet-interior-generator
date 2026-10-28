/* Containment — the reactor's `rings` and its glow `stipple`
 * (MACHINE-WORLDS.md § "Layer details", power-core).
 *
 * BOTH FRAME THE CHAMBER, NEITHER BURIES IT. The window grid earlier in the
 * layer's recipes notes the chamber's real edges (gen/cellgrid.js) and
 * claims its blocks (gen/claims.js):
 *
 *   rings    4-8 containment rings: one just outside the chamber, one just
 *            inside it, and the rest nested round the bare heart at the
 *            middle, closing in on it. Each ring claims its band.
 *   stipple  glow stipple in the open plate only: every dot that lands on a
 *            block or a ring is dropped, so it gathers round the heart and in
 *            the gaps between the blocks, denser toward the centre.
 *
 * With no chamber noted the rings take the recipe's `depth` as one.
 *
 *   rings    [{ r, w, design, clamps, phase, lit }]  radius and width in
 *            body radius; design 0 a cased band with clamps, 1 a coil of
 *            windings between two rims
 *   dots     [[r, a, tier, k]]  k 0 a pale spark, 1 a deep fleck
 *
 * ONE ELEMENT PER LAYER each, like `texture`. Drawn by
 * draw/primitives/containment.js.
 *
 * gen/elemgen.js, gen/claims.js and gen/cellgrid.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* Clamps round a ring at one body-space pitch, so a small ring carries
   * fewer, never closer ones. */
  var CLAMP_PITCH = 0.016;

  function base(kind, recipe, layer, rng) {
    return {
      kind: kind, tier: 0, angle: 0,
      radius: layer.inner + layer.thickness / 2,
      inner: Math.max(0, layer.inner), outer: layer.outer,
      alpha: recipe.alpha ? recipe.alpha[0] : 0.9,
      tone: recipe.tone || "accent", seed: rng()
    };
  }

  CC.ElemGen.registerBuilder("rings", function (recipe, layer, plan, count, rng) {
    var T = layer.thickness;
    var d = recipe.depth || [0.34, 0.96];
    var ch = CC.Claims.noted(layer, "chamber") ||
             [layer.inner + T * d[0], layer.inner + T * d[1]];
    var n = Math.max(2, Math.min(8, count));
    var el = base("rings", recipe, layer, rng);
    el.rings = [];
    function ring(r, w, frame) {
      el.rings.push({ r: r, w: w, frame: frame, design: frame ? 0 : (rng() < 0.45 ? 1 : 0),
                      clamps: Math.max(4, Math.round(TAU * r / CLAMP_PITCH)),
                      phase: rng(), lit: rng() < 0.5 ? 1 : 2 });
      /* A ring's lights are on, dark (-1) or the emergency red (3) as a
       * set, by the body's activity (gen/activity.js). */
      var R = el.rings[el.rings.length - 1];
      var st = CC.Activity.gate(layer, r, 0.5, 31);
      if (st === 0) R.lit = -1;
      else if (st === 2) R.lit = 3;
    }
    /* The frame: just outside the chamber, in the room left to the face,
     * and just inside it, round the heart. */
    var room = layer.outer - ch[1];
    var wo = Math.min(0.0055, room * 0.55);
    if (wo > 0.0012) ring(ch[1] + room * 0.5, wo, true);
    else n++;
    var wi = Math.min(0.0055, ch[0] * 0.08);
    ring(ch[0] - wi * 1.1, wi, true);
    /* Nested round the heart, closing in on it: each a step inside the
     * last, the steps shrinking, the rings thinning. */
    var rest = n - el.rings.length;
    var r = ch[0] - wi * 1.1;
    /* They stop well short of the middle, so the heart stays a bare
     * bright orb (the first pass nested them to a fifth and buried it). */
    for (var i = 0; i < rest; i++) {
      r -= (ch[0] * 0.48 / Math.max(1, rest)) * lerp(0.8, 1.2, rng());
      if (r < ch[0] * 0.45) break;
      ring(r, Math.max(0.0010, wi * lerp(0.30, 0.55, rng())), false);
    }
    if (recipe.claim) el.rings.forEach(function (R) {
      CC.Claims.claim(layer, { r0: R.r - R.w, r1: R.r + R.w, a0: 0, a1: TAU });
    });
    return [el];
  });

  /* Glow stipple. Laid denser toward the centre (radius as u^0.85 of the
   * reach, against sqrt for an even spread), three sizes, most of them the
   * smallest; a quarter are deep flecks, so the field reads on the brightest
   * part of the heart as well as the dimmer rim. */
  var DOT = [0.0040, 0.0026, 0.0016, 0.0010];
  CC.ElemGen.registerBuilder("stipple", function (recipe, layer, plan, count, rng) {
    var T = layer.thickness;
    var d = recipe.depth || [0, 0.98];
    var el = base("stipple", recipe, layer, rng);
    el.dots = [];
    el.size = DOT;
    for (var p = 0; p < plan.length; p++) {
      for (var n = 0; n < plan[p].count; n++) {
        for (var tries = 0; tries < 6; tries++) {
          var r = layer.inner + T * lerp(d[0], d[1], Math.pow(rng(), 0.85));
          var a = rng() * TAU;
          var s = DOT[plan[p].tier] / Math.max(0.01, r);
          if (recipe.yield && CC.Claims.taken(layer,
              { r0: r - DOT[plan[p].tier], r1: r + DOT[plan[p].tier], a0: a - s, a1: a + s }, 0.0006)) continue;
          var dk = rng() < 0.75 ? 0 : 1;
          /* A spark goes out when the reactor is down (gen/activity.js),
           * and stays as a fleck, so the field keeps its grain. */
          if (dk === 0 && CC.Activity.gate(layer, r, a, 32) !== 1) dk = 1;
          el.dots.push([r, a, plan[p].tier, dk]);
          break;
        }
      }
    }
    return [el];
  });
})();
