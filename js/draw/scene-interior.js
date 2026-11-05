/* The scene's interior passes: every layer's boundary function, the bands, what
 * spans the voids, the deferred fluids and the caves. Stages of `render`
 * (draw/scene.js), sharing its state object.
 *
 * Split out of draw/scene.js, which passed the 500-line rule. Attached to
 * CC.Scene; draw/scene.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var SILHOUETTE_RELIEF = CC.Scene.SILHOUETTE_RELIEF;
  var bandFill = CC.Scene.bandFill;

  function clampUnit(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  /* ---- the boundaries --------------------------------------------------- */

    /* Which layer is the body's visible edge — the outermost that isn't drawn
     * as an outward falloff. */
  function findSilhouette(sc) {
    var layers = sc.layers;
    var i;
    var silhouette = -1;
    for (i = 0; i < layers.length; i++) {
      if (!layers[i].outward) { silhouette = i; break; }
    }
    sc.silhouette = silhouette;
  }

  /* --- 3. layers, outermost -> innermost ---
   *
   * Each layer's boundary function is resolved once, up front, because a
   * layer needs its NEIGHBOUR's function to clip its inner edge — the two
   * must agree exactly or the clip leaves a crescent gap along the seam. */
  function resolveBounds(sc) {
    var layers = sc.layers, details = sc.details, settings = sc.settings;
    var silhouette = sc.silhouette;
    var i;

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

    /* A LAYER WHOSE EDGE BREAKS UP THROUGH THE ONE ABOVE (js/gen/form.js
     * `breachFn`). Composed after every boundary exists, because it lifts
     * this edge toward the ACTUAL drawn edge above — relief included — and at
     * full breach meets it, so the band above has no thickness there. The
     * clip and the detail pass both read `bounds`, so the band's own marks
     * vanish from a breach with no further work. */
    for (i = 1; i < layers.length; i++) {
      if (!layers[i].breach || layers[i].outward || layers[i - 1].outward) continue;
      var brf = CC.Form.breachFn(layers[i], settings, settings.seed, layers[i - 1].strength);
      if (!brf) continue;
      bounds[i] = (function (own, above, rOwn, rAbove, w) {
        return function (a) {
          var b = own ? own(a) : 1;
          var k = w(a);
          if (k <= 0) return b;
          var top = (above ? above(a) : 1) * rAbove / rOwn;
          return b + (top - b) * k;
        };
      })(bounds[i], bounds[i - 1], layers[i].outer, layers[i - 1].outer, brf);
    }
    sc.bounds = bounds;
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
  function findDeferred(sc) {
    var layers = sc.layers, details = sc.details;
    var i;
    var deferred = [];
    for (i = 0; i < layers.length; i++) {
      if (layers[i].outward) continue;
      var below = layers[i + 1];
      if (below && details.terrain[below.role]) deferred.push(i);
    }
    sc.deferred = deferred;
  }

  /* ---- the bands --------------------------------------------------------- */

  function drawSolidLayer(sc, i, layer, colour) {
    var ctx = sc.ctx, view = sc.view, details = sc.details, settings = sc.settings;
    var body = sc.body, layers = sc.layers, bounds = sc.bounds;
    var elementOpacity = sc.elementOpacity;

    /* A REGION MAY SIT OFF THE BODY'S CENTRE (`drift`, draw/feather.js):
     * its fill and its riding details are drawn through a moved view.
     * The identity on every layer that declares none. */
    var lView = CC.Feather.driftView(view, layer.drift);

    /* a. base fill, to the layer's own (possibly relief-displaced) edge */
    CC.Layers.fillLayer(ctx, lView, layer, bandFill(ctx, lView, layer, colour),
                        settings.seed, bounds[i]);

    /* b. layer details, clipped to the band so nothing spills across a
     *    boundary. The inner edge borrows the next layer's function. */
    var terrain = details.terrain[layer.role];
    var elements = details.get(layer.role);

    if (elements.length || terrain || details.zones) {
      ctx.save();
      layer.innerFn = (i + 1 < layers.length) ? bounds[i + 1] : null;
      /* A layer whose details RIDE its boundary is not clipped: its marks
       * follow the wobbled outline and dissolve at the edge on their own
       * (draw/feather.js). Absent everywhere else. */
      if (!layer.ride) CC.Layers.clipToLayer(ctx, view, layer, settings.seed, bounds[i]);

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

      CC.DrawDetails.drawLayer(ctx,
        layer.ride ? CC.Feather.rideView(lView, bounds[i]) : view,
        elements, colour, {
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

  function drawLayers(sc) {
    var layers = sc.layers, palette = sc.palette, deferred = sc.deferred;

    for (var i = 0; i < layers.length; i++) {
      if (deferred.indexOf(i) >= 0) continue;
      var layer = layers[i];
      var colour = palette.get(layer.role);

      if (layer.outward) {
        CC.Scene.drawOutwardLayer(sc, i, layer, colour);
        continue;
      }

      drawSolidLayer(sc, i, layer, colour);
    }
  }

  /* ---- across the voids -------------------------------------------------- */

  function drawFixtures(sc) {
    var ctx = sc.ctx, view = sc.view, details = sc.details, palette = sc.palette;
    var elementOpacity = sc.elementOpacity;

    /* --- 3d. pillars across the voids under hollow layers ---
     * Nothing paints a void, so they can go in after the bands. See
     * draw/shells.js. */
    CC.ShellDraw.drawPillars(ctx, view, details.pillars, palette, elementOpacity);
    /* Conduits across the boundaries, over pillars and bands alike
     * (draw/conduits.js). */
    CC.ConduitDraw.draw(ctx, view, details.conduits, palette, elementOpacity);
    /* Cans on the board, among the runs (draw/capacitors.js). */
    CC.CapacitorDraw.draw(ctx, view, details.capacitors, palette, elementOpacity);
    /* Doors down the shafts and shutters over their mouths
     * (draw/shaftdoors.js). */
    CC.ShaftDoorDraw.draw(ctx, view, details.doors, palette, elementOpacity);
    /* Growth over the hull and down the shafts (draw/overgrowth.js). */
    CC.OvergrowthDraw.draw(ctx, view, details.growth, "body", elementOpacity);
  }

  /* ---- the fluids -------------------------------------------------------- */

  /* --- 3e. deferred fluid layers ---
   *
   * Drawn last so they sit ON the terrain below rather than under it. The
   * layer's own outer edge stays a perfect circle — a sea has a flat top —
   * while its underside follows the solid it rests on. Where the terrain
   * rises above that flat top, the fill simply is not there, and THAT is the
   * coastline: never drawn, only the crossing of two curves. */
  function drawFluids(sc) {
    var ctx = sc.ctx, view = sc.view, details = sc.details, palette = sc.palette;
    var layers = sc.layers, settings = sc.settings, bounds = sc.bounds;
    var deferred = sc.deferred, elementOpacity = sc.elementOpacity;

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

  }

  /* ---- the caves --------------------------------------------------------- */

  /* --- 3g. caves ---
   *
   * Cut through the interior AFTER every layer is drawn, because an exit
   * runs out through the crust and must cut it; clipped to the body's own
   * outline, so an exit ends as a mouth at the edge. Before the traits, so
   * a borer is drawn over the bore it cut. See draw/caves.js. */
  function drawCaves(sc) {
    var ctx = sc.ctx, view = sc.view, details = sc.details, palette = sc.palette;
    var layers = sc.layers, silhouette = sc.silhouette, bounds = sc.bounds;
    var i;

    if (details.caves && silhouette >= 0) {
      var cvLayer = null, cvMosaic = null;
      for (i = 0; i < layers.length; i++) {
        if (layers[i].role === details.caves.role) cvLayer = layers[i];
      }
      var cvEls = details.get(details.caves.role);
      for (i = 0; i < cvEls.length; i++) {
        if (cvEls[i].kind === "mosaic") { cvMosaic = cvEls[i]; break; }
      }
      if (cvLayer && cvMosaic) {
        var cvStyle = CC.DrawDetails.styleFor("mosaic", palette.get(cvLayer.role),
                                              cvMosaic, 1);
        ctx.save();
        ctx.beginPath();
        CC.Layers.traceBoundary(ctx, view, layers[silhouette].outer,
                                bounds[silhouette], false);
        ctx.clip();
        CC.CaveDraw.draw(ctx, view, details.caves, {
          wall: cvStyle.seam, ramp: cvStyle.voidRamp,
          grainAlpha: cvStyle.grainAlpha, mottleAlpha: cvStyle.mottleAlpha
        });
        ctx.restore();
      }
    }
  }

  CC.Scene.findSilhouette = findSilhouette;
  CC.Scene.resolveBounds = resolveBounds;
  CC.Scene.findDeferred = findDeferred;
  CC.Scene.drawLayers = drawLayers;
  CC.Scene.drawFixtures = drawFixtures;
  CC.Scene.drawFluids = drawFluids;
  CC.Scene.drawCaves = drawCaves;
})();
