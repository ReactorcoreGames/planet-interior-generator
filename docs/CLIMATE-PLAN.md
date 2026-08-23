# The Climate System — design plan

> ## ✅ BUILT — Session F. Steps 0–7 are all complete.
>
> This document is now a RECORD OF THE DESIGN rather than a plan of work. What
> shipped, what it was verified against, and the six defects found on the way
> are in [PROGRESS.md](PROGRESS.md) **D40–D46**; the controls are documented in
> [PARAMETERS.md](PARAMETERS.md) and the emergent-cap mechanism in
> [celestials/solid-bodies.md](celestials/solid-bodies.md).
>
> **`node test/climate.mjs` is the harness.** It holds every numeric check this
> plan specified, plus the renders — and `_cap-crop.png` is the view to judge
> caps from, because at whole-disc scale a correct cap reads as a faint rim.
>
> Three things this plan asked for turned out differently than written, and the
> reasons are worth reading before changing any of it: the latitude term must be
> CENTRED rather than subtracted (D41), the ice colour and the snowline must
> read ONE threshold (D42), and the cap-edge smoothness bound has to be measured
> against the shoreline rather than picked in advance (D43).

*Written at the end of Session E, when Step 0 was built and Steps 1–7 were not.*

**Read [PROGRESS.md](PROGRESS.md) D27, D35, D36 and this document's "What was
already decided" and "Settled decisions" sections before writing code.** This
design deliberately re-uses a mechanism the project already has and deliberately
avoids a shape the project already rejected.

---

## How to run this session

**Build the steps in order, and verify each before starting the next.** The
verification lines are not a formality: this project's recurring failure is work
that is computed correctly and drawn invisibly — an invisible film, invisible
speckle, a dead snow zone that went unnoticed for a whole phase. Every step
below has a numeric check for exactly that reason.

**Step 1 is the one to get right.** The baseline arithmetic
(`Starlight + Interior heat`, neither dominating) is what every later step tunes
against. Settle it, verify the four-case table in "Settled decisions 2", and
only then move on.

**The work is not done until `npm test` is green** (`libcheck`, `doccheck`,
`sweep`, `domtest`) and the visual harnesses have been looked at — `npm run
zones` for the angular behaviour, `npm run sheet` for the spread of outputs.
Density and climate are both properties of the *spread*, not of one render.

**Anything the user should see, show them.** For visual changes, render and let
them look rather than asserting it works.

Steps 5 (Axial tilt) is optional; everything else is in scope.

---

## The problem, in one paragraph

Tidal locking gave the generator a *thermal field* — `tempAt(angle)` — and it
works: a locked world reads as scorched on one face and frozen on the other. But
it exists **only while the Tidal locking dial is above zero**. An ordinary
rotating planet has no thermal structure at all, so it can never have polar
caps, its oceans can never freeze, and — as measured below — its snow zone is
mathematically unreachable. The frosting system authors four zones and one of
them, `frostPeak`, is dead on every unzoned body.

---

## Measured findings (the evidence this plan rests on)

All figures from the real code, Session E.

### 1. There is no latitude concept anywhere

`grep` for `latitude`, `polar`, `axialTilt`, `insolation` across `js/` returns
nothing but comments. The only angular structure in the generator is the
tidal-lock axis. **A cross-section's angle is not latitude** — the body is drawn
pole-up (`view.at`: angle 0 = up, clockwise), so the vertical extremes of the
disc *are* the poles and the horizontal extremes *are* the equator. That is a
usable mapping and nothing currently uses it.

### 2. At lock 0, no thermal field exists at all

```
details.zones   = null
details.climate = null
```

`Zones.build` returns `null` when intensity is 0 — deliberately, so an unzoned
body costs nothing (D27). The consequence nobody intended: `tempAt`, `snowAt`,
`coverAt` and `airAt` are all absent, so there is no "where is it cold" to ask.

### 3. The snow zone is unreachable on **every** unzoned world

Swept 200 bodies (40 seeds × 5 ocean depths) at lock 0:

| oceanDepth | bodies showing any snow | best peak-zone weight |
|---|---|---|
| 0.0 | 0/40 | 0.00 |
| 0.2 | 0/40 | 0.00 |
| 0.4 | 0/40 | 0.00 |
| 0.6 | 0/40 | 0.00 |
| 0.8 | 0/40 | 0.00 |

**0/200 (0%).** The cause is a unit mismatch plus a compounding offset:

```
oceanDepth=0.0: h ranges -0.268 .. 0.274   SNOWLINE=0.42  UNREACHABLE
oceanDepth=0.4: h ranges -0.384 .. 0.158   SNOWLINE=0.42  UNREACHABLE
oceanDepth=0.9: h ranges -0.729 .. -0.188  SNOWLINE=0.42  UNREACHABLE
```

- **`h` is damped, `span` is not.** `draw/film.js` computes elevation as
  `terrain.at(a) * relief` where `relief` is `SILHOUETTE_RELIEF` (0.55), then
  normalizes by the **undamped** `terrain.range()`. The effective threshold is
  therefore `0.42 / 0.55 ≈ 0.76` of the true range.
- **Sea level sits mid-range**, so "above sea level" has already spent half the
  range before the snowline is measured.

Even with the damping removed, max `h` is 0.382 — still under 0.42. **This is a
bug independent of the climate feature and should be fixed first**, because a
climate system that lowers the snowline will otherwise be compensating for a
scale error rather than modelling anything.

### 4. Nothing can freeze the ocean

The deferred fluid is drawn as `fillLayer` → `paintZoneBand` → `drawLayer`.
`paintZoneBand` asks only `shiftAt()`, a generic HSV delta; it never consults
`tempAt` or `surfaceStateAt`. Measured on a fully locked world:

```
ocean colour: h=226 s=0.56 v=0.25
  at  90deg (temp 0.99, boiled): dh=-9.3 ds=+0.093 dv=+0.087
  at 270deg (temp 0.17, frozen): dh=+7.4 ds=-0.056 dv=-0.075
```

The frozen face gets a **7% darkening**. There is no ice sheet, no surface
crust, no shift toward white. The user's report is exactly right.

---

## What was already decided (do not re-litigate)

These are settled and this plan conforms to them.

| Decision | Where | Consequence for this plan |
|---|---|---|
| **`ice-caps` as a trait is CUT** | TRAIT-SYSTEM.md, solid-bodies.md, D27 | Caps must **emerge from deposition**. A drawn `wedge` "could only ever be a polygon laid on top of the terrain". Never reintroduce a cap primitive. |
| **Tidal locking is an axis, not a trait** | D27 | It changes *values*, not the stack. Anything else that only changes values is also an axis. |
| **Zones perturb, never replace** | zones.js rule 1 | Every climate figure must be a delta/multiplier on what the body rolled. |
| **The picture emerges; it is not painted** | zones.js rule 2 | A cap must be a consequence of a lowered snowline, not an HSV wash. |
| **draw/ never learns what a zone is** | D23 | The renderer receives plain functions of angle. |
| **Resolution independence** | project rule | Counts and thresholds never scale with pixels. |

---

## The design

### Core idea

**Generalise the thermal field from "a thing tidal locking has" to "a thing
every body has", and let tidal locking be one of several contributors to it.**

Today:

```
tidalLock > 0  →  Zones.build(...)  →  tempAt(angle)   [else nothing]
```

Proposed:

```
Climate.build(archetype, body, params, seed)  →  always returns a field
    ├── baseline      from Starlight + Interior heat
    ├── latitude term from |cos(angle)| — poles colder than equator
    └── zone term     from the tidal-lock axis, when the dial is up
```

One field, three contributors, additive. `tempAt(angle)` then answers on every
body, and the existing consumers (frosting colour, `climate` summary) keep
working unchanged — they simply start receiving a field where they used to
receive `null`.

### The new parameters: Starlight, and the star itself

Three controls, and the first is the important one.

| Control | Range | Meaning |
|---|---|---|
| **Starlight** | 0–100% | How much light and heat reaches the body. 100 = seared (Mercury/Venus), ~55% = temperate (Earth), low = frozen (Europa/Pluto), **0 = no star at all — a rogue world in the void** |
| **Star colour** | choice | The spectral character of that light: red dwarf → sunlike → blue giant. Tints the light and shifts how much of it is harsh |
| **Star activity** | 0–100% | How violent the star is. Drives radiation hazard and surface scouring, not temperature |

**Why "Starlight" and not "Orbital distance".** The user's objection is right and
worth recording: the quantity is not really a distance, it is *how much a hotter
neighbour is heating this body* — which for a moon may be its planet, and for a
rogue world is nothing at all. Naming the **received quantity** rather than the
geometry sidesteps all of that, matches the existing controls (Ocean depth,
Interior heat — each names a quantity, not a mechanism), and stays two words.

**It runs the intuitive way round.** More Starlight = hotter. The first draft had
distance, where more meant colder; a slider whose label and effect run in
opposite directions is a papercut on every future reading of the code.

**0 means no star.** Like Ocean depth 0 removing the ocean, Starlight 0 is a
genuine state rather than a small number: a rogue planet drifting unlit, its
surface temperature set entirely by its own interior heat. The low end of the
range should ease into this rather than snapping (the same `fade` treatment
Ocean depth uses), so there is a band of "a distant, feeble sun" before the dark.

### On star types — a few numbers, not a catalogue

The user asked whether the *kind* of star could matter, beyond distance alone.
**Yes, and the shape of the answer matters more than the feature.**

**Do this:** a star is a small set of parameters that feed fields that already
exist.

| Star property | Feeds | Visible result |
|---|---|---|
| colour temperature | the palette's light cast, `tempAt` baseline | a red-dwarf world is dimmer and ruddier; a blue-giant world is harsh and bright |
| activity | radiation hazard, `coverAt` scouring | an active star strips cover and worsens the hazard rating |
| output | `tempAt` baseline, alongside Starlight | a bright star at distance can equal a dim one close in |

**Do NOT do this:** a list of star *types*, each with bespoke coded effects —
flare cycles, magnetic interactions, per-type tidal heating. That is exactly the
failure D27 recorded: a menu of special cases where a parameter would do. If
"neutron-star companion" ever needs to be a thing, it should be reachable as
extreme values of the same few numbers, not as a new branch.

**The test to apply** (TRAIT-SYSTEM.md's third): does a star type change the
layer *stack*, or only *values* in it? Only values. So it is an axis — or rather
a small group of them — and never a trait.

**Scope note:** all three are in scope for the implementing session. Build
**Starlight first and verify it alone** — it is what makes caps conditional, and
the baseline arithmetic is what everything else tunes against. Star colour and
Star activity land after it, in that order. The sequencing is about keeping each
step's verification meaningful, not about deferring the work.

### The latitude term — how caps emerge

The body is drawn pole-up, so latitude is directly available:

```
polarity(angle) = |cos(angle)|      1 at the poles (up/down), 0 at the equator
```

The climate field subtracts a polar cooling term scaled by that. Caps then
appear **for the same reason the locked world's night cap appears**: the
snowline drops in a region, and the frosting's existing deposition model does
the rest. No cap code, no wedge, no new primitive — which is precisely what D27
demanded.

Because it is a smooth `|cos|` rather than a hard band, the cap edge is a
gradient and pools into valleys naturally.

### Axial tilt (recommended, small)

A second control, `Axial tilt`, doing two jobs cheaply:

- At 0 the two caps are symmetric.
- Turned up, one cap grows and the other shrinks (a seasonal snapshot).
- At extreme values the *poles* become the hot regions — an Uranus-like world,
  which is a genuinely different picture from one parameter.

This is optional for the first pass. Note it, build it if time allows.

### When the system must NOT produce caps

The whole point of Starlight. The cap term is gated by the baseline:

| Baseline temperature | Behaviour |
|---|---|
| very hot (Venus/Mercury) | polar term cannot reach freezing — **no caps at any latitude**. A hot world's poles are merely *less* scorched |
| temperate (Earth) | caps at the poles, ice at high latitude, open ocean at the equator |
| cold (Europa/Pluto) | the whole body is frozen; there are no "caps" because there is no contrast |

This falls out of the arithmetic — `clamp(base + latitude + zone)` — rather than
needing a rule. **A hot world gets no caps because its baseline is above freezing
everywhere, not because something switched the feature off.** That is the same
"emerges rather than painted" principle.

---

## Freezing the ocean

Two visible states, both currently missing, and they are different things.

### a. Sea ice — a surface layer on the water

Where `tempAt` is below freezing **and** there is ocean, the sea grows an ice
sheet on its **outer** edge. This is a real geometric band, not a tint:

- Thickness scales with how far below freezing (a thin rime → a thick shelf).
- It sits at the ocean's top surface, following the same angular sea level the
  ocean already has.
- It is **opaque and pale**, so it reads as ice rather than as water.

Draw it in the deferred fluid pass, immediately after the ocean fill, clipped to
the same region. The ocean's top boundary function already exists (`topFn` in
`scene.js`); the ice band is that curve inward by its thickness.

### b. The water itself darkens and desaturates

Cold water reads darker and less blue-green than warm water. This is the
`paintZoneBand` path, but keyed to `tempAt` instead of the generic `shiftAt`.

### The frozen-over case

Where the whole ocean is frozen (a cold baseline), the sea ice covers the entire
circumference and the body reads as an ice world — which is correct, and is the
Europa case arriving for free.

**Interaction with the frosting:** the frosting already claims the shoreline and
shallow zones as ice on a cold face (`frostShallowCold`, `frostDeepCold`). The
sea ice sits *above* that, on the water. Both should be present: frosting is
what is on the ground, sea ice is what is on the sea. Verify they do not
double-paint into a single flat white band — if they do, the sea ice wins on the
water and the frosting stays on the land.

---

## Exotic ocean colour

*Raised by the user in Session E. Measured, and the constraint is real.*

### The measurement

Across **300 randomly seeded bodies** with the primary hue rolling freely:

```
ocean hue: min=160  max=256  median=208     (of 360 possible)
ocean sat: 0.42 .. 0.73
ocean val: 0.18 .. 0.38
```

| Hue band | Bodies |
|---|---|
| spring 150–180 | 25 |
| cyan 180–210 | 138 |
| azure 210–240 | 119 |
| blue 240–270 | 18 |
| **everything else** | **0** |

Three separate limits, and all of them matter:

1. **Hue is authored to `[186, 232]`** in `archetypes.js` — 46° of the wheel.
   The ocean is the ONLY layer with an absolute `hue` range; every other layer
   derives freely from the anchors.
2. **The user cannot override it.** `primaryHue` only *leans* the result by
   `hueLean: 0.16`. Setting the primary to red (0°) still yields a blue ocean
   at 243°.
3. **Value caps at 0.38**, so no ocean can ever be pale, white or bright —
   a separate ceiling from the hue one, and easy to miss.

### Why the range exists — do not simply delete it

`gen/palette.js` records the reason, and it was a real failure:

> "Without this, an ocean on a rust-coloured world came out brown, which is the
> single thing that most stopped these reading as planets."

The narrow range is a deliberate fix. **The user's proposed shape — a checkbox,
off by default — is therefore the right one**: it keeps the realistic default
that solved the original problem and makes the exotic case opt-in.

Note also that this is the *same failure mode* the frosting hit from the other
direction: `film` was authored to 70–145° and every world came out the same
ochre, so its range was removed entirely (see the `film` comment in
`archetypes.js`). Two layers, opposite errors, and the lesson is that **an
authored hue range is a strong claim that needs a stated reason.** The ocean has
one; the frosting did not.

### The design

| Control | Type | Default | Effect |
|---|---|---|---|
| **Exotic oceans** | checkbox | **off** | When off, the current `[186, 232]` range applies. When on, the ocean's hue rolls anywhere on the wheel and its value ceiling lifts |

When enabled:

- **Hue rolls freely**, exactly as the frosting family already does.
- **The value ceiling lifts** from 0.38 to roughly 0.75, so pale, white, milky
  and near-black seas become reachable. Without this, "exotic" would only mean
  "a dark sea of a different hue", and yellow/white/grey would still be
  impossible.
- **`hueLean` drops to ~0** — the whole point is a sea that is *not* derived
  from the body's primary.

**Keep the contrast rule.** Whatever hue the sea takes, it must still read as
distinct from the crust beneath it and the frosting under the water. This is the
same relational constraint the frosting uses (D19/D20) and it is what allows the
hue to roam without any world losing its ocean into its rock.

### The Star activity coupling — the user's idea, and it is a good one

The user suggested that the climate system could push ocean saturation and
brightness based on how "radioactive" the starlight is. **This is worth
building, and it should be gated on the checkbox.**

| Exotic oceans | Star activity | Result |
|---|---|---|
| off | any | the ordinary blue-green sea; activity does not distort it |
| on | low | an exotic but calm colour |
| on | high | pushed saturation and brightness — a sea that looks chemically wrong, lit by a violent star |

This gives the checkbox a *reason to exist inside the simulation* rather than
being purely a taste switch: a strange sea becomes a consequence of a strange
star. It also keeps the realistic default genuinely realistic, since an active
star cannot distort a sea the user has asked to keep plausible.

**Sequencing:** build the checkbox with Step 2c (Star activity), not before —
the coupling is most of its value and the two want verifying together.

*Verify:* with the box off, the 300-body hue distribution is unchanged from the
table above. With it on, hues appear in all twelve 30° buckets and the value
range reaches past 0.6. Sea and crust never collide in hue-and-value at once.

---

## Implementation order

Each step is independently verifiable. Do them in order; do not merge them.

### Step 0 — Fix the snowline scale bug ✅ **DONE (Session E)**

Already fixed, ahead of the rest of the plan, because every later step's tuning
would otherwise sit on a broken scale. `draw/film.js` now measures the span in
the same units as the elevation:

```js
var span = Math.max(1e-6, (range.hi - range.lo) * relief);
```

Result: 40% of sampled bodies now show snow (was 0%), at 1–6% of the
circumference — mountain-top capping, not a white-over. Waterworlds still get
none. Locked worlds unchanged. See PROGRESS.md D36.

**Note for the implementing session:** snow currently appears only on dry,
high-terrain worlds, because it is still a pure ELEVATION test. That is correct
and is exactly the gap the climate system fills — Step 3 adds the latitude term
that lets a temperate ocean world grow caps at its poles.

### Step 1 — `CC.Climate`, always present

New file `js/gen/climate.js`. Owns the baseline and the latitude term, and folds
in the zone field when one exists.

- `tempAt(angle)` — 0..1, always available
- `surfaceStateAt(angle)` — the five states from D35
- `isFrozen(angle)`, `isBoiling(angle)` — convenience predicates

`gen/zones.js` keeps `tempAt` for the zone contribution; `Climate` composes it.
`details.climate` is rebuilt from `Climate` so it exists on every body.

**Verify:** `tempAt` is finite and sensible at lock 0; a Venus-like body reads
hot at every bearing; an Earth-like body is colder at 0°/180° than at 90°/270°.

### Step 2 — Starlight, then Star colour, then Star activity

Three controls, added in that order, each verified before the next.

**2a. Starlight.** Slider + `randomize` entry + PARAMETERS.md row. Feeds the
Climate baseline.

*Verify:* sweeping it moves `climate.mean` monotonically; at the hot end no
bearing is ever `frozen`, at the cold end none is ever `boiled`; at 0 the
surface temperature is a pure function of Interior heat.

**2b. Star colour.** A spectral choice (red dwarf → sunlike → blue giant) that
tints the light. It shifts the palette's anchors and nudges the temperature
baseline — a blue giant delivers more energy per unit of Starlight than a red
dwarf does.

*Verify:* the same seed under three star colours produces three visibly
different worlds that are still recognisably the same world. This is the
"perturb, not replace" rule applied to light.

**2c. Star activity.** How violent the star is. Drives radiation hazard,
`coverAt` scouring, and — see the ocean section below — how strange the water
looks. **Not temperature:** an active star is not necessarily a hot one, and
conflating the two would make the control redundant with Starlight.

*Verify:* activity changes cover and hazard while leaving `climate.mean`
essentially untouched.

### Step 3 — Caps emerge in the frosting

No new drawing code. The frosting already reads `snowShift`; Climate now
supplies a latitude-driven one on every body.

**Verify visually and numerically:** an Earth-like world shows caps at top and
bottom, absent at the sides; a Venus-like world shows none; the cap edge is a
gradient, not a contour.

### Step 4 — Sea ice

The new geometric band described above.

**Verify:** a cold world's ocean carries a visible pale sheet; a temperate
world's does so only near the poles; a hot world's never. Check the sea ice
never exceeds the atmosphere (the same clamp class as D31/D34).

### Step 5 — Axial tilt *(optional)*

Asymmetric caps and the Uranus case.

### Step 6 — Exotic oceans

The checkbox, the lifted value ceiling, and the Star activity coupling. See the
"Exotic ocean colour" section above for the measurements and the rationale.

Do it after Step 2c so the activity coupling can be built and verified in one
piece.

### Step 7 — Docs

PARAMETERS.md (new controls: Starlight, Star colour, Star activity, Exotic
oceans), HAZARDS.md (climate contract already added in D35
— extend the state table if new states appear), PROGRESS.md (decisions), and
`solid-bodies.md` (note that caps now emerge from climate, closing the loop D27
opened).

---

## Risks and things to watch

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Every body becomes an ice world** | The baseline is new and untuned; a wrong midpoint makes caps universal | Sweep `climate.mean` across seeds before tuning anything visual; target most randomised planets landing temperate |
| **Caps on bodies that should not have them** | A star or gas giant inheriting a polar term would be nonsense | Climate is archetype-declared, like `axes`. A body that declares no climate spec gets a flat field |
| **Double-painting ice** | Frosting ice + sea ice in the same place reads as one flat white blob | Explicit rule: sea ice on water, frosting on ground; verify at the shoreline |
| **The snowline fix changes every existing render** | Step 0 alters worlds that currently look fine | Expected and acceptable — the zone is currently dead. Compare before/after on a contact sheet |
| **Starlight and Interior heat fight each other** | Both feed the baseline; a wrong balance makes one irrelevant | Neither may dominate: verify a cold-orbit/hot-core world is genuinely warm AND a hot-orbit/dead-core world is genuinely hot |
| **`|cos|` gives two caps always** | Even a tidally locked world would grow polar caps on top of its night cap | Correct, and physically fine — but check the two mechanisms compose legibly at lock 100% |
| **Tuning by eye** | This project's recurring failure (invisible film, invisible speckle, dead snow zone) | Every step above has a numeric verification. Use them |

---

## Settled decisions (answered by the user, Session E)

These were open questions in the first draft. **They are now decided — implement
them, do not reopen them.**

### 1. Starlight affects the atmosphere — yes

A close-in world loses air to escape; a distant one freezes it out. `airAt`
already exists as a multiplier, so this is a data change rather than new
machinery. Keep it gentle: the atmosphere's *thickness* is still mostly the
layer's own roll, with Starlight biasing it.

### 2. Interior heat DOES reach the surface

**Explicitly wanted:** "a planet with an unusual hot core that despite the
planet's far distance from a star, its own heat is able to sustain a warm or
even hot surface."

So the baseline is a genuine sum of two independent sources:

```
baseTemp = f(Starlight) + g(interiorHeat)
```

Neither may dominate. Both of these must be reachable and must read correctly:

| Starlight | Interior heat | Result |
|---|---|---|
| low | high | a warm world in the dark — volcanic, lit from within |
| high | low | a baked dead rock |
| 0 | high | **a rogue planet kept warm by its own core** — a genuinely good sci-fi body, and the case that proves the sum works |
| 0 | 0 | frozen solid, the deep-void case |

This is the arithmetic to settle *first* in Step 1, because everything else
tunes on top of it.

### 3. The ocean layer does NOT shrink when frozen

**Decided: leave the thickness alone.** The user's reasoning is worth keeping
verbatim, because it is a design principle and not just a preference:

> "since these are scifi planets, the oceans might actually be other liquids
> than water that dont shrink or expand. The author using the program would
> tweak what ocean height they want for what they need."

Water expanding on freezing is a quirk of water. A generator of *alien* oceans
should not bake it in, and the Ocean depth slider is already the author's
control over that. Freeze it in place: sea ice on top, no volume change.

### 4. Starlight 0 is a real state — the rogue planet

**Decided: it behaves like Ocean depth 0.** Below some threshold the body has no
star at all — drifting unlit in the void, its surface temperature set entirely
by Interior heat. Ease into it rather than snapping (Ocean depth's `fade`
pattern), so there is a band of "a distant, feeble sun" before true dark.

### 5. Ice caps were never unwanted — only the wedge was

Worth stating plainly so no future session misreads D27. Cutting `ice-caps`
removed a **drawn polygon primitive**, not the concept. The user's own framing:
caps should come from "planetary detail/structure" rather than "the trait system
in the old primitive way". Step 3 of this plan is exactly that, and it is the
whole reason caps must emerge from the snowline rather than be stamped on.

---

## Summary for a fresh session

- The thermal field exists but only under tidal locking; **generalise it**.
- **Fix the snowline scale first** — the snow zone is dead on 100% of unzoned
  bodies, and everything else is tuning on top of that.
- Caps must **emerge from deposition**; the project already cut the drawn
  version and the reasoning still holds.
- **Starlight** is the control that makes cold regions conditional, which is
  what keeps Venus and Mercury correct. 0 means a rogue world with no star.
- **Interior heat also warms the surface**, so a hot-cored world far from any
  star is still warm. The baseline is a sum of the two, and neither may dominate.
- Sea ice is a **geometric band on the ocean's outer edge**, not a tint.
- **Exotic oceans** is a checkbox, off by default: the current blue-green range
  is a deliberate fix for a real failure and stays the default. Turning it on
  frees the hue AND lifts the value ceiling, and couples to Star activity.
- Verify every step numerically. This project's failures have consistently been
  things that were computed correctly and drawn invisibly.
