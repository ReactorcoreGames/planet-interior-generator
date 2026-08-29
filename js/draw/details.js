/* Drawing detail elements and surface terrain.
 *
 * Walks the element lists produced by gen/details.js and dispatches each to a
 * primitive. LIKE THE REST OF draw/, THIS FILE NAMES NO ROLES AND NO
 * ARCHETYPES: it reads `el.kind` and `el.tone` and knows nothing about what
 * kind of body it is drawing.
 *
 * Colour is derived HERE, not at generation time. Elements carry a `tone`
 * naming their relationship to the layer's band colour, so a colour change
 * redraws the same cached geometry without re-rolling a single position —
 * which is what ARCHITECTURE's stage-caching table requires. */

var CC = CC || {};

CC.DrawDetails = (function () {
  "use strict";

  var TAU = CC.Math.TAU;
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
    return { h: h, s: s, v: v, emissive: colour.emissive };
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
        emissive: colour.emissive
      };
    }

    var u = (t - 0.22) / 0.78;
    return {
      h: CC.Palette.mixHue(colour.h, hot.h, u),
      s: clamp(colour.s + (hot.s - colour.s) * u, 0, 1),
      v: clamp(colour.v + (hot.v - colour.v) * u, 0.02, 1),
      emissive: colour.emissive
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
        body: CC.Color.hsva(hue, sat, val, alpha),
        /* The lit face and the shaded one. A narrower spread than a debris
         * chunk's, because these fragments are packed against each other
         * rather than tumbling in sunlight — the light in here is bounced. */
        /* THE LIT FACE AND THE SHADED ONE, AND THE SPREAD IS WIDE.
         *
         * The first version ran +0.13 / x0.52 around the body value, which is
         * the spread a debris chunk uses — and a debris chunk is thirty pixels
         * across where these are two hundred. Rendered, the cells came out
         * FLAT: the gradient existed and was invisible, so the interior read
         * as a field of tiles in slightly different colours, which is the
         * "mosaic pattern laid over a circle" the done-condition forbids.
         *
         * The amount of shading a shape needs is a function of how large it is
         * — a big surface shows its curvature and a small one cannot — so a
         * mark this size wants roughly three times a chunk's spread. What
         * makes a polygon read as a solid lump rather than as an area of
         * colour is that its two ends are clearly different. */
        lit: CC.Color.hsva(hue + 5, clamp(sat * 0.70, 0, 1),
                           clamp(val + 0.30, 0, 0.95), alpha),
        shadow: CC.Color.hsva(hue - 8, clamp(sat * 1.25, 0, 1),
                              clamp(val * 0.34, 0.04, 1), alpha)
      });
    }

    return {
      materials: mats,
      /* CRUSHED MATERIAL IN THE JOINT, and the darkest thing in the layer. In
       * the layer's own hue rather than flat black, so the seams read as
       * shadow between stones instead of as an inked grid — the same argument
       * the boundary stroke in draw/scene.js makes. */
      seam: CC.Color.hsva(colour.h - 4, clamp(colour.s * 1.1, 0, 1),
                          clamp(colour.v * 0.20, 0.02, 0.16), alpha),
      /* A VOID IS LEFT AS THE SEAM GROUND. Filling it with anything else would
       * make it a fourth material; leaving it is what makes it a hole. */
      voidFill: null,
      /* THE SHEEN the spec asks for — "slightly shiny". Pale and
       * low-saturation, because a reflection carries the light's colour rather
       * than the rock's, but kept in the family rather than pushed to white so
       * it reads as mineral catching the light instead of as a highlight pass
       * laid over the top.
       *
       * FAINT. The first version ran at alpha 0.55 as a stroked crescent and
       * was the loudest thing in the picture; as a gradient it covers far more
       * of each cell, so it has to be much weaker to add up to the same
       * amount of light. A sheen that is legible as a shape is not a sheen. */
      glint: CC.Color.hsva(colour.h + 10, clamp(colour.s * 0.26, 0, 0.24),
                           clamp(colour.v * 0.55 + 0.42, 0.55, 0.94),
                           alpha * 0.11),
      /* WHERE THE SHEEN GOES, which is to nothing. Fading towards nothing is
       * not ending at nothing (D156): the stop has to be the same colour at
       * zero alpha, or the gradient interpolates through grey and leaves a
       * dirty smear across the middle of every fragment. */
      glintOut: CC.Color.hsva(colour.h + 10, clamp(colour.s * 0.26, 0, 0.24),
                              clamp(colour.v * 0.55 + 0.42, 0.55, 0.94), 0),
      /* HALVED AGAIN AFTER THE GRIT LANDED. The sheen was tuned when the
       * fragments were smooth, and against a smooth surface it read as
       * subtle; against a gritty one it was the second thing making the rock
       * look polished. D158 exactly — two marks each calibrated alone are not
       * a calibrated pair, and the composite is what has to be judged. */
      /* ---- THE GRIT, which is what makes it ore rather than tile --------
       *
       * The three colours above are all continuous fields across a cell, and a
       * surface described only by continuous fields is a POLISHED one. These
       * two are the discontinuous mark that says the rock is rough: dark
       * pitting and the matte of a fracture face, with brighter mineral
       * inclusions scattered among it.
       *
       * BOTH POLARITIES ARE REQUIRED. Dark alone reads as dirt on the surface;
       * bright alone reads as sparkle, which is the shiny look being fixed.
       * Rock is dark-speckled with occasional bright grains, and it is the
       * combination that reads as ore-bearing stone.
       *
       * Kept in the layer's own hue, like every other mark in the project — a
       * neutral grey grit would sit ON the fragment rather than in it. */
      grit: CC.Color.hsva(colour.h - 10, clamp(colour.s * 1.25, 0, 0.55),
                          0.05, alpha * 0.40),
      gritLight: CC.Color.hsva(colour.h + 14, clamp(colour.s * 0.45, 0, 0.32),
                               clamp(colour.v * 0.40 + 0.46, 0.48, 0.86),
                               alpha * 0.42),
      /* ONE LIGHT DIRECTION FOR THE WHOLE FIELD. Upper-left, matching the
       * relief shading and the debris chunks, so a body lit from one side
       * stays lit from one side across every mark on it. */
      light: { x: -0.55, y: -0.83 }
    };
  }

  function styleFor(kind, colour, el, alpha, emitted, deep) {
    switch (kind) {
      /* A field of welded fragments — 2-4 materials, the joints between them,
       * and the holes. Not expressible as a colour string by a long way; see
       * mosaicFill and draw/primitives/mosaic.js. */
      case "mosaic":  return mosaicFill(colour, el, alpha);
      /* A chunk is a fragment of ROCK, and drawn as a flat pale fill it was
       * indistinguishable from the starfield behind it. */
      case "chunk":   return rockFill(colour, el, alpha);
      case "storm":   return stormFill(colour, el, alpha);
      case "capsule": return hullFill(colour, el, alpha);
      case "shard":   return gemFill(colour, el, alpha);
      /* A loop of glowing gas and a magnetically-structured dark patch —
       * neither expressible as a colour string. See each function. */
      case "prominence": return plasmaFill(colour, el, alpha);
      /* A PLUME IS THE SAME MATERIAL AS A PROMINENCE, so it takes the same
       * colours — hotter than the layer, stated as value rather than hue
       * (D123). What separates the two is SHAPE, not temperature: a loop
       * anchored at both ends against a one-footed tongue of rising gas. */
      case "plume":      return plasmaFill(colour, el, alpha);
      /* A FLARE IS THE SAME MATERIAL AGAIN, thrown rather than rising, so it
       * takes the same plasma tones. What separates it from the plume and the
       * prominence is SHAPE — a spray of fragments against a tongue and a loop
       * — which is where the whole difference belongs (D76/D123). */
      case "flare":      return plasmaFill(colour, el, alpha);
      /* OPEN FIELD IS THE SAME MATERIAL LEAVING IN A STRAIGHT LINE, so it
       * takes the same plasma tones as the loop, the tongue and the spray.
       * D123 again, and it matters more here than anywhere: the mark is
       * defined ENTIRELY by its silhouette being straight, so giving it a
       * colour of its own would be inventing a second signal for a difference
       * the shape already states. */
      case "open-field": return plasmaFill(colour, el, alpha);
      /* THE DIAGRAMMATIC HALF OF A CORONAL HOLE — the field itself, drawn as
       * annotation rather than as material. See fieldFill, and read its note
       * before "fixing" the colour exception. */
      case "field-lines": return fieldFill(colour, el, alpha, deep);
      case "starspot":   return spotFill(colour, el, alpha);
      /* Four tones, because a rising flank and a sinking one at the same
       * brightness say nothing about which is which. */
      case "convection-cell": return convectionFill(colour, el, alpha);
      /* A dark sphere with a burning leading edge and a wake. */
      case "engulfed-world":  return doomedFill(colour, el, alpha);
      /* A metal backing and a glass face; the glass is the star. See
       * mirrorFill, and read its note before "fixing" the exception. */
      case "orbital-mirror":  return mirrorFill(colour, el, alpha, emitted);
      /* Same machined material as a pressure hull, cut into a different
       * object — a cylinder with a cone pointing at the star. */
      case "coned-cylinder":  return hullFill(colour, el, alpha);
      default:        return null;
    }
  }

  /* A DEPTH FILL FOR AN EXCAVATION — the stops a hole is drawn with.
   *
   * An impact basin or a crater filled with one flat colour reads as a patch
   * laid ON the crust: the outline says "excavation" while the fill says
   * "sticker". What sells a hole is that its floor is in shadow — less light
   * reaches the deeper you look — so the fill has to run from the surrounding
   * material at the rim down to nearly black at the bottom.
   *
   * Returned as a {rim, mid, floor} triple rather than as a canvas gradient,
   * because colour belongs here and geometry belongs in the primitive: the
   * wedge knows the radii to hang these stops on, and this knows what the
   * three colours are. `el.floor` is how dark the bottom goes, 0..1.
   *
   * Alpha RISES toward the floor. A basin's rim should feather into the crust
   * around it while its floor is solid — an even alpha made the whole shape
   * read as one translucent film. */
  function depthFill(colour, tone, alpha, floor) {
    var deep = clamp(floor === undefined ? 0.8 : floor, 0, 1);
    var rim = toneColour(colour, tone, alpha * 0.72);

    /* The floor is the layer's own hue driven toward black, so a basin in red
     * rock is a very dark red rather than a grey hole — the same "stay in
     * family" rule every other element follows. */
    function sunk(k, a) {
      return CC.Color.hsva(colour.h,
                           clamp(colour.s * (1 - 0.35 * k), 0, 1),
                           clamp(colour.v * (1 - deep * k), 0.015, 1),
                           clamp(a, 0, 1));
    }

    return {
      rim: rim,
      mid: sunk(0.62, alpha * 0.92),
      floor: sunk(1, Math.min(1, alpha * 1.06))
    };
  }

  /* THE COLOURS A FRAGMENT OF ROCK IS DRAWN WITH.
   *
   * Debris was being drawn as one flat pale fill, and against a starfield that
   * is indistinguishable from the background plate — a star is a small bright
   * uniform dot, and so was a chunk. Rock differs from a star in three ways,
   * and this supplies all three:
   *
   *   1. IT IS NOT UNIFORM. A lit face and a shadowed face, so the fragment
   *      has internal contrast and reads as a solid object with a form.
   *   2. IT IS NOT ONE COLOUR. Each fragment shifts its own hue and value from
   *      its seed, so a belt is a population of different rocks rather than
   *      one rock stamped 400 times.
   *   3. IT IS DARKER AND WARMER THAN A STAR. Stars are pale and bluish here;
   *      rock is pulled toward the layer's own hue and saturated, so the two
   *      separate by colour as well as by shape.
   */
  function rockFill(colour, el, alpha) {
    var seed = el.seed || 0;
    /* Per-fragment variation, deterministic from the element's own seed.
     * Signed, so a belt scatters either side of the base colour. */
    var vary = Math.sin(seed * 127.1);
    var hue = colour.h + vary * 18;

    /* ROCK IS MUDDY, NOT VIVID.
     *
     * The obvious move — saturate the layer colour hard so the fragments stop
     * looking like stars — overshoots: an outward trait takes the ATMOSPHERE's
     * colour, and a saturated atmosphere hue turns a debris belt into a string
     * of glowing berries. Stone is a low-chroma material, and its colour cue
     * against a starfield is that it is DIM and MURKY where a star is bright
     * and clean, not that it is more colourful.
     *
     * So saturation is held to a mid band — enough that the fragments are
     * clearly coloured rather than white, capped so they stay mineral — and
     * the value is pulled well down. The separation from the starfield is then
     * carried by darkness, texture and the lit/shadow split rather than by
     * chroma. */
    var sat = clamp(colour.s * 0.55 + 0.18, 0.16, 0.48);
    var val = clamp(colour.v * (0.38 + 0.20 * vary), 0.08, 0.46);

    return {
      body: CC.Color.hsva(hue, sat, val, alpha),
      /* The lit crown — brighter and less saturated, as a lit face is. Kept
       * clear of white so it reads as sunlit stone, not as a highlight. */
      lit: CC.Color.hsva(hue + 6, clamp(sat * 0.68, 0, 1),
                         clamp(val + 0.20, 0, 0.66), alpha),
      /* THE SUNWARD RIM — the brightest thing on the fragment, and the mark
       * that does the actual separating.
       *
       * It is allowed to reach much higher than `lit` does, and that is the
       * point rather than an oversight. `lit` is a FACE, and a face this
       * bright would make the whole rock read as a pale dot — the failure
       * being fixed. A rim is a LINE, so it can carry near-specular brightness
       * across a couple of pixels of width without lifting the fragment's
       * overall value at all: the rock stays dim and murky, and gains an edge.
       *
       * Kept in the fragment's own hue and given a floor rather than being set
       * to white, so a belt still reads as stone catching the light instead of
       * as a string of highlights — and so it never becomes the small bright
       * uniform mark it exists to be distinguishable from. */
      rim: CC.Color.hsva(hue + 10, clamp(sat * 0.42, 0, 0.30),
                         clamp(val + 0.46, 0.62, 0.92), alpha),
      /* The dark limb. Deep enough to read at a few pixels across. */
      shadow: CC.Color.hsva(hue - 7, clamp(sat * 1.15, 0, 1),
                            clamp(val * 0.32, 0.02, 1), alpha),
      /* Grain: pits and mineral speckle on the fragment's face. */
      fleck: CC.Color.hsva(hue - 12, clamp(sat * 1.2, 0, 1),
                           clamp(val * 0.48, 0.02, 1), alpha * 0.85)
    };
  }

  /* Speckle is drawn as ONE PATH PER (tone, tier) group rather than one path
   * per dot. A crust can carry a thousand grains; a thousand beginPath/fill
   * pairs is what turns a 200ms render into a 4s one. */
  function drawSpeckleBatch(ctx, view, els, colour, fadeFn, heatBand) {
    if (!els.length) return;

    /* A GRADED LAYER SPLITS BY DEPTH FOR THE SAME REASON, a third time.
     *
     * The grain in a mantle spans the whole band, and one averaged colour
     * across it would paint the grain at the core boundary the same as the
     * grain under the crust — flattening the thermal gradient in the very
     * detail that covers most of the layer's area. Ten buckets, matching the
     * precedent set by the fade bands and the zone shift above. */
    var heatBucket = null;
    if (heatBand) {
      var hSpan = Math.max(1e-6, heatBand.outer - heatBand.inner);
      heatBucket = function (el) {
        return Math.round(clamp(1 - (el.radius - heatBand.inner) / hSpan, 0, 1) * 10);
      };
    }

    /* Group by tier, because tier drives both size and alpha.
     *
     * In a FADING layer the grouping also splits by depth band, because a
     * single averaged alpha across an atmosphere would draw the outermost
     * grains as densely as the innermost and reinstate the hard rim the fade
     * exists to remove. Eight bands is enough for the gradient to read as
     * smooth while still batching hundreds of dots per fill. */
    var byTier = {};
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      var key = fadeFn ? (e.tier + ":" + Math.floor(fadeFn(e.radius) * 8)) : String(e.tier);

      /* A ZONED LAYER ALSO SPLITS BY ITS COLOUR SHIFT.
       *
       * One averaged colour across the whole batch would smear the dayside
       * and nightside into a single mid-tone and erase the terminator — the
       * same failure the fade bands were split to avoid, arriving by a
       * different route. Twelve buckets is enough for the shift to read as
       * continuous while still batching hundreds of dots per fill. */
      if (e.zone) {
        key += "|" + Math.round(e.zone.v * 12) + "," + Math.round(e.zone.h / 8);
      }
      if (heatBucket) key += "#" + heatBucket(e);
      /* A BLENDED TRAIT BATCHES SEPARATELY FROM THE PLAIN GRAIN.
       *
       * The blend is a property of the whole trait rather than of an
       * instance, so every element carrying it shares one value and the split
       * costs at most one extra fill — no per-element state changes, which is
       * the thing that would actually be expensive here. */
      if (e.blend) key += "@" + e.blend;
      (byTier[key] || (byTier[key] = [])).push(e);
    }

    for (var key2 in byTier) {
      if (!Object.prototype.hasOwnProperty.call(byTier, key2)) continue;
      var group = byTier[key2];

      /* Alpha is averaged across the group. Individual variation within a tier
       * is small, and the saving is large. */
      var sum = 0;
      for (i = 0; i < group.length; i++) {
        sum += group[i].alpha * (fadeFn ? fadeFn(group[i].radius) : 1);
      }
      var alpha = clamp(sum / group.length, 0, 1);
      if (alpha <= 0.004) continue;

      /* Inside save()/restore() so the blend cannot leak into later drawing —
       * the same discipline the layer composite in draw/layers.js follows. */
      var blend = group[0].blend;
      if (blend) { ctx.save(); ctx.globalCompositeOperation = blend; }

      ctx.beginPath();
      for (i = 0; i < group.length; i++) {
        CC.Primitives.speckle(ctx, view, group[i]);
      }
      ctx.fillStyle = toneColour(
        heatShift(zoneShift(colour, group[0]), group[0], heatBand),
        group[0].tone, alpha);
      ctx.fill();

      if (blend) ctx.restore();
    }
  }

  /* Draw every element belonging to one layer.
   *
   * The caller has already clipped to the layer's band, so elements cannot
   * spill across a boundary. */
  function drawLayer(ctx, view, elements, colour, opts) {
    opts = opts || {};
    var opacity = opts.elementOpacity === undefined ? 1 : opts.elementOpacity;
    var flowMode = opts.flowMode || "balanced";

    /* An OUTWARD layer's details must fade with its falloff.
     *
     * An atmosphere's band fill dissolves toward its outer edge, but its haze
     * and stipple were drawn at flat alpha across the whole depth. At high
     * Element opacity that made the layer read as a solid shell with a hard
     * rim — the exact failure the falloff curve exists to prevent. Elements
     * now ride the same curve as the fill, so the layer stays a layer however
     * far the opacity control is pushed.
     *
     * `fade` is supplied by the caller as {inner, outer} in body space; the
     * element's own radius decides how much of it it keeps. */
    var fade = opts.fade || null;

    /* The layer's radial extent, so elements can be placed on its thermal
     * gradient. Absent on layers that do not carry one. */
    var heatBand = colour.hotEdge ? (opts.band || null) : null;

    /* How much of its alpha an element keeps, given where it sits in an
     * outward layer's falloff. Uses the same curve as the band fill, so the
     * details and the layer dissolve together. */
    function fadeAt(radius) {
      if (!fade) return 1;
      var span = Math.max(1e-6, fade.outer - fade.inner);
      var t = clamp((radius - fade.inner) / span, 0, 1);
      return CC.Layers.falloffAlpha(t, fade.hold);
    }

    /* Speckle batches; everything else draws individually. */
    var speckles = [];
    var rest = [];
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];

      /* Flow indicators: "none" removes directional elements entirely, and
       * "subtle" downgrades arrows to headless lines. Generation already
       * scaled the COUNT; this governs how they are drawn. */
      if (el.flow && flowMode === "none") continue;
      if (el.kind === "arrow" && flowMode === "subtle") {
        el = { kind: "flow-line", tier: el.tier, angle: el.angle,
               radius: el.radius, size: el.size, alpha: el.alpha,
               tone: el.tone, seed: el.seed, outward: el.outward,
               lean: el.lean, length: el.length };
      }

      if (el.kind === "speckle") speckles.push(el);
      else rest.push(el);
    }

    drawSpeckleBatch(ctx, view, speckles, colour, fade ? fadeAt : null, heatBand);

    for (i = 0; i < rest.length; i++) {
      var e = rest[i];
      var alpha = clamp(e.alpha * opacity * fadeAt(e.radius), 0, 1);
      if (alpha <= 0.004) continue;

      var fn = CC.Primitives.KINDS[e.kind];
      if (!fn) continue;

      /* Each element takes its layer's colour perturbed by whatever zone it
       * fell in — a no-op on an unzoned body — and then moved along the
       * layer's thermal gradient by how deep it sits, a no-op on a layer that
       * does not carry one. */
      var c = heatShift(zoneShift(colour, e), e, heatBand);

      /* Two primitives need a richer style than a single colour string. */
      if (e.floor) {
        /* AN EXCAVATION — a wedge whose floor is in shadow. Filled with a
         * depth gradient rather than flat, which is the difference between a
         * hole in the crust and a patch stuck on it. See depthFill. */
        fn(ctx, view, e, depthFill(c, e.tone, alpha, e.floor));
      } else if (styleFor(e.kind, c, e, alpha)) {
        /* A primitive that wants a richer style than a colour string — rock,
         * a shaded storm, a metal hull, a gem. See styleFor. */
        fn(ctx, view, e, styleFor(e.kind, c, e, alpha));
      } else if (e.kind === "gradient-band") {
        /* Concentric bands are the one element whose whole job is to separate
         * from its neighbours, so this is where `bandContrast` applies. */
        fn(ctx, view, e, {
          mid: toneColour(c, e.tone, alpha, c.bandContrast),
          edge: toneColour(c, e.tone, 0, c.bandContrast)
        });
      } else if (e.kind === "cell") {
        fn(ctx, view, e, {
          line: toneColour(c, e.tone, alpha),
          fill: toneColour(c, e.tone, alpha * 0.22)
        });
      } else if (e.kind === "vein" && e.bulk) {
        /* A BULK VEIN IS TWO-TONE, and that is most of why it separates from
         * the flow indicators around it (D60). Everything else in a mantle is
         * a single-tone stroke; nothing else is a bright body inside a dark
         * contour, so the eye picks it out immediately as a different KIND of
         * thing rather than a brighter example of the same thing.
         *
         * The contour is drawn from the layer's own darkening rule rather than
         * flat black, so it reads as a material edge — the same reasoning the
         * layer boundary stroke in draw/scene.js follows. */
        /* THE FILL IS A METAL, NOT A SILHOUETTE.
         *
         * Running a bulk vein through the ordinary `darker` tone crushed it
         * toward black on an already-dark mantle, and a black shape reads as a
         * hole in the layer rather than as something embedded in it — it lost
         * the material relationship that keeps a dense body from looking like
         * confetti. An ore seam is a DARK SATURATED colour with a hue of its
         * own, so the fill keeps most of its saturation and lands well clear of
         * black, and the contour goes darker still to seat it in the rock. */
        /* `bright` INVERTS THE POLARITY, for a lode of liquid METAL rather
         * than a seam of ore.
         *
         * The dark-fill-in-darker-contour above is right for an ore seam in
         * rock, and it fails completely in a dark fluid: helium rain in a
         * water-cloud deck at v=0.32 drew at v=0.27 — a near-black shape on a
         * dark purple ground, invisible by construction. Darkening only works
         * where there is room beneath to darken INTO.
         *
         * Falling metal is the opposite material anyway. It is reflective, so
         * it is BRIGHTER than the fluid around it, and the contour is what
         * seats it rather than the fill. The two polarities share one
         * primitive and one style shape; which way round they go is a fact
         * about the material, so the trait declares it. */
        var vv, fillC, edgeC;
        if (e.bright) {
          vv = clamp(c.v * 0.55 + 0.42, 0.42, 0.95);
          fillC = CC.Color.hsva(c.h + 8, clamp(c.s * 0.55, 0, 0.55), vv, alpha);
          /* A dark contour under a bright fill, which is what gives a metal
           * droplet its edge against a pale background as well as a dark one. */
          edgeC = CC.Color.hsva(c.h - 4, clamp(c.s * 1.2, 0, 1),
                                clamp(c.v * 0.30, 0.02, 1),
                                clamp(alpha * 1.05, 0, 1));
        } else {
          vv = clamp(c.v * 0.52 + 0.10, 0.10, 0.60);
          fillC = CC.Color.hsva(c.h - 6, clamp(c.s * 1.25, 0, 0.92), vv, alpha);
          edgeC = CC.Color.hsva(c.h - 8, clamp(c.s * 1.15, 0, 1),
                                clamp(vv * 0.42, 0.02, 1),
                                clamp(alpha * 1.05, 0, 1));
        }
        fn(ctx, view, e, { fill: fillC, edge: edgeC });
      } else {
        fn(ctx, view, e, toneColour(c, e.tone, alpha));
      }
    }
  }

  /* ---- surface terrain --------------------------------------------------- */

  /* Draw the terrain profile of a layer that declares relief.
   *
   * Terrain is a boundary displacement plus shading, not a scattered element,
   * which is why it draws here rather than through the primitive table. The
   * layer's band has already been filled to its displaced boundary; this adds
   * the relief shading that makes the profile read as landforms rather than as
   * a wavy edge.
   *
   * THE COASTLINE IS NOT DRAWN HERE. Land is wherever terrain rises above
   * whatever floats on it, and that emerges from the two layers being drawn in
   * order — the ocean fills to its own flat radius over a bumpy floor, so the
   * crossings are coastlines for free (PROGRESS.md D15). */
  function drawRelief(ctx, view, layer, terrain, colour, opts) {
    opts = opts || {};
    var segments = 360;
    var outer = layer.outer;

    /* A highlight along the sunward face of every rise, and a shadow in every
     * hollow. Derived from the LOCAL SLOPE of the field, so it tracks the
     * terrain exactly rather than being a separate decorative pass. */
    var strength = opts.strength === undefined ? 1 : opts.strength;

    ctx.save();
    ctx.lineCap = "butt";

    for (var i = 0; i < segments; i++) {
      var a0 = (i / segments) * TAU;
      var a1 = ((i + 1) / segments) * TAU;

      var h0 = terrain.at(a0);
      var h1 = terrain.at(a1);
      var slope = (h1 - h0) / Math.max(1e-6, terrain.amplitude);

      /* Slope drives both the sign and the strength of the shading.
       *
       * The gain is modest on purpose. At a high gain the term saturates at
       * ±1 across almost every segment, so the shading stops tracking the
       * terrain and instead paints the entire band — which turned the crust
       * into a near-black ring and buried the detail inside it. Kept low,
       * only genuinely steep ground picks up a highlight or a shadow, and
       * flat ground keeps the layer's own colour. */
      var lit = clamp(slope * 3.2, -1, 1);
      if (Math.abs(lit) < 0.06) continue;

      var alpha = Math.abs(lit) * 0.34 * strength;
      var style = lit > 0
        ? CC.Color.rgba(colour.lighter(0.50), alpha)
        : CC.Color.rgba(colour.darker(0.55), alpha);

      var rOut = outer + h0;
      /* Shade only a SHALLOW band just beneath the surface.
       *
       * At 0.75 of the amplitude this reached most of the way down the crust
       * and buried the strata and fractures underneath it — the layer ended up
       * with a textured edge and an empty middle. Relief shading belongs at
       * the surface, which is both what reads correctly and what leaves the
       * layer's own detail visible. */
      var rIn = rOut - Math.max(0.004, terrain.amplitude * 0.30);

      var p0 = view.at(rOut, a0);
      var p1 = view.at(rOut + (h1 - h0), a1);
      var p2 = view.at(rIn + (h1 - h0), a1);
      var p3 = view.at(rIn, a0);

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fillStyle = style;
      ctx.fill();
    }

    ctx.restore();
  }

  return {
    drawLayer: drawLayer,
    drawRelief: drawRelief,
    toneColour: toneColour,
    depthFill: depthFill,
    rockFill: rockFill,
    mosaicFill: mosaicFill,
    styleFor: styleFor,
    stormFill: stormFill,
    hullFill: hullFill,
    gemFill: gemFill,
    heatShift: heatShift,
    zoneShift: zoneShift
  };
})();
