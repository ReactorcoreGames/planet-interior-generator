# Session U2 — what is on and in the asteroid

**D193–D204.** The second half of [ASTEROID-OVERHAUL.md](../archive/ASTEROID-OVERHAUL.md), in the doc's U2 order: §6 (the dead anchors) → §5 (the `plate` primitive, a rectangular mining station, the tunnel borer, the ore rename) → §7 (caves, tunnels, exits, one slider, Cohesion capping it, the card measuring it, Hollowed Rock's chamber back) → §8's radioactivity half. The body U1 built — silhouette, mosaic, cell texture, void look — was not touched.

**No other body changed.** Every non-asteroid archetype renders byte-identically to HEAD (`test/_tmp/_u1regress.mjs` against a worktree of `8d5a54f`). Two shared mechanisms changed behaviour *only* where something opts in: the damage-trait clip (only on a surface with no frosting, which in practice is the asteroid) and the hazard scorer (reads a `radioactive` fact only the asteroid sets). The one change other bodies can *see* is the ore-deposits trait's label, which is shared.

Scratch tools for this session: `test/_tmp/_u2grid.mjs <tag> '<variants json>' [cell] [seeds]` (rows of overrides × columns of seeds), `_u2card.mjs` (the asteroid card's Inside / Radioactivity / Danger rows across settings), `_u2elig.mjs` (every archetype's eligible traits, and what each asteroid trait places), `_u2prof.mjs` / `_u2time.mjs` (cave generation vs drawing cost). U1's `_u1probe.mjs` was used for large and zoomed renders.

---

## D193 — a layer may answer a trait with its own marks (`absorbs`)

§6 asked that `cratered` on the asteroid "raise the shell's own crater count, not add a second mechanism". The shell already has two crater marks: craters stamped into its terrain (which notch the silhouette) and a field of impact pits (arc-bands). Laying the trait's 55–260 pits over those would be two crater mechanisms in one thin band.

So the **layer** declares it: `absorbs: { cratered: { craters: 2.6, elements: { "arc-band": 1.9 } } }` on the asteroid's outer shell. When `cratered` lands there, `gen/traitroll.js` places nothing for it, and `gen/details.js` (`absorbedScale`) multiplies the shell's own terrain crater count and pit count instead. Layer-side rather than trait-side, so `cratered` on a planet or a moon is exactly what it was. Measured on one seed: the shell's pits go 60 → 114, its terrain craters 11 → 29, and the trait places 0 elements.

`cratered` and `impact-basin` both anchor `["crust", "outer-shell"]` now. `void-pockets` and `magma-chambers` stay ineligible on the asteroid — the D190 anchor gate does it — and both now say so on purpose in their comments.

## D194 — a basin on a surface with no frosting is shaped by its band

The re-anchored `impact-basin` showed two faults on the first render, both because the damage pass was built for a planet's crust:

- **It hung off the body as dark crescents.** Damage traits clip to a circle at the terrain's *peak*, so a scar can reach the frosting piled above the ground. The asteroid has no frosting, and against a faceted outline that circle let wedges paint into open space. A surface with no frosting now clips damage to its **real band** — outer edge and inner edge as drawn, even-odd.
- **Its inner edge was a ruled arc across the crust.** The wedge spans 18–100% of the band at *nominal* radii, and the shell's real edges wander well past any fixed fraction. A layer may now restate where a trait sits inside it — `traitDepth: { "impact-basin": [-1.0, 1.4] }` on the shell — so the wedge reaches past both edges and the band clip shapes it.

It now reads as a dark sector of crust that follows both of the shell's edges. **Whether a sector of darkened crust reads as a basin on this body is the user's call** — the alternative is a big crater stamped into the outline (a concave scoop, the Stickney reading), which would be another `absorbs` entry rather than new drawing code.

## D195 — `plate`, and a station is a cluster of modules

`plate` is built (`js/draw/primitives/machines.js`) — the P9 primitive the trait table had planned — with the mining station as its first customer. The user's reasoning for rectangles over capsules is about gravity: a capsule is a shape for holding pressure or riding a wind, and an installation on a body with a thousandth of a g is a frame.

One primitive, three built things, chosen from the element's own seed: a **block** (most; flat-faced, lit on the side facing space, panel seams, sometimes a roof module with a mast), an open **truss** frame (outline and cross-bracing — nothing in the geology has diagonals inside a rectangle), and a **landing pad** (a long flat slab with a centre ring). It shares the capsule's placement and proportion roll (`buildHulls`), so the trait only changed `element`, `aspect` and its count — up from 3–11 to 6–16, because a mark is now one *module* of an installation rather than a whole hull, with tighter clustering.

## D196 — the tunnel borer is a vector, and its tunnel belongs to the caves

`tunnel-borer` (`js/data/traits/solid-asteroid.js`) is the user's idea from looking at the old capsules: a cylinder with a spiked cutter head, and the tunnel behind it. `borer` draws only the **machine** — banded cylinder, flange, three spikes with the middle one longest — pointing along the last segment of its trail.

**The trail is not the borer's mark.** `gen/caves.js` lays a constant-width bore from an entry point outside the silhouette to the machine's head, and `draw/caves.js` draws it in the same passes as every cavern. A borer whose bore crosses a cave reads as one excavation, which §5 asked for. The bore is constant width because a bore does not taper. The element carries its trail in warped body space (`el.trail`, stamped by the cave builder, which is why it is not on the recipe — D159).

## D197 — caves are ONE system, drawn in tone passes so it merges

§7 as the user revised it: squiggly thick tunnels of varying thickness criss-crossing at random, some breaking the surface, and clusters of circles as chambers — on or beside a tunnel, or a closed pocket — natural through the low and middle range, with straighter constant-width bores, regular chambers and more exits added at the top.

**Generation** (`js/gen/caves.js`) works in **warped body space** — the space `CC.Form.mosaicSites` lays fragments in — so tunnels follow the blob, not a circle. A point there is drawn at `view.cx + x·R`, which is where `view.at` puts it inside the body. Each tunnel and chamber cluster has its **own RNG stream by index**, so dragging the slider grows the existing system and adds to it rather than re-rolling it. Natural tunnels are a random walk with a slow swing, turned back at a margin inside the interior's edge; their width swells and narrows along their length and pinches toward the ends. Some run out past the silhouette as exits. Artificial chambers are placed with spacing and joined to their nearest predecessor by a straight bore with at most one dog-leg; bored exits run outward from a chamber.

**Drawing** (`js/draw/caves.js`) is the U1 discussion's two-pass idea. **Every pass covers the whole system at once**: first everything a little fat in the mosaic's seam tone (the wall), then the cavity at full size, then shrunk in seven steps toward the floor tone, then the cut-face texture clipped to the cavity. Crossing tunnels and a tunnel running into a chamber therefore come out as one cavity with one smooth wall. Fragments under a cavity's edge are cut partway, which is what reads as carved rather than pasted.

**The colour is the rubble void's** (D192). `mosaicFill` gained `voidRamp(t)`, the void's wall-to-floor recess as a continuous ramp, so a cave and a gap between fragments are the same darkness at two scales from one formula.

**Exits need nothing special.** The cave pass runs after every layer, clipped to the silhouette's drawn outline, so a tunnel running past it cuts the crust and ends as a mouth at the edge. At whole-body scale a mouth is a narrow dark notch beside dark space; at zoom it is clearly a tunnel through the shell.

The rubble voids are unchanged and coexist, as decided. Support pillars were deferred, as §7's scope warning allows.

## D198 — two reads that the first renders got wrong

- **Thin caves read as roots.** The first natural tunnels were 0.008–0.022 of the radius in half-width, and at sheet scale they were dark worms, too thin for the cavity's depth ramp to show at all. The user's words were "squiggly *thick* lines"; they are 0.015–0.034 now, with a gentler taper.
- **Round chambers on straight bores read as a ball-and-stick molecule.** A mined hall is a **stadium** — parallel walls, rounded ends — drawn as a short, very wide bore, so it merges through the same passes. It is also a different shape from the natural chambers' clustered circles, which is the vocabulary split §7 wants.

The exit tunnels also beaded at first, because their width was re-rolled every step; they swell smoothly now.

## D199 — Cohesion caps the AMOUNT; the slider alone sets the CHARACTER

`caves: { layer, param: "caverns", cap: { param: "cohesion", from: 0.06, full: 0.62 } }` on the archetype. How much is expressed is the slider times a smoothstep on Cohesion: nothing below 0.06, the full amount from 0.62. Whether it is natural or bored comes from the slider's position alone (`smoothstep(0.55, 0.95, slider)`). So a rubble pile with Caverns at the top has a few small bores and halls, not natural caves of the wrong kind. Measured at Caverns 60%: Cohesion 0.1 shows nothing, 0.3 a few small caves, 0.5 and up the full system.

The slider is **Caverns**, the user's suggested name, beside Cohesion: the same row markup, the same detail stage, the cache key, the settings string (generic), Randomize over 0–100, and a tooltip. Default 30%, so the default asteroid shows some natural caves; 0% is untouched rock and is byte-identical to an asteroid without the feature.

**Presets:** Rubble Pile 0, Iron Fragment 8, Ice Hauler 45, and **Hollowed Rock 96 with Cohesion 62**, so all of it stands. Hollowed Rock also gains the tunnel borer beside its mining station. That is its chamber back: mined halls and bores right through it, the plant still on the crust and a borer still working.

## D200 — the card measures the caves, and caves are hole

Stats measure the render, so `gen/caves.js` rasterizes **the same geometry it hands the renderer** onto a fixed 180² grid (resolution-independent). It reports the share of the host layer's cut face that is cavity. The card's new **Inside** row names what is drawn: winding passages, natural chambers (a cluster counts as one), bored tunnels, mined halls, how much of the interior they take, how many open to space, and any boring machines. A body with nothing cut has no row.

Caves are hole for the density figure: `empty = voids + (1 − voids) × caveArea`, because caves cut through fragments and rubble voids alike. Gravity therefore falls as Caverns rises. Measured on one seed: 0.021 g untouched, 0.013 g hollowed. The Structure ladder still reads the mosaic's own voids, so a monolith with halls cut in it is not described as a rubble pile.

Flavour picked up cave lines: a danger ("some of them come out somewhere else"), an approach ("go in through a tunnel mouth"), a notable for a hollowed body and one for running borers.

## D201 — a clip of 900 circles cost 70 ms

The first cavity clip stamped a disc at every tunnel vertex and segment midpoint, about 900 overlapping circles at full Caverns. It took 73 ms to rasterize as a clip (200 circles: 3.5 ms — badly non-linear). That put a full-Caverns asteroid at about 300 ms per render against a planet's 217. Batching the strokes changed nothing, which is how the clip was found.

The clip is now **one offset outline per tunnel**, plus a disc at each end and the chambers: about 80 subpaths. The cave draw went from 58 ms to 6 ms, and a full-Caverns asteroid renders in about 90 ms. **The outline is traced in the same turning sense as `arc(0, TAU)`.** Traced the other way, nonzero winding cancels to zero wherever an outline overlaps a cap or a chamber, which punches holes in the clip exactly where caves meet. Checked with a one-pixel probe.

## D202 — radioactivity: the same control, a fitting name, a consumer that shows

§8's other half. Interior heat was nearly dead on this family (`retainsHeat: 0.12`, a weak hue lean). It is now **Radioactivity** on the asteroid.

- **The relabel is general.** `dials: { "<control id>": { label, title } }` on an archetype, applied by `syncAxisDials` (`js/ui/controls.js`). That is the same function and the same three routes (D79/D114) as the star's "Binary companion". Every id any archetype renames is walked, so switching archetype restores the default.
- **Some fragments are hot.** `mosaicRadio: "interiorHeat"` on the mosaic recipe. `buildMosaic` marks a share of the solid cells `hot`: none below about a third of the range, a tenth at the top. It picks them by a **hash of each site's existing roll**, not a new RNG draw, so the rest of the mosaic is the same rock with or without it. Composition only: no cell, void or count moves.
- **The colour and the glow.** One hue per body, a sickly yellow-green or a cold blue-white, in `mosaicFill`. The fragment keeps its texture and grit, because it is still a stone. Above about 0.62, a `screen` halo spills a little onto its neighbours: the family's one honest emissive mark. The first pass marked a fifth of the cells in near-neon colours, which read as a glowing green asteroid. The review asked for "a couple of cells", so the share was halved and the colours desaturated.
- **The card and the hazard agree with the picture.** A **Radioactivity** row reads the cells that were drawn hot, and says "hot enough to glow" exactly where the glow starts. The hazard scorer adds the hot share to radiation for the **rating**, but reports only the *external* figure. Otherwise the universal "Radiation. Stellar flares" line fired on a radioactive rock, blaming the sky for the rock. The asteroid pool has its own lines ("Radiation from inside, not from the sky"), and "Very little, honestly" is no longer offered when the rock is hot.

## D203 — housekeeping

- **New files instead of growing old ones:** `js/gen/caves.js`, `js/draw/caves.js`, `js/draw/primitives/machines.js`. Each is under 500 lines. `gen/details.js`, `gen/traitroll.js`, `gen/elemgen.js`, `draw/scene.js` and `draw/details.js` were already past the cap and gained only small hooks.
- **The ore-deposits trait is labelled "Mineralised Crust"**, the doc's candidate that fits both a planet's crust and an asteroid's shell. The id is unchanged so saved settings load, and its numbers are untouched. The picker blurb moved with it, and blurbs were added for the mining station and the borer.
- **Rendering cost:** at 1600×1000, a planet takes about 220 ms, a default asteroid 80–150 ms, and an asteroid at full Caverns about 90 ms of render.

## D204 — a station sits ON the surface (the user's review)

The user's first look at U2: the stations "seem to be embedded in the crust and get cut off outside of it" — they were meant to stand on the surface, only slightly sunk in. Two causes. The trait was `reach: "on"` with depth 10–95% of the shell, so most modules were placed *inside* the band. And that pass clips to the band, so anything standing above the outline lost its top.

The fix is `seat` (0..1, how much of a mark's own thickness is buried), set to 0.25 on the mining station. Placement happens in body space against nominal radii, but the asteroid's drawn outline is that radius times the wobble, the relief and the form — a long way from nominal. So a seated element is re-seated at draw time in `draw/scene.js` (`seatOn`), where the silhouette's real boundary function exists. It is centred on the mean ground height across its own footprint and tilted to the slope between the footprint's ends, so a building stands on the facet it was put on. The trait is now `spanning`, which takes it out of the shell's clipped pass, and seated marks draw in the unclipped spanning loop. `seat` is stamped on the element in `placeOne`, for D159's reason.

## Still open, for the user's eye

- **Cavity tone.** Caves use the rubble voids' darkness (D192), so the depth ramp is subtle and a hollowed body is mostly near-black. Lifting the ramp's floor would make caves read more as space and less as ink, but would also part them from the voids.
- **The impact basin** reads as a dark sector of crust (D194), not a dent in the outline.
- **Exit mouths** are easy to miss at whole-body scale.
- **Mining station density** (6–16 modules) was set on two renders.
- **Radioactivity's blue-white** variant is the more saturated of the two.
- §9's question (one interior layer or two) was not revisited. Nothing this session made the interior read flat; the caves give it depth of a non-concentric kind, which was §9's own argument.
