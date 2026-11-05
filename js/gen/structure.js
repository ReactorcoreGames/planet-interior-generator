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
 * know that an ocean was ever a possibility.
 *
 * `build` keeps the order of the passes and nothing else: each is a stage
 * function below, and all of them share one state object. Presence, thickness
 * and the layer record are in gen/structure-resolve.js, the wobble table and
 * the proportional wobble in gen/structure-wobble.js; both attach here. */

var CC = CC || {};

CC.Structure = (function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp, lerp = M.lerp;

  /* A layer thinner than this in body-space is not worth drawing; it would be
   * a sub-pixel sliver at preview size and a visual artefact at export size. */
  var MIN_THICKNESS = 0.012;

  /* ---- the stages ----------------------------------------------------- */

  /* The outermost layer that is genuinely part of the body — not an outward
   * falloff like an atmosphere, and not the layer doing the asking. */
  function outermostSolid(placed, exclude) {
    for (var i = 0; i < placed.length; i++) {
      if (placed[i] === exclude || placed[i].outward) continue;
      return placed[i];
    }
    return null;
  }

  /* --- pass 1: presence, and the outer radius of every rolled layer --- */
  function rollLayers(st) {
    var archetype = st.archetype, params = st.params, rng = st.rng;
    var placed = st.placed, byRole = st.byRole, placedRoles = st.placedRoles;
    var deferred = st.deferred;
    var optionalChance = st.optionalChance, variation = st.variation;

    for (var i = 0; i < archetype.stack.length; i++) {
      var spec = archetype.stack[i];
      var pres = CC.Structure.resolvePresence(spec, params, rng, optionalChance,
                                              placedRoles, archetype.climate || null);

      /* A parameter-driven layer measures itself against a layer that may not
       * be placed yet, so it waits. It consumes no random numbers either way,
       * which is what lets Ocean depth move without re-rolling anything.
       *
       * `outer` is null for a layer with no `frac` at all — "take what's
       * left" — which pass 1c resolves. */
      var relative = spec.frac && !Array.isArray(spec.frac);
      var outer = relative ? 0
                           : CC.Structure.resolveOuter(spec, params, rng, variation, placedRoles);

      /* The roll above is consumed whether or not the layer survives, so
       * removing a layer never reshuffles the layers below it. Determinism
       * depends on this: the same seed must give the same mantle regardless
       * of whether the world happened to have an atmosphere. */
      if (!pres.present) continue;

      var layer = CC.Structure.makeLayer(spec, pres, outer, relative, st);
      placed.push(layer);
      byRole[spec.role] = layer;
      /* Recorded for the dependent forms below this one in the stack. */
      placedRoles[spec.role] = true;
      if (relative) deferred.push({ layer: layer, spec: spec });
    }
  }

  /* --- pass 1b: layers positioned relative to another layer ---
   *
   * Resolved innermost-outward, so a chain resolves in one go: the ocean
   * settles onto the crust, then the atmosphere settles onto the ocean.
   * `over: "surface"` is the reserved name for "whatever the outermost
   * non-outward layer turned out to be", which is how an atmosphere sits on
   * the sea of an ocean world and on the rock of a desert one without
   * either case being special. */
  function settleRelative(st) {
    var placed = st.placed, byRole = st.byRole, deferred = st.deferred;
    var params = st.params, seed = st.seed;
    var i;
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
  function fillOmitted(st) {
    var placed = st.placed;
    var i;
    for (i = 0; i < placed.length; i++) {
      if (placed[i].outer !== null) continue;
      placed[i].outer = (i === 0) ? 1.0 : placed[i - 1].outer;
    }
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
  function capThickness(st) {
    var placed = st.placed;
    var i;
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
  }

  /* --- pass 2: enforce ordering, drop slivers, assign inner radii --- */

  /* Outer radii must decrease monotonically inward. Parameter-driven layers
   * and bias pushes can violate that (a maxed core bias against an unlucky
   * mantle roll), so clamp rather than trusting the rolls. */
  function enforceOrder(st) {
    var placed = st.placed;
    var i;
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
  }

  /* Drop the slivers, and hand each survivor its inner radius. */
  function dropSlivers(st) {
    var placed = st.placed;
    var i;
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
    st.layers = layers;
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
  function findSurface(st) {
    var layers = st.layers;
    var i;
    var surface = 1.0;
    var foundSurface = false;
    for (i = 0; i < layers.length; i++) {
      if (layers[i].outward) continue;
      /* Half the peak-to-trough height sits above the layer's mean radius. */
      var peak = layers[i].outer + layers[i].relief * 0.5;
      if (!foundSurface) { surface = peak; foundSurface = true; }
      else if (peak > surface) surface = peak;
    }
    st.surface = surface;
  }

  /* Rescale so the surface sits exactly at 1.0.
   *
   * Layers are authored as fractions of body radius, but adding an ocean on
   * top of the crust pushes the surface past 1.0, which would make an ocean
   * world render fractionally larger than a desert one at identical
   * settings. Normalizing here keeps "1.0 means the surface" true for
   * everything downstream — stats, the scale bar and every detail element
   * measure against a surface that is always 1.0. */
  function renormalize(st) {
    var layers = st.layers, surface = st.surface;
    var i;
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
      st.surface = 1.0;
    }
  }

  /* HOLLOW LAYERS — voids raised under any layer declaring `gapBelow`, and
   * the access shafts cut through `shafted` ones (js/gen/shells.js). After
   * renormalization, because a gap is a body-space width. */
  function hollow(st) {
    var layers = st.layers, archetype = st.archetype;
    var params = st.params, seed = st.seed;
    var i;
    var specByRole = {};
    for (i = 0; i < archetype.stack.length; i++) specByRole[archetype.stack[i].role] = archetype.stack[i];
    var shafts = CC.Shells.apply(layers, specByRole, archetype, params, seed);
    for (i = 0; i < layers.length; i++) {
      layers[i].slots = CC.Shells.slotsFor(layers[i], shafts);
    }
    st.shafts = shafts;
  }

  /* The built body: the layers, and what the whole body carries. */
  function finish(st) {
    var archetype = st.archetype, params = st.params, seed = st.seed;
    var layers = st.layers, surface = st.surface, shafts = st.shafts;
    var byRole = st.byRole, irregularity = st.irregularity;
    var i;

    /* How far out the picture reaches, so the view can leave room. */
    var extent = 1.0;
    for (i = 0; i < layers.length; i++) extent = Math.max(extent, layers[i].outer);

    var poles = CC.Compact ? CC.Compact.poles(archetype.poles, params, seed) : null;

    return {
      archetype: archetype.id,
      /* A BODY THAT RADIATES INTO THE SPACE AROUND IT.
       *
       * `{ reach, strength, veins }` — see draw/emissive.js `drawEmissiveGlow`.
       * A property of the WHOLE BODY rather than of any layer, because it is
       * light in the space beyond the outermost layer and belongs to no band.
       * Carried here rather than looked up from the archetype in draw/ so the
       * renderer keeps consuming a plain built body and never reaches back
       * into the data tables.
       *
       * Undefined on every existing archetype, so nothing that does not ask
       * for it renders differently. */
      emissiveGlow: archetype.emissiveGlow,
      /* THE SHAPE THE WHOLE BODY IS WARPED INTO — elongation, taper and an
       * eccentric centre. Plain data; draw/scene.js turns it into the warp
       * `view.at` applies. Null on every archetype that does not declare one.
       * See js/gen/form.js. */
      form: CC.Form ? CC.Form.roll(archetype.form, irregularity, seed) : null,
      /* THE BODY'S MAGNETIC GEOMETRY AND WHAT IT EMITS ALONG IT — the axis
       * tilt, the field's twist, the spin, the light cylinder, and the twin
       * beams or jets. Resolved once from named parameters so every mark that
       * is drawn along the axis agrees about where it points. Null on every
       * archetype that does not declare `poles`. See js/gen/compact.js. */
      poles: poles,
      beams: CC.Compact ? CC.Compact.beams(archetype.beams, poles, params) : null,
      /* A HOLE: the spin geometry (horizons, ergosphere, innermost orbit),
       * the disc sliced through, and the darkening of the space around it.
       * Null on every archetype that declares no `hole`. */
      hole: CC.Compact ? CC.Compact.hole(archetype.hole, params, seed) : null,
      /* How large the body is drawn in its own frame, 1 by default. A body
       * whose surroundings ARE the picture — a black hole's disc and jets —
       * declares less, so they fit. Read by draw/scene.js. */
      frame: archetype.frame || 1,
      /* The access shafts, [{angle, half}], or null. See js/gen/shells.js. */
      shafts: shafts,
      layers: layers,
      surface: surface,
      extent: extent,
      has: function (role) { return !!byRole[role] && layers.indexOf(byRole[role]) >= 0; },
      rotation: params.keepUpright ? 0 : (params.rotation || 0)
    };
  }

  /* ---- the stack ------------------------------------------------------ */

  function build(archetype, params, seed) {
    var st = {
      archetype: archetype,
      params: params,
      seed: seed,
      rng: CC.RNG.stream(seed, "structure"),
      variation: params.thicknessVariation === undefined ? 0.7 : params.thicknessVariation,
      optionalChance: params.optionalLayers === undefined ? 0.75 : params.optionalLayers,
      irregularity: params.boundaryIrregularity === undefined ? 1 : params.boundaryIrregularity,
      placed: [],
      byRole: {},
      deferred: [],
      /* WHICH ROLES HAVE BEEN PLACED SO FAR, for the two dependent forms:
       * `presence: { requires }` and `frac_when`. Filled as the walk proceeds,
       * which is why both can only ever look OUTWARD — see resolvePresence. */
      placedRoles: {},
      layers: null,
      surface: 1.0,
      shafts: null
    };

    rollLayers(st);
    settleRelative(st);
    fillOmitted(st);
    capThickness(st);
    enforceOrder(st);
    dropSlivers(st);
    findSurface(st);
    renormalize(st);
    CC.Structure.relativeWobble(st);
    hollow(st);
    return finish(st);
  }

  return {
    build: build,
    MIN_THICKNESS: MIN_THICKNESS
  };
})();
