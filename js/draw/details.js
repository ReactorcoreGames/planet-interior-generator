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
 * which is what ARCHITECTURE's stage-caching table requires. */

var CC = CC || {};

CC.DrawDetails = (function () {
  "use strict";

  var TAU = CC.Math.TAU;
  var clamp = CC.Math.clamp;

  /* Resolve an element's colour from its layer's band colour.
   *
   * Staying in family is what keeps a dense body from looking like confetti:
   * every element is a relative of the material it sits in, never an
   * independent colour.
   *
   * BUT IT MUST ACTUALLY BE VISIBLE. The first pass derived colours a few
   * percent from the band and drew them at 10-20% alpha, and the result was a
   * body that generated 3,600 elements and looked like flat discs. "In family"
   * is a constraint on HUE, not a reason to be invisible: a detail should read
   * as the same material catching the light differently, which means a real
   * step in value.
   *
   * Dark layers are the hard case — a dark band has nowhere to go downward, so
   * detail on it has to lighten or it vanishes. The value step is therefore
   * computed against how dark the layer already is, rather than being a fixed
   * multiplier. */
  /* Apply an element's angular-zone perturbation to its layer's band colour.
   *
   * ZONES PERTURB, THEY DO NOT REPLACE. What arrives on the element is an HSV
   * *delta* resolved in gen/details.js — never a colour and never a zone name.
   * Adding it to whatever the layer rolled is what makes one zone recipe work
   * on a rocky planet, a gas giant and a star alike: a blue world's hot face
   * comes out a hot BLUE, because the blue is the layer's and only the "hot"
   * is the zone's.
   *
   * This is the whole of draw/'s involvement in the zone system. It reads
   * three numbers off an element and knows nothing else about zones — the same
   * relationship this file already has with roles and archetypes. */
  function zoneShift(colour, el) {
    if (!el || !el.zone) return colour;
    var z = el.zone;

    var v = clamp(colour.v + z.v, 0.02, 1);
    var s = clamp(colour.s + z.s, 0, 1);
    var h = ((colour.h + z.h) % 360 + 360) % 360;

    /* Returned as a colour-shaped object rather than mutating the palette
     * entry, which is shared across every element in the layer. */
    return { h: h, s: s, v: v, emissive: colour.emissive };
  }

  /* Move an element's base colour along its layer's THERMAL GRADIENT, by how
   * deep in the band it sits (D59).
   *
   * The band fill already ramps from cool at the outer edge to hot at the
   * inner one. Detail elements derive from the layer's single band colour, so
   * without this they would all be relatives of the AVERAGE — a convection
   * cell at the core boundary would be tinted the same as one just under the
   * crust, and the flow structure would read as flat over a band that is
   * visibly not. Once the elements ride the gradient too, the mantle's
   * circulation gains contrast exactly where the mantle is most violent, which
   * is the whole reason to draw convection at all.
   *
   * Like `zoneShift` this returns a colour-shaped object rather than mutating
   * the palette entry, and it composes with it: a zone delta and a thermal
   * position are independent facts about the same element.
   *
   * `band` is {inner, outer} in body space. Elements outside a graded layer,
   * and layers with no gradient, pass through untouched. */
  function heatShift(colour, el, band) {
    if (!colour.hotEdge || !band) return colour;

    var span = Math.max(1e-6, band.outer - band.inner);
    /* 0 at the layer's outer edge, 1 at its inner (hot) edge — the same
     * orientation the band fill's gradient uses. */
    var t = clamp(1 - (el.radius - band.inner) / span, 0, 1);

    var hot = colour.hotEdge;

    /* Remapped so the band colour sits where the FILL puts it — around 0.78 of
     * the way out — rather than at the very edge. Below that the element cools
     * slightly, matching the fill's cool rim; above it, it heats toward the
     * hot edge. Without the remap the elements would ride a different curve
     * from the band they sit on, and the two would visibly disagree near the
     * layer's outer edge. */
    /* Only a THERMAL gradient cools its outer rim — see the matching note in
     * draw/scene.js's bandFill. A depth gradient is already darkest inward. */
    if (t < 0.22 && hot.v > colour.v) {
      var cool = (0.22 - t) / 0.22 * 0.30 * hot.strength;
      return {
        h: colour.h,
        s: clamp(colour.s * (1 + cool * 0.2), 0, 1),
        v: clamp(colour.v * (1 - cool * 0.65), 0.02, 1),
        emissive: colour.emissive
      };
    }

    var u = (t - 0.22) / 0.78;
    return {
      h: CC.Palette.mixHue(colour.h, hot.h, u),
      s: clamp(colour.s + (hot.s - colour.s) * u, 0, 1),
      v: clamp(colour.v + (hot.v - colour.v) * u, 0.02, 1),
      emissive: colour.emissive
    };
  }

  function toneColour(colour, tone, alpha) {
    var v = colour.v;
    var s = colour.s;

    /* THE VALUE STEP IS ABSOLUTE, NOT PROPORTIONAL.
     *
     * Multiplying a dark layer's value gives a step far too small to see: a
     * band at v=0.22 lightened by 55% of the remaining headroom still only
     * reaches ~0.35, which at 30% alpha is invisible. Two passes were lost to
     * exactly this — thousands of elements generated, none of them legible.
     *
     * Details now move a FIXED distance in value, in whichever direction the
     * layer has room for. That guarantees a visible mark on a near-black
     * mantle and on a near-white core alike. Hue stays close, which is what
     * keeps the element in family; value is what makes it readable. */
    var LIFT = 0.34;

    /* The downward step is SMALLER than the upward one, and deliberately so.
     * A layer darkened toward black loses its material colour along with the
     * detail sitting in it — the crust went from a washed-out pale ring to a
     * near-black one, both times illegible. Down-steps are also scaled by how
     * dark the layer already is, so a mid-value band separates without being
     * crushed. */
    var DROP = 0.16 + 0.20 * clamp((v - 0.20) / 0.55, 0, 1);

    /* Below this a layer is too dark to darken any further, so details on it
     * must lighten instead — a fracture in dark rock catches light, it does
     * not get blacker.
     *
     * The threshold is LOW on purpose. Set at 0.34 it caught mid-value layers
     * like the crust, whose grain then lightened and washed the whole band out
     * to a pale grey ring — the crust should read as the darkest solid band,
     * not the brightest. Only genuinely dark layers lighten. */
    var canDarken = v > 0.20;

    switch (tone) {
      case "lighter":
        return CC.Color.hsva(colour.h + 4,
                             clamp(s * 0.72, 0, 1),
                             clamp(v + LIFT, 0, 1), alpha);

      case "darker":
        if (canDarken) {
          return CC.Color.hsva(colour.h - 4,
                               clamp(s * 1.15, 0, 1),
                               clamp(v - DROP, 0.02, 1), alpha);
        }
        return CC.Color.hsva(colour.h + 5,
                             clamp(s * 0.80, 0, 1),
                             clamp(v + LIFT * 0.85, 0, 1), alpha);

      case "glow":
        /* Self-lit layers: push brightness hard and pull saturation, so the
         * detail reads as hotter material rather than paler material. */
        return CC.Color.hsva(colour.h + 6,
                             clamp(s * 0.62, 0, 1),
                             clamp(v + LIFT * 0.9, 0, 1), alpha);

      case "shift":
      default:
        /* Grain and stipple. Steps in whichever direction the layer allows. */
        if (!canDarken) {
          return CC.Color.hsva(colour.h + 8,
                               clamp(s * 0.78, 0, 1),
                               clamp(v + LIFT, 0, 1), alpha);
        }
        return CC.Color.hsva(colour.h - 7,
                             clamp(s * 1.12, 0, 1),
                             clamp(v - DROP, 0.02, 1), alpha);
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
    var rim = toneColour(colour, tone, alpha * 0.72);

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

      ctx.beginPath();
      for (i = 0; i < group.length; i++) {
        CC.Primitives.speckle(ctx, view, group[i]);
      }
      ctx.fillStyle = toneColour(
        heatShift(zoneShift(colour, group[0]), group[0], heatBand),
        group[0].tone, alpha);
      ctx.fill();
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
      var c = heatShift(zoneShift(colour, e), e, heatBand);

      /* Two primitives need a richer style than a single colour string. */
      if (e.floor) {
        /* AN EXCAVATION — a wedge whose floor is in shadow. Filled with a
         * depth gradient rather than flat, which is the difference between a
         * hole in the crust and a patch stuck on it. See depthFill. */
        fn(ctx, view, e, depthFill(c, e.tone, alpha, e.floor));
      } else if (e.kind === "chunk") {
        /* Rubble inside a layer gets the same rock treatment a debris belt
         * does — see rockFill. */
        fn(ctx, view, e, rockFill(c, e, alpha));
      } else if (e.kind === "gradient-band") {
        fn(ctx, view, e, {
          mid: toneColour(c, e.tone, alpha),
          edge: toneColour(c, e.tone, 0)
        });
      } else if (e.kind === "cell") {
        fn(ctx, view, e, {
          line: toneColour(c, e.tone, alpha),
          fill: toneColour(c, e.tone, alpha * 0.22)
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
        var vv = clamp(c.v * 0.52 + 0.10, 0.10, 0.60);
        fn(ctx, view, e, {
          fill: CC.Color.hsva(c.h - 6, clamp(c.s * 1.25, 0, 0.92), vv, alpha),
          edge: CC.Color.hsva(c.h - 8, clamp(c.s * 1.15, 0, 1),
                              clamp(vv * 0.42, 0.02, 1),
                              clamp(alpha * 1.05, 0, 1))
        });
      } else {
        fn(ctx, view, e, toneColour(c, e.tone, alpha));
      }
    }
  }

  /* ---- surface terrain --------------------------------------------------- */

  /* Draw the terrain profile of a layer that declares relief.
   *
   * Terrain is a boundary displacement plus shading, not a scattered element,
   * which is why it draws here rather than through the primitive table. The
   * layer's band has already been filled to its displaced boundary; this adds
   * the relief shading that makes the profile read as landforms rather than as
   * a wavy edge.
   *
   * THE COASTLINE IS NOT DRAWN HERE. Land is wherever terrain rises above
   * whatever floats on it, and that emerges from the two layers being drawn in
   * order — the ocean fills to its own flat radius over a bumpy floor, so the
   * crossings are coastlines for free (PROGRESS.md D15). */
  function drawRelief(ctx, view, layer, terrain, colour, opts) {
    opts = opts || {};
    var segments = 360;
    var outer = layer.outer;

    /* A highlight along the sunward face of every rise, and a shadow in every
     * hollow. Derived from the LOCAL SLOPE of the field, so it tracks the
     * terrain exactly rather than being a separate decorative pass. */
    var strength = opts.strength === undefined ? 1 : opts.strength;

    ctx.save();
    ctx.lineCap = "butt";

    for (var i = 0; i < segments; i++) {
      var a0 = (i / segments) * TAU;
      var a1 = ((i + 1) / segments) * TAU;

      var h0 = terrain.at(a0);
      var h1 = terrain.at(a1);
      var slope = (h1 - h0) / Math.max(1e-6, terrain.amplitude);

      /* Slope drives both the sign and the strength of the shading.
       *
       * The gain is modest on purpose. At a high gain the term saturates at
       * ±1 across almost every segment, so the shading stops tracking the
       * terrain and instead paints the entire band — which turned the crust
       * into a near-black ring and buried the detail inside it. Kept low,
       * only genuinely steep ground picks up a highlight or a shadow, and
       * flat ground keeps the layer's own colour. */
      var lit = clamp(slope * 3.2, -1, 1);
      if (Math.abs(lit) < 0.06) continue;

      var alpha = Math.abs(lit) * 0.34 * strength;
      var style = lit > 0
        ? CC.Color.rgba(colour.lighter(0.50), alpha)
        : CC.Color.rgba(colour.darker(0.55), alpha);

      var rOut = outer + h0;
      /* Shade only a SHALLOW band just beneath the surface.
       *
       * At 0.75 of the amplitude this reached most of the way down the crust
       * and buried the strata and fractures underneath it — the layer ended up
       * with a textured edge and an empty middle. Relief shading belongs at
       * the surface, which is both what reads correctly and what leaves the
       * layer's own detail visible. */
      var rIn = rOut - Math.max(0.004, terrain.amplitude * 0.30);

      var p0 = view.at(rOut, a0);
      var p1 = view.at(rOut + (h1 - h0), a1);
      var p2 = view.at(rIn + (h1 - h0), a1);
      var p3 = view.at(rIn, a0);

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fillStyle = style;
      ctx.fill();
    }

    ctx.restore();
  }

  return {
    drawLayer: drawLayer,
    drawRelief: drawRelief,
    toneColour: toneColour,
    depthFill: depthFill,
    rockFill: rockFill,
    heatShift: heatShift,
    zoneShift: zoneShift
  };
})();
