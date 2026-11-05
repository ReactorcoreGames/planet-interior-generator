/* Scene assembly — the draw order from docs/ARCHITECTURE.md.
 *
 *   1. background
 *   2. outward traits (back)
 *   3. layers, outermost -> innermost
 *        a. base fill
 *        b. layer details
 *        c. trait instances
 *        d. boundary line
 *   4. surface-attached
 *   5. outward traits (front)
 *   6. (rotation undone)
 *   7. overlay labels                 draw/overlay.js
 *   8. scale bar                      draw/scalebar.js
 *
 * This function is called by both the live preview and by export, at whatever
 * pixel size each needs. Nothing here consults the canvas size to decide how
 * much to draw.
 *
 * `render` keeps the order of the passes and the view and lens helpers, and
 * nothing else: each pass is a stage function sharing one state object. The
 * outward layers and how far they reach are in draw/scene-outward.js; the bands,
 * pillars, fluids and caves in draw/scene-interior.js; the surface traits,
 * frosting, damage and spanning traits in draw/scene-surface.js. All attach
 * here. */

var CC = CC || {};

CC.Scene = (function () {
  "use strict";

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

  /* The view a render of this body at this size makes: shared by `render`
   * and by `lens`, so the two cannot disagree about where the hole is. */
  function viewFor(width, height, body, settings, extent, details) {
    return CC.Canvas.makeView(width, height, {
      /* `body.frame` scales it for a body whose surroundings are the
       * picture — a black hole's disc and jets (gen/structure.js). */
      bodyFrac: (settings.bodySize === undefined ? 0.78 : settings.bodySize) *
                (body.frame || 1),
      extent: extent,
      offsetX: settings.offsetX,
      /* The body's form (js/gen/form.js): the warp every boundary and element
       * rides, applied inside view.at. Null on every body that declares none. */
      form: body.form ? CC.Form.fn(body.form, details && details.formBites) : null,
      formRotation: body.rotation || 0,
      /* FRAMING RIDES THROUGH UNTOUCHED, which is what makes an export honour
       * the close-up the user set up on screen: export re-renders through this
       * same function with the same settings, so it needs no framing code of
       * its own. Belongs to the OUTPUT stage — it never re-rolls geometry, so
       * panning cannot disturb a single element. */
      zoom: settings.zoom,
      panX: settings.panX,
      panY: settings.panY
    });
  }

  /* The starfield's lens round a black hole, in frame pixels, or null. The
   * view has to exist first, which is why the background is painted after it.
   * Public so a caller that paints the background itself — the composed
   * export — can bend its stars round the body it is about to render. */
  function lensFor(body, view) {
    var L = body.hole && body.hole.lens;
    return L ? { x: view.cx, y: view.cy, r: view.px(L) } : null;
  }

  function lens(width, height, body, settings, details) {
    if (!body.hole || !body.hole.lens) return null;
    settings = settings || {};
    details = details || CC.Details.build(body, settings, settings.seed);
    return lensFor(body, viewFor(width, height, body, settings,
                                 CC.Scene.reachOf(body, settings, details).extent, details));
  }

  /* A layer's base fill: a gentle radial gradient across the band rather than
   * a flat colour, so even an undetailed layer has some depth to it. The
   * lighter edge sits at the band's outer rim, which reads as the layer being
   * lit from outside. */

  function bandFill(ctx, view, layer, colour) {
    var r1 = view.px(layer.outer);
    var r0 = view.px(Math.max(0, layer.inner));
    /* A VOID IS ONE FLAT COLOUR — see `void` in gen/palette.js. No shading:
     * a gradient on nothing reads as a surface. */
    if (colour.flat) return colour.hex;
    if (r1 - r0 < 2) return colour.hex;

    var g = CC.FormFill.bandGradient(ctx, view, r0, r1);
    /* Machined metal: a specular band and a lit rim (draw/sheen.js). */
    if (colour.sheen) return CC.Sheen.stops(g, colour);

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
    } else if (colour.glowCentre) {
      /* A SELF-LIT CENTRE GLOWS FROM THE MIDDLE — `glowCentre` on the
       * palette spec. The default shading below is lit from OUTSIDE, which
       * put a dark dimple at the heart of a neutron star's white-hot core. */
      g.addColorStop(0, colour.lighter(0.18));
      g.addColorStop(0.55, colour.hex);
      g.addColorStop(1, colour.darker(0.08));
    } else {
      g.addColorStop(0, colour.darker(0.16));
      g.addColorStop(0.72, colour.hex);
      g.addColorStop(1, colour.lighter(0.10));
    }
    return g;
  }


  /* ---- the stages round the body --------------------------------------- */

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
   * are a user-facing control and this is not a choice a user makes.
   *
   * Painted AFTER the view is made, because round a black hole the stars
   * are lensed about the hole's centre in frame pixels (draw/lens.js). */
  function paintBackground(sc) {
    var ctx = sc.ctx, width = sc.width, height = sc.height;
    var body = sc.body, settings = sc.settings, view = sc.view;
    if (!settings.skipBackground) {
      CC.Canvas.drawBackground(ctx, width, height, settings.background || "solid", {
        color: settings.backgroundColor || "#05070e",
        color2: settings.backgroundColor2,
        angle: settings.backgroundAngle,
        stars: settings.stars === undefined ? true : !!settings.stars,
        seed: settings.seed,
        density: settings.starfieldDensity === undefined ? 0.6 : settings.starfieldDensity,
        scale: settings.nebulaScale === undefined ? 0.5 : settings.nebulaScale,
        lens: lensFor(body, view)
      });
    }

  }

  function readDrawSettings(sc) {
    var settings = sc.settings;

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

    sc.elementOpacity = elementOpacity;
    sc.sky = sky;
  }

  /* --- 1b. the emissive pass ---
   *
   * BEFORE EVERYTHING ELSE THE BODY OWNS, so the star is painted over its
   * own glow and the halo only ever shows outside the silhouette. See
   * draw/emissive.js — including why it is excluded from the extent sweep
   * while the coronal wobble is included in it. */
  function drawEmissive(sc) {
    var ctx = sc.ctx, view = sc.view, body = sc.body;
    var palette = sc.palette, settings = sc.settings;
    CC.Emissive.drawEmissiveGlow(ctx, view, body, palette, settings);
    /* And light along the body's axis — beams and jets.
     * A no-op on every body that declares no `beams` or `poles`. */
    CC.Emissive.drawAxial(ctx, view, body, palette, settings);
  }

  function openBody(sc) {
    var ctx = sc.ctx, view = sc.view, details = sc.details;

    /* A wound torn out of the outer layers: everything the body draws from
     * here to the front outward traits is clipped clear of it, so space
     * shows through (draw/rupture.js). */
    sc.ruptured = CC.RuptureDraw.begin(ctx, view, details.rupture);

    /* The lit back walls of voids and shafts, under every band, so a hollow
     * layer's ring trims them to the gaps (draw/shellwalls.js). */
    CC.ShellWallDraw.draw(ctx, view, details.walls, sc.palette, sc.elementOpacity);
  }

  function closeBody(sc) {
    var ctx = sc.ctx, view = sc.view, details = sc.details, palette = sc.palette;
    var body = sc.body, elementOpacity = sc.elementOpacity;

    /* The bore barrel, last of the body's own passes: over the growth and
     * over the seated fixtures on the hull (docking ports, sensors), and
     * still inside the rupture clip, so a wound cuts it (draw/bore.js). */
    CC.BoreDraw.draw(ctx, view, details.bore, palette, elementOpacity);
    /* The drive cluster and its plume, likewise (draw/engines.js). */
    CC.EngineDraw.draw(ctx, view, details.engines, palette, elementOpacity);

    CC.RuptureDraw.end(ctx, sc.ruptured);
    /* The torn faces of those wounds — scorched rim, peeled plating, snapped
     * pillars, severed pipe — standing in the gap the cut left
     * (draw/woundedge.js). */
    CC.WoundEdgeDraw.draw(ctx, view, body, details.rupture, palette, elementOpacity);
    /* Growth pooled on the wounds' floors and ledges. */
    CC.OvergrowthDraw.draw(ctx, view, details.growth, "wounds", elementOpacity);

  }

  /* ---- the passes, in order --------------------------------------------- */

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

    var measured = CC.Scene.reachOf(body, settings, details);
    var extent = measured.extent, bodyReach = measured.bodyReach;

    /* `offsetX` is passed straight through: it shifts the body's centre left to
     * leave room for the info card, which floats over a full-bleed canvas. The
     * preview supplies it from CSS; the scene stays ignorant of what the room
     * is for — see draw/canvas.js.
     *
     * Composition, not framing: an export that wants the body centred simply
     * omits it, which is what `renderTo` does. */
    var view = viewFor(width, height, body, settings, extent, details);

    var sc = {
      ctx: ctx,
      width: width,
      height: height,
      body: body,
      settings: settings,
      palette: palette,
      details: details,
      view: view,
      bodyReach: bodyReach,
      layers: body.layers
    };

    paintBackground(sc);

    ctx.save();

    /* Bodies are generated pole-up and rotated at the end, so "keep upright"
     * is simply skipping this. Rotating the context rather than the geometry
     * keeps every element's body-space position untouched. */
    if (body.rotation) {
      ctx.translate(view.cx, view.cy);
      ctx.rotate(body.rotation * Math.PI / 180);
      ctx.translate(-view.cx, -view.cy);
    }

    readDrawSettings(sc);
    drawEmissive(sc);
    CC.Scene.outwardHalf(sc, "back");
    CC.Scene.findSilhouette(sc);
    CC.Scene.resolveBounds(sc);
    CC.Scene.findDeferred(sc);
    openBody(sc);
    CC.Scene.drawLayers(sc);
    CC.Scene.drawFixtures(sc);
    CC.Scene.drawFluids(sc);
    CC.Scene.drawCaves(sc);
    CC.Scene.drawSurfaceTraits(sc);
    CC.Scene.drawFrosting(sc);
    CC.Scene.drawDamage(sc);
    CC.Scene.drawSpanning(sc);
    closeBody(sc);

    /* --- 5. outward traits, front half --- */
    CC.Scene.outwardHalf(sc, "front");

    ctx.restore();

    /* --- 7. overlay labels --- after the rotation is undone, so the names
     * read level (draw/overlay.js). */
    CC.OverlayDraw.draw(ctx, view, body, palette, settings);

    /* --- 8. scale bar --- lower-left, with its automatic silhouette
     * (draw/scalebar.js). */
    CC.ScaleBarDraw.draw(ctx, view, body, details, palette, settings);

    /* `extent` is reported because the caller cannot recompute it: it folds in
     * the atmosphere bulge and the outward traits measured above, and the pan
     * clamp needs the same number the render actually used. */
    return { view: view, palette: palette, details: details, extent: extent };
  }

  return {
    render: render,
    lens: lens,
    bandFill: bandFill,
    SILHOUETTE_RELIEF: SILHOUETTE_RELIEF
  };
})();
