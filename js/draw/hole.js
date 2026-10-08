/* A hole in the picture — what surrounds a black hole, drawn from the numbers
 * js/gen/compact.js `hole` resolves.
 *
 *   umbra       the sky darkens toward it. Light from behind is bent away or
 *               swallowed, so the space round a hole is darker than space —
 *               which is what lets the horizon read as a VOID rather than as
 *               a black disc laid on the stars.
 *   ergosphere  the region where space itself is dragged round, oblate:
 *               wide at the equator, touching the horizon at the poles. Dark,
 *               with dragged-flow strokes and the into/out-of-page marks.
 *   disc        THE DISC, SLICED. The cutaway's plane contains the spin
 *               axis, so the disc is cut through: two flaring wedges either
 *               side of the hole, white-hot at the inner edge and cooling
 *               outward, with flow lines along it, hot spots and turbulence,
 *               the orbital motion marked going into the page on one side and
 *               out of it on the other, and streams plunging from the inner
 *               edge into the horizon, reddening to nothing as they go.
 *
 * WHY NOT LAYERS. Every band in the generator is a ring round the centre;
 * none of these three is. The ergosphere is oblate, the disc is two wedges,
 * and the umbra is light, not matter. They are declared by the archetype
 * (`hole`) and resolved once, exactly as `poles` and `beams` are, so nothing
 * here names an archetype or a role — the disc's colour is read from
 * whichever layer the declaration names.
 *
 * Called from the emissive pass, BEFORE the layers: the horizon is a layer
 * and paints over the inner ends of everything here, which is precisely how
 * the plunging streams vanish into it.
 *
 * Load order: after draw/primitives/compact.js (it uses CC.CompactDraw). */

var CC = CC || {};

CC.Hole = (function () {
  "use strict";

  var TAU = Math.PI * 2;
  var clamp = CC.Math.clamp, lerp = CC.Math.lerp;

  /* The disc's colour at fraction t of the way out: WHITE-HOT AT THE INNER
   * EDGE, cooler and more saturated outward — the spec's signature gradient.
   * The hue is the body's own, leaned slightly warmer at the hot end. */
  function discColour(base, t, a) {
    var s = lerp(0.12, 0.78, Math.pow(t, 0.8));
    var v = lerp(1.0, 0.52, t);
    var h = base.h + (1 - t) * 10;
    return CC.Color.hsva(h, s, v, clamp(a, 0, 1));
  }

  function draw(ctx, view, body, palette, settings) {
    var H = body.hole;
    if (!H) return;
    var D = CC.CompactDraw;
    var R = view.px(1);
    var base = palette.get(H.ergoColour) || palette.get(body.layers[0].role) ||
               { h: 30, s: 0.5, v: 0.8 };
    var rng = CC.RNG.stream(settings.seed, "hole/draw/" + body.archetype);

    ctx.save();

    /* ---- the umbra ---- */
    var U = H.umbra;
    if (U) {
      var reach = U.reach || 3;
      var g = ctx.createRadialGradient(view.cx, view.cy, R * 0.98,
                                       view.cx, view.cy, R * reach);
      var st = U.strength === undefined ? 0.9 : U.strength;
      for (var i = 0; i <= 8; i++) {
        var t = i / 8;
        g.addColorStop(t, "rgba(0,0,0," + (st * Math.pow(1 - t, 1.6)).toFixed(3) + ")");
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(view.cx, view.cy, R * reach, 0, TAU);
      ctx.fill();
    }

    /* ---- the ergosphere ---- */
    if (H.ergoEquator > 1.03) {
      ctx.save();
      ctx.beginPath();
      for (var k = 0; k <= 160; k++) {
        var th = k / 160 * TAU;
        var p = D.xy(view, Math.sin(th) * H.ergo(th), Math.cos(th) * H.ergo(th));
        if (k) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y);
      }
      ctx.closePath();
      /* Dark, and in the body's own hue: the complement read as olive. */
      ctx.fillStyle = CC.Color.hsva(base.h, 0.30, 0.13, 0.90);
      ctx.fill();
      ctx.setLineDash([view.lw(3), view.lw(4)]);
      ctx.lineWidth = view.lw(1);
      ctx.strokeStyle = CC.Color.hsva(base.h, 0.25, 0.85, 0.42);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.clip();

      /* SPACE BEING DRAGGED: short strokes sweeping round, densest at the
       * equator where the region is widest. */
      var span = H.ergoEquator - 1;
      var nDrag = Math.round(40 + 80 * clamp(span / 0.9, 0, 1));
      ctx.lineWidth = view.lw(0.8);
      for (k = 0; k < nDrag; k++) {
        var a = rng() * TAU;
        var rr = 1 + rng() * (H.ergo(a) - 1);
        var len = 0.22 + rng() * 0.36;
        ctx.strokeStyle = CC.Color.hsva(base.h, 0.25, 0.92, 0.10 + 0.16 * rng());
        ctx.beginPath();
        /* Canvas arc angles run from +x; a bearing runs from +y. */
        ctx.arc(view.cx, view.cy, R * rr, a - Math.PI / 2 - len / 2, a - Math.PI / 2 + len / 2);
        ctx.stroke();
      }
      flowMarks(ctx, view, (1 + H.ergoEquator) / 2, 0.075 * Math.min(1, span / 0.5), 1,
                CC.Color.hsva(base.h, 0.20, 0.92, 0.6));
      ctx.restore();
    }

    /* ---- the disc, sliced ---- */
    var Dk = H.disc;
    if (Dk) drawDisc(ctx, view, Dk, palette.get(Dk.colour) || base, rng);

    ctx.restore();
  }

  /* ⊙ on the left, ⊗ on the right, at `n` points along the midplane from
   * radius r: orbital motion, which in a cut through the axis is motion INTO
   * and OUT OF the page. The engineering-drawing convention, and the one mark
   * that states which way the disc turns without a third dimension. */
  function flowMarks(ctx, view, r, size, n, colour, step) {
    var D = CC.CompactDraw;
    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;
    ctx.lineWidth = view.lw(1.1);
    for (var side = -1; side <= 1; side += 2) {
      for (var i = 0; i < n; i++) {
        var x = side * (r + i * (step || 0));
        var c = D.xy(view, x, 0);
        var rr = Math.max(2, view.px(size));
        ctx.beginPath();
        ctx.arc(c.x, c.y, rr, 0, TAU);
        ctx.stroke();
        if (side < 0) {
          ctx.beginPath();
          ctx.arc(c.x, c.y, rr * 0.28, 0, TAU);
          ctx.fill();
        } else {
          var q = rr * 0.62;
          ctx.beginPath();
          ctx.moveTo(c.x - q, c.y - q); ctx.lineTo(c.x + q, c.y + q);
          ctx.moveTo(c.x + q, c.y - q); ctx.lineTo(c.x - q, c.y + q);
          ctx.stroke();
        }
      }
    }
  }

  function drawDisc(ctx, view, Dk, base, rng) {
    var D = CC.CompactDraw;
    var rIn = Dk.rIn, rOut = Dk.rOut;
    var bright = 0.45 + 0.55 * Dk.feed;
    /* Half-thickness at radius x, in body radii: a root, a flare, and a hot
     * torus near the inner edge that a feeding disc puffs up into. */
    var h = function (x) {
      var u = x - rIn;
      return Dk.root + u * Dk.flare + Dk.puff * Math.exp(-u * u / 1.1);
    };
    var S = 48;
    for (var side = -1; side <= 1; side += 2) {
      ctx.save();
      ctx.beginPath();
      for (var k = 0; k <= S; k++) {
        var x = rIn + (rOut - rIn) * k / S;
        var p = D.xy(view, side * x, h(x));
        if (k) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y);
      }
      for (k = S; k >= 0; k--) {
        x = rIn + (rOut - rIn) * k / S;
        p = D.xy(view, side * x, -h(x));
        ctx.lineTo(p.x, p.y);
      }
      /* A ROUNDED INNER EDGE: the hot torus is a body of gas, and cut
       * square it read as the end of a plank. */
      var h0 = h(rIn);
      for (k = 1; k < 12; k++) {
        var ph = -Math.PI / 2 + Math.PI * k / 12;
        p = D.xy(view, side * (rIn - h0 * 0.55 * Math.cos(ph)), h0 * Math.sin(ph));
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();

      /* The fill grades along the disc and ENDS AT NOTHING at its outer
       * reach (D156) — the disc thins into space rather than stopping. */
      var p0 = D.xy(view, side * rIn, 0), p1 = D.xy(view, side * rOut, 0);
      var lg = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
      for (k = 0; k <= 10; k++) {
        var t = k / 10;
        lg.addColorStop(t, discColour(base, Math.pow(t, 0.55),
          bright * (0.95 - 0.95 * Math.pow(t, 1.5))));
      }
      ctx.fillStyle = lg;
      ctx.fill();
      ctx.clip();

      /* FLOW LINES — orbital streaks following the flare, so they read as
       * the disc's own structure. Dense, because the disc is the main
       * visual and deserves the budget (the spec). Two tones: bright hot
       * material and dark cooler filaments between it. */
      ctx.lineCap = "round";
      for (var i = 0; i < Dk.streaks; i++) {
        var u0 = Math.pow(rng(), 1.25);
        var x0 = rIn + (rOut - rIn) * u0;
        var f = (rng() * 2 - 1) * 0.95;
        var len = 0.25 + rng() * 1.5;
        var tt = (x0 - rIn) / (rOut - rIn);
        var dark = rng() < 0.32;
        ctx.strokeStyle = dark
          ? CC.Color.hsva(base.h - 8, 0.85, 0.28, 0.22 * (1 - tt))
          : discColour(base, Math.max(0, tt - 0.1), (0.22 + 0.42 * rng()) * (1 - tt) * bright);
        ctx.lineWidth = view.lw(0.6 + rng() * 1.5);
        ctx.beginPath();
        for (var q = 0; q <= 6; q++) {
          var xx = x0 + len * q / 6;
          var pp = D.xy(view, side * xx, f * h(xx));
          if (q) ctx.lineTo(pp.x, pp.y); else ctx.moveTo(pp.x, pp.y);
        }
        ctx.stroke();
      }

      /* TURBULENCE — small dark eddies in the flow. */
      for (i = 0; i < Dk.turbulence; i++) {
        x = rIn + (rOut - rIn) * Math.pow(rng(), 1.4);
        var yy = (rng() * 2 - 1) * h(x) * 0.8;
        var c = D.xy(view, side * x, yy);
        var rw = Math.max(1.2, view.px(0.03 + rng() * 0.06));
        ctx.strokeStyle = CC.Color.hsva(base.h - 10, 0.8, 0.22,
                                        0.20 * (1 - (x - rIn) / (rOut - rIn)));
        ctx.lineWidth = view.lw(0.8);
        ctx.beginPath();
        ctx.arc(c.x, c.y, rw, rng() * TAU, rng() * TAU + 3.6);
        ctx.stroke();
      }

      /* HOT SPOTS — bright knots, crowding toward the inner edge. */
      for (i = 0; i < Dk.spots; i++) {
        x = rIn + (rOut - rIn) * Math.pow(rng(), 2.2);
        yy = (rng() * 2 - 1) * h(x) * 0.6;
        c = D.xy(view, side * x, yy);
        var rs = Math.max(1.5, view.px(0.04 + rng() * 0.09));
        var hg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, rs);
        hg.addColorStop(0, CC.Color.hsva(base.h + 15, 0.10, 1, 0.85 * bright));
        hg.addColorStop(1, CC.Color.hsva(base.h, 0.40, 1, 0));
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(c.x, c.y, rs, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    /* The orbital motion, marked along the midplane in dark ink. */
    flowMarks(ctx, view, rIn + 0.55, Math.min(0.11, h(rIn + 0.55) * 0.5), Dk.marks,
              "rgba(12,9,8,0.72)", 0.95);

    /* PLUNGING STREAMS — past the innermost stable orbit nothing circles;
     * it falls. Thin streams from the disc's inner edge into the horizon,
     * reddening and fading as they go, ENDING AT NOTHING at the edge
     * (D156). The horizon layer is painted over their last stretch. */
    for (var side2 = -1; side2 <= 1; side2 += 2) {
      for (i = 0; i < Dk.plunge; i++) {
        var y0 = (rng() * 2 - 1) * h(rIn) * 0.8;
        var bend = (rng() * 2 - 1) * 0.9;
        var ang0 = Math.atan2(y0, rIn);
        var N = 18, prev = null;
        for (k = 0; k <= N; k++) {
          var tk = k / N;
          var rr2 = rIn + (0.98 - rIn) * tk;
          var an = ang0 + bend * tk * tk;
          var pt = D.xy(view, side2 * rr2 * Math.cos(an), rr2 * Math.sin(an));
          if (prev) {
            ctx.strokeStyle = CC.Color.hsva(base.h - 22 * tk, 0.55 + 0.35 * tk,
                                            1 - 0.80 * tk, 0.72 * (1 - tk) * bright);
            ctx.lineWidth = view.lw(1.5 * (1 - tk * 0.7));
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(pt.x, pt.y);
            ctx.stroke();
          }
          prev = pt;
        }
      }
    }
  }

  return { draw: draw };
})();
