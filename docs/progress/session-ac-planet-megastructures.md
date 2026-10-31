# Session AC — Phase 9b, the planet and moon megastructures

*D291–. The first of 9b's per-family sessions (plan: [session-ab-megastructures.md](session-ab-megastructures.md), D289–D290). Three built traits on planets and moons, lowest first: the orbital ring with its space elevators, the orbital defence network, the orbital minefield. Each rendered for the user before the next.*

Scratch tools (in `test/_tmp/`, gitignored): `_acbase.mjs` renders a 2×N sheet of `archetype:traits:seed` specs at 800×450, `_accrop.mjs` one body at 1920×1080 with an optional crop, `_aclayers.mjs` prints a body's layer radii.

---

## D291 — built traits roll at a third of the weight

Asked at the start of the session, as Session AB left it. The user chose the recommended answer: in Randomize, a trait tagged `artificial` is picked at one third the weight of a natural one (`BUILT_WEIGHT` in `select`, js/gen/traitroll.js). Natural is the default reading of a random body and something built is the surprise.

The roll only: an explicit selection from the picker and every preset are untouched. The pick is cumulative-weight; with all weights equal it chooses exactly the index `floor(rng × n)` did, and a pool with nothing natural in it (the machine world) is treated as all-equal, so families with no built traits and the machine world roll exactly as before. **The cost, accepted:** every family with built traits in its pool rolls a different set on an existing seed, and a body saved in localStorage re-rolls its traits on next launch (the store keeps the trait salt, not the set).

## D292 — `rounded`, the gate for the built orbital traits

Planets and moons share `solid-surface` and `solid-interior` with the asteroid, so a new tag was needed, named for the physical fact (orbital.js's convention): `rounded`, a body pulled round by its own gravity. It has an orbit worth building in and a surface to tether to. The planet (solid.js) and the moon (solid-moon.js) carry it; the asteroid does not. The giants are rounded too but do not carry the tag — their version of the idea, skyhooks and orbital cities, is its own trait in Session AD, and a tag is a positive test, so leaving it off is how they are kept out.

The three traits live in their own file, js/data/traits/orbital-built.js, beside orbital.js, with the builders in js/gen/orbitalbuilt.js and the drawing in js/draw/primitives/orbital-built.js.

## D293 — the orbital ring and its space elevators, one element

**What it draws.** A truss band in the plane of the cut, a dim web between two lit rails braced with alternating diagonals, faint running lights on the outer rail; habitat modules straddling it at even spacing, lit windows in rows; small pods (tanks, radiators, docked craft) on either face between them; and 2–6 elevators, each two cables from a squat anchor station on the ground up through a hub module to a counterweight past the ring, with 1–3 climber cars on the way. Metal is `hullFill`'s grey, lights warm white.

**One element, not three traits or three element kinds,** so the elevators always meet the ring at a module: the module count is the elevator count times 3–6, and every elevator sits on a hub. The builder (`orbital-ring`) rolls all of it; Detail density does not change it (`density {1, 1}`).

**In the plane of the cut, not on the ring-system's tilted ellipse.** The natural ring is a soft band on a squashed ellipse; this is a crisp circle, a different mark kind (D76), the way every station the generator draws sits in the plane. draw/zonepaint.js's split at the body's centre line puts the far half behind the planet with no extra code.

**Altitude: 0.10–0.15 body radii above the body's own reach** (`depthAbove`, as the stellar collectors use), so it clears a thick atmosphere and a bare moon alike: 1.10–1.21 radii, under the debris belt (1.28) and the ring system (1.35), and inside the frame's vertical reach at the default Body size (about 1.28).

**The foot stands on the ground, not on 1.0.** `body.surface` is 1.0 by construction but the ground is the top of the outermost layer that is not haze — 0.926 on a planet with a deep atmosphere — and the first render had the foot floating in the air. `placeOne` now hands builders `opts.ground` for an orbit trait, and the foot sinks 0.012 below it: behind the body the crust covers it, in front it stands on the surface.

**User: "Awesome, they look perfect. Approved."**

**A framing caveat recorded, not fixed.** The preview shifts the body left by up to 178 px (`--card-room`) for the info card, so on a typical window its left edge sits near 1.5 body radii and the card covers the right. The minefield (1.70–2.05) lives entirely past that in the preview and shows fully in an export, as the debris belt and the ring system's outer bands already do. Flagged to the user before approval; the fallback is a band of about 1.55–1.85.

**User: "Looks awesome, I like it fully."** Approved as rendered.

## D294 — the orbital defence network

**What it draws.** 2–6 large gun platforms among 14–34 small satellites, in a band 0.27–0.45 body radii above the body's reach (about 1.30–1.50), above the ring and its counterweights. One element (`defence-network`), rolled by its builder; Detail density does not change it.

**The platform is the user's design**: two "4"s merged at the middle, one upside down and flipped horizontally, which is one 4 and its copy turned through 180° about a shared crossbar. In the platform's frame, two parallel barrels run along the radial, one from just past the crossbar out to the far end and the other its mirror toward the world; each 4's diagonal runs from its barrel's long end to the far end of the crossbar, and the triangle it closes is plated and ribbed. The barrels carry a lit flank, six accelerator bands, a muzzle collar at the long end and a breech block at the short end; a red light at each muzzle, warm white on the crossbar's end pods. Every part has its twin through the centre, so nothing says which barrel is the gun or whether the network faces the world or away from it (D290). Each platform is turned up to ±7° off the radial so a set is not stamped from one die.

**The satellite** is a metal box with a lit face and two cyan solar panels on a strut, each panel ruled in three cells, turned up to ±34° off the tangent; below about two pixels it collapses to a cyan dash with a grey centre. The cyan is fixed rather than taken from the world: a solar cell is the one colour in the picture that is a manufactured material, as the hull's grey is.

**Sizes, after the first render.** Platforms were first 0.085–0.12 body radii long and read as small X marks, not large platforms; they are 0.20–0.27 now (about 90–110 px on a 1080p preview), barrels widened to match so the diagonals do not overpower them. Satellites 0.0095–0.013 per side of the box.

**Kept to the bearings the frame shows.** At this height the top and bottom of the orbit lie past the frame's vertical reach (about 1.28 body radii at the default Body size), so the builder only places a mark where its height above or below the centre stays under 1.18 radii — the sides, mostly. Placing round the whole orbit spent half the network off canvas. Platforms keep 0.42 rad apart.

**The user's review: shapes perfect, arrangement not.** Scattered heights and random turns made the satellites read as space junk at a glance, and the platforms looked too massive in the whole picture. Revised:

- **The satellites are a constellation**: one orbit (35–65% of the way up the band), evenly spaced round the whole circle, panels along the orbit, one size and one panel span per body. The ones past the frame's height and the ones within 0.10 rad of a platform are dropped, so the platforms sit in gaps of the constellation rather than among it. 12–34 round the circle, about two thirds in frame — some 6–10 fewer visible than before — and about 7% smaller (0.0088–0.012).
- **Platforms about 15% smaller**: 0.17–0.23 body radii long.

**User: "Perfect, you got it."** Approved as revised.

## D295 — the orbital minefield

**What it draws.** Many small mines, each a dark metal orb lit on one side with four thin spikes twice the orb's length (its diameter) and a knob at each tip; about a third carry a small red light. One element (`minefield`), rolled by its builder.

**Much higher than the platforms**: 0.70–1.00 body radii above the body's reach (about 1.70–2.05), among the ring system's outer bands, where the debris belt also runs.

**Laid, not drifting.** The satellite review (D294) carried straight over: 2–3 rows across the band, each evenly spaced round the whole circle at a 0.11–0.14 pitch and staggered half a step against the last, every mine the same size and turned the same way to its own radial (a "+" or an "x", one per body). Kept to the frame's height like the network, which at this altitude leaves the sides.

**The first render was the audit's failure.** Session AB dropped the spec's minefield because an X is a map symbol for something invisible. The first orbs were 0.005–0.0065 body radii, two pixels on a 1080p preview, so the spikes carried the whole mark and the field read as rows of X's — exactly that. The orbs are now 0.0085–0.010 and the spikes are thinner and in the hull grey rather than the lit tone, so the orb is the body of the mark and the spikes are spikes.

**The DOM test caught a resolution rule this session's primitives broke.** `zoom scales the view and never the element count` failed: all three primitives chose their detail by pixel size — circle segments from the ring's pixel circumference, and a platform, a satellite, a module's windows and a mine each collapsing to a line or a dot below a pixel threshold. Every count is now a body-space figure and every part is drawn at every size; only line widths and light radii floor. The look at preview scale did not change.

**User: "Awesome, they look perfect. Approved."**

**A framing caveat recorded, not fixed.** The preview shifts the body left by up to 178 px (`--card-room`) for the info card, so on a typical window its left edge sits near 1.5 body radii and the card covers the right. The minefield (1.70–2.05) lives entirely past that in the preview and shows fully in an export, as the debris belt and the ring system's outer bands already do. Flagged to the user before approval; the fallback is a band of about 1.55–1.85.

## Card and flavour

The card's trait list picks the labels up by itself. The solid flavour pools (js/data/flavour/solid.js, shared by the planet and the moon) gained a line for each trait in Notable and Approach and one in Biggest danger for the minefield, each guarded by the trait and each leaving the story open (D290): the ring's builders left no record, the platforms point both ways, the minefield is a quarantine or a perimeter and not every mine still answers to anyone. All seven were seen on the card across 120 bodies.

## Files

- js/data/traits/orbital-built.js — the three declarations
- js/gen/orbitalbuilt.js — the builders `orbital-ring`, `defence-network`, `minefield`
- js/draw/primitives/orbital-built.js — the ring and the network; js/draw/primitives/orbital-mines.js — the mines, split off to keep the first under 500 lines
- js/gen/traitroll.js — `BUILT_WEIGHT` in `select`, `groundTop` and `opts.ground` in `placeOne` (the file was already 1,169 lines before this session; it was not split here)
- the `rounded` tag in js/data/archetypes/solid.js and solid-moon.js
- docs: MACHINE-WORLDS.md § For planets and moons, solid-bodies.md (the planet's Built line, the moon's eligible list), TRAIT-SYSTEM.md (the tag and the weighted roll)

## Carried forward

- **gaseous.js is 700 lines and traitroll.js 1,169**, both over the 500-line rule. AD's trait belongs in a new file rather than in gaseous.js.
- **The pixel-threshold lesson applies to every new primitive**: draw every part at every size, counts in body space, only widths and radii floored — or the zoom op-count check fails.
- **Ordered beats scattered for built marks** (D294's review): one orbit, even spacing, one size and turn per body.

## The prompt for Session AD

> Phase 9b, Session AD: the gas and ice giant megastructures. Read CLAUDE.md, docs/PROGRESS.md, docs/progress/session-ab-megastructures.md (the plan, D289–D290), docs/progress/session-ac-planet-megastructures.md (D291–D295: how the planet's three built traits were done, the user's review of each, and what carries forward), docs/progress/checklist.md § Phase 9b, docs/TRAIT-SYSTEM.md for the grammar, and the code to reuse: js/data/traits/orbital-built.js, js/gen/orbitalbuilt.js, js/draw/primitives/orbital-built.js (the ring's truss band, the elevators, the modules, the satellites), and the giants' existing built traits in js/data/traits/gaseous.js (`gas-miner-platforms` in the troposphere, `skimmer-tracks` as capsules at 0.94–1.08 body radii). Next free decision number: D296. Continue in a new session log, docs/progress/session-ad-giant-megastructures.md, added to docs/progress/README.md.
>
> Build one trait, rendering it for me to look at and iterating until I approve: **skyhook platforms + orbital cities**, one trait, on the gas giant and the ice giant, above the gas skimmers (lower the skimmers if they are in the way). A skyhook is the giant's space elevator: with no ground, its tether drops into the cloud deck rather than to a surface. Orbital cities are the one kind of city kept (D290), because round a giant they are megastructures, not a town — draw them big enough to read as that at the body's scale, and open to interpretation. Gate it by the giants' tags (`gaseous`), named for the physical fact if a new one is needed. It must sit with the giant's `ringlet-system` (1.22–2.35 body radii) and debris belt (1.28–1.95) and stay in frame, as the planet's traits did. Remember from AC: draw every part at every size with body-space counts (the zoom op-count check), keep built marks ordered rather than scattered, and put the new trait in its own file (gaseous.js is already 700 lines). Rules as ever: plain scripts, ≤500 lines per file, no ES modules, no new tests unless asked, render for me rather than asserting it looks good, draw the thing, not an annotation of it. End by updating the spec (gaseous-bodies.md, MACHINE-WORLDS.md § For gas giants and ice giants), the checklist and PROGRESS.md, flavour lines for the giants' pools, and writing the prompt for Session AE (the stars).
