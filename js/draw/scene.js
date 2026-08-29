/* Scene assembly — the draw order from docs/ARCHITECTURE.md.
 *
 *   1. background
 *   2. outward traits (back)          [Phase 4]
 *   3. layers, outermost -> innermost
 *        a. base fill
 *        b. layer details             [Phase 3]
 *        c. trait instances           [Phase 4]
 *        d. boundary line
 *   4. surface-attached               [Phase 4]
 *   5. outward traits (front)         [Phase 4]
 *   6. scale bar                      [Phase 8]
 *   7. overlay labels                 [Phase 8]
 *
 * The later steps are absent rather than stubbed — an empty function that gets
 * called is a lie about what the pipeline does. They slot in here when built.
 *
 * This function is called by both the live preview and by export, at whatever
 * pixel size each needs. Nothing here consults the canvas size to decide how
 * much to draw. */

var CC = CC || {};

CC.Scene = (function () {
  "use strict";

  var TAU = CC.Math.TAU;

  function clampUnit(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

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

  /* A layer's base fill: a gentle radial gradient across the band rather than
   * a flat colour, so even an undetailed layer has some depth to it. The
   * lighter edge sits at the band's outer rim, which reads as the layer being
   * lit from outside. */

  function bandFill(ctx, view, layer, colour) {
    var r1 = view.px(layer.outer);
    var r0 = view.px(Math.max(0, layer.inner));
    if (r1 - r0 < 2) return colour.hex;

    var g = ctx.createRadialGradient(view.cx, view.cy, r0, view.cx, view.cy, r1);

    /* THE GRADIENT BRANCH COMES FIRST, INCLUDING FOR EMISSIVE LAYERS.
     *
     * It did not, and that single ordering bug is why the outer core "doesn't
     * look like it even has a gradient": `emissive` was tested first, so both
     * metal layers took the weak generic self-lit shading below and never
     * reached the thermal ramp at all, however strong the palette made it.
     * The gradient is the more specific statement, so it wins. */
    if (colour.hotEdge) {
      /* A LAYER WITH A THERMAL GRADIENT — the mantle (D59).
       *
       * A band painted one colour says "this material is uniform", and for a
       * mantle that is the wrong statement: it is a transition from cool rock
       * at the crust to near-melt at the core boundary, and drawing that
       * transition is what makes the interior read as hot. The alternative —
       * one flat hot colour — reads as an orange stripe and flattens the
       * crust/mantle separation the palette works to protect.
       *
       * The gradient runs the OTHER WAY from the ordinary reflective shading
       * below: hot and bright at the INNER edge, cool at the outer, because
       * the heat source is beneath it rather than the light source above it.
       * The outer edge still gets a slight lift so the band does not lose the
       * material reading entirely.
       *
       * Its strength is already folded into hotEdge by the palette, scaled by
       * the Interior heat dial — so a cold world lands back on something very
       * close to the plain shading below without needing a branch here. */
      var hot = colour.hotEdge;
      var thermal = hot.v > colour.v;

      /* Interpolate the band colour toward its hot edge by `k`, so the ramp is
       * sampled at as many stops as it needs rather than the three it had.
       * A canvas gradient is linear between stops, and a curve drawn with two
       * stops is a straight line — which is most of why the ramp was invisible
       * across the middle of every band. */
      function at(k) {
        return CC.Color.hsvToHex(
          CC.Palette.mixHue(colour.h, hot.h, k),
          colour.s + (hot.s - colour.s) * k,
          colour.v + (hot.v - colour.v) * k);
      }

      if (thermal && colour.emissive) {
        /* A SELF-LIT CORE RADIATES FROM ITS CENTRE — draw it as a sphere.
         *
         * The generic emissive shading this replaces spanned `lighter(0.22)`
         * to `darker(0.12)`, which measured as a 17-point luminance range on a
         * band of 250 — invisible, and on the inner core it actually came out
         * DARKEST at the very centre, the opposite of radiating.
         *
         * The profile is deliberately non-linear: a hot, near-uniform core
         * that falls away steeply near its rim. That is what a glowing sphere
         * looks like, and it is what gives the inner core the three-dimensional
         * read a flat disc cannot have. Front-loading the stops is the whole
         * trick — an even ramp reads as a flat cone. */
        g.addColorStop(0.00, at(1));
        g.addColorStop(0.30, at(0.94));
        g.addColorStop(0.55, at(0.78));
        g.addColorStop(0.74, at(0.52));
        g.addColorStop(0.88, at(0.24));
        g.addColorStop(1.00, colour.darker(0.20 + 0.22 * hot.strength));
      } else if (thermal) {
        /* THE COOL END GOES BELOW THE BAND COLOUR, not merely to it.
         *
         * A ramp that runs from "hot" to "the layer's own colour" only has
         * range in one direction, and against an already-saturated band that
         * read as a flat slab with a slightly brighter middle. Cooling the
         * outer edge as well puts the band colour in the MIDDLE of the ramp,
         * which is what makes the mantle read as a transition from cool rock
         * to near-melt rather than as one hot colour.
         *
         * FIVE STOPS ACROSS THE BAND, not three, and spread through the whole
         * width. The previous stops sat at 0.40/0.78/1.0, which put nearly the
         * entire transition in the outer third — measured across the mantle,
         * the inner 70% of the band was flat within 13 luminance points while
         * the outer 20% carried the whole ramp. The eye read that as a rim,
         * not a gradient. */
        g.addColorStop(0.00, at(1));
        g.addColorStop(0.22, at(0.86));
        g.addColorStop(0.46, at(0.60));
        g.addColorStop(0.70, at(0.30));
        g.addColorStop(0.88, colour.hex);
        g.addColorStop(1.00, colour.darker(0.34 * hot.strength));
      } else {
        /* A DEPTH gradient: darkest at the inner edge, with a SHARP falloff
         * there — and it keeps travelling all the way to the layer's top.
         *
         * TWO SEPARATE THINGS, AND THE FIRST VERSION ONLY DID ONE.
         *
         * The hard base is right: layered rock goes dark quickly where it is
         * compacted and no light reaches, and that short falloff is what reads
         * as the underside of a solid rather than as a muddier band.
         *
         * But it reached the base colour by 0.52 and was flat above that, so
         * the whole upper half of the crust — the half carrying the terrain,
         * the strata and the coastlines, which is the part anyone actually
         * looks at — got no gradient at all. The ramp now continues past the
         * base colour and LIGHTENS toward the surface, so the shading runs
         * through the terrain as well. Terrain relief is drawn as translucent
         * slope shading over this fill, so it picks the gradient up rather
         * than hiding it.
         *
         * The dark end is also pushed harder. `at(1)` alone was not dramatic
         * enough against a mid-value crust, so the deepest stop goes below the
         * hot-edge colour into a genuine shadow. */
        g.addColorStop(0.00, colour.darker(0.30));
        g.addColorStop(0.10, at(1));
        g.addColorStop(0.26, at(0.74));
        g.addColorStop(0.46, at(0.34));
        g.addColorStop(0.62, colour.hex);
        g.addColorStop(0.82, colour.lighter(0.14));
        g.addColorStop(1.00, colour.lighter(0.30));
      }
    } else {
      g.addColorStop(0, colour.darker(0.16));
      g.addColorStop(0.72, colour.hex);
      g.addColorStop(1, colour.lighter(0.10));
    }
    return g;
  }



  function render(ctx, width, height, body, settings, palette, details) {
    settings = settings || {};

    /* The palette is normally built by the caller and passed in, so a colour
     * change can redraw cached geometry without re-running the structure
     * stage. Built here as a fallback so a render is always possible from
     * body + settings alone. */
    if (!palette) {
      palette = CC.Palette.build(
        body, CC.Archetypes.get(body.archetype).colorProfile, settings, settings.seed);
    }

    /* Detail geometry, likewise: normally generated once and cached by the
     * caller, so dragging a colour slider never re-rolls a position. */
    if (!details) {
      details = CC.Details.build(body, settings, settings.seed);
    }

    /* --- 1. background ---
     *
     * `skipBackground` means "something has already painted here; leave it
     * alone". It is NOT the same as `background: "transparent"`, and the
     * difference is a real defect that shipped for one round: transparent mode
     * calls `clearRect`, so a composed export — which paints one starfield
     * across the whole canvas and then renders the body into a sub-region —
     * had the body's own render ERASE the stars it was drawn over. The stars
     * survived only in the strip the body never touched, which read as a
     * starfield that had mostly failed to draw.
     *
     * A caller compositing the body onto an existing scene wants neither a new
     * background nor a hole punched in the old one. That is a third state, so
     * it needs its own flag rather than a third background MODE — the modes
     * are a user-facing control and this is not a choice a user makes. */
    if (!settings.skipBackground) {
      CC.Canvas.drawBackground(ctx, width, height, settings.background || "solid", {
        color: settings.backgroundColor || "#05070e",
        color2: settings.backgroundColor2,
        angle: settings.backgroundAngle,
        stars: settings.stars === undefined ? true : !!settings.stars,
        seed: settings.seed,
        density: settings.starfieldDensity === undefined ? 0.6 : settings.starfieldDensity,
        scale: settings.nebulaScale === undefined ? 0.5 : settings.nebulaScale
      });
    }

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
     * constructed later in gen/details.js — so the swell moves the drawn edge
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
     * trait — see the clip further down for why that distinction is the fix to
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

    /* `offsetX` is passed straight through: it shifts the body's centre left to
     * leave room for the info card, which floats over a full-bleed canvas. The
     * preview supplies it from CSS; the scene stays ignorant of what the room
     * is for — see draw/canvas.js.
     *
     * Composition, not framing: an export that wants the body centred simply
     * omits it, which is what `renderTo` does. */
    var view = CC.Canvas.makeView(width, height, {
      bodyFrac: settings.bodySize === undefined ? 0.78 : settings.bodySize,
      extent: extent,
      offsetX: settings.offsetX,
      /* FRAMING RIDES THROUGH UNTOUCHED, which is what makes an export honour
       * the close-up the user set up on screen: export re-renders through this
       * same function with the same settings, so it needs no framing code of
       * its own. Belongs to the OUTPUT stage — it never re-rolls geometry, so
       * panning cannot disturb a single element. */
      zoom: settings.zoom,
      panX: settings.panX,
      panY: settings.panY
    });


    ctx.save();

    /* Bodies are generated pole-up and rotated at the end, so "keep upright"
     * is simply skipping this. Rotating the context rather than the geometry
     * keeps every element's body-space position untouched. */
    if (body.rotation) {
      ctx.translate(view.cx, view.cy);
      ctx.rotate(body.rotation * Math.PI / 180);
      ctx.translate(-view.cx, -view.cy);
    }

    /* --- 3. layers, outermost -> innermost ---
     *
     * Each layer's boundary function is resolved once, up front, because a
     * layer needs its NEIGHBOUR's function to clip its inner edge — the two
     * must agree exactly or the clip leaves a crescent gap along the seam. */
    var layers = body.layers;
    var i;

    /* Read before the first draw call rather than beside the layer loop: the
     * outward traits are painted BEFORE the layers, and a `var` declared
     * further down is hoisted as undefined, which reached the alpha maths as
     * a NaN and produced a malformed colour on every body with rings. */
    var elementOpacity = settings.elementOpacity === undefined
      ? 1 : settings.elementOpacity;

    /* THE SKY'S BASE COLOUR, for the one thing that needs to know it: a debris
     * belt dims the background behind itself, and it does that by washing the
     * sky's own colour back over it (see drawOrbitalHaze).
     *
     * NULL WHENEVER THERE IS NO SKY OF OURS TO REPAINT, which is two distinct
     * cases and both matter. Transparent is a cutout, and painting a disc of
     * solid colour into it would destroy the alpha the mode exists to produce
     * (D103). `skipBackground` means someone else's scene is already on this
     * canvas — a composed export — and its colour is not ours to assume. The
     * belt then simply draws its rocks over whatever is there, which is the
     * correct answer for both. */
    var sky = (settings.background === "transparent" || settings.skipBackground)
      ? null : (settings.backgroundColor || "#05070e");

    /* --- 1b. the emissive pass ---
     *
     * BEFORE EVERYTHING ELSE THE BODY OWNS, so the star is painted over its
     * own glow and the halo only ever shows outside the silhouette. See
     * draw/emissive.js — including why it is excluded from the extent sweep
     * while the coronal wobble is included in it. */
    CC.Emissive.drawEmissiveGlow(ctx, view, body, palette, settings);

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
    CC.ZonePaint.drawOutward(ctx, view, details, palette, elementOpacity, "back", sky);

    /* Which layer is the body's visible edge — the outermost that isn't drawn
     * as an outward falloff. */
    var silhouette = -1;
    for (i = 0; i < layers.length; i++) {
      if (!layers[i].outward) { silhouette = i; break; }
    }

    /* How much of its relief the OUTERMOST layer keeps.
     *
     * Terrain is allowed to shape the silhouette — that is what makes an
     * airless world read as a landscape rather than as a flat disc with
     * shading painted on. The rule it appears to break ("the outermost
     * boundary is a perfect circle") was written against v2's global boundary
     * *wobble*, which was crude and made bodies look like cartoon potatoes;
     * PARAMETERS.md records that control being cut for exactly that reason.
     * Terrain is a different mechanism sitting on a properly circular crust.
     *
     * It is damped rather than passed through at full strength, because the
     * silhouette is the one boundary read against empty space, where a given
     * amplitude reads far louder than it does between two filled bands. See
     * PROGRESS.md D17. */
    var SILHOUETTE_RELIEF = 0.55;

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

    var bounds = [];
    for (i = 0; i < layers.length; i++) {
      var bf = CC.Layers.reliefFn(layers[i], settings.seed,
                                  details.terrain[layers[i].role],
                                  i === silhouette ? SILHOUETTE_RELIEF : 1);

      /* A FLUID'S SURFACE IS NOT ALWAYS FLAT.
       *
       * Where the layer below carries an angular sea level — a tidally locked
       * world's ocean, boiled off one face and pooled on the other — that
       * displacement composes onto this layer's boundary. The sea's top then
       * dips below the rock on the hot face, and the even-odd clip in the
       * deferred pass encloses no area there: the ocean is absent rather than
       * thin, which is what makes the pinch geometric.
       *
       * Keyed to the layer BELOW, because sea level belongs to the surface the
       * fluid rests on — the same lookup gen/details.js keys it by. */
      var below = layers[i + 1];
      var sea = (below && details.seaLevel) ? details.seaLevel[below.role] : null;
      var lvl = CC.Layers.levelFn(layers[i], bf, sea);

      /* AND THE TIDAL SWELL, WHICH IS THE SAME KIND OF STATEMENT.
       *
       * A companion star pulls the thin outer shells toward it, so the
       * chromosphere and the photosphere are not circles either. That is a
       * per-bearing displacement of a banded layer's boundary — which is
       * exactly what `levelFn` already is, so this needs no new drawing code
       * and composes with the wobble and the terrain for free.
       *
       * THE UNIT CONVERSION IS THE WHOLE TRICK. `swellAt` returns a fraction
       * of the LAYER'S OWN thickness (D131: a skin and a mantle are not the
       * same kind of thing and a body-radius figure cannot serve both), while
       * `levelFn` takes an absolute body-space offset because a sea level is
       * an absolute height. Multiplying by `layer.thickness` here is what
       * makes the two agree — and a miss would be invisible on a thick layer
       * and catastrophic on a thin one.
       *
       * Outward layers are excluded: they take the same pull through `airAt`
       * on the thickness path, and applying both would count it twice. */
      if (!layers[i].outward && details.zones && details.zones.swellAt) {
        lvl = (function (base, layer, zf) {
          var t = layer.thickness || 0;
          if (t <= 0) return base;
          var outer = layer.outer;
          var role = layer.role;
          return function (a) {
            var b = base ? base(a) : 1;
            return b + (zf(a, role) * t) / outer;
          };
        })(lvl, layers[i], details.zones.swellAt);
      }

      bounds.push(lvl);
    }

    /* A layer sitting directly on a relief-bearing layer is DEFERRED: it is
     * drawn after the layer beneath it rather than before.
     *
     * Layers normally paint outermost-first as full discs, each covering the
     * middle of the one above. That is correct for concentric bands, but it
     * buries terrain — the crust's displaced disc paints straight over the
     * ocean, so the sea survives only as a ring outside the crust's highest
     * peak and no coastline can ever appear.
     *
     * Drawing the fluid layer afterwards, clipped to where it is genuinely
     * above the solid below it, is what makes "the coastline is a crossing"
     * (PROGRESS.md D15) actually true on the canvas. This keys on whether the
     * NEXT layer has relief, never on a role name, so a magma sea over a
     * rocky floor or an envelope over a gas giant's core behaves identically. */
    var deferred = [];
    for (i = 0; i < layers.length; i++) {
      if (layers[i].outward) continue;
      var below = layers[i + 1];
      if (below && details.terrain[below.role]) deferred.push(i);
    }

    function isDeferred(idx) { return deferred.indexOf(idx) >= 0; }

    for (i = 0; i < layers.length; i++) {
      if (isDeferred(i)) continue;
      var layer = layers[i];
      var colour = palette.get(layer.role);

      if (layer.outward) {
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
         * `draw/scene.js` already composes `airAt` with a per-bearing ground
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
         * gen/structure.js. */
        CC.Layers.fillOutward(ctx, view, layer, inner,
          outwardStyle(colour, 0.82 * layer.strength, layer.fadeHold,
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
          elementOpacity: elementOpacity * 0.85,
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
        CC.ZonePaint.paintZoneBand(ctx, view, layer, colour, details.zones, inner);
        continue;
      }

      /* a. base fill, to the layer's own (possibly relief-displaced) edge */
      CC.Layers.fillLayer(ctx, view, layer, bandFill(ctx, view, layer, colour),
                          settings.seed, bounds[i]);

      /* b. layer details, clipped to the band so nothing spills across a
       *    boundary. The inner edge borrows the next layer's function. */
      var terrain = details.terrain[layer.role];
      var elements = details.get(layer.role);

      if (elements.length || terrain || details.zones) {
        ctx.save();
        layer.innerFn = (i + 1 < layers.length) ? bounds[i + 1] : null;
        CC.Layers.clipToLayer(ctx, view, layer, settings.seed, bounds[i]);

        /* The angular zone tint, under everything else: it belongs to the
         * material, so terrain shading and detail elements both sit on top. */
        CC.ZonePaint.paintZoneBand(ctx, view, layer, colour, details.zones, bounds[i]);

        /* Terrain shading first, so scattered detail sits on top of the
         * landforms rather than being buried by them. */
        if (terrain) {
          CC.DrawDetails.drawRelief(ctx, view, layer, terrain, colour, {
            strength: elementOpacity
          });
        }

        CC.DrawDetails.drawLayer(ctx, view, elements, colour, {
          elementOpacity: elementOpacity,
          flowMode: details.flowMode,
          /* The layer's radial extent, so detail elements can ride the same
           * thermal gradient the band fill does (D59). Ignored by layers that
           * do not carry one. */
          band: { inner: Math.max(0, layer.inner), outer: layer.outer }
        });
        ctx.restore();
      }

      /* c2. LIMB DARKENING — a luminous layer is dimmer at its edge.
       *
       * Its own save/clip rather than riding the detail pass's, because a
       * layer with no elements at all still curves. It sits AFTER the details
       * deliberately: see draw/emissive.js for why under them is useless. */
      if (layer.limbDarkening) {
        ctx.save();
        layer.innerFn = (i + 1 < layers.length) ? bounds[i + 1] : null;
        CC.Layers.clipToLayer(ctx, view, layer, settings.seed, bounds[i]);
        CC.Emissive.paintLimbDarkening(ctx, view, layer, colour, body.surface);
        ctx.restore();
      }

      /* d. The boundary line is a darkened relative of the layer's own colour
       * rather than flat black, so it reads as a material edge instead of an
       * inked outline. */
      CC.Layers.strokeBoundary(ctx, view, layer,
        CC.Color.hsva(colour.h, Math.min(1, colour.s * 1.15),
                      colour.v * 0.42, 0.55),
        1, settings.seed, bounds[i]);
    }

    /* --- 3e. deferred fluid layers ---
     *
     * Drawn last so they sit ON the terrain below rather than under it. The
     * layer's own outer edge stays a perfect circle — a sea has a flat top —
     * while its underside follows the solid it rests on. Where the terrain
     * rises above that flat top, the fill simply is not there, and THAT is the
     * coastline: never drawn, only the crossing of two curves. */
    for (var d = 0; d < deferred.length; d++) {
      var di = deferred[d];
      var dLayer = layers[di];
      var dColour = palette.get(dLayer.role);
      var dTerrain = details.terrain[layers[di + 1].role];
      var floorFn = bounds[di + 1];

      ctx.save();

      /* Presence fade + sub-pixel fade (D21): a barely-present or sub-pixel
       * fluid is faint rather than fully opaque. */
      var dPx = view.px(dLayer.outer) - view.px(Math.max(0, dLayer.inner));
      var thin = clampUnit(dPx / 1.5);
      thin = thin * thin * (3 - 2 * thin);
      ctx.globalAlpha = (dLayer.strength === undefined ? 1 : dLayer.strength) * thin;

      /* The fluid's top, pinched shut where sub-pixel (D21). Used for both
       * the fill clip and the stroke below. */
      var topFn = CC.Layers.pinchFn(view, dLayer.outer, bounds[di],
                                    layers[di + 1].outer, floorFn);

      /* Clip: fluid top vs. displaced terrain floor (even-odd). */
      ctx.beginPath();
      CC.Layers.traceBoundary(ctx, view, dLayer.outer, topFn, false);
      CC.Layers.traceBoundary(ctx, view, layers[di + 1].outer, floorFn, true);
      ctx.clip("evenodd");

      CC.Layers.fillLayer(ctx, view, dLayer,
        bandFill(ctx, view, dLayer, dColour), settings.seed, bounds[di]);

      /* The sea takes the zone as well — a locked world's dayside ocean is
       * warmer and its nightside is not merely darker water but ice-dark.
       * Inside the deferred clip, so it still stops at the coastline. */
      CC.ZonePaint.paintZoneBand(ctx, view, dLayer, dColour, details.zones);

      /* THE WATER ITSELF READS COLDER WHERE IT IS COLD.
       *
       * Distinct from the sea ice below, and both are needed. Cold water is
       * darker and less blue-green than warm water — that is a property of the
       * liquid, and it is what the ocean was missing entirely: before the
       * climate system the only thing that touched a frozen face's sea was the
       * generic zone HSV delta, which came to a 7% darkening (D37). A 7%
       * darkening is not a frozen ocean. */
      CC.ZonePaint.paintThermalWater(ctx, view, dLayer, dColour,
                                     details.climateField, bounds[di]);

      CC.DrawDetails.drawLayer(ctx, view, details.get(dLayer.role), dColour, {
        elementOpacity: elementOpacity,
        flowMode: details.flowMode
      });

      /* SEA ICE — A REAL GEOMETRIC BAND ON THE WATER, NOT A TINT.
       *
       * Drawn inside the deferred clip, so it stops at the coastline exactly
       * as the water does and can never appear over land. It hangs from the
       * fluid's own top surface inward, which is where ice actually floats,
       * and its thickness rides how far below freezing the bearing is — a thin
       * rime at the edge of a cap, a thick shelf over a frozen sea.
       *
       * IT MUST BE GEOMETRY BECAUSE IT IS A STATEMENT ABOUT REACH. D30
       * established the rule the hard way on the atmosphere: compositing can
       * change what a shape looks like but never what shape it is, so "the ice
       * extends this far down into the water" has to be drawn as extent.
       *
       * The ocean does NOT shrink when it freezes. Water expanding on freezing
       * is a quirk of water, and these are alien seas that may be any liquid;
       * the author's control over sea volume is the Ocean depth slider. So the
       * ice sits on top and the layer keeps its thickness. */
      CC.ZonePaint.paintSeaIce(ctx, view, dLayer, dColour, details.climateField,
                               topFn, layers[di + 1].outer, floorFn,
                               palette, elementOpacity);

      ctx.restore();

      /* Surface stroke, with the same presence + sub-pixel fades. */
      ctx.save();
      ctx.globalAlpha = (dLayer.strength === undefined ? 1 : dLayer.strength) * thin;
      ctx.beginPath();
      CC.Layers.traceBoundary(ctx, view, dLayer.outer, topFn, false);
      CC.Layers.traceBoundary(ctx, view, layers[di + 1].outer, floorFn, true);
      ctx.clip("evenodd");
      CC.Layers.strokeBoundary(ctx, view, dLayer,
        CC.Color.hsva(dColour.h, Math.min(1, dColour.s * 1.15),
                      dColour.v * 0.42, 0.55),
        1, settings.seed, topFn);
      ctx.restore();
    }

    /* --- 4. surface-attached traits ---
     *
     * Polar caps and impact basins sit ON the surface, so they are drawn after
     * the fluid layers rather than inside their host layer's pass — the sea is
     * drawn last (so land reads as a crossing) and would otherwise paint
     * straight over them.
     *
     * Clipped to the body so a cap cannot spill past the silhouette, but not
     * to any single layer: a cap legitimately sits at the boundary between
     * two. */
    if (details.surfaceTraits && details.surfaceTraits.length) {
      ctx.save();

      /* Clipped to the DISPLACED silhouette, not to the nominal surface
       * radius.
       *
       * A cap is placed at body.surface (1.0), but terrain moves the visible
       * edge either side of that — so a cap drawn to a perfect circle stuck
       * out past the body wherever the ground dipped below the mean, and
       * appeared as a grey crescent floating off the limb. Clipping to the
       * same boundary function the silhouette layer draws with keeps the two
       * in agreement by construction. */
      ctx.beginPath();
      CC.Layers.traceBoundary(ctx, view, layers[silhouette].outer,
                              bounds[silhouette], false);
      ctx.clip();

      for (var st = 0; st < details.surfaceTraits.length; st++) {
        var se = details.surfaceTraits[st];
        var sAlpha = clampUnit(se.alpha * elementOpacity);
        if (sAlpha <= 0.004) continue;
        var sfn = CC.Primitives.KINDS[se.kind];
        if (!sfn) continue;
        sfn(ctx, view, se, CC.DrawDetails.toneColour(
          CC.DrawDetails.zoneShift(palette.get(se.role), se), se.tone, sAlpha));
      }
      ctx.restore();
    }

    /* --- 3f. surface frosting ---
     *
     * `SILHOUETTE_RELIEF` goes with it: the outermost solid layer draws its
     * terrain damped, and frosting deposited against the undamped field would
     * sit proud of the very silhouette it is supposed to be lying on. */
    CC.Film.draw(ctx, view, body, layers, bounds, deferred, details, palette,
                 settings, elementOpacity, silhouette, SILHOUETTE_RELIEF);

    /* --- 4b. surface damage ---
     *
     * IMPACT SCARS CUT THROUGH THE DEPOSIT, so they are drawn after it.
     *
     * A crater is an excavation: it punches through whatever lies on the
     * ground and exposes the rock. Drawn inside the crust's own pass — where
     * every other crust element belongs — the scars were painted and then
     * buried by the frosting, which reaches most of the way down the crust.
     * "Heavily Cratered" placed 64-90 elements and showed none of them.
     *
     * Clipped to the same REACH draw/film.js's frosting clip uses — the
     * terrain's global peak, not the local silhouette curve — rather than to
     * the displaced silhouette itself.
     *
     * A scar is sunk BELOW the local rock by `sink`, which is exactly where
     * the frosting piles up highest (the same hollow-filling that makes
     * frosting stand proud of the silhouette everywhere else). Clipping
     * damage to the tight per-angle silhouette cut it off before it could
     * reach that raised frosting, so only the sliver of each crater outside
     * the local silhouette survived — the rest stayed hidden under the
     * deposit despite being drawn after it. */
    if (details.damageTraits && details.damageTraits.length) {
      ctx.save();
      var dTerr = details.terrain[layers[silhouette].role];
      var dReach = layers[silhouette].outer
        + Math.max(0, dTerr ? dTerr.range().hi : 0) * SILHOUETTE_RELIEF;
      ctx.beginPath();
      CC.Layers.traceBoundary(ctx, view, dReach, null, false);
      ctx.clip();

      for (var dt = 0; dt < details.damageTraits.length; dt++) {
        var de = details.damageTraits[dt];
        var dAlpha = clampUnit(de.alpha * elementOpacity);
        if (dAlpha <= 0.004) continue;
        var dfn = CC.Primitives.KINDS[de.kind];
        if (!dfn) continue;
        var dCol = CC.DrawDetails.zoneShift(palette.get(de.role), de);
        /* An element carrying `floor` is an excavation and is filled with a
         * depth gradient rather than flat — see depthFill. */
        dfn(ctx, view, de, de.floor
          ? CC.DrawDetails.depthFill(dCol, de.tone, dAlpha, de.floor)
          : CC.DrawDetails.toneColour(dCol, de.tone, dAlpha));
      }
      ctx.restore();
    }

    /* --- 4c. spanning traits ---
     *
     * Features that CROSS layer boundaries. The great storm is the first: a
     * storm reaching from the cirrus deck down through the banded layer is one
     * feature, and drawn inside either layer's clip it was cut in half at the
     * boundary between them.
     *
     * Clipped to the OUTERMOST layer rather than to a band, so the element
     * spans freely; `fadeEnds` on the element dissolves it at both radial
     * extremes so it ends by fading rather than by being cut.
     *
     * THE CLIP RADIUS IS THE ATMOSPHERE'S, NOT `body.surface`. It used to be
     * the latter, which is the top of the outermost SOLID layer — on a gas
     * giant, the troposphere at r=1.0. That cut two different things at once:
     *
     *   - A great storm large enough to reach the limb was sliced off flat
     *     against the body's edge, giving it a straight chord where it should
     *     have a curved perimeter. Invisible while storms were small; obvious
     *     as soon as they were enlarged.
     *   - The cirrus-deck companions were removed ENTIRELY, since they sit
     *     above r=1.0 by construction — which is why the cloud deck still
     *     looked undisturbed no matter how the companion was tuned.
     *
     * Both are the same bug: the clip was tighter than the pass it guards.
     * Taking the outermost layer's outer edge covers any outward halo the
     * archetype declares and keeps the guarantee that matters — a spanning
     * trait cannot escape the body into open space. */
    if (details.spanningTraits && details.spanningTraits.length) {
      /* THE CLIP IS THE BODY'S REACH, WHICH IS NOT THE FRAME'S.
       *
       * Third time, and then a fourth. The comment above records the same bug
       * being fixed twice — first at `body.surface`, then at the outermost
       * layer — and it fired again the moment something reached further than
       * a corona:
       *
       *   - A prominence is authored `size: [0.20, 0.44]` of the BODY radius
       *     and anchored near the surface, so a top-tier arch reaches past a
       *     corona topping out at 1.14-1.32 and was chopped flat against it.
       *   - Heat plumes are spanning by construction (they cross the
       *     chromosphere/corona boundary, which is what `spanning` is FOR,
       *     D91) and would have been chopped by the same edge on the day they
       *     were built.
       *
       * That third fix reached for `extent` on the reasoning that open space
       * begins where the picture stops. It cured the chopping and introduced
       * the OPPOSITE defect, which is the fourth entry in this list:
       *
       *   - Ticking RING SYSTEM made the great storm bulge out past the upper
       *     cloud, and unticking it pulled the storm back in. Nothing about
       *     the storm changed; the ring did. `extent` folds in
       *     `details.outward`, so a ring at r=2.35 pushed this clip out to
       *     2.35 and the storm simply expanded into the room it was given.
       *
       * The error was treating the frame's reach and the body's reach as one
       * number. They answer different questions: `extent` sizes the VIEW and
       * must include anything drawn, ring included; this clip bounds a mark
       * that belongs to the BODY and must include only the body's own
       * silhouette. Sharing one number let anything in orbit resize the
       * weather, which is a coupling no trait declaration asked for.
       *
       * So it is fixed against the thing that is actually true: the guarantee
       * is *a spanning trait cannot escape the body*, and `bodyReach` is that
       * radius — the wobble, the bulge and the swell, taken before the
       * orbital elements are folded in. That is stable under every trait that
       * draws beyond the body, so a fifth entry cannot arrive from a ring, a
       * debris belt, or an orbital structure that has not been written yet.
       *
       * `fadeEnds` on the element is the complement, not the alternative: it
       * makes a trait END by dissolving rather than by being cut. Alone it
       * only makes the chop soft. */
      var spanEdge = Math.max(body.surface, bodyReach);
      ctx.save();
      ctx.beginPath();
      CC.Layers.traceBoundary(ctx, view, spanEdge, null, false);
      ctx.clip();

      for (var st = 0; st < details.spanningTraits.length; st++) {
        var se = details.spanningTraits[st];
        /* A TRAIT THAT ESCAPES THE FRAME IS DRAWN OUTSIDE THIS CLIP.
         *
         * The clip above gives one guarantee — a spanning trait cannot get out
         * into open space — and that is right for every mark that is part of
         * the body: a prominence returns, a flare disperses, a plume falls
         * back. All of them belong to the star and none should leave it.
         *
         * A coronal hole's wind is the one mark whose whole content is that it
         * DOES leave. Clipped to the picture's own reach it stopped dead at
         * the halo's edge — a ragged cut across every field line and every
         * particle, exactly where the mirrors orbit — which turned "material
         * escaping to interstellar space" into "material stopping at an
         * invisible wall". The guarantee is still the right default; this is
         * the documented exception to it, taken in the second pass below. */
        if (se.escapes) continue;
        var sAlpha = clampUnit(se.alpha * elementOpacity);
        if (sAlpha <= 0.004) continue;
        var sfn = CC.Primitives.KINDS[se.kind];
        if (!sfn) continue;
        var sCol = CC.DrawDetails.zoneShift(palette.get(se.role), se);
        /* `emitted` and `deep` are the two derived palette colours a mark may
         * need that are not its own layer's: the body's light, and its hot
         * interior. A field line takes the second — see fieldFill. */
        var sRich = CC.DrawDetails.styleFor(se.kind, sCol, se, sAlpha,
                                            palette.emitted, palette.deep);
        sfn(ctx, view, se, sRich
          || CC.DrawDetails.toneColour(sCol, se.tone, sAlpha));
      }
      ctx.restore();

      /* THE ESCAPING PASS — outside the clip, so it may reach the frame edge.
       *
       * Deliberately after the clipped one and outside `ctx.save()`, which is
       * the whole difference. Nothing here is bounded by the body's extent;
       * the frame is the only limit, and a mark that runs off it is doing what
       * it was written to do. See the note above for why this exception
       * exists and why it is not the default. */
      for (var xt = 0; xt < details.spanningTraits.length; xt++) {
        var xe = details.spanningTraits[xt];
        if (!xe.escapes) continue;
        var xAlpha = clampUnit(xe.alpha * elementOpacity);
        if (xAlpha <= 0.004) continue;
        var xfn = CC.Primitives.KINDS[xe.kind];
        if (!xfn) continue;
        var xCol = CC.DrawDetails.zoneShift(palette.get(xe.role), xe);
        var xRich = CC.DrawDetails.styleFor(xe.kind, xCol, xe, xAlpha,
                                            palette.emitted, palette.deep);
        xfn(ctx, view, xe, xRich
          || CC.DrawDetails.toneColour(xCol, xe.tone, xAlpha));
      }
    }

    /* --- 5. outward traits, front half --- */
    CC.ZonePaint.drawOutward(ctx, view, details, palette, elementOpacity, "front", sky);

    ctx.restore();

    /* `extent` is reported because the caller cannot recompute it: it folds in
     * the atmosphere bulge and the outward traits measured above, and the pan
     * clamp needs the same number the render actually used. */
    return { view: view, palette: palette, details: details, extent: extent };
  }

  return { render: render, bandFill: bandFill };
})();
