/* Black holes — the stat template.
 *
 * THE MINDSET (D78): a neutron star's card asks how much is in how little. A
 * black hole's asks about DISTANCE AND TIME — where the point of no return
 * is, how close anything can orbit, what the tides do to you on the way, how
 * time runs down there, and what is inside, which is the one question this
 * cutaway answers that no telescope can.
 *
 * MASS CLASS IS THE LEVER, and it is the archetype's most important number
 * (the spec): it spans a few km to many millions, and it inverts intuition —
 * a small hole's tides shred you thousands of km out, while a supermassive
 * one's are gentle enough at the horizon that you would cross it without
 * noticing. Both facts come from the same formula, so the card says whichever
 * this hole's mass makes true.
 *
 * Every figure reads what was drawn: the spin from `body.hole` (the same
 * number that placed the disc's inner edge and opened the interior), the
 * interior from which bands were BUILT, the disc and jets from the resolved
 * accretion. The picture is a diagram at one scale; the card is where the
 * real scale lives, and it says so. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp, lerp = CC.Math.lerp;
  var sig = function (v) { return CC.Stats.compact.sig(v); };

  /* Mass in suns from the Mass class dial (Core size bias, -1..1), plus a
   * per-body spread of half an order of magnitude so two holes at one setting
   * are not identical. ~5 suns at the bottom, ~10^5 in the middle, ~10^9.4 at
   * the top. */
  function massOf(classDial, seed) {
    var r = CC.RNG.stream(seed, "stats/blackhole/mass")();
    var lg = lerp(0.8, 9.2, (clamp(classDial, -1, 1) + 1) / 2) + (r - 0.5) * 0.6;
    return Math.pow(10, lg);
  }
  function classOf(m) {
    return m < 100 ? "stellar-mass" : (m < 1e5 ? "intermediate" : "supermassive");
  }
  function km(v) {
    if (v >= 1e6) return sig(v) + " km";
    return Math.round(v).toLocaleString("en-US") + " km";
  }

  CC.Stats.registerTemplate("black-hole", {
    build: function (body, details, settings, archetype, rng, shared) {
      var H = body.hole || { a: 0, q: 1, isco: 3, accretion: 0, disc: null };
      var m = massOf(settings.coreBias || 0, settings.seed);
      var cls = classOf(m);
      /* GM/c^2 is 1.477 km per solar mass; the outer horizon is that times
       * (1 + q). The innermost stable orbit is resolved in horizon radii. */
      var gm = 1.477 * m;
      var rPlus = gm * (1 + H.q);
      var isco = H.isco * rPlus;

      /* Tidal stretch across a 2 m body at the horizon, in g. */
      var rM = rPlus * 1000;
      var tide = 2 * 6.674e-11 * m * 1.989e30 * 2 / (rM * rM * rM) / 9.81;

      /* Inner-edge disc temperature: hotter for a small hole and a hungry
       * one. ~10 million C for a stellar-mass hole feeding hard, a few
       * hundred thousand for a supermassive one. */
      var disc = !!H.disc;
      var discC = disc
        ? 1.3e7 * Math.pow(m / 10, -0.25) * Math.pow(0.15 + H.accretion, 0.25) - 273
        : 0;

      var jets = !!body.beams;
      var hasInner = body.has("cauchy-shell");
      var spinPct = Math.round(H.a * 100);

      var traits = (details.traits || []).map(function (t) { return t.id; });
      var facts = {
        family: "black-hole",
        mass: m, massClass: cls,
        horizonKm: rPlus, iscoKm: isco,
        tideG: tide,
        spin: H.a, spinning: hasInner,
        disc: disc, discC: discC, accretion: H.accretion,
        jets: jets,
        radius: rPlus,
        tempMin: 0, tempMax: 0,
        radiation: 0.5, sunless: false, locked: false, gravity: 0,
        atmosphere: { present: true, pressure: 0, text: "" },
        breathable: false,
        traits: traits
      };
      var hazard = CC.Hazard.of(facts);
      facts.hazardScore = hazard.score;

      /* Tides fall off as 1/r^3, so the distance at which they reach a
       * lethal 100 g head to foot is computed, not asserted. */
      var lethalKm = rPlus * Math.pow(Math.max(1, tide / 100), 1 / 3);
      var tideLine = tide > 100
        ? sig(tide) + " g of stretch head to foot at the horizon. It would " +
          "pull you apart " + km(lethalKm - rPlus) + " before you got there"
        : tide > 8
          ? "Strong enough at the horizon to hurt - " + Math.round(tide) +
            " g head to foot"
          : "Gentle at the horizon - you could cross it without noticing, " +
            "which is the most unsettling fact about it";

      var lines = [
        { key: "size", label: "Size",
          value: "Event horizon " + km(rPlus * 2) + " across" },
        { key: "mass", label: "Mass",
          value: sig(m) + " times the Sun, compressed past the point of " +
                 "return - " + cls },
        { key: "reach", label: "Point of no return",
          value: km(rPlus) + " from the centre. Past it, no course " +
                 "correction helps" },
        { key: "orbit", label: "Closest safe orbit",
          value: km(isco) + " - inside that nothing circles; it falls" },
        { key: "tide", label: "Tides", value: tideLine },
        { key: "spin", label: "Spin",
          value: spinPct < 5 ? "Barely turning - one black ball, inside and out"
                             : spinPct + "% of the fastest a black hole can spin" },
        { key: "inside", label: "Inside",
          value: hasInner
            ? "An ergosphere outside the horizon where space is dragged round; " +
              "inside, a blazing inner horizon where infalling light piles up, " +
              "and a singularity shaped like a ring"
            : "Nothing. Inward stops being a direction and becomes the future, " +
              "and everything ends at a point" },
        { key: "disc", label: "Accretion disc",
          value: disc
            ? "Up to " + sig(discC) + " C at the inner edge" +
              (cls === "supermassive" ? " - cooler than a small hole's, and " +
                                        "bright enough to see from another galaxy"
                                      : " - hot enough to glow in X-rays")
            : "None. Nothing is falling in, and there is nothing to see" },
        { key: "jets", label: "Jets",
          value: jets
            ? "Matter fired out along the spin axis at nearly light speed" +
              (cls === "supermassive" ? ", for thousands of light-years" : "")
            : "None at this feeding rate" },
        { key: "time", label: "Time",
          value: "Runs slower near the horizon. Hover just above it and every " +
                 "hour you spend is ten for everyone else" },
        { key: "notable", label: "Notable", value: CC.Flavour.notableOf(facts, rng) },
        { key: "approach", label: "Approach", value: CC.Flavour.approachOf(facts, rng) },
        { key: "danger", label: "Biggest danger", value: CC.Flavour.dangerOf(facts, rng) }
      ];

      return { lines: lines, facts: facts, hazard: hazard, levels: LEVELS };
    }
  });

  var LEVELS = {
    compact: ["size", "mass", "reach", "inside", "danger"],
    standard: ["size", "mass", "reach", "orbit", "tide", "spin", "inside",
               "disc", "danger"],
    full: null
  };

  CC.Stats.blackHole = { massOf: massOf, classOf: classOf };
})();
