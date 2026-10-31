# Session AB — Phase 9b, megastructure traits on natural bodies

*D289–. This session holds the audit and a proposed cleaned list. Nothing is built until the user approves the list (phase-9-10.md § 9b, step 3).*

Scratch tool: the eligibility count below came from a throwaway probe in the session scratchpad that loads `js/core/` and `js/data/` from `index.html`'s script order in a `vm` context and prints `CC.Traits.eligible(archetype)` per archetype, split by the `artificial` tag. It is not kept, because the numbers change the moment a trait is added.

---

## What already exists

MACHINE-WORLDS.md § "Megastructure traits (on natural bodies)" was written before Phases 5–7, and four of its six families have since grown built traits of their own. What each archetype can roll today (`CC.Traits.eligible`, zone modifiers excluded):

| Archetype | Built / all | Built traits | Natural traits |
|---|---|---|---|
| planet | **0 / 9** | — | ring-system, debris-belt, mineral-veins, ore-deposits, void-pockets, magma-chambers, metal-rich, cratered, impact-basin |
| moon | **0 / 7** | — | mineral-veins, ore-deposits, void-pockets, magma-chambers, metal-rich, cratered, impact-basin |
| asteroid | 2 / 6 | mining-station, tunnel-borer | ore-deposits, cratered, impact-basin, shattered (+ the Caverns axis, built at its top end) |
| gas giant, ice giant | 2 / 10 | gas-miner-platforms, skimmer-tracks | ringlet-system, debris-belt, great-storm, storm-belts, violent-banding, helium-rain, diamond-rain, prismatic-ice |
| young / main / dwarf / old giant star | 2 / 6–10 | orbital-mirrors, stellar-collector | prominences, flare-storms, coronal-holes, starspot-clusters, plus the family's evolved, spotted and young traits |
| neutron star | 1 / 4 | research-station | starquake-scars, glitching, accretion-stream |
| pulsar | 2 / 6 | navigation-beacon, research-station | + pulsar-wind |
| black hole | 2 / 3 | hole-station, energy-extraction-array | tidal-disruption |
| nebula | 3 / 15 | hidden-station, mining-flotilla, derelict-fleet | twelve natural |
| machine world | 6 / 6 | its six exclusive traits | — |

**Planets and moons are the only natural bodies with nothing built**, and they are the bodies a TTRPG or worldbuilding user reaches for first. Two presets in PARAMETERS.md, Coruscant World and Half-Built Dyson, are listed as waiting on 9b.

The built vocabulary already in the code, which anything new should reuse before adding a primitive: `plate` (boxes, frames, pads: mining station, beacon, research stations), `capsule` (a pressure hull: gas miners, skimmers, nebula fleets, with faction `paint`, `formation: "line"` and `aim`), `coned-cylinder` (aimed collectors), `orbital-mirror`, `borer`; and from the machine world `truss`, `glyph`, `fixture`, `cellgrid` (lit window grids), the accent hue (`js/gen/accent.js`), the `lit` hash that switches lights on in place (`js/gen/activity.js`), lit deck walls (`js/gen/shellwalls.js`) and the clean-edge scaffolding and cranes (`js/gen/woundclean.js`). Placement already has `seat` (sit on the outline as drawn, tilted to the slope), `dryLand` (land only, exact at any land fraction, used by the craters), `zoneBias` (implemented in `anchorAngles`, declared by no trait yet), `clear`, `minGap` and `spread`.

---

## The audit, per family

Marks: **exists**, **duplicate** (of something that exists or of another entry), **conflicts** (with a natural trait's mark), **wanted**, **drop**.

### Stars

| Spec entry | Mark | Why |
|---|---|---|
| dyson-structure (Enclosure 0–100) | **half exists; the shell is wanted** | `orbital-mirrors` *is* the old dyson-structure, renamed when it became glass-faced panels aimed at the star (stellar-built.js header). It covers the swarm end only. The Enclosure axis, through a half-built shell to a sphere, was never built, though TRAIT-SYSTEM.md's worked example still shows it, and it is the output the spec calls the most evocative. The Half-Built Dyson preset waits on it |
| stellar-collector | **exists** | stellar-built.js: cone stations on one evenly spaced orbit, inside the mirrors |
| matter-siphon | **conflicts, drop** | A ribbon lifting material off the photosphere is the prominence's mark and the compact family's `matter-stream`. A built version would need a tether to say so, and a stream with a line beside it reads as an annotated prominence |
| orbital-mirrors | **exists** | Built with `spacing: random` + `minGap` rather than the spec's even spacing, deliberately: an installation that grew over time |

### Planets and moons

| Spec entry | Mark | Why |
|---|---|---|
| surface-city | **wanted** | The headline: the only way a planet can say "inhabited". Coruscant World waits on it |
| underground-city | **wanted, merged with surface-city** | The same population with a different answer to "can you live on the surface". A climate the card already computes should decide that, not a second trait (see Cities below) |
| orbital-ring | **wanted, as the top of a stations-to-ring progression** | A dusty `ring-system` is a band of particles; a built ring is a crisp truss band with even nodes, a different mark kind. Coruscant World waits on it |
| orbital-platforms | **duplicate, merged into the ring** | Stations on an orbit, and a ring is what stations become when they are joined up. As two traits they are two points on one progression, the same tell that merged swarm and sphere |
| space-elevator | **duplicate, merged into the ring** | Its tethers are already in the spec's orbital-ring row ("ring with 20+ stations and tethers") |
| satellite-network | **drop** | 8–120 even glyphs on one orbit reads as a dotted circle, a HUD line round the planet (traits are things, not annotations). At any legible size a satellite is a station; at an honest size it is nothing |
| starship-fleet | **duplicate; optional, deferred** | The nebula's `mining-flotilla` already draws faction-painted capsules in line formation on a heading. Worth having only as one shared trait across planets, moons, giants and asteroids (see Fleet below), and last |
| orbital-minefield | **drop** | X marks are annotation: a mine is invisible at any scale, so the mark is a map symbol. It is a good line for the flavour pool |
| lagrange-colonies | **drop** | No second body is drawn, so the points have nothing to be Lagrangian to: clusters at fixed angles would read as arbitrary, and L4/L5 lie far outside the frame anyway. Stations already cluster |
| terraforming-array | **conflicts, drop** | A gradient shift in the atmosphere is a colour change, not a mark, and it changes what Ocean depth and the climate already paint. The roadmap's own note places terraforming in the existing frosting knobs and the flavour pool |

### Gas giants and ice giants

| Spec entry | Mark | Why |
|---|---|---|
| gas-miner-platforms | **exists** | gaseous.js: capsules hanging in the troposphere |
| hab-flotilla | **duplicate, drop** | Floating cities in the troposphere are the gas miners drawn bigger. At sheet scale the two would read as one trait with a size spread, which the miners already have |
| skyhook | **duplicate, merged into the ring** | A tether from orbit into the clouds is the planet's space elevator on a body with no crust. The same stations-to-ring trait drops its tethers into the cloud deck where there is no ground |
| orbital-cities | **duplicate, merged into the ring** | Stations in orbit, the ring's low end |

### Asteroids

| Spec entry | Mark | Why |
|---|---|---|
| mining-station | **exists** | solid-asteroid.js: `plate` modules seated on the outline |
| hollowed-out | **exists, as an axis** | Retired as a trait in U1; it is the top of the Caverns slider (U2), which is the spec's own reading of it as "Cohesion driven low, plus lining" |
| docked-ships | **duplicate; optional, deferred** | Ships at the cavern mouths the Caverns axis already opens to space. Folds into the shared Fleet if that is built |
| derelict-hulk | **conflicts, drop** | Irregular `plate` wreckage on a body made of irregular fragments reads as more rock. The nebula's derelict-fleet covers the wreck story where it can be seen |

### Compact objects

| Spec entry | Mark | Why |
|---|---|---|
| research-station | **exists** | compact.js: one per body type at a safe distance (`research-station` on neutron stars and pulsars, `hole-station` beyond the photon sphere and ergosphere) |
| energy-extraction-array | **exists** | compact.js: aimed collectors just outside the ergosphere, off the jets and out of the disc. On an orbit rather than the spec's disc anchor |
| navigation-beacon | **exists** | compact.js: pulsar only, even relays on one orbit |

### Nebulae

| Spec entry | Mark | Why |
|---|---|---|
| hidden-station | **exists** | diffuse.js, nested in a wind-blown cavity when there is one |
| mining-flotilla | **exists** | diffuse.js |
| derelict-fleet | **exists** | diffuse.js |

**Of 28 spec entries: 11 exist, 3 are wanted (the Dyson shell half-exists as the mirrors), 7 merge into a wanted trait or the deferred Fleet, and 7 are dropped** (3 for conflicting with a natural mark, 1 as a copy, 3 outright). Three traits are wanted, plus one optional.

---

## Does the grammar separate artificial from natural?

**Only as a picker group.** The `artificial` tag puts a trait under "Built" in the trait picker (`js/ui/traitpicker.js`); nothing else reads it. Eligibility is by body tags, `excludes` is trait-to-trait and no built trait uses it against a natural one, and the roll (`select` in `js/gen/traitroll.js`) picks uniformly from the compatible pool. The spec's second tag, `megastructure`, was never used. `zoneBias` exists in the grammar and in `anchorAngles` but no trait declares it.

**The roll should treat them differently.** With a uniform pick, the chance that a Randomize press (trait count 1–3) gives a body something built:

| Body | 1 trait | 2 traits | 3 traits |
|---|---|---|---|
| black hole | 67% | 100% | 100% |
| main star, pulsar, asteroid | 33% | 60% | 80% |
| neutron star | 25% | 50% | 75% |
| gas giant, nebula, old giant star | 20% | 38% | 53% |
| planet with two built traits added | 18% | 35% | 49% |
| moon with two built traits added | 22% | 42% | 58% |

Most random stars and asteroids already arrive with something built, and nearly every black hole does. Natural should be the default reading of a random body and built the surprise. **Proposal:** a weighted pick in `select` with built traits at about one third the weight of natural ones, keyed on the `artificial` tag. It applies only to the roll; the picker and presets are untouched. The weighting is relative, so the machine world, whose pool is all built, rolls exactly as before. A cumulative-weight pick with all weights equal chooses the same index as today's `floor(rng × n)`, so only families with built traits in their pool change. **The cost:** those families' rolled trait sets change for existing seeds, and a body saved in localStorage re-rolls its traits on next launch (the store keeps the trait salt, not the rolled set). An explicit selection is unaffected.

---

## The proposal, and the user's correction

The first proposal was Cities (surface and underground as one trait, buried where the climate rules out the surface), Orbital stations → ring, a Dyson shell and an optional Fleet. **The user rejected Cities and Fleet and replaced the list with their own** (D289, D290). The audit above stands as the record of what existed; the plan below is the user's.

## D289 — Phase 9b's list, as the user set it

| Family | Build | Altitude order, lowest first |
|---|---|---|
| Planet, moon | **Orbital ring + space elevators**; **orbital defence network**; **orbital minefield** | ring and elevators → defence network → minefield, much higher |
| Gas giant, ice giant | **Skyhook platforms + orbital cities**, one trait | skimmers → skyhooks and cities (skimmers lowered if need be) |
| Stars | **Dyson shell**; **Dyson swarm / stellar colonies**; the existing collectors and mirrors re-layered | collectors → mirrors → shell → swarm |
| Nebula | **one ringworld**; ice and rock belts as round or oval fields half the time | — |
| Black hole | the background bent round the hole, **only if it is cheap** | — |
| Asteroid, neutron star, pulsar, machine world | nothing | — |

What each one draws, in the user's words where they gave them:

- **Orbital defence network.** Several large platforms, after Halo 2's orbital MAC cannon, mixed with smaller satellites. The platform is two "4" characters merged at the middle, one turned upside down and flipped horizontally: a shape with 180° symmetry, so it points no gun in any particular direction and the author decides whether it aims at the planet or away from it. A satellite is a small metal box with two cyan rectangles sticking out, its solar panels.
- **Orbital minefield.** Many small orbs, each with four thin spikes twice as long as the orb, much higher than the platforms. A quarantine or a defensive perimeter; some will read them as small satellites, and that is fine.
- **Orbital ring + space elevators.** One trait, below the platforms.
- **Skyhook platforms + orbital cities.** One trait on the giants, above the gas skimmers. Orbital cities are the one kind of city kept, because round a giant they are megastructures rather than a town.
- **The stars' four layers.** Stellar collectors lowest: with a shell present, the user can read them as control rods. Orbital mirrors above: alone they work on their own; under a shell they are its internal adjustment mirrors. The Dyson shell above them, a mesh round the star. The Dyson swarm or stellar colonies highest: many small horizontal stone slabs with tiny docking ports, colonies or stations inside.
- **A ringworld** somewhere in the nebula, one only.
- **Nebula belts.** Ice and rock belts become round or oval-ish fields on half the rolls (natural traits; done in the nebula's session).
- **Black hole lensing.** Session V left it undone because it needs an offscreen copy of the background (session-v-compact.md). Measure it first; if it costs real render time, skip it and record why.

## D290 — a trait is visible at the body's scale, and leaves the story open

Two rules from the user's correction, for every future trait and not only these:

1. **Nothing smaller than the view can show.** A city or a fleet is invisible at the distance the app draws a celestial body, so neither is a trait. Settlements belong to a separate planetary surface map generator, not this one. The giants' orbital cities are kept because round a giant they are megastructures. The asteroid's stations, the nebula's fleets and the gas miners already break the rule, and are kept as special cases where it fits.
2. **Vague enough to interpret.** A trait shows something interesting and leaves its meaning to the author. The defence platform's 180° symmetry is the model: it does not say which way the gun points. The minefield can be a quarantine or a perimeter. The collectors and mirrors read one way alone and another under a shell. The info card may take a side; the user is free to ignore it.

## Still open

- **The roll weighting** (built traits at about a third in Randomize). Not answered yet. Planets and moons go from 0 of 9 to 3 of 12 built and stars from 2 to 4 of 6–10, so the question gets sharper with this list. Ask at the start of Session AC.
- **The presets.** Coruscant World needed cities and is dead as written. Half-Built Dyson needs a half-built shell, which the user's mesh may or may not be. Settle both in the last session with the user.

## The plan, one family per session

Each session builds its family's traits, renders them for the user's eye, updates that family's spec (MACHINE-WORLDS.md's per-body list and the celestial doc's "Artificial" line) and the checklist, and ends by writing the prompt for the next session. The full checklist is in [checklist.md](checklist.md) § Phase 9b.

1. **AC — planets and moons.**
2. **AD — gas and ice giants.**
3. **AE — stars.**
4. **AF — the nebula.**
5. **AG — the black hole's lensing, then 9b closed**: presets, the cross-cutting docs (TRAIT-SYSTEM.md's Dyson worked example, PARAMETERS.md's preset table), the roll weighting if it was deferred.

### The prompt for Session AC

> Phase 9b, Session AC: the planet and moon megastructures. Read CLAUDE.md, docs/PROGRESS.md, docs/progress/session-ab-megastructures.md (the plan and D289–D290 — the user's list replaced the proposal), docs/progress/checklist.md § Phase 9b, docs/TRAIT-SYSTEM.md for the grammar, and the existing built traits for reuse (js/data/traits/stellar-built.js, compact.js, the machine world's `truss`/`glyph` in js/draw/primitives/). Next free decision number: D291. Continue in a new session log, docs/progress/session-ac-planet-megastructures.md, added to docs/progress/README.md.
>
> First ask me about the roll weighting (built traits at about a third in Randomize; it changes rolled traits on existing seeds). Then build, one trait at a time, rendering each for me to look at before the next: (1) orbital ring + space elevators, lowest; (2) the orbital defence network — large platforms shaped like two "4"s merged at the middle, one upside down and flipped horizontally, so the direction of the gun stays ambiguous, mixed with small satellites (a metal box with two cyan solar-panel rectangles); (3) the orbital minefield — many small orbs each with four thin spikes twice the orb's length, much higher than the platforms. Planet and moon only, by a body tag named for the physical fact (orbital.js explains the convention), not the asteroid. They must sit with the existing ring-system (1.35–2.15 body radii) and debris belt (1.28–1.95) and stay in frame. Rules as ever: plain scripts, ≤500 lines per file, no ES modules, no new tests unless asked, render for me rather than asserting it looks good, draw the thing, not an annotation of it. End by updating the spec, the checklist and PROGRESS.md, and writing the prompt for Session AD (the giants).
