/* Bore — one great barrel driven radially through a built body, from a
 * breech at its heart out past its surface (js/draw/bore.js draws it).
 *
 * A GENERAL STRUCTURE FEATURE, switched on by a trait's `sets` (the machine
 * world's Weaponized, gen/traitsets.js):
 *
 *   bore: {
 *     width: [lo, hi],   the barrel's width as a multiple of the shafts'
 *                        mean width (gen/shells.js), so it is always the
 *                        biggest thing in the slots' vocabulary
 *     cap: [lo, hi],     its half-width clamped to these, in body radius
 *     muzzle: d,         how far the barrel stands past the surface
 *     coils: d           the pitch of the accelerator stages along it,
 *                        three rings to a stage
 *   }
 *
 * THE ONE BIG FILLED OBJECT on a body of bands and hundreds of small
 * repeated marks (MACHINE-WORLDS.md § "Exclusive traits"). It runs from the
 * outer face of the innermost layer (the breech sits on whatever is at the
 * heart) through every shell and void to a muzzle crown that breaks the
 * silhouette. Nothing is looked up by role.
 *
 * WHERE. One bearing, rolled, kept clear of every shaft so the two never
 * read as one slot.
 *
 * CHARGED BY THE HEART'S POWER. The bore's charge is the innermost layer's
 * share of lights on (gen/activity.js `live`), raised by the hive
 * multiplier: cold on a derelict, a dull red on emergency power, burning in
 * the accent on a running world. Each coil asks the same layer's gate with
 * a stable hash of its place, so coils light in place as the dial moves.
 *
 * SEATED ON THE HEART. The breech sits in a saddle on the heart's rim,
 * with fat conduit feeds running up out of the heart under it
 * (the user: the first, a block sunk into the core, read as simple and
 * clunky).
 *
 * SEVERED BY A WOUND. Drawn inside the rupture clip (draw/scene.js), so a
 * wound in its path cuts it; if a wound has taken the barrel's exit through
 * the surface, there is no muzzle left to stand past it.
 *
 * Output, lengths in body radius:
 *   { role (the outermost built layer, its metal), angle, half, r0, r1, surface, crown: bool,
 *     seat                     the heart's rim
 *     saddle: { r0, r1, span } the band the breech sits in
 *     feeds: [{ x, r0, r1, w, sr, power }]   pipes parallel to the barrel, `x`
 *                              across it, r0..r1 along it, `w` half-width
 *     collars: [r, ...]        where it passes through a shell's face
 *     coils: [{ r, big, power, stage }]   three rings a stage
 *     charge: 0..1, power: 1 lit / 0 dark / 2 emergency }
 * Null on a body declaring no `bore`. */

var CC = CC || {};

CC.Bore = (function () {
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

  function build(archetype, body, params, seed, rupture) {
    var spec = archetype && archetype.bore;
    if (!spec) return null;
    var built = [];
    for (var i = 0; i < body.layers.length; i++) {
      if (!body.layers[i].outward) built.push(body.layers[i]);
    }
    if (built.length < 2) return null;
    var heart = built[built.length - 1];
    var surface = built[0].outer;
    var shafts = body.shafts || [];
    var mean = 0;
    for (i = 0; i < shafts.length; i++) mean += shafts[i].half;
    mean = shafts.length ? mean / shafts.length : 0.024;

    var r = CC.RNG.stream(seed, "detail/bore");
    var w = spec.width || [3, 5], cap = spec.cap || [0.05, 0.10];
    var half = clamp(mean * lerp(w[0], w[1], r()), cap[0], cap[1]);

    /* A bearing clear of every shaft at mid-depth, the best of a few
     * tries when none is. */
    var best = 0, bestGap = -1;
    for (var t = 0; t < 24; t++) {
      var a = r() * TAU, gap = Infinity;
      for (i = 0; i < shafts.length; i++) gap = Math.min(gap, angDist(a, shafts[i].angle));
      if (gap > bestGap) { best = a; bestGap = gap; }
      if (gap > (half * 2.5 + 0.05) / 0.5) break;
    }

    /* The barrel starts just above the heart's rim, so the breech sits ON
     * the heart, seated in a saddle, rather than sunk into it. */
    var r0 = heart.outer + half * 0.3;
    var r1 = surface + (spec.muzzle || 0.08);
    var crown = true;
    var wounds = (rupture && rupture.wounds) || [];
    for (i = 0; i < wounds.length; i++) {
      if (inside(wounds[i].poly, surface - 0.002, best)) { crown = false; r1 = surface; }
    }

    var collars = [];
    for (i = 0; i < built.length - 1; i++) {
      collars.push(built[i].outer);
      if (built[i].gap) collars.push(built[i].gap.outer, built[i].gap.inner);
      else collars.push(built[i].inner);
    }
    collars = collars.filter(function (c, k) { return c > r0 + half && collars.indexOf(c) === k; });

    var lv = CC.Activity.level(archetype, params);
    var charge = lv === null ? 1 : clamp(heart.live * (0.7 + 0.3 * (CC.Activity.busy(heart) - 1) / 0.7), 0, 1);
    var power = lv === null || heart.live > 0.02 ? 1 : (heart.emergency > 0 ? 2 : 0);

    /* Coils in stages of three, evenly along the barrel from the breech to
     * the surface, each stage clear of the collars; the middle ring of a
     * stage is the big one, and a stage is lit or dark as one. Single thin
     * rings evenly spaced read as a ladder, the shafts' own mark. */
    var step = spec.coils || 0.10, coils = [], ring = Math.max(0.012, half * 0.22);
    var from = r0 + half * 1.6, n = Math.floor((surface - from) / step);
    for (var k = 0; k < n; k++) {
      var rc = from + (k + 0.5) * step, clear = true;
      for (i = 0; i < collars.length; i++) if (Math.abs(collars[i] - rc) < ring * 1.5 + 0.012) clear = false;
      if (!clear) continue;
      var g = CC.Activity.gate(heart, k + 1, 13, 61);
      /* On emergency power only the stages the gate keeps burn, red. */
      var p = power === 0 ? 0 : g;
      for (var j = -1; j <= 1; j++) coils.push({ r: rc + j * ring, big: j === 0, power: p, stage: k });
    }

    /* THE SADDLE the breech sits in, on the heart's rim: its inner and
     * outer radius and its half-span in angle (draw/bore.js). */
    var saddle = { r0: heart.outer - half * 0.14, r1: heart.outer + half * 0.30,
                   span: Math.min(1.10, half * 2.15 / heart.outer) };

    /* THE FEED: one fat pipe up the barrel's axis from the heart's very
     * centre to the saddle, its round socket a cap over the whole core
     * that swallows it (the user's). In the barrel's frame: `x` across
     * it, `r0`..`r1` along it; `sr` the socket's radius. The containment
     * rings nest inside the chamber's inner edge (gen/containment.js:
     * the window grid starts at 0.34 of the heart), so the cap clears
     * that. */
    var sr = heart.outer * 0.40;
    var top = saddle.r0 - half * 0.02;
    var fw = Math.min(half * 0.95, sr * 0.80);
    var feeds = [{ x: 0, r0: 0, r1: top, w: fw, sr: sr, power: power }];

    return { role: built[0].role, angle: best, half: half, r0: r0, r1: r1, surface: surface, crown: crown,
             seat: heart.outer, saddle: saddle, feeds: feeds,
             collars: collars, coils: coils, charge: power === 1 ? charge : (power === 2 ? 0.25 : 0),
             power: power };
  }

  return { build: build };
})();
