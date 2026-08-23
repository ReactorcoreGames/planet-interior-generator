/* Canvas setup, framing, and the body-space -> pixel transform.
 *
 * This is where resolution independence is enforced. Everything the generator
 * produces is in NORMALIZED BODY SPACE: positions and sizes as fractions of
 * the body radius, where 1.0 is the surface. Pixels enter the picture only
 * here, at draw time.
 *
 * A `view` is the whole contract between the generator and the renderer:
 *
 *   view.cx, view.cy   centre of the body, in pixels
 *   view.R             pixel length of one unit of body radius
 *   view.px(f)         a body-space length -> pixels
 *   view.at(f, ang)    a body-space polar coord -> {x, y} pixels
 *   view.lw(w)         a line width authored at reference scale -> pixels
 *
 * Because every drawing routine goes through these, rendering the same body at
 * 240px and 4320px produces the same picture at different sizes — the same
 * elements in the same places. No count anywhere may consult view.R. */

var CC = CC || {};

CC.Canvas = (function () {
  "use strict";

  var TAU = CC.Math.TAU;
  var clamp = CC.Math.clamp;

  /* Line widths and minimum feature sizes are authored against a body drawn at
   * this radius in pixels. At other sizes they scale proportionally, so a
   * thumbnail stays legible and a 4320px export has no hairlines. */
  var REFERENCE_RADIUS = 320;

  /* Below this many pixels a stroke stops being visible at all. */
  var MIN_LINE_WIDTH = 0.4;

  /* How far Zoom goes. Past roughly 10x the vector detail runs out and the
   * render reads as smooth bands of colour rather than as a cutaway — which
   * is kept deliberately rather than clamped away, because an abstract strata
   * close-up is a legitimate output and a useful base for an artist working
   * over the top of it. The upper half of the slider is that territory. */
  var MAX_ZOOM = 20;

  /* Build the body-space -> pixel transform for a canvas of the given pixel
   * size. `bodyFrac` is Body size in frame: how much of the shorter axis the
   * body's full extent occupies. */
  function makeView(widthPx, heightPx, opts) {
    opts = opts || {};
    var bodyFrac = opts.bodyFrac === undefined ? 0.8 : opts.bodyFrac;

    /* How far out the picture reaches — atmosphere, coronae, rings and other
     * outward traits all live beyond radius 1.0. Kept because the pan clamp
     * needs to know where the outermost thing is, but note what it NO LONGER
     * does: it does not size the body.
     *
     * EXTENT WAS ACCIDENTALLY A ZOOM CONTROL, which is the second time
     * something in this file has been (see the sizing note below for the
     * first, and how it was finally removed).
     * Dividing `R` by it meant a ringed world was drawn SMALLER than a bare
     * one — every ring system announced itself by shrinking the planet, which
     * is backwards: a ring cropped by the frame reads as vast, and a ring
     * shrunk to fit reads as a decal. Worse, it made the composition depend on
     * a trait roll, so Randomize kept handing back planets too small to read,
     * and the workaround was to go and EXCLUDE rings in the trait menu — a
     * display defect driving a change to the body itself.
     *
     * So the body is now sized against radius 1.0 always. Every body is drawn
     * at the same scale, rings extend past the frame edge where they belong,
     * and framing the rings instead of the planet is what Zoom and Pan are
     * for — a choice the user makes, rather than one a trait roll makes for
     * them. */
    var extent = opts.extent === undefined ? 1.0 : Math.max(1.0, opts.extent);

    var cx = opts.cx === undefined ? widthPx / 2 : opts.cx;
    var cy = opts.cy === undefined ? heightPx / 2 : opts.cy;

    /* THE BODY IS SIZED OFF THE SHORTER AXIS OF THE BOX IT IS DRAWN INTO, and
     * off nothing else.
     *
     * THIS USED TO BE COMPLICATED AND THE COMPLICATION WAS THE BUG. The info
     * card was given room by PADDING the preview, which shrank the canvas — so
     * the box the body was sized from changed whenever the card was toggled. On
     * a tall window that made the padded WIDTH the shorter axis, and the card
     * silently became a zoom control: toggling it resized the body by up to
     * 48% and pushed it off the bottom of the frame.
     *
     * A `sizingAxis` option was added to paper over that — "size from this box,
     * draw into that one" — plus a clamp so the result could not be clipped.
     * Three boxes, two files, and every fix had to keep all three in agreement.
     * They never did: the clamp read the drawn box and quietly re-derived the
     * card dependency the sizing axis had just removed.
     *
     * THE CANVAS NO LONGER CHANGES SIZE. The card floats over a full-bleed
     * canvas and the room it needs is a shift of `cx` (see `offsetX` below), so
     * there is exactly one box, the body is sized from it, and the card cannot
     * affect the body's size because it no longer affects anything the size is
     * computed from. Sizing, clamping and the whole `sizingAxis` concept go
     * away with it. */
    var shorter = Math.min(widthPx, heightPx);
    var R = (shorter * clamp(bodyFrac, 0.1, 1.0)) / 2;

    /* THE ROOM THE INFO CARD NEEDS, as a shift of the body's centre.
     *
     * Positive moves the body left. Applied before zoom and pan so it is part
     * of the composition rather than part of the framing: the user's pan is
     * still measured from wherever the body sits, and Reset framing returns to
     * this offset rather than to the raw centre.
     *
     * Deliberately does NOT depend on whether the card is visible. The body is
     * in the same place either way, so toggling the card cannot move, resize or
     * crop the render — which is what makes the defect class closed rather than
     * merely fixed. */
    cx -= (opts.offsetX || 0) / 2;

    /* --- FRAMING: zoom and pan -------------------------------------------
     *
     * The whole feature, and deliberately the only place it exists. Every
     * drawing routine reaches pixels through `px`/`at`/`lw`/`fs`, so patching
     * the three numbers those close over frames the entire scene — no drawing
     * code knows this happened, and none of it needs to.
     *
     * ZOOM 1 WITH NO PAN IS THE IDENTITY, byte-for-byte the old behaviour.
     * That is why framing is a VALUE rather than a MODE: there is no state to
     * be in wrongly, nothing to remember while switched off, and "reset" is
     * just writing 1/0/0 back.
     *
     * PAN IS IN BODY-RADIUS UNITS, not pixels. A pan of 0.5 means "half a
     * radius", which means the same thing on a 1280px preview and a 4320px
     * export, at any zoom — so a settings string reframes to the same feature
     * on someone else's monitor. Multiplying by the ZOOMED `R` is what makes
     * it hold: dragging one radius left moves the body one radius, whether
     * that is 300px or 6000px on the day.
     *
     * RESOLUTION INDEPENDENCE IS UNTOUCHED. Zoom moves `R` and `cx`/`cy` and
     * nothing else; no count anywhere consults them. A 4x zoom is the same
     * body drawn larger — the same elements in the same places — not a body
     * that grew more detail on the way in. */
    var zoom = opts.zoom === undefined ? 1 : clamp(opts.zoom, 1, MAX_ZOOM);
    R *= zoom;
    cx -= (opts.panX || 0) * R;
    cy -= (opts.panY || 0) * R;

    var scale = R / REFERENCE_RADIUS;

    var view = {
      width: widthPx,
      height: heightPx,
      cx: cx,
      cy: cy,
      R: R,
      scale: scale,
      extent: extent,
      zoom: zoom,

      /* body-space length -> pixels */
      px: function (f) { return f * R; },

      /* body-space polar (radius fraction, angle in radians) -> pixel point.
       * Angle 0 points up (the pole), increasing clockwise, because bodies are
       * generated pole-up and rotated at the end. */
      at: function (f, ang) {
        var r = f * R;
        return { x: cx + Math.sin(ang) * r, y: cy - Math.cos(ang) * r };
      },

      /* A line width authored at reference scale -> pixels, floored so it
       * never vanishes entirely. */
      lw: function (w) { return Math.max(MIN_LINE_WIDTH, w * scale); },

      /* A feature size authored at reference scale -> pixels, floored so tiny
       * elements stay visible in a thumbnail. */
      fs: function (s) { return Math.max(0.5, s * scale); }
    };

    return view;
  }

  /* Size a canvas element for its CSS box at the device pixel ratio, so the
   * preview is crisp on a HiDPI screen. Returns the drawing size in CSS px;
   * the returned context is pre-scaled, so all drawing code works in CSS px
   * and never sees the DPR.
   *
   * THE FIRST MEASUREMENT CAN BE A LIE, and it produced a real defect: the very
   * first body drawn after a page load came out as a squished OVAL, and any
   * redraw afterwards — Randomize, a slider, a resize — was a correct circle.
   *
   * A `<canvas>` has an INTRINSIC SIZE OF 300x150 whenever CSS has not yet
   * resolved its box. `#stage` is `width:100%; height:100%` inside a flex
   * container, so if `draw()` runs before that layout has been performed, the
   * rect comes back at or near 300x150 — a 2:1 box. The backing store was then
   * sized 2:1 while CSS stretched the element to fill a roughly 3:2 preview,
   * and the browser scaled the difference. Every circle in the render became an
   * ellipse, which is exactly the failure that looks like a rendering bug and
   * is actually a measurement one.
   *
   * So a rect that layout has not resolved yet is discarded and the PARENT's
   * box is used instead — the parent is a laid-out block with real dimensions
   * well before the canvas's percentage height resolves. `requestDraw` on the
   * next frame then corrects anything this could not know; the point here is
   * only that the first frame must not be drawn into a wrong-aspect backing
   * store.
   *
   * THE CHECK USED TO BE EXACTLY 300x150 AND THAT WAS TOO NARROW. Layout does
   * not always resolve both axes at once: `#stage` is `width:100%;height:100%`
   * in a flex column, so the width can come back from the flex row while the
   * percentage height is still unresolved. The rect is then something like
   * 900x150 — not the intrinsic default, so the old equality missed it, and a
   * 6:1 box was taken at face value. That is a WORSE oval than the one the
   * guard was written to catch.
   *
   * BUT "SMALLER THAN THE PARENT" IS NOT THE SIGNAL EITHER, and reaching for it
   * is a mistake worth recording: a canvas is perfectly entitled to be smaller
   * than its parent, and overriding it then breaks every deliberately-sized
   * canvas — an export, a thumbnail — by silently inflating it to the parent's
   * box.
   *
   * The thing that actually goes wrong is the ASPECT RATIO, because that is
   * what the backing store is built from and what turns a circle into an
   * ellipse. An unresolved axis skews it by a factor; a canvas that is honestly
   * smaller keeps its parent's proportions, since it is `width:100%` of
   * something. So the test is whether the canvas's ratio disagrees with the
   * parent's — which catches 300x150 and 900x150 alike, and leaves an
   * intentionally-sized 900x600 in a 1528x1080 preview alone. */
  function fitToDisplay(canvas, dpr) {
    var rect = canvas.getBoundingClientRect();
    var cssW = Math.max(1, Math.round(rect.width));
    var cssH = Math.max(1, Math.round(rect.height));

    if (canvas.parentNode && canvas.parentNode.getBoundingClientRect) {
      var host = canvas.parentNode.getBoundingClientRect();
      /* The parent carries the preview's padding, which the canvas box would
       * have excluded. Measured off `clientWidth`/`clientHeight` where they are
       * available, since those are the content box and so already exclude it. */
      var hw = canvas.parentNode.clientWidth || Math.round(host.width);
      var hh = canvas.parentNode.clientHeight || Math.round(host.height);

      if (hw > 1 && hh > 1) {
        /* A fifth of slack. Rounding and a scrollbar move the ratio by a
         * percent or so; an unresolved percentage height moves it by a factor
         * of several, so there is a wide gap between the two and no need to
         * sit close to either edge. */
        var ratioCanvas = cssW / cssH;
        var ratioHost = hw / hh;
        var skew = ratioCanvas > ratioHost ? ratioCanvas / ratioHost
                                           : ratioHost / ratioCanvas;
        if (skew > 1.2) { cssW = hw; cssH = hh; }
      }
    }

    var ratio = dpr || (typeof window !== "undefined" && window.devicePixelRatio) || 1;

    canvas.width = Math.round(cssW * ratio);
    canvas.height = Math.round(cssH * ratio);

    var ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { ctx: ctx, width: cssW, height: cssH, dpr: ratio };
  }

  /* Backgrounds. Draw order step 1. */
  function drawBackground(ctx, w, h, mode, opts) {
    opts = opts || {};

    if (mode === "transparent") {
      ctx.clearRect(0, 0, w, h);
      return;
    }

    ctx.clearRect(0, 0, w, h);

    if (mode === "solid") {
      ctx.fillStyle = opts.color || "#0a0c14";
      ctx.fillRect(0, 0, w, h);
      return;
    }

    if (mode === "gradient") {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, opts.color || "#10131f");
      g.addColorStop(1, CC.Color.shadeHex(opts.color || "#10131f", -0.6));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    /* starfield */
    ctx.fillStyle = opts.color || "#05070e";
    ctx.fillRect(0, 0, w, h);
    drawStarfield(ctx, w, h, opts);
  }

  /* Stars are placed in fractions of the canvas, so the field is the same
   * picture at any resolution — the same rule as body elements. */
  function drawStarfield(ctx, w, h, opts) {
    var density = opts.density === undefined ? 0.6 : opts.density;
    var rng = CC.RNG.stream(opts.seed === undefined ? "stars" : opts.seed, "starfield");
    var count = Math.round(220 + density * 700);
    var diag = Math.sqrt(w * w + h * h);
    var unit = diag / 1400; /* reference diagonal, so star size tracks frame size */

    ctx.save();
    for (var i = 0; i < count; i++) {
      var x = rng() * w;
      var y = rng() * h;
      var t = rng();
      /* Three size tiers: many tiny, some small, a few bright. */
      var r, a;
      if (t < 0.72) { r = 0.45 * unit; a = 0.18 + rng() * 0.32; }
      else if (t < 0.955) { r = 0.85 * unit; a = 0.30 + rng() * 0.40; }
      else { r = 1.35 * unit; a = 0.55 + rng() * 0.45; }

      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.fillStyle = rng() < 0.86 ? "#ffffff" : (rng() < 0.5 ? "#cfe0ff" : "#ffe9c8");
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.35, r), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  return {
    REFERENCE_RADIUS: REFERENCE_RADIUS,
    MAX_ZOOM: MAX_ZOOM,
    makeView: makeView,
    fitToDisplay: fitToDisplay,
    drawBackground: drawBackground,
    drawStarfield: drawStarfield
  };
})();
