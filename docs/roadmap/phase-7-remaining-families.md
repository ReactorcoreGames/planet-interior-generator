# Phase 7 — Remaining families

*Part of [ROADMAP.md](../ROADMAP.md).*

- **Solid:** `moon`, `asteroid` (Voronoi interiors)
- **Compact:** `neutron-star`, `pulsar`, `black-hole` (exotic textures, the void)
- **Diffuse:** `nebula` (extreme wobble, translucency, highest element budget)

Nebula is the biggest test of the density system; asteroid is the biggest test
of the Voronoi work. Neither should need renderer changes.

**Frosting work lands here too** — full contract in
[PROGRESS.md](../PROGRESS.md) D22:

- **Moon: regolith.** The strongest case after the planet, because regolith
  genuinely *is* deposition — it pools in crater floors and is swept off rims,
  which `depositTop` already does. Two zones (rim / floor), high `smooth`,
  near-zero `patch`. Colour is *subtle mineral tint on grey*, not literal grey —
  an airless moon lands at the dry end of `arid` and desaturates for free, but
  the contrast floor (`host.s + 0.14`) is deliberate and stays. Author dullness
  by narrowing the ranges and the gaps between zones.

  **What the climate system changes here, and it is the `snow` flag.** D22 said
  to drop `snow` because "a dead airless body has no weather to deposit it".
  That reasoning was sound when the only way to get whiteness was a global
  aridity figure — but the field is angular now, and **cold-trapped volatile ice
  in permanently shadowed polar craters is real, is visually excellent, and is
  exactly what an emergent snowline produces.** So: keep `snow`, and let a warm
  moon's baseline deny it rather than an authored flag. A moon close to its star
  gets bare regolith because its field is warm; a distant one grows polar frost
  because its field is cold — the same conditional the planet's caps use.

  **An airless moon has no shielding**, so `coverAt` scours it hard under an
  active star. That is the strongest case in the whole roadmap for the Star
  activity control: a battered grey moon under a flare star should read as
  genuinely stripped.
- **Ice-shelled moon: terrain twice, facing itself.** The rock floor under the
  ocean gets an ordinary upward field with frosting settling into its trenches
  (brine pools); the ice shell's **underside** gets a second field with
  frosting depositing *upward* as accreted ice with coloured tips. Two frosted
  surfaces across a dark ocean — this is the payoff for the branch this doc
  already calls the best cutaway in the solid family. The upward case needs
  `direction: -1` on the zone spec: a mirrored deposit, a few sign changes, but
  real work worth scoping rather than discovering.

  **The climate system raises a question this archetype has to answer
  explicitly: there are two temperatures, not one.** `tempAt` describes the
  SHELL'S SURFACE, which is frozen — that is why there is a shell. The ocean
  beneath is liquid because the shell insulates it and because tidal or interior
  heat warms it from below. Those are different facts and the archetype must say
  so rather than letting one field answer both, or a Europa will come out either
  as a frozen ball with an inexplicable sea or as a warm world with an
  inexplicable crust.

  The pieces are already there: **Interior heat is the term that reaches the
  surface from below** (D41), and it is what keeps a rogue planet warm. An ice
  moon is the same arithmetic with a lid on it. Expect this to want a small
  addition to the climate spec — an insulation or sub-surface term — and treat
  that as the archetype declaring a second question, not as a special case.
- **Asteroid: probably skip.** A dusting competes with the Voronoi interior on
  a body that small. Revisit only if the mosaic turns out to want a frame.
