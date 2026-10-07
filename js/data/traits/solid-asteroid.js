/* Asteroid — traits for the fragmented family.
 *
 * Everything here requires `fragmented`, which only the asteroid carries, so
 * none of these can land on a planet or a moon without any of them naming one.
 * That is the registry's rule and it is what keeps a body family a data edit.
 *
 * ---- WHAT IS NOT HERE, AND WHY -------------------------------------------
 *
 * WHAT AN AGGREGATE IS MADE OF BELONGS TO THE MOSAIC, NOT TO THIS POOL
 * (ASTEROID-OVERHAUL §3). The ore is in particular fragments, so composition is
 * the material fan, the palette and the card that reads them back. A trait
 * that restated it would be a second source of truth for one fact. So:
 *
 *   ice-rich        deleted. An icy asteroid is a cold body whose voids hold
 *                   ice — see `voidIce` on the mosaic recipe.
 *   metal-rich,     no longer anchor to `interior`; they stay alive on the
 *   mineral-veins   planet and moon mantles.
 *   hollowed-out    retired. It was a `wedge` — a pie slice from the centre —
 *                   and no tuning makes that an excavated chamber. Interior
 *                   structure is planned as an axis, not a trait (§7).
 *
 * Traits here describe what HAPPENED to the body, not what it IS.
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

  /* ---- mining-station --------------------------------------------------- */

  /* THE WORKINGS, and they are on the OUTSIDE.
   *
   * Buildings, frames and pads set into the crust, which is where they would
   * actually be — anchored to the shell rather than the interior.
   *
   * RECTANGLES, NOT CAPSULES (ASTEROID-OVERHAUL §5). This used to reuse the
   * gas miner's `capsule` on the argument that a pressure hull is a pressure
   * hull wherever it is bolted. The user disagreed and the reason is about
   * gravity: a capsule is a shape for holding pressure or riding a wind, and
   * an installation on a body with a thousandth of a g is a FRAME — boxes,
   * trusses, landing pads. `plate` draws all three (machines.js), so a
   * clustered handful reads as one installation.
   *
   * `named: true` exempts it from the tier-alpha penalty and the clumping
   * variation, because these are a handful of individually meaningful objects
   * rather than a field — the exact case both exemptions were written for. */
  var MINING_STATION = {
    id: "mining-station",
    label: "Mining Station",
    anchor: ["outer-shell", "crust"],
    /* ON THE SURFACE, A QUARTER SUNK IN. `spanning` takes it out of the
     * shell's own clipped pass, where it was buried in the crust and its top
     * cut off at the outline; `seat` sits each module on the outline as
     * drawn and tilts it to the local slope (draw/scene.js `seatOn`). */
    reach: "spanning",
    seat: 0.25,
    depth: [0.5, 0.5],
    arc: [0, 360],
    repeat: [2, 5],
    spacing: "clustered",
    jitter: 0.35,
    mirror: false,
    offset: [0, 360],
    element: "plate",
    /* Block proportions, from squat to long. A pad sets its own. */
    aspect: [0.38, 0.85],
    tiers: 2,
    named: true,
    sizeRel: true,
    size: [0.55, 1.30],
    alpha: [0.78, 0.96],
    /* More marks than the capsule had, because a mark is now one MODULE of
     * an installation rather than a whole hull. */
    density: { min: 6, max: 16 },
    tone: "lighter",
    requires: ["fragmented"],
    excludes: [],
    tags: ["artificial"]
  };

  /* ---- tunnel-borer ---------------------------------------------------- */

  /* A MACHINE DIGGING IN, AND THE TUNNEL IT LEFT (ASTEROID-OVERHAUL §5).
   *
   * The user's idea, from looking at the old capsule stations: "a cylinder
   * with two spiky triangles on one end and a tunnel trail behind the
   * cylinder as the tunnel borer dives into the interior". Why it works where
   * `hollowed-out` failed:
   *
   *   - it has a DIRECTION. Every other mark here is a region or a scatter;
   *     a borer is a vector — it entered there and is now here, and its
   *     history is drawn behind it;
   *   - it crosses the shell into the interior, which is what `spanning` is
   *     for, and argues that the two layers are one body;
   *   - it is unambiguously artificial in a picture that is otherwise all
   *     geology, without a caption.
   *
   * THE TRAIL IS PART OF THE CAVE SYSTEM, not a mark of its own: gen/caves.js
   * lays a constant-width bore from where it entered to where it is now, and
   * draw/caves.js draws it in the same passes as every cavern, so a borer
   * that reaches a chamber reads as one excavation. This element is only the
   * machine (draw/primitives/machines.js).
   *
   * Placed by the ordinary grammar at the HEAD: a point a good way into the
   * interior. Sized in body radii — the trail is what carries it at sheet
   * scale, and the machine can be a dozen pixels. */
  var TUNNEL_BORER = {
    id: "tunnel-borer",
    label: "Tunnel Borer",
    anchor: "interior",
    reach: "spanning",
    depth: [0.42, 0.84],
    arc: [0, 360],
    repeat: [1, 3],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    element: "borer",
    tiers: 1,
    named: true,
    size: [0.060, 0.085],
    alpha: [0.92, 1.0],
    density: { min: 1, max: 3 },
    tone: "lighter",
    requires: ["fragmented"],
    excludes: [],
    tags: ["artificial"]
  };

  CC.Traits.register([
    SHATTERED,
    MINING_STATION,
    TUNNEL_BORER
  ]);
})();
