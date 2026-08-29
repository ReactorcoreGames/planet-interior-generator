/* The structure stage: archetype recipe + settings -> a concrete layer stack.
 *
 * Output is pure data in normalized body space. No pixels, no colours, no
 * canvas. The renderer consumes it without knowing what kind of body it is.
 *
 * PRESENCE-BY-PARAMETER is the load-bearing idea here. A layer's existence is
 * resolved through one function, `resolvePresence`, whatever form the layer
 * declares — an unconditional layer, an optional roll, or a parameter
 * threshold. Ocean depth and Interior heat are just the first two callers.
 * When Cohesion and Operational status arrive they add data, not branches.
 *
 * The stack is built in two passes:
 *   1. decide which layers exist, and each one's outer radius
 *   2. drop survivors that got squeezed to nothing, then hand each layer its
 *      inner radius from the next survivor down
 *
 * Splitting it that way is what makes removal clean: nothing downstream has to
 * know that an ocean was ever a possibility. */

var CC = CC || {};

CC.Structure = (function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp, lerp = M.lerp, smoothstep = M.smoothstep;

  /* A layer thinner than this in body-space is not worth drawing; it would be
   * a sub-pixel sliver at preview size and a visual artefact at export size. */
  var MIN_THICKNESS = 0.012;

  /* How much wobble each boundary character means, as a fraction of body
   * radius. Multiplied by the Boundary irregularity control. */
  var WOBBLE = {
    "perfect":       0.000,
    "near-perfect":  0.004,
    "slight":        0.010,
    "irregular":     0.028,
    "heavy":         0.065,
    "extreme":       0.140,
    "soft-gradient": 0.000
  };

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
        if (mv !== undefined) out += mods[m].amount * mv;
      }
    }

    return clamp(out, 0.02, 2.0);
  }

  /* The outermost layer that is genuinely part of the body — not an outward
   * falloff like an atmosphere, and not the layer doing the asking. */
  function outermostSolid(placed, exclude) {
    for (var i = 0; i < placed.length; i++) {
      if (placed[i] === exclude || placed[i].outward) continue;
      return placed[i];
    }
    return null;
  }

  /* ---- the stack ------------------------------------------------------ */

  function build(archetype, params, seed) {
    var rng = CC.RNG.stream(seed, "structure");

    var variation = params.thicknessVariation === undefined ? 0.7 : params.thicknessVariation;
    var optionalChance = params.optionalLayers === undefined ? 0.75 : params.optionalLayers;
    var irregularity = params.boundaryIrregularity === undefined ? 1 : params.boundaryIrregularity;

    /* --- pass 1: presence, and the outer radius of every rolled layer --- */
    var placed = [];
    var byRole = {};
    var deferred = [];

    /* WHICH ROLES HAVE BEEN PLACED SO FAR, for the two dependent forms:
     * `presence: { requires }` and `frac_when`. Filled as the walk proceeds,
     * which is why both can only ever look OUTWARD — see resolvePresence. */
    var placedRoles = {};

    for (var i = 0; i < archetype.stack.length; i++) {
      var spec = archetype.stack[i];
      var pres = resolvePresence(spec, params, rng, optionalChance, placedRoles,
                                 archetype.climate || null);

      /* A parameter-driven layer measures itself against a layer that may not
       * be placed yet, so it waits. It consumes no random numbers either way,
       * which is what lets Ocean depth move without re-rolling anything.
       *
       * `outer` is null for a layer with no `frac` at all — "take what's
       * left" — which pass 1c resolves. */
      var relative = spec.frac && !Array.isArray(spec.frac);
      var outer = relative ? 0
                           : resolveOuter(spec, params, rng, variation, placedRoles);

      /* The roll above is consumed whether or not the layer survives, so
       * removing a layer never reshuffles the layers below it. Determinism
       * depends on this: the same seed must give the same mantle regardless
       * of whether the world happened to have an atmosphere. */
      if (!pres.present) continue;

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

      var layer = {
        role: spec.role,
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
         * from fBm — see `boundaryFn` in draw/layers.js. 0 on every layer that
         * does not ask, which is all of them but the asteroid's. */
        boundaryFacet: spec.boundaryFacet || 0,
        /* WHOSE SHAPE THIS BOUNDARY WEARS. Names another role, so two
         * boundaries on the same broken fragment rise and fall together and
         * cannot cross. See `boundaryFn` in draw/layers.js. */
        boundaryShare: spec.boundaryShare || null,
        /* How many lobes the wobble puts round the body. See `boundaryFn`. */
        boundaryFreq: spec.boundaryFreq || 0,
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
         * the resolution pass near the end of `build` for why it cannot be
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
        opacity: spec.opacity === undefined ? 1 : spec.opacity,
        shell: !!spec.shell,
        relative: !!relative,
        /* An optional ceiling on how thick this layer may end up. See the
         * pass above for why a `frac` range cannot express it. */
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
      placed.push(layer);
      byRole[spec.role] = layer;
      /* Recorded for the dependent forms below this one in the stack. */
      placedRoles[spec.role] = true;
      if (relative) deferred.push({ layer: layer, spec: spec });
    }

    /* --- pass 1b: layers positioned relative to another layer ---
     *
     * Resolved innermost-outward, so a chain resolves in one go: the ocean
     * settles onto the crust, then the atmosphere settles onto the ocean.
     * `over: "surface"` is the reserved name for "whatever the outermost
     * non-outward layer turned out to be", which is how an atmosphere sits on
     * the sea of an ocean world and on the rock of a desert one without
     * either case being special. */
    for (i = deferred.length - 1; i >= 0; i--) {
      var d = deferred[i];
      var f = d.spec.frac;
      var host = (f.over === "surface")
        ? outermostSolid(placed, d.layer)
        : byRole[f.over];

      if (!host) {
        /* Its reference layer isn't present — the layer has nothing to sit on
         * and is dropped. Nothing on a planet hits this today; it matters for
         * the ice-shell/ocean pair on moons. */
        placed.splice(placed.indexOf(d.layer), 1);
        delete byRole[d.layer.role];
        continue;
      }

      /* The parameter picks a point in the depth range. Where no parameter
       * drives it — an atmosphere has no thickness slider yet — the position
       * is rolled from the layer's own stream instead, so it still varies
       * from body to body. */
      var v;
      if (f.param !== undefined && params[f.param] !== undefined) {
        v = clamp(params[f.param], 0, 1);
      } else {
        v = CC.RNG.stream(seed, "structure/" + d.layer.role)();
      }

      /* An optional response curve on the parameter.
       *
       * `curve > 1` gives the LOW end of the range more of the slider's
       * travel. The ocean needs this: its interesting band — where sea level
       * cuts across the terrain and produces coastlines — is only the bottom
       * third of its depth range, so a linear response spent most of the
       * slider, and most random rolls, on an identically drowned world.
       * Declared as data so any parameter-positioned layer can use it. */
      if (f.curve) v = Math.pow(v, f.curve);

      /* A NAMED PARAMETER MAY NUDGE THE ROLL WITHOUT OWNING IT.
       *
       * Distinct from `param` above, which REPLACES the roll: `nudge` leaves
       * the layer's own roll in charge and only leans it, so the thickness is
       * still mostly the body's own and the parameter biases it.
       *
       * The atmosphere is the first user, and the reason is Starlight. A
       * close-in world loses air to escape; a distant one freezes it out onto
       * the ground — so the thickest atmospheres sit in the middle of the
       * range, and both extremes thin. That is a real coupling and the plan
       * asks for it (CLIMATE-PLAN.md, settled decision 1), but it must stay
       * GENTLE or Starlight would be an atmosphere slider wearing a different
       * label. `amount` is how far it may lean the roll, in roll units.
       *
       * `peak` names where the parameter's own sweet spot is, so the response
       * can be a hump rather than a ramp; omit it for a plain lean. */
      if (f.nudge && params[f.nudge.param] !== undefined) {
        var np = clamp(params[f.nudge.param], 0, 1);
        var lean;
        if (f.nudge.peak === undefined) {
          lean = (np - 0.5) * 2;
        } else {
          /* Distance from the sweet spot, so both extremes lean the same way.
           * Normalized by the further side, so the response is symmetric in
           * effect even when the peak is off-centre. */
          var reach = Math.max(f.nudge.peak, 1 - f.nudge.peak);
          lean = -Math.abs(np - f.nudge.peak) / Math.max(1e-6, reach);
        }
        v = clamp(v + lean * (f.nudge.amount === undefined ? 0.2 : f.nudge.amount),
                  0, 1);
      }

      var thickness = Array.isArray(f.depth)
        ? lerp(f.depth[0], f.depth[1], v)
        : f.depth;
      d.layer.outer = host.outer + thickness;
    }

    /* --- pass 1c: the innermost layer may omit `frac` ---
     *
     * `frac` is a layer's own outer radius, and each layer runs inward until
     * the next one starts. The innermost layer always runs to the centre, so
     * it needs only a top — and that is exactly where the layer above ends.
     *
     * This is what lets the asteroid's mosaic interior be declared without a
     * range: it is "everything inside the shells", and an explicit number
     * would only have to be kept in sync with them. Note this means the layer
     * above must be authored as a band with real thickness, since the fill
     * layer starts at that layer's *inner* edge. */
    for (i = 0; i < placed.length; i++) {
      if (placed[i].outer !== null) continue;
      placed[i].outer = (i === 0) ? 1.0 : placed[i - 1].outer;
    }

    /* A LAYER MAY CAP HOW THICK IT IS ALLOWED TO GET.
     *
     * `frac` bounds where a layer's OUTER edge sits; its thickness is whatever
     * is left between it and the next layer down, which no range can control.
     * That is usually right — a layer should absorb the slack — and it fails
     * when the layer beneath is optional or small: an ice giant's `icy-mantle`
     * rolled 79% of the radius as one near-featureless band whenever
     * `superionic` was absent, which is a cutaway with nothing to cut.
     *
     * `maxThickness` raises the layer's FLOOR rather than lowering its
     * ceiling, so the layer keeps the position `frac` gave it and the space it
     * gives up goes to whatever is inside it. Applied before the ordering pass
     * so the clamps below still see a consistent stack. */
    for (i = 0; i < placed.length; i++) {
      var cap = placed[i].maxThickness;
      if (!cap || placed[i].outward) continue;
      var below = (i + 1 < placed.length) ? placed[i + 1].outer : 0;
      if (below === null) continue;
      if (placed[i].outer - below > cap) {
        /* Push the layer below outward to meet the cap — but NEVER past the
         * top of its own authored range.
         *
         * Without that bound the freed space went entirely to whatever was
         * next inward, which on an ice giant with no `superionic` handed the
         * rock core 0.40 of the radius against an authored ceiling of 0.17.
         * A cap is a statement about ONE layer's thickness, not a licence to
         * resize its neighbour, so the surplus is only taken up as far as the
         * neighbour was allowed to reach anyway. What remains simply leaves
         * the capped layer a little thicker than its cap, which is the honest
         * outcome: there is nothing else in the stack to absorb it. */
        var next = placed[i + 1];
        if (next) {
          var ceiling = Array.isArray(next.fracRange)
            ? next.fracRange[1] : null;
          var want = placed[i].outer - cap;
          next.outer = (ceiling === null) ? want : Math.min(want, ceiling);
        }
      }
    }

    /* --- pass 2: enforce ordering, drop slivers, assign inner radii --- */

    /* Outer radii must decrease monotonically inward. Parameter-driven layers
     * and bias pushes can violate that (a maxed core bias against an unlucky
     * mantle roll), so clamp rather than trusting the rolls. */
    for (i = 1; i < placed.length; i++) {
      var above = placed[i - 1];
      if (above.outward) continue;      /* the atmosphere sits outside the surface */
      if (placed[i].relative) continue; /* already positioned against its host */
      if (placed[i].fill) continue;     /* defined as starting where `above` ends */

      /* A layer that carries RELIEF is allowed to reach the one above it.
       *
       * The gap enforced here is the thickness of the layer ABOVE, and for a
       * sea resting on terrain that thickness is measured at the terrain's
       * mean — where a shallow sea legitimately has almost none, because its
       * water is in the basins. Forcing a full MIN_THICKNESS gap pushed the
       * crust down instead, so sea level could never reach the terrain mean
       * and land never exceeded ~22% at any Ocean depth. Relief-bearing
       * layers may rise to meet the layer above; their peaks then break
       * through it, which is exactly what an island is. */
      var gap = placed[i].relief ? 0 : MIN_THICKNESS;
      if (placed[i].outer > above.outer - gap) {
        placed[i].outer = above.outer - gap;
      }
    }

    var layers = [];
    for (i = 0; i < placed.length; i++) {
      /* The innermost layer runs to the centre; every other layer stops at
       * the next survivor down. */
      var innerRadius = (i === placed.length - 1) ? 0 : placed[i + 1].outer;
      var thickness = placed[i].outer - innerRadius;

      /* A layer resting on RELIEF is measured against the terrain's lowest
       * point, not its mean.
       *
       * A shallow sea over hilly ground is thin at the mean but genuinely
       * deep in the basins, and that is the most interesting sea there is —
       * it is the one that produces coastlines. Judged against the mean, the
       * sliver test dropped it or the ordering clamp floored it at
       * MIN_THICKNESS, so sea level could never sit at or below the terrain
       * mean and land never exceeded ~22% at any slider position. */
      var host = placed[i + 1];
      var effective = thickness;
      if (host && host.relief) effective = thickness + host.relief * 0.5;

      if (effective < MIN_THICKNESS && i !== placed.length - 1) continue;

      placed[i].inner = innerRadius;
      placed[i].thickness = thickness;
      layers.push(placed[i]);
    }

    /* Recompute inner radii after any drops, so no gap is left behind. */
    for (i = 0; i < layers.length; i++) {
      layers[i].inner = (i === layers.length - 1) ? 0 : layers[i + 1].outer;
      layers[i].thickness = layers[i].outer - layers[i].inner;
    }

    /* The visible edge of the body: the outermost layer that isn't drawn as
     * an outward falloff. The scale bar and stats measure against this.
     *
     * A layer's TERRAIN PEAKS count toward the surface even when the layer
     * sits below another. A mountain rising through a shallow sea is the
     * body's true outer edge at that angle, and an island is exactly that
     * case. Ignoring relief here means renormalization (below) scales every
     * peak to just under the sea's flat top, so terrain can never break the
     * surface and no coastline can ever form — which is precisely how the
     * first attempt at D15 failed. */
    /* The surface is the body's TRUE OUTERMOST POINT, which is not always the
     * outermost layer. A buried layer's terrain peaks can rise through the
     * layer above — an island breaking a shallow sea — and then the peak is
     * the real edge while the sea's flat top sits just below it. Both must be
     * accounted for, or renormalization scales the peaks to just under the
     * sea and no coastline can ever form (the first attempt at D15). */
    var surface = 1.0;
    var foundSurface = false;
    for (i = 0; i < layers.length; i++) {
      if (layers[i].outward) continue;
      /* Half the peak-to-trough height sits above the layer's mean radius. */
      var peak = layers[i].outer + layers[i].relief * 0.5;
      if (!foundSurface) { surface = peak; foundSurface = true; }
      else if (peak > surface) surface = peak;
    }

    /* Rescale so the surface sits exactly at 1.0.
     *
     * Layers are authored as fractions of body radius, but adding an ocean on
     * top of the crust pushes the surface past 1.0, which would make an ocean
     * world render fractionally larger than a desert one at identical
     * settings. Normalizing here keeps "1.0 means the surface" true for
     * everything downstream — stats, the scale bar and every detail element
     * measure against a surface that is always 1.0. */
    if (surface > 0 && Math.abs(surface - 1) > 1e-9) {
      var k = 1 / surface;
      for (i = 0; i < layers.length; i++) {
        layers[i].outer *= k;
        layers[i].inner *= k;
        layers[i].thickness *= k;
        /* Relief is a body-space height, so it rescales with everything else.
         * Leaving it unscaled would change the terrain's apparent height
         * whenever an ocean was added or removed. */
        layers[i].relief *= k;
      }
      surface = 1.0;
    }

    /* ---- WOBBLE MEASURED AGAINST THE LAYER'S OWN THICKNESS -------------
     *
     * `WOBBLE` above is a fraction of the BODY radius, which is the right
     * unit for a mantle or a crust: those are statements about how uneven a
     * planet is. It is the wrong unit for a fringe. A chromosphere is a few
     * percent of the radius thick, so a body-radius wobble either does
     * nothing to it or swallows it whole, and there is no setting in between.
     *
     * `wobbleRel: { base, peak, driver }` says the other thing: this
     * boundary is wavy by a proportion OF ITSELF. 0.10 at the calm end, 0.50
     * at the violent end — half the layer's own thickness — which is the
     * user's calibration taken directly. Because it is a proportion, a wide
     * layer wobbles further in absolute terms than a narrow one from the same
     * figure, and that is wanted: a corona's edge should heave where a
     * chromosphere's ripples.
     *
     * `driver` names the parameter that moves it between `base` and `peak`.
     * On a star that is `starActivity` — one axis, more consumers (D27), not
     * a second violence dial.
     *
     * RESOLVED HERE, AFTER RENORMALIZATION, because thickness is not known
     * until then and this is a proportion OF thickness. Computing it earlier
     * would calibrate it against a number that is about to move (D75/D119).
     * It REPLACES the character's body-radius figure rather than adding to
     * it, so a layer declares one or the other and never both silently. */
    for (i = 0; i < layers.length; i++) {
      var wr = layers[i].wobbleRel;
      if (!wr) continue;
      var base = wr.base === undefined ? 0.10 : wr.base;
      var peakW = wr.peak === undefined ? 0.50 : wr.peak;
      var dv = wr.driver === undefined ? 1 : params[wr.driver];
      if (dv === undefined) dv = 1;
      var frac = lerp(base, peakW, clamp(dv, 0, 1));
      /* Still scaled by Boundary irregularity, which is the user's global
       * "how ragged is everything" control and must keep meaning that. */
      layers[i].wobble = frac * layers[i].thickness * irregularity;
      layers[i].wobbleFrac = frac;
    }

    /* How far out the picture reaches, so the view can leave room. */
    var extent = 1.0;
    for (i = 0; i < layers.length; i++) extent = Math.max(extent, layers[i].outer);

    return {
      archetype: archetype.id,
      /* A BODY THAT RADIATES INTO THE SPACE AROUND IT.
       *
       * `{ reach, strength, veins }` — see draw/scene.js `drawEmissiveGlow`.
       * A property of the WHOLE BODY rather than of any layer, because it is
       * light in the space beyond the outermost layer and belongs to no band.
       * Carried here rather than looked up from the archetype in draw/ so the
       * renderer keeps consuming a plain built body and never reaches back
       * into the data tables.
       *
       * Undefined on every existing archetype, so nothing that does not ask
       * for it renders differently. */
      emissiveGlow: archetype.emissiveGlow,
      layers: layers,
      surface: surface,
      extent: extent,
      has: function (role) { return !!byRole[role] && layers.indexOf(byRole[role]) >= 0; },
      rotation: params.keepUpright ? 0 : (params.rotation || 0)
    };
  }

  return {
    build: build,
    resolvePresence: resolvePresence,
    WOBBLE: WOBBLE,
    MIN_THICKNESS: MIN_THICKNESS
  };
})();
