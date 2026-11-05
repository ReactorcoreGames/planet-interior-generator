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
 * threshold) — and never authors a second ramp against `tempAt`.
 *
 * THIS FILE HOLDS WHAT THE TWO GIANTS SHARE, published on CC.GaseousCommon, the
 * way stellar-common.js does for the stars. Each giant is its own file:
 * gaseous-gas-giant.js and gaseous-ice-giant.js, which load after this one. */

var CC = CC || {};

CC.GaseousCommon = {};

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

  CC.GaseousCommon.cloudDeck = cloudDeck;
  CC.GaseousCommon.FLOOR_FROSTING = FLOOR_FROSTING;
  CC.GaseousCommon.tidalLocking = tidalLocking;
})();
