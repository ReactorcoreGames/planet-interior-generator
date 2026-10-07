/* Asteroid — the third solid body, and the one the cutaway format was made
 * for.
 *
 * A chaotic amalgam of rock, metal and void. A thin hardened shell around an
 * interior that is most of the radius, and that interior is a Voronoi mosaic
 * of welded fragments rather than the neat concentric shells every other body
 * in the project has.
 *
 * The registry must load before this file.
 *
 * ---- THE STACK, AND WHY ITS FIGURES ARE WHAT THEY ARE (D175/D176) ---------
 *
 * Measured, not reasoned about — test/_tmp/_asteroidstack.mjs printed the
 * built stack and every one of these was invisible until it did:
 *
 *   - `interior` MUST author a `frac`. Omitted ("take what's left"), pass 1c
 *     of gen/structure.js resolves it to the layer above's OUTER edge, the
 *     shell comes out 0.000 thick and is dropped. 0.862-0.905 is where the
 *     mosaic STARTS; "runs to the centre" is its other end, free.
 *   - `outer-shell` is authored AT the surface, so nothing above it can be
 *     renormalized away.
 *   - 0.862-0.905 rather than the spec's 0.88-0.92 keeps the shell's worst
 *     case at 0.0615 of the radius across 480 bodies (D5's legible band).
 *
 * ---- THE SILHOUETTE (ASTEROID-OVERHAUL §1) --------------------------------
 *
 * The outline is made by THREE kinds of statement, and Session T had only the
 * last two:
 *
 *   form      elongation, taper and an eccentric centre — the low-order shape
 *             that says "broken off something" (js/gen/form.js). This is what
 *             finally stops it reading as a circle.
 *   boundary  how far, how angular, how many lobes — the fracture faces on
 *             that shape (`heavy`, `boundaryFacet`, `boundaryFreq`).
 *   relief    cosmetic surface marks — slump, rubble and craters — on the
 *             faces. Kept low: terrain is the wrong tool for the outline.
 *
 * The dust film that used to sit over the shell is gone (§3): it read badly
 * on the render, and it was what threw detached lobes when the outline grew.
 * Without it the outline is free to be as irregular as it wants. */

var CC = CC || {};

(function () {
  "use strict";

  var ASTEROID = {
    id: "asteroid",
    label: "Asteroid",
    family: "solid",
    /* `airless` and the two solid tags. NOT `orbit-safe`: an asteroid IS the
     * debris, and a ring around a rubble pile is not a picture anyone needs.
     *
     * `fragmented` is what the asteroid's own traits key off. Declared as a
     * tag rather than checked by id, so a future comet or a shattered moon can
     * carry it and inherit the same traits. */
    tags: ["solid-surface", "solid-interior", "airless", "fragmented"],
    /* ITS OWN STAT TEMPLATE — see js/gen/stats/asteroid.js. The solid one asks
     * surface questions that are all answered "no" here. */
    statTemplate: "asteroid",

    /* 1-500 km, from the spec — three orders of magnitude below the planet's
     * floor and the widest range in the project. */
    radiusKm: [1, 500],

    /* THE FORM — the shape the whole body is warped into (js/gen/form.js).
     *
     * A fragment is not equant: it is longer one way, fatter at one end, and
     * its mass is not centred on the point the cutaway radiates from. Those
     * are the three statements fBm around a circle cannot make, which is why
     * Session T's amplitude, faceting and frequency all left it round.
     *
     * Each is a [lo, hi] roll per body, scaled by Boundary irregularity so the
     * control still means "how ragged". Elongation stops at 1.75: past that it
     * stops being a fragment and starts being a cigar. The offset is kept well
     * inside the shape so the warp stays single-valued about the centre. */
    form: {
      elongation: [1.12, 1.75],
      taper: [0.05, 0.30],
      offset: [0.03, 0.10],
      lobe: [0.0, 0.16]
    },

    /* CAVES (ASTEROID-OVERHAUL §7) — tunnels and chambers cut through the
     * mosaic, one system driven by the Caverns slider: natural caves through
     * the low and middle range, constant-width bores and regular chambers
     * added at the top. See js/gen/caves.js.
     *
     * COHESION CAPS IT. A rubble pile cannot hold a cavern open: nothing at
     * all below `from`, the full amount from `full` up. */
    caves: {
      layer: "interior",
      param: "caverns",
      cap: { param: "cohesion", from: 0.06, full: 0.62 }
    },

    stack: [
      {
        /* THE HARDENED CRUST, AND IT IS THE SURFACE.
         *
         * `heavy` x1.5, faceted and high-frequency: the fracture faces on the
         * form. Amplitude was never the axis (D179) — at `extreme` it still
         * read round — and with the form doing the large-scale work, this only
         * has to make the faces. */
        role: "outer-shell",
        frac: [0.960, 1.000],
        boundary: "heavy",
        /* Between two table entries; see `wobbleScale` in gen/structure.js. */
        wobbleScale: 1.5,
        /* Flat faces meeting at corners — a fragment's outline. High, not 1:
         * at the very top the outline reads as a drawn polygon. */
        boundaryFacet: 0.80,
        /* A dozen faces round the body, not four. */
        boundaryFreq: 4.2,
        /* THE CRUST CRACKS AS THE BODY LOOSENS (§8, brittleness). Cohesion
         * drives the shell's fractures: at 0 there are more than twice as
         * many and they are long enough to run right through the band; at 1
         * a few short hairlines in a crust that held. */
        elementScale: {
          vein: { by: "cohesion", count: [2.4, 0.6], size: [1.75, 0.85] }
        },
        /* THE SHELL'S OWN TERRAIN — cosmetic surface marks on the faces, not
         * the outline. Halved from Session T's 0.115 (§1): once the form does
         * the shaping, a large relief only competes with it. */
        relief: 0.06,
        reliefSpec: {
          bands: [
            { cycles: 3,  amp: 1.00 },   /* the fracture facets it broke along */
            { cycles: 9,  amp: 0.52 },   /* the shoulders between them */
            { cycles: 31, amp: 0.34 }    /* rubble and slump */
          ],
          amplitude: 0.06,
          sharpen: 0.30,
          /* FEWER AND BIGGER than a moon's. On a rock this small the hit that
           * would have made its thirtieth crater destroyed it instead. */
          craters: { count: 11, size: [0.030, 0.155], depth: 0.55 }
        },
        /* "HEAVILY CRATERED" RAISES THIS SHELL'S OWN CRATERS (§6). The shell
         * already has two crater marks — the craters in its terrain, which
         * notch the silhouette, and its field of impact pits — so the trait
         * turns both up rather than laying a second crater mechanism over
         * them. See `absorbedScale` in gen/details.js. */
        absorbs: {
          cratered: { craters: 2.6, elements: { "arc-band": 1.9 } }
        },
        /* AN IMPACT BASIN SPANS THE WHOLE BAND. Authored for a planet's crust
         * at 18-100% of its depth; here the shell's real edges wander past
         * any fixed fraction of it, and the basin's own circular inner edge
         * showed as a ruled line across the crust. Reaching past both edges
         * lets the band clip (draw/scene.js, unfrosted damage) shape it. */
        traitDepth: { "impact-basin": [-1.0, 1.4] }
      },
      {
        /* THE MOSAIC, AND IT RUNS TO THE CENTRE.
         *
         * NO CORE. A core is a body that got hot enough to differentiate, and
         * one that did is a planet's leftovers rather than an asteroid.
         * Drawing one here would make every asteroid read as a tiny planet. */
        role: "interior",
        frac: [0.862, 0.905],
        /* The SAME edge as the shell, and it has to be (D180): a lumpy crust
         * round a round mosaic reads as a machined hole, and two independent
         * boundaries of similar size cross. `boundaryShare` makes this the
         * shell's own curve scaled, so they cannot cross by construction;
         * amplitude and frequency must match for the same reason. Less
         * faceted, so the shell still varies in thickness round the body. */
        boundary: "heavy",
        wobbleScale: 1.5,
        boundaryFacet: 0.62,
        boundaryShare: "outer-shell",
        boundaryFreq: 4.2,
        /* WHERE THE CRUST FAILS (ASTEROID-OVERHAUL §8, brittleness).
         *
         * Cohesion is the brittleness axis, and its documented "outer-shell
         * integrity" was never built: the shell was identical at 0 and 100.
         * This lifts the mosaic's edge up into the shell in sectors, so a
         * loose body's crust is discontinuous — thin in places and, at the
         * bottom of the range, absent, with the fragments reaching the
         * silhouette. A structural mark, which is why it reads across the
         * room where a texture would not.
         *
         * `amount` is how much of the sector field breaks through at Cohesion
         * 0 and at Cohesion 1; `sectors` how many lobes the field has round
         * the body. See gen/details.js `crustBreach`. */
        breach: { param: "cohesion", amount: [0.80, 0.0], sectors: 3.2 }
      }
    ],

    /* INTERIOR HEAT IS RADIOACTIVITY HERE (ASTEROID-OVERHAUL §8). A small
     * body keeps almost no heat of its own (`retainsHeat` below), so the
     * control was nearly dead on this family. Same quantity, a fitting name
     * and a consumer that shows: a share of the mosaic's fragments turn hot
     * and, at the top, glow (`mosaicRadio` on the mosaic recipe). The label
     * and tooltip move with the archetype — see syncAxisDials in
     * js/ui/controls.js. */
    dials: {
      "interior-heat": {
        label: "Radioactivity",
        title: "How radioactive the rock is. Below about a third, nothing shows; above it, a growing share of the fragments are hot material - sickly green or cold blue-white - and near the top they glow. Asteroids only; on other bodies this is Interior heat."
      }
    },

    /* NO `axes`. A tidal-lock terminator means nothing on a rock with no
     * atmosphere, no ocean and one temperature set by its distance out. */
    climate: {
      /* THE WHOLE ROCK IS THE SAME TEMPERATURE, near enough: no atmosphere to
       * move heat and no distance for the sun angle to matter over. */
      latitude: 0.12,
      /* IT KEEPS ALMOST NONE OF ITS OWN HEAT (D178). Surface goes as r^2 and
       * volume as r^3, so a small body radiated what it formed with long ago.
       * Not zero, so Interior heat stays a live control. */
      retainsHeat: 0.12
    },

    colorProfile: {
      hue: [0, 360],
      secondaryRel: "complement",
      order: ["outer-shell", "interior"],
      layers: {
        /* SCRATCHED, DARK, NEARLY COLOURLESS. A thin dark frame whose job is to
         * make the mosaic inside it read. Its depth gradient is strong so the
         * band has an inside and an outside rather than reading as an outline. */
        "outer-shell": { sat: [0.05, 0.25], val: [0.20, 0.45],
                         depthGradient: 0.72 },
        /* THE MOSAIC'S GROUND. `mosaicFill` in draw/details.js fans 2-4
         * material tones out of this one colour, so this is the CENTRE of the
         * fan — which is what keeps the Primary hue control moving the body.
         * Wide value range: carbonaceous lump at one end, bright stony body at
         * the other. */
        interior:     { sat: [0.10, 0.40], val: [0.20, 0.60],
                        depthGradient: 0.35,
                        /* WEAKLY HEAT-LEANED — "was it ever molten", never the
                         * glowing heart a planet gets. */
                        heatLean: { hue: [6, 30], amount: 0.20 },
                        heatGradient: 0.28 }
      }
    }
  };

  CC.Archetypes.register(ASTEROID);
})();
