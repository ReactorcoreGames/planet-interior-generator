/* Materials — drawing the `texture` element (gen/materials.js).
 *
 *   the tile     draw/rocktexture.js's grain and mottle, monochrome and
 *                signed, laid across the whole band, so it modulates the
 *                layer's colour instead of tinting it
 *   streaks      brushed arcs, white and black at low alpha, the same
 *                monochrome rule: plate catching and losing the light
 *   pits         pour pits, black at low alpha, the monochrome rule again
 *   traces       circuit traces and their vias, in the element's tone
 *   pipes        pipe runs in the element's tone, with a dark casing, a lit
 *                crown and flanges at an even pitch
 *
 * The caller has already clipped to the layer's band (draw/details.js
 * drawLayer, and draw/shells.js for a hollow layer), so nothing here spills
 * into a void. Pixels enter only through `view`.
 *
 * draw/primitives.js and draw/rocktexture.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;
  /* Segments per radian when an arc is walked through view.at. */
  var STEP = 90 / TAU;

  function walkArc(ctx, view, r, a0, a1) {
    var n = Math.max(1, Math.ceil(Math.abs(a1 - a0) * STEP));
    for (var i = 0; i <= n; i++) {
      var p = view.at(r, a0 + (a1 - a0) * (i / n));
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
  }

  function drawStreaks(ctx, view, el) {
    /* Heavy plate is scored harder than a polished hull. */
    var a = el.alpha * ({ industrial: 2.0, plant: 1.6, sleek: 0.7 }[el.material] || 1);
    for (var pass = 0; pass < 4; pass++) {
      var lit = pass < 2, wide = pass % 2 === 1;
      ctx.strokeStyle = lit ? "rgba(255,255,255," + (0.10 * a) + ")"
                            : "rgba(0,0,0," + (0.14 * a) + ")";
      ctx.lineWidth = view.lw(wide ? 0.9 : 0.4);
      ctx.beginPath();
      for (var i = 0; i < el.streaks.length; i++) {
        var s = el.streaks[i];
        if (s.lit !== lit || (s.w > 1) !== wide) continue;
        walkArc(ctx, view, s.r, s.a, s.a + s.span);
      }
      ctx.stroke();
    }
  }

  function drawPits(ctx, view, el) {
    ctx.fillStyle = "rgba(0,0,0," + (0.30 * el.alpha) + ")";
    ctx.beginPath();
    for (var i = 0; i < el.pits.length; i++) {
      var p = el.pits[i];
      var c = view.at(p.r, p.a);
      var rr = Math.max(0.45, view.px(p.s) / 2);
      ctx.moveTo(c.x + rr, c.y);
      ctx.arc(c.x, c.y, rr, 0, TAU);
    }
    ctx.fill();
  }

  function drawTraces(ctx, view, el, style) {
    ctx.strokeStyle = style;
    ctx.lineWidth = view.lw(0.7);
    ctx.lineJoin = "miter";
    ctx.beginPath();
    var i, t, k;
    for (i = 0; i < el.traces.length; i++) {
      t = el.traces[i];
      for (k = 1; k < t.pts.length; k++) {
        var p0 = t.pts[k - 1], p1 = t.pts[k];
        if (p0[0] === p1[0]) {
          walkArc(ctx, view, p0[0], p0[1], p1[1]);
        } else {
          /* The jog between tracks: straight, which on the board is 45°. */
          var q0 = view.at(p0[0], p0[1]), q1 = view.at(p1[0], p1[1]);
          ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y);
        }
      }
    }
    ctx.stroke();

    /* Vias at the ends — a ring with a dark drill hole — and square pads. */
    var rv = Math.max(0.9, view.px(0.0024));
    ctx.fillStyle = style;
    ctx.beginPath();
    var holes = [];
    for (i = 0; i < el.traces.length; i++) {
      t = el.traces[i];
      var ends = [t.pts[0], t.pts[t.pts.length - 1]];
      for (k = 0; k < 2; k++) {
        var c = view.at(ends[k][0], ends[k][1]);
        if (k === 1 && t.pad) {
          ctx.rect(c.x - rv * 1.2, c.y - rv * 1.2, rv * 2.4, rv * 2.4);
        } else if (k === 1 || t.via) {
          ctx.moveTo(c.x + rv, c.y);
          ctx.arc(c.x, c.y, rv, 0, TAU);
          holes.push(c);
        }
      }
    }
    ctx.fill();
    if (rv >= 1.6) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath();
      for (i = 0; i < holes.length; i++) {
        ctx.moveTo(holes[i].x + rv * 0.42, holes[i].y);
        ctx.arc(holes[i].x, holes[i].y, rv * 0.42, 0, TAU);
      }
      ctx.fill();
    }
  }

  function pipePath(ctx, view, p) {
    var s0 = view.at(p.pts[0][0], p.pts[0][1]);
    ctx.moveTo(s0.x, s0.y);
    for (var k = 1; k < p.pts.length; k++) {
      var p0 = p.pts[k - 1], p1 = p.pts[k];
      var n = p0[0] === p1[0] ? Math.max(1, Math.ceil(Math.abs(p1[1] - p0[1]) * STEP)) : 1;
      for (var i = 1; i <= n; i++) {
        var q = view.at(p0[0] + (p1[0] - p0[0]) * (i / n),
                        p0[1] + (p1[1] - p0[1]) * (i / n));
        ctx.lineTo(q.x, q.y);
      }
    }
  }

  /* Three passes — casing, body, crown — so a bundle reads as round pipe
   * rather than as ruled lines; then the flanges. */
  function drawPipes(ctx, view, el, style) {
    ctx.lineJoin = "round";
    ctx.lineCap = "butt";
    var passes = [["rgba(0,0,0," + (0.55 * el.alpha) + ")", 1.0],
                  [style, 0.74],
                  ["rgba(255,255,255," + (0.30 * el.alpha) + ")", 0.18]];
    for (var p = 0; p < passes.length; p++) {
      ctx.strokeStyle = passes[p][0];
      /* The body only half way to its tone: pipework is the band's own
       * metal, a step lighter, not a white line drawn over it. */
      ctx.globalAlpha = p === 1 ? 0.5 : 1;
      for (var i = 0; i < el.pipes.length; i++) {
        var w = view.px(el.pipes[i].w);
        if (w < 1.2 && p !== 1) continue;
        ctx.lineWidth = Math.max(0.6, w * passes[p][1]);
        ctx.beginPath();
        pipePath(ctx, view, el.pipes[i]);
        ctx.stroke();
      }
    }
    /* Flanges across each radial leg at an even pitch of body radius. */
    var PITCH = 0.032;
    ctx.strokeStyle = "rgba(0,0,0," + (0.5 * el.alpha) + ")";
    for (var j = 0; j < el.pipes.length; j++) {
      var pj = el.pipes[j];
      var wf = view.px(pj.w) * 0.58;
      if (wf < 1.2) continue;
      ctx.lineWidth = Math.max(0.5, wf * 0.4);
      ctx.beginPath();
      for (var k = 1; k < pj.pts.length; k++) {
        var a0 = pj.pts[k - 1], a1 = pj.pts[k];
        if (a0[1] !== a1[1]) continue;
        var lo = Math.min(a0[0], a1[0]), hi = Math.max(a0[0], a1[0]);
        for (var r = Math.ceil(lo / PITCH) * PITCH; r < hi; r += PITCH) {
          var c = view.at(r, a0[1]), o = view.at(r + 0.001, a0[1]);
          var dx = o.x - c.x, dy = o.y - c.y, dl = Math.sqrt(dx * dx + dy * dy) || 1;
          var nx = -dy / dl * wf, ny = dx / dl * wf;
          ctx.moveTo(c.x - nx, c.y - ny); ctx.lineTo(c.x + nx, c.y + ny);
        }
      }
      ctx.stroke();
    }
  }

  function texture(ctx, view, el, style) {
    ctx.save();
    var tex = CC.RockTexture ? CC.RockTexture.build(ctx) : null;
    if (tex && el.tile && el.coarse) {
      /* COARSE: grain and one large mottle together, at the scale the rock
       * fragments use. Its blotches are big enough that the tile's repeat
       * falls outside a band's width, so no second copy is needed. */
      CC.RockTexture.lay(ctx, tex, { x: view.cx, y: view.cy, r: view.px(el.outer) },
                         el.seed, view.scale * 0.55,
                         el.tile[0] * el.alpha, el.tile[1] * el.alpha);
    } else if (tex && el.tile) {
      /* The grain once, and the mottle TWICE at scales that do not divide
       * each other: one tile across a whole band shows its repeat as a
       * lattice, and two out-of-step copies hide it. */
      var box = { x: view.cx, y: view.cy, r: view.px(el.outer) };
      CC.RockTexture.lay(ctx, tex, box, el.seed, view.scale * 0.3,
                         el.tile[0] * el.alpha, 0);
      CC.RockTexture.lay(ctx, tex, box, el.seed + 0.37, view.scale * 0.29,
                         0, el.tile[1] * el.alpha * 0.6);
      CC.RockTexture.lay(ctx, tex, box, el.seed + 0.71, view.scale * 0.47,
                         0, el.tile[1] * el.alpha * 0.6);
    }
    if (el.streaks) drawStreaks(ctx, view, el);
    if (el.pits) drawPits(ctx, view, el);
    if (el.pipes) drawPipes(ctx, view, el, style);
    if (el.traces) drawTraces(ctx, view, el, style);
    ctx.restore();
  }

  CC.Primitives.register({ "texture": texture });
})();
