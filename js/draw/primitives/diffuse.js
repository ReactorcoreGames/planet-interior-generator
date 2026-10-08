/* Soft marks — the vocabulary of a body with no hard edges anywhere.
 *
 * Every primitive in draw/primitives.js has an outline: a blob is a polygon,
 * a vein a stroke, a chunk a faceted rock. A cloud has none. Each mark here
 * DISSOLVES — a radial gradient that reaches zero, a stroke whose alpha is
 * zero at both ends — because D156 is the rule this file exists for: fading
 * TOWARDS nothing is not ending AT nothing, and a field of thousands of marks
 * each with a hard rim reads as confetti however faint they are.
 *
 * Six kinds, each a different statement (D76):
 *
 *   puff       a soft round mass of gas — the workhorse
 *   billow     several puffs heaped into one billowing cloud
 *   filament   a long, thin, sinuous thread that fades in and out
 *   lane       a broad, dark, soft band of obscuring dust
 *   knot       a dense compact clump with a bright rim on its lit side
 *   rim        a bright arc on its own: the lit edge of something unseen
 *   protostar  a point of light with a glow and four faint spikes
 *
 * Same signature as every primitive: draw(ctx, view, el, style), style an
 * rgba() string from the element's tone. Names no role and no archetype. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = CC.Math.TAU;

  /* "rgba(r,g,b,a)" -> [r, g, b, a]. The style arrives as a string because
   * that is what draw/details.js hands a plain primitive; a soft mark needs the
   * same colour at a second alpha for its gradient's transparent end. Fading
   * to transparent BLACK instead puts a dark fringe round every puff. */
  function parts(style) {
    var m = /rgba?\(([^)]+)\)/.exec(style || "");
    if (!m) return [255, 255, 255, 1];
    var p = m[1].split(",");
    return [+p[0], +p[1], +p[2], p.length > 3 ? +p[3] : 1];
  }
  function rgba(c, a) {
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + Math.max(0, Math.min(1, a)) + ")";
  }
  /* A stable 0..1 from the element's seed — no RNG at draw time. */
  function hash(seed, k) {
    var x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function withBlend(ctx, el) {
    ctx.save();
    if (el.blend) ctx.globalCompositeOperation = el.blend;
  }

  /* One soft disc, squashed and turned. The profile is front-loaded so the
   * puff has a body and a long soft skirt rather than a cone. */
  function softDisc(ctx, x, y, r, sq, rot, c, a) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(1, sq);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(0.35, rgba(c, a * 0.72));
    g.addColorStop(0.7, rgba(c, a * 0.24));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function puff(ctx, view, el, style) {
    var p = view.at(el.radius, el.angle);
    var r = Math.max(1.2, view.px(el.size));
    var c = parts(style);
    withBlend(ctx, el);
    softDisc(ctx, p.x, p.y, r, 0.45 + 0.55 * hash(el.seed, 1),
             hash(el.seed, 2) * TAU, c, c[3]);
    ctx.restore();
  }

  /* A HEAP, NOT A BALL. Five to eight lobes of different sizes around an
   * off-centre middle, so the silhouette is lumpy the way a cumulus is — the
   * "billowing" in the spec is the lumpiness, and one gradient disc cannot
   * have any. */
  function billow(ctx, view, el, style) {
    var p = view.at(el.radius, el.angle);
    var R = Math.max(1.5, view.px(el.size));
    var c = parts(style);
    var lobes = 5 + Math.floor(hash(el.seed, 3) * 4);
    withBlend(ctx, el);
    for (var i = 0; i < lobes; i++) {
      var ang = hash(el.seed, 10 + i) * TAU;
      var d = R * 0.55 * Math.sqrt(hash(el.seed, 20 + i));
      var rr = R * (0.38 + 0.42 * hash(el.seed, 30 + i));
      softDisc(ctx, p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d, rr,
               0.7 + 0.3 * hash(el.seed, 40 + i), ang, c, c[3] * 0.8);
    }
    ctx.restore();
  }

  /* A path that wanders mostly ACROSS the radius rather than along it — gas
   * filaments drape round the cloud rather than pointing at its middle.
   * Walked in body space through `view.at`, so a filament rides a warped view
   * like everything else. Returns pixel points. */
  function wander(view, el, steps, along) {
    var len = el.size;
    var dir = hash(el.seed, 5) < 0.5 ? -1 : 1;
    /* How far off tangential the thread heads, and how much it bends. */
    var tilt = (hash(el.seed, 6) - 0.5) * (along === undefined ? 1.1 : along);
    var bend = (hash(el.seed, 7) - 0.5) * 1.5;
    var r = el.radius, a = el.angle;
    var pts = [];
    /* Start half a length back so the element's position is its middle. */
    var h = tilt, ds = len / steps;
    for (var back = 0; back < steps / 2; back++) {
      a -= dir * Math.cos(h) * ds / Math.max(0.05, r);
      r -= Math.sin(h) * ds;
    }
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      pts.push(view.at(Math.max(0.005, r), a));
      h = tilt + bend * (t - 0.5) + Math.sin(t * 3.3 + el.seed * 19.1) * 0.10;
      a += dir * Math.cos(h) * ds / Math.max(0.05, r);
      r += Math.sin(h) * ds;
    }
    return pts;
  }

  /* A THREAD THAT FADES IN AND OUT. Stroked segment by segment so its alpha
   * and width can follow sin(pi t) — zero at both ends, which is the whole
   * difference between a filament and a line someone drew (D156). */
  function filament(ctx, view, el, style) {
    var c = parts(style);
    var steps = 12;
    var pts = wander(view, el, steps);
    var w = view.lw(1.7 - (el.tier || 0) * 0.32);
    withBlend(ctx, el);
    ctx.lineCap = "round";
    for (var i = 0; i < steps; i++) {
      var t = (i + 0.5) / steps;
      var k = Math.sin(Math.PI * t);
      ctx.strokeStyle = rgba(c, c[3] * k);
      ctx.lineWidth = Math.max(0.4, w * (0.35 + 0.65 * k));
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* A DARK LANE — obscuring dust lying across the bright gas.
   *
   * Built from soft dark discs strung along a wandering path, broadest in the
   * middle and tapering to nothing at both ends. Discs rather than a stroked
   * band because a stroke has an edge; the overlap of soft discs gives a lane
   * that is densest along its spine and frays at its sides, which is what
   * dust looks like against glowing gas.
   *
   * The colour is the tone's, taken most of the way to black: a lane is an
   * ABSENCE of light, and `darker` alone is a value step sized for grain. */
  function lane(ctx, view, el, style) {
    var c = parts(style);
    var dark = [Math.round(c[0] * 0.22), Math.round(c[1] * 0.20), Math.round(c[2] * 0.24)];
    var steps = 28;
    /* ANY HEADING. A lane is dust lying ACROSS the gas; walked mostly
     * tangentially like a filament, every lane curled round the middle and
     * the set of them drew rings. */
    var pts = wander(view, el, steps, 3.0);
    var W = view.px(el.size) * 0.17;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var k = Math.pow(Math.sin(Math.PI * t), 0.7);
      var wob = 0.75 + 0.5 * hash(el.seed, 50 + i);
      if (k < 0.03) continue;
      softDisc(ctx, pts[i].x, pts[i].y, Math.max(1.2, W * k * wob), 0.8,
               hash(el.seed, 70 + i) * TAU, dark, c[3] * 0.36 * (0.5 + 0.5 * k));
    }
  }

  /* Where the body's centre is from a point, in pixels: the light in a
   * nebula comes from the middle, so a lit rim faces it. */
  function towardCentre(view, p) {
    var o = view.at(0, 0);
    return Math.atan2(o.y - p.y, o.x - p.x);
  }

  /* WHICH WAY A LIT EDGE FACES. A nebula's clumps are lit by its dominant
   * source, so every rim on the body faces the same way, give or take — the
   * builder rolls that bearing once per body (js/gen/diffuse.js). Facing the
   * body's centre instead turned the core's rims into concentric rings,
   * which is the ring structure this body must not have. */
  function lightFace(view, p, el) {
    if (el.light === undefined) return towardCentre(view, p);
    return Math.atan2(-Math.cos(el.light), Math.sin(el.light)) +
           (hash(el.seed, 12) - 0.5) * 0.7;
  }

  /* A bright crescent: the lit face of a clump. */
  function crescent(ctx, x, y, r, face, c, a, w) {
    var span = 1.15;
    var g = ctx.createRadialGradient(x, y, r * 0.55, x, y, r * 1.15);
    g.addColorStop(0, rgba(c, 0));
    g.addColorStop(0.62, rgba(c, a));
    g.addColorStop(1, rgba(c, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    /* Three short arcs of falling width, so the rim tapers at its tips rather
     * than ending square. */
    for (var k = 0; k < 3; k++) {
      var s = span * (1 - k * 0.3);
      ctx.globalAlpha = 0.55 + 0.15 * k;
      ctx.lineWidth = w * (1 - k * 0.25);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.85, face - s / 2, face + s / 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* A DENSE CLUMP, LIT FROM ONE SIDE. A dark-cored puff with a bright edge
   * facing the light — the ionisation front that makes a real
   * globule read as solid. The rim is what separates a knot from a puff. */
  function knot(ctx, view, el, style) {
    var p = view.at(el.radius, el.angle);
    var r = Math.max(1.5, view.px(el.size));
    var c = parts(style);
    var body = [Math.round(c[0] * 0.45), Math.round(c[1] * 0.42), Math.round(c[2] * 0.48)];
    withBlend(ctx, el);
    softDisc(ctx, p.x, p.y, r, 0.75 + 0.25 * hash(el.seed, 8), hash(el.seed, 9) * TAU,
             body, c[3] * 0.6);
    crescent(ctx, p.x, p.y, r * 0.8, lightFace(view, p, el), c, c[3],
             Math.max(0.6, r * 0.22));
    ctx.restore();
  }

  function rim(ctx, view, el, style) {
    var p = view.at(el.radius, el.angle);
    var r = Math.max(1.5, view.px(el.size));
    var c = parts(style);
    withBlend(ctx, el);
    crescent(ctx, p.x, p.y, r, lightFace(view, p, el), c, c[3], Math.max(0.6, r * 0.14));
    ctx.restore();
  }

  /* A STAR BEING BORN: a hot point, a soft glow, four faint spikes. The only
   * mark in the nebula with a hard centre, because it is the only thing in it
   * that is not gas. Additive, so it brightens what it sits in. */
  function protostar(ctx, view, el, style) {
    var p = view.at(el.radius, el.angle);
    var r = Math.max(2, view.px(el.size));
    var c = parts(style);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    /* STEEP: nearly all the light within a fifth of the radius. A gentle
     * profile read as a lit DISC with an edge, and the spikes across it as a
     * cross painted on a ball. */
    var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, rgba(c, c[3]));
    g.addColorStop(0.06, rgba(c, c[3] * 0.55));
    g.addColorStop(0.2, rgba(c, c[3] * 0.16));
    g.addColorStop(0.5, rgba(c, c[3] * 0.012));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, TAU);
    ctx.fill();
    /* SPIKES AS TAPERED LIGHT, NOT LINES. Four constant-width strokes of
     * equal weight at right angles read as a drawn X — "unnatural to look
     * at", in the user's words. Each is a thin wedge, widest at the point
     * and closing to nothing at its tip, fading the whole way; one pair is
     * longer and stronger than the other, and the set is turned per star.
     * `spikes` (0..1, from the recipe) scales them, so a mark whose source
     * is already stated another way — a pulsar's beams — can keep a trace. */
    var sk = el.spikes === undefined ? 1 : el.spikes;
    if (sk > 0) {
      var spin = hash(el.seed, 4) * 0.6;
      for (var k = 0; k < 4; k++) {
        var a = spin + k * TAU / 4;
        var major = k % 2 === 0;
        var L = r * (major ? 2.6 : 1.5) * (0.85 + 0.3 * hash(el.seed, 30 + k));
        var hw = Math.max(0.5, r * (major ? 0.045 : 0.03));
        var ex = Math.cos(a), ey = Math.sin(a);
        var lg = ctx.createLinearGradient(p.x, p.y, p.x + ex * L, p.y + ey * L);
        lg.addColorStop(0, rgba(c, c[3] * sk * (major ? 0.55 : 0.32)));
        lg.addColorStop(0.35, rgba(c, c[3] * sk * (major ? 0.18 : 0.10)));
        lg.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(p.x - ey * hw, p.y + ex * hw);
        ctx.lineTo(p.x + ex * L, p.y + ey * L);
        ctx.lineTo(p.x + ey * hw, p.y - ex * hw);
        ctx.closePath();
        ctx.fill();
      }
    }
    /* The white-hot point itself. */
    ctx.fillStyle = "rgba(255,255,255," + Math.min(1, c[3]) + ")";
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.8, r * 0.07), 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /* THE REGION'S BODY: a lattice of soft cells, each as bright as the gas is
   * thick where it sits (js/gen/diffuse.js), fading out toward the region's
   * edge. Additive within itself would blow out; source-over at a low alpha
   * per cell lets the overlaps build density the way the background's
   * nebula does, without bleaching. */
  function cloudField(ctx, view, el, style) {
    var c = parts(style);
    var cells = el.cells || [];
    var R = el.reachR || 1;
    var rIn = el.reachIn || 0;
    /* Where the fade toward the region's edge begins, as a share of its
     * radius. A small region fading only over its outer rim reads as a ball. */
    var f0 = 1 - (el.fade || 0.4);
    var base = Math.max(1.5, view.px(el.size));

    /* THREE QUANTITIES, NOT ONE (js/gen/diffuse.js `dial`): how much light
     * the gas gives off, how much it blocks, and how much of what it shows is
     * lit from one flank. Without a dial: one screened pass, as before. */
    var dialled = el.emit !== undefined || el.absorb !== undefined;
    var emit = el.emit === undefined ? 1 : el.emit;
    var absorb = el.absorb || 0;
    var side = el.side || 0;
    /* The light bearing as a unit vector in body space (angle 0 is up). */
    var lx = Math.sin(el.light || 0), ly = -Math.cos(el.light || 0);
    var dark = [Math.round(c[0] * 0.16), Math.round(c[1] * 0.15), Math.round(c[2] * 0.18)];

    function pass(blend, colour, weight, lit) {
      ctx.save();
      if (blend) ctx.globalCompositeOperation = blend;
      for (var i = 0; i < cells.length; i++) {
        var q = cells[i];
        var u = q.r / R;
        var edge = u < f0 ? 1 : Math.max(0, 1 - (u - f0) / (1 - f0));
        edge = edge * edge * (3 - 2 * edge);
        if (rIn > 0) {
          /* A SHELL: brightest a third of the way out from its inner edge,
           * fading to nothing at both — the ring is the material, and the
           * cavity it encloses must not get a drawn rim. */
          var w = (q.r - rIn) / Math.max(1e-6, R - rIn);
          var inn = Math.min(1, w / 0.35);
          edge = Math.min(edge, inn * inn * (3 - 2 * inn));
        }
        var k = 1;
        if (lit && side > 0) {
          /* +1 on the flank facing the light, -1 on the far one. */
          var dot = (Math.sin(q.a) * lx + -Math.cos(q.a) * ly) * Math.min(1, u * 1.4);
          k = Math.max(0, 1 + side * dot);
        }
        /* Absorption rises faster with density than emission does: even
         * middling dust is opaque, which is what makes a dark cloud a
         * silhouette rather than a tint. */
        var a = weight * Math.pow(q.d, lit ? 1.5 : 0.75) * edge * k;
        if (a < 0.004) continue;
        var p = view.at(q.r, q.a);
        softDisc(ctx, p.x, p.y, base * (0.7 + 0.6 * q.s), 0.7 + 0.3 * q.s,
                 q.s * TAU, colour, a);
      }
      ctx.restore();
    }

    if (!dialled) { pass(el.blend, c, c[3], false); return; }
    /* Blocking first, so the light the gas gives off sits on top of it. */
    if (absorb > 0.01) pass(null, dark, Math.min(1, absorb), false);
    if (emit > 0.01) pass(el.blend || "screen", c, c[3] * emit, true);
  }

  CC.Primitives.register({
    "cloud-field": cloudField,
    "puff": puff,
    "billow": billow,
    "filament": filament,
    "lane": lane,
    "knot": knot,
    "rim": rim,
    "protostar": protostar
  });
})();
