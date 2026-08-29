/* Stars — the INTERIOR: the transport regimes, the cores, the shells.
 *
 * `radiative`, `convective`, `convective-core`, `tachocline`, `fusion-core`,
 * `degenerate-core`, `h-shell`, `he-shell` and `shed-envelope`.
 *
 * THE TWO TRANSPORT VOCABULARIES LIVE HERE and they are the family's whole
 * readability — see the header in stellar-common.js for why they share no
 * primitive but `speckle`. This half of the family was signed off and should
 * stay still; the polish work belongs in stellar-envelope.js.
 *
 * js/data/elements/stellar-common.js must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  var grain = CC.Elements.grain;
  var S = CC.StellarElements;
  var radialStreaks = S.radialStreaks, granulation = S.granulation;
  var COMPRESSION_RINGS = S.COMPRESSION_RINGS;
  var ENVELOPE_CELLS = S.ENVELOPE_CELLS, CORE_CELLS = S.CORE_CELLS;

  CC.Elements.register({
    /* RADIATIVE: streaks, and NOTHING that circulates.
     *
     * There is not a single `cell` or `arrow` in this list, and that absence
     * is deliberate and load-bearing. See the header. */
    radiative: {
      elements: [
        radialStreaks(240, 820, 0.26, 0.62),
        {
          /* A second, much finer comb at higher count and lower alpha, so the
           * layer has grain within its grain. Three size tiers on each means
           * six effective scales of streak, which is what makes it read as a
           * medium rather than as hatching. */
          kind: "vein",
          count: [420, 1500],
          tiers: 2,
          sizeRel: true,
          size: [0.10, 0.30],
          depth: [0.03, 0.97],
          alpha: [0.16, 0.40],
          lean: 0.05,
          chaos: 0.40,
          tone: "lighter"
        },
        /* Faint concentric density shells. NOT alternating — an alternating
         * comb would fight the radial one and the layer would read as a grid,
         * which is the superionic lattice's mark and belongs to it. These are
         * a slow pressure swell under the streaks. */
        {
          kind: "gradient-band",
          count: [5, 12],
          tiers: 1,
          bandWidth: [0.30, 0.70],
          depth: [0.04, 0.96],
          alpha: [0.10, 0.24],
          arc: [360, 360],
          tone: "lighter"
        },
        grain(600, 2400, [0.006, 0.014])
      ]
    },

    /* CONVECTIVE, THE ENVELOPE FORM: cells and loops, and NO radial streaks.
     *
     * Used by `main-star`, `old-giant-star` and `dwarf-star`, which is three
     * bodies wanting three very different cell SCALES out of one role. The
     * count and size here are the main-sequence figures; the old giant's
     * enormous cells and the dwarf's full-depth loops are handled by the
     * per-archetype layer thickness doing the work, since `sizeRel` measures
     * against it — a red giant's envelope is 0.62 of the radius and a main
     * star's is 0.25, so the same authored fraction gives cells two and a half
     * times the size without a second table. That is the same reasoning
     * `sizeRel` was built on and it is why the spec's "same primitive,
     * different scale" needs no code. */
    convective: {
      elements: [
        ENVELOPE_CELLS[0],
        ENVELOPE_CELLS[1],
        {
          /* Rising plumes between the cells — tangentially-leaning strokes
           * that show material moving BETWEEN cells rather than within one.
           * `flow-line` rather than `vein` keeps it in the circulating
           * vocabulary; a vein here would start borrowing the radiative
           * zone's mark and blur the distinction the family rests on. */
          kind: "flow-line",
          count: [120, 400],
          tiers: 3,
          sizeRel: true,
          size: [0.12, 0.34],
          depth: [0.05, 0.95],
          alpha: [0.28, 0.62],
          flow: true,
          tone: "lighter"
        },
        grain(640, 2600, [0.007, 0.016])
      ]
    },

    /* CONVECTIVE, THE CORE FORM — a young star's churning heart.
     *
     * A SEPARATE ROLE FROM `convective`, and the reason is not cosmetic. A
     * convective core is a churning centre inside a still envelope; a
     * convective envelope is a churning shell around a still centre. Sharing
     * one role name would leave the element table unable to size the two
     * differently, and the size difference is most of what makes the
     * inversion legible when a young star is set beside a main one.
     *
     * FEWER, LARGER CELLS than an envelope's, because this is a small volume
     * doing violent work — the cells here are a substantial fraction of the
     * core rather than a fine tiling of it. */
    "convective-core": {
      elements: [
        CORE_CELLS[0],
        CORE_CELLS[1],
        {
          kind: "flow-line",
          count: [70, 230],
          tiers: 2,
          sizeRel: true,
          size: [0.18, 0.44],
          depth: [0.06, 0.94],
          alpha: [0.30, 0.68],
          flow: true,
          tone: "glow"
        },
        grain(340, 1400, [0.007, 0.015])
      ]
    },

    /* THE TACHOCLINE — a thin bright shear band, and one element.
     *
     * The spec says "1" and means it. This layer is a hairline; anything
     * scattered in it would be invisible and the shell IS the feature. Two
     * bands rather than one so the shear has a top and a bottom edge, which
     * is what makes it read as a boundary between two things rather than as a
     * stripe. */
    tachocline: {
      elements: [
        {
          kind: "gradient-band",
          count: [2, 3],
          tiers: 1,
          bandWidth: [0.35, 0.75],
          depth: [0.05, 0.95],
          alpha: [0.55, 0.92],
          arc: [360, 360],
          tone: "glow"
        },
        /* Shear glints strung around it — the dynamo, drawn as points of
         * concentrated field rather than as a mechanism. */
        {
          kind: "blob",
          count: [90, 320],
          tiers: 2,
          size: [0.004, 0.011],
          depth: [0.10, 0.90],
          alpha: [0.40, 0.88],
          tone: "glow"
        }
      ]
    },

    /* ================================================================ */
    /* THE CORES                                                        */
    /* ================================================================ */

    /* WHERE THE HYDROGEN IS BURNING. Dense glow stipple plus compression
     * rings — the same mark language as every other core in the generator, at
     * the brightest end of it. */
    "fusion-core": {
      elements: [
        COMPRESSION_RINGS,
        grain(760, 3000, [0.005, 0.012]),
        {
          kind: "blob",
          count: [140, 520],
          tiers: 3,
          size: [0.006, 0.018],
          depth: [0.06, 0.94],
          alpha: [0.34, 0.80],
          tone: "glow"
        }
      ]
    },

    /* THE DEGENERATE CORE of an old giant. The densest texture anywhere in
     * the generator, in the smallest layer — which is the point. Matter here
     * is packed to the electron limit, and the way to say that is to put more
     * marks per unit area than any other layer carries.
     *
     * TIGHT RINGS, not the fusion core's broad ones: `bandWidth` well under
     * half, so several rings fit inside a layer that is 4% of the radius. */
    "degenerate-core": {
      elements: [
        {
          kind: "gradient-band",
          count: [4, 8],
          tiers: 1,
          bandWidth: [0.06, 0.16],
          depth: [0.08, 0.96],
          alpha: [0.36, 0.74],
          arc: [360, 360],
          tone: "glow"
        },
        grain(900, 3600, [0.004, 0.010]),
        {
          kind: "blob",
          count: [200, 720],
          tiers: 3,
          size: [0.004, 0.012],
          depth: [0.05, 0.95],
          alpha: [0.40, 0.90],
          tone: "glow"
        }
      ]
    },

    /* ================================================================ */
    /* THE OLD GIANT'S SHELLS AND ITS CAST-OFF MATERIAL                 */
    /* ================================================================ */

    /* HYDROGEN FUSING IN A SHELL. Bright thin bands and glints — this is where
     * the star's energy is actually coming from now, and it should look
     * busier and brighter than the vast tired envelope above it. */
    "h-shell": {
      elements: [
        {
          kind: "gradient-band",
          count: [5, 12],
          tiers: 1,
          bandWidth: [0.18, 0.42],
          depth: [0.05, 0.95],
          alpha: [0.34, 0.72],
          arc: [360, 360],
          alternate: ["glow", "lighter"]
        },
        {
          kind: "arc-band",
          count: [80, 280],
          tiers: 3,
          size: [0.008, 0.022],
          depth: [0.05, 0.95],
          alpha: [0.30, 0.70],
          arc: [30, 170],
          tone: "glow"
        },
        {
          kind: "blob",
          count: [110, 400],
          tiers: 3,
          size: [0.004, 0.012],
          depth: [0.06, 0.94],
          alpha: [0.36, 0.84],
          tone: "glow"
        },
        grain(300, 1250, [0.005, 0.012])
      ]
    },

    /* HELIUM FUSING DEEPER STILL. The same vocabulary one step brighter and
     * one step tighter, because it is the same kind of thing happening under
     * more pressure. */
    "he-shell": {
      elements: [
        {
          kind: "gradient-band",
          count: [4, 10],
          tiers: 1,
          bandWidth: [0.14, 0.34],
          depth: [0.06, 0.94],
          alpha: [0.40, 0.80],
          arc: [360, 360],
          alternate: ["glow", "lighter"]
        },
        {
          kind: "blob",
          count: [90, 340],
          tiers: 3,
          size: [0.004, 0.011],
          depth: [0.06, 0.94],
          alpha: [0.40, 0.88],
          tone: "glow"
        },
        grain(240, 1000, [0.004, 0.011])
      ]
    },

    /* CAST-OFF MATERIAL. Wisps and dust motes, and the loosest, faintest
     * thing the generator draws — it is not part of the star any more.
     *
     * Drawn through the outward falloff like the corona, so the alphas are
     * low and the falloff does the rest. The DUST is the interesting half:
     * hundreds of tiny motes are what say "this is the raw material of the
     * next generation of worlds", which is the archetype's stated hook. */
    "shed-envelope": {
      elements: [
        {
          kind: "arc-band",
          count: [60, 200],
          tiers: 3,
          size: [0.008, 0.024],
          depth: [0.04, 0.96],
          alpha: [0.12, 0.32],
          arc: [20, 140],
          tone: "lighter"
        },
        {
          /* Dust motes. The highest count of any single element in the
           * generator, at the lowest sizes — a thin fog of solid particles
           * rather than a gas. */
          kind: "speckle",
          count: [600, 2400],
          tiers: 3,
          size: [0.004, 0.010],
          depth: [0.02, 1.00],
          alpha: [0.14, 0.38],
          texture: true,
          tone: "darker"
        },
        {
          /* ---- THE PLUME FIELD, THE TIRED VERSION -------------------
           *
           * This body has no corona, so it does not inherit the plume field
           * the other three wear on theirs — and without one it was the only
           * star in the family with nothing standing off its limb, which
           * showed up immediately on a four-way close-up strip. That is D121
           * in a new place: a mechanism that works on three bodies out of
           * four looks like a working mechanism.
           *
           * DELIBERATELY DIFFERENT FROM THE CORONA'S, not a copy at another
           * scale. A red giant is not flaring — it is SHEDDING, so these are
           * few, very long, very faint and heavily leaned: slow tongues of
           * material drifting away rather than jets being thrown. That is the
           * archetype's whole story, and having its own recipe is what lets
           * it be told rather than merely dimmed. */
          kind: "plume",
          count: [14, 46],
          tiers: 3,
          size: [0.20, 0.52],
          depth: [0.00, 0.24],
          /* HIGH, AND THAT IS NOT A CONTRADICTION OF "FAINT".
           *
           * Everything in an outward layer is multiplied by the layer's own
           * falloff before it reaches the canvas, and this envelope declares
           * `fadeHold: 0.10` — the fastest taper in the generator, because a
           * shed shell is thin everywhere. At the authored 0.16-0.44 the
           * plumes generated correctly (measured: 44 of them, up to 148 px)
           * and drew as nothing at all.
           *
           * The layer's colour compounds it: this envelope rolls sat 0.15-0.40
           * at val 0.30-0.50 — the dimmest palette in the family by design —
           * so a mark that is a fraction of it has very little to work with.
           *
           * So the authored figure is high and the render is still faint,
           * which is the correct arrangement. The alternative — quietly
           * exempting these from the falloff — would have made them float
           * clear of the layer they belong to. */
          alpha: [0.55, 0.95],
          chaos: 0.65,
          /* Heavily leaned: nothing here is being launched. */
          curl: 1.05,
          tone: "glow"
        },
        {
          /* Ragged outward strands — material still leaving. */
          kind: "vein",
          count: [40, 150],
          tiers: 2,
          sizeRel: true,
          size: [0.25, 0.70],
          depth: [0.02, 0.60],
          alpha: [0.12, 0.34],
          lean: 0.30,
          chaos: 0.60,
          tone: "lighter"
        }
      ]
    }
  });
})();
