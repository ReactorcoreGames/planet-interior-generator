# Progress & Decisions

*Current state only: what is built, what is next, and where the reasoning lives. Update the Status block and the phase table at the end of every session. Session narrative goes in a new file under [progress/](progress/), detailed ticked items go in [progress/checklist.md](progress/checklist.md) — not here.*

> **This file records current state; the specs record *what*; `docs/progress/` records *why*.** The spec set is reconciled with the code — ARCHITECTURE, PARAMETERS, ARCHETYPE-TEMPLATE and the celestial docs are authoritative. Where a spec and this file disagree, this file wins. `npm run test:docs` keeps the specs and the code from drifting apart.

---

## Status

**Built:** Phases 0–7 ✅ · Phase 7: moon ✅ (S), asteroid ✅ (T, overhauled U1/U2), compact group ✅ (V, reviewed W), nebula ✅ (X) · Phase 9a: machine world ✅ (Z) · Phase 8: under way (AA).

**Session AA: Phase 8 started**, one item per session (D282). The audit found "Copy seed + settings" already built (D57, D73), keyboard shortcuts and persistence partial, the overlay and scale bar missing, and a list of stat-template inconsistencies. The order is overlay → scale bar → stat templates → persistence + Reset to defaults → keyboard. Labels and the scale bar are render settings drawn into every export, so Composition and Show body name are struck; the silhouette is chosen automatically. **Item 1, the layer-name overlay, is done** and approved: names by role in `js/data/layernames.js` with a spec `name` override (D283), drawn by `js/draw/overlay.js` with dots on one ray per side so leaders cannot cross, sized from the frame rather than the body, level under rotation (D284). **Item 2, the scale bar, is done** and approved: `js/draw/scalebar.js` draws a lower-left map bar with a round 1-2-5 length in units from metres to light-years, measuring the radius the card's Size line states (`radiusKm` on the stats result), sized from the frame; above it the largest rung of `js/data/scaleladder.js` (a person to the Oort cloud) that fits the corner at true scale, or none (D285). **Item 3, the stat-template inconsistency pass, is done** (D286): Biggest danger closes the nebula's Compact and Composition joins the asteroid's (Compact is now Size, headline facts, Biggest danger, at most six lines); the black hole gained its Resources row; the ice moon's card no longer says "Dry rock" over an ice shell, and its "Beneath the ice" row prints again (`subsurface` was missing from the climate summary); an airless body's Climate row says "sun-baked" and "mild" rather than "arid" and "temperate". The giants' cloud-top temperature and the stars' Activity were checked and do move with their controls. **Item 4, settings persistence + Reset to defaults, is done** and approved (D287): `js/ui/persist.js` stores the share string plus the locks under one `localStorage` key, saved after any redraw or panel change and restored before the first draw, with a bad or stale store ignored rather than fatal; the share string gains `trait-salt` so re-rolled traits survive, and a dropdown value with no option falls back to its default; a two-press Reset to defaults in Randomize settings returns a first launch, locks included, and leaves the accordion. See [progress/session-aa-polish.md](progress/session-aa-polish.md).

**Before that (Session Y): the user's review of Phase 7.** The nebula was signed off and its open list closed. Chunked speckle filling is now the default for every body (D241, renders ~25% cheaper). The neutron star and pulsar were reworked: Surface heat runs a blackbody ramp from ember through white to blue-white (D242); the light cylinder's ruled lines became the `pulsar-wind` trait (D243); a pulsar shows two hot polar caps and a quiet neutron star a mottled glowing rim (D244); limb darkening sits on the fluid (D245). These are **waiting for the user's eye**. Write-up: [progress/session-y-compact-review.md](progress/session-y-compact-review.md) (D241–D247).

**Session Z: Phase 9a, the `machine-world` archetype ✅**, all four stages built and approved. Stage (a) built the stack: four hollow shells round a solid heart, true voids held apart by two-tier pillars, 2–6 access shafts to space (D248–D250). Stage (b) so far: lit back walls in every void and down every shaft (D251), the accent hue and hue families as general colour-profile properties (D252), one `texture` material per built layer — rough armour, brushed metal, sleek metal, plant with pipework, circuit board (D253) — and a metallic profile with a `sheen` band shading (D254). Sub-step 4, the always-drawn details, is under way: `cellgrid` is done (D255: panel seams on the hull, hex panelling on habitation, window grids in the power core, chips among the machinery's pipes), any layer detail can now be spaced evenly (D256), and the defense grid carries a constellation of `glyph` weapon platforms, one design per body (D257). **Item 4 is under way**: `fixture` radiator banks stand on the floor and hang from the ceiling of surface-systems, and docking ports and sensor arrays sit on the hull's outer face (D258); trusses, gear trains and turbine rotors fill the machinery between its pipes and chips (D259, `CC.Claims`); data pulses ride the board's own traces (D260); the reactor's containment rings and glow stipple frame its window chamber (D261), all approved. **Conduits** (D262), a general `conduits` layer property: first across every boundary (read as spam, rejected), now feeds into the reactor down the gaps between its window blocks (6–18) and runs bridging the lowest void from the board up into the machinery (12–24), and runs lying across the board itself (14–26), made bolder and longer, with capacitors on the board and both sunk into it by a `hard-light` blend (D263), **approved**: stage (b) is complete. **Stage (c) is complete and approved**: Interior heat is relabelled Operational status and lights the whole body through general `activity` / `lit` properties, from fully offline at 0% through red emergency power, automated and crewed to a busier hive above 55% (D264–D266); Cohesion is relabelled Hull integrity and tears 1–5 wounds out of the outer layers through a general `rupture` property, a stepped funnel with serrated edges clipped out of the body's draw (D267–D268); each wound's cut faces get a torn edge through an `edge: "torn"` style registry — scorched rim, peeled plating, snapped pillars, severed pipe (D269), a debris field pouring out of the mouth (D270), and sparks, fire and embers gated by Operational status (D271). MACHINE-WORLDS.md, PARAMETERS.md and ARCHITECTURE.md are brought up to the code. **Stage (d) is under way**: the audit kept six exclusive traits (ancient-precursor cut to card and flavour, planet-cracker removed by the user); a trait can switch structure data through `sets` (D272); **Under construction** is a `clean` edge style with bare-frame shells, scaffold, cranes and welding (D273, approved); **Blast doors** and **Shaft covers** open and shut by Operational status (D274, approved); **Overgrown** is a general `overgrowth` feature, moss or rust mats on the hull, tendrils down the shafts and into the outer void, mounds pooled in the wounds, withered to grey straw as Operational status falls (D275, approved); **Weaponized** is a general `bore` feature, one great filled barrel from a saddle-seated breech on the reactor out past the hull, staged accelerator coils, collars at each shell, a muzzle crown, fed by pipes out of the reactor, charged by Operational status (D276, approved); **Worldship** is a general `engines` feature, 3–4 drive bells and two verniers on one bearing aft of any bore, a thrust frame down into the shells, and a soft plume (merged wake, white core, shock diamonds, sparks), fired by Operational status, cold when offline (D277, approved). All six exclusive traits are done. **The stat card** is built and approved (D278): `statTemplate: "machine"` reads every row from the render — power from the reactor's drawn size × the share running, population from habitation's band × its lit windows, status from the layers' lights, hull from the wounds cut, docking from shafts, doors, covers, ports and platforms, a line each for the cannon and the drive — with a `machine` hazard branch and a danger pool. **The flavour pools** add Notable, Resources and Approach, every line guarded by a card fact, the cut precursor's story told by `age` (D279, the user: "really cool"); **Star activity** reaches nothing on a machine world, measured, so its climate cell is ✖ (D280); **five presets** — Derelict, Hive, Automated Factory, Unfinished, Worldship — each checked against its blurb, Planet-Cracker struck (D281). See [progress/session-z-machine-world.md](progress/session-z-machine-world.md) § "Phase 9a closed".

**Next** (D246, D282): Phase 8's keyboard shortcuts → 9b megastructure traits (audit the per-body lists against the existing traits first, then build) → 9c final clean-up → Phase 10 release (the user's release prompt is [RC prompt to make releases easier.md](RC%20prompt%20to%20make%20releases%20easier.md)). See [ROADMAP.md](ROADMAP.md).

**Last updated:** 2026-10-29, Session AA: settings persistence and Reset to defaults (D287). Earlier the same day, the stat-template inconsistency pass (D286), the scale bar with an automatic silhouette (D285), the Phase 8 audit and order (D282), layer names (D283) and the overlay (D284). Previous: 2026-10-29, Session Z: Phase 9a closed — the flavour pools (D279), Star activity ✖ (D280), five presets (D281), and the docs brought up to the code. Earlier the same day, sub-step 5 — the stat card built and approved (D278). Earlier the same day, sub-step 4 — Worldship built and approved (D277). Earlier the same day, Weaponized (D276). Earlier the same day, sub-step 3 — Blast doors and Shaft covers approved, Overgrown built and approved (D275). Earlier, 2026-10-28: stage (d) sub-steps 1–2 — the trait audit, `sets`, Under construction, Blast doors and Shaft covers. Earlier the same day, stage (c) closed — the torn edge, debris and sparks, and the stage's docs. Earlier the same day, stage (c) sub-steps 1–2, Operational status and the hull wounds. Earlier the same day, stage (b). Earlier the same day, stage (a), the machine world's stack. Previous: 2026-10-28, Session Y, the Phase 7 review and the roadmap reorder.

**Next free decision number: D288.**

---

## Phase table

One line per completed block of work. The ticked items behind each are in [progress/checklist.md](progress/checklist.md); the full reasoning is in the linked session file. The complete session index is [progress/README.md](progress/README.md).

| Work | Session | Decisions | Write-up |
|---|---|---|---|
| Phases 0–2 — skeleton, generic renderer, colour | A | D1–D14 | [decisions-early.md](progress/decisions-early.md) |
| Phase 3 — detail elements, terrain, surface film | B | D15–D18 | [decisions-early.md](progress/decisions-early.md), [phase3-and-pitfalls.md](progress/phase3-and-pitfalls.md) |
| Phase 4 — traits, angular zones, frosting, tidal locking as an axis | C, D, E | D19–D39 | [decisions-early.md](progress/decisions-early.md), [session-c.md](progress/session-c.md), [session-d.md](progress/session-d.md), [session-e.md](progress/session-e.md) |
| Climate system | F | D40–D49 | [session-f1-climate.md](progress/session-f1-climate.md), [session-f2-gui-defects.md](progress/session-f2-gui-defects.md) |
| MVP polish — stats, info card, export | G | D50–D63 | [session-f3-docs-prep.md](progress/session-f3-docs-prep.md) |
| Export defects | H | D62–D68 | [session-h-export-defects.md](progress/session-h-export-defects.md) |
| Framing, background stack, orbital material | I | D69–D113 | [session-i-framing.md](progress/session-i-framing.md) |
| Test suite cut to ~30 s | J | — | [Test suite](#test-suite) below |
| Phase 5 — gaseous family, presets | K, L | D74–D93, D114 | [session-k-gaseous.md](progress/session-k-gaseous.md) |
| Phase 6 — stellar family, data split | M, N | D115–D128 | [session-m-stars.md](progress/session-m-stars.md) |
| Phase 6 polish — the star's body | O | D129–D139 | [session-o-star-body.md](progress/session-o-star-body.md) |
| Phase 6 polish — the tidal bulge | P | D140–D145 | [session-p-tidal.md](progress/session-p-tidal.md) |
| Phase 6 polish — stellar traits | Q | D146–D154 | [session-q-traits.md](progress/session-q-traits.md) |
| Phase 6 limb, calibrated against the app | R | D155–D162 | [session-r-limb.md](progress/session-r-limb.md) |
| Phase 7 — moon and ice moon | S | D163–D174 | [session-s-moon.md](progress/session-s-moon.md) |
| Phase 7 — asteroid | T | D175–D183 | [session-t-asteroid.md](progress/session-t-asteroid.md) |
| Asteroid overhaul — the body | U1 | D184–D192 | [session-u1-asteroid-body.md](progress/session-u1-asteroid-body.md) |
| Asteroid overhaul — caves, borer, `plate`, Radioactivity | U2 | D193–D204 | [session-u2-asteroid-interior.md](progress/session-u2-asteroid-interior.md) |
| Phase 7 — compact group (neutron star, pulsar, black hole) | V, W | D205–D218 | [session-v-compact.md](progress/session-v-compact.md) |
| Phase 7 — nebula (Phase 7 complete) | X | D219–D240 | [session-x-nebula.md](progress/session-x-nebula.md) |
| Phase 7 review — global chunked speckle, the neutron star and pulsar reworked, roadmap reordered | Y | D241–D247 | [session-y-compact-review.md](progress/session-y-compact-review.md) |
| Phase 8 — the audit, layer names, the layer-name overlay, the scale bar, the stat-template pass, persistence and Reset (in progress) | AA | D282–D287 | [session-aa-polish.md](progress/session-aa-polish.md) |
| Phase 9a — the machine world (Phase 9a complete): stages (a)–(b) — the machine world's stack; void and shaft walls, accent hue, materials, metallic colour, cellgrid, even spacing, platforms, fixtures, pulses, containment, conduits, capacitors; stage (c) — Operational status, hull wounds, the torn edge, debris and sparks; stage (d) — trait `sets`, Under construction, blast doors, shaft covers, overgrowth, the bore cannon, the worldship drive, the stat card, flavour, Star activity, presets | Z | D248–D281 | [session-z-machine-world.md](progress/session-z-machine-world.md) |

---

## Test suite

**Deliberately small, and it stays that way.** `npm test` is `doccheck` +
`domtest` — about 30 seconds, manual-run only. Nothing runs it automatically.

### Why it was cut (Session J)

It used to be six stages and ~4 minutes. `sweep.mjs`, `stats.mjs` and
`composed.mjs` were **deleted**, for two reasons, and they should not come back:

1. **They encoded judgement, not facts.** Colour-harmony thresholds, stat
   phrasing, export layout numbers. A test that holds an opinion causes *false
   corrections* — a future session "fixes" working code to satisfy a stale
   assertion. Whether the output looks good is the user's call, made by looking
   at the screen, and `npm run sheet` is the tool for it.
2. **They grew per family.** `stats.mjs` hand-wrote a 576-combination grid for
   the planet alone. Twelve archetypes that way is a session of test-writing per
   family — a maintenance cost growing faster than the app.

**The rule going forward: a check earns its place only if it is mechanically
true-or-false AND generic over `CC.Archetypes.ids()`.** Adding a family should
add no test code. If you want to check how something *looks*, render it and
look — see the visual tools below.

| Command | What it does |
|---|---|
| `npm test` | the whole suite: doccheck + domtest |
| `npm run test:docs` | 0.3s. **The specs still describe the code** — every layer has a colour entry, sat/val ranges are ordered and in gamut, **frac ranges compose at all 2ⁿ combinations of extremes** (per BRANCH, where a stack declares `frac_when`), **every registered archetype is selectable in the GUI** (D171), every script in `index.html` exists, no ES module syntax. Loops every archetype, so it covers new families for free |
| `npm run test:dom` | loads the real `index.html` in jsdom and drives all 111 controls. Catches: a control that throws, a control that is **inert** (wired but changes nothing — the Size-tiers failure), NaN geometry, unbalanced save/restore, determinism, resolution independence, tooltip coverage, settings round-trip |
| `npm run test:lib` | vendored libraries load as classic scripts and behave |

### Visual tools — these assert nothing, they render for you to judge

| Command | What it does |
|---|---|
| `npm run sheet` | **24 randomized bodies in one contact sheet.** The way to judge colour: harmony is a property of the *spread* of outputs, so they have to be seen side by side. `npm run sheet -- 48 8` for more |
| `npm run shots` | ~60 PNGs to `shots/` — parameter sweeps, one per file |
| `npm run climate` | the climate system's numbers and renders. **`shots/climate/_cap-crop.png` is the view to judge caps from**; at whole-disc scale a correct cap reads as a faint rim |
| `npm run film` / `zones` / `framing` | targeted renders for those subsystems |

Things the suite still guarantees, so a regression can't slip through quietly:

- the app boots and every control drives a render without throwing
- no NaN geometry, no malformed colours, no unbalanced save/restore
- same seed + same settings ⇒ byte-identical geometry
- element counts identical at 360p and 2160p (resolution independence)
- frac ranges stay ordered at every combination of extremes, every archetype
- every layer has a colour entry; no inverted or out-of-gamut ranges
- the climate controls change the output rather than merely being bound
- the settings string round-trips, framing included (D73)
- every control carries a tooltip

**What it does NOT check, by design:** whether anything looks good. That is the
user's loop — build, open the app, judge, report back.

---

## Known-and-accepted behaviour

Things that look like bugs but are not, recorded so a future session doesn't
"fix" them.

**Some cores render a saturated brown.** The core's hue band is orange
(28–54°), so at moderate saturation with a lowered value it reads as brown.
Value is pulled down by two rules working as designed: low-to-mid Interior heat
(a cooling core *should* look like dull metal), and D11's separation rule
darkening the core when it collides with the outer core in HSV. Reviewed and
kept in Session A — it adds variety. The lever if it ever needs changing is
`core.val` in `js/data/archetypes.js`; raising its floor from 0.84 keeps cores
bright regardless of heat.

---

## Open questions for a future session

1. ~~**The ASTEROID frac table.**~~ **Discharged in Session T (D175/D176).**
   Both halves of open question 1 are now closed. The lesson carried over from
   the moon held exactly: the table **composed**, the doccheck passed, and it
   was still wrong — including one fault (D175) where an authored layer was
   not a drawn layer at all and the built body came out with a single layer on
   every seed. Nothing short of printing the stack finds that.
   `test/_tmp/_asteroidstack.mjs` is kept so the figures can be re-derived.

1b. **The body is cut off flat across its lower portion**, on every family and
   at every size. Verified in Session S to **predate** that session's changes
   by stashing them, so it is a pre-existing render defect rather than
   anything the moon introduced. Nobody has looked at it yet.
2. **Atmosphere thickness has no control.** It is rolled from its own stream.
   PARAMETERS.md doesn't list one; add it, or leave it rolled deliberately.
3. **Stats must be derived from the stylized radii** (D5), not from real
   planetary figures, or the numbers will contradict the picture. Done for the
   solid, gaseous and stellar families; note D75 — every calibration constant
   in that path is only calibrated for the radius range it was fitted on, and a
   new family must re-measure rather than reuse. D119 adds the sharper form:
   where two constants jointly decide an output, they are ONE calibration and
   fitting either alone breaks the other.
4. **Atmosphere reads well but is not tuned across every palette.** The screen
   blend fixed the "solid band" failure, but the peak alpha (0.82) and the
   limb-brightening curve were set by eye on a handful of bodies. Worth a
   sheet-wide pass at some point.

