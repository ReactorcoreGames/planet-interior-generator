/* The climate field — surface temperature as a function of bearing.
 *
 * THE FIELD EVERY BODY HAS. gen/zones.js grew a `tempAt` for tidal locking
 * (D35) and it worked, but `Zones.build` returns null when the dial is at zero
 * — so an ordinary rotating planet had no thermal structure at all. It could
 * never grow a polar cap, its sea could never freeze, and the frosting's
 * `frostPeak` zone was mathematically unreachable on 100% of unzoned worlds
 * (D36). "Where is it cold" was a question with no answer.
 *
 * So the thermal field is generalised here from "a thing tidal locking has"
 * into "a thing every body has", with locking as ONE contributor among
 * several:
 *
 *     Climate.build(...)  ->  a field, always
 *         baseline    Starlight + Interior heat, neither dominating
 *         latitude    |cos(angle)| — the poles are colder than the equator
 *         zone        the tidal-lock axis, when the dial is up
 *
 * WHAT IT EXPOSES, and it is deliberately the same shape gen/zones.js already
 * offered, so the existing consumers keep working and simply start receiving a
 * field where they used to receive null:
 *
 *     tempAt(angle)          surface temperature 0..1
 *     surfaceStateAt(angle)  "boiled" | "hot" | "temperate" | "cold" | "frozen"
 *     isFrozen(angle)        below the freezing line
 *     isBoiling(angle)       above the boiling line
 *     snowShiftAt(angle)     how far the snowline moves here, in terrain-range
 *                            units — what makes a cap EMERGE
 *
 * THREE RULES THIS FILE OBEYS.
 *
 * 1. CAPS EMERGE FROM DEPOSITION; THEY ARE NEVER DRAWN. D27 cut `ice-caps` as
 *    a trait precisely because "a wedge could only ever be a polygon laid on
 *    top of the terrain". There is no cap primitive here and there must never
 *    be one: this file lowers a SNOWLINE, and draw/film.js's existing four-zone
 *    deposition model does the rest — pooling in valleys, thinning on ridges.
 *
 * 2. A HOT WORLD GETS NO CAPS BECAUSE OF ARITHMETIC, NOT A RULE. The polar
 *    term is subtracted from the baseline and the result is clamped; a Venus
 *    is above freezing everywhere, so nothing switched the feature off — there
 *    was simply never any ice to place. That is the same "emerges rather than
 *    painted" principle one level up.
 *
 * 3. CLIMATE IS ARCHETYPE-DECLARED. A body whose archetype declares no
 *    `climate` spec gets a flat field at its own baseline, so a star or a gas
 *    giant can never inherit a polar cap by accident.
 *
 * WHERE THIS RUNS. In the GENERATION stage, beside the zone field. `draw/`
 * receives plain functions of angle and never learns what a climate is, which
 * is the same contract zones have had since D23.
 *
 * ANGLES ARE THE RENDERER'S: angle 0 is UP, increasing clockwise (`view.at`).
 * That is what makes `|cos(angle)|` latitude — the vertical extremes of the
 * disc are the poles and the horizontal extremes are the equator. A probe
 * using the standard cos/sin convention will report the body rotated 90° and
 * call a correct field wrong; the same trap D30 records.
 *
 * Loaded after gen/zones.js, whose field it composes.
 *
 * AFTER THE SPLIT (Session AL) the baseline, the star's term and the subsurface
 * are in gen/climate-baseline.js, which attaches here and loads straight after
 * this file. */

var CC = CC || {};

CC.Climate = (function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp, lerp = M.lerp, smoothstep = M.smoothstep;

  /* ---- the surface-state thresholds ------------------------------------ */

  /* Named bands rather than numbers, because the consumers are text and
   * colour rather than geometry — an info card wants "boiled away", not 0.87.
   * Deliberately wide: the interesting reading is which BAND a bearing is in,
   * and a hairline between two would make the label flicker between
   * neighbouring bearings.
   *
   * These are the D35 thresholds unchanged. gen/zones.js keeps its own copy
   * for the zone-only path; both read from here so the two can never drift.
   * HAZARDS.md documents the table. */
  var BOILING = 0.82;
  var HOT = 0.62;
  var TEMPERATE = 0.34;
  var COLD = 0.18;

  function stateOf(t) {
    if (t >= BOILING) return "boiled";
    if (t >= HOT) return "hot";
    if (t >= TEMPERATE) return "temperate";
    if (t >= COLD) return "cold";
    return "frozen";
  }

  /* ---- the latitude term ----------------------------------------------- */

  /* HOW MUCH COLDER THE POLES ARE THAN THE EQUATOR.
   *
   * Gated by the baseline, and that gate is the whole reason Venus and Mercury
   * stay correct. On a cold or temperate world the poles get the full drop and
   * caps appear; on a hot one the drop shrinks, so the poles are merely LESS
   * scorched and never reach freezing. Nothing switched a feature off — the
   * arithmetic simply never produced any ice.
   *
   * A fraction of the drop always survives, so a hot world still reads as
   * having a cooler pole. Removing it entirely would make a seared world
   * perfectly uniform, which is less interesting and no more true. */
  var POLAR_DROP = 0.34;

  /* The mean of |cos| over a full turn, which is what the latitude term is
   * centred on so it redistributes heat rather than removing it. Stated as the
   * closed form rather than as 0.6366, because the number is not a tuning
   * constant — it is a property of the function, and rounding it would put a
   * slow drift into the baseline that no test would attribute correctly. */
  var LAT_MEAN = 2 / Math.PI;

  /* ---- the snowline mapping -------------------------------------------- */

  /* Temperature -> snowline offset, in terrain-range units.
   *
   * THE NUMBERS ARE CALIBRATED AGAINST WHAT film.js ALREADY MEASURES.
   * `SNOWLINE` there is 0.42 above sea level, and D36 established that a dry
   * world's peaks reach roughly 0.27 above the level line — so a temperate
   * world needs the line pulled down by a few tenths before a mountain top
   * catches snow, and a frozen one needs it dragged below the waterline before
   * ice reaches the sea. The locked world's recipe asks for -1.10 on its night
   * face, which is the same scale.
   *
   * SNOW_HIGH is positive: on a warm bearing the line goes UP, out of reach,
   * so a hot world's high ground is bare rock rather than lightly dusted. */
  var SNOW_HIGH = +0.55;
  var SNOW_LOW = -1.05;

  /* The temperature band over which the line falls. Above SNOW_WARM nothing
   * freezes; below SNOW_COLD everything has.
   *
   * SNOW_WARM SITS WELL UP INSIDE THE TEMPERATE BAND, AND THAT IS THE POINT.
   * Earth is a temperate world by every reading here — its mean sits mid-band
   * — and it has permanent polar caps. So "cold enough to hold snow" has to
   * start while a bearing is still nominally temperate, or the only worlds
   * with caps are the ones that are frozen all over, which is the opposite of
   * what the feature is for.
   *
   * Measured directly: at the default settings the poles sit at 0.387 and the
   * equator at 0.726. A SNOW_WARM of 0.52 put the snowline at +0.37 over
   * terrain sitting at -0.49, so the default world grew nothing at all while a
   * slightly dimmer one grew textbook caps — a feature that worked everywhere
   * except at the setting most people would first see. 0.62 is the top of the
   * temperate band, so the line begins falling the moment a bearing stops
   * being warm. */
  var SNOW_WARM = 0.62;
  var SNOW_COLD = 0.22;

  /* And the scorched band, which is the same idea at the other end. Starts
   * where a bearing stops being temperate and completes where it boils. */
  var BURN_COOL = 0.62;
  var BURN_HOT = 0.92;

  function polarDropFor(base) {
    var hotGate = 1 - smoothstep(0, 1, (base - 0.50) / 0.45) * 0.66;

    /* AND THERE MUST BE HEAT TO REDISTRIBUTE.
     *
     * The latitude term is centred, so it ADDS at the equator as much as it
     * takes at the poles (see `tempAt`) — which is right on any world with a
     * heat budget, and wrong at the very bottom of the range. On a body in the
     * deep void, baseline 0.04, the equator was lifted to 0.256: above the
     * freezing line, so a world with NO star and a DEAD core kept an unfrozen
     * equatorial band and its ocean never froze through. Redistribution had
     * invented heat that does not exist.
     *
     * The drop therefore eases out as the baseline approaches the floor. A
     * world with nothing to move around is uniformly cold, which is both
     * correct and the better picture: the deep-void case should read as
     * totally, evenly dead. */
    /* Measured against the FREEZING LINE rather than an arbitrary small
     * number: below `COLD` there is no liquid anywhere to redistribute heat
     * with, and above it the ordinary gradient should be back at full
     * strength. Squared, so the gate closes hard at the very bottom — a world
     * at the temperature floor comes out uniformly dead rather than keeping a
     * warmer equatorial band. */
    var coldGate = smoothstep(0, 1, base / COLD);
    coldGate = coldGate * coldGate;

    return POLAR_DROP * hotGate * coldGate;
  }

  /* ---- build ----------------------------------------------------------- */

  /* Build the climate field for a body.
   *
   * `archetype` declares whether it has a climate at all (see rule 3);
   * `zones` is the already-built tidal-lock field, or null.
   *
   * ALWAYS RETURNS A FIELD. That is the point of the whole file — unlike
   * `Zones.build`, there is no null path, because "this body has no
   * temperature" is what produced the dead snow zone in the first place. */
  function build(archetype, body, params, seed, zones) {
    params = params || {};

    var spec = (archetype && archetype.climate) || null;

    var base = CC.Climate.baseline(params, spec);

    /* The body's SECOND temperature, or null if it has only one. See
     * `subsurfaceOf` — this is a scalar rather than a function of angle on
     * purpose: an insulated ocean is the one part of a body with no latitude
     * to it, because the lid is what removes the sky. */
    var subsurface = CC.Climate.subsurfaceOf(params, spec, body);

    /* AN ARCHETYPE WITHOUT A CLIMATE SPEC GETS A FLAT FIELD.
     *
     * A star or a gas giant inheriting a polar cooling term would be nonsense,
     * and the mitigation the plan asked for is exactly this: climate is
     * declared, like `axes`, and an undeclared body gets its baseline at every
     * bearing. It still HAS a field — every consumer can ask — it simply has
     * no angular structure of its own. */
    var latitude = spec ? (spec.latitude === undefined ? 1 : spec.latitude) : 0;

    /* Axial tilt: at 0 the two caps are symmetric; turned up one grows and the
     * other shrinks, and at the extreme the poles become the WARM regions —
     * an Uranus-like world from one parameter. Rolled per body when the user
     * has not aimed it, for the same reason the lock's facing is. */
    var tilt = params.axialTilt === undefined ? 0 : clamp(params.axialTilt, 0, 1);

    var drop = polarDropFor(base) * latitude;

    /* HOW VIOLENT THE STAR IS — flares, wind, hard radiation.
     *
     * DELIBERATELY NOT A TEMPERATURE TERM, and this is the one thing about
     * this control that must not drift: an active star is not necessarily a
     * hot one, and folding activity into the baseline would make it a second
     * Starlight slider with a different label. It appears nowhere in `base`.
     * It scours cover, drives the hazard rating, and (with Exotic oceans on)
     * pushes the sea's colour — three things, none of them heat.
     *
     * An unlit world has no star to be active, so this eases out with
     * Starlight for the same reason the palette's star cast does.
     *
     * EXCEPT ON A BODY THAT IS ITS OWN STAR. `starlit: false` says the body is
     * not warmed by some OTHER star, and the easing above asks about exactly
     * that other star — so on a stellar body it was reading the wrong object's
     * distance and dragging Starlight down to zero left a star with no
     * activity at all. On a star, Star activity is a fact about THIS body and
     * has nothing to distance itself from.
     *
     * This is the "one control, two consumers" rule of the stellar phase held
     * to honestly: it is the same quantity on both sides, and the difference
     * is only in whether there is a gap between the star and the thing being
     * described. Reading the existing declaration rather than adding a second
     * flag is what keeps it one axis (D27). */
    var selfLit = !!(spec && spec.starlit === false);
    var activity = clamp(params.starActivity === undefined ? 0.3
                         : params.starActivity, 0, 1);
    if (!selfLit) {
      activity *= clamp((params.starlight === undefined ? 0.55
                         : params.starlight) / 0.35, 0, 1);
    }

    /* HOW MUCH ATMOSPHERE STANDS BETWEEN THE STAR AND THE GROUND.
     *
     * Read off the BUILT STACK rather than from a parameter, so it stays true
     * however the atmosphere came to be there — the same rule gen/details-terrain.js
     * follows for erosion. An airless world is fully exposed; a thick envelope
     * shields almost completely, which is what makes activity interesting
     * rather than a flat penalty on every world. */
    var shield = 0;
    if (body && body.layers) {
      for (var li = 0; li < body.layers.length; li++) {
        if (body.layers[li].outward) {
          shield = clamp((body.layers[li].outer - body.surface) / 0.13, 0, 1)
                 * (body.layers[li].strength === undefined
                    ? 1 : body.layers[li].strength);
          break;
        }
      }
    }

    /* THE SUM, AT ONE BEARING.
     *
     * Three contributors, additive, then clamped. `polarity` is 1 at the poles
     * (up and down) and 0 at the equator (left and right) — which is available
     * for free because the body is drawn pole-up, and which nothing used
     * before this. */
    function tempAt(angle) {
      var c = Math.cos(angle);
      var polarity = Math.abs(c);

      /* AXIAL TILT MAKES THE TWO POLES DIFFER, and past the midpoint it
       * inverts the field entirely.
       *
       * Below 0.5 it is a seasonal snapshot: the pole the axis leans toward
       * warms and the other cools, so one cap grows while the other shrinks.
       * Past it the whole latitude term rolls over, so the poles take the
       * heat and the equator freezes — the Uranus case, and a genuinely
       * different picture out of one number. */
      var lat = polarity;
      if (tilt > 0) {
        /* The seasonal asymmetry: signed by which pole, scaled by the tilt. */
        var season = c * tilt * 0.9;
        lat = clamp(polarity - season, 0, 1);
        /* Past halfway the poles and the equator trade places. */
        var flip = smoothstep(0, 1, (tilt - 0.5) / 0.45);
        lat = lerp(lat, 1 - lat, flip);
      }

      /* LATITUDE REDISTRIBUTES HEAT; IT DOES NOT REMOVE IT.
       *
       * Subtracting the polar term outright was the first version and it was
       * wrong in a way only the numbers showed: `|cos|` averages 2/pi, so a
       * plain subtraction cools the WHOLE body by about two thirds of the
       * drop. A rogue world with a molten core came out with a baseline of
       * 0.38 and a mean of 0.16 — frozen, which is precisely the case the plan
       * says must read as warm. Starlight's own reading was dragged down the
       * same way, so the default world read as cold.
       *
       * Physically the poles are cold because the equator got the light, not
       * because the light went missing. So the term is centred: it is measured
       * against the mean of `|cos|` and adds as much at the equator as it
       * takes at the poles. `base` then stays the body's mean temperature at
       * every setting, which is what makes the baseline arithmetic mean
       * anything at all downstream. */
      var t = base + drop * (LAT_MEAN - lat);

      /* THE ZONE TERM, folded in as one more contributor rather than replacing
       * anything. `zones.tempAt` already perturbs a base by the recipe's
       * per-face `temp`, so it is handed the latitude-adjusted value and the
       * two compose: a locked world grows polar caps on top of its night cap,
       * which is physically fine and is what the plan's risk table asked to be
       * checked. */
      if (zones && zones.tempAt) t = zones.tempAt(angle, t);

      return clamp(t, 0, 1);
    }

    function surfaceStateAt(angle) { return stateOf(tempAt(angle)); }
    function isFrozen(angle) { return tempAt(angle) < COLD; }
    function isBoiling(angle) { return tempAt(angle) >= BOILING; }

    /* HOW MUCH SURFACE COVER SURVIVES HERE — a multiplier on the frosting's
     * quantity, never on its colour. The zone field already has a `coverAt`
     * with exactly this meaning ("a scoured dayside is bare rock, which is a
     * statement about quantity"); this is the same figure driven by the star
     * rather than by the lock, and the two multiply.
     *
     * TWO CAUSES, BOTH SUBTRACTIVE.
     *
     * 1. STAR ACTIVITY. A violent star strips ground cover: hard radiation and
     *    stellar wind scour a surface that has little atmosphere to hide
     *    behind. Which is the second cause's whole point — the shielding is
     *    what makes this interesting rather than a flat penalty.
     *
     * 2. TEMPERATURE. Nothing grows on a face that is boiling, and a frozen
     *    one keeps whatever it has under ice rather than losing it. So the
     *    scouring bites at the hot end and eases at the cold.
     *
     * NOT A COLOUR CHANGE. The frosting decides WHAT the material is from
     * temperature (D35) and WHICH zone from elevation; this decides only
     * whether there is any. Keeping the three separate is what stopped a hot
     * face reading as "a world with less grass" instead of a burnt one. */
    function coverAt(angle) {
      if (activity <= 0) return 1;

      /* Air shields the ground. `shield` runs 0 (airless, fully exposed) to 1
       * (a thick envelope), read from the built stack rather than from a
       * parameter so it stays true however the atmosphere came to be there —
       * the same reasoning gen/details-terrain.js's erosion figure uses. */
      var exposure = 1 - shield;
      var t = tempAt(angle);

      /* Hot ground has nothing holding on; cold ground is under ice. */
      var vulnerable = 0.45 + smoothstep(0, 1, (t - 0.35) / 0.45) * 0.55;

      return clamp(1 - activity * exposure * vulnerable * 0.55, 0.05, 1);
    }

    /* HOW BADLY IRRADIATED THE SURFACE IS, 0..1. For the hazard text, which is
     * the other thing Star activity was specified to drive. Same two terms as
     * the scouring — a violent star behind a thick atmosphere is survivable
     * and the same star over an airless rock is not — so the number the card
     * quotes and the cover the picture shows cannot disagree. */
    function radiationHazard() {
      return clamp(activity * (0.25 + (1 - shield) * 0.75), 0, 1);
    }

    /* HOW FAR THE SNOWLINE MOVES AT THIS BEARING — the field that makes caps
     * emerge, and the only one draw/film.js needs.
     *
     * Signed, in units of the terrain's own range, exactly as the zone
     * recipe's `snow` already is, so the two are directly comparable and are
     * simply added. Negative drags the snowline down toward the sea and below
     * it; positive pushes it out of reach.
     *
     * DRIVEN BY TEMPERATURE, NEVER BY ELEVATION. Conflating the two is the bug
     * D27 records — lowering sea level makes terrain read as high ground, and
     * high ground is where snow goes, so a baked face came out snowcapped.
     * How cold it is and how high it is are different facts. */
    function snowShiftAt(angle) {
      return lerp(SNOW_HIGH, SNOW_LOW, chillAt(angle));
    }

    /* HOW WINTRY THIS BEARING IS, 0..1 — and this is the ONE figure that both
     * the snowline and the ice COLOUR must read.
     *
     * They were two separate thresholds and they disagreed, which produced a
     * cap that was placed as snow and painted as vegetation: a temperate
     * world's pole sat at 0.32, below the snowline's band so the geometry gave
     * it a cap, but above the colour ramp's 0.34 so the material stayed the
     * family hue. Measured, the cap came out mauve at s0.31 v0.74 — a cap
     * shape in ground-cover colours, which is exactly the failure D35 exists
     * to prevent, reappearing because a second threshold had been introduced
     * for the same physical fact.
     *
     * One question, one answer: wherever there is snow, there is ice. Above
     * SNOW_WARM the snowline is out of reach so nothing is deposited and the
     * colour never matters; below SNOW_COLD everything is frozen through. */
    function chillAt(angle) {
      return smoothstep(0, 1, (SNOW_WARM - tempAt(angle)) / (SNOW_WARM - SNOW_COLD));
    }

    /* HOW SCORCHED THIS BEARING IS, 0..1 — the other half of the same idea.
     * A baked face is not merely less covered, its ground is burnt: dark,
     * desaturated, ashen rather than vegetated. */
    function scorchAt(angle) {
      return smoothstep(0, 1, (tempAt(angle) - BURN_COOL) / (BURN_HOT - BURN_COOL));
    }

    /* Sampled summary, for text and for the tests. Lives in
     * gen/climatesummary.js — describing the field and shaping it are separate
     * concerns, and this file is about the picture. Read off the same `tempAt`
     * the frosting colours itself from, so a card can never contradict the
     * render (HAZARDS.md's standing rule). */
    function summarise() {
      return CC.ClimateSummary.build(self, stateOf, base, activity, shield);
    }

    var self = {
      base: base,
      /* The second temperature, or null. Read by the card, which must state
       * both without contradicting itself, and by the frosting, which paints
       * an accreted underside as ice regardless of how cold the sky is. */
      subsurface: subsurface,
      subsurfaceLayer: (spec && spec.subsurface && spec.subsurface.layer) || null,
      /* How much of the field is the body's own vs. the zone's, so a harness
       * can attribute a reading rather than guessing. */
      polarDrop: drop,
      tilt: tilt,
      zoned: !!(zones && zones.tempAt),
      activity: activity,
      shield: shield,
      tempAt: tempAt,
      surfaceStateAt: surfaceStateAt,
      isFrozen: isFrozen,
      isBoiling: isBoiling,
      snowShiftAt: snowShiftAt,
      /* The single wintry/scorched figures. draw/film.js blends its three
       * frosting colour sets with exactly these, so the material a bearing is
       * made of and the material the snowline placed there can never disagree. */
      chillAt: chillAt,
      scorchAt: scorchAt,
      coverAt: coverAt,
      radiationHazard: radiationHazard,
      summarise: summarise
    };

    return self;
  }

  return {
    build: build,
    stateOf: stateOf,
    polarDropFor: polarDropFor,
    /* Re-exported so callers and harnesses keep ONE import site for "what is
     * a blue giant", even though the table itself lives in data/stars.js. */
    STARS: (CC.Stars ? CC.Stars.STARS : {}),
    starIds: function () { return CC.Stars ? CC.Stars.ids() : []; },
    BOILING: BOILING,
    HOT: HOT,
    TEMPERATE: TEMPERATE,
    COLD: COLD,
    SNOW_HIGH: SNOW_HIGH,
    SNOW_LOW: SNOW_LOW
  };
})();
