# Session AG — Phase 9b closed: the black hole's lensing, the presets, the docs

*D304–. The last of 9b's sessions (plan: [session-ab-megastructures.md](session-ab-megastructures.md), D289–D290; the families: [AC](session-ac-planet-megastructures.md), [AD](session-ad-giant-megastructures.md), [AE](session-ae-star-megastructures.md), [AF](session-af-nebula-megastructures.md)). Three things in order, each rendered for the user and answered before the next: background lensing round the black hole, the presets, and 9b closed in the docs.*

Scratch tools (in `test/_tmp/`, gitignored): `_aglens.mjs` times the black hole with and without the lens at 1080p and 4K and renders a before/after sheet, `_aglcrop.mjs` 1:1 before/after crops round the hole (`UMBRA=`, `ACC=`, `DENS=`, `C=`), `_aglops.mjs` stub-canvas op counts at zoom 1/5/20 and 360p/2160p, `_agremap.mjs` times the rejected pixel remap.

---

## D304 — the starfield is lensed round a black hole, star by star

**Measured first, as D289 asked.** Three seeds, three renders each, in the dev rasterizer:

| | 1080p | 4K |
|---|---|---|
| black hole, no lens | 20 ms | 21 ms |
| with the lens | 31 ms | 32 ms |
| a per-pixel remap (Session V's offscreen copy) | 74 ms | 252 ms |

The op count is identical at zoom 1, 5 and 20 and at 360p and 2160p, and the DOM test's zoom check passes. About 10 ms flat against a remap that grows with the pixel count, so it was built.

**No offscreen copy.** Session V left lensing undone because bending the picture needs the background read back and every pixel moved. The starfield does not: it is a list of points in frame space, so each star is drawn as its two point-lens images, θ = (β ± √(β² + 4rE²)) / 2, the bright one outside the Einstein radius and a faint one inside it on the far side. An image keeps the star's bearing and angular width, is stretched round the hole by θ/β and squeezed across by 1/(1 + rE²/θ²), and keeps the star's alpha (surface brightness is conserved); the inner image is dimmed by its magnification. One star is always two strokes, whatever its size, so the op count cannot move with zoom. Round caps with the arc shortened by the cap, so a far star stays a dot (butt caps drew squares, round caps on the full arc drew every star as a dash).

**The ring is the sky's faint stars.** Lensing only the 640 visible stars bent the sky without drawing a ring: one or two sit close enough behind the hole to become arcs. What draws the ring is magnification bias, a real effect: the lens brightens stars too faint to see anywhere else. A deep field of 320 + 720 × density faint stars is sampled behind the lens only, out to one Einstein radius, each at a base alpha of 0.05–0.17 raised by its image's magnification, so they are invisible unlensed and a crowd of arcs hugging the shadow where they are lensed. Positions are in Einstein radii and the count is fixed by the density, so the field is the same at every zoom and resolution.

**Where it sits.** `hole.lens` on the archetype is the Einstein radius in horizon radii: **1.5**, just outside the ergosphere. At 2.4 the shear reached across the whole frame and far stars turned into faint tangential dashes that read as noise. The **umbra** drops from 0.92 to **0.5**: at full strength it hid the ring, and the bent sky now does part of the "void" work it was standing in for.

**Only the stars bend.** A gradient or nebula field behind them stays flat; bending those is the remap this avoids.

**Where the code is.** `js/draw/lens.js` (`CC.Lens.star`, `CC.Lens.field`); `drawStarfield` in js/draw/canvas.js draws through it when its options carry a `lens`; js/draw/scene.js paints the background after the view is made, with `viewFor` and `reachOf` pulled out of `render` so `CC.Scene.lens(width, height, body, settings, details)` gives the same lens a render would; the composed export (js/ui/export.js), which paints its own background across the card, asks main.js's `lensFor` for it. `lens: 1.5` and `umbra.strength: 0.5` in js/data/archetypes/compact-blackhole.js, resolved in js/gen/compact.js.

**User: "I approve, looks good."**

---

## The presets: the user's answers

Asked three things: whether Coruscant World (it needed cities, which D290 ruled out) is struck or rebuilt from what exists; whether Half-Built Dyson reads "half-built" from unbuilt gaps in the shell or from plate coverage alone; and whether a preset should show off the nebula's ringworld. **The user: rebuild Coruscant from the three orbital traits under a new name; unbuilt gaps; yes to a ringworld preset.**

## D305 — an unfinished Dyson shell: the same lattice with open arcs

**A second trait, not a second mechanism.** `dyson-shell-unfinished` ("Unfinished Dyson Shell") is `dyson-shell` copied with one more line of data, `gaps: [1, 9]`, and the two exclude each other. A preset can force it, Randomize can roll it (as a built trait, at a third of a natural one's weight, D291), and the builder reads `gaps` without asking which trait is on. The trait recipe passes `gaps` through `placeOne`'s field list (js/gen/traitroll.js).

**What it draws.** 1–9 arcs where the lattice is not there yet, together 15–80% of the circle, so "half-built" is in the outline and not only the plating. The circle is cut into one sector per gap and each gap falls somewhere in its sector, at least two ribs long and leaving at least one rib of lattice, so two never merge. First built at 1–3 arcs and 30–55%; **the user widened both for variety** ("super good … for the sake of maximum variety"), and a shell now runs from one short open arc to a few fragments left standing. **Every gap ends at a rib**, because a shell goes up frame by frame; the rib stands wherever the lattice meets it from either side, and past it the inner or outer rail runs on bare for one to three cells, the construction front. Plates, diagonals, rails and lights skip the open cells; rails are drawn as runs over the built cells.

**Rolled after everything else and only when asked**, so a finished shell's random sequence and picture are unchanged.

**A name collision, found by rendering.** The first render drew no shell at all, finished or not: `placeOne` already stamps `built: true` on every element a built trait makes (D297), and the per-cell array was called `built`, so every cell read as open. It is `cells`.

**Card.** Two lines in the stars' pools for the unfinished shell (danger: it works on one side of the star and not the other; notable: frames ending at bare rail, going up or coming down, nobody can say), and the shell's resource line now fires for either.

## D306 — three presets for 9b, in js/data/presets-built.js

| Preset | Archetype | Sets | Traits |
|---|---|---|---|
| **Fortress World** | planet | a garden world underneath (ocean 48, heat 52, starlight 46, optional layers 100, tilt 12) | orbital-ring, defence-network, minefield |
| **Half-Built Dyson** | main star | quiet, as Harvested Star (activity 18) | dyson-shell-unfinished, stellar-collector |
| **Ringworld Nebula** | nebula | cloud, Luminosity 8 (dark) | ringworld |

**Fortress World replaces Coruscant World**, renamed so it no longer promises a city-planet: what can be seen at a planet's scale is the ring, the platforms and the mines, and the blurb leaves open whether they keep something out or something in (D290). **Half-Built Dyson** puts the collectors under the shell, where they read as its control rods (D289). **Ringworld Nebula** is dark so the one light in it is the ring's own sun on the gas round it (D302). Each names its traits outright, so nothing else rolls.

**The nebula's plain-kind presets** (Planetary, Reflection, Emission) ban every trait through an `ALL` list that predated the ringworld, so a ringworld could have rolled into "a plain emission nebula". `ringworld` is added to it.

**Checked against the blurbs on three seeds each** (`_agpresets.mjs`, p1–p3): every seed carries exactly the named traits; Fortress World shows ring, elevators, platforms and minefield over sea and land; Half-Built Dyson open arcs round a quiet star; Ringworld Nebula one lit ring in a dark cloud, legible at 1080p.

**User: "Fortress World and Ringworld Nebula are perfect. The Half-Built Dyson is super good"** — with the gap ranges widened to 1–9 and 15–80% (above) — **"Other than that, I approve."**

---

## Phase 9b closed

TRAIT-SYSTEM.md's Dyson worked example is rewritten as what was built (the four-layer stack, the shell and its unfinished state, and why the pair is kept against the first test); PARAMETERS.md's Enclosure row is struck with the reason, Harvested Star's row names its real traits, and the preset table carries Fortress World, Half-Built Dyson and Ringworld Nebula; MACHINE-WORLDS.md's per-body lists are what was built family by family — the stars gain the unfinished shell, the "respond to the body's parameters" table names built traits rather than the spec's unbuilt cities, `zoneBias` is recorded as declared by no trait, the asteroid and compact lists are the U2 and V traits with the drops; stars.md and compact-objects.md are up to D304–D305. PROGRESS.md, ROADMAP.md, roadmap/phase-9-10.md and the checklist mark 9b complete.

## Files

- js/draw/lens.js — new: the starfield's lens (`CC.Lens.star`, `CC.Lens.field`)
- js/draw/canvas.js — `drawStarfield` draws through the lens when given one
- js/draw/scene.js — the background painted after the view; `reachOf`, `viewFor`, `lensFor` and the public `CC.Scene.lens` pulled out of `render`
- js/ui/export.js, js/main.js — the composed export's background asks `lensFor`
- js/data/archetypes/compact-blackhole.js — `lens: 1.5`, umbra 0.5; js/gen/compact.js resolves `lens`
- js/data/traits/dyson.js — `dyson-shell-unfinished`; js/gen/dyson.js — `unbuilt`; js/draw/primitives/dyson.js — gaps, rail runs, stubs; js/gen/traitroll.js — `gaps` passed through
- js/data/presets-built.js — new: the three presets; js/data/presets-nebula.js — `ringworld` in `ALL`
- js/data/flavour/stellar.js — two lines for the unfinished shell, the resource line shared
- index.html — lens.js after canvas.js, presets-built.js after presets-nebula.js

## Carried forward

- **Lens the list, not the pixels.** Anything drawn from a list of points can be bent exactly and cheaply at the point it is drawn; a pixel remap is for what has no list.
- **An invisible population can be the right mark.** The ring was not in the visible stars; it was in the ones the effect itself makes visible.
- **A flag name can already be taken.** `placeOne` stamps `built` on every built trait's element; an element's own fields need names that cannot collide with what the trait machinery adds.
- **The Dyson pair is the one place 9b kept two traits for one axis**, because traits have no dial. If 9c or later gives traits a dial, fold them.
- **23 files are over 500 lines** (below). scene.js grew by 36 in this session.

## The prompt for Session AH (Phase 9c)

> Phase 9c, Session AH: the final clean-up pass. Read CLAUDE.md, docs/PROGRESS.md, docs/ROADMAP.md and docs/roadmap/phase-9-10.md § 9c, docs/progress/session-ag-close-9b.md (9b closed, D304–D306, and what carries forward), docs/progress/session-aa-polish.md (what Phase 8 left for 9c: the stale comments and card notes under D286, PARAMETERS.md's four unbuilt Randomize settings under D287, ARCHITECTURE.md's out-of-date file-layout block), and PROGRESS.md's "Open questions" (1b the body cut flat across its lower portion, 2 no Atmosphere thickness control, 4 the atmosphere's peak alpha). Next free decision number: D307. Continue in a new session log, docs/progress/session-ah-cleanup.md, added to docs/progress/README.md.
>
> Start with an audit and bring it to me as a list before touching anything; we settle the order together and then go one item per step, rendering for me and waiting for my answer before the next. The audit should cover: (1) **does everything land together** — a contact sheet (`npm run sheet`) and every preset on three seeds, every family with every trait including the composed export and the card, looking for marks that clash, traits that read wrong beside each other, cards that contradict the picture; (2) **the files over 500 lines**, every one of them, with a proposed split by responsibility for each: js/draw/film.js (1468), js/draw/scene.js (1449), js/draw/details.js (1394), js/gen/palette.js (1229), js/gen/traitroll.js (1216), js/gen/elemgen.js (1180), js/gen/details.js (1036), js/data/presets.js (939), js/draw/primitives/orbital.js (897), js/main.js (788), js/gen/structure.js (787), js/draw/primitives.js (749), js/gen/climate.js (715), js/data/traits/gaseous.js (700), js/data/archetypes/gaseous.js (697), js/draw/canvas.js (648), js/data/archetypes/solid.js (621), js/draw/primitives/stellar.js (618), js/draw/zonepaint.js (598), js/data/archetypes/stellar-common.js (598), js/gen/frosting.js (597), js/data/traits/stellar-magnetic.js (572), js/draw/layers.js (555) — a split moves code without changing a pixel, so check each with a before/after render diff, and keep index.html's script order honest; (3) **spec drift**: PARAMETERS.md rows still marked ⬜ (Accent hue, Artificial traits allowed, Tertiary hue and the rest) — build, strike or record each; preset tables against `js/data/presets*.js`; ARCHITECTURE.md's file layout; stale comments naming removed traits (`dyson-structure`, `surface-city`); (4) the open "for the user's eye" lists in the session logs (U1, U2, V, X, Y). Rules as ever: plain scripts, ≤500 lines per file, no ES modules, no new tests unless asked, render for me rather than asserting it looks good, draw the thing, not an annotation of it, and deletions go to C:\trash. End by writing the prompt for Phase 10, the release (the user's release prompt is docs/RC prompt to make releases easier.md).
