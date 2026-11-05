# Phase 10 — the release, v4.0, as a checklist

*Part of [ROADMAP.md](../ROADMAP.md). One step per session. To start one, the prompt is: **"Read docs/roadmap/phase-10-release.md and do Session AO, step N."***

## Every step

**Read first:** CLAUDE.md, docs/PROGRESS.md, this file's section for your step, and [session-an-close-9c.md](../progress/session-an-close-9c.md) § "The user's answers" (D324–D328: settled, do not reopen them). Steps 3–6 also read the brief, [RC prompt to make releases easier.md](../RC%20prompt%20to%20make%20releases%20easier.md): its phases, rules for writing docs and links all stand, and this file only adds what is specific to this repo.

**The log:** one file for all the steps, `docs/progress/session-ao-release.md`, added to docs/progress/README.md by step 1. Each step appends its section. Take the next free decision number from PROGRESS.md (D329 at the start).

**How to run a step: lead with your recommendation.** Do the mechanical work and show the user a short summary. When you bring them something, read the code first and bring: what it is in one or two lines, **"Recommend: …"** with the reason, and the alternatives in a line each (the recommended one first). They should be able to answer "yes" or pick a letter; never leave an open "keep or change?". Render or show anything visual rather than asserting it looks good.

**Publishing is the user's.** Do not post, upload or create anything on itch.io, Reddit or any other outside service. Editing the GitHub repo's description or tags counts too: promo.md gives them the text. Commits and pushes to this repo continue as usual, but the repo is public, so look at what a commit adds, images and promo.md included.

**To finish a step:** tick it here, update the log and PROGRESS.md's Status block, commit and push, and tell the user the next step's prompt. Stop there: one step per session.

**Rules as ever:** plain scripts, ≤500 lines per file, no ES modules, no new tests unless asked, deletions go to C:\trash, no hard-wrapped prose in markdown.

---

## Step 1 — the app itself

- [x] Finished

The one step that changes app code, since these would ship.

- Help still says the app is unfinished: the "Using it" placeholder paragraph (`index.html:765`, its comment at `:725`), `.help-placeholder` in `style.css:1127` and the `js/ui/help.js` header. Write the real walkthrough, for a layperson.
- The version is v4.0 (D326): Help's footer at `index.html:810`, and `package.json`. Add v4 to CLAUDE.md's version history, saying what changed.
- Branding stays in the Help modal, with nothing added to the main GUI (D328). Add the missing links from the brief: linktr.ee, the blog, Discord, the catalog and the email address as text, beside the existing itch and GitHub ones, and point the itch link at the real page.
- Help says "The generator itself is open". Reword it to match the licence (D325): source you can read, with the terms in `LICENSE`. "Images you generate are yours to use" stays.
- Stale comments: `index.html:21` names `js/gen/stats.js`, and `index.html:80` contradicts D8.
- Anything else that says "in development", "placeholder" or a phase number to a user.

**Checks.** `sh test/_tmp/_alstep.sh <files>` runs the line counts, `no-undef`, the 310 renders against `shots/al/ref/`, the real page through jsdom, and `npm test`. The renders should stay byte-identical. If `shots/al/ref/` has been cleared, regenerate it with `node test/_tmp/_albase.mjs ref` and `node test/_tmp/_alpage.mjs hash > shots/al/page-ref.json` before touching anything. Ask the user to look at Help in the real app, since the harness does not cover layout.

## Step 2 — the `LICENSE`

- [x] Finished

A short custom licence in plain language (D325), brought to the user for a yes on its wording: free to use, read and change; attribution required (Reactorcore, with the link); commercial use or redistribution only if drastically modified, with examples of what does and does not count, and no reselling it as it is; generated images belong to whoever made them, with no attribution needed. Note the vendored libraries' own licences (`lib/README.md`). Say plainly that it is not legal advice. It goes in the repo root and ships in both zips. Set `"license": "SEE LICENSE IN LICENSE"` in `package.json`.

## Step 3 — the text: the brief's Phase 1, without the images

- [ ] Finished

- **`README.md` is still v1's**: four body types, fixed palettes, `script.js`. Rewrite it whole. Keep the capitalised name, because GitHub and `build_release.bat` use it; `guide.md` and `promo.md` are lower-case as the brief says.
- **Every number in the copy is counted from the data**, not taken from the docs or from memory: archetypes, presets, traits, controls. Load the scripts the way `test/sheet.mjs` does. Every feature claimed must be one the user can find in the app.
- **The itch copy replaces a live page** (D324). The current text is `docs/current itchio description for CC.md`, and it must stop saying WIP, beta, "later I want to add" and that the offline zip holds only legacy versions. Say what is new since v3.2 by reading `git log 8d5a54f..HEAD` and the session logs. The page lists nine archetypes, so the neutron star, pulsar, black hole, nebula and machine world are new, along with the asteroid rework, the megastructures and more. Its tags today are astronomy, generative-art, illustration, offline, planet-generator, Procedural Generation, Sci-fi, Space, tool, worldbuilding; its downloads are $5 or more, on a name-your-own-price basis. Author: Don't make it read like a changelog, I'll need a changelog devlog post separately anyway - the itch description should be totally rewritten to showcase the program as it is today without bothering with anything that came before.
- **The business-model section gives its honest view of the chosen model**: free in the browser, paid offline, with the source public on GitHub. Say what the paid copy actually offers a buyer given that, and how to pitch it.
- **Do not write the "open source" label anywhere** (D325). Do not write the YouTube copy yet: it comes with the trailer session.
- **Reddit.** The brief's note stands: subreddits and their rules cannot be checked from here, so mark them unverified and do not try.

## Step 4 — `promo/`, wholly new

- [ ] Finished

The part the user cares most about, judged by looking. This step may well run to more than one session (Author: hopefully not, most likely taking screenshots with some stamps and making a few collages should be doable in one session I reckon). 

- The set: 16:9 screenshots of striking bodies across the families; montages and collages showing the range; **screenshots stamped with large advertising text**, each selling one feature in a layperson's words; the 630×500 itch thumbnail and the 1280×720 cover, in big type over dense detail. JPG or PNG, whichever is smaller for each.
- **Sell what is visible at a glance**: the fourteen body types, Dyson spheres and ringworlds, the info cards with their lore, the close-ups, the layer labels and scale bar.
- `test/sheet.mjs` and `@napi-rs/canvas` give full renders at any size, and `all` interleaves every family. Scripts stay in `test/_tmp/`. The harness cannot show the interface, so ask the user for a real screenshot of the GUI if one should be in the set.
- Work in rounds: first a spread of candidate bodies to pick from, then the stamped and composed images, with more candidates than are needed. `archive/Celestial Cutaway v3.2 release promo pics/` is reference for what the user chose before; none of it is reused. (Author veto: No, disregard that archive folder in favor of a totally new lineup of screenshots decided by you. The ones I did there were mostly placeholders I rushed to throw in. We can have some that are typical screenshots of different planets and GUI sections, plus infocard renders as a collage, and maybe a row of columns collage of different planet/celestials stitched together, plus anything else that would be cool.)
- Keep the renders' seeds and settings in the log, so the trailer session can reuse the same bodies.

## Step 5 — the zips: the brief's Phase 2

- [ ] Finished

`build_release.bat` exists and copies a flat `dist/`. It needs the `dist/celestial-cutaway/` root, `LICENSE`, `guide.md`, `promo.md` and `promo/`, then two identical zips, `celestial-cutaway-v4.0.zip` and `celestial-cutaway-v4.0-offline.zip` (D324). It stays a copy with no compile step; PowerShell's `Compress-Archive` adds no dependency. It ends in `pause`, so feed it input when you run it yourself.

- **The catch to bring the user:** itch's HTML5 docs require an `index.html` in the zip but do not say whether it may sit inside a folder, and the brief's layout puts it in one. Have them test the browser zip on the page in a way that does not disturb the live version. If it does not run, recommend the smallest change, such as the same contents without the root folder in the browser zip, and ask.
- itch's limits: 1,000 files, 500 MB extracted, 200 MB per file, 240 characters per path. **Filenames are case-sensitive there**, and Windows hides a mismatch, so compare every script tag and asset reference with the tree exactly. Report the zip's file count and size.
- List the zip's contents, then ask the user to double-click `index.html` from an unzipped copy, since that is the path a buyer takes.

## Step 6 — the clean-up: the brief's Phase 3

- [ ] Finished

Last, so nothing the earlier steps need has moved (D327). Show the user the list before moving anything.

- Rename `archive/` to `old wip/`, and update `.gitignore`.
- Move into it: `docs/archive/`, `docs/current itchio description for CC.md`, and the finished phase files in `docs/roadmap/`, keeping `climate-foundation.md`, this file until the trailer is done, and anything else a future session still needs. Propose the rest.
- **Keep `docs/progress/`** (settled, D327): the code cites decision numbers 624 times and those logs are where they lead. Keep the specs, and keep the RC prompt unless the user says otherwise.
- Fix every link that now points at a moved file (CLAUDE.md, docs/README.md, ROADMAP.md and the rest), and shrink PROGRESS.md's Status block to current state, since the narrative is in the logs. Rewrite CLAUDE.md for future maintenance, and review MEMORY.md for anything stale.
- `test/_tmp/` holds 174 gitignored probes and `shots/` 1.1 GB of renders. Propose what to keep; anything removed goes to C:\trash, never a permanent delete.
- Mark Phase 10 complete in PROGRESS.md, ROADMAP.md, phase-9-10.md and the checklist once the user has the zips and the promo set in hand.

## Afterwards — the trailer

A YouTube trailer, with its copy for `promo.md`, in a session of its own. Step 6 writes its prompt at the bottom of the log.
