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
 * Loaded after draw/layers.js, which it uses for boundary tracing. */

var CC = CC || {};

CC.Film = (function () {
  "use strict";

  var TAU = Math.PI * 2;

  /* How finely the band is walked. High because the frosting's top curve and
   * its ragged underside both carry detail well above the terrain's own
   * frequency; sampled coarsely the underside aliases into chatter. */
  var SEGMENTS = 900;

  /* Below this share of the deposit a zone is not worth its own ribbon: the
   * pass would trace 900 points to paint a sliver already covered by the zones
   * either side of it. Low enough that a genuine snowcap on a few bearings
   * still gets drawn. */
  var RIBBON_FLOOR = 0.02;

  /* The deepest any zone declares, as a fraction of its host layer — used only
   * to open the clip far enough for an INVERTED deposit to reach. Generous
   * rather than exact: it bounds the hanging material's reach without this
   * file having to know which zone is deepest, which would be learning what a
   * zone is (D23). */
  var MAX_ZONE_DEPTH = 1.2;

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



  /* HOW MANY BEARINGS THE DEPOSIT TAKES TO FADE OUT AT AN END.
   *
   * In bearings, of which there are SEGMENTS around the body — so this is a
   * genuine angular width and stays the same fraction of the circumference at
   * every resolution. Short: the point is to take the wall off the edge of a
   * gap, not to erode the cover back from it. */
  var FEATHER_SPAN = 14;

  /* Below this much material a bearing counts as bare, and is an END that the
   * feather measures from. The same threshold the ribbon already closes at. */
  var BARE_LEVEL = 0.02;


  function clampUnit(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  function smoothstep(t) { t = clampUnit(t); return t * t * (3 - 2 * t); }

  /* ---- zones ----------------------------------------------------------- */

  /* The four zones, outermost-down. `key` indexes the palette's frosting
   * colours; the rest is deposition CHARACTER, and it is the character that
   * makes each read as a different kind of material rather than as the same
   * frosting in four colours:
   *
   *   depth     how thick it lies, as a fraction of the host layer
   *   smooth    how much flatter than the rock its top surface is. High values
   *             pool and level out; low values drape and follow the ground
   *   bleed     how far its underside fingers down into the rock
   *   patch     how much of the mask's variation reaches the alpha. Low is an
   *             even coat, high is broken and blotchy
   *   grain     amplitude of the fine wobble on the top surface — the
   *             difference between a poured glaze and a crumbly one
   *
   * Authored to contrast with their neighbours: snow lies smooth and even,
   * vegetation is patchy and draped, reefs are lumpy, abyssal ooze is thick
   * and almost featureless. */
  /* THE ZONE TABLE IS NO LONGER HERE. It used to be a `var ZONES` at this
   * spot, with a SNOWLINE of 0.42 and a SHELF of -0.16 beside it, and D22
   * recorded that all three had to become archetype data when a second family
   * started depositing. Phase 5 is that family: a gas giant's crushed floor
   * wants two zones, not four, and thresholds nothing like Earth's.
   *
   * The table now lives in `colorProfile.layers.film` beside the colours it
   * has always paired with, is resolved by `CC.Frosting.zoneTable` in the
   * generation stage, and arrives here on `details.filmZones` as a plain
   * array of numbers plus two thresholds.
   *
   * NOTHING IN THIS FILE COUNTS ZONES ANY MORE. The weights loop below is
   * written against the table's own length and the `snow` / `aquatic` flags
   * on its rows, so an archetype declaring two, three or five zones needs no
   * change here — which is what D22 asked for and what D23 requires (this
   * file receives numbers and learns nothing about what a zone is).
   *
   * The planet's own numbers moved verbatim into js/data/archetypes/solid.js;
   * they are unchanged, they are simply now stated as facts about a planet
   * rather than as constants of the renderer. */

  /* Blend width at each boundary. Wide enough that no zone ends on a line —
   * a hard edge between two frostings reads as a drawn contour, which is the
   * failure this whole feature exists to avoid. */
  var BLEND = 0.13;

  /* The snowline gets its own, wider blend — see `zoneWeights`. A shoreline is
   * an elevation boundary and is nearly sharp; a snowline is a climatic one
   * and is not. */
  var SNOW_BLEND = 0.42;

  /* Weight of each zone at one angle. Returns an array parallel to ZONES,
   * summing to 1.
   *
   * ONE FUNCTION, FOUR OVERLAPPING RAMPS. Zones are not selected by a chain of
   * branches — every zone gets a weight and they are blended, which is what
   * makes the transitions gradients rather than steps, and what will let a
   * Phase 4 zone field bias the weights continuously.
   *
   * `h` is elevation above the level line, already normalized by the terrain's
   * range, so it is directly comparable to SNOWLINE and SHELF. */
  /* `snowShift` moves the snowline for this angle only. Zero on an ordinary
   * world; negative on a locked world's night face, where it drags the snow
   * zone down past the waterline and produces an ice cap out of the ordinary
   * deposition model. */
  function zoneWeights(h, out, snowShift, table) {
    var line = table.line + (snowShift || 0);

    /* THE SNOW BOUNDARY IS WIDER THAN THE OTHER THREE, AND DELIBERATELY SO.
     *
     * The shore and the shelf are ELEVATION boundaries: the water reaches a
     * height and stops, and a narrow blend there is right because the real
     * edge is nearly sharp. A snowline is a CLIMATIC boundary — a band where
     * it is cold enough some of the time — and it is genuinely soft on any
     * real world.
     *
     * It also has to be, because two gradients now compound at a cap's edge:
     * the terrain falling away AND the snowline rising as the bearing warms.
     * At `BLEND` the pair crossed the threshold in about three degrees, giving
     * 0.40 of weight per degree where anything above 0.10 reads as a drawn
     * contour rather than a cap — precisely the polygon-on-top-of-the-terrain
     * failure D27 cut the `ice-caps` trait to avoid, arriving by way of the
     * mechanism meant to replace it.
     *
     * The lesson is D24's, in a new place: a smoothness requirement is a
     * number, so assert it and fix it where the steepness is produced. */
    var peak = smoothstep((h - line) / SNOW_BLEND + 0.5);
    var dry = smoothstep(h / (BLEND * 0.8) + 0.5);
    var shelf = smoothstep((h - table.shelf) / BLEND + 0.5);

    /* THE SNOW ZONE TAKES PRECEDENCE ALL THE WAY DOWN.
     *
     * Ordinarily the snowline sits above the waterline and the four ramps
     * nest: peak over land over shallow over deep. A dragged-down snowline
     * breaks that nesting — snow can now claim ground that is also below sea
     * level — so each lower zone is masked by what snow has already taken
     * rather than only by the zone directly above it.
     *
     * Physically that is right: a frozen sea is ice at the surface whatever is
     * underneath, which is exactly what an ice cap over shallow water is. */
    /* THE FOUR RAMPS ARE FOUR ROLES, AND A TABLE MAY DECLARE FEWER.
     *
     * The four cases below are the same four they always were — the top zone
     * (whatever the snowline governs), the ordinary dry ground, the shelf,
     * and the deep floor — but they are now assigned by walking the table
     * rather than by writing to fixed indices. A zone's ROLE comes from its
     * declared flags and its position:
     *
     *   the first zone            takes the snowline ramp if it declares
     *                             `snow`, and is ordinary dry ground if not
     *   later non-aquatic zones   share the dry ramp
     *   the first aquatic zone    takes the shelf
     *   later aquatic zones       take the deep floor
     *
     * A two-zone giant therefore gets exactly what its data asks for: one
     * high-ground zone and one that takes everything below it, with no
     * underwater ramps reachable because it declares neither `aquatic` zone
     * and its `shelf` threshold is pushed out of range anyway.
     *
     * THE TOP ZONE STILL TAKES PRECEDENCE ALL THE WAY DOWN. Ordinarily the
     * snowline sits above the waterline and the ramps nest: peak over land
     * over shallow over deep. A dragged-down snowline breaks that nesting —
     * snow can now claim ground that is also below sea level — so each lower
     * zone is masked by what the top has already taken rather than only by
     * the zone directly above it. Physically that is right: a frozen sea is
     * ice at the surface whatever is underneath, which is exactly what an ice
     * cap over shallow water is. */
    var rows = table.zones;
    var n = rows.length;
    var topClaims = rows[0].snow ? peak : 0;

    var dryCount = 0, wetCount = 0, z;
    for (z = 0; z < n; z++) {
      if (rows[z].aquatic) wetCount++; else dryCount++;
    }
    /* When the top zone is the snowline it is not one of the dry-ramp
     * sharers, so the ramp is split between the rest. */
    var drySharers = dryCount - (rows[0].snow ? 1 : 0);
    if (drySharers < 1) drySharers = 1;

    var seenWet = 0;
    for (z = 0; z < n; z++) {
      var row = rows[z];
      if (z === 0 && row.snow) {
        out[z] = peak;
      } else if (!row.aquatic) {
        out[z] = dry * (1 - topClaims) / drySharers;
      } else {
        seenWet++;
        /* The first wet zone is the shelf; anything below it is the deep
         * floor, sharing what the shelf did not take. */
        out[z] = seenWet === 1
          ? shelf * (1 - dry) * (1 - topClaims)
          : (1 - shelf) * (1 - topClaims) / Math.max(1, wetCount - 1);
      }
    }

    /* A TABLE WITH NO WET ZONES MUST STILL ACCOUNT FOR ALL ITS GROUND.
     *
     * On a planet the shelf and deep ramps carry everything below the
     * waterline. A giant's floor declares neither, so without this the weights
     * sum to well under 1 wherever the ground is low and the deposit thins to
     * nothing there — the opposite of "thick sediment pooled in every hollow".
     * Renormalizing is the honest fix: the zones the archetype declared divide
     * the whole surface between them, however many there are. */
    var sum = 0;
    for (z = 0; z < n; z++) sum += out[z];
    if (sum > 1e-6 && Math.abs(sum - 1) > 1e-6) {
      for (z = 0; z < n; z++) out[z] /= sum;
    }
    return out;
  }

  /* THE ANGULAR HOOK IS SEA LEVEL ITSELF — there is no zone bias here at all.
   *
   * An earlier version multiplied these four weights by a per-zone bias, which
   * worked but was redundant: `zoneWeights` measures elevation RELATIVE TO SEA
   * LEVEL, so making sea level a function of angle moves every threshold at
   * once. On a locked world's cold face the sea rises, so ground that sat at
   * the snowline now reads well above it and snow reaches down to the water —
   * an ice cap, from the deposition model, with no ice-cap code. On the hot
   * face the sea has gone, so everything reads as high dry ground.
   *
   * That is D20's promise cashed exactly as written: "tidal locking becomes
   * the peak zone reaching further down at one end of the body". It turned out
   * to need one fewer mechanism than expected.
   *
   * THIS FILE STILL LEARNS NOTHING ABOUT WHAT A ZONE IS. It receives a plain
   * function of angle from the generation stage and a scalar coverage; there
   * are no zone ids, arcs or colour deltas here (PROGRESS.md D23). */

  /* ---- deposition ------------------------------------------------------ */

  /* The frosting's OUTER surface at one angle.
   *
   * This is the heart of the feature. Terrain is sampled three times — at the
   * angle and a little to each side — and the frosting's top is pulled toward
   * the LOCAL MEAN by `smooth`. Where the ground is a hollow the mean sits
   * above it and the frosting fills in; where it is a ridge the mean sits
   * below and the frosting thins away. That single relationship produces
   * pooling and shedding without ever asking "is this a hollow", and it is why
   * the top surface comes out flatter than the rock.
   *
   * `spread` is the sampling half-width in radians: how far the material
   * "sees" when it levels out. Wide enough to span a mountain's shoulder, or
   * peaks would fill their own dips and nothing would shed. */
  function depositTop(ground, a, spread, smooth) {
    var h = ground(a);
    var mean = (ground(a - spread) + h * 2 + ground(a + spread)) * 0.25;
    /* Only ever levels TOWARD the local mean — never below the rock, which
     * would put the frosting's top underground. */
    return h + (mean - h) * smooth;
  }

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
      drawFrosting(ctx, view, layer, terrain, mask, palette, level,
                   elementOpacity, relief, details.climateField, seaFn,
                   details.coverAt, bounds[i], table);

      ctx.restore();
    }
  }

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

  /* Thin the deposit toward wherever it ends.
   *
   * `tone[i].amount` is already the measured quantity of material, and it is
   * the honest signal for "is this bearing bare": the ribbon closes exactly
   * where it reaches zero. So the distance to the nearest bare bearing is
   * measured once around the ring, and each bearing's band is squeezed toward
   * the rock by how near it is to one.
   *
   * ONLY EVER REMOVES MATERIAL, and only within FEATHER_SPAN bearings of an
   * end. A bearing in the middle of a drift is untouched, so this cannot fill
   * a gap, widen the cover, or alter the structure the cover function decided
   * — it takes the corner off an edge that already exists. */
  function featherEnds(outerR, innerR, rockR, tone) {
    var n = outerR.length - 1;
    var i;

    /* Which bearings carry no deposit at all. The ribbon is already closed
     * here; they are the ends everything else is measured from. */
    var bare = new Array(n + 1);
    var anyBare = false, allBare = true;
    for (i = 0; i <= n; i++) {
      bare[i] = tone[i].amount < BARE_LEVEL;
      if (bare[i]) anyBare = true; else allBare = false;
    }
    /* A band with no ends has nothing to feather, and one with no material
     * has nothing to thin. Both are left exactly alone. */
    if (!anyBare || allBare) return;

    /* Distance in bearings to the nearest bare one, by two sweeps around the
     * ring. Cheap, exact, and wraps — a deposit ending at bearing 0 must feel
     * the gap at bearing n. */
    var dist = new Array(n + 1);
    for (i = 0; i <= n; i++) dist[i] = bare[i] ? 0 : Infinity;

    var pass, k;
    for (pass = 0; pass < 2; pass++) {
      for (k = 0; k <= n; k++) {
        i = pass === 0 ? k : n - k;
        var prev = pass === 0 ? (i === 0 ? n : i - 1)
                              : (i === n ? 0 : i + 1);
        if (dist[prev] + 1 < dist[i]) dist[i] = dist[prev] + 1;
      }
    }

    for (i = 0; i <= n; i++) {
      if (bare[i] || dist[i] > FEATHER_SPAN) continue;

      /* Smoothstepped so the taper leaves the full-thickness band without a
       * crease and arrives at the gap flat, rather than as a straight wedge
       * with a corner at each end. */
      var t = smoothstep(dist[i] / FEATHER_SPAN);

      /* Squeeze BOTH edges toward the rock surface. The top comes down and the
       * bleed comes up, so the band narrows about the ground it lies on rather
       * than sliding inward or outward as it fades. */
      var rock = rockR[i];
      if (outerR[i] > rock) outerR[i] = rock + (outerR[i] - rock) * t;
      if (innerR[i] < rock) innerR[i] = rock - (rock - innerR[i]) * t;
    }
  }

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

  /* Blend two palette entries by `t`, taking the short way round the hue
   * wheel. Returns a bare {h,s,v} — the only three fields the band fill reads,
   * so there is no need to rebuild the hex and closure family per segment. */
  function mixColour(a, b, t) {
    var d = (b.h - a.h) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return {
      h: ((a.h + d * t) % 360 + 360) % 360,
      s: a.s + (b.s - a.s) * t,
      v: a.v + (b.v - a.v) * t
    };
  }

  /* Weighted circular mean of the zone hues.
   *
   * Averaged as plain numbers, a shoreline blending a hue of 350 into one of
   * 10 would travel backwards through 180 and put a band of the complementary
   * colour along every coast. Summing unit vectors takes the short way round,
   * which is the same reasoning as gen/palette.js's mixHue. */
  function hueBlend(colours, w) {
    var x = 0, y = 0;
    for (var i = 0; i < colours.length; i++) {
      if (w[i] <= 0) continue;
      var r = colours[i].h * Math.PI / 180;
      x += Math.cos(r) * w[i];
      y += Math.sin(r) * w[i];
    }
    if (x === 0 && y === 0) return colours[0].h;
    var deg = Math.atan2(y, x) * 180 / Math.PI;
    return (deg % 360 + 360) % 360;
  }

  return {
    draw: drawSurfaceFilm,
    /* Exported so a harness can ask "which zone wins at this bearing" against
     * the real function rather than reimplementing it. A probe that
     * duplicates the logic it is testing agrees with itself and not with the
     * renderer — which cost a round here, reporting an inverted snowline that
     * had already been fixed. */
    zoneWeights: zoneWeights,
    /* Exported so the seam assertion in test/climate.mjs measures at the real
     * segment period rather than a hardcoded copy of it. SEGMENTS is now purely
     * a SAMPLING rate — the band is painted as whole ribbons, so there is no
     * per-segment fill and no overlap constant to go with it. */
    SEGMENTS: SEGMENTS
  };
})();
