# Stars

**Archetypes:** `young-star` · `main-star` · `old-giant-star` · `dwarf-star`

Self-luminous bodies. The cutaway story is **energy transport** — how heat gets
from a fusion core to the surface — and this family is where the diagrammatic
treatment earns its keep.

**Body tags:** `stellar`, `luminous`

---

## Colour: the family rule

**Hue is free for every star type.** A green star or a violet star is fine —
this is a stylized generator, not an astronomy textbook.

What distinguishes star types is **saturation and lightness per layer**, not
hue. This is the key decision for the family:

| Type | Character |
|---|---|
| Young star | Strong saturation, high brightness throughout — vivid and energetic |
| Main star | Balanced saturation, high brightness — stable and clean |
| Old giant | Diminished saturation, slightly diminished brightness, **falling off further toward the outer layers** — tired, diffuse |
| Dwarf star | Low-to-moderate saturation, very high brightness in the core, dim envelope — a small fierce point |

All star layers are **luminous** — they ignore any global shading pass. Nothing
in a star should look like it's lit from outside.

---

## The energy-transport structure

The physically real and visually useful distinction. Stars move energy outward
two ways, and the ordering differs by mass:

- **Radiative zone** — photons bounce outward slowly. Drawn as fine radial
  streaks, no bulk motion.
- **Convective zone** — plasma physically circulates. Drawn as visible cells
  with curved flow arrows showing the loop.

| Star type | Interior order (core → surface) |
|---|---|
| Low-mass / dwarf | Convective all the way through |
| Sun-like / main | Radiative core, **convective** envelope |
| High-mass / young | **Convective** core, radiative envelope |
| Old giant | Tiny degenerate core, thin shells, **enormous** convective envelope |

That inversion between low-mass and high-mass stars is real, visually
interesting, and worth encoding.

---

## young-star

> Newly ignited, energetic, and unstable. Vivid colours, violent surface
> activity, lots of flares.

### Standard stack

| Layer role | Frac range | Optional | Boundary | Notes |
|---|---|---|---|---|
| `corona` | 1.00–1.35 | — | soft gradient | hot diffuse halo |
| `chromosphere` | 0.98–1.01 | — | slight wobble | thin, active |
| `photosphere` | 0.90–0.97 | — | slight wobble | the visible surface, granulated |
| `radiative` | 0.40–0.88 | — | slight wobble | energy crawls outward |
| `convective-core` | 0.15–0.38 | — | irregular | **inverted** — convection at the centre |
| `fusion-core` | 0.06–0.14 | — | near-perfect | hydrogen burning |

### Colour

| Layer | Saturation | Lightness |
|---|---|---|
| corona | 0.45–0.80 | 0.55–0.80 |
| chromosphere | 0.60–0.90 | 0.70–0.90 |
| photosphere | 0.55–0.85 | 0.80–1.00 |
| radiative | 0.55–0.85 | 0.65–0.85 |
| convective-core | 0.60–0.90 | 0.70–0.90 |
| fusion-core | 0.25–0.55 | 0.95–1.00 |

Core is nearly white regardless of hue — that's what reads as "hot".

### Layer details

| Layer | Elements | Count |
|---|---|---|
| corona | streamers, wisps | 20–50 |
| chromosphere | spicule fringe | 60–150 |
| photosphere | **granulation cells**, starspots | 80–250 / 3–12 |
| radiative | **radial streaks** | 60–150 |
| convective-core | **convection cells + flow arrows** | 20–45 / 10–20 |
| fusion-core | dense glow stipple, compression rings | 200–350 / 3–5 |

Granulation on the photosphere should be dense and small — hundreds of cells,
not dozens. It's the texture that makes a star look like a star.

### Eligible traits

prominences (3–30) · flare-storms · starspot-clusters · coronal-holes ·
accretion-disc · protoplanetary-disc · stellar-jets ·
t-tauri-variability · orbital-mirrors · stellar-collector

> **`binary-companion` was built as an AXIS, not a trait** (Session O). It
> changes values in the stack rather than the stack itself, which is
> TRAIT-SYSTEM.md's third test, and that is the same reasoning that moved
> tidal locking off the trait list in D27. Every star declares it; the
> **Binary companion** slider drives it and **Companion bearing** aims it.
>
> **It does not draw a second star.** The user was explicit — *"I do not want
> to draw another sun"* — so this is a distortion axis: the OUTWARD layers
> bulge toward the pull and the facing hemisphere runs hotter and more
> agitated, while the body itself stays perfectly round. A tidal bulge on a
> star genuinely is a bulge in the tenuous outer envelope rather than a
> deformation of the fusing interior, so the cutaway stays readable — which
> matters, because the layer stack is the part that was signed off.
>
> It reuses the tidal-locking machinery with **no new drawing code**:
> `gen/zones.js` already publishes `airAt`, and `draw/scene.js` already
> composes it into the same per-bearing reach function the coronal wobble
> multiplies into (D130). See
> [TRAIT-SYSTEM.md](../TRAIT-SYSTEM.md#angular-zones).

### Stats

- **Radius:** 400,000–1,500,000 km
- **Surface temperature:** 3,000–12,000 °C
- **Age:** a few million years
- **Stand on it?** No. Nothing survives contact.
- **The hook:** it's still forming planets — the disc is full of raw material

---

## main-star

> A stable, well-behaved star in the long middle of its life. The reference
> case; most systems have one.

### Standard stack

| Layer role | Frac range | Optional | Boundary | Notes |
|---|---|---|---|---|
| `corona` | 1.00–1.25 | — | soft gradient | |
| `chromosphere` | 0.98–1.01 | — | slight wobble | |
| `photosphere` | 0.92–0.97 | — | slight wobble | granulated |
| `convective` | 0.65–0.91 | — | irregular | **outer** convection |
| `tachocline` | 0.60–0.64 | 70% | slight wobble | thin shear layer — dynamo origin |
| `radiative` | 0.18–0.59 | — | slight wobble | |
| `fusion-core` | 0.08–0.17 | — | near-perfect | |

The `tachocline` is a thin bright boundary line between the convective and
radiative zones. Small, but it's a nice piece of specificity.

### Colour

| Layer | Saturation | Lightness |
|---|---|---|
| corona | 0.35–0.65 | 0.55–0.80 |
| chromosphere | 0.50–0.80 | 0.70–0.90 |
| photosphere | 0.45–0.75 | 0.82–1.00 |
| convective | 0.50–0.80 | 0.70–0.90 |
| radiative | 0.45–0.75 | 0.60–0.80 |
| fusion-core | 0.20–0.50 | 0.95–1.00 |

### Layer details

| Layer | Elements | Count |
|---|---|---|
| corona | streamers | 15–40 |
| photosphere | granulation cells, starspots | 100–300 / 2–10 |
| convective | **convection cells + flow arrows** | 25–55 / 12–24 |
| tachocline | thin bright shear band | 1 |
| radiative | **radial streaks** | 50–130 |
| fusion-core | glow stipple, compression rings | 200–350 / 3–5 |

### Eligible traits

prominences · starspot-clusters · coronal-holes ·
orbital-mirrors · stellar-collector

> `binary-companion` is an axis on every star, not a trait — see the note
> under `young-star` above.
>
> `solar-cycle-active` removed — it's the **Stellar activity** axis, shared with
> the dwarf star's `flare-star` / `heavy-starspots`. `planetary-system` removed —
> not visible in a cutaway of the star itself; it belongs in the stats card.

### Stats

- **Radius:** 500,000–1,000,000 km
- **Surface temperature:** 3,500–8,000 °C
- **Stand on it?** No
- **The hook:** it's the anchor of a system — everything else orbits this

---

## old-giant-star

> Enormous, cool, and mostly empty. A tiny brilliant core under an envelope so
> diffuse you could fly a ship through the outer layers.

### Standard stack

| Layer role | Frac range | Optional | Boundary | Notes |
|---|---|---|---|---|
| `shed-envelope` | 1.00–1.40 | presence: 3.0 (guaranteed at slider 0.33) | extreme wobble | cast-off material |
| `photosphere` | 0.93–0.99 | — | irregular | cool, uneven |
| `convective` | 0.30–0.92 | — | **irregular, huge** | dominates the volume |
| `h-shell` | 0.14–0.28 | — | slight wobble | hydrogen fusion shell |
| `he-shell` | 0.07–0.13 | presence: 1.5 (guaranteed at slider 0.66) | slight wobble | helium fusion shell |
| `degenerate-core` | 0.02–0.06 | — | near-perfect | **tiny, brilliant, dense** |

**The extreme size contrast is the whole point.** The core should be almost
comically small against the envelope — that contrast is the most striking thing
this archetype produces.

### Colour

Diminished saturation and brightness, **falling off further toward the outer
layers** — the defining rule for this type.

| Layer | Saturation | Lightness |
|---|---|---|
| shed-envelope | 0.15–0.40 | 0.30–0.50 |
| photosphere | 0.30–0.60 | 0.45–0.70 |
| convective | 0.35–0.65 | 0.40–0.65 |
| h-shell | 0.50–0.75 | 0.70–0.88 |
| he-shell | 0.55–0.80 | 0.80–0.95 |
| degenerate-core | 0.10–0.40 | 0.95–1.00 |

Brightness climbs steeply inward. The outer envelope should look tired; the
core should look like it's still furious about something.

### Layer details

| Layer | Elements | Count |
|---|---|---|
| shed-envelope | wisps, dust motes | 40–100 / 100–300 |
| photosphere | coarse granulation | 30–80 |
| convective | **huge convection cells + flow arrows** | 12–30 / 10–20 |
| h-shell / he-shell | bright thin bands, glints | 20–50 |
| degenerate-core | very dense stipple, tight rings | 250–450 / 4–8 |

Convection cells here should be **large** — a few enormous ones, unlike the
hundreds of tiny granules on a main-sequence star. That contrast in cell scale
is a nice bit of visual storytelling.

### Eligible traits

prominences · shed-shells · dust-formation · pulsating ·
engulfed-planet · dredge-up · stellar-collector · orbital-mirrors

### Stats

- **Radius:** 10–100× the Sun (7,000,000–70,000,000 km)
- **Surface temperature:** 2,000–4,000 °C — cool, as stars go
- **Density:** thinner than air in the outer envelope
- **Stand on it?** No — but you could *fly through* the outer layers
- **The hook:** it's shedding the material that will build the next generation
  of worlds

### Flavour

- "So big that if you put it where our sun is, it would swallow the inner planets."
- "So thin at the edges that a ship could sail through it — carefully."
- "All that size, and the part actually doing the work is smaller than a planet."

---

## dwarf-star

> Small, dim, and extremely long-lived. Fully convective — no radiative zone at
> all, which makes its interior structure visually distinct.

### Standard stack

| Layer role | Frac range | Optional | Boundary | Notes |
|---|---|---|---|---|
| `corona` | 1.00–1.15 | presence: 2.0 (guaranteed at slider 0.5) | soft gradient | weak |
| `chromosphere` | 0.98–1.01 | — | slight wobble | |
| `photosphere` | 0.93–0.97 | — | slight wobble | heavily spotted |
| `convective` | 0.12–0.92 | — | irregular | **fully convective — no radiative zone** |
| `fusion-core` | 0.05–0.11 | — | near-perfect | slow, frugal burning |

The absence of a radiative zone is the signature. Convection cells run all the
way from the core to the surface — the flow arrows should form long continuous
loops spanning most of the body.

### Colour

Low-to-moderate saturation, very bright core, dim envelope.

| Layer | Saturation | Lightness |
|---|---|---|
| corona | 0.25–0.55 | 0.40–0.65 |
| chromosphere | 0.40–0.70 | 0.55–0.80 |
| photosphere | 0.40–0.70 | 0.60–0.85 |
| convective | 0.45–0.75 | 0.50–0.75 |
| fusion-core | 0.20–0.50 | 0.90–1.00 |

### Layer details

| Layer | Elements | Count |
|---|---|---|
| photosphere | granulation, **large starspots** | 60–150 / 5–15 |
| convective | **full-depth convection cells + long flow arrows** | 30–70 / 15–30 |
| fusion-core | glow stipple | 150–250 |

Dwarf stars are heavily spotted — starspots should be proportionally much
larger here than on a main-sequence star.

### Eligible traits

starspot-clusters · prominences · orbital-mirrors

> **Removed:** `flare-star`, `heavy-starspots`, `tidally-locked-planets`,
> `long-lived` and `habitable-zone-close`
> are **facts about the star's system, not things visible in its cutaway**. By
> the project's own rule — *if a quirk isn't visible at a glance, it isn't a
> trait* — they belong in the stats card and flavour text, where they already
> appear. Keeping them as traits would put unpickable entries in the trait
> picker.
>
> **Stellar activity** (0–100%) is the family-wide axis: it drives starspot
> count and size, prominence count, flare-storm presence and chromospheric
> agitation. A dwarf star should **bias this high by default** — heavy spotting
> and frequent flares are its signature, and its starspots are proportionally
> much larger than a main-sequence star's.

### Stats

- **Radius:** 100,000–500,000 km
- **Surface temperature:** 2,000–3,500 °C
- **Lifespan:** trillions of years — it will outlast almost everything
- **Stand on it?** No
- **The hook:** it burns so slowly that it will still be here long after every
  other star has died

### Flavour

- "Small, dim, and patient. It will still be burning when the galaxy is dark."
- "Prone to flares that would strip the atmosphere off anything orbiting close."
- "Its habitable zone is so tight that anything there is tidally locked."

---

## The limb — how a star reads from outside

*Built in Session O. The interior above is the diagram; this is what makes the
picture read as a star rather than as a diagram of one. Full reasoning in
[session-o-star-body.md](../progress/session-o-star-body.md), D129–D139.*

Five mechanisms, each with its own knob, deliberately not folded into one
"activity" number — the user asked for that separation by name, so that each
star type gets levers that move independently.

| Mechanism | Declared as | What it does |
|---|---|---|
| **Limb darkening** | `limbDarkening` on a layer | A luminous layer is dimmer at its edge. One curve, measured against the BODY's radius and shared between the surface and the layer beneath it, so the disc reads as a sphere rather than as a flat circle |
| **A wavy limb** | `wobbleRel` on a layer | The boundary is wavy by a proportion **of its own thickness** — 10% at the calmest, up to ~50% at the most violent. Because it is a proportion, a corona's absolute wobble is far larger than a chromosphere's from the same figure |
| **The plume field** | a `plume` element on the outward layer | Tongues of fire standing off the surface. A separate knob from the wobble |
| **The emissive halo** | `emissiveGlow` on the archetype | Coloured light in the space around the body, with **heat veins** reaching through it. Reaches 1.34–1.75 body radii |
| **The binary companion** | `axes` on the archetype | A tidal bulge on the outward layers plus a hotter facing hemisphere. See the note under `young-star` |

### The per-archetype character

The doc's brutality table, as built:

| Archetype | Corona wobble (calm→violent) | Plumes | Halo reach | Reads as |
|---|---|---|---|---|
| `young-star` | 0.18 → 0.55 | ×1.55 count, ×1.30 size | 1.62 | The most violent. Newly ignited, unstable, vivid |
| `main-star` | 0.12 → 0.44 | ×1.0 (the reference) | 1.52 | Active but orderly |
| `old-giant-star` | 0.34 → 0.62 *(shed envelope)* | its **own** recipe — few, long, very faint | 1.75, dim | Enormous and tired, and genuinely shedding |
| `dwarf-star` | 0.10 → 0.26 corona, **0.18 → 0.54 chromosphere** | ×1.35 count, ×0.62 size | 1.34 | Small and fierce. **Furious surface, feeble corona** |

Two of these are worth reading twice:

- **The dwarf is not simply "the calmest".** The spec has it biasing activity
  *high*, so its chromosphere is the most agitated fringe in the family while
  the thin halo above it barely moves, and its plumes are more numerous and
  shorter than a main star's. Two numbers pulling opposite ways, which a single
  activity multiplier could not have said.
- **The old giant has no corona**, so it inherits none of the corona's plume
  field. Its shed envelope declares its own instead — a red giant is not
  flaring, it is *shedding*, so the marks are few, very long, very faint and
  heavily leaned. Having a separate recipe is what lets the archetype tell its
  own story rather than be a dimmer copy of someone else's.

### Two things that must not be changed back

**No frosting anywhere (D22).** A photosphere has no hollows for material to
settle into. Nothing on the limb deposits.

**The silhouette must never stop reading as a circle.** v2's stars wobbled so
hard they were no longer circles; v2 was more stylized and it worked there, and
in v3 the job is **waviness**. If a change makes the outline stop reading as a
disc, it has gone too far — see D131, where the fix for a tame limb turned out
to be the wobble's *frequency* rather than its amplitude.

---

## Family notes

**The diagrammatic payoff.** This family is where "layers should show what they
do" matters most:

- **Radiative zones** → fine radial streaks, no arrows, static
- **Convective zones** → visible cells with curved flow arrows forming loops
- The **contrast** between those two treatments, sitting adjacent, is what makes
  a stellar cutaway instantly readable

**Cell scale carries meaning.** Hundreds of tiny granules on a main-sequence
photosphere; a dozen enormous cells in a red giant envelope. Same primitive,
different scale, completely different read.

**Flares are the density showcase.** 3–30 prominences in 3 size tiers. This is
the trait most directly expressing the "many cheap elements" thesis, and v2's
handful of flares was the clearest failure of it.

**Most evocative outputs:**
- an old giant showing the absurd core-to-envelope size ratio
- a main star with the convective/radiative boundary and tachocline visible
- any star wearing a Dyson swarm
