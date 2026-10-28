/* Containment — drawing the reactor's `rings` and `stipple`
 * (gen/containment.js).
 *
 *   rings    a cased band: a dark casing, a lit lip on the edge facing the
 *            heart, clamps across it at an even pitch, small lights
 *            between them; or a coil: two dark rims and the windings
 *            between them, every third clamp kept
 *   stipple  pale sparks with a faint spill on the larger ones, and deep
 *            flecks in the core's own hue, so the field shows on the bright
 *            heart and on the dimmer plate alike
 *
 * Shading is monochrome on the rings, as on every band fixture, so they sit
 * in the core's colour; their lights are the body's (draw/shellwalls.js
 * lightHsv). The caller has already clipped to the layer. Pixels enter only
 * through `view`.
 *
 * draw/primitives.js and draw/shellwalls.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;
  var STEP = 90 / TAU;

  function mono(lit, a) { return lit ? "rgba(255,255,255," + a + ")" : "rgba(0,0,0," + a + ")"; }

  function circle(ctx, view, r) {
    var n = Math.max(24, Math.ceil(TAU * STEP));
    for (var i = 0; i <= n; i++) {
      var p = view.at(r, TAU * i / n);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
  }

  function strokeRing(ctx, view, r, w, style) {
    ctx.strokeStyle = style;
    ctx.lineWidth = Math.max(0.5, w);
    ctx.beginPath();
    circle(ctx, view, r);
    ctx.stroke();
  }

  /* A radial bar across the ring, as a quad: angle a, half-width hw (body
   * radius), from r0 to r1. */
  function bar(ctx, view, a, hw, r0, r1) {
    var d0 = hw / Math.max(0.005, r0), d1 = hw / Math.max(0.005, r1);
    var p = [view.at(r0, a - d0), view.at(r1, a - d1), view.at(r1, a + d1), view.at(r0, a + d0)];
    ctx.moveTo(p[0].x, p[0].y);
    for (var i = 1; i < 4; i++) ctx.lineTo(p[i].x, p[i].y);
    ctx.closePath();
  }

  function ring(ctx, view, R, style) {
    var w = R.w, px = view.px(1);
    var step = TAU / R.clamps, ph = R.phase * step, k;
    if (R.design === 1) {
      /* THE COIL: a dark backing, the windings at a fine even pitch, two
       * rims. */
      strokeRing(ctx, view, R.r, px * w * 2, mono(false, 0.30));
      var turns = Math.round(TAU * R.r / 0.0016);
      for (var pass = 0; pass < 2; pass++) {
        ctx.fillStyle = pass ? mono(true, 0.30) : mono(false, 0.40);
        ctx.beginPath();
        for (k = 0; k < turns; k++) {
          var a = (k + (pass ? 0.3 : 0)) * TAU / turns;
          bar(ctx, view, a, 0.00028, R.r - w * 0.85, R.r + w * 0.85);
        }
        ctx.fill();
      }
      strokeRing(ctx, view, R.r - w, px * w * 0.35, mono(false, 0.65));
      strokeRing(ctx, view, R.r + w, px * w * 0.35, mono(false, 0.65));
    } else {
      /* THE CASED BAND: casing, a lit lip toward the heart, a dark outer
       * edge. */
      strokeRing(ctx, view, R.r, px * w * 2, mono(false, 0.50));
      strokeRing(ctx, view, R.r - w * 0.55, px * w * 0.40, mono(true, 0.45));
      strokeRing(ctx, view, R.r + w * 0.85, px * w * 0.30, mono(false, 0.55));
    }
    /* Clamps across the band at an even pitch, a coil keeping every third. */
    var every = R.design === 1 ? 3 : 1;
    ctx.fillStyle = mono(false, 0.70);
    ctx.beginPath();
    for (k = 0; k < R.clamps; k += every) bar(ctx, view, ph + k * step, w * 0.5, R.r - w * 1.3, R.r + w * 1.3);
    ctx.fill();
    ctx.fillStyle = mono(true, 0.35);
    ctx.beginPath();
    for (k = 0; k < R.clamps; k += every) bar(ctx, view, ph + k * step - w * 0.25 / R.r, w * 0.15, R.r - w * 1.25, R.r + w * 1.25);
    ctx.fill();
    /* A small light between clamps, every other gap on the frame and
     * every fourth round the heart, white or the warning colour by ring:
     * points, not lamps (the first pass's lit every clamp and shouted). */
    var rad = px * w * 0.32;
    if (rad < 0.5 || R.lit < 0) return;
    every = R.frame ? 2 : 4;
    ph += step / 2;
    ctx.fillStyle = style.spill[R.lit];
    ctx.beginPath();
    for (k = 0; k < R.clamps; k += every) {
      var c = view.at(R.r, ph + k * step);
      ctx.moveTo(c.x + rad * 2, c.y); ctx.arc(c.x, c.y, rad * 2, 0, TAU);
    }
    ctx.fill();
    ctx.fillStyle = style.core[R.lit];
    ctx.beginPath();
    for (k = 0; k < R.clamps; k += every) {
      var q = view.at(R.r, ph + k * step);
      ctx.moveTo(q.x + rad, q.y); ctx.arc(q.x, q.y, rad, 0, TAU);
    }
    ctx.fill();
  }

  function rings(ctx, view, el, style) {
    ctx.save();
    ctx.lineCap = "butt";
    for (var i = 0; i < el.rings.length; i++) ring(ctx, view, el.rings[i], style);
    ctx.restore();
  }

  function stipple(ctx, view, el, style) {
    ctx.save();
    for (var k = 0; k < 2; k++) {
      for (var t = 0; t < el.size.length; t++) {
        var rad = Math.max(0.45, view.px(el.size[t]) / 2);
        var spill = k === 0 && t <= 1;
        for (var pass = spill ? 0 : 1; pass < 2; pass++) {
          ctx.fillStyle = pass ? style.dot[k] : style.glow;
          var rr = pass ? rad : rad * 2.6;
          ctx.beginPath();
          for (var i = 0; i < el.dots.length; i++) {
            var d = el.dots[i];
            if (d[2] !== t || d[3] !== k) continue;
            var c = view.at(d[0], d[1]);
            ctx.moveTo(c.x + rr, c.y);
            ctx.arc(c.x, c.y, rr, 0, TAU);
          }
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  function lights(colour, alpha) {
    var hsv = CC.ShellWallDraw.lightHsv({ accent: colour.accent }, colour);
    return {
      spill: hsv.map(function (h) { return CC.Color.hsva(h[0], h[1], h[2], 0.22 * alpha); }),
      core: hsv.map(function (h) { return CC.Color.hsva(h[0], h[1] * 0.45, 1, 0.95 * alpha); })
    };
  }

  /* A pale spark and a deep fleck, both in the core's own hue. */
  function stippleStyle(colour, el, alpha) {
    return {
      dot: [CC.Color.hsva(colour.h, colour.s * 0.25, 1, 0.80 * alpha),
            CC.Color.hsva(colour.h, Math.min(1, colour.s + 0.15), colour.v * 0.50, 0.50 * alpha)],
      glow: CC.Color.hsva(colour.h, colour.s * 0.20, 1, 0.14 * alpha)
    };
  }

  CC.Primitives.register({ "rings": rings, "stipple": stipple });
  CC.Primitives.registerStyle("rings", function (colour, el, alpha) { return lights(colour, alpha); });
  CC.Primitives.registerStyle("stipple", stippleStyle);
})();
