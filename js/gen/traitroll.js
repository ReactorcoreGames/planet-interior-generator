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

  /* Build one trait's instances. */
  function placeOne(trait, body, layer, params, seed, zones, ground, sectors) {
    var rng = CC.RNG.stream(seed, "trait/" + trait.id);
    var density = params.detailDensity === undefined ? 0.65 : params.detailDensity;
    var tierCap = params.sizeTiers === undefined ? 3 : params.sizeTiers;

    var d = trait.density || { min: 1, max: 1 };
    var count = Math.max(0, Math.round(lerp(d.min, d.max, clamp(density, 0, 1))));

    /* HOW MANY OF THIS ONE, THIS TIME — a per-body roll on top of the slider.
     *
     * `density` alone makes the count a pure function of a global control, so
     * every gas giant at the same Detail density has exactly the same number
     * of platforms. That is right for a texture, where the count is a density
     * and nobody counts them, and wrong for a handful of discrete objects
     * where the number IS a fact about the world: one world has three mining
     * platforms and another has fifteen.
     *
     * `spread: [lo, hi]` multiplies the slider's answer, so the control still
     * governs the overall magnitude and the roll decides where in its own
     * range this body lands. Rolled from the trait's own stream, so it cannot
     * disturb any other trait or any layer detail. */
    if (trait.spread) {
      var mul = lerp(trait.spread[0], trait.spread[1], rng());
      count = Math.max(1, Math.round(count * mul));
    }

    /* HOW MANY OF THIS ONE THE WORLD ITSELF WANTS — a named parameter scaling
     * the count, on top of the slider and the roll.
     *
     * Detail density is a statement about how much texture the USER wants to
     * look at; it is deliberately global and it should stay that way. But some
     * traits have a count that is a fact about the BODY: how many prominences
     * a star throws is Star activity, and it must not require the user to
     * drag a texture control to see one.
     *
     * `driver: { param, at0, at1 }` multiplies the count by a figure
     * interpolated from that parameter. It is the trait-side half of the
     * stellar phase's "one control, two consumers" rule: on a planet
     * `starActivity` scours cover and drives the radiation hazard, and here
     * the SAME figure decides how violent the star's limb is. A second axis
     * for the same fact is exactly what D27 records as the road to a menu of
     * special cases.
     *
     * `at0` may be greater than zero, which is how a trait says the parameter
     * thins it rather than switching it off — a quiet star still has a few
     * prominences. It may also be zero, which is how a trait says it does not
     * happen at all on a calm body: a flare storm is not a faint flare storm. */
    if (trait.driver) {
      var dv = params[trait.driver.param];
      if (dv !== undefined) {
        var a0 = trait.driver.at0 === undefined ? 0 : trait.driver.at0;
        var a1 = trait.driver.at1 === undefined ? 1 : trait.driver.at1;
        count = Math.round(count * lerp(a0, a1, clamp(dv, 0, 1)));
      }
    }

    if (count <= 0) return [];

    var angles = anchorAngles(trait, rng, zones);

    /* PLACED INSIDE THE SECTORS RATHER THAN AROUND THE BODY.
     *
     * Only a trait that both thins and draws passes these, and for that trait
     * the ordinary placement is wrong in a way no `arc` or `offset` could fix:
     * the sectors were chosen by their own roll a moment ago, so where they
     * are is not knowable from the trait declaration. Scattering the marks
     * independently would put the wind where the corona is thickest as often
     * as not — two unrelated features rather than one.
     *
     * The bearings are redistributed across the sectors round-robin and spread
     * over each sector's width, biased AWAY from its centre by a square-root
     * so they do not bunch on the middle line: the field opens across the
     * whole hole, not down its axis. */
    if (sectors && sectors.length) {
      for (var si = 0; si < angles.length; si++) {
        var sec = sectors[si % sectors.length];
        var u = rng() * 2 - 1;
        var off = (u < 0 ? -1 : 1) * Math.sqrt(Math.abs(u)) * sec.half;
        angles[si] = sec.angle + off;
      }
    }

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
      depth: traitDepth(trait, body),
      alpha: trait.alpha,
      arc: trait.arc,
      tone: trait.tone || "lighter",
      /* Passed straight through so a trait can ask for the bulk form of a
       * primitive that has one (D60), and for per-instance size/shape scatter
       * on top of the tier system (D62). */
      bulk: trait.bulk,
      /* Inverts a bulk vein's polarity — a bright reflective lode rather than
       * a dark ore seam. See draw/details.js. */
      bright: trait.bright,
      chaos: trait.chaos,
      /* An excavation's floor darkness. Drives the depth gradient a basin or
       * a crater is filled with — see draw/details.js's depthFill. */
      floor: trait.floor,
      /* Widens an arc-band's stroke relative to its sweep, so a crater is a
       * round pit rather than a thin scratch along the curve. */
      fat: trait.fat,
      /* The banding fields, so a trait may lay concentric shells the same way
       * a layer detail does — `violent-banding` is the first user. Passed
       * through rather than reimplemented, which is the point of the trait
       * grammar and the element recipe format being deliberately close. */
      /* A single meaningful instance rather than one of a field — exempts it
       * from the clumping alpha and takes the largest size tiers. */
      named: trait.named,
      /* Sinks this trait beneath everything else in its layer. See the draw
       * order pass in gen/details.js. */
      under: trait.under,
      /* Storm edge softness, and the radial dissolve on a spanning one. */
      feather: trait.feather,
      /* A storm's silhouette controls. The primitive defaults suit a small
       * mark; a large one needs rounder proportions, a gentler wobble and more
       * lobes or it reads as a faceted shard. See GREAT_STORM. */
      lobes: trait.lobes,
      rough: trait.rough,
      squash: trait.squash,
      /* A CANVAS BLEND FOR THE TRAIT'S OWN ELEMENTS.
       *
       * `screen` is the one that matters: it makes each mark LIGHTEN what is
       * behind it rather than paint over it, which is how `shard` already
       * says "this is transparent" (gemFill). A speckle trait buried in a
       * dark layer needs the same thing — see HELIUM_RAIN. Applied per batch
       * group in draw/details.js, not per element, so it costs no batching. */
      blend: trait.blend,
      /* Crystal orientation, and the per-body chromatic band. */
      crosswise: trait.crosswise,
      chromaSpread: trait.chromaSpread,
      fadeEnds: trait.fadeEnds,
      /* A pressure hull's orientation and proportions. `upright` says it hangs
       * along the local vertical (a buoyant platform) rather than lying along
       * its travel (a vessel under way). */
      upright: trait.upright,
      aspect: trait.aspect,
      bandWidth: trait.bandWidth,
      alternate: trait.alternate,
      /* The zonal-flow fields, likewise: a trait may ask for tangential,
       * counter-rotating motion without any new machinery. */
      zonal: trait.zonal,
      bands: trait.bands,
      /* How far a vein wanders off the radial. A prominence arcs off the limb
       * and comes back; a coronal streamer goes almost straight out. Both are
       * `vein`s and the only thing separating them is this. */
      lean: trait.lean,
      /* Filled per instance below when the trait is placed into thinning
       * sectors; undefined for every other trait. */
      half: undefined
    };

    /* `named` traits take the LARGEST tiers rather than the smallest — a
     * single headline feature, not one instance of a field. See tierSplit. */
    var plan = CC.ElemGen.tierSplit(count, Math.min(recipe.tiers, tierCap),
                                    trait.named);

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
       * through the orbital band, so they get the authored figures — resolved
       * through `orbitBand` first, so a trait declaring `depthAbove` hands
       * over the same band here that `traitDepth` computed. Handing over the
       * raw `trait.depth` instead would put the two placement paths at
       * different radii, which is the kind of disagreement that draws fine and
       * is wrong. */
      orbit: trait.anchor === "orbit"
        ? (orbitBand(trait, body) || trait.depth)
        : null
    });

    for (var i = 0; i < made.length; i++) {
      made[i].role = layer.role;
      made[i].trait = trait.id;
      /* THIS ELEMENT MAY LEAVE THE PICTURE.
       *
       * Spanning traits are clipped to the body's extent so nothing escapes
       * into open space — right for every mark that belongs to the star. A
       * coronal hole's wind is the exception whose whole content is that it
       * does not come back, and draw/scene.js gives it a second unclipped
       * pass.
       *
       * STAMPED HERE RATHER THAN DECLARED ON THE RECIPE, and that distinction
       * cost a render: `ElemGen.build` copies the fields it knows about and
       * silently drops the rest, so a `escapes` in the recipe never reached
       * the element. Everything downstream then read `undefined`, took the
       * clipped path, and the wind was cut off in a perfect circle at the
       * body's extent — the render disagreeing with a flag that was set
       * correctly three files away. Anything the renderer must see that is not
       * already part of the recipe format belongs on this loop. */
      made[i].escapes = trait.escapes;
      /* Traits are not layer details, so the Flow indicators dropdown does not
       * govern them — it means "how diagrammatic is the circulation", which is
       * a statement about layers. */
      made[i].flow = false;

      /* HOW WIDE THE HOLE THIS INSTANCE SITS IN IS.
       *
       * An open field fans across the SECTOR, so its width is a property of
       * the hole rather than of the instance — and the primitive cannot know
       * it, because the sectors were rolled after the trait was declared.
       *
       * Matched by BEARING rather than by anchor index, which is exact and
       * needs no assumption about how `ElemGen.build` distributes instances
       * over anchor points: it cycles them and then scatters each within
       * `arcSpan`, so the index an element came from is not something this
       * loop can recover. The nearest sector centre to where the element
       * actually ended up is the hole it is in. */
      if (sectors && sectors.length) {
        var best = sectors[0], bestD = Infinity;
        for (var sk = 0; sk < sectors.length; sk++) {
          var dd = Math.abs(((made[i].angle - sectors[sk].angle + Math.PI * 3)
                             % (Math.PI * 2)) - Math.PI);
          if (dd < bestD) { bestD = dd; best = sectors[sk]; }
        }
        made[i].half = best.half;
      }

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

    /* A FLOOR ON HOW FAR INWARD A SPANNING TRAIT MAY REACH.
     *
     * `reach: "spanning"` deliberately lets a trait escape its anchor's box,
     * which is what lets a great storm run from the cirrus deck down into the
     * envelope. Nothing bounded the INWARD end of that, and the size increase
     * made the omission visible: on a measured body the deepest storm reached
     * r=0.404 — 60% of the way to the centre, well inside `molecular-h` and
     * close enough to the bright metallic-hydrogen region to read as touching
     * it.
     *
     * That is the one direction where the picture makes a claim it should not.
     * A deep column is right and is most of why the cutaway is worth drawing;
     * a cloud feature overlapping a fluid conductor at thousands of kelvin is
     * not weather, and it reads as a compositing mistake rather than as a
     * bold choice.
     *
     * WHY THE SIZE IS NOT SIMPLY SMALLER. The width at the top is doing
     * wanted work — it is what makes the storm bulge through the cloud deck —
     * so shrinking the element would pay for the floor with the thing the
     * floor is meant to preserve. The reach is what is wrong, so the reach is
     * what is bounded.
     *
     * STRUCTURAL, NOT ABSOLUTE. `floorAt` names layer roles: the trait stops
     * at a MATERIAL boundary the body actually has, so it adapts when the
     * stack rolls thin or thick and when a sibling archetype names its layers
     * differently. `floorFrac` is the fallback for a body with none of them,
     * as a fraction of the surface.
     *
     * Applied by SHRINKING the instance about its own centre, so the outward
     * end is untouched — the element still reaches exactly as far up as it
     * did, and only its inward extent is pulled back. */
    if (trait.floorAt || trait.floorFrac) {
      var floorR = null;
      if (trait.floorAt) {
        var roles = Array.isArray(trait.floorAt) ? trait.floorAt : [trait.floorAt];
        for (var fr = 0; fr < roles.length && floorR === null; fr++) {
          for (var fl = 0; fl < body.layers.length; fl++) {
            if (body.layers[fl].role === roles[fr]) {
              floorR = body.layers[fl].inner;
              break;
            }
          }
        }
      }
      if (floorR === null) {
        floorR = body.surface * (trait.floorFrac === undefined ? 0.55
                                                               : trait.floorFrac);
      }

      for (var fi = 0; fi < made.length; fi++) {
        var fe = made[fi];
        /* The same extent figure the primitive's own gradients use — the
         * furthest the wobbled, curve-corrected outline actually reaches.
         * Kept in step with CURVE_GAIN and the `rough` term in
         * draw/primitives.js; a smaller estimate here would let the visible
         * shape cross a floor this thinks it has enforced. */
        var ext = fe.size * 1.15 * (1 + (fe.rough === undefined ? 0.34
                                                                : fe.rough) * 1.5);
        var deepest = fe.radius - ext;
        if (deepest >= floorR) continue;
        /* How much smaller it has to be for its inward edge to sit on the
         * floor. Never scaled UP — this only ever pulls a storm back. */
        var allow = fe.radius - floorR;
        if (allow <= 0) { fe.size = 0; continue; }
        fe.size *= clamp(allow / ext, 0, 1);
      }
      /* An instance shrunk to nothing is dropped rather than drawn as a
       * degenerate shape. */
      made = made.filter(function (e) { return e.size > 1e-4; });
    }

    /* A COMPANION MARK — the same feature showing at a second radius.
     *
     * The great storm is the first user, and the question it answers is worth
     * stating because it is not obvious. A storm already spans from the
     * troposphere up past the cloud tops, but the cirrus deck is an OUTWARD
     * layer composited over it with `screen` — so a pale high-value deck
     * washed the storm out exactly where it emerged, and the family read as
     * "storms stop below the clouds".
     *
     * Punching a real hole in the deck is the physically honest answer and it
     * needs the layer's alpha to know where every trait instance landed,
     * which is a coupling the architecture deliberately does not have.
     * Drawing the storm after the deck instead would make it read as painted
     * ON the atmosphere and lose the haze-in-front depth cue that is most of
     * what makes the deck feel like a deck.
     *
     * So: a small, faint disturbance at the SAME BEARING, further out. It
     * says "this storm is visible from above" using nothing but the existing
     * element vocabulary, and because it is a separate instance the spanning
     * pass draws it after the outward layers, on top of the haze.
     *
     * DELIBERATELY NOT INHERITED BY STORM BELTS. Thirty disturbances in the
     * thinnest, brightest band in the picture is noise; one per great storm
     * is a feature. That the big storm shows above the clouds and the small
     * ones do not is itself a size cue, which is the same separation the
     * enlarged `size` range is after. */
    if (trait.companion && made.length) {
      var comp = trait.companion;
      var extra = [];
      for (var ci = 0; ci < made.length; ci++) {
        var src = made[ci];
        var cel = {};
        for (var k in src) {
          if (Object.prototype.hasOwnProperty.call(src, k)) cel[k] = src[k];
        }
        /* Its own seed, so the companion's turbulence is not a copy of the
         * parent's rotated outward — two identical storms stacked radially
         * read as a rendering artefact rather than as one system. */
        cel.seed = rng();
        cel.radius = src.radius + (comp.lift || 0);
        cel.size = src.size * (comp.size === undefined ? 0.4 : comp.size);
        cel.alpha = src.alpha * (comp.alpha === undefined ? 0.5 : comp.alpha);
        if (comp.feather !== undefined) cel.feather = comp.feather;
        /* A COMPANION MAY BE A DIFFERENT KIND OF MARK, NOT ONLY A SMALLER
         * COPY.
         *
         * The great storm's disturbance — the case this whole block was
         * written for — is the same element drawn fainter and further out.
         * The coronal hole needs the other shape of the same idea: the wind
         * and the FIELD LINES that let it out are two different marks that
         * must land at the same bearing, because they are one feature seen
         * twice and a version where they scattered independently would read
         * as two unrelated things happening near each other.
         *
         * Both are "a second mark at the same bearing", so both belong here
         * rather than in a second mechanism. `length` follows `size` because
         * the marks that use it are sized by reach rather than by radius, and
         * leaving it at the parent's figure gave field lines the length of the
         * wind they were supposed to overrun. */
        if (comp.element) {
          cel.kind = comp.element;
          if (cel.length !== undefined) {
            cel.length = src.length * (comp.size === undefined ? 0.4
                                                               : comp.size);
          }
        }
        extra.push(cel);
      }
      made = made.concat(extra);
    }

    return made;
  }

  /* A trait's depth range across its anchor, adjusted for `reach`.
   *
   * `on` uses the declared range as-is. `inward` and `outward` push it to the
   * respective end of the layer, which is what makes a magma chamber sit at
   * the top of the mantle where it reads as feeding the crust above it. */
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
    return [edge + trait.depthAbove[0], edge + trait.depthAbove[1]];
  }

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
    var spanning = [];
    var thinning = [];
    var total = 0;

    for (var i = 0; i < traits.length; i++) {
      var trait = traits[i];
      /* The sectors a thinning trait just chose, for the branch below to hand
       * to `placeOne` so a hole's own mark lands in the hole. Null for every
       * ordinary trait, which is all of them but one. */
      var sectors = null;
      /* Modifiers draw nothing themselves — they perturb the layers. */
      if (CC.Traits.isModifier(trait)) continue;

      /* A TRAIT THAT IS AN ABSENCE RATHER THAN A MARK.
       *
       * `thins` says: in these angular sectors, this many of the anchor
       * layer's own elements survive. The trait draws NOTHING — it returns
       * sectors, and gen/details.js removes elements inside them.
       *
       * A CORONAL HOLE IS WHY THIS EXISTS, and it is a genuinely different
       * shape of trait rather than a special case. The first version was a
       * `wedge` with `tone: "darker"` laid over the corona, which the user
       * called out as "a big wedge with a flat color and no fade" — and it
       * HAD to be flat and hard-edged, because the corona is composited with
       * `screen` and dark paint under `screen` is nearly a no-op. A soft dark
       * region there is simply invisible (D121s `dust-formation`, maxdelta
       * 19).
       *
       * A coronal hole is not a dark patch on the corona. It is a place where
       * the field is open and the wind leaves freely, so there is LESS CORONA
       * THERE. Removing the layers own plumes says exactly that, needs no
       * paint at all, and works with the blend mode instead of against it.
       *
       * It reuses the ordinary placement grammar — `repeat`, `arc`, `spacing`,
       * `offset`, `driver` all mean what they always mean — so a hole is
       * placed the same way anything else is. Only the effect differs. */
      if (trait.thins) {
        var trng = CC.RNG.stream(seed, "trait/" + trait.id);
        var hangles = anchorAngles(trait, trng, zones);
        var arcLo = (trait.arc ? trait.arc[0] : 30) * Math.PI / 180;
        var arcHi = (trait.arc ? trait.arc[1] : 60) * Math.PI / 180;
        /* THE DRIVER SCALES A THINNING TRAIT TOO, and leaving it out was a
         * real omission rather than a simplification: coronal holes are most
         * prominent at solar MINIMUM, so `driver` running downward is most of
         * what the trait says about the star. Measured without it, the hole
         * count was identical at activity 0.15 and 0.7 — the one axis the
         * family has, doing nothing.
         *
         * It scales the SECTOR COUNT, which is the same thing it scales for a
         * drawn trait (there, the instance count). A quiet star shows two
         * holes and a violent one may show none. */
        if (trait.driver) {
          var hdv = params[trait.driver.param];
          if (hdv !== undefined) {
            var h0 = trait.driver.at0 === undefined ? 0 : trait.driver.at0;
            var h1 = trait.driver.at1 === undefined ? 1 : trait.driver.at1;
            var hk = lerp(h0, h1, clamp(hdv, 0, 1));
            var hn = Math.round(hangles.length * hk);
            if (hn < 0) hn = 0;
            if (hn < hangles.length) hangles = hangles.slice(0, hn);
          }
        }
        for (var hi = 0; hi < hangles.length; hi++) {
          thinning.push({
            trait: trait.id,
            angle: hangles[hi],
            /* Half-width of the sector, so a consumer needs no arithmetic. */
            half: lerp(arcLo, arcHi, trng()) * 0.5,
            /* How many elements survive at the centre. */
            keep: trait.thins.keep === undefined ? 0.15 : trait.thins.keep,
            /* How far past the sector the effect feathers out, as a fraction
             * of the half-width. A hard edge is the thing this replaces. */
            feather: trait.thins.feather === undefined ? 0.55
                                                       : trait.thins.feather
          });
        }
        total++;
        /* A THINNING TRAIT MAY ALSO DRAW, AND THE COMBINATION IS THE POINT.
         *
         * The branch used to `continue` unconditionally: a trait either
         * removed elements or placed them, never both. That was right for as
         * long as the only thinning trait was a pure absence, and it is what
         * made the coronal hole hard to SEE — the user's report was that it
         * "blends in", which is the honest outcome of a feature defined
         * entirely as less of something. An absence reads only against a
         * baseline the eye can still measure, and on a busy corona there is no
         * such baseline.
         *
         * The fix is not to make the absence deeper. It is to give the hole
         * something of its own: the sector keeps its thinned corona AND gets
         * the escaping wind drawn into it, which is the thing that is
         * physically there when the field opens. So a trait declaring both
         * `thins` and `element` falls through to ordinary placement, and the
         * drawn instances are steered onto the sectors that were just chosen
         * (see `sectors` in placeOne) rather than being placed independently —
         * a hole whose wind blew somewhere else would be two features. */
        if (!trait.element) continue;
        sectors = thinning.slice(thinning.length - hangles.length);
      }

      var layer = anchorLayer(trait, body);
      if (!layer) continue;

      var made = placeOne(trait, body, layer, params, seed, zones, ground,
                          sectors);

      if (!made.length) continue;

      if (layer.synthetic) {
        outward = outward.concat(made);
      } else if (trait.reach === "spanning") {
        /* A SPANNING TRAIT ESCAPES ITS ANCHOR'S CLIP.
         *
         * Every in-body element is drawn inside `clipToLayer`, which is what
         * stops a mantle's detail leaking into the crust. A trait whose whole
         * point is to CROSS layers cannot live there — it would be cut at both
         * boundaries, which is precisely the half-a-storm the great storm was
         * getting. So it draws in its own pass with a clip to the body as a
         * whole, exactly as surface damage already does for its own reason.
         *
         * `fadeEnds` then dissolves it at both extremes, so it ends by fading
         * rather than by being cut — the thing the layer clip used to do
         * accidentally and badly. */
        spanning = spanning.concat(made);
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
      /* Traits that CROSS layer boundaries — drawn in their own pass, clipped
       * to the body rather than to a band. See the note in the loop above. */
      spanning: spanning,
      /* Surface damage — drawn after the frosting, which it cuts through.
       * Carries its host layer's role like any other element, so the renderer
       * still resolves colour through the ordinary palette path. */
      damage: damage,
      /* ANGULAR SECTORS WHERE A LAYER'S OWN ELEMENTS ARE REMOVED, rather than
       * anything drawn. See the `thins` branch in the loop above — this is how
       * a coronal hole is expressed, and it carries no paint at all. */
      thinning: thinning,
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
