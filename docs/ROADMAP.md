# Roadmap

*MVP definition and build phases. The full scope is locked in the other docs;
this is the order for getting there.*

> This file is an index. It used to hold the full text; it's now split into
> [docs/roadmap/](roadmap/) so a session doesn't have to load 690 lines to
> check what phase comes next. Each linked file is self-contained.

> **Phases 0, 1 and 2 are complete.** For the per-item checklist, the decisions
> taken while building them and the defects worth remembering, see
> [PROGRESS.md](PROGRESS.md) — that file is the live record; this one is the
> plan.
>
> **Phases 3 and 4 are also complete.** Tidal locking shipped as a universal
> axis rather than a trait (D27), and the thermal field it introduced (D35) has
> since been generalised into a climate system.
>
> **The climate system is built** (Session F, D40–D46). Starlight, star colour
> and activity, emergent polar caps, sea ice, axial tilt and exotic oceans. It
> finished the surface model the MVP needs — and, more importantly, **it is now
> a foundation the remaining phases build ON rather than a feature they build
> around.** See [roadmap/climate-foundation.md](roadmap/climate-foundation.md)
> before scoping Phase 5, 6 or 7.

---

## Guiding principle

**Every phase ends with something you can look at and judge.** No phase is
"internal plumbing with nothing to see" — if a phase can't be evaluated
visually, it's scoped wrong.

The architecture is designed so later phases slot in without rework: archetypes
are data, traits are data, the renderer is generic. Adding the twelfth body type
should be a data change, not a code change.

---

## Phase index

| Phase | Status | Doc |
|---|---|---|
| Climate foundation | ✅ read before 5/6/7/9 | [roadmap/climate-foundation.md](roadmap/climate-foundation.md) |
| 0 — Skeleton | ✅ | [roadmap/phases-0-4.md](roadmap/phases-0-4.md) |
| 1 — Structure & generic renderer | ✅ | [roadmap/phases-0-4.md](roadmap/phases-0-4.md) |
| 2 — Colour | ✅ | [roadmap/phases-0-4.md](roadmap/phases-0-4.md) |
| 3 — Detail elements | ✅ | [roadmap/phases-0-4.md](roadmap/phases-0-4.md) |
| 4 — Traits | ✅ | [roadmap/phases-0-4.md](roadmap/phases-0-4.md) |
| 🎯 MVP | ✅ built, test pending | [roadmap/mvp.md](roadmap/mvp.md) |
| 5 — Second family: gaseous | ✅ | [roadmap/phase-5-gaseous.md](roadmap/phase-5-gaseous.md) |
| 6 — Stars | | [roadmap/phase-6-stars.md](roadmap/phase-6-stars.md) |
| 7 — Remaining families (moon, asteroid, compact, nebula) | | [roadmap/phase-7-remaining-families.md](roadmap/phase-7-remaining-families.md) |
| 8 — Overlay, scale, polish | framing built early (Session I) | [roadmap/phase-8-polish.md](roadmap/phase-8-polish.md) |
| 9 — Machine worlds | | [roadmap/phase-9-10.md](roadmap/phase-9-10.md) |
| 10 — Release | | [roadmap/phase-9-10.md](roadmap/phase-9-10.md) |
| Out of scope, risk notes, session boundaries | | [roadmap/scope-and-risk.md](roadmap/scope-and-risk.md) |

---

## Current status

**Phase 5 is complete** — the gaseous family shipped in Session K and its
presets in Session L. The generalisation test passed: nothing in `draw/` needed
a gas-giant branch, and the phase left behind six general mechanisms and three
primitives every later family can use.

**Phase 6 is complete** — the stellar family shipped in Session M, with all
five done-conditions checked rather than asserted; see
[session-m-stars.md](progress/session-m-stars.md).

**Next up: Phase 7 — moon, ice moon, asteroid.** The superseded pointer below
is kept for the reasoning it carries. See
[roadmap/phase-6-stars.md](roadmap/phase-6-stars.md), and read
[roadmap/climate-foundation.md](roadmap/climate-foundation.md) first — a star
is the thing the climate system has been taking its input FROM, so this phase
inherits more of it than any other.
