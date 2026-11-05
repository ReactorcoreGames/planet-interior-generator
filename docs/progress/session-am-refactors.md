# Session AM — the five stage refactors

*Phase 9c, block AM. D323. Checklist: [phase-9c-cleanup.md](../roadmap/phase-9c-cleanup.md). Move code, change no pixel.*

## The result

All five files are refactored, one commit each. After every step the 310 reference renders from AL were byte-identical, the `CC` surface kept all 11,338 paths (236 added), the real page through jsdom hashed the same, and `npm test` passed. No file in `js/` is over 500 lines now; the largest are `js/gen/stats/asteroid.js` at exactly 500 and `js/draw/scene-outward.js` at 496.

| File | Was | Now |
|---|---|---|
| `js/draw/scene.js` | 1457 | `scene.js` 450, `scene-outward.js` 496, `scene-interior.js` 411, `scene-surface.js` 327 |
| `js/gen/palette.js` | 1229 | `palette.js` 334, `palette-util.js` 175, `palette-hue.js` 254, `palette-value.js` 350, `palette-layer.js` 170, `palette-bands.js` 277 |
| `js/gen/traitroll.js` | 1220 | `traitroll.js` 351, `traitselect.js` 128, `traitanchor.js` 301, `traitplace.js` 329, `traitfinish.js` 281 |
| `js/gen/details.js` | 1066 | `details.js` 415, `details-traits.js` 176, `details-terrain.js` 308, `details-instances.js` 307 |
| `js/gen/structure.js` | 787 | `structure.js` 478, `structure-resolve.js` 362, `structure-wobble.js` 71 |

## How it was done (D323)

**The idiom.** The original function builds one state object and calls its stages in the original order, and that is all it does. A stage starts by taking the fields it needs as local names, so the moved body reads as it did, and ends by writing back what a later stage reads. The split files attach to the source's namespace and load straight after it, as in AL. `render`, for example, is now a list of calls from `paintBackground` to the scale bar, and the draw order can be read straight off it.

**Two levels in the palette.** A layer's passes share a second object beside the body's: `st` is the body, `c` is the layer being coloured. Its `h`, `s` and `v` are what the passes hand each other. The per-layer RNG stays one stream on `c`, so the draws land in the same order.

**The state is called `sc` in the scene**, because the surface passes already use `st` as a loop variable, and `st` everywhere else.

**The code was copied, not retyped.** `test/_tmp/_amcut.mjs` builds the new files from line ranges of the old one, with the specs in `test/_tmp/_amspecs/`. It refuses to write if any non-blank source line is left unaccounted for, so nothing can fall on the floor unless a spec says so. Moved comments came across byte for byte apart from re-indenting.

**What the checks caught.** `no-undef` found every slip the first time it ran: `seed` not handed to `thinSectors`, `params` to `waiveForExotic`, a `reachOf` left bare in `lens`. No render ever differed, so no difference had to be explained.

## Where the table did not fit

Each was settled by the rules, so none was brought as a question. All are worth a look.

| Row | What the table said | What was done, and why |
|---|---|---|
| `scene.js` | three files, `render` keeps the order and the view/lens helpers | As asked, and `bandFill` stays in `scene.js` too. It is a helper the bands and fluids both call, and `scene-interior.js` was 555 lines with it |
| `palette.js` | `palette-util.js`; `build` as anchors, per-layer derivation (by role), separation, orbital band | **Six files.** The per-layer derivation alone is 560 lines, so it became hue passes, value passes and a driver. "By role" does not fit the code: the passes key on layer properties (`heatLean`, `climateLean`, `exotic`), which is the rule that keeps role names out, so they are cut by pass. Separation, the orbital band, `emitted` and `deep` share `palette-bands.js`: everything settled once all the layers have a colour |
| `details.js` | `details-traits.js`, `details-instances.js` | **A third file, `details-terrain.js`.** The table's two left about 560 lines. A layer's terrain, film mask and sea level, and the `ground` functions that read them, are the natural unit |
| `traitroll.js` | `traitselect.js`, `traitanchor.js`; `placeOne` by placement kind → `traitplace.js` | **A fourth file, `traitfinish.js`.** `placeOne` has no placement kinds: it is one sequence, so it is cut by pass. The 498 lines would not fit one file under 500, so count, bearings, recipe and build are in `traitplace.js`, and the stamps, floor and companions are in `traitfinish.js` |
| `structure.js` | `structure-resolve.js`, `structure-wobble.js` | As asked, plus the layer record (`makeLayer`, 141 lines, mostly comments) in `structure-resolve.js`, which `structure.js` needed to get under 500 |

Also moved in passing, no change of meaning: in `traitanchor.js`, `traitDepth`'s comment now sits above `traitDepth`, where it had drifted above `orbitBand`, and `groundTop` got a one-line comment of its own.

Comments that named a moved thing's old home were corrected: 81 lines across 49 files, each checked against its exact line. Three of them were already stale before this session and pointed at `draw/scene.js` for code that had moved to `draw/emissive.js`. Mentions of a stage as a whole ("`gen/details.js`") were left alone, since they are still true. `scene-interior.js` keeps one existing unused local, `dTerrain`: this session moves code, and that is not a move. ARCHITECTURE.md's file layout is left for AN, as planned.

## Not checked

The real browser. jsdom and the renders cover the code, and nothing in `main.js` or the panel moved this time, but the script tags did: 19 new files. Worth opening the app once.

## Files

- `js/draw/scene-outward.js`, `scene-interior.js`, `scene-surface.js`, from `js/draw/scene.js`
- `js/gen/palette-util.js`, `palette-hue.js`, `palette-value.js`, `palette-layer.js`, `palette-bands.js`, from `js/gen/palette.js`
- `js/gen/traitselect.js`, `traitanchor.js`, `traitplace.js`, `traitfinish.js`, from `js/gen/traitroll.js`
- `js/gen/details-traits.js`, `details-terrain.js`, `details-instances.js`, from `js/gen/details.js`
- `js/gen/structure-resolve.js`, `structure-wobble.js`, from `js/gen/structure.js`
- `index.html`, the script tags; comments across `js/`, the old paths
- `docs/PROGRESS.md`, `docs/roadmap/phase-9c-cleanup.md`, `docs/progress/README.md`, recorded

## The prompt for the next session (Session AN)

> Phase 9c, Session AN: close 9c. Read CLAUDE.md, docs/PROGRESS.md, docs/roadmap/phase-9c-cleanup.md (the 9c checklist; your block is **AN**) and docs/progress/session-am-refactors.md (block AM, D323). Next free decision number: D324. Start a new session log, docs/progress/session-an-close-9c.md, added to docs/progress/README.md.
>
> The block has three items. **ARCHITECTURE.md § File layout, rewritten from the real tree**: list `js/` as it now stands, including the split files from AL and AM and the load-order idiom they share (the source file first, its split files straight after, attached to its namespace), and check every path against `index.html`'s script tags, so that the doc cannot name a file that does not exist. **PROGRESS.md, ROADMAP.md, phase-9-10.md and the checklist mark 9c complete.** **Write the prompt for Phase 10, the release**: the user's release prompt is docs/RC prompt to make releases easier.md; read it and build the prompt on it rather than restating it.
>
> No code should change in this session. If one does, `sh test/_tmp/_alstep.sh <files>` runs the line counts, `no-undef`, the 310 renders against `shots/al/ref/`, the real page through jsdom, and `npm test`; if `shots/al/ref/` has been cleared, regenerate it with `node test/_tmp/_albase.mjs ref` and `node test/_tmp/_alpage.mjs hash > shots/al/page-ref.json` before touching anything. Also ask the user to open the app once in the real browser if they have not since AM: 19 script tags were added, and the harness does not cover layout.
>
> **How to run each step: lead with your recommendation.** The docs are mechanical, so do them and show me a short summary, with no questions unless something is ambiguous: a claim in a doc you cannot square with the code, or a checklist item that may not be done. When you do bring me something, read the code first and bring: what it is in one or two lines, **"Recommend: …"** with the reason, and the alternatives in a line each (the recommended one first). I should be able to answer "yes" or pick a letter; don't leave me with an open "keep or change?". Then tick the checklist, commit and push.
>
> Rules as ever: plain scripts, ≤500 lines per file, no ES modules, no new tests unless asked, render for me rather than asserting it looks good, deletions go to C:\trash, no hard-wrapped prose in markdown.
