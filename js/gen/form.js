/* The body's FORM — the shape the whole body is warped into before any of its
 * boundaries wobble.
 *
 * ---- WHY THIS EXISTS (ASTEROID-OVERHAUL §1) ------------------------------
 *
 * Every boundary in the project is a radius function of a bearing about one
 * fixed centre: `1 + noise(angle) * amp`. That can be lumpy, faceted, or have
 * a dozen lobes, and it is still a circle with things done to its edge.
 * Session T turned all three of those knobs on the asteroid — amplitude,
 * faceting, frequency — and measured the silhouette swinging 12% of the
 * radius while it "looked round anyway".
 *
 * The missing statements are the LOW-ORDER ones, which noise around a circle
 * cannot make:
 *
 *   elongation  a fragment is not equant; it is longer one way than the other
 *   taper       it is fat at one end and narrow at the other
 *   lobe        a waist or a kink — contact binaries and kidney shapes
 *   offset      its mass is not centred on the point the cutaway radiates
 *               from, so the shell is thicker on one side and the fragments
 *               are larger towards the far end
 *
 * ---- HOW IT IS APPLIED ----------------------------------------------------
 *
 * As a per-bearing RADIAL MULTIPLIER on the whole body, applied inside
 * `view.at` (draw/canvas.js). Every boundary, every mosaic site and every
 * element already reaches pixels through `view.at`, so all of them ride the
 * form together and nothing can slide off anything else — the D180 failure
 * (two boundaries shaped independently, crossing) cannot recur on this axis
 * because there is only one form and everything wears it.
 *
 * The form is a shape about its OWN centre, displaced by `offset`, then
 * re-expressed as a radius about the frame centre. That is a single-valued
 * function of bearing as long as the frame centre stays inside the shape,
 * which the ranges below guarantee by a wide margin.
 *
 * Declared on the archetype as `form: { elongation, taper, offset }`, each a
 * [lo, hi] range. Absent everywhere but the asteroid, and an absent form is
 * the identity: no existing body changes. */

var CC = CC || {};

CC.Form = (function () {
  "use strict";

  var TAU = Math.PI * 2;

  /* How many bearings the lookup table carries. Fixed rather than derived from
   * pixel size, so the form is the same shape at every resolution. */
  var BINS = 720;

  /* Roll one body's form from the archetype's declaration.
   *
   * `irregularity` is Boundary irregularity, the user's global "how ragged is
   * everything" control. It scales how FAR from round the form goes, so at 0
   * an asteroid is round again and the control keeps meaning what it says. */
  function roll(spec, irregularity, seed) {
    if (!spec) return null;
    var rng = CC.RNG.stream(seed, "form");
    var k = Math.max(0, Math.min(1.5, irregularity === undefined ? 1 : irregularity));
    function pick(range) {
      if (!range) return 0;
      return range[0] + (range[1] - range[0]) * rng();
    }
    var form = {
      aspect: 1 + (pick(spec.elongation) - 1) * k,
      axis: rng() * TAU,
      taper: pick(spec.taper) * k,
      offset: pick(spec.offset) * k,
      offsetAngle: rng() * TAU,
      /* A 2- or 3-lobe harmonic — the waist of a contact binary, the kink of
       * a kidney. What turns an egg into a blob. */
      lobe: pick(spec.lobe) * k,
      lobeN: rng() < 0.55 ? 2 : 3,
      lobePhase: rng() * TAU
    };
    if (form.aspect <= 1.001 && form.taper < 0.001 && form.offset < 0.001 &&
        !form.lobe) return null;
    return form;
  }

  /* The form as a radius multiplier about the frame centre, normalized so its
   * furthest bearing is exactly 1 — the body never grows past the radius the
   * view sized it for, it only loses area on its narrow sides.
   *
   * Built once per body as a table: the outline is sampled densely in the
   * shape's own frame, each sample re-expressed as (bearing, radius) about the
   * frame centre, and the radii interpolated onto evenly spaced bearings. */
  function fn(form) {
    if (!form) return null;

    var N = 2048;
    var minor = 1 / form.aspect;
    var ca = Math.cos(form.axis), sa = Math.sin(form.axis);
    var ox = Math.sin(form.offsetAngle) * form.offset;
    var oy = Math.cos(form.offsetAngle) * form.offset;

    var bear = new Array(N), rad = new Array(N);
    for (var i = 0; i < N; i++) {
      var t = (i / N) * TAU;
      var c = Math.cos(t), s = Math.sin(t);
      /* An ellipse in its own frame, fattened towards the +axis end. The
       * taper is a multiplier rather than an added term so it can never fold
       * the outline back on itself. */
      var re = 1 / Math.sqrt(c * c + (s * s) / (minor * minor));
      re *= 1 + form.taper * c;
      if (form.lobe) re *= 1 + form.lobe * Math.cos(form.lobeN * t + form.lobePhase);
      var lx = c * re, ly = s * re;
      /* Rotate onto the rolled axis, then displace by the offset. */
      var x = lx * ca - ly * sa + ox;
      var y = lx * sa + ly * ca + oy;
      /* Bearing in the view's convention: x = sin(a), y = cos(a). */
      var b = Math.atan2(x, y);
      if (b < 0) b += TAU;
      bear[i] = b;
      rad[i] = Math.sqrt(x * x + y * y);
    }

    /* Walk the samples in bearing order and fill the table by linear
     * interpolation. The samples are monotonic in bearing (the frame centre is
     * inside the shape), so one sort and one sweep do it. */
    var order = [];
    for (i = 0; i < N; i++) order.push(i);
    order.sort(function (p, q) { return bear[p] - bear[q]; });

    var table = new Float64Array(BINS);
    var j = 0;
    for (var bi = 0; bi < BINS; bi++) {
      var a = (bi / BINS) * TAU;
      while (j < N && bear[order[j]] < a) j++;
      var hi = order[j % N], lo = order[(j - 1 + N) % N];
      var bh = bear[hi] + (j >= N ? TAU : 0);
      var bl = bear[lo] - (j === 0 ? TAU : 0);
      var u = bh - bl > 1e-9 ? (a - bl) / (bh - bl) : 0;
      table[bi] = rad[lo] + (rad[hi] - rad[lo]) * u;
    }

    /* NORMALIZED ABOUT THE SHAPE'S OWN MIDDLE, NOT THE FRAME CENTRE.
     *
     * The offset moves the shape off the point the cutaway radiates from —
     * that is the point of it — but the PICTURE should still be centred. So
     * the outline's bounding-box centre is found and reported as `centre`
     * (body units, pixel orientation: +y down), the view shifts by it, and
     * the table is scaled so the outline's furthest point from that centre is
     * exactly 1. The body then fills the radius the view sized it for, however
     * elongated it rolled, rather than shrinking to fit a circle it no longer
     * is. */
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (bi = 0; bi < BINS; bi++) {
      var ab = (bi / BINS) * TAU;
      var px = Math.sin(ab) * table[bi], py = -Math.cos(ab) * table[bi];
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
    }
    var mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
    var far = 0;
    for (bi = 0; bi < BINS; bi++) {
      var ac = (bi / BINS) * TAU;
      var dx = Math.sin(ac) * table[bi] - mx, dy = -Math.cos(ac) * table[bi] - my;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > far) far = d;
    }
    for (bi = 0; bi < BINS; bi++) table[bi] /= far;

    var out = function (angle) {
      var x = (angle / TAU) * BINS;
      x = ((x % BINS) + BINS) % BINS;
      var i0 = Math.floor(x), f = x - i0;
      var i1 = (i0 + 1) % BINS;
      return table[i0] + (table[i1] - table[i0]) * f;
    };
    out.centre = { x: mx / far, y: my / far };
    return out;
  }

  /* ---- breach: a layer's edge breaking up through the one above ---------
   *
   * Returns a(angle) -> 0..1, how far this layer's outer edge is lifted toward
   * the layer above's: 0 leaves it where it is, 1 puts it AT the layer above's
   * edge, so that band has no thickness there at all.
   *
   * The asteroid's use (ASTEROID-OVERHAUL §8): Cohesion is the brittleness
   * axis, and a loose body's crust is DISCONTINUOUS — thin in places and
   * missing in others, with the fragments reaching the silhouette. The field
   * is coherent angular noise thresholded by the parameter, so as Cohesion
   * falls the thin patches appear first, widen, and break through — one
   * continuous picture along the slider rather than a switch.
   *
   * `breach: { param, amount: [atParam0, atParam1], sectors }`. Returns null
   * when the field is zero everywhere, so the boundary is left untouched. */
  function breachFn(layer, params, seed) {
    var b = layer && layer.breach;
    if (!b) return null;
    var v = params ? params[b.param] : undefined;
    if (v === undefined) v = 1;
    v = Math.max(0, Math.min(1, v));
    var amt = b.amount[0] + (b.amount[1] - b.amount[0]) * v;
    if (amt <= 0.001) return null;

    var n = CC.RNG.makeAngularNoise(
      CC.RNG.hashString(String(seed) + " breach " + layer.role), b.sectors || 3);
    /* The noise sits mostly in 0.3..0.7 once mapped to 0..1, so a threshold
     * band of 0.3 above `1 - 0.75 * amt` gives: nothing below amt ~0.3, a few
     * thin patches by ~0.5, and full breaches on the crests at the top. */
    var lo = 1 - amt * 0.75;
    var hi = lo + 0.30;
    return function (angle) {
      var x = (n(angle, 3) + 1) * 0.5;
      if (x <= lo) return 0;
      if (x >= hi) return 1;
      var u = (x - lo) / (hi - lo);
      return u * u * (3 - 2 * u);
    };
  }

  /* ---- mosaic sites on a warped body -----------------------------------
   *
   * The mosaic's polar lattice (gen/elemgen.js `buildMosaic`) is uniform per
   * unit area BEFORE the warp. After it, every cell on a bearing is scaled by
   * the form there, so a narrow side came out with cells half the size of the
   * long ends' — measured on the sheet as a crowd of tiny fragments on one
   * flank, which reads as a rendering artefact rather than as rock.
   *
   * So on a warped body the sites are laid out where they will be SEEN: a
   * jittered hex lattice in warped space, kept inside the warped layer, then
   * un-warped back to (radius, angle) so `view.at` puts each exactly where it
   * was laid. Hex rather than square because a jittered hex lattice is the
   * cheapest point set whose Voronoi cells come out round and sliver-free —
   * the same job the polar lattice was doing.
   *
   * `jitter` keeps the polar lattice's meaning: 0 is a honeycomb, 1 is
   * close to a random scatter. Returns plain {radius, angle} pairs; the
   * caller rolls everything else per cell. */
  /* SIZE VARIATION, AND THIS IS WHAT KEEPS IT ROCK.
   *
   * A jittered hex lattice alone makes every cell the same size, and the first
   * render of it read as a honeycomb — a turtle's shell, not rubble. The polar
   * lattice had been giving size variation for free through its rings; this
   * has to give it on purpose. So the lattice is laid FINER than wanted and
   * thinned by a smooth noise field: where the field is high most points
   * survive and the cells are gravel, where it is low few do and the
   * survivors become slabs. The thinning rate is solved so the expected count
   * still matches `cells`.
   *
   * `cohesion` sets the contrast. A rubble pile is boulders among gravel, so
   * at 0 the field is pushed hard to its extremes; a monolith's slabs are
   * more even, so at 1 it is gentle. */
  function mosaicSites(form, outer, cells, jitter, rng, cohesion) {
    /* The layer's warped area, by bearing. */
    var area = 0, STEPS = 360;
    for (var i = 0; i < STEPS; i++) {
      var k = form((i / STEPS) * TAU) * outer;
      area += 0.5 * k * k * (TAU / STEPS);
    }
    var FINE = 2.6;
    var h = Math.sqrt(area / (Math.max(3, cells) * FINE * 0.8660254));
    var rowH = h * 0.8660254;
    var noise = CC.RNG.makeNoise2D(Math.floor(rng() * 4294967296));
    var freq = 2.2 / outer;
    var coh = cohesion === undefined ? 0.5 : Math.max(0, Math.min(1, cohesion));
    var gamma = 2.6 - 1.6 * coh;
    /* Jittered harder than the polar lattice was: where the field keeps every
     * point, a lightly jittered fine lattice shows through as a honeycomb. */
    jitter = Math.min(1, jitter * 1.6);
    var cand = [];
    var rows = Math.ceil(outer / rowH) + 1;
    var cols = Math.ceil(outer / h) + 1;
    var phx = rng() * h, phy = rng() * rowH;
    for (var r = -rows; r <= rows; r++) {
      for (var c = -cols; c <= cols; c++) {
        var x = c * h + (r & 1 ? h * 0.5 : 0) + phx - h * 0.5;
        var y = r * rowH + phy - rowH * 0.5;
        x += (rng() * 2 - 1) * h * 0.5 * jitter;
        y += (rng() * 2 - 1) * rowH * 0.5 * jitter;
        var rad = Math.sqrt(x * x + y * y);
        /* Bearing in the view's convention: x = sin(a), pixel y = -cos(a). */
        var ang = Math.atan2(x, -y);
        if (ang < 0) ang += TAU;
        var kk = form(ang);
        /* Inside the layer, with a half-cell margin so the field reaches the
         * edge rather than leaving a rim of oversized boundary cells. */
        if (rad > outer * kk + h * 0.5) continue;
        var nv = noise.fbm(x * freq + 17.3, y * freq - 4.1, 3);
        cand.push({ radius: rad / kk, angle: ang,
                    w: 0.04 + Math.pow(Math.max(0, Math.min(1, nv)), gamma) });
      }
    }

    /* Solve the thinning scale so the expected survivors match `cells`. */
    var lo = 0, hi = 1e4;
    for (var it = 0; it < 40; it++) {
      var mid = (lo + hi) / 2, sum = 0;
      for (i = 0; i < cand.length; i++) sum += Math.min(1, cand[i].w * mid);
      if (sum < cells) lo = mid; else hi = mid;
    }
    var out = [];
    for (i = 0; i < cand.length; i++) {
      if (rng() < Math.min(1, cand[i].w * lo)) {
        out.push({ radius: cand[i].radius, angle: cand[i].angle });
      }
    }
    return out;
  }

  return { roll: roll, fn: fn, breachFn: breachFn, mosaicSites: mosaicSites };
})();
