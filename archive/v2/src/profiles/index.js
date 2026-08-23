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

import { TAU, clamp, lerp, rrange } from "../core/math.js";
import { mixHex, shadeHex } from "../core/color.js";
import { PALETTES } from "../data/palettes.js";

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
}

export function makeProfile(type, rng, opts) {
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

export { LAYER_NAMES };
