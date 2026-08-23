/* The flavour pools — text that describes what the picture PERMITS.
 *
 * Split out of gen/stats.js, which passed the 500-line rule when the four
 * pools and the name generator landed. The split is along a real seam rather
 * than an arbitrary one:
 *
 *   gen/stats.js   MEASURES the render. Every figure is derived; nothing is
 *                  rolled. A wrong answer there contradicts the picture.
 *   data/flavour.js  DESCRIBES it. Every line is rolled — but only from a pool
 *                  the derived facts have already filtered.
 *
 * WHY A ROLL IS LEGITIMATE HERE AND NOWHERE ELSE. These lines assert nothing
 * the render shows: whether the crust rings like a bell after an impact, or
 * whether the interference has a pattern, is not visible in a cross-section
 * either way. So a roll cannot disagree with the picture.
 *
 * WHAT KEEPS THEM HONEST IS THE FILTER, NOT THE ROLL. Every `add(cond, line)`
 * is guarded by the fact that makes the line true, so nothing can be selected
 * for a body it does not describe — a rogue world never draws "two sunrises
 * per day", and a world with no ring never draws ring-light. The roll picks
 * among things that are already true of this body.
 *
 * MUNDANE IS ALLOWED AND WELCOME (HAZARDS.md). When every guard fails, the
 * danger pool falls back to "Honestly, very little. Bring a coat." A merely
 * inconvenient world is a fine result and it is what makes the dangerous ones
 * land harder.
 *
 * NO INHABITANTS. v2's quoted "settler flavour" was removed for repeating too
 * often and for describing local detail at a planetary scale. Text describes
 * the BODY; populating it is the user's job.
 *
 * `facts` is the bundle gen/stats.js assembles — see its `build`. Every field
 * a guard reads is also shown on the card, so a line can never be justified by
 * something the user cannot see.
 *
 * Loaded before gen/stats.js, which calls it. */

var CC = CC || {};

CC.Flavour = (function () {
  "use strict";

  /* ---- "what would kill you first" ------------------------------------- */

  /* HAZARDS.md's pools, each guarded by the fact that makes it TRUE. This is
   * a filter and then a pick, never a free roll: nothing here can be selected
   * for a body it does not describe. */
  function dangerOf(facts, rng) {
    var pool = [];
    var add = function (cond, line) { if (cond) pool.push(line); };

    add(facts.spread > 0.5 && facts.locked,
      "Thermal shock at the terminator. Stepping from day to night is a " +
      Math.round(facts.tempMax - facts.tempMin) + "-degree change.");
    add(facts.locked && facts.tempMax > 250,
      "The day side. Your radiators will fail before your suit does.");
    add(facts.locked && facts.tempMin < -110,
      "The night side. The air itself is freezing out onto the ground.");
    add(facts.tempMax > 330 && !facts.locked,
      "The heat. Surface temperature is above the melting point of lead.");
    add(facts.tempMin < -120 && !facts.locked,
      "The cold. Unprotected exposure kills in under a minute.");
    add(!facts.atmosphere.present,
      "There's no atmosphere at all - your fluids would boil.");
    add(facts.atmosphere.present && !facts.atmosphere.breathable &&
        facts.atmosphere.pressure < 8,
      "Nothing to breathe. You have as long as you can hold your breath.");
    add(facts.atmosphere.pressure > 12,
      "Pressure. At sea level it's like being " +
      Math.round(facts.atmosphere.pressure * 10) + " metres underwater.");
    add(facts.radiation > 0.62,
      "Radiation. Stellar flares, without warning and without a safe interval.");
    add(facts.radiation > 0.5 && facts.interiorHeat < 0.12,
      "Radiation. The core is dead, so there is no field to deflect any of it.");
    add(facts.gravity > 2.2,
      "Gravity. At " + facts.gravity.toFixed(1) +
      " times Earth normal, a fall is usually a fatal one.");
    add(facts.gravity < 0.08,
      "Almost no gravity at all. A careless push and you're in orbit.");
    add(facts.traits.indexOf("magma-chambers") >= 0,
      "The ground. Very little of it is as solid as it looks.");
    add(facts.traits.indexOf("debris-belt") >= 0 || facts.traits.indexOf("ring-system") >= 0,
      "Whatever falls out of orbit next. The sky here is not empty.");
    add(facts.dust,
      "The wind. It carries enough grit to strip paint in minutes.");

    /* MUNDANE IS ALLOWED AND WELCOME. A merely inconvenient world is a fine
     * result and it makes the dangerous ones land harder. */
    if (!pool.length) {
      pool.push("Honestly, very little. Bring a coat.",
                "Nothing in particular. It's a quiet, unremarkable place.",
                "Boredom, mostly. There is very little here.");
    }
    return pool[Math.floor(rng() * pool.length) % pool.length];
  }

  /* ---- notable conditions, resources, approach ------------------------- */

  function notableOf(facts, rng) {
    var pool = [];
    var add = function (cond, line) { if (cond) pool.push(line); };

    add(facts.locked, "The sun hasn't moved in the sky since the world formed.");
    add(facts.locked, "One hemisphere has never seen daylight. The ice there is original.");
    add(facts.locked && facts.hasOcean,
      "There is a ring of open water between the boiling face and the frozen one.");
    add(facts.day.slow, "A day here lasts longer than most expeditions.");
    add(facts.sunless, "There is no sun. The only light is what you brought.");
    add(facts.sunless && facts.interiorHeat > 0.6,
      "Unlit, and yet the ground is warm. Something down there is still burning.");
    add(facts.axialTilt > 0.55,
      "The poles are warmer than the equator. The whole world is lying on its side.");
    add(facts.axialTilt > 0.2 && facts.axialTilt <= 0.55,
      "One pole is buried in ice and the other is bare. The seasons here are violent.");
    add(facts.frozenFraction > 0.85, "Ice at the poles is old enough to hold a readable atmospheric record.");
    add(facts.radiation > 0.6 && facts.atmosphere.present,
      "The aurora is visible from the surface at all latitudes, constantly.");
    add(facts.traits.indexOf("ring-system") >= 0,
      "It's bright enough at midnight to read by, from ring-light alone.");
    add(facts.traits.indexOf("void-pockets") >= 0,
      "There are caverns beneath the crust larger than most moons.");
    add(facts.traits.indexOf("impact-basin") >= 0,
      "The crust rings like a struck bell after any significant impact.");
    add(facts.traits.indexOf("cratered") >= 0,
      "Nothing has resurfaced here in a very long time. Every impact is still visible.");
    add(facts.interiorHeat < 0.1,
      "The magnetic field is gone. It stopped some time in the last billion years.");
    add(facts.interiorHeat > 0.85,
      "The whole body pulses on a cycle you can feel in your chest.");
    add(facts.gravity < 0.3, "It's spinning fast enough to be visibly flattened at the poles.");
    add(facts.atmosphere.pressure > 20,
      "It rains, evaporates before it lands, and rains again. Nothing reaches the ground.");
    add(facts.tempMax > 900 && facts.atmosphere.present,
      "Metallic rain - iron condenses in the upper atmosphere and falls as droplets.");
    add(facts.tempMin < -170,
      "Snow falls here, but it isn't water.");
    add(true, "Sensors are useless here. So is long-range communication.");
    add(true, "The sky is the wrong colour and nobody agrees what to call it.");
    add(true, "Something down there is warmer than it has any right to be.");
    add(true, "The core is offset from the geometric centre. Nobody has explained why.");

    return pool[Math.floor(rng() * pool.length) % pool.length];
  }

  function resourceOf(facts, rng) {
    var pool = [];
    var add = function (cond, line) { if (cond) pool.push(line); };

    add(facts.traits.indexOf("ore-deposits") >= 0,
      "Heavy metals near enough the surface to be worth the trip.");
    add(facts.traits.indexOf("mineral-veins") >= 0,
      "Rare-earth deposits concentrated by ancient volcanic activity.");
    add(facts.traits.indexOf("metal-rich") >= 0,
      "The whole body is metal under a thin skin of rock. Somebody will want it.");
    add(facts.frozenFraction > 0.4, "Water ice in quantity, and shallow.");
    add(facts.hasOcean && facts.temperate > 0.2, "Deuterium-rich oceans.");
    add(facts.atmosphere.pressure > 3, "Helium-3 in the upper atmosphere. Easy scooping, hard shipping.");
    add(facts.interiorHeat > 0.8, "Exotic isotopes in the mantle that shouldn't form naturally.");
    add(facts.breathable, "Stable ground and a workable atmosphere - the rarest resources of all.");
    add(true, "Nothing of obvious value, which is its own kind of useful.");
    add(facts.tempMin < -60,
      "Crystalline formations that regrow after harvest on a decadal cycle.");

    return pool[Math.floor(rng() * pool.length) % pool.length];
  }

  function approachOf(facts, rng) {
    var pool = [];
    var add = function (cond, line) { if (cond) pool.push(line); };

    add(facts.traits.indexOf("ring-system") >= 0,
      "The ring system makes a clean approach vector hard to find.");
    add(facts.traits.indexOf("debris-belt") >= 0,
      "Debris in orbit. Not all of it is natural.");
    add(facts.locked, "Approach on the night side. The day side will cook your radiators.");
    add(facts.atmosphere.pressure > 0.4 && facts.atmosphere.pressure < 6,
      "Aerobraking is viable, if you trust your heat shielding.");
    add(facts.gravity > 1.8, "The gravity well is deep. Getting down is easy; getting back up is expensive.");
    add(facts.hazardScore >= 7, "Do not approach. Observation from distance only.");
    add(facts.landFraction < 0.02, "No dry landing sites. Everything here is liquid or moving.");
    add(facts.hazardScore < 4, "Straightforward approach. Plenty of stable ground for landing.");
    if (!pool.length) pool.push("Nothing unusual. Pick a flat spot and set down.");

    return pool[Math.floor(rng() * pool.length) % pool.length];
  }

  /* ---- naming ---------------------------------------------------------- */

  var SYL_A = ["ka", "ve", "so", "mar", "tho", "ly", "ne", "cal", "dro", "es",
               "ta", "ur", "phae", "ky", "bel", "zan", "or", "ith", "vas", "hel"];
  var SYL_B = ["ross", "dan", "mir", "tel", "vex", "lorn", "seth", "quar",
               "nith", "bar", "cyn", "dris", "phon", "ket", "wyr"];
  var SYL_C = ["a", "is", "ae", "un", "or", "ia", "eth", "us", "yn", ""];
  var GREEK = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta",
               "Theta", "Iota", "Kappa", "Lambda", "Sigma", "Tau", "Omega"];
  var SUFFIX = ["Prime", "Minor", "Major", "Deep", "Reach", "II", "III", "IV"];

  /* Stem + optionally a Greek letter OR a catalogue tag - NEVER both, since
   * HAZARDS.md notes the combination reads as noise. */
  function nameOf(settings) {
    var rng = CC.RNG.stream(settings.seed, "stats-name");
    var pick = function (a) { return a[Math.floor(rng() * a.length) % a.length]; };
    var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };

    var stem = cap(pick(SYL_A) + pick(SYL_B) + pick(SYL_C));
    var r = rng();
    if (r < 0.25) return pick(GREEK) + " " + stem;
    if (r < 0.33) {
      return stem + " " + pick(["KX", "HD", "GJ", "TR", "PSR"]) + "-" +
        (1000 + Math.floor(rng() * 8999));
    }
    if (r < 0.5) return stem + " " + pick(SUFFIX);
    return stem;
  }

  return {
    dangerOf: dangerOf,
    notableOf: notableOf,
    resourceOf: resourceOf,
    approachOf: approachOf,
    nameOf: nameOf
  };
})();
