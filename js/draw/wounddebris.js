/* Wound debris — drawing the field js/gen/wounddebris.js builds.
 *
 * Called by draw/woundedge.js after the scorched rim and before the marks
 * on the faces, so a plate still bent out of a face sits over the grit that
 * drifted past it. `style(role)` is the edge pass's own plate style for a
 * layer ({ face, under, mid, edge }), so a piece of a layer is that layer's
 * metal:
 *
 *   speck   one square point
 *   shard   an irregular sliver of 3-4 corners, one tone
 *   chunk   a lump of 5-6 corners in the underside tone, one lit facet,
 *           a dark edge
 *
 * Mostly the metal's mid tone, a third catching the light and a few dark,
 * so the field shows against space without becoming a spray of sparkles;
 * the sparks are their own pass, `sparks` below. Pixels enter only through
 * `view`. */

var CC = CC || {};

CC.WoundDebrisDraw = (function () {
  "use strict";

  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function toneOf(st, t) {
    return t < 0.2 ? st.under : (t < 0.7 ? st.mid : st.face);
  }

  /* An irregular polygon of `n` corners round (x, y), radius s. */
  function corners(x, y, s, n, rot, seed) {
    var pts = [];
    for (var k = 0; k < n; k++) {
      var ang = rot + (k + ((seed * 7.3 + k * 0.61) % 1) * 0.6) * TAU / n;
      var rr = s * (0.45 + ((seed * 13.1 + k * 0.37) % 1) * 0.75);
      pts.push({ x: x + Math.cos(ang) * rr, y: y + Math.sin(ang) * rr });
    }
    return pts;
  }

  function poly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
  }

  function draw(ctx, view, pieces, style, alpha) {
    if (!pieces || !pieces.length) return;
    ctx.save();
    for (var i = 0; i < pieces.length; i++) {
      var P = pieces[i];
      var a = clamp(P.alpha * alpha, 0, 1);
      if (a <= 0.01 || !P.role) continue;
      var st = style(P.role);
      var p = view.at(P.r, P.a);
      var s = view.px(P.size);
      ctx.globalAlpha = a;
      if (P.tier === 0 || s < 1.2) {
        var d = Math.max(0.7, s);
        ctx.fillStyle = toneOf(st, P.tone);
        ctx.fillRect(p.x - d / 2, p.y - d / 2, d, d);
        continue;
      }
      if (P.tier === 1) {
        var sh = corners(p.x, p.y, s, 3 + (P.seed > 0.5 ? 1 : 0), P.rot, P.seed);
        /* Stretched along `rot`, so it reads as a sliver of plate. */
        for (var k = 0; k < sh.length; k++) {
          var dx = sh[k].x - p.x, dy = sh[k].y - p.y;
          var along = dx * Math.cos(P.rot) + dy * Math.sin(P.rot);
          var across = -dx * Math.sin(P.rot) + dy * Math.cos(P.rot);
          across *= 0.45;
          along *= 1.4;
          sh[k] = { x: p.x + along * Math.cos(P.rot) - across * Math.sin(P.rot),
                    y: p.y + along * Math.sin(P.rot) + across * Math.cos(P.rot) };
        }
        poly(ctx, sh);
        ctx.fillStyle = toneOf(st, P.tone);
        ctx.fill();
        if (s > 3) {
          ctx.strokeStyle = st.edge;
          ctx.lineWidth = Math.max(0.5, s * 0.12);
          ctx.stroke();
        }
        continue;
      }
      var ch = corners(p.x, p.y, s, 5 + (P.seed > 0.6 ? 1 : 0), P.rot, P.seed);
      poly(ctx, ch);
      ctx.fillStyle = st.under;
      ctx.fill();
      /* One facet catching the light. */
      ctx.fillStyle = P.tone > 0.5 ? st.face : st.mid;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(ch[0].x, ch[0].y);
      ctx.lineTo(ch[1].x, ch[1].y);
      ctx.lineTo(ch[2].x, ch[2].y);
      ctx.closePath();
      ctx.fill();
      poly(ctx, ch);
      ctx.strokeStyle = st.edge;
      ctx.lineWidth = Math.max(0.5, s * 0.10);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* SPARKS, FIRE AND EMBERS (gen/wounddebris.js `sparks`), in the warning
   * colour `warn` ([h, s, v], draw/shellwalls.js lightHsv), last of the
   * edge pass so they burn over the plates. The glows are screened, so
   * they only ever add light. */
  function sparks(ctx, view, list, warn, alpha) {
    if (!list || !list.length) return;
    var h = warn[0], C = CC.Color;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (var i = 0; i < list.length; i++) {
      var S = list[i];
      var b = clamp(S.b * alpha, 0, 1);
      var p = view.at(S.r, S.a);
      var s = view.px(S.size);
      if (S.kind === 1) {
        /* Fire: a hot pale heart, the warning colour round it, gone by the
         * edge. */
        var R = Math.max(1.5, s);
        var gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
        gr.addColorStop(0, C.hsva(h + 18, 0.35, 1, 0.85 * b));
        gr.addColorStop(0.3, C.hsva(h, 0.85, 1, 0.45 * b));
        gr.addColorStop(1, C.hsva(h - 6, 0.95, 0.8, 0));
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(p.x, p.y, R, 0, TAU);
        ctx.fill();
        continue;
      }
      var d = Math.max(0.8, s);
      if (S.kind === 2) {
        /* An ember: its trail back toward the body, fading, then its head. */
        var ox = Math.sin(S.a), oy = -Math.cos(S.a);
        var len = view.px(S.len);
        ctx.lineCap = "round";
        for (var k = 0; k < 3; k++) {
          ctx.strokeStyle = C.hsva(h, 0.85, 1, b * (0.15 + 0.2 * k));
          ctx.lineWidth = Math.max(0.5, d * (0.5 + 0.2 * k));
          ctx.beginPath();
          ctx.moveTo(p.x - ox * len * (1 - k / 3), p.y - oy * len * (1 - k / 3));
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      } else {
        /* A spark: a faint spill under a hot point. */
        ctx.fillStyle = C.hsva(h, 0.85, 1, 0.30 * b);
        ctx.beginPath();
        ctx.arc(p.x, p.y, d * 2.6, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = C.hsva(h + 20, 0.30, 1, b);
      ctx.fillRect(p.x - d / 2, p.y - d / 2, d, d);
    }
    ctx.restore();
  }

  return { draw: draw, sparks: sparks };
})();
