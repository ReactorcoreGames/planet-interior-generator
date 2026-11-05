# Progress & Decisions

*Current state only: what is built, what is next, and where the reasoning lives. Update the Status block and the phase table at the end of every session. Session narrative goes in a new file under [progress/](progress/), detailed ticked items go in [progress/checklist.md](progress/checklist.md) — not here.*

> **This file records current state; the specs record *what*; `docs/progress/` records *why*.** The spec set is reconciled with the code — ARCHITECTURE, PARAMETERS, ARCHETYPE-TEMPLATE and the celestial docs are authoritative. Where a spec and this file disagree, this file wins. `npm run test:docs` keeps the specs and the code from drifting apart.

---

## Status

**Built and released: v4.0.** Phases 0–10 are complete. Fourteen body types, megastructures, labels and scale bar, saved settings, the keyboard map; every file in `js/` is at most 500 lines. The release (Session AO) made `LICENSE`, `README.md`, `guide.md`, `promo.md`, `promo/` and the two zips, and publishing them is the user's. See [session-ao-release.md](progress/session-ao-release.md).

**The trailer is made too** (Session AP): `trailer/celestial-cutaway-trailer-1080p.mp4`, gitignored, with its copy in `promo.md`. See [session-ap-trailer.md](progress/session-ap-trailer.md).

**Next:** only what the user asks for.

**Last updated:** 2026-11-05, Session AP: the YouTube trailer (D338–D340).

**Next free decision number: D341.**

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
| Phase 10 — the release, v4.0: Help, `LICENSE`, the text, `promo/`, the zips, the clean-up (Phase 10 complete) | AO | D329–D337 | [session-ao-release.md](progress/session-ao-release.md) |
| The YouTube trailer and its copy | AP | D338–D340 | [session-ap-trailer.md](progress/session-ap-trailer.md) |
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

