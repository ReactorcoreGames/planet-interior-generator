/* The placement grammar's anchors: the bearings a trait's instances sit on, the
 * layer they attach to, and the depth they take across it.
 *
 * Split out of gen/traitroll.js, which passed the 500-line rule. Attached to
 * CC.TraitRoll; gen/traitroll.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp, lerp = M.lerp;
  var TAU = M.TAU;

  /* ---- the placement grammar -------------------------------------------- */

  /* Where a trait's instances sit around the body.
   *
   * `repeat` gives how many anchor points; `spacing` and `jitter` decide how
   * they are distributed; `mirror` reflects the set across the vertical axis;
   * `offset` rotates the whole thing afterwards. Returns angles in radians.
   *
   * MIRRORING IS ACROSS THE VERTICAL AXIS, which for a pole-up body means an
   * angle a maps to -a. A cap declared at 0 with mirror therefore lands on
   * both poles once the set is placed — that is the entire ice-cap
   * declaration, and it is why polar traits need no special handling. */
  function anchorAngles(trait, rng, zones) {
    var repeat = trait.repeat || [1, 1];
    var n = Math.max(1, Math.round(lerp(repeat[0], repeat[1], rng())));
    var spacing = trait.spacing || "random";
    var jitter = trait.jitter === undefined ? 0.3 : trait.jitter;

    var angles = [];
    var i;

    if (spacing === "even") {
      var step = TAU / n;
      for (i = 0; i < n; i++) {
        angles.push(step * i + (rng() - 0.5) * step * jitter);
      }
    } else if (spacing === "clustered") {
      /* A few centres, several instances around each. Clustering is what makes
       * deposits read as geology rather than as a scatter — material collects
       * where other material already is. */
      var centres = Math.max(1, Math.round(n / 2.4));
      var perCentre = Math.max(1, Math.round(n / centres));
      for (var c = 0; c < centres; c++) {
        var centre = rng() * TAU;
        for (i = 0; i < perCentre; i++) {
          angles.push(centre + (rng() - 0.5) * jitter * 1.4);
        }
      }
    } else {
      /* RANDOM, WITH AN OPTIONAL MINIMUM SEPARATION.
       *
       * Pure `rng() * TAU` is right for a field — debris and speckle SHOULD
       * clump, and two grains overlapping is invisible. It is wrong for a
       * trait whose instances are discrete OBJECTS: two gas-miner platforms
       * rolled a degree apart draw as one unreadable smudge, which is a
       * different failure from being close together.
       *
       * `minGap` is in degrees and is a rejection sample rather than a
       * relaxation pass — cheap, deterministic, and it degrades gracefully:
       * after a bounded number of tries it takes what it has rather than
       * looping, so an impossible request (twenty objects, forty degrees
       * apart) simply gets the best scatter available instead of hanging.
       *
       * Deliberately NOT even spacing. Even spacing reads as artificial, which
       * is right for a ring system and wrong for an industry that grew where
       * the gas was — the ask is "close together is fine, on top of each other
       * is not". */
      var gap = (trait.minGap || 0) * Math.PI / 180;
      for (i = 0; i < n; i++) {
        var a = rng() * TAU;
        if (gap > 0) {
          for (var tries = 0; tries < 12; tries++) {
            var clash = false;
            for (var q = 0; q < angles.length; q++) {
              var d = Math.abs(((a - angles[q] + Math.PI * 3) % TAU) - Math.PI);
              if (d < gap) { clash = true; break; }
            }
            if (!clash) break;
            a = rng() * TAU;
          }
        }
        angles.push(a);
      }
    }

    /* MIRRORING, AND WHY IT IS NOT A REFLECTION.
     *
     * TRAIT-SYSTEM.md describes `mirror` as "duplicated across the vertical
     * axis", whose obvious reading is angle -> -angle. For a pole-up body
     * that is wrong in exactly the case the field exists for: a cap pinned at
     * 0deg mirrors to -0deg, so BOTH copies land on the north pole a few
     * degrees apart and the south pole stays bare. That is what shipped
     * first, and it drew two overlapping caps at one end of the world.
     *
     * What the field is for is "the same feature at both ends", so a mirrored
     * instance is placed OPPOSITE: angle + 180. For an equatorial trait that
     * is the same thing a reflection would give; for a polar one it is the
     * difference between working and not. */
    if (trait.mirror) {
      var mirrored = [];
      for (i = 0; i < angles.length; i++) mirrored.push(angles[i] + Math.PI);
      angles = angles.concat(mirrored);
    }

    /* `offset` rotates the whole set. [0,0] pins it — which is what keeps ice
     * caps on the poles rather than letting them wander to the equator. */
    var off = trait.offset || [0, 360];
    var rot = lerp(off[0], off[1], rng()) * Math.PI / 180;
    for (i = 0; i < angles.length; i++) angles[i] += rot;

    /* ZONE BIAS. A trait may declare which zone its instances gather in — a
     * locked machine world puts its cities in the twilight band. Implemented
     * as rejection toward the zone rather than as a hard filter, so a trait
     * still appears (thinly) outside its favoured zone instead of vanishing
     * when the zone is narrow. */
    if (trait.zoneBias && zones) {
      for (i = 0; i < angles.length; i++) {
        var best = angles[i];
        var bestW = zones.weightOf(trait.zoneBias, best);
        for (var tryN = 0; tryN < 6 && bestW < 0.72; tryN++) {
          var alt = rng() * TAU;
          var w = zones.weightOf(trait.zoneBias, alt);
          if (w > bestW) { best = alt; bestW = w; }
        }
        angles[i] = best;
      }
    }

    return angles;
  }

  /* Resolve the anchor layer a trait attaches to.
   *
   * `anchor: "orbit"` is the reserved token for traits that sit OUTSIDE the
   * body — rings, debris, orbital structures. They get a synthetic layer whose
   * band runs from the surface outward, so `depth` keeps its usual meaning of
   * "across the anchor's thickness" and outward traits need no separate
   * placement path.
   *
   * "surface" is the same reserved token the structure stage uses: whatever
   * the outermost real layer turned out to be. */
  /* `anchor` MAY BE A LIST OF FALLBACKS, tried in order.
   *
   * One role was enough while every trait belonged to one family. It stopped
   * being enough the moment a trait was shared by two archetypes whose stacks
   * name the same region differently: `helium-rain` anchored to the gas
   * giant's `water-cloud`, and on an ice giant — which has no such layer —
   * `anchorLayer` returned null and the trait silently placed NOTHING. It
   * rolled, it appeared in the card's fact list, and it drew nothing at all,
   * which is the worst kind of failure because everything except the picture
   * says it worked.
   *
   * A list says "the bulk envelope, whatever this body happens to call it",
   * which is the thing the trait actually means. Both forms are accepted so
   * every existing single-role trait is unchanged. */
  function anchorLayer(trait, body) {
    var role = trait.anchor;
    var i;

    if (Array.isArray(role)) {
      for (i = 0; i < role.length; i++) {
        var found = anchorLayer({ anchor: role[i] }, body);
        if (found) return found;
      }
      return null;
    }

    if (role === "orbit") {
      /* THE ORBITAL BAND RUNS FROM THE SURFACE OUTWARD, and its `depth` is
       * read as a MULTIPLE OF THE BODY RADIUS rather than as a fraction of a
       * layer's thickness — a ring at `depth: [1.35, 2.15]` sits between 1.35
       * and 2.15 body radii out.
       *
       * The first version gave this a band running from 0 to the surface, so
       * `areaSpread` placed every chunk INSIDE the body, where the layers
       * painted straight over them. A debris belt generated 294 elements and
       * changed exactly zero pixels. */
      var far = 2.4;
      return {
        role: "orbit",
        inner: body.surface,
        outer: body.surface * far,
        thickness: body.surface * (far - 1),
        synthetic: true
      };
    }

    if (role === "surface") {
      for (i = 0; i < body.layers.length; i++) {
        if (!body.layers[i].outward) return body.layers[i];
      }
      return null;
    }

    for (i = 0; i < body.layers.length; i++) {
      if (body.layers[i].role === role) return body.layers[i];
    }
    return null;
  }

  /* Where the ground is under an orbit: the top of the outermost real layer. */
  function groundTop(body) {
    for (var i = 0; i < body.layers.length; i++) {
      if (!body.layers[i].outward) return body.layers[i].outer;
    }
    return body.surface || 1;
  }

  /* WHERE AN ORBITAL BAND SITS WHEN IT MUST CLEAR THIS BODY'S OWN HALO.
   *
   * `depth` on an `anchor: "orbit"` trait is authored in BODY RADII, which is
   * right for a ring — a ring at 1.35 is at 1.35 whatever the planet is doing.
   * It is wrong for anything that has to sit JUST OUTSIDE a glow, because how
   * far the glow reaches is a fact about the body and not about the trait.
   *
   * D127 IS THE REASON THIS EXISTS, and the measurement that forced it: a
   * star's outward layers run from 1.06 on a quiet dwarf to 1.40 on an old
   * giant. One authored band cannot clear all of them and also stay inside the
   * frame, which holds a full circle only to about r=1.15 — so a single figure
   * is either buried in the corona on one archetype or off the canvas on
   * another. Measured, a fixed 1.26-1.38 band left FOUR BODIES IN FORTY with
   * zero collectors visible: a trait that rolls, reports and draws nothing,
   * which is the failure D121 exists to catch.
   *
   * `depthAbove: [lo, hi]` says "this many body radii ABOVE whatever this
   * body's outward layers actually reached", so the same authored pair means
   * "just clear of the halo" on every archetype. Nothing else changes: the
   * result is an ordinary absolute band by the time anyone reads it.
   *
   * Returns null for a trait that did not ask, which is all of them but one. */
  function orbitBand(trait, body) {
    if (!trait.depthAbove || trait.anchor !== "orbit" || !body) return null;
    /* `body.extent` is the outermost radius any LAYER reached — the halo's own
     * edge. It deliberately does not include outward traits, which is what
     * keeps one trait from pushing another further out each time. */
    var edge = Math.max(body.surface || 1, body.extent || 1);
    /* `edgeCap` (D298): measure from no higher than this, so a stack of
     * built layers over a halo that already fills the frame's height sinks
     * into the glow rather than off the canvas. */
    if (trait.edgeCap) edge = Math.min(edge, trait.edgeCap);
    /* `depthFrac` (D298): a fraction of the way from the surface up to
     * that edge plus `depthAbove`'s first figure, for a layer held
     * proportionally between the star and the layer above it. */
    if (trait.depthFrac) {
      var s = body.surface || 1, top = edge + trait.depthAbove[0];
      return [s + (top - s) * trait.depthFrac[0], s + (top - s) * trait.depthFrac[1]];
    }
    return [edge + trait.depthAbove[0], edge + trait.depthAbove[1]];
  }

  /* A trait's depth range across its anchor, adjusted for `reach`.
   *
   * `on` uses the declared range as-is. `inward` and `outward` push it to the
   * respective end of the layer, which is what makes a magma chamber sit at
   * the top of the mantle where it reads as feeding the crust above it. */
  function traitDepth(trait, body) {
    var d = orbitBand(trait, body) || trait.depth || [0.1, 0.9];
    var reach = trait.reach || "on";

    if (trait.anchor === "orbit") {
      /* Authored in BODY RADII (1.35 = just above the surface), converted to
       * a fraction of the synthetic orbital band so `areaSpread` places
       * instances correctly within it. */
      var far = 2.4;
      var lo = (d[0] - 1) / (far - 1);
      var hi = (d[1] - 1) / (far - 1);
      return [clamp(lo, 0, 1), clamp(hi, 0, 1)];
    }
    if (reach === "outward") {
      return [Math.max(d[0], 0.55), Math.min(1.0, d[1])];
    }
    if (reach === "inward") {
      return [Math.max(0, d[0]), Math.min(d[1], 0.5)];
    }
    /* `spanning` — the trait CROSSES its anchor rather than sitting inside it.
     *
     * Documented in TRAIT-SYSTEM.md from the start and never implemented; it
     * fell through to the raw depth, which silently behaved like `on`. The
     * great storm is the first genuine user: a storm reaching from the cirrus
     * deck down through the banded layer is one feature, and clipping it to
     * either band cuts it in half.
     *
     * The depth is taken as authored and allowed OUT of the 0..1 box, so a
     * range like [-1.4, 0.9] means "from well below this layer's floor to near
     * its top". `placeOne` widens the element's own band accordingly, and
     * `fadeEnds` dissolves it at both extremes so nothing is cut by a clip. */
    if (reach === "spanning") return d;
    return d;
  }

  CC.TraitRoll.anchorAngles = anchorAngles;
  CC.TraitRoll.anchorLayer = anchorLayer;
  CC.TraitRoll.groundTop = groundTop;
  CC.TraitRoll.orbitBand = orbitBand;
  CC.TraitRoll.traitDepth = traitDepth;
})();
