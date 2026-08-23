# Parameters & Controls

*Complete inventory of every setting. Organised by accordion section, in the
order they appear in the panel.*

---

## Panel layout

```
┌─────────────────────────────┬────────────────────────┐
│                             │  [ 🎲 RANDOMIZE ]      │  ← pinned, always
│                             │  [ 💾 EXPORT ▾ ]       │    visible
│         PREVIEW             ├────────────────────────┤
│                             │ ▾ Body                 │
│                             │ ▸ Structure            │  accordion,
│                             │ ▸ Colour               │  multi-open,
│                             │ ▸ Traits               │  each scrolls
│                             │ ▸ Detail               │  internally
│                             │ ▸ Labels & Info        │
│                             │ ▸ Output               │
└─────────────────────────────┴────────────────────────┘
```

**Rules:**
- Randomize and Export are pinned above the accordion and never scroll away
- Multiple sections may be open at once
- Sections expand to full height. There is **one scrollbar, on the panel** —
  sections do not scroll internally (see [PROGRESS.md](PROGRESS.md) D8). The
  page itself never scrolls
- Every control has a tooltip; every non-obvious one has a `?` with a longer
  explanation

---

## Lock system

Nearly every control carries a **🔒 lock toggle**. Locked controls are not
touched by Randomize. This is a v1 feature and a highlight of the tool — it's
what makes "keep this body type and palette but re-roll everything else" work.

Locks are visually distinct when engaged (highlighted, not just checked).

**Bulk actions:** `Lock all` / `Unlock all` / `Invert locks` at the top of the
Randomize settings.

---

## ▾ Body

| Control | Type | Notes |
|---|---|---|
| **Preset** | gallery | Named starting configurations, filtered to the current archetype. Sets several controls at once; everything stays editable afterward. See [Presets](#presets) |
| **Archetype** | dropdown, grouped | Grouped by family: Solid / Gaseous / Stars / Compact / Diffuse / Artificial |
| **Seed** | text + 🎲 | Any string. Same seed + same settings = same image, always |
| **Name** | text | Blank = generated from seed, shown as placeholder |
| **Name style** | dropdown | Auto / Catalogue (KX-2291) / Greek (Kappa Verossa) / Mythic / Plain |

**Preset behaviour:**
- Sits at the **top of the Body section** — it's the browsing entry point
- Applying one **respects locks**: a locked control is not overwritten
- Applying one does **not** change the seed, so you can try presets on the same
  body and compare
- Selecting a preset whose archetype differs from the current one switches the
  archetype too
- No "active preset" state is stored — once applied it's just control values,
  and editing any of them doesn't need to clear a label

Archetype dropdown contents:

```
── Solid ──────────────
   Planet
   Moon / Planetoid
   Asteroid
── Gaseous ────────────
   Gas Giant
   Ice Giant
── Stars ──────────────
   Young Star
   Main Star
   Old Giant Star
   Dwarf Star
── Compact ────────────
   Neutron Star
   Pulsar
   Black Hole
── Diffuse ────────────
   Nebula
── Artificial ─────────
   Machine World
```

---

## ▸ Structure

**No layer-count control.** Each archetype has a standard stack; see
[ARCHITECTURE.md](ARCHITECTURE.md).

| Control | Type | Range | Notes |
|---|---|---|---|
| **Layer thickness variation** | slider | 0–100% | 0 = every layer at its mid-range thickness; 100 = full random within each layer's min/max |
| **Optional layers** | slider | 0–100% | Chance that optional layers (atmosphere, ocean, ice-shell) are present |
| **Core size bias** | slider | −100…+100 | Push the core smaller or larger within its range. Affects derived stats |
| **Ocean depth** | slider | 0–100% | 0 = no ocean (desert/airless). Low = seas. High = global ocean. Max = the crust is barely a floor. Solid bodies only |
| **Interior heat** | slider | 0–100% | 0 = dead (solid core, static mantle, thick crust, grey palette). 100 = molten (liquid core, fully convecting mantle, thin fractured crust, magma reaching the surface). Solid bodies only |
| **Tidal locking** | slider | 0–100% | 0 = an ordinary rotating world. As it rises one face bakes and the other freezes: the ocean boils off the hot side and pools frozen on the cold side, an ice cap spreads down from the night face, terrain flattens where it is baked, and the atmosphere thins at both extremes. Sits beside Ocean depth because the two are coupled |
| **Lock facing** | slider | 0–360° | Where the hot face points. Rolled per body; set deliberately to aim the dayside at the viewer |
| **Starlight** | slider | 0–100% | **How much light and heat reaches this body.** 100% is seared like Mercury or Venus; around half is temperate like Earth; low values give a frozen outer-system world. **0% means there is no star at all** — a rogue planet drifting unlit, warmed only by its own Interior heat. Feeds the climate baseline, and gently biases how much atmosphere survives (both extremes thin it) |
| **Star colour** | dropdown | Red dwarf … Blue giant | The spectral character of the light. Tints the palette's outer layers, and changes how much energy arrives per unit of Starlight — a blue giant runs a world ~0.17 hotter than a red dwarf at the same slider position. Never touches self-lit layers |
| **Star activity** | slider | 0–100% | How violent the star is. **Not temperature** — it scours surface cover, drives the radiation hazard, and (with Exotic oceans on) pushes the sea's colour. A thick atmosphere shields against it, so an airless world suffers most |
| **Axial tilt** | slider | 0–100% | 0% gives two symmetric polar caps. Turned up, one cap grows while the other shrinks — a seasonal snapshot. Past halfway the poles become the **warm** regions and the equator freezes, which is an Uranus-like world |

### Archetype-specific structure controls

These appear in the Structure section **only when the relevant archetype is
selected**, and each replaces a pair of mutually-exclusive traits. Same pattern
as Ocean depth and Interior heat: an axis, not two checkboxes.

| Control | Archetypes | Range | Replaces | Drives |
|---|---|---|---|---|
| **Cohesion** | asteroid | 0–100% | `rubble-pile` / `void-riddled` | Voronoi cell count and size, void frequency, outer-shell integrity |
| **Luminosity source** | nebula | 0–100% | `dark` / `reflection` / `emission` | Layer opacity, lightness, hue bias, whether protostars light their surroundings |
| ~~**Stellar activity**~~ | all stars | — | — | **SUPERSEDED by the universal Star activity axis — do not build this.** See the note below |
| **Field strength** | neutron star, pulsar | 0–100% | `magnetar` | Magnetosphere extent, field-line count and twist, particle glints |
| **Surface heat** | neutron star, pulsar | 0–100% | `cooling-crust` | Crust lightness, temperature stat |
| **Spin rate** | pulsar | 0–100% | `millisecond-spin` | Beam-cone width, light-cylinder radius, pulse-period stat |
| **Beam tilt** | pulsar | 15–60° | — | The archetype's signature; directly dialable |
| **Accretion rate** | black hole | 0–100% | `feeding` / `dormant` | Disc presence, brightness, density, jet strength, inner-disc gradient |
| **Mass class** | black hole | preset | `supermassive` / `stellar-mass` | Horizon radius and every derived stat — spans 3 km to 10,000,000+ km |
| **Operational status** | machine world | 0–100% | `dormant` / `automated` / `hive-populated` | Light and window-grid density, power-core brightness, accent-hue intensity across every layer, habitation presence |
| **Hull integrity** | machine world | 0–100% | `damaged` / `partial-construction` | How much of the outer hull is missing (zone `remove: true`); the `construction` flag swaps torn edges for scaffolded ones |
| **Enclosure** | dyson-structure trait | 0–100% | `dyson-swarm` / `dyson-sphere` | Collector spacing, jitter and arc — scattered swarm → half-built shell → full sphere |

**Core size bias** (above) also absorbs the gas giant's `oversized-core` /
`coreless` pair. At the low end the core's boundary softens from a hard edge to
a gradient, because a coreless giant has no discrete core to outline.

> **Why these are sliders and not traits:** every one of them replaced traits
> that would have needed `excludes` entries pointing at each other. A trait that
> must exclude its sibling is almost always an axis in disguise — and as an axis,
> the values *between* the named extremes become reachable, which is where the
> more interesting output usually is.

> **⚠ `Stellar activity` was superseded before it was built.** The universal
> **Star activity** axis (above) is the same quantity: how violent the star is.
> On a planet it scours surface cover and drives the radiation hazard; on a star
> archetype it should drive starspots, prominences and flare storms. **That is
> one control with two consumers, not two controls** — and a star body and the
> star a planet orbits are the same physical object seen from two sides, so if
> they ever disagree the tool is contradicting itself.
>
> Phase 6 therefore *consumes* `starActivity`; it must not add an axis of its
> own. The same applies to any archetype that wants to know how violent its star
> is. See [PROGRESS.md](PROGRESS.md) D44 and the ROADMAP's Phase 6 notes.
| **Boundary irregularity** | slider | 0–200% | Multiplies each layer's *own* wobble. 100% = as authored. Not a global wobble — per-layer values still differ |
| **Keep upright** | checkbox | — | Skip the final random rotation, so poles stay top/bottom |
| **Rotation** | slider | 0–360° | Manual rotation; disabled when Keep upright is on |

> **Note:** "Boundary irregularity" replaces v2's "boundary wobble", which was
> over-stylized. Default 100% should look correct; the slider is for taste, not
> for making it usable.

**Ocean depth and Interior heat replace a family of traits.** `ocean-world`,
`desert-world`, `frozen-world`, `volcanic` and `ancient-dead` were all specified
as traits when each is really one of these two axes at an extreme value. They
survive as **presets** (below), not as traits — which means they combine freely
instead of excluding each other, and a "half-frozen desert with a dying core" is
reachable by dragging two sliders.

Interior heat drives several things at once, which is what makes it read as a
coherent world rather than a slider:

| Interior heat | Core | Mantle | Crust | Palette |
|---|---|---|---|---|
| 0.0 — dead | solid throughout, thin liquid shell | static, no flow arrows | thick | desaturated, grey; mantle flat and cold |
| 0.5 — Earth-like | liquid outer core | convecting, visible cells | normal | as rolled; mantle grades cool→warm across the band |
| 1.0 — molten | fully liquid | violent convection, dense arrows | thin, fractured | saturated, glowing; mantle leans hard to red-orange and grades strongly |

**Interior heat is the most powerful single control in the panel, and that is
deliberate.** It is the one dial that changes the *whole* picture rather than
one layer of it: layer geometry, flow element counts, saturation, mantle hue,
mantle brightness, and the thermal gradient across the mantle all move together.
A cold world and a hot world at the same seed should be recognisably the same
world and obviously different planets.

The mantle's share of this is `heatLean` and `heatGradient`, described in
[celestials/solid-bodies.md](celestials/solid-bodies.md#the-mantle-carries-the-heat).
Before D59 the dial could *dim* a mantle but never *brighten* one — the value
push was gated behind the emissive branch, so a non-emissive layer got
saturation from heat and nothing else, and cranking the dial to maximum made
the band slightly more colourful and not one shade lighter.


### Which universal controls apply to which family

**Read this before authoring a new archetype.** The star and climate controls
are *universal* — they are always in the panel — but "always present" is not the
same as "always meaningful", and an archetype decides how much of each reaches
it. Getting this wrong is silent: a control that should do nothing and quietly
does something is far harder to notice than one that visibly breaks.

Legend: **✅** consume it · **◐** consume it partially, see the note ·
**✖** declare it away.

| | Starlight | Star colour | Star activity | Axial tilt | Exotic oceans |
|---|---|---|---|---|---|
| **planet** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **moon** | ✅ | ✅ | ✅ **most exposed** | ✅ | ✖ no sea |
| **ice-shelled moon** | ✅ | ✅ | ✅ | ◐ | ◐ subsurface |
| **asteroid** | ✅ | ◐ surface only | ✅ **no shielding** | ✖ no surface field | ✖ |
| **gas / ice giant** | ✅ **drives cloud species** | ✅ envelope | ◐ upper haze | ◐ low `latitude` | ✖ |
| **star** | ✖ **it IS the star** | ✖ | ✅ **drives its own flares** | ✖ | ✖ |
| **neutron star / pulsar** | ✖ | ✖ | ◐ own field, not a star's | ✖ | ✖ |
| **black hole** | ✖ | ✖ | ✖ | ✖ | ✖ |
| **nebula** | ◐ embedded stars light it | ✅ **strongly** | ◐ | ✖ | ✖ |
| **machine world** | ✅ **heat management** | ✅ | ✅ **shielding** | ◐ engineered | ◐ |

**How an archetype declares each answer:**

| Question | How to say no | How to say yes |
|---|---|---|
| Does it have latitude? | omit `climate`, or set `latitude: 0` | `climate: { latitude: 1.0 }` |
| Does the star's light tint it? | mark layers `incandescent` — self-lit layers are exempt (D13) | nothing; it is the default, and the cast falls off with depth |
| Does the star heat it? | `climate: { starlit: false }` | nothing; `baseline` reads Starlight |
| Can its fluid go exotic? | omit `exotic` on the layer | `exotic: { wild, sat, val, activity }` on the layer — archetype data, not a role name |

> **`starlit: false` is the escape hatch for bodies that are not warmed by some
> OTHER star** — a star, a neutron star, a black hole. For a star the incident
> term is not merely small, it is the wrong idea entirely.
>
> It removes the Starlight term from the baseline *and* the star's tint from the
> palette, so a body cannot end up temperature-independent of the Star colour
> dropdown while still being coloured by it. The body still responds fully to
> its own Interior heat, which is what a star's temperature should be made of.
>
> Measured: at Starlight 100% an ordinary archetype baselines at 0.77 and one
> with `starlit: false` at 0.11, and Starlight then has *literally no* effect on
> it. Asserted in `npm run climate` under **ARCHETYPE ESCAPE HATCHES** — it is
> exercised on a synthetic archetype so the mechanism is proven before Phase 6
> depends on it.
>
> **Declared, never detected.** There is no role-name check in
> `gen/climate.js` and there must never be one: an archetype says what it is and
> the generator believes it. A growing list of "if this is a star" branches is
> exactly the failure D27 records.

### Starlight and Interior heat together — the climate baseline

**The surface temperature is a genuine sum of two independent sources**, and
neither may dominate:

```
baseTemp = f(Starlight) + g(Interior heat)
```

Measured across each control's full travel, Starlight commands 0.66 of the
0–1 range and Interior heat 0.34. The star leads — it is the larger physical
source, and it is what makes cold regions *conditional* — but Interior heat
alone still carries a world from frozen (0.04) to temperate (0.38).

That second figure is the point. **A rogue planet with a molten core is a warm
world**, lit from within, drifting with no star at all. All four corners are
reachable and all four read correctly:

| Starlight | Interior heat | Result |
|---|---|---|
| low | high | a warm world in the dark — volcanic, lit from within |
| high | low | a baked dead rock |
| 0 | high | **a rogue planet kept warm by its own core** |
| 0 | 0 | frozen solid — the deep-void case |

**Polar caps emerge from this, they are never drawn.** The climate lowers a
snowline where it is cold, and the frosting's existing four-zone deposition
model does the rest — so a cap pools in valleys and thins on ridges, and its
edge is a gradient rather than a contour. A Venus grows none *because its
baseline is above freezing everywhere*, not because a rule excluded it.

Measured: an Earth-like world's ice reaches 24° from a pole, a cool one's 52°,
a Europa-like world's 74°, and a rogue world freezes over entirely.

---

## ▸ Colour

| Control | Type | Range | Status | Notes |
|---|---|---|---|---|
| **Primary hue** | slider | 0–360° | ✅ | Surface / outermost material |
| **Hue relationship** | dropdown | — | ✅ | Auto / Complement / Analogous / Triad / Split complement / Monochrome — how the core hue relates to the primary |
| **Secondary hue offset** | slider | −180…+180° | ✅ | Manual nudge on top of the relationship |
| **Saturation** | slider | 0–200% | ✅ | Scales the archetype's saturation profile |
| **Brightness** | slider | 0–200% | ✅ | Scales the archetype's lightness profile |
| **Contrast between layers** | slider | 0–200% | ✅ | How different adjacent layers look |
| **Exotic oceans** | checkbox | off | ✅ | **Off by default, deliberately.** The ocean is the only layer with an authored hue range, and it exists because a sea derived freely came out brown on a rust-coloured world — the single thing that most stopped these reading as planets. Off, the sea keeps its blue-green range. On, its hue rolls anywhere on the wheel *and* its brightness ceiling lifts from 0.38 to 0.78, so pale, milky, white and near-black seas become reachable; Star activity then pushes it further toward looking chemically wrong. The sea still may never collide with its crust in hue and value at once |
| **Tertiary hue** | slider + toggle | 0–360° | ⬜ | Atmosphere / halo. Currently always derived automatically; the manual override is not yet exposed |
| **Accent hue** | slider | 0–360° | ⬜ | Artificial structures, lights, active systems. Arrives with Phase 9 |

**Not every layer answers to Primary hue.** Materials with a colour of their
own — water, ice, molten metal — keep it and only *lean* toward the primary, so
an ocean stays blue-green on a rust-coloured world. See
[ARCHITECTURE.md](ARCHITECTURE.md#colour). Dragging Primary hue therefore
recolours the rock and the atmosphere much more than the sea or the core, which
is intended.

All of these **scale the archetype's profile** rather than replacing it. A star
stays star-like at any hue because its saturation/lightness relationships are
preserved.

No manual per-layer colour picker — seed + these nudges is the decided approach.

---

## ▸ Traits

| Control | Type | Status | Notes |
|---|---|---|---|
| **Trait count** | slider | ✅ | 0–4, default 2. How many traits Randomize gives a body |
| **Trait list** | filtered checkbox list | ✅ | Generated from `data/traits.js`. Only shows traits compatible with the current archetype and already-selected traits |
| **Exclude from Randomize** | ✕ per trait | ✅ | A trait row is **tri-state**: ticked forces it on, ✕ bars Randomize from ever picking it, neither leaves it free to roll. Deliberately not a lock — "keep this value" and "never pick this" are different instructions |
| **Artificial traits allowed** | checkbox | ⬜ P9 | Allow megastructures on natural bodies. Arrives with the machine worlds |
| **Re-roll traits** | button | ✅ | Re-roll only the traits, keeping the seed, structure, palette and every layer detail byte-identical |

**Randomize clears the trait selection**, so the roll actually happens — a
ticked picker means "give me exactly these" and would otherwise survive the
button and make every rolled body carry the same traits. The picker is refilled
from what was generated, and rolled traits are named under the preview.
**Locking Trait count keeps your picks**: locking it says you care about the
traits, so the selection is left alone.

**There is no per-trait intensity control.** Every trait reads the one global
Detail density slider and interprets it in its own terms. Tidal locking used to
be the exception, with its own dial — it is now an *axis* in the Structure
section rather than a trait, which is where a continuous quantity belongs. See
[PROGRESS.md](PROGRESS.md) D27.

There is deliberately **no per-zone editor** — no arc or colour controls per
zone. The recipe stays authored; the user gets one continuous dial.

**Trait list behaviour:**
- Grouped by category (Climate · Interior · Orbital · Damage · Artificial)
- Incompatible traits are **hidden, not greyed** — a long list of unavailable
  options is noise
- Each trait has a tooltip explaining what it changes visually
- Selecting a trait may hide others (exclusions apply immediately)

---

## ▸ Detail

The section that carries the aesthetic thesis.

| Control | Type | Range | Notes |
|---|---|---|---|
| **Detail density** | slider | 0–100% | **The master control.** Every layer detail interprets this in its own terms via its own `count: [min, max]` — see [TRAIT-SYSTEM.md](TRAIT-SYSTEM.md). Default 65%. At the default a planet emits ~9,000 elements |
| **Size tiers** | slider | 1–4 | **Caps** how many size classes an element may use — `min(recipe.tiers, slider)`. Total count is unchanged; lowering it removes size *variety*, not density, and drops the **largest** tier first. 3 is the sweet spot |
| **Flow indicators** | dropdown | — | None / Subtle / Balanced / Diagrammatic. Governs both count (at generation) and treatment (at draw): Subtle downgrades arrows to headless motion lines, None removes them entirely |
| **Texture strength** | slider | 0–150% | Scales the **count** of speckle/grain/stipple, so it adds material rather than only darkening what is there |
| **Element opacity** | slider | 25–150% | Global multiplier on detail element alpha. **Draw-time only** — it never re-rolls geometry, so dragging it redraws from cache |

> **No "scale detail with resolution" control.** Element counts never vary with
> resolution — the same body is the same image at every size. See
> [ARCHITECTURE.md](ARCHITECTURE.md#resolution-independence). The preview is the
> full render, not a reduced-density stand-in.

> **Detail density is the single most important control in the app.** It should
> be the first thing a user notices and the default should already look dense.

---

## ▸ Labels & Info

| Control | Type | Notes |
|---|---|---|
| **Show info panel** | checkbox | ✅ The stat card over the preview. Also `I` |
| **Info detail level** | dropdown | ✅ Compact / Standard / Full — how many stat lines |
| **Show layer labels** | checkbox | ⬜ P8. The overlay: layer names with underline + 1px leader |
| **Label side** | dropdown | ⬜ P8. Both / Left only / Right only |
| **Label text size** | slider | ⬜ P8. 75–150% |
| **Show scale bar** | checkbox | ⬜ P8. Lower-left measurement line |
| **Scale comparison** | dropdown | ⬜ P8. None / Earth / Sun / Human / Ship — silhouette beside the scale bar |
| **Show body name** | checkbox | ⬜ P8. The card already shows it; this is the title in the *composed render* |

**The info panel is DOM, not canvas** (PROGRESS.md D53). On screen the card is
real text a user can select and copy. Drawing it *into* an exported PNG is what
the **Composition** dropdown below is for, and that lands with Phase 8 — it
will draw the same `stats.lines` through the canvas rather than computing
anything of its own.

**Every figure on the card is read off the render**, never rolled beside it —
HAZARDS.md holds the contract and `test/stats.mjs` asserts it across 576
bodies.

**Layer labels are names only.** No stat nuggets, no feature callouts, no
legend — that was v2's mistake.

---

## ▸ Output

| Control | Type | Notes |
|---|---|---|
| **Background** | dropdown | Transparent / Solid colour / Starfield / Gradient |
| **Background colour** | colour picker | Active when Solid or Gradient is selected |
| **Starfield density** | slider | Active when Starfield is selected |
| **Composition** | dropdown | Body only / Body + info panel / Body + labels / Full (panel + labels) |
| **Aspect ratio** | dropdown | 16:9 / 1:1 / 4:3 / 3:2 / Custom |
| **Resolution** | number + presets | 240–4320 px vertical. Presets: 720 / 1080 / 1440 / 2160 |
| **Body size in frame** | slider | 40–95% | How much of the frame the body occupies. Largely superseded by Zoom, which does the same job better; kept because shipped presets and settings strings carry it |
| **Zoom** | slider | 1x–20x, logarithmic | Close-up framing. Past ~10x the render turns abstract — smooth bands rather than detail — which is deliberate, not a limit to design around |
| **Pan** | drag the preview | ±extent, in body radii | No slider: nobody pans by typing numbers. Still a real (CSS-hidden) input, because the settings string is built by sweeping the panel for non-default control values |
| **Reset framing** | button | — | Back to the whole body, centred, at 1x |
| **Filename pattern** | text | Tokens: `{name}` `{type}` `{seed}` `{date}` `{ratio}` |

**Export button (pinned) opens a small menu:**
```
Export PNG  ·  current settings
Export PNG  ·  body + info card
Export PNG  ·  info card only
Export PNG  ·  1:1, body only
--------------------------------
Save factsheet  ·  Markdown
Copy current-settings PNG to clipboard
Copy seed + settings as text
```

That last one is worth having — it lets someone share a body as a short string
rather than an image.

**A body-only transparent item was removed** (Session H). The 1:1 export keeps
whatever the Background control says, so transparency is reached by setting
Background to Transparent and exporting — one framing choice and one background
choice, rather than a menu item multiplying the two together.

**How the size controls apply to each item:**

| Item | Resolution | Aspect |
|---|---|---|
| current settings | vertical size | as chosen |
| body + info card | vertical size | **as chosen, but never narrower than 4:3** |
| info card only | scales the card | n/a — the card's height follows its content |
| 1:1, body only | vertical size | forced 1:1 |

**The composed export has an aspect floor of 4:3.** The card takes a fixed share
of the *width*, so a narrow frame leaves the body too little — and the body is
sized off the shorter axis, which in a tall frame is that shrinking width. Below
4:3 the two stop coexisting. A narrower choice falls back to 4:3 rather than
failing, and the filename records the ratio the file actually has.

**The card-only export scales rather than being pinned to a height.** The card
has no aspect of its own, so forcing an exact height makes the width absorb every
difference in content — a six-line Compact card needed to be 1490px wide to reach
1080px tall. Resolution therefore sets the card's width as a fixed fraction, and
the height follows the content, so a 2160px card is a 1080px card at twice the
size.

---

## Presets

**The browsable menu of world types — without making them archetypes.**

A preset is a named starting configuration: archetype + colour profile + a few
slider positions + an optional trait or two. Picking one sets those controls and
nothing else; everything stays editable afterward, and locks still apply.

Presented as a **gallery near the top of the Body section**, so a user can browse
"what kinds of world can this make?" without knowing which traits to hunt for.
That discoverability is the entire reason presets exist.

**Solid**

| Preset | Sets |
|---|---|
| **Desert World** | Ocean depth 0, warm low-saturation palette, ice caps off |
| **Ocean World** | Ocean depth 90%+, thin crust, blue-green palette |
| **Frozen World** | Ocean depth low, interior heat low, ice-caps at high extent, cold palette |
| **Volcanic World** | Interior heat 100%, magma-chambers, thin crust, red-orange palette |
| **Dead World** | Interior heat 0, no atmosphere, no ocean, grey palette, cratered |
| **Garden World** | Ocean depth ~45%, interior heat ~50%, atmosphere, temperate palette |
| **Locked World** | Tidally-locked at full strength, moderate ocean depth |
| **Rogue World** | Starlight 0 — no star at all; warm only where its own core keeps it warm |
| **Tilted World** | Axial tilt past halfway — the Uranus case, poles warm and equator frozen |
| **Irradiated World** | Blue giant, Star activity 100, no atmosphere — cold *and* lethally irradiated |
| ~~Ice-Shelled Moon~~ | ⬜ P7. Needs the `moon` archetype and its ice-shell layer |
| ~~Rubble Pile~~ | ⬜ P7. Needs the `asteroid` archetype and Cohesion |
| ~~Solid Fragment~~ | ⬜ P7. Needs the `asteroid` archetype |

**✅ The ten shipped in Session G**, in `js/data/presets.js`. Three of the
originally-listed ten needed archetypes that do not exist yet — a preset is a
set of *control values*, so one naming an absent archetype cannot be a stored
configuration of anything. They are struck through above and land with Phase 7;
**Rogue World**, **Tilted World** and **Irradiated World** take their places,
each chosen to demonstrate an axis the climate system already has and nothing
else in the gallery shows: Starlight at zero, tilt past the inversion point,
and radiation as a fact independent of temperature.

**No `ice-caps` preset, and there must never be one.** D27 cut the trait; caps
emerge from a lowered snowline plus the existing deposition model. Frozen World
gets its ice by having Starlight 14, which is the same mechanism the render
uses.

**Gaseous**

| Preset | Sets |
|---|---|
| **Hot Jupiter** | Gas giant + tidally-locked, high storm activity |
| **Banded Giant** | Gas giant, violent-banding, great-storm, strong belt contrast |
| **Coreless Giant** | Gas giant, Core size bias −100 — no discrete core |
| **Superionic Ice Giant** | Ice giant, superionic layer present, tilted-axis |

**Stellar**

| Preset | Sets |
|---|---|
| **Quiet Sun** | Main star, Stellar activity low — clean, stable, tachocline visible |
| **Angry Star** | Stellar activity 100 — prominences, flare storms, heavy spotting |
| **Bloated Giant** | Old giant — extreme core-to-envelope contrast, shed envelope |
| **Patient Dwarf** | Dwarf star, full-depth convection loops, large starspots |
| **Binary Pair** | Any star + binary-companion — zoned facing hemisphere |
| **Dyson Swarm** | Main star + dyson-structure, Enclosure 0 — scattered collectors |

**Compact**

| Preset | Sets |
|---|---|
| **Magnetar** | Neutron star, Field strength 100 — vast twisted magnetosphere |
| **Millisecond Pulsar** | Pulsar, Spin rate 100, high beam tilt |
| **Feeding Black Hole** | Black hole, Accretion rate 100, relativistic jets |
| **Dormant Black Hole** | Black hole, Accretion rate 0 — almost entirely black |
| **Supermassive** | Black hole, Mass class supermassive, moderate accretion |

**Diffuse**

| Preset | Sets |
|---|---|
| **Emission Nebula** | Luminosity source 100, protostars, pillars, vivid multi-hue |
| **Dark Nebula** | Luminosity source 0, dark lanes, a cavity to hide in |
| **Reflection Nebula** | Luminosity source ~35, cool blue-biased palette |
| **Planetary Nebula** | Shell stack, white dwarf at centre |
| **Supernova Remnant** | Shell stack, filament web, pulsar at the heart |

**Artificial**

| Preset | Sets |
|---|---|
| **Derelict Machine World** | Operational status 0, Hull integrity ~50 — dark, breached, cold core |
| **Hive World** | Operational status 100 — every window lit, habitation maxed |
| **Automated Factory** | Operational status ~35, no habitation layer — running, nobody home |
| **Unfinished World** | Hull integrity ~40 with `construction: true` — scaffolding, clean edges |
| **Worldship** | Machine world + worldship — engine cluster on one side |
| **Planet-Cracker** | Machine world wrapped around a captured natural core |
| **Half-Built Dyson** | Main star + dyson-structure, Enclosure ~50 |
| **Coruscant World** | Planet + surface-city at max density + orbital-ring |
| **Hollowed Asteroid** | Asteroid, Cohesion 0, hollowed-out + docked-ships |

**Presets are not a body type.** A desert world is a planet whose ocean depth is
zero — which is why "frozen desert with a dying core" or "tidally locked ocean
world" are all reachable. Separate archetypes would have made those combinations
conflicts to resolve by hand; as parameter positions they simply work.

**Randomize ignores presets.** It rolls parameters directly, so it can produce
bodies that sit between named types — which is where the interesting output
lives.

---

## Randomize settings

Lives inside a section; the **button stays pinned**.

| Control | Type | Notes |
|---|---|---|
| **Randomize scope** | checkbox group | Which categories Randomize touches: Archetype / Seed / Colour / Traits / Structure / Detail. **Structure** covers the parameter axes (Ocean depth, Interior heat, Cohesion, and the archetype-specific ones) |
| **Archetype pool** | checkbox list | Which archetypes can be rolled. Lets you get "only stars" |
| **Respect locks** | checkbox | Default on. Off = randomize everything regardless |
| **Auto-randomize on load** | checkbox | Fresh body each time the page opens |

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Randomize |
| `Ctrl+S` | Export with current settings |
| `Ctrl+C` | Copy image to clipboard |
| `←` / `→` | Previous / next seed (increment the numeric part) |
| `1`–`6` | Toggle accordion sections |
| `L` | Toggle layer labels |
| `I` | Toggle info panel |
| `?` | Show shortcut list |

---

## Persistence

Settings persist in `localStorage` between sessions. A **Reset to defaults**
button lives at the bottom of the panel.

**Shareable state:** the seed plus all non-default settings encode into a short
string (via the "Copy seed + settings" export). Pasting it into the seed field
restores that exact body. No server, no URL shortener — just a string.

---

## Defaults

The out-of-box state should produce something impressive, because it's the
first thing anyone sees.

| Setting | Default | Status |
|---|---|---|
| Archetype | Planet | ✅ |
| Layer thickness variation | 70% | ✅ |
| Optional layers | 75% | ✅ |
| Core size bias | 0 | ✅ |
| Ocean depth | 40% — visible seas without drowning the crust | ✅ |
| Interior heat | 55% — a live, convecting interior; the mantle has something to show | ✅ |
| Boundary irregularity | 100% | ✅ |
| Keep upright | off | ✅ |
| Rotation | 0° | ✅ |
| Primary hue | 210° | ✅ |
| Hue relationship | Auto | ✅ |
| Secondary hue offset | 0° | ✅ |
| Saturation / Brightness / Contrast | 100% each | ✅ |
| Background | Starfield | ✅ — no lock; Randomize never rolls the type |
| Background colour | #05070e | ✅ — rolled dark, and lockable |
| Body size in frame | 78% | ✅ |
| Zoom | 1x | ❌ — framing is chosen for a shot, not rolled |
| Pan | 0, 0 | ❌ — survives Randomize deliberately, so a fixed crop can be kept across many rolls |
| Resolution | 1080 | ✅ |
| Aspect ratio | 16:9 | ✅ |
| Detail density | 65% | ✅ |
| Size tiers | 3 | ✅ |
| Flow indicators | Balanced | ✅ |
| Texture strength | 100% | ✅ |
| Element opacity | 100% | ✅ |
| Trait count | 2 | ✅ |
| Tidal locking | 0% — an ordinary rotating world | ✅ |
| Lock facing | 90° | ✅ |
| Show info panel | on | ✅ |
| Info detail level | Standard | ✅ |
| Artificial traits | allowed | ⬜ P9 |
| Composition | Body + info panel | ⬜ P8 |

**Randomize** rolls the structure axes and the colour anchors. Saturation,
brightness and contrast are rolled only in a narrow band around 100%, because
they *scale* the archetype's profile and the profile is what makes a body look
like its type — rolling them wide would just produce washed-out or over-cooked
versions of the same world.

---

## Deliberately absent

Controls that existed in v1/v2 and are **not** coming back, with reasons:

| Removed | Why |
|---|---|
| Art style selector | One style only — effort goes into making it good |
| Layer count slider | Produced nonsense like "Mantle I / Mantle II" |
| Palette dropdown | Replaced by generative HSV profiles |
| Boundary wobble (global) | Over-stylized; replaced by per-layer values with a taste multiplier |
| Overlay ink colour | Overlay is now minimal; derives from the palette |
| Separate 16:9 / 1:1 export buttons | Folded into the Export menu |
| Scale detail with resolution | Broke "same seed = same image" — the export would differ from the preview. Counts are now resolution-independent, always |
