/* Generation pipeline: seed → profile → style → stats → features → lore.
 *
 * Each stage gets its own RNG stream derived from the same seed, so changing
 * (say) the art style never reshuffles the generated name or the feature list.
 * That separation is what makes the locks and the style dropdown feel stable
 * instead of re-rolling the world on every interaction. */

import { hashString, mulberry32 } from "./core/rng.js";
import { hueShiftPalette, hueShiftHex } from "./core/color.js";
import { makeProfile } from "./profiles/index.js";
import { applyStyle } from "./render/styles.js";
import { computeStats } from "./lore/stats.js";
import { generateFeatures } from "./lore/features.js";
import { generateLore } from "./lore/lore.js";
import { makeName } from "./lore/names.js";

export function generate(opts) {
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
