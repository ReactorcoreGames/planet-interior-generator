# Phase 3 tuning notes, and things that bit us

*Moved out of PROGRESS.md. Session A/B era notes on the detail-element
pipeline and recurring traps worth not repeating.*

---

## Phase 3 tuning notes

The Phase 3 pipeline is four files plus one addition to `draw/layers.js`:

| File | Role |
|---|---|
| `js/data/elements.js` | recipes per layer role — pure data |
| `js/gen/terrain.js` | the D15 angular field generator |
| `js/gen/details.js` | recipes + density → elements in body space |
| `js/draw/primitives.js` | one function per primitive; no role names |
| `js/draw/details.js` | walks elements, derives colour, dispatches |
| `js/draw/layers.js` | gained `reliefFn` and `clipToLayer` |

**Five defects made ~3,600 generated elements render as flat discs.** Every one
was invisible from reading the code, and generation was correct throughout —
the probes confirmed healthy counts and positions while the picture showed
nothing. They are recorded because each is easy to reintroduce:

1. **Sub-pixel speckle.** `view.fs(size * 100) * 0.1` double-scaled and
   collapsed every grain to the 0.35px floor. Grain is now floored at 0.55px
   via `view.px`, so it stays material at any resolution.

2. **Proportional value steps are invisible on dark layers.** Deriving a detail
   colour by *multiplying* a band's value gives no usable contrast at v≈0.22.
   `toneColour` now moves an **absolute** distance in value (±0.30–0.34) in
   whichever direction the layer has room for. Hue keeps the element in family;
   value is what makes it readable.

3. **Tier shares too even, size steps too narrow.** Elements all landed in one
   size class and the mantle read as bubble wrap. Shares are now heavily
   weighted to the small end (3.5% / 13% / 32% / 51.5%) across a ~7× size
   range. *Roughly 15× more small elements than large ones is what reads as
   intricate.*

4. **A convection cell must be an OPEN SPIRAL, not a filled ellipse.** The
   first version — stroked ellipse, faint fill, inner curl — produced uniform
   ovals. The fill is gone and the spiral is now the primary shape.

5. **Uniform depth rolls crowd the inner edge.** A band's area grows with
   radius, so scattering uniformly in `t` leaves a thick layer's outer part
   bare. `areaSpread` weights by sqrt so elements fill the visible area evenly.

**Counts and sizes are authored against the tier-0 size**, which is the largest
tier and the rarest. Authoring against what you want the *typical* element to
look like makes everything far too small, since most instances are tier 2–3.

**The Size tiers slider CAPS the recipe's own tier count** — `min(recipe.tiers,
slider)`. Reading the recipe alone left the control inert: it moved and nothing
changed, which is precisely the silently-unwired control the Session A domtest
exists to catch. It was found by asserting on generator output per control
setting, not by looking at renders. Worth repeating for every new control:
**check that a control changes the output, not just that it is bound.**

Total count stays constant as tiers drop — the elements redistribute into the
remaining classes. Fewer tiers means less size *variety*, never less density.

**Performance is not the constraint.** At 65% density a planet emits ~9,000
elements and renders in ~0.5s at 1080p; at 100% density and 4K it is ~0.8s,
against a 10–20s budget. There is roughly 20× headroom, so density questions
should never be settled on performance grounds.

**`sizeRel: true`** makes a recipe's sizes fractions of the layer's own
thickness rather than of the body radius. The crust uses it, because its
thickness varies most (Interior heat thins it, a deep ocean drowns it further)
and absolute sizes read correctly at only one setting.

---

## Things that bit us

Worth remembering; each cost real time.

**Test files were stale from v2.** `sweep.mjs` and `shots.mjs` imported
`src/generate.js`, which had moved to `archive/v2/`. `domtest.mjs` drove v2's
control IDs. All three rewritten in Session A. They now load the scripts listed
in `index.html`, so that stays the single source of truth.

**jsdom never fires `DOMContentLoaded`** under `runScripts: "outside-only"`.
The app was waiting for it, so nothing initialised and *every* interaction test
passed vacuously against an unwired UI. Fixed by exposing
`CelestialCutaway.init()`; `domtest.mjs` now asserts the UI is actually wired
before it starts, so this cannot regress silently.

**Layer ordering must be clamped, not trusted.** Parameter-driven layers and
`coreBias` can each produce radii that violate monotonic ordering. Pass 2 of
`build` clamps rather than assuming the rolls behaved.

**Presence rolls are consumed even when the layer is dropped.** Otherwise
removing a layer reshuffles every layer below it and the same seed stops giving
the same body.

**Colour needs a contact sheet, not single renders.** Every individual body in
the first colour pass looked defensible; laid out 24-up the failure was
obvious and immediate — everything was a pastel bullseye. `npm run sheet`
exists because of that, and it is what caught D10 and D11.

**Deriving every hue from the anchors is wrong.** See D10 — it was the largest
single colour defect and it is not visible from reading the code.

**Sequential RNG draws across a variable-length list are a trap.** The
structure stage got this right from the start (rolls are consumed even when a
layer is dropped) but the colour stage repeated the bug in a new form, twice —
once through shared draws and once through geometry-derived depth (D12).
Anywhere a list can gain or lose entries, key the randomness to identity, not
to position.

**A curve tuned once is probably tuned wrong.** The atmosphere falloff needed
three passes: too sharp, then far too soft, then right. Renders in both
directions of the mistake are what located the middle.

---
## Test suite

`npm test` runs three checks. All green as of Session A.

| Command | What it does |
|---|---|
| `npm run test:lib` | vendored libraries load as classic scripts and behave |
| `npm run test:docs` | **the specs still describe the code** — colour values match, `order` is complete, frac ranges compose, every script in `index.html` exists, no ES module syntax |
| `npm run test:sweep` | ~7,900 bodies + ~650 renders: stack invariants, determinism, RNG stream independence, presence contracts |
| `npm run test:dom` | loads the real `index.html` in jsdom, drives every control, checks locks, accordion, determinism, resolution independence, tooltip coverage |
| `npm run shots` | renders ~60 PNGs to `shots/` — parameter sweeps, one per file |
| `npm run sheet` | **24 randomized bodies in one contact sheet.** The way to judge colour: harmony is a property of the *spread* of outputs, so they have to be seen side by side. `npm run sheet -- 48 8` for more |
| `npm run climate` | **The climate system's numbers and renders.** Every check CLIMATE-PLAN.md specified, step by step — the baseline's four corners, the latitude gradient, cap extent in degrees from a pole, the sea-ice pixel probe, tilt, and the 300-body ocean hue distribution. `npm run climate -- report` for numbers only. **`shots/climate/_cap-crop.png` is the view to judge caps from**; at whole-disc scale a correct cap reads as a faint rim |

Things the suite guarantees, so a regression can't slip through quietly:

- same seed + same settings ⇒ byte-identical geometry *and* identical palette
- element counts identical at 360p and 2160p (resolution independence)
- Ocean depth 0 removes the ocean; Interior heat 0 removes the outer core
- Ocean depth never disturbs the interior's proportions
- the surface is always exactly 1.0
- colour controls never move geometry (independent RNG streams)
- no fluorescent layers; no indistinguishable adjacent layer pairs (D11)
- toggling the atmosphere, the ocean or the outer core never recolours the
  layers that remain (D12)
- every control carries a tooltip

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

