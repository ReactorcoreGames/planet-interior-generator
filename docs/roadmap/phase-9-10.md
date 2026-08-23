# Phase 9 — Machine worlds, and Phase 10 — Release

*Part of [ROADMAP.md](../ROADMAP.md).*

## Phase 9 — Machine worlds

*Deliberately last — the most speculative and least essential.*

- Megastructure traits on natural bodies
- `machine-world` archetype and its exclusive traits
- Accent colour system for artificial elements

Placed here because natural bodies must look right first. Megastructures are
additive delight, not foundation.

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

- `build_release.bat` producing a clean `dist/`
- itch.io packaging (works in an iframe)
- README with screenshots
- Example gallery
