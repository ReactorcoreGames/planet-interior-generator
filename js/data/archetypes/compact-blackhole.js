/* Compact objects — `black-hole`.
 *
 * See docs/celestials/compact-objects.md for the spec, and the session write-
 * up docs/progress/session-v-compact.md for how this approach was chosen: the
 * user picked the CROSS-SECTION reading over a cinematic lensed disc and a
 * gravity-well grid, and then asked whether a black hole could have an
 * inside at all.
 *
 * ---- THE PICTURE -----------------------------------------------------------
 *
 * "Not a dark circle with a ring drawn on it" is the whole spec. The void
 * reads because EVERYTHING ROUND IT IS CUT-OPEN MATTER and inside there is
 * none: the disc is sliced through like every other body's layers (two
 * flaring wedges, flow marked into and out of the page), the sky darkens
 * toward the hole, streams plunge from the disc's inner edge into the
 * horizon and redden to nothing, and the horizon itself is TRUE BLACK —
 * darker than space, which no other band in the generator is.
 *
 * ---- THE INSIDE, AND WHY IT DEPENDS ON SPIN --------------------------------
 *
 * A non-spinning black hole genuinely is one black ball: inside the horizon
 * "inward" is the future, nothing can hold still, and there is no structure
 * to draw — so at Spin rate 0 there is none, only the point singularity.
 * (Neutronium at the centre is not believable: a neutron star is exactly the
 * thing that failed to hold up.)
 *
 * Every real black hole spins, and a spinning one — the Kerr solution — has
 * structure in its own equations, which is what this stack draws:
 *
 *   ergosphere     OUTSIDE the horizon, oblate: space dragged round so hard
 *                  nothing can stay still. Drawn by draw/hole.js.
 *   infall         the event horizon down to the inner horizon. True black,
 *                  faint streaks falling inward.
 *   cauchy-shell   the inner horizon, where light from the outside universe
 *                  piles up infinitely blue-shifted ("mass inflation") — the
 *                  one bright thing inside the black.
 *   inner-region   black again, and the singularity: a RING, so the cut meets
 *                  it at two points.
 *
 * Spin also pulls the disc's inner edge in (the innermost stable orbit runs
 * from 3 horizon radii to about 1.2) and swells the ergosphere, so one
 * control visibly changes the outside and opens up the inside.
 *
 * ---- THE CONTROLS ---------------------------------------------------------
 *
 *   ACCRETION RATE  new. The spec's `feeding`/`dormant` axis: disc presence,
 *                   brightness, density, the hot torus at its inner edge, the
 *                   jets. At 0 there is no disc and the picture is nearly all
 *                   black, which the spec calls bold and correct.
 *   SPIN RATE       shared with the neutron star and pulsar — the same
 *                   quantity — and here it is the interior.
 *   MASS CLASS      Core size bias, relabelled (`dials`). Stellar-mass at the
 *                   bottom, supermassive at the top. It sets the horizon's
 *                   size in km and every derived stat; the picture is a
 *                   diagram and does not change scale, which the card says.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  function lit(spec) { spec.incandescent = true; return spec; }

  var BLACK_HOLE = {
    id: "black-hole",
    label: "Black hole",
    family: "compact",
    /* NOT `luminous`: the spec's family tag is "except black holes". */
    tags: ["compact", "stellar-remnant", "hole"],
    statTemplate: "black-hole",
    /* Unused by the card, which derives the horizon from the mass class;
     * kept so the shared size roll has a range to read. */
    radiusKm: [3, 30],

    /* THE HOLE IS SMALL IN ITS OWN PICTURE. Its disc reaches six horizon
     * radii and its jets further, and those are most of what there is to
     * see; drawn at the size a planet is drawn, the disc ran off the frame
     * at its root. See `frame` in gen/structure.js. */
    frame: 0.30,

    stack: [
      {
        /* Where light orbits: 1.3-1.55 horizon radii, the spec's figure. */
        role: "photon-sphere",
        frac: { over: "surface", depth: [0.30, 0.55] },
        boundary: "soft-gradient",
        outward: true,
        fadeHold: 0.80,
        /* NO BAND FILL — only the ring and the arcs. Filled, even dark, the
         * band read as a donut round the horizon: a dark circle with a ring
         * drawn on it, which is the one picture the spec rules out. */
        opacity: 0
      },
      {
        /* THE EVENT HORIZON IS THIS BAND'S OUTER EDGE, and it is the body's
         * surface: 1.0. Authored AT the surface so nothing is renormalized. */
        role: "infall",
        frac: [1.000, 1.000],
        boundary: "perfect"
      },
      {
        /* THE INNER HORIZON — a thin shell sitting on the inner region, so
         * it moves with it. Only on a hole that spins. */
        role: "cauchy-shell",
        /* THICKER AS IT GROWS, so the glow has room to fall off softly on
         * both sides — at a fixed hairline it drew as a crisp ring. Its
         * MIDDLE sits on the inner horizon: the inner region below stops
         * half a shell short of it. */
        frac: { over: "inner-region", depth: [0.03, 0.22], param: "spinRate",
                curve: 2.2 },
        /* GLOW ONLY: no fill and no edge line, so the shell is light with
         * soft edges fading into the black either side, never a drawn ring. */
        boundary: "soft-gradient",
        opacity: 0,
        presence: { param: "spinRate", above: 0.16, fade: 0.12 }
      },
      {
        /* ITS RADIUS IS THE INNER HORIZON'S, read off the spin. Kerr gives
         * r-/r+ = (1 - q)/(1 + q), q = sqrt(1 - a^2): flat for most of the
         * range and racing outward near the top. With the spin mapped
         * through a sine (js/gen/compact.js), 0.02 + 0.84 * s^2.2 follows it to
         * within 0.03 of the horizon radius across the whole range —
         * measured, not assumed. This band stops half a shell short of that
         * (0.74, not 0.84), so the shell above is CENTRED on the horizon. */
        role: "inner-region",
        frac: [0.020, 0.020],
        modulate: [{ param: "spinRate", amount: 0.74, curve: 2.2 }],
        boundary: "perfect",
        presence: { param: "spinRate", above: 0.16 }
      }
    ],

    /* The spin axis is vertical; the jets run along it. */
    poles: { tilt: { deg: [0, 0] }, spin: "spinRate" },

    /* THE JETS — the pulsar's beams, collimated into jets with shock knots.
     * Powered by what falls in: absent below about a quarter of the
     * Accretion rate, full at the top. */
    beams: {
      halfWidth: { param: "spinRate", range: [2.0, 3.4] },
      length: 4.6,
      strength: { param: "accretionRate", range: [-0.55, 1.0] },
      collimate: 0.86,
      streaks: [20, 60],
      glints: [30, 90],
      knots: [5, 14]
    },

    hole: {
      spin: "spinRate",
      accretion: "accretionRate",
      /* The disc takes the photon sphere's colour — it is what lights it. */
      disc: {
        colour: "photon-sphere",
        outer: 6.5,
        streaks: [90, 260],
        spots: [10, 30],
        turbulence: [30, 80],
        plunge: [4, 14],
        marks: 4
      },
      umbra: { reach: 3.4, strength: 0.92 }
    },

    dials: {
      "core-bias": {
        label: "Mass class",
        title: "How massive the black hole is. The bottom is a stellar-mass hole a few times the Sun's mass and a few kilometres across; the middle is intermediate; the top is supermassive, millions of suns, the kind at the centre of a galaxy. The picture is a diagram and keeps its size - the card gives the real scale. Black holes only; on other bodies this is Core size bias."
      }
    },

    /* No latitude, not lit, and no surface to be warm or cold — declared as
     * the stellar family is, so the climate system asks nothing of it. */
    climate: { latitude: 0, starlit: false, selfHeated: 0.5 },

    colorProfile: {
      hue: [0, 360],
      secondaryRel: "analogous",
      order: ["photon-sphere", "infall", "cauchy-shell", "inner-region"],
      layers: {
        /* The band itself is not drawn (`opacity: 0` above); this is the
         * colour its ring and arcs derive from, and the disc's HUE. */
        "photon-sphere": lit({ sat: [0.30, 0.50], val: [0.30, 0.42] }),
        /* TRUE BLACK. Hue and saturation survive so the infall streaks take
         * a dim ember of the body's colour. */
        infall:          { void: true, sat: [0.65, 0.85], val: [0, 0] },
        /* Blue-shifted, whatever the disc's colour: that is the physics. */
        /* A soft shell rather than a hard line: a dimmer band with a bright
         * core drawn through its middle (the element table). */
        "cauchy-shell":  lit({ hue: [205, 228], hueLean: 0.08,
                               sat: [0.30, 0.48], val: [0.85, 0.95] }),
        "inner-region":  { void: true, sat: [0.40, 0.60], val: [0, 0] }
      }
    }
  };

  CC.Archetypes.register(BLACK_HOLE);
})();
