/* The comparison phrasebook — figures turned into things people can picture.
 *
 * This is HAZARDS.md's "Comparison phrasebook" table, as data. It lives beside
 * the other data tables rather than inside gen/stats.js because that is what it
 * is: a lookup from a number to a sentence, with no logic in it.
 *
 * "STATS ARE FOR LAYPEOPLE" (CLAUDE.md). Metric, with a relatable comparison.
 * "Hot enough to melt lead" beats "601 K", and `8.67 km/s` with no explanation
 * is the failure mode. Every ladder here exists so a figure never appears on
 * the card without something to measure it against.
 *
 * EACH LADDER IS READ AS "THE FIRST ROW THE FIGURE CLEARS", walking downward —
 * except SIZE, which searches for the largest threshold cleared, because its
 * rows are deliberately not in numeric order (a Jupiter is smaller than
 * "big enough to swallow the inner planets", and both rows have to exist).
 *
 * Extending these is expected, and HAZARDS.md gives the guidelines: specific
 * beats generic, name the consequence to a person, and KEEP SOME MUNDANE —
 * contrast is what makes the extremes land.
 *
 * Loaded before gen/stats.js, which reads it. */

var CC = CC || {};

CC.Phrasebook = (function () {
  "use strict";

  /* HAZARDS.md's temperature phrasebook, as a ladder. Read downward: the first
   * row whose threshold the figure clears is the one that describes it. */
  var TEMP_SAYINGS = [
    [3000, "hot enough that nothing stays solid"],
    [1500, "hot enough to melt steel"],
    [900, "hot enough to melt aluminium"],
    [330, "hot enough to melt lead"],
    [100, "above the boiling point of water"],
    [45, "hotter than any desert on Earth"],
    [-5, "comfortable, near enough"],
    [-40, "a very bad Antarctic winter"],
    [-100, "colder than anywhere on Earth, by a wide margin"],
    [-180, "cold enough that methane falls as snow"],
    [-999, "cold enough to freeze air solid"]
  ];

  function tempSaying(c) {
    for (var i = 0; i < TEMP_SAYINGS.length; i++) {
      if (c >= TEMP_SAYINGS[i][0]) return TEMP_SAYINGS[i][1];
    }
    return TEMP_SAYINGS[TEMP_SAYINGS.length - 1][1];
  }

  var SIZE_SAYINGS = [
    [50000, "big enough to swallow the inner planets"],
    [60000, "about the size of Jupiter"],
    [9000, "a super-Earth; a long way down to anywhere"],
    [7200, "noticeably larger than Earth"],
    [5600, "about the size of Earth"],
    [3800, "between Mars and Earth"],
    [2600, "about the size of Mars"],
    [1400, "about the size of our Moon"],
    [300, "a large asteroid"],
    [0, "about the size of a city"]
  ];

  function sizeSaying(radius) {
    /* 60000/50000 sit out of order above on purpose — a Jupiter is smaller than
     * "swallow the inner planets", so the ladder is walked as a search for the
     * largest threshold cleared rather than in file order. */
    var best = null;
    for (var i = 0; i < SIZE_SAYINGS.length; i++) {
      var row = SIZE_SAYINGS[i];
      if (radius >= row[0] && (!best || row[0] > best[0])) best = row;
    }
    return best ? best[1] : "hard to compare with anything";
  }

  var GRAV_SAYINGS = [
    [5, "you could not stand up"],
    [2.2, "punishing; a fall is likely a fatal one"],
    [1.4, "heavy - tiring within an hour"],
    [1.12, "noticeably heavy, but you'd adapt"],
    [0.88, "Earth normal"],
    [0.55, "light; everything feels easy"],
    [0.25, "you'd bound rather than walk"],
    [0.08, "lunar, near enough - every step is a hop"],
    [0, "almost none; a careless jump could put you in orbit"]
  ];

  function saying(ladder, v) {
    for (var i = 0; i < ladder.length; i++) if (v >= ladder[i][0]) return ladder[i][1];
    return ladder[ladder.length - 1][1];
  }

  return {
    TEMP: TEMP_SAYINGS,
    SIZE: SIZE_SAYINGS,
    GRAVITY: GRAV_SAYINGS,
    tempSaying: tempSaying,
    sizeSaying: sizeSaying,
    saying: saying
  };
})();
