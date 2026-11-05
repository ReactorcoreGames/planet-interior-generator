/* Stars — traits: the coronal holes.
 *
 * Split out of stellar-magnetic.js, which passed the 500-line rule; see that
 * file for the family's header. It must load straight after it, because
 * registration order is picker and roll order. */

var CC = CC || {};

(function () {
  "use strict";

  /* CORONAL HOLES — a sector where the field is open and the wind escapes
   * freely, drawn as FEWER PLUMES rather than as darkness.
   *
   * ---- THE WEDGE VERSION WAS WRONG, AND THE BLEND MODE IS WHY -----------
   *
   * It was a `wedge` with `tone: "darker"` laid across the corona, and the
   * user's verdict was exact: "a big wedge that is drawn over the corona layer
   * with a flat color and no fade... I looked online what coronal holes look
   * like, and it seemed like they're basically large starspots". The reference
   * is right and so is the complaint — what was on screen was a slice of pie.
   *
   * IT HAD TO BE FLAT AND HARD-EDGED, which is the part worth recording,
   * because it means the implementation could not have been rescued by
   * softening it. The corona is composited with `screen` (ATMOSPHERE_BLEND in
   * draw/scene.js), and under `screen` dark paint is very nearly a NO-OP: the
   * operation can only ever add light. A flat opaque wedge was the only dark
   * mark that showed at all; a soft one would have been invisible, which is
   * exactly D121s `dust-formation` failure — dark specks on a fading halo,
   * maxdelta 19, present in every list and absent from the picture.
   *
   * So "make it a soft dark region" and "reuse `starspot` at corona scale"
   * were not merely less elegant options. Both would have spent a pass
   * rediscovering the blend mode.
   *
   * ---- WHAT IT IS INSTEAD ------------------------------------------------
   *
   * A coronal hole is not a dark patch ON the corona. It is a place where
   * there is LESS CORONA — open field lines, plasma leaving rather than being
   * held in loops. Doc 1 of this phase gave the corona a plume field, and an
   * absence in that field is what the feature physically is: no paint, no
   * fighting the blend, and the mark reads because the plumes on either side
   * of it do not.
   *
   * `thins` is the declaration: `keep` is how many of the anchor layer's own
   * elements survive at the centre of the sector, and `feather` eases that
   * back to normal past its edge — which is what gives the hole the soft rim
   * the wedge could never have. See gen/traitroll.js and gen/details.js.
   *
   * ---- AND THEN IT NEEDED SOMETHING TO LOOK AT ---------------------------
   *
   * The absence above is right and is kept. It is also, on its own, nearly
   * invisible — the user's report was that the hole "blends in", which is the
   * honest outcome of a feature defined purely as less of something. An
   * absence is legible only against a baseline the eye can measure, and the
   * plume field is irregular by construction (that irregularity is most of
   * what makes it read as a corona), so a stretch with fewer plumes looks like
   * a stretch that happened to get fewer plumes.
   *
   * Deepening the thinning is NOT the fix, and the note above already says
   * why: cleared further it becomes a bite taken out of the star.
   *
   * So the hole now also DRAWS the thing that is physically there when the
   * field opens — the wind leaving. See `open-field` in
   * draw/primitives/stellar-limb.js: a fan of long straight rays, which is a
   * silhouette nothing else off this limb has (a prominence returns, a flare
   * sprays, a plume tapers; open field is straight and it leaves). The trait
   * is now both halves of what a coronal hole is: less corona, and a visible
   * outflow through the gap.
   *
   * THE PLACEMENT GRAMMAR DOES BOTH AT ONCE. gen/traitroll.js hands the
   * sectors it just rolled to the ordinary placement pass, so the rays land
   * INSIDE the holes rather than being scattered independently — a hole whose
   * wind blew somewhere else would read as two unrelated features. */
  var CORONAL_HOLES = {
    id: "coronal-holes",
    label: "Coronal Holes",
    /* A LIST (D77). The corona is the layer with the plumes in it, but a dwarf
     * star's corona is optional — naming one role would place nothing at all
     * on a body that rolled without it, and everything except the render would
     * say it had worked. */
    anchor: ["corona", "chromosphere"],
    /* AN ABSENCE IN THE ANCHOR LAYER'S ELEMENTS. See the note above. */
    thins: {
      /* Not zero. A hole is a region of much thinner corona rather than a
       * hole punched in the picture, and leaving a scatter of plumes behind
       * is what keeps it reading as part of the same halo — cleared to
       * nothing it becomes a bite taken out of the star, which is a different
       * and worse artefact than the wedge. */
      keep: 0.14,
      /* Past the sector's own edge the count eases back over another half of
       * its width. The soft rim IS the fix — the hard edge is what made the
       * old version a pie slice. */
      feather: 0.75
    },
    /* WIDE ENOUGH TO READ AS A GAP, NARROW ENOUGH TO LEAVE A CORONA.
     *
     * Measured rather than guessed: at 45-110 degrees with up to three holes
     * and a feather half again as wide, the sectors covered most of the
     * circumference and 59% of the corona's elements disappeared. That is not
     * a coronal hole, it is a star with almost no corona — and it would have
     * read as the layer failing rather than as a feature. A hole has to be
     * flanked by full corona on both sides or there is nothing for it to be a
     * gap IN. */
    arc: [30, 62],
    /* One or two. Three narrow holes plus their feathers still add up to most
     * of the limb once the driver has scaled them at low activity, which is
     * exactly when this trait is at its strongest. */
    repeat: [1, 2],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    /* Inversely related to activity, unlike the other four: holes are most
     * prominent at solar MINIMUM, when the field is simple and open. Expressed
     * as a driver that falls rather than rises, which the field supports
     * because `at0` and `at1` are just two ends of an interpolation. */
    driver: { param: "starActivity", at0: 1.4, at1: 0.45 },
    spread: [0.6, 1.4],
    minGap: 40,

    /* ---- and what it draws in the gap ---------------------------------- */

    element: "open-field",
    /* SPANNING, for the third time in this file and for the same reason
     * (D82, D91, D133). The wind starts at the limb and leaves; clamped to
     * the corona's own clip it would be cut off at the top of the halo, which
     * is exactly the part that says it is going somewhere. */
    reach: "spanning",
    /* AND IT LEAVES THE PICTURE, which no other trait in the generator does.
     *
     * Spanning traits are clipped to the body's extent so nothing escapes into
     * open space (draw/scene.js) — correct for a prominence that returns, a
     * flare that disperses, a plume that falls back. All of those belong to
     * the star. The wind out of a coronal hole is the one mark whose content
     * is that it does NOT: clipped, it stopped dead at the halo's edge in a
     * ragged cut across every line and particle, which stated the opposite of
     * the feature. */
    escapes: true,
    /* Rooted at the base of the corona — the visible limb — like a flare. */
    depth: [0.0, 0.06],
    fadeEnds: 0.10,
    /* LONGER THAN A FLARE. An ejection is an event with an end; the wind does
     * not stop, so the rays run until the frame or the fade takes them. That
     * length is a large part of what separates the two silhouettes at a
     * glance. */
    /* MEASURED, NOT ASSUMED — D122 on this trait, and it cost a render to
     * find. Authored at 0.55-1.05 the wind reached the canvas at 0.081-0.121
     * of the body radius: about a seventh, because the tier split and the
     * spanning pass both take their cut before anything is drawn. The field
     * lines, sized off it, came out as a shaggy fringe hugging the limb rather
     * than as a feature reaching past the corona.
     *
     * The figures below are chosen from the MEASURED output rather than from
     * how they read in the source: they put the drawn wind at roughly a third
     * of the body radius, which is the scale the prominences beside it occupy
     * and the scale at which a hole reads as an event rather than as fuzz.
     * `tiers: 1` keeps the whole band undivided, so this is the last cut that
     * gets taken. */
    size: [2.4, 4.2],
    tiers: 1,
    /* ONE FAN PER HOLE, give or take — and this is the DRAWN count, which is
     * a different question from how many holes there are. The primitive draws
     * seven to twelve rays of its own, so a handful of overlapping fans is all
     * a sector can hold before the rays stop reading as parallel. The sector
     * count is `repeat` above, scaled by the driver. */
    density: { min: 1, max: 3 },
    alpha: [0.55, 0.85],

    /* AND THE FIELD THAT LET IT OUT — the diagrammatic half, at the same
     * bearings. See `companion` in gen/traitroll.js for why this is one trait
     * with two marks rather than two traits: the wind and the field are the
     * same feature seen twice, and a version where they landed independently
     * would read as two unrelated things happening near each other.
     *
     * THIS IS THE MARK THAT FINALLY MADE A CORONAL HOLE READABLE, after a
     * dark wedge, a pure absence and the wind above had each been tried and
     * found "tame". All three competed with the prominences and flares on
     * their own terms — brightness and shape — on a limb where those marks
     * were already working. This one does not compete: it is ANNOTATION, the
     * register the mantle arrows are in, which nothing else on a star uses.
     * See `fieldLines` in draw/primitives/stellar-field.js.
     *
     * Bigger than the wind, because the open lines carry past the corona's
     * ceiling; the closed mesh at their base is drawn as a fraction of this
     * and stays low. */
    companion: {
      element: "field-lines",
      /* MULTIPLIERS ON THE PARENT INSTANCE, not ranges — that is what the
       * companion mechanism takes (see gen/traitroll.js). One field-line mark
       * per wind ray, at the same bearing, which is the coincidence the whole
       * mechanism is for.
       *
       * Longer than the wind it accompanies: the open lines are the part that
       * carries past the corona's ceiling, and the closed mesh at their base
       * is drawn as a fraction of this figure so it stays low. */
      size: 1.35,
      /* Slightly stronger than the parent, because these are thin strokes
       * where the wind is a broad wash — equal alpha reads as fainter. */
      alpha: 1.15
    },
    tone: "glow",
    /* `screen`, like everything else out here: this is light being added to a
     * glowing halo, and it is also what lets the rays cross each other and the
     * corona's own plumes without punching holes in them. */
    blend: "screen",
    requires: ["stellar", "has-corona"],
    excludes: [],
    tags: ["stellar", "magnetic"]
  };

  CC.Traits.register([
    CORONAL_HOLES
  ]);
})();
