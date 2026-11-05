/* The vein family — a vein's path, and the ore lode that swells along it.
 *
 * Split out of draw/primitives.js, which passed the 500-line rule. Registered
 * into CC.Primitives; draw/primitives.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = CC.Math.TAU;
  var clamp = CC.Math.clamp;

  /* ---- vein ------------------------------------------------------------- */

  /* A branching, tapering line — mineral veins, fractures, rifts.
   *
   * Runs mostly radially with a lean, wandering as it goes. Branches split off
   * the trunk at a shallower angle, which is what makes it read as a fracture
   * network rather than as a scribble. */
  function veinPath(ctx, view, r0, a0, len, lean, steps, seed) {
    var p = view.at(r0, a0);
    ctx.moveTo(p.x, p.y);
    var r = r0, a = a0;
    for (var i = 1; i <= steps; i++) {
      var t = i / steps;
      r -= len / steps;
      /* The lean curves the vein around the body; the sine term makes it
       * wander so it is not a straight ray. */
      a += (lean / steps) * 0.5 + Math.sin(t * 5.1 + seed * 23.9) * 0.012;
      var q = view.at(r, a);
      ctx.lineTo(q.x, q.y);
    }
    return { r: r, a: a };
  }

  /* The vein's centreline as an array of points, rather than stroked straight
   * onto the context. A filled vein needs the line before it can offset either
   * side of it, and the two constructions must agree exactly or a bulk vein
   * would take a different route from a stroked one. */
  function veinPoints(view, r0, a0, len, lean, steps, seed) {
    var pts = [view.at(r0, a0)];
    var r = r0, a = a0;
    for (var i = 1; i <= steps; i++) {
      var t = i / steps;
      r -= len / steps;
      a += (lean / steps) * 0.5 + Math.sin(t * 5.1 + seed * 23.9) * 0.012;
      pts.push(view.at(r, a));
    }
    return pts;
  }

  /* A TAPERING FILLED RIBBON along a centreline — the "lode" form of a vein.
   *
   * A stroked line, however thick, is the same visual category as every other
   * stroked line in the layer. A mantle carries hundreds of flow-lines, arrows
   * and cell outlines, all thin strokes, and a trait drawn the same way is
   * simply lost among them however bright it is — which is precisely what
   * happened to Mineral Veins (D60). A FILLED shape is categorically different
   * and separates at a glance, which is what a trait has to do.
   *
   * It also makes the taper real. The stroked path set one lineWidth for the
   * whole trunk, so the "tapering" the old comment promised was never drawn.
   *
   * `swell(t)` returns the half-width at position t along the line, so the
   * caller controls both the taper and the nodules that make a lode read as
   * pockets of ore rather than as a smooth spike. */
  function ribbon(ctx, pts, swell) {
    var n = pts.length;
    if (n < 2) return;

    var i, t, dx, dy, m, nx, ny, w;
    var left = [], right = [];

    for (i = 0; i < n; i++) {
      t = i / (n - 1);

      /* The local direction, from whichever neighbours exist. */
      var a = pts[Math.max(0, i - 1)];
      var b = pts[Math.min(n - 1, i + 1)];
      dx = b.x - a.x; dy = b.y - a.y;
      m = Math.sqrt(dx * dx + dy * dy);
      if (m < 1e-6) { dx = 1; dy = 0; m = 1; }

      /* The perpendicular, which is where the width goes. */
      nx = -dy / m; ny = dx / m;
      w = swell(t);

      left.push({ x: pts[i].x + nx * w, y: pts[i].y + ny * w });
      right.push({ x: pts[i].x - nx * w, y: pts[i].y - ny * w });
    }

    ctx.moveTo(left[0].x, left[0].y);
    for (i = 1; i < n; i++) ctx.lineTo(left[i].x, left[i].y);
    for (i = n - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
  }

  /* The half-width profile of a lode: thick at the root, tapering to a point
   * at the tip, with nodules swelling it along the way.
   *
   * The nodules are what sell "a seam of ore" over "a smooth spike" — real ore
   * bodies pinch and swell rather than tapering evenly. Deterministic from the
   * element's seed, like every other shape in this file, so redrawing never
   * changes it. */
  function lodeSwell(width, seed, cycles, tipAt) {
    var tip = tipAt === undefined ? 1 : tipAt;
    if (!cycles) cycles = 3;
    return function (t) {
      /* The taper. sqrt keeps the root end full rather than thinning
       * immediately, so the vein reads as fat for most of its length.
       *
       * IT DOES NOT TAPER TO NOTHING. A shape that comes to a true point reads
       * as a crack — the eye takes the sharp end as a fracture tip — which is
       * the very thing a lode is trying not to look like. Holding a floor of
       * ~28% of the width keeps the far end a blunt seam that simply stops. */
      var taper = 0.28 + 0.72 * Math.sqrt(Math.max(0, 1 - t / tip));

      /* THE RIPPLE FREQUENCY SCALES WITH LENGTH, and that is the whole
       * difference between a seam and a bottle.
       *
       * `t` runs 0..1 over the vein whatever its actual length, so a FIXED
       * frequency gives every vein the same number of swells. At the original
       * 7.3 that was about one and a fifth cycles: one fat belly, one narrow
       * neck, one blunt end — which is a bottle, or a fish, or a stick
       * grenade. Reported as exactly those three things.
       *
       * A real ore seam pinches and swells many times along its run, and how
       * many times depends on how long it is. Driving the frequency from
       * `cycles` (computed by the caller from the vein's length) gives a long
       * vein many small ripples and a short one only a couple — so they read
       * as the same material at two sizes rather than as two objects. */
      var f1 = cycles * TAU;
      var f2 = f1 * 1.9;

      /* Deep enough to read as a rough, irregular seam. This is safe now only
       * because the FREQUENCY is right: many shallow-to-moderate ripples along
       * a long vein read as texture, where the same depth at one and a fifth
       * cycles read as a bottle's shoulder. Amplitude was never the problem —
       * the count of swells was. */
      var lumps = 1
        + 0.30 * Math.sin(t * f1 + seed * 19.1)
        + 0.17 * Math.sin(t * f2 + seed * 7.7);

      return Math.max(0.25, width * taper * lumps);
    };
  }

  /* Draw a vein in its bulk form: a filled, tapering, nodular lode with a
   * darker contour, plus the same branch structure the stroked form has.
   *
   * The branches are drawn as lodes too, at a fraction of the trunk's width,
   * so the whole thing stays one material rather than a fat trunk with wire
   * whiskers. */
  function drawLode(ctx, view, el, style, len, steps) {
    var fill = (typeof style === "string") ? style : style.fill;
    var edge = (typeof style === "string") ? null : style.edge;

    /* Authored width is a stroke width; a lode is measured as a half-width, so
     * `bulk` is the multiplier that turns one into the other. Generous by
     * design — the whole point is that this reads as fat. */
    var bulk = el.bulk === true ? 3.2 : el.bulk;
    /* `widthScale` is the per-instance girth scatter (D62), independent of the
     * length scatter, so a seam can be short and fat or long and thin. */
    var half = Math.max(0.35, view.lw((el.width || 1.2) * bulk
                                      * (el.widthScale || 1)) * 0.5);

    ctx.lineJoin = "round";

    /* HOW MANY TIMES THIS VEIN PINCHES, from how long it is RELATIVE TO ITS
     * OWN WIDTH — an aspect ratio, not an absolute length.
     *
     * A seam that is twenty times longer than it is wide should ripple many
     * times; one only four times longer should barely ripple at all. Driving
     * it from the ratio is what makes a tier-0 trunk and a tier-2 stub read as
     * the same material rather than as a big object and a small object.
     *
     * Resolution-independent: both terms are in pixels, so the ratio — and
     * therefore the number of ripples — is identical at every render size. */
    function cyclesFor(pts, w) {
      var run = 0;
      for (var i = 1; i < pts.length; i++) {
        var dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y;
        run += Math.sqrt(dx * dx + dy * dy);
      }
      /* The floor is 2.5 rather than 1.5: below about two full cycles a shape
       * has one belly and one neck, which is the bottle silhouette however
       * short it is. Every lode must ripple at least a couple of times. */
      return clamp(run / Math.max(1e-6, w * 2) * 0.45, 2.5, 10);
    }

    function one(pts, w, seed) {
      ctx.beginPath();
      ribbon(ctx, pts, lodeSwell(w, seed, cyclesFor(pts, w)));
      ctx.fillStyle = fill;
      ctx.fill();
      /* The contour. A lode with a darker edge reads as an object sitting IN
       * the rock; without it, a bright filled shape floats on top of the
       * layer like a sticker. */
      if (edge) {
        ctx.strokeStyle = edge;
        ctx.lineWidth = Math.max(0.4, view.lw(0.7));
        ctx.stroke();
      }
    }

    one(veinPoints(view, el.radius, el.angle, len, el.lean || 0, steps, el.seed),
        half, el.seed);

    var n = el.branches || 0;
    for (var b = 0; b < n; b++) {
      var frac = 0.30 + (b / Math.max(1, n)) * 0.55;
      var br = el.radius - len * frac;
      var ba = el.angle + (el.lean || 0) * frac * 0.5;
      var dir = (b % 2 === 0) ? 1 : -1;
      var blen = len * (0.30 + 0.22 * ((b * 7 + el.seed * 13) % 1));

      /* Branches start at the trunk's local width so the junction does not
       * show a step, and taper from there. */
      one(veinPoints(view, br, ba, blen,
                     (el.lean || 0) * 0.5 + dir * 0.45,
                     Math.max(4, steps - 4), el.seed + b),
          half * (0.62 - 0.10 * frac), el.seed + b);
    }
  }

  function vein(ctx, view, el, style) {
    var steps = el.tier === 0 ? 14 : el.tier === 1 ? 9 : 6;
    var len = el.length || el.size;

    /* THE BULK FORM — a filled lode rather than a stroked hairline (D60).
     *
     * Opted into per-element by `el.bulk`, so the primitive stays one function
     * with a parameter rather than splitting into two that would drift apart.
     * Crust fractures and rifts use the same `vein` kind and must stay
     * hairlines: a fracture is a crack, and a fat filled crack is wrong.
     *
     * `style` may be a plain colour string (the stroked form) or
     * {fill, edge} (the filled form) — the two-tone version is what makes it
     * read as material embedded in the rock rather than a bright scratch on
     * top of it. */
    if (el.bulk) {
      /* A FILLED lode needs far more points along the centreline than a
       * stroked one. The stroked form only had to look like a wandering line,
       * which 6-14 segments does fine; the filled form carries the pinch-and-
       * swell profile in its OUTLINE, and at 6 segments the ripples simply
       * fall between the samples and the vein comes out smooth. */
      drawLode(ctx, view, el, style, len, steps * 3);
      return;
    }

    ctx.strokeStyle = typeof style === "string" ? style : style.fill;
    ctx.lineCap = "round";

    /* Trunk. */
    ctx.lineWidth = view.lw(el.width || 1.2);
    ctx.beginPath();
    veinPath(ctx, view, el.radius, el.angle, len, el.lean || 0, steps, el.seed);
    ctx.stroke();

    /* Branches, thinner and shorter, splitting from partway along. */
    var n = el.branches || 0;
    for (var b = 0; b < n; b++) {
      var frac = 0.30 + (b / Math.max(1, n)) * 0.55;
      var br = el.radius - len * frac;
      var ba = el.angle + (el.lean || 0) * frac * 0.5;
      var dir = (b % 2 === 0) ? 1 : -1;
      var blen = len * (0.30 + 0.22 * ((b * 7 + el.seed * 13) % 1));

      ctx.lineWidth = view.lw((el.width || 1.2) * 0.55);
      ctx.beginPath();
      veinPath(ctx, view, br, ba, blen,
               (el.lean || 0) * 0.5 + dir * 0.45, Math.max(4, steps - 4),
               el.seed + b);
      ctx.stroke();
    }
  }

  CC.Primitives.register({
    "vein": vein
  });
})();
