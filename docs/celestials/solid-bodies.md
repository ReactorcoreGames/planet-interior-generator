# Solid Bodies

**Archetypes:** `planet` · `moon` · `asteroid`

Bodies you could land on. They share a differentiated interior — dense core,
mantle bulk, thin crust — with the differences being scale, atmosphere, and how
chaotic the interior is.

**Body tags:** `solid-surface`, `solid-interior`

---

## planet

> Solid ground and a metal heart. The workhorse type — most varieties (desert,
> ocean, volcanic, frozen) are this archetype with different **parameter values**
> and colours, reachable as presets.

**Why they aren't separate archetypes:** desert / ocean / frozen / volcanic all
share this exact layer stack. What differs is ocean thickness, how hot the
interior runs, and the palette. Those are the **Ocean depth** and **Interior
heat** parameters — see [PARAMETERS.md](../PARAMETERS.md#-structure). Splitting
them into archetypes would make combinations like "tidally locked ocean world"
or "frozen desert with a dying core" into conflicts needing hand-resolution;
as parameter positions they just work.

The one solid variety that *does* earn its own archetype is
[ice-shelled moon](#ice-shelled-moon) — because its stack genuinely inverts,
putting the ocean *below* the crust.

### Standard stack

Outermost first. `frac` = **outer** radius as a fraction of body radius. Each
layer runs inward until the next one starts, so a layer's thickness is its own
`frac` minus the `frac` of the layer below it.

**Proportions are stylized, not physical** — see
[PROGRESS.md](../PROGRESS.md) D5. A real crust is ~0.5% of the radius and would
draw as an invisible sliver with nowhere to put surface traits. These are
textbook-diagram proportions: every layer legible, the mantle still visibly the
bulk.

| Layer role | Frac range | Optional | Boundary | Notes |
|---|---|---|---|---|
| `atmosphere` | surface +0.07…0.13 | presence: 2.0 (guaranteed at slider 0.5) | soft gradient | sits *on the surface*, whatever that is; absent = airless world |
| `ocean` | crust +0.0…0.105 | Ocean depth | perfect circle | sits *on the crust*; thickness driven by the parameter, not rolled. The range is a **sea level swept across the terrain** — see below. Its surface is flat on an ordinary world and **angular on a tidally locked one** |
| `crust` | 0.90–0.94 | — | near-perfect | rigid shell; thins as Interior heat rises and as the ocean deepens. Carries `relief: 0.19` — the surface terrain field |
| `mantle` | 0.72–0.78 | — | irregular | the bulk; convective |
| `outer-core` | 0.38–0.52 | — | near-perfect | liquid dynamo, and the mantle's floor. **Always present** — a cooling core freezes inward rather than vanishing |
| `core` | 0.26–0.36 | — | near-perfect | solid metal; **grows as Interior heat falls**, eating into the liquid shell above it |

> **Note on the atmosphere and ocean rows.** Both are positioned *relative to
> another layer* rather than at an absolute radius — an ocean floats on
> whatever crust the body rolled, and an atmosphere sits on rock or on water
> depending on whether there's a sea. See [PROGRESS.md](../PROGRESS.md) D2.
> After the stack is built it is renormalized so the surface is exactly 1.0
> (D3), which is why the ocean's outer radius doesn't read as >1 in output.

> **Earlier revisions of this table** gave the mantle as 0.42–0.72 and the
> outer core as 0.20–0.38. Read as outer radii those leave ~25% of the radius
> unassigned. The 0.42–0.72 figure was the **core–mantle boundary** — the
> mantle's floor, which is the outer core's *outer* radius. Corrected above.

> **The mantle was pulled in from 0.80–0.855 to 0.72–0.78 in Phase 3.** Once
> the crust carried surface terrain, coastlines, strata and fractures, the old
> proportions left the richest part of the cutaway sharing a ~13% rim while the
> mantle took ~40%. Crust and ocean now get roughly a fifth of the radius. The
> mantle remains the single largest layer. This is [PROGRESS.md](../PROGRESS.md)
> D5's stylized-proportions argument applied a second time, now that there is
> something in those outer layers worth showing.

### Surface terrain

The crust declares `relief`, which makes it the first consumer of the generic
angular field generator in `js/gen/terrain.js` — see
[PROGRESS.md](../PROGRESS.md) D15. Three octave bands (landmasses, ranges,
roughness) plus impact craters, eroded by a smoothing pass weighted to
atmosphere thickness.

**The coastline is never drawn.** Land is wherever terrain rises above the
ocean's flat top, so one mechanism produces the whole range as Ocean depth
moves: a dry world of exposed mesas and ridges, an Earth-like world with real
coastlines, an archipelago of surviving peaks, and a drowned world with a
varied seafloor. The ocean stays a **full concentric band** throughout
(D7) — land is a consequence of the crossing, not a partial band.

### Surface film

`film` is a **surface role**, not a layer: a thin cover drawn on top of exposed
terrain rather than a band in the stack. It is marked `surface: true` in the
colour profile and is deliberately absent from `colorProfile.order`, since
`order` encodes depth and a film has no radius of its own.

It represents material **deposited** on the terrain — snow, vegetation, reefs,
silt, abyssal ooze. **Every solid body gets one**; what varies is its character.

**It settles; it is not a coating.** The frosting has its own outer curve: a
smoothed version of the terrain, so it pools in hollows and comes out nearly
flat on top, and thins on ridges where it sheds and lets rock through. Its top
surface is *smoother* than the rock beneath it, which is the whole difference
between frosting and a painted rind — see PROGRESS.md D20.

**Four zones, from the height field and the sea level:**

| Zone | Where | Character |
|---|---|---|
| `frostPeak` | above the snowline (sea level +0.42 of terrain range) | smooth, even, whitens on cold worlds |
| `frostLand` | ordinary exposed surface | patchy, draped, bleeds deepest into rock |
| `frostShallow` | shoreline and shelf (down to −0.16) | lumpy, broken, most saturated |
| `frostDeep` | the abyssal floor | thick, smooth, almost featureless |

Zone weights are four overlapping ramps summing to 1 — never a branch — so
every boundary is a gradient, and a Phase 4 `zoneAt(angle, depth)` field can
multiply into them without any new drawing code. Tidal locking is then "the
peak zone reaches further down at one end of the body".

### Ice caps emerge here — and this closes the loop D27 opened

**`frostPeak` is where a polar cap comes from.** There is no cap primitive
anywhere in the codebase and there must never be one. `CC.Climate` supplies a
per-bearing snowline offset; where a bearing is cold the line falls, `frostPeak`
claims the ground, and `depositTop` pools it into the valleys and thins it on
the ridges exactly as it does with every other zone.

That is precisely what D27 demanded when it cut the `ice-caps` trait: a drawn
wedge "could only ever be a polygon laid on top of the terrain", whereas a cap
that emerges from deposition follows the ground it lies on. **The concept was
never unwanted — only the polygon was.**

Three consequences worth knowing:

- **A hot world grows no cap because of arithmetic, not a rule.** Its baseline
  is above freezing at every latitude, so there was never any ice to place.
- **The snow boundary is authored WIDER than the other three** (`SNOW_BLEND`
  0.42 against `BLEND` 0.13). A shoreline is an elevation boundary and is
  nearly sharp; a snowline is a climatic one and is not — and two gradients
  compound at a cap's edge, the terrain falling away *and* the snowline rising
  as the bearing warms.
- **The ice COLOUR and the snowline read one figure**, `climate.chillAt`.
  Having two thresholds for the same physical fact put a cap on a temperate
  world in vegetation colours: placed as snow, painted as moss.

**Sea ice is a separate thing and both are present.** The frosting is what lies
on the ground; sea ice (`draw/zonepaint.js`) is a real geometric band on the
water's outer surface, clipped to the fluid. They cannot double-paint into one
flat white band because they are drawn against different surfaces.

Each zone carries deposition *character* as well as colour (`depth`, `smooth`,
`bleed`, `patch`, `grain`), which is what makes snow, moss and reefs read as
different materials rather than as one frosting in four colours. That is a
biome system's look without a biome system's machinery.

**It is not masked to land.** The sea floor gets reefs and ooze exactly as the
hills get moss; the sea is drawn afterwards and tints what is under it, so
submerged frosting correctly reads as being seen through water.

**Hue is essentially free** — one base hue anywhere on the wheel, with the four
zones at authored offsets from it scaled by a per-body spread, so a world's
cover stays a family. Orange grass or pink forests on a brown world are a
feature, not a failure. What is constrained instead is **contrast against the
rock**: the family is lifted as a unit until its darkest dry zone clears the
crust in value, and every zone is guaranteed more saturated than the ground.
Making the separation relational rather than absolute is what lets the hue roam
freely without any world losing its cover into the background.

**Surface carries no wobble.** That is what makes a planet read as a sphere
rather than a potato — the rule is about v2's crude boundary wobble, which was
removed, not about surface relief.

**Terrain does shape the silhouette**, damped to ~55% amplitude on the
outermost layer. An airless, oceanless world should read as a landscape, not as
a flat disc with shading painted on it. See [PROGRESS.md](../PROGRESS.md) D17.

**Ocean thickness is parameter-driven rather than rolled**, coming from **Ocean
depth** — 0 removes the layer entirely.

**Interior heat reshapes the core rather than removing a layer.** As the world
cools the solid inner core grows outward into the liquid outer core, so the two
trade space while the metal region as a whole keeps its size. A thin liquid
shell always survives, so the core always reads as two-tone. See
[PROGRESS.md](../PROGRESS.md) D16 — this replaces the earlier behaviour where
the outer core disappeared below ~12% heat, which made the metal region pop
smaller as the slider crossed the threshold.

Both parameters also affect derived stats — a nearly-frozen core means a weak
dynamo, and no magnetic field means a harsher radiation hazard.

### Colour profile

Body hue free. Saturation low outside, rising inward when the interior is hot.
As shipped:

| Layer | Saturation | Value | Own hue | Self-lit |
|---|---|---|---|---|
| atmosphere | 0.15–0.45 | 0.55–0.85 | — | — |
| ocean | 0.42–0.72 | 0.22–0.48 | 186–232° (lean 0.16) | — |

> **The ocean's hue range is waivable, and only the ocean's.** With **Exotic
> oceans** ticked the layer drops its authored hue entirely and rolls anywhere
> on the wheel, its sat/val ranges widen to 0.06–0.92 / 0.10–0.78, and Star
> activity pushes both. The default stays as tabled, because the narrow range
> is a deliberate fix for a real failure — see PROGRESS.md D39. A layer opts in
> by declaring `exotic`, so this is archetype data rather than a role name in
> the palette.
| frostPeak | 0.20–0.55 | 0.60–0.72 | base +18° · whitens when cold | — |
| frostLand | 0.48–0.90 | 0.38–0.50 | the family base hue | — |
| frostShallow | 0.55–0.95 | 0.48–0.60 | base −52° | — |
| frostDeep | 0.35–0.70 | 0.26–0.38 | base −84° | — |

The frosting **value** bands are narrow and barely overlap, which is load-bearing
rather than fussy. They are authored ordered (peak > shallow > land > deep) and
centred low so the contrast rule has room to lift the whole family clear of the
rock without crushing it against the ceiling. Authored wide, a roll could put the
abyssal floor brighter than the snowline, and half of every body's zone colours
ended up pinned at the top with their spacing gone — see PROGRESS.md D20.
| crust | 0.10–0.34 | 0.28–0.62 | — | — |
| mantle | 0.32–0.64 | 0.26–0.58 | *heat-leaned*, see below | — |
| outer-core | 0.70–0.95 | 0.52–0.76 | 10–40° (lean 0.20) | ✅ |
| core | 0.48–0.80 | 0.84–1.00 | 28–54° (lean 0.16) | ✅ |

### The mantle carries the heat

The mantle is the largest band on the disc and the layer the eye spends most of
its time on, so it is the layer that has to answer *how hot is this world?* It
does that with two fields no other solid layer declares:

| Field | Value | What it does |
|---|---|---|
| `heatLean` | `{ hue: [2, 26], amount: 0.72 }` | A hot-side hue to travel **toward**, scaled by Interior heat |
| `heatGradient` | `0.78` | How strongly the band grades from cool at its outer edge to hot at its inner one |

**`heatLean` is not the same as the core's `hue`.** The core declares an
absolute hue and keeps it whatever the body is made of. The mantle instead
*leans* — at Interior heat 0 it keeps exactly the anchor-derived rock colour it
would otherwise have had, and at heat 1 it has travelled `amount` of the way to
the hot band. Only the hot half of the dial leans at all; below 0.5 the existing
cold-world desaturation carries "dead", which it already did well.

This is the **perturb, not replace** rule applied to temperature. Pinning the
hue outright would make every hot planet's mantle the same orange and throw away
the body's own colour scheme — the thing the whole anchor system exists to
protect. A blue world's hot mantle must come out a hot *blue-shifted red*, still
recognisably that world.

**`heatGradient` is the piece that does most of the visual work.** A band
painted one colour says "this material is uniform", and for a mantle that is
false: it is a transition from cooler rock at the crust to near-melt at the core
boundary, and drawing that transition is what reads as heat. A uniformly hot
band just reads as an orange stripe. The palette publishes a second colour —
`hotEdge` — for the layer's inner edge, and `draw/scene.js` ramps between them
across the band, cooling slightly *below* the band colour at the outer rim so
the base colour sits in the middle of the ramp rather than at its end.

The gradient's strength **eases in and then holds** rather than scaling linearly
with the dial: a mantle grades at every temperature a mantle can have, so what
heat changes is how hot the hot end is, not whether there is one. Scaling it
linearly made an Earth-like world at heat 0.5 come out almost perfectly flat.

Detail elements ride the same gradient (`DrawDetails.heatShift`), which is the
point of putting it on the band rather than hand-colouring the mantle: the
convection cells, arrows and flow-lines all derive from the band colour, so once
the band varies with depth the circulation gains contrast exactly where the
mantle is most violent. See [PROGRESS.md](../PROGRESS.md) D59.

#### Three things the lean needs beyond "move toward hot"

**The reach scales with distance.** A fixed fraction works if you start near
the hot band and fails badly if you do not — a green mantle moving 55% of the
way from hue 133 lands at 77, which is olive rock. The fraction now grows with
how far there is to travel, so a warm hue barely moves and a far one comes
most of the way home.

**There is a ceiling on the destination** (`heatLean.ceiling`, default on).
Leaning is a *journey*, so a hue arriving from the green side stops wherever it
got to — and that is the yellow-olive band, which passes a numeric "is it in
the hot hues" check and reads as sulphur. Anything left above the target range
is carried down to it. **Molten rock is red-orange; yellow and white belong to
the metal core**, which declares `ceiling: false` for exactly that reason.

**There is a floor under saturation and value.** Getting the hue right is not
sufficient: a mantle can roll the bottom of its ranges and a dark desaturated
red is maroon, which reads as cold rock however correct its hue. The floor
rises with the lean, so it does nothing on a cold world, and it is a *floor*
rather than a set value, so a mantle that already rolled hot keeps its own roll.

#### Every interior layer grades, not just the mantle

| Layer | Gradient | Why |
|---|---|---|
| `ocean` | `depthGradient: 0.86` | Light is absorbed with distance through a fluid — deep water is dark water. The strongest in the stack, and the one needing no stylistic justification |
| `crust` | `depthGradient: 0.82` | Layered rock darkens downward — light falls off into a solid, and deep rock is compacted and duller |
| `mantle` | `heatGradient: 0.78` | Cool rock at the crust to near-melt at the core boundary |
| `outer-core` | `heatGradient: 0.85` | A dynamo is hotter against the inner core than against the mantle |
| `core` | `heatGradient: 0.88` | Radiating outward from its centre |

**A depth gradient runs the WHOLE band, not just its base.** The crust's first
version reached its base colour by 0.52 and was flat above, so the upper half —
the half carrying terrain, strata and coastlines, the part anyone actually looks
at — got nothing. The ramp now continues past the base colour and *lightens*
toward the surface. Terrain relief is drawn as translucent slope shading over
this fill, so it picks the gradient up rather than hiding it.

**`depthGradient` is the non-thermal sibling.** Same machinery, opposite
direction: the inner edge goes *darker* and slightly more saturated rather than
hotter and brighter, and it is independent of the Interior heat dial because a
crust is stratified on a dead world too. A crust or a sheet of ice does not get
hotter inward in any way worth drawing, but both have an inside and an outside,
and shading that is what gives the cutaway depth.

**Sea ice grades too**, through its own thickness — bright scattering rime at
the surface down to dense blue compressed ice against the water — and it
**follows the sea it floats on**: where the ocean carries a depth gradient the
ice scales its own to match, so the two read as one column of fluid going dark
with depth rather than a bright lid on a separately-shaded sea. It reuses the
nested thickness bands `paintSeaIce` already draws, so it costs no new
geometry. Blue deepens with depth because that is what ice does: it absorbs red
over distance.

**The gradient branch must be tested BEFORE the emissive branch.** Both metal
layers are emissive, so an `if (emissive) … else if (hotEdge)` chain shadowed
the thermal ramp entirely and they rendered with the weak generic self-lit
shading — the palette computed a gradient and the renderer discarded it. Order
a dispatch chain by specificity, not by which branch was written first.

**Spread the stops across the whole band.** Three stops at 0.40/0.78/1.0 put the
entire transition in the outer fifth, which reads as a rim rather than a
gradient. Five or six, sampled from a band→hotEdge interpolator, so the curve
is drawn rather than approximated by a straight line.

**Each layer wants a different profile.** The crust holds its colour and then
falls off sharply at its base, like the underside of a solid. The inner core is
near-uniform through the middle and falls away steeply at the rim — front-loaded
stops, because an even ramp reads as a flat cone rather than a sphere.

**A layer at full brightness grades the other way.** The inner core sits at
`v ≈ 1.0` by design, so "hotter" has no headroom left in value and the
fluorescent ceiling would pull its *saturation* down instead — washing the
centre toward white, which is D13's dull-disc failure arriving from the
opposite direction. A layer with no value headroom therefore grades in **hue**,
climbing the spectrum the way real incandescence does: deep red, orange,
yellow, white.

**Any layer of any archetype may declare these.** They are read from the colour
profile, never from a role name, so a gas giant's metallic-hydrogen shell or a
moon's sluggish mantle gets the same treatment by declaring it — and a layer
that declares neither behaves exactly as before.

> **Adjacency is judged at the edges that touch.** Once a layer carries a
> gradient, its base colour is no longer what meets its neighbour — the outer
> core meets the inner core with its *hot* edge. Both the palette's separation
> pass and the sweep's muddiness check compare `hotEdge` where present, or they
> would be asking about a boundary that is not on screen.

`secondaryRel: "complement"` — a warm core against a cool crust reads well.

`order: [atmosphere, ocean, crust, mantle, outer-core, core]` — colour is
derived from a layer's position in this list, never from its measured radius.
**Required for every archetype**; see
[ARCHITECTURE.md](../ARCHITECTURE.md#changing-one-layer-must-never-recolour-another).

**Own hue** means the material keeps its colour whatever the rest of the body
is made of, leaning only slightly toward the body's primary — water is
blue-green on any world, molten metal glows orange. Layers without one derive
their hue from the primary/secondary anchors.

**Self-lit** (`incandescent`) layers emit rather than reflect: they keep a
looser saturation ceiling, brighten as Interior heat rises, and are shaded
glowing-outward instead of lit-from-outside.

**Interior heat drives saturation and brightness.** High heat pushes the
interior toward the top of its ranges; low heat pulls the whole profile toward
grey *and* dims the deep layers, so a cold core reads as dull metal. This is
the same parameter that controls the layer structure, so a dead world looks
dead in both its shape and its colour without needing a trait to say so.

### Layer details (always drawn)

Counts below are the **shipped** figures from `js/data/elements.js`, given as
the range from Detail density 0 to 1. They run well above the original spec,
which was written against much thinner layers — see the note after the table.

| Layer | Elements | Count (density 0 → 1) |
|---|---|---|
| atmosphere | gradient sub-bands / haze wisps / outer stipple | 3–6 / 32–114 / 138–676 |
| ocean | depth gradient / current arcs / flow lines / particulate | 1 / 16–68 / 12–47 / 176–832 |
| crust | strata / fractures / mineral pockets / grain | 32–109 / 37–135 / 34–130 / 748–2990 |
| mantle | convection cells / flow arrows / flow lines / blobs / grain | 80–210 / 58–150 / 78–235 / 55–190 / 616–2470 |
| outer-core | swirl bands / flow arrows / flow lines / grain | 52–165 / 34–95 / 52–150 / 352–1456 |
| core | compression rings / dense stipple / inclusions | 4–10 / 660–2600 / 18–73 |

Mantle and outer-core get **diagrammatic treatment** — visible circulation.

**Flow indicators taper and accelerate.** Drawn at one width, one alpha and a
constant arc they read as pale chalk scribbles rather than as moving material.
Flow lines thin toward the head; arrows *thicken* toward theirs, because an
arrow's weight belongs at its point. Both apply their lean on a rising curve
(`t*a + t²*b`) so the far end whips rather than drifting — an even arc reads as
drawn, an accelerating one as flung. See D62.
Crust and core get texture only.

> **The original counts were a floor, not a target** — as
> [ROADMAP.md](../ROADMAP.md) warned. They were authored against a hairline
> crust, and the stylized proportions (D5) gave every outer layer far more
> area to fill. A planet at the default 65% density emits **~9,000 elements**
> and renders in about half a second at 1080p, against a 10–20 second budget.
> Density is not constrained by performance here.

### Eligible traits

`✅` built · `⬜` planned.

**Climate & surface:** ⬜ runaway-greenhouse · ⬜ storm-belts

> `ice-caps` and `tidally-locked` were both traits and are **no longer**.
> Tidal locking is an always-present axis (above); ice caps emerge from the
> frosting on its cold face. See [PROGRESS.md](../PROGRESS.md) D27.

**Interior:** ✅ mineral-veins · ✅ ore-deposits · ✅ void-pockets ·
✅ magma-chambers · ✅ metal-rich

> **Removed from this list:** `desert-world`, `ocean-world`, `frozen-world`,
> `volcanic` and `ancient-dead` are **not traits** — they are positions on the
> Ocean depth and Interior heat sliders, surfaced as presets.
> `hollow-core` and `twin-core` are **cut entirely** (see
> [TRAIT-SYSTEM.md](../TRAIT-SYSTEM.md#remaining-structural-traits)).

**Orbital:** ✅ ring-system · ✅ debris-belt · ⬜ moon-cluster · ⬜ aurora

**Damage:** ✅ cratered · ✅ impact-basin · ⬜ shattered · ⬜ irradiated

> **`shattered` is a zone with `remove: true`** — the zone primitive is built
> (Phase 4) but the removal flag is not yet implemented; it is the one zone
> behaviour that subtracts geometry rather than perturbing colour. The
> remaining four are candidates rather than commitments: `runaway-greenhouse`
> and `irradiated` may turn out to be parameter positions rather than traits,
> which is the test [TRAIT-SYSTEM.md](../TRAIT-SYSTEM.md#the-three-tests)
> applies to everything in this list.

### Tidal locking — an axis, not a trait

**Always present, 0% on an ordinary rotating world.** Declared in
`archetype.axes.tidalLock` and surfaced as a slider in the Structure section
beside Ocean depth, because the two are physically coupled: locking is what
boils the sea off one face and freezes it onto the other.

It is not a trait because it changes only *values* in the layer stack, never
the stack itself — TRAIT-SYSTEM.md's third test. It shipped as a trait first,
which was a violation of that rule; see [PROGRESS.md](../PROGRESS.md) D27.

Three faces, each declaring **deltas and multipliers** against whatever the
body already rolled — never absolute values:

| Zone | Arc at full lock | Sea level | Snowline | Relief | Cover | Air |
|---|---|---|---|---|---|---|
| `hot` | 140° | −1.25 (below every trough → dry) | +2.20 (out of reach) | ×0.55 | ×0.10 | ×0.55 |
| `twilight` | 80° (the dial) | 0 | 0 | ×1.00 | ×1.35 | ×1.00 |
| `cold` | 140° | +0.34 (pooled) | −1.10 (down past the shore) | ×1.25 | ×1.30 | ×0.40 |

`sea` and `snow` are signed offsets in units of the terrain's own range — the
same units `SNOWLINE` and `SHELF` use in `draw/film.js`, so the numbers are
directly comparable.

**The twilight arc is the dial**, interpolating from 340° (effectively
unzoned) to 80° at full lock; the extremes absorb whatever it gives up. No
separate "partially locked" state and no second code path.

**THE PICTURE EMERGES; IT IS NOT PAINTED.** An earlier version washed a colour
tint over the layer bands, which described tidal locking rather than producing
it. Now every visible consequence comes from a system that already existed:

- **The ocean pinches into an oval** — its surface is angular, so on the hot
  face the water sits below the terrain's own troughs and the clip encloses
  nothing. The sea is *absent*, not thin.
- **An ice cap grows on the night face** — the snowline drops below the
  waterline there, so the frosting's snow zone claims the hills, the shore and
  the shallow sea floor alike. This is D20's prediction arriving as written:
  "the peak zone reaching further down at one end of the body", and it needs no
  ice-cap code.
- **The dayside is scoured** — flatter relief, and `cover` thins the deposit to
  bare rock rather than recolouring it.

`ice-caps` was a separate `wedge` trait and is **cut**: caps that emerge from
deposition sit on the terrain, pool in valleys and thin on ridges, where a
drawn wedge could only ever be a polygon laid over the top of it.

**Artificial:** see [MACHINE-WORLDS.md](../MACHINE-WORLDS.md) —
orbital-ring · surface-city · underground-city · satellite-network ·
orbital-platforms · starship-fleet · orbital-minefield

### Stats template

```
Size                  {km} across — {Earth comparison}
Gravity               {n}× Earth — {what it feels like}
Surface temperature   {lo} °C to {hi} °C  ({rating})
Day length            {duration} from sunrise to sunrise
Atmosphere            {breathable? composition? pressure?}
Surface               {what's underfoot}
Biggest danger        {hazard}
```

- **Radius:** 2,400–9,800 km
- **Gravity:** 0.3–2.5 g
- **Temperature:** −180 to +460 °C typical (traits push the extremes)
- **Stand on it?** Yes
- **Breathe?** Only with the right trait combination

### Flavour

- "A world you could walk on, if you brought the right suit."
- "Solid rock over a metal heart, still warm after billions of years."
- "The kind of place you land on, not fly through."

---

## moon

> A smaller world, usually airless, often more interesting than the planet it
> orbits. Ice-shelled moons hiding subsurface oceans are the prize.

### Standard stack

Same conventions as the planet: `frac` is the **outer** radius, each layer runs
inward until the next begins, and proportions are stylized
([PROGRESS.md](../PROGRESS.md) D5) rather than physical.

| Layer role | Frac range | Optional | Boundary | Notes |
|---|---|---|---|---|
| `atmosphere` | surface +0.03…0.06 | 15% | soft gradient | thin if present |
| `ice-shell` | 0.925–0.950 | **cold-gated**, see below | near-perfect | the Europa case; becomes the surface when present. Carries `relief`, so its peaks reach the drawn surface at ~1.0 |
| `ocean` | 0.800–0.850 | with `ice-shell` | perfect circle | subsurface, dark — sits *below* the ice |
| `crust` | 0.900–0.945 | — | near-perfect | heavily cratered. **Drops to 0.680–0.740 when an ice-shell is present**, with the mantle dropping to 0.540–0.620 to match |
| `mantle` | 0.740–0.820 | — | irregular | often cold, sluggish |
| `core` | 0.260–0.400 | — | near-perfect | small, may be inert |

> **THIS TABLE WAS CORRECTED IN PHASE 7, and the reasoning is recorded here
> the way D4's was** — an uncorrected table gets re-read literally by a later
> session, which is exactly how the moon's and asteroid's survived unrevisited
> for as long as they did.
>
> The old figures **composed** — no layer inverted at any combination of
> extremes, so D4's fault was genuinely absent. Three different faults were
> found by building the stack and printing what came out:
>
> 1. **Nothing sat above the ice-shell.** It was authored at 0.90–0.94 as the
>    surface, leaving 6–10% of the radius empty; the atmosphere is optional and
>    `outward`, so it does not count. `gen/structure.js` renormalizes the
>    surface to exactly 1.0 (D3), so the whole stack was silently multiplied by
>    up to 1.11 and the drawn radii were nowhere near the tabled ones. **The
>    authored number is not the drawn number** — D122 arriving in the structure
>    stage rather than in a mark's alpha.
> 2. **The ice-branch crust could roll 0.020 thick** while its own prose calls
>    it heavily cratered, and the **ocean could roll 0.030** — the one layer
>    that must never come out as a line, since the hidden sea is the entire
>    reason the branch exists. Both against D5's "every layer legible".
> 3. **The shell's own relief re-created fault 1 after it was fixed.** Terrain
>    peaks count toward the surface, so a shell authored at 1.000 with
>    `relief: 0.11` measured 1.055 and was drawn at 0.947. The range is now
>    authored half the relief low so renormalization brings it back to 1.0.
>
> Measured after the corrections: every layer on both branches clears 0.056 of
> the radius at its worst roll. `npm run test:docs` now composes each **branch**
> separately, since composing `frac_when` variants as one flat list compares
> layers that never coexist.

**The ice-shell is gated on temperature, not rolled.** `presence: { colder }`
— a shell of ice is the evidence that the body is cold, so rolling it
independently of the climate produced ice-shelled moons at 610 °C. Measured
with a flat 40% roll, only **11%** of ice moons actually showed the thing the
branch is for (a frozen shell over a liquid sea); the rest were warm bodies
wearing a lid. Gated, that figure is **65%**, with 83% frozen surfaces and 81%
liquid oceans — and the remainder are honest, because a dead moon's sea *does*
freeze through and the card says so.

**The ordering branch.** With an `ice-shell` the stack is ice → ocean → crust →
mantle → core; without it, crust sits directly at the surface. The crust's
`frac` therefore differs between the two branches, which is why two ranges are
given. This is the one place in the solid family where a stack genuinely
branches rather than varying by parameter — see below.

> **Implementation note.** The ocean here is *not* the planet's ocean. On a
> planet the ocean sits **on** the crust and is driven by Ocean depth (D2);
> here it sits **under** the ice-shell and is present only when that shell is.
> Both are expressible with the existing presence mechanism —
> `presence: {param: "oceanDepth", ...}` for the planet,
> `presence: {requires: "ice-shell"}` for the moon — but the second form does
> not exist yet and will need adding when this archetype is built.

<a name="ice-shelled-moon"></a>

### The ice-shelled branch

**This is the one solid variety with a genuinely different stack**, and it stays
a structural branch rather than becoming a parameter, because the ocean sits
*below* the crust instead of above it. That inversion can't be expressed by
moving a thickness slider — Ocean depth on a planet grows a surface sea, while
here the ocean is a hidden layer between ice and rock.

It is exposed as the **Ice-Shelled Moon** preset and as the `ice-shell` optional
layer, not as a separate archetype — the rest of the stack is an ordinary moon.

It has the best cutaway story in the solid family: the ocean is *invisible from
outside*, so the cross-section is the only way to see it. Lean into that —
bright fractured shell, dark water beneath, and the crust floor below.

**Use the terrain field twice, facing itself.** This is the branch's payoff and
what makes it worth its structural exception:

- **The rock floor under the ocean** takes an ordinary upward terrain field,
  with frosting settling into its trenches — brine pools and dark sediment
  gathering in the low ground, which is exactly what deposition already does.
- **The ice shell's underside** takes a second field, with frosting depositing
  **upward** as accreted ice — coloured tips hanging down into the water.

Two frosted surfaces facing each other across a dark ocean, and the viewer only
ever sees it because the body is cut open.

**Built in Phase 7.** `direction: -1` on the zone spec is what states the
inverted case, and it turned out to be what the spec predicted: a handful of
sign changes rather than a rewrite. `drawFrosting` now works in the deposit's
**own frame** — "up" means away from the surface the material grew on — with
`dir` the only place the two cases differ, so pooling, shedding, zone weights
and feathering are all the same arithmetic seen in a mirror. Three things
needed the sign besides the radii: the terrain field (a bump on an underside is
a dip the ice gathers in), the rock floor the ribbons clamp against, and the
band clip, which had to be **opened downward** or the hanging material was
clipped to nothing — the same trap the outward clip already cost a round on.

Two zone tables also had to become **per-role**. They were resolved once per
body, which was the whole truth while every archetype had one frosted surface;
`CC.Frosting.specFor` now picks a spec per role (`layers[role].film_when` →
`layers[role].film` → `layers.film`), with the body-wide fallback last so
nothing that worked before moved. Each spec gets **its own RNG stream** — shared,
the brine floor and the accreted ice rolled identical hues and the two surfaces
came out as one material drawn twice.

The fault that hid it for a round: `filmZoneByRole` was built by asking
`CC.Elements.reliefFor(role)`, which finds a role's *shared* terrain and misses
a layer whose field is declared on the layer as `reliefSpec` — which is exactly
the ice shell. The palette resolved all six zone colours, the terrain and mask
were built, and the accreted ice never drew because a key was absent from a
lookup. D159's shape, in the frosting rather than in an element recipe.

### Colour profile

Muted throughout — moons are typically low-saturation.

| Layer | Saturation | Lightness |
|---|---|---|
| ice-shell | 0.05–0.25 | 0.70–0.95 |
| ocean | 0.30–0.60 | 0.15–0.35 |
| crust | 0.05–0.30 | 0.30–0.65 |
| mantle | 0.20–0.50 | 0.25–0.50 |
| core | 0.35–0.70 | 0.45–0.75 |

**A moon's mantle should declare `heatLean` and `heatGradient` too, but weakly.**
The planet's figures (`amount: 0.55`, `heatGradient: 0.62`) are authored for a
body whose interior is the point of the picture. A moon is "often cold,
sluggish" by its own spec, so it wants roughly half of each — enough that a
tidally-heated moon reads as warm and a dead one as stone, without the vivid
red-orange interior that belongs to a live planet. Omitting the fields entirely
is also valid and simply gives the pre-D59 behaviour: an anchor-derived mantle
that never looks hot. What is *not* valid is copying the planet's numbers
across, which would make every moon look like a small planet.

**Frosting on a moon is regolith**, and the colour target is *subtle mineral
tint on grey* — faint ochre, rust, blue-grey — rather than literal grey. An
airless moon lands at the dry end of the aridity figure, which drains
saturation on its own.

Note that the contrast rule floors every zone at `host.s + 0.14` and a step
above the rock in value, so "desaturated" has a deliberate limit: a frosting
that matches its rock in both value and saturation is invisible, which is the
failure D19 exists to prevent. **Author dullness by narrowing the ranges and
the gaps between zones, not by trying to defeat the rule.**

**Built as TWO zones — `regolithRim` and `regolithFloor`** — because a planet's
four exist to divide ground either side of a sea and a moon has no sea. High
`smooth` (0.62 / 0.94) and near-zero `patch` (0.12 / 0.06): a dust sheet levels
and is not blotchy. Measured on a bare moon, the deposit's settled span comes
out at 0.091 against a rock span of 0.155, with 50% of bearings pooling and 50%
shedding — regolith filling crater floors and swept off rims, from
`depositTop` alone and with no crater-fill code.

**`hueFrom: "host"` is new here, and it is the one place the free frosting hue
is wrong.** A planet's cover is vegetation and reefs — things with chemistry of
their own — so "orange grass or pink forests are a feature" (D19), and
constraining the hue was the failure that made every world the same ochre.
Regolith is not that: it is the rock itself, ground to dust, so its hue is the
rock's *by definition*. Measured before the flag existed, the zones came out at
hue 138 and 97 over rock at 169 — moss on stone. Reading the host's hue and
narrowing the authored offsets to ±5/−11 puts both zones within ~20° of the
ground, which is the *subtle mineral tint on grey* this section asks for.

**`snow` IS KEPT, and D22's reasoning for dropping it is superseded.** D22 said
to drop it because "a dead airless body has no weather to deposit it". That was
sound when the only route to whiteness was a global aridity figure. But the
field is **angular** now, and cold-trapped volatile ice in permanently shadowed
polar craters is real, is visually excellent, and is exactly what an emergent
snowline produces. So the flag stays and a warm moon's own baseline denies it —
the same conditional the planet's caps use, with no new mechanism. The snowline
sits high (0.62 against a planet's 0.42), because a cold trap wants the top of
the relief *and* the cold end of the field at once.

### Layer details

| Layer | Elements | Count |
|---|---|---|
| ice-shell | fracture networks, Voronoi plates | 15–40 / 20–60 |
| ocean | depth gradient, faint currents | — / 4–10 |
| crust | craters, grain speckle | 20–60 / 300–700 |
| mantle | sparse convection, grain speckle | 8–20 / 200–400 |
| core | dense stipple | 150–300 |

Ice-shell fracture networks are the signature look — long branching cracks
across a bright shell.

### Eligible traits

subsurface-ocean · cryovolcanic · heavily-cratered ·
mineral-veins · void-pockets · impact-basin · shattered · tidal-heating ·
surface-city · underground-city · orbital-platforms

> `ice-caps` and `tidally-locked` are gone from this list for the same reason
> they left the planet's: tidal locking is an axis every solid body will
> declare in `archetype.axes`, and caps emerge from the frosting. A moon is
> *more* likely to be locked than a planet, so it should almost certainly roll
> the axis high by default when that archetype is built.

> **NO RINGS, AND NO DEBRIS BELT** (D173). The moon carries neither
> `dusty-rings` nor `orbit-debris`, so both orbital traits are ineligible.
> No moon in the solar system has a confirmed ring, and the reason is
> structural rather than accidental: a ring needs a stable band between the
> body's Roche limit and the distance where the PARENT planet's gravity takes
> over, and around a moon that band is very narrow — the parent strips it.
>
> There is a picture argument too. Rings on a planet, a giant and a moon were
> the same mark at the same radii, so seeing it on all three made them read as
> one body type with different fills — D76/D160's vocabulary problem arriving
> from the direction of sameness. A giant's rings are now `ringlet-system`,
> a genuinely different object; see [gaseous-bodies.md](gaseous-bodies.md).

> **TIDAL LOCKING WORKS DIFFERENTLY ON THE ICE BRANCH** (D172). The planet's
> recipe moves SEA LEVEL by bearing, which is the whole feature on a world
> whose sea is on top. Under an ice shell that is false twice: a subsurface
> ocean is sealed, with no exposed surface to evaporate from and nowhere to
> retreat to, and the shell above it is rigid — so a retreating ocean draws a
> lid spanning a void that would need pillars to hold it up.
>
> The ice branch declares `field_when` and simply omits `sea` and `snow`
> (an omitted key takes its neutral value). What carries the lock instead is
> the **shell's own thickness**: tidal flexing melts ice from beneath, so the
> shell is THINNER on the tidal axis and thicker away from it, with the ocean
> taking up the difference and the body staying round. That is the real
> mechanism, and it is the opposite sign from a retreating sea.

> `ancient-dead` removed — it's Interior heat at 0, not a trait. A dead moon is
> the common case here, so the moon archetype should roll Interior heat low by
> default.

### Stats

- **Radius:** 400–3,500 km
- **Gravity:** 0.02–0.4 g
- **Temperature:** −230 to −20 °C typical
- **Stand on it?** Yes, but you'd bounce
- **Breathe?** Almost never

### Flavour

- "Low enough gravity that a good jump could put you in orbit."
- "Ice on the outside, an ocean underneath, and nobody's been down there."
- "Cratered, cold, and quiet — but something is keeping that ocean liquid."

---

## asteroid

> A chaotic amalgam of rock, metal and void. The cutaway is the whole appeal:
> the interior is a mosaic, not neat shells.

### Standard stack

| Layer role | Frac range | Optional | Boundary | Notes |
|---|---|---|---|---|
| `dust-film` | *(a film, not a band)* | — | follows its host | scratched regolith, deposited ON the shell |
| `outer-shell` | 0.960–1.000 | — | **heavy ×1.5, faceted** | hardened crust; always the surface |
| `interior` | 0.862–0.905 | — | **heavy ×1.5, shares the shell's shape** | runs to the centre; Voronoi mosaic — no core |

> **CORRECTED IN SESSION T (D175/D176), against the original table above it.**
> The figures here are the ones the generator uses; the originals were
> `dust-film` 0.97–1.00 (70% optional), `outer-shell` 0.93–0.96 and `interior`
> 0.88–0.92, and they **composed** — so the doccheck passed on them and they
> were still wrong three ways. See
> [session-t-asteroid.md](../progress/session-t-asteroid.md).
>
> - **`interior` must carry a `frac`.** Omitting it on the strength of "runs
>   to the centre" resolved it to the shell's *outer* edge, so the shell came
>   out 0.000 thick and was dropped from the stack entirely — the built body
>   had one layer on all 200 seeds. 0.88–0.92 is where the mosaic *starts*;
>   "runs to the centre" describes the other end, which every innermost layer
>   does for free.
> - **`dust-film` is a film, not a band.** Authoring the shell below 1.0 left
>   nothing above it on the 30% of bodies with no dust, and renormalization
>   then scaled the whole stack by up to 1.075. The dust is a *coating* — the
>   moon's frosting mechanism, unchanged — so the shell reaches the surface on
>   both branches and renormalization has nothing to do.
> - **The shell was a hairline** at 0.0417 of the radius at worst, against
>   D5's legible-bands rule. The interior's range came down to buy it room;
>   the worst case over 480 bodies is now 0.0615.
> - **The boundary is faceted, not merely large.** At `extreme` amplitude the
>   silhouette swung 12% of the radius and still read as a circle, because fBm
>   is smooth by construction. What makes it an asteroid is angularity
>   (`boundaryFacet`) and lobe count (`boundaryFreq`); the interior then
>   *shares* the shell's curve so the two can never cross.

Read as elsewhere: `frac` is each layer's **outer** radius and the layer runs
inward until the next begins, so the interior's 0.88–0.92 is where the mosaic
*starts*, and it fills everything below. That gives the interior **~90% of the
radius** — correct, since the mosaic is the entire appeal of an asteroid
cutaway and the shells are thin bands around it.

The shells are thickened from the original spec so the regolith and hardened
crust read as legible bands rather than hairlines, per
[PROGRESS.md](../PROGRESS.md) D5.

**The asteroid still uses the standard layered model** — three layers, same as
everything else. What differs is that its innermost layer's *detail* is a
Voronoi mosaic rather than speckle and cells: 40–200 cells in 2–4 muted,
slightly shiny colours representing different materials, with void pockets
between.

That distinction matters for the build: `voronoi` is an ordinary entry in the
[element primitive list](../TRAIT-SYSTEM.md#element-primitives), and the
asteroid needs **no special layout path**. Cell count, cell size and void
frequency all ride the **Cohesion** parameter.

### Colour profile

2–4 material colours, all muted and desaturated but with a slight sheen.

| Layer | Saturation | Lightness |
|---|---|---|
| dust-film | 0.02–0.15 | 0.25–0.45 |
| outer-shell | 0.05–0.25 | 0.20–0.45 |
| interior cells | 0.10–0.40 | 0.20–0.60 |

Interior cells pick 2–4 hues from a narrow band around the primary — enough
variation to read as different materials, not enough to look like confetti.

### Layer details

| Layer | Elements | Count |
|---|---|---|
| dust-film | fine speckle, scratches | 400–900 / 20–50 |
| outer-shell | grain, impact pits | 300–600 / 15–40 |
| interior | **Voronoi mosaic** | 40–200 cells |
| interior | void pockets between cells | 5–25 |
| interior | metallic glints | 20–60 |

### Eligible traits

metal-rich · ice-rich · shattered ·
mineral-veins · ore-deposits · hollowed-out (artificial) · mining-station ·
docked-ships · derelict-hulk

> **`rubble-pile` and `void-riddled` fold into one axis: Cohesion** (0–100%).
> At 0 the body is a loose gravitational aggregate — many small Voronoi cells,
> large voids between them, a barely-there outer shell. At 100 it's a solid
> monolithic fragment: few large cells, minimal voids, a hard continuous shell.
>
> This is the asteroid's most characterful parameter, because it drives the
> Voronoi cell count, cell size, void frequency *and* outer-shell integrity
> together — the whole reason the asteroid cutaway exists. It deserves to be a
> slider rather than two mutually-exclusive traits.

### Stats

- **Radius:** 1–500 km
- **Gravity:** essentially none — 0.00001–0.02 g
- **Temperature:** −200 to +100 °C depending on distance from its star
- **Stand on it?** You could stand, but a firm step would launch you
- **Breathe?** No
- **Value:** the reason to visit — metals, ice, or somewhere to hide

### Flavour

- "More a flying rubble pile than a world. Plenty of places to hide inside."
- "Solid metal in places, hollow in others. Nobody has mapped it properly."
- "Gravity so weak you tether yourself to the surface to avoid drifting off."

---

## Family notes

**Shared vocabulary:** all three use `crust`, `mantle`, `core` roles and the
grain-speckle / mineral-vein / void-pocket trait family. An asteroid is
essentially a planet with the shells collapsed into one chaotic region and the
wobble turned up.

**Scale contrast:** these span 1 km to 9,800 km — four orders of magnitude. The
scale bar matters more for this family than any other.

**The most evocative outputs** in this family are usually:
- a tidally locked planet (molten face / frozen face / thin habitable band)
- an ice-shelled moon with a subsurface ocean
- a low-Cohesion asteroid with something built inside it
