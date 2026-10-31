/* Presets — the diffuse family: the nebula.
 *
 * Registered into CC.Presets (js/data/presets.js), which must load first.
 * Values are in the DOM control's own units (0-100 for a percentage).
 *
 * SPANNED BY THE FAMILY'S OWN AXES: Luminosity source (dark / reflection /
 * emission) and Nebula form (cloud / planetary nebula / supernova remnant),
 * plus Spin rate for a remnant's pulsar. Starlight, Star colour and Interior
 * heat are inert on a nebula by declaration and are not set.
 *
 * The spec's three "most evocative outputs" are here — a pillared emission
 * nebula with protostars, a supernova remnant with a pulsar, a dark nebula
 * with a hidden station in a cavity — with the two shell forms and the
 * three points of Luminosity source filling the rest, and the Freelancer
 * picture the family exists for: terrain worth mining.
 *
 * A preset that is the plain KIND bans every trait (`traitsOff`), so its blurb
 * is what you get: an empty selection means "roll", and a rolled derelict
 * fleet in "a plain emission nebula" would be the preset contradicting
 * itself. */

var CC = CC || {};

(function () {
  "use strict";

  var ALL = ["dark-lanes", "pillars", "bow-shocks", "cavity", "filament-web",
             "protostar-cluster", "embedded-star", "debris-fields", "ice-belts",
             "rock-belts", "metal-belts", "exotic-gas-pockets", "hidden-station",
             "mining-flotilla", "derelict-fleet", "ringworld"];

  CC.Presets.register([
    {
      id: "pillars-of-creation",
      label: "Pillars of Creation",
      archetype: "nebula",
      blurb: "A glowing emission nebula with columns of dark gas standing toward the light, and a nursery of new stars in the thick of it.",
      set: { "nebula-form": "cloud", "luminosity": 88 },
      traits: ["pillars", "protostar-cluster"],
      traitsOff: []
    },
    {
      id: "supernova-remnant",
      label: "Supernova Remnant",
      archetype: "nebula",
      blurb: "The ragged, expanding wreck of an exploded star, woven with filaments, with a pulsar at its heart sweeping its beams through the shell.",
      set: { "nebula-form": "remnant", "luminosity": 75, "spin-rate": 70,
             "optional-layers": 100 },
      traits: ["filament-web"],
      traitsOff: []
    },
    {
      id: "dark-nebula-hideout",
      label: "Dark Nebula Hideout",
      archetype: "nebula",
      blurb: "A cloud of cold dust, black against the glow behind it - and in a hollow blown out by one star, a station nobody is meant to find.",
      set: { "nebula-form": "cloud", "luminosity": 4 },
      traits: ["cavity", "hidden-station"],
      traitsOff: []
    },
    {
      id: "planetary-nebula",
      label: "Planetary Nebula",
      archetype: "nebula",
      blurb: "A dying star's outer layers thrown off as a glowing ring, empty in the middle but for the white dwarf it left behind.",
      set: { "nebula-form": "planetary", "luminosity": 80, "optional-layers": 100 },
      traits: [],
      traitsOff: ALL
    },
    {
      id: "reflection-nebula",
      label: "Reflection Nebula",
      archetype: "nebula",
      blurb: "Cold dust with no light of its own, lit from one side by a star outside it - and blue, for the same reason the sky is.",
      set: { "nebula-form": "cloud", "luminosity": 35 },
      traits: [],
      traitsOff: ALL
    },
    {
      id: "emission-nebula",
      label: "Emission Nebula",
      archetype: "nebula",
      blurb: "Gas lit up from within by the young stars forming in it, glowing like the tube of a neon sign.",
      set: { "nebula-form": "cloud", "luminosity": 100 },
      traits: [],
      traitsOff: ALL
    },
    {
      id: "mining-frontier",
      label: "Mining Frontier",
      archetype: "nebula",
      blurb: "Drifts of ice and metal loose in the haze, and a flotilla working them. Terrain worth flying through.",
      set: { "nebula-form": "cloud", "luminosity": 60 },
      traits: ["metal-belts", "ice-belts", "mining-flotilla"],
      traitsOff: []
    }
  ]);
})();
