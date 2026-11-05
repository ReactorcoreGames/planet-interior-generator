/* One trait's instances: how many, on which bearings, from what recipe, built by
 * the same builders a layer detail uses. `placeOne` keeps the order of the
 * passes; each is a stage sharing one state object, and those after the build
 * are in gen/traitfinish.js.
 *
 * Split out of gen/traitroll.js, which passed the 500-line rule. Attached to
 * CC.TraitRoll; gen/traitroll.js and gen/traitanchor.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp, lerp = M.lerp;
  var TAU = M.TAU;
  var anchorAngles = CC.TraitRoll.anchorAngles;
  var groundTop = CC.TraitRoll.groundTop;
  var orbitBand = CC.TraitRoll.orbitBand;
  var traitDepth = CC.TraitRoll.traitDepth;

  /* ---- how many ---------------------------------------------------------- */

  function rollCount(st) {
    var trait = st.trait, layer = st.layer, params = st.params;
    var rng = st.rng, density = st.density;

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

    /* A NAMED PLACER MAY SET THE COUNT ITSELF — `plan` on the placer. A
     * pocket trait counts per cluster (three fields of two to nine cloudlets
     * each), which the slider's one total cannot say. Absent everywhere else. */
    var placer = trait.place && CC.ElemGen.placer(trait.place);
    var pre = placer && placer.plan ? placer.plan(trait, layer, count, rng) : null;
    if (pre) count = pre.count;
    st.count = count;
    st.placer = placer;
    st.pre = pre;
  }

  /* ---- on which bearings ------------------------------------------------- */

  function steerAngles(st) {
    var trait = st.trait, body = st.body, sectors = st.sectors;
    var count = st.count;

    var angles = anchorAngles(trait, st.rng, st.zones);

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
    var rng = st.rng;
    if (sectors && sectors.length) {
      for (var si = 0; si < angles.length; si++) {
        var sec = sectors[si % sectors.length];
        var u = rng() * 2 - 1;
        var off = (u < 0 ? -1 : 1) * Math.sqrt(Math.abs(u)) * sec.half;
        angles[si] = sec.angle + off;
      }
    }

    /* KEPT CLEAR OF THE JETS AND THE DISC — `clear: true` on an orbital
     * trait. The wedges are the body's own, so the trait cannot know them;
     * see CC.Compact.clearAngles. The pad is the mark's half-width plus,
     * for a cluster, the half-arc it spreads over. */
    if (trait.clear && trait.anchor === "orbit" && CC.Compact && CC.Compact.clearAngles) {
      var od = orbitBand(trait, body) || trait.depth || [2, 2];
      var orR = (od[0] + od[1]) / 2 * (body.surface || 1);
      var sz = trait.size ? trait.size[1] : 0;
      var pad = Math.atan2(sz, orR);
      if (trait.arc && trait.spacing !== "even") {
        pad += (trait.arc[1] - trait.arc[0]) * Math.PI / 360;
      }
      angles = CC.Compact.clearAngles(angles, body, orR, pad);
    }

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
    st.angles = angles;
    st.count = count;
  }

  /* ---- from what recipe -------------------------------------------------- */

  /* A recipe in the shape gen/elemgen.js expects. The trait grammar and the
   * element recipe format are deliberately close, so this is a rename rather
   * than a translation — and a trait's element is built by exactly the same
   * code a layer detail's is. */
  function makeRecipe(st) {
    var trait = st.trait, body = st.body, layer = st.layer, count = st.count;
    return {
      kind: trait.element,
      count: [count, count],
      tiers: trait.tiers || 1,
      size: trait.size,
      sizeRel: trait.sizeRel,
      /* A LAYER MAY RE-STATE WHERE IN ITSELF A TRAIT SITS, by trait id —
       * the asteroid's shell asks an impact basin to span its whole band,
       * since its real edges wander past any fixed fraction of it. */
      depth: (layer.traitDepth && layer.traitDepth[trait.id]) ||
             traitDepth(trait, body),
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
       * order pass in gen/details-instances.js. */
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
      /* An unfinished Dyson shell's open arcs (gen/dyson.js). */
      gaps: trait.gaps,
      /* Filled per instance below when the trait is placed into thinning
       * sectors; undefined for every other trait. */
      half: undefined
    };
  }

  /* ---- the build --------------------------------------------------------- */

  function buildElements(st, recipe) {
    var trait = st.trait, body = st.body, layer = st.layer;
    var params = st.params, seed = st.seed, rng = st.rng;
    var count = st.count, tierCap = st.tierCap, angles = st.angles;
    var placer = st.placer, pre = st.pre;

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
        : null,
      /* Where the ground is under an orbit — the top of the outermost layer
       * that is not haze — for anything that reaches down to it: a space
       * elevator's foot (gen/orbitalbuilt.js). */
      ground: trait.anchor === "orbit" ? groundTop(body) : null,
      /* The body seed and the settings, as gen/details.js hands them to a
       * layer's builders — a builder that places by a per-body field needs
       * both. Every builder that does not read them ignores them. */
      seed: seed,
      params: params
    });

    /* A NAMED PLACEMENT — `place: "<name>"` on the trait. The grammar's
     * anchor/angle/depth says where an instance goes round a body made of
     * shells; a body made of gas has no shells to be round, and its traits
     * belong where its gas is thick, or thin, or where another trait is. A
     * placer registered by name (CC.ElemGen.registerPlacer) takes the built
     * elements and moves them, so the element itself is still built by the
     * same builder a layer detail uses. Absent on every trait that does not
     * ask. */
    if (placer) made = placer(made, trait, body, layer, params, seed, rng, pre);
    st.made = made;
  }

  /* ---- the passes, in order ---------------------------------------------- */

  /* Build one trait's instances. */
  function placeOne(trait, body, layer, params, seed, zones, ground, sectors) {
    var st = {
      trait: trait,
      body: body,
      layer: layer,
      params: params,
      seed: seed,
      zones: zones,
      ground: ground,
      sectors: sectors,
      rng: CC.RNG.stream(seed, "trait/" + trait.id),
      density: params.detailDensity === undefined ? 0.65 : params.detailDensity,
      tierCap: params.sizeTiers === undefined ? 3 : params.sizeTiers
    };

    rollCount(st);
    if (st.count <= 0) return [];
    steerAngles(st);
    buildElements(st, makeRecipe(st));
    CC.TraitRoll.stampInstances(st);
    CC.TraitRoll.floorInstances(st);
    CC.TraitRoll.addCompanions(st);
    return st.made;
  }

  CC.TraitRoll.placeOne = placeOne;
})();
