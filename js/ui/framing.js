/* Framing: drag to pan, wheel to zoom, and the preview's frame guide.
 *
 * THE MOUSE IS A SECOND INPUT DEVICE ONTO ONE STATE. Dragging and wheeling do
 * not maintain any framing of their own — they write into the `zoom`, `pan-x`
 * and `pan-y` controls, exactly as if the user had moved a slider. So there is
 * one source of truth, the settings string picks framing up for free (see
 * index.html, where pan is a hidden but perfectly ordinary input), and a
 * preset or a pasted string can reframe the view with no gesture code
 * involved.
 *
 * WHY THERE IS NO "FRAMING MODE". Zoom 1 with no pan is the identity — the
 * render is byte-for-byte what it was before this file existed. An off state
 * that is a VALUE rather than a MODE cannot be entered wrongly, has nothing to
 * remember while inactive, and makes "reset" a matter of writing three numbers
 * back. The frame guide keys off `isFramed()`, which is derived rather than
 * stored, so it cannot disagree with the render.
 *
 * THE GUIDE IS PREVIEW CHROME AND NEVER PART OF THE PICTURE. It is drawn here,
 * after the scene, onto the preview canvas only — `draw/` has no idea it
 * exists, which is the mechanical reason it can never appear in an export.
 *
 * Loaded after js/ui/controls.js and before js/main.js, which injects the
 * redraw callback and the extent lookup it cannot get for itself. */

var CC = CC || {};

CC.Framing = (function () {
  "use strict";

  var clamp = CC.Math.clamp;

  /* Injected by main.js rather than reached for, so this module never learns
   * about the pipeline or the render cache. */
  var requestDraw = null;
  var getExtent = null;

  var canvas = null;

  /* --- the zoom scale ---------------------------------------------------
   *
   * THE ZOOM SLIDER IS LOGARITHMIC, and the reason is how lopsided the range
   * is. Zoom runs 1x to 20x, but the interesting part — a whole body, then a
   * layer stack, then a single boundary — is all inside the first 5x. On a
   * linear slider that entire range lives in the first fifth of the travel,
   * and the remaining four fifths are increasingly abstract close-ups nobody
   * needs fine control over.
   *
   * Log spreads it the way the eye reads it: each equal step is a constant
   * MULTIPLE rather than a constant addition, so 1->4.5x is the first half of
   * the travel and 4.5->20x is the second. The slider's raw 0..1000 is that
   * fraction; the zoom factor is what the render sees.
   *
   * BOTH DIRECTIONS LIVE HERE, next to the gestures that use them, because the
   * wheel and the slider have to agree about what a given zoom means. Two
   * copies of this arithmetic would be two chances to disagree. */
  function zoomFromSlider(raw) {
    var t = clamp((raw || 0) / 1000, 0, 1);
    return Math.pow(CC.Canvas.MAX_ZOOM, t);
  }

  function sliderFromZoom(z) {
    var f = clamp(z, 1, CC.Canvas.MAX_ZOOM);
    return Math.round(1000 * Math.log(f) / Math.log(CC.Canvas.MAX_ZOOM));
  }

  /* The row's readout. Two decimals below 10x and none above: at 12x a tenth
   * of a zoom is not a distinction anyone is making. */
  function zoomLabel(raw) {
    var z = zoomFromSlider(raw);
    return (z < 9.95 ? z.toFixed(2) : Math.round(z)) + "x";
  }

  /* The export's shape, for the frame guide. The four ratios are duplicated
   * from ui/export.js rather than shared, because that module owns the
   * composed export's aspect FLOOR and the policy attached to it; the guide
   * needs only the plain ratio, and importing the policy to get the number
   * would couple the preview's chrome to the composed layout's constraints. */
  var ASPECT_RATIOS = { "16:9": 16 / 9, "1:1": 1, "4:3": 4 / 3, "3:2": 3 / 2 };

  /* --- state readout ---------------------------------------------------- */

  function zoom() { return zoomFromSlider(CC.Controls.get("zoom")); }
  function panX() { return parseFloat(CC.Controls.get("pan-x")) || 0; }
  function panY() { return parseFloat(CC.Controls.get("pan-y")) || 0; }

  /* Whether the user has framed at all. Derived, never stored — a flag here
   * could fall out of step with the three numbers that actually matter. */
  function isFramed() {
    return zoom() > 1.001 || panX() !== 0 || panY() !== 0;
  }

  /* --- the pan clamp -----------------------------------------------------
   *
   * DELIBERATELY LIBERAL: it bounds where the user may travel by what is
   * actually out there to look at, rather than by what keeps the body tidily
   * centred. `extent` is the outermost radius anything occupies — the far edge
   * of the widest ring, the top of a bulging atmosphere — so panning by that
   * much puts the outermost element at the centre of the frame, which is
   * exactly the shot someone zooming into a ring edge wants.
   *
   * What it stops is the case with nothing to recommend it: sailing off into
   * empty space having lost the body entirely. And because Reset framing is
   * one button away, the clamp can afford to be generous — being fenced in is
   * a worse failure here than being briefly lost. */
  function clampPan(v) {
    var reach = Math.max(1, getExtent ? getExtent() : 1);
    return clamp(v, -reach, reach);
  }

  /* --- writing ----------------------------------------------------------
   *
   * `CC.Controls.set` deliberately suppresses the change callback so a batch
   * write produces one render rather than one per control; that means every
   * writer here is responsible for asking for the redraw itself. */
  function setFraming(z, px, py) {
    CC.Controls.set("zoom", sliderFromZoom(z));
    CC.Controls.set("pan-x", clampPan(px));
    CC.Controls.set("pan-y", clampPan(py));
    if (requestDraw) requestDraw();
  }

  function reset() { setFraming(1, 0, 0); }

  /* --- zooming ----------------------------------------------------------
   *
   * ZOOM KEEPS THE POINT UNDER THE CURSOR STILL, which is the difference
   * between a zoom that feels like a tool and one that feels like a slider
   * with a shortcut. Without it, wheeling toward a core boundary walks the
   * boundary off the screen and the user chases it with the drag.
   *
   * The arithmetic: a point `d` body-radii from the body's centre sits at
   * `d * R` pixels from it. Zooming multiplies `R` by `k`, so to leave that
   * point where it was the centre has to move by the difference — which in
   * body-space pan units is just `d * (k - 1) / k`, independent of R and so
   * independent of the canvas size.
   *
   * `anchor` is where the cursor is in body space, or null for the Zoom
   * slider — which has no cursor and so zooms about the frame centre, the
   * only sensible reading of a control with no position attached to it. */
  function zoomTo(next, anchor) {
    var from = zoom();
    var to = clamp(next, 1, CC.Canvas.MAX_ZOOM);
    if (to === from) return;

    var px = panX(), py = panY();

    if (anchor) {
      var k = to / from;
      px += (anchor.x - px) * (1 - 1 / k);
      py += (anchor.y - py) * (1 - 1 / k);
    }

    /* ZOOMING BACK OUT UNWINDS THE PAN. At 1x a panned body would sit off to
     * one side with empty space beside it and no visible reason why, which
     * reads as a bug rather than as a choice — and it is the state a user
     * lands in by wheeling all the way back, expecting to have undone things.
     * Easing pan toward zero as zoom approaches 1 makes the way out of a
     * close-up the way in, run backwards. */
    if (to < 1.001) { px = 0; py = 0; }

    setFraming(to, px, py);
  }

  /* Where a pixel point sits in body space, given what the last render did.
   * Reads the view the scene actually produced rather than recomputing the
   * transform, so the gesture can never disagree with the picture. */
  function bodyPointAt(view, clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var x = clientX - rect.left;
    var y = clientY - rect.top;
    return {
      x: (x - view.cx) / view.R + panX(),
      y: (y - view.cy) / view.R + panY()
    };
  }

  /* --- the frame guide --------------------------------------------------
   *
   * WHAT THE EXPORT WILL ACTUALLY CATCH. The preview's box and the export's
   * aspect ratio are not the same shape, so without this the crop is guesswork
   * — the user frames a boundary against the preview's edge and the export,
   * being wider, includes a band of body they never saw.
   *
   * Drawn only while framed, because at 1x centred it would be permanent
   * furniture marking a crop nobody has asked for. That doubles as the UI's
   * answer to "am I framed or not?", which is the one thing an explicit
   * on/off toggle would have bought and this gets for nothing. */
  function drawGuide(ctx, width, height, aspectName) {
    if (!isFramed()) return;

    var aspectRatio = ASPECT_RATIOS[aspectName] || (16 / 9);

    /* The export matches this frame's HEIGHT when it is the more constrained
     * axis and its WIDTH otherwise — the same fit the export performs, read
     * back as a rectangle. */
    var w = width, h = height;
    if (width / height > aspectRatio) w = height * aspectRatio;
    else h = width / aspectRatio;

    var x = (width - w) / 2;
    var y = (height - h) / 2;

    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.42)";
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    /* The region the export will DISCARD, dimmed rather than outlined. An
     * outline says "here is a rectangle"; dimming says "this part is not in
     * your picture", which is the actual question being asked. */
    ctx.fillStyle = "rgba(0,0,0,0.30)";
    if (y > 0) {
      ctx.fillRect(0, 0, width, y);
      ctx.fillRect(0, height - y, width, y);
    }
    if (x > 0) {
      ctx.fillRect(0, 0, x, height);
      ctx.fillRect(width - x, 0, x, height);
    }
    ctx.restore();
  }

  /* --- gestures ---------------------------------------------------------- */

  /* The view from the most recent render, so a gesture can convert pixels to
   * body space using the transform that produced what the user is pointing at.
   * Handed over by main.js after each draw. */
  var lastView = null;

  function setView(v) { lastView = v; }

  function init(opts) {
    canvas = opts.canvas;
    requestDraw = opts.requestDraw;
    getExtent = opts.getExtent;

    var btn = document.getElementById("reset-framing");
    if (btn) btn.addEventListener("click", reset);

    if (!canvas) return;

    /* WHEEL ZOOM IS MULTIPLICATIVE, matching the slider's log scale: one
     * notch is a constant ratio, so the gesture feels the same at 1x and at
     * 15x rather than crawling at the bottom and leaping at the top. */
    canvas.addEventListener("wheel", function (e) {
      if (!lastView) return;
      e.preventDefault();
      var step = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomTo(zoom() * step, bodyPointAt(lastView, e.clientX, e.clientY));
    }, { passive: false });

    /* DRAG TO PAN. Pointer events rather than mouse events, so a trackpad or
     * a stylus works, and pointer capture so a drag that leaves the canvas
     * still tracks instead of stopping dead at the edge — panning to put
     * something at the frame's edge means the cursor goes there too. */
    var dragging = false;
    var startX = 0, startY = 0, startPanX = 0, startPanY = 0;

    canvas.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 || !lastView) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startPanX = panX();
      startPanY = panY();
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add("panning");
    });

    canvas.addEventListener("pointermove", function (e) {
      if (!dragging || !lastView) return;
      /* Divided by the CURRENT `R`, so the body tracks the cursor exactly: a
       * drag of 100px moves the body 100px whatever the zoom. Expressing the
       * result in body radii is what keeps the value portable to another
       * screen and into the settings string. */
      var dx = (e.clientX - startX) / lastView.R;
      var dy = (e.clientY - startY) / lastView.R;
      CC.Controls.set("pan-x", clampPan(startPanX - dx));
      CC.Controls.set("pan-y", clampPan(startPanY - dy));
      if (requestDraw) requestDraw();
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      canvas.classList.remove("panning");
      if (e && e.pointerId !== undefined && canvas.releasePointerCapture) {
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* already gone */ }
      }
    }

    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
  }

  return {
    init: init,
    zoomFromSlider: zoomFromSlider,
    sliderFromZoom: sliderFromZoom,
    zoomLabel: zoomLabel,
    setView: setView,
    reset: reset,
    isFramed: isFramed,
    drawGuide: drawGuide,
    clampPan: clampPan
  };
})();
