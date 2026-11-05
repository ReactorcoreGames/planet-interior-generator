/* Built orbital structures — drawing gen/orbitalbuilt.js's elements.
 *
 *   orbital-ring   the elevators first, so the ring crosses their tops: two
 *                  cables from a foot on the ground to a counterweight past
 *                  the ring, climbers on them; then the truss band, a dim
 *                  web between two lit rails braced with alternating
 *                  diagonals, running lights on the outer rail; then small
 *                  pods on either face; then the modules straddling it, lit windows in rows, a docking
 *                  collar under each hub where its elevator arrives
 *
 *   defence-network  the satellites, then the gun platforms over them: each
 *                  platform two "4"s merged at the middle through 180°,
 *                  plated triangles, barrels with accelerator bands, a red
 *                  light at each muzzle; each satellite a box between two
 *                  cyan panels
 *
 * Metal is hullFill's (draw/details-gas.js): a manufactured object keeps its own
 * grey whatever the world below is. Lights are warm white. Every part is
 * drawn at every size — no collapse below a pixel threshold — so the call
 * count is the same at every zoom and resolution; only line widths floor.
 *
 * Drawn whole in both of draw/zonepaint.js's halves; its clip at the body's
 * centre line is what puts the far side of the ring behind the planet.
 * Pixels enter only through `view`.
 *
 * draw/primitives.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;

  /* A local frame at (r, a): x along the orbit, y outward, in body radii. */
  function frame(view, r, a) {
    var p = view.at(r, a);
    var q = view.at(r + 0.01, a);
    var dx = q.x - p.x, dy = q.y - p.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len, s = view.px(1);
    return function (x, y) {
      return { x: p.x + (-uy * x + ux * y) * s, y: p.y + (ux * x + uy * y) * s };
    };
  }

  function quad(ctx, F, x0, y0, x1, y1) {
    var a = F(x0, y0), b = F(x1, y0), c = F(x1, y1), d = F(x0, y1);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
    ctx.closePath();
  }

  function circle(ctx, view, r, n, reverse) {
    for (var i = 0; i <= n; i++) {
      var t = (reverse ? n - i : i) / n;
      var p = view.at(r, t * TAU);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
  }

  function light(a) { return "rgba(255,228,176," + a + ")"; }

  /* ---- the elevators ----------------------------------------------------- */

  function lift(ctx, view, el, L, st, S) {
    var top = el.radius + L.cw;
    var gap = 0.0042;
    var A = frame(view, L.foot, L.a), B = frame(view, top, L.a);
    /* Two cables, or one where they would merge. */
    ctx.strokeStyle = st.lit;
    ctx.lineWidth = Math.max(0.7, S * 0.0022);
    ctx.beginPath();
    var sides = [-gap, gap];
    for (var k = 0; k < sides.length; k++) {
      var p = A(sides[k], 0), q = B(sides[k], 0);
      ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();

    /* The foot: a squat anchor station on the ground. */
    var F = frame(view, L.foot, L.a);
    ctx.fillStyle = st.hull;
    ctx.beginPath();
    var b0 = F(-0.026, 0), b1 = F(0.026, 0), t1 = F(0.009, 0.032), t0 = F(-0.009, 0.032);
    ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.lineTo(t1.x, t1.y); ctx.lineTo(t0.x, t0.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = st.trim;
    ctx.lineWidth = Math.max(0.5, S * 0.0012);
    ctx.stroke();

    /* The counterweight past the ring. */
    var C = frame(view, top, L.a);
    ctx.fillStyle = st.shade;
    ctx.beginPath(); quad(ctx, C, -0.012, -0.005, 0.012, 0.011); ctx.fill();
    ctx.strokeStyle = st.lit; ctx.stroke();

    /* Climbers: a car astride the cables, lit at one end. */
    for (var c = 0; c < L.cars.length; c++) {
      var r = lerp(L.foot + 0.03, el.radius - el.band * 1.6, L.cars[c]);
      var K = frame(view, r, L.a);
      ctx.fillStyle = st.lit;
      ctx.beginPath(); quad(ctx, K, -0.0075, -0.009, 0.0075, 0.009); ctx.fill();
      ctx.strokeStyle = st.trim; ctx.stroke();
      var d = K(0, 0.009);
      ctx.fillStyle = light(0.95);
      ctx.beginPath(); ctx.arc(d.x, d.y, Math.max(0.6, S * 0.0022), 0, TAU); ctx.fill();
    }
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ---- the ring ---------------------------------------------------------- */

  function band(ctx, view, el, st, S) {
    var r = el.radius, hw = el.band / 2;
    /* Segments by body-space length, never by pixels: the same calls at
     * every zoom and resolution (D72's rule, held by the DOM test). */
    var n = Math.round(r * 360);
    var w = S * el.band;
    /* The web. */
    ctx.fillStyle = st.shade;
    ctx.beginPath();
    circle(ctx, view, r + hw, n);
    circle(ctx, view, r - hw, n, true);
    ctx.fill("evenodd");

    /* Bracing, a bay about as long as the truss is wide. */
    var bays = Math.round(r * TAU / (el.band * 1.3));
    if (bays % 2) bays++;
    ctx.strokeStyle = st.hull;
    ctx.lineWidth = Math.max(0.5, w * 0.10);
    ctx.beginPath();
    for (var k = 0; k < bays; k++) {
      var a0 = el.phase + k * TAU / bays, a1 = el.phase + (k + 1) * TAU / bays;
      var p = view.at(k % 2 ? r + hw : r - hw, a0), q = view.at(k % 2 ? r - hw : r + hw, a1);
      ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();

    /* The rails, dark-edged so the ring is hard against the sky. */
    ctx.strokeStyle = st.trim;
    ctx.lineWidth = Math.max(0.8, w * 0.34);
    ctx.beginPath(); circle(ctx, view, r + hw, n); circle(ctx, view, r - hw, n); ctx.stroke();
    ctx.strokeStyle = st.lit;
    ctx.lineWidth = Math.max(0.6, w * 0.18);
    ctx.beginPath(); circle(ctx, view, r + hw, n); circle(ctx, view, r - hw, n); ctx.stroke();

    /* Running lights on the outer rail, faint, at an even pitch. */
    var dots = Math.round(r * TAU / 0.022);
    ctx.fillStyle = light(0.55);
    ctx.beginPath();
    for (k = 0; k < dots; k++) {
      var d = view.at(r + hw, el.phase + (k + 0.5) * TAU / dots);
      ctx.moveTo(d.x, d.y);
      ctx.arc(d.x, d.y, Math.max(0.45, w * 0.10), 0, TAU);
    }
    ctx.fill();
  }

  /* ---- the pods and the modules ----------------------------------------- */

  function pod(ctx, view, el, P, st, S) {
    var F = frame(view, el.radius, P.a);
    var y0 = P.side * el.band / 2, y1 = y0 + P.side * P.h;
    ctx.fillStyle = st.hull;
    ctx.beginPath(); quad(ctx, F, -P.len / 2, y0, P.len / 2, y1); ctx.fill();
    ctx.strokeStyle = st.trim; ctx.lineWidth = Math.max(0.5, S * 0.0010); ctx.stroke();
    if (P.lit) {
      var d = F(0, (y0 + y1) / 2);
      ctx.fillStyle = light(0.85);
      ctx.beginPath(); ctx.arc(d.x, d.y, Math.max(0.5, S * 0.0012), 0, TAU); ctx.fill();
    }
  }

  function module(ctx, view, el, M, st, S) {
    var F = frame(view, el.radius, M.a);
    var hl = M.len / 2, hh = el.band * M.h / 2;
    if (M.hub) {
      /* The docking collar, under the hub where the elevator arrives. */
      ctx.fillStyle = st.shade;
      ctx.beginPath(); quad(ctx, F, -hl * 0.32, -hh * 1.55, hl * 0.32, -hh); ctx.fill();
      ctx.strokeStyle = st.trim; ctx.lineWidth = Math.max(0.5, S * 0.0012); ctx.stroke();
    }
    ctx.fillStyle = st.hull;
    ctx.beginPath(); quad(ctx, F, -hl, -hh, hl, hh); ctx.fill();
    ctx.strokeStyle = st.trim; ctx.lineWidth = Math.max(0.6, S * 0.0016); ctx.stroke();
    /* A lit band on the outer face and a shaded one on the inner. */
    ctx.fillStyle = st.lit;
    ctx.beginPath(); quad(ctx, F, -hl, hh * 0.55, hl, hh); ctx.fill();
    ctx.fillStyle = st.shade;
    ctx.beginPath(); quad(ctx, F, -hl, -hh, hl, -hh * 0.6); ctx.fill();
    /* Section joins. */
    var secs = Math.max(2, Math.round(M.len / 0.016));
    ctx.strokeStyle = st.trim; ctx.lineWidth = Math.max(0.4, S * 0.0008);
    ctx.beginPath();
    for (var k = 1; k < secs; k++) {
      var x = -hl + M.len * k / secs, p = F(x, -hh), q = F(x, hh);
      ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
    /* Windows: one or two rows of lit dots, some dark. */
    var rows = 2;
    var cols = Math.max(3, Math.round(M.len / 0.0055));
    var dr = Math.max(0.45, S * 0.0011);
    ctx.fillStyle = light(0.9);
    ctx.beginPath();
    for (var row = 0; row < rows; row++) {
      var y = rows === 1 ? 0 : (row ? -hh * 0.18 : hh * 0.22);
      for (var c = 0; c < cols; c++) {
        var h = Math.sin((M.win * 97 + c * 12.9898 + row * 78.233) * 43758.5453);
        if (h - Math.floor(h) < 0.3) continue;
        var w = F(-hl + M.len * (c + 0.5) / cols, y);
        ctx.moveTo(w.x + dr, w.y);
        ctx.arc(w.x, w.y, dr, 0, TAU);
      }
    }
    ctx.fill();
  }

  function orbitalRing(ctx, view, el, st) {
    var S = view.px(1);
    ctx.save();
    ctx.lineJoin = "round";
    for (var i = 0; i < el.lifts.length; i++) lift(ctx, view, el, el.lifts[i], st, S);
    band(ctx, view, el, st, S);
    for (i = 0; i < el.pods.length; i++) pod(ctx, view, el, el.pods[i], st, S);
    for (i = 0; i < el.modules.length; i++) module(ctx, view, el, el.modules[i], st, S);
    ctx.restore();
  }

  /* ---- the defence network --------------------------------------------- */

  /* A frame at (r, a) turned by `turn`, in units of `k` body radii. */
  function turned(view, r, a, turn, k) {
    var F = frame(view, r, a), c = Math.cos(turn), s = Math.sin(turn);
    return function (x, y) { return F((x * c - y * s) * k, (x * s + y * c) * k); };
  }

  function poly(ctx, F, pts) {
    for (var i = 0; i < pts.length; i++) {
      var q = F(pts[i][0], pts[i][1]);
      if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
    }
    ctx.closePath();
  }

  /* A bar from (x0, y0) to (x1, y1), `w` across, in the frame's units. */
  function bar(ctx, F, x0, y0, x1, y1, w) {
    var dx = x1 - x0, dy = y1 - y0, l = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / l * w / 2, ny = dx / l * w / 2;
    poly(ctx, F, [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]);
  }

  /* A GUN PLATFORM: two "4"s merged at the middle, one turned through
   * 180°. In half-lengths, x across, y outward: barrels at x = ±A, each
   * from just past the crossbar to its far end; the crossbar at y = 0 out
   * to ±W; each 4's diagonal from its barrel's long end to the far end of
   * the crossbar, and the triangle that closes plated. Every part has its
   * twin through the centre, so nothing says which end is the gun. */
  var A = 0.15, T = 0.30;
  function gun(ctx, view, G, st, S) {
    var F = turned(view, G.r, G.a, G.tilt, G.len / 2);
    var W = G.wide, px = S * G.len / 2;
    var h, k, e;
    var lw = Math.max(0.5, px * 0.025);
    for (h = 1; h >= -1; h -= 2) {
      /* The plated triangle, then the diagonal over its edge. */
      ctx.fillStyle = st.shade;
      ctx.beginPath(); poly(ctx, F, [[A * h, h], [-W * h, 0], [A * h, 0]]); ctx.fill();
      ctx.fillStyle = st.hull;
      ctx.beginPath(); bar(ctx, F, A * h, h * 0.92, -W * h, 0, 0.075); ctx.fill();
      ctx.strokeStyle = st.trim; ctx.lineWidth = lw; ctx.stroke();
      /* Ribs across the plating. */
      ctx.beginPath();
      for (k = 1; k < 4; k++) {
        var y = h * k / 4, x = A * h - (A + W) * h * (1 - k / 4);
        var p0 = F(x, y), p1 = F(A * h, y);
        ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
      }
      ctx.stroke();
    }
    /* The crossbar, with a pod at each end. */
    ctx.fillStyle = st.hull;
    ctx.beginPath(); bar(ctx, F, -W - 0.04, 0, W + 0.04, 0, 0.11); ctx.fill();
    ctx.strokeStyle = st.trim; ctx.lineWidth = lw; ctx.stroke();
    for (e = -1; e <= 1; e += 2) {
      ctx.fillStyle = st.lit;
      ctx.beginPath(); poly(ctx, F, [[e * (W - 0.02), -0.09], [e * (W + 0.12), -0.09],
                                     [e * (W + 0.12), 0.09], [e * (W - 0.02), 0.09]]);
      ctx.fill(); ctx.stroke();
    }
    /* The barrels: a long hull, a lit flank, accelerator bands, a muzzle
     * collar at the long end and a breech block at the short one. */
    for (h = 1; h >= -1; h -= 2) {
      var x0 = A * h, yS = -T * h, yL = h;
      ctx.fillStyle = st.hull;
      ctx.beginPath(); bar(ctx, F, x0, yS, x0, yL, 0.17); ctx.fill();
      ctx.strokeStyle = st.trim; ctx.lineWidth = lw; ctx.stroke();
      ctx.fillStyle = st.lit;
      ctx.beginPath(); bar(ctx, F, x0 + 0.05 * h, yS, x0 + 0.05 * h, yL, 0.045); ctx.fill();
      ctx.fillStyle = st.trim;
      ctx.beginPath();
      for (k = 0; k < 6; k++) {
        var yb = yS + (yL - yS) * (0.30 + k * 0.12);
        bar(ctx, F, x0 - 0.105, yb, x0 + 0.105, yb, 0.035);
      }
      ctx.fill();
      ctx.fillStyle = st.hull;
      ctx.beginPath(); bar(ctx, F, x0, yL - h * 0.07, x0, yL + h * 0.01, 0.25); ctx.fill();
      ctx.stroke();
      ctx.beginPath(); bar(ctx, F, x0, yS - h * 0.10, x0, yS + h * 0.04, 0.29); ctx.fill();
      ctx.stroke();
    }
    /* Lights: red at each muzzle, warm white on the pods. */
    var r0 = Math.max(0.7, px * 0.035);
    ctx.fillStyle = "rgba(255,70,60,0.95)";
    ctx.beginPath();
    for (h = 1; h >= -1; h -= 2) {
      var m = F(A * h, h * 1.02);
      ctx.moveTo(m.x + r0, m.y); ctx.arc(m.x, m.y, r0, 0, TAU);
    }
    ctx.fill();
    ctx.fillStyle = light(0.9);
    ctx.beginPath();
    for (e = -1; e <= 1; e += 2) {
      var q2 = F(e * (W + 0.05), 0);
      ctx.moveTo(q2.x + r0 * 0.8, q2.y); ctx.arc(q2.x, q2.y, r0 * 0.8, 0, TAU);
    }
    ctx.fill();
  }

  /* A SATELLITE: a metal box and two cyan solar panels on a strut. */
  var PANEL = "rgba(70,205,235,", PANEL_DARK = "rgba(20,80,110,";
  function sat(ctx, view, P, st, S, alpha) {
    var F = turned(view, P.r, P.a, P.turn, P.s);
    var px = S * P.s;
    var x1 = 0.75 + P.wing;
    var lw = Math.max(0.4, px * 0.08);
    ctx.strokeStyle = st.hull; ctx.lineWidth = lw;
    ctx.beginPath(); var a0 = F(-0.75, 0), a1 = F(0.75, 0);
    ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.stroke();
    for (var e = -1; e <= 1; e += 2) {
      var xa = e * 0.75, xb = e * x1;
      ctx.fillStyle = PANEL + (0.92 * alpha) + ")";
      ctx.beginPath(); poly(ctx, F, [[xa, -0.42], [xb, -0.42], [xb, 0.42], [xa, 0.42]]); ctx.fill();
      ctx.strokeStyle = PANEL_DARK + alpha + ")"; ctx.lineWidth = lw; ctx.stroke();
      ctx.beginPath();
      for (var k = 1; k < 3; k++) {
        var p = F(xa + (xb - xa) * k / 3, -0.42), q = F(xa + (xb - xa) * k / 3, 0.42);
        ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = st.hull;
    ctx.beginPath(); poly(ctx, F, [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]); ctx.fill();
    ctx.strokeStyle = st.trim; ctx.lineWidth = lw; ctx.stroke();
    ctx.fillStyle = st.lit;
    ctx.beginPath(); poly(ctx, F, [[-0.5, 0.15], [0.5, 0.15], [0.5, 0.5], [-0.5, 0.5]]); ctx.fill();
    if (P.lit) {
      var d = F(0, 0.5);
      ctx.fillStyle = light(0.9);
      ctx.beginPath(); ctx.arc(d.x, d.y, Math.max(0.5, px * 0.14), 0, TAU); ctx.fill();
    }
  }

  function defenceNetwork(ctx, view, el, st) {
    var S = view.px(1);
    var alpha = el.alpha === undefined ? 1 : el.alpha;
    ctx.save();
    ctx.lineJoin = "round";
    for (var i = 0; i < el.sats.length; i++) sat(ctx, view, el.sats[i], st, S, alpha);
    for (i = 0; i < el.guns.length; i++) gun(ctx, view, el.guns[i], st, S);
    ctx.restore();
  }

  /* The local-frame shapes, for the other built orbital drawings
   * (draw/primitives/giant-built.js). */
  CC.OrbitShapes = { frame: frame, turned: turned, quad: quad, poly: poly,
                     bar: bar, light: light };

  CC.Primitives.register({
    "orbital-ring": orbitalRing,
    "defence-network": defenceNetwork
  });
  function metal(colour, el, alpha) { return CC.DrawDetails.hullFill(colour, el, alpha); }
  CC.Primitives.registerStyle("orbital-ring", metal);
  CC.Primitives.registerStyle("defence-network", metal);
})();
