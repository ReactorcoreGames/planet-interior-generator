# Architecture

*How the system fits together. Supersedes DESIGN-NOTES.md — every open question
there has been answered and folded in here as a decision.*

---

## Technical ground rules

Locked. See [CLAUDE.md](../CLAUDE.md) for the full list and reasoning.

- Plain HTML/CSS/JS, ordinary `<script>` tags, explicit load order
- **No ES modules, no bundler, no compile step**
- Canvas 2D for rendering
- Vendored single-file libraries only (`simplex-noise`, `d3-delaunay`)
- ≤500 lines per file
- `build_release.bat` **copies** files into `dist/` — never compiles

---

## The pipeline

One generic renderer, driven entirely by data. **Body types never get their own
drawing code.** An archetype is a recipe that produces a description of what to
draw; the renderer knows nothing about planets or stars.

```
seed
  ↓
ARCHETYPE      which body type (planet / gas giant / main star / …)
  ↓
STRUCTURE      the standard layer stack for that type, with rolled thicknesses
  ↓
TRAITS         rolled or user-chosen; structural traits may modify the stack
  ↓
COLOUR         2–3 HSV anchors + per-layer derivation
  ↓
DETAIL         layer details + trait instances, expanded to hundreds of elements
  ↓
STATS + TEXT   derived from structure and traits, phrased for laypeople
  ↓
RENDER         generic; draws whatever the description says
```

Each stage draws from its own RNG stream off the master seed, so changing the
colour nudge doesn't reshuffle the structure, and re-rolling traits doesn't
rename the body. *(Carried over from v2, where it worked well.)*

---

## Layer structure — standard stacks, not a layer-count slider

**Decision:** the "how many layers?" slider is **removed**.

v2 let the user pick a layer count, which produced nonsense like "Mantle I /
Mantle II" and "Crust I / Crust II". Real bodies have a characteristic
structure: a planet has core → outer core → mantle → crust → surface →
atmosphere, and that's simply what a planet *is*.

Each archetype declares its **standard stack**. What varies per body:

- **Thickness** of each layer, rolled within per-layer min/max ranges
- **Presence** of optional layers (a planet may or may not have an atmosphere)
- **Structural traits** that add, remove, or subdivide layers

Layer thickness is rolled **independently of traits** — traits attach to
whatever thickness came out.

### Layer properties

The full set a layer may declare. The structure stage produces these; the
renderer consumes them and knows nothing about what kind of body it's drawing.

| Property | Type | Meaning |
|---|---|---|
| `role` | string | Layer identity — drives details, colour profile, label |
| `frac` | `[min, max]` or object | Outer radius. See **Thickness** below |
| `presence` | omitted, number, or object | Whether the layer exists at all. See **Presence** below |
| `modulate` | object or array | A parameter nudges this layer's radius, e.g. the crust thinning as the interior heats |
| `bias` | string | A named control pushes the roll within the layer's range (`coreBias`) |
| `boundary` | enum | `perfect` · `near-perfect` · `slight` · `irregular` · `heavy` · `extreme` · `soft-gradient` |
| `outward` | bool | Drawn as a falloff beyond the surface rather than a filled band (atmosphere, corona) |
| `opacity` | `[min, max]` | Below 1.0 the layer is translucent and inner layers show through (nebulae) |
| `gapBelow` | `[min, max]` | A true void under the layer, raised out of its own bottom after renormalization; the layer is then drawn as a ring (D248, `js/gen/shells.js`) |
| `pillars` | `[min, max]` | Evenly spaced radial supports across that void, at Detail density 0 and 1, scaled by radius |
| `shafted` | bool | The archetype's `shafts` (access routes, shared bearings) cut through this layer |
| `conduits` | `{ count, depth, bridge, within, length }` or a list | Feeds entering through the layer's outer face from the layer above, each ending at its own depth within `depth` and plugged into the layer above at its inner edge (across any void between). Without `bridge`: one down the middle of each open gap its claims leave, widest first; with `bridge: [lo, hi]`: between the pillars of the void above, reaching that share up into the layer above, clear of its claims; with `within: true`: lying wholly inside the layer, `length` a share of the `depth` span. Rings passed through are sleeved (D262, `js/gen/conduits.js`) |
| `capacitors` | `{ count, size, depth, blend, opacity }` | Electrolytic cans on the layer, three size tiers, clear of its conduits, claims and shafts (D263, `js/gen/capacitors.js`) |
| `lit` | `[wake, full]` | With the archetype's `activity`: the level at which the layer's first lights come on and the level by which all are on. Stamps `live`, `emergency`, `busy` and `activity` onto the layer (D264, `js/gen/activity.js`) |
| `luminous` | bool | Ignores any global shading pass (stars, compact objects) |

#### Presence — one property, three forms

**This is load-bearing.** A layer's existence is resolved through a single
function whichever form it declares, which is what keeps parameter-driven
layers from becoming special cases in the stack builder.

| Form | Declaration | Meaning |
|---|---|---|
| Unconditional | *(omit `presence`)* | Always present |
| Probability | `presence: 0.8` | An 80% roll, scaled by the **Optional layers** slider |
| Parameter | `presence: {param, above, fade}` | Present only while that parameter exceeds a threshold; `fade` gives a soft entry |

Ocean depth and Interior heat were the first two users of the parameter form.
(Operational status and Hull integrity, planned to use it, were built instead
as `dials` relabels driving the archetype properties below.)

**The roll is consumed whether or not the layer survives.** Otherwise removing
a layer reshuffles every layer below it and the same seed stops producing the
same body.

#### Thickness — likewise three forms

| Form | Declaration | Meaning |
|---|---|---|
| Rolled | `frac: [min, max]` | Outer radius, scaled by **Layer thickness variation** |
| Relative | `frac: {param, over, depth}` | Sits *on top of* another layer. `over: "surface"` means the outermost non-outward layer, whatever that turned out to be |
| Fill | *(omit `frac`)* | Innermost layer only — runs from the layer above to the centre |

The relative form exists because an ocean floats on whatever crust the body
rolled: that is a relationship, not a coordinate. Authored as an absolute
radius, an unlucky crust roll put the ocean *below* the crust and the ordering
clamp then disturbed the interior. The atmosphere uses the same mechanism,
which is how it sits on rock for a desert world and on water for an ocean
world without either being special-cased.

**After the stack is built it is renormalized so the surface is exactly 1.0**,
since adding an ocean on top of the crust would otherwise make an ocean world
render fractionally larger than a desert one. Everything downstream can rely on
"1.0 means the surface".

#### Archetype properties for built bodies

Declared on the archetype, beside `stack` and `colorProfile`. Each is general: a body declaring none is untouched.

| Property | Type | Meaning |
|---|---|---|
| `shafts` | `{ count, width, doors, covers }` | Access routes: bearings shared by every `shafted` layer, width in body radius (D248, `js/gen/shells.js`). `doors: { thick }` adds an airlock pair where a shaft crosses each shell, `covers: { thick }` a silo cover over its mouth, each open or shut by `activity` (D274, `js/gen/shaftdoors.js`) |
| `activity` | `{ param }` | The named parameter is how alive the body is; with each layer's `lit`, it decides which lights are on, dark or on emergency power (D264–D266, `js/gen/activity.js`). Which light is a stable hash of its position (`CC.Activity.gate`), never a stream draw |
| `rupture` | `{ param, start, depth, width, count, edge, pipes }` | Wounds torn out of the outer layers as the named parameter falls below `start`: `depth` and `width` from the onset to 0, 1–`count` wounds, each a stepped funnel clipped out of the body's draw (D267–D268, `js/gen/rupture.js`). `edge` names the cut faces' style, registered in `js/gen/woundedge.js` (`"torn"`, default; `"clean"`, Under construction's building sites, D273); `pipes` lists the layers whose faces show severed pipe (D269) |
| `overgrowth` | `{ cover, proud, creep, hang, pool, wither }` | Moss or a rust bloom over the outermost layer's face, down the shafts, hung in the outer void and pooled in the wounds; `cover` by Detail density, `wither` by `activity` (D275, `js/gen/overgrowth.js`) |
| `bore` | `{ width, cap, muzzle, coils }` | One cannon barrel on a bearing clear of the shafts, from the heart out past the surface, ringed with coil stages; charged by the innermost layer's `live` (D276, `js/gen/bore.js`) |
| `engines` | `{ bells, bell, mount, reach, depth }` | A cluster of drive bells on one bearing, aft of any `bore`, a thrust frame down to `depth` and a plume; fired by the innermost layer's `live` (D277, `js/gen/engines.js`) |
| `dials` | `{ param: { label, ... } }` | Relabels an existing control for this archetype (Interior heat → Operational status, Cohesion → Hull integrity) |

**A trait can set these too.** A trait's `sets` merges structure data over the archetype's own, one key deep, before the detail stage reads it (D272, `js/gen/traitsets.js`): Under construction is `sets: { rupture: { edge: "clean" } }`, and `overgrowth`, `bore` and `engines` are declared by no archetype today, only switched on by the machine world's Overgrown, Weaponized and Worldship. Nothing anywhere asks which trait is on.

`gapBelow`, `pillars`, `shafted`, `conduits`, `capacitors`, `lit`, `activity`, `rupture`, `overgrowth`, `bore` and `engines` are **generic properties, not machine-world
special-casing.** (They replace the spec's `shell` + `gap` above-and-below, D248.) Only machine worlds use them today, but the renderer
implements them as ordinary layer geometry — which is what keeps the "body types
never get their own drawing code" rule intact.

---

## Archetypes

**Decision:** keep the list general. Specific varieties (desert world, ocean
world, volcanic world) are *traits and colour profiles*, not separate types.

| Family | Archetypes |
|---|---|
| Solid | planet · moon/planetoid · asteroid (large) |
| Gaseous | gas giant · ice giant |
| Stars | young star · main star · old giant star · dwarf star |
| Compact | neutron star · pulsar · black hole |
| Diffuse | nebula |
| Artificial | machine world |

Rejected as too specific: *rocky · ocean world · desert world · volcanic world ·
red giant · white dwarf.* A "red giant" is an old giant star that rolled warm
colours; an "ocean world" is a planet with its Ocean depth parameter turned up,
offered as a preset.

### Nebulae and asteroids use the same concentric model

**Decision:** no second layout mode. Both genuinely have layers:

- **Nebula** — sparse outer region, denser inner region, densest core region.
  What makes it look like a nebula is *extreme* boundary wobble, not a
  different structure.
- **Asteroid** — dusty surface film, hardened outer shell, chaotic interior of
  rock and mineral deposits. Heavy wobble on the outer shell plus a Voronoi
  mosaic interior in 2–4 muted colours.

This is a significant simplification: one layout model covers everything.

---

## Boundary character

**Decision:** the outermost boundary carries **no wobble**. A body's silhouette
reads as a sphere; wobbling it makes it look like a potato. This is a rule
about *wobble* — v2's crude global boundary noise, since removed — and not
about surface relief.

**Terrain is exempt, and does shape the silhouette.** The v3 terrain system
(see [PROGRESS.md](PROGRESS.md) D15) sits on a properly circular underlying
crust and produces landforms rather than lumps, which is what makes an airless
world read as a landscape instead of a flat disc. On the outermost layer its
amplitude is damped to ~55%, because a boundary read against empty space
carries far more visual weight than one between two filled bands. See D17 —
this reverses a stricter earlier reading that suppressed relief there entirely.

Gas giants keep the clean circle: they have no solid surface to carry relief,
and their outermost boundary is drawn as a soft edge in any case.

Inner boundaries vary by what makes physical sense:

| Layer | Boundary |
|---|---|
| Planet surface | No wobble; carries terrain relief, damped |
| Gas giant surface | Perfect circle (soft edge) |
| Crust | Near-perfect (thin rigid shell) |
| Mantle | Irregular (convective, genuinely uneven) |
| Core | Near-perfect (pressure rounds it) |
| Stellar photosphere | Slight wobble |
| Convective zone | Irregular |
| Asteroid outer shell | Heavy wobble |
| Nebula regions | Extreme wobble |

Each layer declares its own wobble amount. There is no global wobble slider —
v2's "boundary wobble" control was over-stylized and is removed.

---

## Proportions are stylized, not physical

**Decision:** layer thicknesses are authored at roughly **textbook-diagram**
proportions — the proportions of a school science poster, not a measurement.

On a real planet the crust is about 0.5% of the radius and the atmosphere is a
hairline. Drawn honestly they are invisible slivers with nowhere to put the
traits, cities, ice caps and ocean detail that are the entire point of a
cutaway. A cutaway exists to show what's inside; a layer too thin to show
anything has failed at its only job.

For `planet`, that means roughly:

| Layer | Share of radius |
|---|---|
| atmosphere | ~11% |
| ocean | ~6%, up to ~12% at maximum depth |
| crust | ~7%, thinning to ~5% under a deep ocean |
| mantle | ~40% — still visibly the bulk |
| outer core | ~18% |
| core | ~29% |

The mantle stays dominant so the picture stays believable. This is
[PROJECT-VISION](PROJECT-VISION.md)'s "believable beats accurate" applied to
geometry.

**Consequences when authoring a new archetype:**

- Exaggerate any layer that would otherwise be a sliver, and check the result
  by rendering rather than by arithmetic.
- **Stats must be derived from these radii**, so the numbers agree with the
  picture. Never quote a real-world figure against a drawn layer this thick.
- **Element counts are authored against these thicknesses.** A count that
  looked dense in a hairline crust will look sparse in one seven times thicker.

---

## Colour

**Decision:** no fixed palettes. Colours are generated from HSV profiles.

Each archetype declares **saturation and lightness profiles per layer**, but
hue is free (or loosely constrained). This is the key move: a star can be any
colour, but *how saturated and how bright each of its layers is* follows the
rules for that type of star.

```js
colorProfile: {
  hue: [0, 360],                  // free — any colour star
  secondaryRel: "analogous",      // how the core hue relates to the surface

  // REQUIRED. Declared surface-to-centre order. Colour is derived from a
  // layer's position in THIS list, never from its measured radius.
  order: ["photosphere", "convective", "radiative", "core"],

  layers: {
    photosphere:  { sat: [0.55, 0.85], val: [0.80, 1.00], incandescent: true },
    convective:   { sat: [0.60, 0.90], val: [0.65, 0.85], incandescent: true },
    radiative:    { sat: [0.50, 0.80], val: [0.55, 0.75] },
    core:         { sat: [0.30, 0.60], val: [0.90, 1.00], incandescent: true }
  }
}
```

Examples of the principle:

- **Young star** — strong saturation, high brightness throughout
- **Old giant star** — diminished saturation, slightly diminished brightness,
  falling off further toward the outer layers
- **Planet** — low saturation and medium brightness in outer layers; inner
  layers gain saturation if the core is hot or tectonically active
- **Neutron star** — near-zero saturation, very high brightness

Colours derive from 2–3 anchors (primary = surface, secondary = core, tertiary
= atmosphere), so output is always harmonious but never repetitive.

Optional properties on a profile or a layer's colour entry, all general:

| Property | Where | Meaning |
|---|---|---|
| `hue: [[lo, hi, weight], ...]` | profile | Hue families, rolled with one draw, so every other profile keeps its colours (D252) |
| `accent: { rel, sat, val }` | profile | An accent hue offset from the host layer's; rides on every layer colour as `colour.accent`, asked for by an element with `tone: "accent"` (D252, `js/gen/accent.js`) |
| `accentHue: k` | layer | Re-tints the layer k of the way to the accent |
| `heatDriven: false` | layer | Interior heat does not move this layer's colour |
| `heatValue: [atCold, atHot, full]` | layer | The layer's lightness is its heat: lightness scaled from `atCold` to `atHot` as Interior heat rises. The optional third figure is the heat at which it reaches `atHot` (default 1), so a dial can dim a layer at its low end only (D264) |
| `sheen: k` | layer | Shades the band as polished bar: specular band, dark falls, lit rim (D254, `js/draw/sheen.js`) |

**User control:** seed + hue-nudge sliders. No manual colour picker.

### Four rules the colour stage must obey

Each of these was a visible defect before it was a rule. None is obvious from
reading the code, and none shows up in a single render.

**1. Material hues.** A layer may declare `hue: [min, max]` plus `hueLean`
(how far it drifts toward the body's primary). Layers without one derive their
hue from the anchors by depth.

Deriving *every* hue from the anchors made oceans brown on rust-coloured worlds
and turned every body into a pastel bullseye. Some materials keep their colour
whatever the rest of the body is made of — water is blue-green everywhere,
molten metal glows orange. Giving those layers an absolute hue that only
*leans* toward the primary is what makes a cutaway read as rock over metal.

**2. Self-lit layers are exempt from the reflective rules.** Layers marked
`incandescent` — molten cores, stellar photospheres, accretion discs — keep a
much looser saturation ceiling, gain saturation *and* value as heat rises, and
are shaded **brightening inward** because they glow from within. Reflective
layers are shaded darkening inward. Applying the reflective rule to emissive
material makes hot interiors look dull.

**3. No fluorescent corner.** For reflective layers, saturation is capped by
how bright the layer already is. High saturation at high value gives pure
spectral hue, which reads as a glowing plastic bead rather than a material.

**4. Adjacent bands must be distinguishable.** After derivation, adjacent
layers whose hue, saturation *and* value are all close have the inner one
darkened until it separates. Overlapping authored ranges otherwise collapse two
materials into one indistinct band — the "muddy" failure.

**5. A hot layer leans, and grades.** A layer may declare `heatLean`
(`{ hue, amount }`) and `heatGradient`. The first gives it a hot-side hue to
travel *toward*, scaled by Interior heat; the second makes the band ramp from
cool at its outer edge to hot at its inner one, publishing a second colour
(`hotEdge`) that both the band fill and the layer's detail elements interpolate
against.

These are **not** rule 1. A material hue *pins* — water is blue-green on every
world. A heat lean *perturbs* — a blue world's hot mantle must come out a hot
blue-shifted red, still recognisably that world's colour, or the anchor system
has been thrown away for the sake of the temperature. Pinning the mantle to
orange was the obvious fix and would have made every hot planet identical.

A layer declaring neither behaves exactly as it did before, so this is opt-in
per archetype. Anything derived from a layer's value — `hotEdge` included — must
be rebuilt by the adjacency pass in rule 4 when that value moves.

**`depthGradient` is the non-thermal sibling**, for layers that have an inside
and an outside but no meaningful temperature difference across them — a crust,
a sheet of ice. Inner edge darker and slightly more saturated, independent of
the heat dial. Every interior layer of a planet grades one way or the other;
that is what gives the cutaway depth and separates the bands.

**Rule 4 is judged at the edges that touch.** A graded layer does not meet its
neighbour with its base colour, so the separation pass reads `hotEdge` where it exists. Comparing base colours asks about a boundary that is not on screen.

**A layer at full brightness grades in hue, not value.** With no headroom left,
"hotter" would otherwise be expressed as *lower saturation* by rule 3 and wash
the layer toward white — D13's failure from the opposite direction. Real
incandescence climbs the spectrum instead: red, orange, yellow, white.

### Changing one layer must never recolour another

An atmosphere appearing cannot change what the core is made of. Two mechanisms
enforce this, and both were bugs first:

- **Each layer draws from its own RNG stream, keyed by role.** Drawing
  sequentially from one stream means inserting a layer shifts every draw below
  it. This is the same rule the structure stage follows.
- **Colour depth comes from `order`, not from measured radius.** A layer's
  geometric position legitimately moves when a neighbour changes thickness — a
  deepening ocean drowns the crust, and the stack renormalizes. Colour riding
  that means one slider quietly recolours the interior.

> **Generalisation worth remembering:** anywhere a list can gain or lose
> entries, key randomness to **identity, not position**. That single mistake
> produced two separate visible bugs.

Every archetype **must** declare `colorProfile.order` listing all its roles
outermost-first. Without it, colour falls back to measured radius and the bug
returns.

---

## Visual density — the central aesthetic requirement

> *"cheap basic procedural elements but used more numerously"* — and layered.

**The rule: when in doubt, draw more, smaller and fainter, in 2–3 size tiers.**

Sparse output is the failure mode. v2 drew 4 flares where 30 were wanted.

### Layer details (always present)

Standard equipment for a layer role. If the layer would look wrong without it,
it's a detail.

| Element | Layer roles | Count range |
|---|---|---|
| Convection cells | convective, mantle | 20–60 |
| Radiative streaks | radiative | 40–120 |
| Grain speckle | any solid | 200–800 |
| Cloud bands | gas envelope | 12–30 |
| Storm curls | gas envelope | 5–20 |
| Depth gradient | ocean | continuous |
| Compression rings | degenerate core | 3–8 |
| Voronoi mosaic | asteroid interior | 40–200 cells |

### Trait instances (optional)

Everything else — veins, pockets, debris, caps, rings, megastructures — is a
**trait**, placed by the grammar in [TRAIT-SYSTEM.md](TRAIT-SYSTEM.md).

### Layer behaviour, drawn

**Decision:** a mix of subtle symbols and genuine diagrammatic elements — but
**no text annotation** in the illustration.

Which treatment a layer gets depends on whether it *moves*:

| Layer type | Treatment |
|---|---|
| Convective zones, mantles, gas layers | **More diagrammatic** — visible cells, flow arrows showing circulation |
| Radiative zones | Directional streaks showing outward energy travel |
| Cores, solid surfaces | **Subtler** — motion lines rather than arrows, or nothing |
| Oceans | Current arcs |
| Ice shells | Fracture networks |

Layers with motion or flux get arrows; static layers get texture. Arrow density
rides the same Density slider, so the look can be dialled from textural to
strongly diagrammatic.

---

## Surface features

v2 stroked these as arcs along the crust and it looked wrong. Rebuilt:

**Oceans** — a real layer in the stack between crust and atmosphere, drawn as a
filled band with a depth gradient. Angular extent set by traits.

**Ice caps** — polar wedges (trait, `mirror: true`, pinned to 0°/180°), wide at
the surface and tapering inward. Extent driven by temperature and the Density
slider.

**Atmosphere** — a real outer layer with genuine gradient falloff, optionally
2–3 sub-bands for thick atmospheres. Reads as a layer, not a glow.

---

## Stats

**Decision:** real numbers, in metric, with plain-language framing. More stats
than v2, in a denser card, with **a different template per body type**.

Format: a relatable phrase carrying the number, not a bare figure.

```
Surface temperature   −100 °C to +40 °C  (Hazardous)
Gravity               1.9× Earth — you'd feel heavy but could walk
Size                  12,700 km across — about the size of Earth
Day length            17 months from sunrise to sunrise
Atmosphere            Thin, unbreathable — CO₂ and dust
Biggest danger        The cold. Unprotected exposure kills in minutes.
```

Rules:
- Metric only (°C, km, kg — never Kelvin, never "0.00758 Solar")
- Comparisons to Earth/familiar things wherever possible
- Small font, dense card, multiple data points per line where sensible
- Per-type templates — a black hole's card shares almost nothing with a moon's
- Never a bare unit the reader can't interpret ("Escape V: 8.67 km/s")

Hazard and flavour pools live in [HAZARDS.md](HAZARDS.md).

---

## Scale indication

**Decision:** a map-style scale bar in the **lower-left corner** of the render —
a measurement line with its real-world length labelled.

This solves the problem that a moon and a giant star otherwise render at
identical canvas size.

**Built: `js/draw/scalebar.js` (D285).**

- A render setting, like framing and the overlay: drawn into the preview and every body export, step 8 of the draw order, after the scene's rotation is undone
- **Measures the radius the card states.** `CC.Stats.build` returns `radiusKm`, the figure behind the Size line (each template's `facts.radius`, or its own `facts.radiusKm` where its unit is not km — the nebula's light-years). That radius is `view.R` pixels, so the bar cannot disagree with the card
- **A round 1-2-5 length**, the largest under 22% of the frame's shorter axis, in a unit chosen from that length: m → km → million km → AU → light-years
- **Sized from the frame, not the body**: text, strokes and margins scale with the shorter axis and Label text size, so zoom changes the bar's length and never its text
- **The silhouette is automatic** (D282): the largest rung of `js/data/scaleladder.js` whose true-scale size is 5px–25% of the frame, standing above the bar with its name, or none. Sixteen rungs from a person to the Oort cloud, spaced so no body falls between two; zoom can step the choice down. Per-object data lives in `js/data/`; `js/draw/` knows no archetype

---

## The overlay

**Decision:** a **toggle**, not a separate export. Scope reduced drastically —
its one job is naming the layers.

**Built: `js/draw/overlay.js` (D284).**

- A render setting, like framing: when on, it is drawn into the preview and every body export
- One label per layer. No feature callouts, no stat nuggets, no legend
- Each label has an **underline**; a 1px leader runs from the underline's inner end to a dot inside that layer's band
- The dots sit on **one ray per side**, 55° from straight up, so walking the ray outward meets the bands in depth order and the leaders cannot cross. Labels start level with their dots and are pushed apart only as far as they must be. "Both" deals the bands out alternately
- **Sized from the frame, not the body**: a 20x close-up does not print 20x names. Drawn after the scene's rotation is undone, so the text reads level
- The name is `layer.name`, resolved in `js/gen/structure-resolve.js` from the layer spec's `name` or `js/data/layernames.js` by role (D283). No role reaches `js/draw/`
- Everything else lives in the sidebar — **never** over the illustration

---

## UI layout

```
┌─────────────────────────────┬────────────────────────┐
│                             │  [ 🎲 Randomize ]      │  ← pinned
│                             │  [ 💾 Export ▾ ]       │  ← pinned
│         PREVIEW             ├────────────────────────┤
│                             │ ▾ Body                 │  ← accordion,
│                             │ ▸ Structure            │    multi-open,
│                             │ ▸ Colour               │    scrolls
│                             │ ▸ Traits               │    internally
│                             │ ▸ Detail               │
│                             │ ▸ Labels & Output      │
└─────────────────────────────┴────────────────────────┘
```

- Randomize and Export **pinned** outside the accordion, always reachable
- Accordion sections, **multiple open allowed**. Sections expand to full height;
  **one scrollbar, on the panel** — sections do *not* scroll internally, since
  nested scroll areas steal the wheel and stall the panel's own scrolling
  (see [PROGRESS.md](PROGRESS.md) D8). The page itself never scrolls
- Per-control 🔒 locks retained from v1 (they're a highlight of the tool)
- Randomize *settings* live in a section; the *button* stays pinned

Full control inventory in [PARAMETERS.md](PARAMETERS.md).

---

## Rendering model

Single Canvas 2D context. Draw order, back to front:

```
1. Background          transparent | solid | starfield
2. Outward traits      rings (back half), corona, halo, orbital structures
3. Layers, outermost → innermost
     for each layer:
       a. base fill (HSV-derived gradient)
       b. layer details (cells, streaks, speckle)
       c. trait instances anchored here
       d. boundary line
4. Surface-attached    ice caps, ocean bands
5. Outward traits      rings (front half), flares, megastructures
6. (rotation undone)
7. Overlay labels      if enabled (draw/overlay.js)
8. Scale bar + silhouette, lower-left, if enabled (draw/scalebar.js). In a framed preview, the overlay and bar lay out inside the export guide's rectangle (`settings.chromeBox`)
```

Everything is deterministic from the seed. Same seed + same settings = same
image, always.

### Resolution independence

**Decision: element counts do NOT scale with resolution.** A body is the same
image at every size — the same elements in the same places, drawn larger or
smaller. Resolution changes how many pixels the picture occupies, never what the
picture *is*.

This is not a performance compromise, it's a correctness requirement. The tool's
core promise is *same seed + same settings = same image*. If a 2160px export had
more elements than the 1080px preview, the preview would be showing the user
something other than what they are about to export, and the promise would hold
only at a fixed resolution.

The mechanism:

- **Elements are generated in normalized body-space** — positions and sizes as
  fractions of body radius (0..1), never in pixels
- **Pixel radius is applied at draw time only.** Rendering at 4320px multiplies
  the same normalized geometry by a larger number
- **Line widths and minimum feature sizes scale too**, so a 240px thumbnail
  stays legible and a 4320px export doesn't render hairlines

**The preview is the real render.** There is no reduced-density preview mode.
What the user is looking at is what they will get.

### Performance

The budget is **10–20 seconds maximum** for a full render or a randomize, at any
resolution. Density is tuned to be as detailed as is sensible within that
ceiling — aim for the balance point between speed and quantity, and don't buy
element count with render time beyond it.

Slider drags still need to feel live, and since the preview is now the full
render, that comes from **caching by stage rather than by reducing quality**:

| Changed control | Recompute from |
|---|---|
| Colour, opacity, label, background | Redraw cached geometry — no regeneration |
| Detail density, size tiers | Detail stage |
| Structure, traits, seed | Everything |

Because the pipeline stages already run off separate RNG streams, a colour nudge
touching only the draw step is natural rather than a special case.

Also:

- Cache the noise field per seed; don't regenerate per frame
- Cache generated element geometry; colour changes must never re-roll positions
- Debounce slider drags so an expensive stage runs on settle, not per pixel
- If a body genuinely cannot render inside the ceiling, reduce **authored
  density** for that archetype — never silently reduce it at preview time

---

## File layout

*Written from the real tree in Session AN. Everything listed exists, and each folder's scripts are in the order they load. **`index.html` is the single source of truth for the file list:** `test/domtest.mjs` reads its `<script src>` tags and `build_release.bat` copies `js/` and the scripts in `lib/` wholesale, so adding a file means adding its tag and nothing else.*

```
index.html  style.css  favicon.ico
build_release.bat  launch_app_win.bat  package.json

lib/        simplex-noise.js  delaunay.js
            (vendored, with a README.md giving versions and licences)

js/
  main.js   the app's wiring; loads last

  core/     math.js  rng.js  color.js

  data/     stars.js  layernames.js  scaleladder.js
            presets.js  presets-solid.js  presets-gaseous.js  presets-stellar.js
            presets-moon.js  presets-asteroid.js  presets-compact.js
            presets-nebula.js  presets-built.js  presets-machine.js
            phrasebook.js
    archetypes/  registry.js
            solid-film.js  solid.js  solid-moon-film.js  solid-moon.js  solid-asteroid.js
            gaseous-common.js  gaseous-gas-giant.js  gaseous-ice-giant.js
            stellar-common.js  stellar-limb-data.js  stellar-young.js  stellar-main.js
            stellar-giant.js  stellar-dwarf.js
            compact-neutron.js  compact-blackhole.js  diffuse-nebula.js  machine-world.js
    elements/  registry.js
            solid.js  solid-moon.js  solid-asteroid.js  gaseous.js
            stellar-common.js  stellar-envelope.js  stellar-interior.js
            compact.js  diffuse.js  machine.js
    traits/  registry.js
            orbital.js  orbital-built.js  giant-built.js
            solid.js  solid-asteroid.js
            gaseous-weather.js  gaseous-precip.js  gaseous-built.js
            stellar-magnetic.js  stellar-corona.js  stellar-spots.js  stellar-evolved.js
            stellar-built.js  dyson.js
            compact.js  diffuse.js  ringworld.js  machine.js
    flavour/  registry.js
            solid.js  solid-asteroid.js  gaseous.js  stellar.js
            compact.js  blackhole.js  nebula.js  machine.js

  gen/      form.js  caves.js  activity.js  shells.js  shellwalls.js
            rupture.js  woundedge.js  woundclean.js  wounddebris.js
            structure.js  structure-wobble.js  structure-resolve.js
            frosting.js  frosting-thermal.js
            accent.js
            palette.js  palette-util.js  palette-hue.js  palette-value.js
            palette-layer.js  palette-bands.js
            terrain.js  zonegeom.js  zoneswell.js  zones.js
            climate.js  climate-baseline.js  climatesummary.js
            evenspacing.js
            elemgen.js  elemgen-basic.js  elemgen-mosaic.js  elemgen-family.js
            compact.js  diffuse.js  diffuse-pockets.js  ringworld.js
            claims.js  materials.js  cellgrid.js  glyph.js
            orbitalbuilt.js  giantbuilt.js  dyson.js
            fixtures.js  pulses.js  containment.js  conduits.js  capacitors.js
            shaftdoors.js  overgrowth.js  bore.js  engines.js
            traitroll.js  traitselect.js  traitanchor.js  traitplace.js  traitfinish.js
            traitsets.js
            details.js  details-traits.js  details-terrain.js  details-instances.js
            climatetext.js  hazard.js
    stats/  registry.js
            solid.js  asteroid.js  gaseous.js  stellar-derive.js  stellar.js
            compact.js  blackhole.js  nebula.js  machine.js

  draw/     canvas.js  background.js  lens.js
            layers.js  boundary.js  shells.js  shellwalls.js  rupture.js
            formfill.js  sheen.js  feather.js
            primitives.js  rocktexture.js
            conduits.js  capacitors.js  shaftdoors.js  overgrowth.js  bore.js  engines.js
            wounddebris.js  woundscaffold.js  woundedge.js  caves.js  hole.js
            details.js  details-tone.js  details-gas.js  details-star.js
            details-mosaic.js  relief.js
            grain.js  film.js  film-zones.js  frostpaint.js  frost.js
            zonepaint.js  emissive.js  overlay.js  scalebar.js
            scene.js  scene-outward.js  scene-interior.js  scene-surface.js
            card.js
    primitives/  vein.js  flow.js
            orbital-rings.js  orbital-storm.js  orbital-rocks.js
            mosaic.js  machines.js  built.js
            orbital-built.js  orbital-mines.js  giant-built.js  dyson.js
            materials.js  cellgrid.js  glyph.js  fixtures.js  machinery.js
            pulses.js  containment.js
            stellar.js  stellar-spots.js  stellar-foreign.js  stellar-limb.js
            stellar-flare.js  stellar-wind.js  stellar-field.js
            compact.js  compact-stream.js  diffuse.js  diffuse-marks.js  ringworld.js
    zonepaint/  outward.js  sea.js

  ui/       accordion.js  help.js  controls.js  traitpicker.js  randomize.js
            presets.js  infopanel.js  export.js  share.js  framing.js  exportui.js
            keys.js  persist.js  gather.js  sync.js

test/       the suite:  doccheck.mjs  domtest.mjs  stubcanvas.mjs
            on request: libcheck.mjs
            renders:    sheet.mjs  shots.mjs  climate.mjs  film.mjs  framing.mjs  zones.mjs
            (dev only, never shipped; test/_tmp/ holds throwaway probes, gitignored)
docs/       the spec set
dist/  shots/  old wip/  generated or old; gitignored
```

Load order follows dependency order: `core` → `data` → `gen` → `draw` → `ui` → `main`.

### The load-order idiom

**A file either creates one namespace or adds to one.** There are two ways a namespace gets spread over several files, and both rely on a script tag's order:

- **A family registry.** `registry.js` creates the namespace (`CC.Archetypes`, `CC.Elements`, `CC.Traits`, `CC.Flavour`, `CC.Stats`) and each family file after it registers into it. `data/presets.js` and its `presets-*.js` work the same way, and so do `draw/primitives.js` and `draw/primitives/`, whose files add kinds through `CC.Primitives.register`. Adding a family is a new file and a new tag.
- **A split file.** A file that outgrew 500 lines keeps its name and creates the namespace; the code moved out of it loads straight after it and attaches to the same namespace (`CC.Structure.relativeWobble = …`, or `CC.ElemGen.registerBuilder(…)`), each in its own function wrapper. No caller had to be renamed (Sessions AL and AM, D322–D323). So `palette.js` is followed directly by `palette-util.js`, `palette-hue.js`, `palette-value.js`, `palette-layer.js` and `palette-bands.js`, all of them `CC.Palette`.

**Where a split function kept its order.** `CC.Scene.render`, `CC.Palette.build`, `CC.Details.build`, `CC.Structure.build` and `CC.TraitRoll.placeOne` were cut into stages (D323). Each builds one state object and calls its stages in order, and that is all it does, so the order of the passes can be read straight off it. A stage takes the fields it needs as local names and writes back what a later stage reads. The state is `st`, except in the scene, where it is `sc`.

**Three exceptions, each because something is read while a file loads rather than when it is called:**

- `data/archetypes/solid-film.js` and `solid-moon-film.js` load *before* `solid.js` and `solid-moon.js`, under their own namespaces (`CC.PlanetFilm`, `CC.MoonFilm`), because an archetype reads their tables as it registers.
- `gen/stats/stellar-derive.js` loads before `stellar.js`, whose template reads it.
- `ui/gather.js` and `ui/sync.js` came out of `main.js` but load before it, under their own namespaces (`CC.Gather`, `CC.Sync`), because `main.js` is the file that starts the app.

### Where each pipeline stage starts

| Stage | Entry | Namespace |
|---|---|---|
| Structure | `gen/structure.js` | `CC.Structure` |
| Traits | `gen/traitroll.js` | `CC.TraitRoll` |
| Colour | `gen/palette.js` | `CC.Palette` |
| Detail | `gen/details.js` | `CC.Details` |
| Stats and text | `gen/stats/registry.js` | `CC.Stats` |
| Render | `draw/scene.js` | `CC.Scene` |
| Controls to pipeline | `ui/gather.js` | `CC.Gather` |

### Notes on what exists

- **`draw/scene.js`** is the draw-order spine. Later stages slot into it rather than being called from `main.js`.
- **`gen/elemgen.js`** holds the size-tier system and the builder registry, with the shapes themselves in `elemgen-basic.js`, `elemgen-mosaic.js` and `elemgen-family.js`, and in feature files such as `gen/cellgrid.js`. `elemgen` is *how* an element is built, `details` is *which* elements a body gets. The trait stage calls the same builders, so a trait's `element` selects from exactly the same list a layer detail does.
- **Trait instances have no drawing file of their own.** They are ordinary elements carrying a `trait` id, drawn through `draw/details.js` like everything else, which is the point of keeping the primitive list small. Only their *draw order* differs, and that lives in the `draw/scene*.js` files.
- **`draw/primitives.js`** is the element primitive library: one function per primitive, all with the signature `(ctx, view, el, style)`. It contains **no role or archetype names**; dispatch goes through its `KINDS` table, and `draw/primitives/` adds to that table.
- **`gen/terrain.js`** is the generic angular field generator (D15). It is not a crust feature: any layer may attach one via `relief`, which is what lets the same code produce continents, a moon's cratered plains, a star's granulation and a gas giant's buried rocky floor.
- **`gen/zones.js`** is the angular-zone primitive, with `zonegeom.js` and `zoneswell.js` beneath it. They own **all** zone logic; `draw/` may call them but contains none. Terrain was already a pure function of angle, so zones multiply into the field without restructuring, exactly as D15 predicted. See D23.
- **A built feature is usually two files of one name**, `gen/x.js` deciding what is there and `draw/x.js` or `draw/primitives/x.js` drawing it: `bore`, `engines`, `conduits`, `capacitors`, `shaftdoors`, `overgrowth`, `caves`, `dyson`, `ringworld` and others.
- **Value noise and periodic angular noise** live in `core/rng.js`, since they are seeded generators like everything else in it, and **the lock system** is part of `ui/controls.js`, which is where the controls it locks are bound.
- **`test/sheet.mjs`** renders 24 randomized bodies to one contact sheet, because harmony and density are properties of the *spread* of outputs and single renders mislead badly. See below.

---

## Judging visual work

**Render it and look at it. Never assert that it looks good.**

Anything about *harmony* or *density* is a property of the spread of outputs,
not of any single render. Both times this was tested one body at a time, every
individual render looked defensible while the whole approach was broken — the
first colour pass produced pastel bullseyes across the board and it took a
contact sheet to see it.

| Command | Use |
|---|---|
| `npm run sheet` | 24 randomized bodies in one image. **The honest test** for colour and density. `npm run sheet -- 48 8` for more |
| `npm run shots` | Parameter sweeps, one PNG per setting. For checking a specific control |
| `npm run film` | The frosting: whole discs, rim crops, and its colour against the rock |
| `npm run zones` | Angular zones: the Lock strength sweep as whole discs, a gallery of locked worlds, one disc per trait, plus the numbers behind each |
| `npm test` | Facts, not looks: the specs still describe the code, every control drives a render, no NaN geometry, determinism, resolution independence. See [PROGRESS.md](PROGRESS.md) § Test suite |

**Judge zones on whole bodies, large.** A terminator is a property of a
hemisphere, so it cannot be assessed on a contact sheet — and a trait's
visibility is answered by *how many pixels it changes against an otherwise
identical body*, which is one number rather than an argument. Both of those
found defects that an hour of looking at renders had not.

A numeric threshold on how something looks is still an opinion, so it does not become a test: the checks that held them were deleted in Session J, and the colour rules above now live in the palette code. A check earns its place only if it is mechanically true-or-false and generic over the archetypes.

---

## Decisions log

| # | Question | Decision |
|---|---|---|
| Q1 | Archetype list | General types only; varieties are **parameters + presets** |
| Q2 | Non-concentric bodies | No — nebulae and asteroids use layers with extreme wobble |
| Q3 | Trait selection | User-selectable, filtered to compatible; modular placement grammar |
| Q4 | Colour control | Seed + hue-nudge sliders; no manual picker |
| Q5 | Diagrammatic level | Mix of subtle and diagrammatic, no text annotation; moving layers get arrows |
| Q6 | Polar slice | Yes — generate pointing up, rotate at the end, "keep upright" option |
| Q7 | Stats | Real metric numbers with plain-language framing; per-type templates |
| Q8 | Overlay | Toggle, layer names only, underline + 1px leader |
| Q9 | UI | Accordion, multi-open, internal scroll, pinned buttons |
| Q10 | Scale | Map-style scale bar, lower-left, optional silhouette |
| Q11 | Cutaway wedge | No — strictly flat 2D cutaway |
| — | Resolution scaling | Counts are resolution-independent; preview is the real render; 10–20s budget |
| — | Structural exceptions | Cut. Replaced by the zone primitive, parameter axes and presets; three stack branches remain |
| — | Trait vs. axis | A trait that must exclude a sibling is an axis; name it after the quantity |
| — | Discoverability | Presets (stored control values), never new archetypes |
| — | Layer count slider | Removed; standard stacks per archetype |
| — | Art styles | One only (semi-technical) |
| — | ES modules | Rejected; plain script tags |

### Decided during the build

These came out of implementation rather than design. Full reasoning, and the
defects that prompted each, are in [PROGRESS.md](PROGRESS.md) under the
matching number.

| # | Decision |
|---|---|
| D1 | Layer presence is one property with three forms — unconditional, probability, parameter |
| D2 | Layers may be positioned relative to another layer (`over`), not only at an absolute radius |
| D3 | The stack is renormalized so the surface is always exactly 1.0 |
| D4 | `solid-bodies.md`'s frac table was reinterpreted so it composes; the moon and asteroid tables were corrected the same way |
| D5 | Proportions are stylized to textbook-diagram thickness, not physical |
| D7 | The ocean is a global band; land is drawn over it. Continents in P3, made angle-aware by zones in P4 |
| D8 | One scrollbar, on the panel — accordion sections do not scroll internally |
| D9 | Purple UI theme, every ink colour at WCAG AA or better |
| D10 | Some layers have a material hue of their own (`hue` + `hueLean`) |
| D11 | Two colour guardrails — no fluorescent corner, adjacent bands must differ — enforced by tests |
| D12 | Adding or removing a layer must never recolour the others: per-layer RNG streams, and colour depth from declared `order` |
| D13 | Self-lit layers (`incandescent`) are exempt from the reflective colour rules |
| D14 | The specs are the authority, and `test/doccheck.mjs` keeps them honest |
| D15 | Terrain is a generic angular field any layer can attach to, not a crust feature. The coastline is where terrain crosses whatever floats on it — never a drawn feature |
| D16 | A cooling core freezes inward rather than vanishing: the solid core grows, the liquid shell thins, the metal region keeps its size |
| D17 | Terrain may shape the silhouette, damped. The perfect-circle rule was about v2's *wobble*, not about relief |
| D18 | The surface film is a **surface role** — a colour profile with no radius, absent from `order`, drawn on a layer rather than as one |
| D19 | The film became frosting: thicker, wider-gamut, bleeding into the rock |
| D20 | Frosting is **deposition**, in four elevation zones from one height field |
| D21 | A sub-pixel sea is faded out, not drawn as a hairline |
| D22 | Frosting is a generic surface stage; its zone table becomes archetype data when the second family lands |
| D23 | `gen/zones.js` owns all zone logic; `draw/` may call it but contains none |
| D24 | A zone's colour delta is limited by the headroom the layer actually has, with a knee that must be continuous everywhere |
| D25 | The terrain and frosting zone hooks are **general angle multipliers**, honouring D22 |
| D26 | Four defects that made correctly-placed traits invisible — orbital band, frame extent, `mirror`, and draw order |
| D59 | The mantle carries the heat: `heatLean` perturbs hue toward hot, `heatGradient` ramps the band cool-to-hot, and heat now moves value in **both** directions |
| D60 | A trait must be a different KIND of mark than its layer's own detail — filled vs stroked, two-tone vs one — not a louder version of the same mark |
| D61 | Gradients on every interior layer (`depthGradient` for non-thermal ones); a hue lean needs reach, a destination ceiling, and a sat/val floor; adjacency is judged at the edges that touch |
| D63 | Fluid layers grade too (ocean, sea ice); a depth ramp must run the WHOLE band, not stop at its base |
