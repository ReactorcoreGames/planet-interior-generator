/* Celestial Cutaway — stylized interior cross-section generator.
 * Fully offline, no dependencies. One shared rendering engine draws
 * concentric noise-perturbed layers; four body-type "profiles"
 * parameterize it. */
"use strict";

/* ============================================================
 * Seeded RNG + value noise
 * ============================================================ */

function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Simple seeded 2D value noise with fBm. */
function makeNoise2D(seed) {
  const perm = new Uint8Array(512);
  const rng = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) vals[i] = rng();

  function latt(ix, iy) {
    return vals[perm[(perm[ix & 255] + iy) & 255]];
  }
  function smooth(t) { return t * t * (3 - 2 * t); }

  function noise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const sx = smooth(fx), sy = smooth(fy);
    const v00 = latt(ix, iy), v10 = latt(ix + 1, iy);
    const v01 = latt(ix, iy + 1), v11 = latt(ix + 1, iy + 1);
    return (v00 + (v10 - v00) * sx) * (1 - sy) + (v01 + (v11 - v01) * sx) * sy;
  }

  function fbm(x, y, octaves = 3) {
    let sum = 0, amp = 0.5, freq = 1, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise(x * freq, y * freq);
      norm += amp;
      amp *= 0.5; freq *= 2.1;
    }
    return sum / norm; // 0..1
  }

  return { noise, fbm };
}

/* ============================================================
 * Small helpers
 * ============================================================ */

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
const rrange = (rng, lo, hi) => lo + rng() * (hi - lo);

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function mixHex(h1, h2, t) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  const c = a.map((v, i) => clamp(Math.round(lerp(v, b[i], t)), 0, 255));
  return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
}
function shadeHex(hex, amt) { // amt -1..1 : darken..lighten
  return amt >= 0 ? mixHex(hex, "#ffffff", amt) : mixHex(hex, "#000000", -amt);
}

/* ============================================================
 * Palettes (per body type)
 * ============================================================ */

const PALETTES = {
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

const TYPE_LABELS = {
  rocky: "Rocky World", gas: "Gas Giant", youngstar: "Young Star", oldstar: "Old Star"
};

/* ============================================================
 * Name + lore generation
 * ============================================================ */

const NAME_PARTS = {
  a: ["Ka", "Ver", "Tho", "Ael", "Bra", "Cin", "Dro", "Ery", "Fen", "Gal", "Hal", "Ish", "Jor", "Kel", "Lum", "Mor", "Nyx", "Or", "Phy", "Qua", "Rha", "Sol", "Tyr", "Umb", "Vex", "Wyn", "Xan", "Yra", "Zeph"],
  b: ["ra", "lo", "mi", "dun", "vek", "sha", "ri", "gol", "na", "thi", "bor", "el", "us", "ax", "ien", "or", "eth", "ath", "yn", "ossa"],
  c: ["", "", "", " Prime", " Minor", " Deep", "-9", " III", " VII", " of the Verge", " Reach"]
};

function makeName(rng) {
  return pick(rng, NAME_PARTS.a) + pick(rng, NAME_PARTS.b) +
    (rng() < 0.5 ? pick(rng, NAME_PARTS.b) : "") + pick(rng, NAME_PARTS.c);
}

const AGE_WORDS = {
  rocky: ["young and restless", "middle-aged", "ancient beyond record", "freshly cooled", "weathered by eons"],
  gas: ["still coalescing", "settled into old habits", "immeasurably old", "churning since the first dawn"],
  youngstar: ["mere millions of years old", "newly ignited", "barely out of its natal cloud", "a stellar infant"],
  oldstar: ["billions of years past its prime", "at the end of its long burning", "older than most of its galaxy's memory", "swollen with age"]
};

const TEMPER_WORDS = ["placid", "brooding", "furious", "patient", "capricious", "slumbering", "resonant", "defiant", "melancholy", "radiant"];

function generateLore(type, rng, profile, name, paletteName) {
  const lore = { name, cls: "", rows: [], flavor: "" };
  const temper = pick(rng, TEMPER_WORDS);
  const age = pick(rng, AGE_WORDS[type]);
  const layerCount = profile.layers.length;

  if (type === "rocky") {
    lore.cls = pick(rng, ["Terrestrial World", "Iron-Hearted World", "Cratered Rockball", "Tectonic World"]);
    lore.rows = [
      ["Age", age],
      ["Temperament", temper],
      ["Core", pick(rng, ["a knot of singing iron", "a dense metal ember", "slow-spinning and heavy", "still molten at heart"])],
      ["Strata", `${layerCount} great layers, folded like old scars`],
      ["Skies", profile.effects.haze ? pick(rng, ["a thin veil of breathable haze", "storm-bruised and restless", "pale and whisper-thin"]) : "airless and silent"],
      ["Seas", profile.effects.oceanArc ? pick(rng, ["shallow seas cling to its scars", "one great meridian ocean", "cold brine pooled in old basins"]) : "long since boiled away"]
    ];
    lore.flavor = pick(rng, [
      "Miners speak of veins that hum when the moons align.",
      "Its mountains remember an ocean that no map records.",
      "Every quake here is said to be the core turning in its sleep.",
      "Settlers swear the bedrock is warm where the old rivers ran."
    ]);
  } else if (type === "gas") {
    lore.cls = pick(rng, ["Gas Colossus", "Banded Giant", "Storm Sovereign", "Cloud Leviathan"]);
    lore.rows = [
      ["Age", age],
      ["Temperament", temper],
      ["Depths", pick(rng, ["pressure enough to forge diamonds from soot", "a sea of metallic hydrogen, mirror-bright", "storms stacked a thousand deep"])],
      ["Strata", `${layerCount} nested cloud-realms`],
      ["Winds", pick(rng, ["howl in counter-rotating choirs", "circle the globe in nine days", "have never once been still"])],
      ["Ring", profile.effects.ring ? pick(rng, ["a halo of shattered moonlight", "dust of a moon that strayed too close", "ice-glitter in a thin bright band"]) : "none — bare-shouldered and proud"]
    ];
    lore.flavor = pick(rng, [
      "Sky-sailors claim the deepest bands sing in frequencies felt, not heard.",
      "Somewhere below the visible clouds, lightning has burned for ten thousand years.",
      "Its great storm has outlived every civilization that named it.",
      "Probes sent into its depths return only one word: deeper."
    ]);
  } else if (type === "youngstar") {
    lore.cls = pick(rng, ["Protostellar Furnace", "Newborn Sun", "Ignition-Class Star", "Stellar Whelp"]);
    lore.rows = [
      ["Age", age],
      ["Temperament", temper],
      ["Core", pick(rng, ["a fusion heart still finding its rhythm", "burning bright and reckless", "hammering hydrogen into light"])],
      ["Strata", `${layerCount} roiling plasma shells`],
      ["Flares", profile.effects.flares ? pick(rng, ["lash out without warning or apology", "arc like whips of white fire", "signal moods no chart predicts"]) : "held in, for now"],
      ["Corona", pick(rng, ["a crown it has not yet learned to wear", "flickering and eager", "wider than modesty allows"])]
    ];
    lore.flavor = pick(rng, [
      "Astronomers log its outbursts the way parents log first words.",
      "It burns with the urgency of something that does not yet know it has time.",
      "Its light will not reach anyone who remembers its birth.",
      "Every flare is a promise of the star it intends to become."
    ]);
  } else {
    lore.cls = pick(rng, ["Red Giant", "Dying Luminary", "Swollen Elder Star", "Ember of the Long Dusk"]);
    lore.rows = [
      ["Age", age],
      ["Temperament", temper],
      ["Core", pick(rng, ["a small fierce heart wrapped in fading glory", "compressed to a stubborn spark", "still hot, still proud, still refusing"])],
      ["Strata", `${layerCount} loose, exhaled shells`],
      ["Envelope", pick(rng, ["bloated thin as rumor", "so diffuse a ship could sail through it", "shedding itself into the dark, gram by gram"])],
      ["Prognosis", pick(rng, ["a nebula, someday, and a very small regret", "one last collapse, then quiet", "it will make jewels of its own ashes"])]
    ];
    lore.flavor = pick(rng, [
      "Old charts mark it simply: was brighter once.",
      "It has swallowed two of its own worlds and mourns neither.",
      "Poets orbit it the way moths orbit a lamp that is going out.",
      "Its warmth now is the warmth of a hearth burned down to coals."
    ]);
  }
  return lore;
}

/* ============================================================
 * Body profiles — each returns a data structure consumed by the
 * ONE shared engine (drawBody). No per-type drawing code paths
 * beyond what the profile declares.
 *
 * profile = {
 *   layers: [ { frac, c0, c1, wobbleAmp, wobbleFreq, noiseAmp,
 *               noiseScale, texture, alpha, edge } ]  // outermost first
 *   effects: { haze, oceanArc, ring, corona, flares, granuleGlow }
 *   extent: max radius (in body radii) any effect reaches
 * }
 * ============================================================ */

function buildLayerStack(rng, count, fracInner, wob, profileOfLayer) {
  // Distribute layer boundary fractions from 1.0 down to fracInner (core size).
  const layers = [];
  const weights = [];
  for (let i = 0; i < count; i++) weights.push(0.5 + rng());
  const total = weights.reduce((a, b) => a + b, 0);
  let frac = 1.0;
  for (let i = 0; i < count; i++) {
    layers.push(profileOfLayer(i, frac, count));
    frac -= (weights[i] / total) * (1.0 - fracInner);
  }
  return layers;
}

function makeProfile(type, rng, opts) {
  const pal = PALETTES[type][opts.paletteName];
  const wob = opts.wobble;        // 0..1
  const rich = opts.detail;       // 0..1
  const effects = {};
  let layers = [];

  if (type === "rocky") {
    const count = 4 + Math.round(rich * 3); // 4..7
    const ramp = [pal.crust, pal.mantle2, pal.mantle, pal.inner, pal.core];
    layers = buildLayerStack(rng, count, rrange(rng, 0.16, 0.26), wob, (i, frac, n) => {
      const t = i / (n - 1);
      const idx = t * (ramp.length - 1);
      const c0 = mixHex(ramp[Math.floor(idx)], ramp[Math.ceil(idx)], idx % 1);
      const isCore = i === n - 1;
      const isCrust = i === 0;
      return {
        frac, c0: shadeHex(c0, -0.12), c1: shadeHex(c0, 0.15),
        wobbleAmp: (isCrust ? 0.012 : 0.02 + 0.03 * rng()) * (0.4 + wob * 1.4),
        wobbleFreq: 3 + Math.floor(rng() * 6),
        noiseAmp: (isCrust ? 0.008 : 0.02) * (0.3 + wob * 1.6),
        noiseScale: rrange(rng, 1.5, 3.5),
        alpha: 1,
        texture: isCore ? { type: "glowcore", color: pal.core }
               : isCrust ? { type: "speckle", color: shadeHex(c0, -0.35), density: 0.5 }
               : { type: "bands", color: shadeHex(c0, rng() < 0.5 ? -0.22 : 0.18), count: 2 + Math.floor(rng() * 3) },
        edge: { color: shadeHex(c0, -0.4), width: 0.006, alpha: 0.7 }
      };
    });
    effects.haze = rng() < 0.85 ? { color: pal.haze, inner: 1.0, outer: rrange(rng, 1.08, 1.16), alpha: rrange(rng, 0.2, 0.4) } : null;
    effects.oceanArc = rng() < 0.65 ? {
      color: pal.ocean, iceColor: pal.ice,
      arcs: 1 + Math.floor(rng() * 2),
      start: rng() * TAU, span: rrange(rng, 0.5, 1.4),
      width: 0.05, ice: rng() < 0.6
    } : null;
    effects.extent = effects.haze ? effects.haze.outer : 1.02;
  }

  else if (type === "gas") {
    const count = 4 + Math.round(rich * 3);
    const ramp = [pal.crust, pal.mantle2, pal.mantle, pal.inner, pal.core];
    layers = buildLayerStack(rng, count, rrange(rng, 0.12, 0.2), wob, (i, frac, n) => {
      const t = i / (n - 1);
      const idx = t * (ramp.length - 1);
      const c0 = mixHex(ramp[Math.floor(idx)], ramp[Math.ceil(idx)], idx % 1);
      const isCore = i === n - 1;
      return {
        frac, c0: shadeHex(c0, -0.1), c1: shadeHex(c0, 0.18),
        wobbleAmp: (0.025 + 0.035 * rng()) * (0.4 + wob * 1.5),
        wobbleFreq: 2 + Math.floor(rng() * 5),
        noiseAmp: 0.03 * (0.3 + wob * 1.7),
        noiseScale: rrange(rng, 1.2, 2.8),
        alpha: 1,
        texture: isCore ? { type: "glowcore", color: pal.core }
               : { type: "swirlbands",
                   color: i % 2 ? rgbaSafe(pal.band, 1) : rgbaSafe(pal.band2, 1),
                   count: 3 + Math.floor(rng() * 3 + rich * 2),
                   curl: rng() < 0.6 },
        edge: { color: shadeHex(c0, -0.35), width: 0.005, alpha: 0.55 }
      };
    });
    effects.haze = { color: pal.haze, inner: 1.0, outer: rrange(rng, 1.06, 1.12), alpha: rrange(rng, 0.25, 0.4) };
    effects.ring = rng() < 0.6 ? {
      color: pal.ring, rIn: rrange(rng, 1.3, 1.5), rOut: rrange(rng, 1.6, 1.95),
      tilt: rrange(rng, -0.5, -0.2), squash: rrange(rng, 0.22, 0.34), alpha: rrange(rng, 0.5, 0.8),
      gaps: 1 + Math.floor(rng() * 2)
    } : null;
    effects.extent = effects.ring ? effects.ring.rOut : effects.haze.outer;
  }

  else if (type === "youngstar") {
    const count = 3 + Math.round(rich * 3); // 3..6
    const ramp = [pal.crust, pal.mantle2, pal.mantle, pal.inner, pal.core];
    layers = buildLayerStack(rng, count, rrange(rng, 0.22, 0.34), wob, (i, frac, n) => {
      const t = i / (n - 1);
      const idx = t * (ramp.length - 1);
      const c0 = mixHex(ramp[Math.floor(idx)], ramp[Math.ceil(idx)], idx % 1);
      const isCore = i === n - 1;
      return {
        frac, c0: shadeHex(c0, -0.05), c1: shadeHex(c0, 0.22),
        wobbleAmp: (0.03 + 0.04 * rng()) * (0.4 + wob * 1.6),
        wobbleFreq: 3 + Math.floor(rng() * 6),
        noiseAmp: 0.04 * (0.3 + wob * 1.7),
        noiseScale: rrange(rng, 1.8, 3.6),
        alpha: 1,
        texture: isCore ? { type: "glowcore", color: pal.core, strong: true }
               : { type: "plasma", color: shadeHex(c0, 0.35), dark: shadeHex(c0, -0.25),
                   count: 8 + Math.floor(rng() * 8 + rich * 6) },
        edge: { color: shadeHex(c0, 0.4), width: 0.004, alpha: 0.5 }
      };
    });
    effects.corona = { color: pal.corona, inner: 1.0, outer: rrange(rng, 1.25, 1.4), alpha: rrange(rng, 0.5, 0.75) };
    effects.flares = rng() < 0.9 ? {
      color: pal.flare, count: 2 + Math.floor(rng() * 4),
      len: rrange(rng, 0.25, 0.45)
    } : null;
    effects.extent = Math.max(effects.corona.outer, effects.flares ? 1 + effects.flares.len : 1) + 0.05;
  }

  else { // oldstar — bloated red giant: dim shrunken core, diffuse shells
    const count = 4 + Math.round(rich * 3);
    const ramp = [pal.shell, pal.crust, pal.mantle2, pal.mantle, pal.inner];
    layers = buildLayerStack(rng, count, rrange(rng, 0.08, 0.14), wob, (i, frac, n) => {
      const t = i / (n - 1);
      const idx = t * (ramp.length - 1);
      const c0 = mixHex(ramp[Math.floor(idx)], ramp[Math.ceil(idx)], idx % 1);
      const isCore = i === n - 1;
      const outerness = 1 - t; // 1 at outermost
      return {
        frac, c0: shadeHex(c0, -0.08), c1: shadeHex(c0, 0.15),
        wobbleAmp: (0.04 + 0.05 * rng()) * (0.4 + wob * 1.7) * (0.5 + outerness),
        wobbleFreq: 2 + Math.floor(rng() * 4),
        noiseAmp: 0.05 * (0.3 + wob * 1.8) * (0.5 + outerness),
        noiseScale: rrange(rng, 1.0, 2.4),
        alpha: isCore ? 1 : clamp(0.55 + t * 0.5, 0, 1), // outer shells translucent/diffuse
        texture: isCore ? { type: "glowcore", color: pal.core, strong: true }
               : { type: "wisps", color: shadeHex(c0, 0.3), dark: shadeHex(c0, -0.3),
                   count: 5 + Math.floor(rng() * 6 + rich * 4) },
        edge: { color: shadeHex(c0, 0.25), width: 0.004, alpha: 0.3 }
      };
    });
    effects.corona = { color: pal.corona, inner: 1.0, outer: rrange(rng, 1.2, 1.35), alpha: rrange(rng, 0.3, 0.5) };
    effects.flares = rng() < 0.5 ? { color: pal.flare, count: 1 + Math.floor(rng() * 2), len: rrange(rng, 0.15, 0.3) } : null;
    effects.extent = Math.max(effects.corona.outer, effects.flares ? 1 + effects.flares.len : 1) + 0.05;
  }

  return { type, layers, effects, extent: effects.extent, palette: pal };
}

// Guards against a palette missing a key — falls back visibly but safely.
function rgbaSafe(hex, a) { return hex || "#888888"; }

/* ============================================================
 * THE shared rendering engine.
 * Draws any profile: perturbed concentric layers + declared effects.
 * ============================================================ */

function layerRadius(theta, baseR, layer, noise, seedOff) {
  const s = layer.noiseScale;
  const n = noise.fbm(Math.cos(theta) * s + seedOff * 7.3, Math.sin(theta) * s + seedOff * 3.1, 3);
  return baseR * (1 +
    layer.wobbleAmp * Math.sin(layer.wobbleFreq * theta + seedOff * 2.4) +
    layer.noiseAmp * (n - 0.5) * 2);
}

function traceLayerPath(ctx, cx, cy, baseR, layer, noise, seedOff, steps = 200) {
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * TAU;
    const r = layerRadius(th, baseR, layer, noise, seedOff);
    const x = cx + Math.cos(th) * r;
    const y = cy + Math.sin(th) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawRing(ctx, cx, cy, R, ring, half) {
  // half: "back" (top of tilted plane) or "front"
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ring.tilt);
  const big = R * 4;
  ctx.beginPath();
  if (half === "back") ctx.rect(-big, -big, big * 2, big);
  else ctx.rect(-big, 0, big * 2, big);
  ctx.clip();
  const bands = 2 + ring.gaps;
  for (let b = 0; b < bands; b++) {
    const t0 = b / bands, t1 = (b + 0.72) / bands;
    const rIn = lerp(ring.rIn, ring.rOut, t0) * R;
    const rOut = lerp(ring.rIn, ring.rOut, t1) * R;
    ctx.beginPath();
    ctx.ellipse(0, 0, rOut, rOut * ring.squash, 0, 0, TAU);
    ctx.ellipse(0, 0, rIn, rIn * ring.squash, 0, 0, TAU, true);
    ctx.fillStyle = rgba(ring.color, ring.alpha * (0.55 + 0.45 * (1 - b / bands)));
    ctx.fill("evenodd");
  }
  ctx.restore();
}

function drawGlow(ctx, cx, cy, r0, r1, color, alpha, composite) {
  ctx.save();
  if (composite) ctx.globalCompositeOperation = composite;
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.6, rgba(color, alpha * 0.35));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawTexture(ctx, cx, cy, layerR, innerR, layer, noise, seedOff, rng) {
  const tx = layer.texture;
  if (!tx) return;
  ctx.save();
  traceLayerPath(ctx, cx, cy, layerR, layer, noise, seedOff);
  ctx.clip();

  if (tx.type === "glowcore") {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, layerR);
    g.addColorStop(0, rgba(tx.color, tx.strong ? 1 : 0.9));
    g.addColorStop(0.5, rgba(tx.color, tx.strong ? 0.7 : 0.35));
    g.addColorStop(1, rgba(tx.color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx - layerR, cy - layerR, layerR * 2, layerR * 2);
    if (tx.strong) {
      // radial convection spokes
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = rgba(tx.color, 0.8);
      ctx.lineWidth = Math.max(1, layerR * 0.02);
      const spokes = 9;
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * TAU + rng() * 0.4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * layerR * 0.15, cy + Math.sin(a) * layerR * 0.15);
        const midA = a + rrange(rng, -0.3, 0.3);
        ctx.quadraticCurveTo(
          cx + Math.cos(midA) * layerR * 0.55, cy + Math.sin(midA) * layerR * 0.55,
          cx + Math.cos(a + rrange(rng, -0.5, 0.5)) * layerR * 0.9,
          cy + Math.sin(a + rrange(rng, -0.5, 0.5)) * layerR * 0.9);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  else if (tx.type === "bands") {
    // thin concentric wobbly strokes inside the layer annulus
    ctx.lineWidth = Math.max(1, (layerR - innerR) * 0.08);
    for (let b = 1; b <= tx.count; b++) {
      const r = lerp(innerR, layerR, b / (tx.count + 1));
      ctx.strokeStyle = rgba(tx.color, 0.5);
      traceLayerPath(ctx, cx, cy, r, layer, noise, seedOff + b * 0.37, 140);
      ctx.stroke();
    }
  }

  else if (tx.type === "speckle") {
    const n = Math.floor(120 * tx.density);
    ctx.fillStyle = rgba(tx.color, 0.5);
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU;
      const rr = lerp(innerR, layerR, rng());
      const s = Math.max(0.7, layerR * 0.008 * (0.5 + rng()));
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, s, 0, TAU);
      ctx.fill();
    }
  }

  else if (tx.type === "swirlbands") {
    // curved streaks following the annulus + optional curls
    const thick = Math.max(1, (layerR - innerR) * 0.10);
    for (let b = 0; b < tx.count; b++) {
      const r = lerp(innerR + thick, layerR - thick, (b + 0.5) / tx.count);
      const a0 = rng() * TAU;
      const span = rrange(rng, 1.2, 3.4);
      ctx.strokeStyle = rgba(tx.color, rrange(rng, 0.25, 0.5));
      ctx.lineWidth = thick * rrange(rng, 0.5, 1.1);
      ctx.lineCap = "round";
      ctx.beginPath();
      const segs = 40;
      for (let s = 0; s <= segs; s++) {
        const th = a0 + (s / segs) * span;
        const wobR = r * (1 + 0.04 * Math.sin(th * 3 + b) + 0.03 * (noise.fbm(Math.cos(th) * 2 + b, Math.sin(th) * 2 + seedOff, 2) - 0.5) * 2);
        const x = cx + Math.cos(th) * wobR, y = cy + Math.sin(th) * wobR;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (tx.curl && rng() < 0.5) {
        // little comma-shaped storm curl at the streak end
        const th = a0 + span;
        const px = cx + Math.cos(th) * r, py = cy + Math.sin(th) * r;
        ctx.beginPath();
        ctx.arc(px, py, thick * 1.4, th, th + 4.2);
        ctx.stroke();
      }
    }
  }

  else if (tx.type === "plasma") {
    // turbulent cell strokes: short arcs jittered by noise
    ctx.lineCap = "round";
    for (let i = 0; i < tx.count; i++) {
      const a = rng() * TAU;
      const rr = lerp(innerR, layerR, rng());
      const bright = rng() < 0.6;
      ctx.strokeStyle = rgba(bright ? tx.color : tx.dark, rrange(rng, 0.3, 0.6));
      ctx.lineWidth = Math.max(1, layerR * rrange(rng, 0.008, 0.02));
      ctx.beginPath();
      const span = rrange(rng, 0.25, 0.8);
      const segs = 12;
      for (let s = 0; s <= segs; s++) {
        const th = a + (s / segs) * span;
        const jr = rr * (1 + 0.06 * (noise.fbm(Math.cos(th) * 4 + i, Math.sin(th) * 4 + seedOff, 2) - 0.5) * 2);
        const x = cx + Math.cos(th) * jr, y = cy + Math.sin(th) * jr;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  else if (tx.type === "wisps") {
    // long faint drifting filaments for diffuse old-star shells
    ctx.lineCap = "round";
    for (let i = 0; i < tx.count; i++) {
      const a = rng() * TAU;
      const rr = lerp(innerR, layerR, rng());
      ctx.strokeStyle = rgba(rng() < 0.5 ? tx.color : tx.dark, rrange(rng, 0.15, 0.35));
      ctx.lineWidth = Math.max(1, layerR * rrange(rng, 0.006, 0.016));
      ctx.beginPath();
      const span = rrange(rng, 0.6, 1.8);
      const drift = rrange(rng, -0.12, 0.12) * layerR;
      const segs = 20;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const th = a + t * span;
        const jr = rr + drift * Math.sin(t * Math.PI) +
          layerR * 0.05 * (noise.fbm(Math.cos(th) * 2.5 + i * 2, Math.sin(th) * 2.5 + seedOff, 2) - 0.5) * 2;
        const x = cx + Math.cos(th) * jr, y = cy + Math.sin(th) * jr;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  ctx.restore();
}

/* Draw the whole body (any profile) centered at cx,cy with radius R. */
function drawBody(ctx, cx, cy, R, profile, seedNum, opts = {}) {
  const noise = makeNoise2D(seedNum ^ 0x9e3779b9);
  const rng = mulberry32(seedNum ^ 0x51ab3f);
  const fx = profile.effects;
  // Additive glow looks right over a dark backdrop but turns into a flat
  // opaque disc over transparency, so transparent exports use source-over.
  const glowComp = opts.transparent ? null : "lighter";
  const glowScale = opts.transparent ? 0.55 : 1; // keep glows airy over alpha

  // --- behind-body effects ---
  if (fx.corona) {
    drawGlow(ctx, cx, cy, R * 0.85, R * fx.corona.outer, fx.corona.color, fx.corona.alpha * glowScale, glowComp);
    drawGlow(ctx, cx, cy, R * 0.5, R * (fx.corona.outer + 0.08), fx.corona.color, fx.corona.alpha * 0.4 * glowScale, glowComp);
  }
  if (fx.haze) {
    drawGlow(ctx, cx, cy, R * 0.92, R * fx.haze.outer, fx.haze.color, fx.haze.alpha * glowScale);
  }
  if (fx.ring) drawRing(ctx, cx, cy, R, fx.ring, "back");

  // --- flares behind limb (drawn under the disc so they emerge from it) ---
  if (fx.flares) {
    ctx.save();
    if (glowComp) ctx.globalCompositeOperation = glowComp;
    ctx.lineCap = "round";
    for (let i = 0; i < fx.flares.count; i++) {
      const a = rng() * TAU;
      const len = R * fx.flares.len * rrange(rng, 0.6, 1.2);
      const base = R * 0.96;
      const x0 = cx + Math.cos(a) * base, y0 = cy + Math.sin(a) * base;
      const aMid = a + rrange(rng, -0.35, 0.35);
      const aEnd = a + rrange(rng, -0.15, 0.15);
      const x1 = cx + Math.cos(aMid) * (base + len * 1.3), y1 = cy + Math.sin(aMid) * (base + len * 1.3);
      const x2 = cx + Math.cos(aEnd) * (base + len * 0.25), y2 = cy + Math.sin(aEnd) * (base + len * 0.25);
      ctx.strokeStyle = rgba(fx.flares.color, 0.85);
      ctx.lineWidth = Math.max(1.5, R * 0.02);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x1, y1, x2, y2);
      ctx.stroke();
      ctx.strokeStyle = rgba(fx.flares.color, 0.3);
      ctx.lineWidth = Math.max(3, R * 0.045);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- concentric layers, outermost first; inner layers paint on top ---
  const n = profile.layers.length;
  for (let i = 0; i < n; i++) {
    const layer = profile.layers[i];
    const layerR = R * layer.frac;
    const nextFrac = i + 1 < n ? profile.layers[i + 1].frac : 0;
    const innerR = R * nextFrac;
    const seedOff = i * 1.618 + 0.31;

    ctx.save();
    ctx.globalAlpha = layer.alpha != null ? layer.alpha : 1;
    traceLayerPath(ctx, cx, cy, layerR, layer, noise, seedOff);
    const g = ctx.createRadialGradient(cx, cy, innerR * 0.85, cx, cy, layerR);
    g.addColorStop(0, layer.c1);
    g.addColorStop(1, layer.c0);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();

    // texture clipped to this layer's own path
    ctx.save();
    ctx.globalAlpha = layer.alpha != null ? layer.alpha : 1;
    drawTexture(ctx, cx, cy, layerR, innerR, layer, noise, seedOff, rng);
    ctx.restore();

    // boundary edge line
    if (layer.edge) {
      ctx.save();
      ctx.globalAlpha = (layer.alpha != null ? layer.alpha : 1) * layer.edge.alpha;
      ctx.strokeStyle = layer.edge.color;
      ctx.lineWidth = Math.max(0.8, R * layer.edge.width);
      traceLayerPath(ctx, cx, cy, layerR, layer, noise, seedOff);
      ctx.stroke();
      ctx.restore();
    }
  }

  // --- surface-attached effects ---
  if (fx.oceanArc) {
    const surface = profile.layers[0];
    ctx.save();
    traceLayerPath(ctx, cx, cy, R * surface.frac, surface, noise, 0.31);
    ctx.clip();
    ctx.lineCap = "round";
    for (let a = 0; a < fx.oceanArc.arcs; a++) {
      const st = fx.oceanArc.start + a * 2.1;
      const span = fx.oceanArc.span * rrange(rng, 0.7, 1.1);
      ctx.strokeStyle = rgba(fx.oceanArc.color, 0.9);
      ctx.lineWidth = R * fx.oceanArc.width;
      ctx.beginPath();
      ctx.arc(cx, cy, R * (surface.frac - fx.oceanArc.width * 0.55), st, st + span);
      ctx.stroke();
      if (fx.oceanArc.ice) {
        ctx.strokeStyle = rgba(fx.oceanArc.iceColor, 0.95);
        ctx.lineWidth = R * fx.oceanArc.width * 0.6;
        ctx.beginPath();
        ctx.arc(cx, cy, R * (surface.frac - fx.oceanArc.width * 0.4), st - 0.25, st);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // subtle global shading for depth (consistent art style across types)
  ctx.save();
  traceLayerPath(ctx, cx, cy, R * profile.layers[0].frac, profile.layers[0], noise, 0.31);
  ctx.clip();
  const sh = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R * 1.15);
  sh.addColorStop(0, "rgba(255,255,255,0.10)");
  sh.addColorStop(0.55, "rgba(0,0,0,0)");
  sh.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = sh;
  ctx.fillRect(cx - R * 1.2, cy - R * 1.2, R * 2.4, R * 2.4);
  ctx.restore();

  if (fx.ring) drawRing(ctx, cx, cy, R, fx.ring, "front");
}

/* ============================================================
 * Stats / lore panel rendering
 * ============================================================ */

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line); line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function drawStatsPanel(ctx, x, y, w, h, lore, profile) {
  const pad = w * 0.09;
  const pal = profile.palette;
  ctx.save();

  // card
  ctx.fillStyle = "rgba(10,12,20,0.82)";
  ctx.strokeStyle = "rgba(160,170,205,0.35)";
  ctx.lineWidth = Math.max(1, h * 0.0025);
  roundRect(ctx, x, y, w, h, h * 0.02);
  ctx.fill();
  ctx.stroke();

  let cy = y + pad * 0.9;
  const left = x + pad;
  const innerW = w - pad * 2;

  // title
  ctx.fillStyle = "#f2ead6";
  ctx.font = `600 ${Math.round(h * 0.055)}px Georgia, 'Times New Roman', serif`;
  ctx.textBaseline = "top";
  const titleLines = wrapText(ctx, lore.name, innerW);
  for (const ln of titleLines) { ctx.fillText(ln, left, cy); cy += h * 0.062; }

  ctx.fillStyle = "#9aa2c2";
  ctx.font = `italic ${Math.round(h * 0.03)}px Georgia, serif`;
  ctx.fillText(lore.cls, left, cy);
  cy += h * 0.05;

  // divider
  ctx.strokeStyle = "rgba(200,180,140,0.45)";
  ctx.lineWidth = Math.max(1, h * 0.002);
  ctx.beginPath(); ctx.moveTo(left, cy); ctx.lineTo(left + innerW, cy); ctx.stroke();
  cy += h * 0.035;

  // stat rows
  const labelFont = `700 ${Math.round(h * 0.026)}px 'Segoe UI', Arial, sans-serif`;
  const valFont = `${Math.round(h * 0.028)}px Georgia, serif`;
  for (const [label, val] of lore.rows) {
    ctx.font = labelFont;
    ctx.fillStyle = "#8f97b8";
    ctx.fillText(label.toUpperCase(), left, cy);
    cy += h * 0.033;
    ctx.font = valFont;
    ctx.fillStyle = "#ded7c4";
    const lines = wrapText(ctx, val, innerW);
    for (const ln of lines) { ctx.fillText(ln, left, cy); cy += h * 0.036; }
    cy += h * 0.012;
  }

  cy += h * 0.015;
  // flavor paragraph
  ctx.font = `italic ${Math.round(h * 0.028)}px Georgia, serif`;
  ctx.fillStyle = "#b8ac90";
  const flavLines = wrapText(ctx, "“" + lore.flavor + "”", innerW);
  for (const ln of flavLines) { ctx.fillText(ln, left, cy); cy += h * 0.038; }

  // layer legend dots at the bottom
  const legendY = y + h - pad * 0.9;
  let lx = left;
  const dotR = h * 0.011;
  ctx.font = `${Math.round(h * 0.02)}px 'Segoe UI', Arial, sans-serif`;
  ctx.fillStyle = "#7c84a4";
  ctx.fillText(`${profile.layers.length} strata · ${TYPE_LABELS[profile.type]}`, left, legendY - h * 0.035);
  for (const layer of profile.layers) {
    ctx.beginPath();
    ctx.arc(lx + dotR, legendY + dotR, dotR, 0, TAU);
    ctx.fillStyle = layer.c1;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
    lx += dotR * 3.2;
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ============================================================
 * Composition: 16:9 (illustration + panel) and 1:1 (transparent)
 * ============================================================ */

function drawStars(ctx, w, h, rng, spaceColor) {
  ctx.fillStyle = spaceColor;
  ctx.fillRect(0, 0, w, h);
  const count = Math.floor((w * h) / 6000);
  for (let i = 0; i < count; i++) {
    const x = rng() * w, y = rng() * h;
    const s = rng() * 1.4 + 0.3;
    ctx.fillStyle = `rgba(255,255,255,${rrange(rng, 0.15, 0.7)})`;
    ctx.beginPath();
    ctx.arc(x, y, s * (h / 720), 0, TAU);
    ctx.fill();
  }
}

function render169(canvas, state) {
  const h = state.resolution;
  const w = Math.round(h * 16 / 9);
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  const seedNum = hashString(state.seed);
  const bgRng = mulberry32(seedNum ^ 0xbeef);

  drawStars(ctx, w, h, bgRng, state.profile.palette.space);

  // body on the left ~62% of width, panel on the right
  const panelW = w * 0.30;
  const panelMargin = h * 0.045;
  const bodyAreaW = w - panelW - panelMargin * 2;
  const cx = bodyAreaW * 0.52;
  const cy = h * 0.5;
  const R = Math.min(bodyAreaW * 0.5, h * 0.5) * 0.92 / state.profile.extent;

  drawBody(ctx, cx, cy, R, state.profile, seedNum);
  drawStatsPanel(ctx, w - panelW - panelMargin, panelMargin, panelW, h - panelMargin * 2, state.lore, state.profile);
  return canvas;
}

function render11(canvas, state) {
  const size = state.resolution;
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size); // transparent background
  const seedNum = hashString(state.seed);
  const R = (size / 2) * 0.94 / state.profile.extent;
  drawBody(ctx, size / 2, size / 2, R, state.profile, seedNum, { transparent: true });
  return canvas;
}

/* ============================================================
 * App state + UI wiring
 * ============================================================ */

const els = {};
["body-type", "seed", "palette", "wobble", "detail", "body-name", "resolution",
 "randomize-btn", "export-169-btn", "export-11-btn", "preview-canvas",
 "lock-body-type", "lock-seed", "lock-palette", "lock-wobble", "lock-detail", "lock-name",
 "wobble-val", "detail-val"].forEach(id => {
  els[id] = document.getElementById(id);
});

const state = {
  type: "rocky", seed: "ember-1", paletteName: "",
  wobble: 0.5, detail: 0.5, name: "", resolution: 720,
  profile: null, lore: null
};

function fillPaletteOptions(type, keep) {
  const names = Object.keys(PALETTES[type]);
  els["palette"].innerHTML = "";
  for (const n of names) {
    const opt = document.createElement("option");
    opt.value = n; opt.textContent = n;
    els["palette"].appendChild(opt);
  }
  els["palette"].value = keep && names.includes(keep) ? keep : names[0];
}

function regenerate() {
  state.type = els["body-type"].value;
  state.seed = els["seed"].value || "0";
  state.paletteName = els["palette"].value;
  state.wobble = els["wobble"].value / 100;
  state.detail = els["detail"].value / 100;
  state.resolution = clamp(parseInt(els["resolution"].value, 10) || 720, 240, 2160);

  els["wobble-val"].textContent = `(${els["wobble"].value})`;
  els["detail-val"].textContent = `(${els["detail"].value})`;

  const seedNum = hashString(state.seed + "|" + state.type + "|" + state.paletteName);
  const rng = mulberry32(seedNum);

  state.profile = makeProfile(state.type, rng, {
    paletteName: state.paletteName, wobble: state.wobble, detail: state.detail
  });

  const autoName = makeName(mulberry32(seedNum ^ 0x77aa));
  state.name = els["body-name"].value.trim() || autoName;
  if (!els["body-name"].value.trim()) els["body-name"].placeholder = autoName;

  state.lore = generateLore(state.type, mulberry32(seedNum ^ 0x1234), state.profile, state.name, state.paletteName);

  render169(els["preview-canvas"], state);
}

function randomize() {
  const r = Math.random;
  if (!els["lock-body-type"].checked) {
    const types = Object.keys(PALETTES);
    els["body-type"].value = types[Math.floor(r() * types.length)];
    fillPaletteOptions(els["body-type"].value, els["lock-palette"].checked ? els["palette"].value : null);
  }
  if (!els["lock-seed"].checked) {
    els["seed"].value = Math.floor(r() * 1e9).toString(36) + "-" + Math.floor(r() * 999);
  }
  if (!els["lock-palette"].checked) {
    const names = Object.keys(PALETTES[els["body-type"].value]);
    els["palette"].value = names[Math.floor(r() * names.length)];
  }
  if (!els["lock-wobble"].checked) els["wobble"].value = Math.floor(20 + r() * 70);
  if (!els["lock-detail"].checked) els["detail"].value = Math.floor(r() * 101);
  if (!els["lock-name"].checked) els["body-name"].value = "";
  regenerate();
}

function downloadCanvas(canvas, filename) {
  const a = document.createElement("a");
  a.download = filename;
  a.href = canvas.toDataURL("image/png");
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function safeName(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function export169() {
  const c = document.createElement("canvas");
  render169(c, state);
  downloadCanvas(c, `${safeName(state.name)}-${state.type}-16x9.png`);
  return c; // returned for automated verification
}
function export11() {
  const c = document.createElement("canvas");
  render11(c, state);
  downloadCanvas(c, `${safeName(state.name)}-${state.type}-1x1.png`);
  return c;
}

els["body-type"].addEventListener("change", () => {
  fillPaletteOptions(els["body-type"].value, null);
  regenerate();
});
["seed", "palette", "wobble", "detail", "resolution"].forEach(id =>
  els[id].addEventListener("input", regenerate));
els["body-name"].addEventListener("input", regenerate);
els["randomize-btn"].addEventListener("click", randomize);
els["export-169-btn"].addEventListener("click", export169);
els["export-11-btn"].addEventListener("click", export11);

// Exposed for automated verification (harmless in normal use).
window.CelestialCutaway = {
  state, regenerate, randomize, render169, render11, makeProfile,
  hashString, mulberry32, PALETTES,
  setInputs(opts) {
    if (opts.type) { els["body-type"].value = opts.type; fillPaletteOptions(opts.type, opts.palette || null); }
    if (opts.palette) els["palette"].value = opts.palette;
    if (opts.seed != null) els["seed"].value = String(opts.seed);
    if (opts.resolution) els["resolution"].value = opts.resolution;
    if (opts.wobble != null) els["wobble"].value = opts.wobble;
    if (opts.detail != null) els["detail"].value = opts.detail;
    regenerate();
  }
};

fillPaletteOptions(state.type, null);
regenerate();
