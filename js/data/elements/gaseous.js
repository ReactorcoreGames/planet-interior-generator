/* Gaseous bodies — detail recipes for `gas-giant` and `ice-giant`.
 *
 * See js/data/elements/registry.js for what every field means, and
 * docs/celestials/gaseous-bodies.md for the spec these implement.
 *
 * NO NEW PRIMITIVES. Banding is `gradient-band` with `alternate`; the
 * counter-rotating jets are `arrow` and `flow-line` with `zonal`; everything
 * else is the existing speckle/arc/cell/blob vocabulary at gaseous
 * proportions. That was the point of Phase 5 — see
 * js/data/archetypes/gaseous.js.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  var grain = CC.Elements.grain;

  CC.Elements.register({
    /* DENSITY IS THE THESIS AND THE ENVELOPE IS ENORMOUS. These layers are
     * several times the thickness of a planet's crust, so the counts run well
     * above the figures in the spec table — a count that reads as dense in a
     * thin band disappears in one this size. The same correction the solid
     * counts already carry, for the same reason. */

    /* ---------------------------------------------------------------- */
    /* The visible "surface" — high ammonia or methane cirrus. Thin, bright,
     * and mostly streaks: this is the layer the eye reads the silhouette
     * from, so it wants texture rather than structure. */
    "upper-cloud": {
      elements: [
        {
          kind: "arc-band",
          count: [90, 320],
          tiers: 3,
          size: [0.006, 0.016],
          depth: [0.05, 0.95],
          alpha: [0.24, 0.58],
          arc: [30, 165],
          tone: "lighter"
        },
        /* A couple of wide, very faint concentric hazes, so the cirrus deck
         * reads as having a top and a bottom. */
        {
          kind: "gradient-band",
          count: [3, 7],
          tiers: 1,
          bandWidth: [0.18, 0.42],
          depth: [0.10, 0.90],
          alpha: [0.14, 0.30],
          arc: [360, 360],
          tone: "lighter"
        },
        grain(320, 1180, [0.006, 0.013])
      ]
    },

    /* ---------------------------------------------------------------- */
    /* THE BANDED ZONE — the signature of the whole family.
     *
     * Alternating light zones and dark belts, with counter-rotating jets
     * between them and storm curls riding the shear. Three size tiers on the
     * curls and the streaks, per CLAUDE.md: more and fainter beats fewer and
     * bolder. */
    troposphere: {
      elements: [
        /* The bands themselves. Many, narrow, alternating — a giant reads as
         * a giant because of how MANY of these there are. */
        {
          kind: "gradient-band",
          count: [14, 30],
          tiers: 1,
          /* A FRACTION OF THE SPACING, not of the layer — see buildBands.
           * Just under 1, so consecutive bands very nearly touch and the
           * alternation reads as a continuous light/dark ripple, with a
           * hairline of the layer's own colour between them keeping the
           * ripple from blurring into a wash. */
          bandWidth: [0.72, 0.96],
          depth: [0.02, 0.98],
          alpha: [0.45, 0.85],
          arc: [360, 360],
          alternate: ["lighter", "darker"]
        },
        /* A WIDE UNDERLAY, NOT A SECOND COMB.
         *
         * The first attempt at "a few dominant belts and many minor ones" was
         * a second alternating set across the same radii, and the two
         * cancelled: light from one landed on dark from the other and the
         * banding read as an even wash. Fifty-three bands were generated and
         * none of them was visible.
         *
         * A comb needs to be ONE comb. The coarse structure is now a small
         * number of wide bands at low alpha UNDER the fine one, alternating in
         * the same direction so they reinforce it — a handful of broad
         * regional belts with the fine banding riding on top, which is what a
         * giant actually looks like. */
        {
          kind: "gradient-band",
          count: [4, 9],
          tiers: 1,
          /* The broad regional belts. Wider than their own spacing, so they
           * overlap into a slow swell under the fine comb rather than reading
           * as a second set of stripes. */
          bandWidth: [1.10, 1.60],
          depth: [0.05, 0.95],
          alpha: [0.16, 0.34],
          arc: [360, 360],
          alternate: ["lighter", "darker"]
        },
        /* COUNTER-ROTATING JETS. `zonal` turns the arrow's motion tangential
         * and `bands` flips its direction between adjacent belts, so the
         * arrows shear against each other across the picture — the
         * "instructive illustration" idea, drawn. */
        {
          kind: "arrow",
          count: [46, 128],
          tiers: 2,
          size: [0.085, 0.150],
          depth: [0.04, 0.96],
          alpha: [0.55, 0.95],
          zonal: [0.34, 0.62],
          bands: 7,
          flow: true,
          tone: "lighter"
        },
        /* Storm curls: closed circulation riding the shear between belts. */
        {
          kind: "cell",
          count: [40, 120],
          tiers: 3,
          size: [0.055, 0.110],
          depth: [0.08, 0.92],
          alpha: [0.34, 0.72],
          flow: true,
          tone: "lighter"
        },
        /* Turbulence along the band edges. */
        {
          kind: "flow-line",
          count: [110, 340],
          tiers: 3,
          size: [0.070, 0.150],
          depth: [0.04, 0.96],
          alpha: [0.30, 0.66],
          zonal: [0.40, 0.80],
          bands: 7,
          flow: true,
          tone: "lighter"
        },
        grain(560, 2180, [0.007, 0.015])
      ]
    },

    /* ---------------------------------------------------------------- */
    /* Convective, lightning-active water cloud. Cells and glints, and the
     * one layer in the family that gets bright points. */
    "water-cloud": {
      elements: [
        {
          kind: "cell",
          count: [58, 165],
          tiers: 3,
          size: [0.075, 0.140],
          depth: [0.06, 0.94],
          alpha: [0.36, 0.75],
          flow: true,
          tone: "lighter"
        },
        /* Lightning glints — small, bright, sparse in the largest tier and
         * numerous in the smallest, so the layer twinkles rather than
         * speckles. */
        {
          kind: "blob",
          count: [90, 320],
          tiers: 3,
          size: [0.006, 0.017],
          depth: [0.08, 0.92],
          alpha: [0.42, 0.90],
          tone: "glow"
        },
        {
          kind: "flow-line",
          count: [70, 210],
          tiers: 2,
          size: [0.060, 0.125],
          depth: [0.06, 0.94],
          alpha: [0.28, 0.60],
          flow: true,
          tone: "lighter"
        },
        grain(420, 1680, [0.008, 0.016])
      ]
    },

    /* ---------------------------------------------------------------- */
    /* Compressed molecular hydrogen — the bulk of a gas giant, and the layer
     * that has to carry "this goes down a very long way". Pressure striations
     * plus slow flow, no structure of its own. */
    "molecular-h": {
      elements: [
        /* Pressure gradient: many faint concentric shells. What sells depth. */
        {
          kind: "gradient-band",
          count: [10, 24],
          tiers: 1,
          bandWidth: [0.70, 1.05],
          depth: [0.03, 0.97],
          alpha: [0.18, 0.40],
          arc: [360, 360],
          alternate: ["lighter", "darker"]
        },
        {
          kind: "arrow",
          count: [34, 96],
          tiers: 2,
          size: [0.090, 0.165],
          depth: [0.08, 0.92],
          alpha: [0.44, 0.86],
          zonal: [0.20, 0.44],
          bands: 4,
          flow: true,
          tone: "lighter"
        },
        {
          kind: "flow-line",
          count: [96, 300],
          tiers: 3,
          size: [0.080, 0.170],
          depth: [0.05, 0.95],
          alpha: [0.30, 0.64],
          flow: true,
          tone: "lighter"
        },
        grain(760, 3050, [0.009, 0.018])
      ]
    },

    /* ---------------------------------------------------------------- */
    /* Metallic hydrogen — conductive, and the dynamo. Treated like the
     * planet's outer core: swirl bands and glints, on a self-lit profile. */
    "metallic-h": {
      elements: [
        {
          kind: "arc-band",
          count: [58, 180],
          tiers: 3,
          size: [0.012, 0.028],
          depth: [0.06, 0.94],
          alpha: [0.38, 0.84],
          arc: [45, 200],
          tone: "glow"
        },
        {
          kind: "arrow",
          count: [30, 88],
          tiers: 2,
          size: [0.070, 0.125],
          depth: [0.14, 0.86],
          alpha: [0.46, 0.94],
          flow: true,
          tone: "glow"
        },
        /* Conductive glints — the spec's 20-50, raised for the layer's size. */
        {
          kind: "blob",
          count: [70, 260],
          tiers: 3,
          size: [0.006, 0.016],
          depth: [0.08, 0.92],
          alpha: [0.34, 0.78],
          tone: "glow"
        },
        grain(340, 1400, [0.007, 0.015])
      ]
    },

    /* ---------------------------------------------------------------- */
    /* The icy mantle of an ice giant: a hot dense slush of water, ammonia
     * and methane. Proportionally huge, so it carries the same job the
     * planet's mantle does — slow convection plus density striations. */
    "icy-mantle": {
      elements: [
        /* Density striations: the spec's signature for this layer. */
        {
          kind: "arc-band",
          count: [120, 400],
          tiers: 3,
          size: [0.008, 0.020],
          depth: [0.04, 0.96],
          alpha: [0.26, 0.60],
          arc: [35, 175],
          tone: "lighter"
        },
        {
          kind: "cell",
          count: [55, 155],
          tiers: 2,
          size: [0.095, 0.170],
          depth: [0.06, 0.94],
          alpha: [0.32, 0.68],
          flow: true,
          tone: "lighter"
        },
        {
          kind: "arrow",
          count: [34, 96],
          tiers: 2,
          size: [0.095, 0.170],
          depth: [0.08, 0.92],
          alpha: [0.48, 0.92],
          zonal: [0.18, 0.40],
          bands: 4,
          flow: true,
          tone: "lighter"
        },
        {
          kind: "blob",
          count: [50, 175],
          tiers: 4,
          size: [0.024, 0.058],
          depth: [0.08, 0.92],
          alpha: [0.12, 0.30],
          tone: "darker"
        },
        grain(700, 2820, [0.009, 0.018])
      ]
    },

    /* ---------------------------------------------------------------- */
    /* THE BURIED ROCKY FLOOR of a giant — rock and ice under crushing
     * pressure, and the frosting stage's second consumer (D22).
     *
     * It declares a `relief` field, which is what gives the deposition stage
     * a surface to settle sediment on. Deliberately LOW-AMPLITUDE and heavily
     * smoothed: at this pressure nothing stands up. Mostly occluded by the
     * envelope anyway, so it is cheap — which is precisely why D22 nominated
     * this family to carry the refactor. */
    "rock-core": {
      relief: {
        bands: [
          { cycles: 2,  amp: 1.00 },     /* broad swells, nothing more */
          { cycles: 7,  amp: 0.32 },
          { cycles: 21, amp: 0.09 }      /* barely any roughness */
        ],
        /* Small. A giant's floor is a crushed, level thing; the frosting
         * needs somewhere to pool, not a mountain range. */
        amplitude: 0.055,
        /* Well under the planet's 0.45 — sharpening carves ridges, and there
         * are no ridges down here. */
        sharpen: 0.15
        /* No craters: nothing reaches this depth to make one. */
      },
      elements: [
        /* Compression rings, as the planet's core has. */
        {
          kind: "gradient-band",
          count: [4, 10],
          tiers: 1,
          bandWidth: [0.10, 0.22],
          depth: [0.12, 0.94],
          alpha: [0.28, 0.62],
          arc: [360, 360],
          tone: "glow"
        },
        /* Dense stipple — the densest texture in the body, because this is
         * the one genuinely solid thing in a world made of gas. */
        grain(620, 2450, [0.007, 0.015]),
        {
          kind: "blob",
          count: [20, 78],
          tiers: 3,
          size: [0.012, 0.030],
          depth: [0.10, 0.90],
          alpha: [0.24, 0.55],
          tone: "glow"
        }
      ]
    },

    /* ---------------------------------------------------------------- */
    /* Superionic ice — the one genuinely alien texture in the generator.
     *
     * A REGULAR LATTICE, not a scatter. Evenly-spaced concentric shells
     * crossed by short radial veins: the elements are placed by construction
     * rather than scattered, so the eye finds a grid where every other layer
     * in the generator gives it material. */
    superionic: {
      elements: [
        /* The lattice's concentric member — evenly spaced by buildBands. */
        {
          kind: "gradient-band",
          count: [10, 26],
          tiers: 1,
          bandWidth: [0.55, 0.80],
          depth: [0.04, 0.96],
          alpha: [0.30, 0.66],
          arc: [360, 360],
          alternate: ["glow", "darker"]
        },
        /* And its radial member: short veins standing across the shells. */
        {
          kind: "vein",
          count: [80, 260],
          tiers: 2,
          sizeRel: true,
          size: [0.35, 0.80],
          depth: [0.06, 0.94],
          alpha: [0.30, 0.68],
          tone: "glow"
        },
        /* Conductive glints at the intersections. */
        {
          kind: "blob",
          count: [110, 380],
          tiers: 3,
          size: [0.005, 0.014],
          depth: [0.06, 0.94],
          alpha: [0.36, 0.82],
          tone: "glow"
        },
        grain(300, 1250, [0.006, 0.013])
      ]
    }
  });
})();
