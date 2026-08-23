# Session E — mechanical defects, the angular thermal field, unzoned cold

*Moved out of PROGRESS.md to keep that file small. Covers three passes:
the atmosphere/sea-level fixes, `tempAt`, and the investigation into
cold regions on unzoned worlds that led into the Session F climate system.*

---

*The user re-tested the Session D build and reported the atmosphere still
renders as a perfect circle at 100% lock. Investigation confirmed it, and found
three more defects alongside. `npm test` green throughout.*

### D30 · The atmosphere is geometry, not compositing

**Decided:** Session E. **Where:** `js/draw/layers.js`, `js/draw/scene.js`,
`js/draw/zonepaint.js`, `js/data/archetypes.js`.

**D29 claimed to have wired `airAt` and had not.** Measured on the real render,
the outermost visible radius was **identical at 0%, 50% and 100% lock** — 2.5px
of spread at all three, which is antialiasing, not shape.

Two causes, and the second is the instructive one:

1. `fillOutward` drew the layer as `ctx.arc()` filled with a **radial**
   gradient. A radial gradient cannot vary by angle, so no amount of alpha work
   inside it can move the edge.

2. D29's `destination-out` carve removes alpha from **inside** a disc whose
   outer edge is already transparent. It could never move the silhouette — and
   because the screened tint still ran, the night side came out **brighter by
   up to +19 luminance**. The fix for the invisible terminator had inverted it.

**The rule this establishes: a statement about how far a layer REACHES is
geometry, and must be drawn as geometry.** Compositing changes what a shape
looks like; it cannot change what shape it is.

`fillOutward` now takes an optional `thicknessAt(angle)` and, when given one,
draws the layer as abutting wedges each carrying its own radial gradient scaled
to that bearing's reach. The uniform path is untouched, so an unzoned body pays
nothing and still measures 2.5px.

**And the recipe's numbers were wrong, which only became visible once the
geometry read them.** `air` was authored 0.55 / 1.00 / 0.40 — both extremes
BELOW the twilight band — so the silhouette bulged at the terminator and
pinched at both poles of the axis: a peanut. `air` is a SCALE HEIGHT, not a gas
budget; warm gas expands and the column puffs up. Now 1.30 / 1.00 / 0.45.

Measured after the fix, sampled in the renderer's own angle convention
(angle 0 = up, clockwise — a probe using the standard `cos/sin` convention
reports the body rotated 90° and will call a correct render wrong):

| | radius |
|---|---|
| hot face | 291.7 px |
| twilight | 283.8 px |
| cold face | 270.3 px |

Monotonic, bulging toward the star. Silhouette spread 2.5px → **24.0px**
(0.9% → 8.5% of mean) from lock 0 to lock 1. Atmosphere luminance now reads
hot 118.6 / cold 9.8 — the terminator runs the right way.

Consequences handled: the haze clip follows the same angular edge (or the
stipple would redraw the circle the fill stopped drawing); the outward zone
tint rides the same multiplier (or it would paint light past the collapsed
edge); and `scene.js` measures the inflated peak into `extent` so the bulge is
not cropped flat against the frame.

### D31 · The sea-level clamp measured the wrong layer

**Decided:** Session E. **Where:** `js/gen/details.js`.

D29's clamp used `body.surface - lay.outer` where `lay` is the **crust** — but
the thing being displaced is the **sea**, whose top starts at `fluid.outer`.
Since the structure stage settles an atmosphere directly onto the ocean,
`atmos.inner === ocean.outer` exactly, so the sea's true headroom is **zero**
while the formula allowed ~0.12–0.16. **The clamp could never fire**, and the
night bulge went through the atmosphere at every ocean depth (7/7 tested).

The ceiling now belongs to the fluid. But a bare ceiling flattened the bulge to
exactly zero, because there genuinely is no gap — so `ceilingAbove` distinguishes
**a solid lid from gas**: rock stops the fluid dead, while an outward layer
yields 30% of its own thickness, because a rising sea DISPLACES air rather than
hitting a wall. Verified across 576 configurations: zero violations, deepest
intrusion 27.4% of atmosphere thickness, night bulge preserved.

### D32 · `cover > 1` was clamped away

**Decided:** Session E. **Where:** `js/draw/film.js`.

`amount = clampUnit(amount * coverage)` capped at 1, so the recipe's authored
1.30 and 1.35 did **nothing on 59–78% of bearings** — the comment directly
above promised "a zone genuinely piles more on" and the code prevented it.

Piling on is a THICKNESS, not an alpha. Surplus coverage above 1 is now split
off into `pile` and carried to the heap term, where extra material means extra
depth rather than impossible opacity.

### D33 · Dry worlds had a sea level

**Decided:** Session E. **Where:** `js/gen/details.js`.

At `oceanDepth = 0` the ocean layer is absent but `seaLevel` was still built,
returning offsets of −0.14 to +0.04 — so a **waterless** world's snowline moved
as though a sea were boiling off it. `seaLevel` now requires an actual adjacent
fluid, found by the same adjacency test `scene.js` and `film.js` use.

### One process note

**A probe that samples in the wrong angle convention will call a correct render
wrong.** `view.at` is angle-0-up, clockwise. A first measurement using standard
`cos/sin` reported the atmosphere bulging in the wrong direction after the fix
was already correct. Same lesson as Session C's zone-split probe, different
axis: the harness must speak the renderer's coordinate language.

### D34 · Two defects the first render exposed

**Decided:** Session E. **Where:** `js/draw/layers.js`, `js/draw/scene.js`.

The user ran the D30 build and reported two things. The atmosphere direction
was in fact correct — measured 376.5px on the sunny side against 342.7px on the
dark side — but looking at the render showed a real defect behind the
impression, and a second one they spotted directly.

**1. Pie-slice wedges put SPOKES through the layer.** The angular fill closed
each wedge through the centre, so neighbouring slices shared long radial edges
and the antialiasing along every seam accumulated into visible spokes radiating
from the middle. Rendering the atmosphere in isolation made it obvious; in the
finished picture it hides under the body, and what reaches the eye is a hard
flat cut across the thin face rather than a taper.

**This is the third time this project has hit the same trap** (draw/zonepaint.js
documents the other two). The rule worth keeping: **an angular fill must never
be built from independent slices that share an edge.** The layer is now drawn as
a stack of NESTED WHOLE RINGS — each ring the complete angular outline scaled
toward the surface, filled flat at that step's alpha increment, painted
outermost-inward. One continuous path per ring, so there is no internal edge for
a seam to form along, and the accumulated stack reproduces the same falloff the
radial gradient gives the uniform case.

Painting back-to-front with the alpha DIFFERENCE rather than the absolute value
is what keeps the total at any radius equal to the curve.

**2. The collapsing atmosphere sank below the ground.** At low ocean depth the
solid body — crust and its green frosting rim — visibly stood outside the gas.
`airAt` shrinks the layer toward its NOMINAL inner edge, but the rock and sea
below carry relief and an angular sea level, so on a cold face thinning to 0.45
the shrinking edge passed under peaks still at full height. Measured: the crust
breached by 0.0082 at 187°, on the cold face, exactly where the user saw it.

The multiplier is now floored per bearing at whatever ground is actually there —
the displaced silhouette, or the sea's top where a fluid floats on it. A FLOOR
only: a face may still inflate freely. Verified by pixel probe across 5 ocean
depths × 3 seeds: **0/360 breaching bearings** in every case, against a clear
breach before.

### A rule for the harness

**A probe that reimplements a boundary will miss what the renderer draws.** The
first breach probe measured the ocean layer (which carries no relief) and
reported no problem while the render plainly showed one. What pokes out is the
CRUST's terrain and the frosting on it. The pixel probe that settled it walks
the rendered image and asks "is the outermost lit pixel a body pixel or a haze
pixel", which cannot be fooled by looking at the wrong layer.

---

## Session E — Pass 2: the angular thermal field

### D35 · `tempAt` — the field that says what the material IS

**Decided:** Session E. **Where:** `js/gen/zones.js`, `js/gen/frosting.js`,
`js/gen/palette.js`, `js/gen/details.js`, `js/draw/film.js`,
`js/data/archetypes.js`, `docs/HAZARDS.md`.

Every zone field before this one moves things AROUND — the sea, the snowline,
the air, the terrain amplitude. None could answer "is this ice or is this
sand", because that is a question about the substance rather than its position.
So a locked world's night cap was placed correctly by the snowline and then
painted in whatever hue the global family rolled: structurally an ice cap,
chromatically not ice. Measured before the change, `frostPeak` saturation ran
0.27–0.40 across the whole heat/ocean grid and **never went white**, even at
`interiorHeat = 0`.

**Two new samplers, both perturbations like everything else here (rule 1):**

    tempAt(angle, base)          surface temperature 0..1
    surfaceStateAt(angle, base)  "boiled" | "hot" | "temperate" | "cold" | "frozen"

`base` is the body's own climate and the recipe's `temp` shifts it per face, so
a hot world's night side is milder than a cold world's and neither becomes the
other. Verified: at `interiorHeat` 0 / 0.5 / 1 the night face reads 0.00
(frozen) / 0.15 (frozen) / 0.36 (temperate).

**The frosting family is now resolved three times, not once.** Rather than make
every colour rule angular, the same family is driven to a frozen extreme and a
scorched one, and `draw/film.js` blends between the three sets by temperature.
The sets share hue, spread and every roll, so a world still looks like one world
at both ends. Temperature picks WHAT the material is; the height field still
picks WHICH of the four zones it is — in that order, so a frozen face's
shoreline is sea ice while a temperate face's is a reef.

Measured after: cold set lands at s≈0.05 v≈0.81 (genuine ice, faintly blue),
hot set at v≈0.53 against a normal v≈0.96 (ashen, darker than the ground it
replaces). At lock 0 nothing is written and the render is byte-identical.

**Erosion was deliberately NOT made angular.** `erode` smooths the whole stored
field, so per-face erosion means building the field twice — real machinery for a
difference the zone's `relief` multiplier (0.55 baked / 1.25 frozen) already
carries at a glance. Recorded rather than done.

**`details.climate` exposes the whole thing to text**, which closes the gap
HAZARDS.md had been promising against: it commits to "Dayside 430 °C ·
Nightside −170 °C" and "no single surface temperature", and nothing could
answer. Now `min`/`max`/`spread`/`states`/`hottest`/`coldest` are read off the
same field the picture is drawn from, so a card cannot contradict the render.
Normalized 0..1 rather than degrees — a star's 0.9 is not a planet's, so the
mapping belongs with the per-family template. HAZARDS.md documents the contract
and gains a surface-state table plus locked-world hazard lines.

### The bug this cost a round to

**A parameter shadowed by a local of the same name fails silently and looks
like a plumbing problem.** `Frosting.resolve` gained a `zones` parameter — and
line 83 already had `var zones = spec.zones || {}`, the frosting SPEC's zone
table. By the guard at the bottom, `zones` was the spec's, which has no
`tempAt`, so the whole block was skipped while every trace at the call site
showed the field arriving correctly. Two probes disagreed for the right reason:
one logged what was PASSED (correct) and one logged what was READ (undefined).
The parameter is now `thermal`.

Worth keeping as a rule: **when a value is provably correct at the call site and
provably wrong inside, suspect a shadow before suspecting the caller.**

---

## Session E — investigation: cold regions on unzoned worlds

### D36 · The snow zone is dead on every unzoned body — FIXED

**Found and fixed:** Session E. The rest of the climate work is planned in
[CLIMATE-PLAN.md](CLIMATE-PLAN.md); this bug was independent of it and was fixed
immediately.

The user reported that an ordinary planet grows no polar caps and its ocean
never freezes. Investigating found a larger problem behind it.

**Swept 200 bodies (40 seeds × 5 ocean depths) at lock 0: 0 showed any snow.**
Not "rarely" — never. `frostPeak` is one of four zones the frosting system
authors, colours and runs a contrast pass over, and it is unreachable on every
unzoned world.

```
oceanDepth=0.0: h ranges -0.268 .. 0.274   SNOWLINE=0.42  UNREACHABLE
oceanDepth=0.4: h ranges -0.384 .. 0.158   SNOWLINE=0.42  UNREACHABLE
oceanDepth=0.9: h ranges -0.729 .. -0.188  SNOWLINE=0.42  UNREACHABLE
```

Two compounding causes:

1. **A unit mismatch.** `draw/film.js` measures elevation as
   `terrain.at(a) * relief` — damped by `SILHOUETTE_RELIEF` (0.55) — and then
   normalizes by the **undamped** `terrain.range()`. The effective threshold is
   `0.42 / 0.55 ≈ 0.76` of the true range.
2. **Sea level sits mid-range**, spending half the range before the snowline is
   measured.

Even undamped, max `h` reaches only 0.382.

**The fix**, in `draw/film.js`: measure the span in the same units as the
elevation.

```js
var span = Math.max(1e-6, (range.hi - range.lo) * relief);
```

One factor, and it is the one the elevation was already carrying. Measured after:

| oceanDepth | bodies with snow | snow as % of circumference |
|---|---|---|
| 0.0 | 40/40 | mean 2%, max 6% |
| 0.2 | 40/40 | mean 1%, max 2% |
| 0.4 | 0/40 | 0% |
| 0.8 | 0/40 | 0% |

**40% of sampled bodies overall**, and the gradient is the right shape: dry
worlds get snow-capped peaks, waterworlds correctly get none because everything
is drowned. Coverage stays at 1–6% of the circumference — genuine mountain-top
capping rather than a white-over. The locked-world path is unchanged (night cap
still 100% snow, dayside still dry).

**Why it went unnoticed:** the locked-world path drags the snowline down by
`snow: -1.10`, which clears the broken threshold easily. The feature that used
the zone most was the one configuration where the bug could not show.

### D37 · Nothing can freeze the ocean

The deferred fluid draws as `fillLayer` → `paintZoneBand` → `drawLayer`, and
`paintZoneBand` asks only `shiftAt()` — a generic HSV delta that never consults
`tempAt`. On a fully locked world the frozen face's sea gets `dv = -0.075`: a 7%
darkening. There is no ice sheet and no shift toward white.

`tempAt` (D35) reaches the frosting only. Generalising it is the plan's core.

### D38 · The thermal field must become universal

`Zones.build` returns `null` at intensity 0 — correct for cost, but it means
`tempAt`, `snowAt`, `coverAt` and `airAt` are **all absent on an ordinary
planet**. There is no "where is it cold" to ask, which is why caps cannot exist.

The plan generalises this into `CC.Climate`: a field present on every body,
composed from an orbital baseline, a latitude term (`|cos(angle)|` — the body is
drawn pole-up, so latitude is already available and nothing used it), and the
tidal-lock zone term when the dial is up.

**The constraint that shapes the whole design:** D27 cut `ice-caps` as a trait
because "a cap that emerges from the frosting pools in valleys and thins on
ridges; a wedge could only ever be a polygon laid on top of the terrain". Caps
must therefore emerge from a lowered snowline, exactly as the night cap already
does. The plan adds no cap primitive.

**Orbital distance** is the new axis that makes cold regions conditional — a
Venus gets no caps because its baseline is above freezing everywhere, not
because a rule excluded it.

### D39 · The ocean can only ever be blue — measured, and planned

**Found:** Session E. **Planned, not built** — see
[CLIMATE-PLAN.md](CLIMATE-PLAN.md), "Exotic ocean colour".

The user asked whether exotic sea colours are reachable. They are not. Across
**300 randomly seeded bodies** with the primary hue rolling freely:

```
ocean hue: min=160  max=256  median=208   (of 360 possible)
ocean val: 0.18 .. 0.38
```

Zero bodies outside cyan→blue. Three separate limits, and the second and third
are easy to miss:

1. **`hue: [186, 232]`** in `archetypes.js` — the ocean is the ONLY layer with
   an absolute hue range; every other layer derives from the anchors.
2. **The user cannot override it.** `primaryHue` only leans by `hueLean: 0.16`;
   a primary of 0° (red) still gives a 243° (blue) ocean.
3. **`val` caps at 0.38**, so no sea can be pale, white or bright — a separate
   ceiling from the hue one. Freeing hue alone would only produce "a dark sea
   of a different colour".

**The range is not a mistake and must not simply be deleted.** `gen/palette.js`
records why: *"without this, an ocean on a rust-coloured world came out brown,
which is the single thing that most stopped these reading as planets."*

So the plan keeps it as the default and adds an **Exotic oceans** checkbox, off
by default — the user's own proposed shape, and the right one.

**Worth noting as a pattern:** the frosting hit the same failure from the
opposite direction. It was authored to 70–145°, every world came out the same
ochre, and its range was removed entirely (D19). Two layers, opposite errors.
The lesson: **an authored hue range is a strong claim that needs a stated
reason.** The ocean has one. The frosting did not.

The plan also adopts the user's suggestion that **Star activity** push the
sea's saturation and brightness when the checkbox is on — which gives the
toggle a reason to exist inside the simulation (a strange sea as a consequence
of a violent star) rather than being only a taste switch.

---

