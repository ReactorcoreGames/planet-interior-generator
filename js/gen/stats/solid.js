/* Solid bodies — the stat template for the rocky family.
 *
 * THE MINDSET: you land on it. Every question here is a surface question —
 * what is underfoot, how much of it is dry, where the coastline runs, whether
 * the air is worth breathing, whether you could set a ship down. That is the
 * right frame for a planet and the wrong one for a gas giant, which is why
 * the templates are split at all; see js/gen/stats/registry.js.
 *
 * `moon`, `ice-moon` and `asteroid` will share this template when they land at
 * Phase 7 — an airless moon is still a body you stand on. They may want their
 * own line sets, which is a `levels` edit rather than a new file.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;
  var toCelsius = CC.Stats.toCelsius;

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

  /* ---- the template ---------------------------------------------------- */

  CC.Stats.registerTemplate("solid", {
    build: function (body, details, settings, archetype, rng, shared) {
      var climate = details.climate;
      var radius = shared.radius;
      /* IRON IS WHAT MAKES A PLANET HEAVY — the core and the liquid shell
       * around it. See gravityOf in the registry for why the dense-role list
       * is the family's call rather than a constant. */
      var gravity = shared.gravityOf(body, radius, ["core", "outer-core"]);
      var lo = toCelsius(climate.min), hi = toCelsius(climate.max);
      var locked = (settings.tidalLock || 0) > 0.45;

      var atmosphere = atmosphereOf(body, settings, climate);
      var day = dayLength(settings, rng);

      /* ONE MEASURE OF HOW MUCH SEA THERE IS, shared by the Surface line, the
       * resource pool and the approach note — so none of them can describe a
       * different amount of water from the others. */
      var landFraction = landFractionOf(body, details);
      var hasOcean = landFraction < 0.995;

      var traits = (details.traits || []).map(function (t) { return t.id; });

      /* The fact bundle every text pool is filtered against. Assembled once so
       * no pool can consult anything the card does not also show. */
      var facts = {
        family: "solid",
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
        hasOcean: hasOcean, oceanFraction: 1 - landFraction,
        landFraction: landFraction,
        traits: traits,
        /* A dry world with air and an active star has weather that strips
         * paint; neither half alone does. */
        dust: atmosphere.present && !hasOcean && (settings.starActivity || 0) > 0.4
      };

      var hazard = CC.Hazard.of(facts);
      facts.hazardScore = hazard.score;
      facts.radiation = hazard.radiation;

      /* THE ORDER OF THE LINES IS THE HAZARDS.md SOLID-BODY TEMPLATE,
       * verbatim. `label` is what the panel prints; `value` is the sentence. */
      var lines = [
        { key: "size", label: "Size",
          value: (radius * 2).toLocaleString("en-US") + " km across - " +
                 CC.Phrasebook.sizeSaying(radius) },
        { key: "gravity", label: "Gravity",
          value: gravity.toFixed(2) + "x Earth - " +
                 CC.Phrasebook.saying(CC.Phrasebook.GRAVITY, gravity) },
        { key: "temp", label: "Surface temp",
          value: CC.ClimateText.temperatureLine(climate, lo, hi, locked) },
        { key: "climate", label: "Climate",
          value: CC.ClimateText.climateLine(climate, locked, settings.axialTilt || 0) },
        /* THE SECOND TEMPERATURE, WHERE THERE IS ONE.
         *
         * An ice-shelled moon has two and the card has to state both, or it
         * contradicts the picture it sits beside: a frozen surface with a
         * liquid ocean drawn under it reads as an error unless the card says
         * why. The row above describes the SHELL'S SURFACE, which is frozen —
         * that is why there is a shell; this one describes the water beneath,
         * which is liquid because the shell insulates it and the interior
         * warms it from below.
         *
         * PRESENT ONLY WHEN THE CLIMATE DECLARES ONE. `climate.subsurface` is
         * null on every body that has a single temperature, so no archetype
         * name is checked here and nothing else in the family grows a row. */
        { key: "subsurface", label: "Beneath the ice",
          value: CC.ClimateText.subsurfaceLine(climate) },
        { key: "day", label: "Day length", value: day.text },
        { key: "atmosphere", label: "Atmosphere", value: atmosphere.text },
        { key: "surface", label: "Surface",
          value: surfaceOf(body, details, climate) },
        { key: "notable", label: "Notable", value: CC.Flavour.notableOf(facts, rng) },
        { key: "resources", label: "Resources", value: CC.Flavour.resourceOf(facts, rng) },
        { key: "approach", label: "Approach", value: CC.Flavour.approachOf(facts, rng) },
        { key: "danger", label: "Biggest danger", value: CC.Flavour.dangerOf(facts, rng) }
      ];

      /* A ROW WHOSE VALUE IS NULL IS NOT A ROW.
       *
       * `subsurface` is the first line in the generator that only some bodies
       * in a family have — an ice-shelled moon has two temperatures and every
       * other solid body has one. Dropping it here rather than branching at
       * the top means the template still declares one line order and the card
       * still prints whatever it is handed (D53: the panel decides nothing). */
      var kept = [];
      for (var li = 0; li < lines.length; li++) {
        if (lines[li].value !== null && lines[li].value !== undefined) {
          kept.push(lines[li]);
        }
      }
      lines = kept;

      return { lines: lines, facts: facts, hazard: hazard, levels: LEVELS };
    }
  });

  /* WHICH LINES EACH DETAIL LEVEL SHOWS. Moved here from draw/card.js, which
   * was the last place in draw/ holding a list of one family's line keys.
   *
   * The split runs from "things the picture asserts" out to "things the
   * picture permits", so turning the level down never removes a fact and
   * leaves an inference standing on it. `full` is null, meaning every line in
   * the template's own order. */
  var LEVELS = {
    compact: ["size", "gravity", "temp", "day", "atmosphere", "danger"],
    /* `subsurface` earns a place in `standard` because on the one body that
     * has it, it is the whole point of the picture — an ocean nobody can see
     * from outside. It is absent on every other body, so this costs them
     * nothing. */
    standard: ["size", "gravity", "temp", "subsurface", "climate", "day",
               "atmosphere", "surface", "danger"],
    full: null
  };

  /* Exported for the probes, which must ask the REAL function rather than
   * reimplementing "is there a sea" — a probe that duplicates the logic it
   * tests agrees with itself and not with the renderer, which has cost this
   * project two rounds already (D27, D35). */
  CC.Stats.solid = {
    atmosphereOf: atmosphereOf,
    landFractionOf: landFractionOf,
    surfaceOf: surfaceOf,
    dayLength: dayLength
  };
})();
