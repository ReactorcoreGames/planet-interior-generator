/* The climate, put into words — the two sentences derived from the field.
 *
 * Split out of gen/stats.js, which passed the 500-line rule. These two are a
 * concern of their own: every other function there measures ONE property of the
 * body and returns a figure, while these take the whole thermal field and
 * decide how to SAY it.
 *
 * WHY THE WORDING IS A DECISION AND NOT A FORMAT STRING. HAZARDS.md is explicit
 * that a zoned body has no single surface temperature, so the shape of the
 * sentence has to change with the body:
 *
 *   spread < 0.14   one figure, "near enough everywhere"
 *   locked          NAME the faces - on a locked world, where is half the fact
 *   tilted past     inverted - the poles are the warm regions
 *   otherwise       a sentence about latitude, equator against poles
 *
 * "Boiled on one face, frozen on the other, with a habitable ribbon between
 * them" is the single most useful line the tool produces, and every part of it
 * is read off the picture rather than invented beside it.
 *
 * NOTHING HERE ROLLS. That is what separates this file from data/flavour.js,
 * which sits at a similar level: these sentences restate what the climate field
 * says, so a wrong one contradicts the render. The flavour pools describe what
 * the picture merely permits, so they may roll.
 *
 * Loaded before gen/stats.js, which calls both. */

var CC = CC || {};

CC.ClimateText = (function () {
  "use strict";

  /* ---- the temperature line -------------------------------------------- */

  /* A ZONED BODY HAS NO SINGLE SURFACE TEMPERATURE (HAZARDS.md). `spread` is
   * the signal for which of the two sentences to write, and on a locked world
   * the text NAMES the face, because there half the fact is *where*. */
  function temperatureLine(climate, lo, hi, locked) {
    var mean = Math.round((lo + hi) / 2);
    if (climate.spread < 0.14) {
      return Math.round(mean) + " C, near enough everywhere - " + CC.Phrasebook.tempSaying(mean);
    }
    var a = Math.round(lo), b = Math.round(hi);
    if (locked) {
      return "Day side " + b + " C, night side " + a + " C - " + CC.Phrasebook.tempSaying(b);
    }
    /* THE COMPARISON MUST DESCRIBE THE FIGURE IT IS ATTACHED TO. Written
     * against the MEAN while ending "at the equator", this read "-4 C to 172 C
     * - hotter than any desert on Earth at the equator" on a world whose
     * equator is at 172 C, i.e. hot enough to boil away a sea. The sentence
     * named the hottest bearing and then described the average of the whole
     * world, which is a card disagreeing with itself.
     *
     * On an unlocked body the hottest bearing IS the equator (or the poles on
     * a tipped-over world, which `climateLine` is what names), so the
     * comparison is taken from `hi` and the clause says which end it belongs
     * to. */
    return a + " C to " + b + " C - " + CC.Phrasebook.tempSaying(b) +
      " at the warmest";
  }

  /* THE ONE-LINE CLIMATE SENTENCE. "An ordinary world is a sentence about
   * latitude"; a locked world is a sentence about two states at once. Both are
   * read off `states` and `hottest`/`coldest`, so the sentence and the render
   * are the same fact stated twice. */
  var STATE_WORDS = {
    boiled: "scorched bare", hot: "arid", temperate: "temperate",
    cold: "frosted", frozen: "frozen solid"
  };

  function climateLine(climate, locked, tilt) {
    var hot = STATE_WORDS[climate.hottest] || climate.hottest;
    var cold = STATE_WORDS[climate.coldest] || climate.coldest;

    if (climate.spread < 0.1) {
      return "Uniform - " + hot + " from pole to pole, with no seasons to speak of.";
    }
    if (locked) {
      var mid = (climate.states.temperate || 0);
      return "Its day face is " + hot + " and its night face is " + cold +
        (mid > 0.08 ? ", with a habitable ribbon running between them."
                    : ", with nothing liveable in between.");
    }
    if (tilt > 0.55) {
      return "Inverted - " + hot + " at the poles and " + cold +
        " around the equator. The axis is tipped right over.";
    }
    return hot.charAt(0).toUpperCase() + hot.slice(1) +
      " at the equator, " + cold + " at the poles.";
  }

  return {
    temperatureLine: temperatureLine,
    climateLine: climateLine,
    STATE_WORDS: STATE_WORDS
  };
})();
