/* Even spacing for a layer detail — `spacing: "even"` on a recipe.
 *
 * Until now only a trait could space its instances evenly (gen/traitroll.js
 * anchorAngles, through the placement grammar). A built layer needs the same
 * for its own details: a ring of identical platforms at exactly equal
 * intervals is the single strongest signal that a thing was made
 * (MACHINE-WORLDS.md § "Why artificial reads as artificial").
 *
 * INTERLEAVED ACROSS SIZE TIERS. Every instance of every tier takes one slot
 * of ONE even ring, and each tier's instances are spread evenly among the
 * slots, so a large platform falls every third slot rather than all the
 * large ones bunching on one side. Each slot goes to whichever tier is
 * furthest behind its own share, which is Bresenham's line rule.
 *
 * The angles come back in the plan's order (all of tier 0, then tier 1...),
 * because that is the order a builder walks the plan and reads
 * `opts.angles` (gen/elemgen.js angleFor). `jitter` is a share of one slot,
 * as on a trait; built marks want 0-0.2.
 *
 * Loaded before gen/elemgen.js, which calls it from `build`. */

var CC = CC || {};

CC.EvenSpacing = (function () {
  "use strict";

  var TAU = Math.PI * 2;

  function angles(plan, jitter, rng) {
    var n = 0, t;
    for (t = 0; t < plan.length; t++) n += Math.max(0, plan[t].count);
    if (n <= 0) return [];
    var step = TAU / n;
    var phase = rng() * TAU;
    var got = plan.map(function () { return 0; });
    var slots = plan.map(function () { return []; });
    for (var k = 0; k < n; k++) {
      var best = -1, lag = -Infinity;
      for (t = 0; t < plan.length; t++) {
        if (got[t] >= plan[t].count) continue;
        var d = (k + 1) * plan[t].count / n - got[t];
        if (d > lag) { lag = d; best = t; }
      }
      got[best]++;
      slots[best].push(phase + k * step + (rng() - 0.5) * step * jitter);
    }
    return [].concat.apply([], slots);
  }

  return { angles: angles };
})();
