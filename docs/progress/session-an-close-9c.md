# Session AN — closing Phase 9c

*Phase 9c, block AN. No decisions, so D324 is still free. Checklist: [phase-9c-cleanup.md](../roadmap/phase-9c-cleanup.md). Docs only: no file in `js/`, `index.html`, `style.css` or `lib/` changed.*

## The result

Phase 9c is complete. `npm test` passes.

**ARCHITECTURE.md § File layout is rewritten from the real tree.** It lists every script, folder by folder, in load order. It also gains the load-order idiom, a table of where each pipeline stage starts, and notes corrected to the split files. The old section still listed only about 30 of the 245 scripts, marked shipped files as planned, and named the deleted `sweep.mjs`.

**The check was mechanical.** A throwaway script read the code block and compared it with the tree and with `index.html`: 255 files named, all of them exist; all 245 script tags are listed; none is listed twice; everything listed under `js/` and `lib/` is a tag; and each folder's order matches the load order. It lived in the scratchpad and is not a new test.

## The idiom, as the code has it

The AM prompt described one idiom: the source first, its split files straight after, attached to its namespace. That holds, but the code has more, so the doc records all of it:

- **Two ways to spread a namespace.** A split file as described, and the older family registry: `registry.js` creates the namespace and each family file registers into it. `presets.js` and `primitives.js` work the same way.
- **Three exceptions, each because something is read at load.** `solid-film.js` and `solid-moon-film.js` load *before* the archetypes that read their tables, under their own namespaces. `stats/stellar-derive.js` loads before `stellar.js`. `ui/gather.js` and `ui/sync.js` load before `main.js`, which starts the app.
- **"Each file exposes one namespace object" was no longer true.** It now reads: a file either creates one namespace or adds to one.

## Beyond the checklist

Sweeping the docs for paths that do not exist found a few outside the section. Each was fixed where it stood, since a doc that names a missing file is the failure this block is meant to end:

| Doc | Was | Now |
|---|---|---|
| ARCHITECTURE.md, Judging visual work | "belongs in `test/sweep.mjs`", and an `npm test` row listing checks deleted in Session J | The Session J rule, and what `npm test` does check |
| ARCHITECTURE.md, colour rule 4; solid-bodies.md | "the sweep's muddiness check" | Dropped; only the separation pass remains |
| ARCHITECTURE.md, The overlay | `layer.name` resolved in `gen/structure.js` | `gen/structure-resolve.js` |
| TRAIT-SYSTEM.md | The cross-fade "asserted" by `test/sweep.mjs` | The limit and the figure, with no claim that a test holds it |
| TRAIT-SYSTEM.md, PARAMETERS.md, solid-bodies.md, PROGRESS.md | `js/data/traits.js`, `js/data/elements.js`, `js/data/archetypes.js` | Their folders, or the file that now holds the figure |

PROGRESS.md's phase table had no rows for AI and AJ; both are added. `phase-9c-cleanup.md` still names `orbital.js` and two other pre-split files, on purpose: its tables are the plan as written.

## Left alone

**Comments that name old paths, because this session changes no code.** `index.html:21` still says `js/gen/stats.js`, and `index.html:80` says each section scrolls inside itself, which D8 reversed. The prompt below sends them to the release, along with the Help text.

**Older decision records.** The ARCHITECTURE decisions table still says D11's guardrails are "enforced by tests". It records what was decided at the time, and PROGRESS.md § Test suite says what happened to those tests.

## Not checked

The real browser. AM added 17 script tags and the harness does not cover layout, so the user was asked to open the app once. If that has not happened, it is the first step of the release.

## Files

- `docs/ARCHITECTURE.md`, the file layout and the stale references
- `docs/TRAIT-SYSTEM.md`, `docs/PARAMETERS.md`, `docs/celestials/solid-bodies.md`, stale references
- `docs/PROGRESS.md`, `docs/ROADMAP.md`, `docs/roadmap/phase-9-10.md`, `docs/roadmap/phase-9c-cleanup.md`, `docs/progress/checklist.md`, `docs/progress/README.md`, 9c marked complete

## The prompt for the next session (Session AO)

> Phase 10, Session AO: the release. Read CLAUDE.md, docs/PROGRESS.md, docs/progress/session-an-close-9c.md and **docs/RC prompt to make releases easier.md, which is the brief**: its three phases, its rules for writing docs, its links and its footer all stand, and this prompt only adds what is specific to this repo. Next free decision number: D324. Start a new session log, docs/progress/session-ao-release.md, added to docs/progress/README.md.
>
> **First, the real browser.** Unless I have said I opened the app since Session AM, ask me to: 17 script tags were added and the harness does not cover layout.
>
> **Then four decisions, before any material is written, because they change what gets written.** Bring them together, each with your recommendation.
>
> - **A. Download, or playable in the browser too?** The brief describes a downloadable zip with a root folder, holding `promo/`, `promo.md` and the rest; phase-9-10.md also says "works in an iframe". Check what itch.io currently requires for a browser-playable upload, since that zip layout may not suit it, and say whether settings persistence, PNG export and clipboard work inside its frame. I would have to test those on itch myself.
> - **B. Licence and business model.** The repo is already public on GitHub and has no LICENSE file. Help says "The generator itself is open" and "Images you generate are yours to use". The brief asks for an honest estimate of the model, and readme.md carries the licence, so settle this first. The vendored libraries' licences are in `lib/README.md`, which ships.
> - **C. The version the release carries.** `package.json` says 3.0.0, Help says "v3 · in development", and `archive/` has a folder of promo pictures called "Celestial Cutaway v3.2 release". Find out from me whether that release went out, and whether this one is a new version of it. If it did go out, the copy should say what is new.
> - **D. The brief's Phase 3 against this repo.** The brief moves WIP material to an "old wip" folder and rewrites CLAUDE.md without old development data. Here, `docs/progress/` is the reason behind the code: the code cites decision numbers 624 times, so moving those logs would orphan the citations. `archive/` is already a gitignored folder of old material, which may make "old wip" a second one. `test/_tmp/` holds 174 gitignored probes and `shots/` 1.1 GB of renders. PROGRESS.md's Status block is a long session narrative, and CLAUDE.md, MEMORY.md and the docs index are also in scope. Propose what moves, what stays and what shrinks. Nothing is deleted outright: anything removed goes to C:\trash.
>
> **Then the app itself, since these would ship.** This is the one part of the session that changes code.
>
> - Help still says the app is unfinished: the "Using it" placeholder paragraph (`index.html:765`, its comment at `:725`), `.help-placeholder` in `style.css:1127`, the `js/ui/help.js` header, and the footer's "in development" (`index.html:810`). Write the real walkthrough.
> - The brief wants one subtle, always-visible branding element. Today Reactorcore appears only inside Help, and without the linktr.ee link. Add it to the DOM, not the canvas, so no render or export changes.
> - Stale comments: `index.html:21` names `js/gen/stats.js`, and `index.html:80` contradicts D8.
> - Anything else that says "in development", "placeholder" or a phase number to a user.
>
> After these, `sh test/_tmp/_alstep.sh <files>` runs the line counts, `no-undef`, the 310 renders against `shots/al/ref/`, the real page through jsdom, and `npm test`. The renders should stay byte-identical. If `shots/al/ref/` has been cleared, regenerate it with `node test/_tmp/_albase.mjs ref` and `node test/_tmp/_alpage.mjs hash > shots/al/page-ref.json` before touching anything, and do this before any clear-out from D.
>
> **Then the brief's Phase 1, with these notes:**
>
> - **`README.md` is still v1's**: four body types, fixed palettes, `script.js`. Rewrite it whole. Keep the capitalised name, because GitHub and `build_release.bat` use it; `guide.md` and `promo.md` are lower-case as the brief says.
> - **Every number in the copy is counted from the data**, not taken from the docs or from memory: archetypes, presets, traits, controls. Load the scripts the way `test/sheet.mjs` does. Every feature claimed must be one I can find in the app.
> - **Images.** There is no `icon_og.png` and no `promo/` yet, so the brief's ideas 2 and 3 apply. `test/sheet.mjs` and `@napi-rs/canvas` give full renders at any size, and `all` interleaves every family, which suits the dense background the thumbnail and cover want. The harness cannot show the app's interface, so ask me for a real screenshot if one should be in the set. Offer more candidates than are needed and let me pick: whether they look good is my call. `archive/Celestial Cutaway v3.2 release promo pics/` shows what I chose before. Scripts stay in `test/_tmp/`.
> - **Reddit.** The brief's note stands: subreddits and their rules cannot be checked from here, so mark them unverified and do not try.
>
> **Then the brief's Phase 2.** `build_release.bat` exists and copies a flat `dist/`: it needs the `dist/<project_name>/` root (I suggest `celestial-cutaway`), `guide.md`, `promo.md`, `promo/`, and the zip. It stays a copy with no compile step; PowerShell's `Compress-Archive` adds no dependency. It ends in `pause`, so feed it input when you run it yourself. List the zip's contents, then ask me to double-click `index.html` from an unzipped copy, since that is the path a downloader takes.
>
> **Then the brief's Phase 3, as decided in D.** Update PROGRESS.md, ROADMAP.md, phase-9-10.md and the checklist as you go.
>
> **Publishing is mine.** Do not post, upload or create anything on itch.io, Reddit or any other outside service. Editing the GitHub repo's description or tags counts too: promo.md gives me the text. Commits and pushes to this repo continue as usual, but remember the repo is public, so look at what a commit adds, images and promo.md included.
>
> **How to run each step: lead with your recommendation.** Do the mechanical work and show me a short summary. When you do bring me something, read the code first and bring: what it is in one or two lines, **"Recommend: …"** with the reason, and the alternatives in a line each (the recommended one first). I should be able to answer "yes" or pick a letter; don't leave me with an open "keep or change?". Render or show me anything visual rather than asserting it looks good. One step at a time; tick, commit and push as each closes.
>
> Rules as ever: plain scripts, ≤500 lines per file, no ES modules, no new tests unless asked, deletions go to C:\trash, no hard-wrapped prose in markdown.
