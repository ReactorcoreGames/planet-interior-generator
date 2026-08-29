# Session K — Phase 5, the gaseous family

*`gas-giant` and `ice-giant`. The generalisation test: the architecture claims
a new body family is a data edit, and this is where that claim was checked.*

---

## The verdict on the done-condition

> **Done when both render well, `Starlight` visibly changes which world you are
> looking at, and NOTHING in `draw/` needed a gas-giant-specific branch.**

**The `draw/` condition held.** `grep -rn '"crust"\|"ocean"\|"mantle"' js/draw/`
still returns only `card.js`, and nothing in `js/draw/` names a gaseous role or
archetype. What the phase needed beyond data was **six general mechanisms**
plus **three primitives**, each of which any future family can use:

| Mechanism | Where | What it does |
|---|---|---|
| `alternate` | `gen/elemgen.js` | consecutive concentric bands cycle through tones. The whole of gas-giant banding |
| `bandWidth` | `gen/elemgen.js` | band thickness — for an alternating comb, **relative to its own spacing** (see D74) |
| `zonal` / `bands` | `gen/elemgen.js` | an arrow or flow-line travels *around* the body, flipping direction between radial belts. Counter-rotating jets |
| `climateLean` | `gen/palette.js` | `heatLean`'s counterpart on the *other* heat source — the star |
| `boundarySoftens` | `gen/structure.js` | a parameter changes a boundary's *character*, not just a radius |
| `named` | `gen/elemgen.js` | a trait that is one feature rather than one of a field (see D76) |
| `storm` / `capsule` / `shard` | `draw/primitives.js` | a shaded cyclone, a manufactured pressure hull, a faceted crystal — none expressible as a soft blob (see D80) |
| `bright` | `draw/details.js` | inverts a bulk vein's polarity: a reflective lode rather than a dark ore seam |

**Starlight visibly changes the world.** Cloud species emerge from the existing
thermal field rather than from a second ramp: a cold giant shows a pale ammonia
deck at sharp banding, a hot one has its condensation level driven below the
visible layer and reads as dark, ruddy, cloud-stripped gas with the banding
washed out. The card says the same thing in words, off the same two figures.

**Both render well** — the user's call, made by looking, and confirmed.

---

## What was built

- **`js/data/archetypes/`** — split per family (registry + solid + gaseous)
- **`js/data/elements/`** — same split; seven new gaseous roles
- **`js/data/traits/`** — same split, plus `orbital.js` for traits belonging to
  no family; seven new gaseous traits
- **`js/data/flavour/`** — same split (see "the info card" below)
- **`js/gen/stats/`** — same split (see below)
- **D22 discharged**: the frosting zone table moved out of `draw/film.js` and
  into `colorProfile.layers.film`

---

## Decisions

### D74 · An alternating comb sizes itself against its SPACING, not its layer

**Where:** `gen/elemgen.js`, `buildBands`.

`bandWidth` was authored as a fraction of the layer's thickness, independent of
how many bands were drawn. For a handful of wide atmosphere sub-bands that is
fine. For a thirty-band comb it is a trap: the spacing is the layer divided by
the count, so at thirty bands each one came out **seven times wider than the gap
to its neighbour**. Every point on the layer was covered by about seven bands of
alternating tone, which composite back to the base colour.

Thirty-one correctly generated, correctly coloured, correctly alternating bands
that added up to a flat wash. **The picture looked like the banding was missing;
it was all there, on top of itself.** Three separate "fix the banding" attempts
went past this before the elements were measured rather than looked at.

An alternating comb now sizes itself against its own spacing — at `bandWidth`
1.0 consecutive bands just touch. That is a proportion that stays correct at any
count, which a fraction of the layer never can. A non-alternating set keeps the
old meaning, since it has no neighbour to interfere with.

### D75 · A calibration constant is only calibrated for the range it was fitted on

**This is D45 again, and it happened THREE TIMES in one session.** Recording it
as its own decision because the pattern is clearly not yet learned.

1. **Gravity.** `density * (radius / 6100)` is a terrestrial scaling that lands
   an Earth-sized rock at 1 g. Handed a gas giant it produced 7.3 g and **pinned
   every single body against the 6 g clamp** — the Gravity line stopped varying
   across the entire family, which is worse than being wrong, because a constant
   carries no information. Fixed with a per-archetype `gravityScale`; a shared
   per-*family* one was tried first and was still wrong by a factor of three,
   because a gas giant's radius range is 45–95k and an ice giant's is 20–30k.
2. **The hazard rating's cold rungs.** Calibrated against a surface a person
   might stand on, where −190 °C is extraordinary. On a gas giant it is Tuesday
   — the spec's ordinary range is −180 to −60 — so every giant cleared the "at
   least Severe" floor on temperature alone.
3. **The crush-depth ladder**, whose thresholds were written against figures the
   formula was later corrected out of reaching.

**The rule: when a formula's input changes range, re-measure what it now
produces before trusting any threshold downstream of it.** A sweep printing
min/max over 40 bodies took thirty seconds and caught all three.

### D76 · A trait must be a different KIND of mark — and `tiers` fights this

**Where:** `gen/elemgen.js` `tierSplit`, and every trait in
`js/data/traits/gaseous.js`.

Seven gaseous traits were written, all of them rolled correctly, all of them
placed elements, and **all seven were invisible.** A per-trait contact sheet
(one body per trait, forced on) showed eight identical pictures.

Two causes, and both are worth knowing:

**1. The vocabulary was wrong.** This is D60's mineral-vein lesson at family
scale. A Great Storm drawn as a `cell` is the ninety-first cell in a layer that
already draws ninety; helium rain drawn as a `flow-line` is lost among three
hundred. Fixed by giving each trait a mark nothing else in its layer makes.
(The marks chosen here — filled ovals, `chunk`s — were themselves replaced a
round later; see D80. Getting the *silhouette* off the layer's vocabulary was
necessary and not sufficient.)

**2. `tiers` is built for FIELDS and inverts for features.** At one tier the
*smallest* class survives, so turning Size-tiers down thins variety without
making everything enormous. Correct for grain and debris; catastrophic for a
single named object. A Great Storm declared `tiers: 1` was drawn at 0.14× —
**three times smaller than the ordinary convection cells it was meant to
dominate.** `buildWedges` already had a hand-rolled escape for exactly this
(impact basins shrinking to slivers); `named: true` is that reasoning made
general, and it also exempts the trait from the clumping alpha, which was
quietly halving authored opacities on individually-meaningful instances.

### D77 · `anchor` may be a list, because a shared trait meets different stacks

**Where:** `gen/traitroll.js`, `anchorLayer`.

`helium-rain` anchored to `water-cloud`. An ice giant has no such layer, so
`anchorLayer` returned null and the trait **silently placed nothing** — it
rolled, it appeared in the fact list, the card could mention it, and the picture
had none of it. The worst kind of failure: everything except the render says it
worked.

`anchor` now accepts a list of fallbacks, which says "the bulk envelope,
whatever this body calls it" — the thing the trait actually means. Single roles
still work unchanged.

**The audit that found it is worth keeping as a habit:** for every archetype,
for every trait it offers, force the trait on and assert at least one element
is placed. It is mechanically true-or-false and generic over
`CC.Archetypes.ids()`, so it would qualify as a test under the Session J rule
— not added, per the standing instruction not to add tests unasked, but it is
the check to reach for when a family lands.

### D78 · A stat template is a MINDSET, not a list of rows

**Where:** `js/gen/stats/`, `js/data/flavour/`, `draw/card.js`.

The user's observation, and the most valuable structural note of the session:
the info card was reasoning like a planet's card even when the body had no
surface. Every question in `gen/stats.js` was a solid-body question — what is
underfoot, how much is dry land, where the coastline runs, could you breathe.

Those are not merely inapplicable to a giant, they are the **wrong shape of
question**. Nobody lands on one. Bolting "if gaseous, skip the surface line"
onto the template would have produced a planet's card with holes in it.

So the template is per family. Each declares its own line order, its own detail
levels, and its own reasoning; the registry keeps only what is genuinely
universal (temperature conversion, radius, hazard, fingerprint). A gas giant's
card asks:

- **Depth to crush point** — where a ship stops being a ship
- **Cloud deck** — which species is visible, read off `chillAt`/`scorchAt`
- **Where you can work** — a *ladder* from orbit to skimmers to platforms to
  deep hulls, deliberately not a verdict, because how deep you can put people
  is a claim about the setting's technology rather than about the planet
- **Interior** — one line for the part nobody will ever reach

The flavour pools split the same way and for the same reason: "Pick a flat spot
and set down" is not wrong on a giant so much as it implies a landing was ever
on the table. `facts.family` selects the pool; genuinely universal lines live
in the registry and are offered to everyone.

**`draw/card.js` lost its hardcoded `LEVELS` table** in the process — the last
place in `draw/` that knew what one family's rows were called. It reads
`stats.levels` now.

---

## Deliberate declarations

**Climate.** Both giants declare `latitude: 0.12`. Not 1.0, because a giant's
bands are driven by rotation, not insolation, and a strong polar term would put
a cap on a body with no surface to deposit one on. Not omitted either, because a
flat field would make poles and equator identical. The structural guarantee
against an accidental cap is that the only terrain field in either stack is on
the buried rock floor, occluded by the whole envelope.

**`rock-core`, not `core`.** A planet's `core` is iron: incandescent, smooth, no
terrain. A giant's heart is rock and ice with a real floor on it, and that floor
is what the frosting deposits crushed sediment on. Two materials, two role
names; the planet's core is untouched.

**`oversized-core` / `coreless` / `twin-core` stay cut.** The first two are the
ends of the Core size bias slider, and `boundarySoftens` gives the low end its
structural half: the core's boundary character softens from `near-perfect` to a
gradient, because a coreless giant has no discrete core to draw an edge around.

### D79 · The picker only ever heard about CHANGES, never about state

**Where:** `js/main.js`, init.

Load the page with the archetype control already restored to `gas-giant` and
the trait picker showed the **planet's** trait list. `TraitPicker` defaults to
`planet` internally, `setArchetype` early-returns when the id matches, and it
was only ever called from the change handler — so on a cold boot nothing had
changed and nothing told it. `PresetGallery`, two blocks down, already did the
right thing; the picker was simply missing the same line.

**The class of bug matters more than the fix.** No code path in the project
exercises "boot with a non-default control value", because every harness builds
its settings object explicitly. Only pressing F5 in a real browser with a
setting already in place finds it — which is precisely the case
[GUI defects need the real GUI](../../CLAUDE.md) exists to describe.

`test/_tmp/pickerboot.mjs` reproduces it in jsdom: preset the control, then
load `main.js`, then read what the picker rendered. It fails on the old code and
passes on the new one.

### D80 · A soft blob cannot say what a thing IS — three primitives, not one

**Where:** `draw/primitives.js` (`storm`, `capsule`, `shard`),
`draw/details.js` (`stormFill`, `hullFill`, `gemFill`).

D76 fixed the traits' *silhouettes* by moving them off the layer's own
vocabulary. The user's next look found the layer beneath that: the shapes were
right and the **materials** were wrong.

- A great storm drawn as `blob` is one flat `fill()` — "flat, textureless and
  pale". A cyclone has a bright wall, a dark eye, and bands dragged round by
  its own rotation, and none of that survives a single fill. `storm` draws a
  radial gradient with concentric bands under a **multiply/overlay blend**, so
  the bands read as depth in the cloud rather than as stripes on top of it.
- Gas-miner platforms drawn as `chunk` "look like rocks", because `chunk` *is*
  broken rock. What says *manufactured* is straight sides, hard ends, and a
  narrow specular band against a dark shadow — a wide value range at low
  chroma. `capsule` draws that, and `hullFill` deliberately does **not** take
  the layer's hue beyond a faint tint: industry does not belong to the planet,
  and that independence is what makes it read as an intruder.
- Diamond rain drawn as `chunk` was "an asteroid ring in the middle of the
  planet". A diamond is a *transparent* object — what you see is the fluid
  behind it, brightened. `shard` is few long straight facets with a glint,
  drawn under a **screen blend**, and the transparency is what says gem.

**Blend modes were the right instinct.** `globalCompositeOperation` was already
used in three places, so it is established technique here rather than a new
dependency.

**Two polarities, one primitive.** Helium rain as a `bulk` vein looked like the
planet's mineral veins — a rock feature on a body made of gas. The first fix
inverted it via `tone: "darker"`, which drew it at v=0.27 on a v=0.32 layer:
near-black on dark purple, invisible by construction. *Darkening needs room
beneath to darken into.* Falling helium is reflective anyway, so `bright: true`
gives the bulk vein the opposite polarity — a bright fill in a dark contour.
Same primitive, opposite reading, which is exactly the separation wanted.

### D81 · Two style dispatchers had drifted, and the first new one crashed

**Where:** `draw/details.js` `styleFor`, consumed by `draw/zonepaint.js`.

Which style set a primitive wants was answered in two places: this file's
element loop, and `drawOutward` in `zonepaint.js` for traits beyond the body.
They had diverged — zonepaint knew about `chunk` and nothing else — so the
first orbital trait wanting a richer style than a colour string **crashed the
renderer**: `capsule` got a colour where it expected `{hull, lit, shade, trim}`
and `addColorStop` was handed undefined.

A primitive's style contract is a property of the primitive, so it is answered
once in `styleFor` and both callers ask. Adding a fourth set is now one edit
rather than two that can disagree.

### D82 · A symbol is not a scale model

The platforms and skimmers were drawn at 0.026–0.048 of the body radius —
correct shape, correct shading, correct orientation, and about eight pixels on
a 400px render. Legible only at 2600px.

A platform *is* out of scale with a body 100,000 km across. It is a **symbol
for an industry**, the way a compass rose on a map is not drawn to scale, and
it has to be readable to do that job at all. Roughly doubled.

**`reach: "outward"` does not leave the body**, incidentally — it clamps to the
top of the anchor layer. `anchor: "orbit"` is the only reach that genuinely
exits, which is where the skimmers went.

### D83 · `great-storm` and `storm-belts` were wrongly exclusive

The reasoning was that one enormous storm would be lost among a belt of small
ones. Jupiter disproves it: the Great Red Spot sits **in** a belt of smaller
ovals, and the size contrast is a large part of why the Spot reads as
remarkable. The exclusion threw away the best-looking combination the family
has. Removed.

### D84 · Do not "fix" the half that was already praised

**The most expensive mistake of the session, and it was a reading failure
rather than a technical one.**

The feedback on storms was: *"I like the shapes and sizes, they're good, but
often they look flat, textureless and pale."* That is a compliment and a
complaint about two different properties. The complaint was answered by
replacing the shape — a lobed angular polygon became a shaded cyclone with
concentric bands and an eye, which is a **top-down** view of a storm and
therefore the wrong projection for a cross-section entirely. The praised half
was thrown away to fix the criticised half.

Corrected once by reverting to the polygon, then immediately **broken again**
in the same turn by smoothing its outline — "the shapes came out too angular"
was my own invention, not the user's note. The angular silhouette is the point:
it reads as a *hazard zone on a diagram*, the region a diving vessel would be
told to avoid, which is a stronger idea than a photographic storm.

The primitive now carries a note saying it has been changed away from twice and
reverted twice, so it is not attempted a third time.

**What was actually missing** was three things, all inside the existing shape:
fBm turbulence sampled in **body space** (so the texture stays welded to the
planet under pan and zoom, the same rule `draw/grain.js` follows), a linear
gradient darkening toward the body's centre, and translucency plus a
multiply/overlay blend so the banding reads through.

The turbulence itself took two passes: a two-sine scatter produced a Lissajous
curve that left most of the shape empty, and a jittered grid at a fraction of a
cell read as woven crosshatch. Jittering by ~1.6 cells with a wide angular
spread is what finally reads as churn.

### D85 · A trait may declare `under`, and other placement grammar

Four small general additions, each prompted by a specific defect:

| Field | Where | Fixes |
|---|---|---|
| `under` | `gen/details.js` draw-order pass | `violent-banding` painted over the storms in its own layer. Banding is the background a storm sits on |
| `minGap` | `gen/traitroll.js` `anchorAngles` | platforms rolled a degree apart drew as one smudge. A rejection sample, bounded so an impossible request degrades instead of hanging |
| `spread` | `gen/traitroll.js` | instance count was a pure function of the Detail-density slider, so every giant had the same number of platforms. Now half to double, rolled per body |
| random+`minGap` over `even` | the two industry traits | even spacing reads as artificial — right for a ring system, wrong for an industry that grew where the gas was |

### D86 · The cirrus deck fades out instead of stopping

`upper-cloud` was an ordinary banded layer and drew as a near-opaque white ring
with a hard outer edge — wrong twice over on a family whose entire premise is
that there is no surface to stand on. `outward: true` hands it to the same
radial-falloff path the planet's atmosphere already uses; no new drawing code,
the layer simply was not asking for it.

Thickened to roughly double to compensate for the apparent size a fading layer
loses. The consequence worth noting: **the troposphere is now the outermost
real layer**, so the banding defines the silhouette — which is right, since a
gas giant is recognised by its bands and not by its haze.

That change immediately broke the storms, which are sized with `sizeRel`
against a troposphere whose thickness went from ~0.13 to ~0.22. **D75 in its
smallest form:** a proportion is only calibrated for the range it was fitted
on, and that includes proportions *of* something else that moved.

### D87 · Diamond rain is real, and it is two pictures

Worth stating because the name sounds invented: in an ice giant's mantle,
methane cracks under pressure and the carbon compresses into diamond, which
then **sinks** because it is denser than the slush. So it is a slow fall
through the deep interior, not a glitter near the surface.

Split into `diamond-rain` (crystals in transit, pointing inward because that is
the way they are going) and `diamond-layer` (where they end up — a dense drift
against the floor). The difference between the two is `depth` alone; no new
machinery.

**Helium rain took three shapes** before it worked: `flow-line` vanished among
the layer's own three hundred; `vein` + `bulk` was visible but looked like the
planet's mineral veins — a rock feature on a body made of gas, its hard contour
reading as a fracture through something solid. Helium separating out of
hydrogen is a fluid leaving a fluid: it **beads**. It is now a field of round,
contourless `speckle` droplets, which is the one primitive here with no
outline at all.

### D88 · Measure whether a thing draws; do not squint at it

**Four separate times this phase a trait was reported invisible when it was
drawing correctly, and once the reverse.** Crops were guessed at, and a body
with one or two instances of a feature will hide it from any fixed window.

`test/_tmp/pixdiff.mjs` renders the body with and without each trait and counts
differing pixels. It answers "does this draw at all" in one line per trait and
takes seconds:

```
great-storm      4901 px  0.605%  maxdelta 393
gas-miner-...     517 px  0.064%  maxdelta 351
```

It should have been the first tool built, not the last. **When the question is
"is it there", count pixels; save eyes for "does it look right".**

The close-up tool was also fixed to centre its crop on an actual instance of
the trait rather than on a guessed quadrant.

### D89 · A canvas gradient CLAMPS past its last stop

The storms' soft edge and the spanning fade are both painted as gradients that
run from the layer's own colour at the rim to transparent inside. Beyond a
gradient's final stop, canvas fills with the **endpoint colour at full
opacity** — so any part of the shape outside the gradient's span was painted
solid rim colour, which is precisely "invisible".

Measured: an 85px shape given a 52px gradient, so the outer two thirds was
erased. The span had been multiplied by `squash`, which was backwards twice —
squash compresses the shape *perpendicular* to the radial axis, and the factor
was below 1 when the span needed to be longer.

**Any gradient used as a mask must reach past the furthest point of what it
masks.** Both the feather and the fade now derive their extent from the same
`base * (1 + rough * 1.5)` the outline uses.

Related: **`destination-out` does not isolate.** The obvious way to feather is
to erase the perimeter, and it cannot work here — the storm is drawn straight
onto the scene under a `multiply`/`overlay` blend, so a composite operation
applies to the whole canvas. Painting the layer's colour back over the edge
achieves the same reading with one extra fill and no offscreen buffer.

### D90 · `maxThickness`, and why `frac` alone cannot express it

`frac` bounds where a layer's **outer edge** sits. Its thickness is whatever is
left between it and the next layer down — which no range can control, and which
is usually right, since a layer should absorb the slack.

It fails when the layer beneath is optional. An ice giant's `icy-mantle` rolled
**79% of the radius** as one near-featureless band whenever `superionic` did
not roll: a cutaway with nothing to cut away.

`maxThickness` raises the layer's floor rather than lowering its ceiling, so
the layer keeps its position and the space goes inward — but **never past the
neighbour's own authored ceiling**, or the cap becomes a licence to resize a
layer that had a range for a reason (the first version handed the rock core
0.40 against an authored 0.17).

The doccheck caught the follow-on: widening the core's range to absorb the
surplus overlapped `superionic`'s floor. **The frac-composition test earns its
place again** — that is the third time it has caught an authored overlap.

### D91 · `reach: "spanning"` implemented, five phases after being documented

TRAIT-SYSTEM.md has described `spanning` from the start; `traitDepth` had no
branch for it, so it silently behaved like `on`. The great storm is the first
genuine user — a storm reaching from the cirrus deck down through the banded
layer is one feature, and either layer's clip cuts it in half.

Spanning traits now draw in their own pass, clipped to the body rather than to
a band, exactly as surface damage already did for its own reason. `fadeEnds`
dissolves both radial extremes so the feature ends by fading rather than by
being cut.

`areaSpread` needed a fix to go with it: it weights a scatter by area, which
means squaring the radius, and **a negative radius folds back to positive** —
so a depth range reaching below a layer's floor was silently mirrored. It falls
back to a plain lerp when either end goes negative.

### D92 · Diamond rain, corrected by looking it up

The user checked the physics, and it changed the design. Diamonds form around
10,000 km down, are about a centimetre across, and sink until it is hot enough
that they **melt into a liquid-carbon sea** — so there is no diamond floor to
draw, and `diamond-layer` was inventing one.

`diamond-rain` is restored to its pre-split figures (many fine crystals, not a
few pebbles) and moved to the bulk envelope where it actually forms rather than
to the troposphere it was anchored to for convenience.

Replaced by **`prismatic-ice`**: exotic water-ice phases (ice VII, ice X) that
form higher in the mantle, are genuinely birefringent — a real reason to show
colour — and are drawn **crosswise** because they are growing in a shear rather
than falling. Same primitive as the rain, one flag, opposite reading.

**A narrow hue band per body, not a spectrum per crystal.** Rolling every
instance across the wheel reads as confetti *and* makes every world identical,
since every world then shows everything. One band per body gives one world
cyan-through-violet and the next amber-through-rose.

### D93 · The cirrus deck's density is its CURVE, not its width

D86 made `upper-cloud` an outward fading layer and doubled its depth to
compensate for the apparent size a fading layer loses. That was wrong in two
ways: it pushed the troposphere inward, which rescaled every `sizeRel` storm
anchored to it, and a wide soft halo is not what a cirrus deck is.

Restored to its original thin band. Density now comes from `fadeHold` — the
fraction of the depth carried at near-full opacity before the ease-out starts
— which is archetype data, so any layer that is substantial-then-fading can say
so. The giants declare 0.62 and 0.66 against the planet atmosphere's 0.30.

The troposphere ranges were also narrowed, because **a proportion is only
meaningful if what it is a proportion of is predictable**: at [0.840, 0.985] it
rolled anywhere from 0.07 to 0.27 thick, so one authored storm size drew four
times larger on one body than another.

---

## Still open

- ~~**The ring/debris traits draw in front of the body at any pan.**~~
  **Resolved.** This was the Session I clip-rectangle defect: the half-clip was
  pinned to the canvas edges while the split line `view.cy` panned with the
  body, so panning far enough let a fixed edge chop the ring. The clip is now
  sized generously past the canvas in every direction except the split line
  itself. See the comment at `draw/zonepaint.js` `drawOrbital`.
- **`js/data/archetypes/solid.js` is 612 lines**, over the ≤500 rule. Splitting
  one archetype across files seemed worse than the overage; the bulk is the
  `axes.tidalLock` recipe and its commentary. Worth revisiting if it grows.
- ~~**Presets** for the gaseous family were not written.~~ **Written in
  Session L** — four `gas-giant`, three `ice-giant`, in `js/data/presets.js`.
- ~~**Other init-time state may have the same gap D79 found.**~~ **Audited in
  Session L, and it found one more — see D114 below.**
- The gaseous **hazard spread** runs Benign/Mild-heavy. It is defensible — a
  giant is not dangerous so much as unreachable — but worth a look against
  HAZARDS.md's frequency table.

---

## Session L addendum

### D114 · The D79 audit found the same defect one gesture along

**Where:** `js/ui/exportui.js`, the settings-paste handler.

The Session K note asked for a sweep of every UI module that holds its own copy
of a setting. Only two do — `ui/traitpicker.js` and `ui/presets.js`, both
caching `archetypeId = "planet"` — and both are correctly told at init, so the
COLD-BOOT case D79 fixed is genuinely closed.

**But the same two modules are stale after a settings paste.** A settings block
may name a different body, and it is written through `CC.Controls.set`, which
deliberately suppresses the change event (`ui/controls.js` `suppress`) so that
restoring forty controls fires one redraw rather than forty. That suppression
is also what stops the picker and the gallery hearing about it. Pasting a
`gas-giant` block left the select reading `gas-giant` while the trait list
still offered **Cratered** and the gallery still offered **Desert World**.

So D79 was not one missing line, it was one missing line PER ROUTE INTO THE
CONTROL. There are three — the change handler, init, and a paste — and only two
had been walked.

`syncArchetypeConsumers()` now holds the list of consumers in one place, called
from the paste handler beside the two syncs already there. It lives in
`exportui.js` rather than inside `applySettingsText` because `share.js` knows
about text and controls, not about which UI modules cache what.

**The reason it hid from the audit's first pass:** reading the code, the paste
handler looks complete — it calls `syncRotationEnabled` and
`syncBackgroundColour` and then redraws, which reads as "everything gets
resynced here". What it syncs is every consumer that existed when it was
written. A probe driving the actual paste event is what settled it, and note
that calling `applySettingsText` DIRECTLY still shows the stale picker: the
fix is attached to the gesture, so a future caller of the text parser has the
bug again. Worth knowing if a file-import or URL-restore path is ever added.
