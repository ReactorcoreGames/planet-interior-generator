/* Presets — the compact family: neutron star, pulsar, black hole.
 *
 * Registered into CC.Presets (js/data/presets.js), which must load first.
 * Values are in the DOM control's own units (0-100 for a percentage).
 *
 * SPANNED BY THE FAMILY'S OWN AXES. Starlight and Star colour are inert here
 * by declaration (`starlit: false`) and are not set, for the reason the
 * stellar presets drop them: setting them would make them look like knobs
 * that do something. What separates one compact object from another is
 * Field strength, Surface heat, Spin rate and Beam tilt (Star activity,
 * Interior heat, Spin rate and Axial tilt under their compact names), and on
 * a black hole Accretion rate, Spin rate and Mass class (Core size bias).
 *
 * The five PARAMETERS.md names are here (Magnetar, Millisecond Pulsar,
 * Feeding, Dormant, Supermassive); the rest fill the obvious gaps — a cold
 * old neutron star, a young pulsar, and a spinning black hole chosen to show
 * the interior off. */

var CC = CC || {};

(function () {
  "use strict";

  CC.Presets.register([
    {
      id: "magnetar",
      label: "Magnetar",
      archetype: "neutron-star",
      blurb: "The strongest magnets in the universe. A vast, wound-up field, and a crust that keeps cracking under it.",
      set: { "star-activity": 100, "interior-heat": 82, "spin-rate": 18 },
      traits: ["starquake-scars"],
      traitsOff: []
    },
    {
      id: "cooling-neutron-star",
      label: "Cooling Neutron Star",
      archetype: "neutron-star",
      blurb: "Old, slow and going dark. A calm field and a crust long past its fire.",
      set: { "star-activity": 15, "interior-heat": 8, "spin-rate": 10 },
      traits: [],
      traitsOff: ["starquake-scars", "glitching"]
    },
    {
      id: "accreting-neutron-star",
      label: "Accreting Neutron Star",
      archetype: "neutron-star",
      blurb: "Eating a companion. The field funnels the stolen gas down onto one pole.",
      set: { "star-activity": 55, "interior-heat": 70, "spin-rate": 60 },
      traits: ["accretion-stream"],
      traitsOff: []
    },
    {
      id: "millisecond-pulsar",
      label: "Millisecond Pulsar",
      archetype: "pulsar",
      blurb: "Spun up to hundreds of turns a second. Broad beams, a tight light cylinder, and the steadiest clock in the sky.",
      set: { "spin-rate": 100, "axial-tilt": 82, "star-activity": 30, "interior-heat": 45,
             "optional-layers": 100 },
      traits: ["light-cylinder"],
      traitsOff: []
    },
    {
      id: "young-pulsar",
      label: "Young Pulsar",
      archetype: "pulsar",
      blurb: "Fresh from its supernova: hot, fast and fiercely magnetic, and glitching as it settles.",
      set: { "spin-rate": 72, "axial-tilt": 45, "star-activity": 80, "interior-heat": 95 },
      traits: ["glitching"],
      traitsOff: []
    },
    {
      id: "beacon-pulsar",
      label: "Beacon Pulsar",
      archetype: "pulsar",
      blurb: "A lighthouse somebody uses. Relay stations on an even orbit, timing the pulse.",
      set: { "spin-rate": 55, "axial-tilt": 30, "star-activity": 50, "interior-heat": 55 },
      traits: ["navigation-beacon"],
      traitsOff: []
    },
    {
      id: "feeding-black-hole",
      label: "Feeding Black Hole",
      archetype: "black-hole",
      blurb: "A blazing, swollen disc and jets firing both ways along the spin axis.",
      set: { "accretion-rate": 100, "spin-rate": 70, "core-bias": -60 },
      traits: [],
      traitsOff: []
    },
    {
      id: "dormant-black-hole",
      label: "Dormant Black Hole",
      archetype: "black-hole",
      blurb: "Nothing falling in. Almost entirely black - only stars going missing behind it.",
      set: { "accretion-rate": 0, "spin-rate": 0, "core-bias": -40 },
      traits: [],
      traitsOff: ["tidal-disruption"]
    },
    {
      id: "spinning-black-hole",
      label: "Spinning Black Hole",
      archetype: "black-hole",
      blurb: "Turning near its limit: space dragged round outside the horizon, a blazing inner horizon and a ring singularity inside it.",
      set: { "accretion-rate": 55, "spin-rate": 96, "core-bias": -20 },
      traits: [],
      traitsOff: []
    },
    {
      id: "supermassive",
      label: "Supermassive",
      archetype: "black-hole",
      blurb: "A billion suns at the centre of a galaxy. Gentle tides at the horizon, a cooler disc, jets thousands of light-years long.",
      set: { "core-bias": 100, "accretion-rate": 50, "spin-rate": 60 },
      traits: [],
      traitsOff: []
    }
  ]);
})();
