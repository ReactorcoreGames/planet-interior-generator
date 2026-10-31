# Session AI — Phase 9c: the bugs and the picture decisions (part one)

*D309–D311. Items A–C of the AI block closed, plus a slider fix the user found while testing. The session was cut short by the user's usage limit; D, E, open question 1b and the atmosphere sweep carry over to the next session, which is still block AI.*

Scratch tools (in `test/_tmp/`, gitignored): `_aipre.mjs` (named presets on p1–p3, one row each, using `CC.Presets.offList`), `_aipair.mjs` (one archetype with forced traits across seeds). `_ahaudit.mjs presets` now also uses `offList`. Renders in `shots/ai/`.

---

## D309 — Ringed Giant forces `ringlet-system`; the ring flavour checks both kinds

Ringed Giant forced `ring-system`, the rocky worlds' ring; a giant's is `ringlet-system`, so it forced nothing and drew no rings. Fixed in `js/data/presets.js`. The other five giant presets' inert `ring-system` bans became `ringlet-system` bans, because their authors meant "no rings on this one" (so seeds that used to roll rings on them no longer do); the star presets' `ring-system` / `debris-belt` bans were dropped, since stars offer neither. `_ahpreids.mjs` now reports nothing. The same silent failure was in the card text: the giants' "The rings. Clean ice…" resource line and three universal lines (ring-light, approach, falling debris) checked only `ring-system`, so no ringed giant could roll them; they now check either (`js/data/flavour/gaseous.js`, `registry.js`). Rendered on p1–p3 and **approved**. A doccheck for preset ids: **the user declined**.

## D310 — Natural presets bar built traits from their roll

A preset that names no traits rolled built ones too (D291): the defence network on Ocean World, Dyson shells on Quiet Sun, and since Phase 7 stations on the black holes and asteroid. The user chose the existing ✕ mechanism over a new checkbox: `CC.Presets.offList(preset)` returns the preset's `traitsOff` plus, when it names no traits and its archetype has natural traits, every built trait it offers; `js/ui/presets.js` feeds that to the picker, so the bars show as ✕ marks in the Built group and a click undoes one. That rule selects exactly the 19 non-machine presets that roll; the machine worlds (all built) and presets naming their traits are untouched, and plain Randomize keeps D291's third weight. Consequence the user accepted: the four black-hole presets now carry at most `tidal-disruption`, their only natural trait. PARAMETERS.md's **Artificial traits allowed** checkbox is to be struck in AK, since the ✕ does its job. **Approved.**

## Item C — the orbital ring beside the ring system: accepted as is

Every built orbital mark is drawn in the plane of the cut (the elevators stand on the real ground all round); the natural rings are the one thing drawn in perspective. Rendered the pair (`shots/ai/c-pair.png`) with three options: exclude, tilt the built ring, accept. **The user: leave it**; they like the ring on Fortress World. No decision number: nothing changed.

## D311 — Trait count runs 0–8

The user noticed the slider capped at 4 while a body offers many more traits (the picker itself was never capped; ticked traits are forced however many). Of three options (max follows the archetype, a higher fixed max, the slider follows the picker) **the user chose the simplest**: `index.html` `max="8"`. Randomize still rolls it 1–3. The audit's six-trait crowds rendered cleanly, so 8 is safe. PARAMETERS.md updated.

## Files

- js/data/presets.js — Ringed Giant's trait and the giant/star bans (D309); `offList` (D310)
- js/ui/presets.js — applies `offList` (D310)
- js/data/flavour/registry.js, js/data/flavour/gaseous.js — ring lines check either ring (D309)
- index.html, docs/PARAMETERS.md — Trait count 0–8 (D311)
- docs/roadmap/phase-9c-cleanup.md, docs/progress/README.md, docs/PROGRESS.md — recorded

## The prompt for the next session (Session AI, continued)

> Phase 9c, Session AI continued: the rest of the bugs and picture decisions. Read CLAUDE.md, docs/PROGRESS.md, docs/roadmap/phase-9c-cleanup.md (the 9c checklist; your block is still **AI**, items A–C are ticked), docs/progress/session-ah-cleanup.md (the audit) and docs/progress/session-ai-fixes.md (D309–D311, what was done so far). Next free decision number: D312. Continue in docs/progress/session-ai-fixes.md, under a new heading "Session AI, part two". Go one item per step in the checklist's order, rendering for me and waiting for my answer before the next: (D) a faint grey disc round some machine worlds (Derelict, Hive, Worldship on seed p2) — find what draws it before asking; (E) Under construction beside Overgrown — render, ask whether they exclude each other; then open question 1b, which I'll check in the real app (`launch_app_win.bat`) for a straight horizontal cut across a body's bottom edge; then the atmosphere's peak alpha (0.82) as a sweep across a sheet of planets and moons, and whether it becomes an opacity control (D308). Scratch scripts: `test/_tmp/_aipre.mjs` (presets × p1–p3), `_aipair.mjs` (archetype + forced traits × seeds), `_ahaudit.mjs`. Rules as ever: plain scripts, ≤500 lines per file, no ES modules, no new tests unless asked, render for me rather than asserting it looks good, deletions go to C:\trash. Tick the checklist as items close, run `npm test`, commit and push at the end, and write the prompt for Session AJ at the end of the log.
