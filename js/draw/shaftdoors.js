/* Shaft doors — drawing the blast doors and silo covers
 * (js/gen/shaftdoors.js builds them).
 *
 *   door    a slab across the slot in two grey leaves, each drawn back
 *           toward the shaft's wall by `open`; the part gone into the wall
 *           is simply not drawn (pockets cut into the wall read as stray
 *           slots, the user). A thin warning tape down each leading edge,
 *           where they meet
 *   cover   a grey silo cover in the shaft's mouth, slid aside by `open`
 *           and clipped to the mouth, so it retracts into the hull rather
 *           than sitting on top of it (an overhanging plate and its rail
 *           read as a bar laid across the hull, the user); a thin warning
 *           tape along its bottom edge
 *
 * No lights: a status light on every door was one detail too many (the
 * user). Drawn inside the rupture clip, so a wound takes the doors in its
 * path. Metal is each layer's own (hullFill); the tape is the warning
 * colour of CC.ShellWallDraw.lightHsv. Lengths are body radius; nothing
 * here knows the archetype.
 *
 * draw/details.js, draw/shellwalls.js and gen/shells.js must load first. */

var CC = CC || {};

CC.ShaftDoorDraw = (function () {
  "use strict";

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* A polar quad, r0..r1 by a0..a1, as a closed subpath. */
  function quad(ctx, view, r0, r1, a0, a1) {
    var p = [view.at(r0, a0), view.at(r1, a0), view.at(r1, a1), view.at(r0, a1)];
    ctx.moveTo(p[0].x, p[0].y);
    for (var i = 1; i < 4; i++) ctx.lineTo(p[i].x, p[i].y);
    ctx.closePath();
  }

  function fill(ctx, view, colour, list) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    for (var i = 0; i < list.length; i++) quad(ctx, view, list[i][0], list[i][1], list[i][2], list[i][3]);
    ctx.fill();
  }

  /* Warning tape: a thin strip in the warning colour, dashed dark where it
   * is long enough in pixels to show it. Along the arc when `along`, else
   * across r0..r1. */
  function tape(ctx, view, r0, r1, a0, a1, warn, dark, alpha) {
    fill(ctx, view, CC.Color.hsva(warn[0], 0.85, 0.92, alpha), [[r0, r1, a0, a1]]);
    var A = view.at(r0, a0), B = view.at(r1, a1);
    var len = Math.max(Math.abs(B.x - A.x), Math.abs(B.y - A.y));
    var n = Math.floor(len / 4);
    if (n < 3) return;
    var along = Math.abs(a1 - a0) * r0 > Math.abs(r1 - r0);
    var cells = [];
    for (var k = 0; k < n; k += 2) {
      var t0 = k / n, t1 = (k + 1) / n;
      cells.push(along ? [r0, r1, a0 + (a1 - a0) * t0, a0 + (a1 - a0) * t1]
                       : [r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1, a0, a1]);
    }
    fill(ctx, view, dark, cells);
  }

  function door(ctx, view, D, st, warn, alpha) {
    var mid = (D.r0 + D.r1) / 2;
    var h = CC.Shells.halfAngle(D.half, mid);
    var tape0 = 0.0028 / mid;
    for (var k = -1; k <= 1; k += 2) {
      /* The wall edge, and inward toward the shaft's middle. */
      var edge = D.angle + k * h, inn = -k;
      var lead = edge + inn * h * (1 - D.open);
      /* The leaf in the shaft, its lit outer face, and the tape. */
      fill(ctx, view, st.grey, [[D.r0, D.r1, edge, lead]]);
      fill(ctx, view, st.edge, [[D.r1 - 0.0016, D.r1, edge, lead]]);
      tape(ctx, view, D.r0, D.r1, lead - inn * tape0, lead, warn, st.trim, alpha);
    }
  }

  function cover(ctx, view, C, st, warn, alpha) {
    var mid = (C.r0 + C.r1) / 2;
    var h = CC.Shells.halfAngle(C.half, mid);
    var shift = C.slide * C.open * h * 2;
    var a0 = C.angle - h + shift, a1 = C.angle + h + shift;
    /* Clipped to the mouth: the part slid aside has gone into the hull. */
    ctx.save();
    ctx.beginPath();
    quad(ctx, view, C.r0 - 0.0010, C.r1 + 0.0010, C.angle - h, C.angle + h);
    ctx.clip();
    var th = C.r1 - C.r0;
    fill(ctx, view, st.trim, [[C.r0, C.r1, a0 - 0.0010 / mid, a1 + 0.0010 / mid]]);
    fill(ctx, view, st.grey, [[C.r0 + 0.0010, C.r1, a0, a1]]);
    fill(ctx, view, st.edge, [[C.r1 - th * 0.22, C.r1, a0, a1]]);
    /* Two panel seams, so it reads as a hatch rather than a bar. */
    var seam = 0.0008 / mid;
    fill(ctx, view, st.trim, [[C.r0 + 0.001, C.r1 - th * 0.22, a0 + (a1 - a0) / 3 - seam, a0 + (a1 - a0) / 3 + seam],
                              [C.r0 + 0.001, C.r1 - th * 0.22, a0 + (a1 - a0) * 2 / 3 - seam, a0 + (a1 - a0) * 2 / 3 + seam]]);
    tape(ctx, view, C.r0 + 0.0010, C.r0 + 0.0034, a0, a1, warn, st.trim, alpha);
    ctx.restore();
  }

  function draw(ctx, view, doors, palette, elementOpacity) {
    if (!doors) return;
    var alpha = clamp(elementOpacity === undefined ? 1 : elementOpacity, 0, 1);
    var styles = {};
    /* Dark grey metal whatever the layer's tone: the hull's own pale fill
     * read as a white bar (the user asked for darker, twice). The layer's
     * hue, little of it. */
    function st(role) {
      if (styles[role]) return styles[role];
      var c = palette.get(role), s = CC.DrawDetails.hullFill(c, { seed: 0.4 }, alpha);
      s.grey = CC.Color.hsva(c.h, c.s * 0.45, 0.34, alpha);
      s.edge = CC.Color.hsva(c.h, c.s * 0.30, 0.52, alpha);
      s.dim = CC.Color.hsva(c.h, c.s * 0.45, 0.16, alpha);
      return (styles[role] = s);
    }
    function warn(role) { return CC.ShellWallDraw.lightHsv(palette, palette.get(role))[2]; }
    ctx.save();
    var i, M;
    for (i = 0; i < doors.doors.length; i++) {
      M = doors.doors[i];
      door(ctx, view, M, st(M.role), warn(M.role), alpha);
    }
    for (i = 0; i < doors.covers.length; i++) {
      M = doors.covers[i];
      cover(ctx, view, M, st(M.role), warn(M.role), alpha);
    }
    ctx.restore();
  }

  return { draw: draw };
})();
