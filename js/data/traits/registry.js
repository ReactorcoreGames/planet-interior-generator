/* Trait definitions — the registry.
 *
 * A trait is an OPTIONAL addition that makes one body different from another.
 * If a layer would look wrong without it, it is a layer detail and belongs in
 * data/elements/ instead. See docs/TRAIT-SYSTEM.md for the distinction and for
 * the full field reference.
 *
 * ONE FILE PER FAMILY, as data/archetypes/, data/elements/, data/flavour/ and
 * gen/stats/ all are, and for the same reason: the single file passed the
 * 500-line rule when the gaseous traits landed, and a new family should be a
 * new file rather than an edit threaded through an existing one. `orbital.js`
 * holds the traits that belong to no family in particular — anything that
 * happens BEYOND the body is available to every body.
 *
 * ELIGIBILITY IS BY TAG, NEVER BY ARCHETYPE ID. A trait declares what a body
 * must be (`requires: ["gaseous"]`), and any archetype carrying that tag may
 * roll it. That is what let the gaseous family arrive without a single trait
 * naming it — see `eligible` below.
 *
 * THE PLACEMENT GRAMMAR — every trait is described by the same fields, and
 * that is the whole system. A trait that cannot be expressed here means the
 * grammar needs extending, which is a deliberate decision rather than a
 * special case:
 *
 *   anchor    layer role it attaches to. Traits are always layer-RELATIVE, so
 *             they work regardless of how thick that layer happened to roll
 *   reach     on | inward | outward | spanning
 *   depth     [inner, outer] across the anchor's own thickness, 0..1
 *   arc       [min, max] degrees of the body each instance covers
 *   repeat    [min, max] how many separate instances
 *   spacing   even | random | clustered
 *   jitter    0..1 randomness applied to spacing
 *   mirror    duplicate the set reflected across the vertical axis
 *   offset    [min, max] rotation applied to the whole set; [0,0] pins it
 *   element   which drawing primitive (draw/primitives.js)
 *   tiers     size classes — a few large, more medium, many small
 *   density   {min, max} instance count at Detail density 0 .. 1
 *   zoneBias  cluster instances into a named zone, if the body has zones
 *   requires  body tags the archetype must carry
 *   excludes  traits this cannot coexist with
 *   tags      grouping for the picker UI
 *
 * ORIENTATION: bodies are generated pole-up and rotated at the end, so 0 deg
 * is the north pole and 90 deg is the equator. Polar traits pin `offset` to
 * [0,0] and set `mirror` so they land on both poles.
 *
 * ZONE MODIFIERS are a second, smaller shape — `kind: "modifier"`. They draw
 * nothing themselves; they divide the body into angular sectors that perturb
 * whatever the layers already rolled. See gen/zones.js. Note that the ones
 * declared as archetype `axes` (tidal locking) are NOT traits and never were —
 * see PROGRESS.md D27.
 *
 * Load order in index.html: this file, then the families. */

var CC = CC || {};

CC.Traits = (function () {
  "use strict";

  var ALL = [];
  var BY_ID = {};

  /* Family files call this at load time. Registration order is the order the
   * picker lists them in, so families group naturally. */
  function register(traits) {
    for (var i = 0; i < traits.length; i++) {
      ALL.push(traits[i]);
      BY_ID[traits[i].id] = traits[i];
    }
  }

  /* Which traits an archetype may carry. A trait is eligible when the body
   * carries every tag it `requires`.
   *
   * THIS IS THE WHOLE OF FAMILY GATING, and it is why Phase 5 could add two
   * archetypes without any trait mentioning either. A gas giant declares
   * `gaseous` and `no-surface`; the crater traits require `solid-surface` and
   * are therefore simply not offered. Nothing anywhere asks "is this a gas
   * giant". */
  function eligible(archetype) {
    var tags = (archetype && archetype.tags) || [];
    var out = [];
    for (var i = 0; i < ALL.length; i++) {
      var t = ALL[i];
      var ok = true;
      for (var r = 0; r < (t.requires || []).length; r++) {
        if (tags.indexOf(t.requires[r]) < 0) { ok = false; break; }
      }
      if (ok) out.push(t);
    }
    return out;
  }

  function get(id) { return BY_ID[id] || null; }
  function ids() { return ALL.map(function (t) { return t.id; }); }
  function isModifier(t) { return !!(t && t.kind === "modifier"); }

  return {
    register: register,
    get: get,
    ids: ids,
    eligible: eligible,
    isModifier: isModifier,
    get ALL() { return ALL; }
  };
})();
