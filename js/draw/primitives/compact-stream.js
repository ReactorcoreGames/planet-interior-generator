/* Matter falling onto a compact object — two streams, two different stories
 * — and the one ruled annotation a pulsar's field carries.
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
 *   light-cylinder two lines parallel to the spin axis at `poles.
 *                  lightCylinder`, solid and ticked like a dimension line.
 *
 * Both are drawn in BODY coordinates via CC.CompactDraw (primitives/
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

  /* ---- light-cylinder --------------------------------------------------
   *
   * Two lines at x = +/- the light-cylinder radius, parallel to the spin axis
   * (body-space vertical; the scene's Rotation turns them with the body).
   *
   * A BAND ROUND THE STAR, NOT A CAGE ROUND THE FRAME: full strength across
   * the middle, fading to nothing by HALF_LEN, which sits inside the frame
   * at the pulsar's framing. Lines running off-canvas at full strength were
   * what made the old dashed version read as a selection marquee.
   *
   * SOLID, WITH TICKS POINTING IN TOWARD THE AXIS — the vocabulary of a
   * dimension line on a technical drawing. Dashes were the app's own framing
   * guides' vocabulary, and the two were indistinguishable. The tick at the
   * equator is longer: it is where the radius is measured. */
  var HALF_LEN = 1.45, TICK_STEP = 0.145;
  function lightCylinder(ctx, view, el, style) {
    var P = el.poles;
    if (!P || !P.lightCylinder) return;
    var D = CC.CompactDraw, lc = P.lightCylinder;
    var fade = function (y) {
      var t = Math.abs(y) / HALF_LEN;
      if (t <= 0.4) return 1;
      var u = Math.max(0, 1 - (t - 0.4) / 0.6);
      return u * u;
    };
    var base = ctx.globalAlpha;
    ctx.save();
    ctx.strokeStyle = style;
    ctx.lineCap = "butt";
    var N = 34;
    for (var sd = -1; sd <= 1; sd += 2) {
      var x = sd * lc;
      ctx.lineWidth = view.lw(1.0);
      for (var i = 0; i < N; i++) {
        var y0 = -HALF_LEN + 2 * HALF_LEN * i / N;
        var y1 = -HALF_LEN + 2 * HALF_LEN * (i + 1) / N;
        var f = fade((y0 + y1) / 2);
        if (f <= 0.01) continue;
        var p0 = D.xy(view, x, y0), p1 = D.xy(view, x, y1);
        ctx.globalAlpha = base * f;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      ctx.lineWidth = view.lw(0.9);
      var steps = Math.floor(HALF_LEN / TICK_STEP);
      for (var k = -steps; k <= steps; k++) {
        var y = k * TICK_STEP;
        var ft = fade(y);
        if (ft <= 0.01) continue;
        var len = k === 0 ? 0.16 : (k % 3 === 0 ? 0.09 : 0.05);
        var a = D.xy(view, x, y), b = D.xy(view, x - sd * len, y);
        ctx.globalAlpha = base * ft * (k === 0 ? 1 : 0.8);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  CC.Primitives.register({
    "light-cylinder": lightCylinder,
    "matter-stream": matterStream,
    "tidal-stream": tidalStream
  });
})();
