# Session Y — the user's review of Phase 7, and the order of what remains

*D241–D247. The nebula signed off, chunked speckle made global, the neutron star and pulsar reworked after the user's second look at the compact group, and the remaining phases reordered.*

Scratch tools: `test/_tmp/_ytime.mjs` (one render per archetype at 1200 px, timed — the D241 numbers). Renders went to `shots/v/` (`_vgrid.mjs` sheets) and `shots/w/` (`_wbig.mjs` large views).

---

## Closed without change

**The nebula (Session X stage 4).** The user looked at the traits, the card and the presets and closed every item on that session's "Still open" list as it stands: the pillars, the filament web on a remnant, the small built things, the dark-cloud cavity, the core's hue, the faint halo and the 18% Luminosity band. They are recorded there as closed rather than deleted, so the reasoning stays findable.

**The compact group's older list (Session V).** Crack jaggedness, the magnetosphere fill, the faint lensing arcs, the missing starfield lensing and the disc's hue bias were not raised. They stay as they are; the scale bar remains Phase 8's.

---

## D241 — chunked speckle filling is the default for every body

D225 found that filling one canvas path costs superlinearly in its number of contours, and made the nebula's motes flush every 24 dots. The user chose to apply it everywhere. `drawSpeckleBatch` now flushes every `SPECKLE_CHUNK` (24) dots unless an element names its own `chunk`.

Measured with `_ytime.mjs`, three seeds per archetype at 1200 px:

| | before | after |
|---|---|---|
| planet | 239 ms | 185 ms |
| gas giant | 257 ms | 172 ms |
| main-sequence star | 400 ms | 299 ms |
| neutron star | 502 ms | 390 ms |
| all thirteen | 3,910 ms | 2,984 ms |

**Every grainy body's pixels moved slightly**: separate fills compound alpha where two dots overlap, one path does not. That was the known cost, and the user accepted it.

## D242 — a neutron star is coloured like a star: the blackbody ramp

**The user's report:** across the whole range of Surface heat, the neutron star and pulsar looked like planets. Rendered, it was clear why. The hue was free and every band near grey, so a cold body read as dead grey rock (the planet's heat rule drains a cold body toward grey) and a hot one as a pastel planet in teal, pink or tan.

Surface heat now runs the **blackbody sequence**, a colour order everyone reads as "how hot a star is": dull ember at 0, amber, white at the middle, blazing blue-white at the top.

- **`colorProfile.dial` gained `hue.curve`**, an absolute destination hue that is itself a curve over the dial, as an alternative to the fixed `hue.to` the nebula uses. The rolled hue survives as a 10% lean, so two bodies at one heat are related but not identical.
- **The step from amber to blue is authored at the white point**, where the `sat` multiplier dips (0.75 at heat 0.5). A real blackbody passes through white rather than green; interpolating 46° → 212° the short way would go through green.
- **`heatDriven: false` on every compact layer.** The dial owns what Surface heat does to colour. `heatValue` (the crust's lightness) still applies.
- **The crust bands carry a little more saturation** (iron lattice 0.07–0.15, pasta 0.09–0.19), or the ramp left the rim a grey ring round a coloured disc.

The beams and the glow take the outermost layer's colour, so they follow the ramp for free: a newborn pulsar fires blue-white beams and an old one amber.

## D243 — the light cylinder is now the pulsar wind

**The user's report:** the light-cylinder trait "feels out of place, looking more like a HUD element than a trait". That was accurate. Session W rebuilt it as a ticked solid line, which is the vocabulary of a dimension line, an annotation about the star and not part of it. A trait has to be a thing.

`light-cylinder` is replaced by **`pulsar-wind`**, which shows what the light cylinder does. Past it the field cannot co-rotate, so it opens and streams away along the spin equator, and where that wind meets its surroundings it shocks into bright wisps (the ripples photographed round the Crab pulsar). Cut through the spin axis, the equatorial torus is two lobes, each a set of nested arcs bowing outward, broken into knots, inside a soft elliptical glow, with faint streaks leaving along the equator.

The light-cylinder radius (`poles.lightCylinder`, Spin rate) is still where the wind starts, so a faster pulsar's wind sits closer in. The card's approach line now warns about the wind; the Millisecond Pulsar preset drops the trait (a recycled pulsar is old and quiet), and the Young Pulsar preset gains it.

**A saved settings string naming `light-cylinder` loses that trait on import.** Unknown keys are skipped rather than fatal (domtest checks this), so nothing breaks.

## D244 — the two bodies tell different surface stories

**The user's report:** apart from the beams, the neutron star and pulsar bodies looked identical. They were: one stack built by one function.

The stack function now takes `beamed`, and the difference is what happens to the heat at the surface:

- **A pulsar's heat is in two polar caps**, at the ends of its magnetic axis, where the beams are rooted and the return current strikes. The new `polar-cap` mark is declared on the field, the crust and the pasta. It is a white-cored glow centred on the surface at each pole, and each layer's own clip shows its slice, so the cap reads as one hot spot burning down through the surface into the root of the beam.
- **A quiet neutron star glows in patches** wherever its tangled field lets heat out. The new `hot-spot` mark (9–18 per body) uses the same glow at rolled bearings, declared on the field and the crust. **Bearings come from the body's seed, not the layer's stream**, so both layers agree where each patch is, and the limb reads as a mottled glowing edge rather than a ruled circle.

Each archetype switches the other's mark off with `elementScale` (count 0), so a pulsar has a clean rim with two blazing caps and a neutron star has a mottled glowing rim. They are different marks, not one mark at two strengths.

**First attempt, rejected by rendering:** hot patches as `blob`s in the crust, then in the field. On a near-white crust a glow-tone blob has no headroom to show, and in the field it took the halo's deliberately dark colour. Both were invisible at every scale. The white core is what makes the new mark read.

## D245 — limb darkening on the fluid, not on the crust

"The surface is flat, like a planet's." Part of the answer is D244's mottled rim. The other part is the star family's limb darkening (`limbDarkening`, D129 and onward), which makes a glowing face read as a sphere.

**On the crust it was wrong.** Multiplying the bright rim down turned it a dull grey, which is the opposite of hot. It sits only on the superfluid (0.45), the wide band that makes up most of the face. The crust stays the brightest thing on the body, as the family spec asks.

## D246 — the order of what remains

The user's plan, recorded in [ROADMAP.md](../ROADMAP.md):

1. **The `machine-world` archetype** goes first (Phase 9a), so the polish pass sees every body type that will ship.
2. **Phase 8: overlay, scale bar and polish**, including the per-type stat templates, now over the full set of archetypes.
3. **Megastructure traits (Phase 9b): audit, then build.** The per-body lists in MACHINE-WORLDS.md predate most of the generator. Before anything is built, each list is reviewed against the artificial and natural traits that now exist (several bodies already carry stations, beacons, collectors and borers), and the cleaned list is what gets built.
4. **A final clean-up pass (Phase 9c)** after the megastructures, to make sure everything lands together.
5. **Phase 10: release.** The user is happy to release later, since machine worlds and megastructures are intended parts of the generator rather than extras.

## D247 — what did not change

- **The family's perfect circles.** "Clinical" is still the spec's word. The mottled rim is light at the surface; the boundaries stay perfect.
- **No oblateness from spin.** A visibly flattened millisecond pulsar was considered as a third differentiator, but it would break the perfect circles and needs a body form the compact family does not declare. Left for the user to ask for.

---

## Still open, for the user's eye

- **The blackbody ramp's white point** at Surface heat ~0.5 is a near-neutral white with a faint grey halo. One `sat` table on the profile if it should stay warmer.
- **The hot patches' size and count** (`hot-spot` in `js/data/elements/compact.js`). At sheet scale they read as glowing beads on the rim.
- **The pulsar wind's wisps** are seeded per body and do not yet read Detail density.
