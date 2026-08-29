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

  /* A GIANT'S SIZE LADDER, because the solid one runs out.
   *
   * `sizeSaying` tops out at "about the size of Jupiter", which is the FLOOR
   * of this family rather than its ceiling — every gas giant would have got
   * the same top rung and the comparison would have stopped comparing. The
   * reference points here are the ones a reader actually has: Neptune,
   * Saturn, Jupiter, and past that the brown-dwarf line where a body is very
   * nearly something else entirely. */
  var GIANT_SIZE_SAYINGS = [
    [88000, "close to the largest a planet can be before it starts to shrink"],
    [72000, "bigger than Jupiter, and heavier than that suggests"],
    [58000, "about the size of Jupiter"],
    [48000, "a little smaller than Jupiter"],
    [36000, "about the size of Saturn"],
    [27000, "between Neptune and Saturn"],
    [22000, "about the size of Neptune"],
    [16000, "a small ice giant; barely qualifies"],
    [0, "an undersized giant, more of a puffed-up core"]
  ];

  function giantSizeSaying(radius) {
    for (var i = 0; i < GIANT_SIZE_SAYINGS.length; i++) {
      if (radius >= GIANT_SIZE_SAYINGS[i][0]) return GIANT_SIZE_SAYINGS[i][1];
    }
    return GIANT_SIZE_SAYINGS[GIANT_SIZE_SAYINGS.length - 1][1];
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

  /* GRAVITY, AS A BODY WITH NO SURFACE EXPERIENCES IT.
   *
   * The solid ladder is written in terms of standing, walking and falling —
   * "you could not stand up", "every step is a hop" — which is exactly the
   * mindset a giant's card is supposed to drop. Nobody stands anywhere here.
   * What gravity decides on a giant is how hard it is to climb back out and
   * how fast the pressure builds under you, so the rungs say that instead. */
  var GIANT_GRAV_SAYINGS = [
    [4.0, "a well you do not climb out of without a dedicated stage"],
    [2.4, "getting down is free; getting back up costs more than the cargo"],
    [1.6, "heavy going. Pressure builds fast under a skimmer"],
    [1.15, "a bit more than Earth pulls, and it tells on the fuel budget"],
    [0.85, "near enough Earth's pull, oddly enough"],
    [0.55, "gentle. A loaded skimmer can climb out under its own power"],
    [0, "barely holds itself together, let alone anything you drop in"]
  ];

  /* ---- the stellar ladders ------------------------------------------- */

  /* A STAR'S SIZE, AGAINST THE ONE STAR EVERY READER HAS SEEN.
   *
   * The giant ladder tops out at 88,000 km, which a star clears in its first
   * rung — the smallest dwarf here is 100,000 and the largest red giant is
   * 70,000,000. So the reference point is the Sun (about 696,000 km radius),
   * expressed in the way people actually meet the comparison: what it would
   * swallow if you put it where the Sun is.
   *
   * D75 is why this exists at all rather than being a reuse. A ladder whose
   * rungs sit outside the range its input reaches is a constant wearing a
   * ladder's clothes, and every single star would have got the top rung. */
  /* THE RUNGS ARE RADII, and they are the real figures rather than round
   * numbers: the Sun's radius is 696,000 km, Mercury orbits at 58 million,
   * Venus at 108 million, Earth at 150 million. A red giant genuinely does
   * reach past the inner planets, and saying so with the correct thresholds is
   * what makes the comparison worth having.
   *
   * MEASURED AGAINST WHAT THE ARCHETYPES PRODUCE (D75), not guessed: the
   * family's radii run 100,000 (a small dwarf) to 70,000,000 (the largest red
   * giant), and every rung below sits inside that band with several archetypes
   * able to reach each one. */
  var STAR_SIZE_SAYINGS = [
    [58000000, "if you put it where the Sun is, its surface would be out past Mercury's orbit"],
    [30000000, "if you put it where the Sun is, it would reach a third of the way to Mercury"],
    [12000000, "seventeen times the width of the Sun. It would take light a minute to cross it"],
    [4000000, "several times the width of the Sun - a genuine giant"],
    [1400000, "twice the size of the Sun, and it looks it"],
    [800000, "a little larger than the Sun"],
    [560000, "about the size of the Sun"],
    [300000, "half the size of the Sun"],
    [130000, "small, as stars go - a few times the size of Jupiter"],
    [0, "barely a star at all; not much bigger than a large planet"]
  ];

  function starSizeSaying(radius) {
    for (var i = 0; i < STAR_SIZE_SAYINGS.length; i++) {
      if (radius >= STAR_SIZE_SAYINGS[i][0]) return STAR_SIZE_SAYINGS[i][1];
    }
    return STAR_SIZE_SAYINGS[STAR_SIZE_SAYINGS.length - 1][1];
  }

  /* SURFACE TEMPERATURE, IN THOUSANDS OF DEGREES.
   *
   * `TEMP_SAYINGS` tops out at "hot enough that nothing stays solid" at 3,000
   * C, which is the COLDEST star in the family. Every rung below that is dead
   * weight here and the top rung would describe all four archetypes
   * identically — the same failure `giantSizeSaying` was written to avoid at
   * the other end of the scale.
   *
   * The rungs are colour, because that is what a star's temperature actually
   * looks like and it is the one thing about a star a reader can check against
   * the picture. */
  var STAR_TEMP_SAYINGS = [
    [20000, "blue-white and violent; it burns through its fuel in a hurry"],
    [11000, "blue-white, and far hotter than anything you have a comparison for"],
    [7000, "white, and bright enough to be dangerous at a distance"],
    [5200, "yellow-white, like the Sun"],
    [4200, "orange; cooler than the Sun and gentler with it"],
    [3200, "deep orange-red, and cool enough to be called cool only by stars"],
    [0, "a dull red. Still hot enough to vaporise anything you could send"]
  ];

  /* AN ASTEROID'S SIZE LADDER, because the solid one runs out at the bottom
   * exactly as it runs out at the top for a giant.
   *
   * `sizeSaying`'s two lowest rungs are 300 km ("a large asteroid") and 0
   * ("about the size of a city"), which were written from a PLANET'S point of
   * view: below Mars, everything is small, and one rung covers three orders of
   * magnitude. Handed this family it reported a 277 km rock — a body a third
   * the size of Ceres, one of the largest objects in the belt — as "about the
   * size of a city", and every asteroid under 300 km got that same line. The
   * comparison had stopped comparing, which is the identical failure the giant
   * ladder was written to fix.
   *
   * The reference points here are the ones a reader actually has for a rock:
   * the named belt objects at the top, and at the bottom the human-scale
   * comparisons that are the whole reason a body this small is interesting —
   * a mountain, a city block, a building. */
  var ASTEROID_SIZE_SAYINGS = [
    [400, "one of the largest objects in its belt - very nearly a dwarf planet"],
    [230, "about the size of Vesta; big enough to have pulled itself round-ish"],
    [120, "a major belt object; you could not walk around it"],
    [55, "a substantial rock - a week's survey, not an afternoon's"],
    [22, "a few tens of kilometres across; a small town could sit on one face"],
    [8, "small - you could cross it on foot in a day, carefully"],
    [3, "a mountain, adrift and on its own"],
    [1, "about the size of a city block"],
    [0, "barely a body at all - a building, tumbling"]
  ];

  function asteroidSizeSaying(radius) {
    for (var i = 0; i < ASTEROID_SIZE_SAYINGS.length; i++) {
      if (radius >= ASTEROID_SIZE_SAYINGS[i][0]) return ASTEROID_SIZE_SAYINGS[i][1];
    }
    return ASTEROID_SIZE_SAYINGS[ASTEROID_SIZE_SAYINGS.length - 1][1];
  }

  return {
    TEMP: TEMP_SAYINGS,
    SIZE: SIZE_SAYINGS,
    GRAVITY: GRAV_SAYINGS,
    STAR_SIZE: STAR_SIZE_SAYINGS,
    STAR_TEMP: STAR_TEMP_SAYINGS,
    starSizeSaying: starSizeSaying,
    GIANT_SIZE: GIANT_SIZE_SAYINGS,
    GIANT_GRAVITY: GIANT_GRAV_SAYINGS,
    tempSaying: tempSaying,
    sizeSaying: sizeSaying,
    giantSizeSaying: giantSizeSaying,
    ASTEROID_SIZE: ASTEROID_SIZE_SAYINGS,
    asteroidSizeSaying: asteroidSizeSaying,
    saying: saying
  };
})();
