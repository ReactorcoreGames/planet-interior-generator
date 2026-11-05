/* Presence and thickness resolution: which layers exist, how far out each one
 * reaches, and the record a surviving layer is kept as.
 *
 * Split out of gen/structure.js, which passed the 500-line rule. Attached to
 * CC.Structure; gen/structure.js and gen/structure-wobble.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp, lerp = M.lerp, smoothstep = M.smoothstep;
  var WOBBLE = CC.Structure.WOBBLE;

  /* ---- presence ------------------------------------------------------- */


  /* Returns { present, strength }.
   *
   * `strength` is 0..1 and is how *established* the layer is. A layer that has
   * only just crossed its threshold comes in at low strength, which downstream
   * stages use to fade it in rather than pop it in. Unconditional layers are
   * always at full strength. */
  function resolvePresence(layer, params, rng, optionalChance, placedRoles,
                           climateSpec) {
    var p = layer.presence;

    /* Form 1: unconditional. */
    if (p === undefined || p === null) return { present: true, strength: 1 };

    /* Form 2: a probability roll, scaled by the Optional layers slider. */
    if (typeof p === "number") {
      var chance = p * optionalChance;
      return { present: rng() < chance, strength: 1 };
    }

    /* Form 4: DEPENDENT ON ANOTHER LAYER.
     *
     * `presence: { requires: "ice-shell" }` — present only when the named
     * layer was itself placed. The moon's subsurface ocean is the first user
     * and the reason the form exists: that ocean is not a thing the body might
     * independently have, it is a consequence of having a lid. Rolling it
     * separately would produce a moon with an ocean and no shell — an
     * uncovered sea on an airless body, which is not a picture that means
     * anything.
     *
     * Resolved against what has ALREADY been placed, which works because the
     * stack is walked outermost-first and a layer can only depend on something
     * above it. That is not a coincidence: a dependency the other way would be
     * "this lid exists because there is a sea under it", which is backwards.
     *
     * It consumes no random number, exactly like the parameter form, so adding
     * or removing a dependent layer never reshuffles the layers below it. */
    if (p.requires !== undefined) {
      var host = placedRoles && placedRoles[p.requires];
      return host ? { present: true, strength: 1 }
                  : { present: false, strength: 0 };
    }

    /* Form 5: GOVERNED BY HOW COLD THE BODY IS.
     *
     * `presence: { colder: 0.42, fade: 0.14 }` — present only while the body's
     * climate baseline is below the threshold. The moon's ice shell is the
     * first user, and it is not a convenience: A SHELL OF ICE IS THE EVIDENCE
     * THAT THE BODY IS COLD. Rolling it independently of the temperature
     * produced ice-shelled moons at 610 C, which is a picture contradicting
     * itself in the most direct way available — the card said the surface was
     * hot enough to melt lead and the render drew a sheet of ice over it.
     *
     * Measured before this existed: only 11% of ice moons actually showed the
     * thing the branch is for, a frozen shell over a liquid sea. The other 89%
     * were warm bodies wearing a lid.
     *
     * IT ASKS THE REAL FUNCTION. `CC.Climate.baseline` is exported for exactly
     * this — a caller that reimplements "how warm is this body" agrees with
     * itself and not with the renderer, which has cost this project two rounds
     * already (D27, D35). The archetype's own climate spec is passed in, so a
     * body that declines starlight is scored the way it declines it.
     *
     * `fade` gives the usual soft entry: a shell that has only just formed
     * comes in at low strength rather than popping into existence as the
     * Starlight slider crosses a line. */
    if (p.colder !== undefined) {
      if (!CC.Climate || !CC.Climate.baseline) return { present: true, strength: 1 };
      var warmth = CC.Climate.baseline(params, climateSpec);
      var fadeBand = p.fade === undefined ? 0 : p.fade;
      if (warmth >= p.colder) return { present: false, strength: 0 };
      return {
        present: true,
        /* Coldest is most established, so the ramp runs the other way from
         * the parameter form's. */
        strength: fadeBand > 0
          ? smoothstep(p.colder, p.colder - fadeBand, warmth) : 1
      };
    }

    /* Form 6: ONE OF A SET OF STRUCTURES, NAMED BY A SETTING.
     *
     * `presence: { param, is: ["remnant", ...], dflt, chance }` — present
     * only while the named setting is one of the listed values. The nebula is
     * the first user: a planetary nebula or a supernova remnant is EMPTY IN
     * THE MIDDLE, which no value of any slider expresses, so the archetype
     * declares both stacks and the Nebula form setting picks one. The moon's
     * branch is rolled; this one is chosen, because the user asked for the
     * hollow ones by name.
     *
     * `chance` adds an optional roll on top, scaled by Optional layers. The
     * roll is consumed whatever the setting says, so switching form never
     * reshuffles the layers below. */
    if (p.is !== undefined) {
      var sv = params[p.param];
      if (sv === undefined) sv = p.dflt;
      var roll = p.chance !== undefined ? rng() : 0;
      if (p.is.indexOf(sv) < 0) return { present: false, strength: 0 };
      if (p.chance !== undefined && roll >= p.chance * optionalChance) {
        return { present: false, strength: 0 };
      }
      return { present: true, strength: 1 };
    }

    /* Form 3: governed by a parameter. */
    var v = params[p.param];
    if (v === undefined) return { present: true, strength: 1 };

    var above = p.above === undefined ? 0 : p.above;
    var fade = p.fade === undefined ? 0 : p.fade;

    if (v <= above) return { present: false, strength: 0 };
    return {
      present: true,
      strength: fade > 0 ? smoothstep(above, above + fade, v) : 1
    };
  }

  /* ---- thickness ------------------------------------------------------ */


  /* A layer's outer radius. Rolled layers only — parameter-driven layers are
   * resolved separately, once the layer they sit on has been placed.
   *
   * A layer may omit `frac` entirely, which means "take whatever is left". The
   * innermost layer of a stack is the usual case — an asteroid's mosaic
   * interior is the whole body minus its two shells — and pass 2 gives it its
   * outer radius from the layer above. */
  function resolveOuter(layer, params, rng, variation, placedRoles) {
    var f = layer.frac;

    /* A STACK MAY GENUINELY BRANCH, AND THE BRANCH IS DATA.
     *
     * `frac_when: { "ice-shell": [lo, hi] }` — when the named layer was
     * placed, this layer takes the given range instead of its own. The moon is
     * the first and so far only user: with an ice shell the crust is a sea
     * floor at 0.70-0.775, and without one it IS the surface at 0.90-0.945.
     * Those are not the same layer at a different thickness, they are the same
     * material in two different places, and no slider interpolates between
     * them — which is TRAIT-SYSTEM.md's third test coming out the other way
     * for once.
     *
     * The roll is consumed identically either way, so which branch a body took
     * never reshuffles the layers below it.
     *
     * Only one substitution applies; the first matching key wins. A stack
     * needing two independent branches would be saying something this form
     * cannot express, and should say it as two archetypes. */
    if (layer.frac_when && placedRoles) {
      for (var key in layer.frac_when) {
        if (!Object.prototype.hasOwnProperty.call(layer.frac_when, key)) continue;
        if (placedRoles[key]) { f = layer.frac_when[key]; break; }
      }
    }

    if (!f) return null;
    var lo = f[0], hi = f[1];
    var mid = (lo + hi) / 2;

    /* Layer thickness variation: 0 pins every layer to its mid-range, 100
     * uses the full authored range. */
    var spread = (hi - lo) / 2 * variation;
    var out = mid + (rng() * 2 - 1) * spread;

    /* A named control may push the roll within the layer's range — Core size
     * bias is the first user. Applied after the roll so the bias reads as
     * "bigger than it would have been", not as a re-roll. */
    if (layer.bias && params[layer.bias] !== undefined) {
      var b = clamp(params[layer.bias], -1, 1);
      out = b >= 0 ? lerp(out, hi, b * 0.85) : lerp(out, lo, -b * 0.85);
    }

    /* Parameters may nudge the layer — the crust thinning as the interior
     * heats up, and again as a deepening ocean drowns it. Declared as a list
     * so a layer can answer to more than one axis, which is the normal case
     * once Cohesion and Operational status arrive. */
    var mods = layer.modulate;
    if (mods) {
      if (!Array.isArray(mods)) mods = [mods];
      for (var m = 0; m < mods.length; m++) {
        var mv = params[mods[m].param];
        /* `curve` bends the response: a black hole's inner horizon barely
         * moves until the spin is high and then races outward, and a linear
         * nudge cannot say that. Absent everywhere else, so 1. */
        if (mv !== undefined) {
          out += mods[m].amount * (mods[m].curve ? Math.pow(clamp(mv, 0, 1), mods[m].curve) : mv);
        }
      }
    }

    return clamp(out, 0.02, 2.0);
  }

  /* ---- the layer record ---------------------------------------------- */

  function makeLayer(spec, pres, outer, relative, st) {
    var params = st.params, seed = st.seed, irregularity = st.irregularity;

    /* A LAYER MAY DECLARE THAT A PARAMETER SOFTENS ITS EDGE.
     *
     * `boundarySoftens: { param, below, to }` — when the named parameter
     * falls under `below`, the layer takes the `to` boundary character
     * instead of its own. A giant's Core size bias is the first user: at
     * the low end the core shrinks until it has no discrete edge to draw,
     * so the boundary becomes a gradient rather than a line. That is the
     * parameter changing the picture STRUCTURALLY rather than only scaling
     * a radius, which is the argument gaseous-bodies.md makes for cutting
     * `coreless` as a trait.
     *
     * A general layer property, resolved here once for any archetype that
     * declares one — not a family check. */
    var character = spec.boundary || "near-perfect";
    var soften = spec.boundarySoftens;
    if (soften) {
      var sv = params[soften.param];
      if (sv !== undefined && sv < soften.below) character = soften.to;
    }

    return {
      role: spec.role,
      /* What the overlay prints (js/data/layernames.js): the spec's own
       * name if the archetype gave one, else the shared table's. */
      name: spec.name || CC.LayerNames.of(spec.role),
      outer: outer,
      inner: 0,
      strength: pres.strength,
      boundary: character,
      /* `wobbleScale` LETS A LAYER LAND BETWEEN TWO TABLE ENTRIES.
       *
       * The WOBBLE table is a vocabulary of six named characters and that is
       * the right shape for it — a layer should say what KIND of edge it has
       * rather than picking a number. But the steps are wide (`heavy` 0.065,
       * `extreme` 0.140, better than a factor of two apart), and the
       * asteroid genuinely wants a value between them: at `heavy` its
       * silhouette reads too round and at `extreme` the wobble compounds
       * with the terrain until the dust film throws detached lobes clear of
       * the body.
       *
       * A multiplier rather than a seventh name, because the character is
       * still `heavy` — this is the same KIND of edge, more of it. Adding a
       * name between the two would have made the vocabulary finer for every
       * body to solve one body's calibration. */
      wobble: (WOBBLE[character] === undefined ? WOBBLE["near-perfect"]
                                               : WOBBLE[character]) *
              irregularity * (spec.wobbleScale === undefined ? 1
                                                             : spec.wobbleScale),
      /* HOW ANGULAR THE WOBBLE IS, as opposed to how large. A boundary that
       * got its shape by fracturing has flat faces meeting at corners rather
       * than a smooth undulation, and no amount of amplitude produces that
       * from fBm — see `boundaryFn` in draw/boundary.js. 0 on every layer that
       * does not ask, which is all of them but the asteroid's. */
      boundaryFacet: spec.boundaryFacet || 0,
      /* WHOSE SHAPE THIS BOUNDARY WEARS. Names another role, so two
       * boundaries on the same broken fragment rise and fall together and
       * cannot cross. See `boundaryFn` in draw/boundary.js. */
      boundaryShare: spec.boundaryShare || null,
      /* How many lobes the wobble puts round the body. See `boundaryFn`. */
      boundaryFreq: spec.boundaryFreq || 0,
      /* Where this layer's edge breaks up through the one above, driven by
       * a parameter. See `breachFn` in js/gen/form.js. */
      breach: spec.breach || null,
      outward: !!spec.outward,
      /* How much of an outward layer's depth is carried at near-full
       * opacity before the taper starts. Undefined leaves draw/layers.js's
       * default. See the note at the fillOutward call in draw/scene.js. */
      fadeHold: spec.fadeHold,
      luminous: !!spec.luminous,
      /* HOW MUCH A LUMINOUS LAYER DARKENS TOWARD ITS OWN LIMB.
       *
       * A GENERAL PROPERTY OF AN EMITTING LAYER, not a fact about a
       * photosphere. Anything that glows is brightest where you look
       * straight down into it and dimmer where you look obliquely through
       * cooler, higher material — a fusing surface, a lava sea, an
       * incandescent shell. Declared here so any future emitting body gets
       * it without a role name reaching draw/ (see draw/scene.js
       * `paintLimbDarkening`).
       *
       * 0 or undefined means "flat", which is what every existing family
       * already is, so this cannot change a render that does not ask for
       * it. */
      limbDarkening: spec.limbDarkening,
      /* Wobble expressed as a proportion of the layer's own thickness. See
       * `relativeWobble` in gen/structure-wobble.js for why it cannot be
       * settled here. */
      wobbleRel: spec.wobbleRel,
      /* Per-kind count/size multipliers for this layer's shared element
       * recipes — how one archetype says its version of a shared role is
       * louder or quieter. See gen/details.js. */
      elementScale: spec.elementScale,
      /* An archetype's own terrain field for this layer, overriding the
       * role's shared one. A moon's cratered surface and a planet's
       * continents are different fields rather than one field at two
       * amplitudes — see gen/details.js. Undefined on every layer that
       * existed before the moon. */
      reliefSpec: spec.reliefSpec,
      /* Traits this layer answers with its OWN marks rather than hosting
       * the trait's. See `absorbedScale` in gen/details.js. */
      absorbs: spec.absorbs,
      /* Per-trait depth overrides within this layer. See `placeOne` in
       * gen/traitroll.js. */
      traitDepth: spec.traitDepth,
      /* A number, or a [lo, hi] range rolled from the layer's OWN stream
       * so rolling it never reshuffles anything else. A translucent region
       * (the nebula) is the first user of the range form. */
      opacity: spec.opacity === undefined ? 1
        : Math.min(spec.opacityBy ? 0.95 : 1, (Array.isArray(spec.opacity)
            ? lerp(spec.opacity[0], spec.opacity[1],
                   CC.RNG.stream(seed, "structure/opacity/" + spec.role)())
            : spec.opacity) *
        /* `opacityBy: { param, scale }` — a curve multiplier over a named
         * parameter, capped at 0.95. A dark nebula's regions are near-opaque
         * dust; an emission nebula's are thin glowing gas. */
        (spec.opacityBy && params[spec.opacityBy.param] !== undefined
          ? M.curve(spec.opacityBy.scale, clamp(params[spec.opacityBy.param], 0, 1)) : 1)),
      /* A soft-edged region: see draw/feather.js. Absent everywhere else. */
      feather: spec.feather || 0,
      ride: !!spec.ride,
      /* The region's centre, moved off the body's (draw/feather.js). Rolled
       * from the layer's own stream; null on every layer that declares
       * none. */
      drift: spec.drift ? (function (d, r) {
        var dist = lerp(d[0], d[1], r()) * irregularity;
        var dir = r() * Math.PI * 2;
        return { x: Math.sin(dir) * dist, y: -Math.cos(dir) * dist };
      })(spec.drift, CC.RNG.stream(seed, "structure/drift/" + spec.role)) : null,
      shell: !!spec.shell,
      relative: !!relative,
      /* An optional ceiling on how thick this layer may end up. See the
       * `capThickness` in gen/structure.js for why a `frac` range cannot express it. */
      maxThickness: spec.maxThickness,
      /* The authored range, kept so the `maxThickness` pass can tell how far
       * a layer was ever allowed to grow. */
      fracRange: Array.isArray(spec.frac) ? spec.frac : null,
      fill: !spec.frac,
      /* Peak-to-trough height of this layer's surface terrain, if it has
       * any. Carried through the stack so the surface calculation below can
       * leave room for peaks; the field itself is generated later. */
      relief: spec.relief || 0
    };
  }

  CC.Structure.resolvePresence = resolvePresence;
  CC.Structure.resolveOuter = resolveOuter;
  CC.Structure.makeLayer = makeLayer;
})();
