/* Surface-frosting inspection harness.
 *
 * The frosting is a band a few pixels wide at contact-sheet scale, so it
 * cannot be judged from sheet.mjs — PROGRESS.md D18 records three rounds lost
 * to exactly that mistake, and D20 records a second round lost to judging a
 * seed from a single rim crop that happened to land on an arc with no cover.
 *
 * So this renders BOTH:
 *   - whole discs, which is the only view that shows how much of a world
 *     carries frosting and how the four zones divide it up
 *   - rim crops, which is the only view in which thickness, top surface and
 *     the bleed into the rock are legible
 *
 * It also prints each zone's colour against the rock it lies on, so "is it
 * separating from the ground" is answered by numbers rather than by squinting.
 *
 *   node test/film.mjs            report + PNGs
 *   node test/film.mjs 40         report over 40 seeds, no PNGs
 */

import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(`${ROOT}/index.html`, "utf8");
const srcs = [...html.matchAll(/<script\s+src=["']([^"']+)["']/gi)]
  .map(m => m[1]).filter(s => !s.endsWith("js/main.js"));

const sandbox = { console, Math, Date, parseInt, parseFloat, isNaN, isFinite };
sandbox.self = sandbox; sandbox.globalThis = sandbox;
// lib/simplex-noise.js publishes itself onto `window`; the nebula background
// reads it from there, so the sandbox needs one or that background throws.
sandbox.window = sandbox;
createContext(sandbox);
for (const src of srcs) {
  runInContext(readFileSync(resolve(ROOT, src), "utf8"), sandbox, { filename: src });
}
const CC = sandbox.CC;

const REPORT_ONLY = process.argv[2] !== undefined;
const COUNT = parseInt(process.argv[2] || "12", 10);

const ZONE_KEYS = ["frostPeak", "frostLand", "frostShallow", "frostDeep"];

mkdirSync(resolve(ROOT, "shots/film"), { recursive: true });

function settings(over = {}) {
  return {
    archetype: "planet", seed: "first-light",
    thicknessVariation: 0.7, optionalLayers: 0.75, coreBias: 0,
    oceanDepth: 0.4, interiorHeat: 0.55, boundaryIrregularity: 1,
    keepUpright: false, rotation: 0,
    hueRelationship: "auto", secondaryOffset: 0,
    saturation: 1, brightness: 1, contrast: 1,
    background: "flat", backgroundColor: "#05070e",
    bodySize: 0.78,
    ...over
  };
}

/* The layer the frosting is drawn on: the outermost one carrying terrain.
 * NOT "the first non-outward layer" — on an ocean world that is the sea, and
 * mistaking the two is what made the first version invisible (D19). */
function hostOf(body, details) {
  for (const l of body.layers) {
    if (!l.outward && details.terrain[l.role]) return l;
  }
  return null;
}

function build(over = {}) {
  const s = settings(over);
  const body = CC.Structure.build(CC.Archetypes.get(s.archetype), s, s.seed);
  const details = CC.Details.build(body, s, s.seed);
  const palette = CC.Palette.build(
    body, CC.Archetypes.get(s.archetype).colorProfile, s, s.seed);
  return { s, body, details, palette, host: hostOf(body, details) };
}

/* A whole body, large enough that the frosting is legible. */
function full(name, over = {}) {
  const { s, body } = build(over);
  const SIZE = 1100;
  const canvas = createCanvas(SIZE, SIZE);
  CC.Scene.render(canvas.getContext("2d"), SIZE, SIZE, body, s);
  writeFileSync(resolve(ROOT, `shots/film/${name}.png`), canvas.toBuffer("image/png"));
}

/* A window on the rim, where thickness and the bleed into rock are readable.
 *
 * `atAngle` aims the window, because the four zones live at different
 * elevations and a fixed 12-o'clock crop shows whichever one happens to be
 * there. Pass an angle to inspect a particular zone.
 */
function crop(name, over = {}, atAngle = 0) {
  const { s, body, details, host } = build(over);
  if (!host) return;

  const SIZE = 1600;
  const canvas = createCanvas(SIZE, SIZE);
  CC.Scene.render(canvas.getContext("2d"), SIZE, SIZE, body, s);

  const W = 560, H = 300;
  const rimPx = (SIZE / 2) * s.bodySize * (host.outer / body.extent);
  /* Screen angle: the renderer draws angle 0 at 12 o'clock. */
  const cx = SIZE / 2 + Math.sin(atAngle) * rimPx;
  const cy = SIZE / 2 - Math.cos(atAngle) * rimPx;

  const out = createCanvas(W, H);
  out.getContext("2d").drawImage(canvas,
    cx - W / 2, cy - H / 4, W, H, 0, 0, W, H);
  writeFileSync(resolve(ROOT, `shots/film/${name}.png`), out.toBuffer("image/png"));
}

/* ---- the report ------------------------------------------------------- */

/* Per seed: every zone's contrast against the rock, and how the body's
 * surface actually divides between the four zones. The zone split is the
 * number that matters most — a world where one zone covers everything has
 * four colours and only ever shows one. */
function report(seed, over = {}) {
  const { body, details, palette, host } = build({ seed, ...over });
  if (!host || !details.film) return null;

  const rock = palette.get(host.role);
  const terrain = details.terrain[host.role];
  const idx = body.layers.indexOf(host);
  const fluid = idx > 0 && !body.layers[idx - 1].outward ? body.layers[idx - 1] : null;
  const level = fluid ? fluid.outer - host.outer : 0;

  const r = terrain.range();
  const span = Math.max(1e-6, r.hi - r.lo);

  /* Mirror draw/film.js's zoneWeights so the split reported is the split
   * drawn. Kept in step by hand; the constants are read from CC.Film where
   * they are exported. */
  const SNOWLINE = 0.42, SHELF = -0.16, BLEND = 0.13;
  const ss = t => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };

  const share = [0, 0, 0, 0];
  const N = 720;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const h = (terrain.at(a) - level) / span;
    const peak = ss((h - SNOWLINE) / BLEND + 0.5);
    const dry = ss(h / (BLEND * 0.8) + 0.5);
    const shelf = ss((h - SHELF) / BLEND + 0.5);
    share[0] += peak;
    share[1] += dry * (1 - peak);
    share[2] += shelf * (1 - dry);
    share[3] += 1 - shelf;
  }
  for (let z = 0; z < 4; z++) share[z] /= N;

  const zones = ZONE_KEYS.map(k => {
    const c = palette.get(k);
    let dh = Math.abs(c.h - rock.h);
    if (dh > 180) dh = 360 - dh;
    return { key: k, h: c.h, s: c.s, v: c.v, dV: c.v - rock.v, dS: c.s - rock.s, dH: dh };
  });

  return { seed, rock, zones, share, arid: palette.get("frostLand").arid };
}

const SEEDS = [];
for (let i = 0; i < COUNT; i++) SEEDS.push(`film-${i}`);

console.log("Per-zone contrast against the rock, and the surface split.\n");
console.log("seed      arid | zone          hue   sat   val    dV     dS  | share");

let worstV = 99, worstS = 99, flat = 0;
const hues = [];

for (const seed of SEEDS) {
  const r = report(seed);
  if (!r) { console.log(seed.padEnd(9), "no frosting"); continue; }
  hues.push(r.zones[1].h);

  r.zones.forEach((z, i) => {
    if (z.dV < worstV) worstV = z.dV;
    if (z.dS < worstS) worstS = z.dS;
    console.log(
      (i === 0 ? r.seed.padEnd(9) : "".padEnd(9)),
      (i === 0 ? r.arid.toFixed(2) : "    "), "|",
      z.key.padEnd(13),
      z.h.toFixed(0).padStart(3),
      z.s.toFixed(2).padStart(5),
      z.v.toFixed(2).padStart(5),
      (z.dV >= 0 ? "+" : "") + z.dV.toFixed(2).padStart(5),
      (z.dS >= 0 ? "+" : "") + z.dS.toFixed(2).padStart(5), "|",
      r.share[i].toFixed(2).padStart(5)
    );
  });
  /* A body whose surface is >90% one zone shows only one of its four
   * colours — worth counting, because it means the zone thresholds are not
   * biting on that terrain. */
  if (Math.max(...r.share) > 0.9) flat++;
  console.log("");
}

const lo = Math.min(...hues), hi = Math.max(...hues);
console.log(`land-zone hue span over ${hues.length} seeds: ` +
            `${lo.toFixed(0)}..${hi.toFixed(0)}`);
console.log(`worst value contrast vs rock: ${worstV.toFixed(2)}  ` +
            `worst saturation contrast: ${worstS.toFixed(2)}`);
console.log(`bodies >90% a single zone: ${flat} / ${hues.length}`);

if (!REPORT_ONLY) {
  console.log("\nrendering whole bodies to shots/film/ ...");
  for (const seed of ["film-1", "film-8", "film-13", "film-20"]) {
    full(`body-${seed}`, { seed, oceanDepth: 0.12 });
  }
  /* The climate extremes, which is where the zones are supposed to look most
   * different from one another. */
  full("body-wet", { seed: "film-8", oceanDepth: 0.55, interiorHeat: 0.20 });
  full("body-dry", { seed: "film-8", oceanDepth: 0.00, interiorHeat: 0.90 });
  full("body-cold", { seed: "film-20", oceanDepth: 0.30, interiorHeat: 0.00 });
  full("body-drowned", { seed: "film-13", oceanDepth: 0.85, interiorHeat: 0.4 });

  console.log("rendering rim crops to shots/film/ ...");
  for (const seed of ["film-8", "film-13"]) {
    crop(`rim-${seed}`, { seed, oceanDepth: 0.12 });
  }
  crop("rim-dry", { seed: "film-8", oceanDepth: 0.0, interiorHeat: 0.9 });
  crop("rim-cold", { seed: "film-20", oceanDepth: 0.3, interiorHeat: 0.0 });
  console.log("done");
}
