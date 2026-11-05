/* The gaseous family's style sets — a storm's tones, a pressure hull's and a
 * gem's.
 *
 * Split out of draw/details.js, which passed the 500-line rule. Attached to
 * CC.DrawDetails; draw/details.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;

/* ---- the gaseous family's style sets ---------------------------------- */

  /* A STORM'S TONES — and it is drawn TRANSLUCENT, over the body's own detail.
   *
   * Three complaints shaped this. "Pale" is answered by pushing saturation
   * hard rather than through the `glow` tone, which pulls saturation and is
   * exactly wrong: a great storm is the most SATURATED thing in the envelope.
   * "Flat and textureless" is answered by the primitive's fBm turbulence.
   * "Opaque" is answered here — the storm must not be a lid, the banding and
   * the layer's own detail have to read faintly through it.
   *
   * `top` and `bottom` are the ends of the depth gradient: the part of the
   * storm nearer the cloud tops against the part reaching deeper. Deeper is
   * darker and more saturated, which is both what pressure does and what
   * makes the patch read as having volume rather than being a decal.
   *
   * THE BLEND IS CHOSEN BY THE LAYER'S OWN VALUE. `multiply` on a light band
   * darkens and saturates, which is what weather does to a bright cloud deck;
   * on an already-dark band it goes to mud, so a dark layer gets `overlay`,
   * which pushes contrast in both directions and keeps the storm legible
   * either way. */
  function stormFill(colour, el, alpha) {
    var seed = el.seed || 0;
    var vary = Math.sin(seed * 91.7);
    /* Storms carry their own colour, drifted from the band they sit in — a
     * real one is stained by chromophores the surrounding cloud has not
     * brought up. Signed, so a belt is not all one hue. */
    var hue = colour.h + vary * 26;
    /* SOFTER THAN THE FIRST PASS. "Pale" was answered by pushing saturation to
     * 1.40x with a 0.34 floor, and that overshot: a small storm at high
     * saturation against a high-contrast gradient reads as a solid mineral
     * lump rather than as weather. Gas is not a saturated material — what
     * makes a storm read is its SHAPE and its churn, not its chroma. */
    var sat = clamp(colour.s * 1.12 + 0.10, 0.20, 0.72);
    var light = colour.v > 0.5;

    return {
      /* THE VALUE RANGE IS NARROWER TOO, for the same reason. A bright top
       * against a near-black bottom is the contrast of a lit solid; weather
       * is a gentler gradient through a translucent volume. */
      top: CC.Color.hsva(hue + 5, clamp(sat * 0.88, 0, 1),
                         clamp(colour.v + 0.14, 0, 1), 1),
      /* Deeper: darker and a little more saturated. */
      bottom: CC.Color.hsva(hue - 8, clamp(sat * 1.10, 0, 1),
                            clamp(colour.v * 0.68, 0.03, 1), 1),
      /* The turbulence strokes. Mid-toned on purpose — the blend supplies the
       * contrast, so a strong colour here would fight it. */
      turb: CC.Color.hsva(hue - 4, clamp(sat * 1.05, 0, 1),
                          clamp(colour.v * (light ? 0.66 : 1.28), 0.05, 1),
                          0.48),
      /* THE RIM PAIR, for the soft edge and the spanning fade. `rim` is the
       * LAYER'S OWN colour — painting it back over the storm's perimeter is
       * what makes the edge dissolve into its surroundings — and `rimClear` is
       * the same colour at zero alpha, so the gradient between them is a clean
       * fade rather than a shift through grey. See the storm primitive for why
       * this is a paint rather than an erase. */
      rim: CC.Color.hsva(colour.h, colour.s, colour.v, 1),
      rimClear: CC.Color.hsva(colour.h, colour.s, colour.v, 0),
      blend: light ? "multiply" : "overlay",
      /* TRANSLUCENT. The element's authored alpha, held below opaque so the
       * structure behind always shows. */
      alpha: clamp(alpha * 0.80, 0.10, 0.85)
    };
  }

  /* A PRESSURE HULL'S FOUR TONES — metal, and it has to read as metal.
   *
   * The platforms drawn as `chunk` looked like rocks, and rock-vs-metal is
   * mostly a question of how the light behaves: stone is low-chroma and
   * diffuse, metal has a narrow bright specular band and a dark shadow with
   * very little between them. So the lit stop is pushed hard toward white and
   * the shade stop hard toward black, with the hull colour itself held at low
   * saturation. A wide value range at low chroma is what "machined" looks
   * like.
   *
   * DELIBERATELY NOT DERIVED FROM THE LAYER'S HUE, except as a faint tint.
   * Everything else in the picture takes its colour from the material around
   * it, and industry is the one thing that does not belong to the planet — a
   * hull is the same grey-white whatever it is floating in, and that
   * independence is precisely what makes it read as an intruder. */
  function hullFill(colour, el, alpha) {
    var seed = el.seed || 0;
    /* A faint tint of the surroundings, so it still sits in the picture. */
    var hue = colour.h + 4;
    var sat = clamp(colour.s * 0.22 + 0.04, 0.03, 0.20);
    var v = 0.62 + Math.sin(seed * 51.3) * 0.06;
    /* `dim` — a hull with no power and no paint left: a derelict. Absent on
     * every other hull. */
    if (el.dim !== undefined) v *= el.dim;
    /* `paint` — a livery, {h, s}: a working fleet's own colour, so it is not
     * mistaken for the grey of anything else built (gen/diffuse-pockets.js). */
    if (el.paint) { hue = el.paint.h; sat = el.paint.s; v = el.paint.v; }

    return {
      hull: CC.Color.hsva(hue, sat, v, alpha),
      lit: CC.Color.hsva(hue, clamp(sat * 0.5, 0, 1),
                         clamp(v + 0.34, 0, 1), alpha),
      shade: CC.Color.hsva(hue, clamp(sat * 1.5, 0, 1),
                           clamp(v * 0.34, 0.03, 1), alpha),
      /* The outline and the section joins — near-black, so the silhouette is
       * hard against whatever it is drawn on. */
      trim: CC.Color.hsva(hue, clamp(sat * 1.2, 0, 1),
                          clamp(v * 0.20, 0.02, 1), alpha)
    };
  }

  /* A GEM'S THREE TONES, plus a blend.
   *
   * A diamond is not a coloured object, it is a TRANSPARENT one — what you see
   * is the fluid behind it, brightened and split. That is why the blend mode
   * matters more here than anywhere else: drawn opaque, a field of these was
   * "an asteroid ring in the middle of the planet". Drawn with `screen`, each
   * shard lightens what is behind it and reads as something you can see
   * through.
   *
   * High value, low-to-mid saturation, and a hue pushed toward the cold end —
   * a diamond's fire is blue-white, not the colour of the soup it is falling
   * through. */
  function gemFill(colour, el, alpha) {
    var seed = el.seed || 0;
    /* Toward the cold-bright end, keeping a trace of the surroundings so the
     * stones belong to this world. */
    var hue = CC.Palette.mixHue(colour.h, 200, 0.55) + Math.sin(seed * 71.3) * 22;
    var sat = clamp(colour.s * 0.30 + 0.10, 0.06, 0.38);

    /* BIREFRINGENT CRYSTAL — chromatic, but within one body's own band.
     *
     * `chromaSpread` is the width in degrees of the hue range THIS BODY's
     * crystals occupy; `chromaBase` is where that band starts, rolled once per
     * body in the generation stage. Each crystal takes a position within it
     * from its own seed.
     *
     * Rolling the whole wheel per crystal was the obvious version and it is
     * wrong twice: a field of every colour reads as confetti rather than as a
     * material, and it makes every body identical because every body shows the
     * full spectrum. A narrow band per body gives one world cyan-through-
     * violet and the next amber-through-rose, so the crystals are chromatic
     * AND each world still reads as one place. */
    if (el.chromaSpread) {
      var pos = (Math.sin(seed * 127.7) * 0.5 + 0.5);
      hue = (el.chromaBase || 0) + pos * el.chromaSpread;
      /* Saturated enough to read as coloured light rather than as tinted
       * glass, but still short of a solid — these are transparent. */
      sat = clamp(0.34 + pos * 0.30, 0.20, 0.68);
    }

    return {
      body: CC.Color.hsva(hue, sat, 0.72, alpha * 0.85),
      /* The inner refraction: brighter and cleaner than the body. */
      facet: CC.Color.hsva(hue + 12, clamp(sat * 0.6, 0, 1), 0.90, alpha),
      /* The glint: effectively white. */
      glint: CC.Color.hsva(hue + 20, clamp(sat * 0.25, 0, 1), 1.0, alpha),
      /* `screen` lightens what is behind rather than replacing it, which is
       * the whole of "this is transparent". */
      blend: "screen"
    };
  }

  CC.DrawDetails.stormFill = stormFill;
  CC.DrawDetails.hullFill = hullFill;
  CC.DrawDetails.gemFill = gemFill;
})();
