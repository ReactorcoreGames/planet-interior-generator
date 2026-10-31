# Session AD — Phase 9b, the gas and ice giant megastructures

*D296–D297. The second of 9b's per-family sessions (plan: [session-ab-megastructures.md](session-ab-megastructures.md), D289–D290; the planet's three traits: [session-ac-planet-megastructures.md](session-ac-planet-megastructures.md)). One built trait on the gas giant and the ice giant: skyhook platforms and orbital cities, rendered for the user and iterated until approved.*

Scratch tools (in `test/_tmp/`, gitignored): `_adbase.mjs` renders a 2×N sheet of `archetype:traits:seed` specs at 800×450, `_adcrop.mjs` one body at 1920×1080 with an optional crop, `_adlayers.mjs` prints a giant's layer radii, `_adflav.mjs` collects the card lines the trait guards. During iteration a `DESIGN` environment variable forced one city design through a debug override in the builder; the override was removed on approval, so the two render scripts now take whatever the seed rolls.

---

## D296 — skyhooks and orbital cities, one trait

**Gate.** Both giants already carry `gaseous`, which is the fact that matters: a body with no ground. No new tag was needed. The trait is `skyhook-cities` ("Skyhooks & Orbital Cities"), in its own file, js/data/traits/giant-built.js, because gaseous.js was already 700 lines; the builder is js/gen/giantbuilt.js and the drawing js/draw/primitives/giant-built.js. The drawing reuses the planet ring's local-frame shapes, which js/draw/primitives/orbital-built.js now publishes as `CC.OrbitShapes`.

**One element, because the city is what the hook hangs from.** Every skyhook is a platform on one low orbit with a tether dropping into the cloud deck and a scoop on the end; on the hooks nearest the sides of the frame the tether climbs on past the platform to a city, and the rest end in a counterweight. The planet's elevators stand on the crust and hold a ring up; the giant's hang from orbit and lift gas, and a city sits on a hook's line by construction. Detail density does not change it (`density {1, 1}`).

**What a skyhook draws**, lowest first: a funnel scoop hung mouth-down under the cloud tops (`opts.ground` less 0.010–0.030), its lip lit by what it draws in and a faint glow round it; a tether, dark-edged with a lit core, with 1–3 gas pods climbing it; the platform, a deck along the orbit with a winch house on its outer face, a collar under it, a radiator fin at each end, a row of windows and a red light; and over a hook with no city, a counterweight. Metal is `hullFill`'s grey, lights warm white, as on the planet's ring.

**Ordered, as AC taught** (D294): every platform on one orbit, evenly spaced, all one size. Altitude `depthAbove [0.08, 0.11]`, about 1.11–1.17 radii, just over the skimmers (whose capsules top out near 1.10), so the skimmers did not need lowering; low enough that a counterweight over the top of the giant stays inside the frame's height (about 1.25 radii on a giant at the default Body size).

**The cities.** Placed on the hooks closest to the sides, where `r·|cos a| + size` stays under 1.18; evenly spaced hooks always put one within 30° of a side, so every body gets at least one. One design per body, rolled one in three:

- **wheel** — a broad habitat ring and a narrow one inside it, 3–4 spokes with lift cars to a hub, rows of lit windows, all on a keel that does not turn, the tether arriving at its foot
- **pair** — two cylinders lying along the orbit, each with a lit land strip and a glazed strip down its length, rings round it and capped ends, joined by a frame and a spine
- **spire** — a spine along the radial through 3–5 saucer decks seen edge-on, low blocks standing on each deck, a mast on top

Each leaves the story open (D290): a city, a refinery, an ark, a prison.

**The iterations.**

1. First render: everything far too small — cities about 0.10 radii read as little combs. Cities doubled, skyhook parts scaled 1.4–1.5×.
2. At the larger size the spire read as a fishbone at the side bearings, where its radial axis lies horizontal, so it was swapped for the pair; the first wheel, with eight spokes and pods on the rim, read as a ship's helm and was rebuilt with 3–4 spokes, an inner ring, no rim pods and visible windows.
3. **The user: "the scale of skyhooks and cities seem absurdly big given this is supposed to be a gas giant"** — smaller units, more of them. Skyhooks about 30% smaller (platform 0.052–0.066 long), 3–11 of them; cities about 70% smaller (half-size 0.050–0.068), on a lower orbit (1.36–1.48 rather than 1.50–1.62, so more hooks have room for one), 1–4 of them. **The spire was restored** as the third design: "I think it actually looks really cool."
4. **Approved**, with the city cap raised to five: 1–5. A giant with few hooks still gets only as many as fit.

## D297 — built marks draw over natural ones in orbit

The first full render with the ring system put a city on the far half under the ring bands, and the translucent bands washed it out to a ghost. The orbit pass drew elements in trait order. Now every placed element carries `built`, stamped in `placeOne` (js/gen/traitroll.js) from its trait's `artificial` tag, and `drawOutward` (js/draw/zonepaint.js) draws each half's natural material first and anything built after it, order kept within each group. A ring band is a haze and a station is metal; the same fix lifts the planet's ring, network and minefield over their ring bands, with no other change to how they look (checked on a sheet).

## Card and flavour

The card's trait list picks the label up by itself. The giants' pools (js/data/flavour/gaseous.js) gained one line each in Biggest danger, Notable, Resources and Approach, guarded by the trait and leaving the story open: a snapped skyhook falls for hours and not alone; cities fishing the atmosphere, whoever lives in them; whatever the skyhooks lift; dock at a city, not a platform. All four were seen on cards across 240 giants.

## Files

- js/data/traits/giant-built.js — the declaration
- js/gen/giantbuilt.js — the builder `skyhooks`
- js/draw/primitives/giant-built.js — the skyhooks and the three city designs (424 lines)
- js/draw/primitives/orbital-built.js — publishes `CC.OrbitShapes`
- js/gen/traitroll.js — `built` stamped in `placeOne` (the file was already over 500 lines; not split here)
- js/draw/zonepaint.js — natural before built in `drawOutward`
- index.html — three script tags after their planet counterparts
- docs: MACHINE-WORLDS.md § For gas giants and ice giants, gaseous-bodies.md (the Artificial line, the ice giant's eligible list), TRAIT-SYSTEM.md (D297)

## Carried forward

- **Scale for the body's size.** Something drawn at a size that reads on a planet is absurd round a giant. A built mark on a big body is smaller and more numerous; the stars will be the sharpest case.
- **A shape tied to the radial changes reading with bearing.** The spire is a tower at the top and a fishbone at the sides; the user liked it anyway, but a new primitive should be looked at at both.
- **Built over natural** now holds for every trait in the orbit pass (D297); the stars' layers should be checked against it.

## The prompt for Session AE

> Phase 9b, Session AE: the star megastructures. Read CLAUDE.md, docs/PROGRESS.md, docs/progress/session-ab-megastructures.md (the plan, D289–D290), docs/progress/session-ac-planet-megastructures.md and docs/progress/session-ad-giant-megastructures.md (D291–D297: how the planet's and the giants' built traits were done, the user's review of each, and what carries forward — especially scale for the body's size and built over natural), docs/progress/checklist.md § Phase 9b, docs/TRAIT-SYSTEM.md for the grammar, docs/celestials/stars.md, and the code to reuse: js/data/traits/stellar-built.js (`stellar-collector` and `orbital-mirrors`, placed with `depthAbove`), js/data/traits/orbital-built.js, js/gen/orbitalbuilt.js and js/gen/giantbuilt.js (one element per trait, rolled by its builder), js/draw/primitives/orbital-built.js (`CC.OrbitShapes`) and giant-built.js. Next free decision number: D298. Continue in a new session log, docs/progress/session-ae-star-megastructures.md, added to docs/progress/README.md.
>
> Build four layers round the stars, lowest first, rendering each for me to look at and iterating until I approve before the next: (1) re-check the existing stellar collectors and orbital mirrors as the two lowest layers, collectors under mirrors, with room above them in frame (D127); (2) a **Dyson shell**: a mesh round the star, above the mirrors — with a shell present the collectors can read as control rods and the mirrors as its internal adjustment mirrors, so keep both legible through it; (3) a **Dyson swarm / stellar colonies**: many small horizontal stone slabs with tiny docking ports, colonies or stations inside, above the shell. Each on the star archetypes that have `stellar-collector` today, by their tags (a new one named for the physical fact if needed). They must sit with the star's corona, prominences and flare marks and stay in frame. Remember from AC and AD: draw every part at every size with body-space counts (the zoom op-count check), keep built marks ordered rather than scattered, size them for the body (AD's first cities were absurd round a giant), check a radial shape at the top and at the sides, and put new traits in their own file. Rules as ever: plain scripts, ≤500 lines per file, no ES modules, no new tests unless asked, render for me rather than asserting it looks good, draw the thing, not an annotation of it. End by updating the spec (stars.md, MACHINE-WORLDS.md § For stars), the checklist and PROGRESS.md, flavour lines for the stars' pools, and writing the prompt for Session AF (the nebula).
