# Documentation

The v3 specification set. **Read in this order.**

---

## Start here

| # | Doc | What it answers |
|---|---|---|
| 1 | [PROJECT-VISION.md](PROJECT-VISION.md) | **Why** this exists, who it's for, what good output looks like |
| 2 | [ARCHITECTURE.md](ARCHITECTURE.md) | **How** the systems fit together. Pipeline, colour, density, UI. All locked decisions |
| 3 | [ROADMAP.md](ROADMAP.md) | **When** — MVP scope and build phases |
| 4 | [PROGRESS.md](PROGRESS.md) | **Where we actually are** — current status, what's next, the test suite, open questions |

Those four give the whole picture. Everything below is reference detail.

> **The specs state the rules; `progress/` records why each exists and what broke without it.** The specs are kept reconciled with the shipped code, and `npm run test:docs` checks the mechanically verifiable parts on every test run. If you find a spec drifting from the code, fix the spec.

---

## Reference

| Doc | Contents |
|---|---|
| [TRAIT-SYSTEM.md](TRAIT-SYSTEM.md) | The trait placement grammar — anchor, reach, arc, repeat, mirror, density. Defined once, referenced everywhere |
| [PARAMETERS.md](PARAMETERS.md) | Every GUI control, section by section, with defaults |
| [HAZARDS.md](HAZARDS.md) | Hazard ratings, condition and flavour text pools, stat templates, the plain-language phrasebook |
| [ARCHETYPE-TEMPLATE.md](ARCHETYPE-TEMPLATE.md) | Fill-in sheet for specifying a **new** body type |
| [RC prompt to make releases easier.md](RC%20prompt%20to%20make%20releases%20easier.md) | The user's release-prep prompt, for Phase 10 |

## Body types

| Doc | Archetypes |
|---|---|
| [celestials/solid-bodies.md](celestials/solid-bodies.md) | planet · moon · asteroid |
| [celestials/gaseous-bodies.md](celestials/gaseous-bodies.md) | gas-giant · ice-giant |
| [celestials/stars.md](celestials/stars.md) | young-star · main-star · old-giant-star · dwarf-star |
| [celestials/compact-objects.md](celestials/compact-objects.md) | neutron-star · pulsar · black-hole |
| [celestials/diffuse-bodies.md](celestials/diffuse-bodies.md) | nebula |
| [MACHINE-WORLDS.md](MACHINE-WORLDS.md) | machine-world + megastructure traits for all types |

Each specifies: standard layer stack, colour profile, layer details, eligible traits, stat template, and flavour.

## History

| Folder | Contents |
|---|---|
| [progress/](progress/) | The decisions log (D1 onward), one file per session. [progress/README.md](progress/README.md) is the index; [progress/checklist.md](progress/checklist.md) is the ticked build checklist |
| [roadmap/](roadmap/) | The per-phase plan files that [ROADMAP.md](ROADMAP.md) indexes |
| [archive/](archive/) | Finished planning docs and superseded material — the Phase 6 polish docs, the Phase 7 prompt, the asteroid overhaul plan, the climate plan, v2 design notes, and the user's WIP notes. Kept for the reasoning they carry, not as open work |

---

## Also

- [../CLAUDE.md](../CLAUDE.md) — conventions and hard technical constraints

---

## The three things that matter most

If you read nothing else:

1. **Visual density is the thesis.** Many cheap layered elements, in 2–3 size tiers. Sparse output is the failure mode. This is where v2 fell down.
2. **No build step, ever.** Plain script tags. `build_release.bat` copies, it does not compile.
3. **The renderer is generic.** Body types are data. If a body type needs its own drawing code, the design has gone wrong.
