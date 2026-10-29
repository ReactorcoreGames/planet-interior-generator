/* Machine worlds — the flavour pools.
 *
 * The mindset is a building you have found (js/gen/stats/machine.js): who
 * made it, who is home, what it does. Every guard reads a fact the card
 * shows — the status, the wounds, the platforms, the cannon, the drive, the
 * growth.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  CC.Flavour.registerPools("machine", {

    danger: function (f, add) {
      add(f.armed > 0,
        "The weapon platforms. " + f.armed + " of them are awake, and none has said what it wants.");
      add(f.armed > 0 && (f.status === "automated" || f.status === "unmanned"),
        "The defences. Automated systems don't ask who you are before they decide.");
      add(f.bore === 1,
        "The cannon. It is charged, and nobody knows what sets it off.");
      add(f.bore === 2,
        "The cannon. It cannot fire on emergency power - but something aboard is still trying to charge it.");
      add(f.engines === 1,
        "The drive plume. Anything behind this world is flying through its exhaust.");
      add(f.wounds > 0 && f.torn && !f.dark,
        "The breaches. They are still burning, and their edges will open a hull like paper.");
      add(f.wounds > 0 && f.torn && f.dark,
        "The wreckage. Plating and pillar spill out of the breaches, and drift round it in the dark.");
      add(f.status === "offline",
        "Nothing is answering, and nothing is lit. Dead, or waiting.");
      add(f.status === "emergency",
        "Something is keeping the emergency lights on. Nobody knows what.");
      add(f.status === "hive",
        "The traffic. Thousands of craft an hour come and go, and none of them give way.");
      add(f.building && !f.dark,
        "The building site. Cranes swing over open shafts and the welding never stops.");
      add(f.overgrown && !f.withered,
        "Whatever is growing on the hull. Some of it has got into the airlocks.");
    }
  });
})();
