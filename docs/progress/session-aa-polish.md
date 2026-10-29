# Session AA — Phase 8, overlay, scale bar and polish

*D282–D287 so far. Phase 8 runs over several sessions, one item each, with the user looking between them (D282). Item 1, the layer-name overlay, item 2, the scale bar, item 3, the stat-template inconsistency pass, and item 4, settings persistence + Reset to defaults, are done.*

Scratch tools: `test/_tmp/_aacards.mjs` (one card per archetype as text, with each line's Compact/Standard membership), `test/_tmp/_aastack.mjs` (each archetype's drawn stack), `test/_tmp/_aaoverlay.mjs` (the overlay sheet across every archetype plus edge cases, to `shots/aa/`), `test/_tmp/_aacrop.mjs` (pulls cells out of a sheet at full size), `test/_tmp/_aascale.mjs` (the scale-bar sheet, printing each case's bar, rung and card Size line), `test/_tmp/_aasplit.mjs` (splits a tall sheet into 1920x1080 pages), `test/_tmp/_aasweep.mjs` (the giants' cloud-top temperature and the stars' Activity across their controls), `test/_tmp/_aamoon*.mjs` (the moon's rows, stack and renders across seeds and Starlight), `test/_tmp/_aabefore.mjs` (the affected cards; before and after in `shots/aa/cards-*.txt`). `test/_tmp/_aapersist.mjs` (boots the app with real storage: save and reload, Reset, stale and junk stores).

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

## D286 — The stat-template inconsistency pass

Each item on the audit's list was checked against the code with `test/_tmp/_aacards.mjs` before anything changed. A fix was proposed for each, and the user approved the set.

| Audit item | Found | Done |
|---|---|---|
| The nebula's Biggest danger is not on Compact | True | `danger` closes the nebula's Compact, as it closes every family's |
| The black hole has no Resources line | True, and its pool was already written (`js/data/flavour/blackhole.js`) but never asked for | A `resources` row between Notable and Approach, shown on Full |
| Compact runs 4 lines on the asteroid and nebula, 6 elsewhere | **Wrong.** 6 on the planet, moon, giants and machine world; 5 on the stars, neutron star, pulsar and black hole; 4 on the asteroid and nebula | The rule is now **Size, the family's headline facts, Biggest danger last, at most six** (card.js designs Compact for six in one column). The nebula reaches 5 through `danger`; the asteroid reaches 5 through `composition`, which is read off the interior's colours |
| The moon inherits the planet's climate and day rows | Partly. The Day row reads the moon's own Tidal locking and Starlight, and matches the planet's only because one seed gives one roll: no change. "Arid at the equator" on an airless body is real, and a locked airless moon promised "a habitable ribbon" | `climateLine` takes an `airless` flag from the card's own Atmosphere row (pressure under 0.02): `hot` reads "sun-baked", `temperate` "mild", and the locked ribbon is "a ribbon of mild ground". Keyed on the drawn atmosphere layer, not the archetype |
| The giants print the same cloud-top temperature; every star prints "Activity: Ordinary" | Neither is a defect. The cloud tops move with Starlight (−203 °C to +336 °C), Interior heat and Tidal locking, and the two giants match because they read one field through one mapping with nothing in the picture to tell them apart. Activity reaches all four bands on every star; the default 0.45 sits in Ordinary (0.28–0.55) | Nothing |
| Stale "Phase 8" comments in `js/gen/hazard.js` | Two, at lines 55 and 109 | Reworded to what is built: the compact objects take Absolute outright |

**Found on the way, and worse than the listed item: the ice moon's card contradicted its picture.** Below about Starlight 0.4 the moon draws an ice shell over a dark ocean, and its card said "Dry rock, with ice held at the cold latitudes" with no "Beneath the ice" row. Two causes:

- `details.climate` is the summary from `js/gen/climatesummary.js`, which never copied `subsurface` off the field, so `subsurfaceLine` returned null on every body. The summary now carries it, and the row prints again.
- `landFractionOf` counted the shell as ground standing above the sea all the way round, so the Surface row took its "no sea at all" branch. `surfaceOf` now asks `lidOverSea` first: a relief layer whose inner edge sits on the sea's outer edge is a lid, and the row reads "Ice shell all the way round, with the ocean sealed beneath it. There is no shore anywhere", the lid's own `name` (D283) supplying the material. Read off the stack's shape; no archetype is named.

Before and after, from `test/_tmp/_aabefore.mjs`:

```
nebula      Biggest danger  S  ->  CS
black hole  (none)          ->  Resources: The disc's light, collected from a very safe distance.
asteroid    Composition     S  ->  CS
moon, dry   Climate: Arid at the equator, temperate at the poles.
         -> Climate: Sun-baked at the equator, mild at the poles.
moon, ice   Climate: Temperate at the equator, frozen solid at the poles.
         -> Climate: Mild at the equator, frozen solid at the poles.
            (none)
         -> Beneath the ice: Liquid water at about 67 C, 115 degrees warmer than the surface. ...
            Surface: Dry rock, with ice held at the cold latitudes.
         -> Surface: Ice shell all the way round, with the ocean sealed beneath it. There is no shore anywhere.
moon, locked  ..., with a habitable ribbon running between them.
           -> ..., with a ribbon of mild ground between them.
```

The black hole's extra flavour roll moves the random stream for Approach and Biggest danger, so a shared black-hole seed may now print different flavour lines there. Accepted.

**Listed for the user, not fixed** (same kind, outside the approved set):

- Stale comments: `js/draw/scene.js`'s header gives the scale bar as step 6 "[Phase 8]" and the overlay as 7 (they are 7 and 8); `js/ui/infopanel.js` still names the struck Composition dropdown; `js/draw/card.js`'s header says Standard is eight lines and Full eleven (they run to 9 and 15); `js/gen/stats/solid.js`'s header says the asteroid will share the solid template.
- The nebula's Navigation and Biggest danger can say the same thing ("getting lost"), already on Standard and now on Compact.
- The ice moon's `hasOcean` fact stays false (no exposed sea), so the flavour pools can say "Nothing of obvious value" over a hidden ocean.
- **A render defect, not a card one:** the ice shell draws at full weight whatever its presence `strength`. At Starlight 0.4 its strength is 0.04, yet a solid shell is drawn under a 78 °C equator, and the card truthfully reports that temperature over it.

`npm test` passes.

## D287 — Settings persistence and Reset to defaults

Proposed to the user before building; they approved the design with four answers: save locks, Reset includes the seed, the button's place and two-press confirm as proposed, and `trait-salt` joins the share string. **There are no users yet, so compatibility with old strings is not a constraint**: the newest release is treated as the initial one.

**Checked against the code first.** The audit held: only `cc.sections.v1` (the accordion) was stored, and the accordion's own comment said control values had been left out deliberately, because they would hand a returning user a half-configured app "with no obvious way back to defaults". Reset is that way back, so the objection is answered. `js/ui/share.js` already had the serialiser (`settingsText`, a diff against the DOM's defaults) and the restore (`applySettingsText`, which defaults every omitted control), so no second serialiser was written.

**`js/ui/persist.js`, one key, `cc.state.v1` = `{ v: 1, settings, locks }`.**

- `settings` is the share string, so every panel control, the trait picks and exclusions, and the framing are saved, and a control added later is saved without an edit here. `locks` sits beside it, since a lock is not part of the body and the share string leaves locks out on purpose.
- **Saved from the redraw, not from each control.** Randomize, presets, a paste, framing gestures and the trait picker all write through `CC.Controls.set`, which fires no change event; every one ends in a draw. `draw()` calls `CC.Persist.schedule()`, debounced 300 ms and written only when the snapshot differs. Locks redraw nothing, so `change` and `click` on `#panel` schedule too, and `pagehide` flushes.
- **Restored before the first draw** in `main.js`'s init, after `ExportUI.init` (which hands Share the trait-salt setter), through `applySettingsText` and then the paste's syncs (`syncRotationEnabled`, `syncBackgroundColour`, `ExportUI.syncArchetypeConsumers`, now exported). The app opens on the saved body without flashing the default.
- **Never fatal.** Every storage access is wrapped. Bad JSON, a non-object, a wrong `v` or a non-string `settings` reads as nothing stored. An exception during restore resets to defaults and drops the key. Unknown keys are skipped and missing ones defaulted, as the paste already did.

**Not saved:** the accordion (already saved under its own key; layout, not the body, so Reset leaves it), the preset gallery's highlight (transient by design), and disabled or hidden rows (derived, recomputed by the syncs).

**Two defects found on the way, fixed in `js/ui/share.js` for paste and persistence alike:**

- **Re-rolled traits were not in the share string.** With nothing ticked, traits are rolled with `traitSalt`, which Randomize and Re-roll traits advance, and the string did not carry it: a shared body, and with persistence a reloaded one, came back wearing different traits. The string now has `trait-salt: N` when it is not 0, and applying a string sets the salt (absent means 0, the diff rule). The setter is injected from `main.js` through `CC.Export.init`.
- **A dropdown value with no option blanked the control.** Setting a `<select>` to a value it lacks leaves `selectedIndex` at −1 instead of raising an error, so a renamed archetype id gave an empty dropdown. Such a key is now skipped, and the omitted-control sweep puts it back to its default.

**Reset to defaults** is a full-width button under Lock all / Unlock all / Invert in Randomize settings, which already holds the buttons that act on everything; the pinned bar is full. It takes two presses: the first arms it (red, "Click again to reset", disarms after 3 s), the second resets. Reset applies an empty settings string — every control including the seed (`first-light`) and framing, no trait picks or exclusions, salt 0 — then unlocks all, clears the key and shows a toast. It does not consult locks, since "defaults" means having none. Randomize settings' stale "arrive with the MVP" note is gone.

**Presets, Randomize and paste are unchanged**, and are saved like any other change.

**Tests: none added.** domtest's settings round-trip covers the serialiser, and jsdom without an origin makes `localStorage` throw, so every `npm test` boots the app with storage blocked. The restore path itself was checked with `test/_tmp/_aapersist.mjs` (save and reload of archetype, seed, labels, zoom, a lock and re-rolled traits; Reset's two presses; a stale store with an unknown archetype, key and locks; five junk stores), all passing. The user tried it in the real app: "looks good". `npm test` passes.

**Listed, not fixed:** PARAMETERS.md's Randomize settings section specifies four controls that were never built (Randomize scope, Archetype pool, Respect locks, Auto-randomize on load); it now says so. Auto-randomize on load, if it is ever built, would have to decide whether it overrides the restored body.
