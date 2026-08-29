/* Solid bodies — detail recipes for the rocky family.
 *
 * `atmosphere`, `ocean`, `crust`, `mantle`, `outer-core` and `core`. The moon,
 * ice-moon and asteroid roles land at Phase 7.
 *
 * See js/data/elements/registry.js for what every field means. The registry
 * must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  var grain = CC.Elements.grain;

  CC.Elements.register({

    /* ---------------------------------------------------------------- */
    atmosphere: {
      elements: [
        /* Concentric sub-bands. A thick atmosphere reads as layered rather
         * than as one wash of colour — this is what makes it a LAYER instead
         * of a glow ring. */
        {
          kind: "gradient-band",
          count: [3, 6],
          tiers: 1,
          depth: [0.10, 0.95],
          alpha: [0.27, 0.52],
          arc: [360, 360],
          tone: "lighter"
        },
        /* Haze wisps: long, thin, near-tangential arcs. Cheap, and they give
         * the atmosphere internal structure to catch the eye. */
        {
          kind: "arc-band",
          count: [32, 114],
          tiers: 3,
          size: [0.020, 0.045],
          depth: [0.06, 0.92],
          alpha: [0.21, 0.48],
          arc: [22, 130],
          tone: "lighter"
        },
        /* A faint outer stipple, so the atmosphere's edge dissolves into
         * something rather than stopping. */
        {
          kind: "speckle",
          count: [138, 676],
          tiers: 2,
          size: [0.008, 0.016],
          depth: [0.25, 1.00],
          alpha: [0.17, 0.37],
          texture: true,
          tone: "lighter"
        }
      ]
    },

    /* ---------------------------------------------------------------- */
    ocean: {
      elements: [
        /* Depth gradient — "continuous" in the spec table. Darkens with depth,
         * so the sea reads as having a bottom. */
        {
          kind: "gradient-band",
          count: [1, 1],
          tiers: 1,
          depth: [0.0, 1.0],
          alpha: [0.69, 0.98],
          arc: [360, 360],
          tone: "darker"
        },
        /* Current arcs: horizontal motion in the water. */
        {
          kind: "arc-band",
          count: [16, 68],
          tiers: 3,
          size: [0.012, 0.026],
          depth: [0.12, 0.94],
          alpha: [0.27, 0.59],
          arc: [16, 95],
          tone: "lighter"
        },
        /* Subtle circulation, without arrowheads — an ocean moves, but it is
         * not a convective engine and full arrows would overstate it. */
        {
          kind: "flow-line",
          count: [12, 47],
          tiers: 2,
          size: [0.030, 0.060],
          depth: [0.20, 0.85],
          alpha: [0.31, 0.63],
          flow: true,
          tone: "lighter"
        },
        /* Suspended particulate. Keeps the water from being a flat wash. */
        grain(176, 832, [0.006, 0.013])
      ]
    },

    /* ---------------------------------------------------------------- */
    crust: {
      /* The crust carries the surface terrain field. Its boundary is displaced
       * by h(angle) and the ocean's floor cuts across it, which is where
       * coastlines come from — see gen/terrain.js and PROGRESS.md D15. */
      relief: {
        bands: [
          { cycles: 3,  amp: 1.00 },     /* landmasses */
          { cycles: 12, amp: 0.45 },     /* ranges and plateau edges */
          { cycles: 47, amp: 0.17 }      /* roughness, cliffs */
        ],
        /* Amplitude has to be comparable to the ocean's own thickness, or the
         * sea drowns every peak and the coastline never appears. The ocean
         * runs ~0.015-0.115 thick, so terrain of this height means Ocean depth
         * genuinely sweeps from dry world through Earth-like to waterworld. */
        amplitude: 0.105,
        sharpen: 0.45,
        craters: { count: 9, size: [0.006, 0.030], depth: 0.30 }
      },
      elements: [
        /* Strata: near-concentric bands following the crust, broken up. Reads
         * as sedimentary layering and gives the crust internal structure. */
        /* Sizes here are RELATIVE TO THE CRUST'S OWN THICKNESS (`sizeRel`).
         * The crust is the layer whose thickness varies most — Interior heat
         * thins it and a deep ocean drowns it further — so absolute sizes
         * would read correctly at one setting and wrong at the others. */
        {
          kind: "arc-band",
          count: [32, 109],
          tiers: 3,
          sizeRel: true,
          size: [0.10, 0.24],
          depth: [0.05, 0.80],
          alpha: [0.31, 0.67],
          arc: [25, 140],
          tone: "darker"
        },
        /* Fine fractures running down through the rigid shell. */
        {
          kind: "vein",
          count: [37, 135],
          tiers: 3,
          sizeRel: true,
          size: [0.45, 0.95],
          depth: [0.06, 0.86],
          alpha: [0.35, 0.75],
          tone: "darker"
        },
        /* Mineral pockets — small irregular deposits. */
        {
          kind: "blob",
          count: [34, 130],
          tiers: 4,
          sizeRel: true,
          size: [0.16, 0.36],
          depth: [0.08, 0.82],
          alpha: [0.16, 0.38],
          tone: "lighter"
        },
        grain(748, 2990, [0.009, 0.018])
      ]
    },

    /* ---------------------------------------------------------------- */
    mantle: {
      elements: [
        /* Convection cells — the mantle's signature, and the clearest example
         * of "layer behaviour, drawn". A cell is a closed circulation loop;
         * seeing a ring of them is what makes the mantle read as moving. */
        {
          kind: "cell",
          count: [80, 210],
          tiers: 2,
          /* Authored as the TIER 0 size; lower tiers scale down from here, so
           * this has to be generous or the common tiers vanish. A convection
           * cell wants to be a substantial fraction of the mantle's thickness
           * — a ring of big cells is what says "this layer circulates". */
          size: [0.115, 0.190],
          depth: [0.05, 0.95],
          alpha: [0.35, 0.71],
          flow: true,
          tone: "lighter"
        },
        /* Flow arrows: explicit direction. These are the diagrammatic half of
         * the semi-technical look — the sun-cutaway-diagram arrows. */
        {
          kind: "arrow",
          count: [58, 150],
          tiers: 2,
          /* Longer as well as heavier — a short arrow is a tick mark. */
          size: [0.110, 0.185],
          depth: [0.06, 0.94],
          alpha: [0.58, 0.96],
          flow: true,
          tone: "lighter"
        },
        /* Slow-moving streaks between the cells. */
        {
          kind: "flow-line",
          count: [78, 235],
          tiers: 3,
          size: [0.080, 0.165],
          depth: [0.06, 0.94],
          /* RAISED from 0.27-0.56 (D62). At the old alpha these were the
           * faintest thing in the layer and read as chalk dust; a streak of
           * moving material should be at least as present as the grain it
           * moves through. */
          alpha: [0.42, 0.78],
          flow: true,
          tone: "lighter"
        },
        /* Mineral blobs suspended in the bulk. Four tiers and a low alpha:
         * these are meant to be inclusions glimpsed in the rock, and at three
         * tiers with a heavy alpha they came out as uniform bubble wrap. */
        {
          kind: "blob",
          count: [55, 190],
          tiers: 4,
          size: [0.030, 0.070],
          depth: [0.08, 0.92],
          alpha: [0.12, 0.30],
          tone: "darker"
        },
        grain(616, 2470, [0.010, 0.020])
      ]
    },

    /* ---------------------------------------------------------------- */
    "outer-core": {
      elements: [
        /* Swirl bands: the liquid dynamo, circulating. Long tangential arcs,
         * brighter than the band they sit in, so the layer looks molten. */
        {
          kind: "arc-band",
          count: [52, 165],
          tiers: 3,
          size: [0.014, 0.032],
          depth: [0.06, 0.94],
          alpha: [0.40, 0.86],
          arc: [40, 190],
          tone: "glow"
        },
        {
          kind: "arrow",
          count: [34, 95],
          tiers: 2,
          size: [0.075, 0.125],
          depth: [0.18, 0.82],
          alpha: [0.48, 0.97],
          flow: true,
          tone: "glow"
        },
        {
          kind: "flow-line",
          count: [52, 150],
          tiers: 2,
          size: [0.070, 0.140],
          depth: [0.10, 0.90],
          alpha: [0.31, 0.67],
          flow: true,
          tone: "glow"
        },
        /* Hot flecks drifting in the melt. */
        grain(352, 1456, [0.008, 0.016])
      ]
    },

    /* ---------------------------------------------------------------- */
    core: {
      elements: [
        /* Compression rings: concentric, tight, evenly spaced. The core is
         * under pressure and static — it gets texture and symbols, not arrows
         * (ARCHITECTURE: "cores and solid surfaces get subtler treatment"). */
        {
          kind: "gradient-band",
          count: [4, 10],
          tiers: 1,
          depth: [0.12, 0.94],
          alpha: [0.31, 0.67],
          arc: [360, 360],
          tone: "glow"
        },
        /* Dense stipple — the densest texture in the body, because the core is
         * solid metal and should read as the most substantial thing here. */
        grain(660, 2600, [0.007, 0.015]),
        /* A few brighter inclusions, so the core is not uniform. */
        {
          kind: "blob",
          count: [18, 73],
          tiers: 3,
          size: [0.014, 0.034],
          depth: [0.10, 0.90],
          alpha: [0.27, 0.59],
          tone: "glow"
        }
      ]
    }
  });
})();
