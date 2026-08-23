/* Palettes, keyed by body type. Every palette must supply the keys its
 * type's profile builder reads; missing keys fall back in profile code. */

export const PALETTES = {
  rocky: {
    "Ember Forge":   { core: "#ffd98a", inner: "#e8623a", mantle: "#a83a2e", mantle2: "#7c2d3a", crust: "#4a3b46", ocean: "#3d7dc4", ice: "#cfe8f4", haze: "#8fb6d9", space: "#0a0c14" },
    "Verdant Vale":  { core: "#ffe9a8", inner: "#d98a3c", mantle: "#8a5a34", mantle2: "#5c4632", crust: "#41503b", ocean: "#2f8f8a", ice: "#dcf2ec", haze: "#a3d4b8", space: "#0a0f10" },
    "Ashen Relic":   { core: "#f2c46b", inner: "#b05a48", mantle: "#6e4552", mantle2: "#4a3a52", crust: "#39364a", ocean: "#4a6a9c", ice: "#c8d4e8", haze: "#7f88a8", space: "#0b0b12" },
    "Rust Cradle":   { core: "#ffcf7a", inner: "#e07038", mantle: "#b0502c", mantle2: "#7a3c2e", crust: "#54382e", ocean: "#3f6f8f", ice: "#d8e8ee", haze: "#c9a27a", space: "#100c0a" }
  },
  gas: {
    "Amber Colossus": { core: "#ffe9b0", inner: "#e8a24e", mantle: "#c4763c", mantle2: "#8a5636", crust: "#6a4a3a", band: "#f0d0a0", band2: "#a06a44", haze: "#e8c890", ring: "#d8c0a0", space: "#0c0a10" },
    "Sapphire Veil":  { core: "#d8f0ff", inner: "#7ab8e0", mantle: "#3f7ec4", mantle2: "#2c4f9c", crust: "#243a78", band: "#a8d8f0", band2: "#3a5aa0", haze: "#88b8e8", ring: "#a8c0d8", space: "#080a14" },
    "Jade Tempest":   { core: "#eafce0", inner: "#9ad88a", mantle: "#4f9c64", mantle2: "#2f6a52", crust: "#274f48", band: "#c0e8b0", band2: "#3a7a58", haze: "#98d8a8", ring: "#b0c8a8", space: "#080f0c" },
    "Rose Leviathan": { core: "#ffe4ec", inner: "#e89ab0", mantle: "#c05a7c", mantle2: "#8a3c64", crust: "#642f52", band: "#f0c0d0", band2: "#a04a70", haze: "#e0a0b8", ring: "#d0b0c0", space: "#100a10" }
  },
  youngstar: {
    "Solar Whelp":    { core: "#ffffff", inner: "#fff2b0", mantle: "#ffc84e", mantle2: "#f08a2c", crust: "#d05a20", corona: "#ffb040", flare: "#fff0c0", space: "#0c0a12" },
    "Azure Spark":    { core: "#ffffff", inner: "#d8f0ff", mantle: "#88c8ff", mantle2: "#4a88e8", crust: "#2c5ac0", corona: "#78b0ff", flare: "#e8f4ff", space: "#080a14" },
    "Violet Kindling":{ core: "#fff8ff", inner: "#f0d0ff", mantle: "#c88ae8", mantle2: "#8a4ac8", crust: "#5c2c9c", corona: "#b070f0", flare: "#f4e0ff", space: "#0c0814" },
    "Emerald Dawn":   { core: "#ffffff", inner: "#eaffd8", mantle: "#a8e878", mantle2: "#58b048", crust: "#2f7c3c", corona: "#88d860", flare: "#f0ffe0", space: "#080f0a" }
  },
  oldstar: {
    "Crimson Elder":  { core: "#fff0d0", inner: "#ffb060", mantle: "#d05a3a", mantle2: "#8a3030", crust: "#5c2430", shell: "#3a1c28", corona: "#c04838", flare: "#ffd0a0", space: "#0e0a0c" },
    "Amber Twilight": { core: "#ffffff", inner: "#ffd890", mantle: "#e09048", mantle2: "#a05838", crust: "#6a3830", shell: "#42262a", corona: "#c87840", flare: "#ffe8c0", space: "#0e0c0a" },
    "Garnet Husk":    { core: "#ffe8e0", inner: "#f09070", mantle: "#b04858", mantle2: "#702c4c", crust: "#4a2040", shell: "#2e1830", corona: "#984058", flare: "#ffd8d0", space: "#0c0810" },
    "Dying Coal":     { core: "#fff8e8", inner: "#ffc078", mantle: "#c86038", mantle2: "#7c3428", crust: "#4e2020", shell: "#301618", corona: "#a84828", flare: "#ffdcb0", space: "#0c0a0a" }
  }
};

export const TYPE_LABELS = {
  rocky: "Rocky World",
  gas: "Gas Giant",
  youngstar: "Young Star",
  oldstar: "Old Star"
};

/* Ordered list drives the body-type dropdown. */
export const TYPE_ORDER = ["rocky", "gas", "youngstar", "oldstar"];
