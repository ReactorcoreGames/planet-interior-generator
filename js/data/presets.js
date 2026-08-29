/* Presets — the browsable menu of world types, without making them archetypes.
 *
 * A PRESET IS NOTHING BUT A STORED SET OF CONTROL VALUES (PARAMETERS.md). It
 * is not a body type, it has no runtime state, and once applied it is simply
 * where the sliders happen to be sitting. That is why "frozen desert with a
 * dying core" and "tidally locked ocean world" are both reachable: they are
 * parameter positions rather than types that would have had to be reconciled
 * by hand.
 *
 * The `set` object is keyed by CONTROL ID, in the units the DOM control uses
 * (0-100 for a percentage slider, degrees for a hue) rather than the normalized
 * units the pipeline consumes — because these are literally control values and
 * ui/presets.js writes them straight through CC.Controls.set.
 *
 * `traits` names traits to force ON, and `traitsOff` names traits to exclude
 * from the roll. Both go through the picker's existing tri-state rather than a
 * second mechanism.
 *
 * WHAT A PRESET DELIBERATELY DOES NOT SET: the seed. PARAMETERS.md is explicit
 * that applying one leaves the seed alone, so a user can try every preset on
 * the same body and compare — which is far more informative than each preset
 * arriving with a different world underneath it.
 *
 * The ten solid presets are PARAMETERS.md#presets exactly. Other families'
 * presets land with their phases; `archetype` is stored on each so the gallery
 * can filter, and so that when a moon or an asteroid exists the entry already
 * says which it wants.
 *
 * A PRESET IS PER ARCHETYPE, NOT PER FAMILY, because `archetype` is what the
 * gallery filters on — so `gas-giant` and `ice-giant` carry their own sets
 * even though they share a family and most of their machinery. The seven
 * gaseous entries landed after Phase 5; see the block comment above them for
 * why they are spanned by different axes than the solid ten. */

var CC = CC || {};

CC.Presets = (function () {
  "use strict";

  var LIST = [
    {
      id: "desert-world",
      label: "Desert World",
      archetype: "planet",
      blurb: "No sea at all. Dust, rock and a thin dry sky.",
      set: {
        "ocean-depth": 0,
        "starlight": 68,
        "interior-heat": 45,
        "axial-tilt": 12,
        "tidal-lock": 0,
        "primary-hue": 28,
        "saturation": 78,
        "brightness": 108,
        "star-activity": 45
      },
      traitsOff: ["ring-system"]
    },
    {
      id: "ocean-world",
      label: "Ocean World",
      archetype: "planet",
      /* Ocean depth past ~90 drowns every peak, which is the point — this is
       * the world with no coastline anywhere. */
      blurb: "Drowned. The crust is a floor, not a shore.",
      set: {
        "ocean-depth": 94,
        "starlight": 52,
        "interior-heat": 55,
        "axial-tilt": 8,
        "tidal-lock": 0,
        "primary-hue": 205,
        "saturation": 112,
        "brightness": 104,
        "star-activity": 22
      }
    },
    {
      id: "frozen-world",
      label: "Frozen World",
      archetype: "planet",
      /* NO ice-caps TRAIT, and there must never be one — D27 cut it, and caps
       * emerge from a lowered snowline instead. Low Starlight IS the ice. */
      blurb: "Far from its star. The caps have met in the middle.",
      set: {
        "ocean-depth": 22,
        "starlight": 14,
        "interior-heat": 18,
        "axial-tilt": 5,
        "tidal-lock": 0,
        "primary-hue": 198,
        "saturation": 62,
        "brightness": 96,
        "star-activity": 18
      }
    },
    {
      id: "volcanic-world",
      label: "Volcanic World",
      archetype: "planet",
      blurb: "Molten to the roots. The crust is a lid, and a thin one.",
      set: {
        /* DRY, DELIBERATELY. An earlier version asked for 6% ocean, which sits
         * below the depth at which water is drawn at all (see seaDepthOf's
         * MIN_VISIBLE_SEA) — so the slider read as "there is a sea" while the
         * render and the card both correctly said there was not. A preset
         * should not sit in a parameter's dead zone. */
        "ocean-depth": 0,
        "starlight": 62,
        "interior-heat": 100,
        "axial-tilt": 10,
        "tidal-lock": 0,
        "primary-hue": 16,
        "saturation": 128,
        "brightness": 112,
        "contrast": 120,
        "star-activity": 40
      },
      traits: ["magma-chambers"]
    },
    {
      id: "dead-world",
      label: "Dead World",
      archetype: "planet",
      /* Interior heat 0 leaves a thin liquid shell rather than removing the
       * outer core — the core freezes inward, it does not vanish (D16). */
      blurb: "Cold to the core. Nothing has resurfaced here in an age.",
      set: {
        "ocean-depth": 0,
        "starlight": 34,
        "interior-heat": 0,
        "optional-layers": 0,
        "axial-tilt": 6,
        "tidal-lock": 0,
        "primary-hue": 34,
        "saturation": 26,
        "brightness": 88,
        "star-activity": 55
      },
      traits: ["cratered"]
    },
    {
      id: "garden-world",
      label: "Garden World",
      archetype: "planet",
      blurb: "Air, water and a temperate band. The rare one.",
      set: {
        /* STARLIGHT IS THE WHOLE PRESET. At 53 the equator came out at 142 C —
         * a steam world with a temperate ribbon, not a garden. The habitable
         * band is narrower than it looks, because the latitude term
         * redistributes rather than adds: the figure that matters is the
         * equatorial peak, not the mean. */
        "ocean-depth": 45,
        "starlight": 44,
        "interior-heat": 52,
        "optional-layers": 100,
        "axial-tilt": 14,
        "tidal-lock": 0,
        "primary-hue": 212,
        "saturation": 104,
        "brightness": 106,
        "star-activity": 20
      }
    },
    {
      id: "locked-world",
      label: "Locked World",
      archetype: "planet",
      blurb: "One face bakes, one freezes, and there is a ribbon between.",
      set: {
        "ocean-depth": 38,
        "starlight": 66,
        "interior-heat": 50,
        "axial-tilt": 0,
        "tidal-lock": 100,
        "tidal-facing": 90,
        "primary-hue": 30,
        "saturation": 98,
        "brightness": 104,
        "star-activity": 35
      }
    },
    {
      id: "rogue-world",
      label: "Rogue World",
      archetype: "planet",
      /* Starlight 0 is a REAL STATE (D40), not an edge case: a planet with no
       * star at all, warm only where its own core keeps it warm. The card says
       * so, because `dayLength` reads the same zero. */
      blurb: "Unlit and adrift. Only its own core keeps it warm.",
      set: {
        "ocean-depth": 12,
        "starlight": 0,
        "interior-heat": 88,
        "axial-tilt": 0,
        "tidal-lock": 0,
        "primary-hue": 250,
        "saturation": 74,
        "brightness": 92,
        "star-activity": 0,
        "background": "solid",
        "stars": true
      }
    },
    {
      id: "tilted-world",
      label: "Tilted World",
      archetype: "planet",
      /* Past halfway the poles become the WARM regions and the equator
       * freezes — the Uranus case, and the strongest single demonstration
       * that the caps are emergent rather than drawn. */
      blurb: "Lying on its side. The equator is the cold part.",
      set: {
        "ocean-depth": 30,
        "starlight": 44,
        "interior-heat": 48,
        "axial-tilt": 88,
        "tidal-lock": 0,
        "primary-hue": 186,
        "saturation": 92,
        "brightness": 100,
        "star-activity": 25
      }
    },
    {
      id: "irradiated-world",
      label: "Irradiated World",
      archetype: "planet",
      /* COLD AND LETHALLY IRRADIATED is a reachable combination, and it is the
       * one that proves `radiation` is driven by Star activity and shielding
       * rather than by temperature (HAZARDS.md). A blue giant, a violent one,
       * and no air to stand in the way. */
      blurb: "A violent star and nothing between it and the ground.",
      set: {
        "ocean-depth": 4,
        "starlight": 40,
        "star-colour": "blue-giant",
        "star-activity": 100,
        "interior-heat": 8,
        "optional-layers": 0,
        "axial-tilt": 18,
        "tidal-lock": 0,
        "primary-hue": 46,
        "saturation": 58,
        "brightness": 98
      },
      traits: ["cratered"]
    },

    /* ------------------------------------------------------------------ *
     * Gaseous — gas-giant and ice-giant
     * ------------------------------------------------------------------ *
     *
     * A GIANT'S PRESETS ASK DIFFERENT QUESTIONS, which is D78's stat-card
     * lesson one level up. The solid presets are spanned by "how much sea,
     * how much air, how tilted" — every one of them is a claim about a
     * SURFACE. A giant has none, so those axes do not merely take different
     * values here, they do not apply.
     *
     * What separates one giant from another is:
     *
     *   1. STARLIGHT, which is the big one, because it moves the cloud deck.
     *      Cold gives a pale ammonia deck at sharp banding; hot drives the
     *      condensation level below the visible layer and leaves dark, ruddy,
     *      cloud-stripped gas. That is the phase's named done-condition
     *      (roadmap/phase-5-gaseous.md) and it is worth two presets on its
     *      own, at the two ends.
     *   2. INTERIOR HEAT, which is whether the thing still glows from within.
     *   3. TRAITS, which carry the named features — one Great Storm, a ring
     *      system, an industry.
     *
     * So the set below is temperature x industry x ornament. `ocean-depth`
     * and `tidal-lock` are deliberately absent from every one of them: they
     * are surface controls, and setting them here would be the "planet's card
     * with holes in it" mistake in preset form.
     *
     * NOTE ON HUE. A giant's primary hue drives the envelope, and the cloud
     * deck's `climateLean` perturbs it rather than replacing it (see
     * js/data/archetypes/gaseous.js). So these hues are chosen to be a good
     * BASE for that perturbation, not to be the colour you end up seeing. */

    {
      id: "banded-giant",
      label: "Banded Giant",
      archetype: "gas-giant",
      /* The Jupiter case, and the family's baseline picture. Cold enough for
       * a pale ammonia deck at full sharpness, with a Great Storm sitting IN
       * a belt of smaller ones — D83, which is exactly the combination that
       * was wrongly forbidden and is the best-looking one the family has. */
      blurb: "Cream and ochre bands, and one storm bigger than a world.",
      set: {
        "starlight": 30,
        "interior-heat": 60,
        "star-activity": 25,
        "optional-layers": 80,
        "primary-hue": 34,
        "saturation": 96,
        "brightness": 104,
        "contrast": 118
      },
      traits: ["great-storm", "storm-belts"],
      traitsOff: ["ring-system"]
    },
    {
      id: "hot-jupiter",
      label: "Hot Jupiter",
      archetype: "gas-giant",
      /* THE STARLIGHT DEMONSTRATION, at the opposite end from Banded Giant.
       * Same family, same machinery, and the deck is driven below the visible
       * layer: what is left is the deeper chromophore-stained gas, dark and
       * saturated, with the banding washed out rather than drawn differently.
       * Star activity is high because a world this close to its star is being
       * scoured by it. */
      blurb: "Close enough to bake. The clouds are far below, and it shows.",
      set: {
        "starlight": 96,
        "interior-heat": 74,
        "star-activity": 78,
        "optional-layers": 40,
        "primary-hue": 18,
        "saturation": 120,
        "brightness": 88,
        "contrast": 96
      },
      traits: ["violent-banding"],
      traitsOff: ["ring-system"]
    },
    {
      id: "ringed-giant",
      label: "Ringed Giant",
      archetype: "gas-giant",
      /* The Saturn case, where THE RINGS ARE THE SUBJECT and the body is the
       * calm pale thing they orbit. Deliberately low contrast and a soft
       * near-cream envelope: a busy body would fight its own rings, and the
       * storms are switched off for the same reason. */
      blurb: "Pale and quiet. Everything interesting is in orbit.",
      set: {
        "starlight": 24,
        "interior-heat": 44,
        "star-activity": 20,
        "optional-layers": 70,
        "primary-hue": 44,
        "saturation": 62,
        "brightness": 112,
        "contrast": 88
      },
      traits: ["ring-system"],
      traitsOff: ["great-storm", "violent-banding"]
    },
    {
      id: "industrial-giant",
      label: "Industrial Giant",
      archetype: "gas-giant",
      /* THE INHABITED ONE. Both industry traits at once, because a platform
       * without skimmer tracks is a building with no traffic — the two read
       * as one economy rather than as two ornaments. Mid Starlight so the
       * deck is present and legible: the platforms need cloud to be working
       * ABOVE, and D80's hull material is deliberately near-neutral so it
       * reads as an intruder against whatever the envelope is doing. */
      blurb: "Somebody is down there, skimming the clouds for fuel.",
      set: {
        "starlight": 52,
        "interior-heat": 56,
        "star-activity": 30,
        "optional-layers": 75,
        "primary-hue": 30,
        "saturation": 84,
        "brightness": 100,
        "contrast": 110
      },
      traits: ["gas-miner-platforms", "skimmer-tracks"]
    },
    {
      id: "ice-giant",
      label: "Ice Giant",
      archetype: "ice-giant",
      /* THE NEPTUNE BASELINE — the ice giant as you would picture it, so the
       * hue is the deep blue the family is known for and the interior runs
       * cool. Helium rain is the signature interior feature (D87: it BEADS,
       * a fluid leaving a fluid) and it is the one that says "this is not
       * simply a smaller gas giant". */
      blurb: "Deep blue and bitterly cold, with helium falling through it.",
      set: {
        "starlight": 16,
        "interior-heat": 34,
        "star-activity": 20,
        "optional-layers": 78,
        "primary-hue": 208,
        "saturation": 104,
        "brightness": 96,
        "contrast": 104
      },
      traits: ["helium-rain"],
      traitsOff: ["ring-system"]
    },
    {
      id: "diamond-sea",
      label: "Diamond Sea",
      archetype: "ice-giant",
      /* D92, corrected by looking up the physics: methane cracks under
       * pressure, the carbon compresses into diamond, and the crystals SINK
       * through the deep envelope until it is hot enough that they melt into
       * liquid carbon. So there is no diamond floor — the picture is the fall
       * itself, which is why this preset runs a HOT interior. A cold one
       * would not be doing the thing the name describes. */
      blurb: "Carbon crushed into crystal, falling through the deep envelope.",
      set: {
        "starlight": 22,
        "interior-heat": 88,
        "star-activity": 25,
        "optional-layers": 85,
        "primary-hue": 196,
        "saturation": 92,
        "brightness": 100,
        "contrast": 112
      },
      traits: ["diamond-rain"],
      traitsOff: ["ring-system"]
    },
    {
      id: "prismatic-giant",
      label: "Prismatic Giant",
      archetype: "ice-giant",
      /* Exotic water-ice phases (ice VII, ice X) growing CROSSWISE in the
       * mantle's shear rather than falling through it — D92's other half, and
       * the family's one genuine excuse for colour, since the crystals are
       * actually birefringent. The narrow per-body hue band means this preset
       * looks different on each seed while never reading as confetti. Raised
       * contrast because the whole point is a refraction effect. */
      blurb: "Exotic ice, growing sideways, splitting the light.",
      set: {
        "starlight": 20,
        "interior-heat": 62,
        "star-activity": 22,
        "optional-layers": 88,
        "primary-hue": 232,
        "saturation": 110,
        "brightness": 98,
        "contrast": 124
      },
      traits: ["prismatic-ice"],
      traitsOff: ["ring-system"]
    },

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
      traitsOff: ["ring-system", "debris-belt", "flare-storms"]
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
      traitsOff: ["ring-system", "debris-belt"]
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
      traitsOff: ["ring-system"]
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
      traitsOff: ["ring-system"]
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
      traitsOff: ["ring-system", "starspot-clusters"]
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
      traitsOff: ["ring-system", "debris-belt", "flare-storms"]
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
    },

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
    },

    /* ==================================================================
     * ASTEROIDS. Four, and the axis that separates them is COHESION —
     * which is the point of the family. Every other body in this file is
     * distinguished from its neighbours by temperature, by water or by
     * what its interior is doing; an asteroid is distinguished by how
     * solidly it holds together, and the four here are that dial at four
     * settings with the composition moved to match.
     *
     * The pairing to look at is Rubble Pile against Iron Fragment: same
     * archetype, opposite ends of one slider, and they do not read as the
     * same picture at different settings — one is a bag of gravel with
     * holes in it and the other is a solid block. That is what earned
     * Cohesion a slider rather than two mutually-exclusive traits.
     * ================================================================== */

    {
      id: "rubble-pile",
      label: "Rubble Pile",
      archetype: "asteroid",
      /* THE LOOSE END, and the body the spec's flavour is written about:
       * "more a flying rubble pile than a world. Plenty of places to hide
       * inside." Cohesion at the floor gives the most fragments, the
       * largest voids and the widest joints all at once. */
      blurb: "Barely one object. A few hundred fragments held together by gravity, and not much of that.",
      set: {
        "cohesion": 4,
        "starlight": 30,
        "interior-heat": 12,
        "boundary-irregularity": 100,
        "optional-layers": 85,
        "primary-hue": 28,
        "saturation": 78,
        "brightness": 96,
        "contrast": 112,
        "detail-density": 72
      },
      traits: ["shattered"],
      traitsOff: []
    },
    {
      id: "iron-fragment",
      label: "Iron Fragment",
      archetype: "asteroid",
      /* THE TIGHT END, and Rubble Pile's twin. Cohesion at the ceiling
       * gives few large welded blocks and almost no void — the exposed
       * core of a body that was destroyed, which is what a metallic
       * asteroid actually is. Warm hue and high saturation put the
       * composition line on "Metallic". */
      blurb: "The exposed heart of something larger. Solid metal, and no easy way into it.",
      set: {
        "cohesion": 96,
        "starlight": 38,
        "interior-heat": 30,
        "boundary-irregularity": 85,
        "optional-layers": 40,
        "primary-hue": 22,
        "saturation": 96,
        "brightness": 88,
        "contrast": 120,
        "detail-density": 62
      },
      traits: ["metal-rich", "ore-deposits"],
      traitsOff: ["shattered"]
    },
    {
      id: "ice-hauler",
      label: "Ice Hauler",
      archetype: "asteroid",
      /* THE REASON TO GO. A cold carbonaceous body with water packed into
       * the voids — fuel, air and shielding from one hole in the ground.
       * Cohesion mid-low so there are voids for the ice to sit in, which
       * is the coupling that makes the trait and the slider one picture
       * rather than two. */
      blurb: "Water ice in every gap. Out here that is fuel, air and shielding at once.",
      set: {
        "cohesion": 30,
        "starlight": 14,
        "interior-heat": 5,
        "boundary-irregularity": 92,
        "optional-layers": 90,
        "primary-hue": 205,
        "saturation": 62,
        "brightness": 94,
        "contrast": 110,
        "detail-density": 76
      },
      traits: ["ice-rich"],
      traitsOff: []
    },
    {
      id: "hollowed-rock",
      label: "Hollowed Rock",
      archetype: "asteroid",
      /* THE PHASE DOC'S OWN "most evocative" ENTRY: "a low-Cohesion
       * asteroid with something built inside it". Both artificial traits
       * at once, so the chamber and the plant that dug it read as one
       * story — the workings are bolted to the crust and the space they
       * excavated is underneath them. */
      blurb: "Somebody got here first. There is a chamber inside it that nothing natural cut.",
      set: {
        "cohesion": 62,
        "starlight": 42,
        "interior-heat": 18,
        "boundary-irregularity": 88,
        "optional-layers": 70,
        "primary-hue": 36,
        "saturation": 70,
        "brightness": 92,
        "contrast": 116,
        "detail-density": 68
      },
      traits: ["hollowed-out", "mining-station"],
      traitsOff: ["shattered"]
    }
  ];

  var byId = {};
  LIST.forEach(function (p) { byId[p.id] = p; });

  function all() { return LIST.slice(); }
  function get(id) { return byId[id] || null; }
  function forArchetype(a) {
    return LIST.filter(function (p) { return p.archetype === a; });
  }

  return { all: all, get: get, forArchetype: forArchetype };
})();
