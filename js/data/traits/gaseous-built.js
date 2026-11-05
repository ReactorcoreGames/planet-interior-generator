/* Gaseous bodies — traits: the miners and the skimmers.
 *
 * Split out of the gaseous trait file at Session AL; see gaseous-weather.js for
 * the family's header. NOT MERGED INTO giant-built.js, which holds the skyhooks:
 * that file loads ahead of the solid traits, and registration order is roll
 * order, so moving these there would change every giant's traits. */

var CC = CC || {};

(function () {
  "use strict";

  /* ---- industry -------------------------------------------------------- */

  /* GAS-MINER PLATFORMS — the canonical gas-giant operation, drawn.
   *
   * Floating at neutral buoyancy in the upper envelope, which is exactly the
   * band the stat card's "where you can work" line describes; the two are
   * saying the same thing in different media. `spacing: "even"` with very low
   * jitter, because TRAIT-SYSTEM.md's rule is that even-and-regular reads as
   * artificial — which is the entire point of a trait meant to look built. */
  var GAS_MINERS = {
    id: "gas-miner-platforms",
    label: "Gas-Miner Platforms",
    /* ANCHORED TO THE TROPOSPHERE, NOT THE CLOUD TOPS.
     *
     * A platform floats at neutral buoyancy, which is genuinely below the
     * cirrus deck — and the cirrus deck is also the brightest, busiest band in
     * the picture, where a handful of small bright dots disappeared entirely.
     * The physically right layer and the legible one turned out to be the same
     * one, which is usually how it goes. */
    anchor: "troposphere",
    reach: "on",
    depth: [0.55, 0.95],
    arc: [0, 360],
    repeat: [5, 14],
    /* RANDOM, NOT EVEN. Even spacing reads as artificial (TRAIT-SYSTEM.md),
     * which is right for a ring system and wrong for an industry that grew
     * wherever the gas was — a perfect ring of platforms looks installed by
     * decree. Close together is fine; on top of each other is not, which is
     * what `minGap` enforces. */
    spacing: "random",
    jitter: 1,
    /* Degrees. Just wider than the largest hull, so two can sit near each
     * other without merging into one unreadable smudge. */
    minGap: 7,
    mirror: false,
    offset: [0, 360],
    /* A CAPSULE, NOT A CHUNK. `chunk` is broken rock — it was the closest
     * available shape and it read as exactly that: rocks, floating in a gas
     * giant. A platform is MANUFACTURED, and what says so is straight sides,
     * hard ends, a specular highlight down one flank and a shadow down the
     * other. `capsule` draws that; `hullFill` supplies the metal, at low
     * saturation and a wide value range, deliberately NOT taking the layer's
     * hue beyond a faint tint — industry does not belong to the planet, and
     * that independence is what makes it read as an intruder.
     *
     * `upright` hangs it along the local vertical, pointing at the body's
     * centre, because that is how anything buoyant sits in a gravity field. */
    element: "capsule",
    upright: true,
    aspect: [0.30, 0.46],
    named: true,
    tiers: 2,
    /* A SYMBOL, BUT A RESTRAINED ONE.
     *
     * These are deliberately out of scale with a body 100,000 km across — a
     * platform is a symbol for an industry, the way a compass rose on a map is
     * not drawn to scale — but the first pass at making them legible
     * overshot and they read as moons. The top of the range is cut hard and
     * the floor dropped further, which also widens the gap between the two:
     * a fleet with a real size spread reads as several different installations
     * rather than as one design stamped out. */
    size: [0.017, 0.028],
    alpha: [0.90, 1.0],
    density: { min: 5, max: 16 },
    /* Half to double the slider's answer, so one world has a token presence
     * and another is heavily industrialised. See `spread` in traitroll. */
    spread: [0.5, 2.0],
    tone: "lighter",
    requires: ["gaseous"],
    excludes: [],
    tags: ["artificial"]
  };

  /* SKIMMER TRACKS — the vessels themselves, diving and climbing.
   *
   * `reach: "inward"` from the cloud tops with a short arrow: the trait is the
   * TRAJECTORY rather than the ship, which is both cheaper to draw and more
   * legible at this scale. A dozen arrows dipping into the envelope says
   * "there is an industry here" far more clearly than a dozen dots would.
   *
   * Requires the platforms, since a skimmer with nowhere to dock is a story
   * the picture cannot tell. */
  var SKIMMER_TRACKS = {
    id: "skimmer-tracks",
    label: "Skimmer Traffic",
    /* STRADDLING THE CLOUD TOPS, which is where the work actually happens.
     *
     * Anchored to the outermost layer and reaching OUTWARD, so the vessels sit
     * in the band between the top of the envelope and the space just above it
     * — dipping in and climbing out, exactly as the stat card's "skimmers can
     * dive the top N km and climb back out" line describes. Drawn inside the
     * cloud deck they were invisible against the brightest, busiest band in
     * the picture; against the dark of space they have somewhere to be seen. */
    /* `anchor: "orbit"`, because it is the ONLY reach that genuinely leaves
     * the body. `reach: "outward"` sounds like it should, and does not — it
     * clamps to the top of the anchor layer (see traitDepth), so skimmers
     * anchored to `upper-cloud` sat at r=0.967, buried in the brightest band
     * in the picture exactly as before.
     *
     * `depth` is then in BODY RADII: 0.98 is a hair under the cloud tops and
     * 1.18 is clear of them, so the fleet straddles the boundary — some
     * vessels dipping in, some climbing out, which is the operation the stat
     * card describes. `body.extent` grows to leave room, so the view frames
     * them. */
    anchor: "orbit",
    reach: "outward",
    /* STRADDLING THE CLOUD TOPS, and reaching a little further IN than out.
     * A skimmer's whole story is the dive: most of the fleet should be inside
     * the envelope at any moment, with a few clear of it and climbing. */
    depth: [0.94, 1.08],
    arc: [0, 360],
    repeat: [8, 18],
    /* Random for the same reason the platforms are — see the note there. A
     * fleet under way is not in formation. */
    spacing: "random",
    jitter: 1,
    minGap: 6,
    mirror: false,
    offset: [0, 360],
    /* THE SAME HULL AS THE PLATFORMS, lying flat instead of hanging.
     *
     * `upright: false` puts the long axis along the direction of travel, which
     * is around the body — a vessel under way rather than something moored.
     * Using one primitive for both is the point: they are the same industry,
     * and the only difference between a platform and a skimmer in a
     * cross-section is which way it is pointing. */
    element: "capsule",
    upright: false,
    aspect: [0.22, 0.34],
    named: true,
    tiers: 2,
    /* Slightly larger than the platforms — a skimmer is a ship rather than a
     * buoy — but held to the same restraint. See the platforms' note. */
    size: [0.022, 0.036],
    alpha: [0.90, 1.0],
    density: { min: 6, max: 14 },
    spread: [0.5, 2.0],
    tone: "lighter",
    requires: ["gaseous"],
    excludes: [],
    tags: ["artificial"]
  };

  CC.Traits.register([
    GAS_MINERS,
    SKIMMER_TRACKS
  ]);
})();
