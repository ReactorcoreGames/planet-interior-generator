/* Black holes — the flavour pools.
 *
 * A black hole's own family key ("black-hole"), not the compact pool: the
 * neutron star's lines are about a SURFACE you cannot land on, and a black
 * hole has no surface at all — "the tides pull a ship apart before it could
 * land" is wrong here in the most basic way. Every guard reads a fact the
 * card shows. The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  CC.Flavour.registerPools("black-hole", {

    danger: function (facts, add) {
      add(true, "Everything, from further away than you think.");
      add(facts.tideG > 100,
        "The tides. Long before the horizon, your feet are falling faster " +
        "than your head, and then they are not attached.");
      add(facts.tideG <= 1,
        "That it does not feel dangerous. You can cross the horizon without " +
        "noticing, and that is the last thing you ever do.");
      add(facts.disc,
        "The disc. It is the most energetic place in the universe, and it is " +
        "between you and the hole.");
      add(facts.jets,
        "The jets. Anything in their path is accelerated to nearly the speed " +
        "of light, or vaporised trying.");
    },

    notable: function (facts, add) {
      add(true, "The black part isn't a surface. It's just where light stops " +
                "coming back.");
      add(facts.disc, "The disc is bright enough to see from another galaxy. " +
                      "The hole itself is invisible.");
      add(true, "Time runs slower the closer you get. Long enough down there " +
                "and everyone you knew is dead.");
      add(facts.spinning,
        "It is spinning so fast it drags space round with it. Near the " +
        "horizon, nothing can stand still - not even in principle.");
      add(!facts.disc,
        "Dormant. Nothing is falling in, so there is nothing to see - only " +
        "stars going missing behind it.");
      add(facts.massClass === "supermassive",
        "There is one of these at the centre of nearly every galaxy, and this " +
        "is one of them.");
    },

    resource: function (facts, add) {
      add(facts.spinning,
        "Energy. A spinning black hole is the biggest battery there is, if " +
        "you can reach into the ergosphere and take some of its spin.");
      add(facts.disc, "The disc's light, collected from a very safe distance.");
      add(true, "None you would want to fetch.");
    },

    approach: function (facts, add) {
      add(true, "Stay well outside the closest safe orbit. Inside it there " +
                "are no orbits, only ways down.");
      add(facts.jets, "Approach along the disc plane - the jets fire along the " +
                      "spin axis, both ways.");
      add(facts.disc, "Through the disc's shadow, if at all. Its glare alone " +
                      "will burn out an unshielded sensor.");
    }
  });
})();
