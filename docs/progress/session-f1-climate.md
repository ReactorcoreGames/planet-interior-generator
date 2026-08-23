# Session F, Pass 1 — the climate system

*Moved out of PROGRESS.md to keep that file small. Covers the climate
system build: `CC.Climate`, the baseline sum, snowline/caps, sea ice,
aridity, and exotic ocean limits (D40–D46).*

---

*Built from [CLIMATE-PLAN.md](CLIMATE-PLAN.md), Steps 1–7. Step 0 (the snowline
scale bug) was already fixed in Session E. `npm test` green throughout, and
every step was verified with the numeric check the plan attached to it before
the next was started — `node test/climate.mjs` is the harness and it holds all
of them.*

### D40 · `CC.Climate` — a thermal field on every body

**Decided:** Session F. **Where:** `js/gen/climate.js` (new), `js/gen/details.js`,
`js/gen/palette.js`, `js/gen/frosting.js`, `js/draw/film.js`.
**Supersedes** the arrangement D35 left behind, where `tempAt` existed only
under tidal locking.

D35 gave the generator a thermal field and it worked — but `Zones.build`
returns `null` at dial 0 (D27, deliberately, so an unzoned body costs nothing),
so `tempAt`, `snowAt`, `coverAt` and `airAt` were **all absent on an ordinary
rotating planet**. There was no "where is it cold" to ask, which is why caps
could not exist, why nothing could freeze the ocean, and why `frostPeak` was
unreachable on 100% of unzoned worlds (D36, D37, D38).

The field is now universal and composed from three contributors, additive:

```
Climate.build(...)  ->  always a field
    baseline    Starlight + Interior heat
    latitude    |cos(angle)| — the body is drawn pole-up
    zone        the tidal-lock axis, when the dial is up
```

**Tidal locking became one contributor rather than the only one**, and every
existing consumer kept working — they simply started receiving a field where
they used to receive `null`.

**Climate is ARCHETYPE-DECLARED, like `axes`.** A body whose archetype omits a
`climate` spec gets a flat field at its own baseline: it still has a temperature
everywhere, it simply has no latitude to it. That is the mitigation the plan's
risk table asked for, and it is what stops a star or a gas giant inheriting a
polar cooling term when those archetypes land.

### D41 · The baseline is a genuine sum, and the latitude term must be CENTRED

**Decided:** Session F. **Where:** `js/gen/climate.js`.

The arithmetic the plan said to settle first:

```
baseTemp = clamp(0.04 + f(Starlight) + g(interiorHeat))
```

Measured spans across each control's full travel: **Starlight 0.66, Interior
heat 0.34.** The star leads — it is the larger physical source and the control
that makes cold regions conditional — but heat alone still carries a world from
frozen (0.04) to temperate (0.38), which is the rogue-planet case the user
explicitly asked for and the one that proves the sum is a sum.

All four corners verified: warm-in-the-dark, baked dead rock, rogue-with-molten-
core, and the deep void.

**The latitude term subtracts nothing on average, and getting that wrong was
the one real arithmetic error.** The first version was `base - drop * |cos|`,
which looks right and is not: `|cos|` averages 2/π, so a plain subtraction cools
the *whole body* by about two thirds of the drop. A rogue world with a molten
core came out with a baseline of 0.38 and a **mean of 0.16 — frozen**, which is
exactly the case the plan says must read as warm; the default world was dragged
from temperate to cold the same way.

Physically the poles are cold because the equator got the light, not because the
light went missing. The term is now centred on `LAT_MEAN = 2/π` and adds as much
at the equator as it takes at the poles, so `base` stays the body's mean
temperature at every setting — which is what makes the baseline arithmetic mean
anything at all downstream.

> **The lesson:** a term that is obviously a subtraction may still need to be a
> redistribution. `climate.mean` was the number that caught it, and only because
> the harness printed the baseline and the mean side by side.

### D42 · Caps emerge from a lowered snowline — and TWO thresholds for one fact is a bug

**Decided:** Session F. **Where:** `js/gen/climate.js` (`chillAt`, `scorchAt`),
`js/draw/film.js`. **Closes the loop D27 opened.**

There is no cap primitive and there must never be one. `snowShiftAt` drags the
snowline down where the field says it is cold; `zoneWeights` and `depositTop` do
what they have always done, so the cap pools in valleys and thins on ridges. D27
cut `ice-caps` because "a wedge could only ever be a polygon laid on top of the
terrain" — this is the version that follows the ground.

Verified: an Earth-like world's ice reaches **24° from a pole**, a cool one's
52°, a Europa-like world's 74°, a rogue world's 90° (frozen over). A Venus and a
Mercury reach **0°** — and because their baseline is above freezing everywhere,
not because anything switched the feature off.

**Two defects on the way, and the second is the instructive one.**

**1. The snowline band was authored too cold.** At `SNOW_WARM = 0.52` the
default world grew nothing while a slightly dimmer one grew textbook caps — the
feature worked everywhere except at the setting most people see first. Earth is
temperate *and* has permanent caps, so "cold enough to hold snow" has to begin
while a bearing is still nominally temperate. Now 0.62, the top of the band.

**2. THE ICE COLOUR AND THE SNOWLINE HAD SEPARATE THRESHOLDS, AND THEY
DISAGREED.** `draw/film.js` picked its frozen colour set from a local
`(0.34 - t) / 0.22` ramp while the snowline came from the climate field. On a
temperate world the pole sat at **0.32**: below the snowline's band, so the
geometry gave it a cap; above the colour ramp, so the material stayed the family
hue. Measured, the cap came out **mauve at s0.31 v0.74** — cap shape, vegetation
colours. That is the D35 failure exactly, reappearing because a second threshold
had been introduced for the same physical fact.

`climate.chillAt` and `climate.scorchAt` are now the single source and
`draw/film.js` asks for them. Wherever the snowline placed snow, the material is
ice.

> **The rule worth keeping: one physical fact, one threshold.** Two ramps that
> both mean "frozen" will agree in the middle of their range and disagree at the
> edges — which is precisely where the interesting bodies are.

### D43 · The cap edge is judged against the shoreline, not against an absolute

**Decided:** Session F. **Where:** `test/climate.mjs`, `js/draw/film.js`
(`SNOW_BLEND`).

A cap edge must be a gradient rather than a contour, so it is asserted as a
number. The first bound was 0.10 of zone weight per degree and the cap measured
0.24 — so the bound was checked against something already shipped, and **the
shoreline in the very same render measured 0.96**, four times steeper, having
been signed off two phases earlier. **The bound was wrong, not the cap.**

The reason is that a zone weight is not what the eye sees. Measured, the terrain
moves **0.107 per degree** of its own accord and the snowline only **0.022** — so
most of any weight step is the cap *following the ground*, which is the behaviour
D27 demanded and a wedge could not give. Damping it out would mean drawing the
polygon after all.

Two things came out of it. The snow boundary got its own wider blend
(`SNOW_BLEND` 0.42 against `BLEND` 0.13) because a snowline genuinely is softer
than a shoreline and because two gradients compound at a cap's edge. And the
assertion now holds the cap to the boundary beside it rather than to a number
picked in advance: **no steeper than the shoreline in the same body.** It
measures 0.17 against 0.50.

> **Before asserting a bound, measure something already signed off against it.**
> A threshold invented in the abstract will fail correct work about as often as
> it catches incorrect work.

### D44 · Sea ice is geometry; and the star is an axis, not a catalogue

**Decided:** Session F. **Where:** `js/draw/zonepaint.js`
(`paintSeaIce`, `paintThermalWater`), `js/draw/scene.js`, `js/gen/climate.js`.

**Sea ice** is a real band on the water's outer surface, drawn inside the
deferred fluid's clip so it stops at the coastline exactly as the water does.
Thickness rides how far below freezing the bearing is — a rime at a cap's edge,
a shelf over a frozen sea — and it is clamped against the sea floor (the D31/D34
clamp class). It is opaque, because a translucent sheet over a dark sea is just
slightly lighter water, which is D37's 7% darkening arriving from the other
direction.

It **must** be geometry: D30 established that a statement about how far
something *reaches* cannot be made with compositing. "The ice extends this far
into the sea" is such a statement.

**The ocean does not shrink when it freezes** — the user's call, and a design
principle rather than a preference: water expanding on freezing is a quirk of
water, and these are alien seas that may be any liquid. Ocean depth is the
author's control over sea volume.

**Ice takes its colour from the frosting's own frozen set** rather than from a
hardcoded white, so a red world's sea ice and its polar snow are the same ice.

Verified by pixel probe: a frozen world's sea grows **2,083 px** of ice at mean
delta 244; a temperate and a hot world grow **exactly 0**.

> **A probe that changes two things cannot attribute what it sees.** The first
> version compared a cold render against a *warm* one and reported ~50,000
> changed pixels on a world whose sea can never freeze — it was measuring the
> whole climate difference, not the ice. It now holds every setting fixed and
> toggles only whether `paintSeaIce` runs. Same class of error as a probe that
> reimplements its subject (D27, D35) or samples the wrong layer (D34).

**The star is three numbers, not a menu of types.** `STARS` in `gen/climate.js`
gives each spectral choice a hue, a cast, an output and a harshness, and those
feed fields that already exist. Deliberately **not** a list of star types with
bespoke coded effects — that is the failure D27 recorded, and by
TRAIT-SYSTEM.md's third test a star changes only values in the stack, so it is
an axis. A blue giant runs a world 0.17 hotter than a red dwarf at the same
Starlight; the cast falls off with depth and never touches a self-lit layer
(D13's exemption), and it eases out with Starlight because an unlit rogue has no
star to be tinted by.

**Star activity is not temperature.** It scours cover, drives the radiation
hazard and pushes the exotic sea's colour, and appears nowhere in the baseline —
conflating it with heat would make it redundant with Starlight. Measured: it
moves mean cover 1.00 → 0.76 while leaving `climate.mean` at 0.5282 exactly.

### D45 · Aridity was rebalanced when its source changed — and nearly repeated D19

**Decided:** Session F. **Where:** `js/gen/frosting.js`.

`arid` used to be built from Interior heat, which is only half of how hot a
surface is; it now reads the climate baseline, so Starlight reaches it and snow
becomes genuinely conditional on being cold.

**Feeding a new source into old weights reintroduced D19's exact failure.** The
formula `heat * 0.6 + (1 - wet) * 0.55` was calibrated against a control that
sits near 0.5 and is rolled around it. The baseline reaches a genuine 1.0 and its
whole point is to span the range — so `arid` pinned at **0.56–1.00 across every
body**, which is the same constant-aridity collapse D19 found, arriving by a new
route. Because `snowiness = 1 - arid * 1.25`, it meant **no world was ever
snowy**, and a temperate planet's cap was painted in the family hue.

The surface term is now **centred**: it says how far this world is from
temperate, in both directions, which is what the figure has always meant. A cold
world comes out genuinely wet and snowy instead of merely less arid than a hot
one.

> **When a formula's input changes range, its weights are no longer calibrated.**
> The input was more correct and the output was worse, which is the combination
> least likely to be suspected.

### D46 · Exotic oceans — three limits, and all of them had to lift

**Decided:** Session F. **Where:** `js/gen/palette.js`, `js/data/archetypes.js`.
**Implements** the design D39 recorded.

Off by default, because the authored blue-green range is a deliberate fix for a
measured failure and stays the default. Ticked, the ocean drops its hue entirely
and rolls anywhere on the wheel.

**All three limits had to lift together**, and the second and third are easy to
miss: the hue range itself, `hueLean` (which meant a primary of red still gave a
blue sea), and the **value ceiling at 0.38**, which made pale, white and milky
seas impossible. Freeing the hue alone would only have produced "a dark sea of a
different colour", which is not what the control promises.

Verified over 300 bodies: off, hue stays 155–268 and value ≤ 0.38, matching D39's
measured table. On, all **twelve** 30° buckets are reached and value runs to 0.88.

**The Star activity coupling is gated on the checkbox**, which is what gives the
toggle a reason to exist inside the simulation rather than being a taste switch:
a strange sea becomes a *consequence* of a violent star. Measured, mean
saturation runs 0.46 → 0.57 with the box on and does not move at all with it off
— an active star cannot distort a sea the user asked to keep plausible.

**The contrast rule is what lets the hue roam.** A sea that matches its crust in
hue *and* value is the original failure by another route, so an exotic ocean is
pushed clear of the layer it floats on. The general adjacency pass could not do
it: that one darkens the *inner* layer of a colliding pair, so it would move the
crust to accommodate the sea. The ocean is the layer whose constraint was
waived, so the ocean is the layer that moves. 0/200 collisions after.

**A layer opts in by declaring `exotic`**, so this is archetype data rather than
a role name in the palette — a magma sea or a liquid-metal ocean gets the same
treatment by declaring it.

### The sweep's adjacency check was comparing pseudo-roles

**Where:** `test/sweep.mjs`.

`pal.layers` also holds the frosting's twelve pseudo-roles (the family is
resolved temperate, frozen and scorched — D35). The "indistinguishable adjacent
layer pairs" check iterated all of them, and two frozen zones being similar is
often the feature *working*: ice is deliberately achromatic and bright, so
`frostPeakCold` and `frostLandCold` should converge.

It passed by accident while those sets existed only on tidally locked worlds,
which the colour loop does not build. Making the thermal field universal
produced **1,980 false positives at once**. The check now walks
`colorProfile.order`, which is the archetype's own authority on what is a layer
— the same source the palette derives colour depth from (D12).

### Every new control is asserted to CHANGE THE OUTPUT

`test/domtest.mjs` now drives all five climate controls through the real UI and
checks the generator's output actually moved — not merely that the control is
bound. "It moved and nothing changed" is this project's documented failure mode
for a new control (the Size tiers slider shipped inert because it read the
recipe's tier count and ignored the user's), and the lesson recorded then was to
check the OUTPUT rather than the wiring.

| Control | Asserted |
|---|---|
| Starlight | `climate.mean` falls 0.51 → 0.24 |
| Star colour | a blue giant runs hotter, 0.51 → 0.60 |
| Star activity | cover 0.92 → 0.72 **and** temperature unchanged — both halves |
| Axial tilt | the hottest bearing moves 90° → 122° |
| Exotic oceans | the sea differs on 6/6 seeds |

**Exotic oceans has to be checked across SEEDS**, and that is the one worth
remembering: a single body may roll a free hue that happens to land where the
authored range already was, so a one-seed check can report a working control as
inert or an inert one as working.

### On the 500-line rule, and what it is actually measuring

Two splits were made and a third was declined, which is worth recording so the
next session does not redo the analysis.

**Split, because they had real seams:**

- **`js/data/stars.js`** — the star table is pure data and belongs beside the
  other data tables. It also gives Phase 6 an obvious place to be consistent
  with: a `main-star` body and the `Star colour` a planet orbits are the same
  object seen from two sides, and they should read one table.
- **`js/gen/climatesummary.js`** — shaping the picture and describing it are
  different concerns. Everything in `climate.js` exists to make the render;
  everything in the summary exists to make a card that cannot contradict it.

**Not split: `gen/climate.js` at 520 lines.** Measured, it is **148 lines of
code and 372 of comment**. Splitting it would fragment one coherent idea — the
baseline, the latitude term and the per-bearing samplers are the same thought
and reading half of them is not useful — to satisfy a count that is measuring
this project's own documentation style rather than its complexity.

Worth knowing more generally: `film.js` (214 code / 656 total), `scene.js`
(260 / 575), `palette.js` (234 / 559) and `archetypes.js` (135 / 538) are all in
the same position, and three of them were already over before this session.
**The rule is a good instinct and the right response to it is to check the code
count first.** Where the code itself is long — as `scene.js` and `palette.js`
are getting — the split is still owed.

### One thing the renders taught that the numbers could not

**A cap lives on the crust rim, and at whole-disc scale the interior dominates.**
The first sheets were rendered on an ocean world at depth 0.4, where only **14%**
of the circumference is land — so the snow zone had almost nothing to deposit on
and the entire Starlight sweep looked inert while every measurement said it
worked. Rendered large and cropped to the polar rim on a world with real land,
the caps are unmistakable and visibly pool into the terrain.

That is D18's rule ("a band a few pixels wide is not judgeable at contact-sheet
scale") applied to a feature D18 did not anticipate. `test/climate.mjs` now
writes `_cap-crop.png` for exactly this, and it is the view to judge caps from.

---

## Session F — Pass 2: four defects the user found on the real GUI

*All four reported from a screenshot of the running app. Every one was
reproduced and measured before anything was changed, and every one is now
asserted in `npm run climate` so it cannot come back quietly.*

### D47 · An atmosphere that CLEARS the ground may still not COVER it

**Decided:** Session F. **Where:** `js/draw/scene.js` (`AIR_FLOOR`, `airFn`).

The user reported terrain standing outside the atmosphere — an old issue that
predates the climate work. Reproduced exactly on their settings.

**Three probes said there was no bug, and all three were wrong in an
instructive way.** A body-space breach probe reported 0.00000 at every bearing
on ten configurations, because there genuinely is no breach: `airFn` already
floors the gas at the ground. An isolated-frosting probe reported the frosting
adding 0.0px to the outer edge. A no-atmosphere comparison reported the body
edge unchanged — because suppressing `fillOutward` leaves the atmosphere's
detail elements and zone tint still painting, so "body edge" included haze.

**What the pixels actually showed**, once every pass except the gas was
suppressed: the atmosphere's alpha FALLS OFF across its own column, so clearing
the ground geometrically is not the same as covering it visibly. On the
collapsed face the ground sat at **t = 0.73 of the column**, where
`falloffAlpha` is already down to 0.18 and, after the `screen` composite, the
gas outside the body came to **zero rendered pixels**. On the inflated face the
same ground sat at **t = 0.33**, where alpha is 0.68. Same geometry, same
clearance, completely different picture.

Two fixes:

1. **The floor accounts for the frosting and the sea bulge**, not just the
   rock. Both are drawn AFTER the gas and paint over it. Measured, the drawn
   solid reached 0.0306 above the atmosphere's inner edge while the floor
   believed the ground was 0.0306 lower.
2. **The floor is a POSITION IN THE COLUMN, not a clearance.** `AIR_FLOOR`
   holds the ground at or below 0.55 of the gas column, which is where the
   falloff still has weight. Measured after: the faintest gas over the ground
   is 52–57 luminance on both an unzoned and a fully locked world.

> **The lesson, and it is D30's with the sign flipped.** D30 established that a
> statement about REACH must be drawn as geometry rather than as compositing.
> The converse also holds: **a requirement about VISIBILITY cannot be satisfied
> by geometry alone**, because what the eye receives is the geometry times the
> falloff. Both halves have to be checked against rendered pixels.

### D48 · The seam trap, for the fourth and fifth time — now asserted

**Decided:** Session F. **Where:** `js/draw/zonepaint.js` (`paintSeaIce`
rewritten), `js/draw/film.js` (`SEAM_OVERLAP`), `test/climate.mjs`.

The user reported spokes in the sea ice and "something like spokes, but not
exactly" in the frosting. Both were real, both were the same defect, and the
second one **predates the climate work** — it has been in the frosting since
Phase 3.

**It is measurable, and the measurement is what makes it assertable.** Sample a
ring through the band at fine angular resolution and take the Fourier power at
exactly the segment period; a seam spikes there and nowhere else.

| Band | Before | After | Baseline |
|---|---|---|---|
| sea ice (360 quads) | **1.522** | 0.079 | 0.061 |
| frosting (900 quads) | **0.822** | 0.055 | 0.133 |

**Two different fixes, because the two bands have different constraints.**

- **Sea ice became ONE CONTINUOUS RIBBON** — outer edge forward, inner edge
  back, closed once, filled once — drawn in a few nested thickness bands so the
  gradient survives. It has no per-bearing colour requirement, so nothing is
  lost.
- **The frosting could not**, because it genuinely needs per-segment colour:
  four zones blending around the circumference. It gets a **hairline overlap**
  instead.

**The overlap had to be swept, not guessed.** Power at period 900 against the
overlap fraction: 0.00 → 0.822, 0.02 → 0.504, 0.04 → 0.241, **0.06 → 0.014**,
0.08 → 0.266, 0.14 → 0.940, 0.25 → 1.896. A genuine minimum with the artifact
rising steeply on *both* sides — too little leaves the antialiased gap, too much
doubles the alpha into a BRIGHT seam. A first attempt at 0.6 of a segment made
it three times worse than doing nothing.

**Which way the seam runs is not obvious and must be measured.** A phase probe —
mean luminance as a function of position within one segment — showed the
frosting's seams were **dark** (gaps), which is why overlap was the right
remedy; `paintZoneBand`'s gradient wedges have the opposite problem and must
abut exactly. The same code shape needs opposite fixes depending on whether the
pieces are opaque or translucent.

> **`npm run climate` now asserts both.** Five occurrences is enough: the rule
> is *an angular fill must never expose an edge shared by two independently
> drawn pieces*, and it is now a number rather than a memory.

### D49 · A dead world's ocean freezes to the floor

**Decided:** Session F, at the user's question. **Where:**
`js/draw/zonepaint.js` (`iceFraction`, `solidAt`), `js/gen/climate.js`
(`polarDropFor`).

The user asked whether Starlight 0 with Interior heat 0 should freeze the ocean
solid rather than growing a thick surface sheet. **They were right and it did
not.** The ice capped at **68% of the sea's depth**, so a body with no star and
a dead core rendered a third of its ocean as liquid water under a lid — which is
not a frozen sea, and there is nothing down there to keep it liquid.

**Three separate causes, and only the first was the obvious one.**

1. **The thickness curve capped below 1.** Eased to level off, which is right in
   the middle of the range and wrong at the end of it.

2. **THE LATITUDE TERM WAS INVENTING HEAT.** D41 made the term centred so it
   redistributes rather than removes — correct on any world with a heat budget,
   and wrong at the very bottom. On a baseline of 0.04 it *added* 0.217 at the
   equator, lifting it to 0.256, **above the freezing line**: a world with no
   star and a dead core kept an unfrozen equatorial band. `polarDropFor` now
   eases the drop out as the baseline approaches the floor, so a world with
   nothing to move around is uniformly cold. That is both correct and the better
   picture — the deep-void case should read as evenly dead.

3. **The freeze-through threshold was measured against a value the system
   cannot produce.** `VOID_FLOOR` is 0.04, so `amt` tops out near 0.78 and never
   reaches 1.0; a ramp normalized against `1 - threshold` completed only a third
   of the way even at the coldest reachable bearing. It is now derived from the
   floor and normalized against the **reachable maximum**.

Measured after, and the gradient below the extreme survives intact:

| Case | ice fraction (min / mean / max) |
|---|---|
| deep void | **0.99 / 1.00 / 1.00** — frozen solid |
| faint sun, dead core | 0.58 / 0.73 / 0.88 — thick shelf |
| Europa-like | 0.00 / 0.30 / 0.78 — shelf over water |
| rogue + molten core | 0.00 / 0.00 / 0.00 — open ocean |
| temperate | 0.00 / 0.00 / 0.00 |

> **Two rules worth keeping.** A threshold measured against a value the system
> never actually produces is a threshold that never fires — the same shape as
> D31, where a clamp was measured against the wrong layer. And **a term that is
> correct across the middle of a range may be wrong at its edge**: centring the
> latitude term fixed the rogue-planet case (D41) and broke the deep-void one,
> and both had to be checked.

### The probe lessons from this pass

Three probes gave confident wrong answers before the pixels settled it, and
each failed differently:

- **A probe that changes two things cannot attribute what it sees.** The first
  sea-ice probe compared a cold render against a *warm* one and reported ~50,000
  changed pixels on a world whose sea can never freeze.
- **A probe that suppresses one pass may not suppress the effect.** Disabling
  `fillOutward` still left the atmosphere's details and tint painting, so the
  "no atmosphere" baseline had atmosphere in it.
- **A probe that reimplements its subject agrees with itself.** The ice-fraction
  probe carried its own copy of the formula and kept reporting the old numbers
  after the fix landed. `CC.ZonePaint.iceFraction` is now exported for the same
  reason `CC.Film.zoneWeights` was (D27).

**When a probe and the render disagree, the render is right.** All three of
these said "no bug" while a screenshot plainly showed one.

---

