/* Solid bodies — the flavour pools for the rocky family.
 *
 * THE MINDSET: you arrive at a surface. Landing sites, ground you can stand
 * on, air you might breathe, weather that strips paint. That frame is right
 * for a planet and is exactly what the gaseous file had to be written to
 * avoid; see js/data/flavour/registry.js.
 *
 * `moon`, `ice-moon` and `asteroid` will share these when they land at Phase 7.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  CC.Flavour.registerPools("solid", {
    danger: function (facts, add) {
    add(facts.spread > 0.5 && facts.locked,
      "Thermal shock at the terminator. Stepping from day to night is a " +
      Math.round(facts.tempMax - facts.tempMin) + "-degree change.");
    add(facts.locked && facts.tempMax > 250,
      "The day side. Your radiators will fail before your suit does.");
    add(facts.locked && facts.tempMin < -110,
      "The night side. The air itself is freezing out onto the ground.");
    add(facts.tempMax > 330 && !facts.locked,
      "The heat. Surface temperature is above the melting point of lead.");
    add(facts.tempMin < -120 && !facts.locked,
      "The cold. Unprotected exposure kills in under a minute.");
    add(!facts.atmosphere.present,
      "There's no atmosphere at all - your fluids would boil.");
    add(facts.atmosphere.present && !facts.atmosphere.breathable &&
        facts.atmosphere.pressure < 8,
      "Nothing to breathe. You have as long as you can hold your breath.");
    add(facts.atmosphere.pressure > 12,
      "Pressure. At sea level it's like being " +
      Math.round(facts.atmosphere.pressure * 10) + " metres underwater.");
    add(facts.radiation > 0.5 && facts.interiorHeat < 0.12,
      "Radiation. The core is dead, so there is no field to deflect any of it.");
    add(facts.gravity > 2.2,
      "Gravity. At " + facts.gravity.toFixed(1) +
      " times Earth normal, a fall is usually a fatal one.");
    add(facts.gravity < 0.08,
      "Almost no gravity at all. A careless push and you're in orbit.");
    add(facts.traits.indexOf("magma-chambers") >= 0,
      "The ground. Very little of it is as solid as it looks.");
    add(facts.dust,
      "The wind. It carries enough grit to strip paint in minutes.");
    },

    notable: function (facts, add) {
    add(facts.locked, "The sun hasn't moved in the sky since the world formed.");
    add(facts.locked, "One hemisphere has never seen daylight. The ice there is original.");
    add(facts.locked && facts.hasOcean,
      "There is a ring of open water between the boiling face and the frozen one.");
    add(facts.sunless && facts.interiorHeat > 0.6,
      "Unlit, and yet the ground is warm. Something down there is still burning.");
    add(facts.axialTilt > 0.55,
      "The poles are warmer than the equator. The whole world is lying on its side.");
    add(facts.axialTilt > 0.2 && facts.axialTilt <= 0.55,
      "One pole is buried in ice and the other is bare. The seasons here are violent.");
    add(facts.frozenFraction > 0.85, "Ice at the poles is old enough to hold a readable atmospheric record.");
    add(facts.radiation > 0.6 && facts.atmosphere.present,
      "The aurora is visible from the surface at all latitudes, constantly.");
    add(facts.traits.indexOf("void-pockets") >= 0,
      "There are caverns beneath the crust larger than most moons.");
    add(facts.traits.indexOf("impact-basin") >= 0,
      "The crust rings like a struck bell after any significant impact.");
    add(facts.traits.indexOf("cratered") >= 0,
      "Nothing has resurfaced here in a very long time. Every impact is still visible.");
    add(facts.interiorHeat < 0.1,
      "The magnetic field is gone. It stopped some time in the last billion years.");
    add(facts.interiorHeat > 0.85,
      "The whole body pulses on a cycle you can feel in your chest.");
    add(facts.gravity < 0.3, "It's spinning fast enough to be visibly flattened at the poles.");
    add(facts.atmosphere.pressure > 20,
      "It rains, evaporates before it lands, and rains again. Nothing reaches the ground.");
    add(facts.tempMax > 900 && facts.atmosphere.present,
      "Metallic rain - iron condenses in the upper atmosphere and falls as droplets.");
    add(facts.tempMin < -170,
      "Snow falls here, but it isn't water.");
    add(true, "The sky is the wrong colour and nobody agrees what to call it.");
    add(true, "Something down there is warmer than it has any right to be.");
    add(true, "The core is offset from the geometric centre. Nobody has explained why.");
    },

    resource: function (facts, add) {
    add(facts.traits.indexOf("ore-deposits") >= 0,
      "Heavy metals near enough the surface to be worth the trip.");
    add(facts.traits.indexOf("mineral-veins") >= 0,
      "Rare-earth deposits concentrated by ancient volcanic activity.");
    add(facts.traits.indexOf("metal-rich") >= 0,
      "The whole body is metal under a thin skin of rock. Somebody will want it.");
    add(facts.frozenFraction > 0.4, "Water ice in quantity, and shallow.");
    add(facts.hasOcean && facts.temperate > 0.2, "Deuterium-rich oceans.");
    add(facts.atmosphere.pressure > 3, "Helium-3 in the upper atmosphere. Easy scooping, hard shipping.");
    add(facts.interiorHeat > 0.8, "Exotic isotopes in the mantle that shouldn't form naturally.");
    add(facts.breathable, "Stable ground and a workable atmosphere - the rarest resources of all.");
    add(true, "Nothing of obvious value, which is its own kind of useful.");
    add(facts.tempMin < -60,
      "Crystalline formations that regrow after harvest on a decadal cycle.");
    },

    approach: function (facts, add) {
    add(facts.locked, "Approach on the night side. The day side will cook your radiators.");
    add(facts.atmosphere.pressure > 0.4 && facts.atmosphere.pressure < 6,
      "Aerobraking is viable, if you trust your heat shielding.");
    add(facts.gravity > 1.8, "The gravity well is deep. Getting down is easy; getting back up is expensive.");
    add(facts.landFraction < 0.02, "No dry landing sites. Everything here is liquid or moving.");
    add(facts.hazardScore < 4,
      "Straightforward approach. Plenty of stable ground for landing.");
    add(true, "Nothing unusual. Pick a flat spot and set down.");
    }
  });
})();
