/* Trait definitions — pure data.
 *
 * A trait is an OPTIONAL addition that makes one body different from another.
 * If a layer would look wrong without it, it is a layer detail and belongs in
 * data/elements.js instead. See docs/TRAIT-SYSTEM.md for the distinction and
 * for the full field reference.
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
 * whatever the layers already rolled. See gen/zones.js. */

var CC = CC || {};

CC.Traits = (function () {
  "use strict";

  /* ---- ordinary traits -------------------------------------------------- */

  /* Mineral veins — the `clustered` case. Branching lines through the mantle,
   * heavily tiered so a dense setting reads as a network rather than as more
   * of the same stroke. */
  var MINERAL_VEINS = {
    id: "mineral-veins",
    label: "Mineral Veins",
    anchor: "mantle",
    reach: "on",
    depth: [0.05, 0.95],
    arc: [0, 360],
    repeat: [3, 9],
    spacing: "clustered",
    jitter: 0.55,
    mirror: false,
    offset: [0, 360],
    element: "vein",
    /* FAT AND FILLED, NOT A HAIRLINE (D60).
     *
     * The mantle carries up to ~600 pale thin strokes of its own — convection
     * cells, flow arrows, flow lines — and veins drawn in that same vocabulary
     * were simply lost among them. Brightening or multiplying them could not
     * fix it, because the problem was never contrast: a trait has to read as a
     * different KIND of mark, not a louder example of the same one. `bulk`
     * switches the primitive to a filled, tapering, nodular lode with a dark
     * contour, which nothing else in the layer resembles. */
    bulk: 6.5,
    tiers: 3,
    /* SIZED AGAINST THE TIER-0 ELEMENT, which is the largest and the rarest.
     * Authoring against what the TYPICAL instance should look like makes
     * everything far too small, since most instances are tier 2-3 at roughly
     * a quarter the size — the Phase 3 lesson, applied to traits. */
    size: [0.15, 0.33],
    alpha: [0.62, 0.92],
    /* THE FULL ORIGINAL COUNT, after a round trip through halving it.
     *
     * The reduction was a mistake twice over. It assumed fat veins would crowd
     * the layer, but there were never many to begin with — at the reduced
     * count they read as a handful of isolated OBJECTS rather than as a
     * network running through the rock, which is most of what invited reading
     * them as bottles and fish in the first place. Several overlapping seams
     * read as a vein system; three do not.
     *
     * So the density thesis holds here after all, and D60's "fewer, bigger"
     * was simply wrong about this trait. Enlarging them was not the thing that
     * needed compensating for. */
    density: { min: 14, max: 96 },

    /* WIDE VARIATION IN SIZE AND SHAPE, roughly ±50%.
     *
     * A vein system is not made of one repeated seam. Per-instance scatter on
     * both the length and the girth is what turns a set of similar marks into
     * something that looks grown rather than placed — some short and fat, some
     * long and thin, a few of each extreme.
     *
     * This rides on top of the tier system rather than replacing it: tiers
     * still set the broad size classes, and this roughens each instance within
     * its class. See D62. */
    chaos: 0.5,
    /* A DARK BODY, not a pale stroke. Every flow indicator in the mantle is
     * `lighter`; going the other way is a second axis of separation on top of
     * the shape, and it suits ore — a dense metallic seam in glowing rock
     * reads as darker than what surrounds it, not brighter. */
    tone: "darker",
    requires: ["solid-interior"],
    excludes: [],
    tags: ["interior", "resource"]
  };

  /* Ore deposits — clustered blobs in the crust. The shallow sibling of the
   * veins, and the reason `sizeRel` exists: the crust's thickness varies most,
   * so absolute sizes read correctly at only one setting. */
  var ORE_DEPOSITS = {
    id: "ore-deposits",
    label: "Ore Deposits",
    anchor: "crust",
    reach: "on",
    depth: [0.08, 0.86],
    arc: [0, 360],
    repeat: [4, 12],
    spacing: "clustered",
    jitter: 0.7,
    mirror: false,
    offset: [0, 360],
    element: "blob",
    tiers: 3,
    size: [0.55, 1.15],
    sizeRel: true,
    alpha: [0.50, 0.92],
    density: { min: 12, max: 78 },
    tone: "lighter",
    requires: ["solid-interior"],
    excludes: [],
    tags: ["interior", "resource"]
  };

  /* Void pockets — the same shape as ore, read as absence rather than
   * presence. `tone: "darker"` is the whole difference, which is a good sign
   * the primitive list is the right size. */
  var VOID_POCKETS = {
    id: "void-pockets",
    label: "Void Pockets",
    anchor: "crust",
    reach: "on",
    depth: [0.10, 0.80],
    arc: [0, 360],
    repeat: [3, 10],
    spacing: "clustered",
    jitter: 0.8,
    mirror: false,
    offset: [0, 360],
    element: "blob",
    tiers: 3,
    size: [0.45, 1.00],
    sizeRel: true,
    alpha: [0.55, 0.95],
    density: { min: 8, max: 54 },
    tone: "darker",
    requires: ["solid-interior"],
    excludes: [],
    tags: ["interior"]
  };

  /* Magma chambers — glowing pockets high in the mantle, reaching up into the
   * crust. `reach: "outward"` from the mantle is what puts them at the top of
   * their layer where they read as feeding something. */
  var MAGMA_CHAMBERS = {
    id: "magma-chambers",
    label: "Magma Chambers",
    anchor: "mantle",
    reach: "outward",
    depth: [0.74, 1.0],
    arc: [0, 360],
    repeat: [3, 9],
    spacing: "clustered",
    jitter: 0.6,
    mirror: false,
    offset: [0, 360],
    element: "blob",
    tiers: 3,
    size: [0.070, 0.150],
    alpha: [0.60, 1.00],
    density: { min: 8, max: 46 },
    tone: "glow",
    requires: ["solid-interior"],
    excludes: [],
    tags: ["interior"]
  };

  /* Metal-rich — bright inclusions through the whole interior. Deliberately
   * high-count and small: this is a body-wide material property, so it should
   * read as texture everywhere rather than as a few big lumps somewhere. */
  var METAL_RICH = {
    id: "metal-rich",
    label: "Metal-Rich",
    anchor: "mantle",
    reach: "on",
    depth: [0.02, 0.98],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    element: "speckle",
    tiers: 3,
    size: [0.020, 0.040],
    alpha: [0.50, 0.95],
    density: { min: 180, max: 900 },
    tone: "lighter",
    requires: ["solid-interior"],
    excludes: [],
    tags: ["interior", "resource"]
  };

  /* Ring system — the `reach: "outward"` case. Radii are multiples of the body
   * radius rather than positions in a layer, and the view leaves room for them
   * via `body.extent`. */
  var RING_SYSTEM = {
    id: "ring-system",
    label: "Ring System",
    anchor: "orbit",
    reach: "outward",
    depth: [1.35, 2.15],
    arc: [0, 360],
    repeat: [3, 8],
    spacing: "even",
    jitter: 0.15,
    mirror: false,
    offset: [0, 360],
    element: "ring-band",
    tiers: 2,
    alpha: [0.16, 0.52],
    density: { min: 3, max: 14 },
    tone: "lighter",
    requires: [],
    excludes: ["shattered"],
    tags: ["orbital"]
  };

  /* Debris belt — the scattered sibling of the ring system. Same region, but
   * `spacing: "random"` with high jitter, which is what TRAIT-SYSTEM.md means
   * by even-and-low-jitter reading as artificial and clustered-and-high-jitter
   * reading as natural. */
  var DEBRIS_BELT = {
    id: "debris-belt",
    label: "Debris Belt",
    anchor: "orbit",
    reach: "outward",
    depth: [1.28, 1.95],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    element: "chunk",
    tiers: 3,
    size: [0.030, 0.062],
    alpha: [0.45, 0.92],
    density: { min: 60, max: 420 },
    tone: "lighter",
    requires: [],
    excludes: [],
    tags: ["orbital"]
  };

  /* Heavy cratering — impact scars across the crust. Distinct from the moon's
   * built-in crater field, which is part of that archetype's terrain recipe:
   * this is a planet CHOOSING to look battered.
   *
   * `cutsFrosting` because a crater is an EXCAVATION. It punches through the
   * snow, moss or silt lying on the ground and exposes the rock, so it is
   * drawn after draw/film.js's deposit rather than under it. Without that the
   * scars were placed correctly at the top of the crust and then covered — the
   * frosting bites 69-90% down the crust and these sit at 81-100%, so the
   * trait generated up to 90 elements and changed almost no pixels. */
  var CRATERED = {
    id: "cratered",
    label: "Heavily Cratered",
    anchor: "crust",
    reach: "on",
    cutsFrosting: true,
    /* DRY LAND ONLY, AND SEATED ON THE REAL GROUND. Impacts scar exposed
     * rock; placed by angle alone a good share of them landed on bearings
     * where the terrain sits below sea level and floated in open water.
     * `sink` then cuts each one into the surface it found, by a fraction of
     * its own size, so the scar is a hole in the ground rather than a mark
     * hovering over it. */
    dryLand: true,
    sink: 0.45,
    depth: [0.80, 1.0],
    arc: [1.5, 6],
    repeat: [22, 60],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    element: "arc-band",
    tiers: 3,
    /* MANY MORE, MUCH SMALLER. A battered world reads as battered through
     * COUNT, not through size: a few big smudges look like staining, while
     * dozens of small pits across the land look like a surface nothing has
     * resurfaced. Size is roughly a third of what it was and the count is
     * roughly tripled — the project's density thesis applied to one trait. */
    size: [0.08, 0.26],
    sizeRel: true,
    /* Wide across, shallow along — the proportions of a pit rather than of a
     * scrape. Without this a short arc drawn at ordinary thickness came out as
     * a thin scratch on the crust. */
    fat: 2.6,
    alpha: [0.55, 0.92],
    density: { min: 55, max: 260 },
    tone: "darker",
    /* Each pit darkens toward its floor, same as the basin — it is the same
     * kind of thing, only smaller. */
    floor: 0.72,
    requires: ["solid-surface"],
    excludes: [],
    tags: ["damage"]
  };

  /* One to five enormous impact basins, with a wide arc each — the one trait
   * that is deliberately a handful of large features rather than a dense
   * field, so the grammar is shown to cover both ends.
   *
   * `repeat: [1,5]` with `spacing: "random"` rolls a uniform count and scatters
   * each basin independently — no distance enforcement between them. Basins
   * are free to overlap or even land on top of each other; that reads as one
   * messier excavation rather than as a bug, and keeping the placement dumb
   * is worth more than the variety a repulsion pass would add.
   *
   * IT LIVES IN THE CRUST AND THE SEA COVERS IT. A basin is excavated INTO the
   * rock, so it draws in the crust's own pass like any other crust trait. It
   * used to be lifted onto the true surface by a branch meant for the cut
   * `ice-caps` trait, which floated it in the middle of the ocean; see the
   * note in gen/traitroll.js's `place`.
   *
   * `depth` reaches DEEP rather than sitting in the outer sliver. Excavation
   * is the whole idea — the crater floor is a long way below the surrounding
   * surface, and a wedge confined to the top 45% read as a smudge on the crust
   * rather than as a hole punched through most of it. High alpha for the same
   * reason: each one is a named feature and among the body's biggest scars,
   * not an instance of a dense field, so it can afford to be the darkest thing
   * on the crust. */
  var IMPACT_BASIN = {
    id: "impact-basin",
    label: "Impact Basin",
    anchor: "crust",
    reach: "on",
    /* `cutsFrosting` because a basin is an EXCAVATION exactly like the smaller
     * craters in CRATERED — it must punch through whatever frosting lies on
     * the ground and is drawn after draw/film.js's deposit rather than under
     * it. Without this the basin was painted in the crust's own pass and then
     * buried by the frosting a moment later, the same failure CRATERED's
     * comment documents. */
    cutsFrosting: true,
    depth: [0.18, 1.0],
    arc: [42, 78],
    repeat: [1, 5],
    spacing: "random",
    mirror: false,
    offset: [0, 360],
    element: "wedge",
    tiers: 1,
    alpha: [0.78, 0.95],
    density: { min: 1, max: 1 },
    tone: "darker",
    /* Its floor goes almost black. A basin is a hole, and the single thing
     * that makes a hole read as a hole rather than as a dark patch painted on
     * the crust is that you cannot see the bottom of it. */
    floor: 0.88,
    requires: ["solid-surface"],
    excludes: [],
    tags: ["damage"]
  };

  var ALL = [
    MINERAL_VEINS,
    ORE_DEPOSITS,
    VOID_POCKETS,
    MAGMA_CHAMBERS,
    METAL_RICH,
    RING_SYSTEM,
    DEBRIS_BELT,
    CRATERED,
    IMPACT_BASIN
  ];

  var BY_ID = {};
  for (var i = 0; i < ALL.length; i++) BY_ID[ALL[i].id] = ALL[i];

  /* Which traits an archetype may carry. A trait is eligible when the body
   * carries every tag it `requires`. Kept as a function rather than a table on
   * the archetype so adding a trait is one edit here. */
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
    ALL: ALL,
    get: get,
    ids: ids,
    eligible: eligible,
    isModifier: isModifier
  };
})();
