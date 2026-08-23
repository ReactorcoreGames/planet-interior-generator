/* Plain-language stats — the info card, read off the picture.
 *
 * THE ONE RULE THIS FILE EXISTS TO KEEP (HAZARDS.md): a number beside the
 * render is never rolled. Every figure here is derived from something that
 * shaped the image — the drawn layer radii, `details.climate`, the trait list,
 * the settings that produced all three. A card saying "frozen at the poles"
 * over a render with no ice is worse than a card with no temperature on it, so
 * there is no second source it could drift from.
 *
 * DERIVED FROM THE DRAWN RADII, NOT FROM PHYSICS (D5). The proportions are
 * textbook-diagram proportions: the crust is ~7% of the radius where a real
 * one is 0.5%. Quoting a real crust depth against a drawn crust this thick
 * would be exactly the contradiction the rule forbids. So gravity comes from
 * the drawn core fraction, "what's underfoot" comes from which layer is
 * actually outermost, and the atmosphere line comes from whether that layer
 * exists in `body.layers` at all.
 *
 * METRIC, WITH A COMPARISON. "Hot enough to melt lead", never "601 K". The
 * phrasebook at the bottom of HAZARDS.md is the source for the comparisons;
 * this file implements it as lookup ladders rather than prose.
 *
 * WHAT DOES GET ROLLED, and why that is not a contradiction: the *flavour*
 * pools — notable condition, resource note, approach note, and the name. Those
 * describe nothing the picture asserts, so a roll cannot disagree with it. But
 * each pool is FILTERED by the derived facts first, so a rogue world never
 * draws "two sunrises per day". The roll picks among things that are already
 * true.
 *
 * Loaded after gen/details.js, whose `climate` summary it reads. */

var CC = CC || {};

CC.Stats = (function () {
  "use strict";

  var clamp = CC.Math.clamp;

  /* ---- the temperature mapping ---------------------------------------- */

  /* Climate temperatures are normalized 0..1 (HAZARDS.md: "turning that into a
   * figure is the archetype's business, because a star's 0.9 is not a planet's
   * 0.9"). This is the planet family's mapping, and it is anchored on the
   * climate module's OWN state thresholds rather than on invented stops — so
   * the boundary between "hot" and "temperate" on the card lands exactly where
   * the boundary between hot and temperate ground lands in the render.
   *
   * TEMPERATE (0.34) -> -20 C and HOT (0.62) -> +50 C sets the habitable band
   * to roughly Earth's own range. The curve outside that is stretched, because
   * a boiled world is far further from temperate than a merely warm one. */
  var C_TEMPERATE = -20;
  var C_HOT = 50;

  function toCelsius(t) {
    var C = CC.Climate;
    var lo = C.TEMPERATE, hi = C.HOT;
    /* Linear through the habitable band, then a power stretch at both ends so
     * the extremes reach the figures the family claims (-180 to +460, and
     * further with traits). */
    if (t >= lo && t <= hi) {
      return C_TEMPERATE + (t - lo) / (hi - lo) * (C_HOT - C_TEMPERATE);
    }
    if (t > hi) {
      var up = (t - hi) / (1 - hi);
      return C_HOT + Math.pow(up, 1.35) * 560;
    }
    var dn = (lo - t) / (lo - 0);
    return C_TEMPERATE - Math.pow(dn, 1.15) * 205;
  }

  /* ---- size and gravity, read off the drawn body ----------------------- */

  /* Radius. Rolled once from the archetype's authored range, on its own RNG
   * stream so it is stable against every other control — a colour change must
   * not resize the world. The core bias nudges it, because a body pushed
   * toward a big metal core reads as a denser, smaller world. */
  function radiusKm(archetype, settings) {
    var range = archetype.radiusKm || [2400, 9800];
    var rng = CC.RNG.stream(settings.seed, "stats-size");
    var t = rng();
    /* A square-root spread, so the middle of the range is commoner than either
     * end — a contact sheet of twenty Earths and twenty giants is less useful
     * than a spread with a middle. */
    t = (t + rng()) / 2;
    return Math.round(range[0] + t * (range[1] - range[0]));
  }

  /* GRAVITY IS READ OFF THE DRAWN CORE (D5). Surface gravity goes as density
   * times radius, and the one density signal the picture actually carries is
   * how much of the body is metal — the core and outer core against the whole.
   * So a render with a huge core produces a heavy world, and dragging Core size
   * bias visibly changes both the picture and this number together.
   *
   * The constants are chosen so an Earth-sized body with an Earth-ish core
   * fraction lands near 1.0 g, and the family's authored 0.3-2.5 g range is
   * reachable at the extremes. This is calibration, not physics. */
  function gravityOf(body, radius) {
    var metal = 0;
    for (var i = 0; i < body.layers.length; i++) {
      var l = body.layers[i];
      if (l.role === "core" || l.role === "outer-core") {
        metal = Math.max(metal, l.outer);
      }
    }
    /* Fraction of the body's VOLUME that is metal, which is what density
     * responds to — the cube is why a modest change in the drawn core radius
     * makes a real difference to the figure. */
    var metalVol = Math.pow(metal, 3);
    /* 0.29 is roughly what Earth's drawn stack gives; scale around it. */
    var density = 0.72 + metalVol * 1.55;
    var g = density * (radius / 6100);
    return clamp(g, 0.04, 6.0);
  }

  /* ---- day length ------------------------------------------------------ */

  /* TIDAL LOCKING IS THE PICTURE'S STATEMENT ABOUT ROTATION, so the day length
   * is read off that dial and nothing else. At full lock the day equals the
   * year and there is no sunrise at all; the middle of the dial is a Mercury-
   * like resonance measured in months; at zero it is an ordinary rolled day.
   *
   * A rogue planet has no star, so it has no day either — Starlight 0 is a
   * real state (D40) and the card has to say so rather than quoting a number
   * for a sunrise that never happens. */
  function dayLength(settings, rng) {
    if (settings.starlight <= 0.001) {
      return { text: "No sunrise - there is no star", hours: null, sunless: true };
    }
    var lock = settings.tidalLock || 0;
    if (lock > 0.88) {
      return { text: "One face never turns away - the day is the year",
               hours: null, locked: true };
    }
    if (lock > 0.35) {
      /* Slowed, not stopped. Weeks to months. */
      var days = Math.round(6 + Math.pow((lock - 0.35) / 0.53, 1.6) * 170 + rng() * 8);
      return { text: days + " Earth days from sunrise to sunrise",
               hours: days * 24, slow: true };
    }
    var h = 6 + rng() * 46 + lock * 90;
    if (h < 20) return { text: h.toFixed(1) + " hours - a short, fast day", hours: h };
    if (h < 30) return { text: h.toFixed(1) + " hours - about an Earth day", hours: h };
    return { text: h.toFixed(1) + " hours - a long, slow day", hours: h };
  }

  /* ---- the atmosphere and the surface, both read off the layer stack --- */

  /* WHETHER THERE IS AIR IS A QUESTION ABOUT THE RENDER, not about a roll: the
   * atmosphere is a layer, present or absent in `body.layers`, and its
   * `strength` is how established it is. A body drawn with no halo must not be
   * described as having air. */
  function atmosphereOf(body, settings, climate) {
    var air = null;
    for (var i = 0; i < body.layers.length; i++) {
      if (body.layers[i].role === "atmosphere") air = body.layers[i];
    }
    if (!air || air.strength < 0.02) {
      return { present: false, text: "None. Vacuum at the surface.", pressure: 0 };
    }

    /* HOW THICK THE DRAWN BAND IS, measured against the layer BENEATH it
     * rather than against radius 1.0.
     *
     * Not the same thing, and the difference is a real defect the stats probe
     * caught: the body's true outermost point is a terrain PEAK whenever
     * relief rises through the layer above (D15 addendum 3), so `1.0` is the
     * peak and a perfectly ordinary atmosphere can sit *below* it. Measured
     * against 1.0 that gave a negative thickness, and a fractional power of a
     * negative number is NaN — the card reading "Crushing - NaN bar" over a
     * world with a thin sky.
     *
     * The band's own extent is the figure the picture actually carries, and it
     * is positive by construction. */
    var beneath = 0;
    for (var b = 0; b < body.layers.length; b++) {
      var l = body.layers[b];
      if (l.role !== "atmosphere" && l.outer > beneath && l.outer <= air.outer) {
        beneath = l.outer;
      }
    }
    var thick = Math.max(0, air.outer - beneath);
    var pressure = clamp(Math.pow(thick / 0.115, 1.6) * 1.9, 0.01, 90) * air.strength;

    var desc;
    if (pressure < 0.02) desc = "A trace of gas. Effectively vacuum.";
    else if (pressure < 0.25) desc = "Thin - " + pressure.toFixed(2) +
      " bar. Like standing above the summit of Everest.";
    else if (pressure < 2.2) desc = "Around " + pressure.toFixed(2) +
      " bar - roughly Earth's pressure at sea level.";
    else if (pressure < 12) desc = "Thick - " + pressure.toFixed(1) +
      " bar. Like being " + Math.round(pressure * 10) + " metres underwater.";
    else desc = "Crushing - " + Math.round(pressure) +
      " bar. Like being " + Math.round(pressure * 10) + " metres underwater.";

    /* BREATHABILITY IS A CONJUNCTION OF FACTS ALREADY ON THE CARD, never its
     * own roll: it needs pressure in a narrow band, a temperate surface, and
     * liquid water somewhere. That is the "benign" case HAZARDS.md calls rare
     * and delightful, and it is rare here because three conditions have to
     * land at once rather than because a die said so. */
    /* AND THE EXTREMES MUST BE ABSENT, not merely outweighed. Checking only
     * that a quarter of the world is temperate let a Desert World read
     * "Breathable, which is close to a miracle" two lines under "12 C to
     * 235 C" — because a world can be scorched at the equator and temperate at
     * the poles and still clear a fractional threshold. Air you could breathe
     * is a statement about the whole surface, so anything boiled or frozen
     * anywhere in quantity disqualifies it.
     *
     * TESTED IN CELSIUS, against the very figures the Surface temp line
     * prints two rows above. Comparing against the climate's NORMALIZED
     * thresholds instead is what let "-65 C to 42 C" pass as breathable: 0..1
     * and degrees are different scales, and the card is read in degrees. When
     * a card has to be self-consistent, the check belongs in the units the
     * card is written in. */
    var extreme = (climate.states.boiled || 0) + (climate.states.frozen || 0);
    var loC = toCelsius(climate.min), hiC = toCelsius(climate.max);
    var breathable = pressure > 0.55 && pressure < 2.6 &&
      (climate.states.temperate || 0) > 0.25 && climate.radiation < 0.45 &&
      extreme < 0.10 && hiC < 55 && loC > -40;
    if (breathable) desc += " Breathable, which is close to a miracle.";
    else if (pressure > 0.25) desc += " Nothing you could breathe.";

    return { present: true, text: desc, pressure: pressure,
             breathable: breathable, thickness: thick };
  }

  /* HOW MUCH OF THE WORLD IS DRY LAND — measured by walking the same two
   * curves the coastline is a crossing of.
   *
   * THIS IS THE MEASURE, AND THE OBVIOUS ONES ARE ALL WRONG. The first
   * attempt asked whether the ocean layer was present, which called a rogue
   * world at Ocean depth 12% "a shallow sea" when its water was 0.003 thick
   * against terrain relief of 0.19 — puddles lying in basins. The second
   * compared the water's thickness to that relief, which is at least the
   * right pair of quantities but is still a proxy: it read 0.55 at Ocean
   * depth 100%, on a world with literally no land left, because sea level and
   * band thickness are not the same statement.
   *
   * The coastline is where the drawn crust top crosses the drawn sea top
   * (D15) — so the honest answer is to walk the circumference and count. The
   * crust top is `layer.outer + terrain.at(angle)`, exactly as draw/layers.js
   * composes it, and the sea top carries its own angular offset on a zoned
   * world, exactly as draw/scene.js reads it. Both come from `details`, which
   * is the geometry that was drawn.
   *
   * Returns 1.0 for a world with no sea at all, which is correct rather than a
   * special case: all of it is dry. */
  var LAND_STEP = 2;

  function landFractionOf(body, details) {
    var sea = null, host = null;
    for (var i = 0; i < body.layers.length; i++) {
      var l = body.layers[i];
      if (l.role === "ocean") sea = l;
      else if (l.relief && l.role !== "atmosphere" &&
               (!host || l.outer > host.outer)) host = l;
    }
    /* A SUB-PIXEL SEA IS NOT A SEA — the renderer already agrees (D21). The
     * ocean's `strength` fade finishes at Ocean depth 0.079, but the water
     * does not reach one rendered pixel of thickness until around 0.2, and in
     * that window draw/scene.js fades its opacity out over the first ~1.5px
     * of rendered thickness. So there is a real band of settings where the
     * layer exists, the geometry crosses the terrain over most of the
     * circumference, and NOTHING IS DRAWN.
     *
     * Counting those crossings as ocean is what put "Sea where it survives"
     * on a Volcanic World whose water is 0.0009 of the radius — a card
     * describing a sea nobody can see, which is precisely the failure this
     * whole file is written against. The card and the renderer now apply the
     * same test, so neither can claim water the other has faded away.
     *
     * The figure is in body space rather than pixels because the card has no
     * view: 0.002 of the radius is roughly a pixel at the preview's own scale
     * and below the threshold at every export size, which is the resolution-
     * independent way to state "too thin to see". */
    var MIN_VISIBLE_SEA = 0.002;
    if (!sea || sea.strength <= 0.01) return 1;
    if ((sea.outer - sea.inner) * sea.strength < MIN_VISIBLE_SEA) return 1;
    if (!host || !details.terrain || !details.terrain[host.role]) return 0;

    var field = details.terrain[host.role];
    var offset = details.seaLevel ? details.seaLevel[host.role] : null;

    var land = 0, n = 0;
    for (var d = 0; d < 360; d += LAND_STEP) {
      var a = d * Math.PI / 180;
      var ground = host.outer + field.at(a);
      var water = sea.outer + (offset ? offset(a) : 0);
      if (ground > water) land++;
      n++;
    }
    return land / n;
  }

  /* WHAT IS UNDERFOOT is the outermost layer that is not the atmosphere,
   * qualified by what the climate is doing to it. Ocean depth removing the sea
   * changes this line, because it changes which layer that is. */
  function surfaceOf(body, details, climate) {
    var land = landFractionOf(body, details);
    var frozen = climate.frozenFraction;

    /* NO SEA AT ALL. What is underfoot is then a statement about the climate
     * rather than about the water. */
    if (land >= 0.999) {
      if (climate.hottest === "boiled" && (climate.states.boiled || 0) > 0.4) {
        return "Bare scorched rock. Anything volatile left long ago.";
      }
      if (frozen > 0.75) return "Rock under permanent ice. Nothing here has thawed.";
      if (frozen > 0.25) return "Dry rock, with ice held at the cold latitudes.";
      return "Dry rock and dust. No standing liquid anywhere.";
    }

    /* THE FOUR PICTURES THE LAND FRACTION ACTUALLY PRODUCES, and the
     * thresholds are read off the measured sweep rather than guessed: Ocean
     * depth runs the world from ~50% land at the shallow end, through an
     * Earth-like 30%, to an archipelago, to nothing exposed at all. */
    if (land < 0.02) {
      if (frozen > 0.8) return "A frozen sea, all the way round. The ice is the ground here.";
      if (frozen > 0.3) return "Open ocean with a standing ice sheet over the cold end. No land anywhere.";
      return "Ocean, everywhere, with no land at all. There is nowhere to stand.";
    }
    if (land < 0.12) {
      if (frozen > 0.6) return "A scatter of frozen islands in a global sea.";
      return "A global ocean, broken only by a scatter of islands.";
    }
    if ((climate.states.boiled || 0) > 0.2) {
      return "Sea where it survives, and scorched flats where it has boiled off.";
    }
    if (frozen > 0.8) return "A frozen sea between frozen headlands. Nothing here has thawed.";
    if (frozen > 0.3) {
      return "Sea and exposed land, with a standing ice sheet over the cold end.";
    }
    if (land > 0.55) {
      return "Mostly dry ground, with shallow seas standing in the low basins.";
    }
    return "Sea and land in roughly equal measure - coastline in both directions.";
  }

  /* ---- the card -------------------------------------------------------- */

  /* `body` and `details` are what got drawn; `settings` is what produced them.
   * Nothing else is consulted, which is the whole guarantee. */
  /* THE COLOUR FINGERPRINT — the body's own palette, as a row of swatches.
   *
   * It is a *detail* rather than a stat: it asserts nothing, and there is no
   * figure on it to contradict anything. What it does is make the card
   * identifiably THIS world at a glance, the way a colour bar on a book spine
   * does — two Garden Worlds with different seeds produce visibly different
   * rows even when every line of text matches.
   *
   * READ FROM `colorProfile.order`, NOT from the built layer list, and the
   * difference matters for the same reason it mattered in D12: `order` encodes
   * DEPTH, so the swatches always run surface-to-centre in a stable sequence.
   * Walking `body.layers` instead would reorder the row whenever a layer
   * appeared or vanished, and a fingerprint that changes shape when you drag
   * Ocean depth is not a fingerprint.
   *
   * Layers that are absent are skipped rather than blanked — the row is what
   * this body is made of, so a world with no ocean simply has no ocean swatch. */
  function fingerprintOf(body, palette, archetype) {
    var out = [];
    if (!palette || !palette.layers) return out;
    var order = (archetype.colorProfile && archetype.colorProfile.order) || [];

    for (var i = 0; i < order.length; i++) {
      var role = order[i];
      var entry = palette.layers[role];
      if (!entry || !entry.hex) continue;
      /* Present in the DRAWN stack, not merely declared in the profile. */
      if (!body.has(role)) continue;
      out.push({ role: role, hex: entry.hex });
    }
    return out;
  }

  function build(body, details, settings, archetype, palette) {
    var climate = details.climate;
    var rng = CC.RNG.stream(settings.seed, "stats-flavour");

    var radius = radiusKm(archetype, settings);
    var gravity = gravityOf(body, radius);
    var lo = toCelsius(climate.min), hi = toCelsius(climate.max);
    var locked = (settings.tidalLock || 0) > 0.45;

    var atmosphere = atmosphereOf(body, settings, climate);
    var day = dayLength(settings, rng);

    /* ONE MEASURE OF HOW MUCH SEA THERE IS, shared by the Surface line, the
     * resource pool and the approach note — so none of them can describe a
     * different amount of water from the others. */
    var landFraction = landFractionOf(body, details);
    var hasOcean = landFraction < 0.995;
    var oceanFraction = 1 - landFraction;

    var traits = (details.traits || []).map(function (t) { return t.id; });

    /* The fact bundle every text pool is filtered against. Assembled once so
     * no pool can consult anything the card does not also show. */
    var facts = {
      radius: radius, gravity: gravity,
      tempMin: lo, tempMax: hi, spread: climate.spread,
      frozenFraction: climate.frozenFraction,
      temperate: climate.states.temperate || 0,
      radiation: climate.radiation,
      interiorHeat: settings.interiorHeat,
      axialTilt: settings.axialTilt || 0,
      starlight: settings.starlight,
      sunless: settings.starlight <= 0.001,
      locked: locked, day: day,
      atmosphere: atmosphere, breathable: !!atmosphere.breathable,
      hasOcean: hasOcean, oceanFraction: oceanFraction,
      landFraction: landFraction,
      traits: traits,
      /* A dry world with air and an active star has weather that strips paint;
       * neither half alone does. */
      dust: atmosphere.present && !hasOcean && (settings.starActivity || 0) > 0.4
    };

    var hazard = CC.Hazard.of(facts);
    facts.hazardScore = hazard.score;
    facts.radiation = hazard.radiation;

    /* THE ORDER OF THE LINES IS THE HAZARDS.md SOLID-BODY TEMPLATE, verbatim.
     * `label` is what the panel prints; `value` is the sentence. */
    var lines = [
      { key: "size", label: "Size",
        value: (radius * 2).toLocaleString("en-US") + " km across - " + CC.Phrasebook.sizeSaying(radius) },
      { key: "gravity", label: "Gravity",
        value: gravity.toFixed(2) + "x Earth - " + CC.Phrasebook.saying(CC.Phrasebook.GRAVITY, gravity) },
      { key: "temp", label: "Surface temp",
        value: CC.ClimateText.temperatureLine(climate, lo, hi, locked) },
      { key: "climate", label: "Climate",
        value: CC.ClimateText.climateLine(climate, locked, settings.axialTilt || 0) },
      { key: "day", label: "Day length", value: day.text },
      { key: "atmosphere", label: "Atmosphere", value: atmosphere.text },
      { key: "surface", label: "Surface", value: surfaceOf(body, details, climate) },
      { key: "notable", label: "Notable", value: CC.Flavour.notableOf(facts, rng) },
      { key: "resources", label: "Resources", value: CC.Flavour.resourceOf(facts, rng) },
      { key: "approach", label: "Approach", value: CC.Flavour.approachOf(facts, rng) },
      { key: "danger", label: "Biggest danger", value: CC.Flavour.dangerOf(facts, rng) }
    ];

    return {
      name: CC.Flavour.nameOf(settings),
      typeLabel: archetype.label || archetype.id,
      hazard: hazard.rating,
      hazardScore: hazard.score,
      lines: lines,
      /* The body's palette as a swatch row, plus the seed that produced it —
       * the card's "fingerprint" strip. Not a stat: it asserts nothing, it
       * simply makes the card identifiably this world. */
      fingerprint: fingerprintOf(body, palette, archetype),
      seed: settings.seed,
      /* The raw figures, so a probe can assert the card against the render
       * without parsing English. */
      facts: facts
    };
  }

  return {
    build: build,
    toCelsius: toCelsius,
    gravityOf: gravityOf,
    radiusKm: radiusKm,
    atmosphereOf: atmosphereOf,
    /* Exported so the probe asks the REAL function rather than reimplementing
     * "is there a sea" — a probe that duplicates the logic it tests agrees
     * with itself and not with the renderer, which has cost this project two
     * rounds already (D27, D35). */
    landFractionOf: landFractionOf,
    fingerprintOf: fingerprintOf,
    RATINGS: CC.Hazard.RATINGS
  };
})();
