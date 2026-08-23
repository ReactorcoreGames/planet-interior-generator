# Phase 8 — Overlay, scale, polish

*Part of [ROADMAP.md](../ROADMAP.md).*

- Layer-name overlay (underline + 1px leader, names only)
- Scale bar with optional silhouette
- Full keyboard shortcuts
- Settings persistence
- "Copy seed + settings" shareable string
- Per-type stat templates finalised
- ~~Framing & crop~~ — **built early, in Session I.** It was filed here as
  polish because it was conceived as a *crop*, and a crop is polish. Two things
  moved it: it turned out to be the answer to a live annoyance in the Randomize
  loop (the extent problem below), and it turned out to be a three-line patch to
  `makeView` rather than anything expensive. See below.

## Framing & crop — BUILT (Session I)

**Where this came from.** Turning the info card off used to *zoom* the body
rather than re-centre it. That was a defect and was fixed in Session H — but the
accident suggested a real feature. A deliberate close-up is something cutaway
art wants, because the interesting part is often a boundary or a core rather
than the whole disc.

**What shipped.**

| Piece | Behaviour |
|---|---|
| Zoom | `Zoom` slider in **Output**, 1x–20x on a log scale; wheel over the preview zooms about the cursor |
| Pan | Drag the preview. Stored in body radii, not pixels, so it means the same thing at any zoom on any screen |
| Reset | `Reset framing` returns to 1x centred. Zooming back out to 1x also unwinds the pan |
| Export | Every body export renders the framed view — `renderTo` already passes settings through, so this needed no export code |

**The whole feature is three numbers patched into `makeView`.** Every drawing
routine reaches pixels through `view.px/at/lw/fs`, so `R`, `cx` and `cy` are the
only things framing touches. Nothing in `draw/` knows it exists.

**Framing is a VALUE, not a MODE.** Zoom 1 with no pan is byte-for-byte the old
render, so there is no state to be in wrongly and nothing to remember while
"off". The frame guide keys off a derived `isFramed()` rather than a stored
flag, so it cannot disagree with the picture.

**The constraints held.**

- **Resolution independence.** Zoom moves `R` and the centre; no count consults
  either. domtest asserts the op count is identical at 1x, 5x and 20x — the
  same guarantee the 360p/2160p test makes, against the other axis.
- **Output stage.** Framing appears in no cache key, so panning cannot re-roll
  an element. Tested.
- **Survives the settings string.** Three keys ride along automatically.
- **The guide is preview-only** — drawn in `main.js` after the scene, never in
  `draw/`, so no export path can reach it.

**The open questions, settled.**

1. **Randomize does not clear framing.** A fixed close-up across twenty rolls is
   exactly the workflow this enables. Free to implement: Randomize rolls from an
   explicit allowlist these are simply not on.
2. **Framing is a centre offset, not a crop.** The whole body is drawn through
   the framed transform and the canvas clips what leaves. A wider export shows
   more of the body's flanks rather than letterboxing a square. There is no crop
   step. The composed export still fits the whole disc, since the card's layout
   assumes a centred body.
3. **Ceiling is 20x.** Past ~10x the vector detail runs out and the render reads
   as smooth bands. Kept deliberately: an abstract strata close-up is a useful
   base for an artist working over the top of it.

**The background does not pan or zoom.** Starfield, gradient and solid all stay
fixed, like paper under a diagram. Scaling the starfield with zoom was
considered and rejected — at 20x it becomes a white smear, and fixing that would
have needed a compensating shrink and a density falloff. `drawBackground` never
sees the view, and that seam is worth keeping.

## The extent change — the larger half of this work

`extent` — how far out rings, coronae and atmosphere reach — used to divide into
`R`, and so **was accidentally a zoom control**, the second thing in
`draw/canvas.js` to have been one.

A ringed world was drawn *smaller* than a bare one. That is backwards: a ring
cropped by the frame reads as vast, a ring shrunk to fit reads as a decal. Worse,
it made composition depend on a trait roll, so Randomize kept returning planets
too small to read — and the workaround was to go and **exclude rings in the trait
menu**, a display defect driving a change to the body itself.

`extent` no longer sizes anything. Every body is drawn at the same scale, rings
run off the frame edge, and framing the rings *instead* of the planet is now a
choice the user makes rather than one a trait roll makes for them. What `extent`
still does is bound the pan clamp, measured to the outermost element rather than
the 88th percentile — as a clamp, fencing the user off from the furthest-out
elements would exclude exactly the ones worth panning to.

**Deferred:** richer ring and debris detail for close-ups. Worth revisiting
alongside megastructure traits, which will want detail at zoom for their own
reasons.
