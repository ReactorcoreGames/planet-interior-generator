# Session F, Pass 3 — preparing docs and stats for Phases 5-9

*Moved out of PROGRESS.md to keep that file small. Docs reconciliation,
the stats system, the info card, export, and the mantle/trait colour
fixes (D50–D61).*

---

*At the user's request, before opening a new family. The climate and star
controls are UNIVERSAL, so every remaining archetype inherits them whether or
not its author thinks about them — and an inherited control nobody decided
about is the quietest kind of wrong.*

### D50 · `starlit: false` — an archetype may decline the star

**Decided:** Session F. **Where:** `js/gen/climate.js` (`baseline`),
`js/gen/palette.js`, asserted in `test/climate.mjs`.

Found while auditing the docs rather than by a failure: **there was no way for
an archetype to decline the incident-starlight term.** `baseline` read
`starlight` unconditionally, which is right for every solid and gaseous body
and wrong for a star, a neutron star and a black hole — none of which are warmed
by some *other* star. For a star the term is not merely small, it is the wrong
idea entirely.

It had not mattered because the planet is the only archetype, and it would have
started mattering in Phase 6 as a subtly wrong number in a stat template rather
than as anything visible. **Closed now rather than left as a documented gap**,
because an escape hatch discovered mid-phase gets built in a hurry.

`climate: { starlit: false }` removes the term from the baseline **and** the
star's tint from the palette — both, because a body that is temperature-
independent of the Star colour dropdown while still being *coloured* by it is a
contradiction the eye would catch before any test did. The body still responds
fully to its own Interior heat, which is what a star's temperature is made of.

Measured: at Starlight 100% an ordinary archetype baselines at 0.77 and one with
`starlit: false` at 0.11, and Starlight then has literally no effect on it.

**DECLARED, NEVER DETECTED.** There is no role-name check in `gen/climate.js`
and there must never be one. A growing list of "if this is a star" branches is
exactly the failure D27 records, and this is the seam where it would start.

> **An untested escape hatch is worse than a documented gap.** It is asserted on
> a SYNTHETIC archetype in `npm run climate` (**ARCHETYPE ESCAPE HATCHES**), so
> the mechanism is proven before a real family depends on it — including that
> an unlit body still tracks its own heat, which is the half that would have
> been easy to get wrong and would have made every star cold.

### `Stellar activity` was superseded before it was ever built

`PARAMETERS.md` listed a per-star **Stellar activity** control. The universal
**Star activity** axis shipped in this session is the same quantity: on a planet
it scours cover and drives the radiation hazard, and on a star it should drive
starspots, prominences and flare storms. **One control, two consumers.**

The row is struck through rather than deleted, with a note, because "why is
there no stellar activity control" is a question Phase 6 would otherwise ask
and answer by building a duplicate. A star body and the star a planet orbits
are the same physical object seen from two sides; if they disagree the tool
contradicts itself.

### Three doc gaps closed

All three were things a Phase 5–9 author would hit and find no answer to:

| Gap | Closed by |
|---|---|
| Which universal controls apply to which family, and how to decline one | a per-family table in `PARAMETERS.md`, plus the declaration table beside it |
| `ARCHETYPE-TEMPLATE.md` — the doc an author actually works from — said nothing about climate at all | a required **Climate and the star** section before the trait list, and three checklist entries |
| Nothing warned against duplicating a universal axis | the `Stellar activity` note, and a checklist entry |

> **The failure mode these guard against is silence.** A control that should do
> nothing and quietly does something is far harder to notice than one that
> visibly breaks. A star inheriting a polar cap, or a black hole whose
> temperature answers to a Starlight slider, produces a subtly wrong number
> nobody thinks to check — which is why the climate spec is now a REQUIRED
> field in the template rather than an optional one.

### D51 · A stat is a measurement of the drawing, and the obvious measures are wrong

**Decided:** Session G. **Where:** `js/gen/stats.js`; asserted in
`test/stats.mjs`.

HAZARDS.md's standing rule — the card and the picture read one source — is easy
to agree with and surprisingly hard to implement, because **the obvious way to
ask a question about the render is usually a proxy for it rather than the
question itself.** Three of the four defects the probe caught were of that
shape, and none was visible from reading the code.

**"Is there a sea?" was got wrong three times.**

| Attempt | Reads | Fails on |
|---|---|---|
| `ocean` layer present | presence | a rogue world at Ocean depth 12%, whose sea is 0.003 thick against relief of 0.19 — puddles, described as "a shallow sea" |
| sea thickness ÷ terrain relief | the right two quantities | reports 0.55 at Ocean depth 100%, on a world with literally no land left. Sea *level* and band *thickness* are different statements |
| **land fraction** | the coastline itself | — |

The third is right because it is not a proxy at all: it walks the
circumference and counts where the drawn crust top (`layer.outer +
terrain.at(angle)`, exactly as `draw/layers.js` composes it) crosses the drawn
sea top (carrying its angular offset, exactly as `draw/scene.js` reads it).
**The coastline is a crossing (D15), so the honest measure is to find the
crossings.** It runs 100% land at Ocean depth 0, through ~35% at Earth-like
settings, to 0% at the top — which is the range D15 claimed and the first two
measures could not see.

**And then a sub-pixel sea had to be excluded, because the renderer already
excludes it.** D21 fades the ocean out over the first ~1.5px of *rendered*
thickness, so there is a real band of settings where the layer exists, the
geometry crosses the terrain over most of the circumference, and **nothing is
drawn.** Counting those crossings put "Sea where it survives" on a Volcanic
World whose water was 0.0009 of the radius. The card now applies the same test
the renderer does, in body space rather than pixels so it stays
resolution-independent.

> **The lesson:** when a stat is supposed to describe the render, ask the
> renderer's own question. Every wrong answer here came from a quantity that
> *correlated* with what was drawn instead of being what was drawn.

**The fourth defect was the same idea in a different register: the atmosphere's
thickness was measured against radius 1.0**, which is a terrain PEAK whenever
relief rises through the layer above (D15 addendum 3). An ordinary atmosphere
can sit below that peak, giving a negative thickness — and a fractional power
of a negative number is NaN, so the card read "Crushing - NaN bar" over a world
with a thin sky. Measured against the layer beneath it, which is the band the
picture actually shows, it is positive by construction.

### D52 · A derived rating still has to be calibrated, and a sum can be outvoted

**Decided:** Session G, from the hazard distribution. **Where:**
`js/gen/stats.js` → `hazardOf`; asserted in `test/stats.mjs`.

Deriving a rating from the facts rather than rolling it is necessary and not
sufficient. HAZARDS.md gives a **frequency table** as well as a ladder — Mild
and Hazardous *common*, Severe and Lethal *uncommon*, Absolute *rare, compact
objects mostly* — and the first correctly-derived version ran **44% Lethal and
8% Absolute.** When almost everything is lethal the rating carries no
information, which is a different failure from being wrong.

Four things, all worth keeping:

1. **`round(score * 0.72)` is not a scale.** It compressed the bottom (scores 0
   and 1 both landed on Benign) and stretched the top, so three of five hazards
   reached Lethal. Named cut points instead.
2. **Absolute is unreachable for a solid body.** "Nothing survives approach"
   describes a black hole. A rating a planet can reach means something
   different on the card it appears on. The compact template raises its own
   ceiling when Phase 8 lands.
3. **Adding a rung de-calibrates every cut point.** Giving the cold end its own
   rungs — deep cold is a different problem from merely cold — shifted every
   body up the ladder without changing a single cut. **This is D45 again:** when
   a formula's input changes range, its weights stop being calibrated even
   though nothing about them changed.
4. **A sum lets one overwhelming fact be averaged into the middle.** A world at
   −199 °C came out *Hazardous*, i.e. "manageable with equipment", because deep
   cold was its only hazard and one term cannot outvote the absence of four
   others. Raising the cold rungs would have dragged every merely cold world up
   with it; a **floor** says the true thing instead — below the freezing point
   of nitrogen, nothing else on the card can make the place safer.

The frequency table is now asserted directly, because it is a number.

**A related self-consistency bug, and the reason it is filed here:**
breathability checked `states.temperate > 0.25`, so a world scorched at the
equator and temperate at the poles cleared it — the card read "Breathable,
which is close to a miracle" two rows under "12 C to 235 C". **The check was in
normalized units and the card is read in degrees.** A card that contradicts
*itself* is as bad as one that contradicts the render, and when the two have to
agree, the check belongs in the units the card is written in.

### D53 · The card is DOM; the panel decides nothing

**Decided:** Session G. **Where:** `js/ui/infopanel.js`, `js/gen/stats.js`.

On screen the card is text a user selects and copies, so it is real text rather
than an image of words. Composing it *into* an exported PNG is a separate
feature (PARAMETERS.md's Composition dropdown, Phase 8) and would draw the same
`stats.lines` through the canvas.

**The panel renders what `CC.Stats` hands it and makes no judgement.** No
thresholds, no comparisons, no phrasing — the only decision it makes is which
CSS class a hazard rating gets, and that is a lookup keyed by the rating the
generator already computed. If the panel ever grows a number, the card and the
picture have gained a second source they can disagree from, which is the one
failure mode this phase could introduce. The domtest asserts every row's text
is byte-identical to the generator's own string.

**The detail levels run from fact to inference to flavour** — Compact is the
measured lines, Standard adds the sentences derived from them, Full adds the
filtered flavour. Turning the level down therefore never removes a fact and
leaves an inference standing on it.

### D54 · Export re-renders; it never scales the preview

**Decided:** Session G. **Where:** `js/ui/export.js`.

The preview canvas is sized to its CSS box at the device pixel ratio, so
reading it back would make the exported size depend on the user's monitor.
Export instead builds a fresh offscreen canvas at the chosen resolution and
runs the same `CC.Scene.render` over the **same cached body and details** — so
an export is the same world at a different number of pixels, not a fresh roll
that happens to share a seed.

**This is the feature resolution independence was for.** Nothing in the
generator consults `view.R`, so a 2160px export has exactly the elements the
720px preview had, in the same places. The domtest's op-count assertion at 360p
against 2160p is what protects it.

**Vertical resolution is the control and the width follows from the aspect**,
because "1080p" is a statement about height — and because it stops a 1:1 export
being four times the pixels of a 16:9 one at the same nominal setting.

**The settings string is a DIFF against the shipped defaults**, and the
defaults are read from the DOM's own `defaultValue` / `defaultChecked` rather
than from a second table — so the string cannot drift from what the page ships
with, the same reason `doccheck` reads `index.html` rather than a manifest.
Traits get their own line, since they are part of the body and not a control
value.

**Export needed a visible confirmation.** A file landing in the downloads
folder and a clipboard changing are both invisible from inside the page, so
without the button flash the menu reads as broken — which is the same
silently-inert control the domtest exists to catch. The menu had in fact been
inert for four phases; each item is now clicked in the domtest and required to
report.

### D55 · The composed export — what v2 got right, and the one thing it got wrong

**Decided:** Session G pass 2, at the user's request. **Where:**
`js/draw/card.js` (new), `js/ui/export.js`, `js/main.js` (`renderTo` regions);
asserted in `test/composed.mjs` (new).

A PNG carrying the body *and* its card is the thing somebody hands round a
table, and v2 already had it (`render/scene.js` → `render169`). Three things
from that code were worth taking and one was worth refusing.

**Taken — the layout relationship, which is one line:**

```
bodyAreaW = w - panelW - margin * 2
```

The body centres in **what is left**, not in the whole frame. That single
expression is the difference between a composed image and a card sitting on top
of a picture, and **the same relationship fixes the on-screen layout** — the
live card floats over the preview, so `#preview.info-open` pads the preview by
the card's width and the canvas re-centres in its own (now smaller) box. One
idea, two consumers.

**Taken — every dimension as a fraction of the panel**, never a pixel constant,
so the card is the same picture at 720px and 4320px. The same rule
`draw/canvas.js` already enforces for the body.

**Taken — the layer-colour dots along the bottom.** v2 had them; they became
this project's **fingerprint strip** (palette swatches plus the seed). It
asserts nothing, which is why it is allowed to be decoration: what it does is
make two otherwise-identical cards tell themselves apart, since the same preset
on a different seed produces a visibly different row.

> The swatches are read from `colorProfile.order`, **not** from the built layer
> list — `order` encodes depth, so the row always runs surface-to-centre in a
> stable sequence. Walking `body.layers` would reshuffle it whenever a layer
> appeared or vanished, and a fingerprint that changes shape when you drag
> Ocean depth is not a fingerprint. Same reasoning as D12.

**REFUSED — v2 dropped content when the card ran long:**

```js
if (vy > cy + h * 0.01) { ...draw the verdict... }   // else it silently vanishes
```

Content disappearing with no indication is the worst available answer, so the
replacement **measures first and then fits**, escalating only as far as it has
to. The ladder is ordered by what each step costs the reader:

| Step | Cost | Used by |
|---|---|---|
| nothing | — | Compact (6 lines) |
| 8% text shrink | barely visible | Standard (8 lines) |
| two columns + wider panel | changes the card's shape | Full (11 lines) |
| grow the canvas | breaks the nominal aspect | only if all else fails |

Measured: Compact renders untouched at one column and 100% text; Full goes to
two columns at 76% in an 806px panel, and the canvas grew in 3 of 27
level × resolution × aspect combinations. **Nothing clipped in any of the 27.**

**The column split is CHOSEN, not stumbled into.** Breaking as soon as the
running total crosses half the height overshoots whenever the crossing block is
a tall one — that whole block lands in the first column. On a Full card it left
the right column ~15% short, which reads as a bug rather than as two columns.
Every break point is now tried and the one minimising `max(hA,hB) +
|hA−hB|·0.5` wins: ten candidates, no measurable cost, and the columns end 3%
apart instead of 15%.

**`draw/card.js` owns the detail-level table, and `ui/infopanel.js` imports it
from there** — the dependency runs that way because `draw/` may not depend on
`ui/`: the card must be drawable with no interface present, which is exactly
what `test/composed.mjs` does. Both renderers therefore show the same lines by
construction rather than by two copies agreeing (D53 extended).

### D56 · `transparent` and "leave it alone" are different states

**Decided:** Session G pass 2, from a render. **Where:** `js/draw/scene.js`
(`skipBackground`); asserted in `test/composed.mjs`.

The composed export paints one starfield across the whole canvas and then
renders the body into a sub-region. The first version passed
`background: "transparent"` for that sub-render, reasoning that the background
was already painted — but **transparent mode calls `clearRect`**, so the body's
own render *erased the stars it had been drawn over*. They survived only in the
strip the body never touched, which read as a starfield that had mostly failed
to draw.

A caller compositing onto an existing scene wants **neither a new background
nor a hole punched in the old one**. That is a third state, and it needed its
own flag rather than a third background *mode*: the modes are a user-facing
control, and this is not a choice a user makes.

> **Every structural assertion passed while the sky was being wiped.** The
> layout was right, the card was right, nothing overlapped, nothing clipped —
> and the picture was wrong. Found by looking, then pinned down with a pixel
> probe counting lit samples in the far-left column. This is D18's rule again,
> a fifth time: **reach for a pixel probe before theorising, and never let a
> structural test stand in for looking at the render.**

The assertion checks both directions — that the sky survives a composited body
render, *and* that a genuinely transparent background still clears — so the two
states cannot be collapsed back into one.

### D57 · The settings string needed its other half

**Decided:** Session G pass 2, with the user. **Where:** `js/ui/export.js`
(`applySettingsText`), `js/main.js` (`setupSettingsPaste`).

"Copy seed + settings" shipped as a one-way street: a string you could produce
and not consume. With forty controls, re-entering one by hand is not something
anyone does, so the export was a souvenir rather than a share — which is what
made the user ask whether it should be replaced by the markdown factsheet.

**It did not need replacing; it needed the import.** PARAMETERS.md had
specified it all along — *"pasting it into the seed field restores that exact
body"* — and only the copy direction had been built. Reading the spec settled a
design question that was about to be resolved by deleting the feature.

**No new control.** A settings block *begins with a seed*, so pasting the whole
thing where a seed goes is the obvious gesture, and detecting it costs one test:
a newline plus a `key: value` line. A plain seed has neither.

Three rules, each of which was a real decision:

1. **A control the string omits is RESET to its default**, because the string is
   a diff against the shipped defaults. Merging it into whatever was in the
   panel gives the paste *plus the leftovers*, which is not the world the string
   describes — and would make the same string restore different bodies
   depending on what came before.
2. **An unknown key is skipped, not fatal.** A string from a future version
   naming a control this build lacks should still restore everything it can. A
   body that is mostly right beats an error message.
3. **Locks are not consulted.** A lock means "Randomize must not touch this"; an
   explicit paste is the user asking for exactly this body, and silently
   dropping half of it because something was locked would be the surprise.

The round-trip is asserted end to end: build a distinctive body, copy its
string, **wreck the panel** (and check the wrecking actually changed the body,
so the test cannot pass vacuously), paste the string back, and require the layer
radii to match byte for byte.

### D58 · The lock belongs on the value that rolls

**Decided:** Session G pass 2, at the user's observation. **Where:**
`index.html`, `js/ui/randomize.js`.

Background *type* carried a randomize lock and was never rolled; background
*colour* was never rolled and carried no lock. Both were backwards, and the fix
is not symmetric — it goes in opposite directions for the two controls:

- **The type keeps not rolling, and loses its lock.** It is a framing choice
  rather than a property of the body: rolling it would flip a deliberate
  transparent export back to a starfield. A lock guarding nothing is noise, the
  same reasoning `Keep upright` already followed.
- **The colour starts rolling, and gains a lock.** It is the space the world
  sits in, and varying it is free variety.

**Rolled in a narrow dark band, not across the wheel** — hue free, value pinned
under 0.10. Same reasoning as Saturation's narrow band (D14's defaults table):
the body is the subject, and a bright background turns the picture into a colour
clash rather than a different world. Asserted directly: twelve rolls must
produce at least five distinct colours, every one under 0.20 luminance, and the
type must never change.

> **The general rule worth keeping:** a lock and a roll are two halves of one
> feature. A control with a lock but no roll, or a roll but no lock, is always a
> mistake in one direction or the other — and it is invisible from reading
> either file alone, because each looks complete on its own.

---

### D59 · The mantle has to look hot — three things were stopping it

**Reported from looking at output:** the mantle used colours that were "fairly
not hot, even on planets that have high interior heat", where astronomy-book
cutaways show it as hot and near-molten. Correct, and there were three separate
causes stacked on top of one another. Any one of them alone would have been
enough to flatten the effect, which is why the dial appeared to do so little.

**1. The mantle was authored as cold rock.** It was the only interior layer with
no hue anchor and no `incandescent` flag, and its value range (`0.24–0.46`)
topped out *darker than the crust above it* (`0.28–0.62`) — upside down for a
layer meant to be hotter, and leaving the heat push no headroom to push into.

**2. The hue journey never reached it.** Layer hue travels from the primary
(surface) anchor to the secondary (core) one by declared depth, on a curve
deliberately back-loaded — `t = ((depth − 0.35)/0.65)^1.4` — so that the outer
layers stay near the surface hue. At the mantle's depth that lands around
`t ≈ 0.24`: still ~76% the *surface* hue. On a blue-grey world the mantle was a
blue-grey mantle at any temperature.

> That back-loading is **not** wrong and was not undone. It exists to stop the
> "pastel bullseye" — the earlier `depth²` easing dragged crust and mantle
> toward the core's hue and every world came out as concentric pastel rings
> rather than rock over metal. The fix had to *add* a heat-driven path without
> touching the harmony rule, which is what `heatLean` does.

**3. Heat could dim a mantle but never brighten one.** The value push for hot
worlds sat inside `if (emissiveSpec(spec))`, so a non-emissive layer got
*saturation* from heat and nothing else — while the cold branch drops value on
every layer regardless. The control was asymmetric in the one way that mattered:
pushing Interior heat to maximum made the band slightly more colourful and not
one shade lighter.

#### The fix, in three parts

**`heatLean: { hue, amount }`** — an absolute hot-side hue the layer travels
*toward*, scaled by the Interior heat dial and weighted by depth. Unlike the
core's `hue` it does not pin: at heat 0 the layer keeps exactly the
anchor-derived colour it always had, at heat 1 it has travelled `amount` of the
way. **Perturb, not replace** (zones.js rule 1), applied to temperature — the
same seed at three heat settings gives three visibly different worlds that are
still recognisably the same world. Pinning the hue outright was the obvious fix
and is wrong: it would make every hot planet's mantle the identical orange and
discard the body's own colour scheme.

**A value push for non-emissive layers**, at a smaller coefficient than the
emissive one and riding depth, so the crust barely moves and the mantle
genuinely lightens as it heats.

**`heatGradient`** — the piece that does most of the work. The band publishes a
second colour, `hotEdge`, for its inner edge; `bandFill` ramps between them
across the band and cools slightly *below* the base colour at the outer rim, so
the base sits in the middle of the ramp rather than at its end. A mantle is a
transition from cooler rock to near-melt, and drawing that transition is what
reads as heat — a uniformly hot band just reads as an orange stripe, and would
also flatten the crust/mantle separation the adjacency pass works to protect.

> **The gradient eases in and then holds; it is not proportional to heat.** A
> mantle grades at every temperature a mantle can have — what heat changes is
> how hot the hot end is, not whether there is one. Scaling it linearly by the
> dial was measured to give an Earth-like world at 0.5 a band that was almost
> perfectly flat (8 points of red across its whole width), which is the uniform
> slab this work exists to remove. `sqrt(heat) · (0.55 + 0.45·heat)` instead.

**Detail elements ride the same gradient** (`DrawDetails.heatShift`), and that
is the reason to put the gradient on the band rather than hand-colouring the
mantle: cells, arrows and flow lines all derive from the band colour, so once
the band varies with depth the circulation gains contrast exactly where the
mantle is most violent. Speckle batches split by depth bucket to keep it — the
**third** time that batching problem has appeared, after the fade bands and the
zone shift, and it was solved the same way both previous times.

**`hotEdge` is rebuilt by the adjacency pass**, like `lighter`/`darker`/`rgba`
before it. Anything derived from a layer's value has to move when that value
moves, or the two ends of the gradient end up built from different colours.
This is why it is a named factory rather than an inline closure — the same
reasoning that shape already encoded.

**Measured** across the heat sweep, mean mantle RGB from outer edge to core
boundary:

| Heat | Outer | Inner |
|---|---|---|
| 0.0 | `95,81,92` | `66,55,64` (cold, and correctly *darkening* inward) |
| 0.5 | `100,70,94` | `124,81,102` |
| 1.0 | `162,59,98` | `195,38,46` |

7,938 bodies swept: zero fluorescent layers, zero indistinguishable adjacent
pairs. The hot colours stay in gamut and the mantle still separates from the
crust.

> **The general rule:** a control that drives a *material property* must be able
> to move colour in **both** directions. Heat that can only drain toward grey is
> a "deadness" dial with a misleading label — and the asymmetry is invisible
> from reading either branch alone, because each looks complete on its own.

---

### D60 · A trait must be a different KIND of mark, not a louder one

**Reported alongside D59:** Mineral Veins "gets easily lost in the mantle's
various flow indicators since they're drawn as thin lines" — the veins should be
"fat and juicy".

The diagnosis is the important part. The mantle carries up to ~600 elements of
its own — convection cells (80–210), flow arrows (58–150), flow lines (78–235) —
**all `tone: "lighter"`, all thin strokes, all oriented roughly radially.** The
veins were also `tone: "lighter"`, also thin strokes, also roughly radial. They
were not competing badly; they were drawn in the same visual vocabulary as the
noise, so they were *part* of it.

**That means contrast could not have fixed it.** Brightening the veins, or
generating more of them, would have produced more of the same texture. The
change had to be categorical:

| Was | Is |
|---|---|
| stroked line | **filled** tapering ribbon |
| constant `lineWidth` | genuine taper — the old code never tapered despite the comment saying so |
| single tone | **two-tone**: saturated dark body inside a darker contour |
| `tone: "lighter"` | `tone: "darker"` — every flow indicator is lighter, so going the other way is a second axis of separation |
| up to 96 instances | up to 44 |

Nodules along the trunk — two out-of-phase sine swells — are what sell "juicy"
over "a smooth spike"; real ore bodies pinch and swell rather than tapering
evenly. And the taper **stops at ~28% width rather than reaching a point**: a
shape that comes to a true point reads as a *crack*, because the eye takes the
sharp end as a fracture tip, which is precisely what a lode must not look like.

**Fewer, bigger — the one place the density thesis inverts.** Density is the
right answer for the *background material* a layer is made of. A trait's whole
job is to be legible at a glance, and 96 fat lodes would be soup. Halved.

> **Superseded by D61: this was half-right.** Halving alongside the width
> increase went too far — at 7–44 the veins read as isolated *objects* rather
> than as a network, which is what invited them being read as bottles and fish
> in the first place. Raised to 11–77 (80% of the original). The trait still
> sits below the original count because each instance carries several times the
> visual weight, but nothing like half.

**The fill is a metal, not a silhouette.** Run through the ordinary `darker`
tone the veins crushed toward black on an already-dark mantle, and a black shape
reads as a *hole* in the layer rather than something embedded in it — losing the
material relationship that keeps a dense body from looking like confetti. Bulk
veins derive their own fill: most of the saturation kept, value floored well
clear of black.

**A flag on the primitive, not a second primitive.** `vein` is shared with crust
fractures and rifts, which must stay hairlines — a fat filled crack is wrong.
The alternative, a separate `lode` kind, would have duplicated the branch
structure and the wander function and then drifted from them. `bulk` rides on
the **recipe**, because whether a vein is a hairline fracture or a fat ore seam
is a fact about the element, not about which layer it landed in.

> **The general rule, and it applies to every trait still unbuilt:** before
> authoring a trait, look at what vocabulary its anchor layer already uses —
> stroke or fill, light or dark, one tone or two — and pick a different one. A
> trait that shares its layer's drawing vocabulary will be read as texture no
> matter how loud it is. This is the *visual* counterpart of the rule that a
> trait must be visible at a glance to be a trait at all.

---

### D61 · Gradients everywhere, and the three ways a hue lean can still land cold

Follow-up to D59/D60, all three items reported from looking at output.

#### The veins were bottles, and the cause was frequency, not amplitude

Reported as looking like "bottles / fishes / stick-grenades". Exactly right, and
the reason is arithmetic: `t` runs 0..1 along a vein *whatever its length*, so a
FIXED ripple frequency gives every vein the same number of swells. At the
authored 7.3 that was about one and a fifth cycles — one belly, one neck, one
blunt end. That is a bottle. Amplitude was never the problem; **the count of
swells was.**

The frequency now comes from the vein's **aspect ratio** — its drawn length over
its own width — so a long seam ripples many times and a short one twice, and the
two read as the same material at two sizes rather than as two objects. With the
frequency right, the amplitude could then be *raised* (0.20 → 0.30) instead of
lowered, which is the opposite of the instinctive fix.

Two supporting changes: the floor is 2.5 cycles, because below about two a shape
has one belly and one neck however short it is; and the bulk path gets 3× the
centreline samples, because a filled ribbon carries its profile in its OUTLINE
and at 6 segments the ripples fall between the samples.

**Count raised to 11–77** (80% of the original, from the halved 7–44). Halving
alongside the width increase was too cautious: at that count the veins read as
isolated objects rather than as a network, and isolated objects are precisely
what invites reading them as bottles. Several overlapping seams read as a vein
system where three do not — so the density thesis mostly holds here after all,
and D60's "fewer, bigger" was half-right rather than right.

#### A hue lean can land in the wrong place three separate ways

The mantle was still coming out "just a rock layer" on many rolls at FULL heat.
Three distinct causes, and each needed its own fix — this is the part worth
remembering, because a hue check said the first fix had worked.

**1. A fixed fraction of the journey is not enough for the far hues.** Measured
over 400 bodies at full heat: 38% of mantles landed outside the hot hues, worst
among the greens (h=133 moved only to h=77). The reach now scales with how far
there is to travel. That took it to 0/400 — and the picture was still wrong.

**2. Leaning is a journey, so it stops wherever it got to.** The hue test passed
while 40% of mantles sat at hue 52+ — yellow-olive, which is sulphur and khaki,
not lava. **The measurement was asking a weaker question than the picture does.**
Fixed with a ceiling on the DESTINATION (anything left above the target range is
carried down to it) and by narrowing the target from `[8, 42]` to `[2, 26]` —
the top half of the old range *was* amber, so hues approaching from the green
side stalled in it. Narrowing means even a partial journey lands somewhere hot.

**3. Hue is not colour.** A mantle can roll the bottom of its own ranges, and a
dark desaturated red (s≈0.43, v≈0.31) is maroon — cold rock with a correct hue.
A floor under saturation and value, rising with the lean, fixes the residue.

> **The general rule:** when a visual property has several contributing
> dimensions, a metric on ONE of them will report success while the picture is
> still wrong. The hue probe read 0/400 at the same moment four of six renders
> were visibly olive. Look at the output; use the metric to find the cases worth
> looking at, never as the verdict.

#### Every interior layer grades now

The mantle's gradient was the only one, which made it look like a special
effect rather than how the cutaway is drawn. Crust, outer core and inner core
all grade, plus sea ice.

**`depthGradient` is the non-thermal sibling of `heatGradient`** — same
machinery, inner edge *darker* and slightly more saturated rather than hotter,
and independent of the heat dial because a crust is stratified on a dead world
too. A crust does not get hotter inward in any way worth drawing, but it does
have an inside and an outside.

**A layer already at full brightness grades in HUE instead.** The inner core
sits at v≈1.0 by design, so "hotter" has no value headroom and the fluorescent
ceiling was pulling its saturation down — washing the centre toward white, which
is D13's dull-disc failure arriving from the opposite direction. It now climbs
the spectrum the way real incandescence does: deep red, orange, yellow, white.

**Sea ice grades through its thickness**, reusing the nested bands `paintSeaIce`
already draws — bright rime at the surface, dense blue compressed ice against
the water. The previous version varied brightness the other way (thick ice
brighter than thin) across a span of 0.86..1.04, too small to read as either.
The thickness cue survives in the geometry, which is where it belongs.

#### Adjacency had to start asking about the visible boundary

Once a layer grades, **its base colour is no longer what meets its neighbour** —
the outer core meets the inner core with its hot edge, which can be most of a
hue and a third of a value from the base figure. Comparing base colours asks
about a boundary that is not on screen: it can flag a pair whose visible edge is
perfectly distinct and miss one that genuinely collapsed.

Both the palette's separation pass and `sweep.mjs`'s muddiness check now compare
`hotEdge` where present. **The test had to change with the code, and that is not
a weakening of it** — it was measuring the wrong edge, and it failed on 36 pairs
precisely because the fix was working. A test that fails when the code improves
is asking an outdated question; the fix is to correct the question, not to
relax the threshold.

---

### D62 · The gradients were invisible for one ordering bug, and three energy fixes

Reported after looking at the real GUI: "I don't see the new gradients at all."

#### The outer core and inner core never reached the gradient code

`bandFill` tested `colour.emissive` **before** `colour.hotEdge`. Both metal
layers are emissive, so both took the generic self-lit shading and never
reached the thermal ramp, however strong the palette made it. That is the whole
reason the outer core "doesn't look like it even has a gradient" — the palette
was computing one correctly and the renderer was discarding it.

The gradient is the more specific statement, so it now wins. **A dispatch chain
ordered by which branch was written first will silently shadow the newer one;
order it by specificity.**

#### The ramp was crammed into the outer fifth of every band

Even where the branch was reached, the stops sat at 0.40 / 0.78 / 1.0. Measured
across a mantle at full heat, the inner 70% of the band was flat within 13
luminance points while the outer 20% carried the entire transition — the eye
read that as a *rim*, not a gradient.

Now five to six stops spread across the full width, and a helper that
interpolates band→hotEdge at any `k` so the curve is sampled rather than
approximated by a straight line between two colours. Amplitudes were raised
alongside (`heatGradient` value reach 0.58 → 0.80, `depthGradient` 0.42 → 0.72).

#### Three shapes for three requests

**Crust — a sharp, short falloff at the base.** Layered rock holds its surface
colour through most of its depth and then goes dark quickly where it is
compacted and no light reaches. An even ramp across a thin crust just reads as
a muddier crust; a short hard falloff reads as the underside of a solid and
gives a real edge against the mantle.

**Inner core — a sphere, not a disc.** The generic emissive shading spanned
`lighter(0.22)` to `darker(0.12)`, a 17-point luminance range on a band of 250,
and on the inner core it came out *darkest at the very centre* — the opposite of
radiating. The profile is now deliberately non-linear: near-uniform hot through
the middle, falling away steeply near the rim. **Front-loading the stops is the
whole trick — an even ramp reads as a flat cone, not a sphere.**

#### Flow indicators were chalk drawings

Reported exactly that way, and the cause was that every one was drawn at one
width, one alpha, and a constant arc. Three changes, no new elements:

- **Taper.** Flow lines thin toward the head; arrows *thicken* toward theirs,
  because an arrow's weight belongs at its point. A constant-width stroke is a
  diagram of movement; a varying one is movement.
- **Accelerating curve.** The lean is applied on a rising curve (`t*a + t²*b`)
  so the far end whips rather than drifting. An even arc reads as drawn, an
  accelerating one as flung.
- **Alpha and size raised** — flow lines 0.27–0.56 → 0.42–0.78, arrows
  0.44–0.90 → 0.58–0.96 with longer shafts and wider heads. At the old alpha
  these were the faintest thing in the layer.

The taper needs segment-by-segment strokes, since one path has one width. More
calls, but these are short lines, and a filled ribbon would lose the soft
round-capped look that suits a fluid.

#### Veins: full count restored, and per-instance chaos

**Density back to the original 14–96.** Reducing it was wrong twice over: there
were never many to begin with, and at the reduced count they read as isolated
*objects* rather than as a network — which is most of what invited reading them
as bottles in the first place. D60's "fewer, bigger" is now fully reversed;
enlarging them was not the thing that needed compensating for.

**`chaos: 0.5`** scatters each instance's length and girth by ±50%
**independently**, plus occasional branch-count variation. The independence is
the point: scaling both together just gives the same shape at another size,
which is what tiers already do. A vein system looks grown rather than placed
because no two seams share proportions.

#### A measurement lesson, again, and worse than last time

D61 recorded that a metric on one dimension will report success while the
picture is wrong. This session the failure was cruder and cost more: a probe
sampling along a radius reported "57/150 dull mantles at full heat" across
several rounds of tuning. The probe was reconstructing the body's pixel radius
from `bodySize`, which is **not** the on-screen fraction — the view divides by
an `extent` that grows with the atmosphere. It was sampling background, ring
systems and starfield, and reporting them as dull mantles.

Rendering the twelve worst-flagged seeds and looking at them showed all twelve
were vivid red-orange interiors. **When a metric disagrees with the picture,
the metric is the thing to doubt first — and the cheapest way to settle it is
to render the flagged cases and look at them, not to tune against the number.**
Any probe that reconstructs the renderer's own transform should call
`view.px()` rather than re-deriving it.

---

### D63 · The fluid layers grade too, and a depth ramp must run the whole band

Follow-up tweaks, both reported from the GUI.

**The crust's gradient only covered its lower half.** It reached the base colour
by stop 0.52 and was flat above that, so the upper half of the band — the half
carrying the terrain, the strata and the coastlines, which is the part anyone
actually looks at — got no shading at all. The ramp now continues past the base
colour and *lightens* toward the surface, and the deepest stop goes below the
hot-edge colour into a real shadow (`darker(0.30)`), with `depthGradient` raised
0.62 → 0.82.

Terrain relief is drawn as **translucent** slope shading over the band fill, so
extending the gradient upward reaches the terrain rather than being hidden by
it — worth checking before assuming a fill under detail is wasted.

**The ocean got a depth gradient**, at 0.86 — the strongest in the stack. It is
also the one gradient in the project needing no stylistic justification: light
is absorbed with distance through a fluid, so deep water genuinely is dark
water. A thin band seen against a lit surface needs the drama, and it is what
gives the sea a sense of volume that a flat blue ring cannot have.

> **The exotic-ocean rebuild drops any field it does not name.** `spec` is
> reconstructed from scratch when Exotic oceans is on, so `depthGradient` had to
> be listed explicitly or the gradient would have silently applied to realistic
> seas only. Depth shading is a property of being a FLUID, not of being water —
> a liquid-metal sea absorbs light the same way. Any future field added to a
> layer spec needs the same treatment; this rebuild is an easy place for a
> feature to half-work.

**Sea ice follows the sea it floats on.** Its own thickness gradient is now
scaled by the ocean's `hotEdge.strength`, so the two read as one column of fluid
darkening with depth rather than a bright lid on a separately-shaded sea. Its
depth term was also rescaled — `lo` is a band threshold topping out near 0.8, so
using it raw meant the darkest ice only ever reached 80% of its own ramp.

**Note on the suite:** `npm run test:dom` currently fails with "3 controls lack
tooltips: reset-framing, pan-x, pan-y". These belong to `js/ui/framing.js`,
which is unrelated to this work — `pan-x`/`pan-y` are hidden inputs and
`reset-framing` is a button, so whether the tooltip rule should apply to them is
the framing author's call. Everything else in the suite passes.
