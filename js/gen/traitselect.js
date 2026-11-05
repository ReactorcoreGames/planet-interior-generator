/* Which traits a body has: compatibility filtering and the count budget.
 *
 * Split out of gen/traitroll.js, which passed the 500-line rule. Attached to
 * CC.TraitRoll; gen/traitroll.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;
  var BUILT_WEIGHT = 1 / 3;

  /* ---- selection -------------------------------------------------------- */

  /* Pick a compatible set of traits.
   *
   * RE-FILTER AFTER EVERY PICK. Selecting one trait can exclude others, so the
   * candidate set has to be recomputed each time rather than filtered once up
   * front — TRAIT-SYSTEM.md is explicit about this and it is the kind of thing
   * that silently half-works if done the other way.
   *
   * Structural traits (zone modifiers) COUNT DOUBLE against the budget,
   * because they change so much more of the picture than an ordinary trait.
   *
   * `params.traits` — an explicit list from the picker UI. When present it is
   * honoured as given, filtered for compatibility, and nothing is rolled: the
   * user asked for these. When absent, traits are rolled to the budget. */
  function select(archetype, params, seed) {
    /* With the settings, so a trait gated by `when` (registry.js) is neither
     * rolled nor honoured from the picker on a form it means nothing on. */
    var pool = CC.Traits.eligible(archetype, params);
    var chosen = [];

    /* Traits the user has excluded in the picker. These are barred from the
     * ROLL only — an explicit selection still honours them, because ticking a
     * trait is a newer and more specific instruction than banning it was. */
    var banned = params.traitExcluded || [];

    function compatible(t, list) {
      /* A trait already chosen, or one that excludes something chosen, or one
       * something chosen excludes. Exclusion is symmetric — declaring it on
       * either side is enough, which means a trait pair only needs recording
       * once. */
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === t.id) return false;
        if ((t.excludes || []).indexOf(list[i].id) >= 0) return false;
        if ((list[i].excludes || []).indexOf(t.id) >= 0) return false;
      }
      return true;
    }

    /* An explicit selection from the UI. */
    if (params.traits) {
      for (var i = 0; i < params.traits.length; i++) {
        var t = CC.Traits.get(params.traits[i]);
        if (!t) continue;
        /* Still checked against the pool, so a selection that survives an
         * archetype change cannot smuggle in an incompatible trait. */
        if (pool.indexOf(t) < 0) continue;
        if (!compatible(t, chosen)) continue;
        chosen.push(t);
      }
      return chosen;
    }

    /* Rolled.
     *
     * `traitSalt` lets "Re-roll traits" produce a different set from the same
     * seed, without disturbing the structure, the palette or any layer detail
     * — each of those runs off its own stream and none of them sees the salt.
     * That is the per-stage RNG separation being used for what it was for. */
    var rng = CC.RNG.stream(seed, "traits/select/" + (params.traitSalt || 0));
    var budget = params.traitCount === undefined ? 2 : params.traitCount;
    if (budget <= 0) return chosen;

    var spent = 0;
    var guard = 0;
    while (spent < budget && guard++ < 60) {
      var candidates = [];
      for (var c = 0; c < pool.length; c++) {
        if (banned.indexOf(pool[c].id) >= 0) continue;
        if (compatible(pool[c], chosen)) candidates.push(pool[c]);
      }
      if (!candidates.length) break;

      /* BUILT TRAITS ROLL AT A THIRD OF THE WEIGHT (D291). Natural is the
       * default reading of a random body and something built the surprise;
       * a uniform pick gave nearly every black hole a station. The roll only:
       * the picker and presets are untouched. With every weight equal this
       * picks the same index `floor(rng × n)` did, so a pool with nothing
       * built — or all built, the machine world — rolls exactly as before. */
      var total = 0, w = [];
      for (c = 0; c < candidates.length; c++) {
        w.push((candidates[c].tags || []).indexOf("artificial") >= 0 ? BUILT_WEIGHT : 1);
        total += w[c];
      }
      var allBuilt = true;
      for (c = 0; c < w.length; c++) if (w[c] === 1) { allBuilt = false; break; }
      if (allBuilt) total = candidates.length;
      var target = rng() * total, pickIdx = 0;
      for (c = 0; c < candidates.length; c++) {
        target -= allBuilt ? 1 : w[c];
        if (target < 0) { pickIdx = c; break; }
        pickIdx = c;
      }
      var pick = candidates[clamp(pickIdx, 0, candidates.length - 1)];

      chosen.push(pick);
      spent += 1;
    }

    return chosen;
  }

  /* Find the zone modifier in a selection, if any. At most one applies: two
   * competing angular partitions would fight for the same space and neither
   * would read. */
  function modifierIn(traits) {
    for (var i = 0; i < traits.length; i++) {
      if (CC.Traits.isModifier(traits[i])) return traits[i];
    }
    return null;
  }

  CC.TraitRoll.select = select;
  CC.TraitRoll.modifierIn = modifierIn;
})();
