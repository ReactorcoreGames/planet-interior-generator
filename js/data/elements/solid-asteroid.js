/* Asteroid — detail recipes for the two roles it adds.
 *
 * `outer-shell` and `interior` are both new; nothing else in the project has
 * either, which is the honest signal that this body is not a small planet.
 *
 * See js/data/elements/registry.js for what every field means. The registry
 * must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  var grain = CC.Elements.grain;

  CC.Elements.register({

    /* ------------------------------------------------------------------ */
    /* THE HARDENED CRUST. Thin, dark, and deliberately quiet: it is a frame
     * around the mosaic, and anything loud here competes with the thing the
     * picture is actually about.
     *
     * Everything is sized RELATIVE TO THE SHELL'S OWN THICKNESS. The shell is
     * thin by definition and the body's radius spans three orders of magnitude
     * across the family, so a mark authored in body radii would either vanish
     * or cross the whole band depending on the roll — D122's trap in the unit
     * the layer is measured in. */
    "outer-shell": {
      elements: [
        /* IMPACT PITS. The spec's mark for this layer, and they are the one
         * thing that says the shell has been out there being hit. Fat arcs
         * rather than long ones: a pit is wide across and shallow along, which
         * is the proportion `fat` exists for. */
        {
          kind: "arc-band",
          count: [26, 78],
          tiers: 3,
          sizeRel: true,
          size: [0.30, 0.85],
          fat: 3.4,
          depth: [0.10, 0.92],
          alpha: [0.20, 0.48],
          arc: [4, 22],
          tone: "darker"
        },
        /* THE SHELL'S OWN FRACTURES — short, near-radial cracks through the
         * hardened crust. Fainter and shorter than the interior's, because
         * this layer is the part that held: what cracked all the way through
         * is inside. */
        {
          kind: "vein",
          count: [22, 64],
          tiers: 2,
          sizeRel: true,
          size: [0.25, 0.70],
          depth: [0.06, 0.94],
          alpha: [0.22, 0.50],
          tone: "darker"
        },
        /* The grain of the crust itself. Cheap, and it is what stops the band
         * reading as a flat dark ring between its pits. */
        grain(320, 900, [0.006, 0.013])
      ]
    },

    /* ------------------------------------------------------------------ */
    /* THE MOSAIC — the entire appeal of an asteroid cutaway, and the reason
     * this family was worth building.
     *
     * FOUR ELEMENTS, IN THE ORDER THEY LAYER:
     *
     *   the mosaic itself   the fragments, their joints and the voids
     *   fractures           cracks running ACROSS fragments, not between them
     *   metallic glints     the spec's third interior element
     *   grain               the fine texture over the whole field
     *
     * They are four rather than one because they are four different claims
     * about the material: that it is an aggregate, that the aggregate has been
     * split since, that some of it is metal, and what the surface of the cut
     * looks like up close. A body can have any of them without the others. */
    interior: {
      elements: [
        /* THE VORONOI FIELD.
         *
         * `count` is the CELL COUNT rather than an instance count — the mosaic
         * is one element carrying every site, because a Voronoi cell has no
         * shape of its own and is defined entirely by its neighbours. See
         * buildMosaic in gen/elemgen.js.
         *
         * THE RANGE IS THE SPEC'S 40-200, AT COHESION 0. The spec's figure is
         * a cell count for the body, and Cohesion then scales it down toward a
         * monolith — so what is authored here is the LOOSE end, the rubble
         * pile, and the tight end comes out around 60. Authoring the range as
         * the middle and letting Cohesion push both ways would have made the
         * Detail density slider and the Cohesion slider fight over the same
         * number, which is the coupling D-notes keep warning about.
         *
         * NO `tiers`. Every other field element in the project uses size tiers
         * — a few large, more medium, many small — and that is exactly right
         * for a scatter and meaningless here: a cell's size is decided by
         * where its neighbours are, so there is nothing for a tier to set.
         * The size VARIATION the tiers would have given comes from the lattice
         * jitter instead, which is the same effect arrived at through the
         * geometry rather than imposed on it. */
        {
          kind: "mosaic",
          count: [40, 200],
          /* WHICH PARAMETER DRIVES IT. Named here rather than assumed in the
           * builder, so the coupling between a control and a mark is stated in
           * the data — and so a second body could ask for a mosaic driven by
           * something else entirely. */
          mosaicCohesion: "cohesion",
          /* THE VOID FRACTION AT COHESION 0 AND AT COHESION 1.
           *
           * The two ends of the picture, stated directly. At the loose end
           * better than a quarter of the body is hole, which is what a
           * gravitational aggregate actually is and is the mark that says so
           * at a glance. At the tight end it is not zero: a monolith with no
           * voids at all is a disc of tiles, and a couple of pockets is what
           * keeps it reading as rock rather than as pattern.
           *
           * The spec's "void pockets between cells: 5-25" is the same claim
           * expressed as a count; as a fraction it survives the cell count
           * changing underneath it, which it does here by design. */
          voids: [0.28, 0.03],
          /* 2-4 MATERIALS, verbatim from the spec. */
          materials: [2, 4],
          /* THE JOINT WIDTH at the two ends, in body-space units. Wide enough
           * at the loose end that the fragments are visibly separate pieces
           * with gaps between them; at the tight end a hairline that says
           * "welded" rather than "stacked". */
          seam: [0.011, 0.0022],
          /* HOW FAR EACH SITE STRAYS FROM ITS LATTICE POSITION. At 0 the field
           * is a honeycomb; at 1 it is a random point set with slivers in it.
           * This is the figure that decides whether the interior reads as
           * broken rock or as a pattern, and it wants to be high — rubble is
           * irregular — without reaching the sliver regime. */
          jitter: 0.58,
          depth: [0.0, 1.0],
          alpha: [1.0, 1.0],
          tone: "shift"
        },
        /* FRACTURES ACROSS THE FIELD.
         *
         * A crack that followed the seams would be invisible, because it would
         * land exactly where the picture is already dark. These cut THROUGH
         * cell interiors, which is what makes them read as damage done to the
         * aggregate after it formed rather than as more of its structure.
         *
         * Sized relative to the layer, and the layer here is nearly the whole
         * body — so these are long. That is right: a fracture in a rock this
         * small goes most of the way through it or it is not a fracture. */
        {
          kind: "fracture",
          count: [3, 11],
          tiers: 2,
          sizeRel: true,
          size: [0.16, 0.42],
          depth: [0.10, 0.90],
          alpha: [0.30, 0.62],
          tone: "darker"
        },
        /* METALLIC GLINTS — the spec's 20-60, and the one element in the
         * interior that is BRIGHT.
         *
         * Everything else in this layer is a fragment, a joint or a hole, and
         * all three are dark-to-mid. A scatter of small bright specks is what
         * says the rock has metal in it, and it is the difference between "an
         * asteroid" and "a reason to go to an asteroid" — which is the spec's
         * own framing of what the body is for.
         *
         * Small and few. The density thesis says draw more and fainter, and
         * that is right for a field of texture; this is not a field, it is a
         * handful of points that have to stay points. Too many and the
         * interior reads as glitter over the mosaic instead of metal in it. */
        /* MUCH SMALLER THAN THE FIRST AUTHORING, and the correction is the
         * one D5's opposite: not a hairline, a boulder. At [0.005, 0.012] of
         * the body radius these rendered as PALE POLYGONS several percent of
         * the body across — clearly visible in the large render as blue-grey
         * shapes sitting on the fragments, reading as chips of ice or as
         * flaked paint rather than as flecks of metal.
         *
         * The number was authored against the wrong reference. Everywhere
         * else in the project a speckle sits in a band a few percent of the
         * radius thick, so a size in body units lands correctly by accident.
         * Here the layer is 86% of the radius, and a mark that is small
         * relative to its LAYER is enormous relative to the fragment it is
         * supposed to be a fleck in.
         *
         * A glint has to stay a POINT. The whole reason it works is that it
         * is the only thing in the interior small enough and bright enough to
         * read as a specular hit, and anything with a discernible shape has
         * stopped being one. */
        {
          kind: "speckle",
          count: [30, 90],
          tiers: 2,
          size: [0.0012, 0.0030],
          depth: [0.05, 0.95],
          alpha: [0.60, 1.00],
          tone: "lighter"
        },
        /* THE CUT FACE ITSELF. Fine, faint, over everything — what the
         * surface of a sawn rock looks like up close. Deliberately much
         * lighter than a planet's crust grain: the mosaic owns this layer and
         * a heavy texture over it would mud the fragments together, which is
         * the one failure mode the whole feature is written against. */
        grain(500, 1400, [0.004, 0.009])
      ]
    }
  });
})();
