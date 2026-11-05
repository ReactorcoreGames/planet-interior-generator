/* A layer's boundary as a function of bearing — the wobble, and the faceting
 * that makes a built body's edge straight.
 *
 * Split out of draw/layers.js, which passed the 500-line rule. The seam is curve
 * against paint: this file answers a radius for an angle, and draw/layers.js
 * traces and fills it. Attached to CC.Layers; draw/layers.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  /* HOW MANY CRESTS RUN ROUND THE EDGE, as a radius in noise space.
   *
   * The generator's default is 1.7, which gives one or two lobes per
   * revolution — right for a mantle, where the statement is "this boundary is
   * off-centre and lumpy". It is wrong for a limb: at 1.7 a corona came out
   * as a slightly oval halo, which reads as a rendering imprecision rather
   * than as an agitated star.
   *
   * 5.5 puts roughly six to nine crests round the circumference, which is the
   * difference between "not quite a circle" and WAVY — and waviness is what
   * the user asked for, in as many words. It is a frequency change, not an
   * amplitude one: the silhouette still reads as a circle, which is the
   * v2 failure this must not repeat. */
  var OUTWARD_WOBBLE_FREQ = 5.5;

  /* Build the wobble function for one layer. Returns null for a perfect
   * circle, which lets the caller take the cheap arc() path.
   *
   * The noise is sampled around a circle in 2D noise space, so the boundary
   * closes on itself exactly — no seam at angle 0. Each layer gets its own
   * noise stream keyed by role, so adding or removing a layer never changes
   * the shape of the others. */
  function boundaryFn(layer, seed) {
    if (!layer.wobble) return null;
    /* A LAYER STATED IN ITS OWN THICKNESS IS A LIMB, AND A LIMB WANTS WAVES.
     *
     * `wobbleRel` (gen/structure.js) is how a layer says "I am wavy by a
     * proportion of myself" rather than "I am lumpy by a fraction of the
     * body". Those two statements want different FREQUENCIES as well as
     * different amplitudes: a mantle at 1.7 reads as an off-centre boundary,
     * which is correct for a mantle and reads as a rendering imprecision on a
     * chromosphere. See OUTWARD_WOBBLE_FREQ below — this keeps the banded
     * chromosphere and the outward corona wearing the same edge, which is the
     * point of stating both in the same units. */
    /* ---- A LAYER MAY WEAR ANOTHER LAYER'S SHAPE ------------------------
     *
     * Each layer's noise is keyed by its own ROLE, so every boundary in the
     * body is an independent shape. That is right almost everywhere — a
     * planet's core has no reason to echo its crust — and it fails whenever
     * two adjacent boundaries are both large, because two independent swings
     * of similar size WILL cross each other somewhere.
     *
     * Measured on the asteroid once both its boundaries went to `extreme`:
     * the interior poked outside the shell on 11.8% of bearings, worst case
     * 0.09 of the radius past it. That is the mosaic drawn outside the crust
     * that contains it, which is not a subtle artefact — it is the body
     * turning inside out on part of its circumference.
     *
     * The physical reading is what fixes it. On a planet the crust and the
     * mantle beneath are shaped by different processes, so independence is
     * correct. On a FRAGMENT they are not: the body is one broken lump, and
     * both surfaces follow the overall shape of that lump. So `boundaryShare`
     * names another role whose noise this layer borrows, and the two
     * boundaries then rise and fall together — they can differ in amplitude
     * and in faceting, and they cannot cross, because they are the same curve
     * scaled.
     *
     * Stated as data, so it is a claim the archetype makes about its material
     * rather than a rule this file applies to anything. Absent everywhere but
     * the asteroid, so no existing body's shape changes. */
    var shapeKey = layer.boundaryShare || layer.role;

    /* HOW MANY LOBES GO ROUND THE BODY. The noise is sampled around a circle
     * of this radius in noise space, so a larger figure walks further through
     * the field per revolution and produces more, smaller undulations.
     *
     * 1.7 gives roughly three or four broad lobes, which is a planet's gently
     * off-round boundary and is the right default. A fragment wants more and
     * smaller ones: a collision leaves a body with a dozen faces, not four,
     * and at 1.7 even a fully faceted asteroid still read as a rounded
     * triangle. Declared per layer for the same reason `boundaryFacet` is —
     * amplitude, angularity and frequency are three independent statements
     * about an edge, and a body should be able to make them separately. */
    var freq = layer.wobbleRel ? OUTWARD_WOBBLE_FREQ
                               : (layer.boundaryFreq || 1.7);
    var n = CC.RNG.makeAngularNoise(
      CC.RNG.hashString(String(seed) + " boundary " + shapeKey), freq);
    var amp = layer.wobble;
    var octaves = layer.boundary === "extreme" || layer.boundary === "heavy" ? 4 : 3;

    /* ---- FACETING ------------------------------------------------------
     *
     * SOME BOUNDARIES ARE NOT WAVY, THEY ARE ANGULAR, and until now there was
     * no way for a layer to say so. fBm is smooth by construction: whatever
     * amplitude it is given, the result is a gently undulating circle. That is
     * exactly right for a mantle, for a cloud deck and for a limb — every user
     * this function had — and it is wrong for a body that got its shape by
     * BREAKING.
     *
     * Measured on the asteroid at `extreme`: the silhouette swung from 0.892
     * to 1.010 of the radius, a 12% variation, and still read as a circle. The
     * amplitude was never the problem; more of it would only have produced a
     * larger smooth blob. What an asteroid's outline has that a planet's does
     * not is FLAT FACES MEETING AT CORNERS — it is a fragment of something,
     * and the faces are where it fractured.
     *
     * `boundaryFacet` is that, 0..1, and the transform is the standard way to
     * get creases out of a smooth field: push the value towards its own
     * extremes with a signed power curve, which flattens the middle of every
     * swing into a plateau and compresses the transitions between them into
     * short steep runs. Plateau plus steep run is a face plus a corner.
     *
     * A GENERAL LAYER PROPERTY rather than a check on the boundary character,
     * so a shattered moon or a fragment of a destroyed world can ask for the
     * same edge, and so `extreme` keeps meaning only "how much" rather than
     * quietly also meaning "and angular". Absent on every existing layer, so
     * nothing that looked right before changes. */
    var facet = layer.boundaryFacet || 0;
    if (!facet) {
      return function (angle) {
        return 1 + n(angle, octaves) * amp;
      };
    }

    /* At facet 1 the exponent is 0.42, which is a strong crease without going
     * so far that the outline becomes a polygon — the marks either side of a
     * corner still curve, which is what keeps it reading as rock rather than
     * as a drawn shape. */
    var power = 1 - facet * 0.58;
    return function (angle) {
      var v = n(angle, octaves);
      var shaped = (v < 0 ? -1 : 1) * Math.pow(Math.abs(v), power);
      return 1 + shaped * amp;
    };
  }

  /* THE SAME WOBBLE, EXPRESSED AS A THICKNESS MULTIPLIER.
   *
   * An outward layer — a corona, a halo — cannot use `boundaryFn` at all, and
   * finding that out is what made §1 and §5 of the polish doc one mechanism
   * rather than two.
   *
   * `fillOutward` has two paths. The uniform one is a single
   * `createRadialGradient` and a single `arc()`, and a radial gradient is
   * circular BY DEFINITION — there is no way to wobble it. The angular one
   * walks 240 bearings and asks `thicknessAt(a)` how far the layer reaches
   * there, which is EXACTLY the question "wobble this edge by a proportion of
   * its own thickness" is asking. So the wobble is not new machinery; it is
   * the machinery a zoned atmosphere already uses, wearing a different name.
   *
   * That is also why the tidal bulge composes with it for free: both are
   * per-bearing thickness multipliers, so
   *
   *     thicknessAt(a) = wobble(a) * bulge(a)
   *
   * and neither has to know the other exists.
   *
   * Returns null when the layer declares no relative wobble, so an unzoned,
   * unwobbled body keeps the cheap single-gradient path and pays nothing. */
  function outwardWobbleFn(layer, seed) {
    var frac = layer.wobbleFrac;
    if (!frac || frac <= 0) return null;
    var n = CC.RNG.makeAngularNoise(
      CC.RNG.hashString(String(seed) + " outward-wobble " + layer.role),
      OUTWARD_WOBBLE_FREQ);
    /* Three octaves: enough that the crests differ from one another rather
     * than reading as a sine wave, and few enough that the silhouette stays
     * WAVY rather than turning scalloped. The v2 generator's stars wobbled so
     * hard they stopped being circles; the user was explicit that v3's job is
     * waviness, not that. */
    return function (angle) {
      return 1 + n(angle, 3) * frac;
    };
  }

  CC.Layers.boundaryFn = boundaryFn;
  CC.Layers.outwardWobbleFn = outwardWobbleFn;
})();
