# Progress & Decisions

*The running record: what is built, what the next session needs to know, and
where to find the reasoning behind a rule. Update the Status line and
Checklist at the end of every session; add new narrative to
`docs/progress/`, not here — see [Session archive](#session-archive) below.*

**Status:** Sessions A–J complete · Phase 0 ✅ · Phase 1 ✅ · Phase 2 ✅ · Phase 3 ✅ ·
Phase 4 🔄 · **Climate system ✅ (Session F)** · **MVP polish ✅ (Session G)** ·
**Export defects ✅ (Session H)** · **Framing ✅ (Session I)** ·
**Test suite cut ✅ (Session J)**
**Next:** Phase 5 (gaseous) — the planet is where the user wants it.
**Last updated:** 2026-08-23 (Session J — test suite cut from ~4 min to ~30s;
sweep/stats/composed deleted. See [Test suite](#test-suite) for the rule that
keeps it from growing back)

> **This file records current state; the specs record *what*; `docs/progress/`
> records *why*.** As of D14 the spec set has been reconciled with the code,
> so ARCHITECTURE, PARAMETERS, ROADMAP, ARCHETYPE-TEMPLATE and the celestial
> docs are all current — read them as authoritative. Come here for what's
> built and what's next; follow the links below for the defect history and
> the reasoning behind a rule. `npm run test:docs` keeps the specs and code
> from drifting apart.

---

## Checklist

Mirrors [ROADMAP.md](ROADMAP.md). Tick items only when the phase's
*done-condition* is met, not when the code is written.

### Phase 0 — Skeleton ✅

- [x] `index.html` with script tags in dependency order
- [x] `style.css` — preview left, panel right, pinned buttons
- [x] seeded RNG (`js/core/rng.js`) — deterministic per named stream
- [x] value/simplex noise wrapper
- [x] canvas setup, resize/DPI handling
- [x] `CelestialCutaway.init()` exposed for test harnesses

### Phase 1 — Structure & generic renderer ✅

- [x] archetype data model (`js/data/archetypes.js`)
- [x] layer-stack builder with presence rolls, ordering, clamping
- [x] generic renderer walks the stack — no per-family draw code
- [x] parameter-driven layer positioning (D1, D2)
- [x] surface renormalized to exactly 1.0 (D3)

### Phase 2 — Colour ✅

- [x] HSV colour maths, generative per-layer colour
- [x] separation and muddiness guardrails, tested (D10, D11)
- [x] adding/removing a layer never recolours the others (D12)
- [x] self-lit layers exempt from reflective rules (D13)
- [x] contact-sheet tooling (`npm run sheet`) for judging colour in bulk

### Phase 3 — Detail elements ✅

- [x] recipes per layer role (`js/data/elements.js`)
- [x] angular terrain field (D15), generic across families
- [x] detail generator + primitives + draw dispatch
- [x] size-tier weighting, area-correct scatter (see
      [phase3-and-pitfalls.md](progress/phase3-and-pitfalls.md))

### Phase 4 — Traits & angular zones 🔄

- [x] zone primitive, trait placement grammar, ten traits
- [x] tidal locking rebuilt as an axis, not a trait (D27)
- [x] climate system: baseline field, caps, sea ice, aridity (Session F)
- [ ] the MVP test — twenty Randomizes the user would happily use

### Climate system ✅ (Session F)

- [x] `CC.Climate` thermal field on every body (D40)
- [x] snowline/caps, sea ice, aridity, exotic-ocean limits (D41–D46)
- [x] GUI defect pass — atmosphere clearing, seam trap, dead-world ice (D47–D49)
- [x] `npm run climate` harness with numeric + visual checks

### MVP polish ✅ (Session G)

- [x] plain-language stats derived from the render, not proxies (D51, D52)
- [x] info card is DOM-driven, panel decides nothing (D53)
- [x] PNG export re-renders instead of scaling the preview (D54, D55)
- [x] settings import/export, background lock (D56–D58)
- [x] mantle heat, trait-mark colour, layer gradients, flow energy and fluid depth shading (D59–D63)

### Export defects ✅ (Session H)

Found by driving the real GUI, which is where every one of these lived.

- [x] the card is as tall as its content, not its slot (D62)
- [x] the composed export's 4:3 aspect floor (D63)
- [x] resolution scales the card-only export (D64)
- [x] **the info card is no longer a zoom control** (D65) — worst-case zoom on
      toggling it falls from 48.8% to 1.0%
- [x] the first frame is no longer a squished oval (D66)
- [x] export feedback that says what happened, and does not claim success
      before an async clipboard write settles (D67)
- [x] the transparent body-only menu item folded into the 1:1 export (D68)

### Framing ✅ (Session I)

Pulled forward from Phase 8. Full write-up in [ROADMAP.md](ROADMAP.md).

- [x] **zoom and pan** (D69) — 1x–20x log slider, wheel-to-cursor, drag-to-pan,
      `Reset framing`. The entire feature is three numbers patched into
      `makeView`; nothing in `draw/` knows it exists
- [x] **framing is a value, not a mode** (D70) — zoom 1 with no pan is the old
      render byte-for-byte, so there is no "off" state to be in wrongly and the
      frame guide's visibility is derived rather than stored
- [x] **`extent` is no longer a zoom control** (D71) — the second thing in
      `draw/canvas.js` to have been one. It used to divide into `R`, so a ringed
      world was drawn *smaller* than a bare one and Randomize kept returning
      planets too small to read. Every body is now drawn at the same scale;
      `extent` only bounds the pan clamp
- [x] **the background does not pan or zoom** (D72) — a cutaway's backdrop is
      paper, not sky. Parallax was considered and rejected: at 20x a scaled
      starfield is a white smear
- [x] **pan is a CSS-hidden number input, never `type="hidden"`** (D73) — on a
      hidden input `defaultValue` mirrors `value` live, so the settings-string
      sweep would have skipped pan every time. Framing would have *appeared* to
      share correctly while silently losing half of itself. Caught by a
      round-trip test, not by reading the code

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
| `npm run test:docs` | 0.3s. **The specs still describe the code** — every layer has a colour entry, sat/val ranges are ordered and in gamut, **frac ranges compose at all 2ⁿ combinations of extremes**, every script in `index.html` exists, no ES module syntax. Loops every archetype, so it covers new families for free |
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

1. **The moon and asteroid frac tables** in `docs/celestials/solid-bodies.md`
   have not been revisited. Check them against D4 (the table's radii compose)
   and D5 (stylized proportions) before authoring those stacks — the planet
   table needed both corrections and these were written the same way.
2. **Atmosphere thickness has no control.** It is rolled from its own stream.
   PARAMETERS.md doesn't list one; add it, or leave it rolled deliberately.
3. **Stats must be derived from the stylized radii** (D5), not from real
   planetary figures, or the numbers will contradict the picture.
4. **Atmosphere reads well but is not tuned across every palette.** The screen
   blend fixed the "solid band" failure, but the peak alpha (0.82) and the
   limb-brightening curve were set by eye on a handful of bodies. Worth a
   sheet-wide pass at some point.

---

## Session archive

This file used to hold the full decisions log and session-by-session
narrative — it grew past 3,000 lines and stopped being useful as context.
The full history is still here, just split by session so only the relevant
part needs to be pulled in:

| File | Covers |
|---|---|
| [decisions-early.md](progress/decisions-early.md) | D1–D28, D9 — structure, colour, terrain, frosting, zones (Sessions A–C) |
| [phase3-and-pitfalls.md](progress/phase3-and-pitfalls.md) | Phase 3 detail-element tuning notes; recurring traps worth not repeating |
| [session-c.md](progress/session-c.md) | Phase 4 traits, the tidal-locking axis rework, what was still wrong after review |
| [session-d.md](progress/session-d.md) | D29 — tidal-locking defect fixes |
| [session-e.md](progress/session-e.md) | D30–D39 — atmosphere/sea-level fixes, the `tempAt` thermal field, the unzoned-cold investigation |
| [session-f1-climate.md](progress/session-f1-climate.md) | D40–D46 — the climate system build |
| [session-f2-gui-defects.md](progress/session-f2-gui-defects.md) | D47–D49 — defects found on the real GUI |
| [session-f3-docs-prep.md](progress/session-f3-docs-prep.md) | D50–D63 — docs reconciliation, stats, info card, export, mantle/trait colour (Session G) |
| [session-h-export-defects.md](progress/session-h-export-defects.md) | D62–D68 — card height, aspect floor, the card-as-zoom-control bug, the first-frame oval, honest export feedback (Session H) |

Decision numbers (`D#`) are referenced from code comments and other docs —
if you're looking for a specific one, `grep -rn "D42"` across `docs/progress/`
will find it faster than opening each file.
