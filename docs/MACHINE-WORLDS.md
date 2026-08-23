# Machine Worlds & Megastructures

Two separate things:

1. **Megastructure traits** — artificial construction attached to *natural*
   bodies. A Dyson swarm around a star, an orbital ring around a moon.
2. **The `machine-world` archetype** — a body that is artificial *all the way
   down*. Its own layer stack, its own exclusive traits, incompatible with
   natural traits.

**Body tag:** `artificial`

> **These are not a separate system.** Artificial traits use the same placement
> grammar, the same element primitives, the same Density slider and the same
> [zone primitive](TRAIT-SYSTEM.md#angular-zones) as everything natural — the
> difference is `spacing: even` and near-zero jitter, not different machinery.
> The `machine-world` archetype is an ordinary archetype with an ordinary layer
> stack. This doc is separate for readability, **not because artificial bodies
> are handled afterwards or specially.** They were swept with the same three
> tests as every other family; see
> [TRAIT-SYSTEM.md](TRAIT-SYSTEM.md#the-three-tests).

---

## Why artificial reads as artificial

Natural things are irregular; built things are regular. The generator already
has the controls to express that — it's a matter of using them differently:

| | Natural | Artificial |
|---|---|---|
| `spacing` | `random` or `clustered` | **`even`** |
| `jitter` | 0.4–0.9 | **0.0–0.2** |
| Primitives | `blob`, `vein`, `speckle` | **`plate`, `truss`, `glyph`** |
| Boundaries | wobbled | **perfect circles, straight lines** |
| Repetition | varied sizes | **identical repeated units** |
| Colour | derived from body palette | **contrasting accent hue** |

**Even spacing with near-zero jitter is the single strongest signal.** A ring of
30 identical rectangles at exactly equal angular intervals reads as built,
instantly, without any other cue.

**Colour:** megastructures should use a *contrasting accent* rather than the
body's palette — a cool metallic grey-blue against a warm planet, or a warning
amber against a cool one. They should look like they don't belong, because they
don't.

---

## Megastructure traits (on natural bodies)

All use the standard trait grammar from [TRAIT-SYSTEM.md](TRAIT-SYSTEM.md).
All are tagged `artificial` and `megastructure`.

### For stars

| Trait | Anchor / reach | Elements | Density 0.0 → 1.0 |
|---|---|---|---|
| **dyson-structure** | orbit, outward | `plate` ×3 tiers | 12 → 200 collectors, scattered to solid |
| **stellar-collector** | orbit, outward | `plate` + `truss` | 2 → 20 large extraction platforms |
| **matter-siphon** | photosphere, outward | `ribbon` + `truss` | 1 → 4 streams lifting material |
| **orbital-mirrors** | orbit, outward | `plate`, even spacing | 6 → 60 reflectors |

**`dyson-swarm` and `dyson-sphere` merged into one trait with an
`enclosure` parameter (0–100%).** The doc already noted they were mutually
exclusive, which is the axis tell — and they were never two different things,
just two points on one progression:

| Enclosure | Reads as | Mechanism |
|---|---|---|
| 0–30 | **Swarm** — scattered discrete collectors | `spacing: random`, jitter 0.8, arc partial |
| 40–70 | **Under construction** — a shell half-built | jitter falling, arc widening, ragged leading edge |
| 80–100 | **Sphere** — near-solid enclosure | `spacing: even`, jitter ~0, arc → 360° |

The middle of that range is the payoff: a **partially-built Dyson sphere** is
already listed below as one of the generator's most evocative outputs, and as
two mutually-exclusive traits it was the one thing you couldn't make.

### For planets and moons

| Trait | Anchor / reach | Elements | Density 0.0 → 1.0 |
|---|---|---|---|
| **orbital-ring** | orbit, outward | `truss` band + `plate` nodes | thin ring → ring with 20+ stations and tethers |
| **surface-city** | crust, on | `plate` clusters + light glints | few patches → planet-spanning grid |
| **underground-city** | crust/mantle, inward | `plate` + `truss` in cavities | 2 cavities → sprawling network |
| **satellite-network** | orbit, outward | `glyph` (triangles), even | 8 → 120 satellites |
| **orbital-platforms** | orbit, outward | `plate` | 2 → 30 stations |
| **starship-fleet** | orbit, outward | `glyph` (triangles), clustered | 3 → 50 ships in formation |
| **orbital-minefield** | orbit, outward | `glyph` (X marks), random | 20 → 300 mines |
| **space-elevator** | crust, outward, spanning | `truss` line + `plate` anchor | 1 → 4 tethers |
| **lagrange-colonies** | orbit, outward | `plate` clusters at fixed angles | 1 → 5 cluster sites |
| **terraforming-array** | atmosphere, on | `plate` + gradient shift | subtle → visible atmosphere change |

**surface-city** is the Coruscant/hive-world look — at high density it should
cover the entire crust layer with a fine regular grid of lit blocks. That
transition from "a few settlements" to "the whole planet is a machine" is one
of the most dramatic density responses in the generator.

**underground-city** pairs naturally with `void-pockets` — the cavities become
inhabited.

### Artificial traits respond to the body's parameters

This is what stops megastructures being a bolted-on layer. They read the same
parameters the natural body does:

| Trait | Responds to | How |
|---|---|---|
| **surface-city** | Ocean depth | Settles on land only — at high ocean depth it retreats to isolated island clusters or goes to floating platforms |
| **surface-city** | Interior heat | Avoids the most volcanic regions |
| **underground-city** | Interior heat | A molten interior means shallower cavities; a dead world allows deep ones |
| **terraforming-array** | Ocean depth, Interior heat | Implies it's *changing* them — the stats line should say toward what |
| **gas-miner-platforms** | Zones | Cluster in a calm latitude or the twilight band, not the storm |
| **hollowed-out** | Cohesion | It *is* low Cohesion, plus lining |

### Zone bias — where people build

On a body with [angular zones](TRAIT-SYSTEM.md#angular-zones), artificial traits
should declare `zoneBias`. It is the single cheapest thing that makes a
megastructure look *reasoned* rather than scattered:

- On a **tidally locked** world, everything habitable biases to `twilight` —
  the one survivable strip. `surface-city`, `underground-city` and
  `space-elevator` all belong there.
- **Industry** biases the other way: mining and power installations sit on the
  `hot` face, radiators on the `cold` face.
- Around a **binary star**, `orbital-mirrors` and collectors bias to `facing`.

A locked world with its cities crowded into the twilight ribbon and its
refineries on the burning side tells a complete story with no text at all.

### For gas giants and ice giants

| Trait | Anchor / reach | Elements | Density 0.0 → 1.0 |
|---|---|---|---|
| **gas-miner-platforms** | troposphere, on | `plate` + descending `truss` | 2 → 25 floating rigs |
| **hab-flotilla** | troposphere, on | `plate` clusters | 1 → 12 floating cities |
| **skyhook** | orbit, outward, spanning | `truss` + `plate` | 1 → 3 tethers reaching into the atmosphere |
| **orbital-cities** | orbit, outward | `plate` | 2 → 20 stations |

Floating structures sit *within* the cloud layers rather than in orbit — that
placement is what makes them read as gas-giant-specific.

### For asteroids

| Trait | Anchor / reach | Elements | Density 0.0 → 1.0 |
|---|---|---|---|
| **mining-station** | outer-shell, on | `plate` + bore shafts | 1 → 6 sites |
| **hollowed-out** | interior, on | large `void` + `plate` lining | one chamber → fully honeycombed |
| **docked-ships** | outer-shell, outward | `glyph` | 2 → 20 ships |
| **derelict-hulk** | outer-shell, on | irregular `plate` wreckage | 1 wreck → debris field |

**hollowed-out** is **not** a structural exception. It replaces interior Voronoi
cells with a large void and lines it with structure — which is the asteroid's
**Cohesion** slider driven to its low end, plus `plate` lining. The classic
hollowed-asteroid habitat comes out of a parameter that already exists.

This is the one case where an artificial trait rides a *natural* body
parameter, and it's a good sign: it means the artificial system isn't a
separate machine bolted on.

### For compact objects

| Trait | Anchor / reach | Elements | Density 0.0 → 1.0 |
|---|---|---|---|
| **research-station** | orbit, outward | `plate`, few | 1 → 6 stations at a safe distance |
| **energy-extraction-array** | accretion-disc, on | `plate` ring | 4 → 40 collectors |
| **navigation-beacon** | orbit, outward | `glyph` | 1 → 8 markers |

Anything near a compact object should be **sparse and distant** — the contrast
between a tiny fragile station and an object that would annihilate it is the
point.

### For nebulae

| Trait | Anchor / reach | Elements | Density 0.0 → 1.0 |
|---|---|---|---|
| **hidden-station** | dense-region, on | `plate` in a cavity | 1 → 5 concealed sites |
| **mining-flotilla** | dense-region, on | `plate` + `glyph` | 3 → 30 vessels |
| **derelict-fleet** | sparse-region, on | `glyph` wreckage, scattered | 5 → 60 hulks |

---

## The `machine-world` archetype

A body that is artificial throughout. Not a planet with buildings on it — a
constructed object the size of a planet.

**All natural traits are incompatible.** A machine world has no mantle to put
mineral veins in.

### Standard stack

| Layer role | Frac range | Optional | Boundary | Notes |
|---|---|---|---|---|
| `defense-grid` | 1.05–1.30 | 60% | perfect circle | orbital weapon platforms |
| `outer-hull` | 0.96–1.00 | — | **perfect circle** | armoured shell |
| *gap* | — | — | — | **hollow, pillared** |
| `surface-systems` | 0.88–0.95 | — | perfect circle | sensors, ports, radiators |
| *gap* | — | — | — | **hollow, pillared** |
| `habitation` | 0.70–0.87 | 70% | perfect circle | where anyone lives |
| *gap* | — | — | — | **hollow, pillared** |
| `machinery` | 0.35–0.69 | — | perfect circle | the bulk — engines, fabrication |
| `computation` | 0.18–0.34 | 50% | perfect circle | processing core |
| `power-core` | 0.06–0.17 | — | perfect circle | reactor |

**Every boundary is a perfect circle.** Built things don't wobble.

### Shell gaps — the nested-shell structure

**This is the machine world's defining structural feature**, and it's what
separates it from a planet with metal colours. `surface-systems`, `habitation`
and `machinery` are **hollow shells**, each floating clear of its neighbours,
connected by countless support pillars. Only `computation` and `power-core` are
solid. The body reads as a series of nested shells around a solid heart.

*Inspired by the arcade game **Rayforce** / **Layer Section**, where Earth had
been rebuilt as hollowed nested shells with access points down to deeper
levels.*

Formalized as a per-layer property rather than prose:

```js
{
  role: "habitation",
  frac: [0.70, 0.87],
  shell: true,           // hollow, not filled — draw as a band with a void inside
  gap: [0.015, 0.045],   // void thickness above AND below, as a frac of body radius
  pillars: [40, 160]     // radial supports spanning each gap
}
```

**`shell`** — the layer is a band, not a filled disc. Its details draw within
the band only.

**`gap`** — void thickness placed above *and* below the shell, rolled
independently per layer per body, so the spacing is irregular between worlds
while every individual gap stays uniform in width. Gaps are true voids: the
background shows through, which is what makes the pillars read.

**`pillars`** — radial `truss` lines spanning each gap at **even angular
spacing with near-zero jitter**. Count rides the Density slider. These are the
single strongest artificial cue in the archetype — hundreds of identical
radial supports is the density thesis and the regularity signal at once.

**Access shafts:** 2–6 wider gaps in the pillar ring, aligned across multiple
shells, read as routes to the deeper levels. Cheap to draw — omit pillars at
those angles and widen the gap — and directly evokes the inspiration.

> **Gaps interact with Hull integrity.** A breach exposes the hollow structure,
> so a damaged machine world shows cut-through shells and snapped pillars —
> a much better cutaway image than a breach into solid material.

### Colour

Metallic and cool, with a contrasting accent for active systems.

| Layer | Saturation | Lightness |
|---|---|---|
| defense-grid | 0.10–0.30 | 0.35–0.60 |
| outer-hull | 0.05–0.25 | 0.25–0.50 |
| surface-systems | 0.15–0.40 | 0.35–0.60 |
| habitation | 0.20–0.45 | 0.40–0.65 |
| machinery | 0.10–0.35 | 0.30–0.55 |
| computation | 0.35–0.70 | 0.55–0.80 |
| power-core | 0.45–0.80 | 0.85–1.00 |

The **accent hue** (for lights, active systems, the power core) should be a
strong complement to the hull hue. Grey-blue hull with amber lights, or
gunmetal with cyan — that two-tone industrial look.

### Layer details (always drawn)

| Layer | Elements | Count |
|---|---|---|
| defense-grid | `glyph` platforms, even spacing | 12–40 |
| outer-hull | **panel seams** (regular grid), plating, hull lights | 60–200 / 100–300 |
| surface-systems | radiator fins, sensor arrays, docking ports | 30–80 |
| habitation | **window-light grids**, module blocks | 200–600 |
| machinery | `truss` lattice, gear/rotor shapes, conduits | 80–250 |
| computation | **regular lattice grid**, data-flow pulses | 150–400 |
| power-core | glow stipple, containment rings | 200–350 / 4–8 |

**Panel seams and window grids are the workhorses.** Hundreds of small regular
rectangles is exactly the "cheap elements used numerously" thesis, and regularity
is what makes it read as constructed.

**Conduits** running between layers — straight lines crossing boundaries at
right angles — are a strong artificial cue and worth doing.

### Exclusive traits

Only available to `machine-world`:

| Trait | What it does |
|---|---|
| **overgrown** | Vegetation or corrosion reclaiming the outer hull |
| **weaponized** | Massive bore-hole cannon spanning several layers |
| **ancient-precursor** | Unfamiliar geometry, unreadable systems, still running |
| **worldship** | Engine cluster on one side; it's going somewhere |
| **planet-cracker** | Built around a captured natural core — a hybrid |

**planet-cracker** is the interesting hybrid case: a `machine-world` stack
wrapped around a natural `core` and `mantle`, allowing a few natural traits in
those inner layers only. It's a genuine **stack branch** — it swaps the inner
layers for natural ones — so it passes test 3 and stays structural.

### The two machine-world axes

Five former traits were mutually exclusive by nature — the tell for an axis.
They became two sliders:

**Operational status** (0–100%) — *replaces `dormant`, `hive-populated`,
`automated`*

| Value | Reads as | Drives |
|---|---|---|
| 0 | Derelict | Lights dark, power core cold and desaturated, no habitation glints, hull scarred |
| 35 | Automated | Power core lit, machinery active, **habitation layer absent or dark** — nobody home |
| 70 | Crewed | Window grids lit in patches, moderate activity |
| 100 | Hive | Habitation density maxed, window grids fully lit, swarming glyph traffic |

This is the machine world's most characterful parameter — it drives the accent
hue's brightness across every layer at once, which is exactly what makes a
derelict read as dead rather than merely dim.

**Hull integrity** (0–100%) — *replaces `damaged`, `partial-construction`*

Both removed an angular section of the outer layers; they differ only in
*why*. One parameter for how much is missing, plus a flag for the reason:

| Value | Reads as |
|---|---|
| 100 | Intact — unbroken hull |
| 60 | A breach exposing two or three interior layers |
| 20 | Major structural loss, most of the interior visible |

`construction: true` swaps torn edges for clean ones with scaffolding `truss`
work — an unfinished world rather than a wrecked one. Same geometry, different
edge treatment and a different stats line.

Both use the **zone primitive with `remove: true`** — the same machinery as
`shattered`, not a new exception. See
[TRAIT-SYSTEM.md](TRAIT-SYSTEM.md#angular-zones).

### Stats template

Machine worlds need their own template entirely.

```
Size                  {km} across — {comparison}
Construction          {estimated age / who built it, if known}
Power output          {n} — {comparison, e.g. "more than a small star"}
Population            {n} / unknown / none
Status                {active / dormant / derelict / hostile}
Hull integrity        {n}% — {what's breached}
Docking               {possible? where? guarded?}
Biggest danger        {hazard}
```

### Flavour

- "It's the size of a moon and every square metre of it was built by someone."
- "Nothing is answering hails, but the power core is still running."
- "The outer hull is scarred from something that happened a long time ago."
- "There are lights on in about a third of the habitation ring. Somebody's home."

---

## Design notes

**The artificial/natural contrast is the value.** A Dyson swarm is striking
*because* it's regular geometry against an organic star. Keep megastructures
visually distinct rather than blending them into the palette.

**Density does the heavy lifting.** The same trait spanning "2 platforms" to "30
platforms with connecting trusses" covers everything from a frontier outpost to
a full Kardashev-scale civilization. That range is a lot of storytelling from
one slider.

**Restraint at low density.** A single station orbiting a gas giant is often a
better story hook than a hundred. The low end of the density range should be
genuinely sparse.

**Most evocative outputs:**
- a main star half-enclosed by a partially-built Dyson sphere — *Enclosure ~50,
  which the old swarm/sphere split couldn't express at all*
- a planet with a full surface-city grid and an orbital ring
- a machine world at Operational status 0 with a breached hull, the dark layers
  visible through the tear
- a hollowed asteroid with ships docked at the entrance
- a tidally locked world with its cities crowded into the twilight ribbon and
  its refineries on the burning face
