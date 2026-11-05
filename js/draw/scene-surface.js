/* The scene's surface passes, in their draw order: surface traits, the frosting,
 * the damage that cuts it, and the traits that span the layers. Stages of
 * `render` (draw/scene.js), sharing its state object.
 *
 * Split out of draw/scene.js, which passed the 500-line rule. Attached to
 * CC.Scene; draw/scene.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var SILHOUETTE_RELIEF = CC.Scene.SILHOUETTE_RELIEF;

  function clampUnit(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  /* A MARK THAT SITS ON THE SURFACE, slightly sunk into it.
   *
   * Placement happens in body space against nominal radii, and the drawn
   * outline is that radius times the wobble, the relief and the form — on
   * the asteroid, a long way from nominal. So an element declaring `seat`
   * (0..1, how much of its own thickness is buried) is re-seated HERE, where
   * the silhouette's real boundary function exists: its footprint is sampled
   * across the outline, it is centred on the mean ground height there, and it
   * is tilted to the slope between the footprint's ends — a building stands
   * on the facet it was put on, not on a circle.
   *
   * Drawn in the unclipped pass (the spanning trait loop), because the band
   * clip is what buried the mining stations and cut their tops off. Returns
   * a copy; the cached element is not touched. */
  function seatOn(view, el, outer, fn) {
    var half = el.size * 0.5 / Math.max(0.1, outer);
    var rAt = function (a) { return outer * (fn ? fn(a) : 1); };
    var sum = 0, N = 5;
    for (var k = 0; k < N; k++) sum += rAt(el.angle + (k / (N - 1) * 2 - 1) * half);
    var p0 = view.at(rAt(el.angle - half), el.angle - half);
    var p1 = view.at(rAt(el.angle + half), el.angle + half);
    var out = {};
    for (var key in el) {
      if (Object.prototype.hasOwnProperty.call(el, key)) out[key] = el[key];
    }
    /* The radial extent of a flat plate is its width, `size × aspect`. */
    var thick = el.size * (el.aspect === undefined ? 0.5 : el.aspect);
    out.radius = sum / N + thick * (0.5 - el.seat);
    out.rot = Math.atan2(p1.x - p0.x, -(p1.y - p0.y));
    return out;
  }

  /* --- 4. surface-attached traits ---
   *
   * Polar caps and impact basins sit ON the surface, so they are drawn after
   * the fluid layers rather than inside their host layer's pass — the sea is
   * drawn last (so land reads as a crossing) and would otherwise paint
   * straight over them.
   *
   * Clipped to the body so a cap cannot spill past the silhouette, but not
   * to any single layer: a cap legitimately sits at the boundary between
   * two. */
  function drawSurfaceTraits(sc) {
    var ctx = sc.ctx, view = sc.view, details = sc.details, palette = sc.palette;
    var layers = sc.layers, silhouette = sc.silhouette, bounds = sc.bounds;
    var elementOpacity = sc.elementOpacity;

    if (details.surfaceTraits && details.surfaceTraits.length) {
      ctx.save();

      /* Clipped to the DISPLACED silhouette, not to the nominal surface
       * radius.
       *
       * A cap is placed at body.surface (1.0), but terrain moves the visible
       * edge either side of that — so a cap drawn to a perfect circle stuck
       * out past the body wherever the ground dipped below the mean, and
       * appeared as a grey crescent floating off the limb. Clipping to the
       * same boundary function the silhouette layer draws with keeps the two
       * in agreement by construction. */
      ctx.beginPath();
      CC.Layers.traceBoundary(ctx, view, layers[silhouette].outer,
                              bounds[silhouette], false);
      ctx.clip();

      for (var st = 0; st < details.surfaceTraits.length; st++) {
        var se = details.surfaceTraits[st];
        var sAlpha = clampUnit(se.alpha * elementOpacity);
        if (sAlpha <= 0.004) continue;
        var sfn = CC.Primitives.KINDS[se.kind];
        if (!sfn) continue;
        sfn(ctx, view, se, CC.DrawDetails.toneColour(
          CC.DrawDetails.zoneShift(palette.get(se.role), se), se.tone, sAlpha));
      }
      ctx.restore();
    }

  }

  /* --- 3f. surface frosting ---
   *
   * `SILHOUETTE_RELIEF` goes with it: the outermost solid layer draws its
   * terrain damped, and frosting deposited against the undamped field would
   * sit proud of the very silhouette it is supposed to be lying on. */
  function drawFrosting(sc) {
    var ctx = sc.ctx, view = sc.view, details = sc.details, palette = sc.palette;
    var body = sc.body, layers = sc.layers, bounds = sc.bounds;
    var deferred = sc.deferred, settings = sc.settings;
    var elementOpacity = sc.elementOpacity, silhouette = sc.silhouette;
    CC.Film.draw(ctx, view, body, layers, bounds, deferred, details, palette,
                 settings, elementOpacity, silhouette, SILHOUETTE_RELIEF);

  }

  /* --- 4b. surface damage ---
   *
   * IMPACT SCARS CUT THROUGH THE DEPOSIT, so they are drawn after it.
   *
   * A crater is an excavation: it punches through whatever lies on the
   * ground and exposes the rock. Drawn inside the crust's own pass — where
   * every other crust element belongs — the scars were painted and then
   * buried by the frosting, which reaches most of the way down the crust.
   * "Heavily Cratered" placed 64-90 elements and showed none of them.
   *
   * Clipped to the same REACH draw/film.js's frosting clip uses — the
   * terrain's global peak, not the local silhouette curve — rather than to
   * the displaced silhouette itself.
   *
   * A scar is sunk BELOW the local rock by `sink`, which is exactly where
   * the frosting piles up highest (the same hollow-filling that makes
   * frosting stand proud of the silhouette everywhere else). Clipping
   * damage to the tight per-angle silhouette cut it off before it could
   * reach that raised frosting, so only the sliver of each crater outside
   * the local silhouette survived — the rest stayed hidden under the
   * deposit despite being drawn after it. */
  function drawDamage(sc) {
    var ctx = sc.ctx, view = sc.view, details = sc.details, palette = sc.palette;
    var layers = sc.layers, silhouette = sc.silhouette, bounds = sc.bounds;
    var elementOpacity = sc.elementOpacity;

    if (details.damageTraits && details.damageTraits.length) {
      ctx.save();
      var dTerr = details.terrain[layers[silhouette].role];
      var dReach = layers[silhouette].outer
        + Math.max(0, dTerr ? dTerr.range().hi : 0) * SILHOUETTE_RELIEF;
      /* NO FROSTING, NO REASON TO REACH PAST THE ROCK. The terrain-peak circle
       * exists only so a scar can meet the deposit piled above the ground. A
       * surface nothing is deposited on (the asteroid's shell) clips to its
       * real silhouette instead — against the peak circle an impact basin
       * hung off a faceted outline as a dark crescent in open space. */
      var dSil = layers[silhouette];
      var dFrosted = (details.filmZoneByRole && details.filmZoneByRole[dSil.role]) ||
        (details.filmZones && details.filmZones.zones.length);
      ctx.beginPath();
      if (dFrosted) {
        CC.Layers.traceBoundary(ctx, view, dReach, null, false);
        ctx.clip();
      } else {
        /* And to the BAND, both edges as drawn: the wedge's own inner arc is
         * a circle, and on a faceted shell it read as a ruled line across
         * the crust. A basin is a sector of the band, so the band shapes it. */
        CC.Layers.traceBoundary(ctx, view, dSil.outer, bounds[silhouette], false);
        if (silhouette + 1 < layers.length) {
          CC.Layers.traceBoundary(ctx, view, layers[silhouette + 1].outer,
                                  bounds[silhouette + 1], true);
        }
        ctx.clip("evenodd");
      }

      for (var dt = 0; dt < details.damageTraits.length; dt++) {
        var de = details.damageTraits[dt];
        var dAlpha = clampUnit(de.alpha * elementOpacity);
        if (dAlpha <= 0.004) continue;
        var dfn = CC.Primitives.KINDS[de.kind];
        if (!dfn) continue;
        var dCol = CC.DrawDetails.zoneShift(palette.get(de.role), de);
        /* An element carrying `floor` is an excavation and is filled with a
         * depth gradient rather than flat — see depthFill. */
        dfn(ctx, view, de, de.floor
          ? CC.DrawDetails.depthFill(dCol, de.tone, dAlpha, de.floor)
          : CC.DrawDetails.toneColour(dCol, de.tone, dAlpha));
      }
      ctx.restore();
    }

  }

  /* --- 4c. spanning traits ---
   *
   * Features that CROSS layer boundaries. The great storm is the first: a
   * storm reaching from the cirrus deck down through the banded layer is one
   * feature, and drawn inside either layer's clip it was cut in half at the
   * boundary between them.
   *
   * Clipped to the OUTERMOST layer rather than to a band, so the element
   * spans freely; `fadeEnds` on the element dissolves it at both radial
   * extremes so it ends by fading rather than by being cut.
   *
   * THE CLIP RADIUS IS THE ATMOSPHERE'S, NOT `body.surface`. It used to be
   * the latter, which is the top of the outermost SOLID layer — on a gas
   * giant, the troposphere at r=1.0. That cut two different things at once:
   *
   *   - A great storm large enough to reach the limb was sliced off flat
   *     against the body's edge, giving it a straight chord where it should
   *     have a curved perimeter. Invisible while storms were small; obvious
   *     as soon as they were enlarged.
   *   - The cirrus-deck companions were removed ENTIRELY, since they sit
   *     above r=1.0 by construction — which is why the cloud deck still
   *     looked undisturbed no matter how the companion was tuned.
   *
   * Both are the same bug: the clip was tighter than the pass it guards.
   * Taking the outermost layer's outer edge covers any outward halo the
   * archetype declares and keeps the guarantee that matters — a spanning
   * trait cannot escape the body into open space. */
  function drawSpanning(sc) {
    var ctx = sc.ctx, view = sc.view, details = sc.details, palette = sc.palette;
    var body = sc.body, bodyReach = sc.bodyReach, layers = sc.layers;
    var silhouette = sc.silhouette, bounds = sc.bounds;
    var elementOpacity = sc.elementOpacity;

    if (details.spanningTraits && details.spanningTraits.length) {
      /* THE CLIP IS THE BODY'S REACH, WHICH IS NOT THE FRAME'S.
       *
       * Third time, and then a fourth. The comment above records the same bug
       * being fixed twice — first at `body.surface`, then at the outermost
       * layer — and it fired again the moment something reached further than
       * a corona:
       *
       *   - A prominence is authored `size: [0.20, 0.44]` of the BODY radius
       *     and anchored near the surface, so a top-tier arch reaches past a
       *     corona topping out at 1.14-1.32 and was chopped flat against it.
       *   - Heat plumes are spanning by construction (they cross the
       *     chromosphere/corona boundary, which is what `spanning` is FOR,
       *     D91) and would have been chopped by the same edge on the day they
       *     were built.
       *
       * That third fix reached for `extent` on the reasoning that open space
       * begins where the picture stops. It cured the chopping and introduced
       * the OPPOSITE defect, which is the fourth entry in this list:
       *
       *   - Ticking RING SYSTEM made the great storm bulge out past the upper
       *     cloud, and unticking it pulled the storm back in. Nothing about
       *     the storm changed; the ring did. `extent` folds in
       *     `details.outward`, so a ring at r=2.35 pushed this clip out to
       *     2.35 and the storm simply expanded into the room it was given.
       *
       * The error was treating the frame's reach and the body's reach as one
       * number. They answer different questions: `extent` sizes the VIEW and
       * must include anything drawn, ring included; this clip bounds a mark
       * that belongs to the BODY and must include only the body's own
       * silhouette. Sharing one number let anything in orbit resize the
       * weather, which is a coupling no trait declaration asked for.
       *
       * So it is fixed against the thing that is actually true: the guarantee
       * is *a spanning trait cannot escape the body*, and `bodyReach` is that
       * radius — the wobble, the bulge and the swell, taken before the
       * orbital elements are folded in. That is stable under every trait that
       * draws beyond the body, so a fifth entry cannot arrive from a ring, a
       * debris belt, or an orbital structure that has not been written yet.
       *
       * `fadeEnds` on the element is the complement, not the alternative: it
       * makes a trait END by dissolving rather than by being cut. Alone it
       * only makes the chop soft. */
      var spanEdge = Math.max(body.surface, bodyReach);
      ctx.save();
      ctx.beginPath();
      CC.Layers.traceBoundary(ctx, view, spanEdge, null, false);
      ctx.clip();

      for (var st = 0; st < details.spanningTraits.length; st++) {
        var se = details.spanningTraits[st];
        /* A TRAIT THAT ESCAPES THE FRAME IS DRAWN OUTSIDE THIS CLIP.
         *
         * The clip above gives one guarantee — a spanning trait cannot get out
         * into open space — and that is right for every mark that is part of
         * the body: a prominence returns, a flare disperses, a plume falls
         * back. All of them belong to the star and none should leave it.
         *
         * A coronal hole's wind is the one mark whose whole content is that it
         * DOES leave. Clipped to the picture's own reach it stopped dead at
         * the halo's edge — a ragged cut across every field line and every
         * particle, exactly where the mirrors orbit — which turned "material
         * escaping to interstellar space" into "material stopping at an
         * invisible wall". The guarantee is still the right default; this is
         * the documented exception to it, taken in the second pass below. */
        if (se.escapes || se.seat !== undefined) continue;
        var sAlpha = clampUnit(se.alpha * elementOpacity);
        if (sAlpha <= 0.004) continue;
        var sfn = CC.Primitives.KINDS[se.kind];
        if (!sfn) continue;
        var sCol = CC.DrawDetails.zoneShift(palette.get(se.role), se);
        /* `emitted` and `deep` are the two derived palette colours a mark may
         * need that are not its own layer's: the body's light, and its hot
         * interior. A field line takes the second — see fieldFill. */
        var sRich = CC.DrawDetails.styleFor(se.kind, sCol, se, sAlpha,
                                            palette.emitted, palette.deep);
        sfn(ctx, view, se, sRich
          || CC.DrawDetails.toneColour(sCol, se.tone, sAlpha));
      }
      ctx.restore();

      /* THE ESCAPING PASS — outside the clip, so it may reach the frame edge.
       *
       * Deliberately after the clipped one and outside `ctx.save()`, which is
       * the whole difference. Nothing here is bounded by the body's extent;
       * the frame is the only limit, and a mark that runs off it is doing what
       * it was written to do. See the note above for why this exception
       * exists and why it is not the default. */
      for (var xt = 0; xt < details.spanningTraits.length; xt++) {
        var xe = details.spanningTraits[xt];
        if (!xe.escapes && xe.seat === undefined) continue;
        if (xe.seat !== undefined) {
          xe = seatOn(view, xe, layers[silhouette].outer, bounds[silhouette]);
        }
        var xAlpha = clampUnit(xe.alpha * elementOpacity);
        if (xAlpha <= 0.004) continue;
        var xfn = CC.Primitives.KINDS[xe.kind];
        if (!xfn) continue;
        var xCol = CC.DrawDetails.zoneShift(palette.get(xe.role), xe);
        var xRich = CC.DrawDetails.styleFor(xe.kind, xCol, xe, xAlpha,
                                            palette.emitted, palette.deep);
        xfn(ctx, view, xe, xRich
          || CC.DrawDetails.toneColour(xCol, xe.tone, xAlpha));
      }
    }
  }

  CC.Scene.drawSurfaceTraits = drawSurfaceTraits;
  CC.Scene.drawFrosting = drawFrosting;
  CC.Scene.drawDamage = drawDamage;
  CC.Scene.drawSpanning = drawSpanning;
})();
