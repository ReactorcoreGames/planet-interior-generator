# Progress & Decisions

*Current state only: what is built, what is next, and where the reasoning lives. Update the Status block and the phase table at the end of every session. Session narrative goes in a new file under [progress/](progress/), detailed ticked items go in [progress/checklist.md](progress/checklist.md) — not here.*

> **This file records current state; the specs record *what*; `docs/progress/` records *why*.** The spec set is reconciled with the code — ARCHITECTURE, PARAMETERS, ARCHETYPE-TEMPLATE and the celestial docs are authoritative. Where a spec and this file disagree, this file wins. `npm run test:docs` keeps the specs and the code from drifting apart.

---

## Status

**Built:** Phases 0–7 ✅ · Phase 7: moon ✅ (S), asteroid ✅ (T, overhauled U1/U2), compact group ✅ (V, reviewed W), nebula ✅ (X) · Phase 9a: machine world ✅ (Z) · Phase 8 ✅ (AA) · Phase 9b: megastructures ✅ (AB–AG) · Phase 9c ✅ (AH–AN).

**Session AA: Phase 8 ✅**, one item per session (D282). The audit found "Copy seed + settings" already built (D57, D73), keyboard shortcuts and persistence partial, the overlay and scale bar missing, and a list of stat-template inconsistencies. The order is overlay → scale bar → stat templates → persistence + Reset to defaults → keyboard. Labels and the scale bar are render settings drawn into every export, so Composition and Show body name are struck; the silhouette is chosen automatically. **Item 1, the layer-name overlay, is done** and approved: names by role in `js/data/layernames.js` with a spec `name` override (D283), drawn by `js/draw/overlay.js` with dots on one ray per side so leaders cannot cross, sized from the frame rather than the body, level under rotation (D284). **Item 2, the scale bar, is done** and approved: `js/draw/scalebar.js` draws a lower-left map bar with a round 1-2-5 length in units from metres to light-years, measuring the radius the card's Size line states (`radiusKm` on the stats result), sized from the frame; above it the largest rung of `js/data/scaleladder.js` (a person to the Oort cloud) that fits the corner at true scale, or none (D285). **Item 3, the stat-template inconsistency pass, is done** (D286): Biggest danger closes the nebula's Compact and Composition joins the asteroid's (Compact is now Size, headline facts, Biggest danger, at most six lines); the black hole gained its Resources row; the ice moon's card no longer says "Dry rock" over an ice shell, and its "Beneath the ice" row prints again (`subsurface` was missing from the climate summary); an airless body's Climate row says "sun-baked" and "mild" rather than "arid" and "temperate". The giants' cloud-top temperature and the stars' Activity were checked and do move with their controls. **Item 4, settings persistence + Reset to defaults, is done** and approved (D287): `js/ui/persist.js` stores the share string plus the locks under one `localStorage` key, saved after any redraw or panel change and restored before the first draw, with a bad or stale store ignored rather than fatal; the share string gains `trait-salt` so re-rolled traits survive, and a dropdown value with no option falls back to its default; a two-press Reset to defaults in Randomize settings returns a first launch, locks included, and leaves the accordion. **Item 5, the full keyboard map, is done** and approved, closing Phase 8 (D288): `js/ui/keys.js` holds one table that both the keydown handler and Help's Keyboard list read; ← / → step the seed's last run of digits (no number: → appends `-1`; the seed lock is not consulted), `L` toggles layer labels, `?` opens Help at the list; a focused control now keeps only the keys it uses itself, so Space, L and I work straight after a slider is dragged; Esc leaves a text field; Ctrl+C gives way to a text selection. See [progress/session-aa-polish.md](progress/session-aa-polish.md).

**Before that (Session Y): the user's review of Phase 7.** The nebula was signed off and its open list closed. Chunked speckle filling is now the default for every body (D241, renders ~25% cheaper). The neutron star and pulsar were reworked: Surface heat runs a blackbody ramp from ember through white to blue-white (D242); the light cylinder's ruled lines became the `pulsar-wind` trait (D243); a pulsar shows two hot polar caps and a quiet neutron star a mottled glowing rim (D244); limb darkening sits on the fluid (D245). These are **waiting for the user's eye**. Write-up: [progress/session-y-compact-review.md](progress/session-y-compact-review.md) (D241–D247).

**Session Z: Phase 9a, the `machine-world` archetype ✅**, all four stages built and approved. Stage (a) built the stack: four hollow shells round a solid heart, true voids held apart by two-tier pillars, 2–6 access shafts to space (D248–D250). Stage (b) so far: lit back walls in every void and down every shaft (D251), the accent hue and hue families as general colour-profile properties (D252), one `texture` material per built layer — rough armour, brushed metal, sleek metal, plant with pipework, circuit board (D253) — and a metallic profile with a `sheen` band shading (D254). Sub-step 4, the always-drawn details, is under way: `cellgrid` is done (D255: panel seams on the hull, hex panelling on habitation, window grids in the power core, chips among the machinery's pipes), any layer detail can now be spaced evenly (D256), and the defense grid carries a constellation of `glyph` weapon platforms, one design per body (D257). **Item 4 is under way**: `fixture` radiator banks stand on the floor and hang from the ceiling of surface-systems, and docking ports and sensor arrays sit on the hull's outer face (D258); trusses, gear trains and turbine rotors fill the machinery between its pipes and chips (D259, `CC.Claims`); data pulses ride the board's own traces (D260); the reactor's containment rings and glow stipple frame its window chamber (D261), all approved. **Conduits** (D262), a general `conduits` layer property: first across every boundary (read as spam, rejected), now feeds into the reactor down the gaps between its window blocks (6–18) and runs bridging the lowest void from the board up into the machinery (12–24), and runs lying across the board itself (14–26), made bolder and longer, with capacitors on the board and both sunk into it by a `hard-light` blend (D263), **approved**: stage (b) is complete. **Stage (c) is complete and approved**: Interior heat is relabelled Operational status and lights the whole body through general `activity` / `lit` properties, from fully offline at 0% through red emergency power, automated and crewed to a busier hive above 55% (D264–D266); Cohesion is relabelled Hull integrity and tears 1–5 wounds out of the outer layers through a general `rupture` property, a stepped funnel with serrated edges clipped out of the body's draw (D267–D268); each wound's cut faces get a torn edge through an `edge: "torn"` style registry — scorched rim, peeled plating, snapped pillars, severed pipe (D269), a debris field pouring out of the mouth (D270), and sparks, fire and embers gated by Operational status (D271). MACHINE-WORLDS.md, PARAMETERS.md and ARCHITECTURE.md are brought up to the code. **Stage (d) is under way**: the audit kept six exclusive traits (ancient-precursor cut to card and flavour, planet-cracker removed by the user); a trait can switch structure data through `sets` (D272); **Under construction** is a `clean` edge style with bare-frame shells, scaffold, cranes and welding (D273, approved); **Blast doors** and **Shaft covers** open and shut by Operational status (D274, approved); **Overgrown** is a general `overgrowth` feature, moss or rust mats on the hull, tendrils down the shafts and into the outer void, mounds pooled in the wounds, withered to grey straw as Operational status falls (D275, approved); **Weaponized** is a general `bore` feature, one great filled barrel from a saddle-seated breech on the reactor out past the hull, staged accelerator coils, collars at each shell, a muzzle crown, fed by pipes out of the reactor, charged by Operational status (D276, approved); **Worldship** is a general `engines` feature, 3–4 drive bells and two verniers on one bearing aft of any bore, a thrust frame down into the shells, and a soft plume (merged wake, white core, shock diamonds, sparks), fired by Operational status, cold when offline (D277, approved). All six exclusive traits are done. **The stat card** is built and approved (D278): `statTemplate: "machine"` reads every row from the render — power from the reactor's drawn size × the share running, population from habitation's band × its lit windows, status from the layers' lights, hull from the wounds cut, docking from shafts, doors, covers, ports and platforms, a line each for the cannon and the drive — with a `machine` hazard branch and a danger pool. **The flavour pools** add Notable, Resources and Approach, every line guarded by a card fact, the cut precursor's story told by `age` (D279, the user: "really cool"); **Star activity** reaches nothing on a machine world, measured, so its climate cell is ✖ (D280); **five presets** — Derelict, Hive, Automated Factory, Unfinished, Worldship — each checked against its blurb, Planet-Cracker struck (D281). See [progress/session-z-machine-world.md](progress/session-z-machine-world.md) § "Phase 9a closed".

**Session AB: Phase 9b's audit and plan** (D289–D290). The spec's per-body lists were audited against the traits each family already has: planets and moons are the only natural bodies with nothing built. The user rejected the proposed cities and fleets and set the list: orbital ring + space elevators, an orbital defence network and an orbital minefield on planets and moons; skyhook platforms + orbital cities on the giants; a Dyson shell and a Dyson swarm of stellar colonies above the stars' collectors and mirrors; one ringworld and round belt fields in the nebula; black-hole lensing only if cheap. A trait must be visible at the body's scale and leave the story open (D290). One family per session, AC (planets and moons) to AG (lensing, presets, close). See [progress/session-ab-megastructures.md](progress/session-ab-megastructures.md).

**Session AC: Phase 9b on planets and moons ✅** (D291–D295), each trait approved by the user. Built traits now roll at a third of a natural trait's weight in Randomize (D291; the roll only, existing seeds in families with built traits re-roll). A `rounded` body tag on the planet and the moon, not the asteroid, gates three built orbital traits (D292), each one element rolled by its builder in js/gen/orbitalbuilt.js: the **orbital ring** with 2–6 space elevators standing on the real ground (D293), the **orbital defence network** of 180°-symmetric gun platforms in the gaps of one ordered satellite constellation (D294), and the **orbital minefield**, rows of spiked orbs far above (D295). The network and minefield keep to the bearings the frame's height shows. Flavour lines in the solid pools; every count body-space after the zoom check caught pixel-threshold collapses. See [progress/session-ac-planet-megastructures.md](progress/session-ac-planet-megastructures.md).

**Session AD: Phase 9b on the gas and ice giants ✅** (D296–D297), approved by the user. One built trait, `skyhook-cities`, gated on `gaseous` (D296): 3–11 skyhooks evenly spaced on one orbit just above the skimmers, each a scoop hung in the cloud deck on a tether up to a platform, and 1–5 small orbital cities hanging the tethers of the hooks nearest the sides, one design per body — a wheel, a cylinder pair or a spire. Shrunk and multiplied after the user found the first pass absurd round a giant. Built marks now draw over natural ones in the orbit pass, so ring bands no longer wash out a far-side station (D297). Flavour lines in the giants' pools. See [progress/session-ad-giant-megastructures.md](progress/session-ad-giant-megastructures.md).

**Session AE: Phase 9b on the stars ✅** (D298–D301), each layer approved by the user. Four built layers on every star, gated on `stellar`, lowest first. A star's corona alone reaches 1.20–1.44 radii on a young star or a giant, past the frame's 1.28, so the stack is measured from the halo's edge capped at 1.15 (`edgeCap`, D298) and sinks into the glow there. The **orbital mirrors** became one evenly spaced ring just above that edge, no longer a random scatter off the frame (D298); the **stellar collectors** sit halfway from the surface to the mirrors (`depthFrac`) and are larger, 0.072–0.085 by the user's own hand (D299). The **Dyson shell** is the cut edge of a lattice sphere, three rows of triangles between four rails with plates in runs and the corona through the open cells, a whole circle in frame (D300). The **Dyson swarm** is staggered rows of stone colony slabs with windows and docking ports at the sides of the star, each along its own radial — the attitude a long body in orbit settles into — after level slabs sat at odd angles in the corners and tangent ones read as dashed lines (D301). Six flavour lines in the stars' pools. Open for AG: whether the shell gets unbuilt gaps for Half-Built Dyson. See [progress/session-ae-star-megastructures.md](progress/session-ae-star-megastructures.md).

**Session AF: Phase 9b on the nebula ✅** (D302–D303), each approved by the user. **One ringworld** (`ringworld`, gated on `diffuse`, in its own three files): a slanted ring round its own small sun, the far half's inner face of land, seas, cloud banks, night under shadow squares and rim walls, the near half's dark hull, sunk in the gas — drawn under the other traits, its sun lighting the cloud round it, veils of the nebula's own gas across it — lush, arid or frozen, story left open (D302). Cut 60% on review to about 0.05–0.10 body radii, because a nebula is light-years across, and placed liberally anywhere in the gas. **Ice and rock belts are round or oval fields half the time** (D303): a new pocket field `oval`, stretch 1–1.8 with the streak's area kept and an even fill, since the old `round` roll only made a tight knot. Five flavour lines in the nebula's pools. See [progress/session-af-nebula-megastructures.md](progress/session-af-nebula-megastructures.md).

**Session AG: Phase 9b closed ✅** (D304–D306), each item approved by the user. **The black hole's starfield is lensed** (D304), measured first: about +10 ms a render at 1080p and 4K, against 74 and 252 ms for the pixel remap Session V had in mind, so it was built — star by star, not by copying the background: each star is drawn as its two point-lens images, stretched round the hole into arcs (`js/draw/lens.js`), and the Einstein ring itself is drawn by a deep field of faint stars sampled behind the lens and brightened by their magnification. Einstein radius 1.5 horizon radii, the umbra lightened from 0.92 to 0.5 so the ring shows; only the stars bend, not a gradient or nebula field. The background is now painted after the view is made (`viewFor`, `reachOf` and `CC.Scene.lens` in js/draw/scene.js), and the composed export asks for the same lens. **An unfinished Dyson shell** (D305): `dyson-shell-unfinished` is the shell plus one line of data, `gaps`, 1–9 open arcs over 15–80% of the circle (widened by the user), each ending at a rib with bare rail past it; it excludes `dyson-shell`, which TRAIT-SYSTEM.md admits is the axis-in-disguise tell, kept because a trait has no dial. **Three presets** in `js/data/presets-built.js` (D306): **Fortress World** replaces Coruscant World (it needed cities), a garden world under all three orbital traits; **Half-Built Dyson**; **Ringworld Nebula**, a dark cloud whose one light is the ring's sun. TRAIT-SYSTEM.md, PARAMETERS.md, MACHINE-WORLDS.md, stars.md and compact-objects.md are brought up to the code. See [progress/session-ag-close-9b.md](progress/session-ag-close-9b.md).

**Session AH: Phase 9c's audit** (D307–D308). Phase 9b was committed and pushed first. Everything was rendered together — the contact sheet, every preset on three seeds, every family with each trait and in crowds, the composed export and the cards — and the findings brought to the user: Ringed Giant has no rings (it forces `ring-system`, the giants' trait is `ringlet-system`), natural presets roll built traits, the orbital ring and the ring system disagree about the camera, a grey disc round some machine worlds; open question 1b does not reproduce in the harness. The 23 files over 500 lines each have a proposed split; five are one function each and get a session of their own. The user split 9c into sessions AI–AN from a checklist, [roadmap/phase-9c-cleanup.md](roadmap/phase-9c-cleanup.md) (D307). Atmosphere height stays rolled; its opacity is the open lever (D308). See [progress/session-ah-cleanup.md](progress/session-ah-cleanup.md).

**Session AI, part one** (D309–D311): Ringed Giant now forces the giants' `ringlet-system`, the giant presets' ring bans name it, and the ring flavour lines check both kinds (D309); a preset that names no traits ✕s every built trait it offers, via `CC.Presets.offList` (D310); the orbital ring beside the ring system is accepted as is; Trait count runs 0–8 (D311). D, E, open question 1b and the atmosphere sweep continue in part two. See [progress/session-ai-fixes.md](progress/session-ai-fixes.md).

**Session AI, part two** (D312): the grey disc round some machine worlds is their own `defense-grid` shell, kept (it reads as their atmosphere); Under construction with Overgrown stays allowed (the user wants traits to combine, never either/or, the Dyson pair the only exception); open question 1b checked in the real app and closed, it does not reproduce; the atmosphere's 0.82 peak stays, and an **Atmosphere opacity** slider (10–200%, draw only) scales its fill, haze and zone tint (D312). Block AI is done. See [progress/session-ai-fixes.md](progress/session-ai-fixes.md).

**Session AJ** (D313–D317): the eye lists closed, each rendered and answered. The asteroid's voids run to ~90% at Cohesion 0, its ice is bluer and glassy, and a tight body darkens toward the middle (D313); its impact basin is a bite out of the outline, and Radioactivity's second hue is pink-white (D314); the black hole's disc runs saturated, hue still free (D315); the neutron star's white point is cream and the pulsar wind follows Detail density (D316); D286's card notes: the nebula's Navigation no longer repeats Biggest danger, a sealed ocean is a resource, and a weak ice shell breaks into leads and floes with the card measuring the open water (D317). Block AJ is done. See [progress/session-aj-eye-lists.md](progress/session-aj-eye-lists.md).

**Session AK** (D318–D321): the unbuilt controls settled and the spec drift cleared, each answered from a recommendation. **Tertiary hue offset** (D318), −180…+180°, 0 byte-identical, turning a sky, corona, disc or outer shell from its derived hue; an archetype may now hide a row it has no answer for (`hides`), the first use of `setVisible`. **Accent hue offset** (D319), shown only on a profile that declares an accent, so the machine world's lights and heart turn without repainting the hull; Randomize returns it to 0. **Randomize honours a profile's `hue`** (D319), which had never applied in the app: machine worlds keep to their hull families and ice giants to their blues. **Stars stay free** (D320): their bands and `hueFromStars` are gone, overriding D125, as stars.md says. **Randomize rolls the archetype** unless locked, evenly across all 14, and **section lock buttons** replace the struck Randomize scope; Archetype pool, Respect locks and Auto-randomize are struck too (D321). Rolling every body found two old defects, both fixed with no change of picture: NaN geometry from a dark shaft, and an alpha printed as `1e-7`. The preset tables are rewritten from the data, all 58, and the stale comments corrected. Block AK is done. See [progress/session-ak-controls-drift.md](progress/session-ak-controls-drift.md).

**Session AL** (D322): the eighteen straightforward splits, all done, each byte-identical across a 310-render reference set with the `CC` surface, the real page and `no-undef` checked as well. Only AM's five files remain over 500 lines. Split files attach to the source file's namespace, so no caller was renamed; seven rows did not fit the code as the table had them, including miners and skimmers going to a new `gaseous-built.js`, because merging into `giant-built.js` would reorder the trait roll. See [session-al-splits.md](progress/session-al-splits.md).

**Session AM** (D323): the five stage refactors, all done, each byte-identical across the same 310 renders, with the `CC` surface and the real page checked too. `render`, `Palette.build`, `Details.build`, `Structure.build` and `TraitRoll.placeOne` now keep the order of their passes and nothing else; each pass is a stage function sharing one state object, and no file in `js/` is over 500 lines. Two rows of the table did not fit the shape of the code: `palette.js` is cut by pass rather than by role, since the passes key on layer properties, and `placeOne` has no placement kinds, so it is cut by pass as well. See [session-am-refactors.md](progress/session-am-refactors.md).

**Session AN: Phase 9c closed ✅**, docs only. ARCHITECTURE.md § File layout is rewritten from the real tree and checked against `index.html`: every script listed in load order, with the load-order idiom and its three exceptions. Stale references to deleted or split files are fixed across the specs. The user checked the app in the real browser after AM, and settled the release (D324–D328): free in the browser and paid offline on the existing itch.io page, the GPL v3, v4.0, `archive/` renamed `old wip/` with finished docs moved into it, and branding in the Help modal only. See [session-an-close-9c.md](progress/session-an-close-9c.md).

**Next** (D246): Phase 10, the release, Session AO. The prompt is at the end of the [AN log](progress/session-an-close-9c.md); the brief it builds on is the user's [RC prompt to make releases easier.md](RC%20prompt%20to%20make%20releases%20easier.md). See [ROADMAP.md](ROADMAP.md).

**Last updated:** 2026-11-05, Session AN: Phase 9c closed, the file layout and the docs, and the release decisions (D324–D328). Earlier the same day, Session AM: the five stage refactors (D323). Earlier the same day, Session AL: the eighteen straightforward splits (D322). Earlier the same day, Session AK: the unbuilt controls and the spec drift (D318–D321). Previous: 2026-10-31, Session AJ: the eye lists and the card notes (D313–D317). Earlier the same day, Session AI part two: the machine shell kept, traits combine freely, 1b closed, Atmosphere opacity (D312). Earlier the same day, Session AI part one: Ringed Giant's rings, natural presets without built traits, Trait count 0–8 (D309–D311). Earlier the same day, Session AH: Phase 9c's audit, 9b committed, 9c split into sessions (D307–D308). Earlier the same day, Session AG: Phase 9b closed — the black hole's lensing (D304), the unfinished Dyson shell (D305), three presets (D306), and the cross-cutting docs. Previous: 2026-10-30, Session AF: the nebula megastructures — the ringworld and belt fields (D302–D303). Earlier the same day, Session AE: the star megastructures — `edgeCap`, the mirrors and collectors restacked, the Dyson shell and swarm (D298–D301). Earlier the same day, Session AD: the giant megastructures and built-over-natural (D296–D297). Earlier the same day, Session AC: the planet and moon megastructures and the roll weighting (D291–D295). Earlier the same day, Session AB: Phase 9b's audit and the user's list (D289–D290). Previous: 2026-10-29, Session AA: the full keyboard map, Phase 8 closed (D288). Earlier the same day, settings persistence and Reset to defaults (D287), the stat-template inconsistency pass (D286), the scale bar with an automatic silhouette (D285), the Phase 8 audit and order (D282), layer names (D283) and the overlay (D284). Previous: 2026-10-29, Session Z: Phase 9a closed — the flavour pools (D279), Star activity ✖ (D280), five presets (D281), and the docs brought up to the code. Earlier the same day, sub-step 5 — the stat card built and approved (D278). Earlier the same day, sub-step 4 — Worldship built and approved (D277). Earlier the same day, Weaponized (D276). Earlier the same day, sub-step 3 — Blast doors and Shaft covers approved, Overgrown built and approved (D275). Earlier, 2026-10-28: stage (d) sub-steps 1–2 — the trait audit, `sets`, Under construction, Blast doors and Shaft covers. Earlier the same day, stage (c) closed — the torn edge, debris and sparks, and the stage's docs. Earlier the same day, stage (c) sub-steps 1–2, Operational status and the hull wounds. Earlier the same day, stage (b). Earlier the same day, stage (a), the machine world's stack. Previous: 2026-10-28, Session Y, the Phase 7 review and the roadmap reorder.

**Next free decision number: D329.**

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
| Phase 8 — the audit, layer names, the layer-name overlay, the scale bar, the stat-template pass, persistence and Reset, the keyboard map (Phase 8 complete) | AA | D282–D288 | [session-aa-polish.md](progress/session-aa-polish.md) |
| Phase 9b — the audit and the user's list | AB | D289–D290 | [session-ab-megastructures.md](progress/session-ab-megastructures.md) |
| Phase 9b — planets and moons: the weighted roll, `rounded`, orbital ring + elevators, defence network, minefield | AC | D291–D295 | [session-ac-planet-megastructures.md](progress/session-ac-planet-megastructures.md) |
| Phase 9b — gas and ice giants: skyhooks + orbital cities, built over natural in orbit | AD | D296–D297 | [session-ad-giant-megastructures.md](progress/session-ad-giant-megastructures.md) |
| Phase 9b — stars: `edgeCap` and `depthFrac`, mirrors on one orbit, collectors halfway to them, the Dyson shell, the Dyson swarm on its radials | AE | D298–D301 | [session-ae-star-megastructures.md](progress/session-ae-star-megastructures.md) |
| Phase 9b — nebula: one ringworld sunk in the gas, ice and rock belts as round or oval fields half the time | AF | D302–D303 | [session-af-nebula-megastructures.md](progress/session-af-nebula-megastructures.md) |
| Phase 9b closed — the black hole's starfield lensed star by star, the unfinished Dyson shell, Fortress World, Half-Built Dyson and Ringworld Nebula, the cross-cutting docs (Phase 9b complete) | AG | D304–D306 | [session-ag-close-9b.md](progress/session-ag-close-9b.md) |
| Phase 9c — the audit: everything rendered together, the 23 long files, spec drift; 9c split into sessions AI–AN | AH | D307–D308 | [session-ah-cleanup.md](progress/session-ah-cleanup.md) |
| Phase 9c — the bugs and the picture decisions: Ringed Giant's rings, natural presets without built traits, Trait count 0–8, Atmosphere opacity | AI | D309–D312 | [session-ai-fixes.md](progress/session-ai-fixes.md) |
| Phase 9c — the eye lists and the card notes | AJ | D313–D317 | [session-aj-eye-lists.md](progress/session-aj-eye-lists.md) |
| Phase 9c — the unbuilt controls and the spec drift: the Tertiary and Accent hue offsets, `hides`, Randomize inside a body's hue range and across the archetypes, section locks, the preset tables, stale comments | AK | D318–D321 | [session-ak-controls-drift.md](progress/session-ak-controls-drift.md) |
| Phase 9c — the eighteen straightforward file splits, no pixel changed | AL | D322 | [session-al-splits.md](progress/session-al-splits.md) |
| Phase 9c — the five stage refactors, no pixel changed | AM | D323 | [session-am-refactors.md](progress/session-am-refactors.md) |
| Phase 9c closed — the file layout from the real tree, stale references, the release decisions, the Phase 10 prompt (Phase 9c complete) | AN | D324–D328 | [session-an-close-9c.md](progress/session-an-close-9c.md) |
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
`core.val` in `js/data/archetypes/solid.js`; raising its floor from 0.84 keeps cores
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

1b. ~~**The body is cut off flat across its lower portion.**~~ **Closed in Session AI (part two):** the user checked the real app, with panning, resizing, export and Body size in frame at its top; it does not reproduce.
2. ~~**Atmosphere thickness has no control.**~~ **Closed in Session AH (D308):**
   the band's height stays rolled deliberately; an opacity control is folded
   into question 4.
3. **Stats must be derived from the stylized radii** (D5), not from real
   planetary figures, or the numbers will contradict the picture. Done for the
   solid, gaseous and stellar families; note D75 — every calibration constant
   in that path is only calibrated for the radius range it was fitted on, and a
   new family must re-measure rather than reuse. D119 adds the sharper form:
   where two constants jointly decide an output, they are ONE calibration and
   fitting either alone breaks the other.
4. ~~**Atmosphere reads well but is not tuned across every palette.**~~ **Closed in Session AI (part two):** swept across planets and moons, the 0.82 peak stays; the Atmosphere opacity slider scales it (D312).

