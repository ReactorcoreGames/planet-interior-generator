/* The element primitive library — the drawing vocabulary.
 *
 * One function per primitive, all with the same signature:
 *
 *     draw(ctx, view, el, style)
 *
 * `el` is a generated element in normalized body space; `style` supplies the
 * colour. THIS FILE CONTAINS NO ROLE NAMES AND NO ARCHETYPE NAMES. It draws
 * whatever `el.kind` says and knows nothing about planets, crusts or oceans —
 * dispatch happens through the KINDS table at the bottom. If a body type ever
 * needs a branch in here, the design has gone wrong and the fix belongs in
 * data/elements.js.
 *
 * Pixels enter only through `view`. Every position is view.at(), every length
 * view.px(), every stroke view.lw(). That is what makes the same body the same
 * picture at 240px and at 4320px. */

var CC = CC || {};

CC.Primitives = (function () {
  "use strict";

  var TAU = CC.Math.TAU;
  var clamp = CC.Math.clamp;

  /* ---- speckle ---------------------------------------------------------- */

  /* Scattered dots — grain, dust, stipple. The workhorse: this is where most
   * of the element count goes, and it is what turns a flat band into material.
   *
   * Drawn as one path per call by the batch renderer in draw/details.js, so a
   * thousand dots cost one fill rather than a thousand.
   *
   * The size floor is the important part. A grain is authored at a few
   * thousandths of the body radius, which at preview size is a fraction of a
   * pixel — a sub-pixel arc renders as nothing at all, which is exactly how
   * the first pass came out invisible. Grains are floored at a real pixel so
   * they stay material at any resolution. */
  function speckle(ctx, view, el, style) {
    var p = view.at(el.radius, el.angle);
    var r = Math.max(0.55, view.px(el.size));
    ctx.moveTo(p.x + r, p.y);
    ctx.arc(p.x, p.y, r, 0, TAU);
  }

  /* ---- blob ------------------------------------------------------------- */

  /* An irregular filled shape — deposits, pockets, inclusions. Built as a
   * closed loop of radii wobbled around a centre, so no two are alike. */
  function blob(ctx, view, el, style) {
    var c = view.at(el.radius, el.angle);
    var base = view.px(el.size);
    var lobes = el.lobes || 6;
    var rough = el.rough === undefined ? 0.3 : el.rough;
    var squash = el.squash === undefined ? 1 : el.squash;

    ctx.beginPath();
    for (var i = 0; i <= lobes; i++) {
      var t = (i / lobes) * TAU;
      /* A cheap deterministic wobble from the element's own seed — no RNG
       * call at draw time, so redrawing never changes the shape. */
      var w = 1 + Math.sin(t * 2.3 + el.seed * 31.7) * rough
                + Math.sin(t * 3.7 + el.seed * 11.3) * rough * 0.5;
      var rr = base * w;
      var x = c.x + Math.cos(t) * rr;
      var y = c.y + Math.sin(t) * rr * squash;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = style;
    ctx.fill();
  }

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

  /* ---- arc-band --------------------------------------------------------- */

  /* An angular band following the layer's curvature — strata, current arcs,
   * cloud belts, swirl bands. Stroked rather than filled, with a round cap, so
   * it reads as a soft streak rather than a hard segment. */
  function arcBand(ctx, view, el, style) {
    var span = el.arc || 0.6;
    var steps = Math.max(6, Math.round(span * 14));

    /* A DEPTH FILL — an arc-band standing in for a crater.
     *
     * The band is a thick round-capped stroke, so a concentric gradient across
     * its width darkens the middle of the stroke and leaves its edges the
     * colour of the surrounding rock: a pit with a shadowed floor and a rim
     * that meets the ground. Same {rim, mid, floor} triple the wedge takes. */
    if (style && style.rim) {
      var w = Math.max(0.5, view.px(el.thickness || el.size));
      var rc = view.px(el.radius);
      var g0 = Math.max(0, rc - w * 0.5);
      var g1 = rc + w * 0.5;
      if (g1 - g0 > 0.5) {
        var g = ctx.createRadialGradient(view.cx, view.cy, g0,
                                         view.cx, view.cy, g1);
        /* Darkest just inside the middle — the floor of the pit — easing back
         * to the rim colour at both edges. */
        g.addColorStop(0, style.rim);
        g.addColorStop(0.38, style.floor);
        g.addColorStop(0.62, style.mid);
        g.addColorStop(1, style.rim);
        style = g;
      } else {
        style = style.floor;
      }
    }

    ctx.strokeStyle = style;
    ctx.lineWidth = Math.max(0.5, view.px(el.thickness || el.size));
    ctx.lineCap = "round";
    ctx.beginPath();
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var a = el.angle + (t - 0.5) * span;
      /* A slight radial drift along the arc keeps it from looking like a
       * perfect circle segment, which would read as mechanical. */
      var r = el.radius + Math.sin(t * Math.PI) * el.size * 0.18
                        * (el.seed > 0.5 ? 1 : -1);
      var p = view.at(r, a);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  /* ---- gradient-band ---------------------------------------------------- */

  /* A full concentric band with soft edges — atmosphere sub-bands, compression
   * rings, the ocean's depth gradient. Drawn as a radial gradient that fades
   * at both edges, so it layers over the band fill without a visible seam. */
  function gradientBand(ctx, view, el, style) {
    var half = Math.max(0.002, el.size);
    var r0 = Math.max(0, el.radius - half);
    var r1 = el.radius + half;

    var g = ctx.createRadialGradient(view.cx, view.cy, view.px(r0),
                                     view.cx, view.cy, view.px(r1));
    g.addColorStop(0, style.edge);
    g.addColorStop(0.5, style.mid);
    g.addColorStop(1, style.edge);

    ctx.beginPath();
    ctx.arc(view.cx, view.cy, view.px(r1), 0, TAU);
    ctx.arc(view.cx, view.cy, view.px(r0), 0, TAU, true);
    ctx.fillStyle = g;
    ctx.fill("evenodd");
  }

  /* ---- cell ------------------------------------------------------------- */

  /* A convection cell: a closed circulation loop.
   *
   * Drawn as an ellipse elongated along the layer (because convection cells
   * are wider than they are tall in a thin shell) with a curl inside it
   * indicating which way it turns. The curl is what makes the layer read as
   * genuinely circulating rather than as a field of rings. */
  /* A convection cell reads as CIRCULATION, which means an open spiral — not
   * a closed filled ellipse.
   *
   * The first version drew a stroked ellipse with a faint fill and an inner
   * curl. Every cell came out as a small filled oval lying the same way, and a
   * mantle full of them read as bubble wrap rather than as a moving layer. The
   * fill is gone, the outline is now a broken arc rather than a closed loop,
   * and the spiral is the primary shape instead of a decoration inside one. */
  function cell(ctx, view, el, style) {
    var c = view.at(el.radius, el.angle);
    var rx = view.px(el.size);
    var ry = view.px(el.size * 0.66);
    var spin = el.spin || 1;

    ctx.save();
    ctx.translate(c.x, c.y);
    /* Lie along the body's curvature — the cell is wider than it is deep in a
     * shell — plus a per-cell tilt so a ring of them is not uniform. */
    ctx.rotate(el.angle + (el.seed - 0.5) * 0.9);

    ctx.strokeStyle = style.line;
    ctx.lineCap = "round";
    ctx.lineWidth = view.lw(el.tier === 0 ? 1.6 : el.tier === 1 ? 1.2 : 0.9);

    /* An open spiral: about one and a half turns, winding inward. Reads as
     * rotation because it does not close, and the direction is legible from
     * which way it winds. */
    var turns = 1.55;
    var steps = el.tier <= 1 ? 30 : 18;
    ctx.beginPath();
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var ang = spin * (t * turns * TAU) + el.seed * TAU;
      var rr = 1 - t * 0.78;
      var x = Math.cos(ang) * rx * rr;
      var y = Math.sin(ang) * ry * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.restore();
  }

  /* ---- arrow ------------------------------------------------------------ */

  /* A directional indicator — the sun-cutaway-diagram arrow. This is the most
   * explicitly diagrammatic element in the vocabulary and the clearest signal
   * that a layer moves. */
  function arrow(ctx, view, el, style) {
    var dir = el.outward === undefined ? 1 : el.outward;
    var len = el.length || el.size;
    var r0 = el.radius;
    var r1 = el.radius + len * dir;
    var lean = el.lean || 0;

    /* The shaft curves, because a straight arrow in a circular layer looks
     * like it escaped from a different diagram. */
    /* THE SHAFT TAPERS AND THE CURVE ACCELERATES (D62), for the same reason
     * the flow line does: a constant-width shaft on a constant arc is a
     * diagram of movement, where a thickening, whipping one is movement. This
     * is the most explicitly diagrammatic element in the set and it should
     * still look driven rather than drafted. */
    var steps = 10;
    var apts = [];
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var r = r0 + (r1 - r0) * t;
      var a = el.angle + lean * (t * 0.10 + t * t * 0.30);
      apts.push(view.at(r, a));
    }

    var abase = view.lw(el.tier === 0 ? 2.3 : 1.7);
    ctx.lineCap = "round";
    ctx.strokeStyle = style;
    for (i = 1; i <= steps; i++) {
      var au = i / steps;
      /* Thin at the tail, THICKEST just behind the head — the opposite of the
       * flow line, because an arrow's weight belongs at its point. */
      ctx.lineWidth = Math.max(0.35, abase * (0.32 + 0.68 * au));
      ctx.beginPath();
      ctx.moveTo(apts[i - 1].x, apts[i - 1].y);
      ctx.lineTo(apts[i].x, apts[i].y);
      ctx.stroke();
    }

    /* The head. Drawn as a filled triangle at the tip, oriented along the
     * shaft's final direction. */
    var tipA = el.angle + lean * 0.40;
    var tip = view.at(r1, tipA);
    var back = view.at(r1 - len * dir * 0.30, el.angle + lean * 0.26);
    var dx = tip.x - back.x, dy = tip.y - back.y;
    var mag = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= mag; dy /= mag;
    /* A wider head. At 0.16 the arrows read as tick marks at preview size;
     * the head is the part that says "direction", so it earns the pixels. */
    var w = view.px(len * 0.23);

    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(back.x - dy * w, back.y + dx * w);
    ctx.lineTo(back.x + dy * w, back.y - dx * w);
    ctx.closePath();
    ctx.fillStyle = style;
    ctx.fill();
  }

  /* ---- flow-line -------------------------------------------------------- */

  /* A curved motion line with no head — subtler circulation. Used where an
   * arrow would overstate the movement (ARCHITECTURE: "cores and solid
   * surfaces get motion lines rather than arrows"). */
  function flowLine(ctx, view, el, style) {
    var dir = el.outward === undefined ? 1 : el.outward;
    var len = el.length || el.size;
    var lean = el.lean || 0;
    var steps = 14;

    /* A STREAK, NOT A CHALK LINE (D62).
     *
     * Drawn at one width, one alpha and a gentle even curve, these read as
     * pale chalk scribbles rather than as moving material — reported exactly
     * that way. Three changes, none of which cost a second element:
     *
     *   - it TAPERS, thick where the material is and thinning to nothing as it
     *     goes, which is what gives a streak a direction on its own;
     *   - it CURVES HARDER along its length, so the far end whips rather than
     *     drifting — an even arc reads as drawn, an accelerating one as flung;
     *   - it BRIGHTENS toward the head, so the eye is led along it.
     *
     * The taper needs segment-by-segment strokes rather than one path, since a
     * single stroke has one width. That is more calls, but these are short
     * lines and the alternative — a filled ribbon like the lode — would lose
     * the soft round-capped look that suits a fluid. */
    var pts = [];
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var r = el.radius + len * dir * t;
      /* The lean is applied on a rising curve, so the streak accelerates
       * around the body instead of following a constant arc. */
      var a = el.angle + lean * (t * 0.22 + t * t * 0.55)
              + Math.sin(t * 3.3 + el.seed * 17.1) * 0.028;
      pts.push(view.at(r, a));
    }

    var base = view.lw(el.tier === 0 ? 1.9 : el.tier === 1 ? 1.35 : 0.95);
    ctx.lineCap = "round";
    ctx.strokeStyle = style;

    for (i = 1; i <= steps; i++) {
      var u = i / steps;
      /* Full width at the tail, tapering to a point at the head. */
      ctx.globalAlpha = 0.35 + 0.65 * u;
      ctx.lineWidth = Math.max(0.3, base * (1 - u * 0.82));
      ctx.beginPath();
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* ---- wedge ------------------------------------------------------------ */

  /* A tapering polar shape — ice caps, impact basins, missing sections.
   *
   * Wide at the layer's outer edge and narrowing inward, which is what makes a
   * cap read as lying ON the surface rather than as a slice cut out of it. The
   * edges are eased rather than straight, because a hard-edged wedge reads as
   * a pie chart segment; the taper plus the soft flanks are what turn the same
   * geometry into a cap of material.
   *
   * `el.size` is the HALF-ANGLE in radians, so a wedge's extent responds to
   * the Density slider by growing rather than by multiplying — TRAIT-SYSTEM's
   * point that ice caps read the slider as extent, not as count. */
  function wedge(ctx, view, el, style) {
    var half = Math.max(0.01, el.size);
    var rOut = el.radius;
    var rIn = el.inner === undefined ? el.radius * 0.9 : el.inner;
    var steps = Math.max(10, Math.round(half * 40));

    /* A DEPTH GRADIENT, DARKENING TOWARD THE BODY'S CENTRE.
     *
     * An impact basin filled flat reads as a grey patch laid on the crust —
     * the shape says "excavation" but the colour says "sticker". What sells a
     * hole is that its floor is in shadow: the deeper into the rock you look,
     * the less light reaches, so the fill has to run from the surrounding
     * material at the rim to near-black at the bottom.
     *
     * The gradient is CONCENTRIC (both circles centred on the body), so it
     * runs along the wedge's own radial axis — down toward the planet's centre
     * — rather than across it. That is what makes the darkening read as depth
     * instead of as a directional light.
     *
     * `style` arrives as a {rim, mid, floor} triple of ready colour stops when
     * the element asked for depth, and as a plain fill otherwise. Colour is
     * resolved in draw/details.js as it is for every other primitive, so this
     * function still mixes nothing and knows nothing about palettes. */
    if (style && style.rim) {
      var gOut = view.px(rOut);
      var gIn = view.px(rIn);
      if (gOut - gIn > 0.5) {
        var g = ctx.createRadialGradient(view.cx, view.cy, gIn,
                                         view.cx, view.cy, gOut);
        g.addColorStop(0, style.floor);
        g.addColorStop(0.45, style.mid);
        g.addColorStop(1, style.rim);
        style = g;
      } else {
        /* Too thin for a gradient to read; the rim colour alone. */
        style = style.rim;
      }
    }

    ctx.beginPath();

    /* The outer edge: the full span, following the layer's curvature. */
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var a = el.angle - half + t * half * 2;
      var p = view.at(rOut, a);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }

    /* The inner edge, back the other way and narrowed. Cosine-tapered so the
     * cap comes to a soft shoulder instead of a corner. */
    for (i = steps; i >= 0; i--) {
      t = i / steps;
      var narrow = Math.cos((t - 0.5) * Math.PI) * 0.55 + 0.45;
      a = el.angle - half * narrow + t * half * 2 * narrow;
      p = view.at(rIn, a);
      ctx.lineTo(p.x, p.y);
    }

    ctx.closePath();
    ctx.fillStyle = style;
    ctx.fill();
  }

  /* ---- ring-band --------------------------------------------------------- */

  /* A concentric band beyond the body — ring systems.
   *
   * Drawn as a flat ellipse rather than a circle, because a ring seen from a
   * cutaway's viewpoint is edge-on-ish: a perfect circle would read as a halo
   * rather than as a disc of orbiting material. The squash is fixed rather
   * than rolled so every ring in a system shares one orbital plane, which is
   * most of what makes them read as a system.
   *
   * `el.gap` marks a division — drawn at much lower alpha rather than skipped,
   * so a gap reads as a thinning rather than as a missing band. */
  function ringBand(ctx, view, el, style) {
    var r = view.px(el.radius);
    var w = Math.max(0.6, view.px(el.size));
    var squash = 0.26;

    ctx.save();
    ctx.translate(view.cx, view.cy);
    ctx.scale(1, squash);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.strokeStyle = style;
    /* Divided by the squash so the stroke stays visually the authored width
     * rather than being flattened along with the geometry. */
    ctx.lineWidth = w / squash;
    ctx.stroke();
    ctx.restore();
  }

  /* ---- chunk ------------------------------------------------------------- */

  /* A small angular polygon — debris, rubble, fragments.
   *
   * Deliberately angular where `blob` is smooth: broken rock has flat faces
   * and corners, and that difference is what separates a debris belt from a
   * field of pockets without needing two colour treatments. */
  function chunk(ctx, view, el, style) {
    var c = view.at(el.radius, el.angle);
    var base = Math.max(0.7, view.px(el.size));
    var seed = el.seed || 0;
    /* MORE SIDES THAN BEFORE (3-6 became 5-9). A triangle at debris scale is
     * two or three pixels of solid colour, which is exactly what a star in the
     * background plate looks like. More corners give a silhouette that reads
     * as a broken lump even when small. */
    var sides = 5 + Math.floor(seed * 5);
    var spin = seed * TAU;

    /* `style` is a {body, lit, shadow, fleck} set when the caller wants rock
     * rather than a flat fragment; a plain fill otherwise. */
    var rich = style && style.body;

    function facePath(scale, dx, dy) {
      ctx.beginPath();
      for (var i = 0; i < sides; i++) {
        var t = (i / sides) * TAU + spin;
        /* A deterministic per-corner wobble from the element's own seed, so no
         * two chunks are the same shape and none needs an RNG. Deeper than it
         * was, so the outline is jagged rather than merely a rounded polygon —
         * broken rock has facets and notches. */
        var wob = 0.48 + 0.52 * Math.abs(Math.sin(seed * 40 + i * 2.7));
        var x = c.x + dx + Math.cos(t) * base * wob * scale;
        var y = c.y + dy + Math.sin(t) * base * wob * scale;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }

    facePath(1, 0, 0);
    ctx.fillStyle = rich ? style.body : style;
    ctx.fill();

    if (!rich) return;

    /* A LIT FACE AND A SHADOWED ONE.
     *
     * A single flat fill is the whole reason debris was mistaken for
     * starfield: a star is a small bright uniform dot, and so was a chunk.
     * Rock is not uniform — it has a face turned toward the light and one
     * turned away, and that internal contrast is what makes even a 3px mark
     * read as a solid object rather than as a point of light.
     *
     * The offset is a fixed fraction of the chunk's own size, so every
     * fragment in a belt is lit from the same direction and the belt reads as
     * one population of rocks under one sun. */
    var off = base * 0.30;
    ctx.save();
    facePath(1, 0, 0);
    ctx.clip();

    /* The shadowed side: a second copy pushed toward the light, so what
     * remains uncovered along the far edge is the dark limb of the rock. */
    ctx.beginPath();
    facePath(0.96, -off * 0.55, -off * 0.55);
    ctx.fillStyle = style.shadow;
    ctx.fill();

    /* The lit crown, smaller and offset the other way. */
    ctx.beginPath();
    facePath(0.62, off * 0.42, off * 0.42);
    ctx.fillStyle = style.lit;
    ctx.fill();

    /* SURFACE TEXTURE — a few flecks of grain per fragment.
     *
     * Pits and mineral speckle. Deterministic from the element's own seed, so
     * this stays a pure function of the element and costs no RNG. Only drawn
     * on fragments big enough to show it; below that the flecks would just
     * dirty the silhouette.
     *
     * THE THRESHOLD IS ASKED IN REFERENCE SPACE, NOT IN PIXELS. `base` is
     * `view.px(...)`, so testing it meant "big enough on this canvas" — and a
     * fragment that sat below 2.2px in the preview crossed it in a 4K export
     * and grew flecks that the preview did not have. Measured at 640x360
     * against 3840x2160: 9629 arcs became 11001, i.e. the export drew 1372
     * elements that were not in the picture it was exporting.
     *
     * That is the resolution-independence rule exactly: counts never scale
     * with pixels, and the preview is the real render. `view.fs` is the same
     * authored size the element was placed with, so the answer is the same at
     * every output size. */
    if (view.fs(el.size) > 2.2 && style.fleck) {
      ctx.fillStyle = style.fleck;
      var flecks = 2 + Math.floor(seed * 4);
      for (var f = 0; f < flecks; f++) {
        var fa = seed * 91 + f * 2.399;
        var fr = base * (0.15 + 0.62 * Math.abs(Math.sin(seed * 53 + f * 1.7)));
        var fx = c.x + Math.cos(fa) * fr;
        var fy = c.y + Math.sin(fa) * fr;
        var fs = Math.max(0.4, base * 0.15 * (0.5 + Math.abs(Math.cos(fa * 3))));
        ctx.beginPath();
        ctx.arc(fx, fy, fs, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /* ---- voronoi ---------------------------------------------------------- */

  /* A cell mosaic, via the vendored d3.Delaunay. Built for the asteroid
   * interior in Phase 7 and for ice shells; declared here so the vocabulary is
   * complete and the library is exercised.
   *
   * Takes a list of sites rather than one element, because a mosaic is a
   * single structure rather than a scattered instance. */
  function voronoi(ctx, view, sites, bounds, styleFor) {
    if (!sites.length || typeof d3 === "undefined" || !d3.Delaunay) return;

    var pts = [];
    for (var i = 0; i < sites.length; i++) {
      var p = view.at(sites[i].radius, sites[i].angle);
      pts.push(p.x, p.y);
    }

    var del = d3.Delaunay.from(
      sites.map(function (s) {
        var p = view.at(s.radius, s.angle);
        return [p.x, p.y];
      }));
    var vor = del.voronoi(bounds);

    for (i = 0; i < sites.length; i++) {
      var poly = vor.cellPolygon(i);
      if (!poly) continue;
      ctx.beginPath();
      for (var k = 0; k < poly.length; k++) {
        if (k === 0) ctx.moveTo(poly[k][0], poly[k][1]);
        else ctx.lineTo(poly[k][0], poly[k][1]);
      }
      ctx.closePath();
      ctx.fillStyle = styleFor(sites[i], i);
      ctx.fill();
    }
  }

  /* Dispatch table. draw/details.js looks a kind up here; nothing anywhere
   * switches on a layer role. */
  var KINDS = {
    "speckle": speckle,
    "blob": blob,
    "vein": vein,
    "arc-band": arcBand,
    "gradient-band": gradientBand,
    "cell": cell,
    "arrow": arrow,
    "flow-line": flowLine,
    "wedge": wedge,
    "ring-band": ringBand,
    "chunk": chunk
  };

  return {
    KINDS: KINDS,
    speckle: speckle,
    blob: blob,
    vein: vein,
    arcBand: arcBand,
    gradientBand: gradientBand,
    cell: cell,
    arrow: arrow,
    flowLine: flowLine,
    wedge: wedge,
    ringBand: ringBand,
    chunk: chunk,
    voronoi: voronoi
  };
})();
