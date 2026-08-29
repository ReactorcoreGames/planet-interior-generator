/* Asteroid — traits for the fragmented family.
 *
 * Everything here requires `fragmented`, which only the asteroid carries, so
 * none of these can land on a planet or a moon without any of them naming one.
 * That is the registry's rule and it is what keeps a body family a data edit.
 *
 * ---- WHAT IS NOT HERE, AND WHY -------------------------------------------
 *
 * The spec's eligible list is
 *
 *   metal-rich · ice-rich · shattered · mineral-veins · ore-deposits ·
 *   hollowed-out (artificial) · mining-station · docked-ships · derelict-hulk
 *
 * `metal-rich`, `mineral-veins` and `ore-deposits` ALREADY EXIST in
 * js/data/traits/solid.js and are not redeclared here. What they needed was an
 * anchor that resolves on a body with no crust and no mantle, which is a
 * one-word edit to their `anchor` field rather than a duplicate trait — see
 * D77: `anchor` may be a list, and a role may not exist on every archetype in
 * a family. Copying them would have given the asteroid its own private
 * mineral vein that drifts from the planet's the first time either is tuned.
 *
 * `rubble-pile` and `void-riddled` are DELIBERATELY ABSENT as traits. The spec
 * folds them into the Cohesion axis, for the reason quoted in index.html: they
 * drive four things at once and have to move together. A trait that competed
 * with the slider for the same marks would produce a body that is a rubble
 * pile in one place and a monolith in another.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  /* ---- shattered -------------------------------------------------------- */

  /* A BODY THAT HAS BEEN HIT SINCE IT FORMED.
   *
   * The mosaic's own fractures (js/data/elements/solid-asteroid.js) are
   * standard equipment — every aggregate has some. This is the different
   * claim: one or two catastrophic breaks running clean through the whole
   * body, from silhouette to silhouette, that very nearly finished it.
   *
   * A DIFFERENT KIND OF MARK, not a louder one (D76/D160). The interior is
   * already full of dark strokes — the seams between every pair of fragments —
   * so a fracture trait drawn darker or thicker would have been lost among
   * them exactly as the mineral veins were lost in the mantle. What separates
   * this is SCALE and REACH: it spans the body rather than sitting inside a
   * layer, and there are one or two of them rather than a field. A mark that
   * crosses the whole picture is a different register from a mark that fills
   * part of it, whatever colour either is. */
  var SHATTERED = {
    id: "shattered",
    label: "Shattered",
    /* Anchored to the interior, which is nearly the whole body — so `spanning`
     * reach genuinely crosses it. */
    anchor: "interior",
    reach: "spanning",
    depth: [0.0, 1.0],
    arc: [0, 360],
    repeat: [1, 3],
    spacing: "random",
    jitter: 0.4,
    mirror: false,
    offset: [0, 360],
    element: "fracture",
    tiers: 1,
    /* SIZED AGAINST THE LAYER, which here is most of the radius. These are
     * meant to be the largest single marks in the picture. */
    sizeRel: true,
    size: [0.85, 1.45],
    alpha: [0.62, 0.90],
    density: { min: 1, max: 3 },
    tone: "darker",
    requires: ["fragmented"],
    excludes: [],
    tags: ["damage"]
  };

  /* ---- ice-rich --------------------------------------------------------- */

  /* WATER, HELD IN THE VOIDS AND ALONG THE JOINTS.
   *
   * The spec's trait, and the reason half the asteroids in fiction are worth
   * visiting: a carbonaceous body carries water and water is fuel. What makes
   * it a picture rather than a caption is WHERE it sits — an asteroid's ice is
   * not a shell and not a sea, it is filling in the gaps between the
   * fragments, which is the one place this body has that no other body does.
   *
   * BLOBS RATHER THAN VEINS, and the choice matters. A vein is a crack that
   * something flowed along; ice here did not flow, it was there when the
   * fragments settled around it. So the mark is a rounded pocket sitting
   * between pieces, and it is BRIGHT — the only bright mass in an interior
   * whose every other mark is dark. That is the different register the trait
   * needs, and it is also simply what ice looks like against rock. */
  var ICE_RICH = {
    id: "ice-rich",
    label: "Ice-Rich",
    anchor: "interior",
    reach: "on",
    depth: [0.08, 0.92],
    arc: [0, 360],
    repeat: [5, 14],
    spacing: "clustered",
    jitter: 0.62,
    mirror: false,
    offset: [0, 360],
    element: "blob",
    tiers: 3,
    sizeRel: true,
    size: [0.06, 0.16],
    alpha: [0.45, 0.80],
    density: { min: 12, max: 64 },
    /* LIGHTER, and it is the whole mark. Everything else in this layer runs
     * from mid to black; a pale mass is immediately legible as a different
     * material rather than as another fragment. */
    tone: "lighter",
    requires: ["fragmented"],
    excludes: [],
    tags: ["resource"]
  };

  /* ---- hollowed-out ----------------------------------------------------- */

  /* SOMEBODY GOT HERE FIRST.
   *
   * The spec marks it `(artificial)` and it is the most evocative output the
   * family makes — the phase doc's own "most evocative" list ends with "a
   * low-Cohesion asteroid with something built inside it".
   *
   * A CHAMBER, NOT A CAVITY. The mosaic already produces voids by the dozen at
   * a low Cohesion, so an excavation drawn as another hole would be invisible
   * on exactly the bodies the trait is best on. What says "made" rather than
   * "happened" is that it is REGULAR: a large smooth-walled space with a flat
   * floor, where everything around it is angular. `wedge` with a dark floor is
   * the excavation primitive the impact basin already uses, and here it is
   * doing the same job from the inside out.
   *
   * It sits DEEP and takes a big arc, because a hollowed asteroid is hollowed
   * at its centre — that is where the rock is thickest overhead, which is the
   * entire reason anyone would do it. */
  var HOLLOWED_OUT = {
    id: "hollowed-out",
    label: "Hollowed Out",
    anchor: "interior",
    reach: "on",
    depth: [0.0, 0.52],
    arc: [55, 120],
    repeat: [1, 2],
    spacing: "even",
    jitter: 0.2,
    mirror: false,
    offset: [0, 360],
    element: "wedge",
    tiers: 1,
    alpha: [0.80, 0.95],
    density: { min: 1, max: 2 },
    tone: "darker",
    /* Its floor goes nearly black, for the impact basin's reason: what makes a
     * space read as a space rather than as a dark patch is that you cannot see
     * the back of it. */
    floor: 0.90,
    requires: ["fragmented"],
    excludes: [],
    tags: ["artificial"]
  };

  /* ---- mining-station --------------------------------------------------- */

  /* THE WORKINGS, and they are on the OUTSIDE.
   *
   * `hollowed-out` is the excavated space; this is the plant that did it —
   * pressure hulls and processing gear set into the crust, which is where they
   * would actually be. Anchored to the shell rather than the interior so the
   * two traits compose into one story when they both roll: a station on the
   * surface and the chamber it dug beneath.
   *
   * `capsule` is the machined-hull primitive the gas-miner platforms use, and
   * reusing it is the point — a pressure hull is a pressure hull wherever it
   * is bolted, and inventing a second one would be a new mark for a difference
   * that does not exist.
   *
   * `named: true` exempts it from the tier-alpha penalty and the clumping
   * variation, because these are a handful of individually meaningful objects
   * rather than a field — the exact case both exemptions were written for. */
  var MINING_STATION = {
    id: "mining-station",
    label: "Mining Station",
    anchor: ["outer-shell", "crust"],
    reach: "on",
    depth: [0.10, 0.95],
    arc: [0, 360],
    repeat: [2, 6],
    spacing: "clustered",
    jitter: 0.5,
    mirror: false,
    offset: [0, 360],
    element: "capsule",
    tiers: 2,
    named: true,
    sizeRel: true,
    size: [0.55, 1.30],
    alpha: [0.78, 0.96],
    density: { min: 3, max: 11 },
    tone: "lighter",
    requires: ["fragmented"],
    excludes: [],
    tags: ["artificial"]
  };

  CC.Traits.register([
    SHATTERED,
    ICE_RICH,
    HOLLOWED_OUT,
    MINING_STATION
  ]);
})();
