# Phase 6 polish, Doc 1 — the star's own body

*Run this FIRST, in its own session. The traits doc reworks features that
sit on the limb this doc changes, so running them the other way round would
tune traits against a surface about to move under them — which is the
"a proportion is only calibrated for what it's a proportion of" trap
(D93, D75) in its most expensive form.*

**Model:** Opus 5, medium or high.

> **Superseded numbering.** This ran as Session O and is complete — see
> `docs/progress/session-o-star-body.md`. A tidal-bulge doc was inserted after
> it as Doc 2, so the traits doc referenced throughout this file is now
> `PHASE-6-POLISH-3-TRAITS.md`. The running order is body → tidal → traits.

---

## READ FIRST, in this order

- `CLAUDE.md` — locked constraints. Plain scripts, no ES modules, no build
  step, ≤500 lines per file.
- `docs/PROGRESS.md` — current state; supersedes the specs where they disagree.
- `docs/progress/session-m-stars.md` — **the whole file.** D115–D127 are the
  traps this family already walked into, and several of them are directly
  relevant here (D118 layer thickness, D119 paired calibration, D122 the
  authored size is not the drawn size, D126 a pixel diff can pass while the
  thing is invisible).
- `docs/celestials/stars.md` — the family spec.

---

## THE STANDING PROBLEM THIS DOC EXISTS TO SOLVE

The user's words, and they are the acceptance criterion:

> *"I love the colors, and details of the different layers and sizes, but I feel
> the stars generally need some kind of extra kick to make them feel more like a
> star — more glowing, more emissive, more chaotic/spiky/crazy outer surface —
> both within the fading layers like the corona (maybe via chromosphere), but
> also the corona itself shape wise, distorting it, making it more distorted,
> and depending on the star type, more brutal and less calm, especially up
> close."*

**The structure of the family is finished and the user likes it.** Layer
stacks, proportions, colours, the convective/radiative contrast, the core
ratios — all of that was signed off. Do not revisit any of it. This doc is
about the OUTER LAYERS and how they read, and nothing here should change what
the interior looks like.

**D84 is the standing warning.** The most expensive mistake of Session K was
answering a compliment-plus-complaint by replacing the praised half. "I love
the colours and details of the layers and sizes, BUT the outer surface is
tame" is exactly that shape of note. The colours, the layer details and the
sizes are the praised half.

---

## BUILD THIS TOOL FIRST, NOT LAST

**A close-up limb renderer.** Almost every judgement in this doc is about how
the star reads *zoomed in* — the user's note is explicit: *"At close up zoomed
in, prominences look particularly tame and lame, as does the surface of a star
likewise."*

There is currently **no tool that looks at a limb at high magnification.**
`test/_tmp/starshot.mjs` renders a whole body; `test/_tmp/cellzoom.mjs` draws
one primitive on a flat field. Neither answers "what does the edge of this star
look like from close up", which is the question being asked.

Build it before touching anything else (D88: *when the question is "is it
there", count pixels; save eyes for "does it look right"* — and this doc is
almost entirely the second kind of question). It should take an archetype, a
seed and a zoom level, and crop on the limb rather than on a guessed quadrant.
`framing.mjs` already has zoom/pan plumbing to copy from.

---

## THE WORK, in build order

### 0. Limb darkening — do this first, it is the cheapest win in the doc

**Not in the original review, added in the brainstorm pass.** The photosphere is
drawn at a uniform brightness across its whole face, which is most of why a star
currently reads as a *flat disc* rather than as a glowing sphere. A real star is
brightest at the centre of the disc and falls off toward the limb, because near
the edge you are looking obliquely through cooler, higher gas.

One radial gradient over the luminous surface buys the single largest step
toward *"more glowing, more emissive"* in the whole document, at every zoom
level, before any new machinery exists. Do it first so everything after it is
judged against a surface that already reads as curved.

**Keep it generic.** This is "a luminous layer darkens toward its limb", not "a
photosphere does" — declare it as a layer property so any future emitting body
gets it, and no role name enters `js/draw/`.

### 1. Boundary wobble on the two outer layers

Both layers should read **wavy**, not scalloped.

**The user's calibration, taken directly — implement these numbers:**

- Floor (calmest archetype, lowest activity): **10%** wobble.
- Ceiling (most violent): **50%** — *half the layer's own thickness*.
- The chromosphere and the corona each measure against **their own thickness**,
  so the corona's absolute wobble is much larger simply because the corona is
  much wider. That is wanted and is why the figure is a proportion.

> **The v2 reference is a warning, not a target.** The user: *"The most
> overshot example is the wobble the stars had in v2 of the app; the wobble was
> so crazy that star celestials weren't even circles anymore. v2 was more
> stylized, so it worked ok there, but in v3 the layers are mostly circular and
> the wobble is more about making it more WAVY."* If the silhouette stops
> reading as a circle, it has gone too far.

#### The mechanism — CHECKED IN THE BRAINSTORM PASS, and it is not what this doc first said

The original draft said "reuse boundary displacement; check whether `boundary:`
characters reach an `outward` layer". That was **checked against the code and is
wrong in both halves.** What follows replaces it.

**The chromosphere is not a circle today and needs no new machinery.** It is an
ordinary banded layer declaring `boundary: "slight"`
(`data/archetypes/stellar-common.js`), so it already wobbles through
`layers.js` `boundaryFn`. Only the **corona** declares `soft-gradient`. For the
chromosphere the entire job is **amplitude** — a stronger boundary character
and a per-archetype/`starActivity` scale. Do not build anything for it.

**The corona cannot use `boundaryFn` at all, and does not need to.** It is drawn
by `fillOutward` (`draw/layers.js`), which has two paths:

- **Uniform** — one `createRadialGradient` and one `arc()`. A radial gradient is
  circular *by definition*; this path can never be wobbled.
- **Angular** — 22 nested closed outlines walked at 240 steps, where the reach
  at each bearing comes from **`thicknessAt(a)`**.

`thicknessAt` is a multiplier-per-bearing function. That is *exactly* what "wobble
the corona's outer edge by ±X% of its own thickness" is. **The wobble is already
a solved problem wearing a different name** — the machinery §5 reaches for is the
machinery §1 needs.

#### Therefore §1 and §5 are ONE mechanism, composed

Both the wobble and the tidal bulge multiply into the same function:

```
thicknessAt(a) = wobble(a) × tidalBulge(a)
```

`draw/scene.js` already composes an `airFn` out of `zones.airAt` plus a
per-bearing floor, so composition here has a direct precedent to copy. Build the
composed function once and both features fall out of it.

**Three consequences to handle deliberately:**

- **Sweep the COMPOSED function for `extent`, not just `airAt`.** `scene.js`
  already sweeps 360° taking the peak, but it sweeps `zones.airAt` alone. If the
  wobble is not in that sweep, its crests get cropped flat against the frame —
  which is the exact circle the feature exists to break. Two-line change; make
  it at the same time, not afterwards.
- **A wobbling corona forces every star onto the angular path**, i.e. 22×240
  outline fills where it used to be a single gradient. Almost certainly fine —
  **measure it once anyway.** Better known now than discovered later as "the
  star preview got sluggish."
- **No frosting.** The user is explicit: *"I don't think the frosting/
  deposition will work with stars… so probably that part of the terrain system
  won't be used."* D22 already forbids it. Declare no `film`.

**Per-archetype amplitude**, because per-type brutality is a named goal — a
young star and a patient dwarf must not share a limb. Scale by `starActivity`
as well, since that axis already means "how violent is this star".

### 2. The plume field — a SEPARATE mechanism from the wobble

The user's design, and the reason it is separate:

> *"Essentially both chromosphere and corona use the terrain system to deform
> their boundaries first, then originating at the beginning of the corona,
> another different thing would draw fire… Things standing off the surface —
> spicules, flame tongues, heat plumes reaching outward."*

**Keep these two knobs separate.** If the wobble and the plumes are one
parameter, "more spiky" and "more flames" move together and both become
untunable. The user asked for this explicitly, calling it a *"2 layer (or even
3 layer) thing so that they get the levers they need to work well across the
different star types."*

- A **field of elements with an outward falloff**, not a boundary.
- Originating at the base of the corona and reaching outward, fading.
- `docs/roadmap/phase-6-stars.md` already anticipated this: *"loose heat plumes
  hovering over the surface is a good idea but wants outward-falloff machinery
  — the atmosphere's, or v2's flare ribbons — not the frosting stage."*
  **v2's flare-ribbon geometry is explicitly listed in CLAUDE.md as v2 code
  worth raiding.** Look at it before writing anything new.
- Per-archetype intensity, again for per-type brutality.

**The `outward: true` falloff path already exists** (`draw/layers.js`
`falloffAlpha`, and `fadeHold` tunes the curve). Elements in an outward layer
already fade with it — see the note in `draw/details.js` `drawLayer` about an
atmosphere's haze needing to fade with its band.

#### WHICH PASS DRAWS THEM — decide this before writing the elements

There are two candidate passes in `draw/scene.js` and the doc originally named
neither:

- **`details.outward`**, which already expands `extent` to fit its elements.
- **The spanning pass**, which is for features that CROSS layer boundaries.

A plume rooted in the chromosphere and reaching into the corona is by definition
the second — it crosses a boundary, which is what `reach: "spanning"` is for
(D91), and it is the same argument that moved prominences to spanning in D121.

**That puts plumes behind the same clip that is currently chopping tall
prominences**, which the traits doc's §3 was going to fix. **Fix it HERE instead** — see
the clip note added to §3 below. Doing it there would mean building the plume
field against a clip known to be wrong and re-judging it afterwards.

### 3. The emissive pass — STELLAR ONLY

The user confirmed scope explicitly: **stellar only.** Do not apply this to
planets or giants; it must not change how any existing family renders.

- A radiant glow around the star, reaching roughly **as far out as the debris
  belt used to** (~1.3-1.9 body radii) before that trait is removed in the traits doc.
- Plus, the user's addition: *"maybe besides just a radial glow, it could also
  have sort of 'heat veins' (hot gas emissions or solar radiation) reaching
  through that glow into space, fading out further out."*

**This is the only genuinely new rendering in this doc**, so it carries the
most uncertainty and should be built after 1 and 2 are landed and looking
right. Everything else here is reuse.

Two things to respect:

- **`body.extent` and the frame — and there is a clean answer.** `draw/scene.js`
  expands `extent` to fit outward elements, so a glow reaching 1.9 would pull the
  frame out and shrink the star. The star shrinking to accommodate a halo is the
  wrong trade.

  **The fix: leave the glow out of the extent sweep entirely.** `extent` is
  documented in `scene.js` as a *measurement* — the outermost radius anything
  occupies, used by the **pan clamp** — and explicitly **not** as the thing that
  sizes the body. A decorative glow that fades to nothing has no business
  claiming frame space: let it be softly cropped by the edge, which is what a
  halo does anyway. Excluding it is the intended answer, not a compromise.

  Note this is the OPPOSITE of the call in §1, where the wobble **must** be in
  the sweep. The distinction is real: the wobble moves the body's own
  silhouette, so cropping it destroys the feature. The glow is light around the
  body and reads correctly when it runs off the frame.

  See also D127 (an orbital band is bounded on both sides).
- **Blend modes are established technique here** — `globalCompositeOperation`
  is already used in several places, and `screen` is what the prominences and
  flare storms use to say "this is emitted light, not paint".

#### The spanning clip must be widened HERE, not in the traits doc

The traits doc's §3 records that tall prominences are chopped flat. **Moved
into this doc**
because §2's plumes are spanning elements too and would be chopped by the same
clip the moment they are built.

The cause, checked: the spanning pass in `draw/scene.js` clips to `spanEdge`,
the **outermost layer's** outer edge — the corona, at 1.14–1.32. Prominences are
authored `size: [0.20, 0.44]` of the BODY radius, so a top tier reaches past it.

**Widen the clip to `extent`, not to the corona.** The traits doc offered "widen the clip
or lean on `fadeEnds`" without choosing; take the third option. Once this doc
adds a glow reaching well past the corona, "the body" no longer ends at the
corona, and the guarantee the clip actually protects — *a spanning trait cannot
escape into open space* — is properly expressed against the frame.

The comment at that clip already says **"the clip was tighter than the pass it
guards"**, recording the same bug twice. Fixing it against the corona would set
it up to fire a third time against the next thing that reaches further.

Raising `fadeEnds` (currently 0.10 on prominences) is a good complement, but
alone it only makes the chop soft rather than absent.

### 4. Per-archetype brutality

A pass over all four archetypes tuning the three mechanisms above so each type
reads as itself:

| Archetype | Should read as |
|---|---|
| `young-star` | The most violent. Newly ignited, unstable, vivid |
| `main-star` | The reference. Active but orderly |
| `old-giant-star` | Enormous and tired, but the envelope is genuinely unstable — it pulses and sheds |
| `dwarf-star` | Small and fierce. Heavy spotting is its signature, but its corona is feeble |

Note the dwarf is not simply "calmest" — the spec has it biasing activity
**high** by default. Feeble corona, furious surface.

### 5. Binary companion, as a TIDAL BULGE plus per-face activity

**The user rejected drawing a second star.** *"I do not want to draw another
sun."* This is a distortion axis, not a companion object.

Three options were weighed; **C-with-B-riding-on-it** was chosen:

- **NOT** squashing the whole body into an oval. That touches `view.at()` and
  every `arc()` clip in `scene.js` — shared geometry all four families sit on —
  and a mildly elliptical disc reads as "the render is slightly off" before it
  reads as "something is pulling on this star."
- **YES: the OUTWARD layers bulge toward the pull.** A tidal bulge on a star is
  a bulge in the tenuous outer envelope, not a deformation of the fusing
  interior. **The body stays round and the cutaway stays readable** — which is
  the whole point, since the layer stack is the part the user signed off.
- **YES, riding on the same field: the facing hemisphere is more violent.**
  More plumes, taller spicules, a hotter chromosphere on the side facing the
  companion.

**This is mostly free, which is why it won.** `gen/zones.js` already has
`airAt` — "how tall is the outward layer at this bearing" — and
`draw/scene.js` already expands the frame for an inflated dayside atmosphere
(there is a comment saying exactly that). A star declaring an `axes.tidalLock`
recipe that drives `airAt` gets a drawn-out corona **with no new drawing
code**, and the same zone field carries the per-face activity multiplier.

**And §1 has already built the composition point.** `airAt` and the coronal
wobble multiply into the same `thicknessAt`, so if §1 is done as written this
item is largely wiring an existing field into a function that already exists.

**The `Lock facing` control must respect it** — the user asked for this by
name. That control already exists and already round-trips through settings.

#### The partial-axis check — RESOLVED IN THE BRAINSTORM PASS, no work needed

The original draft flagged a five-minute check: the tidal-lock recipe is written
against sea level, snowline and terrain, and no archetype had yet declared a
PARTIAL axis. **Checked against `gen/zones.js`: it is clean by construction.**

Every zone field is read through `fieldAt(angle, key, default)`, so a zone
declaring only `air` and omitting `sea` / `snow` / `relief` / `cover` simply
gets each default. **No code change is required.** Proceed directly.

#### One real snag the draft missed: which PARAM drives it

`build` returns null unless `params[spec.param] > 0`, and the axis names its own
driving parameter. A star's zone is a **binary companion**, not tidal locking —
so borrowing `tidalLock`'s slider wholesale means the GUI reads "Lock facing" on
a body with nothing to be locked to.

`axis: {param, facing}` is already data, so this is a naming decision rather than
work: the *facing* half genuinely is the existing control and should be reused as
the user asked, but give the intensity half a name that describes what it does on
a star. Decide it before authoring the recipe, not after the label ships.

**This makes a dead control live.** `tidalLock` currently does nothing at all
on a star.

---

## ARCHITECTURE RULES FOR THIS PHASE

- **Nothing in `js/draw/` may name a stellar role or archetype.** That
  done-condition held through Session M and must keep holding — every current
  grep hit is a comment. New primitives register by `kind` like every other.
- **Star activity stays ONE axis (D27).** These mechanisms read
  `starActivity`; none of them adds a second violence parameter.
- **Perturb, never replace (zones.js rule 1).** D123 is the recent instance:
  prominences mixed hue toward orange regardless of the star and produced
  magenta loops on a blue star. Anything that colours a plume or a glow must
  LEAN the star's own colour.
- **Measure before tuning.** D122: the authored size is not the drawn size —
  `tierSplit` drops tier 0 first, so the largest instance drawn is 0.52× what
  is authored. D126: a pixel diff can report tens of thousands of changed
  pixels while every individual mark is 1.4 px and invisible; `maxdelta` high
  with low area means "there and too small".
- **Re-measure every threshold downstream of anything that moves (D75/D119).**
  If a layer's thickness changes, every `sizeRel` against it moves. The
  chromosphere and corona are about to change; anything measured against them
  is no longer calibrated.

---

## TESTING STANCE

**Do not add tests unless asked.** The suite is deliberately ~30 seconds and a
check earns its place only if it is mechanically true-or-false AND generic over
`CC.Archetypes.ids()`.

`npm test` must still pass — in particular the doccheck's frac-composition
check, which has caught an authored overlap three times.

The probes from Session M are in `test/_tmp/` and are worth re-running:
`starlit.mjs` (Starlight changes zero pixels; no polar caps), `starsweep.mjs`
(min/max over 30 bodies per archetype), `starboot.mjs` (GUI wiring),
`pixdiff.mjs` (does a trait draw — **run it per archetype**, D121).

---

## DONE WHEN

- A star reads as **on fire** rather than as a diagram of one, at whole-body
  scale *and* zoomed in on the limb.
- The disc reads as a glowing **sphere**, not a flat circle — limb darkening is
  in and visible.
- A tall prominence or plume is never chopped flat against the corona; the
  spanning clip is widened to the frame.
- The emissive glow does not shrink the star: it is excluded from the extent
  sweep, while the coronal wobble IS included in it.
- The corona and chromosphere have a visible wavy boundary that never stops
  reading as circular.
- Plumes stand off the surface into the corona, and they are tunable
  **separately** from the wobble.
- A young star and a patient dwarf have obviously different limbs.
- `tidalLock` visibly bulges the envelope toward the lock facing and makes that
  side more active — with the body still round.
- Nothing in `js/draw/` names a stellar role; no existing family's render
  changed.

**Show renders as you go rather than reporting that it looks good.** The user
can see the screen; whether it looks right is their call. Close-up limb crops
are the view that matters for most of this.
