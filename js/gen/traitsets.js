/* Trait sets — a trait that switches the body's own structure data.
 *
 * Some traits are not marks placed round a layer but a change to a general
 * structure feature the archetype already declares: Under construction swaps
 * the style of a rupture's cut faces, shaft doors add doors to the access
 * shafts. Neither is expressible in the placement grammar, and neither should
 * be a case in the code that builds the feature. So the trait says it as
 * data:
 *
 *   sets: { rupture: { edge: "clean" } }
 *
 * and `apply` merges every chosen trait's `sets` over the archetype, one key
 * deep (an object value is merged into the archetype's own, anything else
 * replaces it), before the detail stage reads it. The builders then see an
 * archetype that simply says "clean", and nothing anywhere asks which trait
 * is on.
 *
 * DETAIL STAGE ONLY. The structure stage has already run on the plain
 * archetype, so a `sets` entry can change what is built along the layers,
 * never the layers themselves. A trait with `sets` and no `element` draws
 * nothing through the grammar (gen/traitroll.js skips it).
 *
 * The archetype is never mutated: a copy comes back when anything applies,
 * the archetype itself when nothing does. */

var CC = CC || {};

CC.TraitSets = (function () {
  "use strict";

  function isObj(v) { return v && typeof v === "object" && !Array.isArray(v); }

  function apply(archetype, traits) {
    var out = archetype;
    for (var i = 0; i < (traits || []).length; i++) {
      var sets = traits[i].sets;
      if (!sets) continue;
      if (out === archetype) {
        out = {};
        for (var k0 in archetype) out[k0] = archetype[k0];
      }
      for (var k in sets) {
        if (!Object.prototype.hasOwnProperty.call(sets, k)) continue;
        if (isObj(sets[k]) && isObj(out[k])) {
          var m = {};
          for (var a in out[k]) m[a] = out[k][a];
          for (var b in sets[k]) m[b] = sets[k][b];
          out[k] = m;
        } else {
          out[k] = sets[k];
        }
      }
    }
    return out;
  }

  return { apply: apply };
})();
