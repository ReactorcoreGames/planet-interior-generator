/* Compact objects — detail recipes for the neutron star and the pulsar.
 *
 * See js/data/elements/registry.js for what every field means and
 * docs/celestials/compact-objects.md for the spec.
 *
 * THE FAMILY'S STORY IS EXTREMITY, AND THE MARKS HAVE TO SAY IT. Every other
 * body in the generator is drawn as material — grain, cells, veins, strata.
 * A neutron star's bands are matter in states that exist nowhere else, so
 * each band gets a mark that appears nowhere else (D76 at family scale, paid
 * for in advance the way Session M paid for convection vs radiation):
 *
 *   plasma-skin    a bright hairline. Centimetres thick; the stats say so.
 *   iron-lattice   ORDER — rows of nuclei in grains. The only band in the
 *                  generator drawn as a crystal rather than as a material.
 *   nuclear-pasta  STRIATIONS THAT CHANGE WITH DEPTH — drops, then rods, then
 *                  sheets, because that is what nuclear matter does as it is
 *                  squeezed. One recipe; the primitive reads the depth.
 *   superfluid     STRAIGHT VERTICAL LINES — quantized vortices, parallel to
 *                  the spin axis whatever the field is doing, spaced by how
 *                  fast the body turns.
 *   quark-core     the densest stipple in the project, and nothing else.
 *                  Unknown physics; the honest drawing is undifferentiated.
 *   magnetosphere  the field itself, as closed dipole loops from pole to
 *                  pole — the only body where field geometry is the picture.
 *
 * Roles are NEW NAMES, not the spec's `atmosphere` / `outer-core` /
 * `inner-core`: element tables are keyed by role across every family, and a
 * neutron star's outer core sharing the planet's iron-core recipe would be
 * exactly the confusion the per-role table exists to prevent.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  var grain = CC.Elements.grain;

  CC.Elements.register({

    /* ---- THE FIELD ------------------------------------------------------
     *
     * An outward layer, so everything here rides the falloff and fades with
     * the halo. The loops are ANNOTATION, the register the mantle's arrows
     * are in: thin, bright, regular. Their count, reach and twist are Field
     * strength — the count through `elementScale` on the archetype, the
     * reach through the layer's own depth, the twist through `poles`. */
    magnetosphere: {
      elements: [
        {
          kind: "dipole-loop",
          count: [14, 34],
          tiers: 2,
          /* The loop's equatorial reach (L), as a depth across the halo —
           * see the builder in js/gen/compact.js. Past 1 on purpose: the wide
           * loops rise steeply off the poles and fade out beyond the halo. */
          depth: [0.06, 2.6],
          alpha: [0.55, 0.95],
          tone: "glow"
        },
        {
          /* Charged particles caught in the field. */
          kind: "speckle",
          count: [50, 160],
          tiers: 2,
          size: [0.0028, 0.0060],
          depth: [0.00, 0.85],
          alpha: [0.45, 0.95],
          tone: "glow"
        }
      ]
    },

    /* ---- THE HAIRLINE ATMOSPHERE ---------------------------------------
     *
     * A plasma skin centimetres deep, drawn as a bright line around the
     * crust. It needs almost nothing; its job is to be the brightest thin
     * edge in the picture. */
    "plasma-skin": {
      elements: [
        {
          kind: "gradient-band",
          count: [1, 1],
          tiers: 1,
          bandWidth: [0.70, 0.95],
          depth: [0.25, 0.80],
          alpha: [0.55, 0.85],
          arc: [360, 360],
          tone: "glow"
        }
      ]
    },

    /* ---- THE OUTER CRUST: A CRYSTAL ------------------------------------
     *
     * `count` is the number of GRAINS, not of nuclei — see the builder in
     * js/gen/compact.js. `size` is the lattice spacing in body radii.
     * DARK dots on a bright band: a technical drawing of a crystal, which is
     * the register the family spec asks for ("clinical"). */
    "iron-lattice": {
      elements: [
        {
          kind: "lattice",
          count: [16, 42],
          size: [0.0105, 0.0135],
          alpha: [0.28, 0.48],
          tone: "darker"
        },
        grain(120, 420, [0.003, 0.006])
      ]
    },

    /* ---- THE INNER CRUST: NUCLEAR PASTA --------------------------------
     *
     * ORDERED STRIATIONS — rows following the curve, and what each row is
     * made of is decided by its depth: drops at the top, rods in the middle,
     * unbroken sheets at the bottom. That is the real sequence nuclear matter
     * runs through as it is squeezed, and it reads as one band changing
     * character downward. A scatter of clusters was tried first and read as
     * dirt at sheet scale: the order IS the mark. `count` is grains; `size`
     * is the row spacing in body radii. */
    "nuclear-pasta": {
      elements: [
        {
          kind: "pasta",
          count: [10, 26],
          size: [0.0125, 0.0150],
          alpha: [0.40, 0.62],
          tone: "darker"
        },
        grain(160, 520, [0.003, 0.007])
      ]
    },

    /* ---- THE OUTER CORE: A SUPERFLUID ----------------------------------
     *
     * One structure. `size` is the vortex spacing at Spin rate 0 and at 1,
     * read through `spinBy` by the builder — a faster body is threaded more
     * densely, which is the real relation. Bright lines on a dimmer band. */
    superfluid: {
      elements: [
        {
          kind: "vortex-array",
          count: [1, 1],
          size: [0.085, 0.034],
          spinBy: "spinRate",
          alpha: [0.50, 0.72],
          tone: "lighter"
        },
        {
          /* A faint shimmer in the fluid between the lines, so the band is
           * not flat — fine, small and low. */
          kind: "speckle",
          count: [260, 820],
          tiers: 3,
          size: [0.003, 0.008],
          depth: [0.02, 0.98],
          alpha: [0.20, 0.45],
          texture: true,
          tone: "lighter"
        }
      ]
    },

    /* ==== THE BLACK HOLE =================================================
     *
     * Three bands inside the horizon and one outside. What surrounds the
     * hole — the darkened sky, the ergosphere, the sliced disc, the jets — is
     * drawn from the body-level `hole` and `beams` (draw/hole.js), because
     * none of it is a ring round the centre. */

    /* THE PHOTON SPHERE — where light orbits. A thin bright ring at the
     * layer's outer edge, and arcs of light caught bending round the hole.
     * Annotation more than material, and kept faint so it frames the void
     * rather than outlining it. */
    "photon-sphere": {
      elements: [
        {
          kind: "gradient-band",
          count: [1, 1],
          tiers: 1,
          bandWidth: [0.035, 0.05],
          depth: [0.93, 0.97],
          alpha: [0.45, 0.70],
          arc: [360, 360],
          tone: "glow"
        },
        {
          kind: "arc-band",
          count: [8, 22],
          tiers: 2,
          size: [0.010, 0.016],
          depth: [0.15, 1.00],
          alpha: [0.26, 0.55],
          arc: [35, 120],
          tone: "lighter"
        }
      ]
    },

    /* BETWEEN THE HORIZONS — true black (`void` in the palette), with faint
     * streaks falling inward, because inside the horizon inward is the
     * future. When nothing is inside it (a hole that does not spin), the
     * singularity is drawn here, as a point at the centre. */
    infall: {
      elements: [
        {
          kind: "infall",
          count: [60, 170],
          tiers: 2,
          sizeRel: true,
          size: [0.30, 0.62],
          depth: [0.30, 1.00],
          alpha: [0.16, 0.36],
          tone: "glow"
        },
        {
          kind: "singularity",
          count: [1, 1],
          size: [0.035, 0.035],
          alpha: [0.85, 0.95],
          tone: "glow"
        }
      ]
    },

    /* THE INNER HORIZON — where light falling in from the outside universe
     * piles up, infinitely blue-shifted: "mass inflation". The one bright
     * thing inside the black, and only on a spinning hole. */
    "cauchy-shell": {
      elements: [
        {
          /* The bright core, narrow, on the horizon itself. */
          kind: "gradient-band",
          count: [1, 1],
          tiers: 1,
          bandWidth: [0.10, 0.13],
          depth: [0.50, 0.50],
          alpha: [0.90, 1.00],
          arc: [360, 360],
          tone: "glow"
        },
        {
          /* The glow round it, spanning the whole band and fading to
           * nothing at both edges — the band has no fill of its own. */
          kind: "gradient-band",
          count: [1, 1],
          tiers: 1,
          bandWidth: [0.50, 0.50],
          depth: [0.50, 0.50],
          alpha: [0.55, 0.70],
          arc: [360, 360],
          tone: "glow"
        },
        {
          kind: "speckle",
          count: [60, 200],
          tiers: 2,
          size: [0.0025, 0.0055],
          depth: [0.00, 1.00],
          alpha: [0.50, 1.00],
          tone: "glow"
        }
      ]
    },

    /* INSIDE THE INNER HORIZON — black again, and the singularity: a RING on
     * a spinning hole, so the cut meets it at two points. `ring` is where it
     * sits as a fraction of this band; `ringBy` is the spin that makes it a
     * ring rather than a point. */
    "inner-region": {
      elements: [
        {
          kind: "singularity",
          count: [1, 1],
          size: [0.035, 0.035],
          ring: 0.62,
          ringBy: "spinRate",
          alpha: [0.85, 0.95],
          tone: "glow"
        }
      ]
    },

    /* ---- THE INNER CORE: UNKNOWN ---------------------------------------
     *
     * "Extremely dense stipple", and nothing that would claim to know what
     * the matter is. The densest field in the project, in three tiers. */
    "quark-core": {
      elements: [
        {
          kind: "speckle",
          count: [900, 2400],
          tiers: 3,
          size: [0.0035, 0.0080],
          depth: [0.00, 0.98],
          alpha: [0.40, 0.85],
          texture: true,
          tone: "shift"
        },
        {
          /* A WHITE-HOT HEART. Concentric glow bands toward the centre, so
           * the core reads as radiating rather than as a flat disc — the
           * palette's hot-edge ramp grades through orange, which is the wrong
           * statement for something "so hot the colour barely matters". */
          kind: "gradient-band",
          count: [3, 4],
          tiers: 1,
          bandWidth: [0.30, 0.55],
          depth: [0.00, 0.55],
          alpha: [0.30, 0.50],
          arc: [360, 360],
          tone: "glow"
        }
      ]
    }
  });
})();
