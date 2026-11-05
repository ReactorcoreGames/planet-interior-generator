/* The ice giant. See gaseous-common.js for the family's header and what it
 * shares with the gas giant, which must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var FLOOR_FROSTING = CC.GaseousCommon.FLOOR_FROSTING;
  var tidalLocking = CC.GaseousCommon.tidalLocking;

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

  CC.Archetypes.register(ICE_GIANT);
})();
