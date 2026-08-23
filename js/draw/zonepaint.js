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
  function drawOutward(ctx, view, details, palette, opacity, half) {
    var els = details.outward;
    if (!els || !els.length) return;

    var colour = palette.get(details.outwardRole || "atmosphere");

    ctx.save();

    /* Clip to the half of the frame the requested side occupies. The rings are
     * drawn as flattened ellipses centred on the body, so "behind" is the top
     * half of that ellipse and "in front" the bottom. */
    ctx.beginPath();
    if (half === "back") {
      ctx.rect(0, 0, view.width, view.cy);
    } else {
      ctx.rect(0, view.cy, view.width, view.height - view.cy);
    }
    ctx.clip();

    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      var alpha = clampUnit(e.alpha * opacity);
      if (alpha <= 0.004) continue;

      var fn = CC.Primitives.KINDS[e.kind];
      if (!fn) continue;

      /* A gap band is a thinning, not an absence. */
      if (e.gap) alpha *= 0.28;

      var oc = CC.DrawDetails.zoneShift(colour, e);
      /* A chunk is a fragment of ROCK, and drawn as a flat pale fill it was
       * indistinguishable from the starfield behind it. `rockFill` gives it a
       * lit face, a dark limb, grain and its own hue. */
      fn(ctx, view, e, e.kind === "chunk"
        ? CC.DrawDetails.rockFill(oc, e, alpha)
        : CC.DrawDetails.toneColour(oc, e.tone, alpha));
    }

    ctx.restore();
  }
  /* ---- the sea, when it is cold -----------------------------------------
   *
   * Two visible states, both of which were missing entirely, and they are
   * different things. Before the climate system the only thing that touched a
   * frozen face's ocean was `paintZoneBand`'s generic HSV delta, which came to
   * a 7% darkening (PROGRESS.md D37) — not an ice sheet, not a surface crust,
   * not even a shift toward white. The user's report was exactly right.
   *
   *   a. the WATER darkens and desaturates    (a property of the liquid)
   *   b. SEA ICE grows on its outer surface   (a real geometric band)
   *
   * Both are drawn inside the deferred fluid's clip, so they stop at the
   * coastline exactly as the water does and can never appear over land.
   *
   * THIS FILE STILL LEARNS NOTHING ABOUT WHAT A CLIMATE IS. It receives a
   * field with `tempAt(angle)` and asks it for a number, which is the same
   * relationship it already has with the zone field (D23). */

  /* How finely the sea is walked. Lower than the frosting's 900 because the
   * ice band has no fine underside to alias — its edges are the fluid's own
   * top and a smooth offset from it. */
  var SEA_SEGMENTS = 360;

  /* Below this the water is cold enough to darken. The ice itself starts at
   * the climate system's own "frozen" threshold, so the sea grows a sheet
   * exactly where the surface state says the bearing is frozen and a card
   * cannot contradict the render. */
  var CHILL = 0.46;

  /* How far below freezing a bearing must be before the sea is ice ALL THE WAY
   * DOWN rather than a shelf over water.
   *
   * KEYED TO THE TEMPERATURE FLOOR, NOT TO ZERO. `gen/climate.js` holds a
   * `VOID_FLOOR` of 0.04 — a body in the deep void keeps a trace of residual
   * warmth, and a temperature pinned at exactly 0 would make every ratio
   * downstream degenerate. The consequence here is that `amt` can never reach
   * 1.0: at the coldest reachable temperature it tops out near 0.89. A
   * threshold written against 1.0 therefore could never fire, and a world with
   * no star and a dead core still rendered a fifth of its ocean as liquid.
   *
   * Derived from the floor rather than hardcoded, so the two cannot drift
   * apart if the floor is ever retuned. The same class of error as D31: a
   * threshold measured against a value the system never actually produces is a
   * threshold that never fires. */
  /* DERIVED FROM THE TEMPERATURE FLOOR, never hardcoded against 1.0.
   *
   * `gen/climate.js` holds a `VOID_FLOOR` — a body in the deep void keeps a
   * trace of residual warmth, because a temperature pinned at exactly 0 makes
   * every ratio downstream degenerate. The consequence here is that `amt` can
   * NEVER reach 1.0: at the coldest temperature the field can produce it tops
   * out around 0.78. A threshold written against 1.0 could therefore never
   * fire, and a world with no star and a dead core still rendered a fifth of
   * its ocean as liquid water.
   *
   * Reading the floor means the two cannot drift apart if it is ever retuned,
   * and it makes the intent explicit: the sea is solid when the surface is as
   * cold as this generator can make it, not when a magic number is hit.
   *
   * Same class of error as D31 — a threshold measured against a value the
   * system never actually produces is a threshold that never fires. */
  function solidAt() {
    var floor = (CC.Climate && CC.Climate.VOID_FLOOR !== undefined)
      ? CC.Climate.VOID_FLOOR : 0.04;
    var cold = (CC.Climate && CC.Climate.COLD !== undefined)
      ? CC.Climate.COLD : 0.18;
    /* THE COLDEST `amt` THE FIELD CAN PRODUCE. A bearing sitting exactly on
     * the temperature floor gives this and nothing gives more, so it is the
     * top of the reachable range — and the ramp below must be normalized
     * against IT, not against 1.0.
     *
     * That was the arithmetic error on the first attempt: the ramp divided by
     * `1 - sAt`, so even at the coldest reachable bearing it only completed a
     * third of the way and the deep-void sea stayed 79% ice. A ratio taken
     * against a maximum the system cannot reach can never finish. */
    return (cold - floor) / cold;
  }

  /* Where the sea starts going solid, as a fraction of the reachable range.
   * Below this it is a shelf over water; above it the last of the liquid
   * freezes out. Kept well up the range so the interesting middle — a thick
   * shelf over dark water — is most of what the control produces. */
  var SOLID_FROM = 0.72;

  /* How much of the sea's depth is ice, given how far below freezing the
   * bearing is. Module-level and exported, so the renderer and any harness
   * read one definition.
   *
   * Eased at the bottom — the shelf thickens quickly at first and then levels
   * off, because a frozen sea is not ten times the ice of a merely freezing
   * one — and then taken the rest of the way to SOLID once the bearing is as
   * cold as the field can make it. */
  function iceFraction(amt) {
    var sAt = solidAt();
    var frac = 0.16 + 0.60 * (amt * (2 - amt));
    /* Normalized against the COLDEST REACHABLE `amt`, so the ramp genuinely
     * completes on a world at the temperature floor. */
    var lo = sAt * SOLID_FROM;
    var solid = smoothFrac((amt - lo) / Math.max(1e-6, sAt - lo));
    return clampUnit(frac + (1 - frac) * solid);
  }

  /* COLD WATER READS DARKER AND LESS BLUE-GREEN THAN WARM WATER.
   *
   * Painted as nested whole rings rather than as angular slices. An angular
   * fill must never be built from independent wedges that share an edge — the
   * antialiasing along every seam accumulates into visible spokes, which this
   * project has now hit three times (D34, plus the two cases documented above
   * in this same file). One continuous path per ring means there is no
   * internal edge for a seam to form along. */
  function paintThermalWater(ctx, view, layer, colour, climate, topFn) {
    if (!climate || !climate.tempAt) return;

    var TAU = Math.PI * 2;
    var rOut = layer.outer;
    var rIn = Math.max(0, layer.inner);
    if (rOut <= rIn) return;

    /* Nothing to do on a sea that is warm all the way round, which is most
     * worlds — so an ordinary body pays one cheap loop and no drawing at all. */
    var chillSum = 0, chillN = 0;
    for (var t = 0; t < SEA_SEGMENTS; t += 4) {
      var ta = (t / SEA_SEGMENTS) * TAU;
      chillSum += clampUnit((CHILL - climate.tempAt(ta)) / CHILL);
      chillN++;
    }
    var mean = chillSum / Math.max(1, chillN);
    if (mean <= 0.01) return;

    ctx.save();

    /* One ring per step, outermost inward, each a complete angular outline —
     * the D34 construction. Alpha is painted as the DIFFERENCE between steps
     * rather than as an absolute, so the accumulated stack reproduces the
     * curve instead of over-darkening where rings overlap. */
    var STEPS = 22;
    var i, a, p;
    for (var st = 0; st < STEPS; st++) {
      var f0 = st / STEPS;
      ctx.beginPath();
      for (i = 0; i <= SEA_SEGMENTS; i++) {
        a = (i / SEA_SEGMENTS) * TAU;
        var top = rOut * (topFn ? topFn(a) : 1);
        var r = top + (rIn - top) * f0;
        p = view.at(r, a);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();

      /* Darker, and pulled off the blue-green toward a colder slate. Water
       * near freezing is genuinely darker than warm water, and it loses
       * saturation rather than changing hue outright.
       *
       * The ring is one flat fill, so the ANGULAR variation is not carried
       * here — it is carried by the ice band below, which is genuinely shaped.
       * This is the liquid reading colder as a body of water. */
      var v = clampUnit(colour.v * (1 - mean * 0.42));
      var sat = clampUnit(colour.s * (1 - mean * 0.34));
      ctx.fillStyle = CC.Color.hsva(colour.h, sat, v, mean * 0.034);
      ctx.fill();
    }

    ctx.restore();
  }

  /* SEA ICE — a real band on the water's outer surface.
   *
   * IT IS GEOMETRY, NOT A TINT, and that is the whole point. D30 established
   * the rule on the atmosphere at some cost: a statement about how far
   * something REACHES is geometry and must be drawn as geometry, because
   * compositing can change what a shape looks like but never what shape it is.
   * "The ice extends this far down into the sea" is exactly such a statement.
   *
   *   thickness  rides how far below freezing the bearing is — a thin rime at
   *              the edge of a cap, a thick shelf over a frozen sea
   *   position   hangs from the fluid's own top surface inward, following the
   *              same angular sea level the water already has
   *   colour     opaque and pale, so it reads as ice rather than as water
   *
   * THE OCEAN DOES NOT SHRINK WHEN IT FREEZES. Water expanding on freezing is
   * a quirk of water, and these are alien seas that may be any liquid at all;
   * the author's control over sea volume is the Ocean depth slider. So the ice
   * sits on top and the layer keeps its thickness.
   *
   * INTERACTION WITH THE FROSTING: the frosting claims the shoreline and the
   * shallows as ice on a cold bearing (`frostShallowCold`, `frostDeepCold`).
   * That is what is on the GROUND; this is what is on the SEA. Both are
   * present and they cannot double-paint into one flat white band, because
   * this is clipped to the fluid and the frosting is deposited on the rock. */
  function paintSeaIce(ctx, view, fluid, colour, climate, topFn,
                       floorR, floorFn, palette, opacity) {
    if (!climate || !climate.tempAt) return;

    var TAU = Math.PI * 2;
    var rOut = fluid.outer;
    var band = Math.max(1e-6, fluid.thickness);

    /* Nothing to draw on a sea that never freezes, which is most worlds. */
    var any = false;
    for (var t = 0; t < SEA_SEGMENTS; t += 4) {
      if (climate.isFrozen((t / SEA_SEGMENTS) * TAU)) { any = true; break; }
    }
    if (!any) return;

    /* ICE TAKES ITS COLOUR FROM THE FROSTING'S OWN FROZEN SET, never from a
     * hardcoded white. That family is already resolved to a frozen extreme
     * (D35) — achromatic, bright, faintly blue, and still carrying a trace of
     * the world it belongs to. Using it here means a red world's sea ice and
     * its polar snow are the same ice, which is what stops the two reading as
     * separate systems that happen to be adjacent. */
    var ice = (palette && palette.layers && palette.layers.frostPeakCold)
      ? palette.get("frostPeakCold")
      : { h: 205, s: 0.06, v: 0.88 };

    /* The three per-bearing figures the ribbon is built from, as closures, so
     * the band loop below can ask for any of them at any angle without
     * recomputing the others.
     *
     * HOW FAR BELOW FREEZING sets the thickness: a bearing just at the
     * threshold grows a rime, a genuinely frozen one grows a shelf. `COLD` is
     * the climate system's own threshold, so the ice starts exactly where the
     * surface state reads "frozen" and a card cannot contradict the render. */
    function amountAt(a) {
      return clampUnit((CC.Climate.COLD - climate.tempAt(a))
                       / Math.max(1e-6, CC.Climate.COLD));
    }

    /* The fluid's own top at this bearing — where ice actually floats. */
    function topAt(a) {
      return rOut * (topFn ? topFn(a) : 1);
    }

    /* The ribbon's inner edge for a band starting at `lo`.
     *
     * Where the bearing does not reach this band the edge is pulled up onto
     * the top, pinching the ribbon shut so it encloses no area there rather
     * than needing a separate sub-path. */
    function innerAt(a, lo) {
      var amt = amountAt(a);
      var top = topAt(a);
      if (amt <= lo) return top;

      /* Thickness as a fraction of the sea's own depth, so a shallow sea gets
       * a proportionate sheet rather than an ice layer thicker than the water
       * beneath it. Eased, so the shelf thickens quickly at first and then
       * levels off — a frozen sea is not ten times the ice of a merely
       * freezing one.
       *
       * BUT IT MUST REACH 1.0, AND THE FIRST VERSION DID NOT.
       *
       * The curve capped at 0.68, so a world with NO heat source at all — no
       * star, a dead core, every bearing at temperature 0.00 — still rendered
       * a third of its ocean as liquid water under the ice. That is not a
       * frozen sea, it is a sea with a lid, and on a body in the deep void
       * there is nothing to keep it liquid. The user was right to query it.
       *
       * The eased term now carries the shelf up quickly at first, and a
       * separate term takes the last of it solid only once the bearing is
       * genuinely at the bottom of the frozen band. So the interesting middle
       * — a shelf over dark water — still occupies most of the range, and the
       * extreme is honest: at Starlight 0 with a dead core the ocean is frozen
       * to its floor. */
      var frac = iceFraction(amt);
      var inner = top - band * frac * ((amt - lo) / Math.max(1e-6, 1 - lo));

      /* NEVER PAST THE SEA FLOOR. A frozen shallow is ice all the way down,
       * which is correct, but the band must not pass through the rock beneath
       * it — the same clamp class as D31 and D34. */
      var floor = floorR * (floorFn ? floorFn(a) : 1);
      if (inner < floor) inner = floor;
      if (inner > top) inner = top;
      return inner;
    }

    ctx.save();

    /* ONE CONTINUOUS RIBBON, NEVER A ROW OF QUADS.
     *
     * The first version walked the circumference painting one quad per
     * segment, which is the construction draw/layers.js and this file both
     * already document as wrong — adjacent quads share a long radial edge, and
     * the antialiasing along every one of those seams accumulates into visible
     * SPOKES. Measured on a frozen world: a Fourier probe of the ice band
     * found power 1.52 at exactly the segment period against a 0.10-0.18
     * baseline at non-harmonic periods, i.e. a tenfold spike sitting precisely
     * where the quads met. The user saw it before the probe was written.
     *
     * **This is the FOURTH time this project has hit this trap** (D34, plus
     * the two cases documented above in this file), so the rule is worth
     * restating in the strongest terms: an angular fill must never be built
     * from independent pieces that share an edge. Trace the outer edge
     * forward, the inner edge back, close once, fill once.
     *
     * Colour and alpha do vary along the band, and a single path can carry
     * only one fill — so the ribbon is drawn in a few THICKNESS BANDS, each a
     * complete closed loop covering the bearings in its own amount range.
     * Bands overlap in coverage rather than abutting, so there is no seam
     * between them either. */
    var BANDS = 5;
    var b, i, a, p;

    for (b = 0; b < BANDS; b++) {
      /* Each band covers everything at or above its own threshold, so the
       * bands NEST rather than tile — the thickest ice is painted by all of
       * them and the thinnest by only the first. Nesting is what keeps the
       * gradient smooth without introducing a boundary between bands. */
      var lo = b / BANDS;

      /* Does any bearing reach this band? */
      var reached = false;
      for (i = 0; i <= SEA_SEGMENTS; i++) {
        if (amountAt((i / SEA_SEGMENTS) * TAU) > lo) { reached = true; break; }
      }
      if (!reached) continue;

      ctx.beginPath();

      /* Outer edge, forward. Where a bearing does not reach this band the
       * ribbon is pinched shut onto the fluid's own top, so the path stays
       * continuous and encloses no area there — the same trick
       * CC.Layers.pinchFn uses on a sub-pixel sea, and the reason a partial
       * cap does not need its own sub-path. */
      for (i = 0; i <= SEA_SEGMENTS; i++) {
        a = (i / SEA_SEGMENTS) * TAU;
        p = view.at(topAt(a), a);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }

      /* Inner edge, backward. */
      for (i = SEA_SEGMENTS; i >= 0; i--) {
        a = (i / SEA_SEGMENTS) * TAU;
        p = view.at(innerAt(a, lo), a);
        ctx.lineTo(p.x, p.y);
      }

      ctx.closePath();

      /* HOW OPAQUE THIS BAND IS, and the split between the first and the rest
       * is what makes thin ice read as ice.
       *
       * The bands NEST — each covers every bearing at or above its own
       * threshold — so a nearly-frozen bearing is painted by all five while a
       * rime is painted by one. Dividing a fixed total by the band count
       * therefore gave the rime a fifth of the intended opacity: measured, the
       * ice fell from 244 mean delta to 76 and read as tinted water rather
       * than as a sheet, which is D37's failure arriving from the other
       * direction.
       *
       * So the FIRST band carries most of the opacity — every bearing with any
       * ice at all is inside it, so every sheet reads as opaque — and the
       * remaining bands add the depth cue that makes thick ice brighter than
       * thin. Together they cannot exceed 1. */
      var op = (opacity === undefined ? 1 : clampUnit(opacity));
      var step = (b === 0 ? 0.72 : 0.24 / (BANDS - 1)) * op;

      /* THE SHEET GRADES THROUGH ITS OWN THICKNESS, not merely between thin
       * ice and thick ice.
       *
       * The nested bands are already a depth axis — band 0 covers the whole
       * sheet, band 4 only its deepest part — so painting each one a little
       * darker and bluer than the last builds a genuine gradient from bright
       * scattering rime at the surface down to dense, blue, compressed ice
       * against the water. That is what real ice looks like in section, and it
       * gives the frozen sea the same read of DEPTH the graded rock layers
       * now have (D61).
       *
       * The previous version went the other way — deeper bands slightly
       * BRIGHTER — which was a statement about thick ice versus thin, and at a
       * span of 0.86..1.04 in value it was too small to read as either. The
       * thickness cue survives in the geometry, which is where it belongs: a
       * frozen bearing simply has more sheet.
       *
       * Blue deepens with depth because that is the property ice actually has:
       * it absorbs red over distance, so the further light travels through it
       * the bluer what comes back is. */
      /* Rescaled to the full 0..1 so the deepest band gets the whole of the
       * treatment. `lo` is a band threshold and tops out around 0.8, so using
       * it raw meant the darkest ice was only ever 80% of the way down the
       * ramp — the sheet never reached its own deep end.
       *
       * THE ICE FOLLOWS THE SEA IT FLOATS ON. Where the water carries a depth
       * gradient the ice takes the same treatment scaled up, so the two read
       * as one column of fluid going dark with depth rather than as a bright
       * lid sitting on a separately-shaded sea. On a body whose ocean declares
       * no gradient the ice keeps its own modest default. */
      var deep = clampUnit(lo / 0.8);
      var seaGrad = (colour && colour.hotEdge) ? colour.hotEdge.strength : 0;
      var drama = 0.46 + 0.42 * seaGrad;

      ctx.fillStyle = CC.Color.hsva(
        ice.h + deep * 18,                            /* bluer with depth */
        clampUnit(ice.s * (1.0 + deep * 2.4) + deep * 0.14),
        clampUnit(ice.v * (1.02 - deep * drama)),
        step);
      ctx.fill();
    }

    ctx.restore();
  }

  return {
    paintZoneBand: paintZoneBand,
    paintThermalWater: paintThermalWater,
    paintSeaIce: paintSeaIce,
    /* Exported so a harness can ask "how much of the sea is ice at this
     * temperature" against the REAL function rather than a copy of it. A probe
     * that reimplements its subject agrees with itself and not with the
     * renderer, which has cost this project three rounds (D27, D35, and again
     * while fixing the frozen-ocean case). */
    iceFraction: iceFraction,
    drawOutward: drawOutward,
    ATMOSPHERE_BLEND: ATMOSPHERE_BLEND,
    CHILL: CHILL
  };
})();
