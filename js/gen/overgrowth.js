/* Overgrowth — growth reclaiming a built body's hull (js/draw/overgrowth.js
 * draws it).
 *
 * A GENERAL STRUCTURE FEATURE, declared on an archetype or switched on by a
 * trait's `sets` (the machine world's Overgrown, gen/traitsets.js):
 *
 *   overgrowth: {
 *     cover: [lo, hi],   the share of the hull's outer face grown over, at
 *                        Detail density 0 and 1: patches to most of it
 *     proud: h,          how far a mat stands off the hull at its thickest
 *     creep: d,          how far its fingers reach down the cut face
 *     hang: n,           tendrils hung from the outer void's ceiling at full
 *                        cover, under the mats
 *     pool: h            a mound's height on a wound's floor and ledges
 *     wither: [lo, hi]   the body's activity level (gen/activity.js) at or
 *                        below which it is dead straw, and at or above which
 *                        it is lush
 *   }
 *
 * THE ONE IRREGULAR ORGANIC MARK on a body made of bands, slots and
 * repeated rectangles (MACHINE-WORLDS.md § "Exclusive traits"): lumpy mats,
 * wobbling tendrils, no two alike and nothing ruled. One natural hue per
 * body, moss or a rust bloom, so it reads against steel in either accent.
 *
 * WHERE: mats along the outermost layer's outer face, with fingers down its
 * cut face; tendrils down the walls of each shaft from its mouth, and from
 * the ceiling of the outermost layer's void wherever a mat is above; mounds
 * pooled on the floor and the ledges of every wound (`rupture`). Nothing is
 * looked up by role.
 *
 * WITHERED WHEN THE WORLD GOES DARK (the user, Session Z). Growth on a
 * working world can be deliberate, cover masking what the body is, so the
 * activity dial never changes how much there is; only its colour. As the
 * level falls through `wither` the hue drifts to dead straw and greys, so a
 * derelict's growth is dead and a running world's is tended. A body
 * declaring no `activity` is never withered.
 *
 * STABLE AS THE DIAL MOVES. The mats are where one smooth field round the
 * circumference rises above a threshold set by the cover, so more density
 * grows the same mats in place rather than rolling new ones.
 *
 * Output, in body polar coordinates:
 *   { hue: [h, s, v], wither: 0 lush .. 1 dead, moss: true moss / false rust,
 *     mats:     [{ pts: [[a, rOut, rIn], ...] }],
 *     tendrils: [{ pts: [[r, a, w], ...] }],
 *     pools:    [{ poly, pts: [[a, rTop], ...], base, dots }],
 *     dots:     [[r, a, size, tone], ...] }      tone 0 dark, 1 mid, 2 light
 * A pool carries its own dots, clipped to its wound with it.
 * Null on a body declaring no `overgrowth`. */

var CC = CC || {};

CC.Overgrowth = (function () {
  "use strict";

  var TAU = Math.PI * 2;
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function hash(x, salt) {
    var s = Math.sin(x * 127.1 + salt * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  /* Samples round the circumference: a quarter degree, fine enough for the
   * lumps to stay round at a 4000px zoom. */
  var CELLS = 1440;
  var DA = TAU / CELLS;
  /* Leaf dots per unit of body-space area, and the most a body carries. */
  var DOTS = 26000, MAX_DOTS = 9000;
  /* The three dot sizes, mostly the smallest (the density thesis). */
  var SIZES = [0.0009, 0.0016, 0.0028];

  /* The natural hues: moss, or a rust bloom. Rolled per body. */
  var HUES = [
    { w: 0.6, h: [84, 128], s: [0.42, 0.62], v: [0.44, 0.60] },
    { w: 0.4, h: [14, 30], s: [0.62, 0.80], v: [0.48, 0.64] }
  ];

  /* Dead growth: the hue it drifts to, and how much colour it keeps. */
  var STRAW = 40, STRAW_SAT = 0.30, STRAW_VAL = 0.80;

  /* 0 lush .. 1 withered, from the body's activity level. */
  function wither(spec, archetype, params) {
    var lv = CC.Activity.level(archetype, params);
    var w = spec.wither;
    if (lv === null || !w) return 0;
    var t = clamp01((lv - w[0]) / Math.max(1e-6, w[1] - w[0]));
    return 1 - t * t * (3 - 2 * t);
  }

  /* A smooth periodic field, -1..1, as a sum of sines at whole frequencies
   * in [f0, f1], so it closes round the circle. */
  function field(r, n, f0, f1) {
    var waves = [];
    for (var k = 0; k < n; k++) {
      var f = Math.round(lerp(f0, f1, r()));
      waves.push([f, r() * TAU, 1 / Math.sqrt(f)]);
    }
    var out = new Float32Array(CELLS), max = 1e-6, i;
    for (i = 0; i < CELLS; i++) {
      var v = 0, a = i * DA;
      for (k = 0; k < n; k++) v += Math.sin(a * waves[k][0] + waves[k][1]) * waves[k][2];
      out[i] = v;
      if (Math.abs(v) > max) max = Math.abs(v);
    }
    for (i = 0; i < CELLS; i++) out[i] /= max;
    return out;
  }

  function cellOf(a) { return ((Math.floor(a / DA) % CELLS) + CELLS) % CELLS; }

  function dot(dots, r, a, rnd) {
    var u = rnd();
    var size = SIZES[u < 0.70 ? 0 : (u < 0.95 ? 1 : 2)];
    var t = rnd();
    dots.push([r, a, size * lerp(0.75, 1.25, rnd()), t < 0.35 ? 0 : (t < 0.75 ? 1 : 2)]);
  }

  /* The mats: each run of cells where the field clears the threshold. */
  /* Rounded bumps, 0..1, `f` to the radian: |sin| under a square root is a
   * row of domes, the cushion outline of moss or a bloom. */
  function scallop(a, f, ph) { return Math.sqrt(Math.abs(Math.sin(a * f + ph))); }

  function mats(spec, hull, F, lump, finger, thr, ph) {
    var out = [];
    var start = -1;
    for (var i = 0; i < CELLS; i++) if (F[i] <= thr) { start = i; break; }
    if (start < 0) start = 0;
    var run = null;
    var maxCreep = hull.thickness * 0.85;
    for (var j = 1; j <= CELLS; j++) {
      var c = (start + j) % CELLS;
      if (F[c] > thr) {
        if (!run) run = { pts: [] };
        var e = clamp01((F[c] - thr) / 0.35);
        var a = c * DA;
        var dome = 0.55 * scallop(a, 190, ph[0]) + 0.45 * scallop(a, 67, ph[1]);
        var h = spec.proud * Math.sqrt(e) * (0.25 + 0.75 * dome) * (0.6 + 0.4 * lump[c]);
        /* Drips down the cut face, rounded at the tip like the domes. */
        var drip = Math.pow(finger[c], 3) * scallop(a, 120, ph[2]);
        var d = Math.min(maxCreep, spec.creep * (0.22 * Math.sqrt(e) + 0.78 * Math.pow(e, 0.6) * drip));
        run.pts.push([a, hull.outer + h, hull.outer - d]);
      } else if (run) {
        out.push(run);
        run = null;
      }
    }
    if (run) out.push(run);
    return out;
  }

  /* One hanging tendril: from (r0, a0) inward `len`, offset tangentially by
   * `off` (body space) and wobbling; `keep` clamps the offset (a shaft's
   * walls). */
  function tendril(r0, a0, len, off, rnd, keep) {
    var amp = lerp(0.002, 0.007, rnd()), freq = lerp(90, 220, rnd()), ph = rnd() * TAU;
    var w0 = lerp(0.0026, 0.0046, rnd());
    var pts = [];
    var n = Math.max(3, Math.ceil(len / 0.002));
    for (var k = 0; k <= n; k++) {
      var t = k / n, r = r0 - len * t;
      var o = off + amp * Math.sin(ph + len * t * freq) * Math.sqrt(t);
      if (keep) o = Math.max(-keep, Math.min(keep, o));
      pts.push([r, a0 + o / Math.max(r, 0.05), w0 * lerp(1, 0.25, t)]);
    }
    return { pts: pts };
  }

  function leaves(dots, T, rnd) {
    for (var k = 1; k < T.pts.length; k += 2) {
      if (rnd() < 0.45) continue;
      var P = T.pts[k], side = rnd() < 0.5 ? -1 : 1;
      dot(dots, P[0], P[1] + side * P[2] * 0.9 / Math.max(P[0], 0.05), rnd);
      if (rnd() < 0.3) dot(dots, P[0], P[1] - side * P[2] * 0.7 / Math.max(P[0], 0.05), rnd);
    }
  }

  /* Mounds on a wound's floor and ledges. A ledge is where one cut steps in
   * to the narrower one below it; the floor is under the innermost. Each
   * mound is clipped to the wound's outline when drawn, so its base can sit
   * below the ragged floor and fill the dips. */
  function pools(spec, rupture, cover) {
    var out = [];
    if (!rupture || !spec.pool) return out;
    for (var w = 0; w < rupture.wounds.length; w++) {
      var W = rupture.wounds[w], cuts = W.cuts;
      var spans = [];
      for (var c = 0; c < cuts.length; c++) {
        var C = cuts[c], N = cuts[c + 1];
        if (N) {
          spans.push([C.r0, W.angle + N.aR, W.angle + C.aR, 0]);
          spans.push([C.r0, W.angle - C.aL, W.angle - N.aL, 0]);
        } else {
          spans.push([W.floor, W.angle - C.aL, W.angle + C.aR, 1]);
        }
      }
      for (var s = 0; s < spans.length; s++) {
        var S = spans[s], salt = W.salt + s * 13;
        if (S[3] === 0 && hash(salt, 1) > lerp(0.45, 1, cover)) continue;
        var f = lerp(0.45, 1, cover) * lerp(0.7, 1, hash(salt, 2));
        var a0 = lerp(S[1], S[2], hash(salt, 3) * (1 - f)), a1 = a0 + (S[2] - S[1]) * f;
        /* The floor's teeth (gen/rupture.js) rise up to about this far. */
        var lift = S[3] ? 0.020 * (W.jag === undefined ? 1 : W.jag) : 0;
        var H = spec.pool * lerp(0.6, 1, hash(salt, 4));
        var n = Math.max(6, Math.ceil(Math.abs(a1 - a0) * S[0] / 0.002));
        var pts = [];
        for (var k = 0; k <= n; k++) {
          var t = k / n, a = lerp(a0, a1, t);
          var lump = 0.8 + 0.2 * Math.sin(t * 23 + hash(salt, 5) * TAU) * Math.sin(t * 7.3 + salt);
          pts.push([a, S[0] + lift + H * Math.pow(Math.sin(Math.PI * t), 0.45) * lump]);
        }
        out.push({ poly: W.poly, pts: pts, base: S[0] - 0.03 });
      }
    }
    return out;
  }

  function build(archetype, body, params, seed, rupture) {
    var spec = archetype && archetype.overgrowth;
    if (!spec) return null;
    var hull = null, i;
    for (i = 0; i < body.layers.length; i++) {
      if (!body.layers[i].outward) { hull = body.layers[i]; break; }
    }
    if (!hull) return null;
    var density = params.detailDensity === undefined ? 0.65 : params.detailDensity;
    var cv = spec.cover || [0.15, 0.85];
    var cover = lerp(cv[0], cv[1], density);

    var r = CC.RNG.stream(seed, "detail/overgrowth");
    var u = r(), K = HUES[u < HUES[0].w ? 0 : 1];
    var hue = [lerp(K.h[0], K.h[1], r()), lerp(K.s[0], K.s[1], r()), lerp(K.v[0], K.v[1], r())];
    var F = field(r, 7, 2, 11);
    var lumpF = field(r, 5, 30, 110), fingF = field(r, 5, 14, 46);
    var lump = new Float32Array(CELLS), finger = new Float32Array(CELLS);
    for (i = 0; i < CELLS; i++) { lump[i] = 0.5 + 0.5 * lumpF[i]; finger[i] = 0.5 + 0.5 * fingF[i]; }
    var sorted = Array.prototype.slice.call(F).sort(function (a, b) { return a - b; });
    var thr = sorted[Math.min(CELLS - 1, Math.floor((1 - cover) * CELLS))];

    var ph = [r() * TAU, r() * TAU, r() * TAU];
    /* After every draw, so the dial never moves a roll. */
    var wt = wither(spec, archetype, params);
    hue = [lerp(hue[0], STRAW, wt), hue[1] * lerp(1, STRAW_SAT, wt), hue[2] * lerp(1, STRAW_VAL, wt)];
    var out = { hue: hue, wither: wt, moss: K === HUES[0], mats: mats(spec, hull, F, lump, finger, thr, ph),
                tendrils: [], pools: pools(spec, rupture, cover), dots: [] };

    /* Leaves over every mat and mound, counted by area, never by pixels. */
    var rd = CC.RNG.stream(seed, "detail/overgrowth/dots");
    var dots = out.dots, m, k, P;
    for (m = 0; m < out.mats.length && dots.length < MAX_DOTS; m++) {
      var pts = out.mats[m].pts, area = 0;
      for (k = 0; k < pts.length; k++) area += (pts[k][1] - pts[k][2]) * DA * hull.outer;
      var nd = Math.round(area * DOTS);
      for (k = 0; k < nd && dots.length < MAX_DOTS; k++) {
        P = pts[Math.floor(rd() * pts.length)];
        /* Biased toward the top: the growth is thickest in the light. */
        var t = Math.pow(rd(), 0.7);
        dot(dots, lerp(P[2], P[1], t), P[0] + (rd() - 0.5) * DA, rd);
      }
    }
    for (m = 0; m < out.pools.length; m++) {
      var pp = out.pools[m].pts, top = pp[0][1];
      for (k = 0; k < pp.length; k++) top = Math.max(top, pp[k][1]);
      var pa = Math.abs(pp[pp.length - 1][0] - pp[0][0]) * top * (top - out.pools[m].base - 0.02) * 0.6;
      var np = Math.round(pa * DOTS);
      /* Its own list, drawn inside the wound's clip with the mound. */
      var own = out.pools[m].dots = [];
      for (k = 0; k < np && dots.length + own.length < MAX_DOTS; k++) {
        P = pp[Math.floor(rd() * pp.length)];
        dot(own, P[1] - Math.pow(rd(), 1.4) * 0.022, P[0], rd);
      }
    }

    /* TENDRILS. Down each shaft's walls from its mouth, more where a mat
     * sits over it; and a curtain from the outer void's ceiling under the
     * mats. Their own stream, so the dots above moving never reshuffles
     * them. */
    var rt = CC.RNG.stream(seed, "detail/overgrowth/tendrils");
    var bottom = hull.outer;
    for (i = 0; i < body.layers.length; i++) {
      var L = body.layers[i];
      if (L.shafted && !L.outward) bottom = Math.min(bottom, L.gap ? L.gap.inner : L.inner);
    }
    var shafts = body.shafts || [];
    for (var s = 0; s < shafts.length; s++) {
      var sh = shafts[s];
      var over = F[cellOf(sh.angle)] > thr - 0.15;
      var n = over ? Math.round(lerp(2, 7, cover)) : (rt() < cover ? 1 : 0);
      for (k = 0; k < n; k++) {
        var side = rt() < 0.5 ? -1 : 1;
        var off = side * sh.half * lerp(0.55, 0.92, rt());
        var len = Math.min(hull.outer - bottom, lerp(0.03, 0.20, Math.pow(rt(), 1.5)) * (0.5 + cover));
        var T = tendril(hull.outer, sh.angle, len, off, rt, sh.half * 0.95);
        out.tendrils.push(T);
        leaves(dots, T, rt);
      }
    }
    if (hull.gap) {
      var ceil = hull.gap.outer, gapH = hull.gap.outer - hull.gap.inner;
      var nv = Math.round((spec.hang || 0) * cover);
      for (k = 0, i = 0; k < nv && i < nv * 20; i++) {
        var a = rt() * TAU, rl = rt(), rw = rt();
        if (F[cellOf(a)] <= thr) continue;
        k++;
        var Tv = tendril(ceil, a, gapH * lerp(0.25, 0.95, Math.pow(rl, 1.6)), 0, rt, 0);
        for (var q = 0; q < Tv.pts.length; q++) Tv.pts[q][2] *= lerp(0.6, 1, rw);
        out.tendrils.push(Tv);
        leaves(dots, Tv, rt);
      }
    }
    return out;
  }

  return { build: build };
})();
