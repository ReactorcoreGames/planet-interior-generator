/* Rupture — wedges torn out of a body's outer layers.
 *
 * MACHINE-WORLDS.md § "Hull integrity": how much of the outer structure is
 * missing. The spec meant it to reuse a zone `remove: true` that was never
 * built, so this is a GENERAL STRUCTURE FEATURE instead (D249), declared on
 * the archetype and driven by a named parameter:
 *
 *   rupture: {
 *     param: "cohesion",    the dial; the cut opens as it FALLS
 *     start: 0.92,          at or above this, no cut at all
 *     depth: [lo, hi],      how far in the floor lies (1 - radius), at the
 *                           onset and at 0
 *     width: [lo, hi],      the half-angle at the surface, radians, likewise
 *     count: [lo, hi],      how many wounds, rolled per body (default one)
 *     edge: "torn",         the style of the cut faces (js/gen/woundedge.js)
 *     pipes: [role, ...]    the layers whose cut faces show severed pipe
 *   }
 *
 * SEVERAL WOUNDS, ONE MAIN (the user, Session Z: one wound always was too
 * little variety). The first is the main wound at full size and opens first;
 * each other is 35-80% of its size, on its own bearing spread round the
 * body, and opens at its own point as the dial falls — so a lightly damaged
 * body may show the main wound alone and a wrecked one all of them.
 *
 * (Not `breach`: that name is the asteroid's crust breaking up through its
 * shell in sectors, gen/form.js. A different thing.)
 *
 * THE SHAPE IS A STEPPED FUNNEL. Each layer the cut passes through is torn
 * back to its own edge, the outer ones wider, every edge serrated, and the
 * floor ragged, so the cut layers still read as a cross-section of torn
 * structure rather than a clean pie slice. What shows through it is space,
 * as through the voids (the user, Session Z).
 *
 * STABLE AS THE DIAL MOVES. The bearing and each layer's widths come from
 * one stream drawn the same number of times whatever the depth, and the
 * serration is a hash of absolute radius, so dragging the dial grows the
 * same wound in place.
 *
 * Output, in body polar coordinates:
 *   { amount, edge, wounds: [{ angle, floor, outer, size, salt,
 *                              poly: [[r, a], ...],
 *                              cuts: [{ role, r0, r1, aL, aR }],
 *                              marks }] }
 * Each `poly` is a closed outline js/draw/rupture.js cuts out of the body;
 * `cuts` are the per-layer steps, and `marks` the torn edge built along
 * them (js/gen/woundedge.js, drawn by js/draw/woundedge.js). The main wound is
 * first. Null on any body declaring no `rupture`, or with its dial above
 * `start`. */

var CC = CC || {};

CC.Rupture = (function () {
  "use strict";

  var TAU = Math.PI * 2;
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  /* How far beyond the surface the cut reaches, so anything standing on the
   * hull at the wound (masts, sensor arrays) goes with it. */
  var REACH = 0.07;
  /* Radial sample pitch of a torn edge, and its serration, in body radius. */
  var STEP = 0.0035;
  var JAG = 0.0075;
  /* The floor's raggedness, in body radius, and its angular sample pitch. */
  var FLOOR_JAG = 0.016;
  var ARC_STEP = 0.012;

  function hash(x, salt) {
    var s = Math.sin(x * 91.7 + salt * 37.3) * 43758.5453;
    return s - Math.floor(s);
  }

  /* The cut's depth share, 0 at `start` and 1 at the bottom of the dial. */
  function amount(spec, params) {
    var v = params[spec.param];
    if (v === undefined) v = 0.5;
    var start = spec.start === undefined ? 0.92 : spec.start;
    if (v >= start) return 0;
    return clamp01((start - v) / start);
  }

  var MAX_WOUNDS = 5;

  /* One wound: the steps and the outline. `rolls` are its own draws. */
  function wound(body, angle, floor, W, outer, rolls) {
    /* THE STEPS. One per real layer the cut passes through, outermost first,
     * each from the layer's floor (its void's floor, for a hollow layer) to
     * its top; the outermost step runs on out to `outer`. Wider toward the
     * surface; left and right rolled apart, so the wound is not a mirror. */
    var cuts = [];
    var top = outer;
    for (var i = 0, n = 0; i < body.layers.length; i++) {
      var L = body.layers[i];
      if (L.outward) continue;
      var lo = L.gap ? L.gap.inner : L.inner;
      if (top <= floor) break;
      var r0 = Math.max(floor, lo);
      var mid = clamp01(((r0 + Math.min(top, 1)) / 2 - floor) / Math.max(1e-3, 1 - floor));
      var R = rolls[n++ % rolls.length];
      var f = 0.40 + 0.60 * Math.pow(mid, 0.8);
      cuts.push({ role: L.role, r0: r0, r1: top,
                  aL: W * f * lerp(0.80, 1.15, R[0]),
                  aR: W * f * lerp(0.80, 1.15, R[1]) });
      top = lo;
    }
    if (!cuts.length) return null;

    /* THE OUTLINE: up the right edge, across the top, down the left edge,
     * back along the floor. An edge is serrated by a hash of absolute
     * radius, so its teeth stay put as the floor moves; a step between two
     * layers is a horizontal run at the boundary. */
    var salt = Math.floor(angle * 1000);
    function edge(side, k) {
      var pts = [];
      for (var c = cuts.length - 1; c >= 0; c--) {
        var C = cuts[c], w = side > 0 ? C.aR : C.aL;
        var k0 = Math.ceil(C.r0 / STEP), k1 = Math.floor(C.r1 / STEP);
        var rs = [C.r0];
        for (var q = k0; q <= k1; q++) rs.push(q * STEP);
        rs.push(C.r1);
        for (var j = 0; j < rs.length; j++) {
          var rr = rs[j];
          var jag = (hash(Math.round(rr / STEP), salt + k) - 0.5) * 2 * JAG;
          pts.push([rr, angle + side * (w + jag / Math.max(0.05, rr))]);
        }
      }
      return pts;
    }
    var right = edge(1, 1);
    var left = edge(-1, 2).reverse();
    var poly = right;
    /* Across the top, outside the body, from the right edge to the left. */
    var aR = right[right.length - 1][1], aL = left[0][1];
    var nTop = Math.max(2, Math.ceil(Math.abs(aR - aL) / ARC_STEP));
    for (var k = 1; k < nTop; k++) poly.push([outer, lerp(aR, aL, k / nTop)]);
    poly = poly.concat(left);
    /* The floor, ragged, from the left edge back to the right. */
    var fL = left[left.length - 1][1], fR = right[0][1];
    var nF = Math.max(2, Math.ceil(Math.abs(fR - fL) * floor / (ARC_STEP * 0.5)));
    for (k = 1; k < nF; k++) {
      var fa = lerp(fL, fR, k / nF);
      var jf = (hash(Math.round(fa * 400), 3) - 0.5) * 2 * FLOOR_JAG *
               Math.sin(Math.PI * k / nF);
      poly.push([Math.max(0.02, floor + jf), fa]);
    }
    return { angle: angle, floor: floor, outer: outer, poly: poly, cuts: cuts,
             salt: salt };
  }

  /* The bearing of a wound's torn edge at radius r, exactly as the outline
   * draws it (the same serration), for the marks along it
   * (js/gen/woundedge.js). `side` +1 is the edge clockwise of the bearing,
   * -1 the other. At a step between two layers both cuts meet r; `inner`
   * picks the deeper, narrower one. Null where no cut reaches r. */
  function edgeAt(w, side, r, inner) {
    var C = null;
    for (var i = 0; i < w.cuts.length; i++) {
      var c = w.cuts[i];
      if (r >= c.r0 - 1e-9 && r <= c.r1 + 1e-9) { C = c; if (!inner) break; }
    }
    if (!C) return null;
    var jag = (hash(Math.round(r / STEP), w.salt + (side > 0 ? 1 : 2)) - 0.5) * 2 * JAG;
    return w.angle + side * ((side > 0 ? C.aR : C.aL) + jag / Math.max(0.05, r));
  }

  /* Whether (r, a) lies inside a wound: above its floor and between its
   * edges. The floor's raggedness is ignored. */
  function inside(w, r, a) {
    if (r < w.floor || r > w.cuts[0].r1) return false;
    var d = ((a - w.angle) % TAU + TAU * 1.5) % TAU - TAU / 2;
    var e = edgeAt(w, d >= 0 ? 1 : -1, r, true);
    return e !== null && Math.abs(d) < Math.abs(e - w.angle);
  }

  /* `extras` is { pillars, conduits } from the detail stage, for the
   * torn edge. */
  function build(archetype, body, params, seed, extras) {
    var spec = archetype && archetype.rupture;
    if (!spec) return null;
    var r = CC.RNG.stream(seed, "detail/rupture");
    /* Every draw comes first, whatever the amount, so the wounds grow in
     * place as the dial moves. */
    var cnt = spec.count || [1, 1];
    var n = Math.min(MAX_WOUNDS, Math.round(lerp(cnt[0], cnt[1], r())));
    var start = r() * TAU;
    var plan = [];
    for (var w = 0; w < MAX_WOUNDS; w++) {
      var p = { jitter: r(), size: r(), opens: r(), rolls: [] };
      for (var k = 0; k < 12; k++) p.rolls.push([r(), r()]);
      plan.push(p);
    }
    var t = amount(spec, params);
    if (t <= 0) return null;

    var outer = 1 + REACH;
    var wounds = [];
    for (w = 0; w < n; w++) {
      var P = plan[w];
      /* Spread round the body: evenly, each nudged by up to a fifth of the
       * spacing. The main wound opens first and is full size. */
      var angle = start + (w + (P.jitter - 0.5) * 0.4) * TAU / n;
      var size = w === 0 ? 1 : lerp(0.35, 0.80, P.size);
      var opens = w === 0 ? 0 : lerp(0.08, 0.65, P.opens);
      var tw = clamp01((t - opens) / (1 - opens));
      if (tw <= 0) continue;
      var floor = 1 - size * lerp(spec.depth[0], spec.depth[1], tw);
      var W = size * lerp(spec.width[0], spec.width[1], tw);
      var made = wound(body, ((angle % TAU) + TAU) % TAU, floor, W, outer, P.rolls);
      if (made) { made.size = size; wounds.push(made); }
    }
    if (!wounds.length) return null;
    var out = { amount: t, edge: spec.edge || "torn", wounds: wounds };
    /* The marks along each cut face, in the style the archetype names
     * (js/gen/woundedge.js). */
    for (w = 0; w < wounds.length; w++) {
      wounds[w].marks = CC.WoundEdge.build(out.edge, body, wounds[w], spec, params, extras || {});
    }
    return out;
  }

  return { build: build, amount: amount, edgeAt: edgeAt, inside: inside };
})();
