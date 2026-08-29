Build Phase 6 — stars — for the Celestial Cutaway generator.

READ FIRST, in this order:
- CLAUDE.md (locked technical constraints — plain scripts, no ES modules,
  no build step, ≤500 lines per file)
- docs/PROGRESS.md (current state; supersedes the specs where they disagree)
- docs/roadmap/phase-6-stars.md (the phase spec and its done-condition)
- docs/roadmap/climate-foundation.md (read BEFORE scoping — this phase
  inherits it mostly by DECLINING it)
- docs/progress/session-k-gaseous.md (Phase 5 was the generalisation test;
  D74–D93 are the traps that cost that session the most time)

WHAT TO BUILD
Four archetypes — young-star, main-star, old-giant-star, dwarf-star —
convective vs radiative zones, prominences in size tiers, corona,
chromosphere, granulation, and a stellar stat template.

DONE WHEN (from the phase doc):
- convective and radiative zones are instantly distinguishable
- an old giant shows its absurd core-to-envelope ratio
- no star has grown a polar cap (check climate.frozenFraction)
- Star activity visibly drives starspots, prominences and flare storms
- nothing in js/draw/ needed a star-specific branch

WHAT PHASE 5 LEARNED THE HARD WAY — do not rediscover these:
- D75: a calibration constant is only calibrated for the range it was fitted
  on. This bit THREE TIMES in one session (gravity, hazard rungs, crush
  depth). A star's radius and temperature ranges are wildly outside anything
  fitted so far, so re-measure EVERY threshold downstream of a formula whose
  input range changed. A sweep printing min/max over 40 bodies takes thirty
  seconds.
- D78: a stat template is a MINDSET, not a list of rows. A star's card must
  ask a star's questions, not a planet's with the surface lines deleted.
  Same for the flavour pools.
- D76/D80: a trait must be a different KIND of mark, and a soft blob cannot
  say what a thing IS. Expect the first version of every trait to be
  invisible or to read as the wrong material.
- D88: when the question is "does it draw at all", COUNT PIXELS — render
  with and without the trait and diff. Do not squint at guessed crops.
  Build that tool first, not last.
- D77: anchor may be a list, so a shared trait meets different stacks.

ARCHITECTURE RULES FOR THIS PHASE:
- A star declares climate: { latitude: 0, starlit: false }. Both escape
  hatches are already built and asserted (D50). USE THEM — do not add a
  role-name branch to gen/climate.js.
- No frosting on stars (D22). Granulation is convective churn, not
  deposition. Heat plumes want outward-falloff machinery instead.
- Star activity is ONE control with TWO consumers — a star body and the star
  a planet orbits are the same object seen from two sides. Do not add a
  second axis (D27).
- Prefer widening CC.Climate.STARS to authoring a second table.
- Follow the per-family file split: js/data/archetypes/stellar.js,
  elements/stellar.js, traits/stellar.js, flavour/stellar.js,
  gen/stats/stellar.js, each registering into its existing registry.
- Write presets for the family as part of the phase, not after it.

ONE OPEN RISK TO RESPECT (D114): modules that cache a setting are told about
it at init, on change, and on settings-paste — three routes, all currently
covered by syncArchetypeConsumers() in js/ui/exportui.js. If this phase adds
a NEW route into a control (file import, URL restore) or a NEW UI module that
caches a setting, it must be wired there too. Nothing enforces this.

TESTING STANCE: do not add tests unless asked. The suite is deliberately ~30
seconds and a check earns its place only if it is mechanically true-or-false
AND generic over CC.Archetypes.ids(). Use npm run sheet and targeted renders
to judge how things LOOK — that is the user's call, made by looking at the
app, not an assertion.

Work through it phase-doc order, and show me renders as you go rather than
telling me it looks good.
