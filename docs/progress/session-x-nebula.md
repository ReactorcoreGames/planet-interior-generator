# Session X — Phase 7's last group: the nebula

**D219–D240.** The diffuse family's one archetype, `nebula`, built in four stages with the user reviewing each: (1) the filled stack, extreme wobble and translucency; (2) Luminosity source; (3) the shell stack; (4) traits, stats, flavour, presets. Stages 1–3 were signed off by the user in the app ("absolutely gorgeous and quite varied" after stage 1); stage 4 is built and waiting for the user's eye. **This closes Phase 7.**

**No existing body changed.** All 36 renders of the previous archetypes hash identically to HEAD (`1dcab45` for stages 1–3, `a1945d7` for stage 4), checked with `test/_tmp/_u1regress.mjs` against a worktree of that commit after every renderer change. `npm test` passes. Trait eligibility for every other archetype is unchanged, and none of their traits is offered on the nebula (printed before and after, `test/_tmp/_xelig.mjs`).

Scratch tools: `test/_tmp/_xstack.mjs` (print the built stack, boundary swing and neighbour crossing), `_xwob.mjs` (sweep wobble multiplier and frequency against crossing), `_xgrid.mjs` (8-body contact sheet plus a large render, with timings), `_xprobe.mjs` (one render with settings overrides and an optional CC mutation, used to isolate one mark kind at a time), `_xdots.mjs` (the path-fill benchmark behind D225). Stage 4 adds `_xelig.mjs` (trait eligibility per archetype), `_xtraits.mjs` (each trait on each form it is offered on, pixel-diffed against the same body without it, plus a sheet), `_xsheet.mjs` (every trait alone on one form), `_xcard.mjs` (the card across forms, light and traits), `_xhaz.mjs` (hazard frequency over 300 random nebulae) and `_xpresets.mjs` (the presets as the app applies them). Renders are in `shots/x/`.

---

## Stage 1 — the filled stack

### D219 — the wobble cannot go far enough on its own; regions drift

The spec's family note said to verify early that the wobble system can go far enough. **Measured: it cannot.** A boundary is `radius × (1 + noise × amp)`, so the swing scales with the layer's own radius. A small inner region never reaches a large outer one without its own outline being pinched toward the centre:

| `wobbleScale` on `extreme` | halo/sparse cross | sparse/dense | dense/core | smallest multiplier |
|---|---|---|---|---|
| ×3 | 3% of bearings | 0% | 0% | 0.68 |
| ×4.5 | 11% | 3% | 0% | 0.52 |
| ×6 | 19% | 9% | 2% | 0.36 |
| ×7.5 | 23% | 13% | 7% | 0.19 |

At ×6 the first render was **a flower with a bullseye**: deep troughs pulled every region into petals round a shared centre, and the blue core sat dead centre in a pink ring, which is exactly the "clean ring structure" the spec forbids.

What a real nebula has that concentric shells cannot is an **off-centre heart**. So a region may declare `drift: [lo, hi]`, a rolled distance (scaled by Boundary irregularity) in a rolled direction, from its own stream. The region's fill and its riding details are drawn through a view moved by that offset (`CC.Feather.driftView`), so they move together. Wobble came back down to ×3.2–3.6 at a low frequency (1.6): a few great lobes rather than a frill, and the crossing now comes from the drift.

### D220 — a region has no edge: `feather`, `ride`, rolled `opacity`

Every banded layer is a filled disc with a crisp outline, a stroked edge, and details clipped to its annulus. That is right for every material so far and wrong for a region of gas (D156). Three general layer properties in a new file, `js/draw/feather.js`, each absent on every other body:

- **`feather`** — the fill fades to nothing over this share of the layer's radius, following the wobbled outline. Built as nested whole outlines with each ring's alpha solved so the compounded coverage follows a smoothstep: a radial gradient cannot follow a wobble, and pie slices leave spokes (`fillOutward`'s note). A feathered layer strokes no line.
- **`ride`** — the layer's details are drawn through a view whose `at` scales every radius by the layer's boundary at that bearing, and they are not clipped. `view.at` is the single funnel (D184), so no primitive knows. **The ride uses a smoothed outline** (tabled at 360 bearings, box-averaged over ±12°): through the raw boundary, with its fine octaves, every filament was jerked in and out at each step and drew as lightning.
- **`opacity: [lo, hi]`** — rolled from the layer's own stream (`structure/opacity/<role>`), so rolling it reshuffles nothing.

### D221 — a region IS its density field (raided from the background)

With the fills translucent and feathered, the regions were still flat tinted discs, and the elements laid over them read as even confetti. Isolating the layers showed the problem: **nothing supplied large-scale variation**, the thing that makes a cloud look like a cloud.

The background nebula (`draw/canvas.js`, D94–D107) already solves exactly that: a lattice of soft discs whose alpha follows a noise field, two smooth octaves for the mass and one ridged octave for the filaments. Moved into body space, it became `js/gen/diffuse.js`:

- **One density field per body**, keyed by the seed alone, so every region agrees where the thick gas is. Read where the mark will actually be drawn (the region's drift included).
- **`cloud-field`** — one element per region carrying a jittered square lattice of cells, each with the field's density, drawn as soft discs screened onto what is behind, fading toward the region's edge. Fixed lattice in body space, so it is the same picture at every resolution. `fade` sets where that fade begins; the small core fades over most of its radius, or it reads as a ball.
- **Region placement for every soft mark.** Every other builder places in a layer's BAND. The nebula's regions overlap and drift, and placed in the annulus the dense region's billows came out as a ring round an empty hole wherever the core had drifted away: a donut. These builders place across the whole region, **weighted by the field** (weighted reservoir sampling, three candidates per survivor, so the count stays exactly Detail density's). `follow` says how strongly: billows and knots seek the peaks, dust follows loosely, lanes seek thick gas because a lane over a void obscures nothing. `mote` is placed this way and emitted as `speckle`, so it still batches.

**The spec's per-layer opacity now lives in the cloud field's alpha**, and the flat fill is demoted to a faint wash under it (0.04–0.26). At the spec's 0.10–0.80 the flat fills swamped the field and the core read as a hard disc.

Builders get the body seed through `opts.seed`, one added key in `gen/details.js` that every other builder ignores.

### D222 — the authored table, restated where it is drawn

The spec authors the halo's OUTER edge at 1.10–1.60, so renormalization (D3) divided the whole stack by up to 1.6 and the core was drawn at 0.09–0.22. That is D163 again: the authored number is not the drawn number. The table is now stated at the radii it is drawn at: halo **at 1.0**, sparse 0.66–0.80, dense 0.40–0.54, core 0.16–0.28. The proportions are the spec's; renormalization now has nothing to do.

**Protostars are elements, not a layer.** The spec lists them as an optional innermost "layer" at 0.0–0.30, which collides with a core-region authored at 0.10–0.34 (D118's shape: a thin layer and a deep one competing for the same space). They are points, so they are `protostar` elements in the core region. Luminosity source will decide whether they exist (stage 2).

### D223 — marks that rebuilt the rings, and the soft vocabulary

`js/draw/primitives/diffuse.js`: `cloud-field`, `puff`, `billow` (a lumpy heap of puffs, the spec's "billowing blobs"), `filament`, `lane`, `knot`, `rim`, `protostar`. Every one dissolves: radial gradients to the colour's own transparent (fading to transparent black puts a dark fringe round every puff), and strokes whose alpha follows sin(πt), so both ends are zero.

Two marks quietly rebuilt the concentric structure the family must not have:

- **Rims faced the body's centre**, so the core's lit edges formed concentric crescents. A nebula's clumps are lit by its dominant source, so one light bearing is rolled per body and every rim and knot faces it, ±20°.
- **Lanes wandered tangentially like filaments**, so every dust lane curled round the middle. A lane lies across the gas at any heading.

### D224 — `tiers: 2` keeps the two SMALLEST tiers

The lanes were tiny black commas, and the cause was D122 in a sharper form: `tierSplit` drops tier 0 first and keeps the LAST n tiers, so a recipe declaring `tiers: 2` draws at 0.27× and 0.14× of its authored size, not 0.52×. Lanes, protostars and the core's lanes are now authored for that.

### D225 — one path of thousands of dots costs seconds

Doubling the motes (D226) took a render from ~210 ms to 450–850 ms. Removing them alone took it from 659 ms to 181 ms. **Filling one canvas path costs superlinearly in its number of contours** (`test/_tmp/_xdots.mjs`, 7,000 dots of 0.6–2 px):

| dots per path | time |
|---|---|
| 7,000 (one path) | 4,040 ms |
| 2,000 | 1,206 ms |
| 500 | 381 ms |
| 100 | 94 ms |
| 1 | 34 ms |

`drawSpeckleBatch` fills each whole group as one path, which is the expensive choice once a group is large. D201's 900 clipped circles at 70 ms was the same effect. A speckle element may now carry `chunk: N`, and the batch flushes every N dots; the nebula's motes use 24. **Opt-in, because chunking is not pixel-identical**: separate fills compound alpha where two dots overlap, one path does not. Every other body is untouched. **Open for the user:** the same change applied globally would likely speed up every body with dense grain (a planet draws ~9,500 elements, mostly speckle), at the cost of slightly different pixels everywhere.

### D226 — the budget

At default Detail density a nebula is ~6,000 elements plus ~2,240 cloud cells; at maximum ~7,600 plus ~2,240 (measured over three seeds). The motes were doubled to get there, because they are the cheap tier the density thesis wants. It is not the generator's largest count (a main star draws ~15,000), and was not chased further: the spec's "highest element budget" was written before the stars were built, and the count is a means. Render time: ~230 ms at default and ~330 ms at maximum, at any resolution (a planet is ~222 ms).

---

## Stage 2 — Luminosity source

### D227 — one slider, four declarations, each a curve

The spec's dark / reflection / emission are three points on one axis, and the slider moves opacity, lightness, hue and whether internal light exists all at once. Each consumer reads it through a declaration — a piecewise-linear curve over the parameter (`CC.Math.curve`, new in `core/math.js`) — so no code branches on a nebula:

| Declaration | Where | What it moves |
|---|---|---|
| `colorProfile.dial: { param, val, sat, hue: { to, amount } }` | `gen/palette.js` | every layer's value and saturation, and a lean toward 214° (scattered starlight is blue) peaking at 35% |
| `opacityBy: { param, scale }` on a layer | `gen/structure.js` | the flat fill's opacity, ×4.2 at dark (capped 0.95) down to ×1 at emission |
| `dial: { param, count, alpha, size, emit, absorb, side }` on a recipe | `gen/diffuse.js` | per-mark counts and alphas; on the cloud field, how much it **absorbs** (painted dark over what is behind), **emits** (screened) and how strongly one **side** is lit from the body's light bearing |
| `emissiveGlow` with a curve `strength` | `draw/emissive.js` | the backlight (D228) |

**The cloud field draws in two passes now** — absorb first, then emit — because a dark cloud and a glowing one are not the same mark at two brightnesses: one takes light away and the other adds it. Absorption rises faster with density than emission does (d^0.75 against d^1.5), so even middling dust is opaque. **Protostars exist only above the middle** (count curve zero below 45%): a reflection nebula is lit from outside, so its stars are not inside it. A dial's count is applied after Detail density and the candidates are rolled from the full count, so dragging the slider never reshuffles the survivors.

Wired like Spin rate: `index.html` row with tooltip and lock, `main.js` param in the detail key (it reaches structure, detail and palette), `CONTROL_SPECS`, Randomize over the full range, settings round-trip (generic). Default 70%. Interior heat is now inert on a nebula (`heatDriven: false` on every region) — a cloud has no interior to heat.

### D228 — a dark nebula is seen against what it blocks

The first sweep's dark end was a dim brown smudge. A dark cloud on black sky is invisible by construction; real ones are **silhouettes** against glowing gas or dense starfields behind them (the Horsehead against IC 434). So the emissive pass lays a broad glow BEHIND the body, strongest at 0% and gone by 55%, and the absorbing pass blots it out. Four general fields on `emissiveGlow`, each absent on every other body (36 renders still identical):

- **`from`** — where the glow starts, as a share of the extent. 0 puts the light behind the body rather than round it.
- **`strength` as `{ param, curve }`**.
- **`sat` / `val`** — a light behind the body is not the body's light; in the halo's own colour, which Luminosity has just darkened, it lit nothing.
- **`falloff`** — the exponent, 2 by default. Squared, nearly all the backlight sat behind the densest dust where it was wasted; a backlight wants to be broad and flat (0.9).

**A judgement call:** the backlight tints the frame round a dark nebula. It is the only way the dark end reads at all, and it is the true situation of every dark nebula ever photographed.

## Stage 3 — the shell stack

### D229 — Nebula form: a select, and a presence form for it

The user handed this decision over. The spec wanted presets to select the shell stack, but a preset can only set a setting, and a setting with no control is a stack nobody reaches without knowing the preset exists — D171 in a new shape. So it is a **Nebula form** select (Cloud / Planetary nebula / Supernova remnant), visible on every body like Caverns and Spin rate, Structure stage, rolled by Randomize at 60/20/20 so the shells stay the striking exception, and set by the presets.

The stack branch is data: **`presence: { param, is: [...], dflt, chance }`** (`gen/structure.js`, form 6) — present while a setting names one of the listed values; `chance` adds an optional roll, consumed whatever the setting is, so switching form reshuffles nothing. The moon's branch is rolled; this one is chosen.

**The doccheck's branch enumerator had to learn the form**, or it composed the cloud and the shell as one flat list and reported overlaps between layers that never coexist. This is the existing check made to understand a new general presence form, exactly as it learned `requires` for the moon — it stays generic over archetypes and adds no family code. It now reports 48 extremes across 3 branches for the nebula.

### D230 — a shell is empty in the middle, and every fill path assumed otherwise

- **The shell has no flat fill** (`opacity: 0`): every layer fill is a disc to the centre and would fill the cavity. The ring is its cloud field alone.
- **`band: true`** on a recipe places in the layer's own annulus instead of its disc, and the cloud field fades in from the inner edge (brightest a third of the way out) as well as out at the outer one, so the cavity gets no drawn rim.
- **`centre: true`** turns a lit edge toward the body's centre rather than the light bearing — the shell's cometary knots are lit by the dead star inside it. The one place in the family where facing the middle is the truth rather than a ring artefact (D223).
- **The outer shock is a banded region, not an outward falloff.** As an outward layer it painted a pale disc over the whole translucent nebula, because both of `fillOutward`'s paths fill to the centre. An opt-in `hollow` clip removed the disc but exposed a hard rim where the falloff starts at full strength, so it was **removed** rather than left as an unused mechanism, and the shock became one more feathered region outside a shell authored at 0.72–0.80. When the optional shock is absent, renormalization brings the shell back to 1.0 by itself (printed: 1.000 / 0.375–0.429 thick).
- **The two shells are the same role with different edges and marks:** a planetary nebula's ring is smoother (`heavy` ×0.9) and knotted (knots ×1.5, filaments ×0.45); a supernova remnant's is ragged (`extreme` ×2.2, frequency 3.4) and woven of filaments (×3.5 count, ×1.4 length, knots ×0.25). Same `role: "shell"` on two specs gated to different forms, so the colour and element tables are shared and `elementScale` tips the mix.

### D231 — the pulsar at the remnant's heart: a declaration, not a nested body

The user handed this over too. The compact family's own `poles` and `beams` (`js/gen/compact.js`) on the nebula, with two general fields added to `beams`:

- **`base`** — where the beams start, in body radii. It was a hard 0.96 (a star's surface) in five places in `drawAxial`; now every figure is measured from `b0`, and `0.96 + 0.02 === 0.98` was checked so the default reproduces the old constants exactly.
- **`when: { param, is }`** — beams only on the remnant form.

So a supernova remnant's pulsar is a white-hot point firing two beams across the cavity and out through the shell, widened by Spin rate as on a real pulsar. A nested neutron-star render was rejected: at this scale its whole stack is a few pixels, and the beams are what make a pulsar a pulsar. A planetary nebula's white dwarf is the same point without the beams.

### D232 — "the smash ball": three marks framing one point (the user's review)

Flipping through shells in the app, the user found the centre often looked like the Super Smash Bros. smash ball: a grey sphere with a cross on it. Rendered at 4× zoom it was three separate faults stacked on one point, each harmless alone:

- **A stroked circle.** The remnant star was a `near-perfect` band, so the renderer stroked its boundary like every band — the fill was invisible (`opacity: 0`) and the outline was not. It is now `soft-gradient`, the black hole's glow-only pattern (D209).
- **A glow that read as a disc, with the spikes inside it.** The `protostar` glow had a long gentle skirt and its spikes stopped at 1.1–1.6 of the glow radius, so at this size they were lines painted on a lit ball. The glow is now steep (nearly all its light within a fifth of the radius) and the spikes run to 1.9–2.8 radii, thinner, fading out beyond it — light spilling off a point. The star is also smaller and pinned to the exact centre (`reach: [0, 0]`); scattered in its small band it sat visibly off-centre in its own circle. The cloud's protostars share the mark and take the same refinement.
- **Beams ending flat at the glow's edge.** They started at 0.035 radii with a star's 0.03 root width, so two flat-ended slabs bracketed the glow like a capsule. `beams.root` (new, general; default 0.03 in the primitive, so the pulsar and black hole are untouched) and `base: 0.004` let them leave the point itself.

**Then it read as a hard X** (the user, on the fix: "unnatural to look at"). Four constant-width strokes of equal weight at right angles are a drawn glyph, not light. Spikes are now tapered wedges, widest at the point and closing to nothing at the tip, fading the whole way, one pair longer and stronger than the other. A recipe's `spikes` (0..1) scales them, and the remnant star keeps a 0.3 trace: on a supernova remnant the beams already say where the source is, and a white dwarf reads as a soft point.

Isolating it took two renders — beams removed, star removed — which is D88's principle again: when a mark reads wrong, take things away until it stops.

## Stage 4 — traits, the card, flavour, presets

### D233 — a trait may depend on a setting: `when`

The nebula is one archetype with two stacks chosen by Nebula form, and some traits mean something on one and nothing on the other — a wind-blown cavity in a shell that already IS a cavity. Tags cannot say that (both stacks are one archetype), and anchoring alone is the D121 failure: a trait whose anchor is missing on the built body rolls, appears on the card, and draws nothing. So a trait may declare **`when: { param, is, dflt }`**, the same shape as a layer's `presence`, and `CC.Traits.eligible(archetype, params)` honours it when given settings. The roller passes them, so a gated trait is neither rolled nor honoured from the picker on the wrong form; the picker passes them through a settings function from `main.js` and rebuilds when Nebula form changes, on paste (`syncArchetypeConsumers`) and on Randomize with the trait count locked — D114's three routes. A ticked trait that the form hides stays ticked and comes back when the form does. Absent on every other trait, so nothing else changes.

| Trait | Cloud | Planetary | Remnant | Why |
|---|---|---|---|---|
| pillars, bow shocks, filament web, the five material pockets, the three built | ✓ | ✓ | ✓ | On a shell the pillars point at the dead star: the Helix's cometary knots, a remnant's fingers |
| dark rift | ✓ | ✓ | — | A planetary nebula's waist is often a dark band; a remnant's shock has swept its dust out |
| cavity, protostar cluster, embedded star | ✓ | — | — | A shell is already a cavity; a dying star's ejecta forms no stars, and the remnant star is the star |

The picker gained two sections, **Structure** and **Contents** (the first tag that matches a group wins, so no existing trait moved), and a tooltip for each trait.

### D234 — traits placed by the gas: the `pocket` placer

The grammar places instances ROUND a body: an anchor layer, a depth in its band, a set of bearings. A nebula's regions overlap and drift, so a band means nothing, and its traits belong where its gas is: ice where the cloud is thick, a station hidden in a void, pillars standing on a bank of dense gas with their heads toward the light. So a trait may declare **`place: "<name>"`**, and `placeOne` hands the elements its ordinary builder made to a placer registered by name (`CC.ElemGen.registerPlacer`), which moves them. The element is still built by the same builder a layer detail uses, which is the trait grammar's whole promise. The nebula's placer is `js/gen/diffuse-pockets.js`:

- **pocket centres** are area-uniform candidates kept by a weighted reservoir on the body's density field (`seek`: + thick gas, − voids, 0 uniform), held apart from each other, inside `within` or, with `band`, the anchor layer's own annulus;
- **`front`** prefers thick gas with thinner gas a step toward where the mark will point: an ionisation front, which is where real pillars stand;
- **`formation`**: `scatter` (triangular falloff, stretched along an axis into a belt by `stretch`), `centre` (one element per pocket, sized by it), `row` (side by side across the aim), `line` (in file on one heading — ships under way);
- **`aim`**: toward the body's one light bearing, toward the centre, along the pocket's heading, or random — stamped as `aim` and `rot`;
- **`extras`**: marks at each pocket's centre (a cluster's shared glow, a cavity's star), **`hueShift`** rolled per pocket, a trait **`dial`** (the recipe dial for a trait), and **`byAnchor`** to restate any of it for the layer the trait actually resolved to — on a shell, search the ring and aim at the middle.

Every nebula trait is `spanning`, so it is drawn after all the gas, through the plain view, in body space — which is the space the density field lives in. `placeOne` now hands builders the body seed and the settings, as the detail stage does; no builder used by an existing trait reads them.

### D235 — one trait inside another: `nest`, and `under` in the spanning pass

The spec's most evocative picture is a relationship — a hidden station *in* a cavity — and two traits placed by their own rolls land wherever those rolls put them. **`nest: [traitIds]`** (with `nestAt`, the share of the host's radius out from its centre) moves the nesting trait's whole group, rigidly, onto the first host present, after every trait is placed, so the order the traits were rolled in does not matter; the group then draws after its host. With no host it stays where its own placement put it — a station with no cavity hides in the thickest gas instead, which is an honest answer. The mining flotilla nests beside whichever material pocket the nebula has. Placed elements carry `pocket: {x, y, r}` so a host's cluster, not one of its rocks, is what is nested on.

**`under`** now also sinks a trait in the spanning pass (gen/details.js, the same stable partition the layer lists had): a cavity is the ground its contents sit on, and drawn after a station its dark interior blotted the station out. No existing spanning trait declares `under`, so nothing else moved.

### D236 — fifteen traits, each a different kind of mark

The cloud's own vocabulary is soft discs, threads, lanes, knots and points of light. Every trait had to be a different statement, or it is more cloud (D76/D160). Six new primitives in `js/draw/primitives/diffuse-marks.js`, all reading positions through `view.at` and naming no role:

| Trait | Mark | What separates it |
|---|---|---|
| Dark Rift (`dark-lanes`) | `lane`, the length of the cloud | see below |
| Pillars | `pillar` — a column | the only mark with a direction it points: dark body dissolving into the bank, a lit sheath down both flanks, a lit head with nubs, gas boiling off toward the light |
| Bow Shocks | `bow-shock` — a parabola | the only smooth geometric curve in the body; gas piled at the apex, wings fading out |
| Wind-blown Cavity | `bubble` — a hole with a skin | its inside blocks the glow of an emission nebula and lets the backlight through a dark one (a trait `dial`), ringed by lumpy swept-up gas, its star at the middle |
| Filament Web | `web` — a network | threads that MEET and close into cells (nearest-neighbour strands) |
| Protostar Cluster | `protostar` × many, one shared glow | a place, not a scatter; lights its gas at any Luminosity, where the layers' protostars exist only above the middle |
| Embedded Star | one large `protostar` and a broad glow | one dominant source lighting the cloud round it |
| Debris Fields | `chunk`, all four tiers | mixed sizes, wide round scatters |
| Ice Belts | `shard` | pale blue-white glinting crystal, in streams |
| Rock Belts | `chunk`, two tiers | dark matte rock, in streams |
| Metal Belts | `glint` — a hard fleck with a specular point | small, metallic, in dense knots; a thing catching light, not a light |
| Exotic Gas Pockets | `gas-pocket` | a vivid blob in a hue the cloud does not have, painted over rather than screened so it stays more saturated than its surroundings |
| Hidden Station | `plate`, aligned modules | a tight aligned cluster — built |
| Mining Flotilla | `capsule` in file | ships on one heading |
| Derelict Fleet | `capsule`, tumbling, `dim` | every heading different, no power |

**Dark lanes were standard equipment** (the dense and core regions' own `lane` recipes), so D190's question had to be asked: does the trait add something visibly different, or is it dropped? It is kept, as a **rift**: one or two lanes the length of the whole cloud, slim (`girth`), and drawn over everything in the spanning pass where the layers' lanes are painted under the regions drawn after them. It splits the nebula in two — the Great Rift — which the layer lanes never do. Measured: 4.5% of the frame changes on a cloud, against 0.04–2.5% for most other traits.

Four general opt-ins came with them, each absent on every other body: **`rot` on `capsule`** (as `plate` already had — a ship in open space has a heading of its own), **`dim` on a hull** (draw/details.js `hullFill`), and on `lane` **`girth`** (width against length) and **`aim`** (walk straight in body x/y instead of in polar steps; see D237).

`pirate-haven` and `sensor-shadow` stay cut (the spec's own call): they live in the flavour pool as the story a hidden station in a cavity tells.

### D237 — what read wrong first

| Mark | First read | Cause and fix |
|---|---|---|
| belts, debris, derelicts | invisible, or star clusters | **D224 again**: `tiers: 2` without `named` keeps the two SMALLEST tiers, so flecks and hulls drew at a few tenths of a pixel and only the metal's specular points showed. Sizes re-authored for the tier that survives; the derelicts are `named` |
| the rift | a fat blob, then a dot | a lane's width is 0.17 of its length, right for a short lane and a blob for a body-length one (`girth`); then the lane's walk steps the angle by ds / r, so a long lane placed near the centre spun on the spot. A mark with an `aim` now walks straight |
| pillars | matchsticks | too short, too thin, lit only at the tip. A screened sheath laid under the dark body leaves a lit edge down both flanks — the thing that makes the Pillars read |
| cavity | black discs | a stroked inner ring (a crisp circle — D156) and a flat black inside. Now three low harmonics of the radius, the inside as nested outlines compounding toward the middle (draw/feather.js's construction), and the shell as lumps |
| cavity, dark end | pale grey eggs | the backlight through the hollow was twice what it needed |
| two cavities | goggles | pocket centres held further apart |
| web | a constellation diagram | too few points, so strands were long and straight. 70–110 points, short bowed strands, a glow pass under a core pass |
| bow shocks | crescent-moon icons | longer, fading wings and gas piled at the apex |

Each trait's final per-form pixel diff against the same body without it (seed `n0`, Luminosity 70%, 560 px): every trait changes pixels on every form it is offered on, with a maximum delta of at least 121, so every one both draws and can be seen. The smallest footprints are the built things (station 0.05%, derelicts 0.04–0.05%, flotilla 0.09–0.12%) — small objects in a light-years-wide cloud, which is the point of them.

### D238 — the card: a nebula is crossed, not reached (D78)

Every other card asks what a body is like to reach, land on or survive near. You are already inside a nebula, for light-years, so its card asks what it is like to **cross**: Size with a travel comparison, Density, Mass, Composition, Temperature, Visibility, Navigation, What's inside, then the spec's Gravity / Stand on it? / Breathe? and the flavour rows. It reads the BUILT body: the form from the stack (a shell, and whether the pulsar's beams fired), the light from Luminosity source, the colour from the drawn palette, the young stars COUNTED from the elements placed (the remnant star excluded), and the contents from the traits that drew.

- **Size** is rolled per seed (the picture has no scale), log-spread in each form's real range: cloud 4–100 ly, planetary 0.4–3, remnant 6–110. Light takes as many years; Voyager 1 at 17 km/s takes 9.4607×10¹² km ÷ 17 km/s ÷ 3.156×10⁷ s ≈ 17,600 years per light-year. Big figures round to three significant figures.
- **Density** in atoms per sugar-cube (cm³): dark cloud ~8,000, reflection ~2,000, emission ~200–600, planetary ~2,000, remnant ~3. **The spec's line is only sometimes true, and the card says which:** the emptiest laboratory chambers hold a few thousand per cm³ (1e-12 Torr at room temperature is ~3×10⁴), so an emission nebula is "thinner than the best vacuum we can make on Earth" and a dark cloud is "about as thin as" it. Air: 2.5×10¹⁹.
- **Mass** = density × volume × the share filled (0.3 cloud, 0.5 shell) × 1.4 hydrogen masses per atom. Checked against reality: a 20 ly emission cloud ~750 Suns, a 1 ly planetary ~0.5 Sun (real ones 0.1–1), a 30 ly remnant ~20 Suns of swept gas.
- **Composition** reads the drawn hue: emission colours are atomic lines (red hydrogen, green-blue oxygen — which only shines that way in gas this thin — yellow helium, violet red-and-blue together); reflection is dust scattering starlight, blue like the sky; a dark cloud is cold gas and dust; a planetary is the star's outer layers; a remnant its insides.
- **Temperature**: ionised gas 7,000–10,000 °C rising with Luminosity ("and it would not warm you"), −250 °C where merely lit, −260 °C in the dark (13 K); a planetary's shell ~10,000 °C round an 80,000–150,000 °C white dwarf; a remnant's shock 1–10 million °C.
- **Breathe?** "A cubic kilometre of it holds less gas than one breath" — true at every density here: 10⁴ /cm³ × 10¹⁵ cm³ = 10¹⁹, against ~1.25×10²² molecules in half a litre of air.
- **Visibility** for a shell ignores Luminosity — its swept-out middle is clear — and so do the "flown blind" facts (D239).

### D239 — the hazard rating for this family

A nebula is thinner than a laboratory vacuum, so the temperature, air and gravity rungs mean nothing in it: −260 °C at a few hundred atoms per cm³ will not chill a hull. **Its dangers are navigational**, each already a line on its card: one point for getting lost (no landmarks, no comms), +3 flown blind (dark cloud) or +1 hazy (reflection), +1 per material pocket (capped at 3), +1 each for bow shocks, an embedded star, a protostar cluster, +1 for a vivid emission cloud's ultraviolet, +1 for a planetary's white dwarf, +3 for a remnant's pulsar **with a floor of Severe**. Capped at Lethal; Absolute stays the compact objects'.

**The first calibration failed the frequency contract**: remnants at +5 with no floor put 20% of all nebulae at Lethal — nearly every remnant — and a dark remnant scored "flown blind" although its card's Visibility line says its hollow middle is clear. Darkness is now a cloud-only fact, and the pulsar is a floor rather than a pile-on. Over 300 random nebulae (forms 60/20/20, Luminosity uniform, two rolled traits): Benign 5%, Mild 59%, Hazardous 17%, Severe 20% (every remnant), Lethal rare but reachable.

### D240 — flavour and presets

**Flavour** (`js/data/flavour/nebula.js`): the spec's four lines, each guarded where it makes a claim ("stars are forming in the core" only where young stars were drawn), and form-specific lines — "this is what the Sun will leave behind" on a planetary nebula, the pulsar's sweeping beams and a supernova's heavy elements on a remnant, a hole in the sky on a dark cloud. The universal "stellar flares" line is kept off by `radiation: 0` (D212's reasoning): a remnant's radiation is its pulsar, and its own pool says so.

**Presets** (`js/data/presets-nebula.js`, behind `CC.Presets.register`): the spec's three most evocative — **Pillars of Creation** (emission, pillars, a protostar cluster), **Supernova Remnant** (a pulsar's beams, a filament web), **Dark Nebula Hideout** (a dark cloud, a cavity, a station hidden in it) — then **Planetary Nebula**, **Reflection Nebula**, **Emission Nebula**, and **Mining Frontier** (ice and metal drifts with a flotilla working them — the Freelancer picture the family exists for). The three plain KINDS ban every trait: an empty selection means "roll", and a rolled derelict fleet in "a plain emission nebula" would be the preset contradicting its blurb. Each rendered on two seeds and checked against its blurb (`_xpresets.mjs`).

---

## The done-condition

> a nebula is legible at the highest element budget without becoming mush

Met by the user's judgement of stages 1–3 in the app, and held through stage 4: at maximum Detail density a nebula is ~7,600 elements plus ~2,240 cloud cells (D226), and the regions stay separable because each carries a different KIND of mark over one shared density field rather than more of the same (D221, D223). The traits are drawn over the gas in their own pass, so they stay legible at any density.

> nothing in js/draw/ needed an archetype-specific branch

Held. `grep` for the archetype id, any nebula role or any form name in `js/draw/` finds only the background's own pre-existing "nebula" mode and the caves' `cavityPath`. Every new renderer behaviour is a declared opt-in that is absent on every other body: `feather`, `ride`, `drift`, the cloud field's `emit`/`absorb`/`side`, `emissiveGlow`'s `from`/`falloff`/`sat`/`val`, `beams.base`/`root`/`when`, a speckle's `chunk`, a recipe's `spikes`, and in stage 4 `capsule.rot`, a hull's `dim`, a lane's `girth` and `aim`, and six primitives that name no role.

**Phase 7 is complete.**

---

## Still open, for the user's eye — CLOSED (Session Y)

The user reviewed stage 4 in Session Y and closed every item below as it stands. The chunked speckle filling was made global (D241). Kept for the reasoning.

- **Pillars** read as columns at app scale, but as somewhat uniform "fingers" with rounded heads rather than the ragged, tapering spires of the real Pillars. One primitive (`pillar` in `draw/primitives/diffuse-marks.js`); a judgement call.
- **The filament web on a remnant** reads as a tangle, but the remnant's shell is already woven of filaments, so the trait is subtler there than on a cloud.
- **The built things are small** (a station is a handful of modules a few pixels each at 1200 px). Deliberate — they are objects in a cloud light-years wide — but a size number per trait if they should read from further back.
- **A cavity in a dark cloud** is lit from behind (the backlight through the cleared dust); halved once already, and the curve is one table on the trait.
- **Chunked speckle filling (D225), globally.** Filling a speckle batch in chunks of 24 instead of one path made the nebula's motes several times cheaper; the same change applied to every body would likely speed up every grainy one (a planet draws ~9,500 elements, mostly speckle), but separate fills compound alpha where two dots overlap and one path does not, so **every body's pixels would change slightly**. Opt-in on the nebula only until you decide.
- **The core often reads as a ball of a different hue** (stage 1): the spec's colour model meeting a small region. Softened, not removed.
- **The halo is very faint** at the spec's colour table; Element opacity gives more body when wanted.
- **The 18% band of Luminosity** is a murky in-between, neither silhouette nor lit; the curves are one table each.
