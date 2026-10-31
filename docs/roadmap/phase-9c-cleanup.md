# Phase 9c — the final clean-up pass, as a checklist

*Part of [ROADMAP.md](../ROADMAP.md). The audit and its findings: [session-ah-cleanup.md](../progress/session-ah-cleanup.md) (D307–D308). One block per session, in this order; within a session, one item per step, rendered for the user and answered before the next. Tick items here as they close, and record the reasoning in that session's log. Each session ends by writing the next session's prompt at the bottom of its log.*

Rules as ever: plain scripts, ≤500 lines per file, no ES modules, no new tests unless asked, render for the user rather than asserting it looks good, draw the thing, not an annotation of it, deletions go to C:\trash. Scratch renders: `test/_tmp/_ahaudit.mjs` (`presets`, `traits`, `composed`) and `test/_tmp/_ahpreids.mjs`.

---

## AH — the audit ✅

- [x] Phase 9b committed and pushed (`74a9cf0`)
- [x] The audit brought to the user and the order agreed (D307)
- [x] Open question 2: atmosphere height stays rolled (D308)

## AI — the bugs and the picture decisions

- [ ] **A. Ringed Giant's rings.** `ring-system` → `ringlet-system` in `js/data/presets.js`, and the inert `traitsOff: ["ring-system"]` on the six giant presets corrected or dropped; the star presets' inert bans dropped. Render Ringed Giant on p1–p3. Ask whether a generic preset-id check belongs in `doccheck` (it would be mechanical and generic over archetypes, but only if asked)
- [ ] **B. Built traits in natural presets**, decided with the **Artificial traits allowed** checkbox: a checkbox, natural presets banning built traits, or leave as is
- [ ] **C. The orbital ring against the ring system**: face-on circle beside a tilted ellipse on one planet. Render the pair and ask: exclude one from the other, tilt the orbital ring to the ring plane, or accept
- [ ] **D. The grey disc round some machine worlds** (seed p2 of Derelict, Hive, Worldship). Identify what draws it, render, ask
- [ ] **E. Under construction with Overgrown.** Render, ask whether they exclude each other
- [ ] **Open question 1b**: ask the user to look at the bottom edge of a body in the real app (`launch_app_win.bat`) for a straight horizontal cut; it does not reproduce in the harness. Fix if seen, close if not
- [ ] **Open question 4 + opacity** (D308): an atmosphere alpha sweep across a sheet of planets and moons; the user picks the peak alpha, and whether it becomes an opacity control

## AJ — the eye lists and the card notes

A crop render per item; the user says keep or change. The user is generally satisfied, so keep is the expected answer.

- [ ] **U1**: the high-Cohesion mosaic reading flat; ice colour and strength; the breach threshold (~0.5 Cohesion)
- [ ] **U2**: cave tone; the impact basin as a dark sector rather than a dent; exit mouths; mining-station density (6–16); Radioactivity's blue-white
- [ ] **V**: starquake jaggedness (`jag`); the neutron star's magnetosphere fill disc; faint light-bending arcs and photon ring; violet accretion discs (a warm bias is one line). Lensing is done (D304)
- [ ] **Y**: the blackbody white point at Surface heat ~0.5; hot-patch size and count; pulsar-wind wisps not reading Detail density
- [ ] **D286's card notes**: the nebula's Navigation and Biggest danger repeating each other; the ice moon's "Nothing of obvious value" over its hidden ocean; the ice shell drawn at full weight whatever its presence strength

## AK — the unbuilt controls and the spec drift

- [ ] **Tertiary hue** (PARAMETERS.md ⬜): build or strike
- [ ] **Accent hue** (⬜): the machine world's accent colour exists (D252) with no control; build the slider or strike
- [ ] **Artificial traits allowed**: record whatever AI decided
- [ ] **The four Randomize settings** (scope, archetype pool, respect locks, auto-randomize on load): build, strike or record each
- [ ] The defaults table's **Composition ⬜ P8** row struck (D286 removed it)
- [ ] **The preset tables** against `js/data/presets*.js`: drop Coreless Giant and Superionic Ice Giant or mark them unbuilt; add Ringed, Industrial, Ice Giant, Diamond Sea, Prismatic, the four moon, three asteroid and nebula presets under their real names; the stale ⬜ P7 rows replaced
- [ ] **Stale comments**: `js/draw/scene.js` header (scale bar is step 7, overlay 8, no "[Phase 8]"), `js/ui/infopanel.js` (Composition), `js/draw/card.js` (Standard 9 lines, Full 15), `js/gen/stats/solid.js` (the asteroid has its own template); MACHINE-WORLDS.md's "surface-city grid" example
- [ ] `npm test` passes; commit

## AL — the eighteen straightforward splits

Move code, change no pixel. Before the first split, render a fixed set (every archetype × 3 seeds × with/without traits, plus the presets) and keep the PNGs; after each split, render again and compare byte for byte. Keep `index.html`'s script order honest (a file's dependencies load before it), and `npm test` after each.

| File | Split |
|---|---|
| js/draw/film.js (1468) | zones and deposition → `film-zones.js`; `drawFrosting` → `frost.js`; `featherEnds` + `paintFrosting` with its grain → `frostpaint.js` |
| js/draw/details.js (1394) | gaseous fills → `details-gas.js`; stellar fills → `details-star.js`; `mosaicFill` → `details-mosaic.js`; `drawRelief` → `relief.js` |
| js/gen/elemgen.js (1180) | builders → `elemgen-basic.js`, `elemgen-mosaic.js`, `elemgen-family.js`, through the existing `registerBuilder` |
| js/data/presets.js (939) | one file per family (solid, gaseous, stellar, moon, asteroid); `presets.js` keeps the registry |
| js/draw/primitives/orbital.js (897) | rings → `orbital-rings.js`; storm → `orbital-storm.js`; capsule, shard, chunk, Voronoi → `orbital-rocks.js` |
| js/main.js (788) | `gather` → `js/ui/gather.js`; the setup syncs → `js/ui/sync.js` |
| js/draw/primitives.js (749) | vein family → `primitives/vein.js`; arrow, flow-line, wedge → `primitives/flow.js` |
| js/gen/climate.js (715) | baseline, star, subsurface → `climate-baseline.js` |
| js/data/traits/gaseous.js (700) | storms and banding → `gaseous-weather.js`; rains and ice → `gaseous-precip.js`; miners and skimmers → `giant-built.js` |
| js/data/archetypes/gaseous.js (697) | `gaseous-common.js` + one file per giant |
| js/draw/canvas.js (648) | backgrounds → `js/draw/background.js` |
| js/data/archetypes/solid.js (621) | the planet's film and axis tables → `solid-film.js` |
| js/draw/primitives/stellar.js (618) | starspot, convection cell → `stellar-spots.js` |
| js/draw/zonepaint.js (598) | orbital haze and `drawOutward` → `js/draw/zonepaint/` |
| js/data/archetypes/stellar-common.js (598) | LIMB, SWELL, the binary-companion axis → `stellar-limb-data.js` |
| js/gen/frosting.js (597) | thermal variants and helpers → `frosting-thermal.js` |
| js/data/traits/stellar-magnetic.js (572) | coronal holes → `stellar-corona.js` |
| js/draw/layers.js (555) | `boundaryFn` and faceting → `boundary.js` |

Re-measure line counts at the start: AI–AK may have moved some files over or under 500.

## AM — the five stage refactors

The same byte-for-byte check, against AL's reference renders. Each function's numbered passes become stage functions sharing one state object; the original function keeps the order of the passes and nothing else.

| File | Split |
|---|---|
| js/draw/scene.js (1449) | `render` keeps the order and the view/lens helpers; outward traits (back and front halves, per-bearing reach) → `scene-outward.js`; pillars, fluids, caves → `scene-interior.js`; surface traits, frosting, damage, spanning → `scene-surface.js` |
| js/gen/palette.js (1229) | helpers → `palette-util.js`; `build` as anchors, per-layer derivation (by role), separation guarantees, orbital band |
| js/gen/details.js (1036) | the traits-and-zones pass → `details-traits.js`; instances, draw order, removal → `details-instances.js` |
| js/gen/structure.js (787) | presence and thickness resolution → `structure-resolve.js`; the wobble pass → `structure-wobble.js` |
| js/gen/traitroll.js (1216) | selection → `traitselect.js`; anchors → `traitanchor.js`; `placeOne` by placement kind → `traitplace.js` |

## AN — close 9c

- [ ] ARCHITECTURE.md § File layout rewritten from the real tree
- [ ] PROGRESS.md, ROADMAP.md, phase-9-10.md and the checklist mark 9c complete
- [ ] Write the prompt for Phase 10, the release (the user's release prompt is [RC prompt to make releases easier.md](../RC%20prompt%20to%20make%20releases%20easier.md))
