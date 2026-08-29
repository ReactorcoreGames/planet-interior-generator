# Progress & Decisions

*The running record: what is built, what the next session needs to know, and
where to find the reasoning behind a rule. Update the Status line and
Checklist at the end of every session; add new narrative to
`docs/progress/`, not here — see [Session archive](#session-archive) below.*

**Status:** Sessions A–R complete · Phases 0–6 ✅ ·
**Climate system ✅ (Session F)** · **MVP polish ✅ (Session G)** ·
**Export defects ✅ (Session H)** · **Framing ✅ (Session I)** ·
**Test suite cut ✅ (Session J)** · **Phase 5 gaseous ✅ (Session K)** ·
**Phase 6 stars ✅ (Session M)** · **Phase 6 polish, the body ✅ (Session O)** ·
**Phase 6 polish, the tidal bulge ✅ (Session P)** ·
**Phase 6 polish, the traits ✅ (Session Q)** ·
**Phase 6 limb, calibrated against the app ✅ (Session R)** ·
**Phase 7 moon ✅ (Session S)**
**Next:** Phase 7 continues — the **asteroid** (the Voronoi interior; the
primitive exists but has never been called and currently fills cells flat, so
it will produce exactly the "mosaic laid over a circle" the phase doc's
done-condition forbids), then the **compact** group (neutron star, pulsar,
black hole) and the **diffuse** group (nebula). Open question 1 is discharged
for the moon; **the asteroid half of it is still open** — see below.
**Last updated:** 2026-08-28 (Session S — Phase 7's moon: a frac table whose
authored radii were not its drawn radii for three separate reasons, an optional
layer that contradicted the body's own temperature on 89% of seeds, a second
temperature declared rather than detected, a frosting spec that had to become
per-surface with its own RNG stream, an upward deposit whose sign changes were
mostly NOT in the radii, and an accreted ice that never drew because two sites
asked "does this layer carry terrain" in two different ways (D163–D170).
Session R — the stellar limb, calibrated against
the running app rather than against renders: a frame convention asserted in
prose and wrong in both primitives that relied on it, a fade that reached a
tenth and stopped instead of reaching zero, two marks each calibrated alone and
wrong as a pair, a flag silently dropped between the trait and the renderer,
and a coronal hole that finally worked by changing REGISTER rather than shape
(D155–D162). Session Q built the stellar traits: two megastructures
rebuilt as objects that say which way they face, rings and debris gated off
stars behind a tag, a flare storm that was BOTH the wrong vocabulary and the
wrong reach, a prominence ribbon widened along the one axis that is only correct
at its apex, and a coronal hole rebuilt as an absence because dark paint under a
`screen` blend is a no-op (D146–D154). Session P made the tidal bulge reach the
skin; Session O built the star's own body —
a wavy limb stated as a proportion of each layer's own thickness, a plume
field standing off the surface, an emissive halo with heat veins, and the
binary companion built as a tidal bulge on the outward layers. Four new
general mechanisms, none of them declared outside the stellar family, so no
other family's render moved (D129–D139). Session N split the stellar data
layer; Session M built the family)

> **This file records current state; the specs record *what*; `docs/progress/`
> records *why*.** As of D14 the spec set has been reconciled with the code,
> so ARCHITECTURE, PARAMETERS, ROADMAP, ARCHETYPE-TEMPLATE and the celestial
> docs are all current — read them as authoritative. Come here for what's
> built and what's next; follow the links below for the defect history and
> the reasoning behind a rule. `npm run test:docs` keeps the specs and code
> from drifting apart.

---

## Checklist

Mirrors [ROADMAP.md](ROADMAP.md). Tick items only when the phase's
*done-condition* is met, not when the code is written.

### Phase 0 — Skeleton ✅

- [x] `index.html` with script tags in dependency order
- [x] `style.css` — preview left, panel right, pinned buttons
- [x] seeded RNG (`js/core/rng.js`) — deterministic per named stream
- [x] value/simplex noise wrapper
- [x] canvas setup, resize/DPI handling
- [x] `CelestialCutaway.init()` exposed for test harnesses

### Phase 1 — Structure & generic renderer ✅

- [x] archetype data model (`js/data/archetypes.js`)
- [x] layer-stack builder with presence rolls, ordering, clamping
- [x] generic renderer walks the stack — no per-family draw code
- [x] parameter-driven layer positioning (D1, D2)
- [x] surface renormalized to exactly 1.0 (D3)

### Phase 2 — Colour ✅

- [x] HSV colour maths, generative per-layer colour
- [x] separation and muddiness guardrails, tested (D10, D11)
- [x] adding/removing a layer never recolours the others (D12)
- [x] self-lit layers exempt from reflective rules (D13)
- [x] contact-sheet tooling (`npm run sheet`) for judging colour in bulk

### Phase 3 — Detail elements ✅

- [x] recipes per layer role (`js/data/elements.js`)
- [x] angular terrain field (D15), generic across families
- [x] detail generator + primitives + draw dispatch
- [x] size-tier weighting, area-correct scatter (see
      [phase3-and-pitfalls.md](progress/phase3-and-pitfalls.md))

### Phase 4 — Traits & angular zones ✅

- [x] zone primitive, trait placement grammar, ten traits
- [x] tidal locking rebuilt as an axis, not a trait (D27)
- [x] climate system: baseline field, caps, sea ice, aridity (Session F)
- [x] the MVP test — twenty Randomizes the user would happily use

### Phase 5 — Second family: gaseous ✅ (Session K)

The generalisation test, and it passed. Full write-up in
[session-k-gaseous.md](progress/session-k-gaseous.md).

- [x] `gas-giant` and `ice-giant` — **no `draw/` branch was needed**
- [x] banding, counter-rotating jets, storm curls (D74 — an alternating comb
      sizes against its SPACING, not its layer; three "missing" bands turned
      out to be thirty-one bands drawn on top of each other)
- [x] **Starlight drives cloud species** — off `chillAt`/`scorchAt`, never a
      second ramp (D42), via the new general `climateLean`
- [x] **D22 discharged** — the frosting zone table moved from `draw/film.js`
      into `colorProfile.layers.film`; any zone count, per-archetype thresholds
- [x] gaseous stat template (D78 — **a stat template is a MINDSET**: depth and
      pressure, not what is underfoot). `draw/card.js` lost its hardcoded
      per-family line list with it
- [x] seven gaseous traits (D76 — all seven were invisible first time: wrong
      mark vocabulary, plus `tiers` inverting for named features)
- [x] `anchor` may be a list, so a shared trait meets different stacks (D77)
- [x] three primitives the family needed — `storm`, `capsule`, `shard` — because
      a soft blob cannot say what a thing IS (D80). Blend modes carry the
      texture; one shared `styleFor` resolves them (D81)
- [x] the trait picker reads the archetype at INIT, not only on change (D79) —
      a real-GUI defect no harness path could reach
- [x] presets for the family (Session L) — four `gas-giant`, three `ice-giant`.
      **Spanned by different axes than the solid ten**: no `ocean-depth`, no
      `tidal-lock`, because those are claims about a surface. Starlight,
      Interior heat and traits are what separate one giant from another
- [x] **the D79 audit** (D114) — only two UI modules cache a setting, and both
      are correct at boot; but both are stale after a settings PASTE, because
      `Controls.set` suppresses the change event. D79 was one missing line
      *per route into the control*, and only two of three routes were walked

### The data layer is split one file per family ✅ (Session K)

`archetypes/`, `elements/`, `traits/`, `flavour/` and `gen/stats/` each hold a
registry plus one file per family. Adding the next family is a new file and a
script tag in each, rather than an edit threaded through five growing files.
Every one of them was over or approaching the ≤500-line rule.

### Phase 6 — Third family: stellar ✅ (Session M)

The diagrammatic payoff. Full write-up in
[session-m-stars.md](progress/session-m-stars.md).

- [x] `young-star`, `main-star`, `old-giant-star`, `dwarf-star` — **no `draw/`
      branch was needed**; every grep hit for a stellar role in `js/draw/` is a
      comment
- [x] **convective and radiative zones are instantly distinguishable** (D115) —
      two mark vocabularies with NO primitive in common but `speckle`. Combed
      streaks against tiled circulating cells, decided in advance rather than
      after the first invisible render
- [x] `convection-cell`, because the existing `cell` is a VORTEX (D116) — and
      it took three passes, two of them spent on a silhouette that was already
      fine
- [x] **the old giant's absurd core-to-envelope ratio** — 2–6% of the radius,
      about one part in 23,000 of the volume, and the card states it from the
      drawn radii
- [x] **no star has a polar cap** — `frozenFraction` 0.000 on all four, and
      **Starlight changes literally zero pixels** while the other families
      change 20–61% under the same sweep. Both asserted, not trusted
- [x] **Star activity is one control with two consumers** (D27 honoured) — the
      new general `driver` field scales a trait's count off a named parameter.
      Measured at activity 0→1: prominences 4→22, flare storms 0→29
- [x] `selfHeated` — the third climate escape hatch beside `latitude` and
      `starlit`. Without it an ordinary star sat at a normalized 0.21 and the
      summary called 83% of stars frozen
- [x] **every stack was the wrong stack** (D118) — `frac` cannot express a
      skin, and all four archetypes had a thin layer swallowing the interior. A
      tachocline rolled 0.348 thick; a dwarf's photosphere took 55% of the body
- [x] stellar stat template (D78's mindset held) — energy transport, core
      ratio, lifespan, habitable zone. Not a planet's card with the surface
      lines deleted
- [x] four traits invisible or off-canvas, all four found by **counting pixels
      per archetype** (D121). One drew at 0 px on exactly one of four bodies
- [x] eight presets, spanned by different axes again — Starlight is dropped
      entirely, because on a star it is inert by declaration
- [x] **the stellar data layer split** (D128, Session N) — the per-family split
      ran out at four archetypes, and each file got the cut its own seam
      wanted: archetypes per body, traits per concern, elements per zone, stats
      derivations-vs-template, primitives the-star's-own-marks vs
      solid-objects-against-a-star. Every file is now under 500 lines

### Phase 6 polish, doc 1 — the star's own body ✅ (Session O)

The limb, and only the limb. Full write-up in
[session-o-star-body.md](progress/session-o-star-body.md). **D84 held: the
colours, the layer details and the sizes are the praised half and none of them
moved** — every `frac`, `maxThickness` and colour band is byte-identical to
how Session M left it, measured with `test/_tmp/starstack.mjs` rather than
assumed.

- [x] **a close-up limb renderer, built FIRST** (`test/_tmp/limb.mjs`) — the
      view almost every judgement in the doc needs and nothing had. Reuses the
      app's own zoom/pan, so it cannot disagree with what the GUI shows;
      `--strip` answers "do four archetypes have four different limbs"
- [x] **limb darkening** (D129) — a general `limbDarkening` layer property.
      The curve belongs to the SPHERE, not to the layer: the first version
      anchored it to the layer's own edge and came out exactly inverted
- [x] **a wavy limb, stated as a proportion of each layer's OWN thickness**
      (`wobbleRel`). The user's 10%–50% calibration taken directly; D131 is
      the sharp part — the amplitude was right and the FREQUENCY was wrong
- [x] **the wobble and the tidal bulge are one mechanism** (D130) — both are
      per-bearing thickness multipliers, so `thicknessAt(a) = wobble × bulge`
      and §5 of the doc came out to a data file with no new drawing code
- [x] **the plume field**, separate from the wobble so "more spiky" and "more
      flames" are two knobs (D135). A corona ELEMENT rather than a new pass —
      the outward layer's own clip is already exactly the region a plume
      occupies. v2's tapered flare ribbon raided as CLAUDE.md invites
- [x] **the emissive pass** — a coloured halo with heat veins reaching through
      it. D137: a radial glow with no structure reads as a lens artifact, and
      bright constant-width filaments read as a starburst camera filter
- [x] **the spanning clip widened to the FRAME** (D133) — it had been too
      tight three times. Prominences went 894 px → ~9,500 px per archetype
- [x] **`extent` and the glow are opposite calls** (D134) — the wobble must be
      in the sweep because it moves the silhouette; the glow must not be,
      because a halo has no claim on frame space
- [x] **per-archetype brutality** via the new general `elementScale` (D138) —
      an element table keyed by ROLE could not say "this body's version is
      louder". It also exposed the old giant having no corona and therefore no
      plumes at all, which one four-way strip showed in a glance
- [x] **`binary-companion` built, as an axis** — the user rejected drawing a
      second star, so it is a tidal bulge on the OUTWARD layers plus a hotter
      facing hemisphere. The body stays round and the cutaway stays readable
- [x] **a dead control made live, and honest about it** (D132) — `tidalLock`
      did nothing on a star; it drives the companion now and `axes.dial`
      relabels the slider per archetype. Wired on all three routes into the
      archetype control, D114's audit applied rather than rediscovered

### Phase 7 — asteroid ✅ (Session T)

[session-t-asteroid.md](progress/session-t-asteroid.md) — D175–D183. **No
existing body changed**: all six new mechanisms default to no-ops.

- [x] **an authored layer that was not a DRAWN layer** (D175) — D122 in its
      purest form so far. `interior` omitted `frac` on the registry's "take
      what's left", pass 1c resolved it to the layer above's OUTER edge, the
      shell came out 0.000 thick and the sliver drop removed it. The built
      body had ONE layer on all 200 seeds, and the doccheck passed throughout.
      "Take what's left" only means something when the neighbour above is
      itself positioned against something else.
- [x] **open question 1 discharged for the asteroid** (D176) — the predicted
      hairline was real (0.0417 at worst, now 0.0615), the renormalization
      fault was real (fixed by authoring the shell AT the surface and making
      the dust a film), and the predicted wobble crossing was NOT — 0/4800
      bearings. Recorded as a measurement, which mattered when it became real
      later.
- [x] **a row that never varies carries no information** (D177) — every
      asteroid reported exactly 0.04000 g, because the shared clamp's FLOOR
      sits above this family's whole range. The gaseous ceiling failure from
      the other end. This family computes its own with real physics, because
      at these scales the honest number IS the evocative one.
- [x] **a body can be too small to have its own heat** (D178) —
      `climate.retainsHeat`, the mirror of `selfHeated`. The model was not
      wrong; the archetype had no way to say r²/r³ had taken everything.
- [x] **roundness was a failure of FREQUENCY and ANGULARITY, not amplitude**
      (D179) — the user's correction from the app. At `extreme` the silhouette
      swung 12% and still read as a circle. Three independent statements about
      an edge — how much, how angular, how many — and only the first had a
      vocabulary. **When a mark is wrong and the obvious control does not fix
      it, the missing thing is usually a different KIND of statement.**
- [x] **two large boundaries must not be independent** (D180) — matching the
      interior to the shell put the mosaic OUTSIDE the crust on 11.8% of
      bearings. Two independent swings of similar size always cross somewhere.
      `boundaryShare` makes them one curve, so crossing is impossible by
      construction rather than by tuning.
- [x] **a surface described only by continuous fields is a POLISHED one**
      (D181) — the user's second correction. Three smooth marks cannot add up
      to roughness however they are tuned; the missing thing was a different
      KIND of mark. Grit, in both polarities — dark alone is dirt, bright
      alone is sparkle.
- [x] **three marks that were the wrong size** (D182) — a sheen stroked as a
      hard crescent, glints authored in body radii inside a layer that is 86%
      of the radius, and a value fan multiplying a 0.19 base into three
      near-blacks. Each found at a different scale.
- [x] **the mosaic is ONE element** (D183) — a Voronoi cell has no shape of
      its own, so it is a single structure and an ordinary `KINDS` entry.
      `draw/scene.js` needed no change at all.

### Phase 7 — moon and ice moon ✅ (Session S)

The first of Phase 7's three groups. Full write-up in
[session-s-moon.md](progress/session-s-moon.md) — D163–D174. **No existing
family moved**: planet, both giants and a star render byte-identically before
and after, asserted by hashing rendered PNGs rather than assumed (D84).

- [x] `moon` — **no `draw/` branch was needed**; one archetype with two stacks
- [x] **Open question 1 discharged for the moon** (D163) — the spec table
      COMPOSED, so D4's fault was absent, and it was wrong for three other
      reasons that only a built-and-printed stack shows: nothing sat above the
      ice-shell so renormalization scaled everything by up to 1.11; two layers
      could roll to a hairline against D5; and the shell's own relief
      re-created the first fault after it was fixed. **D122 applies to geometry,
      not only to a mark's alpha**
- [x] **an ice shell is EVIDENCE the body is cold** (D164) — `presence:
      { colder }`, asking the real `CC.Climate.baseline`. As a flat 40% roll,
      only 11% of ice moons showed a frozen shell over a liquid sea and some
      wore their lid at 610 C; gated, 65%, and the remainder are honest
- [x] **a threshold must be the one the MATERIAL cares about** (D165) —
      `CC.Climate.COLD` is 0.18 ≈ −60 C, not the freezing point. It made the
      probe report 18% for something that was 83% true, and it had already put
      the insulation floor *below* freezing, promising an ocean that is solid
- [x] **the ice moon's two temperatures** (D166) — `climate: { subsurface }`,
      the third escape hatch of exactly the shape `starlit` and `selfHeated`
      are. Declared, never detected; reads the same `heatTerm` the baseline
      does and declines the surface losses. Null when the named layer was not
      built, so the stack answers "has this body two temperatures". The card's
      `Beneath the ice` row states both — and states the negative honestly
- [x] **a frosting spec is per SURFACE, not per body** (D167) — with its own
      RNG stream, or the brine floor and the accreted ice roll identically and
      the two facing surfaces come out as one material drawn twice
- [x] **`direction: -1`** (D168) — and the sign changes are mostly NOT in the
      radii: the terrain field, the rock floor the ribbons clamp against, and
      the band clip, which had to be opened downward or the deposit was clipped
      to nothing. Two sea clamps were REMOVED rather than mirrored
- [x] **the relief lookup and the film lookup are one question** (D169) — the
      accreted ice never drew because `filmZoneByRole` asked
      `Elements.reliefFor` while the draw loop honoured the layer's own
      `reliefSpec`. D159's shape, in the frosting
- [x] **`reliefSpec`** (D170) — a moon's ground is a different FIELD, not the
      planet's at another amplitude. Craters on craters, no continents
- [x] **regolith as two zones**, `hueFrom: "host"` — the one place the free
      frosting hue is wrong, since regolith IS the rock ground up. Measured:
      settled span 0.091 against rock span 0.155, 50% pooling / 50% shedding
- [x] **the doccheck learned about branches** rather than gaining an exception
      — still generic over `CC.Archetypes.ids()`, still no code per family
- [x] four presets, verified across 25 seeds each to deliver what they promise
- [x] **a locked recipe written for a surface sea is WRONG under a lid** (D172)
      — the moon inherited the planet's `sea: -0.85`, which on a planet is the
      feature's centre and under an ice shell draws a rigid lid spanning an
      emptied void. Sea level swung 0.149 of the body radius. `field_when` is
      the sibling of `frac_when` and `film_when`; the ice recipe simply OMITS
      `sea` and `snow`, and the lock is carried by the shell's own thickness
      instead — thinner where the flexing melts it, which is the real
      mechanism and the opposite sign. Also: `swellResidue: 0` did not mean
      zero, because the shared falloff starts at 0.86 below the anchor list
- [x] **rings were one object pretending to be three** (D173) — D76/D160's
      vocabulary problem arriving from the direction of SAMENESS. The moon
      loses rings entirely (no moon has a confirmed one; the parent strips the
      band, and the tag had been carried on an unexamined comment — D146
      repeated one family later). The gate splits into `dusty-rings` /
      `structured-rings` / `orbit-debris`, and `ringlet-band` gives a giant
      resolved ringlets, knife-edge divisions and the body's own shadow. Two
      wiring faults both looked like success: the giant kept drawing the OLD
      mark at the right count and radii, found only by printing element KINDS
- [x] **the ocean was pinched by FOUR things** (D174) — and three real bugs
      were found and fixed before the actual cause. The cause was the SHELL'S
      `relief`: `reliefFn` displaces a layer's outer boundary, which on the ice
      branch sits on a thin ocean, and 0.11 swung it 65% of the ocean's
      thickness. Then D172's own `swell` fix caused the rest, because swell
      moves the OUTER edge while thickness is kept, so a "thinner" shell slid
      inward and squeezed the water (27%, 1.32x). Both removed; water is now
      1.14x locked and unlocked alike. **Verify the PROPERTY the report is
      about, not the mechanism you touched**. Postscript: the user later found
      that part of the symptom was a MISREAD — the "void" was the ocean
      freezing, working as intended. The `relief` and `swell` fixes stand (both
      quantitatively indefensible); the deposit depths were cut on a partly
      false premise and are the numbers to raise if the accreted ice ever reads
      as too slight
- [x] **registered is not REACHABLE** (D171) — the moon was built, tested,
      rendered and presetted while missing from the archetype dropdown, because
      the suite drives `CC.Archetypes.ids()` and the GUI reads a hand-written
      `<select>`. Two lists, nothing comparing them; the user found it in a
      minute of opening the app. `test:docs` now asserts they agree both ways —
      still generic, still no test code per family

### Phase 6 limb — calibrated against the running app ✅ (Session R)

The marks on and above the limb, put in front of the user in the actual app.
Full write-up in [session-r-limb.md](progress/session-r-limb.md) — D155–D162.
**No layer stack, proportion or transport treatment was touched.** Four of the
six traits Session Q signed off were wrong in ways no harness reported, and the
coronal hole took three more rebuilds.

- [x] **`ctx.rotate(angle)` sends local +y INWARD** (D155) — and both primitives
      that relied on the convention asserted the opposite in prose. Every
      orbital mirror faced its metal backing at the star and every collector
      aimed away from it. A mirror facing the wrong way still draws, still
      orbits correctly and still reports fine: D77's shape applied to an
      orientation. The arithmetic is now written out where it is used
- [x] **fading TOWARDS nothing is not ending AT nothing** (D156) — the flare's
      flat top survived its own fix, because a decaying power never reaches
      zero and the last slice was still at a tenth. Pinned to zero at the end.
      The same fault appeared twice more: open lines ending at a visible alpha,
      and a SET of lines sharing a tip because they were all the same length
- [x] **a per-slice alpha, not a gradient** (D157) — a linear gradient fades
      along the wrong axis for any mark that leans or curves, which is all of
      them out here
- [x] **two marks each calibrated alone are not a calibrated pair** (D158) — the
      wind and the field lines read as dense hair, a fault neither exhibited
      alone and neither one's numbers explained. Four compounding causes
- [x] **`ElemGen.build` drops recipe fields it does not know** (D159) — silently.
      `escapes` was set correctly in the trait, read correctly in the renderer
      and `undefined` in between. Anything the renderer must see belongs on the
      loop that stamps `role` and `trait`, not on the recipe
- [x] **the coronal hole works by REGISTER, not by shape** (D160) — three
      versions competed with prominences and flares on brightness and
      silhouette and lost. Field lines are ANNOTATION, the register the mantle
      arrows are in, which the star family had never used. D76 raised from one
      silhouette to the whole picture
- [x] **a separation failsafe must guarantee VALUE** (D161) — hue separation
      alone left the mark olive over a bright corona on any dark-interior body.
      Which hue is a fact about the body; how bright is a fact about the mark.
      `CC.Palette.deep` is new, and walks a CHAIN because `radiative` exists on
      only two of the four stellar archetypes (D77)
- [x] **`escapes`** (D162) — one trait is allowed to leave the picture, because
      a coronal hole's wind is the one mark whose content is that it does not
      come back. The clip stays the default; this is the documented exception
- [x] **`companion` may change the element KIND** — the mechanism existed for the
      gas giant's storm above the clouds; the hole needs two different marks
      that must coincide. Extended rather than duplicated
- [x] **D122 fired twice more** — the wind was authored 0.55–1.05 and reached the
      canvas at 0.081–0.121. The only way to know the drawn number is to print it
- [x] **`stellar-limb.js` split four ways** — 768 lines became four files under
      500, split by what each mark IS: structures the star keeps, an event, a
      steady state, and annotation

### Phase 6 polish, doc 3 — the stellar traits ✅ (Session Q)

The traits, and only the traits. Full write-up in
[session-q-traits.md](progress/session-q-traits.md). **The body structure was
signed off and none of it moved** — no layer stack, proportion or transport
treatment was touched.

- [x] **the megastructures coexist and each says what it is** — `dyson-structure`
      became `orbital-mirrors`, two flat rectangles sharing an edge because only
      that can state WHICH WAY a thing faces; the collectors became a cylinder
      with a cone pointing at the star, because `upright` picks an axis and a
      capsule is symmetric. The `excludes` between them is gone
- [x] **the glass reflects the star** — a deliberate D80 exception, named in
      three places so it is not "fixed". `CC.Palette.emitted` is the new general
      fact: the brightest self-lit layer that is visible from outside, which is
      null on every non-star
- [x] **no star offers rings or debris belts** (D146) — `requires: []` was an
      unexamined default, not a rule. Gated on `orbit-safe`, a tag named for the
      physical fact and carried by no star; `accretion-disc` replaces them on a
      young star, which is the same primitive saying something true
- [x] **flare storms were TWO bugs, and either fix alone looks like a failure**
      (D147) — the wrong kind of mark (a `vein` among a corona's hundreds of
      near-radial strokes) *and* the wrong reach, which clipped away the spray
      and leading front that carried the distinguishing shape
- [x] **a prominence ribbon was widened in RADIUS** (D149) — correct at the apex
      and meaningless at the feet, where the loop runs radially and `halfWidth`
      is largest. Two sessions invisible at whole-body scale; one large render
      found it. Strands added, and the span narrowed from 60° to 20°
- [x] **coronal holes are an ABSENCE** (D150) — under the corona's `screen`
      blend dark paint is nearly a no-op, which is why the old version *had* to
      be a flat hard wedge. Two new general mechanisms: `thinAt` on the zone
      field and `thins` on a trait, both opt-in and neither declared outside
      this family
- [x] **spicules measured before tuning** (D148) — 1.2–6.4 px, median 3, because
      `sizeRel` on a layer that is thin by definition compounds with the tier
      factor. Now 4.8–18.5 px, median 8.8
- [x] **starspots span a few enormous to many small** — 3–54 px at counts of
      18–67, with `spread` doing most of the per-body work
- [x] **the harness was framing tighter than the app** (D151) — `pixdiff.mjs`
      rendered at a body size whose frame stops at r=1.11, *inside* a star's
      corona, so no correctly-placed orbital trait could be in frame at all.
      Three diagnoses were spent before the probe itself was suspected
- [x] **`depthAbove`** (D152) — an orbital band stated relative to the body's own
      halo, because no fixed radius clears a corona running 1.06 to 1.40
- [x] **`density` vs `repeat`** (D153) — a count that is a fact about the world
      must not be authored as a density band, or the slider becomes the author

### Phase 6 polish, doc 2 — the tidal bulge reaches the body ✅ (Session P)

Full write-up in [session-p-tidal.md](progress/session-p-tidal.md) — D140–D145.
The companion deforms the chromosphere and photosphere rather than only the
corona, the interior stays round (measured), and `tidalLock` finally does
something on both giants.

### Climate system ✅ (Session F)

- [x] `CC.Climate` thermal field on every body (D40)
- [x] snowline/caps, sea ice, aridity, exotic-ocean limits (D41–D46)
- [x] GUI defect pass — atmosphere clearing, seam trap, dead-world ice (D47–D49)
- [x] `npm run climate` harness with numeric + visual checks

### MVP polish ✅ (Session G)

- [x] plain-language stats derived from the render, not proxies (D51, D52)
- [x] info card is DOM-driven, panel decides nothing (D53)
- [x] PNG export re-renders instead of scaling the preview (D54, D55)
- [x] settings import/export, background lock (D56–D58)
- [x] mantle heat, trait-mark colour, layer gradients, flow energy and fluid depth shading (D59–D63)

### Export defects ✅ (Session H)

Found by driving the real GUI, which is where every one of these lived. Full
write-up in [session-h-export-defects.md](progress/session-h-export-defects.md)
— D62–D68.

- [x] card height, the composed 4:3 aspect floor, resolution scaling
- [x] **the info card is no longer a zoom control** (D65) — worst-case zoom on
      toggling it falls from 48.8% to 1.0%
- [x] the first frame is no longer a squished oval; export feedback no longer
      claims success before an async clipboard write settles

### Framing, background stack, orbital material ✅ (Session I)

Pulled forward from Phase 8, then grew two more passes. Full write-up in
[session-i-framing.md](progress/session-i-framing.md) — D69–D113.

- [x] **zoom and pan** (D69–D71) — 1x–20x, wheel-to-cursor, drag-to-pan. Three
      numbers patched into `makeView`; nothing in `draw/` knows it exists.
      Framing is a value, not a mode, and `extent` stopped being a second
      hidden zoom control
- [x] **the background is a STACK, not a mode** (D94–D107) — base colour +
      optional field (gradient / nebula) + stars as an overlay. Four exclusive
      modes had made "stars over a blue sky" unreachable
- [x] **the orbital belt reads against any sky** (D108–D111) — a lit rim is a
      mark stars do not have, and a background-independent haze band is what
      actually fixes it
- [x] **the app-blanking defect** (D104) — a lock's hidden checkbox resolving
      its `position: absolute` against `#preview`, scrolling the whole app off
      screen with no exception thrown
- [x] **`draw/` gets the registry split the data files had** (D112, D113) —
      `primitives/` and `zonepaint/`, both cut at a real seam
---

## Test suite

**Deliberately small, and it stays that way.** `npm test` is `doccheck` +
`domtest` — about 30 seconds, manual-run only. Nothing runs it automatically.

### Why it was cut (Session J)

It used to be six stages and ~4 minutes. `sweep.mjs`, `stats.mjs` and
`composed.mjs` were **deleted**, for two reasons, and they should not come back:

1. **They encoded judgement, not facts.** Colour-harmony thresholds, stat
   phrasing, export layout numbers. A test that holds an opinion causes *false
   corrections* — a future session "fixes" working code to satisfy a stale
   assertion. Whether the output looks good is the user's call, made by looking
   at the screen, and `npm run sheet` is the tool for it.
2. **They grew per family.** `stats.mjs` hand-wrote a 576-combination grid for
   the planet alone. Twelve archetypes that way is a session of test-writing per
   family — a maintenance cost growing faster than the app.

**The rule going forward: a check earns its place only if it is mechanically
true-or-false AND generic over `CC.Archetypes.ids()`.** Adding a family should
add no test code. If you want to check how something *looks*, render it and
look — see the visual tools below.

| Command | What it does |
|---|---|
| `npm test` | the whole suite: doccheck + domtest |
| `npm run test:docs` | 0.3s. **The specs still describe the code** — every layer has a colour entry, sat/val ranges are ordered and in gamut, **frac ranges compose at all 2ⁿ combinations of extremes** (per BRANCH, where a stack declares `frac_when`), **every registered archetype is selectable in the GUI** (D171), every script in `index.html` exists, no ES module syntax. Loops every archetype, so it covers new families for free |
| `npm run test:dom` | loads the real `index.html` in jsdom and drives all 111 controls. Catches: a control that throws, a control that is **inert** (wired but changes nothing — the Size-tiers failure), NaN geometry, unbalanced save/restore, determinism, resolution independence, tooltip coverage, settings round-trip |
| `npm run test:lib` | vendored libraries load as classic scripts and behave |

### Visual tools — these assert nothing, they render for you to judge

| Command | What it does |
|---|---|
| `npm run sheet` | **24 randomized bodies in one contact sheet.** The way to judge colour: harmony is a property of the *spread* of outputs, so they have to be seen side by side. `npm run sheet -- 48 8` for more |
| `npm run shots` | ~60 PNGs to `shots/` — parameter sweeps, one per file |
| `npm run climate` | the climate system's numbers and renders. **`shots/climate/_cap-crop.png` is the view to judge caps from**; at whole-disc scale a correct cap reads as a faint rim |
| `npm run film` / `zones` / `framing` | targeted renders for those subsystems |

Things the suite still guarantees, so a regression can't slip through quietly:

- the app boots and every control drives a render without throwing
- no NaN geometry, no malformed colours, no unbalanced save/restore
- same seed + same settings ⇒ byte-identical geometry
- element counts identical at 360p and 2160p (resolution independence)
- frac ranges stay ordered at every combination of extremes, every archetype
- every layer has a colour entry; no inverted or out-of-gamut ranges
- the climate controls change the output rather than merely being bound
- the settings string round-trips, framing included (D73)
- every control carries a tooltip

**What it does NOT check, by design:** whether anything looks good. That is the
user's loop — build, open the app, judge, report back.

---

## Known-and-accepted behaviour

Things that look like bugs but are not, recorded so a future session doesn't
"fix" them.

**Some cores render a saturated brown.** The core's hue band is orange
(28–54°), so at moderate saturation with a lowered value it reads as brown.
Value is pulled down by two rules working as designed: low-to-mid Interior heat
(a cooling core *should* look like dull metal), and D11's separation rule
darkening the core when it collides with the outer core in HSV. Reviewed and
kept in Session A — it adds variety. The lever if it ever needs changing is
`core.val` in `js/data/archetypes.js`; raising its floor from 0.84 keeps cores
bright regardless of heat.

---

## Open questions for a future session

1. ~~**The ASTEROID frac table.**~~ **Discharged in Session T (D175/D176).**
   Both halves of open question 1 are now closed. The lesson carried over from
   the moon held exactly: the table **composed**, the doccheck passed, and it
   was still wrong — including one fault (D175) where an authored layer was
   not a drawn layer at all and the built body came out with a single layer on
   every seed. Nothing short of printing the stack finds that.
   `test/_tmp/_asteroidstack.mjs` is kept so the figures can be re-derived.

1b. **The body is cut off flat across its lower portion**, on every family and
   at every size. Verified in Session S to **predate** that session's changes
   by stashing them, so it is a pre-existing render defect rather than
   anything the moon introduced. Nobody has looked at it yet.
2. **Atmosphere thickness has no control.** It is rolled from its own stream.
   PARAMETERS.md doesn't list one; add it, or leave it rolled deliberately.
3. **Stats must be derived from the stylized radii** (D5), not from real
   planetary figures, or the numbers will contradict the picture. Done for the
   solid, gaseous and stellar families; note D75 — every calibration constant
   in that path is only calibrated for the radius range it was fitted on, and a
   new family must re-measure rather than reuse. D119 adds the sharper form:
   where two constants jointly decide an output, they are ONE calibration and
   fitting either alone breaks the other.
4. **Atmosphere reads well but is not tuned across every palette.** The screen
   blend fixed the "solid band" failure, but the peak alpha (0.82) and the
   limb-brightening curve were set by eye on a handful of bodies. Worth a
   sheet-wide pass at some point.

---

## Session archive

This file used to hold the full decisions log and session-by-session
narrative — it grew past 3,000 lines and stopped being useful as context.
The full history is still here, just split by session so only the relevant
part needs to be pulled in:

| File | Covers |
|---|---|
| [decisions-early.md](progress/decisions-early.md) | D1–D28, D9 — structure, colour, terrain, frosting, zones (Sessions A–C) |
| [phase3-and-pitfalls.md](progress/phase3-and-pitfalls.md) | Phase 3 detail-element tuning notes; recurring traps worth not repeating |
| [session-c.md](progress/session-c.md) | Phase 4 traits, the tidal-locking axis rework, what was still wrong after review |
| [session-d.md](progress/session-d.md) | D29 — tidal-locking defect fixes |
| [session-e.md](progress/session-e.md) | D30–D39 — atmosphere/sea-level fixes, the `tempAt` thermal field, the unzoned-cold investigation |
| [session-f1-climate.md](progress/session-f1-climate.md) | D40–D46 — the climate system build |
| [session-f2-gui-defects.md](progress/session-f2-gui-defects.md) | D47–D49 — defects found on the real GUI |
| [session-f3-docs-prep.md](progress/session-f3-docs-prep.md) | D50–D63 — docs reconciliation, stats, info card, export, mantle/trait colour (Session G) |
| [session-h-export-defects.md](progress/session-h-export-defects.md) | D62–D68 — card height, aspect floor, the card-as-zoom-control bug, the first-frame oval, honest export feedback (Session H) |
| [session-i-framing.md](progress/session-i-framing.md) | D69–D113 — zoom/pan, the background stack, the orbital belt's visibility against any sky, the app-blanking lock defect, the `draw/` registry split (Session I) |
| [session-k-gaseous.md](progress/session-k-gaseous.md) | D74–D93 — Phase 5, the gaseous family: the banding-overlap trap, calibration constants going stale three times over, traits that place but cannot be seen, the stat card as a mindset, and a trait picker that only ever heard about changes (Session K) |
| [session-m-stars.md](progress/session-m-stars.md) | D115–D128 — Phase 6, the stellar family: two vocabularies rather than two colours, a vortex that was not a convection cell, every stack silently reshaped by its own thin layers, a calibration that is a PAIR, and four traits found invisible by counting pixels per archetype (Session M) |
| [session-r-limb.md](progress/session-r-limb.md) | D155–D162 — Phase 6 limb, calibrated against the running app: a frame convention asserted in prose and wrong in both primitives that used it, a fade that reached a tenth and stopped rather than reaching zero, two marks each calibrated alone and wrong as a pair, a flag silently dropped between the trait and the renderer, a separation failsafe that guaranteed hue and not value, and a coronal hole that finally worked by changing REGISTER rather than shape (Session R) |
| [session-q-traits.md](progress/session-q-traits.md) | D146–D154 — Phase 6 polish doc 3, the stellar traits: an unexamined `requires: []` that let rings orbit a star, a flare storm that was two independent bugs neither of which shows a result alone, a ribbon widened along the one axis that is correct at its apex and meaningless at its feet, an absence built because dark paint under `screen` cannot work, and a test harness whose framing was tighter than the app's (Session Q) |
| [session-p-tidal.md](progress/session-p-tidal.md) | D140–D145 — Phase 6 polish doc 2, the tidal bulge reaching the skin: a signed displacement that is `airAt`'s sibling, its own anchor list, and elements that had to be told to ride the swell (Session P) |
| [session-t-asteroid.md](progress/session-t-asteroid.md) | D175–D183 — Phase 7, the asteroid: an omitted `frac` that deleted a layer on every seed, a gravity clamp whose floor sat above the whole family's range, a body too small to keep its own heat, a silhouette that stayed round at every amplitude because the missing statements were angularity and frequency, two large boundaries that had to stop being independent, and a Voronoi interior that could not read as rough while every mark describing it was a continuous field (Session T) |
| [session-s-moon.md](progress/session-s-moon.md) | D163–D174 — Phase 7, the moon: authored radii that were not the drawn radii for three separate reasons, an optional layer contradicting the body's own temperature on 89% of seeds, a second temperature declared rather than detected, a frosting spec that had to become per-surface with its own RNG stream, an upward deposit whose sign changes were mostly not in the radii, and an accreted ice that never drew because two sites asked "does this layer carry terrain" two different ways (Session S) |
| [session-o-star-body.md](progress/session-o-star-body.md) | D129–D139 — Phase 6 polish doc 1, the star's own body: a limb-darkening curve that belongs to the sphere and not the layer, a wobble and a tidal bulge that turned out to be one mechanism, an amplitude that was right while the frequency was wrong, a clip fixed against the frame after being too tight three times, and an authored alpha that is not the drawn alpha either (Session O) |

Decision numbers (`D#`) are referenced from code comments and other docs —
if you're looking for a specific one, `grep -rn "D42"` across `docs/progress/`
will find it faster than opening each file.
