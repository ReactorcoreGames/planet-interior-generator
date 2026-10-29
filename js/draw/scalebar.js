/* The scale bar and its silhouette — step 8 of the draw order (draw/scene.js).
 *
 * A map-style bar in the lower-left corner, a round 1-2-5 length labelled in
 * units that switch with the body: metres on a close-up asteroid, km on a
 * planet, million km on a giant star, AU across a supermassive horizon,
 * light-years across a nebula (D285). Above it, at the same true scale, the
 * largest comparison from js/data/scaleladder.js that fits the corner, or
 * nothing.
 *
 * ---- WHAT IT MEASURES -------------------------------------------------------
 *
 * THE RADIUS THE CARD STATES (stats measure the render). `CC.Stats.build`
 * runs over the same body, details and settings the card is built from, and
 * its `radiusKm` is the figure behind the Size line — so the bar can never
 * say a different size than the card. That radius is `view.R` pixels, so the
 * bar reads straight off the view: zoom changes the bar's LENGTH (and may
 * change the silhouette), never the size of its text.
 *
 * ---- WHAT IT IS SIZED FROM --------------------------------------------------
 *
 * THE FRAME, like the overlay: text, strokes and margins scale with the
 * canvas's shorter axis and the Label text size control, never with the body.
 * The bar aims at a fifth of that axis and takes the largest round length
 * under it, so it always lands between ~9% and 22%.
 *
 * Drawn unrotated, after the scene's rotation is undone. Knows no archetype:
 * every per-body fact arrives as a radius in km. Loaded before
 * js/draw/scene.js, which calls it. */

var CC = CC || {};

CC.ScaleBarDraw = (function () {
  "use strict";

  var FONT_PX = 13;          // at a 1000px shorter axis, Label text size 100%
  var BAR_MAX = 0.22;        // longest bar, as a share of the shorter axis
  var SIL_MIN = 5;           // smallest silhouette worth drawing, px at 1000
  var SIL_MAX = 0.25;        // largest, as a share of the shorter axis
  var INK = "#e9edf3";
  var HALO = "rgba(4, 6, 12, 0.72)";
  var VEIL = "rgba(233, 237, 243, 0.2)";     // a disc's fill, so it never reads as a second body
  var SOLID = "rgba(233, 237, 243, 0.85)";   // a small figure's fill

  var AU = 1.496e8, LY = 9.4607e12;

  /* The unit is chosen from the LONGEST bar that would fit, so the round
   * length is always at least 1 of it: 1 AU rather than 150 million km. */
  var UNITS = [
    { below: 1,        per: 0.001, one: "m",           many: "m" },
    { below: 1e6,      per: 1,     one: "km",          many: "km" },
    { below: AU,       per: 1e6,   one: "million km",  many: "million km" },
    { below: 0.1 * LY, per: AU,    one: "AU",          many: "AU" },
    { below: Infinity, per: LY,    one: "light-year",  many: "light-years" }
  ];

  /* The largest 1, 2 or 5 x 10^n of the right unit not longer than `maxKm`. */
  function roundLength(maxKm) {
    var u = UNITS[0];
    for (var i = 0; i < UNITS.length; i++) {
      if (maxKm < UNITS[i].below) { u = UNITS[i]; break; }
    }
    var v = maxKm / u.per;
    var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10));
    var m = v / p;
    var n = (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p;
    var text = n >= 1 ? Math.round(n).toLocaleString("en-US") : String(+n.toPrecision(1));
    return { km: n * u.per, text: text + " " + (n === 1 ? u.one : u.many) };
  }

  /* ---- the silhouettes, each drawn into a box standing on (x, yb) ------- */

  function poly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }

  /* A filled figure, outlined in the halo first so it reads over any sky. */
  function figure(ctx, k, paths) {
    for (var i = 0; i < paths.length; i++) {
      paths[i]();
      ctx.strokeStyle = HALO;
      ctx.lineWidth = 2.5 * k;
      ctx.stroke();
    }
    for (var j = 0; j < paths.length; j++) {
      paths[j]();
      ctx.fillStyle = SOLID;
      ctx.fill();
    }
  }

  function ring(ctx, cx, cy, r, k, dashed) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = HALO;
    ctx.lineWidth = 3 * k;
    ctx.stroke();
    if (dashed) ctx.setLineDash([3 * k, 3 * k]);
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, k);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /* A row of flat-topped blocks across the box, `tops` as shares of H. */
  function skyline(ctx, x, yb, W, H, k, tops) {
    var step = W / tops.length;
    figure(ctx, k, [function () {
      var pts = [[x, yb]];
      for (var i = 0; i < tops.length; i++) {
        pts.push([x + i * step, yb - H * tops[i]], [x + (i + 1) * step, yb - H * tops[i]]);
      }
      pts.push([x + W, yb]);
      poly(ctx, pts);
    }]);
  }

  var SHAPES = {
    person: function (ctx, x, yb, W, H, k) {
      var c = x + W / 2;
      figure(ctx, k, [
        function () {
          ctx.beginPath();
          ctx.arc(c, yb - H * 0.9, Math.max(0.5, H * 0.1), 0, Math.PI * 2);
        },
        function () {
          poly(ctx, [[c - W * 0.5, yb - H * 0.78], [c + W * 0.5, yb - H * 0.78],
                     [c + W * 0.32, yb - H * 0.45], [c + W * 0.3, yb], [c + W * 0.06, yb],
                     [c, yb - H * 0.4], [c - W * 0.06, yb], [c - W * 0.3, yb],
                     [c - W * 0.32, yb - H * 0.45]]);
        }
      ]);
    },

    jet: function (ctx, x, yb, W, H, k) {
      var yc = yb - H * 0.35, hh = H * 0.12;
      figure(ctx, k, [
        function () {
          poly(ctx, [[x, yc], [x + W * 0.06, yc - hh], [x + W * 0.82, yc - hh],
                     [x + W * 0.9, yb - H], [x + W * 0.97, yb - H], [x + W, yc - hh * 0.3],
                     [x + W * 0.96, yc + hh], [x + W * 0.06, yc + hh]]);
        },
        function () {
          poly(ctx, [[x + W * 0.36, yc], [x + W * 0.56, yc],
                     [x + W * 0.68, yb - H * 0.05], [x + W * 0.61, yb - H * 0.05]]);
        }
      ]);
    },

    tower: function (ctx, x, yb, W, H, k) {
      var c = x + W / 2;
      figure(ctx, k, [function () {
        poly(ctx, [[x, yb], [x, yb - H * 0.55], [c - W * 0.35, yb - H * 0.55],
                   [c - W * 0.35, yb - H * 0.75], [c - W * 0.2, yb - H * 0.75],
                   [c - W * 0.2, yb - H * 0.88], [c - W * 0.03, yb - H * 0.88],
                   [c, yb - H], [c + W * 0.03, yb - H * 0.88],
                   [c + W * 0.2, yb - H * 0.88], [c + W * 0.2, yb - H * 0.75],
                   [c + W * 0.35, yb - H * 0.75], [c + W * 0.35, yb - H * 0.55],
                   [x + W, yb - H * 0.55], [x + W, yb]]);
      }]);
    },

    mountain: function (ctx, x, yb, W, H, k) {
      figure(ctx, k, [function () {
        poly(ctx, [[x, yb], [x + W * 0.22, yb - H * 0.38], [x + W * 0.33, yb - H * 0.32],
                   [x + W * 0.52, yb - H], [x + W * 0.63, yb - H * 0.72],
                   [x + W * 0.72, yb - H * 0.78], [x + W, yb]]);
      }]);
    },

    /* A fixed skyline, so the city does not reshuffle between renders. */
    city: function (ctx, x, yb, W, H, k) {
      skyline(ctx, x, yb, W, H, k,
              [0.35, 0.6, 0.45, 0.8, 0.5, 1, 0.7, 0.4, 0.9, 0.55, 0.3, 0.65, 0.45, 0.25]);
    },

    /* Lower and plainer than the city: one spire among roofs. */
    town: function (ctx, x, yb, W, H, k) {
      skyline(ctx, x, yb, W, H, k, [0.3, 0.45, 0.35, 0.5, 1, 0.4, 0.55, 0.3, 0.4]);
    },

    disc: function (ctx, x, yb, W, H, k) {
      var r = W / 2, cx = x + r, cy = yb - r;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = VEIL;
      ctx.fill();
      ring(ctx, cx, cy, r, k, false);
    },

    /* A disc with two cloud belts, so Jupiter reads as a giant and not a
     * second Earth. */
    banded: function (ctx, x, yb, W, H, k) {
      SHAPES.disc(ctx, x, yb, W, H, k);
      var r = W / 2, cx = x + r, cy = yb - r;
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1, k);
      ctx.globalAlpha = 0.6;
      [-0.3, 0.25].forEach(function (f) {
        var y = cy + f * r, half = Math.sqrt(r * r - f * r * f * r);
        ctx.beginPath();
        ctx.moveTo(cx - half, y);
        ctx.lineTo(cx + half, y);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    },

    /* An orbit is a path, not a thing: an empty ring round a dot of a Sun. */
    orbit: function (ctx, x, yb, W, H, k, dashed) {
      var r = W / 2, cx = x + r, cy = yb - r;
      ring(ctx, cx, cy, r, k, !!dashed);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1, 1.6 * k), 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
    },

    /* The Oort cloud has no edge to draw, so its ring is broken. */
    cloud: function (ctx, x, yb, W, H, k) {
      SHAPES.orbit(ctx, x, yb, W, H, k, true);
    }
  };

  function text(ctx, s, x, y, k) {
    ctx.lineWidth = 3 * k;
    ctx.strokeStyle = HALO;
    ctx.strokeText(s, x, y);
    ctx.fillStyle = INK;
    ctx.fillText(s, x, y);
  }

  function draw(ctx, view, body, details, palette, settings) {
    if (!settings || !settings.showScaleBar || !body || !(view.R > 0)) return;

    var stats = CC.Stats.build(body, details, settings,
                               CC.Archetypes.get(body.archetype), palette);
    var radiusKm = stats && stats.radiusKm;
    if (!(radiusKm > 0)) return;
    var kmPerPx = radiusKm / view.R;

    var S = Math.min(view.width, view.height);
    var k = Math.max(S / 1000, 0.5);
    var size = settings.labelSize === undefined ? 1 : settings.labelSize;
    var fontPx = Math.max(9, FONT_PX * k * size);
    var margin = 18 * k;

    var len = roundLength(BAR_MAX * S * kmPerPx);
    var barW = len.km / kmPerPx;
    var barH = Math.max(3, 4 * k);
    var x0 = Math.round(margin) + 0.5;
    var barTop = Math.round(view.height - margin - barH) + 0.5;

    ctx.save();
    ctx.font = "600 " + Math.round(fontPx) + "px 'Segoe UI', system-ui, sans-serif";
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";

    /* The bar: four segments, alternately ink and dark, in an ink outline —
     * the map convention, readable over a starfield or a bright corona. */
    ctx.fillStyle = HALO;
    ctx.fillRect(x0 - 1.5 * k, barTop - 1.5 * k, barW + 3 * k, barH + 3 * k);
    for (var i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? INK : HALO;
      ctx.fillRect(x0 + barW * i / 4, barTop, barW / 4, barH);
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, 0.8 * k);
    ctx.strokeRect(x0, barTop, barW, barH);

    ctx.textAlign = "left";
    var labelY = barTop - 6 * k;
    text(ctx, len.text, x0, labelY, k);

    /* The silhouette stands on a line just above the bar's label. */
    if (settings.scaleSilhouette !== false && CC.ScaleLadder) {
      var rung = CC.ScaleLadder.pick(kmPerPx, SIL_MIN * k, SIL_MAX * S);
      var shape = rung && SHAPES[rung.shape];
      if (shape) {
        var W = rung.w / kmPerPx, H = rung.h / kmPerPx;
        var yb = Math.round(labelY - fontPx - 8 * k);
        shape(ctx, x0, yb, W, H, k);
        text(ctx, rung.name, x0 + W + 7 * k, yb, k);
      }
    }
    ctx.restore();
  }

  return { draw: draw, roundLength: roundLength };
})();
