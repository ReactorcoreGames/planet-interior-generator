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

The user looked at Help in the real app: layout and reading are fine, with the six link cards in one column.

## Step 2 — the `LICENSE`

**The custom licence is in the repo root** (D325), wording approved by the user, and `package.json` points at it. The step's terms are all there: free to use, read and change; attribution to Reactorcore with the link; selling or redistributing only if drastically modified, with examples each way; generated images belong to whoever made them, with no attribution needed. It says it is not legal advice.

**Beyond the step's list, each shown to the user first:** a no-warranty clause; plain wording that sharing an unmodified copy for free is not allowed either, which follows from "commercial use or redistribution" and keeps free re-uploads from undercutting the paid copy; forking on GitHub is allowed, since GitHub's terms permit it on a public repo; and the full ISC notice for `lib/delaunay.js`, because ISC requires it in all copies and that file carries only a short copyright line. The MIT notice is already in `lib/simplex-noise.js`. The user turned down allowing free sharing of modified versions.

**Shipping it in both zips is step 5's work:** `build_release.bat` does not copy `LICENSE` yet.

## Step 3 — the text

**`README.md` is rewritten whole, and `guide.md` and `promo.md` are new.** All three follow the brief's layout and carry its links. The YouTube copy waits for the trailer session, and the promo images for step 4.

**The numbers were counted from the loaded scripts**, by a throwaway probe that loads them the way `test/sheet.mjs` does: 14 archetypes, 58 presets, 72 trait entries, 36 sliders and 10 dropdowns. Ring System and Research Station each appear twice, once per family, so the copy says **70 traits**, the number of names a user can see. Features were checked against `index.html` and the stat templates, not the specs.

**The itch description showcases the app as it is today**, as the user asked, with nothing about earlier versions. The changes since v3.2 are in a separate devlog post in `promo.md`, written from `git log 8d5a54f..HEAD` and the session logs, since the user said they would need one.

**One tag changed in the suggested list:** `tool` becomes `ttrpg`, since the page's type already says it is a tool. The user approved it. The label D325 rules out appears nowhere in the three files.

**D330: `promo.md` is internal, under the user's updated brief.** It does not ship in the zips. The earnings-share notice and the Reddit posts are gone, replaced by five unchecked marketing targets, and no price is stated or advised, though the business section still says what the paid copy offers. Step 5's list is changed to match.

## Step 4 — `promo/`

**The set is 34 images, 12 MB, all new and all kept by the user.** The filenames are numbered in reading order: the store page runs from `03` onward, with `01` the cover and `02` the thumbnail, which go in their own fields on itch. Every body comes from the app's own presets and seeds, and only the stamps are added on top. Every file came out smaller as JPG than as PNG.

- **`01`–`02`:** the cover and thumbnail, the title in big type over fourteen slices, with the subtitle "Planetary interior procedural art generator". The user asked for the subtitle because "planetary" is a more familiar word than "celestial" and says at once what the app is, even though it covers more than planets.
- **Ads, 11:** what it is, what it's for, the controls, one click, megastructures, machine worlds, nebulae, the fact card, labels, export, body types.
- **Collages, 4:** `collage-columns` (a strip through each of the fourteen), `collage-fourteen-slices` (fourteen wedges round one core), `collage-fourteen-bodies` (a named grid), `collage-info-cards`.
- **The real interface, 5:** `screenshot-app-*`. **Plain renders, 12:** the other `screenshot-*`.

**D331: anything with text in it comes from real Edge.** The step said the harness cannot show the interface, but headless Edge can, over its debugging port with a throwaway profile and nothing installed, and it runs the real app from `file://`. So the GUI shots did not need to be asked of the user. It mattered for the cards too: `@napi-rs/canvas` has different font metrics, and in its render a long name runs into the danger badge, which does not happen in Edge. So the cards, the composed export and the labelled export are the browser's own files. Bodies without text use `@napi-rs/canvas`.

**D332: the highlight colour is pink, `#ff5fa8`**, because the user already has many projects that use the same yellow. It applies to the trailer's titles too.

**D333: ads say plainly what the tool is.** The first round's slogans ("Built, not born", "Find a ringworld in the fog") were pretty but cryptic, and the user rejected them. The copy now names procedural art and planet interiors, says what the images are useful for (game assets, TTRPG material, lore and worldbuilding, framed art, wallpapers, backgrounds for any media), says they can be used commercially, and lists concrete controls. Compared with round one the headlines are about a quarter smaller, the copy is larger, and each ad has about twice the text. The full title "Celestial Cutaway: Planetary Interior Art Generator" sits in the upper left of every ad. The user asked for the concrete controls as a list, so `ad-controls` was added as a new ad.

**Three things the renders taught, for anyone reusing them:**

- A body's generated name comes from the seed alone, so one seed on several bodies gives one name. The fact cards use eight different seeds.
- The seed prints on the card and in the preview's caption, so anything showing them uses a natural-looking seed (`long-watch`, `red-meridian`) rather than `promo-b`.
- A ringworld is small against its nebula, so it sells only in close-up. `ad-nebulae` is 6.5x; at normal framing it is a speck.

**The copy was checked against the app.** The counts (36 sliders, 58 presets, 70 traits, 14 types) are step 3's, counted from the data. "Up to 4K" is 2160 px at 16:9, which `sizeFor` makes 3840x2160; 20x is `MAX_ZOOM`. Listed controls and traits use their real names, and the commercial line is the licence's own. A machine world's card has no climate line, so the fact card ad does not promise one.

**Scripts:** `test/_tmp/_ao*`, gitignored. `_aoedge.mjs` and `_aoedgeshots.mjs` drive Edge (set `AO_PROFILE` to a temp folder first), `_aobuild.mjs` makes the screenshots and ads, `_aocollage.mjs` the rest, all into `shots/ao/final/`, and `_aonumber.mjs` copies them into `promo/` in order. Step 6 should keep them and `shots/ao/` until the trailer is done. An early `keep()` wrote each image as both JPG and PNG and permanently deleted the larger, against the C:\trash rule; it now compares them in memory and writes only one. Only those just-written twins were lost.

### The bodies, for the trailer

Open the app, apply the preset, set the seed, and set the view. In the last column, `bodySize` is the Body size slider over 100, and `panX`, `panY` and `zoom` are the framing, with a negative `panY` moving the body down. Hyphenated names are the app's controls, in their own units.

| File | Preset | Seed | Name | View or controls |
|---|---|---|---|---|
| 03-ad-what-it-is.jpg | fortress-world | `promo-c` | Esbara | bodySize 0.74, panX -1.14 |
| 04-ad-what-its-for.jpg | newborn-star | `promo-b` | Kavexor KX-4112 | bodySize 0.72, panX -1.25 |
| 07-ad-controls.jpg | angry-star | `promo-a` | Belnitha Prime | bodySize 0.74, panX -1.2 |
| 08-screenshot-app-main.jpg | fortress-world | `red-meridian` | Sonithor |  |
| 10-ad-megastructures.jpg | half-built-dyson | `promo-a` | Belnitha Prime | bodySize 0.6, panX -1.5 |
| 11-ad-machine-worlds.jpg | worldship | `promo-b` | Kavexor KX-4112 | bodySize 0.72, panX -1.25 |
| 12-ad-nebulae.jpg | emission-nebula + ringworld trait, luminosity 100 | `ring-5` | Drolornun III | bodySize 0.78, zoom 6.5, panX -0.053, panY 0.505 |
| 13-ad-fact-card.jpg | derelict-machine-world | `long-watch` | Phaeketae Reach | body-size 54, pan-y -0.42, pan-x -0.9, info-detail compact |
| 15-ad-labels.jpg | volcanic-world | `old-iron` | Ithcyneth | show-labels True, show-scale-bar True, label-side right, label-size 150, body-size 70, pan-x -0.82, pan-y -0.12 |
| 16-ad-export.jpg | derelict-machine-world | `promo-b` | Kavexor KX-4112 | bodySize 0.9, zoom 4.2, panX -0.1, panY -0.42 |
| 17-ad-body-types.jpg | feeding-black-hole | `promo-c` | Esbara | bodySize 0.62, panY 0.72 |
| 19-screenshot-app-presets.jpg | worldship | `long-watch` | Phaeketae Reach |  |
| 20-screenshot-app-traits.jpg | half-built-dyson | `ashfall` | Drosetheth |  |
| 21-screenshot-app-colour.jpg | newborn-star | `quiet-harbor` | Thomiror |  |
| 22-screenshot-app-labels.jpg | volcanic-world | `old-iron` | Ithcyneth | show-labels True, show-scale-bar True, label-size 130 |
| 23-screenshot-fortress-world.jpg | fortress-world | `promo-c` | Esbara | bodySize 0.8 |
| 24-screenshot-half-built-dyson.jpg | half-built-dyson | `promo-a` | Belnitha Prime | bodySize 0.8 |
| 25-screenshot-derelict-machine-world.jpg | derelict-machine-world | `promo-b` | Kavexor KX-4112 | bodySize 0.92 |
| 26-screenshot-worldship.jpg | worldship | `promo-b` | Kavexor KX-4112 | bodySize 0.8, panY 0.1 |
| 27-screenshot-black-hole.jpg | feeding-black-hole | `promo-c` | Esbara | bodySize 0.8 |
| 28-screenshot-pulsar.jpg | young-pulsar | `promo-b` | Kavexor KX-4112 | bodySize 0.8 |
| 29-screenshot-ringed-giant.jpg | ringed-giant | `promo-a` | Belnitha Prime | bodySize 0.8 |
| 30-screenshot-newborn-star.jpg | newborn-star | `promo-b` | Kavexor KX-4112 | bodySize 0.8 |
| 31-screenshot-ice-moon.jpg | ice-shelled-moon | `promo-b` | Kavexor KX-4112 | bodySize 0.92 |
| 32-screenshot-volcanic-world.jpg | volcanic-world | `promo-b` | Kavexor KX-4112 | bodySize 0.92 |
| 33-screenshot-nebula.jpg | emission-nebula + ringworld trait, luminosity 100 | `ring-5` | Drolornun III | bodySize 0.95, zoom 1.35 |
| 34-screenshot-asteroid.jpg | ice-hauler | `promo-b` | Kavexor KX-4112 | bodySize 0.9 |

The fact cards in `14-collage-info-cards`: `fortress-world` / `red-meridian` (Sonithor); `derelict-machine-world` / `long-watch` (Phaeketae Reach); `feeding-black-hole` / `first-light` (Kyrossa); `diamond-sea` / `deep-thunder` (Delta Zanmiris); `angry-star` / `ashfall` (Drosetheth); `young-pulsar` / `salt-road` (Eslorna IV); `ice-shelled-moon` / `pale-anvil` (Lambda Essethus); `pillars-of-creation` / `hollow-crown` (Marketyn).

The fourteen in the collages, on a solid `#05070e` background: Planet `fortress-world` / `promo-c`; Moon `ice-shelled-moon` / `promo-b`; Asteroid `ice-hauler` / `promo-b`; Gas giant `ringed-giant` / `promo-a`; Ice giant `diamond-sea` / `promo-b`; Young star `newborn-star` / `promo-b`; Main star `half-built-dyson` / `promo-a`; Old giant `dying-giant` / `promo-c`; Dwarf star `flare-star` / `promo-b`; Neutron star `cooling-neutron-star` / `promo-c`; Pulsar `young-pulsar` / `promo-b`; Black hole `feeding-black-hole` / `promo-c`; Nebula `emission-nebula` / `ring-5` at luminosity 100; Machine world `derelict-machine-world` / `promo-b`. `09-ad-one-button` is 40 presses of Randomize under a seeded `Math.random`, seed 12345.

## Step 5 — the zips

**`build_release.bat` now makes the release:** `dist/celestial-cutaway/`, then `celestial-cutaway-v4.0.zip` and `celestial-cutaway-v4.0-offline.zip`, byte-identical (same SHA-256). It is still a copy with no compile step. It has 285 files, 14.3 MB unzipped and 12.1 MB zipped, against itch's limits of 1,000 files and 500 MB; the largest file is 0.51 MB and the longest path 64 characters.

**D334: the bat writes the zip entries itself, not with `Compress-Archive`.** The step suggested `Compress-Archive`, but under this machine's Windows PowerShell 5.1 both it and .NET's `ZipFile.CreateFromDirectory` write names like `root\sub\a.txt`, read from the zip's raw central directory. A Linux host can unpack those as flat filenames with no folders, which would break the app on itch while it looks fine on Windows. A short temp script adds each file with `/` in its name, still using only what ships with Windows. Python's `zipfile` turns backslashes into slashes on Windows when it reads, so a check for this has to read the raw bytes.

**D335: the launcher and `lib/README.md` do not ship.** `launch_app_win.bat` is dev tooling: the app needs no server, the guide says to double-click `index.html`, and a stray `.bat` is one more thing for a buyer to wonder about or antivirus to flag. `lib/README.md` is dev notes with links to files the zip lacks, and `LICENSE` already carries the libraries' notices. The optional `mongoose.exe` copy went with the launcher, so a local binary cannot slip into a release.

**Two small fixes this needed.** README said to run `npm test`, which is not possible from the zip, so it now says the tests are in the GitHub repository. `.gitattributes` keeps `.bat` files CRLF, because `cmd.exe` can misread labels with bare LF endings and the bat was LF.

**Checks.** Every local reference in `index.html` matches a zip entry by exact case (247: 245 scripts, the stylesheet, the favicon), and every file in `js/` and `lib/` has a script tag; `style.css` has no `url()`, and the code loads no assets at runtime. No entry has a backslash, a non-ASCII name or a place outside the root folder; `promo.md`, `docs/`, `test/` and `package.json` are absent. Unzipped and run in real headless Edge, from `file://` and from a local server that refuses any path not matching by exact case, with the root folder in the URL: all 245 scripts loaded, 14 archetypes, six Randomize presses drew, no errors, nothing refused. That does not settle how itch treats the root folder, which the user is testing.

**The previous `dist/`,** a stale build from 8 October, went to `C:\trash\20261105-192039-planet-interior-generator\`. The bat itself still clears `dist/` with `rmdir` on every run, as it always has, since that folder holds only its own output.

**The user tested both** and reported that they work: the browser zip with its root folder on a throwaway draft itch page, and a double-click of `index.html` from an unzipped copy. So both zips keep the root folder and stay identical.

**D336: the itch description uses the ads' wording.** At the user's request, `promo.md`'s long description is rewritten from the copy stamped on the `promo/` images (`test/_tmp/_aobuild.mjs`, `_aocollage.mjs`), following D333: plain headlines and concrete lists instead of the earlier prose and its slogan. The name, subtitle and tags are unchanged.

## Step 6 — the clean-up

**Shown to the user first and approved as listed.** `archive/` is now `old wip/`, and `.gitignore` follows. Moved into it: `docs/archive/` as `docs-archive/`, the old itch description, and the finished phase files as `docs-roadmap/`. Still in `docs/roadmap/`: `climate-foundation.md`, `scope-and-risk.md` and this step's checklist, until the trailer is done. `docs/progress/`, the specs and the RC prompt stay.

**D337: citations of moved plans stay in the code.** Comments in `js/` cite `ASTEROID-OVERHAUL` and `CLIMATE-PLAN` about 45 times, and a few name moved roadmap files. The comments stand on their own, so no shipped file changed; CLAUDE.md says where the citations lead and that the files are in git history up to commit 302550a. Links in the session logs point into `old wip/`, so they work locally and are dead on GitHub.

**Removed to `C:	rash61105-214946-planet-interior-generator-step6\`:** every render except `shots/ao/`, including the 564 MB `shots/al/` reference set, and 158 probes from `test/_tmp/`. Kept there: the `_ao*` scripts for the trailer, the regression kit (`_alstep.sh`, `_albase.mjs`, `_alpage.mjs`, `_allint.*`, `_alcells.json`, `_vboot.mjs`, `_lint/`), and the probes the code names. `shots/ao/` and `_ao*` can go once the trailer is done.

**CLAUDE.md is rewritten for maintenance, and PROGRESS.md's Status block is cut to current state,** since the phase table links the narrative. Phase 10 is marked complete.

### The trailer's prompt

Read CLAUDE.md, docs/PROGRESS.md and docs/progress/session-ao-release.md, then make the YouTube trailer for Celestial Cutaway v4.0. Propose a shot list first, with your recommendation, and reuse the bodies in that log's tables so they match `promo/`. Use the pink highlight `#ff5fa8` for titles (D332) and say plainly what the tool is, what it is for and that images can be used commercially (D333). Anything showing text or the interface comes from real Edge (D331, `test/_tmp/_aoedge.mjs`). Check any new runtime tooling with the user first, since none of it may ship. Add the YouTube copy to `promo.md`: title, description with the user's links, and comma-separated tags. Publishing is the user's. When done, move `docs/roadmap/phase-10-release.md` into `old wip/docs-roadmap/`, fix its links, and move `shots/ao/` and `test/_tmp/_ao*` to `C:	rash`.
