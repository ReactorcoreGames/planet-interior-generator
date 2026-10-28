/* Wound debris — the field of torn structure drifting out of a rupture
 * (js/gen/woundedge.js's torn style asks for it; js/draw/wounddebris.js
 * draws it).
 *
 * A cone of pieces spilling out of the wound's mouth into space, widening
 * as it goes, densest at the mouth, plus a thinner scatter still inside the
 * wound. Three size tiers, mostly the smallest and faintest, because
 * density is the thesis:
 *
 *   speck   a point of grit, faint
 *   shard   a torn sliver of plate, a few vertices
 *   chunk   a lump of structure, rare, near the mouth
 *
 * Each piece is a piece of SOME cut layer, picked by how much of that layer
 * the wound tore out, and takes that layer's colour.
 *
 * STABLE AS THE DIAL MOVES. No stream: piece i of a tier is a hash of i and
 * the wound, placed RELATIVE to the wound (a share of its mouth, a share of
 * its drift), so as the wound grows the same pieces move out with it and
 * the bigger wound adds pieces past the old count rather than reshuffling.
 * Counts from Detail density and the wound's size, never pixels.
 *
 * `sparks` builds the warning-coloured sparks, fire and embers, below.
 *
 * Every length in body radius. */

var CC = CC || {};

CC.WoundDebris = (function () {
  "use strict";

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function hash(x, salt) {
    var s = Math.sin(x * 12.9898 + salt * 78.233) * 43758.5453;
    return s - Math.floor(s);
  }

  /* Per tier: count at Detail density 1 and scale 1, the cap, size range,
   * alpha range, and how far out it may drift (share of the drift). */
  var TIERS = [
    { n: 700, cap: 1600, size: [0.0010, 0.0026], alpha: [0.30, 0.70], reach: 1.0 },
    { n: 220, cap: 500, size: [0.0028, 0.0070], alpha: [0.55, 0.90], reach: 0.85 },
    { n: 16, cap: 40, size: [0.0070, 0.0150], alpha: [0.90, 1.0], reach: 0.45 }
  ];
  /* The share of each tier left inside the wound rather than spilled. */
  var INSIDE = 0.22;
  /* How far down the wound, as a share of its depth, the spill begins. */
  var SPILL_FROM = 0.45;

  /* Which layer a piece came from: each cut weighted by the material it
   * lost (its step's height less its void, times the step's width). */
  function sources(body, w) {
    var L = {};
    for (var i = 0; i < body.layers.length; i++) L[body.layers[i].role] = body.layers[i];
    var out = [], total = 0;
    for (i = 0; i < w.cuts.length; i++) {
      var c = w.cuts[i], lay = L[c.role];
      if (!lay) continue;
      var h = Math.min(c.r1, lay.outer) - Math.max(c.r0, lay.inner, w.floor);
      if (h <= 0) continue;
      var wt = h * (c.aL + c.aR) * Math.min(c.r1, lay.outer);
      total += wt;
      out.push({ role: c.role, at: total });
    }
    for (i = 0; i < out.length; i++) out[i].at /= total || 1;
    return out;
  }

  function pick(src, u) {
    for (var i = 0; i < src.length; i++) if (u <= src[i].at) return src[i].role;
    return src.length ? src[src.length - 1].role : null;
  }

  function build(body, w, params, surface) {
    var density = params.detailDensity === undefined ? 0.65 : params.detailDensity;
    var src = sources(body, w);
    if (!src.length) return [];
    var top = Math.min(surface, w.cuts[0].r1);
    var eR = CC.Rupture.edgeAt(w, 1, top - 1e-4, true);
    var eL = CC.Rupture.edgeAt(w, -1, top - 1e-4, true);
    if (eR === null || eL === null) return [];
    var half = Math.abs(eR - eL) / 2;
    var depth = surface - w.floor;
    /* How far the field drifts, and how big it is, from the wound's own
     * size: a deep wide wound throws more, further. */
    var drift = 0.05 + 0.35 * depth + 0.25 * half * surface;
    var scale = clamp(0.35 + 1.2 * depth + 0.8 * half * surface, 0.35, 2.0);
    var dk = lerp(0.45, 1.3, density);
    var out = [];
    for (var t = 0; t < TIERS.length; t++) {
      var T = TIERS[t];
      var n = Math.min(T.cap, Math.round(T.n * dk * scale));
      var salt = w.salt * 7 + t * 1009;
      for (var i = 0; i < n; i++) {
        var u = hash(i, salt), v = (hash(i, salt + 1) + hash(i, salt + 2)) / 2;
        var r, a, far = 0;
        if (hash(i, salt + 3) < INSIDE) {
          /* Still inside the wound, between its edges at that depth. */
          r = lerp(w.floor + 0.004, top, u);
          var iR = CC.Rupture.edgeAt(w, 1, r, true), iL = CC.Rupture.edgeAt(w, -1, r, true);
          if (iR === null || iL === null) continue;
          a = lerp(iL, iR, lerp(0.08, 0.92, v));
        } else {
          /* Spilled: densest at the mouth, the cone widening outward. It
           * starts partway down the wound, so the field pours out of it
           * rather than beginning on the line where the surface was. */
          far = Math.pow(u, 1.25) * T.reach;
          var from = surface - SPILL_FROM * depth;
          r = from + (surface + drift - from) * far;
          if (r < top) {
            var sR = CC.Rupture.edgeAt(w, 1, r, true), sL = CC.Rupture.edgeAt(w, -1, r, true);
            if (sR === null || sL === null) continue;
            a = lerp(sL, sR, lerp(0.06, 0.94, v));
          } else {
            a = w.angle + (v - 0.5) * 2 * half * (0.85 + 0.9 * far);
          }
          far = Math.max(0, (r - surface) / Math.max(1e-3, drift));
        }
        var size = lerp(T.size[0], T.size[1], Math.pow(hash(i, salt + 4), 1.5));
        out.push({ tier: t, r: r, a: a, size: size,
                   rot: hash(i, salt + 5) * Math.PI * 2,
                   role: pick(src, hash(i, salt + 6)),
                   tone: hash(i, salt + 7),
                   alpha: lerp(T.alpha[0], T.alpha[1], hash(i, salt + 8)) * (1 - 0.55 * far),
                   seed: hash(i, salt + 9) });
      }
    }
    return out;
  }

  /* SPARKS AND FIRE, in the warning colour, only where there is power to
   * burn: each is gated by its layer's Operational status
   * (`CC.Activity.gate`, js/gen/activity.js), keyed on something that does
   * not move as the wound grows (its absolute radius and side, or its
   * index), so they light in place as the dial rises. A derelict wound is
   * cold and dark; at 0% there are none. The hive adds more past the
   * default.
   *
   *   0 spark    a hot point on a cut face, just off it into the gap
   *   1 fire     a soft glow burning on the rim
   *   2 streak   an ember flying out with the debris, a short trail */
  var SPARK_PITCH = 0.0045, SPARK_KEEP = 0.30;
  var FIRE_PITCH = 0.016, FIRE_KEEP = 0.40;
  var STREAKS = 50;

  function sparks(body, w, params, surface) {
    var density = params.detailDensity === undefined ? 0.65 : params.detailDensity;
    var dk = lerp(0.6, 1.25, density);
    var L = {};
    for (var i = 0; i < body.layers.length; i++) L[body.layers[i].role] = body.layers[i];
    var out = [];
    function lit(lay, x, y, salt) {
      return lay ? CC.Activity.gate(lay, x, y, salt) : 1;
    }
    for (var ci = 0; ci < w.cuts.length; ci++) {
      var c = w.cuts[ci], lay = L[c.role];
      if (!lay) continue;
      var lo = Math.max(c.r0, lay.inner, w.floor), hi = Math.min(c.r1, lay.outer);
      if (hi <= lo) continue;
      var busy = CC.Activity.busy(lay);
      for (var s = -1; s <= 1; s += 2) {
        var salt = w.salt * 5 + ci * 71 + (s > 0 ? 0 : 37);
        var q, r, a, g;
        for (q = Math.ceil(lo / SPARK_PITCH); q <= Math.floor(hi / SPARK_PITCH); q++) {
          if (hash(q, salt) > Math.min(0.9, SPARK_KEEP * dk * busy)) continue;
          r = (q + (hash(q, salt + 1) - 0.5) * 0.8) * SPARK_PITCH;
          if (r < lo || r > hi) continue;
          g = lit(lay, r, s, 83);
          if (!g) continue;
          a = CC.Rupture.edgeAt(w, s, r, true);
          if (a === null) continue;
          var off = lerp(0.001, 0.010, Math.pow(hash(q, salt + 2), 2));
          out.push({ kind: 0, role: c.role, r: r, a: a - s * off / r,
                     size: lerp(0.0008, 0.0022, hash(q, salt + 3)),
                     b: (g === 2 ? 0.45 : 1) * lerp(0.55, 1, hash(q, salt + 4)) });
        }
        for (q = Math.ceil(lo / FIRE_PITCH); q <= Math.floor(hi / FIRE_PITCH); q++) {
          if (hash(q, salt + 9) > Math.min(0.9, FIRE_KEEP * dk * busy)) continue;
          r = (q + (hash(q, salt + 10) - 0.5) * 0.8) * FIRE_PITCH;
          if (r < lo || r > hi) continue;
          if (lit(lay, r, s, 89) !== 1) continue;
          a = CC.Rupture.edgeAt(w, s, r, true);
          if (a === null) continue;
          out.push({ kind: 1, role: c.role, r: r, a: a,
                     size: lerp(0.005, 0.016, Math.pow(hash(q, salt + 11), 1.5)),
                     b: lerp(0.5, 1, hash(q, salt + 12)) });
        }
      }
    }
    /* Embers flying out with the debris, near the mouth, trailing back
     * toward the wound. */
    var top = Math.min(surface, w.cuts[0].r1);
    var eR = CC.Rupture.edgeAt(w, 1, top - 1e-4, true);
    var eL = CC.Rupture.edgeAt(w, -1, top - 1e-4, true);
    var src = sources(body, w);
    if (eR === null || eL === null || !src.length) return out;
    var half = Math.abs(eR - eL) / 2, depth = surface - w.floor;
    var drift = 0.05 + 0.35 * depth + 0.25 * half * surface;
    var n = Math.round(STREAKS * dk * clamp(0.35 + 1.2 * depth + 0.8 * half * surface, 0.35, 2.0) *
                       CC.Activity.busy(L[w.cuts[0].role]));
    var ss = w.salt * 11 + 7;
    for (i = 0; i < n; i++) {
      var role = pick(src, hash(i, ss));
      if (lit(L[role], i, w.salt, 97) !== 1) continue;
      var far = Math.pow(hash(i, ss + 1), 1.6) * 0.7;
      var v = (hash(i, ss + 2) + hash(i, ss + 3)) / 2;
      out.push({ kind: 2, role: role,
                 r: surface - 0.25 * depth + (drift + 0.25 * depth) * far,
                 a: w.angle + (v - 0.5) * 2 * half * (0.6 + 0.9 * far),
                 size: lerp(0.0008, 0.0016, hash(i, ss + 4)),
                 len: lerp(0.004, 0.016, hash(i, ss + 5)),
                 b: lerp(0.5, 1, hash(i, ss + 6)) * (1 - 0.5 * far) });
    }
    return out;
  }

  return { build: build, sparks: sparks };
})();
