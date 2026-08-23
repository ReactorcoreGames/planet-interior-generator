# Vendored libraries

Third-party code, **committed to the repo** and loaded by ordinary `<script>`
tags. No npm install is needed to run the app.

Verify with `npm run test:lib` (or `node test/libcheck.mjs`).

| File | Package | Version | Global | Licence |
|---|---|---|---|---|
| `simplex-noise.js` | [simplex-noise](https://github.com/jwagner/simplex-noise.js) | **2.4.0** | `SimplexNoise` | MIT |
| `delaunay.js` | [d3-delaunay](https://github.com/d3/d3-delaunay) | **6.0.4** | `d3.Delaunay` | ISC |

---

## Why these exact builds

**Both must be classic scripts that set a global.** The project has no build
step — see [../CLAUDE.md](../CLAUDE.md) — so anything requiring `import` is
unusable.

**simplex-noise is pinned to v2.4.0 deliberately.** Version 4 onward is
**ESM-only** and exports a factory instead of a constructor; it cannot be loaded
with a `<script>` tag. v2.4.0 is the last classic-script release and takes a
seed string directly:

```js
const noise = new SimplexNoise("my-seed");
noise.noise2D(x, y);   // -1 .. 1
noise.noise3D(x, y, z);
```

Do not "upgrade" this to v4 — it will break the app, and the fix would be a
bundler.

**delaunay.js is the UMD build** from `d3-delaunay@6/dist/d3-delaunay.min.js`,
which attaches to `d3`. The package's default entry is ESM and won't load.

```js
const voronoi = d3.Delaunay.from(points).voronoi([x0, y0, x1, y1]);
voronoi.cellPolygon(i);   // [[x,y], ...]
```

`d3-delaunay` has one dependency, `delaunator`, already inlined in this UMD
bundle — no second file needed.

---

## Adding another library

Per CLAUDE.md the bar is high: **vendored, single-file, tiny, and classic-script
only.** Ask before adding one. If the only available build is an ES module, the
answer is no — that would require the build step the project rejects.

Add a row above and a check to `test/libcheck.mjs` for anything new.
