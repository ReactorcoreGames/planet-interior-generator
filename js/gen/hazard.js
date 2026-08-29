/* The hazard rating — one word for "how much trouble is this place".
 *
 * Split out of gen/stats.js, which passed the 500-line rule. It is a genuinely
 * separate concern: everything else in that file MEASURES one property of the
 * body, and this weighs all of them against each other.
 *
 * DERIVED, NEVER ROLLED (HAZARDS.md). Every contributing fact is already a line
 * on the card, so a Lethal rating always has a visible reason printed above it
 * — which is the whole point of deriving it rather than rolling one.
 *
 * THE FREQUENCY TABLE IS PART OF THE CONTRACT, not only the ladder. HAZARDS.md
 * wants Mild and Hazardous COMMON, Severe and Lethal UNCOMMON, and Absolute
 * rare and mostly reserved for compact objects. A generator where almost
 * everything is lethal has a rating that carries no information, which is a
 * different failure from being wrong — and it is what the first
 * correctly-derived version did (44% Lethal). See PROGRESS.md D52 for the four
 * calibration traps, all of which are asserted in test/stats.mjs rather than
 * left as advice.
 *
 * `facts` is the bundle gen/stats.js assembles — see its `build`.
 *
 * Loaded before gen/stats.js, which calls it. */

var CC = CC || {};

CC.Hazard = (function () {
  "use strict";

  var clamp = CC.Math.clamp;

  /* ---- hazard rating --------------------------------------------------- */

  /* DERIVED, NEVER ROLLED (HAZARDS.md). Each contributing fact is already on
   * the card, so a Lethal rating always has a visible reason above it. */
  var RATINGS = ["Benign", "Mild", "Hazardous", "Severe", "Lethal", "Absolute"];

  /* THE FREQUENCY TABLE IS PART OF THE CONTRACT, not only the ladder.
   * HAZARDS.md wants Mild and Hazardous COMMON, Severe and Lethal UNCOMMON,
   * and Absolute rare and mostly reserved for compact objects — "a merely
   * inconvenient world is a fine result and makes the dangerous ones land
   * harder". The first calibration ran 44% Lethal and 8% Absolute over a
   * random sweep, which inverts that: when almost everything is lethal, the
   * rating stops carrying information and the card stops being useful.
   *
   * Two changes fixed it, and both are about the SHAPE of the scale rather
   * than about being kinder:
   *
   * 1. The thresholds are named cut points rather than a multiply-and-round.
   *    `round(score * 0.72)` compresses the low end (scores 0 and 1 both land
   *    on Benign) and stretches the top, so a body only needed three of five
   *    hazards to be called Lethal.
   * 2. ABSOLUTE IS UNREACHABLE FOR A SOLID BODY. "Nothing survives approach"
   *    describes a black hole, not a hot planet — a rating a planet can reach
   *    is a rating that means something different on the card it appears on.
   *    A compact-object template will raise its own ceiling when Phase 8
   *    lands; this one stops at Lethal. */
  /* Retuned once the cold end got its own rungs — adding a rung shifts every
   * body up the ladder, so the cut points are no longer calibrated. That is
   * the same trap D45 records: when a formula's input changes range, its
   * weights stop being calibrated even though nothing about them changed. */
  var CUTS = [2, 4, 6, 8, 99];   /* score < CUTS[i] -> RATINGS[i] */

  function hazardOf(facts) {
    var score = 0;

    /* Temperature, against the range a person could survive unprotected. */
    /* THE COLD END NEEDED ITS OWN RUNGS. Folded into one ladder with the heat,
     * a world at -192 C scored the same +3 as one at -155 and came out
     * Hazardous — a rating that says "manageable with equipment" over a
     * surface cold enough that methane falls as snow. Deep cold is a
     * different problem from merely cold: it freezes the working fluid in
     * anything you brought with you. */
    var hot = facts.tempMax, cold = facts.tempMin;

    /* A GIANT'S CLOUD TOPS ARE COLD, AND THAT IS NOT NEWS.
     *
     * The temperature rungs and floors below are calibrated against a surface
     * a person might stand on, where -190 C is an extraordinary fact. On a gas
     * giant it is Tuesday: the spec's own range for an ordinary one is -180 to
     * -60, so every single giant would have cleared the "at least Severe"
     * floor and most would have hit Lethal on temperature alone. The rating
     * would have stopped carrying information for the whole family, which is
     * exactly the failure the frequency table above was retuned to fix.
     *
     * This is D45's trap in a new place: when a formula's input changes range,
     * its weights are no longer calibrated even though nothing about them
     * changed. So the cold end is measured against what is ordinary FOR THIS
     * FAMILY. The hot end is untouched — a giant hot enough to melt lead at
     * its cloud tops is genuinely remarkable, and should read as such. */
    var gaseous = facts.family === "gaseous";
    if (gaseous) cold += 150;

    /* A STAR IS OFF THE TOP OF THIS LADDER, AND SAYING SO IS THE HONEST
     * ANSWER RATHER THAN A SPECIAL CASE.
     *
     * D75's trap once more, at the opposite end from the giants': the heat
     * rungs top out at 400 C, and the COOLEST star in the family is 2,000.
     * Every star clears every rung, so the summed score is a constant and the
     * rating stops carrying information across the family — the exact failure
     * the frequency table was retuned to fix.
     *
     * The difference from the gaseous case is that shifting the rungs would be
     * dishonest here. A giant's cloud tops being cold genuinely is not news; a
     * star being lethal genuinely IS the fact, and every star in this
     * generator is uniformly, unambiguously fatal to approach. So the family
     * takes the ceiling outright and the score below is not consulted for
     * temperature at all.
     *
     * ABSOLUTE STAYS RESERVED for the compact objects of Phase 8 — "nothing
     * survives approach" describes a black hole, and a rating a star can
     * reach is a rating that means something different on the card it appears
     * on. A star is Lethal, which is the top of the scale a body with a
     * surface can reach, and it is the same reasoning that stops a hot planet
     * reaching Absolute. */
    if (facts.family === "stellar") {
      /* Activity is the ONE thing that still separates one star from another
       * here, and it separates Severe from Lethal rather than deciding whether
       * the place is dangerous. A quiet star is still fatal; an active one is
       * fatal further out and with less warning. */
      var starScore = 8 + (facts.activity > 0.5 ? 1 : 0);
      return {
        rating: RATINGS[facts.activity > 0.35 ? 4 : 3],
        score: starScore,
        radiation: clamp(0.55 + facts.activity * 0.45, 0, 1)
      };
    }

    if (hot > 400) score += 3;
    else if (hot > 120) score += 2;
    else if (hot > 55) score += 1;

    if (cold < -185) score += 4;
    else if (cold < -150) score += 3;
    else if (cold < -80) score += 2;
    else if (cold < -35) score += 1;

    /* No air is a hard floor: vacuum alone is at least Hazardous. */
    if (!facts.atmosphere.present) score += 2;
    else if (facts.atmosphere.pressure > 12) score += 2;
    else if (!facts.atmosphere.breathable) score += 1;

    /* THE GIANT'S EQUIVALENT OF "HOW MUCH AIR IS THERE" IS "HOW SOON DOES IT
     * CRUSH YOU". Pressure is the family's defining danger, and unlike a
     * planet's it is not a property of a surface — it is a depth budget. A
     * shallow crush point on something 90,000 km across is a genuinely nasty
     * body to work. */
    if (gaseous) {
      if (facts.crushKm < 1200) score += 2;
      else if (facts.crushKm < 2600) score += 1;
    }

    /* INTERIOR HEAT AT 0 MEANS NO DYNAMO, so a dead world's radiation rating
     * must be worse — HAZARDS.md names this chain explicitly, and it is
     * satisfying precisely because a visual choice about the core produces a
     * survival fact. `climate.radiation` already carries the atmospheric
     * shielding half of it. */
    var rad = facts.radiation;
    if (facts.interiorHeat < 0.12) rad = clamp(rad + 0.22, 0, 1);
    if (rad > 0.72) score += 2;
    else if (rad > 0.42) score += 1;

    /* Gravity you cannot stand in, or so little you cannot stay down. On a
     * body with no surface the same figure means "a well you cannot climb out
     * of", which is a danger in its own right and scores the same. */
    if (facts.gravity > 2.4 || facts.gravity < 0.06) score += 1;

    /* Thermal shock across the terminator is its own danger and is exactly
     * what `spread` measures. */
    if (facts.spread > 0.55) score += 1;

    var idx = 0;
    while (idx < CUTS.length && score >= CUTS[idx]) idx++;

    /* FLOORS, FOR THE FACTS THAT DECIDE THE RATING ON THEIR OWN.
     *
     * A summed score is the right shape for the ordinary case — several
     * moderate dangers compounding is genuinely worse than one — but it lets a
     * single overwhelming fact be averaged into the middle of the scale. A
     * world at -199 C came out Hazardous, i.e. "manageable with equipment",
     * because deep cold was its only hazard and one term cannot outvote the
     * absence of four others.
     *
     * Raising the cold rungs instead would have dragged every merely cold
     * world up with it. A floor says the thing that is actually true: below
     * the freezing point of nitrogen, nothing else on the card can make the
     * place safer. Same for a surface hot enough to melt lead. */
    var floor = 0;
    if (cold < -185 || hot > 330) floor = 3;              /* at least Severe */
    if (cold < -215 || hot > 900) floor = 4;              /* at least Lethal */
    if (floor > idx) idx = floor;

    return { rating: RATINGS[idx], score: score, radiation: rad };
  }

  return {
    of: hazardOf,
    RATINGS: RATINGS,
    CUTS: CUTS
  };
})();
