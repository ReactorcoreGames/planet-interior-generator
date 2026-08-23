# Phases 0–4 — complete

*Part of [ROADMAP.md](../ROADMAP.md). All phases below are ✅ done — kept for
historical reference and the constraints they locked in.*

---

## Phase 0 — Skeleton ✅

*Goal: the shell exists and does nothing interesting.*

- `index.html` with script tags in dependency order
- Preview canvas, pinned Randomize/Export buttons, accordion sections
- Core utilities ported from `archive/v2/src/core/`: `rng.js`, `math.js`,
  `color.js` — **translate out of ES module syntax** into namespace objects
- `launch_app_win.bat` and `build_release.bat` *(both already exist and are
  written for the v3 layout — no work needed)*

**Done when:** the page opens from a double-click, the panel works, and a
hardcoded circle renders.

> **✅ `lib/` is done.** `simplex-noise.js` (v2.4.0, global `SimplexNoise`) and
> `delaunay.js` (d3-delaunay 6.0.4 UMD, global `d3.Delaunay`) are vendored and
> verified as classic scripts by `npm run test:lib`. See
> [lib/README.md](../../lib/README.md) — in particular, **do not upgrade
> simplex-noise to v4+**, which is ESM-only and would require a bundler.

---

## Phase 1 — Structure & generic renderer ✅

*Goal: correct, ugly.*

- Archetype data format; **`planet` only**
- Structure stage: standard stack with rolled thicknesses
- **Ocean depth** and **Interior heat** parameters — they add and remove layers
  (no ocean at 0; no outer-core on a dead world), so the stack builder must
  handle presence-by-parameter from the start rather than having it bolted on
- Generic layer renderer: concentric bands, per-layer boundary character
- Flat colours, no detail, no traits

**Done when:** a recognisable planet cutaway renders with correctly ordered,
correctly proportioned layers, the same seed always gives the same result, and
dragging Ocean depth to 0 cleanly removes the ocean layer.

**Watch for:** the renderer must contain no planet-specific logic. If it does,
Phase 5 will hurt.

---

## Phase 2 — Colour ✅

*Goal: it becomes pretty.*

- HSV profile system: per-layer saturation/lightness ranges
- 2–3 anchor derivation (primary / secondary / tertiary)
- Hue, saturation, brightness, contrast sliders
- Boundary rendering: no-wobble circles vs. wobble per layer *(terrain relief
  was added on top of this in Phase 3 — see [PROGRESS.md](../PROGRESS.md) D15/D17)*

**Done when:** re-rolling the seed produces harmonious, clearly different
colour schemes, and no combination looks muddy.

---

## Phase 3 — Detail elements ✅

*Goal: it becomes good. **This was the make-or-break phase.***

> **Complete as of Session B**, signed off by the user on the real GUI. See
> [PROGRESS.md](../PROGRESS.md) *Phase 3 tuning notes* for the five defects that
> made ~3,600 correctly-generated elements render as flat discs, and D15–D18
> for the terrain system, the core rework, the silhouette rule and the surface
> film.
>
> **Carry-over:** the surface film is functional but too timid — see
> PROGRESS.md open question 5. It is a tuning pass, not a rebuild.

- Element primitive library: `speckle` `blob` `vein` `arc-band` `arrow`
  `flow-line` `voronoi` `ribbon` `chunk` `plate` `truss` `glyph`
- Per-layer-role detail assignment
- **Size tier system** (few large, more medium, many small)
- Detail Density slider wired to everything
- Layer behaviour: convection cells, flow arrows, radial streaks

**Done when:** a planet at 65% density looks genuinely intricate — dense enough
that you want to look closer, not sparse and artsy.

- **Continents** — land drawn *over* the global ocean band. The ocean stays a
  full concentric band; land is a surface cover ([PROGRESS.md](../PROGRESS.md) D7).
  Do not make the ocean partial — that would fight the zone system in Phase 4

> **This phase decides whether the project succeeds.** v2 failed here. Budget
> generously and iterate on the look before moving on. If it doesn't look
> impressive at the end of Phase 3, don't proceed to Phase 4 — fix it first.

**Two things carried over from Session A:**

- **Judge density with `npm run sheet`, not single renders.** Density is a
  property of the spread of outputs. In Phase 2 every individual render looked
  defensible while a contact sheet showed the whole approach was broken.
- **The per-layer element counts in the celestial docs may read sparse.** They
  were authored against much thinner layers than the stylized proportions gave
  us ([ARCHITECTURE.md](../ARCHITECTURE.md#proportions-are-stylized-not-physical)).
  Treat them as a floor, not a target.

---

## Phase 4 — Traits ✅

*Goal: it becomes interesting.*

> **Complete.** Built in Session C, signed off and defect-fixed across Sessions
> D and E. See
> [PROGRESS.md](../PROGRESS.md) D23–D26 — the zone/draw division of labour, the
> headroom limit on colour deltas (and the seam its first two versions
> produced), the general angle multipliers D22 asked for, and the four defects
> that made correctly-placed traits invisible.
>
> `npm run zones` is the harness: the Lock strength sweep as whole discs, a
> gallery of locked worlds, one disc per trait, and the numbers behind each.

- Trait placement grammar (anchor, reach, depth, arc, repeat, mirror, offset)
- Compatibility filtering (`requires` / `excludes`)
- Trait picker UI with hidden incompatibles
- **Angular zones** — build `zoneAt(angle, depth)` and the boundary cross-fade
  early. The original advice was "before the drawing primitives"; the
  primitives now exist (Phase 3), so instead make zones a **generation-stage**
  concern: `gen/details.js` already assigns every element an angle, so zone
  membership can be resolved there and carried on the element, rather than
  each primitive querying it at draw time. That keeps `draw/` free of zone
  logic the same way it is free of role names
- **Terrain is already zone-ready.** It is a pure function of angle
  (`terrain.at(angle)`, [PROGRESS.md](../PROGRESS.md) D15), so a zone can
  modulate its amplitude — and the surface film's mask likewise — without
  restructuring. Tidal locking wants exactly this: a molten dayside should
  have different relief and no film
- **Tidal locking** first as the proving case — most evocative, hardest, and
  once it works the same primitive gives polar-vortex, calm-latitude,
  tilted-axis, binary-companion and shattered nearly for free
- Then: ring-system, and the zone traits above

> **`ice-caps` was on this list and is CUT.** It was a drawn `wedge` answering a
> question deposition already answers. Caps now emerge from the frosting when
> the snowline drops, which is what [CLIMATE-PLAN.md](../CLIMATE-PLAN.md) Step 3
> builds. Do not reintroduce a cap primitive — see D27 and TRAIT-SYSTEM.md.

**Done when:** a tidally locked planet renders with distinct hot face, twilight
band and cold face, the Lock strength dial moves it smoothly from a Mercury-like
resonance to a razor terminator, zone boundaries cross-fade without visible
banding, and traits can be combined without visual collisions.
