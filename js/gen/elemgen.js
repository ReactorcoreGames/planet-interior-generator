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
         * for the variation to structure. */
        var clump = (recipe && recipe.named) ? 1
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
    /* HOW THICK EACH BAND IS — AND FOR AN ALTERNATING COMB, RELATIVE TO ITS
     * SPACING RATHER THAN TO THE LAYER.
     *
     * This cost a round and is worth recording. `bandWidth` was authored as a
     * fraction of the LAYER's thickness, independent of how many bands were
     * being drawn, and for a handful of wide atmosphere sub-bands that is
     * fine. For a thirty-band comb it is a trap: the spacing between bands is
     * the layer divided by the count, so at thirty bands each one came out
     * SEVEN TIMES wider than the gap to its neighbour. Every point on the
     * layer was covered by about seven bands of alternating tone, which
     * composite back to the base colour — thirty-one correctly generated,
     * correctly coloured, correctly alternating bands that added up to a flat
     * wash. The picture looked like the bands were missing; they were all
     * there, on top of each other.
     *
     * An alternating comb therefore sizes itself against its own SPACING. At
     * `bandWidth` 1.0 consecutive bands just touch; below that they leave the
     * layer's colour showing between them, above it they overlap slightly and
     * the ripple softens. That is a proportion that stays correct at any
     * count, which a fraction of the layer never can.
     *
     * A non-alternating set keeps the old meaning — a few wide concentric
     * shells genuinely are a fraction of the layer, and they do not have a
     * neighbour to interfere with. */
    var bw = recipe.bandWidth || [0.10, 0.26];
    var sizeLo = bw[0], sizeHi = bw[1];
    /* `size` is a HALF-width in the primitive, so the spacing is halved. */
    var pitch = recipe.alternate
      ? (dHi - dLo) / Math.max(1, count) * 0.5
      : 1;

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
        size: layer.thickness * pitch * lerp(sizeLo, sizeHi, rng()),
        alpha: lerp(aLo, aHi, rng()),
        /* ALTERNATING TONE — what turns a stack of concentric bands into
         * zones and belts.
         *
         * A recipe may declare `alternate: ["lighter", "darker"]`, and each
         * successive band takes the next entry. That is the whole of gas-giant
         * banding: one existing primitive, drawn many times, with its tone
         * cycling. Nothing in draw/ learns a new word — `tone` was already a
         * per-element field resolved at paint time, so this only changes what
         * the generator writes into it.
         *
         * General on purpose. A machine world's hull plating and a star's
         * convective shells want the same thing, and none of them wants a
         * banding primitive of its own. */
        tone: recipe.alternate
                ? recipe.alternate[i % recipe.alternate.length]
                : (recipe.tone || "lighter"),
        /* Carried onto the element so the draw-order pass can see it. */
        under: recipe.under,
        seed: rng()
      });
    }
    return out;
  }

  /* Convection cells: closed circulation loops. Distributed around the ring
   * with even spacing plus jitter, because real convection tiles a layer
   * rather than clustering — and an evenly tiled ring is what makes the mantle
   * read as circulating instead of as scattered blobs. */
  /* `kind` is a parameter rather than being hardcoded, because two primitives
   * want this placement: the gas giant's vortex `cell` and the star's closed
   * `convection-cell`. The PLACEMENT is what they share — evenly spaced around
   * the layer with a jitter, interleaved across tiers — and that even spacing
   * is precisely what makes a field of cells tile instead of clumping. Sharing
   * the builder is what stops the two drifting apart. */
  function buildCells(recipe, layer, plan, rng, opts, kind) {
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
          kind: kind || "cell",
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

        /* COUNTER-ROTATING FLOW — a zonal jet rather than a convective one.
         *
         * `zonal: [lo, hi]` says this element travels AROUND the body rather
         * than through it: the lean becomes the whole of its motion and its
         * radial travel shrinks to a token. `bands` then splits the layer into
         * that many radial belts and flips the direction between adjacent
         * ones, which is what makes a giant's jets read as shearing against
         * each other instead of all streaming one way.
         *
         * Both are plain numbers on an existing element. The arrow primitive
         * already curves its shaft by `lean` and already takes a signed
         * `outward`; this only chooses different values for them. */
        if (recipe.zonal) {
          var belts = recipe.bands || 6;
          var belt = Math.floor(clamp(el.depth, 0, 0.999) * belts);
          var way = (belt % 2 === 0) ? 1 : -1;
          el.lean = lerp(recipe.zonal[0], recipe.zonal[1], r()) * way;
          /* A shallow radial rise, so the arrow still reads as an arrow with a
           * direction rather than as a tangent stroke. */
          el.outward = r() < 0.5 ? 1 : -1;
          el.length = el.size * (recipe.zonalRise === undefined
                                 ? 0.28 : recipe.zonalRise);
        }
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
        /* HOW FAR THE VEIN WANDERS OFF THE RADIAL.
         *
         * 0.9 is a crust fracture: a crack finds whatever path the rock gives
         * it, so it meanders a long way round. A star's radiative zone wants
         * the opposite — a photon's outward crawl is drawn as a STREAK, and a
         * streak that wanders is a squiggle. `lean` is the general knob for
         * that, defaulting to the fracture's own figure so nothing that
         * existed before this changes. Any family that wants near-radial
         * strokes says `lean: 0.06` and gets them. */
        var span = recipe.lean === undefined ? 0.9 : recipe.lean;
        el.lean = (r() * 2 - 1) * span;
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
        /* Which way round the two-tone goes — a bright reflective lode or a
         * dark ore seam. See draw/details.js. */
        el.bright = !!recipe.bright;

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

    /* ONE SHADOW BEARING FOR THE WHOLE SYSTEM — see `shadow` below. Rolled
     * before the loop so every band shares it. */
    var shadowAt = rng() * Math.PI * 2;

    for (var i = 0; i < count; i++) {
      var t = count === 1 ? 0.5 : i / (count - 1);
      /* Even spacing with jitter, so the rings read as structured rather than
       * scattered — TRAIT-SYSTEM's "even spacing with low jitter reads as
       * regular", which is what makes a ring system look orbital. */
      var r = lerp(dLo, dHi, t) + (rng() * 2 - 1) * 0.035;

      out.push({
        /* THE RECIPE NAMES ITS OWN MARK. This was hardcoded to "ring-band",
         * which was the only ring there was — and it silently made the trait's
         * `element` field a lie for any ring that wanted a different one. A
         * giant's `ringlet-system` asks for `ringlet-band`, which is a
         * genuinely different object (resolved ringlets, knife-edge
         * divisions, the body's shadow); see draw/primitives/orbital.js.
         *
         * IT IS `recipe.kind`, NOT `recipe.element`. A trait's `element` has
         * already been renamed to `kind` by the time gen/traitroll.js hands
         * the recipe over — reading `element` here found undefined, fell back
         * to the old value, and the giant drew the ring it was supposed to
         * have stopped drawing. The render looked plausible and the change
         * looked applied, which is what made it worth a probe rather than a
         * glance: the element count was right and only the KIND was wrong.
         *
         * Defaulted to the old value, so the rocky ring and every existing
         * body are unaffected. */
        kind: recipe.kind || "ring-band",
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
        /* WHERE THE BODY'S SHADOW FALLS, as a bearing. One value for the whole
         * system, because every band is lit by the same star — rolled once
         * outside this loop rather than per band, or each ring would be
         * shadowed in a different direction and the system would read as
         * unrelated circles.
         *
         * Stamped on the element rather than left on the recipe: D159 —
         * `build` copies the fields it knows and silently drops the rest, so
         * anything the renderer must see belongs here. Only `ringlet-band`
         * reads it; `ring-band` ignores it, so this costs the rocky ring
         * nothing. */
        shadow: shadowAt,
        tone: recipe.tone || "lighter",
        seed: rng()
      });
    }
    return out;
  }

  /* ---- the mosaic ------------------------------------------------------- */

  /* A Voronoi field of broken rock: ONE element carrying every cell site.
   *
   * WHY IT IS ONE ELEMENT. Every other builder here emits N independent
   * instances, because every other mark IS independent — move one speckle and
   * the rest are unaffected. A Voronoi cell has no shape of its own; it is
   * defined entirely by where its neighbours are. So the mosaic is a single
   * structure and it is built and drawn as one, which is also what lets it be
   * an ordinary `KINDS` entry rather than a special pass in draw/scene.js.
   *
   * `count` is therefore the CELL COUNT rather than the instance count — the
   * one place in this file where that is true, and it is true because a mosaic
   * with two hundred cells is one mosaic, not two hundred mosaics.
   *
   * ---- COHESION IS THE WHOLE PARAMETER -----------------------------------
   *
   * The spec (docs/celestials/solid-bodies.md) folds `rubble-pile` and
   * `void-riddled` into one axis, and the reason it is worth a slider is that
   * it drives four things AT ONCE and they have to move together:
   *
   *   cell count   low cohesion is many small fragments; high is few large
   *                ones. A loose aggregate is made of gravel, a monolith of
   *                slabs
   *   cell size    follows from the count, but the SPREAD widens as cohesion
   *                falls — a rubble pile has boulders in among the gravel
   *   voids        the fraction of cells that are holes. This is the mark that
   *                actually says "rubble pile", and it goes to nearly nothing
   *                at full cohesion
   *   seam width   the joints open up as the body loosens
   *
   * Driving them from one number is what makes the two ends read as genuinely
   * different bodies rather than as the same picture with a dial nudged.
   *
   * `mosaicCohesion` on the recipe names the parameter, so the coupling is
   * declared in the elements table rather than assumed here.
   *
   * ---- WHY THE SITES ARE NOT A UNIFORM SCATTER ---------------------------
   *
   * `areaSpread` is used for the radius exactly as everywhere else, so the
   * cells are uniform per unit AREA and the field does not crowd the centre.
   * But a purely random point set produces Voronoi cells of wildly uneven
   * size, with long thin slivers wherever two sites land close together —
   * which reads as cracked glass rather than as rock.
   *
   * One round of Lloyd relaxation would fix it properly and needs the diagram,
   * which does not exist at generation time. The cheap equivalent is to lay
   * the sites on a JITTERED POLAR LATTICE: rings of cells with a per-ring
   * phase offset and a bounded jitter. That gives cells that vary in size
   * without producing slivers, and it costs nothing.
   *
   * The jitter is what keeps it from reading as a lattice. At zero it is a
   * honeycomb; at the figure below it is rubble. */
  function buildMosaic(recipe, layer, count, rng, opts) {
    var params = (opts && opts.params) || null;
    var cells = Math.max(3, Math.round(count));

    /* Cohesion, 0..1. Absent means "solid" rather than "loose": a layer that
     * asks for a mosaic without naming a parameter wants a plain aggregate,
     * not a body falling apart. */
    var coh = 1;
    if (recipe.mosaicCohesion && params &&
        params[recipe.mosaicCohesion] !== undefined) {
      coh = clamp(params[recipe.mosaicCohesion], 0, 1);
    }

    /* FEWER, LARGER CELLS AS THE BODY TIGHTENS. The authored `count` is the
     * loose end — the count a rubble pile wants — and cohesion scales it down
     * towards a monolith. Not to nothing: even a solid fragment of rock has
     * internal structure, and a mosaic of three cells is not a mosaic. */
    cells = Math.max(6, Math.round(cells * lerp(1.0, 0.28, coh)));

    var dLo = recipe.depth ? recipe.depth[0] : 0.0;
    var dHi = recipe.depth ? recipe.depth[1] : 1.0;

    /* HOW MANY OF THE CELLS ARE HOLES.
     *
     * The authored range is at cohesion 0 and cohesion 1 respectively, so the
     * elements table states the two ends of the picture directly rather than
     * a base figure and a multiplier. At the tight end it is deliberately not
     * zero — a fragment with no voids at all is a disc of tiles, and a couple
     * of pockets is what keeps it reading as rock. */
    var vr = recipe.voids || [0.30, 0.02];
    var voidChance = lerp(vr[0], vr[1], coh);

    /* HOW MANY MATERIALS. The spec asks for 2-4, "enough variation to read as
     * different materials, not enough to look like confetti". Rolled per body
     * rather than fixed, so two asteroids differ in composition and not only
     * in colour. */
    var mr = recipe.materials || [2, 4];
    var materials = Math.round(lerp(mr[0], mr[1], rng()));

    /* THE LATTICE. Rings chosen so the cells come out roughly round: a ring
     * count near the square root of the cell count gives each ring about as
     * many cells as there are rings, which is the isotropic case. */
    var rings = Math.max(1, Math.round(Math.sqrt(cells * 0.62)));

    /* Each ring takes a share of the cells proportional to its own
     * circumference, which is what keeps the density uniform per unit AREA
     * rather than per unit radius — `areaSpread`'s argument, applied to a
     * lattice. The radii are wanted before the placement loop, so they are
     * measured in one pass first. */
    var radii = [];
    var total = 0;
    for (var r0 = 0; r0 < rings; r0++) {
      var tr = areaSpread((r0 + 0.5) / rings, layer, dLo, dHi);
      var rr = Math.max(0.05, radiusAt(layer, tr));
      radii.push({ t: tr, r: rr });
      total += rr;
    }

    var sites = [];
    var placed = 0;
    var jitter = recipe.jitter === undefined ? 0.52 : recipe.jitter;

    for (var ring = 0; ring < rings && placed < cells; ring++) {
      var want = Math.max(1, Math.round(cells * radii[ring].r / total));
      if (ring === rings - 1) want = Math.max(1, cells - placed);
      want = Math.min(want, cells - placed);

      var phase = rng() * TAU;
      var step = TAU / want;

      for (var i = 0; i < want; i++) {
        var angle = phase + step * i + (rng() * 2 - 1) * step * jitter;
        /* The radial jitter is a fraction of the ring SPACING rather than of
         * the body, so it stays inside the band whatever the layer's thickness
         * rolled to — the `sizeRel` argument applied to placement. */
        var rJit = (rng() * 2 - 1) * (1 / rings) * jitter * 0.9;
        var tt = clamp(radii[ring].t + rJit * (dHi - dLo), dLo, dHi);

        sites.push({
          angle: angle,
          radius: radiusAt(layer, tt),
          /* WHICH MATERIAL THIS FRAGMENT IS. Rolled per cell, so neighbouring
           * fragments genuinely differ — the alternative, banding the
           * materials by radius, would read as strata, and this layer is
           * explicitly not stratified. */
          material: Math.floor(rng() * materials),
          hollow: rng() < voidChance,
          /* Which fragments catch the light. Rolled here rather than derived
           * from the material, because a sheen is a property of the individual
           * face's angle rather than of the mineral. */
          shine: rng()
        });
        placed++;
      }
    }

    /* THE SEAM OPENS AS THE BODY LOOSENS. Authored in body-space units so it
     * is resolution-independent, like every other size in this file. */
    var sm = recipe.seam || [0.010, 0.0022];
    var seam = lerp(sm[0], sm[1], coh);

    var el = {
      kind: "mosaic",
      tier: 0,
      /* A mosaic has no position of its own — it IS the layer. The angle and
       * radius are carried anyway because draw/details.js reads them for the
       * zone tint and the thermal gradient, and the layer's midpoint is the
       * honest answer to "where is this element". */
      angle: 0,
      radius: layer.inner + layer.thickness * 0.5,
      depth: 0.5,
      size: layer.thickness,
      alpha: recipe.alpha ? lerp(recipe.alpha[0], recipe.alpha[1], rng()) : 1,
      tone: recipe.tone || "shift",
      seed: rng(),
      sites: sites,
      seam: seam,
      materialCount: materials,
      cohesion: coh,
      /* What the primitive clips its Voronoi rectangle to. The layer's outer
       * edge rather than 1.0, so a mosaic in a thin band does not build a
       * diagram across the whole body. */
      radiusOuter: layer.outer
    };
    if (opts && opts.decorate) opts.decorate(el, rng, recipe, { tier: 0 });
    return [el];
  }

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
      return buildScattered("capsule", recipe, layer, plan, rng, o);
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
      /* Shares `ring-band`'s PLACEMENT — concentric bands at orbital radii —
       * and differs entirely in what is drawn there: a sparse debris ring
       * against a giant's ringlet-resolved sheet. The same shape as
       * `convection-cell` sharing `cell`'s placement above, and for the same
       * reason: two claims about the same distribution of material.
       *
       * It must be listed HERE and not only on the trait, because this switch
       * dispatches on the KIND STRING. Without the case it fell through to the
       * generic scatter builder, which produced no rings at all — while the
       * giant still drew a ring system, because its trait had been rolled and
       * the OLD mark was what came out. A change that looks like it worked. */
      case "ringlet-band":  return buildRings(recipe, layer, count, rng, opts);
      case "arc-band":      return buildArcs(recipe, layer, plan, rng, opts);
      case "cell":          return buildCells(recipe, layer, plan, rng, opts);
      /* Shares `cell`'s placement — see buildCells — and differs entirely in
       * what gets drawn there. A vortex and a convection cell are two claims
       * about the same distribution of material. */
      case "convection-cell":
        return buildCells(recipe, layer, plan, rng, opts, "convection-cell");
      /* THE ONE BUILDER THAT TAKES `count` RATHER THAN `plan`, and it is not
       * an oversight: a mosaic's count is a CELL count, and cells are defined
       * by their neighbours, so there is nothing for a size tier to mean. It
       * shares that shape with `gradient-band` and `ring-band` above, which
       * are structures rather than scatters for the same reason. */
      case "mosaic":        return buildMosaic(recipe, layer, count, rng, opts);
      case "wedge":         return buildWedges(recipe, layer, plan, rng, opts);
      case "arrow":
      case "flow-line":     return buildDirectional(recipe.kind, recipe, layer, plan, rng, opts);
      case "vein":          return buildVeins(recipe, layer, plan, rng, opts);
      case "blob":          return buildBlobs(recipe, layer, plan, rng, opts);
      case "storm":         return buildStorms(recipe, layer, plan, rng, opts);
      case "capsule":       return buildHulls(recipe, layer, plan, rng, opts);
      case "shard":         return buildShards(recipe, layer, plan, rng, opts);
      case "prominence":    return buildProminences(recipe, layer, plan, rng, opts);
      case "plume":         return buildPlumes(recipe, layer, plan, rng, opts);
      case "heat-vein":     return buildHeatVeins(recipe, layer, plan, rng, opts);
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
