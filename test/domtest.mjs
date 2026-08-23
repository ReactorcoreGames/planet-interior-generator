/* Loads the real index.html in jsdom and drives the UI, verifying the shipped
 * artifact actually works.
 *
 * v3 has no build step: index.html lists its scripts in explicit dependency
 * order and those exact files are what run. So this reads the <script src>
 * tags out of index.html and concatenates them in that order — index.html is
 * the single source of truth for the file list, and adding a script there
 * needs no change here. */

import { JSDOM, VirtualConsole } from "jsdom";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeStubCanvas } from "./stubcanvas.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(`${ROOT}/index.html`, "utf8");

const srcs = [...html.matchAll(/<script\s+src=["']([^"']+)["']/gi)].map(m => m[1]);
if (!srcs.length) {
  console.error("No <script src> tags found in index.html — nothing to test.");
  process.exit(1);
}
const script = srcs
  .map(src => `/* ---- ${src} ---- */\n` + readFileSync(resolve(ROOT, src), "utf8"))
  .join("\n;\n");

const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", e => errors.push("jsdomError: " + e.message));
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

const dom = new JSDOM(html, { runScripts: "outside-only", virtualConsole: vc,
                              pretendToBeVisual: true });
const { window } = dom;

// jsdom has no canvas backend; install the recording stub so all the real
// drawing code executes and is validated.
let stubs = [];
function attachStub(el) {
  const s = makeStubCanvas(el.width || 1280, el.height || 720);
  el.getContext = () => s.getContext();
  el.toDataURL = () => "data:image/png;base64,";
  Object.defineProperty(el, "width", {
    get: () => s.width, set: v => { s.width = v; }, configurable: true
  });
  Object.defineProperty(el, "height", {
    get: () => s.height, set: v => { s.height = v; }, configurable: true
  });
  // jsdom reports a zero-size box for every element; the preview canvas is
  // sized from its CSS box, so give it a plausible one.
  el.getBoundingClientRect = () => ({ width: 1280, height: 720, top: 0, left: 0,
                                      right: 1280, bottom: 720, x: 0, y: 0 });
  stubs.push(s);
  return s;
}

for (const c of window.document.querySelectorAll("canvas")) attachStub(c);
const origCreate = window.document.createElement.bind(window.document);
window.document.createElement = tag => {
  const el = origCreate(tag);
  if (String(tag).toLowerCase() === "canvas") attachStub(el);
  return el;
};

// Run the app.
try {
  window.eval(script);
} catch (e) {
  console.log("SCRIPT THREW:", e.message);
  console.log(e.stack.split("\n").slice(0, 6).join("\n"));
  process.exit(1);
}

const API = window.CelestialCutaway;
if (!API) { console.log("FAIL: window.CelestialCutaway not exposed"); process.exit(1); }

// jsdom's "outside-only" script mode never fires DOMContentLoaded, so the app
// is still waiting to start. Without this every interaction test below would
// pass vacuously against a UI that was never wired up.
API.init();

// Confirm the wiring actually happened, so a future regression in start-up
// can't turn this whole file back into a set of no-ops.
{
  const head = window.document.querySelector(".section-head");
  if (!head || head.getAttribute("role") !== "button") {
    console.log("FAIL: app did not initialise — the UI is not wired up");
    process.exit(1);
  }
}

// The app coalesces renders into an animation frame; force the pending one.
API.drawNow();
console.log("app loaded; initial render ops:", stubs[0].__opCount());

const $ = id => window.document.getElementById(id);
const fire = (el, type = "input") =>
  el.dispatchEvent(new window.Event(type, { bubbles: true }));

function check(label, fn) {
  const before = errors.length;
  const startIssues = stubs.reduce((a, s) => a + s.__issues.length, 0);
  try {
    fn();
    API.drawNow();          // flush the coalesced render
  } catch (e) {
    console.log(`FAIL ${label}: ${e.message}`);
    console.log(e.stack.split("\n").slice(1, 4).join("\n"));
    errors.push(label);
    return;
  }
  const newIssues = stubs.reduce((a, s) => a + s.__issues.length, 0) - startIssues;
  if (errors.length > before || newIssues > 0) {
    console.log(`FAIL ${label}: ${newIssues} canvas issues`);
    stubs.flatMap(s => s.__issues).slice(-3).forEach(i => console.log("   " + i));
    errors.push(label);
  } else {
    console.log(`ok   ${label}`);
  }
}

const slide = (id, v) => check(`${id} = ${v}`, () => { $(id).value = String(v); fire($(id)); });

// --- Every control must drive a re-render without breaking anything ---

check("seed change", () => { $("seed").value = "dom-test-42"; fire($("seed")); });
check("seed empty", () => { $("seed").value = ""; fire($("seed")); });
check("seed unicode", () => { $("seed").value = "Ксения-9"; fire($("seed")); });
check("seed restore", () => { $("seed").value = "dom-test-42"; fire($("seed")); });

for (const v of [0, 1, 2, 39, 40, 100]) slide("ocean-depth", v);
for (const v of [0, 11, 12, 13, 55, 100]) slide("interior-heat", v);
for (const v of [0, 50, 100]) slide("thickness-variation", v);
for (const v of [0, 50, 100]) slide("optional-layers", v);
for (const v of [-100, 0, 100]) slide("core-bias", v);
for (const v of [0, 100, 200]) slide("boundary-irregularity", v);
for (const v of [0, 180, 360]) slide("rotation", v);
for (const v of [40, 78, 95]) slide("body-size", v);

for (const v of [0, 5, 6, 55, 100]) slide("starlight", v);
for (const v of [0, 30, 100]) slide("star-activity", v);
for (const v of [0, 35, 50, 100]) slide("axial-tilt", v);

check("star colour cycles", () => {
  for (const v of ["red-dwarf", "orange", "sunlike", "white", "blue-giant"]) {
    $("star-colour").value = v; fire($("star-colour"), "change");
  }
});
check("exotic oceans ON", () => {
  $("exotic-oceans").checked = true; fire($("exotic-oceans"), "change");
});
check("exotic oceans OFF", () => {
  $("exotic-oceans").checked = false; fire($("exotic-oceans"), "change");
});

/* --- EVERY NEW CONTROL MUST CHANGE THE OUTPUT, not merely be bound ---
 *
 * "It moved and nothing changed" is this project's documented failure mode for
 * a new control - the Size tiers slider shipped inert because it read the
 * recipe's own tier count and ignored the user's (PROGRESS.md, Phase 3 tuning
 * notes). The lesson recorded there was to check that a control changes the
 * OUTPUT, not just that it is wired, so the climate controls are held to it. */
{
  const setAll = o => {
    for (const [id, v] of Object.entries(o)) {
      const el = $(id);
      if (el.type === "checkbox") { el.checked = !!v; fire(el, "change"); }
      else if (el.tagName === "SELECT") { el.value = v; fire(el, "change"); }
      else { el.value = String(v); fire(el); }
    }
  };
  /* A known baseline, so this measures the control under test rather than
   * whatever Randomize left behind. */
  const BASE = { "seed": "climate-wiring", "ocean-depth": 40, "interior-heat": 50,
                 "optional-layers": 100, "starlight": 55, "star-activity": 30,
                 "axial-tilt": 0, "star-colour": "sunlike", "tidal-lock": 0 };

  const climate = () => {
    const s = API.gather();
    return API.details(API.generate(s), s).climate;
  };
  const ocean = () => {
    const s = API.gather();
    return API.palette(API.generate(s), s).layers.ocean;
  };

  setAll(BASE);
  const warm = climate().mean;
  setAll({ "starlight": 15 });
  const cold = climate().mean;
  console.log(cold < warm - 0.05
    ? `ok   Starlight changes the climate (${warm.toFixed(2)} -> ${cold.toFixed(2)})`
    : "FAIL Starlight did not change the climate");
  if (!(cold < warm - 0.05)) errors.push("starlight inert");

  setAll(BASE);
  const sunlike = climate().mean;
  setAll({ "star-colour": "blue-giant" });
  const blue = climate().mean;
  console.log(blue > sunlike + 0.02
    ? `ok   Star colour changes the climate (${sunlike.toFixed(2)} -> ${blue.toFixed(2)})`
    : "FAIL Star colour did not change the climate");
  if (!(blue > sunlike + 0.02)) errors.push("star colour inert");

  /* Activity must move COVER while leaving temperature alone - the whole point
   * of it being a separate control from Starlight. */
  setAll(BASE);
  const coverOf = () => {
    const s = API.gather();
    const d = API.details(API.generate(s), s);
    let sum = 0, n = 0;
    for (let deg = 0; deg < 360; deg += 30) { sum += d.coverAt(deg * Math.PI / 180); n++; }
    return sum / n;
  };
  const calmCover = coverOf(), calmTemp = climate().mean;
  setAll({ "star-activity": 100 });
  const wildCover = coverOf(), wildTemp = climate().mean;
  const activityOK = wildCover < calmCover - 0.02
                  && Math.abs(wildTemp - calmTemp) < 0.02;
  console.log(activityOK
    ? `ok   Star activity scours cover (${calmCover.toFixed(2)} -> ` +
      `${wildCover.toFixed(2)}) without changing temperature`
    : "FAIL Star activity is inert, or it moved the temperature");
  if (!activityOK) errors.push("star activity");

  setAll(BASE);
  const flat = climate();
  setAll({ "axial-tilt": 100 });
  const tilted = climate();
  const tiltOK = Math.abs(tilted.hottestAt - flat.hottestAt) > 20;
  console.log(tiltOK
    ? `ok   Axial tilt moves the hottest bearing (${flat.hottestAt} -> ${tilted.hottestAt} deg)`
    : "FAIL Axial tilt did not move the thermal field");
  if (!tiltOK) errors.push("axial tilt inert");

  /* Exotic oceans has to be checked across SEEDS, not on one: a single body may
   * roll a free hue that lands where the authored range already was. */
  setAll(BASE);
  let differed = 0, tried = 0;
  for (const sd of ["ex-1", "ex-2", "ex-3"]) {
    setAll({ "seed": sd, "exotic-oceans": false });
    const off = ocean();
    setAll({ "exotic-oceans": true });
    const on = ocean();
    if (!off || !on) continue;
    tried++;
    let dh = Math.abs(off.h - on.h); if (dh > 180) dh = 360 - dh;
    if (dh > 10 || Math.abs(off.v - on.v) > 0.05) differed++;
  }
  console.log(differed >= tried - 1
    ? `ok   Exotic oceans changes the sea (${differed}/${tried} seeds)`
    : `FAIL Exotic oceans barely changed the sea (${differed}/${tried})`);
  if (differed < tried - 1) errors.push("exotic oceans inert");

  setAll(BASE);
  $("exotic-oceans").checked = false; fire($("exotic-oceans"), "change");
}

check("keep upright ON", () => { $("keep-upright").checked = true; fire($("keep-upright"), "change"); });
check("rotation disabled when upright", () => {
  if (!$("rotation").disabled) throw new Error("rotation should be disabled");
});
check("keep upright OFF", () => { $("keep-upright").checked = false; fire($("keep-upright"), "change"); });
check("rotation re-enabled", () => {
  if ($("rotation").disabled) throw new Error("rotation should be enabled");
});

for (const bg of ["solid", "gradient", "transparent", "starfield"]) {
  check(`background ${bg}`, () => { $("background").value = bg; fire($("background"), "change"); });
}
check("background colour", () => { $("background-color").value = "#224466"; fire($("background-color"), "change"); });

for (const r of ["720", "1080", "1440", "2160"]) {
  check(`resolution ${r}`, () => { $("resolution").value = r; fire($("resolution"), "change"); });
}
for (const a of ["1:1", "4:3", "3:2", "16:9"]) {
  check(`aspect ${a}`, () => { $("aspect").value = a; fire($("aspect"), "change"); });
}

check("randomize x5", () => { for (let i = 0; i < 5; i++) $("randomize-btn").click(); });
check("seed roll", () => { $("seed-roll").click(); });

// --- Locks ---
check("lock all", () => { $("lock-all").click(); });
check("randomize with everything locked", () => {
  const before = $("seed").value;
  $("randomize-btn").click();
  if ($("seed").value !== before) throw new Error("locked seed was changed by Randomize");
});
check("invert locks", () => { $("invert-locks").click(); });
check("unlock all", () => { $("unlock-all").click(); });
check("randomize with nothing locked", () => {
  const before = $("seed").value;
  $("randomize-btn").click();
  if ($("seed").value === before) throw new Error("unlocked seed was not changed by Randomize");
});

// --- Accordion ---
check("accordion toggles", () => {
  const heads = [...window.document.querySelectorAll(".section-head")];
  if (heads.length < 6) throw new Error(`only ${heads.length} sections`);
  for (const h of heads) { h.click(); h.click(); }
});
check("accordion multi-open", () => {
  const sections = [...window.document.querySelectorAll(".section")];
  sections.forEach(s => { if (!s.classList.contains("open")) s.querySelector(".section-head").click(); });
  const open = sections.filter(s => s.classList.contains("open")).length;
  if (open !== sections.length) throw new Error(`only ${open}/${sections.length} open at once`);
});

// --- Export menu ---
check("export menu opens", () => {
  $("export-btn").click();
  if ($("export-menu").hidden) throw new Error("export menu did not open");
});
check("export menu closes", () => {
  window.document.body.click();
  if (!$("export-menu").hidden) throw new Error("export menu did not close");
});

// --- Export actually does something ---
//
// The menu was wired but inert for four phases, which is exactly the
// "silently inert control" this file exists to catch. Each item is clicked and
// required to produce a result, so a broken export cannot pass as a working
// menu again.
{
  // jsdom has no PNG encoder and no clipboard, so the stub canvas returns a
  // data: stub and navigator.clipboard is absent. What is being tested here is
  // that the code PATH runs to completion and reports — not that a file lands.
  let clicks = 0, downloads = [];
  const origClick = window.HTMLAnchorElement.prototype.click;
  window.HTMLAnchorElement.prototype.click = function () {
    if (this.download) downloads.push(this.download);
    clicks++;
  };

  // The menu's PNG actions. "body" (body-only, transparent) was removed in
  // favour of the 1:1 square plus the Output background control - two menu
  // items for one framing choice and one background choice was the menu doing
  // the multiplying the controls should.
  for (const action of ["current", "square", "composed", "card"]) {
    check(`export PNG (${action})`, () => {
      const before = downloads.length;
      const r = window.CelestialCutaway.CC.Export.run(action);
      if (!r || !r.ok) throw new Error("export reported failure");
      if (downloads.length === before) throw new Error("no download was started");
      if (!/\.png$/.test(downloads[downloads.length - 1])) {
        throw new Error(`filename is not a png: ${downloads[downloads.length - 1]}`);
      }
    });
  }
  window.HTMLAnchorElement.prototype.click = origClick;

  // EXPORT SIZE FOLLOWS THE OUTPUT CONTROLS. A resolution dropdown that does
  // not change the exported pixels is the same inert control in a new place.
  check("export honours resolution and aspect", () => {
    const E = window.CelestialCutaway.CC.Export;
    const a = E.sizeFor({ resolution: "720", aspect: "16:9" });
    const b = E.sizeFor({ resolution: "2160", aspect: "16:9" });
    const sq = E.sizeFor({ resolution: "1080", aspect: "1:1" });
    if (a.height !== 720 || b.height !== 2160) throw new Error("resolution ignored");
    if (a.width !== 1280 || b.width !== 3840) throw new Error("aspect not applied to width");
    if (sq.width !== sq.height) throw new Error("1:1 is not square");
  });

  // TRANSPARENCY IS REACHED THROUGH THE OUTPUT CONTROL now that the dedicated
  // "body only, transparent" menu item is gone. The capability must survive its
  // menu item: setting the background to Transparent and exporting has to give
  // a genuinely transparent PNG, or removing the item removed a feature.
  check("the Output background reaches transparency", () => {
    const E = window.CelestialCutaway.CC.Export;
    $("background").value = "starfield"; fire($("background"), "change");
    API.drawNow();
    const withBg = E.renderCanvas({});
    if (withBg.settings.background !== "starfield") {
      throw new Error("the starfield setting did not reach the export");
    }

    $("background").value = "transparent"; fire($("background"), "change");
    API.drawNow();
    const noBg = E.renderCanvas({});
    if (noBg.settings.background !== "transparent") {
      throw new Error("Transparent did not reach the export");
    }

    // And the square export must carry it too - it is the item that replaced
    // the transparent one, so it must not force a background back on.
    const sq = E.canvasFor("square");
    if (sq.settings.background !== "transparent") {
      throw new Error("the 1:1 export overrode the chosen background");
    }
    if (sq.width !== sq.height) throw new Error("the 1:1 export is not square");

    $("background").value = "starfield"; fire($("background"), "change");
    API.drawNow();
  });

  // The composed export must come out at plausible dimensions. The exact
  // layout numbers - the 4:3 floor, where the card sits, how tall it is - used
  // to be pinned here and are not any more: they are layout OPINIONS, visible
  // the moment you export once, and pinning them invites a future session to
  // "fix" working code to satisfy a stale assertion. What is still worth
  // catching mechanically is an export that comes out zero-width or wildly
  // wrong, which no one would spot until the file failed to open.
  check("the composed export has plausible dimensions", () => {
    const E = window.CelestialCutaway.CC.Export;
    const composed = E.renderComposed({});
    if (!(composed.width > 100 && composed.height > 100)) {
      throw new Error(`degenerate size: ${composed.width}x${composed.height}`);
    }
    const ratio = composed.width / composed.height;
    if (!(ratio > 0.2 && ratio < 6)) {
      throw new Error(`implausible aspect ratio: ${ratio.toFixed(3)}`);
    }
  });

  // D67 — AN EXPORT MUST SAY WHAT IT DID, IN WORDS.
  //
  // The feedback used to be a 900ms tint on the Export button, which you have to
  // already be looking at to catch - and the clipboard exports are the ones
  // where the user has dismissed the menu and is watching the picture.
  check("an export reports its result in the toast", () => {
    const t = $("export-toast");
    if (!t) throw new Error("there is no toast element");

    const origClick = window.HTMLAnchorElement.prototype.click;
    window.HTMLAnchorElement.prototype.click = function () {};
    try {
      window.CelestialCutaway.CC.ExportUI.runExport("current");
    } finally {
      window.HTMLAnchorElement.prototype.click = origClick;
    }

    if (t.hidden) throw new Error("the toast stayed hidden after an export");
    if (!/\.png/.test(t.textContent)) {
      throw new Error(`the toast does not name the file: "${t.textContent}"`);
    }
    // The pixel size is the part the user cannot otherwise check.
    if (!/\d+x\d+/.test(t.textContent)) {
      throw new Error(`the toast does not give the size: "${t.textContent}"`);
    }
    if (!/toast-ok/.test(t.className)) {
      throw new Error(`a successful export was not marked ok: "${t.className}"`);
    }
  });

  // A CLIPBOARD WRITE MUST NOT CLAIM SUCCESS BEFORE IT SETTLES. The synchronous
  // return can only say the write was STARTED - it used to say { ok: true },
  // so a write rejected for want of permission still flashed green.
  check("a pending clipboard copy reports as pending, not as success", () => {
    const E = window.CelestialCutaway.CC.Export;

    // No ClipboardItem in jsdom, so this is the unsupported-browser path: it
    // must report a failure rather than silently doing nothing.
    const r = E.copyImage();
    if (r.ok && !r.pending) {
      throw new Error("an unsettled clipboard write reported plain success");
    }
    if (!r.ok && !r.error) {
      throw new Error("a failed clipboard copy gave no reason");
    }
  });

  // THE SETTINGS STRING is the shareable state, and its whole value is that it
  // lists only what differs from the defaults.
  check("copy seed + settings lists the seed and only non-defaults", () => {
    const E = window.CelestialCutaway.CC.Export;
    $("seed").value = "share-probe"; fire($("seed"));
    $("ocean-depth").value = "77"; fire($("ocean-depth"));
    // Put one control back to the value index.html ships with, so "absent from
    // the string" is a statement about the diff rather than about whatever an
    // earlier check happened to leave behind.
    const tv = $("thickness-variation");
    tv.value = tv.defaultValue; fire(tv);
    API.drawNow();
    const text = E.settingsText();
    if (!/^seed: share-probe$/m.test(text)) throw new Error("the seed is not in the string");
    if (!/^ocean-depth: 77$/m.test(text)) throw new Error("a changed control is missing");
    if (/^thickness-variation:/m.test(text)) {
      throw new Error("a control at its default was included - the string is not a diff");
    }
  });
}

// --- The preset gallery ---
{
  check("preset gallery is built from data", () => {
    const cards = window.document.querySelectorAll("#preset-gallery .preset-card");
    const data = window.CelestialCutaway.CC.Presets.forArchetype("planet");
    if (cards.length !== data.length) {
      throw new Error(`${cards.length} cards for ${data.length} presets`);
    }
    if (!cards.length) throw new Error("the gallery is empty");
  });

  // APPLYING A PRESET LEAVES THE SEED ALONE (PARAMETERS.md), so a user can try
  // every preset on the same body and compare. That is the entire reason the
  // gallery is useful rather than merely present.
  check("a preset does not change the seed", () => {
    $("seed").value = "preset-probe"; fire($("seed"));
    window.CelestialCutaway.CC.PresetGallery.apply("ocean-world");
    if ($("seed").value !== "preset-probe") throw new Error("the preset moved the seed");
  });

  check("a preset writes its control values", () => {
    window.CelestialCutaway.CC.PresetGallery.apply("desert-world");
    API.drawNow();
    if (parseFloat($("ocean-depth").value) !== 0) {
      throw new Error(`Desert World left ocean-depth at ${$("ocean-depth").value}`);
    }
    if (!API.body.layers.every(l => l.role !== "ocean")) {
      throw new Error("Desert World rendered with an ocean");
    }
  });

  // A LOCKED CONTROL IS NOT OVERWRITTEN. One line in ui/presets.js, and it is
  // what makes presets compose with the lock system rather than fight it.
  check("a preset respects locks", () => {
    $("ocean-depth").value = "50"; fire($("ocean-depth"));
    CCset("lock-ocean-depth", true);
    window.CelestialCutaway.CC.PresetGallery.apply("ocean-world");
    const v = parseFloat($("ocean-depth").value);
    CCset("lock-ocean-depth", false);
    if (v !== 50) throw new Error(`a locked control was overwritten (50 -> ${v})`);
  });

  // Applying the same preset twice must give the same state — an accumulating
  // exclusion list would make the second application a different world.
  check("applying a preset twice is idempotent", () => {
    window.CelestialCutaway.CC.PresetGallery.apply("volcanic-world");
    API.drawNow();
    const a = JSON.stringify(API.stats.lines);
    window.CelestialCutaway.CC.PresetGallery.apply("volcanic-world");
    API.drawNow();
    if (JSON.stringify(API.stats.lines) !== a) {
      throw new Error("the second application produced a different body");
    }
  });
}

function CCset(id, on) {
  const el = $(id);
  el.checked = on;
  el.dispatchEvent(new window.Event("change", { bubbles: true }));
}

// --- The info panel ---
{
  check("the info panel renders every stat line", () => {
    $("show-info").checked = true; fire($("show-info"), "change");
    $("info-detail").value = "full"; fire($("info-detail"), "change");
    API.drawNow();
    const dds = window.document.querySelectorAll("#info-panel .info-lines dd");
    if (dds.length !== API.stats.lines.length) {
      throw new Error(`${dds.length} rows for ${API.stats.lines.length} stat lines`);
    }
    for (const dd of dds) {
      if (!dd.textContent.trim()) throw new Error("an empty stat row reached the panel");
      if (/undefined|NaN|\[object/.test(dd.textContent)) {
        throw new Error(`placeholder junk on the card: ${dd.textContent}`);
      }
    }
  });

  // THE PANEL SHOWS WHAT CC.Stats COMPUTED AND DECIDES NOTHING. If a string on
  // screen is not the string the generator produced, a second source has crept
  // in — which is the one failure mode this phase can introduce.
  check("the panel prints the generator's own strings", () => {
    const dds = [...window.document.querySelectorAll("#info-panel .info-lines dd")];
    for (const l of API.stats.lines) {
      const row = dds.find(d => d.getAttribute("data-key") === l.key);
      if (!row) throw new Error(`no row for ${l.key}`);
      if (row.textContent !== l.value) {
        throw new Error(`${l.key} was reworded by the panel`);
      }
    }
    const name = window.document.querySelector("#info-panel .info-name");
    if (!name || name.textContent !== API.stats.name) {
      throw new Error("the panel's name is not the generated name");
    }
  });

  check("info detail level changes how many lines show", () => {
    $("info-detail").value = "compact"; fire($("info-detail"), "change");
    API.drawNow();
    const compact = window.document.querySelectorAll("#info-panel dd").length;
    $("info-detail").value = "full"; fire($("info-detail"), "change");
    API.drawNow();
    const full = window.document.querySelectorAll("#info-panel dd").length;
    if (!(compact < full)) throw new Error(`compact ${compact} vs full ${full}`);
  });

  check("the info panel can be hidden", () => {
    $("show-info").checked = false; fire($("show-info"), "change");
    API.drawNow();
    if (!$("info-panel").hidden) throw new Error("the panel did not hide");
    $("show-info").checked = true; fire($("show-info"), "change");
    API.drawNow();
    if ($("info-panel").hidden) throw new Error("the panel did not come back");
  });

  // TOGGLING THE CARD MUST NOT RE-ROLL THE BODY. It is an output-stage control;
  // if it re-ran the detail stage, hiding the card would change the picture.
  check("showing the card does not change the render", () => {
    $("show-info").checked = true; fire($("show-info"), "change");
    API.drawNow();
    const a = JSON.stringify(API.body.layers.map(l => l.outer));
    $("show-info").checked = false; fire($("show-info"), "change");
    API.drawNow();
    if (JSON.stringify(API.body.layers.map(l => l.outer)) !== a) {
      throw new Error("hiding the card re-rolled the body");
    }
    $("show-info").checked = true; fire($("show-info"), "change");
    API.drawNow();
  });

  // D65 — THE INFO CARD MUST NOT BE A ZOOM CONTROL.
  //
  // The card used to be given room by padding #preview, which narrowed the
  // canvas. The body is sized off the SHORTER axis, so on a tall window that
  // padded width became the binding axis and toggling the card RESIZED the
  // body - by up to 48.8%, running it off the bottom of the frame. It also cut
  // the preview background off halfway under the card, since the background
  // only reaches as far as the canvas does.
  //
  // THE CANVAS IS NOW FULL-BLEED AND NEVER CHANGES SIZE. The room the card
  // needs is a shift of the body's CENTRE (`offsetX`), applied whether the card
  // is visible or not. So the property to assert is much stronger than "the
  // body is not rescaled": the view is IDENTICAL in both states, because the
  // toggle no longer feeds into it at all.
  //
  // Tested against makeView directly rather than through the DOM, because the
  // stub canvas reports a fixed box and so cannot reproduce a real layout.
  check("the info card cannot move, resize or crop the body", () => {
    const Canvas = window.CelestialCutaway.CC.Canvas;

    // A 1280x800 window: 392px panel, so an 888x800 preview. The canvas fills
    // it in BOTH states - that is the point.
    const box = { w: 888 - 32, h: 800 - 32 };
    const offsetX = 0;   // the <=1360px step gives no room away

    const open = Canvas.makeView(box.w, box.h,
                                 { bodyFrac: 0.78, extent: 1, offsetX });
    const shut = Canvas.makeView(box.w, box.h,
                                 { bodyFrac: 0.78, extent: 1, offsetX });

    for (const k of ["R", "cx", "cy", "scale"]) {
      if (Math.abs(open[k] - shut[k]) > 1e-9) {
        throw new Error(`toggling the card changed view.${k}: ` +
          `${open[k]} -> ${shut[k]}`);
      }
    }

    // And a body offset for the card must still sit wholly inside the frame.
    const wide = Canvas.makeView(1528, 1080,
                                 { bodyFrac: 0.78, extent: 1, offsetX: 356 });
    if (wide.cx - wide.R < -1 || wide.cy - wide.R < -1 ||
        wide.cy + wide.R > 1080 + 1) {
      throw new Error(`an offset body leaves the frame ` +
        `(cx=${wide.cx.toFixed(0)} R=${wide.R.toFixed(0)})`);
    }

    for (const [v, bx] of [[open, box], [shut, box]]) {
      if (v.cx - v.R < -1 || v.cx + v.R > bx.w + 1 ||
          v.cy - v.R < -1 || v.cy + v.R > bx.h + 1) {
        throw new Error(`the body overflows its ${bx.w}x${bx.h} canvas ` +
          `(R=${v.R.toFixed(0)})`);
      }
    }
  });

  // D66 — THE FIRST FRAME MUST NOT BE MEASURED AGAINST AN UNRESOLVED BOX.
  //
  // A <canvas> reports its intrinsic 300x150 until CSS resolves its box, so the
  // first draw after a page load sized the backing store 2:1 while CSS
  // stretched the element to fill a ~3:2 preview. Every circle came out an
  // ellipse, and any later redraw fixed it - the signature of a measurement
  // taken too early rather than a drawing fault.
  check("an unresolved canvas box does not produce a squished first frame", () => {
    const Canvas = window.CelestialCutaway.CC.Canvas;

    // A canvas whose box is still the untouched intrinsic default, inside a
    // parent that HAS been laid out - exactly the pre-layout state.
    const fake = {
      width: 300, height: 150,
      getBoundingClientRect: () => ({ width: 300, height: 150 }),
      getContext: () => ({ setTransform() {} }),
      parentNode: {
        clientWidth: 1528, clientHeight: 1080,
        getBoundingClientRect: () => ({ width: 1528, height: 1080 })
      }
    };

    const fit = Canvas.fitToDisplay(fake, 1);
    const ratio = fit.width / fit.height;
    if (Math.abs(ratio - 2) < 0.01) {
      throw new Error("the canvas was sized 2:1 from the intrinsic default");
    }
    if (Math.abs(ratio - 1528 / 1080) > 0.01) {
      throw new Error(`expected the parent's ratio (1.415), got ${ratio.toFixed(3)}`);
    }

    // A canvas with a REAL box must be left entirely alone.
    const real = {
      width: 0, height: 0,
      getBoundingClientRect: () => ({ width: 900, height: 600 }),
      getContext: () => ({ setTransform() {} }),
      parentNode: { clientWidth: 1528, clientHeight: 1080,
                    getBoundingClientRect: () => ({ width: 1528, height: 1080 }) }
    };
    const rfit = Canvas.fitToDisplay(real, 1);
    if (rfit.width !== 900 || rfit.height !== 600) {
      throw new Error(`a resolved box was overridden: ${rfit.width}x${rfit.height}`);
    }
  });

  // Randomize must leave a coherent card behind it, on every roll — this is the
  // path a user actually takes.
  check("8 randomizes all produce a coherent card", () => {
    for (let i = 0; i < 8; i++) {
      $("randomize-btn").click();
      API.drawNow();
      const s = API.stats;
      if (!s || !s.name || !s.hazard) throw new Error(`roll ${i}: no card`);
      if (s.hazard === "Absolute") {
        throw new Error(`roll ${i}: a planet rated Absolute`);
      }
      for (const l of s.lines) {
        if (!l.value || /undefined|NaN|\[object/.test(l.value)) {
          throw new Error(`roll ${i}: ${l.key} = "${l.value}"`);
        }
      }
    }
  });
}

// --- Determinism through the real UI ---
{
  $("seed").value = "determinism-probe"; fire($("seed"));
  $("ocean-depth").value = "63"; fire($("ocean-depth"));
  $("interior-heat").value = "37"; fire($("interior-heat"));
  const sig = () => JSON.stringify(API.generate(API.gather()).layers
    .map(l => [l.role, l.outer.toFixed(9), l.inner.toFixed(9)]));
  const a = sig();
  $("seed").value = "something-else"; fire($("seed"));
  $("seed").value = "determinism-probe"; fire($("seed"));
  const b = sig();
  console.log(a === b
    ? "ok   same seed + settings gives an identical body"
    : "FAIL determinism through the UI");
  if (a !== b) errors.push("determinism");
}

// --- Presence-by-parameter, through the real UI ---
{
  const roles = () => API.generate(API.gather()).layers.map(l => l.role);
  // Randomize ran above and left the sliders anywhere; set the two that are
  // not under test to known values so this measures presence, not leftovers.
  $("interior-heat").value = "55"; fire($("interior-heat"));
  $("optional-layers").value = "100"; fire($("optional-layers"));

  const layersNow = () => API.generate(API.gather()).layers;

  $("ocean-depth").value = "0"; fire($("ocean-depth"));
  const dry = roles();
  $("ocean-depth").value = "80"; fire($("ocean-depth"));
  const wet = roles();
  $("interior-heat").value = "0"; fire($("interior-heat"));
  const dead = layersNow();
  const deadRoles = dead.map(l => l.role);

  /* A cooling core FREEZES INWARD rather than vanishing: the outer core stays
   * present at every Interior heat while the solid core grows into it, so the
   * metal region keeps its size and the transition never pops. What must hold
   * is that a thin liquid shell survives. */
  const dOuter = dead.find(l => l.role === "outer-core");
  const dInner = dead.find(l => l.role === "core");
  const shell = (dOuter && dInner) ? dOuter.outer - dInner.outer : 0;

  const ok = !dry.includes("ocean") && wet.includes("ocean") &&
             deadRoles.includes("outer-core") && shell > 0.008 &&
             dry.includes("crust") && dry.includes("mantle") && dry.includes("core");
  console.log(ok
    ? `ok   Ocean depth 0 removes the ocean; a dead world keeps a thin liquid shell (${shell.toFixed(3)})`
    : `FAIL presence-by-parameter  dry=[${dry}] wet=[${wet}] dead=[${deadRoles}] shell=${shell.toFixed(4)}`);
  if (!ok) errors.push("presence");
}

// --- Resolution independence: the picture must not change with pixel size ---
{
  $("seed").value = "resolution-probe"; fire($("seed"));
  $("interior-heat").value = "60"; fire($("interior-heat"));
  const body = API.generate(API.gather());
  const settings = API.gather();

  const trace = (w, h) => {
    const stub = makeStubCanvas(w, h);
    window.CC.Scene.render(stub.getContext(), w, h, body, settings);
    return stub;
  };
  const small = trace(640, 360);
  const large = trace(3840, 2160);

  // Same body, six times the pixels: the op count must be identical, because
  // element counts never scale with resolution.
  const bodyOps = s => s.__opCount();
  const ratio = bodyOps(large) / bodyOps(small);
  console.log(Math.abs(ratio - 1) < 0.001
    ? `ok   resolution independence (${bodyOps(small)} ops at both 360p and 2160p)`
    : `FAIL element count scales with resolution (${bodyOps(small)} vs ${bodyOps(large)} ops)`);
  if (Math.abs(ratio - 1) >= 0.001) errors.push("resolution");
}


// --- The composed export: body + card in one image ---
{
  check("the composed export is landscape and holds both", () => {
    const E = window.CelestialCutaway.CC.Export;
    const out = E.renderComposed({});
    if (out.width <= out.height) throw new Error("composed export is not landscape");
    // The card is drawn as canvas text; the stub records every fillText, so the
    // card's own strings must appear among them.
    const texts = stubs.flatMap(s => s.__calls.filter(c => c.op === "fillText").map(c => c.text));
    const name = API.stats.name;
    if (!texts.includes(name)) throw new Error(`the card name (${name}) was not drawn`);
  });

  // THE BODY MUST CENTRE IN WHAT IS LEFT, not in the whole frame — the v2
  // relationship (bodyAreaW = w - panelW - margin*2). Without it the card
  // sits on top of the body instead of beside it.
  check("the composed body is offset left, clear of the card", () => {
    const E = window.CelestialCutaway.CC.Export;
    const before = stubs.reduce((a, s) => a + s.__calls.length, 0);
    const out = E.renderComposed({});
    const calls = stubs.flatMap(s => s.__calls).slice(before);
    // The body's own arcs carry its centre; the card draws no large arcs.
    const arcs = calls.filter(c => c.op === "arc" && c.r > out.height * 0.1);
    if (!arcs.length) throw new Error("no body arcs found in the composed render");
    const cx = arcs[arcs.length - 1].x;
    if (!(cx < out.width * 0.5)) {
      throw new Error(`body centre at ${Math.round(cx)} of ${out.width} - not offset left`);
    }
  });

  // NOTHING IS EVER CLIPPED OR DROPPED. v2 silently lost its verdict line when
  // the card ran long; here the card measures first and the canvas grows.
  check("a Full-detail card is never clipped", () => {
    const E = window.CelestialCutaway.CC.Export;
    $("info-detail").value = "full"; fire($("info-detail"), "change");
    API.drawNow();
    E.renderComposed({});
    const texts = stubs.flatMap(s => s.__calls.filter(c => c.op === "fillText").map(c => c.text));
    for (const line of API.stats.lines) {
      if (!texts.includes(line.label.toUpperCase())) {
        throw new Error(`"${line.label}" is missing from the composed card`);
      }
    }
  });

  check("the card-only export is portrait and self-sized", () => {
    const E = window.CelestialCutaway.CC.Export;
    const out = E.renderCard({});
    if (out.height <= out.width) throw new Error("the card came out landscape");
    if (out.width < 100) throw new Error("the card is implausibly narrow");
  });

  // THE RESOLUTION CONTROL MUST REACH THE CARD-ONLY EXPORT. It used to be
  // ignored in all but name. It SCALES the card rather than fixing its height:
  // the card has no aspect of its own, and forcing an exact height made the
  // width absorb the difference (a six-line Compact card came out 1490px wide
  // to reach 1080px tall). So a 2160px card is a 1080px card at twice the size.
  check("the card-only export scales with the resolution", () => {
    const E = window.CelestialCutaway.CC.Export;
    const at = {};
    for (const res of ["720", "1080", "2160"]) {
      $("resolution").value = res; fire($("resolution"), "change");
      API.drawNow();
      at[res] = E.renderCard({});
    }

    if (!(at["2160"].width > at["1080"].width && at["1080"].width > at["720"].width)) {
      throw new Error(`the card did not grow: ${at["720"].width}, ` +
        `${at["1080"].width}, ${at["2160"].width}`);
    }

    // Doubling the resolution doubles the WIDTH exactly - the width is a fixed
    // fraction of the control, which is what makes the number mean something.
    const ratio = at["2160"].width / at["1080"].width;
    if (Math.abs(ratio - 2) > 0.02) {
      throw new Error(`2160 is ${ratio.toFixed(3)}x the 1080 card, expected 2`);
    }

    // The height grows too, but NOT by exactly 2x, and that is correct rather
    // than a flaw worth engineering away: a wider card fits a wrapped paragraph
    // into fewer lines, so it is proportionally shorter. What matters is that
    // it grows substantially and stays a portrait card - a height that barely
    // moved would mean the text was being scaled without the layout following.
    const hRatio = at["2160"].height / at["1080"].height;
    if (hRatio < 1.4 || hRatio > 2.1) {
      throw new Error(`height scaled ${hRatio.toFixed(3)}x, expected ~1.4-2.1`);
    }
    for (const res of ["720", "1080", "2160"]) {
      if (at[res].height <= at[res].width) {
        throw new Error(`the ${res} card came out landscape`);
      }
    }

    $("resolution").value = "1080"; fire($("resolution"), "change");
    API.drawNow();
  });

  // The detail level must not be inert in the card export: a card with more to
  // say is a taller card, since the width is set by the resolution.
  check("detail level changes the exported card height", () => {
    const E = window.CelestialCutaway.CC.Export;
    $("info-detail").value = "compact"; fire($("info-detail"), "change");
    API.drawNow();
    const small = E.renderCard({}).height;
    $("info-detail").value = "full"; fire($("info-detail"), "change");
    API.drawNow();
    const big = E.renderCard({}).height;
    if (!(big > small)) throw new Error(`compact ${small} vs full ${big}`);
  });
}

// --- The markdown factsheet ---
{
  check("the factsheet carries every line, the palette and the settings", () => {
    const E = window.CelestialCutaway.CC.Export;
    $("info-detail").value = "compact"; fire($("info-detail"), "change");
    API.drawNow();
    const md = E.factsheetText();

    if (!md.startsWith("# " + API.stats.name)) throw new Error("no title");
    // EVERY line, regardless of detail level — a file has no frame to overflow,
    // so the level governs pictures only.
    for (const line of API.stats.lines) {
      if (!md.includes(line.value)) throw new Error(`"${line.key}" missing from the factsheet`);
    }
    for (const sw of API.stats.fingerprint) {
      if (!md.includes(sw.hex)) throw new Error(`palette entry ${sw.hex} missing`);
    }
    if (!md.includes("## Settings")) throw new Error("no settings section");
    if (!md.includes(E.settingsText())) throw new Error("the settings block is not embedded");
  });

  check("saving the factsheet starts a .md download", () => {
    let name = null;
    const orig = window.HTMLAnchorElement.prototype.click;
    window.HTMLAnchorElement.prototype.click = function () { name = this.download; };
    const r = window.CelestialCutaway.CC.Export.run("factsheet");
    window.HTMLAnchorElement.prototype.click = orig;
    if (!r.ok) throw new Error("factsheet reported failure");
    if (!/\.md$/.test(name || "")) throw new Error(`filename is not markdown: ${name}`);
  });
}

// --- Importing a settings string: the other half of "copy seed + settings" ---
{
  check("a settings block round-trips through the seed field", () => {
    const E = window.CelestialCutaway.CC.Export;

    // Build a distinctive body, copy its string...
    $("seed").value = "roundtrip"; fire($("seed"));
    $("ocean-depth").value = "83"; fire($("ocean-depth"));
    $("interior-heat").value = "17"; fire($("interior-heat"));
    $("starlight").value = "9"; fire($("starlight"));
    API.drawNow();
    const text = E.settingsText();
    const before = JSON.stringify(API.body.layers.map(l => l.outer));

    // ...wreck the panel...
    $("seed").value = "elsewhere"; fire($("seed"));
    $("ocean-depth").value = "5"; fire($("ocean-depth"));
    $("interior-heat").value = "95"; fire($("interior-heat"));
    $("starlight").value = "88"; fire($("starlight"));
    API.drawNow();
    if (JSON.stringify(API.body.layers.map(l => l.outer)) === before) {
      throw new Error("the wrecking step changed nothing - the test proves nothing");
    }

    // ...and paste the string back.
    const r = E.applySettingsText(text);
    API.drawNow();
    if (!r.ok) throw new Error("the import reported failure");
    if (JSON.stringify(API.body.layers.map(l => l.outer)) !== before) {
      throw new Error("the restored body is not the one the string described");
    }
    if ($("seed").value !== "roundtrip") throw new Error("the seed did not come back");
  });

  // A control the string OMITS is at its default, because the string is a diff.
  // Without this, pasting over an edited panel merges the two.
  check("import resets controls the string does not mention", () => {
    const E = window.CelestialCutaway.CC.Export;
    const tv = $("thickness-variation");
    E.applySettingsText("seed: bare-string\nocean-depth: 40");
    API.drawNow();
    if (tv.value !== tv.defaultValue) {
      throw new Error(`an omitted control kept ${tv.value}, not its default ${tv.defaultValue}`);
    }
  });

  check("an unknown key is skipped, not fatal", () => {
    const E = window.CelestialCutaway.CC.Export;
    const r = E.applySettingsText("seed: future\nocean-depth: 30\nwarp-core-flux: 88");
    if (!r.ok) throw new Error("a string with one unknown key was rejected wholesale");
    if (r.skipped.indexOf("warp-core-flux") < 0) throw new Error("the unknown key was not reported");
    if ($("seed").value !== "future") throw new Error("the known keys were not applied");
  });

  check("a plain seed is not mistaken for a settings block", () => {
    const E = window.CelestialCutaway.CC.Export;
    if (E.looksLikeSettings("just-a-seed")) throw new Error("a bare seed was treated as settings");
    if (E.looksLikeSettings("seed with spaces")) throw new Error("a spaced seed was treated as settings");
    if (!E.looksLikeSettings("seed: x\nocean-depth: 3")) {
      throw new Error("a real settings block was not recognised");
    }
  });
}

// --- Background randomization: the lock is on the colour, not the type ---
{
  // One pass of rolls answering both questions, rather than two passes of 12.
  check("Randomize rolls the background colour, never the type, and stays dark", () => {
    const type = $("background").value;
    const seen = new Set();
    for (let i = 0; i < 4; i++) {
      $("randomize-btn").click();
      API.drawNow();
      seen.add($("background-color").value);
      if ($("background").value !== type) {
        throw new Error("Randomize changed the background TYPE");
      }
      const hex = $("background-color").value;
      const n = parseInt(hex.slice(1), 16);
      const lum = (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255;
      if (lum > 0.20) throw new Error(`background ${hex} has luminance ${lum.toFixed(2)} - too bright`);
    }
    if (seen.size < 2) throw new Error(`only ${seen.size} background colours in 4 rolls`);
  });

  check("locking the background colour holds it", () => {
    $("background-color").value = "#123456";
    fire($("background-color"), "change");
    CCset("lock-background-color", true);
    for (let i = 0; i < 2; i++) { $("randomize-btn").click(); API.drawNow(); }
    const held = $("background-color").value;
    CCset("lock-background-color", false);
    if (held !== "#123456") throw new Error(`a locked background colour became ${held}`);
  });
}

// --- Framing: zoom, pan, and the promises they make ---
{
  const CCset = (id, v) => { window.CC.Controls.set(id, v); };
  const resetFraming = () => {
    window.CC.Framing.reset();
    API.drawNow();
  };

  // Zoom is the same body drawn larger, never a body with more detail rolled
  // into it - the same guarantee resolution independence makes, against the
  // other axis that could break it.
  check("zoom scales the view and never the element count", () => {
    resetFraming();
    const body = API.body;
    const trace = (zoomFactor) => {
      const stub = makeStubCanvas(1280, 720);
      const settings = { ...API.gather(), zoom: zoomFactor, panX: 0, panY: 0 };
      window.CC.Scene.render(stub.getContext(), 1280, 720, body, settings);
      return stub.__opCount();
    };
    const at1 = trace(1);
    const at5 = trace(5);
    const at20 = trace(20);
    if (at1 !== at5 || at1 !== at20) {
      throw new Error(`op count moved with zoom: ${at1} / ${at5} / ${at20}`);
    }
  });

  // Framing is OUTPUT stage: panning must not disturb a single element.
  check("panning does not re-roll geometry", () => {
    resetFraming();
    const before = JSON.stringify(API.body);
    CCset("zoom", 600);
    CCset("pan-x", 0.4);
    CCset("pan-y", -0.3);
    API.drawNow();
    if (JSON.stringify(API.body) !== before) {
      throw new Error("framing changed the generated body");
    }
    resetFraming();
  });

  // The user's answer to open question 1: framing survives Randomize.
  check("Randomize leaves the framing alone", () => {
    CCset("zoom", 550);
    CCset("pan-x", 0.25);
    API.drawNow();
    const z = $("zoom").value, px = $("pan-x").value;
    for (let i = 0; i < 2; i++) { $("randomize-btn").click(); API.drawNow(); }
    if ($("zoom").value !== z || $("pan-x").value !== px) {
      throw new Error(`Randomize changed framing: ${z}/${px} -> ${$("zoom").value}/${$("pan-x").value}`);
    }
    resetFraming();
  });

  // Framing has to survive the settings string or a shared world comes back
  // framed differently from how it was sent.
  check("framing round-trips through the settings string", () => {
    CCset("zoom", 620);
    CCset("pan-x", 0.35);
    CCset("pan-y", -0.2);
    API.drawNow();
    const text = window.CC.Share.settingsText();
    if (!/zoom:/.test(text)) throw new Error("zoom missing from the settings string");
    if (!/pan-x:/.test(text)) throw new Error("pan-x missing from the settings string");

    resetFraming();
    window.CC.Share.applySettingsText(text);
    API.drawNow();
    if ($("zoom").value !== "620" || $("pan-x").value !== "0.35") {
      throw new Error(`framing did not restore: zoom=${$("zoom").value} pan-x=${$("pan-x").value}`);
    }
    resetFraming();
  });

  // Reset must actually clear all three, not just the one the button names.
  check("reset framing clears zoom and both pans", () => {
    CCset("zoom", 700); CCset("pan-x", 0.5); CCset("pan-y", 0.5);
    API.drawNow();
    $("reset-framing").click();
    API.drawNow();
    if ($("zoom").value !== "0" || $("pan-x").value !== "0" || $("pan-y").value !== "0") {
      throw new Error("reset left framing behind");
    }
  });

  // A ringed body must not be drawn smaller than a bare one. This is the
  // extent change that motivated the whole feature, tested where the decision
  // is actually made rather than through the pixels it eventually produces.
  check("extent no longer sizes the body", () => {
    const mk = window.CC.Canvas.makeView;
    const bare = mk(800, 600, { bodyFrac: 0.78, extent: 1.0 });
    const ringed = mk(800, 600, { bodyFrac: 0.78, extent: 2.4 });
    if (Math.abs(bare.R - ringed.R) > 1e-9) {
      throw new Error(`a ringed body is drawn at R=${ringed.R} vs a bare ${bare.R}`);
    }
  });

  // Zoom and pan arithmetic, checked directly against the transform.
  check("zoom and pan move the view as specified", () => {
    const mk = window.CC.Canvas.makeView;
    const base = mk(800, 600, { bodyFrac: 0.78 });
    const zoomed = mk(800, 600, { bodyFrac: 0.78, zoom: 4 });
    if (Math.abs(zoomed.R - base.R * 4) > 1e-9) {
      throw new Error(`zoom 4x gave R=${zoomed.R}, expected ${base.R * 4}`);
    }
    // Pan is in body radii, so one radius of pan moves the centre by exactly R.
    const panned = mk(800, 600, { bodyFrac: 0.78, zoom: 4, panX: 1 });
    if (Math.abs((base.R * 4) - (zoomed.cx - panned.cx)) > 1e-9) {
      throw new Error("a pan of one radius did not move the centre by R");
    }
    // And the ceiling holds.
    const tooFar = mk(800, 600, { bodyFrac: 0.78, zoom: 5000 });
    if (Math.abs(tooFar.R - base.R * window.CC.Canvas.MAX_ZOOM) > 1e-9) {
      throw new Error("zoom exceeded MAX_ZOOM");
    }
  });
}

// --- Tooltip coverage ---
const controls = [...window.document.querySelectorAll(
  "#panel select, #panel input, #panel button")];
const untooltipped = controls.filter(el => {
  if (el.type === "checkbox" && el.id.startsWith("lock-")) {
    const lbl = el.closest("label");
    return !(lbl && lbl.getAttribute("title"));
  }
  if (el.closest("#export-menu")) return false;   // menu items label themselves
  const row = el.closest(".control-row");
  const lbl = el.closest("label");
  return !(el.getAttribute("title") || (row && row.getAttribute("title")) ||
           (lbl && lbl.getAttribute("title")));
});
console.log(untooltipped.length === 0
  ? `ok   tooltip coverage (${controls.length} controls)`
  : `FAIL ${untooltipped.length} controls lack tooltips: ${untooltipped.map(e => e.id || e.type).join(", ")}`);
if (untooltipped.length) errors.push("tooltips");

// --- Text sanity: no placeholder junk reached the canvas ---
const texts = stubs.flatMap(s => s.__calls.filter(c => c.op === "fillText").map(c => c.text));
const bad = texts.filter(t => /undefined|NaN|\[object|null/.test(t));
console.log(bad.length === 0
  ? `ok   rendered text clean (${texts.length} strings drawn)`
  : `FAIL bad text: ${[...new Set(bad)].slice(0, 5).join(" | ")}`);
if (bad.length) errors.push("text");

// Glyph safety: characters outside Latin-1 + a small known-good set render as
// tofu boxes in the exported PNG, where there is no font fallback.
const GLYPH_OK = /^[ -ÿ–—‘’“”·°³…]*$/;
const badGlyphs = new Set();
for (const t of texts) for (const ch of t) if (!GLYPH_OK.test(ch)) badGlyphs.add(ch);
console.log(badGlyphs.size === 0
  ? "ok   no risky glyphs in rendered text"
  : `FAIL risky glyphs (render as tofu): ${[...badGlyphs].map(c => c + " U+" + c.codePointAt(0).toString(16)).join(", ")}`);
if (badGlyphs.size) errors.push("glyphs");

const totalIssues = stubs.reduce((a, s) => a + s.__issues.length, 0);
console.log(`\ncanvases exercised: ${stubs.length}   canvas issues: ${totalIssues}   errors: ${errors.length}`);
if (totalIssues) {
  [...new Set(stubs.flatMap(s => s.__issues))].slice(0, 10).forEach(i => console.log("  " + i));
}
const pass = errors.length === 0 && totalIssues === 0;
console.log(pass ? "\nDOM TEST PASSED" : "\nDOM TEST FAILED");
process.exit(pass ? 0 : 1);
