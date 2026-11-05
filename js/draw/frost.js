/* One layer's frosting — walks the bearings, resolves the zones, and builds
 * the band that draw/frostpaint.js paints.
 *
 * Split out of draw/film.js, which passed the 500-line rule. Attached to
 * CC.Film; draw/film.js, draw/film-zones.js and draw/frostpaint.js must load
 * first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;
  var SEGMENTS = CC.Film.SEGMENTS;
  var clampUnit = CC.Film.clampUnit;
  var smoothstep = CC.Film.smoothstep;
  var zoneWeights = CC.Film.zoneWeights;
  var depositTop = CC.Film.depositTop;
  var featherEnds = CC.Film.featherEnds;
  var paintFrosting = CC.Film.paintFrosting;
  var mixColour = CC.Film.mixColour;
  var hueBlend = CC.Film.hueBlend;

  /* Walk the circumference once to MEASURE the deposit, then paint it as a
   * few whole ribbons. The measuring is unchanged; only the painting is new.
   * See `paintFrosting` for why the two are separate. */
  function drawFrosting(ctx, view, layer, terrain, mask, palette, level,
                        opacity, relief, climate, seaFn, coverFn, boundFn,
                        table) {
    var ZONES = table.zones;
    var range = terrain.range();
    /* THE SPAN MUST BE MEASURED IN THE SAME UNITS AS THE ELEVATION.
     *
     * `ground()` below damps the terrain by `relief` (the silhouette layer
     * draws at 0.55), but `terrain.range()` reports the UNDAMPED field. Feeding
     * a damped height into a threshold normalized by an undamped range shrank
     * every elevation reading by that factor, so `SNOWLINE = 0.42` sat at an
     * effective 0.42/0.55 ≈ 0.76 of the reachable range.
     *
     * Combined with sea level sitting mid-range — which spends half the range
     * before the snowline is even measured — the snow zone became unreachable
     * on EVERY unzoned body: 0 of 200 sampled worlds showed any snow at all,
     * mountain tops included. One of the frosting's four zones was dead.
     *
     * It went unnoticed because the locked-world path drags the snowline down
     * by `snow: -1.10`, which clears the broken threshold easily — the feature
     * that used the zone most was the one case where the bug could not show.
     * See PROGRESS.md D36. */
    var span = Math.max(1e-6, (range.hi - range.lo) * relief);

    /* SEA LEVEL AT ONE ANGLE, and this is the pivot of the whole feature.
     *
     * Every threshold below — the snowline, the shore, the shelf — is measured
     * as elevation relative to this. A flat sea gives the ordinary world it
     * always did; an angular one moves all of them together, which is how a
     * locked world grows an ice cap without any ice-cap code. */
    function levelAt(a) { return level + (seaFn ? seaFn(a) : 0); }

    /* WHICH WAY IS UP FOR THIS DEPOSIT, and it is the only thing that differs
     * between a rock floor and the underside of an ice shell.
     *
     * +1 is every deposit in the generator until the ice moon: material
     * settles OUTWARD from the rock, its top surface is at a larger radius
     * than the ground, and gravity is toward the centre.
     *
     * -1 mirrors the whole thing. The accreted ice on the underside of a shell
     * grows DOWNWARD into the water: it hangs from the layer's inner edge, its
     * "top" (the free surface, the end away from the wall it grew on) is at a
     * SMALLER radius than the ice it is attached to, and it pools where the
     * underside dips down rather than where the ground dips in.
     *
     * Everything below is written in the deposit's own frame — "up" means away
     * from the surface it grew on — and `dir` is the only place the two cases
     * differ. That is what makes this a few sign changes rather than a second
     * deposition model: the pooling, the shedding, the zone weights and the
     * feathering are all the same arithmetic seen in a mirror.
     *
     * `anchor` is the surface the material grows on: the layer's outer radius
     * when it settles outward, its inner radius when it hangs inward. */
    var dir = table.direction === -1 ? -1 : 1;
    var anchor = dir > 0 ? layer.outer : layer.inner;

    /* Elevation as the LAYER draws it, in the deposit's own frame — positive
     * is always AWAY from the surface the material grew on, so a hollow is a
     * hollow whichever way the deposit hangs.
     *
     * On an inverted deposit the terrain field is the shell's UNDERSIDE, and
     * flipping its sign here is what turns a bump on that underside into a
     * dip the accreted ice can gather in. Without the flip the ice would build
     * up on the ridges and shed from the troughs, which is upside down in the
     * literal sense. */
    function ground(a) { return terrain.at(a) * relief * dir; }

    /* How far the levelling looks along the surface, in radians. Tied to the
     * terrain's own band structure rather than to a pixel size, so it is
     * resolution-independent like everything else. */
    var spread = TAU / 90;

    /* Resolve the four colours once. A missing one falls back to the generic
     * `film` entry, so an archetype that has not authored the full set still
     * draws something sensible. */
    var colours = [];
    var z;
    for (z = 0; z < ZONES.length; z++) {
      colours.push(palette.get(ZONES[z].key));
    }

    /* THE THERMAL VARIANTS — the same four zones as a frozen face and as a
     * scorched one would have them.
     *
     * gen/frosting.js resolves all three sets from one family, and the blend
     * below picks between them by temperature. That is what makes the lock
     * change what the material IS: an ice cap is genuinely ice-coloured and a
     * baked face is genuinely ashen, rather than both being the temperate
     * palette at different coverage.
     *
     * PRESENT ON EVERY BODY NOW. These used to be resolved only when the
     * tidal-lock dial was up, because the thermal field only existed there —
     * so an ordinary planet's polar cap, once the climate system could place
     * one, would have been drawn in whatever hue the temperate family rolled:
     * structurally a cap, chromatically not ice. That is the exact failure
     * D35 fixed for locked worlds, and it would have returned here in a new
     * form. */
    /* Named by suffix off the table's own keys rather than listed, so a
     * two-zone or five-zone archetype gets its thermal sets for free —
     * gen/frosting.js writes them under exactly these names. */
    var coldSet = null, hotSet = null;
    if (climate && climate.tempAt && palette.layers &&
        palette.layers[ZONES[0].key + "Cold"]) {
      coldSet = [];
      hotSet = [];
      for (z = 0; z < ZONES.length; z++) {
        coldSet.push(palette.get(ZONES[z].key + "Cold"));
        hotSet.push(palette.get(ZONES[z].key + "Hot"));
      }
    }

    var w = new Array(ZONES.length);
    for (z = 0; z < ZONES.length; z++) w[z] = 0;

    /* THE MEASUREMENTS, one entry per sampled bearing. Collected first and
     * painted afterwards, because a ribbon has to know its whole outline
     * before it can be traced — which is precisely what the per-segment
     * version never had to know, and precisely why it could not avoid seams. */
    var outerR = new Array(SEGMENTS + 1);
    var innerR = new Array(SEGMENTS + 1);
    /* THE ROCK SURFACE ITSELF, carried alongside the band.
     *
     * `innerR` is deliberately BELOW this — the deposit's underside fingers
     * down into the stone so the two read as one ground. That is correct for
     * the band as a whole, but it means the inner edge is not a safe floor for
     * an individual zone's ribbon: `paintFrosting` interpolates each ribbon's
     * top between `innerR` and `outerR` by that zone's share, so a zone with a
     * small share had its top dragged UNDER the rock and painted its colour
     * into the crust's interior — frosting buried in the stone, with bare rock
     * standing outside it. Recorded per bearing so the paint pass can clamp
     * against the real surface rather than against the bleed. */
    var rockR = new Array(SEGMENTS + 1);
    var zoneW = new Array(SEGMENTS + 1);
    var tone = new Array(SEGMENTS + 1);

    for (var i = 0; i <= SEGMENTS; i++) {
      var a = (i / SEGMENTS) * TAU;

      var h = ground(a);
      /* Elevation above sea level, normalized by the terrain's own range so
       * the zone thresholds mean the same thing on every body. Sea level is
       * sampled per angle, which is what carries the whole locked-world look. */
      /* THE SNOWLINE MOVES WITH THE TEMPERATURE AT THIS BEARING, and that is
       * the whole of how a polar cap comes to exist.
       *
       * There is no cap code here and there must never be any. `snowShiftAt`
       * drags the snowline down where the climate field says it is cold, the
       * four deposition ramps below do what they have always done, and what
       * comes out pools in the valleys and thins on the ridges because that is
       * what `depositTop` does to everything. A drawn wedge could only ever be
       * a polygon laid on top of the terrain, which is exactly why D27 cut the
       * `ice-caps` trait and why this must stay a threshold rather than a
       * shape. */
      zoneWeights((h - levelAt(a)) / span, w,
                  climate && climate.snowShiftAt ? climate.snowShiftAt(a) : 0,
                  table);

      /* How much material survives here, as opposed to which kind. A scoured
       * dayside is bare rock, which is a statement about quantity — the zone
       * weights above have already decided what the material would be. The
       * generation stage has already composed the star's scouring with the
       * zone's, so this asks once. */
      var coverage = coverFn ? coverFn(a) : 1;

      /* Blend the zone character. Every quantity is a weighted sum rather than
       * a pick, so a slope that is half shoreline and half hillside gets a
       * deposit that is genuinely between the two. */
      var depth = 0, smooth = 0, bleed = 0, patch = 0, grain = 0;
      for (z = 0; z < ZONES.length; z++) {
        var zw = w[z];
        if (zw <= 0) continue;
        depth += ZONES[z].depth * zw;
        smooth += ZONES[z].smooth * zw;
        bleed += ZONES[z].bleed * zw;
        patch += ZONES[z].patch * zw;
        grain += ZONES[z].grain * zw;
      }

      /* Blend the colour in HSV, weighted the same way. Done componentwise on
       * the palette's own h/s/v rather than on hex strings, so two zones with
       * distant hues cross through the colours between them instead of through
       * grey. */
      /* PICK THE THERMAL SET FIRST, THEN BLEND THE FOUR ZONES WITHIN IT.
       *
       * Temperature chooses WHAT the material is; the height field chooses
       * WHICH of the four it is. Doing it in that order means a frozen face's
       * shoreline is ice over sea rather than a reef, while a temperate face at
       * the same elevation is still a reef — which is the whole point of the
       * thermal field.
       *
       * Blended continuously rather than switched, so the terminator stays the
       * gradient everything else here is careful to keep it. */
      var setC = colours;
      if (coldSet) {
        /* THE SAME TWO FIGURES THE SNOWLINE READS, asked of the climate field
         * rather than re-derived from a temperature here.
         *
         * These used to be two local thresholds against `tempAt` — 0.34 for
         * frozen and 0.62 for scorched — and having a second opinion about
         * where "frozen" starts is what put a cap on a temperate world in
         * VEGETATION colours: the snowline said snow at 0.32 and this said not
         * yet, so the geometry was a cap and the material was moss. Measured
         * at s0.31 v0.74, mauve, which is the D35 failure exactly.
         *
         * One source for one fact. Wherever the snowline placed snow, the
         * material is ice. */
        var fz = climate.chillAt(a);
        var bz = climate.scorchAt(a);
        if (fz > 0.001 || bz > 0.001) {
          setC = [];
          for (z = 0; z < ZONES.length; z++) {
            setC.push(mixColour(colours[z],
                                fz > bz ? coldSet[z] : hotSet[z],
                                fz > bz ? fz : bz));
          }
        }
      }

      var cs = 0, cv = 0;
      for (z = 0; z < ZONES.length; z++) {
        if (w[z] <= 0) continue;
        cs += w[z] * setC[z].s;
        cv += w[z] * setC[z].v;
      }
      /* Hue is combined as vectors — see hueBlend. */
      var ch = hueBlend(setC, w);

      /* THE DEPOSIT. `level` is where the material would settle to; the
       * frosting fills from there down to a ragged underside in the rock. */
      var maxDepth = Math.max(0.010, layer.thickness * depth);
      var settled = depositTop(ground, a, spread, smooth);

      /* How much material is here.
       *
       * Two contributions, and the FIRST IS THE IMPORTANT ONE:
       *
       * 1. The gap the levelling opened up. Where the settled surface rose
       *    above the rock there is a hollow being filled, and that is where
       *    the deposit is genuinely deep. This is what makes it read as
       *    settled material rather than as a coat.
       * 2. A base coat, so ordinary ground is covered too and the frosting is
       *    not merely a valley-filler. Generous, because a frosting that only
       *    reaches the hollows reads as staining — the failure D19 was still
       *    fighting. `patch` decides how much of this the mask may eat, and
       *    it can never take all of it.
       */
      var pooled = clampUnit((settled - h) / Math.max(1e-6, maxDepth));
      var m = clampUnit((mask.norm(a) + 0.55) / 1.4);
      var coat = 1 - patch * 0.45 + patch * 0.45 * smoothstep(m);
      var amount = clampUnit(0.72 + pooled * 0.60) * coat;

      /* An angular zone that suppresses cover removes MATERIAL, not merely
       * colour — a scoured dayside is bare rock, so the deposit has to thin
       * away rather than change hue. Above 1 a zone genuinely piles more on,
       * which is what puts deep snow across a nightside.
       *
       * PILING ON IS A THICKNESS, NOT AN ALPHA — and so, now, is EVERYTHING
       * `amount` does. It used to drive opacity as well as depth, which is
       * what made a scoured face translucent: the frosting is soil, snow, ice
       * and rock, none of which you can see through, so a deposit that fades
       * out rather than thinning out is drawing the wrong thing. Where there
       * is less material the band is now THINNER and the crust shows past its
       * edge; where there is none it closes to nothing and there is genuinely
       * no frosting there.
       *
       * Retaining the split is still right: up to 1 the coverage scales
       * `amount`, and beyond it the surplus rides `pile` into extra depth. */
      var pile = 1;
      if (coverage > 1) {
        pile = coverage;
        coverage = 1;
      }
      if (coverage !== 1) amount = clampUnit(amount * coverage);

      /* Ridges shed. Where the rock stands above its own neighbourhood the
       * frosting thins, which is what puts bare stone on the peaks and stops
       * the band closing into a featureless ring. Never to nothing: even a
       * swept ridge keeps a dusting, and a hard zero made the band break into
       * disconnected islands. */
      var shed = clampUnit((h - settled) / Math.max(1e-6, maxDepth * 0.9));
      amount *= 1 - shed * 0.70;

      /* THE DEPOSIT SITS IN THE HOLLOW AND STANDS PROUD OF IT.
       *
       * `fill` is how much of the gap between the rock and the settled surface
       * this material actually occupies; `heap` is the extra it piles on top,
       * which is what stops a filled valley reading as merely flush. Together
       * they are the difference between a glaze that finds the low spots and
       * gravy that mounds up in them. */
      var fill = (settled - h) * clampUnit(amount * 1.15);
      if (fill < 0) fill = 0;
      /* `pile` is the surplus coverage a zone asked for above full. It lands
       * on the heap term, so a nightside drift genuinely stands deeper than
       * ordinary ground cover instead of merely being as opaque as it. */
      var thickness = fill + maxDepth * amount * 0.55 * pile;

      /* THE TOP SURFACE, and it is built from the thickness rather than the
       * other way round — which is what guarantees the band can never invert.
       *
       * Deriving `top` independently (levelled surface plus a noise wobble)
       * let it fall BELOW the rock wherever the wobble went negative, which
       * flipped the quad inside out and drew the frosting hanging off the
       * outside of the crust. Anchoring the top to "rock plus however much
       * material is actually here" makes that impossible by construction. */
      var grainWobble = 1 + mask.norm(a * 7.0 + 2.1) * grain * 0.55;
      var top = h + thickness * grainWobble;

      /* A DEPOSIT LAID DOWN UNDER WATER STAYS UNDER THE WATER.
       *
       * Silt, ooze and reef all settle on the sea floor, so their top surface
       * cannot stand above the surface of the sea they settled out of. Nothing
       * used to enforce that — `top` is the rock plus however much material is
       * present, and on a shallow shelf that sum can exceed sea level — but the
       * band was translucent, so an overhanging lip merely tinted the water and
       * nobody could see it was wrong.
       *
       * Opaque passes make it visible immediately: the overhang paints over the
       * sea, and on a frozen world over the SEA ICE floating on it, which
       * measured as the ice sheet losing most of its pixels to a rim of ooze
       * drawn on top of it. So the cap is real geometry that was always
       * missing, not a concession to the new fill.
       *
       * Only ever lowers the top, and only where the ground is genuinely below
       * the water — a coastline where the rock breaches the surface keeps its
       * full deposit, because there `h` is already above `sea`. */
      /* BOTH SEA CLAMPS ARE ABOUT A DEPOSIT THAT SETTLED OUT OF WATER ONTO A
       * FLOOR, and neither means anything for one hanging INTO the water from
       * above. Accreted ice on the underside of a shell is submerged along its
       * whole length by construction — there is no "standing above the sea"
       * case to prevent, and clamping against a sea level measured in the
       * layer's outward frame would cut the deposit off at an arbitrary
       * radius. So the inverted case skips them rather than being given a
       * mirrored rule it does not need. */
      var sea = levelAt(a);
      if (dir > 0 && h < sea && top > sea) top = sea;

      /* AND IT STAYS CLEAR OF THE ICE FLOATING ABOVE IT.
       *
       * Sea ice hangs DOWN from the sea's surface into the water column, while
       * seafloor deposit builds UP from the rock into the same column. Both are
       * correct; they simply must not occupy the same space. The frosting is
       * drawn after the ice, so where they overlapped the ooze was painted over
       * the underside of the sheet — measured at 388 of the ice's 1840 visible
       * pixels lost on a frozen world.
       *
       * Under-ice deposit is held to the lower part of the water column. A
       * fraction rather than the ice's true underside because that underside is
       * `paintSeaIce`'s own business and asking for it here would couple two
       * files that currently share only the climate field. */
      if (dir > 0 && climate && climate.isFrozen && h < sea && climate.isFrozen(a)) {
        var floorRoom = sea - h;
        var ceiling = h + floorRoom * 0.45;
        if (top > ceiling) top = ceiling;
      }

      /* The underside, fingering down into the rock. Two frequencies of the
       * mask sampled well away from the angle used for the coat, so the
       * roughness is not a copy of the alpha. */
      var slow = mask.norm(a * 2.0 + 1.7);
      var fast = mask.norm(a * 9.0 + 4.2);
      var roots = 1 + (slow * 0.30 + fast * 0.42) * bleed;
      if (roots < 0.12) roots = 0.12;

      /* The band runs from the deposit's top down to a ragged underside that
       * bites INTO the rock — so the frosting overlaps the stone rather than
       * balancing on it, which is what makes the two read as one ground
       * instead of as a decal. `bleed` sets how deep that bite goes. */
      /* BACK INTO REAL RADII, and this is where the deposit's own frame meets
       * the body's. `dir` un-mirrors both terms together: on an inverted
       * deposit the free surface is at a SMALLER radius than the wall it grew
       * on, and the bleed bites OUTWARD into that wall rather than inward.
       *
       * `rOuter`/`rInner` keep their names — they are the band's outer and
       * inner radii, which is what every consumer below wants — so the swap
       * happens here once rather than being threaded through the paint pass. */
      var rFree = anchor + top * dir;
      var rBite = anchor + (h - maxDepth * 0.55 * bleed * roots) * dir;

      var rOuter = dir > 0 ? rFree : rBite;
      var rInner = dir > 0 ? rBite : rFree;
      if (rInner > rOuter) rInner = rOuter;

      /* AN INVERTED DEPOSIT MAY NOT PROTRUDE PAST THE WALL IT GREW ON.
       *
       * `h` is the terrain mirrored into the deposit's frame, so wherever the
       * raw field is NEGATIVE the mirrored value is positive — and `top`,
       * built from it, then places the free surface at a LARGER radius than
       * the anchor. For an outward deposit that is correct and is the whole
       * point: the rock surface itself moves, and the deposit rides it.
       *
       * For an underside hanging into a fluid it is wrong. The wall is the
       * layer's own inner edge, which is flat; the underside's relief carves
       * INTO the shell and can never stand proud of it into the water. Left
       * unclamped, the band crossed its own anchor on roughly a fifth of
       * bearings — measured on seed `tancalsel-4497`, the accreted tip reached
       * 0.8866 against a shell inner edge of 0.8403, so the deposit was drawn
       * inside the shell and the ocean appeared to have retreated. That is
       * what read as "the ocean is still retreating": not the tidal field at
       * all (which is flat — D172 fixed that), but this band inverting.
       *
       * So the whole band is held at or inside the anchor. It is a clamp
       * rather than a reshape: a bearing that was already correct is
       * untouched, which is why it cannot flatten the accretion it is
       * protecting. */
      if (dir < 0) {
        if (rOuter > anchor) rOuter = anchor;
        if (rInner > rOuter) rInner = rOuter;
      }

      /* WHERE THERE IS NO MATERIAL THE BAND CLOSES, rather than being painted
       * at a low alpha. `amount` is the quantity of deposit at this bearing;
       * at zero the two edges meet and the ribbon encloses no area here, so
       * the crust below is simply not covered. That is the geometric retreat
       * that replaces the old fade — the same pinch `CC.Layers.pinchFn` uses
       * to close a sub-pixel sea, applied for the same reason. */
      if (amount < 0.001) rInner = rOuter;

      outerR[i] = rOuter;
      innerR[i] = rInner;
      /* The rock as DRAWN — boundary wobble and all. Falls back to the
       * terrain-only surface when no boundary function was supplied, which is
       * what a caller without one always got. */
      /* An inverted deposit grew on the layer's INNER edge, so that is the
       * surface its ribbons must be floored against. `boundFn` describes the
       * layer's own outer boundary and means nothing for an underside, so the
       * anchor plus the field is the honest answer there. */
      rockR[i] = (dir > 0 && boundFn) ? layer.outer * boundFn(a)
                                      : (anchor + h * dir);
      zoneW[i] = [w[0], w[1], w[2], w[3]];
      /* Brighter where the deposit is deepest, so a thick drift reads as
       * catching the light rather than as a flat fill. Carried per bearing and
       * resolved per ribbon below. */
      tone[i] = { h: ch, s: cs, v: cv, amount: clampUnit(amount) };

    }

    /* FEATHER THE DEPOSIT'S ENDS INSTEAD OF LETTING THEM CUT OFF.
     *
     * Where cover falls to nothing the ribbon closes, which is correct and is
     * what puts the intentional bare-rock gaps in the band. But it closed over
     * a SINGLE bearing: the deposit ran at full thickness and then stopped, so
     * every gap was bounded by two vertical walls of material — the harsh
     * sideways border the user described.
     *
     * The fix is lateral, not vertical. An earlier attempt eased the top DOWN
     * onto the rock, which lifted the deposit above bare bearings and filled
     * the gaps in — it removed the walls by removing the gaps, which is the
     * opposite of what was wanted. What actually reads as a fading edge is the
     * band getting THINNER as it approaches its own end, over a handful of
     * bearings, with the end itself staying exactly where the cover said it
     * was.
     *
     * So this scales each bearing's thickness by how close the nearest gap is,
     * and touches NOTHING ELSE: no bearing gains material, no gap narrows, and
     * a bearing far from any edge is left exactly as measured. */
    featherEnds(outerR, innerR, rockR, tone);

    paintFrosting(ctx, view, outerR, innerR, rockR, zoneW, tone, opacity,
                  ZONES);
  }

  CC.Film.drawFrosting = drawFrosting;
})();
