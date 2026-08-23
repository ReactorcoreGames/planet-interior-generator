/* Zone geometry — arcs, placement, cross-fade and depth falloff.
 *
 * The angular MACHINERY, split out of gen/zones.js so that file can stay under
 * the 500-line rule and keep to one job: turning a recipe into fields a
 * consumer can sample. Nothing here knows what a zone MEANS — it answers
 * "where are the sectors and how much of each is at this angle", and the
 * answers are the same whether the recipe describes tidal locking, a polar
 * vortex or a binary companion.
 *
 * TWO RULES LIVE HERE:
 *
 * 1. PARTIAL LOCKING IS THE FLEX ARC. `resolveArcs` interpolates one zone's
 *    arc between "so wide the others are vestigial" and its authored value;
 *    the rest share what is left. That interpolation IS the dial, and there is
 *    deliberately no second code path for a partially-zoned body.
 *
 * 2. THE CROSS-FADE IS NOT OPTIONAL. `weightsAt` returns overlapping ramps
 *    that always sum to 1, so no boundary can ever be a step. A hard edge at a
 *    terminator reads as a rendering bug rather than as a terminator.
 *
 * Loaded before gen/zones.js, which consumes it.
 */

var CC = CC || {};

CC.ZoneGeom = (function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp, lerp = M.lerp;
  var TAU = M.TAU;

  function smoothstep(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }

  /* Shortest signed angular distance from `a` to `b`, in radians. */
  function angleDelta(a, b) {
    var d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  }

  /* ---- arc layout ------------------------------------------------------- */

  /* Resolve the zone arcs at a given intensity.
   *
   * THIS IS THE LOCK STRENGTH DIAL, AND IT IS THE WHOLE OF IT.
   *
   * A zone spec names one zone as `flex` — the twilight band on a locked
   * world. Its arc interpolates between `arcOpen` (at intensity 0, so wide
   * that the extremes are vestigial and the body reads as unzoned) and its
   * authored `arc` (at intensity 1). The remaining zones share what is left,
   * in proportion to their authored arcs, so the set always sums to 360.
   *
   *   twilight 340   effectively unzoned — a faint warm side
   *   twilight 240   3:2 resonance, Mercury-like
   *   twilight 160   slow libration, a wide habitable ribbon
   *   twilight  80   full lock, the classic three-zone world
   *   twilight  40   razor terminator
   *
   * One continuous parameter, no branches, and every value between those rows
   * is reachable — which is exactly why this is a slider and not five traits. */
  function resolveArcs(spec, intensity) {
    var zones = spec.zones;
    var i;

    /* Find ALL flex zones — a recipe may have two twilight bands (one on
     * each side of the terminator) that flex together. */
    var flexIdxs = [];
    for (i = 0; i < zones.length; i++) {
      if (zones[i].flex) flexIdxs.push(i);
    }

    var arcs = [];
    for (i = 0; i < zones.length; i++) arcs.push(zones[i].arc);

    if (flexIdxs.length > 0) {
      /* Total authored arc and total open arc across all flex zones. Each
       * flex zone interpolates its own arc proportionally. */
      var totalFlexAuthored = 0, totalFlexOpen = 0;
      for (i = 0; i < flexIdxs.length; i++) {
        var fz = zones[flexIdxs[i]];
        totalFlexAuthored += fz.arc;
        totalFlexOpen += (fz.arcOpen === undefined ? 340 : fz.arcOpen);
      }
      var totalFlexArc = lerp(totalFlexOpen, totalFlexAuthored, clamp(intensity, 0, 1));

      /* Distribute the total flex arc among the flex zones, keeping their
       * authored ratio. */
      for (i = 0; i < flexIdxs.length; i++) {
        var fz = zones[flexIdxs[i]];
        arcs[flexIdxs[i]] = totalFlexAuthored > 0
          ? fz.arc / totalFlexAuthored * totalFlexArc : totalFlexArc / flexIdxs.length;
      }

      /* Everything else shares the remainder, keeping the authored ratio. */
      var restAuthored = 0;
      for (i = 0; i < zones.length; i++) {
        if (!zones[i].flex) restAuthored += zones[i].arc;
      }
      var restAvail = Math.max(0, 360 - totalFlexArc);

      for (i = 0; i < zones.length; i++) {
        if (!zones[i].flex) {
          arcs[i] = restAuthored > 0 ? zones[i].arc / restAuthored * restAvail : 0;
        }
      }
    }

    /* Normalize to exactly 360 regardless of how the recipe was authored, so
     * a hand-written spec whose arcs do not quite sum cannot leave a gap the
     * body falls through. */
    var total = 0;
    for (i = 0; i < arcs.length; i++) total += arcs[i];
    if (total > 0) {
      for (i = 0; i < arcs.length; i++) arcs[i] = arcs[i] / total * 360;
    }

    return arcs;
  }

  /* Place the arcs around the circle, returning each zone's centre and half
   * width in radians. Zone 0 is centred on `offset`, which is where the
   * recipe's first zone points — the hot face for a locked world. */
  function layout(arcs, offsetDeg) {
    var out = [];
    var deg2rad = Math.PI / 180;

    /* Start so zone 0 is CENTRED on the offset rather than starting there:
     * "the hot face points this way" is what the control means. */
    var cursor = offsetDeg * deg2rad - arcs[0] * deg2rad / 2;

    for (var i = 0; i < arcs.length; i++) {
      var w = arcs[i] * deg2rad;
      out.push({ centre: cursor + w / 2, half: w / 2, arc: w });
      cursor += w;
    }
    return out;
  }

  /* ---- the field -------------------------------------------------------- */

  /* Weight of every zone at one angle, summing to 1.
   *
   * ONE FUNCTION, N OVERLAPPING RAMPS — deliberately the same shape as
   * draw/film.js's `zoneWeights`, because both answer "how much of each kind
   * is here" and both must produce gradients rather than steps. Each zone's
   * weight falls off from 1 at its centre to 0 at `blend` past its own edge;
   * normalizing at the end makes the sum exactly 1 without the ramps having to
   * be analytically complementary, which lets the blend width be authored
   * freely. */
  function weightsAt(placed, blend, angle, out) {
    var i, sum = 0;

    for (i = 0; i < placed.length; i++) {
      var p = placed[i];
      var d = Math.abs(angleDelta(p.centre, angle));

      /* Distance from the zone's edge, in units of the fade width. The fade
       * is a fraction of the zone's OWN arc, so a narrow twilight band gets a
       * proportionally narrow terminator rather than one wider than itself. */
      var fade = Math.max(1e-6, p.half * blend * 2);
      var w = smoothstep((p.half + fade * 0.5 - d) / fade);

      out[i] = w;
      sum += w;
    }

    /* No zone claims this angle — possible only if blend is tiny and the
     * angle sits exactly on a seam. Fall back to the nearest. */
    if (sum < 1e-6) {
      var best = 0, bestD = Infinity;
      for (i = 0; i < placed.length; i++) {
        var dd = Math.abs(angleDelta(placed[i].centre, angle));
        if (dd < bestD) { bestD = dd; best = i; }
      }
      for (i = 0; i < placed.length; i++) out[i] = (i === best) ? 1 : 0;
      return out;
    }

    for (i = 0; i < placed.length; i++) out[i] /= sum;
    return out;
  }

  /* ---- depth falloff ---------------------------------------------------- */

  /* How much of the zone effect a layer at a given declared depth receives.
   *
   * `anchor` lists the roles the zone applies to, outermost first. The
   * outermost anchored layer takes full strength and deeper ones take
   * progressively less. Below the anchor list the effect does not stop dead:
   * it decays to a small residue, because TRAIT-SYSTEM.md is explicit that a
   * deeply zoned world with a subtly asymmetric mantle is more interesting
   * than one where the effect halts at the crust — and tidal heating makes it
   * defensible.
   *
   * `depth` here is the layer's index in the archetype's DECLARED order, the
   * same quantity gen/palette.js colours from. Using declared order rather
   * than measured radius is D12's rule: a deepening ocean must not change how
   * strongly the mantle is zoned. */
  function depthFalloff(spec, role, order) {
    var anchors = spec.anchor || [];
    var idx = order.indexOf(role);

    /* Find the deepest anchored role that actually exists in this stack. */
    var deepest = -1;
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      /* "surface" is the reserved token the structure stage already uses: it
       * means whatever the outermost real layer turned out to be, so a zone
       * anchored to it works on a desert world and an ocean world alike
       * without either being a special case. */
      if (a === "surface") continue;
      var ai = order.indexOf(a);
      if (ai > deepest) deepest = ai;
    }
    if (deepest < 0) deepest = 0;

    var residue = spec.residue === undefined ? 0.12 : spec.residue;
    if (idx < 0) return residue;

    /* THE FALLOFF IS STEEP, AND THAT IS THE WHOLE POINT.
     *
     * A first version eased from 1.0 to 0.55 across the anchor list and the
     * result was a body whose MANTLE carried the terminator — simply because
     * the mantle is the largest area on the disc, so even a half-strength
     * tint there outweighed a full-strength one on the thin outer bands.
     * The picture said "this world's interior is lopsided", which is not
     * what tidal locking is.
     *
     * Surface phenomena belong at the surface. The anchored layers hold near
     * full strength and everything below drops away fast, so the effect is
     * concentrated exactly where a reader expects to see a dayside and a
     * nightside — and the deep interior keeps only the faint asymmetry that
     * makes a zoned world more interesting than one where the effect stops
     * dead at the crust. */
    if (idx <= deepest) {
      if (deepest === 0) return 1;
      /* Held high across the anchored layers rather than ramping down them:
       * the atmosphere, the sea and the crust are all "the surface" as far as
       * this is concerned. */
      return lerp(1, 0.86, idx / deepest);
    }

    var below = order.length - 1 - deepest;
    if (below <= 0) return residue;

    /* Cubed, so the first layer below the anchor list already loses most of
     * the effect. A linear or smoothstepped decay leaves the mantle — the
     * layer immediately below the crust and by far the largest — carrying
     * enough tint to dominate the picture. */
    var t = (idx - deepest) / below;
    var k = 1 - Math.pow(1 - t, 3);
    return lerp(0.86, residue, k);
  }
  return {
    smoothstep: smoothstep,
    angleDelta: angleDelta,
    resolveArcs: resolveArcs,
    layout: layout,
    weightsAt: weightsAt,
    depthFalloff: depthFalloff
  };
})();
