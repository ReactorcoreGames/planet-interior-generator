# v2 — archived

**Superseded by v3. Nothing here runs, ships, or is imported by the current
app.** It is kept only as reference material to raid.

Archived 2026-08-16, when the root was cleared for the v3 build.

---

## Why it was superseded

v2 overshot on scope and undershot on visual density — the failure the whole v3
design is a reaction to. See [../../docs/PROJECT-VISION.md](../../docs/PROJECT-VISION.md).

It also **violates two of v3's hard constraints**:

| v2 does | v3 requires |
|---|---|
| ES modules in `src/`, bundled into `script.js` by `build_bundle.mjs` | Plain `<script>` tags in explicit order, **no build step** |
| 3 art styles, hologram overlay | One semi-technical style |

That build step is the important one. In v3, **the `.js` files you edit are the
`.js` files that run.** Do not resurrect `build_bundle.mjs`.

---

## Contents

```
index.html          v2 entry point
script.js           the bundler's output — generated, not hand-written
style.css           v2 styling
src/                v2 source, ES modules (18 files)
build_bundle.mjs    the build step v3 rejects
```

---

## Worth raiding

Per CLAUDE.md, these parts worked and are worth porting (translated out of ES
module syntax):

- **Seeded RNG + value noise** — solid, and v3 needs the same per-stage stream
  split off a master seed
- **HSV colour maths** — the generative palette system builds on this
- **Flare ribbon geometry** — the `ribbon` primitive's shape
- **Layer-stack distribution** — how thicknesses were allocated across a stack

**Everything else, re-derive from the spec set in `docs/`.** The v3 design is
not an incremental change to v2; it's a redesign, and porting v2's structure
would drag its problems along.

---

## Test tooling

`test/` and `package.json` stayed in the root — that harness is still useful and
v3 keeps it. Note that `package.json`'s `build` and `test` scripts reference
`build_bundle.mjs` in here, so **they need rewriting for v3** before use.
