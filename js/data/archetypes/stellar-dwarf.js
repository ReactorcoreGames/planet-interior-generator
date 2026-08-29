/* `dwarf-star` — small, dim, extremely long-lived, and FULLY CONVECTIVE.
 *
 * The absence is the signature: no radiative zone at all, so the convection
 * runs unbroken from the fusion core to the photosphere and its flow loops
 * span most of the body. A dwarf's cutaway is legible precisely because it is
 * missing the thing every other star has.
 *
 * Not simply the calmest of the four, either — the spec has this archetype
 * biasing Star activity HIGH by default. Feeble corona, furious surface.
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
   * dwarf-star
   *
   * Small, dim, extremely long-lived, and FULLY CONVECTIVE — no radiative zone
   * at all. The absence is the signature: the convection runs unbroken from
   * the fusion core to the photosphere, so its flow loops span most of the
   * body rather than being confined to a shell.
   * ------------------------------------------------------------------ */

  var DWARF_STAR = {
    id: "dwarf-star",
    label: "Dwarf star",
    family: "stellar",
    /* `fully-convective` is a real tag with a real consumer — it is what the
     * element table reads to give this body's convection its full-depth flow
     * loops, and what gates the heavy-spotting traits. */
    tags: ["stellar", "luminous", "no-surface", "has-corona", "has-chromosphere",
           "convective-envelope", "fully-convective", "spotted"],
    statTemplate: "stellar",

    radiusKm: [100000, 500000],
    gravityScale: 62000,

    stack: [
      /* A WEAK CORONA, and an optional one. Guaranteed by halfway up the
       * slider; a dwarf's is genuinely feeble and short. */
      /* FEEBLE CORONA, FURIOUS SURFACE — and the two figures below are the
       * whole of that sentence. The dwarf is not simply the calmest star: the
       * spec has it biasing activity HIGH, so its chromosphere is the most
       * agitated fringe in the family while the thin halo above it barely
       * moves. Reading the archetype as "quiet" and damping both would have
       * thrown away its signature. */
      corona([0.06, 0.15], 0.26, { base: 0.10, peak: 0.26,
                                   driver: "starActivity" },
             /* FURIOUS SURFACE, FEEBLE CORONA — and this is the "furious"
              * half. MORE plumes than a main star and SHORTER ones: a dwarf's
              * halo is thin, so a tall plume would simply leave it, and what
              * the archetype wants is a dense agitated fringe rather than
              * long tongues. The two numbers pull opposite ways deliberately;
              * a single "activity" multiplier could not have said this. */
             { plume: { count: 1.35, size: 0.62 } }, 2.0),
      chromosphere([0.978, 1.008], { base: 0.18, peak: 0.54,
                                     driver: "starActivity" }),
      {
        role: "photosphere",
        /* HEAVILY SPOTTED. The starspot elements in the element table run far
         * larger here than on a main star — proportionally much larger, as the
         * spec insists — which is what makes a dwarf recognisable at a glance
         * even before the interior is read. */
        frac: [0.930, 0.970],
        boundary: "slight",
        /* A DIM ENVELOPE OVER A FIERCE CORE, and the strongest darkening of
         * the four surfaces: a dwarf's disc genuinely falls away hard, which
         * is what makes the small body read as a compact sphere rather than
         * as a coloured dot. */
        limbDarkening: LIMB.surface * 1.15,
        /* See THIN LAYERS NEED CAPS. Uncapped this rolled 0.555 thick — more
         * than half the body — and buried the fully-convective interior that
         * is the entire reason this archetype exists. */
        maxThickness: 0.058
      },
      {
        role: "convective",
        /* FULLY CONVECTIVE — FROM THE CORE TO THE SURFACE, IN ONE LAYER.
         *
         * Eight tenths of the radius as a single convecting shell, with no
         * radiative zone anywhere beneath it. That absence IS the archetype:
         * a dwarf's cutaway is legible precisely because it is missing the
         * thing every other star has, and the flow loops the element table
         * draws here are long and continuous rather than confined to a band. */
        frac: [0.120, 0.920],
        boundary: "irregular",
        limbDarkening: LIMB.interior
      },
      {
        role: "fusion-core",
        /* Slow, frugal burning. Small, and it will still be doing this when
         * every other star in the generator has died. */
        frac: [0.050, 0.110],
        boundary: "near-perfect",
        bias: "coreBias"
      }
    ],

    /* 2,000-3,500 C. A dwarf burns slowly and frugally, which is exactly what
     * a low floor with real headroom above it says. */
    /* SMALL AND FIERCE, and the glow says both halves. It reaches the least
     * far of the four — a dwarf genuinely does not light much space — but the
     * veins are numerous and short and comparatively bright, which is the
     * flare-star signature the spec asks this archetype to bias toward. */
    emissiveGlow: {
      reach: 1.34,
      strength: 0.86,
      veins: { count: 110, length: [0.16, 0.52], alpha: 0.28, lean: 0.28 }
    },
    /* A CLOSE COMPANION PULLING ON THE ENVELOPE. Declared by all four
     * archetypes from one shared recipe — see stellar-common.js. It reuses
     * the tidal-locking slider and renames the dial rather than adding a
     * second control for the same idea (D27). */
    axes: binaryCompanion(SWELL.dwarf),

    climate: stellarClimate(0.42),

    colorProfile: {
      /* THE RED END, from the table's own red dwarf row outward. Narrow for
       * the same reason the old giant's is: a dwarf star is cool, and cool has
       * a colour. */
      hue: hueFromStars("red-dwarf", "orange", 16),
      secondaryRel: "analogous",
      order: ["corona", "chromosphere", "photosphere", "convective",
              "fusion-core"],
      layers: {
        /* LOW-TO-MODERATE SATURATION, VERY BRIGHT CORE, DIM ENVELOPE — a small
         * fierce point. The value SPREAD across this stack is the widest in
         * the family: 0.40 at the corona against 1.00 at the core, where a
         * main star runs 0.55 to 1.00. That contrast is what "a small fierce
         * point" means in numbers. */
        corona:         lit({ sat: [0.25, 0.55], val: [0.40, 0.65] }),
        chromosphere:   lit({ sat: [0.40, 0.70], val: [0.55, 0.80] }),
        photosphere:    lit({ sat: [0.40, 0.70], val: [0.60, 0.85],
                              heatLean: { hue: [30, 54], amount: 0.22,
                                          ceiling: false } }),
        convective:     lit({ sat: [0.45, 0.75], val: [0.50, 0.75],
                              depthGradient: 0.66,
                              heatGradient: 0.68 }),
        "fusion-core":  lit({ sat: [0.20, 0.50], val: [0.90, 1.00],
                              hueLean: 0.28,
                              heatGradient: 0.92 })
      }
    }
  };

  CC.Archetypes.register(DWARF_STAR);
})();
