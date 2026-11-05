/* One layer's hue, in the order the layer's own stream draws it: the exotic
 * waiver, the anchor-derived hue, the lean toward hot rock, the star's cast.
 * Stages of `deriveLayer` (gen/palette-layer.js): `st` is the body's state and
 * `c` the layer's own.
 *
 * Split out of gen/palette.js, which passed the 500-line rule. Attached to
 * CC.Palette; gen/palette.js and gen/palette-util.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp, lerp = CC.Math.lerp;
  var wrapHue = CC.Palette.wrapHue, mixHue = CC.Palette.mixHue;
  var emissiveSpec = CC.Palette.emissiveSpec;

    /* EXOTIC OCEANS — the one place an authored hue range may be waived.
     *
     * The ocean is the only layer in the palette with an absolute `hue`, and
     * it is there for a measured reason recorded below: without it, a sea on
     * a rust-coloured world came out brown, which was the single thing that
     * most stopped these reading as planets. So the realistic range stays
     * the DEFAULT and the strange case is opt-in — the user's own proposed
     * shape, and the right one (PROGRESS.md D39).
     *
     * THREE LIMITS, AND ALL THREE HAVE TO LIFT TOGETHER. Measured across 300
     * bodies: hue was confined to 160..256 of the wheel, `hueLean` meant the
     * user could not override it even by setting the primary to red, and
     * `val` capped at 0.38 so no sea could ever be pale, white or bright.
     * Freeing the hue alone would only have produced "a dark sea of a
     * different colour", which is not what the control promises.
     *
     * A LAYER OPTS IN BY DECLARING `exotic`, so this is archetype data
     * rather than a role name in the palette — a magma sea or a liquid-metal
     * ocean on another archetype gets the same treatment by declaring it. */
  function waiveForExotic(st, c) {
    var params = st.params;
    var spec = c.spec;
    if (spec.exotic && params.exoticOceans) {
      spec = {
        sat: spec.exotic.sat || spec.sat,
        val: spec.exotic.val || spec.val,
        /* No `hue` at all: the layer falls through to deriving from the
         * anchors like every other layer, so it rolls anywhere the body's
         * own colour scheme reaches — and `hueWild` below takes it the rest
         * of the way round the wheel. */
        hueWild: spec.exotic.wild === undefined ? 1 : spec.exotic.wild,
        incandescent: spec.incandescent,
        heatDriven: spec.heatDriven,
        /* CARRIED THROUGH, because depth shading is a property of being a
         * FLUID, not of being water. A liquid-metal or ammonia sea absorbs
         * light with distance exactly as a water one does, so an exotic sea
         * that lost its gradient would come out as a flat disc of strange
         * colour — losing the volume that makes it read as a sea at all.
         * This rebuild drops any field it does not name, so a gradient added
         * to the base spec has to be listed here or it silently applies to
         * realistic oceans only. */
        depthGradient: spec.depthGradient,
        heatLean: spec.heatLean,
        heatGradient: spec.heatGradient,
        activity: spec.exotic.activity
      };
    }
    c.spec = spec;
  }

    /* Hue: outward layers ride the tertiary anchor, everything else travels
     * from primary at the surface to secondary at the core.
     *
     * The journey is heavily back-loaded. An earlier version eased with
     * depth² and moved the whole body through hue space, which made crust
     * and mantle drift toward the core's hue — every world came out as a
     * pastel bullseye rather than rock over metal. Holding the outer two
     * thirds near the primary is what makes the surface read as *material*
     * and the core read as the departure from it. */
  function baseHue(st, c) {
    var spec = c.spec, layer = c.layer, depth = c.depth, lrng = c.lrng;
    var primary = st.primary, secondary = st.secondary, tertiary = st.tertiary;

    var h;
    if (spec.hueWild) {
      /* FREE OF THE ANCHORS ENTIRELY. `hueLean` dropping to zero is most of
       * the point — the whole idea is a sea that is NOT derived from the
       * body's primary, so leaning it back toward the primary would defeat
       * the control. Rolled from the layer's own stream, so it varies per
       * body without disturbing anything else. */
      h = wrapHue(lrng() * 360);
    } else if (spec.hue) {
      /* A materially-determined layer. Some materials have a colour of
       * their own that survives whatever the rest of the body is made of:
       * water is blue-green on any world, ice is white-blue, molten metal
       * glows orange. Those layers declare an absolute hue range and only
       * *lean* toward the body's primary rather than being derived from it.
       *
       * Without this, an ocean on a rust-coloured world came out brown,
       * which is the single thing that most stopped these reading as
       * planets. */
      var own = wrapHue(lerp(spec.hue[0], spec.hue[1], lrng()));
      h = mixHue(own, primary, spec.hueLean === undefined ? 0.18 : spec.hueLean);
    } else if (layer.outward) {
      h = tertiary;
    } else {
      var t = Math.pow(clamp((depth - 0.35) / 0.65, 0, 1), 1.4);
      h = mixHue(primary, secondary, t);
    }

    /* A small per-layer hue jitter keeps adjacent bands from looking like
     * flat steps of one gradient, without breaking the family. */
    h = wrapHue(h + (lrng() * 2 - 1) * 7);
    c.h = h;
  }

    /* HOT ROCK IS NOT THE SAME COLOUR AS COLD ROCK (D59).
     *
     * The mantle had no hue anchor of its own, so it derived entirely from
     * the surface->core journey — and that journey is deliberately
     * back-loaded (see the note above, and the "pastel bullseye" it exists
     * to prevent), which leaves the mantle still ~76% the SURFACE hue. On a
     * blue-grey world the mantle came out blue-grey however hard the
     * Interior heat dial was pushed. Textbook cutaways do not look like
     * that: the mantle is drawn as rock near melting point, and its colour
     * says so.
     *
     * `heatLean: { hue: [lo, hi], amount: k }` gives a layer a hot-side hue
     * to travel TOWARD, and — this is the part that matters — the journey is
     * scaled by the Interior heat parameter. At heat 0 the lean is nothing
     * at all and the layer keeps exactly the anchor-derived colour it had
     * before, because a dead world's mantle genuinely is cold rock. At heat
     * 1 it travels `amount` of the way to the hot band.
     *
     * This is the "perturb, not replace" rule (zones.js rule 1) that the
     * starlight cast already follows, applied to heat: the same seed at
     * three heat settings must give three visibly different worlds that are
     * still recognisably the same world. Pinning the hue outright — the
     * obvious fix — would have made every hot planet's mantle the identical
     * orange and thrown away the body's own colour scheme, which is the one
     * thing the whole anchor system exists to protect.
     *
     * WEIGHTED BY DEPTH, so a shallow layer that opts in feels it less than
     * a deep one. Heat comes from the middle; a layer's share of it is its
     * distance down the stack. */
  function leanHot(st, c) {
    var spec = c.spec, depth = c.depth, lrng = c.lrng, h = c.h;
    var heat = st.heat;
    if (spec.heatLean && spec.heatDriven !== false) {
      var hotHue = spec.heatLean.hue || [10, 40];
      var hotAmt = spec.heatLean.amount === undefined ? 0.45
                   : spec.heatLean.amount;
      /* Only the hot half of the dial leans. Below 0.5 the layer stays where
       * the anchors put it and the existing cold-world desaturation below is
       * what carries "dead", which it already did well. */
      var lean = clamp((heat - 0.5) / 0.5, 0, 1);
      if (lean > 0) {
        var hot = wrapHue(lerp(hotHue[0], hotHue[1], lrng()));
        var leanDepth = 0.45 + 0.55 * depth;

        /* A FIXED FRACTION OF THE JOURNEY IS NOT ENOUGH FOR THE FAR HUES.
         *
         * Moving 55% of the way to the hot band works if you start near it
         * and fails badly if you do not: measured over 400 bodies at FULL
         * heat, 38% of mantles still landed outside the hot hues, and the
         * worst of them were the greens — a mantle at h=133 moved only to
         * h=77, which is yellow-green and reads as olive rock, exactly the
         * "still just a rock layer" case reported.
         *
         * So the fraction scales with HOW FAR THERE IS TO GO. A hue already
         * close to the hot band barely moves, which preserves the body's own
         * colour scheme where it is already warm; a hue on the far side
         * moves most of the way, because at full heat "this rock is nearly
         * molten" has to win over "this world is green". The body still
         * shows through — in saturation, in the surface and crust above, and
         * in where within the hot band it lands — so this is still perturb
         * rather than replace. */
        var away = Math.abs(((h - hot + 540) % 360) - 180) / 180;
        var reach = hotAmt * (0.62 + 0.85 * away);

        h = mixHue(h, hot, clamp(lean * reach * leanDepth, 0, 0.95));

        /* AND THEN IT MUST NOT STOP IN THE YELLOWS.
         *
         * Leaning is a JOURNEY, so a hue starting far away lands wherever it
         * got to — and for the greens that is the yellow-olive band around
         * 55-90, which passes a "is it in the hot hues" test on the numbers
         * and reads as sulphur or khaki rock to the eye. Measured at full
         * heat: 40% of mantles landed at hue 52+, and four of six renders in
         * a spot check came out yellow-green. The hue test was asking a
         * weaker question than the picture does.
         *
         * Molten ROCK is red-orange. Yellow and white belong to the metal
         * core, and letting the mantle reach them also flattens the contrast
         * against the core that the interior depends on. So after the lean,
         * anything left in the yellow band is carried the rest of the way
         * down to the top of the hot range — a hard limit on the DESTINATION
         * rather than on the journey, which leaves the lean itself free to
         * stay proportional for every hue that does not need it. */
        if (spec.heatLean.ceiling !== false) {
          var top = hotHue[1];
          var hn = wrapHue(h);
          /* The yellow-through-green danger band, above the hot range and
           * below the point where hues wrap back toward red through violet. */
          if (hn > top && hn < 300) {
            var over = clamp((hn - top) / 60, 0, 1);
            /* Pulled progressively harder the further into the yellows it
             * sits, so a hue barely over the line is nudged and a green one
             * is brought fully home. */
            /* NOT scaled by `lean`. The ceiling is about WHERE a hot layer
             * is allowed to end up, and a half-heated mantle is still a
             * heated mantle — scaling it by the dial left 80% of bodies
             * olive at heat 0.55, which is the same complaint one notch
             * down the slider. `lean` already gates whether this block runs
             * at all, which is the correct place for the dial to have its
             * say. */
            h = mixHue(hn, top, clamp(0.55 + 0.45 * over, 0, 1));
          }
        }
      }
    }
    c.h = h;
  }

    /* THE STAR'S LIGHT CASTS OVER WHAT IT LIGHTS.
     *
     * A red-dwarf world is dimmer and ruddier; a blue-giant world is harsh
     * and bright. This is the "perturb, not replace" rule (zones.js rule 1)
     * applied to light: the same seed under three star colours must give
     * three visibly different worlds that are still recognisably the SAME
     * world, so the cast pulls each layer a fraction of the way toward the
     * star's hue rather than setting it.
     *
     * IT FALLS OFF WITH DEPTH, which is the part that makes it read as light
     * rather than as a filter over the whole image. Starlight reaches the
     * surface and the sky; it does not reach the core, and a core that took
     * the same tint as the crust would look like a wash laid over the
     * picture instead of a world lit by a particular sun.
     *
     * Self-lit layers are exempt entirely: a molten core emits its own light
     * and a star's colour has no business changing what colour that is —
     * the same exemption D13 established for the saturation ceiling. */
  function castStar(st, c) {
    var spec = c.spec, layer = c.layer, depth = c.depth, h = c.h;
    var starCast = st.starCast, starHue = st.starHue;
    if (starCast > 0 && !emissiveSpec(spec)) {
      var reach = starCast * (1 - depth) * (layer.outward ? 1.25 : 1);
      h = mixHue(h, starHue, clamp(reach, 0, 0.6));
    }
    c.h = h;
  }

  CC.Palette.waiveForExotic = waiveForExotic;
  CC.Palette.baseHue = baseHue;
  CC.Palette.leanHot = leanHot;
  CC.Palette.castStar = castStar;
})();
