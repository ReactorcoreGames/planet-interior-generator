# Session R — the stellar limb, calibrated against the app

*Phase 6 polish, a follow-on to [session-q-traits.md](session-q-traits.md).
D155–D162. No layer stack, proportion or transport treatment was touched;
this session is entirely marks on and above the limb.*

Session Q built the stellar traits and signed them off against renders. This
session put them in front of the user, who looked at the actual app and found
that four of the six were wrong in ways no harness had reported — and then
rebuilt the coronal hole three more times before it was right.

The through-line: **every fault here was a disagreement between what the code
said and what the picture showed**, and in every case the picture was the
authority. Several of them had been present for two sessions.

---

## D155 — `ctx.rotate(angle)` sends local +y INWARD, and two primitives assumed
## the opposite

`view.at(f, ang)` places angle 0 at the top of the canvas and increases
clockwise, so the outward radius at bearing `a` is `(sin a, −cos a)` in pixels.
`ctx.rotate(a)` sends local +y to `(−sin a, cos a)` — which is **inward**.

Both `orbitalMirror` and `conedCylinder` had comments asserting that +y was
outward, and both placed their facing feature accordingly. So every mirror
presented its metal backing to the star and its glass to empty space, and every
collector aimed its cone away from the thing it was collecting from.

The bug survived Session Q because **a mirror facing the wrong way is still a
mirror**: it draws cleanly, it lands in the right orbit, it reports correctly,
and nothing except looking at it says otherwise. It is D77's shape — everything
except the render says it worked — applied to an orientation rather than to a
placement.

The arithmetic is now written out in both files, because it is not something a
reader can check from the drawing code alone.

**The general rule: a frame convention must be stated as arithmetic where it is
used, not asserted in prose.** Prose that says "+y is outward" is exactly as
convincing whether it is true or false.

---

## D156 — fading TOWARDS nothing is not ending AT nothing

The flare storm's "flat top" took three attempts, and the second one is the
instructive failure.

1. The fan was one filled path. A `fill()` has ONE alpha, so however carefully
   the outline tapered, the material was exactly as opaque at the tip as at the
   foot — the shape ended, at full strength, on a straight line.
2. So it was cut into slices, each filled at its own alpha, running `(1−u)^1.7`
   from foot to tip. **The flat top was still there.** A decaying power never
   reaches zero: the last slice was still at about a tenth, comfortably above
   any sane cutoff, so the ribbon ended at a visible alpha on a straight line
   across its width. The fade was working perfectly and had not fixed anything.
3. The curve is now pinned to zero AT the end (`smoothstep × (1−u)`), so the
   final slice is transparent by construction.

The same fault turned up twice more in the same session in different clothes:
the open field lines ended at a visible alpha (`energisedFade` now pins to zero
the same way), and — the interesting one — the *set* of lines ended on a common
line even when each individual line was fine, because they were all the same
length. A row of strokes with a shared tip is a hairline, whatever the strokes
look like.

**Any mark that leaves must dissolve; "gets fainter" is not the same property
and does not look like it.**

---

## D157 — a per-slice alpha, not a gradient, on anything that curves or leans

The instinct for fading a stroke is a linear gradient along its axis. That is
correct only for a mark that is straight and radial. A flare ribbon leans, a
field line meanders, a prominence arcs — and a linear gradient in SCREEN space
fades along the wrong axis for all of them, most visibly on marks near the
frame edge where the lean is largest.

Both `flare` and `fieldLines` now walk their own curve in short segments and
set `globalAlpha` per segment. It costs a few more draw calls and is correct at
every point of the path regardless of how it bends.

---

## D158 — two marks each calibrated alone are not a calibrated pair

The coronal hole ended up drawing two elements at the same bearing: the wind
rays (`open-field`) and the field lines (`field-lines`). Each was tuned on its
own and each looked right on its own. Composited they read as **dense hair** —
a fault neither mark exhibited and neither mark's numbers explained.

Four separate causes were compounding, and no single one accounted for the
result:

- every open line was within 15% of every other, so their tips formed a
  continuous edge (D156's third form);
- the counts were each reasonable and jointly a thicket;
- the closed mesh was nearly as tall as what rose out of it, so there was no
  floor to escape FROM;
- the wind's ray count had been set when the wind was the only thing a hole
  drew.

**When a composite reads wrong, tune the composite.** Every one of these
numbers was defensible in the file it lived in.

---

## D159 — `ElemGen.build` copies the fields it knows and silently drops the rest

The wind was being cut off in a perfect circle at the body's extent. The clip
responsible was found and an `escapes` flag added to let this one trait out of
it — and the render did not change at all.

`escapes` had been declared on the element RECIPE. `ElemGen.build` copies the
recipe fields it knows about; anything else vanishes without a warning. So the
flag was set correctly in the trait, read correctly in the renderer, and was
`undefined` in between.

It is now stamped onto the finished elements in the same loop that sets `role`
and `trait`. **Anything the renderer must see that is not already part of the
recipe format belongs on that loop, not on the recipe.**

Worth noting how it was found: the user's screenshot showed a *hard* circular
edge. A fade would have been soft. The shape of the artefact identified the
mechanism, which no amount of re-reading the flag's declaration would have.

---

## D160 — the diagrammatic register is a place to stand, not a fallback

The coronal hole failed three times: a dark wedge (flat and hard-edged because
dark paint under `screen` is nearly a no-op — D150), a pure absence (invisible,
because an absence is legible only against a baseline the eye can measure and a
plume field is irregular by construction), and the wind rays (visible at last,
and still "tame").

All three competed with the prominences and flares **on their own terms** —
brightness and silhouette — on a limb where those marks were already winning.

The fix was not a fourth shape. It was a different REGISTER: everything else on
a stellar limb is MATERIAL, and the field lines are the illustration explaining
a mechanism — the register the mantle's flow arrows and convection swirls are
in, which the star family had never used. **A mark in a different register
cannot be beaten by a brighter mark in the first one.**

This is D76 ("the wrong vocabulary cannot be tuned into the right one") raised
one level: from the vocabulary of a single silhouette to the vocabulary of the
whole picture.

---

## D161 — a separation failsafe must guarantee VALUE, not only hue

`fieldFill` borrows the hot interior's hue (`CC.Palette.deep`, new here) so the
field lines read as belonging to a deeper part of the star than the halo they
cross — a deliberate exception to D123, the same shape as the mirror's.

The first version guaranteed only that the hue was at least 26° from the
corona's. Measured across seeds, that is not enough: on any body whose interior
is dark or desaturated the mark came out olive over a bright corona — separated
in hue, lost in value, and under `screen` close to invisible.

Value and saturation are now floored rather than derived. **Which hue a mark
takes is a fact about the body; how bright it is, is a fact about what the mark
IS.** That split is the same one the plasma tones make; this fill had
inherited both from the same place.

Also new and general: `CC.Palette.deep` walks a CHAIN of interior roles rather
than naming one. `radiative` exists on main-sequence and young stars and on
neither dwarfs (fully convective — real physics) nor old giants (h-shell). D77
again: naming one role would have coloured the trait correctly on half the
family and silently fallen back on the rest.

---

## D162 — `escapes`: one trait is allowed to leave the picture

Spanning traits are clipped to the frame's reach so nothing escapes into open
space. That guarantee is right for every mark that belongs to the star — a
prominence returns, a flare disperses, a plume falls back.

A coronal hole's wind is the one mark whose entire content is that it does NOT
come back. Clipped, it stopped dead at the halo's edge in a ragged cut across
every line and particle: a wall where the picture needed a departure.

`escapes: true` gives it a second, unclipped pass in `draw/scene.js`. It is the
only trait in the generator that deliberately runs off the frame, and that is
the point — a stream leaving the picture says the consequence is somewhere
else.

**The clip stays the default.** This is the documented exception, not a
loosening.

---

## Also settled, without a decision number

- **`companion` may now change the element KIND**, not only scale a copy. The
  mechanism already existed for the gas giant's storm showing above the clouds.
  The coronal hole needs the other shape of the same idea — two different marks
  that must COINCIDE, because they are one feature seen twice. A duplicate
  mechanism was written before the original was found; the original was
  extended instead.
- **`sectors` steer placement.** A trait declaring both `thins` and `element`
  now falls through to ordinary placement with the sectors it just rolled, so a
  hole's own marks land inside the hole. Without it the wind blew somewhere
  unrelated to the gap it came from.
- **D122 fired twice more.** The wind was authored `0.55–1.05` and reached the
  canvas at `0.081–0.121` — about a seventh, after the tier split and the
  spanning pass take their cuts. The authored number is not the drawn number,
  and the only way to know the drawn number is to print it.
- **Round dots are a mark shape nothing else on the limb uses.** Every other
  mark out there is a stroke, so the particles were switched from streaks to
  soft radial-gradient discs. The direction they carry is supplied by the lines
  they ride, which is where it belongs.
- **File splits.** `stellar-limb.js` reached 768 lines and became four files
  under the 500-line rule, split by what each mark IS: `stellar-limb.js`
  (structures the star keeps), `stellar-flare.js` (an event), `stellar-wind.js`
  (a steady state), `stellar-field.js` (annotation rather than material).

---

## What this session says about the harness

Nothing here was caught by the test suite, and nothing should have been. Every
fault was "does this look right", which is the user's call by standing rule.

But two of them — the reversed facing (D155) and the flat top's second life
(D156) — were invisible in my own renders and obvious in the user's screenshots,
for a specific and repeatable reason: **I was rendering the body at a size
where the marks were a few pixels each.** D88 and D116 already say to render
large. The corollary this session adds is that *an isolated large render can
also mislead*: the flat top was found large, but the "dense hair" fault only
existed in the composite at app scale, and the hard-edged clip only showed on a
real screenshot.

**Render large to find what a mark IS doing wrong; look at the app to find
whether the picture is right.** They are different questions and neither
substitutes for the other.
