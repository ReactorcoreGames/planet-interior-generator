/* Capacitors — the cans standing on a circuit board, seen from above
 * (the user's request, Session Z: "those typical cylinder things on a
 * circuit board").
 *
 * A GENERAL LAYER PROPERTY:
 *
 *   capacitors: { count: [min, max], size: [lo, hi], depth: [lo, hi] }
 *
 * `blend` (a canvas blend mode, default normal) and `opacity` (default 1)
 * sink the cans into the board, so they sit in it rather than shout over it
 * (the user).
 *
 * `count` placements at Detail density 0 and 1, each a can whose radius is
 * rolled in `size` (body radius) on one of three tiers, set between
 * `depth`'s edges of the layer (0 its inner edge, 1 its outer).
 *
 * A PLACEMENT IS A SINGLE CAN OR A ROW. Half lay a row of two to five
 * of one size side by side round the body, the way a board's cans are
 * fitted in banks; the rest stand alone. Dense and small, in three tiers
 * (MOSTLY the smallest), per the density thesis.
 *
 * AMONG, NOT OVER: every can keeps clear of the conduits (gen/conduits.js,
 * built first and passed in), of the layer's claims, of every other can,
 * and out of the shafts on a layer they cut. A can that does not fit is
 * dropped, not moved;
 * a placement takes a few tries for a spot its first can fits.
 *
 *   { role, angle, r, s, vent, stripe, seed }
 *     r       its centre, body radius
 *     s       its radius, body radius
 *     vent    the scoring on its top: 0 a cross, 1 a Y, 2 a K
 *     stripe  the bearing of the polarity stripe on its sleeve, radians
 *
 * Drawn by draw/capacitors.js. gen/claims.js and gen/shells.js must load
 * first. */

var CC = CC || {};

CC.Capacitors = (function () {
  "use strict";

  var TAU = Math.PI * 2;
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* Per tier: the share of `size` and the share rolled. */
  var TIERS = [[1.0, 0.15], [0.62, 0.35], [0.38, 0.50]];
  /* Clearance kept round a can, in body radius. */
  var PAD = 0.0020;

  function xy(r, a) { return { x: r * Math.cos(a), y: r * Math.sin(a) }; }

  /* Clear of a conduit: the run as a segment along its bearing, as wide as
   * its junction boxes. */
  function offRun(c, p, s) {
    var ux = Math.cos(c.angle), uy = Math.sin(c.angle);
    var along = p.x * ux + p.y * uy, across = Math.abs(p.y * ux - p.x * uy);
    var half = (c.n * c.w * 1.25 + c.w * 0.8) / 2;
    return along < c.r0 - s - PAD || along > c.r1 + s + PAD || across > half + s + PAD;
  }

  function inShaft(body, a, r, s) {
    if (!body.shafts) return false;
    for (var k = 0; k < body.shafts.length; k++) {
      var sh = body.shafts[k];
      if (CC.Shells.angDist(a, sh.angle) <
          CC.Shells.halfAngle(sh.half * 1.4, r) + (s + PAD) / Math.max(0.02, r)) return true;
    }
    return false;
  }

  function build(body, params, seed, conduits) {
    var density = params.detailDensity === undefined ? 0.65 : params.detailDensity;
    var out = [];
    for (var i = 0; i < body.layers.length; i++) {
      var L = body.layers[i], spec = L.capacitors;
      if (L.outward || !spec) continue;
      var rng = CC.RNG.stream(seed, "detail/capacitors/" + L.role);
      var lo = L.inner + L.thickness * spec.depth[0], hi = L.inner + L.thickness * spec.depth[1];
      var runs = (conduits || []).filter(function (c) { return c.r1 > L.inner && c.r0 < L.outer; });
      var placed = [];
      var fits = function (r, a, s) {
        if (r - s < lo || r + s > hi) return false;
        if (L.shafted && inShaft(body, a, r, s)) return false;
        if (CC.Claims.taken(L, { r0: r - s, r1: r + s, a0: a - s / r, a1: a + s / r }, PAD)) return false;
        var p = xy(r, a);
        for (var k = 0; k < runs.length; k++) if (!offRun(runs[k], p, s)) return false;
        for (k = 0; k < placed.length; k++) {
          var q = placed[k], dx = p.x - q.x, dy = p.y - q.y, m = s + q.s + PAD;
          if (dx * dx + dy * dy < m * m) return false;
        }
        return true;
      };
      var n = Math.round(lerp(spec.count[0], spec.count[1], density));
      for (var g = 0; g < n; g++) {
        var u = rng(), t = 0;
        while (t < TIERS.length - 1 && u > TIERS[t][1]) { u -= TIERS[t][1]; t++; }
        var s = lerp(spec.size[0], spec.size[1], rng()) * TIERS[t][0];
        /* A few tries for a spot the first can fits. */
        var r, a;
        for (var tr = 0; tr < 6; tr++) {
          r = lerp(lo, hi, rng()); a = rng() * TAU;
          if (fits(r, a, s)) break;
        }
        /* A bank of one size side by side, or one alone. */
        var k0 = rng() < 0.5 ? 2 + Math.floor(rng() * 4) : 1;
        var gap = (s * 2 + PAD * 1.5) / r;
        var vent = Math.floor(rng() * 3), stripe = rng() * TAU;
        for (var j = 0; j < k0; j++) {
          var aj = a + j * gap;
          if (!fits(r, aj, s)) break;
          var p = xy(r, aj);
          placed.push({ x: p.x, y: p.y, s: s });
          out.push({ role: L.role, angle: aj, r: r, s: s, vent: vent,
                     stripe: stripe, tier: t, seed: rng(),
                     opacity: spec.opacity === undefined ? 1 : spec.opacity,
                     blend: spec.blend || null });
        }
      }
    }
    return out;
  }

  return { build: build };
})();
