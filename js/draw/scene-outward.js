/* The scene's outward passes: the two halves of the outward traits, an outward
 * layer's fill, haze and per-bearing reach, and how far out the picture reaches.
 * Stages of `render` (draw/scene.js), sharing its state object.
 *
 * Split out of draw/scene.js, which passed the 500-line rule. Attached to
 * CC.Scene; draw/scene.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var SILHOUETTE_RELIEF = CC.Scene.SILHOUETTE_RELIEF;

  /* Blend mode for outward layers — atmospheres, coronae, halos.
   *
   * "screen" was chosen over "lighter" (additive): additive blows out to white
   * wherever the layer overlaps a bright surface, which loses the atmosphere's
   * hue exactly where it is thickest. Screen approaches white asymptotically
   * instead, so a dense atmosphere over a bright ocean stays coloured. */
  var ATMOSPHERE_BLEND = "screen";

  /* Colour supplier for an outward layer. A function rather than an inline
   * closure so the colour and peak alpha are captured per layer — `var` in
   * the draw loop would otherwise leak the last iteration's values into
   * every gradient.
   *
   * LIMB BRIGHTENING. Every stop used to be the same flat hex, with only the
   * alpha varying, which is what made a thick atmosphere read as a painted
   * band sitting on the ocean. Real atmospheric scattering brightens toward
   * the limb — you are looking through more gas at a grazing angle — so the
   * colour lightens and desaturates with height. That, plus the `screen`
   * composite, is what makes the layer read as gas rather than as paint.
   *
   * `colour` is the palette entry (with .h/.s/.v), not a hex string, so the
   * shift can happen in HSV where it stays in family. */
  function outwardStyle(colour, peak, hold, composite) {
    return {
      hold: hold,
      composite: composite,
      at: function (a, t) {
        var u = t === undefined ? 0 : t;
        /* Brighten and desaturate outward. Capped well short of white so the
         * layer keeps its own hue rather than bleaching at the rim. */
        var v = Math.min(1, colour.v * (1 + 0.45 * u) + 0.10 * u);
        var s = Math.max(0, colour.s * (1 - 0.40 * u));
        return CC.Color.hsva(colour.h, s, v, peak * a);
      }
    };
  }

  /* WHERE THE GROUND MAY SIT IN THE GAS COLUMN, as a fraction of it.
   *
   * The atmosphere's alpha falls off across its own thickness, so clearing
   * the ground geometrically is not the same as covering it visibly. At
   * t = 0.73 of the column the falloff is down to 0.18 and, screened, the
   * gas outside the body came to zero rendered pixels — the defect the user
   * reported. Holding the ground at 0.55 puts it where the curve still has
   * real weight.
   *
   * A fraction, never a pixel count: the same body must be the same shape at
   * preview and export size. */
  var AIR_FLOOR = 0.55;

  /* How far out the picture reaches, measured from the body and its details
   * alone — no drawing — so `lens` can ask it before a render as well. */
  function reachOf(body, settings, details) {
    /* HOW FAR OUT THE PICTURE REACHES. This used to size the body — it does
     * not any more (see draw/canvas.js), because letting it do so meant every
     * ringed world was drawn smaller than a bare one. What it is now is a
     * MEASUREMENT: the outermost body-space radius anything occupies, which is
     * what the pan clamp uses to decide how far the user may travel before
     * there is nothing left to look at. */
    var extent = body.extent || 1;

    /* AN INFLATED FACE REACHES PAST THE NOMINAL OUTER RADIUS.
     *
     * `airAt` may exceed 1 — a heated dayside's atmosphere is genuinely taller
     * than the layer's rolled thickness — so the frame has to allow for the
     * bulge or it would be cropped flat against the edge, which would read as
     * the very circle the feature exists to break. Measured rather than
     * assumed, since the recipe's figures are data. */
    var atmosL = null, al = 0;
    for (; al < body.layers.length; al++) {
      if (body.layers[al].outward) { atmosL = body.layers[al]; break; }
    }
    if (atmosL) {
      /* THE SWEEP MUST SEE THE COMPOSED FUNCTION, NOT ONLY THE ZONE'S HALF.
       *
       * It used to sweep `zones.airAt` alone, which was complete while a
       * bulge was the only thing that could move this edge. It is not any
       * more: an outward layer may also WOBBLE, and a wobble crest that is
       * not in this sweep gets cropped flat against the frame — turning the
       * very feature that exists to break the circle back into one.
       *
       * The same function the fill is drawn with is swept here, so the two
       * cannot disagree. This is deliberately the OPPOSITE call from the
       * emissive glow (draw/emissive.js), which is excluded: the wobble
       * moves the body's own silhouette and cropping it destroys the feature,
       * while a halo reads correctly running off the edge. */
      var innerL = (al + 1 < body.layers.length)
        ? body.layers[al + 1].outer : body.surface;
      var zoneAir = (details.zones && details.zones.airAt)
        ? details.zones.airAt : null;
      var extWob = CC.Layers.outwardWobbleFn(atmosL, settings.seed);
      if (zoneAir || extWob) {
        var peak = 1;
        for (var ad = 0; ad < 360; ad += 3) {
          var aRad = ad * Math.PI / 180;
          var kA = (zoneAir ? zoneAir(aRad) : 1) * (extWob ? extWob(aRad) : 1);
          if (kA > peak) peak = kA;
        }
        var reach = innerL + (atmosL.outer - innerL) * peak;
        if (reach > extent) extent = reach;
      }
    }
    /* A SWOLLEN SKIN IS THE BODY'S OWN SILHOUETTE, SO IT IS IN THE SWEEP.
     *
     * D134 is the rule and this is the same call as the coronal wobble, not
     * the opposite one the emissive glow gets: a measurement of reach should
     * include anything whose SHAPE is the feature. A photosphere pulled
     * toward a companion is the body's outline, so a crest cropped flat
     * against the frame destroys the very thing the feature exists to show.
     *
     * IT CANNOT BE ABSORBED BY RENORMALIZATION. gen/structure.js puts the
     * surface at exactly 1.0 at the END of `build`, while the zones are
     * constructed later in gen/details-traits.js — so the swell moves the drawn edge
     * past 1.0 after the fact and nothing upstream can take it back. An
     * angular sea level already does exactly this; the frosting and the
     * atmosphere floor both cope by measuring the real per-bearing top rather
     * than trusting `layer.outer`, and this measures it the same way.
     *
     * The outermost BANDED layer only. Deeper layers swell too (weakly, by
     * design) but they are buried, and an inner layer cannot move a
     * silhouette it does not own. */
    if (details.zones && details.zones.swellAt) {
      for (var sb = 0; sb < body.layers.length; sb++) {
        var sL = body.layers[sb];
        if (sL.outward) continue;
        var sT = sL.thickness || 0;
        if (sT > 0) {
          for (var sd2 = 0; sd2 < 360; sd2 += 3) {
            var sTop = sL.outer
              + details.zones.swellAt(sd2 * Math.PI / 180, sL.role) * sT;
            if (sTop > extent) extent = sTop;
          }
        }
        break;
      }
    }

    /* THE BODY'S OWN REACH, TAKEN BEFORE THE ORBITAL ELEMENTS GO IN.
     *
     * Everything measured above — the atmosphere's bulge, the outward wobble,
     * the swollen skin — is the BODY'S SILHOUETTE: features whose shape is the
     * body's own outline. Everything measured below is in ORBIT around it, and
     * the two must not be the same number even though both are "how far out
     * does this picture go".
     *
     * `extent` from here on is the FRAME's reach and is used to size the view.
     * `bodyReach` is where the body stops, and it is what bounds a spanning
     * trait — see the clip in draw/scene-surface.js for why that distinction is the fix to
     * a real defect rather than a tidying-up. */
    var bodyReach = extent;

    if (details.outward && details.outward.length) {
      var reaches = [], oe;
      for (var oi = 0; oi < details.outward.length; oi++) {
        oe = details.outward[oi];
        reaches.push(oe.radius + (oe.size || 0));
      }
      /* THE OUTERMOST ELEMENT, not the 88th percentile. The percentile was
       * right when this figure sized the body and a lone stray ring would have
       * shrunk everything to accommodate it. As a pan bound the trade runs the
       * other way: clamping to the 88th percentile would fence the user off
       * from the handful of elements furthest out, which are exactly the ones
       * worth panning to. */
      reaches.sort(function (a, b) { return a - b; });
      var pick = reaches[reaches.length - 1];
      if (pick > extent) extent = pick;
    }

    return { extent: extent, bodyReach: bodyReach };
  }

  /* ---- the two halves of the outward traits ---------------------------- */

  /* --- 2. outward traits, back half ---
   *
   * Rings and debris pass BEHIND the body as well as in front of it, which
   * is the single thing that makes them read as orbiting rather than as a
   * flat decal. The split is by screen position — an element in the upper
   * half of the ellipse is on the far side — so it needs no 3D and no depth
   * buffer, only drawing the two halves either side of the body.
   *
   * ARCHITECTURE's draw order puts this at step 2 and the front half at
   * step 5, which is exactly what these two calls are. */
  function outwardHalf(sc, half) {
    CC.ZonePaint.drawOutward(sc.ctx, sc.view, sc.details, sc.palette,
                             sc.elementOpacity, half, sc.sky);
  }

  /* ---- an outward layer -------------------------------------------------- */

  function drawOutwardLayer(sc, i, layer, colour) {
    var ctx = sc.ctx, view = sc.view, details = sc.details, settings = sc.settings;
    var body = sc.body, layers = sc.layers, silhouette = sc.silhouette;
    var elementOpacity = sc.elementOpacity;

    /* An outward layer is space round the body, not body, so a wound
     * does not cut it: the clip is lifted while it draws. */
    CC.RuptureDraw.end(ctx, sc.ruptured);
    /* Atmosphere and friends: a falloff outward from whatever is beneath.
     * The curve lives in draw/layers.js; this only supplies the colour. */
    var inner = (i + 1 < layers.length) ? layers[i + 1].outer : body.surface;

    /* Screen blending means the layer can only ever ADD light to what is
     * behind it, so it can never read as an opaque band however far the
     * opacity controls are pushed. Screening against a dark background
     * also costs apparent density, which is why the peak alpha is higher
     * than the 0.62 that source-over needed. */
    /* THE ATMOSPHERE'S EXTENT IS ANGULAR ON A ZONED BODY.
     *
     * `airAt` is a thickness multiplier per bearing — the gas inflates
     * over the heated face and collapses where it cold-traps and freezes
     * out. Handed to the renderer as a plain function of angle, so
     * draw/layers.js shapes real geometry with it and never learns what a
     * zone is (D23). Null on an unzoned body, which keeps the cheap
     * single-gradient path. */
    var airFn = null;
    if (details.zones && details.zones.airAt) {
      /* A COLLAPSING ATMOSPHERE MUST NOT SINK BELOW THE GROUND.
       *
       * `airAt` shrinks the gas toward the layer's inner edge, but that
       * edge is the layer's NOMINAL floor — the rock and the sea below it
       * carry relief and an angular sea level, so on a cold face where the
       * air thins to 0.45 the shrinking edge can pass under peaks that are
       * still at full height. The solid then pokes out through the gas,
       * which is what the user saw at low ocean depth: a green frosted rim
       * standing outside the atmosphere.
       *
       * The floor is raised per bearing to whatever is actually there, so
       * the gas always starts at the ground. This is a FLOOR, never a
       * ceiling: a face may still inflate freely. */
      airFn = (function (zf, innerR, outerR) {
        var solid = layers[silhouette];
        var sTerr = solid ? details.terrain[solid.role] : null;
        var sSea = (details.seaLevel && solid)
          ? details.seaLevel[solid.role] : null;

        /* THE FROSTING SITS ON TOP OF THE ROCK, AND THE FLOOR HAS TO KNOW.
         *
         * `ground` below counted rock plus sea level and stopped there —
         * but draw/film.js DEPOSITS material above the rock, and it is
         * drawn after the atmosphere, so it paints straight over the gas.
         * Measured on the reported body: the solid reached 0.0306 above
         * the atmosphere's inner edge while the floor thought the ground
         * was 0.0306 lower, which is why a body-space breach probe found
         * nothing and the render plainly showed the ground outside the
         * haze.
         *
         * The frosting's own clip cap is `layer.outer + range.hi * relief`
         * — the highest the deposit can ever reach — so that is what the
         * air has to clear. Using the cap rather than the per-bearing
         * deposit is deliberate: it is cheap, it cannot under-estimate,
         * and the cost is a slightly more generous floor on bearings where
         * the frosting happens to be thin.
         *
         * This is the same class of error as D31 (a clamp measured against
         * the wrong layer, so it could never fire) and D34 (a probe that
         * measured the ocean while the crust was what poked out). The
         * recurring shape: **the thing that sticks out is not always the
         * thing the layer boundary names.** */
        var frostTop = 0;
        for (var fi = 0; fi < layers.length; fi++) {
          var fl2 = layers[fi];
          if (fl2.outward) continue;
          var fT = details.terrain[fl2.role];
          if (!fT) continue;
          var fRelief = (fi === silhouette) ? SILHOUETTE_RELIEF : 1;
          /* The frosting's own clip cap, exactly as draw/film.js computes
           * it — one expression in two places is a drift risk, but the
           * alternative is the renderer asking the frosting where it
           * reaches before the frosting has run. Kept identical and
           * asserted in test/sweep.mjs instead. */
          var top = fl2.outer + Math.max(0, fT.range().hi) * fRelief;
          if (top > frostTop) frostTop = top;

          /* AND WHATEVER FLOATS ON IT, at its highest bearing. A sea with
           * an angular level bulges on the cold face, and that bulge is
           * drawn after the gas exactly as the frosting is. Sampled rather
           * than derived, because `seaAt` is already clamped against the
           * fluid's own headroom (D31) and re-deriving the clamp here
           * would be a third copy of it. */
          var fSea = details.seaLevel ? details.seaLevel[fl2.role] : null;
          var fFluid = (fi > 0 && !layers[fi - 1].outward) ? layers[fi - 1] : null;
          if (fFluid) {
            var seaPeak = fFluid.outer;
            if (fSea) {
              for (var sd = 0; sd < 360; sd += 5) {
                var sTop = fFluid.outer + fSea(sd * Math.PI / 180);
                if (sTop > seaPeak) seaPeak = sTop;
              }
            }
            if (seaPeak > frostTop) frostTop = seaPeak;
          }
        }
        /* Whatever floats on the silhouette layer, since on an ocean world
         * it is the SEA's top that the air rests on, not the rock's. */
        var fl = (silhouette > 0 && !layers[silhouette - 1].outward)
          ? layers[silhouette - 1] : null;
        var span = Math.max(1e-6, outerR - innerR);

        /* The silhouette layer's own tidal swell, resolved once. Null on
         * every unzoned body and on every zone recipe that declares no
         * `swell`, which is all of them but the stars and the giants. */
        var solidSwell = (solid && details.zones && details.zones.swellAt)
          ? details.zones.swellAt : null;
        var solidT = solid ? (solid.thickness || 0) : 0;
        if (solidT <= 0) solidSwell = null;

        return function (a) {
          var k = zf(a);

          var ground = solid
            ? solid.outer + (sTerr ? sTerr.at(a) * SILHOUETTE_RELIEF : 0)
            : innerR;

          /* AND THE SWELL, PER BEARING RATHER THAN AT ITS PEAK.
           *
           * The corona's inner edge IS the chromosphere's outer edge, so
           * if the skin bulges toward the companion and the halo does not
           * follow AT THAT BEARING, the two separate and a gap of empty
           * space opens along the limb exactly where the feature is
           * loudest.
           *
           * The frosting above is folded in at its global peak, which is
           * deliberately conservative and cheap; this one must not be.
           * A peak figure would lift the whole corona by the facing
           * side's bulge, which is a uniform inflation — the opposite of
           * the asymmetry being drawn. Per bearing, the halo rides the
           * skin and the shape survives. */
          if (solidSwell) {
            var swTop = solid.outer + solidSwell(a, solid.role) * solidT;
            if (swTop > ground) ground = swTop;
          }

          if (fl) {
            var seaTop = fl.outer + (sSea ? sSea(a) : 0);
            if (seaTop > ground) ground = seaTop;
          }
          /* Whatever the frosting deposited on the rock, which is drawn
           * after the gas and would otherwise paint over it. */
          if (frostTop > ground) ground = frostTop;

          /* THE FLOOR IS MEASURED AGAINST WHERE THE GAS IS STILL VISIBLE,
           * NOT AGAINST ITS GEOMETRIC EDGE.
           *
           * This took three attempts and the first two were both
           * geometrically correct, which is why they were hard to see
           * through.
           *
           * The original added a hairline above the ground. The second
           * added a fixed fraction of the layer's thickness. Neither
           * worked, because an atmosphere's alpha FALLS OFF across its
           * column: measured on the reported body, the ground sat at
           * t = 0.73 of the collapsed column, where `falloffAlpha` is
           * already down to 0.18 and — after the `screen` composite — the
           * gas outside the body contributed literally ZERO pixels. On
           * the inflated face the same ground sat at t = 0.33, where alpha
           * is 0.68. Same geometry, same clearance, completely different
           * picture.
           *
           * So the question is not "does the gas reach past the ground"
           * but "does the ground sit low enough in the column that real
           * gas covers it". `AIR_FLOOR` is that position — the ground is
           * held at or below this fraction of the gas column, which puts
           * it where the falloff still has weight.
           *
           * A fraction, never a pixel count, so the shape is identical at
           * preview and export size. A collapsed face still reads as
           * collapsed: the inflated face is more than twice as thick and
           * far brighter. What it no longer does is disappear.
           *
           * > **The lesson, and it is D30's with the sign flipped:** D30
           * > established that a statement about REACH must be drawn as
           * > geometry rather than as compositing. The converse also
           * > holds — a requirement about VISIBILITY cannot be satisfied
           * > by geometry alone, because what the eye receives is the
           * > geometry times the falloff. Both halves have to be checked
           * > against rendered pixels. */
          var need = (ground - innerR) / (span * AIR_FLOOR);
          return k < need ? need : k;
        };
      })(details.zones.airAt, inner, layer.outer);
    }

    /* --- THE COMPOSED PER-BEARING REACH ---------------------------
     *
     * `airFn` above is the ZONE's answer to "how far does this layer
     * reach at this bearing" — a tidal bulge, a collapsed night face.
     * The layer's own wobble answers the same question for a different
     * reason, so the two are the same KIND of thing and compose by
     * multiplication rather than needing a second code path:
     *
     *     thicknessAt(a) = wobble(a) * bulge(a)
     *
     * `airFn` above already composes `airAt` with a per-bearing ground
     * floor a few lines above, which is the direct precedent. Building the
     * composition ONCE here is what makes the coronal wobble and the
     * binary-companion bulge one feature with two knobs instead of two
     * features fighting over one function.
     *
     * Null when neither exists, which keeps the cheap single-gradient
     * path for every body that wobbles nothing and zones nothing. */
    var wobFn = CC.Layers.outwardWobbleFn(layer, settings.seed);
    var reachFn = airFn;
    if (wobFn) {
      reachFn = airFn
        ? (function (w, z) {
            return function (a) { return w(a) * z(a); };
          })(wobFn, airFn)
        : wobFn;
    }

    /* HOW DENSE THE LAYER READS BEFORE IT STARTS TO TAPER.
     *
     * `hold` is the fraction of the depth carried at near-full opacity;
     * the taper is a smoothstep after it (draw/layers.js `falloffAlpha`).
     * A planet's atmosphere wants the default — it is genuinely thin and
     * should dissolve early. A gas giant's cirrus deck is the opposite: a
     * DENSE skin that stops being opaque only at its very edge, so it
     * declares a high hold and the ease-out does its work late.
     *
     * Archetype data rather than a role check, so any layer that is
     * substantial-then-fading can say so. Carried on the layer by
     * gen/structure-resolve.js. */
    /* ATMOSPHERE OPACITY (D312) scales the air alone: the fill's peak,
     * its haze and sub-bands, and its zone tint. 1 is the tuned look; past
     * 1 the peak clips to opaque further out, which is what reads as a
     * denser envelope. Coronae, cloud decks and the machine world's
     * defense shell share this branch and keep 1. */
    var airK = layer.role === "atmosphere" && settings.atmosphereOpacity !== undefined
      ? settings.atmosphereOpacity : 1;
    CC.Layers.fillOutward(ctx, view, layer, inner,
      outwardStyle(colour, 0.82 * layer.strength * airK, layer.fadeHold,
                   ATMOSPHERE_BLEND),
      reachFn);

    /* Haze and sub-bands sit inside the falloff. Clipped to the outward
     * layer's extent rather than to a band, since it has no inner edge of
     * its own.
     *
     * THE CLIP FOLLOWS THE ANGULAR EDGE. Clipping haze to the layer's full
     * circular extent would let it hang in the empty space over a face
     * whose gas has collapsed — the stipple would draw the circle the fill
     * no longer does, and the shaped silhouette would be lost to the very
     * detail meant to sit inside it. */
    ctx.save();
    ctx.globalCompositeOperation = ATMOSPHERE_BLEND;
    ctx.beginPath();
    if (reachFn) {
      CC.Layers.traceBoundary(ctx, view, layer.outer, function (a) {
        var k = reachFn(a);
        if (k < 0.05) k = 0.05;
        return (inner + (layer.outer - inner) * k) / layer.outer;
      }, false);
    } else {
      ctx.arc(view.cx, view.cy, view.px(layer.outer), 0, Math.PI * 2);
    }
    ctx.arc(view.cx, view.cy, view.px(inner), 0, Math.PI * 2, true);
    ctx.clip("evenodd");
    CC.DrawDetails.drawLayer(ctx, view, details.get(layer.role), colour, {
      elementOpacity: elementOpacity * 0.85 * airK,
      flowMode: details.flowMode,
      /* Details ride the layer's own falloff, so the atmosphere dissolves
       * as a whole rather than fading its fill while its haze stays flat
       * — which at high Element opacity read as a solid shell. */
      fade: { inner: inner, outer: layer.outer }
    });
    ctx.restore();

    /* The atmosphere carries the zone too. It is the outermost thing the
     * eye sees, so leaving it uniform washes a flat film over both faces
     * and cancels the terminator underneath it. */
    ctx.save();
    ctx.globalAlpha = Math.min(1, airK);
    CC.ZonePaint.paintZoneBand(ctx, view, layer, colour, details.zones, inner);
    ctx.restore();
    sc.ruptured = CC.RuptureDraw.begin(ctx, view, details.rupture);
  }

  CC.Scene.reachOf = reachOf;
  CC.Scene.outwardHalf = outwardHalf;
  CC.Scene.drawOutwardLayer = drawOutwardLayer;
})();
