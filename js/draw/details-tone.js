/* From an element's `tone` to a colour — the zone and heat shifts, and the
 * tone table every style set reads.
 *
 * Split out of draw/details.js, which passed the 500-line rule. Attached to
 * CC.DrawDetails, so no call site is renamed. draw/details.js must load
 * first. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;

  /* Resolve an element's colour from its layer's band colour.
   *
   * Staying in family is what keeps a dense body from looking like confetti:
   * every element is a relative of the material it sits in, never an
   * independent colour.
   *
   * BUT IT MUST ACTUALLY BE VISIBLE. The first pass derived colours a few
   * percent from the band and drew them at 10-20% alpha, and the result was a
   * body that generated 3,600 elements and looked like flat discs. "In family"
   * is a constraint on HUE, not a reason to be invisible: a detail should read
   * as the same material catching the light differently, which means a real
   * step in value.
   *
   * Dark layers are the hard case — a dark band has nowhere to go downward, so
   * detail on it has to lighten or it vanishes. The value step is therefore
   * computed against how dark the layer already is, rather than being a fixed
   * multiplier. */
  /* Apply an element's angular-zone perturbation to its layer's band colour.
   *
   * ZONES PERTURB, THEY DO NOT REPLACE. What arrives on the element is an HSV
   * *delta* resolved in gen/details.js — never a colour and never a zone name.
   * Adding it to whatever the layer rolled is what makes one zone recipe work
   * on a rocky planet, a gas giant and a star alike: a blue world's hot face
   * comes out a hot BLUE, because the blue is the layer's and only the "hot"
   * is the zone's.
   *
   * This is the whole of draw/'s involvement in the zone system. It reads
   * three numbers off an element and knows nothing else about zones — the same
   * relationship this file already has with roles and archetypes. */
  function zoneShift(colour, el) {
    if (!el || !el.zone) return colour;
    var z = el.zone;

    var v = clamp(colour.v + z.v, 0.02, 1);
    var s = clamp(colour.s + z.s, 0, 1);
    var h = ((colour.h + z.h) % 360 + 360) % 360;

    /* Returned as a colour-shaped object rather than mutating the palette
     * entry, which is shared across every element in the layer. */
    return { h: h, s: s, v: v, emissive: colour.emissive, accent: colour.accent };
  }

  /* Move an element's base colour along its layer's THERMAL GRADIENT, by how
   * deep in the band it sits (D59).
   *
   * The band fill already ramps from cool at the outer edge to hot at the
   * inner one. Detail elements derive from the layer's single band colour, so
   * without this they would all be relatives of the AVERAGE — a convection
   * cell at the core boundary would be tinted the same as one just under the
   * crust, and the flow structure would read as flat over a band that is
   * visibly not. Once the elements ride the gradient too, the mantle's
   * circulation gains contrast exactly where the mantle is most violent, which
   * is the whole reason to draw convection at all.
   *
   * Like `zoneShift` this returns a colour-shaped object rather than mutating
   * the palette entry, and it composes with it: a zone delta and a thermal
   * position are independent facts about the same element.
   *
   * `band` is {inner, outer} in body space. Elements outside a graded layer,
   * and layers with no gradient, pass through untouched. */
  function heatShift(colour, el, band) {
    if (!colour.hotEdge || !band) return colour;

    var span = Math.max(1e-6, band.outer - band.inner);
    /* 0 at the layer's outer edge, 1 at its inner (hot) edge — the same
     * orientation the band fill's gradient uses. */
    var t = clamp(1 - (el.radius - band.inner) / span, 0, 1);

    var hot = colour.hotEdge;

    /* Remapped so the band colour sits where the FILL puts it — around 0.78 of
     * the way out — rather than at the very edge. Below that the element cools
     * slightly, matching the fill's cool rim; above it, it heats toward the
     * hot edge. Without the remap the elements would ride a different curve
     * from the band they sit on, and the two would visibly disagree near the
     * layer's outer edge. */
    /* Only a THERMAL gradient cools its outer rim — see the matching note in
     * draw/scene.js's bandFill. A depth gradient is already darkest inward. */
    if (t < 0.22 && hot.v > colour.v) {
      var cool = (0.22 - t) / 0.22 * 0.30 * hot.strength;
      return {
        h: colour.h,
        s: clamp(colour.s * (1 + cool * 0.2), 0, 1),
        v: clamp(colour.v * (1 - cool * 0.65), 0.02, 1),
        emissive: colour.emissive, accent: colour.accent
      };
    }

    var u = (t - 0.22) / 0.78;
    return {
      h: CC.Palette.mixHue(colour.h, hot.h, u),
      s: clamp(colour.s + (hot.s - colour.s) * u, 0, 1),
      v: clamp(colour.v + (hot.v - colour.v) * u, 0.02, 1),
      emissive: colour.emissive, accent: colour.accent
    };
  }

  function toneColour(colour, tone, alpha, weight) {
    var v = colour.v;
    var s = colour.s;

    /* HOW HARD THIS ELEMENT'S TONE STEPS, 1 being the ordinary step.
     *
     * A layer may publish `bandContrast` on its colour, which is how a gas
     * giant's zone/belt alternation separates hard while an ice giant's stays
     * subtle — one authored number rather than two code paths. Absent on
     * every layer that does not care, so nothing else changes.
     *
     * Only the caller that draws banding passes it; the rest of the vocabulary
     * gets the default 1 and is untouched. */
    /* CLAMPED, because LIFT and DROP are already tuned to be the largest step
     * that still reads as material rather than as paint. Multiplying an
     * already-large step by 2 does not give twice the separation, it gives
     * near-white against near-black — measured at weight 2.1, the pair came
     * out rgb(251,255,172) and rgb(5,5,2), which is not a banded gas giant,
     * it is a barcode. The useful range is a modest widening or narrowing
     * around the default. */
    var W = weight === undefined ? 1 : clamp(weight, 0.15, 1.45);

    /* THE VALUE STEP IS ABSOLUTE, NOT PROPORTIONAL.
     *
     * Multiplying a dark layer's value gives a step far too small to see: a
     * band at v=0.22 lightened by 55% of the remaining headroom still only
     * reaches ~0.35, which at 30% alpha is invisible. Two passes were lost to
     * exactly this — thousands of elements generated, none of them legible.
     *
     * Details now move a FIXED distance in value, in whichever direction the
     * layer has room for. That guarantees a visible mark on a near-black
     * mantle and on a near-white core alike. Hue stays close, which is what
     * keeps the element in family; value is what makes it readable. */
    var LIFT = 0.34 * W;

    /* The downward step is SMALLER than the upward one, and deliberately so.
     * A layer darkened toward black loses its material colour along with the
     * detail sitting in it — the crust went from a washed-out pale ring to a
     * near-black one, both times illegible. Down-steps are also scaled by how
     * dark the layer already is, so a mid-value band separates without being
     * crushed. */
    var DROP = (0.16 + 0.20 * clamp((v - 0.20) / 0.55, 0, 1)) * W;

    /* Below this a layer is too dark to darken any further, so details on it
     * must lighten instead — a fracture in dark rock catches light, it does
     * not get blacker.
     *
     * The threshold is LOW on purpose. Set at 0.34 it caught mid-value layers
     * like the crust, whose grain then lightened and washed the whole band out
     * to a pale grey ring — the crust should read as the darkest solid band,
     * not the brightest. Only genuinely dark layers lighten. */
    var canDarken = v > 0.20;

    switch (tone) {
      case "lighter":
        return CC.Color.hsva(colour.h + 4,
                             clamp(s * 0.72, 0, 1),
                             clamp(v + LIFT, 0, 1), alpha);

      case "darker":
        if (canDarken) {
          return CC.Color.hsva(colour.h - 4,
                               clamp(s * 1.15, 0, 1),
                               clamp(v - DROP, 0.02, 1), alpha);
        }
        return CC.Color.hsva(colour.h + 5,
                             clamp(s * 0.80, 0, 1),
                             clamp(v + LIFT * 0.85, 0, 1), alpha);

      /* BRIGHT WITHOUT BEING BLEACHED — the one thing no other tone here can
       * say, and the gap is why it exists.
       *
       * Every other lightening tone couples value and saturation: `lighter`
       * multiplies saturation by 0.72, `glow` by 0.62. That coupling is right
       * for detail sitting INSIDE a layer, where a mark that lightens without
       * losing chroma reads as paint rather than as material catching light.
       *
       * It is wrong for a gas giant's rings, and the symptom was that every
       * giant's ring system came out the same pale near-white whatever colour
       * the body was — the mark stopped carrying any information about the
       * world it belonged to. Real ring systems are bright AND tinted:
       * Saturn's are warm buff and ochre, and the tint varies with what the
       * ringlets are made of.
       *
       * So this steps value up like `lighter` and leaves saturation very
       * nearly alone. The tiny pull-back stops a fully saturated layer
       * producing a ring more vivid than the planet it orbits, which would
       * invert the emphasis — the body is still the subject. */
      case "bright":
        return CC.Color.hsva(colour.h + 3,
                             clamp(s * 0.94, 0, 1),
                             clamp(v + LIFT, 0, 1), alpha);

      /* THE BODY'S ACCENT HUE (js/gen/accent.js) — lights and active
       * systems, a colour that does not belong to the material. Falls back
       * to `glow` on a body whose profile declares no accent. */
      case "accent":
        if (colour.accent) {
          return CC.Color.hsva(colour.accent.h, colour.accent.s,
                               colour.accent.v, alpha);
        }
        return toneColour(colour, "glow", alpha, weight);

      case "glow":
        /* Self-lit layers: push brightness hard and pull saturation, so the
         * detail reads as hotter material rather than paler material. */
        return CC.Color.hsva(colour.h + 6,
                             clamp(s * 0.62, 0, 1),
                             clamp(v + LIFT * 0.9, 0, 1), alpha);

      case "shift":
      default:
        /* Grain and stipple. Steps in whichever direction the layer allows. */
        if (!canDarken) {
          return CC.Color.hsva(colour.h + 8,
                               clamp(s * 0.78, 0, 1),
                               clamp(v + LIFT, 0, 1), alpha);
        }
        return CC.Color.hsva(colour.h - 7,
                             clamp(s * 1.12, 0, 1),
                             clamp(v - DROP, 0.02, 1), alpha);
    }
  }

  CC.DrawDetails.zoneShift = zoneShift;
  CC.DrawDetails.heatShift = heatShift;
  CC.DrawDetails.toneColour = toneColour;
})();
