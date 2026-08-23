# Archetype Template

*A fill-in sheet for specifying one celestial body type.*

**Status:** the five family docs in [celestials/](celestials/) are already
written using this shape. This template exists for **adding new types later**
without re-deriving the format.

**Why it matters:** if a body type can be described by filling this in, it needs
no new drawing code — it's data. If you find yourself writing "…and then it
needs a special thing that draws X", that's a **gap in the renderer or the trait
grammar**, and should be fixed there rather than special-cased per body.

See [TRAIT-SYSTEM.md](TRAIT-SYSTEM.md) for the placement grammar and
[ARCHITECTURE.md](ARCHITECTURE.md) for the pipeline.

---

## Sheet

### Identity

- **ID:** `kebab-case-id`
- **Display name:**
- **Family:** Solid / Gaseous / Stars / Compact / Diffuse / Artificial
- **Body tags:** *(drives trait compatibility)* — `solid-surface`
  `solid-interior` `gaseous` `stellar` `compact` `diffuse` `has-atmosphere`
  `luminous` `artificial` `no-surface`
- **One-line pitch:** *what makes this worth visiting?*

### Standard stack

Outermost first. `frac` = **outer** radius as a fraction of body radius; each
layer runs inward until the next one starts, so a layer's thickness is its own
`frac` minus the `frac` below it. **No layer-count slider** — this stack is
what this body type *is*. Only thickness, presence, and structural traits vary.

| # | Role | Frac range | Presence | Boundary | Shell/gap | Notes |
|---|------|-----------|----------|----------|-----------|-------|
| 1 |      |           |          |          |           |       |
| 2 |      |           |          |          |           |       |
| 3 |      |           |          |          |           |       |
| 4 |      |           |          |          |           |       |
| 5 |      |           |          |          |           |       |

**Presence** — omit for always-present · `0.8` for a probability roll · or
`{param, above, fade}` for a parameter threshold. Use the parameter form for
anything an axis should control; that is what keeps Ocean depth, Cohesion and
Operational status from becoming special cases.

**Frac** — `[min, max]` rolled · `{param, over, depth}` to sit on top of
another layer (`over: "surface"` = whatever the outermost solid layer is) ·
omitted entirely for the innermost layer, which runs to the centre.

**Boundary values:** `perfect circle` · `near-perfect` · `slight wobble` ·
`irregular` · `heavy wobble` · `extreme wobble` · `soft gradient` · `cone` ·
`disc` · `point`

**Surface relief is separate from boundary character.** A layer may also
declare `relief: <height>`, which attaches a terrain field to its boundary
(see [PROGRESS.md](PROGRESS.md) D15). The two compose — relief is added to
whatever wobble the boundary value gives — so a layer can be `near-perfect`
*and* carry mountains.

Full layer-property list in
[ARCHITECTURE.md](ARCHITECTURE.md#layer-properties) — including `opacity`,
`shell`, `gap`, `pillars`, `outward` and `luminous`.

> ⚠️ **Check the numbers compose before writing code.** At every combination of
> range extremes, radii must stay ordered and no layer may collapse to nothing.
> The planet, moon and asteroid tables all failed this as first authored.
>
> ⚠️ **Exaggerate thin layers.** Proportions are stylized to textbook-diagram
> thickness, not physical — a layer too thin to hold detail has failed at its
> only job. See
> [ARCHITECTURE.md](ARCHITECTURE.md#proportions-are-stylized-not-physical).

**Existing roles:** `atmosphere` `haze` `corona` `chromosphere` `photosphere`
`ocean` `ice-shell` `crust` `mantle` `convective` `radiative` `tachocline`
`metallic` `degenerate-core` `core` `void` `debris` `ring` `accretion-disc`
`jets` `filament` `outer-hull` `machinery` `power-core` `shell` `cavity`
`remnant-star`

> A new role is a small reusable renderer addition — acceptable. A one-off
> special case is not.
>
> **New roles needed:** …

### Colour profile

Hue is generally **free**. What defines a type is saturation and value
*per layer*.

| Layer role | Saturation | Value | Own hue + lean | Self-lit | Opacity (if not 1.0) |
|---|---|---|---|---|---|
|   |   |   |   |   |   |
|   |   |   |   |   |   |

- **`order`:** *(REQUIRED — list every role above, outermost first)*
- **Hue constraint:** `[0, 360]` unless there's a strong reason
- **Core relates to surface by:** complement / analogous / triad / split / same
- **Accent hue used?** *(artificial elements only)*

**Own hue** (`hue: [min, max]` + `hueLean`) — for materials that keep their
colour whatever the body is made of: water, ice, molten metal. Leave blank and
the layer derives its hue from the primary/secondary anchors. Without this, an
ocean comes out brown on a rust-coloured world.

**Self-lit** (`incandescent: true`) — for material that emits rather than
reflects: molten cores, photospheres, accretion discs. They keep a looser
saturation ceiling, brighten with heat, and are shaded glowing-outward.

> ⚠️ **`order` is not optional.** Colour is derived from a layer's position in
> that list rather than its measured radius, which is what stops one layer's
> thickness change from recolouring its neighbours. Omit it and that bug
> returns. See
> [ARCHITECTURE.md](ARCHITECTURE.md#changing-one-layer-must-never-recolour-another).

### Layer details — always drawn

Standard equipment. If the layer would look wrong without it, it belongs here;
otherwise it's a trait.

| Layer role | Elements | Count range |
|---|---|---|
|   |   |   |
|   |   |   |

**Density note:** counts are *before* the Detail slider scales them. Aim high —
many small faint things beats few large ones. Use 2–3 size tiers.

### Layer behaviour

What each layer visibly *does*. Moving layers get arrows; static layers get
texture only.

| Layer role | Behaviour | Treatment |
|---|---|---|
|   |   |   |

*Treatments:* `diagrammatic` (flow arrows) · `subtle` (motion lines) ·
`textural` (no motion cues)

### Parameter axes

**Fill this in before the trait list.** Most of what makes a body type varied
is an axis, not a trait — and an axis defined here removes several traits from
the list below. See [PARAMETERS.md](PARAMETERS.md#archetype-specific-structure-controls)
for the existing set.

| Axis | Range | What it drives | Which traits it replaces |
|---|---|---|---|
|   |   |   |   |

An axis is right when the thing varies **continuously** and its extremes are
mutually exclusive. Name the axis after the *quantity*, not either extreme —
"Interior heat", not "Volcanic".

### Climate and the star

**Fill this in too.** Starlight, Star colour, Star activity and Axial tilt are
*universal* — they are always in the panel, whatever archetype is selected — so
a new family does not add them. What it must decide is **how much of each
reaches it**, and say so in data.

| Question | Answer for this archetype | How it is declared |
|---|---|---|
| Is it warmed by a star? |   | `climate: { starlit: false }` to decline |
| Does it have latitude? |   | `climate: { latitude: 0–1 }`; omit the spec for a flat field |
| What does Star activity do to it? |   | consume `climate.coverAt` / `radiationHazard()` |
| Does a fluid go exotic? |   | `exotic: {…}` on the layer |

**Getting this wrong is SILENT**, which is why it is a required field rather
than an optional one. A control that should do nothing and quietly does
something is far harder to notice than one that visibly breaks — a star that
inherits a polar cap, or a black hole whose temperature answers to a Starlight
slider, will simply produce a subtly wrong number nobody thinks to check.

See [PARAMETERS.md](PARAMETERS.md#which-universal-controls-apply-to-which-family)
for the per-family table and the reasoning behind each entry.

> **Do not add a second control for something a universal axis already
> covers.** `Stellar activity` was specified as a per-star control and is
> superseded by the universal **Star activity** — they are the same quantity,
> and a star body and the star a planet orbits are the same physical object
> seen from two sides. If they ever disagree the tool contradicts itself.

### Traits

- **Eligible traits:** *(from the shared pool)*
- **Type-exclusive traits:** *(only this type can have them)*
- **Excluded traits:** *(explicitly incompatible)*

For each exclusive trait, fill in the grammar:

| Trait | anchor | reach | arc | repeat | mirror | element | zoneBias | density 0→1 |
|---|---|---|---|---|---|---|---|---|
|   |   |   |   |   |   |   |   |   |

**Before adding any trait, apply the three tests** from
[TRAIT-SYSTEM.md](TRAIT-SYSTEM.md#the-three-tests):

1. **Does it need to exclude a sibling?** → it's an axis; put it in the table
   above instead.
2. **Is it visible in the cutaway?** → if not, it's stats or flavour text.
3. **Does the layer stack differ, or only the values in it?** → only a genuinely
   different stack earns a structural branch.

A trait that survives all three is a real trait. **Structural branches** are
rare and need a separate note describing exactly what they change; the whole
catalog currently has three (ice-shelled moon, shell nebula, planet-cracker).

### Preset entries

Named starting configurations that make this type's range discoverable. Each is
control values only — no new code. See [PARAMETERS.md](PARAMETERS.md#presets).

| Preset name | Sets |
|---|---|
|   |   |

### Scale & stats

- **Typical radius:**
- **Typical gravity:**
- **Temperature range (°C):**
- **Stand on it?** yes / no / depends
- **Breathe?** never / with traits / usually
- **Signature hazard:**
- **Stat template:** *(which template from [HAZARDS.md](HAZARDS.md), or a new one)*

### Flavour

Three or four plain-language descriptions. No jargon, no unexplained units, no
invented inhabitants.

- …
- …
- …

---

## Checklist before considering a type done

**Structure**
- [ ] Every layer uses an existing role, or new roles are justified as reusable
- [ ] Every boundary has a stated character and a reason
- [ ] **The frac ranges compose at every combination of extremes** — radii stay
      ordered, nothing collapses to zero thickness. Verify by building the
      stack, not by arithmetic
- [ ] **Thin layers are exaggerated** to textbook-diagram thickness, with room
      for the detail they need to carry
- [ ] Anything an axis should control uses `presence: {param, …}` rather than a
      fixed roll

**Colour**
- [ ] **The climate spec is a deliberate decision** — `starlit` and `latitude`
      are declared, or the spec is deliberately omitted for a flat field. Never
      left to default by accident: a star inheriting a polar cap is silent
- [ ] **No new control duplicates a universal axis.** Star activity, Starlight,
      Axial tilt and Star colour are already in the panel for every body
- [ ] **`gen/climate.js` gained no role-name branch** — an archetype declares
      what it is and the generator believes it (D27)
- [ ] **`colorProfile.order` is declared**, listing every role outermost-first
- [ ] Saturation/value profiles distinguish it from neighbouring types
- [ ] Materials with a colour of their own declare `hue` + `hueLean`
- [ ] Emissive layers are marked `incandescent`
- [ ] Adding or removing an optional layer leaves the others' colours untouched
- [ ] Checked on a contact sheet (`npm run sheet`), not on single renders

**Detail**
- [ ] Detail counts are high enough to look intricate at 65% density —
      and are **absolute**, since counts never scale with resolution
- [ ] At least one layer has a distinctive signature texture

**Traits and discoverability**
- [ ] **Every trait passed the three tests** — no axis is masquerading as a
      mutually-exclusive pair, nothing invisible is a trait
- [ ] Parameter axes are named after the quantity, not an extreme
- [ ] At least two presets, so the type's range is discoverable

**Nothing in `draw/` branches on this archetype's id.**
- [ ] Trait list has at least 6 eligible entries
- [ ] Any structural branch describes exactly what it restructures
- [ ] Stats template avoids Kelvin, solar masses, and bare units
- [ ] Nothing in the sheet requires new drawing code

---

## Worked examples

Rather than duplicating them here, the five family docs are the reference —
each was written against this template:

| Doc | Types |
|---|---|
| [celestials/solid-bodies.md](celestials/solid-bodies.md) | planet · moon · asteroid |
| [celestials/gaseous-bodies.md](celestials/gaseous-bodies.md) | gas-giant · ice-giant |
| [celestials/stars.md](celestials/stars.md) | young · main · old-giant · dwarf |
| [celestials/compact-objects.md](celestials/compact-objects.md) | neutron-star · pulsar · black-hole |
| [celestials/diffuse-bodies.md](celestials/diffuse-bodies.md) | nebula |
| [MACHINE-WORLDS.md](MACHINE-WORLDS.md) | machine-world + megastructure traits |

**`planet`** is the most complete worked example; **`nebula`** is the best test
of whether the model stretches; **`black-hole`** is the best test of whether it
handles a body that is mostly absence.
