/* The flavour pools — text that describes what the picture PERMITS.
 *
 * This file is the registry and the naming; the pools themselves live one file
 * per family beside it.
 *
 *   gen/stats/*    MEASURES the render. Every figure is derived; nothing is
 *                  rolled. A wrong answer there contradicts the picture.
 *   data/flavour/* DESCRIBES it. Every line is rolled — but only from a pool
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
 *
 * ---- WHY THIS IS SPLIT BY FAMILY -------------------------------------------
 *
 * FOR THE SAME REASON gen/stats IS (see js/gen/stats/registry.js): a flavour
 * pool carries a MINDSET, and the solid pools were written entirely in one.
 * "Pick a flat spot and set down", "no dry landing sites", "stable ground for
 * landing" — every one of those assumes a body you can arrive at the surface
 * of. On a gas giant they are not merely wrong, they suggest a landing was
 * ever a possibility.
 *
 * Guarding each solid line with `family === "solid"` would have worked and
 * would have been unreadable at forty lines. So the pools are per family, and
 * `facts.family` selects which file answers. Genuinely universal lines — the
 * mundane fallbacks, the ring-light — live in this file and are offered to
 * every family.
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
 * `facts` is the bundle a stat template assembles — see its `build`. Every
 * field a guard reads is also shown on the card, so a line can never be
 * justified by something the user cannot see.
 *
 * Load order in index.html: this file, then the families, then gen/stats. */

var CC = CC || {};

CC.Flavour = (function () {
  "use strict";

  var POOLS = {};

  /* A family file registers its four pools. Each is `function (facts, add)`
   * and pushes candidate lines through `add(condition, line)`; the dispatch
   * below does the rolling, so no family file contains an RNG call and none
   * can accidentally consume a different number of draws from another. */
  function registerPools(family, pools) {
    POOLS[family] = pools;
    return pools;
  }

  /* ---- universal lines ------------------------------------------------- */

  /* Offered to EVERY family, because they are true of any body with the fact
   * that guards them. Kept here rather than duplicated per file so a fix
   * lands once. */
  function universal(which, facts, add) {
    if (which === "danger") {
      add(facts.radiation > 0.62,
        "Radiation. Stellar flares, without warning and without a safe interval.");
      add(facts.traits.indexOf("debris-belt") >= 0 ||
          facts.traits.indexOf("ring-system") >= 0,
        "Whatever falls out of orbit next. The sky here is not empty.");
    } else if (which === "notable") {
      add(facts.sunless, "There is no sun. The only light is what you brought.");
      add(facts.traits.indexOf("ring-system") >= 0,
        "It's bright enough at midnight to read by, from ring-light alone.");
      add(facts.day && facts.day.slow,
        "A day here lasts longer than most expeditions.");
      add(true, "Sensors are useless here. So is long-range communication.");
    } else if (which === "approach") {
      add(facts.traits.indexOf("ring-system") >= 0,
        "The ring system makes a clean approach vector hard to find.");
      add(facts.traits.indexOf("debris-belt") >= 0,
        "Debris in orbit. Not all of it is natural.");
      add(facts.hazardScore >= 7,
        "Do not approach. Observation from distance only.");
    }
  }

  /* ---- dispatch -------------------------------------------------------- */

  /* Build the pool for one question, then pick from it. The family's own
   * lines and the universal ones go into the same pool, so a giant can still
   * draw ring-light and a planet still draws it at the same odds it always
   * did. */
  function pick(which, facts, rng, fallback) {
    var pool = [];
    var add = function (cond, line) { if (cond) pool.push(line); };

    var family = POOLS[facts.family] || POOLS.solid;
    if (family && family[which]) family[which](facts, add);
    universal(which, facts, add);

    if (!pool.length && fallback) pool = fallback.slice();
    if (!pool.length) return "";
    return pool[Math.floor(rng() * pool.length) % pool.length];
  }

  function dangerOf(facts, rng) {
    /* MUNDANE IS ALLOWED AND WELCOME. A merely inconvenient world is a fine
     * result and it makes the dangerous ones land harder. */
    return pick("danger", facts, rng, [
      "Honestly, very little. Bring a coat.",
      "Nothing in particular. It's a quiet, unremarkable place.",
      "Boredom, mostly. There is very little here."
    ]);
  }

  function notableOf(facts, rng) { return pick("notable", facts, rng, null); }
  function resourceOf(facts, rng) {
    return pick("resource", facts, rng,
                ["Nothing of obvious value, which is its own kind of useful."]);
  }
  function approachOf(facts, rng) {
    return pick("approach", facts, rng,
                ["Nothing unusual about the approach itself."]);
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
    registerPools: registerPools,
    dangerOf: dangerOf,
    notableOf: notableOf,
    resourceOf: resourceOf,
    approachOf: approachOf,
    nameOf: nameOf
  };
})();
