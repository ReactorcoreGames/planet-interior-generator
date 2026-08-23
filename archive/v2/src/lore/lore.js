/* Descriptive text.
 *
 * Register: a competent, curious survey officer filing a report on somewhere
 * worth going back to. Forward-looking rather than elegiac — even a dying
 * star is described in terms of what it makes possible. No quoted flavor
 * line: settler-voice quotes read oddly at planetary scale and repeated too
 * often across generated batches. */

import { pick } from "../core/math.js";
import { TYPE_LABELS } from "../data/palettes.js";

const AGE_WORDS = {
  rocky: ["newly cooled and still settling", "in early middle age",
          "long-established and stable", "ancient, patient, and well-mapped",
          "young enough that its crust is still finding its shape"],
  gas: ["still drawing in material", "settled into a steady rhythm",
        "older than the worlds that orbit it", "mature and remarkably stable"],
  youngstar: ["only a few million years into its main sequence",
              "recently ignited and finding its balance",
              "fresh out of its natal cloud", "a young star with a long future"],
  oldstar: ["late in a very long and productive life",
            "well into its giant phase", "an elder star, generous with its light",
            "expanded, cooled, and busy making heavier elements"]
};

const TEMPER = ["steady", "lively", "energetic", "patient", "variable",
                "tranquil", "resonant", "spirited", "luminous", "welcoming"];

const CLASSES = {
  rocky: ["Terrestrial World", "Iron-Core World", "Tectonic World", "Highland World"],
  gas: ["Gas Giant", "Banded Giant", "Storm Giant", "Cloud Colossus"],
  youngstar: ["Main-Sequence Star", "Young Sun", "Ignition-Class Star", "Stellar Adolescent"],
  oldstar: ["Red Giant", "Evolved Luminary", "Expanded Elder Star", "Late-Phase Star"]
};

/* Survey verdict — the "should we go?" line, always constructive. */
const VERDICT = {
  rocky: [
    "Recommended for survey. Landing sites are plentiful and the geology is legible.",
    "A good candidate for a forward base. Resources are accessible near the surface.",
    "Worth a return visit with a full science complement.",
    "Straightforward approach, stable ground, and more here than the first pass suggested."
  ],
  gas: [
    "Excellent aerostat prospects. The upper bands are calmer than the profile implies.",
    "Fuel scooping is practical at the outer cloud deck. Recommended as a waypoint.",
    "A rewarding place to study atmospheric dynamics. Plan for long observation windows.",
    "Rich in volatiles and easy to reach. A natural resupply stop for the region."
  ],
  youngstar: [
    "Stable enough for long-term study. Its planetary system is worth cataloguing.",
    "A textbook young star — ideal for calibrating instruments across the sector.",
    "Active but predictable. Standard shielding is sufficient inside the inner system.",
    "Everything a system needs to build worlds is already here and in motion."
  ],
  oldstar: [
    "Its outflow is seeding the region with heavy elements. Scientifically valuable.",
    "Approach is comfortable; the envelope is diffuse and the light is gentle.",
    "A generous star in its late phase — good observing, and no hazard to speak of.",
    "The material it is shedding will become the next generation of worlds here."
  ]
};

/* Per-type descriptive rows. Values stay short so they work as callout text. */
function structureRows(type, rng, profile) {
  const n = profile.layers.length;
  const fx = profile.effects;

  if (type === "rocky") {
    return [
      ["Core", pick(rng, ["dense metal, still warm", "iron-nickel, slowly solidifying",
                          "molten and convecting steadily"])],
      ["Strata", `${n} differentiated layers`],
      ["Atmosphere", fx.haze
        ? pick(rng, ["thin but breathable with treatment", "dense and weather-active",
                     "clear, dry, and workable"])
        : "none — exposed surface"],
      ["Hydrosphere", fx.oceanArc
        ? pick(rng, ["shallow seas in the old basins", "one broad meridian ocean",
                     "brine pools and subsurface reserves"])
        : "locked in the crust as hydrated minerals"]
    ];
  }
  if (type === "gas") {
    return [
      ["Core", pick(rng, ["compact rock-ice under immense pressure",
                          "a dense heart wrapped in metallic hydrogen",
                          "small, hot, and extremely dense"])],
      ["Strata", `${n} nested cloud decks`],
      ["Winds", pick(rng, ["counter-rotating jets at every latitude",
                           "a full circuit in nine days",
                           "steady, banded, and well-charted"])],
      ["Ring system", fx.ring
        ? pick(rng, ["bright, and useful for navigation", "fine ice with clean shepherd gaps",
                     "a broad band of reflective debris"])
        : "none observed"]
    ];
  }
  if (type === "youngstar") {
    return [
      ["Core", pick(rng, ["hydrogen fusion, running clean", "steady proton-proton burning",
                          "a bright, well-regulated fusion heart"])],
      ["Structure", `${n} plasma shells, radiative core under a convective envelope`],
      ["Activity", fx.flares
        ? pick(rng, ["regular flares along the active latitudes",
                     "energetic but on a predictable cycle",
                     "frequent, and spectacular from a safe orbit"])
        : "notably quiet for its class"],
      ["Corona", pick(rng, ["hot, extended, and well-structured",
                            "bright in the ultraviolet", "expanding into a clean heliosphere"])]
    ];
  }
  return [
    ["Core", pick(rng, ["a compact degenerate heart, fiercely hot",
                        "small, dense, and fusing helium",
                        "contracted, and burning hotter than ever"])],
    ["Structure", `${n} shells, a tiny core beneath a vast convective envelope`],
    ["Envelope", pick(rng, ["diffuse enough to fly through in places",
                            "enormous, cool, and slowly expanding",
                            "shedding material into the surrounding space"])],
    ["Future", pick(rng, ["a planetary nebula, and a white dwarf to follow",
                          "it will enrich this whole region before it settles",
                          "a bright shell of its own making, then a long quiet glow"])]
  ];
}

export function generateLore(type, rng, profile, name) {
  const rows = [
    ["Age", pick(rng, AGE_WORDS[type] || AGE_WORDS.rocky)],
    ["Character", pick(rng, TEMPER)],
    ...structureRows(type, rng, profile)
  ];

  return {
    name,
    cls: pick(rng, CLASSES[type] || CLASSES.rocky),
    typeLabel: TYPE_LABELS[type] || type,
    rows,
    verdict: pick(rng, VERDICT[type] || VERDICT.rocky)
  };
}
