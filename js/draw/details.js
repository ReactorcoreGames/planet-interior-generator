/* Drawing detail elements and surface terrain.
 *
 * Walks the element lists produced by gen/details.js and dispatches each to a
 * primitive. LIKE THE REST OF draw/, THIS FILE NAMES NO ROLES AND NO
 * ARCHETYPES: it reads `el.kind` and `el.tone` and knows nothing about what
 * kind of body it is drawing.
 *
 * Colour is derived HERE, not at generation time. Elements carry a `tone`
 * naming their relationship to the layer's band colour, so a colour change
 * redraws the same cached geometry without re-rolling a single position —
 * which is what ARCHITECTURE's stage-caching table requires.
 *
 * AFTER THE SPLIT (Session AL) this file keeps the element loop and the choice
 * of style. The tone helpers are in draw/details-tone.js, the style sets by
 * family in draw/details-gas.js, draw/details-star.js and
 * draw/details-mosaic.js, and the terrain in draw/relief.js. All attach to
 * CC.DrawDetails and load straight after this file. */

var CC = CC || {};

CC.DrawDetails = (function () {
  "use strict";

  /* Dots per fill in a speckle batch — see drawSpeckleBatch (D225). */
  var SPECKLE_CHUNK = 24;
  var clamp = CC.Math.clamp;

  function styleFor(kind, colour, el, alpha, emitted, deep) {
    switch (kind) {
      /* A field of welded fragments — 2-4 materials, the joints between them,
       * and the holes. Not expressible as a colour string by a long way; see
       * mosaicFill and draw/primitives/mosaic.js. */
      case "mosaic":  return CC.DrawDetails.mosaicFill(colour, el, alpha);
      /* A chunk is a fragment of ROCK, and drawn as a flat pale fill it was
       * indistinguishable from the starfield behind it. */
      case "chunk":   return rockFill(colour, el, alpha);
      case "storm":   return CC.DrawDetails.stormFill(colour, el, alpha);
      case "capsule": return CC.DrawDetails.hullFill(colour, el, alpha);
      /* Built things that are not hulls — the same metal, flat-faced. See
       * draw/primitives/machines.js. */
      case "plate":   return CC.DrawDetails.hullFill(colour, el, alpha);
      case "borer":   return CC.DrawDetails.hullFill(colour, el, alpha);
      case "shard":   return CC.DrawDetails.gemFill(colour, el, alpha);
      /* A loop of glowing gas and a magnetically-structured dark patch —
       * neither expressible as a colour string. See each function. */
      case "prominence": return CC.DrawDetails.plasmaFill(colour, el, alpha);
      /* A PLUME IS THE SAME MATERIAL AS A PROMINENCE, so it takes the same
       * colours — hotter than the layer, stated as value rather than hue
       * (D123). What separates the two is SHAPE, not temperature: a loop
       * anchored at both ends against a one-footed tongue of rising gas. */
      case "plume":      return CC.DrawDetails.plasmaFill(colour, el, alpha);
      /* A FLARE IS THE SAME MATERIAL AGAIN, thrown rather than rising, so it
       * takes the same plasma tones. What separates it from the plume and the
       * prominence is SHAPE — a spray of fragments against a tongue and a loop
       * — which is where the whole difference belongs (D76/D123). */
      case "flare":      return CC.DrawDetails.plasmaFill(colour, el, alpha);
      /* OPEN FIELD IS THE SAME MATERIAL LEAVING IN A STRAIGHT LINE, so it
       * takes the same plasma tones as the loop, the tongue and the spray.
       * D123 again, and it matters more here than anywhere: the mark is
       * defined ENTIRELY by its silhouette being straight, so giving it a
       * colour of its own would be inventing a second signal for a difference
       * the shape already states. */
      case "open-field": return CC.DrawDetails.plasmaFill(colour, el, alpha);
      /* THE DIAGRAMMATIC HALF OF A CORONAL HOLE — the field itself, drawn as
       * annotation rather than as material. See fieldFill, and read its note
       * before "fixing" the colour exception. */
      case "field-lines": return CC.DrawDetails.fieldFill(colour, el, alpha, deep);
      case "starspot":   return CC.DrawDetails.spotFill(colour, el, alpha);
      /* Four tones, because a rising flank and a sinking one at the same
       * brightness say nothing about which is which. */
      case "convection-cell": return CC.DrawDetails.convectionFill(colour, el, alpha);
      /* A dark sphere with a burning leading edge and a wake. */
      case "engulfed-world":  return CC.DrawDetails.doomedFill(colour, el, alpha);
      /* A metal backing and a glass face; the glass is the star. See
       * mirrorFill, and read its note before "fixing" the exception. */
      case "orbital-mirror":  return CC.DrawDetails.mirrorFill(colour, el, alpha, emitted);
      /* Same machined material as a pressure hull, cut into a different
       * object — a cylinder with a cone pointing at the star. */
      case "coned-cylinder":  return CC.DrawDetails.hullFill(colour, el, alpha);
      /* A style a primitive file registered (CC.Primitives.registerStyle). */
      default:
        return CC.Primitives.STYLES[kind] ? CC.Primitives.STYLES[kind](colour, el, alpha) : null;
    }
  }

  /* A DEPTH FILL FOR AN EXCAVATION — the stops a hole is drawn with.
   *
   * An impact basin or a crater filled with one flat colour reads as a patch
   * laid ON the crust: the outline says "excavation" while the fill says
   * "sticker". What sells a hole is that its floor is in shadow — less light
   * reaches the deeper you look — so the fill has to run from the surrounding
   * material at the rim down to nearly black at the bottom.
   *
   * Returned as a {rim, mid, floor} triple rather than as a canvas gradient,
   * because colour belongs here and geometry belongs in the primitive: the
   * wedge knows the radii to hang these stops on, and this knows what the
   * three colours are. `el.floor` is how dark the bottom goes, 0..1.
   *
   * Alpha RISES toward the floor. A basin's rim should feather into the crust
   * around it while its floor is solid — an even alpha made the whole shape
   * read as one translucent film. */
  function depthFill(colour, tone, alpha, floor) {
    var deep = clamp(floor === undefined ? 0.8 : floor, 0, 1);
    var rim = CC.DrawDetails.toneColour(colour, tone, alpha * 0.72);

    /* The floor is the layer's own hue driven toward black, so a basin in red
     * rock is a very dark red rather than a grey hole — the same "stay in
     * family" rule every other element follows. */
    function sunk(k, a) {
      return CC.Color.hsva(colour.h,
                           clamp(colour.s * (1 - 0.35 * k), 0, 1),
                           clamp(colour.v * (1 - deep * k), 0.015, 1),
                           clamp(a, 0, 1));
    }

    return {
      rim: rim,
      mid: sunk(0.62, alpha * 0.92),
      floor: sunk(1, Math.min(1, alpha * 1.06))
    };
  }

  /* THE COLOURS A FRAGMENT OF ROCK IS DRAWN WITH.
   *
   * Debris was being drawn as one flat pale fill, and against a starfield that
   * is indistinguishable from the background plate — a star is a small bright
   * uniform dot, and so was a chunk. Rock differs from a star in three ways,
   * and this supplies all three:
   *
   *   1. IT IS NOT UNIFORM. A lit face and a shadowed face, so the fragment
   *      has internal contrast and reads as a solid object with a form.
   *   2. IT IS NOT ONE COLOUR. Each fragment shifts its own hue and value from
   *      its seed, so a belt is a population of different rocks rather than
   *      one rock stamped 400 times.
   *   3. IT IS DARKER AND WARMER THAN A STAR. Stars are pale and bluish here;
   *      rock is pulled toward the layer's own hue and saturated, so the two
   *      separate by colour as well as by shape.
   */
  function rockFill(colour, el, alpha) {
    var seed = el.seed || 0;
    /* Per-fragment variation, deterministic from the element's own seed.
     * Signed, so a belt scatters either side of the base colour. */
    var vary = Math.sin(seed * 127.1);
    var hue = colour.h + vary * 18;

    /* ROCK IS MUDDY, NOT VIVID.
     *
     * The obvious move — saturate the layer colour hard so the fragments stop
     * looking like stars — overshoots: an outward trait takes the ATMOSPHERE's
     * colour, and a saturated atmosphere hue turns a debris belt into a string
     * of glowing berries. Stone is a low-chroma material, and its colour cue
     * against a starfield is that it is DIM and MURKY where a star is bright
     * and clean, not that it is more colourful.
     *
     * So saturation is held to a mid band — enough that the fragments are
     * clearly coloured rather than white, capped so they stay mineral — and
     * the value is pulled well down. The separation from the starfield is then
     * carried by darkness, texture and the lit/shadow split rather than by
     * chroma. */
    var sat = clamp(colour.s * 0.55 + 0.18, 0.16, 0.48);
    var val = clamp(colour.v * (0.38 + 0.20 * vary), 0.08, 0.46);

    return {
      body: CC.Color.hsva(hue, sat, val, alpha),
      /* The lit crown — brighter and less saturated, as a lit face is. Kept
       * clear of white so it reads as sunlit stone, not as a highlight. */
      lit: CC.Color.hsva(hue + 6, clamp(sat * 0.68, 0, 1),
                         clamp(val + 0.20, 0, 0.66), alpha),
      /* THE SUNWARD RIM — the brightest thing on the fragment, and the mark
       * that does the actual separating.
       *
       * It is allowed to reach much higher than `lit` does, and that is the
       * point rather than an oversight. `lit` is a FACE, and a face this
       * bright would make the whole rock read as a pale dot — the failure
       * being fixed. A rim is a LINE, so it can carry near-specular brightness
       * across a couple of pixels of width without lifting the fragment's
       * overall value at all: the rock stays dim and murky, and gains an edge.
       *
       * Kept in the fragment's own hue and given a floor rather than being set
       * to white, so a belt still reads as stone catching the light instead of
       * as a string of highlights — and so it never becomes the small bright
       * uniform mark it exists to be distinguishable from. */
      rim: CC.Color.hsva(hue + 10, clamp(sat * 0.42, 0, 0.30),
                         clamp(val + 0.46, 0.62, 0.92), alpha),
      /* The dark limb. Deep enough to read at a few pixels across. */
      shadow: CC.Color.hsva(hue - 7, clamp(sat * 1.15, 0, 1),
                            clamp(val * 0.32, 0.02, 1), alpha),
      /* Grain: pits and mineral speckle on the fragment's face. */
      fleck: CC.Color.hsva(hue - 12, clamp(sat * 1.2, 0, 1),
                           clamp(val * 0.48, 0.02, 1), alpha * 0.85)
    };
  }

  /* Speckle is drawn as ONE PATH PER (tone, tier) group rather than one path
   * per dot. A crust can carry a thousand grains; a thousand beginPath/fill
   * pairs is what turns a 200ms render into a 4s one. */
  function drawSpeckleBatch(ctx, view, els, colour, fadeFn, heatBand) {
    if (!els.length) return;

    /* A GRADED LAYER SPLITS BY DEPTH FOR THE SAME REASON, a third time.
     *
     * The grain in a mantle spans the whole band, and one averaged colour
     * across it would paint the grain at the core boundary the same as the
     * grain under the crust — flattening the thermal gradient in the very
     * detail that covers most of the layer's area. Ten buckets, matching the
     * precedent set by the fade bands and the zone shift above. */
    var heatBucket = null;
    if (heatBand) {
      var hSpan = Math.max(1e-6, heatBand.outer - heatBand.inner);
      heatBucket = function (el) {
        return Math.round(clamp(1 - (el.radius - heatBand.inner) / hSpan, 0, 1) * 10);
      };
    }

    /* Group by tier, because tier drives both size and alpha.
     *
     * In a FADING layer the grouping also splits by depth band, because a
     * single averaged alpha across an atmosphere would draw the outermost
     * grains as densely as the innermost and reinstate the hard rim the fade
     * exists to remove. Eight bands is enough for the gradient to read as
     * smooth while still batching hundreds of dots per fill. */
    var byTier = {};
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      var key = fadeFn ? (e.tier + ":" + Math.floor(fadeFn(e.radius) * 8)) : String(e.tier);

      /* A ZONED LAYER ALSO SPLITS BY ITS COLOUR SHIFT.
       *
       * One averaged colour across the whole batch would smear the dayside
       * and nightside into a single mid-tone and erase the terminator — the
       * same failure the fade bands were split to avoid, arriving by a
       * different route. Twelve buckets is enough for the shift to read as
       * continuous while still batching hundreds of dots per fill. */
      if (e.zone) {
        key += "|" + Math.round(e.zone.v * 12) + "," + Math.round(e.zone.h / 8);
      }
      if (heatBucket) key += "#" + heatBucket(e);
      /* A BLENDED TRAIT BATCHES SEPARATELY FROM THE PLAIN GRAIN.
       *
       * The blend is a property of the whole trait rather than of an
       * instance, so every element carrying it shares one value and the split
       * costs at most one extra fill — no per-element state changes, which is
       * the thing that would actually be expensive here. */
      if (e.blend) key += "@" + e.blend;
      (byTier[key] || (byTier[key] = [])).push(e);
    }

    for (var key2 in byTier) {
      if (!Object.prototype.hasOwnProperty.call(byTier, key2)) continue;
      var group = byTier[key2];

      /* Alpha is averaged across the group. Individual variation within a tier
       * is small, and the saving is large. */
      var sum = 0;
      for (i = 0; i < group.length; i++) {
        sum += group[i].alpha * (fadeFn ? fadeFn(group[i].radius) : 1);
      }
      var alpha = clamp(sum / group.length, 0, 1);
      if (alpha <= 0.004) continue;

      /* Inside save()/restore() so the blend cannot leak into later drawing —
       * the same discipline the layer composite in draw/layers.js follows. */
      var blend = group[0].blend;
      if (blend) { ctx.save(); ctx.globalCompositeOperation = blend; }

      ctx.fillStyle = CC.DrawDetails.toneColour(
        CC.DrawDetails.heatShift(CC.DrawDetails.zoneShift(colour, group[0]), group[0], heatBand),
        group[0].tone, alpha);
      /* `chunk`: flush the path every N dots. FILLING ONE PATH COSTS
       * SUPERLINEARLY IN ITS CONTOUR COUNT — measured, 7,000 dots took
       * 4,040 ms as one path, 94 ms in hundreds and 34 ms one by one (D201's
       * 900 circles at 70 ms was the same effect). Opt-in on the nebula
       * first (D225), then made the DEFAULT for every body by the user's
       * call (Session Y): separate fills compound alpha where two dots
       * overlap and one path does not, so every grainy body's pixels moved
       * slightly, for a render several times cheaper. An element may still
       * name its own `chunk`. */
      var chunk = group[0].chunk || SPECKLE_CHUNK;
      ctx.beginPath();
      for (i = 0; i < group.length; i++) {
        CC.Primitives.speckle(ctx, view, group[i]);
        if ((i + 1) % chunk === 0 && i + 1 < group.length) {
          ctx.fill();
          ctx.beginPath();
        }
      }
      ctx.fill();

      if (blend) ctx.restore();
    }
  }

  /* Draw every element belonging to one layer.
   *
   * The caller has already clipped to the layer's band, so elements cannot
   * spill across a boundary. */
  function drawLayer(ctx, view, elements, colour, opts) {
    opts = opts || {};
    var opacity = opts.elementOpacity === undefined ? 1 : opts.elementOpacity;
    var flowMode = opts.flowMode || "balanced";

    /* An OUTWARD layer's details must fade with its falloff.
     *
     * An atmosphere's band fill dissolves toward its outer edge, but its haze
     * and stipple were drawn at flat alpha across the whole depth. At high
     * Element opacity that made the layer read as a solid shell with a hard
     * rim — the exact failure the falloff curve exists to prevent. Elements
     * now ride the same curve as the fill, so the layer stays a layer however
     * far the opacity control is pushed.
     *
     * `fade` is supplied by the caller as {inner, outer} in body space; the
     * element's own radius decides how much of it it keeps. */
    var fade = opts.fade || null;

    /* The layer's radial extent, so elements can be placed on its thermal
     * gradient. Absent on layers that do not carry one. */
    var heatBand = colour.hotEdge ? (opts.band || null) : null;

    /* How much of its alpha an element keeps, given where it sits in an
     * outward layer's falloff. Uses the same curve as the band fill, so the
     * details and the layer dissolve together. */
    function fadeAt(radius) {
      if (!fade) return 1;
      var span = Math.max(1e-6, fade.outer - fade.inner);
      var t = clamp((radius - fade.inner) / span, 0, 1);
      return CC.Layers.falloffAlpha(t, fade.hold);
    }

    /* Speckle batches; everything else draws individually. */
    var speckles = [];
    var rest = [];
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];

      /* Flow indicators: "none" removes directional elements entirely, and
       * "subtle" downgrades arrows to headless lines. Generation already
       * scaled the COUNT; this governs how they are drawn. */
      if (el.flow && flowMode === "none") continue;
      if (el.kind === "arrow" && flowMode === "subtle") {
        el = { kind: "flow-line", tier: el.tier, angle: el.angle,
               radius: el.radius, size: el.size, alpha: el.alpha,
               tone: el.tone, seed: el.seed, outward: el.outward,
               lean: el.lean, length: el.length };
      }

      if (el.kind === "speckle") speckles.push(el);
      else rest.push(el);
    }

    drawSpeckleBatch(ctx, view, speckles, colour, fade ? fadeAt : null, heatBand);

    for (i = 0; i < rest.length; i++) {
      var e = rest[i];
      var alpha = clamp(e.alpha * opacity * fadeAt(e.radius), 0, 1);
      if (alpha <= 0.004) continue;

      var fn = CC.Primitives.KINDS[e.kind];
      if (!fn) continue;

      /* Each element takes its layer's colour perturbed by whatever zone it
       * fell in — a no-op on an unzoned body — and then moved along the
       * layer's thermal gradient by how deep it sits, a no-op on a layer that
       * does not carry one. */
      var c = CC.DrawDetails.heatShift(CC.DrawDetails.zoneShift(colour, e), e, heatBand);

      /* Two primitives need a richer style than a single colour string. */
      if (e.floor) {
        /* AN EXCAVATION — a wedge whose floor is in shadow. Filled with a
         * depth gradient rather than flat, which is the difference between a
         * hole in the crust and a patch stuck on it. See depthFill. */
        fn(ctx, view, e, depthFill(c, e.tone, alpha, e.floor));
      } else if (styleFor(e.kind, c, e, alpha)) {
        /* A primitive that wants a richer style than a colour string — rock,
         * a shaded storm, a metal hull, a gem. See styleFor. */
        fn(ctx, view, e, styleFor(e.kind, c, e, alpha));
      } else if (e.kind === "gradient-band") {
        /* Concentric bands are the one element whose whole job is to separate
         * from its neighbours, so this is where `bandContrast` applies. */
        fn(ctx, view, e, {
          mid: CC.DrawDetails.toneColour(c, e.tone, alpha, c.bandContrast),
          edge: CC.DrawDetails.toneColour(c, e.tone, 0, c.bandContrast)
        });
      } else if (e.kind === "cell") {
        fn(ctx, view, e, {
          line: CC.DrawDetails.toneColour(c, e.tone, alpha),
          fill: CC.DrawDetails.toneColour(c, e.tone, alpha * 0.22)
        });
      } else if (e.kind === "vein" && e.bulk) {
        /* A BULK VEIN IS TWO-TONE, and that is most of why it separates from
         * the flow indicators around it (D60). Everything else in a mantle is
         * a single-tone stroke; nothing else is a bright body inside a dark
         * contour, so the eye picks it out immediately as a different KIND of
         * thing rather than a brighter example of the same thing.
         *
         * The contour is drawn from the layer's own darkening rule rather than
         * flat black, so it reads as a material edge — the same reasoning the
         * layer boundary stroke in draw/scene.js follows. */
        /* THE FILL IS A METAL, NOT A SILHOUETTE.
         *
         * Running a bulk vein through the ordinary `darker` tone crushed it
         * toward black on an already-dark mantle, and a black shape reads as a
         * hole in the layer rather than as something embedded in it — it lost
         * the material relationship that keeps a dense body from looking like
         * confetti. An ore seam is a DARK SATURATED colour with a hue of its
         * own, so the fill keeps most of its saturation and lands well clear of
         * black, and the contour goes darker still to seat it in the rock. */
        /* `bright` INVERTS THE POLARITY, for a lode of liquid METAL rather
         * than a seam of ore.
         *
         * The dark-fill-in-darker-contour above is right for an ore seam in
         * rock, and it fails completely in a dark fluid: helium rain in a
         * water-cloud deck at v=0.32 drew at v=0.27 — a near-black shape on a
         * dark purple ground, invisible by construction. Darkening only works
         * where there is room beneath to darken INTO.
         *
         * Falling metal is the opposite material anyway. It is reflective, so
         * it is BRIGHTER than the fluid around it, and the contour is what
         * seats it rather than the fill. The two polarities share one
         * primitive and one style shape; which way round they go is a fact
         * about the material, so the trait declares it. */
        var vv, fillC, edgeC;
        if (e.bright) {
          vv = clamp(c.v * 0.55 + 0.42, 0.42, 0.95);
          fillC = CC.Color.hsva(c.h + 8, clamp(c.s * 0.55, 0, 0.55), vv, alpha);
          /* A dark contour under a bright fill, which is what gives a metal
           * droplet its edge against a pale background as well as a dark one. */
          edgeC = CC.Color.hsva(c.h - 4, clamp(c.s * 1.2, 0, 1),
                                clamp(c.v * 0.30, 0.02, 1),
                                clamp(alpha * 1.05, 0, 1));
        } else {
          vv = clamp(c.v * 0.52 + 0.10, 0.10, 0.60);
          fillC = CC.Color.hsva(c.h - 6, clamp(c.s * 1.25, 0, 0.92), vv, alpha);
          edgeC = CC.Color.hsva(c.h - 8, clamp(c.s * 1.15, 0, 1),
                                clamp(vv * 0.42, 0.02, 1),
                                clamp(alpha * 1.05, 0, 1));
        }
        fn(ctx, view, e, { fill: fillC, edge: edgeC });
      } else {
        fn(ctx, view, e, CC.DrawDetails.toneColour(c, e.tone, alpha));
      }
    }
  }

  return {
    drawLayer: drawLayer,
    depthFill: depthFill,
    rockFill: rockFill,
    styleFor: styleFor
  };
})();
