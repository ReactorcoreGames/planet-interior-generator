# Session AN — closing Phase 9c

*Phase 9c, block AN, and the user's release decisions, D324–D328. Checklist: [phase-9c-cleanup.md](../roadmap/phase-9c-cleanup.md). Docs only: no file in `js/`, `index.html`, `style.css` or `lib/` changed.*

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

## The real browser

Nothing outstanding. AM added 17 script tags and the harness does not cover layout, so the user was asked to open the app once; they did, and it works. See below.

## Files

- `docs/ARCHITECTURE.md`, the file layout and the stale references
- `docs/TRAIT-SYSTEM.md`, `docs/PARAMETERS.md`, `docs/celestials/solid-bodies.md`, stale references
- `docs/PROGRESS.md`, `docs/ROADMAP.md`, `docs/roadmap/phase-9-10.md`, `docs/roadmap/phase-9c-cleanup.md`, `docs/progress/checklist.md`, `docs/progress/README.md`, 9c marked complete

## The user's answers, after 9c closed (D324–D328)

The user opened the app in the real browser after AM: it loads, and randomizing through many bodies works. That closes the browser check. The four questions the first prompt had saved for Session AO were answered here instead, so the prompt below is rewritten around them.

**D324: free in the browser, paid offline, on the existing page.** The release replaces v3.x at https://reactorcore.itch.io/celestial-cutaway-planet-interior-generator; it is not a new page. Two identical zips, one marked "offline": anyone can run it free on itch, or buy the offline copy. The page sells its downloads at $5 or more today, and its description says the offline zip holds only legacy versions, which stops being true. The user reports that the app already works fullscreen on itch. The GitHub repo, https://github.com/ReactorcoreGames/planet-interior-generator, stays public, so the offline copy is a convenience and a way to support the work rather than the only route to the code.

**D325: a short custom licence.** The user wants: attribution required, commercial use allowed if the code is modified drastically. No standard licence says that. MIT and Apache allow unmodified resale, CC BY-NC bans commercial use outright, and the GPL requires derivatives to share their source but still lets anyone resell an unmodified copy. The GPL was chosen briefly and reversed for that reason. So it is a plain-language `LICENSE` of the user's own, with "drastically" spelled out in examples. Strictly it is source-available, not open source, so the copy must not say "open source". Images people generate stay theirs, as Help promises. Vendored libraries keep their own MIT and ISC notices. It is not legal advice.

**D326: this release is v4.0.** It has changed a great deal since v3.2, which went out at about commit `8d5a54f` (2026-08-29, the last before the promo pictures of 2026-08-30). That page lists nine archetypes; this release has fourteen.

**D327: `archive/` becomes `old wip/`.** The user's convention is a gitignored folder for stale material, and `archive/` already is that, so it is renamed rather than joined by a second one. Documents that would leave `docs/` cleaner move into it. Moving a tracked doc there removes it from the public repo's current tree, though not from its history. `docs/progress/` stays where it is, the user agreed, because the code cites decision numbers 624 times and those logs are where a citation leads.

**D328: Reactorcore's branding stays in the Help modal.** This overrides the brief's "one branding element always visible": the user would rather not spend space on the main GUI. The modal gains the missing links.

Also asked for: a wholly new `promo/` (screenshots, montages and collages, screenshots stamped with advertising text about the features, cover and thumbnail), and a YouTube trailer later, in a session of its own.

## The next session (Session AO)

The release runs as six steps, one session each, from [phase-10-release.md](../roadmap/phase-10-release.md). The prompt for each is: "Read docs/roadmap/phase-10-release.md and do Session AO, step 1." (then 2, and so on).
