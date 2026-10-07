/* The cut face of a rock — two monochrome noise tiles laid inside each mosaic
 * fragment (ASTEROID-OVERHAUL §2).
 *
 * The fragments used to be shaded with a gradient and a sheen, and the review
 * called them "too shiny". Both of those are continuous fields across a cell,
 * and a surface described only by continuous fields is a POLISHED surface.
 * Worse, they claimed a light source that a cutaway does not have: this is a
 * cut face, and nothing in a cross-section is catching the sun.
 *
 * So the fragments are flat, and what makes them stone is texture, in the two
 * registers the review asked for ("monochrome gaussian, 30%, maybe mixed with
 * perlin"):
 *
 *   grain   per-speck gaussian noise — the fine tooth of a sawn surface
 *   mottle  coherent fBm — patches you can see, which is the difference
 *           between "grainy" and "rocky", and what keeps a large slab at high
 *           Cohesion reading as stone rather than as a flat polygon
 *
 * Both are MONOCHROME AND SIGNED, as draw/grain.js does it: every texel is
 * black or white with the signal in its alpha, so the tile modulates whatever
 * colour it lands on instead of tinting it.
 *
 * Built once per page, unseeded — this is surface tooth, not a generated
 * feature. Returns null on a canvas that cannot make an offscreen surface (the
 * stub harness), and the caller then simply draws flat fragments. */

var CC = CC || {};

CC.RockTexture = (function () {
  "use strict";

  var TAU = Math.PI * 2;

  /* Edge of each tile in texels. Large enough that the repeat is invisible
   * inside one fragment. */
  var TILE = 128;

  /* Lattice cells across the tile for the mottle's coarsest octave. */
  var MOTTLE_CELLS = 5;

  var cache = null;

  function makeCanvas(ctx, w, h) {
    if (CC.Grain && CC.Grain.makeCanvas) return CC.Grain.makeCanvas(w, h);
    var doc = ctx.canvas && ctx.canvas.ownerDocument;
    if (doc && doc.createElement) {
      var c = doc.createElement("canvas");
      c.width = w; c.height = h;
      return c;
    }
    if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(w, h);
    return null;
  }

  /* A fixed xorshift sequence — not CC.RNG, so no body's stream is touched. */
  function seq(state) {
    return function () {
      state ^= state << 13; state >>>= 0;
      state ^= state >> 17;
      state ^= state << 5;  state >>>= 0;
      return state / 4294967296;
    };
  }

  function gauss(rnd) {
    var u = 1 - rnd(), v = rnd();
    var g = Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
    return g < -3 ? -3 : (g > 3 ? 3 : g);
  }

  /* One signed tile from a sampler returning -1..1 per texel. */
  function tile(ctx, sample) {
    var cv = makeCanvas(ctx, TILE, TILE);
    if (!cv || !cv.getContext) return null;
    cv.width = TILE; cv.height = TILE;
    var tctx = cv.getContext("2d");
    if (!tctx || !tctx.createImageData) return null;
    var img = tctx.createImageData(TILE, TILE);
    var d = img.data;
    for (var y = 0; y < TILE; y++) {
      for (var x = 0; x < TILE; x++) {
        var v = sample(x, y);
        var o = (y * TILE + x) * 4;
        d[o] = d[o + 1] = d[o + 2] = v > 0 ? 255 : 0;
        d[o + 3] = Math.round(Math.min(1, Math.abs(v)) * 255);
      }
    }
    tctx.putImageData(img, 0, 0);
    return ctx.createPattern ? ctx.createPattern(cv, "repeat") : null;
  }

  function build(ctx) {
    if (cache !== null) return cache || null;
    cache = false;

    var rnd = seq(0x5bd1e995);
    var grain = tile(ctx, function () { return gauss(rnd) / 3; });

    /* The mottle tiles seamlessly because it is VALUE NOISE ON A WRAPPED
     * LATTICE: each octave is a GxG grid of random values whose indices wrap,
     * smoothly interpolated, so the right edge meets the left by
     * construction. Three octaves, coarse to fine. */
    var vr = seq(0x2545f491);
    var octs = [];
    for (var G = MOTTLE_CELLS; G <= MOTTLE_CELLS * 4; G *= 2) {
      var grid = [];
      for (var gi = 0; gi < G * G; gi++) grid.push(vr() * 2 - 1);
      octs.push({ G: G, grid: grid, amp: MOTTLE_CELLS / G });
    }
    function smooth(t) { return t * t * (3 - 2 * t); }
    var mottle = tile(ctx, function (x, y) {
      var sum = 0, norm = 0;
      for (var o = 0; o < octs.length; o++) {
        var oc = octs[o], G2 = oc.G;
        var u = (x / TILE) * G2, v = (y / TILE) * G2;
        var x0 = Math.floor(u), y0 = Math.floor(v);
        var fx = smooth(u - x0), fy = smooth(v - y0);
        var x1 = (x0 + 1) % G2, y1 = (y0 + 1) % G2;
        x0 %= G2; y0 %= G2;
        var gr = oc.grid;
        var top = gr[y0 * G2 + x0] + (gr[y0 * G2 + x1] - gr[y0 * G2 + x0]) * fx;
        var bot = gr[y1 * G2 + x0] + (gr[y1 * G2 + x1] - gr[y1 * G2 + x0]) * fx;
        sum += (top + (bot - top) * fy) * oc.amp;
        norm += oc.amp;
      }
      /* Stretched: summed octaves bunch near zero, and the mottle should
       * reach both a dark and a pale patch inside one fragment. */
      return (sum / norm) * 1.8;
    });

    if (!grain || !mottle) return null;
    cache = { grain: grain, mottle: mottle };
    return cache;
  }

  /* Lay both registers into the CURRENT CLIP — one fragment.
   *
   * `box` is the fragment's centre and radius in pixels; `h` a 0..1 hash so
   * each fragment shows a different part of the tile and neighbours do not
   * read as one continuous painted surface. `scale` is pixels per texel: tied
   * to the body's size, so the texture is a property of the rock and the same
   * at every resolution. */
  function lay(ctx, tex, box, h, scale, grainAlpha, mottleAlpha) {
    var r = box.r + 2;
    var ox = h * 9173.1 % TILE, oy = h * 3517.7 % TILE;
    var layers = [[tex.mottle, mottleAlpha, 1.5], [tex.grain, grainAlpha, 1]];
    for (var i = 0; i < layers.length; i++) {
      if (layers[i][1] <= 0.003) continue;
      var k = scale * layers[i][2];
      ctx.save();
      ctx.globalAlpha *= layers[i][1];
      ctx.translate(box.x, box.y);
      ctx.scale(k, k);
      ctx.translate(-ox, -oy);
      ctx.fillStyle = layers[i][0];
      ctx.fillRect(ox - r / k, oy - r / k, (2 * r) / k, (2 * r) / k);
      ctx.restore();
    }
  }

  return { build: build, lay: lay, TILE: TILE };
})();
