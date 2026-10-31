# Session AE — Phase 9b, the star megastructures

*D298–D301. The third of 9b's per-family sessions (plan: [session-ab-megastructures.md](session-ab-megastructures.md), D289–D290; the planet's traits: [session-ac-planet-megastructures.md](session-ac-planet-megastructures.md); the giants': [session-ad-giant-megastructures.md](session-ad-giant-megastructures.md)). Four built layers round the stars, lowest first: the existing stellar collectors and orbital mirrors re-checked and restacked, then a Dyson shell and a Dyson swarm of stellar colonies, each rendered for the user and iterated until approved before the next.*

Scratch tools (in `test/_tmp/`, gitignored): `_aebase.mjs` renders a 2×N sheet of `archetype:traits:seed` specs at 800×450, `_aecrop.mjs` one body at 1920×1080 with an optional crop, `_aezoom.mjs` one body at 1200×800 through the app's zoom and pan, `_aelayers.mjs` prints a star's layer radii, `_aeext.mjs` the spread of halo edges over 40 seeds per archetype, `_aeelig.mjs` which archetypes can roll the built star traits, `_aeflav.mjs` collects the card lines the new traits guard. During the swarm's iteration a `TURN` environment variable forced an orientation through a debug override in the primitive; the override and the two rejected orientations were removed on approval.

---

## The measurement that shaped the session

The frame holds a full circle only to about 1.28 body radii at the default Body size (the view's radius is 0.78 of the shorter side over two). A star's halo — corona or shed envelope, `body.extent` — reaches, over 40 seeds each:

| Archetype | Lowest | Median | Highest |
|---|---|---|---|
| dwarf-star | 1.06 | 1.10 | 1.15 |
| main-star | 1.14 | 1.20 | 1.25 |
| young-star | 1.20 | 1.28 | 1.34 |
| old-giant-star | 1.19 | 1.34 | 1.44 |

On a young star or a giant the halo alone fills the frame's height, so four layers stacked "above the halo" would put the shell and the swarm off the top on half the stars. Before this session the collectors sat at the halo's top (`depthAbove −0.03…−0.02`) and the mirrors at a fixed 1.34–1.62, randomly spaced: off the top and bottom of the frame, and at the sheet's scale a scatter that read as debris, the failure AC's satellites taught (D294).

## D298 — the stack is measured from a capped edge; the mirrors on one orbit

**`edgeCap`**, a new trait field read by `orbitBand` in js/gen/traitroll.js: `depthAbove` is measured from the halo's edge or the cap, whichever is lower. Every built star trait carries `edgeCap: 1.15`. On a dwarf nothing moves; on a star whose halo fills the frame's height the stack sinks into the glow, which leaves room above the mirrors for a shell that is still a whole circle in frame.

**The mirrors are one ordered ring**: 18–34 panels (`repeat`, `density {1, 1}`), evenly spaced with a little jitter, 0.02–0.03 above the capped edge, one tier and `named` so the authored size is the drawn size (0.050–0.058, about what the old scatter's surviving tier drew), all facing the star as before.

**User: "I approve, looks good."**

## D299 — the collectors halfway to the mirrors

On the user's review after the shell and swarm were up: the collectors were too small and slightly too high. Asked for +30% and "about halfway between where the mirrors and the solid surface of the star is".

"Halfway to the mirrors" is a different offset from the halo's edge on every archetype — 0.02 below it on a dwarf, 0.06 on a capped giant — so it is a new field, **`depthFrac`**: a fraction of the way from the surface up to the capped edge plus `depthAbove`'s first figure. The collectors declare `depthAbove [0.025, 0.025]` (the mirrors' orbit) and `depthFrac [0.48, 0.52]`. Size +30% to 0.052–0.065, then the user's own hand to **0.072–0.085**: "I think they're perfect now."

## D300 — the Dyson shell

**What it draws.** The cut edge of a lattice sphere: in a cutaway a sphere is a ring, so the shell is a band of geodesic mesh — three rows of near-equilateral triangles between four rails, each rail offset half a cell from the last. Grey plates fill 25–70% of the triangles (one roll per body), laid in runs because a shell is panelled outward from its frames; the corona shows through the open cells. The innermost rail is lit by the star; heavy ribs every 10–16 cells stand proud of both faces; a few warm lights at the nodes. Metal is `hullFill`'s grey.

**Where.** `depthAbove [0.085, 0.09]` above the capped edge, so at most about 1.24 radii (1.27 with the ribs): a whole circle inside the frame on all four archetypes, just over the mirrors. The collectors and mirrors stay legible inside it — under a shell they can read as its control rods and adjustment mirrors (D290) — and prominences loop up beneath it.

**The iteration.** The first render was a thin band (0.022–0.028) with two rows of triangles: at the sheet's scale a double circle line, close up the planet ring's truss again, and its dark plates vanished against space. Thickened to 0.036–0.044 with three rows whose cell pitch follows the row height, so the triangles are near-equilateral and the band reads as a geodesic lattice; plates in the hull grey so they show against glow and space alike.

**User: "Approved. Really cool pattern on it, well done."**

**One element**, `dyson-shell` ("Dyson Shell"), rolled by its builder; Detail density does not change it. Every count is body-space (cells from the circumference over a body-space pitch), so the zoom op-count check holds.

## D301 — the Dyson swarm: stone colonies on their own radials

**What it draws.** Many small stone slabs, each with a flat face, a jagged side, a strata line, a row of lit windows — the colony inside — and a small metal docking port with a red light at the outer end or at both. One grey-brown stone per body, lit from the end that faces the star.

**Where.** 3–5 rows, each evenly spaced round the whole circle and staggered half a step against the last, one slab size per row; from 0.24 above the capped edge out to about 0.72 (about 1.39–1.87 radii on a capped star). Kept to the bearings the frame's height shows, as the planet's defence network is: above the shell that is the sides. The first row was at +0.16 and sat against the shell's ribs; the user asked whether it should go, and it did — the shell reads as a clean boundary with dark space round it.

**The orientation, three tries.**

1. **Level in the picture**, the user's "horizontal" taken literally. At the sides a slab points end-on at the star, so each row stacked into vertical columns; it read as a field of objects at every scale. The user liked the shape and the count, but the slabs toward the corners sat at odd diagonals to the star — some colonies "getting their sides roasted more than others".
2. **Turned to the orbit**, flat face to the star like the mirrors' glass. Good close up; in the whole picture each row became a ring of evenly spaced tangent dashes — a dashed orbit line, an annotation (traits are things, not annotations).
3. **On its own radial**, small end to the star. The user asked for the realism angle: a long body in orbit settles with its long axis toward what it orbits (gravity-gradient stabilization, how real satellites hold attitude for free), which also turns only a small end to the star as a heat shield, both long faces edge-on and radiating, and every colony the same exposure. At the sides it is the level slab; in the corners every slab now points at the star. The risk, a sunburst that echoes the corona's radial streaks at sheet scale, was shown to the user; at 1080p each slab reads as a separate object.

**Chosen: on the radial, slabs 1.5× thicker** (depth 0.36–0.48 of length, the user's caveat), then a touch more by the user's own hand. **User: "I approve … I think they're now ok."**

**One element**, `dyson-swarm` ("Dyson Swarm"), rolled by its builder; every part drawn at every size, counts body-space.

## Gate

All four star archetypes already carry `stellar`, which is how `stellar-collector` and `orbital-mirrors` are gated; the shell and the swarm use the same tag, and no other archetype can roll them (checked with `_aeelig.mjs`). No new tag was needed. stars.md had left `stellar-collector` off the dwarf's eligible list, though the dwarf could always roll it; fixed.

## Card and flavour

The card's trait list picks the labels up by itself. The stars' pools (js/data/flavour/stellar.js) gained six lines, each guarded by its trait and leaving the story open (D290): the shell decides how much of the star the system sees and never says why (danger); swarm traffic (danger); a lattice the light comes through (notable); stone slabs hollowed out and turned edge-on to the star (notable); whatever the shell does not let past, and who holds its controls (resources); dock at a colony, never the shell, ports on the dark end (approach). All six were seen on cards across 320 stars.

## Files

- js/data/traits/dyson.js — the two declarations
- js/gen/dyson.js — the builders `dyson-shell`, `dyson-swarm`
- js/draw/primitives/dyson.js — the shell's lattice and the swarm's slabs
- js/data/traits/stellar-built.js — the mirrors on one capped orbit (D298), the collectors by `depthFrac` and their size (D299)
- js/gen/traitroll.js — `edgeCap` and `depthFrac` in `orbitBand` (the file was already over 500 lines; not split here)
- js/data/flavour/stellar.js — six lines
- index.html — three script tags after their giant counterparts
- docs: stars.md (the built stack, the eligible lists), MACHINE-WORLDS.md § For stars, TRAIT-SYSTEM.md (`edgeCap`, `depthFrac`)

## Still open

- **A half-built shell** for the Half-Built Dyson preset. Asked during the shell's review and not answered; the choice is between an unbuilt-gaps roll (1–3 open arcs ending at a rib) and reading "half-built" from the plate coverage alone. Settle it in AG with the presets.

## Carried forward

- **A frame-height cap for stacked layers.** Where a body's own halo already fills the frame, a stack of built layers above it has to sink into the glow rather than leave the frame (`edgeCap`), and a layer between two others is best placed as a fraction (`depthFrac`).
- **Orientation decides the reading at sheet scale.** Even, tangent dashes on one orbit read as a dashed line; marks that cross the orbit read as objects. Check a new orbital mark at the whole-picture scale, not only up close.
- **Believable attitude.** A long built object in orbit points along its radial; the user asked for believability over the literal word "horizontal", and the physics gave the better picture.

## The prompt for Session AF

> Phase 9b, Session AF: the nebula megastructures. Read CLAUDE.md, docs/PROGRESS.md, docs/progress/session-ab-megastructures.md (the plan, D289–D290), docs/progress/session-ac-planet-megastructures.md, session-ad-giant-megastructures.md and session-ae-star-megastructures.md (D291–D301: how the planets', giants' and stars' built traits were done, the user's review of each, and what carries forward — especially scale for the body's size, ordered over scattered, and checking a mark's orientation at the whole-picture scale as well as up close), docs/progress/checklist.md § Phase 9b, docs/TRAIT-SYSTEM.md for the grammar, docs/celestials/diffuse-bodies.md, and the code to reuse: js/data/traits/diffuse.js (the nebula's traits, its `pocket` and `belt` helpers, and its three built traits `hidden-station`, `mining-flotilla`, `derelict-fleet`), js/gen/diffuse-pockets.js (how pockets are placed and stretched), js/data/traits/dyson.js with js/gen/dyson.js and js/draw/primitives/dyson.js (one element rolled by its builder), and js/draw/primitives/orbital-built.js (`CC.OrbitShapes`). Next free decision number: D302. Continue in a new session log, docs/progress/session-af-nebula-megastructures.md, added to docs/progress/README.md.
>
> Build two things, rendering each for me to look at and iterating until I approve before the next: (1) **one ringworld** somewhere in the nebula — a single built trait, one per body, a ring big enough to read as a megastructure at the nebula's scale and open to interpretation (D290), placed so it sits in the gas rather than on top of it, in its own file; (2) the **ice and rock belts** (`ice-belts`, `rock-belts`, natural traits built by `belt()` with `stretch [3, 4.5]`) becoming **round or oval-ish fields on half the rolls**, so a nebula's belts are not always streaks. Remember from AC–AE: draw every part at every size with body-space counts (the zoom op-count check), keep built marks ordered rather than scattered, size them for the body, check a shape at the whole-picture scale as well as up close (AE's dashed-line lesson), and put new traits in their own file (diffuse.js is 289 lines, diffuse-pockets.js 428). Rules as ever: plain scripts, ≤500 lines per file, no ES modules, no new tests unless asked, render for me rather than asserting it looks good, draw the thing, not an annotation of it. End by updating the spec (diffuse-bodies.md, MACHINE-WORLDS.md § For nebulae), the checklist and PROGRESS.md, flavour lines for the nebula's pools, and writing the prompt for Session AG (the black hole's lensing, then 9b closed: the presets — including whether the Dyson shell gets unbuilt gaps for Half-Built Dyson — and the cross-cutting docs).
