/* A ringworld in a nebula — the builder for data/traits/ringworld.js. Drawn
 * by draw/primitives/ringworld.js.
 *
 *   ringworld   ONE element. Its position and its radius (`size`) are the
 *               pocket placer's (gen/diffuse-pockets.js, formation
 *               "centre"); its turn on the page is the placer's `rot`.
 *                 tilt     the ring's minor axis over its major, as seen
 *                 width    the ribbon's width over the ring's radius
 *                 n        segments round the whole ring
 *                 phase    where segment 0 sits
 *                 ground   per segment: 0 lowland, 1 upland, 2 sea
 *                 seas     [{ at, len, mid, half }] a sea from segment at,
 *                          len long, across the width's mid ± half at
 *                          its widest
 *                 clouds   [{ at, mid, len }] a cloud bank, likewise
 *                 night    [{ c, w }] shadowed stretches, segment units
 *                 ribs     a frame on the hull every this-many segments
 *                 lights   segment indices with a light on the hull
 *                 veils    [{ t, off, r, sq, a }] gas drifting across it,
 *                          t a segment, off and r in ring radii
 *                 world    "lush" | "arid" | "frozen"
 *
 * Counts in body space, so the ring is the same structure at any zoom and
 * resolution. gen/elemgen.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;
  function lerp(a, b, t) { return a + (b - a) * t; }

  CC.ElemGen.registerBuilder("ringworld", function (recipe, layer, plan, count, rng) {
    var n = 120;
    var w = rng();
    var el = {
      kind: "ringworld", tier: 0, angle: 0, radius: 0, size: 0.15,
      alpha: recipe.alpha ? lerp(recipe.alpha[0], recipe.alpha[1], rng()) : 1,
      tone: recipe.tone || "lighter",
      seed: rng(),
      tilt: lerp(0.34, 0.46, rng()),
      width: lerp(0.26, 0.32, rng()),
      n: n,
      phase: rng() * TAU,
      world: w < 0.5 ? "lush" : w < 0.8 ? "arid" : "frozen",
      ground: [], seas: [], clouds: [], night: [], lights: [], veils: [],
      ribs: 4 + Math.floor(rng() * 3)
    };
    /* THE GROUND IN RUNS, as the shell's plating is: a coin per segment
     * read as static. */
    var g = Math.floor(rng() * 2);
    for (var i = 0; i < n; i++) {
      if (rng() < 0.16) g = Math.floor(rng() * 2);
      el.ground.push(g);
    }
    /* Seas: runs a few segments long, swelling from a point at each end,
     * reaching in from near an edge or lying in the middle, never the whole
     * width, so the strip stays a land. */
    var seas = 5 + Math.floor(rng() * 5);
    for (var s = 0; s < seas; s++) {
      var half = lerp(0.14, 0.32, rng());
      el.seas.push({ at: rng() * n, len: lerp(2, 9, rng()),
                     mid: lerp(0.08 + half, 0.92 - half, rng()), half: half });
    }
    var clouds = 6 + Math.floor(rng() * 6);
    for (s = 0; s < clouds; s++) {
      el.clouds.push({ at: rng() * n, mid: lerp(0.25, 0.75, rng()), len: lerp(1.5, 5, rng()) });
    }
    /* The shadow squares' night: evenly round, a fixed width each. */
    var nights = 4 + Math.floor(rng() * 3), off = rng() * n / nights;
    for (s = 0; s < nights; s++) {
      el.night.push({ c: off + s * n / nights, w: n / nights * lerp(0.22, 0.32, rng()) });
    }
    for (i = 0; i < n; i++) if (rng() < 0.07) el.lights.push(i);
    /* Two to four veils, over the ring at random points, some across the
     * near half and some the far. */
    var veils = 2 + Math.floor(rng() * 3);
    for (s = 0; s < veils; s++) {
      el.veils.push({ t: rng() * n, off: (rng() - 0.5) * 0.4, r: lerp(0.35, 0.7, rng()),
                      sq: lerp(0.35, 0.7, rng()), a: lerp(0.40, 0.62, rng()) });
    }
    return [el];
  });
})();
