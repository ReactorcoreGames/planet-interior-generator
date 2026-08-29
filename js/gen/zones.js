/* Angular zones — a recipe turned into fields a consumer can sample.
 *
 * A zone divides a body into angular sectors, each perturbing whatever the
 * layer already rolled. TIDAL LOCKING IS NOT A TRAIT: it is a universal axis
 * declared in `archetype.axes`, because it changes values in the stack rather
 * than the stack itself, which is what TRAIT-SYSTEM.md's third test asks. It
 * shipped as a trait first and that was a violation of the project's own rule
 * (PROGRESS.md D27). Polar vortices, binary heating and tilted axes are the
 * same mechanism with different data.
 *
 * The angular MACHINERY — arcs, placement, cross-fade, depth falloff — lives
 * in gen/zonegeom.js. This file turns a recipe into the fields consumers
 * actually sample:
 *
 *   shiftAt(angle, role, baseV)  an HSV DELTA for detail elements
 *   reliefAt(angle)              terrain amplitude multiplier
 *   seaAt(angle)                 signed sea-level offset  <- the centre of it
 *   snowAt(angle)                signed snowline offset
 *   airAt(angle)                 atmosphere thickness multiplier
 *   swellAt(angle, role)         banded-layer boundary offset, in units of
 *                                that layer's OWN thickness
 *   coverAt(angle)               how much frosting survives
 *   thinAt(angle)                how many of the layer's own elements survive
 *   tempAt(angle, base)          surface temperature 0..1  <- what it IS
 *   surfaceStateAt(angle, base)  "boiled" | "hot" | ... | "frozen"
 *
 * TWO RULES, BOTH LOAD-BEARING.
 *
 * 1. ZONES PERTURB, THEY DO NOT REPLACE. Every figure is a delta or a
 *    multiplier against what the body already rolled, never an absolute
 *    value. That is what makes one recipe work on a rocky planet, a gas giant
 *    and a star alike: a blue world's hot face is a hot BLUE.
 *
 * 2. THE PICTURE EMERGES; IT IS NOT PAINTED. An earlier version washed an HSV
 *    tint over the layer bands, which was a description of tidal locking
 *    rather than a consequence of it. The fields above feed the terrain and
 *    frosting systems instead, so a locked world is cold at one end because
 *    snow DEPOSITS there and hot at the other because the sea has BOILED OFF.
 *
 * WHERE THIS RUNS. In the GENERATION stage. gen/details.js resolves per-
 * element membership and converts sea level into body space; only the
 * frosting, which walks its own circumference, samples at draw time. Either
 * way `draw/` receives plain numbers and functions of angle and never learns
 * what a zone is (D23).
 *
 * Everything here is body space and angles in radians. */

var CC = CC || {};

CC.Zones = (function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp, lerp = M.lerp;
  var TAU = M.TAU;


  /* ---- build ------------------------------------------------------------ */

  /* Build the zone field for a body.
   *
   * Returns null when nothing zones it, so every consumer can cheaply skip the
   * whole system with one truthiness check and an unzoned body pays nothing.
   *
   * `spec`   the zone recipe from data/traits.js
   * `body`   the built stack, for its declared colour order
   * `params` the user's controls, for intensity and facing
   */
  /* `axis` is the archetype's declaration: {param, facing, field}. The field
   * carries the arcs and the per-zone figures; the two keys say which settings
   * drive it. Passing the axis rather than the field keeps that pairing in one
   * place — a second angular axis is then purely a data edit. */
  function build(axis, body, order, params, seed) {
    if (!axis) return null;
    var spec = axis.field || axis;

    /* AN AXIS MAY DECLARE A DIFFERENT FIELD FOR A DIFFERENT STACK.
     *
     * `field_when: { "ice-shell": {...} }` — when the named layer was built,
     * that recipe replaces the default one. The sibling of `frac_when` in the
     * stack and `film_when` in the colour profile, resolved the same way and
     * for the same reason: the moon is one archetype with two stacks, and a
     * recipe written for one of them can be actively wrong on the other.
     *
     * The case that forced it: the planet's recipe moves SEA LEVEL by bearing,
     * which is the centre of the whole feature on a world whose sea is on top
     * — it boils off the hot face and cold-traps on the night one. Under an
     * ice shell that is incoherent. A subsurface ocean has no exposed surface
     * to evaporate from and nowhere to retreat TO, and the shell above it is a
     * rigid layer at a fixed radius, so moving the sea drew an unsupported lid
     * spanning a void. Measured before the fix: sea level swung 0.149 of the
     * body radius across a locked ice moon.
     *
     * Resolved here rather than in the archetype because `build` is where the
     * body is known; the archetype cannot see which branch it rolled. */
    if (spec && spec.field_when && body && body.has) {
      for (var fwKey in spec.field_when) {
        if (!Object.prototype.hasOwnProperty.call(spec.field_when, fwKey)) continue;
        if (body.has(fwKey)) { spec = spec.field_when[fwKey]; break; }
      }
    }

    if (!spec || !spec.zones || !spec.zones.length) return null;
    spec = {
      id: spec.id, axis: spec.axis, anchor: spec.anchor,
      residue: spec.residue, blend: spec.blend, zones: spec.zones,
      /* The swell's own depth list — see gen/zoneswell.js for why it is
       * separate from `anchor` rather than an extension of it. Carried
       * explicitly because this rebuild is a whitelist, and a key that is not
       * named here is silently dropped. */
      swellAnchor: spec.swellAnchor, swellResidue: spec.swellResidue,
      swellBlend: spec.swellBlend,
      param: axis.param || spec.param,
      facing: axis.facing || spec.facing
    };

    /* WHICH SETTING DRIVES THIS, AND IT DEFAULTS TO ZERO.
     *
     * The spec names its own parameter, so a second angular axis (a polar
     * vortex, a binary companion) is a data edit. Zero by default because this
     * is a universal axis now rather than an opted-in trait: an unzoned body
     * must be what you get unless the user asks otherwise, and `build`
     * returning null is what guarantees the whole system costs nothing there. */
    var iKey = spec.param || "zoneIntensity";
    var intensity = params[iKey] === undefined ? 0 : params[iKey];
    if (intensity <= 0) return null;

    var rng = CC.RNG.stream(seed, "zones/" + spec.id);

    /* WHERE THE HOT FACE POINTS, rolled per body unless the user aimed it.
     * Without a roll every locked world renders identically oriented, which
     * makes the trait read as a template rather than as a property of the
     * body. Placed in generation space, so it rotates with the final global
     * rotation — which is correct. */
    var fKey = spec.facing || "zoneFacing";
    var offset = (params[fKey] === undefined || params[fKey] === null)
      ? rng() * 360
      : params[fKey];

    var arcs = CC.ZoneGeom.resolveArcs(spec, intensity);
    var placed = CC.ZoneGeom.layout(arcs, offset);
    var blend = spec.blend === undefined ? 0.25 : spec.blend;

    /* THE SWELL GETS ITS OWN CROSS-FADE WIDTH, and it needs a wider one than
     * the colour does.
     *
     * A zone holds its declared figure FLAT across its arc and blends only at
     * the edges, so the steepness of a transition is set by `blend`. For
     * `colorShift` and `temp` a narrow terminator is correct and wanted — the
     * day/night boundary on a locked world should be a band, not a smear.
     *
     * Geometry cannot afford it. The same width that reads as a crisp
     * terminator in COLOUR draws as a faceted KINK in an OUTLINE, because the
     * eye resolves a discontinuity in a silhouette far more sharply than one
     * in a tint. Measured on a main star at the calibrated amplitudes, the
     * shared 0.30 gave 0.056 of the layer's thickness per degree at the
     * night/twilight edge — a visible crease — where 0.60 gives 0.028.
     *
     * So it is a separate number for the same reason `swellAnchor` is a
     * separate list: light and matter are being asked different questions and
     * there is no reason their answers should share a figure. Falls back to
     * `blend` when a recipe declares nothing. */
    var swellBlend = spec.swellBlend === undefined ? blend : spec.swellBlend;

    /* Per-role depth factors, resolved once. Cheaper than recomputing per
     * element, and it keeps the declared-order lookup in one place. */
    var byRole = {};
    for (var i = 0; i < order.length; i++) {
      byRole[order[i]] = CC.ZoneGeom.depthFalloff(spec, order[i], order);
    }

    var zones = spec.zones;
    var scratch = [];
    for (i = 0; i < zones.length; i++) scratch.push(0);

    /* The strength every effect is scaled by: the dial, times how deep we are.
     *
     * `intensity` scales the EFFECT as well as the arcs. Interpolating the
     * arcs alone would mean a barely-locked world still had a full-strength
     * colour shift over its (very wide) warm face, which reads as a strongly
     * coloured planet rather than a weakly locked one. */
    function strengthFor(role) {
      var d = byRole[role];
      if (d === undefined) d = spec.residue === undefined ? 0.12 : spec.residue;
      return d * intensity;
    }

    /* THE COLOUR DELTA at an angle and depth. A delta, never a colour — see
     * rule 1 in the file header. Blended across zones by the same weights
     * everything else uses, so the terminator is a gradient in colour exactly
     * as it is in everything else. */
    function shiftAt(angle, role, baseV) {
      CC.ZoneGeom.weightsAt(placed, blend, angle, scratch);
      var s = strengthFor(role);
      var dh = 0, ds = 0, dv = 0;
      for (var z = 0; z < zones.length; z++) {
        var w = scratch[z];
        if (w <= 0) continue;
        var cs = zones[z].colorShift;
        if (!cs) continue;
        dh += (cs.hue || 0) * w;
        ds += (cs.sat || 0) * w;
        dv += (cs.val || 0) * w;
      }

      dh *= s; ds *= s; dv *= s;

      /* THE VALUE DELTA IS LIMITED BY THE ROOM THE LAYER ACTUALLY HAS.
       *
       * An authored -0.30 assumes a layer with 0.30 of headroom beneath it,
       * and a planet's crust sits around v=0.25 — so the nightside came out at
       * 0.06, which is not a cold hemisphere but a hole in the picture. The
       * hot face has the same problem at the top of the range on a bright
       * layer.
       *
       * This is the same trap draw/details.js documents for detail elements:
       * a step authored as an absolute number is wrong on layers that have
       * nowhere to go. The recipe still says "much darker" and "much
       * brighter"; how much darkness is available is a property of the layer,
       * so the delta is scaled into the space that exists rather than clipped
       * against the end of it.
       *
       * A floor is kept so a dark layer's night side still visibly differs —
       * the point is to avoid a black hemisphere, not to erase the zone. */
      if (baseV !== undefined && dv !== 0) {
        /* THE LIMIT MUST BE CONTINUOUS ACROSS THE SIGN CHANGE.
         *
         * Picking `room` by the sign of dv — headroom below when darkening,
         * above when brightening — makes the limit jump the instant dv
         * crosses zero, because the two are very different on any layer that
         * is not mid-grey. On a crust at v=0.69 that put a 0.10 step at a
         * single angle: a hard edge in the middle of the twilight band,
         * exactly the artifact the cross-fade exists to prevent, arriving by
         * way of the fix for a different problem.
         *
         * Blending the two rooms across the crossing keeps the whole curve
         * smooth. `t` runs 0 (fully darkening) to 1 (fully brightening) over
         * a small band around zero, so away from the crossing each direction
         * still gets its own true headroom. */
        var down = Math.max(0, baseV - 0.06);
        var up = Math.max(0, 0.97 - baseV);
        var t = clamp(dv / 0.12 * 0.5 + 0.5, 0, 1);
        t = t * t * (3 - 2 * t);
        var room = lerp(down, up, t);

        /* A SOFT KNEE, APPLIED EVERYWHERE — never a branch at the limit.
         *
         * The first version passed `want` through untouched below `room` and
         * switched to an exponential above it. Those two do not meet: at
         * exactly `room` the curve jumps from `room` down to `room*(1-1/e)`,
         * a 37% drop at one angle. On a bright crust that put a 0.10 step in
         * the middle of the twilight band — a hard edge produced by the code
         * that limits the deltas, not by the zone field, which is why the
         * weights probed perfectly smooth while the render did not.
         *
         * `room * (1 - exp(-want/room))` is smooth over the WHOLE range: it
         * is almost exactly `want` while want << room, and saturates gently
         * toward `room` beyond it. One expression, no threshold, continuous
         * by construction. */
        var want = Math.abs(dv);
        want = room * (1 - Math.exp(-want / Math.max(1e-4, room)));
        dv = (dv < 0 ? -1 : 1) * want;
      }

      return { h: dh, s: ds, v: dv };
    }

    /* TERRAIN AMPLITUDE at an angle.
     *
     * A zone may declare `relief`: 1 leaves the field alone, below 1 flattens
     * it, above 1 exaggerates it. A molten dayside should read as smoother
     * than a frozen nightside, and this is the whole mechanism — gen/terrain.js
     * multiplies it in and nothing in draw/ changes.
     *
     * Depth is not consulted: terrain belongs to one layer's surface, and the
     * layer that carries it is by definition the one the zone anchors to. */
    function reliefAt(angle) { return fieldAt(angle, "relief", 1); }

    /* SEA LEVEL OFFSET at an angle, and this is the centre of the feature.
     *
     * Signed, in units of the terrain's own range — the same units film.js's
     * SNOWLINE and SHELF already use, so the numbers are directly comparable.
     * Everything downstream measures elevation RELATIVE TO SEA LEVEL, which
     * means moving it by angle does four jobs with no new drawing code:
     *
     *   the ocean pinches      (its top drops below the terrain trough)
     *   the snowline drops     (elevation reads higher against a lower sea)
     *   the shoreline moves    (the same crossing, at a different radius)
     *   the shelf follows      (SHELF is an offset from this)
     *
     * Eases toward 0 rather than 1: no offset is the unzoned state. */
    function seaAt(angle) { return fieldAt(angle, "sea", 0); }

    /* SNOWLINE OFFSET at an angle, and it is deliberately NOT derived from
     * `sea`. Lowering sea level makes terrain read as high ground, and high
     * ground is where snow goes — so driving the snowline from sea level put
     * snow on the *baked* face. Where the water is and how cold it is are
     * different facts; on a locked world the second is a property of which way
     * the face points. Negative drags the snowline down toward the sea. */
    function snowAt(angle) { return fieldAt(angle, "snow", 0); }

    /* ATMOSPHERE THICKNESS multiplier. A locked world's air is stripped off
     * the baked face and freezes out on the night face, so the twilight band
     * is where it is thickest. */
    function airAt(angle) { return fieldAt(angle, "air", 1); }



    /* THE TIDAL SWELL, built in gen/zoneswell.js.
     *
     * It is the only field with its own depth list, its own cross-fade width
     * and a cap of its own, which is what made it a real seam rather than a
     * byte-count split when this file crossed 500 lines (D128). It is handed
     * `fieldAt` and `strengthFor` rather than reimplementing them, so there
     * is still exactly one sampler and one shared depth factor. */
    var swell = CC.ZoneSwell.build({
      spec: spec, body: body, order: order, intensity: intensity,
      swellBlend: swellBlend, fieldAt: fieldAt, strengthFor: strengthFor
    });
    var swellAt = swell.swellAt;
    var swellAnchored = swell.anchored;

    /* HOW MUCH FROSTING SURVIVES at an angle, as opposed to which kind. The
     * zone weights decide the material; this decides whether there is any —
     * a scoured dayside is bare rock, which is a statement about quantity. */
    function coverAt(angle) { return fieldAt(angle, "cover", 1); }

    /* HOW MANY OF A LAYER'S OWN ELEMENTS SURVIVE at an angle. 1 is all of
     * them, 0 is none.
     *
     * `coverAt` IS NOT THIS, though the two look alike. Cover is about
     * FROSTING — a film deposited on a surface — and it is consumed by
     * gen/frosting.js alone. This is about the layer's DETAIL: the plumes,
     * cells, streaks and speckles the element stage scatters. A zone that
     * scours snow off a dayside is not the same statement as a zone where
     * the layer itself is doing less.
     *
     * WHAT IT WAS BUILT FOR, and the reasoning generalises past it. A coronal
     * hole is a sector where the magnetic field is open and the wind escapes
     * freely, so there are simply FEWER PLUMES THERE — the feature is an
     * absence in a field, not a dark shape laid over one.
     *
     * IT HAS TO BE AN ABSENCE, because the corona is drawn with a `screen`
     * blend (ATMOSPHERE_BLEND in draw/scene.js) and under `screen` dark paint
     * is very nearly a no-op: it can only ever ADD light. That is why the
     * first implementation had to be a flat, hard-edged, unfaded `darker`
     * wedge — a soft dark region on a screen-blended layer is invisible, which
     * is D121s `dust-formation` failure (maxdelta 19) waiting to happen a
     * second time. Removing elements works WITH the blend instead of against
     * it, and needs no dark paint at all.
     *
     * Neutral 1, because it is a multiplier on a count. */
    function thinAt(angle) { return fieldAt(angle, "thin", 1); }

    /* SURFACE TEMPERATURE at an angle, 0 (frozen) .. 1 (scorching).
     *
     * THE ONE FIELD THAT SAYS WHAT THE MATERIAL *IS*, rather than where it
     * goes. Everything above moves things around — the sea, the snowline, the
     * air, the terrain amplitude — and none of it can answer "is this ice or
     * is this sand", because that is a question about the substance rather
     * than its position. Which is why a locked world's night cap was placed
     * correctly and still painted in the family hue: `arid` in gen/frosting.js
     * is one global scalar with no angular term, so the frosting could not
     * know which face it was on.
     *
     * It is a PERTURBATION of the body's own climate, exactly like every other
     * field here (rule 1): `base` is what the world would be unzoned, and the
     * recipe's `temp` shifts it per face. A hot world's night side is milder
     * than a cold world's, and neither becomes the other.
     *
     * Consumed by gen/frosting.js for colour, by gen/details.js for erosion,
     * and by the surface-state read below for text. One source, so those three
     * can never disagree about which face is which. */
    function tempAt(angle, base) {
      var b = base === undefined ? 0.5 : base;
      /* `temp` is a signed offset in the same 0..1 space, so a recipe reads
       * "+0.45 on the dayside" rather than an absolute temperature that would
       * be wrong on every world but one. */
      return clamp(b + fieldAt(angle, "temp", 0), 0, 1);
    }

    /* WHAT STATE THE SURFACE VOLATILE IS IN at an angle.
     *
     * Named states rather than a number, because the consumers are text and
     * colour rather than geometry — an info card wants "boiled away", not
     * 0.87. Derived from the same `tempAt` the picture is drawn from, so the
     * card can never contradict the render (HAZARDS.md's standing rule).
     *
     * The thresholds are deliberately wide: the interesting reading is which
     * BAND a face is in, and a hairline between "liquid" and "boiling" would
     * make the label flicker between neighbouring bearings. */
    function surfaceStateAt(angle, base) {
      var t = tempAt(angle, base);
      if (t >= 0.82) return "boiled";
      if (t >= 0.62) return "hot";
      if (t >= 0.34) return "temperate";
      if (t >= 0.18) return "cold";
      return "frozen";
    }

    /* One sampler for every per-angle scalar the recipe declares.
     *
     * `neutral` is the value that means "no effect", which is what the field
     * eases toward as the dial falls — 1 for a multiplier, 0 for an offset.
     * Zones that omit the key take the neutral value, so a recipe only
     * declares what it actually changes. */
    function fieldAt(angle, key, neutral, blendOverride) {
      CC.ZoneGeom.weightsAt(placed,
        blendOverride === undefined ? blend : blendOverride,
        angle, scratch);
      var m = 0, any = false;
      for (var z = 0; z < zones.length; z++) {
        var w = scratch[z];
        if (w <= 0) continue;
        any = true;
        var v = zones[z][key];
        m += (v === undefined ? neutral : v) * w;
      }
      if (!any) return neutral;
      return lerp(neutral, m, clamp(intensity, 0, 1));
    }

    /* Which zone dominates at an angle, and by how much. For stats and for
     * traits that declare `zoneBias`. */
    function atAngle(angle) {
      CC.ZoneGeom.weightsAt(placed, blend, angle, scratch);
      var best = 0;
      for (var z = 1; z < zones.length; z++) {
        if (scratch[z] > scratch[best]) best = z;
      }
      return { id: zones[best].id, weight: scratch[best], index: best };
    }

    /* Total weight of one named zone at an angle — what `zoneBias` samples
     * when a trait wants its instances to cluster into the twilight band. */
    function weightOf(id, angle) {
      CC.ZoneGeom.weightsAt(placed, blend, angle, scratch);
      var total = 0;
      for (var z = 0; z < zones.length; z++) {
        if (zones[z].id === id) total += scratch[z];
      }
      return total;
    }

    return {
      id: spec.id,
      label: spec.label,
      intensity: intensity,
      offset: offset,
      blend: blend,
      /* The resolved arcs in degrees, so stats and tests can report what the
       * dial actually produced rather than re-deriving it. */
      arcs: arcs,
      zones: zones,
      shiftAt: shiftAt,
      reliefAt: reliefAt,
      seaAt: seaAt,
      snowAt: snowAt,
      airAt: airAt,
      swellAt: swellAt,
      swellAnchored: swellAnchored,
      coverAt: coverAt,
      /* How many of a layer's own elements survive at a bearing. See above —
       * this is the layer's DETAIL, not the frosting `coverAt` governs. */
      thinAt: thinAt,
      tempAt: tempAt,
      surfaceStateAt: surfaceStateAt,
      at: atAngle,
      weightOf: weightOf,
      strengthFor: strengthFor
    };
  }

  return {
    build: build,
    /* The geometry helpers are re-exported so callers and tests keep one
     * import site, even though they now live in gen/zonegeom.js. */
    resolveArcs: CC.ZoneGeom.resolveArcs,
    layout: CC.ZoneGeom.layout,
    weightsAt: CC.ZoneGeom.weightsAt,
    depthFalloff: CC.ZoneGeom.depthFalloff
  };
})();
