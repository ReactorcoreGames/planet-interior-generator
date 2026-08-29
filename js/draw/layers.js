/* The generic layer renderer.
 *
 * This file must contain NO archetype-specific logic. It draws whatever the
 * structure stage produced: concentric bands with a per-layer boundary
 * character. If a body type ever needs a branch in here, the design has gone
 * wrong — the fix belongs in the archetype data, not in this file.
 *
 * Everything is in body space until it touches `view`, which is the only thing
 * that knows about pixels. */

var CC = CC || {};

CC.Layers = (function () {
  "use strict";

  var TAU = CC.Math.TAU;

  /* How many segments a wobbled boundary is drawn with. Fixed, not derived
   * from pixel size: the boundary must be the same shape at every resolution.
   * Perfect circles bypass this entirely and use arc(). */
  var BOUNDARY_SEGMENTS = 240;

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

  /* Trace a layer's outer boundary as a path. Does not fill or stroke.
   *
   * `reverse` traces the same shape the other way round, which is what an
   * even-odd clip needs for the inner edge of an annulus. */
  function traceBoundary(ctx, view, radius, wob, reverse) {
    if (!wob) {
      /* moveTo first so this starts its OWN subpath. Without it, an arc()
       * following an earlier subpath is joined to it by a straight line,
       * which turns an even-odd clip into a bowtie and silently drops
       * whatever was meant to be drawn inside it. */
      var r = view.px(radius);
      ctx.moveTo(view.cx + r, view.cy);
      ctx.arc(view.cx, view.cy, r, 0, TAU, !!reverse);
      return;
    }
    for (var i = 0; i <= BOUNDARY_SEGMENTS; i++) {
      var k = reverse ? (BOUNDARY_SEGMENTS - i) : i;
      var a = (k / BOUNDARY_SEGMENTS) * TAU;
      var p = view.at(radius * wob(a), a);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
  }

  /* Combine a layer's boundary wobble with an optional relief field.
   *
   * Wobble and relief are the same kind of thing at different scales — both
   * are periodic angular noise — so they compose into one radius function
   * rather than needing separate code paths. This is what lets a star's
   * granulation, a moon's craters and a planet's continents all be the same
   * mechanism (PROGRESS.md D15).
   *
   * Returns null when the boundary is a plain circle, so callers keep the
   * cheap arc() path. */
  function reliefFn(layer, seed, terrain, scale) {
    var wob = boundaryFn(layer, seed);
    if (!terrain) return wob;

    var k = (scale === undefined) ? 1 : scale;
    if (k <= 0) return wob;

    var outer = layer.outer;
    if (wob) {
      return function (angle) {
        return wob(angle) + (terrain.at(angle) * k) / outer;
      };
    }
    return function (angle) {
      return 1 + (terrain.at(angle) * k) / outer;
    };
  }

  /* Compose an angular LEVEL offset onto a boundary — a fluid whose surface is
   * not flat.
   *
   * A sea normally has a flat top, which is why the ocean's boundary is a
   * plain circle. On a tidally locked world it is not: the water boils off the
   * baked face and pools on the frozen one, so sea level is a function of
   * angle. `seaFn(angle)` returns a body-space DISPLACEMENT (a level line is
   * an absolute height, not a proportion), which is divided by the radius here
   * because boundary functions return a multiplier.
   *
   * Same shape as `reliefFn` above, and composes with it: relief displaces the
   * rock, this displaces the water, and the crossing of the two is still the
   * coastline (D15). */
  function levelFn(layer, base, seaFn) {
    if (!seaFn) return base;
    var outer = layer.outer;
    if (base) {
      return function (a) { return base(a) + seaFn(a) / outer; };
    }
    return function (a) { return 1 + seaFn(a) / outer; };
  }

  /* Close a fluid to nothing where it would render thinner than a pixel.
   *
   * D21 fixed the sub-pixel sea by fading its ALPHA, which works when the
   * whole layer is thin. An ANGULAR sea is sub-pixel over only part of its
   * circumference, and a global alpha would either fade the entire ocean or
   * leave a bright hairline along the pinch — the same "stray drawn line"
   * artifact D21 exists to prevent, arriving by a different route.
   *
   * So the remedy here is geometric rather than tonal: where the gap between
   * the fluid's top and the rock below is under `minPx`, the top is pulled
   * down to meet the floor and the region encloses zero area. The fluid closes
   * to nothing exactly as it does at Ocean depth 0, and there is no sliver
   * left to draw.
   *
   * This is the one boundary function that needs `view`, because "how thin is
   * too thin" is a question about rendered pixels — the renderer is the only
   * stage that knows how many pixels a body-space thickness became. It stays
   * resolution-independent in the sense that matters: the same body gets the
   * treatment its own apparent size calls for. */
  function pinchFn(view, topR, topFn, floorR, floorFn, minPx) {
    var min = minPx === undefined ? 1.2 : minPx;
    return function (a) {
      var top = topR * (topFn ? topFn(a) : 1);
      var floor = floorR * (floorFn ? floorFn(a) : 1);
      var gapPx = view.px(top) - view.px(floor);
      if (gapPx >= min) return top / topR;
      /* Ease the last pixel shut rather than snapping, so the shoreline
       * arrives smoothly instead of stepping to nothing. */
      var t = gapPx <= 0 ? 0 : (gapPx / min);
      var eased = t * t * (3 - 2 * t);
      var closed = floor + (top - floor) * eased;
      return closed / topR;
    };
  }

  /* Clip subsequent drawing to a layer's band, honouring both boundaries.
   *
   * Detail elements are placed within a layer's thickness, but a wobbled or
   * relief-displaced boundary means "within the thickness" is not a plain
   * annulus. Clipping to the real shape is what stops speckle and veins
   * spilling across a boundary into the layer above.
   *
   * The caller is responsible for ctx.save()/restore() around this. */
  function clipToLayer(ctx, view, layer, seed, outerFn) {
    var outerWob = outerFn || boundaryFn(layer, seed);

    ctx.beginPath();
    traceBoundary(ctx, view, layer.outer, outerWob, false);

    if (layer.inner > 0) {
      /* The inner edge is the NEXT layer's outer boundary, so it must be
       * traced with that layer's own wobble or the two will disagree and leave
       * a crescent gap. The caller passes it via layer.innerFn when the
       * neighbour wobbles. */
      traceBoundary(ctx, view, layer.inner, layer.innerFn || null, true);
    }

    ctx.clip("evenodd");
  }

  /* Fill a layer as a disc down to radius 0. Layers are drawn outermost
   * first, so each inner layer paints over the middle of the one above and
   * the result reads as a stack of bands. Cheaper than an annulus and it
   * avoids hairline seams between adjacent bands. */
  function fillLayer(ctx, view, layer, style, seed, outerFn) {
    var wob = outerFn === undefined ? boundaryFn(layer, seed) : outerFn;

    ctx.save();
    ctx.beginPath();
    traceBoundary(ctx, view, layer.outer, wob);
    ctx.fillStyle = style;
    ctx.globalAlpha = layer.opacity;
    ctx.fill();
    ctx.restore();
  }

  /* The line marking a layer's outer edge. */
  function strokeBoundary(ctx, view, layer, style, width, seed, outerFn) {
    if (layer.boundary === "soft-gradient") return;
    var wob = outerFn === undefined ? boundaryFn(layer, seed) : outerFn;

    ctx.save();
    ctx.beginPath();
    traceBoundary(ctx, view, layer.outer, wob);
    ctx.strokeStyle = style;
    ctx.lineWidth = view.lw(width === undefined ? 1 : width);
    ctx.stroke();
    ctx.restore();
  }

  /* How many stops the outward falloff is sampled at. A canvas gradient
   * interpolates linearly between stops, so a curve has to be sampled. */
  var FALLOFF_STOPS = 14;

  /* The falloff curve for an outward layer.
   *
   * `t` runs 0 at the surface to 1 at the outer edge; the result is an alpha
   * multiplier. This is an ease-out: the layer holds most of its opacity
   * through the inner two-thirds and does nearly all of its fading in the
   * last third. That is what makes a correctly-sized atmosphere read as a
   * substantial layer — a linear ramp, or the fast-decaying stops this
   * replaced, makes it look thin and weak no matter how thick it is.
   *
   * `hold` is the fraction of the depth carried near-full before the taper
   * starts. The taper is a smoothstep, so there is no visible crease where it
   * begins. */
  function falloffAlpha(t, hold) {
    hold = hold === undefined ? 0.30 : hold;
    if (t <= 0) return 1;
    if (t >= 1) return 0;

    /* Near the surface the atmosphere is dense enough to read as a layer,
     * with a real sag so it has air in it rather than looking like a solid
     * band. This has been tuned in both directions: too much hold makes a
     * hard shell, too little makes a vague haze that blurs the silhouette. */
    if (t < hold) return 1 - 0.30 * (t / hold);

    /* Then a long ease-out. The extra (1 - u) factor keeps the outer half
     * thin, so the edge dissolves into the background instead of stopping —
     * but the inner part still carries enough weight to be a layer. */
    var u = (t - hold) / (1 - hold);
    var eased = u * u * (3 - 2 * u);
    return 0.70 * (1 - eased) * (1 - u * 0.35);
  }

  /* An outward layer — atmosphere, corona, halo — drawn as a radial falloff
   * from the surface rather than a filled band, so it reads as a layer with
   * genuine depth rather than a glow ring.
   *
   * `style.at(alpha, t)` returns the layer's colour at that alpha, where `t`
   * runs 0 at the surface to 1 at the outer edge so the supplier can vary the
   * colour with height as well as the opacity. `style.hold` optionally
   * overrides where the taper starts.
   *
   * `style.composite` sets a canvas blend mode for this layer only. A gas
   * shell scatters light rather than painting over what is behind it, so
   * "screen" or "lighter" makes it brighten whatever it covers instead of
   * hiding it — which is what stops a thick atmosphere reading as a solid
   * band. The call is inside save()/restore(), and restore() resets the
   * composite, so it cannot leak into later drawing. */
  /* How finely an ANGULAR outward layer's edge is walked. Only used when the
   * layer's thickness genuinely varies by angle; the uniform case keeps the
   * single-arc path below, which is cheaper. */
  var OUTWARD_STEPS = 240;

  /* How many nested rings the angular falloff is built from.
   *
   * The uniform case gets its falloff free from a radial gradient. The angular
   * case cannot: a radial gradient is circular by definition, so the falloff
   * has to be reconstructed by compositing. Each ring is the layer's outline
   * scaled toward the surface, filled flat at that step's alpha, and the stack
   * of them reproduces the same curve.
   *
   * Enough steps that the bands are sub-pixel at ordinary sizes; too few and
   * the atmosphere reads as contour lines. */
  var OUTWARD_RINGS = 22;

  function fillOutward(ctx, view, layer, innerRadius, style, thicknessAt) {
    var r0 = view.px(innerRadius);
    var r1 = view.px(layer.outer);
    if (r1 <= r0) return;

    ctx.save();
    if (style.composite) ctx.globalCompositeOperation = style.composite;
    ctx.globalAlpha = layer.opacity;

    /* THE UNIFORM CASE: one disc, one radial gradient.
     *
     * A radial gradient cannot vary by angle, which is exactly why the angular
     * case below cannot use one. Kept as the fast path because most bodies do
     * not zone their atmosphere at all. */
    if (!thicknessAt) {
      var g = ctx.createRadialGradient(view.cx, view.cy, r0, view.cx, view.cy, r1);
      for (var i = 0; i <= FALLOFF_STOPS; i++) {
        var t = i / FALLOFF_STOPS;
        g.addColorStop(t, style.at(falloffAlpha(t, style.hold), t));
      }
      ctx.beginPath();
      ctx.arc(view.cx, view.cy, r1, 0, TAU);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
      return;
    }

    /* THE ANGULAR CASE — AN ATMOSPHERE THAT IS NOT A CIRCLE.
     *
     * A tidally locked world's air is not a uniform shell: it inflates over
     * the heated face and collapses where it freezes out, so the outer edge is
     * genuinely egg-shaped. That is a GEOMETRIC fact, and it has to be drawn
     * as geometry — the previous attempt erased alpha inside a circular disc
     * with `destination-out`, which cannot move an edge that is already
     * transparent there, so the silhouette stayed a perfect circle at every
     * lock setting (measured: 2.5px of variation at 0%, 50% and 100% alike).
     *
     * NESTED WHOLE RINGS, NEVER PIE SLICES.
     *
     * The obvious construction — one wedge per bearing, each with its own
     * radial gradient, closed through the centre — does produce the right
     * silhouette and is wrong anyway: adjacent slices share a long radial
     * edge, and antialiasing along every one of those seams accumulates into
     * visible SPOKES radiating from the middle of the body. That is the same
     * artifact draw/zonepaint.js documents twice, arriving by a third route,
     * and it is invisible in the finished picture only because the body is
     * painted over it.
     *
     * So the layer is drawn as a stack of complete closed outlines instead.
     * Each ring is the angular edge scaled toward the surface by `t`, filled
     * flat at `falloffAlpha(t)`, painted outermost-inward. Every ring is one
     * continuous path with no internal edges, so there is nothing for a seam
     * to form along, and the accumulated stack reproduces the same falloff the
     * radial gradient gives the uniform case.
     *
     * Painting back-to-front with a per-ring alpha DIFFERENCE rather than the
     * absolute value keeps the total at any radius equal to the curve: each
     * ring adds only what the step beyond it lacked. */
    var ring, s, p, a;
    var prevAlpha = 0;

    for (ring = OUTWARD_RINGS; ring >= 1; ring--) {
      var t = ring / OUTWARD_RINGS;
      var alpha = falloffAlpha(t, style.hold);

      /* The increment this ring contributes over the one outside it. Without
       * the difference the inner rings would paint the full curve again on top
       * of what is already there and the layer would saturate to a solid
       * shell. */
      var step = alpha - prevAlpha;
      prevAlpha = alpha;
      if (step <= 0.0005) continue;

      ctx.beginPath();
      for (s = 0; s <= OUTWARD_STEPS; s++) {
        a = (s / OUTWARD_STEPS) * TAU;

        /* The layer's reach at this bearing, as a fraction of its full
         * thickness. Clamped off zero so a fully stripped face still leaves a
         * trace of air rather than a hole bitten out of the body. */
        var k = thicknessAt(a);
        if (k < 0.05) k = 0.05;

        /* Interpolate from the surface out to this bearing's own edge, so the
         * rings nest correctly on a face whose gas has collapsed as well as on
         * one where it has inflated. */
        var rr = innerRadius + (layer.outer - innerRadius) * k * t;
        p = view.at(rr, a);
        if (s === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fillStyle = style.at(step, t);
      ctx.fill();
    }
    ctx.restore();
  }

  return {
    BOUNDARY_SEGMENTS: BOUNDARY_SEGMENTS,
    boundaryFn: boundaryFn,
    outwardWobbleFn: outwardWobbleFn,
    reliefFn: reliefFn,
    levelFn: levelFn,
    pinchFn: pinchFn,
    /* Exported so an outward layer's DETAILS can ride the same curve as its
     * fill — otherwise haze and stipple stay flat while the band fades, and
     * the layer reads as a solid shell. */
    falloffAlpha: falloffAlpha,
    traceBoundary: traceBoundary,
    clipToLayer: clipToLayer,
    fillLayer: fillLayer,
    strokeBoundary: strokeBoundary,
    fillOutward: fillOutward
  };
})();
