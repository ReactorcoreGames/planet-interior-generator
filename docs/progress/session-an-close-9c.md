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

**D325: the GPL, version 3.** The user first asked for attribution required and commercial use only if the code is drastically modified. No standard licence says that, and when the options were laid out the user chose the GPL for its share-alike rule: anyone who distributes the app or a derivative must keep the notices and publish their source under the same licence. **It is a change from the first request:** the GPL allows commercial use and resale, even of an unmodified copy, as long as those terms are met, so it does not require drastic modification. It is open source, so the copy may say so. The user can still sell the offline zip, being the author. The GPL covers the code and not, as a rule, what the program makes, so generated images stay their makers', as Help promises. The vendored MIT and ISC libraries are compatible and keep their own notices.

**D326: this release is v4.0.** It has changed a great deal since v3.2, which went out at about commit `8d5a54f` (2026-08-29, the last before the promo pictures of 2026-08-30). That page lists nine archetypes; this release has fourteen.

**D327: `archive/` becomes `old wip/`.** The user's convention is a gitignored folder for stale material, and `archive/` already is that, so it is renamed rather than joined by a second one. Documents that would leave `docs/` cleaner move into it. Moving a tracked doc there removes it from the public repo's current tree, though not from its history. `docs/progress/` stays where it is, the user agreed, because the code cites decision numbers 624 times and those logs are where a citation leads.

**D328: Reactorcore's branding stays in the Help modal.** This overrides the brief's "one branding element always visible": the user would rather not spend space on the main GUI. The modal gains the missing links.

Also asked for: a wholly new `promo/` (screenshots, montages and collages, screenshots stamped with advertising text about the features, cover and thumbnail), and a YouTube trailer later, in a session of its own.

## The prompt for the next session (Session AO)

> Phase 10, Session AO: the release, v4.0. Read CLAUDE.md, docs/PROGRESS.md, docs/progress/session-an-close-9c.md (D324–D328 are my decisions on distribution, licence, version, clean-up and branding; they are settled, so do not reopen them) and **docs/RC prompt to make releases easier.md, which is the brief**: its three phases, its rules for writing docs and its links all stand, and this prompt only adds what is specific to this repo. Next free decision number: D329. Start a new session log, docs/progress/session-ao-release.md, added to docs/progress/README.md. I have already checked the app in the real browser since AM.
>
> **Step 1: the app itself, since these would ship.** This is the one part of the session that changes code.
>
> - Help still says the app is unfinished: the "Using it" placeholder paragraph (`index.html:765`, its comment at `:725`), `.help-placeholder` in `style.css:1127` and the `js/ui/help.js` header. Write the real walkthrough, for a layperson.
> - The version is v4.0 (D326): Help's footer at `index.html:810`, and `package.json`. Add v4 to CLAUDE.md's version history, saying what changed.
> - Branding stays in the Help modal, with nothing added to the main GUI (D328). Add the missing links from the brief: linktr.ee, the blog, Discord, the catalog and the email address as text, beside the existing itch and GitHub ones, and point the itch link at the real page.
> - Help says "The generator itself is open". Make it state the licence: open source under the GPL v3, terms in `LICENSE`. "Images you generate are yours to use" stays.
> - Stale comments: `index.html:21` names `js/gen/stats.js`, and `index.html:80` contradicts D8.
> - Anything else that says "in development", "placeholder" or a phase number to a user.
>
> After these, `sh test/_tmp/_alstep.sh <files>` runs the line counts, `no-undef`, the 310 renders against `shots/al/ref/`, the real page through jsdom, and `npm test`. The renders should stay byte-identical. If `shots/al/ref/` has been cleared, regenerate it with `node test/_tmp/_albase.mjs ref` and `node test/_tmp/_alpage.mjs hash > shots/al/page-ref.json` before touching anything. Show me Help in the real app when it is done, since the harness does not cover layout.
>
> **Step 2: the `LICENSE`** (D325). The verbatim text of the GNU GPL v3, from gnu.org, unedited, in the repo root and in both zips. Add a short copyright and licence notice for the project to `README.md` and `guide.md` (Reactorcore, with the link), say there that generated images belong to whoever made them, and note the vendored libraries' own licences. Set `"license": "GPL-3.0-only"` in `package.json`.
>
> **Step 3: the brief's Phase 1, the text.**
>
> - **`README.md` is still v1's**: four body types, fixed palettes, `script.js`. Rewrite it whole. Keep the capitalised name, because GitHub and `build_release.bat` use it; `guide.md` and `promo.md` are lower-case as the brief says.
> - **Every number in the copy is counted from the data**, not taken from the docs or from memory: archetypes, presets, traits, controls. Load the scripts the way `test/sheet.mjs` does. Every feature claimed must be one I can find in the app.
> - **The itch copy replaces a live page** (D324). My current text is `docs/current itchio description for CC.md`, and it must stop saying WIP, beta, "later I want to add" and that the offline zip holds only legacy versions. Say what is new since v3.2 by reading `git log 8d5a54f..HEAD` and the session logs. The page lists nine archetypes, so the neutron star, pulsar, black hole, nebula and machine world are new, along with the asteroid rework, the megastructures and more. Its tags today are astronomy, generative-art, illustration, offline, planet-generator, Procedural Generation, Sci-fi, Space, tool, worldbuilding; the page's downloads are $5 or more, on a name-your-own-price basis.
> - **The business-model section gives its honest view of the model I have chosen**: free in the browser, paid offline, with the source public on GitHub under the GPL, which also lets anyone resell a copy if they keep its terms. Say what the paid copy actually offers a buyer given that, and how to pitch it.
> - Do not write the YouTube copy yet: it comes with the trailer session.
> - **Reddit.** The brief's note stands: subreddits and their rules cannot be checked from here, so mark them unverified and do not try.
>
> **Step 4: `promo/`, wholly new.** This is the part I care most about, and I judge it by looking.
>
> - The set: 16:9 screenshots of striking bodies across the families; montages and collages showing the range; **screenshots stamped with large advertising text**, each selling one feature in a layperson's words; the 630×500 itch thumbnail and the 1280×720 cover, in big type over dense detail. JPG or PNG, whichever is smaller for each.
> - **Sell what is visible at a glance**: the fourteen body types, Dyson spheres and ringworlds, the info cards with their lore, the close-ups, the layer labels and scale bar.
> - `test/sheet.mjs` and `@napi-rs/canvas` give full renders at any size, and `all` interleaves every family. Scripts stay in `test/_tmp/`. The harness cannot show the interface, so ask me for a real screenshot of the GUI if one should be in the set.
> - Work in rounds: first a spread of candidate bodies to pick from, then the stamped and composed images, with more candidates than are needed, so I can pick. `old wip/Celestial Cutaway v3.2 release promo pics/` (still `archive/` until step 6) is reference for what I chose before; none of it is reused.
> - Keep the renders' seeds and settings in the session log, so the trailer session can reuse the same bodies.
>
> **Step 5: the brief's Phase 2, the zips** (D324). `build_release.bat` exists and copies a flat `dist/`. It needs the `dist/celestial-cutaway/` root, `LICENSE`, `guide.md`, `promo.md` and `promo/`, then two identical zips, `celestial-cutaway-v4.0.zip` and `celestial-cutaway-v4.0-offline.zip`. It stays a copy with no compile step; PowerShell's `Compress-Archive` adds no dependency. It ends in `pause`, so feed it input when you run it yourself.
>
> - **The catch to bring me:** itch's HTML5 docs require an `index.html` in the zip but do not say whether it may sit inside a folder, and the brief's layout puts it in one. Have me test the browser zip on the page in a way that does not disturb the live version. If it does not run, recommend the smallest change, such as the same contents without the root folder in the browser zip, and ask me.
> - itch's limits: 1,000 files, 500 MB extracted, 200 MB per file, 240 characters per path. **Filenames are case-sensitive there**, and Windows hides a mismatch, so compare every script tag and asset reference with the tree exactly. Report the zip's file count and size.
> - List the zip's contents, then ask me to double-click `index.html` from an unzipped copy, since that is the path a buyer takes.
>
> **Step 6: the brief's Phase 3, the clean-up** (D327). Do this last, so nothing the earlier steps need has moved. Show me the list before moving anything.
>
> - Rename `archive/` to `old wip/`, and update `.gitignore`.
> - Move into it: `docs/archive/`, `docs/current itchio description for CC.md`, and the finished phase files in `docs/roadmap/`, keeping `climate-foundation.md` and anything else a future session still needs. Propose the rest.
> - **Keep `docs/progress/`** (settled, D327): the code cites decision numbers 624 times and those logs are where they lead. Keep the specs, and keep the RC prompt unless I say so.
> - Fix every link that now points at a moved file (CLAUDE.md, docs/README.md, ROADMAP.md and the rest), and shrink PROGRESS.md's Status block to current state, since the narrative is in the logs. Rewrite CLAUDE.md for future maintenance, and review MEMORY.md for anything stale.
> - `test/_tmp/` holds 174 gitignored probes and `shots/` 1.1 GB of renders. Propose what to keep; anything removed goes to C:\trash, never a permanent delete.
>
> **The trailer is a separate session after this one.** End by writing its prompt at the bottom of this log, and mark Phase 10 complete in PROGRESS.md, ROADMAP.md, phase-9-10.md and the checklist only when I have the zips and the promo set in hand.
>
> **Publishing is mine.** Do not post, upload or create anything on itch.io, Reddit or any other outside service. Editing the GitHub repo's description or tags counts too: promo.md gives me the text. Commits and pushes to this repo continue as usual, but the repo is public, so look at what a commit adds, images and promo.md included.
>
> **How to run each step: lead with your recommendation.** Do the mechanical work and show me a short summary. When you do bring me something, read the code first and bring: what it is in one or two lines, **"Recommend: …"** with the reason, and the alternatives in a line each (the recommended one first). I should be able to answer "yes" or pick a letter; don't leave me with an open "keep or change?". Render or show me anything visual rather than asserting it looks good. One step at a time; tick, commit and push as each closes.
>
> Rules as ever: plain scripts, ≤500 lines per file, no ES modules, no new tests unless asked, deletions go to C:\trash, no hard-wrapped prose in markdown.
