# Phase 6 polish, Doc 2 — the tidal bulge reaches the body

*Run this BEFORE the traits doc, which is now Doc 3. Same argument that put
the body ahead of the traits in the first place: this moves the photosphere,
and Doc 3 tunes prominences and flare storms against the photosphere. Running
them the other way round would tune traits against a surface about to move
under them — the "a proportion is only calibrated for what it's a proportion
of" trap (D93, D75, D119).*

**Model:** Opus 5, medium effort.

---

## READ FIRST, in this order

- `CLAUDE.md` — locked constraints. Plain scripts, no ES modules, no build
  step, ≤500 lines per file.
- `docs/PROGRESS.md` — current state; supersedes the specs where they disagree.
- `docs/progress/session-o-star-body.md` — **the whole file.** D129–D139 are
  the traps the previous session walked into and several are directly
  relevant: **D130** (the wobble and the bulge are one mechanism), **D131** (a
  proportion of a layer's thickness needs a different FREQUENCY too),
  **D134** (what belongs in the extent sweep and what does not), **D139** (the
  authored alpha is not the drawn alpha).
- `js/gen/zones.js` — **the header and the field accessors around line 200.**
  Rule 1 (*perturb, never replace*) governs everything below.
- `docs/celestials/stars.md` → *The limb* section, and
  `docs/celestials/gaseous-bodies.md`.

---

## THE STANDING PROBLEM

The user's words, and they are the acceptance criterion:

> *"Tidal locking on the star only pulls/bulges the ethereal corona layer but
> the rest of the star's structure looks quite static, which deflates the
> impact of the tidal effect I was hoping for. I was thinking that the tidal
> lock could also influence the chromosphere and photosphere — the thinner
> layers right after the top most fade-out layer — making them bulge more
> towards the direction of the pull."*

Session O built the binary companion as a bulge on the **outward** layer only,
and that was the right first move: it is where a real tidal bulge lives, and
it kept the cutaway readable. It is also, on screen, not enough. The corona is
the faintest thing in the picture, so the one layer that moves is the one
least able to show it.

**And the same mechanism is what the gaseous family needs**, which is why both
are in this doc. See "Why the giants ride along" below.

---

## WHAT IS ALREADY BUILT — read this before designing anything

Three things exist and this doc is mostly wiring them together. Checking them
first is what kept Session O's §5 down to a data file (D130).

### 1. `levelFn` is already "displace this boundary by a function of angle"

`draw/layers.js`:

```js
function levelFn(layer, base, seaFn) {
  if (!seaFn) return base;
  var outer = layer.outer;
  if (base) return function (a) { return base(a) + seaFn(a) / outer; };
  return function (a) { return 1 + seaFn(a) / outer; };
}
```

It exists because a tidally locked ocean's surface is not flat. **A photosphere
bulging toward a companion is the same statement**: a per-bearing displacement
of a banded layer's boundary. The composition point is `bounds[]` in
`draw/scene.js` (~line 431), where every banded layer's boundary is already
`reliefFn` (wobble + terrain) composed through `levelFn` (angular level).

### 2. Every zone field is read through one accessor with a neutral default

`gen/zones.js` `fieldAt(angle, key, neutral)`. A recipe that omits a key gets
its neutral value, which is why the star's binary-companion recipe declares
only `air` / `temp` / `colorShift` and needs no `sea`, `snow`, `relief` or
`cover`. **Adding a field is one accessor plus one line in the returned
object.**

### 3. `airAt` already reaches outward layers, and only outward layers

That is precisely the defect being fixed. `airAt` is consumed by
`draw/scene.js`'s outward branch and composed into `thicknessAt` alongside the
coronal wobble (D130). Banded layers never see it.

---

## THE WORK, in build order

### 1. `swellAt` — a per-bearing displacement for BANDED layers

The one new field. `airAt`'s sibling for layers that are not outward.

- Read through `fieldAt(angle, "swell", 0)` — **neutral 0, not 1.** `air` is a
  multiplier on a thickness; this is a signed displacement, so its unzoned
  state is "no offset", exactly like `sea` and `snow`. Getting this backwards
  makes every unzoned body in the generator swell by 100%.
- Exported from `CC.Zones.build`'s returned object beside `airAt`.
- Consumed in `draw/scene.js`'s `bounds[]` loop, composed through the existing
  `levelFn`.

**IT IS A PROPORTION OF THE LAYER'S OWN THICKNESS, NOT OF THE BODY RADIUS.**
This is D131 restated and it is the single most important decision in the doc.
A photosphere is a skin a few percent thick; a fixed body-radius displacement
either does nothing to it or swallows it whole, with nothing usable in
between. `wobbleRel` was added in Session O for exactly this reason and the
same reasoning applies unchanged.

`levelFn` divides by `layer.outer` because it takes an **absolute** body-space
displacement (a sea level is an absolute height). A swell stated as a fraction
of thickness must be multiplied by `layer.thickness` before it is handed over,
or the two units silently disagree — and the disagreement is invisible on a
thick layer and catastrophic on a thin one, which is the worst possible
failure profile.

### 2. THE ANCHOR LIST IS THE WHOLE SAFETY MECHANISM

**The interior must not follow.** The layer stack is the part the user signed
off (D84) and a fusing core does not know which way its companion is. The
star's recipe already declares `residue: 0.03` for this reason.

- Anchor the swell to the **chromosphere and photosphere** — the thin layers
  just inside the fade-out layer, which is what the user asked for by name.
- Keep `residue` low so the convective and radiative zones stay round.
- `anchor` is a list (D77) because the four stars name their outer layers
  differently and the old giant has no chromosphere at all. Naming one role
  places nothing on the body that lacks it — the worst failure mode, where
  everything except the render says it worked.

**Check the old giant explicitly.** It has `shed-envelope` (outward) and
`photosphere` and no chromosphere. It is the archetype most likely to be
silently skipped, and it was silently skipped by the plume field in Session O
for the same reason (D138).

### 3. THE SNAG THAT MATTERS: a swell displaces the silhouette AFTER renormalization

**Checked against the code, and it is real.** `gen/structure.js` renormalizes
so the surface sits at exactly 1.0 (D3) — and it does that at the END of
`build`, while zones are constructed later in `gen/details.js`. **So a swell
cannot be absorbed by renormalization.** It moves the drawn edge past 1.0
after the fact.

That is not a bug — an angular sea level already does exactly this, and the
frosting and the atmosphere floor both cope with it by measuring the real
per-bearing top rather than trusting `layer.outer`. But it has consequences
that must be handled deliberately rather than discovered:

- **`extent` must include the swell.** D134 is the rule: *a measurement of
  reach should include anything whose SHAPE is the feature.* A swollen
  photosphere is the body's own silhouette, so a crest cropped flat against
  the frame destroys the feature. The same call as the coronal wobble, and the
  opposite of the emissive glow.
- **The emissive glow starts at `body.extent`** (`draw/emissive.js`). If the
  swell raises extent, the halo's inner radius moves with it — probably
  correct, but **look at it** rather than assuming.
- **The corona's inner edge is the chromosphere's outer edge.** If the
  chromosphere swells and the corona does not follow at that bearing, they
  separate. Check whether the outward layer's `inner` needs the same
  displacement, or whether the existing floor logic already covers it.
- **Anything measuring against the photosphere is now measuring a moving
  target** (D75/D119). Doc 3's traits are the obvious case and are why this
  doc runs first, but check the stat card too.

### 4. THE PUSH-BACK, STATED HONESTLY SO IT IS NOT REDISCOVERED

**The effect is strongest where the layers are thinnest, and a photosphere is
a skin.** There is a real chance that a 40% swell on a 6%-thick layer reads as
a wobble rather than as a bulge — the amplitude is genuinely small in absolute
terms even when it is large as a proportion.

If that happens, the fix is **not** to swell the interior — that is D84 wearing
a new hat. The workable middle is the one `limbDarkening` already uses: the
skin takes the full figure and the layer immediately beneath it takes a
**small share**, so the falloff spans a readable distance without the deep
interior going lopsided. Session O's `LIMB.surface` / `LIMB.interior` pair is
the precedent and the numbers are in `stellar-common.js`.

**Find this on screen rather than deciding it here.** Both readings are
defensible in advance and only one of them is right on the day.

### 5. Per-archetype amplitude

Same argument as everything else in this family: a young star and a patient
dwarf must not deform identically. Scale by archetype, and note that the
dwarf's envelope is feeble while its surface is furious — the two halves of
that archetype pull in opposite directions and a single multiplier cannot say
it (Session O, D138).

---

## WHY THE GIANTS RIDE ALONG

**The same field does both**, which is the entire reason these are one session
rather than two.

`js/data/archetypes/gaseous.js` carries a comment saying tidal locking was
deliberately not wired because "the axis recipe is written against a body with
a sea level, a snowline and a terrain field to pinch — none of which an
envelope has." **That was true when it was written and is not any more.** The
partial-axis question was resolved in Session O: `fieldAt` gives every omitted
key its neutral value, so a giant writes a shorter recipe rather than a
different mechanism. The comment should be replaced with a pointer to the
recipe it was waiting for.

The user picked two of the three levers previously sketched and **explicitly
skipped the third** (banding that breaks at the terminator — too laborious).
Do not build it.

### Lever 1 — the inflated dayside deck (free)

`upper-cloud` is `outward: true` on **both** giants, so it takes `airAt`
through the same path the star's corona uses. A hot Jupiter's day face
genuinely puffs up; that is most of why they have inflated radii at all. This
is the entire mechanical cost of making the slider do something.

### Lever 1b — `swellAt` on the banded cloud layers

`troposphere` and `water-cloud` are banded, so they take the new field from §1.
This is the user's first paragraph applied to a giant, and it is why the two
families are one piece of work.

### Lever 3 — a day/night species and colour split (nearly free)

`climateLean` already drives cloud species off `chillAt` / `scorchAt`, and the
zone's `temp` field already feeds the climate. So a locked giant gets ammonia
cirrus on the night face and hotter species on the day face **through
machinery that already exists** — the same "one axis, more consumers" shape as
`starActivity` (D27).

### The label is already correct on a giant

Unlike the star, **no relabel is needed.** On a hot Jupiter "Tidal locking" is
honest — it *is* tidal locking. The giants simply declare `axes` and the
existing dial says the right thing. `Controls.syncAxisDials` (D132) already
falls back to the DOM defaults for any archetype whose axis names no `dial`,
so this needs no UI work at all. **Verify that rather than assuming it** —
`test/_tmp/dialboot.mjs` already drives all three routes into the archetype
control and a giant case is two lines.

---

## ARCHITECTURE RULES FOR THIS PHASE

- **Nothing in `js/draw/` may name a role or an archetype.** That condition has
  held through Sessions M and O; every grep hit is a comment. `swellAt` arrives
  as a plain function of angle, exactly as `airAt` and `seaAt` do (D23).
- **Perturb, never replace** (zones.js rule 1). Every figure is a delta or a
  multiplier against what the body already rolled.
- **One axis, more consumers (D27).** This is the FOURTH consumer of
  `tidalLock`. That is fine while each is the same quantity — how hard the
  asymmetry is driven — aimed at a different cause. **It stops being fine the
  moment one of them wants a different response curve**, and if that comes up,
  say so rather than bending the shared axis. Decide it before authoring.
- **Measure before tuning.** D122: the authored size is not the drawn size.
  D139: the authored alpha is not the drawn alpha either. D126: a pixel diff
  can report tens of thousands of changed pixels while every mark is 1.4px and
  invisible.
- **Re-measure everything downstream of a layer that moves (D75/D119).** The
  photosphere is about to move and Session O calibrated the plume field, the
  wobble amplitudes and the glow's inner radius against it.

---

## TOOLS THAT ALREADY EXIST — use them, do not rebuild them

| Tool | What it answers |
|---|---|
| `test/_tmp/limb.mjs` | **The close-up limb view.** Built in Session O; reuses the app's own zoom/pan so it cannot disagree with the GUI. `--strip` gives four archetypes side by side. **This is the view most of this doc's judgements need**, and it takes an archetype argument so it works on giants too |
| `test/_tmp/binary.mjs` | The companion axis at 0% / 50% / 100% side by side, with `extent` printed. **The first thing to re-run after any change here** |
| `test/_tmp/starstack.mjs` | Radii, thicknesses, wobble as a % of each layer's own thickness. D118's lesson as a standing tool |
| `test/_tmp/dialboot.mjs` | The axis slider's label on all three routes into the archetype control |
| `test/_tmp/nostarchange.mjs` | Per-archetype extent + checksum, for "did a family that should not have moved, move" |
| `npm run sheet -- 16 4 <archetype>` | Colour across a spread. How D123's magenta-prominence class of error gets caught |

---

## TESTING STANCE

**Do not add tests unless asked.** The suite is deliberately ~30 seconds and a
check earns its place only if it is mechanically true-or-false AND generic over
`CC.Archetypes.ids()`.

`npm test` must still pass — in particular the doccheck's frac-composition
check, which has now caught an authored overlap four times.

Re-run `test/_tmp/starlit.mjs` (Starlight changes zero pixels on a star; no
polar caps) and `test/_tmp/pixdiff.mjs` **per archetype** (D121) — a swollen
photosphere moves what the traits sit on, and a trait that silently stops
drawing on one body out of four is this project's most-repeated defect.

---

## DONE WHEN

- Turning the companion slider up **visibly deforms the star's body**, not
  only its corona — the chromosphere and photosphere bulge toward the facing
  bearing.
- **The interior is still round.** The convective, radiative and core layers
  are visibly unaffected, and the cutaway still reads as a cutaway.
- The bulge is **in the extent sweep**, so no crest is cropped flat.
- The chromosphere and the corona do not separate at any bearing.
- `Tidal locking` **does something on both giants**: an inflated dayside cloud
  deck, swollen banded cloud layers, and a day/night species split — with the
  existing label, unchanged.
- The terminator-breaking banded lever was **not** built.
- Nothing in `js/draw/` names a role; the solid family's render is unchanged.
- Session O's done-conditions still hold — re-check them rather than assuming,
  since this moves the surface they were measured against.

**Show renders as you go rather than reporting that it looks good.** The user
can see the screen; whether it looks right is their call. `binary.mjs` and
`limb.mjs --strip` are the two views that matter most here.

---

## A NOTE ON THE ≤500-LINE DEBT

`session-o-star-body.md` records fourteen files past the rule, `draw/film.js`
at 1,339 being the worst. **This doc is not the place to fix it** — but do not
make it worse: if a file this session touches would cross 500, cut it at a
real seam the way D128 and `draw/emissive.js` did, rather than accepting the
overflow.
