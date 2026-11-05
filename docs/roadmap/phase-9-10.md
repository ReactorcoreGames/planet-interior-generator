# Phase 9 — Machine worlds, and Phase 10 — Release

*Part of [ROADMAP.md](../ROADMAP.md).*

## Phase 9 — Machine worlds, in three parts (D246)

*Originally "deliberately last — the most speculative and least essential". The natural bodies have since been built and reviewed (Phase 7, Session Y), which is what that placement was waiting for. The user split the phase so the archetype comes before polish.*

### 9a — the `machine-world` archetype ✅ (Session Z, before Phase 8)

- The archetype: its standard stack, shell gaps, colour (including the accent colour system for artificial elements), always-drawn layer details, its two axes, stat template and flavour, presets. Spec: [MACHINE-WORLDS.md](../MACHINE-WORLDS.md) § "The `machine-world` archetype".
- Its **exclusive** traits, the ones that only make sense on a body that is artificial all the way down.
- **Why first:** Phase 8's overlay, scale bar and stat-template pass should see every body type that will ship, so it is done once.

### 9b — megastructure traits on natural bodies ✅ (Sessions AB–AG)

**Audit before building.** MACHINE-WORLDS.md's per-body lists (stars, planets and moons, giants, asteroids, compact objects, nebulae) were written before most of the generator existed. Several families have since grown artificial traits of their own: stations, beacons, collectors, borers, mirrors, gas miners. So:

1. For each body, set the spec's list beside the traits that body already offers, artificial and natural (`js/data/traits/*.js`).
2. Mark each spec entry: already exists, duplicate of something that exists, conflicts with a natural trait, still wanted, or drop.
3. Agree the cleaned list with the user, then build it.

**Settled in Session AB (D289–D290).** The user set the list: orbital ring + space elevators, an orbital defence network and an orbital minefield on planets and moons; skyhook platforms + orbital cities on the giants; a Dyson shell and a Dyson swarm of stellar colonies over the stars' existing collectors and mirrors; one ringworld and round belt fields in the nebula; background lensing on the black hole only if it is cheap. No cities or fleets: too small to see at the body's scale. One family per session, AC–AG. See [session-ab-megastructures.md](../progress/session-ab-megastructures.md) and [checklist.md](../progress/checklist.md) § Phase 9b.

**Closed in Session AG (D304–D306)**: the black hole's starfield lensed star by star (about 10 ms a render, against 74–252 ms for a pixel remap), an unfinished Dyson shell with open arcs, and three presets — Fortress World (replacing Coruscant World, which needed cities), Half-Built Dyson and Ringworld Nebula. See [session-ag-close-9b.md](../progress/session-ag-close-9b.md).

### 9c — final clean-up pass ✅ (Sessions AH–AN)

**Audited in Session AH (D307–D308)** and split into one block per session; the checklist is [phase-9c-cleanup.md](phase-9c-cleanup.md). **Closed in Session AN**: no file in `js/` is over 500 lines, and the file layout in ARCHITECTURE.md is written from the real tree.

A last pass over the whole generator once the megastructures are in: does everything land together, on every family, with every trait, in the composed export? The user's eye leads; the open "for the user's eye" lists in the session write-ups are its agenda.

> **Frosting: default to none.** "Purely machine, no dirt" is the stronger
> aesthetic position and should be the starting point. The one legitimate use
> is not soil but **deliberate terraforming** — an engineered biosphere on a
> manufactured substrate, which reads as different from a planet's soil
> precisely by being *too even and too clean-edged*. That is expressible in the
> existing knobs (very high `smooth`, near-zero `patch`, low `bleed`, so it
> sits on the deck rather than weathering into it). An option if the story
> wants it, not a plan. [PROGRESS.md](../PROGRESS.md) D22.

### Building on the climate system

See [climate-foundation.md](climate-foundation.md) for the full contract.

**A machine world's relationship to its star is the point, not a side effect.**
Every megastructure in the catalogue exists to do something about incident
energy — collect it, radiate it, block it — so `tempAt` and `coverAt` are what
these elements are *for*. That is a much better reason for a radiator fin or a
sun-shield to be drawn than "it looks technical".

- **Radiators, shades and collectors should respond to the field.** A structure
  in a hot orbit carries more radiator area; one in the dark carries less and
  more of whatever keeps heat in. One parameter, a visible difference, no new
  branch.
- **Star activity is the shielding argument.** A hull under a violent star
  should show hardening — and `coverAt` already scours anything exposed, so an
  unshielded deck weathering while a shielded one does not comes free.
- **An artificial body may legitimately override its climate**, and that is the
  one place in the project where "the picture is painted rather than emerging"
  is defensible: a machine world's temperature is a *design choice by its
  builders*. If that is built, it should be an explicit declared override with a
  comment saying why the usual rule is being suspended — not a quiet special
  case.

---

## Phase 10 — Release

*Next, Session AO. The brief is the user's [RC prompt to make releases easier.md](../RC%20prompt%20to%20make%20releases%20easier.md); the session prompt built on it is at the end of [session-an-close-9c.md](../progress/session-an-close-9c.md).*

**Settled in Session AN (D324–D328):** v4.0, replacing v3.x on the [existing itch.io page](https://reactorcore.itch.io/celestial-cutaway-planet-interior-generator), free in the browser with an identical paid offline zip; a short custom licence; `archive/` renamed `old wip/`; branding in the Help modal only.

- Help finalized, v4.0 throughout, `LICENSE`
- `README.md`, `guide.md`, `promo.md`
- A wholly new `promo/`: screenshots, montages and collages, stamped feature screenshots, thumbnail and cover
- `build_release.bat` producing `dist/celestial-cutaway/` and the two zips
- The clean-up
- Afterwards, in its own session: a YouTube trailer
