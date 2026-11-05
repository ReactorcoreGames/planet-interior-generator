/* Painting the frosting — how a finished band goes onto the canvas: the
 * ribbons and the grain inside it.
 *
 * Split out of draw/film.js, which passed the 500-line rule. The seam is
 * geometry against paint: draw/frost.js decides where the frosting lies and
 * hands this file the curves. Attached to CC.Film; draw/film.js and
 * draw/film-zones.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;
  var clampUnit = CC.Film.clampUnit;

  /* Below this share of the deposit a zone is not worth its own ribbon: the
   * pass would trace 900 points to paint a sliver already covered by the zones
   * either side of it. Low enough that a genuine snowcap on a few bearings
   * still gets drawn. */
  var RIBBON_FLOOR = 0.02;

  /* How many DEPTH passes each zone's ribbon is drawn in.
   *
   * ONE FLAT PASS PER ZONE IS NOT ENOUGH, and the first version of the ribbon
   * rewrite proved it: the seams and the translucency were gone, but so was the
   * material. A single fill averaged over the bearings a zone occupies has the
   * same colour everywhere, so the deposit read as a smooth painted ribbon
   * rather than as something that had settled — flat exactly where the old
   * per-segment version had been busy. Fixing the fill must not cost the
   * texture the fill was carrying.
   *
   * So each zone is drawn as a few NESTED passes keyed to how much material is
   * present: every bearing is painted by the first, only the deepest by the
   * last. Thickness then reads as shading — a drift catches the light, a thin
   * scrape over rock does not — which is the variation the per-quad alpha used
   * to supply, now carried by geometry that cannot seam. Same construction as
   * `paintSeaIce`'s thickness bands, for the same reason. */
  var DEPTH_PASSES = 4;

  /* HOW FAR THE DEPOSIT'S UNDERSIDE IS DRIVEN TOWARD BLACK.
   *
   * A fraction of the band's own value, so a pale snowfield and a dark ooze
   * both sink by the same PROPORTION and neither ends up crushed. Saturation
   * rises slightly as it sinks, which is what keeps the shadow in the
   * material's own family rather than letting it drift toward grey.
   *
   * DELIBERATELY STEEP, BUT BOUNDED BY THE MATERIAL'S IDENTITY. The ramp has
   * to be strong to show at all: the deposit is a few pixels thick at ordinary
   * framing, so a gentle gradient has nowhere to reveal itself, and 0.42
   * measured a real ~30% drop that still read as flat at a glance.
   *
   * The ceiling is set by the other failure. At 0.68 the deposit's lower half
   * went dark enough to read as crust rather than as shaded cover — the band
   * lost its colour identity, which costs more than the drama gains. This
   * sits between: unmistakably three-dimensional, still unmistakably its own
   * material. The placement of the stops matters more than this number
   * anyway; see the gradient in `paintFrosting`. */
  var DEPTH_SINK = 0.50;

  /* Where the gradient's middle stop sits across the band's thickness. Below
   * the halfway mark, so most of the darkening happens near the rock and the
   * lit surface keeps its colour. See the gradient in `paintFrosting`. */
  var DEPTH_MID = 0.30;

  /* PAINT THE MEASURED DEPOSIT AS WHOLE RIBBONS, ONE PER ZONE.
   *
   * WHAT THIS REPLACED, AND WHY IT HAD TO GO. The frosting used to be drawn as
   * one semi-transparent quad per segment — 900 of them, each with its own
   * fill. That is an angular fill built from independent pieces that share an
   * edge, and this project has now proved five separate times that the
   * construction cannot be made to work:
   *
   *   - Abutting quads leave an antialiased gap along every join. Measured with
   *     a Fourier probe of the ring: power 0.822 at exactly period 900.
   *   - Overlapping them doubles the alpha into a BRIGHT seam instead. A 0.6
   *     segment overlap measured worse still, at 2.6.
   *   - A hairline 0.06 overlap sat in a narrow minimum between the two, valid
   *     only for the exact alpha and segment count it was swept at.
   *
   * That last value held the artifact down but left the mechanism in place, and
   * the mechanism is the defect. THE RULE, ONCE MORE AND STRUCTURALLY THIS
   * TIME: an angular fill must never expose an edge shared by two
   * independently drawn pieces. Trace one continuous path, and there is no
   * shared edge for a seam to form along — no constant to sweep, and nothing
   * that comes back when SEGMENTS or the opacity changes.
   *
   * WHY IT CAN BE ONE PATH NOW, when the old comment insisted it could not. The
   * objection was that the frosting needs per-segment COLOUR, and one path
   * carries one fill. True — but the colour is not arbitrary per segment; it is
   * a blend of FOUR zones. So the band is painted once per zone, each pass
   * tracing the full circumference and filled with that zone's colour. The
   * blending that used to happen inside a segment's fill now happens between
   * overlapping opaque passes, which is what `paintSeaIce` does with its nested
   * thickness bands and what the sea ice proved works.
   *
   * THE PASSES ARE OPAQUE. Alpha was doing two jobs — hiding seams and carrying
   * how much material is present — and the second is what made a scoured
   * dayside see-through. Frosting is soil, snow, ice and stone; none of it is
   * translucent. Quantity is now entirely a matter of THICKNESS, decided in the
   * measuring pass, so where there is little material the band is thin and
   * where there is none it is closed. */
  function paintFrosting(ctx, view, outerR, innerR, rockR, zoneW, tone,
                         opacity, ZONES) {
    var n = outerR.length - 1;
    var z, i, a, p;

    /* The element-opacity control still applies, but as ONE uniform value for
     * the whole band rather than per bearing. A single flat alpha over
     * non-overlapping geometry cannot seam — and it is a user preference about
     * the render, not a statement about how much snow is on the ground. */
    var op = opacity === undefined ? 1 : clampUnit(opacity);
    if (op <= 0.001) return;

    ctx.save();
    ctx.globalAlpha = op;

    for (z = 0; z < ZONES.length; z++) {
      /* Does this zone hold enough of the deposit anywhere to be worth a pass?
       * Also find its peak share, which sets how bright the pass is drawn. */
      var peak = 0;
      for (i = 0; i <= n; i++) {
        if (zoneW[i][z] > peak) peak = zoneW[i][z];
      }
      if (peak < RIBBON_FLOOR) continue;

      /* NESTED DEPTH PASSES, thinnest first. Pass `d` covers every bearing
       * whose deposit reaches `lo`, so they nest rather than tile — a deep
       * drift is painted by all of them and a bare scrape by the first alone.
       * Nesting is what keeps the shading smooth: neighbouring bearings differ
       * by whether one more pass covered them, never by a boundary between two
       * pieces. */
      for (var d = 0; d < DEPTH_PASSES; d++) {
        var lo = (d / DEPTH_PASSES) * peak;

        var any = false;
        for (i = 0; i <= n; i++) {
          if (zoneW[i][z] > lo) { any = true; break; }
        }
        if (!any) continue;

        /* THE OUTER EDGE, FORWARD — then the inner edge back, closed once and
         * filled once. Where this pass does not reach, the ribbon is pinched
         * shut onto the deposit's own underside, so the path stays continuous
         * and encloses no area there. A zone that covers only part of the world
         * therefore needs no sub-path and leaves no edge: exactly the trick
         * `CC.Layers.pinchFn` uses on a sub-pixel sea. */
        ctx.beginPath();

        for (i = 0; i <= n; i++) {
          a = (i / n) * TAU;
          var share = zoneW[i][z] > lo ? clampUnit(zoneW[i][z]) : 0;
          /* Interpolating the outer edge between the band's underside and its
           * true top by this zone's share is what makes the passes blend: where
           * two zones meet, both are drawn part-way and the later covers the
           * earlier gradually rather than at a line. */
          var top = innerR[i] + (outerR[i] - innerR[i]) * share;

          /* THE RIBBON MAY NEVER SINK BELOW THE ROCK IT LIES ON.
           *
           * The interpolation above runs from `innerR`, which is under the
           * surface, so a low share put a zone's top inside the crust and
           * painted the deposit's colour into the stone — the defect the user
           * saw as a teal band buried in a mauve crust with bare rock popping
           * out past it. It showed up on locked worlds because the angular
           * sea level and the scoured cover push several zones to small shares
           * over the same arcs.
           *
           * Where the share is too small to lift the top clear of the rock,
           * there is genuinely not enough material here to see, so the ribbon
           * PINCHES SHUT: top and underside meet on the surface and the pass
           * encloses no area at this bearing. That is the same geometric
           * retreat `amount < 0.001` already uses, and it keeps quantity a
           * matter of geometry rather than alpha — no zone becomes
           * semi-transparent anywhere as a result. */
          var floorR = rockR[i];
          if (top < floorR) top = floorR;
          p = view.at(top, a);
          if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }

        /* THE UNDERSIDE IS RAISED TO THE SAME FLOOR. Tracing back along the
         * true `innerR` while the top has been clamped to the rock would leave
         * the ribbon enclosing the sliver of stone between them — which is the
         * buried band again, merely thinner. The band's genuine bleed into the
         * rock is still drawn: it is carried by the passes whose share DOES
         * lift the top clear, which trace the unclamped underside. */
        for (i = n; i >= 0; i--) {
          a = (i / n) * TAU;
          var shareBack = zoneW[i][z] > lo ? clampUnit(zoneW[i][z]) : 0;
          var topBack = innerR[i] + (outerR[i] - innerR[i]) * shareBack;
          var innerBack = topBack < rockR[i] ? rockR[i] : innerR[i];
          p = view.at(innerBack, a);
          ctx.lineTo(p.x, p.y);
        }

        ctx.closePath();

        /* THE COLOUR OF THE BEARINGS THIS PASS ACTUALLY COVERS.
         *
         * `tone` carries the per-bearing blend the measuring pass computed,
         * including the cold/hot thermal substitution — so a pass that only
         * reaches a frozen face is averaged over frozen bearings and comes out
         * ice-coloured, which is the whole point of the thermal sets. Averaging
         * per PASS rather than per zone is what restores the variation a single
         * flat fill had flattened out: the deep passes see only the deep
         * bearings, so they carry that material's own colour rather than the
         * zone's global mean. */
        var sh = 0, sv = 0, sAmt = 0, wsum = 0;
        var hx = 0, hy = 0;
        for (i = 0; i <= n; i++) {
          var wt = zoneW[i][z];
          if (wt <= lo) continue;
          var t = tone[i];
          var rad = t.h * Math.PI / 180;
          hx += Math.cos(rad) * wt;
          hy += Math.sin(rad) * wt;
          sv += t.v * wt;
          sh += t.s * wt;
          sAmt += t.amount * wt;
          wsum += wt;
        }
        if (wsum <= 0) continue;
        var hue = Math.atan2(hy, hx) * 180 / Math.PI;
        if (hue < 0) hue += 360;
        var sat = sh / wsum;
        var val = sv / wsum;
        var amt = sAmt / wsum;

        /* Brighter where the deposit is deepest. The pass index carries this
         * now as well as the measured amount, so the nested passes build a
         * genuine gradient from the thin edge to the heart of a drift rather
         * than all landing on one value. */
        var deep = DEPTH_PASSES > 1 ? d / (DEPTH_PASSES - 1) : 0;
        var lift = 0.85 + amt * 0.30 + deep * 0.10;
        var passSat = Math.min(1, sat * (0.88 + amt * 0.24) * (1 - deep * 0.10));
        var passVal = Math.min(1, val * lift);

        /* THE DEPOSIT DARKENS WITH DEPTH.
         *
         * A flat fill reads as a coloured band rather than as material with a
         * thickness: the top surface and the buried underside were drawn the
         * same, so nothing said which way was down. Shading the band radially
         * — lit at the surface, sinking toward the core — is what gives it
         * body, and it is the one gradient the deposit genuinely has, since
         * light reaches the top of a drift and not the bottom of it.
         *
         * DRIVEN TOWARD BLACK IN FAMILY, not toward grey: the underside of
         * green moss is dark green, and desaturating it would make the deposit
         * read as two different materials stacked. Same rule as
         * `CC.DrawDetails.depthFill`, which sinks a crater floor the same way.
         *
         * The gradient is anchored to the BODY's centre, so it runs along the
         * true radial direction at every bearing rather than along the screen.
         * Its two stops bracket the band's own radial extent, measured over
         * the bearings this pass actually covers — so a thin scrape gets the
         * same top-to-bottom ramp as a deep drift instead of sampling a
         * fraction of one built for the whole ring. */
        /* THE BAND'S RADIAL EXTENT, measured over the bearings this pass
         * covers. Both edges are floored at the rock exactly as the traced
         * outline is, so the gradient brackets the deposit as DRAWN — reading
         * `innerR` raw would stretch the ramp down into bleed that this pass
         * may not even paint, and spend most of its range below the visible
         * band. That is what made the first version read as no gradient at
         * all: the stops were far apart, so the thin slice of them the band
         * actually occupied was nearly one flat colour. */
        /* WHERE THE GRADIENT'S TWO STOPS GO, and this is the whole difficulty.
         *
         * One radial gradient has to serve a ribbon that wanders in radius all
         * the way round the body. Bracketing it to the band's global extremes
         * — the lowest underside anywhere and the highest top anywhere — was
         * the first attempt, and it is why the darkening measured as a real
         * ramp and still looked flat: at any ONE bearing the band occupies a
         * thin slice of that range, so it sampled a thin slice of the ramp.
         * The stops were far apart and the material only ever saw a little of
         * what lay between them.
         *
         * So the stops are placed at the band's MEAN underside and MEAN top
         * instead. A typical bearing then spans nearly the entire ramp and
         * gets the full sink-to-lit range across its own thickness, which is
         * what makes the shading read. Bearings thicker than the mean clip at
         * the ends — they are already saturated dark below and lit above,
         * which is correct — and thinner ones sample the middle, which is
         * also correct: there is less material there to shade. */
        /* Measured over the band AS TRACED — the underside included, bleed and
         * all, because that is what the ribbon paints and therefore what the
         * gradient has to cover. Flooring the inner stop at the rock (as the
         * outline's TOP is floored) collapsed the range to the sliver standing
         * proud of the surface, which is barely 1.5% of the radius: the ramp
         * then spent itself over almost nothing and the visible band came out
         * uniformly dark. The top is still floored, since the outline's top
         * genuinely is. */
        var sumLo = 0, sumHi = 0, cnt = 0;
        for (i = 0; i <= n; i++) {
          if (zoneW[i][z] <= lo) continue;
          var eHi = outerR[i] < rockR[i] ? rockR[i] : outerR[i];
          sumLo += innerR[i];
          sumHi += eHi;
          cnt++;
        }
        var loR = cnt ? sumLo / cnt : 0;
        var hiR = cnt ? sumHi / cnt : 0;

        /* A band with no measurable thickness has no gradient to draw; give it
         * a hairline so the two stops never coincide, which some canvases
         * treat as an error rather than as a flat fill. */
        if (hiR - loR < 1e-6) hiR = loR + 1e-6;

        var fillStyle;
        if (loR < hiR && ctx.createRadialGradient) {
          /* A TIGHT RAMP ACROSS THE DEPOSIT'S OWN THICKNESS.
           *
           * The gradient runs from the band's underside to its top and no
           * further, so the full sink-to-lit range is spent on the material
           * itself. Anchored at the body's centre, which makes it radial at
           * every bearing — the deposit darkens toward the core the same way
           * all the way round, with no directional light and therefore none of
           * the spoke artifacts an angular construction would risk.
           *
           * It is ONE gradient over ONE traced path. Nothing here tiles, abuts
           * or overlaps, so the seam failure that angular fills kept producing
           * cannot arise: there is no shared edge for it to form along. */
          var g = ctx.createRadialGradient(
            view.cx, view.cy, Math.max(0, loR * view.R),
            view.cx, view.cy, hiR * view.R);

          var sunkS = Math.min(1, passSat * (1 + DEPTH_SINK * 0.30));
          var sunkV = Math.max(0.02, passVal * (1 - DEPTH_SINK));

          /* Three stops, not two. The mid stop sits low so the darkening is
           * front-loaded onto the buried part: the deposit stays near its lit
           * colour across the upper half of its thickness and then falls away
           * sharply toward the rock, which is what makes the shading read as
           * depth rather than as a uniform wash. */
          g.addColorStop(0, CC.Color.hsva(hue, sunkS, sunkV, 1));
          g.addColorStop(DEPTH_MID, CC.Color.hsva(
            hue,
            passSat + (sunkS - passSat) * 0.45,
            passVal + (sunkV - passVal) * 0.45,
            1));
          g.addColorStop(1, CC.Color.hsva(hue, passSat, passVal, 1));
          fillStyle = g;
        } else {
          fillStyle = CC.Color.hsva(hue, passSat, passVal, 1);
        }

        ctx.fillStyle = fillStyle;
        ctx.fill();
      }
    }

    /* --- THE GRAIN ---------------------------------------------------- */
    /*
     * A monochrome gaussian tooth over the whole deposit, laid down after the
     * zone passes so it modulates every one of them equally.
     *
     * WHY IT IS A PIXEL PATTERN AND NOT MORE ELEMENTS. Everything else in this
     * project builds texture from many small drawn shapes, which is right for
     * features — speckle, clasts, veins are THINGS, and their count is a
     * resolution-independent property of the body. Grain is not a set of
     * things: it is the surface of one material, and drawing it as thousands
     * of sub-pixel dots would be both slow and a lie about what it is. A
     * repeating tile costs one fill and reads the same at every zoom.
     *
     * CLIPPED TO THE BAND, and to the band as ACTUALLY DRAWN — the same
     * rock-floored outline the zone passes trace, so the grain cannot appear
     * anywhere the deposit does not. Where the ribbons pinched shut there is
     * no deposit and so no grain, which is what keeps the fix above honest.
     *
     * Drawn at a flat alpha under the element-opacity the passes already
     * carry, so it never introduces translucency of its own: it lightens and
     * darkens the material, it does not let the crust show through it. */
    var grain = CC.Grain.build(ctx);
    if (grain) {
      ctx.save();

      /* The union of every zone's drawn area is simply the band between the
       * rock floor and the true top: a bearing is covered exactly when some
       * zone lifted its ribbon clear, and the outer edge of the outermost such
       * ribbon is `outerR`. Traced once here rather than accumulated from the
       * passes, which would need every pass's path kept alive. */
      ctx.beginPath();
      for (i = 0; i <= n; i++) {
        a = (i / n) * TAU;
        var gTop = outerR[i] < rockR[i] ? rockR[i] : outerR[i];
        p = view.at(gTop, a);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      for (i = n; i >= 0; i--) {
        a = (i / n) * TAU;
        p = view.at(innerR[i], a);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.clip();

      ctx.globalAlpha = op * CC.Grain.ALPHA;

      /* THE GRAIN IS STUCK TO THE PLANET, NOT TO THE SCREEN.
       *
       * Anchored to the canvas it stayed put while the body moved under it,
       * so panning slid the world across a fixed field of specks and the
       * texture visibly belonged to the window rather than to the ground.
       * Grain is a property of the material, so it has to travel with it.
       *
       * The pattern is therefore drawn in a frame centred on the BODY and
       * scaled by the view: translating by `view.cx/cy` carries it through a
       * pan, and scaling by the zoom magnifies the specks along with the
       * terrain.
       *
       * ZOOMING DELIBERATELY CHANGES THE SPECK SIZE, and that is the wanted
       * behaviour rather than a defect: one speck covers a fixed patch of
       * GROUND, so a distant view averages many specks per pixel and reads
       * soft, while a close view resolves them and reads sharp. Getting
       * closer to a surface should show you more of it. An earlier attempt
       * removed the scale to hold specks at a constant screen size, which
       * flattened that out and was the wrong trade.
       *
       * Only the ZOOM is applied, not `view.R` itself. `view.R` already folds
       * in the body's on-screen size; multiplying by it again blew the tile up
       * far past the canvas and left the band filled with a single speck. */
      ctx.translate(view.cx, view.cy);
      var gk = view.zoom === undefined ? 1 : view.zoom;
      ctx.scale(gk, gk);

      ctx.fillStyle = grain;

      /* COVER THE WHOLE CANVAS, EXPRESSED IN THE TRANSFORMED FRAME.
       *
       * The rect is centred on the body, but the band is not: a pan slides it
       * far from that centre, and at high zoom `view.cx/cy` can sit well
       * outside the canvas entirely. So the rect is derived from where the
       * canvas actually IS in these co-ordinates.
       *
       * An earlier version divided the canvas size BY the scale, which made
       * the covered area shrink as the zoom rose — exactly backwards. Past a
       * few times magnification it no longer reached the band and the grain
       * stopped dead partway along it. */
      var pad = CC.Grain.TILE_PX;
      var gx0 = (0 - view.cx) / gk;
      var gy0 = (0 - view.cy) / gk;
      var gw = ctx.canvas.width / gk;
      var gh = ctx.canvas.height / gk;
      ctx.fillRect(gx0 - pad, gy0 - pad, gw + pad * 2, gh + pad * 2);

      ctx.restore();
    }

    ctx.restore();
  }

  CC.Film.paintFrosting = paintFrosting;
})();
