# Session T — the asteroid, and the Voronoi interior

**D175–D183.** Phase 7's second group. One new archetype, one new element
kind, one new parameter, four presets — and **six new general mechanisms**,
none of which names an archetype.

The done-condition for this group was a judgement rather than a measurement:
*"an asteroid's Voronoi interior reads as broken rock, not as a mosaic pattern
laid over a circle."* Most of the session was spent failing that bar in four
distinct ways and being shown each one by a render.

---

## D175 — an authored layer that was not a drawn layer

`docs/celestials/solid-bodies.md` gives the interior as *"0.88–0.92, runs to
the centre"*, and `js/data/archetypes/registry.js` says a layer **may omit
`frac` entirely** — "take what's left". Both statements are true. Combining
them deleted a layer.

`gen/structure.js` pass 1c resolves a fill layer as

```js
placed[i].outer = placed[i - 1].outer;
```

— the layer above's **outer** edge, not its inner one, because the layer above
has no thickness of its own to subtract (its thickness is defined by what sits
beneath it, which is this layer). So the mosaic began exactly where the shell
began, the shell came out **0.000 thick**, and pass 2's sliver drop removed it
from the stack.

Measured: the built body had **one** layer, `interior` at 0.000..1.000, on all
200 seeds. The doccheck passed throughout, because the authored table composes
fine.

This is **D122 in its purest form so far**. The previous instances were an
authored *number* differing from the drawn number; this is an authored *layer*
that was not a drawn layer at all — and nothing short of printing the stack
would have found it.

> **The general form:** "take what's left" only means something when the
> neighbour above is itself positioned against something else. A band above a
> fill layer is circularly defined. The spec's table already had the answer —
> 0.88–0.92 is where the mosaic *starts*, and "runs to the centre" describes
> its other end, which every innermost layer does for free.

## D176 — open question 1, discharged for the asteroid

With D175 fixed, two of the three predicted faults were real and one was not.
All four figures come from `test/_tmp/_asteroidstack.mjs`.

- **The hairline the phase doc predicted** survived the D175 fix by a second
  route: the shell rolled as thin as **0.0417** of the radius at full Layer
  thickness variation. The interior's range came down to 0.862–0.905; the
  shell's worst case over 480 bodies is now **0.0615**.
- **Nothing sits above the film when it is absent** (30% of the time by spec),
  so renormalization would have scaled the whole stack by up to 1.075. Fixed
  by authoring `outer-shell` **at** the surface and making `dust-film` a film
  rather than a band — which is what the spec calls it, and reuses the moon's
  frosting mechanism unchanged. The surface now lands at 1.0000 on every seed.
- **The wobble crossing was NOT a fault** at the corrected radii: 0/4800
  bearings. Worth recording as a measurement rather than an assumption,
  because the reasoning that predicted it was sound and simply wrong about the
  numbers — and because it *became* real later (D179).

## D177 — a slider that never varied is worse than one that is wrong

`Stats.gravityOf` ends in `clamp(..., 0.04, 6.0)`, and **0.04 g is above this
whole family's range** — the spec asks for 0.00001–0.02. Measured across the
entire radius range, every asteroid reported exactly `0.04000`: a 1 km rock
and a 500 km one had identical gravity.

Same failure the gaseous family hit from the other end when every giant pinned
against the 6 g ceiling. Widening the shared clamp was the wrong fix — the
floor protects the four families that need it.

So this family computes its own, and **uses real physics** rather than a
stylized calibration. That is not a departure from "believable beats
accurate", it is the one place where the two agree: a 5 km rock's escape
velocity really is about 6 m/s, really is comparable to how fast a person can
jump, and the card is built around saying so. Stylizing it could only make it
less striking.

Density is still read off the picture (D5) — it comes from the mosaic's own
void fraction, so dragging Cohesion moves the render and the number together.

**And the unit slip:** the formula gives m/s², and the first version printed
that straight — reporting a Vesta-sized body at "0.199x Earth" when the real
answer is 0.025. A factor of 9.81, entirely plausible on the card, caught only
by checking a body whose real value is known.

## D178 — a body can be too small to have its own heat

The shared climate model reported an asteroid at a comfortable **7 °C** on
default settings — beside a card describing it as airless, and against a spec
of −200 to +100 °C.

The model was not wrong. Interior heat at 0.4 is an ordinary setting and on a
planet it *should* warm the surface. The fault was that the archetype had no
way to say **it is too small to have any**: surface area goes as r² and volume
as r³, so a rock a few tens of kilometres across radiated everything it formed
with long ago.

`climate.retainsHeat` is the mirror of `selfHeated` — that one raises the
floor for a body that *is* a furnace, this one scales the term down for one
that never was. Declared, not detected (D27). At 0.12 the family now spans
−190 to +156 °C across Starlight, which is the spec's "depending on distance
from its star" stated as a mechanism.

> Interior heat stays a real control at any setting short of 0. On this body
> the honest reading of it is not "is it molten now" but "was it ever", which
> belongs mostly in the deep colour where `heatLean` puts it.

## D179 — roundness was a failure of frequency and angularity, not amplitude

**The user's correction, from looking at the app:** the asteroids were "very
round/circle like" and should be "wobbled, irregular and blob like".

The instinct was to reach for amplitude — `heavy` (0.065) to `extreme`
(0.140). Measured, the silhouette then swung from 0.892 to 1.010 of the
radius, a **12% variation**, and **still read as a circle**.

Amplitude was never the axis. fBm is smooth by construction, so more of it is
only a bigger smooth blob. Two things were missing, and neither was
expressible:

- **`boundaryFacet`** — an asteroid is a *fragment*, and its outline is the
  faces it broke along meeting at corners. A signed power curve creases the
  noise: flat plateaux joined by short steep runs. Plateau plus steep run is a
  face plus a corner.
- **`boundaryFreq`** — at the default 1.7 the noise puts only three or four
  broad lobes round the body, so even fully faceted it read as a *rounded
  triangle*. A collision fragment has a dozen faces.

With those two doing the work, `extreme` became a liability: the wobble's
0.171 swing compounded with the terrain's 0.111 and the dust film, correctly
following the combined excursion, threw **detached lobes clear of the body**.
Back to `heavy` with a `wobbleScale` of 1.5.

> **Three independent statements about an edge — how much, how angular, how
> many — and only the first had a vocabulary.** Reaching for more of the knob
> that was already wrong is the trap this records. The lesson generalises past
> boundaries: when a mark is wrong and the obvious control does not fix it,
> the missing thing is usually a different *kind* of statement, not more of
> the one you have.

## D180 — two large boundaries must not be independent

Raising the interior's boundary to match the shell's (necessary — a clean
circle of mosaic inside a lumpy crust reads as a **machined hole**, and the
mosaic's edge is the high-contrast one so it wins the read) reintroduced
D176's crossing for real: the interior poked **outside** the shell on 11.8% of
bearings, worst case 0.09 of the radius past it. The body turning inside out
on part of its circumference.

Each layer's noise is keyed by its own role, so every boundary is independent.
Two independent swings of similar size *will* cross somewhere; tuning cannot
fix that, only postpone it.

The physical reading fixes it. On a planet the crust and mantle are shaped by
different processes, so independence is right. On a **fragment** they are not:
the body is one broken lump and both surfaces follow its overall shape.
`boundaryShare` names another role whose noise a layer borrows — the two then
rise and fall together, may differ in amplitude and faceting, and **cannot
cross, by construction**.

0/4800 bearings, narrowest gap 0.0607, with both boundaries at full lumpiness.

> D158's shape: two marks each calibrated alone are not a calibrated pair. And
> the eye reads whichever boundary carries the most contrast, not whichever
> one is outermost.

## D181 — a surface described only by continuous fields is a polished one

**The user's second correction:** the Voronoi panels looked "too clean and
shiny", and needed "more gritty-ore look, mixed with dull rock".

The mosaic had three marks — a material fan, a shading gradient and a sheen —
and **all three are continuous fields across a cell**. A surface described
entirely by continuous fields is by construction a *polished* one: there is
nothing in the description that could read as roughness. No amount of
adjusting them could have fixed it.

The missing thing was not a value, it was a **kind of mark**. Each fragment
now carries its own grit: dark pitting and the matte of a fracture face, with
brighter mineral inclusions scattered among it. **Both polarities are
required** — dark alone reads as dirt on the surface, bright alone as sparkle,
which is the shiny look being fixed. Count goes with cell *area*, so grit
density is constant across the field rather than per-cell.

> The density thesis arriving *inside* a single element, and D76/D160's shape:
> a different register, not a louder version of the same one.

**And the pair had to be re-judged together (D158).** The sheen was tuned when
the fragments were smooth; against a gritty one it was the second thing making
the rock look polished, and it came down by half again.

## D182 — three marks that were the wrong size, and how each was found

Three separate sizing faults, each invisible until rendered, each found at a
different scale — which is D88/D116's third leg in practice.

- **The sheen was a stroked arc.** Clipped to the cell and stroked at a sixth
  of its radius, it produced a hard-edged **crescent** in every fragment,
  reading as painted-on swooshes. A stroke has two hard edges and a sheen has
  none; fading *towards* nothing (D156) is the only way it seats into the
  material. Now a gradient along the light direction.
- **The metallic glints were polygons.** Authored at 0.005–0.012 of the *body*
  radius — a figure that lands correctly by accident everywhere else, because
  every other layer is a few percent of the radius thick. This layer is **86%**
  of it, so a mark small relative to its layer was enormous relative to the
  fragment it was meant to be a fleck *in*. A glint has to stay a point.
- **The cells were flat.** A multiplicative value fan around a measured
  `colour.v` of 0.19 spans 0.09..0.29 — three materials all near-black. The
  layer's value is the right *anchor* and the wrong *scale*; it now moves a
  lifted base rather than being it. The gradient's mid stop also moved to 0.34,
  because `body` sits much nearer `lit` than `shadow` and the geometric centre
  spent most of the cell on the dark half.

## D183 — the mosaic is one element, and that is what kept `draw/` clean

A Voronoi cell has no shape of its own; it is defined entirely by where its
neighbours are. So the mosaic is a **single structure**, built and drawn as one
element carrying every site — which lets it be an ordinary `KINDS` entry taking
the same `(ctx, view, el, style)` signature as a speckle.

**`draw/scene.js` needed no change at all.** The phase's architecture rule —
"nothing in `js/draw/` should learn an archetype name" — held without effort,
because the thing that wanted a special pass turned out not to need one.

`count` is therefore a **cell** count rather than an instance count, and the
mosaic takes no size tiers: there is nothing for a tier to set when a cell's
size is decided by its neighbours. The size variation tiers would have given
comes from a jittered polar lattice instead — the same effect arrived at
through the geometry rather than imposed on it, and it also avoids the slivers
a uniform random point set produces, which read as cracked glass rather than
as rock.

---

## Six new general mechanisms

None names an archetype; all default to no-ops, so no existing body changed.

| Mechanism | Where | What it says |
|---|---|---|
| `mosaic` / `fracture` | primitives, elemgen | a layer is welded fragments, not a continuous medium |
| `climate.retainsHeat` | gen/climate.js | this body is too small to have kept its own heat |
| `boundaryFacet` | draw/layers.js | this edge is angular, not wavy |
| `boundaryFreq` | draw/layers.js | this many lobes round the body |
| `boundaryShare` | draw/layers.js | this boundary wears another's shape and cannot cross it |
| `wobbleScale` | gen/structure.js | the same kind of edge, more of it |

Plus `shared.palette` reaching stat templates — `build` always had it, and the
asteroid is the first template with a question the colours answer (what a rock
is *made of* is a statement the picture makes).

## Cohesion

The spec folds `rubble-pile` and `void-riddled` into one axis because they
drive four things that must move together: cell count, cell size, void
fraction and seam width. Measured across the slider:

| Cohesion | cells | void | seam |
|---|---|---|---|
| 0 | 144 | 27.4% | 0.0110 |
| 0.25 | 118 | 22.5% | 0.0088 |
| 0.45 | 97 | 18.3% | 0.0070 |
| 0.75 | 66 | 10.5% | 0.0044 |
| 1.0 | 40 | 4.6% | 0.0022 |

It is a **detail-stage** control in the Structure section — the same
divergence tidal locking has, and for the same reason: it decides what a layer
is made of, not where its boundaries are.

## Still open

- **The card's Composition line** derives from the interior's palette entry, so
  it can never contradict the render — but the *Iron Fragment* preset comes out
  olive-green rather than metallic, because the preset's hue is being pulled by
  the stone lean. The card stays honest (it reports what it sees); the preset
  does not reach the picture it names.
- **Open question 1b** (the body cut off flat across its lower portion) is
  untouched and still predates this work.
