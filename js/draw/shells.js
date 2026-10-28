/* Drawing hollow layers — a band with a true void beneath it, optionally cut
 * through by access shafts — and the pillars spanning those voids.
 *
 * The geometry is decided in js/gen/shells.js; this file receives radii and
 * bearings and knows nothing about what kind of body it is drawing. A layer
 * is hollow when it carries `gap`, and slotted when it carries `slots`.
 *
 * WHY A RING AND NOT A DISC. Every other layer is filled as a disc to the
 * centre and the next layer in paints over its middle (draw/layers.js
 * `fillLayer`). A void cannot be painted over by anything — the background
 * has to show through it, or the pillars have nothing to stand against — so a
 * hollow layer is filled as exactly its own band and nothing else. */

var CC = CC || {};

CC.ShellDraw = (function () {
  "use strict";

  var TAU = Math.PI * 2;
  /* Segments per radian when an edge is walked rather than arc()ed. */
  var STEP = 240 / TAU;

  function isShell(layer) { return !!(layer && (layer.gap || layer.slots)); }

  /* Walk one edge from a0 to a1 (radians, either direction), continuing the
   * current subpath. */
  function walk(ctx, view, radius, wob, a0, a1, first) {
    var n = Math.max(2, Math.ceil(Math.abs(a1 - a0) * STEP));
    for (var i = 0; i <= n; i++) {
      var a = a0 + (a1 - a0) * (i / n);
      var p = view.at(radius * (wob ? wob(a) : 1), a);
      if (first && i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
  }

  /* Trace the layer's band as a path: the ring between its outer edge and
   * its (raised) inner edge, minus the shaft slots. Returns the fill rule the
   * path needs. `wob` is the outer edge's boundary function, if any; the
   * inner edge of a hollow layer is its own and always round. */
  function trace(ctx, view, layer, wob) {
    var ro = layer.outer, ri = Math.max(0, layer.inner);
    var slots = layer.slots;
    if (!slots || !slots.length) {
      walk(ctx, view, ro, wob, 0, TAU, true);
      ctx.closePath();
      if (ri > 0) { walk(ctx, view, ri, null, TAU, 0, true); ctx.closePath(); }
      return "evenodd";
    }
    /* One closed sector per solid stretch between consecutive slots. */
    var s = slots.slice().sort(function (a, b) { return a.from - b.from; });
    for (var k = 0; k < s.length; k++) {
      var a0 = s[k].to;
      var a1 = s[(k + 1) % s.length].from + (k + 1 === s.length ? TAU : 0);
      if (a1 <= a0) continue;
      walk(ctx, view, ro, wob, a0, a1, true);
      walk(ctx, view, ri, null, a1, a0, false);
      ctx.closePath();
    }
    return "nonzero";
  }

  function fill(ctx, view, layer, style, wob) {
    ctx.save();
    ctx.beginPath();
    var rule = trace(ctx, view, layer, wob);
    ctx.globalAlpha = layer.opacity;
    ctx.fillStyle = style;
    ctx.fill(rule);
    ctx.restore();
  }

  function clip(ctx, view, layer, wob) {
    ctx.beginPath();
    ctx.clip(trace(ctx, view, layer, wob));
  }

  /* The whole outline — outer edge, slot walls and underside — because each
   * is an edge of built material, and the underside is what tells the eye
   * the band is floating. */
  function stroke(ctx, view, layer, style, width, wob) {
    ctx.save();
    ctx.beginPath();
    trace(ctx, view, layer, wob);
    ctx.strokeStyle = style;
    ctx.lineWidth = view.lw(width === undefined ? 1 : width);
    ctx.lineJoin = "miter";
    ctx.stroke();
    ctx.restore();
  }

  /* THE PILLARS. Coloured from the shell they hold up, a step brighter than
   * its band so they read against the dark of the void, with a shadowed
   * flank and a near-black trim like every other built thing. */
  function pillarStyle(colour, alpha) {
    var C = CC.Color;
    var v = Math.min(1, colour.v * 1.10 + 0.10);
    return {
      hull: C.hsva(colour.h, Math.min(1, colour.s * 0.9), v, alpha),
      lit: C.hsva(colour.h, colour.s * 0.5, Math.min(1, v + 0.25), alpha),
      shade: C.hsva(colour.h, Math.min(1, colour.s * 1.2), v * 0.45, alpha),
      trim: C.hsva(colour.h, Math.min(1, colour.s * 1.2), v * 0.22, alpha)
    };
  }

  function drawPillars(ctx, view, pillars, palette, elementOpacity) {
    if (!pillars || !pillars.length) return;
    var alpha = elementOpacity === undefined ? 1 : elementOpacity;
    var styles = {};
    for (var i = 0; i < pillars.length; i++) {
      var p = pillars[i];
      var st = styles[p.role] ||
        (styles[p.role] = pillarStyle(palette.get(p.role), alpha));
      CC.Primitives.truss(ctx, view, p, st);
    }
  }

  return { isShell: isShell, trace: trace, fill: fill, clip: clip,
           stroke: stroke, drawPillars: drawPillars, pillarStyle: pillarStyle };
})();
