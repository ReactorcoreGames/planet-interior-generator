/* The detail stage's traits and zones: which traits a body rolled, what its
 * angular axis and climate field are, and the frosting's zone tables. All of it
 * must exist before any element is built.
 *
 * Split out of gen/details.js, which passed the 500-line rule. Attached to
 * CC.Details; gen/details.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  /* A TRAIT A LAYER ANSWERS WITH ITS OWN MARKS (ASTEROID-OVERHAUL §6).
   *
   * `absorbs: { <traitId>: { craters, elements: { <kind>: mul } } }` on a
   * layer says: when this trait lands here, do not draw the trait's marks —
   * turn up mine. The asteroid's shell already has a crater field and a field
   * of impact pits, and a "Heavily Cratered" trait laid over them as a second
   * set would be two crater mechanisms in one band. One mechanism, one place.
   *
   * Layer-side rather than trait-side, so `cratered` on a planet or a moon is
   * untouched. Returns the identity for a layer that declares nothing.
   * gen/traitroll.js `place` skips an absorbed trait so it draws nothing of
   * its own. */
  function absorbedScale(layer, traits, body) {
    var out = { craters: 1, elements: {} };
    var abs = layer && layer.absorbs;
    if (!abs) return out;
    for (var i = 0; i < traits.length; i++) {
      var a = abs[traits[i].id];
      if (!a || CC.TraitRoll.anchorLayer(traits[i], body) !== layer) continue;
      if (a.craters) out.craters *= a.craters;
      for (var k in (a.elements || {})) {
        out.elements[k] = (out.elements[k] || 1) * a.elements[k];
      }
    }
    return out;
  }

  /* A TRAIT A FORMED BODY ANSWERS WITH ITS OUTLINE (D313): `bite` in a
   * layer's `absorbs` entry, `{ count, width (degrees), depth }` as [lo, hi]
   * ranges, turns the trait into scoops out of the body's form — the
   * asteroid's impact basin as a real hole in the rock rather than a dark
   * sector of crust. Its own stream, so no other roll moves. */
  function biteRoll(body, traits, seed) {
    if (!body.form) return null;
    var out = [];
    for (var l = 0; l < body.layers.length; l++) {
      var abs = body.layers[l].absorbs;
      if (!abs) continue;
      for (var i = 0; i < traits.length; i++) {
        var b = abs[traits[i].id] && abs[traits[i].id].bite;
        if (!b || CC.TraitRoll.anchorLayer(traits[i], body) !== body.layers[l]) continue;
        var rng = CC.RNG.stream(seed, "bite/" + traits[i].id);
        var pick = function (r) { return r[0] + (r[1] - r[0]) * rng(); };
        var n = Math.round(pick(b.count)), a0 = rng() * Math.PI * 2;
        for (var k = 0; k < n; k++) {
          out.push({ angle: a0 + k * (Math.PI * 2 / n) + (rng() - 0.5) * 1.2,
                     width: pick(b.width) * Math.PI / 180, depth: pick(b.depth) });
        }
      }
    }
    return out.length ? out : null;
  }

  /* ---- traits and zones, before anything is placed ----------------------
   *
   * Both must exist before elements are built: a zone modulates terrain
   * amplitude, which changes the field every later stage samples, and trait
   * instances are placed against the same angles. */
  function traitsAndZones(st) {
    var body = st.body, params = st.params, seed = st.seed;
    var archetype = CC.Archetypes.get(body.archetype);
    var traits = CC.TraitRoll.select(archetype, params, seed);
    var formBites = biteRoll(body, traits, seed);
    var formFn = body.form ? CC.Form.fn(body.form, formBites) : null;
    /* A trait may switch the archetype's own structure data (`sets`,
     * gen/traitsets.js): every builder below reads the result. */
    archetype = CC.TraitSets.apply(archetype, traits);

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
    /* WHICH LAYERS CARRY TERRAIN, asked the SAME WAY the terrain stage asks it.
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

    st.archetype = archetype;
    st.traits = traits;
    st.formBites = formBites;
    st.formFn = formFn;
    st.zones = zones;
    st.climateField = climateField;
    st.filmZones = filmZones;
    st.filmZoneByRole = filmZoneByRole;
  }

  CC.Details.absorbedScale = absorbedScale;
  CC.Details.traitsAndZones = traitsAndZones;
})();
