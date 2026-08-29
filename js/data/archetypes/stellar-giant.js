/* `old-giant-star` — enormous, cool, and mostly empty.
 *
 * THE ABSURD CORE-TO-ENVELOPE RATIO IS THE ENTIRE POINT, and it is a named
 * done-condition of the phase. Everything in this stack is arranged so the
 * degenerate core reads as comically small against the envelope around it:
 * 2-6% of the radius, about one part in twenty-three thousand of the volume.
 *
 * js/data/archetypes/stellar-common.js must load before this file. */
var CC = CC || {};

(function () {
  "use strict";

  var C = CC.StellarCommon;
  var stellarClimate = C.climate, hueFromStars = C.hueFromStars;
  var corona = C.corona, chromosphere = C.chromosphere, lit = C.lit;
  var LIMB = C.LIMB, binaryCompanion = C.binaryCompanion, SWELL = C.SWELL;

  /* ------------------------------------------------------------------ *
   * old-giant-star
   *
   * THE ABSURD CORE-TO-ENVELOPE RATIO IS THE ENTIRE POINT, and it is a named
   * done-condition of the phase. Everything in this stack is arranged so the
   * degenerate core reads as comically small against the envelope around it.
   * ------------------------------------------------------------------ */

  var OLD_GIANT_STAR = {
    id: "old-giant-star",
    label: "Old giant star",
    family: "stellar",
    tags: ["stellar", "luminous", "no-surface", "convective-envelope",
           "evolved", "shedding"],
    statTemplate: "stellar",

    /* 10-100x the Sun. This range is a factor of ten wide ON ITS OWN, which is
     * unlike anything else in the generator and is why the stat template's
     * size saying has its own ladder rather than sharing the giants'. */
    radiusKm: [7000000, 70000000],
    gravityScale: 2400000,

    stack: [
      {
        role: "shed-envelope",
        /* CAST-OFF MATERIAL, and the reason this body looks like it is coming
         * apart. `outward` because it genuinely is outside the star — it is
         * material the star has already lost — and its falloff runs very long
         * and very faint. `fadeHold` near zero: unlike a corona, which is
         * brightest at its base, a shed shell is thin everywhere. */
        frac: { over: "surface", depth: [0.18, 0.42] },
        boundary: "extreme",
        outward: true,
        fadeHold: 0.10,
        /* IT PULSES AND SHEDS, so its edge is the least circular in the
         * family — and unlike the other three this is not really about
         * activity. An old giant's envelope is unstable because the star is
         * dying, so the FLOOR is very high and the driver only adds to an
         * already ragged edge. `boundary: "extreme"` never reached this layer
         * before: an outward layer is drawn by `fillOutward`, which had no
         * way to wobble anything until `thicknessAt` was composed. */
        wobbleRel: { base: 0.34, peak: 0.62, driver: "starActivity" },
        /* The envelope's own plume field, turned up: this layer IS the
         * archetype, and its material leaving is the thing to look at. */
        elementScale: { plume: { count: 1.25, size: 1.15 } },
        /* Guaranteed by a third of the way up the Optional layers slider, as
         * the spec asks — a red giant without its shed material is a rarity,
         * not the default. */
        presence: 3.0
      },
      {
        role: "photosphere",
        /* Cool and uneven. `irregular` rather than the other stars' `slight`:
         * a red giant's surface genuinely is lumpy — it has a handful of
         * convection cells the size of the inner solar system pushing at it —
         * and the wobbly outline is the first thing that says this body is not
         * a tidy main-sequence star. */
        frac: [0.930, 0.990],
        boundary: "irregular",
        /* TIRED AND DIFFUSE. A red giant's photosphere is the most limb-
         * darkened surface in the family — you are looking through a great
         * depth of cool, thin gas near its edge, and that is exactly the
         * "enormous and exhausted" read the archetype wants. */
        limbDarkening: LIMB.surface * 1.25,
        /* D90, AND IT BIT HERE FIRST IN THE FAMILY.
         *
         * `frac` bounds where a layer's OUTER edge sits; its thickness is
         * whatever is left between it and the next layer down, which no range
         * can control. With `convective` reaching only to 0.920 and this floor
         * at 0.930, the photosphere stretched down to fill the gap — measured
         * at 0.468 thick, forty-seven per cent of the radius, against an
         * authored band of six. It swallowed the envelope that is supposed to
         * be this archetype's whole picture, and the enormous convection cells
         * were squeezed into a third of the space.
         *
         * The cap keeps it the skin it is meant to be whatever else rolls. A
         * photosphere is a surface, and a surface that is half the body is not
         * one. */
        maxThickness: 0.075
      },
      {
        role: "convective",
        /* THE ENORMOUS ENVELOPE. Two thirds of the radius, in one layer, and
         * the element table gives it a DOZEN cells where a main star's
         * envelope gets dozens of small ones. Same primitive, different scale,
         * completely different read — the spec's own note, and it is what
         * makes this body's interior look tired rather than busy.
         *
         * Its floor runs low precisely so the shells and the core beneath it
         * are crushed into the last fraction of the radius. */
        frac: [0.300, 0.928],
        boundary: "irregular",
        /* THE ENVELOPE IS THE ARCHETYPE, so it carries a full share of the
         * curve rather than the usual interior fraction — most of this body's
         * visible face IS this layer. */
        limbDarkening: LIMB.interior * 1.35
      },
      {
        role: "h-shell",
        /* HYDROGEN FUSING IN A SHELL around the dead core — which is what an
         * old giant IS, and the reason it swelled. Thin, and much brighter
         * than the envelope above it. */
        frac: [0.140, 0.280],
        boundary: "slight"
      },
      {
        role: "he-shell",
        /* Helium fusing deeper still. Optional — a star only reaches this
         * stage late — and guaranteed two thirds of the way up the slider. */
        frac: [0.070, 0.130],
        presence: 1.5,
        boundary: "slight"
      },
      {
        role: "degenerate-core",
        /* TINY, BRILLIANT, DENSE — and the smallest authored layer anywhere in
         * the generator, by a wide margin. At 0.02-0.06 of the radius it is a
         * SPECK: at the default body size that is a handful of pixels across
         * against an envelope filling the frame, and that ratio is the most
         * striking thing this archetype produces.
         *
         * `bias: "coreBias"` still applies, so a user who wants to see it can
         * drag it to the top of its range — but the range itself never lets it
         * become an ordinary-looking core. That is the difference between a
         * parameter and a defeat of the design. */
        frac: [0.020, 0.060],
        boundary: "near-perfect",
        bias: "coreBias"
      }
    ],

    /* 2,000-4,000 C — COOL, AS STARS GO, and the coolest of the four. Still
     * enormously hotter than any planet; the whole scale here sits above
     * anything the solid or gaseous families reach. */
    /* ENORMOUS AND TIRED. A red giant radiates a great deal in total and very
     * little per unit of surface, so the halo is WIDE and DIM — reaching
     * further than any other star's while carrying less light. Few veins, and
     * long: this envelope is shedding rather than flaring. */
    emissiveGlow: {
      reach: 1.75,
      strength: 0.72,
      veins: { count: 58, length: [0.34, 1.15], alpha: 0.17, lean: 0.50 }
    },
    /* A CLOSE COMPANION PULLING ON THE ENVELOPE. Declared by all four
     * archetypes from one shared recipe — see stellar-common.js. It reuses
     * the tidal-locking slider and renames the dial rather than adding a
     * second control for the same idea (D27). */
    axes: binaryCompanion(SWELL.giant),

    climate: stellarClimate(0.48),

    colorProfile: {
      /* COOL, AS STARS GO — 2,000-4,000 C, which is the red end of the table.
       * The one archetype here whose hue band is genuinely narrow, because a
       * blue red-giant is a contradiction rather than a stylistic choice. */
      hue: hueFromStars("red-dwarf", "orange", 14),
      secondaryRel: "analogous",
      order: ["shed-envelope", "photosphere", "convective", "h-shell",
              "he-shell", "degenerate-core"],
      layers: {
        /* DIMINISHED SATURATION AND BRIGHTNESS, FALLING OFF FURTHER TOWARD THE
         * OUTER LAYERS — the defining colour rule for this type, and the one
         * place in the family where the value profile is not monotone with
         * depth for cosmetic reasons but because the physics says so.
         *
         * Brightness climbs steeply inward. The outer envelope should look
         * tired; the core should look like it is still furious about
         * something. */
        "shed-envelope":   lit({ sat: [0.15, 0.40], val: [0.30, 0.50] }),
        photosphere:       lit({ sat: [0.30, 0.60], val: [0.45, 0.70] }),
        convective:        lit({ sat: [0.35, 0.65], val: [0.40, 0.65],
                                 /* A steep inward brightening across the
                                  * envelope, which is most of what carries
                                  * "the work is happening a long way down". */
                                 depthGradient: 0.78,
                                 heatGradient: 0.60 }),
        "h-shell":         lit({ sat: [0.50, 0.75], val: [0.70, 0.88],
                                 hueLean: 0.20,
                                 heatGradient: 0.78 }),
        "he-shell":        lit({ sat: [0.55, 0.80], val: [0.80, 0.95],
                                 hueLean: 0.26,
                                 heatGradient: 0.84 }),
        "degenerate-core": lit({ sat: [0.10, 0.40], val: [0.95, 1.00],
                                 hueLean: 0.34,
                                 heatGradient: 0.92 })
      }
    }
  };

  CC.Archetypes.register(OLD_GIANT_STAR);
})();
