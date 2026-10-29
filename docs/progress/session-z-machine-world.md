# Session Z — Phase 9a, the `machine-world` archetype

*D248–D276 so far. Built in four stages the user looked at between: (a) the stack with hollow shells, voids, pillars and access shafts; (b) colour, the accent hue and the always-drawn details; (c) Operational status and Hull integrity; (d) exclusive traits, stat card, flavour and presets.*

Scratch tools: `test/_tmp/_zstack.mjs` (prints the built stack and checks every combination of extremes), `test/_tmp/_zgrid.mjs` (contact sheets to `shots/z/`).

---

## The plan the user agreed

Before building, MACHINE-WORLDS.md was checked against the generator as it now is. What had gone stale:

- `shell`, `gap` and `pillars` were documented in ARCHITECTURE.md and never implemented (one unread `shell` flag in gen/structure.js).
- The zone `remove: true` that Hull integrity and `shattered` were to use was never built either.
- No accent colour system exists; built objects take `hullFill`'s grey from the layer they sit on.
- `truss` and `glyph` were still planned primitives.
- Frosting is opt-in per layer colour entry, so "default to none" needs nothing.
- Layer details could not be spaced evenly; only traits could.

The user took every recommendation: relabel existing sliders rather than add two (D249), one void per layer below it (D248), and accept that Cohesion's default of 45% opens a machine world with a moderate breach.

## D248 — `gapBelow`: one void per layer, below it

The spec's `shell: true` + `gap` "above AND below" double-counted wherever two shells meet and disagreed with its own table (the hull has a void under it but is not a shell; machinery is hollow but no gap was drawn). Replaced by three general layer properties and one archetype property, all in `js/gen/shells.js`:

- `gapBelow: [min, max]`: a true void under the layer, raised out of the layer's own bottom after renormalization (a body-space width must not be scaled). Capped at 55% of the layer's thickness.
- `pillars: [min, max]`: evenly spaced radial supports across the void, counted for Detail density 0–1 at the surface and scaled by radius, so every void keeps the same spacing. Two tiers: every fourth a braced girder, the rest plain struts. One width read as ruled hatching.
- `shafted: true` with `shafts: { count, width }` on the archetype: 2–6 bearings shared by every shafted layer, so one shaft reads as one route down. Width is in body radius, so a shaft is the same width at every depth. No pillars stand in a shaft.

**Drawing:** a layer carrying `gap` or `slots` is filled, clipped and stroked as exactly its own band (`js/draw/shells.js`), because a void must show the background and every other layer is painted as a disc to the centre. `draw/layers.js` gained three one-line delegations and `draw/scene.js` one pillar pass. The new `truss` primitive (`js/draw/primitives/built.js`) draws the struts.

## D249 — Operational status and Hull integrity are relabels, not new sliders

Agreed at planning, built in stage (c). Two archetype `dials`, the precedent being the neutron star's Surface heat and the asteroid's Radioactivity:

- **Interior heat → Operational status.** Already the "how alive is the inside" quantity, and already what lights or dims a self-lit core. Default 55%: automated to crewed.
- **Cohesion → Hull integrity.** On the asteroid it already means "how solidly the body holds together". Its default 45% opens a machine world with a moderate breach, which the user accepted as the better first look.
- **Under construction** is an exclusive trait that swaps the breach's torn edge for clean edges and scaffolding, rather than the spec's `construction: true` flag.
- The breach is a **new general structure feature**, a wedge cut out of the outer layers to a depth the parameter sets, since the zone `remove: true` it was meant to reuse was never built.

## D250 — the stack moves when an optional layer is absent

Printed at every combination of extremes, the stack composed (thinnest band 0.029, the hull), but a missing habitation shell left surface-systems 0.32 thick and a missing computation core left machinery 0.44 thick, one plain band where the spec has two. `frac_when` (the moon's precedent) puts the machinery higher when there is no habitation and the reactor larger when there is no computation core.

The spec's ranges were re-cut: a hull 0.04 thick cannot give up a 0.045 void, and at 0.06–0.17 the reactor (the payoff at the bottom of every shaft) was a dot.

---

## The user's look at stage (a)

"Pretty good start — bare so far and needs a lot more work, but I like it." Void widths, pillars, shaft count and width all judged about right. **The shafts stay open through the outer hull to space**: the user likes them, and later wants traits that put doors or shutters on them.

---

## Stage (b), sub-steps 1-3: walls, materials, metal (D251-D254)

Built in sub-steps with a render for the user between each. Scratch tool added: `test/_tmp/_zcrop.mjs` (one body at 1600px, cropped to the upper-right quadrant; the view to judge texture from, since a void is only a few pixels thick at preview size).

### D251 — void and shaft back walls, drawn under the bands

`js/gen/shellwalls.js` builds, `js/draw/shellwalls.js` draws. **Properties of a gap and a slot**: any layer carrying `gap` gets a wall, any body carrying `shafts` gets shaft walls; no archetype id anywhere.

- **A void**: a dark back wall coloured from the shell above it (shadowed at the top, a step lighter at the floor), evenly spaced radial ribs (every fourth heavier), deck lines at an even pitch, and dense small square lights: facility rows sitting on the decks plus lone points. Mostly the accent hue, some cold white, a few warning amber.
- **A shaft**: a darker strip with guide rails and rungs, faint hatch lights on its walls, and a centre column of signal lights with soft halos, every fourth amber. One strip from the deepest shafted layer's void floor to the top of the outermost, so one shaft is one lit route.
- **Drawn BEFORE the layer loop** (one hook in `draw/scene.js`). A hollow layer is filled as exactly its own band, so the walls show only through the voids and slots and the bands trim them to the slot edges without a clip.
- Counts from Detail density and body-space area, never pixels. The user: "busy is good, I love how they look so detailed"; signal lights made a touch smaller at their request (core 0.12 of the shaft's half-width).

### D252 — the accent hue and hue families, general colour-profile properties

`js/gen/accent.js`, called by a one-line hook in `gen/palette.js` after the adjacency pass.

- `accent: { rel, sat, val }`: hue offset from the HOST (outermost real, non-self-lit layer), own stream. Rides on every layer colour as `colour.accent`; an element asks for it with **`tone: "accent"`** (`draw/details.js` `toneColour`; falls back to `glow` with no accent). `zoneShift`/`heatShift` carry it through.
- `accentHue: k` on a layer colour entry re-tints that layer k of the way to the accent (the palette now exports its colour `factories` for this). The power core takes it outright, computation 0.85.
- `profile.hue` may be a list of `[lo, hi, weight]` families. Rolled with ONE draw either way, so every other profile keeps exactly its colours.

### D253 — the `texture` element: one material per built layer

`js/data/elements/machine.js` (the machine world's element table), `js/gen/materials.js` (registered builder), `js/draw/primitives/materials.js` (registered primitive). One element per layer carrying every mark, like a mosaic. Tiles reuse `draw/rocktexture.js` (monochrome, signed, so they survive any recolour); `count` is the number of marks; Texture strength scales count and tile together.

| Material | Look | Layer |
|---|---|---|
| `rough` | grain and ONE coarse blotched mottle at the rock-fragment scale, pits, scoring | outer-hull |
| `metal` | brushed: fine light/dark arcs round the band | surface-systems |
| `sleek` | almost no tooth, a few long faint streaks | habitation |
| `plant` | concrete tile, pits, scoring, and radial pipe bundles (2-5 pipes, nested elbows, casing/body/crown, flanges at an even pitch) | machinery |
| `circuit` | traces on a polar grid, 45° jogs between tracks, vias and pads | computation |
| `concrete`, `industrial` | kept as materials, currently unassigned | — |

The user set the order: rough armour outside, metals in the middle (habitation the sleek "goldilocks" one), plant with "vertical metal-pipey" pipework, the board at the heart. Surface-systems was briefly `industrial` with a sheen; **the user preferred the brushed `metal` look back**. Lessons from tuning: the first mottle was far too strong and coarse (camouflage) everywhere but the hull, which the user then wanted exactly that rough; finer mottle showed the tile repeat as a lattice, fixed by laying it twice at non-dividing scales; pipes first rendered as hairlines, then as ladders (flanges bridging a bundle), then too pale (body now at half alpha).

### D254 — metallic, not pastel

Low chroma on every built layer (below 0.20), `heatDriven: false` on them so Interior heat cannot creep colour back (it becomes Operational status in stage c), steel / gunmetal / bronze / violet-steel hue families, and **`sheen: k`**: a general colour-entry property that shades a band as polished bar (specular band, dark falls, lit rim; `js/draw/sheen.js`, one hook in `bandFill`). Habitation 1.0, machinery 0.35; the cast hull and the brushed surface-systems band take none. The user: "colours look ok for now". Open: the accent's ±30° round the complement sometimes lands on magenta against blue-grey; narrowing it toward amber/cyan is a one-number change if the user asks.

---

## Stage (b), sub-step 4: the always-drawn details (D255–)

### D255 — `cellgrid`: one element per layer, four grids

`js/gen/cellgrid.js` builds, `js/draw/primitives/cellgrid.js` draws; recipes in `js/data/elements/machine.js` after each layer's `texture`. One element carrying every cell, like `texture`, because a grid's cells are defined by their neighbours. Every pitch is in body radius; `count` decides how many. Shading is monochrome as on the materials; colour comes only from the element's tone.

- **`seams`** (outer hull, `count` = panels): 2–4 rows across the band, panels in a brick bond, a third re-plated a shade lighter or darker, each cut drawn dark with a lit lip a pixel beside it, running lights at the outer joints (accent, some white). The user: "awesome".
- **`hex`** (habitation, `count` = cells): a quiet honeycomb of plate, outlines in one path so shared edges are not doubled, a few cells re-plated. One angular pitch for every row, taken at the band's middle, so the cells tile exactly.
- **`windows`** (power core, `count` = lit windows): module blocks are sectors with gaps of bare plate, full-height or low; each a dark plate of window slits, lit in one light, accent or cold white, **in runs along each storey** (independent rolls read as static). Each storey fits its own whole number of windows, so the grid holds on a disc: on the core the blocks are wedges, kept clear of the centre by `depth`.
- **`lattice`** (machinery, `count` = cells): chips on a track grid at the board's pitch (`CC.Materials.circuitPitch`, exported by gen/materials.js), **tall and narrow, running radially like the pipes** (2–5 cells round, 3–9 down). Idle cells pale grey; a third lit in **the void lights' three colours and shares** (accent, cold white, warning amber or red), taken from `CC.ShellWallDraw.lightHsv`, now exported, so every light on the body comes from one rule.

**`CC.Primitives.registerStyle(kind, fn)`** is new: a registered primitive that wants more than one colour string brings its own style, which `draw/details.js` styleFor consults after its own cases (a one-line hook). `cellgrid` is the first user; the fixtures to come (platforms, fins, docks, gears) should use it rather than add cases to details.js.

**Moved by the user after the first render.** Windows were first on habitation and chips on the computation board: the windows read out of place there and the chips so-so. The user put the windows in the reactor ("a techy orb reactor chamber"), the chips among the machinery's pipework ("technology embedded into it"), and asked for clean metal or subtle hex panelling on habitation. The computation layer is the circuit board alone again.

### D256 — even spacing for layer details, generic

A layer detail recipe may now carry `spacing: "even"` and `jitter` (a share of one slot, default 0), as a trait could through the placement grammar. `js/gen/evenspacing.js` lays every instance of every tier on ONE even ring and spreads each tier evenly among the slots (each slot goes to the tier furthest behind its share, Bresenham's rule), so a large unit falls every few slots instead of the large ones bunching; the angles come back in plan order, which is how builders read `opts.angles`. Two hooks in `gen/elemgen.js`: `build` makes the list unless a trait brought its own, and `buildScattered` exempts an evenly spaced set from large-scale alpha clumping, as it exempts `named` (a regular row is not a field). The stream is only drawn from when a recipe asks, so no existing body moves. Recipe fields documented in `js/data/elements/registry.js`.

### D257 — `glyph`: defense-grid platforms

`js/gen/glyph.js` builds, `js/draw/primitives/glyph.js` draws (with a registered style); recipe on `defense-grid` in `js/data/elements/machine.js`: 12–40 platforms, two tiers interleaved, even, jitter 0.02, all on one orbit at 0.44–0.46 of the shell.

- **One design per recipe**, rolled once and shared by every instance: hub (ring, square, hex, diamond), 2–4 spars straight or turned 45°, ends (solar wings, pods, or a rim making a wheel), 1–2 gun barrels pointing away from the body, hub light mostly the accent. Size tiers scale the design, never change it.
- **Drawn in the platform's own frame**, up away from the body, so a ring stands one way to it. Metal from `hullFill` keyed to the design (one finish for the set), lights from `CC.ShellWallDraw.lightHsv`, spar tips white and amber. Below ~3px a dot and its light.
- **Solid, not screened.** Outward-layer details are drawn with the atmosphere's `screen` blend; a station under it loses its dark outline and shadow side, so the primitive draws `source-over` inside its own save/restore. The platforms keep their alpha through the shell's fade at that depth.
- `glyph: "platform"` names the family, so the spec's satellites, ships, mines and beacons can be further glyph families later.

The user: "looks perfect"; briefly wondered about a higher orbit and kept this one.

### D258 — `fixture`: radiator fins, sensor arrays and docking ports

`js/gen/fixtures.js` builds, `js/draw/primitives/fixtures.js` draws (with a registered style); recipes in `js/data/elements/machine.js`. One element kind, `fixture: "fins" | "sensor" | "dock"` naming the design, so the machinery's gears (group b) can be a further design rather than another file pair.

- **One design per recipe**, as the glyph's platforms: rolled once, shared by every instance, size tiers scale it and never change it. A fin bank's fins are at one body-space pitch (`FIN_PITCH` 0.0042), so a smaller bank is shorter and holds fewer fins, never thinner ones.
- **Standing on a floor.** A fixture's `radius` is its root, the depth range's inner edge, so a ring of them stands on one deck line whatever the tier; `size` is its height. A dock hangs from the face instead, because a port opens outward.
- **Where they went, after the user's look.** First built as three decks inside the surface-systems band (fins low, sensors mid, docks cut down from its outer face). The user: fins and docks fine, but the antennas were out of place there and belonged on the outermost surface, docks too, radiators to the top of the band. Agreed on the reasoning that a port or an antenna opening into an enclosed void is unreachable and senses nothing. Then: **docks (8–18, even, jitter 0.02) cut into the outer hull's face, sensor arrays (30–70, scattered) standing out from it into space; radiator banks (70–160 a row, even, jitter 0.04) in two mirrored rows on surface-systems**, one standing on its floor and one hung from its ceiling (`hang: true`: the unit roots at the depth range's outer edge and points in), roots warm at each face, a strip of brushed metal between: a radiator hall. Along the top alone they looked odd (the user's second look); the choice of both rows was left to me.
- **`seat` on a layer-detail recipe** (one hook in `gen/details.js`): the elements go to the spanning list with `seat` stamped on them and are drawn in draw/scene.js's existing unclipped seated pass, on the body's real outline, exactly as a seated trait is. The band clip would otherwise cut every mast off at the surface. With `seat: 0.5` the root lands on the outline.
- **`claim` / `yield`**: two fixtures on one face. A `claim: true` recipe records the footprints its units take; a later recipe on the same layer with `yield: true` drops any unit landing in one, so sensors stand between the docks. Generalised in D259 to boxes in `js/gen/claims.js`. A unit straddling an access shaft is dropped the same way: half a dock clipped by a slot reads as a fault, a gap in a regular ring reads as the shaft interrupting it.
- **Fins**: a dark manifold, each fin a dark blade with a lit lip a pixel across, a heavier stiffener every 4–6 by design, ends stepped or square, roots warm in the warning colour (coolant comes in hot). **Sensors**: a plinth carrying 2–5 masts topped by dishes open to space or lattice antennas, the middle one tallest by design, a light at every tip. **Docks**: a dark recess, lit floor plate and walls, flanges at the mouth, a cradle, a craft (nose to space) in 35–75% of berths, approach lights in the accent and white, warning amber at the mouth's corners.
- **Shading**: band fixtures (fins, docks) are monochrome, as on the cellgrid, so they sit in the layer's own colour. **A sensor is machined metal** (`hullFill`): monochrome against the sky left only its lights. Lights from `CC.ShellWallDraw.lightHsv`.
- First pass was too sparse (47 banks on a five-unit circumference): counts roughly doubled.

### D259 — the machinery's trusses, gears and rotors, among the pipes (`CC.Claims`)

Three more `fixture` designs on `machinery`, drawn in a new `js/draw/primitives/machinery.js` that registers them through `CC.FixtureDraw` (exported by draw/primitives/fixtures.js with the shared frame and helpers), so neither file passes 500 lines.

- **`rotor`** (4–10, two tiers, radius up to ~0.04): a dark bore, 12–24 blades at the design's lean between hub and casing, each a dark edge and a lit face, a cased rim on most designs, a bolted hub. The large tier is the anchor of a stretch of plant.
- **`gear`** (50–130, three tiers): a train of a wheel and 0–3 smaller ones (0.45–0.7 of the one before), each meshing with the last: centres a tooth's depth short of touching, the next wheel half a tooth turned so its teeth fall in the gaps, laid in a direction clear of the train so far. Teeth at one body-space pitch (`TOOTH_PITCH` 0.0036), so a small gear has fewer teeth, not smaller ones. A lit toothed plate, a dark web cut by 3–6 spokes or 4–6 lightening holes per design, a hub and its axle.
- **`truss`** (40–110, two tiers): square bays at one design pitch (0.008–0.011), braced X, zigzag or K by design; each frame a girder along the band (1–2 bays deep) or a tower across it, the share of towers per design. A faint shadow behind, the bracing, chords and posts as dark members with a lit lip, nodes at the joints.
- **Among the pipes, not over them: `js/gen/claims.js`.** `CC.Claims` keeps boxes ({r0, r1, a0, a1}) per layer, cleared at the start of each layer's recipe walk (one hook in `gen/details.js`, so a second build stays deterministic). `claim: true` on the plant `texture` claims each straight leg of each pipe (per leg, not per pipe: a bent pipe's bounding box covered most of the band); on the `lattice` cellgrid, each chip; on every machinery fixture, its footprint. `yield: true` keeps a unit out of every claim so far, its own recipe's included, and a scattered yielding unit re-rolls its place up to 30 times before it is dropped. A unit set down in a band (not standing on a floor) is also kept wholly inside it, so the clip never halves a wheel.
- **Order is placement priority**: rotors, then gears (a large train needs the room), then trusses, which are narrow enough to fill what is left. With trusses first the big gears never found a place.
- Monochrome like every band fixture, so the plant keeps its colour and the chips stay the only colour in it.
- Tuning: first pass sized for a much closer view, everything a few pixels; sizes roughly doubled. Gears first read as dark dots: plate and hub lit, web lightened.
- The user: "looks good". Fins, sensors and docks (D258): "looks awesome now".

### D260 — `pulse`: data flow along the board's own traces

`js/gen/pulses.js` builds, `js/draw/primitives/pulses.js` draws (with a registered style); recipe on `computation` after its circuit `texture`: 120–360 pulses, three tiers.

- **On the actual traces.** `CC.Claims` gained **notes** beside its boxes: `note(layer, key, value)` / `noted(layer, key)`, cleared by the same per-layer reset, so no new hook. The circuit texture notes its `traces`; the pulse builder reads exactly those and makes nothing if none were noted. A pulse is a stretch of one trace (picked by length, so long runs carry more traffic), keeping every corner inside it, so it turns where its trace jogs and stops at the via. Lengths are measured as the board draws them: an arc along a track, the chord across a jog.
- **Three tiers, smallest the most**: comets (tail ~0.05 body radius), blips (~0.018), and packet trains, 2–5 dots at 0.8 of the board's `circuitPitch`, so the rhythm is the grid's. A tail is four stretches stroked a little wider than the trace at rising alpha toward the head; a head is a soft spill and a pale core, the long tiers' a second wider spill.
- **The body's three lights** (`CC.ShellWallDraw.lightHsv`): 70% accent, 24% cold white, 6% warning, as every light on a built body.
- Scratch tool added: `test/_tmp/_zlayer.mjs`, an 800px window centred on a named layer at a bearing.

The user: "perfect".

### D261 — the reactor's containment `rings` and glow `stipple`, framing the chamber

`js/gen/containment.js` builds both, `js/draw/primitives/containment.js` draws both (each with a registered style); recipes on `power-core` after its window grid.

- **Framing, not burying.** The `windows` cellgrid now notes the chamber's real edges (`CC.Claims.note(layer, "chamber", [r0, r1])`, the storeys as laid, not the recipe's `depth`) and claims its blocks (`claim: true` on the recipe). The rings read the chamber: **one just outside it** in the room left to the face, **one just inside it**, and the rest (4–8 in all) **nested round the bare heart**, each a step in, thinner, stopping at 0.45 of the chamber's inner edge so the heart stays a bright bare orb. Each ring claims its band. With no chamber noted, the recipe's `depth` stands in.
- **Two ring designs**: a cased band (dark casing, a lit lip on the edge facing the heart, a dark outer edge) and a coil (a dark backing, windings at a fine even pitch, two rims), the frame rings always cased. Clamps across every ring at one body-space pitch (0.016), a coil keeping every third; small lights between clamps, every other gap on the frame and every fourth round the heart, white or warning by ring. Monochrome shading, so the rings sit in the core's colour.
- **Glow stipple yields** to the blocks and the rings (up to six re-rolls a dot), so it gathers round the heart and in the gaps between blocks, laid denser toward the centre (radius as u^0.85). 500–1200 dots, three tiers, Texture strength scales it. Three quarters pale sparks in the core's hue (the two largest tiers with a faint spill), a quarter deep flecks, so the field shows on the bright heart and the dimmer plate alike.
- Tuning: first pass lit every clamp with a big spill and nested rings to a fifth of the chamber, burying the heart; clamps narrowed, lights made points, nesting stopped at 0.45.

The user: "looks good".

### D262 — `conduits`: feeds into the reactor, a general layer property

`js/gen/conduits.js` builds, `js/draw/conduits.js` draws; one hook in `gen/details.js` (the result's `conduits`, beside `pillars`) and one in `draw/scene.js` (after the pillar pass). `gen/shells.js` copies the property onto the layer as it does `shafted`. Documented in ARCHITECTURE.md's layer-property table.

**First built across every boundary, and rejected.** `conduits: [min, max]` on every shell and the computation core put about 210 runs a body across every boundary, between the pillars, clear of shafts and claims. Individually the user liked them; together, "the placement feels like spam rather than deliberate and the original identity of each layer is lost. And the voids aren't as visible anymore." The user proposed conduits at the reactor alone, plugged in at its rim and reaching down into the window zone at random-ish depths, never to the heart; agreed, with the runs going down the gaps between window blocks so they frame the chamber as the rings do (D261). The lesson: a mark that is everywhere is texture, not a decision; a strong cue earns its strength by being rare and placed.

- **`conduits: { count: [min, max], depth: [lo, hi] }` on a layer**: feeds entering through its OUTER face from the layer above, plugged into that layer by a short stub (0.012 at most) with a junction box. Declared on `power-core` alone: 5–12, depth 0.42–0.80.
- **Down the open gaps.** The bearings where the smallest bundle is clear of every claim in the layer (the window blocks) from the face down to the shallowest depth form the open gaps; a narrow gap takes one run down its middle, a wide one two or three spaced evenly (about 0.032 apart), the widest gaps first. **Whole-circle claims are passed through**, not stopped at: `CC.Claims.taken` gained a `through` flag, and every containment ring a run crosses gets a sleeve. `CC.Claims.boxes(layer)` is new, to find those rings.
- **Depth before bundle.** Each run rolls its own depth, then its bundle (trunk of three pipes, pair, single: 30 / 40 / 30%), stepping the bundle down until it fits that deep, since a gap between sectors narrows inward; only if nothing fits is the run shortened. Never in a shaft.
- **Then over the blocks, rejected.** The user found 5–12 too sparse and tried lifting the rule against crossing the window blocks: 22–40 laid evenly round the rim over the blocks. "Too much, turns out the old setup was better." Reverted to the gaps, at **6–18**. (A by-product kept: the shaft check now applies only on a layer the shafts cut; it had been dropping runs on the unshafted core at the shafts' bearings.)
- **And the lowest void, bridged.** The user's second call: the void under the machinery is the one place a run can bridge between layers without costing a void anyone needs to see, connecting the board (or the reactor, with no board) to the thick plant above, as in the first iteration but reaching higher. `bridge: [lo, hi]` is new on the property: the upper end reaches that share of the layer above's thickness from its inner edge, across the void, sleeved at both faces. Declared on `computation`: **12–24**, depth 0.62–0.90, bridge 0.25–0.55. A bridging run takes the middle of a gap between two of the void's pillars, the gaps picked at an even stride round the body, then any other gap when the stride's own are blocked above; its bundle steps down until it clears the machinery's claims for at least half the least share, and the upper end is shortened toward that floor. The plant is crowded with pipes, chips, gears and trusses, so at default density about 13–17 runs survive and most reach 0.03–0.07 into it.
- **And runs across the board itself**, from the user's sketch after calling the bridges "almost perfect": `within: true` (with `length: [lo, hi]`) lays runs wholly inside the layer between `depth`'s edges, crossing no face, at an even stride round the body nudged up to a quarter of it, each a rolled share of that span at a rolled place, clear of the layer's claims, boxed at both ends. `conduits` may now be a list of entries, each on its own stream; the computation core carries both: the bridges, and **14–26** within, depth 0.28–0.86, length 0.30–0.65.
- The upper end of every run now enters the layer above at that layer's INNER edge, so with no computation core the reactor's feeds cross the machinery's void on short stubs.
- **Drawing**: each pipe a dark casing, a machined-metal body (`hullFill`) and a half-strength crown; collars at an even body-space pitch; a sleeve plate wider than the bundle at the rim and at every ring crossed, which is what makes it read as passing through rather than lying on; a junction box at each end with a status light, the accent or cold white.

### D263 — the board's hardware: bolder conduits, capacitors, blend

The user's look at D262: the board's runs "timid", leaving its breadth empty above and below them. Then: the board wants capacitors. Then: the board's own hardware too loud over it.

- **`scale`** on a `conduits` entry multiplies its pipe widths (default 1). Both computation entries carry 1.8. The bridges now reach down to depth 0.22–0.60 of the board and up 0.35–0.70 of the machinery; the runs within span depth 0.06–0.94 at length 0.45–0.85.
- **`capacitors: { count, size, depth }`**, a general layer property (`js/gen/capacitors.js`, `js/draw/capacitors.js`; hooks in `gen/details.js` after the conduits, which it is passed, and in `draw/scene.js` after the conduit pass; copied onto the layer by `gen/shells.js`). Electrolytic cans seen from above: a silkscreen ring with a + tick, the dark sleeve with a lighter polarity stripe, the lid with a crimped rim, a lit crescent and a scored vent (cross, Y or K). Three size tiers, mostly the smallest; half the placements a bank of 2–5 of one size side by side. Clear of the conduits, the layer's claims, the shafts and each other; a placement re-rolls its spot up to six times. The conduits' machined metal (`hullFill`). Counts and sizes set by the user by hand.
- **`blend` and `opacity`** on a `conduits` entry and on `capacitors`: a canvas blend mode and an alpha for marks lying wholly on their layer. Opacity alone (0.6) was tried and dropped for a blend; overlay, soft-light, multiply and hard-light compared on one sheet. **The user settled on `hard-light` at opacity 1** on the runs within the board and the capacitors; the bridges stay normal, so they still read as solid pipes crossing the void. Under a blend a run's stacked strokes mix with each other too, accepted as is.

The user: "good enough now". **Conduits (D262) approved with this.**

## Stage (c): Operational status and Hull integrity (D264–)

**Stale against the code, listed before building** (fixed when stage c closed; see "Stage (c) closed" below):

- MACHINE-WORLDS.md: the stack table (fracs, optional percentages, the hull's own void, `frac_when`), the colour table (pre-D254), the layer-details table (habitation is hex panelling, windows are in the reactor, sensors and docks on the hull's face, conduits are reactor feeds and bridges), the Operational status table (assumes habitation window grids), Hull integrity's "zone `remove: true`" (never built; `shattered` does not use it) and the `construction` flag (a trait since D249), and the "Why artificial" primitives list.
- PARAMETERS.md: Operational status and Hull integrity listed as new sliders (they are `dials` relabels); Interior heat "Solid bodies only" and Cohesion "asteroid"; the climate table's "Starlight ✅" for the machine world (it declares `starlit: false`); the Unfinished World preset's `construction: true` (stage d).
- Interior heat already moved the heart before this stage: computation and the reactor were heat-driven; every other built layer `heatDriven: false`.

The user agreed the plan: (c1) Operational status, (c2) the cut, (c3) the torn edge. Under construction stays in stage (d). Inside a wound, space shows through, as through the voids (the user's choice over a dark far wall).

### D264 — `activity` and `lit`: Operational status lights the whole body

`js/gen/activity.js`. Interior heat relabelled **Operational status** by a `dials` entry. A general archetype property `activity: { param }` gives the body a level, and a general layer property **`lit: [wake, full]`** says when that layer's lights come on. Stamped onto each layer at the structure stage by the existing copy loop in `gen/shells.js` (no new hook): `layer.live` (share lit), `layer.emergency` (share of dark lights burning the emergency red), `layer.busy` (the hive multiplier, D266). A body without `activity` gets none, and every gate answers "lit", so no other archetype moves.

- **Curves**: reactor 0.08–0.32, machinery 0.09–0.38, computation 0.10–0.42, hull 0.10–0.45, defense grid 0.13–0.50, surface-systems 0.14–0.55, **habitation 0.40–0.95**: the plant runs on its own first (automated), habitation lights only when somebody is home (crewed). Habitation presence stays with Optional layers.
- **Which light — a stable hash of its position** (`CC.Activity.gate`), never a stream draw, so no geometry moves and lights switch on in place as the dial is dragged.
- **Every light obeys it**: void facility rows and lone lights (dropped when dark), shaft signals and side lights (the outermost shafted layer's curve), hull running lights, reactor windows (gated per run, so a room goes dark as one), machinery chips (idle when dark), platform and fixture lights (a whole unit dark or red: `el.power`, applied by **`CC.ShellWallDraw.powered(style, el)`** in the registered styles, so no primitive needs a case), containment ring lights (per ring), conduit status lights. Pulses are not sent when dark; reactor glow sparks turn to dark flecks so the field keeps its grain; fewer craft dock.
- **The emergency red** is a fourth entry in `lightHsv` ([358, 0.92, 0.95]); window kind 3, chip kind 4, seam-light kind 2.
- **The heart dims**: `heatValue` on computation [0.45, 1.0, 0.45] and the reactor [0.28, 1.0, 0.50]. `heatValue` gained an optional **third figure, the heat at which the layer reaches full lightness** (gen/palette.js), so the dial dims the heart at its low end only and the approved default is untouched. The neutron star does not use it. At 100 the planet rule pushes the computation core redder: accepted by the user as "running hot".
- The accent's own brightness is left alone; dark and red lights carry derelict.

### D265 — emergency power, and 0% fully offline

Emergency red lights (6% of a dark layer's lights) **rise from nothing across 0–4% and hand over to normal lighting across 7–12%** as the plant wakes; every layer wakes from 8–10%. First built as "below 5%"; the user found the band too narrow and asked for about 10%, then for **0% to be fully dark**, red lights too, so a fully offline machine world is one setting away.

### D266 — the hive: busier than the approved look above 55%

`layer.busy` = 1 up to 55%, rising to 1.7 at 100 (`HIVE` 0.7). Builders multiply their own lit share by it: reactor windows, machinery chips (to 85% at most), docked craft, and extra void facility rows and extra pulses rolled from beyond the existing draws (a stream of their own for the rows; a second pass after every tier for the pulses), so nothing already drawn moves. The user: "wider variety potential" over the top end merely matching the default.

The user on stage (c1): "Overall looks amazing, I like the results."

### D267 — `rupture`: wounds torn out of the outer layers, a general structure feature

`js/gen/rupture.js` builds (detail stage, one line in the `gen/details.js` result), `js/draw/rupture.js` cuts. Cohesion relabelled **Hull integrity** by a `dials` entry. Not named `breach`: that is the asteroid's crust layer property (gen/form.js).

- `rupture: { param, start, depth: [atOnset, atZero], width: [atOnset, atZero], count }` on the archetype. Machine world: start 0.92, depth 0.04–0.74 (1 − floor radius), width 0.08–0.62 rad half-angle at the surface. A hull breach by 85%, two or three shells by 60%, into the machinery at the default 45%, the reactor's rim at 0.
- **A stepped funnel**: one step per real layer cut (a hollow layer's void included), each torn back to its own edge, wider toward the surface (0.40 + 0.60 × depth share^0.8), left and right rolled apart. Edges serrated by a hash of absolute radius (pitch 0.0035, teeth ±0.0075), floor ragged (±0.016), reaching 0.07 past the surface so masts and docks at the wound go with it.
- **Grows in place**: every draw is made up front whatever the amount.
- **The cut is a clip**: `CC.RuptureDraw.begin` in draw/scene.js before the wall pass, `end` before the front outward traits, so walls, bands, pillars, conduits, details and seated fixtures all lose the wedge without knowing it. **Lifted while an outward layer draws**: the defense grid's haze is space, not body, and clipping it left the wound blacker than the sky round it with a notch in the haze ring.
- Output `{ amount, wounds: [{ angle, floor, outer, size, poly, cuts: [{ role, r0, r1, aL, aR }] }] }`; `cuts` are kept for the torn-edge pass.

The user: "The cut looks good - I like the shape and style."

### D268 — one to five wounds, one main

The user asked for a range rather than one wound always. `count: [1, 5]`: the first is the main wound at full size and opens first; each other is 35–80% of its size, on bearings spread evenly round the body with a fifth of a spacing's jitter, and opens at its own point (amount 0.08–0.65 of the dial's travel). The clip moved from even-odd to **nonzero, every wound wound against the frame rectangle**, so overlapping wounds stay cut. At 0% a seed with four or five wounds is mostly torn away to the core: offered to the user as adjustable, accepted as is.

Scratch tools added: `test/_tmp/_zwound.mjs` (800px window on the main wound at a depth share), `test/_tmp/_zrow.mjs` (labelled PNGs side by side).

## Stage (c3): the torn edge (D269–)

### D269 — the torn edge: `edge: "torn"`, marks along the cut faces

`js/gen/woundedge.js` builds, `js/draw/woundedge.js` draws; one hook in `draw/scene.js` straight after `CC.RuptureDraw.end`. `CC.Rupture.build` calls the builder once per wound and keeps the result as `wound.marks`; `gen/details.js` now passes it the pillars and conduits it already built. `gen/rupture.js` gained `edgeAt(wound, side, r, inner)` (the bearing of the serrated edge at a radius, exactly as the outline draws it) and `inside(wound, r, a)`.

- **A style, not a flag.** `rupture.edge` names it (default `"torn"`), looked up in `CC.WoundEdge.styles`; `CC.WoundEdge.register` adds one. The draw pass draws whatever marks it finds, so stage (d)'s Under construction only registers `"clean"` and its scaffolding.
- **Stable as the dial moves.** No stream: a mark on a face is a hash of its ABSOLUTE radius and side, as the serration is, set on the edge where it stands, so it rides the edge outward as the wound widens and appears only when the floor passes below it. Detail density raises the keep thresholds, so a denser body keeps every mark a sparser one had.
- **Scorched rim**: the outline stroked four times, wide and faint to narrow and dark, under the wound clip and clipped to the body's material (the surface disc less every void, even-odd), so it scorches metal and never a void or space.
- **Peeled plating**: plates every ~0.0055 of radius along each face, bent `bend` toward outward and curled further; 2–4 bigger at each layer's top corner, half again bigger at the surface lips. **Two tones split at the fold**, underside where it leaves the face and the lit face on the curl, so the bend reads at preview size. In the layer's own colour.
- **Snapped pillars**: one or two hanging from each void's ceiling where it is torn off, and stubs standing on the ledge of floor the next, narrower step leaves, **at the real pillars' bearings**; the pillars' own truss (`CC.ShellDraw.pillarStyle`, now exported), a ragged cap and a bent wire.
- **Severed pipe**: pipe ends out of the faces of the layers in `rupture.pipes` alone (machinery, computation, power-core): on every face they would have been the conduits' spam again (D262), which was the agreed reading. Every real conduit run the wound cuts ends ragged and splayed at the cut.
- Tuning: the first pass was right in kind and far too timid at preview size (plates read as flakes, the scorch invisible); plates, stubs and pipes made larger and more, the rim wider and darker.

The user: "They look amazing."

### D270 — the debris field

`js/gen/wounddebris.js` builds (asked for by the torn style), `js/draw/wounddebris.js` draws (called by the edge pass after the rim, under the plates).

- **A cone pouring out of each wound's mouth**, densest at the mouth and widening outward, plus a thinner scatter (22%) still inside the wound. Three tiers, mostly the smallest: specks (square grit), shards (slivers stretched along their own axis), chunks (rare, lumps with a lit facet, kept near the mouth). How much and how far scale with the wound's depth and width; counts from Detail density, never pixels.
- **Each piece is a piece of some cut layer**, picked by how much of that layer the wound tore out, in its metal: mostly the mid tone, a third lit, a few dark.
- **Stable**: piece i is a hash of i and the wound, placed relative to the wound, so a growing wound carries the same pieces outward and adds more past the old count.
- Tuning: the first pass was sparse and mostly underside tone, invisible against space; counts roughly doubled and the tones lifted. Then the spill began on a hard arc where the surface had been and read as a wall: it now starts 45% of the way down the wound, kept between its edges there, with a softer falloff.

The user: "Debris look perfect."

### D271 — sparks, fire and embers, by Operational status

In the same pair (`CC.WoundDebris.sparks`, `CC.WoundDebrisDraw.sparks`), drawn last in the edge pass under a `screen` blend, in the warning colour of `CC.ShellWallDraw.lightHsv`.

- **Sparks** (hot points just off a cut face, a faint spill), **fire** (soft glows on the rim, pale heart to warning colour), **embers** (short trails flying out with the debris near the mouth).
- **Gated per mark by its layer's activity** (`CC.Activity.gate`), keyed on what does not move as the wound grows (absolute radius and side, or index), so they light in place as either dial moves. At 0% none and a derelict wound is cold and dark; on emergency power a few faint sparks, no fire; the plant's faces burn before habitation's, as its lights do. `busy` adds more past 55%.

The user: "its good."

## Stage (c) closed

The stale list above is fixed: MACHINE-WORLDS.md (the stack, colour, layer-details, Operational status and Hull integrity sections and the primitives row, all marked as built), PARAMETERS.md (the two dials as relabels, Interior heat and Cohesion naming them, the climate row, the Unfinished World preset), and ARCHITECTURE.md (`lit` and `capacitors` in the layer table, a new table of archetype properties for built bodies — `shafts`, `activity`, `rupture`, `dials` — and a table of colour-entry properties including `heatValue`'s third figure; the stale "Operational status and Hull integrity use the presence form" corrected). The Hull integrity tooltip no longer says "a wedge". The machine world's Star activity column in the climate table is left **not yet reviewed**, for stage (d).

Scratch tool added: `test/_tmp/_zmarks.mjs` (each wound's mark counts).

## Stage (d): exclusive traits, card, flavour, presets (D272–)

### The audit (TRAIT-SYSTEM.md's three tests, against the body as built)

The machine world carried no trait at all (nothing required `artificial` or `machine`). Each spec trait was checked against the three tests and against the body's own vocabulary of marks (concentric bands, thin radial slots, hundreds of tiny repeated rectangles, glyphs in the haze, torn wedges with debris), since a trait must be a different kind of mark:

- **Build**: Under construction (open lattice and squared cuts), Blast doors (slabs across the slots), Shaft covers (the user's "shutters", see D274), Overgrown (the one irregular organic mark), Weaponized (the one big filled object: a bore barrel 3–5× a shaft's width with coils and a muzzle past the silhouette), Worldship (an asymmetric silhouette and the body's first soft emissive gas: engine bells on one bearing, a plume, cold when offline).
- **Cut: ancient-precursor.** It fails test 2 as a mark and test 3 as a stack: "unfamiliar geometry" would be a re-skin of every element, a second art style, and "still running" is a position on Operational status. It moves to the card's Construction row and the flavour pool (age read from what is drawn: Overgrown ancient, Under construction still being built).
- **Removed: planet-cracker**, by the user ("the other 6 traits are enough"). It would have been the first trait to swap a stack, needing a new presence form.
- Doors and shutters as **two traits** (the user's call).

### D272 — `sets`: a trait that switches structure data

`js/gen/traitsets.js`. Most machine-world traits are not marks placed round a layer but a change to a general structure feature the archetype already declares (the rupture, the shafts), which the placement grammar cannot say and no builder should branch on. A trait declares `sets: { rupture: { edge: "clean" } }`; `CC.TraitSets.apply` merges every chosen trait's `sets` over the archetype one key deep (objects merged, anything else replaced), in `gen/details.js` straight after `CC.TraitRoll.select`, so every detail-stage builder reads an archetype that simply says "clean". **Detail stage only**: the structure stage has run on the plain archetype, so `sets` changes what is built along the layers, never the layers. `TraitRoll.place` skips a trait with `sets` and no `element`. The archetype is never mutated.

Machine traits live in `js/data/traits/machine.js`, `requires: ["machine"]`, tagged `artificial`; blurbs in `js/ui/traitpicker.js`.

### D273 — Under construction: the `clean` edge style

`js/gen/woundclean.js` registers `"clean"` with `CC.WoundEdge.register(style, fn, opts)`; `register` gained **options** read by `CC.WoundEdge.option`: `jag` scales the serration and the floor's raggedness in `gen/rupture.js` (stored on each wound as `w.jag`, so `edgeAt` agrees), `rim` names how `draw/woundedge.js` strokes the outline (`RIMS.scorch`, the old figures; `RIMS.trim`, a dark seam with a lit bevel). Torn is `{ jag: 1, rim: "scorch" }`, and its renders are byte-identical to before. Clean is `{ jag: 0, rim: "trim" }`: square steps, a flat floor, terraced like a building going up. Same wounds, growing with the same dial. Marks, all pinned by hashes of what does not move as the wound grows:

- **frame**: each missing shell as bare steel in its own metal, ring girders along the band's top and bottom reaching in from both faces, radial ribs every 0.016, a diagonal per bay; two in five meet in the middle. A hollow layer's frame is its band alone, the void left open. Added after the first look: towers and cranes alone left the wound an empty flat notch at sheet size, where the torn style fills it with debris.
- **posts**: the next level's pillars standing full height on each void's floor ledge at the real pillars' bearings (`stubs` with `clean: true`, drawn whole, no break).
- **scaffold**: amber lattice towers against the faces, floor to top (85%); cranes at the surface lips (mast, jib over the mouth, tie, counter-jib, hook let down into the wound; the main wound always has one). Painted safety amber, red where the accent is itself near amber (`draw/woundscaffold.js`).
- **sparks**: welding glints on the faces and a beacon on each crane, gated by `CC.Activity.gate`, so a stalled site is dark. In the warning colour (red on a blue-accent world); offered to the user as changeable to blue-white.
- No debris, no fire. At Hull integrity ≥ 92% it draws nothing: the world is finished.

`draw/primitives/built.js` gained `CC.Primitives.beam(ctx, a, b, w, style)`, the truss between two pixel points; `truss` calls it. `draw/woundedge.js` reads `rupture.rim`, draws `m.frame` and `m.scaffold` through `CC.WoundScaffoldDraw.draw`, and tolerates a style with no debris.

The user: "Amazing result."

### D274 — Blast doors and Shaft covers

General properties of the archetype's `shafts`, `doors: { thick }` and `covers: { thick }`, each switched on by its trait's `sets`; built in `js/gen/shaftdoors.js` (one line in the `gen/details.js` result, `details.doors`), drawn in `js/draw/shaftdoors.js` (one hook in `draw/scene.js` after the capacitors, inside the rupture clip so a wound takes doors in its path).

- **Open or shut by Operational status**: each door asks its layer's `CC.Activity.gate` with a stable hash: dark → shut, emergency → jammed 10–35% open, lit → open with chance 0.55 × `busy` (at most 0.9), never fully (55–78%) so the jaws stay visible. An airlock pair shares one state. A derelict is sealed.
- **Blast doors**: an airlock pair where each shaft crosses a shell below the outermost, a 0.017 slab at the top and bottom of the band. Two dark grey leaves, each sliding out of a pocket in the shaft wall (the hidden part sunk in shadow, only as deep as it has gone; a shut door shows a seam), a lit outer lip, a thin warning tape down each leading edge.
- **Shaft covers**: a dark grey silo cover seated in the top of each shaft, flush with the hull (the body is clipped to its surface at that point of the scene, so anything standing proud was cut off), 1.6× the shaft's width, two panel seams, a thin warning tape along its bottom, sliding aside along a rail by its open share, direction rolled per shaft.
- **The user's corrections, round one**: the doors were white, the status light too busy, the warning stripes odd, the leaves did not seem to slide into their slots; now grey slabs, no light, thin tape where they meet, pockets. The shutters (a louvred housing standing proud) were "the wrong thing altogether": too tall, too complicated; now a sliding silo cover with a thin tape at the bottom. Then: both darker (value 0.34, lip 0.52). **The revised version was approved** (next session, rendered lit, on emergency power and offline). Noted then: at 20% on seed v4 every door on the zoomed shaft gated dark (shut) rather than jammed, so the jammed state is rare to see; not raised as a problem.

### D275 — Overgrown: `overgrowth`, a general structure feature

`js/gen/overgrowth.js` builds, `js/draw/overgrowth.js` draws; the trait sets `overgrowth: { cover: [0.15, 0.85], proud: 0.020, creep: 0.045, hang: 140, pool: 0.022, wither: [0.0, 0.15] }`. The one irregular organic mark:

- **Mats** on the outermost layer's outer face: where one smooth periodic field round the circumference (1440 cells) clears a threshold set by the cover, so Detail density grows the same mats in place. A cushion outline of domes (|sin| under a square root, two frequencies) standing proud, drips down the cut face (capped at 85% of the hull's thickness), a darker root band, leaf dots in three tones and three sizes counted by body-space area (never by pixels, at most 9000).
- **Tendrils**: tapering wobbling strands down each shaft's walls from the mouth (2–7 where a mat is over it, else at most one), and a curtain from the outer void's ceiling under the mats (`hang` × cover). Mid-tone: the dark tone vanished against the shaft.
- **Pools**: a mound on every wound's floor and (by chance rising with cover) its ledges, clipped to the wound's outline so its base sits below the ragged floor and fills the dips; lifted 0.020 × the edge's `jag` on the floor so the torn floor's teeth do not poke through. Each pool carries its own dots, clipped with it.
- **Hue**: moss (60%) or a rust bloom, rolled per body.
- **Withered by Operational status** (the user: growth on a running world can be deliberate cover masking what the body is, so the dial never changes HOW MUCH; asked first about an atmosphere toggle, but the machine world has no atmosphere layer, and the user chose Operational status). Through `wither: [lo, hi]` against `CC.Activity.level`: lush from 15%, drifting to grey straw (hue 40, saturation ×0.30, value ×0.80) by 0%. A body with no `activity` never withers.

Two hooks in `draw/scene.js`: phase `"body"` (mats, tendrils, leaves) after the shaft doors, inside the rupture clip, so a wound takes the growth in its path; phase `"wounds"` (pools) after the torn edge. `gen/details.js` hoists the rupture into a variable so the growth can read it. Scratch tool: `test/_tmp/_zpools.mjs` (hue, counts, each pool's height).

The user: "I like what I see"; withering "Looks good". Open, the user's call if it bothers them: dead growth is grey on grey steel at sheet size, so at 0% it nearly vanishes.

### D276 — Weaponized: `bore`, a general structure feature

`js/gen/bore.js` builds, `js/draw/bore.js` draws; the trait sets `bore: { width: [3, 5], cap: [0.042, 0.085], muzzle: 0.075, coils: 0.10 }`. The one big filled object: a barrel from a breech on the innermost built layer out through every shell and void to a muzzle crown past the surface, on one rolled bearing kept clear of the shafts. Half-width is `width` × the shafts' mean half-width, clamped to `cap` (in practice usually at the cap). Nothing looked up by role.

- **Barrel**: constant body-space width (not angle), shaded as a cylinder by one linear gradient across it, two panel seams, a bore channel down the middle. **Collars** where it passes each shell's faces and each void's edges.
- **Coils** in stages of three (the middle ring the big one), pitch `coils`, each stage clear of the collars; in a lit stage the gaps between rings glow. First built as single thin rings at an even pitch: it read as a ladder, the shafts' and pillars' own mark.
- **Crown**: a flared block and a pair of rails past the surface, a radial glow at the mouth when charged. If a wound contains the barrel's exit through the surface, there is no crown (nothing floats past a hole).
- **Seated on the heart** (the user, three rounds): the breech is a tapered housing whose base is an arc in the barrel's frame (`sqrt(R² − x²)` along), sitting in a **saddle**, a bolted curved clamp on the heart's rim drawn OVER the housing's base, `saddle: { r0, r1, span }` built in gen so the feeds and the saddle agree. **Feeds**: 7–9 slots with the outermost each side left empty, so 5–7 pipes parallel to the barrel across the saddle's width, each from a round socket in the heart (sockets on one arc round the heart's centre at 0.58 × the saddle's inner radius, so the middle pipes reach deepest) to a junction box with its light on the saddle's inner edge (so the boxes follow its curve); tubes shaded as the barrel, collared, an energy line down a powered one. Rejected on the way: a flat block with a lit window (read as a screen), braces from the breech's shoulders to the saddle (the user: they did not look good), conduit-thin radial runs (scrawny), few fat parallel tubes with no curvature (too big, too few).
- **Charge by Operational status**: the innermost layer's `live`, raised by the hive multiplier; each coil stage and feed asks that layer's `CC.Activity.gate`. Dark: cold. Emergency: a dim red bore, only the stages the gate keeps burning. Lit: the accent.
- **Draw order**: last of the body's own passes in `draw/scene.js`, just before `CC.RuptureDraw.end` — after Overgrown's body pass AND after the escaping pass where seated fixtures (docking ports, sensors) are drawn, so the gun covers them (the user), and still inside the rupture clip, so a wound cuts it. The user liked the remnant of a barrel left standing in a wound.

Scratch tool: `test/_tmp/_zbore.mjs` (each seed's bearing, half-width, crown kept or taken). The user: "big and looks cool shape and details wise"; the base approved after the feed rework.

### D277 — Worldship: `engines`, a general structure feature

`js/gen/engines.js` builds, `js/draw/engines.js` draws; the trait sets `engines: { bells: [3, 4], bell: [0.065, 0.090], mount: 0.035, reach: [0.40, 0.60], depth: 0.75 }`. The two marks the body lacked: an asymmetric silhouette and a soft emissive gas.

- **Bells**: 3–4 main bells side by side across one bearing, a vernier at 0.45 scale outboard of each end (two size tiers), hung from an engine block whose base follows the hull's curve and whose face is flat. Each bell is shaded as a cylinder, flares from its throat (half-width `t + (e − t)·u^0.6`), with cooling lines along it, two stiffener rings and a lit lip; a firing bell glows orange-hot at the throat. First built at 0.050–0.075 and 3–5 bells: too small at sheet size.
- **Thrust frame**: one heavy longeron from under each main bell down through the shells, converging (to 0.40 of its spread) on a bolted curved thrust plate at the outer face of the outermost built layer below `depth` (the machinery in practice; found by radius, never by role), with cross-ties at each shell face and void edge.
- **Plume**, added with `lighter`: a merged wake of 70 soft radial puffs across the whole cluster further out, under each bell's own gas (46 puffs), a core of small white-to-accent puffs crowding the exit, 3–5 shock diamonds as soft elongated glows (an ellipse by transform), and sparks fanning out. Positions are 0..1 along the plume, scaled by its length at draw, so the dial stretches it in place. Rejected on the way: a hard tapering core polygon (read as a blue light cone) and hard lozenge diamonds (paper cut-outs).
- **Where**: a bearing clear of every shaft; with a bore, aft of it (opposite, ±1.1 rad), and never within 0.35 rad plus the cluster's span of it, so the gun points forward and the drive pushes from behind. `gen/details.js` hoists the bore into a variable so the engines can read it.
- **Fired by Operational status**, as the bore is charged: the innermost layer's `live` raised by `busy`, each bell gated by `CC.Activity.gate`. Dark: cold metal. Emergency: a dull red in each throat, no plume. Lit: plume length 0.55–1.0 of its reach by the charge.
- **Wounds**: a bell whose footing on the hull lies in a wound is torn off; with no main bell left, nothing is drawn. Drawn in `draw/scene.js` right after `CC.BoreDraw`, before `CC.RuptureDraw.end`, so it covers the growth and the seated fixtures and a wound cuts the frame.

Open, the user's call if they bother them: the frame's lattice is akin to Under construction's scaffold; the soft tail can run past the frame (nothing reserves room for it in the framing); when a wound takes the outboard bells, the block stands out over the wound's mouth as a stub; the emergency throat glow is faint at sheet size.

The user: "Looks absolutely amazing, I'm impressed."

## Next session: stage (d) continued

Stages (a)–(c) and stage (d) sub-steps 1–4 are built and approved (D248–D277: Under construction, Blast doors, Shaft covers, Overgrown, Weaponized, Worldship). All six exclusive traits are done. `npm test` passes. Remaining, in order, rendering for the user between each:

5. **The stat card**: `js/gen/stats/machine.js` (the archetype already says `statTemplate: "machine"` and falls back to the planet's); MACHINE-WORLDS.md § "Stats template". Every figure measures the render: Power from the reactor's drawn radius × Operational status; Population from habitation's presence and volume × its lit share; Status from the Operational status bands (and Under construction); Hull integrity from the wounds actually cut (how many, how deep, which shell); Docking from shafts, doors, covers and docks; Construction from what is drawn (ancient-precursor's home); Biggest danger from drawn hazards; Weaponized and Worldship each owe the card a line read from `details.bore` / `details.engines` (charged or cold, how many bells firing). Laypeople's wording, metric with a comparison.
6. **Flavour pool** (`js/data/flavour/`), including the cut precursor's story.
7. **Presets** (PARAMETERS.md § Artificial): Derelict Machine World, Hive World, Automated Factory, Unfinished World, Worldship. **Planet-Cracker is removed** (strike it from PARAMETERS.md). Render each against its blurb.
8. **Star activity** against the machine world, and fill the climate table's open cell (likely ✖ for the render, ◐ only if the card carries a radiation line).
9. **Close Phase 9a**: decisions here; MACHINE-WORLDS.md (exclusive traits table: the six built with their structure features — `rupture.edge: "clean"`, `shafts.doors` / `covers`, `overgrowth`, `bore`, `engines` — ancient-precursor cut, planet-cracker removed; `sets`; stats; flavour), ARCHITECTURE.md's archetype-property table (`bore`, `engines`, `overgrowth`) and PARAMETERS.md to the code; PROGRESS.md and checklist.md; `npm test`.

Same rules: no archetype branch in `js/draw/`, ≤500 lines per file with hooks only in `scene.js` / `details.js` / `elemgen.js` / `palette.js`, no new tests unless asked. Scratch tools: `_zgrid.mjs` (sheets), `_zwound.mjs` / `_zcrop.mjs` / `_zzoom.mjs` / `_zlayer.mjs` (close-ups), `_zrow.mjs` (compare; it rescales, so read crop coordinates at the source size), `_zpools.mjs`, `_zbore.mjs`.
