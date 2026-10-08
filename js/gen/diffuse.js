/* The diffuse family's generation pieces — placement for a body made of gas.
 *
 * Every other builder places marks in a layer's BAND, the annulus between its
 * own boundary and the next one down, because every other layer is a shell.
 * A nebula's regions are not shells: they overlap, they drift off-centre, and
 * each one fills its whole outline. Placed in the annulus, the dense region's
 * billows came out as a ring round an empty middle wherever the core had
 * drifted away — a donut, which is the one shape a cloud never is.
 *
 * So these builders place across the WHOLE REGION, from the centre to the
 * outer edge, and they place by DENSITY rather than uniformly: one noise field
 * per body says where the gas is thick and where it is thin, and every region
 * reads it. Puffs heap where the field is high, knots sit in its peaks, and the
 * gaps between are genuinely empty — structure the eye can rest on, instead of
 * an even static of soft dots (the clumping in gen/elemgen.js varies alpha
 * only, and on soft marks that is not enough).
 *
 * The field is the background nebula's construction (draw/canvas.js, D94-D107)
 * moved into body space: smooth octaves for the mass and one ridged octave
 * for the filaments. Keyed by the body's seed alone, so the regions agree
 * about where the thick gas is.
 *
 * Registered into gen/elemgen.js's dispatch by kind; names no archetype.
 *
 * RECIPE FIELDS read here, beyond the registry's:
 *
 *   follow   how strongly placement follows the density field: 0 is uniform,
 *            1 is proportional, more is clumpier. Negative seeks the THIN gas
 *   reach    [lo, hi] — the radial span of the region used, 0 the centre and
 *            1 the outer edge. Replaces `depth`, which is a band's measure
 *   lattice  for `cloud-field`, how many cells across the region's diameter
 *   band     true — place in the layer's own annulus, not its whole disc.
 *            A SHELL is the one region that is empty in the middle: a
 *            planetary nebula's ring, a supernova remnant's shock shell
 *   centre   true — a lit edge faces the body's centre rather than its one
 *            light bearing: a shell is lit by the dead star inside it
 *   dial     `{ param, count, alpha, size, emit, absorb, side }` — curves
 *            (CC.Math.curve) over one named parameter. `count`, `alpha` and
 *            `size` multiply; on a `cloud-field`, `emit` is how much light the
 *            gas gives off (screened), `absorb` how much it blocks (painted
 *            dark over what is behind), and `side` how strongly one flank is
 *            lit from the body's light bearing. The nebula's Luminosity source
 *            is the first user: dark gas absorbs and is silhouetted, a
 *            reflection nebula is lit from one side, an emission nebula glows.
 *
 * Load order: after gen/elemgen.js. */

var CC = CC || {};

CC.Diffuse = (function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp, lerp = M.lerp;
  var TAU = Math.PI * 2;

  /* ---- the density field ---------------------------------------------- */

  var cache = { key: null, fn: null };

  /* Density 0..1 at a body-space point. A function of the seed only, so it
   * is the same field for every region of the body and at every resolution. */
  function field(seed) {
    var key = String(seed);
    if (cache.key === key) return cache.fn;
    var n1 = CC.RNG.makeNoise2D(CC.RNG.hashString(key + " nebula-mass"));
    var n2 = CC.RNG.makeNoise2D(CC.RNG.hashString(key + " nebula-ridge"));
    var fn = function (x, y) {
      /* Two smooth octaves for the mass, one ridged for the filaments — the
       * background's recipe, at a frequency of a few features per radius. */
      var base = n1.fbm(x * 1.6 + 7.1, y * 1.6 - 3.3, 3);
      var ridge = 1 - Math.abs(n2.fbm(x * 3.4 - 11.7, y * 3.4 + 5.9, 2) * 2 - 1);
      var m = clamp((base - 0.30) / 0.42, 0, 1);
      var v = m * m * (3 - 2 * m) * 0.72 + Math.pow(ridge, 4) * 0.45;
      return clamp(v, 0, 1);
    };
    cache.key = key;
    cache.fn = fn;
    return fn;
  }

  /* Where a point in a layer lands in the body, for the field: the layer's
   * own drift moves its frame (draw/feather.js), so the field is read where
   * the mark will actually be drawn. */
  function fieldAt(f, layer, r, a) {
    var d = layer.drift;
    return f(Math.sin(a) * r + (d ? d.x : 0), -Math.cos(a) * r + (d ? d.y : 0));
  }

  /* The body's light bearing — one per body, so every lit flank and rim
   * agrees (draw/primitives/diffuse.js `lightFace`). */
  function lightOf(opts) {
    return CC.RNG.stream(opts && opts.seed !== undefined ? opts.seed : "nebula",
                         "diffuse/light")() * TAU;
  }

  /* A recipe's `dial`, read at the current parameter. Every field defaults to
   * 1 (or absent), so a recipe without a dial is untouched. */
  function dialAt(recipe, opts) {
    var d = recipe.dial;
    if (!d) return null;
    var p = opts && opts.params ? opts.params[d.param] : undefined;
    var x = clamp(p === undefined ? 0.5 : p, 0, 1);
    var out = { x: x };
    ["count", "alpha", "size", "emit", "absorb", "side"].forEach(function (k) {
      if (d[k] !== undefined) out[k] = M.curve(d[k], x);
    });
    return out;
  }

  /* ---- placement ------------------------------------------------------ */

  /* A uniform-by-area point in the region's reach. */
  function samplePoint(layer, reach, rng, band) {
    var lo = reach ? reach[0] : 0, hi = reach ? reach[1] : 1;
    if (band) lo = Math.max(lo, layer.inner / Math.max(1e-6, layer.outer));
    var u = lerp(lo * lo, hi * hi, rng());
    return { r: Math.sqrt(u) * layer.outer, a: rng() * TAU };
  }

  /* Scatter `plan` across the region, weighted by the field.
   *
   * Weighted reservoir sampling: three candidates per survivor, each keyed
   * u^(1/w), the top keys kept. The count is exactly the plan's, so Detail
   * density keeps its meaning; only WHERE the marks go changes. */
  function regionScatter(kind, recipe, layer, plan, rng, opts) {
    var f = field(opts && opts.seed !== undefined ? opts.seed : "nebula");
    var follow = recipe.follow === undefined ? 1 : recipe.follow;
    var aLo = recipe.alpha ? recipe.alpha[0] : 0.15;
    var aHi = recipe.alpha ? recipe.alpha[1] : 0.35;
    var sz = recipe.size || [0.02, 0.05];
    var light = lightOf(opts);
    var dl = dialAt(recipe, opts);
    var kAlpha = dl && dl.alpha !== undefined ? dl.alpha : 1;
    var kSize = dl && dl.size !== undefined ? dl.size : 1;
    var out = [];

    for (var p = 0; p < plan.length; p++) {
      var tier = plan[p];
      /* The dial thins or swells the count AFTER Detail density has set it,
       * so density keeps its meaning. A curve reaching zero removes the
       * kind outright: an emission nebula's protostars do not exist in a
       * dark one. The candidates are still rolled from the full count, so
       * dragging the dial never reshuffles the survivors' positions. */
      var want = dl && dl.count !== undefined
        ? Math.max(0, Math.round(tier.count * dl.count)) : tier.count;
      if (tier.count <= 0) continue;
      var cands = [];
      for (var c = 0; c < tier.count * 3; c++) {
        var pt = samplePoint(layer, recipe.reach, rng, recipe.band);
        var d = fieldAt(f, layer, pt.r, pt.a);
        var w = follow >= 0 ? Math.pow(0.04 + d, follow)
                            : Math.pow(1.04 - d, -follow);
        cands.push({ pt: pt, d: d, key: Math.pow(rng(), 1 / Math.max(1e-4, w)) });
      }
      cands.sort(function (x, y) { return y.key - x.key; });
      var rolls = [];
      for (var i = 0; i < tier.count; i++) {
        rolls.push([rng(), rng(), rng()]);
      }
      for (i = 0; i < Math.min(want, tier.count); i++) {
        var cd = cands[i];
        var el = {
          kind: kind,
          tier: tier.tier,
          angle: cd.pt.a,
          radius: cd.pt.r,
          depth: cd.pt.r / Math.max(1e-6, layer.outer),
          size: lerp(sz[0], sz[1], rolls[i][0]) * tier.size * kSize,
          alpha: lerp(aLo, aHi, rolls[i][1]) * tier.alpha * kAlpha,
          tone: recipe.tone || "shift",
          seed: rolls[i][2],
          /* The gas density where it sits, for marks that want it. */
          dense: cd.d
        };
        /* Without a bearing the primitive faces the body's centre. */
        if (!recipe.centre) el.light = light;
        if (recipe.blend) el.blend = recipe.blend;
        /* Thousands of motes: fill them in small paths (draw/details.js). */
        if (recipe.chunk) el.chunk = recipe.chunk;
        /* How strong a point of light's spikes are (draw/primitives/diffuse.js). */
        if (recipe.spikes !== undefined) el.spikes = recipe.spikes;
        out.push(el);
      }
    }
    return out;
  }

  /* ---- the cloud field ------------------------------------------------ */

  /* ONE element carrying a lattice of soft cells that covers the region,
   * each with the field's density where it sits. The region's body: its
   * thick and thin gas, its bright banks and its voids. Laid out in body
   * space at a fixed lattice, so it is the same picture at every resolution.
   *
   * A jittered square lattice clipped to the region's disc, rather than
   * polar rings, so the cells are the same size everywhere and nothing
   * gathers at the middle. */
  function buildCloudField(recipe, layer, plan, count, rng, opts) {
    var f = field(opts && opts.seed !== undefined ? opts.seed : "nebula");
    var R = layer.outer;
    var n = recipe.lattice || 22;
    var step = 2 * R / n;
    var cells = [];
    for (var j = 0; j < n; j++) {
      for (var i = 0; i < n; i++) {
        var x = -R + (i + 0.5 + (rng() - 0.5) * 0.9) * step;
        var y = -R + (j + 0.5 + (rng() - 0.5) * 0.9) * step;
        var r = Math.sqrt(x * x + y * y);
        var s = rng();
        if (r > R) continue;
        if (recipe.band && r < layer.inner) continue;
        var a = Math.atan2(x, -y);
        var d = fieldAt(f, layer, r, a);
        /* Thin gas is not drawn at all: the voids are the point. */
        if (d < 0.08) continue;
        cells.push({ r: r, a: a, d: d, s: s });
      }
    }
    var dl = dialAt(recipe, opts);
    return [{
      kind: "cloud-field",
      /* Absent without a dial, and the primitive then draws the old single
       * screened pass. */
      emit: dl ? dl.emit : undefined,
      absorb: dl ? dl.absorb : undefined,
      side: dl ? dl.side : undefined,
      light: lightOf(opts),
      tier: 0,
      angle: 0,
      radius: 0,
      size: step * (recipe.spread || 1.35),
      alpha: lerp(recipe.alpha[0], recipe.alpha[1], rng()),
      tone: recipe.tone || "shift",
      blend: recipe.blend,
      seed: rng(),
      /* The region's own outer radius, so the field fades out toward it. */
      reachR: R,
      /* A shell's field fades in from its inner edge as well as out at its
       * outer one, so the cavity has no rim drawn round it. */
      reachIn: recipe.band ? layer.inner : 0,
      fade: recipe.fade,
      cells: cells
    }];
  }

  CC.ElemGen.registerBuilder("cloud-field", buildCloudField);

  /* Every soft mark is placed by density across the whole region. `mote` is
   * placed the same way and emitted as `speckle`, so thousands of them still
   * draw as a handful of batched fills (draw/details.js). */
  var KINDS = ["puff", "billow", "filament", "lane", "knot", "rim", "protostar", "mote"];
  KINDS.forEach(function (k) {
    CC.ElemGen.registerBuilder(k, function (recipe, layer, plan, count, rng, opts) {
      return regionScatter(k === "mote" ? "speckle" : k, recipe, layer, plan, rng, opts);
    });
  });

  return { field: field };
})();
