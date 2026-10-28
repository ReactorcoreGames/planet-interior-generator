/* Data pulses — drawing the `pulse` element (gen/pulses.js).
 *
 *   tails    each pulse's four stretches, tail to head, stroked a little
 *            wider than the trace under it at rising alpha, so the light
 *            fades back along the track it came down
 *   heads    a soft spill and a pale core at the front of each pulse
 *   trains   the packets: small pale squares with a faint spill
 *
 * Lit in the body's three lights (draw/shellwalls.js lightHsv), as every
 * light on a built body is. The caller has already clipped to the layer's
 * band. Pixels enter only through `view`.
 *
 * draw/primitives.js and draw/shellwalls.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;
  /* Segments per radian along an arc. */
  var STEP = 90 / TAU;
  /* Alpha of the four stretches, tail to head. */
  var RAMP = [0.10, 0.22, 0.42, 0.72];

  /* A point list as the board draws its traces: along a track an arc, a
   * jog straight. */
  function path(ctx, view, pts) {
    var s = view.at(pts[0][0], pts[0][1]);
    ctx.moveTo(s.x, s.y);
    for (var k = 1; k < pts.length; k++) {
      var p0 = pts[k - 1], p1 = pts[k];
      var n = p0[0] === p1[0] ? Math.max(1, Math.ceil(Math.abs(p1[1] - p0[1]) * STEP)) : 1;
      for (var i = 1; i <= n; i++) {
        var q = view.at(p0[0] + (p1[0] - p0[0]) * (i / n), p0[1] + (p1[1] - p0[1]) * (i / n));
        ctx.lineTo(q.x, q.y);
      }
    }
  }

  function dotsAt(ctx, view, list, k, rad, square) {
    ctx.beginPath();
    for (var i = 0; i < list.length; i++) {
      var d = list[i];
      if (d[2] !== k) continue;
      var c = view.at(d[0], d[1]);
      if (square) ctx.rect(c.x - rad, c.y - rad, rad * 2, rad * 2);
      else { ctx.moveTo(c.x + rad, c.y); ctx.arc(c.x, c.y, rad, 0, TAU); }
    }
    ctx.fill();
  }

  function pulse(ctx, view, el, style) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    /* The style already carries the element's alpha (draw/details.js). */
    var a = 1, k, q, i;
    var heads = el.pulses.map(function (p) { return [p.head[0], p.head[1], p.k, p.w]; });
    for (k = 0; k < 3; k++) {
      for (var w = 0; w < 2; w++) {
        ctx.lineWidth = view.lw(w ? 1.5 : 1.0);
        for (q = 0; q < 4; q++) {
          ctx.strokeStyle = style.halo(k, RAMP[q] * a);
          ctx.beginPath();
          for (i = 0; i < el.pulses.length; i++) {
            var P = el.pulses[i];
            if (P.k === k && P.w === w) path(ctx, view, P.parts[q]);
          }
          ctx.stroke();
        }
      }
      /* The front of each pulse: a soft spill, then a pale core. */
      var big = heads.filter(function (h) { return h[3]; });
      ctx.fillStyle = style.halo(k, 0.16 * a);
      dotsAt(ctx, view, heads, k, Math.max(1.4, view.px(0.0040)), false);
      ctx.fillStyle = style.halo(k, 0.12 * a);
      dotsAt(ctx, view, big, k, Math.max(2.0, view.px(0.0065)), false);
      ctx.fillStyle = style.core(k, 0.95 * a);
      dotsAt(ctx, view, heads, k, Math.max(0.7, view.px(0.0014)), false);
      /* The trains' packets. */
      ctx.fillStyle = style.halo(k, 0.14 * a);
      dotsAt(ctx, view, el.dots, k, Math.max(1.1, view.px(0.0030)), false);
      ctx.fillStyle = style.core(k, 0.85 * a);
      dotsAt(ctx, view, el.dots, k, Math.max(0.6, view.px(0.0011)), true);
    }
    ctx.restore();
  }

  /* The three lights as functions of alpha: a saturated spill and a paler
   * core, as the void lights are drawn. */
  function pulseStyle(colour, el, alpha) {
    var hsv = CC.ShellWallDraw.lightHsv({ accent: colour.accent }, colour);
    return {
      halo: function (k, x) { var h = hsv[k]; return CC.Color.hsva(h[0], h[1], h[2], x * alpha); },
      core: function (k, x) { var h = hsv[k]; return CC.Color.hsva(h[0], h[1] * 0.45, 1, x * alpha); }
    };
  }

  CC.Primitives.register({ "pulse": pulse });
  CC.Primitives.registerStyle("pulse", pulseStyle);
})();
