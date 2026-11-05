/* Stellar primitives — THE STAR'S OWN MARKS.
 *
 * `prominence`, `starspot` and `convection-cell`: a loop of plasma anchored at
 * both ends, a magnetically-structured dark patch, and a closed cell with a
 * rising and a sinking flank.
 *
 * THE SAME RULES APPLY HERE AS EVERYWHERE IN draw/. No role names, no
 * archetype names, one signature, pixels only through `view`.
 *
 *
 * ---- WHY THESE EXIST AND ARE NOT REUSED ---------------------------------
 *
 * D80: A SOFT BLOB CANNOT SAY WHAT A THING IS, and D76 before it: a mark must
 * be a different KIND of thing from what its layer already draws. The gaseous
 * phase learned both the expensive way, with seven traits that placed
 * correctly and could not be seen. Each function below carries the argument
 * for its own shape; in one line each, a prominence is the only mark that
 * leaves the surface and RETURNS, a starspot is the only one built from a dark
 * umbra inside a streaked penumbra, and a convection cell is a CLOSED circuit
 * where `cell` is an open spiral (D116).
 *
 *
 * ---- WHY THIS FILE IS SPLIT ---------------------------------------------
 *
 * This file holds what a star does BY ITSELF. `stellar-foreign.js` holds
 * things put AROUND one — a swallowed planet, the megastructures — which are
 * solid objects silhouetted against a star and fail differently (D82, D126: a
 * symbol is not a scale model). `stellar-limb.js` holds what stands OFF the
 * limb, drawn over black or a fading halo in an additive blend. Three real
 * seams rather than three byte counts.
 *
 * draw/primitives.js must load first.
 *
 * AFTER THE SPLIT (Session AL) the starspot and the convection cell are in
 * draw/primitives/stellar-spots.js, which loads straight after this file. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;

  /* ---- prominence -------------------------------------------------------- */

  /* A LOOP OF PLASMA OFF THE LIMB, anchored at both ends.
   *
   * The geometry is a bridge: two footpoints on the anchor radius, separated
   * by an angle, with the arc rising to `size` above them and coming back
   * down. That is a genuinely different shape from everything else in the
   * generator, all of which either scatters, radiates outward, or travels
   * around — none of them return.
   *
   * DRAWN AS A TAPERED RIBBON RATHER THAN A STROKE. A stroked arc of constant
   * width is a drawn line; a prominence is a rope of plasma that is thick at
   * its feet, thins over the top, and is brighter along its leading edge
   * because that is where the material is densest. The two-pass construction —
   * a wide dim body, then a narrow bright core along the same curve — is what
   * makes it read as luminous gas rather than as an outline.
   *
   * `el.span` is the angular separation of the footpoints in radians; wider
   * spans give the long, low, quiescent arcs and narrow ones give the tall
   * narrow jets. `el.lean` shears the loop so it is not always symmetric,
   * because a symmetric arch reads as an architectural drawing.
   *
   * THREE SIZE TIERS DO REAL WORK HERE, which is the point of the whole trait:
   * the spec calls prominences "the density showcase", and a limb carrying
   * three enormous arcs, eight medium ones and twenty small ones is a
   * completely different picture from one carrying eleven identical ones. */
  function prominence(ctx, view, el, style) {
    var rise = el.length || el.size;
    var span = el.span === undefined ? 0.22 : el.span;
    var lean = el.lean || 0;
    var r0 = el.radius;

    /* The two footpoints. */
    var aL = el.angle - span * 0.5;
    var aR = el.angle + span * 0.5;

    var STEPS = 22;

    /* One point on the loop. `t` runs 0..1 from the left foot to the right.
     *
     * The height profile is a sine arch, which puts the apex at the middle and
     * brings both ends to zero exactly — a parabola would too, but a sine's
     * shoulders are steeper, and a prominence rises quickly off the surface
     * before flattening over the top. `lean` biases where the apex sits, which
     * is what stops every arch being a perfect croquet hoop. */
    /* The loop's CENTRELINE at `t`, with no thickness — `{r, a}` in body
     * space. Split out from the widening because the offset direction has to
     * be computed from two neighbouring centreline points, and that needs the
     * curve on its own first. */
    function spineAt(t) {
      var arch = Math.sin(t * Math.PI);
      /* The lean shifts the apex along the loop rather than tilting the whole
       * shape, so both feet stay planted. */
      var skew = 1 + lean * (t - 0.5) * 1.4;
      return { r: r0 + rise * arch * clamp(skew, 0.25, 1.9),
               a: aL + (aR - aL) * t };
    }

    /* A point on the ribbon: the centreline at `t`, pushed `widen` sideways
     * PERPENDICULAR TO THE LOOP'S OWN DIRECTION.
     *
     * IT USED TO ADD `widen` TO THE RADIUS, and that was a real geometry bug
     * rather than an approximation. The old comment reasoned that near the
     * apex the loop runs tangentially so its thickness is radial, which is
     * true — and then stated that the apex is the case that matters, which is
     * where it went wrong. At the FEET the loop runs radially, so a radial
     * offset does not widen the ribbon at all: it slides the edge up and down
     * the loop's own length. And `halfWidth` is at its LARGEST at the feet, so
     * the artefact was maximised exactly where it was worst.
     *
     * Rendered large (test/_tmp/promzoom.mjs) the result was unmistakable: a
     * dark wedge where each foot met the limb, and feet that appeared to hover
     * above the surface or sink through it rather than being planted on it.
     * At whole-body scale, where every prominence is a few pixels of arch, it
     * had been invisible for two sessions — which is D88 and D116 together: a
     * mark that reads acceptably small can be plainly broken, and rendering it
     * big is the only way to find out.
     *
     * The perpendicular is taken from the centreline itself, so it is correct
     * at every point of the loop rather than at one end of it. */
    function pointAt(t, widen) {
      var c = spineAt(t);
      if (!widen) return view.at(c.r, c.a);
      /* A short step along the loop, clamped inside 0..1 at the ends. */
      var h = 0.004;
      var t0 = Math.max(0, t - h), t1 = Math.min(1, t + h);
      var p0 = spineAt(t0), p1 = spineAt(t1);
      /* The tangent in body space. `da` is an angle, so it becomes an arc
       * length by multiplying by the radius — the same conversion the plume's
       * curl needs, and skipping it would make the perpendicular wrong
       * wherever the loop is not at r = 1. */
      var dr = p1.r - p0.r;
      var da = (p1.a - p0.a) * c.r;
      var len = Math.sqrt(dr * dr + da * da) || 1;
      /* Rotate the tangent a quarter turn: (dr, da) -> (-da, dr). */
      var nr = -da / len, na = dr / len;
      return view.at(c.r + nr * widen, c.a + (na * widen) / Math.max(0.05, c.r));
    }

    /* THE RIBBON'S HALF-WIDTH ALONG THE LOOP. Thick at the feet where the
     * material is dense and pinched over the top where it has spread out —
     * the opposite of a stroke, which is uniform, and the reason this reads as
     * a volume of gas.
     *
     * The foot term is gentler than it was. With the perpendicular fixed the
     * feet genuinely widen instead of smearing along the loop, so the old
     * figure — nearly four times the apex width — came out as a pair of
     * trumpet bells. */
    function halfWidth(t) {
      var foot = Math.pow(Math.abs(t - 0.5) * 2, 1.6);   /* 1 at feet, 0 at apex */
      var w = rise * (0.055 + 0.085 * foot);
      /* AND IT CLOSES AT THE VERY ENDS, which is what stops the loop finishing
       * on two blunt rectangles.
       *
       * The ribbon used to terminate on a straight cut across its full width
       * at t=0 and t=1 — and `foot` makes the width LARGEST exactly there, so
       * each end was a wide flat-topped slab sitting on the limb. Rendered
       * large it read as a strap bolted to the star rather than as plasma
       * entering it. (The footpoint glow was added over the top of that, which
       * hid it at small sizes and not at all up close: D88 again.)
       *
       * The last few percent at each end now taper to a point, so the ribbon
       * closes itself. `fadeEnds` on the trait dissolves the ends further
       * still, but that is an alpha ramp and an alpha ramp cannot remove a
       * silhouette — the shape has to not be there. */
      var e = Math.min(t, 1 - t) / 0.055;
      return w * (e < 1 ? e * e * (3 - 2 * e) : 1);
    }

    var i, t;

    var seedOf = (el.seed === undefined ? 0.5 : el.seed);
    var bodyCol = (style && style.body) || style;
    var coreCol = (style && style.core) || style;


    /* ---- PASS ONE: THE HALO ------------------------------------------------
     *
     * A wider, dimmer copy of the whole loop drawn UNDER the body, so the
     * prominence has an atmosphere around it rather than a boundary.
     *
     * THIS IS THE MAIN ANSWER TO "TOO TRANSLUCENT, MISSING THE FUZZINESS". The
     * previous version was three marks: one flat ribbon, some strands, two
     * footpoint dots. Every one of them had a hard analytic edge, so at close
     * range the loop was a cleanly cut shape with lines on it — the silhouette
     * of burning gas without any of the behaviour of it. Fire has no edge; it
     * has a dense middle and a ragged surround that fades into the dark, and
     * the surround is most of what makes it read as hot.
     *
     * Cheap, because it is the same path machinery at a bigger width and a
     * lower alpha, run twice. Under `screen` two dim passes stack into a soft
     * shoulder around the bright middle, which is exactly the falloff wanted.
     * `dim` is the same colour at zero alpha, published by plasmaFill. */
    function ribbonPath(widen, fuzz, phase) {
      var outer = [], inner = [], j;
      for (j = 0; j <= STEPS; j++) {
        var tt = j / STEPS;
        /* The fuzz makes the halo's boundary wander, so the outer edge is not
         * a scaled copy of the inner one. Deterministic from the loop
         * parameter and the seed, in body space (D117, and the same rule
         * draw/grain.js follows). */
        var f = fuzz
          ? 1 + fuzz * (Math.sin(tt * 7.3 + phase + seedOf * 9.1) * 0.6
                      + Math.sin(tt * 15.1 + phase * 1.7 + seedOf * 4.3) * 0.4)
          : 1;
        var ww = halfWidth(tt) * widen * f;
        outer.push(pointAt(tt, ww));
        inner.push(pointAt(tt, -ww));
      }
      ctx.beginPath();
      ctx.moveTo(outer[0].x, outer[0].y);
      for (j = 1; j <= STEPS; j++) ctx.lineTo(outer[j].x, outer[j].y);
      for (j = STEPS; j >= 0; j--) ctx.lineTo(inner[j].x, inner[j].y);
      ctx.closePath();
    }

    /* Two haloes at different widths and different wander, so the outer edge
     * of the pair is doubly irregular. Alpha is held low because they stack:
     * under `screen`, 0.30 over 0.30 over the body is a gentle shoulder, and
     * anything higher turned the loop into a fat glowing sausage. */
    ctx.globalAlpha = 0.30;
    ribbonPath(2.5, 0.42, 0.0);
    ctx.fillStyle = bodyCol;
    ctx.fill();
    ribbonPath(1.7, 0.34, 2.4);
    ctx.fill();
    ctx.globalAlpha = 1;

    /* ---- PASS TWO: THE BODY ------------------------------------------------
     *
     * The loop itself, at full width, ONCE.
     *
     * It was briefly drawn twice, to take the density up. Rendered large that
     * was plainly wrong: `screen` is not subtle, and a second full-width pass
     * under a raised trait alpha and eleven bright strands took the middle of
     * every loop to flat white — the mark stopped having any internal
     * structure at all, which is the exact fault the strands exist to fix. The
     * density now comes from the halo passes below the body and the strand
     * count above it, both of which add material at the EDGES where the eye
     * reads texture, rather than from more light in the centre where it reads
     * only as blown-out. */
    ribbonPath(1.0, 0.16, 5.1);
    ctx.fillStyle = bodyCol;
    ctx.fill();

    /* Pass two: THE STRANDS — several threads running the length of the loop
     * at different offsets across its width, each wandering slightly.
     *
     * WITHOUT THEM THE LOOP IS A FLAT SHAPE, and the user's verdict on the
     * first version was exactly that: "at close up zoomed in, prominences look
     * particularly tame and lame". At whole-body scale a filled ribbon with a
     * bright centreline is enough — the mark is a few pixels wide and all the
     * eye reads is the arch. Zoomed in it is a smooth blob with a line drawn
     * on it: a bracket rather than a rope of burning gas.
     *
     * A REAL PROMINENCE IS A BUNDLE OF FIELD LINES, which is why strands are
     * the right internal structure rather than noise or a gradient: the
     * material is threaded along the field, so it separates into filaments
     * that run parallel to the loop and to each other. That is a structure
     * with a DIRECTION, and it is the thing the flat version had none of.
     *
     * THE WANDER IS DETERMINISTIC AND IN BODY SPACE, from the loop parameter
     * and the strand index — the rule draw/grain.js follows and `storm`
     * records the hard way: texture derived from screen position swims when
     * the view pans or zooms.
     *
     * They are drawn in `core` at a thin width, so more strands make the loop
     * read as brighter and denser rather than as a wider shape. */
    var seed = seedOf;
    /* More strands on the big loops, which are the ones that get looked at
     * closely; a tier-3 arch is a few pixels and one line is all it can hold.
     *
     * ROUGHLY DOUBLED, on the user's "needs more oomph in general". The old
     * counts were set when the strands were the loop's only internal detail
     * and five lines across a ribbon was already reading as hatching. With the
     * haloes underneath them they are no longer carrying the mark on their
     * own, so the count can go to what a bundle of field lines actually looks
     * like — a dozen threads of different brightness, not five. This is the
     * density thesis applied inside one mark rather than across instances. */
    var strands = el.tier === 0 ? 11 : el.tier === 1 ? 8 : el.tier === 2 ? 5 : 3;
    ctx.lineCap = "round";
    for (var k = 0; k < strands; k++) {
      /* Spread across the ribbon's width, biased outward: the leading edge of
       * a rising loop is where the material piles up. */
      var frac = strands === 1 ? 0.28
               : -0.55 + 1.25 * (k / (strands - 1));
      ctx.beginPath();
      for (i = 0; i <= STEPS; i++) {
        t = i / STEPS;
        /* Two summed sines at incommensurate frequencies — the construction
         * `blob` uses, and NOT a hash (D117: a broken pseudo-random still
         * draws, it just draws something suspiciously tidy). */
        /* DEEPER AND PER-STRAND, so the threads CROSS rather than running as
         * a parallel set. At the old amplitudes eleven strands read as ribbon
         * cable — evenly spaced lines that never meet, which is a drawn
         * hatching pattern and not a bundle. A real field-line bundle braids:
         * threads converge, overlap and separate along the loop. The
         * frequencies are scaled per strand (the `k * 0.37` term) so no two
         * wander in step, which is what makes them intersect. */
        var kf = 1 + k * 0.37;
        var wob = Math.sin(t * 5.7 * kf + k * 2.1 + seed * 11.3) * 0.52
                + Math.sin(t * 11.3 * kf + k * 3.7 + seed * 5.1) * 0.30;
        var p = pointAt(t, halfWidth(t) * (frac + wob));
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      /* THE STRANDS ARE NOT ALL `core`, AND THAT IS WHAT STOPS THE BLOWOUT.
       *
       * Every strand used to be drawn in the near-white core colour. Five of
       * those was a bright bundle; eleven was a solid white rope, because
       * `screen` accumulates and eleven passes of near-white over a full-width
       * body fill reaches saturation whatever the line widths are. A real
       * bundle has a few HOT threads and a majority of merely-lit ones — so
       * only the strands near the dense middle get `core` and the rest get
       * `body`, and the count can go up without the brightness going with it.
       *
       * `mid` is 1 at the densest thread and falls off toward the edges of the
       * ribbon; it now picks the colour as well as scaling the width. */
      var mid = 1 - Math.abs(frac - 0.28) * 0.9;
      ctx.strokeStyle = mid > 0.72 ? coreCol : bodyCol;
      ctx.globalAlpha = 0.42 + 0.58 * Math.max(0, mid);
      ctx.lineWidth = view.lw((el.tier === 0 ? 1.6 : el.tier === 1 ? 1.2 : 0.9)
                              * (0.40 + 0.60 * Math.max(0, mid)));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* THE FOOTPOINTS, as bright roots. A loop that simply stops at the surface
     * reads as a shape laid over the limb; a brightening where it enters says
     * it is rooted in the star.
     *
     * THEY WERE FLAT DISCS AND A DISC IS A DRAWN DOT. Up close the two hard
     * circles were the last obviously synthetic mark left on the loop — the
     * same fault the flare's footpoint had and was fixed for (see `flare` in
     * stellar-limb.js): a gradient starting at full brightness has its
     * steepest change in the middle, which is where the eye reads an edge, so
     * the hot stop is held to the inner fifth and the rest is falloff. Larger
     * than the old disc as well, because a root is a PLACE that is burning
     * rather than a point where a line stops. */
    var fw = view.px(rise * 0.075) * 2.2;
    if (fw > 0.5) {
      var feet = [view.at(r0, aL), view.at(r0, aR)];
      for (var fi = 0; fi < 2; fi++) {
        var fp = feet[fi];
        var fg = ctx.createRadialGradient(fp.x, fp.y, 0, fp.x, fp.y, fw);
        fg.addColorStop(0, coreCol);
        fg.addColorStop(0.22, bodyCol);
        fg.addColorStop(1, (style && style.dim) || bodyCol);
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(fp.x, fp.y, fw, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  CC.Primitives.register({
    /* It exists, as the two in stellar-spots.js do, because no existing
     * primitive could say what the thing
     * IS — a loop anchored at both ends, a magnetically-structured dark patch,
     * and a closed cell with a rising and a sinking flank. See each function's
     * note (D76, D80). */
    "prominence": prominence
  });
})();
