# Session X — Phase 7's last group: the nebula

**D219–.** The diffuse family's one archetype, `nebula`, built in four stages with the user reviewing each: (1) the filled stack, extreme wobble and translucency; (2) Luminosity source; (3) the shell stack; (4) traits, stats, flavour, presets. **This file is being written as the session goes.** Stage 1 was reviewed by the user ("absolutely gorgeous and quite varied"), who then handed the two open design decisions to this session. Stages 2 and 3 are done.

**No existing body changed.** All 36 renders of the previous archetypes hash identically to HEAD (`1dcab45`), checked with `test/_tmp/_u1regress.mjs` against a worktree of that commit after every renderer change. `npm test` passes.

Scratch tools: `test/_tmp/_xstack.mjs` (print the built stack, boundary swing and neighbour crossing), `_xwob.mjs` (sweep wobble multiplier and frequency against crossing), `_xgrid.mjs` (8-body contact sheet plus a large render, with timings), `_xprobe.mjs` (one render with settings overrides and an optional CC mutation, used to isolate one mark kind at a time), `_xdots.mjs` (the path-fill benchmark behind D225). Renders are in `shots/x/`.

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

## Still open, for the user's eye

- **The core often reads as a ball of a different hue.** That is the spec's own colour model (primary at the surface, the triad's secondary at the core) meeting a small region. Softened (D221's `fade`), not removed. Spatial hue variation inside a region, with emission lines mixing, is the next lever if wanted.
- **The halo is very faint** at the spec's colour table (value 0.20–0.45). The user found Element opacity gives more body when wanted, so it was left.
- **The 18% band of Luminosity** is a murky in-between, neither a silhouette nor lit. Honest for a slider; the curves are one table each if it should move faster.
- **The card still uses the solid template**, so its lines are wrong for a nebula until stage 4.
