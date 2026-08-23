# Phase 6 — Stars

*Part of [ROADMAP.md](../ROADMAP.md). Goal: the diagrammatic payoff.*

- `young-star` · `main-star` · `old-giant-star` · `dwarf-star`
- Convective vs. radiative treatment — the visual contrast that makes stellar
  cutaways readable
- **Prominences: 3–30 in size tiers** — the density showcase
- Corona, chromosphere, granulation
- Stellar stat template

> **No frosting on stars.** Granulation is convective churn; deposition is
> gravity pulling material into hollows, which is the wrong physics for a
> photosphere. *Loose heat plumes hovering over the surface* is a good idea but
> wants outward-falloff machinery — the atmosphere's, or v2's flare ribbons —
> not the frosting stage. [PROGRESS.md](../PROGRESS.md) D22.

## Building on the climate system — mostly by declining it

See [climate-foundation.md](climate-foundation.md) for the full contract.

**A star declares `climate: { latitude: 0, starlit: false }`**, and those two
words are most of what this phase inherits.

- `latitude: 0` (or omitting the spec) gives a flat field: still a temperature
  everywhere, no latitude to it, and therefore no possibility of a polar cap on
  a star. That is the risk D40 declared the spec in order to mitigate.
- `starlit: false` removes the incident-starlight term, because a star is not
  warmed by some *other* star — for a star that term is not merely small, it is
  the wrong idea. It also removes the Star colour tint, so a star cannot be
  temperature-independent of that dropdown while still being coloured by it.

Both are already built and asserted (D50, `npm run climate` → **ARCHETYPE
ESCAPE HATCHES**), on a synthetic archetype precisely so this phase does not
have to discover them. **Use them; do not add a role-name branch to
`gen/climate.js`.**

Three things a star *should* inherit rather than reinvent:

- **The stellar stat template reads `tempAt`**, not a second temperature rolled
  beside it. HAZARDS.md's standing rule — the card and the picture read one
  source — applies to stars as much as to planets.
- **`CC.Climate.STARS` already exists**, and the star archetypes should be
  consistent with it. A `main-star` body and the `Star colour` a *planet* orbits
  are the same physical object seen from two sides; if a blue giant renders one
  way as a body and tints planets another way, that is a contradiction the tool
  will eventually be caught in. Prefer widening the shared table to authoring a
  second one.
- **Star activity is already a control**, and `PARAMETERS.md`'s old per-star
  **`Stellar activity`** row is struck through because of it. They are the same
  quantity: on a planet it scours cover and drives the radiation hazard, and
  here it should drive starspots, prominences and flare storms. **One control,
  two consumers** — a star body and the star a planet orbits are the same
  physical object seen from two sides, so a second axis would let the tool
  contradict itself. D27's lesson: a second parameter for an existing fact is
  how a system turns into a menu of special cases.

**Done when:** convective and radiative zones are instantly distinguishable, an
old giant shows its absurd core-to-envelope ratio, **no star has grown a polar
cap** (a one-line check against `climate.frozenFraction`), and **dragging
Starlight changes nothing about a star** — which is what `starlit: false` buys
and is worth asserting once for real rather than trusting.
