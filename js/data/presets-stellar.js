/* Presets — the four stars.
 *
 * Split out of js/data/presets.js, which passed the 500-line rule. Registered
 * into CC.Presets, which must load first; values are in the DOM control's own
 * units. Load order is gallery order, so these files stay in family order. */

var CC = CC || {};

(function () {
  "use strict";

  CC.Presets.register([
    /* ================================================================== *
     * STELLAR - the eight, and they are spanned by DIFFERENT AXES again
     *
     * The solid ten are spanned by Ocean depth, Starlight and tidal locking.
     * The gaseous seven dropped the first and kept the other two, because
     * Ocean depth is a claim about a surface.
     *
     * A STAR DROPS STARLIGHT TOO, and that is not a small edit - it is the
     * largest single axis the other families are spanned by, and on a star it
     * is INERT BY DECLARATION (`starlit: false`). Setting it in a stellar
     * preset would be worse than useless: it would look like a knob that does
     * something. Every entry below therefore leaves it out entirely, which is
     * also a check on the done-condition - if these presets differ from each
     * other, they do it without the axis the rest of the generator leans on.
     *
     * WHAT SPANS THEM INSTEAD:
     *
     *   ARCHETYPE      doing far more work here than in any other family. The
     *                  four stellar archetypes are four different STRUCTURES -
     *                  which zone convects, which radiates, whether there is a
     *                  radiative zone at all - where planet and gas giant
     *                  differ mostly in material.
     *   STAR ACTIVITY  the family's own axis, and the one control with two
     *                  consumers. It is what separates Quiet Sun from Angry
     *                  Star on an otherwise identical body.
     *   INTERIOR HEAT  which on a star is its surface temperature and
     *                  therefore its colour, via the `selfHeated` floor.
     *   CORE SIZE BIAS which on an old giant is the difference between a small
     *                  core and an absurd one.
     * ================================================================== */

    {
      id: "quiet-sun",
      label: "Quiet Sun",
      archetype: "main-star",
      /* PARAMETERS.md names this one. The reference star at solar minimum:
       * clean limb, few spots, and the tachocline visible because Optional
       * layers is high enough to roll it. The point of the preset is that the
       * STRUCTURE is the subject when nothing else is going on. */
      blurb: "Stable and clean. The convective and radiative zones, and the shear line between them.",
      set: {
        "interior-heat": 52,
        "star-activity": 8,
        "optional-layers": 92,
        "core-bias": 10,
        "primary-hue": 48,
        "saturation": 92,
        "brightness": 104,
        "contrast": 108
      },
      traitsOff: ["flare-storms"]
    },
    {
      id: "angry-star",
      label: "Angry Star",
      archetype: "main-star",
      /* PARAMETERS.md names this one too, and it is Quiet Sun's twin: the same
       * archetype and nearly the same numbers with ONE axis moved. That
       * pairing is the clearest demonstration in the set that Star activity is
       * a real control rather than a label - prominences, spots and flare
       * storms all come from the one figure. */
      blurb: "The same star, furious. Prominences, heavy spotting, flares without warning.",
      set: {
        "interior-heat": 62,
        "star-activity": 100,
        "optional-layers": 80,
        "core-bias": 0,
        "primary-hue": 40,
        "saturation": 104,
        "brightness": 108,
        "contrast": 112
      },
      traits: ["prominences", "starspot-clusters", "flare-storms"],
      traitsOff: []
    },
    {
      id: "red-giant",
      label: "Red Giant",
      archetype: "old-giant-star",
      /* THE ABSURD RATIO, AIMED AT DELIBERATELY. Core size bias is pushed to
       * the BOTTOM of its range, which on this archetype means a degenerate
       * core at two per cent of the radius - about one part in a hundred
       * thousand of the volume - under an envelope filling the frame. That
       * contrast is the most striking thing this family produces and it should
       * have a preset that goes straight at it. */
      blurb: "Enormous, tired, and mostly empty. The part doing the work is smaller than a planet.",
      set: {
        "interior-heat": 34,
        "star-activity": 30,
        "optional-layers": 88,
        "core-bias": -95,
        "primary-hue": 16,
        "saturation": 86,
        "brightness": 92,
        "contrast": 116
      },
      traits: ["shed-shells", "dust-formation"],
      traitsOff: []
    },
    {
      id: "dying-giant",
      label: "Dying Giant",
      archetype: "old-giant-star",
      /* The late stage, and the one body in the generator that has EATEN
       * something. Dredge-up and an engulfed planet together tell the whole
       * story of a star at the end: it is bringing its own ash to the surface
       * and it has swallowed its inner system doing it. */
      blurb: "It swallowed its inner planets on the way up, and it is bringing its own ash to the surface.",
      set: {
        "interior-heat": 26,
        "star-activity": 44,
        "optional-layers": 96,
        "core-bias": -70,
        "primary-hue": 8,
        "saturation": 94,
        "brightness": 86,
        "contrast": 124
      },
      traits: ["engulfed-planet", "dredge-up", "pulsating", "shed-shells"],
      traitsOff: []
    },
    {
      id: "flare-star",
      label: "Flare Star",
      archetype: "dwarf-star",
      /* THE DWARF'S SIGNATURE, and stars.md is explicit that this archetype
       * should bias activity HIGH by default - heavy spotting and frequent
       * flares are what a red dwarf is known for. `heavy-spotting` rather than
       * the ordinary spot trait, because the spec insists a dwarf's spots are
       * proportionally much larger. */
      blurb: "Small, dim, and prone to flares that would strip an atmosphere off anything close.",
      set: {
        "interior-heat": 40,
        "star-activity": 94,
        "optional-layers": 70,
        "core-bias": 15,
        "primary-hue": 14,
        "saturation": 96,
        "brightness": 96,
        "contrast": 110
      },
      traits: ["heavy-spotting", "flare-storms", "prominences"],
      traitsOff: ["starspot-clusters"]
    },
    {
      id: "patient-ember",
      label: "Patient Ember",
      archetype: "dwarf-star",
      /* Flare Star's opposite, and the pairing does for the dwarf what
       * Quiet/Angry does for the main star. The hook is the lifespan line: a
       * body burning this slowly outlasts everything else in the catalogue,
       * and a calm render is what that should look like. Interior heat at the
       * bottom of the range puts it at the cool end of `surfaceC`. */
      blurb: "It burns so slowly it will still be here when the galaxy is dark.",
      set: {
        "interior-heat": 12,
        "star-activity": 10,
        "optional-layers": 55,
        "core-bias": -10,
        "primary-hue": 20,
        "saturation": 78,
        "brightness": 88,
        "contrast": 104
      },
      traitsOff: ["flare-storms"]
    },
    {
      id: "newborn-star",
      label: "Newborn Star",
      archetype: "young-star",
      /* THE INVERSION, WHICH IS THIS ARCHETYPE'S WHOLE REASON TO EXIST:
       * convection at the centre under a radiative envelope, the opposite of
       * the main-sequence arrangement. Vivid and energetic per the spec's
       * colour rule, and the ACCRETION DISC is on - a young star is still
       * surrounded by the material it is building planets out of, which is the
       * archetype's stated hook.
       *
       * IT USED TO BE `debris-belt`, and that was the right picture drawn by
       * the wrong trait: a debris belt is rock and ice sitting a fifth of a
       * body radius above a photosphere, where it would sublimate. The disc
       * says the same thing truthfully - see js/data/traits/orbital.js for the
       * gate that stopped stars being offered belts at all. */
      blurb: "Newly lit and inside out: the core convects, the envelope radiates. Still building planets.",
      set: {
        "interior-heat": 78,
        "star-activity": 82,
        "optional-layers": 85,
        "core-bias": 30,
        "primary-hue": 196,
        "saturation": 112,
        "brightness": 110,
        "contrast": 114
      },
      traits: ["accretion-disc", "prominences", "flare-storms"],
      /* `ring-system` and `debris-belt` are no longer offered on a star, so
       * there is nothing left here to switch off. */
      traitsOff: []
    },
    {
      id: "harvested-star",
      label: "Harvested Star",
      archetype: "main-star",
      /* "Any star wearing a Dyson swarm" is one of the three most-evocative
       * outputs stars.md names. The star itself is deliberately ORDINARY and
       * quiet - the subject is what was built around it, and an active star
       * would fight its own swarm the way a busy gas giant fights its rings
       * (see Ringed Giant, which is the same reasoning). */
      blurb: "Somebody got here first. The star is unremarkable; what orbits it is not.",
      set: {
        "interior-heat": 50,
        "star-activity": 18,
        "optional-layers": 78,
        "core-bias": 0,
        "primary-hue": 52,
        "saturation": 84,
        "brightness": 100,
        "contrast": 106
      },
      /* `dyson-structure` became `orbital-mirrors` when it stopped being a
       * swarm of capsules and became a ring of panels with glass faces turned
       * at the star. A preset naming a trait that no longer exists forces
       * nothing and reports nothing, which is the silent kind of failure
       * test/_tmp/starboot.mjs exists to catch.
       *
       * BOTH MEGASTRUCTURES NOW, because they stopped excluding one another —
       * and this preset is the one place in the gallery where that reads as
       * the point rather than as clutter. A star with mirrors AND collector
       * stations is a star somebody is taking seriously, which is exactly what
       * "somebody got here first" is meant to say.
       *
       * `ring-system` and `debris-belt` are no longer in the off list because
       * they are no longer offered on a star at all — they require the
       * `orbit-safe` tag now, which no star carries. Naming an ineligible
       * trait here would be harmless but misleading. */
      traits: ["orbital-mirrors", "stellar-collector"],
      traitsOff: []
    }
  ]);
})();
