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
 * says which it wants. */

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
        "background": "starfield"
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
