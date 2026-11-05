/* Built orbital structures round a giant — drawing gen/giantbuilt.js's
 * `skyhooks`.
 *
 *   skyhooks   per skyhook, lowest first: the tether from the scoop up to its
 *              platform, or on past it to a city; gas pods climbing it; the
 *              scoop, a funnel mouth-down in the cloud deck; the platform, a
 *              deck along the orbit with a winch house and radiator fins; a
 *              counterweight over a hook with no city. Then the cities over
 *              everything:
 *                wheel   a broad habitat ring and a narrow one on a keel,
 *                        3-4 spokes to a hub, rows of lit windows
 *                pair    two long cylinders along the orbit, glazed and lit
 *                        strips down their length, a frame and a spine
 *                spire   a spine through a stack of saucer decks seen
 *                        edge-on, low blocks on each, a mast on top
 *
 * Metal is hullFill's (draw/details-gas.js), lights warm white, as on the
 * planet's ring. Every part is drawn at every size, so the call count is the
 * same at every zoom and resolution; only line widths and light radii floor.
 *
 * Drawn whole in both of draw/zonepaint.js's halves; its clip at the body's
 * centre line puts a scoop on the far side behind the giant. Pixels enter
 * only through `view`.
 *
 * draw/primitives/orbital-built.js must load first (CC.OrbitShapes). */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;
  var O = CC.OrbitShapes;
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* The skyhook's parts are drawn in units of K body radii and the scoop's
   * in KS, so the shapes keep their proportions at a size the body shows. */
  var K = 1.0, KS = 1.05;

  /* A hash in [0, 1) for a window being dark, stable per structure. */
  function dark(seed, i, j) {
    var h = Math.sin((seed * 97 + i * 12.9898 + j * 78.233) * 43758.5453);
    return h - Math.floor(h) < 0.3;
  }

  function dots(ctx, pts, r, colour) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      ctx.moveTo(pts[i].x + r, pts[i].y);
      ctx.arc(pts[i].x, pts[i].y, r, 0, TAU);
    }
    ctx.fill();
  }

  /* ---- the skyhook -------------------------------------------------------- */

  /* Where the tether ends at the top: the platform's winch, or the bottom
   * of a city's keel. */
  function top(el, H) {
    if (H.city < 0) return H.r + 0.016 * K + H.cw;
    var C = el.cities[H.city];
    return C.r - C.size * (el.design === "wheel" ? 1.22 : 1.0);
  }

  function tether(ctx, view, el, H, st, S) {
    var a = view.at(H.tip + 0.012, H.a), b = view.at(top(el, H), H.a);
    ctx.lineCap = "round";
    ctx.strokeStyle = st.trim;
    ctx.lineWidth = Math.max(1.0, S * 0.0040);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = st.lit;
    ctx.lineWidth = Math.max(0.6, S * 0.0018);
    ctx.stroke();
    /* Gas pods on their way up, lit at the top. */
    var lights = [];
    for (var k = 0; k < H.pods.length; k++) {
      var r = lerp(H.tip + 0.04, H.r - 0.02, H.pods[k]);
      var F = O.turned(view, r, H.a, 0, K);
      ctx.fillStyle = st.hull;
      ctx.beginPath(); O.quad(ctx, F, -0.0055, -0.0085, 0.0055, 0.0085); ctx.fill();
      ctx.strokeStyle = st.trim; ctx.lineWidth = Math.max(0.5, S * 0.0010); ctx.stroke();
      ctx.fillStyle = st.lit;
      ctx.beginPath(); O.quad(ctx, F, -0.0055, 0.003, 0.0055, 0.0085); ctx.fill();
      lights.push(F(0, 0.0085));
    }
    dots(ctx, lights, Math.max(0.5, S * 0.0018), O.light(0.9));
  }

  /* THE SCOOP: a funnel hung mouth-down into the cloud deck, its lip lit
   * by what it is drawing in. */
  function scoop(ctx, view, H, st, S) {
    var F = O.turned(view, H.tip, H.a, 0, KS);
    ctx.fillStyle = O.light(0.16);
    var g = F(0, -0.004);
    ctx.beginPath(); ctx.arc(g.x, g.y, S * 0.020 * KS, 0, TAU); ctx.fill();
    ctx.fillStyle = st.hull;
    ctx.beginPath();
    O.poly(ctx, F, [[-0.017, -0.006], [0.017, -0.006], [0.008, 0.014], [-0.008, 0.014]]);
    ctx.fill();
    ctx.strokeStyle = st.trim; ctx.lineWidth = Math.max(0.6, S * 0.0014); ctx.stroke();
    ctx.fillStyle = st.shade;
    ctx.beginPath(); O.poly(ctx, F, [[-0.017, -0.006], [0.017, -0.006], [0.014, 0.0], [-0.014, 0.0]]);
    ctx.fill();
    ctx.fillStyle = O.light(0.85);
    ctx.beginPath(); O.quad(ctx, F, -0.016, -0.0075, 0.016, -0.0050); ctx.fill();
    /* The collar where the tether takes it. */
    ctx.fillStyle = st.hull;
    ctx.beginPath(); O.quad(ctx, F, -0.004, 0.014, 0.004, 0.019); ctx.fill();
    ctx.strokeStyle = st.trim; ctx.stroke();
  }

  /* THE PLATFORM: a deck along the orbit, a winch house on its outer face,
   * a collar under it where the tether leaves, a radiator fin at each end. */
  function platform(ctx, view, H, st, S) {
    var F = O.turned(view, H.r, H.a, 0, K);
    var hl = H.len / 2 / K, hh = 0.0062;
    var lw = Math.max(0.5, S * 0.0012);
    ctx.fillStyle = st.shade;
    ctx.beginPath(); O.quad(ctx, F, -0.006, -hh - 0.007, 0.006, -hh); ctx.fill();
    ctx.strokeStyle = st.trim; ctx.lineWidth = lw; ctx.stroke();
    for (var e = -1; e <= 1; e += 2) {
      ctx.fillStyle = st.lit;
      ctx.beginPath(); O.quad(ctx, F, e * (hl - 0.006), hh, e * (hl - 0.0025), hh + 0.016); ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = st.hull;
    ctx.beginPath(); O.quad(ctx, F, -hl * 0.22, hh, hl * 0.22, hh + 0.010); ctx.fill();
    ctx.stroke();
    ctx.fillStyle = st.lit;
    ctx.beginPath(); O.quad(ctx, F, -hl * 0.22, hh + 0.0065, hl * 0.22, hh + 0.010); ctx.fill();
    ctx.fillStyle = st.hull;
    ctx.beginPath(); O.quad(ctx, F, -hl, -hh, hl, hh); ctx.fill();
    ctx.lineWidth = Math.max(0.6, S * 0.0016); ctx.stroke();
    ctx.fillStyle = st.lit;
    ctx.beginPath(); O.quad(ctx, F, -hl, hh * 0.4, hl, hh); ctx.fill();
    ctx.fillStyle = st.shade;
    ctx.beginPath(); O.quad(ctx, F, -hl, -hh, hl, -hh * 0.5); ctx.fill();
    /* Section joins, and a row of windows. */
    var secs = Math.round(H.len / K / 0.012);
    ctx.lineWidth = Math.max(0.4, S * 0.0008);
    ctx.beginPath();
    for (var k = 1; k < secs; k++) {
      var p = F(-hl + 2 * hl * k / secs, -hh), q = F(-hl + 2 * hl * k / secs, hh);
      ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
    var cols = Math.round(H.len / K / 0.0045), win = [];
    for (k = 0; k < cols; k++) {
      if (!dark(H.win, k, 0)) win.push(F(-hl + 2 * hl * (k + 0.5) / cols, 0));
    }
    dots(ctx, win, Math.max(0.45, S * 0.0010), O.light(0.9));
    dots(ctx, [F(0, hh + 0.010)], Math.max(0.6, S * 0.0022), "rgba(255,70,60,0.95)");
  }

  function counterweight(ctx, view, H, st, S) {
    var F = O.turned(view, H.r + 0.016 * K + H.cw, H.a, 0, K);
    ctx.fillStyle = st.shade;
    ctx.beginPath(); O.quad(ctx, F, -0.011, -0.004, 0.011, 0.010); ctx.fill();
    ctx.strokeStyle = st.lit; ctx.lineWidth = Math.max(0.5, S * 0.0012); ctx.stroke();
  }

  /* ---- the cities --------------------------------------------------------- */

  /* A circle of n points round (0, 0) in a frame, as a closed path. */
  function ring(ctx, F, R, n, reverse) {
    for (var i = 0; i <= n; i++) {
      var t = (reverse ? n - i : i) / n * TAU;
      var p = F(Math.cos(t) * R, Math.sin(t) * R);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
  }

  /* A ring of window dots between radii, by body-space pitch. */
  function rimWindows(F, R, rows, r0, r1, key, out) {
    for (var row = 0; row < rows; row++) {
      var rr = R * lerp(r0, r1, rows === 1 ? 0.5 : row / (rows - 1));
      var n = Math.round(TAU * rr / 0.0062);
      for (var k = 0; k < n; k++) {
        if (dark(key, k, row)) continue;
        var t = (k + row * 0.5) / n * TAU;
        out.push(F(Math.cos(t) * rr, Math.sin(t) * rr));
      }
    }
  }

  /* An annulus between radii a and b, filled. */
  function annulus(ctx, F, a, b, colour) {
    ctx.fillStyle = colour;
    ctx.beginPath(); ring(ctx, F, b, 72); ring(ctx, F, a, 72, true); ctx.fill("evenodd");
  }

  /* THE WHEEL: a broad habitat ring and a narrower one inside it, joined by
   * three or four spokes to a hub, all on a keel that does not turn. The
   * keel runs along the radial, the tether arriving at its foot. */
  function wheel(ctx, view, C, st, S, seed) {
    var F = O.frame(view, C.r, C.a);
    var R = C.size, Ri = R * 0.72, R2 = R * 0.46, R2i = R * 0.38;
    var lw = Math.max(0.6, S * 0.0016), key = seed + C.win;
    var k, t, p, q;
    /* The keel: a truss under everything, a dock at its foot and a mast. */
    ctx.fillStyle = st.shade;
    ctx.beginPath(); O.bar(ctx, F, 0, -R * 1.22, 0, R * 1.30, R * 0.16); ctx.fill();
    ctx.strokeStyle = st.trim; ctx.lineWidth = lw; ctx.stroke();
    ctx.strokeStyle = st.hull; ctx.lineWidth = Math.max(0.5, S * R * 0.018);
    ctx.beginPath();
    for (k = 0; k < 14; k++) {
      var s0 = k % 2 ? 1 : -1;
      p = F(s0 * R * 0.07, -R * 1.22 + k * R * 0.18);
      q = F(-s0 * R * 0.07, -R * 1.22 + (k + 1) * R * 0.18);
      ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
    ctx.fillStyle = st.hull; ctx.strokeStyle = st.trim; ctx.lineWidth = lw;
    ctx.beginPath(); O.quad(ctx, F, -R * 0.17, -R * 1.24, R * 0.17, -R * 1.06); ctx.fill(); ctx.stroke();
    ctx.beginPath(); O.quad(ctx, F, -R * 0.10, R * 1.04, R * 0.10, R * 1.16); ctx.fill(); ctx.stroke();
    /* The spokes, each with a lift car part way along. */
    ctx.fillStyle = st.hull;
    ctx.beginPath();
    for (k = 0; k < C.spokes; k++) {
      t = C.win * TAU + k / C.spokes * TAU;
      O.bar(ctx, F, Math.cos(t) * R * 0.16, Math.sin(t) * R * 0.16,
            Math.cos(t) * Ri, Math.sin(t) * Ri, R * 0.075);
    }
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = st.lit;
    ctx.beginPath();
    for (k = 0; k < C.spokes; k++) {
      t = C.win * TAU + k / C.spokes * TAU;
      var m = lerp(0.22, 0.52, (k * 0.37 + C.win) % 1);
      O.bar(ctx, F, Math.cos(t) * R * m, Math.sin(t) * R * m,
            Math.cos(t) * R * (m + 0.06), Math.sin(t) * R * (m + 0.06), R * 0.11);
    }
    ctx.fill(); ctx.stroke();
    /* The outer rim: hull, a lit outer edge, a shaded inner one, a dark
     * seam, section joins. */
    annulus(ctx, F, Ri, R, st.hull);
    ctx.beginPath(); ring(ctx, F, R, 72); ring(ctx, F, Ri, 72); ctx.stroke();
    annulus(ctx, F, R * 0.95, R, st.lit);
    annulus(ctx, F, Ri, Ri * 1.06, st.shade);
    annulus(ctx, F, R * 0.83, R * 0.86, st.shade);
    /* The inner ring. */
    annulus(ctx, F, R2i, R2, st.hull);
    ctx.beginPath(); ring(ctx, F, R2, 56); ring(ctx, F, R2i, 56); ctx.stroke();
    annulus(ctx, F, R2 * 0.93, R2, st.lit);
    var secs = 36;
    ctx.strokeStyle = st.trim; ctx.lineWidth = Math.max(0.4, S * 0.0008);
    ctx.beginPath();
    for (k = 0; k < secs; k++) {
      t = k / secs * TAU;
      p = F(Math.cos(t) * Ri, Math.sin(t) * Ri); q = F(Math.cos(t) * R, Math.sin(t) * R);
      ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
      if (k % 2) continue;
      p = F(Math.cos(t) * R2i, Math.sin(t) * R2i); q = F(Math.cos(t) * R2, Math.sin(t) * R2);
      ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
    /* The hub. */
    ctx.fillStyle = st.hull; ctx.strokeStyle = st.trim; ctx.lineWidth = lw;
    ctx.beginPath(); ring(ctx, F, R * 0.17, 32); ctx.fill(); ctx.stroke();
    annulus(ctx, F, R * 0.12, R * 0.17, st.lit);
    ctx.fillStyle = st.shade;
    ctx.beginPath(); ring(ctx, F, R * 0.07, 24); ctx.fill();
    /* Windows: two rows on the outer rim's outer band, one on its inner
     * band, one round the inner ring. */
    var win = [];
    rimWindows(F, R, 2, 0.885, 0.925, key, win);
    rimWindows(F, R, 1, 0.78, 0.78, key + 3, win);
    rimWindows(F, R, 1, 0.42, 0.42, key + 7, win);
    dots(ctx, win, Math.max(0.5, S * 0.0015), O.light(0.9));
    dots(ctx, [F(0, R * 1.30)], Math.max(0.6, S * 0.0026), "rgba(255,70,60,0.95)");
  }

  /* THE PAIR: two long cylinders side by side along the orbit, each with a
   * glazed strip down its length between lit land strips, rings round it,
   * a docking cap at each end, joined by a frame at the ends and a spine
   * down the middle. It reads as built at any bearing, because a cylinder
   * does. */
  function pair(ctx, view, C, st, S, seed) {
    var F = O.frame(view, C.r, C.a);
    var R = C.size, L = R * 1.0, D = R * 0.22, lw = Math.max(0.6, S * 0.0016);
    var key = seed + C.win, win = [];
    var k, j, e, y, p, q;
    /* The frame between them, and the spine down the middle to the dock. */
    ctx.fillStyle = st.shade; ctx.strokeStyle = st.trim; ctx.lineWidth = lw;
    for (e = -1; e <= 1; e += 2) {
      ctx.beginPath(); O.bar(ctx, F, e * L * 0.92, -R * 0.36, e * L * 0.92, R * 0.36, R * 0.07);
      ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); O.bar(ctx, F, -L * 0.92, 0, L * 0.92, 0, R * 0.06); ctx.fill(); ctx.stroke();
    ctx.beginPath(); O.bar(ctx, F, 0, -R * 0.86, 0, R * 0.62, R * 0.08); ctx.fill(); ctx.stroke();
    ctx.fillStyle = st.hull;
    ctx.beginPath(); O.quad(ctx, F, -R * 0.15, -R * 1.0, R * 0.15, -R * 0.82); ctx.fill(); ctx.stroke();
    ctx.beginPath(); O.quad(ctx, F, -R * 0.07, R * 0.58, R * 0.07, R * 0.70); ctx.fill(); ctx.stroke();
    for (j = -1; j <= 1; j += 2) {
      y = j * R * 0.30;
      /* The hull, rounded at the ends. */
      var pts = [], n = 10;
      for (k = 0; k <= n; k++) {
        var t = -Math.PI / 2 + k / n * Math.PI;
        pts.push([L + Math.cos(t) * D * 0.55, y + Math.sin(t) * D]);
      }
      for (k = 0; k <= n; k++) {
        var t2 = Math.PI / 2 + k / n * Math.PI;
        pts.push([-L + Math.cos(t2) * D * 0.55, y + Math.sin(t2) * D]);
      }
      ctx.fillStyle = st.hull; ctx.strokeStyle = st.trim; ctx.lineWidth = lw;
      ctx.beginPath(); O.poly(ctx, F, pts); ctx.fill(); ctx.stroke();
      /* A lit land strip, the glazed strip below it, the far edge shaded. */
      ctx.fillStyle = st.lit;
      ctx.beginPath(); O.quad(ctx, F, -L, y + D * 0.28, L, y + D * 0.78); ctx.fill();
      ctx.fillStyle = st.shade;
      ctx.beginPath(); O.quad(ctx, F, -L, y - D * 0.22, L, y + D * 0.22); ctx.fill();
      ctx.fillStyle = O.light(0.30);
      ctx.beginPath(); O.quad(ctx, F, -L, y - D * 0.10, L, y + D * 0.10); ctx.fill();
      ctx.fillStyle = st.shade;
      ctx.beginPath(); O.quad(ctx, F, -L, y - D, L, y - D * 0.72); ctx.fill();
      /* Rings round the cylinder. */
      var rings = Math.round(2 * L / 0.016);
      ctx.strokeStyle = st.trim; ctx.lineWidth = Math.max(0.4, S * 0.0009);
      ctx.beginPath();
      for (k = 1; k < rings; k++) {
        var x = -L + 2 * L * k / rings;
        p = F(x, y - D); q = F(x, y + D);
        ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
      /* The caps. */
      ctx.fillStyle = st.shade; ctx.lineWidth = lw;
      for (e = -1; e <= 1; e += 2) {
        ctx.beginPath(); O.quad(ctx, F, e * (L + D * 0.5), y - D * 0.22, e * (L + D * 0.78), y + D * 0.22);
        ctx.fill(); ctx.stroke();
      }
      /* Lights in the land strip and along the glazing. */
      var cols = Math.round(2 * L / 0.0055);
      for (var row = 0; row < 3; row++) {
        var yr = y + D * [0.42, 0.62, 0][row];
        for (k = 0; k < cols; k++) {
          if (dark(key + j, k, row)) continue;
          win.push(F(-L + 2 * L * (k + 0.25 + (row % 2) * 0.5) / cols, yr));
        }
      }
    }
    dots(ctx, win, Math.max(0.5, S * 0.0015), O.light(0.9));
    dots(ctx, [F(0, R * 0.70)], Math.max(0.6, S * 0.0026), "rgba(255,70,60,0.95)");
  }

  /* THE SPIRE: a spine through a stack of saucer decks seen edge-on, low
   * blocks standing on each, a mast on top and a dock at the foot. Along
   * the radial, so at the sides of the frame it lies on its side. */
  function spire(ctx, view, C, st, S, seed) {
    var F = O.frame(view, C.r, C.a);
    var R = C.size, lw = Math.max(0.6, S * 0.0016), key = seed + C.win;
    var k, j, win = [];
    ctx.fillStyle = st.hull;
    ctx.beginPath(); O.bar(ctx, F, 0, -R, 0, R * 1.42, R * 0.04); ctx.fill();
    ctx.strokeStyle = st.trim; ctx.lineWidth = lw; ctx.stroke();
    ctx.beginPath(); O.bar(ctx, F, 0, -R, 0, R * 1.05, R * 0.20); ctx.fill(); ctx.stroke();
    ctx.fillStyle = st.lit;
    ctx.beginPath(); O.bar(ctx, F, R * 0.05, -R, R * 0.05, R * 1.05, R * 0.05); ctx.fill();
    ctx.fillStyle = st.shade;
    ctx.beginPath(); O.quad(ctx, F, -R * 0.16, -R, R * 0.16, -R * 0.86); ctx.fill(); ctx.stroke();
    for (j = 0; j < C.decks; j++) {
      var y = lerp(-R * 0.66, R * 0.82, j / (C.decks - 1));
      var w = R * (0.40 + 0.52 * Math.sin(Math.PI * (j + 0.5) / C.decks));
      var th = R * 0.10;
      /* Blocks on the deck, taller toward its middle. */
      var nb = Math.max(3, Math.round(w / (R * 0.12)));
      ctx.fillStyle = st.hull; ctx.strokeStyle = st.trim; ctx.lineWidth = lw;
      ctx.beginPath();
      for (k = 0; k < nb; k++) {
        var x0 = -w * 0.78 + (k + 0.15) * (w * 1.56 / nb), x1 = x0 + w * 1.56 / nb * 0.7;
        var mid = 1 - Math.abs((x0 + x1) / 2) / w;
        var hb = R * (0.05 + 0.13 * mid) * (dark(key, j, k + 40) ? 0.6 : 1);
        O.quad(ctx, F, x0, y + th / 2, x1, y + th / 2 + hb);
        if (!dark(key, j, k + 80)) win.push(F((x0 + x1) / 2, y + th / 2 + hb * 0.6));
      }
      ctx.fill(); ctx.stroke();
      /* The deck, a flat saucer edge-on: hull, lit top, shaded underside. */
      ctx.fillStyle = st.hull;
      ctx.beginPath();
      O.poly(ctx, F, [[-w, y], [-w * 0.86, y + th / 2], [w * 0.86, y + th / 2], [w, y],
                      [w * 0.80, y - th / 2], [-w * 0.80, y - th / 2]]);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = st.lit;
      ctx.beginPath(); O.poly(ctx, F, [[-w * 0.93, y + th * 0.25], [-w * 0.86, y + th / 2],
                                       [w * 0.86, y + th / 2], [w * 0.93, y + th * 0.25]]);
      ctx.fill();
      ctx.fillStyle = st.shade;
      ctx.beginPath(); O.poly(ctx, F, [[-w * 0.9, y - th * 0.25], [w * 0.9, y - th * 0.25],
                                       [w * 0.80, y - th / 2], [-w * 0.80, y - th / 2]]);
      ctx.fill();
      var n = Math.round(w * 2 / 0.0048);
      for (k = 0; k < n; k++) {
        if (!dark(key, j, k)) win.push(F(-w * 0.9 + w * 1.8 * (k + 0.5) / n, y));
      }
    }
    dots(ctx, win, Math.max(0.45, S * 0.0010), O.light(0.9));
    dots(ctx, [F(0, R * 1.42)], Math.max(0.6, S * 0.0024), "rgba(255,70,60,0.95)");
  }

  function skyhooks(ctx, view, el, st) {
    var S = view.px(1);
    ctx.save();
    ctx.lineJoin = "round";
    var i, H;
    for (i = 0; i < el.hooks.length; i++) {
      H = el.hooks[i];
      tether(ctx, view, el, H, st, S);
      scoop(ctx, view, H, st, S);
      if (H.city < 0) counterweight(ctx, view, H, st, S);
      platform(ctx, view, H, st, S);
    }
    for (i = 0; i < el.cities.length; i++) {
      ({ wheel: wheel, pair: pair, spire: spire }[el.design])(ctx, view, el.cities[i], st, S, el.seed);
    }
    ctx.restore();
  }

  CC.Primitives.register({ "skyhooks": skyhooks });
  CC.Primitives.registerStyle("skyhooks", function (colour, el, alpha) {
    return CC.DrawDetails.hullFill(colour, el, alpha);
  });
})();
