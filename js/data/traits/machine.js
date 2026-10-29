/* Machine worlds — the exclusive traits.
 *
 * See js/data/traits/registry.js for the grammar and docs/MACHINE-WORLDS.md
 * § "Exclusive traits" for the audit that chose these (Session Z, stage d):
 * ancient-precursor was cut (a story, not a mark: it lives on the card's
 * Construction row and in the flavour), planet-cracker removed by the user.
 * Eligibility is by tag: `machine`. Nothing here names an archetype.
 *
 * MOST OF THESE SWITCH STRUCTURE, NOT PLACE MARKS. A machine world's
 * features are general structure properties the archetype declares — the
 * rupture, the shafts — and a trait here changes them through `sets`
 * (js/gen/traitsets.js), merged over the archetype before the detail stage.
 * So no builder and no draw pass asks which trait is on.
 *
 * EACH A DIFFERENT KIND OF MARK from the body's own vocabulary of bands,
 * radial slots, tiny repeated rectangles and torn wedges:
 *
 *   under-construction   open scaffold lattice and squared, trimmed cuts
 *                        where the wounds would be torn
 *   blast-doors          solid striped slabs across the shaft slots
 *   shaft-covers         sliding silo covers over the shaft mouths
 *   overgrown            lumpy organic mats and hanging tendrils, the one
 *                        irregular mark
 *   weaponized           one great filled barrel through every shell, its
 *                        muzzle breaking the silhouette
 *   worldship            drive bells on one bearing, the one asymmetric
 *                        silhouette, and a plume, the one soft mark */

var CC = CC || {};

(function () {
  "use strict";

  function machine(spec) {
    var base = { requires: ["machine"], excludes: [], tags: ["artificial"] };
    for (var k in spec) base[k] = spec[k];
    return base;
  }

  /* UNDER CONSTRUCTION (D249). The wounds Hull integrity cuts become the
   * parts not built yet: the same geometry, growing with the same dial, with
   * clean faces and the work on them (js/gen/woundclean.js). At Hull
   * integrity 92% or more there is nothing left to build, so it draws
   * nothing: the world is finished. */
  var UNDER_CONSTRUCTION = machine({
    id: "under-construction", label: "Under Construction",
    sets: { rupture: { edge: "clean" } }
  });

  /* BLAST DOORS (the user, stage a). An airlock pair where each shaft
   * crosses a shell, open or shut by Operational status: a derelict is
   * sealed, a hive mostly open (js/gen/shaftdoors.js). */
  var BLAST_DOORS = machine({
    id: "blast-doors", label: "Blast Doors",
    sets: { shafts: { doors: { thick: 0.017 } } }
  });

  /* SHAFT COVERS (likewise). A silo cover over each shaft's mouth, a plate
   * in the mouth sliding aside into the hull. First built as louvred
   * shutters: too tall and too fussy (the user). */
  var SHAFT_COVERS = machine({
    id: "shaft-covers", label: "Shaft Covers",
    sets: { shafts: { covers: { thick: 0.022 } } }
  });

  /* OVERGROWN. Moss or a rust bloom over the hull's outer face, down the
   * shafts, hung in the outer void and pooled in the wounds
   * (js/gen/overgrowth.js). Detail density sets the cover, from patches to
   * most of the hull; Operational status only its colour: withered to dead
   * straw as the world goes dark, never less of it (growth on a running
   * world may be deliberate cover, the user). */
  var OVERGROWN = machine({
    id: "overgrown", label: "Overgrown",
    sets: { overgrowth: { cover: [0.15, 0.85], proud: 0.020, creep: 0.045, hang: 140, pool: 0.022,
                          wither: [0.0, 0.15] } }
  });

  /* WEAPONIZED. One bore-cannon barrel from a breech at the heart out
   * through every shell, 3-5x a shaft's width, ringed with accelerator
   * coils, its muzzle crown standing past the surface; charged by the
   * heart's power, cold on a derelict (js/gen/bore.js). */
  var WEAPONIZED = machine({
    id: "weaponized", label: "Weaponized",
    sets: { bore: { width: [3, 5], cap: [0.042, 0.085], muzzle: 0.075, coils: 0.10 } }
  });

  /* WORLDSHIP. A cluster of drive bells on one bearing, aft of any bore,
   * a thrust frame carrying their push down into the shells, and a soft
   * plume burning out of them; fired by the heart's power, cold on a
   * derelict (js/gen/engines.js). */
  var WORLDSHIP = machine({
    id: "worldship", label: "Worldship",
    sets: { engines: { bells: [3, 4], bell: [0.065, 0.090], mount: 0.035, reach: [0.40, 0.60], depth: 0.75 } }
  });

  CC.Traits.register([UNDER_CONSTRUCTION, BLAST_DOORS, SHAFT_COVERS, OVERGROWN, WEAPONIZED, WORLDSHIP]);
})();
