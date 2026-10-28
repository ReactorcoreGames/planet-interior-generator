/* Glyphs — drawing the `glyph` element (gen/glyph.js).
 *
 *   platform   spars, then what they carry (solar wings, pods or a rim),
 *              then the gun barrels pointing away from the body, then the
 *              hub, then the lights: the hub's in one of the void lights'
 *              colours, the spar tips as running lights, white and amber
 *
 * Drawn in the platform's OWN FRAME: up is away from the body, so every
 * platform in a ring stands the same way to it and the ring reads as one
 * built thing. Pixels enter only through `view`.
 *
 * SOLID, NOT SCREENED. An outward layer draws its details with a lightening
 * blend so haze reads as haze (draw/scene.js); a station is not haze, and
 * screened it loses its shadow side and its dark outline. The primitive
 * draws over, inside its own save/restore.
 *
 * Below a few pixels across a platform is a dot and its light: the design
 * cannot be seen, and a smudge of spars reads as dirt.
 *
 * draw/primitives.js and draw/shellwalls.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;

  /* The platform's frame at its position: centre, outward unit, across. */
  function frame(view, el) {
    var p = view.at(el.radius, el.angle);
    var q = view.at(el.radius + 0.01, el.angle);
    var dx = q.x - p.x, dy = q.y - p.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len;
    return {
      s: view.px(el.size),
      /* local (x across, y out) in half-spans -> pixels */
      pt: function (x, y) {
        var s = view.px(el.size);
        return { x: p.x + (-uy * x + ux * y) * s, y: p.y + (ux * x + uy * y) * s };
      }
    };
  }

  function poly(ctx, F, pts) {
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var q = F.pt(pts[i][0], pts[i][1]);
      if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
    }
    ctx.closePath();
  }

  /* A spar's direction: angle 0 points down at the body. */
  function dir(d, i) {
    var t = d.turn + i * TAU / d.arms;
    return [Math.sin(t), -Math.cos(t)];
  }

  function line(ctx, F, x0, y0, x1, y1) {
    var a = F.pt(x0, y0), b = F.pt(x1, y1);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  }

  function hubPath(ctx, F, d) {
    var h = d.hub, i, pts = [];
    if (d.hubShape === "ring") {
      for (i = 0; i < 20; i++) pts.push([Math.cos(i * TAU / 20) * h, Math.sin(i * TAU / 20) * h]);
    } else {
      var n = d.hubShape === "hex" ? 6 : 4;
      var off = d.hubShape === "square" ? Math.PI / 4 : 0;
      for (i = 0; i < n; i++) {
        var t = off + i * TAU / n;
        pts.push([Math.cos(t) * h * 1.12, Math.sin(t) * h * 1.12]);
      }
    }
    poly(ctx, F, pts);
  }

  /* A run of square lights: [x, y, colour index]. */
  function lights(ctx, F, list, style, size) {
    for (var pass = 0; pass < 2; pass++) {
      var halo = pass === 0;
      var h = halo ? size * 1.5 : size / 2;
      for (var i = 0; i < list.length; i++) {
        var q = F.pt(list[i][0], list[i][1]);
        ctx.fillStyle = (halo ? style.halo : style.lights)[list[i][2]];
        ctx.globalAlpha = halo ? 0.22 : 1;
        ctx.fillRect(q.x - h, q.y - h, h * 2, h * 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  function platform(ctx, view, el, style) {
    var d = el.design;
    var F = frame(view, el);
    var s = F.s, i, v;
    var light = Math.max(1.1, s * 0.13);

    if (s < 3) {
      var c = F.pt(0, 0), w = Math.max(1, s * 0.8);
      ctx.fillStyle = style.hull;
      ctx.fillRect(c.x - w / 2, c.y - w / 2, w, w);
      lights(ctx, F, [[0, 0, d.light]], style, light);
      return;
    }

    var lw = Math.max(0.7, s * 0.075);
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";

    /* The spars and the barrels: the dark outline first, wider, then the
     * metal in it, so each reads as a solid member. */
    function members(stroke, width) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (i = 0; i < d.arms; i++) {
        v = dir(d, i);
        line(ctx, F, v[0] * d.hub, v[1] * d.hub, v[0], v[1]);
      }
      for (i = 0; i < d.guns; i++) {
        var gx = d.guns === 1 ? 0 : (i ? 0.11 : -0.11);
        line(ctx, F, gx, d.hub * 0.6, gx, d.hub + d.gun);
      }
      ctx.stroke();
    }
    members(style.trim, lw + Math.max(1, lw * 0.9));
    members(style.hull, lw);

    /* What the spars carry. */
    if (d.ends === "rim") {
      ctx.beginPath();
      for (i = 0; i <= 32; i++) {
        var q = F.pt(Math.cos(i * TAU / 32), Math.sin(i * TAU / 32));
        if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      }
      ctx.strokeStyle = style.trim;
      ctx.lineWidth = lw * 1.2 + Math.max(1, lw * 0.9);
      ctx.stroke();
      ctx.strokeStyle = style.lit;
      ctx.lineWidth = lw * 1.2;
      ctx.stroke();
    } else {
      for (i = 0; i < d.arms; i++) {
        v = dir(d, i);
        var nx = -v[1], ny = v[0];
        var pts;
        if (d.ends === "wings") {
          /* A solar wing along the outer half of the spar, wide across it. */
          var a0 = 0.48, a1 = 1.0, wd = d.wing;
          pts = [[v[0] * a0 + nx * wd, v[1] * a0 + ny * wd],
                 [v[0] * a1 + nx * wd, v[1] * a1 + ny * wd],
                 [v[0] * a1 - nx * wd, v[1] * a1 - ny * wd],
                 [v[0] * a0 - nx * wd, v[1] * a0 - ny * wd]];
        } else {
          var e = 0.16;
          pts = [[v[0] * (1 - e) + nx * e, v[1] * (1 - e) + ny * e],
                 [v[0] * (1 + e) + nx * e, v[1] * (1 + e) + ny * e],
                 [v[0] * (1 + e) - nx * e, v[1] * (1 + e) - ny * e],
                 [v[0] * (1 - e) - nx * e, v[1] * (1 - e) - ny * e]];
        }
        poly(ctx, F, pts);
        ctx.fillStyle = d.ends === "wings" ? style.panel : style.hull;
        ctx.fill();
        ctx.strokeStyle = style.trim;
        ctx.lineWidth = Math.max(0.7, lw * 0.7);
        ctx.stroke();
        /* A wing's cells: one rule across it, which is all a few pixels
         * can carry and enough to say "panel". */
        if (d.ends === "wings" && s > 8) {
          ctx.strokeStyle = style.lit;
          ctx.lineWidth = Math.max(0.5, lw * 0.35);
          ctx.beginPath();
          line(ctx, F, v[0] * 0.74 + nx * wd, v[1] * 0.74 + ny * wd,
                       v[0] * 0.74 - nx * wd, v[1] * 0.74 - ny * wd);
          line(ctx, F, v[0] * a0, v[1] * a0, v[0] * a1, v[1] * a1);
          ctx.stroke();
        }
      }
    }

    /* The hub: metal, a dark outline, and its outward face lit. */
    hubPath(ctx, F, d);
    ctx.fillStyle = style.hull;
    ctx.fill();
    ctx.strokeStyle = style.trim;
    ctx.lineWidth = Math.max(0.8, lw * 0.8);
    ctx.stroke();
    ctx.save();
    hubPath(ctx, F, d);
    ctx.clip();
    ctx.fillStyle = style.lit;
    ctx.globalAlpha = 0.55;
    poly(ctx, F, [[-1, d.hub * 0.35], [1, d.hub * 0.35], [1, 2], [-1, 2]]);
    ctx.fill();
    ctx.restore();

    /* The lights: the hub's, and running lights at the spar tips. */
    var list = [[0, 0, d.light]];
    if (s > 6) {
      for (i = 0; i < d.arms; i++) {
        v = dir(d, i);
        var r = d.ends === "rim" ? 1 : 1.02;
        list.push([v[0] * r, v[1] * r, i % 2 ? 2 : 1]);
      }
    }
    lights(ctx, F, list, style, light);
  }

  function glyph(ctx, view, el, style) {
    if (!el.design) return;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    platform(ctx, view, el, style);
    ctx.restore();
  }

  /* hullFill's machined metal, taken once for the whole set (keyed to the
   * design, not to each element's seed, so the constellation is one
   * finish), a dark solar-panel blue-grey, and the void lights. */
  function glyphStyle(colour, el, alpha) {
    var metal = CC.DrawDetails.hullFill(colour, { seed: el.design ? el.design.hub : 0 }, alpha);
    var hsv = CC.ShellWallDraw.lightHsv({ accent: colour.accent }, colour);
    metal.panel = CC.Color.hsva(222, 0.38, 0.30, alpha);
    metal.halo = hsv.map(function (h) { return CC.Color.hsva(h[0], h[1], h[2], alpha); });
    metal.lights = hsv.map(function (h) { return CC.Color.hsva(h[0], h[1] * 0.6, 1, alpha); });
    return CC.ShellWallDraw.powered(metal, el);
  }

  CC.Primitives.register({ "glyph": glyph });
  CC.Primitives.registerStyle("glyph", glyphStyle);
})();
