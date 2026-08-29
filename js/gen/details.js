/* The detail stage: layer stack + recipes + density -> concrete elements.
 *
 * WHICH elements a body gets. HOW one is built lives in gen/elemgen.js, which
 * this file drives — the two were split when zones pushed this past the
 * 500-line rule.
 *
 * Output is pure data in NORMALIZED BODY SPACE. No pixels, no colours, no
 * canvas — the renderer applies both at draw time. Two rules depend on that
 * separation, and both are enforced by tests:
 *
 *   RESOLUTION INDEPENDENCE. Counts are decided here, where view.R does not
 *   exist, so a body emits the same elements at 360p and at 2160p. Nothing in
 *   this file may consult a pixel size.
 *
 *   COLOUR NEVER RE-ROLLS GEOMETRY. Elements carry a `tone` naming how their
 *   colour derives from the layer, not a colour. Changing the palette redraws
 *   this same cached geometry (ARCHITECTURE: "cache generated element
 *   geometry; colour changes must never re-roll positions").
 *
 * ZONES RESOLVE HERE, NOT AT DRAW TIME. Every element already gets an angle in
 * this stage, so zone membership is resolved alongside it and carried on the
 * element as a COLOUR DELTA — never a zone id, never a colour. That is what
 * keeps draw/ as free of zone logic as it is of role names, and it means a
 * zoned body costs nothing extra to redraw.
 *
 * RNG IS KEYED TO IDENTITY, NEVER TO POSITION. Every element list draws from a
 * stream named for its layer's role and its own kind. Drawing sequentially
 * from one stream across a variable-length layer list produced two separate
 * visible bugs in Phase 2 (PROGRESS.md D12); element generation has exactly
 * the same shape, so it follows the same rule. */

var CC = CC || {};

CC.Details = (function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp;
  var TAU = M.TAU;

  /* ---- the stage -------------------------------------------------------- */

  /* Build every detail element for a body.
   *
   * Returns { byRole, terrain, film, zones, traits, count } where byRole maps
   * a layer role to its element list. Terrain fields and the zone field are
   * built here too, so the whole geometry of a body is produced in one
   * cacheable stage. */
  function build(body, params, seed) {
    params = params || {};

    /* How high a fluid layer may rise before it collides with what is outside
     * it. The inner edge of the next layer out, or the body's surface when
     * that fluid is the outermost thing there is.
     *
     * An outward layer counts: an atmosphere's inner edge is exactly where the
     * sea must stop, and it is the layer the night-side bulge was drowning. */
    function ceilingAbove(fluid) {
      var idx = body.layers.indexOf(fluid);
      if (idx <= 0) return body.surface;

      var above = body.layers[idx - 1];

      /* A SOLID LAYER IS A HARD LID; GAS IS NOT.
       *
       * The structure stage settles an atmosphere directly onto the sea, so
       * `atmos.inner === fluid.outer` exactly and the sea has literally no
       * room — which would flatten the night-side bulge to nothing. But a
       * rising sea does not stop at the bottom of the air, it DISPLACES it:
       * water pooling on the cold face pushes the atmosphere up rather than
       * hitting a ceiling.
       *
       * So an outward layer yields a fraction of its own thickness. Enough for
       * the bulge to read, far short of the drowning D29 was chasing — the
       * atmosphere keeps most of its depth over the night sea. A solid layer
       * above still stops the fluid dead, because rock does not compress. */
      if (above.outward) return above.inner + above.thickness * 0.30;
      return above.outer;
    }

    var density = params.detailDensity === undefined ? 0.65 : params.detailDensity;
    var tierCount = params.sizeTiers === undefined ? 3 : params.sizeTiers;
    var flowMode = params.flowIndicators === undefined ? "balanced" : params.flowIndicators;

    /* Flow indicators: how strongly the diagrammatic elements are drawn.
     * "none" removes them, "subtle" keeps the motion lines but drops arrows.
     * The dropdown governs presence and count; the renderer governs whether an
     * arrowhead is drawn. */
    var flowScale = flowMode === "none" ? 0
                  : flowMode === "subtle" ? 0.55
                  : flowMode === "diagrammatic" ? 1.35
                  : 1.0;

    /* ---- traits and zones, before anything is placed ----------------------
     *
     * Both must exist before elements are built: a zone modulates terrain
     * amplitude, which changes the field every later stage samples, and trait
     * instances are placed against the same angles. */
    var archetype = CC.Archetypes.get(body.archetype);
    var traits = CC.TraitRoll.select(archetype, params, seed);

    /* THE ANGULAR AXIS IS ARCHETYPE DATA, NOT A TRAIT.
     *
     * Tidal locking shipped as a trait and should never have been one — it
     * changes values in the stack, not the stack itself, which is exactly what
     * TRAIT-SYSTEM.md's third test disqualifies. It is now an always-present
     * axis declared in `archetype.axes`, and `CC.Zones.build` returns null
     * unless the user has actually turned it up. See PROGRESS.md D27. */
    var order = (archetype.colorProfile && archetype.colorProfile.order) || [];
    var axis = archetype.axes && archetype.axes.tidalLock;
    var zones = axis ? CC.Zones.build(axis, body, order, params, seed) : null;

    /* THE CLIMATE FIELD, AND IT IS ALWAYS PRESENT.
     *
     * Unlike `zones`, this never returns null. `Zones.build` returning null at
     * dial 0 was correct for cost but it meant an ordinary rotating planet had
     * no thermal structure at all — no polar caps, no frozen sea, and a
     * frosting zone that was mathematically unreachable on 100% of unzoned
     * worlds (D36, D38). The field is now universal and folds the zone in as
     * one contributor when the dial is up. See gen/climate.js. */
    var climateField = CC.Climate.build(archetype, body, params, seed, zones);

    /* THE FROSTING'S ZONE TABLE, RESOLVED HERE — the D22 contract, cashed.
     *
     * It used to be a `var ZONES` in draw/film.js together with an Earth-ish
     * SNOWLINE of 0.42 and SHELF of -0.16, and D22 recorded that it must move
     * into archetype data when a second family started depositing. Phase 5 is
     * that family: a giant's buried floor wants TWO zones and thresholds
     * nothing like a planet's.
     *
     * Resolved in generation rather than read in draw/, which is D23's rule —
     * the renderer receives a plain table of numbers and still learns nothing
     * about what a zone means. Order is the declaration order in the
     * archetype, outermost-down. */
    /* ONE TABLE PER FROSTED SURFACE, not one per body.
     *
     * Every archetype until the moon had a single frosted surface, so a single
     * table was the whole truth. An ice-shelled moon has two facing each other
     * across a dark ocean — a rock floor with brine pools in its trenches, and
     * the shell's underside hung with accreted ice — and they differ in
     * colour, character AND direction. `CC.Frosting.specFor` picks the right
     * spec per role and falls back to `layers.film`, so a body with one
     * frosting resolves every layer to it exactly as before.
     *
     * `filmZones` stays a single table for that common case, because
     * draw/film.js's fallback path and every existing caller expect one; the
     * per-role map beside it is what a two-surface body reads. */
    var filmProfile = archetype.colorProfile;
    /* WHICH LAYERS CARRY TERRAIN, asked the SAME WAY the loop below asks it.
     *
     * This first read `CC.Elements.reliefFor(role)` alone, which is where a
     * role's shared terrain lives — and missed every layer whose field is
     * declared on the layer as `reliefSpec` instead. The ice shell is exactly
     * that case, so its underside got no zone table, and the accreted ice
     * facing the brine pools across the ocean never drew at all.
     *
     * Nothing reported it: the palette resolved all six zone colours, the
     * terrain field was built, the mask was built, and the one missing link
     * was a key absent from a lookup. D159's shape — correct at both ends and
     * undefined in between — arriving in the frosting rather than in an
     * element recipe.
     *
     * The two questions must be one question, so both sites now read the same
     * chain: the layer's own spec first, then the role's. */
    var filmRoles = [];
    for (var fr = 0; fr < body.layers.length; fr++) {
      var flr = body.layers[fr];
      if (flr.reliefSpec || CC.Elements.reliefFor(flr.role)) {
        filmRoles.push(flr.role);
      }
    }
    var filmSpecs = CC.Frosting.specsByRole(filmProfile, filmRoles, body.has);

    var filmZoneByRole = {};
    for (var fk in filmSpecs) {
      if (!Object.prototype.hasOwnProperty.call(filmSpecs, fk)) continue;
      var ft = CC.Frosting.zoneTable(filmSpecs[fk]);
      if (ft) filmZoneByRole[fk] = ft;
    }

    var filmZones = CC.Frosting.zoneTable(
      archetype.colorProfile && archetype.colorProfile.layers &&
      archetype.colorProfile.layers.film);

    var byRole = {};
    var terrain = {};
    var film = {};
    var seaLevel = {};
    var total = 0;

    for (var i = 0; i < body.layers.length; i++) {
      var layer = body.layers[i];
      var role = layer.role;

      /* Surface terrain, where the role declares one. Built per layer and
       * keyed by role, so a layer's terrain never depends on what else is in
       * the stack. */
      /* AN ARCHETYPE MAY STATE ITS OWN TERRAIN, and the moon is the first that
       * has to. The elements table is keyed by ROLE globally, so `crust` is
       * one recipe shared by every body that has one — which is right for
       * strata and fractures, and wrong for the shape of the ground. A moon's
       * surface is craters on craters with no landmasses at all; a planet's is
       * continents with craters on top. Those are different fields, not one
       * field at a different amplitude, so `elementScale` could not say it.
       *
       * `reliefSpec` on the layer overrides the role's, exactly as
       * `elementScale` overrides its counts. A layer that declares none gets
       * the role's, which is every layer that existed before the moon. */
      var relief = (layer && layer.reliefSpec) || CC.Elements.reliefFor(role);
      if (relief) {
        /* Erosion rides atmosphere thickness: a thick-atmosphere world gets
         * rounded terrain, an airless one keeps sharp ridges. Reading it from
         * the built stack rather than from a parameter means it stays true
         * however the atmosphere came to be there.
         *
         * DELIBERATELY GLOBAL, NOT ANGULAR. `erode` is a smoothing pass over
         * the whole stored field, so making it vary by face would mean either
         * building the field twice or smoothing it in place per angle — real
         * machinery for a difference the picture already carries. The zone's
         * `relief` multiplier scales a baked face's amplitude to 0.55 and a
         * frozen one's to 1.25, which is what actually reads as "smoother
         * there, sharper here" at a glance. Revisit only if a body ever needs
         * one face genuinely ROUNDED and the other genuinely JAGGED at the
         * same amplitude, which no archetype asks for yet. */
        var atmos = null;
        for (var a = 0; a < body.layers.length; a++) {
          if (body.layers[a].outward) { atmos = body.layers[a]; break; }
        }
        var erosion = atmos
          ? clamp((atmos.outer - body.surface) / 0.13, 0, 1) * 0.8
          : 0;

        var spec = {
          bands: relief.bands,
          /* The AMPLITUDE COMES FROM THE LAYER, not from the recipe.
           *
           * The structure stage reserved room for these peaks when it placed
           * the surface, and then rescaled everything so the surface sits at
           * exactly 1.0 (D3). Re-reading the recipe's raw figure here would
           * use a height the stack was never normalized against, and peaks
           * would drift above or below the sea by whatever the rescale factor
           * happened to be. */
          amplitude: layer.relief || relief.amplitude,
          sharpen: relief.sharpen,
          craters: relief.craters,
          erosion: erosion,

          /* THE ZONE HOOK, AND IT IS A GENERAL ONE (PROGRESS.md D22).
           *
           * A per-angle amplitude multiplier. Terrain was already a pure
           * function of angle, which is exactly what D15 predicted would make
           * this a one-line change: a molten dayside gets flatter relief and a
           * frozen nightside sharper, and NOTHING in draw/ changes because
           * draw/layers.js already calls terrain.at().
           *
           * Deliberately not a planet special case — any archetype's zone
           * recipe drives it through the same field. */
          ampAt: zones ? zones.reliefAt : null
        };

        terrain[role] = CC.Terrain.build(spec, seed, role);

        /* THE FLUID'S SURFACE IS NOT FLAT ON A ZONED BODY.
         *
         * gen/zones.js returns a signed offset in units of the terrain's own
         * range; it is converted to body space HERE, where that range is
         * known, so `draw/` receives a plain function of angle and learns
         * nothing about zones (D23).
         *
         * Keyed by the RELIEF-BEARING role rather than by the fluid's, because
         * that is what both the deferred pass and draw/film.js look up — the
         * sea is a property of the surface it sits on. */
        /* THE FLUID THAT ACTUALLY RESTS ON THIS LAYER, if any.
         *
         * Found by the same adjacency test draw/scene.js's deferred pass and
         * draw/film.js both use — the layer immediately outside this one, when
         * it is not an outward falloff. Keeping the three in agreement matters:
         * a sea level clamped against the wrong layer is a clamp that never
         * fires, which is exactly what went wrong before (see below).
         *
         * NO FLUID, NO ANGULAR SEA LEVEL. On a dry world there is no surface
         * to displace, and building one anyway moved the frosting's snowline
         * as though a sea were boiling off a body that has none. The zone's
         * OTHER fields still apply — a waterless locked world still has a
         * scoured face and a frozen one; it simply has no waterline. */
        var fluidAbove = (i > 0 && !body.layers[i - 1].outward)
          ? body.layers[i - 1] : null;

        if (zones && fluidAbove) {
          seaLevel[role] = (function (t, fluid) {
            var r = t.range();
            var span = Math.max(1e-6, r.hi - r.lo);

            /* CAP THE POSITIVE SEA OFFSET, AGAINST THE FLUID'S OWN HEADROOM.
             *
             * The cold face's sea rise can push the ocean past whatever sits
             * outside it, drowning that layer entirely.
             *
             * THE CEILING BELONGS TO THE FLUID, NOT TO THE LAYER UNDER IT.
             * The first version measured `body.surface - crust.outer`, which
             * is the crust's headroom — but the thing being displaced is the
             * SEA, whose top starts at `fluid.outer`. Since an atmosphere's
             * inner edge sits exactly at `fluid.outer`, the sea's true
             * headroom is zero while that formula allowed ~0.12, so the clamp
             * could never fire and the night-side bulge went straight through
             * the atmosphere at every ocean depth. Measuring the gap the fluid
             * actually has is what makes the cap real.
             *
             * NO SLACK IS ADDED ON TOP. An earlier attempt allowed a fraction
             * of the terrain's peak height as extra headroom, on the reasoning
             * that a pooled night sea should stand above the mean surface — but
             * `ceiling` is already the hard limit, so any bonus put the sea
             * straight back through it. The sea's room to bulge comes from the
             * gap that genuinely exists, and where the layer above sits flush
             * there is none: a sea with nowhere to rise stays flat, which is
             * the honest answer.
             *
             * `margin` keeps a hairline so the two boundaries never land on
             * exactly the same radius and z-fight along the limb. */
            var ceiling = ceilingAbove(fluid);
            var margin = Math.max(1e-4, (r.hi - r.lo) * 0.02);
            var maxRise = Math.max(0, ceiling - fluid.outer - margin);

            return function (a) {
              var raw = zones.seaAt(a) * span;
              return raw > maxRise ? maxRise : raw;
            };
          })(terrain[role], fluidAbove);
        }

        /* THE SURFACE FILM MASK.
         *
         * A second, independent field on the same layer — the patchiness of
         * whatever covers the ground: vegetation, regolith, mineral staining.
         * Sampled with norm() rather than at(), because this drives COLOUR,
         * not displacement; it never moves a boundary.
         *
         * Its own key, so the film's blotches are unrelated to the landforms
         * beneath them. A film that peaked exactly where the mountains are
         * would read as snow-capping rather than as ground cover, and would
         * make the two fields look like one.
         *
         * Higher frequencies than terrain and no craters or sharpening: cover
         * varies on a smaller scale than topography does, and wants soft
         * edges rather than cliffs. */
        film[role] = CC.Terrain.build({
          bands: [
            { cycles: 5,  amp: 1.00 },
            { cycles: 17, amp: 0.55 },
            { cycles: 41, amp: 0.28 }
          ],
          amplitude: 1,
          erosion: 0.15
        }, seed, role + "/film");
      }

      var recipes = CC.Elements.elementsFor(role);
      if (!recipes.length) continue;

      /* AN ARCHETYPE MAY TURN ONE OF A SHARED ROLE'S MARKS UP OR DOWN.
       *
       * Element recipes are keyed by ROLE, not by archetype, and that is
       * deliberate: it is what makes a `corona` mean the same thing on all
       * four stars and is why adding a body family adds no drawing code.
       *
       * It has one gap, and this closes it. Several bodies genuinely differ
       * in HOW MUCH of a shared role's own vocabulary they have — the polish
       * work's named example is that a young star's limb should be visibly
       * more violent than a patient dwarf's, and both wear the same corona.
       * Without this the only ways to say that are a per-archetype role
       * (which duplicates the whole recipe to change one number) or a role
       * check in the generator (which is the thing the architecture forbids).
       *
       * `elementScale: { <kind>: { count, size } }` on the layer spec, so it
       * is DATA and it is per layer rather than per family. Absent on every
       * existing archetype, so no current render moves. */
      var eScale = (layer && layer.elementScale) || null;

      var list = [];

      for (var e = 0; e < recipes.length; e++) {
        var recipe = recipes[e];
        var scale = eScale ? eScale[recipe.kind] : null;

        /* ONE STREAM PER (ROLE, ELEMENT KIND, INDEX).
         *
         * Keyed to identity, never to position in a list. Adding an ocean must
         * not shift the mantle's speckle, and re-rolling one element type must
         * not disturb another. This is the rule that took two bugs to learn in
         * Phase 2 — see the file header. */
        var rng = CC.RNG.stream(seed, "detail/" + role + "/" + recipe.kind + "/" + e);

        var count = CC.ElemGen.countFor(recipe, density);
        /* The archetype's own multiplier on this kind, resolved before the
         * texture and flow multipliers so those still mean what they mean. */
        if (scale && scale.count !== undefined) {
          count = Math.round(count * scale.count);
        }

        /* The two global multipliers from the Detail panel. Applied to COUNT
         * here and to alpha at draw time, so texture strength genuinely adds
         * material rather than only darkening what is there. */
        if (recipe.texture && params.textureStrength !== undefined) {
          count = Math.round(count * clamp(params.textureStrength, 0, 1.5));
        }
        if (recipe.flow) {
          count = Math.round(count * flowScale);
        }
        if (count <= 0) continue;

        /* The Size tiers slider CAPS the recipe's own tier count.
         *
         * A recipe declares how many size classes its element wants; the user
         * asks for at most this many. Taking the recipe's figure alone made
         * the slider inert — it moved, nothing changed — which is exactly the
         * kind of silently-unwired control the Session A domtest was written
         * to catch. Elements that ask for one tier stay at one. */
        var plan = CC.ElemGen.tierSplit(count, Math.min(recipe.tiers || 1, tierCount));

        /* Each element type clumps on its own phase, so grain, blobs and veins
         * do not all thin out in the same places — that would read as a single
         * shadow rather than as varied material. */
        var phase = rng() * TAU;

        /* `params` RIDES ALONG because one element kind is parameter-driven.
         *
         * Every other element reads only its recipe and its layer, and that is
         * the right default — an element that consulted the settings could
         * contradict the layer it sits in. The mosaic is the exception on
         * purpose: Cohesion is not a decoration on the fragments, it is what
         * decides how many there are and how much of the body is hole, so the
         * element cannot be built without it (docs/celestials/solid-bodies.md
         * folds `rubble-pile` and `void-riddled` into that one axis).
         *
         * Passed through `opts` rather than added to `build`'s signature, so
         * gen/traitroll.js — which calls the same dispatch — needs no change
         * and no builder that ignores it can be broken by it. */
        var made = CC.ElemGen.build(recipe, layer, plan, count, rng,
                                    { phase: phase, params: params });

        /* SIZE IS SCALED AFTER THE BUILD, NOT BY REWRITING THE RECIPE.
         *
         * The recipe is shared data — mutating it would change the mark on
         * every other archetype that uses the same role, and the failure
         * would depend on load order, which is the worst kind of bug to
         * find. `length` moves with `size` because the two are the same
         * statement for the elements that carry both (a plume's height is
         * its size with per-instance chaos already folded in). */
        if (scale && scale.size !== undefined && scale.size !== 1) {
          for (var sm = 0; sm < made.length; sm++) {
            made[sm].size *= scale.size;
            if (made[sm].length !== undefined) made[sm].length *= scale.size;
          }
        }

        /* Elements carry which recipe made them, so the renderer can honour
         * the Flow indicators dropdown without re-deriving intent. */
        for (var m = 0; m < made.length; m++) {
          made[m].role = role;
          made[m].flow = !!recipe.flow;
        }

        list = list.concat(made);
      }

      byRole[role] = list;
      total += list.length;
    }

    /* ---- trait instances --------------------------------------------------
     *
     * Placed after the layer details so a trait's RNG stream cannot disturb
     * them, and merged into the same per-role lists so the renderer draws them
     * through one path. A trait instance is an ordinary element carrying a
     * `trait` id — draw/ never reads that field, but the tests and the future
     * overlay do. */
    /* WHERE THE ROCK ACTUALLY IS, per role and per bearing.
     *
     * A trait anchored to the crust is placed against the crust's NOMINAL
     * band, but terrain displaces the real rock surface either side of that,
     * and wherever it dips below the fluid above it that bearing is seafloor
     * with water over it. Surface traits need to know both facts: craters were
     * being scattered around the whole circumference and a good share of them
     * landed in open ocean, floating in the water.
     *
     * Supplied as plain functions of angle, so gen/traitroll.js learns nothing
     * about terrain fields or fluids — the same arrangement draw/ has (D23). */
    var ground = {};
    for (var gi = 0; gi < body.layers.length; gi++) {
      var gLayer = body.layers[gi];
      var gTerrain = terrain[gLayer.role];
      if (!gTerrain) continue;

      var gFluid = (gi > 0 && !body.layers[gi - 1].outward)
        ? body.layers[gi - 1] : null;
      var gSea = seaLevel[gLayer.role] || null;

      ground[gLayer.role] = (function (layer, field, fluid, seaFn) {
        /* The rock's own surface radius at this bearing. */
        function top(a) { return layer.outer + field.at(a); }

        function dry(a) {
          if (!fluid) return true;
          return top(a) > fluid.outer + (seaFn ? seaFn(a) : 0);
        }

        /* EVERY DRY BEARING, SAMPLED ONCE.
         *
         * Rejection sampling finds land easily on a world that has some, and
         * fails badly on one that has almost none: at 1% land, fourteen random
         * tries miss more often than not, and 81% of that world's craters
         * still landed in open water. Walking the circumference once and
         * keeping the dry bearings turns "guess until it works" into a direct
         * draw, which is exact at any land fraction and costs one pass.
         *
         * Empty on a waterworld with no land at all, and callers fall back to
         * their own angle — a body with no shore genuinely has nowhere to put
         * an impact scar, and inventing one would be a lie about the picture.
         */
        var LAND_SAMPLES = 720;
        var landAngles = null;

        return {
          top: top,
          dry: dry,
          /* A dry bearing chosen by `u` (0..1), or null if the body has no
           * land at all.
           *
           * Drawn at RANDOM from the dry bearings rather than snapped to the
           * nearest one. Snapping would pile every displaced crater onto the
           * few bearings closest to water and draw a rash along the
           * coastlines; drawing at random spreads them across the land the
           * way the grammar's own scatter would have, had it been allowed to
           * see where the land was. */
          landAt: function (u) {
            if (!fluid) return null;
            if (!landAngles) {
              landAngles = [];
              for (var k = 0; k < LAND_SAMPLES; k++) {
                var ang = (k / LAND_SAMPLES) * Math.PI * 2;
                if (dry(ang)) landAngles.push(ang);
              }
            }
            if (!landAngles.length) return null;
            var idx = Math.floor(u * landAngles.length);
            if (idx < 0) idx = 0;
            if (idx >= landAngles.length) idx = landAngles.length - 1;
            /* Jittered within its own sample cell so the result is a
             * continuous bearing rather than one of 720 fixed spokes. */
            return landAngles[idx] +
              (u * landAngles.length - idx - 0.5) * (Math.PI * 2 / LAND_SAMPLES);
          }
        };
      })(gLayer, gTerrain, gFluid, gSea);
    }

    var placed = CC.TraitRoll.place(traits, body, params, seed, zones, ground);
    for (var r in placed.byRole) {
      if (!Object.prototype.hasOwnProperty.call(placed.byRole, r)) continue;
      byRole[r] = (byRole[r] || []).concat(placed.byRole[r]);
      total += placed.byRole[r].length;
    }

    /* ---- draw order within a layer ---------------------------------------
     *
     * A trait may declare `under: true`, which sinks it beneath everything
     * else in its layer — including the layer's own details and any other
     * trait.
     *
     * `violent-banding` is the first user and shows why it is needed: it is a
     * set of broad concentric belts across the whole troposphere, and drawn in
     * trait order it painted straight over the storms sitting in that same
     * layer. Banding is the BACKGROUND a storm sits on, not something laid on
     * top of it.
     *
     * A stable partition rather than a sort, so nothing else about the
     * existing order moves — the elements a layer generated for itself keep
     * their relative order, and so do the traits. */
    for (var ur in byRole) {
      if (!Object.prototype.hasOwnProperty.call(byRole, ur)) continue;
      var list = byRole[ur];
      var below = [], above = [];
      for (var ui = 0; ui < list.length; ui++) {
        (list[ui].under ? below : above).push(list[ui]);
      }
      if (below.length) byRole[ur] = below.concat(above);
    }
    total += placed.outward.length + placed.surface.length +
             placed.damage.length + placed.spanning.length;

    /* ---- resolve zone membership -----------------------------------------
     *
     * ONE PASS, AT THE END, OVER EVERY ELEMENT. Each already has an angle and
     * a role, which is all a zone needs, so this is where membership belongs —
     * the alternative is every drawing primitive querying it separately, which
     * is how a single function turns into per-primitive work.
     *
     * What is carried is a COLOUR DELTA, not a zone id and not a colour. The
     * renderer adds it to whatever the layer rolled, so the same zone recipe
     * perturbs a blue world and a red one correctly (TRAIT-SYSTEM.md: "zones
     * perturb, they don't replace"). */
    if (zones) {
      applyZones(byRole, placed.outward, placed.surface, placed.damage,
                 zones, archetype, body);
    }

    /* ---- ELEMENTS REMOVED, RATHER THAN RECOLOURED ------------------------
     *
     * Every other thing done to an element here is a PERTURBATION — a hue
     * delta, a displacement — because that is the standing rule (gen/zones.js
     * rule 1: zones perturb, they do not replace). This pass deletes, and it
     * earns the exception the same way a scoured dayside does: some places are
     * places where LESS IS HAPPENING, and the only honest way to draw less
     * happening is for there to be less.
     *
     * A CORONAL HOLE IS WHAT IT WAS BUILT FOR. A hole is a sector where the
     * magnetic field is open and the wind escapes freely, so the corona
     * genuinely has fewer plumes there — the feature IS the absence.
     *
     * IT CANNOT BE DARK PAINT, and that is not an aesthetic preference. The
     * corona is composited with `screen` (ATMOSPHERE_BLEND in draw/scene.js),
     * and under `screen` dark paint is very nearly a no-op — it can only ever
     * add light. That is why the first implementation had to be a flat,
     * hard-edged, unfaded `darker` wedge, which the user correctly called out
     * as a pie slice: a SOFT dark region on a screen-blended layer is simply
     * invisible, which is D121s `dust-formation` failure (maxdelta 19) waiting
     * to happen a second time. Removing elements works with the blend instead
     * of against it and needs no paint at all.
     *
     * IT RUNS OUTSIDE `applyZones`, and that matters: `applyZones` is called
     * only when the body has an angular axis, so a star with coronal holes and
     * no companion would have skipped thinning entirely and the trait would
     * have done nothing on most bodies — the silent D77 failure again.
     *
     * Two sources, composed: the zone field's `thinAt`, and the sectors any
     * trait declaring `thins` produced. */
    var thinSectors = [];
    for (var ts = 0; ts < (placed.thinning || []).length; ts++) {
      var sec0 = placed.thinning[ts];
      var trait0 = CC.Traits.get(sec0.trait);
      /* The trait names an ANCHOR and only this stage knows which layer that
       * turned out to be — `anchor` may be a list (D77), so a dwarf's optional
       * corona and an old giant's absence of one are both answered by asking
       * rather than by assuming. */
      var lay0 = trait0 ? CC.TraitRoll.anchorLayer(trait0, body) : null;
      if (!lay0) continue;
      sec0.role = lay0.role;
      thinSectors.push(sec0);
    }

    if ((zones && zones.thinAt) || thinSectors.length) {
      /* HOW MANY OF THIS ROLE'S ELEMENTS SURVIVE AT A BEARING.
       *
       * A trait sector is `{angle, half, keep, feather}`. Within `half` of the
       * centre the survival rate is `keep`; from there it eases back to 1 over
       * `feather` more, so the hole has a soft rim rather than a cut line. The
       * hard edge is precisely what made the wedge version read as a slice of
       * pie, so the feather is the point rather than a refinement.
       *
       * Sectors apply only to the role the trait anchored to, so a coronal
       * hole thins the corona and leaves the photosphere's granulation alone. */
      var keepAt = function (angle, role) {
        var keep = (zones && zones.thinAt) ? zones.thinAt(angle) : 1;
        for (var t = 0; t < thinSectors.length; t++) {
          var sec = thinSectors[t];
          if (sec.role && sec.role !== role) continue;
          /* Shortest angular distance, so a sector spanning 0 works. */
          var d = Math.abs(((angle - sec.angle + Math.PI * 3) % (Math.PI * 2))
                           - Math.PI);
          var edge = sec.half * (1 + sec.feather);
          if (d >= edge) continue;
          var u = d <= sec.half ? 0 : (d - sec.half) / (edge - sec.half);
          var k = sec.keep + (1 - sec.keep) * (u * u * (3 - 2 * u));
          if (k < keep) keep = k;
        }
        return keep;
      };

      /* DETERMINISTIC, from the element's own angle and index rather than from
       * a stream: the survival test has to give the same answer on every
       * render of a seed, and two renders must not disagree about which plumes
       * exist. Two summed sines rather than a hash, for the reason D117
       * records — a broken pseudo-random still draws, it just draws something
       * suspiciously tidy. */
      var thinOut = function (list, role) {
        var kept = [];
        for (var i = 0; i < list.length; i++) {
          var el = list[i];
          if (el.angle === undefined) { kept.push(el); continue; }
          var keep = keepAt(el.angle, role);
          if (keep >= 0.999) { kept.push(el); continue; }
          var h = Math.sin(el.angle * 37.13 + i * 0.717)
                + Math.sin(el.angle * 11.71 + i * 2.113);
          /* h runs -2..2; mapped to 0..1 and compared against the rate. */
          if ((h + 2) * 0.25 < keep) kept.push(el);
        }
        return kept;
      };

      for (var trole in byRole) {
        if (!Object.prototype.hasOwnProperty.call(byRole, trole)) continue;
        byRole[trole] = thinOut(byRole[trole], trole);
      }
    }

    /* ---- the climate summary ---------------------------------------------
     *
     * WHAT THE PICTURE SAYS ABOUT TEMPERATURE, in a form text can read.
     *
     * HAZARDS.md commits to lines the generator could not previously answer:
     * "Dayside 430 °C · Nightside −170 °C", "a zoned body has no single surface
     * temperature", "thermal shock at the terminator". Each needs a per-face
     * figure, and the standing rule is that stats are READ OFF the same values
     * that drew the image rather than rolled beside it — so this is derived
     * from `tempAt`, the same field the frosting colours itself from. A card
     * and the render cannot disagree, because there is one source.
     *
     * Normalized 0..1, not degrees. Turning that into a temperature is the
     * archetype's business (a star's 0.9 is not a planet's), and the info panel
     * does not exist yet; what matters now is that the FACT is available and
     * honest. */
    /* READ OFF THE FIELD, NOT ROLLED BESIDE IT, and now present on EVERY body
     * rather than only on a zoned one. `details.climate` used to be null on an
     * ordinary planet, which is the same absence that made caps impossible —
     * an info card had nothing to say about a world that is not tidally
     * locked, which is most of them. */
    var climate = climateField.summarise();

    return {
      byRole: byRole,
      terrain: terrain,
      /* Per-role surface-film masks, keyed the same way as `terrain`. */
      film: film,
      /* Per-face temperature summary for the info panel. Present on EVERY
       * body, derived from the same field the frosting reads, so text and
       * picture cannot contradict each other. */
      climate: climate,
      /* The field itself — `tempAt`, `snowShiftAt`, `surfaceStateAt`. Handed
       * to draw/film.js, which walks its own circumference and must ask at
       * draw time; it still receives plain functions of angle and learns
       * nothing about what a climate is (D23). */
      climateField: climateField,
      /* The deposition character and thresholds for this archetype's
       * frosting, or null if it has none. See CC.Frosting.zoneTable. */
      filmZones: filmZones,
      /* The same thing per frosted surface. draw/film.js prefers this and
       * falls back to `filmZones`, so a one-frosting body is unaffected and a
       * two-surface one gets a different table on each face. */
      filmZoneByRole: filmZoneByRole,

      /* HOW MUCH SURFACE COVER SURVIVES AT A BEARING — the climate's scouring
       * and the zone's, composed into ONE function so the renderer asks once.
       *
       * Two independent causes multiply rather than one winning: a locked
       * world's baked dayside is scoured by its own heat, and a violent star
       * scours everything that is not shielded. A world with both should be
       * barer than a world with either, which is what a product gives and what
       * a max() would throw away. */
      coverAt: (function (cf, z) {
        return function (a) {
          var c = cf.coverAt(a);
          if (z && z.coverAt) c *= z.coverAt(a);
          return c;
        };
      })(climateField, zones),
      /* Per-role angular sea-level offsets, in body space. Empty on an
       * unzoned body, so every consumer's fallback is the flat sea it has
       * always drawn. */
      seaLevel: seaLevel,
      /* The zone field, or null. draw/film.js is the one consumer that must
       * ask at draw time, because it walks the circumference itself. */
      zones: zones,
      traits: traits,
      /* Elements beyond the body — rings, debris. Drawn in their own step of
       * the scene order rather than inside a layer's clip. */
      outward: placed.outward,
      /* Traits that cross layer boundaries — the great storm. Drawn in their
       * own pass, clipped to the body rather than to any one band, so a
       * feature spanning two layers is one feature. */
      spanningTraits: placed.spanning,
      /* Surface-attached traits — polar caps, impact basins. Drawn after the
       * fluid layers, which would otherwise paint over them. */
      surfaceTraits: placed.surface,
      /* Surface damage — impact scars. Drawn after the frosting, because they
       * cut through the deposit rather than lying under it. */
      damageTraits: placed.damage,
      count: total,
      density: density,
      flowMode: flowMode,
      /* Elements for a role, with an empty fallback so the renderer never has
       * to check whether a layer had any. */
      get: function (role) { return byRole[role] || []; }
    };
  }

  /* Attach each element's zone colour delta.
   *
   * Elements whose delta is negligible get nothing at all, so an unzoned or
   * barely-zoned body carries no extra per-element state and the renderer's
   * hot path is untouched. */
  function applyZones(byRole, outward, surface, damage, zones, archetype, body) {
    /* HOW MUCH ROOM A LAYER HAS, taken from the ARCHETYPE'S AUTHORED RANGE
     * rather than from the palette.
     *
     * The delta has to know roughly how dark the layer is, or a nightside on a
     * dark crust goes black (see gen/zones.js). But this stage must stay
     * palette-independent: ARCHITECTURE's caching table says a colour change
     * redraws cached geometry without regenerating it, so reading the actual
     * rolled colour here would make every hue nudge re-roll every position.
     *
     * The midpoint of the authored range is enough. It is what the layer's
     * value is *about*, it is fixed for an archetype, and being approximate
     * costs nothing: this decides how much headroom to aim for, not the final
     * colour, which is still computed from the real palette at draw time. */
    var mids = {};
    var profile = (archetype && archetype.colorProfile) || {};
    var specs = profile.layers || {};
    for (var r0 in specs) {
      if (!Object.prototype.hasOwnProperty.call(specs, r0)) continue;
      var sp = specs[r0];
      if (sp.val) mids[r0] = (sp.val[0] + sp.val[1]) / 2;
    }

    function tag(list, role) {
      var baseV = mids[role];
      for (var i = 0; i < list.length; i++) {
        var el = list[i];
        var d = zones.shiftAt(el.angle, role, baseV);
        if (Math.abs(d.h) < 0.5 && Math.abs(d.s) < 0.004 && Math.abs(d.v) < 0.004) {
          continue;
        }
        el.zone = d;
      }
    }

    /* ELEMENTS RIDE THE TIDAL SWELL, AND THEY HAVE TO BE TOLD TO.
     *
     * `swellAt` displaces a banded layer's BOUNDARY per bearing, but
     * gen/elemgen.js `radiusAt` places every element against
     * `layer.inner + t * layer.thickness` — the layer's nominal, unswollen
     * band. The renderer clips to the swollen shape, so the crescent a layer
     * GAINS on the facing side contained no elements at all and drew as flat
     * bare fill with a hard edge, while the trailing side crowded its marks
     * into a band narrower than the one they were spread across.
     *
     * That is D75/D119 arriving on schedule — the surface moved and everything
     * measured against it went stale — and it is the reason this doc runs
     * before the traits one. Fixing it here rather than in `radiusAt` keeps it
     * to one place: every builder rolls its own angle, so threading the field
     * through six call sites would be six chances to miss one, and this loop
     * already visits every element with the role it belongs to.
     *
     * Scaled by the element's own DEPTH IN THE BAND. A mark sitting at the
     * layer's outer edge should follow the boundary exactly; one at its inner
     * edge should barely move, because that edge is the layer below's
     * boundary and belongs to the layer below's swell. Displacing the whole
     * band rigidly would shear it off the layer beneath it. */
    function rideSwell(list, role) {
      var layer = null;
      for (var li = 0; li < body.layers.length; li++) {
        if (body.layers[li].role === role) { layer = body.layers[li]; break; }
      }
      if (!layer || layer.outward) return;
      var t = layer.thickness || 0;
      if (t <= 0) return;
      for (var i = 0; i < list.length; i++) {
        var el = list[i];
        if (el.radius === undefined) continue;
        /* Where in its own band this element sits, 0 at the floor and 1 at
         * the boundary — the same normalization `radiusAt` placed it with. */
        var depth = (el.radius - layer.inner) / t;
        if (depth < 0) depth = 0; else if (depth > 1) depth = 1;
        var d = zones.swellAt(el.angle, role) * t * depth;
        el.radius += d;
        /* A spanning element carries its own inner edge, which has to move
         * with it or the mark stretches instead of translating. */
        if (el.inner !== undefined) el.inner += d;
      }
    }

    for (var role in byRole) {
      if (!Object.prototype.hasOwnProperty.call(byRole, role)) continue;
      tag(byRole[role], role);
      if (zones.swellAt) rideSwell(byRole[role], role);
    }
    /* Outward traits sit beyond every layer, so they take the shallowest
     * strength the field offers rather than a role's depth. */
    tag(outward, "atmosphere");

    /* Surface and damage traits take the strength of the layer they are
     * attached to, so they feel the same zone the crust does — a scar on a
     * locked world's night face should darken with the ground around it. */
    function tagByOwnRole(list) {
      for (var si = 0; si < list.length; si++) {
        var el = list[si];
        var d = zones.shiftAt(el.angle, el.role, mids[el.role]);
        if (Math.abs(d.h) >= 0.5 || Math.abs(d.s) >= 0.004 ||
            Math.abs(d.v) >= 0.004) {
          el.zone = d;
        }
      }
    }
    tagByOwnRole(surface);
    tagByOwnRole(damage);
  }

  return {
    build: build,
    /* Re-exported so existing callers and tests keep one import site. */
    tierSplit: CC.ElemGen.tierSplit,
    countFor: CC.ElemGen.countFor,
    TIER_SHARE: CC.ElemGen.TIER_SHARE,
    TIER_SIZE: CC.ElemGen.TIER_SIZE,
    TIER_ALPHA: CC.ElemGen.TIER_ALPHA
  };
})();
