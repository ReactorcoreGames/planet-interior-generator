/* Built structure — the regular, ruled marks of things that were made.
 *
 *   truss   a straight strut between two radii along one bearing: a pillar
 *           across a void, a conduit through a band. Rails and cross-bracing
 *           where it is wide enough to show them, a single hard line where
 *           it is not. `beam` is the same strut between two pixel points.
 *
 * Takes `style` as hullFill's {hull, lit, shade, trim} set. Pixels enter
 * only through `view`, so a truss is the same strut at every resolution.
 *
 * draw/primitives.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  /* A STRUT. `el`: angle (radians), r0..r1 (body radius), width (body
   * radius). Below about two and a half pixels across, rails and bracing
   * cannot both be seen, so it is one line with the shade colour; above it,
   * a dim web between two lit rails, braced with alternating diagonals —
   * nothing in nature has diagonals in a rectangle. */
  function truss(ctx, view, el, style) {
    beam(ctx, view.at(el.r0, el.angle), view.at(el.r1, el.angle), view.px(el.width), style);
  }

  /* The same strut between any two pixel points, `w` pixels across: a
   * gantry, a crane's jib (draw/woundscaffold.js). */
  function beam(ctx, a, b, w, style) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.5) return;
    var ux = dx / len, uy = dy / len;
    var nx = -uy * w / 2, ny = ux * w / 2;

    ctx.save();
    if (w < 2.5) {
      ctx.strokeStyle = style.hull;
      ctx.lineWidth = Math.max(0.6, w);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    /* The web: a faint fill so the strut has body. */
    ctx.fillStyle = style.shade;
    ctx.beginPath();
    ctx.moveTo(a.x + nx, a.y + ny);
    ctx.lineTo(b.x + nx, b.y + ny);
    ctx.lineTo(b.x - nx, b.y - ny);
    ctx.lineTo(a.x - nx, a.y - ny);
    ctx.closePath();
    ctx.fill();

    /* Bracing, one bay roughly as long as the strut is wide. */
    var bays = Math.max(1, Math.round(len / (w * 1.4)));
    ctx.strokeStyle = style.trim;
    ctx.lineWidth = Math.max(0.5, w * 0.12);
    ctx.beginPath();
    for (var k = 0; k < bays; k++) {
      var t0 = k / bays, t1 = (k + 1) / bays;
      var s = (k % 2) ? 1 : -1;
      ctx.moveTo(a.x + dx * t0 + nx * s, a.y + dy * t0 + ny * s);
      ctx.lineTo(a.x + dx * t1 - nx * s, a.y + dy * t1 - ny * s);
    }
    ctx.stroke();

    /* The rails. */
    ctx.strokeStyle = style.lit;
    ctx.lineWidth = Math.max(0.6, w * 0.22);
    ctx.beginPath();
    ctx.moveTo(a.x + nx, a.y + ny); ctx.lineTo(b.x + nx, b.y + ny);
    ctx.moveTo(a.x - nx, a.y - ny); ctx.lineTo(b.x - nx, b.y - ny);
    ctx.stroke();
    ctx.restore();
  }

  CC.Primitives.register({ "truss": truss });
  CC.Primitives.beam = beam;
})();
