# Climate is a foundation, not a planet feature

*Part of [ROADMAP.md](../ROADMAP.md). Read this before scoping Phases 5, 6, 7
or 9.*

The climate system was built for the planet but it is not planet-shaped, and
every remaining family has surface or deposition work that should now
**inherit** from it rather than reimplement a piece of it.

`CC.Climate` builds a field on **every** body — there is no null path, which
was the whole point of D40 — and exposes plain functions of angle:

| Sampler | Answers |
|---|---|
| `tempAt(angle)` | surface temperature, 0..1 |
| `surfaceStateAt(angle)` | `boiled` / `hot` / `temperate` / `cold` / `frozen` |
| `chillAt` / `scorchAt` | how wintry / how burnt — **the single source for both the snowline AND the material's colour** |
| `snowShiftAt(angle)` | how far the snowline moves here, in terrain-range units |
| `coverAt(angle)` | how much surface cover survives the star |
| `isFrozen` / `isBoiling` | convenience predicates |
| `radiationHazard()` | for the hazard card |

## What a new archetype has to do

**Declare a `climate` spec, or deliberately omit one.** `latitude` is how
strongly the poles run colder than the equator. **An archetype that omits the
spec gets a flat field at its own baseline** — it still has a temperature
everywhere, it simply has no latitude to it. That is the correct answer for a
star and probably for a gas giant, and it is what stops either inheriting a
polar cap by accident.

## Four rules that now apply to every family

1. **Caps, rime, frost and ice are never drawn as shapes.** They emerge from a
   lowered snowline plus the existing deposition model. There is no cap
   primitive anywhere and there must never be one (D27, D42). Any family that
   wants ice anywhere gets it by having a cold field and a `snow` zone.
2. **One physical fact, one threshold** (D42). If a new family needs "is this
   frozen", it asks `chillAt` — it does not author a second ramp against
   `tempAt`. Two ramps meaning the same thing agree in the middle of their range
   and disagree exactly where the interesting bodies are.
3. **A statement about how far something REACHES is geometry** (D30, D44). Ice
   extent, atmosphere extent, envelope extent — draw the shape, never composite
   a tint and hope it reads as extent.
4. **Aridity, deposition character and colour all read the climate baseline**,
   not Interior heat alone. And **when a formula's input changes range, its
   weights are no longer calibrated** — D45 is the cautionary tale, where a more
   correct input made the output worse and nearly reinstated D19.

## What each remaining phase inherits

Recorded here so it is scoped rather than discovered. The per-family frosting
contract in [PROGRESS.md](../PROGRESS.md) D22 still stands; this is what the
climate system adds on top of it.

| Phase | Inherits |
|---|---|
| **5 · gaseous** | Starlight drives envelope temperature and therefore **which cloud species condenses at which depth** — the ammonia/water/methane banding that makes a gas giant read as a gas giant. Sediment on the buried floor takes its character from the baseline. Star colour tints the envelope, which is the layer most exposed to it |
| **6 · stars** | **Omit the `climate` spec.** A star is its own heat source and a polar cap on one would be nonsense. But `tempAt` still answers, and the stellar stat template should read from it rather than inventing a second temperature |
| **7 · moon** | The strongest inheritance case after the planet. Regolith is deposition; an airless body has **no shielding**, so `coverAt` scours it hard under an active star. Frozen volatiles at a cold moon's poles come free from the same snowline the planet uses |
| **7 · ice moon** | The subsurface ocean's existence *is* a climate statement — it is liquid because the shell insulates it. `tempAt` at the shell's surface and the ocean's temperature are different questions, and the archetype has to say so |
| **7 · asteroid** | Little to inherit; it has no surface to deposit on. But the hazard card still wants `radiationHazard()` |
| **9 · machine** | Not soil but **heat management**: `tempAt` is what a radiator fin or a sun-shield is *for*, which is a far better reason for those elements to exist than decoration |
