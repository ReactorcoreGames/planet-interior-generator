/* The archetype registry — the namespace every family file registers into.
 *
 * An archetype is a recipe, not code. It declares a standard layer stack and a
 * colour profile; the structure stage turns it into a concrete body and the
 * renderer draws whatever comes out. Adding the twelfth body type should be an
 * edit to a data file and nothing else.
 *
 * ONE FILE PER FAMILY. This file holds the API and the shared documentation of
 * the data format; `solid.js`, `gaseous.js` and their successors hold the
 * bodies themselves and call `register()`. The split happened at Phase 5 when
 * the single file passed 600 lines — the ≤500-line rule in CLAUDE.md — and it
 * is also the shape that makes "a new family is a data edit" literally true:
 * one new file, one new script tag.
 *
 * Load order in index.html: this file first, then the families.
 *
 * LAYER PROPERTIES (see docs/ARCHITECTURE.md for the full table)
 *
 *   role       layer identity — drives details, colour and label
 *   frac       [min, max] outer radius as a fraction of body radius
 *   boundary   perfect | near-perfect | slight | irregular | heavy | extreme
 *              | soft-gradient
 *
 * PRESENCE — how a layer decides whether it exists at all. One mechanism,
 * three forms, evaluated by one code path in gen/structure.js:
 *
 *   (omitted)              always present
 *   presence: 1.0          a 100% roll at max slider; scales down with Optional layers
 *   presence: { param, above, fade }
 *                          present only while the named parameter is above the
 *                          threshold; `fade` gives it a soft entry rather than
 *                          popping in
 *
 * This matters more than it looks. Ocean depth and Interior heat are the first
 * two users of the parameter form, but Cohesion, Operational status and Hull
 * integrity all want the same thing later. Making presence a first-class
 * layer property means those are data edits rather than special cases in the
 * stack builder.
 *
 * THICKNESS — likewise three forms:
 *
 *   frac: [min, max]       rolled, scaled by Layer thickness variation
 *   frac: { param, ... }   driven by a parameter instead of rolled
 *   bias: "core-bias"      a named control pushes the roll within its range */

var CC = CC || {};

CC.Archetypes = (function () {
  "use strict";

  var ALL = {};
  var FIRST = null;

  /* Families call this at load time. The first registered archetype is the
   * fallback for an unknown id, so `get()` can never return undefined and no
   * caller needs a null check. */
  function register(archetype) {
    ALL[archetype.id] = archetype;
    if (!FIRST) FIRST = archetype;
    return archetype;
  }

  function get(id) { return ALL[id] || FIRST; }
  function ids() { return Object.keys(ALL); }

  return {
    register: register,
    get: get,
    ids: ids,
    /* Live accessors. `CC.Archetypes.PLANET` was a direct reference back when
     * everything lived in one file; it stays available as a getter so nothing
     * that used it has to change, but new code should use `get(id)`. */
    get PLANET() { return ALL.planet; },
    get ALL() { return ALL; }
  };
})();
