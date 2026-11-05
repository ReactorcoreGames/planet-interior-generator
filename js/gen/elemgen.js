/* Element builders — the size-tier system and one constructor per element
 * shape.
 *
 * Split out of gen/details.js, which passed the 500-line rule once zones
 * landed. The division is deliberate:
 *
 *   gen/elemgen.js   HOW one element is built — tiers, placement, decoration
 *   gen/details.js   WHICH elements a body gets — the stage that walks the
 *                    layer stack, reads the recipes and applies the controls
 *
 * Everything here is NORMALIZED BODY SPACE. No pixels, no colours, no canvas.
 * Two rules depend on that separation and both are enforced by tests:
 *
 *   RESOLUTION INDEPENDENCE. Counts and sizes are decided here, where view.R
 *   does not exist, so a body emits the same elements at 360p and at 2160p.
 *   Nothing in this file may consult a pixel size.
 *
 *   COLOUR NEVER RE-ROLLS GEOMETRY. Elements carry a `tone` naming how their
 *   colour derives from the layer, never a colour. Changing the palette
 *   redraws this same cached geometry.
 *
 * THE SIZE TIER SYSTEM is the mechanic Phase 3 lived or died on — see
 * `tierSplit`. Loaded before gen/details.js, which consumes it.
 *
 * AFTER THE SPLIT (Session AL) this file keeps the tiers, the placement
 * helpers, the shared scatter and the dispatch. The builders are in
 * gen/elemgen-basic.js, gen/elemgen-mosaic.js and gen/elemgen-family.js, which
 * load straight after this file and register through `registerBuilder`. */

var CC = CC || {};

CC.ElemGen = (function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp, lerp = M.lerp;
  var TAU = M.TAU;

  /* ---- the size tier system ------------------------------------------- */

  /* How the instances of one element split across size classes.
   *
   * Each tier down is roughly half the size and about three times as numerous.
   * That geometric fall-off is what reads as intricate: the large elements give
   * the layer its structure, and the small ones fill the space between them so
   * there is always something more to look at when you lean in.
   *
   * FOUR RULES THAT MATTER MORE THAN THE NUMBERS, and the first pass got the
   * last two wrong:
   *
   * 1. Large elements are the FAINT ones. A big opaque blob is what makes
   *    procedural output look like clip art. Small elements sit near full
   *    alpha — individually crisp, collectively texture.
   * 2. Tier 0 drops first when the Size tiers slider is lowered, so reducing
   *    tiers removes the loudest elements rather than the texture.
   * 3. Shares must be heavily weighted to the SMALL end. Too even and every
   *    element lands in one size class and the layer reads as bubble wrap.
   * 4. Size steps must be wide. Too narrow and the tiers are
   *    indistinguishable, giving texture without structure.
   *
   * A ~4x size range from top to bottom tier with ~15x the count is what makes
   * a layer read as intricate rather than as uniform noise. */
  var TIER_SHARE = [0.035, 0.13, 0.32, 0.515];  /* count share, tier 0 outward */
  var TIER_SIZE  = [1.00, 0.52, 0.27, 0.14];    /* size multiplier */
  var TIER_ALPHA = [0.55, 0.78, 1.00, 1.15];    /* alpha multiplier */

  /* Split a total count across `n` tiers, returning a plan per tier.
   *
   * With fewer tiers the shares are renormalized over the tiers that remain,
   * so lowering the slider redistributes the elements rather than deleting
   * them — the body keeps its density and loses only its size variety. */
  /* `named` INVERTS WHICH TIERS SURVIVE, and it exists because the ordinary
   * rule is exactly backwards for a single large feature.
   *
   * Tiers are built for FIELDS: at one tier the smallest class is what
   * remains, so turning the Size-tiers slider down thins the variety without
   * making everything enormous. That is right for grain, veins and debris, and
   * catastrophic for a trait that is one named object. A Great Storm declared
   * `tiers: 1` was drawn at TIER_SIZE[3] — 0.14x — which put the body's
   * headline feature at THREE TIMES SMALLER than the ordinary convection cells
   * it was supposed to dominate. It generated, it placed, it drew, and it was
   * invisible.
   *
   * `buildWedges` already had a hand-rolled version of this escape (see its
   * note on impact basins shrinking to slivers); `named` is that reasoning
   * made general, so any trait that is a feature rather than a field can ask
   * for it. Takes the FIRST n tiers instead of the last, so one tier means the
   * largest rather than the smallest. */
  function tierSplit(total, n, named) {
    n = clamp(Math.round(n), 1, TIER_SHARE.length);

    /* Take the LAST n tiers, so tier 0 (the largest, loudest) is the first to
     * go. At n=1 what remains is a mid-size tier, not a giant one. A `named`
     * feature takes the first n, for the reason above. */
    var first = named ? 0 : TIER_SHARE.length - n;
    var last = named ? Math.min(n, TIER_SHARE.length) : TIER_SHARE.length;
    var sum = 0, i;
    for (i = first; i < last; i++) sum += TIER_SHARE[i];

    var out = [];
    var assigned = 0;
    for (i = first; i < last; i++) {
      var share = TIER_SHARE[i] / sum;
      var c = Math.round(total * share);
      assigned += c;
      /* A NAMED FEATURE TAKES NO TIER ALPHA PENALTY EITHER.
       *
       * TIER_ALPHA runs 0.55 at tier 0 up to 1.15 at tier 3 — large elements
       * are drawn fainter so a field of them does not shout. That is right for
       * a field and wrong for one object: gas-miner platforms authored at
       * alpha 0.90-1.0 were drawn at 0.51, because being the largest tier
       * halved them. The clumping exemption alone did not cover it, and the
       * two together are what "this instance means something on its own"
       * actually requires. */
      out.push({ tier: i, count: c, size: TIER_SIZE[i],
                 alpha: named ? 1 : TIER_ALPHA[i] });
    }

    /* Rounding can lose or gain an element; put the difference in the smallest
     * tier, where one more or fewer is invisible. */
    if (out.length) out[out.length - 1].count += (total - assigned);
    for (i = 0; i < out.length; i++) out[i].count = Math.max(0, out[i].count);

    return out;
  }

  /* ---- density ---------------------------------------------------------- */

  /* An element's instance count at the current Detail density.
   *
   * Every element declares its own [min, max] and reads the one global slider
   * in its own terms — TRAIT-SYSTEM.md is explicit that the slider means "how
   * much is going on here", not "multiply everything by N". */
  function countFor(recipe, density) {
    var c = recipe.count || [1, 1];
    return Math.max(0, Math.round(lerp(c[0], c[1], clamp(density, 0, 1))));
  }

  /* ---- placement -------------------------------------------------------- */

  /* Where in a layer's band an element sits.
   *
   * `depth` is normalized to the LAYER'S OWN THICKNESS: 0 is its inner edge,
   * 1 its outer edge. Resolved to a radius here, so an element rides with its
   * layer when a neighbour's thickness moves it. Deriving anything visual from
   * a measured radius instead is PROGRESS.md D12's trap. */
  function radiusAt(layer, t) {
    return layer.inner + clamp(t, 0, 1) * layer.thickness;
  }

  /* Distribute a uniform roll across a band BY AREA rather than by radius.
   *
   * A band's area grows with radius, so scattering elements uniformly in `t`
   * crowds them toward the inner edge and leaves the outer part of a thick
   * layer looking empty. Weighting by sqrt spreads them evenly over the
   * visible area, which is what makes a mantle look uniformly populated
   * instead of having a dense ring with bare margins. */
  function areaSpread(u, layer, dLo, dHi) {
    var rIn = layer.inner + dLo * layer.thickness;
    var rOut = layer.inner + dHi * layer.thickness;

    /* A NEGATIVE RADIUS FOLDS UNDER THE SQUARE ROOT, so a depth range that
     * reaches below the layer's floor has to fall back to a plain lerp.
     *
     * The area weighting exists so a scatter is uniform per unit AREA rather
     * than per unit radius — without it, elements bunch toward the inner edge
     * of a wide band. That reasoning needs r >= 0 at both ends. A `spanning`
     * trait may legitimately author `dLo` well below 0 (the great storm
     * reaches two troposphere-thicknesses under its own floor), and squaring a
     * negative `rIn` turned it positive again: the storm was placed as though
     * its range were mirrored, which is why it stayed inside the band it was
     * supposed to cross. */
    if (rIn < 0 || rOut < 0) return lerp(dLo, dHi, u);

    var r = Math.sqrt(lerp(rIn * rIn, rOut * rOut, u));
    return (r - layer.inner) / Math.max(1e-6, layer.thickness);
  }

  /* ---- element builders ------------------------------------------------- */

  /* Every builder returns a plain object carrying `kind`, a position, a size,
   * an alpha and a `tone`. The renderer dispatches on `kind` and knows nothing
   * about which layer or archetype produced it. */

  /* An element's size range, in body-space units.
   *
   * `sizeRel: true` on a recipe means the authored numbers are fractions of
   * the LAYER'S OWN THICKNESS rather than of the body radius. A thin crust
   * needs smaller strata than a thick mantle needs cells, and authoring both
   * in absolute units means every layer's detail has to be re-tuned whenever
   * the proportions move. Relative sizing is what lets one recipe read
   * correctly across the whole range a layer can roll. */
  function sizeRange(recipe, layer) {
    var s = recipe.size || [0.010, 0.020];
    if (!recipe.sizeRel) return s;
    return [s[0] * layer.thickness, s[1] * layer.thickness];
  }

  /* Angular placement for one instance. Scattered elements roll a free angle;
   * trait instances arrive with an `angles` list already computed by the
   * placement grammar, which is what gives `repeat` / `spacing` / `mirror` /
   * `offset` their meaning. Reading it here rather than in every builder keeps
   * the grammar in one place. `arcSpan` narrows the roll to a wedge. */
  function angleFor(opts, index, rng) {
    if (!opts || !opts.angles || !opts.angles.length) return rng() * TAU;
    var base = opts.angles[index % opts.angles.length];
    var spanRad = (opts.arcSpan === undefined ? 0 : opts.arcSpan);
    if (spanRad <= 0) return base;
    return base + (rng() - 0.5) * spanRad;
  }

  function buildScattered(kind, recipe, layer, plan, rng, opts) {
    var out = [];
    var dLo = recipe.depth ? recipe.depth[0] : 0.05;
    var dHi = recipe.depth ? recipe.depth[1] : 0.95;
    var sr = sizeRange(recipe, layer);
    var sLo = sr[0];
    var sHi = sr[1];
    var aLo = recipe.alpha ? recipe.alpha[0] : 0.15;
    var aHi = recipe.alpha ? recipe.alpha[1] : 0.35;

    var n = 0;
    for (var p = 0; p < plan.length; p++) {
      var tier = plan[p];
      for (var i = 0; i < tier.count; i++) {
        var angle = angleFor(opts, n++, rng);
        var t = areaSpread(rng(), layer, dLo, dHi);
        var size = lerp(sLo, sHi, rng()) * tier.size;

        /* LARGE-SCALE CLUMPING.
         *
         * Uniformly scattered elements are technically dense but read as a
         * flat field — the eye finds no structure to rest on. A slow variation
         * across the layer gives regions that are busier and regions that are
         * quieter, which is what makes a layer look like material with a
         * history rather than like even static.
         *
         * Applied to ALPHA rather than to placement, so it costs nothing and
         * cannot leave bald patches. The field is sampled per element from its
         * own angle and depth, so it stays deterministic and needs no state. */
        /* A NAMED FEATURE IS EXEMPT. Clumping exists to stop a FIELD reading
         * as even static, and it does that by taking up to 38% of an
         * element's alpha wherever the field happens to be quiet. On a
         * handful of individually meaningful instances that is just a random
         * dimming: gas-miner platforms authored at alpha 0.85-1.0 were drawn
         * at 0.34-0.59 and vanished into the layer. There is no field here
         * for the variation to structure. Nor is there on an EVENLY SPACED
         * set: a regular row is not a field, and dimming its members at
         * random breaks the regularity that is its whole point. */
        var clump = (recipe && (recipe.named || recipe.spacing === "even")) ? 1
          : 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(
              angle * 2.3 + t * 5.1 + (opts && opts.phase ? opts.phase : 0)));

        var el = {
          kind: kind,
          tier: tier.tier,
          angle: angle,
          radius: radiusAt(layer, t),
          depth: t,
          size: size,
          alpha: lerp(aLo, aHi, rng()) * tier.alpha * clump,
          tone: recipe.tone || "shift",
          /* A per-element roll the renderer can use for shape variation
           * without needing its own stream. */
          seed: rng()
        };

        /* An optional canvas blend for this element. Set only when the recipe
         * asks, so the property stays absent on the overwhelming majority of
         * elements and the batch key below is unaffected for them. */
        if (recipe.blend) el.blend = recipe.blend;

        if (opts && opts.decorate) opts.decorate(el, rng, recipe, tier);
        out.push(el);
      }
    }
    return out;
  }

  /* Merge a builder's own decorate function with any supplied by the caller,
   * so the trait grammar can add fields without every builder knowing about
   * it. Both run; the caller's runs second and may override. */
  function withOpts(opts, own, run) {
    var merged = {}, k;
    for (k in opts) {
      if (Object.prototype.hasOwnProperty.call(opts, k)) merged[k] = opts[k];
    }
    var outer = opts && opts.decorate;
    merged.decorate = function (el, rng, recipe, tier) {
      if (own.decorate) own.decorate(el, rng, recipe, tier);
      if (outer) outer(el, rng, recipe, tier);
    };
    return run(merged);
  }

  /* Dispatch: build one recipe's instances.
   *
   * The single entry point both the layer-detail stage and the trait stage
   * call, so a trait's `element` field selects from exactly the same builders
   * a layer detail does — which is what TRAIT-SYSTEM.md means by keeping the
   * primitive list small and reusable. */
  function build(recipe, layer, plan, count, rng, opts) {
    opts = opts || {};
    /* A LAYER DETAIL MAY BE SPACED EVENLY, as a trait may: one even ring,
     * interleaved across the tiers (gen/evenspacing.js). A trait arrives
     * with its own angles, which win. */
    if (recipe.spacing === "even" && !(opts.angles && opts.angles.length)) {
      opts = withOpts(opts, {}, function (o) { return o; });
      opts.angles = CC.EvenSpacing.angles(plan, recipe.jitter || 0, rng);
    }
    /* A BUILDER REGISTERED FROM ANOTHER FILE, the way primitives are
     * (CC.Primitives.register): every shaped kind, this file's own families
     * included. Same signature as `build`. Anything else is a plain scatter. */
    if (BUILDERS[recipe.kind]) {
      return BUILDERS[recipe.kind](recipe, layer, plan, count, rng, opts);
    }
    return buildScattered(recipe.kind, recipe, layer, plan, rng, opts);
  }

  var BUILDERS = {};
  function registerBuilder(kind, fn) {
    if (BUILDERS[kind]) throw new Error("element builder already registered: " + kind);
    BUILDERS[kind] = fn;
  }

  /* NAMED PLACEMENTS for traits (`place` — see placeOne in gen/traitplace.js).
   * `fn(made, trait, body, layer, params, seed, rng)` returns the elements,
   * moved. Kept here beside the builders because a family registers both from
   * its own file, and this file loads before any of them. */
  var PLACERS = {};
  function registerPlacer(name, fn) {
    if (PLACERS[name]) throw new Error("trait placer already registered: " + name);
    PLACERS[name] = fn;
  }

  return {
    /* Shared with the files split out of this one. */
    angleFor: angleFor,
    buildScattered: buildScattered,
    withOpts: withOpts,
    build: build,
    registerBuilder: registerBuilder,
    registerPlacer: registerPlacer,
    placer: function (name) { return PLACERS[name] || null; },
    /* The shared scatter, for registered builders that only decorate. */
    scatter: function (kind, recipe, layer, plan, rng, opts, decorate) {
      return withOpts(opts, { decorate: decorate },
        function (o) { return buildScattered(kind, recipe, layer, plan, rng, o); });
    },
    tierSplit: tierSplit,
    countFor: countFor,
    sizeRange: sizeRange,
    radiusAt: radiusAt,
    areaSpread: areaSpread,
    TIER_SHARE: TIER_SHARE,
    TIER_SIZE: TIER_SIZE,
    TIER_ALPHA: TIER_ALPHA
  };
})();
