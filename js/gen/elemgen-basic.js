/* Element builders — the shapes any body uses: arcs, bands, cells, flow marks,
 * veins, blobs, wedges and rings.
 *
 * Split out of gen/elemgen.js, which passed the 500-line rule, and registered
 * through `CC.ElemGen.registerBuilder`. gen/elemgen.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;
  var lerp = CC.Math.lerp;
  var TAU = CC.Math.TAU;
  var TIER_SIZE = CC.ElemGen.TIER_SIZE;
  var radiusAt = CC.ElemGen.radiusAt;
  var areaSpread = CC.ElemGen.areaSpread;
  var sizeRange = CC.ElemGen.sizeRange;
  var angleFor = CC.ElemGen.angleFor;
  var buildScattered = CC.ElemGen.buildScattered;
  var withOpts = CC.ElemGen.withOpts;

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

  /* What used to be `build`'s switch, in its order. `count` and `plan` are not
   * interchangeable: `gradient-band` and `ring-band` are structures rather than
   * scatters, so a size tier has nothing to mean for them. */
  CC.ElemGen.registerBuilder("gradient-band", function (recipe, layer, plan, count, rng, opts) {
    return buildBands(recipe, layer, count, rng);
  });
  CC.ElemGen.registerBuilder("ring-band", function (recipe, layer, plan, count, rng, opts) {
    return buildRings(recipe, layer, count, rng, opts);
  });
  /* Shares `ring-band`'s PLACEMENT — concentric bands at orbital radii — and
   * differs entirely in what is drawn there: a sparse debris ring against a
   * giant's ringlet-resolved sheet. It must be registered and not only named
   * on the trait: without an entry it falls through to the generic scatter,
   * which produces no rings at all, while the giant still draws a ring system
   * because its trait rolled and the OLD mark comes out. A change that looks
   * like it worked. */
  CC.ElemGen.registerBuilder("ringlet-band", function (recipe, layer, plan, count, rng, opts) {
    return buildRings(recipe, layer, count, rng, opts);
  });
  CC.ElemGen.registerBuilder("arc-band", function (recipe, layer, plan, count, rng, opts) {
    return buildArcs(recipe, layer, plan, rng, opts);
  });
  CC.ElemGen.registerBuilder("cell", function (recipe, layer, plan, count, rng, opts) {
    return buildCells(recipe, layer, plan, rng, opts);
  });
  /* Shares `cell`'s placement — see buildCells — and differs entirely in what
   * gets drawn there. A vortex and a convection cell are two claims about the
   * same distribution of material. */
  CC.ElemGen.registerBuilder("convection-cell", function (recipe, layer, plan, count, rng, opts) {
    return buildCells(recipe, layer, plan, rng, opts, "convection-cell");
  });
  CC.ElemGen.registerBuilder("wedge", function (recipe, layer, plan, count, rng, opts) {
    return buildWedges(recipe, layer, plan, rng, opts);
  });
  CC.ElemGen.registerBuilder("arrow", function (recipe, layer, plan, count, rng, opts) {
    return buildDirectional("arrow", recipe, layer, plan, rng, opts);
  });
  CC.ElemGen.registerBuilder("flow-line", function (recipe, layer, plan, count, rng, opts) {
    return buildDirectional("flow-line", recipe, layer, plan, rng, opts);
  });
  CC.ElemGen.registerBuilder("vein", function (recipe, layer, plan, count, rng, opts) {
    return buildVeins(recipe, layer, plan, rng, opts);
  });
  CC.ElemGen.registerBuilder("blob", function (recipe, layer, plan, count, rng, opts) {
    return buildBlobs(recipe, layer, plan, rng, opts);
  });
})();
