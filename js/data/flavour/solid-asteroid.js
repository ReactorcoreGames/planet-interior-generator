/* Asteroid — the flavour pools for the fragmented family.
 *
 * WHY IT IS NOT THE SOLID POOL, and this is the registry's own argument one
 * family further on: the solid lines are written in a mindset. "Pick a flat
 * spot and set down", "stable ground for landing", "the sky is the wrong
 * colour", "snow falls here, but it isn't water" — every one of those assumes
 * a body with a sky and a horizon. An asteroid has neither. It has a surface
 * you could throw a stone off.
 *
 * The mindset here is that the body is an OBJECT rather than a place: it is
 * something you go to, work on and leave. So the lines are about anchoring to
 * it, getting inside it, what it is worth and what it will do to a ship that
 * treats it like a world.
 *
 * Every line is still guarded by a fact the card shows, so nothing can be
 * rolled for a body it does not describe — see the registry's note on why a
 * roll is legitimate here and nowhere else. The facts this pool reads are the
 * ones js/gen/stats/asteroid.js assembles: `cohesion`, `voidFraction`,
 * `cells`, `materials`, `rubble`, `monolithic`, `metallic`, `escapeVelocity`.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  CC.Flavour.registerPools("asteroid", {

    danger: function (facts, add) {
      /* THE STRUCTURE IS THE DANGER, and it is the family's own hazard rather
       * than a borrowed one. Everything else here is cold and airless, which
       * is true of a great many bodies; being made of loose pieces is not. */
      add(facts.rubble,
        "The body itself. Anchor to the wrong fragment and it comes away with you.");
      add(facts.voidFraction > 0.14,
        "Voids you cannot see from outside. A drill finds them the hard way.");
      add(facts.rubble && facts.traits.indexOf("hollowed-out") >= 0,
        "Somebody excavated a rubble pile. Whatever held when they left may not still.");
      add(facts.escapeVelocity < 3,
        "Losing your grip. Escape velocity is under walking pace - a slip is a departure.");
      add(facts.traits.indexOf("shattered") >= 0,
        "It has already been broken once. The next impact finishes it.");
      add(facts.tempMin < -150,
        "Cold that makes metal brittle. Tools fail before people do.");
      add(facts.tempMax > 90,
        "It bakes on the sunward face. Nothing you leave outside survives a pass.");
      add(facts.starlight > 0.85,
        "Too close in. There is no atmosphere and no magnetic field between you and the star.");
      add(!facts.rubble,
        "Very little, honestly. It is a rock, and it will go on being a rock.");
    },

    notable: function (facts, add) {
      add(facts.monolithic,
        "A single unbroken block, which is rare enough to be worth a survey on its own.");
      add(facts.rubble,
        "It is not really one object. It is a few hundred that have not yet drifted apart.");
      add(facts.materials >= 4,
        "Four different rocks in the same body - this used to be several bodies.");
      add(facts.materials <= 2 && facts.cells > 0,
        "Uniform all the way through. Whatever it broke off was uniform too.");
      add(facts.traits.indexOf("hollowed-out") >= 0,
        "There is a chamber inside it that nothing natural cut.");
      add(facts.traits.indexOf("ice-rich") >= 0,
        "Ice packed into the gaps between the fragments, and it has been there a long time.");
      add(facts.traits.indexOf("mining-station") >= 0,
        "The workings are still bolted to the surface. Nobody has been back for them.");
      add(facts.voidFraction > 0.20,
        "More than a fifth of it is empty space. You could hide a great deal in here.");
      add(true, "It tumbles rather than spins. There is no fixed horizon anywhere on it.");
      add(true, "It has no name, only a catalogue number, and that number has been reused.");
    },

    resource: function (facts, add) {
      /* THE SPEC'S OWN FRAMING: "the reason to visit — metals, ice, or
       * somewhere to hide". All three are here, each guarded by the fact that
       * makes it true of this body. */
      add(facts.metallic,
        "Nickel-iron, in quantity, with no overburden to move. This is why anyone comes out here.");
      add(facts.traits.indexOf("ice-rich") >= 0,
        "Water ice in the voids - fuel, air and shielding from one hole in the ground.");
      add(facts.traits.indexOf("metal-rich") >= 0,
        "The whole body is metal under a skin of rubble. Somebody will want it.");
      add(facts.traits.indexOf("ore-deposits") >= 0,
        "Platinum-group metals near the surface, and no gravity well to lift them out of.");
      add(facts.traits.indexOf("mineral-veins") >= 0,
        "Seams running through the fragments, concentrated by whatever broke the parent body.");
      add(facts.voidFraction > 0.15,
        "Somewhere to hide, which out here is worth more than metal.");
      add(facts.escapeVelocity < 5,
        "Cheap to lift from. Anything you cut here leaves for almost nothing.");
      add(facts.materials >= 3,
        "Several materials in one body - you would not have to move between rocks to work it.");
    },

    approach: function (facts, add) {
      /* MATCHING VELOCITY WITH A ROCK IS NOT LANDING ON A WORLD, and the
       * distinction is the whole of this pool. There is no aerobraking, no
       * descent and no landing site — there is a rendezvous and an anchor. */
      add(facts.rubble,
        "Do not land. Match velocity and hold station - the surface will not take an anchor.");
      add(facts.monolithic,
        "You can anchor to this one properly, which is not true of most of them.");
      add(facts.escapeVelocity < 2,
        "Thrusting against it pushes it away. Every manoeuvre here moves the target.");
      add(facts.traits.indexOf("mining-station") >= 0,
        "There is already a berth on it, if the moorings have held.");
      add(facts.traits.indexOf("shattered") >= 0,
        "It is cracked through. Pick a face and stay off the fracture lines.");
      add(facts.hazardScore < 4,
        "Straightforward rendezvous. It is small, slow and it does not fight back.");
      add(true, "It tumbles. Matching rotation costs more fuel than getting here did.");
    }
  });
})();
