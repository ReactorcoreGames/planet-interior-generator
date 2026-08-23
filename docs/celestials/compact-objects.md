# Compact Objects

**Archetypes:** `neutron-star` · `pulsar` · `black-hole`

Stellar corpses. Tiny, absurdly dense, and dangerous at a distance. The cutaway
story is **extremity** — matter in states that don't exist anywhere else.

**Body tags:** `compact`, `stellar-remnant`, `luminous` (except black holes)

---

## Family colour rule

Compact objects are **low saturation, very high brightness**. Hue is free but
the effect should read as "so hot the colour barely matters" — a white-hot core
with a faint hue tint, rather than a strongly coloured body.

Exception: black holes invert this — the body itself is pure black, and all
colour lives in the disc and jets around it.

## Scale problem

A neutron star is ~20 km across. A red giant is ~50,000,000 km. Rendered at the
same canvas size, that's meaningless. **The scale bar is essential for this
family**, and the "city-sized" comparison is one of the most effective things
the tool can communicate.

---

## neutron-star

> The collapsed core of a dead giant star, packed into something the size of a
> city. A teaspoon of it weighs as much as a mountain range.

### Standard stack

| Layer role | Frac range | Optional | Boundary | Notes |
|---|---|---|---|---|
| `magnetosphere` | 1.00–1.60 | — | soft gradient | extreme magnetic field |
| `atmosphere` | 0.99–1.00 | — | perfect circle | **centimetres thick** — a hairline |
| `outer-crust` | 0.94–0.98 | — | perfect circle | crystalline iron lattice |
| `inner-crust` | 0.85–0.93 | — | perfect circle | neutron-rich, "nuclear pasta" |
| `outer-core` | 0.35–0.84 | — | perfect circle | neutron superfluid |
| `inner-core` | 0.10–0.34 | presence: 2.0 (guaranteed at slider 0.5) | perfect circle | unknown physics — quark matter? |

**Everything is a perfect circle.** Gravity this strong makes the body almost
perfectly spherical — surface irregularities are measured in millimetres. That
geometric perfection is characterful and worth committing to.

The `atmosphere` layer being a literal hairline is a great detail — draw it as
a 1–2px bright line and let the stats explain it.

### Colour

| Layer | Saturation | Lightness |
|---|---|---|
| magnetosphere | 0.25–0.55 | 0.40–0.70 |
| atmosphere | 0.05–0.25 | 0.95–1.00 |
| outer-crust | 0.05–0.20 | 0.75–0.95 |
| inner-crust | 0.05–0.25 | 0.65–0.85 |
| outer-core | 0.10–0.30 | 0.80–0.95 |
| inner-core | 0.15–0.40 | 0.90–1.00 |

Near-white throughout with a faint hue wash.

### Layer details

| Layer | Elements | Count |
|---|---|---|
| magnetosphere | field lines, charged-particle glints | 12–30 / 40–120 |
| outer-crust | **crystalline lattice pattern** | 100–300 |
| inner-crust | **"nuclear pasta" striations** — rods and sheets | 40–120 |
| outer-core | superfluid vortex lines | 30–80 |
| inner-core | extremely dense stipple | 300–500 |

**Nuclear pasta** is a real and wonderfully weird phenomenon — nuclear matter
arranged into rods, sheets and tubes. Drawing it as ordered striations gives
this archetype a texture nothing else has.

Magnetic field lines should be drawn as looping curves from pole to pole — the
only archetype where field geometry is visible.

### Eligible traits

glitching · accretion-stream · binary-companion · starquake-scars ·
research-station (artificial)

> **`magnetar` and `cooling-crust` are parameter ends.** **Field strength**
> (0–100%) drives magnetosphere extent, field-line count and twist, and
> particle-glint density — a magnetar is simply the top of that range, and the
> values between are perfectly good neutron stars. **Surface heat** covers
> `cooling-crust` at its low end, pulling crust lightness and temperature stats
> down together.

### Stats

```
Size                  ~{20} km across — you could walk around it in an afternoon,
                      if walking on it were survivable
Mass                  ~1.4× our Sun, in a ball the size of a city
Gravity               ~200 billion × Earth
Surface temperature   ~600,000 °C
Spin                  {n} rotations per second
Density               A teaspoon would weigh about a billion tonnes
Biggest danger        Everything. Tidal forces shred matter before it lands.
```

- **Radius:** 10–13 km
- **Stand on it?** No. You would be flattened to atoms before touching it.
- **The hook:** the densest thing in the universe short of a black hole, and we
  don't know what's at the centre

### Flavour

- "A city-sized ball with more mass than the sun. Physics stops making sense here."
- "It spins hundreds of times a second and the surface is smoother than glass."
- "Nobody knows what the core is made of. The answer is somewhere between
  'neutrons' and 'something we don't have a name for'."

---

## pulsar

> A neutron star with a lighthouse. Same structure, but the magnetic axis is
> tilted, and the beams make it visible across the galaxy.

### Standard stack

Identical to `neutron-star`, plus:

| Layer role | Frac range | Optional | Boundary | Notes |
|---|---|---|---|---|
| `beam-cone` | 1.00–2.50 | — | cone | **twin beams along the magnetic axis** |
| `light-cylinder` | 1.30–1.80 | 50% | perfect circle | where co-rotation hits light speed |

**The beams are the archetype.** Two opposed cones of emission along an axis
**tilted 15–60° from the rotational axis** — that tilt is why it pulses, and it
should be visible.

Since the body is generated pointing "up" (rotational axis vertical), the beam
axis is drawn at an angle to that, which reads immediately as "this is tilted".

### Colour

Same as neutron star, plus the beams:

| Layer | Saturation | Lightness |
|---|---|---|
| beam-cone | 0.35–0.70 | 0.75–1.00 |
| light-cylinder | 0.20–0.45 | 0.50–0.70 |

Beams should be the brightest thing in the image, with a soft gradient falloff
along their length and a hot core.

### Layer details

Neutron-star details, plus:

| Layer | Elements | Count |
|---|---|---|
| beam-cone | radial emission streaks, particle glints | 30–80 / 50–150 |
| magnetosphere | **twisted field lines** following the tilt | 15–35 |

### Eligible traits

glitching · binary-companion · accretion-stream ·
navigation-beacon (artificial — pulsars make excellent galactic GPS)

> `planetary-system` removed for the same reason as on main stars — pulsar
> planets are real and eerie, but they aren't visible in a cutaway of the pulsar.
> Excellent **flavour text and stats** material, though; keep it there.

> Shares **Field strength** and **Surface heat** with `neutron-star`, plus
> **Spin rate** (0–100%), which covers `millisecond-spin` at its top end and
> drives beam-cone width, light-cylinder radius and the pulse-period stat.
> **Beam tilt** (15–60°) stays its own control — it's the archetype's signature
> and deserves to be directly dialable.

### Stats

Neutron-star stats, plus:

```
Pulse period          {n} times per second — {comparison}
Beam tilt             {n}° from the spin axis
Detectability         Visible across the galaxy if a beam points your way
```

### Flavour

- "A lighthouse that has been running since before there were eyes to see it."
- "The pulse is so regular you could set a clock by it. People do."
- "If a beam sweeps across you at close range, nothing survives it."

---

## black-hole

> Not a body — a hole. Everything visible is the material falling in. The
> cutaway is the strangest one in the generator: there's nothing inside to draw.

### Standard stack

| Layer role | Frac range | Optional | Boundary | Notes |
|---|---|---|---|---|
| `accretion-disc` | 1.50–6.00 | presence: 2.0 (guaranteed at slider 0.5) | disc (edge-on band) | the bright part |
| `jets` | 1.00–5.00 | 40% | cone | polar, along the spin axis |
| `photon-sphere` | 1.30–1.55 | — | perfect circle | light orbits here |
| `event-horizon` | 0.95–1.00 | — | perfect circle | **the boundary — pure black** |
| `singularity` | 0.00–0.02 | — | point | a marked point; unknowable |

**Inside the event horizon, draw nothing.** Pure black, no texture, no detail.
That emptiness is the correct and most striking choice — every other archetype
is full of structure, and this one is a void.

The interior can carry a single faint annotation-free marker at the centre for
the singularity, and nothing else.

### Colour

Inverted from the family rule — the hole is black, everything around it is
brilliant.

| Layer | Saturation | Lightness |
|---|---|---|
| accretion-disc (inner) | 0.20–0.50 | 0.90–1.00 |
| accretion-disc (outer) | 0.55–0.85 | 0.45–0.75 |
| jets | 0.30–0.65 | 0.80–1.00 |
| photon-sphere | 0.15–0.40 | 0.85–1.00 |
| event-horizon | 0.00 | 0.00 |

**Disc temperature gradient:** the inner disc is white-hot and the outer disc
cooler and more saturated. That gradient along the disc is the signature look.

### Layer details

| Layer | Elements | Count |
|---|---|---|
| accretion-disc | orbital streaks, hot spots, turbulence | 60–200 / 10–30 / 30–80 |
| jets | collimated streaks, shock knots | 40–100 / 5–15 |
| photon-sphere | thin bright ring, light-bending arcs | 1 / 6–20 |
| event-horizon | — (nothing) | 0 |

The disc should be **dense** — hundreds of orbital streaks at varying radii and
brightness. It's the main visual and deserves the element budget.

### Eligible traits

rapid-spin · relativistic-jets · tidal-disruption-event · binary-companion ·
gravitational-lensing · research-station ·
energy-extraction-array (artificial — Penrose process harvesting)

> **`feeding` and `dormant` are the ends of one axis, not two traits** — and
> they'd have to exclude each other, the usual tell. **Accretion rate** (0–100%)
> drives disc presence, disc brightness and density, jet strength, and the
> inner-disc temperature gradient together. At 0 the disc is absent and the
> image is almost entirely black — a bold and correct output. At 100 it's a
> blazing dense disc with jets.
>
> **`supermassive` and `stellar-mass` are a scale parameter**, not traits
> either. **Mass class** sets horizon radius and every derived stat; it is the
> archetype's most important number, since it spans 3 km to 10,000,000+ km.
> Offered as presets (*Stellar-mass* / *Intermediate* / *Supermassive*) because
> the interesting values are orders of magnitude apart.

### Stats

```
Size                  Event horizon {n} km across
Mass                  {n}× our Sun, compressed past the point of return
Gravity               Beyond meaningful measurement at the horizon
Accretion disc temp   Up to {n} million °C at the inner edge
Time                  Runs measurably slower near the horizon
Point of no return    {n} km — past this, no course correction helps
Biggest danger        Everything, from further away than you think
```

- **Radius (horizon):** 3 km (stellar-mass) to 10,000,000+ km (supermassive)
- **Stand on it?** There is nothing to stand on.
- **The hook:** the disc is the most energetic environment in the universe, and
  something might be *using* it

### Flavour

- "The black part isn't a surface. It's just where light stops coming back."
- "The disc is bright enough to see from another galaxy. The hole itself is
  invisible."
- "Time runs slower the closer you get. Long enough down there and everyone you
  knew is dead."

---

## Family notes

**Perfect circles everywhere.** Gravity this extreme means no wobble. Combined
with the near-white low-saturation palette, compact objects should look
*clinical* — a deliberate contrast against the organic wobble of planets and
the chaos of nebulae.

**Exotic textures are the payoff.** Nuclear pasta, superfluid vortices, photon
spheres, accretion streaks — this family gets textures that appear nowhere else.
Worth building custom primitives for.

**The void is a feature.** A black hole cutaway with nothing inside is the
boldest image the generator can produce, and the temptation to fill it should be
resisted.

**Most evocative outputs:**
- a neutron star with the nuclear-pasta layer clearly visible
- a tilted pulsar with both beams and twisted field lines
- a feeding black hole with a dense hot disc and relativistic jets
