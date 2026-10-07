# The asteroid overhaul

*A plan, not a build. Written after the first iteration (Session T, D175–D183) was rendered and reviewed. The source is the user's own review in [Asteroid Overhaul brainstorm prompt.md](Asteroid%20Overhaul%20brainstorm%20prompt.md), quoted where the wording matters.*

**Status: built.** Session U1 built the body: §3, §1, §2, §8's brittleness half, and §6's general eligibility fix. See [progress/session-u1-asteroid-body.md](progress/session-u1-asteroid-body.md) (D184–D192). Session U2 built what is on and in the rock: §6's re-anchoring, all of §5, §7 as the user revised it, and §8's radioactivity half. See [progress/session-u2-asteroid-interior.md](progress/session-u2-asteroid-interior.md) (D193–D203). Where U2 departed from this plan: `cratered` is *absorbed* by the shell's own crater marks; the axis is named **Caverns**, not Excavation; mined chambers are stadium-shaped halls; Interior heat is relabelled through a general `dials` declaration. **Deferred:** support pillars (§7's own scope warning). **Still the user's call:** see the open list at the end of the U2 write-up.

---

## READ FIRST, in this order

- `CLAUDE.md` — locked constraints. No modules, no build step, ≤500 lines per file.
- `docs/progress/session-t-asteroid.md` — D175–D183, the whole file. Every correction in it is live and several of them are about to be re-opened deliberately.
- `js/data/archetypes/solid-asteroid.js` — the stack, and the long comment block recording why each figure is what it is.
- `js/draw/primitives/mosaic.js` — the Voronoi renderer.
- `js/data/elements/solid-asteroid.js` — the two element recipes.
- `js/data/traits/solid-asteroid.js` and `js/data/traits/solid.js` — the trait pools, including the ones that never appear.
- `docs/TRAIT-SYSTEM.md` — the placement grammar, particularly `anchor`, `reach` and the element primitive table.

---

## WHAT THE REVIEW ACTUALLY FOUND

The first iteration got one thing right and the review says so plainly: *"I like the voronois it makes."* The mosaic is the reason the family exists and it survives this overhaul. Everything else is in scope.

The nine complaints sort into **four distinct kinds of problem**, and they want four different kinds of fix. Sorting them this way is the point of this document — three of the four are cheap, and lumping them together would make the whole overhaul look like the expensive one.

| Kind | What it is | Items | Cost |
|---|---|---|---|
| **A missing mechanism** | The renderer genuinely cannot express the thing asked for | Blob silhouette (§1) | New code in `draw/layers.js` + `gen/structure.js` |
| **A wrong mark** | The mechanism exists, the mark it draws is the wrong mark | Cell shading (§2), hollowed-out (§4), mining station (§5) | Data and one primitive each |
| **A dead anchor** | The trait is authored, rolled, and places nothing | Void pockets, magma chambers, cratered, impact basin (§6) | **A one-word edit per trait** |
| **A conceptual retirement** | The trait should not exist on this body | Mineral veins, metal-rich, ice-rich, hollowed-out, frosting (§3, §6) | Deletion |

**The expensive part of this overhaul is §1 and §7.** The rest is mostly data.

---

## §1 — THE SILHOUETTE: from a lumpy circle to a blob

> *"Too circle like. Overall silhouette should be more of an irregular blob/amoeba shape than the current circle that merely has extreme terrain."*

### Why the current system cannot do it, no matter how the knobs are turned

This is the important finding, and it explains why Session T's three attempts all failed. `boundaryFn` in `js/draw/layers.js` returns

```js
function (angle) { return 1 + n(angle, octaves) * amp; }
```

and `traceBoundary` walks 240 bearings calling it. **Every boundary in this project is a radius function of a bearing about a fixed centre.** That is a *star-shaped* region by construction: it can be lumpy, it can be faceted, it can have a dozen lobes — and it can never be an amoeba, because an amoeba is not a single-valued function of bearing about its own centre, and more importantly it is not *centred* at all.

Session T reached for amplitude (`extreme`), then angularity (`boundaryFacet`), then lobe count (`boundaryFreq`), and the session notes record the verdict on the first: *"the silhouette swung from 0.892 to 1.010 of the radius and looked round anyway."* All three are refinements of the same statement — *how far the edge is from the centre at this bearing* — and roundness is not a property that statement can shed. **The missing axis is the fourth one: where the centre is.**

### The fix — `boundaryOffset`, an eccentric centre

A new layer property, declared as data like the three before it, that displaces the shape's centre away from the body's centre as a fraction of the radius:

```js
boundaryOffset: 0.16   /* how far the lump's centre sits from the frame's */
```

Implemented in `boundaryFn` as a vector added to the radius function, which requires it to return something richer than a scalar — the smallest form that works is for the boundary function to keep returning a radius but to be evaluated against a *shifted* polar frame, i.e. the offset is applied where `view.at()` is called in `traceBoundary` rather than inside the noise.

The physical reading, which is what makes it a real statement rather than a hack: **a fragment's mass is not centred on its bounding circle.** A chip of rock is fat at one end and tapers at the other, and the reason a real asteroid photograph reads as a potato is that its long axis does not pass through the middle of the frame.

**This composes with what is already there, and it must.** `boundaryShare` already makes the interior wear the shell's curve; the offset has to be shared the same way or the mosaic will slide out of the crust on one side — the exact failure D180 fixed, arriving on a new axis. The offset therefore travels with the shared shape, not per layer.

### Two more statements that should land in the same pass

- **Elongation.** A fragment is not equant. A per-body aspect ratio (1.0–1.6) applied along a rolled axis, before the noise, is cheap and is most of what makes a silhouette read as "broken off something" rather than "a small planet". Like the offset, it must be shared between the two boundaries.
- **Lower the terrain's share.** The review is explicit that terrain is the wrong tool here — *"the actual outer shell layer has to be irregular/blob like dramatically and the terrain system... would mostly create some cosmetic terrain on said blob's surface."* Once the shell boundary is doing the work, `relief: 0.115` is competing with it and should come down (0.05–0.07 is the guess; judge it on screen). The craters stay: those are genuinely cosmetic surface marks and they are correct.

### Watch for

The dust film follows the combined excursion and Session T records it *"throwing detached lobes clear of the body"* when the excursion got too large. An eccentric centre is a larger excursion by a different route. **If §3 cuts the film (it does), this risk disappears with it** — which is a good reason to do §3 first.

---

## §2 — THE MOSAIC CELLS: stop the shine, start the rock

> *"The voronoi interior is too shiny due to the gradients that cells have. Remove the shading of the voronoi cells and implement a noise texture (monochrome gaussian, 30%, maybe even mixed with perlin noise texture too to make the cells look rocky.)"*

### There are two sources of shine, not one

Worth stating before anything is deleted, because removing one and not the other will look like the change did nothing:

1. **The per-cell linear gradient** — `mosaic.js` builds a `createLinearGradient` per cell with stops at `m.lit` / `m.body` / `m.shadow`. This is the one the review names.
2. **The `glint` sheen pass** — a *second* gradient over the top on cells where `s.shine > 0.62`. Session T's own notes call it *"the sheen"* and record it being rewritten once already, from a stroked arc to a gradient, because the arc read as *"fingernail clippings stuck to the rock."*

**Both go.** A material described entirely by continuous fields is a polished material — mosaic.js's own grit comment already works this out and then only half-acts on it.

### What replaces them

Flat cell fill from the material fan, plus **noise texture per cell**. The review's spec is *"monochrome gaussian, 30%, maybe even mixed with perlin"* and that is exactly right in structure: two registers, one fine and stochastic, one coarse and coherent.

- **The gaussian/grain register** is per-pixel monochrome noise at low opacity. The existing `grit` pass is a crude version of this already — deterministic hashed dots in two tiers — and is the natural thing to develop rather than replace. Turn the count up, the size down, and the opacity down.
- **The perlin register** is coherent value noise across the cell, giving each fragment mottling at a scale you can see — the difference between "grainy" and "rocky". `simplex-noise` is already vendored and approved, and `CC.RNG` has value noise from v2. This is what makes a large cell at high Cohesion still read as stone instead of as a flat polygon with dust on it.
- **Keep a flat value step per cell.** Without the gradient, cells adjacent in the material fan can read as one region. A cell's *own* value should vary slightly from its neighbours — which the fan already does; just verify it still separates once the gradient is gone.

### Do NOT give cells back their light direction

The shared light vector was the answer to *"a field of independently shaded pebbles"* and it is being retired along with the shading, not preserved. An asteroid interior in cutaway is a **cut face**, not a lit surface — nothing in a cross-section of rock is catching the sun. This is the honest reading and it is why the shine looked wrong: the picture was claiming a light source that a cutaway does not have.

### Performance note

Per-pixel noise over 40–200 cells is the most expensive thing anyone has proposed for this renderer. Options, cheapest first: pre-render one noise tile to an offscreen canvas at init and re-use it clipped per cell with a random offset (strongly preferred); or draw noise as stochastic dots as `grit` already does; or `putImageData` per cell (do not — it will not survive the export resolutions). **Resolution independence is load-bearing here** — a noise tile scaled with `view.px` keeps counts resolution-independent; a per-device-pixel noise field does not.

---

## §3 — DELETIONS

Three things go and none of them are replaced.

### The dust film

> *"Frosting/deposition doesn't look good on this, should be cut from asteroids, your initial instinct was right about this one."*

Delete `DUST` from `solid-asteroid.js` and the `film` reference on the shell. Session T's reasoning for adding it was sound in the abstract — give the silhouette an outside — and the render disagreed. The phase doc's original instinct is restored.

**This unblocks §1.** The film is what threw detached lobes when the excursion grew, so cutting it removes the constraint that capped the silhouette's shape.

### Mineral veins

> *"Remove entirely, in an asteroid some voronoi cells are the mineral deposits."*

Correct, and it is the general principle this family should follow: **the mosaic is the composition system.** A vein is a mark for a *continuous* medium that something flowed through. An aggregate of welded fragments has no such medium — the ore is *in* particular fragments. Remove `"interior"` from the trait's anchor list (`js/data/traits/solid.js:28`); the trait stays fully alive on planets and moons.

### Metal-rich and ice-rich

> *"Generally these are meant to be determined by the base asteroid itself... I'm not sure whats the use or application of these traits."*

Same principle, one step further. Both are **composition claims**, and composition on this body is already decided by the mosaic's material fan, the palette hue and the stats card that reads them back. A trait that restates what the base generation already says is a second source of truth for one fact, and the two will drift.

- `metal-rich` — drop `"interior"` from its anchor list. On this body, "metal-rich" is a *hue and value position* on the material fan plus the metallic glints that are already standard equipment.
- `ice-rich` — delete outright from `solid-asteroid.js`. If an icy asteroid should be reachable, it should be reachable by the same route: a cold palette, a brighter fan, and void cells that are *filled* pale instead of left empty. `voidFill` already exists in `mosaic.js` for precisely this and is currently always null. **That is the ice mechanism**, and it is a material property, not a scatter of blobs.

> **The rule this establishes, and it should be quoted in PROGRESS.md:** on an aggregate body, *what it is made of* belongs to the mosaic, not to the trait pool. Traits describe what **happened** to the body, not what it **is**.

---

## §4 — HOLLOWED OUT: retire it, replace it with structure

> *"Hollowed out trait is totally busted; just some random wedges extending from the center that paint over the voronoi. Needs a total rethink."*

The diagnosis is mechanical and complete. `HOLLOWED_OUT` uses `element: "wedge"`, and `wedge` in `js/draw/primitives.js` is an **annular sector** — a pie slice between two radii. It was built for ice caps and impact basins, where a sector of a *band* is the right shape. Pointed at a layer that is 86% of the radius, a sector of that layer is a slice of the whole body radiating from the centre. There is no tuning that makes a pie slice read as an excavated chamber.

**Retire the trait.** The review says so and it is right: *"the tunnels/chambers and support walls/interior terrain would be the way to depict interior tunnels or cavities inside the asteroid, essentially retiring this trait entirely."* What replaces it is §7, which is a better version of the same idea and is not a trait at all.

---

## §5 — THE TRAITS THAT ARE ON THE OUTSIDE

### Mining station: a square, not a capsule

> *"I think those should be a square shape object instead of the capsule thing."*

`capsule` is the gas-miner's pressure hull, reused on the argument that *"a pressure hull is a pressure hull wherever it is bolted."* The review disagrees, and the reasoning that beats it is about **what the shape says about gravity**: a capsule is an aerodynamic/pressure form, and a surface installation on a body with 0.001 g is a *frame* — boxes, trusses, landing pads. Nothing here is fighting pressure from outside or wind from any direction. Rectangular is the honest form.

`plate` (rectangle, rotatable) is already in the primitive table as a planned P9 primitive. **Build it here.** It is wanted for machine worlds anyway, and a mining station is the smallest useful first customer.

### Tunnel borer: a new trait, and a good one

> *"The capsules do give me the idea of tunnel boring machines, so perhaps a new trait based on those that use a cylinder with two spiky triangles on one end and a tunnel trail behind the cylinder as the tunnel borer dives into the interior of the asteroid."*

This is the strongest new idea in the review and it should be built. Why it works where `hollowed-out` failed:

- **It has a direction.** Every other mark on this body is a region or a scatter. A borer is a vector — it entered *there* and is *now* here, with its own history drawn behind it. Nothing else in the picture does that.
- **It crosses the shell/interior boundary**, which is exactly what `reach: "spanning"` exists for, and it makes a visual argument that the two layers are one body.
- **It is unambiguously artificial** in a picture where everything else is geology, without needing a caption.

Sketch: `element: "borer"`, a new primitive — a rectangle or capsule body, a cutter head of 2–3 triangles at the leading end, and a trail behind it drawn as a narrow parallel-sided tunnel back to the surface. `repeat: [1, 3]`, `reach: "spanning"`, `depth` running from the shell inward. The trail is the mark that carries it at small sizes; the machine itself can be a dozen pixels.

**The tunnel trail should be drawn in the same vocabulary as §7's tunnels**, so a borer that reaches an existing chamber network reads as connected rather than as two separate features that happen to touch.

### Ore deposits: keep, possibly rename

> *"I like how it looks on the shell layer, but perhaps it could be something else than what its called right now."*

Working as intended; leave the mechanism alone. The name is the only question — on a shell these are surface mineralisation rather than a mineable deposit. Candidates: **Mineralised Crust**, **Surface Deposits**, **Exposed Ore**. A label edit, nothing more. Note this is the *only* trait in the whole review that the user says looks good — do not touch its numbers.

---

## §6 — THE DEAD TRAITS: one word each

> *"Common to all above traits is that none of them are visible at the moment."*

They are not invisible. **They are not placed at all**, and the cause is the same for every one of them:

| Trait | Declared anchor | Roles the asteroid has |
|---|---|---|
| `void-pockets` | `"crust"` | `outer-shell`, `interior` |
| `magma-chambers` | `"mantle"` | `outer-shell`, `interior` |
| `cratered` | `"crust"` | `outer-shell`, `interior` |
| `impact-basin` | `"crust"` | `outer-shell`, `interior` |

`anchorLayer` in `js/gen/traitroll.js` returns null when no named role is present, and the trait places nothing — **silently**. The trait rolls, the card may even list it, and the picture never shows it.

This is D77 exactly (*"`anchor` may be a list, and a role may not exist on every archetype in a family"*), and Session T applied the fix to three traits and missed four. The asteroid's own trait file even records having done it: *"What they needed was an anchor that resolves on a body with no crust and no mantle, which is a one-word edit."* Correct, and incompletely applied.

### What each one should do

- **`cratered` → add `"outer-shell"`.** Trivially correct; it is surface damage and the shell is the surface. Note it must then not double up with the shell's *own* `craters: { count: 11 }` field — either the trait raises that count or it adds a second, larger tier. Prefer the former: one crater mechanism, one place.
- **`impact-basin` → add `"outer-shell"`.** Also correct, and on a body this small the "one hit that nearly finished it" reading is stronger than on a moon. `wedge` is genuinely right here — a sector of a thin band *is* a basin.
- **`void-pockets` → do NOT re-anchor. Fold into the mosaic.** The review's instinct is right: *"the idea behind the trait could be added to the new structure as additional void pockets inside the voronoi field."* The mosaic already produces voids as a Cohesion function. A trait that adds voids by a second route is the Cohesion coupling problem the asteroid's own trait file warns about. If wanted, express it as a **bias on `voidChance`**, not as a scatter of blobs.
- **`magma-chambers` → cut from this family outright.** The review asks the right question — *"umm... magma in an asteroid? Is that a real thing?"* Answer: only during the first few million years, in bodies large enough to have differentiated, which is precisely the body this archetype's own comments say it is not (*"a core is a body that got hot enough to differentiate, and one that did is a planet's leftovers rather than an asteroid"*). The trait would contradict the body's own structural argument. Leave it unanchored and therefore ineligible — but **make that deliberate and documented**, rather than accidental as it is now.

> **A general fix worth doing while here.** A trait whose anchor resolves to nothing should be **dropped from the trait list before the card is written**, or better, be a startup-time check — "this trait is eligible on this archetype but its anchor resolves on no layer" is mechanically true-or-false and generic over `CC.Archetypes.ids()`, which is exactly the bar `CLAUDE.md` sets for a test that earns its place. **This is the one place in this overhaul where a test is justified**, and it would have caught all four of these.

---

## §7 — THE INTERIOR STRUCTURE: the big idea

> *"I wonder if the interior space of the asteroid could be more interesting with a mix of support walls, tunnels/chambers and voronoi cells being sort of the 'region' where the former two occur to create a more interesting interior — even with optional exits that reach even outside into space."*

### REVISED AFTER U1 — the user's design, which supersedes the sketch below where they differ

After seeing U1 the user described what they actually want, and it is more specific than this section's original sketch:

> *"Draw a bunch of squiggly thick lines of varying thicknesses that criss-cross randomly within the asteroid, some even breaking the surface as exposed entrances into the inside cave/tunnel, while there also being clusters of circles that depict chambers that may or may not occasionally line up on top or beside a tunnel or just somewhere in the asteroid interior as a closed pocket."*

**Decisions already made — do not reopen:**

- **Natural caves first, artificial at the top of the range.** One asteroid-only slider beside Cohesion. The low and middle range is **natural caves**: squiggly tunnels of *varying* thickness, criss-crossing, and clusters of overlapping circles as chambers — sometimes on or beside a tunnel, sometimes a closed pocket on their own. The upper range adds the **artificial** vocabulary on top: constant-width, straighter bores (a bore does not taper; a crack and a cave do), more regular chambers, more exits. Name the slider for what it spans (e.g. "Caverns" with a label that reads naturally at both ends); 0 is untouched rock. The `hollowed-out` reading is a position near the top.
- **The mosaic's dark cells stay as they are.** They are the gaps between rubble, Cohesion owns them, and the card reads them for density. Since U1 (D192) they are drawn as dark textured recesses, not black cutouts. Caves are a *different* thing — smooth cavities cut THROUGH the fragments — and both coexist.
- **Smoothing the void cells' edges was considered and rejected.**

**How it should be drawn (from the U1 discussion):**

- **Two passes, so the cave system merges.** All tunnels and chambers drawn slightly fat in a wall tone first, then all cavity fills over the top. Overlapping tunnels and chambers then read as one cave system with a single smooth wall and no internal seams where they cross. Cells under a cavity's edge are cut partway, which is what reads as carved rather than pasted (the "sticker" warning below still applies — do not give the cavity its own unrelated colour).
- **Cavity colour follows D192's recess treatment** — dark, desaturated, the fan's stone-leaned hue, textured, deepening toward the walls — so a cave and a rubble void are the same kind of darkness at different scales, and neither is pitch black.
- **Reuse the ribbon** (`ribbon` / the lode geometry in `draw/primitives.js`) for varying-thickness tunnels; random walks laid out in warped space via `CC.Form` (as `mosaicSites` does), so tunnels follow the blob.
- **Exits** are tunnels that run past the silhouette: drawn after the shell, clipped to the body's outline, so they show as mouths opening to space and cut the crust.
- **Cohesion caps it.** A rubble pile cannot hold open caverns: low Cohesion means fewer, shorter, smaller caves (or none). Judge the exact coupling on screen.
- **The card measures it** (stats measure the render): tunnel and chamber area counts into the void figure and density, numerically sampled from the same geometry that is drawn.
- **Wire it like Cohesion**: control in `index.html` with a tooltip (the domtest checks tooltip coverage), settings-string round-trip, Randomize, presets. Give the Hollowed Rock preset its chamber back. Support pillars remain optional and deferrable.

This is the most ambitious item in the review and the one most worth building. It is also the one that most needs to be **a zone-like structural system rather than a trait**, per the project's standing preference for parameter-driven primitives over hand-specified exceptions.

### The concept

The mosaic stops being the whole interior and becomes **the ground the interior is built in**. Over it:

- **Chambers** — excavated volumes. Smooth-walled and *regular* where everything around them is angular, which is what says "made" rather than "happened". Crucially they are drawn **in the mosaic's own coordinate space** — a chamber that consumes whole cells and leaves partial ones at its edge reads as excavated; a shape painted over the field reads as a sticker. This is the single most important detail in §7 and it is where `hollowed-out` failed.
- **Tunnels** — narrow constant-width connections between chambers, and between chambers and the surface. A tunnel differs from a fracture in exactly one way that matters: **constant width**. A crack tapers; a bore does not. That is enough for the eye.
- **Support walls / pillars** — what is left *un*-excavated. Reading a chamber as supported rather than merely empty is what makes it a habitat instead of a hole, and it is cheap: leave columns of mosaic standing inside the chamber outline.
- **Exits** — tunnels that reach the silhouette. The review asks for these and they matter more than their size suggests: an exit is what connects the interior story to the exterior one, and it is the mark that makes a station on the surface (§5) and a chamber in the middle obviously the same installation.

### How it should be parameterised

**As an axis, not a trait.** The pattern is Cohesion's and the argument is the same one `PARAMETERS.md` makes: a trait that would need to exclude its own siblings is an axis in disguise. Proposed: **Excavation**, 0–100%, asteroid-only, appearing beside Cohesion.

| Excavation | Picture |
|---|---|
| 0 | Untouched rock. The mosaic as it is today. Nobody has been here. |
| ~25 | A borer or two, a short tunnel, one small chamber. Prospecting. |
| ~55 | A chamber network with tunnels and surface exits. A working mine. |
| 100 | The body is substantially hollow: large chambers, pillars holding the roof, multiple exits. Somebody lives here. |

This makes the review's retired `hollowed-out` reachable as a *position on a dial* rather than as a binary, which is the same upgrade `rubble-pile`/`void-riddled` got when they became Cohesion — and it makes the *middle* of the range reachable, which is where the interesting output usually is.

**Cohesion and Excavation interact, and should.** You cannot tunnel through a rubble pile — a low-Cohesion body should cap how much Excavation is expressible, or express it as shoring and bracing rather than as open chambers. Judge this on screen rather than legislating it here.

### Scope warning

This is the largest item in the document and it is the one that could eat a session on its own. If the implementing session is running out of room, **build §7 as chambers + tunnels + exits and defer support pillars.** Pillars are a refinement of a chamber; chambers are the feature.

---

## §8 — BRITTLENESS, AND WHAT REPLACES INTERIOR HEAT

> *"While asteroids do not have a concept of internal heat, I think we can give a new more fitting system of radioactivity that determines how radioactive the inside materials are."*

> *"Currently I don't see/feel the 'brittleness' factor of an asteroid as I flip through them."*

### Radioactivity

Worth doing, with one caution. Interior heat is currently consumed at `retainsHeat: 0.12` and `heatLean: { amount: 0.20 }` — deliberately weak, on the honest argument that a small body keeps no heat. The result is a near-dead control on this family, and **a dial that does nothing is a defect** by this project's own standard.

Relabelling it per-archetype is the established pattern — `PARAMETERS.md` documents Tidal locking relabelling to "Binary companion" on stars, via the archetype's own declaration, *"the label and tooltip come from the archetype's own `axes` declaration."* Radioactivity is the same move: **one quantity, a different name and different consumers per family.**

What it should drive, in rough order of value:

- **Hue and value on a subset of the material fan.** Not the whole interior — the point is that *some* cells are hot. A couple of cells leaning toward a sickly yellow-green or a cold blue-white, against an otherwise neutral fan.
- **A faint glow or halo on those cells only**, at the top of the range. This is the mark that makes it read as radioactive rather than as merely differently coloured, and it is the family's one honest use of an emissive treatment.
- **The stats card and hazard pool.** `docs/HAZARDS.md` already has a radiation hazard; this is a straightforward consumer.

**Do not make it a second Cohesion.** Radioactivity is a *composition* claim and belongs in the material fan; it must not start moving cell counts, void fractions or structure, or it will fight the two axes that already own those.

### Brittleness — and the recommendation is to NOT add a third slider

The review asks for brittleness to be *felt* and is explicitly unsure how: *"maybe porousness, maybe crack marks, maybe the texture on the shell or the voronoi cells."*

**Cohesion is already the brittleness axis.** It is documented as driving *"Voronoi cell count and size, void frequency and outer-shell integrity"* — that last clause is brittleness, and it is the part that was never built. The shell is currently identical at Cohesion 0 and Cohesion 100.

So: **make Cohesion finish its own job** rather than adding a fourth control.

- **Shell fracture density and width scale with (1 − Cohesion).** The shell's `vein` recipe already exists at `count: [22, 64]`; drive it, and let low-Cohesion cracks get long enough to run right through the band.
- **Shell thickness varies with angle at low Cohesion** — a rubble pile's crust is a discontinuous crust. `thinAt` already exists in the zone system for exactly "how many of the layer's own elements survive here".
- **Shell *gaps* at the bottom of the range.** At Cohesion 0 the spec calls for *"a barely-there outer shell"* — sectors where there is no hardened crust at all and the mosaic reaches the silhouette. This is the strongest single mark for brittleness and it is a structural statement rather than a texture one, which is why it will read across the room.
- **Cell edge roughness in the mosaic.** Once §2's noise texture exists, a low-Cohesion body's cells can carry a rougher, more granular texture than a monolith's — brittle rock looks different up close, not just in the large.

> **Why not a Brittleness slider:** it would need to exclude Cohesion's extremes to stay coherent (a highly cohesive monolith that is also extremely brittle is not a picture, it is a contradiction), and a control that must exclude another control is the same smell `PARAMETERS.md` identifies in a trait that must exclude its sibling.

---

## §9 — THE OPEN QUESTION: one interior layer or two?

> *"Part of me wonders if a single layer for the shell is sufficient or should there be another layer at the core or near the surface, like a 'hard layer' and a 'soft layer', either for realism or for aesthetics?"*

**The recommendation is: no third layer, and here is the argument against, along with the one case that would change it.**

Against:

- **The spec's "no core" reasoning survives intact**, and it is the archetype's strongest structural claim: *"a core is a body that got hot enough to differentiate, and one that did is a planet's leftovers rather than an asteroid. Drawing a small core here would make every asteroid read as a tiny planet."* That argument does not weaken just because the new layer would be called something else.
- **The mosaic is 86% of the radius and that is the whole appeal.** Every band added takes area from it.
- **The layer budget is already tight.** D176 records the shell rolling as thin as 0.0417 and needing the interior's range lowered to clear D5's legible-band bar. A third band competes for the same room and would re-open a fight that was expensive to win.
- **§7 gives the interior internal structure anyway** — without it being concentric. Chambers, tunnels and pillars are depth variation of a much more interesting kind than another ring.

The case that would change it: **if the mosaic at high Cohesion still reads flat after §2**, the fix is a *radial gradient in the material fan* — deeper cells drawn from the darker/denser end of the fan — rather than a second layer. That gets "denser toward the middle" without a boundary and without taking any area from the mosaic. **Try that first**; it is a few lines in `mosaicFill` and it is reversible.

---

## RECOMMENDED SESSION SPLIT

There is more here than one session should take, and the dependency between §1 and everything visual is real. Two sessions:

### Session U1 — the body

§3 (deletions, unblocks §1) → §1 (blob silhouette + elongation, lower relief) → §2 (flat cells + noise texture) → §8's brittleness half (Cohesion finishes its job).

Rationale: this is everything that changes **what the rock looks like**, and every later judgement is made against it. Tuning traits against a body about to change underneath them is the trap `PHASE-6-POLISH-3-TRAITS.md` names as the one *"this project has walked into more than any other."*

### Session U2 — what is on and in the rock

§6 (dead anchors + the eligibility check) → §5 (plate primitive, mining station, tunnel borer) → §7 (chambers, tunnels, exits, Excavation axis) → §8's radioactivity half → §4/§9 verification.

**§6 first in U2 and it should take twenty minutes.** Four one-word edits and a mechanical check, and it makes four authored traits visible for the first time. Anything that cheap, that has been broken that long, goes first.

---

## WHAT IS NOT IN SCOPE

Recorded so the implementing session does not reopen them:

- **The Voronoi mosaic itself.** The one thing the review praises. Its geometry, lattice, jitter and Cohesion coupling are signed off.
- **The two-layer stack's figures** (`outer-shell` 0.960–1.000, `interior` 0.862–0.905) except as §1 requires. D175/D176 measured these against 480 bodies and the margins are thin; do not adjust them casually, and if §1 forces a change, **re-measure rather than re-reason**.
- **The stats card and the gravity model.** D177's real-physics gravity is working and the card asks the right questions.
- **Ore deposits' numbers.** The only mark the review says looks good.
- **The seam/inset mechanism.** It is what makes the cells read as separate pieces and it survives §2 untouched — the seam is not shading.
