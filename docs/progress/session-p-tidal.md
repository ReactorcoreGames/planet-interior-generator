# Session P — Phase 6 polish, doc 2: the tidal bulge reaches the body

*`docs/PHASE-6-POLISH-2-TIDAL.md`, inserted ahead of the traits doc because it
moves the surface those traits would otherwise be tuned against (D75/D119).*

---

## The standing problem, and the verdict

The user's words were the acceptance criterion:

> *"Tidal locking on the star only pulls/bulges the ethereal corona layer but
> the rest of the star's structure looks quite static, which deflates the
> impact of the tidal effect I was hoping for. I was thinking that the tidal
> lock could also influence the chromosphere and photosphere — the thinner
> layers right after the top most fade-out layer — making them bulge more
> towards the direction of the pull."*

| Done-condition | Result |
|---|---|
| The companion slider **visibly deforms the body**, not only the corona | Rendered; the user's call |
| **The interior is still round** | **Yes** — measured: skin 26 px peak-to-trough, convective 13 px, radiative 2 px, core 0 px |
| The bulge is **in the extent sweep**; no crest cropped flat | **Yes** — swept over the outermost banded layer |
| The chromosphere and corona **never separate** | **Measured at every bearing** on all six zoned bodies: 0.00 px |
| `Tidal locking` **does something on both giants** | **Yes** — inflated deck, swollen banded decks, day/night species split |
| The terminator-breaking banded lever was **not** built | Not built |
| Nothing in `js/draw/` names a role | **Held** — there are no role string literals in `js/draw/` at all |
| The solid family's render is unchanged | **Asserted at FULL lock**, not only at zero: `planet` is byte-identical |
| Session O's done-conditions still hold | **Re-measured** — every thickness and wobble % unmoved; stellar `extent` unchanged |

---

## Decisions

### D140 · `swellAt` is `airAt`'s sibling, and the unit is the whole design

**Where:** `gen/zoneswell.js`, consumed in `draw/scene.js`'s `bounds[]` loop.

The doc's plan was right and mostly wiring: `levelFn` in `draw/layers.js` was
already "displace this boundary by a function of angle", built for a tidally
locked ocean whose surface is not flat. **A photosphere bulging toward a
companion is the same statement**, so it needed no new drawing code.

Three things had to be got right and each is a different kind of unit error:

- **Neutral 0, not 1.** `air` is a multiplier on a thickness; this is a signed
  displacement, so its unzoned state is "no offset", like `sea` and `snow`.
- **A proportion of the LAYER's thickness, not the body radius** (D131).
- **`levelFn` takes an ABSOLUTE offset**, so the consumer multiplies by
  `layer.thickness` before handing it over. The disagreement would have been
  invisible on a thick layer and catastrophic on a thin one.

It also takes a **role**, which `seaAt` and `airAt` do not. Those two belong to
one layer each, so there is nothing to be deep about; this one applies to the
whole banded stack and the entire point is that it must *not* apply equally.

### D141 · The swell needed its OWN anchor list, and measuring is what showed it

**Where:** `swellAnchor` / `swellResidue` in the two zone recipes.

The obvious move is to add `photosphere` to the recipe's existing `anchor` and
let `strengthFor` do the work. Measured, that is wrong, and it is worth
recording because it would have looked like it worked:

```
                        anchor as-is    + photosphere
  main-star convective     0.209           0.380
```

`anchor` is shared by `air`, `temp` AND `colorShift`, so extending it deepens
all three at once — the interior visibly picking up the terminator, which is
**the one outcome the whole axis exists to avoid (D84)**, arriving as a side
effect of a change that was only ever about geometry.

The generalisable half: *how far down a hot face TINTS and how far down a
bulge DEFORMS are different questions, and there is no reason their answers
should share a list.* The same argument produced `swellBlend` (D143).

### D142 · A proportion of a THICK layer is a large displacement — D131 from the other side

**Where:** `swellCap` in `gen/zoneswell.js`.

"A proportion of the layer's own thickness" is the right unit for a skin and
is the whole reason this field is not stated in body radii. It has a
consequence that only shows up when measured. On a main star at full lock,
**with the depth falloff already doing its job**:

| Layer | swell, as a proportion | as a fraction of the body |
|---|---|---|
| photosphere | 0.36 of a 0.062 layer | **2.3%** |
| convective | 0.15 of a 0.519 layer | **7.9%** |

So the interior was deforming more than three times as hard as the skin the
feature is about, while every proportion in the recipe said the opposite. This
is the *"a proportion is only calibrated for what it's a proportion of"* trap
(D93, D75, D119), and **the depth falloff cannot catch it because the falloff
is a proportion too.**

The cap is therefore stated in the unit the problem is in — body radii, taken
from what the skin itself moved — and **a share of it, not all of it.** The
first version capped the interior *at* the skin's figure, which stops it
leading but lets a thick layer saturate against the cap across the whole
facing arc: it then moves as one rigid piece exactly as far as the skin does,
which reads as the star sliding sideways rather than as a surface being
pulled. `SWELL_INTERIOR = 0.35` is `LIMB.surface` / `LIMB.interior` (D129)
reappearing on geometry.

**It lives in the field, not in the renderer.** The first draft computed the
cap in `draw/scene.js`, which was wrong for a reason worth keeping: the
boundary and the detail elements are two consumers, and a cap applied in one
and not the other shears the marks off their own band — a defect that would be
invisible on any body whose interior is thin.

### D143 · Geometry needs a wider cross-fade than colour does

**Where:** `swellBlend` in `gen/zones.js`, declared 0.60 in both recipes.

A zone holds its declared figure **flat** across its arc and blends only at the
edges, so `blend` sets how steep a transition is. At the shared 0.30 the
silhouette developed **hard faceted kinks** at both terminators — plainly
visible on the gas giant before anything else was wrong with it.

Measured on a main star at the calibrated amplitudes: **0.056 of the layer's
thickness per degree** at the night/twilight edge, against 0.028 at 0.60.

The lesson is not "0.30 was too small". It is that **the same width that reads
as a crisp terminator in COLOUR draws as a crease in an OUTLINE**, because the
eye resolves a discontinuity in a silhouette far more sharply than one in a
tint. A crease produced by the field the cross-fade is meant to smooth is the
same shape of error `shiftAt` documents at length for the value delta.

Two fixes, both kept: the wider blend, **and** the twilight zones carrying a
midpoint `swell` rather than 0. Zero is correct for `temp` and `colorShift` —
the terminator genuinely is the unperturbed state — and wrong for geometry,
because it pinned the boundary back to its unswollen radius across the whole
twilight arc and forced the climb into the narrow blend region.

### D144 · Elements are placed against the layer's NOMINAL band, and had to be told to ride

**Where:** `rideSwell` in `gen/details.js`.

The old giant rendered its swollen photosphere as a **flat salmon crescent with
a hard edge** while the rest of the band carried speckle. `gen/elemgen.js`
`radiusAt` places every element against `layer.inner + t * layer.thickness` —
the unswollen band — so the crescent a layer *gains* contained no elements at
all, and the trailing side crowded its marks into a band narrower than the one
they were spread across.

D75/D119 arriving exactly on schedule, and the reason this doc ran before the
traits one.

Fixed in `gen/details.js` rather than in `radiusAt`, because every builder
rolls its own angle and threading the field through six call sites is six
chances to miss one; the zone-tagging loop already visits every element with
its role. **Scaled by the element's own depth in the band** — a mark at the
outer edge follows the boundary exactly, one at the inner edge barely moves,
because that edge belongs to the layer below's swell. Displacing the band
rigidly would shear it off the layer beneath.

### D145 · The giants' "deliberately not wired" comment had expired

**Where:** `tidalLocking()` in `data/archetypes/gaseous.js`.

The file carried a comment saying tidal locking was deliberately skipped
because *"the axis recipe is written against a body with a sea level, a
snowline and a terrain field to pinch — none of which an envelope has."*

That was true when written and stopped being true in Session O: `fieldAt` gives
every omitted key its neutral value, so **a giant writes a shorter recipe
rather than needing a different mechanism.** The comment is replaced by the
recipe it was waiting for.

Both levers the user chose are in, and the third — banding that breaks at the
terminator — was **not built**, as instructed.

**The day/night split reached the STAT CARD for free**, which was not planned:
a locked giant's card now reads *"One face never turns away — the day is the
year"* and *"-183 C on the night side, 58 C on the day side"*, because `temp`
already feeds the climate and the card already reads the climate. One axis,
more consumers (D27), with no new text.

**No relabel needed, and it was verified rather than assumed.**
`test/_tmp/dialboot.mjs` shows the gas giant reading "Tidal locking" /
"Lock facing" — the DOM defaults, via D132's fallback. On a hot Jupiter the
phrase is simply true.

---

## Measured, so a future session need not re-derive it

Peak-to-trough boundary displacement at full lock, 900 px canvas, 324 px/radius:

| Body | skin (chromo/photo) | first interior layer | deepest |
|---|---|---|---|
| young-star | 34 / 43 px | 21 px | 0 px |
| dwarf-star | 22 / 29 px | 14 px | 0 px |
| main-star | 25 / 27 px | 13 px | 0 px |
| old-giant-star | — / 25 px | 12 px | 0 px |
| gas-giant | 26 / 35 px | 15 px | 0 px |
| ice-giant | 32 px | 16 px | 0 px |

**The amplitudes went up by 2.5x after the first measurement**, and that is
§4 of the doc confirmed rather than argued. At the initially authored figures
the skin moved 10 px peak-to-trough on a 648 px body — D126's failure profile
exactly: plenty of changed pixels, invisible. The fix was **not** to swell the
interior (that is D84 wearing a new hat); it was that a proportion of a thin
layer is a small number and the proportion itself had room to grow.

**Stellar `extent` is unchanged** at 1.6362 / 1.4499 / 1.7898 / 1.2406 — the
corona still sets the reach, so the swell is nowhere near being cropped and
Session O's framing is untouched. The giants' extent grew (1.0317 → 1.0753),
which is correct: they had no axis at all before.

**Layer thicknesses did not move.** Every `frac`, `maxThickness` and wobble
percentage is where Session M and O left them.

---

## Deliberate declarations

**Four new general mechanisms, every one opt-in by declaration:**

| Mechanism | Where | What it says |
|---|---|---|
| `swell` | zone recipe | this banded boundary is displaced per bearing, in units of its own thickness |
| `swellAnchor` | zone recipe | how far down the DEFORMATION reaches, independently of the tint |
| `swellResidue` | zone recipe | what the deep stack keeps — 0 on both recipes |
| `swellBlend` | zone recipe | this field's own cross-fade width |

Asserted rather than trusted: **the solid family renders byte-identically at
FULL lock**, not merely at zero. The zero case is free by construction
(`Zones.build` returns null), so it proves nothing; the interesting negative is
at the other end of the dial, and `planet` is absent from the diff.

**`js/gen/zoneswell.js` is a new file at a real seam (D128).** `gen/zones.js`
crossed 500 lines when the swell landed. The cut is not a byte-count split: the
swell is the only field with its own depth list, its own cross-fade width and a
cap of its own, precisely because geometry and light want different answers to
the same three questions. It is handed `fieldAt` and `strengthFor` rather than
reimplementing them, so there is still one sampler and one shared depth factor.
**The extraction was verified to change no pixel** — checksums identical across
all seven archetypes before and after.

`gen/zones.js` 425, `gen/zoneswell.js` 249. Both under the rule.

---

## Still open

- **THIRTEEN FILES REMAIN PAST THE ≤500-LINE RULE**, `draw/film.js` at 1,339
  still the worst. This session added one file and kept both halves under the
  limit, and made no over-limit file meaningfully worse — `draw/scene.js`
  1,153, `gen/details.js` 743 and `data/archetypes/gaseous.js` 695 each grew,
  and all three were already over. The standing recommendation from Session O
  is unchanged: this wants its own session, cutting each file at its own seam.
- **`SWELL_INTERIOR = 0.35` is one number for every body.** It is the share of
  the skin's displacement the interior is allowed to follow, and it was tuned
  on a main star and checked on the other five. Whether a dwarf's enormous
  convective envelope wants a different share from a young star's radiative one
  is a taste question for the screen.
- **`water-cloud` swells further than the `troposphere` above it** on a gas
  giant (24 px against 18 px), because it is the thicker layer and both are
  anchored. It is buried under the troposphere so it does not read as wrong,
  but it is an ordering the cap does not currently police — the cap only
  separates anchored from unanchored, not anchored from each other.
- **The stellar traits are still untouched.** `PHASE-6-POLISH-3-TRAITS.md` now
  runs against a surface that has stopped moving, which was the point of the
  ordering.
