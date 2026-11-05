/* The flow marks — the arrow, the flow line and the wedge.
 *
 * Split out of draw/primitives.js, which passed the 500-line rule. Registered
 * into CC.Primitives; draw/primitives.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

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
      var wk = view.formAt ? view.formAt(rOut, el.angle) : 1;
      var gOut = view.px(rOut) * wk;
      var gIn = view.px(rIn) * wk;
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

  CC.Primitives.register({
    "arrow": arrow,
    "flow-line": flowLine,
    "wedge": wedge
  });
})();
