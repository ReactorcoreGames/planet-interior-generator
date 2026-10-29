# Session AA — Phase 8, overlay, scale bar and polish

*D282–D285 so far. Phase 8 runs over several sessions, one item each, with the user looking between them (D282). Item 1, the layer-name overlay, and item 2, the scale bar, are done.*

Scratch tools: `test/_tmp/_aacards.mjs` (one card per archetype as text, with each line's Compact/Standard membership), `test/_tmp/_aastack.mjs` (each archetype's drawn stack), `test/_tmp/_aaoverlay.mjs` (the overlay sheet across every archetype plus edge cases, to `shots/aa/`), `test/_tmp/_aacrop.mjs` (pulls cells out of a sheet at full size), `test/_tmp/_aascale.mjs` (the scale-bar sheet, printing each case's bar, rung and card Size line), `test/_tmp/_aasplit.mjs` (splits a tall sheet into 1920x1080 pages).

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

**Approved**: asked before item 2, the user had no corrections to the names or the layout.

## D285 — The scale bar: the card's radius, a 1-2-5 length, the largest silhouette that fits

`js/draw/scalebar.js`, step 8 of the draw order, after the overlay and with the rotation undone. Ladder data in `js/data/scaleladder.js`. Approved by the user on the sheet ("Looks really good").

- **It measures the radius the card states.** `CC.Stats.build` now returns `radiusKm`: each template's `facts.radius`, or `facts.radiusKm` where a template's own unit is not km (the nebula sets it from its light-years across). The bar builds the stats over the same body, details and settings, so its number is the Size line's number by construction; that radius is `view.R` pixels. The black hole's is the horizon from its mass, a few km to ~60 AU; the nebula's runs 0.2–55 light-years.
- **A round length, a unit from that length.** The bar takes the largest 1, 2 or 5 × 10ⁿ under 22% of the frame's shorter axis, so it lands between ~9% and 22%. The unit is picked from the longest bar that would fit, so the number is always at least 1 of it: m below 1 km, km below a million, million km below 1 AU, AU below 0.1 light-years, then light-years.
- **Sized from the frame**, like the overlay: text, strokes and margins scale with the shorter axis, and the text follows Label text size. Zoom changes the bar's length, never its text.
- **The silhouette is the largest ladder rung whose true-scale size is 5px–25% of the frame**, standing above the bar with its name, or none. Zoom moves the pixels, so zoom moves the choice: a gas giant shows Earth at 1x and the Moon at 8x.
- **The ladder as built**, sixteen rungs: a person, a jumbo jet, a skyscraper, a town, Mount Everest, a large city, Ceres, the Moon, Earth, Jupiter, the Sun, Arcturus, Earth's orbit, Neptune's orbit, the inner edge of the Oort cloud, the Oort cloud. The user approved ten and asked for the gaps filled. Checking the ladder against every body showed more gaps than the proposal named: under the first 18% cap no disc fit a planet, a moon or a machine world at all. The window was widened to 5px–25% (50x) and the rungs spaced at most ~50x apart wherever a body can be; the jet, Ceres, Arcturus and the inner Oort cloud fill the gaps. The one wider step, Neptune's orbit to the inner Oort cloud, spans sizes no archetype reaches.
- **A town, not a city, beside a neutron star.** At true scale a 40 km city is larger than a 24 km neutron star, so it can never sit in the corner beside it; the town rung (5 km) was added for that.
- **Drawn as semi-technical marks**: small things (person, jet, tower, peak, skylines) as pale filled figures in a dark halo; discs as a faint veil in an ink ring, so a silhouette never reads as a second body; Jupiter with two belts; orbits as an empty ring round a Sun dot; the Oort cloud's ring broken, since it has no edge. The bar is four alternating segments in an ink outline, readable over sky or a bright surface.

Two controls in Labels & Info, output stage: **Show scale bar** (default off, the user's call) and **Size comparison** (default on). The "scale bar arrives later" phase-note is gone.

Checked on the sheet across all fourteen archetypes, the black hole at mass class −1, +0.6 and +1, zoomed cases (planet 4x, gas giant 8x, asteroid 20x, giant star 3x, nebula 6x), the planetary nebula, the moon with the silhouette off at 150% text, and a 1920x1080 gas giant at 1:1. `npm test` passes.

**Follow-up, after the user's look at the live app.** Zoomed in, the lower-left corner was unreadable. Two causes, neither in the export. The preview caption (`#preview-meta`: seed, layer roles, rolled traits) predates the scale bar and sat in the same corner; it moved to the top-left, wraps short of the info card, and has a dark text halo. And while framed, the overlay and scale bar laid out against the whole preview canvas rather than the export guide's rectangle, so the bar sat half in the dimmed margin across the dashed line. `CC.Framing.frameRect` now returns that rectangle (null when not framed); the preview passes it as `settings.chromeBox`, and both lay out and size inside it. Exports never set it and fall back to the full canvas, so they are unchanged. `npm test` passes.
