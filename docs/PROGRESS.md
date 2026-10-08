# Progress & Decisions

*Current state only: what is built, what is next, and where the reasoning lives. Update the Status block and the phase table at the end of every session. Session narrative goes in a new file under [progress/](progress/), detailed ticked items go in [progress/checklist.md](progress/checklist.md) — not here.*

> **This file records current state; the specs record *what*; `docs/progress/` records *why*.** The spec set is reconciled with the code — ARCHITECTURE, PARAMETERS, ARCHETYPE-TEMPLATE and the celestial docs are authoritative. Where a spec and this file disagree, this file wins. `npm run test:docs` keeps the specs and the code from drifting apart.

---

## Status

**Built:** Phases 0–6 ✅ · Phase 7: moon ✅ (S), asteroid ✅ (T, overhauled U1/U2), compact group ✅ (V, reviewed W) · the nebula is the last Phase 7 body.

**In progress (Session X): the diffuse group — `nebula`.** Stages 1–3 of 4 are built and signed off by the user: the filled stack with drift, feather and a density field; the Luminosity source slider; and the Nebula form select (cloud / planetary nebula / supernova remnant, the shell stack, with a pulsar's beams at a remnant's heart). **Stage 4 remains:** traits, the `nebula` stat template, flavour, presets, then the session close-out (progress/README row, checklist, this Status block and phase table, Phase 7 marked complete). Write-up so far: [progress/session-x-nebula.md](progress/session-x-nebula.md) (D219–D232). Spec: [celestials/diffuse-bodies.md](celestials/diffuse-bodies.md).

**Then:** Phase 8 (overlay, scale bar, polish — the compact family's spec calls the scale bar essential), Phase 9 (machine worlds), Phase 10 (release; the user's release prompt is [RC prompt to make releases easier.md](RC%20prompt%20to%20make%20releases%20easier.md)). See [ROADMAP.md](ROADMAP.md).

**Still open from the compact group, for the user's eye:** listed at the end of [progress/session-v-compact.md](progress/session-v-compact.md) — crack jaggedness, the magnetosphere fill, faint lensing arcs, no starfield lensing, the disc's hue bias.

**Last updated:** 2026-10-08 — docs cleanup: PROGRESS.md split, finished plan docs moved to `docs/archive/`, `shots/` cleared. Previous: Session W, the user's review of the compact group (D217–D218).

**Next free decision number: D233.**

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
| Phase 7 — nebula | X | — | ⬜ next |

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

