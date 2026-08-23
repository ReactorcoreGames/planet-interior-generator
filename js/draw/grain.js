/* The frosting's surface grain — a monochrome gaussian tooth.
 *
 * Split out of draw/film.js, which owns the deposit's GEOMETRY and its four
 * zones. This file owns one thing: the noise tile that is laid over the band
 * once the zones have been painted, so the deposit reads as a material with a
 * surface rather than as flat colour.
 *
 * It is the only pixel-level texture in the project, and deliberately so. See
 * `buildGrain` for why grain is a repeating tile here when every other texture
 * in the renderer is drawn as elements.
 *
 * Loaded before draw/film.js.
 */

var CC = CC || {};

CC.Grain = (function () {
  "use strict";

  var TAU = Math.PI * 2;

  /* HOW STRONG THE GRAIN IS, as a peak lightness swing either side of the
   * frosting's own colour. The user asked for 50% monochrome gaussian noise;
   * at literally 50% the band stops reading as a material and starts reading
   * as television static, so this is the nearest reading that keeps it a
   * surface — a clearly visible tooth, well short of obliterating the four
   * zones the band exists to show.
   *
   * IT HAS TO RISE AS THE SPECKS GET SMALLER. The pattern is interpolated when
   * the view magnifies it, and interpolation averages neighbours — so halving
   * the speck size costs contrast even though the same noise is present.
   * Measured: at one texel per speck the field came out at stdev 6.7 against
   * 9.7 for two-texel specks at the same alpha. This buys that back, so
   * "finer" does not silently also mean "fainter". */
  var GRAIN_ALPHA = 0.30;

  /* Edge of the square noise tile, in specks.
   *
   * The tile is generated in BODY space and then scaled by the view when it is
   * laid down, so this is a count of specks around a patch of ground rather
   * than a pixel size — raising it makes the grain finer, not the patch
   * bigger.
   *
   * Large enough that the repeat is not legible: gaussian noise has no
   * structure for the eye to lock onto, and at this count one period is a
   * small fraction of the band's arc.
   *
   * The DENSITY the user settled on is 512 specks across this patch of
   * ground. That is `GRAIN_TILE * GRAIN_SCALE`, not this number alone — the
   * count here is halved because each speck is now drawn as a solid 2px block
   * (see `GRAIN_SCALE`), which leaves the grain exactly as fine as before
   * while giving each speck a hard core for the interpolator to work from. */
  var GRAIN_TILE = 32;

  /* How many tile pixels one noise speck is drawn across.
   *
   * TWO, AND THIS IS THE BLUR CONTROL.
   *
   * The pattern is magnified by the view transform, and canvas interpolates
   * when it magnifies. At one texel per speck there is no interior to a speck
   * at all — every pixel of it is a boundary with its neighbours — so the
   * interpolator has nothing to preserve and the whole field washes into haze.
   * Turning smoothing off entirely fixes that but replaces grain with hard
   * aliased squares, which is the opposite failure.
   *
   * Giving each speck a solid 2px core leaves the interpolation to act on the
   * speck's EDGES rather than on its whole area: the centre survives at full
   * strength and only the shoulders soften. That is a moderate blur rather
   * than none or all of it, and it is a property of the tile, so it holds at
   * every zoom instead of depending on a smoothing hint the host may ignore.
   *
   * `GRAIN_TILE` is halved to match, so the grain's density on the ground is
   * unchanged — this trades tile resolution for speck solidity, not fineness. */
  var GRAIN_SCALE = 1;

  /* The tile itself, cached. Rebuilt only when the host canvas changes its
   * document, which in practice means once per page. It carries no seed: this
   * is surface tooth, not a generated feature, so it must not consume an RNG
   * stream nor shift when a body is re-rolled. */
  var grainPattern = null;

  /* A GAUSSIAN SAMPLE, by the Box-Muller transform.
   *
   * Genuinely gaussian rather than uniform, because that is what makes the
   * result read as film grain: most pixels sit near the mean and the rare
   * bright and dark ones are what the eye picks up as texture. A uniform
   * distribution over the same range looks like noise rather than like a
   * surface. Clamped at three sigma so an outlier cannot blow out to white. */
  function gauss(rnd) {
    var u = 1 - rnd(), v = rnd();
    var g = Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
    return g < -3 ? -3 : (g > 3 ? 3 : g);
  }

  /* Build the monochrome grain tile once.
   *
   * MONOCHROME AND SIGNED. Every pixel is the same grey with a varying ALPHA,
   * half of them lightening and half darkening, so the grain modulates
   * whatever colour it is laid over instead of tinting it toward one end. Two
   * patterns rather than one, drawn in sequence: canvas has no signed
   * composite that a single tile could carry.
   *
   * Falls back to null on any canvas that cannot make an offscreen surface —
   * the stub harness, chiefly — and the grain pass then simply does nothing,
   * which keeps the band correct everywhere it is not drawable. */
  function buildGrain(ctx) {
    if (grainPattern !== null) return grainPattern;
    grainPattern = false;

    /* The offscreen surface, obtained by whichever route this canvas offers.
     *
     * A browser canvas has an `ownerDocument` to create a sibling from; the
     * test rasterizer has none but exposes a global `OffscreenCanvas`-alike
     * constructor. Trying both means the grain is real in the app AND
     * inspectable offline, rather than being a feature only the user's screen
     * can ever confirm. */
    /* The tile is GRAIN_TILE specks across, each GRAIN_SCALE pixels wide. */
    var PX = GRAIN_TILE * GRAIN_SCALE;

    var tile = null;
    var doc = ctx.canvas && ctx.canvas.ownerDocument;
    if (CC.Grain.makeCanvas) {
      /* A test harness may supply its own factory — the offline rasterizer has
       * neither an ownerDocument nor OffscreenCanvas, and without this hook the
       * grain would be a feature that only the user's screen could ever
       * confirm. Never set by the app itself. */
      tile = CC.Grain.makeCanvas(PX, PX);
    } else if (doc && doc.createElement) {
      tile = doc.createElement("canvas");
    } else if (typeof OffscreenCanvas === "function") {
      tile = new OffscreenCanvas(PX, PX);
    }
    if (!tile || !tile.getContext) return grainPattern;

    tile.width = PX;
    tile.height = PX;
    var tctx = tile.getContext("2d");
    if (!tctx || !tctx.createImageData) return grainPattern;

    var img = tctx.createImageData(PX, PX);
    var data = img.data;

    /* A fixed sequence, not CC.RNG: the tile is the same on every body and on
     * every render, so it needs no seed and must not disturb one. */
    var state = 0x9e3779b9;
    function rnd() {
      state ^= state << 13; state >>>= 0;
      state ^= state >> 17;
      state ^= state << 5;  state >>>= 0;
      return state / 4294967296;
    }

    /* ONE SAMPLE PER SPECK, written across the whole GRAIN_SCALE block.
     *
     * Rolled per speck rather than per pixel and then filled outward, which is
     * what makes the block solid. Scaling a small tile up at draw time would
     * do the same job only if smoothing were off everywhere it is drawn, and
     * that is a canvas-state assumption this file cannot make for its caller;
     * writing the blocks here is unconditional. */
    for (var gy = 0; gy < GRAIN_TILE; gy++) {
      for (var gx = 0; gx < GRAIN_TILE; gx++) {
        var g = gauss(rnd) / 3;            /* -1 .. 1, bunched near zero */
        /* Positive samples lighten, negative darken. The magnitude becomes
         * alpha, so a sample near the mean is nearly invisible and the tails
         * are what shows — which is the whole character of grain. */
        var lit = g > 0;
        var lvl = lit ? 255 : 0;
        var alpha = Math.round((lit ? g : -g) * 255);

        for (var py = 0; py < GRAIN_SCALE; py++) {
          var row = ((gy * GRAIN_SCALE + py) * PX + gx * GRAIN_SCALE) * 4;
          for (var px = 0; px < GRAIN_SCALE; px++) {
            var o = row + px * 4;
            data[o] = data[o + 1] = data[o + 2] = lvl;
            data[o + 3] = alpha;
          }
        }
      }
    }
    tctx.putImageData(img, 0, 0);

    var pat = ctx.createPattern ? ctx.createPattern(tile, "repeat") : null;
    grainPattern = pat || false;
    return grainPattern;
  }

  return {
    /* The peak lightness swing the band's grain is drawn at. Read by
     * draw/film.js, which multiplies it by the element-opacity control. */
    ALPHA: GRAIN_ALPHA,
    /* The tile's edge in its own pixels, so the caller can pad a fill by a
     * whole tile without knowing how the tile is built. */
    TILE_PX: GRAIN_TILE * GRAIN_SCALE,
    build: buildGrain,
    /* Set by a test harness only, to supply an offscreen canvas on a platform
     * that offers no other route to one. See `buildGrain`. */
    makeCanvas: null
  };
})();
