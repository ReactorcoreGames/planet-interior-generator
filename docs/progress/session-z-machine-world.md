# Session Z — Phase 9a, the `machine-world` archetype

*D248–D271 so far. Built in four stages the user looked at between: (a) the stack with hollow shells, voids, pillars and access shafts; (b) colour, the accent hue and the always-drawn details; (c) Operational status and Hull integrity; (d) exclusive traits, stat card, flavour and presets.*

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

## Next session: stage (d)

Stages (a)–(c) are complete (D248–D271). **Stage (d)**: the machine world's exclusive traits, its stat card (it still falls back to the planet's; MACHINE-WORLDS.md § "Stats template"), its flavour pool and its presets (PARAMETERS.md § Artificial). Within it:

- **Under construction** as an exclusive trait (D249): register an `edge: "clean"` style in `js/gen/woundedge.js` (`CC.WoundEdge.register`) and add scaffolding `truss` work; the trait has to switch the rupture's `edge`, without an archetype branch in `js/draw/`.
- **Doors and shutters on the access shafts** (the user, stage a).
- The spec's other exclusive traits (overgrown, weaponized, ancient-precursor, worldship, planet-cracker): audit each against the three tests before building.
- Review Star activity against the machine world (the climate table's open cell).

Previous sub-step list for stage (b), all done:

Same rules: render for the user between sub-steps (`_zcrop.mjs` for close-ups, `_zgrid.mjs` for sheets), no archetype branch in `js/draw/`, ≤500 lines per file with hooks only in `scene.js` / `details.js` / `elemgen.js` / `palette.js`, no new tests unless asked. Elements go in `js/data/elements/machine.js` after each layer's `texture` element.

1. ~~**`cellgrid`**~~ — **done, D255.** Seams on the hull, hex panelling on habitation, windows in the power core, chips in the machinery.
2. ~~**`glyph`**~~ — **done, D257.** Defense-grid platforms.
3. ~~**Even spacing for layer details**~~ — **done, D256.** `spacing: "even"` and `jitter` on any recipe.
4. **The spec's always-drawn details per layer** (MACHINE-WORLDS.md § "Layer details"): ~~radiator fins, sensor arrays, docking ports~~ (done, D258: fins on surface-systems, docks and sensors on the hull's face); ~~machinery truss lattice and gear/rotor shapes~~ (done, D259); ~~computation data-flow pulses~~ (done, D260); ~~power-core glow stipple and containment rings~~ (done, D261); ~~conduits~~ (done, D262–D263, with the board's capacitors).

Stages (c) and (d) follow as planned (see D249 and the opening of this file). Door/shutter traits for the shafts come with the traits.
