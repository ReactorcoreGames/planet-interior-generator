/* Moon — the second solid body, and the family's structural branch.
 *
 * One archetype with two stacks. An ordinary moon is crust-at-the-surface: a
 * cratered grey rock over a sluggish mantle and a small, often dead core. Roll
 * the optional `ice-shell` and the stack INVERTS — a bright fractured shell of
 * ice over a dark subsurface ocean, with the rock floor below it. That is the
 * Europa case, and it is the best cutaway in the solid family because the
 * ocean is invisible from outside: cutting the body open is the only way to
 * see it.
 *
 * It stays one archetype rather than two because everything below the ocean is
 * an ordinary moon. See docs/celestials/solid-bodies.md.
 *
 * THE FRAC TABLE HERE IS NOT THE ONE IN THE SPEC, and the correction is
 * recorded in that file beside D4's. See THE STACK CORRECTION below.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  /* ---- THE STACK CORRECTION (Open question 1, discharged) --------------
   *
   * `docs/celestials/solid-bodies.md` gave the ice branch as
   *
   *     ice-shell 0.90-0.94 / ocean 0.79-0.85 / crust 0.68-0.76
   *     mantle 0.58-0.66 / core 0.26-0.40
   *
   * Those compose — no layer inverts at any combination of extremes, so D4's
   * fault is genuinely absent and the table was never misread the way the
   * planet's was. The fault is a different one, and it only shows once you ask
   * what gets DRAWN rather than what was authored.
   *
   * NOTHING SITS ABOVE THE SHELL. The ice-shell is the surface on this branch,
   * but it was authored at 0.90-0.94, leaving 6-10% of the radius empty. The
   * atmosphere is optional at 15% and `outward` besides, so it does not count
   * toward the surface. gen/structure.js then renormalizes the surface to
   * exactly 1.0 (D3) and every layer is scaled up by 1/0.90 .. 1/0.94 — so the
   * ocean is drawn at 0.84-0.94 rather than the tabled 0.79-0.85, and the core
   * at 0.28-0.44 rather than 0.26-0.40.
   *
   * The authored number is not the drawn number, which is D122's lesson
   * arriving in the STRUCTURE stage rather than in a mark's alpha. A table
   * whose figures are silently multiplied by up to 1.11 is not a table anyone
   * can tune against, and the drift is worst exactly where the branch is most
   * interesting: the shell and the ocean.
   *
   * So the shell is authored AT the surface and everything below is restated
   * at the radius it should actually be drawn at. The proportions below are
   * the ones this file intends; renormalization now has nothing to do.
   *
   * TWO SMALLER CORRECTIONS, both against D5's "every layer legible":
   *
   *   The ice crust could roll 0.020 thick (0.68 floor against a 0.66 mantle
   *   ceiling) while its own spec calls it heavily cratered. There is no room
   *   for a crater in 2% of a radius. Its floor is now 0.060.
   *
   *   The ocean could roll 0.030. The subsurface sea is the entire reason this
   *   branch exists and it is the one layer that must never come out as a
   *   line; its floor is now 0.070.
   *
   * Verified: every layer on both branches clears 0.060 of the radius at its
   * worst combination of extremes. */

  /* The three frosting tables, from solid-moon-film.js — see that file for
   * why they live apart and what each one is. */
  var REGOLITH  = CC.MoonFilm.REGOLITH;
  var BRINE     = CC.MoonFilm.BRINE;
  var ACCRETION = CC.MoonFilm.ACCRETION;

  var MOON = {
    id: "moon",
    label: "Moon",
    family: "solid",
    /* `orbit-safe` IS DELIBERATELY NOT CARRIED, and the first version of this
     * file carried it on an unexamined justification — "a moon may have its
     * own ring or debris" — which is exactly the failure D146 records for
     * stars, repeated one family later.
     *
     * No moon in the solar system has a confirmed ring. The reason is
     * structural rather than accidental: a ring needs a stable band between
     * the body's Roche limit and the distance where the PARENT planet's
     * gravity takes over, and around a moon that band is very narrow. The
     * parent strips it. A moon is a body that orbits something else, so the
     * neighbourhood `orbit-safe` is asserting the safety of is not really the
     * moon's to offer.
     *
     * There is a picture argument too, and the user raised it first: rings on
     * a planet, a giant and a moon were the same mark at the same radii, so
     * seeing it on all three made them read as one body type with different
     * fills. That is the vocabulary problem D76/D160 keep surfacing — a mark
     * that means the same thing everywhere stops distinguishing anything.
     *
     * The tag is the whole gate, so dropping it removes rings AND debris
     * belts together, which is what the gate exists for. `airless` stays and
     * is what a future airless-specific trait would key off. */
    tags: ["solid-surface", "solid-interior", "airless"],
    statTemplate: "solid",

    /* 400-3,500 km, from the spec. Nearly an order of magnitude below the
     * planet's floor, which is what the scale bar is for in this family. */
    radiusKm: [400, 3500],

    stack: [
      {
        role: "atmosphere",
        /* Thin if present, and usually absent. A moon holds gas badly. */
        frac: { param: "atmosphereDepth", over: "surface", depth: [0.03, 0.06],
                nudge: { param: "starlight", peak: 0.5, amount: 0.26 } },
        presence: 0.15,
        boundary: "soft-gradient",
        outward: true
      },
      {
        role: "ice-shell",
        /* THE BRANCH. Present on 40% of moons at full Optional layers, and
         * when it is present it IS the surface — see THE STACK CORRECTION
         * above for why it is authored at 1.0 rather than at the spec's 0.94.
         *
         * It carries `relief`, which is what makes its underside a terrain
         * field the film pass will deposit against. The elements table gives
         * it the fracture networks that are the signature look. */
        /* AUTHORED SO THE DRAWN RADIUS LANDS AT 1.0, WHICH IS NOT THE SAME
         * AS AUTHORING 1.0.
         *
         * The shell carries `relief`, and gen/structure.js counts a layer's
         * terrain PEAKS toward the surface before renormalizing it to exactly
         * 1.0 (D3). Half the peak-to-trough height sits above the mean, so a
         * shell authored at 1.000 with relief 0.11 is measured at 1.055 and
         * the whole stack is then divided by that — which drew the shell at
         * 0.947 and pulled every layer beneath it in by the same 5%.
         *
         * That is the identical fault this file's STACK CORRECTION describes
         * in the spec's table, arriving from a different cause: there the gap
         * above the shell was empty, here it is filled by the shell's own
         * peaks. Both are "the authored number is not the drawn number"
         * (D122), and both are only visible by printing the built stack.
         *
         * So the range is authored HALF THE RELIEF LOW and renormalization
         * brings it back to 1.0. Measured after the change rather than
         * predicted — see test/_tmp/_moonstack.mjs. */
        frac: [0.925, 0.950],
        /* RELIEF ON THIS LAYER DISPLACES INTO THE OCEAN, NOT INTO SPACE.
         *
         * `relief` was 0.11, copied from the pattern the crust uses — and on
         * the crust that is right, because the crust's relief IS the visible
         * surface and it displaces outward into empty space. The ice shell is
         * not that. `CC.Layers.reliefFn` displaces a layer's OUTER boundary by
         * its own terrain, so on the ice branch the shell's boundary swings
         * across the thin ocean sitting directly beneath it.
         *
         * Measured on seed `tancalsel-4497`: a boundary multiplier of
         * 0.959..1.053, which is a swing of 0.0886 of the body radius against
         * an ocean only 0.1372 thick — 65% OF THE OCEAN. That is what pinched
         * the water to nothing on one side and read as "the ocean is still
         * retreating". Not the tidal field (flat since D172), not the
         * frosting, not the deposit depths: the shell's own silhouette.
         *
         * SMALL, because the budget is the ocean's thickness rather than the
         * layer's own. The keels and rafts that give the underside its
         * character are carried by `reliefSpec` and by the accreted deposit;
         * this figure only needs to keep the shell from reading as a perfect
         * circle, and anything more eats the layer below it. */
        relief: 0.022,
        /* A SHELL OF ICE IS THE EVIDENCE THAT THE BODY IS COLD, so it is
         * gated on the temperature rather than rolled against it. Measured
         * with a flat 0.40 roll: only 11% of ice moons actually showed the
         * thing the branch exists for — a frozen shell over a liquid sea —
         * and the rest were warm bodies wearing a lid, some at 610 C. See
         * `presence: { colder }` in gen/structure.js. */
        presence: { colder: 0.46, fade: 0.13 },
        /* THE SHELL'S UNDERSIDE, and it is a different field from any ground.
         *
         * Ice floating on water is smooth on top and ragged underneath: the
         * shell thickens and thins where the ocean freezes onto it and melts
         * away, in long slow undulations with fine detail on them and no
         * craters at all, because there is nothing up there to hit it. Broad
         * bands, sharpen at 0, no crater term. */
        /* THE LOW BAND HAD TO GO, and the reason is a frequency argument
         * rather than an amplitude one — D74's shape.
         *
         * The first version led with `{ cycles: 4, amp: 1.00 }`, copying the
         * planet's "landmasses first" structure. At four cycles across the
         * whole body that is not undulation, it is a BULK TILT: measured, the
         * underside ran -0.037 on one side and +0.052 on the other. The
         * accreted ice fills wherever the underside dips, so one half of the
         * moon got a thick pale mass and the other got almost nothing — a
         * lopsided deposit on a body with the tidal lock switched OFF, which
         * is what made it read as an error rather than as texture.
         *
         * An ice shell has no continents. What it has is keels and rafts at a
         * middling frequency and a rough underside at a fine one, both
         * roughly even around the body. So the low band is dropped to a
         * gentle regional variation and the mid band leads. */
        reliefSpec: {
          bands: [
            { cycles: 7,  amp: 0.42 },   /* gentle regional thickness change */
            { cycles: 17, amp: 1.00 },   /* keels and rafts — the real story */
            { cycles: 54, amp: 0.30 }    /* the rough underside itself */
          ],
          /* MEASURED AGAINST THE LAYER, NOT CHOSEN.
           *
           * At 0.11 the underside's peak-to-trough span came out at 0.111 of
           * the body radius against a shell only 0.099 thick — the undulations
           * were larger than the thing undulating, so the field was describing
           * a shell that ate its own ocean. The amplitude is a fact about the
           * ice sheet and has to sit inside it. Roughly half the shell's
           * typical thickness leaves the keels legible and the sheet intact. */
          amplitude: 0.055,
          sharpen: 0.0
        },
        boundary: "near-perfect"
      },
      {
        role: "ocean",
        /* NOT THE PLANET'S OCEAN. On a planet the sea sits ON the crust and is
         * driven by Ocean depth (D2); here it sits UNDER the ice and exists
         * only when the shell does. Both are the same presence mechanism, but
         * the dependent form did not exist before this archetype — see
         * `presence: { requires }` in the registry.
         *
         * Dark: it is a sea with a lid on it and no sky to reflect. */
        frac: [0.800, 0.850],
        presence: { requires: "ice-shell" },
        boundary: "perfect"
      },
      {
        role: "crust",
        /* HEAVILY CRATERED, and it is the surface whenever there is no shell.
         *
         * The two branches want genuinely different radii — at the surface it
         * has to reach 1.0, and under an ocean it is the sea floor at 0.775 —
         * so `frac` carries a variant keyed on the layer that displaces it.
         * This is the one place in the solid family where a stack branches
         * rather than varying by parameter, and it is stated as data.
         *
         * Its relief is the sea floor's terrain on the ice branch and the
         * cratered surface on the dry one; the same field answers both,
         * because "rough ground" is the same question either way. */
        frac: [0.900, 0.945],
        frac_when: { "ice-shell": [0.680, 0.740] },
        relief: 0.16,
        /* CRATERS ON CRATERS, AND NO CONTINENTS.
         *
         * The planet's crust field leads with a 3-cycle band that reads as
         * landmasses, because a planet HAS landmasses. A moon does not: it has
         * a surface that has been hit for four billion years with nothing to
         * erase the record. So the low band is dropped almost to nothing and
         * the crater term does the work — many more of them, deeper, and
         * across a wider size range than a planet's nine.
         *
         * This is why `reliefSpec` had to exist rather than `elementScale`
         * being enough: scaling the planet's field up gives bigger continents,
         * not more craters. It is a different field. */
        reliefSpec: {
          bands: [
            { cycles: 2,  amp: 0.30 },   /* ancient basins, barely there */
            { cycles: 11, amp: 0.55 },   /* highland/mare relief */
            { cycles: 44, amp: 0.30 }    /* the battered surface itself */
          ],
          amplitude: 0.16,
          sharpen: 0.62,
          craters: { count: 34, size: [0.004, 0.052], depth: 0.62 }
        },
        modulate: [
          { param: "interiorHeat", amount: -0.02 }
        ],
        boundary: "near-perfect"
      },
      {
        role: "mantle",
        /* Often cold, sluggish. Same branch treatment as the crust, so the two
         * keep their gap on either stack. */
        frac: [0.740, 0.820],
        frac_when: { "ice-shell": [0.540, 0.620] },
        boundary: "irregular"
      },
      {
        role: "core",
        /* SMALL, AND MAY BE INERT. One metal layer rather than the planet's
         * two: a moon is not running a dynamo worth drawing as a liquid shell
         * around a solid heart, and inventing one would make every moon read
         * as a small planet — which is the thing this archetype's colour note
         * explicitly warns against.
         *
         * Grows a little as the body cools, the same way the planet's does,
         * but there is no shell above it for it to eat into so the effect is
         * only on its own radius. */
        frac: [0.260, 0.400],
        boundary: "near-perfect",
        bias: "coreBias"
      }
    ],

    /* A MOON IS MORE LIKELY TO BE LOCKED THAN A PLANET — almost every moon in
     * the solar system is. The axis is the planet's, with the same three
     * faces; what differs is that `randomize` rolls it high by default, which
     * is a settings fact rather than an archetype one.
     *
     * The recipe is SHORTER than the planet's on the ice branch's terms: an
     * airless moon has no meaningful `air` term, but it keeps one because the
     * dry branch may still roll an atmosphere, and `fieldAt` gives an omitted
     * key its neutral value anyway. */
    axes: { tidalLock: CC.MoonFilm.TIDAL_LOCK },

    /* ---- THE ICE MOON HAS TWO TEMPERATURES ----------------------------
     *
     * `tempAt` describes the SHELL'S SURFACE, which is frozen — that is why
     * there is a shell at all. The ocean beneath is liquid because the shell
     * insulates it and because tidal or interior heat warms it from below.
     *
     * Let one field answer both and you get one of two broken pictures: a
     * frozen ball with an inexplicable sea, or a warm world with an
     * inexplicable crust. They are different facts and the archetype has to
     * say so.
     *
     * `subsurface` is that second question, and it is DECLARED exactly as
     * `latitude`, `starlit` and `selfHeated` are. gen/climate.js must never
     * ask what role a layer has (D27); an archetype says what it is and the
     * climate believes it.
     *
     *   insulate  how much of the surface's cold the lid keeps out, 0..1
     *   floor     the temperature the interior holds the water at regardless
     *
     * The arithmetic is Interior heat's, with a lid on it — which is the
     * point. Interior heat is already the term that reaches the surface from
     * below (D41) and is what keeps a rogue planet warm; an ice moon is the
     * same sum with the losses cut. So Interior heat remains a real control
     * on the ocean (a dead moon's sea does freeze through) while the SURFACE
     * stays frozen at every setting, because the insulation is what stops the
     * interior reaching it.
     *
     * The card reads both, so it can state two temperatures without
     * contradicting itself or the picture. */
    climate: {
      latitude: 1.0,
      subsurface: {
        /* Which layer the second temperature describes. Named so the card and
         * the frosting ask about the same body of water, and so a body
         * without that layer simply has no second temperature. */
        layer: "ocean",
        /* CALIBRATED AGAINST THE MEASURED OUTCOME, not chosen by feel.
         *
         * At insulate 0.82 / floor 0.30 the branch's signature picture — a
         * frozen shell over a LIQUID sea — came out on 47% of ice moons: the
         * surface was reliably frozen (83%) but the ocean froze through on
         * nearly two in five. That is not a fault in the model, it is the
         * floor sitting below the freezing point: `toCelsius` puts 0 C at
         * about 0.375, so a floor of 0.30 promises an ocean that is solid.
         *
         * The floor is now just above freezing, which is the physically
         * honest statement — a subsurface ocean that exists at all is one the
         * interior is keeping liquid — and Interior heat still moves the
         * figure well above it, so a warm moon's sea is genuinely warmer. A
         * dead moon's sea can still freeze through, because `insulate` is
         * short of 1 and a cold enough surface pulls the result under; the
         * card says so when it happens. */
        insulate: 0.86,
        floor: 0.40
      }
    },

    colorProfile: {
      hue: [0, 360],
      secondaryRel: "complement",
      order: ["atmosphere", "ice-shell", "ocean", "crust", "mantle", "core"],
      layers: {
        atmosphere:  { sat: [0.10, 0.32], val: [0.50, 0.78] },
        /* BRIGHT AND NEARLY ACHROMATIC. The shell is the lightest thing in
         * the picture, which is what makes the dark ocean under it read. Its
         * depth gradient is strong for the same reason the planet's ocean's
         * is: a sheet of ice has an inside and an outside, and shading that
         * is what stops it reading as a white ring. */
        "ice-shell": { sat: [0.05, 0.25], val: [0.70, 0.95],
                       depthGradient: 0.80,
                       /* The shell's underside, where the accreted ice
                        * hangs. Declared per role so the film pass resolves
                        * a different table for each frosted surface. */
                       film: ACCRETION },
        /* DARK, AND IT IS THE POINT OF THE BRANCH. No sky to reflect and no
         * light reaching it, so it is authored well below the planet's sea
         * and grades harder still with depth. */
        ocean:       { sat: [0.30, 0.60], val: [0.15, 0.35],
                       hue: [186, 232], hueLean: 0.16,
                       depthGradient: 0.90 },
        /* The rock: grey, and legitimately so — this is the one layer where
         * low saturation is the material rather than a failure. Carries the
         * regolith on the dry branch and the brine floor on the ice one; the
         * palette resolves whichever the stack actually built. */
        crust:       { sat: [0.05, 0.30], val: [0.30, 0.65],
                       depthGradient: 0.78,
                       film: REGOLITH,
                       film_when: { "ice-shell": BRINE } },
        /* WEAKLY HEAT-LEANED, AND DELIBERATELY NOT THE PLANET'S NUMBERS.
         *
         * The planet authors `amount: 0.72` and `heatGradient: 0.78` for a
         * body whose interior is the point of the picture. A moon is "often
         * cold, sluggish" by its own spec, so it takes roughly half of each:
         * enough that a tidally-heated moon reads as warm and a dead one as
         * stone, without the vivid red-orange interior that belongs to a live
         * planet. Copying the planet's figures across is the one thing the
         * spec explicitly calls invalid, because it would make every moon
         * look like a small planet. */
        /* MEASURED, NOT GUESSED. Across 200 bodies the moon's mantle came out
         * at sat 0.11/0.31/0.65 against the planet's 0.17/0.48/0.74 — already
         * the muted layer the spec asks for at the median, but with a top end
         * that reaches a live planet's. A moon that is "often cold, sluggish"
         * should not have a mantle as saturated as a molten world's, so the
         * ceiling comes in; the floor stays, because the contrast rules still
         * need room to separate this layer from its neighbours. */
        mantle:      { sat: [0.20, 0.42], val: [0.25, 0.50],
                       heatLean: { hue: [2, 26], amount: 0.34 },
                       heatGradient: 0.40 },
        /* One metal layer, and it may be inert. Incandescent so a warm moon's
         * core still glows, but the value range is lower than the planet's
         * inner core: this is a small body's heart, not a furnace. */
        core:        { sat: [0.35, 0.70], val: [0.45, 0.75],
                       hue: [18, 46], hueLean: 0.18, incandescent: true,
                       heatLean: { hue: [30, 54], amount: 0.20 },
                       heatGradient: 0.70 }
      }
    }
  };

  CC.Archetypes.register(MOON);
})();
