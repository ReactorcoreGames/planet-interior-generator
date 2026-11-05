/* Element builders that belong to one family's vocabulary — storms, hulls,
 * shards, prominences, plumes and heat veins. Each is the shared scatter plus a
 * decoration.
 *
 * Split out of gen/elemgen.js, which passed the 500-line rule, and registered
 * through `CC.ElemGen.registerBuilder`. gen/elemgen.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;
  var lerp = CC.Math.lerp;
  var buildScattered = CC.ElemGen.buildScattered;
  var withOpts = CC.ElemGen.withOpts;

  /* Cyclones. Scattered like any field, plus the squash that makes each one an
   * oval lying along the flow rather than a circle. */
  function buildStorms(recipe, layer, plan, rng, opts) {
    return withOpts(opts, {
      decorate: function (el, r) {
        /* How flattened. A storm in a zonal flow is stretched by the jets
         * either side of it, so none of them is round.
         *
         * THE RECIPE MAY SET THE CENTRE OF THAT RANGE. A great storm is now
         * large enough that the default 0.48-0.74 reads as a lens or a leaf
         * rather than as a cyclone, so it asks for something rounder; the
         * per-element spread is kept either way, because a belt of identically
         * proportioned ovals reads as stamped. */
        var sq = recipe.squash === undefined ? 0.61 : recipe.squash;
        el.squash = clamp(sq + lerp(-0.13, 0.13, r()), 0.30, 1.0);
        /* Lobe count and wobble amplitude. Both default inside the primitive;
         * a trait overrides them when its size makes the defaults wrong — see
         * the notes on GREAT_STORM. */
        if (recipe.lobes !== undefined) el.lobes = recipe.lobes;
        if (recipe.rough !== undefined) {
          el.rough = clamp(recipe.rough * lerp(0.82, 1.18, r()), 0.04, 0.9);
        }
        /* How soft the perimeter is, and — on a spanning storm — how much of
         * its radial extent dissolves at each end. See the storm primitive. */
        if (recipe.feather !== undefined) el.feather = recipe.feather;
        if (recipe.fadeEnds !== undefined) el.fadeEnds = recipe.fadeEnds;
      }
    }, function (o) {
      return buildScattered("storm", recipe, layer, plan, rng, o);
    });
  }

  /* Pressure hulls — platforms and skimmers.
   *
   * `upright` is the whole difference between the two, and it is a real
   * physical statement rather than a style choice: a buoyant platform hangs
   * along the local vertical, pointing at the body's centre, because that is
   * how anything floating sits in a gravity field. A vessel under way lies
   * along its direction of travel, which here is around the body. */
  function buildHulls(recipe, layer, plan, rng, opts) {
    return withOpts(opts, {
      decorate: function (el, r) {
        el.upright = !!recipe.upright;
        /* Slight variation in how stubby each hull is, so a fleet is not
         * stamped from one die. */
        el.aspect = lerp(recipe.aspect ? recipe.aspect[0] : 0.28,
                         recipe.aspect ? recipe.aspect[1] : 0.42, r());
      }
    }, function (o) {
      /* `plate` shares the hull's placement and proportions — a built
       * object lying along the surface — and differs in what is drawn. */
      return buildScattered(recipe.kind === "plate" ? "plate" : "capsule",
                            recipe, layer, plan, rng, o);
    });
  }

  /* Falling crystal. Nothing to decorate — the primitive orients itself along
   * the element's own angle, because a thing falling inward points at the
   * centre by definition. */
  function buildShards(recipe, layer, plan, rng, opts) {
    /* THE BODY'S OWN HUE BAND, rolled ONCE for the whole set rather than per
     * crystal — that is what makes a world's crystals a family instead of
     * confetti. See gemFill. */
    var chromaBase = recipe.chromaSpread ? rng() * 360 : 0;
    return withOpts(opts, {
      decorate: function (el) {
        el.crosswise = !!recipe.crosswise;
        if (recipe.chromaSpread) {
          el.chromaSpread = recipe.chromaSpread;
          el.chromaBase = chromaBase;
        }
      }
    }, function (o) {
      return buildScattered("shard", recipe, layer, plan, rng, o);
    });
  }

  /* PROMINENCES — loops anchored at both ends. The one thing a scattered
   * element cannot supply for itself is `span`, the angular separation of the
   * two footpoints, because it is the field that makes the mark a LOOP rather
   * than a stroke.
   *
   * Span scales with the loop's height, so a tall arc is also a wide one and
   * the family of shapes stays plausible: a prominence a quarter of the star
   * tall with footpoints two degrees apart would be a spike, not an arch. The
   * per-instance scatter on top of that is what keeps a limb full of them from
   * looking like a row of croquet hoops. */
  function buildProminences(recipe, layer, plan, rng, opts) {
    return withOpts(opts, {
      decorate: function (el, r) {
        var base = recipe.span === undefined ? 0.9 : recipe.span;
        /* `size` here is a fraction of the body radius, so the ratio below
         * turns a height into a sensible foot separation. */
        el.span = el.size * base * lerp(0.55, 1.55, r());
        /* A shear on the arch, so the apex is not always centred. */
        el.lean = (r() * 2 - 1) * (recipe.lean === undefined ? 0.5 : recipe.lean);
      }
    }, function (o) {
      return buildScattered("prominence", recipe, layer, plan, rng, o);
    });
  }

  /* PLUMES AND HEAT VEINS — the two marks that stand OFF the limb.
   *
   * Both share `buildScattered`'s placement, exactly as `convection-cell`
   * shares `cell`'s: how a field of things is distributed is one question and
   * what gets drawn at each spot is another, and keeping them separate is
   * what let this whole feature reuse the existing area-correct scatter and
   * tier machinery rather than growing a placement path of its own.
   *
   * `chaos` varies each instance's length INDEPENDENTLY of its width, on the
   * same reasoning `buildVeins` documents: scaling both together only gives
   * the same shape at another size, which is what tiers already do. A field
   * of flames looks alive because no two of them have the same proportions. */
  function buildPlumes(recipe, layer, plan, rng, opts) {
    return withOpts(opts, {
      decorate: function (el, r) {
        var ch = recipe.chaos === undefined ? 0.45 : recipe.chaos;
        el.length = el.size * (1 + (r() * 2 - 1) * ch);
        /* WHICH WAY IT LEANS, AND HOW FAR. Signed, so a field of them shears
         * both ways rather than all raking the same direction — a uniform
         * rake reads as motion blur, and a plume field is not moving. */
        el.curl = (r() * 2 - 1) * (recipe.curl === undefined ? 0.55 : recipe.curl);
      }
    }, function (o) {
      return buildScattered("plume", recipe, layer, plan, rng, o);
    });
  }

  function buildHeatVeins(recipe, layer, plan, rng, opts) {
    return withOpts(opts, {
      decorate: function (el, r) {
        var ch = recipe.chaos === undefined ? 0.55 : recipe.chaos;
        el.length = el.size * (1 + (r() * 2 - 1) * ch);
        el.lean = recipe.lean === undefined ? 0.35 : recipe.lean;
      }
    }, function (o) {
      return buildScattered("heat-vein", recipe, layer, plan, rng, o);
    });
  }

  CC.ElemGen.registerBuilder("storm", function (recipe, layer, plan, count, rng, opts) {
    return buildStorms(recipe, layer, plan, rng, opts);
  });
  CC.ElemGen.registerBuilder("capsule", function (recipe, layer, plan, count, rng, opts) {
    return buildHulls(recipe, layer, plan, rng, opts);
  });
  CC.ElemGen.registerBuilder("plate", function (recipe, layer, plan, count, rng, opts) {
    return buildHulls(recipe, layer, plan, rng, opts);
  });
  CC.ElemGen.registerBuilder("shard", function (recipe, layer, plan, count, rng, opts) {
    return buildShards(recipe, layer, plan, rng, opts);
  });
  CC.ElemGen.registerBuilder("prominence", function (recipe, layer, plan, count, rng, opts) {
    return buildProminences(recipe, layer, plan, rng, opts);
  });
  CC.ElemGen.registerBuilder("plume", function (recipe, layer, plan, count, rng, opts) {
    return buildPlumes(recipe, layer, plan, rng, opts);
  });
  CC.ElemGen.registerBuilder("heat-vein", function (recipe, layer, plan, count, rng, opts) {
    return buildHeatVeins(recipe, layer, plan, rng, opts);
  });
})();
