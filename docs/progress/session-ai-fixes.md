# Session AI — Phase 9c: the bugs and the picture decisions

*D309–D312. Part one (D309–D311): items A–C of the AI block closed, plus a slider fix the user found while testing; cut short by the user's usage limit. Part two (D312): D, E, open question 1b and the atmosphere sweep, closing block AI.*

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

---

# Session AI, part two

Scratch tools added (in `test/_tmp/`, gitignored): `_aid3.mjs` (the defense-grid shell at three opacities), `_aie.mjs` / `_aie2.mjs` (Under construction with Overgrown, sheet and close crop), `_aiatm.mjs` (the atmosphere fill's peak alpha swept across planets and moons; `crop` renders 1280×720 and keeps the upper-right limb). Renders in `shots/ai/`.

## Item D — the grey disc round some machine worlds: accepted as is

It is the machine world's own `defense-grid` layer (`js/data/archetypes/machine-world.js`): an outward "faint shell of space round the hull" at `opacity: 0.30`, carrying the 12–40 orbital weapon platforms (`js/data/elements/machine.js`) that the Docking card line counts. Presence 80%, depth rolled 0.10–0.26, so p1 has none, p2 a deep shell, p3 a thin one; the three presets match because they share the stack and the seeds. Rendered at 0.30, 0.15 and 0 (platforms only), with dropping the layer as a fourth option (`shots/ai/d-options.png`). **The user: keep it**; it reads as an atmosphere for machine worlds. No decision number: nothing changed.

## Item E — Under construction with Overgrown: both allowed

Rendered alone and together on p1–p3 at Hull integrity 40, at Operational 50 and 3 (`shots/ai/e-pair.png`, `e-crop.png`). The marks do not collide; the growth runs up to the clean cut faces, and on a derelict it withers to straw beside the scaffold, which reads as abandoned construction. **The user: allow both, leave as is**, and more generally: never offer either/or exclusions between traits; the only one wanted is the Dyson sphere against the half-built Dyson sphere. The more traits combine, the better. No decision number: nothing changed.

## Open question 1b — the flat cut across the bottom: closed, does not reproduce

The user checked the real app (opened from `launch_app_win.bat`; no `mongoose.exe`, so straight from `index.html`): several families, panning, resizing the window, a PNG export and Body size in frame at its top. No cut anywhere. It was last seen in Session S and has not reproduced in the harness since Session AH; some later framing change most likely removed it. PROGRESS.md's open question 1b is struck.

## D312 — Atmosphere opacity: the peak stays, a slider scales it

The peak alpha in question is `0.82 * layer.strength` in `js/draw/scene.js`, and it is not the atmosphere's alone: every outward layer goes through it (gas-giant cloud decks, coronae, the neutron star's magnetosphere, the machine world's defense shell). Swept across five planet presets and two moons that rolled air (`shots/ai/atm-sweep.png`, `atm-crop.png`), scaling the atmosphere's fill only. A first sweep scaled the layer's `strength` and was thrown away: `strength` also sets how much the air shields the ground in the climate pass (`js/gen/climate.js`), so the surfaces moved with it. The fill alone moves the picture modestly, since it is screen-blended and the haze and sub-bands inside the band are not scaled by it.

**The user: the default stays; add the control.** **Atmosphere opacity**, 10–200%, default 100% (today's picture exactly), next to Ocean depth. It multiplies, on the `atmosphere` role only, the fill's peak, the haze and sub-bands' element opacity, and (capped at 1) the zone tint; past 100% the peak clips opaque further out, which reads as a denser, milky envelope. Draw only, in no cache key, like Element opacity; Randomize rolls it 70–140%. The card's pressure line does not follow it: opacity is the look, the band's height is the amount (D308). Rendered at 10/50/100/150/200% (`shots/ai/atm-control-crop.png`, `atm-control.png`). **Approved** ("looks perfect").

## Files (part two)

- js/draw/scene.js — `airK` on the atmosphere's fill, details and zone tint (D312)
- index.html, js/main.js, js/ui/randomize.js — the Atmosphere opacity control (D312)
- docs/PARAMETERS.md — the control and its default (D312)
- docs/PROGRESS.md — part two, open questions 1b and 4 closed; docs/roadmap/phase-9c-cleanup.md — block AI ticked; docs/progress/README.md

## The prompt for the next session (Session AJ)

> Phase 9c, Session AJ: the eye lists and the card notes. Read CLAUDE.md, docs/PROGRESS.md, docs/roadmap/phase-9c-cleanup.md (the 9c checklist; your block is **AJ**) and docs/progress/session-ai-fixes.md (block AI, D309–D312, for what was decided and the user's standing preferences: traits combine freely, never either/or exclusions except the Dyson shell against the unfinished one). Next free decision number: D313. Start a new session log, docs/progress/session-aj-eye-lists.md, added to docs/progress/README.md. Go one item per step in the checklist's order, a crop render per item, and wait for my keep-or-change before the next; I'm generally satisfied, so keep is the expected answer and nothing changes without my say: (U1) the high-Cohesion asteroid mosaic reading flat, ice colour and strength, the breach threshold (~0.5 Cohesion); (U2) cave tone, the impact basin as a dark sector, exit mouths, mining-station density (6–16), Radioactivity's blue-white; (V) starquake jaggedness, the neutron star's magnetosphere fill disc, the faint light-bending arcs and photon ring, violet accretion discs (a warm bias is one line); (Y) the blackbody white point at Surface heat ~0.5, hot-patch size and count, pulsar-wind wisps not reading Detail density; then D286's card notes (the nebula's Navigation and Biggest danger repeating each other, the ice moon's "Nothing of obvious value" over its hidden ocean, the ice shell drawn at full weight whatever its presence strength). The session logs for U1/U2 (asteroid: session-u1-asteroid-body.md, session-u2-asteroid-interior.md), V (session-v-compact.md) and Y (session-y-compact-review.md), and session-aa-polish.md (D286), say what each item is. Scratch scripts in test/_tmp/: `_aipair.mjs` (archetype + forced traits × seeds, with a JSON settings argument), `_aipre.mjs` (presets × p1–p3), `_ahaudit.mjs`. Rules as ever: plain scripts, ≤500 lines per file, no ES modules, no new tests unless asked, render for me rather than asserting it looks good, deletions go to C:	rash, no hard-wrapped prose in markdown. Tick the checklist as items close, run `npm test`, commit and push at the end, and write the prompt for Session AK at the end of the log.
