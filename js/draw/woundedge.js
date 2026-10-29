/* Wound edge — drawing the marks along a rupture's cut faces
 * (js/gen/woundedge.js builds them, js/gen/rupture.js cuts the wound).
 *
 * After the cut is lifted (draw/scene.js, after CC.RuptureDraw.end), because
 * every mark here stands in the wound or on its lip: a peeled plate leans
 * into the gap, a stub juts into it. From the back forward:
 *
 *   rim      a dark scorched band along every edge and the floor (or, on a
 *            clean edge, a trimmed seam), clipped
 *            OUTSIDE the wound and to the body's material, so it scorches
 *            the metal and never paints over a void or space
 *   debris   the field drifting out of the wound (draw/wounddebris.js)
 *   scaffold construction work on a clean edge (draw/woundscaffold.js)
 *   stubs    snapped pillars, the pillars' own truss with a broken tip
 *   pipes    severed pipe ends and cut conduit runs
 *   plates   peeled plating
 *   sparks   sparks, fire and embers by Operational status, over the rest
 *
 * Draws whatever marks it finds, whatever style built them, so a new edge
 * style needs no case here. Colour comes from the layer each mark belongs
 * to; nothing knows which archetype it is drawing. Lengths are body radius
 * and enter pixels only through `view`.
 *
 * draw/shells.js, draw/rupture.js, draw/details.js and draw/wounddebris.js
 * must load first. */

var CC = CC || {};

CC.WoundEdgeDraw = (function () {
  "use strict";

  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* HOW THE OUTLINE IS STROKED, named by the edge style (`rupture.rim`,
   * gen/woundedge.js): [width in body radius, h, s, v, alpha], widest first.
   * Scorch: wide and faint to narrow and dark. Trim: a clean cut, a dark
   * seam with a lit bevel inside it. */
  var RIMS = {
    scorch: [[0.034, 18, 0.55, 0.04, 0.20], [0.020, 18, 0.55, 0.04, 0.32],
             [0.010, 18, 0.55, 0.04, 0.50], [0.004, 18, 0.55, 0.04, 0.70]],
    trim: [[0.007, 0, 0, 0.03, 0.55], [0.0026, 40, 0.06, 0.92, 0.55]]
  };

  /* Pixel frame at (r, a): out (radial), and `into`, along the arc toward
   * the wound's middle from an edge on `side`. */
  function frame(view, r, a, side) {
    var p = view.at(r, a);
    var ox = Math.sin(a), oy = -Math.cos(a);
    var tx = Math.cos(a), ty = Math.sin(a);
    return { x: p.x, y: p.y, ox: ox, oy: oy, ix: -side * tx, iy: -side * ty };
  }

  function material(ctx, view, body) {
    /* The body's surface, less every void, under the even-odd rule. */
    var surface = 1;
    for (var i = 0; i < body.layers.length; i++) {
      if (!body.layers[i].outward) { surface = body.layers[i].outer; break; }
    }
    ctx.beginPath();
    ctx.arc(view.cx, view.cy, view.px(surface), 0, TAU);
    for (i = 0; i < body.layers.length; i++) {
      var g = body.layers[i].gap;
      if (!g) continue;
      ctx.moveTo(view.cx + view.px(g.outer), view.cy);
      ctx.arc(view.cx, view.cy, view.px(g.outer), 0, TAU);
      ctx.moveTo(view.cx + view.px(g.inner), view.cy);
      ctx.arc(view.cx, view.cy, view.px(g.inner), 0, TAU);
    }
    ctx.clip("evenodd");
  }

  function rim(ctx, view, body, rupture, alpha) {
    ctx.save();
    var pushed = CC.RuptureDraw.begin(ctx, view, rupture);
    material(ctx, view, body);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    var RIM = RIMS[rupture.rim] || RIMS.scorch;
    for (var k = 0; k < RIM.length; k++) {
      var R = RIM[k];
      ctx.strokeStyle = CC.Color.hsva(R[1], R[2], R[3], clamp(R[4] * alpha, 0, 1));
      ctx.lineWidth = Math.max(0.6, view.px(R[0]));
      ctx.beginPath();
      for (var i = 0; i < rupture.wounds.length; i++) {
        CC.RuptureDraw.path(ctx, view, rupture.wounds[i].poly, 0);
      }
      ctx.stroke();
    }
    CC.RuptureDraw.end(ctx, pushed);
    ctx.restore();
  }

  /* A layer's metal for a torn plate or a pipe: its own colour, lifted on
   * the face that catches the light and sunk on the underside. */
  function plateStyle(c, alpha) {
    return {
      face: CC.Color.hsva(c.h, c.s * 0.8, clamp(c.v * 1.05 + 0.06, 0, 1), alpha),
      under: CC.Color.hsva(c.h, c.s, c.v * 0.32, alpha),
      mid: CC.Color.hsva(c.h, c.s * 0.9, clamp(c.v * 0.85 + 0.05, 0, 1), alpha),
      lip: CC.Color.hsva(c.h, c.s * 0.4, clamp(c.v * 1.3 + 0.30, 0, 1), alpha * 0.9),
      edge: CC.Color.hsva(c.h, c.s, 0.05, alpha * 0.9)
    };
  }

  function plate(ctx, view, P, st) {
    var F = frame(view, P.r, P.a, P.side);
    var len = view.px(P.len), wid = view.px(P.wid);
    if (len < 0.8) return;
    /* Leaving the face into the gap, bent `bend` toward outward, the outer
     * part curled further by `curl`. */
    function dir(t) {
      return { x: F.ix * Math.cos(t) + F.ox * Math.sin(t),
               y: F.iy * Math.cos(t) + F.oy * Math.sin(t) };
    }
    var d1 = dir(P.bend), d2 = dir(P.bend + P.curl);
    var M = { x: F.x + d1.x * len * 0.55, y: F.y + d1.y * len * 0.55 };
    var T = { x: M.x + d2.x * len * 0.45, y: M.y + d2.y * len * 0.45 };
    var hw0 = wid / 2, hw1 = wid * 0.38, hw2 = wid * (0.10 + 0.15 * P.seed);
    /* The root spans the face (radial); further out the strip's width lies
     * across its own direction. */
    var n1 = { x: -d1.y, y: d1.x }, n2 = { x: -d2.y, y: d2.x };
    if (n1.x * F.ox + n1.y * F.oy < 0) { n1.x = -n1.x; n1.y = -n1.y; }
    if (n2.x * F.ox + n2.y * F.oy < 0) { n2.x = -n2.x; n2.y = -n2.y; }
    var jag = (P.seed - 0.5) * wid * 0.5;
    var pts = [
      { x: F.x + F.ox * hw0, y: F.y + F.oy * hw0 },
      { x: M.x + n1.x * hw1, y: M.y + n1.y * hw1 },
      { x: T.x + n2.x * hw2 + d2.x * jag, y: T.y + n2.y * hw2 + d2.y * jag },
      { x: T.x - n2.x * hw2 - d2.x * jag * 0.5, y: T.y - n2.y * hw2 - d2.y * jag * 0.5 },
      { x: M.x - n1.x * hw1, y: M.y - n1.y * hw1 },
      { x: F.x - F.ox * hw0, y: F.y - F.oy * hw0 }
    ];
    /* Two tones split at the fold: the stretch off the face shows its
     * underside, the curled end the face catching the light, so the bend
     * reads at a glance. Curled back the other way, the other way round. */
    var flip = P.curl < 0;
    ctx.fillStyle = flip ? st.face : st.under;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[4].x, pts[4].y); ctx.lineTo(pts[5].x, pts[5].y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = flip ? st.under : st.face;
    ctx.beginPath();
    ctx.moveTo(pts[1].x, pts[1].y);
    for (var i = 2; i < 5; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
    if (wid < 1.5) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.strokeStyle = st.edge;
    ctx.lineWidth = Math.max(0.5, wid * 0.10);
    ctx.stroke();
    /* The lit lip along the outer-facing side. */
    ctx.strokeStyle = st.lip;
    ctx.lineWidth = Math.max(0.5, wid * 0.08);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.stroke();
  }

  /* A snapped pillar: the pillars' own truss, then a broken tip, the last
   * stretch bent off line by `lean`. */
  function stub(ctx, view, S, st, pst) {
    CC.Primitives.truss(ctx, view, S, pst);
    /* A clean post is whole: the next level's pillar, not a broken one. */
    if (S.clean) return;
    var A = view.at(S.r0, S.angle), B = view.at(S.r1, S.angle);
    var dx = B.x - A.x, dy = B.y - A.y, l = Math.sqrt(dx * dx + dy * dy);
    if (l < 1) return;
    var ux = dx / l, uy = dy / l;
    var nx = -uy * S.side, ny = ux * S.side;
    var w = Math.max(0.8, view.px(S.width));
    /* Bent wire off the tip. */
    var bl = Math.max(1.5, l * 0.35);
    var ex = B.x + (ux * Math.cos(S.lean) + nx * Math.sin(S.lean)) * bl;
    var ey = B.y + (uy * Math.cos(S.lean) + ny * Math.sin(S.lean)) * bl;
    ctx.strokeStyle = pst.hull;
    ctx.lineWidth = Math.max(0.5, w * 0.35);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(B.x, B.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    if (w < 2) return;
    /* The break: a ragged dark cap across the strut. */
    var px = -uy * w / 2, py = ux * w / 2;
    ctx.fillStyle = st.edge;
    ctx.beginPath();
    ctx.moveTo(B.x + px, B.y + py);
    for (var k = 1; k < 4; k++) {
      var t = 1 - k / 2, s = (k % 2 ? 0.45 : -0.15) * w;
      ctx.lineTo(B.x + px * t + ux * s, B.y + py * t + uy * s);
    }
    ctx.lineTo(B.x - px, B.y - py);
    ctx.lineTo(B.x - px - ux * w * 0.3, B.y - py - uy * w * 0.3);
    ctx.lineTo(B.x + px - ux * w * 0.3, B.y + py - uy * w * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  /* One severed tube from (x, y) along (dx, dy): casing, metal, and the
   * dark open bore at its end. */
  function tube(ctx, x, y, dx, dy, len, w, hs, st) {
    var ex = x + dx * len, ey = y + dy * len;
    var passes = [[hs.trim, 1.0], [hs.hull, 0.66], [hs.lit, 0.22]];
    for (var p = 0; p < passes.length; p++) {
      ctx.strokeStyle = passes[p][0];
      ctx.lineWidth = Math.max(0.5, w * passes[p][1]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    if (w < 1.6) return;
    ctx.fillStyle = st.edge;
    ctx.beginPath();
    ctx.ellipse(ex, ey, w * 0.42, w * 0.22, Math.atan2(dy, dx), 0, TAU);
    ctx.fill();
  }

  function pipe(ctx, view, P, st, hs) {
    var F = frame(view, P.r, P.a, P.side);
    var w = view.px(P.w), len = view.px(P.len);
    if (len < 1) return;
    var d = { x: F.ix * Math.cos(P.droop) + F.ox * Math.sin(P.droop),
              y: F.iy * Math.cos(P.droop) + F.oy * Math.sin(P.droop) };
    ctx.lineCap = "butt";
    for (var k = 0; k < P.n; k++) {
      var off = (k - (P.n - 1) / 2) * w * 1.3;
      var l = len * (1 - 0.3 * ((P.seed * 7 + k * 0.37) % 1));
      tube(ctx, F.x + F.ox * off, F.y + F.oy * off, d.x, d.y, l, w, hs, st);
    }
  }

  /* A conduit run cut by the wound: each pipe of the bundle runs on a
   * ragged way past the cut, splayed, and ends in an open bore. */
  function runEnd(ctx, view, E, st, hs) {
    var A = view.at(E.r, E.angle);
    var ox = Math.sin(E.angle), oy = -Math.cos(E.angle);
    var tx = Math.cos(E.angle), ty = Math.sin(E.angle);
    var w = view.px(E.w), pitch = w * 1.25;
    for (var k = 0; k < E.n; k++) {
      var off = (k - (E.n - 1) / 2) * pitch;
      var u = (E.seed * 13.7 + k * 0.61) % 1;
      var splay = (k - (E.n - 1) / 2) * 0.25 + (u - 0.5) * 0.3;
      var len = view.px(0.004 + 0.010 * u);
      tube(ctx, A.x + tx * off - ox * w, A.y + ty * off - oy * w,
           ox * Math.cos(splay) + tx * Math.sin(splay),
           oy * Math.cos(splay) + ty * Math.sin(splay), len + w, w, hs, st);
    }
  }

  function draw(ctx, view, body, rupture, palette, elementOpacity) {
    if (!rupture || !rupture.wounds || !rupture.wounds.length) return;
    var alpha = elementOpacity === undefined ? 1 : elementOpacity;
    rim(ctx, view, body, rupture, alpha);
    var styles = {}, hulls = {};
    function st(role) {
      return styles[role] || (styles[role] = plateStyle(palette.get(role), clamp(alpha, 0, 1)));
    }
    function hs(role) {
      return hulls[role] || (hulls[role] =
        CC.DrawDetails.hullFill(palette.get(role), { seed: 0.3 }, clamp(alpha, 0, 1)));
    }
    var pst = {};
    function ps(role) {
      return pst[role] || (pst[role] = CC.ShellDraw.pillarStyle(palette.get(role), clamp(alpha, 0, 1)));
    }
    ctx.save();
    for (var i = 0; i < rupture.wounds.length; i++) {
      var m = rupture.wounds[i].marks;
      if (!m) continue;
      var k;
      /* The field drifting out of the wound, under the faces' own marks
       * (draw/wounddebris.js). */
      if (m.debris) CC.WoundDebrisDraw.draw(ctx, view, m.debris, st, clamp(alpha, 0, 1));
      /* Construction work, on a clean edge (draw/woundscaffold.js). */
      if (m.frame || m.scaffold) {
        CC.WoundScaffoldDraw.draw(ctx, view, m.frame, m.scaffold, palette, alpha);
      }
      if (m.stubs) for (k = 0; k < m.stubs.length; k++) {
        var S = m.stubs[k];
        stub(ctx, view, S, st(S.role), ps(S.role));
      }
      if (m.ends) for (k = 0; k < m.ends.length; k++) {
        runEnd(ctx, view, m.ends[k], st(m.ends[k].role), hs(m.ends[k].role));
      }
      if (m.pipes) for (k = 0; k < m.pipes.length; k++) {
        pipe(ctx, view, m.pipes[k], st(m.pipes[k].role), hs(m.pipes[k].role));
      }
      if (m.plates) for (k = 0; k < m.plates.length; k++) {
        plate(ctx, view, m.plates[k], st(m.plates[k].role));
      }
      /* Sparks, fire and embers, in the body's warning colour
       * (draw/wounddebris.js). */
      if (m.sparks && m.sparks.length) {
        var warn = CC.ShellWallDraw.lightHsv(palette, palette.get(rupture.wounds[i].cuts[0].role))[2];
        CC.WoundDebrisDraw.sparks(ctx, view, m.sparks, warn, clamp(alpha, 0, 1));
      }
    }
    ctx.restore();
  }

  return { draw: draw };
})();
