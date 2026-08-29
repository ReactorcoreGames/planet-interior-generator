# Session O — Phase 6 polish, doc 1: the star's own body

*The limb, and only the limb. `docs/PHASE-6-POLISH-1-BODY.md`, run first
because the traits doc's features sit on the surface this session moves.*

---

## The standing problem, and the verdict

The user's words were the acceptance criterion:

> *"I love the colors, and details of the different layers and sizes, but I feel
> the stars generally need some kind of extra kick to make them feel more like a
> star — more glowing, more emissive, more chaotic/spiky/crazy outer surface."*

**D84 was the standing warning and it held.** The colours, the layer details
and the sizes are the praised half, and none of them were touched: every
`frac`, every `maxThickness`, every `sat`/`val` band and every interior element
recipe is byte-identical to how Session M left it. Measured rather than
asserted — `test/_tmp/starstack.mjs` prints thicknesses, and every layer in
every stack comes out where it did before.

What changed is five things outside the silhouette, plus one shading pass
inside it.

| Done-condition | Result |
|---|---|
| Reads as **on fire** rather than a diagram of one, whole-body *and* zoomed | Rendered; the user's call |
| The disc reads as a glowing **sphere** | **Yes** — limb darkening, §0 |
| A tall prominence is never chopped flat | **Fixed and measured.** Prominences went 894 px (Session M) → ~9,500 px per archetype |
| The glow does not shrink the star; the wobble IS in the sweep | **Both.** The glow is excluded from `extent` by construction; the sweep now walks the composed reach function |
| A visible wavy boundary that never stops reading as circular | **Yes** — measured at 10–54% of each layer's own thickness |
| Plumes stand off the surface, tunable **separately** from the wobble | **Yes** — two mechanisms, two knobs |
| A young star and a patient dwarf have obviously different limbs | **Yes** — see the four-way strip |
| `tidalLock` visibly bulges the envelope, body still round | **Yes** — extent 1.226 → 1.344 at facing 90° |
| Nothing in `js/draw/` names a stellar role | **Held.** Every hit is still a comment |
| No existing family's render changed | **Asserted** — every new mechanism is opt-in by declaration and none is declared outside the stellar family |

---

## The tool that was built first

**`test/_tmp/limb.mjs` — a close-up limb renderer**, built before anything
else, because almost every judgement in the doc is about how a star reads
*zoomed in* and nothing in the toolkit answered that. `starshot.mjs` renders a
whole body; `cellzoom.mjs` draws one primitive on a flat field.

It reuses the app's **own framing** — zoom and pan in body-radius units — so
what it shows is exactly what a user gets by scrolling in on the same spot.
The crop maths is three lines:

```
view.at(r, a)  puts a point at  cx + sin(a)·r·R,  cy − cos(a)·r·R
makeView       shifts cx by −panX·R and cy by −panY·R
so centring on (r, a)  is  panX = sin(a)·r,  panY = −cos(a)·r
```

That is the whole reason it cannot drift from what the GUI shows: there is no
second crop path to disagree.

`--strip` renders all four archetypes side by side at the same zoom, which is
how "a young star and a patient dwarf have obviously different limbs" gets
answered rather than assumed.

Two more probes earned their place: **`starstack.mjs`** (D118's lesson as a
standing tool — radii, thicknesses and wobble as *a percentage of each layer's
own thickness*), and **`dialboot.mjs`** (below, D132).

---

## Decisions

### D129 · A limb-darkening curve belongs to the SPHERE, not to the layer

**Where:** `draw/emissive.js` `paintLimbDarkening`.

The photosphere was drawn at a uniform brightness across its whole face, which
is most of why a star read as a flat coloured disc. One radial gradient over
the luminous layers was the cheapest step toward *"more glowing, more
emissive"* in the whole document, and it was the first thing built.

**The first version ran `t` to 1 at the LAYER's own outer edge, and the result
was exactly inverted.** A convective envelope topping out at r = 0.90 took the
full limb value *at* 0.90, so the entire interior went muddy brown while the
photosphere — a skin a few percent thick near r = 1 — barely darkened at all.

`mu` is a statement about the viewing angle into a **sphere**, so its argument
has to be the fraction of the sphere's radius. Each layer then shows whatever
part of that one shared curve it happens to span, and that is also what makes
the photosphere and the layer under it read as one continuous falloff rather
than as two separate shadings.

**A second, unrelated bug in the same twenty lines**, worth its own sentence:
the gradient is composited with `multiply`, and the stops were painted in the
layer's own colour. `multiply` scales what is underneath by the stop's
channels, so a stop at the layer's colour darkens by that colour's *value*
even where the curve says darken by nothing — the whole disc came out
uniformly brown. **A multiply stop is a FACTOR, not a paint**, and it must be
white where nothing is darkened.

**Two figures per archetype, not one**, and the second matters more than it
looks. A photosphere is a skin, so darkening it alone puts the entire falloff
into a hairline at the very edge — which reads as a drawn **outline**, exactly
the flat-disc-with-a-border look the feature exists to remove. Giving the deep
layer beneath it a share of the same curve spreads the falloff across most of
the visible face.

### D130 · The wobble and the tidal bulge are ONE mechanism, and finding that out is what made §5 nearly free

**Where:** `draw/layers.js` `outwardWobbleFn`, `draw/scene.js` `reachFn`.

The doc's §1 (a wavy corona) and §5 (a binary companion's tidal bulge) were
written as separate items. Checked against the code they are the same
mechanism, and the check is worth recording because it inverted the plan:

- **The chromosphere needed no new machinery at all.** It is an ordinary
  banded layer declaring `boundary: "slight"`, so `layers.js` `boundaryFn` has
  been wobbling it since Phase 1. The entire job was **amplitude**.
- **The corona could not use `boundaryFn` under any circumstances.**
  `fillOutward` has two paths: a uniform one that is a single
  `createRadialGradient` and a single `arc()` — and *a radial gradient is
  circular by definition* — and an angular one that walks 240 bearings asking
  `thicknessAt(a)` how far the layer reaches there.

`thicknessAt` is a multiplier-per-bearing function, which is **exactly** what
"wobble this edge by a proportion of its own thickness" is asking for. The
wobble was a solved problem wearing a different name, and both features
multiply into the same function:

```
thicknessAt(a) = wobble(a) × bulge(a)
```

So §5 came out to a data file: a zone recipe driving `air`, which `gen/zones.js`
already publishes as `airAt` and which `scene.js` already composed. **No new
drawing code.**

### D131 · A proportion of a layer's thickness needs a different FREQUENCY as well as a different amplitude

**Where:** `OUTWARD_WOBBLE_FREQ` in `draw/layers.js`.

`wobbleRel: { base, peak, driver }` was added as a general layer property:
this boundary is wavy by a proportion **of itself**, resolved after
renormalization because thickness is not known until then. The user's
calibration went in directly — 10% at the calmest, 50% (half the layer's own
thickness) at the most violent.

The numbers landed on the calibration first time and the render was still
tame, which is the interesting part. **The amplitude was right and the
frequency was wrong.** The generator's angular noise samples a circle of
radius 1.7 in noise space, giving one or two lobes per revolution — correct
for a mantle, where the statement is "this boundary is off-centre and lumpy",
and on a corona it produces *a slightly oval halo*, which reads as a rendering
imprecision rather than as an agitated star.

At 5.5 the same amplitude gives six to nine crests and the edge reads as
**wavy**, which is the word the user used. Worth generalising: *"this is a
proportion of the layer" and "this is a fraction of the body" are two
different kinds of statement, and they want different spatial scales as well
as different sizes.*

The v2 warning was respected throughout — v2's stars wobbled so hard they
stopped being circles. The silhouette here still reads as a circle at every
setting; what changed is that its edge is no longer smooth.

### D132 · One slider, two causes — and the dial has to say which

**Where:** `axes.dial` in `data/archetypes/stellar-common.js`,
`Controls.syncAxisDials`.

The binary companion reuses `tidalLock`, because a second slider for "how hard
is the asymmetry driven" is D27's mistake. But **`tidalLock` did literally
nothing on a star before this session**, and leaving the control labelled
"Tidal locking" on a body with nothing to be locked to is a control lying
about itself.

`axes.dial` had been declared on the planet's axis since Phase 4 and had never
been read by anything. It is live now, along with `dialTitle` and
`facingDial`, so the archetype names its own labels and no UI file names a
body type.

**Two things about where it lives, and both are D79/D114 arriving again:**

1. **The defaults are captured from the DOM on first call** rather than
   written into JavaScript. Duplicating a label would give two places that
   must agree about what a slider is called, and `index.html` is already the
   one that says it.
2. **It lives in `ui/controls.js`, not in `main.js`, because there are THREE
   routes into the archetype control and only one fires a change event** — the
   control's own change, a settings *paste*, and applying a *preset*. That is
   precisely the audit D114 recorded, and a copy per route is how the trait
   picker ended up stale on two of the three.

`test/_tmp/dialboot.mjs` drives the real `index.html` and checks all three,
including **a page that BOOTS with a star already selected** — the path with
no change event at all, and the one the trait picker's version of this bug was
found on.

### D133 · The clip has now been too tight three times, so it is fixed against the frame

**Where:** the spanning pass in `draw/scene.js`.

The comment at that clip already recorded the same bug being fixed twice —
first at `body.surface`, then at the outermost layer. It fired a third time:

- A prominence is authored `size: [0.20, 0.44]` of the **body** radius and
  anchored near the surface, so a top-tier arch reaches past a corona topping
  out at 1.14–1.32 and was chopped flat against it.
- Heat plumes are spanning by construction and would have been chopped by the
  same edge the day they were built — which is why the doc moved this fix out
  of the traits doc and into this session.

Fixing it against the corona a fourth time would only set it up to fire again
against the next thing that reaches further — which, *in this same session*,
is the emissive glow. So it is fixed against the thing that is actually true:
the guarantee this clip exists to give is **a spanning trait cannot escape
into open space**, and open space begins where the picture stops. `extent` is
that radius.

Measured: prominences went from Session M's 894 px to **~9,500 px on every one
of the four archetypes**.

### D134 · The extent sweep and the glow are OPPOSITE calls, and the distinction is real

**Where:** `draw/scene.js`, and `draw/emissive.js`'s header.

Two things now reach past the outermost layer, and they need opposite
treatment:

- **The coronal wobble MUST be in the extent sweep.** It moves the body's own
  silhouette, so a crest not in the sweep is cropped flat against the frame —
  turning the very feature that exists to break the circle back into one. The
  sweep used to walk `zones.airAt` alone, which was complete while a bulge was
  the only thing that could move that edge; it now walks the same composed
  function the fill is drawn with, so the two cannot disagree.
- **The emissive glow must NOT be.** `extent` also decides where the frame's
  contents reach, so a halo reaching 1.9 radii folded into it would **shrink
  the star to make room for a halo** — the exact mistake `extent` used to make
  with ring systems (D69). A decorative glow that fades to nothing has no
  claim on frame space; it is softly cropped by the edge, which is what a halo
  does anyway.

The rule underneath: *a measurement of reach should include anything whose
SHAPE is the feature, and exclude anything that is merely light.*

### D135 · The plume field is a corona ELEMENT, not a new pass — and the doc's own reasoning went the other way

**Where:** `data/elements/stellar-envelope.js`, `draw/primitives/stellar-limb.js`.

The doc argued plumes are spanning by definition (they cross the
chromosphere/corona boundary, which is what `spanning` is for, D91) and should
go through the spanning pass.

Checked against the code, there is a cheaper answer that is not a compromise.
**The outward layer's own clip runs from the surface out to the (wobbled)
coronal edge, which is precisely the region a plume occupies** — and
`outward: true` already fades every element in the layer along the same curve
as the fill (`falloffAlpha`). A plume rooted at `depth: 0` in the corona
starts at the visible limb and climbs, needs no new pass, and gets the falloff
free. The machinery the roadmap said this wanted was the atmosphere's, and it
was already wired to the right place.

The spanning clip still needed widening (D133) — for prominences, which really
do cross — but the plumes did not need it.

**Kept SEPARATE from the wobble on purpose**, which the user asked for in as
many words: fold "how wavy is the edge" and "how much fire stands off it" into
one number and neither is tunable.

### D136 · The mark was measured twice and was wrong in a different way each time

**Where:** the `plume` primitive's `size` and `halfWidth`.

D122 and D126 both fired, in order, on the same element:

1. **Authored 0.055–0.150, drawn at 0.5–27 px** on a 900px canvas, and most of
   them under ten. `tierSplit` drops tier 0 first, so at the default
   Size-tiers of 3 the largest instance drawn is 0.52× the authored figure.
   D126's failure exactly: it changed plenty of pixels and could not be seen.
   Raised to 0.140–0.360.
2. **At the right size it read as a field of LEAVES** lying flat against the
   limb. `halfWidth` peaked at 0.16 of the rise and was drawn three times up
   to 1.6× that — a total width of half its height. A flame tongue is several
   times taller than it is wide, and that one number decides which of the two
   things the mark is. Narrowed to 0.062, with the widest point pushed down
   toward the foot so the silhouette has a long taper above it.

**The generalisable half is the ordering.** "Is it big enough to see" and "is
it the right shape" are different questions, they fail in different ways, and
the second one cannot even be asked until the first is answered. Measuring in
**pixels** rather than body-space units is what settled the first (D126); a
close-up crop is what settled the second (D88, applied to shape).

### D137 · A radial glow with no structure reads as a lens artifact

**Where:** `heat-vein` in `draw/primitives/stellar-limb.js`.

The user's addition — *"heat veins reaching through that glow into space"* —
turned out to be load-bearing rather than decorative, and it took three passes
to get right. Each failure is a different way of saying the same thing:

1. **Bright, near-white, constant-width strokes.** A ring of hard spikes: a
   **starburst camera filter**, which is a photographic artifact and the exact
   thing an emissive pass must not be mistaken for.
2. **Rooted at the glow's base.** Detached dashes hanging in space — every
   filament began exactly where the corona ended, so its bright root had
   nothing behind it. They now root *well inside* the halo, so each one
   emerges from something. That is the whole of "reaching **through** that
   glow".
3. **Few and bright.** Replaced with many and faint, which is the project's
   standing thesis and is especially right here: a handful of bright filaments
   is a filter; a hundred faint ones is a corona with texture in it.

The halo itself had the same class of error: cutting saturation to 0.66 and
lifting value hard produced a **grey halo on a coloured star**, which reads as
fog. Keeping most of the body's saturation is what makes a green star sit in a
green haze — D123 again, and `npm run sheet` is what confirmed it across
sixteen bodies rather than one.

### D138 · An element table keyed by ROLE cannot say "this body's version is louder", and that gap has a general fix

**Where:** `elementScale` in `gen/details.js`.

Element recipes are keyed by role, not by archetype, and that is deliberate —
it is what makes a `corona` mean the same thing on all four stars and is why
adding a family adds no drawing code. It has exactly one gap, and per-archetype
brutality walked straight into it: a young star's limb should be visibly more
violent than a patient dwarf's, and both wear the same corona.

The two bad answers were a per-archetype role (duplicating a whole recipe to
change one number) and a role check in the generator (the thing the
architecture forbids). `elementScale: { <kind>: { count, size } }` on the layer
spec is data, is per layer, and is absent on every existing archetype.

**The size half is applied AFTER the build, never by rewriting the recipe.**
The recipe is shared data; mutating it would change the mark on every other
archetype using that role, and the failure would depend on load order — which
is the worst kind of bug to find.

**It also exposed a hole D121 would have caught later.** The old giant has no
`corona` — it has `shed-envelope` — so it inherited no plume field and was the
only star in the family with a bare limb. A four-way close-up strip showed it
in one glance. Its envelope now declares **its own** plume recipe rather than a
scaled copy of the corona's: a red giant is not flaring, it is *shedding*, so
its plumes are few, very long, very faint and heavily leaned. Having a separate
recipe is what lets the archetype tell its own story rather than be a dimmer
version of someone else's.

### D139 · An outward layer's authored alpha is not its drawn alpha either

**Where:** the shed envelope's plume alpha.

The giant's plumes generated correctly — 44 of them, up to 148 px — and drew
as nothing at all at an authored `alpha: [0.16, 0.44]`. Two multipliers sit
between the author and the canvas and neither is visible in the recipe:

- The layer's own **falloff**. This envelope declares `fadeHold: 0.10`, the
  fastest taper in the generator, because a shed shell is thin everywhere.
- The layer's own **palette**: sat 0.15–0.40 at val 0.30–0.50, the dimmest in
  the family by design.

So the authored figure runs 0.55–0.95 and the render is *still* faint, which
is the correct arrangement. The alternative — quietly exempting these from the
falloff — would have floated them clear of the layer they belong to.

This is D122's lesson in a third register: **the authored size is not the
drawn size, the authored count is not the drawn count, and the authored alpha
is not the drawn alpha.** Every one of them passes through machinery the
recipe cannot see.

---

## Deliberate declarations

**Four new general mechanisms, every one opt-in by declaration:**

| Mechanism | Where | What it says |
|---|---|---|
| `limbDarkening` | layer spec | a luminous layer is dimmer at its own edge |
| `wobbleRel` | layer spec | this boundary is wavy by a proportion **of itself** |
| `elementScale` | layer spec | this body's version of a shared role's mark is louder |
| `emissiveGlow` | archetype | this body lights the space around it |

Asserted rather than trusted: **none of the four is declared outside the
stellar family**, so no existing family's render can have moved.

**`draw/emissive.js` is a new file at a real seam.** Everything in `scene.js`
draws MATERIAL — inside the silhouette, reflective unless a palette says
otherwise. These two draw LIGHT, which behaves differently at every level: it
composites additively, it has no edge to clip against, it must fade rather
than stop, and one of the two deliberately runs off the frame. It is also the
pair a future emitting body would reach for; a machine world with an
incandescent shell wants both of these and none of `scene.js`'s ordering.

**`draw/primitives/stellar-limb.js` likewise.** D128 split the family's
primitives between the star's own marks and solid objects silhouetted against
one; this is a third seam of the same kind. Everything in it is drawn
**outside** the body, over black or over a fading halo, in an additive blend —
which changes the failure modes completely. A mark that reads perfectly
against a bright photosphere can vanish entirely against the sky, and
everything has to end by dissolving rather than by stopping, because there is
no layer edge to hide a cut behind.

**v2's flare-ribbon geometry was raided, as CLAUDE.md invites.** Its diagnosis
is still right — a stroked line of constant width is a drawn line and no
amount of colour makes it gas, so a plume is a tapered ribbon drawn several
times at increasing width and falling alpha. What was **not** raided is v2's
amplitude: v2's flares were huge and few, and this project's thesis is the
opposite.

**No frosting anywhere (D22).** Nothing added here deposits.

---

## Measured, so a future session need not re-derive it

At `starActivity` 0.7, `boundaryIrregularity` 1:

| Body | Layer | Wobble as % of its own thickness |
|---|---|---|
| main | corona | 34.4% |
| main | chromosphere | 33.0% |
| dwarf @ activity 1.0 | chromosphere | **54.0%** — the family's most agitated fringe |
| dwarf @ activity 1.0 | corona | 26.0% — feeble, deliberately |
| old giant | shed-envelope | 53.6% |
| main @ activity 0.0 | corona / chromosphere | 12.0% — the floor |

**Layer thicknesses did not move.** Every `frac`, every `maxThickness`, every
rolled radius is where Session M left it, so nothing calibrated against a
layer's thickness has gone stale — D75/D119 discharged by measurement rather
than by assumption. `surfaceC` still lands a main star at 3,889–7,996 °C
against a spec of 3,500–8,000.

**Render cost.** A wobbling corona forces every star onto `fillOutward`'s
angular path — 22 nested outlines at 240 steps where it used to be one
gradient. Measured at 1280², under `@napi-rs/canvas` (slower than a browser's
compositor): a main star goes 195 ms → 345 ms, an old giant 283 ms → 332 ms.
Whole-render figures, not the pass alone, and comfortably interactive; noted
here so it is a known number rather than a later surprise.

---

## Still open

- **FOURTEEN FILES ARE PAST THE ≤500-LINE RULE**, and this is now the largest
  standing debt in the project. The two new files this session added are both
  well under it (`draw/emissive.js` 274, `draw/primitives/stellar-limb.js`
  259), and extracting `emissive.js` took 258 lines back off `scene.js` — but
  the rest were already over before this session started and none of them got
  smaller:

  | File | Lines |
  |---|---|
  | `js/draw/film.js` | 1,339 |
  | `js/draw/scene.js` | 1,057 *(was 965)* |
  | `js/gen/palette.js` | 990 |
  | `js/draw/details.js` | 959 |
  | `js/gen/elemgen.js` | 837 *(was 796)* |
  | `js/gen/traitroll.js` | 802 |
  | `js/draw/primitives.js` | 733 |
  | `js/gen/details.js` | 697 *(was 657)* |
  | `js/main.js` | 681 |
  | `js/data/presets.js` | 670 |
  | `js/gen/climate.js` | 602 |
  | `js/draw/canvas.js` | 595 |
  | `js/gen/structure.js` | 559 *(was 486)* |
  | `js/draw/zonepaint.js` | 554 |

  **These want the D128 treatment — each cut at its own real seam, not a
  byte-count split.** D128 is the record of how to do it: the seam is
  different per file, and finding it is most of the work. This is a session's
  work rather than a corner of one, and doing it BEFORE the traits has the same
  argument D128 made for doing the stellar split before the polish.
- **The `tidalLock` slider is still inert on both gaseous archetypes**, which
  declare no `axes` at all. It now correctly reads "Tidal locking" there
  rather than a star's label, so it is honest, but it is a control that does
  nothing on two of seven bodies. `gaseous.js` records a deliberate decision
  not to zone a hot Jupiter; whether the control should be *hidden* on bodies
  with no axis is a separate question and there is no per-archetype control
  hiding mechanism yet.
- **The plume field's alpha has not been swept across every palette.** It was
  tuned on `star-a` and `star-b` and checked on a sixteen-body contact sheet,
  which is enough to say no colour is wrong; whether it is the right *weight*
  on a very dark or very pale star is a taste question for the screen.
- **The stellar traits have not been touched.** The spanning clip they needed
  was moved into this session and is done; everything else in
  `PHASE-6-POLISH-3-TRAITS.md` is untouched.

  **They no longer run next.** The user looked at the finished companion axis
  and found that bulging only the corona — the faintest thing in the picture —
  deflates the effect, so `PHASE-6-POLISH-2-TIDAL.md` was written and inserted
  ahead of them: the swell reaches the chromosphere and photosphere, and the
  same new field finally makes `tidalLock` do something on the two giants.
  It runs first for exactly the reason this session ran before the traits —
  **it moves the surface they would otherwise be tuned against** (D75/D119).
