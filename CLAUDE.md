# Celestial Cutaway — Project Conventions

*Read this first. These are locked decisions, not suggestions.*

---

## What this is

A browser tool that generates **cross-section illustrations of celestial
bodies** for sci-fi worldbuilding, TTRPGs, and games. See
[docs/PROJECT-VISION.md](docs/PROJECT-VISION.md) for the why.

---

## Hard technical constraints

These were decided deliberately. Do not "improve" them without asking.

| Rule | Why |
|---|---|
| **Plain HTML/CSS/JS only** | The codebase must stay open and readable. Anyone can open the folder and understand it. |
| **No ES modules** | Ordinary `<script>` tags in explicit order in `index.html`. No `import`/`export`. |
| **No bundler, no compile step, no transpile** | The `.js` files you edit are the `.js` files that run. |
| **No frameworks** | No React/Vue/Svelte/jQuery. |
| **No Node.js at runtime** | The app is static files. Node exists only for optional dev testing. |
| **Canvas 2D for rendering** | Handles thousands of elements at speed; trivial PNG export. |
| **Libraries: vendored, single-file, tiny** | Dropped into `lib/`, committed to the repo, loaded by `<script>`. No npm for anything the app needs. |
| **≤ 500 lines per file** | Split by responsibility when a file gets long. |

**Approved libraries:** `simplex-noise` (noise), `d3-delaunay` (Voronoi, for
asteroid interiors). Ask before adding others.

### Why no ES modules

They were considered and **rejected**. They need a server (CORS blocks
`file://`), which adds a hoop between "clone the repo" and "it works". Script
tags with explicit ordering are enough and keep the project trivially open.

---

## Repository layout

```
index.html            script tags in dependency order
style.css
js/                   application source, ≤500 lines each
lib/                  vendored third-party (committed)
docs/                 the spec set — read before building
tools/                dev-only helpers; never shipped
launch_app_win.bat    starts the local server for dev
build_release.bat     copies shippable files into dist/
dist/                 generated; gitignored
```

**`dist/` is a copy, not a build.** No compilation, no minification, no
concatenation. It exists so there's a clean folder to zip for itch.io.

---

## Dev tooling stance

Dev dependencies (`node_modules/`) are **allowed for testing only**, and are
gitignored. They are never required to run, develop, or ship the app.

The available harness:
- **jsdom** — loads the real `index.html` and drives the UI, catching crashes
  and broken wiring.
- **@napi-rs/canvas** — real rasterizer, so renders can be produced and
  visually checked.
- **stub canvas** (`test/stubcanvas.mjs`, no deps) — records every 2D call and
  flags NaN geometry, malformed colours, and unbalanced save/restore.

**Keep the suite small.** It was deliberately cut in Session J from ~4 minutes
to ~30 seconds. A check earns its place only if it is **mechanically
true-or-false** *and* **generic over `CC.Archetypes.ids()`** — adding a body
family must add no test code. Tests that encode judgement (colour harmony, stat
phrasing, export layout) were deleted because they cause false corrections: a
future session "fixes" working code to satisfy a stale opinion. **Whether the
output looks good is the user's call, made by looking at the app.** Do not add
tests unless asked, and do not resurrect `sweep.mjs`, `stats.mjs` or
`composed.mjs`. See PROGRESS.md → Test suite.

**The rule: if it isn't in `index.html`'s script tags, it isn't part of the
app.** Test tooling weighing 50MB is fine. Shipping 1KB the app doesn't need is
not.

---

## Working style for this project

- **The user can see the screen.** For anything visual, render it and let them
  look — don't assert that it looks good.
- **Density is the aesthetic thesis.** When unsure, draw *more* elements,
  smaller and fainter, in 2–3 size tiers. Sparse output is the failure mode.
- **Believable beats accurate.** Physical realism loses whenever it fights
  visual interest. But numbers must never contradict the picture.
- **Stats are for laypeople.** Metric, with a relatable comparison. "Hot enough
  to melt lead" beats "601 K". Never `8.67 km/s` with no explanation.
- **Traits are global and structural.** If a quirk isn't visible at a glance,
  it isn't a trait.
- **One art style.** Semi-technical. Not a menu of styles.

---

## Reference docs

| Doc | Contents |
|---|---|
| **`docs/PROGRESS.md`** | **Build checklist + decisions log. Read this first — it supersedes the specs where they disagree** |
| `docs/PROJECT-VISION.md` | Why this exists, who it's for, what good output is |
| `docs/ARCHITECTURE.md` | Systems, pipeline, rendering model |
| `docs/TRAIT-SYSTEM.md` | The trait placement grammar |
| `docs/celestials/*.md` | Per-family: layers, colours, details, traits |
| `docs/MACHINE-WORLDS.md` | Artificial bodies and megastructures |
| `docs/PARAMETERS.md` | Every setting and GUI control |
| `docs/HAZARDS.md` | Hazard, condition and flavour text pools |
| `docs/ROADMAP.md` | MVP scope and build phases |
| `docs/CLIMATE-PLAN.md` | **Planned, not built.** Design for the climate system: polar caps, sea ice, Orbital distance |

---

## Version history

- **v1** — original single-file generator. 4 body types, fixed palettes.
- **v2** — ES-module overhaul: 3 art styles, hologram overlay, derived stats,
  features. Overshot in scope, undershot on visual density. **Superseded.**
- **v3** — full redesign from the spec set above. Plain scripts, one style,
  trait grammar, generative colour, high visual density.

v2 code worth raiding: seeded RNG + value noise, HSV colour maths, the flare
ribbon geometry, layer-stack distribution. Everything else re-derive.
