# Trait System

*The placement grammar. Defined once here; the celestial catalog references it
rather than re-explaining it per trait.*

---

## What a trait is

A **trait** is an optional addon visual element attached to a specific layer of a
celestial body. Traits are what make one planet different from another.

The critical distinction:

|  | **Layer detail** | **Trait** |
|---|---|---|
| Presence | Always drawn — standard equipment | Optional, rolled or chosen |
| Examples | Convection cells in a convective zone, grain speckle in a crust, cloud banding in a gas envelope | Mineral veins, void pockets, debris fields, rings, megastructures |
| Meaning | "This is what this layer *is*" | "This is what makes this body *specific*" |

If a layer would look wrong without it, it's a detail. If it's an addition
that some bodies have and others don't, it's a trait.

> **Note:** v2 conflated these. Mineral veins, void pockets and debris chunks
> were treated as inherent layer texture; they are traits.

---

## The placement grammar

Every trait is described by the same set of fields. This is the whole system —
if a trait can't be expressed here, the grammar needs extending, and that's a
deliberate decision rather than a special case.

```js
{
  id: "mineral-veins",
  label: "Mineral Veins",

  // ---- WHERE ----
  anchor:   "mantle",        // layer role it attaches to
  reach:    "on",            // "on" | "inward" | "outward" | "spanning"
  depth:    [0.0, 1.0],      // how far across the anchor layer's thickness

  // ---- ANGULAR PLACEMENT ----
  arc:      [0, 360],        // degrees of the layer it covers
  repeat:   [3, 9],          // how many separate instances
  spacing:  "even",          // "even" | "random" | "clustered"
  jitter:   0.3,             // 0..1 randomness applied to spacing
  mirror:   false,           // duplicate mirrored across the vertical axis
  offset:   [0, 360],        // rotation applied to the whole set

  // ---- APPEARANCE ----
  element:  "vein",          // which drawing primitive
  bulk:     6.5,             // optional: ask for the primitive's HEAVY form
  chaos:    0.5,             // optional: +-50% per-instance size/shape scatter
  tiers:    3,               // size tiers (few big, more medium, many small)
  density:  { min: 4, max: 40 },  // instance count at slider 0.0 .. 1.0

  // ---- ZONES (optional) ----
  zoneBias: null,            // cluster instances into a named zone, if any

  // ---- RULES ----
  requires: ["solid-interior"],   // tags the body must have
  excludes: ["shattered"],        // traits it can't coexist with
  tags:     ["natural", "resource"]
}
```

A second, smaller shape exists for traits that don't draw anything themselves
but **divide layers into angular zones**. See [Angular zones](#angular-zones)
below.

### Field reference

**`anchor`** — the layer role the trait belongs to. Traits are always
layer-relative, never absolute, so they work regardless of how thick that
layer happened to roll.

Two reserved tokens: **`"surface"`** means whatever the outermost real layer
turned out to be (the same token `gen/structure.js` uses in `over:`), so a
trait works on a desert world and an ocean world alike; **`"orbit"`** places
the trait *beyond* the body, where `depth` is read as a multiple of the body
radius rather than as a fraction of a layer's thickness.

**`reach`** — the trait's relationship to its anchor layer:

| Value | Meaning | Example |
|---|---|---|
| `on` | Lives within the layer's band | Mineral veins in a mantle |
| `inward` | Starts at the layer and extends toward the core | A metallic intrusion |
| `outward` | Starts at the layer and extends toward space | Volcanic plumes, flares |
| `spanning` | Crosses several layers | A deep rift, a bore shaft |

**`depth`** — normalized position across the anchor's thickness. `0.0` = inner
edge, `1.0` = outer edge. A range means the trait occupies that span.

**`arc`** — angular coverage in degrees. `[0, 360]` wraps entirely; `[0, 120]`
covers a third. Where the arc *sits* is set by `offset`.

**`repeat` / `spacing` / `jitter`** — how many instances and how they're
distributed. `even` spacing with low jitter reads as regular and structured
(rings, orbital platforms); `clustered` with high jitter reads as natural
(debris, deposits).

**`mirror`** — duplicates the set on the **opposite side of the body**
(`angle + 180`). For symmetric features that want one instance at each pole.

> Read literally as a *reflection* (`angle → −angle`) this fails in exactly the
> case it exists for: a cap pinned at 0° reflects to −0°, so both caps land on
> the north pole and the south stays bare. For an equatorial trait the two
> readings agree; for a polar one only the opposite-side reading works. See
> [PROGRESS.md](PROGRESS.md) D26.

**`offset`** — rotation applied to the whole trait after placement.

**`bulk`** — optional. Asks the primitive for its **heavy form**, where it has
one, and carries the width multiplier. Only `vein` implements it today: it
switches from a stroked hairline to a filled, tapering, nodular *lode* with a
darker contour.

> **Shape irregularity is a matter of frequency, not amplitude.** A lode's
> pinch-and-swell is driven by its **aspect ratio** — length over width — so a
> long seam ripples many times and a short one twice. Authored as a fixed
> frequency it gave every vein the same ~1.2 cycles regardless of length: one
> belly, one neck, one blunt end, which reads as a bottle. If a generated shape
> looks like an *object* rather than a length of material, check how many
> cycles of variation it has before reaching for the amplitude. See D61.

> **Why this exists, and the rule it encodes.** Mineral Veins were drawn as thin
> pale strokes in a mantle that already carries up to ~600 thin pale strokes of
> its own — convection cells, flow arrows, flow lines — and the trait was simply
> lost among them. Brightening them or adding more could not have fixed it,
> because the problem was never contrast.
>
> **A trait has to read as a different *kind* of mark, not a louder example of
> the same one.** A filled shape against strokes, or a two-tone body against
> single-tone lines, separates instantly; the same mark in a brighter colour
> does not. When a new trait lands in a busy layer, check what vocabulary that
> layer already uses and pick a different one.
>
> It rides on the recipe rather than on the layer, because whether a vein is a
> hairline fracture or a fat ore seam is a fact about the **element**, not about
> where it landed — crust fractures use the same `vein` primitive and must stay
> hairlines. See [PROGRESS.md](PROGRESS.md) D60.

**`chaos`** — optional per-instance scatter on size and shape, on top of the
tier system. `0.5` means each instance's length and girth vary by up to ±50%
of its tier's figure, **independently of each other**, plus some variation in
branch count where the primitive has branches.

> The independence is the point. Scaling length and girth *together* just gives
> the same shape at another size, which is what `tiers` already does. Scattering
> them separately produces short fat instances and long thin ones, which is what
> makes a set of marks look grown rather than placed. See D62.

**`tiers`** — draw the instances in this many size classes: a few large, more
medium, many small. **This single field is most of what makes output look
intricate rather than sparse.**

**`density`** — instance count mapped from the global Density slider (0.0–1.0).
Every trait interprets the slider in its own terms; see below.

**`zoneBias`** — if the body has angular zones and this is set to a zone id, the
trait's instances cluster into that zone instead of spreading across the full
`arc`. A tidally locked machine world puts its cities in the twilight band by
declaring `zoneBias: "twilight"`. Null on most traits.

---

## Orientation convention

**The body is generated pointing "up", then rotated as a final step.**

- During generation, 0° = north pole (top), 180° = south pole (bottom).
- Polar traits (ice caps) sit near 0° and 180°. Equatorial traits (rings,
  banding) sit near 90° and 270°.
- After all layers and traits are placed, a single global rotation is applied.
- **User setting:** "Keep upright" disables that rotation, so poles stay at top
  and bottom.

This is why the cutaway commits to being a **polar slice** — it's what makes
ice caps and tidal locking legible.

---

## The Density slider

One global slider, `0.0`–`1.0`, labelled something like **Detail Density**.
Every trait and every layer detail responds to it *in its own terms* — there is
no single global multiplier.

| Trait | 0.0 | 1.0 |
|---|---|---|
| Mineral veins | 4 thin veins | 40 veins, branching, 3 tiers |
| Stellar flares | 3 small | 30 across 3 size tiers |
| Debris field | sparse specks | dense band, many sizes |
| Orbital platforms | 2 stations | 30 platforms + connecting lines |
| Ring system | 1 faint band | 8 bands with gaps and shepherd structure |

Some traits respond by **count**, others by **extent**, others by **complexity**.
That's intentional — the slider means "how much is going on here", not
"multiply everything by N".

---

## Trait compatibility

Traits declare `requires` and `excludes` against **body tags** and other traits.

Body tags are set by the archetype: `solid-surface`, `solid-interior`,
`gaseous`, `stellar`, `compact`, `diffuse`, `has-atmosphere`, `luminous`,
`artificial`.

```js
requires: ["solid-surface", "has-atmosphere"]   // needs both
excludes: ["shattered"]                         // can't coexist
```

**In the UI:** the trait picker only shows traits compatible with the current
body and already-selected traits. Incompatible ones are hidden, not greyed —
a long list of unavailable options is noise.

**When rolling randomly:** pick from the compatible set, then re-filter after
each pick, since selecting one trait can exclude others.

---

## Angular zones

**The primitive that replaces most structural exceptions.** A zone modifier
divides a layer band into angular sectors, each with its own colour shift and
detail treatment. Tidal locking is the headline case, but the same mechanism
covers polar vortices, binary-companion heating, axial tilt, and shattering.

The rule: **zones perturb, they don't replace.** A zone never names an absolute
colour — it declares a delta against whatever the layer already rolled. That's
what makes one recipe work on a rocky planet, a gas giant, and a star alike. A
blue world's hot face is a hot *blue*.

### The zone shape

```js
{
  id: "tidally-locked",
  label: "Tidally Locked",
  kind: "modifier",                    // draws nothing itself; modifies layers
  anchor: ["atmosphere", "ocean", "crust", "surface"],
  axis:   "equatorial",                // "equatorial" | "polar"
  falloff: "outward",                  // zone strength ramps out with depth

  zones: [
    { id: "cold",     arc: 140, colorShift: { hue: +25, sat: -0.2, val: -0.35 },
      details: ["ice-sheet", "fracture-net"] },
    { id: "twilight", arc:  80, colorShift: { hue:  +5, sat: +0.1, val: +0.05 },
      details: ["liquid-band", "cloud-wisp"] },
    { id: "hot",      arc: 140, colorShift: { hue: -30, sat: +0.3, val: +0.40 },
      details: ["molten-crack", "glow-stipple"] }
  ],
  blend:  0.25,       // fraction of each boundary that cross-fades
  offset: 90,         // where the hot face points; rolled per body
  intensity: 1.0      // 0 = unzoned, 1 = full recipe. The user-facing dial.
}
```

### Field reference

**`kind: "modifier"`** — marks this as a trait that changes layers rather than
adding elements. Modifiers run in the structure stage, before colour.

**`anchor`** — a *list* here, not a single layer. Zones typically apply to
several surface-adjacent layers at once.

**`axis`** — `equatorial` zones are sectors around the body (tidal locking,
binary heating). `polar` zones are latitude bands (polar vortex, calm
latitudes). Same machinery, different starting angle.

**`falloff`** — how zone strength decays with depth. `outward` means the
outermost anchored layer gets full strength and deeper ones get progressively
less, reaching zero below the anchor list. This replaces a hard "interior layers
are unaffected" rule: a deeply zoned world with a subtly asymmetric mantle is
more interesting than one where the effect stops dead at the crust, and tidal
heating makes it defensible.

**`zones[].arc`** — degrees of the body each zone covers. Must sum to 360.
**This is where partial locking comes from** — see below.

**`zones[].colorShift`** — HSV deltas applied to the layer's rolled colour.
Hue in degrees, sat/val in −1..+1.

**`zones[].details`** — layer details drawn only inside this zone, replacing or
supplementing the layer's standard details.

**`blend`** — the fraction of each zone boundary that cross-fades into its
neighbour. **Not optional.** A hard colour step at a zone edge reads as a
rendering bug, not a terminator. ~0.25 is the working default.

**`offset`** — rotation of the whole zone set, i.e. where the hot face points.
Roll this per body; otherwise every locked world renders identically oriented.
Zones are placed in generation space and rotate with the final global rotation,
which is correct.

**`intensity`** — the single continuous dial, `0.0`–`1.0`, interpolating the
zone arcs between "unzoned" and the authored recipe. This is the only zone
field the user ever touches.

### Partial locking falls out of `arc`

There is no separate "partially locked" trait. Interpolating the twilight arc
*is* the parameter:

| Twilight arc | Reads as |
|---|---|
| 340° | Effectively unzoned — a faint warm side |
| 240° | 3:2 resonance (Mercury-like) — a warm side and a cool side, no extremes |
| 160° | Slow libration — wide habitable ribbon, small extremes |
| 80° | Full lock — the classic three-zone world |
| 40° | Razor terminator — brutal, cinematic |

One slider, continuous, no new machinery. The extreme zones absorb whatever the
twilight band gives up.

### What zones cover

| Trait | Axis | What the zones do |
|---|---|---|
| **Tidally locked** | equatorial | Hot / twilight / cold faces |
| **Binary companion** | equatorial | Tidal bulge + brighter granulation facing the companion |
| **Polar vortex** | polar | A distinct circulation cap at one or both poles |
| **Calm latitude** | polar | A quiet band amid violent banding |
| **Tilted axis** | polar | Zones offset from the poles, so seasons read asymmetrically |
| **Shattered** | equatorial | A zone with `remove: true` — an angular wedge deleted from the outer layers, exposing what's beneath; pairs with a debris trait |

`remove: true` is the one zone flag that subtracts rather than shifts. It is how
shattering stops being a hand-written exception.

### Implementation note

**As built** (`js/gen/zones.js`). The shared helper was planned as
`zoneAt(angle, depth) → {zone, strength, blend}`; what shipped is a small set
of purpose-specific functions on one zone object, because the three consumers
want genuinely different answers:

```js
zones.shiftAt(angle, role, baseV) → {h, s, v}   // an HSV DELTA, never a colour
zones.reliefAt(angle)             → multiplier  // terrain amplitude
zones.frostAt(angle, keys, out)   → multipliers // one per frosting zone
zones.at(angle)                   → {id, weight, index}
zones.weightOf(id, angle)         → 0..1        // for `zoneBias`
```

**Zones resolve in the GENERATION stage, not at draw time.** `gen/details.js`
already assigns every element an angle, so membership is resolved there and the
resulting delta is carried on the element. Two consumers must still ask at draw
time — the frosting walks its own circumference, and the layer band is painted
per wedge — so the rule is stated as: **`gen/zones.js` owns all zone logic, and
`draw/` may call it but contains none of it.** No zone ids, arcs, colour deltas
or blend maths appear anywhere in `draw/`; it receives numbers. See
[PROGRESS.md](PROGRESS.md) D23.

**A zone's value delta is limited by the room the layer has.** An authored
`val: −0.30` on a crust that rolled v=0.25 gives a near-black hemisphere, so
deltas are eased into the available headroom with a soft knee applied across
the whole range. The knee must be continuous — applying it only past the limit
puts a 37% step at one angle, which is a visible seam (D24).

**The cross-fade is asserted, not assumed.** `test/sweep.mjs` bounds the
maximum per-degree change in the delta at 0.05; the shipped worst case is
0.023. A smoothness requirement is a number, so it belongs in a test.

### Stats are zone-aware

A zoned body doesn't have one surface temperature, it has three. The stats card
should say so — and this is squarely the layperson framing the project wants:

```
Surface temperature   Dayside 430 °C · Nightside −170 °C
                      A habitable ribbon between them
```

---

## Remaining structural traits

**None on natural bodies.** The review resolved every one of them — the category
is empty except for zone modifiers and one machine-world case.

| Former trait | Resolution |
|---|---|
| **Tidally locked** | → an **axis**, `archetype.axes.tidalLock`, using the [zone primitive](#angular-zones). Not a trait: it changes values, not the stack (D27) |
| **Ice caps** | **Cut.** They emerge from the frosting's snow zone on a locked world's cold face — deposition already answers the question a drawn wedge was answering (D27) |
| **Shattered** | → a zone with `remove: true` |
| **Ocean world** | → **Ocean depth** parameter; survives as a preset |
| **Hollow core** | **Cut.** Not believable at planetary scale — gravity collapses voids, and rock has nowhere near the compressive strength. It also *subtracts* detail from the most interesting part of the cutaway, fighting the density thesis. Retained only for [machine worlds](MACHINE-WORLDS.md), where an engineered hollow interior is a deliberate statement and can be filled with structure |
| **Twin core** | **Cut.** A merged body's cores would coalesce long before anyone drew the cutaway; "mid-merge" doesn't survive scrutiny on a single settled celestial |
| **Ancient dead / Volcanic** | → the two ends of the **Interior heat** parameter |

The general rule this establishes:

> **Before adding a structural exception, check whether it's a parameter at an
> extreme value, or an instance of an existing primitive.** It almost always is.
> Exceptions don't combine — parameters do. Two exceptions can conflict; two
> slider positions never can.

### The three tests

Applied to every archetype in the catalog; they removed about twenty entries
from the trait lists.

**1. Does it need to exclude a sibling?** Then it's an **axis in disguise**.
`feeding`/`dormant`, `rubble-pile`/`void-riddled`, `oversized-core`/`coreless`,
`emission`/`reflection`/`dark`, `dyson-swarm`/`dyson-sphere`,
`dormant`/`automated`/`hive-populated` — each pair or set was mutually exclusive
by nature, which is the tell. As axes, the values *between* the named extremes
become reachable, which is usually where the better output lives. The Dyson case
is the clearest proof: a **half-built sphere** was already listed as one of the
generator's most evocative outputs, and the two-trait split made it the one
thing you couldn't build.

**2. Is it visible in the cutaway?** If not, it's **stats or flavour text**, not
a trait. `long-lived`, `habitable-zone-close`, `tidally-locked-planets` and
`planetary-system` are facts about a star's *system*, invisible in a
cross-section of the star itself. `pirate-haven` and `sensor-shadow` draw
nothing a `hidden-station` doesn't already draw — they're story labels for the
same picture. This is the project's own rule — *if a quirk isn't visible at a
glance, it isn't a trait* — and it was being broken.

**3. Does the layer stack differ, or only the values in it?** Only a genuinely
different stack earns a structural branch. Two passed: the **ice-shelled moon**
(ocean below the crust, not above) and the **shell nebula** used by planetary
nebulae and supernova remnants (empty in the middle, inverting the
density-rises-inward assumption). Everything else was values.

> **This document failed its own third test, and it is worth recording where.**
> `tidally-locked` was listed as a trait — and as the headline case for the
> whole zone mechanism — but tidal locking changes only *values* in the stack:
> sea level, terrain amplitude, where snow deposits, how thick the air is. The
> stack itself is identical. By this test it was always an **axis**, like Ocean
> depth and Interior heat, and it shipped as a trait for a whole phase before
> anyone applied the test to it.
>
> `ice-caps` failed for a different reason: it was a *drawn* answer to a
> question deposition already answers. A cap that emerges from the frosting
> pools in valleys, thins on ridges and stops where the frosting stops; a
> `wedge` could only ever be a polygon laid on top of the terrain, and needed
> clipping, repositioning and a tier-size exemption to sit there at all.
>
> Both are now gone. See [PROGRESS.md](PROGRESS.md) D27, and the lesson that
> generalises: **run the three tests against the catalogue, not only against
> new proposals.**

Anything surviving all three tests is a real trait.

The one structural branch that survives on natural bodies is the **ice-shelled
moon**, and only because its ocean sits *below* the crust — a genuine stack
inversion that no thickness value can express. See
[solid-bodies.md](celestials/solid-bodies.md#ice-shelled-moon).

---

## Element primitives

The drawing vocabulary traits can call on. Keeping this list small and reusable
is what stops each trait needing its own renderer.

`✅` built · `⬜` planned, with the phase that adds it.

| Primitive | Looks like | Used by | |
|---|---|---|---|
| `vein` | Branching line, tapering | Mineral veins, fractures, rifts | ✅ |
| `blob` | Irregular filled shape | Deposits, pockets, storms | ✅ |
| `speckle` | Scattered dots | Grain, dust, debris | ✅ |
| `voronoi` | Cell mosaic | Asteroid interiors, ice shells | ✅ |
| `arc-band` | Angular band along a layer | Oceans, ice caps, cloud belts | ✅ |
| `wedge` | Tapering polar shape | Ice caps, impact basins, missing sections | ✅ |
| `ribbon` | Tapered curved loop | Flares, prominences, jets | ⬜ P6 |
| `arrow` | Directional indicator | Convection, flow direction | ✅ |
| `flow-line` | Curved motion line, no head | Subtle circulation | ✅ |
| `ring-band` | Concentric elliptical band | Ring systems | ✅ |
| `chunk` | Small angular polygon | Debris, asteroids | ✅ |
| `plate` | Rectangle, rotatable | Platforms, hab modules, city blocks | ⬜ P9 |
| `truss` | Thin connecting line | Orbital rings, structure spans | ⬜ P9 |
| `glyph` | Triangle / X / small marker | Ships, satellites, minefields | ⬜ P9 |
| `gradient-band` | Soft colour transition | Atmospheres, halos | ✅ |

`ring-band` is drawn as a **flattened ellipse**, not a circle: seen from the
cutaway's viewpoint a ring is near edge-on, and a perfect circle reads as a
halo rather than as a disc of orbiting material. The squash is fixed rather
than rolled, so every ring in a system shares one orbital plane — which is most
of what makes them read as a system. Outward traits are drawn in two passes,
behind the body and in front of it, which is what makes them read as orbiting
rather than as a decal.

Megastructure traits use `plate`, `truss`, `glyph`, and `chunk` — the same
primitives, arranged with `even` spacing and low jitter, which is what makes
them read as artificial rather than natural.

---

## Worked examples

### Ring system
```js
{
  id: "ring-system", label: "Ring System",
  anchor: "orbit", reach: "outward", depth: [1.4, 2.2],
  arc: [0, 360], repeat: [3, 8], spacing: "even", jitter: 0.15,
  mirror: false, offset: [0, 360],
  element: "ring-band", tiers: 2,
  density: { min: 1, max: 8 },
  requires: [], excludes: ["shattered"],
  tags: ["natural", "orbital"]
}
```

### Impact basin

**As shipped** — see `js/data/traits.js`. The `wedge` case, and deliberately a
handful of large features rather than a dense field, so the grammar is shown
covering both ends of its range.

`repeat: [1, 5]` with `spacing: "random"` rolls a uniform count between one and
five basins and scatters each independently — no distance enforcement, so
basins are free to overlap. That reads as one messier excavation rather than
as a bug, and keeping the placement dumb is worth more than the variety a
repulsion pass would add.

```js
{
  id: "impact-basin", label: "Impact Basin",
  anchor: "crust", reach: "on", depth: [0.18, 1.0],
  arc: [42, 78],           // the FULL span, not a half-angle
  repeat: [1, 5], spacing: "random",
  mirror: false, offset: [0, 360],
  element: "wedge", tiers: 1,
  alpha: [0.78, 0.95],
  density: { min: 1, max: 1 },
  tone: "darker",
  cutsFrosting: true,
  floor: 0.88,
  requires: ["solid-surface"], excludes: [],
  tags: ["damage"]
}
```

Two details that are load-bearing rather than fussy, both of which drew a
correct-but-invisible feature first (see [PROGRESS.md](PROGRESS.md) D26):

- **`arc` is the full span**, so the `wedge` primitive takes half of it.
- **`tiers: 1`, and a wedge ignores the tier size multiplier.** At one tier
  `tierSplit` returns the *smallest* class (0.14x), which shrinks a 46-degree
  feature to a 6-degree sliver. Tier sizes exist for fields of instances; a
  named single feature takes its extent as authored.

> **`ice-caps` used to be the worked example here and is now cut.** It needed
> all of the above *plus* repositioning to the true surface and drawing at step
> 4 of the scene order, because a cap anchored to the crust is painted over by
> the sea. All of that machinery existed only because a drawn wedge is not
> really lying on the ground. Caps now emerge from the frosting instead
> ([PROGRESS.md](PROGRESS.md) D27), which is both less code and a better
> picture.

### Dyson structure

Note `enclosure` — the parameter that replaced the old `dyson-swarm` /
`dyson-sphere` pair. `spacing`, `jitter` and `arc` are **derived from it**
rather than fixed, so one trait spans scattered swarm → half-built shell →
full sphere.

```js
{
  id: "dyson-structure", label: "Dyson Structure",
  anchor: "orbit", reach: "outward", depth: [1.6, 2.4],
  arc: [0, 360], repeat: [12, 200],
  spacing: "random",   // → "even" as enclosure rises
  jitter: 0.8,         // → ~0 as enclosure rises
  mirror: false, offset: [0, 360],
  element: "plate", tiers: 3,
  density: { min: 12, max: 200 },
  enclosure: 0.5,      // 0 = swarm, 0.5 = half-built, 1.0 = solid sphere
  requires: ["stellar"], excludes: [],
  tags: ["artificial", "megastructure"]
}
```

### Stellar prominences
```js
{
  id: "prominences", label: "Prominences",
  anchor: "photosphere", reach: "outward", depth: [1.0, 1.6],
  arc: [0, 360], repeat: [3, 30], spacing: "random", jitter: 0.9,
  mirror: false, offset: [0, 360],
  element: "ribbon", tiers: 3,
  density: { min: 3, max: 30 },
  requires: ["stellar"], excludes: [],
  tags: ["natural", "stellar-activity"]
}
```

---

## Open items

- **How many traits per body?** Suggest 1–3, weighted toward 2. Structural
  traits and zone modifiers should count double against the budget since they
  change so much.
- **Should traits have intensity independent of the global slider?** **Answered:
  no in general, yes for zone modifiers.** Ordinary traits read the one global
  Density slider and interpret it in their own terms. Zone modifiers get a
  single `intensity` dial each, because "how locked is it" is a genuinely
  different question from "how much detail is there".
- **Trait-on-trait interaction** — partly solved by `zoneBias`: a trait can
  declare which zone its instances cluster into, so a locked machine world puts
  its cities in the twilight band. The remaining case is traits *spawning* other
  traits (shattered producing a debris ring). Nice-to-have, not MVP.
- **Do the remaining structural traits survive?** **Resolved.** Hollow core and
  twin core are cut; ocean world became a parameter. The natural-body exception
  list is empty — see above.
- **Should `oversized-core` / `coreless` fold into Core size bias?** Same
  pattern: two traits that look like the ends of one axis. Likely yes.
