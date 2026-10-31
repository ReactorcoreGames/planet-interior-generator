# Session AJ — Phase 9c: the eye lists and the card notes

*D313–. Block AJ of the 9c checklist: the items earlier sessions left "for the user's eye" (U1, U2, V, Y) and D286's card notes, one item per step, a crop render each, keep or change.*

Scratch tools (in `test/_tmp/`, gitignored): `_ajcrop.mjs` (a sheet of crops, each cell rendered at 1280×720; cells as JSON or `@file`, by archetype or preset, `PRE` env runs a probe against `CC`), `_ajvoid.mjs` (the measured void share per Cohesion). Renders in `shots/aj/`.

---

## D313 — U1: Cohesion runs to a hollow pile, ice is glassy, a monolith darkens toward the middle

Rendered Cohesion 100/75/50/30% and Starlight 40/20/5% on p1–p3 (`shots/aj/u1-cohesion.png`, `u1-ice.png`). **The user: change all three.**

- **The void share** was a straight line from 28% (Cohesion 0) to 3% (Cohesion 1); the user wanted the dial more dramatic, about nine-tenths hole at the bottom. Now `voids: [0.90, 0.03]` (`js/data/elements/solid-asteroid.js`), eased by `(1 − coh)²` in `buildMosaic` (`js/gen/elemgen.js`) so the default middle stays mostly rock: measured 89% at 0, 41% at 0.3, 29% at 0.5, 0% at 1 on p1. The stats count the drawn voids, so density, gravity and the Structure line follow.
- **Ice** more saturated and visible (`hsva(202, 0.34, 0.76)`, was `205, 0.11, 0.70`), and shiny since it was cheap: a brighter heart in a radial gradient and a thin bright rim inside the cell (`iceCore`, `iceRim` in `mosaicFill`, drawn in `js/draw/primitives/mosaic.js`). Translucence, not a light direction, so ASTEROID-OVERHAUL §2's ban stands; the grain on ice dropped to half.
- **The high-Cohesion face reading flat**: the user had accepted it, and left an enhancement to my judgement. Built ASTEROID-OVERHAUL §9's fallback: each solid cell takes a black shade proportional to its depth (`1 − radius / outermost site`), `depthShade = 0.06 + 0.34·coh²`, so about 40% at the centre of a monolith and next to nothing on rubble. Before/after on p2 (`shots/aj/u1-depth.png`).
- **The breach threshold** (~0.5) was not separately raised; it rides along unchanged.

Re-rendered at 100/50/15/0% (`u1-cohesion-c.png`) and Starlight (`u1-ice-b.png`). **Approved.**

## D314 — U2: the asteroid's impact basin bites the outline; Radioactivity's second hue is pink-white

Rendered caves at Caverns 90%, the impact basin, the mining station and Radioactivity 100% on p1, p2, p4 (`shots/aj/u2.png`), and the two faint traits against the bare body (`u2-traits.png`). **Kept as they are:** cave tone, exit mouths, mining-station density.

- **The impact basin** read as a shadow on the crust, and the user left the fix to my recommendation. On a formed body it is now a bite out of the rock: the shell's `absorbs` entry carries `bite: { count: [1, 2.4], width: [20, 34]°, depth: [0.18, 0.28] }`, `biteRoll` in `js/gen/details.js` rolls the scoops on their own stream once traits are selected, and `CC.Form.fn(form, bites)` (`js/gen/form.js`) cuts each as a round scoop with a low raised lip, before the normalization so a lip never leaves the frame. The details carry `formBites`; `draw/scene.js` hands them to the view's warp, so every layer, mosaic site and element rides the dent and the shell lines the hollow. The trait's wedge is no longer drawn on the asteroid (absorbed, like Cratered), so the shell's `traitDepth` for it went. It lives in the detail stage because the structure cache ignores traits. Side effect, accepted: the mosaic lays its sites to the outline, so ticking the basin re-lays the interior. First pass at 0.10–0.18 deep was too shy (`u2-basin.png`); final on p1–p7 (`u2-basin-b.png`). Planets and moons keep their basin.
- **Radioactivity's blue-white** could be mistaken for the new ice; the user asked for pink-white. Hue 192 → 332, at 0.55 of the saturation and a little brighter so it is pink-white rather than magenta (`u2-radio.png` was the magenta first try, `u2-radio-b.png` final, beside ice). The control's tooltip and PARAMETERS.md say so.

**Approved.**

## D315 — V: the black hole's disc runs saturated

Rendered the neutron star with starquake scars on p1–p3, full frame and close (`shots/aj/v-neutron.png`, `v-quake.png`), and the black hole on p1–p6 with close crops of the hole (`v-blackhole.png`, `v-hole-close.png`). **Kept as they are:** starquake jaggedness (the cracks are short fine kinks, not lightning, at this scale), the magnetosphere fill disc (fades well inside the frame), the light-bending arcs and photon ring. The user left small enhancements to my recommendation.

- **The disc's colour.** The user likes the hue variety, so **no warm bias**, but found the pale discs short of how energetic a feeding hole is. `discColour` in `js/draw/hole.js`: saturation `lerp(0.34, 1.0, t^0.45)` (was `0.12 → 0.78` at `t^0.8`) and the outer value floor 0.70 (was 0.52), so the colour climbs fast and stays bright rather than going muddy; the inner edge stays white-hot. One intermediate step (`0.22 → 0.96`) was too timid (`v-blackhole-b.png`); final `v-blackhole-c.png`, `v-disc-close.png`.
- **Tried and reverted:** a brighter photon-sphere palette entry to lift the faint arcs. No visible change in the render, so it went back rather than stay as an inert edit.

**Approved.**

## D316 — Y: the neutron star's white point is cream, and the pulsar wind reads Detail density

Rendered the neutron star at Surface heat 20/50/80% on p1, p2 (`shots/aj/y-heat.png`) and the pulsar wind at Detail density 20/100% (`y-wind.png`). **Kept:** the hot patches' size and count (beads on the rim, the bare star's mark against the pulsar's caps). The user took both of my recommendations:

- **The white point** at ~0.5 read as a drab grey-beige with a grey glow: the `sat` multiplier dipped to 0.75 and the deeper bands sit at 0.62–0.79 value, so with no colour they went grey. The blackbody `dial` in `js/data/archetypes/compact-neutron.js` now holds a warm cream through 0.5 (`sat` 1.6 there), moves the unseen amber-to-blue hue step to 0.525 where `sat` dips to 0.6 instead, and lifts `val` either side of the step (×1.15 at 0.48–0.51 and ×1.12 at 0.58). **Not at it:** a first try peaking the lift at the step (×1.32, `y-heat-c.png`) made the superfluid as bright as the core, and the palette's separation pass dimmed the core, the one band that must stay white-hot. Final ramp, 20/44/50/53/58/80% on p1–p3: `y-heat-e.png`; the crossover is now a brief cool white at ~53%.
- **The pulsar wind's wisps** were fixed at 7 a side and 14 streaks. Trait elements now carry `detail` (Detail density, stamped generically in `js/gen/traitroll.js` beside `poles`), and `pulsarWind` (`js/draw/primitives/compact-stream.js`) draws `round(3 + 6.2·d)` wisps (4–9) and `round(5 + 13.8·d)` streaks (8–19), exactly 7 and 14 at the default 0.65. More wisps pack into the same extent (`ii` maps each onto the original 0..6 scale), not further out. `y-wind-c.png`.

**Approved**; the user noted it helps the compact bodies differ from the stars, which they had wanted.

## D317 — D286's card notes: one danger said once, a sealed ocean is a resource, and a weak ice shell breaks up

Measured, then proposed; **the user took all three as proposed.**

- **The nebula's Navigation and Biggest danger** both said "getting lost" on every seed tried (p1–p8). Navigation's fallback (`js/gen/stats/nebula.js`) now says what flying it is like: "Benign - nothing solid to hit, and room to turn in any direction"; Biggest danger keeps "getting lost".
- **The ice moon's "Nothing of obvious value"** over a hidden ocean (Ice-Shelled Moon p4). The solid facts carry `hiddenOcean: !!climate.subsurface` (`js/gen/stats/solid.js`); the resource pool (`js/data/flavour/solid.js`) offers "A whole ocean of liquid water under the ice, for whoever drills through first." when it is true and drops "Nothing of obvious value" then.
- **The ice shell at full weight whatever its strength.** The shell's `presence: { colder: 0.46, fade: 0.13 }` gives strength 0.94 / 0.30 / 0.04 at Starlight 25 / 35 / 40% and nothing at 45%, identical on every moon, but no draw read it: a solid lid sat under a 78 °C equator at the default Starlight (`shots/aj/d286-shell.png`). Of three options (break up, a colder cutoff, leave) the user took my recommendation: **the sea breaks through**. The breach that cracks the asteroid's crust (D188) gained `by: "above"`, reading the strength of the layer above instead of a setting (`breachFn(layer, params, seed, aboveStrength)` in `js/gen/form.js`, passed from `draw/scene.js`); the moon's ocean declares `breach: { by: "above", amount: [1.0, 0.0], sectors: 4 }`. Nothing at full strength, leads at ~0.3, floes near 0 (`d286-shell-b.png`, m1–m3 whole at 25/35/40%: `d286-shell-c.png`). **The card asks the renderer's question:** `openWaterOf` samples the same `breachFn` over 360 bearings, and the Surface line reads "all the way round" below 3% open, "cracked open in long leads, with dark water showing through about N%" to 50%, then "Broken ice shell: floes adrift on open water, about N% of the sea uncovered. It is melting." (22–29% at Starlight 35%, 61–80% at 40%).

**Approved.** `npm test` passes.

## The user's note on how to run these steps

The user said the neutral keep-or-change steps left them "mildly lost how to respond", which is why they kept answering "go with your recommendations". Every item brought for review should carry **my recommendation**: what I would do and why, then the alternatives. Recorded as a standing preference in memory, and written into the AK prompt below.

## Files

- js/data/elements/solid-asteroid.js, js/gen/elemgen.js — the void range and its curve (D313)
- js/draw/details.js — ice fill, core and rim, `depthShade` (D313); pink-white hot cells (D314)
- js/draw/primitives/mosaic.js — glassy ice, the depth shade (D313)
- js/gen/form.js — bites in `fn` (D314); `breachFn` reads the layer above's strength (D317)
- js/gen/details.js — `biteRoll`, `formBites` (D314)
- js/draw/scene.js — the view's form takes the bites (D314); the breach passes the strength above (D317)
- js/data/archetypes/solid-asteroid.js — the basin absorbed as a bite, its `traitDepth` dropped, Radioactivity's tooltip (D314)
- js/draw/hole.js — the disc's saturation (D315)
- js/data/archetypes/compact-neutron.js — the blackbody white point (D316)
- js/gen/traitroll.js, js/draw/primitives/compact-stream.js — `detail` on trait elements, the wind's counts (D316)
- js/gen/stats/nebula.js, js/gen/stats/solid.js, js/data/flavour/solid.js, js/data/archetypes/solid-moon.js — the card notes and the shell breakup (D317)
- docs/PARAMETERS.md — Radioactivity's hue (D314)
- docs/roadmap/phase-9c-cleanup.md, docs/PROGRESS.md, docs/progress/README.md — recorded

## The prompt for the next session (Session AK)

> Phase 9c, Session AK: the unbuilt controls and the spec drift. Read CLAUDE.md, docs/PROGRESS.md, docs/roadmap/phase-9c-cleanup.md (the 9c checklist; your block is **AK**) and docs/progress/session-aj-eye-lists.md (block AJ, D313–D317, and the note at its end on how I want steps run). Next free decision number: D318. Start a new session log, docs/progress/session-ak-controls-drift.md, added to docs/progress/README.md.
>
> **How to run each step: lead with your recommendation.** For every item, read the code and the spec first, then bring me: what it is in one or two lines, **"Recommend: …"** with the reason, and the alternatives in a line each (the recommended one first). Render when it is visual. I should be able to answer "yes" or pick a letter; don't leave me with an open "keep or change?". One item per step, in the checklist's order, and wait for my answer before the next.
>
> The items: (1) **Tertiary hue** (PARAMETERS.md ⬜): build or strike; say what a third hue would visibly change and on which bodies before recommending. (2) **Accent hue**: the machine world's accent colour exists (D252) with no control; build the slider or strike, and render the accent at a few hues if you recommend building it. (3) **Artificial traits allowed**: already decided, strike it from PARAMETERS.md, since natural presets ✕ their built traits instead (D310); just report it done. (4) **The four Randomize settings** (scope, archetype pool, respect locks, auto-randomize on load): for each, say what exists today (locks may already be respected), then recommend build, strike or record, one at a time or as one table with a recommendation per row. (5) The defaults table's **Composition ⬜ P8** row: struck (D286 removed it); just do it. (6) **The preset tables** against `js/data/presets*.js`, and (7) **the stale comments** listed in the checklist: mechanical, so do them and show me a short summary, no questions unless something is ambiguous. Then `npm test`, tick the checklist, commit and push, and write the prompt for Session AL at the end of the log, with the same "lead with a recommendation" instruction.
>
> Scratch scripts in test/_tmp/: `_ajcrop.mjs` (a crop sheet: cells as JSON or `@file`, by archetype or preset), `_ajcard.mjs` (chosen card lines across seeds), `_aipre.mjs`, `_ahaudit.mjs`. Rules as ever: plain scripts, ≤500 lines per file, no ES modules, no new tests unless asked, render for me rather than asserting it looks good, deletions go to C:\trash, no hard-wrapped prose in markdown.
