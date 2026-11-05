/* The stellar style sets — plasma, starspots, convection cells, a doomed world,
 * a mirror panel, and the fields.
 *
 * Split out of draw/details.js, which passed the 500-line rule. Attached to
 * CC.DrawDetails; draw/details.js and draw/details-gas.js (a mirror's metal is
 * `hullFill`) must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;
  var hullFill = CC.DrawDetails.hullFill;

  /* ---- the stellar style sets ---------------------------------------- */

  /* A PROMINENCE IS SELF-LUMINOUS GAS, so it is built as a two-tone pair
   * rather than a colour: a dim wide body and a bright narrow core along the
   * same curve. One flat fill produced exactly the failure D80 records on the
   * great storm — the shape was right and it read as flat, textureless and
   * pale, because a single `fill()` has no interior.
   *
   * `screen` for the same reason a diamond uses it: a prominence LIGHTENS what
   * is behind it. It is glowing gas seen against the corona, not paint laid
   * over it, and the difference is visible the moment one crosses the limb. */
  function plasmaFill(colour, el, alpha) {
    /* Hotter than the layer it rises from — a prominence is a different
     * temperature from the surface, and that is what makes it separate. The
     * hue moves toward the warm end regardless of what colour the star is, so
     * a blue star's prominences still read as flame rather than as more blue. */
    /* HOTTER THAN THE LAYER, WHICH IS A VALUE STATEMENT AND NOT A HUE ONE.
     *
     * The first version mixed the hue 42% toward orange regardless of what
     * colour the star was, on the reasoning that plasma should read as flame.
     * On a blue-green star that produced MAGENTA loops — a colour belonging to
     * no part of the body, which read as a rendering fault rather than as a
     * feature of the star. The generator's own rule catches it: a perturbation
     * of the rolled colour, never a replacement (zones.js rule 1).
     *
     * What actually makes a prominence read as hotter is that it is BRIGHTER
     * and LESS SATURATED than what it rises from — the same thing that makes
     * the fusion core read as hot in every stack here. So the hue barely
     * moves, and the work is done by value. */
    var hue = CC.Palette.mixHue(colour.h, colour.h + 14, 0.5);
    var sat = clamp(colour.s * 0.62 + 0.10, 0.14, 0.80);
    return {
      body: CC.Color.hsva(hue, sat, clamp(colour.v * 0.86 + 0.16, 0, 1),
                          alpha * 0.55),
      /* Near-white at the core. A loop of plasma at ten thousand degrees is
       * white in the middle whatever colour its edges are. */
      core: CC.Color.hsva(hue + 8, clamp(sat * 0.42, 0, 1),
                          clamp(colour.v * 0.5 + 0.55, 0, 1), alpha),
      /* THE SAME COLOUR AT ZERO ALPHA — the far stop of a gradient that has to
       * fade out rather than end. Published here rather than built in the
       * primitive so no drawing code has to take apart an `rgba(...)` string
       * to find its alpha, which is the kind of thing that works until a
       * colour helper changes its output format. */
      dim: CC.Color.hsva(hue, sat, clamp(colour.v * 0.86 + 0.16, 0, 1), 0),
      blend: "screen"
    };
  }

  /* A STARSPOT IS A HOLE IN THE LIGHT, which is the opposite polarity from
   * everything else in this file — nearly every other mark here is brighter
   * than its layer, because nearly every other mark is material catching light.
   * A spot is cooler photosphere, and cooler means darker.
   *
   * THREE TONES, NOT ONE, and that is what stops it being a granule drawn dark
   * (D76): the umbra is near-black, the penumbra is roughly half way down from
   * the surface, and the filaments crossing the penumbra are lighter again so
   * the field structure reads. `multiply` keeps it a darkening OF the
   * photosphere rather than a patch on top of it, so the granulation stays
   * faintly visible through the penumbra — which is what it does on a real
   * star and is the detail that makes the spot sit IN the surface. */
  function spotFill(colour, el, alpha) {
    /* A spot keeps the star's own hue and loses its value. Shifting the hue
     * as well would make it read as a different material, and it is not — it
     * is the same plasma, colder. */
    var hue = colour.h;
    var sat = clamp(colour.s * 1.10, 0, 1);
    return {
      umbra:    CC.Color.hsva(hue, sat, clamp(colour.v * 0.14, 0, 1), alpha),
      penumbra: CC.Color.hsva(hue, sat, clamp(colour.v * 0.42, 0, 1),
                              alpha * 0.92),
      filament: CC.Color.hsva(hue, clamp(sat * 0.8, 0, 1),
                              clamp(colour.v * 0.62, 0, 1), alpha * 0.85),
      blend: "multiply"
    };
  }

  /* A CONVECTION CELL IS FOUR TONES, and it has to be: the whole point of the
   * primitive is that material goes UP one flank and DOWN the other, and two
   * strokes at the same brightness say nothing about direction.
   *
   *   line  the cell boundary, dim — it is a division, not a feature
   *   up    the rising flank, brightest: this is hot material arriving
   *   down  the sinking flank, dimmer than the layer: cooled material leaving
   *   cap   the ceiling where the rising column spreads out, brighter still
   *
   * The up/down asymmetry is the entire readability of a convective zone, and
   * it is the thing a spiral could not express at any brightness (see
   * convectionCell). No blend: these are strokes ON the layer, not luminous
   * gas over it. */
  function convectionFill(colour, el, alpha) {
    var v = colour.v;
    /* THE VALUE SPREAD HAS TO BE WIDE OR THE DIRECTION IS INVISIBLE.
     *
     * The first set ran the four tones within about half a stop of each other
     * and the loop read as one uniform ring — which throws away the only
     * reason to draw a circulation rather than a circle. Rising and sinking
     * material are at genuinely different temperatures, so they should be at
     * genuinely different brightnesses. */
    return {
      line: CC.Color.hsva(colour.h, clamp(colour.s * 0.85, 0, 1),
                          clamp(v * 1.10 + 0.04, 0, 1), alpha * 0.50),
      up:   CC.Color.hsva(colour.h, clamp(colour.s * 0.45, 0, 1),
                          clamp(v * 1.45 + 0.34, 0, 1), alpha),
      down: CC.Color.hsva(colour.h, clamp(colour.s * 1.15, 0, 1),
                          clamp(v * 0.34, 0, 1), alpha),
      cap:  CC.Color.hsva(colour.h, clamp(colour.s * 0.22, 0, 1),
                          clamp(v * 1.7 + 0.52, 0, 1), alpha)
    };
  }

  /* A DOOMED WORLD IS THE ONLY GENUINELY DARK OBJECT IN A STAR.
   *
   * Everything else in a stellar cutaway is luminous, so the contrast a solid
   * body provides is the strongest the family can make and the fill should not
   * squander it: the disc goes nearly black, keeping only a trace of the
   * star's hue so it still belongs to this picture.
   *
   * The other two tones are where the story is. `lit` is the leading edge,
   * near-white, where the star's material is piling up against it; `wake` is
   * the trail behind, dim and warm, material dragged out of place. */
  function doomedFill(colour, el, alpha) {
    return {
      body: CC.Color.hsva(colour.h, clamp(colour.s * 0.55, 0, 1),
                          clamp(colour.v * 0.10, 0, 1), alpha),
      lit:  CC.Color.hsva(colour.h, clamp(colour.s * 0.25, 0, 1),
                          clamp(colour.v * 1.6 + 0.42, 0, 1), alpha),
      wake: CC.Color.hsva(colour.h, clamp(colour.s * 0.9, 0, 1),
                          clamp(colour.v * 1.15 + 0.10, 0, 1), alpha * 0.45)
    };
  }

  /* A MIRROR PANEL'S TONES — the metal half and the glass half, and they come
   * from two DIFFERENT places on purpose.
   *
   * THE METAL IS `hullFill`, unchanged: a manufactured object's colour is
   * independent of the body it orbits (D80), because industry does not belong
   * to the star and that independence is most of what makes a built thing read
   * as an intruder rather than as scenery.
   *
   * THE GLASS IS THE STAR, AND THAT IS A DELIBERATE EXCEPTION. A mirror's face
   * is not painted some colour of its own — it is showing you the light it is
   * pointed at, and a mirror reflecting an independent hue would be a mirror
   * aimed at something else. So the glass takes `emitted`, the colour the
   * palette publishes for the brightest thing about this body that can be seen
   * from outside it.
   *
   * IF A LATER SESSION READS THIS AS THE D80 VIOLATION IT LOOKS LIKE: it is
   * not, and the two halves being drawn from two different sources IS the
   * feature. Reverting the glass to `hullFill` would make the panel a grey
   * rectangle with a grey rectangle attached, which is what it was before.
   *
   * `emitted` may be null — a cold body has no light to reflect — and then the
   * glass falls back to the element's own colour, so the primitive is safe on
   * any body a future trait might place it on. */
  function mirrorFill(colour, el, alpha, emitted) {
    var base = emitted || colour;
    var hull = hullFill(colour, el, alpha);
    /* BRIGHT AND EMITTING, which on this project means value up and
     * saturation DOWN (D123): what makes a mark read as hot here is that it is
     * brighter and less saturated, never that its hue was pushed somewhere.
     * The glass keeps the star's hue exactly, because the hue is the whole
     * information the panel is carrying. */
    hull.glass = CC.Color.hsva(base.h, clamp(base.s * 0.82, 0, 1),
                               clamp(base.v * 0.92 + 0.14, 0, 1), alpha);
    hull.glow = CC.Color.hsva(base.h, clamp(base.s * 0.34, 0, 1),
                              clamp(base.v * 0.30 + 0.70, 0, 1), alpha);
    return hull;
  }

  /* THE ONE PLACE THAT SAYS WHICH STYLE SET A PRIMITIVE WANTS.
   *
   * There were two: this file's element loop, and `drawOutward` in
   * zonepaint.js, which paints the traits that sit beyond the body. They had
   * drifted — zonepaint knew about `chunk` and nothing else — so the first
   * orbital trait to want a richer style than a plain colour string crashed
   * the renderer outright: `capsule` received a colour where it expected a
   * {hull, lit, shade, trim} set, and `addColorStop` was handed undefined.
   *
   * A primitive's style contract is a property of the PRIMITIVE, so it is
   * answered once here and both callers ask. Adding a fourth style set is now
   * one edit rather than two that can disagree. */
  /* `emitted` is the body's own light — see CC.Palette's `emitted`. Optional,
   * and only one primitive reads it: an orbital mirror's glass face is the
   * star, reflected. Passed rather than looked up because js/draw/ may never
   * ask the palette for a layer by role name. */
  /* A FIELD LINE — the diagrammatic register, drawn as something electrified.
   *
   * THIS IS THE ONE MARK ON A STELLAR LIMB THAT IS NOT MATERIAL. Everything
   * else out there is stuff: plasma in a loop, plasma thrown clear, metal in
   * orbit. A field line is the ILLUSTRATION EXPLAINING A MECHANISM — the same
   * register the mantle's flow arrows and the convection swirls are in, which
   * is a register the star family had never used.
   *
   * That is why it does not collide with the prominences and flares it is
   * drawn among, and it is a stronger separation than any silhouette could
   * give: those marks compete on shape, and this one is not on the same layer
   * of the picture at all.
   *
   * ---- THE COLOUR IS A DELIBERATE EXCEPTION TO D123, LIKE THE MIRROR'S ----
   *
   * D123 is the standing rule that a stellar mark separates by SHAPE and never
   * by hue — it is what stopped the prominences coming out magenta on a
   * blue-green star. It governs MATERIAL: plasma belongs to the layer it came
   * from, so moving its hue says something false about the body.
   *
   * An annotation is not material and is not bound by it, exactly as the
   * mantle arrows already are not. So a field line takes `deep` — the hot
   * interior's colour, published by CC.Palette — which says "this belongs to a
   * deeper part of the star than the halo you are looking at". That is the
   * content of the mark. Inventing a colour would say only "this is not part
   * of the picture", which is the failure D123 actually records.
   *
   * AND THERE IS A FAILSAFE, because on some rolls the interior and the corona
   * land on nearly the same hue and the whole distinction silently collapses —
   * the trait would draw, report, and look like nothing. When they are within
   * `MIN_SEP` degrees the interior hue is pushed away from the corona's, in
   * whichever direction it was already leaning. Cheap, and it turns a
   * roll-dependent invisible failure into a guarantee.
   *
   * `deep` may be null on a body with no interior worth naming, and then this
   * falls back to the layer's own colour and the mark is merely bright rather
   * than differently coloured. */
  function fieldFill(colour, el, alpha, deep) {
    var base = deep || colour;
    var hue = base.h;

    var MIN_SEP = 26;
    var d = Math.abs(((hue - colour.h + 540) % 360) - 180);
    if (d < MIN_SEP) {
      /* Push away along whichever side of the corona's hue it already sits,
       * so a line that was slightly warm gets warmer rather than jumping
       * across the wheel — a hue that leaps to the far side reads as a
       * different palette, which is the thing being avoided. */
      var dir = (((hue - colour.h + 540) % 360) - 180) >= 0 ? 1 : -1;
      hue = CC.Palette.wrapHue(colour.h + dir * MIN_SEP);
    }

    /* ENERGISED, NOT INKED. A flat stroke reads as a line drawn on the
     * picture; what makes it read as charged is a bright near-white core with
     * a wider, softer, more saturated glow under it — the same two-pass
     * construction the prominence uses, for the same reason. The user asked
     * for lines that look "clearly electrified", and this is where that
     * lives: the shape stays diagrammatic and the TEXTURE is physical. */
    /* THE SEPARATION FAILSAFE GUARANTEES A DIFFERENT HUE AND NOTHING ELSE,
     * WHICH IS NOT ENOUGH.
     *
     * Measured across seeds: the hue push above does its job, and the mark
     * still came out DULL on any body whose interior is dark or desaturated —
     * an olive scribble over a bright green corona, separated in hue and lost
     * in value. Under `screen` that is close to invisible, because `screen`
     * can only add light and there was not much to add.
     *
     * So the value and saturation are floored rather than merely derived. An
     * energised field line is a bright thing by definition; how bright is not
     * a fact about the star's interior, only its HUE is. This is the same
     * split the plasma tones make (D123: hue belongs to the body, brightness
     * belongs to what the mark is), applied to a mark that had inherited both.
     *
     * The floors are what make the trait land equally on a violet dwarf and a
     * red giant, rather than working on the seeds that happened to have a hot
     * interior. */
    var sat = clamp(base.s * 0.55 + 0.42, 0.52, 0.95);
    var val = clamp(base.v * 0.30 + 0.68, 0.72, 1);
    return {
      /* The soft outer glow — saturated, dim, wide. */
      glow: CC.Color.hsva(hue, sat, val, alpha * 0.42),
      /* The line itself. */
      line: CC.Color.hsva(hue, clamp(sat * 0.78, 0, 1),
                          clamp(val * 0.82 + 0.18, 0, 1), alpha),
      /* The hot centre, near-white: what makes it look like current rather
       * than pigment. */
      core: CC.Color.hsva(hue, clamp(sat * 0.22, 0, 1),
                          clamp(val * 0.20 + 0.80, 0, 1), alpha),
      /* The same hue at zero alpha, for gradients that must end at nothing
       * rather than stop — published so no drawing code takes an `rgba(...)`
       * string apart. */
      dim: CC.Color.hsva(hue, sat, val, 0),
      blend: "screen"
    };
  }

  CC.DrawDetails.plasmaFill = plasmaFill;
  CC.DrawDetails.spotFill = spotFill;
  CC.DrawDetails.convectionFill = convectionFill;
  CC.DrawDetails.doomedFill = doomedFill;
  CC.DrawDetails.mirrorFill = mirrorFill;
  CC.DrawDetails.fieldFill = fieldFill;
})();
