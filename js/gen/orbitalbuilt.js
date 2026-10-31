/* Built orbital structures round a planet or moon — the builders for
 * data/traits/orbital-built.js. Drawn by draw/primitives/orbital-built.js.
 *
 *   orbital-ring   ONE element: the ring, its modules and its elevators,
 *                  so the elevators always meet the ring at a module
 *                    radius    the ring's centre line (body radii)
 *                    band      the truss's width
 *                    size      how far past the ring anything reaches
 *                              (the counterweights), for the frame sweep
 *                    phase     the bearing of the first module
 *                    modules   [{ a, len, h, hub, win }] even round the
 *                              ring; `hub` where an elevator meets it
 *                    lifts     [{ a, foot, cw, cars: [t] }] an elevator's
 *                              bearing, foot radius, counterweight length,
 *                              and its climbers as fractions of the way up
 *                    pods      [{ a, side, len, h, lit }] small boxes on
 *                              the outer (+1) or inner (-1) face
 *
 *   defence-network  ONE element: the platforms and the satellites
 *                    radius    the outermost reach, for the frame sweep
 *                    guns      [{ r, a, len, tilt, lights }] gun
 *                              platforms, `len` their full length along
 *                              the radial, `tilt` a small turn off it
 *                    sats      [{ r, a, s, turn, lit }] satellites, `s`
 *                              the box's side, `turn` the panels' angle
 *                              off the tangent
 *
 *   minefield        ONE element: the mines
 *                    orb       every mine's radius
 *                    turn      the spikes' turn off the radial, one for all
 *                    mines     [{ r, a, lit }] on 2-3 staggered rows
 *
 * Lengths in body radii, so a ring is the same structure at any resolution.
 *
 * gen/elemgen.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;
  function lerp(a, b, t) { return a + (b - a) * t; }
  function pick(list, rng) { return list[Math.floor(rng() * list.length) % list.length]; }

  /* An elevator's foot sits this far under the ground (`opts.ground`, the
   * top of the outermost layer that is not haze), so behind the body the
   * crust covers it and in front it stands on the ground rather than in the
   * air (draw/zonepaint.js splits orbit at the body's centre line). */
  var SINK = 0.012;

  CC.ElemGen.registerBuilder("orbital-ring", function (recipe, layer, plan, count, rng, opts) {
    var band = (opts && opts.orbit) || [1.08, 1.12];
    var radius = lerp(band[0], band[1], rng());
    /* Elevators evenly round the ring, and the modules a whole multiple of
     * them, so every elevator lands on a module: 2-6 tethers, 3-6 modules
     * from one to the next. */
    var lifts = pick([2, 3, 3, 4, 4, 5, 6], rng);
    var per = pick([3, 4, 4, 5, 6], rng);
    var mods = lifts * per;
    var phase = rng() * TAU;
    var step = TAU / mods;
    var el = {
      kind: "orbital-ring", tier: 0, angle: phase,
      radius: radius,
      band: lerp(0.019, 0.025, rng()),
      phase: phase,
      alpha: recipe.alpha ? lerp(recipe.alpha[0], recipe.alpha[1], rng()) : 1,
      tone: recipe.tone || "lighter",
      seed: rng(),
      modules: [],
      lifts: []
    };
    var foot = ((opts && opts.ground) || 1) - SINK;
    var cwMax = 0;
    for (var m = 0; m < mods; m++) {
      var hub = m % per === 0;
      el.modules.push({
        a: phase + m * step,
        /* Along the ring, and across it, in body radii. A hub is the
         * bigger station an elevator docks into. */
        len: hub ? lerp(0.075, 0.100, rng()) : lerp(0.032, 0.058, rng()),
        h: hub ? lerp(2.4, 2.9, rng()) : lerp(1.5, 2.0, rng()),
        hub: hub,
        win: rng()
      });
      if (!hub) continue;
      var cars = [];
      var nCars = pick([1, 1, 2, 2, 3], rng);
      for (var c = 0; c < nCars; c++) cars.push(lerp(0.12, 0.88, rng()));
      var cw = lerp(0.025, 0.055, rng());
      if (cw > cwMax) cwMax = cw;
      el.lifts.push({ a: phase + m * step, foot: foot, cw: cw, cars: cars });
    }
    /* Pods between the modules — tanks, radiators, docked craft — small and
     * many, on either face of the truss, so no stretch of ring is a bare
     * line. */
    el.pods = [];
    for (m = 0; m < mods; m++) {
      var nPods = 1 + Math.floor(rng() * 4);
      for (var k = 0; k < nPods; k++) {
        el.pods.push({
          a: phase + (m + lerp(0.22, 0.78, rng())) * step,
          side: rng() < 0.5 ? -1 : 1,
          len: lerp(0.008, 0.018, rng()),
          h: lerp(0.006, 0.012, rng()),
          lit: rng() < 0.5
        });
      }
    }
    el.size = cwMax + 0.02;
    return [el];
  });

  /* THE FRAME'S VERTICAL REACH, in body radii from the centre, that a mark
   * past the ring has to stay inside: about 1.28 at the default Body size,
   * less a margin. Above it the top and bottom of an orbit are off canvas. */
  var VREACH = 1.18;

  /* A bearing at radius r where a mark of half-size h stays inside the
   * frame's height, kept `gap` radians from every bearing in `taken` at a
   * similar radius. Null after enough tries: the network is then smaller. */
  function bearing(r, h, taken, gap, rng) {
    for (var t = 0; t < 40; t++) {
      var a = rng() * TAU;
      if (r * Math.abs(Math.cos(a)) + h > VREACH) continue;
      var ok = true;
      for (var i = 0; i < taken.length && ok; i++) {
        var d = Math.abs(Math.atan2(Math.sin(a - taken[i].a), Math.cos(a - taken[i].a)));
        if (d < gap && Math.abs(r - taken[i].r) < 0.12) ok = false;
      }
      if (ok) return a;
    }
    return null;
  }

  CC.ElemGen.registerBuilder("defence-network", function (recipe, layer, plan, count, rng, opts) {
    var band = (opts && opts.orbit) || [1.30, 1.48];
    var el = {
      kind: "defence-network", tier: 0, angle: 0,
      radius: band[1],
      alpha: recipe.alpha ? lerp(recipe.alpha[0], recipe.alpha[1], rng()) : 1,
      tone: recipe.tone || "lighter",
      seed: rng(),
      guns: [],
      sats: []
    };
    /* The platforms: 2-6, along the middle of the band, well apart. */
    var nGuns = pick([2, 3, 3, 4, 4, 5, 6], rng);
    var mid = [lerp(band[0], band[1], 0.3), lerp(band[0], band[1], 0.7)];
    var placed = [];
    var reach = 0;
    for (var g = 0; g < nGuns; g++) {
      var len = lerp(0.17, 0.23, rng());
      var r = lerp(mid[0], mid[1], rng());
      var a = bearing(r, len / 2, placed, 0.42, rng);
      if (a === null) continue;
      placed.push({ r: r, a: a });
      el.guns.push({ r: r, a: a, len: len, tilt: (rng() - 0.5) * 0.25,
                     wide: lerp(0.40, 0.55, rng()), lights: rng() });
      reach = Math.max(reach, r + len / 2);
    }
    /* The satellites: ONE orbit, evenly spaced, panels along it, one size
     * and one design per body. Scattered heights and turns read as space
     * junk at a glance (the user, on the first render); a constellation is
     * a set. Spaced round the whole circle, then the ones off the frame's
     * height and the ones on a platform are dropped, so the platforms sit
     * in gaps of the constellation rather than among it. */
    var nSats = Math.round(lerp(12, 34, rng()));
    var rs = lerp(band[0], band[1], lerp(0.35, 0.65, rng()));
    var sz = lerp(0.0088, 0.0120, rng());
    var wing = lerp(1.6, 2.4, rng());
    var sPhase = rng() * TAU;
    for (var k = 0; k < nSats; k++) {
      var as = sPhase + k * TAU / nSats;
      var lit = rng() < 0.6;
      if (rs * Math.abs(Math.cos(as)) + sz * 3 > VREACH) continue;
      var clear = true;
      for (g = 0; g < el.guns.length && clear; g++) {
        var dg = Math.abs(Math.atan2(Math.sin(as - el.guns[g].a), Math.cos(as - el.guns[g].a)));
        if (dg < 0.10) clear = false;
      }
      if (!clear) continue;
      el.sats.push({ r: rs, a: as, s: sz, turn: 0, wing: wing, lit: lit });
      reach = Math.max(reach, rs + sz * 3);
    }
    el.radius = reach;
    el.size = 0.01;
    return [el];
  });

  /* THE MINEFIELD: 2-3 rows across the band, each evenly spaced round the
   * whole circle and staggered half a step against the last, every mine
   * the same size and turned the same way to its radial. Ordered, because
   * the satellites taught it: marks at random turns read as junk, and a
   * perimeter somebody laid is a pattern. Kept to the frame's height like
   * the network. */
  CC.ElemGen.registerBuilder("minefield", function (recipe, layer, plan, count, rng, opts) {
    var band = (opts && opts.orbit) || [1.75, 2.05];
    var rows = rng() < 0.5 ? 2 : 3;
    var orb = lerp(0.0085, 0.0100, rng());
    /* Spikes twice the orb's length (its diameter), from its surface. */
    var span = orb + 4 * orb;
    var pitch = lerp(0.11, 0.14, rng());
    var phase = rng() * TAU;
    var el = {
      kind: "minefield", tier: 0, angle: 0, radius: band[1],
      alpha: recipe.alpha ? lerp(recipe.alpha[0], recipe.alpha[1], rng()) : 1,
      tone: recipe.tone || "lighter",
      seed: rng(),
      orb: orb,
      /* 0 a "+" to the radial, π/4 an "x". */
      turn: rng() < 0.5 ? 0 : Math.PI / 4,
      mines: []
    };
    var reach = 0;
    for (var i = 0; i < rows; i++) {
      var r = rows === 1 ? (band[0] + band[1]) / 2 : lerp(band[0], band[1], i / (rows - 1));
      var n = Math.round(TAU * r / pitch);
      for (var k = 0; k < n; k++) {
        var a = phase + (k + (i % 2) * 0.5) * TAU / n;
        if (r * Math.abs(Math.cos(a)) + span > VREACH) continue;
        el.mines.push({ r: r, a: a, lit: rng() < 0.35 });
        reach = Math.max(reach, r + span);
      }
    }
    el.radius = reach || band[1];
    el.size = 0.01;
    return [el];
  });
})();
