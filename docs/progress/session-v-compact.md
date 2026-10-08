# Session V — Phase 7's compact group: neutron star, pulsar, black hole

**D205–D216.** Three archetypes as one family (`compact`), built on the stellar machinery where it fit and on four new general mechanisms where it did not. **No archetype branch in `js/draw/`** — every new pass is opted into by declaration (`poles`, `beams`, `hole`, `frame`, `void`, `heatValue`, `glowCentre`), and a body that declares none renders exactly as before.

**No existing body changed.** All 27 renders of the previous archetypes hash identically to `3045346` (`test/_tmp/_u1regress.mjs` against a worktree of that commit). `npm test` passes (doccheck, including select↔registry agreement and per-branch stack composition; domtest, 130 controls).

Scratch tools: `test/_tmp/_vboot.mjs` (boot + per-archetype base settings, generalised from `_u2grid`), `_vgrid.mjs` (contact sheets), `_vprobe.mjs` / `_vcrop.mjs` (large and zoomed renders), `_vstack.mjs` (print built stacks), `_vcard.mjs` (print the card across settings), `_velig.mjs` (trait eligibility), `_vtr.mjs` (where a trait's elements land), `_vpresets.mjs` (all compact presets). The three black-hole prototypes are `_bhproto.mjs` and the Kerr interior prototype `_bhkerr.mjs`; renders are in `shots/v/`.

---

## The done-condition

> a black hole is the void — whatever that turns out to mean, it is not a dark circle with a ring drawn on it

Met, by the user's judgement of the prototypes and then of the app. What it turned out to mean: **everything round the hole is cut-open matter and inside there is none** (D213), the sky darkens toward it, the horizon is *truer* black than space (D209), and — at the user's question — what is inside depends on spin (D214). A dormant non-spinning hole is now nearly the whole frame black with the stars dimming into it.

> nothing in js/draw/ needed an archetype-specific branch

Held. `grep` for the three archetype ids or any compact role in `js/draw/` finds only comments.

---

## D205 — `ElemGen.registerBuilder`

`gen/elemgen.js` is 1,139 lines, so a new family's element builders now live in their own file and are found by kind through a registry, the way primitives already are (`CC.Primitives.register`). `ElemGen.scatter` exposes the shared area-correct scatter to them. The compact family's four builders are in `js/gen/compact.js`: `lattice`, `pasta` and `vortex-array` emit ONE element per band carrying the band's own edges (a lattice has no position of its own, only a spacing), and `dipole-loop` decorates the ordinary scatter.

## D206 — `poles`: the body's axis, resolved once

`poles: { tilt, twist, spin, field, lightCylinder }` on the archetype, resolved in the structure stage by `CC.Compact.poles` from named parameters, and stamped onto every layer element (`gen/details.js`) and every trait element (`gen/traitroll.js`) on the same loop that stamps `role` — D159's rule. The field lines, the beams, the accretion stream and the card's beam tilt all read the same resolved number, so they cannot disagree about where the axis points. Which way a tilt leans is rolled per body.

## D207 — beams, jets and the light cylinder are emitted light (light cylinder superseded by D217)

`beams: { halfWidth, length, strength, collimate, streaks, glints, knots }`, drawn by `CC.Emissive.drawAxial` — the emissive pass, for the reasons that pass exists: it is light, it composites additively, it fades rather than stops, it runs off the frame, and it is excluded from the extent sweep so a beam three radii long does not shrink the body. One mechanism for both: a pulsar's beam is a straight-sided cone (`collimate: 0`), a black hole's jet is pinched toward a cylinder (`0.86`) with shock knots. Each is nested wedges carrying their alpha along the axis, so the edge is soft and the core hot without a blur, and both ENDS fade to nothing (D156).

**The light cylinder is two vertical lines, not a circle.** The spec called it a perfect circle; it is a cylinder about the spin axis, and a cut through that axis meets it as two parallel lines. That is also the stronger mark: nothing else in the picture is straight and vertical.

## D208 — what is not a layer: `hole` and `frame`

`hole: { spin, accretion, disc, umbra }`, resolved by `CC.Compact.hole` with real Kerr geometry (spin mapped through a sine so the slider's travel lands where the picture changes; horizons; the static limit; the prograde ISCO from Bardeen, Press & Teukolsky) and drawn by `js/draw/hole.js` before the layers. Three things that are not rings round the centre: the **umbra** (the sky darkened toward the hole), the **ergosphere** (oblate, touching the horizon at the poles), and the **sliced disc**. The horizon is a layer painted after them, which is how the plunging streams vanish into it.

`frame` on an archetype scales how large the body is drawn in its own picture (`draw/scene.js`, one multiplier on `bodyFrac`). The black hole declares 0.30 — its disc reaches 6.5 horizon radii — and, after a render at the app's own default body size showed their fields and beams only in the corners, the neutron star 0.72 and the pulsar 0.66.

## D209 — palette: `void`, `heatValue`, `glowCentre`; layers drawn glow-only

- **`void: true` is true black.** Every value clamp in the palette floors at 0.03, which is LIGHTER than the default sky — a horizon paler than space is a black disc laid on the stars. A void keeps its hue and saturation (so faint marks in it carry the body's colour), is painted flat with no band shading, and is skipped by the adjacency separation pass, which would otherwise lighten it.
- **`heatValue: [cold, hot]`** — a layer whose lightness IS its heat. The existing heat rule is depth-weighted, right for a planet and wrong for a neutron star's crust, which barely moved; the spec's cooling crust is a whole step dimmer.
- **`glowCentre`** — a self-lit centre brightest in the middle. The default band shading is lit from outside and put a dark dimple at the heart of the white-hot core.
- **Glow-only bands** use the existing `opacity: 0` with a `soft-gradient` boundary, so only their elements show (the photon sphere, the inner horizon — see D213).
- `modulate` entries take an optional `curve`.

## D210 — the controls: three relabels and two sliders

| Control | How | Drives |
|---|---|---|
| **Field strength** | Star activity, relabelled (`dials`) — on a star it is already the magnetic violence axis | magnetosphere reach, loop count and twist, particle glints, beam strength; starquake frequency |
| **Surface heat** | Interior heat, relabelled | crust lightness (`heatValue`), the temperature on the card |
| **Beam tilt** | Axial tilt, relabelled, 0–100% → 15–60° (pulsar) | the magnetic axis: beams, field lines, accretion stream |
| **Spin rate** | new slider, wired like Caverns | vortex density in the superfluid; beam width and light cylinder (pulsar); the black hole's whole interior, ergosphere and disc inner edge |
| **Accretion rate** | new slider, wired like Caverns | disc presence, brightness, density, inner torus, jets |
| **Mass class** | Core size bias, relabelled (black hole) | horizon size and every derived stat; the picture is a diagram and does not rescale, which the tooltip and card say |

Both sliders: `index.html` row with tooltip and lock, `main.js` param and detail key, `CONTROL_SPECS`, Randomize over the full range, settings round-trip (generic). Like Cohesion and Caverns they are visible on every body and say which bodies they act on.

## D211 — the neutron star: a different KIND of mark per band

The family's story is extremity, so each band got a mark that appears nowhere else in the generator (D115's lesson paid in advance): **plasma-skin** a bright hairline; **iron-lattice** rows of nuclei in grains — ORDER, the only band drawn as a crystal; **nuclear-pasta** rows that grade with depth from dots (gnocchi) to dashes (spaghetti) to unbroken sheets (lasagna), which is the real phase sequence; **superfluid** straight vertical vortex lines parallel to the SPIN axis, spaced by Spin rate (vortex density goes as rotation rate), each ringed by small oblique circulation marks; **quark-core** the densest stipple in the project round a white-hot centre; **magnetosphere** closed dipole loops, r = L sin²θ about the tilted axis, sheared into an S by the twist. Roles are new names (not the spec's `atmosphere`/`outer-core`) because element tables are keyed by role across families.

Stacks printed before tuning (D122/D163): `frac` was re-cut to the thicknesses the spec meant — skin 0.017–0.021, lattice 0.060–0.075, pasta 0.11–0.17, superfluid ~0.5, core 0.18–0.34. Perfect circles throughout.

**One departure from the spec's colour table, on purpose:** the superfluid is held a step dimmer than crust and core. Four near-white bands in a row is a white disc, and the adjacency pass would have darkened the core — the one band that must stay white-hot.

## D212 — the cards are two mindsets, and three figures were wrong until checked

`compact` (neutron star, pulsar) asks **how much is in how little**: size against mass first, then density, gravity, spin, field, temperature, and on a pulsar the pulse and beam tilt (read from `body.poles`). `black-hole` asks about **distance and time**: horizon, point of no return, closest safe orbit (the ISCO that placed the disc), tides, spin, **Inside** (the interior actually built), disc temperature, jets. Both rate **Absolute** — the rating `hazard.js` had reserved for this family. Real physics where the honest number is the evocative one (D177).

Three claims were wrong on first writing and only checking the arithmetic caught them: a pen dropped on a neutron star does not land at half light speed (that is escape velocity, from infinity; from waist height it is ~6 million km/h, now computed); nine turns a second is SLOWER than a kitchen blender (the comparison ladder is now checked figures); and a stellar-mass hole's tides are lethal ~1,400 km out, not "thousands" (the distance is now computed from the 1/r³ falloff). Also a universal flavour line blamed "stellar flares" for a neutron star's radiation; the family's own pools cover it (D202's reasoning).

## D213 — the black hole: three approaches, and the user chose the cross-section

Prototyped as scratch renders before any app code (`_bhproto.mjs`): **A, lensed** — the cinematic edge-on disc with its far side lensed over the shadow; **B, cross-section** — the disc SLICED, as every other body's layers are, into a flaring bow-tie with orbital flow marked ⊙ into / ⊗ out of the page, plunging streams reddening into the horizon, jets, the sky dimming toward a black interior; **C, gravity well** — a spacetime grid and the starfield pulled in and ending at the horizon. The user chose B ("looks absolutely cool and stunning").

Building it, two marks were exactly the forbidden picture until fixed: the **photon sphere** drawn as a band filled in as a grey donut round the horizon — on a dormant hole, literally a dark circle with a ring drawn on it — and is now glow-only (a faint thin ring and light-bending arcs); and the disc's inner edge, cut square, read as a plank and is now a rounded torus.

## D214 — what is inside a black hole (the user's question)

The user asked whether a black hole could have layers, perhaps neutronium at the centre. The answer that went into the code:

- **A non-spinning black hole genuinely is one black ball.** Inside the horizon "inward" is the future; nothing can hold still. Neutronium is not believable — a neutron star is exactly what failed to hold up. At Spin rate 0 the hole is drawn that way: black, faint infall streaks, a point singularity.
- **A spinning one — the Kerr solution, which every real black hole is — has structure in its own equations**, and Spin rate opens it up: the **ergosphere** outside the horizon (oblate, space dragged round, ⊙/⊗ again), the **infall** band, the **inner (Cauchy) horizon** where infalling light piles up infinitely blue-shifted ("mass inflation") — the one bright thing inside the black, drawn as a soft glow-only shell — and a **ring singularity**, which a cut through the axis meets at two points joined by a faint chord.

The inner horizon's radius is a layer driven by `modulate` with a `curve`; `0.02 + 0.84·s^2.2` tracks the exact r₋/r₊ to within 0.03 of the horizon radius across the range (measured), and the shell is centred on it with a thickness that grows with spin so its glow has room to fall off — at a fixed hairline it drew as a crisp ring. The user, on seeing the prototype: "you figured out a super good way to depict an interior cutaway for the blackhole."

## D215 — eight marks that read wrong first

Each was a correct-looking mechanism drawing the wrong statement, and each was found by rendering at the scale it fails at:

| Mark | First read | Cause and fix |
|---|---|---|
| magnetosphere | a purple fog hiding the field | the halo is now dark so its screened fill is faint; the loops are the content |
| field loops | rings round the equator | a loop took the falloff alpha of its OUTERMOST point, so wide loops vanished whole. The builder roots `radius` at the surface and carries `reach`; the primitive fades along the line, and loops may reach past the halo |
| nuclear pasta | dirt | scattered clusters; rebuilt as ordered striations by depth. Rows were blank where a phase offset exceeded a short grain |
| vortex lines | letter C's | open hooks → small oblique rings |
| superfluid | mud | mid value at low saturation is the muddy middle; raised |
| inner horizon | a hard blue ring | glow-only, centred, thickness growing with spin |
| starquakes | grey hair in the superfluid | a `vein` branches and runs inward from where it sits; a new unbranched `crack`, rooted at the crust top |
| streams | beads on a string | round caps overlapping under additive blending; butt caps, and one smeared head |

## D216 — traits

Seven, each a different KIND of mark from its body's own (D76): **Starquake Scars** (cracks in the crystal, driven by Field strength), **Glitching** (a knot of vortex curls against the crust among the straight lines), **Accretion Stream** (a new `matter-stream` primitive that follows this body's own dipole line from the companion's bearing onto a pole), **Navigation Beacon** (pulsar), **Research Station** (two ids with one label, because the safe distance is the body's), **Energy Extraction Array** (cones aimed at the hole, outside the ergosphere), **Tidal Disruption** (a new `tidal-stream`: a star smeared into a stream winding in, with a tail flung out). Gated by tags `magnetic`, `beamed`, `hole`; nothing existing leaked onto the new bodies (checked).

Not traits, by TRAIT-SYSTEM.md's third test: `magnetar`, `cooling-crust`, `millisecond-spin`, `feeding`/`dormant`, `rapid-spin`, `relativistic-jets`, `supermassive`/`stellar-mass` are control ends; `gravitational-lensing` is the umbra, standard equipment; `binary-companion` is the accretion stream.

**Presets** (`js/data/presets-compact.js`, behind a new `CC.Presets.register`): Magnetar, Cooling Neutron Star, Accreting Neutron Star, Millisecond Pulsar, Young Pulsar, Beacon Pulsar, Feeding Black Hole, Dormant Black Hole, Spinning Black Hole, Supermassive — each rendered and checked against its blurb.

---

## D217 — the user's first review: one patch, a cut field, a marquee (Session W)

**Starquake Scars and Glitching were always ONE patch.** `clustered` makes `round(n / 2.4)` centres, and repeats of [1, 3] and [1, 2] round to one centre every time — a side effect of the count, never a decision. Scars now repeat [3, 8], so one to three crack sites round the rim (a stressed crust breaks in several places), with Field strength still adding cracks to each. Glitching repeats [1, 4]: still one knot of the old size most of the time, two about one roll in six — a glitch is an event, and the curls read best as a focal point.

**Field loops faded out at the edge of the glow**, which read as cut. `dipole-loop` now fades toward 1.5× the halo's reach, so the wide loops dissolve out in the dark.

**The light cylinder read as a forgotten Photoshop marquee.** D207 assumed two VERTICAL lines; the scene's Rotation turns them diagonal, they ran twice the frame's size so their fade happened off-canvas, and dashes are the vocabulary of the app's own framing guides — so on screen it was two full-strength diagonal dashed lines crossing the picture, indistinguishable from the zoom/pan guides. Three changes: it is now a **trait** (`light-cylinder`, pulsar only via `beamed`) instead of a roll under Optional layers, so it can be switched; it is a **band round the star**, fading to nothing by 1.45 radii along the axis, inside the frame; and it is a **faint solid line with inward ticks** (a dimension line, the longest tick at the equator where the radius is measured) instead of dashes. Drawn by a new primitive in `draw/primitives/compact-stream.js`; the radius stays on `poles.lightCylinder` (always resolved now), and the card's approach line follows the trait.

---

## D218 — the black hole's traits: a seam, a crowd in the jets, one orbit for two things

**The tidal stream changed from wide to thin at the star.** It was two ribbons: a bright, haloed infall and a thin, faint tail that met at the head with a kink (the infall's radius had an infinite slope there). Now it is one path, tail tip → star → inner end, with the tail's opening direction matched to the infall's and width and alpha continuous through the star; the head smear eases in on both sides. **The segmenting** was `ribbon` itself: separate butt-capped strokes left a wedge gap outside every bend and a doubled overlap inside, which `lighter` turned into a ladder. `ribbon` now fills joined quads offset along the averaged normal, so neighbours share an edge exactly — this also smooths the neutron star's accretion stream.

**Orbital construction now keeps out of the jets and the disc.** A new trait field, `clear: true`, sends an orbital trait's bearings through `CC.Compact.clearAngles`, which cuts wedges round both jets and (where the disc reaches that radius) the sliced disc, padded by the mark's own size and a cluster's arc, and COMPRESSES the bearings into what is left — so an evenly spaced array stays evenly spaced rather than piling up against a wedge's edge. Both the Energy Extraction Array and the hole's Research Station use it; nothing else does.

**Extraction Array: half the size, 1–7 collectors.** Size [0.20, 0.24] horizon radii (was [0.40, 0.48]). The count is a per-body roll, `repeat: [1, 7]` with `density` pinned at one, so it is a fact about the hole rather than about Detail density — it had been 5–10 and read as consistently crowded.

**The hole's Research Station moved out to [3.3, 3.6] horizon radii** (was [2.6, 2.9]), clear above the array's [2.15, 2.35] — the people live further out than the machinery.

---

## Still open, for the user's eye

- **Starquake cracks** are jagged lightning-like lines; one number (`jag` in the `crack` primitive) if they should be calmer.
- **The neutron star's magnetosphere fill** shows as a faint tinted disc reaching the frame edge.
- **The light-bending arcs and photon ring** are deliberately faint; on a dormant hole they are most of what frames the void.
- **No real lensing of the starfield.** The umbra darkens the sky; approaches A and C bent it, and that could be added to B later (it needs an offscreen copy of the background).
- **The disc's colour** follows the photon sphere's hue, which follows the body's free hue — violet discs are common on a sheet. The spec leaves hue free; a warm bias is one line.
- The scale bar the spec calls "essential for this family" is Phase 8's.
