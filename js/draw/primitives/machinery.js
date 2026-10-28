/* Machinery fixtures — drawing the `fixture` designs that stand in the
 * machinery band among the pipework (gen/fixtures.js):
 *
 *   truss    a shadow behind the frame, the bracing, then the chords and
 *            posts as dark members with a lit lip, nodes at the joints
 *   gear     each wheel of the train: a toothed plate, a dark web cut by
 *            spokes or lightening holes, a hub and its axle; neighbours'
 *            teeth set half a tooth apart, so they mesh
 *   rotor    a casing ring, angled blades between it and the hub, a bolted
 *            hub
 *
 * Laid out in the fixture's own frame (draw/primitives/fixtures.js), centred
 * on the unit: x across the band, y out, in body radius. Shading is
 * monochrome, as every band fixture's is, so the machinery keeps the plant's
 * own colour and the chips and lights stay the only colour in it.
 *
 * draw/primitives/fixtures.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;
  var F = CC.FixtureDraw;
  var mono = F.mono, seg = F.seg;

  /* A closed path through local points. */
  function path(ctx, P, pts) {
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var q = P(pts[i][0], pts[i][1]);
      if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
    }
    ctx.closePath();
  }

  function circle(cx, cy, r, n) {
    var pts = [];
    for (var i = 0; i < n; i++) pts.push([cx + Math.cos(i * TAU / n) * r, cy + Math.sin(i * TAU / n) * r]);
    return pts;
  }

  function truss(ctx, view, el, style) {
    var d = el.design, P = F.frame(view, el), a = style.a;
    var b = d.bay, W = el.width, H = el.height;
    var x0 = -W / 2, y0 = -H / 2, i, j;
    var px = view.px(b);
    var px1 = 0.9 / view.px(1);

    ctx.fillStyle = mono(false, 0.14 * a);
    ctx.beginPath();
    F.box(ctx, P, x0, y0, x0 + W, y0 + H);
    ctx.fill();

    /* The bracing, thinner than the members. */
    ctx.strokeStyle = mono(false, 0.42 * a);
    ctx.lineWidth = Math.max(0.4, px * 0.07);
    ctx.beginPath();
    for (i = 0; i < el.cols; i++) {
      for (j = 0; j < el.rows; j++) {
        var bx = x0 + i * b, by = y0 + j * b;
        if (d.brace === "x" || (d.brace === "zig" && (i + j) % 2 === 0)) seg(ctx, P, bx, by, bx + b, by + b);
        if (d.brace === "x" || (d.brace === "zig" && (i + j) % 2 === 1)) seg(ctx, P, bx + b, by, bx, by + b);
        if (d.brace === "k") {
          seg(ctx, P, bx, by + b / 2, bx + b, by);
          seg(ctx, P, bx, by + b / 2, bx + b, by + b);
        }
      }
    }
    ctx.stroke();

    /* Chords and posts: dark, then the lit lip a pixel beside. */
    for (var pass = 0; pass < 2; pass++) {
      var lip = pass === 1, dx = lip ? px1 : 0;
      ctx.strokeStyle = lip ? mono(true, 0.30 * a) : mono(false, 0.62 * a);
      ctx.lineWidth = Math.max(lip ? 0.4 : 0.6, px * (lip ? 0.06 : 0.13));
      ctx.beginPath();
      for (j = 0; j <= el.rows; j++) seg(ctx, P, x0, y0 + j * b + dx, x0 + W, y0 + j * b + dx);
      for (i = 0; i <= el.cols; i++) seg(ctx, P, x0 + i * b + dx, y0, x0 + i * b + dx, y0 + H);
      ctx.stroke();
    }

    if (px > 5) {
      var n = Math.max(1, px * 0.2);
      ctx.fillStyle = mono(false, 0.65 * a);
      ctx.beginPath();
      for (i = 0; i <= el.cols; i++) {
        for (j = 0; j <= el.rows; j++) {
          var q = P(x0 + i * b, y0 + j * b);
          ctx.rect(q.x - n / 2, q.y - n / 2, n, n);
        }
      }
      ctx.fill();
    }
  }

  /* One wheel: teeth as trapezoids round a rim, `spin` a share of one
   * tooth's pitch so a neighbour's teeth fall in this one's gaps. */
  function wheel(ctx, view, P, w, teeth, d, a) {
    var R = w.R, depth = CC.Fixtures.TOOTH_PITCH * 0.55, pts = [];
    var step = TAU / teeth, off = w.spin * step;
    for (var k = 0; k < teeth; k++) {
      var t = off + k * step;
      var rr = [R - depth, R, R, R - depth];
      var tt = [t, t + step * 0.18, t + step * 0.48, t + step * 0.66];
      for (var m = 0; m < 4; m++) pts.push([w.x + Math.cos(tt[m]) * rr[m], w.y + Math.sin(tt[m]) * rr[m]]);
    }
    var lw = view.lw(0.7);

    /* The plate, a shade lit, outlined dark. */
    path(ctx, P, pts);
    ctx.fillStyle = mono(true, 0.24 * a);
    ctx.fill();
    ctx.strokeStyle = mono(false, 0.58 * a);
    ctx.lineWidth = lw;
    ctx.stroke();

    var rim = R - depth * 1.9, hub = R * d.hub;
    if (view.px(R) > 6) {
      if (d.spokes) {
        /* The web cut away between the spokes. */
        path(ctx, P, circle(w.x, w.y, rim, 28));
        ctx.fillStyle = mono(false, 0.30 * a);
        ctx.fill();
        ctx.strokeStyle = mono(true, 0.30 * a);
        ctx.lineWidth = Math.max(0.6, view.px(R) * 0.11);
        ctx.beginPath();
        for (k = 0; k < d.spokes; k++) {
          var s = off + k * TAU / d.spokes;
          seg(ctx, P, w.x + Math.cos(s) * hub, w.y + Math.sin(s) * hub,
                      w.x + Math.cos(s) * rim, w.y + Math.sin(s) * rim);
        }
        ctx.stroke();
      } else {
        ctx.strokeStyle = mono(false, 0.40 * a);
        ctx.lineWidth = lw;
        path(ctx, P, circle(w.x, w.y, rim, 28));
        ctx.stroke();
        ctx.fillStyle = mono(false, 0.42 * a);
        ctx.beginPath();
        for (k = 0; k < d.holes; k++) {
          var h = off + k * TAU / d.holes, hr = (rim - hub) * 0.32;
          var hp = circle(w.x + Math.cos(h) * (hub + rim) / 2, w.y + Math.sin(h) * (hub + rim) / 2, hr, 10);
          for (var p = 0; p < hp.length; p++) {
            var q = P(hp[p][0], hp[p][1]);
            if (p === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
          }
          ctx.closePath();
        }
        ctx.fill();
      }
    }
    /* The hub and its axle. */
    path(ctx, P, circle(w.x, w.y, hub, 16));
    ctx.fillStyle = mono(true, 0.30 * a);
    ctx.fill();
    ctx.strokeStyle = mono(false, 0.55 * a);
    ctx.lineWidth = lw;
    ctx.stroke();
    path(ctx, P, circle(w.x, w.y, hub * 0.38, 10));
    ctx.fillStyle = mono(false, 0.65 * a);
    ctx.fill();
  }

  function gear(ctx, view, el, style) {
    var P = F.frame(view, el);
    for (var i = 0; i < el.wheels.length; i++) {
      wheel(ctx, view, P, el.wheels[i], el.teeth[i], el.design, style.a);
    }
  }

  function rotor(ctx, view, el, style) {
    var d = el.design, P = F.frame(view, el), a = style.a;
    var R = el.size, hub = R * d.hub, k;
    var lw = view.lw(0.7);

    /* The bore behind the blades, dark. */
    path(ctx, P, circle(0, 0, R, 40));
    ctx.fillStyle = mono(false, 0.34 * a);
    ctx.fill();

    /* Blades: each set at the design's lean between hub and casing, a dark
     * edge and a lit face. */
    for (var pass = 0; pass < 2; pass++) {
      var lit = pass === 1;
      ctx.strokeStyle = lit ? mono(true, 0.30 * a) : mono(false, 0.50 * a);
      ctx.lineWidth = Math.max(0.5, view.px(R) * (lit ? 0.035 : 0.07));
      ctx.beginPath();
      for (k = 0; k < d.blades; k++) {
        var t = k * TAU / d.blades + (lit ? 0.04 : 0);
        seg(ctx, P, Math.cos(t) * hub, Math.sin(t) * hub,
                    Math.cos(t + d.lean) * R * 0.90, Math.sin(t + d.lean) * R * 0.90);
      }
      ctx.stroke();
    }

    if (d.casing) {
      path(ctx, P, circle(0, 0, R, 40));
      ctx.strokeStyle = mono(false, 0.62 * a);
      ctx.lineWidth = Math.max(0.8, view.px(R) * 0.08);
      ctx.stroke();
      path(ctx, P, circle(0, 0, R * 0.93, 40));
      ctx.strokeStyle = mono(true, 0.24 * a);
      ctx.lineWidth = lw;
      ctx.stroke();
    }

    path(ctx, P, circle(0, 0, hub, 18));
    ctx.fillStyle = mono(true, 0.20 * a);
    ctx.fill();
    ctx.strokeStyle = mono(false, 0.58 * a);
    ctx.lineWidth = lw;
    ctx.stroke();
    if (view.px(hub) > 4) {
      ctx.fillStyle = mono(false, 0.60 * a);
      ctx.beginPath();
      for (k = 0; k < 6; k++) {
        var q = P(Math.cos(k * TAU / 6) * hub * 0.6, Math.sin(k * TAU / 6) * hub * 0.6);
        var s = Math.max(0.8, view.px(hub) * 0.14);
        ctx.rect(q.x - s / 2, q.y - s / 2, s, s);
      }
      ctx.fill();
    }
  }

  F.register("truss", truss);
  F.register("gear", gear);
  F.register("rotor", rotor);
})();
