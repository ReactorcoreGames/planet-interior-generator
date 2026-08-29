/* `main-star` — the reference case.
 *
 * Radiative core, convective envelope, and a TACHOCLINE between them: the thin
 * shear layer where the dynamo lives, and the piece of specificity that makes
 * this body worth drawing rather than being a duller young star.
 *
 * The tachocline carries the tightest `maxThickness` in the generator and it
 * earns it — see the note on the layer, and D118.
 *
 * js/data/archetypes/stellar-common.js must load before this file. */
var CC = CC || {};

(function () {
  "use strict";

  var C = CC.StellarCommon;
  var stellarClimate = C.climate, hueFromStars = C.hueFromStars;
  var corona = C.corona, chromosphere = C.chromosphere, lit = C.lit;
  var LIMB = C.LIMB, binaryCompanion = C.binaryCompanion, SWELL = C.SWELL;

  /* ------------------------------------------------------------------ *
   * main-star
   *
   * The reference case. Radiative core, convective envelope, and a tachocline
   * between them — the thin shear layer where the dynamo lives, and the piece
   * of specificity that makes this body worth drawing rather than being a
   * duller young star.
   * ------------------------------------------------------------------ */

  var MAIN_STAR = {
    id: "main-star",
    label: "Main sequence star",
    family: "stellar",
    tags: ["stellar", "luminous", "no-surface", "has-corona", "has-chromosphere",
           "convective-envelope", "main-sequence"],
    statTemplate: "stellar",

    radiusKm: [500000, 1000000],
    gravityScale: 230000,

    stack: [
      /* THE REFERENCE LIMB. Active but orderly — the other three are read
       * against these two figures, and the user's calibration (10% at the
       * calm end, 50% of the layer's own thickness at the violent one) lands
       * closest to unaltered here. */
      corona([0.14, 0.26], 0.22, { base: 0.12, peak: 0.44,
                                   driver: "starActivity" },
             /* THE REFERENCE. The recipe's own figures, unaltered — the other
              * three are multiples of this. */
             { plume: { count: 1.0, size: 1.0 } }),
      chromosphere([0.978, 1.008], { base: 0.12, peak: 0.42,
                                     driver: "starActivity" }),
      {
        role: "photosphere",
        frac: [0.920, 0.968],
        boundary: "slight",
        /* THE REFERENCE FIGURE. The other three are read against this one. */
        limbDarkening: LIMB.surface,
        /* See THIN LAYERS NEED CAPS. */
        maxThickness: 0.062
      },
      {
        role: "convective",
        /* THE OUTER CONVECTION ZONE — the arrangement that makes this body the
         * young star's mirror. A quarter of the radius of visible cells with
         * flow loops in them, sitting directly on the still radiative
         * interior. Adjacent, and drawn in two different vocabularies: that
         * adjacency is the single most readable thing in the family. */
        frac: [0.650, 0.905],
        boundary: "irregular",
        limbDarkening: LIMB.interior
      },
      {
        role: "tachocline",
        /* THE SHEAR LAYER — a hairline, and deliberately so. It is where the
         * convective envelope's rotation grinds against the radiative
         * interior's, and it is where the magnetic field is generated, which
         * makes it the origin of everything `starActivity` drives elsewhere on
         * the body. A nice piece of specificity, and small enough that finding
         * one is a reward rather than furniture. */
        frac: [0.600, 0.640],
        /* 70% at the top of the Optional layers slider, as the spec asks. */
        presence: 0.7,
        boundary: "slight",
        /* THE TIGHTEST CAP IN THE GENERATOR, and it earns it. Uncapped, this
         * rolled 0.348 thick — the hairline shear layer came out as the
         * LARGEST layer in the body, because the radiative zone's ceiling sits
         * a long way below its floor and it absorbed the entire gap. A
         * tachocline that is a third of the star is not a nice piece of
         * specificity, it is a mistake in the diagram. */
        maxThickness: 0.045
      },
      {
        role: "radiative",
        /* The still interior. Large, because the diagram wants the two
         * transport regimes at comparable scale so neither is a detail. */
        frac: [0.180, 0.590],
        boundary: "slight"
      },
      {
        role: "fusion-core",
        frac: [0.080, 0.170],
        boundary: "near-perfect",
        bias: "coreBias"
      }
    ],

    /* 3,500-8,000 C — the reference case, and a step below the young star. */
    /* THE REFERENCE GLOW. Active but orderly: a real halo, with structure in
     * it, that does not announce itself. The other three are read against
     * these figures. */
    emissiveGlow: {
      reach: 1.52,
      strength: 1.0,
      veins: { count: 96, length: [0.26, 0.82], alpha: 0.22, lean: 0.34 }
    },
    /* A CLOSE COMPANION PULLING ON THE ENVELOPE. Declared by all four
     * archetypes from one shared recipe — see stellar-common.js. It reuses
     * the tidal-locking slider and renames the dial rather than adding a
     * second control for the same idea (D27). */
    axes: binaryCompanion(SWELL.main),

    climate: stellarClimate(0.62),

    colorProfile: {
      /* THE WHOLE TABLE'S RANGE. A main-sequence star is the one that can
       * genuinely be any of the five rows in data/stars.js — that is what
       * "main sequence" means — so its band spans from the red dwarf to the
       * blue giant and out past both. */
      /* THE WHOLE TABLE'S RANGE, red dwarf through blue giant, because a
       * main-sequence star genuinely can be any of the five rows — that is
       * what "main sequence" means. Barely padded: this band is already the
       * widest in the family at over two hundred degrees, and widening it
       * further was what made these stop reading as stars at all. */
      hue: hueFromStars("red-dwarf", "blue-giant", 14),
      secondaryRel: "analogous",
      order: ["corona", "chromosphere", "photosphere", "convective",
              "tachocline", "radiative", "fusion-core"],
      layers: {
        /* BALANCED SATURATION, HIGH BRIGHTNESS — stable and clean, against the
         * young star's vivid and the old giant's tired. The numbers sit a step
         * below the young star's at every layer, which is the entire
         * difference between the two colour characters. */
        corona:         lit({ sat: [0.35, 0.65], val: [0.55, 0.80] }),
        chromosphere:   lit({ sat: [0.50, 0.80], val: [0.70, 0.90] }),
        photosphere:    lit({ sat: [0.45, 0.75], val: [0.82, 1.00],
                              heatLean: { hue: [40, 62], amount: 0.18,
                                          ceiling: false } }),
        convective:     lit({ sat: [0.50, 0.80], val: [0.70, 0.90],
                              heatGradient: 0.62 }),
        /* THE TACHOCLINE IS BRIGHTER THAN BOTH ITS NEIGHBOURS, because a thin
         * layer that is merely a different colour reads as a mistake in the
         * gradient. Brighter reads as a line drawn on purpose — which it is:
         * this is the one place in the body where two rotation regimes meet
         * and the diagram should point at it. */
        tachocline:     lit({ sat: [0.30, 0.60], val: [0.92, 1.00],
                              hueLean: 0.24 }),
        radiative:      lit({ sat: [0.45, 0.75], val: [0.60, 0.80],
                              depthGradient: 0.58,
                              heatGradient: 0.72 }),
        "fusion-core":  lit({ sat: [0.20, 0.50], val: [0.95, 1.00],
                              hueLean: 0.30,
                              heatGradient: 0.90 })
      }
    }
  };

  CC.Archetypes.register(MAIN_STAR);
})();
