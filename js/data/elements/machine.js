/* Machine world — detail recipes for the roles of a built body.
 *
 * Every role is new: nothing natural shares them, which is the honest signal
 * that the machine world is not a planet painted grey.
 *
 * THE MATERIAL FIRST. Each layer opens with one `texture` element naming
 * what it is made of — the machine world's equivalent of a rock's grain
 * (gen/materials.js, draw/primitives/materials.js):
 *
 *   metal       brushed plate: fine streaks running round the band
 *   sleek       polished plate: almost no tooth, a few long faint streaks
 *   concrete    poured and cast: coherent mottle, a dense tooth, pour pits
 *   rough       weathered cast armour: the same, with one coarse blotched
 *               mottle and scoring
 *   industrial  heavy plate gone grimy: short streaks over strong mottle
 *   plant       concrete and plate with pipe bundles running radially
 *               through it, elbowing between runs
 *   circuit     a board: traces on a polar grid, jogging between tracks,
 *               ending in vias
 *
 * THE ORDER IS THE USER'S (Session Z): rough cast armour outermost, then
 * brushed plate, then the sleek metal where people live — the comfortable
 * middle of the stack — then plant, then the board at the heart.
 *
 * `count` is the number of marks (streaks, pits, traces; a plant's pipes are
 * a share of it); Texture strength scales it and the tile's strength
 * together, as it does every texture.
 *
 * See js/data/elements/registry.js for what every field means. The registry
 * must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  CC.Elements.register({

    /* ORBITAL WEAPON PLATFORMS — one design per body, every instance on one
     * orbit at an even interval: a built constellation. Two tiers
     * interleaved, a large station every few slots with smaller ones
     * between. `size` is a platform's half-span. */
    "defense-grid": {
      elements: [
        { kind: "glyph", glyph: "platform", count: [12, 40], tiers: 2,
          spacing: "even", jitter: 0.02, depth: [0.44, 0.46],
          size: [0.12, 0.12], alpha: [1, 1] }
      ]
    },

    /* ARMOURED SHELL — rough cast armour: the outermost layer takes the
     * hits, so it is mass, poured thick and weathered. */
    "outer-hull": {
      elements: [
        { kind: "texture", material: "rough", count: [300, 900],
          alpha: [0.95, 0.95], texture: true, tone: "shift" },
        /* Panel seams in a brick bond, re-plated panels, running lights
         * at the outer joints. `count` is panels. */
        { kind: "cellgrid", grid: "seams", count: [120, 360],
          alpha: [0.90, 0.90], tone: "accent" },
        /* ON THE OUTER FACE, OPEN TO SPACE (the user, Session Z: in the
         * surface-systems band they opened into a void nothing could reach).
         * `seat` draws them on the body's outline, unclipped
         * (gen/details.js). Docking ports first, evenly spaced, cut down
         * into the armour; `size` is a port's depth as a share of the
         * hull (sizeRel, before the tier's scale). */
        { kind: "fixture", fixture: "dock", count: [8, 18], tiers: 2,
          spacing: "even", jitter: 0.02, sizeRel: true, size: [2.4, 2.4],
          seat: 0.5, claim: true, alpha: [0.95, 0.95] },
        /* Sensor arrays standing out from the face, between the docks,
         * scattered: they go where they are needed. `size` is a mast's
         * height in body radius. */
        { kind: "fixture", fixture: "sensor", count: [30, 70], tiers: 2,
          size: [0.17, 0.17], seat: 0.5, yield: true, alpha: [0.95, 0.95] }
      ]
    },

    /* SENSORS, PORTS, RADIATORS — brushed plate. Tried as scored heavy
     * plate with a sheen; the user preferred the brushed look back. */
    "surface-systems": {
      elements: [
        { kind: "texture", material: "metal", count: [220, 600],
          alpha: [0.70, 0.70], texture: true, tone: "lighter" },
        /* RADIATOR BANKS (gen/fixtures.js): one design per body, evenly
         * spaced, a row standing on the band's floor and a row hung from
         * its ceiling, roots warm at each face, so the band reads as a
         * radiator hall. Tried along the top alone first (the user, Session
         * Z): it looked odd. `size` is a bank's height as a share of the
         * band (sizeRel, before the tier's own scale). */
        { kind: "fixture", fixture: "fins", count: [70, 160], tiers: 2,
          spacing: "even", jitter: 0.04, sizeRel: true, size: [1.40, 1.40],
          depth: [0.05, 0.95], alpha: [0.90, 0.90] },
        { kind: "fixture", fixture: "fins", count: [70, 160], tiers: 2,
          spacing: "even", jitter: 0.04, sizeRel: true, size: [1.40, 1.40],
          depth: [0.05, 0.95], hang: true, alpha: [0.90, 0.90] }
      ]
    },

    /* WHERE ANYONE LIVES — the sleek metal. */
    habitation: {
      elements: [
        { kind: "texture", material: "sleek", count: [60, 160],
          alpha: [0.85, 0.85], texture: true, tone: "lighter" },
        /* A quiet honeycomb of plate. `count` is cells. Window grids were
         * tried here first and read out of place (the user, Session Z);
         * they light the power core instead. */
        { kind: "cellgrid", grid: "hex", count: [900, 2400],
          alpha: [0.90, 0.90] }
      ]
    },

    /* THE BULK — plant: concrete, plate and pipework running down through
     * it, the circuit board's heavy cousin. */
    machinery: {
      elements: [
        { kind: "texture", material: "plant", count: [240, 700],
          alpha: [0.90, 0.90], texture: true, tone: "lighter", claim: true },
        /* Chips set among the pipework: technology embedded in the plant
         * (the user, Session Z). `count` is cells. */
        { kind: "cellgrid", grid: "lattice", count: [200, 600],
          alpha: [0.85, 0.85], tone: "accent", claim: true },
        /* THE EQUIPMENT, among the pipes and chips rather than over them:
         * the pipe bundles and chips above claim their footprints, and
         * every unit here yields to those and to each other
         * (gen/claims.js), re-rolling its place until it fits. Largest
         * first, so the small gears fill what is left. `size` is in body
         * radius, before the tier's scale: a rotor's and a gear's radius,
         * a truss's long side. Turbine rotors; */
        { kind: "fixture", fixture: "rotor", count: [4, 10], tiers: 2,
          size: [0.150, 0.150], depth: [0.08, 0.92], alpha: [0.90, 0.90],
          claim: true, yield: true },
        /* gear trains in three sizes, before the trusses so a large train
         * finds room; */
        { kind: "fixture", fixture: "gear", count: [50, 130], tiers: 3,
          size: [0.056, 0.056], depth: [0.05, 0.95], alpha: [0.90, 0.90],
          claim: true, yield: true },
        /* and lattice frames, girders along the band and towers across it,
         * narrow enough to fill what is left. */
        { kind: "fixture", fixture: "truss", count: [40, 110], tiers: 2,
          size: [0.300, 0.300], depth: [0.05, 0.95], alpha: [0.90, 0.90],
          claim: true, yield: true }
      ]
    },

    /* THE PROCESSING CORE — a circuit board. */
    computation: {
      elements: [
        { kind: "texture", material: "circuit", count: [140, 420],
          alpha: [0.80, 0.80], texture: true, tone: "lighter" },
        /* DATA-FLOW PULSES riding the traces above (gen/pulses.js): long
         * comets, short blips and packet trains, smallest the most. `count`
         * is pulses. Must follow the circuit texture, which notes its
         * traces for them. */
        { kind: "pulse", count: [120, 360], tiers: 3, alpha: [0.90, 0.90] }
      ]
    },

    /* THE REACTOR — a lit chamber: window grids in sectors round it, held
     * clear of the very centre (the user moved them here from habitation,
     * Session Z: they make the core read as a techy reactor chamber).
     * `count` is lit windows. */
    "power-core": {
      elements: [
        { kind: "cellgrid", grid: "windows", count: [300, 1000],
          depth: [0.34, 0.96], alpha: [0.95, 0.95], tone: "accent",
          claim: true },
        /* CONTAINMENT, FRAMING THE CHAMBER (gen/containment.js): a ring
         * just outside the window grid, one just inside it, the rest
         * nested round the bare heart. The grid above notes its edges and
         * claims its blocks; */
        { kind: "rings", count: [4, 8], alpha: [0.95, 0.95], claim: true },
        /* and glow stipple in the open plate only, yielding to the blocks
         * and the rings, densest round the heart. `count` is dots. */
        { kind: "stipple", count: [500, 1200], tiers: 3, texture: true,
          yield: true, alpha: [0.90, 0.90] }
      ]
    }
  });
})();
