/* Conduits — drawing the runs across layer boundaries (gen/conduits.js).
 *
 * After the bands, like the pillars (draw/scene.js), because a run belongs to
 * two layers and the void between them. Each run, from the back forward:
 *
 *   pipes     each pipe of the bundle a dark casing, a body of machined
 *             metal and a lit crown, straight and parallel
 *   collars   dark bands across the bundle at one body-space pitch
 *   sleeves   a plate wider than the bundle at every layer face it passes
 *             through: the penetration, which is what makes it read as
 *             crossing the boundary rather than lying on it
 *   ends      a junction box at each end with a status light, the accent
 *             mostly, sometimes cold white (draw/shellwalls.js lightHsv)
 *
 * Machined metal (draw/details-gas.js hullFill) rather than the band's own
 * colour: a run passes through several layers and must read as one thing
 * in all of them. Pixels enter only through `view`.
 *
 * draw/details.js and draw/shellwalls.js must load first. */

var CC = CC || {};

CC.ConduitDraw = (function () {
  "use strict";

  var TAU = Math.PI * 2;
  var COLLAR_PITCH = 0.022;

  /* A quad across the run: centred at radius r, `along` long (body radius)
   * and `across` wide (pixels), on the run's axis. */
  function plate(ctx, view, a, r, along, across) {
    var p = view.at(r - along / 2, a), q = view.at(r + along / 2, a);
    var dx = q.x - p.x, dy = q.y - p.y, l = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / l * across / 2, ny = dx / l * across / 2;
    ctx.moveTo(p.x + nx, p.y + ny); ctx.lineTo(q.x + nx, q.y + ny);
    ctx.lineTo(q.x - nx, q.y - ny); ctx.lineTo(p.x - nx, p.y - ny);
    ctx.closePath();
  }

  function run(ctx, view, c, st, light) {
    var A = view.at(c.r0, c.angle), B = view.at(c.r1, c.angle);
    var dx = B.x - A.x, dy = B.y - A.y, len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    var ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    var w = view.px(c.w), pitch = w * 1.25;
    var span = pitch * c.n;
    if (w < 1.2) {
      /* Too small for a bundle: one hard line of the metal. */
      ctx.strokeStyle = st.hull;
      ctx.lineWidth = Math.max(0.6, span * 0.8);
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      return;
    }
    /* Casing, body, and a crown half-strength: a full-strength crown made
     * the runs read as white needles (first pass). */
    var passes = [[st.trim, 1.0, 0], [st.hull, 0.70, 0], [st.lit, 0.20, -0.18]];
    for (var p = 0; p < passes.length; p++) {
      ctx.strokeStyle = passes[p][0];
      ctx.globalAlpha = p === 2 ? 0.5 : 1;
      ctx.lineWidth = Math.max(0.5, w * passes[p][1]);
      ctx.beginPath();
      for (var k = 0; k < c.n; k++) {
        var o = (k - (c.n - 1) / 2) * pitch + passes[p][2] * w;
        ctx.moveTo(A.x + nx * o, A.y + ny * o);
        ctx.lineTo(B.x + nx * o, B.y + ny * o);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    /* Collars across the bundle at an even pitch of body radius. */
    ctx.fillStyle = st.trim;
    ctx.beginPath();
    var r;
    for (r = Math.ceil(c.r0 / COLLAR_PITCH) * COLLAR_PITCH; r < c.r1; r += COLLAR_PITCH) {
      plate(ctx, view, c.angle, r, c.w * 0.55, span + w * 0.3);
    }
    ctx.fill();
    /* Sleeves at the faces, then a lit edge on each. */
    var sl = Math.max(c.w * 2.4, 0.006);
    ctx.fillStyle = st.shade;
    ctx.beginPath();
    for (var f = 0; f < c.faces.length; f++) plate(ctx, view, c.angle, c.faces[f], sl, span + w * 1.8);
    ctx.fill();
    ctx.strokeStyle = st.trim;
    ctx.lineWidth = Math.max(0.5, w * 0.22);
    ctx.stroke();
    ctx.fillStyle = st.lit;
    ctx.beginPath();
    for (f = 0; f < c.faces.length; f++) plate(ctx, view, c.angle, c.faces[f] + sl * 0.35, sl * 0.18, span + w * 1.6);
    ctx.fill();
    /* Junction boxes at the ends, and their lights. */
    var bx = c.w * 2.2;
    ctx.fillStyle = st.shade;
    ctx.beginPath();
    plate(ctx, view, c.angle, c.r0 + bx / 2, bx, span + w * 0.8);
    plate(ctx, view, c.angle, c.r1 - bx / 2, bx, span + w * 0.8);
    ctx.fill();
    ctx.strokeStyle = st.trim;
    ctx.stroke();
    var rad = Math.max(0.6, w * 0.32);
    ctx.fillStyle = light;
    ctx.beginPath();
    var ends = [c.r0 + bx / 2, c.r1 - bx / 2];
    for (var e = 0; e < 2; e++) {
      var q = view.at(ends[e], c.angle);
      ctx.moveTo(q.x + rad, q.y); ctx.arc(q.x, q.y, rad, 0, TAU);
    }
    ctx.fill();
  }

  function draw(ctx, view, conduits, palette, elementOpacity) {
    if (!conduits || !conduits.length) return;
    var alpha = elementOpacity === undefined ? 1 : elementOpacity;
    ctx.save();
    ctx.lineCap = "butt";
    for (var i = 0; i < conduits.length; i++) {
      var c = conduits[i];
      var colour = palette.get(c.role);
      ctx.globalCompositeOperation = c.blend || "source-over";
      var a = alpha * (c.opacity === undefined ? 1 : c.opacity);
      var st = CC.DrawDetails.hullFill(colour, c, a * 0.95);
      /* The status light: dark, or the emergency red, by the body's
       * activity (gen/activity.js `power`). */
      var hsv = CC.ShellWallDraw.lightHsv({ accent: colour.accent }, colour)[c.power === 2 ? 3 : (c.seed < 0.75 ? 0 : 1)];
      run(ctx, view, c, st, c.power === 0 ? "rgba(0,0,0,0)" : CC.Color.hsva(hsv[0], hsv[1] * 0.6, 1, a));
    }
    ctx.restore();
  }

  return { draw: draw };
})();
