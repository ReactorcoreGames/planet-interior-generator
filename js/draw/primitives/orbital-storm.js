/* The great storm — a shaded cyclone in a gas giant's envelope.
 *
 * Split out of draw/primitives/orbital.js, which passed the 500-line rule. It
 * exists because a soft irregular blob could not say what the thing IS.
 *
 * THE SAME RULES APPLY HERE AS IN draw/primitives.js. No role names, no
 * archetype names, one signature, and pixels only through `view`.
 *
 * Registered into CC.Primitives, so `KINDS` stays one table and draw/details.js
 * still has exactly one place to look a kind up. draw/primitives.js must load
 * first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = CC.Math.TAU;

  /* ---- storm ------------------------------------------------------------- */

  /* A HAZARD ZONE IN CROSS-SECTION — the irregular lobed patch, given weather.
   *
   * THIS REVERTED, and the reason is worth recording. The first version was a
   * `blob`: an irregular lobed polygon, which read well — the user's words
   * were "the shapes and sizes are good", and specifically that the outline
   * showed the region a diving vessel would know to avoid. The complaint was
   * that it was "flat, textureless and pale".
   *
   * The second version answered that by making it a shaded cyclone with
   * concentric bands and an eye, which is a TOP-DOWN view of a storm. In a
   * cross-section that is simply the wrong projection: you are looking at the
   * side of the planet, so a storm is a turbulent volume you cut through, not
   * a spiral seen from above. Fixing the material by changing the shape threw
   * away the half that was already right.
   *
   * So the outline is the original lobed polygon again, and the three things
   * that were actually missing are added inside it:
   *
   *   1. TURBULENCE — fBm noise sampled in BODY SPACE, so the texture is
   *      locked to the planet and does not swim when the view pans or zooms.
   *      Drawn as a field of short strokes rather than per-pixel, which keeps
   *      it resolution-independent like everything else here.
   *   2. DEPTH — a linear gradient darkening downward through the storm, so
   *      the part reaching deeper into the envelope reads as deeper.
   *   3. TRANSLUCENCY — the whole thing is composited so the banding and
   *      layer detail behind it still show through. A storm is weather in a
   *      gas, not a lid on it.
   *
   * `style` is a {top, bottom, turb, blend, alpha} set — see stormFill. */
  function storm(ctx, view, el, style) {
    var c = view.at(el.radius, el.angle);
    var base = view.px(el.size);
    var lobes = el.lobes || 7;
    var rough = el.rough === undefined ? 0.34 : el.rough;
    var squash = el.squash === undefined ? 0.72 : el.squash;
    var seed = el.seed || 0;

    /* THE OUTLINE IS A CLOSED CURVE THROUGH THE SAME LOBE RADII.
     *
     * IT USED TO BE `blob`'S ANGULAR POLYGON, and the note here defended that
     * at length: the facets read as a HAZARD ZONE on a diagram rather than as
     * a photograph, it had been changed away from twice and reverted twice.
     * That reasoning was sound FOR THE SIZE THE STORM WAS THEN. It does not
     * survive the size the storm is now.
     *
     * A great storm is authored at 1.10-2.00 troposphere-thicknesses, roughly
     * double what it was. Seven straight segments around a small mark read as
     * a slightly irregular blob; the SAME seven segments around a mark that
     * spans a third of the body are metre-long straight edges, and the result
     * reads as a translucent shard of glass laid over the planet. That is not
     * the hazard-zone idea working at a bigger scale, it is a different and
     * worse shape.
     *
     * So the radii are unchanged — same two sine terms, same seed, same
     * irregular silhouette — and only the INTERPOLATION between them changes,
     * from straight to curved. The storm keeps its lopsided, non-circular
     * outline (which is what stops it reading as a printed dot) and loses the
     * facets (which are what made it read as a crystal).
     *
     * Midpoint-quadratic: each lobe radius becomes a control point and the
     * curve passes through the midpoints between them. That is the standard
     * way to close a smooth loop through scattered points without needing
     * tangents, and it costs one pass and no extra state.
     *
     * Two sine terms from the element's own seed, no RNG at draw time, so the
     * shape never changes on a redraw. */
    /* A QUADRATIC THROUGH MIDPOINTS PASSES INSIDE ITS CONTROL POINTS, so the
     * curved outline encloses a visibly smaller area than the polygon through
     * the same radii did — measured at roughly 12-15% narrower, which would
     * have quietly undone the size increase the storms were just given. The
     * radii are scaled back out so the curve reaches the authored size and
     * `size` keeps meaning what it says. */
    var CURVE_GAIN = 1.15;

    function lobeAt(i) {
      var t = (i / lobes) * TAU;
      var w = 1 + Math.sin(t * 2.3 + seed * 31.7) * rough
                + Math.sin(t * 3.7 + seed * 11.3) * rough * 0.5;
      var rr = base * w * CURVE_GAIN;
      return { x: c.x + Math.cos(t) * rr, y: c.y + Math.sin(t) * rr * squash };
    }

    function outline() {
      ctx.beginPath();
      var prev = lobeAt(0);
      /* Start at the midpoint of the last-to-first edge, so the loop closes
       * without a seam. */
      var last = lobeAt(lobes - 1);
      ctx.moveTo((last.x + prev.x) / 2, (last.y + prev.y) / 2);
      for (var i = 1; i <= lobes; i++) {
        var p = lobeAt(i % lobes);
        /* `prev` is the control point; the curve passes through the midpoint
         * between it and the next lobe. */
        ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + p.x) / 2,
                             (prev.y + p.y) / 2);
        prev = p;
      }
      ctx.closePath();
    }

    ctx.save();
    /* TRANSLUCENT, so the body's own banding and detail read through it. The
     * blend mode does the rest — see stormFill for which one and why. */
    ctx.globalAlpha = style.alpha === undefined ? 0.72 : style.alpha;
    if (style.blend) ctx.globalCompositeOperation = style.blend;

    /* THE EDGE IS FEATHERED, NOT CUT.
     *
     * A hard-filled polygon at small size is a rock: once the turbulence
     * strokes fall below a pixel the only thing left is a crisp faceted
     * silhouette, and that is exactly what the small storms read as. A soft
     * perimeter is what says "this is a region of weather" rather than "this
     * is an object".
     *
     * Done as a radial gradient on the ALPHA rather than by blurring, so it
     * costs one gradient and stays resolution-independent. The shape itself is
     * unchanged — the outline is still the angular polygon, it simply stops
     * having a hard boundary. */
    var feather = el.feather === undefined ? 0.30 : el.feather;

    /* THE DEPTH GRADIENT. Down is toward the body's centre, so the axis runs
     * along the element's own bearing rather than along the screen — a storm
     * on the left limb darkens toward the right, and the picture stays correct
     * whatever the global rotation is. */
    var dx = Math.cos(el.angle), dy = Math.sin(el.angle);
    var g = ctx.createLinearGradient(c.x + dx * base, c.y + dy * base,
                                     c.x - dx * base, c.y - dy * base);
    g.addColorStop(0, style.top);
    g.addColorStop(1, style.bottom);

    outline();
    ctx.fillStyle = g;
    ctx.fill();

    /* THE SOFT EDGE — painted as a second fill whose alpha runs out, NOT as an
     * erase.
     *
     * `destination-out` was the obvious way to feather and it does not work
     * here: the storm is drawn straight onto the scene under a `multiply` or
     * `overlay` blend, so a composite operation applies to the whole canvas
     * rather than to the storm in isolation. The erase either did nothing
     * visible or would have punched a hole in the layers behind. Isolating it
     * properly needs an offscreen buffer per storm, which is real cost for a
     * feature that has a cheaper form.
     *
     * The cheaper form: fill the shape a second time with a radial gradient
     * that is TRANSPARENT in the middle and carries the layer's own colour at
     * the rim, so the storm's edge blends back toward its surroundings instead
     * of stopping. Same reading, one extra fill, no buffer, and it composites
     * correctly under any blend mode because it is an ordinary paint. */
    if (feather > 0.001 && style.rim) {
      /* Same clamping rule as the fade above: the outer stop has to sit at or
       * past the outline's furthest lobe, or everything beyond it is filled
       * with solid rim colour instead of being feathered. */
      var edge = base * (1 + rough * 1.5) * CURVE_GAIN;
      var fg = ctx.createRadialGradient(c.x, c.y, edge * (1 - feather),
                                        c.x, c.y, edge);
      fg.addColorStop(0, style.rimClear);
      fg.addColorStop(1, style.rim);
      outline();
      ctx.fillStyle = fg;
      ctx.fill();
    }

    /* AND, FOR A SPANNING STORM, THE RADIAL ENDS DISSOLVE TOO.
     *
     * A storm crossing from the cirrus deck down into the banded layer has no
     * layer boundary to stop it any more (it draws in its own unclipped pass),
     * so it has to end by fading. Same technique as the feather: the layer's
     * own colour painted back over both radial extremes, along the body's
     * radial direction — toward space at the top, toward the interior at the
     * bottom, which is the direction the feature actually thins in. */
    if (el.fadeEnds && style.rim) {
      /* THE GRADIENT MUST REACH PAST THE SHAPE'S FURTHEST POINT.
       *
       * A canvas gradient CLAMPS to its endpoint colour beyond its last stop,
       * so any part of the shape outside the gradient's span is painted in
       * `rim` at full opacity — the layer's own colour, which is exactly
       * "invisible". The outline reaches `base * (1 + rough * 1.5)` at its
       * furthest lobe, so anything shorter erases the storm from the outside
       * in.
       *
       * The first attempt multiplied by `squash`, which was backwards twice
       * over: squash compresses the shape PERPENDICULAR to the radial axis,
       * not along it, and multiplying by a number below 1 made the span
       * shorter when it needed to be longer. Measured: an 85px shape given a
       * 52px gradient, so the outer two thirds was solid rim colour. That is
       * the fourth "it draws but cannot be seen" failure this phase and the
       * third caused by a span that did not cover what it was painting. */
      /* `CURVE_GAIN` for the same reason the feather's `edge` carries it: the
       * outline's furthest point moved outward when the radii were scaled to
       * compensate for the curve, and a gradient that stops short of the shape
       * paints the remainder in solid `rim` — the fifth instance of the
       * failure this comment already describes. */
      var reach = base * (1 + rough * 1.5) * CURVE_GAIN;
      var ex = Math.cos(el.angle), ey = Math.sin(el.angle);
      var eg = ctx.createLinearGradient(c.x + ex * reach, c.y + ey * reach,
                                        c.x - ex * reach, c.y - ey * reach);
      eg.addColorStop(0, style.rim);
      eg.addColorStop(el.fadeEnds, style.rimClear);
      eg.addColorStop(1 - el.fadeEnds, style.rimClear);
      eg.addColorStop(1, style.rim);
      outline();
      ctx.fillStyle = eg;
      ctx.fill();
    }

    /* THE TURBULENCE, clipped inside the storm.
     *
     * Short strokes whose angle and length come from fBm sampled at the
     * element's position in BODY space (el.radius / el.angle), NOT at its
     * pixel position — which is what keeps the pattern welded to the planet
     * under pan and zoom, and is the same reasoning draw/grain.js follows for
     * the frosting's tooth.
     *
     * The count scales with the storm's own size in body units rather than
     * with its pixel size, so a storm has the same amount of structure at
     * every resolution. */
    ctx.clip();
    if (CC.RNG && CC.RNG.makeNoise2D) {
      var n = stormNoise();
      /* A GRID, NOT A SCATTER. Two sine terms produce a Lissajous figure
       * rather than a spread — the strokes landed along a curve and left most
       * of the storm empty, which is why the first attempt read as untextured.
       * A jittered grid covers the shape by construction. */
      var G = 8;
      ctx.lineCap = "round";
      ctx.strokeStyle = style.turb;
      for (var gy = 0; gy < G; gy++) {
        for (var gx = 0; gx < G; gx++) {
          /* Cell centre in the storm's own -1..1 box, plus a jitter of most of
           * a whole cell.
           *
           * At a fraction of a cell the strokes stayed near their lattice
           * points and the field read as a woven crosshatch — a regular
           * pattern, which is the opposite of turbulence. Jittering by
           * ~1.6 cells lets neighbours cross and leaves gaps, so the grid
           * stops being visible while the coverage it guarantees remains. */
          var u = (gx + 0.5) / G * 2 - 1;
          var v = (gy + 0.5) / G * 2 - 1;
          u += Math.sin(seed * 53.1 + gx * 12.9 + gy * 4.7) * (3.2 / G);
          v += Math.sin(seed * 17.7 + gy * 27.3 + gx * 8.1) * (3.2 / G);

          /* Sampled in BODY space — the storm's own bearing and radius plus
           * the stroke's offset within it — so the pattern is welded to the
           * planet and does not swim when the view pans or zooms. The scale
           * gives the field structure at the size of a storm rather than of a
           * planet. */
          var f = n.fbm((el.radius + v * el.size) * 34,
                        (el.angle + u * el.size) * 34, 3);

          /* Spread across the CURVED outline's extent, not the raw radius —
           * otherwise the strokes stop short of the widened perimeter and the
           * storm gets a smooth untextured margin. */
          var px = c.x + u * base * CURVE_GAIN;
          var py = c.y + v * base * squash * CURVE_GAIN;
          /* Mostly along the flow — a storm is being sheared by the jets it
           * sits between — with the noise turning each stroke off that axis. */
          /* Mostly along the flow — a storm is sheared by the jets it sits
           * between — with the noise turning each stroke well off that axis.
           * A narrow angular spread is what made the first version read as
           * hatching rather than as churn. */
          var ang = el.angle + Math.PI / 2 + (f - 0.5) * 4.4;
          var len = base * (0.22 + f * 0.46);
          ctx.lineWidth = Math.max(0.4, base * (0.05 + f * 0.09));
          ctx.beginPath();
          ctx.moveTo(px - Math.cos(ang) * len * 0.5,
                     py - Math.sin(ang) * len * 0.5);
          ctx.lineTo(px + Math.cos(ang) * len * 0.5,
                     py + Math.sin(ang) * len * 0.5);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  /* One noise field for every storm on every body, built once.
   *
   * It does not need to be per body: the field is sampled at the storm's own
   * position in body space, so two worlds' storms already land on different
   * parts of it. Building one costs a 256-entry table instead of one per
   * element. */
  var STORM_NOISE = null;
  function stormNoise() {
    if (!STORM_NOISE) STORM_NOISE = CC.RNG.makeNoise2D(0x51057);
    return STORM_NOISE;
  }

  CC.Primitives.register({
    "storm": storm
  });
})();
