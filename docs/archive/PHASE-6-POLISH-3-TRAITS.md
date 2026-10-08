# Phase 6 polish, Doc 3 — the stellar traits

*Run this SECOND, in its own session, AFTER
[PHASE-6-POLISH-1-BODY.md](PHASE-6-POLISH-1-BODY.md) has landed.*

**Doc 1 changes what the limb looks like.** Prominences, spicules, spots and
flares are all judged against that limb, and several of them are sized as
proportions of layers Doc 1 moves. Tuning them first would calibrate them
against a surface about to change underneath them — D75/D93, the trap this
project has walked into more than any other.

**Two items were reassigned to Doc 1 in the brainstorm pass, and one item here
now depends on it outright:**

- **The tall-prominence cut-off (§3) moved to Doc 1**, because Doc 1's plume
  field is clipped by the identical code and would have to be re-judged after
  the fix. Verify it landed; do not re-fix it.
- **Coronal holes (§6) are now hard-blocked on Doc 1's plume field**, since the
  chosen implementation is an absence in that field rather than dark paint. If
  Doc 1 descoped plumes, defer §6 rather than reimplementing it as paint.

**Model:** Opus 5, medium or high.

---

## READ FIRST, in this order

- `CLAUDE.md` — locked constraints.
- `docs/PROGRESS.md` — current state.
- `docs/progress/session-m-stars.md` — **the whole file.** D121, D122, D126 and
  D127 are all about traits on this exact family and all four are live here.
- `docs/TRAIT-SYSTEM.md` — the placement grammar.
- `docs/celestials/stars.md` — the family spec and its trait pools.
- Whatever session write-up Doc 1 produced — the limb has changed and this doc
  was written before that happened.

---

## THE SOURCE OF THIS WORK

Everything below is the user's own review of the built family, quoted where the
wording matters. **The traits are the part that needs work; the body structure
was signed off.** Do not revisit layer stacks, proportions or the
convective/radiative treatment.

---

## BUILD THE CLOSE-UP TOOL FIRST (if Doc 1 did not leave one)

Most of the judgements here are about zoomed-in appearance —
*"At close up zoomed in, prominences look particularly tame and lame."* Doc 1
was told to build a close-up limb renderer; if it exists, use it. If not, build
it before touching anything (D88).

Also re-run `test/_tmp/pixdiff.mjs` **per archetype** before starting, to get a
baseline. D121 records four traits that were invisible or off-canvas, and one
of them drew at 0 px on exactly one of four bodies — *"a trait that works on
three bodies out of four looks like a working trait."*

---

## THE WORK

### 1. Megastructures — rework both, and let them coexist

The user's framing:

> *"I wasn't expecting you to add megastructure related traits to any of the
> families yet, but hey I guess if they're here, might as well keep them, they
> seem more lightweight anyway, but I do want to rework them."*

#### 1a. They must NOT exclude one another

`STELLAR_COLLECTOR` currently declares `excludes: ["dyson-structure"]`.
**Remove it.** Both should be able to exist on the same star.

#### 1b. Dyson structure becomes an orbital mirror / solar panel ring

> *"Dyson structure can be converted into an orbital mirror/solar panel ring,
> changing the capsules into double rectangles, one metal, one glass and the
> glass side is facing towards the sun, adopting whatever color the star is
> emitting, also said glass being bright and emissive/glowing."*

Concretely:

- **Two rectangles, not one capsule.** A metal backing and a glass face.
- **The glass side faces the star** — orientation is toward the body centre,
  which is the opposite of `upright` and needs to be explicit.
- **The glass takes the star's emitted colour** and is bright and emissive.
  Note this is a deliberate exception to the rule that `hullFill` keeps a
  manufactured object independent of the body's hue (D80) — the metal half
  stays independent; the glass half is *reflecting the star*, which is the
  whole idea. Say so in a comment so a later session does not "fix" it.
- Rename the trait to match what it now is (`orbital-mirrors` is already a
  name `stars.md` uses).

This is a **new primitive**, not a `capsule` variant — D80 five times over on
this family: a soft blob cannot say what a thing is, and neither can a rounded
rectangle say "mirror".

#### 1c. Stellar collectors — new shape, tight size band, even spacing

> *"A vertical cylinder with a cone end at the bottom side, pointing at the
> star. Size range of the current ones are also problematic; too large max size
> and too much variation between them. I say take the current minimum floor
> size and make that the maximum and the new minimum size is 10% smaller than
> the new maximum size. Bring them closer to the star, orient them vertically
> and have them equally spaced, with a number of stellar collectors range
> between 1-12 at random."*

Precisely:

| Field | Now | Becomes |
|---|---|---|
| `element` | `capsule` | a new cylinder-with-a-cone primitive |
| `size` | `[0.150, 0.280]` | `[0.135, 0.150]` — the old *minimum* is the new *maximum*, and the new minimum is 10% under it |
| `depth` | `[1.30, 1.50]` | closer to the star |
| `spacing` | `"random"` + `minGap: 16` | `"even"` |
| count | `density {3,10}` × `spread` | **1–12, rolled at random** |
| orientation | — | vertical (pointing at the star) |

The cone end points **at the star**. Note `capsule`'s existing `upright` flag
means "along the local vertical"; the cone gives the shape a direction the
capsule never had, so this needs its own primitive.

#### Resolve the tier question as a DECISION: `tiers: 1`, not a tier spread

The draft asked whether this wants `tiers: 1` plus `named: true`. **It does.**
The user asked for a size band **10% wide** — deliberate uniformity — and tiers
exist to manufacture spread. Running `tierSplit` over a band authored for
uniformity fights itself, and the surviving-tier factor (D122, 0.52×) would
silently move a band the user calibrated by hand.

**Two things to check while authoring it:**

- **Confirm `named: true` does not cap instances at one.** It exists for the
  case where a trait IS one object; this trait is 1–12 of them. Look before
  authoring the numbers.
- **With `tiers: 1` the authored size is the drawn size**, so the figures in the
  table above are taken literally rather than divided by 0.52. That is the whole
  reason to choose it — but it means the band must be re-measured in pixels
  once, not assumed.

#### The count floor is worth reconsidering

`spacing: "even"` with a **random** 1–12 means a body rolling 1 or 2 collectors
shows one lonely object on an otherwise empty orbit, which reads as a bug rather
than as a design. Either raise the floor (**2–12** is the cheap fix) or accept it
deliberately and say so — but do not leave it unexamined.

**And D127**: the orbital band around a star is bounded on BOTH sides — too far
out and elements leave the frame (this exact trait diffed at **0 px on a young
star**), too far in and they are inside the corona with nothing to silhouette
against. "Closer to the star" must not put them back inside the glow, which
Doc 1 has just made larger.

### 2. Rings and debris belts — remove them from stars

The user's question, and it was the right one:

> *"Ring and debris fields somehow feel wrong to have here… isn't the star going
> to vaporize them that they wouldn't have a chance to even form?"*

**Confirmed and agreed.** A debris belt at 1.28–1.95 body radii on a star whose
photosphere is at 1.0 sits well inside where rock sublimates. Real debris around
stars lives at hundreds of stellar radii — off the canvas by two orders of
magnitude. Drawing it at ring distance states something false.

They are only offered because `js/data/traits/orbital.js` declares
`requires: []` — *"anything beyond the body is available to every body."* That
was correct when every body was a planet or a giant. It is now an unexamined
default rather than a rule.

**The fix:** gate the orbital traits behind a tag the stars do not carry.
Do NOT add an `excludes` or a role-name check — eligibility is by tag and
nothing may name an archetype (`js/data/traits/registry.js`).

**The replacement, which does make sense:** an **accretion disc** for
`young-star`. Same `ring-band` primitive, same radii, and physically right — a
young star genuinely is surrounded by the material it is still forming planets
from. `stars.md` already lists `accretion-disc` / `protoplanetary-disc` in the
young star's pool, and the archetype already carries a `young` tag to gate it.

`old-giant-star` keeps `shed-shells`, which is its own trait and already
correct.

### 3. Prominences — more and wilder (the cut-off moved to Doc 1)

Three distinct complaints:

> *"Prominences look nice at a distance, but feel kinda lightweight and sparse…
> At close up zoomed in, prominences look particularly tame and lame."*

> *"Prominences that are particularly high seem to cut off abruptly if they
> exceed the height of the corona layer."*

**The cut-off has MOVED TO DOC 1.** It was diagnosed in the brainstorm pass and
reassigned, because Doc 1's plume field is a spanning element too and would be
chopped by the identical clip — building plumes against a clip known to be wrong
and re-judging them afterwards is wasted work. Doc 1 §3 carries the fix: widen
the spanning clip to `extent` rather than to the corona's outer edge.

**So verify it before starting here, do not re-fix it.** Render a tall
prominence and confirm it ends by fading. If Doc 1 did not land it, do it first
under Doc 1's reasoning — the clip must be widened to the frame, not to the
corona, or the same bug fires again on the next feature that reaches further.

**Lightweight and sparse** is a count-and-density question, but note Doc 1 has
just added a plume field to the corona — so re-judge sparseness against the NEW
limb before raising numbers. The prominences may read very differently once
they are among plumes rather than alone.

**Tame up close** is a quality-of-mark question and the harder one. The
primitive draws a tapered ribbon with a bright core and footpoint anchors; up
close it may want internal structure — strands, turbulence, a brighter leading
edge. `draw/primitives/orbital.js` `storm` carries a hard-won note about
fBm turbulence sampled in **body space** (so texture stays welded to the body
under pan and zoom, the rule `draw/grain.js` follows) — that is the technique
to reach for, and the note explains what failed before it.

### 4. Flare storms — currently unfindable

> *"Flare storms… I don't think they appear — I can't either see them or I don't
> know what to look out for."*

They *do* draw — pixdiff reports 1,100–3,700 px depending on archetype. So this
is **D126**: present, changing pixels, and not legible. Almost certainly they
are `vein` strokes lost among the corona's own streamer field, which is the
exact failure D76 records (a mark that is a louder example of what its layer
already draws).

A flare needs to be **a different KIND of mark** from a coronal streamer. It is
an *ejection* — open, fast, not coming back — where a prominence is a closed
loop and a streamer is a static structure. Consider giving it its own primitive
rather than tuning the vein further; two rounds of tuning a mark that is the
wrong vocabulary is the most reliably wasted work on this project.

Note also its `driver` is `at0: 0` — **a quiet star has none at all**, by
design. Check at high `starActivity` when judging.

### 5. Starspots — much wider ranges

> *"Starspots are pretty neat, I like the premise but I think there's potential
> for a much crazier range both in terms of amount min-max and size min-max, for
> a much larger range of variety."*

The most straightforward item here. Widen both `density` and `size` bands on
`starspot-clusters` and `heavy-spotting`, so one star has three enormous spots
and another has forty small ones.

Two constraints: keep them **legible at preview size** (D82 — a symbol is not a
scale model), and remember the tier factor (D122). The `spread` field
(D85) is the right lever for per-body variation on top of the slider.

### 6. Coronal holes — rethink the format entirely

> *"Coronal holes right now looks quite ugly; a big wedge that is drawn over the
> corona layer with a flat color and no fade. I looked online what coronal holes
> look like, and it seemed like they're basically large starspots so I'm kinda
> wondering if the very nature/format of the coronal holes implementation should
> be rethought into something else."*

**The user is right about the reference and the implementation is wrong.**
A `wedge` with `tone: "darker"` and no fade is a pie slice laid over the halo.

#### Build it as an ABSENCE in the plume field. This is the instruction, not an option.

The original draft weighed three options and gently preferred this one. The
brainstorm pass promoted it to the decision, because **the other two are likely
to fail outright** for a reason worth stating up front:

**The corona is drawn with a `screen` blend** (`ATMOSPHERE_BLEND` in
`draw/scene.js`). Under `screen`, dark paint is very nearly a **no-op** — it can
only ever add light. That is almost certainly why the current implementation had
to be a flat, hard-edged, unfaded `tone: "darker"` wedge in the first place: a
soft dark region on a screen-blended layer is *invisible*, which is exactly
D121's `dust-formation` failure (maxdelta **19**) waiting to happen a second
time.

So "a large soft dark region" and "reuse `starspot` at large scale on the
corona" are not merely less elegant than the third option — they are fighting
the blend mode, and both would burn a pass rediscovering that.

**A coronal hole is where the field is open and the wind escapes freely, so
there are simply FEWER PLUMES THERE.** That is what the feature physically is,
it needs no dark paint at all, and it works with the blend mode instead of
against it.

**This makes §6 hard-blocked on Doc 1's plume field** — more so than any other
item in this doc. If Doc 1 descoped the plumes, §6 has no mechanism and should
be deferred rather than reimplemented as paint.

Note the trait is gated `requires: ["stellar", "has-corona"]`, so an old giant
correctly never sees it.

### 7. The spicule diagnosis (deferred here from Doc 1)

> *"I zoomed and I didn't see anything like that on the surface of the star."*

The chromosphere declares a spicule fringe — `vein`, count 220–780 — and the
user cannot see it. **Diagnose before tuning.** The chromosphere is a hairline
capped at `maxThickness: 0.055`, and the spicules are `sizeRel` against it, so
they may be drawing at sub-pixel: the Dyson-swarm failure exactly (D126 — high
maxdelta, no area).

**Measure their drawn size in PIXELS** at a realistic render width before
changing any number, or the fix will raise a value that was never the problem.

---

## ARCHITECTURE RULES FOR THIS PHASE

- **Nothing in `js/draw/` may name a stellar role or archetype.** New
  primitives register by `kind`.
- **Eligibility is by TAG, never by archetype id.** The orbital-trait gating in
  item 2 must respect this.
- **Star activity stays ONE axis (D27).** Traits scale off it via `driver`.
- **A trait must be a different KIND of mark (D76/D80).** Applies directly to
  flare storms, the mirrors and the collectors.
- **`anchor` may be a list (D77)** — a dwarf's corona is optional and an old
  giant has none, so a trait naming one role silently places nothing on bodies
  missing it.
- **Presets must not force ineligible traits.** `test/_tmp/starboot.mjs` checks
  this; several stellar presets name the traits being reworked here, so update
  them and re-run it. `Harvested Star` in particular is built around the Dyson
  structure being renamed in item 1b.

---

## TESTING STANCE

**Do not add tests unless asked.** `npm test` must still pass. Re-run the
Session M probes — especially `pixdiff.mjs` **per archetype**, which is what
caught three of the four invisible traits.

---

## DONE WHEN

- Both megastructures can coexist, and each reads as the object it now is —
  a mirror ring with glowing glass, and a ring of evenly-spaced coned cylinders.
  Collectors are uniform in size (`tiers: 1`) rather than tier-spread.
- No star offers rings or debris belts; a young star offers an accretion disc.
- Prominences read as furious at whole-body scale **and** close up. (The tall-
  prominence chop is **Doc 1's** fix — verify it landed, do not re-fix it.)
- Flare storms are findable without being told what to look for.
- Starspots span from a few enormous to many small across different bodies.
- Coronal holes read as a feature rather than as a pie slice — built as an
  absence in the plume field, with no dark paint on a screen-blended layer.
- Spicules are visible, and the reason they were not is recorded.

**Show renders as you go rather than reporting that it looks good.** Close-up
limb crops are the view that matters for most of this.
