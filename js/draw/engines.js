/* Engines — drawing the drive cluster (js/gen/engines.js builds it).
 *
 *   frame     heavy longerons down through the shells from under each main
 *             bell, converging on a curved thrust plate, tied across at
 *             each shell's faces: the push carried into the body
 *   mount     the engine block on the hull, its base following the curve,
 *             its face flat, the bells hung from it
 *   bells     shaded as cylinders across their width, flaring from the
 *             throat, cooling lines along them and stiffener rings across,
 *             a lit lip at the exit; a firing bell glows hot at its throat
 *   plume     the body's one soft mark: a gas of overlapping radial puffs,
 *             a bright core, soft shock diamonds down it, sparks
 *             fanning out, all added with "lighter", fading with distance
 *
 * Firing, the plume burns in the accent with a white core. On emergency
 * power each throat burns a dull red and there is no plume; dark, the
 * engines are cold metal. Metal is the outermost built layer's hue, dark,
 * as the bore's is. Drawn inside the rupture clip after the bore
 * (draw/scene.js), so a wound cuts the frame. Nothing here knows the
 * archetype.
 *
 * draw/shellwalls.js must load first. */

var CC = CC || {};

CC.EngineDraw = (function () {
  "use strict";

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* Shading across a cylinder, shadow side to lit side (draw/bore.js). */
  var CYL = [[0, 0.16], [0.18, 0.24], [0.5, 0.32], [0.72, 0.50], [0.80, 0.62], [0.90, 0.46], [1, 0.30]];

  function draw(ctx, view, eng, palette, elementOpacity) {
    if (!eng) return;
    var alpha = clamp(elementOpacity === undefined ? 1 : elementOpacity, 0, 1);
    var O = view.at(0, eng.angle), E = view.at(1, eng.angle);
    var ux = E.x - O.x, uy = E.y - O.y, L = Math.sqrt(ux * ux + uy * uy);
    if (L < 1) return;
    ux /= L; uy /= L;
    var nx = -uy, ny = ux;
    function pt(r, x) { return { x: O.x + ux * L * r + nx * L * x, y: O.y + uy * L * r + ny * L * x }; }
    function poly(p) {
      ctx.moveTo(p[0].x, p[0].y);
      for (var i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
      ctx.closePath();
    }
    function quad(a, b, c, d) { poly([a, b, c, d]); }
    function fillPoly(colour, p) { ctx.fillStyle = colour; ctx.beginPath(); poly(p); ctx.fill(); }

    var hull = palette.get(eng.role);
    var lights = CC.ShellWallDraw.lightHsv(palette, hull);
    var glow = lights[0], white = lights[1], red = lights[3];
    var hue = hull.h, sat = Math.min(0.25, hull.s * 0.6);
    function metal(v, a) { return CC.Color.hsva(hue, sat, clamp(v, 0, 1), (a === undefined ? 1 : a) * alpha); }
    function hsv(c, a) { return CC.Color.hsva(c[0], c[1], c[2], clamp(a, 0, 1) * alpha); }
    function cyl(r, x, w, lift) {
      var A = pt(r, x - w), B = pt(r, x + w);
      var g = ctx.createLinearGradient(A.x, A.y, B.x, B.y);
      for (var i = 0; i < CYL.length; i++) g.addColorStop(CYL[i][0], metal(CYL[i][1] + lift));
      return g;
    }
    var ch = eng.charge, i, k, b;

    ctx.save();
    ctx.lineJoin = "miter";

    /* The thrust frame, under everything else. */
    var F = eng.frame;
    if (F) {
      var rodAt = function (rod, rr) { return rod.x1 + (rod.x0 - rod.x1) * (rr - F.r0) / (F.r1 - F.r0); };
      var rodPoly = function (rod, grow) {
        var w = rod.w + grow;
        return [pt(F.r0, rod.x1 - w), pt(F.r1, rod.x0 - w), pt(F.r1, rod.x0 + w), pt(F.r0, rod.x1 + w)];
      };
      /* Ties across where the frame passes each shell's face. */
      for (k = 0; k < F.ties.length; k++) {
        var rt = F.ties[k], lo = Infinity, hi = -Infinity;
        for (i = 0; i < F.rods.length; i++) {
          var xr = rodAt(F.rods[i], rt);
          lo = Math.min(lo, xr - F.rods[i].w * 1.6); hi = Math.max(hi, xr + F.rods[i].w * 1.6);
        }
        fillPoly(metal(0.08), [pt(rt - 0.008, lo - 0.002), pt(rt + 0.008, lo - 0.002), pt(rt + 0.008, hi + 0.002), pt(rt - 0.008, hi + 0.002)]);
        ctx.fillStyle = cyl(rt, (lo + hi) / 2, (hi - lo) / 2, -0.02);
        ctx.beginPath(); quad(pt(rt - 0.006, lo), pt(rt + 0.006, lo), pt(rt + 0.006, hi), pt(rt - 0.006, hi)); ctx.fill();
      }
      for (i = 0; i < F.rods.length; i++) {
        var rod = F.rods[i];
        fillPoly(metal(0.07), rodPoly(rod, 0.0025));
        ctx.fillStyle = cyl((F.r0 + F.r1) / 2, (rod.x0 + rod.x1) / 2, rod.w, 0.02);
        ctx.beginPath(); poly(rodPoly(rod, 0)); ctx.fill();
        /* A seam down its middle, rivet bands along it. */
        ctx.strokeStyle = metal(0.12, 0.8);
        ctx.lineWidth = Math.max(0.5, view.px(rod.w * 0.12));
        var s0 = pt(F.r0, rod.x1 - rod.w * 0.3), s1 = pt(F.r1, rod.x0 - rod.w * 0.3);
        ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.lineTo(s1.x, s1.y); ctx.stroke();
        for (var rb = F.r0 + 0.03; rb < F.r1 - 0.01; rb += 0.028) {
          var xb = rodAt(rod, rb);
          fillPoly(metal(0.10), [pt(rb - 0.002, xb - rod.w * 1.15), pt(rb + 0.002, xb - rod.w * 1.15), pt(rb + 0.002, xb + rod.w * 1.15), pt(rb - 0.002, xb + rod.w * 1.15)]);
        }
      }
      /* The thrust plate, a curved bolted band on the layer's face. */
      var arcBand = function (rA, rB, a0, a1) {
        var N = 28, q;
        for (k = 0; k <= N; k++) { q = view.at(rB, a0 + (a1 - a0) * k / N); if (k === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); }
        for (k = N; k >= 0; k--) { q = view.at(rA, a0 + (a1 - a0) * k / N); ctx.lineTo(q.x, q.y); }
        ctx.closePath();
      };
      var P0 = F.r0 - 0.012, P1 = F.r0 + 0.016, A0 = eng.angle - F.span, A1 = eng.angle + F.span;
      ctx.fillStyle = metal(0.08); ctx.beginPath(); arcBand(P0 - 0.002, P1 + 0.002, A0 - 0.004, A1 + 0.004); ctx.fill();
      ctx.fillStyle = metal(0.30); ctx.beginPath(); arcBand(P0, P1, A0, A1); ctx.fill();
      ctx.fillStyle = metal(0.50); ctx.beginPath(); arcBand(P1 - 0.006, P1, A0, A1); ctx.fill();
      ctx.fillStyle = metal(0.12);
      ctx.beginPath();
      var nbolt = Math.max(6, Math.round((A1 - A0) * F.r0 / 0.016)), br = Math.max(0.6, view.px(0.0028));
      for (k = 0; k <= nbolt; k++) {
        var qb = view.at((P0 + P1) / 2, A0 + (A1 - A0) * (k + 0.5) / (nbolt + 1));
        ctx.moveTo(qb.x + br, qb.y); ctx.arc(qb.x, qb.y, br, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    /* The engine block: base on the hull's curve, flat face. */
    var M = eng.mount, S = eng.surface;
    function block(grow) {
      var p = [], N = 18, W = M.w + grow, R = M.base - grow;
      p.push(pt(M.top + grow, -W * 0.92), pt(M.top + grow, W * 0.92));
      for (k = 0; k <= N; k++) {
        var x = W - 2 * W * k / N;
        p.push(pt(Math.sqrt(Math.max(0, R * R - x * x)), x));
      }
      return p;
    }
    fillPoly(metal(0.08), block(0.003));
    ctx.fillStyle = cyl(M.top, 0, M.w, 0.0);
    ctx.beginPath(); poly(block(0)); ctx.fill();
    /* A lit face along the top, a shadow seam under it, panel seams down. */
    fillPoly(metal(0.55), [pt(M.top - 0.006, -M.w * 0.92), pt(M.top, -M.w * 0.92), pt(M.top, M.w * 0.92), pt(M.top - 0.006, M.w * 0.92)]);
    ctx.strokeStyle = metal(0.12, 0.85);
    ctx.lineWidth = Math.max(0.5, view.px(0.0016));
    ctx.beginPath();
    for (k = 1; k < 8; k++) {
      var xs = -M.w + 2 * M.w * k / 8, rb0 = Math.sqrt(Math.max(0, S * S - xs * xs));
      var p0 = pt(rb0, xs), p1 = pt(M.top - 0.007, xs);
      ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
    }
    ctx.stroke();

    /* The bells. */
    function profile(bl, grow) {
      var p = [], N = 14, u, hw, rr;
      var c0 = M.top - 0.002, c1 = bl.r0;
      p.push(pt(c0, bl.x - bl.t * 1.5 - grow), pt(c1, bl.x - bl.t * 1.5 - grow));
      for (k = 0; k <= N; k++) {
        u = k / N; hw = bl.t + (bl.e - bl.t) * Math.pow(u, 0.6) + grow;
        rr = bl.r0 + (bl.r1 - bl.r0) * u + (k === N ? grow : 0);
        p.push(pt(rr, bl.x - hw));
      }
      for (k = N; k >= 0; k--) {
        u = k / N; hw = bl.t + (bl.e - bl.t) * Math.pow(u, 0.6) + grow;
        rr = bl.r0 + (bl.r1 - bl.r0) * u + (k === N ? grow : 0);
        p.push(pt(rr, bl.x + hw));
      }
      p.push(pt(c1, bl.x + bl.t * 1.5 + grow), pt(c0, bl.x + bl.t * 1.5 + grow));
      return p;
    }
    function halfAt(bl, u) { return bl.t + (bl.e - bl.t) * Math.pow(u, 0.6); }
    for (i = 0; i < eng.bells.length; i++) {
      b = eng.bells[i];
      var firing = b.power && eng.power !== 0;
      fillPoly(metal(0.07), profile(b, 0.0025));
      ctx.fillStyle = cyl(b.r1, b.x, b.e, b.big ? 0.02 : 0);
      ctx.beginPath(); poly(profile(b, 0)); ctx.fill();
      /* Cooling lines along it. */
      ctx.strokeStyle = metal(0.12, 0.7);
      ctx.lineWidth = Math.max(0.4, view.px(b.e * 0.025));
      ctx.beginPath();
      for (var f = -0.75; f <= 0.76; f += 0.25) {
        for (k = 0; k <= 10; k++) {
          var uu = 0.05 + 0.93 * k / 10, q = pt(b.r0 + (b.r1 - b.r0) * uu, b.x + f * halfAt(b, uu));
          if (k === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
        }
      }
      ctx.stroke();
      /* Stiffener rings across, and the lit lip at the exit. */
      var rings = [0.32, 0.62];
      for (k = 0; k < rings.length; k++) {
        var ur = rings[k], rr = b.r0 + (b.r1 - b.r0) * ur, hw = halfAt(b, ur) + 0.0015, d = b.e * 0.05;
        fillPoly(metal(0.10), [pt(rr - d, b.x - hw), pt(rr + d, b.x - hw), pt(rr + d, b.x + hw), pt(rr - d, b.x + hw)]);
      }
      var lip = b.e * 0.10;
      fillPoly(metal(0.08), [pt(b.r1 - lip, b.x - b.e - 0.002), pt(b.r1 + 0.001, b.x - b.e - 0.002), pt(b.r1 + 0.001, b.x + b.e + 0.002), pt(b.r1 - lip, b.x + b.e + 0.002)]);
      ctx.fillStyle = cyl(b.r1, b.x, b.e, 0.12);
      ctx.beginPath(); quad(pt(b.r1 - lip * 0.8, b.x - b.e), pt(b.r1, b.x - b.e), pt(b.r1, b.x + b.e), pt(b.r1 - lip * 0.8, b.x + b.e)); ctx.fill();
      /* Heat at the throat: orange on a firing bell, the emergency red
       * dimly when the plant is down to that. */
      if (firing || (b.power && eng.power === 2)) {
        var T0 = pt(b.r0, b.x), T1 = pt(b.r0 + (b.r1 - b.r0) * 0.65, b.x);
        var hg = ctx.createLinearGradient(T0.x, T0.y, T1.x, T1.y);
        var heat = eng.power === 2 ? red : [18, 0.85, 1];
        var ha = eng.power === 2 ? 0.45 : 0.30 + 0.45 * ch;
        hg.addColorStop(0, hsv(heat, ha)); hg.addColorStop(1, hsv(heat, 0));
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = hg; ctx.beginPath(); poly(profile(b, 0)); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      }
    }

    /* The plumes, last: the one soft thing on the body. The merged wake
     * first, under each bell's own. */
    if (eng.power === 1 && ch > 0) {
      var lift = 0.45 + 0.55 * ch;
      ctx.globalCompositeOperation = "lighter";
      var wk = eng.wake || [], W = eng.wakeWidth;
      for (i = 0; i < wk.length; i++) {
        var wp = wk[i];
        puff(pt(eng.wakeFrom + wp.u * eng.wakeLen, wp.x), W * (0.30 + 0.55 * wp.u) * wp.s,
             glow, 0.10 * Math.pow(1 - wp.u, 1.6) * wp.a * lift);
      }
      for (i = 0; i < eng.bells.length; i++) {
        b = eng.bells[i];
        if (b.power) plume(b, lift);
      }
      ctx.globalCompositeOperation = "source-over";
    }

    /* One soft round puff of glowing gas. */
    function puff(P, size, c, a) {
      var rad = Math.max(1, view.px(size));
      var g = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, rad);
      g.addColorStop(0, hsv(c, a));
      g.addColorStop(0.45, hsv(c, a * 0.4));
      g.addColorStop(1, hsv(c, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(P.x, P.y, rad, 0, Math.PI * 2); ctx.fill();
    }

    /* A soft glow drawn long along the plume's axis, `l` and `w` its
     * half-length and half-width in body radius. */
    function streak(P, l, w, c, a) {
      var rad = Math.max(1, view.px(l));
      ctx.save();
      ctx.translate(P.x, P.y);
      ctx.rotate(Math.atan2(uy, ux));
      ctx.scale(1, Math.max(0.05, w / l));
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
      g.addColorStop(0, hsv(c, a));
      g.addColorStop(0.35, hsv(c, a * 0.55));
      g.addColorStop(1, hsv(c, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function plume(bl, lift) {
      var Lp = bl.len, r1 = bl.r1, e = bl.e, j, P;
      /* The gas: overlapping soft puffs, wider and fainter with distance. */
      for (j = 0; j < bl.puffs.length; j++) {
        var pf = bl.puffs[j];
        puff(pt(r1 + pf.u * Lp, bl.x + pf.x * e), e * (0.8 + 1.4 * pf.u) * pf.s,
             glow, 0.22 * Math.pow(1 - pf.u, 1.3) * pf.a * lift);
      }
      /* The core: small bright puffs crowding the exit, white to the accent. */
      var cl = Lp * 0.5;
      for (j = 0; j < bl.core.length; j++) {
        var cp = bl.core[j];
        puff(pt(r1 + cp.u * cl, bl.x + cp.x * e), e * (0.75 - 0.4 * cp.u) * cp.s,
             cp.u < 0.35 ? white : glow, 0.42 * (1 - cp.u) * cp.a * lift);
      }
      /* Shock diamonds down the core: long soft lozenges, each a glow. */
      for (j = 0; j < bl.diamonds; j++) {
        var dc = r1 + e * (1.1 + 1.5 * j), dw = e * 0.30 * (1 - j * 0.15), dl = e * 0.62;
        if (dc - r1 > cl) break;
        var da = (0.75 - j * 0.13) * lift;
        streak(pt(dc, bl.x), dl, dw, white, da);
      }
      /* Sparks fanning out. */
      for (j = 0; j < bl.sparks.length; j++) {
        var sp = bl.sparks[j];
        P = pt(r1 + sp.u * Lp * 1.2, bl.x + sp.x * e);
        var rad = Math.max(0.5, view.px(0.0018 * sp.s));
        ctx.fillStyle = hsv(sp.s > 1.1 ? white : glow, 0.7 * sp.a * Math.pow(1 - sp.u, 1.2) * lift);
        ctx.beginPath(); ctx.arc(P.x, P.y, rad, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.restore();
  }

  return { draw: draw };
})();
