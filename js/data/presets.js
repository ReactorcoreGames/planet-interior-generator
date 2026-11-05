/* Presets — the browsable menu of world types, without making them archetypes.
 *
 * A PRESET IS NOTHING BUT A STORED SET OF CONTROL VALUES (PARAMETERS.md). It
 * is not a body type, it has no runtime state, and once applied it is simply
 * where the sliders happen to be sitting. That is why "frozen desert with a
 * dying core" and "tidally locked ocean world" are both reachable: they are
 * parameter positions rather than types that would have had to be reconciled
 * by hand.
 *
 * The `set` object is keyed by CONTROL ID, in the units the DOM control uses
 * (0-100 for a percentage slider, degrees for a hue) rather than the normalized
 * units the pipeline consumes — because these are literally control values and
 * ui/presets.js writes them straight through CC.Controls.set.
 *
 * `traits` names traits to force ON, and `traitsOff` names traits to exclude
 * from the roll. Both go through the picker's existing tri-state rather than a
 * second mechanism.
 *
 * WHAT A PRESET DELIBERATELY DOES NOT SET: the seed. PARAMETERS.md is explicit
 * that applying one leaves the seed alone, so a user can try every preset on
 * the same body and compare — which is far more informative than each preset
 * arriving with a different world underneath it.
 *
 * `archetype` is stored on each preset so the gallery can filter.
 *
 * A PRESET IS PER ARCHETYPE, NOT PER FAMILY, because `archetype` is what the
 * gallery filters on — so `gas-giant` and `ice-giant` carry their own sets
 * even though they share a family and most of their machinery.
 *
 * THIS FILE IS THE REGISTRY. Every preset lives in a family file
 * (js/data/presets-*.js), registered in load order, which is the order the
 * gallery lists them. */

var CC = CC || {};

CC.Presets = (function () {
  "use strict";

  var LIST = [];

  var byId = {};

  /* A FAMILY'S PRESETS LIVE IN ITS OWN FILE. Appended in load order, so the
   * gallery lists the families in the order index.html loads them. */
  function register(list) {
    list.forEach(function (p) { LIST.push(p); byId[p.id] = p; });
  }

  function all() { return LIST.slice(); }
  function get(id) { return byId[id] || null; }
  function forArchetype(a) {
    return LIST.filter(function (p) { return p.archetype === a; });
  }

  /* WHAT A PRESET BARS FROM THE ROLL: its own `traitsOff`, and on a preset
   * that names no traits, every built trait too (D310). A preset describing
   * a natural body should not hand back a station; it rolls only natural
   * traits, and the bars show as the picker's ✕ marks, so a click undoes
   * one. Not on an archetype with no natural traits (the machine world),
   * whose roll would be left empty, and not on a preset that names its
   * traits, which does not roll. Plain Randomize is untouched: built traits
   * keep their third of the weight there (D291). */
  function offList(preset) {
    var off = (preset.traitsOff || []).slice();
    if (preset.traits && preset.traits.length) return off;
    var arch = CC.Archetypes.get(preset.archetype);
    var pool = arch ? CC.Traits.eligible(arch) : [];
    var built = pool.filter(function (t) {
      return (t.tags || []).indexOf("artificial") >= 0;
    });
    if (built.length === pool.length) return off;
    built.forEach(function (t) { if (off.indexOf(t.id) < 0) off.push(t.id); });
    return off;
  }

  return { all: all, get: get, forArchetype: forArchetype, register: register,
           offList: offList };
})();
