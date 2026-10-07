/* Machines — hard-edged built objects that are not pressure hulls.
 *
 * `capsule` (orbital.js) is a pressure hull: rounded, lit across its curve,
 * the shape of something holding air against vacuum or riding a wind. These
 * are the other kind of artificial thing — frames, boxes and tools, built on a
 * body with almost no gravity and no weather, where nothing pushes on a
 * structure from outside and the honest form is the rectangle
 * (ASTEROID-OVERHAUL §5).
 *
 *   plate   a rectangle, rotatable — a block, a truss frame or a pad
 *   borer   a tunnel-boring machine: a cylinder with a cutter head, pointing
 *           the way it is digging. Its tunnel is NOT drawn here; it is part of
 *           the cave system (gen/caves.js, draw/caves.js), so a bore that
 *           meets a cavern reads as one excavation.
 *
 * Both take `style` as hullFill's {hull, lit, shade, trim} set.
 *
 * ORIENTATION: `ctx.rotate(el.angle)` sends local +y INWARD (D155). A flat
 * plate is rotated a further quarter turn, which sends local +x inward — so
 * its roof, the side facing space, is local -x.
 *
 * draw/primitives.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  function frac(v) { return v - Math.floor(v); }

  /* ---- plate ------------------------------------------------------------- */

  /* WHICH OF THREE BUILT THINGS THIS PLATE IS, from its own seed: a block
   * (most of them), an open truss frame, or a landing pad. A station is a
   * cluster of these, and the variety inside the cluster is what makes it read
   * as an installation rather than as a row of identical tiles. */
  function plateKind(seed) {
    var u = frac(seed * 7.31 + 0.17);
    return u < 0.58 ? "block" : (u < 0.82 ? "truss" : "pad");
  }

  function plate(ctx, view, el, style) {
    var c = view.at(el.radius, el.angle);
    var len = view.px(el.size);
    if (len < 0.8) return;
    var kind = plateKind(el.seed || 0);
    var aspect = kind === "pad" ? 0.16 : (el.aspect === undefined ? 0.5 : el.aspect);
    var wide = len * aspect;
    var hx = wide * 0.5, hy = len * 0.5;
    var line = Math.max(0.35, len * 0.035);

    ctx.save();
    ctx.translate(c.x, c.y);
    /* `rot` is set when the plate was seated on the real surface
     * (draw/scene.js `seatOn`), so it lies along the local slope. */
    ctx.rotate(el.rot !== undefined ? el.rot
                                    : el.angle + (el.upright ? 0 : Math.PI / 2));

    if (kind === "truss") {
      /* AN OPEN FRAME — outline, cross-bracing, nothing filled but a faint
       * floor. It is the mark that says "built" most loudly, because nothing
       * in the geology has diagonals inside a rectangle. */
      ctx.fillStyle = style.shade;
      ctx.globalAlpha *= 0.45;
      ctx.fillRect(-hx, -hy, wide, len);
      ctx.globalAlpha /= 0.45;
      ctx.strokeStyle = style.lit;
      ctx.lineWidth = line;
      var bays = Math.max(1, Math.min(4, Math.round(len / Math.max(1, wide))));
      ctx.beginPath();
      ctx.rect(-hx, -hy, wide, len);
      for (var b = 0; b < bays; b++) {
        var y0 = -hy + (len / bays) * b, y1 = y0 + len / bays;
        ctx.moveTo(-hx, y0); ctx.lineTo(hx, y1);
        ctx.moveTo(hx, y0); ctx.lineTo(-hx, y1);
        if (b) { ctx.moveTo(-hx, y0); ctx.lineTo(hx, y0); }
      }
      ctx.stroke();
      ctx.restore();
      return;
    }

    /* A BLOCK OR A PAD: flat-faced, lit on the side facing space (local -x)
     * and shaded toward the rock — a linear ramp across the short axis, not
     * the capsule's curve, because the face is flat. */
    var g = ctx.createLinearGradient(-hx, 0, hx, 0);
    g.addColorStop(0, style.lit);
    g.addColorStop(0.22, style.hull);
    g.addColorStop(1, style.shade);
    ctx.fillStyle = g;
    ctx.fillRect(-hx, -hy, wide, len);
    ctx.lineWidth = line;
    ctx.strokeStyle = style.trim;
    ctx.strokeRect(-hx, -hy, wide, len);

    if (kind === "pad") {
      /* A landing pad: a long flat slab with a centre marking. */
      if (len > 6) {
        ctx.strokeStyle = style.lit;
        ctx.lineWidth = line * 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(hy * 0.32, hx * 2.2), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    /* PANEL SEAMS across the long axis — one to three — and, on about half
     * the blocks, a smaller module on the roof. Cheap, and they are what
     * turn a rectangle into a building at any size above a few pixels. */
    if (len > 4) {
      var seams = 1 + Math.floor(frac((el.seed || 0) * 13.7) * 3);
      ctx.lineWidth = line * 0.8;
      ctx.beginPath();
      for (var s = 1; s <= seams; s++) {
        var y = -hy + (len / (seams + 1)) * s;
        ctx.moveTo(-hx, y); ctx.lineTo(hx, y);
      }
      ctx.stroke();
    }
    if (frac((el.seed || 0) * 5.13) < 0.5 && len > 5) {
      var mh = len * (0.28 + frac((el.seed || 0) * 3.7) * 0.22);
      var mw = wide * 0.55;
      var my = (frac((el.seed || 0) * 9.1) - 0.5) * (len - mh) * 0.8;
      ctx.fillStyle = style.hull;
      ctx.fillRect(-hx - mw, my - mh / 2, mw, mh);
      ctx.strokeRect(-hx - mw, my - mh / 2, mw, mh);
      /* A mast off the module — the station's one vertical. */
      if (frac((el.seed || 0) * 2.9) < 0.6) {
        ctx.beginPath();
        ctx.moveTo(-hx - mw, my);
        ctx.lineTo(-hx - mw - len * 0.30, my);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ---- borer ------------------------------------------------------------- */

  /* A TUNNEL-BORING MACHINE, at the end of the tunnel it cut.
   *
   * `el.trail` is the bore's path in warped body space (gen/caves.js), entry
   * first; the machine sits at its last point and faces along its last
   * segment. A cylinder body, a flange, and a cutter head of three spiked
   * triangles — the user's own sketch. It is the one mark on this body that
   * is a VECTOR: it entered there and is now here, and its history is drawn
   * behind it. */
  function borer(ctx, view, el, style) {
    var tr = el.trail;
    if (!tr || tr.length < 2) return;
    var a = tr[tr.length - 2], b = tr[tr.length - 1];
    var hx = view.cx + b[0] * view.R, hy = view.cy + b[1] * view.R;
    var dir = Math.atan2(b[1] - a[1], b[0] - a[0]);
    var L = view.px(el.size);
    if (L < 1) return;
    var W = view.px(el.boreW || el.size * 0.3) * 1.7;
    var line = Math.max(0.35, L * 0.03);

    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(dir);

    /* The body: local +x is the direction of travel, the cutting face at the
     * origin. Shaded across its width like any cylinder. */
    var bw = W * 0.82;
    var g = ctx.createLinearGradient(0, -bw / 2, 0, bw / 2);
    g.addColorStop(0, style.shade);
    g.addColorStop(0.35, style.lit);
    g.addColorStop(0.6, style.hull);
    g.addColorStop(1, style.shade);
    ctx.fillStyle = g;
    ctx.fillRect(-L, -bw / 2, L * 0.80, bw);
    ctx.lineWidth = line;
    ctx.strokeStyle = style.trim;
    ctx.strokeRect(-L, -bw / 2, L * 0.80, bw);
    if (L > 6) {
      ctx.beginPath();
      for (var k = 1; k <= 2; k++) {
        var x = -L + L * 0.80 * (k / 3);
        ctx.moveTo(x, -bw / 2); ctx.lineTo(x, bw / 2);
      }
      ctx.stroke();
    }

    /* The flange the head turns on, slightly proud of the body. */
    ctx.fillStyle = style.shade;
    ctx.fillRect(-L * 0.22, -W / 2, L * 0.08, W);

    /* The cutter head: three spikes across the bore, the middle one longest. */
    var tips = [0.20, 0.30, 0.20];
    ctx.fillStyle = style.lit;
    ctx.beginPath();
    for (var t = 0; t < 3; t++) {
      var y0 = -W / 2 + (W / 3) * t, y1 = y0 + W / 3;
      ctx.moveTo(-L * 0.14, y0);
      ctx.lineTo(L * tips[t], (y0 + y1) / 2);
      ctx.lineTo(-L * 0.14, y1);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  CC.Primitives.register({
    "plate": plate,
    "borer": borer
  });
})();
