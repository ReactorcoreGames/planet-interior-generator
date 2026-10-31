/* Orbital structures somebody BUILT round a giant — Phase 9b on the gas
 * giant and the ice giant (D289, D296): the skyhooks and the orbital cities they
 * hang from, one trait.
 *
 * GATED ON `gaseous`, the fact that matters: a body with no ground. A
 * planet's elevator stands on its crust (orbital-built.js); a giant has
 * nothing to stand on, so its tether hangs from orbit and drops into the
 * cloud deck instead, and what it lifts is the gas itself.
 *
 * ABOVE THE SKIMMERS. `skimmer-tracks` straddles the cloud tops (0.94-1.08
 * body radii); the skyhook platforms sit just over them, inside the frame's
 * height all round, and the cities well above, among the `ringlet-system`
 * (1.22-2.35) and the debris belt (1.28-1.95), at the bearings the frame
 * shows.
 *
 * D290: the cities are the one kind of city kept, because round a giant
 * they are megastructures rather than a town — and they are drawn as a
 * structure, not a skyline, so the author decides what lives in them.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  /* SKYHOOKS + ORBITAL CITIES — one trait, because the city is what the
   * hook hangs from. Every skyhook is a platform on one low orbit with a
   * tether down into the clouds and a scoop on the end; on the one or two
   * nearest the sides of the frame the tether climbs on past the platform
   * to a city, and the rest end in a counterweight. One element, so a city
   * always sits on a skyhook's line. */
  var SKYHOOKS = {
    id: "skyhook-cities",
    label: "Skyhooks & Orbital Cities",
    anchor: "orbit",
    reach: "outward",
    /* Above the body's own reach (`depthAbove`, as the planet's ring): just
     * clear of the skimmers, and low enough that a counterweight over the
     * top of the giant stays inside the frame. The cities' height is the
     * builder's. */
    depthAbove: [0.08, 0.11],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "even",
    jitter: 0,
    mirror: false,
    offset: [0, 360],
    element: "skyhooks",
    tiers: 1,
    named: true,
    /* `{1, 1}`: one system. Its hooks and cities are rolled by the builder
     * (gen/giantbuilt.js), not by Detail density. */
    density: { min: 1, max: 1 },
    alpha: [0.92, 1.0],
    tone: "lighter",
    requires: ["gaseous"],
    excludes: [],
    tags: ["orbital", "artificial"]
  };

  CC.Traits.register([SKYHOOKS]);
})();
