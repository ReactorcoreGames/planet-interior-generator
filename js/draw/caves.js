/* Draw the cave system built by gen/caves.js.
 *
 * ---- WHY IT MERGES -------------------------------------------------------
 *
 * Every tunnel and chamber is drawn as a set of overlapping round-capped
 * strokes and discs, ONE PASS PER TONE across the whole system rather than
 * one cave at a time:
 *
 *   1. the WALL — everything a little fat, in the mosaic's seam tone, so the
 *      cavity has a rim and the fragments under its edge read as cut partway
 *      rather than pasted over;
 *   2. the CAVITY — the same shapes at full size, then shrunk in steps toward
 *      the floor tone, so it deepens toward the walls;
 *   3. the cut-face TEXTURE, clipped to the cavity.
 *
 * Because each pass covers every cave at once, two tunnels that cross, or a
 * tunnel running into a chamber, come out as one cavity with one smooth wall
 * and no seam where they meet — which is the whole difference between a cave
 * SYSTEM and a set of cave stickers.
 *
 * THE COLOUR IS THE RUBBLE VOID'S (D192): `voidRamp` from mosaicFill, dark,
 * desaturated, in the fan's stone-leaned hue. A cave and a void between
 * fragments are the same kind of darkness at two scales, and neither is
 * pitch black.
 *
 * EXITS need nothing special: they run past the silhouette, and the caller
 * clips this pass to the body's outline — so they cut the crust and end as
 * mouths at the edge.
 *
 * draw/rocktexture.js must load first. */

var CC = CC || {};

CC.CaveDraw = (function () {
  "use strict";

  var TAU = Math.PI * 2;

  /* How many tone steps the cavity is filled in. Enough that the ramp reads
   * as a gradient at large sizes, few enough to stay cheap. */
  var STEPS = 7;

  function draw(ctx, view, caves, style) {
    if (!caves) return;
    var R = view.R, cx = view.cx, cy = view.cy;
    var tunnels = caves.tunnels, chambers = caves.chambers;

    function X(p) { return cx + p.x * R; }
    function Y(p) { return cy + p.y * R; }

    /* Stroke every tunnel segment and fill every chamber at `k` times its
     * radius plus `grow` pixels, in one colour. */
    function pass(colour, k, grow) {
      ctx.strokeStyle = colour;
      ctx.fillStyle = colour;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (var t = 0; t < tunnels.length; t++) {
        var pts = tunnels[t].pts;
        var constant = tunnels[t].kind === "bore";
        if (constant) {
          /* A bore is one width end to end, so it is one stroke — cheaper,
           * and perfectly smooth. */
          ctx.lineWidth = Math.max(0.5, 2 * (pts[0].w * R * k + grow));
          ctx.beginPath();
          ctx.moveTo(X(pts[0]), Y(pts[0]));
          for (var i = 1; i < pts.length; i++) ctx.lineTo(X(pts[i]), Y(pts[i]));
          ctx.stroke();
          continue;
        }
        /* A cave's width varies, and a stroke has one width — so runs of
         * segments whose width rounds to the same half pixel are batched into
         * one path, and a new stroke starts only where the width steps. */
        var run = -1;
        for (i = 1; i < pts.length; i++) {
          var a = pts[i - 1], b = pts[i];
          var lw = Math.max(0.5, 2 * ((a.w + b.w) * 0.5 * R * k + grow));
          var q = Math.round(lw * 2);
          if (q !== run) {
            if (run >= 0) ctx.stroke();
            run = q;
            ctx.lineWidth = q / 2;
            ctx.beginPath();
            ctx.moveTo(X(a), Y(a));
          }
          ctx.lineTo(X(b), Y(b));
        }
        if (run >= 0) ctx.stroke();
      }
      ctx.beginPath();
      for (var c = 0; c < chambers.length; c++) {
        var ch = chambers[c];
        var r = Math.max(0.3, ch.r * R * k + grow);
        ctx.moveTo(X(ch) + r, Y(ch));
        ctx.arc(X(ch), Y(ch), r, 0, TAU);
      }
      ctx.fill();
    }

    /* The cavity as a single clip path: ONE OUTLINE PER TUNNEL — its left
     * side out, its right side back — with a disc at each end for the round
     * cap, plus the chambers. Discs stamped along every segment would match
     * the strokes more literally, but a clip of ~900 overlapping circles cost
     * 70 ms to rasterize where ~80 outlines cost a few. Nonzero winding keeps
     * an outline that crosses itself at a sharp turn filled. */
    function cavityPath() {
      ctx.beginPath();
      for (var t = 0; t < tunnels.length; t++) {
        var pts = tunnels[t].pts, n = pts.length;
        if (n < 2) continue;
        var L = [], Rt = [];
        for (var i = 0; i < n; i++) {
          var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
          var dx = b.x - a.x, dy = b.y - a.y;
          var len = Math.sqrt(dx * dx + dy * dy) || 1;
          var nx = -dy / len * pts[i].w, ny = dx / len * pts[i].w;
          L.push([cx + (pts[i].x + nx) * R, cy + (pts[i].y + ny) * R]);
          Rt.push([cx + (pts[i].x - nx) * R, cy + (pts[i].y - ny) * R]);
        }
        /* Right side out, left side back: the same turning sense as
         * `arc(..., 0, TAU)`, so where an outline overlaps a cap or a
         * chamber the windings add instead of cancelling to a hole. */
        ctx.moveTo(Rt[0][0], Rt[0][1]);
        for (i = 1; i < n; i++) ctx.lineTo(Rt[i][0], Rt[i][1]);
        for (i = n - 1; i >= 0; i--) ctx.lineTo(L[i][0], L[i][1]);
        ctx.closePath();
        for (var e = 0; e < 2; e++) {
          var q = pts[e ? n - 1 : 0];
          ctx.moveTo(X(q) + q.w * R, Y(q));
          ctx.arc(X(q), Y(q), q.w * R, 0, TAU);
        }
      }
      for (var c = 0; c < chambers.length; c++) {
        var ch = chambers[c];
        ctx.moveTo(X(ch) + ch.r * R, Y(ch));
        ctx.arc(X(ch), Y(ch), ch.r * R, 0, TAU);
      }
    }

    ctx.save();

    /* 1. the wall. */
    var wall = Math.max(0.8, view.px(0.0045));
    pass(style.wall, 1, wall);

    /* 2. the cavity, deepening toward the walls. */
    for (var s = 0; s < STEPS; s++) {
      var u = s / (STEPS - 1);
      pass(style.ramp(u), 1 - u * 0.82, 0);
    }

    /* 3. the cut face, still rock, at reduced strength. */
    var tex = CC.RockTexture ? CC.RockTexture.build(ctx) : null;
    if (tex) {
      cavityPath();
      ctx.clip();
      /* Laid over the caves' own bounding box, not the body's: the texture
       * fill is the expensive part of this pass. */
      var bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      function grow(x, y, r) {
        if (x - r < bx0) bx0 = x - r; if (x + r > bx1) bx1 = x + r;
        if (y - r < by0) by0 = y - r; if (y + r > by1) by1 = y + r;
      }
      for (var t = 0; t < tunnels.length; t++) {
        for (var i = 0; i < tunnels[t].pts.length; i++) {
          var p = tunnels[t].pts[i];
          grow(p.x, p.y, p.w);
        }
      }
      for (var c = 0; c < chambers.length; c++) {
        grow(chambers[c].x, chambers[c].y, chambers[c].r);
      }
      var box = { x: cx + (bx0 + bx1) / 2 * R, y: cy + (by0 + by1) / 2 * R,
                  r: Math.max(bx1 - bx0, by1 - by0) / 2 * R };
      CC.RockTexture.lay(ctx, tex, box, 0.37, view.scale * 0.55,
                         style.grainAlpha * 0.6, style.mottleAlpha * 0.5);
    }

    ctx.restore();
  }

  return { draw: draw };
})();
