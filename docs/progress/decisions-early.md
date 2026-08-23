# Decisions D1–D28 — Phases 0–4 foundations

*Moved out of PROGRESS.md to keep that file small. These are the original
numbered decisions from Sessions A–C, covering structure, colour, terrain,
frosting and zones. D29 onward live in the per-session files in this
directory, alongside the narrative that produced them.*

---

## Decisions

Numbered so other docs and commit messages can cite them. These are settled;
reopen only with a reason.

### D1 · Layer presence is one property with three forms

**Decided:** Session A. **Where:** `js/gen/structure.js` → `resolvePresence`.

A layer declares its presence in one of three ways, all resolved by a single
function:

| Form | Declaration | Meaning |
|---|---|---|
| Unconditional | *(omit `presence`)* | always present |
| Probability | `presence: 0.8` | 80% roll, scaled by the Optional layers slider |
| Parameter | `presence: {param, above, fade}` | present only above a threshold, faded in |

**Why it matters:** Ocean depth and Interior heat are only the first two users.
Cohesion, Operational status and Hull integrity all want the same mechanism. If
presence had been a fixed per-archetype roll with Ocean depth patched in
afterwards, every later parameter would have become a special case in the stack
builder. As it stands they are data edits.

Thickness follows the same pattern: rolled `[min,max]`, parameter-driven
`{param, over, depth}`, or nudged by a named control via `bias` / `modulate`.

### D2 · Layers may be positioned relative to another layer

**Decided:** Session A. **Where:** `js/gen/structure.js` → pass 1b.

`frac: {param, over: "crust", depth: [...]}` places a layer *on top of* another
rather than at an absolute radius. `over: "surface"` is a reserved name meaning
"whatever the outermost non-outward layer turned out to be".

**Why:** authored absolutely, an unlucky crust roll put the ocean *below* the
crust, and the monotonic clamp then shoved the interior around — Ocean depth
was restructuring the core. An ocean floats on whatever crust exists; that is a
relationship, not a coordinate. The atmosphere uses the same mechanism, which is
how it sits on rock for a desert world and on water for an ocean world without
either being a special case.

### D3 · The surface is renormalized to exactly 1.0

**Decided:** Session A. **Where:** `js/gen/structure.js`, end of `build`.

Adding an ocean on top of the crust pushes the outermost solid layer past 1.0.
The whole stack is rescaled so the surface is always exactly 1.0.

**Why:** without it an ocean world renders fractionally larger than a desert one
at identical settings. Everything downstream — stats, scale bar, every detail
element — can rely on "1.0 means the surface".

### D4 · The `solid-bodies.md` frac table was reinterpreted

**Decided:** Session A. **Affects:** `docs/celestials/solid-bodies.md`.

The spec table gives crust 0.93–0.97 and mantle 0.42–0.72. Read literally as
outer radii those leave ~25% of the radius unassigned, which the crust
swallowed — early renders had a crust a third of the body deep.

**Read as:** the 0.42–0.72 figure is the **core-mantle boundary**, i.e. the
mantle's floor, which is the outer core's outer radius. The mantle's own outer
edge sits just beneath the crust. That matches the prose ("thin rigid shell",
"the bulk").

✅ `docs/celestials/solid-bodies.md` has been corrected, with a note recording
the old reading. The **moon** and **asteroid** tables in that file have *not*
been revisited — check them against D4 and D5 before authoring those stacks.

### D5 · Proportions are stylized, not physical

**Decided:** Session A, at the user's direction. **Where:** `js/data/archetypes.js`.

Target is **textbook-diagram** proportions — roughly:

| Layer | Share of radius |
|---|---|
| atmosphere | ~11% |
| ocean | ~6% (up to ~12% at max depth) |
| crust | ~7% (thins to ~5% under a deep ocean) |
| mantle | ~40% — still visibly the bulk |
| outer core | ~18% |
| core | ~29% |

**Why:** physically the crust is ~0.5% of the radius and the atmosphere is a
hairline. Drawn honestly they are invisible slivers with nowhere to put the
traits, cities, ice caps and ocean detail that are the point of a cutaway. This
is "believable beats accurate" applied to geometry — a school science poster,
not a measurement. The mantle stays dominant so the picture stays plausible.

**Consequence for stats:** stats must be derived from these radii, so the
numbers agree with the picture. Never quote a real-Earth crust depth against a
drawn crust this thick.

### D6 · Colour placeholder is deliberately drab

**Decided:** Session A. **Where:** `js/draw/scene.js` → `FLAT`.

The Phase 1 palette is flat and dull on purpose, so nobody mistakes it for the
Phase 2 colour work. Phase 2 replaces it wholesale.

### D7 · The ocean is global; land is drawn over it

**Decided:** Session A. **Lands in:** Phase 3 (land), Phase 4 (zones).

The ocean stays a **full concentric band**. Continents are a *surface cover*
drawn on top of it — crust-coloured caps with coastlines — not a partial ocean
band.

**Why:** tidal locking, ice caps and continents all want to say "what covers the
water at this angle". If the ocean itself were partial, each of those would
compete for the same angular space and every combination would need
hand-resolution. As a cover over a global band they all read from one
`zoneAt(angle, depth)`.

- **Phase 3** ✅ — but **not** the way this decision anticipated. D15 replaced
  "land masses as a surface cover" with a terrain height field: land is where
  the terrain crosses the sea's flat top, so **coastlines are never drawn**,
  and there are no "crust-coloured caps". The conclusion D7 reached — a global
  ocean band with land resolved above it — held; the mechanism is better than
  what it imagined. The `film` surface role (D18) is the closest thing to the
  "cover" this decision described, and it sits on the terrain rather than
  replacing it.
- **Phase 4** — zones make the cover angle-aware; tidal locking, ice caps and
  continents share one mechanism. Terrain is already a pure function of angle,
  so zones modulate it without restructuring.

Nothing in Phases 0–2 needed to change to allow this.

### D8 · One scrollbar, on the panel

**Decided:** Session A, after user feedback. **Where:** `style.css`.

Accordion sections expand to full height and do **not** scroll internally.

**Why:** nested scroll areas steal the wheel from the panel's scrollbar, so
scrolling past an open section stalled.

✅ `docs/ARCHITECTURE.md` and `docs/PARAMETERS.md` have both been corrected.

### D10 · Some layers have a material hue of their own

**Decided:** Session A. **Where:** `js/data/archetypes.js` → `colorProfile`,
`js/gen/palette.js`.

A layer may declare `hue: [min, max]` plus `hueLean` (how far it drifts toward
the body's primary hue). Layers without one derive their hue from the
primary→secondary anchors by depth, as before.

**Why:** deriving *every* layer's hue from the anchors made the ocean brown on
a rust-coloured world and made every body read as a pastel bullseye rather than
rock over metal. Some materials keep their colour whatever the rest of the body
is made of — water is blue-green everywhere, molten metal glows orange. Giving
those layers an absolute hue that only *leans* toward the primary was the single
change that made these read as planets.

Currently used by `ocean` (186–232°), `outer-core` and `core` (14–55°).

### D11 · Two colour guardrails, enforced by tests

**Decided:** Session A, after looking at a contact sheet. **Where:**
`js/gen/palette.js`; asserted in `test/sweep.mjs`.

1. **No fluorescent corner.** Saturation is capped by how bright a layer
   already is, so high-saturation-at-high-value can't occur. That combination
   gives pure spectral hue and reads as a glowing plastic bead, not hot metal.
   Luminous layers (stars) are exempt — for them, glowing *is* the material.

2. **Adjacent bands must be distinguishable.** After derivation, adjacent
   layers whose hue, saturation *and* value are all close have the inner one
   darkened until it separates. Crust and mantle were the pair that collided,
   since their authored value ranges overlap.

Both are asserted in the sweep rather than left as advice, because both were
real defects visible in the first colour pass and neither is obvious from
reading the code.

### D12 · Adding or removing a layer must not recolour the others

**Decided:** Session A, after user feedback. **Where:** `js/gen/palette.js`.

Two separate causes, both fixed:

1. **Per-layer RNG streams.** The palette loop drew from one stream in layer
   order, so inserting a layer shifted every draw below it — turning the
   atmosphere on recoloured the mantle and core. Each layer now draws from its
   own stream keyed by role, the same rule the structure stage already
   followed.

2. **Colour depth comes from the DECLARED stack order, not measured radius.**
   A layer's geometric position legitimately moves when a neighbour changes
   thickness (a deepening ocean drowns the crust; the stack renormalizes so
   the surface stays at 1.0). Colour riding that meant Ocean depth quietly
   recoloured the interior. `colorProfile.order` lists the roles
   surface-to-centre and colour is derived from position in that list.

**Why it matters:** an atmosphere appearing cannot change what the core is
made of. Both bugs are invisible from reading the code and neither shows up in
a single render — they only appear when you toggle a control and watch. Now
asserted in the sweep for the atmosphere, the ocean and the outer core.

> Any new archetype **must** declare `colorProfile.order` listing every role in
> `layers`, outermost first. Without it, colour falls back to measured radius
> and this bug returns.

### D13 · Self-lit layers are exempt from the reflective colour rules

**Decided:** Session A, after user feedback. **Where:** `js/data/archetypes.js`
(`incandescent: true`), `js/gen/palette.js`, `js/draw/scene.js`.

The D11 saturation ceiling — which keeps colours off the fluorescent corner —
was making hot cores look dull. It is the right rule for *reflective*
materials, where real surfaces desaturate as they brighten, and the wrong rule
for *emissive* ones, where a molten core is supposed to be saturated and
bright.

Layers marked `incandescent` (currently `outer-core` and `core`):

- keep a much looser saturation ceiling
- get a genuine push toward the top of their saturation *and* value ranges as
  Interior heat rises, rather than merely avoiding a cold world's decay
- are shaded **brightening inward** in `bandFill`, since they glow from within,
  where reflective layers are shaded darkening inward

The same flag will apply to stellar photospheres and accretion discs later.
The sweep's fluorescence check knows about the exemption and holds emissive
layers to a looser bound rather than skipping them.

### D14 · The specs are the authority, and a test keeps them honest

**Decided:** Session A, at the user's prompting. **Where:** all of `docs/`,
plus `test/doccheck.mjs`.

Decisions D1–D13 were originally recorded only here, with the Phase 3 prompt
telling the next session to trust PROGRESS.md over the older specs. That is a
workaround for documents that disagree. The specs have instead been **corrected
to match the code**:

| Doc | What was reconciled |
|---|---|
| `ARCHITECTURE.md` | Presence and thickness forms; stylized proportions; the four colour rules; layer independence; the real file layout; how to judge visual work; a build-decisions table |
| `PARAMETERS.md` | Colour controls marked shipped vs. planned; defaults table rebuilt against the actual controls; note that material hues don't answer to Primary hue |
| `ROADMAP.md` | Phases 0–2 marked done; Phase 3 given the continents item and the two Session A carry-overs |
| `ARCHETYPE-TEMPLATE.md` | Presence/frac forms; `order` and `incandescent` as required fields; checklist split by area with the invariants that bit us |
| `celestials/solid-bodies.md` | Colour profile table synced to the shipped values |

**Division of labour from here:** the spec states the rule; PROGRESS.md records
*why* it exists and what broke without it. Neither repeats the other.

`test/doccheck.mjs` enforces the mechanically checkable parts — documented
colour values against the code, `colorProfile.order` completeness, frac ranges
composing at every combination of extremes, and every script in `index.html`
existing with no ES module syntax. It runs in `npm test`.

**Why bother:** the spec set is the design authority, so it is worth something
only while it matches what ships. Three separate drifts in Session A each cost
real time, because the natural move is to trust the doc. Prose can't be tested,
but numbers and required fields can, and those are exactly what drifts
unnoticed.

### D15 · Terrain is a generic angular field, built for every family at once

**Decided:** Session B, before writing Phase 3. **Where:** `js/gen/terrain.js`
(planned), `relief` on layers in `js/data/archetypes.js`.

Terrain is **not** a crust feature. It is a generic **angular field generator** —
`h(θ)`, built from three octave bands with authored amplitudes, plus optional
impact craters — that any layer may attach to via a `relief` declaration. What
the field *means* is the consumer's business:

| Consumer | Field displaces | Reads as |
|---|---|---|
| Planet crust | top of the crust band | continents, ranges, trenches |
| Moon crust | same; low band 1, heavy craters | flat cratered plains |
| Star photosphere | the layer boundary, tight and fast | granulation, a churning fire edge |
| Gas / ice giant | the buried solid core's top | a rocky floor under the envelope |
| Ice-shelled moon | the ice shell's underside | the roof of a subsurface ocean |

Same generator, different amplitudes and octave counts — **a data table per
archetype, not new code.**

**Three consequences that shaped the design:**

1. **Relief is a layer property, so it composes with wobble.** Boundary wobble
   is already periodic angular noise (`CC.RNG.makeAngularNoise`); relief is the
   same kind of thing at a different scale. They multiply in `draw/layers.js`
   with no second code path.

2. **"Sea level" generalises to any crossing.** Whatever floats on top — water,
   magma, a gas envelope — is a layer whose inner edge cuts across the field
   below it. Coastlines, a magma sea drowning terrain, and a rocky core poking
   into a gas giant's envelope are one mechanism producing three pictures. The
   coastline is never drawn; it is **where the two curves cross**. This is the
   same shape as D2 (`over: "crust"`), which is a good sign it is the right
   abstraction.

3. **Terrain is a function of angle, so zones can modulate it later.** Phase 4's
   `zoneAt(angle, depth)` multiplies into the field without restructuring —
   tidal locking and ice caps become amplitude and sea-level modulations rather
   than new terrain code.

**Scope decision:** build the seam generically now, **wire only the planet in
Phase 3.** Stars and giants get their amplitudes when their archetypes land in
Phases 5–7. Building the seam now costs nothing; retrofitting it later means
touching every boundary.

**Erosion** is a smoothing kernel over the height array, weighted by atmosphere
thickness — a thick-atmosphere world gets rounded terrain, an airless one keeps
sharp ridges. Roughly six lines, and it makes the atmosphere structural rather
than only a coloured halo.

**Deliberately not built:** trenches, ravines and mesas as named feature types.
Those are what the noise already produces given the right amplitude and octave
mix — a deep narrow trough between two highs *is* a trench. If terrain reads as
bland noise rather than as landforms, the fix is a power curve on the height
field (which flattens plains and steepens slopes), **not** new feature types.

**The silhouette carries terrain, damped.** Relief displaces every boundary
including the outermost, at 55% amplitude there — see D17, which reverses an
earlier and stricter reading of the perfect-circle rule. The rule that rule was
protecting against is v2's *boundary wobble*, not terrain.

### D15 addendum — what implementation forced

Three things were not obvious from the design and are load-bearing:

**1. Fluid layers over relief must be drawn AFTER the solid beneath them.**
Layers normally paint outermost-first as full discs, each covering the middle
of the one above. That is right for concentric bands but it *buries terrain* —
the crust's displaced disc paints straight over the ocean, so the sea survives
only as a ring outside the crust's highest peak and no coastline can ever
appear. `draw/scene.js` defers any layer whose inner neighbour carries relief
and draws it last, clipped between its own flat top and the displaced floor.
The test is `details.terrain[below.role]`, never a role name, so a magma sea or
a gas envelope over a rocky core behaves identically.

**2. The structure stage must reserve room for peaks.** The stack renormalizes
the surface to exactly 1.0 (D3). With relief unknown to that stage, every peak
was scaled to sit *just under* the sea's flat top — at ocean 25% the highest
peak reached 0.9994 against a sea at 1.0, missing by half a thousandth. Terrain
could never break the surface by construction. Layers therefore declare
`relief: <height>` in the archetype, and `gen/structure.js` counts a **buried**
layer's peaks toward the surface.

**3. The body's TRUE outermost point is what normalizes to 1.0**, and that
point is a terrain peak whenever relief rises through the layer above. The
sweep asserts this rather than "the outermost layer is at 1.0", since on a
world with islands the sea's flat top legitimately sits below the peaks that
break it. Relief is rescaled alongside the radii during renormalization, and
`gen/details.js` reads its amplitude from `layer.relief` rather than the recipe
so the two can never disagree.

**Ocean depth is a sea level swept across the terrain.** Its range must run
from below the peaks to well above them, or the slider spends most of its
travel on a drowned world. A dry world is Ocean depth 0 — presence removes the
layer — rather than a negative thickness, because the monotonic ordering clamp
requires the ocean to sit above its host.

**MIN_THICKNESS was the real reason coastlines were rare.** Even after the
range was widened, land never exceeded ~22% at *any* slider position and
everything past 35% was fully drowned. Three separate mechanisms conspired:

1. The ordering clamp forced a `MIN_THICKNESS` gap between the ocean and the
   crust, pushing the *crust* down rather than letting sea level sit low — so
   the sea could never reach the terrain mean. Layers that carry relief may
   now rise to meet the layer above (`gap = layer.relief ? 0 : MIN_THICKNESS`);
   their peaks then break through it, which is what an island is.
2. The sliver test measured a sea's thickness at the terrain **mean**, where a
   shallow sea legitimately has almost none because its water is in the
   basins. It now adds `host.relief * 0.5`, so depth is judged against the
   terrain floor.
3. A linear parameter response spent two thirds of the slider on worlds that
   were already drowned. `frac` gained an optional **`curve`**, and the ocean
   declares `curve: 2.1` to give the shallow end most of the travel.

Fixed, the sweep runs 49% land at low Ocean depth → 33% (Earth-like) → 18%
(archipelago) → 0% (waterworld), which is the full range the parameter was
meant to express.

**Then the ceiling was wrong in the other direction.** With the range running
to 0.150, the deepest sea was **1.31× the thickness of the crust beneath it** —
a Hycean water-world, not a terrestrial planet. Drowning every peak is all the
depth this archetype needs, so the top is capped at **0.062**, which lands the
deepest sea near 0.45× the crust.

**And the low end still popped.** The ocean drained to a hairline and then
vanished at ~2%, a visible step. Two coupled fixes: the presence threshold
dropped to 0.004 with a longer fade, and the deferred pass now multiplies the
sea's fill by `layer.strength` — which `resolvePresence` was already computing
and only the atmosphere was using. The last of the water now evaporates instead
of switching off.

**An outward layer's details must ride its falloff curve.** The atmosphere's
band fill fades toward its outer edge, but its haze and stipple were drawn at
flat alpha, so at high Element opacity the layer read as a solid shell with a
hard rim. `CC.Layers.falloffAlpha` is now exported and `drawLayer` takes a
`fade` range. Speckle batching groups by depth band as well as tier there,
since one averaged alpha across the whole atmosphere reinstates the same rim.

**The atmosphere is drawn with a `screen` composite and limb brightening.**
Even with the falloff fixed it could still blend into the ocean beneath it.
Measurement showed the cause was *not* colour collision — only 1 body in 239
had the atmosphere close to its surface layer in hue and value — so a palette
guardrail would have been the wrong fix. Two real causes:

- Every one of the 15 gradient stops used the **same flat hex**, with only
  alpha varying. Real atmospheric scattering brightens toward the limb, where
  you look through more gas. `outwardStyle` now takes the palette entry rather
  than a hex and lightens/desaturates with height.
- Source-over compositing means the layer **covers** what is behind it. A gas
  shell scatters light instead, so it is drawn with `globalCompositeOperation
  = "screen"` and can only ever add light — it cannot read as an opaque band
  however far the opacity controls are pushed. Peak alpha rose from 0.62 to
  0.82 to compensate for what screening costs against a dark background.

`screen` was chosen over `lighter` (additive), which blows out to white where
the layer crosses a bright surface and loses the atmosphere's hue exactly where
it is thickest. This is the first use of a blend mode anywhere in `js/`; it is
scoped by the existing `save()`/`restore()` pairs, which reset it.

### D16 · A cooling core freezes inward; it does not vanish

**Decided:** Session B, at the user's direction. **Where:**
`js/data/archetypes.js` (`outer-core`, `core`). **Supersedes** the Phase 1
presence rule for `outer-core`.

The outer core used to be removed below ~12% Interior heat. Dragging the slider
down made the whole metal region jump smaller, and the transition popped.

It now behaves the way a real cooling planet does: **the liquid outer core
freezes onto the solid inner core.** The metal region's outer edge barely
moves; what changes is how much of it is still liquid. `core` carries
`modulate: {interiorHeat, -0.17}`, so as heat falls the solid core grows
outward into the liquid shell above it. Earth's inner core is doing this now.

| Interior heat | Liquid shell | Shell as % of metal region |
|---|---|---|
| 1.0 | 0.265 | 52% |
| 0.5 | 0.163 | 32% |
| 0.0 | 0.065 | 13% |

**A thin shell always survives** (the user's call), so every body's core reads
as two-tone rather than as one flat disc.

**The direction was wrong on the first attempt.** With a strong modulate
(−0.17) over a low base range, the *solid* core visibly shrank as heat rose —
the picture said "the solid core is melting away" rather than "the liquid shell
is freezing", and at heat 0 the shell was still 26% of the metal region, which
does not read as nearly-frozen. Since solid metal is the thing that persists,
it is the part that should hold still: the core's base range now sits just
under the outer core's floor with a modest modulate, and the **shell** is what
changes. The outer core's floor was raised to 0.435 at the same time, because
the gap between the two authored ranges put a hard floor under how thin the
shell could ever get.

**`modulate` multiplies its amount by the parameter**, so the base `frac` range
is the value at parameter **zero** — here, the cold value. Getting that
backwards is what produced the inverted first attempt.

**Why it is better as well as more accurate:** a dead world now shows a big
solid metal heart with a sliver of liquid clinging to it, which is a more
interesting picture than simply having less core. It also removes a
discontinuity from a slider that is otherwise smooth.

Both the sweep and the domtest previously asserted the *old* behaviour. They
now assert the new contract: the outer core is never removed, and the liquid
shell stays thicker than 0.008.

### D17 · Terrain MAY shape the silhouette — damped, not suppressed

**Decided:** Session B, at the user's correction. **Where:**
`js/draw/scene.js` (`SILHOUETTE_RELIEF`), `js/draw/layers.js` (`reliefFn`
gained a scale argument).

Terrain displaces **every** layer boundary, including the outermost. On the
silhouette layer its amplitude is multiplied by **0.55** rather than removed.

**This reverses the original D17, which was wrong, and wrong for a reason worth
recording.** The first version suppressed relief on the outermost layer
entirely, citing a rule "stated in CLAUDE.md, ARCHITECTURE.md *and*
solid-bodies.md".

**CLAUDE.md never contained that rule.** The citation was invented — asserted
without being checked, then used as the justification for a decision. Two docs
do state it, and both blame *wobble* explicitly: ARCHITECTURE.md's wording is
"wobbling it makes it look like a potato", and PARAMETERS.md records v2's
global wobble control being cut for being over-stylized. The rule was written
against **v1/v2's crude boundary wobble**, which made cartoon potatoes. v3's
terrain is a different mechanism sitting on a properly circular crust, and it
is what makes the output believable rather than what threatens it.

**The visible cost of the mistake:** on an airless, oceanless world the crust
*is* the outermost layer, so its terrain was suppressed and the body rendered
as a flat disc with shading painted on. Worse, it looked like a bug — dragging
Ocean depth below ~2% made the terrain appear to vanish, when in fact
`crust.relief` was unchanged and only the drawing had stopped.

**Why damped rather than passed through at full strength:** the silhouette is
the one boundary read against empty space, where a given amplitude reads far
louder than it does between two filled bands. 0.55 is a tuning constant chosen
by eye, not a principle.

The structure stage still counts peaks toward the surface — the body's true
outermost point is what normalizes to 1.0 (D3), and that point is a peak
whenever terrain rises through the layer above.

> **The lesson worth keeping:** a rule inherited from a superseded version may
> have been aimed at a mechanism that no longer exists. Check what it was
> written against before treating it as binding — and never cite a document
> without opening it.

### D18 · The surface film — a "surface role", not a layer

**Decided:** Session B, at the user's request. **Where:**
`js/data/archetypes.js` (`colorProfile.layers.film`), `js/gen/details.js`
(a second terrain field per layer), `js/gen/palette.js`, `js/draw/scene.js`
(`drawSurfaceFilm`).

A thin cover on exposed terrain — vegetation, regolith, mineral staining, dust.
It exists because the ground was otherwise bare rock right up to the waterline,
which reads as geology rather than as a place worth visiting.

**It is a new *category*: a surface role.** Marked `surface: true`, it has a
colour profile but no radius, and is deliberately absent from
`colorProfile.order` — `order` encodes depth and a film has none.
`test/doccheck.mjs` understands the flag, so the "order must list every role"
check stays strict for real layers.

**Character comes from existing parameters, not a new control.** Interior heat
and Ocean depth combine into an aridity figure that rotates the hue out of
green, through olive and ochre, into rust, draining saturation as it goes. A
cool wet world gets living ground cover; a hot dry one gets scorched mineral
crust. Every solid body gets a film — only its character varies.

**Three mechanisms keep it from reading as a painted ring:**

1. **Masked to land** by the same two-curve construction that produces the
   coastline, used in complement. It stops at the shoreline without anything
   computing where the shoreline is.
2. **Alpha rides an independent noise field**, keyed separately from the
   terrain, so the patches are unrelated to the landforms. A film that peaked
   where the mountains are would read as snow-capping.
3. **It must separate from the ground it covers.** Its own material hue (D10)
   is not sufficient: when the body's primary lands near the film's range the
   two converge and the cover disappears. A guardrail lifts its value when it
   collides with the surface layer — D11's adjacency rule applied to a
   pseudo-role.

**Two bugs worth remembering, both of which made a correctly-drawn film
invisible:**

- **`ctx.arc()` after an existing subpath joins to it with a straight line**,
  turning an even-odd clip into a bowtie that silently drops everything inside
  it. `traceBoundary` now emits a `moveTo` first. This is a general canvas
  hazard, not specific to the film.
- **It was sized against `terrain.amplitude`**, which is a few thousandths of
  the body radius — sub-pixel, and invisible even at full opacity. A surface
  cover is sized against the **layer** it sits on, like a topsoil band in a
  soil profile. (The figure was 16% here; **D19 raised it to 42%** — 16% was
  still reading as a stain rather than as frosting.)

> **A band a few pixels wide is not judgeable at contact-sheet scale.** Three
> rounds were lost to "it isn't drawing" when it was drawing correctly the
> whole time. Sampling the actual pixels with `getImageData` settled it in one
> step; rendering at 1000px confirmed it. Reach for a pixel probe before
> theorising about draw order.

### D19 · The film becomes frosting — thicker, wider-gamut, bleeding into rock

**Decided:** Session C, at the user's request (open question 5). **Where:**
`js/gen/palette.js`, `js/draw/scene.js` (`drawFilmBand`),
`js/data/archetypes.js`, `test/film.mjs` (new).

D18 shipped the film as a *thin* cover and it read as faint or absent on most
worlds. Four causes, only three of which had been suspected:

- **THE HOST COMPARISON WAS WRONG — the one nobody guessed.** The rule that
  keeps the film from vanishing into its background looked up "the outermost
  non-outward layer", which on any world with a sea is the **ocean** — a layer
  the film never touches. So on every ocean world the separation rule was
  defending against the wrong colour, and the film was free to come out the
  same value as the rock it actually sat on. Measured over 24 seeds, **nine
  films were darker than their own crust.** The host is now found with the same
  test the renderer uses: the outermost layer that carries a terrain field.
- **Aridity was constant across every seed.** It was built only from Interior
  heat and Ocean depth, both of which are *global settings* — so a whole
  contact sheet came out at `arid` 0.66 and the "climate rotates the hue"
  mechanism degenerated into one fixed offset applied to every world. Since the
  rotation is backwards out of green, this meant **no body was ever green.** A
  centred per-body roll (±0.35) now varies it; the sliders still set the
  climate and the body only moves it within that.
- **The gamut was too narrow**, 70–145° — now 60–190°, reaching blue-green at
  the cold/wet end, plus `hueWild`: 14% of bodies roll anywhere on the wheel
  and skip both the aridity rotation and the lean toward the body's primary.
  Ground cover is not only chlorophyll; salt, sulphur, ash and algal blooms are
  all plausible and all differently coloured.
- **It was too thin and too clean.** Now 42% of the layer's thickness (was
  16%), peak alpha 0.95 (was 0.72), and the inner edge carries a two-frequency
  wobble driven by the mask field it already had, plus sparse deep "roots"
  where both frequencies peak together. It reads as soil weathering out of the
  rock rather than as a drawn stratum.

**A gentle shore bias was added, and deliberately kept gentle.** The mask is
independent of the terrain by design (cover peaking on mountains reads as
snowcaps), but full independence meant that on seeds where the sea sits near
the crust's mean surface, all the exposed land could land on the mask's weak
side and the world rendered bare. Elevation above the waterline now only
*adds* cover, and only well clear of the shore, so the blotchy shape still
comes from the mask and the film never traces the topography.

**Value is lifted over dark rock and capped at 0.80.** The lift is larger the
darker the host — the eye judges a ratio down there, not a difference — and the
cap stops the lift pushing a film over a pale crust up past 0.90, where it
stops reading as ground cover and starts reading as snow or a lit rim.

> **`test/film.mjs` is the tool for this feature.** It reports the film's
> colour against its true host and its mean cover **on land only**, and renders
> both rim crops and whole discs. Both views are needed: a crop shows thickness
> and edge, but the film is masked to land, and a crop can easily land on an
> arc that has none — which cost a round of chasing a seed that turned out to
> be drawing more film than the one it was being compared against. D18's rule
> still stands, with a corollary: **judge a seed from the whole disc, and settle
> "is it drawing" with a pixel probe, never by eye on one crop.**

### D20 · Frosting is DEPOSITION, in four elevation zones

**Decided:** Session C, at the user's direction, after D19's version was judged
to be the wrong system rather than a badly tuned one. **Where:**
`js/draw/film.js` (rewritten), `js/gen/palette.js` (`resolveFrosting`),
`js/data/archetypes.js`, `js/draw/scene.js`, `test/film.mjs`.

**D19 built a stratum; the user asked for frosting.** The old band had a
constant radial thickness hugging the terrain, so its top surface was a copy of
the rock's profile — "painting the side of the mountain". Cream on a cake pools
in the dip and slides off the peak, and no thickness value reaches that from a
band that is parallel to the ground by construction. **The fix was geometric,
not a tuning pass**, which is the lesson worth keeping: when something looks
wrong at every setting, check whether the shape is wrong before turning knobs.

**The model.** `depositTop()` samples the terrain at the angle and to each side
and pulls the frosting's top toward the LOCAL MEAN. Hollows fill and come out
nearly flat; ridges shed and let rock through. One relationship, and it never
asks "is this a hollow".

**Four zones from one height field and the sea level** — peak, land, shallow,
deep. Each carries its own colour *and* its own deposition character (`depth`,
`smooth`, `bleed`, `patch`, `grain`), so snow lies smooth and even, vegetation
is patchy and draped, reefs are lumpy, abyssal ooze is thick and featureless.
That is a biome system's look without its machinery. Weights are four
overlapping ramps that always sum to 1, never a branch, so boundaries are
gradients — and so Phase 4's `zoneAt(angle, depth)` can multiply into
`zoneWeights` with **no new drawing code**. Tidal locking becomes "the peak zone
reaches further down at one end".

**Frosting is no longer masked to land.** The sea floor gets reefs and ooze as
the hills get moss; the sea is drawn over it and tints it, which is correct.

**Hue is now essentially free** (the user's call): one base hue anywhere on the
wheel, four authored offsets scaled by a per-body `spread`. What is constrained
is **contrast against the rock**, which is a relationship rather than a colour —
so orange grass on a brown world is fine and nothing ever loses its cover to the
background.

Three colour traps, all found by measurement and all worth remembering:

- **Lifting each zone independently flattens the family.** Every zone under the
  threshold gets pushed to the same floor: 25 of 60 bodies ended with all four
  zones inside 0.10 of each other. Lift the family as a unit instead.
- **Letting the underwater zones set the floor drags everything up.** They are
  the darkest members and are seen through water anyway; with them leading,
  50% of all zone colours pinned against the ceiling. Only the dry zones set it.
- **Clamping at the ceiling flattens it again, and so does squeezing.** Sliding
  the whole set down preserves every gap exactly. Snow is exempt from leading
  the slide — it is *supposed* to be near-white, and letting it lead pushed 22
  dry zones under their own rock.

Final: 9% pinned (was 50%), mean within-body value spread 0.353 (was 0.134),
peak > land > deep ordering on 60/60 bodies, no zone failing contrast.

> **Judge a seed from the whole disc.** D18's "not at contact-sheet scale" rule
> gained a corollary here: a single rim crop shows whichever zone happens to sit
> at that angle, and a round was lost to a crop that landed on bare arc while
> the body was frosted elsewhere. `test/film.mjs` renders both, and reports the
> zone split so "is one zone eating the world" is a number.

### D22 · Frosting is a generic surface stage; zones become archetype data

**Decided:** Session C, with the user, immediately after D20. **Where:** the
contract below; the refactor lands when the second consumer does.

D20 built the frosting against the planet, but the *mechanism* is generic and
the intention is that every family with a terrain field can use it. This records
what is already portable, what is planet-shaped and must move, and what each
family is expected to want — so the second consumer is a data edit, exactly as
D15 promised for terrain itself.

**Already generic — do not add role names to any of it.** `draw/film.js` names
no roles: it draws on any layer declaring `relief`, finds sea level from
whatever fluid floats on that layer, and falls back to the terrain mean when
there is none. The five character knobs (`depth`, `smooth`, `bleed`, `patch`,
`grain`) are deposition physics with nothing planetary in them, and the colour
stage keys off `snow` / `aquatic` flags in archetype data rather than roles.

**Planet-shaped, and must become data when the second family lands:**

| Now | Should be |
|---|---|
| `ZONES` table is a `var` in `draw/film.js` | declared in `colorProfile.layers.film.zones`, beside the colours it already pairs with |
| `SNOWLINE 0.42`, `SHELF -0.16` | per-archetype thresholds — these are Earth-ish numbers |
| four zones assumed | any count; a star or gas giant wants two or three |
| deposit always settles *outward* from the rock | a `direction` on the zone spec, for the ice moon's underside (see below) |

**What each family is expected to want.** Recorded so the work is scoped, not
so it is committed — each lands in its own phase.

- **Moon** (Phase 7) — the strongest case after the planet. Regolith *is*
  deposition: it pools in crater floors and is swept off rims, which is what
  `depositTop` already does. Two zones (rim / floor), high `smooth`, near-zero
  `patch`. **Colour: subtle mineral tint on grey, not literal grey.** An airless
  moon lands at the dry end of `arid`, which drains saturation for free — but
  note the contrast rule floors every zone at `host.s + 0.14`, so "desaturated"
  has a deliberate limit. That limit stays: a frosting matching its rock in both
  value and saturation is invisible, which is the D19 failure. Dull is authored
  by narrowing the ranges and the gaps *between zones*, not by removing the
  rule. Moon zones should also drop `snow` — a dead airless body has no weather
  to deposit it, and whitened caps would be wrong.
- **Ice-shelled moon** (Phase 7) — **uses terrain twice, facing itself.** The
  rock floor under the ocean takes an ordinary upward field with frosting
  settling into its trenches (brine pools); the ice shell's *underside* takes a
  second field with frosting depositing **upward** as accreted ice with
  coloured tips. Two frosted surfaces facing each other across a dark ocean is
  the best cutaway in the solid family and is what `solid-bodies.md` already
  claims for this branch. The upward case is the `direction: -1` row above —
  a mirrored deposit, a few sign changes rather than a rewrite, but real work
  that should not be discovered by surprise.
- **Gas / ice giant** (Phase 5) — sediment on the buried rocky floor, crushed
  under enormous pressure: high `smooth`, near-zero `patch`, thick and
  featureless. Mostly occluded by the envelope, so it is cheap and low-risk.
- **Asteroid** (Phase 7) — probably not. Its interior is the Voronoi mosaic and
  a dusting on a body that small competes with it. Revisit only if the mosaic
  turns out to need a frame.
- **Star** (Phase 6) — **no.** Granulation is convective churn; deposition is
  gravity pulling material into hollows, which is the wrong physics for a
  photosphere. The related idea of *loose heat plumes hovering over the
  surface* is worth keeping but wants outward-falloff machinery (closer to the
  atmosphere, or v2's flare ribbons), not this.
- **Machine worlds** (Phase 9) — default to **purely machine, no soil**; that
  is the stronger aesthetic position. The one legitimate use is not dirt but
  **deliberate terraforming**: an engineered biosphere on a manufactured
  substrate, which reads as different from a planet's soil precisely by being
  *too even and too clean-edged*. Expressible in the existing knobs — very high
  `smooth`, near-zero `patch`, low `bleed`, so it sits on the deck rather than
  weathering into it. An option, not a plan.

**Until then:** add no new planet assumptions to `draw/film.js` or
`gen/frosting.js`. Phase 4's tidal locking will want to bias `zoneWeights` by
angle, and that is the *same hook* a second archetype needs — if it is added as
a general multiplier rather than a planet special case, both are solved once.

### D21 · A sub-pixel sea is faded out, not drawn as a hairline

**Decided:** Session C, after the user spotted a stray line across the crust.
**Where:** `js/draw/scene.js`, the deferred-fluid pass.

The ocean's `strength` fade is keyed to the *parameter* and finishes at Ocean
depth 0.079 — but the sea does not reach even one rendered pixel of thickness
until around 0.2. In that window it was **fully opaque and thinner than a
pixel**, so it painted as a hard bright line lying across the crust, cutting
through terrain peaks that should have been dry land. It read as a stray drawn
line because at that size that is exactly what it is.

Opacity now also fades over the first ~1.5px of *rendered* thickness. The
renderer is the only stage that knows how many pixels a body-space thickness
became, so this can only live here. It is a function of apparent size, which
keeps it resolution-independent in the sense that matters: the same body at
preview and export scale each gets the treatment its own legibility needs. The
fluid's surface stroke carries the same factor — it is drawn after a `restore`
and was otherwise left at full opacity, which is the same artifact again.

**This was a pre-existing bug, unrelated to the frosting work.** Found by
elimination: disabling the frosting left the line, and disabling every
`strokeBoundary` call left it too, which ruled out both suspects and pointed at
the fill.

### D23 · Zones resolve in generation; `draw/` only ever asks for numbers

**Decided:** Session C. **Where:** `js/gen/zones.js`, `js/gen/details.js`
(`applyZones`), `js/draw/details.js` (`zoneShift`), `js/draw/film.js`
(`biasWeights`).

The rule as planned was "zones resolve in the generation stage". That is right
for elements — `gen/details.js` already assigns every element an angle, so
membership is resolved there and carried as a **colour delta** — but it cannot
be the whole rule, because the frosting walks its own 900 segments at draw time
and the layer band fill is painted per wedge. Those two genuinely have to ask.

**So the sharper rule is: `gen/zones.js` owns all zone logic, and `draw/` may
call it but contains none of it.** No zone ids, no arcs, no colour deltas, no
blend maths anywhere in `draw/` — it receives three numbers on an element, or
four multipliers keyed by the frosting's own zone names. That is exactly the
relationship `draw/primitives.js` already has with `data/elements.js`, and it
keeps `draw/` as free of zone logic as it is of role names.

**The element path carries a delta, never a zone id**, so a colour change
redraws the same cached geometry — the stage-caching contract holds.

**One consequence worth knowing:** `applyZones` needs to know roughly how dark
a layer is (see D24) but must not read the palette, or every hue nudge would
re-roll every element position. It uses the **midpoint of the archetype's
authored value range** instead — fixed per archetype, approximate, and enough,
because it only decides how much headroom to aim for. The band fill, which does
have the real colour, passes the exact value.

### D24 · A zone's colour delta is limited by the room the layer has

**Decided:** Session C, from a pixel probe. **Where:** `js/gen/zones.js`
(`shiftAt`).

The tidal-lock recipe asks the nightside for `val: −0.30`. A planet's crust
rolls around v=0.25, so the cold face came out at **v=0.06** — not a cold
hemisphere but a hole in the picture. The hot face has the same problem at the
top of the range on a bright layer.

This is the same trap `draw/details.js` documents for detail elements: **a step
authored as an absolute number is wrong on layers that have nowhere to go.**
The recipe still says "much darker"; how much darkness is available is a
property of the layer, so the delta is eased into the space that exists.

**Two ways this was got wrong first, both of which produced a hard edge in the
middle of the twilight band — and neither was visible in the probe that was
being used at the time:**

1. **Picking the headroom by the sign of the delta.** Headroom below when
   darkening, above when brightening — so the limit jumps the instant the
   delta crosses zero, which on any layer that is not mid-grey is a large
   jump. Fixed by blending the two rooms across the crossing.
2. **Applying the ease only above the limit.** `want` passed through untouched
   below `room` and switched to `room * (1 - exp(-want/room))` above it. Those
   two curves do not meet: at exactly `room` the value drops by 37% in one
   step. Measured at **0.41 per degree** where anything above 0.05 reads as a
   seam. The knee is now applied across the whole range — one expression, no
   threshold, continuous by construction.

> **The lesson:** a limiter added to fix one artifact introduced a worse one,
> and the probe in hand did not see it because it was calling the *unlimited*
> path. `test/sweep.mjs` now asserts the per-degree bound directly, which is
> what caught it. A smoothness requirement is a number; assert it.

### D25 · The zone hooks are general multipliers, exactly as D22 required

**Decided:** Session C. **Where:** `js/gen/terrain.js` (`ampAt`),
`js/draw/film.js` (`biasWeights`, `coverageOf`).

D22 said the hook a tidally-locked world needs is the hook a second archetype
needs, and that adding it as a general angle multiplier rather than a planet
special case keeps the later refactor a data edit. Both landed that way:

- **Terrain** takes `spec.ampAt`, a per-angle amplitude multiplier. Nothing in
  `draw/` changed — `draw/layers.js` already called `terrain.at()`. Measured
  contribution: exactly the 2.27× the recipe asks for.
- **Frosting** takes four multipliers into the existing `zoneWeights`, then
  renormalizes. D20 predicted "tidal locking becomes the peak zone reaching
  further down at one end", and that is literally the change: one number,
  `frostPeak: 5.5` on the cold zone.

**`range()` had to follow the multiplier too.** A zone that flattens one face
genuinely lowers that face's peaks, and sea level is placed against the range —
so a `range()` measured from the raw field would put the sea above the whole
dayside. It now samples through the same function `at()` uses.

**Normalizing the frosting weights throws away scale, so coverage is carried
separately.** The colour blend needs proportions, but "the dayside is scoured
bare" is a statement about quantity. Two values, not one.

### D26 · Four trait defects that made correct geometry invisible

**Decided:** Session C, all found with a pixel-difference probe rather than by
eye. **Where:** `js/gen/traitroll.js`, `js/gen/elemgen.js`, `js/draw/scene.js`.

Every trait generated the right number of elements in the right places, and
seven of ten were invisible or nearly so. The same shape as Phase 3's five
defects, and worth recording for the same reason — each is easy to reintroduce:

1. **The orbital band ran from 0 to the surface.** `anchor: "orbit"` got a
   synthetic layer whose band was *inside* the body, so `areaSpread` placed
   every debris chunk under the layers, which then painted over them. **294
   elements, zero changed pixels.** The band now runs from the surface
   outward, and orbital `depth` is read as body radii.

2. **The frame did not leave room for what the detail stage placed.**
   `body.extent` comes from the structure stage, which knows only about
   layers — so a debris belt drew entirely off-canvas. The scene now widens
   the extent from the placed elements. Fitting the *furthest* element shrank
   the planet to a dot, so it fits the **88th percentile**: a belt reads
   correctly and its few strays run to the edge, which is what a debris field
   looks like anyway.

3. **`mirror` reflected `angle → −angle`.** TRAIT-SYSTEM.md describes it as
   "across the vertical axis", whose obvious reading fails in exactly the case
   the field exists for: a cap pinned at 0° mirrors to −0°, so **both polar
   caps landed on the north pole** a few degrees apart. It is now `angle +
   180` — for an equatorial trait the same thing, for a polar one the
   difference between working and not.

4. **Surface traits were painted and then covered by the sea.** A cap anchors
   to the crust, but the ocean sits on the crust too and is drawn *last* (the
   deferred pass, so land reads as a crossing). Caps are now drawn at step 4
   of the scene order — "surface-attached", which exists for this — keyed on
   the element being a `wedge`, so `draw/` still names nothing. They are also
   clipped to the **displaced** silhouette, since a cap drawn to a perfect
   circle stuck out past the body wherever terrain dipped.

**Two sizing traps alongside them.** A `wedge`'s `arc` is the FULL span, so the
primitive's half-angle is half of it; and a wedge must not be scaled by its
tier's size multiplier, because at one tier `tierSplit` returns the *smallest*
class (0.14×) — which shrank a 46° polar cap to a 6° sliver. Tier sizes are for
fields of instances; a named single feature takes its extent as authored.

> **`test/_traitprobe.mjs`'s pixel-difference count is the tool for this.**
> "How many pixels does this trait change against an otherwise identical body"
> answers "is it visible" in one number, and it found all four of the above in
> a single run after an hour of looking at renders had found none of them.

### D27 · Tidal locking is an AXIS, not a trait — and the picture must emerge

**Decided:** Session C, at the user's direction, after reviewing the Phase 4
build. **Where:** `js/data/archetypes.js` (`axes.tidalLock`), `js/gen/zones.js`,
`js/gen/zonegeom.js`, `js/draw/film.js`. **Supersedes** the `tidally-locked`
and `ice-caps` traits, both deleted.

**Wrong by the project's own rule.** TRAIT-SYSTEM.md's third test asks "does
the layer stack differ, or only the values in it?" Tidal locking only ever
changed values, so it was an axis all along — like Ocean depth and Interior
heat. The spec listed it as a trait and the build followed the spec; the
document committed the violation its own test exists to catch.

**Wrong in mechanism, which mattered more.** The zone system was designed
before the terrain and frosting systems existed — those arrived mid-Phase-3 —
so it *described* tidal locking by painting an HSV tint over the layer bands.
That is why the review found the shading "uneven and arbitrary": a
hemisphere-shaped wash is a picture of the idea rather than a consequence of
it. Ice caps were bolted on separately as `wedge` traits, which is why they
clipped through the crust and fought the frosting they were sitting next to.

**The fix was to find the one number every downstream system already reads.**
`draw/film.js` computes `zoneWeights((h - level) / span)`, where `level` is sea
level — so making SEA LEVEL a function of angle moves the shoreline, the shelf
and the whole deposition model together. The ocean pinches to a "boiled off one
face, pooled on the other" oval, and the frosting follows it, with no new
drawing code. The zone recipe now declares five per-angle figures (`sea`,
`snow`, `relief`, `air`, `cover`) and every one of them is a delta or a
multiplier against what the body already rolled.

**Three things this got wrong on the way, all found by measurement:**

1. **The snowline was driven from sea level, and that inverted it.** Lowering
   the sea on the hot face makes terrain read as *high* ground, and high ground
   is where snow goes — so the baked dayside came out snowcapped. Where the
   water is and how cold it is are different facts; on a locked world the
   second is a property of which way the face points. `snow` is now its own
   field. **The zone-split probe reported the inversion clearly and an hour of
   looking at renders had not.**
2. **The probe replicated `zoneWeights` inline rather than calling it**, so it
   kept reporting the inverted split after the fix had landed — a probe that
   duplicates the logic it is testing agrees with itself and not with the
   renderer. `zoneWeights` is now exported for exactly this reason.
3. **The four frosting weights stopped nesting.** A snowline dragged below the
   waterline means snow can claim ground that is also under water, which the
   original `peak > land > shallow > deep` masking assumed impossible. Each
   lower zone is now masked by what snow has taken, not only by the zone
   directly above it — which is also physically right, since a frozen sea is
   ice at the surface whatever lies beneath.

**What was deleted:** the `tidally-locked` and `ice-caps` traits,
`paintZoneBand` and its whole per-wedge tint, `frostAt`, `TraitRoll.modifierIn`,
the "structural traits" checkbox and category, and `syncZoneControls`. The
rework is net-negative in lines, which is the strongest signal it was right.

> **The lesson worth keeping:** a mechanism built before its neighbours exist
> will describe the effect it wants rather than produce it. When two systems
> land in the wrong order, check whether the earlier one is now doing by hand
> what the later one does by construction.

### D28 · The ocean was five times thinner than the specs said

**Decided:** Session C, with the user, after the pinched ocean turned out to be
invisible. **Where:** `js/data/archetypes.js` — `crust.relief` 0.105 → 0.19,
ocean `frac` ceiling 0.062 → 0.105, `curve` 2.1 → 1.7.

ARCHITECTURE.md and D5 both specify an ocean at **~6% of the radius, up to
~12%**. It was drawing at **1.2% at mid-slider**, and only reached 6% at the
very top of the range where land was already fully drowned.

It had gone unnoticed for two phases because **a thin sea still produces
correct coastlines** — the crossing of two curves does not care how deep the
water is. It only failed once something had to be *visible inside* the water: a
pinched ocean, a frozen night face. A correct mechanism can hide a wrong
quantity indefinitely if nothing ever has to be seen through it.

**Raising the ocean's own range would not have fixed it.** Sea thickness at a
coastline is bounded by how deep the BASINS are, because the water surface has
to sit near the terrain mean for a coastline to exist at all — so a thicker sea
and real coastlines are the same requirement, and only deeper relief satisfies
both. Raising the ceiling alone just drowns the world sooner.

| Ocean depth | Sea (was) | Sea (now) | Land (was) | Land (now) |
|---|---|---|---|---|
| 0.35 | 0.7% | 1.8% | 38% | 34% |
| 0.50 | 1.6% | 3.3% | 23% | 20% |
| 0.80 | 4.2% | 7.5% | 3% | 3% |
| 1.00 | 6.7% | 10.9% | 0% | 0% |

Roughly double the sea at every setting, with the coastline range intact.

### D9 · UI theme is purple, with contrast targets

**Decided:** Session A, at the user's direction. **Where:** `style.css` `:root`.

Every ink colour meets WCAG AA (4.5:1) against its background; most reach AAA.
Ratios are documented in the `:root` comment. Base font 15px, section headers
13px, lock icons 28px.

