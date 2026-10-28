/* Data pulses — the `pulse` element: light travelling along the circuit
 * board's traces (MACHINE-WORLDS.md § "Layer details", computation).
 *
 * ON THE ACTUAL TRACES. The circuit `texture` earlier in the same layer's
 * recipes notes the traces it laid (gen/claims.js `note`), and every pulse
 * here is a stretch of one of them, so a pulse turns where its trace jogs
 * and stops at its via. With no traces noted there is nothing to ride and
 * the element makes nothing.
 *
 * ONE ELEMENT PER LAYER, carrying every pulse, like `texture`. The plan's
 * size tiers say what kind of pulse, largest first:
 *
 *   comet    a long bright head with a tail fading back along the trace
 *   blip     the same, short
 *   train    a packet: 2-5 small dots at an even pitch, the board's
 *            regular rhythm
 *
 * Each pulse is lit in one of the body's three lights (draw/shellwalls.js
 * lightHsv): k 0 the accent, mostly; 1 cold white; 2 the warning colour,
 * rarely. A pulse runs toward the trace's far end, so its head is ahead.
 *
 *   pulses  [{ parts: [[[r, a]...] x 4], head: [r, a], k, w }]
 *           parts run tail to head; the primitive ramps their alpha
 *   dots    [[r, a, k]]  the trains' packets
 *
 * Lengths are in BODY RADIUS, so a pulse is the same length at every depth.
 * Drawn by draw/primitives/pulses.js.
 *
 * gen/elemgen.js, gen/claims.js and gen/materials.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  /* Tail length in body radius per size tier (gen/elemgen.js TIER_SIZE
   * order); the smallest tier is the trains. */
  var TAIL = [0.070, 0.050, 0.018, 0];

  /* A trace's legs with their body-space lengths. A leg along a track is an
   * arc; a jog between tracks is drawn straight (draw/primitives/
   * materials.js), so its length is the chord. */
  function legs(t) {
    var out = [], total = 0;
    for (var k = 1; k < t.pts.length; k++) {
      var p0 = t.pts[k - 1], p1 = t.pts[k], len;
      if (p0[0] === p1[0]) len = p0[0] * Math.abs(p1[1] - p0[1]);
      else {
        var x0 = p0[0] * Math.cos(p0[1]), y0 = p0[0] * Math.sin(p0[1]);
        var x1 = p1[0] * Math.cos(p1[1]), y1 = p1[0] * Math.sin(p1[1]);
        len = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
      }
      out.push({ p0: p0, p1: p1, len: len, at: total });
      total += len;
    }
    return { legs: out, len: total };
  }

  /* The point `s` along the trace, as [r, a]. Along a jog, r and a are
   * interpolated together, which on so short a leg is the straight line. */
  function at(T, s) {
    for (var i = 0; i < T.legs.length; i++) {
      var L = T.legs[i];
      if (s <= L.at + L.len || i === T.legs.length - 1) {
        var u = L.len > 0 ? Math.max(0, Math.min(1, (s - L.at) / L.len)) : 0;
        return [L.p0[0] + (L.p1[0] - L.p0[0]) * u, L.p0[1] + (L.p1[1] - L.p0[1]) * u];
      }
    }
    return T.legs[0].p0.slice();
  }

  /* The stretch s0..s1 as a point list, keeping every corner inside it. */
  function stretch(T, s0, s1) {
    var pts = [at(T, s0)];
    for (var i = 0; i < T.legs.length; i++) {
      var c = T.legs[i].at + T.legs[i].len;
      if (c > s0 && c < s1) pts.push(T.legs[i].p1.slice());
    }
    pts.push(at(T, s1));
    return pts;
  }

  function lightOf(rng) {
    var u = rng();
    return u < 0.70 ? 0 : (u < 0.94 ? 1 : 2);
  }

  CC.ElemGen.registerBuilder("pulse", function (recipe, layer, plan, count, rng) {
    var traces = CC.Claims.noted(layer, "traces");
    if (!traces || !traces.length) return [];
    var T = traces.map(legs).filter(function (x) { return x.len > 0; });
    if (!T.length) return [];
    var total = 0, i;
    for (i = 0; i < T.length; i++) total += T[i].len;
    /* A trace picked by length, so a long run carries more traffic. */
    function pick() {
      var u = rng() * total;
      for (var j = 0; j < T.length; j++) { u -= T[j].len; if (u <= 0) return T[j]; }
      return T[T.length - 1];
    }
    var pitch = CC.Materials.circuitPitch(layer);
    var el = {
      kind: "pulse", tier: 0, angle: 0,
      radius: layer.inner + layer.thickness / 2,
      inner: Math.max(0, layer.inner), outer: layer.outer,
      alpha: recipe.alpha ? recipe.alpha[0] : 0.9,
      tone: recipe.tone || "accent", pulses: [], dots: []
    };
    /* Past the default the board grows busier (gen/activity.js `busy`):
     * the extra traffic is a second pass after every tier's own, so the
     * pulses already there never move. */
    var extra = CC.Activity.busy(layer) - 1;
    var passes = plan.map(function (q) { return { tier: q.tier, count: q.count }; });
    if (extra > 0) plan.forEach(function (q) {
      passes.push({ tier: q.tier, count: Math.round(q.count * extra) });
    });
    for (var p = 0; p < passes.length; p++) {
      var tier = passes[p].tier;
      for (var n = 0; n < passes[p].count; n++) {
        var t = pick();
        if (TAIL[tier] > 0) {
          var tail = Math.min(t.len * 0.8, TAIL[tier] * (0.7 + 0.6 * rng()));
          var head = tail + (t.len - tail) * rng();
          var parts = [];
          for (var q = 0; q < 4; q++) {
            parts.push(stretch(t, head - tail * (1 - q / 4), head - tail * (1 - (q + 1) / 4)));
          }
          var hp = at(t, head), hk = lightOf(rng);
          /* Data flows only while the body is awake (gen/activity.js);
           * nothing runs on emergency power. */
          if (CC.Activity.gate(layer, hp[0], hp[1], 21) !== 1) continue;
          el.pulses.push({ parts: parts, head: hp, k: hk, w: tier <= 1 ? 1 : 0 });
        } else {
          /* A TRAIN: packets at an even pitch along the trace, the
           * board's own pitch, so the rhythm is the grid's. */
          var m = 2 + Math.floor(rng() * 4), gap = pitch * 0.8;
          var s0 = rng() * Math.max(0, t.len - gap * (m - 1));
          var k = lightOf(rng);
          var p0 = at(t, s0);
          if (CC.Activity.gate(layer, p0[0], p0[1], 22) !== 1) continue;
          for (var d = 0; d < m && s0 + d * gap <= t.len; d++) {
            var pt = at(t, s0 + d * gap);
            el.dots.push([pt[0], pt[1], k]);
          }
        }
      }
    }
    return [el];
  });
})();
