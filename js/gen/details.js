/* The detail stage: layer stack + recipes + density -> concrete elements.
 *
 * WHICH elements a body gets. HOW one is built lives in gen/elemgen.js, which
 * this file drives — the two were split when zones pushed this past the
 * 500-line rule.
 *
 * `build` keeps the order of the passes and nothing else: each is a stage
 * function sharing one state object. The traits and zones are in
 * gen/details-traits.js, the terrain fields in gen/details-terrain.js, and the
 * trait instances, draw order and removal in gen/details-instances.js; all
 * three attach here.
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

  /* ---- the settings ----------------------------------------------------- */

  function readSettings(st) {
    var params = st.params;

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
    st.density = density;
    st.tierCount = tierCount;
    st.flowMode = flowMode;
    st.flowScale = flowScale;
  }

  /* ---- a layer's own elements ------------------------------------------- */

  function layerElements(st, i) {
    var body = st.body, params = st.params, seed = st.seed;
    var traits = st.traits, formFn = st.formFn;
    var density = st.density, tierCount = st.tierCount, flowScale = st.flowScale;
    var layer = body.layers[i];
    var role = layer.role;

    var recipes = CC.Elements.elementsFor(role);
    if (!recipes.length) return;

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
    var eAbsorbed = CC.Details.absorbedScale(layer, traits, body).elements;

    var list = [];
    /* Each layer's claims start clean (gen/claims.js). */
    CC.Claims.reset(layer);

    for (var e = 0; e < recipes.length; e++) {
      var recipe = recipes[e];
      var scale = eScale ? eScale[recipe.kind] : null;
      /* A SCALE MAY BE DRIVEN BY A PARAMETER: `{ by, count: [at0, at1],
       * size: [at0, at1] }` reads the two ends of the named control. The
       * asteroid's shell fractures use it, so Cohesion — the brittleness
       * axis — multiplies and lengthens the cracks in the crust as it falls
       * (ASTEROID-OVERHAUL §8). Resolved here to plain numbers, so nothing
       * below knows the difference. */
      if (scale && scale.by) {
        var sv = params[scale.by];
        sv = clamp(sv === undefined ? 0.5 : sv, 0, 1);
        var lerpEnds = function (v) {
          return Array.isArray(v) ? v[0] + (v[1] - v[0]) * sv : v;
        };
        scale = { count: lerpEnds(scale.count), size: lerpEnds(scale.size) };
      }

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
      if (eAbsorbed[recipe.kind]) {
        count = Math.round(count * eAbsorbed[recipe.kind]);
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
                                  { phase: phase, params: params, seed: seed,
                                    /* The body's form, so a mosaic can lay its
                                     * cells where they will be seen (gen/form.js). */
                                    form: formFn });

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
        /* The body's magnetic geometry (js/gen/compact.js), for the marks
         * that are drawn along it. Stamped here, not on the recipe (D159).
         * Absent on every body that declares no `poles`. */
        if (body.poles) made[m].poles = body.poles;
      }

      if (recipe.seat !== undefined) {
        for (var sd = 0; sd < made.length; sd++) made[sd].seat = recipe.seat;
        st.seated = st.seated.concat(made);
        continue;
      }
      list = list.concat(made);
    }

    st.byRole[role] = list;
    st.total += list.length;
  }

  /* ---- what the whole body carries -------------------------------------- */

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
  function finish(st) {
    var body = st.body, params = st.params, seed = st.seed;
    var archetype = st.archetype, traits = st.traits, zones = st.zones;
    var formBites = st.formBites, formFn = st.formFn, placed = st.placed;
    var climateField = st.climateField;
    var byRole = st.byRole, terrain = st.terrain, film = st.film;
    var seaLevel = st.seaLevel;
    var filmZones = st.filmZones, filmZoneByRole = st.filmZoneByRole;
    var total = st.total, density = st.density, flowMode = st.flowMode;

    var climate = climateField.summarise();

    /* CAVES — tunnels and chambers cut through the interior, one structural
     * system driven by a slider and capped by Cohesion (gen/caves.js). Built
     * after the traits because a tunnel borer's bore is part of it. Null on
     * every archetype that declares no `caves`. */
    var caves = CC.Caves.build(archetype, body, params, seed, formFn,
                               placed.spanning);
    var conduits = CC.Conduits.build(body, params, seed);
    var pillars = CC.Shells.pillars(body, params, seed);
    var rupture = CC.Rupture.build(archetype, body, params, seed,
                                   { pillars: pillars, conduits: conduits });
    var bore = CC.Bore.build(archetype, body, params, seed, rupture);

    return {
      /* Scoops out of the form an absorbed trait asked for (`biteRoll`);
       * draw/scene.js hands them to the view's warp. Null on most bodies. */
      formBites: formBites,
      caves: caves,
      /* Supports spanning the voids under hollow layers (gen/shells.js).
       * Empty on every body without a `gapBelow`. */
      pillars: pillars,
      /* Feeds through a layer's outer face, in the gaps its claims leave
       * (gen/conduits.js). Empty on every body declaring no `conduits`. */
      conduits: conduits,
      /* Cans on a board, clear of those runs (gen/capacitors.js). Empty on
       * every body declaring no `capacitors`. */
      capacitors: CC.Capacitors.build(body, params, seed, conduits),
      /* The lit back walls seen through those voids and down the shafts
       * (gen/shellwalls.js). Null on every body without either. */
      walls: CC.ShellWalls.build(body, params, seed),
      /* Doors and shutters on the shafts, where a trait sets them
       * (gen/shaftdoors.js). Null otherwise. */
      doors: CC.ShaftDoors.build(archetype, body, params),
      /* A wedge torn out of the outer layers (gen/rupture.js). Null on every
       * body declaring no `rupture`. */
      rupture: rupture,
      /* Growth over the hull, down the shafts and pooled in the wounds,
       * where a trait sets it (gen/overgrowth.js). Null otherwise. */
      growth: CC.Overgrowth.build(archetype, body, params, seed, rupture),
      /* One great barrel through the shells, where a trait sets it
       * (gen/bore.js). Null otherwise. */
      bore: bore,
      /* Drive bells on one bearing, aft of any bore, where a trait sets
       * them (gen/engines.js). Null otherwise. */
      engines: CC.Engines.build(archetype, body, params, seed, rupture, bore),
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

  /* ---- the stage -------------------------------------------------------- */

  /* Build every detail element for a body.
   *
   * Returns { byRole, terrain, film, zones, traits, count } where byRole maps
   * a layer role to its element list. Terrain fields and the zone field are
   * built here too, so the whole geometry of a body is produced in one
   * cacheable stage. */
  function build(body, params, seed) {
    var st = {
      body: body,
      params: params || {},
      seed: seed,
      byRole: {},
      /* Layer details whose recipe declares `seat`: drawn on the body's real
       * surface in the unclipped pass, as a seated trait is (draw/scene.js). */
      seated: [],
      terrain: {},
      film: {},
      seaLevel: {},
      total: 0
    };

    readSettings(st);
    CC.Details.traitsAndZones(st);
    for (var i = 0; i < body.layers.length; i++) {
      CC.Details.layerTerrain(st, i);
      layerElements(st, i);
    }
    CC.Details.locateGround(st);
    CC.Details.placeTraits(st);
    CC.Details.orderWithinLayers(st);
    CC.Details.zoneMembership(st);
    CC.Details.removeElements(st);
    return finish(st);
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
