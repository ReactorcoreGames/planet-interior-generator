/* The orbital minefield — drawing gen/orbitalbuilt.js's `minefield`.
 *
 *   minefield   per mine, four thin spikes from the orb's surface, each
 *               twice the orb's length (its diameter), a knob at each tip;
 *               then the orb, a dark metal sphere lit on one side; on some,
 *               a small red light
 *
 * Every mine is turned the same way to its own radial, so the field reads
 * as laid rather than drifting. Metal is hullFill's (draw/details.js). The
 * same calls at every size, so zoom cannot change the count. Pixels enter
 * only through `view`.
 *
 * draw/primitives.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;

  function minefield(ctx, view, el, st) {
    var S = view.px(1);
    var o = el.orb * S;
    var spike = o * 4;
    ctx.save();
    ctx.lineCap = "round";
    var i, m, p, q, ux, uy, c, s, k;

    /* The spikes, all in one path. */
    ctx.strokeStyle = st.hull;
    ctx.lineWidth = Math.max(0.5, o * 0.16);
    ctx.beginPath();
    var tips = [];
    for (i = 0; i < el.mines.length; i++) {
      m = el.mines[i];
      p = view.at(m.r, m.a);
      q = view.at(m.r + 0.01, m.a);
      ux = q.x - p.x; uy = q.y - p.y;
      var l = Math.sqrt(ux * ux + uy * uy) || 1;
      ux /= l; uy /= l;
      for (k = 0; k < 4; k++) {
        var t = el.turn + k * Math.PI / 2;
        c = Math.cos(t); s = Math.sin(t);
        var dx = ux * c - uy * s, dy = ux * s + uy * c;
        ctx.moveTo(p.x + dx * o, p.y + dy * o);
        ctx.lineTo(p.x + dx * (o + spike), p.y + dy * (o + spike));
        tips.push(p.x + dx * (o + spike), p.y + dy * (o + spike));
      }
    }
    ctx.stroke();

    /* A knob at each tip. */
    {
      ctx.fillStyle = st.lit;
      ctx.beginPath();
      var kr = Math.max(0.5, o * 0.20);
      for (k = 0; k < tips.length; k += 2) {
        ctx.moveTo(tips[k] + kr, tips[k + 1]);
        ctx.arc(tips[k], tips[k + 1], kr, 0, TAU);
      }
      ctx.fill();
    }

    /* The orbs: dark metal, lit toward the upper left, hard rim. */
    for (i = 0; i < el.mines.length; i++) {
      m = el.mines[i];
      p = view.at(m.r, m.a);
      var g = ctx.createRadialGradient(p.x - o * 0.35, p.y - o * 0.35, o * 0.1, p.x, p.y, o);
      g.addColorStop(0, st.lit);
      g.addColorStop(0.45, st.hull);
      g.addColorStop(1, st.shade);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, o, 0, TAU); ctx.fill();
      ctx.strokeStyle = st.trim;
      ctx.lineWidth = Math.max(0.5, o * 0.16);
      ctx.stroke();
    }

    /* A small red light on some, armed or not as the author likes. */
    ctx.fillStyle = "rgba(255,64,52,0.95)";
    ctx.beginPath();
    var lr = Math.max(0.6, o * 0.30);
    for (i = 0; i < el.mines.length; i++) {
      m = el.mines[i];
      if (!m.lit) continue;
      p = view.at(m.r, m.a);
      ctx.moveTo(p.x + lr, p.y);
      ctx.arc(p.x, p.y, lr, 0, TAU);
    }
    ctx.fill();
    ctx.restore();
  }

  CC.Primitives.register({ "minefield": minefield });
  CC.Primitives.registerStyle("minefield", function (colour, el, alpha) {
    return CC.DrawDetails.hullFill(colour, el, alpha);
  });
})();
