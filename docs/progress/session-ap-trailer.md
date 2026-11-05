# Session AP — the YouTube trailer

*D338–D340. The video is `trailer/celestial-cutaway-trailer-1080p.mp4`, gitignored. Publishing it is the user's. No file the app ships changed.*

**The result is 69.6 seconds at 1920x1080, 30 fps, 74 MB.** The user watched the preview and accepted it as it was: "looks/feels awesome, well paced and beautifully animated too". The copy is in `promo.md`: title, description, tags, thumbnail and a note on the music.

**D338: the trailer is real renders, frame by frame, not pans across the `promo/` stills.** Zoom and pan only move `R` and the centre, so the same elements stay in the same places at every frame. A probe of frame-to-frame differences found no popping, which is what makes a slow push or a 20x dive possible at all, and it backs up the copy's "redrawn sharp at every size". Slider sweeps are less even: Interior heat showed a couple of small jumps, which read as a real slider being dragged.

**D339: the music plays straight through from its start and fades out with the video.** A first plan spliced to the track's real ending so the two would end together, and the user rejected it before it was rendered: no skips. The track is 2:00, so the last 1.5 seconds fade along with the picture. It is a steady 112 BPM (0.534 s a beat), so every cut sits on a beat from `librosa`'s beat tracking, a Python package already on this machine and not part of the project.

**D340: the final is 1080p, not 4K.** The proposal was 4K, and the user turned it down as too heavy. The titles and GUI were already captured at 4K, so at 1080p they are downscaled rather than stretched. Nothing was ever rendered at 4K beyond those assets.

**The music stays out of the repo.** The track is "The Coming Storm" by Ethan Meixsell, from the YouTube Audio Library. As the user quoted it, the licence allows monetized videos and needs no attribution, but forbids distributing the file apart from the video that uses it. So `trailer/` is gitignored, and neither it nor the video ships in the zips. The description carries no credit.

**The tooling was `ffmpeg`, approved by the user and already installed,** plus real Edge and `@napi-rs/canvas` as before. All of it is dev-side, and nothing reached `index.html` or the zips. Bodies are `@napi-rs/canvas` renders; all titles, GUI captures and the fact card and labels exports are real Edge (D331). The titles go through the promo images' own `stamp()`, so type and pink match `promo/` (D332). Headless Edge draws no mouse pointer, so one is composited onto the video in the GUI shots. Each segment was piped as raw frames into its own x264 encode (CRF 15, preset slow) and then joined without re-encoding.

## The cut

Lengths are in beats. Bodies are from [session-ao-release.md](session-ao-release.md)'s tables.

| Beats | Picture | Title |
|---|---|---|
| 10 | `fortress-world` / `promo-c`, bodySize 0.74, zoom 1 to 1.14 | PROCEDURAL ART OF PLANET INTERIORS |
| 6 | The fourteen wedges (`promo/18`'s recipe at 4608 px), turning | CELESTIAL CUTAWAY, PLANETARY INTERIOR ART GENERATOR |
| 10 | Real app, `fortress-world` / `red-meridian`, then seven presses of Randomize under the seeded `Math.random` 12345 | ONE CLICK, A NEW BODY |
| 28 | The fourteen collage bodies, 2 beats each, bodySize 0.8, zooming 5% | FOURTEEN BODY TYPES, and each type's name |
| 10 | Real app: Interior heat 12 to 100 on `volcanic-world` / `old-iron`, then Primary hue 20 to 200 on `newborn-star` / `quiet-harbor`, 15 fps | 36 SLIDERS, 58 PRESETS, 70 TRAITS |
| 6 | `half-built-dyson` / `promo-a`, bodySize 0.6, panX -1.5 | ADD MEGASTRUCTURES |
| 6 | `worldship` / `promo-b`, bodySize 0.72, panX -1.25 | MACHINE WORLDS AND WORLDSHIPS |
| 8 | `emission-nebula` + ringworld / `ring-5`, luminosity 100, zoom 1.35 to 6.5, pan to (-0.053, 0.505) | NEBULAE AND RINGWORLDS |
| 8 | `derelict-machine-world` / `long-watch`, composed export from Edge | A FACT CARD FOR EVERY BODY |
| 6 | `volcanic-world` / `old-iron`, labelled export from Edge | LABELLED CUTAWAY DIAGRAMS |
| 6 | `derelict-machine-world` / `promo-b`, zoom 1.2 to 20 about (-0.1, -0.42) | ZOOM IN 20X. EXPORT UP TO 4K. |
| 14 | `newborn-star` / `promo-b`, bodySize 0.72, panX -1.25 | USE THE IMAGES, EVEN COMMERCIALLY |
| 14 | The wedges again, fading out | FREE IN YOUR BROWSER, and the itch.io address |

The seeded Randomize presses rolled a different sequence from `09-ad-one-button`, whose first press started from another state and ran in jsdom; the cause was not looked into. The real app's run gave an old giant, asteroid, moon, main star, nebula, pulsar and moon.

## The clean-up

`docs/roadmap/phase-10-release.md` moved to `old wip/docs-roadmap/`, with its links and the links to it fixed. `CLAUDE.md`'s line on headless Edge no longer points at the removed driver.

**Removed to `C:\trash\20261105-232938-planet-interior-generator-trailer\`:** `shots/ao/`, `test/_tmp/_ao*`, the trailer's own `_tr*` scripts and `shots/trailer/` (titles, captures, segments, beat grid), and the 540p preview. The Edge driver `_aoedge.mjs` and the pipeline are in there if the trailer ever needs a change, until the trash is emptied.
