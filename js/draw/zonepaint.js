/* Zone painting and outward traits — the two draw steps that consult the
 * angular-zone field. Split out of draw/scene.js, which passed the 500-line
 * rule once both landed.
 *
 * THIS FILE CONTAINS NO ZONE LOGIC, only zone CONSUMPTION. It asks
 * gen/zones.js for numbers — an HSV delta at an angle — and paints them.
 * There are no zone ids, no arcs and no blend maths here, which is the same
 * relationship draw/primitives.js has with data/elements.js and is what keeps
 * draw/ free of zone logic (PROGRESS.md D23).
 *
 * SPLIT ACROSS TWO FILES, which the 500-line rule forced and which the file
 * wanted anyway — it had grown three unrelated concerns. What is left here is
 * the two that consult the ANGULAR ZONE FIELD: the zone band painting, and the
 * outward traits that carry a zone tint. `zonepaint/sea.js` holds the cold
 * sea, which consults the CLIMATE field instead and shares nothing with these
 * beyond two one-line maths helpers.
 *
 * The helpers are published on the namespace for that file to use, rather than
 * duplicated into it. A copy would be two definitions of "the same" curve free
 * to drift apart, and this project has paid for that mistake before: a probe
 * that reimplements its subject agrees with itself and not with the renderer
 * (see `iceFraction`'s note in zonepaint/sea.js).
 *
 * Loaded after draw/layers.js and draw/details.js, which it uses.
 */

var CC = CC || {};

CC.ZonePaint = (function () {
  "use strict";

  function clampUnit(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function smoothFrac(t) { t = clampUnit(t); return t * t * (3 - 2 * t); }

  /* Must match the blend draw/scene.js gives an outward layer: a screened
   * layer tinted with source-over compositing inverts at the limb. */
  var ATMOSPHERE_BLEND = "screen";

  /* A zoned layer's band is painted in angular wedges rather than as one disc.
   *
   * The detail elements already carry their own zone delta, but a hot face
   * whose ELEMENTS are hot over a band that is uniformly cool reads as a
   * texture change rather than as a hemisphere. The band itself has to carry
   * the shift, and the fill is where it lives.
   *
   * Painted as overlapping wedges at low alpha over the existing gradient
   * rather than as a replacement fill, so the layer keeps its radial shading —
   * a zone perturbs, it does not repaint. The wedge count is high and each is
   * feathered against its neighbour by the zone field's own cross-fade, so
   * there is no banding at any resolution.
   *
   * This is the only place draw/ consults the zone field directly, and it asks
   * for a delta rather than a colour. */
  var ZONE_WEDGES = 240;

  /* How strongly the tint is laid on.
   *
   * MEASURED, NOT GUESSED. The first version used ~0.3 alpha and the rendered
   * hemispheres differed by 10-20 luminance where a readable split needs 25+
   * — the zone was computing correctly and painting almost nothing, which is
   * this project's recurring failure (an invisible film, invisible speckle).
   * A pixel probe across the disc is what settled it; see PROGRESS.md D23. */
  var ZONE_TINT = 0.92;

  function paintZoneBand(ctx, view, layer, colour, zones, innerRadius) {
    if (!zones) return;

    var TAU = Math.PI * 2;
    var outward = !!layer.outward;
    var rOut = layer.outer;
    var rIn = outward ? innerRadius : Math.max(0, layer.inner);
    if (rOut <= rIn) return;

    ctx.save();

    /* AN OUTWARD LAYER MUST BE TINTED THROUGH ITS OWN FALLOFF AND BLEND MODE.
     *
     * The atmosphere is drawn as a radial gradient, which cannot vary by
     * angle — so a locked world's atmosphere came out uniform and washed a
     * flat bright film over both faces, cancelling the very split the zone
     * had just computed. It is the outermost thing the eye sees, so an
     * unzoned atmosphere alone is enough to make the whole feature invisible.
     *
     * Painting it as wedges that ride the same falloff and the same `screen`
     * composite keeps it reading as gas while letting the dayside genuinely
     * glow and the nightside genuinely darken. */
    if (outward) ctx.globalCompositeOperation = ATMOSPHERE_BLEND;

    /* A SOLID LAYER TAKES THE RIBBON PATH AND RETURNS. Its fill is flat, so it
     * can be traced as whole closed paths with no joins at all — see
     * `paintSolidZone`. Only the outward case still needs wedges, because its
     * falloff is a radial gradient that has to be re-centred per bearing. */
    if (!outward) {
      paintSolidZone(ctx, view, rOut, rIn, colour, zones, layer.role);
      ctx.restore();
      return;
    }

    var steps = 3;
    for (var i = 0; i < ZONE_WEDGES; i++) {
      /* Outward wedges ABUT exactly: they are gradient-filled and
       * semi-transparent, so an overlap doubles the alpha in a stripe at every
       * wedge edge — which is precisely the vertical streaking that appeared
       * across the atmosphere on the first attempt. */
      var a0 = (i / ZONE_WEDGES) * TAU;
      var a1 = ((i + 1.001) / ZONE_WEDGES) * TAU;
      var mid = (a0 + a1) / 2;

      /* The band knows its real rolled value, so it passes it — the delta is
       * then limited by the room this layer actually has rather than by the
       * archetype's midpoint. */
      var d = zones.shiftAt(mid, layer.role, colour.v);
      if (Math.abs(d.v) < 0.004 && Math.abs(d.s) < 0.004 && Math.abs(d.h) < 0.5) {
        continue;
      }

      var h = ((colour.h + d.h) % 360 + 360) % 360;
      var s = clampUnit(colour.s + d.s);
      var v = clampUnit(colour.v + d.v);

      /* Alpha rides how far the shift actually moved the colour, so a zone
       * whose delta is small tints faintly rather than laying a flat film
       * over the layer. */
      var strength = clampUnit(Math.abs(d.v) * 2.6 + Math.abs(d.s) * 1.3);

      var k, p;

      if (outward) {
        /* A SCREENED LAYER CANNOT BE DARKENED BY ADDING TO IT.
         *
         * `screen` only ever adds light, so painting the nightside's "darker"
         * delta through it BRIGHTENED the cold face — measured at -8, i.e.
         * the terminator running backwards at the limb.
         *
         * THE ANSWER IS GEOMETRY, NOT COMPOSITING. An earlier fix reached for
         * `destination-out` to erase gas where the zone wanted it darker. That
         * could not work: it removes alpha from INSIDE a disc whose outer edge
         * is already transparent, so the silhouette never moved (measured
         * identical at 0%, 50% and 100% lock) while the screened tint still
         * won in the middle, leaving the night side BRIGHTER by up to 19
         * luminance. Thinning an atmosphere is a statement about how far the
         * gas reaches, and draw/layers.js now shapes that extent directly from
         * `airAt`.
         *
         * So this path no longer darkens at all. Where the zone wants less
         * air there is physically less air, drawn as less air; painting a
         * darkening pass on top would double-count the same fact. Only the
         * BRIGHTENING side is kept, which `screen` does correctly and which is
         * what makes a heated dayside glow. */
        if (d.v < 0) continue;

        /* ONE WEDGE, ONE GRADIENT — never a stack of radial slices.
         *
         * Slicing the falloff into bands and painting each at its own alpha
         * put a seam at every slice AND at every wedge overlap; with the
         * wedges deliberately overlapping to hide the angular seams, the
         * radial ones doubled up into visible vertical streaks across the
         * atmosphere. Rendering the wedge as a single quad filled with a
         * radial gradient reproduces the falloff exactly with no internal
         * edges to accumulate.
         *
         * The wedge is drawn to the full span with no overlap here, because
         * a gradient-filled quad has a smooth edge already and overlapping
         * them is what was doubling the alpha. */
        var oa = strength * ZONE_TINT * layer.strength;

        /* THE TINT STOPS WHERE THE GAS DOES.
         *
         * The fill is now shaped by `airAt`, so a wedge tinted out to the
         * layer's full circular radius would paint light into empty space
         * beyond the collapsed edge — redrawing as a glow exactly the circle
         * the geometry just stopped drawing. Riding the same multiplier keeps
         * the two in agreement by construction. */
        var kAir = zones.airAt ? zones.airAt(mid) : 1;
        if (kAir < 0.05) kAir = 0.05;
        var rEdge = rIn + (rOut - rIn) * kAir;

        var grad = ctx.createRadialGradient(
          view.cx, view.cy, view.px(rIn), view.cx, view.cy, view.px(rEdge));
        for (var gs = 0; gs <= 8; gs++) {
          var gt = gs / 8;
          grad.addColorStop(gt,
            CC.Color.hsva(h, s, v, CC.Layers.falloffAlpha(gt) * oa));
        }

        ctx.beginPath();
        for (k = 0; k <= steps; k++) {
          p = view.at(rEdge, a0 + (a1 - a0) * (k / steps));
          if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        for (k = steps; k >= 0; k--) {
          p = view.at(rIn, a0 + (a1 - a0) * (k / steps));
          ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /* THE SOLID-LAYER TINT, AS NESTED CONTINUOUS RIBBONS.
   *
   * WHAT THIS REPLACED. The tint used to be painted as 240 semi-transparent
   * wedges, each deliberately overlapping its neighbour by 1.4 wedges so their
   * shared edges would not show. That is the trap draw/film.js documents at
   * length, and the wide overlap is its worse half: overlapping translucent
   * fills DOUBLE the alpha along every join, so the crust and the ocean were
   * striped with 240 bright radial bands. The wedges' own comment warns about
   * exactly this hazard for the outward path, three lines above the solid path
   * that was doing it.
   *
   * The construction is the one the sea ice and the frosting now both use:
   * trace the outer edge forward, the inner edge back, close once, fill once.
   * One path has no internal joins, so there is nothing for a seam to form
   * along — structurally, at any alpha, at any sample count.
   *
   * HOW COLOUR STILL VARIES BY ANGLE. A single path carries a single fill, and
   * the tint genuinely differs bearing to bearing. So the band is painted as a
   * few NESTED ribbons: each covers every bearing whose tint reaches its own
   * threshold, and where a bearing falls short the ribbon pinches shut onto the
   * inner edge and encloses nothing there. Stacking them builds the gradient
   * out of overlapping whole passes rather than out of abutting pieces — the
   * nesting is what keeps it smooth, since neighbours differ by one pass rather
   * than by a boundary. */
  var ZONE_BANDS = 6;

  function paintSolidZone(ctx, view, rOut, rIn, colour, zones, role) {
    var TAU = Math.PI * 2;
    var SAMPLES = 360;
    var i, b, a, p;

    /* Measure the whole circumference once. */
    var shift = new Array(SAMPLES + 1);
    var strongest = 0;
    for (i = 0; i <= SAMPLES; i++) {
      a = (i / SAMPLES) * TAU;
      var d = zones.shiftAt(a, role, colour.v);
      var st = clampUnit(Math.abs(d.v) * 2.6 + Math.abs(d.s) * 1.3);
      shift[i] = { h: d.h, s: d.s, v: d.v, strength: st };
      if (st > strongest) strongest = st;
    }
    if (strongest < 0.004) return;

    /* Each ribbon is one step of the tint's own strength. Nested, so a strongly
     * tinted bearing is painted by all of them and a faintly tinted one by the
     * first alone — which is what makes the terminator a gradient rather than a
     * set of rings. */
    for (b = 0; b < ZONE_BANDS; b++) {
      var lo = (b / ZONE_BANDS) * strongest;

      var reached = false;
      for (i = 0; i <= SAMPLES; i++) {
        if (shift[i].strength > lo) { reached = true; break; }
      }
      if (!reached) continue;

      ctx.beginPath();

      /* Outer edge forward. Where the bearing does not reach this ribbon the
       * edge is pulled onto the inner radius, pinching the path shut so it
       * encloses no area there and needs no separate sub-path. */
      for (i = 0; i <= SAMPLES; i++) {
        a = (i / SAMPLES) * TAU;
        p = view.at(shift[i].strength > lo ? rOut : rIn, a);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      /* Inner edge back. */
      for (i = SAMPLES; i >= 0; i--) {
        a = (i / SAMPLES) * TAU;
        p = view.at(rIn, a);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();

      /* The colour this ribbon carries: the mean delta over the bearings it
       * actually covers, so a ribbon that only reaches the hot face is tinted
       * by the hot face rather than by a whole-body average. */
      var sh = 0, ss = 0, sv = 0, n = 0;
      for (i = 0; i <= SAMPLES; i++) {
        if (shift[i].strength <= lo) continue;
        sh += shift[i].h; ss += shift[i].s; sv += shift[i].v; n++;
      }
      if (!n) continue;

      var h = ((colour.h + sh / n) % 360 + 360) % 360;
      var s = clampUnit(colour.s + ss / n);
      var v = clampUnit(colour.v + sv / n);

      /* THE PASSES STACK, so each carries a fraction of the total tint. The
       * full ZONE_TINT on every one of six nested ribbons would lay six coats
       * on the most-tinted bearings and repaint the layer outright — and a
       * zone perturbs, it does not repaint. Divided so the deepest bearing
       * receives ZONE_TINT in total, which is the strength the pixel probe in
       * PROGRESS.md D23 settled on and which must not drift. */
      ctx.fillStyle = CC.Color.hsva(h, s, v, (ZONE_TINT / ZONE_BANDS));
      ctx.fill();
    }
  }
  /* ---- the dust band behind scattered orbital material -------------------
   *
   * WHY THIS EXISTS: a debris belt was invisible, and the reason was not that
   * the rocks were drawn badly. It was that they had no LOCAL contrast. A 3px
   * fragment against a starfield sits among a thousand other 3px marks; the
   * same fragment against dark space has nothing to be an edge against. Every
   * previous attempt fixed this by tuning the ROCKS against one background —
   * brighter for dark space, darker for a starfield — and each tuning broke
   * the other case, because the backgrounds are a user control and the rocks
   * cannot be right against all of them at once.
   *
   * SO THE FIX IS TO STOP DEPENDING ON THE BACKGROUND. A faint band of dust
   * laid down first gives every fragment the same local ground to be seen
   * against, whatever is behind it — starfield, nebula or empty space all end
   * up the same few percent lighter exactly where the rocks are. The contrast
   * becomes a property of the trait rather than of the backdrop, which is the
   * only version of this that generalises.
   *
   * IT ALSO SUPPRESSES THE STARS, and that is the same drawing rather than a
   * second one. The belt is in FRONT of the sky, so stars behind it should be
   * dimmed. Composited `source-over` at a low alpha — deliberately not
   * `lighter`, which would leave every star underneath at full brightness and
   * merely add haze around them — the band veils what is behind it in exactly
   * the proportion it lightens the empty sky. One pass, both jobs.
   *
   * THE GEOMETRY IS MEASURED FROM THE ELEMENTS, never authored per family. It
   * is the radial span the scattered instances actually occupy, flattened to
   * the same orbital plane `ring-band` uses. A gas giant, a moon or a family
   * not yet written gets a correctly-placed band with no entry anywhere,
   * because the band is a readout of where the trait went rather than a
   * second description of it. */

  /* THE HAZE IS NOT FLATTENED, and the first version's mistake is worth
   * keeping written down. `ring-band` draws a squashed ellipse, so a dust band
   * on that same 0.26 squash looked obviously right — and rendered as a grey
   * disc lying behind nothing at all, with the rocks scattered clear of it
   * across the whole frame. The reason is that scattered orbital instances are
   * placed on FULL-CIRCLE angles (`anchorAngles` in gen/traitroll.js), not on
   * the ring plane: a debris belt is a spherical shell in this renderer, not a
   * disc. Matching the ring's projection was matching the wrong trait.
   *
   * So the band takes its shape from the same thing it takes its radii from —
   * where the elements actually are. That is also what keeps it general: a
   * family that one day places its orbital material on a real plane will move
   * the haze with it by moving the elements, with nothing to update here. */

  /* Below this many scattered instances there is no BELT, only a few isolated
   * objects, and a dust band behind three rocks reads as a smudge someone
   * forgot to erase. A ring system draws none of this either: `ring-band` is
   * a solid mark already carrying its own contrast, and it is excluded by
   * asking for scattered instances rather than by naming the trait. */
  var HAZE_MIN_ELEMENTS = 24;

  /* How strongly the band lifts the sky.
   *
   * SET LOW ON PURPOSE, AND IT WAS FOUND BY LOOKING. 0.16 was tried first and
   * rendered as a grey shell around the planet — a drawn object competing with
   * the body, which is a worse picture than the invisible debris it was fixing.
   * The band's whole job is to be the GROUND the rocks are seen against, and a
   * ground that the eye resolves as a thing has stopped being a ground.
   *
   * A few percent is enough for both halves of the job, because both are
   * relative rather than absolute: a 3px fragment needs its immediate
   * surroundings lifted off black, not the frame brightened, and a faint star
   * stops reading as a point as soon as the gap between it and the sky closes
   * a little. The test is that the band should be hard to see when looked at
   * directly and obvious the moment it is switched off. */
  var HAZE_ALPHA = 0.055;

  /* How much of the sky behind the belt is taken away. Stronger than the haze
   * because it is fighting a bright star rather than lifting a dark sky, and
   * still well short of an opaque occluder: a belt is scattered rubble with
   * gaps, so the sky should read as DIMMED THROUGH DUST rather than as blocked
   * by a solid disc. */
  var SKY_SUPPRESS = 0.42;

  /* `sky` is the background's base colour as a hex string, or null when the
   * background paints nothing (Transparent, or a composed export that has
   * already laid its own scene down). It is the only thing this file knows
   * about the background stack, and it asks for a COLOUR rather than for the
   * mode — so a field added to that stack later needs no change here. */
  function drawOrbitalHaze(ctx, view, els, colour, sky) {
    var inner = Infinity, outer = 0, n = 0;
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      /* Scattered instances only. A `ring-band` is a full ellipse whose
       * `radius` is its own line, not a population, and folding those into
       * the span would stretch the band across the whole ring system. */
      if (e.kind === "ring-band") continue;
      var half = e.size || 0;
      if (e.radius - half < inner) inner = e.radius - half;
      if (e.radius + half > outer) outer = e.radius + half;
      n++;
    }
    if (n < HAZE_MIN_ELEMENTS || !(outer > inner)) return;

    /* A little wider than the rocks reach, so the fragments at the belt's
     * edges sit INSIDE the haze rather than half-on and half-off it — an
     * element straddling the boundary would be the one place the trick shows
     * as a hard edge. */
    var pad = (outer - inner) * 0.14;
    inner = Math.max(0, inner - pad);
    outer = outer + pad;

    /* The dust is the same material as the rocks, so it takes the same colour
     * the fragments do — pulled pale and desaturated, because a cloud of fine
     * particles scatters light rather than showing its own body colour. Kept
     * in the layer's hue family for the same reason everything else here is:
     * orbital material belongs to the body it orbits. */
    var hazeH = colour.h;
    var hazeS = clampUnit(colour.s * 0.35);
    var hazeV = clampUnit(Math.max(colour.v, 0.30) * 1.15);

    ctx.save();
    ctx.translate(view.cx, view.cy);

    /* Radial stops rather than a flat annulus: a band with hard edges is a
     * drawn ring, and the thing wanted here is atmosphere. Transparent at both
     * rims, strongest through the middle where the fragments are densest. */
    var rIn = view.px(inner), rOut = view.px(outer);
    /* --- 1. SUPPRESS THE SKY BEHIND THE BELT ---------------------------
     *
     * The belt is in FRONT of the background, so stars behind it should not
     * shine through it at full strength. The haze alone cannot do this at the
     * alpha it has to run at: a few percent of white over a full-brightness
     * star leaves a full-brightness star.
     *
     * THE SUPPRESSION IS A WASH OF THE SKY'S OWN BASE COLOUR, which is the
     * detail that makes this work rather than a clever compositing trick.
     * Painting the background's base colour back over the belt pulls whatever
     * is there toward the empty sky it sits in: a star fades toward the colour
     * around it, a nebula core fades toward the void colour, and an already
     * empty patch does not change at all. The stars vanish and the backdrop
     * does not acquire a grey smear, because the thing being painted IS the
     * backdrop.
     *
     * `destination-out` WAS TRIED FIRST AND WAS WRONG, badly enough to record.
     * It does not dim the sky, it DELETES it — the belt came out as a band of
     * real transparency punched through the background, which showed as an
     * enormous grey wedge in the export and left a hard visible seam along the
     * front-half clip rectangle. Dimming is a colour operation; alpha belongs
     * to Transparent mode and to nothing else.
     *
     * Skipped entirely when there is no sky to dim. Under `transparent` the
     * background is a deliberate cutout, and painting a disc of solid colour
     * into it would destroy exactly the promise D103 exists to keep.
     *
     * The stars are their OWN overlay pass in drawBackground now, laid down
     * complete before the scene starts — so by the time this runs there is one
     * finished sky to dim, with no seam between "sky" and "stars" to get
     * wrong. */
    if (sky) {
      var wipe = ctx.createRadialGradient(0, 0, rIn, 0, 0, rOut);
      wipe.addColorStop(0, CC.Color.rgba(sky, 0));
      wipe.addColorStop(0.30, CC.Color.rgba(sky, SKY_SUPPRESS));
      wipe.addColorStop(0.70, CC.Color.rgba(sky, SKY_SUPPRESS));
      wipe.addColorStop(1, CC.Color.rgba(sky, 0));
      ctx.fillStyle = wipe;
      ctx.beginPath();
      ctx.arc(0, 0, rOut, 0, Math.PI * 2);
      ctx.fill();
    }

    /* --- 2. the dust itself ------------------------------------------- */
    var g = ctx.createRadialGradient(0, 0, rIn, 0, 0, rOut);
    g.addColorStop(0, CC.Color.hsva(hazeH, hazeS, hazeV, 0));
    g.addColorStop(0.30, CC.Color.hsva(hazeH, hazeS, hazeV, HAZE_ALPHA));
    g.addColorStop(0.70, CC.Color.hsva(hazeH, hazeS, hazeV, HAZE_ALPHA));
    g.addColorStop(1, CC.Color.hsva(hazeH, hazeS, hazeV, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rOut, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* Trait instances that sit BEYOND the body — rings, debris belts.
   *
   * Split into the half that passes behind the body and the half in front, so
   * the body occludes the far side. `ring-band` is a full ellipse rather than
   * a scattered instance, so it is clipped to the relevant half instead;
   * everything else is placed by its own angle.
   *
   * The colour comes from the atmosphere's entry where there is one and the
   * surface's otherwise, so orbital material stays in the body's family
   * without this file naming a role — it asks the palette for whatever the
   * outermost thing was. */
  function drawOutward(ctx, view, details, palette, opacity, half, sky) {
    var els = details.outward;
    if (!els || !els.length) return;

    var colour = palette.get(details.outwardRole || "atmosphere");

    ctx.save();

    /* Clip to the half of the frame the requested side occupies. The rings are
     * drawn as flattened ellipses centred on the body, so "behind" is the top
     * half of that ellipse and "in front" the bottom.
     *
     * THE SPLIT LINE IS view.cy, WHICH PANS WITH THE BODY, but the rest of the
     * rectangle must NOT be pinned to the canvas edges (0, view.width,
     * view.height): those are fixed while cy moves, so panning far enough
     * slides the body's centre toward an edge and the "far" half of that edge
     * chops the ring — the exact bug this comment used to not warn about.
     * Sized generously past the canvas instead of AT it, in every direction
     * except the split line itself, so the clip always reaches past whatever
     * the ring can draw regardless of pan or zoom. */
    var margin = (view.width + view.height) * 4;
    ctx.beginPath();
    if (half === "back") {
      ctx.rect(-margin, view.cy - margin, view.width + margin * 2, margin);
    } else {
      ctx.rect(-margin, view.cy, view.width + margin * 2, margin);
    }
    ctx.clip();

    /* THE HAZE GOES DOWN FIRST, inside the same half-clip the rocks use, so
     * the body occludes the far side of the dust exactly as it occludes the
     * far side of the belt. Drawn once per half rather than once per frame for
     * that reason — a single unclipped band would pass in front of the body. */
    drawOrbitalHaze(ctx, view, els, colour, sky);

    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      var alpha = clampUnit(e.alpha * opacity);
      if (alpha <= 0.004) continue;

      var fn = CC.Primitives.KINDS[e.kind];
      if (!fn) continue;

      /* A gap band is a thinning, not an absence. */
      if (e.gap) alpha *= 0.28;

      var oc = CC.DrawDetails.zoneShift(colour, e);
      /* ONE SHARED RESOLVER, because this used to be a second `if (chunk)`
       * chain and it drifted: the first orbital trait wanting a richer style
       * than a colour string crashed here. See CC.DrawDetails.styleFor. */
      /* `palette.emitted` is the body's own light, and it is handed over
       * rather than looked up: an orbital mirror's glass face reflects the
       * star, and js/draw/ may not ask for a layer by role name to find it.
       * Null on any body that shines by nothing of its own, which every
       * primitive but the mirror ignores. */
      var rich = CC.DrawDetails.styleFor(e.kind, oc, e, alpha, palette.emitted);
      fn(ctx, view, e, rich || CC.DrawDetails.toneColour(oc, e.tone, alpha));
    }

    ctx.restore();
  }
  return {
    paintZoneBand: paintZoneBand,
    drawOutward: drawOutward,
    drawOrbitalHaze: drawOrbitalHaze,
    ATMOSPHERE_BLEND: ATMOSPHERE_BLEND,
    /* Published for zonepaint/sea.js, which needs the same two curves and must
     * not carry its own copy of them. */
    clampUnit: clampUnit,
    smoothFrac: smoothFrac
  };
})();
