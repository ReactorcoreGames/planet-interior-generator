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
 * `tierSplit`. Loaded before gen/details.js, which consumes it. */

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
  function tierSplit(total, n) {
    n = clamp(Math.round(n), 1, TIER_SHARE.length);

    /* Take the LAST n tiers, so tier 0 (the largest, loudest) is the first to
     * go. At n=1 what remains is a mid-size tier, not a giant one. */
    var first = TIER_SHARE.length - n;
    var sum = 0, i;
    for (i = first; i < TIER_SHARE.length; i++) sum += TIER_SHARE[i];

    var out = [];
    var assigned = 0;
    for (i = first; i < TIER_SHARE.length; i++) {
      var share = TIER_SHARE[i] / sum;
      var c = Math.round(total * share);
      assigned += c;
      out.push({ tier: i, count: c, size: TIER_SIZE[i], alpha: TIER_ALPHA[i] });
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
        var clump = 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(
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

        if (opts && opts.decorate) opts.decorate(el, rng, recipe, tier);
        out.push(el);
      }
    }
    return out;
  }

  /* Band-like elements: arcs that follow the layer's curvature. */
  function buildArcs(recipe, layer, plan, rng, opts) {
    return withOpts(opts, {
      decorate: function (el, r) {
        var arc = recipe.arc || [30, 120];
        /* Larger tiers get longer arcs, so the size tier reads in the sweep as
         * well as in the thickness. */
        var span = lerp(arc[0], arc[1], r()) * lerp(0.55, 1.0, TIER_SIZE[el.tier]);
        el.arc = span * Math.PI / 180;
        /* `fat` widens the stroke relative to its sweep.
         *
         * An arc-band is a stroke along the layer's curve, so a short arc
         * drawn at ordinary thickness comes out as a thin scratch. A crater is
         * the opposite proportion — wide across and shallow along — so it asks
         * for a thickness several times its default and reads as a round pit
         * rather than as a scrape. Absent on strata and cloud belts, which
         * genuinely are long and thin. */
        el.thickness = el.size * (recipe.fat || 1);
      }
    }, function (o) {
      return buildScattered("arc-band", recipe, layer, plan, rng, o);
    });
  }

  /* Full concentric bands — atmosphere sub-bands, compression rings, the ocean
   * depth gradient. Evenly spaced across the layer rather than scattered, which
   * is what makes them read as structure rather than as noise. */
  function buildBands(recipe, layer, count, rng) {
    var out = [];
    var dLo = recipe.depth ? recipe.depth[0] : 0.1;
    var dHi = recipe.depth ? recipe.depth[1] : 0.9;
    var aLo = recipe.alpha ? recipe.alpha[0] : 0.12;
    var aHi = recipe.alpha ? recipe.alpha[1] : 0.30;

    for (var i = 0; i < count; i++) {
      /* Evenly spaced, with a small jitter so they are not mechanical. */
      var t = count === 1 ? (dLo + dHi) / 2
                          : lerp(dLo, dHi, i / (count - 1));
      t += (rng() * 2 - 1) * 0.03;

      out.push({
        kind: "gradient-band",
        tier: 0,
        angle: 0,
        radius: radiusAt(layer, t),
        depth: clamp(t, 0, 1),
        size: layer.thickness * lerp(0.10, 0.26, rng()),
        alpha: lerp(aLo, aHi, rng()),
        tone: recipe.tone || "lighter",
        seed: rng()
      });
    }
    return out;
  }

  /* Convection cells: closed circulation loops. Distributed around the ring
   * with even spacing plus jitter, because real convection tiles a layer
   * rather than clustering — and an evenly tiled ring is what makes the mantle
   * read as circulating instead of as scattered blobs. */
  function buildCells(recipe, layer, plan, rng, opts) {
    var out = [];
    var dLo = recipe.depth ? recipe.depth[0] : 0.1;
    var dHi = recipe.depth ? recipe.depth[1] : 0.9;
    var sr = sizeRange(recipe, layer);
    var sLo = sr[0];
    var sHi = sr[1];
    var aLo = recipe.alpha ? recipe.alpha[0] : 0.14;
    var aHi = recipe.alpha ? recipe.alpha[1] : 0.32;

    for (var p = 0; p < plan.length; p++) {
      var tier = plan[p];
      if (tier.count <= 0) continue;
      var step = TAU / tier.count;
      /* Each tier gets its own starting offset so the tiers interleave rather
       * than stacking on the same spokes. */
      var phase = rng() * TAU;

      for (var i = 0; i < tier.count; i++) {
        var angle = (opts && opts.angles && opts.angles.length)
          ? angleFor(opts, i, rng)
          : phase + step * i + (rng() * 2 - 1) * step * 0.30;
        var t = areaSpread(rng(), layer, dLo, dHi);
        out.push({
          kind: "cell",
          tier: tier.tier,
          angle: angle,
          radius: radiusAt(layer, t),
          depth: t,
          size: lerp(sLo, sHi, rng()) * tier.size,
          alpha: lerp(aLo, aHi, rng()) * tier.alpha,
          /* Which way this cell turns. Neighbouring cells in a convecting
           * layer counter-rotate, so alternating reads as physical. */
          spin: (i % 2 === 0) ? 1 : -1,
          tone: recipe.tone || "lighter",
          seed: rng()
        });
      }
    }
    return out;
  }

  /* Directional elements: arrows and flow lines. Radial by default — heat
   * rises — with a tangential component so the picture shows circulation
   * rather than a pincushion. */
  function buildDirectional(kind, recipe, layer, plan, rng, opts) {
    return withOpts(opts, {
      decorate: function (el, r) {
        /* Mostly outward, sometimes inward: a convecting layer carries
         * material both ways and one-way arrows look like a fountain. */
        el.outward = r() < 0.62 ? 1 : -1;
        /* How much the element leans around the body rather than straight up.
         * Non-zero is what turns a radial tick into a circulation indicator. */
        el.lean = (r() * 2 - 1) * 0.55;
        el.length = el.size;
      }
    }, function (o) {
      return buildScattered(kind, recipe, layer, plan, rng, o);
    });
  }

  /* Branching lines: veins, fractures. */
  function buildVeins(recipe, layer, plan, rng, opts) {
    return withOpts(opts, {
      decorate: function (el, r) {
        el.length = el.size;
        el.lean = (r() * 2 - 1) * 0.9;
        /* Larger veins branch; small ones are single strokes. Branching only
         * at the top tier keeps the count affordable and the look controlled. */
        el.branches = el.tier === 0 ? (2 + Math.floor(r() * 3))
                    : el.tier === 1 ? (r() < 0.5 ? 1 : 2)
                    : 0;
        el.width = lerp(0.9, 2.2, TIER_SIZE[el.tier]);

        /* THE BULK FORM, opted into by the recipe (D60).
         *
         * A vein drawn as a thin stroke is the same visual category as the
         * flow-lines and cell outlines around it, so a trait made of them
         * disappears into the layer's own detail. `bulk` asks the primitive
         * for a filled, tapering, two-tone lode instead. It rides on the
         * recipe rather than on the role, because whether a vein is a hairline
         * fracture or a fat ore seam is a fact about the ELEMENT, not about
         * which layer it landed in. */
        if (recipe.bulk) el.bulk = recipe.bulk;

        /* PER-INSTANCE CHAOS, on top of the tier system (D62).
         *
         * `chaos: 0.5` means each vein's length and girth are scattered by up
         * to ±50% of their tier's figure — INDEPENDENTLY, so a vein can come
         * out short and fat or long and thin rather than merely bigger or
         * smaller. That independence is the point: scaling both together just
         * gives the same shape at another size, which is what tiers already
         * do. A vein system looks grown rather than placed because no two of
         * its seams have the same proportions. */
        if (recipe.chaos) {
          var ch = recipe.chaos;
          el.length = el.size * (1 + (r() * 2 - 1) * ch);
          el.widthScale = 1 + (r() * 2 - 1) * ch;
          /* Branch count varies too, or every vein has the same silhouette of
           * offshoots however different its trunk is. */
          if (el.branches > 0 && r() < ch * 0.5) {
            el.branches += (r() < 0.5 ? -1 : 1);
            if (el.branches < 0) el.branches = 0;
          }
        }
      }
    }, function (o) {
      return buildScattered("vein", recipe, layer, plan, rng, o);
    });
  }

  /* Irregular filled shapes. */
  function buildBlobs(recipe, layer, plan, rng, opts) {
    return withOpts(opts, {
      decorate: function (el, r) {
        el.lobes = 5 + Math.floor(r() * 4);
        el.rough = 0.22 + r() * 0.30;
        el.squash = 0.65 + r() * 0.6;
      }
    }, function (o) {
      return buildScattered("blob", recipe, layer, plan, rng, o);
    });
  }

  /* Tapering polar shapes — ice caps, missing sections. Placed by the
   * grammar's angle list rather than scattered, since a wedge is a single
   * object at a specific bearing rather than one of a field. */
  function buildWedges(recipe, layer, plan, rng, opts) {
    var out = [];
    var dLo = recipe.depth ? recipe.depth[0] : 0.0;
    var dHi = recipe.depth ? recipe.depth[1] : 1.0;
    var aLo = recipe.alpha ? recipe.alpha[0] : 0.5;
    var aHi = recipe.alpha ? recipe.alpha[1] : 0.9;
    var arc = recipe.arc || [30, 60];

    var n = 0;
    for (var p = 0; p < plan.length; p++) {
      var tier = plan[p];
      for (var i = 0; i < tier.count; i++) {
        var angle = angleFor(opts, n++, rng);
        /* A wedge spans the layer's full declared depth rather than sitting
         * at a point in it: it is a cap over the band, not an inclusion. */
        out.push({
          kind: "wedge",
          tier: tier.tier,
          angle: angle,
          radius: radiusAt(layer, dHi),
          inner: radiusAt(layer, dLo),
          depth: dHi,
          /* `arc` IS THE FULL SPAN, so the half-angle the primitive wants is
           * half of it. Passing the whole arc as a half-angle drew every
           * wedge at twice its declared width; taking it as authored and
           * halving here keeps the data meaning what the grammar says it
           * means (`arc` — "degrees of the layer it covers"). */
          /* NOT scaled by the tier's size multiplier.
           *
           * Tier sizes exist so a FIELD of instances reads as intricate, and
           * at one tier `tierSplit` returns the smallest class (0.14x) —
           * which shrank a 46-degree polar cap to a 6-degree sliver. A wedge
           * is a single named feature whose extent is authored directly and
           * is the trait's whole meaning, so it takes the arc as written and
           * lets `repeat` handle multiplicity. */
          size: lerp(arc[0], arc[1], rng()) * Math.PI / 180 * 0.5,
          alpha: lerp(aLo, aHi, rng()) * tier.alpha,
          tone: recipe.tone || "lighter",
          /* How dark this shape's floor goes, for an excavation. Absent on an
           * ordinary wedge, which fills flat exactly as before. */
          floor: recipe.floor,
          seed: rng()
        });
      }
    }
    return out;
  }

  /* Concentric elliptical bands beyond the body — ring systems.
   *
   * `reach: "outward"` traits sit at radii GREATER than 1.0, so these are
   * placed against the body radius rather than inside a layer band. The view
   * already knows how to leave room for them via `body.extent`. */
  function buildRings(recipe, layer, count, rng, opts) {
    var out = [];
    /* Rings are placed in BODY RADII directly, from the trait's own authored
     * figures — `opts.orbit` carries them unconverted, because a ring is a
     * full circle at a radius rather than an instance scattered in a band. */
    var orbit = (opts && opts.orbit) || null;
    var dLo = orbit ? orbit[0] : (recipe.depth ? recipe.depth[0] : 1.4);
    var dHi = orbit ? orbit[1] : (recipe.depth ? recipe.depth[1] : 2.2);
    var aLo = recipe.alpha ? recipe.alpha[0] : 0.18;
    var aHi = recipe.alpha ? recipe.alpha[1] : 0.55;

    for (var i = 0; i < count; i++) {
      var t = count === 1 ? 0.5 : i / (count - 1);
      /* Even spacing with jitter, so the rings read as structured rather than
       * scattered — TRAIT-SYSTEM's "even spacing with low jitter reads as
       * regular", which is what makes a ring system look orbital. */
      var r = lerp(dLo, dHi, t) + (rng() * 2 - 1) * 0.035;

      out.push({
        kind: "ring-band",
        tier: 0,
        angle: 0,
        radius: r,
        depth: t,
        /* Width varies so a ring system has major bands and faint ones, which
         * is most of what makes it read as Saturn rather than as a target. */
        size: lerp(0.012, 0.075, rng() * rng()),
        alpha: lerp(aLo, aHi, rng()),
        /* How much of the band is empty — the Cassini-division look. */
        gap: rng() < 0.22,
        tone: recipe.tone || "lighter",
        seed: rng()
      });
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
    switch (recipe.kind) {
      case "gradient-band": return buildBands(recipe, layer, count, rng);
      case "ring-band":     return buildRings(recipe, layer, count, rng, opts);
      case "arc-band":      return buildArcs(recipe, layer, plan, rng, opts);
      case "cell":          return buildCells(recipe, layer, plan, rng, opts);
      case "wedge":         return buildWedges(recipe, layer, plan, rng, opts);
      case "arrow":
      case "flow-line":     return buildDirectional(recipe.kind, recipe, layer, plan, rng, opts);
      case "vein":          return buildVeins(recipe, layer, plan, rng, opts);
      case "blob":          return buildBlobs(recipe, layer, plan, rng, opts);
      default:              return buildScattered(recipe.kind, recipe, layer, plan, rng, opts);
    }
  }

  return {
    build: build,
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
