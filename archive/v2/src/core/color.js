/* Color utilities: hex/rgb/hsl conversion, mixing, and palette hue-shifting. */

import { clamp, lerp } from "./math.js";

export function hexToRgb(hex) {
  const h = String(hex).replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}

export function rgbToHex(r, g, b) {
  return "#" + [r, g, b]
    .map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"))
    .join("");
}

export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function mixHex(h1, h2, t) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  return rgbToHex(...a.map((v, i) => lerp(v, b[i], t)));
}

/* amt -1..1 : darken..lighten */
export function shadeHex(hex, amt) {
  return amt >= 0 ? mixHex(hex, "#ffffff", amt) : mixHex(hex, "#000000", -amt);
}

/* --- HSL space, needed for hue rotation --- */

export function rgbToHsl(r, g, b) {
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

export function hslToRgb(h, s, l) {
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

export function hexToHsl(hex) { return rgbToHsl(...hexToRgb(hex)); }
export function hslToHex(h, s, l) { return rgbToHex(...hslToRgb(h, s, l)); }

/* Rotate hue by `deg` degrees, optionally scaling saturation.
 * Near-greyscale colors (space backdrops, whites) are left alone so the
 * shift reads as a recolor of the *material*, not a tint of everything. */
export function hueShiftHex(hex, deg, satScale = 1) {
  if (!deg && satScale === 1) return hex;
  const [h, s, l] = hexToHsl(hex);
  if (s < 0.06) return hex;
  return hslToHex(h + deg / 360, clamp(s * satScale, 0, 1), l);
}

/* Apply a hue shift across every color in a palette object. */
export function hueShiftPalette(pal, deg, satScale = 1) {
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
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/* Pick a bright, saturated ink color that contrasts with the body but stays
 * in the palette family — used for the auto overlay ink. */
export function deriveInk(pal) {
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
