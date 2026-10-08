# Roadmap

*MVP definition and build phases. The full scope is locked in the other docs; this is the order for getting there.*

> This file is an index. The full text is split into [docs/roadmap/](roadmap/), one self-contained file per phase, so a session doesn't have to load 690 lines to check what comes next. [PROGRESS.md](PROGRESS.md) is the live record of what is built; this file is the plan.

---

## Guiding principle

**Every phase ends with something you can look at and judge.** No phase is "internal plumbing with nothing to see" — if a phase can't be evaluated visually, it's scoped wrong.

The architecture is designed so later phases slot in without rework: archetypes are data, traits are data, the renderer is generic. Adding the twelfth body type should be a data change, not a code change. Every family so far has been added with **no archetype-specific branch in `js/draw/`**.

---

## Phase index

| Phase | Status | Doc |
|---|---|---|
| Climate foundation | ✅ read before any phase that touches temperature | [roadmap/climate-foundation.md](roadmap/climate-foundation.md) |
| 0 — Skeleton | ✅ | [roadmap/phases-0-4.md](roadmap/phases-0-4.md) |
| 1 — Structure & generic renderer | ✅ | [roadmap/phases-0-4.md](roadmap/phases-0-4.md) |
| 2 — Colour | ✅ | [roadmap/phases-0-4.md](roadmap/phases-0-4.md) |
| 3 — Detail elements | ✅ | [roadmap/phases-0-4.md](roadmap/phases-0-4.md) |
| 4 — Traits | ✅ | [roadmap/phases-0-4.md](roadmap/phases-0-4.md) |
| 🎯 MVP | ✅ | [roadmap/mvp.md](roadmap/mvp.md) |
| 5 — Second family: gaseous | ✅ (Sessions K–L) | [roadmap/phase-5-gaseous.md](roadmap/phase-5-gaseous.md) |
| 6 — Stars | ✅ (Sessions M–R) | [roadmap/phase-6-stars.md](roadmap/phase-6-stars.md) |
| 7 — Remaining families | 🔶 moon, asteroid, compact ✅ · **nebula next** | [roadmap/phase-7-remaining-families.md](roadmap/phase-7-remaining-families.md) |
| 8 — Overlay, scale, polish | ⬜ framing built early (Session I) | [roadmap/phase-8-polish.md](roadmap/phase-8-polish.md) |
| 9 — Machine worlds | ⬜ | [roadmap/phase-9-10.md](roadmap/phase-9-10.md) |
| 10 — Release | ⬜ | [roadmap/phase-9-10.md](roadmap/phase-9-10.md) |
| Out of scope, risk notes, session boundaries | | [roadmap/scope-and-risk.md](roadmap/scope-and-risk.md) |

---

## Current status

**Phases 0–6 are complete**, along with the climate system (Session F) and framing (Session I, pulled forward from Phase 8).

**Phase 7 is three groups in, one to go:**

- ✅ **moon and ice moon** — Session S
- ✅ **asteroid** — Session T, then overhauled in Sessions U1 and U2 after the user's review
- ✅ **compact group** (neutron star, pulsar, black hole) — Session V, reviewed and tuned in Session W
- ⬜ **nebula** — next. The biggest test of the density system: extreme wobble, translucency, the highest element budget in the project, and a second stack (the planetary-nebula shell) that inverts every other body's densest-at-the-core assumption. Spec: [celestials/diffuse-bodies.md](celestials/diffuse-bodies.md)

**After Phase 7:** Phase 8 (layer-name overlay, scale bar — which the compact family's spec calls essential — and polish), Phase 9 (machine worlds), Phase 10 (release). The user's release-prep prompt for Phase 10 is [RC prompt to make releases easier.md](RC%20prompt%20to%20make%20releases%20easier.md).

Finished planning docs (the Phase 6 polish docs, the Phase 7 prompt, the asteroid overhaul, the climate plan) are in [archive/](archive/). They are records of design reasoning, not open work.
