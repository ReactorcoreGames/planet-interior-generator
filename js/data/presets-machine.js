/* Presets — the artificial family: the machine world.
 *
 * Registered into CC.Presets (js/data/presets.js), which must load first.
 * Values are in the DOM control's own units (0-100 for a percentage).
 *
 * SPANNED BY THE FAMILY'S OWN AXES: Operational status (Interior heat,
 * relabelled: offline, derelict, automated, crewed, hive) and Hull integrity
 * (Cohesion, relabelled: intact to torn to the reactor), with Optional layers
 * taking habitation away for a world nobody was meant to live in, and the
 * Under construction and Worldship traits for the two stories the dials
 * cannot tell. Planet-Cracker was removed with the cut of a captured natural
 * core (Session Z).
 *
 * The Derelict sits at 3%, not 0: just above zero is where the dial's own
 * "derelict" lives (red emergency lights, the reactor cold); 0 is offline,
 * not a light anywhere, a different and blanker picture.
 *
 * Only the traits a blurb contradicts are banned (`traitsOff`): a derelict
 * or a hive "under construction" is not what its name says, and one with a
 * drive is the Worldship preset; but a derelict overgrown or a hive with a
 * gun is still a derelict or a hive. */

var CC = CC || {};

(function () {
  "use strict";

  CC.Presets.register([
    {
      id: "derelict-machine-world",
      label: "Derelict Machine World",
      archetype: "machine-world",
      blurb: "Dark, breached and cold at the core. A few red emergency lights are all that is left running, and the wounds go deep into the shells.",
      set: { "interior-heat": 3, "cohesion": 40 },
      traits: [],
      traitsOff: ["under-construction", "worldship"]
    },
    {
      id: "hive-world",
      label: "Hive World",
      archetype: "machine-world",
      blurb: "Every window lit and every level crowded: the habitation decks full to bursting, the reactor running flat out, the hull whole.",
      set: { "interior-heat": 100, "cohesion": 100, "optional-layers": 100 },
      traits: [],
      traitsOff: ["under-construction", "worldship"]
    },
    {
      id: "automated-factory",
      label: "Automated Factory",
      archetype: "machine-world",
      blurb: "The reactor burns and the machinery runs, with nowhere aboard for anyone to live. Nobody is home, and nobody was ever meant to be.",
      set: { "interior-heat": 35, "cohesion": 85, "optional-layers": 0 },
      traits: [],
      traitsOff: ["under-construction", "worldship"]
    },
    {
      id: "unfinished-world",
      label: "Unfinished World",
      archetype: "machine-world",
      blurb: "Still being built: whole sections of the shells open to space, with clean edges, scaffolding and cranes working on them.",
      set: { "interior-heat": 50, "cohesion": 40 },
      traits: ["under-construction"],
      traitsOff: []
    },
    {
      id: "worldship",
      label: "Worldship",
      archetype: "machine-world",
      blurb: "A whole world built to travel, its drive bells clustered on one side and burning, a plume trailing behind it.",
      set: { "interior-heat": 65, "cohesion": 80 },
      traits: ["worldship"],
      traitsOff: []
    }
  ]);
})();
