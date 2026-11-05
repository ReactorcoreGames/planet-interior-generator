/* Presets — the gas giant and the ice giant.
 *
 * Split out of js/data/presets.js, which passed the 500-line rule. Registered
 * into CC.Presets, which must load first; values are in the DOM control's own
 * units. Load order is gallery order, so these files stay in family order. */

var CC = CC || {};

(function () {
  "use strict";

  CC.Presets.register([
    /* ------------------------------------------------------------------ *
     * Gaseous — gas-giant and ice-giant
     * ------------------------------------------------------------------ *
     *
     * A GIANT'S PRESETS ASK DIFFERENT QUESTIONS, which is D78's stat-card
     * lesson one level up. The solid presets are spanned by "how much sea,
     * how much air, how tilted" — every one of them is a claim about a
     * SURFACE. A giant has none, so those axes do not merely take different
     * values here, they do not apply.
     *
     * What separates one giant from another is:
     *
     *   1. STARLIGHT, which is the big one, because it moves the cloud deck.
     *      Cold gives a pale ammonia deck at sharp banding; hot drives the
     *      condensation level below the visible layer and leaves dark, ruddy,
     *      cloud-stripped gas. That is the phase's named done-condition
     *      (roadmap/phase-5-gaseous.md) and it is worth two presets on its
     *      own, at the two ends.
     *   2. INTERIOR HEAT, which is whether the thing still glows from within.
     *   3. TRAITS, which carry the named features — one Great Storm, a ring
     *      system, an industry.
     *
     * So the set below is temperature x industry x ornament. `ocean-depth`
     * and `tidal-lock` are deliberately absent from every one of them: they
     * are surface controls, and setting them here would be the "planet's card
     * with holes in it" mistake in preset form.
     *
     * NOTE ON HUE. A giant's primary hue drives the envelope, and the cloud
     * deck's `climateLean` perturbs it rather than replacing it (see
     * js/data/archetypes/gaseous.js). So these hues are chosen to be a good
     * BASE for that perturbation, not to be the colour you end up seeing. */

    {
      id: "banded-giant",
      label: "Banded Giant",
      archetype: "gas-giant",
      /* The Jupiter case, and the family's baseline picture. Cold enough for
       * a pale ammonia deck at full sharpness, with a Great Storm sitting IN
       * a belt of smaller ones — D83, which is exactly the combination that
       * was wrongly forbidden and is the best-looking one the family has. */
      blurb: "Cream and ochre bands, and one storm bigger than a world.",
      set: {
        "starlight": 30,
        "interior-heat": 60,
        "star-activity": 25,
        "optional-layers": 80,
        "primary-hue": 34,
        "saturation": 96,
        "brightness": 104,
        "contrast": 118
      },
      traits: ["great-storm", "storm-belts"],
      traitsOff: ["ringlet-system"]
    },
    {
      id: "hot-jupiter",
      label: "Hot Jupiter",
      archetype: "gas-giant",
      /* THE STARLIGHT DEMONSTRATION, at the opposite end from Banded Giant.
       * Same family, same machinery, and the deck is driven below the visible
       * layer: what is left is the deeper chromophore-stained gas, dark and
       * saturated, with the banding washed out rather than drawn differently.
       * Star activity is high because a world this close to its star is being
       * scoured by it. */
      blurb: "Close enough to bake. The clouds are far below, and it shows.",
      set: {
        "starlight": 96,
        "interior-heat": 74,
        "star-activity": 78,
        "optional-layers": 40,
        "primary-hue": 18,
        "saturation": 120,
        "brightness": 88,
        "contrast": 96
      },
      traits: ["violent-banding"],
      traitsOff: ["ringlet-system"]
    },
    {
      id: "ringed-giant",
      label: "Ringed Giant",
      archetype: "gas-giant",
      /* The Saturn case, where THE RINGS ARE THE SUBJECT and the body is the
       * calm pale thing they orbit. Deliberately low contrast and a soft
       * near-cream envelope: a busy body would fight its own rings, and the
       * storms are switched off for the same reason. */
      blurb: "Pale and quiet. Everything interesting is in orbit.",
      set: {
        "starlight": 24,
        "interior-heat": 44,
        "star-activity": 20,
        "optional-layers": 70,
        "primary-hue": 44,
        "saturation": 62,
        "brightness": 112,
        "contrast": 88
      },
      traits: ["ringlet-system"],
      traitsOff: ["great-storm", "violent-banding"]
    },
    {
      id: "industrial-giant",
      label: "Industrial Giant",
      archetype: "gas-giant",
      /* THE INHABITED ONE. Both industry traits at once, because a platform
       * without skimmer tracks is a building with no traffic — the two read
       * as one economy rather than as two ornaments. Mid Starlight so the
       * deck is present and legible: the platforms need cloud to be working
       * ABOVE, and D80's hull material is deliberately near-neutral so it
       * reads as an intruder against whatever the envelope is doing. */
      blurb: "Somebody is down there, skimming the clouds for fuel.",
      set: {
        "starlight": 52,
        "interior-heat": 56,
        "star-activity": 30,
        "optional-layers": 75,
        "primary-hue": 30,
        "saturation": 84,
        "brightness": 100,
        "contrast": 110
      },
      traits: ["gas-miner-platforms", "skimmer-tracks"]
    },
    {
      id: "ice-giant",
      label: "Ice Giant",
      archetype: "ice-giant",
      /* THE NEPTUNE BASELINE — the ice giant as you would picture it, so the
       * hue is the deep blue the family is known for and the interior runs
       * cool. Helium rain is the signature interior feature (D87: it BEADS,
       * a fluid leaving a fluid) and it is the one that says "this is not
       * simply a smaller gas giant". */
      blurb: "Deep blue and bitterly cold, with helium falling through it.",
      set: {
        "starlight": 16,
        "interior-heat": 34,
        "star-activity": 20,
        "optional-layers": 78,
        "primary-hue": 208,
        "saturation": 104,
        "brightness": 96,
        "contrast": 104
      },
      traits: ["helium-rain"],
      traitsOff: ["ringlet-system"]
    },
    {
      id: "diamond-sea",
      label: "Diamond Sea",
      archetype: "ice-giant",
      /* D92, corrected by looking up the physics: methane cracks under
       * pressure, the carbon compresses into diamond, and the crystals SINK
       * through the deep envelope until it is hot enough that they melt into
       * liquid carbon. So there is no diamond floor — the picture is the fall
       * itself, which is why this preset runs a HOT interior. A cold one
       * would not be doing the thing the name describes. */
      blurb: "Carbon crushed into crystal, falling through the deep envelope.",
      set: {
        "starlight": 22,
        "interior-heat": 88,
        "star-activity": 25,
        "optional-layers": 85,
        "primary-hue": 196,
        "saturation": 92,
        "brightness": 100,
        "contrast": 112
      },
      traits: ["diamond-rain"],
      traitsOff: ["ringlet-system"]
    },
    {
      id: "prismatic-giant",
      label: "Prismatic Giant",
      archetype: "ice-giant",
      /* Exotic water-ice phases (ice VII, ice X) growing CROSSWISE in the
       * mantle's shear rather than falling through it — D92's other half, and
       * the family's one genuine excuse for colour, since the crystals are
       * actually birefringent. The narrow per-body hue band means this preset
       * looks different on each seed while never reading as confetti. Raised
       * contrast because the whole point is a refraction effect. */
      blurb: "Exotic ice, growing sideways, splitting the light.",
      set: {
        "starlight": 20,
        "interior-heat": 62,
        "star-activity": 22,
        "optional-layers": 88,
        "primary-hue": 232,
        "saturation": 110,
        "brightness": 98,
        "contrast": 124
      },
      traits: ["prismatic-ice"],
      traitsOff: ["ringlet-system"]
    }
  ]);
})();
