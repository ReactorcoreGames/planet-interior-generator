/* Built structures round a star — drawing gen/dyson.js's elements.
 *
 *   dyson-shell   the cut edge of a lattice sphere: plates first, metal
 *                 over the glow in some of the triangles; then the
 *                 diagonals, rows of triangles between rails, each rail
 *                 offset half a cell from the last; then the rails, the
 *                 innermost lit by the star; then heavy ribs at intervals,
 *                 standing proud of both faces; then lights at nodes.
 *                 An unfinished shell skips the cells in its gaps, breaks
 *                 its rails there, and runs bare rail stubs into them
 *
 * Metal is hullFill's (draw/details.js). Every part is drawn at every size
 * and every count is body-space, so the call count is the same at every
 * zoom and resolution; only line widths and light radii floor.
 *
 * draw/primitives.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;

  /* The rails, inner to outer, each a list of pixel nodes; rail k's nodes
   * sit half a cell along on odd k, which is what makes the triangles. */
  function rails(view, el) {
    var step = TAU / el.n, out = [];
    for (var k = 0; k <= el.rows; k++) {
      var r = el.radius - el.thick / 2 + el.thick * k / el.rows;
      var off = (k % 2) / 2, pts = [];
      for (var i = 0; i <= el.n; i++) pts.push(view.at(r, el.phase + (i + off) * step));
      out.push(pts);
    }
    return out;
  }

  function tri(ctx, p, q, s) {
    ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.lineTo(s.x, s.y); ctx.closePath();
  }

  function line(ctx, pts) {
    for (var i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i].x, pts[i].y); else ctx.lineTo(pts[i].x, pts[i].y);
    }
  }

  /* Rail k as runs over the built cells only, so a gap breaks it. */
  function railRuns(ctx, pts, cells, n) {
    if (!cells) { line(ctx, pts); return; }
    var run = null;
    for (var i = 0; i <= n; i++) {
      var on = i < n && cells[i];
      if (on && !run) { run = true; ctx.moveTo(pts[i].x, pts[i].y); }
      else if (run) { ctx.lineTo(pts[i].x, pts[i].y); if (!on) run = null; }
    }
  }

  function dysonShell(ctx, view, el, st) {
    var S = view.px(1);
    var R = rails(view, el), n = el.n, i, k, L, U, b;
    ctx.save();
    ctx.lineJoin = "round";

    /* The plates: two triangles per cell per row, between rail k and k+1.
     * Where the upper rail is the offset one, a triangle stands on the
     * lower rail; where the lower is, it hangs from the upper. */
    ctx.fillStyle = st.hull;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    for (k = 0; k < el.rows; k++) {
      L = R[k]; U = R[k + 1]; b = 2 * n * k;
      for (i = 0; i < n; i++) {
        if (el.cells && !el.cells[i]) continue;
        if (k % 2 === 0) {
          if (el.plates[b + 2 * i]) tri(ctx, L[i], L[i + 1], U[i]);
          if (el.plates[b + 2 * i + 1]) tri(ctx, U[i], U[i + 1], L[i + 1]);
        } else {
          if (el.plates[b + 2 * i]) tri(ctx, U[i], U[i + 1], L[i]);
          if (el.plates[b + 2 * i + 1]) tri(ctx, L[i], L[i + 1], U[i + 1]);
        }
      }
    }
    ctx.fill();
    ctx.globalAlpha = 1;

    /* The diagonals: a zigzag between each pair of rails, one path. */
    ctx.strokeStyle = st.lit;
    ctx.lineWidth = Math.max(0.35, S * 0.0009);
    ctx.beginPath();
    for (k = 0; k < el.rows; k++) {
      var A = k % 2 === 0 ? R[k] : R[k + 1], B = k % 2 === 0 ? R[k + 1] : R[k];
      for (i = 0; i < n; i++) {
        if (el.cells && !el.cells[i]) continue;
        ctx.moveTo(A[i].x, A[i].y); ctx.lineTo(B[i].x, B[i].y); ctx.lineTo(A[i + 1].x, A[i + 1].y);
      }
    }
    ctx.stroke();

    /* The rails: the inner ones thin, the outer one metal, the innermost
     * catching the star. */
    ctx.beginPath();
    for (k = 1; k < el.rows; k++) railRuns(ctx, R[k], el.cells, n);
    ctx.stroke();
    ctx.lineWidth = Math.max(0.6, S * 0.0022);
    ctx.strokeStyle = st.hull;
    ctx.beginPath(); railRuns(ctx, R[el.rows], el.cells, n); ctx.stroke();
    ctx.strokeStyle = st.lit;
    ctx.beginPath(); railRuns(ctx, R[0], el.cells, n); ctx.stroke();

    /* The construction front: bare rail run on past an end rib. */
    if (el.stubs) {
      ctx.strokeStyle = st.hull;
      ctx.beginPath();
      for (i = 0; i < el.stubs.length; i++) {
        var sb = el.stubs[i];
        line(ctx, R[sb.k].slice(Math.max(0, sb.i0), Math.min(n, sb.i1) + 1));
      }
      ctx.stroke();
    }

    /* The ribs: a heavy frame across the band, proud of both faces. */
    var step = TAU / n, h = el.thick / 2;
    ctx.fillStyle = st.hull;
    ctx.strokeStyle = st.trim;
    ctx.lineWidth = Math.max(0.4, S * 0.0010);
    var w = 0.0045;
    for (i = 0; i < n; i += el.ribEvery) {
      /* A rib stands wherever the lattice meets it from either side. */
      if (el.cells && !el.cells[i] && !el.cells[(i + n - 1) % n]) continue;
      var F = CC.OrbitShapes.frame(view, el.radius, el.phase + i * step);
      ctx.beginPath();
      CC.OrbitShapes.quad(ctx, F, -w / 2, -h - 0.004, w / 2, h + 0.006);
      ctx.fill(); ctx.stroke();
    }

    /* Lights at nodes on the inner rails. */
    ctx.fillStyle = CC.OrbitShapes.light(0.9);
    ctx.beginPath();
    var lr = Math.max(0.5, S * 0.0018);
    for (i = 0; i < el.lights.length; i++) {
      if (el.cells && !el.cells[el.lights[i].i]) continue;
      var p = R[el.lights[i].k][el.lights[i].i];
      ctx.moveTo(p.x + lr, p.y); ctx.arc(p.x, p.y, lr, 0, TAU);
    }
    ctx.fill();
    ctx.restore();
  }

  /* ---- the swarm --------------------------------------------------------- */

  /* A window lit or dark, steady per slab. */
  function lit(seed, k) {
    var x = Math.sin(seed * 9301.7 + k * 49.3) * 43758.5;
    return x - Math.floor(x) > 0.3;
  }

  /* ONE SLAB, in its own frame: x along it, outward from the star, y
   * across, the flat face at -h/2 and the jagged side beyond +h/2; a strata
   * line, a row of windows, a metal port and its light at one end or both.
   *
   * ON ITS OWN RADIAL (D301): a long body in orbit settles with its long
   * axis toward what it orbits (gravity-gradient stabilization), which
   * also turns only its small end to the star, a heat shield, and gives
   * every colony the same exposure. Level in the picture, the slabs in the
   * corners sat at odd angles to the star; turned to the orbit, each row
   * read as a dashed line. Lit from the end that faces the star. */
  function slab(ctx, view, B, stone, st, S, alpha) {
    var F = CC.OrbitShapes.frame(view, B.r, B.a);
    function T(x, y) { return F(y, x); }
    var w = B.w, h = B.h, hw = w / 2;
    var lw = Math.max(0.35, h * S * 0.08);
    function path(pts) {
      for (var i = 0; i < pts.length; i++) {
        var q = T(pts[i][0], pts[i][1]);
        if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      }
    }

    /* The ports first, so the stone overlaps their roots. A single port
     * goes on the outer end, away from the star. */
    var ends = B.port === 2 ? [-1, 1] : [1];
    ctx.fillStyle = st.hull;
    ctx.strokeStyle = st.trim;
    ctx.lineWidth = lw;
    var e, lights = [];
    for (e = 0; e < ends.length; e++) {
      var sx = ends[e], x0 = sx * hw * 0.92, x1 = sx * (hw + w * 0.09);
      ctx.beginPath();
      path([[x0, -h * 0.30], [x1, -h * 0.30], [x1, h * 0.04], [x0, h * 0.04]]);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      lights.push(T(x1, -h * 0.13));
    }

    /* The stone, shaded from the side facing the star. */
    var g0 = T(-hw, 0), g1 = T(hw, 0);
    var g = ctx.createLinearGradient(g0.x, g0.y, g1.x, g1.y);
    g.addColorStop(0, stone.lit);
    g.addColorStop(0.45, stone.mid);
    g.addColorStop(1, stone.shade);
    ctx.fillStyle = g;
    var outline = [[-hw, -h * 0.5], [hw, -h * 0.5], [hw * 0.95, h * 0.4]];
    for (var j = 0; j < B.jag.length; j++) {
      outline.push([hw - (j + 1) * w / (B.jag.length + 1), h * (0.1 + B.jag[j])]);
    }
    outline.push([-hw * 0.95, h * 0.3]);
    ctx.beginPath(); path(outline); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = stone.trim;
    ctx.stroke();

    /* The flat face catching the light, and a strata line. */
    ctx.strokeStyle = stone.lit;
    ctx.beginPath(); path([[-hw, -h * 0.5], [hw, -h * 0.5]]); ctx.stroke();
    ctx.strokeStyle = stone.trim;
    ctx.beginPath(); path([[-hw * 0.8, h * 0.12], [hw * 0.8, h * 0.12]]); ctx.stroke();

    /* The colony inside: a row of windows under the flat face. */
    ctx.fillStyle = CC.OrbitShapes.light(0.92 * alpha);
    ctx.beginPath();
    var wr = Math.max(0.4, h * S * 0.09);
    for (var k = 0; k < 6; k++) {
      if (!lit(B.win, k)) continue;
      var q = T(-hw * 0.7 + hw * 1.4 * (k + 0.5) / 6, -h * 0.2);
      ctx.moveTo(q.x + wr, q.y); ctx.arc(q.x, q.y, wr, 0, TAU);
    }
    ctx.fill();

    /* A light on each port. */
    ctx.fillStyle = "rgba(255,90,70," + 0.95 * alpha + ")";
    ctx.beginPath();
    var lr = Math.max(0.45, h * S * 0.11);
    for (e = 0; e < lights.length; e++) {
      ctx.moveTo(lights[e].x + lr, lights[e].y); ctx.arc(lights[e].x, lights[e].y, lr, 0, TAU);
    }
    ctx.fill();
  }

  function dysonSwarm(ctx, view, el, st) {
    var S = view.px(1);
    var alpha = el.alpha === undefined ? 1 : el.alpha;
    var s = el.stone;
    var stone = {
      lit: CC.Color.hsva(s.h, s.s * 0.6, Math.min(1, s.v + 0.30), alpha),
      mid: CC.Color.hsva(s.h, s.s, s.v, alpha),
      shade: CC.Color.hsva(s.h, s.s * 1.2, s.v * 0.42, alpha),
      trim: CC.Color.hsva(s.h, s.s * 1.2, s.v * 0.22, alpha)
    };
    ctx.save();
    ctx.lineJoin = "round";
    for (var i = 0; i < el.slabs.length; i++) slab(ctx, view, el.slabs[i], stone, st, S, alpha);
    ctx.restore();
  }

  CC.Primitives.register({ "dyson-shell": dysonShell, "dyson-swarm": dysonSwarm });
  CC.Primitives.registerStyle("dyson-swarm", function (colour, el, alpha) {
    return CC.DrawDetails.hullFill(colour, el, alpha);
  });
  CC.Primitives.registerStyle("dyson-shell", function (colour, el, alpha) {
    return CC.DrawDetails.hullFill(colour, el, alpha);
  });
})();
