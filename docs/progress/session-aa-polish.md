# Session AA — Phase 8, overlay, scale bar and polish

*D282–D284 so far. Phase 8 runs over several sessions, one item each, with the user looking between them (D282). This session: the audit, then item 1, the layer-name overlay.*

Scratch tools: `test/_tmp/_aacards.mjs` (one card per archetype as text, with each line's Compact/Standard membership), `test/_tmp/_aastack.mjs` (each archetype's drawn stack), `test/_tmp/_aaoverlay.mjs` (the overlay sheet across every archetype plus edge cases, to `shots/aa/`), `test/_tmp/_aacrop.mjs` (pulls cells out of a sheet at full size).

---

## The audit

Each Phase 8 item checked against the code and PARAMETERS.md before anything was written.

| Item | State found |
|---|---|
| "Copy seed + settings" string | **Built.** Both directions in `js/ui/share.js` (D57), framing rides along (D73), domtest asserts the round trip. New controls join automatically, since the string sweeps the panel |
| Keyboard shortcuts | **Partial.** Space, I, 1–8, Ctrl+S, Ctrl+C in `js/ui/exportui.js`. Missing ← / → seed, `L`, `?`. PARAMETERS.md said 1–6 |
| Settings persistence | **Partial.** Only the accordion's open sections persist. No settings in localStorage, no Reset to defaults |
| Layer-name overlay | **Missing.** Layers had only role slugs, no display names |
| Scale bar + silhouette | **Missing.** `radiusKm` exists per archetype; the range runs from 3 km to 15 light-years |
| Stat templates finalised | **All nine exist.** Inconsistencies: the nebula's Biggest danger is not on Compact (every other family's is); the black hole has no Resources line; Compact runs 4 lines on the asteroid and nebula, 6 elsewhere; the moon inherits the planet's climate and day rows ("Arid at the equator" on an airless body); the gas and ice giant print the same cloud-top temperature and every star "Activity: Ordinary" at defaults, worth checking they move; a stale "Phase 8" comment in `js/gen/hazard.js` |

Drift found alongside: PARAMETERS.md's **Composition** dropdown and **Show body name** checkbox were never built, and the export menu does Composition's job; ARCHITECTURE.md's file-layout block is far out of date; fifteen files already pass 500 lines (main.js, scene.js, film.js and others), left for 9c.

## D282 — Phase 8's scope and order, settled with the user

- **Order:** overlay → scale bar → stat-template pass → persistence + Reset to defaults → keyboard → close. Persistence follows the new controls so it saves them; the keyboard goes last so `L` and any scale-bar key land with their features.
- **Labels and the scale bar are render settings, like framing**, drawn into every body export. The Composition dropdown and Show body name are struck from the spec.
- **The silhouette is automatic:** the nearest comparison object that is visible at true scale (Earth beside a giant, the Sun beside a giant star, a city beside a neutron star), or none. Not the fixed None / Earth / Sun / Human / Ship list, most of which is sub-pixel against most bodies.
- **The stat-template pass is an inconsistency check**, not a wording pass.
- **Layer names are drafted and drawn**, and the user corrects them on the sheet, rather than approving a list first.
- **One item per session.** Each session records its item as done and ends with the prompt for the next.

## D283 — Layer names: one table by role, an override on the spec, resolved in gen

`js/data/layernames.js` maps all 53 roles to a sentence-case caption ("Metallic hydrogen", "Cauchy horizon", "Power core"). Keyed by role rather than archetype because most roles mean the same thing wherever they appear: four stars share one photosphere.

An archetype that means something different by a shared role sets `name` on the layer spec. `js/gen/structure.js` resolves the name once (spec, then table, then a title-cased slug), so the overlay reads `layer.name` and no role reaches `js/draw/`. A new family's overlay works before anyone writes its names.

## D284 — The overlay: one ray per side, sized from the frame, drawn level

`js/draw/overlay.js`, step 7 of the draw order. Each band gets a dot inside it, a 1px leader, and its name over an underline.

- **The anchors sit on one ray per side**, 55° from straight up, at the middle of each band (partway out from a solid centre; just above the surface for an outward layer, whose glow fades long before its nominal edge). Walking a ray outward meets the bands in depth order, so the anchors are already sorted top to bottom in the order the labels stack, and the leaders cannot cross. Each label starts level with its anchor and is pushed apart from its neighbours only as far as it must be: a thick band's leader runs nearly straight, a thin one's bends.
- **"Both" deals the bands out alternately**, outermost to the right. Adjacent bands are the ones that crowd, so each side gets twice the room.
- **Sized from the frame, not the body.** Text and lines scale with the canvas's shorter axis (15px at 1000px, times Label text size), never with `view.R`, so a 20x close-up does not print 20x names. Anchors still come through `view.at`, so they land on the bands wherever framing and the body's form put them; a band whose anchor framing pushed off the canvas goes unlabelled.
- **Drawn after the scene's rotation is undone**, so the names read level. Each anchor is placed in body space and turned by the body's rotation by hand.
- **Legibility over any sky:** ink lines and text carry a dark halo, so they read across a corona as well as black space. The underline wears the band's own palette colour lifted toward white, so a name ties to its band without following the leader.
- **The column** starts clear of the furthest anchor and of the body's edge (1.1R), and is pulled back inside the frame when the text would run off.

Three controls in Labels & Info, output stage (no cache key, no re-roll): **Show layer labels** (default off), **Label side** (Both / Left only / Right only), **Label text size** (75–150%).

Checked on the sheet across all fourteen archetypes plus right-only, left-only at 150%, rotated 40° at 75%, a machine world zoomed 2.5x and panned, both nebula shell forms, and a second asteroid seed. `npm test` passes.

**Known and accepted:** the black hole is drawn small in its frame, so its column sits over the inner accretion disc. A label column clear of an outward *trait* would need the trait's reach, which the overlay does not know about, and the disc is part of the picture there.

**Waiting for the user's eye**, names and layout both.
