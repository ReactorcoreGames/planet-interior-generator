/* Application wiring: controls -> pipeline -> canvas.
 *
 * Exposes window.CelestialCutaway as the app's public surface. The test
 * harness drives the real DOM controls rather than this object; the API is
 * here so tests can inspect what actually got generated, and so a body can be
 * produced headlessly without a canvas. */

var CC = CC || {};

(function () {
  "use strict";

  var canvas = null;
  var ctx = null;
  var current = null;         /* the generated body */
  var currentPalette = null;  /* its colours */
  var currentDetails = null;  /* its detail element geometry */
  var currentStats = null;    /* its info card, derived from the two above */
  var frame = null;           /* pending animation frame */

  /* ---- settings ------------------------------------------------------- */

  /* Control values are read from the DOM as raw numbers (0-100, -100..100,
   * degrees). The pipeline wants normalized units. One translation point, so
   * neither side has to know about the other's conventions. */
  function gather() {
    var c = CC.Controls;
    return {
      archetype: c.get("archetype") || "planet",
      seed: c.get("seed") || "first-light",

      thicknessVariation: (c.get("thickness-variation") || 0) / 100,
      optionalLayers: (c.get("optional-layers") || 0) / 100,
      coreBias: (c.get("core-bias") || 0) / 100,
      oceanDepth: (c.get("ocean-depth") || 0) / 100,
      interiorHeat: (c.get("interior-heat") || 0) / 100,
      boundaryIrregularity: (c.get("boundary-irregularity") || 0) / 100,
      keepUpright: !!c.get("keep-upright"),
      rotation: c.get("rotation") || 0,

      primaryHue: c.get("primary-hue"),
      hueRelationship: c.get("hue-relationship") || "auto",
      secondaryOffset: c.get("secondary-offset") || 0,
      saturation: (c.get("saturation") === undefined ? 100 : c.get("saturation")) / 100,
      brightness: (c.get("brightness") === undefined ? 100 : c.get("brightness")) / 100,
      contrast: (c.get("contrast") === undefined ? 100 : c.get("contrast")) / 100,

      /* Traits. `traits` is null when the picker has nothing ticked, which
       * means "roll them" rather than "this body has none" — the two are
       * genuinely different states and only an explicit empty selection should
       * produce a bare body. */
      traits: CC.TraitPicker ? CC.TraitPicker.selection() : null,
      traitExcluded: CC.TraitPicker ? CC.TraitPicker.excluded() : null,
      traitCount: c.get("trait-count") === undefined ? 2 : c.get("trait-count"),
      traitSalt: traitSalt,

      /* Tidal locking is an AXIS, not a trait — always present, 0 on an
       * ordinary rotating world. It lives in the Structure section of the
       * panel but belongs to the DETAIL stage (see CONTROL_SPECS). */
      tidalLock: (c.get("tidal-lock") || 0) / 100,
      tidalFacing: c.get("tidal-facing"),

      /* THE STAR. Three controls, and Starlight is the important one: it is
       * what makes cold regions conditional, so a Venus gets no polar caps
       * because its baseline is above freezing everywhere rather than because
       * a rule excluded it.
       *
       * Named for the RECEIVED QUANTITY rather than for orbital distance. The
       * quantity is not really a distance — for a moon the hotter neighbour
       * may be its planet, and for a rogue world there is nothing at all — and
       * naming what arrives sidesteps all of that. It also runs the intuitive
       * way round: more Starlight is hotter. */
      starlight: (c.get("starlight") === undefined ? 55 : c.get("starlight")) / 100,
      starColour: c.get("star-colour") || "sunlike",
      starActivity: (c.get("star-activity") === undefined ? 30 : c.get("star-activity")) / 100,
      axialTilt: (c.get("axial-tilt") || 0) / 100,
      exoticOceans: !!c.get("exotic-oceans"),

      detailDensity: (c.get("detail-density") === undefined ? 65 : c.get("detail-density")) / 100,
      sizeTiers: c.get("size-tiers") === undefined ? 3 : c.get("size-tiers"),
      flowIndicators: c.get("flow-indicators") || "balanced",
      textureStrength: (c.get("texture-strength") === undefined ? 100 : c.get("texture-strength")) / 100,
      elementOpacity: (c.get("element-opacity") === undefined ? 100 : c.get("element-opacity")) / 100,

      showInfo: c.get("show-info") === undefined ? true : !!c.get("show-info"),
      infoDetail: c.get("info-detail") || "standard",

      background: c.get("background") || "starfield",
      backgroundColor: c.get("background-color") || "#05070e",
      bodySize: (c.get("body-size") || 78) / 100,

      /* FRAMING IS OUTPUT-STAGE STATE and appears in no cache key, which is
       * what guarantees the two promises the feature makes: panning cannot
       * re-roll geometry, and Randomize leaves the framing alone because it
       * rolls from an explicit allowlist that these are simply not on. Both
       * are structural rather than a promise in a comment. */
      zoom: CC.Framing.zoomFromSlider(c.get("zoom")),
      panX: parseFloat(c.get("pan-x")) || 0,
      panY: parseFloat(c.get("pan-y")) || 0,
      resolution: parseInt(c.get("resolution") || 1080, 10),
      aspect: c.get("aspect") || "16:9"
    };
  }

  /* ---- pipeline ------------------------------------------------------- */

  /* Settings -> a body description. No canvas involved, so this is callable
   * headlessly and is what the tests inspect. */
  function generate(settings) {
    var archetype = CC.Archetypes.get(settings.archetype);
    return CC.Structure.build(archetype, settings, settings.seed);
  }

  /* Body + settings -> a colour per layer. Separate from generate() because
   * the two stages run off independent RNG streams: a colour change must
   * never disturb the geometry, and this is what makes that structural
   * rather than a promise. */
  function palette(body, settings) {
    var archetype = CC.Archetypes.get(settings.archetype);
    return CC.Palette.build(body, archetype.colorProfile, settings, settings.seed);
  }

  /* Body + settings -> detail element geometry. */
  function details(body, settings) {
    return CC.Details.build(body, settings, settings.seed);
  }

  /* Re-roll traits without touching anything else.
   *
   * The salt rides in `settings.traitSalt`, which gen/traitroll.js folds into
   * its stream key — so the traits change while the seed, the structure, the
   * palette and every layer detail stay byte-identical. That separation is
   * the whole point of the per-stage RNG streams. */
  function rerollTraits() {
    traitSalt++;
    if (CC.TraitPicker) CC.TraitPicker.clear();
    requestDraw();
  }

  /* ---- stage caching ----------------------------------------------------
   *
   * ARCHITECTURE's caching table: a colour change redraws cached geometry
   * without regenerating it, and only a detail or structure change re-rolls.
   * The cache key is the set of settings a stage actually reads, so dragging
   * Saturation cannot re-roll a single element position — the guarantee is
   * structural rather than a promise. */

  var cache = { key: null, body: null, details: null };

  /* The outermost body-space radius the last render reached, which is what the
   * pan clamp bounds travel by. Cached from the render rather than recomputed,
   * because it folds in the atmosphere bulge and the outward traits that only
   * draw/scene.js measures. */
  var currentExtent = 1;

  function structureKey(s) {
    return [s.archetype, s.seed, s.thicknessVariation, s.optionalLayers,
            s.coreBias, s.oceanDepth, s.interiorHeat, s.boundaryIrregularity,
            /* Starlight biases the atmosphere's thickness, so it genuinely
             * belongs here — see CONTROL_SPECS. */
            s.starlight,
            s.keepUpright, s.rotation].join("|");
  }

  function detailKey(s) {
    /* Traits and zones live in the detail stage: they place elements and
     * modulate the terrain field, so changing one must re-run it. They are
     * deliberately NOT in structureKey — a trait never changes the layer
     * stack, so re-rolling traits leaves the body's proportions alone. */
    return [structureKey(s), s.detailDensity, s.sizeTiers, s.flowIndicators,
            s.textureStrength,
            (s.traits || []).join(","), (s.traitExcluded || []).join(","),
            s.traitCount, s.tidalLock, s.tidalFacing,
            /* The climate field lives in this stage: it modulates the
             * snowline and the frosting rather than a layer radius, exactly as
             * tidal locking does. */
            s.starActivity, s.axialTilt, traitSalt].join("|");
  }

  /* Bumped by "Re-roll traits", which needs to produce a different roll from
   * the same seed and settings. Without it the cache key would be identical
   * and the button would do nothing — the silently-inert control the domtest
   * exists to catch. */
  var traitSalt = 0;

  /* ---- rendering ------------------------------------------------------ */

  function draw() {
    frame = null;
    if (!canvas) return;

    var settings = gather();

    /* Regenerate geometry only when a setting that shapes it has changed.
     * Element opacity and every colour control fall through to a redraw of
     * the cached geometry. */
    var key = detailKey(settings);
    if (cache.key !== key) {
      cache.body = generate(settings);
      cache.details = details(cache.body, settings);
      cache.key = key;
    }
    current = cache.body;
    currentDetails = cache.details;

    /* Colour is cheap and depends on its own controls, so it is rebuilt every
     * draw rather than cached — it never touches geometry. */
    currentPalette = palette(current, settings);

    var fit = CC.Canvas.fitToDisplay(canvas);
    ctx = fit.ctx;

    /* THE INFO CARD MUST NOT BE A ZOOM CONTROL.
     *
     * The card is given room by padding `#preview`, which narrows the canvas.
     * In a wide window that changes nothing, because height is the shorter axis
     * either way — but on a 1280x800 or 1440x900 screen the padded width
     * becomes the shorter axis, and the body is sized off it. Turning the card
     * off then gave the width back and the body ZOOMED by up to 48%, running
     * off the bottom of the frame. It read as the card zooming the picture,
     * because that is what it was doing.
     *
     * THE CANVAS NO LONGER CHANGES SIZE WHEN THE CARD IS TOGGLED, which is
     * what finally closed this. The card used to be given room by padding the
     * preview; that shrank the canvas, which meant the body was being sized
     * from a box the card controlled, which is how a display toggle came to
     * resize and crop the render. It also cut the preview's background off
     * halfway under the card, because the background only reaches as far as the
     * canvas does.
     *
     * The canvas is now full-bleed at all times and the room the card needs is
     * a SHIFT of the body's centre. Read from the `--card-room` custom property
     * so the responsive ladder in style.css stays the single source of how much
     * room the card takes, exactly as the padding was.
     *
     * NOT CONDITIONAL ON `settings.showInfo`. The offset applies whether the
     * card is visible or not, so the composition is identical in both states
     * and toggling the card provably cannot disturb the render. */
    var offsetX = 0;
    var preview = canvas.parentNode;
    if (preview && typeof window !== "undefined" && window.getComputedStyle) {
      var room = window.getComputedStyle(preview).getPropertyValue("--card-room");
      offsetX = parseFloat(room) || 0;
      /* Never shift so far that the body leaves the frame on a window narrower
       * than the ladder anticipated. A body pushed off the left edge would be a
       * worse failure than a card overlapping it. */
      var cap = fit.width * 0.35;
      if (offsetX > cap) offsetX = cap;
    }

    var rendered = CC.Scene.render(ctx, fit.width, fit.height, current,
                    CC.Math.merge(settings, { offsetX: offsetX }),
                    currentPalette, currentDetails);

    /* THE FRAMING GESTURES READ THE VIEW THE RENDER ACTUALLY USED, rather than
     * recomputing the transform from settings. Two copies of that arithmetic
     * would be two chances to disagree, and the symptom would be a drag that
     * does not track the cursor — so there is only ever one, and it is this. */
    if (CC.Framing) {
      currentExtent = rendered.extent || 1;
      CC.Framing.setView(rendered.view);

      /* AFTER the scene and only on the preview canvas: the guide is chrome,
       * and `renderTo` — the path every export takes — never runs this line. */
      CC.Framing.drawGuide(ctx, fit.width, fit.height, settings.aspect);
    }

    /* THE STATS ARE DERIVED FROM WHAT WAS JUST DRAWN, not from the settings
     * alone — `current` and `currentDetails` are the body and the climate that
     * produced the pixels above. That ordering is the mechanical half of
     * HAZARDS.md's rule; there is no path by which the card can be built from
     * anything else. Cheap enough to rebuild every frame, and rebuilding it
     * means it can never be stale against the render beside it. */
    currentStats = CC.Stats.build(current, currentDetails, settings,
                                  CC.Archetypes.get(settings.archetype),
                                  currentPalette);
    if (CC.InfoPanel) {
      CC.InfoPanel.setVisible(settings.showInfo);
      if (settings.showInfo) CC.InfoPanel.render(currentStats, settings.infoDetail);
    }

    updateMeta(settings);
  }

  /* Render the current body to an arbitrary context at an arbitrary size, with
   * a few settings overridden. This is what Export calls: it reuses the cached
   * body and detail geometry, so an export is the SAME world at a different
   * number of pixels rather than a fresh roll that happens to share a seed. */
  function renderTo(exportCtx, width, height, settings, region) {
    if (!current) draw();
    var pal = palette(current, settings);

    /* THE BODY MAY BE ASKED TO OCCUPY A SUB-REGION, which is what a composed
     * export needs: the card takes the right-hand third, so the body must
     * centre in what is left rather than in the whole canvas.
     *
     * Done by translating the context and handing the scene the REGION's
     * dimensions, rather than by teaching the scene about layout. The scene
     * centres in whatever box it is given and knows nothing about cards —
     * `draw/` stays free of composition, the same way it is free of role names
     * and zone logic (D23). */
    if (region) {
      exportCtx.save();
      exportCtx.translate(region.x, region.y);
      /* The background is painted across the WHOLE canvas by the caller, so
       * the region render must neither paint its own nor CLEAR what is there.
       * `transparent` would do the latter — see draw/scene.js. */
      CC.Scene.render(exportCtx, region.width, region.height, current,
                      CC.Math.merge(settings, { skipBackground: true }),
                      pal, currentDetails);
      exportCtx.restore();
      return;
    }

    CC.Scene.render(exportCtx, width, height, current, settings, pal, currentDetails);
  }

  /* Coalesce bursts of control changes into one render per frame, so dragging
   * a slider doesn't queue up work it will immediately throw away. */
  function requestDraw() {
    if (frame !== null) return;
    frame = (typeof requestAnimationFrame === "function")
      ? requestAnimationFrame(draw)
      : setTimeout(draw, 0);
  }

  function updateMeta(settings) {
    var name = document.getElementById("meta-name");
    var detail = document.getElementById("meta-detail");
    if (name) name.textContent = settings.seed;
    if (detail && current) {
      var parts = current.layers.map(function (l) { return l.role; });

      /* Rolled traits are shown here, because otherwise a body would carry
       * traits the user can see in the picture but nowhere in the interface —
       * and Randomize deliberately clears the picker to let the roll happen. */
      if (currentDetails && currentDetails.traits && currentDetails.traits.length) {
        var names = currentDetails.traits.map(function (t) { return t.label; });
        detail.textContent = parts.join("  ·  ") + "   —   " + names.join(", ");
      } else {
        detail.textContent = parts.join("  ·  ");
      }
    }
  }


  /* ---- setup ---------------------------------------------------------- */

  var pct = function (v) { return Math.round(v) + "%"; };
  var deg = function (v) { return Math.round(v) + "°"; };

  var CONTROL_SPECS = [
    { id: "archetype", stage: "structure" },
    { id: "seed", stage: "structure" },
    { id: "thickness-variation", stage: "structure", format: pct },
    { id: "optional-layers", stage: "structure", format: pct },
    { id: "core-bias", stage: "structure", format: function (v) { return (v > 0 ? "+" : "") + Math.round(v); } },
    { id: "ocean-depth", stage: "structure", format: pct },
    { id: "interior-heat", stage: "structure", format: pct },
    { id: "boundary-irregularity", stage: "structure", format: pct },
    { id: "keep-upright", stage: "structure" },
    { id: "rotation", stage: "output", format: function (v) { return Math.round(v) + "°"; } },
    { id: "primary-hue", stage: "colour", format: deg },
    { id: "hue-relationship", stage: "colour" },
    { id: "secondary-offset", stage: "colour", format: function (v) { return (v > 0 ? "+" : "") + Math.round(v) + "°"; } },
    { id: "saturation", stage: "colour", format: pct },
    { id: "brightness", stage: "colour", format: pct },
    { id: "contrast", stage: "colour", format: pct },
    { id: "trait-count", stage: "detail" },

    /* STRUCTURE SECTION, DETAIL STAGE — and the divergence is deliberate.
     *
     * Tidal locking sits beside Ocean depth in the panel because that is where
     * a user looks for it. But it modulates terrain, sea level and frosting
     * rather than layer radii, so it belongs to the detail stage and must stay
     * out of `structureKey` — test/sweep.mjs asserts the layer stack is
     * byte-identical across the whole range of it. */
    { id: "tidal-lock", stage: "detail", format: pct },
    { id: "tidal-facing", stage: "detail", format: deg },

    /* STARLIGHT IS A STRUCTURE-STAGE CONTROL, unlike the other two star
     * controls, and the divergence is worth stating. It feeds the climate
     * baseline (a detail-stage concern) but it also biases how much
     * ATMOSPHERE the body keeps — a close-in world loses air to escape and a
     * distant one freezes it out (CLIMATE-PLAN.md, settled decision 1). That
     * is a layer thickness, so it must re-run the structure stage or dragging
     * the slider would leave the air where it was. */
    { id: "starlight", stage: "structure", format: pct },
    { id: "star-colour", stage: "colour" },
    /* Activity drives cover, hazard and the exotic sea's saturation — never
     * temperature. Conflating the two would make it redundant with Starlight. */
    { id: "star-activity", stage: "detail", format: pct },
    { id: "axial-tilt", stage: "detail", format: pct },
    { id: "exotic-oceans", stage: "colour" },
    { id: "detail-density", stage: "detail", format: pct },
    { id: "size-tiers", stage: "detail" },
    { id: "flow-indicators", stage: "detail" },
    { id: "texture-strength", stage: "detail", format: pct },
    { id: "element-opacity", stage: "detail", format: pct },
    /* The info panel is an OUTPUT-stage control: it changes what is shown
     * beside the render, never what is generated. Toggling it must not
     * re-roll a single element. */
    { id: "show-info", stage: "output" },
    { id: "info-detail", stage: "output" },
    { id: "background", stage: "output" },
    { id: "background-color", stage: "output" },
    { id: "body-size", stage: "output", format: pct },
    /* Framing is output-stage: it re-frames, it never regenerates. */
    { id: "zoom", stage: "output", format: CC.Framing.zoomLabel },
    { id: "pan-x", stage: "output" },
    { id: "pan-y", stage: "output" },
    { id: "resolution", stage: "output" },
    { id: "aspect", stage: "output" }
  ];

  function init() {
    canvas = document.getElementById("stage");

    CC.Accordion.init(document);
    CC.Controls.bindAll(CONTROL_SPECS);
    CC.Controls.setChangeHandler(function (id) {
      if (id === "keep-upright") syncRotationEnabled();
      if (id === "background") syncBackgroundColour();
      if (id === "archetype") {
        var a = CC.Controls.get("archetype") || "planet";
        if (CC.TraitPicker) CC.TraitPicker.setArchetype(a);
        if (CC.PresetGallery) CC.PresetGallery.setArchetype(a);
      }
      requestDraw();
    });

    /* The trait picker rebuilds itself on every change, since selecting one
     * trait can exclude others. A change there is a detail-stage change. */
    if (CC.TraitPicker) {
      CC.TraitPicker.init(document.getElementById("trait-list"), function () {
        requestDraw();
      });
    }

    if (CC.InfoPanel) CC.InfoPanel.init(document.getElementById("info-panel"));

    /* The preset gallery. Applying one writes control values and nothing else,
     * so all it needs from here is a redraw — the same relationship the trait
     * picker has. */
    if (CC.PresetGallery) {
      CC.PresetGallery.init(document.getElementById("preset-gallery"), function () {
        syncRotationEnabled();
        syncBackgroundColour();
        requestDraw();
      });
      CC.PresetGallery.setArchetype(CC.Controls.get("archetype") || "planet");
    }

    /* Randomize lives in its own module but needs two things only main.js
     * owns: the trait salt, and the render loop. Handed over explicitly. */
    CC.Randomize.init({
      reroll: function () { traitSalt++; },
      draw: requestDraw
    });

    /* Framing. Handed the canvas it listens on, the render loop, and the
     * current extent for its pan clamp — the last of which only main.js can
     * know, since it is measured by the render. The zoom mapping stays inside
     * the module, so the slider and the gestures cannot drift apart. */
    if (CC.Framing) {
      CC.Framing.init({
        canvas: canvas,
        requestDraw: requestDraw,
        getExtent: function () { return currentExtent; }
      });
    }

    on("reroll-traits", "click", rerollTraits);

    syncRotationEnabled();
    syncBackgroundColour();

    on("randomize-btn", "click", CC.Randomize.run);
    on("seed-roll", "click", function () {
      CC.Controls.set("seed", CC.Randomize.randomSeed(CC.RNG.mulberry32(
        (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0)));
      requestDraw();
    });

    on("lock-all", "click", CC.Controls.lockAll);
    on("unlock-all", "click", CC.Controls.unlockAll);
    on("invert-locks", "click", CC.Controls.invertLocks);

    /* The export menu, its feedback, the settings-paste import and the
     * keyboard map all live in ui/exportui.js. It is handed the four accessors
     * CC.Export needs — all of them closures over the pipeline and the current
     * body, which only main.js has — plus the render request and the two sync
     * helpers a settings import has to call, since a paste can change controls
     * that gate other controls. */
    CC.ExportUI.init({
      requestDraw: requestDraw,
      syncRotationEnabled: syncRotationEnabled,
      syncBackgroundColour: syncBackgroundColour,
      exportInit: {
        renderTo: renderTo,
        getSettings: gather,
        /* The generated name, so an exported file is called Kaross_planet_…
         * and not first-light_planet_…. The same name the card shows. */
        getName: function () { return currentStats ? currentStats.name : null; },
        /* The card as data, for the composed export, the card-only export and
         * the markdown factsheet — all three paint the same stats.lines the
         * on-screen panel shows. */
        getStats: function () { return currentStats; }
      }
    });

    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("resize", requestDraw);
    }

    draw();

    /* AND DRAW AGAIN ONCE LAYOUT HAS CERTAINLY SETTLED.
     *
     * `draw/canvas.js` now refuses to trust an unresolved 300x150 canvas box,
     * which is the defect's actual fix — the first body used to arrive as a
     * squished oval and correct itself on the next redraw. This is the belt to
     * that pair of braces: fonts, scrollbars and the panel's own layout can all
     * shift the preview's box slightly after the first paint, and re-measuring
     * on the next frame costs one render of cached geometry. Nothing is
     * re-rolled — `draw` reuses the stage cache — so this cannot change the
     * body, only the box it is measured into. */
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(function () { requestAnimationFrame(requestDraw); });
    }
  }

  function syncRotationEnabled() {
    CC.Controls.setEnabled("rotation", !CC.Controls.get("keep-upright"));
  }

  function syncBackgroundColour() {
    var mode = CC.Controls.get("background");
    CC.Controls.setEnabled("background-color", mode === "solid" || mode === "gradient");
  }

  function on(id, evt, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener(evt, fn);
  }

  /* ---- public API ----------------------------------------------------- */

  var started = false;

  function start() {
    if (started) return;
    started = true;
    init();
  }

  var API = {
    version: "3.0.0-phase3",
    generate: generate,
    palette: palette,
    details: details,
    gather: gather,
    randomize: CC.Randomize.run,
    redraw: requestDraw,
    drawNow: draw,
    /* Exposed so a headless harness can start the app itself. jsdom's
     * "outside-only" script mode never fires DOMContentLoaded, so without
     * this a test would silently drive a UI that was never wired up. */
    init: start,
    get body() { return current; },
    get colours() { return currentPalette; },
    get elements() { return currentDetails; },
    /* The info card as data, so a probe can assert the numbers on it against
     * the body that produced them without parsing English out of the DOM. */
    get stats() { return currentStats; },
    renderTo: renderTo,
    CC: CC
  };

  if (typeof window !== "undefined") {
    window.CelestialCutaway = API;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start);
    } else {
      start();
    }
  }
})();
