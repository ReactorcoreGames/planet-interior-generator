/* A trait's instances after the build: what each one is stamped with, where
 * it comes to rest, how far in it may reach, and its companion marks. Stages of
 * `placeOne` (gen/traitplace.js), sharing its state object.
 *
 * Split out of gen/traitroll.js, which passed the 500-line rule. Attached to
 * CC.TraitRoll; gen/traitroll.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;

  /* ---- the stamps, and dry land ------------------------------------------ */

  function stampInstances(st) {
    var trait = st.trait, body = st.body, layer = st.layer;
    var ground = st.ground, sectors = st.sectors;
    var rng = st.rng, density = st.density, made = st.made;
    var g = ground && ground[layer.role];

    for (var i = 0; i < made.length; i++) {
      made[i].role = layer.role;
      made[i].trait = trait.id;
      /* THIS ELEMENT MAY LEAVE THE PICTURE.
       *
       * Spanning traits are clipped to the body's extent so nothing escapes
       * into open space — right for every mark that belongs to the star. A
       * coronal hole's wind is the exception whose whole content is that it
       * does not come back, and draw/scene-surface.js gives it a second unclipped
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
      /* SEATED ON THE DRAWN SURFACE — see `seatOn` in draw/scene-surface.js. Stamped
       * here for the same D159 reason as `escapes`. */
      made[i].seat = trait.seat;
      /* SOMETHING SOMEBODY BUILT, drawn over the natural orbital material
       * in its half (draw/zonepaint.js, D297). */
      made[i].built = (trait.tags || []).indexOf("artificial") >= 0;
      /* The body's magnetic geometry, for a mark drawn along it (an
       * accretion stream follows a field line). Absent on every body that
       * declares no `poles`. See js/gen/compact.js. */
      if (body.poles) made[i].poles = body.poles;
      /* Detail density, for a one-element trait whose marks are drawn in
       * its primitive and so never pass the count scaling (the pulsar
       * wind's wisps, D316). */
      made[i].detail = density;
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
  }

  /* ---- the floor --------------------------------------------------------- */

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
  function floorInstances(st) {
    var trait = st.trait, body = st.body, made = st.made;
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
    st.made = made;
  }

  /* ---- the companion ----------------------------------------------------- */

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
  function addCompanions(st) {
    var trait = st.trait, rng = st.rng, made = st.made;
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
    st.made = made;
  }

  CC.TraitRoll.stampInstances = stampInstances;
  CC.TraitRoll.floorInstances = floorInstances;
  CC.TraitRoll.addCompanions = addCompanions;
})();
