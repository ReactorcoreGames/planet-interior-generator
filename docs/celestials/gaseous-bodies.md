# Gaseous Bodies

**Archetypes:** `gas-giant` · `ice-giant`

No surface to stand on. The cutaway story is **depth and pressure** — how far
down can you go before something crushes you, and what's floating at each level.

**Body tags:** `gaseous`, `has-atmosphere`

---

## gas-giant

> Enormous, banded, and hiding a small dense heart under thousands of
> kilometres of compressed hydrogen. Every level of the atmosphere is a
> different environment.

### Standard stack

| Layer role | Frac range | Optional | Boundary | Notes |
|---|---|---|---|---|
| `upper-cloud` | 0.97–1.02 | — | perfect circle | ammonia cirrus, the visible "surface" |
| `troposphere` | 0.86–0.96 | — | perfect circle | the banded zone; storms live here |
| `water-cloud` | 0.72–0.85 | presence: 2.0 (guaranteed at slider 0.5) | slight wobble | convective, lightning-active |
| `molecular-h` | 0.42–0.70 | — | slight wobble | compressed, warming with depth |
| `metallic-h` | 0.18–0.40 | — | near-perfect | conductive — the dynamo layer |
| `core` | 0.08–0.17 | — | near-perfect | small rock-ice, extremely hot |

**The outermost boundary is a perfect circle**, but it should be drawn as a
*soft gradient edge* rather than a hard line — there's no solid surface, and
the silhouette should suggest that.

The size contrast between the tiny core and the vast envelope **is the story**
and should be immediately visible.

### Colour profile

Hue free. The signature look is horizontal banding, so adjacent bands need
enough contrast to read as separate.

| Layer | Saturation | Lightness |
|---|---|---|
| upper-cloud | 0.20–0.55 | 0.65–0.90 |
| troposphere | 0.35–0.75 | 0.45–0.80 |
| water-cloud | 0.30–0.60 | 0.35–0.60 |
| molecular-h | 0.40–0.70 | 0.30–0.55 |
| metallic-h | 0.30–0.60 | 0.45–0.75 |
| core | 0.55–0.85 | 0.70–0.95 |

`secondaryRel: "analogous"` — gas giants read better with a harmonious hue
family than a hard complement.

**Band colouring:** within the troposphere, bands alternate between two derived
tones (a lighter "zone" and a darker "belt"). That alternation is most of what
makes a gas giant look like a gas giant.

### Layer details (always drawn)

| Layer | Elements | Count |
|---|---|---|
| upper-cloud | wispy cirrus streaks | 15–40 |
| troposphere | **cloud bands**, storm curls, flow arrows | 12–30 / 5–20 / 8–16 |
| water-cloud | convection cells, lightning glints | 15–35 / 10–30 |
| molecular-h | flow arrows, pressure gradient | 8–18 / — |
| metallic-h | swirl bands, conductive glints | 10–25 / 20–50 |
| core | dense stipple, compression rings | 150–300 / 3–6 |

The troposphere and water-cloud layers get **strong diagrammatic treatment** —
counter-rotating flow arrows between bands are exactly the "instructive
illustration" idea.

### Eligible traits

**Atmospheric:** great-storm · storm-belts · polar-vortex · calm-latitude ·
violent-banding · helium-rain · diamond-rain · tidally-locked

> **Tidal locking belongs here as much as on rocky worlds.** Hot Jupiters are
> the canonical locked bodies in real astronomy, and a gas giant with a
> permanent dayside storm complex, a supersonic terminator jet and a dark
> frozen nightside is one of the most striking things this generator can
> produce. Anchors to `upper-cloud` and `troposphere`.
>
> `polar-vortex` and `calm-latitude` are also zone modifiers — same primitive,
> `axis: "polar"` instead of `"equatorial"`. See
> [TRAIT-SYSTEM.md](../TRAIT-SYSTEM.md#angular-zones).

**Orbital:** ring-system · shepherd-moons · debris-belt · aurora ·
radiation-belt

**Interior:** *(none — see below)*

> **`oversized-core`, `coreless` and `twin-core` are all gone from this list.**
> The first two are the ends of the existing **Core size bias** slider: at −100
> the core shrinks until it dissolves into a diffuse concentration with no
> boundary (coreless), and at +100 it becomes a massive rocky heart. `twin-core`
> is cut outright. See
> [TRAIT-SYSTEM.md](../TRAIT-SYSTEM.md#remaining-structural-traits).
>
> Core size bias on a gas giant does one extra thing: at the low end the core's
> **boundary character** softens from `near-perfect` to a gradient, because a
> coreless giant has no discrete core to draw an edge around. That's the
> parameter changing the picture structurally, not just scaling a radius.

**Artificial:** gas-miner-platforms · orbital-cities · hab-flotilla ·
skyhook · orbital-ring

### Stats template

```
Size                  {km} across — {Jupiter/Earth comparison}
Gravity at cloud-top  {n}× Earth
Cloud-top temp        {n} °C
Depth to crush point  {km} — where a ship stops being a ship
Day length            {hours} — it spins fast
Atmosphere            Hydrogen and helium. Nothing to breathe.
Biggest danger        {hazard}
```

- **Radius:** 45,000–95,000 km
- **Gravity (cloud-top):** 0.9–6 g
- **Cloud-top temperature:** −180 to −60 °C
- **Stand on it?** **No — there is no surface.** It's gas all the way down until
  the pressure turns it to liquid metal.
- **Breathe?** No
- **The hook:** you can fly *into* it, and there are levels where the pressure
  and temperature are survivable

### Flavour

- "No ground anywhere. You fly in, and you fly back out, or you don't come back."
- "There's a band about a thousand kilometres down where the pressure and
  temperature are almost pleasant. Almost."
- "Its storm has been running longer than anyone has been watching."

---

## ice-giant

> Colder, smaller, and stranger than a gas giant. The mantle is a hot dense
> slush of water, ammonia and methane — sometimes called a "superionic ocean".

### Standard stack

| Layer role | Frac range | Optional | Boundary | Notes |
|---|---|---|---|---|
| `upper-cloud` | 0.97–1.02 | — | perfect circle | methane haze — the colour source |
| `troposphere` | 0.85–0.96 | — | perfect circle | fainter banding than a gas giant |
| `icy-mantle` | 0.35–0.84 | — | slight wobble | hot dense water/ammonia slush |
| `superionic` | 0.20–0.34 | 50% | near-perfect | exotic phase, conductive |
| `core` | 0.10–0.19 | — | near-perfect | rock and iron |

The `icy-mantle` is proportionally huge — it should dominate the picture the way
`molecular-h` does on a gas giant.

### Colour profile

Cooler and less contrasty than gas giants. Banding is subtle.

| Layer | Saturation | Lightness |
|---|---|---|
| upper-cloud | 0.30–0.65 | 0.60–0.85 |
| troposphere | 0.30–0.60 | 0.45–0.70 |
| icy-mantle | 0.25–0.55 | 0.30–0.55 |
| superionic | 0.35–0.65 | 0.50–0.75 |
| core | 0.40–0.70 | 0.55–0.85 |

Hue is free, but ice giants read best with a cool bias — worth a soft
constraint toward `[150, 280]` unless a trait overrides it.

### Layer details

| Layer | Elements | Count |
|---|---|---|
| upper-cloud | thin haze bands, methane wisps | 8–20 |
| troposphere | faint bands, occasional storm | 8–18 / 2–6 |
| icy-mantle | slow convection cells, flow arrows, density striations | 15–35 / 8–16 / 20–50 |
| superionic | conductive glints, ordered lattice hints | 30–70 |
| core | dense stipple | 150–250 |

The `superionic` layer is a chance for a genuinely alien-looking texture — a
faint regular lattice pattern, unlike anything else in the generator.

### Eligible traits

tilted-axis · faint-rings · storm-spots · diamond-rain · supersonic-winds ·
polar-vortex · debris-belt · aurora · gas-miner-platforms · orbital-platforms

> `tilted-axis` is a zone modifier with `axis: "polar"` and a non-zero `offset`,
> so its bands sit skewed from the poles and the two hemispheres read
> asymmetrically. `polar-vortex` is the same primitive without the offset. See
> [TRAIT-SYSTEM.md](../TRAIT-SYSTEM.md#angular-zones).

### Stats

- **Radius:** 20,000–30,000 km
- **Gravity (cloud-top):** 0.8–1.4 g
- **Cloud-top temperature:** −220 to −180 °C
- **Stand on it?** No
- **Breathe?** No
- **The hook:** the mantle is an ocean of something that isn't quite water,
  under pressure that makes diamonds fall like rain

### Flavour

- "Cold enough that the methane in the air paints it blue."
- "The mantle isn't ice and isn't water — it's something in between that only
  exists under this much pressure."
- "Somewhere down there, it rains diamonds."

---

## Family notes

**Shared vocabulary:** both use `upper-cloud`, `troposphere`, `core` and the
cloud-band / storm-curl / flow-arrow detail family. The difference is what
fills the middle — compressed hydrogen versus an exotic icy slush.

**The banding is the signature.** Getting alternating zone/belt bands to look
right, with counter-rotating flow arrows between them, is the single most
important visual for this family.

**Depth is the story.** Unlike solid bodies where the question is "what's at the
centre", here it's "how far down can you get". Stats and flavour should lean
into that — pressure levels, survivable depths, what floats where.

**Most evocative outputs:**
- a gas giant with a great storm and a full ring system
- an ice giant showing the superionic lattice layer
- either with orbital mining infrastructure — the industrial sci-fi look
