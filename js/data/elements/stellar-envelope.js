/* Stars — the ENVELOPE: what you can see from outside.
 *
 * `corona`, `chromosphere` and `photosphere` — the hot diffuse halo, the
 * spicule fringe, and the granulated visible surface.
 *
 * THIS IS THE FILE THE POLISH WORK TOUCHES. How a star's limb reads — the
 * wobble, the plumes, the emissive glow — is entirely a property of these
 * three layers, and keeping them separate from the interior means that work
 * cannot disturb the transport regimes that were signed off.
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

    /* ================================================================ */
    /* THE OUTER ENVELOPE                                               */
    /* ================================================================ */

    /* The hot diffuse halo. STREAMERS AND WISPS — long, thin, near-radial
     * strokes reaching outward, which is what a coronal streamer actually
     * looks like and is a mark nothing else outside the body makes.
     *
     * The layer is drawn through the outward-falloff path, so everything here
     * is already fading with radius; the alphas run LOW because the falloff
     * multiplies them rather than replacing them. */
    corona: {
      elements: [
        {
          /* Streamers. Near-radial and long, so the corona reads as
           * structured rather than as a fog. */
          kind: "vein",
          count: [70, 240],
          tiers: 3,
          sizeRel: true,
          size: [0.35, 0.90],
          depth: [0.02, 0.72],
          alpha: [0.20, 0.52],
          lean: 0.14,
          chaos: 0.55,
          tone: "lighter"
        },
        {
          /* Wisps: tangential, and a different direction from the streamers so
           * the halo has a weave to it rather than one grain. */
          kind: "arc-band",
          count: [60, 200],
          tiers: 3,
          size: [0.010, 0.030],
          depth: [0.05, 0.90],
          alpha: [0.14, 0.36],
          arc: [25, 150],
          tone: "lighter"
        },
        {
          /* ---- THE PLUME FIELD -------------------------------------
           *
           * FIRE STANDING OFF THE SURFACE, and it is a SEPARATE mechanism
           * from the boundary wobble on purpose. The wobble says the edge of
           * the layer is not a circle; this says there are things rising out
           * of it. Fold them into one number and "more spiky" and "more
           * flames" move together and neither is tunable, which is exactly
           * what the user asked to avoid — they called it a two- or
           * three-layer thing precisely so each type of star gets its own
           * levers.
           *
           * ROOTED AT THE BASE OF THE CORONA AND REACHING OUTWARD, which is
           * what `depth` near zero buys: the corona's inner edge sits on the
           * chromosphere, so a plume placed there starts at the visible limb
           * and climbs. It needs no new pass and no spanning clip — the
           * outward-falloff layer's own clip runs from the surface to the
           * (wobbled) coronal edge, which is precisely the region a plume
           * occupies, and `outward: true` already fades every element in the
           * layer along the same curve as the fill. The machinery the roadmap
           * said this wanted was the atmosphere's, and this is it.
           *
           * COUNTS ARE HIGH AND SIZES MODEST. The thesis is many cheap
           * elements in tiers, not a few elaborate ones, and D122 is the
           * standing correction on the sizes: `tierSplit` drops tier 0 first,
           * so at the default Size-tiers of 3 the largest plume actually
           * drawn is 0.52x the authored figure. These numbers are chosen for
           * the tier that survives.
           *
           * Per-archetype intensity comes from `elementScale` on each corona
           * (gen/details.js), not from four copies of this recipe. */
          kind: "plume",
          count: [26, 90],
          tiers: 3,
          /* MEASURED, NOT ASSUMED (D122, D126). Authored at 0.055-0.150 the
           * surviving tiers drew at 0.5-27 px on a 900px canvas, and most of
           * them at under ten — which is D126's exact failure: a field that
           * changes plenty of pixels and cannot be seen. The corona is
           * roughly 0.20 of the radius deep, so a top-tier plume standing a
           * third of the way up it is the figure that reads, and that means
           * authoring near 0.36 for a drawn 0.19. */
          size: [0.140, 0.360],
          /* Rooted low in the layer. The spread is small rather than zero so
           * the field has depth to it — a rank of plumes all starting on
           * exactly the same line reads as a comb. */
          depth: [0.00, 0.10],
          alpha: [0.34, 0.80],
          chaos: 0.50,
          curl: 0.6,
          tone: "glow"
        },
        {
          /* A SECOND, SHORTER, DENSER RANK just above the limb — spicules
           * rather than flame tongues. Two ranks at different scales is the
           * same "cell scale carries meaning" trick the interior uses, and it
           * is what stops the fringe reading as one row of identical spikes. */
          kind: "plume",
          count: [70, 220],
          tiers: 2,
          size: [0.048, 0.115],
          depth: [0.00, 0.07],
          alpha: [0.26, 0.62],
          chaos: 0.55,
          curl: 0.85,
          tone: "glow"
        },
        grain(280, 1120, [0.006, 0.014])
      ]
    },

    /* THE SPICULE FRINGE — a thin shell of short jets standing off the
     * photosphere, and the reason the chromosphere is worth having as a layer
     * at all rather than as a line.
     *
     * Very high count in a very thin band, which is what a fringe IS. `lean`
     * moderate: spicules lean over as they rise.
     *
     * ---- WHY THEY COULD NOT BE SEEN, MEASURED RATHER THAN GUESSED --------
     *
     * The user zoomed in and reported nothing on the surface. They were
     * drawing — 556 of them — and the reason is D126 in its purest form:
     * MEASURED AT A REALISTIC RENDER WIDTH THEY WERE 1.2 TO 6.4 PIXELS LONG,
     * median 3. Present, correct, and below the size at which anything can be
     * read as a shape.
     *
     * THE CAUSE IS TWO FACTORS COMPOUNDING, and neither is visible in the
     * authored numbers alone:
     *
     *   `sizeRel` is a fraction of THE LAYER'S OWN THICKNESS, and the
     *     chromosphere is a hairline — 15 to 22 px on a 900px render across
     *     all four archetypes. So 0.55-1.10 of it is 8-24 px before anything
     *     else happens.
     *   `tierSplit` then drops tier 0 first (D122), so at the default
     *     Size-tiers of 3 the largest actually drawn is 0.52x that.
     *
     * The lesson is the one D122 already records and this is its sharpest
     * instance: the authored figure is not the drawn figure, and where a
     * relative size sits on a layer that is deliberately thin, the gap between
     * them is a factor of four rather than a nudge.
     *
     * RAISED PAST 1.0 DELIBERATELY. A spicule genuinely IS taller than the
     * chromosphere is thick — that is what makes it a fringe standing off the
     * layer rather than a texture inside it — so a figure above 1 is the
     * honest statement and not an overshoot. Re-measured after the change
     * rather than assumed. */
    chromosphere: {
      elements: [
        {
          kind: "vein",
          count: [220, 780],
          tiers: 2,
          sizeRel: true,
          size: [1.60, 3.20],
          depth: [0.00, 0.55],
          /* Brighter with the size. At 3 px a faint stroke is nothing at all;
           * at 12 it can afford to be seen. */
          alpha: [0.40, 0.86],
          lean: 0.22,
          chaos: 0.50,
          tone: "glow"
        },
        {
          /* A faint continuous shell under the fringe, so the layer has a
           * body and the spicules stand ON something. */
          kind: "gradient-band",
          count: [1, 2],
          tiers: 1,
          bandWidth: [0.55, 0.95],
          depth: [0.05, 0.60],
          alpha: [0.24, 0.50],
          arc: [360, 360],
          tone: "lighter"
        },
        grain(180, 700, [0.005, 0.011])
      ]
    },

    /* ================================================================ */
    /* THE VISIBLE SURFACE                                              */
    /* ================================================================ */

    /* GRANULATION IS THE POINT OF THIS LAYER. Hundreds of small cells plus a
     * dense stipple under them, which together read as a boiling skin.
     *
     * Starspots are NOT here — they are a trait, because a star without them
     * is a perfectly ordinary star and a star covered in them is a different
     * picture. See js/data/traits/stellar-magnetic.js. The line the project draws is
     * "if a layer would look wrong without it, it belongs in this file", and a
     * photosphere without spots looks fine. */
    photosphere: {
      elements: [
        granulation(420, 1450, 0.14, 0.40),
        {
          /* A second, finer granule tier at higher count — the small-scale
           * structure between the big granules. Density is the thesis, and a
           * photosphere is the one surface in the generator where the eye can
           * see arbitrarily far into the texture. */
          kind: "cell",
          count: [300, 1050],
          tiers: 2,
          sizeRel: true,
          size: [0.06, 0.17],
          depth: [0.04, 0.96],
          alpha: [0.22, 0.50],
          tone: "darker"
        },
        /* Bright points in the granule lanes — the intergranular network,
         * which is genuinely where the field concentrates. */
        {
          kind: "blob",
          count: [180, 640],
          tiers: 3,
          size: [0.003, 0.010],
          depth: [0.06, 0.94],
          alpha: [0.38, 0.86],
          tone: "glow"
        },
        grain(520, 2100, [0.005, 0.012])
      ]
    },

    /* ================================================================ */
    /* THE TWO TRANSPORT REGIMES — the family's whole readability        */
    /* ================================================================ */
  });
})();
