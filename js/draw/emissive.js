/* Light a body EMITS, as opposed to material it is made of.
 *
 * Two passes, and they are the same statement seen from either side of the
 * silhouette:
 *
 *   paintLimbDarkening   a luminous layer is dimmer at its own edge, which is
 *                        most of the difference between a glowing SPHERE and
 *                        a flat coloured disc.
 *   drawEmissiveGlow     a luminous body lights the space AROUND it, which is
 *                        a mark nothing else in the generator makes — no
 *                        planet, no giant, no ring.
 *
 * THE SAME RULES APPLY HERE AS EVERYWHERE IN draw/. No role names, no
 * archetype names, pixels only through `view`. Both passes are opted into by
 * DECLARATION — `layer.limbDarkening` and `body.emissiveGlow`, carried from
 * the archetype by gen/structure.js — so a body that declares neither renders
 * exactly as it did before either of these existed.
 *
 *
 * ---- WHY THIS IS ITS OWN FILE -------------------------------------------
 *
 * draw/scene.js is the assembly order and was well past the 500-line rule
 * before this work started. The seam taken here is a real one rather than a
 * byte count: everything in scene.js draws MATERIAL — bands, details, traits,
 * films, all of it inside the body's silhouette and all of it reflective
 * unless a palette says otherwise. These two draw LIGHT, and light behaves
 * differently at every level: it composites additively, it has no edge to
 * clip against, it must fade rather than stop, and one of the two deliberately
 * runs off the frame.
 *
 * It is also the pair a future emitting body would reach for. A machine world
 * with an incandescent shell wants both of these and none of scene.js's
 * layer-ordering logic.
 *
 * draw/layers.js and gen/palette.js must load before this file; draw/scene.js
 * calls into it. */

var CC = CC || {};

CC.Emissive = (function () {
  "use strict";

  var TAU = CC.Math.TAU;

  /* ---- LIMB DARKENING -------------------------------------------------
   *
   * A LUMINOUS LAYER IS DIMMER AT ITS EDGE, and that one fact is most of the
   * difference between a glowing SPHERE and a flat coloured disc.
   *
   * The physical statement is generic and so is this function: look straight
   * down into an emitting body and you see deep, hot material; look near its
   * rim and the same line of sight only grazes the cooler upper layers, so it
   * arrives dimmer and redder. Nothing here knows what a photosphere is —
   * `layer.limbDarkening` is declared by whatever archetype wants it (see
   * gen/structure.js), and a layer that declares nothing is drawn exactly as
   * before.
   *
   * DRAWN OVER THE LAYER'S DETAIL PASS, NOT UNDER IT. A gradient painted
   * under the granulation leaves the granulation itself at full brightness at
   * the edge, and the eye reads the marks rather than the fill — the disc
   * stays flat. Sitting on top dims the layer and everything the layer wears,
   * which is what makes the curvature read.
   *
   * MULTIPLY RATHER THAN A BLACK WASH. Painting semi-transparent black toward
   * the limb greys the colour out; multiplying by a darker relative of the
   * layer's own colour deepens it instead, which is what limb darkening
   * actually looks like — the edge of a star is not grey, it is a deeper,
   * more saturated version of the middle.
   *
   * The caller is responsible for the clip: this paints across the layer's
   * whole disc and relies on being inside `clipToLayer`. */
  function paintLimbDarkening(ctx, view, layer, colour, surface) {
    var amount = layer.limbDarkening;
    if (!amount || amount <= 0) return;

    var r1 = view.px(layer.outer);
    if (r1 < 2) return;

    /* THE CURVE IS MEASURED AGAINST THE BODY'S RADIUS, NEVER THE LAYER'S.
     *
     * This is the whole correctness of the function and the first version got
     * it wrong in a way that was obvious the moment it was rendered: with `t`
     * running to 1 at the LAYER's own edge, a convective envelope topping out
     * at r=0.90 took the full limb value at 0.90 — so the interior went muddy
     * brown across its entire face while the photosphere, being a thin skin
     * near r=1, barely darkened at all. Exactly inverted.
     *
     * `mu` is a statement about the viewing angle into a SPHERE, so its
     * argument is the fraction of the sphere's radius. Each layer then shows
     * whatever part of that one shared curve it happens to span, which is
     * also what makes the photosphere and the layer under it read as one
     * continuous falloff rather than two. */
    var span = surface > 0 ? surface : 1;
    var g = ctx.createRadialGradient(view.cx, view.cy, 0, view.cx, view.cy, r1);
    for (var i = 0; i <= 10; i++) {
      var f = i / 10;
      var t = Math.min(1, (f * layer.outer) / span);
      /* mu = cos of the viewing angle at this apparent radius. The classic
       * limb-darkening law is linear in mu; the square root is what turns the
       * apparent radius into it, and it is the reason the falloff is gentle
       * across most of the face and steep only in the last few percent. That
       * shape is the whole effect: a flat-looking middle with a fast rolloff
       * is what a sphere looks like. */
      var mu = Math.sqrt(Math.max(0, 1 - t * t));
      var k = (1 - mu) * amount;

      /* THE MULTIPLIER, AND IT MUST BE WHITE WHERE NOTHING IS DARKENED.
       *
       * `multiply` scales what is underneath by this colour's channels, so a
       * stop painted in the layer's OWN colour darkens by that colour's value
       * even at k=0 — which is what the first render did: every interior went
       * a flat brown, uniformly, because the whole face was being multiplied
       * by roughly 0.7. The stop is a FACTOR, not a paint.
       *
       * It is warmed slightly as it darkens rather than staying neutral grey,
       * because the limb of a star is genuinely cooler and redder than its
       * centre. That is a small hue LEAN on the multiplier — never a
       * replacement (zones.js rule 1, D123): a blue star's limb comes out a
       * deeper blue, not orange. */
      g.addColorStop(f, CC.Color.hsva(0, 0.16 * k, 1 - k, 1));
    }

    ctx.save();
    /* `multiply` against the already-painted band, so the darkening is a
     * proportion of whatever is there rather than a flat tone laid over it —
     * bright granules stay the brightest thing at any given radius. */
    ctx.globalCompositeOperation = "multiply";
    ctx.beginPath();
    ctx.arc(view.cx, view.cy, r1, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }


  /* ---- THE EMISSIVE PASS ----------------------------------------------
   *
   * LIGHT IN THE SPACE AROUND THE BODY, rather than another layer of it.
   *
   * A star was drawn as a disc that stopped at its corona, so the only thing
   * saying "this object is radiating" was its colour. What a luminous body
   * does that a lit one cannot is *illuminate the space around it*, and that
   * is a mark nothing else in the generator makes — no planet, no giant, no
   * ring. That is why it earns its own pass rather than being another band
   * (D76: a new statement needs a new kind of mark).
   *
   * Declared by the archetype as `emissiveGlow: { reach, strength, veins }`
   * and carried on the built body, so this function names nothing.
   *
   * ---- IT IS EXCLUDED FROM THE EXTENT SWEEP, DELIBERATELY --------------
   *
   * `extent` is documented in draw/scene.js as a MEASUREMENT used by the pan
   * clamp, and it also decides where the frame's contents reach. A glow
   * reaching 1.9 radii folded into it would pull the frame out and SHRINK THE
   * STAR to make room for a halo — which is the wrong trade, and is exactly
   * the mistake `extent` used to make with ring systems (draw/canvas.js
   * records it).
   *
   * A decorative glow that fades to nothing has no claim on frame space. It
   * is softly cropped by the edge, which is what a halo does anyway.
   *
   * NOTE THIS IS THE OPPOSITE CALL FROM THE CORONAL WOBBLE, which must be in
   * the sweep. The distinction is real and worth keeping straight: the wobble
   * moves the body's own SILHOUETTE, so cropping it destroys the feature. The
   * glow is light around the body and reads correctly running off the frame.
   *
   * ---- DRAWN BEHIND THE BODY -------------------------------------------
   *
   * Painted before the layers, so the star is drawn on top of its own glow
   * and the halo is only ever visible outside the silhouette. Drawn after
   * would wash a bright film across the whole cutaway and flatten the
   * interior that is the point of the picture.
   *
   * `lighter` rather than `screen`: this is emitted light adding to an empty
   * sky, and there is nothing behind it to blow out. Screen is the right
   * choice for a layer sitting OVER something (see scene.js ATMOSPHERE_BLEND);
   * over black the two are nearly identical anyway, and additive keeps the
   * veins building where they cross. */
  function drawEmissiveGlow(ctx, view, body, palette, settings) {
    var spec = body.emissiveGlow;
    if (!spec) return;

    var strength = spec.strength === undefined ? 1 : spec.strength;
    if (strength <= 0) return;

    /* THE GLOW TAKES THE BODY'S OWN COLOUR, LEANED — NEVER REPLACED.
     *
     * zones.js rule 1, and D123 is the instance that proves it matters: a
     * mark that mixed toward orange regardless of the star produced magenta
     * on a blue one, which reads as a rendering fault. A blue star glows
     * blue. What makes it read as EMITTED rather than painted is that it is
     * brighter and less saturated than the body — the same thing that makes
     * every fusing core in the family read as hot.
     *
     * Taken from the OUTERMOST LAYER, whatever the archetype called it. A
     * role name here would be the one thing draw/ may never contain, and it
     * would also be wrong: a body's glow is the colour of what is radiating,
     * which is its outside. */
    var src = palette.get(body.layers[0] && body.layers[0].role);
    if (!src) return;

    var hue = src.h;
    /* KEEPS MOST OF THE BODY'S SATURATION. The first version cut it to 0.66
     * and lifted the value hard, which produced a GREY halo on a coloured
     * star — a desaturated glow reads as fog or as a lens artifact, not as
     * light this object is emitting. The lift is now modest and the colour
     * mostly survives, which is what makes a green star sit in a green haze. */
    var sat = Math.max(0, Math.min(1, src.s * 0.88));
    var val = Math.max(0, Math.min(1, src.v * 0.72 + 0.24));

    /* The glow starts where the outermost layer does, so it reads as light
     * leaving the body rather than as a ring hovering off it. */
    var inner = body.extent || 1;
    var outer = inner * (spec.reach === undefined ? 1.6 : spec.reach);
    var r0 = view.px(inner), r1 = view.px(outer);
    if (r1 <= r0 + 1) return;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    /* ---- the halo ----
     *
     * A radial gradient is exactly right here and is the one place in this
     * work where it is: the glow is circular by nature, it does not move the
     * silhouette, and it wants a smooth falloff to nothing. Sampled at enough
     * stops that the curve is a curve — a canvas gradient interpolates
     * linearly between stops, so three of them draw a cone. */
    var g = ctx.createRadialGradient(view.cx, view.cy, r0 * 0.90,
                                     view.cx, view.cy, r1);
    for (var i = 0; i <= 12; i++) {
      var t = i / 12;
      /* Squared falloff, so most of the light sits close to the body and the
       * outer half is a whisper. A linear ramp reads as a painted disc with a
       * soft edge; this reads as air lit by something. */
      var u = 1 - t;
      g.addColorStop(t, CC.Color.hsva(hue, sat, val, 0.30 * strength * u * u));
    }
    ctx.beginPath();
    ctx.arc(view.cx, view.cy, r1, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();

    /* ---- the heat veins ----
     *
     * The user's addition, and the reason the halo is not merely a blur:
     * "hot gas emissions or solar radiation reaching through that glow into
     * space, fading out further out." A featureless radial gradient reads as
     * a lens artifact; giving it structure makes it read as something the
     * star is DOING.
     *
     * Placed here from their own stream rather than through the element
     * pipeline, because they live outside every layer and the pipeline places
     * elements INSIDE layers. They are drawn by the registered `heat-vein`
     * primitive like anything else, so the mark itself is not special. */
    var vSpec = spec.veins;
    if (vSpec && CC.Primitives.KINDS["heat-vein"]) {
      var rng = CC.RNG.stream(settings.seed, "emissive/veins/" + body.archetype);
      /* MANY AND FAINT, which is the project's standing thesis and is
       * especially right here: a handful of bright filaments is a starburst
       * filter, and a hundred faint ones is a corona with texture in it. */
      var n = Math.round((vSpec.count === undefined ? 40 : vSpec.count) * strength);
      var lo = vSpec.length ? vSpec.length[0] : 0.20;
      var hi = vSpec.length ? vSpec.length[1] : 0.75;
      var vAlpha = (vSpec.alpha === undefined ? 0.42 : vSpec.alpha) * strength;

      /* A LITTLE brighter than the halo, and no more.
       *
       * The first version pushed these toward white and the result was a ring
       * of hard white spikes — a starburst camera filter, which is a
       * PHOTOGRAPHIC artifact and the exact thing this pass exists to avoid
       * being mistaken for. A filament of hot gas is brighter than the haze
       * around it by a margin, not by a category, and it keeps the star's
       * colour like everything else here (D123). */
      var vCol = CC.Color.hsva(hue, sat * 0.86,
                               Math.min(1, val * 1.06), 1);

      for (var k = 0; k < n; k++) {
        var el = {
          kind: "heat-vein",
          /* ROOTED WELL INSIDE THE OUTERMOST LAYER, not at its edge.
           *
           * At the edge they came out as detached dashes hanging in space:
           * every filament began exactly where the corona ended, so its
           * bright root had nothing behind it and the eye read a ring of
           * floating spokes rather than gas leaving a star. Starting them
           * back inside the halo means each one EMERGES from something, and
           * the corona's own light hides the root — which is the whole of
           * "reaching through that glow into space". */
          radius: inner * (0.78 + rng() * 0.16),
          angle: rng() * TAU,
          size: (lo + (hi - lo) * rng()) * inner,
          alpha: vAlpha * (0.5 + rng() * 0.5),
          lean: (rng() * 2 - 1) * (vSpec.lean === undefined ? 0.30 : vSpec.lean),
          seed: rng()
        };
        el.length = el.size;
        CC.Primitives.KINDS["heat-vein"](ctx, view, el, vCol);
      }
    }

    ctx.restore();
  }

  return {
    paintLimbDarkening: paintLimbDarkening,
    drawEmissiveGlow: drawEmissiveGlow
  };
})();
