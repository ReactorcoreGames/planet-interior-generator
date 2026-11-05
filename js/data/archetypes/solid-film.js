/* Planet — the frosting table and the tidal-lock axis, split out of solid.js.
 *
 * The same cut solid-moon-film.js made for the moon, for the same reason: what
 * settles on a body and what its faces do is one concern, and the stack beside
 * it is another. solid.js passed the 500-line rule in CLAUDE.md.
 *
 * Published on CC.PlanetFilm because solid.js reads them and the project has no
 * module system by deliberate choice (CLAUDE.md). Load order in index.html: this
 * file, then solid.js. */

var CC = CC || {};

CC.PlanetFilm = (function () {
  "use strict";

  var FILM = {
    surface: true,
    /* WHERE THE ZONE BOUNDARIES SIT, as a fraction of the terrain's own
     * range. These were `SNOWLINE = 0.42` and `SHELF = -0.16` in
     * draw/film.js until Phase 5; they are Earth-ish numbers and D22
     * recorded that they had to become per-archetype data once a second
     * family started depositing. Unchanged in value — they are simply
     * now stated as facts about a planet.
     *
     * Both are OFFSETS FROM SEA LEVEL, not absolute radii, so they
     * follow the sea as Ocean depth moves it: raise the sea and the
     * shore rises with it. On a world with no sea at all the level line
     * falls back to the terrain mean, which puts the two underwater
     * zones out of reach and leaves peaks and land dividing the surface
     * between them. */
    line: 0.42,           /* the snowline, above sea level */
    shelf: -0.16,         /* the shelf edge, below it */
    /* EACH ZONE CARRIES ITS DEPOSITION CHARACTER ALONGSIDE ITS COLOUR,
     * which is the other half of the D22 move: the five knobs and the
     * colour they pair with are one statement about a material, and
     * having them in two files a thousand lines apart is what made the
     * planet's numbers look like constants of the renderer.
     *
     *   depth   how thick it lies, as a fraction of the host layer
     *   smooth  how much flatter than the rock its top surface is. High
     *           values pool and level out; low ones drape and follow
     *   bleed   how far its underside fingers down into the rock
     *   patch   how much of the mask's variation reaches the alpha. Low
     *           is an even coat, high is broken and blotchy
     *   grain   amplitude of the fine wobble on the top surface — the
     *           difference between a poured glaze and a crumbly one
     *
     * Authored to contrast with their neighbours: snow lies smooth and
     * even, vegetation is patchy and draped, reefs are lumpy, abyssal
     * ooze is thick and almost featureless. */
    zones: {
      /* Snow and ice. Achromatic and bright on a cold world; on a hot
       * one `snow` does nothing and this stays bare high ground in the
       * family's own colour. */
      /* THE VALUE RANGES ARE NARROW AND BARELY OVERLAP, on purpose.
       *
       * They were authored wide (spans of 0.24-0.32, overlapping
       * heavily) and a random roll could then put the abyssal floor
       * brighter than the snowline — the four zones had no reliable
       * lightness order. Worse, the contrast rule has to lift the whole
       * family clear of the rock, and a family that starts wide has
       * nowhere to go: 48% of all zone colours ended up pinned against
       * the ceiling with their spacing gone.
       *
       * Narrow bands, ordered peak > shallow > land > deep and centred
       * low, leave the lift room to work and keep the order stable. */
      frostPeak:    { hueOffset:  18, sat: [0.20, 0.55],
                      val: [0.60, 0.72], snow: true,
                      depth: 0.30, smooth: 0.85, bleed: 0.35,
                      patch: 0.35, grain: 0.10 },
      /* The ordinary surface: vegetation, soil, dust. The zone the old
       * single `film` colour corresponds to, and the alias target. */
      frostLand:    { hueOffset:   0, sat: [0.48, 0.90],
                      val: [0.38, 0.50],
                      depth: 0.34, smooth: 0.45, bleed: 0.95,
                      patch: 0.85, grain: 0.30 },
      /* Shelf and shoreline — reefs, algal mats, bright shallow water
       * sediment. Offset furthest, because a coast that differs clearly
       * from the land above it is what makes the zones legible. */
      frostShallow: { hueOffset: -52, sat: [0.55, 0.95],
                      val: [0.48, 0.60], aquatic: true,
                      depth: 0.26, smooth: 0.35, bleed: 0.70,
                      patch: 0.95, grain: 0.45 },
      /* The abyssal floor: ooze and deep sediment. Darker and duller —
       * it is the one zone that is mostly seen THROUGH the sea, which
       * darkens whatever is under it. */
      frostDeep:    { hueOffset: -84, sat: [0.35, 0.70],
                      val: [0.26, 0.38], aquatic: true,
                      depth: 0.40, smooth: 0.92, bleed: 0.30,
                      patch: 0.30, grain: 0.08 }
    }
  };

  var TIDAL_LOCK = {
    /* Which settings key drives it, and which aims it. `facing` is rolled
     * per body when the user has not set it, so every locked world is not
     * oriented identically. */
    param: "tidalLock",
    facing: "tidalFacing",
    dial: "Tidal locking",

    field: {
      id: "tidal-lock",
      axis: "equatorial",
      anchor: ["atmosphere", "ocean", "crust", "surface"],
      /* How much reaches layers below the anchor list. Low: a locked
       * world's asymmetry is a surface phenomenon, and letting it into the
       * mantle made the largest band on the disc carry the terminator. */
      residue: 0.06,
      blend: 0.25,

      /* THE THREE FACES. Every figure is a DELTA or a MULTIPLIER against
       * whatever the body already rolled — never an absolute value, which
       * is what makes one recipe work on any world.
       *
       *   relief  terrain amplitude. A baked dayside is smoother.
       *   sea     SIGNED sea-level offset, in units of the terrain's own
       *           range — the same units film.js's SNOWLINE and SHELF use.
       *           This is the centre of the whole feature: sea level is
       *           what every downstream system measures elevation against,
       *           so moving it by angle pinches the ocean AND drops the
       *           snowline AND moves the shore, with no new drawing code.
       *   air     atmosphere thickness multiplier.
       *
       * -1.25 on the hot face puts sea level below every trough, so the
       * ocean is genuinely absent there rather than thin. +0.34 on the
       * cold face bulges the night sea, which is where water actually
       * migrates on a locked world — a cold trap. */
      /* `snow` MOVES THE SNOWLINE, and it is deliberately separate from
       * `sea`.
       *
       * Conflating the two was a real bug: lowering sea level on the hot
       * face makes the terrain read as *high* ground, and high ground is
       * where snow goes — so the baked dayside came out snowcapped. They
       * are different ideas. Sea level says where the water is; the
       * snowline says how cold it has to be before deposition turns
       * white, and on a locked world that is a property of the FACE, not
       * of the elevation.
       *
       * Signed, in the same terrain-range units as `sea`: negative drags
       * the snowline down (snow reaches sea level and below — an ice cap),
       * positive pushes it up out of reach. */
      /* FOUR ZONES: hot, twilight, cold, twilight. Two twilight bands
       * ensure the terminator is symmetric — without a second one, the
       * hot and cold faces abutted directly on one side, producing an
       * unexplained asymmetric depression in the ocean. Both twilight
       * zones flex together via `resolveArcs`. */
      zones: [
        /* `air` IS A SCALE HEIGHT, NOT A GAS BUDGET.
         *
         * These read 1.30 / 1.00 / 0.45 — thickest over the heated face,
         * collapsing toward the night — because a hot atmosphere is a
         * TALLER one: warm gas expands and the column puffs up, while the
         * cold face is where it contracts and freezes out. That is what
         * makes a locked world's air egg-shaped, bulging toward its star.
         *
         * The first version had 0.55 / 1.00 / 0.40, reasoning that the
         * dayside is "stripped". Escape does thin the air over geological
         * time, but it is not what a cross-section shows: with both
         * extremes below the twilight band the silhouette bulged at the
         * TERMINATOR and pinched at both poles of the axis — a peanut,
         * which is neither what the physics gives nor what the feature is
         * for. It only became visible once the geometry started reading
         * these numbers; while the renderer drew a circle regardless, the
         * values could be wrong without showing. */
        /* `temp` IS THE FIELD THAT SAYS WHAT THE MATERIAL IS.
         *
         * Signed, in the same 0..1 space the body's own climate uses, so
         * it PERTURBS rather than replaces: a hot world's night face is
         * milder than a cold world's, and neither becomes the other. It is
         * what lets the frosting paint a night cap as actual ice instead
         * of in whatever hue the global family happened to roll — the gap
         * that made a 100% locked world read as bare-vs-covered rather
         * than scorched-vs-frozen. */
        { id: "hot", label: "Dayside",
          arc: 140, relief: 0.55, sea: -0.85, air: 1.30,
          snow: +2.20, temp: +0.42,
          colorShift: { hue: -10, sat: +0.10, val: +0.10 },
          cover: 0.10 },

        { id: "twilight", label: "Twilight Band",
          flex: true, arc: 40, arcOpen: 170,
          relief: 1.00, sea: 0.00, air: 1.00, snow: 0.00,
          temp: 0.00,
          colorShift: { hue: +2, sat: +0.03, val: +0.01 },
          cover: 1.35 },

        { id: "cold", label: "Nightside",
          arc: 140, relief: 1.25, sea: +0.22, air: 0.45,
          snow: -1.10, temp: -0.40,
          colorShift: { hue: +8, sat: -0.06, val: -0.10 },
          cover: 1.30 },

        { id: "twilight", label: "Twilight Band",
          flex: true, arc: 40, arcOpen: 170,
          relief: 1.00, sea: 0.00, air: 1.00, snow: 0.00,
          temp: 0.00,
          colorShift: { hue: +2, sat: +0.03, val: +0.01 },
          cover: 1.35 }
      ]
    }
  };

  return {
    FILM: FILM,
    TIDAL_LOCK: TIDAL_LOCK
  };
})();
