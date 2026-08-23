/* Small shared numeric helpers.
 * Ported from archive/v2/src/core/math.js, translated out of ES module syntax. */

var CC = CC || {};

CC.Math = (function () {
  "use strict";

  var TAU = Math.PI * 2;

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* Map v from [inLo, inHi] onto [outLo, outHi], clamped to the output range. */
  function remap(v, inLo, inHi, outLo, outHi) {
    if (inHi === inLo) return outLo;
    var t = clamp((v - inLo) / (inHi - inLo), 0, 1);
    return outLo + (outHi - outLo) * t;
  }

  /* Smoothstep 0..1 — used wherever a hard threshold would band visibly. */
  function smoothstep(edge0, edge1, x) {
    if (edge1 === edge0) return x < edge0 ? 0 : 1;
    var t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; }
  function rrange(rng, lo, hi) { return lo + rng() * (hi - lo); }
  function rint(rng, lo, hi) { return Math.floor(lo + rng() * (hi - lo + 1)); }

  /* Fisher-Yates on a copy; used to draw N distinct items from a pool. */
  function shuffled(rng, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pickN(rng, arr, n) {
    return shuffled(rng, arr).slice(0, Math.min(n, arr.length));
  }

  /* Round to a sensible number of significant digits for display. */
  function sig(v, digits) {
    digits = digits === undefined ? 3 : digits;
    if (v === 0) return 0;
    var mag = Math.floor(Math.log10(Math.abs(v)));
    var f = Math.pow(10, digits - 1 - mag);
    return Math.round(v * f) / f;
  }

  /* Shallow merge: a copy of `base` with `over` applied on top.
   *
   * Here rather than in either caller because two of them had grown their own
   * identical copy — main.js overriding a setting for a region render, and
   * ui/export.js overriding one for an export mode. Both are "the current
   * settings, but with these changed", which is one idea. */
  function merge(base, over) {
    var out = {}, k;
    for (k in base) {
      if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    }
    for (k in over) {
      if (Object.prototype.hasOwnProperty.call(over, k)) out[k] = over[k];
    }
    return out;
  }

  return {
    TAU: TAU,
    merge: merge,
    clamp: clamp,
    lerp: lerp,
    remap: remap,
    smoothstep: smoothstep,
    pick: pick,
    rrange: rrange,
    rint: rint,
    shuffled: shuffled,
    pickN: pickN,
    sig: sig
  };
})();
