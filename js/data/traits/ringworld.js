/* What somebody BUILT in a nebula, big enough to see at its scale — Phase
 * 9b on the nebula (D289, D302): one ringworld.
 *
 * A RING ROUND ITS OWN SUN, seen at a slant: the far half shows its inner
 * face, a strip of land and sea lit from the middle, and the near half its
 * dark outer hull. One per body, one element, rolled by its builder
 * (gen/ringworld.js), drawn by draw/primitives/ringworld.js.
 *
 * IN THE GAS, NOT ON IT. Placed by the nebula's own `pocket` placer
 * (gen/diffuse-pockets.js) in fairly thick gas, sunk under the other
 * traits (`under`), its sun lighting the cloud round it and veils of the
 * cloud drifting across it. A ring laid over the nebula like a sticker was
 * the failure to avoid.
 *
 * D290: a habitat, a ruin, a garden, a gate — the picture does not decide.
 * Its surface is rolled lush, arid or frozen, and nothing says who built it.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  var RINGWORLD = {
    id: "ringworld",
    label: "Ringworld",
    /* The nebula's fields, as `pocket` in diffuse.js fixes them: the placer
     * decides where. */
    anchor: ["dense-region", "shell"], reach: "spanning", place: "pocket",
    depth: [0.5, 0.5], arc: [0, 360], repeat: [1, 1], spacing: "random",
    jitter: 1, mirror: false, offset: [0, 360],
    escapes: true,
    element: "ringworld",
    tiers: 1,
    named: true,
    density: { min: 1, max: 1 },
    alpha: [0.92, 1.0],
    tone: "lighter",
    /* One ring, at a pocket's centre; the pocket's radius is the ring's. */
    formation: "centre", pockets: [1, 1],
    pocketSize: [0.064, 0.084],
    /* Anywhere in the gas, leaning a little toward the thicker parts: the
     * user wanted the placement varied and liberal (D302). */
    seek: 0.5, within: [0.08, 0.72], aim: "random",
    /* On a shell, in its ring of material. */
    byAnchor: { shell: { band: true, seek: 0.5 } },
    under: true,
    requires: ["diffuse"],
    excludes: [],
    tags: ["artificial"]
  };

  CC.Traits.register([RINGWORLD]);
})();
