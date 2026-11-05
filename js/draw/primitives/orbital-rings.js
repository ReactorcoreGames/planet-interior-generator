/* Rings — a rocky world's sparse debris ring and a giant's ringlet sheet.
 *
 * Split out of draw/primitives/orbital.js, which passed the 500-line rule; these
 * draw BEYOND the body, at orbital radii. A rocky world rolling a debris belt
 * draws the same marks a giant's trait does, because nothing here knows which
 * trait asked.
 *
 * THE SAME RULES APPLY HERE AS IN draw/primitives.js. No role names, no
 * archetype names, one signature, and pixels only through `view`.
 *
 * Registered into CC.Primitives, so `KINDS` stays one table and draw/details.js
 * still has exactly one place to look a kind up. draw/primitives.js must load
 * first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = CC.Math.TAU;

  /* ---- ring-band --------------------------------------------------------- */

  /* A concentric band beyond the body — ring systems.
   *
   * Drawn as a flat ellipse rather than a circle, because a ring seen from a
   * cutaway's viewpoint is edge-on-ish: a perfect circle would read as a halo
   * rather than as a disc of orbiting material. The squash is fixed rather
   * than rolled so every ring in a system shares one orbital plane, which is
   * most of what makes them read as a system.
   *
   * `el.gap` marks a division — drawn at much lower alpha rather than skipped,
   * so a gap reads as a thinning rather than as a missing band. */
  function ringBand(ctx, view, el, style) {
    var r = view.px(el.radius);
    var w = Math.max(0.6, view.px(el.size));
    var squash = 0.26;

    ctx.save();
    ctx.translate(view.cx, view.cy);
    ctx.scale(1, squash);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.strokeStyle = style;
    /* Divided by the squash so the stroke stays visually the authored width
     * rather than being flattened along with the geometry. */
    ctx.lineWidth = w / squash;
    ctx.stroke();
    ctx.restore();
  }


  /* ---- ringlet-band ------------------------------------------------------ */

  /* A GIANT'S RING, which is a different object from a rocky world's.
   *
   * WHY THIS EXISTS AT ALL. `ring-band` draws one flat uniform ellipse per
   * band, and it was the mark for a ring around a planet, a giant and (until
   * it was gated) a moon alike. Drawing the same object at the same radii on
   * three body types made all three read as one body with different fills —
   * the vocabulary problem D76/D160 keep surfacing, arriving from the
   * direction of sameness rather than of invisibility. A mark that means the
   * same thing everywhere stops distinguishing anything.
   *
   * The physical difference is real and is what this draws. A rocky world's
   * ring is sparse debris — a few diffuse bands, which is what `ring-band`
   * already says well. A giant's is the Saturn case: an enormous, dense,
   * SHARPLY STRUCTURED sheet, resolved into hundreds of individual ringlets
   * with knife-edge divisions between them. The structure IS the object.
   *
   * Three things `ring-band` cannot say, and each is one of the three passes
   * below:
   *
   *   1. RINGLETS. The band is not one stroke but a bundle of finer ones at
   *      slightly different radii and alphas. This is the density thesis
   *      applied to a single mark — more, smaller, fainter — and it is most
   *      of what separates the two silhouettes at a glance.
   *   2. A KNIFE-EDGE DIVISION. A giant's gaps are sharp, not gradual: the
   *      Cassini division is a hard edge, because a resonance sweeps a band
   *      genuinely empty. `el.gap` therefore draws a CLEAN break with bright
   *      shoulders either side, rather than `ring-band`'s low-alpha thinning
   *      — which is the right reading for scattered debris and the wrong one
   *      here.
   *   3. THE PLANET'S SHADOW. A dense ring is lit by the star and the body
   *      occludes part of it, so the far side runs into shadow. Nothing else
   *      in the generator casts one, and it is what makes the ring read as a
   *      lit SHEET rather than as a drawn circle.
   *
   * Same signature and same `view`-only pixel access as every other
   * primitive. It names no role and no archetype: a trait asks for it by
   * kind, and this file does not know which body rolled that trait. */
  function ringletBand(ctx, view, el, style) {
    var r = view.px(el.radius);
    var w = Math.max(0.6, view.px(el.size));
    /* The same squash as `ring-band`, deliberately: a giant's rings are a
     * different OBJECT, not a different orbital plane, and two families
     * disagreeing about the viewing angle would read as a drawing error. */
    var squash = 0.26;

    /* How many ringlets this band resolves into. Tied to the band's own drawn
     * width so a thick band is genuinely more structured rather than the same
     * count stretched — a wide band with three strokes in it reads as three
     * rings, not as one dense one. Capped, because past a point they overlap
     * into a solid fill and the structure is lost again. */
    var n = Math.max(3, Math.min(9, Math.round(w / 1.6) + 3));

    ctx.save();
    ctx.translate(view.cx, view.cy);
    ctx.scale(1, squash);

    if (el.gap) {
      /* A DIVISION IS A CLEAN BREAK WITH BRIGHT SHOULDERS.
       *
       * Two thin, brighter strokes at the band's edges and nothing between
       * them. A resonance does not thin a ring, it empties it — and the
       * material piles up at the boundaries, which is why the shoulders are
       * brighter than the ringlets they sit beside rather than dimmer. */
      ctx.strokeStyle = style;
      ctx.lineWidth = Math.max(0.5, w * 0.22) / squash;
      var half = w * 0.5;
      for (var g = -1; g <= 1; g += 2) {
        ctx.beginPath();
        ctx.arc(0, 0, r + g * half, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    ctx.strokeStyle = style;
    for (var i = 0; i < n; i++) {
      /* Spread across the band's own width, and never all at one alpha: a
       * bundle of identical strokes is a solid fill with extra draw calls.
       * The variation is deterministic in `i` rather than rolled, so this
       * costs no RNG and redraws identically — colour must never re-roll
       * geometry (gen/details.js's standing rule). */
      var t = n === 1 ? 0.5 : i / (n - 1);
      var off = (t - 0.5) * w;
      /* A cheap deterministic wobble so the ringlets are not evenly spaced —
       * evenly spaced reads as a printed scale. */
      var jitter = Math.sin(i * 12.9898 + r * 0.031) * w * 0.16;

      ctx.lineWidth = Math.max(0.4, w * (0.10 + 0.09 * (1 - Math.abs(t - 0.5) * 2))) / squash;
      /* Brightest in the middle of the band, falling off at its edges, so a
       * band has a core rather than being a slab. */
      ctx.globalAlpha = 0.45 + 0.55 * (1 - Math.abs(t - 0.5) * 2);
      ctx.beginPath();
      ctx.arc(0, 0, r + off + jitter, 0, TAU);
      ctx.stroke();
    }

    /* THERE IS NO RING SHADOW, AND THAT IS THE CONSIDERED ANSWER.
     *
     * One was drawn here: a `destination-out` wedge for the body occluding
     * its own rings, on the reasoning that Saturn's shadow is a real and
     * striking feature and that it makes a ring read as a lit SHEET rather
     * than as a drawn circle. It was removed, for a reason that outlives the
     * bug it also caused.
     *
     * THIS PICTURE HAS NO LIGHT SOURCE. It is a CROSS-SECTION: the body is
     * cut open and its interior is drawn directly, and nothing else in the
     * generator casts a shadow or agrees on where a star is. A shadow answers
     * a question the image never asks, and its direction was necessarily
     * arbitrary — the same error the great storm's note records from the
     * other direction, where a top-down cyclone was drawn into a side-on cut.
     * A mark has to be in the projection the picture is actually in.
     *
     * It caused a defect too, which is worth recording because it is the kind
     * that hides: the wedge was a pie slice with its apex at (0,0), the
     * body's CENTRE, and `destination-out` erases whatever is already on the
     * canvas rather than only the ring. So it cut a triangular hole through
     * every layer of the planet down to the background, once per band,
     * compositing to opaque — a BLACK RAY out of the middle of a gas giant.
     * That was fixable (clip to the band's annulus, start at the limb), and
     * it was fixed before this decision was taken; the mark is gone on the
     * projection argument, not because it was hard to draw.
     *
     * WHAT SEPARATES THE TWO RING FAMILIES IS MATERIAL, NOT LIGHTING — see
     * the trait declarations in data/traits/orbital.js. `el.shadow` may still
     * be present on an element; nothing reads it. */

    ctx.restore();
  }

  CC.Primitives.register({
    "ring-band": ringBand,
    /* A giant's ring is a different OBJECT from a rocky world's — resolved
     * ringlets, knife-edge divisions, and the body's own shadow across it.
     * See ringletBand. */
    "ringlet-band": ringletBand
  });
})();
