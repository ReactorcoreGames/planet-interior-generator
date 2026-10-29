/* Engines — a cluster of drive bells on one bearing of a built body, the
 * thrust frame that carries their push down into the shells, and the
 * plume they burn (js/draw/engines.js draws them).
 *
 * A GENERAL STRUCTURE FEATURE, switched on by a trait's `sets` (the machine
 * world's Worldship, gen/traitsets.js):
 *
 *   engines: {
 *     bells: [lo, hi],   how many main bells, side by side across the
 *                        bearing; a small vernier bell rides outboard of
 *                        each end, so there are two size tiers
 *     bell: [lo, hi],    a main bell's exit half-width, in body radius
 *     mount: d,          how far the engine block stands past the surface
 *     reach: [lo, hi],   a main plume's length at full charge
 *     depth: r           the thrust frame runs down to the outer face of
 *                        the outermost built layer below this radius
 *   }
 *
 * TWO MARKS THE BODY LACKS (MACHINE-WORLDS.md § "Exclusive traits"): an
 * asymmetric silhouette, everything else on the body being round, and a
 * soft emissive gas, everything else being hard-edged.
 *
 * WHERE. One bearing, clear of every shaft; on a body that also carries a
 * bore barrel, aft of it (opposite, give or take), so the gun points
 * forward and the drive pushes from behind, and never across it.
 *
 * FIRED BY THE HEART'S POWER, as the bore is charged: the innermost
 * layer's `live`, raised by the hive multiplier. Each bell asks that
 * layer's gate with a stable hash, so bells light in place as the dial
 * moves. Dark: cold metal, no plume. Emergency: a dull red in each throat,
 * no plume. Lit: the plume, its length growing with the charge.
 *
 * TORN OFF BY A WOUND. A bell whose footing on the hull lies inside a wound
 * is gone; the frame is drawn inside the rupture clip (draw/scene.js), so
 * a wound cuts it.
 *
 * Output, lengths in body radius, in the bearing's own frame (`x` across
 * it, `r` out along it):
 *   { role (the outermost built layer, its metal), angle, surface,
 *     mount: { base, top, w }          the engine block on the hull
 *     bells: [{ x, e, t, r0, r1, big, power, len,
 *               puffs, core, sparks: [{ u, x, s, a }], diamonds: n }]
 *     wake: [{ u, x, s, a }], wakeFrom, wakeLen, wakeWidth   the
 *                                      exhausts merged, further out
 *     frame: { rods: [{ x0, x1, w }], r0, r1, ties: [r, ...], span } | null
 *     charge: 0..1, power: 1 lit / 0 dark / 2 emergency }
 * Null on a body declaring no `engines`. */

var CC = CC || {};

CC.Engines = (function () {
  "use strict";

  var TAU = Math.PI * 2;
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function angDist(a, b) {
    var d = Math.abs(a - b) % TAU;
    return d > Math.PI ? TAU - d : d;
  }

  /* Whether polar (r, a) lies inside a wound's outline ([[r, a], ...]). */
  function inside(poly, r, a) {
    var x = r * Math.cos(a), y = r * Math.sin(a), hit = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0] * Math.cos(poly[i][1]), yi = poly[i][0] * Math.sin(poly[i][1]);
      var xj = poly[j][0] * Math.cos(poly[j][1]), yj = poly[j][0] * Math.sin(poly[j][1]);
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  }

  /* The soft gas of one plume, in its own frame: `u` 0..1 along it (times
   * its length at draw time, so the dial stretches it in place), `x` across
   * in exit half-widths, `s` a size factor, `a` an alpha factor. */
  function gas(r, n, spread, skew) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var u = Math.pow(r(), skew || 0.85);
      out.push({ u: u, x: (r() * 2 - 1) * spread * (0.3 + 0.9 * u), s: 0.6 + 0.8 * r(), a: 0.5 + 0.5 * r() });
    }
    return out;
  }

  function build(archetype, body, params, seed, rupture, bore) {
    var spec = archetype && archetype.engines;
    if (!spec) return null;
    var built = [];
    for (var i = 0; i < body.layers.length; i++) {
      if (!body.layers[i].outward) built.push(body.layers[i]);
    }
    if (built.length < 2) return null;
    var heart = built[built.length - 1];
    var surface = built[0].outer;
    var shafts = body.shafts || [];

    var r = CC.RNG.stream(seed, "detail/engines");
    var nb = spec.bells || [3, 5], eb = spec.bell || [0.050, 0.075];
    var n = Math.round(lerp(nb[0], nb[1], r()));
    var e = lerp(eb[0], eb[1], r());
    var pitch = e * 2.25, ve = e * 0.45;

    /* Across the bearing: main bells centred, a vernier outboard of each
     * end. */
    var xs = [];
    for (i = 0; i < n; i++) xs.push({ x: (i - (n - 1) / 2) * pitch, e: e, big: true });
    var edge = (n - 1) / 2 * pitch + e + ve * 1.4;
    xs.push({ x: -edge, e: ve, big: false }, { x: edge, e: ve, big: false });
    var W = edge + ve + 0.012;
    var span = Math.asin(clamp(W / surface, 0, 0.95));

    /* A bearing clear of every shaft and, with a bore, aft of it. */
    var best = 0, bestGap = -1;
    for (var t = 0; t < 32; t++) {
      var a = bore ? bore.angle + Math.PI + (r() * 2 - 1) * 1.1 * Math.min(1, (t + 2) / 8) : r() * TAU;
      var gap = Infinity;
      for (i = 0; i < shafts.length; i++) gap = Math.min(gap, angDist(a, shafts[i].angle) - span - shafts[i].half * 2);
      if (bore) gap = Math.min(gap, angDist(a, bore.angle) - span - 0.35);
      if (gap > bestGap) { best = a; bestGap = gap; }
      if (gap > 0.04) break;
    }

    var mtop = surface + (spec.mount || 0.035);
    var mount = { base: surface - 0.014, top: mtop, w: W };

    var lv = CC.Activity.level(archetype, params);
    var charge = lv === null ? 1 : clamp(heart.live * (0.7 + 0.3 * (CC.Activity.busy(heart) - 1) / 0.7), 0, 1);
    var power = lv === null || heart.live > 0.02 ? 1 : (heart.emergency > 0 ? 2 : 0);

    var reach = spec.reach || [0.30, 0.48];
    var wounds = (rupture && rupture.wounds) || [];
    var bells = [];
    for (i = 0; i < xs.length; i++) {
      var b = xs[i];
      /* Its footing on the hull: torn off if a wound has it. */
      var foot = best + Math.asin(clamp(b.x / surface, -1, 1)), gone = false;
      for (var w = 0; w < wounds.length; w++) if (inside(wounds[w].poly, surface - 0.002, foot)) gone = true;
      var len = lerp(reach[0], reach[1], r()) * (b.big ? 1 : 0.42);
      var puffs = gas(r, b.big ? 46 : 14, 0.9);
      var core = gas(r, b.big ? 18 : 6, 0.18, 1.5);
      var sparks = gas(r, b.big ? 120 : 30, 1.6);
      var diamonds = b.big ? 3 + Math.floor(r() * 3) : 0;
      if (gone) continue;
      var g = CC.Activity.gate(heart, i + 1, 17, 71);
      bells.push({ x: b.x, e: b.e, t: b.e * 0.36, r0: mtop + b.e * 0.30, r1: mtop + b.e * 2.0,
                   big: b.big, power: power === 0 ? 0 : g, len: len * (0.55 + 0.45 * charge),
                   puffs: puffs, core: core, sparks: sparks, diamonds: diamonds });
    }
    var mains = 0;
    for (i = 0; i < bells.length; i++) if (bells[i].big) mains++;
    if (!mains) return null;

    /* THE WAKE: the bells' exhausts merged into one soft plume further
     * out, `x` across in body radius. */
    var wake = gas(r, 70, W * 0.7, 0.9);
    var wlen = lerp(reach[0], reach[1], r()) * 1.25 * (0.55 + 0.45 * charge);

    /* THE THRUST FRAME: one heavy longeron from under each main bell down
     * through the shells to a thrust plate on the outer face of the
     * outermost built layer below `depth`, converging as it goes, tied
     * across where it passes each shell's faces. */
    var frame = null, depth = spec.depth || 0.75, plate = null;
    for (i = 1; i < built.length - 1; i++) if (built[i].outer < depth) { plate = built[i]; break; }
    if (plate) {
      var rods = [];
      for (i = 0; i < bells.length; i++) {
        if (bells[i].big) rods.push({ x0: bells[i].x, x1: bells[i].x * 0.40, w: Math.max(0.008, e * 0.20) });
      }
      var ties = [];
      for (i = 0; built[i] !== plate; i++) {
        ties.push(built[i].inner);
        if (built[i].gap) ties.push(built[i].gap.inner);
      }
      ties = ties.filter(function (c, k) { return c > plate.outer + 0.02 && c < surface - 0.02 && ties.indexOf(c) === k; });
      var xmax = rods.length ? Math.abs(rods[0].x1) : 0;
      if (rods.length) frame = { rods: rods, r0: plate.outer, r1: surface - 0.010, ties: ties,
                                 span: (xmax + e * 0.9) / plate.outer };
    }

    return { role: built[0].role, angle: best, surface: surface, mount: mount, bells: bells, frame: frame,
             wake: wake, wakeFrom: mtop + e * 2.0, wakeLen: wlen, wakeWidth: W,
             charge: power === 1 ? charge : (power === 2 ? 0.25 : 0), power: power };
  }

  return { build: build };
})();
