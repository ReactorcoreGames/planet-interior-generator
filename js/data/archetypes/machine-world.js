/* Machine world — a body that is artificial all the way down.
 *
 * See docs/MACHINE-WORLDS.md § "The machine-world archetype" for the spec and
 * js/data/archetypes/registry.js for what every field means.
 *
 * NOT A PLANET WITH BUILDINGS ON IT. A constructed object the size of a moon,
 * and the cutaway's job is to show that it was built: nested hollow shells
 * floating clear of each other round a solid heart, held apart by hundreds of
 * identical pillars, with access shafts cut down through them to the deeper
 * levels. (The inspiration is the arcade game Rayforce / Layer Section, where
 * Earth had been rebuilt as hollowed nested shells.)
 *
 * EVERY BOUNDARY IS A PERFECT CIRCLE. Built things do not wobble, and that
 * geometric perfection is half of what separates this body from a metal-
 * coloured planet. The other half is the voids.
 *
 * THE VOIDS ARE ORDINARY LAYER GEOMETRY. `gapBelow`, `pillars` and `shafted`
 * are general layer properties (js/gen/shells.js), as `shafts` is a general
 * archetype property; nothing in js/draw/ knows this body exists.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  /* THE STACK, PRINTED AND MEASURED (test/_tmp/_zstack.mjs). `frac` is each
   * layer's OUTER edge; each void is then raised out of the BOTTOM of the
   * layer above it, after renormalization, so a band's printed thickness is
   * what is left once its void is taken.
   *
   * Re-cut from the spec's ranges, which were written before the voids were
   * real: a hull 0.04 thick cannot give up a 0.045 void and still be a hull.
   * The solid heart is also exaggerated — computation and the reactor are
   * the payoff at the bottom of every shaft, and at the spec's 0.06-0.17 the
   * reactor was a dot. */
  var STACK = [
    {
      /* ORBITAL WEAPON PLATFORMS, as a faint shell of space round the hull
       * that the platforms (stage b) stand in. An outward layer: it is beyond
       * the surface, and the hull stays 1.0. */
      role: "defense-grid",
      frac: { over: "surface", depth: [0.10, 0.26] },
      boundary: "perfect",
      outward: true,
      opacity: 0.30,
      fadeHold: 0.70,
      lit: [0.13, 0.50],
      /* 60% at the default Optional layers, the spec's figure. */
      presence: 0.80
    },
    {
      /* ARMOURED SHELL. Authored AT the surface so nothing can renormalize
       * it away. */
      role: "outer-hull",
      frac: [1.000, 1.000],
      boundary: "perfect",
      lit: [0.10, 0.45],
      gapBelow: [0.026, 0.046],
      pillars: [80, 200],
      shafted: true
    },
    {
      /* Sensors, ports, radiators. */
      role: "surface-systems",
      frac: [0.900, 0.935],
      boundary: "perfect",
      lit: [0.14, 0.55],
      gapBelow: [0.026, 0.046],
      pillars: [80, 200],
      shafted: true
    },
    {
      /* Where anyone lives. 70% at the default Optional layers. */
      role: "habitation",
      frac: [0.740, 0.815],
      boundary: "perfect",
      /* Wakes LATE: lit means somebody is home (crewed), where the plant
       * below runs on its own from the bottom of the dial. */
      lit: [0.40, 0.95],
      presence: 0.93,
      gapBelow: [0.028, 0.050],
      pillars: [80, 200],
      shafted: true
    },
    {
      /* THE BULK — engines, fabrication. The last hollow shell.
       *
       * TWO PLACES, BY WHETHER THERE IS A HABITATION SHELL ABOVE IT. With
       * none, surface-systems would run down to 0.585 and stand 0.32 thick,
       * one plain band where the spec has two; so the machinery rises to
       * split the room instead (printed, test/_tmp/_zstack.mjs). */
      role: "machinery",
      frac: [0.680, 0.730],
      frac_when: { habitation: [0.585, 0.665] },
      boundary: "perfect",
      lit: [0.09, 0.38],
      gapBelow: [0.030, 0.055],
      pillars: [80, 200],
      shafted: true
    },
    {
      /* Processing core — solid, where the shafts end. 50% at the default
       * Optional layers. */
      role: "computation",
      frac: [0.300, 0.400],
      boundary: "perfect",
      lit: [0.10, 0.42],
      /* Runs bridging the lowest void, between its pillars, from the board
       * up into the machinery, and runs lying across the board's middle
       * (gen/conduits.js; both the user's, Session Z). Bold and long: at
       * the first width and reach they read as timid, the board's breadth
       * left empty above and below them (the user). */
      conduits: [
        { count: [12, 24], depth: [0.22, 0.60], bridge: [0.35, 0.70], scale: 1.8 },
        { count: [14, 26], depth: [0.06, 0.94], within: true, length: [0.45, 0.85], scale: 1.8, blend: "hard-light", opacity: 1.0 }
      ],
      /* Cans standing on the board among the runs (gen/capacitors.js; the
       * user's, Session Z). */
      capacitors: { count: [10, 30], size: [0.012, 0.022], depth: [0.03, 0.97], blend: "hard-light", opacity: 1.0 },
      presence: 0.67
    },
    {
      /* The reactor. Runs to the centre. Core size bias pushes it. Larger
       * when there is no computation core round it, for the same reason the
       * machinery moves: otherwise the machinery shell stands 0.44 thick. */
      role: "power-core",
      frac: [0.230, 0.290],
      frac_when: { computation: [0.110, 0.190] },
      boundary: "perfect",
      lit: [0.08, 0.32],
      /* Feeds into the reactor through its rim, down the gaps between the
       * window blocks, ending at their own depths in the chamber
       * (gen/conduits.js). Across every boundary they read as spam, and
       * over the blocks too much (the user, Session Z). */
      conduits: { count: [6, 18], depth: [0.42, 0.80] },
      bias: "coreBias"
    }
  ];

  /* THE COLOURS — metal, not pastel (Session Z stage b).
   *
   * Three things make it metallic, and saturation alone is the least of
   * them:
   *
   *   hue families   steel, gunmetal, bronze, violet steel — the hues metals
   *                  come in, not the whole wheel (js/gen/accent.js)
   *   low chroma     every built layer below 0.20 saturation, and none of
   *                  them heat-driven, so Interior heat cannot creep colour
   *                  back in (it becomes Operational status in stage c)
   *   sheen          the metal layers shade as polished bar — a specular
   *                  band and a lit rim (draw/sheen.js). The hull is cast, so
   *                  it takes none
   *
   * The colour then comes from the ACCENT: the lights, and the heart. The
   * power core takes the accent outright and the computation core most of
   * the way, so a grey-blue world burns amber at its centre. */
  function colours() {
    return {
      hue: [[198, 228, 0.45], [168, 198, 0.15], [24, 46, 0.25], [232, 262, 0.15]],
      secondaryRel: "analogous",
      /* Lights and active systems: a complement of the hull, ±30°
       * (js/gen/accent.js). Grey-blue with amber, gunmetal with cyan. */
      accent: { rel: [150, 210], sat: [0.70, 0.92], val: [0.92, 1.00] },
      order: ["defense-grid", "outer-hull", "surface-systems", "habitation",
              "machinery", "computation", "power-core"],
      layers: {
        "defense-grid":    { sat: [0.06, 0.20], val: [0.35, 0.55], heatDriven: false },
        "outer-hull":      { sat: [0.03, 0.10], val: [0.34, 0.48], heatDriven: false },
        "surface-systems": { sat: [0.06, 0.16], val: [0.44, 0.58], heatDriven: false },
        habitation:        { sat: [0.08, 0.20], val: [0.60, 0.76], heatDriven: false,
                             sheen: 1.0 },
        machinery:         { sat: [0.05, 0.14], val: [0.30, 0.44], heatDriven: false,
                             sheen: 0.35 },
        /* `heatValue`: Operational status is these two layers' lightness —
         * a derelict's heart is cold metal, a busy one burns (the neutron
         * star's Surface heat is the precedent; gen/palette-value.js). */
        computation:       { sat: [0.22, 0.42], val: [0.40, 0.56],
                             incandescent: true, accentHue: 0.85,
                             heatValue: [0.45, 1.0, 0.45] },
        "power-core":      { sat: [0.55, 0.85], val: [0.90, 1.00],
                             incandescent: true, glowCentre: true, accentHue: 1.0,
                             heatValue: [0.28, 1.0, 0.50] }
      }
    };
  }

  CC.Archetypes.register({
    id: "machine-world",
    label: "Machine world",
    family: "artificial",
    /* `artificial` and nothing natural: no natural trait may land here, and
     * not `orbit-safe` either until its own orbital traits exist. */
    tags: ["artificial", "machine"],
    statTemplate: "machine",
    radiusKm: [400, 3000],
    stack: STACK,
    /* 2-6 routes down through every shafted shell. Half-width in body
     * radius, so a shaft is the same width at every depth. */
    shafts: { count: [2, 6], width: [0.018, 0.032] },
    /* OPERATIONAL STATUS (D249): Interior heat, relabelled — already the
     * "how alive is the inside" quantity. Each layer's `lit` says when it
     * wakes: the plant and the reactor early (automated), habitation late
     * (crewed). See js/gen/activity.js. */
    activity: { param: "interiorHeat" },
    /* HULL INTEGRITY (D249): Cohesion, relabelled — on the asteroid it is
     * already "how solidly the body holds together". As it falls a wedge is
     * torn out of the outer layers, deeper and wider: a hull breach by 85%,
     * two or three shells by 60%, into the machinery at the default 45%,
     * down to the reactor's rim at 0 (js/gen/rupture.js). */
    rupture: { param: "cohesion", start: 0.92, depth: [0.04, 0.74], width: [0.08, 0.62],
               /* 1-5 wounds, the first the main one (the user, Session Z). */
               count: [1, 5],
               /* Torn faces (js/gen/woundedge.js); severed pipe shows only
                * where there is pipework, or it reads as spam (D262). */
               edge: "torn", pipes: ["machinery", "computation", "power-core"] },
    dials: {
      cohesion: {
        label: "Hull integrity",
        title: "How much of the machine world's structure is intact. At 100% the hull is unbroken; as it falls one to five wounds are torn out of the outer layers, deeper and wider, exposing the hollow shells inside - at 0% it reaches the reactor. Machine worlds only; on asteroids this is Cohesion."
      },
      "interior-heat": {
        label: "Operational status",
        title: "How alive the machine world is. At 0% it is fully offline, not a light anywhere. Just above, it is derelict: the reactor cold, a few red emergency lights that hand over to normal lighting by about 10%. Around a third it runs automated - the reactor and machinery lit, nobody home. Higher up the habitation levels light up as it fills with crew, and past the middle every level grows busier, toward a swarming hive at 100%. Machine worlds only; on planets this is Interior heat."
      }
    },
    /* A DECLARED OVERRIDE, not a quiet special case (phase-9-10.md): a
     * machine world's temperature is its builders' choice, so it takes no
     * latitude and no warmth from its star. */
    climate: { latitude: 0, starlit: false },
    colorProfile: colours()
  });
})();
