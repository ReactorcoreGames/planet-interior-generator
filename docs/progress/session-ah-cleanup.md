# Session AH — Phase 9c: the audit and the plan

*D307–D308. Phase 9c's first session. The audit was brought to the user as a list before anything was touched; the user agreed the order and asked for the pass to be split across several smaller sessions with a checklist, so this session built nothing. The checklist is [roadmap/phase-9c-cleanup.md](../roadmap/phase-9c-cleanup.md).*

Scratch tools (in `test/_tmp/`, gitignored): `_ahaudit.mjs` (`presets` renders every preset on seeds p1–p3; `traits` every family with each eligible trait alone plus three six-trait crowds; `composed` one body + Standard card per family; each writes its card text beside the renders, all to `shots/ah/`), `_ahpreids.mjs` (every preset `traits` / `traitsOff` id its archetype does not offer).

`_ahaudit.mjs composed` does not grow its canvas when a card overflows, as the app's composed export does, so a card cut off at the bottom of `composed-*.png` is the script's, not the app's.

---

## Phase 9b committed first

All of AB–AG (D289–D306) was still uncommitted. It went in as one commit and was pushed, so the 9c splits have a fixed version to diff renders against. `npm test` passed before the commit.

## The audit

### 1. Does everything land together

`npm run sheet -- 24 6 all`, all 58 presets on three seeds, each family with each eligible trait and three crowds, a composed export per family, and the card text for every one.

| | Found |
|---|---|
| **A** | **Ringed Giant has no rings.** It forces `ring-system`; the giants' ring trait is `ringlet-system`, so it forces nothing. Six giant presets ban `ring-system` to no effect, and the star presets ban it too (harmless: stars never roll it). `js/data/presets.js`'s own comment at the Harvested Star preset describes exactly this silent failure |
| **B** | **Natural presets roll megastructures.** A preset that names no traits rolls them, and since D291 that includes built ones: the defence network on Ocean, Garden, Locked, Rogue and Tilted World (p3); Dyson shells and swarms on Quiet Sun and Patient Ember. The same question as PARAMETERS.md's unbuilt **Artificial traits allowed** checkbox |
| **C** | **The orbital ring and the ring system disagree about the camera.** The orbital ring is a face-on circle, the natural ring a tilted ellipse, on the same planet (planet crowds 1 and 3) |
| **D** | **A faint grey disc round some machine worlds** (Derelict, Hive, Worldship on p2). Intended or not is the user's call |
| **E** | **Under construction and Overgrown can coexist.** Reads as abandoned construction; could be fine |

No card contradicted its picture in the text sweep. The star crowds (shell, swarm, mirrors and collectors on their own orbits), the six machine traits together, the 9b presets and the black holes read cleanly.

**Open question 1b** (the body cut off flat across its lower portion) does not appear in any harness render (`shots/ah/ah-1b.png`). If it exists it depends on the app's layout, so it needs the user's screen: layout defects are invisible to the harness.

### 2. Files over 500 lines

23 files. Eighteen split along boundaries that already exist (sections, builders, per-trait or per-archetype data). Five do not, because one function is most of the file: `Scene.render` (~1040 lines), `Palette.build` (~940), `Details.build` (~845), `Structure.build` (~540) and `TraitRoll.placeOne` (~520). Splitting those means pulling their numbered passes out into stage functions sharing one state object: still pixel-identical, but a refactor rather than a move, so **the user put them in a session of their own**. The proposed split for every file is in the checklist.

### 3. Spec drift

PARAMETERS.md: Tertiary hue, Accent hue (the machine world has an accent colour, D252, but no control), Artificial traits allowed, and the four Randomize settings are ⬜; the defaults table still lists Composition ⬜ P8, struck in Phase 8. The preset tables disagree with the code in both directions (Coreless Giant and Superionic Ice Giant are listed and not built; Ringed, Industrial, Ice Giant, Diamond Sea, Prismatic, the four moon, three asteroid and three nebula presets are built and missing or misnamed; the struck moon and asteroid rows still say ⬜ P7). ARCHITECTURE.md's file layout is far out of date. Stale comments: `js/draw/scene.js`'s header, `js/ui/infopanel.js` (Composition), `js/draw/card.js` (line counts), `js/gen/stats/solid.js` (asteroid "will share"); MACHINE-WORLDS.md still offers a "surface-city grid" as an example. The `dyson-structure` comments in `js/data/presets.js` and `js/data/traits/stellar-built.js` are history explaining a decision and stay.

### 4. The "for the user's eye" lists

U1, U2, V and Y are open (X was closed in Session Y). **The user: generally satisfied with what is built; a crop render each, then keep or change.**

## D307 — 9c runs over several sessions, from a checklist

The user asked for the pass to be split so no one chat carries all of it. [roadmap/phase-9c-cleanup.md](../roadmap/phase-9c-cleanup.md) holds the items in the agreed order, one session per block, each ending with the prompt for the next: **AI** the bugs and picture decisions, **AJ** the eye lists and card notes, **AK** the unbuilt controls and spec drift, **AL** the eighteen straightforward splits, **AM** the five stage refactors, **AN** ARCHITECTURE.md's layout and the Phase 10 prompt. The splits come after every change that moves a pixel, so their before/after diffs are taken against a settled picture.

## D308 — Atmosphere *height* stays rolled; its *opacity* is the open lever

Open question 2 asked for an Atmosphere thickness control. In the code that is the band's height: `frac: { param: "atmosphereDepth", depth: [0.07, 0.13] }` on the planet, rolled from its own stream. **The user: a height control, "probably nah"; an opacity / intensity control, "a good addition".** So open question 2 closes as *height rolled deliberately*, and opacity joins open question 4 (the atmosphere's peak alpha, 0.82, set by eye on a handful of bodies): Session AI renders an alpha sweep across the sheet, and if the user wants the control, it is that alpha, not the band's height.

## Files

- docs/progress/session-ah-cleanup.md — new: this log
- docs/roadmap/phase-9c-cleanup.md — new: the 9c checklist and the next prompt
- docs/progress/README.md, docs/PROGRESS.md, docs/roadmap/phase-9-10.md — the session and the plan recorded

## The prompt for Session AI (Phase 9c, block 1)

> Phase 9c, Session AI: the bugs and the picture decisions. Read CLAUDE.md, docs/PROGRESS.md, docs/roadmap/phase-9c-cleanup.md (the 9c checklist; your block is **AI**), and docs/progress/session-ah-cleanup.md (the audit, D307–D308). Next free decision number: D309. Continue in a new session log, docs/progress/session-ai-fixes.md, added to docs/progress/README.md. Go one item per step in the checklist's order, rendering for me and waiting for my answer before the next: (A) Ringed Giant forces `ring-system`, but the giants' ring trait is `ringlet-system`, so it has no rings; fix it and the inert `ring-system` bans, render it on three seeds; (B) natural presets roll built traits (the defence network on Ocean World, Dyson shells on Quiet Sun) — bring me the options together with PARAMETERS.md's unbuilt "Artificial traits allowed" checkbox; (C) the orbital ring is drawn face-on beside a tilted ring system on the same planet; (D) a faint grey disc round some machine worlds (Derelict, Hive, Worldship on seed p2) — find what draws it before asking; (E) Under construction beside Overgrown; then open question 1b, which I'll check in the real app; then the atmosphere's peak alpha as a sweep across a sheet, and whether it becomes an opacity control (D308). `test/_tmp/_ahaudit.mjs` and `_ahpreids.mjs` are the audit's render scripts. Rules as ever: plain scripts, ≤500 lines per file, no ES modules, no new tests unless asked, render for me rather than asserting it looks good, deletions go to C:\trash. Tick the checklist as items close, run `npm test`, commit and push at the end, and write the prompt for Session AJ at the end of your log.
