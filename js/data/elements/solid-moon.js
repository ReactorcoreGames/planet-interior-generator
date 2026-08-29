/* Moon — detail recipes for the roles the moon adds.
 *
 * Only `ice-shell` is new. `ocean`, `crust`, `mantle` and `core` are shared
 * with the planet and are deliberately NOT redeclared here: element recipes
 * are keyed by role globally, which is what makes a crust mean the same thing
 * on every body that has one, and duplicating a whole table to change a
 * count is exactly the failure `elementScale` exists to prevent.
 *
 * WHERE THE MOON GENUINELY DIFFERS IT SAYS SO ON THE LAYER, not here:
 *
 *   the SHAPE of its ground        `reliefSpec` on the crust — craters on
 *                                  craters rather than continents, which is a
 *                                  different field and not a scaled one
 *   how MUCH of a role it has      `elementScale` on the layer
 *
 * See js/data/elements/registry.js for what every field means. The registry
 * must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  var grain = CC.Elements.grain;

  CC.Elements.register({

    /* ---------------------------------------------------------------- */
    /* THE SIGNATURE LOOK OF THE ICE BRANCH: long branching cracks across a
     * bright shell. Europa's lineae are the reference, and they are the one
     * thing that makes an ice moon recognisable at a glance rather than
     * reading as a pale crust.
     *
     * `relief` is NOT declared here. The shell's terrain is its UNDERSIDE —
     * where the accreted ice hangs — and that is a fact about the moon rather
     * than about ice shells in general, so it lives on the layer as
     * `reliefSpec`. */
    "ice-shell": {
      elements: [
        /* THE FRACTURE NETWORK. Long, low-angle, near-radial cracks running
         * most of the way through the shell.
         *
         * SIZED RELATIVE TO THE SHELL'S OWN THICKNESS, because the shell is
         * thin by definition and a crack authored in body radii would either
         * vanish or cross the whole layer depending on the roll. D122's trap
         * in its structural form: the authored number has to be in the unit
         * the layer is actually measured in. */
        {
          kind: "vein",
          count: [15, 40],
          tiers: 3,
          sizeRel: true,
          size: [0.55, 1.00],
          depth: [0.04, 0.94],
          alpha: [0.42, 0.82],
          tone: "darker"
        },
        /* A SECOND, FINER SET at a different scale and a lower alpha. One set
         * of cracks reads as a drawn pattern; two sets at different registers
         * read as a surface that has been fracturing for a long time. This is
         * the density thesis applied to a single mark — more, smaller, fainter
         * rather than a few elaborate ones. */
        {
          kind: "vein",
          count: [40, 120],
          tiers: 2,
          sizeRel: true,
          size: [0.18, 0.48],
          depth: [0.08, 0.92],
          alpha: [0.20, 0.44],
          tone: "darker"
        },
        /* THE PLATES BETWEEN THE CRACKS. Broad, faint, near-tangential bands
         * that give the shell internal structure so it is not a flat white
         * ring with lines on it. Lighter rather than darker, so they read as
         * ice catching the light rather than as more cracks. */
        {
          kind: "arc-band",
          count: [20, 60],
          tiers: 3,
          sizeRel: true,
          size: [0.20, 0.55],
          depth: [0.06, 0.90],
          alpha: [0.14, 0.34],
          arc: [18, 95],
          tone: "lighter"
        },
        /* The fine texture of the ice itself. Cheap, and it is what stops the
         * shell reading as a flat fill between its cracks. */
        grain(420, 1500, [0.008, 0.016])
      ]
    }
  });
})();
