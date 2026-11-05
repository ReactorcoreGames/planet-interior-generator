/* Gaseous bodies — traits: what falls and what freezes. Helium rain, diamond
 * rain and prismatic ice.
 *
 * Split out of the gaseous trait file at Session AL; see gaseous-weather.js for
 * the family's header. The registry must load before this file, and the three
 * gaseous files stay in order, because registration order is picker and roll
 * order. */

var CC = CC || {};

(function () {
  "use strict";

  /* ---- things falling through the interior ------------------------------ */

  /* HELIUM RAIN — helium becoming immiscible in metallic hydrogen and settling
   * inward. It happens in the deep envelope of a cool giant and nobody will
   * ever see it, which is precisely the sort of thing a cutaway exists for.
   *
   * DROPLETS, NOT VEINS, and this is the third shape it has had.
   *
   *   `flow-line`  vanished among the layer's own three hundred.
   *   `vein`+bulk  visible, and looked like the PLANET'S MINERAL VEINS — a
   *                rock feature on a body made of gas, with a hard contour
   *                that reads as a fracture through something solid.
   *
   * Helium separating out of hydrogen is a FLUID leaving a fluid: it beads.
   * So it is a field of round, soft-edged droplets with no outline at all,
   * strung in loose downward trails — the shape of something falling through a
   * liquid, which no vein primitive can be talked into. `speckle` is the one
   * primitive here that is a plain round dot with no contour, and at three
   * tiers a field of them reads as a shower rather than as a texture. */
  var HELIUM_RAIN = {
    id: "helium-rain",
    label: "Helium Rain",
    /* ANCHORED IN THE WATER CLOUD, REACHING INWARD.
     *
     * Physically the separation happens deeper, in the metallic-hydrogen
     * region — but `molecular-h` rolls as a thin band sitting behind the much
     * larger water cloud, so a trait drawn there is occluded on most bodies
     * and was invisible on every one measured. Anchoring one layer out and
     * reaching inward draws the same downward journey across the part of the
     * envelope the viewer can actually see, which is the honest trade: this is
     * a diagram of a process, and a process nobody can see is not a diagram of
     * anything.
     *
     * A LIST, because an ice giant has no `water-cloud` at all — anchored to
     * that alone the trait rolled, reported itself on the card, and drew
     * literally nothing on half the family. See anchorLayer. */
    anchor: ["water-cloud", "icy-mantle"],
    reach: "inward",
    depth: [0.05, 0.95],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    /* Round, soft, and CONTOURLESS. `speckle` draws a plain filled dot, which
     * is the whole requirement — the mineral vein's dark outline is exactly
     * what made the previous version read as rock. */
    element: "speckle",
    tiers: 3,
    /* Large for a speckle: these are droplets, not grain. The three tiers
     * give a few fat beads among many fine ones, which is what a shower of
     * condensing liquid actually looks like. */
    size: [0.022, 0.042],
    /* THE ALPHA FLOOR WAS THE PROBLEM, not the tone.
     *
     * At 0.55 a droplet sitting in the inner half of the water cloud — which
     * carries `depthGradient: 0.55` and so is markedly darker there than its
     * authored value suggests — composited to a dim grey bead. The trait
     * declared itself bright and drew dark, which for the one feature whose
     * entire purpose is showing something nobody could ever see is the same
     * failure as not drawing at all. */
    alpha: [0.72, 0.95],
    density: { min: 200, max: 680 },
    /* Reflective metal in a dark fluid, so it is BRIGHTER than what surrounds
     * it. `lighter` is the tone that says so, and unlike the bulk vein's
     * two-tone fill it needs no special casing at all. */
    tone: "lighter",
    /* AND IT LIGHTENS WHAT IS BEHIND IT RATHER THAN BEING PAINTED OVER IT.
     *
     * `lighter` moves the droplet's own colour up a fixed step, which is a
     * statement about the paint; `screen` makes the mark brighten the layer
     * beneath, which is a statement about the material. For something falling
     * through a dark fluid the second is the one that reads — it is exactly
     * what makes `shard` say "gem" instead of "pebble" (see gemFill), and the
     * mechanism was already there for a batched speckle to borrow. */
    blend: "screen",
    requires: ["gaseous"],
    excludes: [],
    tags: ["interior", "resource"]
  };

  /* DIAMOND RAIN — and it is a real thing, which is worth stating because the
   * name sounds invented.
   *
   * In an ice giant's mantle, methane cracks under pressure and the carbon
   * compresses into diamond, which then SINKS toward the core because it is
   * denser than the slush around it. So the phenomenon is a slow fall of
   * crystals through the deep interior — not a glitter of specks near the
   * surface, which is what it was first drawn as and what prompted the "what
   * IS this exactly" question.
   *
   * SPLIT IN TWO, because the fall and its destination are different pictures
   * and only one of them was being drawn:
   *
   *   `diamond-rain`  the crystals in transit, scattered through the mantle,
   *                   pointing inward because that is the way they are going.
   *   `diamond-layer` where they end up — a dense accumulation deep down,
   *                   which is the part a cutaway is uniquely able to show.
   *
   * The two are independent: a body may show the fall, the floor, or both. */
  var DIAMOND_RAIN = {
    id: "diamond-rain",
    label: "Diamond Rain",
    /* `surface` is the reserved token for "whatever the outermost real layer
     * turned out to be" — but here the interesting layer is the bulk, and the
     * two archetypes name it differently. Anchoring to the TROPOSPHERE and
     * reaching inward needs no branch, and is also where the carbon actually
     * starts its fall from. */
    /* IN THE BULK ENVELOPE, WHERE IT ACTUALLY FORMS.
     *
     * Carbon does not start falling at the cloud tops — methane cracks under
     * pressure well down in the mantle, and the crystals sink from there. The
     * first version anchored to the troposphere because that was the layer
     * both archetypes shared; an anchor LIST says the same thing without
     * putting the feature in the wrong place. */
    anchor: ["molecular-h", "icy-mantle"],
    reach: "on",
    depth: [0.05, 0.95],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    /* A SHARD, NOT A CHUNK — and the difference is the whole trait.
     *
     * `chunk` draws a rounded angular lump because it exists to draw BROKEN
     * ROCK, which is exactly what a diamond is not. Scattered through the
     * envelope at size it produced an asteroid ring in the middle of the
     * planet.
     *
     * `shard` is few long straight facets around a stretched centre — an
     * elongated crystal — with a bright glint on one face, drawn under a
     * `screen` blend so each stone LIGHTENS what is behind it instead of
     * covering it. That transparency is what says "gem" rather than "pebble".
     * The long axis points at the body's centre, which is the direction they
     * are falling. */
    element: "shard",
    named: true,
    tiers: 3,
    /* THE ORIGINAL FIGURES. A real diamond formed this way is about a
     * centimetre across, so it is a small hard thing seen in enormous
     * quantity — and the version that read best was exactly that: many fine
     * crystals rather than a few pebbles. Enlarging them to make the split
     * legible was solving a problem the split had created. */
    size: [0.009, 0.024],
    alpha: [0.62, 0.95],
    density: { min: 60, max: 210 },
    tone: "glow",
    requires: ["gaseous"],
    excludes: [],
    tags: ["interior", "resource"]
  };

  /* PRISMATIC ICE — exotic water-ice crystals, growing sideways in the shear.
   *
   * THIS REPLACES A `diamond-layer` THAT WAS PHYSICALLY WRONG. The idea was a
   * drift of diamond accumulated on the mantle floor; the actual physics says
   * the opposite happens — it gets hot enough down there that the diamond
   * MELTS into a liquid-carbon sea, so there is no crystal floor to draw.
   *
   * What is real, and stranger, is up higher. Water under this pressure does
   * not freeze into ordinary ice: it takes exotic phases (ice VII, ice X and
   * their neighbours) with lattices nothing on a planet's surface produces.
   * They are birefringent — they split light — which is a genuine reason for
   * them to show colour rather than a decorative one.
   *
   * PERPENDICULAR, AND THAT IS THE POINT. A falling crystal points the way it
   * is going, so `diamond-rain` above is radial. These are not falling: they
   * are GROWING in a shearing flow, so their long axis lies across it, around
   * the body. One primitive, one flag, opposite reading — the same trick the
   * bulk vein's `bright` polarity uses.
   *
   * A NARROW HUE RANGE PER BODY, not a full spectrum per crystal. Rolling
   * every instance across the whole wheel reads as confetti and makes every
   * world look the same; rolling a narrow band per body and varying within it
   * gives one world cyan-through-violet and another amber-through-rose, so
   * each still reads as one place. See `chromaSpread` in gemFill. */
  var PRISMATIC_ICE = {
    id: "prismatic-ice",
    label: "Prismatic Ice",
    /* In the water cloud where it can be seen, dispersing upward from the
     * mantle beneath it. */
    anchor: ["water-cloud", "icy-mantle"],
    reach: "on",
    depth: [0.10, 0.90],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    element: "shard",
    /* Lies ACROSS the radial direction rather than along it. */
    crosswise: true,
    /* Each body rolls a hue band this many degrees wide, and the crystals
     * vary within it. Wide enough to be visibly chromatic, narrow enough that
     * the set still reads as one material. */
    chromaSpread: 90,
    named: true,
    tiers: 3,
    /* Sparse — roughly a tenth of the rain's count. These are notable
     * formations, not a shower.
     *
     * THE CEILING IS CUT 30%, THE FLOOR IS UNTOUCHED. The largest crystals
     * were reading as slabs rather than as formations; the smallest were
     * fine. Scaling the whole range would have pushed the bottom tier of a
     * `tiers: 3` trait toward sub-pixel, which is the failure STORM_BELTS'
     * feather note records — a shard too small to show its facets is not a
     * smaller crystal, it is a speck. So only the top moves. */
    size: [0.014, 0.021],
    alpha: [0.60, 0.95],
    density: { min: 22, max: 80 },
    spread: [0.6, 1.6],
    tone: "glow",
    requires: ["gaseous"],
    excludes: [],
    tags: ["interior", "resource"]
  };

  CC.Traits.register([
    HELIUM_RAIN,
    DIAMOND_RAIN,
    PRISMATIC_ICE
  ]);
})();
