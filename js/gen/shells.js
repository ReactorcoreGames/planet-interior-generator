/* Shells — hollow layers, the voids beneath them, the pillars across those
 * voids and the access shafts cut down through them.
 *
 * A GENERAL LAYER PROPERTY, NOT A MACHINE-WORLD FEATURE. Any layer may declare
 *
 *   gapBelow: [min, max]   a true void between this layer and the next one
 *                          in, as a fraction of body radius. The layer's inner
 *                          edge is raised by it, so the layer becomes a band
 *                          floating clear of what it encloses. Rolled from the
 *                          layer's own stream, so one gap moving never
 *                          reshuffles another.
 *   pillars: [min, max]    radial supports across that void, evenly spaced,
 *                          counted at Detail density 0 and 1 for a void at the
 *                          body's surface. A void further in carries
 *                          proportionally fewer, so every gap keeps the same
 *                          spacing between supports — identical repeated units
 *                          are the artificial signal (MACHINE-WORLDS.md).
 *   shafted: true          the access shafts (below) cut through this layer.
 *   conduits: {...}        feeds through this layer's outer face; copied
 *                          onto the layer here, built by gen/conduits.js.
 *
 * and an archetype may declare
 *
 *   shafts: { count: [min, max], width: [min, max] }
 *
 * the routes down to the deeper levels: a few bearings shared by every
 * shafted layer, so one shaft reads as one route through several shells.
 * `width` is the slot's half-width in body radius, so a shaft is the same
 * width at every depth, the way a shaft would be.
 *
 * MACHINE-WORLDS.md specified a gap above AND below each shell. That double
 * counted wherever two shells meet and disagreed with its own table, so the
 * user agreed one void per layer, below it (Session Z).
 *
 * Resolved AFTER the stack is renormalized (gen/structure.js), because a gap
 * is a body-space width and must not be scaled by an ocean appearing. The
 * renderer draws a layer carrying `gap` or `slots` as a ring rather than a
 * disc: see js/draw/shells.js. */

var CC = CC || {};

CC.Shells = (function () {
  "use strict";

  var TAU = Math.PI * 2;
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* A shell may give up at most this share of its own thickness to its void.
   * Past it the shell is a hairline over a chasm, which reads as a drawing
   * error rather than as a structure. */
  var MAX_GAP_SHARE = 0.55;

  /* Raise each declaring layer's inner edge, record the void, and roll the
   * shafts. `layers` are the built, renormalized layers, outermost first;
   * `specs` maps role -> authored stack entry. Returns the shafts, or null. */
  function apply(layers, specs, archetype, params, seed) {
    var variation = params.thicknessVariation === undefined ? 0.7 : params.thicknessVariation;
    var any = false;

    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      var spec = specs[L.role];
      if (!spec || !spec.gapBelow || L.outward || i === layers.length - 1) continue;

      var r = CC.RNG.stream(seed, "structure/gap/" + L.role);
      /* Layer thickness variation narrows the roll toward the middle of its
       * range, as it does for every rolled frac. */
      var u = 0.5 + (r() - 0.5) * variation;
      var w = Math.min(lerp(spec.gapBelow[0], spec.gapBelow[1], u),
                       L.thickness * MAX_GAP_SHARE);
      var floor = L.inner;
      L.inner = floor + w;
      L.thickness = L.outer - L.inner;
      L.gap = { inner: floor, outer: L.inner, pillars: spec.pillars || null };
      any = true;
    }

    for (i = 0; i < layers.length; i++) {
      var sp = specs[layers[i].role];
      if (sp && sp.shafted) layers[i].shafted = true;
      /* Feeds through this layer's outer face (gen/conduits.js). */
      if (sp && sp.conduits) layers[i].conduits = sp.conduits;
      /* Cans standing on a board (gen/capacitors.js). */
      if (sp && sp.capacitors) layers[i].capacitors = sp.capacitors;
    }
    /* Which lights are on (gen/activity.js), for a body declaring `activity`. */
    CC.Activity.stamp(layers, specs, archetype, params);

    var sh = archetype.shafts;
    if (!sh || !any) return null;
    var rs = CC.RNG.stream(seed, "structure/shafts");
    var n = Math.round(lerp(sh.count[0], sh.count[1], rs()));
    /* Spread round the body rather than bunched: evenly, then each nudged by
     * up to a third of the spacing, so the set is planned but not ruled. */
    var start = rs() * TAU;
    var shafts = [];
    for (var k = 0; k < n; k++) {
      var a = start + (k + (rs() - 0.5) * 0.66) * TAU / n;
      shafts.push({ angle: ((a % TAU) + TAU) % TAU,
                    half: lerp(sh.width[0], sh.width[1], rs()) });
    }
    return shafts;
  }

  /* The angular half-width a shaft of body-space half-width `half` takes at
   * radius `r`. Clamped so a shaft near the centre cannot eat the whole ring. */
  function halfAngle(half, r) {
    return Math.min(0.45, half / Math.max(r, 1e-3));
  }

  /* Distance between two bearings, 0..PI. */
  function angDist(a, b) {
    var d = Math.abs(a - b) % TAU;
    return d > Math.PI ? TAU - d : d;
  }

  /* The bearings a shafted layer is cut at, as [{from, to}] in radians,
   * measured at the layer's middle so the slot's sides stay parallel-ish. */
  function slotsFor(layer, shafts) {
    if (!shafts || !layer.shafted) return null;
    var mid = (layer.inner + layer.outer) / 2;
    return shafts.map(function (s) {
      var h = halfAngle(s.half, mid);
      return { from: s.angle - h, to: s.angle + h };
    });
  }

  /* ---- pillars, a detail-stage product ---------------------------------
   *
   * Evenly spaced with near-zero jitter: hundreds of identical radial
   * supports are the density thesis and the regularity signal at once.
   * Counted from Detail density, so they live in the detail stage. None at
   * a shaft's bearing — the shaft is a route, and a route has nothing
   * standing in it. */
  function pillars(body, params, seed) {
    var density = params.detailDensity === undefined ? 0.65 : params.detailDensity;
    var out = [];
    for (var i = 0; i < body.layers.length; i++) {
      var L = body.layers[i];
      if (!L.gap || !L.gap.pillars) continue;
      var g = L.gap;
      var mid = (g.inner + g.outer) / 2;
      var n = Math.max(6, Math.round(lerp(g.pillars[0], g.pillars[1], density) * mid));
      var r = CC.RNG.stream(seed, "detail/pillars/" + L.role);
      var start = r() * TAU / n;
      for (var k = 0; k < n; k++) {
        var a = start + k * TAU / n + (r() - 0.5) * 0.04 * TAU / n;
        var blocked = false;
        if (body.shafts) {
          for (var s = 0; s < body.shafts.length; s++) {
            if (angDist(a, body.shafts[s].angle) <
                halfAngle(body.shafts[s].half * 1.6, mid)) { blocked = true; break; }
          }
        }
        if (blocked) continue;
        /* TWO TIERS: every fourth a braced girder, the rest plain struts.
         * One width read as a ruled hatching; a rhythm of major and minor
         * supports reads as engineering. */
        out.push({ kind: "truss", role: L.role, angle: a,
                   r0: g.inner, r1: g.outer,
                   width: (k % 4) ? 0.0032 : 0.0075, seed: r() });
      }
    }
    return out;
  }

  return { apply: apply, slotsFor: slotsFor, pillars: pillars,
           halfAngle: halfAngle, angDist: angDist };
})();
