/* The compact family's marks — matter in states nothing else in the
 * generator is made of, and the field and light around it.
 *
 *   lattice       a crystal of nuclei: rows following the curve, broken into
 *                 grains. A neutron star's outer crust.
 *   pasta         nuclear pasta, whose shape is a function of DEPTH: drops
 *                 near the top, rods in the middle, sheets at the bottom. The
 *                 primitive reads `el.depth`, so one recipe draws the whole
 *                 phase sequence down the inner crust.
 *   vortex-array  quantized vortex lines in a superfluid, all parallel to the
 *                 SPIN axis — straight vertical lines through a round body,
 *                 which is a mark nothing else here makes.
 *   dipole-loop   one closed magnetic field line, r = L sin^2(theta), about
 *                 the body's own magnetic axis (`el.poles`), sheared by the
 *                 field's twist.
 *   beam-cone     a cone of emitted light along the axis. Called by the
 *                 emissive pass, not by a layer: it is light, and it leaves.
 *
 * The same rules as every primitive file: no role names, no archetype names,
 * pixels only through `view`. Every mark here is drawn in BODY coordinates —
 * x right, y toward the pole — because each one is a statement about an axis
 * or a curve, and polar (radius, bearing) is the wrong space for a straight
 * line. `xy` below is the one conversion; compact bodies declare no form, so
 * it agrees with `view.at` exactly.
 *
 * Load order: after draw/primitives.js. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;

  function xy(view, x, y) {
    var R = view.px(1);
    return { x: view.cx + x * R, y: view.cy - y * R };
  }

  /* Rotate a body-space vector CLOCKWISE by `a` — the same sense as a bearing,
   * so a tilt of +20 degrees leans the axis toward +x. Written out because
   * D155 is what happens when a frame convention is asserted rather than
   * worked: (0, 1) by a goes to (sin a, cos a). */
  function rot(x, y, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return { x: x * c + y * s, y: -x * s + y * c };
  }

  /* A cheap deterministic hash in 0..1, so a structure element can vary
   * thousands of sub-marks from its one seed without an RNG at draw time. */
  function hash(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /* ---- lattice ---------------------------------------------------------
   *
   * ROWS OF NUCLEI, regular to the eye, which is the whole statement: every
   * other band in the generator is drawn as material, and this one is drawn
   * as ORDER. Grains break it so it reads as a polycrystal — each has its own
   * phase along the row and a slight shear across it, and a gap is left at
   * each boundary, so the eye finds the seams rather than a printed texture.
   * Faint bonds along the rows make the order legible at sheet scale, where
   * the dots alone fall below a pixel apart. */
  function lattice(ctx, view, el, style) {
    var s = el.size;
    var rIn = el.inner + s * 0.5, rOut = el.outer - s * 0.3;
    if (rOut <= rIn) return;
    var dot = Math.max(0.55, view.px(s) * 0.17);
    var grains = el.grains || [{ a0: 0, a1: TAU, phase: 0, shear: 0, row: 0 }];

    ctx.save();
    ctx.fillStyle = style;
    ctx.strokeStyle = style;
    ctx.lineWidth = Math.max(0.5, dot * 0.55);

    ctx.beginPath();
    var bonds = [];
    for (var g = 0; g < grains.length; g++) {
      var gr = grains[g];
      var a0 = gr.a0, a1 = gr.a1;
      var span = a1 - a0;
      for (var r = rIn + gr.row * s * 0.5; r < rOut; r += s) {
        var step = s / r;
        /* Leave half a spacing clear at each grain boundary. */
        var start = a0 + step * (0.5 + gr.phase);
        var end = a1 - step * 0.5;
        var row = [];
        for (var a = start; a < end; a += step) {
          var u = (a - a0) / span;
          var rr = r + gr.shear * s * 0.45 * (u - 0.5);
          var p = view.at(rr, a);
          ctx.moveTo(p.x + dot, p.y);
          ctx.arc(p.x, p.y, dot, 0, TAU);
          row.push(p);
        }
        if (row.length > 1) bonds.push(row);
      }
    }
    ctx.fill();

    ctx.globalAlpha *= 0.42;
    ctx.beginPath();
    for (var b = 0; b < bonds.length; b++) {
      var rw = bonds[b];
      ctx.moveTo(rw[0].x, rw[0].y);
      for (var k = 1; k < rw.length; k++) ctx.lineTo(rw[k].x, rw[k].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  /* ---- pasta -----------------------------------------------------------
   *
   * NUCLEAR PASTA, as ORDERED STRIATIONS whose texture is decided by depth.
   * Squeezed harder downward, nuclear matter goes from drops (gnocchi) to
   * rods (spaghetti) to sheets (lasagna), so each row here is drawn as dots
   * near the top of the band, dashes through the middle, and long unbroken
   * lines at the bottom — one band visibly changing state as it goes down.
   * Grains give each stretch its own phase and a slow ripple, so the order
   * reads as matter rather than as a ruled pattern. */
  function pasta(ctx, view, el, style) {
    var s = el.size;
    var rIn = el.inner + s * 0.5, rOut = el.outer - s * 0.4;
    if (rOut <= rIn) return;
    var span = Math.max(1e-6, el.outer - el.inner);
    var grains = el.grains || [{ a0: 0, a1: TAU, phase: 0, wave: 0 }];
    var w = Math.max(0.6, view.px(s) * 0.30);
    var dotR = Math.max(0.6, view.px(s) * 0.20);

    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = style;
    ctx.fillStyle = style;
    ctx.lineWidth = w;
    var dots = [];
    ctx.beginPath();
    for (var g = 0; g < grains.length; g++) {
      var gr = grains[g];
      var row = 0;
      for (var r = rIn; r < rOut; r += s, row++) {
        /* 1 at the top of the band, 0 at the bottom. */
        var t = (r - el.inner) / span;
        var step = s / r;
        /* Dash length in spacings: ~0 is a drop, 1-3 a rod, long a sheet. */
        var dash = t > 0.70 ? 0 : (t > 0.34 ? 1.2 + (0.70 - t) * 6 : 9 + (0.34 - t) * 40);
        var gap = t > 0.70 ? 1.0 : (t > 0.34 ? 1.0 : 0.8);
        var period = (dash + gap) * step;
        /* Each row starts somewhere inside its own period, BEFORE the
         * grain's edge — an offset larger than a short grain left whole
         * rows of it blank. */
        var ph = ((gr.phase + hash(g * 13 + row * 7.3) * 0.6) % 1) * period;
        var start = gr.a0 + step * 0.6;
        var a = start - ph;
        var end = gr.a1 - step * 0.6;
        var waveA = s * 0.18 * gr.wave;
        while (a < end) {
          var a1 = Math.min(end, a + dash * step);
          if (a < start) {
            if (a1 <= start || dash < 0.2) { a = a1 + gap * step; continue; }
            a = start;
          }
          if (dash < 0.2) {
            dots.push(view.at(r, a));
          } else {
            var n = Math.max(2, Math.ceil((a1 - a) / step));
            for (var k = 0; k <= n; k++) {
              var aa = a + (a1 - a) * k / n;
              var p = view.at(r + waveA * Math.sin(aa * 40 + row), aa);
              if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
            }
          }
          a = a1 + gap * step;
        }
      }
    }
    ctx.stroke();
    ctx.beginPath();
    for (var d = 0; d < dots.length; d++) {
      ctx.moveTo(dots[d].x + dotR, dots[d].y);
      ctx.arc(dots[d].x, dots[d].y, dotR, 0, TAU);
    }
    ctx.fill();
    ctx.restore();
  }

  /* ---- vortex-array ----------------------------------------------------
   *
   * Straight lines parallel to the SPIN axis — body-vertical, whatever the
   * magnetic axis is doing, because a superfluid's vortices know only how it
   * turns. Evenly spaced: that regularity is the "clinical" the family spec
   * asks for. Each carries a slight Kelvin-wave ripple and, at intervals, a
   * small hook curling round it — the circulation, so a line reads as a
   * vortex and not as a ruling. The caller's band clip trims them to the
   * layer, so they stop at the core boundary on their own. */
  function vortexArray(ctx, view, el, style) {
    var s = el.size;
    var R = el.outer;
    var amp = s * 0.05;
    var hook = s * 0.20;
    ctx.save();
    ctx.strokeStyle = style;
    ctx.lineWidth = view.lw(0.9);
    ctx.lineCap = "round";
    ctx.beginPath();
    var k0 = Math.ceil(-R / s);
    for (var k = k0; k * s < R; k++) {
      var x0 = (k + (el.phase || 0)) * s;
      if (Math.abs(x0) >= R) continue;
      var h = Math.sqrt(R * R - x0 * x0);
      var ph = hash(k * 3.1 + (el.seed || 0) * 50) * TAU;
      var N = Math.max(8, Math.round(h / (s * 0.25)));
      for (var i = 0; i <= N; i++) {
        var y = -h + 2 * h * i / N;
        var x = x0 + amp * Math.sin(y / s * 2.4 + ph);
        var p = xy(view, x, y);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
    }
    ctx.stroke();

    /* THE CIRCULATION: a small ring round the line, seen obliquely — the
     * technical-drawing sign for "this turns about this axis". An open hook
     * read as a letter C; a flattened ring reads as rotation. Fainter than
     * the line, and spaced on each line's own rhythm. */
    ctx.globalAlpha *= 0.7;
    ctx.lineWidth = view.lw(0.7);
    ctx.beginPath();
    for (k = k0; k * s < R; k++) {
      x0 = (k + (el.phase || 0)) * s;
      if (Math.abs(x0) >= R) continue;
      h = Math.sqrt(R * R - x0 * x0);
      var gap = s * 1.7;
      var y0 = -h + gap * (0.4 + hash(k * 7.7) * 0.9);
      for (var yy = y0; yy < h; yy += gap) {
        var c = xy(view, x0 + amp * Math.sin(yy / s * 2.4 +
                      hash(k * 3.1 + (el.seed || 0) * 50) * TAU), yy);
        var rx = Math.max(1.2, view.px(hook)), ry = rx * 0.34;
        ctx.moveTo(c.x + rx, c.y);
        ctx.ellipse(c.x, c.y, rx, ry, 0, 0, TAU);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  /* ---- dipole-loop -----------------------------------------------------
   *
   * ONE CLOSED FIELD LINE of a dipole: r = L sin^2(theta), theta measured
   * from the magnetic pole. `el.radius` is L, the line's equatorial reach;
   * the line leaves the surface (r = 1) near one pole and returns near the
   * other. Which side of the axis it runs on is the element's own seed.
   *
   * THE TWIST shears the northern half one way and the southern half the
   * other, so the loops lean into an S. A plain dipole is a calm field; a
   * magnetar's is wound up, and the S is what says so at a glance. */
  function dipoleLoop(ctx, view, el, style) {
    var L = el.reach || el.radius;
    if (L <= 1.02) return;
    var P = el.poles || { tilt: 0, twist: 0 };
    var side = (el.seed || 0) < 0.5 ? -1 : 1;
    var th0 = Math.asin(Math.sqrt(1 / L));
    var twist = P.twist || 0;
    /* Fades along its own length toward HALF AGAIN the halo's reach, so a
     * loop reaching past the glow rises off the pole and dissolves well out
     * in the dark rather than at the glow's edge, where it read as cut. */
    var outer = 1 + ((el.outer || L) - 1) * 1.5;
    var fade = function (r) {
      var t = (r - 1) / Math.max(0.05, outer - 1);
      return t <= 0.35 ? 1 : Math.max(0, 1 - (t - 0.35) / 0.65);
    };
    var N = 56, pts = [];
    for (var i = 0; i <= N; i++) {
      var th = th0 + (Math.PI - 2 * th0) * i / N;
      var r = L * Math.sin(th) * Math.sin(th);
      var lift = (r - 1) / Math.max(0.05, L - 1);
      var sh = twist * 0.55 * Math.cos(th) * lift;
      var v = rot(side * r * Math.sin(th), r * Math.cos(th), sh * side);
      v = rot(v.x, v.y, P.tilt || 0);
      var p = xy(view, v.x, v.y);
      p.f = fade(r);
      pts.push(p);
    }
    ctx.save();
    ctx.strokeStyle = style;
    ctx.lineWidth = view.lw(el.tier <= 2 ? 1.7 : 1.15);
    ctx.lineCap = "round";
    var base = ctx.globalAlpha;
    /* In short runs at a stepped alpha — a per-slice alpha, not a gradient
     * (D157): a gradient fades along the wrong axis for a curve. */
    for (var k = 0; k < N; k += 4) {
      var f = pts[Math.min(N, k + 2)].f;
      if (f <= 0.01) continue;
      ctx.globalAlpha = base * f;
      ctx.beginPath();
      ctx.moveTo(pts[k].x, pts[k].y);
      for (var j = k + 1; j <= Math.min(N, k + 4); j++) ctx.lineTo(pts[j].x, pts[j].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---- beam-cone -------------------------------------------------------
   *
   * A CONE OF LIGHT along the axis — a pulsar's beam or, collimated, a black
   * hole's jet. `el = { axis, dir, half, length, collimate, strength, seed }`
   * in body units; `dir` is +1 for the north beam and -1 for the south.
   *
   * Drawn as nested wedges, each narrower and brighter than the last, with
   * its alpha carried by a gradient ALONG the axis. Nesting gives a soft
   * edge across the beam and a hot core down its middle, which is what the
   * spec asks of it, without a blur. `collimate` pinches the sides in toward
   * the tip so a jet stays a jet over its whole length.
   *
   * `style` is a FUNCTION alpha -> colour here, not a colour string: the
   * cone's alpha varies along its length, so it needs its colour at many
   * alphas. Only the emissive pass calls it. */
  function beamCone(ctx, view, el, style) {
    var dir = el.dir || 1;
    var ax = rot(0, dir, el.axis || 0);
    var nx = { x: ax.y, y: -ax.x };
    var base = el.base === undefined ? 0.96 : el.base;
    var len = el.length;
    var col = el.collimate || 0;
    var p0 = xy(view, ax.x * base, ax.y * base);
    var p1 = xy(view, ax.x * (base + len), ax.y * (base + len));
    var layers = [
      { w: 1.00, a: 0.20 }, { w: 0.70, a: 0.24 }, { w: 0.44, a: 0.34 },
      { w: 0.22, a: 0.55 }, { w: 0.08, a: 0.85 }
    ];
    ctx.save();
    for (var li = 0; li < layers.length; li++) {
      var Ly = layers[li];
      var g = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
      for (var gi = 0; gi <= 8; gi++) {
        var t = gi / 8;
        var u = 1 - t;
        /* Bright near the pole, falling away along the beam to nothing at
         * its end (D156: ending AT nothing, not toward it). */
        g.addColorStop(t, style(Ly.a * el.strength * Math.pow(u, 1.6)));
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      var K = 16;
      var left = [], right = [];
      for (var k = 0; k <= K; k++) {
        var tt = k / K;
        var d = base + len * tt;
        /* A cone widens linearly; a jet's width is pinched toward a
         * cylinder as `col` rises. A little width at the root so the beam
         * leaves a polar cap rather than a point. */
        var wcone = Math.tan(el.half) * d;
        var wjet = Math.tan(el.half) * (base + len * 0.12) * (1 + tt * 0.6);
        /* `root`: the width at the base, in body radii (0.03 by default, a
         * polar cap on a star's surface). A beam from a point at the heart
         * of a nebula must start as a point, or it leaves a fat flat end. */
        var hw = (wcone * (1 - col) + wjet * col) * Ly.w +
                 (el.root === undefined ? 0.03 : el.root) * Ly.w;
        var cxp = ax.x * d, cyp = ax.y * d;
        left.push(xy(view, cxp + nx.x * hw, cyp + nx.y * hw));
        right.push(xy(view, cxp - nx.x * hw, cyp - nx.y * hw));
      }
      ctx.moveTo(left[0].x, left[0].y);
      for (k = 1; k <= K; k++) ctx.lineTo(left[k].x, left[k].y);
      for (k = K; k >= 0; k--) ctx.lineTo(right[k].x, right[k].y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---- singularity ------------------------------------------------------
   *
   * A pinpoint, and nothing that would claim to know what is there: a hot
   * centre and a soft glow, deliberately tiny. A spinning hole's singularity
   * is a RING in its equator, so the builder (js/gen/compact.js) emits two of
   * these, one each side; the one on the right also draws a faint dashed
   * chord to its twin, which is all that says "these two points are one
   * ring, seen edge-on". */
  function singularity(ctx, view, el, style) {
    var c = view.at(el.radius, el.angle);
    var r = Math.max(2.2, view.px(el.size));
    ctx.save();
    if (el.span > 0 && el.angle > 0) {
      var o = view.at(el.radius, -el.angle);
      ctx.globalAlpha *= 0.32;
      ctx.strokeStyle = style;
      ctx.lineWidth = view.lw(0.8);
      ctx.setLineDash([view.lw(2), view.lw(3)]);
      ctx.beginPath();
      ctx.moveTo(o.x, o.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha /= 0.32;
    }
    var g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.25, style);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /* ---- infall -----------------------------------------------------------
   *
   * Inside the horizon "inward" is the future, so everything falls: a short
   * streak running INWARD from where it sits and twisting slightly with the
   * spin, fading to nothing as it goes (D156). Faint by design — the void
   * stays a void; these say only that it is not empty of motion. */
  function infall(ctx, view, el, style) {
    var len = el.size;
    var r0 = el.radius, r1 = Math.max(0.02, r0 - len);
    var twist = ((el.seed || 0.5) - 0.5) * 0.4;
    var p0 = view.at(r0, el.angle), p1 = view.at(r1, el.angle + twist * len);
    var g = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
    g.addColorStop(0, style);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.strokeStyle = g;
    ctx.lineWidth = view.lw(0.9);
    ctx.lineCap = "round";
    ctx.beginPath();
    var mid = view.at((r0 + r1) / 2, el.angle + twist * len * 0.35);
    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(mid.x, mid.y, p1.x, p1.y);
    ctx.stroke();
    ctx.restore();
  }

  /* ---- crack ------------------------------------------------------------
   *
   * A CRYSTAL SNAPPING: one jagged, near-radial line running inward from
   * where it sits, unbranched — a `vein` branches like ore and read as hair
   * across an ordered lattice. Dark, with a thin bright edge beside it: the
   * fresh face of a fracture in a crust millions of degrees hot. */
  function crack(ctx, view, el, style) {
    var len = el.size, N = 9, pts = [];
    var sd = el.seed || 0;
    for (var i = 0; i <= N; i++) {
      var t = i / N;
      /* A small jag and a slow drift: a crack, not a zigzag. */
      var jag = (hash(sd * 31 + i) - 0.5) * 0.16 * len / Math.max(0.2, el.radius);
      var drift = (hash(sd * 7) - 0.5) * 0.10 * t * len / Math.max(0.2, el.radius);
      pts.push(view.at(el.radius - len * t, el.angle + jag + drift));
    }
    ctx.save();
    ctx.lineJoin = "miter";
    ctx.lineCap = "butt";
    ctx.strokeStyle = style;
    ctx.lineWidth = view.lw(el.tier === 0 ? 1.8 : 1.3);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (i = 1; i <= N; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.globalAlpha *= 0.55;
    ctx.strokeStyle = "rgba(255,250,240,0.9)";
    ctx.lineWidth = view.lw(0.6);
    var dx = view.lw(1.4);
    ctx.beginPath();
    ctx.moveTo(pts[0].x + dx, pts[0].y);
    for (i = 1; i <= N; i++) ctx.lineTo(pts[i].x + dx, pts[i].y);
    ctx.stroke();
    ctx.restore();
  }

  CC.Primitives.register({
    "crack": crack,
    "singularity": singularity,
    "infall": infall,
    "lattice": lattice,
    "pasta": pasta,
    "vortex-array": vortexArray,
    "dipole-loop": dipoleLoop,
    "beam-cone": beamCone
  });

  /* Shared with the emissive pass, which lays streaks and knots inside a
   * cone and needs the same frame. */
  CC.CompactDraw = { xy: xy, rot: rot, hash: hash };
})();
