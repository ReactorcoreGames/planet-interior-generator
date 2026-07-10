# planet-interior-generator

Web app to create cool planet interior illustrations for world building, scifi, etc.

## Celestial Cutaway

A fully offline, single-folder web app that generates stylized 2D
cross-section illustrations of a celestial body's interior. No build
step, no server, no network — just open `index.html` in a browser
(double-click works via `file://`).

## Features

- **One shared rendering engine** draws concentric interior layers whose
  boundaries are perturbed by seeded value noise + sine harmonics, so
  every stratum looks organic rather than like a perfect target. The
  engine is parameterized by a *body profile*; nothing is reimplemented
  per body type.
- **Four body types**, each just a profile fed to that engine:
  - *Rocky / Terrestrial* — solid glowing core, banded mantle strata,
    thin speckled crust, optional ocean/ice arcs, atmospheric haze.
  - *Gas Giant* — swirled/banded cloud-realms, no crust, optional
    tilted multi-band ring, deep bright core.
  - *Young Star* — brilliant convective core with radial spokes,
    turbulent plasma shells, corona glow, limb flares.
  - *Old Star (Red Giant)* — small fierce core wrapped in bloated,
    translucent, wispy exhaled shells with a dim corona.
- **UI**: live 16:9 preview, body-type selector, seed, per-type palette
  choices, boundary-wobble and layer-richness sliders, name field,
  adjustable export resolution (default 720 px vertical), and a
  **Randomize** button with 🔒 lock checkboxes so any parameter can be
  held fixed while the rest re-roll.
- **Lore panel**: a flavor-text stat card (age, temperament, strata
  count, seas/rings/flares, a closing quote) generated from the same
  seed and reflecting the body's actual generated features.
- **Two export modes** (both scale from the chosen resolution):
  - 16:9 PNG — cutaway illustration plus the lore panel on the right.
  - 1:1 PNG — the body alone on a fully transparent background.

## Files

- `index.html` — page structure and controls
- `style.css` — UI styling
- `script.js` — RNG/noise, profiles, the shared engine, lore, exports

No external libraries.
