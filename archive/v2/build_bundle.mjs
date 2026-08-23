/* Bundles src/*.js ES modules into a single classic script.js.
 *
 * Why this exists: the app is developed as ES modules for maintainability,
 * but browsers refuse to load ES modules over file:// (CORS). A released zip
 * has to work by double-clicking index.html with no server, so the shipped
 * artifact is one plain <script> file.
 *
 * The bundler is deliberately minimal rather than a general-purpose tool: it
 * handles exactly the import/export forms this codebase uses.
 *   - import { a, b } from "./x.js"
 *   - import { a as b } from "./x.js"
 *   - export function/const/class
 *   - export { a, b }
 * Everything lands in one shared scope, so top-level names must be unique
 * across modules. The build fails loudly if they aren't.
 *
 * Usage:  node build_bundle.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const ENTRY = resolve(ROOT, "src/main.js");
const OUT = resolve(ROOT, "script.js");

const IMPORT_RE = /^\s*import\s+(?:\{([^}]*)\}|(\w+))?\s*(?:from\s*)?["']([^"']+)["'];?\s*$/gm;
const EXPORT_DECL_RE = /^\s*export\s+(?=(?:async\s+)?(?:function|const|let|var|class)\b)/gm;
const EXPORT_LIST_RE = /^\s*export\s*\{[^}]*\}\s*;?\s*$/gm;

const modules = new Map(); // absPath -> { code, deps }
const order = [];

function load(absPath) {
  if (modules.has(absPath)) return;
  if (!existsSync(absPath)) throw new Error(`Missing module: ${absPath}`);

  const raw = readFileSync(absPath, "utf8");
  const deps = [];

  // Collect dependencies before stripping the import statements.
  for (const m of raw.matchAll(IMPORT_RE)) {
    const spec = m[3];
    if (!spec.startsWith(".")) throw new Error(`Bare import "${spec}" in ${absPath}`);
    deps.push(resolve(dirname(absPath), spec));
  }

  modules.set(absPath, { raw, deps, code: null });
  for (const d of deps) load(d);

  // Depth-first: dependencies are emitted before the module that needs them.
  const code = raw
    .replace(IMPORT_RE, "")
    .replace(EXPORT_LIST_RE, "")
    .replace(EXPORT_DECL_RE, "");

  modules.get(absPath).code = code;
  order.push(absPath);
}

/* Detect top-level name collisions, which would silently break the bundle.
 * Only column-zero declarations count as top-level; anything indented is
 * inside a function or block and cannot collide across modules. */
function checkCollisions() {
  const seen = new Map();
  const declRe = /^(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;
  for (const path of order) {
    const { code } = modules.get(path);
    for (const m of code.matchAll(declRe)) {
      const name = m[1];
      if (seen.has(name)) {
        throw new Error(
          `Duplicate top-level name "${name}" in ${relative(ROOT, path)} ` +
          `(already declared in ${relative(ROOT, seen.get(name))}). ` +
          `Rename one — the bundle shares a single scope.`
        );
      }
      seen.set(name, path);
    }
  }
}

load(ENTRY);
checkCollisions();

const banner =
`/* Celestial Cutaway — generated bundle. DO NOT EDIT.
 * Built from src/ by build_bundle.mjs. Edit the modules under src/ and
 * re-run:  node build_bundle.mjs
 */`;

const body = order
  .map(p => `\n/* ===== ${relative(ROOT, p).replace(/\\/g, "/")} ===== */\n${modules.get(p).code.trim()}\n`)
  .join("\n");

writeFileSync(OUT, `${banner}\n"use strict";\n(function () {\n${body}\n})();\n`, "utf8");

console.log(`Bundled ${order.length} modules -> ${relative(ROOT, OUT)}`);
