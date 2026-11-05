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
 *
 * AFTER THE SPLIT (Session AL) the orbital haze and the outward traits are in
 * draw/zonepaint/outward.js, which attaches here and loads straight after this
 * file. */

var CC = CC || {};

CC.ZonePaint = (function () {
  "use strict";

  function clampUnit(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function smoothFrac(t) { t = clampUnit(t); return t * t * (3 - 2 * t); }

  /* Must match the blend draw/scene-outward.js gives an outward layer: a screened
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
  return {
    paintZoneBand: paintZoneBand,
    ATMOSPHERE_BLEND: ATMOSPHERE_BLEND,
    /* Published for zonepaint/sea.js, which needs the same two curves and must
     * not carry its own copy of them. */
    clampUnit: clampUnit,
    smoothFrac: smoothFrac
  };
})();
