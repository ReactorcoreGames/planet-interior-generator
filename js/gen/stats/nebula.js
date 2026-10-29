/* Nebulae — the stat template.
 *
 * THE MINDSET (D78): every other card asks what a body is like to reach,
 * land on, or survive near. A nebula is not a place you arrive at — you are
 * already in it, for light-years. Its card asks what it is like to CROSS:
 * how far, how thin, what it is made of, how far you can see, what makes
 * flying it hard, and what is hiding in it. The hook is the counterintuitive
 * one the spec names: it looks solid and it is thinner than a laboratory
 * vacuum — it is only enormous.
 *
 * READ FROM THE BUILT BODY. The form from the stack that was built (a shell,
 * and whether the pulsar's beams fired), the light from Luminosity source,
 * the colour from the palette that was drawn, the young stars COUNTED from
 * the elements that were placed, and the contents from the traits that drew.
 * Size is rolled per seed — the picture has no scale — and every figure
 * derived from it is computed here, not asserted (D212). */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp, lerp = CC.Math.lerp;

  var LY_KM = 9.4607e12;
  var YEAR_S = 3.15576e7;
  var VOYAGER_KMS = 17;            /* Voyager 1, leaving the Solar System */
  var LAB_VACUUM = 3000;           /* atoms per cm^3: the emptiest chambers */
  var SUN_G = 1.989e33;
  var CM_PER_LY = 9.4607e17;

  function round(v, n) { var k = Math.pow(10, n || 0); return Math.round(v * k) / k; }
  function sig(v) { return CC.Stats.compact.sig(v); }
  function nice(v) {
    if (v >= 1e6) return sig(v);
    if (v >= 1000) {
      /* Three significant figures: "398,520 years" is false precision. */
      var k = Math.pow(10, Math.floor(Math.log(v) / Math.LN10) - 2);
      return (Math.round(v / k) * k).toLocaleString("en-US");
    }
    if (v >= 100) return String(Math.round(v));
    return v >= 10 ? String(Math.round(v)) : String(round(v, 1));
  }

  function formOf(body) {
    if (!body.has("shell")) return "cloud";
    return body.beams ? "remnant" : "planetary";
  }

  /* Diameter in light-years, log-spread inside the form's real range: a
   * planetary nebula is about a light-year, a remnant tens, a cloud up to a
   * hundred. */
  var SIZE = { cloud: [4, 100], planetary: [0.4, 3], remnant: [6, 110] };
  function sizeLy(form, seed) {
    var r = CC.RNG.stream(seed, "stats/nebula/size");
    var t = (r() + r()) / 2, s = SIZE[form];
    return Math.exp(lerp(Math.log(s[0]), Math.log(s[1]), t));
  }

  /* Atoms per cubic centimetre: a dark cloud is the thickest (thousands), an
   * emission nebula hundreds, a planetary shell a couple of thousand, a
   * remnant a handful. */
  function densityOf(form, lum, seed) {
    var j = (CC.RNG.stream(seed, "stats/nebula/density")() - 0.5) * 0.5;
    var lg = form === "remnant" ? 0.5 : form === "planetary" ? 3.3
           : lerp(3.9, 2.3, clamp(lum, 0, 1));
    return Math.pow(10, lg + j);
  }

  /* What the colour on screen IS. Emission colours are atomic lines: red is
   * hydrogen, green-blue is oxygen (and only shines that way in gas this
   * thin), yellow is helium. Reflection is starlight scattered off dust. */
  function compositionOf(form, lum, hue) {
    if (form === "remnant") {
      return "The dead star's own insides - oxygen, silicon, sulfur, iron - " +
             "thrown out and still glowing, plus the hydrogen it swept up";
    }
    if (form === "planetary") {
      return "The dying star's outer layers - hydrogen and helium, with the " +
             "carbon, nitrogen and oxygen it made - plus dust";
    }
    if (lum < 0.25) {
      return "Cold hydrogen and helium, thick with dust - soot and grains of " +
             "rock finer than sand, which is what blocks the light";
    }
    if (lum < 0.5) {
      return "Hydrogen and helium, and dust that scatters the light of nearby " +
             "stars - blue for the same reason the sky is";
    }
    var h = ((hue % 360) + 360) % 360;
    var line = h < 25 || h >= 330 ? "Hydrogen, glowing red where starlight strips its atoms"
      : h < 70 ? "Hydrogen and helium, the helium glowing yellow"
      : h < 200 ? "Hydrogen, helium and oxygen - the green-blue glow is oxygen, " +
                  "which only shines this way in gas this thin"
      : h < 260 ? "Hydrogen and oxygen, hot enough to glow blue"
      : "Hydrogen, glowing red and blue at once, which the eye reads as violet";
    return line + ", plus dust";
  }

  function tempLine(form, lum, seed) {
    var r = CC.RNG.stream(seed, "stats/nebula/temp")();
    if (form === "remnant") {
      return round(lerp(1, 10, r), 0) + " million C in the shock front - hot " +
             "enough to glow in X-rays - and near absolute zero in the gaps";
    }
    if (form === "planetary") {
      return "About 10,000 C in the glowing shell. The dead star at the middle " +
             "is " + (Math.round(lerp(80, 150, r)) * 1000).toLocaleString("en-US") + " C";
    }
    if (lum >= 0.45) {
      var c = Math.round(lerp(7000, 10000, (lum - 0.45) / 0.55) / 100) * 100;
      return c.toLocaleString("en-US") + " C in the glowing gas - and it would not " +
             "warm you, because almost nothing is there to touch you. -260 C in the dark";
    }
    return "-250 C even where it is lit - that light is reflected, not made " +
           "here. -260 C in the dark, thirteen degrees above absolute zero";
  }

  function visibilityLine(form, lum, rift) {
    var s;
    if (form !== "cloud") {
      s = "Clear in the swept-out middle; hazy in the shell, and the shell " +
          "is what everyone outside can see";
    } else if (lum < 0.25) {
      s = "Starlight dies inside a light-year. Past your own floodlights, you " +
          "fly on instruments";
    } else if (lum < 0.5) {
      s = "Hazy. One flank is lit by a star outside the cloud; the far side " +
          "is dark";
    } else {
      s = "Better than it looks. From inside, the glow is too faint for the " +
          "naked eye - it only shows from light-years away, where the depth adds up";
    }
    return s + (rift ? ". Nothing at all gets through the rift" : "");
  }

  var MATERIALS = { "debris-fields": "rubble", "ice-belts": "ice",
                    "rock-belts": "rock", "metal-belts": "metal",
                    "exotic-gas-pockets": "pockets of exotic gas" };

  function countKind(details, kind, trait) {
    var n = 0;
    function walk(list) {
      for (var i = 0; i < (list || []).length; i++) {
        var e = list[i];
        if (e.kind === kind && (trait === undefined ? !e.trait : e.trait === trait)) n++;
      }
    }
    /* The remnant star is a point of light too, and it is not young. */
    for (var role in details.byRole || {}) {
      if (role !== "remnant-star") walk(details.byRole[role]);
    }
    walk(details.spanningTraits);
    return n;
  }

  CC.Stats.registerTemplate("nebula", {
    build: function (body, details, settings, archetype, rng, shared) {
      var form = formOf(body);
      var lum = clamp(settings.luminosity === undefined ? 0.7 : settings.luminosity, 0, 1);
      var traits = (details.traits || []).map(function (t) { return t.id; });
      var has = function (id) { return traits.indexOf(id) >= 0; };

      var ly = sizeLy(form, settings.seed);
      var n = densityOf(form, lum, settings.seed);
      /* Mass = density x volume x the share actually filled (a cloud is
       * clumpy, a shell hollow) x 1.4 hydrogen masses per atom (helium). */
      var fill = form === "cloud" ? 0.3 : 0.5;
      var vol = 4 / 3 * Math.PI * Math.pow(ly / 2 * CM_PER_LY, 3);
      var suns = n * vol * fill * 1.4 * 1.6726e-24 / SUN_G;
      var voyager = ly * LY_KM / VOYAGER_KMS / YEAR_S;

      var bulk = form === "cloud" ? "dense-region" : "shell";
      var entry = shared.palette && shared.palette.layers && shared.palette.layers[bulk];
      var hue = entry && entry.h !== undefined ? entry.h : 0;

      var youngStars = countKind(details, "protostar") +
                       countKind(details, "protostar", "protostar-cluster");
      var facts = {
        family: "nebula",
        form: form, luminosity: lum,
        /* Cloud-only: a shell's hollow is clear whatever the light (its
         * Visibility line says so), so it is never "flown blind". */
        dark: form === "cloud" && lum < 0.25,
        reflection: form === "cloud" && lum >= 0.25 && lum < 0.5,
        emission: lum >= 0.5,
        sizeLy: ly, density: n, suns: suns, youngStars: youngStars,
        thinnerThanLab: n < LAB_VACUUM,
        materials: traits.filter(function (t) { return MATERIALS[t]; }),
        radius: ly, tempMin: -260, tempMax: -260,
        /* `ly` is the width across; the scale bar wants the radius in km. */
        radiusKm: ly / 2 * LY_KM,
        /* Under the universal pool's 0.62, whose line blames stellar flares
         * (D212): a remnant's danger is its pulsar, and its own pool says so. */
        radiation: 0, sunless: false, locked: false, gravity: 0,
        atmosphere: { present: false, pressure: 0, text: "" },
        breathable: false,
        traits: traits
      };
      var hazard = CC.Hazard.of(facts);
      facts.hazardScore = hazard.score;

      /* WHAT IS IN IT, from what drew. */
      var inside = [];
      if (form === "remnant") inside.push("a pulsar at the heart, sweeping its beams through the wreck");
      if (form === "planetary") inside.push("a white dwarf at the middle - the star that made it");
      if (has("cavity")) inside.push("a hollow a star has blown in the gas, the star still in it");
      if (has("embedded-star")) inside.push("one great star lighting the gas round it");
      if (has("protostar-cluster")) inside.push("a nursery of newborn stars");
      if (youngStars && !has("protostar-cluster")) {
        inside.push(youngStars + " young star" + (youngStars > 1 ? "s" : "") + ", still forming");
      }
      if (facts.materials.length) {
        inside.push(facts.materials.map(function (t) { return MATERIALS[t]; }).join(", ") +
                    " drifting in the gas");
      }
      if (has("hidden-station")) inside.push("a station, hidden");
      if (has("mining-flotilla")) inside.push("a mining flotilla at work");
      if (has("derelict-fleet")) inside.push("a fleet of dead ships");
      var insideLine = inside.length
        ? inside[0].charAt(0).toUpperCase() + inside.join("; ").slice(1)
        : "Nothing but gas - the most of nothing you will ever see";

      /* WHY IT IS HARD TO FLY, from the same facts the rating summed. */
      var why = [];
      if (form === "remnant") why.push("the pulsar's beams sweep it, and its radiation goes with them");
      if (facts.dark) why.push("you fly it blind");
      if (facts.materials.length) why.push("solid matter drifts unseen in the haze");
      if (has("bow-shocks")) why.push("shock fronts where stars plough through");
      if (has("embedded-star") || has("protostar-cluster") || (facts.emission && form === "cloud" && lum > 0.75)) {
        why.push("young stars flood it with ultraviolet");
      }
      if (!why.length) why.push("nothing to hit; the danger is getting lost, " +
                                "and nobody hearing you call");

      var lines = [
        { key: "size", label: "Size",
          value: nice(ly) + " light-year" + (ly >= 1.05 || ly < 0.95 ? "s" : "") +
                 " across. Light takes " + nice(ly) + " years to cross it; the " +
                 "Voyager 1 probe would need " + nice(voyager) + " years" },
        { key: "density", label: "Density",
          value: "About " + nice(n) + " atom" + (n >= 1.5 ? "s" : "") +
                 " in each sugar-cube of space - " +
                 (facts.thinnerThanLab ? "thinner than the best vacuum we can make on Earth"
                                       : "about as thin as the best vacuum we can make on Earth") +
                 ". Air holds 25 billion billion. It only looks solid because it is light-years deep" },
        { key: "mass", label: "Mass",
          value: suns >= 2
            ? "About " + nice(suns) + " times the Sun - enough gas to build " +
              nice(suns) + " stars like it"
            : "About " + (suns >= 1 ? nice(suns) + " times the Sun"
                                    : nice(suns * 333000) + " times the Earth") +
              " - all of it spread across the whole " + (form === "cloud" ? "cloud" : "shell") },
        { key: "composition", label: "Composition", value: compositionOf(form, lum, hue) },
        { key: "temp", label: "Temperature", value: tempLine(form, lum, settings.seed) },
        { key: "visibility", label: "Visibility",
          value: visibilityLine(form, lum, has("dark-lanes")) },
        { key: "navigation", label: "Navigation",
          value: hazard.rating + " - " + why.slice(0, 2).join("; ") },
        { key: "inside", label: "What's inside", value: insideLine },
        { key: "gravity", label: "Gravity",
          value: "Effectively none. A ship coasting through feels nothing at all" },
        { key: "surface", label: "Stand on it?",
          value: "There is nothing to stand on. You fly through it" },
        { key: "breathe", label: "Breathe?",
          value: "No. A cubic kilometre of it holds less gas than one breath" },
        { key: "notable", label: "Notable", value: CC.Flavour.notableOf(facts, rng) },
        { key: "resources", label: "Resources", value: CC.Flavour.resourceOf(facts, rng) },
        { key: "approach", label: "Approach", value: CC.Flavour.approachOf(facts, rng) },
        { key: "danger", label: "Biggest danger", value: CC.Flavour.dangerOf(facts, rng) }
      ];

      return { lines: lines, facts: facts, hazard: hazard, levels: LEVELS };
    }
  });

  /* Density in COMPACT, beside the size: the pair IS the hook. Biggest
   * danger closes it, as it closes every family's compact card (D286). */
  var LEVELS = {
    compact: ["size", "density", "inside", "navigation", "danger"],
    standard: ["size", "density", "composition", "temp", "visibility",
               "navigation", "inside", "danger"],
    full: null
  };

  CC.Stats.nebula = { sizeLy: sizeLy, densityOf: densityOf, formOf: formOf };
})();
