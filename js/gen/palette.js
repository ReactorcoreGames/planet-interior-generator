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
 * the structure and vice versa.
 *
 * `build` keeps the order of the passes and nothing else: each is a stage
 * function sharing one state object. The helpers are in gen/palette-util.js,
 * the per-layer derivation in gen/palette-layer.js, palette-hue.js and
 * palette-value.js, and the separation guarantees and the colours the whole
 * body publishes in gen/palette-bands.js. All attach here. */

var CC = CC || {};

CC.Palette = (function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp;

  /* ---- the light and the heat ------------------------------------------- */

  function readLight(st) {
    var body = st.body, params = st.params, seed = st.seed;

    var satScale = params.saturation === undefined ? 1 : params.saturation;
    var valScale = params.brightness === undefined ? 1 : params.brightness;
    var contrast = params.contrast === undefined ? 1 : params.contrast;
    var heat = params.interiorHeat === undefined ? 0.5 : params.interiorHeat;

    /* THE STAR'S LIGHT, read from the same table gen/climate-baseline.js builds the
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
     * The frosting stage (`resolveFrostings`) already rebuilt it from
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

    st.satScale = satScale;
    st.valScale = valScale;
    st.contrast = contrast;
    st.heat = heat;
    st.star = star;
    st.starHue = starHue;
    st.starlight = starlight;
    st.thermal = thermal;
    st.chillMean = chillMean;
    st.scorchMean = scorchMean;
    st.starCast = starCast;
    st.starHarsh = starHarsh;
  }

  /* --- anchors --- */

  function rollAnchors(st) {
    var profile = st.profile, params = st.params, rng = st.rng;
    var wrapHue = CC.Palette.wrapHue, mixHue = CC.Palette.mixHue;
    var RELATIONS = CC.Palette.RELATIONS, RELATION_NAMES = CC.Palette.RELATION_NAMES;

    /* Primary hue: the user's slider if they've touched it, otherwise rolled
     * within whatever range the archetype allows. */
    var hueRange = profile.hue || [0, 360];
    var primary = (params.primaryHue === undefined || params.primaryHue === null)
      ? wrapHue(CC.Accent.rollHue(hueRange, rng))   /* families allowed: gen/accent.js */
      : wrapHue(params.primaryHue);

    var relName = params.hueRelationship && params.hueRelationship !== "auto"
      ? params.hueRelationship
      : (profile.secondaryRel || M.pick(rng, RELATION_NAMES));
    var relation = RELATIONS[relName] || RELATIONS.complement;

    var secondary = wrapHue(relation(primary, rng) + (params.secondaryOffset || 0));

    /* Tertiary: the atmosphere. Derived — a hue between the two anchors,
     * nudged, which keeps a haze looking like it belongs to the world it sits
     * on — and the Tertiary hue offset turns it from there (D318). An offset
     * rather than a hue so the draw always happens and 0 changes nothing. */
    var tertiary = wrapHue(mixHue(primary, secondary, 0.25) + (rng() * 24 - 12) +
                           (params.tertiaryOffset || 0));

    st.primary = primary;
    st.secondary = secondary;
    st.tertiary = tertiary;
    st.relName = relName;
  }

  /* ---- the frostings ---------------------------------------------------- */

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
  function resolveFrostings(st) {
    var profile = st.profile, out = st.out, layers = st.layers;
    var params = st.params, seed = st.seed, heat = st.heat, primary = st.primary;
    var satScale = st.satScale, valScale = st.valScale, thermal = st.thermal;
    var wrapHue = CC.Palette.wrapHue, makeLighter = CC.Palette.makeLighter;
    var makeDarker = CC.Palette.makeDarker, makeRgba = CC.Palette.makeRgba;

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
      /* Hoisted to `readLight` so `climateLean` can read the same
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
  }

  /* ---- the result ------------------------------------------------------- */

  function result(st) {
    var out = st.out;
    var primary = st.primary, secondary = st.secondary, tertiary = st.tertiary;
    var relName = st.relName, accent = st.accent;
    var emitted = st.emitted, deep = st.deep;

    return {
      layers: out,
      anchors: { primary: primary, secondary: secondary, tertiary: tertiary },
      relation: relName,
      /* Lights and active systems, or null (js/gen/accent.js). */
      accent: accent,
      /* The outermost self-lit layer's colour, or null. See `findEmitted`. */
      emitted: emitted,
      /* The hot interior's colour, for marks that must read as belonging to a
       * deeper part of the body than the layer they cross. See `findDeep`. */
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

  /* Build the palette.
   *
   * `body` is the structure stage's output; `profile` the archetype's
   * colorProfile; `params` the user's colour controls. Returns a map of
   * role -> { h, s, v, hex, ... } plus the anchors, so later stages can derive
   * detail colours that stay in family. */
  function build(body, profile, params, seed) {
    var st = {
      body: body,
      profile: profile,
      params: params,
      seed: seed,
      rng: CC.RNG.stream(seed, "colour"),
      layers: body.layers,
      out: {},
      order: [],
      accent: null,
      emitted: null,
      deep: null
    };

    readLight(st);
    rollAnchors(st);
    CC.Palette.colourLayers(st);
    CC.Palette.separateAdjacent(st);
    CC.Palette.separateExoticSea(st);

    /* The accent hue, against the settled hull colour (js/gen/accent.js). */
    st.accent = CC.Accent ? CC.Accent.build(profile, st.out, st.order, seed, params.accentOffset) : null;

    resolveFrostings(st);
    CC.Palette.findEmitted(st);
    CC.Palette.findDeep(st);
    CC.Palette.orbitalColour(st);
    return result(st);
  }

  return {
    build: build
  };
})();
