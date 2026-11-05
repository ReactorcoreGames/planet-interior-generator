/* Presets — the asteroid.
 *
 * Split out of js/data/presets.js, which passed the 500-line rule. Registered
 * into CC.Presets, which must load first; values are in the DOM control's own
 * units. Load order is gallery order, so these files stay in family order. */

var CC = CC || {};

(function () {
  "use strict";

  CC.Presets.register([
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
        "caverns": 0,
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
        "caverns": 8,
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
      traits: ["ore-deposits"],
      traitsOff: ["shattered"]
    },
    {
      id: "ice-hauler",
      label: "Ice Hauler",
      archetype: "asteroid",
      /* THE REASON TO GO. A cold carbonaceous body with water packed into
       * the voids — fuel, air and shielding from one hole in the ground.
       * NO TRAIT: the ice is the mosaic's own `voidIce`, driven by Starlight
       * (ASTEROID-OVERHAUL §3). Starlight low so the voids keep their ice;
       * Cohesion mid-low so there are voids for it to sit in. */
      blurb: "Water ice in every gap. Out here that is fuel, air and shielding at once.",
      set: {
        "cohesion": 30,
        "caverns": 45,
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
      traits: [],
      traitsOff: []
    },
    {
      id: "hollowed-rock",
      label: "Hollowed Rock",
      archetype: "asteroid",
      /* THE PHASE DOC'S OWN "most evocative" ENTRY: "an asteroid with
       * something built inside it". The chamber half went with the retired
       * `hollowed-out` trait (ASTEROID-OVERHAUL §4) and is back as a position
       * on the Caverns axis (§7): near the top, so the interior is mined
       * halls and bores, with the plant on the crust and a borer still
       * working. Cohesion held above the cap's ramp so all of it stands. */
      blurb: "Somebody got here first. Halls and bores right through it, and the plant still bolted to the crust.",
      set: {
        "cohesion": 62,
        "caverns": 96,
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
      traits: ["mining-station", "tunnel-borer"],
      traitsOff: ["shattered"]
    }
  ]);
})();
