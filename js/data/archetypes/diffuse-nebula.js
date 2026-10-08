/* Diffuse bodies — the `nebula`.
 *
 * See docs/celestials/diffuse-bodies.md for the spec and
 * js/data/archetypes/registry.js for what every field means.
 *
 * A NEBULA IS A PLANET WITH THE WOBBLE TURNED UP TO ABSURD LEVELS AND THE
 * OPACITY TURNED DOWN — the spec's own simplification, and the reason this is
 * a data file and not a renderer. Same concentric stack as everything else:
 * sparse outside, densest in the middle. What stops it reading as concentric
 * is three layer properties, each general and each absent on every other body:
 *
 *   extreme wobble   boundaries swing far enough to cross their neighbours,
 *                    so the regions interpenetrate instead of nesting
 *   feather          no region has an edge — its fill fades out over a wide
 *                    margin following its own outline (draw/feather.js)
 *   ride             its marks follow that outline and are not clipped
 *   opacity          rolled per region, low outside and higher inside, so the
 *                    inner regions show through the outer ones
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  /* Every region is treated as self-lit by the palette (no reflective
   * rules, no star cast) and is NOT moved by Interior heat: a cloud has no
   * interior to heat. How much light it really gives off is Luminosity
   * source's job — see LUMINOSITY below. */
  function lit(spec) { spec.incandescent = true; spec.heatDriven = false; return spec; }

  /* ---- LUMINOSITY SOURCE --------------------------------------------------
   *
   * The spec's five "type character" traits were mutually exclusive, which is
   * an axis wearing trait clothing: a nebula is dark OR reflection OR
   * emission. One slider, 0-100%, and it moves FOUR things at once — that is
   * what makes it read as a kind of nebula rather than a brightness control:
   *
   *   0    DARK        the gas absorbs: near-opaque regions, near-black and
   *                    grey, silhouetted against whatever is behind; a faint
   *                    lit flank from outside; no stars inside
   *   35   REFLECTION  lit from OUTSIDE: one flank bright, the far one dim,
   *                    the colour cooled toward blue (scattered starlight is
   *                    blue — why reflection nebulae are)
   *   100  EMISSION    glowing from within: vivid, light, thin; protostars
   *                    present and lighting their surroundings
   *
   * Four declarations carry it, each general and each a curve over the one
   * parameter (CC.Math.curve): the palette's `dial` (value, saturation, hue),
   * each region's `opacityBy`, and the `dial` on each element recipe in
   * js/data/elements/diffuse.js (count, alpha, emit, absorb, side). */
  var LUMINOSITY = "luminosity";
  var OPACITY_BY = { param: LUMINOSITY, scale: [[0, 4.2], [0.35, 1.8], [1, 1]] };

  /* EXTREME, AND THEN SOME. `extreme` is 0.14 of the layer's own radius; the
   * nebula wants its boundaries to swing far enough to cross the next region
   * down, which is several times that. A multiplier rather than a seventh
   * boundary name, the asteroid's precedent: it is the same KIND of edge,
   * more of it. Low frequency — a few great lobes, not a frill. */
  function region(spec) {
    spec.boundary = "extreme";
    spec.boundaryFreq = spec.boundaryFreq || 1.6;
    spec.ride = true;
    return spec;
  }

  /* ---- NEBULA FORM: TWO STACKS ------------------------------------------
   *
   * A planetary nebula and a supernova remnant INVERT the stack's core
   * assumption: they are EMPTY IN THE MIDDLE, thrown outward by a dead star.
   * No value of any slider says that, so the archetype declares both stacks
   * and the Nebula form setting picks one (`presence: { is }`, gen/
   * structure.js). The spec wanted presets to select it; a preset can only
   * set a setting, and a setting with no control is a stack nobody can reach
   * (D171) — so it is a control, and the presets set it. */
  var FORM = "nebulaForm";
  var CLOUD = { param: FORM, is: ["cloud"], dflt: "cloud" };
  var SHELL = ["planetary", "remnant"];

  /* The shell's own two characters, as the same role with different edges
   * and a different mix of marks: a planetary nebula's ring is smooth and
   * knotted, a supernova remnant's is ragged and woven of filaments. */
  function shell(form, spec) {
    spec.role = "shell";
    /* Inside the shock; at 1.0 when the shock is absent (renormalized). */
    spec.frac = [0.72, 0.80];
    spec.ride = true;
    spec.feather = 0.22;
    /* NO FLAT FILL: it is a disc to the centre and would fill the cavity.
     * The ring is its cloud field alone, laid in its own annulus. */
    spec.opacity = 0;
    spec.presence = { param: FORM, is: [form], dflt: "cloud" };
    return spec;
  }

  var NEBULA = {
    id: "nebula",
    label: "Nebula",
    family: "diffuse",
    /* No `orbit-safe`: nothing orbits a cloud light-years across. */
    tags: ["diffuse", "no-surface"],
    statTemplate: "nebula",
    /* Light-years, not kilometres — the stat template reads its own scale. */
    radiusKm: [1, 1],
    /* The halo's crests reach well past the nominal radius, so the cloud is
     * drawn smaller in its own frame to keep them in it. */
    frame: 0.92,

    stack: [
      region({
        role: "halo",
        presence: CLOUD,
        frac: [1.00, 1.00],
        wobbleScale: 3.2,
        drift: [0.00, 0.10],
        feather: 0.55,
        opacity: [0.04, 0.10],
        opacityBy: OPACITY_BY
      }),
      region({
        role: "sparse-region",
        presence: CLOUD,
        frac: [0.66, 0.80],
        wobbleScale: 3.4,
        drift: [0.05, 0.16],
        feather: 0.50,
        opacity: [0.06, 0.14],
        opacityBy: OPACITY_BY
      }),
      region({
        role: "dense-region",
        presence: CLOUD,
        frac: [0.40, 0.54],
        wobbleScale: 3.6,
        drift: [0.08, 0.22],
        feather: 0.45,
        opacity: [0.10, 0.20],
        opacityBy: OPACITY_BY
      }),
      region({
        role: "core-region",
        presence: CLOUD,
        frac: [0.16, 0.28],
        wobbleScale: 3.6,
        drift: [0.10, 0.26],
        feather: 0.60,
        opacity: [0.14, 0.26],
        opacityBy: OPACITY_BY,
        bias: "coreBias"
      }),

      /* ---- the shell stack (frac stated where it is drawn, D222) ---- */
      {
        /* The leading edge of the expansion, out beyond the shell. A banded
         * region like every other here — feathered, its marks in its own
         * annulus — not an outward falloff: a falloff fills to the centre and
         * showed as a pale disc over the whole translucent nebula. Optional
         * at the spec's 70% (Optional layers at its default); when it is
         * absent, renormalization brings the shell back out to 1.0. */
        role: "outer-shock",
        frac: [1.00, 1.00],
        boundary: "extreme",
        wobbleScale: 1.4,
        boundaryFreq: 3.0,
        ride: true,
        feather: 0.35,
        opacity: 0,
        presence: { param: FORM, is: SHELL, dflt: "cloud", chance: 0.93 }
      },
      shell("planetary", {
        boundary: "heavy",
        wobbleScale: 0.9,
        boundaryFreq: 2.2,
        elementScale: { filament: { count: 0.45 }, knot: { count: 1.5 } }
      }),
      shell("remnant", {
        /* RAGGED, AND WOVEN OF FILAMENTS — the Crab and the Veil. The
         * filaments are the remnant: three and a half times as many, longer,
         * over a thinner cloud; the knots and heaped billows of a planetary
         * nebula's ring nearly gone. */
        boundary: "extreme",
        wobbleScale: 2.2,
        boundaryFreq: 3.4,
        elementScale: { filament: { count: 3.5, size: 1.4 }, knot: { count: 0.25 },
                        billow: { count: 0.3 } }
      }),
      {
        /* SWEPT EMPTY — the point of the stack. A whisper of fill so the
         * middle is a place rather than a hole in the picture. */
        role: "cavity",
        frac: [0.40, 0.56],
        boundary: "soft-gradient",
        ride: true,
        feather: 0.6,
        opacity: [0.03, 0.07],
        opacityBy: OPACITY_BY,
        presence: { param: FORM, is: SHELL, dflt: "cloud" }
      },
      {
        /* The dead star: a white dwarf, or a pulsar (see `beams`). GLOW
         * ONLY — a point of light, not a disc. `soft-gradient` so no edge is
         * stroked: as `near-perfect` the renderer drew this band's outline,
         * and a hard circle round the star's glow with its spikes across it
         * read as a ball with a cross on it (the user: "the smash ball"). */
        role: "remnant-star",
        frac: [0.03, 0.05],
        boundary: "soft-gradient",
        opacity: 0,
        presence: { param: FORM, is: SHELL, dflt: "cloud" }
      }
    ],

    /* ---- THE PULSAR AT A SUPERNOVA REMNANT'S HEART ------------------------
     *
     * The generator's one cross-family composition, done by DECLARATION: the
     * compact family's own axis and beams (js/gen/compact.js), started at the
     * remnant star rather than at a surface (`base`) and fired only on the
     * remnant form (`when`). Not a nested pulsar render: at this scale a
     * neutron star's whole stack is a few pixels, and the beams are what make
     * a pulsar a pulsar. Spin rate widens them, as it does on a pulsar. */
    poles: { tilt: { deg: [15, 55] }, spin: "spinRate" },
    beams: {
      when: { param: FORM, is: ["remnant"] },
      /* FROM THE POINT ITSELF. Started at the remnant band's edge with a
       * star's root width, the two beams ended flat either side of the glow
       * and framed it as a ball (the user's "smash ball"). */
      base: 0.004,
      root: 0.002,
      length: 0.95,
      halfWidth: { param: "spinRate", range: [3.5, 8] },
      strength: 0.85,
      streaks: [10, 30],
      glints: [20, 60]
    },

    /* THE BACKLIGHT — what a dark nebula is seen AGAINST. A dark cloud on
     * black sky is invisible; real ones are silhouettes against glowing gas
     * or dense starfields behind them (the Horsehead against IC 434). So the
     * emissive pass lays a broad glow BEHIND the body (`from: 0`), strongest
     * at the dark end and gone by the middle of the slider, and the cloud's
     * absorbing pass blots it out. Light behind, not light from: nothing in
     * the cloud glows. */
    emissiveGlow: {
      from: 0,
      reach: 1.85,
      falloff: 0.9,
      /* Its own brightness: the dark end's palette is near-black, and a
       * backlight in that colour lights nothing to be silhouetted against. */
      sat: 0.55,
      val: 0.62,
      strength: { param: LUMINOSITY,
                  curve: [[0, 1.5], [0.2, 0.9], [0.42, 0.2], [0.55, 0]] }
    },

    /* Nothing here has a latitude, is warmed by another star in the way a
     * planet is, or has a surface to frost — declared as the stellar family
     * is, so the climate system asks nothing of it (D50). */
    climate: { latitude: 0, starlit: false, selfHeated: 0.5 },

    colorProfile: {
      hue: [0, 360],
      /* THREE TO FOUR RELATED HUES, the spec's call: a red-and-teal or a
       * gold-and-violet nebula is exactly right. */
      secondaryRel: "triad",
      dial: {
        param: LUMINOSITY,
        dflt: 0.7,
        val: [[0, 0.24], [0.35, 0.80], [1, 1.12]],
        sat: [[0, 0.40], [0.35, 0.72], [1, 1.18]],
        /* Toward a reflection nebula's scattered blue, strongest at 35%. */
        hue: { to: 214, amount: [[0, 0.12], [0.35, 0.55], [0.65, 0.18], [1, 0]] }
      },
      /* BOTH STACKS IN ONE ORDER, interleaved by how deep each layer sits
       * in its own stack — the order is what places a layer on the
       * primary-to-secondary hue journey, so the shell takes the primary
       * like the outer cloud and the cavity drifts toward the secondary. */
      order: ["halo", "outer-shock", "sparse-region", "shell", "dense-region",
              "cavity", "core-region", "remnant-star"],
      layers: {
        halo:            lit({ sat: [0.30, 0.65], val: [0.20, 0.45] }),
        "sparse-region": lit({ sat: [0.40, 0.75], val: [0.30, 0.55] }),
        "dense-region":  lit({ sat: [0.50, 0.85], val: [0.40, 0.70] }),
        "core-region":   lit({ sat: [0.55, 0.90], val: [0.55, 0.85],
                               glowCentre: true }),
        "outer-shock":   lit({ sat: [0.35, 0.70], val: [0.35, 0.60] }),
        /* The bright ring — the material itself. */
        shell:           lit({ sat: [0.55, 0.90], val: [0.50, 0.80] }),
        cavity:          lit({ sat: [0.35, 0.70], val: [0.35, 0.60] }),
        /* White-hot whatever the nebula's colour. */
        "remnant-star":  lit({ sat: [0.05, 0.20], val: [0.95, 1.00] })
      }
    }
  };

  CC.Archetypes.register(NEBULA);
})();
