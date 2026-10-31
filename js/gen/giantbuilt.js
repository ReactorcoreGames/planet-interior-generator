/* Built orbital structures round a giant — the builder for
 * data/traits/giant-built.js. Drawn by draw/primitives/giant-built.js.
 *
 *   skyhooks   ONE element: the skyhooks and the cities they hang from
 *                radius    the outermost reach, for the frame sweep
 *                design    the cities' one design for this body:
 *                          "wheel", "pair" or "spire"
 *                hooks     [{ a, r, tip, len, cw, city, pods: [t] }] a
 *                          skyhook's bearing, its platform's radius, the
 *                          scoop's depth, the platform's length, the
 *                          counterweight's length (0 under a city), the
 *                          index of the city it hangs from or -1, and
 *                          the gas pods on the tether as fractions of the
 *                          way up
 *                cities    [{ a, r, size, spokes, decks, win }] a city's
 *                          bearing and centre, its half-size, and the
 *                          design's own counts
 *
 * Lengths in body radii, so a skyhook is the same structure at any
 * resolution.
 *
 * gen/elemgen.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;
  function lerp(a, b, t) { return a + (b - a) * t; }
  function pick(list, rng) { return list[Math.floor(rng() * list.length) % list.length]; }

  /* The frame's vertical reach, in body radii from the centre, that a city
   * has to stay inside (the same figure as gen/orbitalbuilt.js). */
  var VREACH = 1.18;

  /* How far off the horizontal a bearing is, 0 at the sides. Bearings are
   * measured from the vertical, so the sides are at ±π/2. */
  function offSide(a) { return Math.abs(Math.cos(a)); }

  CC.ElemGen.registerBuilder("skyhooks", function (recipe, layer, plan, count, rng, opts) {
    var band = (opts && opts.orbit) || [1.11, 1.14];
    var ground = (opts && opts.ground) || 1;
    var n = 3 + Math.floor(rng() * 9);
    var phase = rng() * TAU;
    var el = {
      kind: "skyhooks", tier: 0, angle: phase,
      alpha: recipe.alpha ? lerp(recipe.alpha[0], recipe.alpha[1], rng()) : 1,
      tone: recipe.tone || "lighter",
      seed: rng(),
      design: pick(["wheel", "pair", "spire"], rng),
      hooks: [],
      cities: []
    };
    /* ONE ORBIT for every platform, evenly spaced, one size per body: the
     * defence network's lesson (D294), ordered rather than scattered. */
    var r = lerp(band[0], band[1], rng());
    var len = lerp(0.052, 0.066, rng());
    for (var i = 0; i < n; i++) {
      var pods = [];
      var np = pick([1, 2, 2, 3], rng);
      for (var k = 0; k < np; k++) pods.push(lerp(0.15, 0.85, rng()));
      el.hooks.push({
        a: phase + i * TAU / n, r: r, len: len,
        /* The scoop hangs into the cloud deck, under the cloud tops. */
        tip: ground - lerp(0.010, 0.030, rng()),
        cw: lerp(0.014, 0.022, rng()),
        city: -1, pods: pods, win: rng()
      });
    }

    /* THE CITIES: on the skyhooks nearest the sides, where the frame has the
     * height for them. Evenly spaced hooks always put one within 30° of a
     * side, so every body has at least one. One to five, one design. */
    /* Small beside the giant, and several: a city is a speck of
     * industry on a world 100,000 km across (the user, on the first
     * render, where they were three times this). */
    var size = { wheel: lerp(0.050, 0.058, rng()), pair: lerp(0.056, 0.066, rng()),
                 spire: lerp(0.058, 0.068, rng()) }[el.design];
    var cr = lerp(1.36, 1.48, rng());
    var order = el.hooks.slice().sort(function (p, q) { return offSide(p.a) - offSide(q.a); });
    var want = 1 + Math.floor(rng() * 5);
    var reach = r + 0.04;
    for (i = 0; i < order.length && el.cities.length < want; i++) {
      var h = order[i];
      if (cr * offSide(h.a) + size > VREACH) continue;
      h.city = el.cities.length;
      h.cw = 0;
      el.cities.push({
        a: h.a, r: cr, size: size,
        spokes: pick([3, 4], rng),
        decks: pick([3, 4, 4, 5], rng),
        win: rng()
      });
      reach = Math.max(reach, cr + size * 1.3);
    }
    el.radius = reach;
    el.size = 0.01;
    return [el];
  });
})();
