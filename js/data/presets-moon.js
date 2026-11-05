/* Presets — the moon.
 *
 * Split out of js/data/presets.js, which passed the 500-line rule. Registered
 * into CC.Presets, which must load first; values are in the DOM control's own
 * units. Load order is gallery order, so these files stay in family order. */

var CC = CC || {};

(function () {
  "use strict";

  CC.Presets.register([
    /* ---- moon ---------------------------------------------------------
     *
     * SPANNED BY DIFFERENT AXES AGAIN, which is the pattern every family has
     * repeated. The solid ten are spanned by Ocean depth; a moon has no
     * surface sea, so that control does nothing here. The giants are spanned
     * by Starlight and Interior heat; on a moon Starlight does something much
     * sharper than "warmer" — it DECIDES THE STACK, because the ice shell is
     * gated on the body being cold. So the first axis is literally which of
     * the two moons you get.
     *
     * The three that follow are Interior heat (is the sea liquid, is the core
     * dead), Tidal locking (a moon is more likely to be locked than anything
     * else in the generator) and Star activity (an airless moon has no
     * shielding, so a violent star strips it bare — the strongest case for
     * that control in the whole roadmap). */

    {
      id: "ice-shelled-moon",
      label: "Ice-Shelled Moon",
      archetype: "moon",
      /* THE EUROPA CASE, and the best cutaway in the solid family: the ocean
       * is invisible from outside, so cutting the body open is the only way
       * to see it. Cold enough to guarantee the shell, with enough interior
       * heat to keep the water under it liquid — which is the two-temperature
       * claim the archetype exists to make. */
      blurb: "A frozen shell, a hidden ocean, and nobody has been down there.",
      set: {
        "starlight": 10,
        "interior-heat": 62,
        "star-activity": 20,
        "optional-layers": 100,
        "tidal-lock": 55,
        "primary-hue": 205,
        "saturation": 78,
        "brightness": 104,
        "contrast": 112,
        "detail-density": 78
      },
      traits: ["mineral-veins"],
      traitsOff: []
    },
    {
      id: "battered-grey-moon",
      label: "Battered Grey Moon",
      archetype: "moon",
      /* THE OTHER BRANCH, and the roadmap's named case for Star activity: an
       * airless moon has no shielding, so a violent star scours it. Warm
       * enough that no shell forms, so the cratered crust is the surface and
       * the regolith is all the cover there is — and most of that is stripped.
       * A dead core, because a dead moon is the common case. */
      blurb: "Cratered, airless and scoured. Nothing here has changed in an age.",
      set: {
        "starlight": 72,
        "interior-heat": 8,
        "star-activity": 88,
        "optional-layers": 25,
        "tidal-lock": 78,
        "primary-hue": 38,
        "saturation": 62,
        "brightness": 98,
        "contrast": 120,
        "detail-density": 82
      },
      traits: ["cratered", "impact-basin"],
      traitsOff: []
    },
    {
      id: "tidally-heated-moon",
      label: "Tidally Heated Moon",
      archetype: "moon",
      /* THE IO CASE. Interior heat at the top of the dial on a body whose
       * mantle is authored to lean only weakly — so it reads as a genuinely
       * warm moon rather than as a small planet, which is what the halved
       * `heatLean` figures exist to guarantee. No shell: this one is too hot
       * for its own good. */
      blurb: "Squeezed by its planet until the inside runs molten.",
      set: {
        "starlight": 30,
        "interior-heat": 100,
        "star-activity": 45,
        "optional-layers": 40,
        "tidal-lock": 95,
        "primary-hue": 22,
        "saturation": 104,
        "brightness": 106,
        "contrast": 114,
        "detail-density": 80
      },
      traits: ["magma-chambers", "mineral-veins"],
      traitsOff: []
    },
    {
      id: "frozen-dead-moon",
      label: "Frozen Dead Moon",
      archetype: "moon",
      /* THE FAILURE CASE, STATED HONESTLY. Cold enough for a shell and with a
       * core too dead to keep anything liquid under it, so the sea freezes
       * through — and the card SAYS so rather than promising an ocean the
       * picture cannot support. Worth a preset because it is the one position
       * where the two-temperature machinery reports a negative, and a user
       * should be able to reach it deliberately. */
      blurb: "Frozen all the way down. Whatever ocean was here is part of the shell now.",
      set: {
        "starlight": 4,
        "interior-heat": 3,
        "star-activity": 12,
        "optional-layers": 100,
        "tidal-lock": 40,
        "primary-hue": 228,
        "saturation": 54,
        "brightness": 96,
        "contrast": 118,
        "detail-density": 70
      },
      traits: ["void-pockets"],
      traitsOff: []
    }
  ]);
})();
