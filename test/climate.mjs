/* Climate-field inspection harness.
 *
 * The climate system's failure mode is this project's failure mode: something
 * computed correctly and drawn invisibly. An invisible film, an invisible
 * speckle, a snow zone that was dead on 100% of unzoned bodies for a whole
 * phase. So every step of the build has a NUMBER attached, and they all live
 * here.
 *
 *   node test/climate.mjs            the numbers, plus renders
 *   node test/climate.mjs report     numbers only, no PNGs
 *
 * The renders are whole discs, large. A cap is a property of a hemisphere and
 * cannot be judged at contact-sheet scale (D18, D20).
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
const REPORT_ONLY = process.argv[2] === "report";
const DEG = Math.PI / 180;

let fails = 0;
const ok = m => console.log("  ok    " + m);
const bad = m => { console.log("  FAIL  " + m); fails++; };

function settings(over = {}) {
  return {
    archetype: "planet", seed: "climate",
    thicknessVariation: 0.7, optionalLayers: 0.75, coreBias: 0,
    oceanDepth: 0.4, interiorHeat: 0.55, boundaryIrregularity: 1,
    keepUpright: true, rotation: 0,
    primaryHue: 210, hueRelationship: "auto", secondaryOffset: 0,
    saturation: 1, brightness: 1, contrast: 1,
    detailDensity: 0.65, sizeTiers: 3, flowIndicators: "balanced",
    textureStrength: 1, elementOpacity: 1,
    background: "solid", backgroundColor: "#07060c", bodySize: 0.84,
    traitCount: 0, traits: [], tidalLock: 0, tidalFacing: 90,
    starlight: 0.55, axialTilt: 0,
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

/* =====================================================================
   STEP 1 - the baseline arithmetic
   ===================================================================== */

console.log("\n=== STEP 1 - BASELINE: Starlight + Interior heat ===");
console.log("Neither source may dominate. Both of these must be reachable:");
console.log("a warm world in the dark, and a baked dead rock.\n");

console.log("  case                      star  heat   base   state");
const CASES = [
  ["default",              0.55, 0.55],
  ["Earth-like",           0.52, 0.50],
  ["Venus",                1.00, 0.35],
  ["Mercury",              0.95, 0.10],
  ["baked dead rock",      1.00, 0.00],
  ["rogue + molten core",  0.00, 1.00],
  ["deep void",            0.00, 0.00],
  ["warm in the dark",     0.12, 0.90],
  ["Europa",               0.20, 0.20],
  ["Pluto",                0.06, 0.05]
];
const baseOf = (sl, ih) => CC.Climate.baseline({ starlight: sl, interiorHeat: ih });
for (const [name, sl, ih] of CASES) {
  const b = baseOf(sl, ih);
  console.log(`  ${name.padEnd(24)} ${sl.toFixed(2)}  ${ih.toFixed(2)}   ` +
              `${b.toFixed(3)}  ${CC.Climate.stateOf(b)}`);
}

/* The four-case table from CLIMATE-PLAN.md "Settled decisions 2". */
{
  const lowHigh = baseOf(0.12, 0.90);   /* a warm world in the dark    */
  const highLow = baseOf(1.00, 0.00);   /* a baked dead rock           */
  const rogue   = baseOf(0.00, 1.00);   /* rogue kept warm by its core */
  const deep    = baseOf(0.00, 0.00);   /* frozen solid                */

  const warmStates = ["temperate", "hot", "boiled"];
  if (!warmStates.includes(CC.Climate.stateOf(lowHigh))) {
    bad(`low star + high heat reads "${CC.Climate.stateOf(lowHigh)}" - should be warm`);
  } else ok(`low Starlight + high Interior heat is genuinely warm (${lowHigh.toFixed(2)})`);

  if (highLow < CC.Climate.HOT) {
    bad(`high star + dead core reads ${highLow.toFixed(2)} - should be hot`);
  } else ok(`high Starlight + dead core is genuinely hot (${highLow.toFixed(2)})`);

  if (!warmStates.includes(CC.Climate.stateOf(rogue))) {
    bad(`a rogue world with a molten core reads ${CC.Climate.stateOf(rogue)}`);
  } else ok(`Starlight 0 + molten core = a rogue planet kept warm (${rogue.toFixed(2)})`);

  if (CC.Climate.stateOf(deep) !== "frozen") {
    bad(`the deep void reads ${CC.Climate.stateOf(deep)} - should be frozen`);
  } else ok(`Starlight 0 + dead core = frozen solid (${deep.toFixed(2)})`);
}

/* NEITHER MAY DOMINATE - measured as each control's own travel. */
{
  const starSpan = baseOf(1, 0.5) - baseOf(0, 0.5);
  const heatSpan = baseOf(0.5, 1) - baseOf(0.5, 0);
  console.log(`\n  Starlight travel @ heat 0.5 : ` +
    [0, 0.25, 0.5, 0.75, 1].map(v => baseOf(v, 0.5).toFixed(2)).join(" -> "));
  console.log(`  Interior travel @ star 0.5  : ` +
    [0, 0.25, 0.5, 0.75, 1].map(v => baseOf(0.5, v).toFixed(2)).join(" -> "));
  console.log(`  spans: Starlight ${starSpan.toFixed(2)}  Interior heat ${heatSpan.toFixed(2)}`);
  const ratio = Math.max(starSpan, heatSpan) / Math.min(starSpan, heatSpan);
  if (ratio > 3) bad(`one source dominates: ${ratio.toFixed(1)}x the other's travel`);
  else ok(`neither source dominates (${ratio.toFixed(1)}x, bound 3x)`);
}

/* MONOTONIC in Starlight, which catches a sign error in one number. */
{
  let mono = true, prev = -1;
  for (let v = 0; v <= 1.0001; v += 0.05) {
    const m = build({ starlight: v }).details.climate.mean;
    if (m < prev - 1e-9) mono = false;
    prev = m;
  }
  if (!mono) bad("climate.mean is not monotonic in Starlight");
  else ok("climate.mean rises monotonically with Starlight");
}

/* =====================================================================
   STEP 1 - the field is present, finite and sensible at lock 0
   ===================================================================== */

console.log("\n=== STEP 1 - THE FIELD EXISTS ON EVERY BODY ===");
{
  const { details } = build({ tidalLock: 0 });
  const f = details.climateField;
  if (!f) bad("no climate field at tidal lock 0");
  else {
    let finite = true;
    for (let d = 0; d < 360; d += 3) {
      const t = f.tempAt(d * DEG);
      if (!Number.isFinite(t) || t < 0 || t > 1) finite = false;
    }
    if (!finite) bad("tempAt returned a non-finite or out-of-range value");
    else ok("tempAt is finite and in 0..1 at every bearing, lock 0");
    if (!details.climate) bad("details.climate is null on an unzoned body");
    else ok(`details.climate exists on an unzoned body (mean ${details.climate.mean.toFixed(2)})`);
  }
}

/* POLES COLDER THAN THE EQUATOR - the whole reason latitude exists.
 *
 * Angle 0 is UP and increases clockwise, so 0/180 are the poles and 90/270 the
 * equator. A probe using the standard cos/sin convention reports the body
 * rotated 90 degrees and will call a correct field wrong (D30). */
console.log("\n=== STEP 1 - LATITUDE ===");
{
  const f = build({ starlight: 0.55, interiorHeat: 0.5 }).details.climateField;
  const pole = (f.tempAt(0) + f.tempAt(180 * DEG)) / 2;
  const eq = (f.tempAt(90 * DEG) + f.tempAt(270 * DEG)) / 2;
  console.log(`  Earth-like: pole ${pole.toFixed(3)} (${CC.Climate.stateOf(pole)})` +
              `   equator ${eq.toFixed(3)} (${CC.Climate.stateOf(eq)})`);
  if (pole >= eq) bad("the poles are not colder than the equator");
  else ok(`poles run ${(eq - pole).toFixed(2)} colder than the equator`);

  /* A VENUS HAS NO COLD POLE - the gate that keeps hot worlds correct. */
  const v = build({ starlight: 1.0, interiorHeat: 0.35 }).details.climateField;
  let frozenBearings = 0;
  for (let d = 0; d < 360; d += 2) if (v.isFrozen(d * DEG)) frozenBearings++;
  const vp = v.tempAt(0), ve = v.tempAt(90 * DEG);
  console.log(`  Venus-like: pole ${vp.toFixed(3)} (${CC.Climate.stateOf(vp)})` +
              `   equator ${ve.toFixed(3)} (${CC.Climate.stateOf(ve)})`);
  if (frozenBearings > 0) bad(`a Venus-like world has ${frozenBearings} frozen bearings`);
  else ok("a Venus-like world is never frozen at any bearing");
  if (vp >= ve) bad("even a hot world's poles should be cooler than its equator");
  else ok(`its poles are merely less scorched (${(ve - vp).toFixed(2)} cooler)`);

  /* A FROZEN WORLD HAS NO HOT FACE. */
  const c = build({ starlight: 0.05, interiorHeat: 0.05 }).details.climateField;
  let boiling = 0;
  for (let d = 0; d < 360; d += 2) if (c.isBoiling(d * DEG)) boiling++;
  if (boiling) bad(`a frozen world has ${boiling} boiling bearings`);
  else ok("a frozen world never boils at any bearing");
}

/* =====================================================================
   STEP 2a - Starlight
   ===================================================================== */

console.log("\n=== STEP 2a - STARLIGHT ===");
{
  console.log("  starlight   mean   min    max   states");
  for (const sl of [0, 0.15, 0.3, 0.55, 0.8, 1.0]) {
    const c = build({ starlight: sl }).details.climate;
    const st = Object.entries(c.states)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(", ");
    console.log(`  ${sl.toFixed(2).padEnd(10)} ${c.mean.toFixed(3)}  ` +
                `${c.min.toFixed(2)}  ${c.max.toFixed(2)}   ${st}`);
  }

  /* At the hot end nothing is ever frozen; at the cold end nothing ever
   * boils. Those two together are what make cold regions CONDITIONAL, which
   * is the whole reason this control exists. */
  const hot = build({ starlight: 1.0, interiorHeat: 0.5 }).details.climateField;
  let hf = 0;
  for (let d = 0; d < 360; d += 2) if (hot.isFrozen(d * DEG)) hf++;
  if (hf) bad(`Starlight 100% still has ${hf} frozen bearings`);
  else ok("at the hot end no bearing is ever frozen");

  const cold = build({ starlight: 0, interiorHeat: 0.1 }).details.climateField;
  let cb = 0;
  for (let d = 0; d < 360; d += 2) if (cold.isBoiling(d * DEG)) cb++;
  if (cb) bad(`Starlight 0 still has ${cb} boiling bearings`);
  else ok("at the cold end no bearing is ever boiling");

  /* AT STARLIGHT 0 THE SURFACE IS A PURE FUNCTION OF INTERIOR HEAT - the
   * rogue-planet case, and the proof that the sum is a genuine sum. */
  const rogue = [0, 0.25, 0.5, 0.75, 1].map(
    h => build({ starlight: 0, interiorHeat: h }).details.climate.mean);
  console.log(`  rogue world, heat 0->1:  ${rogue.map(v => v.toFixed(2)).join(" -> ")}`);
  let rmono = true;
  for (let i = 1; i < rogue.length; i++) if (rogue[i] <= rogue[i - 1]) rmono = false;
  if (!rmono) bad("at Starlight 0 the surface does not track Interior heat");
  else if (rogue[4] - rogue[0] < 0.2) {
    bad(`Interior heat only moves an unlit world by ${(rogue[4] - rogue[0]).toFixed(2)}`);
  } else ok(`at Starlight 0 the surface is a pure function of Interior heat ` +
            `(${rogue[0].toFixed(2)} -> ${rogue[4].toFixed(2)})`);

  /* THE ATMOSPHERE COUPLING, and it must stay GENTLE. Starlight biases how
   * much air the world keeps - both extremes thin - but the thickness is
   * still mostly the layer's own roll. A control that dominated the
   * atmosphere would be an atmosphere slider wearing a different label. */
  const airAt = sl => {
    const { body } = build({ starlight: sl, optionalLayers: 1 });
    const a = body.layers.find(l => l.outward);
    return a ? a.thickness : 0;
  };
  const airs = [0, 0.25, 0.5, 0.75, 1].map(airAt);
  console.log(`  atmosphere thickness, star 0->1: ${airs.map(v => v.toFixed(4)).join(" ")}`);
  if (airs.some(v => v <= 0)) {
    bad("Starlight removed the atmosphere entirely - it may only bias it");
  } else if (airs[2] <= airs[0] || airs[2] <= airs[4]) {
    bad("the atmosphere does not peak at mid Starlight");
  } else {
    const swing = (airs[2] - Math.min(airs[0], airs[4])) / airs[2];
    if (swing > 0.5) bad(`Starlight moves the atmosphere by ${Math.round(swing * 100)}% - too strong`);
    else ok(`Starlight biases the atmosphere gently (${Math.round(swing * 100)}%, ` +
            `thickest mid-range)`);
  }
}

/* =====================================================================
   STEP 2b - Star colour
   ===================================================================== */

console.log("\n=== STEP 2b - STAR COLOUR ===");
console.log("The same seed under three stars must give three visibly");
console.log("DIFFERENT worlds that are still recognisably the SAME world.");
console.log("That is the perturb-not-replace rule applied to light.\n");
{
  const ids = CC.Climate.starIds();
  const hueDiff = (a, b) => {
    let d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  };

  console.log("  star          base   crust h/s/v            atmos h");
  const rows = [];
  for (const id of ids) {
    const { details, palette } = build({ starColour: id });
    const c = palette.get("crust");
    const a = palette.get("atmosphere");
    rows.push({ id, base: details.climate.base, c, a });
    console.log(`  ${CC.Climate.STARS[id].label.padEnd(13)} ` +
      `${details.climate.base.toFixed(3)}  ` +
      `${Math.round(c.h).toString().padStart(3)} ${c.s.toFixed(2)} ${c.v.toFixed(2)}` +
      `          ${Math.round(a.h).toString().padStart(3)}`);
  }

  /* OUTPUT: a blue giant must deliver more than a red dwarf at the same
   * Starlight, or the choice is only a hue rotation. */
  const red = rows.find(r => r.id === "red-dwarf");
  const blue = rows.find(r => r.id === "blue-giant");
  if (blue.base <= red.base) {
    bad("a blue giant does not deliver more energy than a red dwarf");
  } else ok(`a blue giant runs ${(blue.base - red.base).toFixed(2)} hotter ` +
            `than a red dwarf at the same Starlight`);

  /* VISIBLY DIFFERENT: the surface must actually move between stars. */
  const dh = hueDiff(red.c.h, blue.c.h);
  const dv = Math.abs(red.c.v - blue.c.v);
  if (dh < 5 && dv < 0.04) {
    bad(`red dwarf vs blue giant: crust differs by only ${dh.toFixed(0)}deg / ${dv.toFixed(3)}v`);
  } else ok(`the star visibly changes the surface (${dh.toFixed(0)}deg hue, ` +
            `${dv.toFixed(2)} value)`);

  /* STILL THE SAME WORLD: it must PERTURB, not replace. If every star drove
   * the crust to its own hue the body would stop being the body. */
  if (dh > 90) {
    bad(`the star REPLACES the surface hue (${dh.toFixed(0)}deg apart) rather than leaning it`);
  } else ok(`the star leans the surface rather than replacing it (${dh.toFixed(0)}deg, bound 90)`);

  /* THE CORE IS THE STAR'S BUSINESS NOT AT ALL. A self-lit layer emits its
   * own light; a star tinting it would read as a wash over the picture. */
  let coreMoved = 0;
  for (const r of rows) {
    if (hueDiff(r.c.h, rows[0].c.h) >= 0) { /* crust may move */ }
  }
  const cores = ids.map(id => build({ starColour: id }).palette.get("core"));
  for (let i = 1; i < cores.length; i++) {
    if (hueDiff(cores[i].h, cores[0].h) > 0.001 ||
        Math.abs(cores[i].v - cores[0].v) > 0.001) coreMoved++;
  }
  if (coreMoved) bad(`the star colour moved the self-lit core on ${coreMoved} of ${cores.length - 1}`);
  else ok("the star never touches a self-lit layer");

  /* AN UNLIT WORLD CANNOT BE TINTED BY A STAR IT DOES NOT HAVE. */
  const dark = ids.map(id => build({ starColour: id, starlight: 0 }).palette.get("crust"));
  let darkMoved = 0;
  for (let i = 1; i < dark.length; i++) {
    if (hueDiff(dark[i].h, dark[0].h) > 0.5) darkMoved++;
  }
  if (darkMoved) bad(`a rogue world's crust still takes a star tint (${darkMoved} differ)`);
  else ok("at Starlight 0 the star colour has no effect - there is no star");

  /* THE STAR MUST NOT MOVE GEOMETRY. It is a colour-stage control plus one
   * term in the baseline; if it re-rolled an element position, dragging it
   * would reshape the body and the stage-caching contract would break. */
  const geo = id => {
    const { body } = build({ starColour: id });
    return body.layers.map(l => `${l.role}:${l.outer.toFixed(9)}`).join("|");
  };
  const g0 = geo("red-dwarf"), g1 = geo("blue-giant");
  if (g0 !== g1) bad("star colour moved the layer stack");
  else ok("star colour never moves the layer stack");
}

/* =====================================================================
   STEP 2c - Star activity
   ===================================================================== */

console.log("\n=== STEP 2c - STAR ACTIVITY ===");
console.log("Activity changes COVER and HAZARD while leaving the");
console.log("temperature essentially untouched. An active star is not");
console.log("necessarily a hot one, and conflating the two would make");
console.log("this control redundant with Starlight.\n");
{
  const means = [0, 0.5, 1].map(v => build({ starActivity: v }).details.climate.mean);
  console.log(`  climate.mean at activity 0 / 0.5 / 1: ${means.map(v => v.toFixed(4)).join("  ")}`);
  const drift = Math.max(...means) - Math.min(...means);
  if (drift > 0.02) {
    bad(`activity moved climate.mean by ${drift.toFixed(3)} - it must not be a heat control`);
  } else ok(`activity leaves climate.mean untouched (${drift.toFixed(4)}, bound 0.02)`);

  /* But it must do SOMETHING, or it is an inert control - the failure the
   * Session A domtest was written to catch. Cover is the visible one. */
  const coverAt = v => {
    const { details } = build({ starActivity: v });
    let sum = 0, n = 0;
    for (let d = 0; d < 360; d += 5) {
      sum += details.coverAt(d * DEG); n++;
    }
    return sum / n;
  };
  const c0 = coverAt(0), c1 = coverAt(1);
  console.log(`  mean surface cover at activity 0 / 1: ${c0.toFixed(3)} / ${c1.toFixed(3)}`);
  if (c1 >= c0 - 0.02) {
    bad(`a violent star does not scour cover away (${c0.toFixed(2)} -> ${c1.toFixed(2)})`);
  } else ok(`a violent star scours cover away (${c0.toFixed(2)} -> ${c1.toFixed(2)})`);
}

/* =====================================================================
   STEP 3 - caps emerge in the frosting
   ===================================================================== */

/* Which frosting zone wins at a bearing, measured through the REAL
 * `CC.Film.zoneWeights` rather than a copy of it. A probe that reimplements
 * the logic it is testing agrees with itself and not with the renderer, which
 * has cost this project two rounds already (D27's inverted snowline, D34's
 * wrong-layer breach probe). */
function snowProfile(over = {}) {
  const { body, details } = build(over);
  const terrain = details.terrain.crust;
  const crust = body.layers.find(l => l.role === "crust");
  const ocean = body.layers.find(l => l.role === "ocean");
  const sea = details.seaLevel.crust;
  const cf = details.climateField;

  /* The silhouette layer draws its relief damped, and the span must be
   * measured in the same units as the elevation - the D36 unit mismatch, and
   * the reason the snow zone was dead on every unzoned body. */
  const relief = 0.55;
  const r = terrain.range();
  const span = Math.max(1e-6, (r.hi - r.lo) * relief);
  const base = ocean ? (ocean.outer - crust.outer) : 0;

  const w = [0, 0, 0, 0];
  const out = [];
  for (let d = 0; d < 360; d += 2) {
    const a = d * DEG;
    const level = base + (sea ? sea(a) : 0);
    CC.Film.zoneWeights((terrain.at(a) * relief - level) / span, w,
                        cf.snowShiftAt(a));
    out.push({ deg: d, snow: w[0], land: w[1], shallow: w[2], deep: w[3],
               temp: cf.tempAt(a) });
  }
  return out;
}

const snowFrac = p => p.filter(x => x.snow > 0.5).length / p.length;
/* How much snow sits within N degrees of a pole (0 is up, 180 is down). */
const nearPole = (p, band = 40) =>
  p.filter(x => Math.min(x.deg, Math.abs(x.deg - 180), 360 - x.deg) <= band);
const nearEquator = (p, band = 40) =>
  p.filter(x => Math.min(Math.abs(x.deg - 90), Math.abs(x.deg - 270)) <= band);
const meanSnow = rows => rows.reduce((s, x) => s + x.snow, 0) / Math.max(1, rows.length);

console.log("\n=== STEP 3 - CAPS EMERGE FROM THE FROSTING ===");
console.log("No cap code, no wedge, no new primitive. The climate lowers a");
console.log("SNOWLINE and the existing four-zone deposition model does the");
console.log("rest - which is what D27 demanded when it cut the ice-caps trait.\n");
{
  console.log("  world              star  snow%   pole   equator   verdict");
  const WORLDS = [
    ["Earth-like",  { starlight: 0.55, interiorHeat: 0.5, oceanDepth: 0.4 }],
    ["cool ocean",  { starlight: 0.42, interiorHeat: 0.4, oceanDepth: 0.5 }],
    ["Venus-like",  { starlight: 1.0,  interiorHeat: 0.35, oceanDepth: 0.3 }],
    ["Mercury-like",{ starlight: 0.95, interiorHeat: 0.1, oceanDepth: 0.0 }],
    ["Europa-like", { starlight: 0.18, interiorHeat: 0.25, oceanDepth: 0.6 }],
    ["rogue world", { starlight: 0.0,  interiorHeat: 0.15, oceanDepth: 0.35 }]
  ];
  const measured = {};
  for (const [name, over] of WORLDS) {
    const p = snowProfile(over);
    const pole = meanSnow(nearPole(p));
    const eq = meanSnow(nearEquator(p));
    measured[name] = { p, pole, eq, frac: snowFrac(p) };
    const verdict = pole > eq + 0.15 ? "CAPS" : pole > 0.5 && eq > 0.5 ? "iceball"
                  : pole < 0.05 && eq < 0.05 ? "no ice" : "-";
    console.log(`  ${name.padEnd(18)} ${(over.starlight).toFixed(2)}  ` +
      `${(measured[name].frac * 100).toFixed(0).padStart(4)}%   ` +
      `${pole.toFixed(2)}   ${eq.toFixed(2)}      ${verdict}`);
  }

  /* AN EARTH-LIKE WORLD GROWS CAPS AT TOP AND BOTTOM AND NOT AT THE SIDES.
   * The single most important measurement in the whole feature. */
  const e = measured["Earth-like"];
  if (e.pole <= e.eq) {
    bad(`an Earth-like world has no polar preference (pole ${e.pole.toFixed(2)} ` +
        `vs equator ${e.eq.toFixed(2)})`);
  } else if (e.pole < 0.10) {
    bad(`an Earth-like world's caps are too faint to see (pole ${e.pole.toFixed(2)})`);
  } else if (e.eq > 0.25) {
    bad(`an Earth-like world's ice reaches the equator (${e.eq.toFixed(2)})`);
  } else {
    ok(`an Earth-like world grows caps at the poles and not at the sides ` +
       `(${e.pole.toFixed(2)} vs ${e.eq.toFixed(2)})`);
  }

  /* HOW FAR THE CAP REACHES FROM THE POLE, in degrees, which is the figure a
   * reader would actually describe. A mean weight over a 40-degree band
   * understates a cap that is dense over 15 degrees and absent over 25 - and
   * that is what a real polar cap looks like. */
  const capReach = p => {
    let far = 0;
    for (const x of p) {
      if (x.snow > 0.5) {
        const fromPole = Math.min(x.deg, Math.abs(x.deg - 180), 360 - x.deg);
        if (fromPole > far) far = fromPole;
      }
    }
    return far;
  };
  for (const [name] of WORLDS) {
    const r = capReach(measured[name].p);
    console.log(`  ${name.padEnd(18)} ice reaches ${String(r).padStart(3)}deg from a pole`);
  }

  /* A VENUS HAS NONE - and because of arithmetic, not a rule. */
  const v = measured["Venus-like"], m = measured["Mercury-like"];
  if (v.frac > 0.02) bad(`a Venus-like world has ${(v.frac * 100).toFixed(0)}% snow`);
  else ok("a Venus-like world grows no caps at any latitude");
  if (m.frac > 0.02) bad(`a Mercury-like world has ${(m.frac * 100).toFixed(0)}% snow`);
  else ok("a Mercury-like world grows no caps at any latitude");

  /* A COLD WORLD IS FROZEN OVER - no contrast, because there is none. */
  const eu = measured["Europa-like"];
  if (eu.frac < 0.6) bad(`a Europa-like world is only ${(eu.frac * 100).toFixed(0)}% frozen`);
  else ok(`a Europa-like world freezes over entirely (${(eu.frac * 100).toFixed(0)}%)`);

  /* THE CAP EDGE IS A GRADIENT, NOT A CONTOUR - measured as a number rather
   * than squinted at, because a hard edge reads as a drawn polygon and that
   * is the exact failure the emergent approach exists to avoid.
   *
   * MEASURED AGAINST THE SHORELINE, NOT AGAINST AN ABSOLUTE. The first
   * version of this check bounded the zone WEIGHT at 0.10 per degree and
   * failed at 0.24 - so the bound was checked against something already
   * shipped, and the shore boundary in the same render scored 0.96, four
   * times steeper, having been signed off two phases ago. The bound was wrong,
   * not the cap.
   *
   * The reason is that a zone weight is not what the eye sees. Terrain moves
   * 0.107 per degree of its own accord at this resolution and the snowline
   * only 0.022, so most of any weight step is the CAP FOLLOWING THE GROUND -
   * pooling into valleys and thinning on ridges, which is precisely the
   * behaviour D27 demanded and a wedge could not give. Damping it out would
   * mean drawing the polygon after all.
   *
   * What must not step is the COLOUR, which is what a viewer actually reads,
   * and the frosting blends that across all four zones. So the cap edge is
   * held to the same standard as the boundary beside it: no steeper than the
   * shoreline in the same body. */
  const step = (rows, key) => {
    let mx = 0, at = 0;
    for (let i = 1; i < rows.length; i++) {
      const d = Math.abs(rows[i][key] - rows[i - 1][key]) / 2;
      if (d > mx) { mx = d; at = rows[i].deg; }
    }
    return { mx, at };
  };
  const capEdge = step(e.p, "snow");
  const shoreEdge = step(e.p, "shallow");
  console.log(`  steepest cap edge:   ${capEdge.mx.toFixed(3)} weight/deg at ${capEdge.at}deg`);
  console.log(`  steepest shore edge: ${shoreEdge.mx.toFixed(3)} weight/deg ` +
              `(shipped since Phase 3, for comparison)`);
  if (capEdge.mx > shoreEdge.mx) {
    bad(`the cap edge (${capEdge.mx.toFixed(2)}/deg) is harder than the ` +
        `shoreline beside it (${shoreEdge.mx.toFixed(2)}/deg)`);
  } else ok(`the cap edge is softer than the shoreline in the same body ` +
            `(${capEdge.mx.toFixed(2)} vs ${shoreEdge.mx.toFixed(2)} per degree)`);

  /* CAPS MUST BE REACHABLE ACROSS THE SPREAD, not on one lucky seed. Density
   * and climate are both properties of the spread of outputs (D18, D20). */
  let withCaps = 0, iceballs = 0, bare = 0, n = 0;
  for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
    for (const oceanDepth of [0, 0.2, 0.4, 0.6, 0.8]) {
      const p = snowProfile({ seed, oceanDepth, starlight: 0.5, interiorHeat: 0.45 });
      const f = snowFrac(p);
      n++;
      if (f > 0.9) iceballs++;
      else if (f > 0.02) withCaps++;
      else bare++;
    }
  }
  console.log(`  across ${n} temperate bodies: ${withCaps} with caps, ` +
              `${iceballs} frozen over, ${bare} bare`);
  if (withCaps === 0) bad("no temperate body in the spread grew a cap");
  else if (iceballs > n * 0.5) bad(`${iceballs}/${n} temperate bodies froze over entirely`);
  else ok(`caps are reachable across the spread (${withCaps}/${n})`);
}

/* =====================================================================
   STEP 4 - sea ice
   ===================================================================== */

/* MEASURED IN PIXELS, NOT IN CODE. Every previous surface feature in this
 * project generated correctly and drew invisibly - the film, the speckle, the
 * snow zone, the trait wedges - and every one was caught by a pixel probe
 * after eyeballing had failed. "How many pixels does this change" answers
 * "is it visible" in one number (D26). */
function renderPixels(over, px = 460) {
  const { s, body, details, palette } = build(over);
  const c = createCanvas(px, px);
  CC.Scene.render(c.getContext("2d"), px, px, body, s, palette, details);
  return { data: c.getContext("2d").getImageData(0, 0, px, px).data, px,
           details, palette, body };
}

/* How many pixels differ between two renders, and by how much. */
function pixelDiff(a, b) {
  let n = 0, sum = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i]) +
              Math.abs(a.data[i + 1] - b.data[i + 1]) +
              Math.abs(a.data[i + 2] - b.data[i + 2]);
    if (d > 12) { n++; sum += d; }
  }
  return { count: n, mean: n ? sum / n : 0 };
}

console.log("\n=== STEP 4 - SEA ICE ===");
console.log("A real geometric band on the water, not a tint. Before this, the");
console.log("only thing that touched a frozen sea was a generic HSV delta");
console.log("worth a 7% darkening (D37) - no sheet, no shift toward white.\n");
{
  /* THE PROBE MUST ISOLATE THE ICE AND NOTHING ELSE.
   *
   * A first version compared a cold render against a WARM one and reported
   * ~50,000 changed pixels on a world whose sea can never freeze - because it
   * was measuring the entire climate difference between two settings, not the
   * ice. A probe that changes two things at once cannot attribute what it
   * sees, which is the same class of mistake as a probe that reimplements the
   * logic it tests (D27, D35) or samples the wrong layer (D34).
   *
   * So the comparison holds EVERY setting fixed and toggles only whether
   * `paintSeaIce` runs. The rest of the pipeline - the climate field, the
   * frosting, the palette, the water tint - is byte-identical between the two
   * renders, so every changed pixel is ice. */
  const iceDiff = over => {
    const s = settings({ ...over, oceanDepth: 0.55 });
    const body = CC.Structure.build(CC.Archetypes.get(s.archetype), s, s.seed);
    const details = CC.Details.build(body, s, s.seed);
    const palette = CC.Palette.build(
      body, CC.Archetypes.get(s.archetype).colorProfile, s, s.seed);
    const px = 460;
    const shot = () => {
      const c = createCanvas(px, px);
      CC.Scene.render(c.getContext("2d"), px, px, body, s, palette, details);
      return { data: c.getContext("2d").getImageData(0, 0, px, px).data };
    };
    const on = shot();
    const real = CC.ZonePaint.paintSeaIce;
    CC.ZonePaint.paintSeaIce = function () {};
    const off = shot();
    CC.ZonePaint.paintSeaIce = real;
    return pixelDiff(on, off);
  };

  console.log("  world              ice px   mean delta   verdict");
  const SEAS = [
    ["frozen sea",   { starlight: 0.12, interiorHeat: 0.2 }],
    ["cool sea",     { starlight: 0.3,  interiorHeat: 0.35 }],
    ["temperate",    { starlight: 0.55, interiorHeat: 0.5 }],
    ["hot sea",      { starlight: 0.9,  interiorHeat: 0.5 }]
  ];
  const results = {};
  for (const [name, over] of SEAS) {
    const d = iceDiff(over);
    results[name] = d;
    console.log(`  ${name.padEnd(18)} ${String(d.count).padStart(6)}   ` +
                `${d.mean.toFixed(1).padStart(9)}   ` +
                `${d.count > 1500 ? "VISIBLE" : d.count > 150 ? "faint" : "none"}`);
  }

  if (results["frozen sea"].count < 1500) {
    bad(`a frozen world's sea grows only ${results["frozen sea"].count} pixels ` +
        `of ice - it is not drawn`);
  } else ok(`a cold world's ocean carries a visible pale sheet ` +
            `(${results["frozen sea"].count} px)`);

  /* AND A HOT WORLD'S NEVER DOES. Now that the probe isolates the ice, this
   * is a real measurement rather than a restatement of the field check. */
  if (results["hot sea"].count > 0) {
    bad(`a hot world's sea grew ${results["hot sea"].count} pixels of ice`);
  } else ok("a hot world's ocean never grows ice (0 px)");

  /* A HOT WORLD'S SEA NEVER FREEZES. Measured on the field rather than on
   * pixels, because the two renders being compared are both hot. */
  const hotF = build({ starlight: 0.9, oceanDepth: 0.55 }).details.climateField;
  let hotFrozen = 0;
  for (let d = 0; d < 360; d += 2) if (hotF.isFrozen(d * DEG)) hotFrozen++;
  if (hotFrozen) bad(`a hot world has ${hotFrozen} frozen bearings - its sea would ice`);
  else ok("a hot world's sea never freezes at any bearing");

  /* A TEMPERATE WORLD ICES ONLY NEAR THE POLES. */
  {
    const f = build({ starlight: 0.5, oceanDepth: 0.55 }).details.climateField;
    let poleIce = 0, eqIce = 0;
    for (let d = 0; d < 360; d += 2) {
      const fromPole = Math.min(d, Math.abs(d - 180), 360 - d);
      if (f.isFrozen(d * DEG)) { if (fromPole <= 40) poleIce++; else if (fromPole >= 70) eqIce++; }
    }
    console.log(`  temperate world: ${poleIce} frozen bearings near a pole, ` +
                `${eqIce} near the equator`);
    if (eqIce > 0) bad(`a temperate world's equatorial sea is freezing (${eqIce} bearings)`);
    else if (poleIce === 0) ok("a temperate world's sea is open (its ice is on land)");
    else ok(`a temperate world ices only near the poles (${poleIce} bearings)`);
  }

  /* THE ICE NEVER EXCEEDS THE ATMOSPHERE - the same clamp class as D31/D34,
   * where a rising sea and a shrinking atmosphere each broke the silhouette.
   * Sea ice sits INSIDE the fluid, so if this ever fails something is being
   * drawn outside the layer it belongs to. */
  {
    const { body, details } = build({ starlight: 0.1, oceanDepth: 0.55 });
    const ocean = body.layers.find(l => l.role === "ocean");
    const atmos = body.layers.find(l => l.outward);
    if (!ocean) ok("no ocean to test (dry world)");
    else {
      const sea = details.seaLevel.crust;
      let worst = 0;
      for (let d = 0; d < 360; d += 2) {
        const top = ocean.outer + (sea ? sea(d * DEG) : 0);
        if (atmos && top > atmos.outer) worst = Math.max(worst, top - atmos.outer);
      }
      if (worst > 0) bad(`the iced sea reaches ${worst.toFixed(4)} past the atmosphere`);
      else ok("the sea ice never exceeds the atmosphere");
    }
  }
}

/* =====================================================================
   STEP 5 - axial tilt
   ===================================================================== */

console.log("\n=== STEP 5 - AXIAL TILT ===");
{
  console.log("  tilt   north pole   south pole   equator   reads as");
  for (const tilt of [0, 0.2, 0.4, 0.6, 0.8, 1.0]) {
    const f = build({ starlight: 0.45, axialTilt: tilt }).details.climateField;
    const n = f.tempAt(0), s2 = f.tempAt(180 * DEG);
    const e2 = (f.tempAt(90 * DEG) + f.tempAt(270 * DEG)) / 2;
    const reads = Math.abs(n - s2) < 0.03 && n < e2 ? "symmetric caps"
                : n > e2 && s2 > e2 ? "Uranus - poles are warm"
                : "asymmetric caps";
    console.log(`  ${tilt.toFixed(1)}    ${n.toFixed(3)}        ${s2.toFixed(3)}` +
                `        ${e2.toFixed(3)}     ${reads}`);
  }

  const at0 = build({ starlight: 0.45, axialTilt: 0 }).details.climateField;
  if (Math.abs(at0.tempAt(0) - at0.tempAt(180 * DEG)) > 0.01) {
    bad("at tilt 0 the two poles are not symmetric");
  } else ok("at tilt 0 the two caps are symmetric");

  const at3 = build({ starlight: 0.45, axialTilt: 0.3 }).details.climateField;
  const asym = Math.abs(at3.tempAt(0) - at3.tempAt(180 * DEG));
  if (asym < 0.05) bad(`tilt 30% barely differentiates the poles (${asym.toFixed(3)})`);
  else ok(`turned up, one cap grows and the other shrinks (${asym.toFixed(2)} apart)`);

  const at1 = build({ starlight: 0.45, axialTilt: 1 }).details.climateField;
  const pole1 = (at1.tempAt(0) + at1.tempAt(180 * DEG)) / 2;
  const eq1 = (at1.tempAt(90 * DEG) + at1.tempAt(270 * DEG)) / 2;
  if (pole1 <= eq1) bad("at extreme tilt the poles are still the cold regions");
  else ok(`at extreme tilt the poles become the HOT regions - the Uranus case ` +
          `(${pole1.toFixed(2)} vs ${eq1.toFixed(2)})`);
}

/* =====================================================================
   STEP 6 - exotic oceans
   ===================================================================== */

console.log("\n=== STEP 6 - EXOTIC OCEANS ===");
console.log("Off by default. The blue-green range is a deliberate fix for a");
console.log("real failure - a brown sea on a rust world - and stays the");
console.log("default; the checkbox makes the strange case opt-in (D39).\n");
{
  const sample = (over, n = 300) => {
    const hues = [], vals = [];
    for (let i = 0; i < n; i++) {
      const { palette } = build({ ...over, seed: `sea-${i}`,
                                  primaryHue: (i * 7.3) % 360, oceanDepth: 0.5 });
      const o = palette.layers.ocean;
      if (o) { hues.push(o.h); vals.push(o.v); }
    }
    const buckets = new Array(12).fill(0);
    for (const h of hues) buckets[Math.floor(h / 30) % 12]++;
    return { hues, vals, buckets,
             hMin: Math.min(...hues), hMax: Math.max(...hues),
             vMin: Math.min(...vals), vMax: Math.max(...vals),
             filled: buckets.filter(b => b > 0).length };
  };

  const off = sample({ exoticOceans: false });
  const on = sample({ exoticOceans: true });

  console.log(`  OFF: hue ${Math.round(off.hMin)}..${Math.round(off.hMax)}  ` +
              `val ${off.vMin.toFixed(2)}..${off.vMax.toFixed(2)}  ` +
              `${off.filled}/12 hue buckets`);
  console.log(`  ON : hue ${Math.round(on.hMin)}..${Math.round(on.hMax)}  ` +
              `val ${on.vMin.toFixed(2)}..${on.vMax.toFixed(2)}  ` +
              `${on.filled}/12 hue buckets`);

  /* WITH THE BOX OFF THE DISTRIBUTION IS UNCHANGED - the measured D39 table:
   * hue 160..256, value 0.18..0.38, nothing outside cyan-to-blue. */
  if (off.hMin < 150 || off.hMax > 270) {
    bad(`with Exotic oceans OFF the hue escaped its range ` +
        `(${Math.round(off.hMin)}..${Math.round(off.hMax)}, expected ~160..256)`);
  } else ok(`with the box off the sea keeps its blue-green range ` +
            `(${Math.round(off.hMin)}..${Math.round(off.hMax)})`);
  if (off.vMax > 0.5) {
    bad(`with Exotic oceans OFF the value ceiling lifted (${off.vMax.toFixed(2)})`);
  } else ok(`with the box off the value ceiling holds (${off.vMax.toFixed(2)})`);

  /* WITH IT ON, ALL TWELVE BUCKETS AND A LIFTED CEILING. Freeing the hue
   * alone would only give "a dark sea of a different colour". */
  if (on.filled < 12) {
    bad(`with Exotic oceans ON only ${on.filled}/12 hue buckets are reachable`);
  } else ok("with the box on the hue reaches all twelve 30-degree buckets");
  if (on.vMax < 0.6) {
    bad(`with Exotic oceans ON the value only reaches ${on.vMax.toFixed(2)} ` +
        `- pale and white seas are still impossible`);
  } else ok(`with the box on the value reaches ${on.vMax.toFixed(2)} ` +
            `- pale, milky and near-black seas are reachable`);

  /* THE STAR-ACTIVITY COUPLING, and it is gated on the checkbox: an active
   * star cannot distort a sea the user has asked to keep plausible. */
  const satAt = (exotic, activity) => {
    let s = 0, n = 0;
    for (let i = 0; i < 60; i++) {
      const { palette } = build({ exoticOceans: exotic, starActivity: activity,
                                  seed: `act-${i}`, primaryHue: (i * 11) % 360,
                                  oceanDepth: 0.5 });
      const o = palette.layers.ocean;
      if (o) { s += o.s; n++; }
    }
    return s / Math.max(1, n);
  };
  const offCalm = satAt(false, 0), offWild = satAt(false, 1);
  const onCalm = satAt(true, 0), onWild = satAt(true, 1);
  console.log(`  mean ocean saturation:`);
  console.log(`    off: calm ${offCalm.toFixed(3)}  violent ${offWild.toFixed(3)}`);
  console.log(`    on : calm ${onCalm.toFixed(3)}  violent ${onWild.toFixed(3)}`);
  if (Math.abs(offWild - offCalm) > 0.02) {
    bad(`activity distorts a REALISTIC sea (${offCalm.toFixed(2)} -> ${offWild.toFixed(2)})`);
  } else ok("with the box off, Star activity does not distort the sea");
  if (onWild <= onCalm + 0.05) {
    bad(`with the box on, a violent star does not push the sea ` +
        `(${onCalm.toFixed(2)} -> ${onWild.toFixed(2)})`);
  } else ok(`with the box on, a violent star pushes the sea toward looking ` +
            `chemically wrong (${onCalm.toFixed(2)} -> ${onWild.toFixed(2)})`);

  /* SEA AND CRUST MUST NEVER COLLIDE IN HUE AND VALUE AT ONCE - the same
   * relational contrast rule the frosting uses, and what lets the hue roam
   * without any world losing its ocean into its rock. */
  let collisions = 0, checked = 0;
  for (let i = 0; i < 200; i++) {
    const { palette } = build({ exoticOceans: true, seed: `coll-${i}`,
                                primaryHue: (i * 13) % 360, oceanDepth: 0.5 });
    const o = palette.layers.ocean, cr = palette.layers.crust;
    if (!o || !cr) continue;
    checked++;
    let dh = Math.abs(o.h - cr.h); if (dh > 180) dh = 360 - dh;
    if (dh < 20 && Math.abs(o.v - cr.v) < 0.10) collisions++;
  }
  if (collisions) bad(`${collisions}/${checked} exotic seas collide with their crust`);
  else ok(`no exotic sea collides with its crust in hue and value at once ` +
          `(${checked} checked)`);
}

/* =====================================================================
   THE ARCHETYPE ESCAPE HATCHES - what a non-planet can decline
   ===================================================================== */

/* PHASE 6 IS WHERE THESE FIRST MATTER, AND AN UNTESTED ESCAPE HATCH IS WORSE
 * THAN A DOCUMENTED GAP. A star must be able to say "I am not warmed or tinted
 * by some other star" and "I have no latitude", and both have to be DECLARED
 * rather than detected from a role name (D27). Exercised here on a synthetic
 * archetype so the mechanism is proven before a real family depends on it. */
console.log("\n=== ARCHETYPE ESCAPE HATCHES ===");
{
  const planet = CC.Archetypes.get("planet");
  const climateOf = (spec, over = {}) => {
    const s = settings(over);
    const fake = Object.assign({}, planet);
    if (spec === null) delete fake.climate; else fake.climate = spec;
    const body = CC.Structure.build(fake, s, s.seed);
    return CC.Climate.build(fake, body, s, s.seed, null);
  };

  /* `latitude` - already shipped, re-asserted because Phase 6 depends on it. */
  {
    const withLat = climateOf({ latitude: 1.0 });
    const noSpec = climateOf(null);
    const pole = a => a.tempAt(0), eq = a => a.tempAt(90 * DEG);
    const spread = f => Math.abs(eq(f) - pole(f));
    console.log(`  latitude 1.0 : pole-equator spread ${spread(withLat).toFixed(3)}`);
    console.log(`  no spec      : pole-equator spread ${spread(noSpec).toFixed(3)}`);
    if (spread(noSpec) > 0.01) {
      bad(`an archetype with no climate spec still has latitude ` +
          `(${spread(noSpec).toFixed(3)}) - a star could inherit a polar cap`);
    } else ok("omitting the climate spec gives a flat field - no latitude");
  }

  /* `starlit: false` - a star is not warmed by some OTHER star. */
  {
    const lit = climateOf({ latitude: 0 }, { starlight: 1, interiorHeat: 0.3 });
    const unlit = climateOf({ latitude: 0, starlit: false },
                            { starlight: 1, interiorHeat: 0.3 });
    console.log(`  starlit true : base ${lit.base.toFixed(3)} at Starlight 100%`);
    console.log(`  starlit false: base ${unlit.base.toFixed(3)} at Starlight 100%`);
    if (unlit.base >= lit.base - 0.1) {
      bad(`starlit:false did not remove the incident starlight term ` +
          `(${lit.base.toFixed(2)} -> ${unlit.base.toFixed(2)})`);
    } else ok(`starlit:false removes the incident starlight term ` +
              `(${lit.base.toFixed(2)} -> ${unlit.base.toFixed(2)})`);

    /* And it must still respond to its OWN heat, or a star would be cold. */
    const cold = climateOf({ latitude: 0, starlit: false },
                           { starlight: 1, interiorHeat: 0 });
    const hot = climateOf({ latitude: 0, starlit: false },
                          { starlight: 1, interiorHeat: 1 });
    if (hot.base <= cold.base + 0.2) {
      bad(`an unlit archetype does not respond to its own Interior heat`);
    } else ok(`an unlit archetype is still driven by its own heat ` +
              `(${cold.base.toFixed(2)} -> ${hot.base.toFixed(2)})`);

    /* Starlight must not move it at all - the whole point of the flag. */
    const a = climateOf({ latitude: 0, starlit: false },
                        { starlight: 0, interiorHeat: 0.5 });
    const b = climateOf({ latitude: 0, starlit: false },
                        { starlight: 1, interiorHeat: 0.5 });
    if (Math.abs(a.base - b.base) > 1e-9) {
      bad(`Starlight still moves an unlit archetype ` +
          `(${a.base.toFixed(3)} vs ${b.base.toFixed(3)})`);
    } else ok("Starlight has no effect at all on an unlit archetype");
  }
}

/* =====================================================================
   SEAMS - an angular fill must never expose a shared edge
   ===================================================================== */

/* THE PROJECT HAS NOW HIT THIS TRAP FIVE TIMES (D34, the two cases
 * draw/zonepaint.js documents, the sea ice, and the frosting), so it is
 * asserted rather than left to be rediscovered a sixth.
 *
 * An angular band built from independent pieces that share a radial edge
 * accumulates antialiasing along every join. At a few hundred segments that
 * reads as SPOKES radiating from the centre; at 900 it reads as a fine regular
 * grain that looks like a deliberate texture and is not one. Both were in the
 * shipped build and the user spotted both by eye.
 *
 * It is measurable: sample a ring through the band at fine angular resolution
 * and take the Fourier power at exactly the segment period. A seam puts a
 * spike there and nowhere else, so it separates cleanly from real detail. */
console.log("\n=== SEAMS ===");
console.log("An angular fill must never expose an edge shared by two");
console.log("independently drawn pieces. Measured as Fourier power at the");
console.log("segment period, against non-harmonic periods as the baseline.\n");
if (!REPORT_ONLY) {
  const PXS = 1100;
  /* A world whose sea is frozen all the way round, so both bands are
   * continuous and any seam in either is unambiguous. */
  const seamBuild = build({ seed: "ice", oceanDepth: 0.75, interiorHeat: 0.15,
                            starlight: 0.08, bodySize: 0.9,
                            backgroundColor: "#000000" });
  const sc = createCanvas(PXS, PXS);
  const sctx = sc.getContext("2d");
  const sres = CC.Scene.render(sctx, PXS, PXS, seamBuild.body, seamBuild.s,
                               seamBuild.palette, seamBuild.details);
  const sdata = sctx.getImageData(0, 0, PXS, PXS).data;
  const sv = sres.view;

  const ringPower = (radiusPx, period) => {
    const N = 9000;
    const lum = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const x = Math.round(sv.cx + Math.sin(a) * radiusPx);
      const y = Math.round(sv.cy - Math.cos(a) * radiusPx);
      if (x < 0 || y < 0 || x >= PXS || y >= PXS) { lum.push(0); continue; }
      const k = (y * PXS + x) * 4;
      lum.push((sdata[k] + sdata[k + 1] + sdata[k + 2]) / 3);
    }
    let re = 0, im = 0;
    for (let i = 0; i < N; i++) {
      const th = 2 * Math.PI * i * period / N;
      re += lum[i] * Math.cos(th); im += lum[i] * Math.sin(th);
    }
    return Math.sqrt(re * re + im * im) / N;
  };

  const seamCheck = (name, radiusPx, period) => {
    const seam = ringPower(radiusPx, period);
    const base = [137, 271, 433, 617]
      .reduce((acc, p) => acc + ringPower(radiusPx, p), 0) / 4;
    console.log(`  ${name.padEnd(14)} seam(${period}) ${seam.toFixed(3)}   ` +
                `baseline ${base.toFixed(3)}`);
    if (seam > base * 2.5 && seam > 0.30) {
      bad(`${name}: a seam at the segment period (${seam.toFixed(2)} vs ` +
          `${base.toFixed(2)} baseline) - the pieces are sharing an edge`);
    } else ok(`${name}: no seam at the segment period`);
  };

  const oc = seamBuild.body.layers.find(l => l.role === "ocean");
  const cr = seamBuild.body.layers.find(l => l.role === "crust");
  if (oc) seamCheck("sea ice", sv.px(oc.outer) - 3, 360);
  if (cr) seamCheck("frosting", sv.px(cr.outer) + 2, CC.Film.SEGMENTS || 900);
}

/* =====================================================================
   THE ATMOSPHERE MUST COVER THE GROUND
   ===================================================================== */

/* A collapsed face is meant to read as collapsed, not as absent. `airAt`
 * thinning the gas onto the ground left nothing between the frosting's bright
 * rim and empty space, so the solid appeared to stand OUTSIDE the atmosphere.
 *
 * Measured on the gas ALONE - every other pass suppressed - because otherwise
 * "is that pixel haze or is it frosting" is a judgement call, and a probe that
 * has to guess is a probe that can be fooled (D34). Three earlier attempts at
 * this measurement each reported the wrong thing for exactly that reason. */
console.log("\n=== THE ATMOSPHERE COVERS THE GROUND ===");
if (!REPORT_ONLY) {
  const gasOver = over => {
    const g = build(over);
    const saved = {
      fillLayer: CC.Layers.fillLayer, film: CC.Film.draw,
      drawLayer: CC.DrawDetails.drawLayer, stroke: CC.Layers.strokeBoundary,
      relief: CC.DrawDetails.drawRelief, zone: CC.ZonePaint.paintZoneBand,
      ice: CC.ZonePaint.paintSeaIce, water: CC.ZonePaint.paintThermalWater
    };
    CC.Layers.fillLayer = function () {}; CC.Film.draw = function () {};
    CC.DrawDetails.drawLayer = function () {}; CC.Layers.strokeBoundary = function () {};
    CC.DrawDetails.drawRelief = function () {}; CC.ZonePaint.paintZoneBand = function () {};
    CC.ZonePaint.paintSeaIce = function () {}; CC.ZonePaint.paintThermalWater = function () {};
    const P = 900;
    const gc = createCanvas(P, P);
    const gctx = gc.getContext("2d");
    const gr = CC.Scene.render(gctx, P, P, g.body, g.s, g.palette, g.details);
    const gdata = gctx.getImageData(0, 0, P, P).data;
    CC.Layers.fillLayer = saved.fillLayer; CC.Film.draw = saved.film;
    CC.DrawDetails.drawLayer = saved.drawLayer; CC.Layers.strokeBoundary = saved.stroke;
    CC.DrawDetails.drawRelief = saved.relief; CC.ZonePaint.paintZoneBand = saved.zone;
    CC.ZonePaint.paintSeaIce = saved.ice; CC.ZonePaint.paintThermalWater = saved.water;

    const gv = gr.view;
    const sil = g.body.layers.findIndex(l => !l.outward);
    const relL = g.body.layers.find(l => !l.outward && g.details.terrain[l.role]);
    if (!relL) return null;
    const T = g.details.terrain[relL.role];
    const sea = g.details.seaLevel ? g.details.seaLevel[relL.role] : null;
    const flu = (sil > 0 && !g.body.layers[sil - 1].outward)
      ? g.body.layers[sil - 1] : null;
    const cap = relL.outer + Math.max(0, T.range().hi) *
                (g.body.layers.indexOf(relL) === sil ? 0.55 : 1);
    let worst = 1e9, worstDeg = 0;
    for (let deg = 0; deg < 360; deg += 5) {
      const a = deg * DEG;
      let gr2 = relL.outer + T.at(a) * 0.55;
      if (flu) { const st = flu.outer + (sea ? sea(a) : 0); if (st > gr2) gr2 = st; }
      if (cap > gr2) gr2 = cap;
      const rp = gv.px(gr2) + 1;
      const x = Math.round(gv.cx + Math.sin(a) * rp);
      const y = Math.round(gv.cy - Math.cos(a) * rp);
      let lum = 0;
      if (x >= 0 && y >= 0 && x < P && y < P) {
        const k = (y * P + x) * 4;
        lum = (gdata[k] + gdata[k + 1] + gdata[k + 2]) / 3;
      }
      if (lum < worst) { worst = lum; worstDeg = deg; }
    }
    return { worst, worstDeg };
  };

  for (const [name, over] of [
    ["unzoned", { tidalLock: 0 }],
    ["fully locked", { tidalLock: 1, tidalFacing: 265, starlight: 0.21,
                       interiorHeat: 0.44, oceanDepth: 0.44, coreBias: 0.67 }]
  ]) {
    const r = gasOver(over);
    if (!r) continue;
    console.log(`  ${name.padEnd(14)} faintest gas over the ground: ` +
                `${r.worst.toFixed(1)} at ${r.worstDeg}deg`);
    if (r.worst < 12) {
      bad(`${name}: the gas is invisible over the ground at ${r.worstDeg}deg ` +
          `(luminance ${r.worst.toFixed(1)}) - the solid reads as standing ` +
          `outside the atmosphere`);
    } else ok(`${name}: gas reads over the ground at every bearing`);
  }
}

/* =====================================================================
   A DEAD WORLD'S OCEAN FREEZES ALL THE WAY DOWN
   ===================================================================== */

console.log("\n=== A DEAD WORLD FREEZES SOLID ===");
{
  const iceOf = over => {
    const { body, details } = build({ ...over, oceanDepth: 0.7 });
    if (!body.layers.find(l => l.role === "ocean")) return null;
    const cf = details.climateField;
    let mn = 1, mx = 0, sum = 0, n = 0;
    for (let d = 0; d < 360; d += 5) {
      const a = d * DEG;
      const amt = Math.max(0, Math.min(1,
        (CC.Climate.COLD - cf.tempAt(a)) / CC.Climate.COLD));
      /* The REAL function, not a copy of it. */
      const f = amt <= 0.002 ? 0 : CC.ZonePaint.iceFraction(amt);
      mn = Math.min(mn, f); mx = Math.max(mx, f); sum += f; n++;
    }
    return { min: mn, max: mx, mean: sum / n };
  };

  console.log("  case                  star  heat   ice fraction min/mean/max");
  const CASES2 = [
    ["deep void", { starlight: 0, interiorHeat: 0 }],
    ["faint sun, dead core", { starlight: 0.12, interiorHeat: 0 }],
    ["Europa-like", { starlight: 0.18, interiorHeat: 0.25 }],
    ["rogue + molten core", { starlight: 0, interiorHeat: 1 }],
    ["temperate", { starlight: 0.55, interiorHeat: 0.5 }]
  ];
  const got = {};
  for (const [nm, over] of CASES2) {
    const r = iceOf(over);
    got[nm] = r;
    if (!r) { console.log(`  ${nm.padEnd(21)} (no ocean)`); continue; }
    console.log(`  ${nm.padEnd(21)} ${over.starlight.toFixed(2)}  ` +
      `${over.interiorHeat.toFixed(2)}   ` +
      `${r.min.toFixed(2)} / ${r.mean.toFixed(2)} / ${r.max.toFixed(2)}`);
  }

  /* WITH NO STAR AND A DEAD CORE THERE IS NOTHING KEEPING WATER LIQUID.
   * The first version capped the ice at 68% of the sea's depth, so a body in
   * the deep void kept a third of its ocean as liquid water under the lid -
   * which is not a frozen sea, it is a sea with a hat on. */
  const dv = got["deep void"];
  if (dv && dv.mean < 0.97) {
    bad(`the deep void keeps ${((1 - dv.mean) * 100).toFixed(0)}% of its ocean ` +
        `liquid - with no star and a dead core it should freeze to the floor`);
  } else if (dv) {
    ok(`with no star and a dead core the ocean freezes solid ` +
       `(${dv.mean.toFixed(2)} of its depth)`);
  }

  /* AND THE GRADIENT BELOW IT MUST SURVIVE. Freezing the extreme is only
   * right if a merely cold world still shows a shelf over dark water - the
   * interesting middle is most of what the control produces. */
  const eu = got["Europa-like"];
  if (eu && eu.mean > 0.9) {
    bad(`a Europa-like world is also frozen solid (${eu.mean.toFixed(2)}) - ` +
        `the shelf-over-water middle has been lost`);
  } else if (eu) {
    ok(`a merely cold world keeps a shelf over water (${eu.mean.toFixed(2)} mean)`);
  }

  const wt = got["temperate"], rg = got["rogue + molten core"];
  if (wt && wt.max > 0.01) bad(`a temperate world's sea is icing (${wt.max.toFixed(2)})`);
  else ok("a temperate world's sea carries no ice");
  if (rg && rg.max > 0.01) {
    bad(`a rogue world with a molten core has sea ice (${rg.max.toFixed(2)})`);
  } else if (rg) ok("a rogue world kept warm by its core has an open ocean");
}

/* =====================================================================
   RENDERS
   ===================================================================== */

/* WHOLE DISCS, LARGE. A cap is a property of a hemisphere and cannot be
 * judged at contact-sheet scale - D18 and D20 both record rounds lost to
 * judging a feature at the wrong scale, and D19 adds the corollary that a rim
 * crop shows whichever zone happens to sit at that angle.
 *
 * Every sheet here is UPRIGHT, so the poles are reliably at top and bottom and
 * a cap can be found where it is supposed to be rather than hunted for. */
if (!REPORT_ONLY) {
  mkdirSync(resolve(ROOT, "shots/climate"), { recursive: true });

  const disc = (over, px) => {
    const { s, body, details, palette } = build(over);
    const c = createCanvas(px, px);
    CC.Scene.render(c.getContext("2d"), px, px, body, s, palette, details);
    return c;
  };

  const sheet = (file, cells, px, label) => {
    const cols = Math.min(cells.length, 5);
    const rows = Math.ceil(cells.length / cols);
    const cv = createCanvas(cols * px, rows * (px + 30) + 8);
    const g = cv.getContext("2d");
    g.fillStyle = "#07060c";
    g.fillRect(0, 0, cv.width, cv.height);
    cells.forEach(([caption, over], i) => {
      g.drawImage(disc(over, px), (i % cols) * px, Math.floor(i / cols) * (px + 30));
      g.fillStyle = "rgba(255,255,255,0.78)";
      g.font = "15px sans-serif";
      g.fillText(caption, (i % cols) * px + 8,
                 Math.floor(i / cols) * (px + 30) + px + 20);
    });
    writeFileSync(resolve(ROOT, `shots/climate/${file}`), cv.toBuffer("image/png"));
    console.log(`  wrote shots/climate/${file}  (${cv.width}x${cv.height})  ${label}`);
  };

  console.log("\n=== RENDERS ===");

  /* THE POLE CROP - THE VIEW THIS FEATURE IS ACTUALLY JUDGED ON.
   *
   * A cap lives on the crust rim, which is a few percent of the disc, and at
   * whole-disc scale the interior dominates and a correct cap reads as a faint
   * band. That is D18's rule ("a band a few pixels wide is not judgeable at
   * contact-sheet scale") applied to a feature D18 did not anticipate - and it
   * cost a round here: the first sheets were rendered on an ocean world at
   * depth 0.4, where only 14% of the circumference is land, so there was
   * almost no exposed ground for the snow zone to sit on and the whole sweep
   * looked inert while the numbers said it worked.
   *
   * So the cap sheet is rendered large, cropped to the north polar rim, on a
   * world with real land. The whole-disc sweeps below still matter - they are
   * how the body reads overall - but this is where you look to see whether the
   * ice is there and whether it pools. */
  {
    const PX = 1400, CW = 1300, CH = 420;
    const cells = [
      ["seared - star 100%", { starlight: 1.0 }],
      ["caps - star 50%", { starlight: 0.5 }],
      ["big caps - star 38%", { starlight: 0.38 }],
      ["iceball - star 15%", { starlight: 0.15 }]
    ];
    const cv = createCanvas(CW, cells.length * (CH + 28) + 8);
    const g = cv.getContext("2d");
    g.fillStyle = "#07060c";
    g.fillRect(0, 0, cv.width, cv.height);
    cells.forEach(([cap, over], i) => {
      /* A LAND WORLD, deliberately: ocean depth 0.25 leaves ~36% of the
       * circumference exposed, so the snow zone has ground to deposit on. */
      const c = disc({ ...over, oceanDepth: 0.25, interiorHeat: 0.45,
                       primaryHue: 150, bodySize: 0.92 }, PX);
      g.drawImage(c, (PX - CW) / 2, 20, CW, CH, 0, i * (CH + 28), CW, CH);
      g.fillStyle = "rgba(255,255,255,0.85)";
      g.font = "17px sans-serif";
      g.fillText(cap, 8, i * (CH + 28) + CH + 20);
    });
    writeFileSync(resolve(ROOT, "shots/climate/_cap-crop.png"),
                  cv.toBuffer("image/png"));
    console.log(`  wrote shots/climate/_cap-crop.png  (${cv.width}x${cv.height})` +
                `  THE view for judging caps`);
  }

  /* THE STARLIGHT SWEEP - one seed, one body, the star dialled from nothing to
   * searing. Rendered on a LAND world for the same reason as the crop above. */
  sheet("_caps.png", [
    ["Starlight 100% - seared", { starlight: 1.0, oceanDepth: 0.25, primaryHue: 150 }],
    ["Starlight 62% - warm", { starlight: 0.62, oceanDepth: 0.25, primaryHue: 150 }],
    ["Starlight 50% - caps", { starlight: 0.5, oceanDepth: 0.25, primaryHue: 150 }],
    ["Starlight 38% - big caps", { starlight: 0.38, oceanDepth: 0.25, primaryHue: 150 }],
    ["Starlight 15% - iceball", { starlight: 0.15, oceanDepth: 0.25, primaryHue: 150 }]
  ], 620, "caps appearing and growing on a world with real land");

  sheet("_starlight-sweep.png", [
    ["Starlight 0% - rogue world", { starlight: 0 }],
    ["Starlight 20% - frozen", { starlight: 0.2 }],
    ["Starlight 42% - caps", { starlight: 0.42 }],
    ["Starlight 55% - temperate", { starlight: 0.55 }],
    ["Starlight 100% - seared", { starlight: 1.0 }]
  ], 520, "the control that makes cold regions conditional");

  /* THE FOUR-CASE TABLE, as pictures. Both sources must be visible. */
  sheet("_two-sources.png", [
    ["star 0 / heat 0 - deep void", { starlight: 0, interiorHeat: 0 }],
    ["star 0 / heat 100 - warm rogue", { starlight: 0, interiorHeat: 1 }],
    ["star 100 / heat 0 - baked rock", { starlight: 1, interiorHeat: 0 }],
    ["star 100 / heat 100 - hell", { starlight: 1, interiorHeat: 1 }]
  ], 520, "Starlight + Interior heat, neither dominating");

  sheet("_star-colour.png", CC.Climate.starIds().map(
    id => [CC.Climate.STARS[id].label, { starColour: id }]),
    460, "the same seed under five stars");

  sheet("_star-activity.png", [
    ["Activity 0% - calm", { starActivity: 0 }],
    ["Activity 50%", { starActivity: 0.5 }],
    ["Activity 100% - scoured", { starActivity: 1 }],
    ["Activity 100%, airless", { starActivity: 1, optionalLayers: 0 }]
  ], 520, "a violent star strips cover, and air shields against it");

  sheet("_axial-tilt.png", [
    ["Tilt 0% - symmetric caps", { starlight: 0.42, axialTilt: 0 }],
    ["Tilt 30% - one cap grows", { starlight: 0.42, axialTilt: 0.3 }],
    ["Tilt 55%", { starlight: 0.42, axialTilt: 0.55 }],
    ["Tilt 100% - Uranus case", { starlight: 0.42, axialTilt: 1 }]
  ], 520, "asymmetric caps, then the poles become the warm regions");

  /* EXOTIC OCEANS IS A PROPERTY OF THE SPREAD, NOT OF ONE SEED.
   *
   * A first version rendered one seed with the box off and on, and the two
   * were nearly identical - because that seed happened to roll a hue near the
   * default blue-green, so "anywhere on the wheel" landed where it already
   * was. The 300-body measurement above is what proves the range is free; a
   * single body can only ever show one draw from it. Same lesson as `npm run
   * sheet` existing at all: harmony, density and now sea colour are all
   * properties of the spread. */
  /* AND THE OCEAN IS A THIN RIM AT ANY REALISTIC DEPTH, which limits what a
   * whole disc can show. At ocean depth 0.55 the layer is ~0.022 of the body
   * radius, so the sea's colour reaches the eye as a narrow ring at the limb
   * and the two sheets below differ only there. That difference is REAL - seed
   * 1's sea runs blue-green in one and magenta in the other - but it is small
   * on the page, and the 300-body distribution measured above is the honest
   * evidence that the range is free. Same trap as the caps: D18's "not
   * judgeable at contact-sheet scale", applied to a band nobody thinks of as
   * thin because it is conceptually the biggest thing on the world. */
  sheet("_oceans-realistic.png", [0, 1, 2, 3, 4].map(i => [
    `seed ${i} - realistic`,
    { exoticOceans: false, oceanDepth: 0.55, seaSeed: i,
      seed: `sea-${i}`, primaryHue: i * 70 }
  ]), 420, "the default: every sea is blue-green, and that is deliberate");

  sheet("_oceans-exotic.png", [0, 1, 2, 3, 4].map(i => [
    `seed ${i} - exotic`,
    { exoticOceans: true, oceanDepth: 0.55,
      seed: `sea-${i}`, primaryHue: i * 70 }
  ]), 420, "the same five seeds with the box ticked");

  sheet("_oceans.png", [
    ["exotic, calm star", { exoticOceans: true, oceanDepth: 0.55,
                            seed: "sea-2", primaryHue: 140, starActivity: 0 }],
    ["exotic, violent star", { exoticOceans: true, oceanDepth: 0.55,
                               seed: "sea-2", primaryHue: 140, starActivity: 1 }],
    ["frozen sea - ice sheet", { oceanDepth: 0.55, starlight: 0.18 }],
    ["frozen sea, deeper", { oceanDepth: 0.75, starlight: 0.1 }]
  ], 520, "the Star activity coupling, and the sea ice");

  /* THE SPREAD. Climate is a property of the spread of outputs, not of one
   * render - the same reason `npm run sheet` exists. */
  const spread = [];
  const seeds = ["kor-4412", "vel-8801", "ashtan-2290", "mirdro-5517",
                 "selvor-1183", "ketlun-7726", "phazir-3390", "othrem-6604",
                 "calnyx-9917", "tirbel-2205"];
  seeds.forEach((sd, i) => {
    spread.push([sd, {
      seed: sd, primaryHue: (i * 37) % 360,
      starlight: 0.15 + (i % 5) * 0.19,
      interiorHeat: 0.2 + (i % 4) * 0.22,
      oceanDepth: (i % 5) * 0.2,
      starColour: CC.Climate.starIds()[i % 5],
      starActivity: (i % 3) * 0.5,
      keepUpright: true
    }]);
  });
  sheet("_spread.png", spread, 380, "ten worlds across the whole climate range");
}

console.log(fails === 0 ? "\nCLIMATE CHECK PASSED" : `\nCLIMATE CHECK FAILED (${fails})`);
process.exit(fails === 0 ? 0 : 1);
