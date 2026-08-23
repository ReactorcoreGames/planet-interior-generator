/* Celestial Cutaway — generated bundle. DO NOT EDIT.
 * Built from src/ by build_bundle.mjs. Edit the modules under src/ and
 * re-run:  node build_bundle.mjs
 */
"use strict";
(function () {

/* ===== src/core/math.js ===== */
/* Small shared numeric helpers. */
const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, t) => a + (b - a) * t;
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
const rrange = (rng, lo, hi) => lo + rng() * (hi - lo);

/* Fisher-Yates on a copy; used to draw N distinct items from a pool. */
function shuffled(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function pickN(rng, arr, n) {
  return shuffled(rng, arr).slice(0, Math.min(n, arr.length));
}

/* Round to a sensible number of significant digits for display. */
function sig(v, digits = 3) {
  if (v === 0) return 0;
  const mag = Math.floor(Math.log10(Math.abs(v)));
  const f = Math.pow(10, digits - 1 - mag);
  return Math.round(v * f) / f;
}


/* ===== src/data/palettes.js ===== */
/* Palettes, keyed by body type. Every palette must supply the keys its
 * type's profile builder reads; missing keys fall back in profile code. */
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
  rocky: "Rocky World",
  gas: "Gas Giant",
  youngstar: "Young Star",
  oldstar: "Old Star"
};

/* Ordered list drives the body-type dropdown. */
const TYPE_ORDER = ["rocky", "gas", "youngstar", "oldstar"];


/* ===== src/render/styles.js ===== */
/* Art styles.
 *
 * A style is a transform applied to an already-built profile. Because every
 * visual decision in a profile is data (wobble amplitude, noise, texture,
 * edge width), a style can rewrite those fields without the renderer knowing
 * which style is active. This is why three very different looks share one
 * engine instead of needing three forks of the program.
 *
 *   artistic  — the original hand-illustrated look, untouched.
 *   semitech  — tamed: gentle boundary variation, texture at low strength,
 *               gradients dominant. Organic but predictable.
 *   vector    — true circles, flat two-stop gradients, crisp hairlines, no
 *               procedural texture. Designed so a downstream hue/curves
 *               filter produces clean, predictable results.
 */
const STYLES = {
  artistic: {
    id: "artistic",
    label: "Artistic",
    hint: "The original illustrated look — organic boundaries, rich procedural texture."
  },
  semitech: {
    id: "semitech",
    label: "Semi-technical",
    hint: "Tamed boundaries and faint texture. Still organic, much easier to filter."
  },
  vector: {
    id: "vector",
    label: "Vector / Technical",
    hint: "Perfect circles, flat gradients, crisp edges, no texture. Best for recoloring."
  }
};
const STYLE_ORDER = ["artistic", "semitech", "vector"];

/* Texture strength multipliers per style. `null` removes texture entirely. */
const TEXTURE_SCALE = { artistic: 1, semitech: 0.35, vector: 0 };

/* Boundary geometry multipliers. */
const GEOM = {
  artistic: { wobble: 1, noise: 1 },
  semitech: { wobble: 0.28, noise: 0.22 },
  vector: { wobble: 0, noise: 0 }
};

/* Reduce a texture's visual weight, or drop it. Counts scale down so the
 * semi-technical look thins out rather than merely fading. */
function scaleTexture(tx, scale) {
  if (!tx) return null;
  if (scale <= 0) {
    // Vector keeps the core glow — without it the innermost layer reads as a
    // flat disc and the cutaway loses its focal point — but nothing else.
    return tx.type === "glowcore" ? { ...tx, flat: true } : null;
  }
  const out = { ...tx, strength: scale };
  if (typeof tx.count === "number") {
    out.count = Math.max(1, Math.round(tx.count * (0.4 + scale * 0.6)));
  }
  if (typeof tx.density === "number") out.density = tx.density * scale;
  return out;
}

/* Apply a style to a profile, returning a new profile. Non-destructive so the
 * same base profile can be rendered in several styles for comparison. */
function applyStyle(profile, styleId) {
  const style = STYLES[styleId] ? styleId : "artistic";
  if (style === "artistic") return profile;

  const g = GEOM[style];
  const texScale = TEXTURE_SCALE[style];

  const layers = profile.layers.map(layer => {
    const out = {
      ...layer,
      wobbleAmp: layer.wobbleAmp * g.wobble,
      noiseAmp: layer.noiseAmp * g.noise,
      texture: scaleTexture(layer.texture, texScale)
    };

    if (style === "vector") {
      // Crisp, fully opaque hairline boundaries read as draughtsmanship.
      out.edge = layer.edge
        ? { ...layer.edge, width: 0.0035, alpha: Math.min(1, layer.edge.alpha + 0.3) }
        : null;
      // Flatten translucent shells (old-star envelopes) so filters behave.
      out.alpha = layer.alpha == null ? 1 : Math.min(1, layer.alpha + 0.25);
      out.flatFill = true;
    } else {
      out.edge = layer.edge
        ? { ...layer.edge, alpha: Math.min(1, layer.edge.alpha + 0.12) }
        : null;
    }
    return out;
  });

  const effects = { ...profile.effects };

  if (style === "vector") {
    // Soft volumetric effects fight a technical read; keep them, but tighter
    // and weaker so the drawing stays graphic.
    if (effects.haze) effects.haze = { ...effects.haze, alpha: effects.haze.alpha * 0.5 };
    if (effects.corona) effects.corona = { ...effects.corona, alpha: effects.corona.alpha * 0.55 };
    if (effects.flares) effects.flares = { ...effects.flares, crisp: true };
    if (effects.oceanArc) effects.oceanArc = { ...effects.oceanArc, crisp: true };
  } else if (style === "semitech") {
    if (effects.haze) effects.haze = { ...effects.haze, alpha: effects.haze.alpha * 0.8 };
    if (effects.corona) effects.corona = { ...effects.corona, alpha: effects.corona.alpha * 0.85 };
  }

  return { ...profile, layers, effects, style };
}


/* ===== src/core/color.js ===== */
/* Color utilities: hex/rgb/hsl conversion, mixing, and palette hue-shifting. */
function hexToRgb(hex) {
  const h = String(hex).replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}
function rgbToHex(r, g, b) {
  return "#" + [r, g, b]
    .map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"))
    .join("");
}
function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function mixHex(h1, h2, t) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  return rgbToHex(...a.map((v, i) => lerp(v, b[i], t)));
}

/* amt -1..1 : darken..lighten */
function shadeHex(hex, amt) {
  return amt >= 0 ? mixHex(hex, "#ffffff", amt) : mixHex(hex, "#000000", -amt);
}

/* --- HSL space, needed for hue rotation --- */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  h = ((h % 1) + 1) % 1;
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = t => {
    t = ((t % 1) + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
}
function hexToHsl(hex) { return rgbToHsl(...hexToRgb(hex)); }
function hslToHex(h, s, l) { return rgbToHex(...hslToRgb(h, s, l)); }

/* Rotate hue by `deg` degrees, optionally scaling saturation.
 * Near-greyscale colors (space backdrops, whites) are left alone so the
 * shift reads as a recolor of the *material*, not a tint of everything. */
function hueShiftHex(hex, deg, satScale = 1) {
  if (!deg && satScale === 1) return hex;
  const [h, s, l] = hexToHsl(hex);
  if (s < 0.06) return hex;
  return hslToHex(h + deg / 360, clamp(s * satScale, 0, 1), l);
}

/* Apply a hue shift across every color in a palette object. */
function hueShiftPalette(pal, deg, satScale = 1) {
  if (!deg && satScale === 1) return pal;
  const out = {};
  for (const k of Object.keys(pal)) {
    const v = pal[k];
    out[k] = typeof v === "string" && v.startsWith("#")
      ? hueShiftHex(v, deg, satScale)
      : v;
  }
  return out;
}

/* Relative luminance, for contrast decisions (overlay ink pick). */
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/* Pick a bright, saturated ink color that contrasts with the body but stays
 * in the palette family — used for the auto overlay ink. */
function deriveInk(pal) {
  const candidates = [pal.core, pal.inner, pal.haze, pal.corona, pal.band, pal.ice]
    .filter(c => typeof c === "string" && c.startsWith("#"));
  const base = candidates[0] || "#8fe8ff";
  let [h, s, l] = hexToHsl(base);
  // Push toward a luminous HUD tone: complementary-ish hue, high sat, high light.
  h = (h + 0.5) % 1;
  s = clamp(Math.max(s, 0.55), 0, 1);
  l = clamp(Math.max(l, 0.66), 0, 0.82);
  return hslToHex(h, s, l);
}


/* ===== src/lore/stats.js ===== */
/* Derived physical statistics.
 *
 * Numbers are computed from the *drawn geometry* rather than rolled blind:
 * the core fraction, the layer stack, and the body type feed a coarse
 * two-shell density model. A visibly large iron core therefore yields a
 * denser, higher-gravity world, and the readout always agrees with the
 * picture. Accuracy is "plausible to a science-literate reader", not
 * publication-grade astrophysics. */

/* Reference constants in SI-ish units, scaled to Earth = 1 where useful. */
const EARTH_RADIUS_KM = 6371;
const EARTH_MASS_KG = 5.972e24;
const EARTH_DENSITY = 5514;   // kg/m^3
const JUPITER_RADIUS_KM = 69911;
const SOLAR_RADIUS_KM = 696340;

/* Per-type physical envelopes.
 *
 * Mass is not integrated from raw material densities: doing that naively
 * gives absurd results for stars, whose interiors span nine orders of
 * magnitude in density between the core and the photosphere. Instead each
 * type is anchored to a real reference body and the *bulk* density is
 * modulated around a realistic mean by how much of the body is core. That
 * keeps the numbers recognizable (an Earth-sized rocky world lands near 1 g)
 * while preserving the property that matters: a visibly larger core yields a
 * denser, heavier, higher-gravity body.
 *
 *   densityRange  bulk density in kg/m^3 at coreFrac = min .. max observed
 *   radiusKm      plausible radius span for the type
 */
const TYPE_PHYSICS = {
  rocky: {
    radiusKm: [2400, 9800],
    densityRange: [3100, 9200],   // Mars-like .. iron-rich super-Mercury
    tempK: [180, 340],
    kind: "planet"
  },
  gas: {
    radiusKm: [45000, 92000],
    densityRange: [520, 2400],    // Saturn-like .. dense hot Jupiter
    tempK: [90, 210],
    kind: "planet"
  },
  youngstar: {
    radiusKm: [420000, 1150000],
    densityRange: [360, 3600],    // bulk solar density is ~1410 kg/m^3
    tempK: [4200, 9600],          // photosphere
    kind: "star"
  },
  oldstar: {
    // A red giant is enormous and almost entirely empty: Arcturus has ~1 solar
    // mass spread over 25 solar radii, giving a bulk density far below air and
    // a surface gravity of roughly 0.002 g.
    radiusKm: [8000000, 42000000],
    densityRange: [1e-5, 9e-4],
    tempK: [2900, 4600],
    kind: "star"
  }
};

/* Where a body's core fraction sits within the range its type can produce.
 * Normalizing against the type's own achievable span is what makes the
 * core-size → density relationship legible instead of being swamped by the
 * independently-varying radius. */
const CORE_FRAC_SPAN = {
  rocky: [0.16, 0.26],
  gas: [0.12, 0.20],
  youngstar: [0.22, 0.34],
  oldstar: [0.08, 0.14]
};

/* Sanity anchors, asserted by the test sweep so the model can't silently
 * drift into nonsense as types are added:
 *   rocky      0.3 – 2.5 g     (Mars .. dense super-Earth)
 *   gas        0.9 – 6 g       (Saturn .. massive Jupiter)
 *   youngstar  8   – 90 g      (solar surface gravity is ~28 g; low-mass
 *                               main-sequence stars run lower still)
 *   oldstar    5e-6 – 0.05 g   (giant envelopes are barely gravitationally
 *                               bound; evolved AGB stars reach ~1e-5 g)
 */
const GRAVITY_BOUNDS = {
  rocky: [0.3, 2.5],
  gas: [0.9, 6],
  youngstar: [8, 90],
  oldstar: [5e-6, 0.05]
};

/* Weather/atmosphere descriptors, chosen by computed temperature and by
 * whether the profile actually drew an atmosphere. */
const WEATHER = {
  cold: [
    "Persistent methane frost; still air broken by slow katabatic drainage.",
    "Dry, thin, and cold. Ice fog pools in the basins at night.",
    "Nitrogen snow falls in fine, unhurried flakes across the dark side."
  ],
  temperate: [
    "Banded weather cells with reliable seasonal rains. Landfall is routine.",
    "Mild and cyclonic; storm tracks run predictably along the terminator.",
    "Open skies, moderate winds, and a workable window most of the year."
  ],
  hot: [
    "Dense, hot, and slow-moving. Surface haze cuts visibility to a few km.",
    "Convective towers build daily; the lowlands run to superheated steam.",
    "Scouring dust seasons alternate with clear, punishing sunlight."
  ],
  airless: [
    "No atmosphere. Surface conditions are set entirely by insolation.",
    "Vacuum at the surface; thermal swing between day and night is extreme.",
    "Trace exosphere only — sputtered ions, nothing that could be called weather."
  ],
  gasgiant: [
    "Counter-rotating jets at every latitude; wind shear between bands is severe.",
    "Permanent storm systems, some older than the surveys that named them.",
    "Ammonia cirrus over deep convective cloud decks. No surface to reach."
  ],
  stellar: [
    "Photospheric granulation with an active, well-mapped magnetic cycle.",
    "Steady output with periodic flare activity along the active latitudes.",
    "Strong stellar wind; the heliopause sits far out and holds its shape."
  ]
};

const MAGNETO = [
  "Strong dipole; a broad, stable magnetosphere.",
  "Moderate field, offset from the rotational axis.",
  "Weak and irregular — patchy crustal remanence only.",
  "Vigorous field with a pronounced auroral oval."
];

/* Unit suffixes use ASCII words rather than the astronomical symbols
 * (M⊕, M♃, M☉). Those glyphs are missing from the common UI font stacks on
 * Windows and render as tofu boxes in the exported PNG, where there is no
 * font fallback to rescue them. */
function formatMass(earthMasses, kind) {
  if (kind === "star") {
    const solar = earthMasses / 332946;
    return `${sig(solar, 3)} Solar`;
  }
  if (earthMasses >= 40) return `${sig(earthMasses / 317.8, 3)} Jupiter`;
  return `${sig(earthMasses, 3)} Earth`;
}

function formatRadius(km, kind) {
  if (kind === "star") return `${sig(km / SOLAR_RADIUS_KM, 3)} Solar`;
  if (km >= 30000) return `${sig(km / JUPITER_RADIUS_KM, 3)} Jupiter`;
  return `${sig(km / EARTH_RADIUS_KM, 3)} Earth`;
}

function formatK(k) {
  return `${Math.round(k)} K`;
}

/* Gravity spans from a red giant's ~0.002 g to a young star's ~30 g, so a
 * fixed decimal count would print "0.00 g" at one end. */
function formatGravity(g) {
  if (g < 0.01) return `${g.toExponential(1)} g`;
  if (g < 1) return `${sig(g, 2)} g`;
  return `${sig(g, 3)} g`;
}

/* Bulk density likewise ranges over nine orders of magnitude across types. */
function formatDensity(d) {
  if (d < 0.01) return `${d.toExponential(1)} kg/m³`;
  if (d < 10) return `${sig(d, 2)} kg/m³`;
  return `${Math.round(d).toLocaleString("en-US")} kg/m³`;
}

function celsius(k) {
  return Math.round(k - 273.15);
}

/* Rotation period, chosen per type with a plausible spread. */
function rotationPeriod(type, rng) {
  if (type === "gas") return `${sig(rrange(rng, 8, 19), 2)} h`;
  if (type === "rocky") {
    const h = rrange(rng, 14, 96);
    return h > 48 ? `${sig(h / 24, 2)} d` : `${sig(h, 2)} h`;
  }
  if (type === "youngstar") return `${sig(rrange(rng, 3, 22), 2)} d`;
  return `${sig(rrange(rng, 60, 900), 2)} d`;
}

/* Main entry: compute the full stat block for a built profile. */
function computeStats(type, profile, rng) {
  const phys = TYPE_PHYSICS[type] || TYPE_PHYSICS.rocky;
  const layers = profile.layers;

  // The core's outer radius as a fraction of the body radius — recorded by
  // the profile builder, and the same value the renderer draws to.
  const coreFrac = clamp(
    profile.coreRadius != null ? profile.coreRadius : layers[layers.length - 1].frac,
    0.02, 0.95);

  // Position the core within the span this type can actually produce, then
  // map that onto the type's bulk-density range. Bigger drawn core, denser
  // body — the relationship the readout is supposed to express.
  const span = CORE_FRAC_SPAN[type] || CORE_FRAC_SPAN.rocky;
  const coreT = clamp((coreFrac - span[0]) / (span[1] - span[0]), 0, 1);
  const meanDensity = lerp(phys.densityRange[0], phys.densityRange[1], coreT);

  // Radius: bigger when there are more strata (a richer, more differentiated
  // body reads as larger), jittered by seed.
  //
  // Because g = (4/3)πGρr is linear in BOTH density and radius, letting the
  // radius roam over its full range would swamp the density signal entirely
  // and the core-size relationship would be invisible in the final number.
  // Radius variation is therefore damped, leaving core size as the dominant
  // term in surface gravity — which is the point of deriving stats from the
  // drawing in the first place.
  const strataT = clamp((layers.length - 3) / 5, 0, 1);
  const radiusT = clamp(strataT * 0.45 + rng() * 0.55, 0, 1);
  const radiusSpread = 0.42; // fraction of the full radius range actually used
  const radiusKm = lerp(phys.radiusKm[0], phys.radiusKm[1],
    0.5 + (radiusT - 0.5) * radiusSpread);

  const radiusM = radiusKm * 1000;
  const volume = (4 / 3) * Math.PI * Math.pow(radiusM, 3);
  const massKg = meanDensity * volume;
  const earthMasses = massKg / EARTH_MASS_KG;

  // Surface gravity g = GM/r^2, expressed in Earth g.
  const G = 6.674e-11;
  const gravity = (G * massKg) / (radiusM * radiusM) / 9.80665;

  // Escape velocity, km/s.
  const escape = Math.sqrt((2 * G * massKg) / radiusM) / 1000;

  // Temperature band. Stars report photosphere; planets report surface range.
  const tMid = lerp(phys.tempK[0], phys.tempK[1], rng());
  const swing = phys.kind === "star"
    ? tMid * 0.04
    : (profile.effects.haze ? tMid * 0.16 : tMid * 0.55); // no air = wild swing
  const tLo = tMid - swing, tHi = tMid + swing;

  // Weather bucket.
  let weatherKey;
  if (type === "gas") weatherKey = "gasgiant";
  else if (phys.kind === "star") weatherKey = "stellar";
  else if (!profile.effects.haze) weatherKey = "airless";
  else if (tMid < 240) weatherKey = "cold";
  else if (tMid > 300) weatherKey = "hot";
  else weatherKey = "temperate";

  const hasAir = weatherKey !== "airless" && phys.kind !== "star";
  const pressureBar = hasAir
    ? (type === "gas" ? null : sig(rrange(rng, 0.15, 4.2), 2))
    : 0;

  // Computed once — the panel and the overlay must report the same value.
  const rotation = rotationPeriod(type, rng);

  return {
    kind: phys.kind,
    coreFrac,
    meanDensity,
    radiusKm,
    massEarth: earthMasses,
    gravity,
    escape,
    tempMid: tMid,
    tempLo: tLo,
    tempHi: tHi,
    weatherKey,
    weather: pick(rng, WEATHER[weatherKey]),
    magnetosphere: pick(rng, MAGNETO),
    pressureBar,
    rotation,

    /* Display-ready rows, used by both the side panel and the overlay. */
    display: {
      mass: formatMass(earthMasses, phys.kind),
      radius: formatRadius(radiusKm, phys.kind),
      diameterKm: `${Math.round(radiusKm * 2).toLocaleString("en-US")} km`,
      gravity: formatGravity(gravity),
      density: formatDensity(meanDensity),
      escape: `${sig(escape, 3)} km/s`,
      temp: phys.kind === "star"
        ? `${formatK(tMid)} photosphere`
        : `${formatK(tLo)} – ${formatK(tHi)}  (${celsius(tLo)} – ${celsius(tHi)} °C)`,
      pressure: pressureBar === null ? "no defined surface"
        : pressureBar === 0 ? "vacuum"
        : `${pressureBar} bar`,
      rotation
    }
  };
}

/* Short, overlay-sized nuggets: 2–4 word fragments for callout lines. */
function statNuggets(stats, type) {
  const d = stats.display;
  const out = [];
  if (stats.kind === "star") {
    out.push(d.mass, d.radius, d.temp, d.density);
  } else {
    out.push(d.gravity, d.mass, d.diameterKm, d.temp, d.pressure, d.escape);
  }
  return out.filter(Boolean);
}


/* ===== src/render/overlay.js ===== */
/* Hologram / technical-schematic overlay.
 *
 * Draws leader lines from points inside the body out to labelled callouts
 * ranged down the left and right margins, with stat nuggets listed beneath
 * each label. Also draws a corner header block (name, class, verdict) and a
 * legend for elements that aren't a single contiguous thing.
 *
 * Callout placement is deterministic and collision-free: targets are sorted
 * into a left and a right column by which side of the body they sit on, then
 * distributed down evenly spaced slots. Leader lines use an elbow (diagonal
 * from the target, then a short horizontal run into the text) which is the
 * convention technical illustration uses and which keeps text baselines
 * aligned regardless of where the target sits. */
const INK_PRESETS = {
  auto: { label: "Auto (from palette)", color: null },
  cyan: { label: "Cyan", color: "#7fe9ff" },
  amber: { label: "Amber", color: "#ffc46b" },
  green: { label: "Green", color: "#8dffa8" },
  white: { label: "White", color: "#eef2ff" },
  red: { label: "Red", color: "#ff8a8a" },
  violet: { label: "Violet", color: "#c9a3ff" }
};
function resolveInk(inkId, palette) {
  const preset = INK_PRESETS[inkId];
  if (preset && preset.color) return preset.color;
  return deriveInk(palette);
}

/* Choose which things get a callout, and where each one points. */
function buildTargets(profile, features, stats, R, cx, cy, opts) {
  const targets = [];
  const layers = profile.layers;

  // Layer callouts: point at the mid-radius of each layer's annulus, at an
  // angle spread around the circle so leader lines don't stack up.
  if (opts.showLayers !== false) {
    const n = layers.length;
    for (let i = 0; i < n; i++) {
      const outer = layers[i].frac;
      const inner = i + 1 < n ? layers[i + 1].frac : 0;
      const mid = (outer + inner) / 2;
      // Alternate sides and walk down the circle so successive layers don't
      // all exit at the same angle.
      const side = i % 2 === 0 ? -1 : 1;
      const t = (i + 0.5) / n;
      const ang = side * lerp(0.55, 2.55, t);
      targets.push({
        kind: "layer",
        label: layers[i].name || `Layer ${i + 1}`,
        sub: layers[i].desc || "",
        nuggets: [],
        x: cx + Math.cos(ang) * R * mid,
        y: cy + Math.sin(ang) * R * mid,
        side: Math.cos(ang) >= 0 ? "right" : "left"
      });
    }
  }

  // Feature callouts point at the exact spot the marker was drawn.
  // A feature named after a structural layer ("The Tachocline") would sit
  // beside that layer's own callout and read as a duplicate, so skip it.
  if (opts.showFeatures !== false) {
    const layerKeys = new Set(
      targets.filter(t => t.kind === "layer")
        .map(t => t.label.toLowerCase().replace(/\s+(ii|iii|iv|v|vi)$/, "").trim()));
    const norm = s => s.toLowerCase().replace(/^the\s+/, "").trim();
    // Features are sometimes prefixed with the body's name ("Aelmimi
    // Tachocline"), so compare the trailing words too.
    const clashes = name => {
      const n = norm(name);
      if (layerKeys.has(n)) return true;
      const parts = n.split(/\s+/);
      return parts.length > 1 && layerKeys.has(parts.slice(1).join(" "));
    };

    for (const f of features) {
      if (clashes(f.name)) continue;
      const x = cx + Math.cos(f.angle) * R * f.r;
      const y = cy + Math.sin(f.angle) * R * f.r;
      targets.push({
        kind: "feature",
        tier: f.tier,
        label: f.name,
        sub: f.note,
        nuggets: [],
        x, y,
        side: x >= cx ? "right" : "left"
      });
    }
  }

  // Attach stat nuggets to the layer they actually describe: surface figures
  // on the outermost callout, bulk figures on the core. Round-robin placement
  // reads as noise ("vacuum" under Outer Core), which defeats the purpose of
  // annotating the diagram instead of listing the numbers.
  if (opts.showStats !== false) {
    const hosts = targets.filter(t => t.kind === "layer");
    if (hosts.length) {
      const d = stats.display;
      const surface = hosts[0];
      const core = hosts[hosts.length - 1];
      const mid = hosts[Math.floor(hosts.length / 2)];

      if (stats.kind === "star") {
        surface.nuggets.push(d.temp, d.radius);
        core.nuggets.push(d.mass, d.density);
      } else {
        surface.nuggets.push(d.temp);
        if (d.pressure !== "no defined surface") surface.nuggets.push(d.pressure);
        surface.nuggets.push(d.gravity);
        mid.nuggets.push(d.diameterKm);
        core.nuggets.push(d.mass, d.density);
      }
      // Escape velocity belongs with whichever callout is least loaded.
      hosts.reduce((a, b) => (a.nuggets.length <= b.nuggets.length ? a : b))
        .nuggets.push(d.escape);
    }
  }

  return targets;
}

/* Assign each target a text anchor in its margin column, evenly spaced and
 * ordered by vertical position so leader lines never cross.
 *
 * Callout text is wrapped to a fixed column width and its measured line count
 * drives the slot height, which is what keeps neighbouring callouts from
 * overlapping each other or running across the illustration. The column width
 * is derived from the gap between the canvas edge and the body, so text can
 * never reach the body no matter how large the render. */
function layoutColumns(ctx, targets, w, h, cx, R, lineH) {
  // Keep a clear channel between the text column and the body's outer extent,
  // and a margin between the text and the canvas edge.
  const pad = w * 0.032;
  const gutter = w * 0.05;
  const bodyLeft = cx - R * 1.30;
  const colW = Math.max(w * 0.13, Math.min(w * 0.225, bodyLeft - pad - gutter));

  // Rebalance the columns. Targets are assigned a side by geometry, which can
  // stack most of them on one side and leave the other nearly empty; the
  // crowded column then compresses to unreadability. Move the targets nearest
  // the vertical centre line across until the split is even.
  const cols = { left: [], right: [] };
  for (const t of targets) cols[t.side].push(t);
  const balance = () => {
    const [big, small] = cols.left.length >= cols.right.length
      ? ["left", "right"] : ["right", "left"];
    while (cols[big].length - cols[small].length > 1) {
      // The best candidate to move is the one closest to the centre line,
      // since its leader line changes direction least.
      let bestI = 0, bestD = Infinity;
      cols[big].forEach((t, i) => {
        const d = Math.abs(t.x - cx);
        if (d < bestD) { bestD = d; bestI = i; }
      });
      const moved = cols[big].splice(bestI, 1)[0];
      moved.side = small;
      cols[small].push(moved);
    }
  };
  balance();

  // Measure with the same font the sub-line is drawn in.
  const subFont = `${Math.round(h * 0.0165)}px 'Segoe UI', Arial, sans-serif`;

  for (const side of ["left", "right"]) {
    const list = cols[side].sort((a, b) => a.y - b.y);
    if (!list.length) continue;

    ctx.save();
    ctx.font = subFont;
    for (const t of list) {
      t.subLines = t.sub ? wrap(ctx, t.sub, colW) : [];
      // A long note on a layer callout is decoration; on a feature callout it
      // is the point. Trim layer notes rather than let them dominate.
      if (t.kind === "layer" && t.subLines.length > 1) t.subLines = t.subLines.slice(0, 1);
      else if (t.subLines.length > 3) t.subLines = t.subLines.slice(0, 3);
    }
    ctx.restore();

    const heights = list.map(t =>
      lineH * (1 + t.subLines.length + t.nuggets.length) + lineH * 0.6);
    const totalH = heights.reduce((a, b) => a + b, 0);
    const top = h * 0.175, bottom = h * 0.955;
    const avail = bottom - top;
    const scale = totalH > avail ? avail / totalH : 1;

    let y = top + Math.max(0, (avail - totalH * scale) / 2);
    list.forEach((t, i) => {
      t.textY = y;
      t.textH = heights[i] * scale;
      t.colW = colW;
      t.anchorX = side === "left" ? pad : w - pad;
      y += heights[i] * scale;
    });
  }
  return targets;
}

function drawLeader(ctx, t, ink, R) {
  // Elbow: target → diagonal → short horizontal run → text anchor.
  const anchorY = t.textY + 1;
  const stubLen = R * 0.10;
  const elbowX = t.side === "left" ? t.anchorX + stubLen : t.anchorX - stubLen;

  ctx.save();
  ctx.strokeStyle = rgba(ink, 0.55);
  ctx.lineWidth = Math.max(1, R * 0.004);
  ctx.beginPath();
  ctx.moveTo(t.x, t.y);
  ctx.lineTo(elbowX, anchorY);
  ctx.lineTo(t.anchorX, anchorY);
  ctx.stroke();

  // Target node: a small ring, filled for rare features so they read as
  // the point of interest they are.
  const nodeR = Math.max(2, R * (t.tier === "rare" ? 0.014 : 0.009));
  ctx.beginPath();
  ctx.arc(t.x, t.y, nodeR, 0, TAU);
  if (t.tier === "rare") {
    ctx.fillStyle = rgba(ink, 0.9);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(t.x, t.y, nodeR * 2.1, 0, TAU);
    ctx.strokeStyle = rgba(ink, 0.5);
    ctx.stroke();
  } else {
    ctx.strokeStyle = rgba(ink, 0.85);
    ctx.lineWidth = Math.max(1, R * 0.0035);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCallout(ctx, t, ink, h) {
  const align = t.side === "left" ? "left" : "right";
  const x = t.anchorX;
  const lineH = h * 0.021;
  let y = t.textY;

  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = "top";

  // Label — truncated to the column so a long feature name can't bleed out.
  ctx.font = `600 ${Math.round(h * 0.0195)}px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillStyle = t.tier === "rare" ? shadeHex(ink, 0.35) : ink;
  // "*" rather than a diamond glyph: the geometric-shape block is absent from
  // the default Windows UI fonts and renders as a tofu box in the export.
  let label = t.tier === "rare" ? "* " + t.label.toUpperCase() : t.label.toUpperCase();
  if (t.colW && ctx.measureText(label).width > t.colW) {
    while (label.length > 4 && ctx.measureText(label + "…").width > t.colW) {
      label = label.slice(0, -1);
    }
    label += "…";
  }
  ctx.fillText(label, x, y);
  y += lineH;

  // Descriptive sub-lines, pre-wrapped to the column during layout.
  if (t.subLines && t.subLines.length) {
    ctx.font = `${Math.round(h * 0.0165)}px 'Segoe UI', Arial, sans-serif`;
    ctx.fillStyle = rgba(ink, 0.62);
    for (const ln of t.subLines) {
      ctx.fillText(ln, x, y);
      y += lineH * 0.92;
    }
  }

  // Stat nuggets, tick-marked so they read as data points off the line
  if (t.nuggets.length) {
    ctx.font = `${Math.round(h * 0.016)}px 'Consolas', 'SF Mono', monospace`;
    ctx.fillStyle = rgba(ink, 0.85);
    for (const ng of t.nuggets) {
      const s = align === "left" ? "· " + ng : ng + " ·";
      ctx.fillText(s, x, y);
      y += lineH * 0.88;
    }
  }
  ctx.restore();
}

/* Header block: identity and the survey verdict. */
function drawHeader(ctx, x, y, w, h, lore, stats, ink) {
  ctx.save();
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  ctx.font = `600 ${Math.round(h * 0.052)}px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillStyle = ink;
  ctx.fillText(lore.name.toUpperCase(), x, y);
  let cy = y + h * 0.058;

  ctx.font = `${Math.round(h * 0.021)}px 'Segoe UI', Arial, sans-serif`;
  ctx.fillStyle = rgba(ink, 0.7);
  ctx.fillText(`${lore.cls}  ·  ${lore.rows[0][1]}`, x, cy);
  cy += h * 0.03;

  ctx.strokeStyle = rgba(ink, 0.35);
  ctx.lineWidth = Math.max(1, h * 0.0015);
  ctx.beginPath();
  ctx.moveTo(x, cy); ctx.lineTo(x + w, cy); ctx.stroke();
  cy += h * 0.016;

  ctx.font = `${Math.round(h * 0.0175)}px 'Segoe UI', Arial, sans-serif`;
  ctx.fillStyle = rgba(ink, 0.6);
  for (const line of wrap(ctx, lore.verdict, w)) {
    ctx.fillText(line, x, cy);
    cy += h * 0.023;
  }
  ctx.restore();
  return cy;
}

function wrap(ctx, text, maxWidth) {
  const words = String(text).split(" ");
  const lines = [];
  let line = "";
  for (const wd of words) {
    const test = line ? line + " " + wd : wd;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = wd; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/* Legend for non-contiguous elements: things represented by a swatch or a
 * marker style rather than by a single labelled region. */
function drawLegend(ctx, x, y, h, ink, profile, features) {
  const entries = [];
  const fx = profile.effects;

  if (fx.oceanArc) entries.push({ swatch: fx.oceanArc.color, text: "Hydrosphere / surface liquid" });
  if (fx.oceanArc && fx.oceanArc.ice) entries.push({ swatch: fx.oceanArc.iceColor, text: "Ice cap / frozen margin" });
  if (fx.haze) entries.push({ swatch: fx.haze.color, text: "Atmosphere" });
  if (fx.corona) entries.push({ swatch: fx.corona.color, text: "Corona" });
  if (fx.ring) entries.push({ swatch: fx.ring.color, text: "Ring system" });
  if (fx.flares) entries.push({ swatch: fx.flares.color, text: "Flare activity" });
  if (features.some(f => f.tier === "rare")) {
    entries.push({ node: "rare", text: "Anomaly — unexplained" });
  }
  if (features.some(f => f.tier === "common")) {
    entries.push({ node: "common", text: "Notable feature" });
  }
  if (!entries.length) return;

  ctx.save();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = `${Math.round(h * 0.016)}px 'Segoe UI', Arial, sans-serif`;
  const rowH = h * 0.026;
  const sw = h * 0.014;

  ctx.fillStyle = rgba(ink, 0.5);
  ctx.font = `600 ${Math.round(h * 0.015)}px 'Segoe UI', Arial, sans-serif`;
  ctx.fillText("LEGEND", x, y);
  let cy = y + rowH;

  ctx.font = `${Math.round(h * 0.016)}px 'Segoe UI', Arial, sans-serif`;
  for (const e of entries) {
    if (e.swatch) {
      ctx.fillStyle = rgba(e.swatch, 0.9);
      ctx.fillRect(x, cy - sw / 2, sw, sw);
      ctx.strokeStyle = rgba(ink, 0.35);
      ctx.lineWidth = 1;
      ctx.strokeRect(x, cy - sw / 2, sw, sw);
    } else {
      ctx.beginPath();
      ctx.arc(x + sw / 2, cy, sw * 0.38, 0, TAU);
      if (e.node === "rare") { ctx.fillStyle = rgba(ink, 0.9); ctx.fill(); }
      else { ctx.strokeStyle = rgba(ink, 0.85); ctx.lineWidth = 1.2; ctx.stroke(); }
    }
    ctx.fillStyle = rgba(ink, 0.72);
    ctx.fillText(e.text, x + sw * 1.9, cy);
    cy += rowH;
  }
  ctx.restore();
}

/* Faint technical furniture: reticle rings, tick marks, and a scale bar.
 * Sells the "instrument readout" read without adding information noise. */
function drawReticle(ctx, cx, cy, R, ink, stats, h, canvasH) {
  ctx.save();
  ctx.strokeStyle = rgba(ink, 0.18);
  ctx.lineWidth = Math.max(0.8, R * 0.0025);

  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.06, 0, TAU);
  ctx.stroke();

  ctx.setLineDash([R * 0.012, R * 0.024]);
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.14, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);

  // Angular ticks every 15°, longer every 90°.
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    const major = i % 6 === 0;
    const r0 = R * 1.06, r1 = R * (major ? 1.10 : 1.08);
    ctx.strokeStyle = rgba(ink, major ? 0.4 : 0.2);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
  }

  // Scale bar, pinned near the canvas bottom rather than to the body radius,
  // so it never collides with a large body or its corona.
  const barY = Math.max(cy + R * 1.24, canvasH * 0.93);
  const halfW = R * 0.5;
  ctx.strokeStyle = rgba(ink, 0.4);
  ctx.lineWidth = Math.max(1, R * 0.003);
  ctx.beginPath();
  ctx.moveTo(cx - halfW, barY); ctx.lineTo(cx + halfW, barY);
  ctx.moveTo(cx - halfW, barY - R * 0.012); ctx.lineTo(cx - halfW, barY + R * 0.012);
  ctx.moveTo(cx + halfW, barY - R * 0.012); ctx.lineTo(cx + halfW, barY + R * 0.012);
  ctx.stroke();

  ctx.fillStyle = rgba(ink, 0.6);
  ctx.font = `${Math.round(h * 0.015)}px 'Consolas', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  // The bar spans R (half the body's width on screen), so it measures one
  // body radius. Labelling it with the diameter would be off by 2x.
  const spanKm = Math.round(stats.radiusKm);
  ctx.fillText(`${spanKm.toLocaleString("en-US")} km  (1 radius)`, cx, barY + h * 0.012);
  ctx.restore();
}

/* Main entry. Draws the full overlay over an already-rendered body. */
function drawOverlay(ctx, w, h, cx, cy, R, ctxData) {
  const { profile, lore, stats, features, ink, options } = ctxData;
  const pad = w * 0.028;
  const lineH = h * 0.021;

  drawReticle(ctx, cx, cy, R, ink, stats, h, h);

  const targets = buildTargets(profile, features, stats, R, cx, cy, options);
  layoutColumns(ctx, targets, w, h, cx, R, lineH);

  for (const t of targets) drawLeader(ctx, t, ink, R);
  for (const t of targets) drawCallout(ctx, t, ink, h);

  const headerW = w * 0.30;
  drawHeader(ctx, pad, h * 0.045, headerW, h, lore, stats, ink);

  drawLegend(ctx, pad, h * 0.80, h, ink, profile, features);

  // Corner branding, subtle and consistent with the instrument framing.
  ctx.save();
  ctx.font = `${Math.round(h * 0.014)}px 'Segoe UI', Arial, sans-serif`;
  ctx.fillStyle = rgba(ink, 0.32);
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("CELESTIAL CUTAWAY  ·  reactorcore", w - pad, h - pad * 0.6);
  ctx.restore();
}


/* ===== src/core/rng.js ===== */
/* Seeded RNG + value noise. Deterministic across runs and platforms. */
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


/* ===== src/render/features.js ===== */
/* Visual markers for notable features.
 *
 * Each feature carries a `draw` hint; this maps hints to small drawing
 * routines placed at the feature's stored (r, angle). Markers are deliberately
 * restrained — they should read as "something is here" and support the
 * overlay's leader line, not compete with the layer art. */


function featureColor(profile, feature) {
  const pal = profile.palette;
  if (feature.tier === "rare") return pal.ice || pal.core || "#ffffff";
  return pal.haze || pal.band || pal.corona || pal.core || "#ffffff";
}
function drawFeatureMarkers(ctx, cx, cy, R, profile, features, noise, rng) {
  for (const f of features) {
    const col = featureColor(profile, f);
    const x = cx + Math.cos(f.angle) * R * f.r;
    const y = cy + Math.sin(f.angle) * R * f.r;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (f.draw) {
      case "gash":
      case "shatter": {
        // A jagged crustal fracture running along the surface.
        const span = f.draw === "shatter" ? 1.5 : rrange(rng, 0.35, 0.7);
        const segs = 18;
        ctx.strokeStyle = rgba(shadeHex(col, -0.5), 0.85);
        ctx.lineWidth = Math.max(1.2, R * (f.draw === "shatter" ? 0.02 : 0.011));
        ctx.beginPath();
        for (let i = 0; i <= segs; i++) {
          const t = i / segs;
          const th = f.angle - span / 2 + t * span;
          const jitter = 1 + 0.02 * Math.sin(t * 11 + f.angle * 3);
          const rr = R * f.r * jitter;
          const px = cx + Math.cos(th) * rr, py = cy + Math.sin(th) * rr;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        break;
      }

      case "storm":
      case "megastorm": {
        // An oval cyclone with an inner eye, sitting on the surface.
        const rad = R * (f.draw === "megastorm" ? 0.16 : 0.10);
        ctx.translate(x, y);
        ctx.rotate(f.angle + Math.PI / 2);
        const g = ctx.createRadialGradient(0, 0, rad * 0.1, 0, 0, rad);
        g.addColorStop(0, rgba(shadeHex(col, 0.4), 0.9));
        g.addColorStop(0.55, rgba(col, 0.55));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, rad, rad * 0.62, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = rgba(shadeHex(col, -0.3), 0.5);
        ctx.lineWidth = Math.max(1, rad * 0.10);
        for (let s = 0; s < 3; s++) {
          ctx.beginPath();
          ctx.ellipse(0, 0, rad * (0.35 + s * 0.22), rad * (0.22 + s * 0.14),
                      s * 0.4, 0.5, 0.5 + 4.4);
          ctx.stroke();
        }
        break;
      }

      case "spot": {
        const rad = R * 0.055;
        ctx.fillStyle = rgba(shadeHex(col, -0.55), 0.7);
        ctx.beginPath();
        ctx.ellipse(x, y, rad, rad * 0.7, f.angle, 0, TAU);
        ctx.fill();
        ctx.fillStyle = rgba(shadeHex(col, -0.3), 0.5);
        ctx.beginPath();
        ctx.ellipse(x, y, rad * 1.5, rad * 1.05, f.angle, 0, TAU);
        ctx.fill();
        break;
      }

      case "band":
      case "shear":
      case "pulse": {
        // A highlighted annular band at the feature's radius.
        ctx.strokeStyle = rgba(col, 0.4);
        ctx.lineWidth = Math.max(1.5, R * 0.022);
        ctx.beginPath();
        ctx.arc(cx, cy, R * f.r, f.angle - 0.9, f.angle + 0.9);
        ctx.stroke();
        ctx.strokeStyle = rgba(shadeHex(col, 0.4), 0.55);
        ctx.lineWidth = Math.max(0.8, R * 0.006);
        ctx.beginPath();
        ctx.arc(cx, cy, R * f.r, f.angle - 0.9, f.angle + 0.9);
        ctx.stroke();
        break;
      }

      case "patch":
      case "cells": {
        const rad = R * 0.085;
        ctx.fillStyle = rgba(col, 0.22);
        ctx.beginPath();
        ctx.ellipse(x, y, rad, rad * 0.75, f.angle, 0, TAU);
        ctx.fill();
        if (f.draw === "cells") {
          ctx.strokeStyle = rgba(shadeHex(col, 0.3), 0.4);
          ctx.lineWidth = Math.max(0.6, R * 0.004);
          for (let i = 0; i < 7; i++) {
            const a = rng() * TAU, d = rng() * rad * 0.8;
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rad * rrange(rng, 0.12, 0.26), 0, TAU);
            ctx.stroke();
          }
        }
        break;
      }

      case "spike":
      case "twincore": {
        // A dense intrusion reaching outward from the deep interior.
        const r0 = R * 0.2, r1 = R * f.r;
        ctx.strokeStyle = rgba(shadeHex(col, 0.25), 0.6);
        ctx.lineWidth = Math.max(1.5, R * 0.018);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(f.angle) * r0, cy + Math.sin(f.angle) * r0);
        ctx.lineTo(cx + Math.cos(f.angle) * r1, cy + Math.sin(f.angle) * r1);
        ctx.stroke();
        if (f.draw === "twincore") {
          const g = ctx.createRadialGradient(x, y, 0, x, y, R * 0.12);
          g.addColorStop(0, rgba(shadeHex(col, 0.5), 0.95));
          g.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, R * 0.12, 0, TAU);
          ctx.fill();
        }
        break;
      }

      case "pocket":
      case "cavity": {
        const rad = R * (f.draw === "cavity" ? 0.15 : 0.07);
        ctx.fillStyle = f.draw === "cavity"
          ? "rgba(4,6,12,0.85)" : rgba(shadeHex(col, -0.6), 0.55);
        ctx.beginPath();
        ctx.ellipse(x, y, rad, rad * 0.82, f.angle, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = rgba(shadeHex(col, 0.35), 0.65);
        ctx.lineWidth = Math.max(1, R * 0.005);
        ctx.stroke();
        break;
      }

      case "sparkle":
      case "speck":
      case "garden": {
        const n = f.draw === "speck" ? 26 : 18;
        const spread = R * 0.11;
        for (let i = 0; i < n; i++) {
          const a = rng() * TAU, d = rng() * spread;
          const s = Math.max(0.7, R * rrange(rng, 0.002, 0.006));
          ctx.fillStyle = rgba(shadeHex(col, 0.45), rrange(rng, 0.35, 0.9));
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, s, 0, TAU);
          ctx.fill();
        }
        break;
      }

      case "shine": {
        ctx.strokeStyle = rgba(shadeHex(col, 0.55), 0.35);
        ctx.lineWidth = Math.max(1.5, R * 0.014);
        ctx.beginPath();
        ctx.arc(cx, cy, R * f.r, 0, TAU);
        ctx.stroke();
        break;
      }

      case "arc":
      case "arch":
      case "ribbon": {
        const rad = R * 0.13;
        ctx.strokeStyle = rgba(shadeHex(col, 0.4), 0.6);
        ctx.lineWidth = Math.max(1.5, R * (f.draw === "ribbon" ? 0.016 : 0.010));
        ctx.beginPath();
        const a0 = f.angle - 0.3, a1 = f.angle + 0.3;
        const p0x = cx + Math.cos(a0) * R * 0.97, p0y = cy + Math.sin(a0) * R * 0.97;
        const p1x = cx + Math.cos(a1) * R * 0.97, p1y = cy + Math.sin(a1) * R * 0.97;
        const mx = cx + Math.cos(f.angle) * (R + rad * 2), my = cy + Math.sin(f.angle) * (R + rad * 2);
        ctx.moveTo(p0x, p0y);
        ctx.quadraticCurveTo(mx, my, p1x, p1y);
        ctx.stroke();
        break;
      }

      case "gap": {
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = Math.max(1.5, R * 0.018);
        ctx.beginPath();
        ctx.arc(cx, cy, R * f.r, f.angle - 0.5, f.angle + 0.5);
        ctx.stroke();
        break;
      }

      case "polygon": {
        const rad = R * 0.09;
        ctx.strokeStyle = rgba(shadeHex(col, 0.4), 0.7);
        ctx.lineWidth = Math.max(1, R * 0.006);
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
          const a = f.angle + (i / 6) * TAU;
          const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad * 0.8;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        break;
      }

      case "lattice": {
        const rad = R * 0.16;
        ctx.strokeStyle = rgba(shadeHex(col, 0.4), 0.45);
        ctx.lineWidth = Math.max(0.8, R * 0.004);
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(x - rad, y + i * rad * 0.4);
          ctx.lineTo(x + rad, y + i * rad * 0.4);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + i * rad * 0.4, y - rad);
          ctx.lineTo(x + i * rad * 0.4, y + rad);
          ctx.stroke();
        }
        break;
      }

      case "shell": {
        ctx.strokeStyle = rgba(col, 0.3);
        ctx.lineWidth = Math.max(1, R * 0.008);
        ctx.setLineDash([R * 0.03, R * 0.02]);
        ctx.beginPath();
        ctx.arc(cx, cy, R * f.r, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }

      case "derelicts": {
        for (let i = 0; i < 9; i++) {
          const a = f.angle + rrange(rng, -0.7, 0.7);
          const rr = R * f.r * rrange(rng, 0.97, 1.03);
          const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
          ctx.fillStyle = rgba(shadeHex(col, 0.2), 0.8);
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(a + rng());
          ctx.fillRect(-R * 0.012, -R * 0.004, R * 0.024, R * 0.008);
          ctx.restore();
        }
        break;
      }

      case "aurora": {
        ctx.strokeStyle = rgba(shadeHex(col, 0.5), 0.45);
        ctx.lineWidth = Math.max(1.5, R * 0.02);
        ctx.beginPath();
        ctx.arc(cx, cy, R * 1.02, f.angle - 0.45, f.angle + 0.45);
        ctx.stroke();
        break;
      }

      case "companion": {
        const rad = R * 0.05;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 3);
        g.addColorStop(0, rgba(shadeHex(col, 0.6), 1));
        g.addColorStop(0.3, rgba(col, 0.6));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, rad * 3, 0, TAU);
        ctx.fill();
        break;
      }

      default: {
        // Unknown hint: a soft point of interest so the callout still lands.
        const rad = R * 0.05;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, rgba(shadeHex(col, 0.4), 0.7));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}


/* ===== src/render/body.js ===== */
/* The shared rendering engine: perturbed concentric layers plus declared
 * effects. Every body type flows through this one function. */
function layerRadius(theta, baseR, layer, noise, seedOff) {
  if (!layer.wobbleAmp && !layer.noiseAmp) return baseR; // vector style: true circle
  const s = layer.noiseScale;
  const n = noise.fbm(Math.cos(theta) * s + seedOff * 7.3, Math.sin(theta) * s + seedOff * 3.1, 3);
  return baseR * (1 +
    layer.wobbleAmp * Math.sin(layer.wobbleFreq * theta + seedOff * 2.4) +
    layer.noiseAmp * (n - 0.5) * 2);
}
function traceLayerPath(ctx, cx, cy, baseR, layer, noise, seedOff, steps = 200) {
  ctx.beginPath();
  // A perfect circle needs no polygonal approximation, and arc() gives a
  // genuinely smooth edge at any export resolution.
  if (!layer.wobbleAmp && !layer.noiseAmp) {
    ctx.arc(cx, cy, baseR, 0, TAU);
    ctx.closePath();
    return;
  }
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

/* ============================================================
 * Flares — rewritten.
 *
 * The old version stroked two fixed-width quadratic curves, which produced
 * thin, hard-edged hairpins that read as scribble rather than plasma. This
 * builds each flare as a tapered ribbon: a filled polygon whose half-width
 * follows a curve (narrow at the footpoint, widest at mid-arch, tapering to
 * nothing at the tip), drawn several times at increasing width and falling
 * alpha to fake a volumetric soft edge. A bright thin core is laid inside
 * the widest passes so the flare still has definition.
 * ============================================================ */

/* Centerline of one prominence loop.
 *
 * Built in a local frame anchored to the limb — "up" is radially outward from
 * the star's centre, "across" is tangential — rather than in polar
 * coordinates. Sweeping a polar angle across the loop drags it sideways
 * around the limb (it reads as a ribbon orbiting the star), and easing that
 * sweep instead curls the ends inward into a lasso. In a local frame the arch
 * is just a simple parabola-like curve: across goes -1 → +1 while up follows
 * a sine bump, which is exactly the shape of a real magnetic loop. */
function flarePath(cx, cy, base, aMid, halfSep, len, arch, segs) {
  // Unit vectors of the local frame at the loop's midpoint.
  const ux = Math.cos(aMid), uy = Math.sin(aMid);          // radially outward
  const tx = -uy, ty = ux;                                  // tangential

  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const across = (t * 2 - 1) * halfSep;                   // -halfSep .. +halfSep
    // Slight flattening at the apex so it reads as an arch, not a spike.
    const up = Math.pow(Math.sin(t * Math.PI), 0.8) * len * arch;
    const x = cx + ux * base + ux * up + tx * across;
    const y = cy + uy * base + uy * up + ty * across;
    pts.push([x, y, t]);
  }
  return pts;
}

function ribbonPath(ctx, pts, halfWidth) {
  // Build a closed polygon by offsetting the centerline perpendicular to its
  // local direction, out along one side and back along the other.
  const n = pts.length;
  const norms = [];
  for (let i = 0; i < n; i++) {
    const p = pts[Math.max(0, i - 1)], q = pts[Math.min(n - 1, i + 1)];
    let dx = q[0] - p[0], dy = q[1] - p[1];
    const m = Math.hypot(dx, dy) || 1;
    norms.push([-dy / m, dx / m]);
  }
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const [x, y, t] = pts[i];
    // Taper: zero at the footpoint, full at ~40% along, zero at the tip.
    const w = halfWidth * Math.sin(Math.pow(t, 0.65) * Math.PI);
    const [nx, ny] = norms[i];
    const px = x + nx * w, py = y + ny * w;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  for (let i = n - 1; i >= 0; i--) {
    const [x, y, t] = pts[i];
    const w = halfWidth * Math.sin(Math.pow(t, 0.65) * Math.PI);
    const [nx, ny] = norms[i];
    ctx.lineTo(x - nx * w, y - ny * w);
  }
  ctx.closePath();
}

function drawFlares(ctx, cx, cy, R, flares, rng, glowComp, alphaScale = 1) {
  ctx.save();
  if (glowComp) ctx.globalCompositeOperation = glowComp;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (let i = 0; i < flares.count; i++) {
    // Where on the limb the loop is anchored, and how far apart its two
    // footpoints sit (as a distance, not an angle — see flarePath).
    const aMid = rng() * TAU;
    const halfSep = R * rrange(rng, 0.10, 0.24);
    const len = R * flares.len * rrange(rng, 0.85, 1.3);
    const base = R * 0.94;
    const arch = rrange(rng, 0.9, 1.2);
    const pts = flarePath(cx, cy, base, aMid, halfSep, len, arch, 44);

    // Width scales with the flare's own length so big flares look massive
    // rather than merely long, with a floor tied to the body radius so they
    // never thin out to a hairline at small render sizes.
    const coreW = Math.max(2.6, R * 0.030 + len * 0.075);

    const A = a => Math.min(1, a * alphaScale);

    if (flares.crisp) {
      // Vector style: a clean tapered shape with one soft halo, no fuzz.
      ribbonPath(ctx, pts, coreW * 1.5);
      ctx.fillStyle = rgba(flares.color, A(0.20));
      ctx.fill();
      ribbonPath(ctx, pts, coreW * 0.75);
      ctx.fillStyle = rgba(flares.color, A(0.85));
      ctx.fill();
      continue;
    }

    // Soft build-up: several increasingly wide, increasingly faint passes.
    // Together they approximate a volumetric glow with no blur filter.
    const passes = [
      { w: 5.2, a: 0.055 },
      { w: 3.4, a: 0.085 },
      { w: 2.2, a: 0.13 },
      { w: 1.45, a: 0.20 },
      { w: 1.0, a: 0.30 }
    ];
    for (const p of passes) {
      ribbonPath(ctx, pts, coreW * p.w);
      ctx.fillStyle = rgba(flares.color, A(p.a));
      ctx.fill();
    }

    // Bright inner filament, kept thin so the soft mass around it reads.
    ribbonPath(ctx, pts, coreW * 0.42);
    ctx.fillStyle = rgba(shadeHex(flares.color, 0.35), A(0.75));
    ctx.fill();

    // A warm bloom pooled at the footpoint, where plasma is densest.
    const [fx0, fy0] = pts[0];
    const fg = ctx.createRadialGradient(fx0, fy0, 0, fx0, fy0, coreW * 4.5);
    fg.addColorStop(0, rgba(flares.color, A(0.5)));
    fg.addColorStop(1, rgba(flares.color, 0));
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(fx0, fy0, coreW * 4.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/* ============================================================
 * Layer textures
 * ============================================================ */

function drawTexture(ctx, cx, cy, layerR, innerR, layer, noise, seedOff, rng) {
  const tx = layer.texture;
  if (!tx) return;
  const strength = tx.strength == null ? 1 : tx.strength;
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
    if (tx.strong && !tx.flat) {
      ctx.globalAlpha = 0.35 * strength;
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
    ctx.lineWidth = Math.max(1, (layerR - innerR) * 0.08);
    for (let b = 1; b <= tx.count; b++) {
      const r = lerp(innerR, layerR, b / (tx.count + 1));
      ctx.strokeStyle = rgba(tx.color, 0.5 * strength);
      traceLayerPath(ctx, cx, cy, r, layer, noise, seedOff + b * 0.37, 140);
      ctx.stroke();
    }
  }

  else if (tx.type === "speckle") {
    const n = Math.floor(120 * tx.density);
    ctx.fillStyle = rgba(tx.color, 0.5 * strength);
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
    const thick = Math.max(1, (layerR - innerR) * 0.10);
    for (let b = 0; b < tx.count; b++) {
      const r = lerp(innerR + thick, layerR - thick, (b + 0.5) / tx.count);
      const a0 = rng() * TAU;
      const span = rrange(rng, 1.2, 3.4);
      ctx.strokeStyle = rgba(tx.color, rrange(rng, 0.25, 0.5) * strength);
      ctx.lineWidth = thick * rrange(rng, 0.5, 1.1);
      ctx.lineCap = "round";
      ctx.beginPath();
      const segs = 40;
      for (let s = 0; s <= segs; s++) {
        const th = a0 + (s / segs) * span;
        const wobR = r * (1 + 0.04 * Math.sin(th * 3 + b) +
          0.03 * (noise.fbm(Math.cos(th) * 2 + b, Math.sin(th) * 2 + seedOff, 2) - 0.5) * 2);
        const x = cx + Math.cos(th) * wobR, y = cy + Math.sin(th) * wobR;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (tx.curl && rng() < 0.5) {
        const th = a0 + span;
        const px = cx + Math.cos(th) * r, py = cy + Math.sin(th) * r;
        ctx.beginPath();
        ctx.arc(px, py, thick * 1.4, th, th + 4.2);
        ctx.stroke();
      }
    }
  }

  else if (tx.type === "plasma") {
    ctx.lineCap = "round";
    for (let i = 0; i < tx.count; i++) {
      const a = rng() * TAU;
      const rr = lerp(innerR, layerR, rng());
      const bright = rng() < 0.6;
      ctx.strokeStyle = rgba(bright ? tx.color : tx.dark, rrange(rng, 0.3, 0.6) * strength);
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
    ctx.lineCap = "round";
    for (let i = 0; i < tx.count; i++) {
      const a = rng() * TAU;
      const rr = lerp(innerR, layerR, rng());
      ctx.strokeStyle = rgba(rng() < 0.5 ? tx.color : tx.dark, rrange(rng, 0.15, 0.35) * strength);
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

/* ============================================================
 * Whole-body draw
 * ============================================================ */
function drawBody(ctx, cx, cy, R, profile, seedNum, opts = {}) {
  const noise = makeNoise2D(seedNum ^ 0x9e3779b9);
  const rng = mulberry32(seedNum ^ 0x51ab3f);
  const fx = profile.effects;
  // Additive blending reads correctly over a dark backdrop but turns a soft
  // radial gradient into a flat opaque disc over transparency, so the big
  // volumetric glows (corona, haze) fall back to source-over and are damped.
  //
  // Flares are exempt: they are bounded tapered shapes rather than full-disc
  // gradients, so they composite cleanly onto alpha. Damping them was making
  // them almost invisible in the transparent 1:1 export, which is the export
  // most likely to be composited over a bright background.
  const glowComp = opts.transparent ? null : "lighter";
  const glowScale = opts.transparent ? 0.55 : 1;
  const flareScale = opts.transparent ? 1.35 : 1;

  if (fx.corona) {
    drawGlow(ctx, cx, cy, R * 0.85, R * fx.corona.outer, fx.corona.color, fx.corona.alpha * glowScale, glowComp);
    drawGlow(ctx, cx, cy, R * 0.5, R * (fx.corona.outer + 0.08), fx.corona.color, fx.corona.alpha * 0.4 * glowScale, glowComp);
  }
  if (fx.haze) {
    drawGlow(ctx, cx, cy, R * 0.92, R * fx.haze.outer, fx.haze.color, fx.haze.alpha * glowScale);
  }
  if (fx.ring) drawRing(ctx, cx, cy, R, fx.ring, "back");

  // Flares sit under the disc so they appear to emerge from the limb.
  if (fx.flares) drawFlares(ctx, cx, cy, R, fx.flares, rng, glowComp, flareScale);

  // Concentric layers, outermost first; inner layers paint over outer ones.
  const n = profile.layers.length;
  for (let i = 0; i < n; i++) {
    const layer = profile.layers[i];
    const layerR = R * layer.frac;
    const nextFrac = i + 1 < n ? profile.layers[i + 1].frac : 0;
    const innerR = R * nextFrac;
    const seedOff = i * 1.618 + 0.31;
    const alpha = layer.alpha != null ? layer.alpha : 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    traceLayerPath(ctx, cx, cy, layerR, layer, noise, seedOff);
    if (layer.flatFill) {
      // Vector style: a shallow linear ramp instead of a radial one. Flat,
      // even coverage is what makes downstream filtering predictable.
      const g = ctx.createLinearGradient(cx - layerR, cy - layerR, cx + layerR, cy + layerR);
      g.addColorStop(0, layer.c1);
      g.addColorStop(1, layer.c0);
      ctx.fillStyle = g;
    } else {
      const g = ctx.createRadialGradient(cx, cy, innerR * 0.85, cx, cy, layerR);
      g.addColorStop(0, layer.c1);
      g.addColorStop(1, layer.c0);
      ctx.fillStyle = g;
    }
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    drawTexture(ctx, cx, cy, layerR, innerR, layer, noise, seedOff, rng);
    ctx.restore();

    if (layer.edge) {
      ctx.save();
      ctx.globalAlpha = alpha * layer.edge.alpha;
      ctx.strokeStyle = layer.edge.color;
      ctx.lineWidth = Math.max(0.8, R * layer.edge.width);
      traceLayerPath(ctx, cx, cy, layerR, layer, noise, seedOff);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Surface-attached effects. Ocean arcs must follow the crust's own
  // perturbed boundary rather than a plain circle: on a wobbly world a
  // circular arc crosses outside the surface wherever the boundary dips
  // inward, leaving water apparently floating in space.
  if (fx.oceanArc) {
    const surface = profile.layers[0];
    const seedOff = 0.31;
    ctx.save();
    traceLayerPath(ctx, cx, cy, R * surface.frac, surface, noise, seedOff);
    ctx.clip();
    ctx.lineCap = fx.oceanArc.crisp ? "butt" : "round";
    ctx.lineJoin = "round";

    const strokeAlongSurface = (from, to, inset, width, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = R * width;
      ctx.beginPath();
      const segs = Math.max(8, Math.ceil(Math.abs(to - from) * 24));
      for (let i = 0; i <= segs; i++) {
        const th = from + (to - from) * (i / segs);
        // Track the actual boundary, then sit just below it.
        const rr = layerRadius(th, R * surface.frac, surface, noise, seedOff) - R * inset;
        const x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    for (let a = 0; a < fx.oceanArc.arcs; a++) {
      const st = fx.oceanArc.start + a * 2.1;
      const span = fx.oceanArc.span * rrange(rng, 0.7, 1.1);
      strokeAlongSurface(st, st + span, fx.oceanArc.width * 0.55,
        fx.oceanArc.width, rgba(fx.oceanArc.color, 0.9));
      if (fx.oceanArc.ice) {
        strokeAlongSurface(st - 0.25, st, fx.oceanArc.width * 0.4,
          fx.oceanArc.width * 0.6, rgba(fx.oceanArc.iceColor, 0.95));
      }
    }
    ctx.restore();
  }

  // Notable features drawn into the body itself.
  if (opts.features && opts.features.length) {
    drawFeatureMarkers(ctx, cx, cy, R, profile, opts.features, noise, mulberry32(seedNum ^ 0x2f7d));
  }

  // Global depth shading. Skipped in vector style, where an off-center
  // highlight would defeat the flat, filterable look.
  if (profile.style !== "vector") {
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
  }

  if (fx.ring) drawRing(ctx, cx, cy, R, fx.ring, "front");
}


/* ===== src/render/panel.js ===== */
/* The side panel used when the hologram overlay is off. Carries identity,
 * physical stats, structural rows, notable features, and the layer legend. */
function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
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
function drawStatsPanel(ctx, x, y, w, h, data) {
  const { lore, profile, stats, features } = data;
  const pad = w * 0.085;
  ctx.save();

  ctx.fillStyle = "rgba(10,12,20,0.82)";
  ctx.strokeStyle = "rgba(160,170,205,0.35)";
  ctx.lineWidth = Math.max(1, h * 0.0025);
  roundRect(ctx, x, y, w, h, h * 0.02);
  ctx.fill();
  ctx.stroke();

  let cy = y + pad * 0.85;
  const left = x + pad;
  const innerW = w - pad * 2;
  ctx.textBaseline = "top";

  // Identity
  ctx.fillStyle = "#f2ead6";
  ctx.font = `600 ${Math.round(h * 0.05)}px Georgia, 'Times New Roman', serif`;
  for (const ln of wrapText(ctx, lore.name, innerW)) {
    ctx.fillText(ln, left, cy); cy += h * 0.056;
  }
  ctx.fillStyle = "#9aa2c2";
  ctx.font = `italic ${Math.round(h * 0.027)}px Georgia, serif`;
  ctx.fillText(lore.cls, left, cy);
  cy += h * 0.042;

  ctx.strokeStyle = "rgba(200,180,140,0.45)";
  ctx.lineWidth = Math.max(1, h * 0.002);
  ctx.beginPath(); ctx.moveTo(left, cy); ctx.lineTo(left + innerW, cy); ctx.stroke();
  cy += h * 0.024;

  // Physical stats as a compact two-column grid — the "starship survey" data.
  const d = stats.display;
  const grid = stats.kind === "star"
    ? [["Mass", d.mass], ["Radius", d.radius], ["Photosphere", `${Math.round(stats.tempMid)} K`],
       ["Density", d.density], ["Rotation", d.rotation], ["Escape v", d.escape]]
    : [["Mass", d.mass], ["Gravity", d.gravity], ["Diameter", d.diameterKm],
       ["Pressure", d.pressure], ["Rotation", d.rotation], ["Escape v", d.escape]];

  const colW = innerW / 2;
  const labelF = `700 ${Math.round(h * 0.0165)}px 'Segoe UI', Arial, sans-serif`;
  const valF = `${Math.round(h * 0.023)}px 'Consolas', monospace`;
  for (let i = 0; i < grid.length; i += 2) {
    for (let c = 0; c < 2 && i + c < grid.length; c++) {
      const gx = left + c * colW;
      ctx.font = labelF; ctx.fillStyle = "#7f87a8";
      ctx.fillText(grid[i + c][0].toUpperCase(), gx, cy);
      ctx.font = valF; ctx.fillStyle = "#dfe4f2";
      ctx.fillText(grid[i + c][1], gx, cy + h * 0.021);
    }
    cy += h * 0.05;
  }

  cy += h * 0.006;
  ctx.strokeStyle = "rgba(200,180,140,0.25)";
  ctx.beginPath(); ctx.moveTo(left, cy); ctx.lineTo(left + innerW, cy); ctx.stroke();
  cy += h * 0.022;

  // Temperature + weather get their own emphasis: what it's like to be there.
  ctx.font = labelF; ctx.fillStyle = "#7f87a8";
  ctx.fillText("SURFACE CONDITIONS", left, cy); cy += h * 0.024;
  ctx.font = `${Math.round(h * 0.021)}px 'Consolas', monospace`;
  ctx.fillStyle = "#dfe4f2";
  for (const ln of wrapText(ctx, d.temp, innerW)) { ctx.fillText(ln, left, cy); cy += h * 0.026; }
  ctx.font = `${Math.round(h * 0.0205)}px Georgia, serif`;
  ctx.fillStyle = "#c3c9dd";
  for (const ln of wrapText(ctx, stats.weather, innerW)) { ctx.fillText(ln, left, cy); cy += h * 0.026; }
  cy += h * 0.014;

  // Structural rows
  const rowLabelF = `700 ${Math.round(h * 0.0165)}px 'Segoe UI', Arial, sans-serif`;
  const rowValF = `${Math.round(h * 0.0215)}px Georgia, serif`;
  for (const [label, val] of lore.rows.slice(2)) {
    ctx.font = rowLabelF; ctx.fillStyle = "#7f87a8";
    ctx.fillText(label.toUpperCase(), left, cy); cy += h * 0.023;
    ctx.font = rowValF; ctx.fillStyle = "#ded7c4";
    for (const ln of wrapText(ctx, val, innerW)) { ctx.fillText(ln, left, cy); cy += h * 0.026; }
    cy += h * 0.008;
  }

  // Notable features
  if (features.length) {
    cy += h * 0.008;
    ctx.font = rowLabelF; ctx.fillStyle = "#7f87a8";
    ctx.fillText("NOTABLE", left, cy); cy += h * 0.024;
    for (const f of features) {
      ctx.font = `600 ${Math.round(h * 0.0205)}px 'Segoe UI', Arial, sans-serif`;
      ctx.fillStyle = f.tier === "rare" ? "#ffd98a" : "#cdd4e8";
      const bullet = f.tier === "rare" ? "* " : "· ";
      ctx.fillText(bullet + f.name, left, cy); cy += h * 0.024;
      ctx.font = `${Math.round(h * 0.0185)}px Georgia, serif`;
      ctx.fillStyle = "#9aa2bd";
      for (const ln of wrapText(ctx, f.note, innerW - h * 0.014)) {
        ctx.fillText(ln, left + h * 0.014, cy); cy += h * 0.022;
      }
      cy += h * 0.006;
    }
  }

  // Verdict line, anchored above the legend at the bottom.
  const legendY = y + h - pad * 0.75;
  ctx.font = `italic ${Math.round(h * 0.0195)}px Georgia, serif`;
  ctx.fillStyle = "#b8ac90";
  const vLines = wrapText(ctx, lore.verdict, innerW);
  let vy = legendY - h * 0.048 - vLines.length * h * 0.024;
  if (vy > cy + h * 0.01) {
    for (const ln of vLines) { ctx.fillText(ln, left, vy); vy += h * 0.024; }
  }

  // Layer legend dots
  ctx.font = `${Math.round(h * 0.018)}px 'Segoe UI', Arial, sans-serif`;
  ctx.fillStyle = "#7c84a4";
  ctx.fillText(`${profile.layers.length} strata · ${TYPE_LABELS[profile.type] || profile.type}`,
    left, legendY - h * 0.032);
  let lx = left;
  const dotR = h * 0.0105;
  for (const layer of profile.layers) {
    ctx.beginPath();
    ctx.arc(lx + dotR, legendY + dotR, dotR, 0, TAU);
    ctx.fillStyle = layer.c1;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
    lx += dotR * 3.1;
  }
  ctx.restore();
}


/* ===== src/render/scene.js ===== */
/* Scene composition: backgrounds and the two export layouts. */
const BG_MODES = {
  starfield: "Starfield (from palette)",
  solid: "Solid color",
  transparent: "Transparent"
};

/* Paint the background. Returns true if anything opaque was drawn, which the
 * body renderer needs to know: additive glow only works over opaque pixels. */
function drawBackground(ctx, w, h, mode, opts) {
  if (mode === "transparent") {
    ctx.clearRect(0, 0, w, h);
    return false;
  }
  if (mode === "solid") {
    ctx.fillStyle = opts.color || "#0a0c14";
    ctx.fillRect(0, 0, w, h);
    return true;
  }
  // Starfield
  const rng = opts.rng || mulberry32(1);
  ctx.fillStyle = opts.color || "#0a0c14";
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
  return true;
}

/* 16:9 composition. With the overlay on, the body is centered and full-bleed
 * and the callouts occupy the margins; with it off, the body sits left and the
 * stats panel occupies the right third. */
function render169(canvas, state) {
  const h = state.resolution;
  const w = Math.round(h * 16 / 9);
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  const seedNum = hashString(state.seed);
  const bgRng = mulberry32(seedNum ^ 0xbeef);

  const opaque = drawBackground(ctx, w, h, state.bgMode, {
    color: state.bgMode === "solid" ? state.bgColor : state.profile.palette.space,
    rng: bgRng
  });

  const bodyOpts = { transparent: !opaque, features: state.features };

  if (state.overlay) {
    // The body is centered but deliberately modest in size: the callout
    // columns, header, legend and scale bar all need clear space, and a body
    // sized to fill the frame pushes the text into the canvas edges.
    const cx = w * 0.5;
    const cy = h * 0.5;
    const R = Math.min(w * 0.205, h * 0.335) / state.profile.extent;
    drawBody(ctx, cx, cy, R, state.profile, seedNum, bodyOpts);
    drawOverlay(ctx, w, h, cx, cy, R, {
      profile: state.profile,
      lore: state.lore,
      stats: state.stats,
      features: state.features,
      ink: resolveInk(state.ink, state.profile.palette),
      options: state.overlayOptions || {}
    });
  } else {
    const panelW = w * 0.30;
    const panelMargin = h * 0.045;
    const bodyAreaW = w - panelW - panelMargin * 2;
    const cx = bodyAreaW * 0.52;
    const cy = h * 0.5;
    const R = Math.min(bodyAreaW * 0.5, h * 0.5) * 0.92 / state.profile.extent;
    drawBody(ctx, cx, cy, R, state.profile, seedNum, bodyOpts);
    drawStatsPanel(ctx, w - panelW - panelMargin, panelMargin, panelW, h - panelMargin * 2, {
      lore: state.lore, profile: state.profile, stats: state.stats, features: state.features
    });
  }
  return canvas;
}

/* 1:1 composition — the body alone, honoring the chosen background. */
function render11(canvas, state) {
  const size = state.resolution;
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  const seedNum = hashString(state.seed);
  const bgRng = mulberry32(seedNum ^ 0xbeef);

  // The square export defaults to transparent unless the user picked a
  // background explicitly — it exists to be composited elsewhere.
  const mode = state.bgMode11 || state.bgMode;
  const opaque = drawBackground(ctx, size, size, mode, {
    color: mode === "solid" ? state.bgColor : state.profile.palette.space,
    rng: bgRng
  });

  const R = (size / 2) * 0.94 / state.profile.extent;
  drawBody(ctx, size / 2, size / 2, R, state.profile, seedNum, {
    transparent: !opaque, features: state.features
  });
  return canvas;
}


/* ===== src/profiles/index.js ===== */
/* Body profiles.
 *
 * A profile is pure data describing what to draw; the renderer contains no
 * per-type branches beyond what the profile declares. Art style is applied
 * afterward (see render/styles.js) by rewriting these same fields, so a
 * profile is always authored in its "Artistic" form.
 *
 * profile = {
 *   type, palette, extent,
 *   layers: [{ frac, name, desc, c0, c1, wobbleAmp, wobbleFreq, noiseAmp,
 *              noiseScale, texture, alpha, edge }]   // outermost first
 *   effects: { haze, oceanArc, ring, corona, flares }
 * }
 */
/* Layer naming per type, outermost → innermost. The renderer's overlay uses
 * these for callout labels, so they must read as real structural terms. */
const LAYER_NAMES = {
  rocky: [
    { name: "Crust", desc: "solid rock, fractured and cratered" },
    { name: "Upper Mantle", desc: "ductile silicate, slow convection" },
    { name: "Lower Mantle", desc: "high-pressure minerals" },
    { name: "Transition Zone", desc: "phase-change boundary" },
    { name: "Outer Core", desc: "liquid metal, dynamo source" },
    { name: "Inner Core", desc: "solid iron-nickel" },
    { name: "Core", desc: "dense metallic heart" }
  ],
  gas: [
    { name: "Upper Cloud Deck", desc: "ammonia cirrus" },
    { name: "Banded Troposphere", desc: "jet streams and storm cells" },
    { name: "Water Cloud Layer", desc: "convective, lightning-active" },
    { name: "Molecular Hydrogen", desc: "compressed, warming with depth" },
    { name: "Metallic Hydrogen", desc: "conductive — the dynamo layer" },
    { name: "Deep Envelope", desc: "supercritical fluid" },
    { name: "Rock-Ice Core", desc: "small, dense, extremely hot" }
  ],
  youngstar: [
    { name: "Chromosphere", desc: "thin, hot outer atmosphere" },
    { name: "Photosphere", desc: "the visible surface" },
    { name: "Convective Zone", desc: "rising and sinking plasma cells" },
    { name: "Tachocline", desc: "shear layer, dynamo origin" },
    { name: "Radiative Zone", desc: "energy crawls outward as photons" },
    { name: "Fusion Core", desc: "hydrogen burning to helium" }
  ],
  oldstar: [
    { name: "Outer Envelope", desc: "diffuse, cool, and expanding" },
    { name: "Convective Envelope", desc: "enormous overturning cells" },
    { name: "Hydrogen Shell", desc: "fusion continues around the core" },
    { name: "Helium Shell", desc: "burning to carbon and oxygen" },
    { name: "Inert Layer", desc: "spent fuel, compressed" },
    { name: "Degenerate Core", desc: "electron-degenerate, intensely hot" }
  ]
};

/* Pick names for a stack of n layers: always take the first (surface) and
 * last (core) entries, sampling the middle evenly so a 4-layer body and a
 * 7-layer body both read correctly. */
function nameLayers(type, n) {
  const pool = LAYER_NAMES[type] || LAYER_NAMES.rocky;
  if (n <= 0) return [];
  if (n === 1) return [pool[pool.length - 1]];
  if (n === 2) return [pool[0], pool[pool.length - 1]];

  // Always anchor the surface and the core, then sample the middle of the
  // pool evenly. When more layers are requested than the pool has entries,
  // repeated middle names are disambiguated ("Upper"/"Lower") so no two
  // callouts in the same diagram carry identical text.
  const out = [pool[0]];
  const midCount = n - 2;
  const used = new Map();
  for (let i = 0; i < midCount; i++) {
    const t = (i + 1) / (midCount + 1);
    const idx = clamp(Math.round(lerp(1, pool.length - 2, t)), 1, pool.length - 2);
    const entry = pool[idx];
    const seen = (used.get(entry.name) || 0) + 1;
    used.set(entry.name, seen);
    out.push(seen === 1 ? entry : {
      name: `${entry.name} ${["", "II", "III", "IV", "V", "VI"][seen - 1] || seen}`.trim(),
      desc: entry.desc
    });
  }
  out.push(pool[pool.length - 1]);
  return out;
}

/* Builds the concentric stack from the surface inward. Each layer's `frac`
 * is its OUTER radius as a fraction of the body radius; the innermost layer
 * therefore spans from its own frac down to 0 and is the core.
 *
 * Returns the layer array plus the core's outer radius, which the stats model
 * needs. Reading it off the last layer directly would be wrong-ish: that value
 * is the boundary the loop had reached before its final subtraction, so it
 * sits well above the `fracInner` the caller asked for. */
function buildLayerStack(rng, count, fracInner, profileOfLayer) {
  const layers = [];
  const weights = [];
  for (let i = 0; i < count; i++) weights.push(0.5 + rng());
  const total = weights.reduce((a, b) => a + b, 0);
  let frac = 1.0;
  for (let i = 0; i < count; i++) {
    layers.push(profileOfLayer(i, frac, count));
    frac -= (weights[i] / total) * (1.0 - fracInner);
  }
  layers.coreRadius = fracInner;
  return layers;
}function makeProfile(type, rng, opts) {
  const pal = PALETTES[type][opts.paletteName] || Object.values(PALETTES[type])[0];
  const wob = opts.wobble;   // 0..1
  const rich = opts.detail;  // 0..1
  const effects = {};
  let layers = [];
  let coreRadius = 0.2;

  if (type === "rocky") {
    const count = 4 + Math.round(rich * 3); // 4..7
    const names = nameLayers(type, count);
    const ramp = [pal.crust, pal.mantle2, pal.mantle, pal.inner, pal.core];
    coreRadius = rrange(rng, 0.16, 0.26);
    layers = buildLayerStack(rng, count, coreRadius, (i, frac, n) => {
      const t = i / (n - 1);
      const idx = t * (ramp.length - 1);
      const c0 = mixHex(ramp[Math.floor(idx)], ramp[Math.ceil(idx)], idx % 1);
      const isCore = i === n - 1;
      const isCrust = i === 0;
      return {
        frac, name: names[i].name, desc: names[i].desc,
        c0: shadeHex(c0, -0.12), c1: shadeHex(c0, 0.15),
        wobbleAmp: (isCrust ? 0.012 : 0.02 + 0.03 * rng()) * (0.4 + wob * 1.4),
        wobbleFreq: 3 + Math.floor(rng() * 6),
        noiseAmp: (isCrust ? 0.008 : 0.02) * (0.3 + wob * 1.6),
        noiseScale: rrange(rng, 1.5, 3.5),
        alpha: 1,
        texture: isCore ? { type: "glowcore", color: pal.core }
               : isCrust ? { type: "speckle", color: shadeHex(c0, -0.35), density: 0.5 }
               : { type: "bands", color: shadeHex(c0, rng() < 0.5 ? -0.22 : 0.18),
                   count: 2 + Math.floor(rng() * 3) },
        edge: { color: shadeHex(c0, -0.4), width: 0.006, alpha: 0.7 }
      };
    });
    effects.haze = rng() < 0.85
      ? { color: pal.haze, inner: 1.0, outer: rrange(rng, 1.08, 1.16), alpha: rrange(rng, 0.2, 0.4) }
      : null;
    // Surface liquid requires an atmosphere to hold it: without one it would
    // boil straight to vacuum. Skipping the ocean on airless worlds keeps the
    // illustration and the derived stats from contradicting each other.
    effects.oceanArc = effects.haze && rng() < 0.65 ? {
      color: pal.ocean, iceColor: pal.ice,
      arcs: 1 + Math.floor(rng() * 2),
      start: rng() * TAU, span: rrange(rng, 0.5, 1.4),
      width: 0.05, ice: rng() < 0.6
    } : null;
    effects.extent = effects.haze ? effects.haze.outer : 1.02;
  }

  else if (type === "gas") {
    const count = 4 + Math.round(rich * 3);
    const names = nameLayers(type, count);
    const ramp = [pal.crust, pal.mantle2, pal.mantle, pal.inner, pal.core];
    coreRadius = rrange(rng, 0.12, 0.2);
    layers = buildLayerStack(rng, count, coreRadius, (i, frac, n) => {
      const t = i / (n - 1);
      const idx = t * (ramp.length - 1);
      const c0 = mixHex(ramp[Math.floor(idx)], ramp[Math.ceil(idx)], idx % 1);
      const isCore = i === n - 1;
      return {
        frac, name: names[i].name, desc: names[i].desc,
        c0: shadeHex(c0, -0.1), c1: shadeHex(c0, 0.18),
        wobbleAmp: (0.025 + 0.035 * rng()) * (0.4 + wob * 1.5),
        wobbleFreq: 2 + Math.floor(rng() * 5),
        noiseAmp: 0.03 * (0.3 + wob * 1.7),
        noiseScale: rrange(rng, 1.2, 2.8),
        alpha: 1,
        texture: isCore ? { type: "glowcore", color: pal.core }
               : { type: "swirlbands",
                   color: i % 2 ? pal.band : pal.band2,
                   count: 3 + Math.floor(rng() * 3 + rich * 2),
                   curl: rng() < 0.6 },
        edge: { color: shadeHex(c0, -0.35), width: 0.005, alpha: 0.55 }
      };
    });
    effects.haze = { color: pal.haze, inner: 1.0, outer: rrange(rng, 1.06, 1.12), alpha: rrange(rng, 0.25, 0.4) };
    effects.ring = rng() < 0.6 ? {
      color: pal.ring, rIn: rrange(rng, 1.3, 1.5), rOut: rrange(rng, 1.6, 1.95),
      tilt: rrange(rng, -0.5, -0.2), squash: rrange(rng, 0.22, 0.34),
      alpha: rrange(rng, 0.5, 0.8), gaps: 1 + Math.floor(rng() * 2)
    } : null;
    effects.extent = effects.ring ? effects.ring.rOut : effects.haze.outer;
  }

  else if (type === "youngstar") {
    const count = 3 + Math.round(rich * 3); // 3..6
    const names = nameLayers(type, count);
    // A star is self-luminous: the photosphere must stay bright rather than
    // fading toward the dark end of the ramp the way a planet's crust does,
    // or the outermost shell reads as dirt instead of incandescent gas.
    const ramp = [pal.mantle2, pal.mantle, pal.inner, pal.core];
    coreRadius = rrange(rng, 0.22, 0.34);
    layers = buildLayerStack(rng, count, coreRadius, (i, frac, n) => {
      const t = i / (n - 1);
      const idx = t * (ramp.length - 1);
      const c0 = mixHex(ramp[Math.floor(idx)], ramp[Math.ceil(idx)], idx % 1);
      const isCore = i === n - 1;
      return {
        frac, name: names[i].name, desc: names[i].desc,
        c0: shadeHex(c0, 0.06), c1: shadeHex(c0, 0.30),
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
    effects.flares = rng() < 0.9
      ? { color: pal.flare, count: 2 + Math.floor(rng() * 4), len: rrange(rng, 0.25, 0.45) }
      : null;
    // Flare loops reach roughly 1.9x their nominal length once the random
    // height, arch and span multipliers compound, so the extent has to
    // allow for that or tall prominences clip at the canvas edge.
    effects.extent = Math.max(effects.corona.outer,
      effects.flares ? 1 + effects.flares.len * 1.9 : 1) + 0.05;
  }

  else { // oldstar
    const count = 4 + Math.round(rich * 3);
    const names = nameLayers(type, count);
    const ramp = [pal.shell, pal.crust, pal.mantle2, pal.mantle, pal.inner];
    coreRadius = rrange(rng, 0.08, 0.14);
    layers = buildLayerStack(rng, count, coreRadius, (i, frac, n) => {
      const t = i / (n - 1);
      const idx = t * (ramp.length - 1);
      const c0 = mixHex(ramp[Math.floor(idx)], ramp[Math.ceil(idx)], idx % 1);
      const isCore = i === n - 1;
      const outerness = 1 - t;
      return {
        frac, name: names[i].name, desc: names[i].desc,
        c0: shadeHex(c0, -0.08), c1: shadeHex(c0, 0.15),
        wobbleAmp: (0.04 + 0.05 * rng()) * (0.4 + wob * 1.7) * (0.5 + outerness),
        wobbleFreq: 2 + Math.floor(rng() * 4),
        noiseAmp: 0.05 * (0.3 + wob * 1.8) * (0.5 + outerness),
        noiseScale: rrange(rng, 1.0, 2.4),
        alpha: isCore ? 1 : clamp(0.55 + t * 0.5, 0, 1),
        texture: isCore ? { type: "glowcore", color: pal.core, strong: true }
               : { type: "wisps", color: shadeHex(c0, 0.3), dark: shadeHex(c0, -0.3),
                   count: 5 + Math.floor(rng() * 6 + rich * 4) },
        edge: { color: shadeHex(c0, 0.25), width: 0.004, alpha: 0.3 }
      };
    });
    effects.corona = { color: pal.corona, inner: 1.0, outer: rrange(rng, 1.2, 1.35), alpha: rrange(rng, 0.3, 0.5) };
    effects.flares = rng() < 0.5
      ? { color: pal.flare, count: 1 + Math.floor(rng() * 2), len: rrange(rng, 0.15, 0.3) }
      : null;
    // Flare loops reach roughly 1.9x their nominal length once the random
    // height, arch and span multipliers compound, so the extent has to
    // allow for that or tall prominences clip at the canvas edge.
    effects.extent = Math.max(effects.corona.outer,
      effects.flares ? 1 + effects.flares.len * 1.9 : 1) + 0.05;
  }

  return { type, layers, effects, extent: effects.extent, palette: pal, coreRadius };
}


/* ===== src/lore/features.js ===== */
/* Notable features — the thing that turns a diagram into a *place*.
 *
 * Every body draws 1–3 COMMON features. Roughly one in ten also draws a
 * single RARE feature: a genuine anomaly worth routing a ship to see.
 *
 * Each feature carries:
 *   name    display name, often uniquified with the body name
 *   note    one line a survey officer would actually write
 *   zone    "surface" | "interior" | "orbit"  — where it sits radially
 *   draw    optional marker hint the renderer can act on
 *   tier    "common" | "rare"
 *
 * Placement (radius fraction + angle) is assigned at build time so the
 * overlay can run a leader line to the exact spot that was drawn. */
/* ---------------- Common pools, per body type ---------------- */

const COMMON = {
  rocky: [
    { name: "Meridian Rift", zone: "surface", draw: "gash",
      note: "A continent-spanning tectonic trench. Sheltered, and warm at depth." },
    { name: "The Shield Highlands", zone: "surface", draw: "patch",
      note: "Ancient stable craton — the safest ground on the planet for a base." },
    { name: "Ashfall Belt", zone: "surface", draw: "band",
      note: "A ring of young volcanoes. Rich in metals, hard on filtration systems." },
    { name: "Iron Spike", zone: "interior", draw: "spike",
      note: "A dense intrusion reaching unusually far toward the crust." },
    { name: "Basalt Shelf", zone: "surface", draw: "patch",
      note: "Flat, level flood-basalt plain. An excellent natural landing field." },
    { name: "The Warm Shallows", zone: "surface", draw: "arc", needs: "ocean",
      note: "Geothermally heated sea. Liquid year-round; likely biologically active." },
    { name: "Crustal Bloom", zone: "surface", draw: "speck",
      note: "Mineral formations that regrow after harvest on a decadal cycle." },
    { name: "The Deep Vaults", zone: "interior", draw: "pocket",
      note: "Natural sealed caverns beneath the crust. Stable, dry, and enormous." }
  ],
  gas: [
    { name: "The Great Eye", zone: "surface", draw: "storm",
      note: "A persistent anticyclone wider than most terrestrial worlds." },
    { name: "Calm Latitude", zone: "surface", draw: "band",
      note: "A rare quiet band. Standard aerostat operations are viable here." },
    { name: "The Diamond Layer", zone: "interior", draw: "sparkle",
      note: "Carbon precipitates into crystal at this depth and falls as rain." },
    { name: "Lightning Chorus", zone: "interior", draw: "arc",
      note: "Continuous electrical activity across a whole cloud deck." },
    { name: "Helium Rain Zone", zone: "interior", draw: "band",
      note: "Helium droplets settle out here, heating the layers below." },
    { name: "The Shepherd Gap", zone: "orbit", draw: "gap", needs: "ring",
      note: "A swept-clean lane in the ring system. A natural, protected approach." },
    { name: "Metallic Ocean", zone: "interior", draw: "shine",
      note: "Hydrogen turned conductor. Source of the world's colossal magnetic field." },
    { name: "Polar Hexagon", zone: "surface", draw: "polygon",
      note: "A standing wave locked into a geometric pattern at the pole." }
  ],
  youngstar: [
    { name: "The Active Belt", zone: "surface", draw: "band",
      note: "Flare-prone latitudes. Beautiful, and worth a wide berth." },
    { name: "Granulation Field", zone: "surface", draw: "cells",
      note: "Convection cells the size of continents, resurfacing every few minutes." },
    { name: "Starspot Cluster", zone: "surface", draw: "spot",
      note: "Cool magnetic knots, dark only by comparison to everything around them." },
    { name: "The Tachocline", zone: "interior", draw: "shear",
      note: "The shear layer where the star's magnetic dynamo is generated." },
    { name: "Coronal Hole", zone: "orbit", draw: "gap", needs: "corona",
      note: "An open field line region venting fast solar wind." },
    { name: "Prominence Arch", zone: "orbit", draw: "arch", needs: "flares",
      note: "Suspended plasma bridging two active regions. Stable for weeks at a time." }
  ],
  oldstar: [
    { name: "The Shed Shell", zone: "orbit", draw: "shell",
      note: "An expanding envelope of cast-off material, rich in heavy elements." },
    { name: "Dredge-Up Zone", zone: "interior", draw: "shear",
      note: "Convection is hauling fusion products up from the deep interior." },
    { name: "The Quiet Core", zone: "interior", draw: "pocket",
      note: "Degenerate and dense — a compact heart under an enormous envelope." },
    { name: "Pulsation Front", zone: "surface", draw: "band",
      note: "The whole envelope breathes on a long, measurable period." },
    { name: "Dust Foundry", zone: "orbit", draw: "speck",
      note: "Carbon and silicate grains condensing in the outflow. A stellar factory." },
    { name: "Ember Latitude", zone: "surface", draw: "patch",
      note: "Cooler zones where the envelope has thinned enough to see deeper in." }
  ]
};

/* ---------------- Rare pool — shared, filtered by type ---------------- */

const RARE = [
  { name: "The Hollow", zone: "interior", draw: "cavity", types: ["rocky"],
    note: "A vast sealed void where a core should be. Pressure inside is survivable. Nobody has explained it." },
  { name: "The Lattice", zone: "interior", draw: "lattice", types: ["rocky", "gas"],
    note: "Interior structure arranged in a regular geometric pattern. Almost certainly natural. Almost." },
  { name: "Shattered Hemisphere", zone: "surface", draw: "shatter", types: ["rocky"],
    note: "Half the crust is missing. The exposed mantle has cooled into a glass plain 4,000 km across." },
  { name: "The Derelict Belt", zone: "orbit", draw: "derelicts", types: ["rocky", "gas"],
    note: "Hundreds of hulls in stable orbit, none of them from any registered civilization." },
  { name: "The Second Core", zone: "interior", draw: "twincore", types: ["rocky", "gas"],
    note: "Two distinct cores orbiting a common center inside the mantle. A merger that never finished." },
  { name: "Storm Cathedral", zone: "surface", draw: "megastorm", types: ["gas"],
    note: "A storm system with a clear, still column running from cloud-top to the metallic layer." },
  { name: "The Green Flash", zone: "orbit", draw: "aurora", types: ["gas", "rocky"], needs: "haze",
    note: "Auroral emission in a spectral line that this atmosphere should not produce." },
  { name: "Companion Ember", zone: "orbit", draw: "companion", types: ["youngstar", "oldstar"],
    note: "A dim stellar companion buried in the envelope, still orbiting after all this time." },
  { name: "The Slow Pulse", zone: "interior", draw: "pulse", types: ["youngstar", "oldstar"],
    note: "A luminosity oscillation with a period of exactly 47 hours. Exactly. Every cycle." },
  { name: "Ribbon Prominence", zone: "orbit", draw: "ribbon", types: ["youngstar"], needs: "flares",
    note: "A plasma structure that has held the same shape for eleven years of observation." },
  { name: "The Ash Garden", zone: "orbit", draw: "garden", types: ["oldstar"],
    note: "Condensing dust has formed sheets that catch the light like stained glass." }
];

/* Radial zone → radius fraction range for marker placement. */
const ZONE_R = {
  interior: [0.18, 0.6],
  surface: [0.82, 0.99],
  orbit: [1.06, 1.4]
};

function place(rng, zone) {
  const [lo, hi] = ZONE_R[zone] || ZONE_R.surface;
  return {
    r: rrange(rng, lo, hi),
    angle: rng() * TAU
  };
}

/* Some features read better with the body's own name attached. */
function personalize(name, bodyName, rng) {
  if (rng() < 0.35) {
    const short = String(bodyName).split(/[\s-]/)[0];
    if (name.startsWith("The ")) return `${short} ${name.slice(4)}`;
    return `${short} ${name}`;
  }
  return name;
}

/* A feature that describes something the illustration didn't draw would be a
 * visible contradiction — "Warm Shallows" on a world with no ocean, a
 * "Shepherd Gap" with no ring. Prerequisites are checked against the profile's
 * actual effects. */
function available(f, profile) {
  if (!f.needs) return true;
  const fx = profile ? profile.effects : null;
  if (!fx) return false;
  switch (f.needs) {
    case "ocean": return !!fx.oceanArc;
    case "ring": return !!fx.ring;
    case "haze": return !!fx.haze;
    case "corona": return !!fx.corona;
    case "flares": return !!fx.flares;
    default: return true;
  }
}

/* Build the feature list for one body. */function generateFeatures(type, rng, bodyName, profile) {
  const pool = (COMMON[type] || COMMON.rocky).filter(f => available(f, profile));
  const count = 1 + Math.floor(rng() * 3); // 1..3
  const chosen = pickN(rng, pool, count).map(f => ({
    ...f,
    tier: "common",
    name: personalize(f.name, bodyName, rng),
    ...place(rng, f.zone)
  }));

  // ~10% chance of one rare showstopper.
  if (rng() < 0.10) {
    const eligible = RARE.filter(f => f.types.includes(type) && available(f, profile));
    if (eligible.length) {
      const r = pick(rng, eligible);
      chosen.push({
        ...r,
        tier: "rare",
        name: r.name,
        ...place(rng, r.zone)
      });
    }
  }

  // Orbit features can't exist beyond what the render actually reaches;
  // clamp them inside the profile's extent so callouts stay on-canvas.
  const maxR = Math.max(1.02, (profile && profile.extent) || 1.2);
  for (const f of chosen) {
    if (f.zone === "orbit") f.r = clamp(f.r, 1.04, maxR * 0.96);
  }

  return chosen;
}


/* ===== src/lore/lore.js ===== */
/* Descriptive text.
 *
 * Register: a competent, curious survey officer filing a report on somewhere
 * worth going back to. Forward-looking rather than elegiac — even a dying
 * star is described in terms of what it makes possible. No quoted flavor
 * line: settler-voice quotes read oddly at planetary scale and repeated too
 * often across generated batches. */


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
function generateLore(type, rng, profile, name) {
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


/* ===== src/lore/names.js ===== */
/* Procedural body names.
 *
 * A name is assembled from up to four slots:
 *   [greek?] [stem][tail][tail?] [suffix?] [designation?]
 * The Greek-letter slot mimics real star-catalog convention (Alpha Centauri,
 * Epsilon Eridani) and appears occasionally rather than always, so it stays
 * a flavor note instead of a formula. */
const GREEK = [
  "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta",
  "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi",
  "Rho", "Sigma", "Tau", "Upsilon", "Phi", "Chi", "Psi", "Omega"
];
const NAME_PARTS = {
  a: ["Ka", "Ver", "Tho", "Ael", "Bra", "Cin", "Dro", "Ery", "Fen", "Gal", "Hal",
      "Ish", "Jor", "Kel", "Lum", "Mor", "Nyx", "Or", "Phy", "Qua", "Rha", "Sol",
      "Tyr", "Umb", "Vex", "Wyn", "Xan", "Yra", "Zeph"],
  b: ["ra", "lo", "mi", "dun", "vek", "sha", "ri", "gol", "na", "thi", "bor",
      "el", "us", "ax", "ien", "or", "eth", "ath", "yn", "ossa"],
  c: ["", "", "", " Prime", " Minor", " Deep", "-9", " III", " VII",
      " of the Verge", " Reach"]
};

/* Catalog-style designations, e.g. "KX-2291". Occasional, never with a suffix. */
function catalogTag(rng) {
  const letters = "ABCDEFGHJKLMNPRSTVXZ";
  const l1 = letters[Math.floor(rng() * letters.length)];
  const l2 = letters[Math.floor(rng() * letters.length)];
  const num = 100 + Math.floor(rng() * 9900);
  return ` ${l1}${l2}-${num}`;
}
function makeName(rng) {
  const stem = pick(rng, NAME_PARTS.a) + pick(rng, NAME_PARTS.b) +
    (rng() < 0.5 ? pick(rng, NAME_PARTS.b) : "");

  const roll = rng();
  let prefix = "";
  let tail = "";

  if (roll < 0.26) {
    // Greek-lettered: "Kappa Verossa". Suffix stays rare here to avoid
    // over-long names like "Kappa Verossa of the Verge".
    prefix = pick(rng, GREEK) + " ";
    tail = rng() < 0.2 ? pick(rng, NAME_PARTS.c) : "";
  } else if (roll < 0.34) {
    // Catalog designation: "Verossa KX-2291".
    tail = catalogTag(rng);
  } else {
    tail = pick(rng, NAME_PARTS.c);
  }

  return prefix + stem + tail;
}


/* ===== src/generate.js ===== */
/* Generation pipeline: seed → profile → style → stats → features → lore.
 *
 * Each stage gets its own RNG stream derived from the same seed, so changing
 * (say) the art style never reshuffles the generated name or the feature list.
 * That separation is what makes the locks and the style dropdown feel stable
 * instead of re-rolling the world on every interaction. */
function generate(opts) {
  const {
    type, seed, paletteName, wobble, detail, style,
    hueShift = 0, satScale = 1, nameOverride = ""
  } = opts;

  // Structure seed deliberately excludes style and hue so those controls are
  // pure post-processing and never change the world itself.
  const structSeed = hashString(`${seed}|${type}|${paletteName}`);

  let profile = makeProfile(type, mulberry32(structSeed), {
    paletteName, wobble, detail
  });

  // Hue shift recolors the palette and everything derived from it.
  if (hueShift || satScale !== 1) {
    const pal = hueShiftPalette(profile.palette, hueShift, satScale);
    profile = recolorProfile(profile, profile.palette, pal, hueShift, satScale);
  }

  profile = applyStyle(profile, style);

  const autoName = makeName(mulberry32(structSeed ^ 0x77aa));
  const name = nameOverride.trim() || autoName;

  const stats = computeStats(type, profile, mulberry32(structSeed ^ 0x5c1e));
  const features = generateFeatures(type, mulberry32(structSeed ^ 0xfea7), name, profile);
  const lore = generateLore(type, mulberry32(structSeed ^ 0x1234), profile, name);

  return { profile, stats, features, lore, autoName, name };
}

/* Reapply a hue shift to the already-baked layer colors. Layer colors are
 * derived from the palette at build time, so shifting the palette alone would
 * leave the drawing unchanged — both have to move together. */
function recolorProfile(profile, oldPal, newPal, deg, satScale) {
  const shift = hex => hueShiftHexSafe(hex, deg, satScale);
  const layers = profile.layers.map(l => ({
    ...l,
    c0: shift(l.c0),
    c1: shift(l.c1),
    texture: l.texture ? {
      ...l.texture,
      color: l.texture.color ? shift(l.texture.color) : l.texture.color,
      dark: l.texture.dark ? shift(l.texture.dark) : l.texture.dark
    } : null,
    edge: l.edge ? { ...l.edge, color: shift(l.edge.color) } : null
  }));

  const fx = { ...profile.effects };
  for (const key of ["haze", "corona", "ring", "flares"]) {
    if (fx[key] && fx[key].color) fx[key] = { ...fx[key], color: shift(fx[key].color) };
  }
  if (fx.oceanArc) {
    fx.oceanArc = {
      ...fx.oceanArc,
      color: shift(fx.oceanArc.color),
      iceColor: shift(fx.oceanArc.iceColor)
    };
  }

  return { ...profile, layers, effects: fx, palette: newPal };
}

function hueShiftHexSafe(hex, deg, satScale) {
  if (typeof hex !== "string" || !hex.startsWith("#")) return hex;
  return hueShiftHex(hex, deg, satScale);
}


/* ===== src/ui.js ===== */
/* UI wiring: reads controls into a state object, regenerates, renders. */






const $ = id => document.getElementById(id);

const state = {
  type: "rocky", seed: "ember-1", paletteName: "",
  wobble: 0.5, detail: 0.5, style: "artistic",
  hueShift: 0, satScale: 1,
  bgMode: "starfield", bgColor: "#0a0c14", bgMode11: "transparent",
  overlay: false, ink: "auto",
  overlayOptions: { showLayers: true, showFeatures: true, showStats: true },
  resolution: 720,
  profile: null, lore: null, stats: null, features: null
};

function fillSelect(el, entries, current) {
  el.innerHTML = "";
  for (const [value, label] of entries) {
    const opt = document.createElement("option");
    opt.value = value; opt.textContent = label;
    el.appendChild(opt);
  }
  if (current != null && entries.some(e => e[0] === current)) el.value = current;
}

function fillPaletteOptions(type, keep) {
  const names = Object.keys(PALETTES[type]);
  fillSelect($("palette"), names.map(n => [n, n]), keep && names.includes(keep) ? keep : names[0]);
}

function readControls() {
  state.type = $("body-type").value;
  state.seed = $("seed").value || "0";
  state.paletteName = $("palette").value;
  state.wobble = +$("wobble").value / 100;
  state.detail = +$("detail").value / 100;
  state.style = $("art-style").value;
  state.hueShift = +$("hue-shift").value;
  state.satScale = +$("saturation").value / 100;
  state.bgMode = $("bg-mode").value;
  state.bgColor = $("bg-color").value;
  state.bgMode11 = $("bg-mode-11").value;
  state.overlay = $("overlay-toggle").checked;
  state.ink = $("ink-color").value;
  state.overlayOptions = {
    showLayers: $("overlay-layers").checked,
    showFeatures: $("overlay-features").checked,
    showStats: $("overlay-stats").checked
  };
  state.resolution = clamp(parseInt($("resolution").value, 10) || 720, 240, 2160);
}

function syncReadouts() {
  $("wobble-val").textContent = `(${$("wobble").value})`;
  $("detail-val").textContent = `(${$("detail").value})`;
  $("hue-val").textContent = `(${$("hue-shift").value}°)`;
  $("sat-val").textContent = `(${$("saturation").value}%)`;

  // Wobble is meaningless in vector style and heavily damped in semi-tech;
  // dimming the control explains why moving it stops mattering. The base
  // tooltip is preserved and appended to rather than replaced, so the control
  // is never left without one.
  const styleId = $("art-style").value;
  const wobRow = $("wobble").closest(".control-row");
  if (!wobRow.dataset.baseTitle) wobRow.dataset.baseTitle = wobRow.title || "";
  const base = wobRow.dataset.baseTitle;
  if (styleId === "vector") {
    wobRow.classList.add("disabled-hint");
    wobRow.title = `${base}\n\nVector style draws perfect circles — this slider has no effect.`;
  } else if (styleId === "semitech") {
    wobRow.classList.remove("disabled-hint");
    wobRow.title = `${base}\n\nSemi-technical damps wobble to about a quarter strength.`;
  } else {
    wobRow.classList.remove("disabled-hint");
    wobRow.title = base;
  }

  // Solid-color picker only matters in solid mode.
  $("bg-color").disabled = !($("bg-mode").value === "solid" || $("bg-mode-11").value === "solid");

  // Overlay sub-options are inert while the overlay is off.
  const on = $("overlay-toggle").checked;
  for (const id of ["overlay-layers", "overlay-features", "overlay-stats", "ink-color"]) {
    $(id).disabled = !on;
  }
  $("overlay-suboptions").classList.toggle("disabled-hint", !on);

  $("preview-caption").textContent = on
    ? "live preview — 16:9 technical schematic with callouts"
    : "live preview — 16:9 composition (illustration + survey panel)";
}
function regenerate() {
  readControls();
  syncReadouts();

  const result = generate({
    type: state.type,
    seed: state.seed,
    paletteName: state.paletteName,
    wobble: state.wobble,
    detail: state.detail,
    style: state.style,
    hueShift: state.hueShift,
    satScale: state.satScale,
    nameOverride: $("body-name").value
  });

  state.profile = result.profile;
  state.stats = result.stats;
  state.features = result.features;
  state.lore = result.lore;
  state.name = result.name;

  if (!$("body-name").value.trim()) $("body-name").placeholder = result.autoName;

  render169($("preview-canvas"), state);
}

function randomize() {
  const r = Math.random;
  if (!$("lock-body-type").checked) {
    $("body-type").value = TYPE_ORDER[Math.floor(r() * TYPE_ORDER.length)];
    fillPaletteOptions($("body-type").value, $("lock-palette").checked ? $("palette").value : null);
  }
  if (!$("lock-seed").checked) {
    $("seed").value = Math.floor(r() * 1e9).toString(36) + "-" + Math.floor(r() * 999);
  }
  if (!$("lock-palette").checked) {
    const names = Object.keys(PALETTES[$("body-type").value]);
    $("palette").value = names[Math.floor(r() * names.length)];
  }
  if (!$("lock-wobble").checked) $("wobble").value = Math.floor(20 + r() * 70);
  if (!$("lock-detail").checked) $("detail").value = Math.floor(r() * 101);
  if (!$("lock-style").checked) {
    $("art-style").value = STYLE_ORDER[Math.floor(r() * STYLE_ORDER.length)];
  }
  if (!$("lock-hue").checked) $("hue-shift").value = Math.floor(r() * 361) - 180;
  if (!$("lock-name").checked) $("body-name").value = "";
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

const safeName = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function export169() {
  const c = document.createElement("canvas");
  render169(c, state);
  downloadCanvas(c, `${safeName(state.name)}-${state.type}-16x9.png`);
  return c;
}

function export11() {
  const c = document.createElement("canvas");
  render11(c, state);
  downloadCanvas(c, `${safeName(state.name)}-${state.type}-1x1.png`);
  return c;
}
function initUI() {
  fillSelect($("body-type"), TYPE_ORDER.map(t => [t, TYPE_LABELS[t]]), state.type);
  fillSelect($("art-style"), STYLE_ORDER.map(s => [s, STYLES[s].label]), state.style);
  fillSelect($("ink-color"), Object.entries(INK_PRESETS).map(([k, v]) => [k, v.label]), state.ink);
  fillPaletteOptions(state.type, null);

  $("body-type").addEventListener("change", () => {
    fillPaletteOptions($("body-type").value, null);
    regenerate();
  });

  const live = ["seed", "palette", "wobble", "detail", "resolution", "art-style",
                "hue-shift", "saturation", "bg-mode", "bg-color", "bg-mode-11",
                "ink-color", "body-name"];
  for (const id of live) $(id).addEventListener("input", regenerate);

  for (const id of ["overlay-toggle", "overlay-layers", "overlay-features", "overlay-stats"]) {
    $(id).addEventListener("change", regenerate);
  }

  $("randomize-btn").addEventListener("click", randomize);
  $("export-169-btn").addEventListener("click", export169);
  $("export-11-btn").addEventListener("click", export11);

  // Art style hint text updates under the dropdown.
  $("art-style").addEventListener("change", () => {
    $("style-hint").textContent = STYLES[$("art-style").value].hint;
  });
  $("style-hint").textContent = STYLES[state.style].hint;

  regenerate();

  // Exposed for automated verification; harmless in normal use.
  window.CelestialCutaway = {
    state, regenerate, randomize, render169, render11, generate,
    export169, export11, PALETTES, STYLES,
    setInputs(opts) {
      if (opts.type) { $("body-type").value = opts.type; fillPaletteOptions(opts.type, opts.palette || null); }
      if (opts.palette) $("palette").value = opts.palette;
      if (opts.seed != null) $("seed").value = String(opts.seed);
      if (opts.resolution) $("resolution").value = opts.resolution;
      if (opts.wobble != null) $("wobble").value = opts.wobble;
      if (opts.detail != null) $("detail").value = opts.detail;
      if (opts.style) $("art-style").value = opts.style;
      if (opts.hueShift != null) $("hue-shift").value = opts.hueShift;
      if (opts.bgMode) $("bg-mode").value = opts.bgMode;
      if (opts.overlay != null) $("overlay-toggle").checked = !!opts.overlay;
      if (opts.ink) $("ink-color").value = opts.ink;
      regenerate();
    }
  };
}


/* ===== src/main.js ===== */
/* Entry point. */

initUI();

})();
