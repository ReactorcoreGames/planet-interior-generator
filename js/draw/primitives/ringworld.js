/* A ringworld in a nebula — drawing gen/ringworld.js's element.
 *
 * A RING SEEN AT A SLANT is an ellipse whose far half shows its inner face
 * and whose near half shows its outer one. Drawn back to front:
 *
 *   1. the sun's light on the gas round it, so the ring lights its own
 *      patch of cloud rather than sitting on it
 *   2. the far half's inner face: land in runs, seas across part of the
 *      width, cloud banks, night where the shadow squares fall, a rim wall
 *      along each edge
 *   3. the sun, a hot point at the middle
 *   4. the near half's outer face: hull metal, frames, a lit upper edge,
 *      a few lights
 *   5. veils of the nebula's own gas drifting across it
 *
 * Every count is body-space (segments round the ring, not pixels), so the
 * call count is the same at every zoom and resolution; only line widths and
 * light radii floor. Metal is hullFill's (draw/details.js).
 *
 * draw/primitives.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

  /* The surface's colours, [h, s, v]: lowland, upland, sea. */
  var WORLDS = {
    lush:   [[104, 0.46, 0.62], [74, 0.40, 0.52], [206, 0.58, 0.56]],
    arid:   [[34, 0.48, 0.62], [18, 0.44, 0.48], [188, 0.34, 0.44]],
    frozen: [[205, 0.08, 0.84], [215, 0.14, 0.64], [214, 0.42, 0.38]]
  };

  function ringworld(ctx, view, el, st) {
    var S = view.px(1), n = el.n;
    var cx = Math.sin(el.angle) * el.radius, cy = -Math.cos(el.angle) * el.radius;
    var R = el.size, th = el.rot || 0, k = el.tilt;
    var ux = Math.cos(th), uy = Math.sin(th), vx = -Math.sin(th), vy = Math.cos(th);
    /* Half the ribbon's width as seen: its axis foreshortened by the tilt. */
    var hw = R * el.width / 2 * Math.sqrt(1 - k * k);
    var A = st.alpha;

    /* Segment t (fractional), e across the width: -1 the upper edge, +1
     * the lower. Body space, then through the view. */
    function bx(t, e) {
      var a = el.phase + t * TAU / n;
      return [cx + R * Math.cos(a) * ux + R * k * Math.sin(a) * vx + e * hw * vx,
              cy + R * Math.cos(a) * uy + R * k * Math.sin(a) * vy + e * hw * vy];
    }
    function P(t, e) {
      var b = bx(t, e);
      return view.at(Math.sqrt(b[0] * b[0] + b[1] * b[1]), Math.atan2(b[0], -b[1]));
    }
    function quad(t0, t1, e0, e1) {
      var p = P(t0, e0), q = P(t1, e0), r = P(t1, e1), s = P(t0, e1);
      ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.lineTo(r.x, r.y); ctx.lineTo(s.x, s.y);
      ctx.closePath();
    }
    function hsva(c, dv, a) { return CC.Color.hsva(c[0], c[1], clamp(c[2] * dv, 0, 1), a); }
    /* Positive on the far half, where the inner face is turned to us. */
    function facing(t) { return -Math.sin(el.phase + t * TAU / n); }
    function dark(t) {
      var d = 0;
      for (var j = 0; j < el.night.length; j++) {
        var x = Math.abs(((t - el.night[j].c) % n + n * 1.5) % n - n / 2);
        d = Math.max(d, clamp(1.4 - x / el.night[j].w * 1.4, 0, 1));
      }
      return 1 - 0.6 * d;
    }
    var far = [], near = [];
    for (var i = 0; i < n; i++) (facing(i + 0.5) > 0 ? far : near).push(i);

    var centre = view.at(Math.sqrt(cx * cx + cy * cy), Math.atan2(cx, -cy));
    var Rp = view.px(R);
    ctx.save();
    ctx.lineJoin = "round";

    /* 1. The sun's light on the gas. */
    ctx.globalCompositeOperation = "screen";
    var g = ctx.createRadialGradient(centre.x, centre.y, 0, centre.x, centre.y, Rp * 1.5);
    g.addColorStop(0, "rgba(255,236,200," + (0.42 * A) + ")");
    g.addColorStop(0.3, "rgba(255,226,180," + (0.16 * A) + ")");
    g.addColorStop(1, "rgba(255,220,170,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(centre.x, centre.y, Rp * 1.5, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    /* 2. The far half's inner face. The far side sits behind more gas:
     * a touch dimmer than the near. */
    var W = WORLDS[el.world] || WORLDS.lush;
    var fa = A * 0.9;
    far.forEach(function (i) {
      var lit = dark(i + 0.5) * (0.7 + 0.3 * facing(i + 0.5));
      ctx.fillStyle = hsva(W[el.ground[i]], lit, fa);
      ctx.beginPath(); quad(i, i + 1.04, -1, 1); ctx.fill();
    });
    /* A lens along the strip, from segment `at` for `len`, centred `mid`
     * across the width and `half` of it either side at its widest: a sea, a
     * cloud bank. Sampled two to a segment, and only where it is on the
     * far half. */
    function lens(at, len, mid, half) {
      var top = [], bot = [];
      for (var j = 0; j <= len * 2; j++) {
        var t = at + Math.min(j / 2, len);
        if (facing(t) <= 0.02) continue;
        var sw = Math.pow(Math.sin(Math.min(j / 2, len) / len * Math.PI), 0.6);
        top.push(P(t, -1 + 2 * (mid - half * sw)));
        bot.push(P(t, -1 + 2 * (mid + half * sw)));
      }
      if (top.length < 2) return false;
      bot.reverse();
      top.concat(bot).forEach(function (p, m) {
        if (m === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      return true;
    }
    el.seas.forEach(function (s) {
      var m = s.at + s.len / 2;
      var lit = dark(m) * (0.7 + 0.3 * Math.max(0, facing(m)));
      ctx.fillStyle = hsva(W[2], lit, fa);
      ctx.beginPath();
      if (lens(s.at, s.len, s.mid, s.half)) ctx.fill();
    });
    el.clouds.forEach(function (c) {
      ctx.fillStyle = "rgba(240,244,250," + (0.5 * fa * dark(c.at + c.len / 2)) + ")";
      ctx.beginPath();
      if (lens(c.at, c.len, c.mid, 0.07)) ctx.fill();
    });
    /* The rim walls: a metal strip along each edge, lit on its inner face. */
    ctx.fillStyle = st.hull;
    ctx.beginPath();
    far.forEach(function (i) { quad(i, i + 1.04, -1, -0.84); quad(i, i + 1.04, 0.84, 1); });
    ctx.fill();
    ctx.strokeStyle = st.lit;
    ctx.lineWidth = Math.max(0.35, S * 0.0008);
    ctx.beginPath();
    far.forEach(function (i) {
      var p = P(i, -0.84), q = P(i + 1, -0.84);
      ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
      p = P(i, 0.84); q = P(i + 1, 0.84);
      ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
    });
    ctx.stroke();

    /* 3. The sun. */
    ctx.globalCompositeOperation = "lighter";
    var sr = Math.max(2, Rp * 0.28);
    g = ctx.createRadialGradient(centre.x, centre.y, 0, centre.x, centre.y, sr);
    g.addColorStop(0, "rgba(255,250,236," + A + ")");
    g.addColorStop(0.12, "rgba(255,240,206," + (0.7 * A) + ")");
    g.addColorStop(0.4, "rgba(255,226,170," + (0.12 * A) + ")");
    g.addColorStop(1, "rgba(255,220,160,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(centre.x, centre.y, sr, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    /* 4. The near half's outer face: dark metal, darker where it turns
     * away, framed, its upper edge catching the glow. */
    ctx.fillStyle = st.shade;
    ctx.beginPath();
    near.forEach(function (i) { quad(i, i + 1.04, -1, 1); });
    ctx.fill();
    ctx.fillStyle = st.hull;
    near.forEach(function (i) {
      ctx.globalAlpha = 0.15 + 0.45 * Math.max(0, -facing(i + 0.5));
      ctx.beginPath(); quad(i, i + 1.04, -1, 1); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = st.trim;
    ctx.lineWidth = Math.max(0.4, S * 0.0010);
    ctx.beginPath();
    near.forEach(function (i) {
      if (i % el.ribs) return;
      var p = P(i, -1), q = P(i, 1);
      ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
    });
    ctx.stroke();
    ctx.strokeStyle = st.lit;
    ctx.lineWidth = Math.max(0.4, S * 0.0012);
    ctx.beginPath();
    near.forEach(function (i) {
      var p = P(i, -1), q = P(i + 1, -1);
      ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
    });
    ctx.stroke();
    ctx.fillStyle = CC.OrbitShapes.light(0.85 * A);
    ctx.beginPath();
    var lr = Math.max(0.5, S * 0.0016);
    el.lights.forEach(function (i) {
      if (facing(i + 0.5) > 0) return;
      var p = P(i + 0.5, 0.1);
      ctx.moveTo(p.x + lr, p.y); ctx.arc(p.x, p.y, lr, 0, TAU);
    });
    ctx.fill();

    /* 5. Veils of the cloud's own gas across it. */
    var gc = st.gas;
    /* The ring's long axis on the page, whatever the view's own turn. */
    var ax = view.at(Math.hypot(cx + ux * R, cy + uy * R), Math.atan2(cx + ux * R, -(cy + uy * R)));
    var turn = Math.atan2(ax.y - centre.y, ax.x - centre.x);
    el.veils.forEach(function (v) {
      /* Three lobes along the ring, so a veil reads as a drift of cloud
       * and not a spotlight. */
      for (var lb = -1; lb <= 1; lb++) {
        var b = bx(v.t + lb * v.r * n / TAU * 0.9, 0);
        var x = b[0] + vx * v.off * R * (1 + 0.5 * lb), y = b[1] + vy * v.off * R * (1 + 0.5 * lb);
        var p = view.at(Math.sqrt(x * x + y * y), Math.atan2(x, -y));
        var vr = Math.max(1.5, view.px(v.r * R * (lb ? 0.7 : 1)));
        var a = v.a * A * (lb ? 0.75 : 1);
        var vg = ctx.createRadialGradient(0, 0, 0, 0, 0, vr);
        vg.addColorStop(0, CC.Color.hsva(gc.h, clamp(gc.s, 0, 1), clamp(gc.v, 0, 1), a));
        vg.addColorStop(0.5, CC.Color.hsva(gc.h, clamp(gc.s, 0, 1), clamp(gc.v, 0, 1), a * 0.5));
        vg.addColorStop(1, CC.Color.hsva(gc.h, clamp(gc.s, 0, 1), clamp(gc.v, 0, 1), 0));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(turn);
        ctx.scale(1, v.sq);
        ctx.fillStyle = vg;
        ctx.beginPath(); ctx.arc(0, 0, vr, 0, TAU); ctx.fill();
        ctx.restore();
      }
    });
    ctx.restore();
  }

  CC.Primitives.register({ "ringworld": ringworld });
  CC.Primitives.registerStyle("ringworld", function (colour, el, alpha) {
    var s = CC.DrawDetails.hullFill(colour, el, alpha);
    s.gas = { h: colour.h, s: colour.s, v: colour.v };
    s.alpha = alpha;
    return s;
  });
})();
