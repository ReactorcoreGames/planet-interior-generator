/* Overgrowth — drawing the growth on a built body's hull
 * (js/gen/overgrowth.js builds it).
 *
 *   mat      a lumpy crust standing off the outer face, its fingers down the
 *            cut face, a darker underside where it roots
 *   tendril  a tapering wobbling strand hung down a shaft wall or from the
 *            outer void's ceiling
 *   pool     a mound on a wound's floor or ledge, clipped to the wound's
 *            outline so it fills the floor's dips and stops at its faces
 *   dots     leaves and blooms over all of them, three tones, three sizes
 *
 * Two passes, by `phase`: "body" (mats, tendrils, their leaves) inside the
 * rupture clip in draw/scene.js, so a wound takes the growth in its path;
 * "wounds" (the pools) after the clip lifts, since they lie inside the cut.
 * One natural hue per body, given by the builder. Lengths are body radius;
 * nothing here knows the archetype. */

var CC = CC || {};

CC.OvergrowthDraw = (function () {
  "use strict";

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function colours(hue, alpha) {
    var h = hue[0], s = hue[1], v = hue[2];
    return {
      base: CC.Color.hsva(h, s, v * 0.92, alpha),
      vine: CC.Color.hsva(h - 4, s, v * 0.78, alpha),
      root: CC.Color.hsva(h, Math.min(1, s * 1.1), v * 0.42, alpha * 0.75),
      edge: CC.Color.hsva(h, Math.min(1, s * 1.1), v * 0.36, alpha * 0.8),
      tones: [CC.Color.hsva(h, Math.min(1, s * 1.1), v * 0.45, alpha),
              CC.Color.hsva(h - 6, s, v, alpha),
              CC.Color.hsva(h + 12, s * 0.72, Math.min(1, v * 1.45), alpha)]
    };
  }

  function mat(ctx, view, M, col) {
    var p = M.pts, k, q;
    ctx.beginPath();
    for (k = 0; k < p.length; k++) {
      q = view.at(p[k][1], p[k][0]);
      if (k === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
    }
    for (k = p.length - 1; k >= 0; k--) {
      q = view.at(p[k][2], p[k][0]);
      ctx.lineTo(q.x, q.y);
    }
    ctx.closePath();
    ctx.fillStyle = col.base;
    ctx.fill();
    ctx.stroke();
    /* The roots: the lower third, darker. */
    ctx.beginPath();
    for (k = 0; k < p.length; k++) {
      q = view.at(p[k][2] + (p[k][1] - p[k][2]) * 0.35, p[k][0]);
      if (k === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
    }
    for (k = p.length - 1; k >= 0; k--) {
      q = view.at(p[k][2], p[k][0]);
      ctx.lineTo(q.x, q.y);
    }
    ctx.closePath();
    ctx.fillStyle = col.root;
    ctx.fill();
  }

  function tendril(ctx, view, T) {
    var p = T.pts, k, q, P;
    ctx.beginPath();
    for (k = 0; k < p.length; k++) {
      P = p[k];
      q = view.at(P[0], P[1] - P[2] / 2 / Math.max(P[0], 0.05));
      if (k === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
    }
    for (k = p.length - 1; k >= 0; k--) {
      P = p[k];
      q = view.at(P[0], P[1] + P[2] / 2 / Math.max(P[0], 0.05));
      ctx.lineTo(q.x, q.y);
    }
    ctx.closePath();
    ctx.fill();
  }

  function dots(ctx, view, list, col) {
    for (var t = 0; t < 3; t++) {
      ctx.fillStyle = col.tones[t];
      ctx.beginPath();
      for (var i = 0; i < list.length; i++) {
        var D = list[i];
        if (D[3] !== t) continue;
        var q = view.at(D[0], D[1]), rr = Math.max(0.4, view.px(D[2]));
        ctx.moveTo(q.x + rr, q.y);
        ctx.arc(q.x, q.y, rr, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }

  function pool(ctx, view, P, col) {
    ctx.save();
    ctx.beginPath();
    CC.RuptureDraw.path(ctx, view, P.poly, 0);
    ctx.clip();
    var p = P.pts, k, q;
    ctx.beginPath();
    for (k = 0; k < p.length; k++) {
      q = view.at(p[k][1], p[k][0]);
      if (k === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
    }
    for (k = p.length - 1; k >= 0; k--) {
      q = view.at(P.base, p[k][0]);
      ctx.lineTo(q.x, q.y);
    }
    ctx.closePath();
    ctx.fillStyle = col.base;
    ctx.fill();
    ctx.stroke();
    dots(ctx, view, P.dots || [], col);
    ctx.restore();
  }

  function draw(ctx, view, growth, phase, elementOpacity) {
    if (!growth) return;
    var alpha = clamp(elementOpacity === undefined ? 1 : elementOpacity, 0, 1);
    var col = colours(growth.hue, alpha);
    ctx.save();
    ctx.strokeStyle = col.edge;
    ctx.lineWidth = Math.max(0.5, view.px(0.0007));
    ctx.lineJoin = "round";
    var i;
    if (phase === "wounds") {
      for (i = 0; i < growth.pools.length; i++) pool(ctx, view, growth.pools[i], col);
    } else {
      ctx.fillStyle = col.vine;
      for (i = 0; i < growth.tendrils.length; i++) tendril(ctx, view, growth.tendrils[i]);
      for (i = 0; i < growth.mats.length; i++) mat(ctx, view, growth.mats[i], col);
      dots(ctx, view, growth.dots, col);
    }
    ctx.restore();
  }

  return { draw: draw };
})();
