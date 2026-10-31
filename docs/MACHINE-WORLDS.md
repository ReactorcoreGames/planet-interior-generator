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
All are tagged `artificial`, which files them under "Built" in the trait picker and weights them at a third of a natural trait in Randomize (D291); the spec's second tag, `megastructure`, was never used. **Phase 9b is complete (Session AG)**: the lists below are what was built, family by family, with what the audit dropped (D289–D290). The rule for any future one: visible at the body's scale, and open to interpretation (D290).

### For stars

**Built (Phase 9b, Session AE, D298–D301).** Four traits on all four star archetypes, gated on `stellar`, stacked lowest first. The collectors and mirrors are in `js/data/traits/stellar-built.js`; the shell and the swarm are declared in `js/data/traits/dyson.js`, built by `js/gen/dyson.js` and drawn by `js/draw/primitives/dyson.js`, each ONE element rolled by its builder (Detail density does not change it).

Every one is placed with `depthAbove` measured from the halo's edge **capped at 1.15** (`edgeCap`, D298): a young star's or a giant's corona alone fills the frame's height, so the stack sinks into the glow there rather than leaving the frame, and the shell stays a whole circle.

| Trait | Altitude | What it draws |
|---|---|---|
| ✅ **stellar-collector** | halfway from the surface to the mirrors' orbit (`depthFrac`, D299) | 2–12 cone stations evenly on one orbit, tips aimed at the star, 0.072–0.085 radii long |
| ✅ **orbital-mirrors** | 0.02–0.03 above the capped edge | 18–34 panels evenly on one orbit, metal backing and a glass face in the star's own colour turned to it (D298; formerly a random scatter at 1.34–1.62) |
| ✅ **dyson-shell** | 0.085–0.09 above the capped edge (at most about 1.24) | the cut edge of a lattice sphere: three rows of near-equilateral triangles between four rails, plates in 25–70% of them laid in runs, the corona through the open cells, the inner rail lit, heavy ribs every 10–16 cells, lights at nodes (D300) |
| ✅ **dyson-shell-unfinished** | as the shell | the same shell with 1–9 arcs not built, together 15–80% of the circle, each ending at a rib with bare rail run on a cell or three past it; one sector per gap so two never merge (D305). Excludes `dyson-shell` |
| ✅ **dyson-swarm** | 0.24–0.72 above the capped edge (about 1.39–1.87), at the bearings the frame's height shows | 3–5 staggered rows of small stone slabs evenly spaced, one size per row, each along its own radial with its small end to the star, a row of lit windows, a docking port at the outer end or both (D301) |

Under a shell the collectors can read as its control rods and the mirrors as its adjustment mirrors; alone they read as themselves (D290). The swarm's slabs point along the radial because a long body in orbit settles that way (gravity-gradient stabilization), which also gives every colony the same small sunward end; level slabs sat at odd angles in the corners and slabs turned to the orbit read as dashed lines (D301).

**The Enclosure axis was not built.** The spec's single `dyson-structure` trait with an `enclosure` parameter, swarm through a half-built shell to a sphere, became separate layers on the user's list (D289), and the half-built sphere became `dyson-shell-unfinished` (D305): the shell's other state as one line of data (`gaps`), rolled across its whole range per body because a trait has no dial of its own. The Half-Built Dyson preset forces it (D306); TRAIT-SYSTEM.md § Dyson shell says why it is a pair.

**Dropped by the Session AB audit (D289):** matter-siphon (a ribbon off the photosphere is the prominence's mark).

### For planets and moons

**Built (Phase 9b, Session AC, D293–D295).** Three traits, gated on the
`rounded` body tag (planet and moon, not the asteroid), declared in
`js/data/traits/orbital-built.js`, built by `js/gen/orbitalbuilt.js` and drawn
by `js/draw/primitives/orbital-built.js` and `orbital-mines.js`. Each is ONE
element rolled by its builder; Detail density does not change it. Altitudes
are `depthAbove` the body's own reach, lowest first:

| Trait | Altitude above the body's reach | What it draws |
|---|---|---|
| ✅ **orbital-ring** | 0.10–0.15 (about 1.10–1.21 radii) | A truss band in the plane of the cut with habitat modules at even spacing, pods on both faces, and 2–6 space elevators: two cables from an anchor station on the ground (the top of the outermost non-haze layer) through a hub module to a counterweight, with 1–3 climbers |
| ✅ **defence-network** | 0.27–0.45 (about 1.30–1.50) | 2–6 gun platforms — two "4"s merged at the middle through 180°, barrels along the radial, so neither end is the gun — in the gaps of one evenly spaced constellation of satellites (a metal box, two cyan panels, all one size and aligned to the orbit) |
| ✅ **minefield** | 0.70–1.00 (about 1.70–2.05) | 2–3 staggered rows of identical mines, each a metal orb with four spikes twice its diameter, all turned the same way; a third carry a red light |

The network and the minefield place only on bearings where a mark stays
inside the frame's height (1.18 body radii from the centre, under the 1.28 the
default Body size shows), which at their altitude means the sides. Ordered
rather than scattered: the user's review found scattered heights and turns
read as space junk.

**Dropped by the Session AB audit and the user's list (D289–D290):**
surface-city, underground-city (a city is invisible at the scale a body is
drawn; settlements belong to a surface-map generator), orbital-platforms and
space-elevator (merged into orbital-ring), satellite-network (merged into the
defence network's satellites), starship-fleet, lagrange-colonies,
terraforming-array. The orbital-minefield was dropped as an X-mark symbol and
restored by the user as a drawn thing.

### Artificial traits respond to the body's parameters

This is what stops megastructures being a bolted-on layer. The spec's table here named traits that were never built (surface-city, underground-city, terraforming-array, `hollowed-out` as a trait); what the built ones actually read:

| Trait | Responds to | How |
|---|---|---|
| **orbital-ring** | the ground | Each elevator stands on the top of the outermost non-haze layer, so it lands on the real surface whatever the ocean and frosting do (D293) |
| **gas-miner-platforms**, **skyhook-cities** | the cloud deck | Hang in the troposphere; a skyhook's scoop sits in the cloud tops (D296) |
| **mining-station**, **tunnel-borer** | Caverns, Cohesion | The borer's bore belongs to the caves; the hollowed habitat is the top of the Caverns axis, capped by Cohesion (U2) |
| **hidden-station** | the nebula's cavity | Nests in a wind-blown cavity when there is one |
| **ringworld** | the gas | Sinks under the other traits in a dense region or a shell's band; its sun lights the cloud round it (D302) |
| every star's built layer | the corona's reach | Measured from the halo's edge, capped by `edgeCap` so the stack stays in frame (D298) |

### Zone bias — where people build

`zoneBias` exists in the grammar and in `anchorAngles`, but **no built trait declares it**: the 9b traits are orbital and evenly spaced, so a zone has nothing to choose between. The idea stands for a future trait that sits on a surface: on a tidally locked world anything habitable biases to `twilight`, industry to the `hot` face and radiators to the `cold`; round a binary, collectors bias to `facing`.

### For gas giants and ice giants

**Built (Phase 9b, Session AD, D296).** Three traits, gated on `gaseous`. The
two older ones are in `js/data/traits/gaseous.js`; the new one is declared in
`js/data/traits/giant-built.js`, built by `js/gen/giantbuilt.js` and drawn by
`js/draw/primitives/giant-built.js`, ONE element rolled by its builder (Detail
density does not change it). Lowest first:

| Trait | Altitude | What it draws |
|---|---|---|
| ✅ **gas-miner-platforms** | in the troposphere | `capsule` hulls hanging along the local vertical, randomly spaced |
| ✅ **skimmer-tracks** | 0.94–1.08 radii, straddling the cloud tops | the same `capsule` lying along the orbit, diving and climbing |
| ✅ **skyhook-cities** | platforms 0.08–0.11 above the body's reach (about 1.11–1.17); cities 1.36–1.48 | 3–11 skyhooks evenly spaced on one orbit: a funnel scoop hung mouth-down in the cloud deck, a tether with 1–3 gas pods climbing it, a platform with a winch house and radiator fins, a counterweight. On 1–5 of the hooks nearest the sides the tether climbs on past the platform to an orbital city, all one design per body: a **wheel** (broad and narrow habitat rings, 3–4 spokes with lift cars, on a keel), a **pair** (two cylinders along the orbit, lit land and glazed strips, a frame and spine) or a **spire** (a spine through 3–5 saucer decks with blocks on each, a mast) |

The cities are small beside the giant (half-size 0.050–0.068 radii) and
several, after the user's review found the first pass, three times the size,
absurd for a world 100,000 km across. They place only where they stay inside
the frame's height, so a giant with few hooks may get fewer than it rolled.

**Dropped by the Session AB audit (D289):** hab-flotilla (the gas miners drawn
bigger), and orbital-cities and skyhook as separate traits — merged into one.

### For asteroids

**Nothing added in 9b** (D289); what exists was built in U2:

| Trait | What it draws |
|---|---|
| ✅ **mining-station** | `plate` modules seated on the outline, tilted to the slope |
| ✅ **tunnel-borer** | a `borer` and its bore, which belongs to the cave system |

**hollowed-out** is not a trait: it is the top of the **Caverns** axis (U2), bored tunnels and mined halls added to the natural caves and capped by Cohesion. The classic hollowed-asteroid habitat comes out of a parameter that already exists. **Dropped** (D289): docked-ships (deferred with the fleet), derelict-hulk (irregular wreckage on a body of irregular fragments reads as more rock).

### For compact objects

**Nothing added in 9b** (D289); what exists was built in Session V:

| Trait | Body | What it draws |
|---|---|---|
| ✅ **research-station** | neutron star, pulsar | `plate` stations at a safe distance |
| ✅ **hole-station** | black hole | a station beyond the photon sphere and the ergosphere |
| ✅ **energy-extraction-array** | black hole | aimed collectors on an orbit just outside the ergosphere, off the jets and out of the disc |
| ✅ **navigation-beacon** | pulsar | even relays on one orbit |

The black hole's **lensing** (D304) was on 9b's list but is not a trait: the starfield behind every hole is bent into an Einstein ring (compact-objects.md).

Anything near a compact object should be **sparse and distant** — the contrast
between a tiny fragile station and an object that would annihilate it is the
point.

### For nebulae

| Trait | Anchor / reach | Elements | Density 0.0 → 1.0 |
|---|---|---|---|
| **hidden-station** | dense-region, on | `plate` in a cavity | 1 → 5 concealed sites |
| **mining-flotilla** | dense-region, on | `plate` + `glyph` | 3 → 30 vessels |
| **derelict-fleet** | sparse-region, on | `glyph` wreckage, scattered | 5 → 60 hulks |
| **ringworld** | dense-region or shell, `place: "pocket"` | one `ringworld` element | always one |

**ringworld** (D302, Session AF): one ring round its own sun, seen at a slant —
the inner face of land and sea on the far half, the dark hull on the near —
sunk in the gas: under the other traits, its sun lighting the cloud, the
cloud's own veils drifting across it. About 0.05–0.10 body radii in radius,
cut 60% on the user's review because a nebula is light-years across. Placed
liberally anywhere in the gas. The surface is lush, arid or frozen, and
nothing says whether it is a habitat, a ruin or something else (D290).

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
