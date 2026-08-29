# Session I — Framing, the background stack, and orbital material

*Zoom and pan, pulled forward from Phase 8; then the background rebuilt as a
stack rather than a mode; then the debris belt made visible against any sky.
D69–D113.*

> Extracted from PROGRESS.md, where this section had grown to 219 lines —
> 46% of a file whose job is to say what is built and what is next. The
> decisions are unchanged; only their location is.

---

## The decisions

- [x] **zoom and pan** (D69) — 1x–20x log slider, wheel-to-cursor, drag-to-pan,
      `Reset framing`. The entire feature is three numbers patched into
      `makeView`; nothing in `draw/` knows it exists
- [x] **framing is a value, not a mode** (D70) — zoom 1 with no pan is the old
      render byte-for-byte, so there is no "off" state to be in wrongly and the
      frame guide's visibility is derived rather than stored
- [x] **`extent` is no longer a zoom control** (D71) — the second thing in
      `draw/canvas.js` to have been one. It used to divide into `R`, so a ringed
      world was drawn *smaller* than a bare one and Randomize kept returning
      planets too small to read. Every body is now drawn at the same scale;
      `extent` only bounds the pan clamp
- [x] **the background does not pan or zoom** (D72) — a cutaway's backdrop is
      paper, not sky. Parallax was considered and rejected: at 20x a scaled
      starfield is a white smear
- [x] **pan is a CSS-hidden number input, never `type="hidden"`** (D73) — on a
      hidden input `defaultValue` mirrors `value` live, so the settings-string
      sweep would have skipped pan every time. Framing would have *appeared* to
      share correctly while silently losing half of itself. Caught by a
      round-trip test, not by reading the code
- [x] **the background is a STACK, not a mode** (D94) — a base colour, an
      optional field (gradient / nebula), and stars as an *overlay checkbox*.
      As four exclusive modes, "stars over a blue sky" was unreachable and the
      colour picker sat greyed out under Starfield while the starfield was in
      fact painting over that very colour. Splitting the stack is what makes
      stars-over-nebula fall out for free instead of needing its own menu
      entry — the menu was about to grow combinatorially
- [x] **`"starfield"` still works as an INPUT** (D95) — it means solid + stars,
      which is exactly what it always drew, so old presets and old share links
      keep rendering the picture they described. Translated in `Controls.set`
      rather than at each caller, because setting a `<select>` to an option it
      no longer has leaves it *blank* rather than erroring — a stale value
      would have produced an empty control and a default render, reported by
      nothing
- [x] **the gradient takes two colours and an angle** (D96) — one picker plus a
      hard-coded shade of itself is not a gradient, it is a vignette. Randomize
      rolls the second colour as a *relation* to the first (near-analogous most
      of the time, occasionally a deliberate two-tone) because two free hues
      clash about as often as they pair
- [x] **the nebula samples on a JITTERED lattice** (D97) — three things had to
      be fixed before it read as gas rather than as wallpaper. Blobs must
      overspill their cell generously or the corners between four of them stay
      unpainted and the sampling grid becomes the texture; each blob needs a
      radial falloff or the discs scallop where they cross; and even then the
      regular centres show through in the sparse regions, so every sample is
      displaced off the grid. `lighter` compositing accumulates the veils, at
      an alpha low enough that the cores stay *coloured* instead of clipping
      to white
- [x] **a missing noise library THROWS** (D98) — `drawNebula` reads
      `SimplexNoise` off whichever global exists, and raises if it finds none.
      An early version returned quietly, which left the flat base fill behind
      and looked exactly like a nebula that had rendered and happened to be
      subtle. The failure was invisible in the picture, which is the worst way
      for it to fail; the headless harnesses now set `sandbox.window` because
      the vendored library publishes itself only there
- [x] **a background control must not be able to black out the render** (D99) —
      `createLinearGradient` THROWS on NaN coordinates rather than failing
      quietly, so a non-numeric gradient angle would abort the frame mid-draw.
      The angle and the star density are now coerced through `parseFloat` with
      a finite fallback. Hardening worth keeping, but note it was NOT the cause
      of the reported blank screen — see D104, which was
- [x] **a disabled row greys its control, not its lock** (D100) —
      `.control-row.disabled` set `pointer-events: none` on the whole row,
      which took the LOCK down with it. A greyed row is exactly when a user
      reaches for its lock — pinning the gradient angle while the background is
      Solid — and it was dead to the click with no sign of why. The control was
      already unclickable through its own `disabled` attribute, so the row rule
      was never what disabled it
- [x] **the background numbers roll, and the colours reach a lit range** (D101)
      — Gradient angle and Star density joined `RANDOM_SPEC` and gained locks.
      The two colours were already rolling, but inside a 0.045–0.10 value band
      that is near-black on every roll, so the controls looked broken. Three
      rolls in four still land dark, because a bright backdrop turns the
      picture into a colour clash; the fourth now reaches a genuinely lit sky
- [x] **the nebula core is brightened in HSV, never toward white** (D102) —
      `shadeHex` with a positive amount mixes with white, which raises value
      and destroys SATURATION together: a picked orange rendered as warm grey,
      so the second picker read as timid whatever was put in it. Measuring the
      rendered pixels against the picked colour is what found it — the cores
      were reaching barely half the luminance of the colour they were supposed
      to BE. Lifting value while holding hue and saturation fixed it, with a
      floor so a very dark colour 2 still out-reads the voids
- [x] **Transparent shows a checkerboard** (D103) — it used to read as plain
      black, indistinguishable from a solid black background, so a user could
      not tell the setting had taken. The squares are painted in CSS BEHIND the
      canvas rather than drawn into it, which is what keeps the promise
      Transparent makes: the exported PNG still carries real alpha, because
      those pixels were never part of the render
- [x] **the hidden lock checkbox must sit inside its own lock** (D104) — this,
      not the gradient angle, is what blanked the app. `.lock input` is
      `position: absolute` with no offsets, so it resolved against the nearest
      POSITIONED ancestor — `#preview`, on the other side of the page. Each
      input therefore lived nowhere near the icon representing it, and clicking
      the icon made the browser scroll that phantom position into view: the
      whole app slid up and cropped, and locks further down the panel pushed it
      entirely off screen. `html, body { overflow: hidden }` left no scrollbar
      to drag back, and the scroll survived F5 — only a hard reload, which also
      reset the checkboxes, appeared to fix it, which is what made it look like
      a crash. There was never an exception, which is why the console was
      clean. `position: relative` on `.lock` plus `inset: 0` on the input pins
      it to its icon; `html, body` is now pinned to the viewport so a stray
      scroll has nowhere to go
- [x] **a per-roll cap became a distribution check** (D105) — the background
      darkness test failed any roll over 0.20 luminance, which was correct
      while the colour was pinned near-black. Once one roll in four
      deliberately reached a lit sky (D101), that cap made the suite fail about
      half the time depending on what came up: a working feature reported as
      broken, exactly the false correction PROGRESS.md warns about. It now
      asserts what is still true — no roll fights the body (0.45 ceiling), and
      dark is the majority case — measured over enough rolls to be a
      distribution rather than a coin flip
- [x] **the nebula control is CLOUD SIZE, and the other two candidates were
      both redundant** (D106) — the request was "nebula density", and density
      has three plausible readings. Two of them are already reachable: the
      per-blob ALPHA is how STRONG the gas is, which the pickers set and which
      at the low end turns the whole frame evenly murky and washes the colour
      out of the cores (the D102 failure arriving through a control this time);
      and the SPARSITY EXPONENT is how much of the frame the gas covers, which
      is already a consequence of choosing darker or brighter nebula colours,
      so a slider for it duplicates the two pickers. Only the NOISE FREQUENCY
      changes something neither picker can reach — the physical size of the
      clouds, from fine mottled filaments to a few vast billows. It is also
      free: the sample count is COLS × ROWS whatever the frequency, so big
      clouds cost exactly what small ones do. Both the alpha and the exponent
      stay constants
- [x] **all three noise octaves scale by ONE factor** (D107) — their RATIOS are
      what make the field read as gas rather than as marbling: smooth mass, a
      mid band, and a ridged octave for filaments (D97). Moving one alone would
      not resize the clouds, it would rebalance the texture into mush or into
      static. Scaling them together is a zoom of the whole field, which is the
      only version of "bigger clouds" that stays a nebula. The span is ±2.4x
      around the authored figures, trimmed at both ends because further out
      stops reading as a nebula at all — one flat colour wash below, filaments
      under the blob radius above. Labelled "Nebula cloud size", not
      "…density": it sits two rows from Star density, and two adjacent controls
      both ending in "density" are misread at a glance. It rolls at 15–85, with
      no floor to keep off — unlike a starfield, every value here draws the
      same AMOUNT of gas, so no roll can produce the "it failed to render"
      picture D98 guards against
- [x] **a debris belt is separated by a RIM, which is a mark stars do not
      have** (D108) — the fragments already had a lit face, a dark face and
      grain, and were still lost against a starfield, because at three pixels
      across all of that internal contrast averages back out to one dull dot,
      which is precisely what a faint star is. Every previous attempt tuned the
      rocks' *tone* against one background and broke the other. The fix is a
      different KIND of mark: one bright arc along the sunward edge. No star in
      this renderer has an EDGE, so a crescent is a shape the background plate
      cannot produce at any size. It is allowed to reach near-specular
      brightness precisely because it is a LINE and not a face — the rock stays
      dim and murky overall and gains an outline, where a face that bright
      would turn the fragment back into the pale dot being fixed
- [x] **the rim must be the ROCK'S OWN OUTLINE, not an arc near it** (D108a) —
      the first version stroked a circular arc at a fixed radius and a fixed
      screen angle. A chunk is an irregular polygon whose corners reach
      different radii, so a circle drawn near its mean radius cuts inside the
      long corners and floats clear of the short ones: the result read as a
      detached crescent hovering beside each rock — a second object rather than
      a lit edge, and worst on the largest fragments where there is most room
      for the outline to disagree with a circle. Only visible up close, which
      is why it shipped past a whole-frame check and was caught by the user
      zooming in. It now walks the same vertices `facePath` builds the
      silhouette from and keeps the run of edges whose outward normal faces the
      light. A lit edge has to BE the edge
- [x] **the haze band is what actually fixes it, because it is background-
      independent** (D109) — a very low-alpha band of dust laid down before the
      rocks gives every fragment the same local ground to be seen against,
      whatever is behind it. That is the real repair: it works against
      starfield, nebula and empty space alike rather than being tuned per
      background, so the contrast becomes a property of the trait instead of
      of a user setting that can be changed. 0.16 alpha was tried and rendered
      as a grey shell competing with the body — a ground the eye resolves as a
      thing has stopped being a ground — so it runs at 0.055
- [x] **the haze is NOT flattened to the ring plane** (D110) — matching
      `ring-band`'s 0.26 squash looked obviously right and rendered a grey disc
      lying behind nothing, with the rocks scattered clear of it across the
      whole frame. Scattered orbital instances are placed on FULL-CIRCLE
      angles, so a debris belt is a spherical shell in this renderer and not a
      disc; matching the ring's projection was matching the wrong trait. The
      band now takes its shape and its radii from the same place — where the
      elements actually are — which is also what generalises it: a family that
      one day places orbital material on a real plane moves the haze by moving
      its elements, with nothing to update in `draw/`
- [x] **stars are dimmed with the SKY'S OWN COLOUR, never with
      `destination-out`** (D111) — the belt is in front of the sky, so stars
      behind it should not shine through at full strength, and the haze cannot
      do it at the alpha it has to run at. `destination-out` was the obvious
      tool and was badly wrong: it does not dim the sky, it DELETES it. The
      belt came out as a band of real transparency punched through the
      background, showing as an enormous grey wedge and leaving a hard seam
      along the front-half clip rectangle. Washing the background's own base
      colour back over the belt pulls whatever is there toward the empty sky
      around it — stars fade, nebula cores fade, empty sky does not change —
      and it is a colour operation, so alpha stays the property of Transparent
      mode alone (D103). Skipped when there is no sky of ours to repaint:
      Transparent, and a composed export whose scene is not ours to assume
- [x] **draw/ gets the registry split the data files already had** (D112) —
      `primitives.js` (1373 lines) and `zonepaint.js` (946) were the two worst
      breaches of the 500-line rule, and both had a real seam rather than
      merely a byte count. `primitives.js` split at what is INSIDE a body's
      silhouette versus what is beyond it or belongs to one family:
      `primitives/orbital.js` took ring-band, chunk, storm, capsule, shard and
      voronoi. `zonepaint.js` split by WHICH FIELD each concern asks —
      `zonepaint/sea.js` took the cold sea, which consults the climate field,
      leaving behind the two that consult the angular zone field. Both seams
      were verified to have zero cross-dependencies before the cut, which is
      what made them the right places to cut. Following data/traits/,
      data/elements/, data/archetypes/ and gen/stats/ rather than inventing a
      shape: a registry that owns the dispatch table plus files that register
      into it, so a new group of primitives is a new file and a script tag with
      nothing to edit in the registry
- [x] **a duplicate primitive kind THROWS** (D113) — `register` refuses a kind
      already in `KINDS`. Two files claiming one name is a mistake in every
      case (a copied block, a rename that missed one), and the failure it would
      otherwise produce is the worst kind: the body still renders, with one
      primitive quietly drawn as another, reported by nothing. Same reasoning
      as D98, and the same reason `zonepaint/sea.js` takes its two maths
      helpers from the namespace rather than carrying a copy — a copy is two
      definitions of the same curve, free to drift apart

