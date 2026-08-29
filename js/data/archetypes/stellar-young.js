/* `young-star` — newly ignited, energetic, unstable.
 *
 * STRUCTURALLY INVERTED, and that is the reason this body is worth drawing
 * beside a main-sequence star: a CONVECTIVE core under a RADIATIVE envelope,
 * the opposite of the Sun's arrangement. See the two mark vocabularies in
 * js/data/elements/stellar.js — the inversion is only legible because the two
 * zones are drawn in entirely different marks (D115).
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
   * young-star
   *
   * Newly ignited, energetic, unstable. Vivid throughout, and structurally
   * INVERTED: a convective core under a radiative envelope, which is the
   * opposite of the main-sequence arrangement and is the reason this body is
   * worth drawing beside one.
   * ------------------------------------------------------------------ */

  var YOUNG_STAR = {
    id: "young-star",
    label: "Young star",
    family: "stellar",
    /* `stellar` and `luminous` are the spec's body tags; `has-corona` and
     * `convective-core` gate traits without any trait naming an archetype.
     * `no-surface` is shared with the gaseous family and means the same thing:
     * there is nothing here you could stand on, so the surface traits and the
     * surface stat lines are simply not offered. */
    tags: ["stellar", "luminous", "no-surface", "has-corona", "has-chromosphere",
           "convective-core", "young"],
    statTemplate: "stellar",

    /* The spec's 400,000-1,500,000 km. An order of magnitude above the gas
     * giants, which is the reason every calibration constant downstream had to
     * be re-measured rather than reused — see `gravityScale` below and D75. */
    radiusKm: [400000, 1500000],

    /* THE RADIUS AT WHICH THIS FAMILY'S DENSITY GIVES 1 g, re-measured for
     * this radius range rather than borrowed (D75, and it is the fourth time
     * that trap has been walked into in this project).
     *
     * A star's surface gravity is genuinely enormous — the Sun is 28 g — and
     * the shared `gravityOf` clamps at 6. Rather than print a constant
     * pinned against the clamp, which carries no information, the stellar stat
     * template does NOT use `gravityOf` at all: it asks a star's question
     * instead (see js/gen/stats/stellar.js). This figure is retained only so
     * that anything generically walking the archetypes gets a sane number, and
     * is calibrated so an ordinary main star lands near the top of the scale
     * rather than beyond it. */
    gravityScale: 260000,

    stack: [
      /* Hot, diffuse, and reaching a long way out. A young star's corona is
       * the most extended of the four. */
      /* THE MOST VIOLENT LIMB OF THE FOUR. Newly ignited and unstable, so
       * both outer edges heave near the top of the family's range. The floor
       * is above the other stars' floors as well: even a quiet young star is
       * not a calm object. */
      corona([0.20, 0.35], 0.18, { base: 0.18, peak: 0.55,
                                   driver: "starActivity" },
             /* THE MOST VIOLENT LIMB. Half again the plumes of a main star
              * and noticeably taller ones — this is the body that should look
              * like it is coming apart at the edges. */
             { plume: { count: 1.55, size: 1.30 } }),
      chromosphere([0.975, 1.005], { base: 0.16, peak: 0.50,
                                     driver: "starActivity" }),
      {
        role: "photosphere",
        /* THE VISIBLE SURFACE, and the layer granulation lives on. Thin —
         * it is a skin over the interior, and the interior is the story. */
        frac: [0.905, 0.965],
        boundary: "slight",
        /* See THIN LAYERS NEED CAPS. Uncapped this rolled 0.354 thick. */
        maxThickness: 0.075,
        /* A TAUT, FURIOUS SURFACE. Darkened toward the limb like every other
         * emitting layer, but the least of the four: a young star is the
         * hottest and least diffuse thing here, and heavy limb darkening
         * reads as tiredness, which is the old giant's job. */
        limbDarkening: LIMB.surface * 0.92
      },
      {
        role: "radiative",
        /* THE ENVELOPE, and on this body it is the RADIATIVE one — the
         * inversion. Nearly half the radius of still, dense medium with
         * photons crawling through it, which is exactly the visual foil the
         * convective core beneath it needs. */
        frac: [0.400, 0.885],
        boundary: "slight",
        /* THE FALLOFF CONTINUES UNDER THE SKIN. Without this the whole curve
         * lives in the photosphere's few percent and reads as an outline. */
        limbDarkening: LIMB.interior
      },
      {
        role: "convective-core",
        /* CONVECTION AT THE CENTRE. A distinct role from `convective` because
         * it is a distinct THING: a convective core is a churning heart inside
         * a still envelope, and a convective envelope is a churning shell
         * around a still heart. Same physics, opposite arrangement, and giving
         * them one role name would have made the element table unable to size
         * the cells differently for the two cases — which is most of what
         * makes the inversion legible. */
        frac: [0.150, 0.380],
        boundary: "irregular",
        bias: "coreBias"
      },
      {
        role: "fusion-core",
        /* WHERE THE HYDROGEN IS ACTUALLY BURNING. Small and near-white. */
        frac: [0.060, 0.140],
        boundary: "near-perfect",
        bias: "coreBias"
      }
    ],

    /* THE HOTTEST OF THE FOUR. 3,000-12,000 C, and a young star at the top of
     * its range is the hottest thing this generator draws that is not a
     * compact object. */
    /* THE MOST RADIANT OF THE FOUR. Newly ignited and pouring energy into the
     * space around it — the halo reaches furthest and the heat veins are both
     * numerous and long. */
    emissiveGlow: {
      reach: 1.62,
      strength: 1.15,
      veins: { count: 130, length: [0.30, 1.00], alpha: 0.26, lean: 0.40 }
    },
    /* A CLOSE COMPANION PULLING ON THE ENVELOPE. Declared by all four
     * archetypes from one shared recipe — see stellar-common.js. It reuses
     * the tidal-locking slider and renames the dial rather than adding a
     * second control for the same idea (D27). */
    axes: binaryCompanion(SWELL.young),

    climate: stellarClimate(0.70),

    colorProfile: {
      /* Hot and young: the blue-white end of the table, widened generously
       * because the spec says hue is free and a green or violet star is fine
       * in this generator. */
      /* Hot and young: the blue-white end of the table. Padded modestly —
       * see hueFromStars for why the first version's 70 was far too much. */
      hue: hueFromStars("sunlike", "blue-giant", 26),
      /* A star is ONE object at one temperature — analogous keeps the whole
       * body inside one family of colour, which is what stops a cutaway
       * looking like two objects stacked. The interior's departure from the
       * envelope is carried by VALUE, which is the spec's own rule: what
       * distinguishes star types is saturation and lightness, not hue. */
      secondaryRel: "analogous",
      order: ["corona", "chromosphere", "photosphere", "radiative",
              "convective-core", "fusion-core"],
      layers: {
        /* STRONG SATURATION, HIGH BRIGHTNESS THROUGHOUT — the young star's
         * defining colour character. Vivid and energetic; nothing here is
         * allowed to look tired. */
        corona:             lit({ sat: [0.45, 0.80], val: [0.55, 0.80] }),
        chromosphere:       lit({ sat: [0.60, 0.90], val: [0.70, 0.90] }),
        photosphere:        lit({ sat: [0.55, 0.85], val: [0.80, 1.00],
                                  /* A hotter interior brightens the surface it
                                   * has to push its heat through. */
                                  heatLean: { hue: [40, 62], amount: 0.20,
                                              ceiling: false } }),
        radiative:          lit({ sat: [0.55, 0.85], val: [0.65, 0.85],
                                  /* Brightening inward is the whole diagram:
                                   * the heat is coming from below. */
                                  depthGradient: 0.55,
                                  heatGradient: 0.70 }),
        "convective-core":  lit({ sat: [0.60, 0.90], val: [0.70, 0.90],
                                  heatGradient: 0.80 }),
        /* NEARLY WHITE REGARDLESS OF HUE — the spec's note, and it is what
         * reads as "hot". Low saturation at maximum value is white with a
         * cast, which is exactly right for a fusing core. */
        "fusion-core":      lit({ sat: [0.25, 0.55], val: [0.95, 1.00],
                                  hueLean: 0.30,
                                  heatGradient: 0.90 })
      }
    }
  };

  CC.Archetypes.register(YOUNG_STAR);
})();
