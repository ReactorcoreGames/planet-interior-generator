# Session M — Phase 6, the stellar family

*`young-star`, `main-star`, `old-giant-star` and `dwarf-star`. The
diagrammatic payoff, and the phase that inherits the climate system mostly by
declining it.*

---

## The verdict on the done-condition

The phase doc's five, each checked rather than asserted:

| Condition | Result |
|---|---|
| Convective and radiative zones instantly distinguishable | **Yes** — two mark vocabularies with no primitive in common. See D115 |
| An old giant shows its absurd core-to-envelope ratio | **Yes** — the degenerate core runs 2–6% of the radius, about one part in 23,000 of the volume, and the card says so from the drawn radii |
| No star has grown a polar cap | **Asserted.** `test/_tmp/starlit.mjs` reports `frozenFraction` 0.000 on all four |
| Star activity visibly drives spots, prominences and flare storms | **Measured.** At activity 0→1: prominences 4→22, starspots 4→20, flare storms 0→29, 42% of pixels changed |
| Nothing in `js/draw/` needed a star-specific branch | **Held.** Every grep hit for a stellar role in `js/draw/` is a comment |

The doc also asked for one more, by name — *"dragging Starlight changes nothing
about a star, which is what `starlit: false` buys and is worth asserting once
for real rather than trusting"*. Asserted: **zero pixels** change across
Starlight 0→1 *and* Star colour red-dwarf→blue-giant, on all four archetypes,
while the solid and gaseous families change 20–61% under the same sweep.

---

## What the phase needed beyond data

Four general mechanisms and four primitives, each available to any future
family:

| Mechanism | Where | What it does |
|---|---|---|
| `selfHeated` | `gen/climate.js` | a body that is its own furnace declares a temperature floor. The third climate escape hatch, beside `latitude` and `starlit` |
| `driver` | `gen/traitroll.js` | a trait's instance count is scaled by a NAMED PARAMETER, not only by Detail density. The trait-side half of "one control, two consumers" |
| `lean` | `gen/elemgen.js` | how far a `vein` wanders off the radial. A crust fracture meanders; a radiative streak must not |
| `buildCells(…, kind)` | `gen/elemgen.js` | cell PLACEMENT shared by two primitives that draw entirely different things |
| `prominence` | `draw/primitives/stellar.js` | a loop of plasma anchored at both ends — the only mark in the generator that leaves the body and returns |
| `starspot` | `draw/primitives/stellar.js` | a dark umbra inside a filamented penumbra |
| `convection-cell` | `draw/primitives/stellar.js` | a closed cell with a rising and a sinking flank |
| `engulfed-world` | `draw/primitives/stellar.js` | a dark sphere with a burning leading edge and a wake — `chunk` is broken ROCK, and at trait scale it drew a boulder where the picture needed a world |

Plus the per-family split continued: `archetypes/stellar.js`,
`elements/stellar.js`, `traits/stellar.js`, `flavour/stellar.js`,
`gen/stats/stellar.js`, `draw/primitives/stellar.js`, and eight presets.

---

## Decisions

### D115 · Two adjacent zones must differ in VOCABULARY, not in degree

**Where:** `js/data/elements/stellar.js`, and the reason the whole family is
legible.

The family's first done-condition is that convective and radiative zones are
instantly distinguishable, and the temptation is to solve it with colour or
with cell size. Both would have failed, for D76's reason at family scale: a
radiative zone drawn with slightly-different cells beside a convective one is
the ninety-first cell in a layer that already draws ninety.

So the two lists share **no primitive except `speckle`**, which is the base
texture of everything:

- **Radiative** — near-radial `vein` streaks and nothing else. No cells, no
  arrows, no closed shapes. The absence of every circulating mark IS the
  statement, and the layer reads as *combed*.
- **Convective** — closed cells with circulation in them, and deliberately no
  radial streaks. The layer reads as *tiled and turning*.

This was spent in advance rather than rediscovered, which is the first time in
the project a D76-class trap has been paid for before it fired.

### D116 · `cell` is a VORTEX, and a star needed a different object

**Where:** `draw/primitives/stellar.js` `convectionCell`.

The convective layers were authored against the existing `cell`, and the first
whole-body render showed the envelope reading as *"some swirls happened here"*
rather than as circulating plasma. Measured: 107 cells across a band nearly
half the radius.

`cell` draws an **open spiral** — one and a half turns winding inward. That is
a curl of weather, exactly right for a gas giant's storms, and it is not a
convection cell. A convection cell is a different physical claim: a closed
region, tiling against its neighbours, with material going **up one flank and
down the other**. A spiral cannot show a direction of circulation, and the
direction is the entire content of the word.

**The new primitive took three passes, and the outline was never the problem.**

1. A rounded rectangle with two straight flanks and a straight cap. A field of
   them read as **small buildings** — hard corners and straight sides are
   architecture, and nothing about plasma is architectural.
2. An irregular polygon outline, same internal strokes. Barely changed, because
   the "⊓" of two brackets under a bar was doing the damage, not the boundary.
3. **One continuous circulation loop** in three colour segments — bright up the
   rising side, brightest across the top, dim down the sinking side. No
   straight segment anywhere, and the brightness gradient carries the
   direction.

The lesson is the useful part: **when a mark reads wrong, the wrong part is not
always the part you changed.** Two passes were spent on a silhouette that was
already fine. What settled it was rendering a dozen cells LARGE on a plain
field (`test/_tmp/cellzoom.mjs`) instead of squinting at them at 30 px inside a
whole body — D88's principle, applied to shape rather than to presence.

### D117 · A broken pseudo-random still draws; it just draws something tidy

**Where:** the same primitive's vertex wobble.

The first irregular-polygon pass hashed the vertex index with a
multiply-and-modulo and produced a near-constant for every vertex, so the
polygon came out regular. Nothing threw, nothing was NaN, the render looked
plausible — it simply looked *suspiciously neat*.

Replaced with two summed sines at incommensurate frequencies, which is the
construction `blob` already uses. **Worth knowing as a class:** a broken RNG
fails silently and in the direction of orderliness, so "this looks a bit too
regular" is a real diagnostic signal and not fussiness.

### D118 · `frac` cannot express a skin, and every stack in the family was wrong

**This is D90 again, and it hit ALL FOUR archetypes at once.**

`frac` bounds where a layer's **outer edge** sits. Its thickness is whatever is
left between it and the next layer down. Every stellar stack has one or two
layers that are thin *by definition* — a photosphere is a surface, a
chromosphere is a fringe, a tachocline is a shear line — and each sits above a
deep interior layer whose ceiling is well below it. So each absorbed the gap:

| Body | Layer | Authored | Rolled |
|---|---|---|---|
| old giant | photosphere | ~0.06 | **0.468** — 47% of the radius, swallowing the envelope that IS the archetype |
| dwarf | photosphere | ~0.04 | **0.555** — more than half the body, burying the fully-convective interior that is its whole signature |
| young | photosphere | ~0.06 | **0.354** |
| main | **tachocline** | ~0.04 | **0.348** — the hairline shear layer came out as the LARGEST layer in the body |

All four generated correctly, coloured correctly and drew correctly. The stack
was simply not the stack that was authored, and **only printing the thicknesses
showed it.** D88 applied to geometry: when the question is "is this the right
size", measure — a body whose proportions are wrong still looks like a body.

### D119 · A calibration is a PAIR, and fitting half of it is fitting none

**Where:** `surfaceC` in `gen/stats/stellar.js`, and the four `selfHeated`
floors in `archetypes/stellar.js`.

D75, on schedule, in the place this phase had already written a warning about.
`surfaceC` was fitted against an assumed input band of 0.48–1.0 and put an
ordinary main-sequence star at **9,900–14,100 °C** against a spec of
3,500–8,000.

The curve was not the error. The **range** was: with every star declaring a
`selfHeated` floor, `climate.mean` never uses anything like the full 0..1 — it
runs 0.54–0.87 across the family, and each archetype occupies a narrow window
inside that. The floor decides where an archetype sits in the band and
`surfaceC` decides what the band means in degrees, so **the two are one
calibration** and moving either alone breaks the other.

Refitted together against a thirty-second sweep. All four now land in or beside
their spec bands: young 6,000–10,300, main 3,900–8,100, giant 1,900–4,700,
dwarf 1,900–3,800.

The same trap fired twice more in the same file and was caught the same way —
the size ladder topped out four hundred degrees below the coolest star in the
family, and the hazard rungs top out at 400 °C when the coolest star is 2,000.

### D120 · A star is off the top of the hazard ladder, and saying so is honest

**Where:** `gen/hazard.js`.

The gaseous family shifted its cold rungs because a giant's cloud tops being
cold *is not news*. The stellar case looks identical and is not: shifting the
rungs would be dishonest, because a star being lethal genuinely **is** the
fact. Every star clears every rung, so the summed score is a constant and the
rating stops carrying information across the family.

So the family takes the ceiling outright and the temperature score is not
consulted. **Activity is the one thing that still separates one star from
another** — Severe when quiet, Lethal when active. `Absolute` stays reserved
for Phase 8's compact objects, on the same reasoning that stops a hot planet
reaching it.

### D121 · Four traits were invisible or misplaced, and pixels found every one

**D88 vindicated.** `test/_tmp/pixdiff.mjs` was run per archetype rather than
once, which is what made three of these visible at all:

| Trait | Symptom | Cause |
|---|---|---|
| `coronal-holes` | **0 px** | `reach: "on"` placed the wedges at the corona's OUTER edge, with nothing beyond to cut into. Now `spanning` |
| `prominences` | 894 px | `reach: "outward"` **does not leave the body** (D82) — it clamps to the anchor's top, so every arch above r=1.0 was clipped away by the chromosphere's own clip. Now `spanning`, which is what a feature crossing the surface is for (D91) |
| `stellar-collector` | **0 px on young-star only** | placed at r 1.33–1.50 against an extent of 1.34 — *off the edge of the picture*. Fine on three archetypes out of four, which is exactly how it hid |
| `dust-formation` | maxdelta **19** | dark specks on a fading halo over black space. D80's other half: *darkening needs room beneath to darken into* |

**A trait that works on three bodies out of four looks like a working trait.**
Running the diff per archetype costs seconds and is the only thing that catches
that class.

### D126 · A pixel diff can pass while the thing is still invisible

**Where:** the Dyson swarm's `size`, and the one place D88 needed a caveat.

The swarm diffed at **70,544 changed pixels** — a healthy figure, comparable to
the ring system's — and was still invisible to look at. Seventy-three objects
can change a great many pixels while no single one of them is legible.

Measured, they were drawing at **1.4 to 5.4 pixels**. `maxdelta` was the tell
and it had been on screen the whole time: high contrast, no size. A mark with
a strong delta and a low area is a mark that is THERE and too small.

**So the pixel diff answers "does it draw", which is exactly what D88 claimed
for it, and it does not answer "can it be seen".** Those are different
questions and the second one still needs eyes — or, better, a measurement in
PIXELS rather than in body-space units, which is what settled this one.

The fix is D82 in its most extreme form. A collector is perhaps a kilometre
across and the star is a million: at any honest scale the entire swarm is
sub-pixel, so the only question is how large a symbol must be to do its job.
Raised roughly threefold, and it also has to carry the surviving-tier factor
from D122.

### D127 · An orbital band is bounded on BOTH sides, and a corona is huge

**Where:** the `depth` of every `anchor: "orbit"` trait in the family.

A star's outward layers reach 1.09 to 1.32 body radii, far further than any
other family's, which leaves a narrow usable band for anything in orbit — and
it is easy to fall off either edge:

- **Too far out** and the elements leave the frame. `stellar-collector` at
  1.22–1.58 diffed at **zero pixels on a young star** (extent 1.34) while
  reporting a healthy count on the other three.
- **Too far in** and they are inside the corona, where a manufactured object
  has nothing to silhouette against. The correction to 1.14–1.42 drew
  seventy-three collectors as bright specks lost in a bright halo.

What `capsule` needs is **black behind it**: the hard edges and specular band
that make it read as manufactured (D80) only work against something plain. The
band now starts just past where the corona has faded and stays inside the
frame.

### D128 · The per-family split ran out at four archetypes

**Where:** the whole `stellar` data layer, split in Session N before any polish
work landed on it.

Session M finished with four files over the ≤500-line rule and the worst
overage the project has had:

| File | Was | Became |
|---|---|---|
| `data/archetypes/stellar.js` | 769 | `stellar-common` 292 + four archetype files, 118–173 |
| `data/traits/stellar.js` | 725 | `stellar-magnetic` 404, `-evolved` 239, `-built` 156 |
| `data/elements/stellar.js` | 641 | `stellar-common` 215, `-envelope` 153, `-interior` 339 |
| `gen/stats/stellar.js` | 531 | `stellar-derive` 420 + `stellar` 169 |
| `draw/primitives/stellar.js` | 497 | `stellar` 436 + `stellar-foreign` 103 |

**The diagnosis matters more than the arithmetic.** The rest of the data layer
is split one file per FAMILY, and that is not a rule that scales — a family
with two bodies and a family with four were never the same size of thing. It
held for `solid` (one archetype) and `gaseous` (two) and broke at four.

**Each file got a different cut, chosen by where its real seam is**, which is
the part worth keeping:

- **Archetypes: per ARCHETYPE**, because per-archetype character is this
  family's whole design. The four bodies differ in STRUCTURE where the other
  families differ mostly in material, so "make the young star's limb more
  violent" is one file.
- **Traits: per CONCERN** (magnetic / evolved / built), *not* per archetype.
  Several traits are offered on more than one body — `prominences` on all four
  — so an archetype cut would have duplicated them or forced an arbitrary
  owner. Concern also matches how they change: a megastructure rework touches
  one file.
- **Elements: per ZONE** (envelope / interior). The polish work is entirely
  about how the limb reads, and this keeps it away from the transport regimes
  that were signed off.
- **Stats: derivations vs template.** They change for different reasons — a
  derivation when the calibration moves, the template when the card's shape
  does.
- **Primitives: the star's own marks vs solid objects against a star.** Plasma
  and field on one side; on the other, everything that fails the
  symbol-is-not-a-scale-model way (D82, D126).

**Doing it BEFORE the polish rather than after was the right call**, and not
only for tidiness: both follow-up prompts are organised along these same seams,
so each one now edits one or two small files instead of threading through a
769-line one.

**And the split silently broke a trait.** `engulfed-planet` went to **0 px** —
the new `stellar-foreign.js` was written correctly but its script tag never
landed, because a re-run of the wiring script matched an already-substituted
string and did nothing. Every test still passed: `npm test` does not know that
a primitive should exist, and the body rendered fine without it.

**Only the per-archetype pixel diff caught it** — which is D121 arriving in a
new place. That check was written for new traits, and it turns out to be the
regression test for a refactor as well: after moving code, ask whether every
mark still draws, per body, rather than whether the suite is green.

### D122 · The authored size is not the drawn size

**Where:** every `size` in `elements/stellar.js` and `traits/stellar.js`.

`tierSplit` drops **tier 0 first**, and the Size-tiers slider defaults to 3 —
so the largest instance actually drawn is **0.52×** the authored figure, never
1.0×. Authored 0.10–0.21, prominences measured 0.016–0.072 of the body radius
and the limb read as bare; the convection cells were a fifth of their layer and
left gaps.

This is D76's `named` lesson in its milder, more common form. `named: true`
exists for the case where a trait is one object and must take tier 0; for
everything else the authored figure has to be chosen **for the tier that
survives**, and the only way to know what that is is to measure.

### D123 · A perturbation, not a replacement — including for light

**Where:** `plasmaFill` in `draw/details.js`.

Prominences were built to read as hotter than the surface, which was
implemented as mixing the hue 42% toward orange regardless of the star. On a
blue-green star that produced **magenta loops** — a colour belonging to no part
of the body, reading as a rendering fault rather than as a feature.

The generator's own rule catches it (zones.js rule 1): perturb the rolled
colour, never replace it. What actually makes a prominence read as hotter is
that it is **brighter and less saturated**, which is the same thing that makes
every fusion core in the family read as hot. The hue barely moves now.

### D124 · Two branches with the same shape: order is the whole answer

**Where:** `transportOf` in `gen/stats/stellar.js`.

A shell-burning giant and a fully-convective dwarf have identical shapes as far
as "which transport layers exist" goes — one convective layer, no radiative
zone, no convective core. The fully-convective test ran first and claimed both,
so **every old giant's card announced the dwarf's sentence**: *"convective all
the way through, which is why a star like this burns for so long"*, about a
body at the end of its life.

What separates them is not the transport layers at all — it is whether there
are **fusing shells around a dead core**. Asked first now, and read off the
drawn stack like everything else. Worth generalising: when two branches test
the same variables, the discriminator is somewhere you have not looked yet.

### D125 · A contact sheet finds colour bugs a render cannot

**Where:** `hueFromStars` in `archetypes/stellar.js`.

Two faults, neither visible in any single render, both obvious across sixteen:

1. **The pad went below zero.** A band starting at 18° padded by 70 became
   −42°, and `wrapHue` maps that to 318° — **magenta**. Half the sheet came out
   pink and violet: not "hue is free" but hue wrapping off the bottom of the
   scale into the one region no star occupies.
2. **The pad was far too generous.** The main star's band came out 326° wide —
   very nearly the whole wheel. A range that admits every colour is not a
   range, and what stopped those reading as stars was not that green was
   reachable but that *nothing was unreachable*.

`npm run sheet` earns its place again. Harmony is a property of the SPREAD of
outputs, so it can only be judged side by side.

---

## Deliberate declarations

**`climate: { latitude: 0, starlit: false, selfHeated: <n> }`** on all four.
The first two are the escape hatches D50 built and asserted on a synthetic
archetype precisely so this phase would not have to discover them; using them
rather than adding a role-name branch to `gen/climate.js` is the whole of what
the roadmap asked for.

**`selfHeated` is the new one, and it was necessary.** `starlit: false` alone
removes the star and leaves the body scored on `interiorHeat` from the same
floor a rogue planet uses — measured, that put an ordinary star at a normalized
0.21 and had the climate summary reporting **83% of stars as frozen**. Declared
per archetype rather than per family, because the spec's temperatures genuinely
differ by a factor of four across the four bodies.

**Star activity is one control with two consumers, and the coupling had a
bug.** `gen/climate.js` eased activity out with Starlight, on the sound
reasoning that an unlit world has no star to be active. On a *star* that reads
the wrong object's distance — dragging Starlight to zero left a star with no
activity at all. The easing is now skipped for a body that has declared
`starlit: false`, which reuses the existing declaration rather than adding a
second flag (D27).

**`convective` and `convective-core` are separate roles.** A convective core is
a churning centre inside a still envelope; a convective envelope is a churning
shell around a still centre. One role name would have left the element table
unable to size the two differently, and that size difference is most of what
makes the young star's inversion legible beside a main star.

**No frosting anywhere (D22).** A photosphere has no hollows for material to
settle into. Granulation is convective churn and is a layer detail.

**Presets are spanned by different axes again.** The solid ten use Ocean depth,
Starlight and tidal locking; the gaseous seven dropped the first. The stellar
eight drop **Starlight too** — the largest axis the rest of the generator leans
on — because it is inert here by declaration, and setting it would make it look
like a knob that does something. What spans them instead is archetype (four
different *structures*, where the other families differ mostly in material),
Star activity, Interior heat and Core size bias.

---

## Still open

- ~~**Three of the family's files are over the ≤500-line rule.**~~
  **Split in Session N — see D128 below.** Every stellar file is now under 500,
  the largest being 436.
- **`binary-companion` was not built.** stars.md describes it as zoning the
  primary — a tidal bulge, a brighter facing hemisphere, prominences biased
  toward the companion — which is the tidal-locking machinery pointed at a
  different cause. It is a genuinely good idea and a whole axis's worth of
  work; it wants its own pass rather than a rushed one here.
- **The stellar hazard spread is Severe/Lethal only**, by design (D120). It
  carries information *within* the family via activity, but a reader comparing
  a star to a planet sees two ratings where the planet has six. Defensible and
  worth a look if Phase 8's compact objects change the top of the scale.
- **Green stars are common on a contact sheet.** `secondaryRel: "analogous"`
  plus a wide main-sequence band lands there often. The spec explicitly permits
  it ("a green star or a violet star is fine — this is a stylized generator"),
  so it is recorded rather than changed.
