/* Compact objects — `neutron-star` and `pulsar`.
 *
 * See docs/celestials/compact-objects.md for the spec and
 * js/data/archetypes/registry.js for what every field means.
 *
 * THE STORY IS EXTREMITY. A city-sized ball with more mass than the Sun, so
 * every band is matter in a state that exists nowhere else, and the cutaway's
 * job is to make each of those states a different KIND of mark — see
 * js/data/elements/compact.js.
 *
 * PERFECT CIRCLES EVERYWHERE. Gravity this strong flattens the surface to
 * millimetres, and that geometric perfection against the family's near-white
 * palette is what makes the body read as CLINICAL — the spec's word, and the
 * contrast with every organic edge elsewhere in the generator.
 *
 * ONE STACK, TWO ARCHETYPES. A pulsar is a neutron star whose magnetic axis
 * is tilted, so the stack below is built by one function and the pulsar adds
 * only what is genuinely its own: the tilt as a control, the twin beams, and
 * the light cylinder.
 *
 * ---- THE CONTROLS: THREE RELABELS AND ONE NEW SLIDER ---------------------
 *
 * PARAMETERS.md lists Field strength, Surface heat, Spin rate and Beam tilt.
 * Three of them are an existing quantity under a fitting name, so they are
 * `dials` (the asteroid's Radioactivity is the precedent) rather than more
 * sliders that would sit inert on every other body:
 *
 *   Star activity -> FIELD STRENGTH. On a star this control is already the
 *     MAGNETIC violence axis — spots, prominences and flares are all field
 *     phenomena. Here it drives the magnetosphere's reach, its loop count and
 *     twist, the particle glints, and the beams' strength.
 *   Interior heat -> SURFACE HEAT. The body's own heat; a neutron star has no
 *     other. Its low end is the spec's `cooling-crust`.
 *   Axial tilt -> BEAM TILT (pulsar). An angle between two axes is an angle
 *     between two axes: 0-100% maps to the spec's 15-60 degrees.
 *
 * SPIN RATE is genuinely new — nothing in the generator spins at a rate that
 * shows — so it is its own control, wired like Caverns. It sets the vortex
 * density in the superfluid on both bodies, and on the pulsar the beam width
 * and the light cylinder's radius.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  /* Every layer self-luminous, as on a star: nothing here is lit from
   * outside, and the reflective palette rules must not apply. */
  function lit(spec) { spec.incandescent = true; return spec; }

  /* THE STACK, PRINTED AND MEASURED (D118/D163) — `frac` is each layer's
   * OUTER edge, so the spec's ranges were re-cut to the thicknesses they were
   * meant to express. Printed with test/_tmp/_vstack.mjs. */
  function stack(fieldReach) {
    return [
      {
        /* THE FIELD — an outward halo whose reach IS Field strength. A
         * magnetar is the top of this range, not a trait (the spec's call). */
        role: "magnetosphere",
        frac: { over: "surface", depth: fieldReach, param: "starActivity" },
        boundary: "soft-gradient",
        outward: true,
        /* High, so the falloff does not swallow the outer loops: a field
         * line takes the alpha of its outermost point, and at a low hold
         * every wide loop vanished whole. The fill stays faint because the
         * halo is dark (below), not because it fades early. */
        fadeHold: 0.50,
        /* More loops, and more particles in them, as the field strengthens. */
        elementScale: {
          "dipole-loop": { by: "starActivity", count: [0.55, 1.45] },
          speckle: { by: "starActivity", count: [0.45, 1.6] }
        }
      },
      {
        /* A HAIRLINE. Centimetres deep on the real thing; here a few pixels
         * of the brightest edge in the picture, and the card says how thin
         * it really is. Authored AT the surface so nothing above it can be
         * renormalized away. */
        role: "plasma-skin",
        frac: [1.000, 1.000],
        boundary: "perfect"
      },
      {
        role: "iron-lattice",
        frac: [0.978, 0.984],
        boundary: "perfect"
      },
      {
        role: "nuclear-pasta",
        frac: [0.900, 0.930],
        boundary: "perfect"
      },
      {
        role: "superfluid",
        frac: [0.740, 0.820],
        boundary: "perfect"
      },
      {
        /* Guaranteed at Optional layers 50% and up, the spec's figure. */
        role: "quark-core",
        frac: [0.180, 0.340],
        boundary: "perfect",
        presence: 2.0,
        bias: "coreBias"
      }
    ];
  }

  /* THE COLOURS — the family rule: LOW SATURATION, VERY HIGH BRIGHTNESS, a
   * faint hue wash. "So hot the colour barely matters."
   *
   * ONE DEPARTURE FROM THE SPEC'S TABLE, for legibility: the superfluid is
   * held a step DIMMER than the crust and the core either side of it. Every
   * band near-white is the spec's letter; four near-white bands in a row is a
   * white disc, and the palette's separation pass would darken the core to
   * pull them apart — the one band that must stay white-hot. A dimmer fluid
   * between a bright crust and a blazing core keeps the order the spec wants
   * (the core is the hottest thing) and gives the vortex lines something to
   * be bright against. */
  function colours() {
    return {
      hue: [0, 360],
      secondaryRel: "analogous",
      order: ["magnetosphere", "plasma-skin", "iron-lattice", "nuclear-pasta",
              "superfluid", "quark-core"],
      layers: {
        /* DARK, so the screened halo is a faint wash and the loops in it are
         * the content. At the spec's 0.40-0.70 the halo was a fog that hid
         * the very field it is there to carry. */
        magnetosphere:   lit({ sat: [0.28, 0.50], val: [0.17, 0.28] }),
        "plasma-skin":   lit({ sat: [0.02, 0.10], val: [0.97, 1.00] }),
        /* SURFACE HEAT IS THE CRUST'S LIGHTNESS. `heatValue` scales value
         * with Interior heat independently of depth: the depth-weighted
         * heat rule moves a crust this shallow by a tenth, and the spec's
         * cooling crust is a whole step dimmer. */
        "iron-lattice":  lit({ sat: [0.03, 0.11], val: [0.82, 0.94],
                               heatValue: [0.70, 1.0] }),
        "nuclear-pasta": lit({ sat: [0.05, 0.15], val: [0.68, 0.79],
                               heatValue: [0.80, 1.0] }),
        superfluid:      lit({ sat: [0.12, 0.25], val: [0.62, 0.74] }),
        "quark-core":    lit({ sat: [0.05, 0.16], val: [0.94, 1.00],
                               glowCentre: true })
      }
    };
  }

  /* Surface heat and Field strength: the shared relabels. */
  var DIALS = {
    "star-activity": {
      label: "Field strength",
      title: "How strong the magnetic field is. Low is an ordinary neutron star with a modest, calm field; high is a magnetar - a vast, wound-up magnetosphere full of trapped particles. Drives how far the field reaches, how many field lines show and how twisted they are. On stars this is Star activity."
    },
    "interior-heat": {
      label: "Surface heat",
      title: "How hot the crust still is. The top is a newborn neutron star at millions of degrees; the bottom is an old cooling crust, visibly dimmer. Drives the crust's brightness and the temperature on the card. On planets this is Interior heat."
    }
  };

  var NEUTRON_STAR = {
    id: "neutron-star",
    label: "Neutron star",
    family: "compact",
    /* NOT `stellar`: every stellar trait (prominences, spots, flares) is a
     * statement about a convecting plasma envelope, and this body has none.
     * Not `orbit-safe` either. */
    tags: ["compact", "stellar-remnant", "luminous", "magnetic"],
    statTemplate: "compact",
    radiusKm: [10, 13],
    /* DRAWN SMALLER IN ITS OWN FRAME (see `frame` in gen/structure.js). At
     * the app's default size the body filled the frame and its field — the
     * one thing only this family shows — appeared in the corners only. */
    frame: 0.72,
    stack: stack([0.55, 1.45]),
    /* A small, rolled misalignment: real neutron stars' fields are not
     * perfectly aligned, and dead-straight loops look drawn with a ruler. */
    poles: {
      tilt: { deg: [0, 9] },
      twist: { param: "starActivity", range: [0.0, 0.85] },
      spin: "spinRate",
      field: "starActivity"
    },
    /* A compact, fierce glow — less reach than a star's, as bright. */
    emissiveGlow: {
      reach: 1.40,
      strength: 0.70,
      veins: { count: 60, length: [0.10, 0.36], alpha: 0.22, lean: 0.10 }
    },
    dials: DIALS,
    /* No latitude, not lit by another star, its own furnace — the stellar
     * declaration, because it is the same situation (D50). */
    climate: { latitude: 0, starlit: false, selfHeated: 0.86 },
    colorProfile: colours()
  };

  /* THE PULSAR — the same stack, a tilted axis, and the beams. */
  var PULSAR = {
    id: "pulsar",
    label: "Pulsar",
    family: "compact",
    tags: ["compact", "stellar-remnant", "luminous", "magnetic", "beamed"],
    statTemplate: "compact",
    radiusKm: [10, 13],
    /* Smaller still than the neutron star's: the beams are the archetype. */
    frame: 0.66,
    stack: stack([0.70, 1.70]),
    poles: {
      /* THE ARCHETYPE'S SIGNATURE, directly dialable — Axial tilt relabelled. */
      tilt: { param: "axialTilt", deg: [15, 60] },
      twist: { param: "starActivity", range: [0.10, 0.95] },
      spin: "spinRate",
      field: "starActivity",
      /* Where co-rotation reaches light speed: further out the slower it
       * turns. Drawn only with the `light-cylinder` trait. */
      lightCylinder: { radius: [2.05, 1.32] }
    },
    /* THE BEAMS ARE THE ARCHETYPE. Wider at high spin (a millisecond
     * pulsar's beam is broad), brighter with the field. */
    beams: {
      halfWidth: { param: "spinRate", range: [5.5, 14] },
      length: 3.4,
      strength: { param: "starActivity", range: [0.72, 1.0] },
      streaks: [30, 80],
      glints: [50, 150]
    },
    emissiveGlow: {
      reach: 1.40,
      strength: 0.62,
      veins: { count: 50, length: [0.10, 0.34], alpha: 0.20, lean: 0.10 }
    },
    dials: {
      "star-activity": DIALS["star-activity"],
      "interior-heat": DIALS["interior-heat"],
      "axial-tilt": {
        label: "Beam tilt",
        title: "How far the magnetic axis - and so the beams - leans from the spin axis: 0% is 15 degrees, 100% is 60. The tilt is why a pulsar pulses: the beams sweep round as it spins. Pulsars only; on planets this is Axial tilt."
      }
    },
    climate: { latitude: 0, starlit: false, selfHeated: 0.86 },
    colorProfile: colours()
  };

  CC.Archetypes.register(NEUTRON_STAR);
  CC.Archetypes.register(PULSAR);
})();
