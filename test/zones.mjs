/* Angular-zone inspection harness.
 *
 * Zone boundaries CANNOT be judged on a contact sheet — PROGRESS.md D18 and
 * D20 both record rounds lost to judging a feature at the wrong scale. A
 * terminator is a property of a whole hemisphere, so this renders WHOLE DISCS,
 * large, and puts the Lock strength sweep in one image so the dial's travel
 * can be read at a glance.
 *
 * It also prints the numbers that decide whether the zone system is behaving,
 * because three of this project's failures (an invisible film, a constant
 * aridity, four zone colours flattened against a ceiling) were invisible by
 * eye and obvious in a short probe:
 *
 *   - the resolved arcs at each intensity
 *   - the max per-degree colour step across the terminator (a hard step reads
 *     as a rendering bug, so it is checked as a number, not squinted at)
 *   - terrain roughness and frosting coverage on each face
 *
 *   node test/zones.mjs           the Lock strength sweep + a trait gallery
 *   node test/zones.mjs report    numbers only, no PNGs
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
createContext(sandbox);
for (const src of srcs) {
  runInContext(readFileSync(resolve(ROOT, src), "utf8"), sandbox, { filename: src });
}
const CC = sandbox.CC;
const TAU = Math.PI * 2;
const REPORT_ONLY = process.argv[2] === "report";

mkdirSync(resolve(ROOT, "shots/zones"), { recursive: true });

function settings(over = {}) {
  return {
    archetype: "planet", seed: "terminator",
    thicknessVariation: 0.7, optionalLayers: 0.75, coreBias: 0,
    oceanDepth: 0.4, interiorHeat: 0.55, boundaryIrregularity: 1,
    /* Upright, so the hot face is always at the same place in every image and
     * the sweep can be compared frame to frame. */
    keepUpright: true, rotation: 0,
    primaryHue: 210, hueRelationship: "auto", secondaryOffset: 0,
    saturation: 1, brightness: 1, contrast: 1,
    detailDensity: 0.65, sizeTiers: 3, flowIndicators: "balanced",
    textureStrength: 1, elementOpacity: 1,
    background: "solid", backgroundColor: "#07060c", bodySize: 0.84,
    traitCount: 0, structuralTraits: true,
    tidalLock: 0, tidalFacing: 90,
    ...over
  };
}

function build(over = {}) {
  const s = settings(over);
  const body = CC.Structure.build(CC.Archetypes.get(s.archetype), s, s.seed);
  const details = CC.Details.build(body, s, s.seed);
  const palette = CC.Palette.build(
    body, CC.Archetypes.get(s.archetype).colorProfile, s, s.seed);
  return { s, body, details, palette };
}

function disc(over, px = 560) {
  const { s, body, details, palette } = build(over);
  const c = createCanvas(px, px);
  CC.Scene.render(c.getContext("2d"), px, px, body, s, palette, details);
  return { canvas: c, details, palette, body };
}

/* ---- the Lock strength sweep ------------------------------------------- */

const LEVELS = [0, 0.25, 0.5, 0.75, 1.0];

console.log("=== LOCK STRENGTH ===");
console.log("Partial locking IS the twilight arc — one continuous dial.\n");
console.log("  dial   hot / twilight / cold      reads as");

const READS = {
  0:    "unzoned",
  0.25: "Mercury-like resonance",
  0.5:  "slow libration",
  0.75: "strong lock",
  1:    "razor terminator"
};

for (const lv of LEVELS) {
  const { details } = build({ tidalLock: lv });
  const z = details.zones;
  const arcs = z ? z.arcs.map(a => String(Math.round(a)).padStart(3)).join(" / ") : "        —";
  console.log(`  ${String(lv).padEnd(5)}  ${arcs}          ${READS[lv]}`);
}

/* ---- the cross-fade, as a number --------------------------------------- */

console.log("\n=== CROSS-FADE ===");
console.log("A hard step at a boundary reads as a rendering bug, so it is");
console.log("measured rather than eyeballed. Value step per degree of arc:\n");

let worstStep = 0;
for (const lv of [0.25, 0.5, 0.75, 1.0]) {
  const { details, palette } = build({ tidalLock: lv });
  const z = details.zones;
  const base = palette.get("crust").v;
  const N = 3600;
  let max = 0, at = 0;
  let prev = z.shiftAt(0, "crust", base).v;
  for (let i = 1; i <= N; i++) {
    const a = (i / N) * TAU;
    const v = z.shiftAt(a, "crust", base).v;
    const d = Math.abs(v - prev) * (N / 360);     /* per degree */
    if (d > max) { max = d; at = a * 180 / Math.PI; }
    prev = v;
  }
  if (max > worstStep) worstStep = max;
  console.log(`  intensity ${lv}: max ${max.toFixed(4)} /deg at ${Math.round(at)}deg`);
}
console.log(`\n  worst ${worstStep.toFixed(4)} per degree — a visible step would be >0.05`);
console.log(`  verdict: ${worstStep < 0.05 ? "SMOOTH" : "STEPPED — the blend is not working"}`);

/* ---- zones perturb, they do not replace -------------------------------- */

console.log("\n=== ZONES PERTURB, NOT REPLACE ===");
console.log("The same recipe on different palettes must give different");
console.log("absolute colours — a blue world's hot face is a hot BLUE.\n");

let allDiffer = true;
const seen = new Set();
for (const hue of [10, 90, 170, 250, 330]) {
  const { details, palette } = build(
    { tidalLock: 1, primaryHue: hue });
  const c = palette.get("crust");
  const hot = details.zones.shiftAt(90 * Math.PI / 180, "crust", c.v);
  const cold = details.zones.shiftAt(270 * Math.PI / 180, "crust", c.v);
  const hotH = Math.round(((c.h + hot.h) % 360 + 360) % 360);
  seen.add(hotH);
  console.log(`  primary ${String(hue).padStart(3)}: crust h${Math.round(c.h)} v${c.v.toFixed(2)}` +
    `  ->  hot h${hotH} v${(c.v + hot.v).toFixed(2)}   cold v${(c.v + cold.v).toFixed(2)}`);
}
if (seen.size < 5) allDiffer = false;
console.log(`\n  distinct hot-face hues: ${seen.size}/5 — ` +
  `${allDiffer ? "PERTURBING correctly" : "REPLACING, which is the rule being broken"}`);

/* ---- terrain and frosting respond -------------------------------------- */

console.log("\n=== TERRAIN & FROSTING RESPOND TO THE ZONE ===");
{
  const zoned = build({ tidalLock: 1 });
  const plain = build({ traits: [], traitCount: 0 });

  const rough = (t, deg) => {
    let sum = 0;
    for (let k = -30; k <= 30; k++) {
      const a = (deg + k) * Math.PI / 180;
      sum += Math.abs(t.at(a + 0.01) - t.at(a));
    }
    return sum / 61;
  };

  const zt = zoned.details.terrain.crust, pt = plain.details.terrain.crust;
  const intrinsic = rough(pt, 270) / rough(pt, 90);
  const measured = rough(zt, 270) / rough(zt, 90);
  console.log(`  terrain roughness cold/hot: ${measured.toFixed(2)}x`);
  console.log(`  the same field unzoned:     ${intrinsic.toFixed(2)}x  (its own variation)`);
  console.log(`  so the zone contributed:    ${(measured / intrinsic).toFixed(2)}x` +
    `  (recipe asks ${(1.25 / 0.55).toFixed(2)}x)`);

}

/* ---- what actually lands on each face ---------------------------------- */

/* THE DIRECT READOUT of the whole feature: which frosting zone wins at each
 * bearing, measured through the REAL film.js function rather than a copy.
 *
 * A probe that reimplements the logic it is testing agrees with itself and not
 * with the renderer — that cost a round here, reporting an inverted snowline
 * that had already been fixed. `zoneWeights` is exported for this reason. */
console.log("\n=== ZONE SPLIT BY BEARING ===");
console.log("hot face at 90deg, cold face at 270deg.");
console.log("A locked world should read: bare land on the hot face,");
console.log("snow on the cold face, and no sea where it has boiled off.\n");

for (const lv of [0, 1]) {
  const { body, details } = build({ tidalLock: lv, oceanDepth: 0.5 });
  const terrain = details.terrain.crust;
  const sea = details.seaLevel.crust;
  const crust = body.layers.find(l => l.role === "crust");
  const ocean = body.layers.find(l => l.role === "ocean");
  const r = terrain.range();
  const span = Math.max(1e-6, r.hi - r.lo);
  const base = ocean ? (ocean.outer - crust.outer) : 0;

  console.log(`  --- tidal lock ${Math.round(lv * 100)}% ---`);
  let hdr = "  bearing :", snow = "  snow  % :", land = "  land  % :";
  let shal = "  shore % :", deep = "  deep  % :", wet = "  water   :";

  for (let deg = 0; deg < 360; deg += 45) {
    const a = deg * Math.PI / 180;
    const level = base + (sea ? sea(a) : 0);
    const w = [0, 0, 0, 0];
    CC.Film.zoneWeights((terrain.at(a) - level) / span, w,
                        details.zones && details.zones.snowAt
                          ? details.zones.snowAt(a) : 0);
    const hasSea = ocean && (ocean.outer + (sea ? sea(a) : 0))
                            > crust.outer + terrain.at(a);
    hdr += String(deg).padStart(7);
    snow += (w[0] * 100).toFixed(0).padStart(7);
    land += (w[1] * 100).toFixed(0).padStart(7);
    shal += (w[2] * 100).toFixed(0).padStart(7);
    deep += (w[3] * 100).toFixed(0).padStart(7);
    wet += (hasSea ? "sea" : "dry").padStart(7);
  }
  console.log(hdr); console.log(snow); console.log(land);
  console.log(shal); console.log(deep); console.log(wet);
  console.log("");
}

/* ---- images ------------------------------------------------------------ */

if (!REPORT_ONLY) {
  /* The Lock strength sweep, whole discs, large. This is the image the phase
   * is judged on. */
  const PX = 560, PAD = 10;
  const sweep = createCanvas(LEVELS.length * (PX + PAD) + PAD, PX + 46);
  const sctx = sweep.getContext("2d");
  sctx.fillStyle = "#07060c";
  sctx.fillRect(0, 0, sweep.width, sweep.height);

  /* A seed with an ordinary, legible palette. The sweep is judged on the
   * ZONE, so a body whose own colours are extreme makes the dial harder to
   * read rather than testing it more honestly. */
  const SWEEP_BODY = { seed: "lock-b", primaryHue: 120, oceanDepth: 0.45,
                       interiorHeat: 0.5 };

  LEVELS.forEach((lv, i) => {
    const { canvas } = disc(
      { ...SWEEP_BODY, tidalLock: lv }, PX);
    const x = PAD + i * (PX + PAD);
    sctx.drawImage(canvas, x, 8);
    sctx.fillStyle = "rgba(255,255,255,0.72)";
    sctx.font = "15px sans-serif";
    sctx.fillText(`Lock strength ${Math.round(lv * 100)}%  —  ${READS[lv]}`, x + 6, PX + 32);
  });

  writeFileSync(resolve(ROOT, "shots/zones/_lock-sweep.png"),
                sweep.toBuffer("image/png"));
  console.log(`\nWrote shots/zones/_lock-sweep.png (${sweep.width}x${sweep.height})`);

  /* A few locked worlds at different palettes and ocean depths, so the zone
   * is judged across the spread rather than on one lucky body. */
  const COLS = 4, CELL = 420;
  const varieties = [
    { seed: "lock-a", primaryHue: 30,  oceanDepth: 0.15, interiorHeat: 0.8 },
    { seed: "lock-b", primaryHue: 120, oceanDepth: 0.45, interiorHeat: 0.5 },
    { seed: "lock-c", primaryHue: 210, oceanDepth: 0.7,  interiorHeat: 0.3 },
    { seed: "lock-d", primaryHue: 300, oceanDepth: 0.0,  interiorHeat: 0.6 },
    { seed: "lock-e", primaryHue: 60,  oceanDepth: 0.55, interiorHeat: 0.15 },
    { seed: "lock-f", primaryHue: 170, oceanDepth: 0.3,  interiorHeat: 0.95 },
    { seed: "lock-g", primaryHue: 350, oceanDepth: 0.6,  interiorHeat: 0.45 },
    { seed: "lock-h", primaryHue: 265, oceanDepth: 0.25, interiorHeat: 0.7 }
  ];
  const rows = Math.ceil(varieties.length / COLS);
  const gal = createCanvas(COLS * CELL, rows * CELL);
  const gctx = gal.getContext("2d");
  gctx.fillStyle = "#07060c";
  gctx.fillRect(0, 0, gal.width, gal.height);

  varieties.forEach((v, i) => {
    const { canvas } = disc({ ...v, tidalLock: 0.85 }, CELL);
    gctx.drawImage(canvas, (i % COLS) * CELL, Math.floor(i / COLS) * CELL);
  });

  writeFileSync(resolve(ROOT, "shots/zones/_locked-worlds.png"),
                gal.toBuffer("image/png"));
  console.log(`Wrote shots/zones/_locked-worlds.png (${gal.width}x${gal.height})`);

  /* One disc per ordinary trait, so each can be checked for whether it is
   * actually visible — the failure mode every element pass in this project
   * has hit at least once. */
  const traits = CC.Traits.ids();
  const tcols = 4, tcell = 420;
  const trows = Math.ceil(traits.length / tcols);
  const tg = createCanvas(tcols * tcell, trows * tcell + trows * 24);
  const tctx = tg.getContext("2d");
  tctx.fillStyle = "#07060c";
  tctx.fillRect(0, 0, tg.width, tg.height);

  traits.forEach((id, i) => {
    const { canvas } = disc({ traits: [id], seed: "trait-" + id }, tcell);
    const x = (i % tcols) * tcell;
    const y = Math.floor(i / tcols) * (tcell + 24);
    tctx.drawImage(canvas, x, y);
    tctx.fillStyle = "rgba(255,255,255,0.75)";
    tctx.font = "15px sans-serif";
    tctx.fillText(CC.Traits.get(id).label, x + 8, y + tcell + 17);
  });

  writeFileSync(resolve(ROOT, "shots/zones/_traits.png"), tg.toBuffer("image/png"));
  console.log(`Wrote shots/zones/_traits.png (${tg.width}x${tg.height})`);
}
