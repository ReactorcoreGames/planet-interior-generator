/* The per-layer derivation: where each layer sits in the declared stack, the
 * order of its hue and value passes (gen/palette-hue.js, gen/palette-value.js),
 * and the colour it publishes.
 *
 * Split out of gen/palette.js, which passed the 500-line rule. Attached to
 * CC.Palette; gen/palette.js and gen/palette-util.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;
  var P = CC.Palette;
  var makeHotEdge = P.makeHotEdge, makeLighter = P.makeLighter;
  var makeDarker = P.makeDarker, makeRgba = P.makeRgba;

    /* THE GRADIENT ACROSS THE BAND — the piece that does most of the work.
     *
     * A layer is painted as one colour with a gentle shading gradient, and
     * for a mantle that is a lie the picture tells: real cutaway diagrams
     * show the mantle as a TRANSITION, cool rock at the crust grading to
     * near-melt at the core boundary. That gradient is the thing that reads
     * as heat. A uniformly hot band just reads as an orange stripe, and it
     * would also flatten the crust/mantle separation the adjacency pass
     * below works to protect.
     *
     * So the layer additionally publishes what it looks like at its INNER
     * edge: hotter hue, more saturation, more value. draw/scene.js's
     * bandFill interpolates between the two across the band. The strength is
     * the archetype's `heatGradient` scaled by the heat dial, so a cold
     * world's mantle stays the flat cool band it should be.
     *
     * Detail elements get this for free and that is the point: the
     * convection cells, arrows and flow-lines all derive from the band
     * colour, so once the band varies with depth the flow structure gains
     * contrast exactly where the mantle is most violent. See D59. */
  function publish(st, c) {
    var spec = c.spec, depth = c.depth;
    var h = c.h, s = c.s, v = c.v, emissive = c.emissive;
    var heat = st.heat, scorchMean = st.scorchMean, out = st.out, role = c.role;

    /* A VOID — `void: true` — is TRUE BLACK, darker than the sky. Every
     * clamp above floors value at 0.03, which is lighter than the default
     * background, and a horizon that is paler than space is a black disc
     * laid on the stars rather than a hole in them. Hue and saturation are
     * kept so the faint marks drawn in it still take the body's colour. */
    if (spec.void) v = 0;
    var hotEdge = spec.void ? null : makeHotEdge(spec, heat, h, s, v);

    out[role] = {
      h: h, s: s, v: v,
      hex: CC.Color.hsvToHex(h, s, v),
      depth: depth,
      /* HOW HARD THIS LAYER'S ALTERNATING BANDS SEPARATE, 1 being the
       * detail stage's ordinary lighter/darker step.
       *
       * A gas giant bands hard and an ice giant barely at all, and that is
       * the single largest difference between the two silhouettes — so it
       * is one authored number rather than a second code path. Published on
       * the colour because that is what the detail stage already receives;
       * nothing in draw/ asks which archetype it is looking at.
       *
       * IT SHRINKS AS THE DECK SINKS. A scorched giant's visible bands wash
       * out because the condensation level has been driven below them,
       * which is the visible half of the cloud-species story: the same
       * physical fact that changed the colour also flattens the banding. */
      bandContrast: spec.bandContrast === undefined
        ? 1
        : spec.bandContrast * (1 - scorchMean * 0.55),
      /* What this layer looks like at its inner (hotter) edge, or null if
       * it does not carry a thermal gradient. `heatSpec` is retained so the
       * adjacency pass below can rebuild it from the moved value. */
      hotEdge: hotEdge,
      heatSpec: spec,
      /* Machined metal's band shading, 0..1, or 0 (draw/sheen.js). */
      sheen: spec.sheen || 0,
      /* Painted as one flat colour, no band shading (draw/scene.js). */
      flat: !!spec.void,
      /* A self-lit centre, brightest in the middle (draw/scene.js). */
      glowCentre: !!spec.glowCentre,
      /* Self-lit, so the renderer knows to shade it as glowing from within
       * rather than lit from outside. */
      emissive: emissive,
      /* Helpers for the detail stage: relatives of the band colour, so
       * element fills and shading stay in family. */
      lighter: makeLighter(h, s, v),
      darker: makeDarker(h, s, v),
      rgba: makeRgba(h, s, v)
    };
  }

  function deriveLayer(st, layer, declaredDepth) {
    var body = st.body, profile = st.profile, seed = st.seed;
    var role = layer.role;
    var spec = (profile.layers && profile.layers[role]) || { sat: [0.2, 0.5], val: [0.3, 0.6] };

    /* Each layer draws from its OWN stream, keyed by role.
     *
     * Drawing sequentially from one stream would mean that adding or
     * removing a layer shifts every draw below it — turning the atmosphere
     * on would recolour the mantle and core, which is nonsense: an
     * atmosphere appearing cannot change what the core is made of. This is
     * the same rule the structure stage follows, for the same reason. */
    var lrng = CC.RNG.stream(seed, "colour/" + role);

    /* Where this layer sits in the archetype's declared stack, 0 at the
     * surface and 1 at the centre. Deliberately NOT the layer's measured
     * radius — see the note above `declaredDepth`. */
    var depth = declaredDepth[role];
    if (depth === undefined) {
      var mid = (layer.outer + layer.inner) / 2;
      depth = clamp(1 - mid / Math.max(0.001, body.surface), 0, 1);
    }

    var c = {
      layer: layer,
      role: role,
      spec: spec,
      lrng: lrng,
      depth: depth,
      h: 0,
      s: 0,
      v: 0,
      emissive: false
    };

    P.waiveForExotic(st, c);
    P.baseHue(st, c);
    P.leanHot(st, c);
    P.castStar(st, c);
    P.rollMaterial(st, c);
    P.leanClimate(st, c);
    P.heatMaterial(st, c);
    P.separateFromMud(st, c);
    P.lightMaterial(st, c);
    P.activityPush(st, c);
    P.moltenFloor(st, c);
    P.profileDial(st, c);
    P.userScale(st, c);
    P.fluorescentCeiling(st, c);
    publish(st, c);
  }

  /* Depth 0 at the surface, 1 at the centre.
   *
   * Taken from the archetype's DECLARED stack order rather than from the
   * layer's actual radius. A layer's geometric position shifts whenever a
   * neighbour changes thickness — a deepening ocean drowns the crust, and
   * the stack is renormalized so the surface stays at 1.0 — and colour
   * riding that means moving one slider quietly recolours the interior.
   *
   * Declared order is the stable thing: the crust is the third layer of a
   * planet whatever its thickness, so it is coloured as the third layer. */
  function colourLayers(st) {
    var profile = st.profile, layers = st.layers;

    var declaredDepth = {};
    var order = profile.order || Object.keys(profile.layers || {});
    for (var d0 = 0; d0 < order.length; d0++) {
      declaredDepth[order[d0]] = order.length > 1 ? d0 / (order.length - 1) : 0;
    }

    for (var i = 0; i < layers.length; i++) {
      deriveLayer(st, layers[i], declaredDepth);
    }
  }

  CC.Palette.colourLayers = colourLayers;
})();
