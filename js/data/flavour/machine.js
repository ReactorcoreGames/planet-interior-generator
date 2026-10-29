/* Machine worlds — the flavour pools.
 *
 * The mindset is a building you have found (js/gen/stats/machine.js): who
 * made it, who is home, what it does. Every guard reads a fact the card
 * shows — the status, the wounds, the platforms, the cannon, the drive, the
 * growth.
 *
 * The spec's four lines are here, each guarded where it makes a claim: the
 * power core running with nobody answering only on an automated world, the
 * old scars only where the card reads the world as old. The cut
 * ancient-precursor trait lives here as the story its picture tells — an
 * overgrown hull on a dark or withered world is ancient (`age`, set beside
 * the card's Construction row so the two can never disagree).
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
    },

    notable: function (f, add) {
      /* Only where the Size row says "Moon" or larger, so it is the card's
       * own comparison, and not on every world. */
      add(f.radius * 2 >= 2900,
        "It's the size of a moon and every square metre of it was built by someone.");
      add(f.status === "automated" || f.status === "unmanned",
        "Nothing is answering hails, but the power core is still running.");
      add(f.wounds > 0 && (f.age === "old" || f.age === "ancient"),
        "The outer hull is scarred from something that happened a long time ago.");
      add(f.lit > 0.25 && f.lit <= 0.6,
        "There are lights on in " + f.litWord + " of the habitation levels. Somebody's home.");
      add(f.age === "ancient",
        "Whoever built it is gone. Nobody has found a picture of them, or a word they wrote.");
      add(f.age === "ancient",
        "It was old before anyone alive now learned to build anything.");
      add(f.age === "ageless" && (f.status === "crewed" || f.status === "hive"),
        "The people aboard didn't build it. They found it, and moved in.");
      add(f.age === "ageless" && (f.status === "automated" || f.status === "unmanned"),
        "The machines are still running, and nobody knows who left them on.");
      add(f.age === "building",
        "It isn't finished. Whole levels on the plans have nothing in them yet.");
      add(f.age === "unfinished",
        "Someone meant to finish this. Whatever stopped them, it stopped them all at once.");
      add(f.shells > 1,
        "It's hollow: shell inside shell inside shell, like a set of nesting dolls.");
      add(f.status === "hive",
        "There is no night here. Every deck runs in shifts, and every shift is full.");
      add(!f.habitation,
        "It was never meant for people. There isn't a corridor anywhere wide enough to walk down.");
      add(f.bore >= 0,
        "The whole world is a gun. The barrel runs from the reactor out through every shell.");
      add(f.engines === 1,
        "It moves. The whole world is a ship, and it is under way.");
      add(f.engines === 0 || f.engines === 2,
        "The whole world is a ship, built to cross between stars. Right now it is going nowhere.");
      add(f.deepest === "power-core" && !f.dark,
        "One breach goes deep enough to see the reactor's light from outside.");
      add(f.craft > 0 && f.dark,
        "There are still ships in the docking ports. Whoever flew them never left.");
    },

    resource: function (f, add) {
      add(f.reactor && !f.dark && f.power > 2e13,
        "Power, if you can tap it. The reactor makes more than whole civilisations use.");
      add(f.reactor && f.status === "offline",
        "The reactor. It's cold, but it would light a star system if anyone could restart it.");
      add(f.reactor && f.status === "emergency",
        "The reactor. It's barely ticking over, but it would light a star system if anyone could bring it back up.");
      add(f.wounds > 0 && f.dark,
        "Salvage. The breaches have already done the cutting for you.");
      add(f.wounds > 0 && f.torn,
        "Wreckage: plating, cable and whole sections of deck, drifting off the breaches.");
      add(f.core && f.dark,
        "The computer core. Whatever it remembers, nobody has read it yet.");
      add(f.craft > 0 && f.dark,
        "Ships, still in their docks. Some of them might even fly.");
      add(f.bore >= 0,
        "The cannon. Every power in the sector would trade a fleet for it.");
      add(f.engines >= 0,
        "The drive. Nobody else knows how to move a world.");
      add(f.status === "crewed" || f.status === "hive",
        "Trade. Anything made anywhere can be bought here, by the shipload.");
      add(f.status === "automated" || f.status === "unmanned",
        "Whatever the factories make. The lines are still running, and nobody is collecting.");
      add(f.building && !f.dark,
        "Raw material, stockpiled at the building sites and waiting to be fitted.");
      add(f.building && f.dark,
        "Half-built sections, and the stockpiles for the rest, left where they lay.");
      add(f.overgrown && !f.withered,
        "Whatever is growing on the hull. It lives on bare metal, and nobody knows how.");
    },

    approach: function (f, add) {
      add(f.openShafts > 0 && (f.status === "crewed" || f.status === "hive"),
        "Down an open shaft, with the traffic. It runs straight to the heart.");
      add(f.openShafts > 0 && f.status !== "crewed" && f.status !== "hive",
        "Down an open shaft. It runs straight to the heart, and nothing has closed it.");
      add(f.shafts > 0 && f.openShafts === 0,
        "Every shaft is sealed. You'll have to knock, or cut.");
      add(f.ports > 0 && (f.status === "crewed" || f.status === "hive"),
        "Hail the docking ports and wait to be given one.");
      add(f.ports > 0 && (f.status === "automated" || f.status === "unmanned"),
        "The docking ports still take ships. Nothing asks who you are.");
      add(f.wounds > 0 && !f.building,
        "Straight in through the breach. The shortest way inside is the one something else cut.");
      add(f.building,
        "Through the open building sites. Nobody is checking who comes in.");
      add(f.armed > 0 && (f.status === "crewed" || f.status === "hive"),
        "Slowly, and broadcasting who you are. The platforms are watching.");
      add(f.armed > 0 && (f.status === "automated" || f.status === "unmanned"),
        "Slowly. The platforms are watching, and there is nobody aboard to call them off.");
      add(f.platforms > 0 && f.armed === 0,
        "Past the weapon platforms. They are dark - for now.");
      add(f.engines === 1,
        "From ahead or alongside. Never from behind.");
      add(f.bore === 1 || f.bore === 2,
        "Anywhere but in front of the muzzle.");
      add(f.status === "offline",
        "With the floodlights on. Nothing in there is lit.");
      add(f.status === "hive",
        "Join the queue. Thousands of ships are ahead of you.");
      add(f.moss,
        "Carefully. The moss has grown over the docking ports, and nobody knows what's under it.");
    }
  });
})();
