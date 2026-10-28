/* Diffuse bodies — traits for the nebula.
 *
 * See js/data/traits/registry.js for the grammar. Eligibility is by tag:
 * `diffuse`. Nothing here names an archetype.
 *
 * PLACED BY THE GAS, NOT ROUND A SHELL. Every trait here declares `place:
 * "pocket"` (js/gen/diffuse-pockets.js): its marks go where the body's
 * density field is thick, or thin, or where another trait is, and they are
 * drawn in the spanning pass after all the gas, in body space. `anchor` is a
 * list — the cloud's dense region, or a shell's ring — so a trait resolves on
 * both stacks, and `byAnchor` restates where to look on a shell: in its band,
 * lit from the dead star at the middle.
 *
 * WHICH FORM EACH MEANS SOMETHING ON (`when`, registry.js):
 *
 *   all three     pillars (on a shell: cometary knots and the fingers of a
 *                 remnant, heads toward the star), bow shocks, filament web,
 *                 the material pockets, everything built
 *   cloud and     a dark rift — a planetary nebula's waist is often a dark
 *   planetary     band; a remnant's shock has swept its dust out
 *   cloud only    a cavity (a shell IS one), a protostar cluster and an
 *                 embedded star (a dying star's ejecta forms no stars, and
 *                 the remnant star is the star)
 *
 * EACH A DIFFERENT KIND OF MARK (D76): a column, a parabola, a hole with a
 * skin, a network, a cluster with a shared glow, one dominant star; then four
 * kinds of solid in four vocabularies — glinting crystal, matte rock, hard
 * metal flecks, mixed rubble — and an off-hue blob; then built things in
 * three arrangements: a tight aligned cluster, ships in file, hulls tumbling.
 *
 * THE DARK RIFT IS NOT THE LAYERS' DARK LANES. Lanes are standard equipment
 * in the dense and core regions (js/data/elements/diffuse.js): short, many,
 * and painted UNDER the regions drawn after them. The rift is one or two
 * lanes the length of the whole cloud, drawn over everything, so it splits
 * the nebula in two — the Great Rift, not more dust. */

var CC = CC || {};

(function () {
  "use strict";

  var L = "luminosity";
  var FORM = "nebulaForm";
  var ANY = ["dense-region", "shell"];
  var CLOUD_ONLY = { param: FORM, is: ["cloud"], dflt: "cloud" };
  var NOT_REMNANT = { param: FORM, is: ["cloud", "planetary"], dflt: "cloud" };
  /* On a shell: in its ring, and lit from the middle. */
  var SHELL = { shell: { band: true, aim: "centre", front: false } };

  /* The grammar's own fields, fixed: the placer decides where. */
  function pocket(spec) {
    var base = {
      anchor: ANY, reach: "spanning", place: "pocket",
      depth: [0.5, 0.5], arc: [0, 360], repeat: [1, 1], spacing: "random",
      jitter: 1, mirror: false, offset: [0, 360],
      /* Drawn past the body's clip: a field near the rim trails out of the
       * cloud rather than being cut flat (gen/diffuse-pockets.js). */
      escapes: true,
      requires: ["diffuse"], excludes: []
    };
    for (var k in spec) base[k] = spec[k];
    return base;
  }

  /* ---- structure ---------------------------------------------------------- */

  var DARK_RIFT = pocket({
    id: "dark-lanes", label: "Dark Rift",
    when: NOT_REMNANT,
    element: "lane", tiers: 1, named: true,
    size: [1.30, 1.80], alpha: [0.9, 1.0], tone: "darker", girth: 0.085,
    density: { min: 1, max: 2 },
    within: [0, 0.22], seek: 1, aim: "random", pockets: [1, 2], pocketSize: [0.05, 0.08],
    /* Clipped, unlike every other trait here: a lane the length of the
     * cloud reaches past it, and unclipped it would blot the stars. */
    escapes: false,
    under: true,
    tags: ["structure"]
  });

  /* THE PILLARS OF CREATION — a row of columns standing on a bank of dense
   * gas where thinner gas lies toward the light (`front`), heads toward it.
   * On a shell, the same mark in the ring pointing at the dead star: the
   * Helix's cometary knots, a remnant's fingers. */
  var PILLARS = pocket({
    id: "pillars", label: "Pillars",
    element: "pillar", tiers: 2, named: true,
    size: [0.44, 0.58], alpha: [0.85, 1.0], tone: "lighter",
    density: { min: 2, max: 4 },
    formation: "row", aim: "light", front: true, seek: 1.5,
    within: [0.12, 0.62], pockets: [1, 2], perPocket: [1, 4], pocketSize: [0.10, 0.14],
    /* Off the middle: on a shell the dead star is there, and a knot aimed
     * at it overshot and lay across it. */
    tip: 1.15, clearCore: 0.06,
    byAnchor: { shell: { band: true, aim: "centre", front: false,
                         formation: "scatter", pockets: [3, 5], perPocket: [1, 2],
                         clearCore: 0.14 } },
    tags: ["structure"]
  });

  var BOW_SHOCKS = pocket({
    id: "bow-shocks", label: "Bow Shocks",
    element: "bow-shock", tiers: 1, named: true,
    size: [0.2, 0.2], alpha: [0.75, 0.95], tone: "lighter",
    density: { min: 1, max: 4 }, spread: [0.4, 1.4],
    formation: "centre", aim: "random", seek: 0.6,
    within: [0.1, 0.75], pocketSize: [0.20, 0.30],
    byAnchor: SHELL,
    tags: ["structure"]
  });

  /* A CAVITY BLOWN BY A STAR'S WIND, with the star in it. Its inside blocks
   * the glow of an emission nebula and lets the backlight through a dark
   * one (`dial`). Sunk under the other traits: it is the ground they sit on,
   * and a hidden station nests in it. */
  var CAVITY = pocket({
    id: "cavity", label: "Wind-blown Cavity",
    when: CLOUD_ONLY,
    element: "bubble", tiers: 1, named: true,
    size: [0.2, 0.2], alpha: [0.8, 0.95], tone: "lighter",
    density: { min: 1, max: 2 }, spread: [0.5, 1.4],
    formation: "centre", seek: 1, within: [0.08, 0.5],
    pocketSize: [0.17, 0.25],
    extras: [{ kind: "protostar", size: 0.42, alpha: 1, tone: "glow", spikes: 0.7 }],
    dial: { param: L,
            absorb: [[0, 0], [0.3, 0.35], [0.6, 0.8], [1, 0.85]],
            emit: [[0, 0.42], [0.3, 0.22], [0.55, 0]] },
    under: true,
    tags: ["structure"]
  });

  var FILAMENT_WEB = pocket({
    id: "filament-web", label: "Filament Web",
    element: "web", tiers: 1, named: true,
    size: [0.13, 0.46], alpha: [0.55, 0.8], tone: "lighter", blend: "screen",
    density: { min: 1, max: 3 },
    seek: 0.8, within: [0.1, 0.7], pockets: [1, 4], perPocket: [1, 2],
    pocketSize: [0.03, 0.12], eachSize: true,
    byAnchor: SHELL,
    tags: ["structure"]
  });

  /* ---- contents ----------------------------------------------------------- */

  /* A NURSERY: a tight knot of young stars in the thickest gas, sharing one
   * glow. The layers' own protostars are scattered singly, and only above
   * the middle of Luminosity source; a cluster is a place, and it lights its
   * own gas whatever the rest of the cloud is doing. */
  var PROTOSTAR_CLUSTER = pocket({
    id: "protostar-cluster", label: "Protostar Cluster",
    when: CLOUD_ONLY,
    element: "protostar", tiers: 3,
    size: [0.06, 0.12], alpha: [0.9, 1.0], tone: "glow",
    density: { min: 10, max: 22 },
    seek: 2.2, within: [0, 0.5], pockets: [1, 2], perPocket: [8, 22],
    pocketSize: [0.08, 0.11],
    extras: [{ kind: "puff", size: 2.4, alpha: [0.40, 0.55], tone: "glow",
               blend: "screen", under: true }],
    tags: ["contents"]
  });

  /* ONE GREAT STAR, lighting the cloud round it. */
  var EMBEDDED_STAR = pocket({
    id: "embedded-star", label: "Embedded Star",
    when: CLOUD_ONLY,
    element: "protostar", tiers: 1, named: true,
    size: [0.30, 0.38], alpha: [1, 1], tone: "glow",
    density: { min: 1, max: 1 },
    seek: 1.5, within: [0, 0.45], pockets: [1, 1], pocketSize: [0.025, 0.03],
    extras: [{ kind: "puff", size: 8.5, alpha: [0.32, 0.42], tone: "glow",
               blend: "screen", under: true }],
    tags: ["contents"]
  });

  /* THE MATERIAL POCKETS — "explorable terrain", each a different look (the
   * spec's table): debris mixed and wide, ice glinting crystal in streams,
   * rock dark and matte in streams, metal hard bright flecks in dense knots,
   * exotic gas a vivid off-hue blob. */
  var DEBRIS_FIELDS = pocket({
    id: "debris-fields", label: "Debris Fields",
    element: "chunk", tiers: 4,
    size: [0.04, 0.07], alpha: [0.85, 1.0], tone: "shift",
    density: { min: 40, max: 90 },
    seek: 0.3, within: [0.1, 0.8], pockets: [1, 5], perPocket: [12, 70],
    pocketSize: [0.08, 0.22], eachSize: true, loose: 0.3,
    stretch: [1, 1.5],
    byAnchor: SHELL,
    tags: ["contents"]
  });

  function belt(id, label, element, size, perPocket, extra) {
    var t = pocket({
      id: id, label: label, element: element, tiers: 2,
      size: size, alpha: [0.85, 1.0], tone: "lighter",
      density: { min: perPocket[0], max: perPocket[1] },
      seek: 0.9, within: [0.1, 0.75], pockets: [1, 4], perPocket: perPocket,
      pocketSize: [0.07, 0.15], eachSize: true,
      stretch: [3, 4.5], round: 0.3,
      byAnchor: SHELL,
      tags: ["contents"]
    });
    for (var k in (extra || {})) t[k] = extra[k];
    return t;
  }
  /* Rounded lumps of ice, not a falling diamond's long crystals
   * (`elongate`), and a cold haze along each belt — ice leaking its chill
   * into the gas round it. */
  var ICE_BELTS = belt("ice-belts", "Ice Belts", "shard", [0.025, 0.04], [6, 80],
                       { pockets: [1, 5], elongate: 0.3, alpha: [0.8, 0.8],
                         extras: [{ kind: "frost", size: 1.5, alpha: [0.72, 0.85],
                                    tone: "lighter", blend: "screen", under: true }] });
  var ROCK_BELTS = belt("rock-belts", "Rock Belts", "chunk", [0.08, 0.12], [10, 60]);
  /* Knots, some tight and some loose: the field's size is rolled per field
   * over a wide range, so one is a hard bright clump and the next a haze. */
  var METAL_BELTS = belt("metal-belts", "Metal Belts", "glint", [0.032, 0.05], [20, 90],
                         { pockets: [1, 5], pocketSize: [0.035, 0.14], stretch: [1.2, 2.6] });

  var EXOTIC_GAS = pocket({
    id: "exotic-gas-pockets", label: "Exotic Gas Pockets",
    element: "gas-pocket", tiers: 3,
    size: [0.08, 0.27], alpha: [0.35, 0.66], tone: "lighter",
    density: { min: 8, max: 18 },
    seek: 0.8, within: [0.1, 0.75], pockets: [3, 12], perPocket: [2, 9],
    pocketSize: [0.08, 0.24], eachSize: true, stretch: [1, 1.8],
    hueShift: [100, 170],
    byAnchor: SHELL,
    tags: ["contents"]
  });

  /* ---- artificial --------------------------------------------------------- */

  /* HIDDEN: in the thickest gas, or — the spec's most evocative picture — in
   * a wind-blown cavity, when there is one (`nest`). Modules aligned on one
   * heading, which is what reads as built. */
  var HIDDEN_STATION = pocket({
    id: "hidden-station", label: "Hidden Stations",
    element: "plate", tiers: 2, named: true, aspect: [0.40, 0.85],
    size: [0.05, 0.07], alpha: [0.9, 1.0], tone: "lighter",
    density: { min: 4, max: 8 },
    seek: 2, within: [0.1, 0.6], pockets: [1, 3], perPocket: [4, 8],
    pocketSize: [0.04, 0.05], huddle: 0.5,
    aim: "heading", nest: ["cavity"], nestAt: 0.5,
    byAnchor: { shell: { band: true } },
    tags: ["artificial"]
  });

  /* Working a pocket of material — beside one if the nebula has any. In
   * file on one heading: ships under way. */
  var MINING_FLOTILLA = pocket({
    id: "mining-flotilla", label: "Mining Flotillas",
    element: "capsule", tiers: 1, named: true, aspect: [0.34, 0.44],
    size: [0.032, 0.04], alpha: [0.9, 1.0], tone: "lighter",
    density: { min: 5, max: 9 },
    seek: 0.5, within: [0.15, 0.7], pockets: [1, 4], perPocket: [1, 7],
    pocketSize: [0.035, 0.045], huddle: 0.3,
    /* Each fleet in its own faction colour — bright, flat, primary, the
     * way army colours are — so a working fleet never reads as a derelict's
     * dead grey. [hue, saturation, value]. */
    paint: [[0, 0.85, 0.92], [26, 0.9, 1], [50, 0.88, 1], [118, 0.75, 0.82],
            [212, 0.82, 0.98], [248, 0.66, 0.88], [282, 0.62, 0.92],
            [0, 0, 0.98], [174, 0.8, 0.85], [328, 0.55, 1], [66, 0.7, 0.7],
            [224, 0.85, 0.62]],
    formation: "line", aim: "heading",
    nest: ["metal-belts", "ice-belts", "rock-belts", "debris-fields",
           "exotic-gas-pockets"], nestAt: 1.25,
    byAnchor: { shell: { band: true } },
    tags: ["artificial"]
  });

  /* DEAD HULLS, TUMBLING: every heading different, no power, no paint. */
  var DERELICT_FLEET = pocket({
    id: "derelict-fleet", label: "Derelict Fleets",
    element: "capsule", tiers: 2, named: true, aspect: [0.26, 0.40],
    size: [0.05, 0.068], alpha: [0.85, 1.0], tone: "lighter",
    density: { min: 4, max: 8 },
    seek: 0, within: [0.15, 0.75], pockets: [1, 5], perPocket: [3, 7],
    pocketSize: [0.09, 0.15], eachSize: true, apart: 2.4, huddle: 0.35,
    aim: "random", dim: 0.6,
    byAnchor: { shell: { band: true } },
    tags: ["artificial"]
  });

  CC.Traits.register([
    DARK_RIFT, PILLARS, BOW_SHOCKS, CAVITY, FILAMENT_WEB,
    PROTOSTAR_CLUSTER, EMBEDDED_STAR,
    DEBRIS_FIELDS, ICE_BELTS, ROCK_BELTS, METAL_BELTS, EXOTIC_GAS,
    HIDDEN_STATION, MINING_FLOTILLA, DERELICT_FLEET
  ]);
})();
