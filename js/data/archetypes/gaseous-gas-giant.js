/* The gas giant. See gaseous-common.js for the family's header and what it
 * shares with the ice giant, which must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var cloudDeck = CC.GaseousCommon.cloudDeck;
  var FLOOR_FROSTING = CC.GaseousCommon.FLOOR_FROSTING;
  var tidalLocking = CC.GaseousCommon.tidalLocking;

  /* ------------------------------------------------------------------ *
   * gas-giant
   * ------------------------------------------------------------------ */

  var GAS_GIANT = {
    id: "gas-giant",
    label: "Gas giant",
    family: "gaseous",
    /* `has-atmosphere` is what gates the atmospheric trait pool; `gaseous`
     * and `banded` gate the rest. No trait names an archetype id. */
    tags: ["gaseous", "has-atmosphere", "banded", "no-surface",
           "structured-rings", "orbit-debris"],
    /* THE CARD IS WRITTEN IN A DIFFERENT MINDSET, not merely with different
     * rows: no surface, no landing, depth instead of area. See
     * js/gen/stats/gaseous.js. */
    statTemplate: "gaseous",

    radiusKm: [45000, 95000],

    /* THE RADIUS AT WHICH THIS FAMILY'S ORDINARY DENSITY GIVES 1 g — the
     * calibration constant for the Gravity line. See gravityOf in
     * js/gen/stats/registry.js for why it cannot be one number shared across
     * families, let alone across the whole generator: a giant is ten times
     * Earth's radius and a tenth of its density, and only a per-archetype
     * scale keeps the printed figure inside the spec's 0.9-6 g band. */
    gravityScale: 41000,

    stack: [
      {
        role: "upper-cloud",
        /* THE OUTERMOST BOUNDARY IS A CIRCLE DRAWN SOFTLY. There is no solid
         * surface, and the silhouette has to suggest that — so `soft-gradient`
         * rather than `perfect`, which is the same boundary character the
         * planet's atmosphere uses and costs no new drawing code. */
        /* THE CIRRUS DECK FADES OUT INSTEAD OF STOPPING.
         *
         * It was an ordinary banded layer, and it drew as one: a solid,
         * near-opaque white ring with a hard outer edge, which is wrong twice
         * over. There is no surface here — the whole point of the family is
         * that the body has no boundary you could stand on — so a crisp rim is
         * the one thing the silhouette must not have. And a cloud deck
         * genuinely thins into vacuum rather than ending.
         *
         * `outward: true` hands it to the same radial-falloff path the
         * planet's atmosphere uses (draw/layers.js `falloffAlpha`): it holds
         * most of its opacity through the inner third and does nearly all its
         * fading in the outer, so it still reads as a substantial deck while
         * dissolving into the background at its edge. No new drawing code —
         * the mechanism was already there, this layer simply was not asking
         * for it.
         *
         * ITS ORIGINAL THICKNESS, NOT A THICKER ONE. The first version of this
         * change doubled the depth to compensate for the apparent size a
         * fading layer loses — and that was solving the wrong problem twice
         * over. It pushed the troposphere inward, which rescaled every
         * `sizeRel` storm anchored to it (D75 yet again), and it made the deck
         * a wide soft halo when what it should be is a DENSE skin that stops
         * being opaque at its edge.
         *
         * Density comes from the falloff CURVE instead — `hold` carries the
         * inner part at near-full opacity and the taper does its work late.
         * See `cloudHold` below. */
        frac: { over: "surface", depth: [0.028, 0.052] },
        boundary: "soft-gradient",
        outward: true,
        /* DENSE FOR MOST OF ITS DEPTH, then a late ease-out. The default 0.30
         * is tuned for a planet's thin atmosphere, which should dissolve
         * early; a cirrus deck is a skin with real substance to it and should
         * only go transparent at its outer edge. */
        fadeHold: 0.62
      },
      {
        role: "troposphere",
        /* The banded zone, and the layer the eye spends its time on. The
         * OUTERMOST REAL LAYER — the cirrus deck floats above it as a fading
         * halo — so it runs to the body's edge and the banding is what defines
         * the silhouette. Which is right: a gas giant is recognised by its
         * bands, not by its haze.
         *
         * Its thickness is also what every `sizeRel` storm is measured
         * against, so this range and the storm sizes in
         * js/data/traits/gaseous-weather.js move together. */
        /* A NARROW RANGE ON PURPOSE. Its thickness is what every `sizeRel`
         * storm is measured against, so a range that can roll 0.07 or 0.27
         * means the same authored storm size draws four times larger on one
         * body than another. Tightening the range is what makes a proportion
         * of it mean something stable. */
        frac: [0.870, 0.930],
        boundary: "perfect"
      },
      {
        role: "water-cloud",
        /* Guaranteed at the middle of the Optional layers slider, as the spec
         * asks: `presence: 2.0` is a 200% roll at max, so it survives well
         * below halfway.
         *
         * NARROWED, because it was eating the middle of the picture. At
         * 0.660-0.775 against a molecular-h floor of 0.400 it could roll 30%
         * of the radius as one dim, near-featureless band — the layer with
         * the least to show taking the largest share of the disc. The
         * compressed envelope beneath it is the one that should be reading as
         * "this goes down a very long way". */
        frac: [0.690, 0.790],
        presence: 2.0,
        boundary: "slight"
      },
      {
        role: "molecular-h",
        /* THE BULK, AND THE POINT. Compressed hydrogen from just under the
         * clouds down to nearly the dynamo — a third of the radius in one
         * band, which is what makes "how far down can you get" the story. */
        frac: [0.430, 0.660],
        boundary: "slight",
        /* A hotter interior puffs the envelope: the metallic transition is
         * pushed deeper as the body's own heat rises. */
        modulate: [
          { param: "interiorHeat", amount: -0.05 }
        ]
      },
      {
        role: "metallic-h",
        frac: [0.180, 0.360],
        boundary: "near-perfect",
        bias: "coreBias"
      },
      {
        /* `rock-core`, NOT `core` — and the distinction is material, not
         * cosmetic. A planet's `core` is iron: incandescent, smooth, and
         * carrying no terrain, because there is no surface down there in any
         * sense. A giant's heart is ROCK AND ICE with a real floor on it, and
         * that floor is what the frosting stage deposits crushed sediment on
         * (D22). A role is the generator's word for "what this material is",
         * so two different materials get two names and the planet's core
         * keeps its own behaviour untouched. */
        role: "rock-core",
        /* THE TINY DENSE HEART. The size contrast with the envelope is the
         * story (gaseous-bodies.md), so this stays small at every setting.
         *
         * CORE SIZE BIAS DOES ONE EXTRA THING HERE, and it is the reason
         * `oversized-core` and `coreless` were cut as traits rather than
         * ported: at the low end the boundary character softens, because a
         * coreless giant has no discrete core to draw an edge around. That is
         * `boundarySoftens` below — a general layer property, not a gas-giant
         * branch, and gen/structure-resolve.js resolves it for any layer that
         * declares one. */
        frac: [0.070, 0.155],
        boundary: "near-perfect",
        boundarySoftens: { param: "coreBias", below: 0.35, to: "soft-gradient" },
        bias: "coreBias",
        /* The floor is rock and ice, and it carries a terrain field — which
         * is what gives the frosting stage something to deposit on. Small,
         * because a giant's floor is a smooth crushed thing, not a mountain
         * range; and mostly occluded anyway. */
        relief: 0.10
      }
    ],

    axes: tidalLocking(),

    /* See the header for why 0.12 and not 0 or 1. */
    climate: {
      latitude: 0.12
    },

    colorProfile: {
      /* Hue free — a giant may be ochre, blue, green or violet. */
      hue: [0, 360],
      /* Gas giants read better with a harmonious hue family than a hard
       * complement (gaseous-bodies.md): adjacent bands have to separate, and
       * a complement between the envelope and the interior would make the
       * body look like two different objects stacked. */
      secondaryRel: "analogous",
      order: ["upper-cloud", "troposphere", "water-cloud", "molecular-h",
              "metallic-h", "rock-core"],
      layers: {
        /* Pale ammonia cirrus, cold and bright. `climateLean` gives it its
         * cold and hot destinations — see cloudDeck above. */
        "upper-cloud":  { sat: [0.20, 0.55], val: [0.65, 0.90],
                          climateLean: cloudDeck([38, 56], [14, 32]) },
        /* THE BANDED LAYER, and the strongest climate response in the body.
         *
         * `bandContrast` is read by gen/palette-layer.js and published on the
         * colour so the alternating zone/belt bands separate by an authored
         * amount rather than by whatever `tone` happens to give. A cold giant
         * bands hard; a hot one's bands wash out as the deck sinks, which is
         * the visible half of the cloud-species story. */
        troposphere:    { sat: [0.35, 0.75], val: [0.45, 0.80],
                          climateLean: cloudDeck([40, 58], [10, 28]),
                          bandContrast: 1.35,
                          depthGradient: 0.42 },
        /* Convective water cloud, one deck down. Reads the same field but
         * travels less: it is already below the visible surface. */
        "water-cloud":  { sat: [0.30, 0.60], val: [0.35, 0.60],
                          climateLean: {
                            chill:  { hue: [188, 214], amount: 0.35,
                                      sat: -0.30, val: +0.14 },
                            scorch: { hue: [8, 26], amount: 0.40,
                                      sat: +0.22, val: -0.18 }
                          },
                          depthGradient: 0.55 },
        /* Compressed hydrogen, warming with depth. The depth gradient is
         * what says "this goes down a long way" without a single label. */
        "molecular-h":  { sat: [0.40, 0.70], val: [0.30, 0.55],
                          heatLean: { hue: [4, 30], amount: 0.45 },
                          heatGradient: 0.72,
                          depthGradient: 0.70 },
        /* THE DYNAMO. Self-lit, like the planet's outer core and for the same
         * reason: liquid metallic hydrogen is a conductor at thousands of
         * kelvin and the glow IS the material. Its hue is anchored rather
         * than derived so a blue giant still has a hot interior. */
        "metallic-h":   { sat: [0.30, 0.60], val: [0.45, 0.75],
                          hue: [18, 48], hueLean: 0.22, incandescent: true,
                          heatLean: { hue: [26, 52], amount: 0.34 },
                          heatGradient: 0.80 },
        /* HOT, BUT NOT AS HOT AS A PLANET'S IRON CORE. It glows — a giant's
         * heart is at thousands of kelvin under crushing pressure — but it is
         * rock and ice rather than molten metal, so its value range starts
         * lower and it does not reach the near-white a planet's inner core
         * does. That contrast is what keeps the metallic-hydrogen layer above
         * it reading as the brighter, more energetic one. */
        "rock-core":    { sat: [0.55, 0.85], val: [0.62, 0.88],
                          hue: [24, 52], hueLean: 0.16, incandescent: true,
                          heatLean: { hue: [40, 60], amount: 0.22,
                                      ceiling: false },
                          heatGradient: 0.86 },
        /* The buried floor's sediment. See FLOOR_FROSTING. */
        film: FLOOR_FROSTING
      }
    }
  };

  CC.Archetypes.register(GAS_GIANT);
})();
