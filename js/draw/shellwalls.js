/* Drawing shell walls — the dark, lit back wall seen through a void and down
 * an access shaft. The geometry is decided in js/gen/shellwalls.js; this file
 * receives radii, bearings and light lists and knows nothing about what kind
 * of body it is drawing.
 *
 * DRAWN BEFORE THE LAYERS. A hollow layer is filled as exactly its own band
 * (draw/shells.js), so anything painted underneath shows only where no band
 * is: through the voids and down the slots. That is what keeps a shaft's
 * edges exactly the slot's edges without a clip of its own.
 *
 * Colours come from the palette: the wall from the shell it sits under,
 * darkened toward black; the lights from the body's accent hue
 * (js/gen/accent.js), with a cold white and a warning amber beside it. */

var CC = CC || {};

CC.ShellWallDraw = (function () {
  "use strict";

  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* Body-space size of a facility light and of a shaft's signal light. */
  var LIGHT = 0.0026;

  function wallHsv(c) {
    return { h: c.h, s: Math.min(0.45, c.s * 0.7), v: 0.06 + c.v * 0.12 };
  }

  /* The three light colours, as [h, s, v], and a fourth: the emergency
   * red a body on emergency power burns (gen/activity.js). */
  var EMERGENCY = [358, 0.92, 0.95];
  function lightHsv(palette, c) {
    var ac = palette.accent || { h: c.h, s: Math.min(1, c.s + 0.3), v: 1 };
    var hd = Math.abs(((ac.h - 32) % 360 + 540) % 360 - 180);
    var warn = hd > 140 ? [4, 0.85, 1] : [32, 0.85, 1];
    return [[ac.h, ac.s, ac.v], [ac.h, 0.10, 1], warn, EMERGENCY];
  }

  /* A UNIT'S POWER (gen/activity.js `power` on an element): 1 or absent lit,
   * 0 dark, 2 emergency. Rewrites a registered style's colour lists in place
   * — every light dark, or every light the emergency red — so a primitive
   * drawing lights from its design needs no case of its own. */
  var DARK = "rgba(0,0,0,0)";
  function powered(style, el) {
    var p = el && el.power;
    if (!style || p === undefined || p === 1) return style;
    for (var key in style) {
      var v = style[key];
      if (Array.isArray(v) && v.length === 4 && typeof v[0] === "string") {
        style[key] = p === 0 ? [DARK, DARK, DARK, DARK] : [v[3], v[3], v[3], v[3]];
      }
    }
    if (style.warm) style.warm = p === 0 ? DARK : style.warm;
    return style;
  }

  function hsva(h, a) { return CC.Color.hsva(h[0], h[1], h[2], a); }

  /* Square points, one fill per (kind, brightness step). Squares rather
   * than dots: a window is a rectangle, and it is cheaper. */
  function drawPoints(ctx, list, cols, alpha, pos, size) {
    var buckets = {};
    for (var i = 0; i < list.length; i++) {
      var L = list[i];
      var key = L.k + "/" + Math.min(2, Math.floor(L.b * 3));
      (buckets[key] || (buckets[key] = [])).push(L);
    }
    for (var key2 in buckets) {
      var b = buckets[key2];
      var parts = key2.split("/");
      ctx.fillStyle = hsva(cols[+parts[0]], clamp(alpha * (0.55 + 0.22 * +parts[1]), 0, 1));
      ctx.beginPath();
      for (var j = 0; j < b.length; j++) {
        var p = pos(b[j]);
        ctx.rect(p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx.fill();
    }
  }

  function drawVoid(ctx, view, w, palette, alpha) {
    var c = palette.get(w.role);
    var wall = wallHsv(c);
    var ro = view.px(w.outer), ri = view.px(w.inner);
    if (ro - ri < 0.5) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(view.cx, view.cy, ro, 0, TAU);
    ctx.arc(view.cx, view.cy, ri, 0, TAU, true);
    ctx.clip("evenodd");

    /* The wall, shadowed under the shell above it and a step lighter at
     * the floor, which is what says the hollow has depth. */
    var g = ctx.createRadialGradient(view.cx, view.cy, ri, view.cx, view.cy, ro);
    g.addColorStop(0, CC.Color.hsva(wall.h, wall.s, wall.v * 1.35, 1));
    g.addColorStop(1, CC.Color.hsva(wall.h, wall.s, wall.v * 0.55, 1));
    ctx.fillStyle = g;
    ctx.fillRect(view.cx - ro, view.cy - ro, ro * 2, ro * 2);

    /* Ribs, every fourth heavier, then the deck lines. */
    var rib = CC.Color.hsva(wall.h, wall.s * 0.8, wall.v + 0.10, 0.55);
    var ribMajor = CC.Color.hsva(wall.h, wall.s * 0.8, wall.v + 0.16, 0.7);
    for (var pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? ribMajor : rib;
      ctx.lineWidth = view.lw(pass ? 0.9 : 0.5);
      ctx.beginPath();
      for (var k = pass ? 0 : 1; k < w.ribs; k += pass ? 4 : 1) {
        if (!pass && k % 4 === 0) continue;
        var a = w.ribStart + k * TAU / w.ribs;
        var p0 = view.at(w.inner, a), p1 = view.at(w.outer, a);
        ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = CC.Color.hsva(wall.h, wall.s * 0.8, wall.v + 0.12, 0.6);
    ctx.lineWidth = view.lw(0.6);
    ctx.beginPath();
    for (var d = 0; d < w.decks.length; d++) {
      var rd = view.px(w.decks[d]);
      ctx.moveTo(view.cx + rd, view.cy);
      ctx.arc(view.cx, view.cy, rd, 0, TAU);
    }
    ctx.stroke();

    var size = Math.max(0.8, view.px(LIGHT));
    drawPoints(ctx, w.lights, lightHsv(palette, c), alpha, function (L) {
      return view.at(L.r, L.a);
    }, size);
    ctx.restore();
  }

  function drawShaft(ctx, view, s, palette, alpha) {
    var c = palette.get(s.role);
    var wall = wallHsv(c);
    var A = view.at(s.r0, s.angle), B = view.at(s.r1, s.angle);
    var dx = B.x - A.x, dy = B.y - A.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    var ux = dx / len, uy = dy / len;
    var hw = view.px(s.half);
    var nx = -uy, ny = ux;
    function pt(t, x) {
      return { x: A.x + dx * t + nx * hw * x, y: A.y + dy * t + ny * hw * x };
    }

    ctx.save();
    /* Wider than the slot, so the shell bands trim it to the slot's own
     * edges at every depth. */
    var q = [pt(0, -1.12), pt(1, -1.12), pt(1, 1.12), pt(0, 1.12)];
    ctx.beginPath();
    ctx.moveTo(q[0].x, q[0].y);
    for (var i = 1; i < 4; i++) ctx.lineTo(q[i].x, q[i].y);
    ctx.closePath();
    ctx.fillStyle = CC.Color.hsva(wall.h, wall.s, wall.v * 0.6, 1);
    ctx.fill();

    /* Guide rails down both sides and rungs across, the shaft's own frame. */
    ctx.strokeStyle = CC.Color.hsva(wall.h, wall.s * 0.8, wall.v + 0.14, 0.7);
    ctx.lineWidth = view.lw(0.7);
    ctx.beginPath();
    var e0 = pt(0, -0.62), e1 = pt(1, -0.62), f0 = pt(0, 0.62), f1 = pt(1, 0.62);
    ctx.moveTo(e0.x, e0.y); ctx.lineTo(e1.x, e1.y);
    ctx.moveTo(f0.x, f0.y); ctx.lineTo(f1.x, f1.y);
    var rungs = s.signals.length * 2;
    /* A dark shaft has no signals, so no rungs: i / 0 would be NaN. */
    for (i = 0; rungs && i <= rungs; i++) {
      var r0 = pt(i / rungs, -0.62), r1 = pt(i / rungs, 0.62);
      ctx.moveTo(r0.x, r0.y); ctx.lineTo(r1.x, r1.y);
    }
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1;

    var cols = lightHsv(palette, c);
    var span = s.r1 - s.r0;
    drawPoints(ctx, s.side, cols, alpha * 0.8, function (L) {
      return pt((L.r - s.r0) / span, L.x);
    }, Math.max(0.8, view.px(LIGHT)));

    /* The signal column: a soft halo under each light, then the light. */
    var core = Math.max(0.8, hw * 0.12);
    for (i = 0; i < s.signals.length; i++) {
      var L = s.signals[i];
      var p = pt((L.r - s.r0) / span, 0);
      var col = cols[L.k];
      ctx.fillStyle = hsva(col, clamp(alpha * L.b * 0.28, 0, 1));
      ctx.beginPath();
      ctx.arc(p.x, p.y, core * 2.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = hsva([col[0], col[1] * 0.6, 1], clamp(alpha * L.b, 0, 1));
      ctx.beginPath();
      ctx.arc(p.x, p.y, core, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function draw(ctx, view, walls, palette, elementOpacity) {
    if (!walls) return;
    var alpha = elementOpacity === undefined ? 1 : elementOpacity;
    for (var i = 0; i < walls.voids.length; i++) drawVoid(ctx, view, walls.voids[i], palette, alpha);
    for (i = 0; i < walls.shafts.length; i++) drawShaft(ctx, view, walls.shafts[i], palette, alpha);
  }

  /* The light colours are shared, so whatever else is lit on a built body
   * (draw/primitives/cellgrid.js) is lit in the same three. */
  return { draw: draw, lightHsv: lightHsv, powered: powered };
})();
