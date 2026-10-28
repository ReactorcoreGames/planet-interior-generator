/* Trait marks for a body made of gas — each a different KIND of mark from
 * anything the gas itself draws (D76/D160).
 *
 * The cloud is soft discs, threads, lanes, knots and points of light
 * (draw/primitives/diffuse.js). A trait laid over that must be a different
 * statement or it is just more cloud:
 *
 *   pillar      a COLUMN — dark dense gas standing out of a bank, its head
 *               lit and boiling away toward the light. Elongated and aimed:
 *               nothing else in the cloud has a direction it points
 *   bow-shock   a clean PARABOLA — a star ploughing through the gas. The only
 *               smooth geometric curve in a body with no clean lines
 *   bubble      a HOLE with a bright skin — a cavity blown out by a star's
 *               wind: the inside dark (or, in a dark cloud, lit from behind),
 *               the swept-up gas piled round it as a ragged lit shell
 *   web         a NETWORK — threads that meet and close into cells
 *   glint       a hard metallic FLECK with a specular point — not light, a
 *               thing catching it
 *   gas-pocket  a vivid OFF-HUE blob, more saturated than anything round it
 *   frost       a COLD HAZE along a belt of ice: chill leaking into the gas
 *
 * Positions are body space through `view.at`, as every primitive's are;
 * `el.aim` is a body-space bearing (gen/diffuse-pockets.js). Names no role
 * and no archetype. Load order: after draw/primitives/diffuse.js. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = CC.Math.TAU, clamp = CC.Math.clamp;
  var K = CC.Primitives.softKit;
  var parts = K.parts, rgba = K.rgba, hash = K.hash, softDisc = K.softDisc;

  /* A point `d` body radii from the element along bearing `b`, in pixels. */
  function along(view, el, b, d) {
    var x = Math.sin(el.angle) * el.radius + Math.sin(b) * d;
    var y = -Math.cos(el.angle) * el.radius - Math.cos(b) * d;
    return view.at(Math.sqrt(x * x + y * y), Math.atan2(x, -y));
  }
  function offset(view, el, dx, dy) {
    var x = Math.sin(el.angle) * el.radius + dx;
    var y = -Math.cos(el.angle) * el.radius + dy;
    return view.at(Math.sqrt(x * x + y * y), Math.atan2(x, -y));
  }
  function scaled(c, k) {
    return [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)];
  }

  /* ---- pillar ----------------------------------------------------------
   *
   * THE PILLARS OF CREATION. A column of cold dense gas the light has not
   * yet eaten, standing out of the bank behind it with its head toward the
   * source. Soft dark discs strung up a gently bent spine — dissolving into
   * the bank at its foot, so it grows out of the gas rather than being laid
   * on it — then the head: a bright ionisation front facing the light, a few
   * small nubs on it (the "EGGs" where stars are forming), and a haze of gas
   * boiling off the top. */
  function pillar(ctx, view, el, style) {
    var c = parts(style);
    var dark = scaled(c, 0.13);
    var b = el.aim === undefined ? el.angle : el.aim;
    var L = el.size;
    var steps = 26;
    var lean = (hash(el.seed, 1) - 0.5) * 0.5;
    var pts = [];
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      /* A bend: the spine drifts sideways and back. */
      var side = Math.sin(t * Math.PI) * lean * L * 0.35;
      var x = Math.sin(b) * L * t + Math.cos(b) * side;
      var y = -Math.cos(b) * L * t + Math.sin(b) * side;
      pts.push({ p: offset(view, el, x, y), t: t });
    }
    var W = view.px(L) * 0.15;
    /* Broad at the foot, narrower up the neck, a little head at the top. */
    function widthAt(tt) {
      return W * (1.35 - 0.7 * tt + 0.3 * Math.exp(-Math.pow((tt - 0.88) / 0.09, 2)));
    }
    function fadeAt(tt) {
      var f = Math.min(1, tt / 0.3);
      return f * f * (3 - 2 * f);
    }
    ctx.save();
    /* THE SHEATH — bright gas hugging the column, wider than it. Laid first,
     * so the dark body on top leaves it as a lit edge down both flanks: the
     * thing that makes the Pillars read, more than any outline. Brighter
     * toward the head, where the light is eating it. */
    ctx.globalCompositeOperation = "screen";
    for (i = 0; i <= steps; i++) {
      var ts = pts[i].t;
      softDisc(ctx, pts[i].p.x, pts[i].p.y,
               Math.max(1.5, widthAt(ts) * 1.75 * (0.9 + 0.2 * hash(el.seed, 140 + i))),
               0.9, hash(el.seed, 160 + i) * TAU, c,
               c[3] * 0.20 * fadeAt(ts) * (0.45 + 0.55 * ts));
    }
    ctx.globalCompositeOperation = "source-over";
    for (i = 0; i <= steps; i++) {
      var tt = pts[i].t;
      var wob = 0.85 + 0.3 * hash(el.seed, 20 + i);
      softDisc(ctx, pts[i].p.x, pts[i].p.y, Math.max(1.2, widthAt(tt) * 1.2 * wob), 0.85,
               hash(el.seed, 40 + i) * TAU, dark, c[3] * 0.85 * fadeAt(tt));
    }
    /* Lit flanks: a thread of light just inside each edge, up the top
     * two-thirds, fading in as it climbs. */
    ctx.globalCompositeOperation = "screen";
    for (i = Math.floor(steps * 0.3); i < steps; i++) {
      var p0 = pts[i].p, p1 = pts[i + 1].p;
      var dx = p1.x - p0.x, dy = p1.y - p0.y, dl = Math.max(1e-6, Math.sqrt(dx * dx + dy * dy));
      var nx = -dy / dl, ny = dx / dl;
      var k = (pts[i].t - 0.3) / 0.7;
      var ew = widthAt(pts[i].t) * 0.62;
      for (var sd = -1; sd <= 1; sd += 2) {
        softDisc(ctx, p0.x + nx * ew * sd, p0.y + ny * ew * sd,
                 Math.max(1, W * 0.22), 0.6, Math.atan2(dy, dx), c,
                 c[3] * 0.42 * k * (sd > 0 ? 1 : 0.6));
      }
    }
    ctx.globalCompositeOperation = "source-over";
    /* The lit head: a crescent across the top, facing along the pillar. */
    var head = pts[steps - 1].p, tip = pts[steps].p;
    var face = Math.atan2(tip.y - head.y, tip.x - head.x);
    var hr = Math.max(1.5, W * 1.05);
    K.crescent(ctx, head.x, head.y, hr, face, c, c[3], Math.max(0.8, hr * 0.34));
    /* Gas boiling off the head toward the light. */
    ctx.globalCompositeOperation = "screen";
    var haze = along(view, el, b, L * 1.1);
    softDisc(ctx, haze.x, haze.y, W * 2.0, 0.7, face, c, c[3] * 0.30);
    /* The nubs: tiny dark knots on the head, lit on top. */
    ctx.globalCompositeOperation = "source-over";
    var nubs = 2 + Math.floor(hash(el.seed, 70) * 3);
    for (var n = 0; n < nubs; n++) {
      var at = pts[Math.floor(steps * (0.72 + 0.22 * hash(el.seed, 80 + n)))].p;
      var sx = (hash(el.seed, 90 + n) - 0.5) * W * 1.8;
      var nx = at.x + Math.cos(face + Math.PI / 2) * sx;
      var ny = at.y + Math.sin(face + Math.PI / 2) * sx;
      var nr = Math.max(1, W * (0.22 + 0.15 * hash(el.seed, 100 + n)));
      softDisc(ctx, nx, ny, nr, 0.8, face, dark, c[3] * 0.7);
      K.crescent(ctx, nx, ny, nr, face, c, c[3] * 0.8, Math.max(0.5, nr * 0.3));
    }
    ctx.restore();
  }

  /* ---- bow shock -------------------------------------------------------
   *
   * A star moving through the gas faster than sound travels in it piles a
   * curved front up ahead of itself. A parabola about the star, apex along
   * its heading (`aim`), stroked in several passes of falling width so the
   * leading edge is the brightest and the arc thins and fades out along its
   * wings — never a line that stops. */
  function bowShock(ctx, view, el, style) {
    var c = parts(style);
    var a = el.size * 0.26;               /* star to apex, body radii */
    var b = el.aim === undefined ? el.angle : el.aim;
    var ux = Math.sin(b), uy = -Math.cos(b);  /* ahead, body space */
    var vx = Math.cos(b), vy = Math.sin(b);   /* across */
    var steps = 32;
    var pts = [];
    for (var i = 0; i <= steps; i++) {
      var s = (i / steps * 2 - 1) * 3.4 * a;
      var f = a - s * s / (4 * a);         /* distance ahead of the star */
      pts.push(offset(view, el, ux * f + vx * s, uy * f + vy * s));
    }
    var w = Math.max(0.8, view.px(el.size) * 0.03);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    /* Gas piled up at the apex: a soft swelling along the front, so the
     * shock is compressed MATERIAL and not a drawn curve. */
    for (i = Math.floor(steps * 0.3); i <= Math.ceil(steps * 0.7); i++) {
      var kk = Math.sin(Math.PI * i / steps);
      softDisc(ctx, pts[i].x, pts[i].y, Math.max(1.5, w * 4.5 * kk), 0.6,
               hash(el.seed, 300 + i) * TAU, c, c[3] * 0.10 * kk);
    }
    ctx.lineCap = "round";
    var passes = [[4.2, 0.10], [2.0, 0.26], [0.8, 0.85]];
    for (var p = 0; p < passes.length; p++) {
      for (i = 0; i < steps; i++) {
        var t = (i + 0.5) / steps;
        var k = Math.pow(Math.sin(Math.PI * t), 1.6);
        ctx.strokeStyle = rgba(c, c[3] * passes[p][1] * k);
        ctx.lineWidth = Math.max(0.4, w * passes[p][0] * (0.4 + 0.6 * k));
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
        ctx.stroke();
      }
    }
    /* The star that made it: a small hot point a little behind the apex. */
    var sp = view.at(el.radius, el.angle);
    var sr = Math.max(1.5, view.px(a) * 0.5);
    var g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sr);
    g.addColorStop(0, "rgba(255,255,255," + Math.min(1, c[3]) + ")");
    g.addColorStop(0.15, rgba(c, c[3] * 0.5));
    g.addColorStop(1, rgba(c, 0));
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sr, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /* ---- bubble ----------------------------------------------------------
   *
   * A CAVITY BLOWN BY A STAR'S WIND. Three parts: the inside, which BLOCKS
   * (`absorb` — dark against glowing gas) or GLOWS (`emit` — in a dark cloud,
   * clearing the dust lets the light behind it through), both dialled by the
   * trait's own curve; the swept-up shell round it, lumpy and lit from the
   * inside; and the star, drawn as the trait's extra mark. */
  function bubble(ctx, view, el, style) {
    var c = parts(style);
    var p = view.at(el.radius, el.angle);
    var R = Math.max(3, view.px(el.size));
    var absorb = el.absorb === undefined ? 0.8 : el.absorb;
    var emit = el.emit || 0;
    /* NOT A CIRCLE. A wind blows a cavity as far as the gas lets it, and the
     * gas is uneven: three low harmonics of the radius, per cavity. Drawn as
     * a crisp circle it read as a hole punched in the picture. */
    var ph = [hash(el.seed, 4) * TAU, hash(el.seed, 5) * TAU, hash(el.seed, 6) * TAU];
    function rAt(a) {
      return R * (1 + 0.12 * Math.sin(2 * a + ph[0]) + 0.07 * Math.sin(3 * a + ph[1]) +
                  0.05 * Math.sin(5 * a + ph[2]));
    }
    function trace(k) {
      ctx.beginPath();
      for (var j = 0; j <= 64; j++) {
        var a = j / 64 * TAU, r = rAt(a) * k;
        if (j === 0) ctx.moveTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
        else ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
      }
      ctx.closePath();
    }
    /* The inside, as nested outlines compounding toward the middle — a soft
     * edge that still follows the wobble (draw/feather.js's construction). */
    function fillIn(colour, a) {
      ctx.fillStyle = rgba(colour, a);
      for (var j = 0; j < 6; j++) { trace(1.02 - j * 0.07); ctx.fill(); }
    }
    ctx.save();
    if (absorb > 0.01) fillIn(scaled(c, 0.06), absorb * 0.17);
    ctx.globalCompositeOperation = "screen";
    if (emit > 0.01) fillIn(c, emit * 0.08);
    /* The shell: soft lumps of swept-up gas round the rim, one flank
     * brighter, broken in places. Lumps, not a line — every lit edge in this
     * body is gas. */
    var lumps = 52;
    var bright = hash(el.seed, 3) * TAU;
    for (var i = 0; i < lumps; i++) {
      if (hash(el.seed, 90 + i) < 0.12) continue;
      var ang = (i + hash(el.seed, 10 + i) * 0.8) / lumps * TAU;
      var rr = rAt(ang) * (0.93 + 0.14 * hash(el.seed, 50 + i));
      var lit = 0.4 + 0.6 * (0.5 + 0.5 * Math.cos(ang - bright));
      softDisc(ctx, p.x + Math.cos(ang) * rr, p.y + Math.sin(ang) * rr,
               R * (0.10 + 0.12 * hash(el.seed, 130 + i)), 0.55, ang + Math.PI / 2,
               c, c[3] * 0.6 * lit);
    }
    /* The lit inner face: smaller, brighter lumps just inside, where the
     * star's light first strikes the shell. */
    for (i = 0; i < 40; i++) {
      var a2 = (i + hash(el.seed, 200 + i)) / 40 * TAU;
      var k = 0.3 + 0.7 * (0.5 + 0.5 * Math.cos(a2 - bright));
      var r2 = rAt(a2) * 0.88;
      softDisc(ctx, p.x + Math.cos(a2) * r2, p.y + Math.sin(a2) * r2,
               R * 0.07, 0.5, a2 + Math.PI / 2, c, c[3] * 0.45 * k);
    }
    ctx.restore();
  }

  /* ---- web ---------------------------------------------------------------
   *
   * Threads that meet. Each strand gently bowed and faded at both ends, but
   * only part way — a joint where three meet must still read as a joint. */
  function web(ctx, view, el, style) {
    var c = parts(style);
    var segs = el.segs || [];
    var w = Math.max(0.6, view.lw(1.1));
    ctx.save();
    ctx.globalCompositeOperation = el.blend || "screen";
    ctx.lineCap = "round";
    /* Two passes: a broad faint glow, then the bright core. A hairline
     * screened onto bright gas vanished. */
    for (var pass = 0; pass < 2; pass++) {
    var wk = pass === 0 ? 3.2 : 1, ak = pass === 0 ? 0.3 : 1;
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      var bow = (s[4] - 0.5) * 0.9;
      var mx = (s[0] + s[2]) / 2 - (s[3] - s[1]) * bow;
      var my = (s[1] + s[3]) / 2 + (s[2] - s[0]) * bow;
      var p0 = offset(view, el, s[0], s[1]);
      var pm = offset(view, el, mx, my);
      var p1 = offset(view, el, s[2], s[3]);
      /* Strands far from the patch's middle are fainter, so the web frays
       * out rather than ending at a circle. */
      var d = Math.sqrt(mx * mx + my * my) / Math.max(1e-6, el.size);
      var k = Math.max(0, 1 - d * d) * (0.55 + 0.45 * s[4]);
      if (k < 0.03) continue;
      var g = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
      g.addColorStop(0, rgba(c, c[3] * k * ak * 0.35));
      g.addColorStop(0.5, rgba(c, c[3] * k * ak));
      g.addColorStop(1, rgba(c, c[3] * k * ak * 0.35));
      ctx.strokeStyle = g;
      ctx.lineWidth = w * wk * (0.6 + 0.6 * s[4]);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(pm.x, pm.y, p1.x, p1.y);
      ctx.stroke();
    }
    }
    ctx.restore();
  }

  /* ---- glint -------------------------------------------------------------
   *
   * METAL CATCHING LIGHT. A hard little fleck of grey with one white point
   * on its lit corner, and on the larger ones a short sharp cross of glare.
   * Not a star: a star is a soft glow; this is an edge and a highlight. */
  function glint(ctx, view, el, style) {
    var c = parts(style);
    var p = view.at(el.radius, el.angle);
    var r = Math.max(0.9, view.px(el.size));
    var grey = [Math.round(110 + c[0] * 0.25), Math.round(112 + c[1] * 0.25),
                Math.round(118 + c[2] * 0.25)];
    var spin = hash(el.seed, 1) * TAU;
    ctx.save();
    ctx.beginPath();
    for (var i = 0; i < 4; i++) {
      var a = spin + i * TAU / 4 + (hash(el.seed, 5 + i) - 0.5) * 0.9;
      var rr = r * (0.6 + 0.5 * hash(el.seed, 9 + i));
      if (i === 0) ctx.moveTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
      else ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = rgba(grey, c[3] * 0.9);
    ctx.fill();
    ctx.strokeStyle = rgba(scaled(grey, 0.35), c[3] * 0.8);
    ctx.lineWidth = Math.max(0.3, r * 0.15);
    ctx.stroke();
    var hx = p.x + Math.cos(spin) * r * 0.4, hy = p.y + Math.sin(spin) * r * 0.4;
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(255,255,255," + Math.min(1, c[3]) + ")";
    ctx.beginPath();
    ctx.arc(hx, hy, Math.max(0.5, r * 0.28), 0, TAU);
    ctx.fill();
    if (hash(el.seed, 20) < 0.2) {
      var L = r * (2.2 + 1.6 * hash(el.seed, 21));
      ctx.strokeStyle = "rgba(255,255,255," + Math.min(1, c[3] * 0.7) + ")";
      ctx.lineWidth = Math.max(0.35, r * 0.12);
      ctx.beginPath();
      ctx.moveTo(hx - L, hy); ctx.lineTo(hx + L, hy);
      ctx.moveTo(hx, hy - L * 0.7); ctx.lineTo(hx, hy + L * 0.7);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---- gas pocket ---------------------------------------------------------
   *
   * Something else is mixed into the gas here: a vivid blob in a hue the
   * cloud does not have (`hueShift`, rolled per pocket), held well above the
   * gas round it in saturation — but short of full: held at full it read as
   * a sticker on the picture rather than gas in it. Painted over rather than screened — screening a vivid colour
   * onto bright gas bleaches it, and the point is that it is MORE saturated
   * than what surrounds it. A steeper edge than a puff, and a hot core. */
  function gasPocket(ctx, view, el, style) {
    var c = parts(style);
    var hsv = CC.Color.rgbToHsv(c[0], c[1], c[2]);
    var rgb = CC.Color.hsvToRgb(hsv[0] + (el.hueShift || 140),
                                clamp(hsv[1], 0.46, 0.58), clamp(hsv[2], 0.6, 0.78));
    var v = [Math.round(rgb[0]), Math.round(rgb[1]), Math.round(rgb[2])];
    var p = view.at(el.radius, el.angle);
    var R = Math.max(1.5, view.px(el.size));
    ctx.save();
    /* An oval as often as a disc, each its own way round: a field of round
     * blobs read as a pattern of dots. */
    ctx.translate(p.x, p.y);
    ctx.rotate(hash(el.seed, 7) * TAU);
    ctx.scale(1, 0.6 + 0.4 * hash(el.seed, 8));
    ctx.translate(-p.x, -p.y);
    var lobes = 2 + Math.floor(hash(el.seed, 2) * 3);
    for (var i = 0; i < lobes; i++) {
      var a = hash(el.seed, 10 + i) * TAU;
      var d = R * 0.4 * hash(el.seed, 20 + i);
      var x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      var rr = R * (0.55 + 0.35 * hash(el.seed, 30 + i));
      var g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, rgba(v, c[3] * 0.72));
      g.addColorStop(0.55, rgba(v, c[3] * 0.56));
      g.addColorStop(0.8, rgba(v, c[3] * 0.2));
      g.addColorStop(1, rgba(v, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "lighter";
    softDisc(ctx, p.x, p.y, R * 0.35, 1, 0, v, c[3] * 0.22);
    ctx.restore();
  }

  /* ---- frost --------------------------------------------------------------
   *
   * The chill off a belt of ice: a pale, cold mist laid along the belt's own
   * axis (`axis`, `stretch`, from its pocket), so it hangs over the field it
   * comes from rather than round it as a disc. Pushed toward ice-blue and
   * washed out, whatever the cloud's hue; screened, and soft-edged — an aura,
   * not a cloud of its own. */
  function frost(ctx, view, el, style) {
    var c = parts(style);
    var hsv = CC.Color.rgbToHsv(c[0], c[1], c[2]);
    var rgb = CC.Color.hsvToRgb(CC.Palette.mixHue(hsv[0], 198, 0.92), 0.42,
                                clamp(hsv[2] + 0.25, 0.85, 1));
    var v = [Math.round(rgb[0]), Math.round(rgb[1]), Math.round(rgb[2])];
    var ax = el.axis || 0, st = el.stretch || 1;
    var ux = Math.sin(ax), uy = -Math.cos(ax);
    var R = Math.max(2, view.px(el.size));
    var n = 7 + Math.round(st * 3);
    var a0 = offset(view, el, 0, 0), a1 = offset(view, el, ux * el.size, uy * el.size);
    var rot = Math.atan2(a1.y - a0.y, a1.x - a0.x);
    ctx.save();
    ctx.globalCompositeOperation = el.blend || "screen";
    for (var i = 0; i < n; i++) {
      /* Over the belt's own length and no further: `size` is the haze's
       * width, already wider than the pocket, so the run is scaled back. */
      var t = (hash(el.seed, 10 + i) * 2 - 1) * st * 0.5;
      var side = (hash(el.seed, 40 + i) - 0.5) * 0.7;
      var dx = (ux * t + uy * side) * el.size, dy = (uy * t - ux * side) * el.size;
      var p = offset(view, el, dx, dy);
      var k = 1 - 0.55 * Math.abs(t) / Math.max(1, st);
      softDisc(ctx, p.x, p.y, R * (0.45 + 0.4 * hash(el.seed, 70 + i)), 0.55,
               rot, v, c[3] * 0.34 * k);
    }
    ctx.restore();
  }

  CC.Primitives.register({
    "pillar": pillar,
    "bow-shock": bowShock,
    "bubble": bubble,
    "web": web,
    "glint": glint,
    "gas-pocket": gasPocket,
    "frost": frost
  });
})();
