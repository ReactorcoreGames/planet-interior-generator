/* Stars — detail recipes, THE SHARED VOCABULARY.
 *
 * See js/data/elements/registry.js for what every field means, and
 * docs/celestials/stars.md for the spec these implement.
 *
 *
 * ---- THE ONE THING THIS FAMILY EXISTS TO DO ------------------------------
 *
 * MAKE THE TWO ENERGY-TRANSPORT REGIMES INSTANTLY DISTINGUISHABLE. That is the
 * phase's first named done-condition, and it is a question about MARK
 * VOCABULARY rather than about colour or size:
 *
 *   RADIATIVE — near-radial `vein` streaks and nothing else. No cells, no
 *     arrows, no closed shapes. The layer reads as combed. Photons crawl
 *     outward through a still medium and there is no bulk motion to draw, so
 *     the absence of every circulating mark IS the statement.
 *   CONVECTIVE — `convection-cell` outlines with `arrow` loops threading them,
 *     and deliberately NO radial streaks. The layer reads as tiled and turning.
 *
 * D76 is the reason this is stated so bluntly. Seven gaseous traits were
 * invisible because they were a louder example of the mark their layer already
 * made; two adjacent stellar zones drawn in the same vocabulary at slightly
 * different sizes would fail the same way, and the failure would be the whole
 * family rather than one trait. So the two lists have no primitive in common
 * except `speckle`, which is the base texture of everything.
 *
 * CELL SCALE CARRIES MEANING, and it is the second half of the contrast. The
 * spec's note: hundreds of tiny granules on a main-sequence photosphere; a
 * dozen enormous cells in a red giant envelope. Same primitive, different
 * scale, completely different read.
 *
 * NOTHING HERE IS FROSTING (D22). A photosphere has no hollows for material to
 * settle into. Granulation is convective churn and belongs in this file; there
 * is no `film` entry for any stellar layer anywhere.
 *
 *
 * ---- WHY THIS IS SPLIT --------------------------------------------------
 *
 * Four archetypes' worth of roles reached 641 lines against the 500-line rule
 * in CLAUDE.md. The cut is by ZONE OF THE STAR: this file holds the shared
 * builders, `stellar-envelope.js` holds the layers you can see from outside
 * (corona, chromosphere, photosphere) and `stellar-interior.js` holds the
 * transport regimes, the cores and the giant's fusing shells.
 *
 * That is the right seam because it matches how these change: the polish work
 * on how a star's limb reads touches the envelope file and nothing else, while
 * the interior is the part that was signed off and should stay still.
 *
 * Load order in index.html: the registry, this file, then the two zone
 * files. */

var CC = CC || {};

(function () {
  "use strict";

  /* ---- the two vocabularies, written once --------------------------- */

  /* RADIAL STREAKS — the radiative signature.
   *
   * `lean: 0.06` is the whole trick, and it is a general recipe field added
   * for this family: a `vein` defaults to wandering ±0.9 radians around the
   * body, which is right for a crack finding its way through rock and wrong
   * for a photon's outward crawl. At 0.06 the strokes are near-radial with
   * just enough waver to look drawn rather than ruled.
   *
   * THREE TIERS, DENSELY, per CLAUDE.md: more and fainter beats fewer and
   * bolder. A radiative zone should look COMBED — the eye should read a
   * direction across the whole band, which needs hundreds of strokes rather
   * than dozens. `sizeRel` measures them against the layer's own thickness so
   * they stay proportionate however it rolled. */
  function radialStreaks(lo, hi, alphaLo, alphaHi) {
    return {
      kind: "vein",
      count: [lo, hi],
      tiers: 3,
      sizeRel: true,
      size: [0.30, 0.72],
      depth: [0.04, 0.96],
      alpha: [alphaLo, alphaHi],
      lean: 0.06,
      /* Length varies per instance so the comb is not a picket fence. Girth
       * varies with it, which is what makes a few strokes read as brighter
       * channels through the rest. */
      chaos: 0.45,
      tone: "lighter"
    };
  }

  /* CONVECTION CELLS PLUS THEIR FLOW LOOPS — the convective signature.
   *
   * Two elements that must be authored together, because a cell without an
   * arrow in it is just a bubble and an arrow without a cell is just a
   * current. The loop threading the cell is what says "this plasma goes up,
   * over, and back down", which is the entire content of the word convective.
   *
   * `flow: true` on both, so the Flow indicators dropdown governs them —
   * turning flow off should leave the cells and take the arrows, which is a
   * legitimate and quieter picture rather than a broken one.
   *
   * `sizeRel` is what makes ONE definition serve a main star's fine-grained
   * envelope and a red giant's dozen enormous cells: the cell is a fraction of
   * its layer, and the caller passes both the fraction and the count. */
  function convectionCells(countLo, countHi, sizeLo, sizeHi, arrowLo, arrowHi) {
    return [
      {
        /* `convection-cell`, NOT `cell`. The difference is the readability of
         * the whole family and it cost a render to find: `cell` draws an OPEN
         * SPIRAL — a vortex curl, right for a gas giant's storms — and a
         * hundred of them across an envelope half the radius read as "some
         * swirls happened here" rather than as circulating plasma. A closed
         * cell with a rising and a sinking flank is a different claim and
         * needs a different mark (D80). See draw/primitives/stellar.js. */
        kind: "convection-cell",
        count: [countLo, countHi],
        tiers: 3,
        sizeRel: true,
        size: [sizeLo, sizeHi],
        depth: [0.06, 0.94],
        alpha: [0.34, 0.74],
        flow: true,
        tone: "lighter"
      },
      {
        /* The loops BETWEEN cells. The cell primitive draws its own internal
         * circulation, so these are the larger-scale motion the field as a
         * whole has — sized against the cells they travel among rather than
         * inside any one of them. */
        kind: "arrow",
        count: [arrowLo, arrowHi],
        tiers: 2,
        sizeRel: true,
        size: [sizeLo * 0.72, sizeHi * 0.78],
        depth: [0.10, 0.90],
        alpha: [0.52, 0.94],
        flow: true,
        tone: "glow"
      }
    ];
  }

  /* GRANULATION — the photosphere's texture, and the thing that most makes a
   * star look like a star.
   *
   * "Dense and small — hundreds of cells, not dozens", says the spec, and this
   * is the one place in the family where the count runs into four figures.
   * Granules are convection cells seen from ABOVE, at the top of the
   * convective envelope; in cross-section they are a fine tiled skin on the
   * outer edge of the disc, so they are small `cell` outlines at high count
   * with a speckle under them.
   *
   * NOT `flow: true`. A granule is too small to show a loop, and tying a
   * thousand of them to the Flow dropdown would make turning flow off gut the
   * photosphere rather than quieten it. */
  function granulation(lo, hi, sizeLo, sizeHi) {
    return {
      kind: "cell",
      count: [lo, hi],
      tiers: 3,
      sizeRel: true,
      size: [sizeLo, sizeHi],
      depth: [0.05, 0.95],
      alpha: [0.30, 0.66],
      tone: "lighter"
    };
  }

  /* THE CORE'S COMPRESSION RINGS. Every fusing core in the family gets these:
   * concentric shells that say "pressure", the same mark the planet's core and
   * the gas giant's rock heart already carry. Shared so the three stellar
   * cores cannot drift apart. */
  var COMPRESSION_RINGS = {
    kind: "gradient-band",
    count: [4, 9],
    tiers: 1,
    bandWidth: [0.10, 0.24],
    depth: [0.10, 0.94],
    alpha: [0.30, 0.66],
    arc: [360, 360],
    tone: "glow"
  };

  /* The two concrete instantiations, built once. `convectionCells` returns a
   * PAIR — the cell and the loop that threads it — because neither says
   * "convection" on its own, and calling it twice to pick one element out of
   * each would build the pair twice and invite the two halves drifting. */
  /* SIZED SO THE SURVIVING TOP TIER READS AS A CELL.
   *
   * The Size-tiers slider defaults to 3, and `tierSplit` drops tier 0 FIRST —
   * so the largest cell actually drawn is 0.52x the authored figure, not 1.0x.
   * Authoring 0.16-0.42 therefore drew 0.08-0.22 of the layer and the envelope
   * came out as scattered marks with gaps between them. This is the same trap
   * D76 records on `named` traits, in its milder form: the authored number is
   * not the drawn number, and the only way to know is to measure.
   *
   * At 0.30-0.78 the top drawn tier is roughly a third of the layer's
   * thickness, which is what lets a few dozen of them tile it. */
  var ENVELOPE_CELLS = convectionCells(46, 140, 0.30, 0.78, 26, 78);
  /* Larger still, proportionally: a convective CORE is a small volume doing
   * violent work, and its cells are a substantial fraction of it rather than a
   * fine tiling. Same reasoning about the surviving tier as above. */
  var CORE_CELLS = convectionCells(20, 62, 0.46, 1.05, 14, 44);

  /* Published for the two zone files, which are the only consumers. A
   * namespace rather than two copies, so a change to what "a convection cell"
   * means lands once and cannot drift between the envelope and the interior. */
  CC.StellarElements = {
    radialStreaks: radialStreaks,
    convectionCells: convectionCells,
    granulation: granulation,
    COMPRESSION_RINGS: COMPRESSION_RINGS,
    ENVELOPE_CELLS: ENVELOPE_CELLS,
    CORE_CELLS: CORE_CELLS
  };
})();
