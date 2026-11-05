/* What is drawn beyond the body — the orbital haze and the outward traits.
 *
 * Split out of draw/zonepaint.js, which passed the 500-line rule. Attached to
 * CC.ZonePaint rather than a namespace of its own, for the reason
 * zonepaint/sea.js gives: a split for line-count reasons must not become a
 * rename for every call site. draw/zonepaint.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var clampUnit = CC.ZonePaint.clampUnit;

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
   * placed on FULL-CIRCLE angles (`anchorAngles` in gen/traitanchor.js), not on
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

    /* THE ORBITAL BAND'S OWN COLOUR, NOT THE ATMOSPHERE'S.
     *
     * This read `palette.get(details.outwardRole || "atmosphere")`, and
     * `outwardRole` IS NEVER SET — nothing in the generator assigns it, so the
     * fallback was not a fallback, it was the only path. Every ring on every
     * body was therefore painted in the ATMOSPHERE's colour, which is pale and
     * washed by design because it is a haze seen edge-on.
     *
     * That is why ringed giants all looked alike no matter what colour the
     * world was: the mark was not merely desaturated by its tone, it was
     * reading a role that had nothing to do with it. `orbit` is the role these
     * elements actually carry (gen/traitanchor.js gives them a synthetic layer
     * of that name) and gen/palette-bands.js now builds a real entry for it, derived
     * from the body's outermost solid layer — ring debris is made of the world
     * it orbits, so it keeps that tint.
     *
     * Taken per element rather than once for the whole pass, because these
     * elements do not all belong to one layer: a debris belt and a ring system
     * can be in orbit together, and each should answer for its own role. The
     * lookup is a table read, so per-element costs nothing measurable.
     *
     * `outwardRole` is still honoured as an override if anything ever sets it,
     * and `atmosphere` remains the last resort so a body whose palette lacks
     * an orbit entry degrades exactly as before rather than to grey. */
    function outwardColour(el) {
      return palette.get(details.outwardRole || (el && el.role) || "orbit"
        ) || palette.get("atmosphere");
    }

    /* The haze is one band across the whole system, so it takes the system's
     * colour rather than any single element's. */
    var colour = outwardColour(els[0]);

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

    /* NATURAL MATERIAL FIRST, THEN ANYTHING BUILT (D297). A ring band is a
     * translucent haze and a station is solid metal: drawn the other way
     * round, a city on the far side of a giant was washed out to a ghost by
     * the bands laid over it. Within each group the order is unchanged. */
    var order = [];
    for (var o = 0; o < els.length; o++) if (!els[o].built) order.push(els[o]);
    for (o = 0; o < els.length; o++) if (els[o].built) order.push(els[o]);

    for (var i = 0; i < order.length; i++) {
      var e = order[i];
      var alpha = clampUnit(e.alpha * opacity);
      if (alpha <= 0.004) continue;

      var fn = CC.Primitives.KINDS[e.kind];
      if (!fn) continue;

      /* A gap band is a thinning, not an absence. */
      if (e.gap) alpha *= 0.28;

      var oc = CC.DrawDetails.zoneShift(outwardColour(e), e);
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

  CC.ZonePaint.drawOrbitalHaze = drawOrbitalHaze;
  CC.ZonePaint.drawOutward = drawOutward;
})();
