/* The frosting's zones and its deposited top — where each of the four zones
 * lies at a bearing, the smoothed curve the frosting settles to, how a run
 * feathers out at its ends, and the two colour blends the zones meet through.
 *
 * Split out of draw/film.js, which passed the 500-line rule. Attached to
 * CC.Film rather than a namespace of its own, so `CC.Film.zoneWeights` stays
 * where the harnesses already ask for it. draw/film.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

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

  CC.Film.clampUnit = clampUnit;
  CC.Film.smoothstep = smoothstep;
  /* Exported so a harness can ask "which zone wins at this bearing" against
   * the real function rather than reimplementing it. A probe that
   * duplicates the logic it is testing agrees with itself and not with the
   * renderer — which cost a round here, reporting an inverted snowline that
   * had already been fixed. */
  CC.Film.zoneWeights = zoneWeights;
  CC.Film.depositTop = depositTop;
  CC.Film.featherEnds = featherEnds;
  CC.Film.mixColour = mixColour;
  CC.Film.hueBlend = hueBlend;
})();
