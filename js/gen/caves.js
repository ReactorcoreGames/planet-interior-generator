/* Caves — tunnels and chambers cut through a body's interior
 * (ASTEROID-OVERHAUL §7, as revised by the user after Session U1).
 *
 * ---- WHAT THIS IS ---------------------------------------------------------
 *
 * One structural system, driven by one slider (`caves.param`, "Caverns"):
 *
 *   NATURAL, the low and middle range. Squiggly tunnels of VARYING thickness
 *   that criss-cross at random, and clusters of overlapping circles as
 *   chambers — sometimes on or beside a tunnel, sometimes a closed pocket on
 *   their own. A few tunnels run out through the crust as open mouths.
 *
 *   ARTIFICIAL, added on top at the upper range. Constant-width, straighter
 *   bores between round, regular chambers, and more of them reaching the
 *   surface. A bore does not taper; a crack and a cave do — that difference
 *   alone is enough for the eye. At the very top the chambers are large:
 *   this is where the retired `hollowed-out` lives now, as a position on a
 *   dial rather than a trait.
 *
 * The rubble voids of the mosaic are NOT this. They are the gaps between
 * fragments and Cohesion owns them; caves are smooth cavities cut THROUGH the
 * fragments, and both coexist.
 *
 * COHESION CAPS IT. A rubble pile cannot hold a cavern open, so the amount
 * expressed is the slider times a ramp on Cohesion (`caves.cap`). The slider
 * still sets the CHARACTER (natural vs bored) on its own — a loose body with
 * Caverns at the top has a few small machined bores, not none of the wrong
 * kind.
 *
 * TUNNEL-BORER TRAILS are part of the same system: a borer element (placed by
 * the trait) gets its bore laid here, back to where it entered, so a borer
 * that reaches a cavern reads as one excavation (§5).
 *
 * ---- COORDINATES -----------------------------------------------------------
 *
 * Everything is laid out in WARPED body space — after the form, in body
 * radii, pixel orientation (+y down) — the space `CC.Form.mosaicSites` lays
 * the fragments in, so tunnels follow the blob instead of a circle. A point
 * (x, y) here is drawn at (view.cx + x·R, view.cy + y·R), which is exactly
 * where `view.at` puts the same point inside the body.
 *
 * ---- OUTPUT ----------------------------------------------------------------
 *
 *   { role, tunnels: [{ pts: [{x,y,w}], kind, exit }], chambers: [{x,y,r}],
 *     exits, area, counts }
 *
 * `w` and `r` are radii (half-widths). `area` is the share of the host
 * layer's cut face the cavities occupy, MEASURED by rasterizing this same
 * geometry — the card reads it (stats measure the render). Null when the
 * archetype declares no caves. */

var CC = CC || {};

CC.Caves = (function () {
  "use strict";

  var TAU = Math.PI * 2;
  var clamp = CC.Math.clamp;
  var smoothstep = CC.Math.smoothstep;
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* Sampling step along every path, in body radii. Fine enough that a
   * varying width reads as smooth, coarse enough to stay cheap. */
  var STEP = 0.028;

  function build(archetype, body, params, seed, formFn, spanning) {
    var spec = archetype && archetype.caves;
    if (!spec) return null;
    var layer = null, surface = null, i;
    for (i = 0; i < body.layers.length; i++) {
      if (!surface && !body.layers[i].outward) surface = body.layers[i];
      if (body.layers[i].role === spec.layer) layer = body.layers[i];
    }
    if (!layer || !surface) return null;

    var form = formFn || function () { return 1; };
    function bearing(x, y) { var a = Math.atan2(x, -y); return a < 0 ? a + TAU : a; }
    /* The un-warped radius of a warped point — what the layer radii mean. */
    function radial(x, y) { return Math.sqrt(x * x + y * y) / form(bearing(x, y)); }
    function warped(r, a) { var k = r * form(a); return { x: Math.sin(a) * k, y: -Math.cos(a) * k }; }

    var slider = clamp(params[spec.param] === undefined ? 0 : params[spec.param], 0, 1);
    var cap = 1;
    if (spec.cap) {
      var cv = params[spec.cap.param];
      cap = smoothstep(spec.cap.from, spec.cap.full, clamp(cv === undefined ? 0.5 : cv, 0, 1));
    }
    /* `e` is how MUCH; `art` is what KIND, from the slider's position alone. */
    var e = slider * cap;
    var art = smoothstep(0.55, 0.95, slider);

    /* Caves stay clear of the crust except where they deliberately exit it:
     * the host layer's edge wobbles, so the limit sits a margin inside it. */
    var LIM = layer.outer * 0.88;
    var OUT = surface.outer * 1.18;
    function inside(x, y, margin) { return radial(x, y) < LIM - (margin || 0); }

    var tunnels = [], chambers = [];

    function randomPoint(rng, margin) {
      for (var t = 0; t < 40; t++) {
        var a = rng() * TAU, r = Math.sqrt(rng()) * LIM * 0.92;
        var p = warped(r, a);
        if (inside(p.x, p.y, margin)) return p;
      }
      return { x: 0, y: 0 };
    }

    /* Run a path outward from (x, y) until it is past the silhouette — the
     * mouth of an exit. `bend` is how much it may wander on the way out. */
    function runOut(pts, rng, w, bend, constant) {
      var p = pts[pts.length - 1];
      var ph = rng() * TAU;
      var h = pts.length > 1 ? Math.atan2(p.y - pts[pts.length - 2].y, p.x - pts[pts.length - 2].x)
                             : rng() * TAU;
      for (var k = 0; k < 120 && radial(p.x, p.y) < OUT; k++) {
        var a = bearing(p.x, p.y);
        var outH = Math.atan2(-Math.cos(a), Math.sin(a));
        var d = ((outH - h + Math.PI * 3) % TAU) - Math.PI;
        h += d * 0.22 + (constant ? 0 : (rng() * 2 - 1) * bend);
        p = { x: p.x + Math.cos(h) * STEP, y: p.y + Math.sin(h) * STEP,
              w: constant ? w : w * (0.92 + 0.14 * Math.sin(k * 0.7 + ph)) };
        pts.push(p);
      }
    }

    /* ---- natural tunnels ------------------------------------------------ */

    var nT = e > 0.02 ? Math.round(1 + e * 7) : 0;
    for (var t = 0; t < nT; t++) {
      var rng = CC.RNG.stream(seed, "caves/tunnel/" + t);
      var p0 = randomPoint(rng, 0.02);
      var h = rng() * TAU;
      var len = LIM * lerp(0.35, 1.05, rng()) * (0.5 + 0.5 * e);
      var n = Math.max(4, Math.round(len / STEP));
      /* THICK. The user's words are "squiggly thick lines of varying
       * thicknesses"; thinner than this they read as roots or worms, and the
       * cavity's depth ramp has no room to show. */
      var w0 = lerp(0.015, 0.034, rng()) * (0.75 + 0.5 * e);
      var ph1 = rng() * TAU, ph2 = rng() * TAU, ph3 = rng() * TAU;
      var drift = (rng() * 2 - 1) * 0.10;
      var pts = [];
      var x = p0.x, y = p0.y;
      for (var j = 0; j <= n; j++) {
        var u = j / n;
        /* VARYING THICKNESS, and pinching toward the ends — a cave passage
         * swells and narrows, and dies out rather than stopping square. */
        var wv = 0.62 + 0.26 * Math.sin(u * 8.3 + ph1) + 0.16 * Math.sin(u * 19.7 + ph2);
        var taper = 0.50 + 0.50 * Math.pow(Math.sin(Math.PI * u), 0.5);
        pts.push({ x: x, y: y, w: Math.max(0.0025, w0 * wv * taper) });
        /* SQUIGGLY: a random turn every step plus a slow swing. */
        h += drift + 0.30 * (rng() * 2 - 1) + 0.16 * Math.sin(u * 13 + ph3);
        var nx = x + Math.cos(h) * STEP, ny = y + Math.sin(h) * STEP;
        if (!inside(nx, ny, 0.01)) {
          /* Turned back from the crust rather than through it. */
          h = Math.atan2(-y, -x) + (rng() * 2 - 1) * 0.9;
          nx = x + Math.cos(h) * STEP; ny = y + Math.sin(h) * STEP;
          if (!inside(nx, ny, 0.01)) break;
        }
        x = nx; y = ny;
      }
      if (pts.length < 3) continue;
      /* SOME BREAK THE SURFACE as exposed entrances. */
      var exit = rng() < 0.12 + 0.34 * e;
      if (exit) runOut(pts, rng, w0 * 0.8, 0.22, false);
      tunnels.push({ pts: pts, kind: "cave", exit: exit });
    }

    /* ---- natural chambers: clusters of overlapping circles -------------- */

    var nC = e > 0.02 ? Math.round(0.6 + e * 4.4) : 0;
    var pockets = 0;
    for (var c = 0; c < nC; c++) {
      var crng = CC.RNG.stream(seed, "caves/chamber/" + c);
      var centre;
      /* On or beside a tunnel most of the time; otherwise a closed pocket. */
      if (tunnels.length && crng() < 0.62) {
        var tt = tunnels[Math.floor(crng() * tunnels.length)].pts;
        var v = tt[Math.floor(crng() * tt.length)];
        var off = crng() * 0.04;
        var oa = crng() * TAU;
        centre = { x: v.x + Math.cos(oa) * off, y: v.y + Math.sin(oa) * off };
      } else {
        centre = randomPoint(crng, 0.06);
      }
      var rb = lerp(0.034, 0.080, crng()) * (0.7 + 0.6 * e);
      var m = 2 + Math.floor(crng() * 4);
      for (var q = 0; q < m; q++) {
        var cr = q === 0 ? rb : rb * lerp(0.45, 0.9, crng());
        var cd = q === 0 ? 0 : rb * lerp(0.55, 1.15, crng());
        var ca = crng() * TAU;
        var cx = centre.x + Math.cos(ca) * cd, cy = centre.y + Math.sin(ca) * cd;
        if (inside(cx, cy, cr * 0.8)) {
          chambers.push({ x: cx, y: cy, r: cr, kind: "cave" });
          if (q === 0) pockets++;
        }
      }
    }

    /* ---- artificial: regular chambers joined by constant-width bores ----- */

    if (art > 0.01 && e > 0.02) {
      var arng = CC.RNG.stream(seed, "caves/bored");
      var bw = lerp(0.009, 0.013, arng()) * (1 + 0.35 * art);
      var nA = Math.round(art * lerp(1.5, 5.5, e));
      var made = [];
      for (var k = 0; k < nA; k++) {
        var rA = lerp(0.040, 0.075, arng()) * (1 + 1.4 * art * e);
        for (var tries = 0; tries < 30; tries++) {
          var pc = randomPoint(arng, rA);
          var ok = true;
          for (var o = 0; o < made.length; o++) {
            var dx = made[o].x - pc.x, dy = made[o].y - pc.y;
            if (Math.sqrt(dx * dx + dy * dy) < made[o].r + rA + 0.07) { ok = false; break; }
          }
          if (ok) { made.push({ x: pc.x, y: pc.y, r: rA, kind: "bored" }); break; }
        }
      }
      /* A MINED HALL IS A STADIUM, NOT A BALL. Round chambers on straight
       * bores read as a ball-and-stick molecule; a hall cut lengthwise —
       * parallel walls, rounded ends — is what an excavation looks like, and
       * it is a different shape from the natural chambers' clustered
       * circles, which is the point. Drawn as a short, very wide bore, so it
       * merges with the network through the same passes. */
      var halls = made.length;
      for (k = 0; k < made.length; k++) {
        var hall = made[k];
        var ho = arng() * Math.PI;
        var hl = hall.r * lerp(0.7, 1.5, arng());
        var hw = hall.r * lerp(0.55, 0.75, arng());
        var hpts = [];
        for (var hs = 0; hs <= 4; hs++) {
          var hu = hs / 4 - 0.5;
          hpts.push({ x: hall.x + Math.cos(ho) * hl * hu * 2,
                      y: hall.y + Math.sin(ho) * hl * hu * 2, w: hw });
        }
        tunnels.push({ pts: hpts, kind: "bore", exit: false, hall: true });
      }

      /* Each chamber after the first is bored to its nearest predecessor —
       * a network, straight runs with one dog-leg, which is what an engineer
       * cuts and a cave never does. */
      for (k = 1; k < made.length; k++) {
        var best = 0, bd = Infinity;
        for (o = 0; o < k; o++) {
          var ddx = made[o].x - made[k].x, ddy = made[o].y - made[k].y;
          var dd = ddx * ddx + ddy * ddy;
          if (dd < bd) { bd = dd; best = o; }
        }
        tunnels.push({ pts: dogleg(made[k], made[best], bw, arng), kind: "bore", exit: false });
      }
      /* Bored exits, more of them toward the top of the range. */
      var nX = made.length ? Math.round(art * lerp(1, 4, e)) : 0;
      for (k = 0; k < nX; k++) {
        var from = made[Math.floor(arng() * made.length)];
        var xa = bearing(from.x, from.y) + (arng() * 2 - 1) * 0.35;
        var expts = [{ x: from.x, y: from.y, w: bw }];
        var hx = Math.sin(xa), hy = -Math.cos(xa);
        for (var s = 0; s < 120 && radial(expts[expts.length - 1].x, expts[expts.length - 1].y) < OUT; s++) {
          var last = expts[expts.length - 1];
          expts.push({ x: last.x + hx * STEP, y: last.y + hy * STEP, w: bw });
        }
        tunnels.push({ pts: expts, kind: "bore", exit: true });
      }
    }

    /* ---- tunnel-borer trails ------------------------------------------- */

    var borers = 0;
    for (i = 0; spanning && i < spanning.length; i++) {
      var el = spanning[i];
      if (el.kind !== "borer") continue;
      var brng = CC.RNG.stream(seed, "caves/borer/" + i);
      var head = warped(Math.min(el.radius, LIM), el.angle);
      var ea = el.angle + (brng() * 2 - 1) * 0.55;
      var entry = warped(OUT, ea);
      var bwr = el.size * 0.30;
      var trail = dogleg(entry, head, bwr, brng, 0.06);
      el.boreW = bwr;
      el.trail = trail.map(function (pt) { return [pt.x, pt.y]; });
      tunnels.push({ pts: trail, kind: "bore", exit: true, borer: true });
      borers++;
    }

    if (!tunnels.length && !chambers.length) return null;

    var exits = 0, nat = 0, bored = 0;
    for (i = 0; i < tunnels.length; i++) {
      if (tunnels[i].exit) exits++;
      if (tunnels[i].hall || tunnels[i].borer) continue;
      if (tunnels[i].kind === "cave") nat++; else bored++;
    }
    return {
      role: layer.role,
      tunnels: tunnels,
      chambers: chambers,
      exits: exits,
      character: art,
      /* What the card can name: passages, bored tunnels, natural chambers
       * (a cluster is one chamber), mined halls and boring machines. */
      counts: { caves: nat, bores: bored, pockets: pockets,
                halls: typeof halls === "number" ? halls : 0, borers: borers },
      area: measure(tunnels, chambers, layer.outer, radial)
    };
  }

  /* A straight run with at most one gentle bend, sampled at STEP, constant
   * width. The bend is perpendicular to the run, so a bore still reads as
   * aimed. */
  function dogleg(a, b, w, rng, bendAmt) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    var n = Math.max(2, Math.ceil(d / STEP));
    var bend = (rng() * 2 - 1) * d * (bendAmt === undefined ? 0.12 : bendAmt);
    var px = -dy / (d || 1), py = dx / (d || 1);
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var u = i / n;
      var k = 4 * u * (1 - u) * bend;
      pts.push({ x: a.x + dx * u + px * k, y: a.y + dy * u + py * k, w: w });
    }
    return pts;
  }

  /* THE SHARE OF THE HOST LAYER'S CUT FACE THAT IS CAVITY, measured by
   * rasterizing the same geometry draw/caves.js draws. A grid over the body,
   * each cell inside the layer counted, each counted cell marked when any
   * tunnel segment or chamber covers it. Fixed grid, so the figure is the
   * same at every resolution. */
  function measure(tunnels, chambers, outer, radial) {
    var N = 180, cell = 2.4 / N, half = 1.2;
    var hit = new Uint8Array(N * N);
    function mark(x0, y0, x1, y1, test) {
      var i0 = Math.max(0, Math.floor((x0 + half) / cell)), i1 = Math.min(N - 1, Math.floor((x1 + half) / cell));
      var j0 = Math.max(0, Math.floor((y0 + half) / cell)), j1 = Math.min(N - 1, Math.floor((y1 + half) / cell));
      for (var j = j0; j <= j1; j++) {
        for (var i = i0; i <= i1; i++) {
          if (test(-half + (i + 0.5) * cell, -half + (j + 0.5) * cell)) hit[j * N + i] = 1;
        }
      }
    }
    tunnels.forEach(function (t) {
      for (var s = 1; s < t.pts.length; s++) {
        var a = t.pts[s - 1], b = t.pts[s];
        var w = Math.max(a.w, b.w);
        mark(Math.min(a.x, b.x) - w, Math.min(a.y, b.y) - w,
             Math.max(a.x, b.x) + w, Math.max(a.y, b.y) + w, function (x, y) {
          var dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy;
          var u = L > 0 ? clamp(((x - a.x) * dx + (y - a.y) * dy) / L, 0, 1) : 0;
          var ex = a.x + dx * u - x, ey = a.y + dy * u - y;
          var ww = a.w + (b.w - a.w) * u;
          return ex * ex + ey * ey <= ww * ww;
        });
      }
    });
    chambers.forEach(function (c) {
      mark(c.x - c.r, c.y - c.r, c.x + c.r, c.y + c.r, function (x, y) {
        return (x - c.x) * (x - c.x) + (y - c.y) * (y - c.y) <= c.r * c.r;
      });
    });
    var inLayer = 0, cut = 0;
    for (var j = 0; j < N; j++) {
      for (var i = 0; i < N; i++) {
        var x = -half + (i + 0.5) * cell, y = -half + (j + 0.5) * cell;
        if (radial(x, y) >= outer) continue;
        inLayer++;
        if (hit[j * N + i]) cut++;
      }
    }
    return inLayer ? cut / inLayer : 0;
  }

  return { build: build };
})();
