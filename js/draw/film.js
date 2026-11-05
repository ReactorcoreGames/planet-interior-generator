/* The surface frosting — material DEPOSITED on the terrain.
 *
 * Snow on peaks, moss and fields on the slopes, reefs and silt in the
 * shallows, ooze on the abyssal floor. The word the user reached for was
 * *frosting*, and the analogies that go with it — cream on a cake, sauce on a
 * steak, gravy poured over — all describe the same physical idea:
 *
 *   IT SETTLES. It pools where there is somewhere to pool and sheds where
 *   there is not, and its top surface is SMOOTHER than the rock beneath it.
 *
 * That is the whole model, and it is what the first version got wrong. That
 * version drew a band of constant radial thickness hugging the terrain, which
 * is "painting the side of the mountain": the cover's top was a copy of the
 * rock's profile, so it read as a coloured rind on the stone rather than as
 * something lying on it. No amount of thickening fixes a band that is parallel
 * to the ground by construction — the fix is geometric, not a tuning value.
 *
 * SO THE FROSTING HAS ITS OWN OUTER CURVE. `deposit()` builds a smoothed
 * version of the terrain and the frosting fills the gap between that curve and
 * the rock. Hollows fill deeply and come out nearly flat on top; ridges shed
 * and let the rock through. See PROGRESS.md D20.
 *
 * FOUR ZONES, from one height field and the sea level:
 *
 *   peak      high ground above the snowline
 *   land      ordinary exposed surface
 *   shallow   the shoreline and shelf, above the sea floor proper
 *   deep      the abyssal floor
 *
 * Each carries its own colour AND its own deposition character — how thick it
 * lies, how far it bleeds into the rock, how smooth its top is, how patchy it
 * is. That is a biome system's *look* without a biome system's machinery: it
 * is the height field, read four ways.
 *
 * PHASE 4. Everything here is a function of ANGLE, and the zone weights are
 * resolved in one place (`zoneWeights`). A tidally-locked world's
 * `zoneAt(angle, depth)` multiplies into that function and needs no new
 * drawing code — ice on the night side is the peak zone reaching further down
 * at one end of the body.
 *
 * THIS FILE NAMES NO ROLES, AND MUST NOT START. It draws on any layer that
 * declares `relief`, takes sea level from whatever fluid floats on that layer,
 * and falls back to the terrain mean when there is none — so a moon, a gas
 * giant's buried floor or an ice shell's underside are archetype data, not new
 * code here. Two things are still planet-shaped and become archetype data when
 * the second consumer lands (PROGRESS.md D22): the ZONES table below, and the
 * SNOWLINE / SHELF thresholds, which are Earth-ish numbers. The ice moon will
 * additionally want a `direction` on a zone, to deposit upward onto the
 * underside of a shell.
 *
 * Loaded after draw/layers.js, which it uses for boundary tracing.
 *
 * AFTER THE SPLIT (Session AL) this file keeps the entry point, `drawSurfaceFilm`.
 * The zones and the deposited top are in draw/film-zones.js, one frosting's
 * geometry in draw/frost.js, and how it is painted in draw/frostpaint.js. All
 * three attach to CC.Film and load straight after this file. */

var CC = CC || {};

CC.Film = (function () {
  "use strict";

  /* How finely the band is walked. High because the frosting's top curve and
   * its ragged underside both carry detail well above the terrain's own
   * frequency; sampled coarsely the underside aliases into chatter. */
  var SEGMENTS = 900;

  /* The deepest any zone declares, as a fraction of its host layer — used only
   * to open the clip far enough for an INVERTED deposit to reach. Generous
   * rather than exact: it bounds the hanging material's reach without this
   * file having to know which zone is deepest, which would be learning what a
   * zone is (D23). */
  var MAX_ZONE_DEPTH = 1.2;

  /* ---- drawing --------------------------------------------------------- */

  /* Paint the frosting on every layer that carries terrain.
   *
   * Unlike the first version this is NOT masked to land. Frosting exists at
   * every depth — the sea floor gets reefs and ooze exactly as the hills get
   * moss — so the fluid is not subtracted. What changes underwater is the
   * ZONE, and therefore the colour and the character, which is the whole point
   * of reading the height field four ways. The sea is drawn afterwards and
   * tints whatever is under it, so submerged frosting correctly reads as being
   * seen through water. */
  function drawSurfaceFilm(ctx, view, body, layers, bounds, deferred, details,
                           palette, settings, elementOpacity,
                           silhouette, silhouetteRelief) {
    if (!details.film) return;

    /* THE ZONE TABLE, RESOLVED BY THE GENERATION STAGE (D22/D23).
     *
     * A plain array of numbers plus two thresholds. If the archetype declares
     * no frosting there is nothing to deposit and this stage is skipped
     * entirely, which is how a body with no terrain-carrying layer pays
     * nothing for the feature existing. */
    var fallbackTable = details.filmZones;
    var byRole = details.filmZoneByRole || {};
    if ((!fallbackTable || !fallbackTable.zones.length) &&
        !Object.keys(byRole).length) return;

    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
      if (layer.outward) continue;

      var terrain = details.terrain[layer.role];
      var mask = details.film[layer.role];
      if (!terrain || !mask) continue;

      /* THE TABLE IS PER FROSTED SURFACE.
       *
       * A body with one frosting resolves every layer to the same table, which
       * is what `fallbackTable` is and what every archetype before the moon
       * declared. An ice-shelled moon frosts TWO surfaces facing each other
       * across its ocean, and they are different materials in different
       * directions, so each layer asks for its own.
       *
       * This file still learns nothing about what a zone is (D23) — it looks a
       * table up by the role it is already iterating and receives plain
       * numbers, exactly as before. */
      var table = byRole[layer.role] || fallbackTable;
      if (!table || !table.zones.length) continue;

      /* The outermost solid layer draws its relief DAMPED (scene.js's
       * SILHOUETTE_RELIEF), because the silhouette is the one boundary read
       * against empty space. Frosting deposited against the full-amplitude
       * field would then sit proud of the rock it is supposed to be lying on
       * — a ring hovering outside the body. Matching the host's scale keeps
       * the deposit on the ground at every relief setting. */
      var relief = (i === silhouette && silhouetteRelief !== undefined)
        ? silhouetteRelief : 1;

      /* Whatever floats directly on this layer, if anything. Found by the same
       * test the deferred pass uses, so the two always agree. Used only to
       * locate SEA LEVEL — not to clip anything away. */
      var fluid = null;
      for (var d = 0; d < deferred.length; d++) {
        if (deferred[d] === i - 1) { fluid = layers[i - 1]; break; }
      }

      /* Sea level in the same units as `terrain.at()`: elevation relative to
       * the layer's mean surface. With no sea, the terrain mean stands in, so
       * the zone maths is identical either way and needs no special case. */
      var level = fluid ? (fluid.outer - layer.outer) : 0;

      /* Sea level may vary by angle — see `levelAt` in drawFrosting. Supplied
       * by the generation stage as a plain function; null on an ordinary
       * world, which keeps the flat-sea path exactly as it was. */
      var seaFn = details.seaLevel ? details.seaLevel[layer.role] : null;

      ctx.save();

      /* Clip to the layer's band, but to its UNDISPLACED outer limit.
       *
       * `bounds[i]` is the relief-displaced boundary — the rock surface
       * itself. Clipping to that erases the frosting almost entirely, because
       * deposition is mostly about material sitting ABOVE the local rock:
       * every filled hollow lies outside that curve and gets trimmed. (This
       * cost a round: the deposit maths was computing a correct 5px band that
       * was being clipped to nothing.)
       *
       * The peak of the terrain is the highest the rock ever reaches, so
       * allowing the frosting out to there — and no further — keeps it inside
       * the layer's envelope without cutting into the deposit. The inner edge
       * still uses the real displaced boundary of the layer below, since
       * frosting must not leak into the mantle. */
      /* AN INVERTED DEPOSIT LIVES OUTSIDE THIS LAYER'S BAND, and clipping it
       * to the band would erase it completely.
       *
       * The clip above exists to keep an outward deposit from leaking into the
       * mantle. Material hanging off the layer's INNER edge is doing exactly
       * the thing that clip forbids — it belongs in the space below, which on
       * an ice moon is the ocean the ice is accreting into. So the inner limit
       * is opened up by the depth the deposit can actually reach, and no
       * further, which keeps the guarantee (nothing leaks past the deposit's
       * own reach) while letting the one legitimate case through.
       *
       * This is the same trap the outward clip already cost a round on: the
       * deposit maths was computing a correct band that was being clipped to
       * nothing. Worth stating rather than rediscovering. */
      var invert = table.direction === -1;
      var reach = layer.outer + Math.max(0, terrain.range().hi) * relief;
      ctx.beginPath();
      CC.Layers.traceBoundary(ctx, view, reach, null, false);
      var floor = layer.inner;
      if (invert) {
        /* How far the hanging material may reach: its own maximum depth plus
         * the amplitude of the underside it grew on. */
        var lo = terrain.range().lo;
        floor = layer.inner - layer.thickness * MAX_ZONE_DEPTH
                            - Math.max(0, -lo) * relief;
        if (floor < 0) floor = 0;
      }
      if (floor > 0) {
        CC.Layers.traceBoundary(ctx, view, floor,
                                (invert || i + 1 >= layers.length)
                                  ? null : bounds[i + 1], true);
      }
      ctx.clip("evenodd");

      /* THE THERMAL SOURCE IS NOW THE CLIMATE FIELD, NOT THE ZONE.
       *
       * `details.zones` is null on any world whose Tidal locking dial is at
       * zero, so `tempAt`, `snowAt` and `coverAt` were all absent on an
       * ordinary planet — which is why `frostPeak` was unreachable on 100% of
       * unzoned bodies and no world could grow a polar cap (D36, D38). The
       * climate field is present on EVERY body and folds the zone in as one
       * contributor, so this file's four zones finally all reach.
       *
       * Nothing here changed shape: it still receives plain functions of angle
       * and still learns nothing about what a climate or a zone is (D23). */
      /* THE LAYER'S OWN DRAWN BOUNDARY, handed in so the deposit can be
       * floored against the rock as the viewer actually sees it.
       *
       * `layer.outer + terrain.at(a)` is NOT that surface. `CC.Layers.reliefFn`
       * composes the terrain onto `boundaryFn` — the boundary-irregularity
       * wobble — and `levelFn` may compose an angular sea offset on top of
       * that. Flooring against the terrain alone therefore left the deposit
       * under the rock wherever the wobble bulged outward, which is the
       * residual burial the user still saw on the lower-right limb after the
       * first fix. Reading the same function the crust is drawn with keeps the
       * two in agreement by construction rather than by arithmetic that has to
       * be kept in step. */
      CC.Film.drawFrosting(ctx, view, layer, terrain, mask, palette, level,
                   elementOpacity, relief, details.climateField, seaFn,
                   details.coverAt, bounds[i], table);

      ctx.restore();
    }
  }

  return {
    draw: drawSurfaceFilm,
    /* Exported so the seam assertion in test/climate.mjs measures at the real
     * segment period rather than a hardcoded copy of it. SEGMENTS is now purely
     * a SAMPLING rate — the band is painted as whole ribbons, so there is no
     * per-segment fill and no overlap constant to go with it. */
    SEGMENTS: SEGMENTS
  };
})();
