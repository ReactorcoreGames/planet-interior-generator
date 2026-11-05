/* The colour stage's helpers: hue relations and hue arithmetic, the factories for
 * a band's relatives, and a layer's hot edge.
 *
 * Split out of gen/palette.js, which passed the 500-line rule. Attached to
 * CC.Palette; gen/palette.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp, lerp = CC.Math.lerp;

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

  CC.Palette.RELATIONS = RELATIONS;
  CC.Palette.RELATION_NAMES = RELATION_NAMES;
  CC.Palette.wrapHue = wrapHue;
  CC.Palette.mixHue = mixHue;
  CC.Palette.makeLighter = makeLighter;
  CC.Palette.makeDarker = makeDarker;
  CC.Palette.makeRgba = makeRgba;
  CC.Palette.makeHotEdge = makeHotEdge;
  CC.Palette.emissiveSpec = emissiveSpec;
  /* The colour factories, for gen/accent.js to re-tint a layer. */
  CC.Palette.factories = { lighter: makeLighter, darker: makeDarker, rgba: makeRgba };
})();
