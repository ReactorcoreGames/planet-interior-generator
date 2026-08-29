# Session S — Phase 7, the moon

*The first of Phase 7's three groups, and the first half of the solid group.
D163–D174. The asteroid is a separate session; the compact and diffuse groups
are separate again.*

The moon is the archetype the roadmap has been deferring since Phase 1, and it
was chosen first for a reason that turned out to be right: it is the only group
whose prerequisite work was already flagged and scopeable. Four new general
mechanisms, a frac table that had never been revisited, and a climate question
the archetype had to ask.

**No existing family moved.** Planet, both giants and a star render
byte-identically before and after — asserted by hashing rendered PNGs across
three seeds each, not assumed. D84 held.

---

## D163 — the authored number is not the drawn number, in the STRUCTURE stage

Open question 1 asked whether the moon and asteroid frac tables had D4's fault
— radii that do not compose. They do not: measured at all 2ⁿ combinations of
extremes, no layer inverts. The table was never misread the way the planet's
was.

It was wrong for three other reasons, and **all three were invisible until the
stack was built and printed**:

1. **Nothing sat above the ice-shell.** It was authored at 0.90–0.94 *as the
   surface*, leaving 6–10% of the radius empty — the atmosphere is optional at
   15% and `outward`, so it does not count toward the surface. Renormalization
   (D3) then divided the whole stack by up to 1.11, so the ocean drew at
   0.84–0.94 against a tabled 0.79–0.85. A table whose figures are silently
   multiplied is not a table anyone can tune against.
2. **Two layers could roll to a hairline** — the ice-branch crust at 0.020
   while its own prose calls it heavily cratered, and the ocean at 0.030, which
   is the one layer that must never be a line since the hidden sea is the whole
   reason the branch exists. Both against D5.
3. **The shell's own relief re-created fault 1 after it was fixed.** Terrain
   peaks count toward the surface, so a shell authored at 1.000 with
   `relief: 0.11` was measured at 1.055 and drawn at 0.947 — the same 5% drift,
   from a different cause, after the first correction had been made and
   verified.

D122 has always been about a mark's alpha. **It applies just as hard to
geometry**, and the structure stage has two independent ways to move a number
after it is authored: renormalization, and a layer's own relief feeding into
it. The only way to know the drawn radius is to build the body and print it.

`test/_tmp/_moonstack.mjs` is that probe, and it was written before any number
was tuned.

---

## D164 — a shell of ice is EVIDENCE that the body is cold

The ice-shell shipped first as `presence: 0.40` — an ordinary optional roll,
which is what every optional layer in the generator had been.

Measured across 400 bodies: **only 11% of ice moons actually showed the thing
the branch exists for**, a frozen shell over a liquid sea. The rest were warm
bodies wearing a lid, some of them at 610 °C — a card saying "hot enough to
melt lead" beside a render of a sheet of ice.

The roll was asking the wrong question. A shell of ice is not a feature a body
might happen to have; it is the *consequence* of the body being cold, and the
generator already knows how cold a body is. `presence: { colder, fade }` is the
new form, and it asks `CC.Climate.baseline` — the real function, exported for
exactly this, because a caller that reimplements "how warm is this body" agrees
with itself and not with the renderer (D27, D35).

After: **65%** show the signature picture, 83% frozen surfaces, 81% liquid
oceans. The remainder are honest — a dead moon's sea does freeze through, and
the card says so rather than promising an ocean the picture cannot support.

**The general shape: when an optional layer is the visible consequence of a
fact the generator already computes, rolling it independently will contradict
that fact on most seeds.** It will not look like a bug; it will look like
variety.

---

## D165 — a threshold has to be the one the MATERIAL cares about

The probe measuring D164's claim used `CC.Climate.COLD` for "is the surface
frozen" and reported 18% for something that was, on inspection, mostly true.

`COLD` is 0.18, which `toCelsius` puts near −60 °C. It is the climate module's
label for a *deep-frozen* world, not the freezing point of water. The question
being asked was "is this shell at −60", and the question that matters is "is
this shell below zero" — which is 83%.

The same error had already been made one layer down: the archetype's insulation
`floor` was set to 0.30, below the 0.375 that maps to 0 °C, so it was
**promising an ocean that is solid**.

**A named constant is not automatically the right threshold.** Both of these
read plausibly and both were asking about a temperature nothing in the picture
cares about.

---

## D166 — the ice moon's two temperatures, as a declared second question

`tempAt` describes the shell's SURFACE, which is frozen — that is why there is
a shell. The ocean beneath is liquid because the shell insulates it and the
interior warms it from below. Let one field answer both and you get a frozen
ball with an inexplicable sea, or a warm world with an inexplicable crust.

`climate: { subsurface: { layer, insulate, floor } }` is the archetype
declaring that it has two, and it is **the third escape hatch of exactly the
shape `starlit` and `selfHeated` already are**: declared, never detected, with
gen/climate.js still forbidden from asking what role a layer has.

It invents no second climate. It reads the same `heatTerm` the baseline reads
and declines the surface losses — Interior heat is already the term that
reaches the surface from below (D41), and an ice moon is that arithmetic with a
lid on it. So Interior heat stays a real control on the ocean while the surface
stays frozen at every setting.

It returns **null** when the archetype declares none *or when the layer it
names was not built*, so "has this body a second temperature" is answered by
the stack rather than by an assumption. The card's new `Beneath the ice` row is
dropped when the value is null, which is also the generator's first row that
only some bodies in a family have — handled by filtering nulls rather than by
branching the template, so the template still declares one line order and the
panel still decides nothing (D53).

---

## D167 — a frosting spec is per SURFACE, not per body

The zone table and its colours were resolved once for the whole body. That was
the entire truth while every archetype had one frosted surface, and it is what
made the ice moon's payoff impossible: two frosted surfaces facing each other
across a dark ocean, differing in colour, character **and direction**.

`CC.Frosting.specFor` resolves per role, most specific first —
`layers[role].film_when[otherRole]` → `layers[role].film` → `layers.film`. The
body-wide fallback is **last**, so a planet and a giant resolve every terrain
layer to the one spec they always did and nothing that worked before moved.

`film_when` is the colour-profile sibling of `frac_when`: a moon's crust frosts
as regolith when it is the surface and as a brine floor when it is a sea bed.

**Each spec needs its own RNG stream.** Sharing one handed both surfaces the
identical aridity roll, hue spread and per-zone jitter, so the brine floor and
the accreted ice came out as one material drawn twice — which would have read
as a colour-rule bug rather than the missing seed it was. The first spec keeps
the original stream name, so every existing body's frosting is byte-identical.

---

## D168 — `direction: -1`, and the three places the sign is NOT the radii

The spec predicted "a few sign changes rather than a rewrite", and that was
right — but not in the places the phrase suggests.

`drawFrosting` now works in the **deposit's own frame**: "up" means away from
the surface the material grew on, and `dir` is the only place the two cases
differ. Pooling, shedding, zone weights and feathering are then the same
arithmetic seen in a mirror. Three things besides the radius conversion needed
the sign:

- **the terrain field itself** — a bump on an underside is a dip the ice
  gathers in, so without the flip the accretion built on the ridges and shed
  from the troughs, which is upside down in the literal sense;
- **the rock floor the ribbons clamp against** — `boundFn` describes the
  layer's *outer* boundary and means nothing for an underside;
- **the band clip**, which had to be opened downward or the hanging material
  was clipped away entirely. That is the same trap the outward clip already
  cost a round on: correct maths, clipped to nothing.

Two clamps were **removed rather than mirrored**: "a deposit must not stand
above the sea" and "it must stay clear of the ice floating on it" are both
about material that settled out of water onto a floor, and neither means
anything for material hanging into the water from above.

---

## D169 — the relief lookup and the film lookup have to be ONE question

The accreted ice did not draw at all, and every visible signal said it should:
the palette resolved all six zone colours correctly, the terrain field was
built, the mask was built, `direction` was −1 in the table.

`filmZoneByRole` was assembled by walking layers and asking
`CC.Elements.reliefFor(role)` — which finds a role's **shared** terrain and
knows nothing about a layer that declares its own field as `reliefSpec`. The
ice shell is exactly that layer, so it got no zone table and its frosting
silently did not exist.

The draw loop asked the question one way and the table builder asked it the
other. **D159's shape** — correct at both ends, undefined in between — arriving
in the frosting rather than in an element recipe. Both sites now read the same
chain: the layer's own spec first, then the role's.

Worth noting how it was found: by printing `filmZoneByRole` and seeing one key
where there should have been two. No render would have said it, because a
missing deposit and a too-faint deposit look identical.

---

## D170 — `reliefSpec`, because a moon's ground is a different FIELD

Element recipes are keyed by role globally, which is what makes a `crust` mean
the same thing on every body that has one and is why adding a family adds no
drawing code. `elementScale` already closes the "how much of it" gap.

It cannot close this one. A planet's crust field leads with a 3-cycle band that
reads as **landmasses**, because a planet has landmasses. A moon does not: it
has a surface that has been hit for four billion years with nothing to erase
the record. Scaling the planet's field up gives bigger continents, not more
craters — they are different fields, not one field at two amplitudes.

`reliefSpec` on the layer overrides the role's, exactly as `elementScale`
overrides its counts, and it is undefined on every layer that existed before
the moon.

---

## Also settled, without a decision number

- **`presence: { requires }`** — the subsurface ocean is a consequence of
  having a lid, not an independent roll. Resolved against what has already been
  placed, which works because the stack is walked outermost-first; a dependency
  the other way would be "this lid exists because there is a sea under it",
  which is backwards.
- **`frac_when`** — the one place in the solid family where a stack genuinely
  branches. TRAIT-SYSTEM.md's third test coming out the *other* way for once:
  the crust at the surface and the crust as a sea floor are not the same layer
  at a different thickness, and no slider interpolates between them.
- **`hueFrom: "host"`** — the one place the free frosting hue is wrong. A
  planet's cover has chemistry of its own, so "orange grass or pink forests are
  a feature" (D19). Regolith is the rock itself, ground up, so its hue is the
  rock's by definition. Measured before the flag: zones at hue 138 and 97 over
  rock at 169, which is moss on stone.
- **The regolith deposition was correct before it was legible.** Settled span
  0.091 against a rock span of 0.155, 50% of bearings pooling and 50% shedding
  — filling crater floors and swept off rims, from `depositTop` alone. The
  numbers said so well before the render did, which is the right order.
- **The doccheck learned about branches** rather than gaining a moon-shaped
  exception. Composing `frac_when` variants as one flat list compares layers
  that never coexist and reports overlaps that cannot happen; it now enumerates
  the branches and checks each as a whole stack. Still generic over
  `CC.Archetypes.ids()`, still adds no code per family — which is the rule the
  check has to keep to earn its place.
- **Four presets, spanned by different axes again.** Ocean depth does nothing
  on a moon, so the first axis is Starlight — which here does something much
  sharper than "warmer", since it *decides the stack*. Verified across 25 seeds
  each: every preset delivers what its blurb promises on 100% of them,
  including `Frozen Dead Moon`, which exists precisely because it is the
  position where the two-temperature machinery reports a negative.

---

## D171 — registered is not REACHABLE, and the suite could not tell

The moon was registered, stack-checked, climate-checked, rendered, presetted
and written up — and it was **not in the archetype dropdown**, so no user could
select it. The user found it in about a minute of opening the app.

Every check passed, and they were all correct. The reason none of them caught
it is the whole point: **the suite drives archetypes through
`CC.Archetypes.ids()`, and the GUI reads a hand-written `<select>` in
index.html.** Two lists, and nothing compared them. Every probe in this session
constructed a moon directly, which is precisely the code path a user does not
have.

This is D79's shape — a defect that lives only in the real GUI — arriving one
level earlier than usual. D79 was about a control that heard about *changes*
but not its initial state; this is about a body that exists everywhere except
the one list a person can click.

`npm run test:docs` now asserts the dropdown and the registry agree, in both
directions. It earns its place by the CLAUDE.md rule — mechanically
true-or-false, generic over `CC.Archetypes.ids()`, and adding a family still
adds no test code; it simply has to add its option. The asteroid, the compact
group and the nebula will each be caught by it if they forget.

**The general rule: when a new thing has to appear in a hand-maintained list,
the check belongs on the LIST, not on the thing.**

---

## D172 — a locked recipe written for a surface sea is WRONG under a lid

Found by the user in the app, and diagnosed correctly by them from the picture
alone: a tidally locked ice moon showed the ocean retreated to one side with
the ice shell still spanning the emptied space. Their words were that the shell
would need "underground support pillars" to stand — which is exactly the tell
that a render is asserting something impossible.

The cause was a copy. The moon's tidal recipe was the planet's, including
`sea: -0.85 / +0.10` — and on a planet that is the feature's whole centre,
because sea level is what every downstream system measures elevation against,
so moving it by bearing pinches the ocean AND drops the snowline AND moves the
shore with no new drawing code.

Under an ice shell it is false twice over:

- **a subsurface ocean is sealed.** It has no exposed surface to evaporate FROM
  and nowhere to retreat TO;
- **the shell is a rigid layer at a fixed radius**, so an ocean that retreats
  leaves a lid spanning a void.

Measured before the fix: sea level swung **0.149 of the body radius** across a
fully locked ice moon.

`field_when: { "ice-shell": {...} }` is the fix — the sibling of `frac_when` in
the stack and `film_when` in the colour profile, resolved in `Zones.build`
because that is where the body is known and the archetype cannot see which
branch it rolled. The ice recipe simply **omits** `sea` and `snow`: every field
is read through `fieldAt(angle, key, neutral)`, so an omitted key takes its
neutral value, which is the same shorter-recipe move the gaseous and stellar
families already make and costs no code.

**What carries the lock instead is the shell's own thickness**, which is both
the real mechanism and the opposite sign from a retreating sea: tidal flexing
melts ice from beneath, so a locked moon's shell is THINNER on the tidal axis
and thicker away from it, with the ocean taking up the difference and the body
staying round. `swell` (Session P) already does per-bearing thickness, so this
was a data edit.

**And `swellResidue: 0` did not mean zero.** The shared `depthFalloff` ramps
`lerp(0.86, residue, k)` below the anchor list, so the layer immediately
beneath an anchor starts at 0.86 and only approaches the residue further down.
That is right for a COLOUR tint — a hard seam would read as a drawn contour —
and wrong for a GEOMETRIC swell, where the question is not "how much reaches
here" but "does this material flex at all". The rock crust was rippling at
−0.032…+0.024 because the ice above it was being kneaded. An explicit zero now
clamps to the anchor list rather than decaying toward it, and only when a
recipe asks for exactly 0, so every existing swell keeps its tuned falloff.

---

## D173 — rings were one object pretending to be three

Also the user's catch, and their reasoning was better than the physics
argument: seeing the same ring on a planet, a giant and a moon gave "whiplash",
because all three read as one body type with different fills.

That is **D76/D160's vocabulary problem arriving from the direction of
sameness** rather than of invisibility. The rule has always been that a trait
must be a different KIND of mark from its neighbours; the corollary is that a
mark meaning the same thing on every body stops distinguishing anything.

Two separate corrections came out of it.

**The moon should never have had rings.** It carried `orbit-safe` on an
unexamined justification I wrote in a comment — "a moon may have its own ring
or debris" — which is precisely the `requires: []` failure D146 records for
stars, repeated one family later by the person who had just read D146. No moon
in the solar system has a confirmed ring, and the reason is structural: the
stable band between a moon's Roche limit and the distance where its PARENT
takes over is very narrow. Dropping the one tag removed rings and debris
together, which is what the gate exists for.

**A giant's ring is a different object from a rocky world's.** The gate split
in three — `dusty-rings` (a rocky world's sparse debris ring), `structured-
rings` (a giant's dense ringlet-resolved sheet) and `orbit-debris` (a belt,
which both get). Mutually exclusive BY TAG rather than by an `excludes`, for
the reason the file's own header already gives: `excludes` is a trait-to-trait
relation and this is a fact about the body.

`ringlet-band` is the new primitive, and it says the three things `ring-band`
cannot: each band resolves into a bundle of finer ringlets at varying alpha
(the density thesis applied to one mark); a division is a **knife-edge break
with bright shoulders** rather than a low-alpha thinning, because a resonance
empties a band rather than thinning it; and the body casts a **shadow** across
the far side, drawn `destination-out` so it removes ring rather than painting
dark over a translucent object.

**Two wiring faults, and both looked like success.** The builder hardcoded
`kind: "ring-band"`, and the dispatch in `elemgen.build` switches on the kind
STRING — so `ringlet-band` never reached `buildRings` at all. Then the fix read
`recipe.element`, which is already renamed to `recipe.kind` by the time
traitroll hands the recipe over, so it fell back to the old value. In both
cases the giant still drew a ring system, at the right count and the right
radii, in the OLD mark. The render looked plausible and the change looked
applied. Only printing the element KINDS showed it — Session S's third leg
again: **a fault in an identity is found by printing the identity.**

---

## D174 — the ocean was pinched by FOUR different things, and I fixed three
## wrong ones first

The user reported after D172 that the ocean was still retreating. It took four
rounds to find, and the sequence is the lesson.

D172 had made `seaAt` flat and I verified exactly that — **which proved only
that one of several mechanisms was off.** Each round after found a real bug,
fixed it, and did not fix the reported symptom:

1. **The deposits ate the water.** I had deepened `accretionTip` to 0.95 and
   `brinePool` to 0.80 — each defensible alone against "does this cross the
   water", and together 159% of the gap. They met in the middle. That is D158
   (*two marks calibrated alone are not a calibrated pair*) applied to my own
   work one session after I wrote it down.
2. **The shell's underside field was a bulk tilt.** `{ cycles: 4, amp: 1.00 }`
   copied the planet's landmass band; at four cycles across a body that is not
   undulation but a systematic lean, measured −0.037 one side to +0.052 the
   other. An ice shell has no continents.
3. **The inverted band crossed its own anchor.** `h` is the terrain mirrored
   into the deposit's frame, so where the raw field is negative the mirrored
   value is positive and `top` placed the free surface OUTSIDE the wall it grew
   on — the deposit drew up inside the shell on about a fifth of bearings.

All three were real. None was the reported fault.

**The actual cause was the shell's `relief`.** `CC.Layers.reliefFn` displaces a
layer's OUTER boundary by its own terrain. On the crust that is right and is
the visible surface. On the ice shell that boundary sits directly on a thin
ocean — and `relief: 0.11`, copied from the crust's pattern, swung it 0.0886 of
the body radius against an ocean 0.1372 thick. **65% of the ocean.** Cut to
0.022: 13%, mean 16.6% and worst 24.2% across 80 ice moons.

**And then the fix from D172 caused the second half of it.** The user narrowed
it precisely — "squished where the tidal lock sunny side is" — which pointed at
the `swell` I had added to carry the lock. `swell` displaces a layer's outer
boundary while the layer keeps its thickness, so a "thinner" shell slid inward
bodily and pressed its inner edge into the ocean: 27% of the ocean's thickness,
water 1.32x wider on one side. **To thin a SURFACE layer you must move its
inner edge outward, not its outer edge inward**, and no field does that. The
swell is removed; the lock says what it can say honestly (temperature, cover,
colour) and asserts no mechanism the geometry is not performing. Water width is
now 1.14x locked and 1.14x unlocked — identical, so the lock does not touch the
ocean at all.

**What this says about verification.** After D172 I checked `seaAt` and
declared the fix good. The check was correct and the conclusion was not: I had
verified *the mechanism I changed* rather than *the property the user
described*. The property was "is the ocean an even band", and it has at least
four inputs. A probe that re-derives the arithmetic cannot see a clamp added
downstream either — my pixel probe reported identical widths with and without
the deposit, which was true and useless.

**Verify the PROPERTY the report is about, not the mechanism you touched.**

### Postscript: one of the four was chasing a phantom

The user later looked again and reported that what they had taken for a void
was **the ocean freezing** — the accreted ice reading as intended. The symptom
that drove rounds 1 and 2 was partly a misread of a working feature.

That does not retract the fixes, and it is worth being exact about which:

- **The shell's `relief` (the real cause) stands.** A boundary swinging 65% of
  the ocean's thickness is wrong on any reading of the picture.
- **Removing the `swell` stands.** That was a defect this session introduced in
  D172, and the user's "squished on the sunny side" was a correct observation
  of it.
- **The underside tilt and the anchor clamp stand**, though both are small.
- **The deposit depths are the questionable one.** They were cut from
  0.95/0.80 to 0.36/0.30 because the thick pale mass read as a defect eating
  the water. If that mass was the accretion working, the cut may have thinned
  the branch's payoff on a false premise. The pair genuinely did sum to 159% of
  the gap, so *something* was needed — but 60% may now be too timid.

**If the accreted ice ever reads as too slight, `accretionTip` and `brinePool`
in solid-moon-film.js are the numbers to raise; the ceiling is about 0.45 each
before they meet in the middle again.** Left as-is because the user signed off
on how it looks, which is the standing rule for that call.

**The wider lesson is about the report, not the code.** A symptom description
is evidence about what the user SAW, not a diagnosis — and "the ocean is
retreating" turned out to name one real bug, one bug I had just introduced, and
one correctly-working feature, all at once. Measuring found the first two
because they were quantitatively indefensible; nothing but the user looking
again could have found the third.

---

## Found, not fixed, and out of scope

**The body is cut off flat across its lower portion.** Present on the planet
and on every family, at every size, and — verified by stashing this session's
changes — **present before any of this work**. It is a pre-existing render
defect, not something the moon introduced, and fixing it belongs to a session
that can look at it properly rather than to one adding an archetype.

---

## What this session says about the method

Every fault above except the last was found by **printing a number**, and most
of them were invisible in a render:

- the drawn radii differing from the authored ones — a probe, not an eye;
- the 11% — a count across 400 bodies, where any single ice moon looked fine;
- the missing zone table — one key absent from a lookup, where the render
  showed a deposit that was merely faint;
- the moss-green regolith — a hue reading, where "slightly wrong colour" is
  exactly what a judgement call looks like.

D88/D116 say to render large to find what a mark is doing wrong and to look at
the app to find whether the picture is right. This session adds the third leg:
**a fault in a QUANTITY is found by measuring the quantity**, and neither
render answers it. The three questions are different and none substitutes for
another.
