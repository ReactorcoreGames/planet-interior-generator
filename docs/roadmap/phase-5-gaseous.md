# Phase 5 — Second family: gaseous

*Part of [ROADMAP.md](../ROADMAP.md). Goal: prove the architecture generalises.*

- `gas-giant` and `ice-giant` archetypes
- Cloud banding, storm curls, counter-rotating flow arrows
- Gaseous stat template
- **Frosting on the buried rocky floor** — sediment crushed under enormous
  pressure: high `smooth`, near-zero `patch`, thick and featureless. Cheap,
  because the envelope occludes most of it. **This is the first second-family
  consumer of the frosting stage, so it is where the zone table moves out of
  `draw/film.js` and into `colorProfile.layers.film.zones`** — see
  [PROGRESS.md](../PROGRESS.md) D22 for the full contract.

## Building on the climate system

See [climate-foundation.md](climate-foundation.md) for the full contract; this
phase's specific inheritance:

**Starlight is what makes a gas giant a particular gas giant.** The single most
valuable thing this phase can inherit is that **cloud species condense at
temperatures**, and the generator now knows the temperature. Ammonia, ammonium
hydrosulphide and water condense at different depths, and which of them is
visible is what separates a cold Jupiter-like banded world from a hot puffy one
with its cloud deck driven deep — that is a real difference from one existing
parameter, and it is the same "emerges rather than painted" move the caps used.

- **Declare `climate` with a LOW `latitude`, or omit it.** A gas giant's bands
  are driven by rotation rather than by insolation, so a strong polar term would
  be wrong. Decide deliberately and write down which.
- **Band colours should read `chillAt` / `scorchAt`**, not a second threshold of
  their own (D42). A hot giant's deck is a different material, not the same
  material tinted.
- **Star colour tints the envelope most**, because the palette's star cast falls
  off with depth (D40) and the envelope is the outermost thing there is.
- **The buried floor's sediment takes its character from the baseline**, exactly
  as the planet's frosting does — and note D45: the aridity weights are
  calibrated for a *planet's* baseline range, so check them before reusing.

**Done when:** both render well, **nothing in `draw/` needed a
gas-giant-specific branch**, and **Starlight visibly changes which world you are
looking at** rather than only its stat card. If a branch was needed, that's a
design smell worth fixing now rather than at Phase 7.
