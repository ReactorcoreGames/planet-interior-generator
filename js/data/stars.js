/* The star table — pure data, like data/archetypes.js and data/elements.js.
 *
 * A STAR IS A FEW NUMBERS, NOT A CATALOGUE OF TYPES.
 *
 * Each entry feeds fields that ALREADY EXIST rather than getting bespoke coded
 * effects. That is deliberate, and it is the D27 lesson applied ahead of time
 * rather than after: a list of star types each with its own branch — flare
 * cycles, magnetic interactions, per-type tidal heating — is exactly the menu
 * of special cases a parameter would do. If a neutron-star companion ever
 * needs to exist, it should be reachable as extreme values of these same
 * numbers and not as a new row with new code behind it.
 *
 * By TRAIT-SYSTEM.md's third test a star changes only VALUES in the stack,
 * never the stack itself, so it is an axis and never a trait.
 *
 * THIS FILE IS DATA AND MUST STAY DATA. The moment a row needs a function, the
 * design has gone wrong — widen a column instead.
 *
 * WHO READS WHAT:
 *
 *   hue     the light's own colour, in degrees. gen/palette.js casts it over
 *           the outer layers, falling off with depth, so a red-dwarf world is
 *           ruddy at the surface and unchanged at the core.
 *   cast    how strongly that colour reaches the body's materials. It must
 *           LEAN the palette, never replace it — the perturb-not-replace rule
 *           applied to light, so three stars give three visibly different
 *           worlds that are still recognisably the same world.
 *   output  energy delivered per unit of Starlight. gen/climate.js scales the
 *           star term by it, so a bright star far off can equal a dim one
 *           close in. Measured: a blue giant runs a world 0.17 hotter than a
 *           red dwarf at the same slider position.
 *   harsh   how much of that light is hard rather than warm. Feeds the
 *           saturation of what it lights, alongside Star activity.
 *
 * A NOTE FOR PHASE 6. When the star ARCHETYPES land, they should be consistent
 * with this table rather than authoring a second one. A `main-star` body and
 * the `Star colour` a planet orbits are the same physical object seen from two
 * sides; if a blue giant renders one way as a body and tints planets another
 * way, that is a contradiction the tool will eventually be caught in. Prefer
 * widening this table to duplicating it.
 *
 * Loaded before gen/climate.js and gen/palette.js, which both read it. */

var CC = CC || {};

CC.Stars = (function () {
  "use strict";

  var STARS = {
    "red-dwarf":  { label: "Red dwarf",    hue: 18,  cast: 0.34, output: 0.78, harsh: 0.15 },
    "orange":     { label: "Orange dwarf", hue: 34,  cast: 0.22, output: 0.90, harsh: 0.30 },
    "sunlike":    { label: "Sunlike",      hue: 52,  cast: 0.08, output: 1.00, harsh: 0.45 },
    "white":      { label: "White",        hue: 200, cast: 0.16, output: 1.12, harsh: 0.65 },
    "blue-giant": { label: "Blue giant",   hue: 224, cast: 0.32, output: 1.28, harsh: 0.90 }
  };

  var DEFAULT = "sunlike";

  /* The star a settings object names, with a sensible fallback so no caller
   * has to check. An unknown id is a typo rather than a state worth handling. */
  function of(params) {
    return STARS[(params && params.starColour) || DEFAULT] || STARS[DEFAULT];
  }

  function ids() { return Object.keys(STARS); }

  return { STARS: STARS, of: of, ids: ids, DEFAULT: DEFAULT };
})();
