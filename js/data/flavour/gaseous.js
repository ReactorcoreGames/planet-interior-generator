/* Gaseous bodies — the flavour pools for `gas-giant` and `ice-giant`.
 *
 * THE MINDSET, and it is the whole reason this file exists separately from
 * solid.js: NOBODY LANDS HERE. The solid pools are written in terms of ground
 * — landing sites, flat spots, stable footing, weather that strips paint — and
 * every one of those lines, offered on a giant, quietly implies that arriving
 * at a surface was ever on the table.
 *
 * What replaces it is an industry that lives in three places:
 *
 *   IN ORBIT — stations, tugs, the ring and belt traffic. Always available.
 *   IN THE ENVELOPE, BRIEFLY — skimmers that dive the cloud tops for hydrogen
 *     and helium-3 and climb back out on what they collected. This is the
 *     canonical gas-giant operation and the one most settings can justify.
 *   IN THE ENVELOPE, PERMANENTLY — platforms hanging at neutral buoyancy, and
 *     pressure hulls rated for the deep. That last is a claim about the
 *     setting's technology rather than about the planet, so these lines
 *     describe what such an operation WOULD face rather than asserting one
 *     exists.
 *
 * Every guard still reads a fact the card also shows — see the registry.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  CC.Flavour.registerPools("gaseous", {

    /* ---- what would kill you first ------------------------------------ */

    /* NOTE WHAT IS ABSENT: nothing about vacuum, nothing about breathing,
     * nothing about a fall. The dangers of a giant are pressure, wind shear,
     * the magnetosphere, and the simple fact that down is a one-way trip. */
    danger: function (facts, add) {
      add(true,
        "The depth. There is no bottom to stand on - only the point where " +
        "the pressure decides how far you got.");
      add(facts.crushKm < 1200,
        "How shallow the crush point is. You have less margin here than the " +
        "size of the thing suggests.");
      add(facts.gravity > 2.4,
        "The well. At " + facts.gravity.toFixed(1) + " times Earth's pull, " +
        "anything that goes below the cloud tops is staying there.");
      add(facts.hasMetallicH && facts.interiorHeat > 0.5,
        "The magnetosphere. The dynamo down there throws out a radiation " +
        "belt that will kill a crew through the hull.");
      add(facts.radiation > 0.5,
        "Radiation, and there is nowhere to hide from it - no ground to put " +
        "between you and the sky.");
      add(facts.spread > 0.45,
        "Wind shear between the belts. They run in opposite directions and " +
        "the boundary will take a wing off.");
      add(facts.locked && facts.tempMax > 200,
        "The day side. The whole hemisphere is a standing storm and the " +
        "terminator jet is supersonic.");
      add(facts.tempMax > 250,
        "The heat at the tops. This one is close enough to its star to glow " +
        "in the infrared on its own account.");
      add(facts.tempMin < -190,
        "The cold. Everything you brought as a fluid is now a solid.");
      add(facts.hasWaterCloud,
        "The convection layer. Lightning down there runs on a scale nothing " +
        "on a rocky world approaches.");
      add(facts.traits.indexOf("great-storm") >= 0,
        "The storm. It is larger than most planets and has been running " +
        "longer than anyone has been watching.");
    },

    /* ---- notable conditions -------------------------------------------- */

    notable: function (facts, add) {
      add(true, "There is no surface. There is no depth at which there " +
                "starts to be one.");
      add(facts.deck && facts.deck.key === "deepfrozen",
        "The banding is so sharp you can count the belts from orbit with " +
        "the naked eye.");
      add(facts.deck && facts.deck.key === "stripped",
        "It has been stripped of its cloud decks. What is left is hot, bare " +
        "and almost featureless.");
      add(facts.hasSuperionic,
        "There is a shell down there where the ice conducts electricity and " +
        "the oxygen holds still while the hydrogen moves through it.");
      add(facts.icy && facts.tempMin < -180,
        "Cold enough that the methane in the air is what paints it blue.");
      add(facts.hasMetallicH,
        "Somewhere below the halfway point the hydrogen stops being a gas " +
        "and starts being a metal.");
      add(facts.interiorHeat > 0.7,
        "It radiates more heat than it receives. Whatever is happening down " +
        "there is still happening.");
      add(facts.locked,
        "One face has never turned away from its star. The terminator is a " +
        "permanent line of storms all the way round.");
      add(facts.gravity < 0.9,
        "It is spinning fast enough to be visibly flattened - the poles are " +
        "measurably closer to the centre than the equator.");
      add(true,
        "There is a level, a long way down, where the pressure and the " +
        "temperature are almost pleasant. Almost.");
      add(true,
        "Somewhere in the middle of it, the rain is not water.");
      /* Gated well above the ordinary crush depth, so it cannot land on a
       * body the Depth line has just called shallow. */
      add(facts.crushKm > 5500,
        "The survivable band is thicker than most worlds are wide.");
    },

    /* ---- resources ----------------------------------------------------- */

    /* THE CANONICAL GIANT INDUSTRY. Helium-3 skimming is the one operation
     * that needs no exotic technology at all, so it is offered on every body
     * here; the rest scale with what the picture actually shows. */
    resource: function (facts, add) {
      add(true,
        "Helium-3 in the upper envelope. Easy to scoop, expensive to ship, " +
        "and worth it anyway.");
      add(true,
        "Hydrogen without limit. Any ship that can get here can refuel here.");
      add(facts.hasWaterCloud,
        "Water, in a cloud deck thicker than most oceans. Anyone working " +
        "this system drinks from it.");
      add(facts.icy,
        "Ammonia and methane in industrial quantity, already separated by " +
        "depth for you.");
      add(facts.traits.indexOf("diamond-rain") >= 0,
        "Carbon, compressed. It falls as diamond and collects somewhere " +
        "nobody has reached.");
      add(facts.traits.indexOf("helium-rain") >= 0,
        "Helium separating out and raining inward - a sorting process no " +
        "refinery could match, happening for free.");
      add(facts.traits.indexOf("ring-system") >= 0,
        "The rings. Clean ice in gravel-sized pieces, already in orbit and " +
        "already broken up.");
      add(facts.hasMetallicH && facts.interiorHeat > 0.6,
        "The magnetic field itself. A tether in that flux generates power " +
        "you would otherwise need a reactor for.");
      add(facts.deck && facts.deck.key === "stripped",
        "Very little. The volatiles that made this worth visiting boiled " +
        "off a long time ago.");
    },

    /* ---- approach ------------------------------------------------------ */

    approach: function (facts, add) {
      add(true,
        "Aerobraking is free and generous - there is a great deal of " +
        "atmosphere to brake against, and it goes on for a long way.");
      add(facts.gravity > 2.4,
        "Stay high. The well is deep enough that a low orbit costs more to " +
        "leave than it saves.");
      add(facts.gravity < 1.1,
        "A shallow well for something this size. Skimmers can climb out on " +
        "what they collected.");
      add(facts.hasMetallicH && facts.radiation > 0.45,
        "Come in over a pole. The equatorial belts will dose a crew through " +
        "any hull you can afford to launch.");
      add(facts.locked,
        "Approach on the night side. The day side will cook your radiators " +
        "before you are close enough to matter.");
      add(facts.spread > 0.45,
        "Pick your latitude before you commit. The jets run in opposite " +
        "directions and crossing one under power is how skimmers are lost.");
      add(facts.crushKm < 1400,
        "Whatever you send down, keep it shallow. This one turns to liquid " +
        "sooner than the numbers suggest.");
      add(facts.traits.indexOf("shepherd-moons") >= 0,
        "Mind the shepherd moons. The gaps in the rings are gaps because " +
        "something is keeping them that way.");
    }
  });
})();
