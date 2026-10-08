# Session U1 — the asteroid's body

**D184–D192.** The first half of [ASTEROID-OVERHAUL.md](../archive/ASTEROID-OVERHAUL.md): everything that changes what the rock looks like — §3 (deletions) → §1 (silhouette) → §2 (cells) → §8's brittleness half. Everything on and in the rock (§4–§7, radioactivity) is Session U2, deliberately, so traits are tuned against a body that has stopped changing.

**No other body changed.** Every non-asteroid archetype renders byte-identically to HEAD, checked by hashing PNGs from a worktree of the previous commit (`test/_tmp/_u1regress.mjs`), and the only trait-eligibility change anywhere is the asteroid's.

Scratch tools for this session: `test/_tmp/_u1sheet.mjs <tag>` (18-body contact sheet across three Cohesion settings, plus two large renders) and `test/_tmp/_u1probe.mjs <name> '<settings json>' '<CC mutation>'` (one large render with overrides).

---

## D184 — the silhouette needed a FORM, and it belongs in `view.at`

The doc's diagnosis held: every boundary is `1 + noise(angle) * amp` about one centre, and amplitude, faceting and frequency are all statements about the *edge*. What a fragment has that noise around a circle cannot express are the **low-order** statements: elongation, taper (fat at one end), a waist or kink (a 2–3-lobe harmonic), and an eccentric centre.

`js/gen/form.js` rolls those per body from the archetype's `form: { elongation, taper, lobe, offset }` (scaled by Boundary irregularity, so 0 is round again) and turns them into a per-bearing radius multiplier — the shape sampled in its own frame, re-expressed about the frame centre, tabled at 720 bearings.

**It is applied inside `view.at`, not in `boundaryFn`.** That was the decision that made the rest cheap. `view.at` is the single funnel every boundary, mosaic site, element and relief facet passes through, so all of them wear the same warp and nothing can slide off anything else — D180's crossing cannot recur on this axis because there is only one form. Beyond the surface the warp eases back to identity over 0.6 radii, so orbital marks keep their clearance without being squashed into the outline.

Three things followed from rendering it:

- **Normalizing to max radius 1 shrank every elongated body**, and the offset pushed it off the middle of the frame. Fixed by normalizing about the outline's own bounding-box centre — the body fills the radius it was sized for — and shifting the view by that centre, *rotated by the body's rotation first*, since the canvas rotates about the warp origin afterwards.
- **The offset's range came down** (0.04–0.16 → 0.03–0.10). Its main visible effect is a cell-size gradient across the body, and at the top of the original range that read as an artefact.
- **Ellipse + taper still read as eggs.** The review asked for "blob/amoeba". The lobe harmonic (`lobe: [0, 0.16]`, 2 or 3 lobes) was added beyond the doc's list and is what produces peanut and kidney outlines.

Relief came down from 0.115 to 0.06, per §1: with the form doing the shaping, terrain is cosmetic surface marking.

## D185 — a warp must not decide the cell size

The mosaic's polar lattice is uniform per unit area *before* the warp. After it, every cell on a bearing is scaled by the form there, so the narrow side of the body carried a crowd of fragments half the size of the long ends' — visible on the sheet as a patch of tiny cells on one flank.

So on a warped body the sites are laid out **where they will be seen**: a jittered hex lattice in warped space, clipped to the warped layer, then un-warped to (radius, angle) so `view.at` puts each exactly where it was laid (`CC.Form.mosaicSites`). Round bodies keep the signed-off polar lattice unchanged.

The first version was a honeycomb — "a turtle shell", every cell the same size. **The polar lattice had been supplying size variation for free through its rings**, and a hex lattice supplies none. Fixed by laying the lattice 2.6× finer and thinning it by a smooth noise field, solving the thinning rate so the expected count still matches the recipe: where the field is high the cells are gravel, where it is low the survivors are slabs. **Cohesion sets the contrast** (exponent 2.6 → 1.0), so a rubble pile is boulders among gravel and a monolith's slabs are even — the "spread widens as cohesion falls" claim in `buildMosaic`'s header, finally made true on this path. The fine lattice is jittered harder than the polar one was, because where the field keeps every point a lightly jittered lattice shows through.

## D186 — a radial gradient cannot bend, and the shell's "fur" was older than this session

Three marks draw concentric geometry directly rather than through `view.at`: a band's depth gradient (`bandFill`), a pit's rim gradient (`arcBand`) and a wedge's floor gradient. On a warped body all three land on the wrong radii.

The two small ones are matched locally — the gradient's radii are scaled by `view.formAt` at the element's own bearing. The band fill cannot be, because it spans the whole body, so `js/draw/formfill.js` *records* the gradient's stops when the view is warped and fills in 480 thin slices, each with its own circular gradient at that bearing's scale.

**And it fixed a defect the asteroid has had since Session T.** The baseline render shows pale translucent lumps standing off a dark ring all round the silhouette. Probing with relief zeroed proved it was not terrain: it was the shell's strong depth gradient (0.72) being concentric to the *nominal* radius while the edge is faceted — wherever the edge bulged past the radius the band clamped to its palest stop. Each slice now scales by the band's own outer boundary at that bearing (lightly averaged, because following every facet exactly stepped between slices), so the shell reads as a crust wrapped round the outline. Unwarped bodies are untouched, so the same concentric-gradient effect still exists on any other wobbly layer; it was simply never as visible as on a layer with `depthGradient: 0.72` and a `heavy ×1.5` faceted edge.

## D187 — flat cells, and a cut face is lit by nothing

Both shine sources are gone, as the doc insisted they had to be together: the per-cell linear gradient along the shared light vector, and the sheen pass over the top. `mosaicFill` now gives each material one flat colour.

What makes a fragment stone instead is texture from `js/draw/rocktexture.js` — two monochrome, signed tiles built once per page and laid into each cell at a per-cell offset so neighbours do not read as one painted surface:

- **grain** — per-texel gaussian, the review's "monochrome gaussian, 30%"
- **mottle** — three octaves of value noise on a wrapped lattice, so it tiles seamlessly. (The first sampler summed two 1-D noises, which would have been a striped grid; caught before it ran.)

Both are scaled by `view.scale`, so the texture is a property of the rock and the same at every resolution.

**Judged at sheet scale, not only large.** At 1400px the first mottle looked right; at the 340px sheet it was camouflage clouds spanning several fragments and greying out the material colours. Its feature size was halved and both strengths pulled back. The grit pass survives as the coarse discrete mark the tiles are too fine to make.

§9's fallback — a radial value gradient in the material fan if high-Cohesion bodies read flat — was **not** built. It is the user's call from the app.

## D188 — Cohesion finishes its own job

The spec has always said Cohesion drives "outer-shell integrity", and the shell was identical at 0 and 100. Three marks now move with it, so brittleness is felt without a Brittleness slider (§8's argument):

- **The crust breaks.** `breach: { param, amount, sectors }` on the interior layer lifts its edge toward the shell's actual drawn edge in sectors of a coherent noise field thresholded by the parameter (`CC.Form.breachFn`, composed into `bounds` in `draw/scene.js`). Nothing above about 0.5 Cohesion; thin patches by ~0.3; at 0 the crust is missing outright in places and the fragments reach the silhouette. Because the clip and detail passes read `bounds`, the shell's own marks vanish from a breach with no further work.
- **The shell's fractures multiply and lengthen.** `elementScale` may now be parameter-driven — `{ by, count: [at0, at1], size: [at0, at1] }` — and the shell's veins run 2.4× count / 1.75× size at 0 down to 0.6× / 0.85× at 1, long enough at the loose end to cross the band.
- **The cut face gets grainier.** Grain rises and mottle falls as Cohesion drops: crumbly rock is granular, a monolith's interest is in larger-scale mottling.

## D189 — what an aggregate is made of belongs to the mosaic

The rule §3 asked to be quoted here: **on an aggregate body, *what it is made of* belongs to the mosaic, not to the trait pool. Traits describe what HAPPENED to the body, not what it IS.**

- The **dust film** is deleted (the user: "your initial instinct was right about this one").
- **`mineral-veins` and `metal-rich`** no longer anchor to `interior`; both stay alive on planet and moon mantles.
- **`ice-rich`** is deleted. An icy asteroid is reachable by the material route instead: `voidIce` on the mosaic recipe fills a share of the voids with pale, grain-only ice, driven by **Starlight** — the frost line stated as a dial (every void icy at 0.08 and below, none above 0.30). The Ice Hauler preset now carries no trait and gets its ice from its low Starlight.
- **`hollowed-out`** is retired (§4). The Hollowed Rock preset keeps the mining station and should take the Excavation axis when §7 lands.

**An icy void is not a void, and the card must say so.** The stats now count icy voids separately from empty ones: the void fraction (and so density, gravity and the Structure ladder) is the empty share only, and the Structure line adds "Ice fills another N%" when ice is present. Otherwise the card would claim holes where the picture shows ice — "numbers must never contradict the picture".

## D190 — a trait whose anchor cannot resolve is not eligible

Pulled forward from §6, because §3 needed it: removing `interior` from two traits' anchor lists would otherwise have left them offered on the asteroid, rolled, listed on the card and drawn nowhere — the exact silent failure §6 describes.

`CC.Traits.eligible` now also requires that a trait's anchor (or one of its fallbacks) names a role in the archetype's **stack**, with `orbit` and `surface` always resolving. Checked against the stack rather than a built body, so an optional layer still counts. The only archetype whose eligible list changed is the asteroid's, and it lost exactly the four dead traits §6 names (`void-pockets`, `magma-chambers`, `cratered`, `impact-basin`) plus the two de-anchored ones. **U2 re-anchors `cratered` and `impact-basin`** as §6 specifies and they will reappear; `magma-chambers` and `void-pockets` stay ineligible, now deliberately. The test §6 proposes was not added — this is a runtime filter rather than a check, and tests are added only when asked.

## D191 — housekeeping

- `structure.js` and `layers.js` were already past the 500-line cap, so the new mechanisms live in new files (`gen/form.js`, `draw/formfill.js`, `draw/rocktexture.js`) and the old ones gained only a few lines each.
- The asteroid archetype file's Session T comment archaeology was condensed to what is still live; the full history stays in [session-t-asteroid.md](session-t-asteroid.md).
- Rendering cost: an asteroid at 1600×1000 draws in 83–143 ms against 222 ms for a default planet, so the slice fill and per-cell texture are affordable.

## D192 — a void is a recess, not a cutout

The user's review of U1: the voids "feel like pitch black voids" — black cutouts, missing pieces of the picture — where they should read as **deeply recessed dark cells**, still textured. They were left as bare seam ground, which is the darkest thing in the layer.

A void is now drawn: a dark, desaturated pocket with a depth gradient (floor lifted slightly, falling to near-black at the walls) and the cut-face texture at reduced strength. The depth gradient is not the retired shine — it says how far down light reaches, not that a light source is on a surface.

**The first attempt read as a fourth, slate-coloured stone**, and the cause was hue, not value: the materials' hue is leaned 70% toward stone (`mosaicFill`), and the voids used the palette's raw hue. In the fan's own stone-leaned hue they read as the same rock in shadow. Icy voids are unchanged.

**The user also settled §7 after U1** — see the revised §7 in [ASTEROID-OVERHAUL.md](../archive/ASTEROID-OVERHAUL.md). Smoothing the voids' edges was considered and dropped: what reads as pointy is the fragments' corners, and rounding those would turn the field from shards to pebbles.

## Still open, for the user's eye

- **Does the high-Cohesion mosaic read flat?** If so, §9's radial value gradient in the fan is the reversible first try.
- **Ice colour and strength** were set on two renders.
- **The breach threshold** (nothing above ~0.5 Cohesion) is a guess at where "brittle" should start being visible.
- Open question 1b (the flat cut across the body's lower portion) is untouched.
