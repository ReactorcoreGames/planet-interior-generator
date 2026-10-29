/* Bore — drawing the great barrel (js/gen/bore.js builds it).
 *
 *   feeds     collared pipes parallel to the barrel across the saddle's
 *             width, a round socket in the heart, a lit box at the saddle
 *   saddle    a curved bolted clamp on the heart's rim, over the
 *             breech's curved base
 *   breech    a tapered housing where the barrel meets the heart, its
 *             chamber glowing with the charge at the barrel's root
 *   barrel    a filled bar of constant width (body radius, not angle, so
 *             it does not flare like a slot), shaded as a cylinder by one
 *             gradient across it, the bore channel down its middle burning
 *             in the accent by the charge
 *   collars   heavier bands where it passes through each shell's faces, so
 *             it reads as mounted through the body rather than laid on it
 *   coils     fat rings in stages of three, shaded as the cylinder is; in
 *             a lit stage the gaps between the rings glow (thin evenly
 *             spaced rungs read as a ladder, the shafts' own mark)
 *   crown     past the surface: a flared crown and a pair of rails, the
 *             mouth glowing when charged
 *
 * On emergency power everything that would burn in the accent burns the
 * emergency red, dimly; dark, nothing glows. Metal is the outermost built
 * layer's hue, dark. Drawn inside the rupture clip after the growth
 * (draw/scene.js), so a wound cuts it and it stands over the moss. Nothing
 * here knows the archetype.
 *
 * draw/shellwalls.js must load first. */

var CC = CC || {};

CC.BoreDraw = (function () {
  "use strict";

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* Shading across a cylinder, shadow side to lit side: value at each stop. */
  var CYL = [[0, 0.16], [0.18, 0.24], [0.5, 0.32], [0.72, 0.50], [0.80, 0.62], [0.90, 0.46], [1, 0.30]];

  function draw(ctx, view, bore, palette, elementOpacity) {
    if (!bore) return;
    var alpha = clamp(elementOpacity === undefined ? 1 : elementOpacity, 0, 1);
    var O = view.at(0, bore.angle), E = view.at(1, bore.angle);
    var ux = E.x - O.x, uy = E.y - O.y, L = Math.sqrt(ux * ux + uy * uy);
    if (L < 1) return;
    ux /= L; uy /= L;
    var nx = -uy, ny = ux;
    /* A point `r` out along the barrel and `x` across it, both body radius. */
    function pt(r, x) { return { x: O.x + ux * L * r + nx * L * x, y: O.y + uy * L * r + ny * L * x }; }
    function poly(p) {
      ctx.moveTo(p[0].x, p[0].y);
      for (var i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
      ctx.closePath();
    }
    function rect(rA, rB, x0, x1) { poly([pt(rA, x0), pt(rB, x0), pt(rB, x1), pt(rA, x1)]); }
    function fill(colour, list) {
      ctx.fillStyle = colour;
      ctx.beginPath();
      for (var i = 0; i < list.length; i++) rect(list[i][0], list[i][1], list[i][2], list[i][3]);
      ctx.fill();
    }

    var hull = palette.get(bore.role);
    var lights = CC.ShellWallDraw.lightHsv(palette, hull);
    var glow = bore.power === 2 ? lights[3] : lights[0];
    var hue = hull.h, sat = Math.min(0.25, hull.s * 0.6);
    function metal(v, a) { return CC.Color.hsva(hue, sat, v, (a === undefined ? 1 : a) * alpha); }
    function lit(a) { return CC.Color.hsva(glow[0], glow[1], glow[2], a * alpha); }
    /* The cylinder gradient across a width of `w` either side, `lift`
     * added to every stop. */
    function cyl(w, lift) {
      var A = pt(0, -w), B = pt(0, w);
      var g = ctx.createLinearGradient(A.x, A.y, B.x, B.y);
      for (var i = 0; i < CYL.length; i++) g.addColorStop(CYL[i][0], metal(clamp(CYL[i][1] + lift, 0, 1)));
      return g;
    }
    var on = bore.power !== 0 && bore.charge > 0;
    var h = bore.half, ch = bore.charge;
    var i, c;

    ctx.save();
    ctx.lineJoin = "miter";

    var b1 = bore.r0 + h * 1.6;

    /* The feeds, parallel to the barrel across the saddle's width:
     * tubes shaded as the barrel is, collared, an energy line down a
     * powered one; a round socket in the heart at the inner end and a
     * junction box with its light at the saddle (the user's sketch). */
    var feeds = bore.feeds || [];
    for (i = 0; i < feeds.length; i++) {
      var f = feeds[i], fw = f.w, X = f.x;
      var g0 = pt(0, X - fw), g1 = pt(0, X + fw);
      var shade = ctx.createLinearGradient(g0.x, g0.y, g1.x, g1.y);
      for (var cs = 0; cs < CYL.length; cs++) shade.addColorStop(CYL[cs][0], metal(CYL[cs][1] + 0.04));
      var sr = f.sr || fw * 1.3;
      /* A capped feed is fat: a squat box, so it fits under the saddle. */
      var bx = fw * (f.sr ? 0.8 : 2.2), bw = fw * (f.sr ? 1.12 : 1.25);
      var powered = f.power && bore.power !== 0;
      fill(metal(0.08), [[f.r0, f.r1, X - fw - 0.0015, X + fw + 0.0015]]);
      fill(shade, [[f.r0, f.r1, X - fw, X + fw]]);
      if (powered) {
        ctx.globalCompositeOperation = "lighter";
        fill(lit(bore.power === 2 ? 0.35 : 0.30 + 0.5 * ch), [[f.r0 + sr, f.r1 - bx, X - fw * 0.16, X + fw * 0.16]]);
        ctx.globalCompositeOperation = "source-over";
      }
      /* Collars along it. */
      var cl = [];
      for (var rr = f.r0 + sr + fw * 1.6; rr < f.r1 - bx - fw; rr += fw * 3.2) cl.push([rr - fw * 0.28, rr + fw * 0.28, X - fw * 1.2, X + fw * 1.2]);
      fill(metal(0.10), cl);
      for (var cc = 0; cc < cl.length; cc++) { cl[cc][0] += fw * 0.07; cl[cc][1] -= fw * 0.07; cl[cc][2] += fw * 0.07; cl[cc][3] -= fw * 0.07; }
      fill(shade, cl);
      /* The junction box at the saddle, and its light. */
      var rc = f.r1 - bx / 2;
      fill(metal(0.08), [[rc - bx / 2 - 0.0012, rc + bx / 2 + 0.0012, X - bw - 0.0012, X + bw + 0.0012]]);
      fill(metal(0.26), [[rc - bx / 2, rc + bx / 2, X - bw, X + bw]]);
      fill(metal(0.46), [[rc + bx * 0.25, rc + bx / 2, X - bw, X + bw]]);
      var Lp = pt(rc - bx * 0.05, X), lr = Math.max(0.7, view.px(fw * (f.sr ? 0.2 : 0.42)));
      ctx.fillStyle = powered ? lit(bore.power === 2 ? 0.8 : 1) : metal(0.12);
      ctx.beginPath(); ctx.arc(Lp.x, Lp.y, lr, 0, Math.PI * 2); ctx.fill();
      /* The socket in the heart: a flange ring, dark in the middle, lit. */
      var So = pt(f.r0, X), sp = Math.max(1, view.px(sr));
      ctx.fillStyle = metal(0.10);
      ctx.beginPath(); ctx.arc(So.x, So.y, sp + Math.max(0.6, view.px(0.0015)), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = metal(0.40);
      ctx.beginPath(); ctx.arc(So.x, So.y, sp, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = metal(0.18);
      ctx.beginPath(); ctx.arc(So.x, So.y, sp * 0.62, 0, Math.PI * 2); ctx.fill();
      if (powered) {
        ctx.fillStyle = lit(bore.power === 2 ? 0.5 : 0.55 + 0.4 * ch);
        ctx.beginPath(); ctx.arc(So.x, So.y, sp * 0.30, 0, Math.PI * 2); ctx.fill();
      }
      /* A cap over the core gets the hardware a part that size wants:
       * a bolt ring on the flange, a raised inner collar, vent slots
       * round the hub, each lit on a powered feed. */
      if (f.sr) socketCap(So, sp, powered);
    }

    function socketCap(So, sp, powered) {
      var k, a, nb = 16, br = Math.max(0.6, sp * 0.035);
      ctx.strokeStyle = metal(0.10); ctx.lineWidth = Math.max(0.6, sp * 0.02);
      ctx.beginPath(); ctx.arc(So.x, So.y, sp * 0.86, 0, Math.PI * 2); ctx.stroke();
      for (k = 0; k < nb; k++) {
        a = k / nb * Math.PI * 2;
        ctx.fillStyle = metal(0.08);
        ctx.beginPath(); ctx.arc(So.x + Math.cos(a) * sp * 0.93, So.y + Math.sin(a) * sp * 0.93, br, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = metal(0.55);
        ctx.beginPath(); ctx.arc(So.x + Math.cos(a) * sp * 0.93 - br * 0.3, So.y + Math.sin(a) * sp * 0.93 - br * 0.3, br * 0.45, 0, Math.PI * 2); ctx.fill();
      }
      /* The raised collar, lit edge up-left, dark down-right. */
      ctx.lineWidth = Math.max(0.8, sp * 0.06);
      ctx.strokeStyle = metal(0.30);
      ctx.beginPath(); ctx.arc(So.x, So.y, sp * 0.70, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = Math.max(0.6, sp * 0.02);
      ctx.strokeStyle = metal(0.58);
      ctx.beginPath(); ctx.arc(So.x, So.y, sp * 0.73, Math.PI * 0.75, Math.PI * 1.75); ctx.stroke();
      ctx.strokeStyle = metal(0.06);
      ctx.beginPath(); ctx.arc(So.x, So.y, sp * 0.67, -Math.PI * 0.25, Math.PI * 0.75); ctx.stroke();
      /* Vent slots round the hub. */
      ctx.lineCap = "round";
      for (k = 0; k < 12; k++) {
        a = (k + 0.5) / 12 * Math.PI * 2;
        var c = Math.cos(a), s = Math.sin(a);
        ctx.lineWidth = Math.max(0.8, sp * 0.045);
        ctx.strokeStyle = metal(0.06);
        ctx.beginPath(); ctx.moveTo(So.x + c * sp * 0.36, So.y + s * sp * 0.36); ctx.lineTo(So.x + c * sp * 0.54, So.y + s * sp * 0.54); ctx.stroke();
        if (powered && k % 2 === 0) {
          ctx.lineWidth = Math.max(0.5, sp * 0.018);
          ctx.strokeStyle = lit(bore.power === 2 ? 0.5 : 0.45 + 0.4 * ch);
          ctx.stroke();
        }
      }
      ctx.lineCap = "butt";
    }

    /* The saddle's band, on the heart's rim: the breech's base is curved
     * to sit in it, and the saddle is drawn over that base below. */
    var S0 = bore.saddle.r0, S1 = bore.saddle.r1, span = bore.saddle.span;
    function arcBand(rA, rB, a0, a1) {
      var N = 28, k, q;
      for (k = 0; k <= N; k++) {
        q = view.at(rB, a0 + (a1 - a0) * k / N);
        if (k === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      }
      for (k = N; k >= 0; k--) {
        q = view.at(rA, a0 + (a1 - a0) * k / N);
        ctx.lineTo(q.x, q.y);
      }
      ctx.closePath();
    }
    /* The breech: a housing tapering from the heart into the barrel, its
     * base curved to sit in the saddle (a straight base cut across the
     * round heart, the user's "clunky"). Built in the barrel's own frame:
     * the point at radius R and `x` across is sqrt(R^2 - x^2) along. */
    var Rb = S1 - (S1 - S0) * 0.3;
    function atR(R, x) {
      x = clamp(x, -R * 0.95, R * 0.95);
      return pt(Math.sqrt(R * R - x * x), x);
    }
    function housing(W, Wt, top, R) {
      var p = [], N = 16, k;
      p.push(pt(top - h * 0.5, -W), pt(top, -Wt), pt(top, Wt), pt(top - h * 0.5, W));
      for (k = 0; k <= N; k++) p.push(atR(R, W - 2 * W * k / N));
      return p;
    }
    ctx.fillStyle = metal(0.12);
    ctx.beginPath(); poly(housing(h * 1.85, h * 1.2, b1, Rb - 0.003)); ctx.fill();
    ctx.fillStyle = cyl(h * 1.85, 0.04);
    ctx.beginPath(); poly(housing(h * 1.78, h * 1.17, b1 - 0.002, Rb)); ctx.fill();
    /* Its seams: two along it, and one following the base's curve. */
    var sr = Math.sqrt(Math.max(0, Rb * Rb - h * h * 1.44));
    fill(metal(0.14), [[sr, b1 - h * 0.5, -h * 1.22, -h * 1.17], [sr, b1 - h * 0.5, h * 1.17, h * 1.22]]);
    ctx.strokeStyle = metal(0.14);
    ctx.lineWidth = Math.max(0.6, view.px(h * 0.05));
    ctx.beginPath();
    for (var ks = 0; ks <= 16; ks++) {
      var qs = atR(Rb + h * 0.55, h * 1.78 - 3.56 * h * ks / 16);
      if (ks === 0) ctx.moveTo(qs.x, qs.y); else ctx.lineTo(qs.x, qs.y);
    }
    ctx.stroke();

    /* The saddle, over the breech's base: a curved clamp following the
     * heart's rim, only a little wider than the housing, so the gun reads
     * as seated on a circle. Drawn on top (braces under it were dropped:
     * the user). */
    var A0 = bore.angle - span, A1 = bore.angle + span;
    ctx.fillStyle = metal(0.10);
    ctx.beginPath(); arcBand(S0 - 0.002, S1 + 0.002, A0 - 0.004 / bore.seat, A1 + 0.004 / bore.seat); ctx.fill();
    ctx.fillStyle = metal(0.30);
    ctx.beginPath(); arcBand(S0, S1, A0, A1); ctx.fill();
    ctx.fillStyle = metal(0.52);
    ctx.beginPath(); arcBand(S1 - (S1 - S0) * 0.22, S1, A0, A1); ctx.fill();
    ctx.fillStyle = metal(0.18);
    ctx.beginPath(); arcBand(S0, S0 + (S1 - S0) * 0.18, A0, A1); ctx.fill();
    /* Bolts along it, and its end caps. */
    var nb = Math.max(6, Math.round(span * bore.seat / (h * 0.32)));
    ctx.fillStyle = metal(0.12);
    ctx.beginPath();
    var br = Math.max(0.6, view.px(h * 0.055));
    for (i = 0; i <= nb; i++) {
      var qb = view.at((S0 + S1) / 2 - (S1 - S0) * 0.05, A0 + (A1 - A0) * (i + 0.5) / (nb + 1));
      ctx.moveTo(qb.x + br, qb.y); ctx.arc(qb.x, qb.y, br, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.beginPath();
    arcBand(S0 - 0.002, S1 + 0.004, A0, A0 + 0.08 * span);
    arcBand(S0 - 0.002, S1 + 0.004, A1 - 0.08 * span, A1);
    ctx.fillStyle = metal(0.22); ctx.fill();


    /* The barrel. */
    var top = bore.r1 - (bore.crown ? 0.032 : 0);
    fill(metal(0.10), [[b1, top, -h - 0.003, h + 0.003]]);
    fill(cyl(h, 0), [[b1, top, -h, h]]);
    /* Panel seams along it. */
    fill(metal(0.16, 0.8), [[b1, top, -h * 0.62, -h * 0.58], [b1, top, h * 0.40, h * 0.44]]);

    /* The bore channel down its middle, and its charge. */
    fill(metal(0.07), [[b1 - h * 0.9, top, -h * 0.22, h * 0.22]]);
    if (on) {
      ctx.globalCompositeOperation = "lighter";
      fill(lit(0.14 * ch), [[b1 - h * 0.9, top, -h * 0.34, h * 0.34]]);
      fill(lit(0.32 * ch), [[b1 - h * 0.9, top, -h * 0.19, h * 0.19]]);
      fill(CC.Color.hsva(glow[0], glow[1] * 0.35, 1, (0.25 + 0.6 * ch) * alpha), [[b1 - h * 0.9, top, -h * 0.06, h * 0.06]]);
      /* The chamber, glowing at the barrel's root. */
      var C = pt(b1 - h * 0.6, 0), R = Math.max(1, view.px(h * 1.3));
      var gc = ctx.createRadialGradient(C.x, C.y, 0, C.x, C.y, R);
      gc.addColorStop(0, lit(0.75 * ch + 0.15));
      gc.addColorStop(0.4, lit(0.25 * ch));
      gc.addColorStop(1, lit(0));
      ctx.fillStyle = gc;
      ctx.beginPath(); ctx.arc(C.x, C.y, R, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }

    /* The coils: the glow in a lit stage's gaps first, then the rings. */
    var gaps = [];
    for (i = 0; i + 1 < bore.coils.length; i++) {
      c = bore.coils[i];
      var d = bore.coils[i + 1];
      if (on && c.power && d.stage === c.stage) gaps.push([c.r, d.r, -h * 1.12, h * 1.12]);
    }
    if (gaps.length) {
      fill(metal(0.06), gaps);
      ctx.globalCompositeOperation = "lighter";
      fill(lit(bore.power === 2 ? 0.40 : 0.45 + 0.5 * ch), gaps);
      ctx.globalCompositeOperation = "source-over";
    }
    for (i = 0; i < bore.coils.length; i++) {
      c = bore.coils[i];
      var w = h * (c.big ? 1.42 : 1.26);
      var ring = (bore.coils.length > 1 ? Math.abs(bore.coils[1].r - bore.coils[0].r) : 0.012) * (c.big ? 0.36 : 0.30);
      fill(metal(0.08), [[c.r - ring - 0.0016, c.r + ring + 0.0016, -w - 0.002, w + 0.002]]);
      fill(cyl(w, c.big ? 0.06 : 0.02), [[c.r - ring, c.r + ring, -w, w]]);
      fill(metal(0.70, 0.55), [[c.r + ring * 0.35, c.r + ring * 0.7, w * 0.2, w * 0.85]]);
    }

    /* Collars where it passes through each shell's face. */
    for (i = 0; i < bore.collars.length; i++) {
      var rc = bore.collars[i];
      if (rc > top || rc < b1) continue;
      fill(metal(0.10), [[rc - 0.0095, rc + 0.0095, -h * 1.56, h * 1.56]]);
      fill(cyl(h * 1.5, -0.04), [[rc - 0.0075, rc + 0.0075, -h * 1.5, h * 1.5]]);
      fill(metal(0.12), [[rc - 0.0008, rc + 0.0008, -h * 1.5, h * 1.5]]);
    }

    /* The muzzle crown past the surface, and its rails. */
    if (bore.crown) {
      var m0 = top, m1 = bore.r1, rail = 0.034;
      ctx.fillStyle = metal(0.10);
      ctx.beginPath();
      poly([pt(m0 - 0.002, -h * 1.12), pt(m1 + 0.002, -h * 1.55), pt(m1 + 0.002, h * 1.55), pt(m0 - 0.002, h * 1.12)]);
      ctx.fill();
      ctx.fillStyle = cyl(h * 1.5, 0.02);
      ctx.beginPath();
      poly([pt(m0, -h * 1.08), pt(m1, -h * 1.5), pt(m1, h * 1.5), pt(m0, h * 1.08)]);
      ctx.fill();
      fill(metal(0.10), [[m1, m1 + rail, -h * 1.0, -h * 0.52], [m1, m1 + rail, h * 0.52, h * 1.0]]);
      fill(cyl(h, 0.02), [[m1, m1 + rail - 0.002, -h * 0.94, -h * 0.58], [m1, m1 + rail - 0.002, h * 0.58, h * 0.94]]);
      fill(metal(0.05), [[m0 + 0.006, m1 + 0.0005, -h * 0.30, h * 0.30]]);
      if (on) {
        ctx.globalCompositeOperation = "lighter";
        var M = pt(m1, 0), RM = Math.max(1, view.px(h * 1.6));
        var g = ctx.createRadialGradient(M.x, M.y, 0, M.x, M.y, RM);
        g.addColorStop(0, lit(0.85 * ch));
        g.addColorStop(0.35, lit(0.30 * ch));
        g.addColorStop(1, lit(0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(M.x, M.y, RM, 0, Math.PI * 2); ctx.fill();
        fill(lit(0.5 + 0.5 * ch), [[m0 + 0.008, m1, -h * 0.12, h * 0.12]]);
        ctx.globalCompositeOperation = "source-over";
      }
    }
    ctx.restore();
  }

  return { draw: draw };
})();
