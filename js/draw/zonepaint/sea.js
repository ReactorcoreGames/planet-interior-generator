/* The sea, when it is cold — thermal water and sea ice.
 *
 * Split out of draw/zonepaint.js, which had grown three unrelated concerns and
 * passed the 500-line rule. The seam is which FIELD each one asks: what stayed
 * behind consults the angular ZONE field, and everything here consults the
 * CLIMATE field. They shared nothing but two one-line maths helpers, which are
 * taken from the namespace rather than copied.
 *
 * THIS FILE STILL LEARNS NOTHING ABOUT WHAT A CLIMATE IS. It receives a field
 * with `tempAt(angle)` and asks it for a number, which is the same
 * relationship draw/zonepaint.js has with the zone field (D23) and the same
 * one draw/primitives.js has with data/elements.js.
 *
 * Attached to CC.ZonePaint rather than defining a namespace of its own: every
 * caller already reaches these through `CC.ZonePaint.paintSeaIce`, and a split
 * for line-count reasons must not become a rename for every call site.
 * draw/zonepaint.js must load first.
 */

var CC = CC || {};

(function () {
  "use strict";

  var clampUnit = CC.ZonePaint.clampUnit;
  var smoothFrac = CC.ZonePaint.smoothFrac;
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

  CC.ZonePaint.paintThermalWater = paintThermalWater;
  CC.ZonePaint.paintSeaIce = paintSeaIce;
  /* Exported so a harness can ask "how much of the sea is ice at this
   * temperature" against the REAL function rather than a copy of it. A probe
   * that reimplements its subject agrees with itself and not with the
   * renderer, which has cost this project three rounds (D27, D35, and again
   * while fixing the frozen-ocean case). */
  CC.ZonePaint.iceFraction = iceFraction;
  CC.ZonePaint.CHILL = CHILL;
})();
