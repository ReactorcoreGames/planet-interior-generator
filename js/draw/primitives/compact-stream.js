/* Matter falling onto a compact object — two streams, two different stories
 * — and what a pulsar's spin and field do to its surface and surroundings.
 *
 *   matter-stream  gas from a companion, CHANNELLED BY THE FIELD: it arrives
 *                  from the companion's bearing and runs down a real dipole
 *                  field line of this body (`el.poles`) onto a polar cap,
 *                  where it lands as a hot spot. On a neutron star the field
 *                  decides where matter lands, and this is the one mark that
 *                  shows it.
 *   tidal-stream   a star torn apart by a black hole: a stretched, bright
 *                  body with half of itself spiralling in round the hole and
 *                  the other half flung back out as a fainter tail.
 *   pulsar-wind    the wind a pulsar blows along its spin equator, starting
 *                  at `poles.lightCylinder`: shocked wisps in a soft torus.
 *   polar-cap      a pulsar's two hot caps, at the ends of its magnetic axis.
 *   hot-spot       a quiet neutron star's surface patch, at its own bearing.
 *
 * All are drawn in BODY coordinates via CC.CompactDraw (primitives/
 * compact.js), name no role and no archetype, and fade to nothing at their
 * open ends (D156). Load order: after draw/primitives/compact.js. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;

  function wrap(a) {
    a = (a + Math.PI) % TAU;
    if (a < 0) a += TAU;
    return a - Math.PI;
  }

  /* A tapered ribbon through body-space points `pts` ({x, y}), widths `w`
   * (body units) and per-point alphas `al`.
   *
   * DRAWN AS JOINED QUADS, each sharing its edge with the next, so width and
   * alpha can both vary along it without a seam. Separate stroked segments
   * left a wedge-shaped gap on the outside of every bend and a doubled
   * overlap on the inside, and under `lighter` that read as a ladder; round
   * caps strung it into beads instead. The edges are offset along the
   * averaged normal at each point, so neighbouring quads meet exactly. */
  function ribbon(ctx, view, pts, w, al, style) {
    var D = CC.CompactDraw;
    var base = ctx.globalAlpha;
    var n = pts.length, i;
    var P = [], L = [], R = [];
    for (i = 0; i < n; i++) P.push(D.xy(view, pts[i].x, pts[i].y));
    for (i = 0; i < n; i++) {
      var p0 = P[Math.max(0, i - 1)], p1 = P[Math.min(n - 1, i + 1)];
      var tx = p1.x - p0.x, ty = p1.y - p0.y;
      var tl = Math.sqrt(tx * tx + ty * ty) || 1;
      var hw = Math.max(0.4, view.px(w[i]) / 2);
      var nx = -ty / tl * hw, ny = tx / tl * hw;
      L.push({ x: P[i].x + nx, y: P[i].y + ny });
      R.push({ x: P[i].x - nx, y: P[i].y - ny });
    }
    ctx.fillStyle = style;
    for (i = 1; i < n; i++) {
      var a = (al[i - 1] + al[i]) / 2;
      if (a <= 0.005) continue;
      ctx.globalAlpha = base * a;
      ctx.beginPath();
      ctx.moveTo(L[i - 1].x, L[i - 1].y);
      ctx.lineTo(L[i].x, L[i].y);
      ctx.lineTo(R[i].x, R[i].y);
      ctx.lineTo(R[i - 1].x, R[i - 1].y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = base;
  }

  function glow(ctx, view, x, y, r, style, a) {
    var D = CC.CompactDraw;
    var c = D.xy(view, x, y);
    var rp = Math.max(2, view.px(r));
    var g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, rp);
    g.addColorStop(0, "rgba(255,255,255," + a.toFixed(3) + ")");
    g.addColorStop(0.35, style);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, rp, 0, TAU);
    ctx.fill();
  }

  /* ---- matter-stream ---------------------------------------------------
   *
   * Starts well out at the companion's bearing, picks the magnetic pole on
   * that side, and follows the dipole field line through the start point —
   * r = L sin^2(theta) — down to the surface. The ribbon narrows and
   * brightens as it falls, and the footpoint is a hot spot: the accretion
   * column. */
  function matterStream(ctx, view, el, style) {
    var P = el.poles || { tilt: 0 };
    var north = P.tilt || 0, south = north + Math.PI;
    var pole = Math.abs(wrap(el.angle - north)) <= Math.PI / 2 ? north : south;
    var off = wrap(el.angle - pole);
    var side = off < 0 ? -1 : 1;
    var th0 = Math.max(0.42, Math.min(1.35, Math.abs(off)));
    var r0 = 3.4;
    var L = r0 / (Math.sin(th0) * Math.sin(th0));
    var th1 = Math.asin(Math.sqrt(1 / L));
    var N = 40, pts = [], w = [], al = [];
    var W = el.size;
    for (var i = 0; i <= N; i++) {
      var t = i / N;
      var th = th0 + (th1 - th0) * t;
      var r = L * Math.sin(th) * Math.sin(th);
      var b = pole + side * th;
      pts.push({ x: Math.sin(b) * r, y: Math.cos(b) * r });
      w.push(W * (1 - 0.78 * t));
      /* Fades in from nothing at its far end, brightest where it lands. */
      al.push(Math.min(1, t * 2.2) * (0.25 + 0.50 * t));
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ribbon(ctx, view, pts, w.map(function (x) { return x * 1.9; }),
           al.map(function (x) { return x * 0.28; }), style);
    ribbon(ctx, view, pts, w, al, style);
    var f = pts[N];
    glow(ctx, view, f.x, f.y, W * 2.2, style, 0.85);
    ctx.restore();
  }

  /* ---- tidal-stream ----------------------------------------------------
   *
   * The star is a bright smear at the element's bearing. From it, the stream
   * that falls winds round the hole and in; the tail that escapes curls back
   * out the other way, fainter.
   *
   * ONE PATH, NOT TWO. The tail and the infall are a single ribbon running
   * tail-tip -> star -> inner end, with the tail's opening direction matched
   * to the infall's so there is no kink at the star, and width and alpha
   * continuous through it. Drawn as two ribbons, the bright, haloed infall
   * met a thin, faint tail at the star and the stream looked to change from
   * wide to thin halfway along. */
  function tidalStream(ctx, view, el, style) {
    var a0 = el.angle, r0 = 3.0;
    var W = el.size;
    var dir = (el.seed || 0) < 0.5 ? 1 : -1;
    var pts = [], w = [], al = [], bump = [], i, t, r, b;
    var NT = 40, N = 90;
    /* The tail, from its far tip in to the star. Its radius opens at 0.72 per
     * unit for 0.9 radians of bearing: the infall's own slope at the star,
     * run backwards. */
    for (i = NT; i >= 1; i--) {
      t = i / NT;
      r = r0 + 0.72 * t + 1.5 * t * t;
      b = a0 - dir * t * 0.9;
      pts.push({ x: Math.sin(b) * r, y: Math.cos(b) * r });
      w.push(W * (0.9 - 0.5 * t));
      al.push(Math.pow(1 - t, 1.2) * (1 - 0.35 * t));
      bump.push(Math.max(0, 1 - t / 0.10));
    }
    /* The infall, from the star round the hole and in. Its radius settles
     * toward the photon sphere rather than plunging straight off the star. */
    for (i = 0; i <= N; i++) {
      t = i / N;
      r = r0 - (r0 - 1.05) * (1 - Math.pow(1 - t, 1.6));
      b = a0 + dir * t * 3.9;
      pts.push({ x: Math.sin(b) * r, y: Math.cos(b) * r });
      w.push(W * (0.9 - 0.65 * t));
      al.push(1 - t);
      bump.push(Math.max(0, 1 - t / 0.16));
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ribbon(ctx, view, pts, w.map(function (x) { return x * 2.2; }),
           al.map(function (x) { return x * 0.22; }), style);
    ribbon(ctx, view, pts, w, al, style);
    /* The star itself: the stream drawn again round the head, brighter and
     * wider, easing in and out so the star reads as SMEARED along it. */
    var sw = w.map(function (x, k) { return x * (1 + 0.7 * bump[k]); });
    var sa = bump.map(function (x) { return 0.9 * x * x * (3 - 2 * x); });
    ribbon(ctx, view, pts, sw, sa, style);
    glow(ctx, view, Math.sin(a0) * r0, Math.cos(a0) * r0, W * 1.7, style, 0.95);
    ctx.restore();
  }

  /* ---- pulsar-wind -----------------------------------------------------
   *
   * THE WIND A PULSAR BLOWS, where the light cylinder used to be drawn as a
   * ruled annotation (Session Y: "more like a HUD element than a trait").
   * Past the light cylinder the field can no longer co-rotate, so it opens
   * and streams away along the spin equator as a relativistic wind; where
   * that wind meets its surroundings it shocks into bright WISPS — the
   * ripples photographed round the Crab pulsar. Cut through the spin axis,
   * the equatorial torus is two lobes, one each side, each a set of nested
   * arcs bowing outward, broken into knots, inside a soft glow.
   *
   * The light-cylinder radius (`poles.lightCylinder`, Spin rate) is still
   * where it starts, so a faster pulsar's wind starts closer in. Body space:
   * the spin axis is vertical, and the scene's Rotation turns it. */
  function pulsarWind(ctx, view, el, style) {
    var P = el.poles;
    if (!P || !P.lightCylinder) return;
    var D = CC.CompactDraw, lc = P.lightCylinder;
    var R = view.px(1);
    var base = ctx.globalAlpha;
    var seed = (el.seed || 0) * 1000;
    var h = function (n) {
      var x = Math.sin((seed + n) * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (var sd = -1; sd <= 1; sd += 2) {
      /* The torus glow: an ellipse, flattened along the spin axis. */
      var c = D.xy(view, sd * (lc + 0.42), 0);
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(1, 0.50);
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.85);
      g.addColorStop(0, style);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = base * 0.50;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.85, 0, TAU);
      ctx.fill();
      ctx.restore();

      /* The wisps: nested arcs, spacing and height growing outward, each
       * broken into knots so they read as shocked gas, not as rings. */
      /* HOW MANY FOLLOWS DETAIL DENSITY (D316): 7 at the default, 4 to 9
       * across the control, packed into the same extent — `ii` is the wisp's
       * place on the original 0..6 scale, so more wisps are closer, not
       * further out. */
      ctx.strokeStyle = style;
      ctx.lineCap = "round";
      var dk = el.detail === undefined ? 0.65 : el.detail;
      var N = Math.max(3, Math.round(3 + 6.2 * dk));
      for (var i = 0; i < N; i++) {
        var k = sd * 10 + i, ii = i * 6 / (N - 1);
        var x = lc + 0.04 + ii * 0.11 * (1 + 0.10 * ii) + (h(k) - 0.5) * 0.04;
        var hh = 0.16 + 0.085 * ii + h(k + 0.3) * 0.05;
        var bow = 0.06 + 0.028 * ii;
        var fall = Math.pow(1 - i / N, 0.9);
        ctx.lineWidth = view.lw(2.2 - ii * 0.2);
        var segs = 9;
        for (var j = 0; j < segs; j++) {
          if (h(k * 31 + j) < 0.14) continue;
          var t0 = j / segs, t1 = (j + 0.92) / segs;
          ctx.globalAlpha = base * fall * (0.55 + 0.45 * h(k * 7 + j));
          ctx.beginPath();
          for (var q = 0; q <= 5; q++) {
            var t = t0 + (t1 - t0) * q / 5;
            var y = (t * 2 - 1) * hh;
            var px = x + bow * (1 - (y / hh) * (y / hh));
            var p = D.xy(view, sd * px, y);
            if (q === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        }
      }

      /* Streaks along the equator: the wind itself, leaving. */
      ctx.lineWidth = view.lw(0.8);
      var nStreak = Math.round(5 + 13.8 * dk);
      for (var m = 0; m < nStreak; m++) {
        var u = h(sd * 50 + m);
        var r0 = lc + u * 1.3, len = 0.05 + h(sd * 70 + m) * 0.14;
        var yy = (h(sd * 90 + m) - 0.5) * (0.10 + u * 0.5);
        ctx.globalAlpha = base * 0.35 * (1 - u);
        var s0 = D.xy(view, sd * r0, yy), s1 = D.xy(view, sd * (r0 + len), yy * 1.08);
        ctx.beginPath();
        ctx.moveTo(s0.x, s0.y);
        ctx.lineTo(s1.x, s1.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ---- polar-cap -------------------------------------------------------
   *
   * A pulsar's HOT POLAR CAPS, at both ends of the magnetic axis — where
   * the beams are rooted and the return current strikes the surface, the
   * hottest ground on the star. A bright gradient centred on the surface at
   * each pole; the layer's own clip decides what part of it shows, so the
   * same mark on the field, the crust and the pasta reads as one hot spot
   * burning down through them. */
  /* One white-cored glow centred on the surface at bearing `t`. */
  function surfaceGlow(ctx, view, t, size, alpha, style) {
    var rp = Math.max(2, view.px(size));
    var c = CC.CompactDraw.xy(view, Math.sin(t), Math.cos(t));
    var g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, rp);
    g.addColorStop(0, "rgba(255,255,255," + (0.95 * alpha).toFixed(3) + ")");
    g.addColorStop(0.12, "rgba(255,255,255," + (0.45 * alpha).toFixed(3) + ")");
    g.addColorStop(0.40, style);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, rp, 0, TAU);
    ctx.fill();
  }

  function polarCap(ctx, view, el, style) {
    var P = el.poles;
    if (!P) return;
    var a = el.alpha === undefined ? 1 : el.alpha;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    surfaceGlow(ctx, view, P.tilt || 0, el.size, a, style);
    surfaceGlow(ctx, view, (P.tilt || 0) + Math.PI, el.size, a, style);
    ctx.restore();
  }

  /* ---- hot-spot --------------------------------------------------------
   *
   * A neutron star's surface hot patch: the same glow as a cap, at its own
   * bearing (`el.angle`, shared by every layer that draws it). */
  function hotSpot(ctx, view, el, style) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    surfaceGlow(ctx, view, el.angle, el.size,
                el.alpha === undefined ? 1 : el.alpha, style);
    ctx.restore();
  }

  CC.Primitives.register({
    "pulsar-wind": pulsarWind,
    "polar-cap": polarCap,
    "hot-spot": hotSpot,
    "matter-stream": matterStream,
    "tidal-stream": tidalStream
  });
})();
