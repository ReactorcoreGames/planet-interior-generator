/* Gaseous bodies — `gas-giant` and `ice-giant`.
 *
 * See docs/celestials/gaseous-bodies.md for the spec and
 * js/data/archetypes/registry.js for what every field means.
 *
 * THIS FILE IS THE GENERALISATION TEST (docs/roadmap/phase-5-gaseous.md). The
 * architecture claims a new body family is a data edit; everything below is
 * data, and nothing in js/draw/ knows either of these bodies exists. What the
 * phase needed beyond data was three GENERAL recipe fields in gen/elemgen.js —
 * `alternate` (cycle a band's tone), `bandWidth` and `zonal` (a tangential,
 * counter-rotating jet) — each of which any future family can use, plus the
 * D22 zone-table move out of draw/film.js and into archetype data.
 *
 * The registry must load before this file.
 *
 * THE STORY IS DEPTH AND PRESSURE, not "what is at the centre". The size
 * contrast between the tiny core and the vast envelope is the picture, and the
 * frac tables below are set so it is immediately visible.
 *
 * THE CLIMATE DECLARATION, decided deliberately (climate-foundation.md asked
 * for a written answer): both bodies declare `latitude: 0.12`, not zero and
 * not omitted.
 *
 *   - NOT a terrestrial 1.0, because a giant's bands are driven by ROTATION,
 *     not by insolation. A strong polar term would be a physical claim these
 *     bodies do not make, and it would put a polar cap on a world with no
 *     surface to deposit one on.
 *   - NOT omitted either, because a flat field would mean the poles and the
 *     equator of the envelope are identical, and 0.12 is enough for the
 *     cloud-species blend below to shade slightly toward the poles without
 *     ever creating a cap. The only terrain field in either stack is on the
 *     buried rock floor, thousands of kilometres down and occluded by the
 *     whole envelope, so the one place deposition could put ice is a place
 *     nobody is looking at — which is the structural guarantee behind the
 *     small number.
 *
 * STARLIGHT DRIVES CLOUD SPECIES, which is the phase's named done-condition.
 * See `climateLean` on the cloud layers: ammonia, ammonium hydrosulphide and
 * water condense at different temperatures, so a cold giant shows a pale
 * ammonia deck and a hot one shows its deck driven deep and reading as a
 * dark, ruddy, cloud-stripped envelope. It reads `chillAt` / `scorchAt` — the
 * SAME two figures the frosting reads (D42: one physical fact, one
 * threshold) — and never authors a second ramp against `tempAt`. */

var CC = CC || {};

(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * Shared gaseous vocabulary
   * ------------------------------------------------------------------ */

  /* WHAT THE CLOUD DECK IS MADE OF, AS A FUNCTION OF HOW COLD IT IS.
   *
   * `climateLean` is the climate field's counterpart to `heatLean`: where
   * `heatLean` says "this layer's material changes with the body's own
   * interior heat", this says "this layer's material changes with how much
   * light the star delivers". Both are perturbations of the rolled colour
   * (zones.js rule 1) rather than replacements, so the same seed under three
   * Starlight settings gives three visibly different worlds that are still
   * recognisably the same world.
   *
   *   chill  where the layer travels as the body freezes  (reads chillAt)
   *   scorch where it travels as the body bakes           (reads scorchAt)
   *
   * The two are mutually exclusive in practice because chillAt and scorchAt
   * are the ends of one temperature ramp and are never both non-zero.
   *
   * COLD: an ammonia deck is high, thick and PALE — a bright, low-saturation
   * white-cream, which is what Jupiter's zones actually are.
   * HOT: the condensation level is driven below the visible layer, so what
   * you see is the deeper, darker, chromophore-stained gas — ruddy, saturated
   * and dim. That is the "hot puffy world with its cloud deck driven deep"
   * the spec describes, and it is a genuinely different picture rather than
   * the same picture tinted. */
  function cloudDeck(chillHue, scorchHue) {
    return {
      chill:  { hue: chillHue,  amount: 0.55, sat: -0.62, val: +0.26 },
      scorch: { hue: scorchHue, amount: 0.60, sat: +0.34, val: -0.30 }
    };
  }

  /* THE BURIED ROCKY FLOOR'S SEDIMENT — the D22 frosting contract, cashed.
   *
   * `depth` / `smooth` / `bleed` / `patch` / `grain` are deposition physics
   * and mean exactly what they mean on a planet; the zone TABLE now lives
   * here rather than as a var in draw/film.js, which is the move D22 said
   * would happen when the second family landed.
   *
   * TWO ZONES, NOT FOUR. D22 records the expectation directly ("any count; a
   * star or gas giant wants two or three"), and a giant's floor has no sea
   * and no snowline to divide it four ways — it has crushed sediment and the
   * bare rock it has not covered. High `smooth` and near-zero `patch`: under
   * this much pressure the deposit is thick, level and featureless.
   *
   * `line` and `shelf` are the per-archetype thresholds that used to be the
   * Earth-ish SNOWLINE 0.42 and SHELF -0.16. There is no sea here, so the
   * level line falls back to the terrain mean and `shelf` is pushed out of
   * reach; `line` is pushed high so the top zone is genuinely the exposed
   * high ground rather than a snowfield.
   *
   * MOSTLY OCCLUDED by the envelope, so this is cheap and low-risk — which is
   * precisely why D22 nominated this family to carry the refactor. */
  var FLOOR_FROSTING = {
    surface: true,
    /* Where the boundaries sit, in units of the terrain's own range. */
    line: 0.66,
    shelf: -4.0,
    zones: {
      /* Exposed rock the sediment has not buried. */
      floorBare:     { hueOffset:  14, sat: [0.18, 0.42], val: [0.30, 0.44],
                       depth: 0.16, smooth: 0.70, bleed: 0.30,
                       patch: 0.22, grain: 0.10 },
      /* Compressed sediment pooled in every low place. Thick and level. */
      floorSediment: { hueOffset: -26, sat: [0.30, 0.60], val: [0.40, 0.54],
                       depth: 0.46, smooth: 0.95, bleed: 0.22,
                       patch: 0.05, grain: 0.04 }
    }
  };

  /* ---- TIDAL LOCKING, WHICH THIS FAMILY FINALLY HAS ------------------
   *
   * This file used to carry a comment explaining why tidal locking was NOT
   * wired here: *"the axis recipe is written against a body with a sea level,
   * a snowline and a terrain field to pinch — none of which an envelope
   * has."* That was true when it was written and is not any more, and the
   * reason it stopped being true is worth recording.
   *
   * `gen/zones.js` reads every field through `fieldAt(angle, key, neutral)`,
   * so a key a recipe OMITS takes its neutral value. A giant therefore writes
   * a SHORTER RECIPE rather than needing a different mechanism — no `sea`, no
   * `snow`, no `relief`, no `cover`, because an envelope has none of those.
   * That was settled on the stellar side, where a star has the same problem
   * for the same reason, and it cost no code at all.
   *
   * THREE LEVERS, AND THE USER PICKED TWO OF THEM.
   *
   *   1  THE INFLATED DAYSIDE DECK, which is free. `upper-cloud` is
   *      `outward: true` on both giants, so it takes `air` through exactly
   *      the path the star's corona uses. A hot Jupiter's day face genuinely
   *      puffs up — it is most of why they have inflated radii at all — so
   *      this is both the cheapest lever and the most physical one.
   *
   *   1b THE SWOLLEN BANDED DECKS. `troposphere` and `water-cloud` are
   *      ordinary banded layers, so they take `swell`, the field the stellar
   *      pass added. This is the half that makes the effect read: the
   *      outward deck is the faintest thing in the picture and bulging it
   *      alone was exactly the complaint that prompted the whole change.
   *
   *   3  THE DAY/NIGHT SPECIES SPLIT, nearly free. `climateLean` already
   *      drives cloud species off `chillAt` / `scorchAt`, and `temp` already
   *      feeds the climate — so a locked giant gets ammonia cirrus on the
   *      night face and hotter species on the day face through machinery that
   *      exists. The same "one axis, more consumers" shape as `starActivity`
   *      (D27).
   *
   * THE THIRD LEVER — banding that BREAKS at the terminator — was sketched
   * and explicitly skipped by the user as too laborious. It is not built and
   * should not be.
   *
   * NO RELABEL, UNLIKE THE STAR. On a star "Tidal locking" was a control lying
   * about itself, because there is nothing for a star to be locked to; that is
   * why the stellar axis declares `dial`. On a hot Jupiter the phrase is
   * simply true, so this declares no `dial` at all and
   * `Controls.syncAxisDials` (D132) falls back to the DOM defaults. */
  function tidalLocking() {
    return {
      tidalLock: {
        param: "tidalLock",
        facing: "tidalFacing",

        field: {
          id: "tidal-lock-giant",
          axis: "equatorial",
          /* THE CLOUD DECKS AND NOTHING DEEPER. An envelope's weather is a
           * skin phenomenon: the molecular hydrogen below is at pressures
           * where the star's heat is irrelevant, and the rock core certainly
           * does not know which way it is pointing.
           *
           * `upper-cloud` leads the list so the outward deck holds full
           * strength; the two banded decks follow it. A list rather than one
           * role (D77) because the ice giant has no `water-cloud` — naming
           * only that would place nothing on the body that lacks it, the
           * failure mode where everything except the render says it worked. */
          anchor: ["upper-cloud", "troposphere", "water-cloud"],
          /* Higher than the star's 0.03: a giant's envelope IS most of the
           * body, so a little depth carry reads as the weather having roots
           * rather than as the interior being lopsided. Still low enough that
           * the metallic hydrogen and the core stay plainly round. */
          residue: 0.05,
          blend: 0.30,

          /* The swell reaches the same three decks. Separate from `anchor`
           * for the reason the stellar recipe documents at length: extending
           * `anchor` would deepen `air`, `temp` AND `colorShift` together,
           * and geometry and light do not want the same falloff. Here the two
           * lists happen to name the same roles — but declaring it explicitly
           * is what stops a later edit to one silently moving the other. */
          swellAnchor: ["upper-cloud", "troposphere", "water-cloud"],
          swellResidue: 0,
          /* A WIDER CROSS-FADE THAN THE COLOUR GETS — see `swellBlend` in
           * gen/zones.js. The shared 0.30 is right for a terminator in tint
           * and draws as a faceted kink in an outline. */
          swellBlend: 0.60,

          zones: [
            /* THE DAY FACE: puffed, hot, and stripped toward the hotter cloud
             * species. `temp` is doing double duty — it drives the surface
             * state text AND, through the climate field, which condensate the
             * deck is made of, which is lever 3 in its entirety. */
            { id: "day", label: "Substellar face",
              arc: 140, air: 1.42, temp: +0.30, swell: +0.42,
              colorShift: { hue: -8, sat: -0.06, val: +0.14 } },

            /* THE TWILIGHT BAND CARRIES A MIDPOINT SWELL, NOT ZERO, AND THAT
             * IS A GEOMETRY-SPECIFIC CORRECTION.
             *
             * Zero is right for `temp` and for `colorShift`: the terminator
             * genuinely is the unperturbed state between a hot face and a
             * cold one, and the cross-fade smooths the approach from either
             * side.
             *
             * It is wrong for `swell`, because a zone's declared figure is
             * held FLAT across its whole arc and only blended at the edges.
             * With 0 declared over a 50-170 degree band, the boundary was
             * pinned back to its unswollen radius across that entire arc and
             * had to climb to full swell inside the narrow blend region —
             * measured at 0.033 of the layer per degree, which drew as a hard
             * faceted KINK in the silhouette at each terminator. A crease in
             * the outline is exactly the artifact the cross-fade exists to
             * prevent, arriving through the field the cross-fade is applied
             * to.
             *
             * Sitting the twilight band at the midpoint of its two
             * neighbours turns the profile into a staircase the blend can
             * actually round off, and the transition spans the full arc
             * rather than its edges. Same reasoning as `shiftAt`'s continuity
             * note: a limit that jumps is a limit drawn as an edge. */
            { id: "twilight", label: "Terminator", flex: true,
              arc: 50, arcOpen: 170, air: 1.08, temp: 0.00, swell: +0.12,
              colorShift: { hue: 0, sat: 0, val: 0 } },

            /* THE NIGHT FACE: collapsed, cold, and pale with ammonia cirrus.
             * Thinned rather than mirrored, for the reason the stellar recipe
             * gives — two equal lobes read as an off-centre body rather than
             * as something pulling on this one. */
            { id: "night", label: "Antistellar face",
              arc: 140, air: 0.72, temp: -0.26, swell: -0.19,
              colorShift: { hue: +10, sat: +0.05, val: -0.12 } },

            { id: "twilight", label: "Terminator", flex: true,
              arc: 50, arcOpen: 170, air: 1.08, temp: 0.00, swell: +0.12,
              colorShift: { hue: 0, sat: 0, val: 0 } }
          ]
        }
      }
    };
  }

  /* ------------------------------------------------------------------ *
   * gas-giant
   * ------------------------------------------------------------------ */

  var GAS_GIANT = {
    id: "gas-giant",
    label: "Gas giant",
    family: "gaseous",
    /* `has-atmosphere` is what gates the atmospheric trait pool; `gaseous`
     * and `banded` gate the rest. No trait names an archetype id. */
    tags: ["gaseous", "has-atmosphere", "banded", "no-surface",
           "structured-rings", "orbit-debris"],
    /* THE CARD IS WRITTEN IN A DIFFERENT MINDSET, not merely with different
     * rows: no surface, no landing, depth instead of area. See
     * js/gen/stats/gaseous.js. */
    statTemplate: "gaseous",

    radiusKm: [45000, 95000],

    /* THE RADIUS AT WHICH THIS FAMILY'S ORDINARY DENSITY GIVES 1 g — the
     * calibration constant for the Gravity line. See gravityOf in
     * js/gen/stats/registry.js for why it cannot be one number shared across
     * families, let alone across the whole generator: a giant is ten times
     * Earth's radius and a tenth of its density, and only a per-archetype
     * scale keeps the printed figure inside the spec's 0.9-6 g band. */
    gravityScale: 41000,

    stack: [
      {
        role: "upper-cloud",
        /* THE OUTERMOST BOUNDARY IS A CIRCLE DRAWN SOFTLY. There is no solid
         * surface, and the silhouette has to suggest that — so `soft-gradient`
         * rather than `perfect`, which is the same boundary character the
         * planet's atmosphere uses and costs no new drawing code. */
        /* THE CIRRUS DECK FADES OUT INSTEAD OF STOPPING.
         *
         * It was an ordinary banded layer, and it drew as one: a solid,
         * near-opaque white ring with a hard outer edge, which is wrong twice
         * over. There is no surface here — the whole point of the family is
         * that the body has no boundary you could stand on — so a crisp rim is
         * the one thing the silhouette must not have. And a cloud deck
         * genuinely thins into vacuum rather than ending.
         *
         * `outward: true` hands it to the same radial-falloff path the
         * planet's atmosphere uses (draw/layers.js `falloffAlpha`): it holds
         * most of its opacity through the inner third and does nearly all its
         * fading in the outer, so it still reads as a substantial deck while
         * dissolving into the background at its edge. No new drawing code —
         * the mechanism was already there, this layer simply was not asking
         * for it.
         *
         * ITS ORIGINAL THICKNESS, NOT A THICKER ONE. The first version of this
         * change doubled the depth to compensate for the apparent size a
         * fading layer loses — and that was solving the wrong problem twice
         * over. It pushed the troposphere inward, which rescaled every
         * `sizeRel` storm anchored to it (D75 yet again), and it made the deck
         * a wide soft halo when what it should be is a DENSE skin that stops
         * being opaque at its edge.
         *
         * Density comes from the falloff CURVE instead — `hold` carries the
         * inner part at near-full opacity and the taper does its work late.
         * See `cloudHold` below. */
        frac: { over: "surface", depth: [0.028, 0.052] },
        boundary: "soft-gradient",
        outward: true,
        /* DENSE FOR MOST OF ITS DEPTH, then a late ease-out. The default 0.30
         * is tuned for a planet's thin atmosphere, which should dissolve
         * early; a cirrus deck is a skin with real substance to it and should
         * only go transparent at its outer edge. */
        fadeHold: 0.62
      },
      {
        role: "troposphere",
        /* The banded zone, and the layer the eye spends its time on. The
         * OUTERMOST REAL LAYER — the cirrus deck floats above it as a fading
         * halo — so it runs to the body's edge and the banding is what defines
         * the silhouette. Which is right: a gas giant is recognised by its
         * bands, not by its haze.
         *
         * Its thickness is also what every `sizeRel` storm is measured
         * against, so this range and the storm sizes in
         * js/data/traits/gaseous.js move together. */
        /* A NARROW RANGE ON PURPOSE. Its thickness is what every `sizeRel`
         * storm is measured against, so a range that can roll 0.07 or 0.27
         * means the same authored storm size draws four times larger on one
         * body than another. Tightening the range is what makes a proportion
         * of it mean something stable. */
        frac: [0.870, 0.930],
        boundary: "perfect"
      },
      {
        role: "water-cloud",
        /* Guaranteed at the middle of the Optional layers slider, as the spec
         * asks: `presence: 2.0` is a 200% roll at max, so it survives well
         * below halfway.
         *
         * NARROWED, because it was eating the middle of the picture. At
         * 0.660-0.775 against a molecular-h floor of 0.400 it could roll 30%
         * of the radius as one dim, near-featureless band — the layer with
         * the least to show taking the largest share of the disc. The
         * compressed envelope beneath it is the one that should be reading as
         * "this goes down a very long way". */
        frac: [0.690, 0.790],
        presence: 2.0,
        boundary: "slight"
      },
      {
        role: "molecular-h",
        /* THE BULK, AND THE POINT. Compressed hydrogen from just under the
         * clouds down to nearly the dynamo — a third of the radius in one
         * band, which is what makes "how far down can you get" the story. */
        frac: [0.430, 0.660],
        boundary: "slight",
        /* A hotter interior puffs the envelope: the metallic transition is
         * pushed deeper as the body's own heat rises. */
        modulate: [
          { param: "interiorHeat", amount: -0.05 }
        ]
      },
      {
        role: "metallic-h",
        frac: [0.180, 0.360],
        boundary: "near-perfect",
        bias: "coreBias"
      },
      {
        /* `rock-core`, NOT `core` — and the distinction is material, not
         * cosmetic. A planet's `core` is iron: incandescent, smooth, and
         * carrying no terrain, because there is no surface down there in any
         * sense. A giant's heart is ROCK AND ICE with a real floor on it, and
         * that floor is what the frosting stage deposits crushed sediment on
         * (D22). A role is the generator's word for "what this material is",
         * so two different materials get two names and the planet's core
         * keeps its own behaviour untouched. */
        role: "rock-core",
        /* THE TINY DENSE HEART. The size contrast with the envelope is the
         * story (gaseous-bodies.md), so this stays small at every setting.
         *
         * CORE SIZE BIAS DOES ONE EXTRA THING HERE, and it is the reason
         * `oversized-core` and `coreless` were cut as traits rather than
         * ported: at the low end the boundary character softens, because a
         * coreless giant has no discrete core to draw an edge around. That is
         * `boundarySoftens` below — a general layer property, not a gas-giant
         * branch, and gen/structure.js resolves it for any layer that
         * declares one. */
        frac: [0.070, 0.155],
        boundary: "near-perfect",
        boundarySoftens: { param: "coreBias", below: 0.35, to: "soft-gradient" },
        bias: "coreBias",
        /* The floor is rock and ice, and it carries a terrain field — which
         * is what gives the frosting stage something to deposit on. Small,
         * because a giant's floor is a smooth crushed thing, not a mountain
         * range; and mostly occluded anyway. */
        relief: 0.10
      }
    ],

    axes: tidalLocking(),

    /* See the header for why 0.12 and not 0 or 1. */
    climate: {
      latitude: 0.12
    },

    colorProfile: {
      /* Hue free — a giant may be ochre, blue, green or violet. */
      hue: [0, 360],
      /* Gas giants read better with a harmonious hue family than a hard
       * complement (gaseous-bodies.md): adjacent bands have to separate, and
       * a complement between the envelope and the interior would make the
       * body look like two different objects stacked. */
      secondaryRel: "analogous",
      order: ["upper-cloud", "troposphere", "water-cloud", "molecular-h",
              "metallic-h", "rock-core"],
      layers: {
        /* Pale ammonia cirrus, cold and bright. `climateLean` gives it its
         * cold and hot destinations — see cloudDeck above. */
        "upper-cloud":  { sat: [0.20, 0.55], val: [0.65, 0.90],
                          climateLean: cloudDeck([38, 56], [14, 32]) },
        /* THE BANDED LAYER, and the strongest climate response in the body.
         *
         * `bandContrast` is read by gen/palette.js and published on the
         * colour so the alternating zone/belt bands separate by an authored
         * amount rather than by whatever `tone` happens to give. A cold giant
         * bands hard; a hot one's bands wash out as the deck sinks, which is
         * the visible half of the cloud-species story. */
        troposphere:    { sat: [0.35, 0.75], val: [0.45, 0.80],
                          climateLean: cloudDeck([40, 58], [10, 28]),
                          bandContrast: 1.35,
                          depthGradient: 0.42 },
        /* Convective water cloud, one deck down. Reads the same field but
         * travels less: it is already below the visible surface. */
        "water-cloud":  { sat: [0.30, 0.60], val: [0.35, 0.60],
                          climateLean: {
                            chill:  { hue: [188, 214], amount: 0.35,
                                      sat: -0.30, val: +0.14 },
                            scorch: { hue: [8, 26], amount: 0.40,
                                      sat: +0.22, val: -0.18 }
                          },
                          depthGradient: 0.55 },
        /* Compressed hydrogen, warming with depth. The depth gradient is
         * what says "this goes down a long way" without a single label. */
        "molecular-h":  { sat: [0.40, 0.70], val: [0.30, 0.55],
                          heatLean: { hue: [4, 30], amount: 0.45 },
                          heatGradient: 0.72,
                          depthGradient: 0.70 },
        /* THE DYNAMO. Self-lit, like the planet's outer core and for the same
         * reason: liquid metallic hydrogen is a conductor at thousands of
         * kelvin and the glow IS the material. Its hue is anchored rather
         * than derived so a blue giant still has a hot interior. */
        "metallic-h":   { sat: [0.30, 0.60], val: [0.45, 0.75],
                          hue: [18, 48], hueLean: 0.22, incandescent: true,
                          heatLean: { hue: [26, 52], amount: 0.34 },
                          heatGradient: 0.80 },
        /* HOT, BUT NOT AS HOT AS A PLANET'S IRON CORE. It glows — a giant's
         * heart is at thousands of kelvin under crushing pressure — but it is
         * rock and ice rather than molten metal, so its value range starts
         * lower and it does not reach the near-white a planet's inner core
         * does. That contrast is what keeps the metallic-hydrogen layer above
         * it reading as the brighter, more energetic one. */
        "rock-core":    { sat: [0.55, 0.85], val: [0.62, 0.88],
                          hue: [24, 52], hueLean: 0.16, incandescent: true,
                          heatLean: { hue: [40, 60], amount: 0.22,
                                      ceiling: false },
                          heatGradient: 0.86 },
        /* The buried floor's sediment. See FLOOR_FROSTING. */
        film: FLOOR_FROSTING
      }
    }
  };

  /* ------------------------------------------------------------------ *
   * ice-giant
   *
   * Mostly a data edit against the gas giant, which is the claim Phase 5
   * exists to test. Different stack, different colour numbers, same roles,
   * same recipes, same everything in draw/ and gen/.
   * ------------------------------------------------------------------ */

  var ICE_GIANT = {
    id: "ice-giant",
    label: "Ice giant",
    family: "gaseous",
    tags: ["gaseous", "has-atmosphere", "banded", "no-surface", "icy",
           "structured-rings", "orbit-debris"],
    statTemplate: "gaseous",

    radiusKm: [20000, 30000],

    /* An ice giant is a third the radius of a gas giant and denser for it, so
     * its scale is proportionally smaller — the spec's band here is 0.8-1.4 g.
     * See the gas giant's note. */
    gravityScale: 19500,

    stack: [
      {
        role: "upper-cloud",
        /* Methane haze — the colour source, and thicker proportionally than a
         * gas giant's cirrus because it is most of what an ice giant shows. */
        /* THE CIRRUS DECK FADES OUT INSTEAD OF STOPPING.
         *
         * It was an ordinary banded layer, and it drew as one: a solid,
         * near-opaque white ring with a hard outer edge, which is wrong twice
         * over. There is no surface here — the whole point of the family is
         * that the body has no boundary you could stand on — so a crisp rim is
         * the one thing the silhouette must not have. And a cloud deck
         * genuinely thins into vacuum rather than ending.
         *
         * `outward: true` hands it to the same radial-falloff path the
         * planet's atmosphere uses (draw/layers.js `falloffAlpha`): it holds
         * most of its opacity through the inner third and does nearly all its
         * fading in the outer, so it still reads as a substantial deck while
         * dissolving into the background at its edge. No new drawing code —
         * the mechanism was already there, this layer simply was not asking
         * for it.
         *
         * THICKER TO COMPENSATE. A fading layer loses apparent size, since
         * its outer half is barely painted, so the depth is roughly double the
         * band it replaced. `over: "surface"` measures it from whatever the
         * outermost real layer turned out to be, exactly as the atmosphere
         * does, which also means the troposphere below now genuinely reaches
         * the body's edge and the banding is what defines the silhouette. */
        frac: { over: "surface", depth: [0.032, 0.058] },
        boundary: "soft-gradient",
        outward: true,
        /* As the gas giant's — see the note there. A methane haze is if
         * anything denser, since it is most of what an ice giant shows. */
        fadeHold: 0.66
      },
      {
        role: "troposphere",
        /* Fainter banding than a gas giant. The outermost real layer, as on
         * the gas giant — see the note on `upper-cloud` there. */
        /* Narrow, for the same reason the gas giant's is — see the note
         * there. Its floor must also stay clear of `icy-mantle`'s ceiling
         * (0.815) or the troposphere swallows the gap between them. */
        frac: [0.880, 0.935],
        boundary: "perfect"
      },
      {
        role: "icy-mantle",
        /* PROPORTIONALLY HUGE — it should dominate the picture the way
         * molecular-h does on a gas giant (gaseous-bodies.md). Half the
         * radius in one band.
         *
         * ITS CEILING SITS JUST UNDER THE TROPOSPHERE'S FLOOR, and the range
         * is narrow at the top for the same reason the troposphere's is. At
         * [0.330, 0.815] a low roll left a gap the troposphere stretched down
         * to fill — measured at 0.586 thick, more than twice its authored
         * span — which quadrupled every `sizeRel` storm on those bodies. A
         * layer's thickness is only predictable if the layers bounding it are
         * too. The bulk still comes from how far it reaches DOWN, which is
         * what the mantle dominating the picture actually means. */
        frac: [0.780, 0.855],
        /* AND IT MUST NOT SWALLOW EVERYTHING BENEATH IT EITHER.
         *
         * Pinning the ceiling fixed the troposphere above and moved the same
         * problem down: with `superionic` optional and the core small, the
         * mantle rolled 0.79 of the radius as one near-featureless band. The
         * layer should DOMINATE, not be the whole body — a cutaway with one
         * colour in it has nothing to cut away. Capping its thickness leaves
         * the interior its room whatever else rolls. */
        /* Generous enough that a body WITHOUT `superionic` is not forced into
         * a shape its other layers cannot make. The cap exists to stop one
         * near-featureless band being the whole body; at 0.46 it was also
         * trying to reshape stacks that had nothing to absorb the surplus. */
        maxThickness: 0.58,
        boundary: "slight"
      },
      {
        role: "superionic",
        /* 50% present. The most interesting thing an ice giant can show, and
         * making it conditional is what makes finding one worth something. */
        frac: [0.185, 0.310],
        presence: 1.0,
        boundary: "near-perfect",
        bias: "coreBias"
      },
      {
        /* Rock and iron, and — as on the gas giant — a real floor for the
         * frosting to settle on. See the note there for why it is not `core`. */
        role: "rock-core",
        /* A WIDER CEILING THAN THE GAS GIANT'S, so it can absorb the space
         * `superionic` leaves when it does not roll.
         *
         * `superionic` is present about half the time by design — its rarity
         * is what makes finding one worth something — and on the bodies
         * without it the mantle's `maxThickness` surplus had nowhere to go,
         * since the cap will not push a neighbour past its own authored
         * ceiling. Letting the core reach further is the honest place for that
         * space: an ice giant with no exotic shell genuinely is a bigger rock
         * heart under a slush mantle. */
        /* Held under `superionic`'s floor (0.185) so the two never invert at
         * the extremes — the doccheck asserts the frac table composes at every
         * combination, and a runtime clamp existing is not a reason to author
         * an overlap. */
        frac: [0.085, 0.180],
        boundary: "near-perfect",
        boundarySoftens: { param: "coreBias", below: 0.35, to: "soft-gradient" },
        bias: "coreBias",
        relief: 0.10
      }
    ],

    /* THE SAME AXIS AS THE GAS GIANT, and the shared recipe is what makes it
     * safe: this body has no `water-cloud`, and because `anchor` is a LIST
     * the two roles it does have still take the effect. One role would have
     * placed nothing here. */
    axes: tidalLocking(),

    /* Same declaration and same reasoning as the gas giant. */
    climate: {
      latitude: 0.12
    },

    colorProfile: {
      /* A SOFT COOL BIAS, as the spec asks — but a RANGE rather than a pin.
       * 150..280 is blue-green through violet, which is what methane
       * absorption actually gives, and leaving it a range means two ice
       * giants still differ from each other. */
      hue: [150, 280],
      /* Cooler and less contrasty than a gas giant: analogous keeps the whole
       * body inside the cool family rather than throwing the interior to the
       * warm complement. */
      secondaryRel: "analogous",
      order: ["upper-cloud", "troposphere", "icy-mantle", "superionic",
              "rock-core"],
      layers: {
        /* Methane haze. Its cold destination is the pale blue-white of a
         * methane-clouded world; its hot one is the same deck-driven-deep
         * story the gas giant tells, arriving at a duller green-grey rather
         * than a ruddy one because there is no ammonia up here to stain. */
        "upper-cloud":  { sat: [0.30, 0.65], val: [0.60, 0.85],
                          climateLean: {
                            chill:  { hue: [186, 206], amount: 0.50,
                                      sat: -0.40, val: +0.22 },
                            scorch: { hue: [52, 84], amount: 0.45,
                                      sat: +0.18, val: -0.26 }
                          } },
        /* Banding is SUBTLE here — `bandContrast` well under the gas giant's
         * 1.0, which is the whole difference between the two silhouettes and
         * is one number rather than a second code path. */
        troposphere:    { sat: [0.30, 0.60], val: [0.45, 0.70],
                          climateLean: {
                            chill:  { hue: [190, 212], amount: 0.42,
                                      sat: -0.32, val: +0.18 },
                            scorch: { hue: [46, 78], amount: 0.42,
                                      sat: +0.20, val: -0.22 }
                          },
                          bandContrast: 0.60,
                          depthGradient: 0.38 },
        /* The slush. Hot, dense, and the bulk of the body. */
        "icy-mantle":   { sat: [0.25, 0.55], val: [0.30, 0.55],
                          heatLean: { hue: [6, 32], amount: 0.36 },
                          heatGradient: 0.66,
                          depthGradient: 0.68 },
        /* SUPERIONIC ICE. Self-lit, but NOT in the red-orange band the metal
         * layers use — it is conductive without being molten metal, so its
         * own hue sits in the cold-bright cyan-violet range and it glows
         * there. That is what makes the layer look alien rather than looking
         * like a small core. */
        superionic:     { sat: [0.35, 0.65], val: [0.50, 0.75],
                          hue: [172, 268], hueLean: 0.14, incandescent: true,
                          heatGradient: 0.55 },
        "rock-core":    { sat: [0.40, 0.70], val: [0.55, 0.85],
                          hue: [20, 50], hueLean: 0.18, incandescent: true,
                          heatLean: { hue: [36, 58], amount: 0.24,
                                      ceiling: false },
                          heatGradient: 0.82 },
        film: FLOOR_FROSTING
      }
    }
  };

  CC.Archetypes.register(GAS_GIANT);
  CC.Archetypes.register(ICE_GIANT);
})();
