/* Capacitors — drawing the cans on the board (gen/capacitors.js), seen from
 * directly above. Each, from the back forward:
 *
 *   footprint  a pale silkscreen ring on the board round its foot, with a
 *              tick for the + lead
 *   sleeve     the dark plastic wrap, the outer ring, outlined hard
 *   stripe     the polarity band down one side of the sleeve, lighter
 *   top        the aluminium can's lid, the inner disc, with a crimped
 *              rim and a lit crescent on its upper left
 *   vent       the scoring pressed into the lid: a cross, a Y or a K
 *
 * The conduits' machined metal (draw/details-gas.js hullFill), so the board's
 * hardware reads as one fit-out. Below a few pixels across, only the sleeve
 * and lid. Pixels enter only through `view`.
 *
 * draw/details.js must load first. */

var CC = CC || {};

CC.CapacitorDraw = (function () {
  "use strict";

  var TAU = Math.PI * 2;
  /* The vents' spokes, as bearings on the lid. */
  var VENTS = [[0, 0.25, 0.5, 0.75], [0, 1 / 3, 2 / 3], [0.25, 0.75, 0.125, 0.375]];

  function can(ctx, view, c, st, alpha) {
    var o = view.at(c.r, c.angle), R = view.px(c.s);
    if (R < 0.8) return;
    var x = o.x, y = o.y;
    /* The silkscreen ring and its + tick. */
    if (R >= 3) {
      ctx.globalAlpha = alpha * 0.55;
      ctx.strokeStyle = st.lit;
      ctx.lineWidth = Math.max(0.5, R * 0.07);
      ctx.beginPath(); ctx.arc(x, y, R * 1.22, 0, TAU); ctx.stroke();
      var tx = x + Math.cos(c.stripe + Math.PI) * R * 1.48, ty = y + Math.sin(c.stripe + Math.PI) * R * 1.48;
      var tk = R * 0.16;
      ctx.beginPath();
      ctx.moveTo(tx - tk, ty); ctx.lineTo(tx + tk, ty);
      ctx.moveTo(tx, ty - tk); ctx.lineTo(tx, ty + tk);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    /* The sleeve. */
    ctx.fillStyle = st.shade;
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    /* The polarity stripe: a lighter band of the sleeve on one side. */
    if (R >= 2) {
      ctx.fillStyle = st.hull;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(x, y, R * 0.97, c.stripe - 0.5, c.stripe + 0.5);
      ctx.arc(x, y, R * 0.74, c.stripe + 0.5, c.stripe - 0.5, true);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = st.trim;
    ctx.lineWidth = Math.max(0.5, R * 0.08);
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
    /* The lid, its crimped rim, and a lit crescent. */
    var r = R * 0.70;
    ctx.fillStyle = st.hull;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    if (R < 2.5) return;
    ctx.strokeStyle = st.trim;
    ctx.lineWidth = Math.max(0.5, R * 0.06);
    ctx.stroke();
    ctx.strokeStyle = st.lit;
    ctx.lineWidth = Math.max(0.5, R * 0.09);
    ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.arc(x, y, r * 0.84, Math.PI * 0.95, Math.PI * 1.55); ctx.stroke();
    ctx.globalAlpha = 1;
    /* The vent's scoring, turned with the can. */
    if (R < 4) return;
    var spokes = VENTS[c.vent], turn = c.seed * TAU;
    ctx.strokeStyle = st.trim;
    ctx.lineWidth = Math.max(0.5, R * 0.07);
    ctx.beginPath();
    for (var k = 0; k < spokes.length; k++) {
      var b = turn + spokes[k] * TAU, l = c.vent === 2 && k > 1 ? r * 0.55 : r * 0.72;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(b) * l, y + Math.sin(b) * l);
    }
    ctx.stroke();
  }

  function draw(ctx, view, caps, palette, elementOpacity) {
    if (!caps || !caps.length) return;
    var alpha = elementOpacity === undefined ? 1 : elementOpacity;
    ctx.save();
    ctx.lineCap = "round";
    for (var i = 0; i < caps.length; i++) {
      var c = caps[i];
      ctx.globalCompositeOperation = c.blend || "source-over";
      var a = alpha * (c.opacity === undefined ? 1 : c.opacity);
      can(ctx, view, c, CC.DrawDetails.hullFill(palette.get(c.role), c, a * 0.95), a);
    }
    ctx.restore();
  }

  return { draw: draw };
})();
