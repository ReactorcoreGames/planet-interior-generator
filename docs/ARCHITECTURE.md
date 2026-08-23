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
| `shell` | bool | Hollow band rather than filled disc (machine worlds) |
| `gap` | `[min, max]` | Void thickness above and below a `shell` layer |
| `pillars` | `[min, max]` | Radial supports spanning a gap |
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
Cohesion, Operational status and Hull integrity all use the same mechanism, so
each is a data edit rather than new logic.

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

`shell`, `gap` and `pillars` are **generic properties, not machine-world
special-casing.** Only machine worlds use them today, but the renderer
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
neighbour with its base colour, so both the separation pass and the sweep's
muddiness check read `hotEdge` where it exists. Comparing base colours asks
about a boundary that is not on screen.

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

Optionally accompanied by a silhouette for comparison: a circle for a
sun/planet, a rectangle for a human/ship. Same corner.

This solves the problem that a moon and a giant star otherwise render at
identical canvas size.

---

## The overlay

**Decision:** a **toggle**, not a separate export. Scope reduced drastically —
its one job is naming the layers.

- Render body only (optional background), **or** body + info sidebar + optional
  layer labels
- One label per layer. No feature callouts, no stat nuggets, no legend.
- Each label has an **underline**; a 1px line runs from the underline's inner
  end (right end for left-side labels, left end for right-side labels) to the
  vertical centre of the nearest point on that layer's band
- Labels stack in a column per side, sorted by depth so lines never cross
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
6. Scale bar + silhouette (lower-left)
7. Overlay labels      if enabled
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

`✅` exists · `⬜` planned, with the phase that adds it.

```
js/
  core/     ✅ math.js  ✅ rng.js  ✅ color.js
  data/     ✅ archetypes.js  ✅ elements.js  ✅ traits.js
            ⬜ presets.js (MVP)  hazards.js  names.js (MVP)
  gen/      ✅ structure.js  ✅ frosting.js  ✅ palette.js  ✅ terrain.js
            ✅ zones.js  ✅ elemgen.js  ✅ traitroll.js  ✅ details.js
            ⬜ stats.js  text.js (MVP)
  draw/     ✅ canvas.js  ✅ layers.js  ✅ scene.js
            ✅ primitives.js  ✅ details.js  ✅ film.js
            ⬜ overlay.js  scale.js  panel.js (P8)
  ui/       ✅ accordion.js  ✅ controls.js  ✅ traitpicker.js
            ⬜ export.js (MVP)
  ✅ main.js
lib/        ✅ simplex-noise.js  ✅ delaunay.js
test/       ✅ stubcanvas.mjs  domtest.mjs  sweep.mjs  shots.mjs  sheet.mjs
            ✅ libcheck.mjs  doccheck.mjs  film.mjs  zones.mjs
               (dev only, never shipped)
archive/v2/ superseded v2 app, reference only
```

- **`gen/elemgen.js`** — the size-tier system and one builder per element
  shape. Split out of `gen/details.js` when zones pushed it past 500 lines:
  `elemgen` is *how* an element is built, `details` is *which* elements a body
  gets. The trait stage calls the same builders, so a trait's `element` selects
  from exactly the same list a layer detail does.
- **`draw/traitdraw.js` was not needed.** Trait instances are ordinary elements
  carrying a `trait` id, drawn through `draw/details.js` like everything else —
  which is the point of keeping the primitive list small. Only their *draw
  order* differs, and that lives in `draw/scene.js` where the rest of the order
  already is.

Notes on what exists:

- **`draw/scene.js`** — the draw-order spine. Later stages slot into it rather
  than being called from `main.js`.
- **`core/noise.js` was not needed.** Value noise and periodic angular noise
  (for seam-free wobbled boundaries) live in `core/rng.js`, since they are
  seeded generators like everything else in it.
- **`ui/locks.js` was not needed.** The lock system is part of
  `ui/controls.js`, which is where the controls it locks are bound.
- **`test/sheet.mjs`** — renders 24 randomized bodies to one contact sheet.
  Added because harmony and density are properties of the *spread* of outputs,
  and single renders mislead badly. See the testing note below.

Load order in `index.html` follows dependency order: `core` → `data` → `gen` →
`draw` → `ui` → `main`. Each file exposes one namespace object.

**`index.html` is the single source of truth for the file list.**
`test/domtest.mjs` reads its `<script src>` tags and `build_release.bat` copies
`js/` and `lib/` wholesale, so adding a file means editing `index.html` and
nothing else.

- **`gen/terrain.js`** — the generic angular field generator (D15). Not a crust
  feature: any layer may attach one via `relief`, which is what lets the same
  code produce continents, a moon's cratered plains, a star's granulation and
  a gas giant's buried rocky floor. Wired for the planet only in Phase 3.
- **`draw/primitives.js`** — one function per element primitive, all with the
  signature `(ctx, view, el, style)`. Contains **no role or archetype names**;
  dispatch goes through its `KINDS` table.

- **`gen/zones.js`** — the angular-zone primitive. Owns **all** zone logic;
  `draw/` may call it but contains none. Terrain was already a pure function of
  angle, so zones multiply into the field without restructuring, exactly as D15
  predicted. See [PROGRESS.md](PROGRESS.md) D23.

Notes on what is still to come:
- **`data/presets.js`** — named control-value sets; pure data, no logic

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
| `npm test` | Invariants: determinism, resolution independence, layer independence, colour guardrails, zone and trait contracts |

**Judge zones on whole bodies, large.** A terminator is a property of a
hemisphere, so it cannot be assessed on a contact sheet — and a trait's
visibility is answered by *how many pixels it changes against an otherwise
identical body*, which is one number rather than an argument. Both of those
found defects that an hour of looking at renders had not.

Where a visual rule can be stated numerically, it belongs in `test/sweep.mjs`
as an assertion rather than as advice — the colour guardrails above are all
enforced there, because none of them is obvious from reading the code.

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
