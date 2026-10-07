/* Concentric gradients on a body that is not round.
 *
 * A canvas radial gradient is a pair of CIRCLES and cannot bend. On a body
 * with a form (js/gen/form.js) every boundary is warped through `view.at`, so
 * a band's depth gradient drawn as circles would land on the wrong radii
 * wherever the body is narrow — the shell would be its inner colour all the
 * way across on the short sides and its outer colour on the long ones.
 *
 * So a band's gradient is RECORDED rather than created when the view has a
 * form, and filled in thin angular slices, each with its own circular
 * gradient scaled to the form at that bearing. A slice is narrow enough that
 * the form is effectively constant across it.
 *
 * On an unwarped view this is a pass-through to `createRadialGradient`, and
 * nothing that existed before changes.
 *
 * draw/layers.js must load first. */

var CC = CC || {};

CC.FormFill = (function () {
  "use strict";

  var TAU = Math.PI * 2;

  /* Slices around the body. Fixed, so the fill is the same at every size. */
  var SLICES = 480;

  /* A radial gradient between two pixel radii about the body centre, or a
   * recording of one when the view is warped. Either way the caller adds its
   * stops with `addColorStop` and passes the result on as a fill style. */
  function bandGradient(ctx, view, r0, r1) {
    if (!view.form) {
      return ctx.createRadialGradient(view.cx, view.cy, r0, view.cx, view.cy, r1);
    }
    var rec = {
      warped: true,
      r0: r0,
      r1: r1,
      stops: [],
      addColorStop: function (t, c) { rec.stops.push([t, c]); }
    };
    return rec;
  }

  /* Fill the CURRENT PATH with a recorded gradient.
   *
   * The path is used as a clip, then each slice is a triangle from the centre
   * out past the body, filled with a circular gradient at that bearing's
   * scale. Slices overlap by half a slice so anti-aliasing cannot leave
   * hairline seams between them; the fill is opaque, so the overlap is
   * invisible. `edge` is the band's outer boundary multiplier, if any. */
  function fillWarped(ctx, view, rec, edge) {
    ctx.save();
    ctx.clip();
    var half = TAU / SLICES;
    for (var i = 0; i < SLICES; i++) {
      var a = (i + 0.5) / SLICES * TAU;
      /* The form AND the band's own wobble at this bearing, so the gradient
       * follows the edge it fills. Concentric to the nominal radius instead,
       * a faceted edge that bulged past it clamped to the palest stop and
       * read as pale fur standing off a dark ring. */
      var e = 1;
      if (edge) {
        /* Averaged over a few degrees: the gradient only needs the edge's
         * course, and following every facet exactly stepped between slices. */
        var d = TAU / 120;
        e = (edge(a - d) + edge(a - d / 2) + edge(a) + edge(a + d / 2) + edge(a + d)) / 5;
      }
      var k = view.formAt(0.5, a) * e;
      var g = ctx.createRadialGradient(view.cx, view.cy, rec.r0 * k,
                                       view.cx, view.cy, rec.r1 * k);
      for (var s = 0; s < rec.stops.length; s++) {
        g.addColorStop(rec.stops[s][0], rec.stops[s][1]);
      }
      var far = rec.r1 * 1.6 + 4;
      var a0 = a - half, a1 = a + half;
      ctx.beginPath();
      ctx.moveTo(view.cx, view.cy);
      ctx.lineTo(view.cx + Math.sin(a0) * far, view.cy - Math.cos(a0) * far);
      ctx.lineTo(view.cx + Math.sin(a1) * far, view.cy - Math.cos(a1) * far);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
    }
    ctx.restore();
  }

  return { bandGradient: bandGradient, fillWarped: fillWarped };
})();
