/* The trait stage: pick a compatible set, then place their instances.
 *
 * TWO JOBS, deliberately in one file because they are two halves of one idea —
 * "which traits does this body have" and "where do their instances go":
 *
 *   select()  compatibility filtering and the count budget
 *   place()   the placement grammar -> concrete elements
 *
 * THE GRAMMAR IS THE WHOLE SYSTEM. anchor / reach / depth / arc / repeat /
 * spacing / jitter / mirror / offset describe every trait, and a trait that
 * cannot be expressed in them means the grammar needs extending — a deliberate
 * decision rather than a special case. See docs/TRAIT-SYSTEM.md.
 *
 * Instances are built through gen/elemgen.js, the SAME builders the layer
 * details use, so a trait's `element` selects from one shared primitive list.
 * That is what stops each trait needing its own renderer.
 *
 * Output is normalized body space, like every other generation stage. */

var CC = CC || {};

CC.TraitRoll = (function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp, lerp = M.lerp;
  var TAU = M.TAU;

  /* ---- selection -------------------------------------------------------- */

  /* Pick a compatible set of traits.
   *
   * RE-FILTER AFTER EVERY PICK. Selecting one trait can exclude others, so the
   * candidate set has to be recomputed each time rather than filtered once up
   * front — TRAIT-SYSTEM.md is explicit about this and it is the kind of thing
   * that silently half-works if done the other way.
   *
   * Structural traits (zone modifiers) COUNT DOUBLE against the budget,
   * because they change so much more of the picture than an ordinary trait.
   *
   * `params.traits` — an explicit list from the picker UI. When present it is
   * honoured as given, filtered for compatibility, and nothing is rolled: the
   * user asked for these. When absent, traits are rolled to the budget. */
  function select(archetype, params, seed) {
    var pool = CC.Traits.eligible(archetype);
    var chosen = [];

    /* Traits the user has excluded in the picker. These are barred from the
     * ROLL only — an explicit selection still honours them, because ticking a
     * trait is a newer and more specific instruction than banning it was. */
    var banned = params.traitExcluded || [];

    function compatible(t, list) {
      /* A trait already chosen, or one that excludes something chosen, or one
       * something chosen excludes. Exclusion is symmetric — declaring it on
       * either side is enough, which means a trait pair only needs recording
       * once. */
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === t.id) return false;
        if ((t.excludes || []).indexOf(list[i].id) >= 0) return false;
        if ((list[i].excludes || []).indexOf(t.id) >= 0) return false;
      }
      return true;
    }

    /* An explicit selection from the UI. */
    if (params.traits) {
      for (var i = 0; i < params.traits.length; i++) {
        var t = CC.Traits.get(params.traits[i]);
        if (!t) continue;
        /* Still checked against the pool, so a selection that survives an
         * archetype change cannot smuggle in an incompatible trait. */
        if (pool.indexOf(t) < 0) continue;
        if (!compatible(t, chosen)) continue;
        chosen.push(t);
      }
      return chosen;
    }

    /* Rolled.
     *
     * `traitSalt` lets "Re-roll traits" produce a different set from the same
     * seed, without disturbing the structure, the palette or any layer detail
     * — each of those runs off its own stream and none of them sees the salt.
     * That is the per-stage RNG separation being used for what it was for. */
    var rng = CC.RNG.stream(seed, "traits/select/" + (params.traitSalt || 0));
    var budget = params.traitCount === undefined ? 2 : params.traitCount;
    if (budget <= 0) return chosen;

    var spent = 0;
    var guard = 0;
    while (spent < budget && guard++ < 60) {
      var candidates = [];
      for (var c = 0; c < pool.length; c++) {
        if (banned.indexOf(pool[c].id) >= 0) continue;
        if (compatible(pool[c], chosen)) candidates.push(pool[c]);
      }
      if (!candidates.length) break;

      var pickIdx = Math.floor(rng() * candidates.length);
      var pick = candidates[clamp(pickIdx, 0, candidates.length - 1)];

      chosen.push(pick);
      spent += 1;
    }

    return chosen;
  }

  /* Find the zone modifier in a selection, if any. At most one applies: two
   * competing angular partitions would fight for the same space and neither
   * would read. */
  function modifierIn(traits) {
    for (var i = 0; i < traits.length; i++) {
      if (CC.Traits.isModifier(traits[i])) return traits[i];
    }
    return null;
  }

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
      for (i = 0; i < n; i++) angles.push(rng() * TAU);
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
  function anchorLayer(trait, body) {
    var role = trait.anchor;
    var i;

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

  /* Build one trait's instances. */
  function placeOne(trait, body, layer, params, seed, zones, ground) {
    var rng = CC.RNG.stream(seed, "trait/" + trait.id);
    var density = params.detailDensity === undefined ? 0.65 : params.detailDensity;
    var tierCap = params.sizeTiers === undefined ? 3 : params.sizeTiers;

    var d = trait.density || { min: 1, max: 1 };
    var count = Math.max(0, Math.round(lerp(d.min, d.max, clamp(density, 0, 1))));
    if (count <= 0) return [];

    var angles = anchorAngles(trait, rng, zones);

    var g = ground && ground[layer.role];

    /* A PLACED TRAIT DRAWS ONE INSTANCE PER ANCHOR POINT.
     *
     * `density` and `repeat`/`mirror` are two different statements, and for
     * traits whose instances are individually meaningful — a polar cap, an
     * impact basin — the placement wins. Ice caps declare `mirror: true` to
     * get both poles and `density {min:1,max:1}` to say "extent, not count";
     * taking the density figure alone produced ONE cap, silently discarding
     * the mirrored one and the whole point of the field.
     *
     * Traits whose density is genuinely a count (veins, debris, speckle) ask
     * for far more instances than they have anchor points, so they keep
     * theirs and scatter around the anchors as before. */
    if (angles.length > count) count = angles.length;

    /* A recipe in the shape gen/elemgen.js expects. The trait grammar and the
     * element recipe format are deliberately close, so this is a rename rather
     * than a translation — and a trait's element is built by exactly the same
     * code a layer detail's is. */
    var recipe = {
      kind: trait.element,
      count: [count, count],
      tiers: trait.tiers || 1,
      size: trait.size,
      sizeRel: trait.sizeRel,
      depth: traitDepth(trait),
      alpha: trait.alpha,
      arc: trait.arc,
      tone: trait.tone || "lighter",
      /* Passed straight through so a trait can ask for the bulk form of a
       * primitive that has one (D60), and for per-instance size/shape scatter
       * on top of the tier system (D62). */
      bulk: trait.bulk,
      chaos: trait.chaos,
      /* An excavation's floor darkness. Drives the depth gradient a basin or
       * a crater is filled with — see draw/details.js's depthFill. */
      floor: trait.floor,
      /* Widens an arc-band's stroke relative to its sweep, so a crater is a
       * round pit rather than a thin scratch along the curve. */
      fat: trait.fat
    };

    var plan = CC.ElemGen.tierSplit(count, Math.min(recipe.tiers, tierCap));

    /* The angular spread each instance may wander within its anchor point.
     * For a trait with a narrow `arc` this keeps the instances inside the
     * wedge they declared rather than scattering around the body. */
    var arcSpan = 0;
    if (trait.arc && trait.spacing !== "even" && trait.element !== "wedge") {
      arcSpan = (trait.arc[1] - trait.arc[0]) * Math.PI / 180;
    }

    var made = CC.ElemGen.build(recipe, layer, plan, count, rng, {
      angles: angles,
      arcSpan: arcSpan,
      phase: rng() * TAU,
      /* Ring bands sit at absolute body radii rather than being scattered
       * through the orbital band, so they get the authored figures. */
      orbit: trait.anchor === "orbit" ? trait.depth : null
    });

    for (var i = 0; i < made.length; i++) {
      made[i].role = layer.role;
      made[i].trait = trait.id;
      /* Traits are not layer details, so the Flow indicators dropdown does not
       * govern them — it means "how diagrammatic is the circulation", which is
       * a statement about layers. */
      made[i].flow = false;

      /* DRY LAND ONLY, THEN SEATED ON THE GROUND AND SUNK INTO IT.
       *
       * BOTH ARE DONE ON THE ELEMENT'S FINAL ANGLE, not on the anchor list.
       * A trait whose count exceeds its anchor count cycles through the
       * anchors and scatters each instance within `arcSpan`, so an anchor
       * moved onto land does not keep its instances there — filtering the
       * anchors left 41% of craters still in open water. The bearing that
       * matters is the one the element actually ends up at.
       *
       * Rejection rather than a hard filter, matching `zoneBias`: an instance
       * that cannot find land keeps its last try rather than vanishing, so a
       * near-waterworld still shows scars on what little land it has instead
       * of silently dropping the trait.
       *
       * Then the radius follows the REAL rock surface at that bearing rather
       * than the layer's mean, and is pushed down by a fraction of the mark's
       * own size — so the scar is cut into the ground it found instead of
       * hovering at a nominal radius near it. */
      if (trait.dryLand && g) {
        if (!g.dry(made[i].angle)) {
          /* Drawn directly from the body's dry bearings rather than guessed
           * at. Rejection sampling collapses on a near-waterworld — at 1%
           * land it left 81% of the scars in open water — and this is exact
           * at any land fraction. `null` means the body genuinely has no
           * shore, in which case the instance keeps its angle: a world with
           * no land has nowhere to put an impact scar, and the honest result
           * is the trait having little to show. */
          var alt = g.landAt(rng());
          if (alt !== null) made[i].angle = alt;
        }
        /* Sunk by a fraction of the mark's RADIAL extent, which for an
         * arc-band is its stroke thickness rather than its `size` — those
         * differ once `fat` widens it, and using the narrower figure left the
         * pits sitting proud of the ground. */
        var reach = made[i].thickness || made[i].size || 0;
        made[i].radius = g.top(made[i].angle) - reach * (trait.sink || 0);
      }
    }

    return made;
  }

  /* A trait's depth range across its anchor, adjusted for `reach`.
   *
   * `on` uses the declared range as-is. `inward` and `outward` push it to the
   * respective end of the layer, which is what makes a magma chamber sit at
   * the top of the mantle where it reads as feeding the crust above it. */
  function traitDepth(trait) {
    var d = trait.depth || [0.1, 0.9];
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
    return d;
  }

  /* ---- the stage -------------------------------------------------------- */

  /* Place every selected trait.
   *
   * Returns { byRole, outward, count }. `outward` holds instances that sit
   * beyond the body — rings and debris — because those draw in a different
   * step of the scene order (behind and in front of the body) rather than
   * inside a layer's clip. */
  function place(traits, body, params, seed, zones, ground) {
    var byRole = {};
    var outward = [];
    var surface = [];
    var damage = [];
    var total = 0;

    for (var i = 0; i < traits.length; i++) {
      var trait = traits[i];
      /* Modifiers draw nothing themselves — they perturb the layers. */
      if (CC.Traits.isModifier(trait)) continue;

      var layer = anchorLayer(trait, body);
      if (!layer) continue;

      var made = placeOne(trait, body, layer, params, seed, zones, ground);
      if (!made.length) continue;

      if (layer.synthetic) {
        outward = outward.concat(made);
      } else if (trait.cutsFrosting) {
        /* SURFACE DAMAGE IS DRAWN AFTER THE DEPOSIT, BECAUSE IT CUTS IT.
         *
         * Impact scars are excavations: they punch through whatever snow, moss
         * or silt lies on the ground and expose the rock underneath. Drawn in
         * the crust's own pass they were painted first and then covered by
         * draw/film.js's frosting a moment later — a "Heavily Cratered" world
         * generated 64-90 scars and showed none of them, because the deposit
         * bites 69-90% down the crust and the scars sit at 81-100%.
         *
         * Pushing them deeper instead would have put them in the middle of the
         * crust, where they read as inclusions rather than as surface damage.
         * The order is what was wrong, so the order is what changed. */
        damage = damage.concat(made);
      } else {
        /* EVERY OTHER IN-BODY TRAIT DRAWS INSIDE ITS ANCHOR LAYER'S OWN PASS.
         *
         * There were two extra branches here that lifted any `wedge` trait out
         * of its layer and onto the true surface, drawn after the fluid pass.
         * Both were written for `ice-caps`, which D27 CUT — caps now emerge
         * from the frosting rather than being drawn as a polygon. That left
         * the branches with exactly one client they were never meant for, the
         * impact basin, which they lifted from the crust to the top of the
         * SEA: on an ocean world the basin was relocated from r=0.905 to
         * r=0.993 and read as a dark wedge hovering in the water.
         *
         * A basin is excavated INTO the crust, so it belongs to the crust and
         * the ocean is supposed to cover it. Anchoring is the grammar's job
         * and `anchor` already answers it — nothing here should second-guess
         * which layer a trait asked for. */
        byRole[layer.role] = (byRole[layer.role] || []).concat(made);
      }
      total += made.length;
    }

    return {
      byRole: byRole,
      outward: outward,
      /* Step 4 of the scene order, "surface-attached": instances drawn after
       * the fluid layers instead of inside a layer's clip.
       *
       * EMPTY, AND CORRECTLY SO. Its only client was the cut `ice-caps` trait
       * (see the note in the loop above). The channel is kept because the draw
       * order it belongs to is real and a genuinely surface-attached trait —
       * something lying ON the sea rather than under it — would want it; it is
       * not kept so that wedges can bypass their anchor. */
      surface: surface,
      /* Surface damage — drawn after the frosting, which it cuts through.
       * Carries its host layer's role like any other element, so the renderer
       * still resolves colour through the ordinary palette path. */
      damage: damage,
      count: total,
      get: function (role) { return byRole[role] || []; }
    };
  }

  return {
    select: select,
    place: place,
    modifierIn: modifierIn,
    anchorAngles: anchorAngles,
    anchorLayer: anchorLayer
  };
})();
