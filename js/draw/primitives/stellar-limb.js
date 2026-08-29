/* Stellar primitives — WHAT THE LIMB HOLDS ONTO.
 *
 * `plume` and `heat-vein`: a tongue of rising gas, and a filament that fades
 * to nothing rather than ending. Both are STRUCTURES — material the star is
 * still holding, which rises, slows and comes back or simply peters out.
 *
 * Its sibling file `stellar-escape.js` holds the marks that LEAVE: a flare and
 * the open-field wind. The split is by that question rather than by size,
 * because it is the question that decides how a mark is drawn — anything the
 * star keeps can end wherever it likes, and anything leaving has to fade out
 * instead of stopping, or it ends on a visible line (see `flare`'s note).
 *
 * THE SAME RULES APPLY AS EVERYWHERE IN draw/. No role names, no archetype
 * names, one signature, pixels only through `view`.
 *
 * draw/primitives.js must load first. */

var CC = CC || {};

(function () {
  "use strict";
  "use strict";

  var clamp = CC.Math.clamp;

  /* ---- plume ------------------------------------------------------------ */

  /* A TONGUE OF FIRE STANDING OFF THE SURFACE.
   *
   * The mark the limb was missing, and it is deliberately a different KIND of
   * thing from everything already out there (D76). What the corona draws is
   * `vein` streamers and `arc-band` wisps — thin strokes, near-radial or
   * tangential, uniform in width. A plume is a VOLUME: wide and bright where
   * it is rooted, curling as it rises, tapering to nothing.
   *
   * IT IS NOT A PROMINENCE EITHER, and that separation is the point of §2 of
   * the polish doc. A prominence is a closed loop anchored at BOTH ends — the
   * only mark in the generator that leaves the body and returns. A plume has
   * one foot and an open tip: it is material leaving. Same layer, opposite
   * statement, and keeping them as two primitives is what lets "more spiky"
   * and "more flames" be two knobs instead of one.
   *
   * `el.curl` shears the tip sideways so a field of them leans rather than
   * bristling like a hedgehog — a radial fringe of identical spikes is a
   * cartoon sun, which is the failure mode at the other end from tameness.
   * `el.seed` gives each one its own bend without needing a stream.
   *
   * DRAWN AS THREE NESTED RIBBONS, wide-dim to narrow-bright. One fill is a
   * flat shape; the stack is what carries the soft edge and the hot core, and
   * it is the same construction the prominence uses for the same reason. */
  function plume(ctx, view, el, style) {
    var rise = el.length || el.size;
    if (!(rise > 0)) return;

    var r0 = el.radius;
    var a0 = el.angle;
    /* HOW FAR THE TIP IS DRAGGED SIDEWAYS, as an arc length.
     *
     * Scaled by the plume's own height so a tall one leans further than a
     * stub — a constant angle makes short plumes look bent and tall ones
     * straight. The coefficient was 1.5 and that was too much: the tips
     * hooked right over and a field of them read as a row of question marks
     * rather than as fire. Half that is a lean; more than that is a curl, and
     * a curl is what a `cell` is for. */
    var curl = (el.curl === undefined ? 0.5 : el.curl) * rise * 0.62;
    var wobble = (el.seed === undefined ? 0.5 : el.seed) * 2 - 1;

    var STEPS = 16;

    /* One point on the centreline. `t` runs 0 at the foot to 1 at the tip.
     *
     * The rise is eased so the plume climbs fast off the surface and slows
     * near its top, which is what a jet of gas decelerating against gravity
     * looks like — a linear rise reads as a drawn spike. The sideways travel
     * is the opposite, accumulating toward the tip, so the base stays planted
     * while the top streams away. */
    function pointAt(t, widen) {
      var up = Math.pow(t, 0.72);
      var across = curl * t * t + wobble * 0.22 * rise * Math.sin(t * 2.4);
      var r = r0 + rise * up;
      /* `across` is a body-space arc length, so it is divided by the radius
       * to become an angle — otherwise a plume near the centre of the body
       * would lean further than one at the limb, which is a bug that only
       * shows on a body whose elements sit at different radii. */
      var a = a0 + (across + widen.tangent) / Math.max(0.05, r);
      return view.at(r + widen.radial, a);
    }

    /* THE RIBBON'S HALF-WIDTH ALONG THE PLUME. Widest a third of the way up
     * rather than at the very foot: a flame is pinched where it emerges and
     * bellies out above that, and starting at full width makes the base read
     * as a wedge glued onto the limb. Zero at the tip, always, so it ends by
     * dissolving. */
    function halfWidth(t) {
      /* NARROW. The first version peaked at 0.16 of the rise and was drawn
       * three times up to 1.6x that, giving a total width of half its height
       * — which rendered as a field of LEAVES lying against the limb rather
       * than as fire standing off it. A flame tongue is several times taller
       * than it is wide, and this is the number that decides which of those
       * two things the mark is.
       *
       * The `t^0.42` inside the sine pushes the widest point down toward the
       * foot and leaves a long thin taper above it, which is the silhouette
       * that reads as a tongue. A symmetric bulge reads as a seed. */
      return rise * 0.062 * Math.sin(Math.pow(t, 0.42) * Math.PI);
    }

    /* One filled ribbon at a width multiplier. The offset is perpendicular to
     * the centreline, which near the surface is tangential and near the tip is
     * whatever the curl has made it — approximated as tangential throughout,
     * which is accurate where the plume is wide and irrelevant where it is
     * not. */
    function ribbon(k, fill) {
      var i, t, w, p;
      ctx.beginPath();
      for (i = 0; i <= STEPS; i++) {
        t = i / STEPS;
        w = halfWidth(t) * k;
        p = pointAt(t, { tangent: w, radial: 0 });
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      for (i = STEPS; i >= 0; i--) {
        t = i / STEPS;
        w = halfWidth(t) * k;
        p = pointAt(t, { tangent: -w, radial: 0 });
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    }

    var body = (style && style.body) || style;
    var core = (style && style.core) || style;

    /* Outermost pass: wide and dim, the halo of gas around the jet. */
    ribbon(1.6, body);
    /* The jet itself. */
    ribbon(1.0, body);
    /* The hot channel up the middle — without it the plume is a flat leaf. */
    ribbon(0.34, core);
  }


  /* ---- heat-vein --------------------------------------------------------- */

  /* A THREAD OF HOT GAS REACHING OUT INTO THE GLOW, and then out of it.
   *
   * The user's own addition to the emissive pass: *"besides just a radial
   * glow, it could also have sort of 'heat veins' reaching through that glow
   * into space, fading out further out."* A plain radial glow is a
   * photographic effect and reads as a lens artifact; giving it structure is
   * what makes it read as something the STAR is doing.
   *
   * DELIBERATELY NOT A `vein`. The existing primitive draws a fracture — a
   * meandering line with branches, thickest in the middle, with hard ends. A
   * heat vein is the opposite at both ends: it is brightest where it leaves
   * the star and it must have NO end at all, because it does not stop, it
   * runs out of gas. Drawn as a stroke whose alpha falls along its length in
   * short segments, which is the one construction canvas offers for a line
   * that fades along itself.
   *
   * `style` is a plain colour here rather than a body/core pair: this mark is
   * one filament, and the falloff carries all of its structure. */
  function heatVein(ctx, view, el, style) {
    var len = el.length || el.size;
    if (!(len > 0)) return;

    var r0 = el.radius;
    var a0 = el.angle;
    var wander = (el.lean === undefined ? 0.35 : el.lean);
    var bend = ((el.seed === undefined ? 0.5 : el.seed) * 2 - 1) * wander;

    var STEPS = 14;
    var alpha = el.alpha === undefined ? 1 : el.alpha;

    ctx.save();
    ctx.lineCap = "round";

    var prev = null;
    for (var i = 0; i <= STEPS; i++) {
      var t = i / STEPS;
      var r = r0 + len * t;
      /* The filament drifts sideways as it climbs, by an amount that grows
       * with distance — hot gas escaping is not aimed. Converted from arc
       * length to angle for the same reason the plume's curl is. */
      var a = a0 + (bend * len * t * t) / Math.max(0.05, r);
      var p = view.at(r, a);
      if (prev) {
        /* THE ALPHA FALLS ALONG THE LINE, which is the entire point of
         * drawing this segment by segment rather than as one stroke. The
         * curve is quadratic so the outer half is nearly gone: a linear fade
         * still has a visible terminus, and a terminus out here reads as a
         * scratch on the render. */
        /* THE ALPHA FADES AT BOTH ENDS, not only at the tip.
         *
         * A filament whose root is its brightest point ends abruptly at the
         * root, and against a fading halo that reads as a dash rather than as
         * something emerging. Easing the first fifth in as well means the
         * mark has no terminus at either end — it appears out of the glow and
         * disappears into space, which is the only way a line can honestly
         * say "this does not stop, it runs out". */
        var u = 1 - t;
        var rootIn = t < 0.2 ? (t / 0.2) : 1;
        ctx.globalAlpha = clamp(alpha * u * u * rootIn, 0, 1);
        ctx.strokeStyle = style;
        /* WIDE AT THE ROOT AND TAPERING, because a constant-width line is a
         * DRAWN LINE and this must not read as a starburst filter's spike.
         * The width falls with the same u the alpha does, so the filament
         * thins as it dims and there is nothing left to see a terminus in. */
        ctx.lineWidth = view.lw(3.4 * u * u + 0.5);
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      prev = p;
    }

    ctx.restore();
  }
  CC.Primitives.register({
    /* Both exist because nothing already out there could say what they are: a
     * one-footed volume of rising gas, and a filament that fades to nothing
     * rather than ending. See each function's note (D76, D80). */
    "plume": plume,
    "heat-vein": heatVein
  });
})();
