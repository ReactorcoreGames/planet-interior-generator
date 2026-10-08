/* Compact objects — the stat template.
 *
 * THE MINDSET (D78 — a stat template is a MINDSET, not a list of rows):
 *
 * A star's card asks how the energy gets out. A neutron star's asks HOW MUCH
 * IS IN HOW LITTLE. Its whole hook is a scale that breaks intuition: more
 * mass than the Sun in something the size of a city. So the card leads with
 * the size AGAINST the mass, then what that does — the density, the gravity,
 * the spin — and only then the things you could measure from a safe distance:
 * the field, the temperature, the pulse.
 *
 * What it deliberately does not ask: what is underfoot, how deep you can
 * dive, how long it will burn. Nobody lands; nothing dives; it is not burning.
 *
 * EVERY NUMBER IS KEYED TO THE CONTROL THAT DREW IT. The spin figure moves the
 * vortex density, the field figure moves the magnetosphere, the temperature
 * moves the crust's lightness, and the beam tilt on the card is the angle the
 * beams are drawn at — read from `body.poles`, not from the slider, so the two
 * cannot disagree (see the rule at the top of js/gen/stats/registry.js).
 *
 * The black hole's card is a different mindset again and lands with it. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp, lerp = CC.Math.lerp;

  function round(v, n) {
    var k = Math.pow(10, n || 0);
    return Math.round(v * k) / k;
  }
  function sig(v) {
    if (v >= 1e12) return round(v / 1e12, 1) + " trillion";
    if (v >= 1e9) return round(v / 1e9, 1) + " billion";
    if (v >= 1e6) return round(v / 1e6, 1) + " million";
    return Math.round(v).toLocaleString("en-US");
  }

  /* ---- derivations ----------------------------------------------------- */

  /* SPIN: log-mapped, because the interesting values are orders of magnitude
   * apart. 0% is an old slow neutron star at about one turn every eight
   * seconds; 100% is a millisecond pulsar at ~700 turns a second. */
  function spinHz(spin) {
    return Math.pow(10, lerp(-0.9, 2.85, clamp(spin, 0, 1)));
  }

  /* FIELD, in gauss: 10^11 for an ordinary old neutron star, 10^15 at the top,
   * which is a magnetar. The slider is the exponent. */
  function fieldGauss(field) {
    return Math.pow(10, lerp(10.8, 15.2, clamp(field, 0, 1)));
  }

  /* SURFACE TEMPERATURE: from Surface heat, log-mapped — a cooling crust at
   * a few hundred thousand degrees, a newborn at a few million. The same
   * control dims the crust in the render (`heatValue`), so the number and the
   * picture move together. */
  function surfaceC(heat) {
    return Math.pow(10, lerp(5.25, 6.55, clamp(heat, 0, 1)));
  }

  /* MASS, in suns: the radius is rolled and the mass follows it, inversely —
   * a heavier neutron star is SMALLER, which is the strange part and worth
   * saying. 1.2 to 2.1 across the archetype's 10-13 km. */
  function massSuns(radius, range) {
    var t = clamp((radius - range[0]) / Math.max(1e-6, range[1] - range[0]), 0, 1);
    return round(lerp(2.1, 1.2, t), 2);
  }

  /* The comparisons are checked, not reached for: a kitchen blender is
   * ~300 turns a second, a car engine at full revs ~100, idling ~13, a
   * ceiling fan on full ~4. At the top, the equator's own speed is the
   * comparison, computed from the drawn radius. */
  function spinLine(hz, radius) {
    if (hz >= 100) {
      var frac = 2 * Math.PI * radius * hz / 299792;
      return Math.round(hz) + " turns a second - " +
             (hz >= 300 ? "faster than a kitchen blender, and " : "") +
             "the equator moves at " + Math.round(frac * 100) +
             "% of the speed of light";
    }
    if (hz >= 60) {
      return Math.round(hz) + " turns a second - a car engine at full revs, " +
             "for something heavier than the Sun";
    }
    if (hz >= 1) {
      return (hz >= 10 ? Math.round(hz) : round(hz, 1)) + " turns a second - " +
             (hz >= 10 ? "faster than a car engine idling"
                       : "like a ceiling fan on full") +
             ", for something heavier than the Sun";
    }
    return "once every " + round(1 / hz, 1) + " seconds - it has been " +
           "slowing down for millions of years";
  }

  function fieldLine(g) {
    var exp = Math.log(g) / Math.LN10;
    var vsFridge = g / 50;
    if (exp >= 14.2) {
      return "Magnetar - " + sig(vsFridge) + " times a fridge magnet. It would " +
             "wipe a credit card from halfway to the Moon";
    }
    if (exp >= 12.5) {
      return sig(vsFridge) + " times a fridge magnet - strong enough to " +
             "distort atoms into needles";
    }
    return sig(vsFridge) + " times a fridge magnet, which for one of these " +
           "is quiet";
  }

  function tempLine(c) {
    var m = c / 1e6;
    var head = m >= 1 ? round(m, 1) + " million C"
                      : (Math.round(c / 1000) * 1000).toLocaleString("en-US") + " C";
    if (c > 1.5e6) return head + " - newborn, and glowing in X-rays";
    if (c > 5e5) return head + " - still cooling from the explosion that made it";
    return head + " - an old crust, slowly going dark";
  }

  /* ---- the template ---------------------------------------------------- */

  CC.Stats.registerTemplate("compact", {
    build: function (body, details, settings, archetype, rng, shared) {
      var radius = shared.radius;
      var tags = archetype.tags || [];
      var P = body.poles || {};
      var heat = settings.interiorHeat === undefined ? 0.5 : settings.interiorHeat;
      var field = P.field === undefined ? 0.5 : P.field;
      var spin = P.spin === undefined ? 0.5 : P.spin;

      var mass = massSuns(radius, archetype.radiusKm || [10, 13]);
      var hz = spinHz(spin);
      var gauss = fieldGauss(field);
      var surfC = surfaceC(heat);
      /* Surface gravity in g: GM/r^2 against Earth's. Real physics, because
       * at this scale the honest number IS the evocative one (D177). */
      var gEarth = 6.674e-11 * mass * 1.989e30 / Math.pow(radius * 1000, 2) / 9.81;
      /* A pen dropped from waist height (1 m): v = sqrt(2 g h). Not the
       * escape velocity — that is from infinity, and is the figure people
       * misquote as the landing speed. */
      var penKmh = Math.sqrt(2 * gEarth * 9.81 * 1) * 3.6;
      var beamed = tags.indexOf("beamed") >= 0;
      var core = body.has("quark-core");

      var traits = (details.traits || []).map(function (t) { return t.id; });

      var facts = {
        family: "compact",
        radius: radius,
        mass: mass,
        spinHz: hz,
        fieldGauss: gauss,
        magnetar: field > 0.78,
        surfC: surfC,
        tempMin: surfC, tempMax: surfC,
        beamed: beamed,
        tiltDeg: P.tiltDeg || 0,
        lightCylinder: traits.indexOf("light-cylinder") >= 0,
        quarkCore: core,
        heat: heat,
        spin: spin,
        field: field,
        /* Under the universal pool's 0.62, whose line blames STELLAR FLARES.
         * This body's radiation is its own and its own pool says so (the
         * asteroid's D202 reasoning: never blame the sky for the source). */
        radiation: 0.5,
        sunless: false,
        locked: false,
        gravity: gEarth,
        atmosphere: { present: true, pressure: 0, text: "" },
        breathable: false,
        traits: traits
      };

      var hazard = CC.Hazard.of(facts);
      facts.hazardScore = hazard.score;

      var lines = [
        { key: "size", label: "Size",
          value: Math.round(radius * 2) + " km across - about the size of a " +
                 "city. You could drive round it in an afternoon" },
        { key: "mass", label: "Mass",
          value: mass + " times the Sun, in a ball the size of a city" },
        { key: "density", label: "Density",
          value: "A teaspoon of it would weigh about a billion tonnes" },
        { key: "gravity", label: "Gravity",
          value: sig(gEarth) + " times Earth's. A pen dropped from waist " +
                 "height would land at " + sig(penKmh) + " km/h" },
        { key: "spin", label: "Spin", value: spinLine(hz, radius) },
        { key: "field", label: "Magnetic field", value: fieldLine(gauss) },
        { key: "temp", label: "Surface temperature", value: tempLine(surfC) }
      ];
      if (beamed) {
        /* THE PULSE IS THE SPIN, said as the thing an observer sees. */
        lines.push({ key: "pulse", label: "Pulse",
          value: (hz >= 1 ? Math.round(hz) + " flashes a second"
                          : "one flash every " + round(1 / hz, 1) + " seconds") +
                 " - visible across the galaxy if a beam sweeps your way" });
        lines.push({ key: "tilt", label: "Beam tilt",
          value: Math.round(P.tiltDeg || 0) + " degrees from the spin axis - " +
                 "the reason it pulses rather than shines" });
      }
      lines.push({ key: "core", label: "Core",
        value: core ? "Unknown. Somewhere between neutrons and something " +
                      "nobody has a name for"
                    : "Superfluid all the way down - no exotic core on this one" });
      lines.push({ key: "notable", label: "Notable", value: CC.Flavour.notableOf(facts, rng) });
      lines.push({ key: "resources", label: "Resources", value: CC.Flavour.resourceOf(facts, rng) });
      lines.push({ key: "approach", label: "Approach", value: CC.Flavour.approachOf(facts, rng) });
      lines.push({ key: "danger", label: "Biggest danger", value: CC.Flavour.dangerOf(facts, rng) });

      return { lines: lines, facts: facts, hazard: hazard,
               levels: beamed ? LEVELS_BEAMED : LEVELS };
    }
  });

  /* `mass` in COMPACT, beside the size: the pair IS the hook. */
  var LEVELS = {
    compact: ["size", "mass", "gravity", "spin", "danger"],
    standard: ["size", "mass", "density", "gravity", "spin", "field", "temp",
               "danger"],
    full: null
  };
  var LEVELS_BEAMED = {
    compact: ["size", "mass", "pulse", "tilt", "danger"],
    standard: ["size", "mass", "density", "gravity", "pulse", "tilt", "field",
               "temp", "danger"],
    full: null
  };

  CC.Stats.compact = {
    spinHz: spinHz, fieldGauss: fieldGauss, surfaceC: surfaceC,
    massSuns: massSuns, sig: sig
  };
})();
