/* From the control panel to the pipeline — one translation point, so neither
 * side has to know about the other's conventions: the settings object, the
 * stage each control belongs to, and the cache keys that follow from it.
 *
 * Split out of js/main.js, which passed the 500-line rule. `traitSalt` stays
 * in main.js, where "Re-roll traits" bumps it, and is handed in. Must load
 * before js/main.js. */

var CC = CC || {};

CC.Gather = (function () {
  "use strict";

             /* pending animation frame */

  /* ---- settings ------------------------------------------------------- */

  /* Control values are read from the DOM as raw numbers (0-100, -100..100,
   * degrees). The pipeline wants normalized units. One translation point, so
   * neither side has to know about the other's conventions. */
  function read(traitSalt) {
    var c = CC.Controls;
    return {
      archetype: c.get("archetype") || "planet",
      seed: c.get("seed") || "first-light",

      thicknessVariation: (c.get("thickness-variation") || 0) / 100,
      optionalLayers: (c.get("optional-layers") || 0) / 100,
      coreBias: (c.get("core-bias") || 0) / 100,
      /* HOW SOLIDLY THE BODY HOLDS TOGETHER. Drives the Voronoi cell count,
       * the cell size, the void fraction and the seam width together — see
       * buildMosaic in gen/elemgen.js, and the note beside the control in
       * index.html for why those four are one slider rather than four.
       *
       * It sits in the Structure section and belongs to the DETAIL stage, the
       * same divergence tidal locking has: it decides what fills a layer, not
       * where the layer's boundaries are, so it must stay out of
       * `structureKey` or dragging it would re-roll the whole stack. */
      cohesion: (c.get("cohesion") === undefined ? 45 : c.get("cohesion")) / 100,
      /* WHAT HAS BEEN CUT THROUGH THE ROCK — caves at the low end, bores and
       * halls at the top, capped by Cohesion (js/gen/caves.js). Detail stage
       * for the same reason as Cohesion: it fills a layer, it does not move
       * a boundary. */
      caverns: (c.get("caverns") === undefined ? 30 : c.get("caverns")) / 100,
      /* HOW FAST A NEUTRON STAR TURNS — vortex density, and on a pulsar the
       * beam width and the light cylinder (js/gen/compact.js). Read by the
       * structure stage's `poles`, which is why it sits in the detail key:
       * that key covers both stages. */
      spinRate: (c.get("spin-rate") === undefined ? 50 : c.get("spin-rate")) / 100,
      /* HOW FAST A BLACK HOLE IS FEEDING — the disc and the jets
       * (js/gen/compact.js `hole`). Same stage and key as Spin rate. */
      accretionRate: (c.get("accretion-rate") === undefined ? 60 : c.get("accretion-rate")) / 100,
      /* WHERE A NEBULA'S LIGHT COMES FROM — dark, reflection, emission
       * (js/data/archetypes/diffuse-nebula.js). Read by the structure stage
       * (region opacity), the detail stage (what is drawn) and the palette,
       * so it sits in the detail key like Spin rate. */
      luminosity: (c.get("luminosity") === undefined ? 70 : c.get("luminosity")) / 100,
      /* WHICH OF THE NEBULA'S TWO STACKS — a filled cloud, or a shell empty
       * in the middle (js/data/archetypes/diffuse-nebula.js). Structure
       * stage: it decides which layers exist. */
      nebulaForm: c.get("nebula-form") || "cloud",
      oceanDepth: (c.get("ocean-depth") || 0) / 100,
      /* Draw only (D312), like Element opacity: in no cache key. */
      atmosphereOpacity: (c.get("atmosphere-opacity") === undefined ? 100 : c.get("atmosphere-opacity")) / 100,
      interiorHeat: (c.get("interior-heat") || 0) / 100,
      boundaryIrregularity: (c.get("boundary-irregularity") || 0) / 100,
      keepUpright: !!c.get("keep-upright"),
      rotation: c.get("rotation") || 0,

      primaryHue: c.get("primary-hue"),
      hueRelationship: c.get("hue-relationship") || "auto",
      secondaryOffset: c.get("secondary-offset") || 0,
      tertiaryOffset: c.get("tertiary-offset") || 0,
      accentOffset: c.get("accent-offset") || 0,
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
      /* The layer-name overlay (draw/overlay.js). Output stage: it draws over
       * the render and never touches what is generated. */
      showLabels: !!c.get("show-labels"),
      labelSide: c.get("label-side") || "both",
      labelSize: (c.get("label-size") === undefined ? 100 : c.get("label-size")) / 100,
      /* The scale bar and its silhouette (draw/scalebar.js), likewise. */
      showScaleBar: !!c.get("show-scale-bar"),
      scaleSilhouette: c.get("scale-silhouette") === undefined ? true : !!c.get("scale-silhouette"),

      /* THE BACKGROUND IS A STACK: a base colour, an optional field, and an
       * optional star overlay. `background` names only the FIELD now — stars
       * ride on top of any of them. See draw/canvas.js drawBackground. */
      background: c.get("background") || "solid",
      backgroundColor: c.get("background-color") || "#05070e",
      backgroundColor2: c.get("background-color2") || "#141a33",
      backgroundAngle: c.get("background-angle") === undefined ? 180 : c.get("background-angle"),
      stars: c.get("stars") === undefined ? true : !!c.get("stars"),
      starfieldDensity: (c.get("star-density") === undefined ? 60 : c.get("star-density")) / 100,
      /* How big the nebula's clouds are — the noise frequency, not how much
       * of the frame is covered (which the two colour pickers already reach).
       * Nebula field only; every other background ignores it. */
      nebulaScale: (c.get("nebula-scale") === undefined ? 50 : c.get("nebula-scale")) / 100,
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

    function structureKey(s) {
    return [s.archetype, s.seed, s.thicknessVariation, s.optionalLayers,
            s.coreBias, s.oceanDepth, s.interiorHeat, s.boundaryIrregularity,
            s.nebulaForm,
            /* Starlight biases the atmosphere's thickness, so it genuinely
             * belongs here — see CONTROL_SPECS. */
            s.starlight,
            s.keepUpright, s.rotation].join("|");
  }

    function detailKey(s, traitSalt) {
    /* Traits and zones live in the detail stage: they place elements and
     * modulate the terrain field, so changing one must re-run it. They are
     * deliberately NOT in structureKey — a trait never changes the layer
     * stack, so re-rolling traits leaves the body's proportions alone. */
    return [structureKey(s), s.detailDensity, s.sizeTiers, s.flowIndicators,
            s.textureStrength,
            (s.traits || []).join(","), (s.traitExcluded || []).join(","),
            s.traitCount, s.tidalLock, s.tidalFacing, s.cohesion, s.caverns,
            s.spinRate, s.accretionRate, s.luminosity,
            /* The climate field lives in this stage: it modulates the
             * snowline and the frosting rather than a layer radius, exactly as
             * tidal locking does. */
            s.starActivity, s.axialTilt, traitSalt].join("|");
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
    /* STRUCTURE SECTION, DETAIL STAGE — the same divergence tidal locking has,
     * and for the same reason. Cohesion decides what a layer is made of, not
     * where its boundaries are. */
    { id: "cohesion", stage: "detail", format: pct },
    { id: "caverns", stage: "detail", format: pct },
    { id: "spin-rate", stage: "detail", format: pct },
    { id: "accretion-rate", stage: "detail", format: pct },
    { id: "luminosity", stage: "detail", format: pct },
    { id: "nebula-form", stage: "structure" },
    { id: "ocean-depth", stage: "structure", format: pct },
    { id: "atmosphere-opacity", stage: "detail", format: pct },
    { id: "interior-heat", stage: "structure", format: pct },
    { id: "boundary-irregularity", stage: "structure", format: pct },
    { id: "keep-upright", stage: "structure" },
    { id: "rotation", stage: "output", format: function (v) { return Math.round(v) + "°"; } },
    { id: "primary-hue", stage: "colour", format: deg },
    { id: "hue-relationship", stage: "colour" },
    { id: "secondary-offset", stage: "colour", format: function (v) { return (v > 0 ? "+" : "") + Math.round(v) + "°"; } },
    { id: "tertiary-offset", stage: "colour", format: function (v) { return (v > 0 ? "+" : "") + Math.round(v) + "°"; } },
    { id: "accent-offset", stage: "colour", format: function (v) { return (v > 0 ? "+" : "") + Math.round(v) + "°"; } },
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
    { id: "show-labels", stage: "output" },
    { id: "label-side", stage: "output" },
    { id: "label-size", stage: "output", format: pct },
    { id: "show-scale-bar", stage: "output" },
    { id: "scale-silhouette", stage: "output" },
    { id: "background", stage: "output" },
    { id: "background-color", stage: "output" },
    { id: "background-color2", stage: "output" },
    { id: "background-angle", stage: "output", format: deg },
    { id: "stars", stage: "output" },
    { id: "nebula-scale", stage: "output", format: pct },
    { id: "star-density", stage: "output", format: pct },
    { id: "body-size", stage: "output", format: pct },
    /* Framing is output-stage: it re-frames, it never regenerates. */
    { id: "zoom", stage: "output", format: CC.Framing.zoomLabel },
    { id: "pan-x", stage: "output" },
    { id: "pan-y", stage: "output" },
    { id: "resolution", stage: "output" },
    { id: "aspect", stage: "output" }
  ];

  return {
    read: read,
    structureKey: structureKey,
    detailKey: detailKey,
    CONTROL_SPECS: CONTROL_SPECS
  };
})();
