/* Orbital traits that somebody BUILT — Phase 9b on planets and moons
 * (D289): the orbital ring with its space elevators, the defence network and
 * the minefield, in that order outward.
 *
 * GATED ON `rounded`, a fact about the body (orbital.js explains why a gate
 * is a tag named for the physical fact): a world pulled round by its own
 * gravity has an orbit worth building in and a surface to tether to. The
 * planet and the moon carry it; the asteroid does not, and a giant's version
 * of the same idea is its own trait in its own session.
 *
 * THE ALTITUDES ARE STATED ABOVE THE BODY'S OWN REACH (`depthAbove`, see
 * stellar-built.js), so the ring clears a thick atmosphere and a bare moon
 * alike. All three sit inside or beside the natural ring-system (1.35-2.15
 * body radii) and debris belt (1.28-1.95) and never collide with them by
 * construction: the ring is below both.
 *
 * D290 for each: drawn at a size the view can show, and open to reading —
 * the info card may take a side, the picture does not.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  /* ORBITAL RING + SPACE ELEVATORS — one trait, because an elevator is what
   * holds a low ring up and a ring is what an elevator climbs to.
   *
   * A crisp truss band with even habitat modules on it, and tethers down to
   * the ground with climbers on them: a different mark kind from the dusty
   * `ring-system` (D76), which is a soft band of particles on a tilted plane.
   * This one is in the plane of the cut, like every station the generator
   * draws, and it is the only thing in orbit that is touching the world. */
  var ORBITAL_RING = {
    id: "orbital-ring",
    label: "Orbital Ring",
    anchor: "orbit",
    reach: "outward",
    /* LOW, and the lowest of the three: just clear of the atmosphere, so
     * the elevators are short enough to read as tethers rather than spokes,
     * and well inside the frame's vertical reach (about 1.28 body radii at
     * the default Body size). */
    depthAbove: [0.10, 0.15],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "even",
    jitter: 0,
    mirror: false,
    offset: [0, 360],
    element: "orbital-ring",
    tiers: 1,
    named: true,
    /* `{1, 1}`: one ring. Its modules and elevators are rolled by the
     * builder (gen/orbitalbuilt.js), not by Detail density. */
    density: { min: 1, max: 1 },
    alpha: [0.92, 1.0],
    tone: "lighter",
    requires: ["rounded"],
    excludes: [],
    tags: ["orbital", "artificial"]
  };

  /* ORBITAL DEFENCE NETWORK — a few large gun platforms among many small
   * satellites, above the ring.
   *
   * THE PLATFORM IS TWO "4"s MERGED AT THE MIDDLE, one turned upside down
   * and flipped (the user's design, D289): two parallel barrels sharing a
   * crossbar, one running toward the world and one away. The shape has 180°
   * symmetry, so it points no gun in any particular direction — the author
   * decides whether the network guards the world or holds it (D290). A
   * satellite is a small metal box with two cyan solar panels.
   *
   * KEPT TO THE BEARINGS THE FRAME SHOWS. At this height the top and bottom
   * of the orbit are past the frame's vertical reach (about 1.28 body radii
   * at the default Body size), so the builder places only where a mark's
   * height above or below the centre stays inside it — the sides, mostly.
   * Placing round the whole orbit would spend half the network off canvas. */
  var DEFENCE_NETWORK = {
    id: "defence-network",
    label: "Orbital Defence Network",
    anchor: "orbit",
    reach: "outward",
    /* Above the ring and its counterweights (to about 0.21 over the body's
     * reach), among the debris belt and the ring system's inner bands. */
    depthAbove: [0.27, 0.45],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "random",
    jitter: 0,
    mirror: false,
    offset: [0, 360],
    element: "defence-network",
    tiers: 1,
    named: true,
    density: { min: 1, max: 1 },
    alpha: [0.92, 1.0],
    tone: "lighter",
    requires: ["rounded"],
    excludes: [],
    tags: ["orbital", "artificial"]
  };

  /* ORBITAL MINEFIELD — many small spiked orbs, much higher than the
   * platforms. A quarantine or a defensive perimeter, and some will read
   * them as small satellites; the user's words, and all three are fine
   * (D290).
   *
   * THE ONE ENTRY THE AUDIT DROPPED AND THE USER KEPT. Session AB dropped it
   * because the spec drew a mine as an X, a map symbol for something
   * invisible. The user's mine is a thing: an orb with four spikes, at a
   * size the view shows (D82: a symbol is not a scale model). */
  var MINEFIELD = {
    id: "minefield",
    label: "Orbital Minefield",
    anchor: "orbit",
    reach: "outward",
    /* Far above the platforms (to about 0.55 over the body's reach), among
     * the ring system's outer bands; past the frame's height everywhere
     * but the sides, so the builder keeps to those. */
    depthAbove: [0.70, 1.00],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "even",
    jitter: 0,
    mirror: false,
    offset: [0, 360],
    element: "minefield",
    tiers: 1,
    named: true,
    density: { min: 1, max: 1 },
    alpha: [0.92, 1.0],
    tone: "lighter",
    requires: ["rounded"],
    excludes: [],
    tags: ["orbital", "artificial"]
  };

  CC.Traits.register([
    ORBITAL_RING,
    DEFENCE_NETWORK,
    MINEFIELD
  ]);
})();
