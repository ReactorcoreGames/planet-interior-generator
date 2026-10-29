/* The scale bar's comparison ladder — what the silhouette beside the bar can
 * be (draw/scalebar.js, D285).
 *
 * THE SILHOUETTE IS CHOSEN, NOT PICKED (D282). Drawn at true scale, almost
 * any fixed comparison is sub-pixel against almost every body: a person beside
 * a planet, Earth beside a nebula. So the bar walks this ladder and draws the
 * LARGEST rung whose true-scale size fits the corner — big enough to see, small
 * enough to sit beside the bar. Zoom moves the pixels, so zoom can move the
 * choice: a giant shows Earth at 1x and the Moon close up. Nothing fitting
 * means no silhouette.
 *
 * SIZES ARE REAL, IN KM. `w` and `h` are the silhouette's bounding box: a
 * disc's diameter both ways, a mountain's height with its base, a city's width
 * with a stylised skyline (true-scale towers would be a hairline). The fit is
 * tested on the larger of the two.
 *
 * THE RUNGS ARE SPACED SO NO BODY FALLS BETWEEN TWO. The bar accepts a
 * silhouette from 5px to 25% of the frame — a 50x window — so neighbouring
 * rungs sit at most ~50x apart wherever a body can be. The one wider step,
 * Neptune's orbit to the inner Oort cloud, spans sizes no archetype reaches.
 *
 * Relatable beats exhaustive (CLAUDE.md, "stats are for laypeople"): a jumbo
 * jet and a skyscraper, not a list of asteroids. Ceres and Arcturus are here
 * only because the gaps they fill have no household name. */

var CC = CC || {};

CC.ScaleLadder = (function () {
  "use strict";

  var AU = 1.496e8;

  /* Smallest first. `shape` names one of draw/scalebar.js's silhouettes. */
  var RUNGS = [
    { id: "person",        name: "A person",        shape: "person",     w: 0.00055, h: 0.0018 },
    { id: "jet",           name: "A jumbo jet",     shape: "jet",        w: 0.070,   h: 0.019 },
    { id: "skyscraper",    name: "A skyscraper",    shape: "tower",      w: 0.09,    h: 0.5 },
    { id: "town",          name: "A town",          shape: "town",       w: 5,       h: 0.7 },
    { id: "everest",       name: "Mount Everest",   shape: "mountain",   w: 21,      h: 8.8 },
    { id: "city",          name: "A large city",    shape: "city",       w: 40,      h: 4.8 },
    { id: "ceres",         name: "Ceres",           shape: "disc",       w: 940,     h: 940 },
    { id: "moon",          name: "The Moon",        shape: "disc",       w: 3474,    h: 3474 },
    { id: "earth",         name: "Earth",           shape: "disc",       w: 12742,   h: 12742 },
    { id: "jupiter",       name: "Jupiter",         shape: "banded",     w: 139820,  h: 139820 },
    { id: "sun",           name: "The Sun",         shape: "disc",       w: 1.3927e6, h: 1.3927e6 },
    { id: "arcturus",      name: "Arcturus, a red giant", shape: "disc", w: 3.54e7,  h: 3.54e7 },
    { id: "earth-orbit",   name: "Earth's orbit",   shape: "orbit",      w: 2 * AU,  h: 2 * AU },
    { id: "neptune-orbit", name: "Neptune's orbit", shape: "orbit",      w: 60 * AU, h: 60 * AU },
    { id: "inner-oort",    name: "Inner edge of the Oort cloud", shape: "cloud", w: 4000 * AU, h: 4000 * AU },
    { id: "oort",          name: "The Oort cloud",  shape: "cloud",      w: 200000 * AU, h: 200000 * AU }
  ];

  /* The largest rung whose larger side, at `kmPerPx`, lands in [minPx, maxPx];
   * null when none does. */
  function pick(kmPerPx, minPx, maxPx) {
    for (var i = RUNGS.length - 1; i >= 0; i--) {
      var px = Math.max(RUNGS[i].w, RUNGS[i].h) / kmPerPx;
      if (px <= maxPx && px >= minPx) return RUNGS[i];
    }
    return null;
  }

  return { rungs: RUNGS, pick: pick };
})();
