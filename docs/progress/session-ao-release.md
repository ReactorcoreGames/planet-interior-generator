# Session AO — the release, v4.0

*Phase 10, one section per step. Checklist: [phase-10-release.md](../roadmap/phase-10-release.md).*

## Step 1 — the app itself

**Help is finished.** The placeholder paragraph, its `.help-placeholder` style and the comments that called the prose unfinished are gone. "Using it" is now a short lead and eight steps for a layperson: roll, choose, keep, adjust, annotate, frame, export, come back. Each was checked against the controls and the code rather than the specs.

**The version is v4.0** (D326), in Help's footer and `package.json`. CLAUDE.md's version history has its v4 line.

**The licence wording** (D325). "The generator itself is open" became "The source is there to read… What you may do with the code is set out in the LICENSE file." "Images you generate are yours to use" stays. `LICENSE` does not exist until step 2, so the sentence is true only once that step lands, before anything ships.

**D329: Help's two project links name this project.** The step asked for the itch link to reach the real page. The GitHub link pointed at the account, so it now goes to this repo as well, since Help's GitHub line is about this tool's source and the brief's other links already cover everything else: Linktree, the catalog, the blog on Patreon, Discord, and the email address as plain text. "Made by Reactorcore Games" became "Made by Reactorcore", the name the brief's branding line and the licence's attribution use. Nothing was added to the main GUI (D328).

**Stale comments.** `index.html`'s `js/gen/stats.js` and its section-scroll comment that contradicted D8, as the step listed, plus a `data/traits.js` path found on the way. Left alone: `js/ui/controls.js:17` and `js/data/flavour/solid.js:8` mention phase numbers, but only in comments no user sees.

**A sweep for what a user reads** found no other "in development", "placeholder" or phase number in `index.html`, tooltips or strings in `js/`.

**Checks.** 310/310 renders byte-identical, the real page identical through jsdom, `npm test` passes. `no-undef` reports only `SimplexNoise`, the vendored library's global. The harness does not cover layout: Help has four more link cards in its narrowest column, so the user was asked to look at it in the real app.

**Files:** `index.html`, `style.css`, `js/ui/help.js`, `package.json`, `CLAUDE.md`. `docs/current itchio description for CC.md` stays uncommitted: step 3 reads it and step 6 moves it.
