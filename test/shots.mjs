/* Renders a set of PNGs into shots/ so the output can actually be looked at.
 *
 * The project rule is that visual work gets rendered and eyeballed, never
 * asserted to be good. This is the tool for that: `npm run shots`, then open
 * the folder.
 *
 * Like sweep.mjs, this loads the same <script> files index.html lists rather
 * than importing modules — there are none to import. */

import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync, mkdirSync } from "node:fs";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(`${ROOT}/index.html`, "utf8");
const srcs = [...html.matchAll(/<script\s+src=["']([^"']+)["']/gi)]
  .map(m => m[1])
  .filter(s => !s.endsWith("js/main.js"));   // needs a DOM; not used here

const sandbox = { console, Math, Date, parseInt, parseFloat, isNaN, isFinite };
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
createContext(sandbox);
for (const src of srcs) {
  runInContext(readFileSync(resolve(ROOT, src), "utf8"), sandbox, { filename: src });
}
const CC = sandbox.CC;

mkdirSync(resolve(ROOT, "shots"), { recursive: true });

function settings(over = {}) {
  return {
    archetype: "planet",
    seed: "first-light",
    thicknessVariation: 0.7,
    optionalLayers: 0.75,
    coreBias: 0,
    oceanDepth: 0.4,
    interiorHeat: 0.55,
    boundaryIrregularity: 1,
    keepUpright: false,
    rotation: 0,
    hueRelationship: "auto",
    secondaryOffset: 0,
    saturation: 1,
    brightness: 1,
    contrast: 1,
    background: "starfield",
    backgroundColor: "#05070e",
    bodySize: 0.78,
    ...over
  };
}

function shot(name, over = {}, size = [1280, 720]) {
  const s = settings(over);
  const body = CC.Structure.build(CC.Archetypes.get(s.archetype), s, s.seed);
  const canvas = createCanvas(size[0], size[1]);
  CC.Scene.render(canvas.getContext("2d"), size[0], size[1], body, s);
  writeFileSync(resolve(ROOT, `shots/${name}.png`), canvas.toBuffer("image/png"));
  console.log(
    name.padEnd(30),
    String(body.layers.length).padStart(2) + " layers  ",
    body.layers.map(l => l.role).join(" ")
  );
}

console.log("--- the default body, several seeds ---");
for (const seed of ["first-light", "kx-2291", "vorash-4417", "tanmir-8802", "zirquahoth-3160"]) {
  shot(`seed-${seed}`, { seed });
}

console.log("\n--- Ocean depth sweep (the parameter must add and remove a layer) ---");
for (const v of [0, 0.05, 0.25, 0.5, 0.75, 1]) {
  shot(`ocean-${String(Math.round(v * 100)).padStart(3, "0")}`,
       { seed: "ocean-demo", oceanDepth: v, interiorHeat: 0.55 });
}

console.log("\n--- Interior heat sweep (0 removes the outer core) ---");
for (const v of [0, 0.1, 0.15, 0.4, 0.7, 1]) {
  shot(`heat-${String(Math.round(v * 100)).padStart(3, "0")}`,
       { seed: "heat-demo", interiorHeat: v, oceanDepth: 0.35 });
}

console.log("\n--- Boundary irregularity ---");
for (const v of [0, 0.5, 1, 2]) {
  shot(`irregularity-${Math.round(v * 100)}`, { seed: "wobble-demo", boundaryIrregularity: v });
}

console.log("\n--- Core size bias ---");
for (const v of [-1, 0, 1]) {
  shot(`corebias-${v}`, { seed: "core-demo", coreBias: v });
}

console.log("\n--- The named worlds these parameters are meant to reach ---");
shot("preset-desert", { seed: "desert-1", oceanDepth: 0, interiorHeat: 0.5 });
shot("preset-ocean", { seed: "ocean-1", oceanDepth: 0.95, interiorHeat: 0.5 });
shot("preset-dead", { seed: "dead-1", oceanDepth: 0, interiorHeat: 0, optionalLayers: 0 });
shot("preset-volcanic", { seed: "volcanic-1", oceanDepth: 0.1, interiorHeat: 1 });
shot("preset-garden", { seed: "garden-1", oceanDepth: 0.45, interiorHeat: 0.5 });

console.log("\n--- Backgrounds ---");
for (const bg of ["starfield", "solid", "gradient", "transparent"]) {
  shot(`bg-${bg}`, { seed: "bg-demo", background: bg, backgroundColor: "#141024" });
}

console.log("\n--- Colour: hue sweep at a fixed body ---");
for (const h of [0, 45, 90, 140, 200, 260, 310]) {
  shot(`hue-${String(h).padStart(3, "0")}`, { seed: "hue-demo", primaryHue: h });
}

console.log("\n--- Colour: hue relationships, same hue ---");
for (const rel of ["complement", "analogous", "triad", "split", "monochrome"]) {
  shot(`rel-${rel}`, { seed: "rel-demo", primaryHue: 205, hueRelationship: rel });
}

console.log("\n--- Colour: saturation / brightness / contrast extremes ---");
for (const v of [0, 0.5, 1, 1.6, 2]) {
  shot(`sat-${Math.round(v * 100)}`, { seed: "range-demo", saturation: v });
}
for (const v of [0.4, 1, 1.8]) {
  shot(`bright-${Math.round(v * 100)}`, { seed: "range-demo", brightness: v });
}
for (const v of [0, 1, 2]) {
  shot(`contrast-${Math.round(v * 100)}`, { seed: "range-demo", contrast: v });
}

console.log("\n--- Colour: Interior heat should drive saturation ---");
for (const v of [0, 0.25, 0.5, 0.75, 1]) {
  shot(`heatcolour-${Math.round(v * 100)}`,
       { seed: "heatcolour", interiorHeat: v, oceanDepth: 0.3 });
}

console.log("\n--- Twenty random bodies: the real test of harmony ---");
for (let i = 0; i < 20; i++) {
  const r = (n) => Math.abs(Math.sin((i + 1) * n) * 10000) % 1;
  shot(`random-${String(i).padStart(2, "0")}`, {
    seed: `roll-${i}`,
    primaryHue: Math.round(r(1.7) * 360),
    hueRelationship: ["auto", "complement", "analogous", "triad", "split", "monochrome"][i % 6],
    oceanDepth: r(2.3),
    interiorHeat: r(3.1),
    coreBias: r(4.7) * 2 - 1,
    saturation: 0.85 + r(5.3) * 0.35,
    brightness: 0.88 + r(6.1) * 0.27,
    contrast: 0.8 + r(7.9) * 0.5
  });
}

console.log("\n--- Resolution independence: the same body at three sizes ---");
for (const [w, h, tag] of [[640, 360, "360p"], [1280, 720, "720p"], [2560, 1440, "1440p"]]) {
  shot(`res-${tag}`, { seed: "res-demo" }, [w, h]);
}

console.log("\n--- Square ---");
shot("square", { seed: "first-light" }, [900, 900]);

console.log("\nWrote PNGs to shots/");
