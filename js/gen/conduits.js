/* Conduits — straight runs crossing a layer boundary at right angles
 * (MACHINE-WORLDS.md § "Layer details": "a strong artificial cue").
 *
 * A GENERAL LAYER PROPERTY:
 *
 *   conduits: { count: [min, max], depth: [lo, hi], bridge: [lo, hi] }
 *
 * feeds entering the layer through its OUTER face from the layer above, each
 * reaching down to a depth in `depth` (0 the layer's inner edge, 1 its outer)
 * and plugged into the layer above at ITS inner edge, across the void
 * between them if there is one: by a short stub, or with `bridge` reaching
 * that share of the layer above's thickness. `count` is the most there may
 * be, at Detail density 0 and 1.
 *
 * DELIBERATE, NOT SCATTERED. First built across every boundary of the
 * machine world (~210 a body), it read as spam: it buried each layer's
 * identity and the voids (the user, Session Z). Laid over the reactor's
 * window blocks, too much again. Now two places, where the structure leaves
 * room: the reactor, down the gaps between its blocks, and the lowest void,
 * bridged between its pillars:
 *
 *   - DOWN THE OPEN GAPS. The bearings clear of every claim in the layer
 *     (the window blocks, gen/cellgrid.js) down to the shallowest depth
 *     form a few open gaps; a narrow one takes a run down its middle, a
 *     wide one two or three spaced evenly across it, the widest gaps
 *     first. Whole-circle claims (the containment rings) are passed
 *     through, sleeved, not stopped at.
 *   - EACH END AT ITS OWN DEPTH, rolled in `depth`. The bundle (a trunk of
 *     three pipes, a pair or a single line) is rolled, then stepped down
 *     until it fits that deep, since a gap between sectors narrows inward;
 *     only if no bundle fits is the run shortened.
 *   - BRIDGING (`bridge`): across a void, a run takes the middle of a gap
 *     between two of its pillars, the gaps picked at an even stride, and
 *     its upper end is shortened until clear of the claims above.
 *   - WITHIN (`within: true`, with `length: [lo, hi]`): runs lying wholly
 *     inside the layer between `depth`'s edges, crossing no face.
 *   - NEVER IN A SHAFT, on a layer the shafts cut.
 *   - `blend` (a canvas blend mode, default normal) and `opacity` (default
 *     1) sink a stream's runs into the layer they lie on, so the board's
 *     own runs sit IN it rather than shout over it (the user).
 *   - `scale` multiplies the pipe widths (default 1): the computation
 *     board's runs are drawn bolder, to hold their own across its width.
 *
 * `conduits` may be one entry or a list of them.
 *
 * Built after the layer details (gen/details.js) and drawn after the bands
 * (draw/scene.js), because a run belongs to two layers.
 *
 *   { role, angle, r0, r1, faces: [r...], n, w, tier }
 *     role   the layer's, for its colour
 *     r0,r1  the run's inner and outer ends
 *     faces  where it is sleeved: the layer's face, the face above it
 *            across a void, and every ring it crosses
 *
 * Drawn by draw/conduits.js. gen/shells.js and gen/claims.js must load
 * first. */

var CC = CC || {};

CC.Conduits = (function () {
  "use strict";

  var TAU = Math.PI * 2;
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* Per tier: pipes in the bundle, pipe width, and the share rolled. */
  var TIERS = [[3, 0.0050, 0.15], [2, 0.0040, 0.35], [1, 0.0030, 0.50]];
  /* Clearance kept round a run, in body radius. */
  var PAD = 0.0012;
  /* Runs sharing one wide gap are spaced about this far apart (body radius
   * at the gap's narrow end). */
  var SPREAD = 0.032;
  /* Bearing step when looking for the open gaps, in body radius. */
  var SCAN = 0.0012;

  function halfOf(T) { return T[0] * T[1] * 1.25 / 2; }

  /* The tiers with their pipe widths scaled by the spec's `scale`. */
  function tiersFor(spec) {
    var k = spec.scale || 1;
    return TIERS.map(function (T) { return [T[0], T[1] * k, T[2]]; });
  }

  function clear(layer, r0, r1, a, half) {
    var r = Math.max(0.02, r0);
    return !CC.Claims.taken(layer, { r0: r0, r1: r1, a0: a - half / r, a1: a + half / r }, PAD, true);
  }

  function inShaft(body, a, half, r) {
    if (!body.shafts) return false;
    for (var s = 0; s < body.shafts.length; s++) {
      var sh = body.shafts[s];
      if (CC.Shells.angDist(a, sh.angle) <
          CC.Shells.halfAngle(sh.half * 1.4, r) + (half + PAD) / Math.max(0.02, r)) return true;
    }
    return false;
  }

  /* The open gaps: runs of bearings where the smallest bundle fits from
   * the face down to `rTop`, as [{ a, width }] (width in body radius at
   * rTop), joined across zero. */
  function gaps(body, L, rTop) {
    var half = halfOf(TIERS[TIERS.length - 1]);
    var m = Math.ceil(TAU * L.outer / SCAN), step = TAU / m;
    var free = [];
    for (var k = 0; k < m; k++) {
      free.push(clear(L, rTop, L.outer, k * step, half) &&
                !(L.shafted && inShaft(body, k * step, half, rTop)));
    }
    var start = free.indexOf(false);
    if (start < 0) return [];
    var out = [], run = 0;
    for (var j = 1; j <= m; j++) {
      var i = (start + j) % m;
      if (free[i]) { run++; continue; }
      if (run) {
        var a = (start + j - run / 2 - 0.5) * step;
        out.push({ a: ((a % TAU) + TAU) % TAU, width: run * step * rTop });
      }
      run = 0;
    }
    return out;
  }

  /* The midpoints of the gaps between the pillars standing in a void,
   * [{ a, width }], width at radius `r`: first `n` of them at an even stride
   * round the body, so the runs fall on the pillars' rhythm, then every
   * other gap, for when the stride's own are blocked above. */
  function pillarGaps(props, n, r, rng) {
    var q, out = [];
    if (props.length < 2) {
      var ph = rng() * TAU;
      for (q = 0; q < n; q++) out.push({ a: ph + q * TAU / n, width: TAU * r / n });
      return out;
    }
    var G = props.length, k = Math.min(n, G), off = rng(), seen = {};
    function add(j) {
      if (seen[j]) return;
      seen[j] = true;
      var a0 = props[j], a1 = j + 1 < G ? props[j + 1] : props[0] + TAU;
      out.push({ a: (a0 + a1) / 2, width: (a1 - a0) * r });
    }
    for (q = 0; q < k; q++) add(Math.floor((q + off) * G / k) % G);
    var j0 = Math.floor(rng() * G);
    for (q = 0; q < G; q++) add((j0 + q) % G);
    return out;
  }

  /* WITHIN: runs lying wholly inside the layer, crossing no face, set
   * across the band between `depth`'s two edges at an even stride round
   * the body (each nudged up to a quarter of the stride), each a rolled
   * share `length` of that span at a rolled place in it, clear of the
   * layer's claims, boxed at both ends. The user's sketch for the
   * computation board, Session Z: the runs between board and reactor were
   * "almost perfect", and these complete it. */
  function within(body, L, spec, n, r, out) {
    var lo = L.inner + L.thickness * spec.depth[0], hi = L.inner + L.thickness * spec.depth[1];
    var len = spec.length || [0.3, 0.6];
    var TS = tiersFor(spec);
    var ph = r() * TAU;
    for (var q = 0; q < n; q++) {
      var a = ph + (q + (r() - 0.5) * 0.5) * TAU / n;
      var u = r(), t = 0;
      while (t < TS.length - 1 && u > TS[t][2]) { u -= TS[t][2]; t++; }
      var span = (hi - lo) * lerp(len[0], len[1], r());
      var r0 = lerp(lo, hi - span, r());
      if (L.shafted && inShaft(body, a, halfOf(TS[t]), r0)) continue;
      if (!clear(L, r0, r0 + span, a, halfOf(TS[t]))) continue;
      out.push({ role: L.role, angle: a, r0: r0, r1: r0 + span, faces: [],
                 n: TS[t][0], w: TS[t][1], tier: t, seed: r(),
                 opacity: spec.opacity === undefined ? 1 : spec.opacity,
                 blend: spec.blend || null });
    }
  }

  function build(body, params, seed) {
    var density = params.detailDensity === undefined ? 0.65 : params.detailDensity;
    var pillars = null;
    var out = [];
    for (var i = 0; i < body.layers.length; i++) {
      var L = body.layers[i];
      if (L.outward || !L.conduits) continue;
      var U = i > 0 && !body.layers[i - 1].outward ? body.layers[i - 1] : null;
      /* One entry or a list of them; each its own stream. */
      var specs = [].concat(L.conduits);
      for (var si = 0; si < specs.length; si++) {
      var spec = specs[si], T = L.thickness, TS = tiersFor(spec);
      var face = L.outer;
      var rDeep = L.inner + T * spec.depth[0], rTop = L.inner + T * spec.depth[1];
      var n = Math.round(lerp(spec.count[0], spec.count[1], density));
      var r = CC.RNG.stream(seed, "detail/conduits/" + L.role + (si ? "/" + si : ""));
      if (spec.within) { within(body, L, spec, n, r, out); continue; }
      /* The void between this layer and the one above, if any: the runs
       * cross it and enter that layer at its inner edge. */
      var roof = U ? U.inner : face;
      var slots = [];
      if (spec.bridge && U) {
        /* BRIDGING: down the middle of the gaps between the void's
         * pillars. */
        if (!pillars) pillars = CC.Shells.pillars(body, params, seed);
        var props = pillars.filter(function (p) { return p.role === U.role; })
          .map(function (p) { return ((p.angle % TAU) + TAU) % TAU; })
          .sort(function (x, y) { return x - y; });
        slots = pillarGaps(props, n, face, r).filter(function (S) {
          return !(U.shafted && inShaft(body, S.a, 0.004, roof));
        });
      } else {
        /* A wide gap takes two or three runs spaced evenly across it, a
         * narrow one a single run down its middle. */
        gaps(body, L, rTop).sort(function (x, y) { return y.width - x.width; })
          .forEach(function (G) {
            var k = Math.max(1, Math.min(3, Math.floor(G.width / SPREAD)));
            for (var j = 0; j < k; j++) {
              slots.push({ a: G.a + ((j + 0.5) / k - 0.5) * (G.width / rTop), width: G.width / k });
            }
          });
      }
      /* Rings passed through on the way down, for the sleeves. */
      var bands = CC.Claims.boxes(L).filter(function (b) {
        return Math.abs(b.a1 - b.a0) >= TAU - 1e-9;
      }).map(function (b) { return (b.r0 + b.r1) / 2; });
      var made = 0;
      for (var g = 0; g < slots.length && made < n; g++) {
        var a = slots[g].a;
        /* Its own depth first; then the rolled bundle, stepped down until
         * it fits that far (a gap between sectors narrows inward); only
         * then the run shortened. */
        var want = lerp(rDeep, rTop, r());
        /* A bridge must reach well up the layer above, at least half its
         * least share, so the bundle is stepped down until that is clear
         * too; failing even a single line, the gap is passed over. */
        var least = U ? (spec.bridge ? U.thickness * spec.bridge[0] * 0.5
                                     : Math.min(0.012, U.thickness * 0.15)) : 0;
        var u = r(), t0 = 0;
        while (t0 < TS.length - 1 && u > TS[t0][2]) { u -= TS[t0][2]; t0++; }
        var t = -1, r0 = rTop;
        for (var k = 0; k < 6 && t < 0; k++) {
          var d = lerp(want, rTop, k / 5);
          for (var tt = t0; tt < TS.length; tt++) {
            if (tt < TS.length - 1 && halfOf(TS[tt]) * 2 + PAD * 2 > slots[g].width) continue;
            if (clear(L, d, face, a, halfOf(TS[tt])) &&
                (!spec.bridge || !U || clear(U, roof, roof + least, a, halfOf(TS[tt])))) {
              t = tt; r0 = d; break;
            }
          }
        }
        if (t < 0) continue;
        var half = halfOf(TS[t]);
        /* Up into the layer above from its inner edge: a stub plugging it
         * in, or with `bridge` a share of that layer's thickness, shortened
         * until clear of its claims (the machinery's pipes, gears...). */
        var up = 0;
        if (U) {
          var reachUp = spec.bridge ? U.thickness * lerp(spec.bridge[0], spec.bridge[1], r()) : least;
          for (var m = 0; m < 6 && !up; m++) {
            var h = lerp(reachUp, least, m / 5);
            if (clear(U, roof, roof + h, a, half)) up = h;
          }
          if (!up && spec.bridge) continue;
        }
        out.push({ role: L.role, angle: a, r0: r0, r1: roof + up,
                   faces: (roof - face > 1e-4 ? [face, roof] : [face])
                     .concat(bands.filter(function (b) { return b > r0 && b < face - 0.006; })),
                   n: TS[t][0], w: TS[t][1], tier: t, seed: r(),
                   opacity: spec.opacity === undefined ? 1 : spec.opacity,
                 blend: spec.blend || null });
        made++;
      }
      }
      /* Each junction's status light on, dark or on emergency power, by
       * the body's activity (gen/activity.js). */
      for (var o = 0; o < out.length; o++) {
        if (out[o].power === undefined) out[o].power = CC.Activity.gate(L, out[o].r0, out[o].angle, 61);
      }
    }
    return out;
  }

  return { build: build };
})();
