# Celestial Cutaway — Project Conventions

*Read this first. These are locked decisions, not suggestions.*

---

## What this is

A browser tool that generates **cross-section illustrations of celestial bodies** for sci-fi worldbuilding, TTRPGs, and games. v4.0 is released: free in the browser and paid offline on itch.io, under the custom `LICENSE`. Work from here is maintenance, changes and new features, as the user asks. See [docs/PROJECT-VISION.md](docs/PROJECT-VISION.md) for the why.

**Publishing is the user's.** Do not post or upload to itch.io, Reddit or any other outside service, or edit the GitHub repo's description or tags. Commits and pushes continue as usual, but the repo is public, so look at what a commit adds.

**Do not call the project "open source"** (D325). The source is public to read, and the terms are in `LICENSE`.

---

## Hard technical constraints

These were decided deliberately. Do not "improve" them without asking.

| Rule | Why |
|---|---|
| **Plain HTML/CSS/JS only** | The codebase must stay open and readable. Anyone can open the folder and understand it. |
| **No ES modules** | Ordinary `<script>` tags in explicit order in `index.html`. No `import`/`export`. They need a server (CORS blocks `file://`), and a buyer double-clicks `index.html`. |
| **No bundler, no compile step, no transpile** | The `.js` files you edit are the `.js` files that run. |
| **No frameworks** | No React/Vue/Svelte/jQuery. |
| **No Node.js at runtime** | The app is static files. Node exists only for optional dev testing. |
| **Canvas 2D for rendering** | Handles thousands of elements at speed; trivial PNG export. |
| **Libraries: vendored, single-file, tiny** | Dropped into `lib/`, committed to the repo, loaded by `<script>`. No npm for anything the app needs. |
| **≤ 500 lines per file** | Split by responsibility when a file gets long. |

**Approved libraries:** `simplex-noise` (noise), `d3-delaunay` (Voronoi, for asteroid interiors). Ask before adding others.

**If it isn't in `index.html`'s script tags, it isn't part of the app.** Test tooling weighing 50MB is fine. Shipping 1KB the app doesn't need is not.

---

## Repository layout

```
index.html            script tags in dependency order
style.css
js/                   application source, ≤500 lines each
lib/                  vendored third-party (committed)
LICENSE               custom licence; ships in the zips
README.md  guide.md   ship in the zips
promo/                store images; ships in the zips
promo.md              store copy and marketing; internal, never shipped
docs/                 specs and the decisions log
test/                 dev-only harness; never shipped
test/_tmp/            probes; gitignored
launch_app_win.bat    starts a local server for dev; never shipped
build_release.bat     copies shippable files into dist/ and makes the zips
dist/                 generated; gitignored
shots/                generated renders; gitignored, cleared freely
trailer/              the YouTube video and its music; gitignored, never shipped
old wip/              v1/v2 code, finished plans; gitignored
```

**`dist/` is a copy, not a build.** No compilation, no minification, no concatenation.

**A new release:** change the version in `build_release.bat`, Help's footer in `index.html`, and `package.json`, then run the bat. It ends in `pause`, so feed it input when running it yourself. It writes the zip entries itself on purpose (D334): `Compress-Archive` puts backslashes in the names, which can break the app on itch.

---

## Dev tooling and tests

Dev dependencies (`node_modules/`) are **allowed for testing only**, and are gitignored. They are never required to run, develop, or ship the app.

- **jsdom** loads the real `index.html` and drives the UI, catching crashes and broken wiring.
- **@napi-rs/canvas** is a real rasterizer, so renders can be produced and checked by eye.
- **Stub canvas** (`test/stubcanvas.mjs`, no deps) records every 2D call and flags NaN geometry, malformed colours, and unbalanced save/restore.
- **Headless Edge** shows the real GUI and has the real font metrics, so anything with text or the interface comes from it (D331). It runs over its debugging port with a throwaway profile and nothing installed; write a small driver for it under `test/_tmp/` when needed.

**Keep the suite small.** `npm test` takes about 30 seconds. A check earns its place only if it is **mechanically true-or-false** *and* **generic over `CC.Archetypes.ids()`**, so adding a body family adds no test code. Tests that encode judgement cause false corrections: a future session "fixes" working code to satisfy a stale opinion. **Whether the output looks good is the user's call, made by looking at the app.** Do not add tests unless asked, and do not resurrect `sweep.mjs`, `stats.mjs` or `composed.mjs`. See PROGRESS.md → Test suite.

**A refactor must change no pixel.** Before touching anything, run `node test/_tmp/_albase.mjs ref` and `node test/_tmp/_alpage.mjs hash > shots/al/page-ref.json`; after each change, `sh test/_tmp/_alstep.sh <files>` runs the line counts, `no-undef`, the 310 renders, the real page and `npm test`.

---

## Working style for this project

- **The user can see the screen.** For anything visual, render it and let them look — don't assert that it looks good.
- **Lead with a recommendation.** Bring what it is, "Recommend: …" with the reason, and the alternatives in a line each.
- **Density is the aesthetic thesis.** When unsure, draw *more* elements, smaller and fainter, in 2–3 size tiers. Sparse output is the failure mode.
- **Believable beats accurate.** Physical realism loses whenever it fights visual interest. But numbers must never contradict the picture.
- **Stats are for laypeople.** Metric, with a relatable comparison. "Hot enough to melt lead" beats "601 K". Never `8.67 km/s` with no explanation.
- **Traits are global and structural.** If a quirk isn't visible at a glance, it isn't a trait.
- **One art style.** Semi-technical. Not a menu of styles.
- **Deletions go to `C:\trash`**, never a permanent delete.
- **The copy counts from the data.** A change to body types, presets, traits or controls can make the numbers in `README.md`, `guide.md`, `promo.md` and the `promo/` images wrong, so recount them and tell the user.

---

## Reference docs

| Doc | Contents |
|---|---|
| **`docs/PROGRESS.md`** | **Current status, the test suite, accepted behaviour. It supersedes the specs where they disagree** |
| `docs/ARCHITECTURE.md` | Systems, pipeline, rendering model, the file layout in load order |
| `docs/ARCHETYPE-TEMPLATE.md` | Fill-in sheet for a new body type |
| `docs/TRAIT-SYSTEM.md` | The trait placement grammar |
| `docs/celestials/*.md` | Per-family: layers, colours, details, traits |
| `docs/MACHINE-WORLDS.md` | Artificial bodies and megastructures |
| `docs/PARAMETERS.md` | Every setting and GUI control |
| `docs/HAZARDS.md` | Hazard, condition and flavour text pools |
| `docs/PROJECT-VISION.md` | Why this exists, who it's for, what good output is |
| `docs/roadmap/climate-foundation.md` | Read before anything that touches temperature |
| `docs/progress/` | The decisions log, one file per session. The code cites decision numbers (`D123`), and `README.md` there is the index |

**Moved citations.** Comments in `js/` cite `ASTEROID-OVERHAUL`, `CLIMATE-PLAN` and a few finished phase files. Those are in the gitignored `old wip/docs-archive/` and `old wip/docs-roadmap/`, and in git history up to commit 302550a (D337). The comments stand on their own, so reading the plans is rarely needed.

---

## Version history

- **v1** — original single-file generator. 4 body types, fixed palettes.
- **v2** — ES-module overhaul: 3 art styles, hologram overlay, derived stats, features. Overshot in scope, undershot on visual density. **Superseded.**
- **v3** — full redesign from the spec set above. Plain scripts, one style, trait grammar, generative colour, high visual density.
- **v4** — the same codebase as v3, finished and released. Fourteen body types (adds the neutron star, pulsar, black hole, nebula and machine world, with the asteroid reworked), megastructures such as Dyson shells and ringworlds, layer labels and a scale bar, saved settings, the full keyboard map, every file split to ≤500 lines. Free in the browser, paid offline, under a custom licence.
