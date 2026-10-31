/* Nebulae — the flavour pools.
 *
 * The mindset is crossing, not arriving (js/gen/stats/nebula.js): no line
 * here assumes a surface, an orbit or a landing. Every guard reads a fact the
 * card shows — the form, the light, the materials, the traits. The spec's
 * four lines are here, guarded where they make a claim: stars forming in the
 * core only where young stars were drawn. `pirate-haven` and `sensor-shadow`
 * were cut as traits because they draw nothing a hidden station in a cavity
 * does not; they live here as the story that picture tells.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  function has(f, id) { return f.traits.indexOf(id) >= 0; }

  CC.Flavour.registerPools("nebula", {

    danger: function (f, add) {
      add(true, "Getting lost. There are no landmarks, and nobody can hear you call.");
      add(f.dark, "Flying blind. Whatever is in here, you meet it at the last moment.");
      add(f.materials.length > 0,
        "Solid matter you cannot see until it is on the screen, drifting in a haze " +
        "that hides it from every sensor.");
      add(has(f, "metal-belts"),
        "The metal. It is worth a fortune, and somebody else already thinks it is theirs.");
      add(has(f, "exotic-gas-pockets"),
        "The pockets of strange gas. Nobody agrees what is in them, and hulls " +
        "that pass through come out pitted.");
      add(f.form === "remnant",
        "The pulsar. Its beams sweep the whole shell, and being in one even " +
        "briefly is a dose you do not walk away from.");
      add(has(f, "derelict-fleet"),
        "Whatever happened to the last fleet that came in here.");
      add(has(f, "ringworld"),
        "The ring's own sun. Whatever runs the shadows round it decides who " +
        "gets daylight, and it has never answered a hail.");
      add(has(f, "bow-shocks"),
        "The shock fronts. Crossing one is like hitting surf at a thousand " +
        "kilometres a second.");
      add(has(f, "embedded-star") || has(f, "protostar-cluster"),
        "The young stars. They are still violent - flares, jets and enough " +
        "ultraviolet to strip a hull's paint.");
    },

    notable: function (f, add) {
      add(true, "It looks solid from outside. Inside, it's thinner than any " +
                "vacuum you could make in a lab - it just goes on for light-years.");
      add(f.youngStars > 0 || has(f, "protostar-cluster"),
        "Stars are forming in the core. Some of them have only been burning " +
        "a few thousand years.");
      add(f.form === "planetary",
        "This is what the Sun will leave behind: a glowing shell round a white " +
        "dwarf, fading over a few tens of thousands of years.");
      add(f.form === "remnant",
        "A star exploded here. The shell is still expanding at thousands of " +
        "kilometres a second, and the core it left behind spins many times a second.");
      add(f.emission && f.form === "cloud",
        "The glow is real starlight, reprocessed: the gas is lit up like the " +
        "tube in a neon sign.");
      add(f.reflection,
        "It makes no light of its own. Everything you see is borrowed from a " +
        "star outside it.");
      add(f.dark,
        "From outside it is a hole in the sky - a patch where the stars go missing.");
      add(has(f, "pillars"),
        "The pillars are being eaten by the starlight. In a few hundred " +
        "thousand years they will be gone.");
      add(has(f, "ringworld"),
        "A ring round its own sun, hidden in the gas. Nobody knows who built it, " +
        "or whether anyone still lives on the inside.");
      add(has(f, "ringworld"),
        "Seas and land along the inside of the ring, more ground than a " +
        "thousand worlds, and no record of it in any chart.");
      add(has(f, "dark-lanes"),
        "The rift is dust, not empty space. It is where the cloud is THICKEST.");
    },

    resource: function (f, add) {
      add(has(f, "metal-belts"), "Metal, loose in the gas, in dense drifts. No digging required.");
      add(has(f, "ice-belts"), "Ice - water, the one thing every ship runs out of.");
      add(has(f, "rock-belts") || has(f, "debris-fields"),
        "Rock to process, if you can find it in the haze.");
      add(has(f, "exotic-gas-pockets"),
        "The exotic gas. Worth more per litre than anything else out here, if " +
        "you can bottle it.");
      add(f.form === "remnant", "Heavy elements: a supernova makes the iron, " +
                                "gold and uranium a civilisation runs on.");
      add(has(f, "ringworld"),
        "Whatever is on the ring - living room, if it is empty, and a " +
        "neighbour, if it is not.");
      add(true, "Hydrogen, in quantity - if you can scoop a gas this thin.");
      add(true, "Cover. Nobody outside can see what happens in here.");
    },

    approach: function (f, add) {
      add(true, "There is no edge to cross. The gas just thickens, then thins again.");
      add(f.dark, "On instruments, slowly, and with the floodlights on.");
      add(f.form !== "cloud", "Through the hollow middle - the shell is the " +
                              "only part with anything in it.");
      add(f.form === "remnant", "Between sweeps of the beam, and never along the " +
                                "pulsar's axis.");
      add(has(f, "hidden-station"),
        "A good place to disappear, if you don't mind not being found either.");
      add(has(f, "hidden-station") && has(f, "cavity"),
        "Through the cavity. There is a station in there, and it has seen you " +
        "long before you see it.");
      add(f.materials.length > 0, "Around the drifts, not through them.");
      add(has(f, "ringworld"),
        "Toward the light that does not belong to the cloud. Come in over the " +
        "rim wall, never under the ring.");
    }
  });
})();
