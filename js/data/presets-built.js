/* Presets — megastructures on natural bodies (Phase 9b, D306).
 *
 * Registered into CC.Presets (js/data/presets.js), which must load first.
 * Values are in the DOM control's own units (0-100 for a percentage).
 *
 * ONE PER BUILT FAMILY THAT NEEDED A SHOWCASE: a planet wearing all three of
 * its orbital traits, a star inside an unfinished shell, a nebula with its
 * ringworld. The giants' skyhooks are already the subject of Industrial
 * Giant's neighbours, the compact objects' stations of their own presets.
 *
 * Each names its traits outright, so nothing else rolls (an empty selection
 * means "roll"): the subject is what was built, and a second natural trait
 * would only compete with it. Every blurb leaves the builders and their
 * purpose open (D290).
 *
 * FORTRESS WORLD replaces the spec's Coruscant World, which needed cities —
 * invisible at a planet's scale, and ruled out by D290. The user chose to
 * rebuild it from what exists and rename it, so it no longer promises a
 * city-planet. */

var CC = CC || {};

(function () {
  "use strict";

  CC.Presets.register([
    {
      id: "fortress-world",
      label: "Fortress World",
      archetype: "planet",
      /* A garden world underneath: the thing worth guarding. */
      blurb: "A living world ringed in steel, elevators standing on its ground, gun platforms in orbit and a field of mines far out. Whether they keep something out or something in is not written down.",
      set: {
        "ocean-depth": 48,
        "starlight": 46,
        "interior-heat": 52,
        "optional-layers": 100,
        "axial-tilt": 12,
        "tidal-lock": 0,
        "primary-hue": 205,
        "saturation": 100,
        "brightness": 104,
        "star-activity": 20
      },
      traits: ["orbital-ring", "defence-network", "minefield"],
      traitsOff: []
    },
    {
      id: "half-built-dyson",
      label: "Half-Built Dyson",
      archetype: "main-star",
      /* A quiet star, as Harvested Star is, so the shell is the subject. The
       * collectors under it read as its control rods (D289). */
      blurb: "An ordinary star half inside a lattice shell. Whole arcs of it are not there yet, or not any more.",
      set: {
        "interior-heat": 50,
        "star-activity": 18,
        "optional-layers": 78,
        "core-bias": 0,
        "primary-hue": 40,
        "saturation": 88,
        "brightness": 100,
        "contrast": 106
      },
      traits: ["dyson-shell-unfinished", "stellar-collector"],
      traitsOff: []
    },
    {
      id: "ringworld-nebula",
      label: "Ringworld Nebula",
      archetype: "nebula",
      /* A dark cloud, so the one light in it is the ring's own sun lighting
       * the gas round it (D302). */
      blurb: "A dark cloud with one light in it: a ring round its own small sun, land and sea along its inner face. Nobody has charted who built it.",
      set: { "nebula-form": "cloud", "luminosity": 8 },
      traits: ["ringworld"],
      traitsOff: []
    }
  ]);
})();
