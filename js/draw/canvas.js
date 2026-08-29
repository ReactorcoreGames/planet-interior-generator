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

    /* NO VIEWPORT CLAMP HERE, AND THAT IS DELIBERATE.
     *
     * One was tried as a second line of defence against the F11 ratchet (see
     * `#stage` in style.css) and it broke the oval guard above: clamping to
     * `window.innerHeight` truncates the parent-box substitution that guard
     * depends on, so a canvas whose box has not resolved got the clamped
     * height instead of the parent's ratio and came out squished — trading a
     * layout bug this file does not own for a rendering bug it does.
     *
     * The loop is closed in CSS, where it actually lives: the canvas is taken
     * out of flow so its intrinsic size cannot reach any ancestor. This
     * function's job is to MEASURE, and a measurement that second-guesses the
     * box it was given is how the oval defect arrived in the first place. */
    var ratio = dpr || (typeof window !== "undefined" && window.devicePixelRatio) || 1;

    canvas.width = Math.round(cssW * ratio);
    canvas.height = Math.round(cssH * ratio);

    var ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { ctx: ctx, width: cssW, height: cssH, dpr: ratio };
  }

  /* ---- backgrounds ------------------------------------------------------
   *
   * A background is a STACK, not a mode:
   *
   *   1. a base fill        the colour picker, always live
   *   2. an optional field  gradient or nebula, painted in colour1 -> colour2
   *   3. optional stars     an overlay, drawn last
   *
   * It used to be four exclusive modes, which made "stars over a blue sky"
   * unreachable and left the colour picker greyed out under Starfield even
   * though the starfield was in fact painting over that very colour. Splitting
   * the stack apart is what makes stars-over-nebula fall out for free instead
   * of needing its own menu entry — the combinatorial menu is the thing this
   * shape avoids.
   *
   * `mode` is the FIELD, and the legacy value "starfield" is still accepted as
   * an input: it means solid + stars, which is exactly what it always drew.
   * Old presets and old share strings therefore keep working without a
   * migration table. */
  function drawBackground(ctx, w, h, mode, opts) {
    opts = opts || {};

    if (mode === "transparent") {
      ctx.clearRect(0, 0, w, h);
      /* Stars are deliberately NOT drawn over a transparent background. The
       * point of Transparent is a cutout to composite elsewhere, and a field
       * of white dots on alpha zero is not a cutout. */
      return;
    }

    var stars = !!opts.stars;
    if (mode === "starfield") { mode = "solid"; stars = true; }

    var c1 = opts.color || "#05070e";
    var c2 = opts.color2 || CC.Color.shadeHex(c1, -0.6);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = c1;
    ctx.fillRect(0, 0, w, h);

    if (mode === "gradient") {
      /* THE ANGLE IS COERCED, NOT TRUSTED. A non-numeric angle makes the four
       * gradient coordinates NaN, and `createLinearGradient` does not fail
       * quietly on those — it throws, which aborts the whole frame and leaves
       * the canvas blank. A background control must not be able to black out
       * the render, so anything that is not a finite number falls back to the
       * default rather than reaching the gradient. */
      var deg = parseFloat(opts.angle);
      if (!isFinite(deg)) deg = 180;
      var ang = deg * Math.PI / 180;
      /* The gradient line runs through the centre at `angle`, sized so it
       * spans the frame's diagonal at any rotation — otherwise a 45-degree
       * gradient would band out flat before it reached the corners. */
      var half = Math.sqrt(w * w + h * h) / 2;
      var dx = Math.sin(ang) * half, dy = -Math.cos(ang) * half;
      var g = ctx.createLinearGradient(w / 2 - dx, h / 2 - dy, w / 2 + dx, h / 2 + dy);
      g.addColorStop(0, c1);
      g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    } else if (mode === "nebula") {
      drawNebula(ctx, w, h, c1, c2, opts);
    }

    if (stars) drawStarfield(ctx, w, h, opts);
  }

  /* A NEBULA IS DENSITY, NOT A SHAPE — the same thesis as the body interiors.
   * It is built from many cheap low-alpha passes rather than one clever one,
   * because that is what produces depth: overlapping veils accumulate into
   * structure no single layer contains.
   *
   * Two things separate a nebula from marbling. FILAMENTS: one octave is
   * ridged (`1 - |n|`), which turns the smooth zero-crossing of simplex into a
   * bright thread, and threads are what the eye reads as gas. And SPARSITY:
   * the field is raised to a power so most of the frame stays near the base
   * colour and only the cores light up. A nebula covering everything is a
   * background that has eaten the picture. That power is a CONSTANT: how far
   * the gas spreads is already a consequence of how light the two colours are,
   * so exposing it would duplicate the pickers. The user's nebula knob is
   * `opts.scale`, the size of the clouds — see the note beside `freq`, which
   * is the one property of this field neither picker can reach.
   *
   * Colour runs c1 -> c2 with the ends pushed slightly PAST both pickers —
   * darker than c1 in the voids, brighter than c2 in the cores. Without that,
   * two similar picks produce flat mush, and the user cannot tell the nebula
   * rendered at all. */
  function drawNebula(ctx, w, h, c1, c2, opts) {
    var seed = opts.seed === undefined ? "nebula" : opts.seed;
    var rng = CC.RNG.stream(seed, "nebula");
    /* The vendored simplex-noise publishes itself onto `window`, so it is
     * reached through whichever global object exists rather than as a bare
     * identifier — a bare reference throws outright in a context without one.
     *
     * It THROWS rather than returning quietly when the library is missing.
     * A silent return leaves the flat base fill behind, which looks exactly
     * like a nebula that rendered and happened to be subtle — the failure is
     * invisible in the picture, which is the worst way for it to fail. */
    var g = (typeof globalThis !== "undefined") ? globalThis
          : (typeof window !== "undefined") ? window : null;
    var Simplex = (typeof SimplexNoise !== "undefined") ? SimplexNoise
                : (g && g.SimplexNoise);
    if (!Simplex) throw new Error("nebula background needs lib/simplex-noise.js");
    var simplex = new Simplex(function () { return rng(); });

    /* --- NEBULA SCALE: HOW BIG THE CLOUDS ARE ----------------------------
     *
     * THE KNOB IS THE NOISE FREQUENCY, which is the one nebula control that
     * costs nothing. Two other things were tried and both were the wrong
     * lever:
     *
     *   The per-blob ALPHA scales how strong the nebula is. At the low end
     *   every veil is still present but faint, so the whole frame goes evenly
     *   murky and the cores lose the colour the second picker exists to put
     *   there — the exact failure D102 was fixed to stop.
     *
     *   The SPARSITY EXPONENT scales how much of the frame the gas covers,
     *   which sounds right and is redundant: the same result is already
     *   reachable by choosing darker or brighter nebula colours, so it is a
     *   second control for something the two pickers do.
     *
     * The FREQUENCY changes what neither of those can — the physical size of
     * the clouds. Low frequency gives a few vast billows crossing the frame,
     * high gives fine mottled filament structure. And it is near enough free:
     * the grid tracks it, so the big end draws fewer and larger blobs and the
     * small end more and smaller ones, which costs about the same either way.
     * Nothing here is resolution-dependent either, since the frequencies are
     * in CELLS rather than pixels.
     *
     * ALL THREE OCTAVES SCALE BY ONE FACTOR, deliberately. Their RATIOS are
     * what make the field read as gas — smooth mass, a mid band, and a ridged
     * octave for filaments — so moving one alone would not resize the clouds,
     * it would rebalance the texture into mush or into noise. Scaling them
     * together is a zoom of the whole field.
     *
     * The span runs about 2.4x either side of the authored figures, which sits
     * at mid-slider. Further out in both directions stops being a nebula:
     * below it there is one colour wash and no structure in frame, above it
     * the filaments fall under the blob radius and average back to flat.
     *
     * THE KNOB IS NO LONGER FREQUENCY ALONE. Zooming the noise while the
     * sampling grid and the octave mix stayed put meant the fine structure
     * only ever got BIGGER, never quieter, and the stamp lattice never moved
     * at all — so a big-cloud setting was a magnified version of the same
     * texture rather than a different kind of sky. `freq` now also drives the
     * grid coarseness (just below) and the ridged octave's weight (at the
     * sample loop), which together are what let the top of the slider read as
     * smooth billows instead of enlarged filaments. */
    var scaleAmt = parseFloat(opts.scale);
    if (!isFinite(scaleAmt)) scaleAmt = 0.5;
    /* Inverted: a HIGH slider means BIG clouds, which means LOW frequency. */
    var freq = Math.pow(2.4, (0.5 - clamp(scaleAmt, 0, 1)) * 2);

    /* THE SAMPLING GRID FOLLOWS THE CLOUD SIZE. It used to be a fixed 96
     * columns with a fixed blob radius, and that was the defect: the slider
     * zoomed the noise field but never touched the stamps, so the lattice of
     * jittered discs stayed exactly the same size at every setting. With
     * smooth low-frequency noise the neighbouring cells carry near-identical
     * density, which leaves a field of near-equal blobs at fixed cell scale —
     * a granular fizz that reads as a texture UNDER the clouds and does not
     * respond to the control. Sampling the field more coarsely and stamping it
     * with proportionally bigger, softer blobs is what makes the whole picture
     * zoom rather than just its noise.
     *
     * The exponent is a half power rather than a full one on purpose. Tying
     * the cell size to freq exactly would keep a constant number of samples
     * per cloud, which sounds ideal and is not: at the big end it drops the
     * sample count so far that the blob radius approaches frame size and the
     * gas turns to three wide smears. Half the power keeps the big end
     * genuinely coarser while still resolving the billow edges.
     *
     * IT ONLY EVER GOES COARSER. `freq` is clamped at 1 going in, so the fine
     * half of the slider keeps the 96 columns it has always had — that end was
     * already a good nebula and a denser lattice there is a change nobody
     * asked for. The grid moves only where the complaint was.
     *
     * COST IS BOUNDED for the same reason: the cell count starts at today's
     * figure and falls from there, so no setting is dearer to draw than the
     * current worst case.
     *
     * `freq` is derived above rather than below because the grid now depends
     * on it. */
    var COLS = Math.round(clamp(96 * Math.sqrt(Math.min(freq, 1)), 34, 96));
    var cellW = w / COLS;
    var ROWS = Math.max(8, Math.round(COLS * h / w));
    var cellH = h / ROWS;
    /* THE BLOB MUST COMFORTABLY OVERSPILL ITS CELL. At a radius near the cell
     * size the corners between four blobs stay unpainted and the sampling
     * lattice reads as a visible checkerboard — the grid becomes the texture.
     * Generous overlap is what turns discrete samples back into a continuous
     * field. Because the cell now grows with the clouds, so does this. */
    var radius = Math.max(cellW, cellH) * 1.9;

    /* Frequencies are in CELLS, not pixels, so the cloud is the same picture
     * at any resolution. */
    var f1 = 2.6 * freq / COLS, f2 = 6.1 * freq / COLS, f3 = 13.7 * freq / COLS;

    /* HOW MUCH FILAMENT THERE IS, tapered by cloud size. The ridged octave is
     * what makes the field read as gas rather than marbling, so it earns its
     * 0.28 at the small-cloud end and that end is unchanged. But holding the
     * weight fixed across the slider was half of why big clouds never looked
     * calmer: the filaments scaled up with everything else and kept the same
     * share of the density, so the sky got coarser without ever getting
     * SMOOTHER. Fading the octave toward 0.10 as the clouds grow is what turns
     * the top of the range into billows — the structure that remains is mass,
     * not thread.
     *
     * Not taken to zero: with no ridged component at all the field is two
     * smooth octaves, which is a colour wash and not a nebula.
     *
     * Clamped at freq 1 for the same reason the grid is: the taper is a fix
     * for the big-cloud end, and the fine half of the slider keeps its full
     * 0.28 rather than being quietly retuned along with it. */
    var ridgeW = 0.10 + 0.18 * clamp((Math.min(freq, 1) - 0.42) / (1 - 0.42), 0, 1);
    var ox = rng() * 500, oy = rng() * 500;

    /* THE CORE IS BRIGHTENED IN HSV, NOT MIXED TOWARD WHITE. `shadeHex` on a
     * positive amount blends with white, which raises value and destroys
     * SATURATION at the same time — a picked orange came back as warm grey,
     * so the second colour looked washed out no matter what the user chose.
     * Lifting value while holding hue and saturation keeps the core the
     * colour that was actually picked.
     *
     * The floor matters as much as the lift: a colour 2 chosen very dark
     * still has to out-read the voids, or the nebula has no cores at all. */
    var h2 = CC.Color.hexToHsv(c2);
    var coreCol = CC.Color.hsvToHex(h2[0], h2[1], clamp(Math.max(h2[2] * 1.35, 0.30), 0, 1));
    var voidCol = CC.Color.shadeHex(c1, -0.35);

    /* "lighter" is what makes overlapping veils ACCUMULATE into depth rather
     * than the last one winning — but it clips at white, and a nebula whose
     * cores have blown out to grey-white has thrown away the colour exactly
     * where it should be strongest. So the per-blob alpha below is kept low
     * and the whole field is drawn at reduced opacity: the sum lands in the
     * bright-but-coloured range instead of pinning every channel to 255. */
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (var j = 0; j < ROWS; j++) {
      for (var i = 0; i < COLS; i++) {
        var x = i + ox, y = j + oy;

        /* Two smooth octaves for the mass, one ridged for the filaments. */
        var base = simplex.noise2D(x * f1, y * f1) * 0.60
                 + simplex.noise2D(x * f2, y * f2) * 0.28;
        var ridge = 1 - Math.abs(simplex.noise2D(x * f3, y * f3));
        var n = clamp((base + 0.88) / 1.76, 0, 1) * (1 - ridgeW) + ridge * ridgeW;

        /* The power curve is the sparsity control: most of the field falls
         * near zero and only the peaks survive. FIXED, not a control — how
         * much of the frame the gas covers is already reachable by choosing
         * darker or brighter nebula colours, so a slider for it would be a
         * second control for what the two pickers already do. The user's knob
         * is the cloud SCALE instead; see `freq` above. */
        var d = Math.pow(clamp(n, 0, 1), 2.6);
        if (d < 0.012) continue;

        /* Hue is driven by a DIFFERENT noise field than density, so the two
         * colours interleave as separate cloud systems rather than colour
         * being a readout of brightness — which is what "a blend of colour 1
         * clouds and colour 2 clouds layered" actually asks for. */
        var t = clamp(simplex.noise2D(x * f2 + 91.3, y * f2 - 47.7) * 0.5 + 0.5, 0, 1);
        var col = CC.Color.mixHex(voidCol, coreCol, t);

        /* Raised from a much lower figure: with heavy overlap and a steep
         * sparsity curve the cores were accumulating to barely half the
         * luminance of the colour they were supposed to BE, so the second
         * picker read as timid whatever was put in it. */
        ctx.globalAlpha = clamp(d * 0.42, 0, 1);
        /* THE SAMPLE POSITION IS JITTERED OFF THE LATTICE. Even with heavy
         * overlap, blobs centred on an exact grid leave a faint regular
         * pattern in the sparse regions, where too few of them overlap to
         * hide it. Displacing each centre by up to a cell breaks the
         * regularity outright, so there is no grid left to show through.
         *
         * A radial falloff rather than a flat disc: hard-edged circles at
         * this overlap produce visible scalloping where they cross. */
        var bx = i * cellW + cellW / 2 + (rng() - 0.5) * cellW * 1.4;
        var by = j * cellH + cellH / 2 + (rng() - 0.5) * cellH * 1.4;
        var rg = ctx.createRadialGradient(bx, by, 0, bx, by, radius);
        rg.addColorStop(0, col);
        rg.addColorStop(1, CC.Color.rgba(col, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(bx, by, radius, 0, TAU);
        ctx.fill();
      }
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /* Stars are placed in fractions of the canvas, so the field is the same
   * picture at any resolution — the same rule as body elements. */
  function drawStarfield(ctx, w, h, opts) {
    /* Coerced for the same reason the gradient angle is: a NaN density makes
     * the star count NaN, and the loop then runs zero times — a silently
     * empty starfield rather than a crash, but just as wrong. */
    var density = parseFloat(opts.density);
    if (!isFinite(density)) density = 0.6;
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
    drawNebula: drawNebula,
    drawStarfield: drawStarfield
  };
})();
