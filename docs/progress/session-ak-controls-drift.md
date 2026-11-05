# Session AK — Phase 9c: the unbuilt controls and the spec drift

*D318–. Block AK of the 9c checklist: the controls PARAMETERS.md still marks ⬜, each built, struck or recorded, then the spec drift and stale comments. One item per step, each brought with a recommendation.*

Scratch tools (in `test/_tmp/`, gitignored): `_aktert.mjs` and `_akchk.mjs` (pixels moved by the tertiary hue per archetype), `_ajcrop.mjs` (crop sheets). Renders in `shots/ak/`.

---

## D318 — Tertiary hue is an offset, and an archetype may hide a row

The tertiary anchor colours a body's outward layers, and the palette already read a manual `params.tertiaryHue` with no control to set it. Measured per archetype, then rendered (`shots/ak/1-tertiary.png`): it moves a star's whole corona, an old giant's shed envelope, a black hole's disc and jets, a planet's sky, a giant's upper cloud rim. Nothing else separates those from the body: Primary hue moves the lot, and Secondary hue offset moves the core four times as far as the halo. **The user took my recommendation over the spec's slider + toggle and over striking it.**

- **Tertiary hue offset**, −180…+180°, default 0, under Secondary hue offset, with a lock; Randomize rolls it ±30° like its sibling. An offset rather than an absolute hue: no toggle is needed, it follows Primary hue, and the derived hue's random draw now always happens, so 0 is byte-identical on every archetype (measured on p1–p3). The old manual path skipped that draw and would have shifted later colours. `params.tertiaryHue` is gone (`js/gen/palette.js`).
- **`hides: [<control id>]`** on an archetype, declared rather than detected, walked in `syncAxisDials` beside `dials` so all three routes into the archetype control (D114) keep it right. This is the first caller of `CC.Controls.setVisible`, which had none. `.control-row { display: grid }` beat the `hidden` attribute, so style.css gained `.control-row[hidden]`. The asteroid, neutron star, pulsar and nebula hide the row: 0.00% of pixels move at a difference of 3 levels on p1–p3.
- **The machine world keeps the row.** The first measure, at a difference of 12 levels, said it did nothing; at 3 levels its `defense-grid` shell moves on 9–17% of the frame, faintly but visibly (`shots/ak/1-tertiary-b.png`), and that shell reads as its atmosphere (D312). A moon keeps the row too, since its atmosphere is optional.

## D319 — Accent hue is an offset, and Randomize honours a body's hue range

The accent colours the machine world's lights and heart. Primary hue already reached the same heart colours but dragged the hull with it, steel to mauve or sage (`shots/ak/2-accent.png`), so a steel hull with a green heart could not be made. **The user took my recommendation.**

- **Accent hue offset**, −180…+180°, default 0, with a lock, applied after the accent's draws in `CC.Accent.build`, so 0 is byte-identical. Randomize returns it to 0 rather than rolling it: the complement ±30° is already rolled and is the look. The row shows only on a profile that declares an `accent`, read from the profile, so no archetype needs a `hides` list.
- **A profile's `hue` was dead in the app.** The palette only rolls it when `primaryHue` is undefined, and the slider always supplies a number, while Randomize rolled 0–360° on every body. So D252's hull families and the ice giant's 150–280° never applied in the app, only in harnesses. Randomize now rolls Primary hue through `CC.Accent.rollHue` inside the current archetype's range. Dragging the slider stays free, and only new rolls change.

## D320 — Stars stay free of a hue band

D319 reached further than I told the user: all four stars declared bands too (`hueFromStars`, D125: "a red giant should not roll blue"), which my search had missed, so Randomize would have held old giants and dwarfs to red through amber and taken violet to pink from the other two. Like the others, the bands had never applied in the app, and stars.md says "Hue is free for every star type". Rendered in and out of band (`shots/ak/2-star-bands.png`); the old giants' green, blue and violet were among the best pictures on the sheet. **The user took my recommendation: stars stay free.** The `hue` lines and `hueFromStars` are gone, overriding D125's bands; its magenta-wrapping fault went with them. So D319 changes new rolls on the machine world and the ice giant only.

## D321 — Randomize rolls the archetype, and sections lock at once

None of the four Randomize settings existed. **The user took my recommendation on all four.**

- **Randomize rolls the archetype**, evenly across `CC.Archetypes.ids()`, unless the Archetype lock is on. It never had: the lock guarded nothing, and a new user pressing Randomize on the default planet saw only planets. The spec's own account of locks ("keep this body type… but re-roll everything else") assumes it. It is the first thing rolled, since Primary hue reads the body's range, and calls `syncArchetypeConsumers`, because `Controls.set` fires no change event: a fourth route into the archetype control beside D114's three. The Archetype lock is off by default and Reset clears it, so "no locks" stays true.
- **Section lock buttons** replace Randomize scope: Body, Structure, Colour, Traits, Detail, Output (Labels & Info has no locks). The same locks, so there is no second system and Randomize did not change for them. A button is lit while its whole section is locked, however that came about, and pressing it then unlocks the section. Rolling only the colours is Lock all, then Colour.
- **Struck:** Randomize scope, Archetype pool, Respect locks, Auto-randomize on load; PARAMETERS.md says why, so nobody rebuilds them.

**Two old defects it exposed.** Rolling every body through the stub canvas found NaN geometry on about one machine world in five, and a malformed colour now and then, neither from this session. `drawShaft` (`js/draw/shellwalls.js`) set `rungs = signals.length * 2`, so a shaft with no lights divided by zero; a browser silently ignores those calls, so skipping the loop keeps the pictures identical. `CC.Color.hsva` printed an alpha below 1e-6 as `1e-7`, and now prints 0. After both: 400 rolls across all 14 bodies, no canvas issues. A dark shaft still draws no rungs, which is what it has always looked like.

domtest's later checks measure the default planet, so it sets the archetype back and locks it after its Randomize checks; no check was added.

## The mechanical items

- **Composition** and **Artificial traits** struck from the defaults table, **Artificial traits allowed** from the Traits table (D286, D310).
- **The preset tables** rewritten from `CC.Presets.all()`, all 58 checked present. Coreless Giant and Superionic Ice Giant dropped, since neither exists, and the stale ⬜ P7 rows replaced by the moons and asteroids under their real names. Rows that described traits a preset does not have were corrected: Hot Jupiter was "tidally-locked", Emission Nebula "protostars, pillars".
- **The stale comments:** the `scene.js` header now matches the code and ARCHITECTURE (overlay step 7, scale bar 8; the checklist had them swapped), `infopanel.js` no longer names Composition, `card.js` states each level's real range (compact 5–6 lines, standard 7–10, full 11–15; the checklist's "9 and 15" were one family's), `stats/solid.js` says the asteroid has its own template.
- **MACHINE-WORLDS.md**'s "most evocative outputs": the surface-city grid went, and so did the two other bullets the same list was still carrying that the app cannot draw, cities in the twilight ribbon (D290) and Enclosure ~50 (D305). They name the presets that do it instead.
- **Found on the way:** PARAMETERS.md still said `test/stats.mjs` asserts the card, and that file was deleted in Session J.

## Files

- js/gen/palette.js, js/main.js, js/ui/randomize.js, index.html — the Tertiary hue offset (D318)
- js/ui/controls.js, style.css, js/data/archetypes/solid-asteroid.js, js/data/archetypes/compact-neutron.js, js/data/archetypes/diffuse-nebula.js — `hides` (D318)
- docs/PARAMETERS.md — the Colour table (D318, D319)
- js/gen/accent.js, js/gen/palette.js, js/main.js, index.html, js/ui/controls.js — the Accent hue offset (D319)
- js/ui/randomize.js — Accent hue offset back to 0, Primary hue inside the body's range (D319)
- js/data/archetypes/stellar-common.js, stellar-young.js, stellar-main.js, stellar-giant.js, stellar-dwarf.js — the hue bands removed (D320)
- js/ui/randomize.js, js/ui/exportui.js — Randomize rolls the archetype (D321)
- js/ui/controls.js, js/main.js, index.html, style.css — the section lock buttons (D321)
- js/draw/shellwalls.js, js/core/color.js — the two old defects (D321)
- test/domtest.mjs — the archetype set back and locked after its Randomize checks (D321)
- js/draw/scene.js, js/ui/infopanel.js, js/draw/card.js, js/gen/stats/solid.js, docs/MACHINE-WORLDS.md — stale comments
- docs/PARAMETERS.md, docs/roadmap/phase-9c-cleanup.md, docs/PROGRESS.md, docs/progress/README.md — recorded

## The prompt for the next session (Session AL)

> Phase 9c, Session AL: the eighteen straightforward file splits. Read CLAUDE.md, docs/PROGRESS.md, docs/roadmap/phase-9c-cleanup.md (the 9c checklist; your block is **AL**) and docs/progress/session-ak-controls-drift.md (block AK, D318–D321). Next free decision number: D322. Start a new session log, docs/progress/session-al-splits.md, added to docs/progress/README.md.
>
> **Move code, change no pixel.** Before the first split, re-measure every file's line count (AI–AK moved some), then render a fixed set (every archetype × 3 seeds × with and without traits, plus every preset) and keep the PNGs; after each split, render again and compare byte for byte. Set the archetype and every other control explicitly in that set, because Randomize now rolls the archetype (D321). Keep `index.html`'s script order honest, so a file's dependencies load before it, and run `npm test` after each split. One file per step, in the checklist's order.
>
> **How to run each step: lead with your recommendation.** The splits are mechanical, so do them and show me a short summary, with no questions unless something is ambiguous: a split the table proposes that does not fit the code as it stands, or a file that no longer needs one. When you do bring me something, read the code first and bring: what it is in one or two lines, **"Recommend: …"** with the reason, and the alternatives in a line each (the recommended one first). I should be able to answer "yes" or pick a letter; don't leave me with an open "keep or change?". A difference in any render stops the step: find it, and tell me, rather than accepting it. Then tick the checklist, commit and push, and write the prompt for Session AM at the end of the log, with the same "lead with a recommendation" instruction.
>
> Scratch scripts in test/_tmp/: `_ajcrop.mjs` (a crop sheet: cells as JSON or `@file`, by archetype or preset), `_akpre.mjs` (every preset as data), `_akprobe4.mjs` (canvas issues per archetype over 400 rolls in the real page), `_ahaudit.mjs`. Rules as ever: plain scripts, ≤500 lines per file, no ES modules, no new tests unless asked, render for me rather than asserting it looks good, deletions go to C:\trash, no hard-wrapped prose in markdown.
