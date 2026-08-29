/* Checks the specs still describe the code.
 *
 * The spec set is the design authority, so it is worth something only while it
 * matches what ships. Session A found several places where it had silently
 * drifted — frac tables that no longer composed, colour ranges that had moved,
 * a file layout listing files that were never written. Each cost real time,
 * because the natural move is to trust the doc.
 *
 * This checks the parts that can be checked mechanically. It cannot verify
 * prose, so it deliberately targets the numbers and required fields — the
 * things most likely to drift and least likely to be noticed.
 *
 * Run as part of `npm test`. */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = p => readFileSync(resolve(ROOT, p), "utf8");

const html = read("index.html");
const srcs = [...html.matchAll(/<script\s+src=["']([^"']+)["']/gi)]
  .map(m => m[1]).filter(s => !s.endsWith("js/main.js"));

const sandbox = { console, Math, Date, parseInt, parseFloat, isNaN, isFinite };
sandbox.self = sandbox; sandbox.globalThis = sandbox;
createContext(sandbox);
for (const src of srcs) runInContext(read(src), sandbox, { filename: src });
const CC = sandbox.CC;

let fails = 0;
const ok = m => console.log("  ok    " + m);
const bad = m => { console.log("  FAIL  " + m); fails++; };

/* ---- every archetype declares what the docs say it must ---------------- */

console.log("\narchetype contracts");
for (const id of CC.Archetypes.ids()) {
  const a = CC.Archetypes.get(id);
  const cp = a.colorProfile;

  if (!cp) { bad(`${id}: no colorProfile`); continue; }

  /* ARCHETYPE-TEMPLATE and ARCHITECTURE both state this is required: colour
   * depth is derived from `order`, and without it the palette falls back to
   * measured radius, which reintroduces the D12 recolouring bug. */
  if (!cp.order) {
    bad(`${id}: colorProfile.order is missing — required, see ARCHITECTURE.md`);
  } else {
    /* `surface: true` marks a pseudo-role — a cover drawn ON a layer rather
     * than a band in the stack. `order` encodes depth from the surface
     * inward, and a film has no radius of its own, so it is deliberately
     * absent from it. Requiring it there would be asking for a depth that
     * does not exist. */
    const all = Object.keys(cp.layers || {});
    const roles = all.filter(r => !cp.layers[r].surface);
    const missing = roles.filter(r => !cp.order.includes(r));
    const extra = cp.order.filter(r => !roles.includes(r));
    if (missing.length) bad(`${id}: order omits ${missing.join(", ")}`);
    else if (extra.length) bad(`${id}: order lists unknown roles ${extra.join(", ")}`);
    else ok(`${id}: order lists all ${roles.length} stack roles` +
            (all.length > roles.length
              ? ` (+${all.length - roles.length} surface role)` : ""));
  }

  /* Every layer in the stack needs a colour entry, or it renders as the
   * neutral fallback grey and nobody notices until it looks wrong. */
  for (const layer of a.stack) {
    if (!cp.layers[layer.role]) bad(`${id}: no colour profile for role "${layer.role}"`);
  }

  /* Sat/val ranges must be ordered and in gamut.
   *
   * A role carrying `zones` (the frosting) holds its ranges one level down,
   * one set per zone, so those are checked in its place. */
  const colourEntries = [];
  for (const [role, s] of Object.entries(cp.layers || {})) {
    if (s.zones) {
      for (const [zone, zs] of Object.entries(s.zones)) {
        colourEntries.push([role + "/" + zone, zs]);
      }
    } else {
      colourEntries.push([role, s]);
    }
  }

  for (const [role, s] of colourEntries) {
    for (const k of ["sat", "val"]) {
      const r = s[k];
      if (!Array.isArray(r) || r.length !== 2) { bad(`${id}/${role}: bad ${k} range`); continue; }
      if (r[0] > r[1]) bad(`${id}/${role}: ${k} range is inverted`);
      if (r[0] < 0 || r[1] > 1) bad(`${id}/${role}: ${k} range outside 0..1`);
    }
    if (s.hue && (s.hue[0] < 0 || s.hue[1] > 360)) bad(`${id}/${role}: hue outside 0..360`);
  }
}

/* ---- the stack composes at every combination of extremes --------------- */

console.log("\nstack composition (the failure mode in every frac table so far)");

/* A STACK MAY BRANCH, AND EACH BRANCH HAS TO COMPOSE ON ITS OWN.
 *
 * `frac_when: { role: [lo, hi] }` says "this layer sits somewhere else when
 * that layer is present" — a moon's crust is the surface on a bare moon and a
 * sea floor under an ice shell. Composing the declared `frac` values as one
 * flat list then compares layers that never coexist, and reports an overlap
 * that cannot happen.
 *
 * So the branches are enumerated and each is checked as a whole stack: layers
 * that branch take their alternative range, and layers gated on an absent role
 * drop out. Still generic over every archetype and still mechanically
 * true-or-false — adding a family adds no code here. */
function branchesOf(a) {
  const switches = new Set();
  for (const l of a.stack) {
    for (const k of Object.keys(l.frac_when || {})) switches.add(k);
    if (l.presence && l.presence.requires) switches.add(l.presence.requires);
  }
  const keys = [...switches];
  if (!keys.length) return [a.stack];

  const out = [];
  for (let m = 0; m < (1 << keys.length); m++) {
    const on = {};
    keys.forEach((k, i) => { on[k] = !!((m >> i) & 1); });

    /* A switch role that is always present cannot be off, so that branch is
     * not a stack the generator can ever build. */
    let real = true;
    for (const k of keys) {
      const layer = a.stack.find(l => l.role === k);
      if (layer && layer.presence === undefined && !on[k]) real = false;
    }
    if (!real) continue;

    const stack = [];
    for (const l of a.stack) {
      if (l.role in on && !on[l.role]) continue;
      if (l.presence && l.presence.requires && !on[l.presence.requires]) continue;
      let frac = l.frac;
      for (const [k, alt] of Object.entries(l.frac_when || {})) {
        if (on[k]) { frac = alt; break; }
      }
      stack.push({ role: l.role, frac });
    }
    out.push(stack);
  }
  return out;
}

for (const id of CC.Archetypes.ids()) {
  const a = CC.Archetypes.get(id);
  const branches = branchesOf(a);
  let violations = 0;
  let combos = 0;

  for (const stack of branches) {
    const rolled = stack.filter(l => Array.isArray(l.frac));
    combos += 1 << rolled.length;
    for (let m = 0; m < (1 << rolled.length); m++) {
      const at = {};
      rolled.forEach((l, i) => { at[l.role] = l.frac[(m >> i) & 1]; });
      for (let i = 1; i < rolled.length; i++) {
        const above = rolled[i - 1], cur = rolled[i];
        if (at[cur.role] >= at[above.role]) violations++;
      }
    }
  }
  const where = branches.length > 1 ? ` across ${branches.length} branches` : "";
  if (violations) bad(`${id}: frac ranges overlap at ${violations} combinations of extremes${where}`);
  else ok(`${id}: frac ranges stay ordered at all ${combos} extremes${where}`);
}


/* ---- documented colour values still match the code --------------------- */

console.log("\ndocs/celestials/solid-bodies.md vs js/data/archetypes.js");
{
  const doc = read("docs/celestials/solid-bodies.md").split("\n");
  const cp = CC.Archetypes.get("planet").colorProfile;
  /* A role either carries sat/val directly, or — for the frosting, which is
   * four zones rather than one colour — carries a `zones` map whose entries
   * each do. Both shapes are documented as table rows keyed by their own name,
   * so the check descends and treats every zone as a role in its own right. */
  const rows = [];
  for (const [role, s] of Object.entries(cp.layers)) {
    if (s.zones) {
      for (const [zone, zs] of Object.entries(s.zones)) rows.push([zone, zs]);
    } else {
      rows.push([role, s]);
    }
  }

  for (const [role, s] of rows) {
    const row = doc.find(l => l.trim().startsWith("| " + role + " "));
    if (!row) { bad(`no table row documents "${role}"`); continue; }
    const has = v => row.includes(v.toFixed(2));
    const satOK = has(s.sat[0]) && has(s.sat[1]);
    const valOK = has(s.val[0]) && has(s.val[1]);
    const incOK = !!s.incandescent === row.includes("✅");
    if (satOK && valOK && incOK) ok(`${role} matches the documented profile`);
    else bad(`${role}: doc row disagrees with the code`);
  }
}

/* ---- every registered archetype is reachable from the GUI -------------- */

/* THE SUITE AND THE APP READ TWO DIFFERENT LISTS.
 *
 * Everything else here drives archetypes through `CC.Archetypes.ids()`, while
 * the archetype dropdown in index.html is hand-written HTML. So a family can be
 * registered, stack-checked, rendered, presetted and shipped while being
 * literally unreachable in the app — which is exactly what happened to the moon
 * in Session S: every check passed and the option simply was not there.
 *
 * Mechanically true-or-false, and generic over `CC.Archetypes.ids()`, so adding
 * a family still adds no test code — it just has to add its option. */
console.log("\nthe GUI offers every archetype");
{
  const sel = html.match(/<select id="archetype">([\s\S]*?)<\/select>/);
  if (!sel) {
    bad("index.html has no archetype <select> to check");
  } else {
    const offered = [...sel[1].matchAll(/<option value="([^"]+)"/g)].map(m => m[1]);
    const registered = CC.Archetypes.ids();
    const missing = registered.filter(id => !offered.includes(id));
    const extra = offered.filter(id => !registered.includes(id));
    for (const id of missing) bad(`${id} is registered but the dropdown does not offer it`);
    for (const id of extra) bad(`the dropdown offers ${id}, which is not registered`);
    if (!missing.length && !extra.length) {
      ok(`all ${registered.length} archetypes are selectable in the GUI`);
    }
  }
}


/* ---- index.html is the single source of truth for the file list -------- */

console.log("\nfile list");
{
  const listed = [...html.matchAll(/<script\s+src=["']([^"']+)["']/gi)].map(m => m[1]);
  let missing = 0;
  for (const s of listed) {
    try { read(s); } catch { bad(`index.html lists ${s}, which does not exist`); missing++; }
  }
  if (!missing) ok(`all ${listed.length} scripts in index.html exist`);

  /* The constraint the whole project rests on. */
  const modular = listed.filter(s => /^\s*(import|export)\s/m.test(read(s)));
  if (modular.length) bad(`ES module syntax in: ${modular.join(", ")}`);
  else ok("no ES module syntax — the app runs from file://");
}

console.log(fails === 0 ? "\nDOC CHECK PASSED" : `\nDOC CHECK FAILED (${fails})`);
process.exit(fails === 0 ? 0 : 1);
