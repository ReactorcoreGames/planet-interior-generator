/* Stars — the flavour pools for the stellar family.
 *
 * THE MINDSET, and it is the whole reason this file exists separately (D78,
 * which applies to the pools exactly as it applies to the stat template):
 *
 * THE SOLID POOLS ASSUME YOU LAND. THE GASEOUS POOLS ASSUME YOU DIVE. NEITHER
 * IS AVAILABLE HERE. A giant's card at least offers a ladder from orbit down
 * to a pressure hull; on a star every rung of that ladder is "no", and a pool
 * written in those terms would be a list of things that are impossible rather
 * than a description of a body.
 *
 * So the questions these lines answer are about a star's RELATIONSHIP TO
 * EVERYTHING ELSE, which is the only place a star is interesting to a person:
 *
 *   WHAT IT DOES TO ITS SYSTEM — the light, the wind, the flares, the
 *     habitable zone, whether anything nearby survives being nearby.
 *   WHAT IT IS DOING TO ITSELF — burning fast, burning slowly, swelling,
 *     shedding, or holding steady for another eight billion years.
 *   WHAT YOU CAN TAKE FROM IT, which is energy and never material — the one
 *     genuine resource answer for this family, and the reason the Dyson and
 *     collector traits exist.
 *   WHAT IT LOOKS LIKE FROM A DISTANCE THAT IS NOT FATAL, since that is the
 *     only distance anyone will ever see it from.
 *
 * Every guard reads a fact the card also shows — see the registry. Note that
 * `facts.sunless` is declared false in the stellar template precisely so the
 * universal pool's "there is no sun" line can never be offered here: this
 * body IS the sun.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  CC.Flavour.registerPools("stellar", {

    /* ---- what would kill you first ------------------------------------ */

    /* NOTE WHAT IS ABSENT: nothing about footing, nothing about pressure at
     * depth, nothing about breathing. A star's dangers are all delivered at
     * range, which is a genuinely different category from every other family's
     * — the hazard is not where the body is, it is how far its reach extends. */
    danger: function (facts, add) {
      add(true,
        "It is a star. There is no approach distance that is safe so much as " +
        "distances that are survivable for a while.");
      add(facts.activity > 0.62,
        "Flares. They arrive at the speed of light, which means the warning " +
        "and the event are the same moment.");
      add(facts.activity > 0.80,
        "The coronal mass ejections. One of them will put more energy through " +
        "your hull than your reactor makes in a year.");
      add(facts.luminosity > 40,
        "The light itself. At this output, radiators fail before crews do, " +
        "and after that nothing else matters.");
      add(facts.evolved,
        "It is unstable. The envelope pulses, and the distance that was safe " +
        "last month is inside the photosphere this month.");
      add(facts.shedding,
        "The shed material. It is thin enough to fly through and dense " +
        "enough to strip a hull over a long enough transit.");
      add(facts.transport === "convective-core",
        "It is young and it has not settled. The output is not steady, and " +
        "nothing that depends on it should be either.");
      add(facts.habitableZone < 0.2,
        "Anything in the habitable zone is close enough to be in the flare " +
        "envelope. Warm and irradiated are the same orbit here.");
    },

    /* ---- what is worth knowing ----------------------------------------- */

    notable: function (facts, add) {
      add(facts.transport === "fully-convective",
        "It has no radiative zone at all. The whole star turns over, which " +
        "is why it can burn every gram of fuel it has instead of just the core.");
      add(facts.transport === "convective-core",
        "Its interior is inside out compared with a star like the Sun - the " +
        "convection is at the centre and the calm is on the outside.");
      add(facts.hasTachocline,
        "The shear layer between the convective and radiative zones is where " +
        "the entire magnetic field comes from. A few thousand kilometres " +
        "deciding what the whole star does.");
      add(facts.evolved,
        "It has already stopped fusing in its core. Everything you can see is " +
        "the corpse swelling around a shell that is still burning.");
      add(facts.core && facts.core.volShare < 0.0005,
        "The part actually generating the energy is smaller than a planet, " +
        "and it is holding up something you could fit a solar system inside.");
      add(facts.shedding,
        "It is shedding the material that will build the next generation of " +
        "worlds. This is where the heavy elements come from.");
      add(facts.spotted && facts.activity > 0.5,
        "It is spotted heavily enough that its brightness measurably changes " +
        "as it rotates.");
      add(facts.luminosity < 0.05,
        "It puts out so little light that a world would have to sit almost on " +
        "top of it to be warm - and it will still be doing so in a trillion " +
        "years.");
      add(facts.young,
        "It is still surrounded by the material it formed from. The planets " +
        "here have not finished being planets yet.");
    },

    /* ---- what you would come here for ---------------------------------- */

    /* A STAR'S RESOURCE IS ENERGY AND ONLY ENERGY. Every other family answers
     * this question with material — ore, volatiles, hydrogen, helium-3 — and
     * doing so here would be the same category error as offering a landing
     * site. What a star has is output, and the only question is what fraction
     * of it you are equipped to intercept. */
    resource: function (facts, add) {
      add(true,
        "Energy, in quantities that make the question 'how much' meaningless. " +
        "The limit is entirely what you can build to catch it.");
      add(facts.luminosity > 4,
        "Output on a scale that makes a collector array pay for itself before " +
        "it is finished being built.");
      add(facts.luminosity < 0.3,
        "Not much, per square metre - but it is steady, and it will still be " +
        "steady when everything else in the catalogue has burned out.");
      add(facts.shedding,
        "The shed envelope is thin, cool and full of heavy elements. Easier " +
        "to mine than any planet, if you can stand the transit.");
      add(facts.traits.indexOf("orbital-mirrors") >= 0,
        "Somebody already answered this question. Whether they are still here " +
        "to collect is another matter.");
      add(facts.traits.indexOf("stellar-collector") >= 0,
        "There is already infrastructure in place taking a share of the output.");
      add(facts.activity > 0.7,
        "The flares themselves, if you have something that can take a charge " +
        "and survive delivering it.");
    },

    /* ---- getting there -------------------------------------------------- */

    approach: function (facts, add) {
      add(true,
        "From a long way out, and then no closer. Everything useful about a " +
        "star is measured rather than visited.");
      add(facts.activity > 0.62,
        "Time it between flares, or accept that you cannot time it at all.");
      add(facts.evolved,
        "The outer envelope is thin enough to fly through - carefully, and " +
        "only if you are certain where its edge is this week.");
      add(facts.habitableZone > 4,
        "Anything worth visiting in this system is a long way out. The star " +
        "is the least of the transit problem.");
      add(facts.hasCorona && facts.activity > 0.5,
        "The corona reaches further than the instruments suggest. Plan the " +
        "closest approach against the streamers, not against the disc.");
      add(facts.traits.indexOf("binary-companion") >= 0,
        "There are two of them, and the space between is not a place to be.");
    }
  });
})();
