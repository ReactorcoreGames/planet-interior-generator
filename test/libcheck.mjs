/* Smoke test for the vendored libraries in lib/.
 *
 * These must be CLASSIC scripts that expose a global when evaluated by a plain
 * <script> tag — the npm ES-module builds of both packages will NOT work under
 * the project's no-build-step rule. This test loads each file the same way a
 * browser would and checks the global appears and behaves.
 *
 * Run: node test/libcheck.mjs
 */

import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  runScripts: "outside-only"
});
const w = dom.window;

const fails = [];
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label}${detail ? "  " + detail : ""}`);
  if (!ok) fails.push(label);
};

// Evaluate exactly as a <script src> would.
w.eval(readFileSync(`${ROOT}/lib/simplex-noise.js`, "utf8"));
w.eval(readFileSync(`${ROOT}/lib/delaunay.js`, "utf8"));

console.log("\nsimplex-noise");
check("exposes global SimplexNoise", typeof w.SimplexNoise === "function");

const sn = new w.SimplexNoise("seed-abc");
const a = sn.noise2D(1.5, 2.5);
check("noise2D returns a finite number", Number.isFinite(a), a.toFixed(6));
check("noise2D stays in [-1,1]", a >= -1 && a <= 1);
check("noise3D present", typeof sn.noise3D === "function");
check(
  "same seed = same output",
  a === new w.SimplexNoise("seed-abc").noise2D(1.5, 2.5)
);
check(
  "different seed = different output",
  a !== new w.SimplexNoise("different-seed").noise2D(1.5, 2.5)
);

console.log("\nd3-delaunay");
check("exposes global d3.Delaunay", typeof w.d3?.Delaunay === "function");

const pts = [[0, 0], [100, 0], [50, 80], [20, 60], [90, 70]];
const voronoi = w.d3.Delaunay.from(pts).voronoi([0, 0, 120, 100]);
check("builds a voronoi diagram", !!voronoi);
check(
  "every site yields a polygon",
  pts.every((_, i) => (voronoi.cellPolygon(i) || []).length > 2),
  `${pts.length} cells`
);

console.log(
  fails.length
    ? `\n${fails.length} check(s) FAILED\n`
    : "\nAll library checks passed.\n"
);
process.exit(fails.length ? 1 : 0);
