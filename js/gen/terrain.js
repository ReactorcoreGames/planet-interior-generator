/* Surface terrain — a generic angular field generator.
 *
 * This is NOT a crust feature. It produces h(angle): a periodic elevation
 * field in body-space units, built from three octave bands plus optional
 * impact craters. Any layer may attach one by declaring `relief` in the
 * archetype. What the field MEANS is the consumer's business:
 *
 *   planet crust        continents, mountain ranges, trenches
 *   moon crust          flat cratered plains  (low band 1, heavy craters)
 *   star photosphere    granulation           (tight, fast, no craters)
 *   gas giant           the buried rocky floor under the envelope
 *   ice-shelled moon    the roof of a subsurface ocean
 *
 * Same generator, different amplitudes — a data table per archetype, never new
 * code. See docs/PROGRESS.md D15.
 *
 * TWO IDEAS CARRY THE WHOLE SYSTEM:
 *
 * 1. THE COASTLINE IS NEVER DRAWN. Terrain and whatever floats on top of it —
 *    water, magma, a gas envelope — are two independent curves. Land is simply
 *    where one rises above the other. That is why Ocean depth produces a dry
 *    world, an Earth-like world, an archipelago and a waterworld with no branch
 *    anywhere: it is moving a level line across a fixed field.
 *
 * 2. THE FIELD IS A FUNCTION OF ANGLE. Phase 4's zoneAt(angle, depth) can
 *    multiply into it directly, so tidal locking and ice caps become amplitude
 *    and sea-level modulations rather than new terrain code.
 *
 * Everything here is body-space. No pixels, no colours, no canvas. */

var CC = CC || {};

CC.Terrain = (function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp, lerp = M.lerp, smoothstep = M.smoothstep;
  var TAU = M.TAU;

  /* How many samples the field is evaluated at around the body.
   *
   * FIXED, not derived from pixel size — the terrain must be the same shape at
   * every resolution, which is the same rule boundary tracing follows. High
   * enough that the third octave band (up to ~90 cycles) is sampled well past
   * Nyquist and reads as crisp rather than aliased. */
  var SAMPLES = 1024;

  /* Default octave bands: [cycles around the body, amplitude share].
   *
   * The three passes are the size-tier idea applied to terrain — a few big
   * landmasses, more mid-scale relief, many small roughness features. Band 3
   * deliberately stops around 90 cycles, which is where the crust's grain
   * speckle takes over, so the two meet without a visible gap in scale. */
  var DEFAULT_BANDS = [
    { cycles: 3,  amp: 1.00 },   /* landmasses  — where continents and basins are */
    { cycles: 13, amp: 0.42 },   /* relief      — ranges, plateau edges, coastline wander */
    { cycles: 52, amp: 0.15 }    /* texture     — roughness, cliffs, crater rims */
  ];

  /* Sample one octave band. The noise is periodic on the circle (sampled
   * around a ring in 2D noise space), so the field closes on itself exactly
   * and there is no seam at angle 0 — the same trick draw/layers.js uses for
   * boundary wobble, and the reason the two compose cleanly. */
  function bandField(seed, band, out) {
    var n = CC.RNG.makeAngularNoise(seed, Math.max(0.6, band.cycles * 0.28));
    for (var i = 0; i < SAMPLES; i++) {
      out[i] += n((i / SAMPLES) * TAU, 2) * band.amp;
    }
  }

  /* Impact craters: negative circular bumps stamped into the field.
   *
   * A crater is a rim (raised) around a floor (depressed), which is what makes
   * it read as an impact rather than as a dent. Cheap, and it is the single
   * ingredient that turns a planet's terrain profile into a moon's — a moon
   * declares low band-1 amplitude and a high crater count and needs nothing
   * else. Craters are placed by ANGLE, so they survive into Phase 4's zones. */
  function stampCraters(field, rng, spec) {
    var count = spec.count === undefined ? 0 : spec.count;
    if (count <= 0) return;

    var sizeLo = spec.size ? spec.size[0] : 0.02;
    var sizeHi = spec.size ? spec.size[1] : 0.10;
    var depth = spec.depth === undefined ? 0.55 : spec.depth;

    for (var c = 0; c < count; c++) {
      /* Size tiers apply here too: most craters are small, a few are basins.
       * Cubing the roll biases hard toward the small end, which is what real
       * cratered surfaces look like and what keeps a high count from turning
       * the profile into uniform corrugation. */
      var t = rng(); t = t * t * t;
      var halfWidth = lerp(sizeLo, sizeHi, t);          /* in turns, 0..1 */
      var centre = rng();                                /* in turns */
      var deep = depth * lerp(0.55, 1.0, rng());

      var span = Math.ceil(halfWidth * SAMPLES) + 2;
      var mid = Math.round(centre * SAMPLES);

      for (var k = -span; k <= span; k++) {
        var idx = ((mid + k) % SAMPLES + SAMPLES) % SAMPLES;
        var d = Math.abs(k) / (halfWidth * SAMPLES);     /* 0 at centre, 1 at rim */
        if (d > 1.25) continue;

        if (d <= 1) {
          /* Bowl floor: a smooth depression, flattest in the middle. */
          field[idx] -= deep * (1 - d * d) * 0.9;
        }
        /* Raised rim just outside the bowl, fading outward. */
        if (d > 0.72) {
          var rim = 1 - Math.abs(d - 0.95) / 0.30;
          if (rim > 0) field[idx] += deep * rim * 0.34;
        }
      }
    }
  }

  /* Erosion: a smoothing pass weighted by how much atmosphere the body has.
   *
   * A thick-atmosphere world gets rounded, softened terrain; an airless one
   * keeps sharp ridges and crisp crater rims. Six lines of array work, and it
   * makes the atmosphere structural rather than only a coloured halo. */
  function erode(field, amount) {
    if (amount <= 0) return;
    var passes = Math.min(6, Math.round(amount * 6));
    var tmp = new Float64Array(SAMPLES);
    for (var p = 0; p < passes; p++) {
      for (var i = 0; i < SAMPLES; i++) {
        var a = field[(i - 1 + SAMPLES) % SAMPLES];
        var b = field[i];
        var c = field[(i + 1) % SAMPLES];
        tmp[i] = (a + b * 2 + c) / 4;
      }
      field.set(tmp);
    }
  }

  /* Sharpen the profile into landforms.
   *
   * Raw fBm reads as bland rolling noise. A power curve applied around the
   * midpoint flattens the low ground into plains and steepens the transitions,
   * which is what produces mesas, plateau edges and genuine coastlines rather
   * than a continuous wobble. This is the lever to reach for if terrain looks
   * like noise instead of landforms — NOT new feature types (D15). */
  function sharpen(field, amount) {
    if (amount <= 0) return;
    var k = 1 + amount * 1.6;
    for (var i = 0; i < SAMPLES; i++) {
      var v = clamp(field[i], -1, 1);
      var s = v < 0 ? -1 : 1;
      field[i] = s * Math.pow(Math.abs(v), k);
    }
  }

  /* Normalize the field to roughly -1..1 so authored amplitudes mean the same
   * thing regardless of how the octaves happened to stack up. Without this,
   * changing the band mix silently changes the terrain's height. */
  function normalize(field) {
    var lo = Infinity, hi = -Infinity, i;
    for (i = 0; i < SAMPLES; i++) {
      if (field[i] < lo) lo = field[i];
      if (field[i] > hi) hi = field[i];
    }
    var range = hi - lo;
    if (range < 1e-9) {
      for (i = 0; i < SAMPLES; i++) field[i] = 0;
      return;
    }
    for (i = 0; i < SAMPLES; i++) {
      field[i] = ((field[i] - lo) / range) * 2 - 1;      /* -1 .. 1 */
    }
  }

  /* Build a terrain field.
   *
   * `spec` is the layer's `relief` declaration:
   *
   *   bands     [{cycles, amp}, ...]  octave mix; defaults to DEFAULT_BANDS
   *   amplitude number                peak-to-trough height, in body-space
   *   craters   {count, size, depth}  optional impact cratering
   *   erosion   0..1                  smoothing; usually driven by atmosphere
   *   sharpen   0..1                  plains-and-cliffs curve
   *
   * `key` names the RNG stream. Keyed to IDENTITY (seed + layer role), never
   * to position in a list, so adding or removing a layer can never reshape
   * another layer's terrain. This is the trap that produced two separate
   * visible bugs in Phase 2 — see PROGRESS.md D12. */
  function build(spec, seed, key) {
    spec = spec || {};

    var field = new Float64Array(SAMPLES);
    var bands = spec.bands || DEFAULT_BANDS;

    /* Each band gets its own noise stream, so changing one band's amplitude
     * does not reshuffle the others. */
    for (var b = 0; b < bands.length; b++) {
      bandField(CC.RNG.hashString(String(seed) + " terrain " + key + " band" + b),
                bands[b], field);
    }

    normalize(field);

    if (spec.craters) {
      stampCraters(field, CC.RNG.stream(seed, "terrain/" + key + "/craters"),
                   spec.craters);
      normalize(field);
    }

    erode(field, spec.erosion === undefined ? 0 : spec.erosion);
    sharpen(field, spec.sharpen === undefined ? 0 : spec.sharpen);
    normalize(field);

    var amplitude = spec.amplitude === undefined ? 0.03 : spec.amplitude;

    /* THE ZONE HOOK — a per-angle amplitude multiplier.
     *
     * This is the payoff D15 predicted: because the field is already a pure
     * function of angle, an angular zone modulates it by multiplying in here,
     * and nothing downstream changes. draw/layers.js calls `at()` exactly as
     * before, so a molten dayside with flattened relief and a frozen nightside
     * with sharpened relief need NO new drawing code.
     *
     * Deliberately a general multiplier rather than a tidal-locking special
     * case (PROGRESS.md D22): any archetype's zone recipe drives it, and a
     * second consumer is a data edit.
     *
     * Null on an unzoned body, so the common path costs one comparison. */
    var ampAt = spec.ampAt || null;

    /* Sample the field at an arbitrary angle, interpolating between stored
     * samples. Angles wrap, so callers never have to normalize. */
    function raw(angle) {
      var t = (angle / TAU) % 1;
      if (t < 0) t += 1;
      var x = t * SAMPLES;
      var i0 = Math.floor(x) % SAMPLES;
      var i1 = (i0 + 1) % SAMPLES;
      var f = x - Math.floor(x);
      return lerp(field[i0], field[i1], f);
    }

    /* Amplitude at an angle. Kept as its own function because `range()` has to
     * account for it too: a zone that flattens one face lowers that face's
     * peaks, and a caller placing a sea level against the range would
     * otherwise be working from a height the terrain no longer reaches. */
    function ampFor(angle) {
      return ampAt ? amplitude * ampAt(angle) : amplitude;
    }

    return {
      samples: SAMPLES,
      field: field,
      amplitude: amplitude,
      zoned: !!ampAt,

      /* Elevation at an angle, in body-space units. Signed: 0 is the mean
       * surface, positive is high ground. */
      at: function (angle) { return raw(angle) * ampFor(angle) * 0.5; },

      /* The raw -1..1 field, for callers that want the shape without the
       * height — shading, detail density, material selection. */
      norm: raw,

      /* Highest and lowest points, so a caller can place a level line in
       * meaningful terms rather than guessing.
       *
       * MEASURED THROUGH THE ZONE MULTIPLIER, not from the raw field. A zone
       * that flattens one face genuinely lowers that face's peaks, and a
       * caller placing a sea level against an unzoned range would be working
       * from a height the terrain no longer reaches — the sea would sit above
       * the whole dayside. Sampling the same function `at()` uses keeps the
       * two in agreement by construction. */
      range: function () {
        var lo = Infinity, hi = -Infinity;
        for (var i = 0; i < SAMPLES; i++) {
          var v = field[i] * (ampAt ? amplitude * ampAt((i / SAMPLES) * TAU)
                                    : amplitude) * 0.5;
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
        return { lo: lo, hi: hi };
      }
    };
  }

  /* A level line across a terrain field — the second half of the "coastline is
   * a crossing" idea.
   *
   * `fill` runs 0..1: 0 puts the level below every trough (nothing covered,
   * a dry world), 1 puts it above every peak (everything covered, a
   * waterworld). Everything interesting is in between, and it is one number
   * rather than a set of cases:
   *
   *   0.00  dry        mesas and ridges, all exposed
   *   0.35  Earth-like continents with real coastlines and shelves
   *   0.75  archipelago a few peaks above a global sea
   *   1.00  waterworld  varied seafloor, fully submerged
   *
   * Returns the level in the same body-space units as `terrain.at()`, plus a
   * predicate for whichever side of it the caller cares about. */
  function level(terrain, fill) {
    var r = terrain.range();

    /* A little headroom past each end, so fill=0 genuinely exposes the lowest
     * trough and fill=1 genuinely drowns the highest peak rather than leaving
     * a hairline of each. */
    var pad = (r.hi - r.lo) * 0.06 + 1e-6;
    var y = lerp(r.lo - pad, r.hi + pad, clamp(fill, 0, 1));

    return {
      y: y,
      /* Is this angle above the level line — land, or an exposed peak? */
      above: function (angle) { return terrain.at(angle) > y; },
      /* How far above or below, normalized by the field's own range. Lets a
       * caller fade a shoreline or deepen an abyss without re-deriving the
       * scale. */
      depth: function (angle) {
        var span = Math.max(1e-6, r.hi - r.lo);
        return (terrain.at(angle) - y) / span;
      }
    };
  }

  return {
    SAMPLES: SAMPLES,
    DEFAULT_BANDS: DEFAULT_BANDS,
    build: build,
    level: level
  };
})();
