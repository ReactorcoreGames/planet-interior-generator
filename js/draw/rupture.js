/* Rupture — cutting the wounds out of the body (js/gen/rupture.js builds
 * them).
 *
 * `begin` clips everything the body draws after it to OUTSIDE every wound's
 * outline, and `end` lifts the clip. The clip is a rectangle far larger than
 * any frame with the outlines inside it, each turned to wind AGAINST the
 * rectangle, under the nonzero rule: two wounds that overlap stay cut, where
 * even-odd would paint their overlap back in. draw/scene.js wraps the
 * body's own passes in the pair — back walls, bands, pillars, conduits,
 * details, seated fixtures — so every one of them loses the wedge without
 * knowing it exists, and what shows through is the background, as through
 * a void. Nothing here knows which archetype it is drawing.
 *
 * A no-op on any body without a rupture. */

var CC = CC || {};

CC.RuptureDraw = (function () {
  "use strict";

  var FAR = 1e5;

  /* One outline as a subpath, wound `dir` (+1 clockwise on screen, -1
   * against). */
  function path(ctx, view, poly, dir) {
    var pts = poly.map(function (q) { return view.at(q[0], q[1]); });
    var area = 0;
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length];
      area += a.x * b.y - b.x * a.y;
    }
    if (dir && (area > 0 ? 1 : -1) !== dir) pts.reverse();
    for (i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i].x, pts[i].y); else ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
  }

  /* Returns whether a clip was pushed, for `end`. */
  function begin(ctx, view, rupture) {
    if (!rupture || !rupture.wounds || !rupture.wounds.length) return false;
    ctx.save();
    ctx.beginPath();
    /* rect() winds clockwise on screen; every wound the other way. */
    ctx.rect(-FAR, -FAR, 2 * FAR, 2 * FAR);
    for (var i = 0; i < rupture.wounds.length; i++) {
      path(ctx, view, rupture.wounds[i].poly, -1);
    }
    ctx.clip("nonzero");
    return true;
  }

  function end(ctx, pushed) {
    if (pushed) ctx.restore();
  }

  return { begin: begin, end: end, path: path };
})();
