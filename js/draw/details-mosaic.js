/* The mosaic's style set — the rich object js/draw/primitives/mosaic.js reads.
 *
 * Split out of draw/details.js, which passed the 500-line rule. Attached to
 * CC.DrawDetails; draw/details.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;

  /* ---- the mosaic's materials ------------------------------------------- */

  /* THE PALETTE OF A BROKEN-ROCK FIELD: 2-4 material tones, plus the seam
   * between them, plus the sheen.
   *
   * The spec asks for "2-4 muted, slightly shiny colours representing
   * different materials", with cell hues "from a narrow band around the
   * primary — enough variation to read as different materials, not enough to
   * look like confetti". Both halves of that sentence are doing work here, and
   * the second one is the harder constraint: the obvious implementation —
   * spread the materials evenly around the hue wheel — produces exactly the
   * confetti it warns about, because a Voronoi field puts every colour next to
   * every other colour, which is the worst case for a wide hue spread.
   *
   * So the materials are separated primarily by VALUE and only secondarily by
   * hue. That is also what stone actually looks like: the difference between
   * silicate and metal in a cut face is mostly light and dark, and a little
   * warm and cool. Three signals, in descending order of how much they carry:
   *
   *   value   the main one. The materials fan out darker and lighter around
   *           the layer's own value, which is what separates them at a glance
   *           and at a small size
   *   hue     a narrow fan, no wider than the spec's "narrow band"
   *   sat     the darker materials run a touch more saturated, which is what
   *           makes them read as mineral rather than as shadow
   *
   * EVERY MATERIAL IS DERIVED FROM THE LAYER'S OWN COLOUR, so the Primary hue
   * control still moves the whole body and an asteroid never stops being the
   * colour the palette said it was.
   *
   * The seam is much darker than any material — it is crushed rock in a joint,
   * with no light reaching it — and it is what a void shows as, so it has to
   * be dark enough to read as a hole rather than as a fourth material. */
  function mosaicFill(colour, el, alpha) {
    var n = Math.max(1, el.materialCount || 3);
    var seed = el.seed || 0;
    var mats = [];

    for (var i = 0; i < n; i++) {
      /* Where this material sits in the fan, -1..+1. Ordered rather than
       * rolled, so the set is spread rather than clustered by luck — with
       * three materials that is dark / middle / light, which is the reading
       * the spec wants. */
      var k = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;

      /* A per-body rotation of the fan, so two asteroids with the same number
       * of materials are not the same three greys. */
      var turn = Math.sin(seed * 71.3 + i * 2.11);

      /* PULLED TOWARDS STONE, not taken raw from the layer.
       *
       * The layer colour is the palette's, and the palette is free to roll any
       * hue — which on the first renders gave a body of blue-violet fragments.
       * Blue-violet is a fine colour for an ocean or an ice shell and it is not
       * a colour rock comes in: the spec asks for "muted" materials, and what
       * makes a mineral read as mineral is that it sits in the warm-neutral
       * band whatever light is on it.
       *
       * So the hue is LEANED toward stone rather than replaced by it. The
       * Primary hue control still moves the whole body — a red asteroid is
       * redder than a blue one — but both land in a range where they read as
       * rock, which is the same "stay in family, but stay a material" argument
       * `rockFill` makes for a debris chunk one file over. */
      var STONE = 34;
      /* The SHORTEST way round the wheel to stone. Lerping the raw numbers
       * would send a hue of 350 the long way through green to reach 34, which
       * is the one path that passes through every colour rock is not. */
      var d = ((STONE - colour.h + 540) % 360) - 180;
      /* 0.70 RATHER THAN A GENTLE NUDGE, and the figure was measured against
       * the render rather than chosen. At 0.42 a palette that rolled deep
       * violet still produced a body of purple fragments — the lean was there
       * and the result was still not stone. Rock has to WIN this argument: the
       * Primary hue control should tint an asteroid, not recolour it. */
      var hue = colour.h + d * 0.70 + k * 14 + turn * 5;
      /* SATURATION RUNS OPPOSITE TO VALUE. The dark materials are the ore-ish
       * ones and the pale ones are dusty silicate, which is both what rock
       * does and what keeps the dark cells from reading as mere shadow. */
      /* MUTED, AND CAPPED WELL BELOW THE LAYER'S OWN. The spec's word is
       * "muted" and it is doing real work: at the palette's full saturation
       * the fragments read as coloured glass rather than as stone. Stone is a
       * low-chroma material and its variety is in lightness, not in hue. */
      var sat = clamp(colour.s * (0.62 - k * 0.20) + 0.05, 0.04, 0.38);
      /* THE FAN IS WIDE, and it has to be. A field of two hundred cells at a
       * value spread of ±0.06 reads as one flat area with noise on it — the
       * "mosaic pattern laid over a circle" the done-condition forbids, just
       * in a single colour. The materials have to be genuinely different
       * MATERIALS, and at this size that means genuinely different lightness.
       *
       * Clamped well clear of black at the bottom, because the seam and the
       * voids own the dark end of this layer and a material that reaches them
       * stops being distinguishable from a hole. */
      /* THE FAN IS APPLIED TO A LIFTED BASE, NOT TO THE LAYER'S OWN VALUE.
       *
       * `colour.v` came out at 0.19 on a measured body, and a MULTIPLICATIVE
       * fan around 0.19 spans 0.09..0.29 — three materials that are all
       * near-black and are separated by a few units out of 255. Rendered, the
       * interior was a dark mass with a lighter rim on each fragment, because
       * the only part of any cell bright enough to see was the lit edge.
       *
       * The layer's value is the right ANCHOR and the wrong SCALE. It says
       * where this asteroid sits between carbonaceous and stony, which is a
       * real distinction the card also reads — but the fragments still have to
       * be visible, and a cut face of rock in a diagram is not the same
       * lightness as the unlit body would be. So the base is lifted into a
       * range where a fan can actually fan, and `colour.v` moves it within
       * that range rather than being it. A dark body is still visibly darker
       * than a bright one; neither is black. */
      var base = 0.24 + clamp(colour.v, 0, 1) * 0.42;
      var val = clamp(base * (1.0 + k * 0.46), 0.13, 0.86);

      mats.push({
        /* ONE FLAT COLOUR PER MATERIAL. The lit and shaded variants this
         * used to carry drove a per-cell gradient that read as polish, and
         * they went with it (ASTEROID-OVERHAUL §2). */
        body: CC.Color.hsva(hue, sat, val, alpha)
      });
    }

    /* HOW ROUGH THE CUT FACE IS, AND COHESION DECIDES IT (§8, brittleness).
     *
     * A loose aggregate's fragments are crumbly and granular; a monolith's
     * slabs are dense stone whose interest is in larger-scale mottling. So
     * the fine grain rises and the mottle falls as Cohesion drops — brittle
     * rock looks different up close as well as in the large. The grain's
     * figure is the review's own "monochrome gaussian, 30%", centred on it. */
    var coh = el.cohesion === undefined ? 0.5 : clamp(el.cohesion, 0, 1);

    /* The fan's own stone-leaned hue, so a void is the same rock in shadow
     * rather than a fourth, differently coloured stone. */
    var stoneHue = colour.h + (((34 - colour.h + 540) % 360) - 180) * 0.70;

    /* RADIOACTIVE FRAGMENTS (ASTEROID-OVERHAUL §8) — the cells buildMosaic
     * marked `hot`. A sickly yellow-green or a pink-white (D313: blue-white read as ice), one per body
     * so a rock's hot material is one material, and stronger up the range.
     * The glow is the mark that says RADIOACTIVE rather than merely
     * differently coloured, so it only arrives near the top. */
    var rad = el.radioactivity || 0;
    var hotK = clamp((rad - 0.35) / 0.65, 0, 1);
    var hotHue = ((el.seed || 0) * 7.7 % 1) < 0.6 ? 82 : 332;
    var pink = hotHue !== 82;
    var hot = CC.Color.hsva(hotHue, (0.24 + hotK * 0.28) * (pink ? 0.55 : 1),
                            clamp(0.38 + colour.v * 0.25 + hotK * 0.16 + (pink ? 0.14 : 0), 0, 0.92), alpha);
    var hotGlow = clamp((rad - 0.62) / 0.38, 0, 1);

    return {
      materials: mats,
      /* CRUSHED MATERIAL IN THE JOINT, and the darkest thing in the layer. In
       * the layer's own hue rather than flat black, so the seams read as
       * shadow between stones instead of as an inked grid — the same argument
       * the boundary stroke in draw/scene.js makes. */
      seam: CC.Color.hsva(colour.h - 4, clamp(colour.s * 1.1, 0, 1),
                          clamp(colour.v * 0.20, 0.02, 0.16), alpha),
      voidFill: null,
      /* A VOID IS A DEEP RECESS, NOT A CUTOUT. Dark and desaturated, in the
       * rock's own hue, and anchored to the same lifted base the materials
       * fan around — so a pale stony body has dark-grey pockets and a dark
       * carbonaceous one has near-black ones, but neither has pitch-black
       * holes. Floor lighter than walls; the walls sit just above the seam,
       * so the joint around a pocket still reads as its rim. In the fan's
       * stone-leaned hue: in the palette's raw hue the pockets read as a
       * fourth, bluish stone instead of as the same rock in shadow. */
      voidFloor: CC.Color.hsva(stoneHue, clamp(colour.s * 0.55, 0, 0.24),
                               (0.24 + clamp(colour.v, 0, 1) * 0.42) * 0.30, alpha),
      voidMid: CC.Color.hsva(stoneHue, clamp(colour.s * 0.55, 0, 0.24),
                             (0.24 + clamp(colour.v, 0, 1) * 0.42) * 0.19, alpha),
      voidWall: CC.Color.hsva(stoneHue - 4, clamp(colour.s * 0.60, 0, 0.26),
                              (0.24 + clamp(colour.v, 0, 1) * 0.42) * 0.09, alpha),
      /* THE SAME RECESS AS A CONTINUOUS RAMP, wall (0) to floor (1), for the
       * caves (draw/caves.js): a cave and a rubble void are the same kind of
       * darkness at two scales, so they come from one formula. */
      voidRamp: function (t) {
        t = clamp(t, 0, 1);
        return CC.Color.hsva(stoneHue - 4 * (1 - t),
                             clamp(colour.s * (0.60 - 0.05 * t), 0, 0.26 - 0.02 * t),
                             (0.24 + clamp(colour.v, 0, 1) * 0.42) * (0.09 + 0.21 * t),
                             alpha);
      },
      /* ICE IN A VOID — pale, cold and blue whatever the rock's hue,
       * because what makes it read as ice is that it is NOT another stone.
       * Only voids the builder marked `icy` take it (see `voidIce`). Bluer
       * than it was, and glassy: a brighter heart and a bright inner rim,
       * which is translucence, not a light direction (D313). */
      iceFill: CC.Color.hsva(202, 0.34, 0.76, alpha * 0.94),
      iceCore: CC.Color.hsva(196, 0.16, 0.95, alpha * 0.94),
      iceRim: CC.Color.hsva(190, 0.08, 1.0, alpha * 0.55),
      /* DENSER TOWARD THE MIDDLE (ASTEROID-OVERHAUL §9's fallback, D313):
       * the deep fragments take a shade, so a monolith's big slabs are not
       * one even field. Strongest on a tight body; rubble has its voids. */
      depthShade: 0.06 + 0.34 * coh * coh,
      hot: hot,
      hotGlow: hotGlow > 0
        ? CC.Color.hsva(hotHue, 0.55, 0.92, alpha * hotGlow * 0.42) : null,
      hotGlowEdge: CC.Color.hsva(hotHue, 0.55, 0.92, 0),
      grainAlpha: (0.32 - coh * 0.12) * alpha,
      mottleAlpha: (0.11 + coh * 0.09) * alpha,
      /* ---- THE GRIT ----------------------------------------------------
       *
       * The discrete mark the texture tiles are too fine to make: dark
       * pitting with brighter mineral inclusions among it. BOTH POLARITIES
       * ARE REQUIRED — dark alone reads as dirt, bright alone as sparkle.
       * Kept in the layer's own hue, so it sits in the fragment rather than
       * on it. */
      grit: CC.Color.hsva(colour.h - 10, clamp(colour.s * 1.25, 0, 0.55),
                          0.05, alpha * 0.40),
      gritLight: CC.Color.hsva(colour.h + 14, clamp(colour.s * 0.45, 0, 0.32),
                               clamp(colour.v * 0.40 + 0.46, 0.48, 0.86),
                               alpha * 0.42)
    };
  }

  CC.DrawDetails.mosaicFill = mosaicFill;
})();
