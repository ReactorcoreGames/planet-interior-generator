/* What somebody BUILT round a star, above the collectors and the mirrors —
 * Phase 9b on the stars (D289, D298-): the Dyson shell and the Dyson swarm.
 *
 * THE STAR'S BUILT STACK, lowest first: `stellar-collector` in the corona,
 * `orbital-mirrors` on one orbit just above it (stellar-built.js), the shell
 * above the mirrors, the swarm above the shell. Every one is placed with
 * `depthAbove` measured from the halo's edge, capped by `edgeCap` (D298), so
 * on a star whose corona already fills the frame's height the stack sinks
 * into the glow instead of off the canvas, and the shell stays a whole
 * circle.
 *
 * D290: under a shell the collectors can read as its control rods and the
 * mirrors as its adjustment mirrors; without one they read as themselves.
 * The picture does not decide.
 *
 * Gated on `stellar`, as the collectors and mirrors are. The registry must
 * load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  /* THE DYSON SHELL — the cut edge of a sphere of lattice round the star:
   * a band of triangulated mesh between three rails, plated in places, the
   * corona showing through the open cells. One element, rolled by its
   * builder (gen/dyson.js). */
  var DYSON_SHELL = {
    id: "dyson-shell",
    label: "Dyson Shell",
    anchor: "orbit",
    reach: "outward",
    /* Above the mirrors (+0.02-0.03) with the same cap, so it is a whole
     * circle inside the frame's height (about 1.28 body radii). */
    depthAbove: [0.085, 0.09],
    edgeCap: 1.15,
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "even",
    jitter: 0,
    mirror: false,
    offset: [0, 360],
    element: "dyson-shell",
    tiers: 1,
    named: true,
    density: { min: 1, max: 1 },
    alpha: [0.92, 1.0],
    tone: "lighter",
    requires: ["stellar"],
    excludes: ["dyson-shell-unfinished"],
    tags: ["stellar", "artificial"]
  };

  /* THE UNFINISHED SHELL — the same lattice with 1-9 arcs not built yet,
   * each ending at a rib, bare rail reaching on past it (D305). The same
   * element with one more line of data, so it is the shell's other state,
   * not a second structure: a builder reads `gaps` and nothing asks which
   * trait is on. Whether it is going up, abandoned or coming down is the
   * author's (D290). */
  var DYSON_SHELL_UNFINISHED = {};
  for (var key in DYSON_SHELL) DYSON_SHELL_UNFINISHED[key] = DYSON_SHELL[key];
  DYSON_SHELL_UNFINISHED.id = "dyson-shell-unfinished";
  DYSON_SHELL_UNFINISHED.label = "Unfinished Dyson Shell";
  DYSON_SHELL_UNFINISHED.gaps = [1, 9];
  DYSON_SHELL_UNFINISHED.excludes = ["dyson-shell"];

  /* THE DYSON SWARM — stellar colonies: many small stone slabs lying level,
   * each with a row of lit windows inside and a docking port at either end,
   * on a few staggered orbits above the shell. Level in the picture rather
   * than turned to the radial, so a slab reads the same at the top of the
   * star as at its sides. Kept to the bearings the frame's height shows, as
   * the planet's defence network is. One element, rolled by its builder. */
  var DYSON_SWARM = {
    id: "dyson-swarm",
    label: "Dyson Swarm",
    anchor: "orbit",
    reach: "outward",
    /* Clear of the shell's outer rail and ribs (about +0.115), out to about
     * 1.9 body radii, where the debris of a planet's system would be. */
    depthAbove: [0.24, 0.72],
    edgeCap: 1.15,
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "even",
    jitter: 0,
    mirror: false,
    offset: [0, 360],
    element: "dyson-swarm",
    tiers: 1,
    named: true,
    density: { min: 1, max: 1 },
    alpha: [0.92, 1.0],
    tone: "lighter",
    requires: ["stellar"],
    excludes: [],
    tags: ["stellar", "artificial"]
  };

  CC.Traits.register([DYSON_SHELL, DYSON_SHELL_UNFINISHED, DYSON_SWARM]);
})();
