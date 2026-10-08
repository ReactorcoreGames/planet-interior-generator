/* Compact objects — the flavour pools.
 *
 * THE MINDSET (D78, applied to the pools as to the template): the solid pools
 * assume you land, the gaseous pools assume you dive, the stellar pools
 * assume you keep your distance from a furnace. A compact object is past all
 * three. Nobody lands, nothing dives, and the distance that matters is the one
 * at which its tides or its field stop being fatal — which is a long way out.
 *
 * So the lines answer: what it would do to you (and from how far), what it is
 * useful for anyway (a clock, a lighthouse, a laboratory), and what makes it
 * strange. Every guard reads a fact the card also shows. The black hole's
 * lines arrive with it, guarded by facts only its template sets.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  CC.Flavour.registerPools("compact", {

    danger: function (facts, add) {
      add(true,
        "Everything. The tides pull a ship apart lengthwise long before it " +
        "could land.");
      add(true,
        "The gravity. Anything that falls in arrives at a few percent of the " +
        "speed of light, and the impact is a small nuclear explosion.");
      add(facts.magnetar,
        "The field. Inside a thousand kilometres it rearranges the chemistry " +
        "of anything with atoms in it, crew included.");
      add(facts.magnetar,
        "Starquakes. A magnetar's crust cracks and the flare outshines a " +
        "galaxy for a tenth of a second.");
      add(facts.beamed,
        "The beam. If it sweeps across you at close range, nothing survives it.");
      add(facts.heat > 0.7,
        "The X-rays. It is still millions of degrees, and it shines in a " +
        "colour that cooks electronics.");
    },

    notable: function (facts, add) {
      add(true,
        "A city-sized ball with more mass than the Sun. Physics stops making " +
        "sense here.");
      add(facts.spinHz > 50,
        "It spins hundreds of times a second and the surface is smoother " +
        "than glass.");
      add(facts.quarkCore,
        "Nobody knows what the core is made of. The answer is somewhere " +
        "between 'neutrons' and 'something we don't have a name for'.");
      add(true,
        "The tallest mountain on it is a few millimetres high.");
      add(facts.beamed,
        "The pulse is so regular you could set a clock by it. People do.");
      add(facts.beamed,
        "A lighthouse that has been running since before there were eyes to " +
        "see it.");
      add(facts.beamed && facts.spinHz > 200,
        "A millisecond pulsar: spun up by eating a companion star, and now " +
        "the steadiest clock in the sky.");
      add(facts.spinHz < 0.5,
        "It has been slowing for millions of years. One day it will simply " +
        "stop flashing.");
    },

    resource: function (facts, add) {
      add(facts.beamed,
        "Timing. Its pulse is a navigation fix for anyone in the galaxy who " +
        "can hear it.");
      add(true,
        "Physics. Matter here is in states no laboratory can make.");
      add(true,
        "None you could reach. The surface is not a place; it is a boundary " +
        "condition.");
      add(facts.magnetar,
        "The field, if you could tap it - but nothing built could stand " +
        "close enough.");
    },

    approach: function (facts, add) {
      add(true,
        "Observation from a safe orbit only - safe meaning a few thousand " +
        "kilometres, minimum.");
      add(facts.beamed,
        "Stay out of the beam plane. Approach along the spin axis, where the " +
        "beams never point.");
      add(facts.lightCylinder,
        "Do not cross the light cylinder. Past it, the field is moving faster " +
        "than anything should.");
      add(facts.magnetar,
        "Unmanned probes only, and expect to lose them.");
    }
  });
})();
