/* Renders the zoom range into shots/framing/ so the close-ups can be looked at.
 *
 * The framing feature is a visual one and the project rule is that visual work
 * gets rendered and eyeballed rather than asserted to be good. domtest checks
 * the arithmetic and the promises (no re-roll, no count change, survives
 * Randomize and the settings string); this answers the only question those
 * cannot, which is what the thing actually looks like.
 *
 * `npm run framing`, then open shots/framing/.
 *
 * Like shots.mjs, this runs the same <script> files index.html lists. It skips
 * the two that need a DOM — main.js and ui/framing.js — because the transform
 * being exercised lives in draw/canvas.js and needs neither. */

import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(`${ROOT}/index.html`, "utf8");
const srcs = [...html.matchAll(/<script\s+src=["']([^"']+)["']/gi)]
  .map(m => m[1])
  .filter(s => !s.endsWith("js/main.js") && !s.endsWith("js/ui/framing.js"));

const sandbox = { console, Math, Date, parseInt, parseFloat, isNaN, isFinite };
sandbox.self = sandbox;
// lib/simplex-noise.js publishes itself onto `window`; the nebula background
// reads it from there, so the sandbox needs one or that background throws.
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
createContext(sandbox);
for (const src of srcs) {
  runInContext(readFileSync(resolve(ROOT, src), "utf8"), sandbox, { filename: src });
}
const CC = sandbox.CC;

const OUT = resolve(ROOT, "shots/framing");
mkdirSync(OUT, { recursive: true });

function settings(over = {}) {
  return {
    archetype: "planet",
    seed: "framing-demo",
    thicknessVariation: 0.7,
    optionalLayers: 0.75,
    coreBias: 0,
    oceanDepth: 0.4,
    interiorHeat: 0.6,
    boundaryIrregularity: 1,
    keepUpright: true,
    rotation: 0,
    hueRelationship: "auto",
    secondaryOffset: 0,
    saturation: 1,
    brightness: 1,
    contrast: 1,
    detailDensity: 0.65,
    sizeTiers: 3,
    textureStrength: 1,
    elementOpacity: 1,
    starlight: 0.55,
    starColour: "sunlike",
    starActivity: 0.3,
    axialTilt: 0,
    background: "starfield",
    backgroundColor: "#05070e",
    bodySize: 0.78,
    zoom: 1,
    panX: 0,
    panY: 0,
    ...over
  };
}

const W = 1280, H = 720;

function shot(name, over = {}) {
  const s = settings(over);
  const body = CC.Structure.build(CC.Archetypes.get(s.archetype), s, s.seed);
  const details = CC.Details.build(body, s, s.seed);
  const palette = CC.Palette.build(
    body, CC.Archetypes.get(s.archetype).colorProfile, s, s.seed);
  const canvas = createCanvas(W, H);
  const out = CC.Scene.render(canvas.getContext("2d"), W, H, body, s, palette, details);
  writeFileSync(resolve(OUT, `${name}.png`), canvas.toBuffer("image/png"));
  console.log(name.padEnd(28), `R=${out.view.R.toFixed(1)}`.padStart(12),
              ` extent=${(out.extent || 1).toFixed(2)}`);
  return out;
}

/* THE ZOOM RANGE, at the values the log slider actually lands on. The point of
 * looking at these is to see where the render stops being a cutaway and starts
 * being abstract bands — a transition that is kept rather than clamped away,
 * but which should be seen rather than guessed at. */
console.log("--- zoom range, centred ---");
for (const z of [1, 2, 3, 5, 8, 12, 20]) {
  shot(`zoom-${String(z).padStart(2, "0")}x`, { zoom: z });
}

/* Panning into the layer stack: the shot the feature exists for. A boundary
 * off-centre and filling the frame is the thing the fitted whole-body view
 * cannot produce at all. */
console.log("\n--- panned into the interior ---");
shot("pan-core", { zoom: 6, panX: 0, panY: 0.35 });
shot("pan-crust-left", { zoom: 5, panX: -0.62, panY: 0 });
shot("pan-limb", { zoom: 4, panX: 0.75, panY: -0.4 });
shot("pan-deep-core", { zoom: 14, panX: 0, panY: 0 });

/* THE EXTENT CHANGE, which is the larger of the two edits and the one with a
 * before/after worth comparing. A ringed body used to be drawn smaller than a
 * bare one; these two should now be the same size, with the rings running off
 * the frame instead of shrinking the planet. */
console.log("\n--- extent no longer sizes the body ---");
shot("extent-bare", { seed: "ring-compare", traits: [], traitExcluded: ["rings", "debris-field"] });
shot("extent-ringed", { seed: "ring-compare", traits: ["rings"] });
shot("extent-ringed-zoomed", { seed: "ring-compare", traits: ["rings"], zoom: 2.5 });

/* Backgrounds are FIXED under framing — they do not pan or zoom with the body,
 * because a cutaway's backdrop is paper rather than sky. Worth a look at high
 * zoom, where a parallaxing starfield would have been most obviously wrong. */
console.log("\n--- fixed background under heavy framing ---");
for (const bg of ["starfield", "gradient", "solid"]) {
  shot(`bg-${bg}-zoomed`, { background: bg, backgroundColor: "#141024",
                            zoom: 9, panX: 0.3, panY: -0.25 });
}

console.log(`\nWrote to ${OUT}`);
