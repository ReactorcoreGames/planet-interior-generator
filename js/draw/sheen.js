/* Sheen — the band shading of machined metal.
 *
 * Every other band is shaded as a material in depth: darker at the inner
 * edge, the ordinary step lighter at the outer (draw/scene.js bandFill). That
 * reads as rock, ice, gas. Metal reads as metal because of how it holds the
 * light instead: a hard specular band across its face, a dark fall either
 * side of it and a thin bright rim at the edge — the shading every polished
 * bar and pipe in an illustration carries, and the single strongest cue that
 * separates "metallic" from "grey".
 *
 * A layer asks for it with `sheen: k` on its colour entry (0..1, how hard
 * the highlight is); the palette publishes it, and bandFill hands its
 * gradient here. Pure colour stops on a gradient the caller built, so the
 * band's geometry, warp and clip are all exactly as before. */

var CC = CC || {};

CC.Sheen = (function () {
  "use strict";

  /* `g` runs from the band's inner edge (0) to its outer edge (1). */
  function stops(g, colour) {
    var k = Math.max(0, Math.min(1, colour.sheen));
    g.addColorStop(0.00, colour.darker(0.40));
    g.addColorStop(0.14, colour.darker(0.20));
    g.addColorStop(0.36, colour.hex);
    g.addColorStop(0.50, colour.lighter(0.34 * k));
    g.addColorStop(0.57, colour.lighter(0.14 * k));
    g.addColorStop(0.76, colour.darker(0.16 * k));
    g.addColorStop(0.92, colour.lighter(0.24 * k));
    g.addColorStop(1.00, colour.darker(0.10));
    return g;
  }

  return { stops: stops };
})();
