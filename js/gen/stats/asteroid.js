/* Asteroid — the stat template for the fragmented family.
 *
 * THE MINDSET, and it is why this is not the solid template with three lines
 * removed: an asteroid is not a world you arrive at the surface of, it is an
 * OBJECT you go to and take something from. The solid template's questions —
 * how much of the surface is dry land, where the coastline runs, what the air
 * is like, how long the day is — are all answered "none", "nowhere", "vacuum"
 * and "irrelevant" here, and a card that is four rows of blanks is worse than
 * a shorter card.
 *
 * What the reader actually wants to know about a rock is:
 *
 *   WHAT IS IT MADE OF — the spec's own framing of why you would go. Read off
 *     the mosaic's material count and the interior's colour, so the card and
 *     the picture are stating the same composition.
 *   WILL IT HOLD TOGETHER — Cohesion, which is the body's characterful axis
 *     and the one thing that changes what the cutaway looks like most. A
 *     rubble pile and a monolith are different propositions for anyone
 *     planning to anchor to it, mine it or hollow it out.
 *   CAN YOU LAND — and the interesting answer is not "yes" or "no" but "yes,
 *     carefully": gravity here is so low that walking is a launch hazard,
 *     which is the spec's "you could stand, but a firm step would launch you".
 *   HOW MUCH OF IT IS HOLE — the void fraction, which is both the reason to
 *     hide inside one and the reason not to trust its structure.
 *
 * EVERY FIGURE IS STILL READ OFF WHAT WAS DRAWN (the rule at the top of the
 * registry). The composition is the mosaic element's own material count, the
 * void fraction is its own void roll, the shell depth is the drawn boundary in
 * km. Nothing here is rolled that the picture does not already show.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;
  var toCelsius = CC.Stats.toCelsius;

  /* ---- the mosaic, as read back off the element ------------------------- */

  /* WHAT THE INTERIOR ACTUALLY CAME OUT AS.
   *
   * Found by looking for the drawn mosaic element rather than by recomputing
   * the Cohesion arithmetic, and the difference is the whole point. Rederiving
   * "cells = 200 * (1 - cohesion)" here would give a card that agrees with the
   * formula and not with the render — the failure D27 and D35 cost this
   * project two rounds over. The element carries its own site list, so the
   * honest answer is to count it.
   *
   * Returns null on a body with no mosaic, which is every body but this one,
   * so the rows that depend on it simply do not appear. */
  function mosaicOf(details) {
    var els = details.get ? details.get("interior") : null;
    if (!els) return null;
    for (var i = 0; i < els.length; i++) {
      if (els[i].kind !== "mosaic") continue;
      var m = els[i];
      var sites = m.sites || [];
      var hollow = 0;
      for (var s = 0; s < sites.length; s++) if (sites[s].hollow) hollow++;
      return {
        cells: sites.length,
        /* THE VOID FRACTION AS DRAWN, counted off the cells that will actually
         * be left as holes — not the probability they were rolled against. On
         * a body with forty cells those two figures differ by several percent,
         * and the one the reader can see is this one. */
        voidFraction: sites.length ? hollow / sites.length : 0,
        materials: m.materialCount || 1,
        cohesion: m.cohesion === undefined ? 1 : m.cohesion
      };
    }
    return null;
  }

  /* ---- composition ------------------------------------------------------ */

  /* WHAT THE ROCK IS, in the terms a reader has.
   *
   * The three real asteroid classes are carbonaceous (dark, water-bearing,
   * the commonest), stony (silicate, the bright ones) and metallic (the
   * exposed cores of bodies that were destroyed). Which one this body is has
   * to be read off the PICTURE, and the picture's statement about composition
   * is the interior's own value: a dark interior is carbon, a bright one is
   * stone, and a saturated mid one with metal in it is the metallic case.
   *
   * DERIVED FROM THE PALETTE RATHER THAN ROLLED, so an asteroid drawn nearly
   * black is never described as a bright stony one. The material COUNT feeds
   * the second half of the sentence, because "two materials" and "four
   * materials" are genuinely different rocks and the mosaic shows which. */
  function compositionOf(palette, mosaic) {
    var entry = palette && palette.layers && palette.layers.interior;
    var v = entry && entry.v !== undefined ? entry.v : 0.40;
    var s = entry && entry.s !== undefined ? entry.s : 0.20;

    var kind;
    if (v < 0.30) {
      kind = "Carbonaceous - dark, crumbly, and full of trapped water";
    } else if (s > 0.30 && v < 0.52) {
      kind = "Metallic - nickel-iron, the exposed heart of something larger";
    } else if (v > 0.48) {
      kind = "Stony - bright silicate rock, and very little else";
    } else {
      kind = "Mixed stone and metal, in no particular order";
    }

    if (!mosaic) return kind + ".";
    if (mosaic.materials >= 4) {
      return kind + ". Four distinct materials in the cut - it is an amalgam " +
             "of several different bodies.";
    }
    if (mosaic.materials <= 2) {
      return kind + ". Only two materials throughout - a single parent body, " +
             "broken up.";
    }
    return kind + ". Three materials in the cut, welded together.";
  }

  /* ---- structure -------------------------------------------------------- */

  /* HOW SOLIDLY IT HOLDS TOGETHER, and this is the line the whole card is for.
   *
   * Read off the DRAWN void fraction and cell count rather than off the
   * Cohesion setting, so the sentence describes the mosaic in front of the
   * reader. The two agree almost always and the picture wins when they do not.
   *
   * The ladder runs from a body that is barely a body to one that is a single
   * rock, and each rung says what it means for someone who has to work on it —
   * because the practical consequence is what makes the difference matter. */
  function structureOf(mosaic) {
    if (!mosaic) return null;
    var vf = mosaic.voidFraction;
    var n = mosaic.cells;

    if (vf > 0.22) {
      return "A rubble pile. " + n + " loose fragments with " +
             Math.round(vf * 100) + "% of the volume as void - it is held " +
             "together by gravity alone, and barely.";
    }
    if (vf > 0.12) {
      return "Loosely aggregated - " + n + " fragments, roughly " +
             Math.round(vf * 100) + "% void. Anchoring to it is a gamble; " +
             "drilling it is worse.";
    }
    if (vf > 0.05) {
      return "Fractured but coherent. " + n + " welded fragments with " +
             Math.round(vf * 100) + "% void between them.";
    }
    return "Effectively monolithic - " + n + " large welded blocks and almost " +
           "no void. You could anchor to this.";
  }

  /* ---- standing on it --------------------------------------------------- */

  /* THE SPEC'S BEST LINE, AND IT NEEDS ITS OWN ROW: "you could stand, but a
   * firm step would launch you."
   *
   * The interesting quantity is ESCAPE VELOCITY, not gravity, and on a body
   * this small it is genuinely comparable to how fast a person can move — a
   * jump leaves at about 4 m/s, and a 10 km asteroid's escape velocity is
   * around 5. That is the fact the whole family is built around and it is why
   * the row is here rather than folded into Gravity.
   *
   * Derived from the same gravity figure the row above prints, so the two
   * cannot disagree: v_esc = sqrt(2 * g * r), with g in m/s^2 and r in metres.
   * Real physics for once, because at these scales the honest number IS the
   * evocative one and nothing has to be stylized to make the point. */
  function standingOn(gravity, radiusKm) {
    var g = gravity * 9.81;
    var vesc = Math.sqrt(2 * g * radiusKm * 1000);

    if (vesc < 1.2) {
      return "Barely. Escape velocity is " + vesc.toFixed(2) + " m/s - slower " +
             "than a walk. Tether yourself or drift off.";
    }
    if (vesc < 4.5) {
      return "You could stand, but a firm step would launch you - escape " +
             "velocity is only " + vesc.toFixed(1) + " m/s.";
    }
    if (vesc < 15) {
      return "Yes, carefully. Escape velocity is " + vesc.toFixed(1) +
             " m/s; a hard jump gets you most of the way there.";
    }
    return "Yes. At " + Math.round(vesc) + " m/s escape velocity it holds on " +
           "to you properly, which is unusual for a rock.";
  }

  /* ---- how the gravity figure is written -------------------------------- */

  /* AN ASTEROID'S GRAVITY IS TOO SMALL FOR THE UNIT THE OTHER FAMILIES USE.
   *
   * A planet's card says "0.94x Earth" and that is exactly right for a planet.
   * Here the figure runs from about 0.00002 to 0.02, so at the three decimals
   * every other row uses, most of this family reads "0.000x Earth" — a number
   * with no information in it, printed beside a picture that has plenty.
   *
   * So the unit changes with the magnitude, which is what the rest of the card
   * already does with temperature and pressure. Past a certain smallness the
   * honest statement is not a smaller fraction, it is a different sentence. */
  function gravityLine(g) {
    if (g < 0.0004) {
      return "Immeasurable at this scale - you would not know it was there.";
    }
    if (g < 0.01) {
      return (g * 100).toFixed(2) + "% of Earth - " +
             CC.Phrasebook.saying(CC.Phrasebook.GRAVITY, g);
    }
    return g.toFixed(3) + "x Earth - " +
           CC.Phrasebook.saying(CC.Phrasebook.GRAVITY, g);
  }

  /* ---- the template ----------------------------------------------------- */

  CC.Stats.registerTemplate("asteroid", {
    build: function (body, details, settings, archetype, rng, shared) {
      var climate = details.climate;
      var radius = shared.radius;

      /* ---- GRAVITY IS COMPUTED HERE RATHER THAN BORROWED ----------------
       *
       * `shared.gravityOf` is the right tool for every other family and the
       * wrong one for this. It ends in `clamp(..., 0.04, 6.0)`, and 0.04 g is
       * ABOVE the whole range this family is supposed to occupy — the spec
       * asks for 0.00001-0.02 g. Measured across the family's entire radius
       * range, every single asteroid came out at exactly 0.04000: a 1 km rock
       * and a 500 km one were reported as having identical gravity. A row that
       * never varies carries no information, which is worse than being wrong,
       * and it is the same failure the gaseous family hit from the other
       * direction when every giant pinned against the 6 g ceiling.
       *
       * Widening the shared clamp was the wrong fix. The floor is there to
       * stop a terrestrial body reporting an absurdly small figure through a
       * calibration that was never meant to reach that far, and lowering it by
       * three orders of magnitude to accommodate one family would remove that
       * protection from the four families that need it.
       *
       * So this family computes its own, and — unusually for this project —
       * it uses REAL PHYSICS rather than a stylized calibration. That is not a
       * departure from "believable beats accurate", it is the one place where
       * the two agree: at these scales the honest number IS the evocative one.
       * A 5 km rock's escape velocity really is about 6 m/s, really is
       * comparable to how fast a person can jump, and the whole card is built
       * around saying so. Stylizing it could only make it less striking.
       *
       * DENSITY IS STILL READ OFF THE PICTURE (D5). The one density signal a
       * cutaway carries is how much of the body is dense material, and here
       * that is the mosaic's own void fraction: a rubble pile riddled with
       * holes is genuinely lighter than a monolith of the same size, and
       * dragging Cohesion moves the render and this number together. The
       * base figures are the real ones — 3300 kg/m3 for solid rock, down
       * toward 1300 for a loose aggregate, which is roughly the observed
       * spread from Vesta to Mathilde.
       *
       *     g = G * (4/3) * pi * rho * r      [m/s^2]
       *
       * DIVIDED BY 9.81, because every other Gravity row on every other card
       * in this project is in EARTH GRAVITIES and this one has to be the same
       * unit or the comparison between two cards is meaningless. The formula
       * gives m/s^2; the first version printed that figure straight and
       * reported a Vesta-sized body at 0.199 "x Earth" when the real answer is
       * 0.025 — a factor of 9.81, and exactly the kind of unit slip that looks
       * plausible on the card and is only caught by checking a body whose real
       * value is known. */
      var mosaic = mosaicOf(details);
      var voidFrac = mosaic ? mosaic.voidFraction : 0.06;
      /* Solid rock, less whatever fraction of the volume is hole. */
      var rho = 3300 * (1 - clamp(voidFrac, 0, 0.45));
      var gravity = 6.674e-11 * (4 / 3) * Math.PI * rho * (radius * 1000) / 9.81;

      var lo = toCelsius(climate.min), hi = toCelsius(climate.max);

      /* NO ATMOSPHERE, AND IT IS NOT A ROLL. There is no atmosphere layer in
       * this archetype's stack at all, so the fact is structural — the card
       * can state it flatly and never contradict the render. */
      var atmosphere = { present: false, pressure: 0,
                         text: "None, and there never was. Vacuum at the surface." };

      var traits = (details.traits || []).map(function (t) { return t.id; });

      var facts = {
        family: "asteroid",
        radius: radius, gravity: gravity,
        tempMin: lo, tempMax: hi, spread: climate.spread,
        frozenFraction: climate.frozenFraction,
        temperate: climate.states.temperate || 0,
        radiation: climate.radiation,
        interiorHeat: settings.interiorHeat,
        starlight: settings.starlight,
        sunless: settings.starlight <= 0.001,
        atmosphere: atmosphere, breathable: false,
        /* NO SEA, NO LAND FRACTION, NO DAY. Declared rather than omitted, so
         * the shared hazard scorer and the universal flavour pool — both of
         * which read these — behave rather than tripping over undefined. The
         * whole surface is ground, which is what `landFraction: 1` means. */
        hasOcean: false, oceanFraction: 0, landFraction: 1,
        locked: false, day: null,
        traits: traits,
        dust: false,

        /* THE FAMILY'S OWN FACTS, which its flavour pool filters against. */
        cohesion: mosaic ? mosaic.cohesion : 1,
        voidFraction: mosaic ? mosaic.voidFraction : 0,
        cells: mosaic ? mosaic.cells : 0,
        materials: mosaic ? mosaic.materials : 1,
        rubble: !!mosaic && mosaic.voidFraction > 0.18,
        monolithic: !!mosaic && mosaic.voidFraction < 0.05,
        /* Metal is worth going for, and whether there is any is a statement
         * the picture makes: the metallic glints are drawn in the interior at
         * every seed, but a body reads as metallic only when its interior is
         * saturated and mid-value. Same test the composition line uses, so
         * the two can never disagree. */
        metallic: /Metallic/.test(compositionOf(shared.palette, mosaic)),
        /* Escape velocity in m/s, which is this family's real headline
         * number. On the card as English; here as a figure so the flavour
         * pool can guard on it. */
        escapeVelocity: Math.sqrt(2 * gravity * 9.81 * radius * 1000)
      };

      var hazard = CC.Hazard.of(facts);
      facts.hazardScore = hazard.score;
      facts.radiation = hazard.radiation;

      var lines = [
        { key: "size", label: "Size",
          value: (radius * 2).toLocaleString("en-US") + " km across - " +
                 CC.Phrasebook.asteroidSizeSaying(radius) },
        /* GRAVITY IN THE UNITS THE FIGURE ACTUALLY NEEDS.
         *
         * "0.00x Earth" is not a number anyone can hold, and at three decimals
         * most of this family reads 0.000. So the row states it two ways: as a
         * fraction of Earth for the reader who wants the comparison, and as a
         * PERCENTAGE for the ones where the fraction has run out of resolution
         * — which is most of them. Both are the same figure. */
        { key: "gravity", label: "Gravity",
          value: gravityLine(gravity) },
        { key: "standing", label: "Stand on it?",
          value: standingOn(gravity, radius) },
        { key: "temp", label: "Surface temp",
          value: CC.ClimateText.temperatureLine(climate, lo, hi, false) },
        /* COMPOSITION AND STRUCTURE ARE THE TWO ROWS THIS FAMILY EXISTS FOR,
         * and they sit high on the card for that reason — above the hazard
         * questions, which is the opposite of the solid template's order.
         * What a rock is made of and whether it holds together are the first
         * two things anyone asks about one. */
        { key: "composition", label: "Composition",
          value: compositionOf(shared.palette, mosaic) },
        { key: "structure", label: "Structure", value: structureOf(mosaic) },
        { key: "atmosphere", label: "Atmosphere", value: atmosphere.text },
        { key: "notable", label: "Notable", value: CC.Flavour.notableOf(facts, rng) },
        { key: "resources", label: "Resources", value: CC.Flavour.resourceOf(facts, rng) },
        { key: "approach", label: "Approach", value: CC.Flavour.approachOf(facts, rng) },
        { key: "danger", label: "Biggest danger", value: CC.Flavour.dangerOf(facts, rng) }
      ];

      /* A ROW WHOSE VALUE IS NULL IS NOT A ROW — `structure` is absent on a
       * body whose mosaic did not build, which should never happen and must
       * not print an empty row if it does. */
      var kept = [];
      for (var li = 0; li < lines.length; li++) {
        if (lines[li].value !== null && lines[li].value !== undefined) {
          kept.push(lines[li]);
        }
      }

      return { lines: kept, facts: facts, hazard: hazard, levels: LEVELS };
    }
  });

  /* WHICH LINES EACH DETAIL LEVEL SHOWS.
   *
   * `structure` is in COMPACT, which no other family's characterful row is.
   * That is deliberate: on this body it is the single most informative line —
   * it is what the picture is of — and a compact card that omitted it would be
   * describing a generic rock. */
  var LEVELS = {
    compact: ["size", "gravity", "structure", "danger"],
    standard: ["size", "gravity", "standing", "temp", "composition",
               "structure", "danger"],
    full: null
  };

  /* Exported for the probes, which must ask the real functions rather than
   * reimplementing them. */
  CC.Stats.asteroid = {
    mosaicOf: mosaicOf,
    compositionOf: compositionOf,
    structureOf: structureOf,
    standingOn: standingOn
  };
})();
