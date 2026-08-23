/* UI wiring: reads controls into a state object, regenerates, renders. */

import { clamp } from "./core/math.js";
import { PALETTES, TYPE_ORDER, TYPE_LABELS } from "./data/palettes.js";
import { STYLES, STYLE_ORDER } from "./render/styles.js";
import { INK_PRESETS } from "./render/overlay.js";
import { render169, render11 } from "./render/scene.js";
import { generate } from "./generate.js";

const $ = id => document.getElementById(id);

const state = {
  type: "rocky", seed: "ember-1", paletteName: "",
  wobble: 0.5, detail: 0.5, style: "artistic",
  hueShift: 0, satScale: 1,
  bgMode: "starfield", bgColor: "#0a0c14", bgMode11: "transparent",
  overlay: false, ink: "auto",
  overlayOptions: { showLayers: true, showFeatures: true, showStats: true },
  resolution: 720,
  profile: null, lore: null, stats: null, features: null
};

function fillSelect(el, entries, current) {
  el.innerHTML = "";
  for (const [value, label] of entries) {
    const opt = document.createElement("option");
    opt.value = value; opt.textContent = label;
    el.appendChild(opt);
  }
  if (current != null && entries.some(e => e[0] === current)) el.value = current;
}

function fillPaletteOptions(type, keep) {
  const names = Object.keys(PALETTES[type]);
  fillSelect($("palette"), names.map(n => [n, n]), keep && names.includes(keep) ? keep : names[0]);
}

function readControls() {
  state.type = $("body-type").value;
  state.seed = $("seed").value || "0";
  state.paletteName = $("palette").value;
  state.wobble = +$("wobble").value / 100;
  state.detail = +$("detail").value / 100;
  state.style = $("art-style").value;
  state.hueShift = +$("hue-shift").value;
  state.satScale = +$("saturation").value / 100;
  state.bgMode = $("bg-mode").value;
  state.bgColor = $("bg-color").value;
  state.bgMode11 = $("bg-mode-11").value;
  state.overlay = $("overlay-toggle").checked;
  state.ink = $("ink-color").value;
  state.overlayOptions = {
    showLayers: $("overlay-layers").checked,
    showFeatures: $("overlay-features").checked,
    showStats: $("overlay-stats").checked
  };
  state.resolution = clamp(parseInt($("resolution").value, 10) || 720, 240, 2160);
}

function syncReadouts() {
  $("wobble-val").textContent = `(${$("wobble").value})`;
  $("detail-val").textContent = `(${$("detail").value})`;
  $("hue-val").textContent = `(${$("hue-shift").value}°)`;
  $("sat-val").textContent = `(${$("saturation").value}%)`;

  // Wobble is meaningless in vector style and heavily damped in semi-tech;
  // dimming the control explains why moving it stops mattering. The base
  // tooltip is preserved and appended to rather than replaced, so the control
  // is never left without one.
  const styleId = $("art-style").value;
  const wobRow = $("wobble").closest(".control-row");
  if (!wobRow.dataset.baseTitle) wobRow.dataset.baseTitle = wobRow.title || "";
  const base = wobRow.dataset.baseTitle;
  if (styleId === "vector") {
    wobRow.classList.add("disabled-hint");
    wobRow.title = `${base}\n\nVector style draws perfect circles — this slider has no effect.`;
  } else if (styleId === "semitech") {
    wobRow.classList.remove("disabled-hint");
    wobRow.title = `${base}\n\nSemi-technical damps wobble to about a quarter strength.`;
  } else {
    wobRow.classList.remove("disabled-hint");
    wobRow.title = base;
  }

  // Solid-color picker only matters in solid mode.
  $("bg-color").disabled = !($("bg-mode").value === "solid" || $("bg-mode-11").value === "solid");

  // Overlay sub-options are inert while the overlay is off.
  const on = $("overlay-toggle").checked;
  for (const id of ["overlay-layers", "overlay-features", "overlay-stats", "ink-color"]) {
    $(id).disabled = !on;
  }
  $("overlay-suboptions").classList.toggle("disabled-hint", !on);

  $("preview-caption").textContent = on
    ? "live preview — 16:9 technical schematic with callouts"
    : "live preview — 16:9 composition (illustration + survey panel)";
}

export function regenerate() {
  readControls();
  syncReadouts();

  const result = generate({
    type: state.type,
    seed: state.seed,
    paletteName: state.paletteName,
    wobble: state.wobble,
    detail: state.detail,
    style: state.style,
    hueShift: state.hueShift,
    satScale: state.satScale,
    nameOverride: $("body-name").value
  });

  state.profile = result.profile;
  state.stats = result.stats;
  state.features = result.features;
  state.lore = result.lore;
  state.name = result.name;

  if (!$("body-name").value.trim()) $("body-name").placeholder = result.autoName;

  render169($("preview-canvas"), state);
}

function randomize() {
  const r = Math.random;
  if (!$("lock-body-type").checked) {
    $("body-type").value = TYPE_ORDER[Math.floor(r() * TYPE_ORDER.length)];
    fillPaletteOptions($("body-type").value, $("lock-palette").checked ? $("palette").value : null);
  }
  if (!$("lock-seed").checked) {
    $("seed").value = Math.floor(r() * 1e9).toString(36) + "-" + Math.floor(r() * 999);
  }
  if (!$("lock-palette").checked) {
    const names = Object.keys(PALETTES[$("body-type").value]);
    $("palette").value = names[Math.floor(r() * names.length)];
  }
  if (!$("lock-wobble").checked) $("wobble").value = Math.floor(20 + r() * 70);
  if (!$("lock-detail").checked) $("detail").value = Math.floor(r() * 101);
  if (!$("lock-style").checked) {
    $("art-style").value = STYLE_ORDER[Math.floor(r() * STYLE_ORDER.length)];
  }
  if (!$("lock-hue").checked) $("hue-shift").value = Math.floor(r() * 361) - 180;
  if (!$("lock-name").checked) $("body-name").value = "";
  regenerate();
}

function downloadCanvas(canvas, filename) {
  const a = document.createElement("a");
  a.download = filename;
  a.href = canvas.toDataURL("image/png");
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const safeName = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function export169() {
  const c = document.createElement("canvas");
  render169(c, state);
  downloadCanvas(c, `${safeName(state.name)}-${state.type}-16x9.png`);
  return c;
}

function export11() {
  const c = document.createElement("canvas");
  render11(c, state);
  downloadCanvas(c, `${safeName(state.name)}-${state.type}-1x1.png`);
  return c;
}

export function initUI() {
  fillSelect($("body-type"), TYPE_ORDER.map(t => [t, TYPE_LABELS[t]]), state.type);
  fillSelect($("art-style"), STYLE_ORDER.map(s => [s, STYLES[s].label]), state.style);
  fillSelect($("ink-color"), Object.entries(INK_PRESETS).map(([k, v]) => [k, v.label]), state.ink);
  fillPaletteOptions(state.type, null);

  $("body-type").addEventListener("change", () => {
    fillPaletteOptions($("body-type").value, null);
    regenerate();
  });

  const live = ["seed", "palette", "wobble", "detail", "resolution", "art-style",
                "hue-shift", "saturation", "bg-mode", "bg-color", "bg-mode-11",
                "ink-color", "body-name"];
  for (const id of live) $(id).addEventListener("input", regenerate);

  for (const id of ["overlay-toggle", "overlay-layers", "overlay-features", "overlay-stats"]) {
    $(id).addEventListener("change", regenerate);
  }

  $("randomize-btn").addEventListener("click", randomize);
  $("export-169-btn").addEventListener("click", export169);
  $("export-11-btn").addEventListener("click", export11);

  // Art style hint text updates under the dropdown.
  $("art-style").addEventListener("change", () => {
    $("style-hint").textContent = STYLES[$("art-style").value].hint;
  });
  $("style-hint").textContent = STYLES[state.style].hint;

  regenerate();

  // Exposed for automated verification; harmless in normal use.
  window.CelestialCutaway = {
    state, regenerate, randomize, render169, render11, generate,
    export169, export11, PALETTES, STYLES,
    setInputs(opts) {
      if (opts.type) { $("body-type").value = opts.type; fillPaletteOptions(opts.type, opts.palette || null); }
      if (opts.palette) $("palette").value = opts.palette;
      if (opts.seed != null) $("seed").value = String(opts.seed);
      if (opts.resolution) $("resolution").value = opts.resolution;
      if (opts.wobble != null) $("wobble").value = opts.wobble;
      if (opts.detail != null) $("detail").value = opts.detail;
      if (opts.style) $("art-style").value = opts.style;
      if (opts.hueShift != null) $("hue-shift").value = opts.hueShift;
      if (opts.bgMode) $("bg-mode").value = opts.bgMode;
      if (opts.overlay != null) $("overlay-toggle").checked = !!opts.overlay;
      if (opts.ink) $("ink-color").value = opts.ink;
      regenerate();
    }
  };
}
