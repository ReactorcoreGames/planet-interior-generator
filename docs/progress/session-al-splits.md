# Session AL — the eighteen straightforward splits

*Phase 9c, block AL. D322. Checklist: [phase-9c-cleanup.md](../roadmap/phase-9c-cleanup.md). Move code, change no pixel.*

## The result

All eighteen files are split, one commit each. After every split the whole reference set was byte-identical to the renders made before the first one, and `npm test` passed. The only files left over 500 lines are the five stage refactors that are block AM: `js/draw/scene.js` (1457), `js/gen/palette.js` (1229), `js/gen/traitroll.js` (1220), `js/gen/details.js` (1066), `js/gen/structure.js` (787). `js/gen/stats/asteroid.js` sits exactly at 500.

Re-measuring at the start changed one row: `stellar-common.js` was 541, not 598, since AK took its hue bands out. It still needed its split.

## How it was checked (D322)

The prompt's set is every archetype × 3 seeds × with and without traits, plus every preset: 142 cells. Three seeds do not reach everything, and the failure a split risks is a helper left behind, which throws only when its branch runs. So the set grew, and three checks joined it:

- **310 frozen cells**, `test/_tmp/_alcells.json`, each the real page's `gather()` output with every control explicit. On top of the 142: every trait forced on the first and last body that may carry it, and each body at low and high control extremes, tidally locked with labels and scale bar on a transparent ground, and at a warm mid setting with a starfield; plus the nebula's two other forms. PNGs in `shots/al/ref/`, compared byte for byte by `test/_tmp/_albase.mjs cmp` (about 60 seconds across 12 processes). Two runs before any change matched, so the render is deterministic.
- **The `CC` surface.** The same script walks every namespace, archetype, trait and preset to 11,338 paths and requires each to keep its value, plus the order of the archetype, trait and preset registries. A function's text may change; a value going `undefined` may not. Additions are allowed.
- **The real page.** `test/_tmp/_alpage.mjs hash` drives `index.html` in jsdom through every archetype and preset, and hashes the settings, body, colours, elements and card. The headless renders never run `main.js`, so this is what covers the `main.js` split.
- **`no-undef`**, `test/_tmp/_allint.mjs`, ESLint kept in the gitignored `test/_tmp/_lint/` and never in `package.json`. It finds a missed reference without having to reach the branch, and it did: two bare names in `main.js`'s `ExportUI.init` call. The one known hit is `SimplexNoise`, the vendored global.

The splits were cut by `test/_tmp/_alsplit.mjs`, which uses scope analysis rather than text search, so a local variable that shares a moved name is not rewritten. `map` lists a file's top-level declarations with sizes and dependencies; `apply` takes a spec from `test/_tmp/_alspecs/`.

## The idiom

The one `zonepaint/sea.js` already used: the source file loads first and keeps its namespace, and each split file loads straight after it and attaches to that namespace, so no outside caller is renamed. A split file takes what it needs from the namespace as aliases at its head; the source reaches split-off code as `CC.X.name`, at call time. Only `TAU` and `clamp`-style one-liners are redeclared.

The namespaces gained 178 paths, the shared internals. New namespaces only where the code runs in the other direction: `CC.Gather` and `CC.Sync` load before `main.js`, `CC.PlanetFilm` before `solid.js` (as `CC.MoonFilm` before `solid-moon.js`), and `CC.GaseousCommon` before the two giants.

## Where the table did not fit

Each was settled by the rules, so none was brought as a question. All are worth a look.

| Row | What the table said | What was done, and why |
|---|---|---|
| `film.js` | `featherEnds` → `frostpaint.js` | → `film-zones.js`, with the two colour blends. `frostpaint.js` would have been 531 lines, and feathering is geometry rather than paint |
| `details.js` | four files | **Five**: `details-tone.js` added. The table's four left 672 lines; `zoneShift`, `heatShift` and `toneColour` were the natural fifth |
| `elemgen.js` | through `registerBuilder` | As asked, so `build`'s `switch` is gone: every kind registers, and an unregistered kind is a plain scatter as before |
| `main.js` | `gather`, the syncs | Also `CONTROL_SPECS` and the stage keys into `gather.js`, since the table's cut left 595 lines. `traitSalt` stays in `main.js`, where Re-roll bumps it, and is handed in |
| `traits/gaseous.js` | miners, skimmers → `giant-built.js` | → **new `gaseous-built.js`**. `giant-built.js` loads ahead of the solid traits, and registration order is roll order: merging would change every giant's traits. The rule "no pixel" decides it. Merging is a separate decision, and would change renders |
| `solid.js` | film and axis tables | Published as `CC.PlanetFilm`. `PLANET` was one 606-line literal, so the two tables became named values, re-indented |
| `frosting.js` | thermal variants and helpers | The block inside `resolve` became `addThermalVariants(out, keys, rolled, arid, helpers)`. `ordinaryKey` went too, because `frosting.js` was still at 505 |

Three files no longer exist, because the table moved everything out of them: `draw/primitives/orbital.js`, `data/traits/gaseous.js`, `data/archetypes/gaseous.js`. They are in `C:\trash\al-splits`.

Comments that named a moved thing's old home were corrected (41 lines across 34 files), found by listing every mention of a moved name beside its old file. `Split out of …` lines keep the old name, as history. ARCHITECTURE.md's file layout is left for AN, as planned.

Two small departures: `orbital.js` and `primitives.js` were split before `presets.js` and `main.js`, out of the checklist's order, because a failed presets script was fixed after them. That same failed run left four preset family files in the working tree, and they went into the `orbital.js` commit, unreferenced until the presets commit. No render at any commit is affected, so history was left alone.

## Not checked

The real browser. jsdom and the renders cover the code, but `main.js`'s `init` moved, and layout-dependent defects do not show in the harness. Worth opening the app once.

## Files

- `js/draw/film-zones.js`, `frostpaint.js`, `frost.js`, from `js/draw/film.js`
- `js/draw/details-tone.js`, `details-gas.js`, `details-star.js`, `details-mosaic.js`, `relief.js`, from `js/draw/details.js`
- `js/gen/elemgen-basic.js`, `elemgen-mosaic.js`, `elemgen-family.js`, from `js/gen/elemgen.js`
- `js/data/presets-solid.js`, `presets-gaseous.js`, `presets-stellar.js`, `presets-moon.js`, `presets-asteroid.js`, from `js/data/presets.js`
- `js/draw/primitives/orbital-rings.js`, `orbital-storm.js`, `orbital-rocks.js`, replacing `orbital.js`
- `js/ui/gather.js`, `js/ui/sync.js`, from `js/main.js`
- `js/draw/primitives/vein.js`, `flow.js`, from `js/draw/primitives.js`
- `js/gen/climate-baseline.js`, from `js/gen/climate.js`
- `js/data/traits/gaseous-weather.js`, `gaseous-precip.js`, `gaseous-built.js`, replacing `traits/gaseous.js`
- `js/data/archetypes/gaseous-common.js`, `gaseous-gas-giant.js`, `gaseous-ice-giant.js`, replacing `archetypes/gaseous.js`
- `js/draw/background.js`, from `js/draw/canvas.js`
- `js/data/archetypes/solid-film.js`, from `solid.js`
- `js/draw/primitives/stellar-spots.js`, from `stellar.js`
- `js/draw/zonepaint/outward.js`, from `js/draw/zonepaint.js`
- `js/data/archetypes/stellar-limb-data.js`, from `stellar-common.js`
- `js/gen/frosting-thermal.js`, from `js/gen/frosting.js`
- `js/data/traits/stellar-corona.js`, from `stellar-magnetic.js`
- `js/draw/boundary.js`, from `js/draw/layers.js`
- `index.html`, the script tags; `docs/MACHINE-WORLDS.md`, `test/film.mjs` and comments across `js/`, the old paths
- `docs/PROGRESS.md`, `docs/roadmap/phase-9c-cleanup.md`, `docs/progress/README.md`, recorded

## The prompt for the next session (Session AM)

> Phase 9c, Session AM: the five stage refactors. Read CLAUDE.md, docs/PROGRESS.md, docs/roadmap/phase-9c-cleanup.md (the 9c checklist; your block is **AM**) and docs/progress/session-al-splits.md (block AL, D322). Next free decision number: D323. Start a new session log, docs/progress/session-am-refactors.md, added to docs/progress/README.md.
>
> **Move code, change no pixel.** Each function's numbered passes become stage functions sharing one state object; the original function keeps the order of the passes and nothing else. Re-measure first: scene.js 1457, palette.js 1229, traitroll.js 1220, details.js 1066, structure.js 787. The reference set from AL is still valid, because AL changed no pixel: `node test/_tmp/_albase.mjs cmp` compares 310 cells against `shots/al/ref/` and checks the `CC` surface. If `shots/al/ref/` has been cleared, regenerate it with `node test/_tmp/_albase.mjs ref` and `node test/_tmp/_alpage.mjs hash > shots/al/page-ref.json` BEFORE touching any code. `sh test/_tmp/_alstep.sh <files>` runs everything after a step: the line counts, `no-undef`, the renders, the real page through jsdom, `npm test`. `sh test/_tmp/_alc.sh - "<message>" <files>` does that and commits if all of it passes. Watch for: RNG draw order (a stage must make the same draws in the same order, which the renders catch), and variables a pass reads from an earlier one, which become fields on the state object. `test/_tmp/_alsplit.mjs map <file>` lists a file's top-level declarations and dependencies, and `apply` cuts a spec like those in `test/_tmp/_alspecs/`, but these refactors reach inside one function, so most of it is by hand.
>
> **How to run each step: lead with your recommendation.** The refactors are mechanical, so do them and show me a short summary, with no questions unless something is ambiguous: a split the table proposes that does not fit the code as it stands, or a file that no longer needs one. When you do bring me something, read the code first and bring: what it is in one or two lines, **"Recommend: …"** with the reason, and the alternatives in a line each (the recommended one first). I should be able to answer "yes" or pick a letter; don't leave me with an open "keep or change?". A difference in any render stops the step: find it, and tell me, rather than accepting it. Then tick the checklist, commit and push, and write the prompt for Session AN at the end of the log, with the same "lead with a recommendation" instruction.
>
> Rules as ever: plain scripts, ≤500 lines per file, no ES modules, no new tests unless asked, render for me rather than asserting it looks good, deletions go to C:\trash, no hard-wrapped prose in markdown.
