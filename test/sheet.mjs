/* Contact sheet: many bodies in one image, for judging colour at a glance.
 *
 * Phase 2's done-condition is "re-rolling gives harmonious, clearly different
 * schemes and nothing looks muddy" — which is a judgement about the *spread*
 * of outputs, not about any single one. That needs them side by side.
 *
 * Usage:  node test/sheet.mjs [count] [cols]
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

const COUNT = parseInt(process.argv[2] || "24", 10);
const COLS = parseInt(process.argv[3] || "6", 10);
const CELL = 300;
const ROWS = Math.ceil(COUNT / COLS);

mkdirSync(resolve(ROOT, "shots"), { recursive: true });

const canvas = createCanvas(COLS * CELL, ROWS * CELL);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#07060c";
ctx.fillRect(0, 0, canvas.width, canvas.height);

/* Roll each body the way Randomize does, so the sheet shows what a user
 * actually gets rather than a hand-picked set. */
function rollSettings(i) {
  const r = CC.RNG.stream("sheet-" + i, "roll");
  const rel = ["auto", "complement", "analogous", "triad", "split", "monochrome"];
  return {
    archetype: "planet",
    seed: "sheet-" + i,
    thicknessVariation: 0.35 + r() * 0.65,
    optionalLayers: 0.3 + r() * 0.7,
    coreBias: r() * 1.6 - 0.8,
    oceanDepth: r(),
    interiorHeat: r(),
    boundaryIrregularity: 1,
    keepUpright: true,
    rotation: 0,
    primaryHue: r() * 360,
    hueRelationship: rel[Math.floor(r() * rel.length)],
    secondaryOffset: r() * 60 - 30,
    saturation: 0.85 + r() * 0.35,
    brightness: 0.88 + r() * 0.27,
    contrast: 0.8 + r() * 0.5,
    background: "solid",
    backgroundColor: "#07060c",
    bodySize: 0.86
  };
}

for (let i = 0; i < COUNT; i++) {
  const s = rollSettings(i);
  const body = CC.Structure.build(CC.Archetypes.get("planet"), s, s.seed);
  const pal = CC.Palette.build(body, CC.Archetypes.get("planet").colorProfile, s, s.seed);

  const cell = createCanvas(CELL, CELL);
  CC.Scene.render(cell.getContext("2d"), CELL, CELL, body, s, pal);

  const x = (i % COLS) * CELL;
  const y = Math.floor(i / COLS) * CELL;
  ctx.drawImage(cell, x, y);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "11px sans-serif";
  ctx.fillText(`${i}  ${pal.relation}  h${Math.round(pal.anchors.primary)}`, x + 8, y + CELL - 8);
}

const out = resolve(ROOT, "shots/_sheet.png");
writeFileSync(out, canvas.toBuffer("image/png"));
console.log(`Wrote ${COUNT} bodies to shots/_sheet.png (${canvas.width}x${canvas.height})`);
