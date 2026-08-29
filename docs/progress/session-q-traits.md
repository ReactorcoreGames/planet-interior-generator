# Session Q — Phase 6 polish, doc 3: the stellar traits

*`docs/PHASE-6-POLISH-3-TRAITS.md`, run last of the three because both earlier
docs moved the surface these features sit on (D75/D119). The body structure was
signed off and none of it was touched.*

---

## The standing problem, and the verdict

The user's review of the built family was the acceptance criterion. Every item
was a trait; the layers, colours and proportions were the praised half.

| Done-condition | Result |
|---|---|
| Both megastructures coexist, each reading as the object it now is | **Yes** — `excludes` removed, two new primitives |
| Collectors uniform in size (`tiers: 1`) rather than tier-spread | **Yes** — and the authored size is now the drawn size, measured |
| No star offers rings or debris belts | **Yes** — gated on a tag no star carries |
| A young star offers an accretion disc | **Yes** — `requires: ["young"]` |
| Prominences read as furious at whole-body scale **and** close up | Rendered; the user's call. Structure added, and a real geometry bug found |
| The tall-prominence chop is Doc 1's fix — verify, do not re-fix | **Verified landed** (D133). Not touched |
| Flare storms findable without being told what to look for | **Yes** — new primitive, plus a second unrelated bug |
| Starspots span a few enormous to many small | **Yes** — measured 3–54 px, counts 18–67 |
| Coronal holes read as a feature, no dark paint on a screen-blended layer | **Yes** — built as an absence in the plume field |
| Spicules visible, and the reason they were not is recorded | **Yes** — measured 3 px → 8.8 px median. D148 |
| Nothing in `js/draw/` names a stellar role | **Held** |
| No other family's render changed | **Asserted by declaration** — see below |

**Every trait draws on every archetype**, checked with `pixdiff.mjs` per
archetype. Prominences 4,163 → 11,642 px; flare storms 2,832 → 15,253; starspots
3,738 → 17,137.

---

## Decisions

### D146 · `requires: []` was an unexamined default, not a rule

**Where:** `js/data/traits/orbital.js`, and the new `orbit-safe` tag.

The orbital traits declared `requires: []` — *"anything beyond the body is
available to every body"* — which was correct while every body was a planet or
a giant and silently stopped being correct when the stellar family landed. A
debris belt at 1.28–1.95 body radii on a star puts rock just above the
photosphere, where it would sublimate; real debris around a star lives at
hundreds of stellar radii, off this canvas by two orders of magnitude.

**The polarity is the part worth recording.** Eligibility is a POSITIVE test for
a tag the body carries, so the gate has to name the bodies that MAY have rings
rather than the ones that may not. `orbit-safe` is carried by the solid and
gaseous archetypes and by no star, and it is named for the physical fact rather
than for the families that happen to hold it — so a future cold body gets rings
by declaring one tag, and a future hot one is excluded for free.

`excludes` would have been wrong twice over: it is a trait-to-trait relation,
and the alternative of testing a role name is the one thing eligibility must
never do.

The replacement is `accretion-disc` on the young star, which is the same
`ring-band` primitive at the same radii saying something true.

### D147 · A flare was the wrong vocabulary AND the wrong reach, and either fix alone looks like a failure

**Where:** `flare-storms`, and the new `flare` primitive.

The user could not find flare storms at all. They were drawing the whole time —
1,100–3,700 px on every archetype — which is D126's signature: present, moving
pixels, not legible. **Two independent bugs, and this is the useful part:**

1. **The wrong KIND of mark (D76).** A `vein` reaching outward is a near-radial
   stroke, and the corona already draws a field of near-radial strokes by the
   hundred. The flare was the two-hundredth example of what the layer does
   anyway. No amount of tuning would have fixed it.
2. **The wrong reach (D82).** `reach: "outward"` clamps to the top of the anchor
   layer, so the flares were placed at r 1.13–1.18 reaching to 1.47 and
   everything past the corona's edge was clipped away — the spray and the bright
   leading front, which are exactly the parts with the distinguishing shape.

**Fixing either one alone leaves the trait invisible and the fix looking like it
had failed**, which is the trap: a session that fixed the vocabulary, saw no
improvement, and reverted would have been reasoning correctly from a bad
measurement. Both had to move together.

A third, smaller one followed: with `spanning` set, `depth: [0.55, 1.15]` put the
footpoints near the corona's OUTER edge, so the eruptions floated in the halo
with clear space between them and the star. That is worse than invisible — it
states something false. Feet belong at the bottom of the band.

### D148 · `sizeRel` on a deliberately thin layer compounds with the tier factor

**Where:** the spicule fringe in `js/data/elements/stellar-envelope.js`.

The user zoomed in and saw nothing on the surface. **Measured before changing
anything**, as the doc insisted: 556 spicules drawing at **1.2 to 6.4 pixels,
median 3**, on a 900 px render.

Two factors compounding, neither visible in the authored numbers:

- `sizeRel` is a fraction of **the layer's own thickness**, and a chromosphere is
  a hairline — 15 to 22 px across all four archetypes. So 0.55–1.10 of it is
  8–24 px before anything else happens.
- `tierSplit` then drops tier 0 first (D122), taking another 0.52×.

This is D122's sharpest instance: where a relative size sits on a layer that is
thin *by definition*, the gap between authored and drawn is a factor of four
rather than a nudge. Raised past 1.0 deliberately — a spicule genuinely is
taller than the chromosphere is thick, which is what makes it a fringe standing
off the layer rather than a texture inside it. Re-measured after: **4.8–18.5 px,
median 8.8**.

### D149 · A ribbon widened in RADIUS is only correct at one end of its own curve

**Where:** `prominence` in `draw/primitives/stellar.js`.

The prominence offset its ribbon edges by adding `widen` to the radius, with a
comment reasoning that near the apex the loop runs tangentially so its thickness
is radial — true — and then that the apex is the case that matters. That second
half was the bug.

**At the feet the loop runs radially**, so a radial offset does not widen the
ribbon at all: it slides each edge up and down the loop's own length. And
`halfWidth` is at its LARGEST at the feet, so the artefact was maximised exactly
where it was worst — a dark wedge where each foot met the limb, and feet that
appeared to hover above the surface or sink through it.

**It had been there for two sessions and was invisible at whole-body scale**,
where a prominence is a few pixels of arch. Rendering four of them large on a
plain field (`test/_tmp/promzoom.mjs`) made it unmissable in one look. That is
D88 and D116 together, in a new place: a mark that reads acceptably when small
can be plainly broken, and the render-it-big tool is what tells you.

The perpendicular now comes from the centreline's own tangent, so it is right at
every point of the loop rather than at one end of it.

### D150 · Under a `screen` blend, an absence is the only subtractive mark available

**Where:** `coronal-holes`, `thinAt` in `gen/zones.js`, the thinning pass in
`gen/details.js`.

The user's verdict was *"a big wedge that is drawn over the corona layer with a
flat color and no fade"*. **It had to be flat and hard-edged**, and that is the
part that matters: the corona is composited with `screen` (`ATMOSPHERE_BLEND`),
and under `screen` dark paint is very nearly a no-op — the operation can only
ever add light. A flat opaque wedge was the only dark mark that showed at all.

So the implementation could not have been rescued by softening it. "A large soft
dark region" and "reuse `starspot` at corona scale" were not merely less elegant
than the third option — both would have spent a pass rediscovering the blend
mode, arriving at D121's `dust-formation` failure (maxdelta 19, present in every
list and absent from the picture).

**A coronal hole is not a dark patch on the corona; it is a place where there is
less corona.** Doc 1 gave the corona a plume field, and an absence in that field
is what the feature physically is. No paint, no fighting the blend, and the mark
reads because the plumes on either side of it do not.

Two general mechanisms came out of it, both opt-in and neither declared outside
this family:

- **`thinAt`** on the zone field — how many of a layer's own elements survive at
  a bearing. Explicitly *not* `coverAt`, which is about frosting.
- **`thins`** on a trait — angular sectors carrying `{keep, feather}`. The trait
  draws nothing: no `element`, no `size`, no `tone`. The placement half of the
  grammar still applies in full.

**The pass runs outside `applyZones`**, and that was a real correction rather
than tidiness: `applyZones` is called only when the body has an angular axis, so
a star with coronal holes and no companion would have skipped thinning entirely
and the trait would have done nothing on most bodies — the silent D77 failure
again.

The driver had to be wired through too. Measured without it, the hole count was
identical at activity 0.15 and 0.7: the one axis the family has, doing nothing.

### D151 · A test harness framing tighter than the app's reports false negatives

**Where:** `test/_tmp/pixdiff.mjs`, and three separate wasted diagnoses.

`stellar-collector` reported **0 px on two archetypes** after being moved closer
to the star, and the obvious readings — wrong radius, wrong count, primitive not
registered — were all wrong. Instrumenting the draw call showed sixteen
invocations at 53–58 px each, painting correctly, off the edge of the canvas.

`pixdiff.mjs` rendered at `bodySize: 0.86` on a square canvas. Measured, that
frame stops at **r = 1.11 on the cardinal bearings** — which is *inside* a star's
corona, since the outward layers run 1.06 to 1.40. **No orbital trait correctly
placed outside the halo could be in frame at all.** The app's own default is 0.78
on a wide preview, where the frame reaches 1.24 at worst and 2.24 sideways, and
the collectors render plainly.

The harness was disagreeing with the app, and the harness lost. Aligned to the
app's default, every trait draws on every archetype with no zeros.

**The general form is worth keeping:** a probe that renders differently from the
product does not answer the question it appears to answer, and "it draws nothing"
is a claim about the probe until the framing has been checked.

### D152 · `depthAbove` — an orbital band stated relative to the body's own halo

**Where:** `orbitBand` in `gen/traitroll.js`.

D127 said the orbital band is bounded on both sides. Measuring showed it is
worse than that on this family: a star's halo runs 1.06 to 1.40 across the four
archetypes, so **no single authored band clears every corona and stays usable**.
A fixed 1.26–1.38 left four bodies in forty with zero collectors visible.

`depth` in body radii is right for a ring — a ring at 1.35 is at 1.35 whatever
the planet is doing — and wrong for anything that must sit just outside a glow,
because how far the glow reaches is a fact about the BODY. `depthAbove: [lo, hi]`
resolves against `body.extent`, so one authored pair means "just clear of the
halo" on every archetype.

It deliberately reads `body.extent` (layers only) rather than the scene's
composed extent, so one outward trait cannot push another further out each time.

### D153 · `density` and `repeat` are two different claims, and the larger one wins

**Where:** `stellar-collector`, and a count that never did what it said.

The user asked for "a number of stellar collectors range between 1-12 at
random". Authored as `density: {min: 2, max: 12}` with `repeat: [2, 12]`, the
measured counts across eighty bodies came out **8, 9, 10 or 11 and never 2 or
3** — because `traitroll.js` computes the count from `density` and then raises
it to the anchor count, never lowering it. At the default Detail density the
density figure was about eight, and eight beat almost every repeat roll.

`density: {min: 1, max: 1}` is how the grammar says **"extent, not count"** — the
same declaration an ice cap makes, and the code comment names that case. With it
the placement wins outright and the count IS `repeat`. Counts now span 2–11.

The general form: **Detail density is a statement about how much texture the user
wants to look at.** A count that is a fact about the world — how many stations
somebody built — must not be expressed as a density band, or the slider silently
becomes the author.

### D154 · Even spacing puts instances on exactly the bearings a frame loses first

**Where:** the collector's `jitter`.

With `spacing: "even"` and a low count, the instances land on the cardinal
bearings — and the cardinal bearings are where a rectangular frame runs out
first, because the corners reach further than the edges. Measured, a two- or
three-station body could put *all* of them off canvas at once.

Raising the jitter from 0.12 to 0.42 — a fifth of a step, invisible as
irregularity — took the zero-visible count from 3 in 80 to **0 in 104**. Worth
knowing as a class: even spacing and a non-circular frame interact, and the
interaction only bites at low counts, which is exactly where it is least likely
to be tested.

---

## Deliberate declarations

**The megastructures no longer exclude one another.** The collector used to
declare `excludes: ["dyson-structure"]`, on the reasoning that they were the
same technology at two scales of ambition. They are not any more: a mirror ring
and a rank of coned collector stations are two different pieces of
infrastructure, the way a solar farm and a refinery are. `Harvested Star` now
forces both, which is where that reads as the point rather than as clutter.

**The glass takes the star's colour, and that is a deliberate D80 exception.**
`hullFill` keeps a manufactured object independent of the body's hue on purpose
— industry does not belong to the star, and that independence is what makes a
built thing read as an intruder. The metal backing still obeys it. The glass
does not, because the glass is not the object's colour: it is the star,
reflected. Named in three places (`mirrorFill`, the primitive, the trait) so a
later session does not "fix" it.

**`CC.Palette.emitted` is the brightest VISIBLE self-lit layer, and both tests
were measured rather than reasoned.** Taking the first emissive layer reported an
ordinary planet as emitting bright orange from its molten core — a cutaway shows
the core to the reader, not to a mirror in orbit. Taking the outermost gave the
corona, or on an old giant the shed envelope: faint haloes at v=0.27 against a
photosphere at v=0.65. What a mirror reflects is the body's LIGHT, so the test is
value among the layers that reach the surface.

**Two new primitives, each earning it on silhouette (D80).** `orbital-mirror` is
two flat rectangles sharing an edge, because only that can say WHICH WAY an
object faces — orientation is toward the body centre, the opposite of `capsule`'s
`upright`. `coned-cylinder` exists because `upright` picks an AXIS and a capsule
is symmetric, so one pointing at the star and one pointing away are the same
drawing; the cone gives the shape a DIRECTION.

**`tiers: 1` plus `named: true` on the collectors, checked before authoring.**
`named` selects the largest tiers and waives the tier alpha penalty; it does NOT
cap the instance count at one, which is what makes it usable for a trait that is
2–12 objects. With `TIER_SIZE[0] = 1.00` the authored size is the drawn size, so
the user's hand-calibrated 10%-wide band reaches the canvas undivided. At the old
`tiers: 2` it would have been multiplied by 0.52 and been nothing like the band
asked for.

**No other family's render can change.** Both new mechanisms are opt-in by
declaration and asserted so: no non-stellar archetype has a `thins` trait
eligible, and `emitted` is null on all three. The `orbit-safe` gate was checked
from the other side too — rings and debris still draw on planet, gas giant and
ice giant.

**Two files were split at real seams rather than at byte counts** (D128's rule).
`stellar-magnetic.js` reached 554 lines after the flare rework and split into
what the field throws OFF the limb and what it does ON the surface — a starspot
is the only mark in the family darker than what it lies on, and it is drawn on an
opaque layer rather than a screen-blended one, which is the same seam
`draw/primitives/` is already split along. `stellar.js` came back under 500 by
deleting header prose that each function already carried in full.

---

## Still open

- **`stellar-collector` diffs low (1,700–3,300 px) rather than absent.** It is a
  handful of small manufactured objects against black, so this is expected — but
  it is the trait that has now hidden twice, and it is the one to check first
  after any change to framing or to the corona's reach.
- **The `thins` mechanism has one client.** It was built general — any trait may
  declare it, on any family — but only coronal holes use it, so its behaviour on
  a layer with sparse elements is untested. A body wanting a bald patch is the
  obvious second client.
- **Prominence `span` was narrowed from 1.05 to 0.34 radians.** That is a large
  move made on one large-render judgement; it reads correctly at both scales, but
  it is the kind of number a contact sheet should confirm across many bodies.
- **`js/draw/details.js` is over 500 lines** (1,018) and was already over before
  this session. `styleFor` and the fill functions are a real seam if it is ever
  cut.
