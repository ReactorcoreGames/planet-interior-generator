/* Fixtures — drawing the `fixture` element (gen/fixtures.js).
 *
 *   fins     the manifold, then each fin as a dark blade with a lit lip a
 *            pixel beside it, every few a heavier stiffener; the roots warm
 *   sensor   the plinth, the masts, then what tops them — a dish open to
 *            space with its feed, or a lattice antenna — and a light at
 *            each tip; in machined metal, since it stands in space
 *   dock     the bay as a dark recess with a lit floor plate and lit walls,
 *            flanges at the mouth, the cradle, a craft in some berths, and
 *            approach lights down both walls
 *
 * Laid out in the fixture's own POLAR frame: `x` across the band in body
 * radius, measured at the root, `y` up from the root. Every fixture is
 * square to the band, which is what makes a ring of them read as one built
 * thing. Pixels enter only through `view`.
 *
 * Shading is monochrome (black and white at low alpha), as on the cellgrid
 * and the materials, so a fixture sits in its band's own colour; colour
 * comes only from the lights, the radiator heat and a docked craft's metal
 * (and a sensor's, which stands against the sky rather than a band).
 * The caller has already clipped to the layer's band.
 *
 * Further designs register their drawing through CC.FixtureDraw
 * (draw/primitives/machinery.js: trusses, gears, rotors).
 *
 * draw/primitives.js, draw/details.js and draw/shellwalls.js must load
 * first. */

var CC = CC || {};

(function () {
  "use strict";

  /* Body-space size of a fixture's light, as the void walls' (draw/shellwalls.js). */
  var LIGHT = 0.0024;

  function mono(white, a) {
    return (white ? "rgba(255,255,255," : "rgba(0,0,0,") + Math.max(0, Math.min(1, a)) + ")";
  }

  /* The fixture's frame: x across (body radius at the root), y up — or
   * down, for a fixture hung from a ceiling. */
  function frame(view, el) {
    var r0 = Math.max(0.02, el.radius), up = el.hang ? -1 : 1;
    return function (x, y) { return view.at(el.radius + y * up, el.angle + x / r0); };
  }

  function seg(ctx, P, x0, y0, x1, y1) {
    var a = P(x0, y0), b = P(x1, y1);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  }

  function box(ctx, P, x0, y0, x1, y1) {
    var a = P(x0, y0), b = P(x1, y0), c = P(x1, y1), d = P(x0, y1);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
    ctx.closePath();
  }

  /* A run of square lights with a soft spill: [x, y, colour index]. */
  function lights(ctx, view, P, list, style) {
    var s = Math.max(1.1, view.px(LIGHT));
    for (var pass = 0; pass < 2; pass++) {
      var halo = pass === 0, h = halo ? s * 1.5 : s / 2;
      ctx.globalAlpha = halo ? 0.2 : 1;
      for (var i = 0; i < list.length; i++) {
        var q = P(list[i][0], list[i][1]);
        ctx.fillStyle = (halo ? style.halo : style.lights)[list[i][2]];
        ctx.fillRect(q.x - h, q.y - h, h * 2, h * 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* A blade as a dark line with a lit lip one pixel across from it. */
  function blades(ctx, view, P, list, a, width, px1) {
    for (var pass = 0; pass < 2; pass++) {
      var lip = pass === 1;
      ctx.strokeStyle = lip ? mono(true, 0.34 * a) : mono(false, 0.58 * a);
      ctx.lineWidth = lip ? Math.max(0.4, width * 0.5) : width;
      ctx.beginPath();
      for (var i = 0; i < list.length; i++) {
        var L = list[i], dx = lip ? px1 : 0;
        seg(ctx, P, L[0] + dx, L[1], L[0] + dx, L[2]);
      }
      ctx.stroke();
    }
  }

  function fins(ctx, view, el, style) {
    var d = el.design, P = frame(view, el), a = style.a;
    var h = el.size, W = el.width, n = el.fins, pitch = W / n;
    var px1 = 0.9 / view.px(1);
    var base = h * 0.10;

    /* The manifold the fins stand on, dark, lit along its top. */
    ctx.fillStyle = mono(false, 0.40 * a);
    ctx.beginPath();
    box(ctx, P, -W / 2 - pitch * 0.4, 0, W / 2 + pitch * 0.4, base);
    ctx.fill();

    var thin = [], heavy = [];
    for (var i = 0; i < n; i++) {
      var x = -W / 2 + pitch * (i + 0.5);
      var end = Math.min(i, n - 1 - i);
      var top = h * (d.stepped && end < 2 ? 0.72 + 0.14 * end : 1);
      (d.brace && i % d.brace === 0 ? heavy : thin).push([x, base, top]);
    }
    var w = Math.max(0.5, view.px(pitch) * 0.32);
    blades(ctx, view, P, thin, a, w, px1);
    blades(ctx, view, P, heavy, a * 1.2, w * 1.8, px1);

    /* THE HEAT. The coolant comes in hot at the manifold, so the fins are
     * warm at the root and cool by the tip: a short warm stroke on each. */
    ctx.strokeStyle = style.warm;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (i = 0; i < n; i++) {
      var xx = -W / 2 + pitch * (i + 0.5);
      seg(ctx, P, xx, base, xx, base + h * 0.22);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = mono(true, 0.22 * a);
    ctx.lineWidth = view.lw(0.5);
    ctx.beginPath();
    seg(ctx, P, -W / 2 - pitch * 0.4, base, W / 2 + pitch * 0.4, base);
    ctx.stroke();
  }

  /* A SENSOR STANDS IN SPACE, off the hull's face, so it is drawn in
   * machined metal (hullFill), not the monochrome shading a band fixture
   * takes: black on black against the sky left only its lights. */
  function sensor(ctx, view, el, style) {
    var d = el.design, P = frame(view, el);
    var h = el.size, W = el.width, k = d.masts;
    var base = h * 0.12, cell = W / k, rd = cell * 0.36;
    var w = Math.max(0.7, view.px(h) * 0.05);

    ctx.lineJoin = "miter";
    ctx.beginPath();
    box(ctx, P, -W / 2, -h * 0.04, W / 2, base);
    ctx.fillStyle = style.hull;
    ctx.fill();
    ctx.strokeStyle = style.trim;
    ctx.lineWidth = view.lw(0.7);
    ctx.stroke();

    var masts = [], tips = [], bars = [], dishes = [], i;
    for (i = 0; i < k; i++) {
      var x = -W / 2 + cell * (i + 0.5);
      var mid = (k - 1) / 2;
      var hm = h * (d.crown && k > 1 ? 1 - 0.32 * Math.abs(i - mid) / Math.max(1, mid) : 0.86);
      masts.push([x, base, x, hm * (d.tops[i] === "dish" ? 0.70 : 1)]);
      if (d.tops[i] === "mast") {
        for (var j = 0; j < 3; j++) {
          var y = hm * (0.52 + 0.15 * j), bw = rd * (1 - 0.28 * j);
          bars.push([x - bw, y, x + bw, y]);
        }
        tips.push([x, hm, d.light]);
      } else {
        var cy = hm * 0.78;
        dishes.push([x, cy]);
        bars.push([x, cy, x, cy + rd * 0.8]);
        tips.push([x, cy + rd * 0.8, i % 2 ? 1 : d.light]);
      }
    }

    /* The members: a dark outline, then the metal in it. */
    function members(stroke, width) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (var m = 0; m < masts.length; m++) seg(ctx, P, masts[m][0], masts[m][1], masts[m][2], masts[m][3]);
      for (m = 0; m < bars.length; m++) seg(ctx, P, bars[m][0], bars[m][1], bars[m][2], bars[m][3]);
      ctx.stroke();
    }
    members(style.trim, w + Math.max(1, w * 0.8));
    members(style.hull, w);

    /* A dish open to space: a bowl, its inside catching the light. */
    for (i = 0; i < dishes.length; i++) {
      ctx.beginPath();
      for (var t = 0; t <= 12; t++) {
        var u = Math.PI + Math.PI * t / 12;
        var q = P(dishes[i][0] + rd * Math.cos(u), dishes[i][1] + rd * 0.65 * Math.sin(u));
        if (t === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      }
      ctx.closePath();
      ctx.fillStyle = style.lit;
      ctx.fill();
      ctx.strokeStyle = style.trim;
      ctx.lineWidth = view.lw(0.8);
      ctx.stroke();
    }
    lights(ctx, view, P, tips, style);
  }

  function dock(ctx, view, el, style) {
    var d = el.design, P = frame(view, el), a = style.a;
    var h = el.size, W = el.width, hw = W / 2;
    var over = 2 / view.px(1);

    /* The recess, open at the band's outer face, its floor plate lit. */
    ctx.fillStyle = mono(false, 0.62 * a);
    ctx.beginPath();
    box(ctx, P, -hw, -h, hw, over);
    ctx.fill();
    ctx.fillStyle = mono(true, 0.12 * a);
    ctx.beginPath();
    box(ctx, P, -hw, -h, hw, -h * 0.86);
    ctx.fill();

    /* Flanges either side of the mouth: plate standing proud of the face. */
    ctx.fillStyle = mono(true, 0.14 * a);
    ctx.beginPath();
    box(ctx, P, -hw * 1.30, -h * 0.16, -hw, 0);
    box(ctx, P, hw, -h * 0.16, hw * 1.30, 0);
    ctx.fill();

    /* The walls: a dark edge in the band, a lit face in the bay. */
    var px1 = 0.9 / view.px(1);
    ctx.lineWidth = view.lw(0.9);
    ctx.strokeStyle = mono(false, 0.60 * a);
    ctx.beginPath();
    seg(ctx, P, -hw - px1, -h, -hw - px1, 0);
    seg(ctx, P, hw + px1, -h, hw + px1, 0);
    seg(ctx, P, -hw * 1.30, -h * 0.16, hw * 1.30, -h * 0.16);
    ctx.stroke();
    ctx.strokeStyle = mono(true, 0.28 * a);
    ctx.lineWidth = view.lw(0.6);
    ctx.beginPath();
    seg(ctx, P, -hw + px1, -h, -hw + px1, 0);
    seg(ctx, P, hw - px1, -h, hw - px1, 0);
    seg(ctx, P, -hw, -h * 0.86, hw, -h * 0.86);
    ctx.stroke();

    /* The cradle: a beam across the floor and two arms up from it. */
    var cy = -h * 0.72;
    ctx.strokeStyle = mono(true, 0.30 * a);
    ctx.lineWidth = Math.max(0.6, view.px(h) * 0.05);
    ctx.beginPath();
    seg(ctx, P, -hw * 0.62, cy, hw * 0.62, cy);
    seg(ctx, P, -hw * 0.62, cy, -hw * 0.62, cy + h * 0.18);
    seg(ctx, P, hw * 0.62, cy, hw * 0.62, cy + h * 0.18);
    ctx.stroke();

    /* A craft in the berth, nose to space, in machined metal. */
    if (el.craft) {
      var cw = hw * 0.42;
      var pts = [[0, -h * 0.12], [cw, -h * 0.30], [cw, -h * 0.66], [cw * 0.5, -h * 0.78],
                 [-cw * 0.5, -h * 0.78], [-cw, -h * 0.66], [-cw, -h * 0.30]];
      ctx.beginPath();
      for (var i = 0; i < pts.length; i++) {
        var q = P(pts[i][0], pts[i][1]);
        if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      }
      ctx.closePath();
      ctx.fillStyle = style.hull;
      ctx.fill();
      ctx.strokeStyle = style.trim;
      ctx.lineWidth = view.lw(0.7);
      ctx.stroke();
    }

    /* Approach lights down both walls, accent and white by turns, and the
     * mouth's corners in warning amber. */
    var list = [[-hw * 1.15, -h * 0.08, 2], [hw * 1.15, -h * 0.08, 2]];
    for (var j = 0; j < d.lights; j++) {
      var y = -h * (0.24 + 0.56 * j / Math.max(1, d.lights - 1));
      var c = j % 2 ? 1 : 0;
      list.push([-hw * 0.84, y, c], [hw * 0.84, y, c]);
    }
    if (el.craft) list.push([0, -h * 0.16, 0]);
    lights(ctx, view, P, list, style);
  }

  var DRAW = { fins: fins, sensor: sensor, dock: dock };

  function fixture(ctx, view, el, style) {
    var fn = DRAW[el.fixture];
    if (!fn || !el.design || view.px(el.size) < 1.5) return;
    ctx.save();
    ctx.lineCap = "butt";
    fn(ctx, view, el, style);
    ctx.restore();
  }

  /* The drawn alpha for the monochrome shading, hullFill's machined metal
   * for a craft (keyed to the design, one finish for the set), the void
   * lights' three colours, and the radiator heat in their warning colour. */
  function fixtureStyle(colour, el, alpha) {
    var metal = CC.DrawDetails.hullFill(colour, { seed: el.design ? el.design.aspect : 0 }, alpha);
    var hsv = CC.ShellWallDraw.lightHsv({ accent: colour.accent }, colour);
    metal.a = alpha;
    metal.halo = hsv.map(function (h) { return CC.Color.hsva(h[0], h[1], h[2], alpha); });
    metal.lights = hsv.map(function (h) { return CC.Color.hsva(h[0], h[1] * 0.6, 1, alpha); });
    metal.warm = CC.Color.hsva(hsv[2][0], 0.75, 1, alpha);
    return CC.ShellWallDraw.powered(metal, el);
  }

  CC.Primitives.register({ "fixture": fixture });
  CC.Primitives.registerStyle("fixture", fixtureStyle);

  /* For the designs drawn in other files (draw/primitives/machinery.js):
   * their drawing function by design name, and the frame and helpers they
   * share with these. */
  CC.FixtureDraw = {
    register: function (name, fn) {
      if (DRAW[name]) throw new Error("fixture design already drawn: " + name);
      DRAW[name] = fn;
    },
    frame: frame, seg: seg, box: box, lights: lights, mono: mono, blades: blades
  };
})();
