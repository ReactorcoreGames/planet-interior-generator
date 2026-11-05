# Roadmap

*MVP definition and build phases. The full scope is locked in the other docs; this is the order for getting there.*

> This file is an index. Finished phases were moved to the gitignored `old wip/docs-roadmap/` in Session AO; [docs/roadmap/](roadmap/) keeps what is still live. The full text was split per phase, so a session doesn't have to load 690 lines to check what comes next. [PROGRESS.md](PROGRESS.md) is the live record of what is built; this file is the plan.

---

## Guiding principle

**Every phase ends with something you can look at and judge.** No phase is "internal plumbing with nothing to see" — if a phase can't be evaluated visually, it's scoped wrong.

The architecture is designed so later phases slot in without rework: archetypes are data, traits are data, the renderer is generic. Adding the twelfth body type should be a data change, not a code change. Every family so far has been added with **no archetype-specific branch in `js/draw/`**.

---

## Phase index

| Phase | Status | Doc |
|---|---|---|
| Climate foundation | ✅ read before any phase that touches temperature | [roadmap/climate-foundation.md](roadmap/climate-foundation.md) |
| 0 — Skeleton | ✅ | `old wip/docs-roadmap/phases-0-4.md` |
| 1 — Structure & generic renderer | ✅ | `old wip/docs-roadmap/phases-0-4.md` |
| 2 — Colour | ✅ | `old wip/docs-roadmap/phases-0-4.md` |
| 3 — Detail elements | ✅ | `old wip/docs-roadmap/phases-0-4.md` |
| 4 — Traits | ✅ | `old wip/docs-roadmap/phases-0-4.md` |
| 🎯 MVP | ✅ | `old wip/docs-roadmap/mvp.md` |
| 5 — Second family: gaseous | ✅ (Sessions K–L) | `old wip/docs-roadmap/phase-5-gaseous.md` |
| 6 — Stars | ✅ (Sessions M–R) | `old wip/docs-roadmap/phase-6-stars.md` |
| 7 — Remaining families | ✅ (Sessions S–X, reviewed in Y) | `old wip/docs-roadmap/phase-7-remaining-families.md` |
| 9a — The `machine-world` archetype | ✅ (Session Z) | `old wip/docs-roadmap/phase-9-10.md` |
| 8 — Overlay, scale, polish | ✅ (Session AA; framing built early, Session I) | `old wip/docs-roadmap/phase-8-polish.md` |
| 9b — Megastructure traits | ✅ (Sessions AB–AG) | `old wip/docs-roadmap/phase-9-10.md` |
| 9c — Final clean-up pass | ✅ (Sessions AH–AN) | `old wip/docs-roadmap/phase-9c-cleanup.md` |
| 10 — Release | ✅ (Session AO) | [roadmap/phase-10-release.md](roadmap/phase-10-release.md) |

**The rows are in build order, not number order** (D246). The phase numbers are kept so existing references stay valid.
| Out of scope, risk notes, session boundaries | | [roadmap/scope-and-risk.md](roadmap/scope-and-risk.md) |

---

## Current status

**Phases 0–8, 9a, 9b and 9c are complete**, along with the climate system (Session F) and framing (Session I, pulled forward from Phase 8). **Next: 10, the release.**

**Phase 7 is complete:**

- ✅ **moon and ice moon** — Session S
- ✅ **asteroid** — Session T, then overhauled in Sessions U1 and U2 after the user's review
- ✅ **compact group** (neutron star, pulsar, black hole) — Session V, reviewed and tuned in Session W
- ✅ **nebula** — Session X: extreme wobble with drifting regions, translucency, a per-body density field, Luminosity source, a second stack (the hollow shell of a planetary nebula or supernova remnant, with a pulsar's beams), fifteen traits placed by the gas, its own card and seven presets. Spec: [celestials/diffuse-bodies.md](celestials/diffuse-bodies.md)

**Session Y reviewed Phase 7** (the nebula signed off; the neutron star and pulsar reworked) and **reordered what remains** (D246, [session-y-compact-review.md](progress/session-y-compact-review.md)):

1. ✅ **9a — the `machine-world` archetype first**, so the polish pass covers every body type that will ship. Done in Session Z (D248–D281, [session-z-machine-world.md](progress/session-z-machine-world.md)).
2. ✅ **8 — overlay, scale bar, polish**, including the per-type stat templates, over the full set of archetypes. Done in Session AA (D282–D288, [session-aa-polish.md](progress/session-aa-polish.md)): the layer-name overlay, the scale bar, the stat-template pass, persistence and Reset to defaults, the full keyboard map.
3. ✅ **9b — megastructure traits.** Audited and the list set by the user in Session AB (D289–D290); built one family per session, AC–AF; closed in Session AG with the black hole's lensing, three presets and the unfinished Dyson shell (D304–D306). See [progress/session-ab-megastructures.md](progress/session-ab-megastructures.md) and [progress/session-ag-close-9b.md](progress/session-ag-close-9b.md).
4. ✅ **9c — a final clean-up pass**, so everything lands together. Audited in Session AH (D307–D308) and worked through a checklist, AI–AN: the bugs and picture decisions, the eye lists, the unbuilt controls and spec drift, every file over 500 lines split with no pixel changed, and the docs. See `old wip/docs-roadmap/phase-9c-cleanup.md`.
5. ✅ **10 — release.** v4.0, Session AO ([session-ao-release.md](progress/session-ao-release.md)). The user's release-prep prompt is [RC prompt to make releases easier.md](RC%20prompt%20to%20make%20releases%20easier.md), and the steps built on it are in [roadmap/phase-10-release.md](roadmap/phase-10-release.md). Releasing later is fine: machine worlds and megastructures are intended parts of the generator, not extras.

Finished planning docs (the Phase 6 polish docs, the Phase 7 prompt, the asteroid overhaul, the climate plan) are in the gitignored `old wip/docs-archive/`, and in git history up to commit 302550a. They are records of design reasoning, not open work.
