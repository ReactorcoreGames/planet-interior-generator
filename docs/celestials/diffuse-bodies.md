# Diffuse Bodies

**Archetype:** `nebula`

Clouds, not objects. The one family with no hard edges anywhere. The cutaway
story is **regions and pockets** — where it's thick, where it's empty, and what
is hiding in the dense parts.

**Body tags:** `diffuse`, `no-surface`

---

## nebula

> A cloud light-years across, with dense knots, sparse voids, and stars forming
> inside it. The Freelancer-style "interesting terrain to fly through".

### The key insight

**A nebula still has layers** — sparse outer region, denser inner region,
densest core region. What makes it look like a nebula rather than a planet is
**extreme boundary wobble**, not different structure.

This was an important simplification: one layout model covers everything in the
generator. A nebula is a planet with the wobble turned up to absurd levels and
the opacity turned down.

### Standard stack

| Layer role | Frac range | Optional | Boundary | Notes |
|---|---|---|---|---|
| `halo` | 1.10–1.60 | — | **extreme wobble** | barely-there outer wisps |
| `sparse-region` | 0.75–1.09 | — | **extreme wobble** | thin gas, mostly empty |
| `dense-region` | 0.35–0.74 | — | **extreme wobble** | the visible bulk |
| `core-region` | 0.10–0.34 | — | **extreme wobble** | densest knots |
| `protostars` | 0.0–0.30 | 70% | points | forming stars embedded inside |

Every boundary uses wobble amplitude far beyond any other archetype — enough
that the layers interpenetrate and no clean ring structure is visible. The
layers should read as *regions blending into each other*, not shells.

<a name="shell-stack"></a>

### The shell stack (structural branch)

Planetary nebulae and supernova remnants **invert the stack's core assumption**
— they're empty in the middle, thrown outward by a dead star. No value of any
parameter expresses that, so it's a genuine second stack:

| Layer role | Frac range | Optional | Boundary | Notes |
|---|---|---|---|---|
| `outer-shock` | 1.00–1.45 | 70% | extreme wobble | leading edge of the expansion |
| `shell` | 0.55–0.99 | — | heavy wobble | **the bright ring** — the material itself |
| `cavity` | 0.10–0.54 | — | soft gradient | **swept empty** — near-transparent |
| `remnant-star` | 0.02–0.09 | — | near-perfect | white dwarf, neutron star or pulsar |

The `cavity` is the point: a nearly empty centre with a single brilliant
pinprick at the middle. Because a cutaway shows the interior, this reads as a
*ring* — which is exactly what these objects look like, and a striking contrast
against every other body in the generator being densest at the core.

The `remnant-star` may embed a `pulsar` from the compact-objects family — the
generator's one cross-family composition.

All layers are **partially transparent**, so inner regions show through outer
ones. That overlapping translucency is most of what sells the look.

### Colour

Nebulae get the widest colour freedom in the generator. Emission nebulae are
genuinely vivid, so high saturation is appropriate.

| Layer | Saturation | Lightness | Opacity |
|---|---|---|---|
| halo | 0.30–0.65 | 0.20–0.45 | 0.10–0.25 |
| sparse-region | 0.40–0.75 | 0.30–0.55 | 0.20–0.40 |
| dense-region | 0.50–0.85 | 0.40–0.70 | 0.35–0.60 |
| core-region | 0.55–0.90 | 0.55–0.85 | 0.50–0.80 |
| protostars | 0.10–0.40 | 0.90–1.00 | 1.00 |

**Multi-hue is encouraged here.** Unlike other archetypes where 2–3 anchors keep
things harmonious, a nebula can carry 3–4 hues (different emission lines really
do produce different colours) as long as they're related. A red-and-teal or
gold-and-violet nebula is exactly right.

`secondaryRel: "triad"` works well for this archetype specifically.

### Layer details (always drawn)

| Layer | Elements | Count |
|---|---|---|
| halo | faint wisps, scattered motes | 30–80 / 200–500 |
| sparse-region | filaments, dust motes | 40–100 / 300–700 |
| dense-region | **billowing blobs**, filaments, dark lanes | 30–80 / 50–120 / 8–25 |
| core-region | dense knots, bright rims | 20–50 / 15–40 |
| protostars | point sources with glow halos | 3–15 |

**Dark lanes** are essential — bands of obscuring dust cutting across the bright
regions. They're what gives real nebulae their structure and depth, and they're
cheap to draw (dark irregular bands at low opacity).

This is the highest element-count archetype in the generator. Thousands of small
faint elements layered over each other is precisely the density thesis.

### Eligible traits

**Structure:** dark-lanes · pillars (the "Pillars of Creation" look) ·
bow-shocks · cavity (blown out by stellar wind) · filament-web

**Contents:** protostar-cluster · embedded-star · debris-fields ·
ice-belts · rock-belts · metal-belts · exotic-gas-pockets

**Type character:** *not traits — see below*

**Artificial:** hidden-station · mining-flotilla · derelict-fleet

> `pirate-haven` and `sensor-shadow` removed — neither draws anything a
> `hidden-station` in a `cavity` doesn't already draw. They're **story labels**
> for the same picture, so they belong in the flavour and hazard text. Test 2:
> if it isn't visible at a glance, it isn't a trait.

### Nebula character: a parameter, not five traits

The five "type character" entries were specified as traits, but they're
mutually exclusive by nature — a nebula is emission *or* reflection *or* dark,
never a mix — which is the signature of an **axis wearing trait clothing**.
Worse, as traits they'd need five `excludes` entries pointing at each other.

**Luminosity source** — one parameter, 0–100%:

| Value | Reads as | Mechanism |
|---|---|---|
| 0 — **dark** | Obscuring dust, silhouetted | Layers near-opaque, very low lightness, no internal sources |
| 35 — **reflection** | Soft, cool, lit from outside | Moderate opacity, cooler hue bias, lightness from an external direction |
| 100 — **emission** | Vivid, glowing from within | High saturation, high lightness, protostars present and lighting their surroundings |

This slider drives opacity, lightness, hue bias and whether internal light
sources exist — all at once, which is what makes it read as a coherent kind of
nebula rather than a brightness control.

The remaining two are **structural**, so they stay separate — but as presets
selecting a different layer stack, not as traits:

- **Planetary nebula** — ring/shell structure thrown off by a dying star, with
  a white dwarf at the centre. Genuinely different stack: a hollow shell rather
  than a filled gradient.
- **Supernova remnant** — expanding shockwave shells, filament webs, and a
  `pulsar` or `neutron-star` at the heart. Also a shell structure, plus a
  cross-family embedded body.

Both invert the nebula's core assumption — that density rises inward. A shell
nebula is **empty in the middle**, which no value of Luminosity source can
express. That's the same test the ice-shelled moon passed.

### The "explorable terrain" angle

This is the archetype closest to the original Freelancer inspiration — an
environment with mixed terrain that's interesting to move through.

The `debris-fields`, `ice-belts`, `rock-belts`, `metal-belts` and
`exotic-gas-pockets` traits should place **scattered material regions** within
the nebula's layers, each visually distinct:

| Trait | Look |
|---|---|
| ice-belts | pale blue-white angular chunks, glinting |
| rock-belts | dark irregular chunks, matte |
| metal-belts | small bright specular glints, denser clusters |
| exotic-gas-pockets | small vivid off-hue blobs, higher saturation than surroundings |
| debris-fields | mixed chunk sizes, scattered wide |

Combined with `cavity` and `dark-lanes`, this gives the "mixed terrain worth
exploring" feel — pockets of different material, voids to hide in, dense regions
to avoid.

### Stats template

Nebula stats need a completely different template — most normal measures don't
apply.

```
Size                  {n} light-years across — {travel time comparison}
Density               Thinner than the best vacuum we can make on Earth
Composition           {gases}, plus dust
Temperature           {n} °C in the bright regions, near absolute zero in the dark
Visibility            {how far you can see inside}
Navigation            {hazard rating — what makes flying through it hard}
What's inside         {protostars / debris / pockets / nothing}
```

- **Size:** 1–100 light-years
- **Gravity:** effectively none
- **Stand on it?** There is nothing to stand on — you fly through it
- **Breathe?** No, and it's thinner than vacuum anyway
- **The hook:** it's big enough to hide a fleet in, and dense enough to blind
  sensors

**Important framing:** a nebula is *less dense than a laboratory vacuum* — it
only looks solid because it's enormous. That counterintuitive fact is a great
stat line and a useful plot device.

### Flavour

- "It looks solid from outside. Inside, it's thinner than any vacuum you could
  make in a lab — it just goes on for light-years."
- "Sensors are useless in the dense regions. So are long-range comms."
- "Stars are forming in the core. Some of them have only been burning a few
  thousand years."
- "A good place to disappear, if you don't mind not being found either."

---

## Family notes

**Extreme wobble is the whole trick.** Same concentric structure as everything
else, with the boundary irregularity turned up until it stops reading as
concentric. Worth verifying early that the wobble system can go far enough.

**Translucency and overlap.** Unlike every other archetype, nebula layers are
semi-transparent and overlap visibly. The renderer needs to handle per-layer
opacity properly for this family.

**Highest element budget.** Thousands of small faint elements. If the density
system works here, it works everywhere.

**Nebula sub-types are parameters and presets**, never separate archetypes:
- *Emission · Reflection · Dark* — three points on the **Luminosity source**
  slider, so the space between them is reachable too
- *Planetary nebula · Supernova remnant* — presets selecting the **shell stack**
  (hollow centre), since "empty in the middle" is structural

That last one is a nice cross-family link: a supernova remnant can contain a
`pulsar` from the compact-objects family.

**Most evocative outputs:**
- a pillared emission nebula with embedded protostars
- a supernova remnant with a pulsar at its heart
- a dark nebula with a hidden station in a cavity
