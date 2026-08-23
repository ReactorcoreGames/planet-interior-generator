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
  function resolvePresence(layer, params, rng, optionalChance) {
    var p = layer.presence;

    /* Form 1: unconditional. */
    if (p === undefined || p === null) return { present: true, strength: 1 };

    /* Form 2: a probability roll, scaled by the Optional layers slider. */
    if (typeof p === "number") {
      var chance = p * optionalChance;
      return { present: rng() < chance, strength: 1 };
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
  function resolveOuter(layer, params, rng, variation) {
    var f = layer.frac;
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

    for (var i = 0; i < archetype.stack.length; i++) {
      var spec = archetype.stack[i];
      var pres = resolvePresence(spec, params, rng, optionalChance);

      /* A parameter-driven layer measures itself against a layer that may not
       * be placed yet, so it waits. It consumes no random numbers either way,
       * which is what lets Ocean depth move without re-rolling anything.
       *
       * `outer` is null for a layer with no `frac` at all — "take what's
       * left" — which pass 1c resolves. */
      var relative = spec.frac && !Array.isArray(spec.frac);
      var outer = relative ? 0 : resolveOuter(spec, params, rng, variation);

      /* The roll above is consumed whether or not the layer survives, so
       * removing a layer never reshuffles the layers below it. Determinism
       * depends on this: the same seed must give the same mantle regardless
       * of whether the world happened to have an atmosphere. */
      if (!pres.present) continue;

      var layer = {
        role: spec.role,
        outer: outer,
        inner: 0,
        strength: pres.strength,
        boundary: spec.boundary || "near-perfect",
        wobble: (WOBBLE[spec.boundary] === undefined ? WOBBLE["near-perfect"]
                                                     : WOBBLE[spec.boundary]) * irregularity,
        outward: !!spec.outward,
        luminous: !!spec.luminous,
        opacity: spec.opacity === undefined ? 1 : spec.opacity,
        shell: !!spec.shell,
        relative: !!relative,
        fill: !spec.frac,
        /* Peak-to-trough height of this layer's surface terrain, if it has
         * any. Carried through the stack so the surface calculation below can
         * leave room for peaks; the field itself is generated later. */
        relief: spec.relief || 0
      };
      placed.push(layer);
      byRole[spec.role] = layer;
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

    /* How far out the picture reaches, so the view can leave room. */
    var extent = 1.0;
    for (i = 0; i < layers.length; i++) extent = Math.max(extent, layers[i].outer);

    return {
      archetype: archetype.id,
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
