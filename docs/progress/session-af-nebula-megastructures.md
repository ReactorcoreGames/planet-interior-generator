# Session AF — Phase 9b, the nebula megastructures

*D302–D303. The fourth of 9b's per-family sessions (plan: [session-ab-megastructures.md](session-ab-megastructures.md), D289–D290; the planets: [session-ac-planet-megastructures.md](session-ac-planet-megastructures.md); the giants: [session-ad-giant-megastructures.md](session-ad-giant-megastructures.md); the stars: [session-ae-star-megastructures.md](session-ae-star-megastructures.md)). Two things in the nebula, each rendered for the user and iterated until approved before the next: one ringworld, then ice and rock belts that are round or oval fields half the time.*

Scratch tools (in `test/_tmp/`, gitignored): `_afbase.mjs` renders a 2×N sheet of `archetype:traits:seed` specs at 800×450, `_afcrop.mjs` one body at 1920×1080 with an optional crop, `_afzoomcrop.mjs` a 4K render cropped round a 1080p window, `_afrings.mjs` whole nebulae beside a 1080p crop centred on the ringworld (`FORM=planetary|remnant`, `TRAITS=...`), `_afprobe.mjs` prints the placed ringworld element, `_afbelt.mjs` the stretch and radius of each belt pocket on a seed, `_afflav.mjs` collects the card lines the ringworld guards.

---

## D302 — one ringworld

**What it draws.** A ring round its own small sun, seen at a slant, so it is an ellipse (minor over major 0.34–0.46). Back to front:

1. the sun's light on the gas round it, a warm screen-blended glow out to 1.5 ring radii, so the ring lights its own patch of cloud;
2. the far half's **inner face**: land in runs of lowland and upland, seas and cloud banks as lenses across part of the width, 4–6 darker night stretches where shadow squares fall, a metal rim wall along each edge with a lit inner line;
3. the sun, a hot point at the middle;
4. the near half's **outer face**: dark hull metal, lighter where it faces the viewer, frames every 4–6 segments, a lit upper edge, a few warm lights;
5. 2–4 **veils** of the nebula's own gas drifting across it, each three soft lobes along the ring.

The ribbon is 0.26–0.32 of the ring's radius wide, so the inner face is legible. The surface rolls **lush** (half the time), **arid** or **frozen**; nothing says who built it or whether anyone lives there — a habitat, a ruin, a garden, a gate (D290). Metal is `hullFill`'s grey; the land's colours are fixed per surface, like the satellites' cyan, because they are what the ring is made of, not the gas.

**In the gas, not on it.** Placed by the nebula's own `pocket` placer with `formation: "centre"` (the pocket's radius becomes the ring's), sunk under the other traits (`under`), so belts and ships pass over it; its sun lights the gas round it and the veils pass across it. On the shell forms it sits in the band of material (`byAnchor.shell.band`).

**One element, its own files.** `ringworld` ("Ringworld"), gated on `diffuse` and tagged `artificial`; js/data/traits/ringworld.js, js/gen/ringworld.js (the builder), js/draw/primitives/ringworld.js (the drawing and a registered style carrying the gas colour for the veils). 120 segments round the ring and every other count body-space; only line widths and light radii floor. The DOM test's zoom op-count check passes.

**The iteration.**

1. First render: a ring of radius 0.10–0.20 body radii with a thin ribbon. It read as a ring round a star at the sheet's scale, but up close the inner face was a sliver and the seas were stair-stepped blocks. The ribbon was widened (0.16–0.21 → 0.26–0.32), the seas and clouds became smooth lenses sampled two to a segment, the near hull was darkened to shade with the hull grey laid over it by facing, and the veils became three lobes each.
2. On the shell forms the ring hung half out of the band at its outer edge, and on some clouds it landed in thin gas; `seek` was raised.
3. **The user: "Shape and style is good. Make it smaller, shrink by −60% in size. A nebula is massive so a ring world being that big is a bit too much"** — and on placement, **"the more varied and liberal, the better."** `pocketSize` 0.16–0.21 → 0.064–0.084 (the placer scales it by 0.8–1.2, so a ring radius of about 0.05–0.10 body radii, 40–65 px wide on a 1080p preview), and placement loosened to `seek 0.5` across `within [0.08, 0.72]`, the same on a shell. At that size it still reads as a ring round its own sun at 1080p.
4. **User: "Approved, perfect."**

## D303 — ice and rock belts are round or oval fields half the time

**The problem, in the user's words:** the ice and rock fields "tended to be more often a long streak and didn't have a chance to be a more round circle field half the time." `belt()` gave every pocket a 30% `round` roll, but that only dropped the stretch to 1–1.5 and kept the triangular falloff — a tight clump, not a field.

**`oval`**, a new pocket field (js/gen/diffuse-pockets.js): the chance a pocket is a FIELD rather than a belt. A field's stretch is 1–1.8, its radius grown by √(rolled stretch ÷ field stretch) so it covers about the area the streak would have, and its marks are filled about evenly — a disc sampled at `pow(u, 0.62)` with a ragged edge — rather than thick in the middle. Ice and rock belts declare `oval: 0.5` and `round: 0`; metal belts keep their own tight-and-loose knots and the old `round`. Rolled per pocket, so a nebula with several pockets usually mixes streaks and fields. An ice field's frost haze takes the field's axis and stretch, so it is a soft round patch with crystals in it.

The roll replaced `round`'s one-per-pocket draw with one of its own, so the random sequence did not move: a seed whose pockets all drew above 0.5 (n1) renders exactly as before.

**User: "Approved."**

## Card and flavour

The card's trait list picks up "Ringworld" by itself. The nebula's pools (js/data/flavour/nebula.js) gained five lines, each guarded by the trait and leaving the story open (D290): whatever runs the shadows decides who gets daylight and never answers a hail (danger); a ring round its own sun, builders and inhabitants unknown, and seas and land along its inside on no chart (notable); living room if it is empty, a neighbour if it is not (resources); toward the light that does not belong to the cloud, over the rim wall (approach). All five were seen on cards.

## Files

- js/data/traits/ringworld.js — the declaration
- js/gen/ringworld.js — the builder `ringworld`
- js/draw/primitives/ringworld.js — the drawing and its style
- js/gen/diffuse-pockets.js — `oval` (447 lines)
- js/data/traits/diffuse.js — `oval: 0.5`, `round: 0` on ice and rock belts (293 lines)
- js/data/flavour/nebula.js — five lines
- index.html — three script tags, each after its nebula counterpart
- docs: diffuse-bodies.md (Artificial, the material table), MACHINE-WORLDS.md § For nebulae, TRAIT-SYSTEM.md (`place`)

## Carried forward

- **Scale for the body, again, and the other way.** A nebula is light-years across: the ring had to shrink by 60% to stop dominating it. A built thing on the biggest body is the smallest mark relative to it.
- **Embedding beats contrast.** A built mark in gas reads as part of the picture when the gas passes over it and it lights the gas, not when it is drawn crisper on top.
- **A "round" option must change the fill as well as the stretch.** A stretch of 1 on a falloff tuned for streaks gives a knot, not a field.

## The prompt for Session AG

> Phase 9b, Session AG: the black hole's lensing, then 9b closed. Read CLAUDE.md, docs/PROGRESS.md, docs/progress/session-ab-megastructures.md (the plan, D289–D290), the four per-family logs session-ac-planet-megastructures.md, session-ad-giant-megastructures.md, session-ae-star-megastructures.md and session-af-nebula-megastructures.md (D291–D303: what was built, the user's review of each, and what carries forward), docs/progress/checklist.md § Phase 9b, docs/progress/session-v-compact.md (why the black hole's lensing was left undone: it needs an offscreen copy of the background), docs/celestials/compact-objects.md, docs/PARAMETERS.md's preset table, docs/TRAIT-SYSTEM.md's Dyson worked example, and the code: js/draw/scene.js (the background pass), js/draw/hole.js, js/data/traits/dyson.js with js/gen/dyson.js and js/draw/primitives/dyson.js, js/data/presets*.js. Next free decision number: D304. Continue in a new session log, docs/progress/session-ag-close-9b.md, added to docs/progress/README.md.
>
> Three things, in order, rendering for me and waiting for my answer before the next: (1) **background lensing round the black hole** — the starfield bent into an Einstein ring round the horizon. Measure the cost first (render time with and without, at 1080p and 4K, and the zoom op-count check); if it costs real render time, skip it and record why. (2) **The presets**: ask me whether Coruscant World (it needed cities, which D290 ruled out) is struck or rebuilt from what exists — the orbital ring, the defence network, the minefield — and whether **Half-Built Dyson** gets a half-built shell as unbuilt gaps in `dyson-shell` (1–3 open arcs ending at a rib) or reads "half-built" from plate coverage alone; then build what I choose and check each preset against its blurb on three seeds. Consider a preset that shows off the nebula's ringworld. (3) **Close 9b**: TRAIT-SYSTEM.md's Dyson worked example, PARAMETERS.md's preset table and MACHINE-WORLDS.md's per-body lists brought up to what was built; 9b closed in PROGRESS.md, ROADMAP.md and the checklist. Rules as ever: plain scripts, ≤500 lines per file, no ES modules, no new tests unless asked, render for me rather than asserting it looks good, draw the thing, not an annotation of it. End by writing the prompt for 9c, the final clean-up — including the files over 500 lines (js/gen/traitroll.js, js/data/traits/gaseous.js).
