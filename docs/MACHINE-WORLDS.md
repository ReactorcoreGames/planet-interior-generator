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
| Primitives | `blob`, `vein`, `speckle` | **`truss`, `glyph`, `fixture`, `cellgrid`**, `texture` materials (as built, D253–D259) |
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

*As built (Session Z, D248–D250); the figures are `js/data/archetypes/machine-world.js`.*

| Layer role | Frac range | Present | Boundary | Notes |
|---|---|---|---|---|
| `defense-grid` | over the surface, 0.10–0.26 deep | 80% | perfect circle | outward haze carrying the weapon platforms |
| `outer-hull` | 1.000 | always | **perfect circle** | armoured shell |
| *void* | `gapBelow` 0.026–0.046 | — | — | **hollow, pillared** — the hull has its own void |
| `surface-systems` | 0.900–0.935 | always | perfect circle | radiator hall |
| *void* | `gapBelow` 0.026–0.046 | — | — | **hollow, pillared** |
| `habitation` | 0.740–0.815 | 93% | perfect circle | where anyone lives |
| *void* | `gapBelow` 0.028–0.050 | — | — | **hollow, pillared** |
| `machinery` | 0.585–0.665; 0.680–0.730 with no habitation | always | perfect circle | the bulk — plant, engines, fabrication |
| *void* | `gapBelow` 0.030–0.055 | — | — | **hollow, pillared**, bridged by the board's conduits |
| `computation` | 0.300–0.400 | 67% | perfect circle | the circuit board, solid |
| `power-core` | 0.110–0.190; 0.230–0.290 with no computation | always | perfect circle | the reactor, solid |

`frac_when` moves the stack when an optional layer is absent (D250), so a missing habitation or computation core does not leave one plain band where the spec has two. "Present" is the roll, scaled by Optional layers.

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

Formalized as general layer properties (**as built, Session Z, D248**; the original `shell` + `gap` above-and-below double-counted wherever two shells met). Four layers carry a void: the outer hull, surface-systems, habitation and machinery; the board and the reactor are solid:

```js
{
  role: "habitation",
  frac: [0.740, 0.815],
  gapBelow: [0.028, 0.050], // a true void under this layer, as a frac of body radius
  pillars: [80, 200],       // supports across it, at Detail density 0 and 1
  shafted: true             // the archetype's access shafts cut through it
}
```

**`gapBelow`** — the void is raised out of the bottom of the layer, after renormalization, and rolled from the layer's own stream, so spacing varies between worlds while each gap stays uniform. A layer with a void under it is drawn as a ring: the background shows through, which is what makes the pillars read.

**`pillars`** — radial `truss` struts across the void at **even angular spacing with near-zero jitter**, in two tiers (every fourth a braced girder). Count rides Detail density and scales with radius so every void keeps the same spacing.

**Access shafts** — `shafts: { count: [2, 6], width }` on the archetype: shared bearings cut as slots through every `shafted` layer, outer hull included, so each reads as one route from space down to the solid heart. No pillars stand in a shaft. The user wants doors and shutters on them later, as traits, and the shaft's own back wall lit with signal lights.

> **Gaps interact with Hull integrity** (built, D267–D269). A wound cuts
> through the shells and their voids alike, and its torn edge shows snapped
> pillar stubs hanging from each void's ceiling and standing on the ledge of
> floor the next step leaves.

### Colour

Metallic and cool, with a contrasting accent for active systems.

*As built (D252, D254): metallic, low chroma on every built layer.*

| Layer | Saturation | Lightness | Also |
|---|---|---|---|
| defense-grid | 0.06–0.20 | 0.35–0.55 | |
| outer-hull | 0.03–0.10 | 0.34–0.48 | |
| surface-systems | 0.06–0.16 | 0.44–0.58 | |
| habitation | 0.08–0.20 | 0.60–0.76 | `sheen` 1.0 |
| machinery | 0.05–0.14 | 0.30–0.44 | `sheen` 0.35 |
| computation | 0.22–0.42 | 0.40–0.56 | self-lit, `accentHue` 0.85, `heatValue` [0.45, 1.0, 0.45] |
| power-core | 0.55–0.85 | 0.90–1.00 | self-lit, `accentHue` 1.0, `heatValue` [0.28, 1.0, 0.50] |

Every layer above the board is `heatDriven: false`, so Operational status cannot creep colour into the metal. The hull hue is rolled from four families with one draw: steel 198–228° (45%), teal-steel 168–198° (15%), bronze 24–46° (25%), violet-steel 232–262° (15%).

The **accent hue** (`accent`, js/gen/accent.js) sits 150–210° from the hull hue, saturated and bright: every light on the body, the board and the reactor. Lights come in three colours from one rule (`CC.ShellWallDraw.lightHsv`): mostly the accent, some cold white, a few warning amber (red where the accent is near amber), plus the emergency red of a body on emergency power.

### Layer details (always drawn)

*As built (D251–D263); the recipes are `js/data/elements/machine.js`, the counts there.*

| Layer | Elements |
|---|---|
| defense-grid | `glyph` weapon platforms, one design per body, even spacing, 12–40 |
| outer-hull | `rough` armour texture; **panel seams** in a brick bond with running lights (`cellgrid`); docking ports cut into the outer face, 8–18 even; sensor arrays standing out from it into space, 30–70 |
| surface-systems | brushed `metal`; radiator banks in two mirrored rows, one on the floor and one hung from the ceiling, 70–160 a row |
| habitation | `sleek` polished metal; quiet hex panelling |
| machinery | `plant` concrete with radial pipe bundles; tall lit chips among the pipes; rotors, gear trains and trusses in what the pipes leave (`CC.Claims`) |
| computation | `circuit` board; data pulses along its own traces, 120–360; bold conduits lying across it and bridging the void above into the machinery; capacitors |
| power-core | **window blocks** round a bright bare heart; containment rings, 4–8; glow stipple, 500–1200; feeds down the gaps between the blocks, 6–18 |
| every void and shaft | lit back walls: ribs, deck lines, facility lights; shafts with rails, rungs and signal lights |

**Panel seams, window grids and chips are the workhorses.** Hundreds of small regular rectangles is exactly the "cheap elements used numerously" thesis, and regularity is what makes it read as constructed.

**Conduits** were first built across every boundary and rejected as spam (D262): a strong cue earns its strength by being rare and placed. They are the reactor's feeds and the board's runs and bridges alone.

### Exclusive traits

Only available to `machine-world`. *As built (D272–D277): six traits, each switching on a general structure feature through `sets` (D272) — a trait carries structure data the way an archetype does, merged over the archetype's own, so the feature lives in `js/gen/` and is not tied to a trait id. Every one is gated by the two dials: Operational status lights or darkens it, Hull integrity cuts it.*

| Trait | `sets` | What it draws |
|---|---|---|
| **under-construction** | `rupture.edge: "clean"` | The wounds Hull integrity cuts become the parts not built yet: clean faces, scaffolding and cranes, welding lights gated by Operational status (D273, `js/gen/woundclean.js`). At 92% or more there is nothing left to build |
| **blast-doors** | `shafts.doors` | An airlock pair where each shaft crosses a shell, open or shut by Operational status (D274, `js/gen/shaftdoors.js`) |
| **shaft-covers** | `shafts.covers` | A silo cover over each shaft's mouth, sliding aside into the hull (D274) |
| **overgrown** | `overgrowth` | Moss or a rust bloom over the hull, down the shafts, hung in the outer void and pooled in the wounds; Detail density sets the cover, Operational status only its colour, withering as the world goes dark (D275, `js/gen/overgrowth.js`) |
| **weaponized** | `bore` | One bore-cannon barrel from a breech at the heart out through every shell, ringed with accelerator coils, its muzzle crown past the surface; charged, dim red on emergency power, or cold (D276, `js/gen/bore.js`) |
| **worldship** | `engines` | A cluster of drive bells on one bearing, aft of any bore, a thrust frame into the shells and a plume; firing, glowing, or cold by Operational status (D277, `js/gen/engines.js`) |

**Cut: ancient-precursor.** It fails TRAIT-SYSTEM.md's test 2 as a mark and test 3 as a stack: "unfamiliar geometry" would be a re-skin of every element, a second art style, and "still running" is a position on Operational status. It lives in the card's Construction row and the flavour pool instead, its age read from what is drawn — an overgrown hull on a dark or withered world is ancient.

**Removed: planet-cracker**, by the user ("the other 6 traits are enough"). It would have been the first trait to swap a stack, needing a new presence form.

### The two machine-world axes

Five former traits were mutually exclusive by nature — the tell for an axis.
They became two sliders:

**Operational status** (0–100%) — *replaces `dormant`, `hive-populated`,
`automated`*

*As built (D264–D266): Interior heat, relabelled by a `dials` entry, driving the general `activity` / `lit` properties (js/gen/activity.js).*

| Value | Reads as | Drives |
|---|---|---|
| 0 | Fully offline | Every light dark, the emergency red too; the board and reactor dimmed (`heatValue`); a wound cold, no sparks |
| 1–12 | Emergency power | A few lights burn the emergency red, rising across 0–4% and handing over to normal lighting across 7–12% |
| ~10–40 | Automated | The reactor, machinery and board wake first; habitation dark — nobody home |
| 40–95 | Crewed | Habitation lights come on; at the default 55% the approved look |
| 55–100 | Hive | `busy` rises to 1.7: more lit windows and chips, more pulses, more docked craft, extra facility rows |

Each layer's `lit: [wake, full]` sets when its lights come on, so the dial reads as a sequence rather than one dimmer. **Which** light is on is a stable hash of its position, so lights switch on in place as the dial is dragged. A dark light is dropped, a dark unit's lights go out, a pulse is not sent; sparks and fire on a wound's torn edge follow the same gate. The accent's own brightness is left alone: dark and red lights are what read as derelict. Habitation's presence stays with Optional layers.

**Hull integrity** (0–100%) — *replaces `damaged`, `partial-construction`*

*As built (D267–D269): Cohesion, relabelled by a `dials` entry, driving the general `rupture` structure feature (js/gen/rupture.js). The zone `remove: true` it was meant to reuse was never built.*

| Value | Reads as |
|---|---|
| 92–100 | Intact — unbroken hull |
| 85 | A hull breach |
| 60 | Two or three shells cut through |
| 45 (default) | Into the machinery |
| 0 | Down to the reactor's rim |

1–5 wounds a body, the first the main one at full size and opening first; each other 35–80% of its size, on bearings spread round the body, opening at its own point as the dial falls. Each wound is a **stepped funnel**: every layer it passes through torn back to its own edge, wider toward the surface, the edges serrated and the floor ragged. Inside it, space shows through, as through the voids. Everything is rolled up front, so the same wounds grow in place as the dial moves.

**The torn edge** (`edge: "torn"`, js/gen/woundedge.js and js/gen/wounddebris.js, drawn by the matching js/draw/ files): a scorched rim inside the remaining metal; plating peeled and bent outward, biggest at the surface lips; snapped pillar stubs; severed pipe ends on the faces of the layers in `pipes` and on every conduit run the wound cuts; a debris field pouring out of the mouth in three size tiers, mostly small; sparks, fire and embers in the warning colour, gated by Operational status, so a derelict wound is cold and dark.

**Under construction** is an exclusive trait rather than the spec's `construction: true` flag (D249, built D273): it sets `rupture.edge: "clean"`, so the wounds become building sites with scaffolding and cranes — an unfinished world rather than a wrecked one. Same geometry, a different edge treatment and a different stats line.

### Stats template

Machine worlds need their own template entirely.

*As built (D278): `js/gen/stats/machine.js`, every row read from the render — power from the reactor's drawn size × the share running, population from habitation's drawn band × its lit windows, status from the layers' lights, hull integrity as `1 − rupture.amount` with the wounds cut and the deepest layer reached, docking from shafts, doors, covers, ports and platforms. Weaponized and Worldship add a Weapon and a Drive row; Under construction relabels Hull integrity as Completion; the cut ancient-precursor lives in the Construction row. Notable, Resources and Approach rows from the flavour pool show at the full detail level (D279).*

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

*As built (D279): `js/data/flavour/machine.js`, four pools (Notable, Resources, Approach, Biggest danger), every line guarded by a fact the card shows. The spec's four lines are there, guarded where they make a claim: the size of a moon only where the Size row says Moon or larger; nobody answering hails only on an automated world; the old scars only where the Construction row reads the world as old or ancient; the lights line on the card's own lit share, in its own words ("about half of the habitation levels"). The cut ancient-precursor's story is told by `age`, set beside the Construction row so the two cannot disagree.*

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
