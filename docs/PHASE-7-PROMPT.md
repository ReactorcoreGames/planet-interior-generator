Build Phase 7 — the remaining families — for the Celestial Cutaway generator.

PHASE 7 IS BEING DONE ONE GROUP PER SESSION. Keep this file current: after
each celestial type lands, update the STATUS block below and move it out of
WHAT'S LEFT. That is part of the work, not bookkeeping done afterwards.

────────────────────────────────────────────────────────────────────────
STATUS

✅ **moon** — built in Session S (D163–D171). Write-up:
   docs/progress/session-s-moon.md. One archetype with TWO stacks: a bare
   cratered moon, and the ice-shelled branch (bright shell / dark subsurface
   ocean / rock floor). Includes the frosting work this phase assigned —
   two-zone regolith, and the two facing surfaces with `direction: -1`.
   Six new general mechanisms, no `js/draw/` branch, four presets.
   **Open question 1 is discharged for the moon only.**
   Tweaked after the user reviewed it in the app (D172-D173): a locked ice
   moon no longer retreats its sealed ocean out from under a rigid shell (the
   lock now varies the SHELL'S THICKNESS instead), and moons no longer offer
   rings or debris belts at all. A giant's rings became `ringlet-system`, a
   genuinely different object from a rocky world's.

✅ **asteroid** — built in Session T (D175–D183). Write-up:
   docs/progress/session-t-asteroid.md. Two layers — a faceted hardened
   shell carrying a dust film, and a Voronoi mosaic interior that is 86% of
   the radius. **Open question 1 is now discharged for BOTH bodies.**
   Six new general mechanisms (`mosaic`/`fracture` elements,
   `climate.retainsHeat`, `boundaryFacet`, `boundaryFreq`, `boundaryShare`,
   `wobbleScale`), its own stat template, its own flavour pool, four traits,
   four presets, and the Cohesion slider. **`js/draw/` needed no archetype
   branch** — the mosaic is one element and dispatches by `kind` like a
   speckle.
   Tweaked twice after the user reviewed it in the app: the silhouette was
   still a circle at every amplitude (the missing statements were angularity
   and frequency, not size — D179), and the fragments read as polished
   because every mark describing them was a continuous field (D181).
⬜ **compact group** — neutron-star, pulsar, black-hole. A later session.
⬜ **diffuse** — nebula. A later session.

Do ONE group per session. Phase 6 needed four sessions for one family, and
the compact and diffuse groups are further from anything already built than
the stars were.
────────────────────────────────────────────────────────────────────────

READ FIRST, in this order:
- CLAUDE.md (locked technical constraints — plain scripts, no ES modules,
  no build step, ≤500 lines per file)
- docs/PROGRESS.md (current state; supersedes the specs where they disagree)
- docs/roadmap/phase-7-remaining-families.md (the phase spec)
- docs/progress/session-s-moon.md (D163–D171 — the most recent traps, and
  the ones most likely to repeat, since the moon is the nearest neighbour of
  everything left in this phase)
- docs/celestials/solid-bodies.md (for the asteroid: the moon's table in it
  has been CORRECTED and the correction is recorded; the asteroid's has NOT)
- docs/progress/session-m-stars.md (D115–D128 — a whole new family added
  from scratch; still the closest precedent for the compact group)

WHAT'S LEFT TO BUILD

**Asteroid (next).** Voronoi interiors via the vendored d3-delaunay. The
biggest test of the Voronoi work.

**Compact:** `neutron-star`, `pulsar`, `black-hole` — exotic textures, and
the void. Rides the stellar machinery from Sessions M–R while it is still
the most recently exercised, but the black hole is the least-specified thing
in the roadmap: "it is not a dark circle with a ring drawn on it" is the
whole spec, so expect several rebuilds on judgement alone.

**Diffuse:** `nebula` — extreme wobble, translucency, the highest element
budget in the project. The biggest test of the density system. D156 (fading
TOWARDS nothing is not ending AT nothing) applies to nearly every mark on it.

ASTEROID NOTES — kept for the record; this group is done

- **Open question 1 is still open for the asteroid.** Measured on paper, its
  `dust-film` and `outer-shell` can each roll to 0.010 of the radius — a
  hairline against D5's "legible bands" — so at minimum those two need
  widening. But D163 is the lesson to carry over: the MOON's table also
  composed, so the doccheck passed, and it was still wrong three ways that
  only appeared once the stack was built and printed. **Build it, print it,
  and do not trust the paper measurement.**
- **`CC.Primitives.voronoi` exists and has never been called.** It fills
  cells flat — no fracture, no void, no shading — so as written it produces
  exactly the "mosaic pattern laid over a circle" the done-condition forbids.
  That is the substance of the work, not a wiring job.
- The asteroid's innermost layer may omit `frac` entirely — "take what's
  left" is already supported and is how the mosaic fills the body.
- **Frosting: probably skip** (the phase doc's call). A dusting competes with
  the Voronoi interior on a body that small. Revisit only if the mosaic turns
  out to want a frame.

DONE WHEN (per group, from the phase doc):
- an asteroid's Voronoi interior reads as broken rock, not as a mosaic
  pattern laid over a circle
- a nebula is legible at the highest element budget without becoming mush
- a black hole is the void — whatever that turns out to mean, it is not a
  dark circle with a ring drawn on it
- nothing in js/draw/ needed an archetype-specific branch

✅ Met by the asteroid (Session T): its Voronoi interior reads as broken rock
rather than as a mosaic pattern laid over a circle — voids that are genuinely
absent, per-fragment shading, inset joints, and grit in both polarities; and
nothing in js/draw/ learned an archetype name, because the mosaic is a single
element taking the ordinary primitive signature.

✅ Already met by the moon: regolith pools in crater floors and is swept off
rims (measured — settled span 0.091 against a rock span of 0.155, 50% of
bearings pooling and 50% shedding); an ice moon shows two frosted surfaces
across a dark ocean; and its card states TWO temperatures without
contradiction.

WHAT THE LAST SEVEN SESSIONS LEARNED THE HARD WAY — do not rediscover these:
- D122/D75/D163: THE AUTHORED NUMBER IS NOT THE DRAWN NUMBER, and this is
  not only about a mark's alpha — it applies just as hard to GEOMETRY. The
  structure stage has two independent ways to move a radius after it is
  authored (renormalization to a 1.0 surface, and a layer's own relief
  feeding into that surface). Print the built stack before tuning anything.
- D171: REGISTERED IS NOT REACHABLE. The moon was built, tested, rendered and
  presetted while missing from the archetype dropdown, because the suite
  drives `CC.Archetypes.ids()` and the GUI reads a hand-written `<select>`.
  `test:docs` now asserts they agree — but the general form is: when a new
  thing must appear in a hand-maintained list, check the LIST.
- D164: when an optional layer is the visible CONSEQUENCE of a fact the
  generator already computes, rolling it independently will contradict that
  fact on most seeds — and it will not look like a bug, it will look like
  variety. `presence: { colder }` is the moon's answer; the asteroid's
  Cohesion axis may want the same shape.
- D165: a named constant is not automatically the right threshold.
  `CC.Climate.COLD` is 0.18 ≈ −60 °C, not the freezing point, and using it
  reported 18% for something that was 83% true.
- D169/D159: a value can be correct at both ends and undefined in between.
  `ElemGen.build` drops recipe fields it does not know; the moon's accreted
  ice never drew because two sites asked "does this layer carry terrain" in
  two different ways. When two places ask the same question, make it one.
- D76/D160: a trait must be a different KIND of mark — and when a mark keeps
  losing to its neighbours, consider whether it needs a different REGISTER
  rather than a better silhouette.
- D156: fading TOWARDS nothing is not ending AT nothing. This will matter for
  a nebula, where nearly everything must dissolve.
- D158: two marks each calibrated alone are not a calibrated pair. Tune the
  composite, at app scale.
- D77: `anchor` may be a list, and a role may not exist on every archetype in
  a family. Walk a chain; never name one role and assume.
- D88/D116: render large to find what a mark is doing wrong — but look at the
  APP to find whether the picture is right. Session S adds the third leg: a
  fault in a QUANTITY is found by MEASURING it, and neither render answers
  that. The 11% ice-moon figure, the missing zone table and the moss-green
  regolith were all invisible in a render and obvious in a printout.

ARCHITECTURE RULES FOR THIS PHASE:
- Follow the per-family file split already in place: js/data/archetypes/,
  elements/, traits/, flavour/, gen/stats/ — each registering into its
  existing registry. Nothing in js/draw/ should learn an archetype name.
- d3-delaunay is vendored and approved for the Voronoi work. Ask before
  adding any other library.
- No new tests unless I ask. The suite is deliberately ~30 seconds and a
  check earns its place only if it is mechanically true-or-false AND generic
  over CC.Archetypes.ids(). Adding a body family must add no test code — if
  it does, the check is wrong. (The two checks Session S added — per-branch
  stack composition, and GUI reachability — both meet that bar.)
- Write presets for each family as part of the phase, not after it.
- **Add the archetype to the `<select id="archetype">` in index.html.** D171.
- D114: modules that cache a setting are told at init, on change, and on
  settings-paste — all three currently via syncArchetypeConsumers() in
  js/ui/exportui.js. A new UI module or a new route into a control must be
  wired there. Nothing enforces this.

TESTING STANCE: use npm run sheet and targeted renders to judge how things
LOOK — that is my call, made by looking at the app. Show me renders as you
go rather than at the end, and say plainly when something is a judgement
call rather than asserting it looks good.

KNOWN OPEN DEFECT, not caused by this phase: the body is cut off flat across
its lower portion, on every family and at every size. Verified in Session S
to predate that session. See PROGRESS.md open question 1b.
