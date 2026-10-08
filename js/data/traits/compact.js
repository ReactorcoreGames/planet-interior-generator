/* Compact objects — traits for the neutron star, the pulsar and the black hole.
 *
 * See js/data/traits/registry.js for the grammar. Eligibility is by tag:
 * `magnetic` (neutron star and pulsar), `beamed` (pulsar), `hole` (black
 * hole), `compact` (all three). Nothing here names an archetype.
 *
 * WHAT IS NOT HERE, ON PURPOSE. The spec's `magnetar`, `cooling-crust`,
 * `millisecond-spin`, `feeding`/`dormant`, `rapid-spin`, `relativistic-jets`
 * and `supermassive`/`stellar-mass` are all ends of a control — Field strength,
 * Surface heat, Spin rate, Accretion rate, Mass class — and TRAIT-SYSTEM.md's
 * third test makes an axis of anything that changes values rather than the
 * stack. `gravitational-lensing` is the void's own darkened sky, standard
 * equipment rather than optional. `binary-companion` is the accretion stream:
 * a companion is visible on a compact body only by what it feeds it.
 *
 * EACH TRAIT IS A DIFFERENT KIND OF MARK from anything its body already draws
 * (D76): cracks in a crystal, curls among straight vortex lines, a ribbon
 * following one field line, a ruled line parallel to the spin axis, built
 * modules in an empty orbit, a torn star. */

var CC = CC || {};

(function () {
  "use strict";

  /* STARQUAKES — the crystal crust cracking under the field's stress. Dark
   * near-radial fractures through the lattice into the pasta: the only
   * DISORDER in a crust drawn as order, which is what makes them read.
   * More of them on a stronger field; a magnetar's crust is the one that
   * breaks.
   *
   * SEVERAL SITES, NOT ONE. `clustered` makes round(n / 2.4) centres, so a
   * repeat of [1, 3] was always ONE patch — a side effect of the count, never
   * a decision. A stressed crust breaks in several places: [3, 8] gives one
   * to three clusters round the rim, and Field strength (the driver) adds
   * cracks to each. */
  var STARQUAKE_SCARS = {
    id: "starquake-scars",
    label: "Starquake Scars",
    anchor: "iron-lattice",
    reach: "spanning",
    /* ROOTED AT THE TOP OF THE CRUST: a vein runs INWARD from where it is
     * placed, so rooted mid-crust the cracks ran on through the pasta into
     * the superfluid, which is liquid and cannot crack. With the lengths
     * below they stop in the pasta. */
    depth: [0.82, 0.98],
    arc: [8, 28],
    repeat: [3, 8],
    spacing: "clustered",
    jitter: 0.6,
    mirror: false,
    offset: [0, 360],
    element: "crack",
    chaos: 0.45,
    tiers: 1,
    named: true,
    size: [0.11, 0.18],
    alpha: [0.70, 0.95],
    density: { min: 4, max: 10 },
    driver: { param: "starActivity", at0: 0.6, at1: 1.6 },
    tone: "darker",
    requires: ["magnetic"],
    excludes: [],
    tags: ["compact"]
  };

  /* A GLITCH — the star suddenly spins up when its superfluid's vortices,
   * pinned to the crust, let go all at once. Drawn where it happens: a knot of
   * tangled vortex CURLS against the underside of the crust, among the
   * straight parallel lines everywhere else. Curl against line is the whole
   * contrast.
   *
   * ONE KNOT, OCCASIONALLY TWO. A glitch is an event, and the curls read best
   * as one focal point; a scatter of them would be texture. [1, 4] keeps the
   * old one-knot size and gives a second knot only at n = 4 (about one roll
   * in six), since `clustered` makes round(n / 2.4) centres. */
  var GLITCHING = {
    id: "glitching",
    label: "Glitching",
    anchor: "superfluid",
    reach: "on",
    depth: [0.80, 0.97],
    arc: [18, 40],
    repeat: [1, 4],
    spacing: "clustered",
    jitter: 0.5,
    mirror: false,
    offset: [0, 360],
    element: "cell",
    tiers: 2,
    size: [0.10, 0.18],
    alpha: [0.60, 0.95],
    density: { min: 14, max: 36 },
    tone: "lighter",
    requires: ["magnetic"],
    excludes: [],
    tags: ["compact"]
  };

  /* AN ACCRETION STREAM — gas from a companion, channelled by the field onto a
   * polar cap. The primitive follows this body's own dipole (`el.poles`), so
   * on a pulsar the stream lands on a tilted pole. Leaves the frame at its far
   * end, where the companion is (`escapes`). */
  var ACCRETION_STREAM = {
    id: "accretion-stream",
    label: "Accretion Stream",
    anchor: "plasma-skin",
    reach: "spanning",
    escapes: true,
    depth: [0.5, 0.5],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    element: "matter-stream",
    tiers: 1,
    named: true,
    size: [0.045, 0.065],
    alpha: [0.80, 0.95],
    density: { min: 1, max: 1 },
    tone: "glow",
    requires: ["magnetic"],
    excludes: [],
    tags: ["compact"]
  };

  /* THE LIGHT CYLINDER — where a field co-rotating with the star would have
   * to outrun light. A cylinder about the SPIN axis, cut through that axis,
   * is two parallel lines; its radius is Spin rate (`poles.lightCylinder`,
   * js/gen/compact.js). The primitive ignores the placement and draws from
   * the poles, as the accretion stream does.
   *
   * A TRAIT, NOT AN OPTIONAL EXTRA (Session W). It used to roll by itself
   * under Optional layers, drawn as two dashed lines the height of the
   * frame — with the body's Rotation, a pair of diagonal dashes crossing the
   * whole picture, which read as a forgotten marquee and as the app's own
   * dashed framing guides. Now a faint solid line with ticks, a band around
   * the star rather than across the frame, and switchable like any mark. */
  var LIGHT_CYLINDER = {
    id: "light-cylinder",
    label: "Light Cylinder",
    anchor: "plasma-skin",
    reach: "spanning",
    escapes: true,
    depth: [0.5, 0.5],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    element: "light-cylinder",
    tiers: 1,
    named: true,
    size: [0.05, 0.05],
    alpha: [0.50, 0.65],
    density: { min: 1, max: 1 },
    tone: "glow",
    requires: ["beamed"],
    excludes: [],
    tags: ["compact"]
  };

  /* A NAVIGATION BEACON — pulsars are galactic GPS, and somebody has built
   * on it: relay stations evenly spaced on one orbit. Even spacing is what
   * reads as built (TRAIT-SYSTEM.md). Inside the frame at the pulsar's own
   * framing (the archetype's `frame`). */
  var NAVIGATION_BEACON = {
    id: "navigation-beacon",
    label: "Navigation Beacon",
    anchor: "orbit",
    reach: "outward",
    depth: [1.52, 1.62],
    arc: [0, 360],
    repeat: [3, 6],
    spacing: "even",
    jitter: 0.30,
    mirror: false,
    offset: [0, 360],
    element: "plate",
    aspect: [0.40, 0.60],
    tiers: 1,
    named: true,
    size: [0.09, 0.11],
    alpha: [0.85, 1.0],
    density: { min: 3, max: 6 },
    tone: "lighter",
    requires: ["beamed"],
    excludes: [],
    tags: ["compact", "artificial"]
  };

  /* A RESEARCH STATION — one cluster of modules, at a respectful distance.
   * Two traits sharing a label because the distance is the body's: inside a
   * neutron star's field, but outside a black hole's photon sphere and its
   * ergosphere, which reach much further in horizon radii. */
  function station(id, depth, size, requires, clear) {
    return {
      id: id,
      label: "Research Station",
      anchor: "orbit",
      reach: "outward",
      depth: depth,
      arc: [4, 9],
      repeat: [1, 1],
      spacing: "clustered",
      jitter: 0.3,
      mirror: false,
      offset: [0, 360],
      clear: clear,
      element: "plate",
      aspect: [0.38, 0.85],
      tiers: 2,
      named: true,
      size: size,
      alpha: [0.80, 0.96],
      density: { min: 5, max: 10 },
      tone: "lighter",
      requires: requires,
      excludes: [],
      tags: ["compact", "artificial"]
    };
  }
  var RESEARCH_STATION = station("research-station", [1.38, 1.50],
                                 [0.10, 0.16], ["magnetic"]);
  /* Well above the extraction array's orbit, and off the jets and out of
   * the disc: the people live further out than the machinery. */
  var HOLE_STATION = station("hole-station", [3.3, 3.6],
                             [0.30, 0.42], ["hole"], true);

  /* ENERGY EXTRACTION — Penrose-process harvesting: collectors ringed just
   * outside the ergosphere, cones aimed at the hole, taking its spin. */
  var ENERGY_EXTRACTION = {
    id: "energy-extraction-array",
    label: "Energy Extraction Array",
    anchor: "orbit",
    reach: "outward",
    depth: [2.15, 2.35],
    arc: [0, 360],
    /* HOW MANY IS A FACT ABOUT THE HOLE, not about Detail density: one
     * hole has a lone collector, another seven. `density` pinned to one so
     * the roll here is the count (see placeOne). */
    repeat: [1, 7],
    spacing: "even",
    jitter: 0.35,
    mirror: false,
    offset: [0, 360],
    /* Off the jets and out of the disc — see CC.Compact.clearAngles. */
    clear: true,
    element: "coned-cylinder",
    tiers: 1,
    named: true,
    /* In HORIZON radii, and a horizon is drawn small (the archetype's
     * `frame`), so these are large numbers for a small mark. */
    size: [0.20, 0.24],
    aspect: [0.62, 0.86],
    alpha: [0.85, 1.0],
    density: { min: 1, max: 1 },
    tone: "lighter",
    requires: ["hole"],
    excludes: [],
    tags: ["compact", "artificial"]
  };

  /* A TIDAL DISRUPTION — a star wandering too close, stretched into a stream:
   * half of it spiralling in round the hole, half flung back out. */
  var TIDAL_DISRUPTION = {
    id: "tidal-disruption",
    label: "Tidal Disruption",
    anchor: "photon-sphere",
    reach: "spanning",
    escapes: true,
    depth: [0.5, 0.5],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    element: "tidal-stream",
    tiers: 1,
    named: true,
    size: [0.13, 0.17],
    alpha: [0.80, 0.95],
    density: { min: 1, max: 1 },
    tone: "glow",
    requires: ["hole"],
    excludes: [],
    tags: ["compact"]
  };

  CC.Traits.register([
    STARQUAKE_SCARS,
    GLITCHING,
    ACCRETION_STREAM,
    LIGHT_CYLINDER,
    NAVIGATION_BEACON,
    RESEARCH_STATION,
    HOLE_STATION,
    ENERGY_EXTRACTION,
    TIDAL_DISRUPTION
  ]);
})();
