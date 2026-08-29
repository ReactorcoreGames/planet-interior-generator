/* The tidal SWELL — a per-bearing displacement of a BANDED layer's boundary.
 *
 * `airAt`'s sibling, and the field that finally makes the companion axis
 * reach the part of the picture the eye is actually on. Session O bulged the
 * outward layer only, which is where a real tidal bulge lives and was the
 * right first move — but the corona is the faintest thing in the frame, so
 * the one layer that moved was the one least able to show it. This is what
 * reaches the chromosphere and the photosphere, which is what the user asked
 * for by name.
 *
 * WHY IT IS ITS OWN FILE. gen/zones.js crossed the 500-line rule when this
 * landed, and the swell is a real seam rather than a byte-count split (D128):
 * it is the only field with its OWN depth list, its OWN cross-fade width and
 * a cap of its own, because geometry and light want different answers to the
 * same three questions. Everything a consumer needs is `swellAt`; everything
 * else here exists to make that one function honest.
 *
 * `CC.ZoneSwell.build(ctx)` takes what it cannot derive — the resolved spec,
 * the body, the declared order, the intensity, the shared blend, and the
 * `fieldAt` sampler zones.js owns — and returns `{ swellAt, anchored }`.
 * gen/zones.js publishes both.
 *
 * Load order in index.html: gen/zonegeom.js, this file, then gen/zones.js. */

var CC = CC || {};

CC.ZoneSwell = (function () {
  "use strict";

  /* HOW FAR THE UNANCHORED INTERIOR MAY FOLLOW THE SKIN, as a share of what
   * the skin itself moved. See `swellCap` below for why a share and not all
   * of it. */
  var SWELL_INTERIOR = 0.35;

  /* `ctx` carries what this cannot derive on its own:
   *
   *   spec        the resolved zone recipe (swellAnchor / swellResidue / anchor)
   *   body        the built stack, for its rolled thicknesses
   *   order       the declared colour order, for the depth falloff
   *   intensity   the dial, 0..1
   *   swellBlend  this field's own cross-fade width
   *   fieldAt     zones.js's sampler: (angle, key, neutral, blendOverride)
   *   strengthFor zones.js's shared depth factor, for the no-swellAnchor case
   */
  function build(ctx) {
    var spec = ctx.spec, body = ctx.body, order = ctx.order;
    var intensity = ctx.intensity, swellBlend = ctx.swellBlend;
    var fieldAt = ctx.fieldAt, strengthFor = ctx.strengthFor;

  /* BOUNDARY OFFSET FOR A BANDED LAYER at an angle — `airAt`'s sibling for
   * every layer that is not an outward falloff.
   *
   * WHY IT EXISTS. Bulging only the outward layer is where a real tidal
   * bulge lives, and it was the right first move — but the corona is the
   * faintest thing in the picture, so the one layer that moved was the one
   * least able to show it. This is the field that reaches the chromosphere
   * and the photosphere, which is what the user asked for by name.
   *
   * NEUTRAL 0, NOT 1, and getting that backwards would swell every unzoned
   * body in the generator by 100%. `air` is a MULTIPLIER on a thickness;
   * this is a signed DISPLACEMENT, so its unzoned state is "no offset",
   * exactly like `sea` and `snow`.
   *
   * IT IS A PROPORTION OF THE LAYER'S OWN THICKNESS, NOT OF THE BODY
   * RADIUS, and that is the single most important thing about it (D131). A
   * photosphere is a skin a few percent thick: a fixed body-radius
   * displacement either does nothing to it or swallows it whole, with
   * nothing usable in between. The consumer multiplies by the layer's
   * thickness before handing it to `levelFn`, which takes an absolute
   * body-space offset — and the unit disagreement, if it were missed, would
   * be invisible on a thick layer and catastrophic on a thin one, which is
   * the worst possible failure profile.
   *
   * IT TAKES A ROLE, WHICH `seaAt` AND `airAt` DO NOT. Those two belong to
   * one layer each — the fluid's surface, the gas column — so there is
   * nothing to be deep about. This one applies to the whole banded stack,
   * and the whole point is that it must NOT apply equally: the chromosphere
   * and the photosphere carry it, and the convective and radiative zones
   * stay round. Depth is therefore part of the question being asked. */
  function swellAt(angle, role) {
    var d = swellDepth(role);
    if (d <= 0) return 0;
    var v = fieldAt(angle, "swell", 0, swellBlend) * d;

    /* CAPPED, IN BODY RADII, AGAINST WHAT THE SKIN ITSELF MOVED — and
     * measuring is the only reason this is here at all. It is D131 arriving
     * from the other side and it is worth the space.
     *
     * "A proportion of the layer's own thickness" is the right unit for a
     * SKIN; it is the whole reason this field is not stated in body radii.
     * But the same unit makes a small proportion of a very THICK layer a
     * large displacement, and the layers below the anchored skin are the
     * thick ones. Measured on a main star at full lock, with the depth
     * falloff already doing its job:
     *
     *   photosphere  0.36 of a 0.062 layer  ->  2.3% of the body radius
     *   convective   0.15 of a 0.519 layer  ->  7.9% of the body radius
     *
     * The interior deformed three times harder than the skin the feature is
     * about, while every proportion in the recipe said the reverse. That is
     * the "a proportion is only calibrated for what it's a proportion of"
     * trap (D93, D75, D119), and the depth falloff cannot catch it because
     * the falloff is a proportion too.
     *
     * So the limit is stated in the unit the problem is in, taken from what
     * the skin actually moved — and A SHARE OF IT, NOT ALL OF IT. Capping
     * the interior AT the skin's figure does stop it leading, but a thick
     * layer then saturates against the cap across the whole facing arc and
     * moves as one rigid piece exactly as far as the skin does, which reads
     * as the star sliding sideways rather than as a surface being pulled.
     * This is `LIMB.surface` / `LIMB.interior` (D129) reappearing on
     * geometry: the skin takes the full figure, the interior takes a small
     * share, and the effect spans a readable distance without the deep stack
     * going lopsided.
     *
     * IT LIVES HERE RATHER THAN IN THE RENDERER so there is exactly one
     * answer. The boundary (draw/scene.js) and the detail elements
     * (gen/details.js) both consume this, and a cap applied in one and not
     * the other would shear the marks off the band they belong to — a
     * defect that would be invisible on any body whose interior is thin. */
    if (swellAnchored[role]) return v;

    /* THE CAP IS IN BODY RADII AND `v` IS A FRACTION OF THE LAYER, so the
     * comparison has to happen in one unit or the other. Converting the cap
     * INTO the layer's units — rather than returning body-space here — is
     * what keeps this function's contract single: it always returns a
     * fraction of the caller's layer, whatever the cap did. Getting that
     * backwards is the same silent unit disagreement D131 is about, one
     * level down. */
    var t = thicknessOf(role);
    if (t <= 0) return v;
    var cap = swellCap() / t;
    if (v > cap) return cap;
    if (v < -cap) return -cap;
    return v;
  }

  /* A role's rolled thickness, looked up once per role. `body` is already a
   * parameter of `build`, so this needs nothing new passed in. */
  var thicknessCache = null;
  function thicknessOf(role) {
    if (!thicknessCache) {
      thicknessCache = {};
      var ls = (body && body.layers) || [];
      for (var i = 0; i < ls.length; i++) {
        thicknessCache[ls[i].role] = ls[i].thickness || 0;
      }
    }
    var t = thicknessCache[role];
    return t === undefined ? 0 : t;
  }

  /* How far the unanchored interior may follow, in body radii. Resolved
   * lazily and once: it needs `swellAt` on the anchored roles, which is the
   * function above, so it cannot be built at declaration time. */
  var SWELL_INTERIOR = 0.35;
  var swellCapV = null;
  function swellCap() {
    if (swellCapV !== null) return swellCapV;
    swellCapV = 0;
    var layers = (body && body.layers) || [];
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      if (L.outward || !swellAnchored[L.role]) continue;
      var t = L.thickness || 0;
      if (t <= 0) continue;
      var d = swellDepth(L.role);
      if (d <= 0) continue;
      for (var a = 0; a < 360; a += 6) {
        var m = Math.abs(fieldAt(a * Math.PI / 180, "swell", 0, swellBlend) * d) * t;
        if (m > swellCapV) swellCapV = m;
      }
    }
    swellCapV *= SWELL_INTERIOR;
    return swellCapV;
  }

  /* WHICH ROLES THE SWELL IS ANCHORED TO — published so the consumer can
   * tell a skin from the interior beneath it.
   *
   * It needs to, and measuring is what showed why. This is D131 arriving
   * from the other side and it is worth the space.
   *
   * "A proportion of the layer's own thickness" is the right unit for a
   * SKIN — it is the whole reason this field is not stated in body radii.
   * But the same unit makes a small proportion of a very THICK layer a very
   * large displacement, and the layers below the anchored skin are the thick
   * ones. Measured on a main star at full lock, with the depth falloff
   * already doing its job:
   *
   *   photosphere  0.36 of a 0.062 layer  ->  2.3% of the body radius
   *   convective   0.15 of a 0.519 layer  ->  7.9% of the body radius
   *
   * So the interior deformed more than three times as hard as the skin the
   * feature is about, while every proportion in the recipe said the
   * opposite. That is the "a proportion is only calibrated for what it's a
   * proportion of" trap (D93, D75, D119), and the falloff cannot catch it
   * because the falloff is a proportion too.
   *
   * The fix has to be stated in the unit the problem is in — body radii —
   * so it belongs where the thicknesses are known, which is the renderer,
   * not here. This file publishes the list; draw/scene.js caps against it. */
  var swellAnchored = {};
  (function () {
    var list = spec.swellAnchor || spec.anchor || [];
    for (var i = 0; i < list.length; i++) swellAnchored[list[i]] = true;
  })();

  /* THE SWELL'S OWN DEPTH LIST, AND IT IS DELIBERATELY NOT `anchor`.
   *
   * The obvious move is to add `photosphere` to the recipe's `anchor` and
   * let `strengthFor` do the work. Measured, that is wrong: `anchor` is
   * shared by `air`, `temp` and `colorShift`, and extending it deepens all
   * three at once. On a main star the convective zone's factor goes
   * 0.209 -> 0.380 — the interior visibly picking up the terminator, which
   * is the one outcome the whole axis was designed to avoid (D84), arriving
   * as a side effect of a change about geometry.
   *
   * So the swell declares `swellAnchor` separately. The two lists say
   * different things and there is no reason they should agree: how far down
   * a hot face TINTS is a question about light, and how far down a bulge
   * DEFORMS is a question about matter.
   *
   * Falls back to `anchor` when the recipe declares no separate list, so a
   * recipe that wants the two to coincide simply omits it. */
  var swellByRole = null;
  function swellDepth(role) {
    if (!spec.swellAnchor) {
      /* No separate list: the swell rides the shared anchor, which is what
       * a recipe with one story about depth should get. */
      return strengthFor(role);
    }
    if (!swellByRole) {
      var sub = { anchor: spec.swellAnchor || spec.anchor,
                  residue: spec.swellResidue === undefined ? 0 : spec.swellResidue };
      swellByRole = {};
      for (var s = 0; s < order.length; s++) {
        swellByRole[order[s]] = CC.ZoneGeom.depthFalloff(sub, order[s], order);
      }

      /* `swellResidue: 0` MUST MEAN ZERO, and `depthFalloff` alone does not
       * deliver that.
       *
       * The shared falloff ramps `lerp(0.86, residue, k)` below the anchor
       * list, so the layer immediately beneath an anchor starts at 0.86 and
       * only approaches the residue further down. That is right for a COLOUR
       * tint — a hard seam at the anchor's edge would read as a drawn contour
       * — and wrong for a GEOMETRIC swell, where the question is not "how
       * much tint reaches here" but "does this material flex at all".
       *
       * The ice moon is the case that shows it: only the shell flexes, and
       * the rock crust beneath it does not, on any timescale worth drawing.
       * Measured with `swellResidue: 0` and the shell as the sole anchor, the
       * crust was still swelling -0.032 to +0.024 — a sea floor rippling
       * because the ice above it was being kneaded.
       *
       * So an explicit zero residue CLAMPS to the anchor list rather than
       * decaying toward it. Only reached when a recipe asks for exactly 0,
       * so every existing swell — both giants, all four stars — keeps the
       * gradual falloff it was tuned with. */
      if (spec.swellResidue === 0) {
        var listed = {};
        var la = spec.swellAnchor || spec.anchor || [];
        for (var li = 0; li < la.length; li++) listed[la[li]] = true;
        for (var rk in swellByRole) {
          if (!Object.prototype.hasOwnProperty.call(swellByRole, rk)) continue;
          if (!listed[rk]) swellByRole[rk] = 0;
        }
      }
    }
    var d = swellByRole[role];
    if (d === undefined) d = 0;
    return d * intensity;
  }
    return { swellAt: swellAt, anchored: swellAnchored };
  }

  return { build: build, SWELL_INTERIOR: SWELL_INTERIOR };
})();
