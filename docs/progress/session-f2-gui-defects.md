# Session F, Pass 2 — defects found on the real GUI

*Moved out of PROGRESS.md to keep that file small. Four defects the user
found using the actual app, not the test suite (D47–D49).*

---

*All four reported from a screenshot of the running app. Every one was
reproduced and measured before anything was changed, and every one is now
asserted in `npm run climate` so it cannot come back quietly.*

### D47 · An atmosphere that CLEARS the ground may still not COVER it

**Decided:** Session F. **Where:** `js/draw/scene.js` (`AIR_FLOOR`, `airFn`).

The user reported terrain standing outside the atmosphere — an old issue that
predates the climate work. Reproduced exactly on their settings.

**Three probes said there was no bug, and all three were wrong in an
instructive way.** A body-space breach probe reported 0.00000 at every bearing
on ten configurations, because there genuinely is no breach: `airFn` already
floors the gas at the ground. An isolated-frosting probe reported the frosting
adding 0.0px to the outer edge. A no-atmosphere comparison reported the body
edge unchanged — because suppressing `fillOutward` leaves the atmosphere's
detail elements and zone tint still painting, so "body edge" included haze.

**What the pixels actually showed**, once every pass except the gas was
suppressed: the atmosphere's alpha FALLS OFF across its own column, so clearing
the ground geometrically is not the same as covering it visibly. On the
collapsed face the ground sat at **t = 0.73 of the column**, where
`falloffAlpha` is already down to 0.18 and, after the `screen` composite, the
gas outside the body came to **zero rendered pixels**. On the inflated face the
same ground sat at **t = 0.33**, where alpha is 0.68. Same geometry, same
clearance, completely different picture.

Two fixes:

1. **The floor accounts for the frosting and the sea bulge**, not just the
   rock. Both are drawn AFTER the gas and paint over it. Measured, the drawn
   solid reached 0.0306 above the atmosphere's inner edge while the floor
   believed the ground was 0.0306 lower.
2. **The floor is a POSITION IN THE COLUMN, not a clearance.** `AIR_FLOOR`
   holds the ground at or below 0.55 of the gas column, which is where the
   falloff still has weight. Measured after: the faintest gas over the ground
   is 52–57 luminance on both an unzoned and a fully locked world.

> **The lesson, and it is D30's with the sign flipped.** D30 established that a
> statement about REACH must be drawn as geometry rather than as compositing.
> The converse also holds: **a requirement about VISIBILITY cannot be satisfied
> by geometry alone**, because what the eye receives is the geometry times the
> falloff. Both halves have to be checked against rendered pixels.

### D48 · The seam trap, for the fourth and fifth time — now asserted

**Decided:** Session F. **Where:** `js/draw/zonepaint.js` (`paintSeaIce`
rewritten), `js/draw/film.js` (`SEAM_OVERLAP`), `test/climate.mjs`.

The user reported spokes in the sea ice and "something like spokes, but not
exactly" in the frosting. Both were real, both were the same defect, and the
second one **predates the climate work** — it has been in the frosting since
Phase 3.

**It is measurable, and the measurement is what makes it assertable.** Sample a
ring through the band at fine angular resolution and take the Fourier power at
exactly the segment period; a seam spikes there and nowhere else.

| Band | Before | After | Baseline |
|---|---|---|---|
| sea ice (360 quads) | **1.522** | 0.079 | 0.061 |
| frosting (900 quads) | **0.822** | 0.055 | 0.133 |

**Two different fixes, because the two bands have different constraints.**

- **Sea ice became ONE CONTINUOUS RIBBON** — outer edge forward, inner edge
  back, closed once, filled once — drawn in a few nested thickness bands so the
  gradient survives. It has no per-bearing colour requirement, so nothing is
  lost.
- **The frosting could not**, because it genuinely needs per-segment colour:
  four zones blending around the circumference. It gets a **hairline overlap**
  instead.

**The overlap had to be swept, not guessed.** Power at period 900 against the
overlap fraction: 0.00 → 0.822, 0.02 → 0.504, 0.04 → 0.241, **0.06 → 0.014**,
0.08 → 0.266, 0.14 → 0.940, 0.25 → 1.896. A genuine minimum with the artifact
rising steeply on *both* sides — too little leaves the antialiased gap, too much
doubles the alpha into a BRIGHT seam. A first attempt at 0.6 of a segment made
it three times worse than doing nothing.

**Which way the seam runs is not obvious and must be measured.** A phase probe —
mean luminance as a function of position within one segment — showed the
frosting's seams were **dark** (gaps), which is why overlap was the right
remedy; `paintZoneBand`'s gradient wedges have the opposite problem and must
abut exactly. The same code shape needs opposite fixes depending on whether the
pieces are opaque or translucent.

> **`npm run climate` now asserts both.** Five occurrences is enough: the rule
> is *an angular fill must never expose an edge shared by two independently
> drawn pieces*, and it is now a number rather than a memory.

### D49 · A dead world's ocean freezes to the floor

**Decided:** Session F, at the user's question. **Where:**
`js/draw/zonepaint.js` (`iceFraction`, `solidAt`), `js/gen/climate.js`
(`polarDropFor`).

The user asked whether Starlight 0 with Interior heat 0 should freeze the ocean
solid rather than growing a thick surface sheet. **They were right and it did
not.** The ice capped at **68% of the sea's depth**, so a body with no star and
a dead core rendered a third of its ocean as liquid water under a lid — which is
not a frozen sea, and there is nothing down there to keep it liquid.

**Three separate causes, and only the first was the obvious one.**

1. **The thickness curve capped below 1.** Eased to level off, which is right in
   the middle of the range and wrong at the end of it.

2. **THE LATITUDE TERM WAS INVENTING HEAT.** D41 made the term centred so it
   redistributes rather than removes — correct on any world with a heat budget,
   and wrong at the very bottom. On a baseline of 0.04 it *added* 0.217 at the
   equator, lifting it to 0.256, **above the freezing line**: a world with no
   star and a dead core kept an unfrozen equatorial band. `polarDropFor` now
   eases the drop out as the baseline approaches the floor, so a world with
   nothing to move around is uniformly cold. That is both correct and the better
   picture — the deep-void case should read as evenly dead.

3. **The freeze-through threshold was measured against a value the system
   cannot produce.** `VOID_FLOOR` is 0.04, so `amt` tops out near 0.78 and never
   reaches 1.0; a ramp normalized against `1 - threshold` completed only a third
   of the way even at the coldest reachable bearing. It is now derived from the
   floor and normalized against the **reachable maximum**.

Measured after, and the gradient below the extreme survives intact:

| Case | ice fraction (min / mean / max) |
|---|---|
| deep void | **0.99 / 1.00 / 1.00** — frozen solid |
| faint sun, dead core | 0.58 / 0.73 / 0.88 — thick shelf |
| Europa-like | 0.00 / 0.30 / 0.78 — shelf over water |
| rogue + molten core | 0.00 / 0.00 / 0.00 — open ocean |
| temperate | 0.00 / 0.00 / 0.00 |

> **Two rules worth keeping.** A threshold measured against a value the system
> never actually produces is a threshold that never fires — the same shape as
> D31, where a clamp was measured against the wrong layer. And **a term that is
> correct across the middle of a range may be wrong at its edge**: centring the
> latitude term fixed the rogue-planet case (D41) and broke the deep-void one,
> and both had to be checked.

### The probe lessons from this pass

Three probes gave confident wrong answers before the pixels settled it, and
each failed differently:

- **A probe that changes two things cannot attribute what it sees.** The first
  sea-ice probe compared a cold render against a *warm* one and reported ~50,000
  changed pixels on a world whose sea can never freeze.
- **A probe that suppresses one pass may not suppress the effect.** Disabling
  `fillOutward` still left the atmosphere's details and tint painting, so the
  "no atmosphere" baseline had atmosphere in it.
- **A probe that reimplements its subject agrees with itself.** The ice-fraction
  probe carried its own copy of the formula and kept reporting the old numbers
  after the fix landed. `CC.ZonePaint.iceFraction` is now exported for the same
  reason `CC.Film.zoneWeights` was (D27).

**When a probe and the render disagree, the render is right.** All three of
these said "no bug" while a screenshot plainly showed one.

---

