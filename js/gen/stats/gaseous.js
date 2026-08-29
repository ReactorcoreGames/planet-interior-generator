/* Gaseous bodies — the stat template for `gas-giant` and `ice-giant`.
 *
 * THE MINDSET, and it is the whole reason this file exists separately from
 * solid.js: YOU DO NOT LAND ON THIS. There is no surface, so "what is
 * underfoot", "how much is dry land", "where is the coastline" and "could you
 * set down on it" are not merely inapplicable — they are the wrong shape of
 * question, and answering them with blanks would give a planet's card with
 * holes in it.
 *
 * The questions a giant actually raises are:
 *
 *   HOW FAR DOWN CAN YOU GO before the pressure ends you — the spec's "depth
 *     to crush point", and the number this family's whole card orbits.
 *   WHAT FLOATS AT WHICH LEVEL — which cloud deck is the visible one, which
 *     is what Starlight decides and what the render already shows.
 *   WHERE DOES AN OPERATION LIVE — in orbit, in a skimmer that dives the top
 *     of the envelope and climbs out again, on a platform floating at
 *     neutral buoyancy, or in a hull rated for the deep. That last one is a
 *     genuine setting question rather than a physical one, so the card offers
 *     the ladder and lets the reader pick where their tech sits on it.
 *
 * EVERY FIGURE IS STILL READ OFF THE DRAWN RADII (D5, and the rule at the top
 * of the registry). The crush depth is the drawn `molecular-h` / `icy-mantle`
 * boundary converted to km, so dragging Layer thickness moves the picture and
 * the number together; the visible deck is read from the same `chillAt` /
 * `scorchAt` the palette coloured the clouds with (D42), so the card cannot
 * name a deck the render is not showing.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;

  /* ---- temperature, at the cloud tops ---------------------------------- */

  /* A GIANT'S CLOUD TOPS ARE COLD, and the terrestrial mapping is wrong for
   * them: it is anchored so that the climate field's temperate band lands near
   * Earth's own range, which would have a Jupiter reading a balmy +10 C at the
   * setting that actually gives it -140.
   *
   * So this rescales the SAME normalized field rather than introducing a
   * second one — the archetype's business, exactly as HAZARDS.md says
   * ("a star's 0.9 is not a planet's 0.9"). The band runs from -220 at the
   * cold end to a genuinely hot-Jupiter +340 at the top, which is the range
   * the spec's -180..-60 sits comfortably inside while leaving room for the
   * extremes Starlight can reach.
   *
   * Non-linear at the hot end for the same reason the terrestrial one is: a
   * cloud deck driven deep by a close star is far further from ordinary than
   * a merely cool one. */
  function cloudTopC(t) {
    var u = clamp(t, 0, 1);
    if (u <= 0.55) return -220 + (u / 0.55) * 160;      /* -220 .. -60 */
    var up = (u - 0.55) / 0.45;
    return -60 + Math.pow(up, 1.25) * 400;              /* -60 .. +340 */
  }

  /* ---- which deck is the visible one ----------------------------------- */

  /* THE CLOUD-SPECIES LINE — the Starlight story, said in words.
   *
   * Ammonia, ammonium hydrosulphide and water condense at different
   * temperatures, so which deck you are looking at is a fact about how much
   * light arrives. The palette already colours the envelope from `chillAt` and
   * `scorchAt` (see `climateLean` in js/data/archetypes/gaseous.js); this
   * reads the SAME two figures, so the sentence and the colour cannot
   * disagree. That is D42 applied to text: one physical fact, one threshold.
   *
   * `icy` marks the ice giants, whose visible deck is methane rather than
   * ammonia — a different molecule at the same job. */
  function cloudDeckOf(climateField, icy) {
    /* Averaged over the disc, exactly as the palette averages it: a layer is a
     * band all the way round and has no bearing of its own to ask about. */
    var chill = 0, scorch = 0, n = 16, i;
    for (i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      chill += climateField.chillAt(a);
      scorch += climateField.scorchAt(a);
    }
    chill /= n; scorch /= n;

    if (scorch > 0.55) {
      return { key: "stripped", chill: chill, scorch: scorch,
               text: icy
        ? "None to speak of. The methane has been driven off; what you see is " +
          "the hot haze underneath."
        : "Driven deep. The cloud layers have sunk below anything you can see " +
          "- the top is bare, hot hydrogen." };
    }
    if (scorch > 0.22) {
      return { key: "deep", chill: chill, scorch: scorch,
               text: icy
        ? "Thin methane haze over a warm, murky depth. The colour is going out " +
          "of it."
        : "The bright ammonia deck has sunk out of sight. What is left on top " +
          "is darker, hotter gas full of things that stain it." };
    }
    if (chill > 0.55) {
      return { key: "deepfrozen", chill: chill, scorch: scorch,
               text: icy
        ? "Thick methane cloud, frozen hard. It is what paints this world blue."
        : "A deep, bright ammonia deck, frozen solid. The banding is at its " +
          "sharpest here." };
    }
    return { key: "ordinary", chill: chill, scorch: scorch,
             text: icy
      ? "Methane haze over ammonia cloud, in that order, going down."
      : "Ammonia cirrus on top, ammonium hydrosulphide under it, water cloud " +
        "below that. Three decks, in temperature order." };
  }

  /* ---- how far down before it kills you -------------------------------- */

  /* DEPTH TO CRUSH POINT — the family's signature figure.
   *
   * Read off the DRAWN stack, not invented: it is the depth at which the
   * envelope stops being gas you can move through and becomes fluid under
   * pressure no hull survives, which the picture already draws as the boundary
   * beneath the last cloud layer. So the number and the band it names are the
   * same statement, and every thickness control moves both.
   *
   * Gravity scales it, because pressure builds with depth times gravity: the
   * same drawn depth on a heavier world crushes you sooner. That keeps the
   * Gravity line and this one consistent rather than independent.
   *
   * Returns kilometres below the cloud tops. */
  function crushDepthOf(depthProfile, gravity, icy) {
    /* THE LAST LAYER YOU COULD BE INSIDE. Cloud decks are gas; the compressed
     * envelope beneath them is where a hull ends. Found by name from the
     * profile rather than by index, so an archetype missing its water-cloud
     * layer still gets the right boundary. */
    var bulk = icy ? "icy-mantle" : "molecular-h";
    var i, entry = null;
    for (i = 0; i < depthProfile.length; i++) {
      if (depthProfile[i].role === bulk) { entry = depthProfile[i]; break; }
    }
    /* No bulk layer at all — fall back to the innermost cloud layer's floor,
     * which is the same question asked of whatever stack this actually is. */
    if (!entry && depthProfile.length) entry = depthProfile[depthProfile.length - 1];
    if (!entry) return 0;

    /* A SHIP IS FINISHED LONG BEFORE THE GAS RUNS OUT.
     *
     * The first version returned the top of the bulk layer outright, which on
     * an ordinary giant is 45% of the radius — it printed a crush point
     * 29,400 km down, i.e. "you can descend a third of the way through
     * Jupiter". That is not what the figure means. The bulk's top is where the
     * gas has already stopped being gas; a hull gives out at a small fraction
     * of the way into the compressed envelope above it, which is the depth
     * the spec's "survivable levels" language is pointing at.
     *
     * A fraction of the drawn envelope rather than a fixed number of km, so
     * the figure still rides every thickness control and still names a place
     * in the picture. */
    var km = entry.depthKm * 0.16;
    /* Heavier world, shallower crush point: pressure builds as depth times
     * gravity, so the same drawn depth ends you sooner. Centred on 1 g. */
    return Math.max(50, km / Math.max(0.35, gravity));
  }

  /* HOW DEEP A SKIMMER GETS, and it must be measured the same way the crush
   * depth is or the two contradict each other on the card.
   *
   * The first version returned the floor of the second cloud deck as a raw
   * drawn depth while the crush point was divided by gravity — so a heavy
   * giant printed "skimmers can dive the top 7,700 km" three lines under
   * "crush point: 2,600 km", which is the card disagreeing with itself and is
   * precisely what this whole stage exists to prevent.
   *
   * A skimmer works in the part of the envelope it can still climb out of, so
   * it is a FRACTION of the crush depth rather than an independent figure.
   * That makes the relationship true by construction at every setting instead
   * of true by coincidence at some of them. */
  function skimDepthOf(crushKm) {
    return crushKm * 0.30;
  }

  /* ---- where an operation can actually live ---------------------------- */

  /* THE OPERATIONS LADDER, and it is deliberately a LADDER rather than a
   * verdict.
   *
   * How deep you can put people is a question about the setting's technology,
   * not about the planet — a hard-SF campaign keeps everything in orbit, and a
   * high-tech one has crewed platforms hanging at neutral buoyancy in the
   * troposphere. The card should not decide that for the reader. So it states
   * what each rung would MEAN on this particular body and lets the reader stop
   * wherever their fiction does.
   *
   * Every rung is still derived: the skimming depth is the drawn cloud decks,
   * the platform depth is the drawn troposphere, and the deep figure is the
   * crush depth above. */
  function operationsOf(depthProfile, crushKm, gravity, hazardScore) {
    /* Derived from the crush depth, so the two figures on the card cannot
     * disagree. See skimDepthOf. */
    var skim = skimDepthOf(crushKm);

    var round = function (km) {
      if (km >= 1000) return Math.round(km / 100) * 100 + " km";
      return Math.round(km / 10) * 10 + " km";
    };

    if (hazardScore >= 8) {
      return "Orbit only, and a high one. Nothing you send into the envelope " +
             "is coming back.";
    }
    if (gravity > 3.2) {
      return "Orbital work is fine; anything that goes down stays down. The " +
             "well is too deep to climb back out of on any sane fuel budget.";
    }
    return "Skimmers can dive the top " + round(skim) + " and climb back out. " +
           "A platform at neutral buoyancy would sit below that, in the " +
           "banded layer. Past " + round(crushKm) + " you need a hull nobody " +
           "has built cheaply.";
  }

  /* ---- day length ------------------------------------------------------ */

  /* GIANTS SPIN FAST — that is what drives the banding, and it is why the
   * climate declaration in js/data/archetypes/gaseous.js keeps `latitude`
   * low. A rotation figure that contradicted the bands would be exactly the
   * card-versus-render disagreement this whole stage exists to prevent.
   *
   * Tidal locking still overrides it, because a hot Jupiter genuinely is
   * locked and the render would show it. */
  function dayLength(settings, rng) {
    if (settings.starlight <= 0.001) {
      return { text: "No sunrise - there is no star. It still spins fast.",
               hours: null, sunless: true };
    }
    var lock = settings.tidalLock || 0;
    if (lock > 0.88) {
      return { text: "One face never turns away - the day is the year",
               hours: null, locked: true };
    }
    if (lock > 0.35) {
      var days = Math.round(6 + Math.pow((lock - 0.35) / 0.53, 1.6) * 120 + rng() * 6);
      return { text: days + " Earth days from sunrise to sunrise - dragged " +
                     "slow by its star", hours: days * 24, slow: true };
    }
    /* Nine to eighteen hours: Jupiter is just under ten, Neptune sixteen. */
    var h = 9 + rng() * 9;
    return { text: h.toFixed(1) + " hours - it spins fast, which is what " +
                   "drives the banding", hours: h };
  }

  /* ---- the template ---------------------------------------------------- */

  CC.Stats.registerTemplate("gaseous", {
    build: function (body, details, settings, archetype, rng, shared) {
      var climate = details.climate;
      var field = details.climateField;
      var radius = shared.radius;
      var icy = (archetype.tags || []).indexOf("icy") >= 0;

      /* WHAT MAKES A GIANT HEAVY is its rock heart AND the metallic-hydrogen
       * shell around it — that shell is genuinely the dense part of a body
       * otherwise made of gas. Reading `rock-core` alone returned a world with
       * almost no mass, which contradicted a picture of something 90,000 km
       * across. See gravityOf in the registry. */
      /* THE SCALE IS PER ARCHETYPE, NOT PER FAMILY.
       *
       * One figure for both was the obvious first move and it was wrong by a
       * factor of three: a gas giant's radius range is 45,000-95,000 and an
       * ice giant's is 20,000-30,000, so a scale calibrated on one puts the
       * other at a third of its correct gravity. Measured with a shared
       * 52,000: gas giants landed 0.70-1.29 g against a spec of 0.9-6, and ice
       * giants 0.29-0.41 against a spec of 0.8-1.4.
       *
       * Which is D45 for the third time in this phase, and the lesson each
       * time is the same — a constant is only calibrated for the range it was
       * fitted on. The archetype states its own, because the archetype is what
       * states its radius range. */
      var gravity = shared.gravityOf(body, radius,
                                     ["rock-core", "metallic-h", "superionic"],
                                     archetype.gravityScale);

      var lo = cloudTopC(climate.min), hi = cloudTopC(climate.max);
      var locked = (settings.tidalLock || 0) > 0.45;

      var deck = cloudDeckOf(field, icy);
      var day = dayLength(settings, rng);
      var crushKm = crushDepthOf(shared.depthProfile, gravity, icy);

      var traits = (details.traits || []).map(function (t) { return t.id; });

      /* THE FACT BUNDLE, and note what is DELIBERATELY ABSENT.
       *
       * No `landFraction`, no `hasOcean`, no `breathable`. Those are not
       * "false" on a giant, they are meaningless — and supplying them as false
       * would let a flavour pool reason from them ("no dry landing sites",
       * which is true but says the wrong thing, as though a landing had been
       * on the table). `family: "gaseous"` is what the pools branch on
       * instead, so a line written for one family can never be picked for the
       * other. */
      var facts = {
        family: "gaseous",
        icy: icy,
        radius: radius, gravity: gravity,
        tempMin: lo, tempMax: hi, spread: climate.spread,
        frozenFraction: climate.frozenFraction,
        temperate: 0,
        radiation: climate.radiation,
        interiorHeat: settings.interiorHeat,
        starlight: settings.starlight,
        sunless: settings.starlight <= 0.001,
        locked: locked, day: day,
        /* The envelope IS the atmosphere, so the question "does it have air"
         * has one answer and the interesting figure is how deep it goes. */
        atmosphere: { present: true, pressure: 0, text: deck.text },
        breathable: false,
        deck: deck, crushKm: crushKm,
        /* Which layers the body actually drew, so a pool can mention the
         * superionic shell only when there is one to see. */
        hasSuperionic: body.has("superionic"),
        hasWaterCloud: body.has("water-cloud"),
        hasMetallicH: body.has("metallic-h"),
        traits: traits,
        dust: false
      };

      var hazard = CC.Hazard.of(facts);
      facts.hazardScore = hazard.score;
      facts.radiation = hazard.radiation;

      var lines = [
        { key: "size", label: "Size",
          value: (radius * 2).toLocaleString("en-US") + " km across - " +
                 CC.Phrasebook.giantSizeSaying(radius) },
        /* "AT CLOUD-TOP", because there is nowhere else to measure it. The
         * label carries the mindset as much as the number does. */
        { key: "gravity", label: "Gravity at cloud-top",
          value: gravity.toFixed(2) + "x Earth - " +
                 CC.Phrasebook.saying(CC.Phrasebook.GIANT_GRAVITY, gravity) },
        { key: "temp", label: "Cloud-top temp",
          value: temperatureLine(lo, hi, locked) },
        { key: "deck", label: "Cloud deck", value: deck.text },
        { key: "day", label: "Day length", value: day.text },
        /* THE FAMILY'S SIGNATURE LINE. */
        { key: "depth", label: "Depth to crush point",
          value: crushLine(crushKm) },
        { key: "operations", label: "Where you can work",
          value: operationsOf(shared.depthProfile, crushKm, gravity, hazard.score) },
        { key: "interior", label: "Interior",
          value: interiorLine(facts, icy) },
        { key: "notable", label: "Notable", value: CC.Flavour.notableOf(facts, rng) },
        { key: "resources", label: "Resources", value: CC.Flavour.resourceOf(facts, rng) },
        { key: "approach", label: "Approach", value: CC.Flavour.approachOf(facts, rng) },
        { key: "danger", label: "Biggest danger", value: CC.Flavour.dangerOf(facts, rng) }
      ];

      return { lines: lines, facts: facts, hazard: hazard, levels: LEVELS };
    }
  });

  /* ---- the sentences --------------------------------------------------- */

  function temperatureLine(lo, hi, locked) {
    var l = Math.round(lo), h = Math.round(hi);
    if (locked) {
      return l + " C on the night side, " + h + " C on the day side. The " +
             "terminator is a permanent storm.";
    }
    if (h - l < 25) return "About " + Math.round((l + h) / 2) + " C at the tops, " +
                           "all the way round.";
    return l + " C to " + h + " C at the tops.";
  }

  /* The thresholds are read off what the drawn stacks actually produce —
   * roughly 1,500 to 7,000 km across the family — rather than guessed. A
   * ladder whose rungs sit outside the range its input reaches is a constant
   * wearing a ladder's clothes. */
  function crushLine(km) {
    var round = km >= 1000 ? Math.round(km / 100) * 100
                           : Math.round(km / 10) * 10;
    var n = round.toLocaleString("en-US");
    if (km < 1200) {
      return n + " km down - shallow, as these go. The envelope turns to " +
             "something no hull survives sooner than you would like.";
    }
    if (km < 3500) {
      return n + " km down - where a ship stops being a ship.";
    }
    return n + " km down. There is a great deal of room above that, and none " +
           "at all below it.";
  }

  /* WHAT IS DOWN THERE — one line for the whole interior, because on a giant
   * the interior is the part nobody will ever reach and the card should say so
   * once rather than pretending it is navigable.
   *
   * Every clause is gated on a layer the render actually drew. */
  function interiorLine(facts, icy) {
    if (icy) {
      if (facts.hasSuperionic) {
        return "An ocean of something between ice and water, and under it a " +
               "shell of superionic ice that conducts like a metal. Neither " +
               "exists anywhere you could visit.";
      }
      return "An ocean of something between ice and water, hot and dense and " +
             "under pressure that has no equivalent up here.";
    }
    if (facts.hasMetallicH) {
      return "Hydrogen, compressed until it turns to liquid metal. That shell " +
             "is the dynamo, and it is why the radiation belts are what they are.";
    }
    return "Hydrogen all the way down, getting denser, until it stops behaving " +
           "like a gas at all.";
  }

  /* WHICH LINES EACH DETAIL LEVEL SHOWS — the gaseous set.
   *
   * `depth` is in COMPACT, which is the clearest single statement of how this
   * family's template differs: on a planet the compact card leads with what
   * the surface is like, and here there is no surface, so the equivalent fact
   * is how far down you can get. */
  var LEVELS = {
    compact: ["size", "gravity", "temp", "deck", "depth", "danger"],
    standard: ["size", "gravity", "temp", "deck", "day", "depth",
               "operations", "danger"],
    full: null
  };

  /* Exported so a probe asks the real functions. */
  CC.Stats.gaseous = {
    cloudTopC: cloudTopC,
    cloudDeckOf: cloudDeckOf,
    crushDepthOf: crushDepthOf,
    skimDepthOf: skimDepthOf,
    operationsOf: operationsOf,
    dayLength: dayLength
  };
})();
