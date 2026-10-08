/* Layers with no hard edge — a feathered fill, and details that ride the
 * boundary.
 *
 * Every banded layer in the generator is a filled disc with a crisp outline
 * and a stroked edge, and its details are clipped to the annulus between its
 * own boundary and the next one down. That is the right statement for rock,
 * fluid and plasma alike: each band IS a material with a surface.
 *
 * A layer that is a REGION rather than a shell says something else — "the
 * material thins out over here" — and a hard edge contradicts it however far
 * the boundary is wobbled (D156: fading TOWARDS nothing is not ending AT
 * nothing). Two general properties, both declared on the layer spec and both
 * absent on every layer that does not ask, so no existing body changes:
 *
 *   feather   0..1 — the fill fades from full to nothing over this fraction
 *             of the layer's outer radius, following the wobbled outline.
 *             A feathered layer strokes no boundary line.
 *   ride      true — the layer's details are drawn through a view warped by
 *             the layer's own boundary, so they follow its crests and
 *             troughs instead of a circle, and they are not clipped: a soft
 *             mark at the edge dissolves on its own rather than being cut.
 *   drift     [lo, hi] — the region's centre is moved off the body's by a
 *             rolled distance in a rolled direction. A wobble scales with
 *             the layer's radius, so it can never carry a small inner region
 *             across a large outer one without pinching both into petals;
 *             a shifted centre does it at any size.
 *
 * This file names no archetype and no role. */

var CC = CC || {};

CC.Feather = (function () {
  "use strict";

  /* How many nested outlines build the falloff. A canvas gradient cannot
   * follow a wobbled edge (a radial gradient is circular by definition — see
   * draw/layers.js fillOutward), so the fade is built the same way the
   * angular atmosphere is: whole closed outlines, nested, never pie slices. */
  var RINGS = 14;

  function smooth(t) { return t * t * (3 - 2 * t); }

  /* Fill a feathered layer. `style` is the band fill (a colour string or a
   * canvas gradient); `wob` the boundary function, or null for a circle.
   *
   * THE ALPHAS COMPOUND, so each ring's own alpha is solved for: ring j is a
   * disc covering everything inside r_j, painted outermost first, and after it
   * the accumulated coverage inside r_j must be A_j. Source-over gives
   * 1 - (1 - A_{j-1})(1 - a_j) = A_j, hence a_j below. The innermost disc
   * carries the layer's full opacity, so the middle of the region is exactly
   * what an unfeathered layer would have painted. */
  function fill(ctx, view, layer, style, wob) {
    var full = layer.opacity === undefined ? 1 : layer.opacity;
    var span = Math.max(0, Math.min(0.95, layer.feather));
    var w = wob || function () { return 1; };

    ctx.save();
    ctx.fillStyle = style;
    var prev = 0;
    for (var j = 1; j <= RINGS; j++) {
      /* j = 1 is the outermost ring, j = RINGS the solid inside. */
      var t = j / RINGS;
      var r = layer.outer * (1 - span * (t - 1 / RINGS) / (1 - 1 / RINGS));
      var target = full * smooth(t);
      var a = prev >= 1 ? 0 : 1 - (1 - target) / (1 - prev);
      prev = target;
      if (a <= 0.002) continue;
      ctx.globalAlpha = Math.min(1, a);
      ctx.beginPath();
      CC.Layers.traceBoundary(ctx, view, r, w, false);
      ctx.fill();
    }
    ctx.restore();
  }

  /* A view whose `at` scales every radius by the layer's boundary at that
   * bearing. Everything a primitive draws passes through `at` (D184), so the
   * whole detail pass follows the region's shape with no primitive knowing.
   * Lengths (`px`, `lw`, `fs`) are untouched: a mark keeps its size. */
  /* THE MARKS RIDE A SMOOTHED OUTLINE, NOT THE OUTLINE ITSELF. The boundary
   * carries fine octaves that are right for an edge and wrong for a mark
   * spanning a few degrees: a thread walked through them was jerked in and
   * out at every step and drew as lightning. Tabled at 360 bearings and
   * box-averaged over +-12 degrees, so the broad lobes survive and the
   * jitter does not. */
  var TABLE = 360, HALF = 12;
  function rideView(view, wob) {
    if (!wob) return view;
    var raw = new Float32Array(TABLE), sm = new Float32Array(TABLE);
    var i, k;
    for (i = 0; i < TABLE; i++) raw[i] = wob(i / TABLE * Math.PI * 2);
    for (i = 0; i < TABLE; i++) {
      var sum = 0;
      for (k = -HALF; k <= HALF; k++) sum += raw[(i + k + TABLE) % TABLE];
      sm[i] = sum / (2 * HALF + 1);
    }
    function smooth(ang) {
      var u = (ang / (Math.PI * 2)) % 1;
      if (u < 0) u += 1;
      var x = u * TABLE, j = Math.floor(x), t = x - j;
      return sm[j % TABLE] * (1 - t) + sm[(j + 1) % TABLE] * t;
    }
    var ride = Object.create(view);
    ride.at = function (f, ang) { return view.at(f * smooth(ang), ang); };
    return ride;
  }

  /* A view whose whole frame is moved by the layer's DRIFT — the region's
   * centre is not the body's. `drift` is {x, y} in body radii, resolved in
   * gen/structure.js; the body's rotation is on the context, so the offset
   * turns with it. The fill, its gradient and the riding details all take
   * this view, so they move together. Null drift returns the view itself. */
  function driftView(view, drift) {
    if (!drift) return view;
    var dx = drift.x * view.R, dy = drift.y * view.R;
    var moved = Object.create(view);
    moved.cx = view.cx + dx;
    moved.cy = view.cy + dy;
    moved.at = function (f, ang) {
      var p = view.at(f, ang);
      return { x: p.x + dx, y: p.y + dy };
    };
    return moved;
  }

  return { fill: fill, rideView: rideView, driftView: driftView };
})();
