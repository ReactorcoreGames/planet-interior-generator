/* Wound scaffold — drawing the construction work a clean-edged wound
 * carries (js/gen/woundclean.js builds it).
 *
 *   tower   a lattice against a cut face: two uprights standing off it into
 *           the gap, a ledger at every lift and a diagonal brace in each bay
 *   frame   a missing shell as bare steel: ring girders along its top and
 *           bottom reaching in from each face, radial ribs between them and
 *           a diagonal in every bay. In the layer's own metal, drawn first
 *   crane   a mast on the hull at the lip, its jib out over the mouth with a
 *           tie back to the mast head, a counter-jib and its weight, and a
 *           hook let down into the wound
 *
 * THE SCAFFOLD IS PAINTED SAFETY AMBER, as site steel is: a different
 * material from the metal it stands in. Red where the accent is itself near
 * amber, so it never reads as one more light. Lengths are body radius and enter pixels
 * only through `view`; nothing here knows which archetype it is drawing.
 *
 * draw/primitives/built.js and draw/shellwalls.js must load first. */

var CC = CC || {};

CC.WoundScaffoldDraw = (function () {
  "use strict";

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  var AMBER = 44;
  function style(palette, alpha) {
    var ac = palette.accent;
    var near = ac && Math.abs(((ac.h - AMBER) % 360 + 540) % 360 - 180) < 35;
    return CC.ShellDraw.pillarStyle({ h: near ? 4 : AMBER, s: 0.62, v: 0.74 }, alpha);
  }

  function line(ctx, a, b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }

  function tower(ctx, view, T, st) {
    var gap = 0.0015;
    function at(r, d) { return view.at(r, T.a - T.side * d / r); }
    var lifts = Math.max(1, Math.round((T.r1 - T.r0) / T.lift));
    var lw = Math.max(0.5, view.px(0.0011));
    ctx.lineCap = "butt";
    /* Bracing, dim, under the frame. */
    ctx.strokeStyle = st.shade;
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    for (var k = 0; k < lifts; k++) {
      var ra = T.r0 + (T.r1 - T.r0) * k / lifts, rb = T.r0 + (T.r1 - T.r0) * (k + 1) / lifts;
      if (k % 2) line(ctx, at(ra, gap), at(rb, gap + T.depth));
      else line(ctx, at(ra, gap + T.depth), at(rb, gap));
    }
    ctx.stroke();
    /* Ledgers, then the uprights over them. */
    ctx.strokeStyle = st.hull;
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (k = 0; k <= lifts; k++) {
      var r = T.r0 + (T.r1 - T.r0) * k / lifts;
      line(ctx, at(r, 0), at(r, gap + T.depth));
    }
    ctx.stroke();
    ctx.strokeStyle = st.lit;
    ctx.lineWidth = lw * 1.2;
    ctx.beginPath();
    line(ctx, at(T.r0, gap), at(T.r1, gap));
    line(ctx, at(T.r0, gap + T.depth), at(T.r1, gap + T.depth));
    ctx.stroke();
  }

  /* One girder along the arc at r, from bearing a0 to a1. */
  function girder(ctx, view, r, a0, a1, w, st) {
    var n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 0.04));
    for (var k = 0; k < n; k++) {
      CC.Primitives.beam(ctx, view.at(r, a0 + (a1 - a0) * k / n),
                         view.at(r, a0 + (a1 - a0) * (k + 1) / n), w, st);
    }
  }

  function frame(ctx, view, F, st) {
    var g = F.girder, gw = view.px(g);
    var lo = F.r0 + g / 2, hi = F.r1 - g / 2;
    var width = F.aR - F.aL, mid = (F.r0 + F.r1) / 2;
    var step = F.pitch / mid;
    var lw = Math.max(0.5, view.px(0.0009));
    var parts = [[F.aL, F.aL + width * F.reachL], [F.aR, F.aR - width * F.reachR]];
    for (var p = 0; p < 2; p++) {
      var a0 = parts[p][0], a1 = parts[p][1], dir = a1 > a0 ? 1 : -1;
      var n = Math.floor(Math.abs(a1 - a0) / step);
      /* Diagonals first, dim, one to a bay. */
      ctx.strokeStyle = st.shade;
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (var k = 0; k < n; k++) {
        var ra = a0 + dir * step * k, rb = a0 + dir * step * (k + 1);
        line(ctx, view.at(k % 2 ? lo : hi, ra), view.at(k % 2 ? hi : lo, rb));
      }
      ctx.stroke();
      for (k = 1; k <= n; k++) {
        var ar = a0 + dir * step * k;
        CC.Primitives.beam(ctx, view.at(lo, ar), view.at(hi, ar), gw * 0.7, st);
      }
      girder(ctx, view, lo, a0, a1, gw, st);
      girder(ctx, view, hi, a0, a1, gw, st);
    }
  }

  function crane(ctx, view, C, st) {
    var base = view.at(C.r, C.a), head = view.at(C.r + C.h, C.a);
    var ox = Math.sin(C.a), oy = -Math.cos(C.a);
    /* Into the wound, along the arc, from an edge on `side`. */
    var ix = -C.side * Math.cos(C.a), iy = -C.side * Math.sin(C.a);
    var jl = view.px(C.jib), mw = view.px(0.0055), jw = view.px(0.0038);
    var jy = { x: head.x - ox * jw * 0.6, y: head.y - oy * jw * 0.6 };
    var tip = { x: jy.x + ix * jl, y: jy.y + iy * jl };
    var back = { x: jy.x - ix * jl * 0.30, y: jy.y - iy * jl * 0.30 };
    var apex = { x: head.x + ox * jl * 0.16, y: head.y + oy * jl * 0.16 };
    var lw = Math.max(0.5, view.px(0.0010));
    /* The hook's cable first, under the jib. */
    var hk = { x: jy.x + ix * jl * 0.82, y: jy.y + iy * jl * 0.82 };
    var drop = view.px(C.drop);
    var hb = { x: hk.x - ox * drop, y: hk.y - oy * drop };
    ctx.strokeStyle = st.trim;
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    line(ctx, hk, hb);
    ctx.stroke();
    ctx.fillStyle = st.hull;
    var hs = Math.max(1, view.px(0.0028));
    ctx.fillRect(hb.x - hs / 2, hb.y - hs / 2, hs, hs);
    CC.Primitives.beam(ctx, base, apex, mw, st);
    CC.Primitives.beam(ctx, back, tip, jw, st);
    /* The counterweight, and the ties from the apex. */
    var cw = Math.max(1.5, jw * 1.6);
    ctx.fillStyle = st.shade;
    ctx.beginPath();
    ctx.arc(back.x, back.y, cw / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = st.lit;
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    line(ctx, apex, tip);
    line(ctx, apex, back);
    ctx.stroke();
  }

  /* `frames` in each layer's own metal, then the scaffold over them. */
  function draw(ctx, view, frames, list, palette, alpha) {
    var a = clamp(alpha === undefined ? 1 : alpha, 0, 1);
    var i, styles = {};
    ctx.save();
    for (i = 0; frames && i < frames.length; i++) {
      var F = frames[i];
      var fs = styles[F.role] ||
        (styles[F.role] = CC.ShellDraw.pillarStyle(palette.get(F.role), a));
      frame(ctx, view, F, fs);
    }
    var st = list && list.length ? style(palette, a) : null;
    for (i = 0; st && i < list.length; i++) {
      var M = list[i];
      if (M.kind === "tower") tower(ctx, view, M, st);
      else if (M.kind === "crane") crane(ctx, view, M, st);
    }
    ctx.restore();
  }

  return { draw: draw };
})();
