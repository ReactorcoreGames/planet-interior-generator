/* Stellar primitives — AN ERUPTION.
 *
 * `flare`: material thrown clear of the star in a single event, opening out
 * and coming apart as it goes.
 *
 * It sits apart from `stellar-wind.js` next to it, which draws the steady
 * outflow through a coronal hole, because an EVENT and a STEADY STATE are
 * different drawing problems even though both are plasma leaving. A flare has
 * a footpoint, a moment and a direction it broke out along; the wind has a
 * whole sector and no particular time. What they share is the one rule stated
 * in both files: material that is leaving fades to nothing, never stops.
 *
 * THE SAME RULES APPLY AS EVERYWHERE IN draw/. No role names, no archetype
 * names, one signature, pixels only through `view`.
 *
 * draw/primitives.js must load first. */

var CC = CC || {};

(function () {
  "use strict";
  "use strict";

  /* ---- flare ------------------------------------------------------------- */

  /* AN ERUPTION OFF THE LIMB — a narrow bright jet at the footpoint opening
   * into a ragged fan of material thrown clear of the star.
   *
   * IT EXISTS BECAUSE THE `vein` VERSION WAS INVISIBLE, and that failure is
   * worth stating because it is D76 in its purest form. A flare storm drawn as
   * near-radial strokes changed 1,100-3,700 pixels on every archetype and the
   * user could not find it: the corona ALREADY draws a field of near-radial
   * strokes — its streamers, by the hundred — so the flare was the
   * two-hundredth example of a mark the layer makes constantly. It was not too
   * faint and it was not too small. It was the wrong VOCABULARY, and no amount
   * of tuning a `vein` would have fixed it, which is why this is a primitive
   * rather than a third round of numbers.
   *
   * WHAT MAKES IT A DIFFERENT KIND OF MARK. Everything else off this limb runs
   * at a CONSTANT OR SHRINKING width: a streamer is a long even stroke, a
   * plume is a tongue that tapers to nothing, a prominence is a loop of even
   * thickness. All three are structures that hold together. A flare is the
   * only mark out here that gets WIDER as it goes and then comes apart —
   * because the material is not bound to anything and nothing is bringing it
   * back. Opening out is the signature, and it is a silhouette no other mark
   * in the family has.
   *
   * ---- THE FIRST VERSION WAS A LOLLIPOP, AND WHY -------------------------
   *
   * It drew a hard bright disc at the footpoint and a scatter of discrete
   * ellipses beyond it, and rendered large (test/_tmp/flarezoom.mjs) it read
   * as a dot on the limb with a bunch of grapes on a stick. Three faults, and
   * the useful one is the third:
   *
   *   - the fragments bunched at the FAR end, leaving a bare stalk between
   *     them and the star, so nothing connected the eruption to its source;
   *   - the kernel was an opaque disc, which is a drawn dot rather than a
   *     bright place;
   *   - and the fragments were SEPARATE, which was meant to say "it is coming
   *     apart" and instead said "these are objects". Discreteness at this
   *     scale reads as debris, not as plasma.
   *
   * So the break-up is now carried by overlapping RIBBONS at different widths
   * and offsets rather than by separate blobs: continuous near the foot where
   * the jet is dense, increasingly ragged and transparent toward the tip where
   * it is dispersing. That is D116's lesson again — when a mark reads wrong,
   * the wrong part is not always the part you would change first, and
   * rendering it large is what tells you which part it is.
   *
   * `style` is a {body, core} pair — the same plasma set a prominence and a
   * plume take, because a flare is the same material at a different speed and
   * D123 is the standing rule: what makes a mark read as hotter here is that
   * it is brighter and less saturated, never that its hue was moved. */
  function flare(ctx, view, el, style) {
    var reach = el.length || el.size;
    if (!(reach > 0)) return;
    if (view.px(reach) < 2) return;

    var r0 = el.radius;
    var a0 = el.angle;
    var body = (style && style.body) || style;
    var core = (style && style.core) || style;

    /* A deterministic wobble per instance, the two-summed-sines construction
     * `blob` uses. D117 is the reason it is not a hash: a broken pseudo-random
     * still draws, it just draws something suspiciously tidy. */
    var sd = (el.seed === undefined ? 0.5 : el.seed);
    function jit(i) {
      return 0.5 * (Math.sin((sd * 12.9898 + i * 4.1) * 7.233)
                  + Math.sin((sd * 5.331 + i * 2.7) * 3.117));
    }
    var side = jit(0) >= 0 ? 1 : -1;

    /* HOW FAR THE WHOLE ERUPTION LEANS. A flare follows the field line it
     * broke out of rather than going straight up. Divided by the radius when
     * it becomes an angle, for the same reason the plume's curl is: `across`
     * is an arc length, and skipping that division makes a mark near the
     * body's centre lean further than one at the limb. */
    var lean = (el.lean === undefined ? 0.4 : el.lean) * reach * 0.85 * side;

    var STEPS = 18;

    /* The centreline. `t` runs 0 at the footpoint to 1 at the leading edge.
     * The rise is very slightly eased so the jet is fastest where it leaves,
     * which is the opposite of a plume's decelerating climb — a plume is gas
     * rising and falling back, this is material escaping. */
    function centre(t) {
      var r = r0 + reach * Math.pow(t, 0.88);
      var across = lean * t * t + jit(1) * 0.10 * reach * t;
      return { r: r, a: a0 + across / Math.max(0.05, r) };
    }

    /* THE HALF-WIDTH, AND IT OPENS OUT — this is the whole mark.
     *
     * Pinched almost to nothing at the footpoint, because an eruption comes
     * out of one place, then widening steadily. The `t^1.25` makes it open
     * slowly at first and faster as it goes, which is what a jet losing its
     * confinement does; a linear cone reads as a drawn wedge.
     *
     * WIDER THAN IT WAS, on the user's call. At 0.30 the fan was narrow enough
     * that its two flanks read as the two sides of a triangle — a drawn shape
     * with an inside — rather than as an eruption spreading out. Past about
     * half the reach the flanks are far enough apart that the eye stops
     * pairing them and reads the interior as volume instead. */
    function halfWidth(t) {
      return reach * (0.014 + 0.52 * Math.pow(t, 1.22));
    }

    /* THE EDGE WOBBLE — how far this ribbon's own boundary wanders in and out
     * along its length, as a fraction of the local half-width.
     *
     * A FLARE STORM HAS NO CLEAN EDGE AND THE FIRST VERSION GAVE IT TWO. Every
     * ribbon was bounded by a smooth analytic curve, so however many were
     * stacked the silhouette stayed a tidy wedge with straight sides. The
     * wander is what breaks that: each strand's boundary now breathes at its
     * own frequency, so where strands overlap the combined edge is a ragged
     * one. Deterministic from the instance seed and the strand index (D117),
     * and in the loop parameter rather than in screen space, so it does not
     * swim when the view pans. */
    function wob(t, k) {
      return 1 + 0.34 * Math.sin(t * 9.1 + k * 2.3 + sd * 7.7)
               + 0.20 * Math.sin(t * 19.7 + k * 5.1 + sd * 3.3);
    }

    /* ONE RIBBON along the centreline at a width multiplier, offset sideways
     * across the fan, and stopping short at `tEnd` so the strands do not all
     * terminate on the same line — a fan whose filaments end together reads as
     * a cut shape rather than as something dispersing.
     *
     * `fade` is the reason this draws in slices instead of as one filled path.
     * A single `fill()` has ONE alpha, so however carefully the outline
     * tapered, the material stayed exactly as opaque at the tip as at the
     * foot — which is what gave the storm its flat top: the shape ended, at
     * full strength, on a line. Plasma thrown clear of a star does not end. It
     * thins until there is nothing there.
     *
     * So the ribbon is cut into quads along its length and each is filled at
     * its own alpha, running from full at the foot to zero at `tEnd`. That is
     * a per-slice `globalAlpha` rather than a gradient because the ribbon
     * curves and leans: a linear gradient in screen space would fade across
     * the WRONG axis on any flare that is not pointing straight up. The slices
     * share their end points, so the seams meet exactly and only the alpha
     * steps between them. */
    function ribbon(k, offset, tEnd, fill, fade) {
      var i, j, t, w, c, p, q, n = Math.max(4, Math.round(STEPS * tEnd));
      var SUB = 3;
      ctx.fillStyle = fill;
      for (i = 0; i < n; i++) {
        var t0 = (i / n) * tEnd, t1 = ((i + 1) / n) * tEnd;
        /* Alpha for this slice: 1 at the foot, easing to 0 at the far end.
         * The power holds the material together over the first half and lets
         * it go quickly after, which is what dispersal looks like. */
        var u = (i + 0.5) / n;
        /* THE CURVE HOLDS, THEN DROPS TO EXACTLY ZERO AT THE END.
         *
         * Two failures were paid for here and the second is the subtle one.
         *
         * At `^1.7` the alpha was a third by the halfway point and the whole
         * eruption came out as a faint gauze: the flat top was gone, but so
         * was the flare.
         *
         * `^0.75` gave it its body back AND KEPT THE FLAT TOP, which looked
         * like the fade had failed and had not. A decaying power never reaches
         * zero — the last slice was still at about a tenth, comfortably above
         * any sane cutoff, so the ribbon ended at a visible alpha on a
         * straight line across its width. That is the same flat top as before,
         * drawn fainter. Fading `towards` nothing is not the same as ending at
         * nothing, and only the second one has no edge.
         *
         * So the shape is now a hold-then-fall that is pinned to zero at u=1:
         * `smooth` runs 1 -> 0 over the whole length with a soft shoulder, and
         * multiplying by `(1-u)` guarantees the final slice is transparent no
         * matter what the shoulder does. The eruption keeps its density over
         * the first half and genuinely dissolves at the tip. */
        var smooth = 1 - u * u * (3 - 2 * u);   /* smoothstep, inverted */
        var a = fade ? smooth * (1 - u) * 1.9 : 1;
        if (a > 1) a = 1;
        if (a < 0.008) continue;
        ctx.globalAlpha = a;
        ctx.beginPath();
        /* Down one side... */
        for (j = 0; j <= SUB; j++) {
          t = t0 + (t1 - t0) * (j / SUB);
          c = centre(t);
          w = halfWidth(t) * k * wob(t, k * 3.1 + 1);
          q = offset * halfWidth(t);
          p = view.at(c.r, c.a + (q + w) / Math.max(0.05, c.r));
          if (j === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        /* ...and back up the other. */
        for (j = SUB; j >= 0; j--) {
          t = t0 + (t1 - t0) * (j / SUB);
          c = centre(t);
          w = halfWidth(t) * k * wob(t, k * 3.1 + 2);
          q = offset * halfWidth(t);
          p = view.at(c.r, c.a + (q - w) / Math.max(0.05, c.r));
          ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /* THE DIFFUSE FAN — the whole cone, wide and dim, so the eruption has a
     * volume rather than being a set of lines. Faded, so it has no top edge. */
    ribbon(1.0, 0, 1.0, body, true);

    /* THE STRANDS. Nine of them now rather than five, at different widths,
     * sideways offsets and lengths — the count went up with the width, because
     * a wider fan spreads the same five strands thinner and the gaps between
     * them start to read as structure. Ragged where they overlap, which is the
     * break-up: continuous near the foot where they all still coincide,
     * separating toward the tip.
     *
     * Drawn in `body` rather than `core` so the fan does not turn into a solid
     * bright wedge, and each one fades out along its own length so the tips
     * dissolve at nine different heights instead of stopping. */
    for (var k = 0; k < 9; k++) {
      var off = jit(k + 2) * 0.92;
      var endT = 0.50 + 0.50 * Math.abs(jit(k + 9));
      ribbon(0.16 + 0.10 * Math.abs(jit(k + 20)), off, endT, body, true);
    }

    /* A SECOND, SHORTER SET PACKED NEAR THE FOOT, where the eruption is
     * densest. Without them the base is as thin as the tip and the whole mark
     * reads as evenly gauzy; a storm is opaque where it comes out and gauzy
     * where it disperses, and stacking short strands over long ones is how
     * that gradient gets built rather than declared. */
    for (var m = 0; m < 5; m++) {
      ribbon(0.22, jit(m + 30) * 0.55, 0.22 + 0.26 * Math.abs(jit(m + 37)),
             body, true);
    }

    /* THE HOT CHANNEL, short and narrow: the part of the jet still confined,
     * near the footpoint. Stopping it well before the tip is what says the
     * flare loses coherence as it goes. Faded like everything else, so the
     * bright part ends by running out rather than by stopping. */
    ribbon(0.30, 0, 0.44, core, true);

    /* THE FOOTPOINT. A soft bright patch rather than a hard disc — it is a
     * place on the limb that is burning, not an object sitting on it, and an
     * opaque circle there was the single loudest wrong note in the first two
     * versions: it turned the whole mark into a lollipop.
     *
     * A RADIAL GRADIENT WITH THE BRIGHT STOP HELD SMALL. Running `core` from
     * the very centre still gave a visible bead, because a gradient starting
     * at full brightness has its steepest change in the middle, which is
     * exactly where the eye reads an edge. Holding the hot stop to the inner
     * fifth and fading across the rest puts the falloff where there is room
     * for it, and the patch reads as glow rather than as a drawn dot.
     *
     * `style.dim` is the same colour at zero alpha, published by plasmaFill so
     * no drawing code has to take an `rgba(...)` string apart to find its
     * alpha. */
    var f = view.at(r0, a0);
    var fr = Math.max(1.5, view.px(reach) * 0.13);
    var g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, fr);
    g.addColorStop(0, core);
    g.addColorStop(0.20, body);
    g.addColorStop(1, (style && style.dim) || body);
    ctx.beginPath();
    ctx.arc(f.x, f.y, fr, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  CC.Primitives.register({
    /* An EVENT rather than a structure, and the only mark off this limb that
     * breaks into pieces. See its note for why tuning a `vein` further would
     * never have worked (D76). */
    "flare": flare
  });
})();
