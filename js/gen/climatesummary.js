/* The climate summary — the thermal field turned into facts TEXT can read.
 *
 * Split out of gen/climate.js, which passed the 500-line rule once the star
 * controls landed. This is a genuinely separate concern: everything in
 * climate.js exists to shape the PICTURE, and everything here exists to
 * describe it.
 *
 * THE STANDING RULE THIS FILE EXISTS TO ENFORCE (HAZARDS.md): stats are READ
 * OFF the same values that drew the image, never rolled beside it. A card that
 * says "frozen at the poles" over a render with no ice is worse than a card
 * with no temperature on it at all — so this samples the same `tempAt` the
 * frosting colours itself from, and there is no second source it could drift
 * from.
 *
 * NORMALIZED 0..1, NOT DEGREES. Turning a figure into a temperature is the
 * archetype's business, because a star's 0.9 is not a planet's 0.9. The
 * mapping belongs with the per-family stat template, not here.
 *
 * Loaded after gen/climate.js, which calls it. */

var CC = CC || {};

CC.ClimateSummary = (function () {
  "use strict";

  /* How finely the circumference is walked. Fixed, like everything else in the
   * generation stage — a summary that changed with resolution would let the
   * card and the picture disagree at export size, which is the one thing this
   * file exists to prevent. */
  var STEP = 2;

  /* Summarise a built climate field.
   *
   * `field` supplies `tempAt` and `radiationHazard`; the rest are the figures
   * the field was built from, passed in rather than recomputed so the summary
   * and the field can never report different baselines. */
  function build(field, stateOf, base, activity, shield) {
    var tMin = Infinity, tMax = -Infinity, sum = 0, n = 0;
    var states = {};
    var hotA = 0, coldA = 0, hv = -Infinity, cv = Infinity;

    for (var d = 0; d < 360; d += STEP) {
      var a = d * Math.PI / 180;
      var t = field.tempAt(a);

      if (t < tMin) tMin = t;
      if (t > tMax) tMax = t;
      sum += t; n++;

      var st = stateOf(t);
      states[st] = (states[st] || 0) + 1;

      /* Which bearing is hottest and which coldest, so text can NAME a face
       * rather than only quote a number. On a locked world those are the
       * lock's own axis; on an ordinary one they are the equator against the
       * poles; on a strongly tilted one they swap over, which is worth saying
       * when it happens. */
      if (t > hv) { hv = t; hotA = d; }
      if (t < cv) { cv = t; coldA = d; }
    }

    /* Fraction of the circumference in each state, so text can say "most of
     * this world is frozen" rather than only naming the extremes. */
    var frac = {};
    for (var k in states) {
      if (Object.prototype.hasOwnProperty.call(states, k)) frac[k] = states[k] / n;
    }

    return {
      base: base,
      min: tMin, max: tMax, mean: sum / n,
      /* The spread IS the story on a locked or strongly tilted world, and it
       * is what "thermal shock at the terminator" measures. It is also the
       * signal for whether to quote a RANGE or a single figure. */
      spread: tMax - tMin,
      states: frac,
      hottest: stateOf(hv),
      coldest: stateOf(cv),
      hottestAt: hotA,
      coldestAt: coldA,
      /* Whether the body has ice anywhere — the one-line answer to "did caps
       * emerge", and the check a star archetype should run to prove it did
       * not accidentally inherit one. */
      frozenFraction: (frac.frozen || 0) + (frac.cold || 0),
      /* For the hazard card. Read off the same activity and shielding the
       * cover scouring uses, so a card promising a lethal surface and a render
       * showing thick cover cannot both happen. */
      radiation: field.radiationHazard(),
      activity: activity,
      shield: shield
    };
  }

  return { build: build, STEP: STEP };
})();
