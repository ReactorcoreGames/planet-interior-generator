/* Stellar primitives — THE WIND.
 *
 * `open-field`: the steady outflow escaping through a coronal hole, drawn as a
 * fan of long straight rays.
 *
 * WHY IT IS ITS OWN FILE rather than living with the flare next door: both are
 * plasma leaving the star, but a flare is an EVENT and this is a STEADY STATE,
 * and that difference decides the whole drawing. A flare has a footpoint and a
 * direction it broke out along, so it is built from a centreline that leans; a
 * hole has a SECTOR and no particular moment, so this is built from a bearing
 * and a half-width and has to know how wide the hole it sits in is (`el.half`,
 * set in gen/traitroll.js when the sectors are rolled).
 *
 * The rule both files share: material that is leaving fades to nothing rather
 * than stopping, because a shape ending at a visible alpha ends on a line.
 *
 * THE SAME RULES APPLY AS EVERYWHERE IN draw/. No role names, no archetype
 * names, one signature, pixels only through `view`.
 *
 * draw/primitives.js must load first. */

var CC = CC || {};

(function () {  "use strict";

  /* ---- open-field -------------------------------------------------------- */

  /* THE SOLAR WIND LEAVING THROUGH A CORONAL HOLE — a fan of long, straight,
   * slightly diverging rays that fade out as they go.
   *
   * WHY THE HOLE NEEDED A DRAWN MARK AT ALL. The trait was built as a pure
   * ABSENCE: the sector keeps a fraction of the corona's own plumes and the
   * hole is the gap they leave. That is what a coronal hole physically is, it
   * works with the `screen` blend instead of against it, and it is still how
   * the sector is thinned — none of that was wrong. But the user could not see
   * it: "unnoticeable, mostly due to how well it blends in".
   *
   * AN ABSENCE IS ONLY LEGIBLE AGAINST A BASELINE THE EYE CAN MEASURE, and a
   * corona does not provide one. The plume field is irregular by construction
   * — that is most of what makes it read as a corona rather than as a comb —
   * so a stretch with fewer plumes in it looks like a stretch that happened to
   * get fewer plumes. The eye has no way to tell a hole from ordinary
   * variation, and deepening the thinning only makes the star look like it
   * failed to draw part of its halo, which the file's own note already warned
   * was the worse artefact.
   *
   * So the hole keeps its absence and gains a PRESENCE: the wind. This is the
   * same lesson the flare storm taught two sessions ago (D76) — when a mark
   * cannot be found, the answer is usually a different VOCABULARY rather than
   * more or louder of the same one. And the vocabulary here is one nothing
   * else on this limb has:
   *
   *   - a prominence is a LOOP: it returns to the star.
   *   - a flare is a SPRAY: it opens out and breaks up.
   *   - a plume is a TONGUE: it tapers and stops.
   *   - open field is STRAIGHT, PARALLEL AND LEAVES. It does not return, it
   *     does not break up, and it does not stop inside the frame.
   *
   * Straightness is the whole silhouette. Every other mark out here curves,
   * and a rank of near-parallel rays reads as structure — a direction the
   * material is being channelled along — which is exactly what an open field
   * line is and exactly what the closed-field corona around it is not.
   *
   * `style` is the {body, core, dim} plasma set — the same material as
   * everything else off this limb, moving in a straight line (D123: what makes
   * a mark read as different here is its shape, not a hue of its own). */
  function openField(ctx, view, el, style) {
    var reach = el.length || el.size;
    if (!(reach > 0)) return;
    if (view.px(reach) < 2) return;

    var r0 = el.radius;
    var a0 = el.angle;
    var body = (style && style.body) || style;
    var core = (style && style.core) || style;
    var dim = (style && style.dim) || body;

    var sd = (el.seed === undefined ? 0.5 : el.seed);
    function jit(i) {
      return 0.5 * (Math.sin((sd * 12.9898 + i * 4.1) * 7.233)
                  + Math.sin((sd * 5.331 + i * 2.7) * 3.117));
    }

    /* HOW MANY RAYS. Enough that they read as a field rather than as a few
     * lines — the density thesis, and the reason this is cheap: a ray is a
     * gradient-stroked path of six points. */
    /* THINNED, BECAUSE THIS MARK IS NO LONGER ALONE.
     *
     * Thirteen to twenty-two rays was the right count when the wind was the
     * whole of what a coronal hole drew. It is now the UNDERLAYER: the field
     * lines are drawn at the same bearing on top of it, and the two together
     * came out as the "dense hair" the ray count alone had never produced.
     * Two marks each calibrated alone are not a calibrated pair.
     *
     * The wind's job in the pair is to be the soft wash of escaping material
     * that the field lines are legible against — so it wants enough rays to
     * read as a flow and few enough that the crisp lines stay on top of it. */
    var rays = 6 + Math.round(Math.abs(jit(1)) * 5);
    /* HOW FAR THE FAN OPENS, AND IT IS NEARLY NOTHING.
     *
     * Open field lines do diverge, but the divergence has to stay far below
     * the eye's threshold for "these are curving" or the mark stops being what
     * it is. Rendered large at 0.55 the rays swept outward into a splayed tuft
     * — the honest word for it was GRASS — and every part of the trait's
     * reason for existing went with it: straightness is the silhouette no loop,
     * spray or tongue can supply, and a fan of curves is just a spray drawn
     * politely.
     *
     * At 0.10 the outer rays lean by a few degrees over their whole length,
     * which reads as a field opening rather than as lines bending. The
     * divergence is applied linearly in `t` rather than as `t*t` for the same
     * reason: the square put all of the bend at the top, which is exactly
     * where a curve is most visible against empty space. */
    var flare = 0.40;

    /* HOW MUCH EACH RAY FOLLOWS ITS OWN LOCAL RADIUS RATHER THAN THE SECTOR'S
     * CENTRE LINE — and this, not the divergence above, is what made the first
     * two versions read as GRASS.
     *
     * Every ray was drawn straight out along the radius through its own
     * footpoint. That is what open field lines actually do, and over a sector
     * 40 degrees wide it means the ray at one edge points 40 degrees away from
     * the ray at the other. Physically exact, and on screen it is a splayed
     * tuft: the outer rays sweep sideways and the whole mark curves away from
     * itself. The trait's entire claim is that this is the one STRAIGHT,
     * PARALLEL thing off the limb, and radial-from-everywhere cannot be
     * parallel by construction.
     *
     * So the rays are drawn mostly along the SECTOR'S OWN direction — the
     * bearing at the middle of the hole — with only a fraction of the local
     * radial lean mixed back in. `1` here would be the old fully-radial
     * version and `0` a perfectly parallel bundle; 0.35 keeps enough splay
     * that the fan still opens away from a round body without reading as a
     * hedge. Believable beats accurate, which is the standing rule when the
     * two disagree. */
    var radial = 0.75;

    ctx.lineCap = "round";
    for (var k = 0; k < rays; k++) {
      /* Where this ray sits across the fan, -1 at one edge to +1 at the
       * other, with a little wander so the spacing is not mechanical. */
      var f = rays === 1 ? 0 : (k / (rays - 1)) * 2 - 1;
      f += jit(k + 3) * 0.10;

      /* Rays near the middle of the hole are longer and brighter: the field
       * is most open at the centre of the sector and the wind fastest there.
       * That gradient across the fan is what stops it reading as a comb. */
      var mid = 1 - Math.abs(f) * 0.72;
      /* HALVED AGAIN, on the user's direct call rather than to match the
       * tendrils this time — the two are now sized independently: the wind is
       * a short soft wash close to the limb, and the tendrils reach well past
       * it. Down from the previous 0.28-0.50 to 0.14-0.25. */
      var len = reach * (0.09 + 0.14 * mid) * (0.82 + 0.36 * Math.abs(jit(k + 11)));

      /* A GRADIENT ALONG THE RAY, so it fades out rather than stopping — the
       * same rule the flare's ribbons follow, and for the same reason: a
       * stroke that ends at a visible alpha ends on a line, and a line across
       * the top of the fan would be the flat top all over again.
       *
       * Built in pixel space from the ray's own endpoints, which is correct
       * here where a gradient across a curved ribbon would not be: a ray IS a
       * straight line, so its own axis and the gradient's are the same. */
      var pA = view.at(r0, a0 + f * el.half * 0.92);
      var pB = view.at(r0 + len,
                       a0 + f * el.half * 0.92 * radial + f * flare * el.half);
      var g = ctx.createLinearGradient(pA.x, pA.y, pB.x, pB.y);
      /* THE HOT END REACHES FURTHER ACROSS THE FAN AND FURTHER ALONG THE RAY.
       * The first version put `core` only on the middle third and dropped to
       * `dim` by a third of the way out, which left the whole mark reading as
       * a haze on a halo that is already hazy — the same "blends in" the trait
       * was rebuilt to fix, reproduced in the fix. The wind is the brightest
       * thing in a coronal hole precisely BECAUSE the corona around it is
       * thin, so the rays have to carry that contrast themselves. */
      g.addColorStop(0, mid > 0.25 ? core : body);
      g.addColorStop(0.18, mid > 0.55 ? core : body);
      g.addColorStop(0.62, body);
      g.addColorStop(1, dim);
      ctx.strokeStyle = g;
      ctx.lineWidth = view.lw(0.9 + 2.4 * mid);

      /* The ray itself. Drawn through a few points rather than as one segment
       * because `view.at` is polar: a straight line in body space is not a
       * straight line on screen once the body is anything but tiny, and a
       * two-point ray would cut the chord instead of following the radius. */
      ctx.beginPath();
      var N = 6;
      for (var i = 0; i <= N; i++) {
        var t = i / N;
        /* A very slight sideways drift, so the rays are not machine-parallel.
         * Kept far below the flare's `lean` — this is a field line being
         * followed, not material being thrown. */
        var wob = Math.sin(t * 3.1 + k * 2.3 + sd * 8.7) * 0.020;
        /* The foot stays where it is; the ray then travels along a bearing
         * that is mostly the sector's, so as it rises it converges toward the
         * centre line instead of splaying away from it. */
        var base = f * el.half * 0.92;
        var a = a0 + base * (1 - (1 - radial) * t)
                   + (f * flare * el.half + wob * el.half) * t;
        var p = view.at(r0 + len * t, a);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    /* A FINER SET INTERLEAVED BETWEEN THE FIRST, at half the width and a
     * shorter reach. The density thesis inside one mark, and the same trick
     * the prominence's strands play: a field is many threads at several
     * weights, and an even rank of identical rays reads as a comb. Drawn after
     * the main set so they sit over it rather than under. */
    for (var k2 = 0; k2 < Math.max(0, rays - 3); k2++) {
      var f2 = rays === 1 ? 0 : ((k2 + 0.5) / (rays - 1)) * 2 - 1;
      f2 += jit(k2 + 41) * 0.08;
      var mid2 = 1 - Math.abs(f2) * 0.72;
      var len2 = reach * (0.085 + 0.075 * mid2)
                       * (0.80 + 0.40 * Math.abs(jit(k2 + 53)));
      var qA = view.at(r0, a0 + f2 * el.half * 0.92);
      var qB = view.at(r0 + len2,
                       a0 + f2 * el.half * 0.92 * radial + f2 * flare * el.half);
      var g2 = ctx.createLinearGradient(qA.x, qA.y, qB.x, qB.y);
      g2.addColorStop(0, body);
      g2.addColorStop(1, dim);
      ctx.strokeStyle = g2;
      ctx.lineWidth = view.lw(0.4 + 0.9 * mid2);
      ctx.beginPath();
      for (var i2 = 0; i2 <= 5; i2++) {
        var t2 = i2 / 5;
        var base2 = f2 * el.half * 0.92;
        var a2 = a0 + base2 * (1 - (1 - radial) * t2)
                    + f2 * flare * el.half * t2;
        var q = view.at(r0 + len2 * t2, a2);
        if (i2 === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
    }

    /* THE BASE GLOW — a soft brightening where the field opens out of the
     * surface, spanning the whole mouth of the hole rather than sitting at one
     * point. Without it the rays begin in mid-air; with it they come OUT of
     * somewhere, which is the same thing the flare's footpoint does for the
     * same reason. Stretched along the limb because a hole is a sector, not a
     * spot: a round glow here would read as one more bright patch. */
    /* WIDE, LOW AND SOFT. The first version scaled a radial gradient by the
     * ratio of the mouth's width to its height, which stretches the FALLOFF
     * along with the shape: the result was a hard-edged bright bar lying on
     * the limb, brighter than anything it was supposed to be the base of.
     *
     * Scaling the context anisotropically is the trap — a radial gradient's
     * stops are in the scaled space too, so a 6:1 stretch makes the horizontal
     * falloff six times more abrupt in appearance than the vertical one. The
     * fix is to keep the gradient circular and let the ALPHA do the shaping:
     * the glow is drawn as a few overlapping soft discs along the mouth, each
     * with its own circular falloff, which stays soft at any width. */
    var mouth = view.px(reach) * 0.13;
    if (mouth > 1) {
      var spanA = el.half * 1.05;
      var discs = 5;
      for (var d = 0; d < discs; d++) {
        var df = discs === 1 ? 0 : (d / (discs - 1)) * 2 - 1;
        var dc = view.at(r0, a0 + df * spanA);
        /* Dimmer toward the edges of the mouth, so the base has the same
         * across-the-fan gradient the rays do and the two agree. */
        var dm = 1 - Math.abs(df) * 0.55;
        var dg = ctx.createRadialGradient(dc.x, dc.y, 0, dc.x, dc.y, mouth);
        dg.addColorStop(0, body);
        dg.addColorStop(1, dim);
        ctx.globalAlpha = 0.55 * dm;
        ctx.fillStyle = dg;
        ctx.beginPath();
        ctx.arc(dc.x, dc.y, mouth, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }  CC.Primitives.register({
    /* THE ONE MARK OFF THIS LIMB THAT IS STRAIGHT. See its note: a coronal
     * hole was an absence with nothing to look at, and straightness is the
     * silhouette no loop, spray or tongue can supply. */
    "open-field": openField
  });
})();
