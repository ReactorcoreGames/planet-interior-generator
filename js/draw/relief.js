/* Drawing surface terrain — a layer's relief, walked round the bearings.
 *
 * Split out of draw/details.js, which passed the 500-line rule. Attached to
 * CC.DrawDetails; draw/details.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = CC.Math.TAU;
  var clamp = CC.Math.clamp;

  /* ---- surface terrain --------------------------------------------------- */

  /* Draw the terrain profile of a layer that declares relief.
   *
   * Terrain is a boundary displacement plus shading, not a scattered element,
   * which is why it draws here rather than through the primitive table. The
   * layer's band has already been filled to its displaced boundary; this adds
   * the relief shading that makes the profile read as landforms rather than as
   * a wavy edge.
   *
   * THE COASTLINE IS NOT DRAWN HERE. Land is wherever terrain rises above
   * whatever floats on it, and that emerges from the two layers being drawn in
   * order — the ocean fills to its own flat radius over a bumpy floor, so the
   * crossings are coastlines for free (PROGRESS.md D15). */
  function drawRelief(ctx, view, layer, terrain, colour, opts) {
    opts = opts || {};
    var segments = 360;
    var outer = layer.outer;

    /* A highlight along the sunward face of every rise, and a shadow in every
     * hollow. Derived from the LOCAL SLOPE of the field, so it tracks the
     * terrain exactly rather than being a separate decorative pass. */
    var strength = opts.strength === undefined ? 1 : opts.strength;

    ctx.save();
    ctx.lineCap = "butt";

    for (var i = 0; i < segments; i++) {
      var a0 = (i / segments) * TAU;
      var a1 = ((i + 1) / segments) * TAU;

      var h0 = terrain.at(a0);
      var h1 = terrain.at(a1);
      var slope = (h1 - h0) / Math.max(1e-6, terrain.amplitude);

      /* Slope drives both the sign and the strength of the shading.
       *
       * The gain is modest on purpose. At a high gain the term saturates at
       * ±1 across almost every segment, so the shading stops tracking the
       * terrain and instead paints the entire band — which turned the crust
       * into a near-black ring and buried the detail inside it. Kept low,
       * only genuinely steep ground picks up a highlight or a shadow, and
       * flat ground keeps the layer's own colour. */
      var lit = clamp(slope * 3.2, -1, 1);
      if (Math.abs(lit) < 0.06) continue;

      var alpha = Math.abs(lit) * 0.34 * strength;
      var style = lit > 0
        ? CC.Color.rgba(colour.lighter(0.50), alpha)
        : CC.Color.rgba(colour.darker(0.55), alpha);

      var rOut = outer + h0;
      /* Shade only a SHALLOW band just beneath the surface.
       *
       * At 0.75 of the amplitude this reached most of the way down the crust
       * and buried the strata and fractures underneath it — the layer ended up
       * with a textured edge and an empty middle. Relief shading belongs at
       * the surface, which is both what reads correctly and what leaves the
       * layer's own detail visible. */
      var rIn = rOut - Math.max(0.004, terrain.amplitude * 0.30);

      var p0 = view.at(rOut, a0);
      var p1 = view.at(rOut + (h1 - h0), a1);
      var p2 = view.at(rIn + (h1 - h0), a1);
      var p3 = view.at(rIn, a0);

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fillStyle = style;
      ctx.fill();
    }

    ctx.restore();
  }

  CC.DrawDetails.drawRelief = drawRelief;
})();
