/* The colour stage: archetype colour profile + settings -> a colour per layer.
 *
 * No fixed palettes. Every colour is generated from HSV, and the archetype
 * declares only *saturation and lightness* ranges per layer — hue is free.
 * That is the key move: a body can be any colour, but how saturated and how
 * bright each of its layers is relative to the others follows the rules for
 * that type of body. So a planet stays planet-like at any hue.
 *
 * Colours derive from 2-3 ANCHORS:
 *
 *   primary    the surface / outermost material
 *   secondary  the core, related to the primary by `secondaryRel`
 *   tertiary   the atmosphere / halo
 *
 * Each layer sits somewhere on the primary->secondary journey by depth, so
 * adjacent layers are always related and the result is harmonious without
 * being repetitive.
 *
 * This stage runs off its own RNG stream, so re-rolling colour never disturbs
 * the structure and vice versa. */

var CC = CC || {};

CC.Palette = (function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp, lerp = M.lerp;

  /* How the secondary (core) hue relates to the primary (surface) hue. */
  var RELATIONS = {
    complement: function (h) { return h + 180; },
    analogous:  function (h, r) { return h + (r() < 0.5 ? -1 : 1) * (22 + r() * 26); },
    triad:      function (h, r) { return h + (r() < 0.5 ? -120 : 120); },
    monochrome: function (h) { return h; },
    split:      function (h, r) { return h + (r() < 0.5 ? 150 : 210); }
  };

  var RELATION_NAMES = ["complement", "analogous", "triad", "monochrome", "split"];

  function wrapHue(h) { return ((h % 360) + 360) % 360; }

  /* How far apart two adjacent layers' values must be to read as different
   * materials rather than one indistinct band. */
  var MIN_VALUE_SEPARATION = 0.11;

  /* Relatives of a band colour, for detail elements and shading that need to
   * stay in family. Built as named factories rather than inline closures so
   * they can be rebuilt when a colour is adjusted after the fact. */
  function makeLighter(h, s, v) {
    return function (amt) {
      return CC.Color.hsvToHex(h, clamp(s * (1 - amt * 0.4), 0, 1),
                               clamp(v + amt * (1 - v), 0, 1));
    };
  }
  function makeDarker(h, s, v) {
    return function (amt) {
      return CC.Color.hsvToHex(h, clamp(s * (1 + amt * 0.2), 0, 1),
                               clamp(v * (1 - amt * 0.65), 0.02, 1));
    };
  }
  function makeRgba(h, s, v) {
    return function (a) { return CC.Color.hsva(h, s, v, a); };
  }

  /* What a layer looks like at its INNER (hotter) edge, or null if it carries
   * no thermal gradient. See the long note at the call site and PROGRESS.md
   * D59.
   *
   * Built as a named factory beside the others for exactly the reason they
   * are: the adjacency pass moves a layer's value AFTER it is first built, and
   * anything derived from that value has to be rebuilt with it or the two
   * silently disagree. A hot edge computed from a value the band no longer has
   * would put the gradient's two ends on different colours. */
  function makeHotEdge(spec, heat, h, s, v) {
    if (!spec) return null;

    /* THE OTHER KIND OF GRADIENT: DEPTH, NOT HEAT.
     *
     * `heatGradient` warms a band toward the core, which is right for a mantle
     * or a molten core and wrong for a crust or a sheet of sea ice — neither
     * of those gets hotter inward in any way worth drawing, but both DO have
     * an inside and an outside, and shading that is what gives the cutaway
     * depth and makes one band read as separate from the next.
     *
     * `depthGradient: k` asks for that instead: the same machinery, but the
     * inner edge goes DARKER and slightly more saturated rather than hotter
     * and brighter — light falls off into a solid, and compacted material at
     * depth is denser and duller. Independent of the heat dial, because a
     * crust is layered whether or not the interior is molten.
     *
     * Positive `k` darkens inward (rock, ice). The two fields are mutually
     * exclusive on one layer; heat wins if both are somehow declared. */
    if (!spec.heatGradient && spec.depthGradient) {
      var dk = clamp(spec.depthGradient, 0, 1);
      var dv = clamp(v * (1 - dk * 0.72), 0.03, 1);
      var ds = clamp(s * (1 + dk * 0.34), 0, 1);
      /* A slight hue drift as well. A perfectly hue-stable ramp reads as a
       * lighting effect laid over the band; a small drift reads as the
       * material itself changing with depth, which is what it is. */
      var dh = wrapHue(h - dk * 7);
      return { h: dh, s: ds, v: dv, hex: CC.Color.hsvToHex(dh, ds, dv),
               strength: dk };
    }

    if (!spec.heatGradient || spec.heatDriven === false) return null;

    /* THE GRADIENT IS NOT PROPORTIONAL TO HEAT — it EASES IN and then holds.
     *
     * A mantle grades from cooler rock to hotter rock at every temperature a
     * mantle can have; what heat changes is how hot the hot end is, not
     * whether there is a hot end at all. Scaling the gradient linearly by the
     * dial made an Earth-like world at 0.5 come out almost perfectly flat
     * (measured: 8 points of red across the whole band), which is exactly the
     * uniform slab this work exists to remove.
     *
     * So the curve rises steeply out of zero and then flattens: a dead world
     * still gets nothing, a merely warm one already gets most of the
     * structure, and the dial's remaining range goes into HUE and BRIGHTNESS
     * via heatLean rather than into the gradient's existence. */
    var warm = clamp(heat, 0, 1);
    var str = clamp(spec.heatGradient * Math.sqrt(warm) * (0.55 + 0.45 * warm),
                    0, 1);
    if (str <= 0.01) return null;

    var range = (spec.heatLean && spec.heatLean.hue) || [10, 40];
    var target = wrapHue(lerp(range[0], range[1], 0.35));

    var hh = mixHue(h, target, clamp(str * 0.80, 0, 1));
    var hs = clamp(s * (1 + str * 0.38), 0, 1);
    /* Reaches most of the remaining headroom at full strength. The mantle's
     * band measured only 34 luminance points of ramp end to end at 0.58, most
     * of it crowded into the outer fifth; the gradient has to have real range
     * before the stop placement can spread it. */
    var hv = clamp(v + str * 0.80 * (1 - v), 0.03, 1);

    /* A LAYER ALREADY AT FULL BRIGHTNESS GRADES THE OTHER WAY.
     *
     * The inner core sits at v≈1.0 by design — it is the brightest thing in
     * the picture. "Hotter" therefore has no headroom left in value, and the
     * fluorescent ceiling below then pulls its SATURATION down instead, which
     * would make the centre wash out toward white: the exact "dull disc"
     * failure D13 fixed, arriving from the opposite direction.
     *
     * Real incandescence goes white-hot at the centre by climbing through the
     * spectrum — deep red, orange, yellow, white — so a layer with no value
     * headroom grades in HUE and loses saturation deliberately rather than as
     * a side effect. It is the same picture the eye expects from a hot filament
     * or a forge, and it makes the core read as radiating rather than as flat.
     *
     * The floor keeps it from reaching literal white, which would lose the
     * material entirely. */
    if (v > 0.95) {
      hh = wrapHue(h + str * 26);
      hs = Math.max(0.30, s * (1 - str * 0.52));
      hv = 1;
      return { h: hh, s: hs, v: hv, hex: CC.Color.hsvToHex(hh, hs, hv),
               strength: str };
    }

    /* Held off the fluorescent corner on the same terms as the band itself, so
     * the hot edge cannot become the glowing plastic bead D11 exists to
     * prevent. */
    hs = Math.min(hs, 1 - 0.42 * Math.max(0, hv - 0.62) / 0.38);

    return { h: hh, s: hs, v: hv, hex: CC.Color.hsvToHex(hh, hs, hv),
             strength: str };
  }

  /* Self-lit materials: molten cores, stellar interiors. They emit rather than
   * reflect, so the rules that keep ordinary surfaces looking like materials
   * do not apply to them. */
  function emissiveSpec(spec) { return !!(spec && spec.incandescent); }

  /* Circular interpolation between two hues, taking the short way round. Going
   * the long way would sweep through unrelated colours and break the harmony
   * the anchors are there to create. */
  function mixHue(a, b, t) {
    var d = wrapHue(b - a);
    if (d > 180) d -= 360;
    return wrapHue(a + d * t);
  }

  /* Build the palette.
   *
   * `body` is the structure stage's output; `profile` the archetype's
   * colorProfile; `params` the user's colour controls. Returns a map of
   * role -> { h, s, v, hex, ... } plus the anchors, so later stages can derive
   * detail colours that stay in family. */
  function build(body, profile, params, seed) {
    var rng = CC.RNG.stream(seed, "colour");

    var satScale = params.saturation === undefined ? 1 : params.saturation;
    var valScale = params.brightness === undefined ? 1 : params.brightness;
    var contrast = params.contrast === undefined ? 1 : params.contrast;
    var heat = params.interiorHeat === undefined ? 0.5 : params.interiorHeat;

    /* THE STAR'S LIGHT, read from the same table gen/climate.js builds the
     * temperature baseline from. One definition of what a blue giant is,
     * rather than two that can drift apart.
     *
     * The cast is scaled by how much light there actually IS: an unlit rogue
     * world cannot be tinted by a star it does not have, and easing the cast
     * out with Starlight rather than switching it off at zero keeps the
     * transition continuous. */
    var star = CC.Climate ? CC.Climate.starOf(params) : null;
    var starHue = star ? star.hue : 0;
    var starlight = params.starlight === undefined ? 0.55 : params.starlight;

    /* AN ARCHETYPE THAT DECLINES STARLIGHT IS NOT LIT BY ONE EITHER.
     *
     * `climate: { starlit: false }` says this body is not warmed by some other
     * star — a star, a neutron star, a black hole. The same declaration has to
     * reach the palette, or a star archetype would be temperature-independent
     * of the Star colour dropdown while still being TINTED by it, which is a
     * contradiction the eye would catch before any test did.
     *
     * Read from the archetype rather than inferred from a role name, the same
     * contract gen/climate.js follows (D27). */
    var climateSpec = null;
    var arch = null;
    if (body && body.archetype && CC.Archetypes) {
      arch = CC.Archetypes.get(body.archetype);
      climateSpec = (arch && arch.climate) || null;
    }
    if (climateSpec && climateSpec.starlit === false) starlight = 0;

    /* THE THERMAL FIELD, BUILT ONCE AND USED TWICE.
     *
     * The frosting stage at the bottom of this file already rebuilt it from
     * the archetype, for the reason recorded there: `Palette.build` is called
     * from eight places and none of them has the field to hand, and both
     * builds are pure and keyed to the same seed so they agree by definition.
     * `climateLean` below needs the same field, so it is hoisted here and the
     * frosting reuses it rather than constructing a second copy.
     *
     * Cheap, deterministic, and it means the layer colours and the deposition
     * colours are looking at literally the same numbers — which is the whole
     * point of D42 (one physical fact, one threshold). */
    var thermal = null;
    if (CC.Climate && arch) {
      var taxis = arch.axes && arch.axes.tidalLock;
      var torder = (arch.colorProfile && arch.colorProfile.order) || [];
      var tzones = (taxis && CC.Zones)
        ? CC.Zones.build(taxis, body, torder, params, seed) : null;
      thermal = CC.Climate.build(arch, body, params, seed, tzones);
    }

    /* HOW WINTRY AND HOW SCORCHED THIS BODY IS AS A WHOLE.
     *
     * `climateLean` colours a LAYER, and a layer is a band all the way round —
     * it has no bearing of its own to ask about. So the two figures are
     * averaged over the disc rather than sampled at a point, which is the
     * honest reading of "how cold is this world" for something that has one
     * colour everywhere.
     *
     * Read from `chillAt` and `scorchAt`, never from a second ramp against
     * `tempAt` (D42). Sixteen bearings: enough that a latitude term or a
     * tidal-lock field registers, cheap enough to do unconditionally. */
    var chillMean = 0, scorchMean = 0;
    if (thermal && thermal.chillAt) {
      var SAMPLES = 16;
      for (var ci = 0; ci < SAMPLES; ci++) {
        var ca2 = (ci / SAMPLES) * Math.PI * 2;
        chillMean += thermal.chillAt(ca2);
        scorchMean += thermal.scorchAt(ca2);
      }
      chillMean /= SAMPLES;
      scorchMean /= SAMPLES;
    }
    var starCast = star
      ? star.cast * clamp(starlight / 0.35, 0, 1)
      : 0;
    var starHarsh = star ? star.harsh : 0.45;

    /* --- anchors --- */

    /* Primary hue: the user's slider if they've touched it, otherwise rolled
     * within whatever range the archetype allows. */
    var hueRange = profile.hue || [0, 360];
    var primary = (params.primaryHue === undefined || params.primaryHue === null)
      ? wrapHue(lerp(hueRange[0], hueRange[1], rng()))
      : wrapHue(params.primaryHue);

    var relName = params.hueRelationship && params.hueRelationship !== "auto"
      ? params.hueRelationship
      : (profile.secondaryRel || M.pick(rng, RELATION_NAMES));
    var relation = RELATIONS[relName] || RELATIONS.complement;

    var secondary = wrapHue(relation(primary, rng) + (params.secondaryOffset || 0));

    /* Tertiary: the atmosphere. Derived by default — a hue between the two
     * anchors, nudged, which keeps a haze looking like it belongs to the
     * world it sits on. */
    var tertiary = (params.tertiaryHue === undefined || params.tertiaryHue === null)
      ? wrapHue(mixHue(primary, secondary, 0.25) + (rng() * 24 - 12))
      : wrapHue(params.tertiaryHue);

    /* --- per-layer derivation --- */

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
    var layers = body.layers;
    var out = {};

    var declaredDepth = {};
    var order = profile.order || Object.keys(profile.layers || {});
    for (var d0 = 0; d0 < order.length; d0++) {
      declaredDepth[order[d0]] = order.length > 1 ? d0 / (order.length - 1) : 0;
    }

    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
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

      /* Hue: outward layers ride the tertiary anchor, everything else travels
       * from primary at the surface to secondary at the core.
       *
       * The journey is heavily back-loaded. An earlier version eased with
       * depth² and moved the whole body through hue space, which made crust
       * and mantle drift toward the core's hue — every world came out as a
       * pastel bullseye rather than rock over metal. Holding the outer two
       * thirds near the primary is what makes the surface read as *material*
       * and the core read as the departure from it. */
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
      if (starCast > 0 && !emissiveSpec(spec)) {
        var reach = starCast * (1 - depth) * (layer.outward ? 1.25 : 1);
        h = mixHue(h, starHue, clamp(reach, 0, 0.6));
      }

      /* Saturation and value come from the archetype's profile for this role.
       * The archetype decides the *relationship*; the user's sliders scale it
       * without flattening it. */
      var s = lerp(spec.sat[0], spec.sat[1], lrng());
      var v = lerp(spec.val[0], spec.val[1], lrng());

      /* WHAT THE MATERIAL IS, AS A FUNCTION OF HOW MUCH LIGHT ARRIVES.
       *
       * `climateLean` is `heatLean`'s counterpart on the other heat source.
       * `heatLean` says a layer's material changes with the body's own
       * interior heat; this says it changes with the STAR. Both perturb the
       * rolled colour rather than replacing it (zones.js rule 1), so the same
       * seed under three Starlight settings gives three visibly different
       * worlds that are still recognisably one world.
       *
       *   climateLean: { chill:  { hue, amount, sat, val },
       *                  scorch: { hue, amount, sat, val } }
       *
       * The gas giant's cloud decks are the first user and the reason it
       * exists: ammonia, ammonium hydrosulphide and water condense at
       * different temperatures, so which deck is VISIBLE is a fact about
       * temperature. A cold giant shows a pale high ammonia deck; a hot one
       * has its condensation level driven below the visible layer and shows
       * the darker chromophore-stained gas underneath. Different material,
       * not the same material tinted — which is what the phase's
       * done-condition asks Starlight to change.
       *
       * IT READS `chillAt` / `scorchAt`, the same two figures the frosting
       * reads, and authors no threshold of its own (D42).
       *
       * Weighted by (1 - depth), for the same reason the star cast is: light
       * reaches the envelope and not the core, and a core that changed colour
       * with the star would read as a wash over the picture. Self-lit layers
       * are exempt entirely, as they are from every other reflective rule
       * (D13). */
      if (spec.climateLean && !emissiveSpec(spec)) {
        var lightReachC = 1 - depth;
        var endSpec = null, endAmt = 0;
        if (chillMean >= scorchMean) {
          endSpec = spec.climateLean.chill; endAmt = chillMean;
        } else {
          endSpec = spec.climateLean.scorch; endAmt = scorchMean;
        }
        if (endSpec && endAmt > 0) {
          var travel = clamp(endAmt * (endSpec.amount === undefined
                                       ? 0.5 : endSpec.amount)
                             * lightReachC, 0, 0.95);
          if (endSpec.hue) {
            var destC = wrapHue(lerp(endSpec.hue[0], endSpec.hue[1], lrng()));
            h = mixHue(h, destC, travel);
          }
          if (endSpec.sat) s = clamp(s + endSpec.sat * travel, 0, 1);
          if (endSpec.val) v = clamp(v + endSpec.val * travel, 0.03, 1);
        }
      }

      /* Interior heat drives saturation directly: a hot world glows toward
       * the top of its range and a dead one drains toward grey. Weighted by
       * depth, so heat shows most in the layers nearest the core — which is
       * where the heat actually is. */
      if (spec.heatDriven !== false) {
        var heatPush = (heat - 0.5) * 2;              /* -1 .. +1 */
        s = clamp(s * (1 + heatPush * 0.45 * depth), 0, 1);

        if (heatPush >= 0) {
          /* A hot world's interior genuinely glows. Self-lit layers get a
           * real push toward the top of their range in both saturation and
           * brightness, rather than merely avoiding the decay a cold world
           * suffers — "hot" should look hot, not just "not dead". */
          if (emissiveSpec(spec)) {
            s = clamp(s + heatPush * 0.22 * depth, 0, 1);
            v = clamp(v + heatPush * 0.14 * depth, 0.03, 1);
          } else {
            /* AND SO DOES ORDINARY ROCK, WHICH IT PREVIOUSLY DID NOT (D59).
             *
             * The push above was inside the emissive branch, so a non-emissive
             * layer got SATURATION from heat and nothing else. Meanwhile the
             * cold branch below drops value on every layer regardless. The
             * control was therefore asymmetric in the one way that matters
             * visually: Interior heat could dim a mantle but could never
             * brighten one, and cranking the dial to maximum made the band a
             * little more colourful and not one shade lighter.
             *
             * The coefficient is smaller than the emissive one and rides
             * depth, so the crust barely moves while the mantle — the layer
             * with real depth and the one being looked at — genuinely
             * lightens as it heats. Rock near its melting point is brighter
             * than cold rock, so this is the believable direction as well as
             * the legible one. */
            v = clamp(v + heatPush * 0.20 * depth, 0.03, 1);
          }
        } else {
          /* A dying world loses colour everywhere, not only at the core. */
          s = clamp(s * (1 + heatPush * 0.30), 0, 1);

          /* And its interior stops glowing. A cold core is dull metal, so the
           * deep layers lose brightness as well as saturation — a dead world
           * should look dead in its colour as well as in its structure,
           * without needing a trait to say so. */
          v = clamp(v * (1 + heatPush * 0.38 * depth), 0.03, 1);
        }
      }

      /* Contrast between layers: push each layer's value away from the mean
       * of its profile, so adjacent bands separate more or less strongly. */
      var vMid = (spec.val[0] + spec.val[1]) / 2;
      v = vMid + (v - vMid) * contrast;

      /* Push value away from the muddy middle.
       *
       * Mid-saturation at mid-value is where colours go to die — the
       * grey-brown-purple mush that made several bodies in the first pass
       * unreadable. Nudging each layer's value toward whichever end of the
       * range it is already closer to keeps adjacent bands distinguishable
       * without changing the archetype's overall light-to-dark ordering. */
      var awayFromMid = (v - 0.5) >= 0 ? 1 : -1;
      var mudness = 1 - Math.abs(v - 0.5) / 0.5;      /* 1 at v=0.5 */
      v += awayFromMid * mudness * 0.10 * contrast;

      /* HOW BRIGHT AND HOW HARD THE LIGHT IS, not only what colour it is.
       *
       * A red-dwarf world is genuinely dimmer — less light arrives and less of
       * it is at the wavelengths a surface reflects strongly — and a blue
       * giant's is harsher, which reads as higher contrast and a little more
       * saturation in what it lights. Without this the star colour would be a
       * hue rotation and nothing more, and a "dim red sun" would come out just
       * as bright as a blue one.
       *
       * Rides the same depth falloff and the same emissive exemption as the
       * hue cast, for the same reasons. */
      if (star && !emissiveSpec(spec) && !layer.luminous) {
        var lightReach = (1 - depth) * clamp(starlight / 0.35, 0, 1);
        v = clamp(v * (1 + (star.output - 1) * 0.30 * lightReach), 0.03, 1);
        s = clamp(s * (1 + (starHarsh - 0.45) * 0.22 * lightReach), 0, 1);
      }

      /* THE STAR-ACTIVITY COUPLING, and it is GATED ON THE CHECKBOX.
       *
       * The user's idea, and a good one: it gives the toggle a reason to exist
       * inside the simulation rather than being purely a taste switch. A
       * strange sea becomes a CONSEQUENCE of a strange star — pushed
       * saturation and brightness, a sea that looks chemically wrong under a
       * violent sun.
       *
       * The gate is what keeps the realistic default genuinely realistic: an
       * active star cannot distort a sea the user has asked to keep plausible.
       * Only a layer that declared `exotic.activity` feels it, so this is
       * archetype data rather than a role name here. */
      if (spec.activity && params.exoticOceans) {
        var act = clamp(params.starActivity === undefined ? 0.3
                        : params.starActivity, 0, 1);
        s = clamp(s * (1 + act * spec.activity.sat), 0, 1);
        v = clamp(v * (1 + act * spec.activity.val), 0.03, 1);
      }

      /* A NEARLY-MOLTEN LAYER HAS A FLOOR UNDER ITS SATURATION AND VALUE.
       *
       * Getting the hue right was not sufficient on its own. A mantle can roll
       * the bottom of its authored ranges — measured at full heat: s≈0.43,
       * v≈0.31 — and a dark desaturated red is maroon, which reads as cold
       * rock however correct its hue is. That was the residual "still feels
       * like a solid rock layer" case after the lean was fixed.
       *
       * The floor rises with the lean, so it does nothing at low heat and only
       * bites where the material is supposed to be glowing. It is a FLOOR
       * rather than a set value, so a mantle that already rolled hot and
       * saturated keeps its own roll and the variety between bodies survives.
       *
       * Scaled by the user's own sliders afterwards, so turning Saturation or
       * Brightness down still works — this raises the archetype's floor, it
       * does not overrule the person using it. */
      if (spec.heatLean && spec.heatDriven !== false) {
        var molten = clamp((heat - 0.5) / 0.5, 0, 1) *
                     (spec.heatLean.amount === undefined ? 0.45
                      : spec.heatLean.amount);
        if (molten > 0) {
          s = Math.max(s, lerp(s, 0.62, molten * 0.85));
          v = Math.max(v, lerp(v, 0.56, molten * 0.85));
        }
      }

      s = clamp(s * satScale, 0, 1);
      v = clamp(v * valScale, 0.03, 1);

      /* Keep colours off the fluorescent corner of HSV.
       *
       * High saturation together with high value gives pure spectral hue —
       * the #00ff00 look. It reads as a glowing plastic bead, not as material,
       * and it was the worst artefact in the first colour pass. Real bright
       * surfaces desaturate as they brighten, so saturation is capped by how
       * bright the layer already is.
       *
       * Self-lit layers are exempt: a molten core and a star's photosphere are
       * *supposed* to be saturated and bright, because they are emitting
       * rather than reflecting. Applying the reflective rule to them was what
       * made hot interiors look dull. They are still held off pure spectral
       * hue, just far less aggressively. */
      var emissive = layer.luminous || emissiveSpec(spec);
      if (spec.hueWild && params.exoticOceans) {
        /* AN EXOTIC SEA IS HELD TO A LOOSER CEILING, not exempted from one.
         *
         * The fluorescent rule exists because high saturation at high value
         * gives pure spectral hue, which reads as a glowing plastic bead
         * rather than as material (D11) — and that is still true of a sea. But
         * the strict reflective bound would forbid the pale, milky and
         * near-white seas that are most of what this control is for, since it
         * cuts saturation hard above v=0.55 and the lifted ceiling reaches
         * 0.78. A pale sea is low-saturation anyway; the bound only has to
         * stop a saturated one from also being bright. */
        s = Math.min(s, 1 - 0.42 * Math.max(0, v - 0.70) / 0.30);
      } else if (!emissive) {
        s = Math.min(s, 1 - 0.55 * Math.max(0, v - 0.55) / 0.45);
      } else {
        s = Math.min(s, 1 - 0.12 * Math.max(0, v - 0.75) / 0.25);
      }

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
      var hotEdge = makeHotEdge(spec, heat, h, s, v);

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

    /* --- guarantee adjacent bands are distinguishable ---
     *
     * Two layers whose profiles overlap can both roll into the same corner of
     * HSV — crust and mantle are the pair that does it, since their authored
     * value ranges overlap. The result is a single indistinct band where the
     * cutaway should show two materials, which is exactly the "muddy" failure
     * this phase is judged against.
     *
     * Rather than hand-tuning the ranges apart and hoping, adjacent pairs are
     * checked and separated after the fact: the inner layer is darkened until
     * it reads as distinct. Working inward keeps the archetype's overall
     * light-to-dark ordering intact. */
    var order = [];
    for (i = 0; i < layers.length; i++) {
      if (!layers[i].outward && out[layers[i].role]) order.push(out[layers[i].role]);
    }
    for (i = 1; i < order.length; i++) {
      var prev = order[i - 1], cur = order[i];

      /* COMPARE THE EDGES THAT ACTUALLY TOUCH, not the two base colours.
       *
       * Once a layer carries a gradient, its base colour is no longer what
       * sits against its neighbour — the outer core meets the inner core with
       * its HOT edge, which may be most of a hue and a third of a value away
       * from the colour this check used to read. Comparing base colours could
       * therefore pass a pair whose visible boundary had in fact collapsed,
       * and equally could "fix" a pair that was already perfectly distinct
       * where it mattered. The gradient work made this check ask the wrong
       * question; it now asks about the boundary the eye actually sees. */
      var pIn = prev.hotEdge || prev;

      var dh = Math.abs(pIn.h - cur.h);
      if (dh > 180) dh = 360 - dh;
      var dv = Math.abs(pIn.v - cur.v);
      var ds = Math.abs(pIn.s - cur.s);

      if (dv < MIN_VALUE_SEPARATION && dh < 14 && ds < 0.14) {
        /* Push away from the neighbour's TOUCHING edge, staying inside the
         * legal range — the same correction as the comparison above. */
        var target = pIn.v > 0.5
          ? Math.max(0.05, pIn.v - MIN_VALUE_SEPARATION)
          : Math.min(0.95, pIn.v + MIN_VALUE_SEPARATION);
        cur.v = target;
        cur.hex = CC.Color.hsvToHex(cur.h, cur.s, cur.v);
        cur.lighter = makeLighter(cur.h, cur.s, cur.v);
        cur.darker = makeDarker(cur.h, cur.s, cur.v);
        cur.rgba = makeRgba(cur.h, cur.s, cur.v);
        /* The thermal gradient is derived from the band's value, so it moves
         * with it — otherwise the two ends of the gradient would be built from
         * different colours and the band would step at its outer edge. */
        cur.hotEdge = makeHotEdge(cur.heatSpec, heat, cur.h, cur.s, cur.v);
      }
    }

    /* --- an exotic sea must still separate from the rock beneath it ---
     *
     * WHATEVER HUE THE SEA TAKES, IT MUST READ AS DISTINCT FROM THE CRUST.
     * That is the same relational constraint the frosting uses (D19/D20) and
     * it is precisely what lets the hue roam the whole wheel without any world
     * losing its ocean into its rock — which was the original failure the
     * authored range was introduced to fix, so freeing the hue without this
     * would simply reintroduce it by another route.
     *
     * The general adjacency pass above cannot catch it: that one darkens the
     * INNER layer of a colliding pair, so it would push the crust around to
     * accommodate the sea rather than moving the sea. The ocean is the layer
     * that just had its constraint waived, so the ocean is the layer that
     * moves.
     *
     * Value, not hue. Two colours that differ only in hue at the same
     * lightness are a weak separation on a small band seen through water;
     * moving the value is what genuinely reads, and it costs the sea nothing
     * it was promised — a pale sea over dark rock and a dark sea over pale
     * rock are both perfectly exotic. */
    for (var xi = 0; xi < layers.length; xi++) {
      var xspec = (profile.layers && profile.layers[layers[xi].role]) || {};
      if (!xspec.exotic || !params.exoticOceans) continue;
      var sea = out[layers[xi].role];
      /* The layer this one floats on: the next one inward that is a real
       * layer. Found by position rather than by name, so a magma sea over a
       * different floor behaves identically. */
      var floor = (xi + 1 < layers.length) ? out[layers[xi + 1].role] : null;
      if (!sea || !floor) continue;

      var xdh = Math.abs(sea.h - floor.h);
      if (xdh > 180) xdh = 360 - xdh;
      if (xdh >= 20 || Math.abs(sea.v - floor.v) >= 0.10) continue;

      /* Push away from the floor, toward whichever end of the sea's own
       * range has more room, so the correction never runs out of gamut. */
      var up = 1 - floor.v, down = floor.v;
      sea.v = clamp(up >= down ? floor.v + 0.16 : floor.v - 0.16, 0.05, 0.95);
      sea.hex = CC.Color.hsvToHex(sea.h, sea.s, sea.v);
      sea.lighter = makeLighter(sea.h, sea.s, sea.v);
      sea.darker = makeDarker(sea.h, sea.s, sea.v);
      sea.rgba = makeRgba(sea.h, sea.s, sea.v);
      sea.hotEdge = makeHotEdge(sea.heatSpec, heat, sea.h, sea.s, sea.v);
    }

    /* The surface frosting is a pseudo-role, resolved after the layers so it
     * cannot disturb their RNG streams or the adjacency pass. It lives in
     * gen/frosting.js — four zones' worth of colour rules is its own stage.
     * See PROGRESS.md D18/D19/D20. */
    /* EVERY DISTINCT FROSTING ON THE BODY, NOT ONLY THE GLOBAL ONE.
     *
     * An ice-shelled moon frosts two surfaces with two different materials, so
     * two sets of zone colours have to exist at once. They do not collide
     * because each table names its own zones — `regolithRim` and `brineRock`
     * and `accretionTip` are distinct keys — which is the same reason the
     * planet's four and the giant's two have always been able to coexist in
     * one palette namespace.
     *
     * The global `layers.film` is included first, so an archetype with one
     * frosting resolves exactly the one spec it always did, in the same RNG
     * order, and no existing body's colours move. */
    var filmSpecs = [];
    var filmSeen = [];
    function addFilmSpec(s) {
      if (!s || filmSeen.indexOf(s) >= 0) return;
      filmSeen.push(s);
      filmSpecs.push(s);
    }
    addFilmSpec(profile.layers && profile.layers.film);
    if (profile.layers) {
      for (var flr in profile.layers) {
        if (!Object.prototype.hasOwnProperty.call(profile.layers, flr)) continue;
        var fspec = profile.layers[flr];
        if (!fspec || typeof fspec !== "object") continue;
        addFilmSpec(fspec.film);
        if (fspec.film_when) {
          for (var fw in fspec.film_when) {
            if (!Object.prototype.hasOwnProperty.call(fspec.film_when, fw)) continue;
            addFilmSpec(fspec.film_when[fw]);
          }
        }
      }
    }

    for (var fs = 0; fs < filmSpecs.length; fs++) {
    var filmSpec = filmSpecs[fs];
    if (filmSpec && CC.Frosting) {
      /* THE FROSTING NEEDS TO KNOW HOW COLD IT IS.
       *
       * Its climate figure was a single global scalar, so a cold region was
       * placed correctly by the snowline and then painted in whatever hue the
       * family rolled — structurally an ice cap, chromatically not ice. The
       * thermal field is what carries "this bearing is frozen and that one is
       * scorched", so it is resolved here and handed down.
       *
       * IT IS THE CLIMATE FIELD NOW, NOT THE ZONE FIELD. `Zones.build` returns
       * null on any world whose Tidal locking dial is at zero, so the frozen
       * and scorched colour sets existed only on locked worlds — and the
       * moment the climate system started placing polar caps on ordinary
       * planets, those caps would have come out in the temperate family's hue.
       * The same failure D35 fixed, arriving again by a different route.
       *
       * REBUILT FROM THE ARCHETYPE rather than threaded in from the details
       * stage. `Palette.build` is called from eight places and none of them
       * has the field to hand; both builds are pure, cheap and keyed to the
       * same seed, so the two constructions agree by definition. */
      /* Hoisted to the top of build() so `climateLean` can read the same
       * field. Identical construction, one copy. */
      var fclimate = thermal;

      CC.Frosting.resolve(filmSpec, out, layers, params, seed, heat, primary,
                          satScale, valScale, {
                            wrapHue: wrapHue,
                            makeLighter: makeLighter,
                            makeDarker: makeDarker,
                            makeRgba: makeRgba
                          }, fclimate,
                          /* The first spec keeps the original stream name, so
                           * every existing body's frosting colours are
                           * byte-identical to before this loop existed. */
                          fs === 0 ? "colour/film" : "colour/film/" + fs);
    }
    }

    /* WHAT THIS BODY EMITS — the colour a mirror in orbit would reflect, or
     * null for a body that shines by nothing of its own.
     *
     * PUBLISHED HERE RATHER THAN LOOKED UP BY THE RENDERER, and that is the
     * whole reason it exists. An orbital mirror's glass face is the star's own
     * light, so the primitive drawing it needs the star's colour — and the one
     * thing js/draw/ may never do is ask for a layer by role name. `emissive`
     * is already computed per layer above, so this is a property of the BODY
     * expressed in terms the renderer is allowed to hold.
     *
     * TWO TESTS, AND EACH ONE WAS MEASURED RATHER THAN REASONED:
     *
     *   VISIBLE FROM OUTSIDE. A rocky planet's molten core is `emissive` too,
     *     so the naive version reported an ordinary planet as emitting a
     *     bright orange nothing outside it could see. A cutaway shows the core
     *     to the READER; it does not show it to a mirror. So the layer has to
     *     reach the body's own surface, and a world whose only self-lit layer
     *     is buried correctly answers nothing at all.
     *   BRIGHTEST, NOT OUTERMOST. "Outermost" is the intuitive rule and it is
     *     wrong here, because on a star EVERY layer is self-lit — so it picked
     *     the corona, and on an old giant the shed envelope, both of which are
     *     faint haloes rather than the light the star radiates. Measured, the
     *     giant reported #46423a at v=0.27 against a photosphere at v=0.65.
     *     What a mirror reflects is the body's LIGHT, so the test is value.
     *
     * Both together mean this reads as "the brightest thing about this body
     * that can be seen from space", which is what the word means. */
    var emitted = null;
    for (var ei = 0; ei < body.layers.length; ei++) {
      var el_ = body.layers[ei];
      var ec = out[el_.role];
      if (!ec || !ec.emissive) continue;
      if (el_.outer < body.surface - 1e-6) continue;
      if (!emitted || ec.v > emitted.v) emitted = ec;
    }

    /* THE BODY'S DEEP INTERIOR COLOUR — the hue of the hot machinery under the
     * visible surface, published for marks that need to look like they came
     * from DOWN THERE rather than from the layer they are drawn over.
     *
     * A coronal hole's field lines are the case this exists for. They are
     * diagrammatic marks — the same register as the mantle's flow arrows —
     * and the whole point of them is that they belong to a different part of
     * the star than the corona they cross. Borrowing an interior hue says
     * that; inventing a colour would say only "this is not part of the
     * picture", which is D123's complaint about the magenta prominences.
     *
     * A CHAIN RATHER THAN A ROLE NAME, and that is the D77 lesson: `radiative`
     * exists on main-sequence and young stars and on NEITHER of the other two.
     * A dwarf is fully convective — real physics, not an omission — and an old
     * giant has an h-shell instead. Naming one role would have coloured this
     * trait correctly on half the family and left it falling back to the
     * corona's own hue on the rest, which is the silent failure where
     * everything except the render says it worked.
     *
     * The chain runs from the most specific to the most general, and the last
     * entry is the fusion core, which every star in the generator has. */
    var deep = null;
    var DEEP_ROLES = ["radiative", "h-shell", "tachocline", "convective",
                      "fusion-core", "core", "outer-core", "mantle"];
    for (var di = 0; di < DEEP_ROLES.length; di++) {
      if (out[DEEP_ROLES[di]]) { deep = out[DEEP_ROLES[di]]; break; }
    }

    return {
      layers: out,
      anchors: { primary: primary, secondary: secondary, tertiary: tertiary },
      relation: relName,
      /* The outermost self-lit layer's colour, or null. See above. */
      emitted: emitted,
      /* The hot interior's colour, for marks that must read as belonging to a
       * deeper part of the body than the layer they cross. See above. */
      deep: deep,
      /* Colour for a role, with a neutral fallback so the renderer never has
       * to check whether a layer was coloured. */
      get: function (role) {
        return out[role] || {
          h: 0, s: 0, v: 0.45, hex: "#737373", depth: 0.5, hotEdge: null,
          bandContrast: 1,
          lighter: function () { return "#9a9a9a"; },
          darker: function () { return "#3a3a3a"; },
          rgba: function (a) { return CC.Color.rgba("#737373", a); }
        };
      }
    };
  }

  return {
    build: build,
    RELATIONS: RELATIONS,
    RELATION_NAMES: RELATION_NAMES,
    mixHue: mixHue,
    wrapHue: wrapHue
  };
})();
