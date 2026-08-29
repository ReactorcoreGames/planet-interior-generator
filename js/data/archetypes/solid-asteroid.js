/* Asteroid — the third solid body, and the one the cutaway format was made
 * for.
 *
 * A chaotic amalgam of rock, metal and void. The two shells are thin bands
 * around an interior that is 90% of the radius, and that interior is a Voronoi
 * mosaic of welded fragments rather than the neat concentric shells every
 * other body in the project has.
 *
 * The registry must load before this file.
 *
 * ---- OPEN QUESTION 1, DISCHARGED FOR THE ASTEROID ------------------------
 *
 * `docs/celestials/solid-bodies.md` gives the stack as
 *
 *     dust-film   0.97-1.00  (70% optional)
 *     outer-shell 0.93-0.96
 *     interior    0.88-0.92  (runs to the centre)
 *
 * Those compose — no layer inverts at any combination of extremes — so the
 * doccheck passes on the authored figures, exactly as it did for the moon's
 * table which was nonetheless wrong three ways (D163). THE PAPER MEASUREMENT
 * IS NOT THE CHECK. The stack was built and printed
 * (test/_tmp/_asteroidstack.mjs) and there were four faults, every one of them
 * invisible until the figures came out of the generator.
 *
 *   1. THE FILL LAYER DELETED THE SHELL, and this is the one no amount of
 *      reading would have found. `interior` was authored WITHOUT a `frac`, on
 *      the registry's "a layer may omit `frac` entirely — take what's left"
 *      plus the spec's "runs to the centre". Both statements are true; they do
 *      not combine the way that assumed. gen/structure.js pass 1c resolves a
 *      fill layer as
 *
 *          placed[i].outer = placed[i - 1].outer
 *
 *      — the layer above's OUTER edge, not its inner one, because the layer
 *      above has no thickness of its own to subtract (its thickness is defined
 *      by whatever sits beneath it, which is this layer). So the mosaic began
 *      exactly where the shell began, the shell came out 0.000 thick, and
 *      pass 2's sliver drop removed it from the stack. MEASURED: the built
 *      body had ONE layer, `interior` at 0.000..1.000, on all 200 seeds.
 *
 *      The spec's table already had the answer — 0.88-0.92 is where the mosaic
 *      STARTS — and "runs to the centre" describes its other end, which every
 *      innermost layer does for free. `frac` is authored.
 *
 *      This is D122 in its purest form so far: not the authored NUMBER
 *      differing from the drawn number, but an authored LAYER that was not a
 *      drawn layer at all.
 *
 *   2. NOTHING SITS ABOVE THE FILM WHEN IT IS ABSENT, and it is absent 30% of
 *      the time by its own spec. gen/structure.js renormalizes the surface to
 *      exactly 1.0 (D3), so a bare asteroid's whole stack would be multiplied
 *      by 1/0.93 .. 1/0.96 and the interior drawn at 0.92-0.99 rather than at
 *      the tabled 0.88-0.92 — the mosaic reaching almost to the silhouette,
 *      and the hardened crust a hairline by a second route. The moon's STACK
 *      CORRECTION arriving on a different branch.
 *
 *      So `outer-shell` is authored AT the surface and `dust-film` sits over
 *      it as a FILM rather than as a band — which is what the spec calls it,
 *      and the shape the moon's regolith already uses. There is then nothing
 *      above the shell to renormalize away, on either branch. MEASURED: the
 *      surface lands at 1.0000 on every seed and no layer is scaled.
 *
 *   3. THE HAIRLINE the phase doc predicted, and it survived the fix for
 *      fault 1. With `outer-shell` at 1.0 and `interior` authored at the
 *      spec's 0.88-0.92, the shell came out as thin as 0.0417 of the radius at
 *      full Layer thickness variation — under D5's "legible band" bar, and
 *      thin enough that the pits and fractures inside it have nowhere to sit.
 *      The interior's range is lowered to 0.862-0.905, which is the smallest
 *      move that clears it. MEASURED after the change: the shell's worst case
 *      over 480 bodies across the whole variation range is 0.0615, and the
 *      interior's is 0.8311.
 *
 *   4. THE WOBBLE, which turned out NOT to be a fault — and it is worth
 *      recording as a measurement rather than as an assumption, because the
 *      reasoning that predicted it was sound and simply wrong about the
 *      numbers. `heavy` irregularity on the silhouette against `irregular`
 *      inside displaces the two boundaries independently, and two bands close
 *      together will cross. At the corrected radii they do not: 0/4800
 *      bearings cross at full Boundary irregularity across 40 seeds, with a
 *      narrowest gap of 0.0326. The band widening in fault 3 is what bought
 *      that margin, so the two corrections are one correction.
 *
 * Verified after all four: every layer clears 0.06 of the radius at its worst
 * combination of extremes, the surface is exactly 1.0 with nothing
 * renormalized away, and no boundary crosses its neighbour. */

var CC = CC || {};

(function () {
  "use strict";

  /* ---- the dust film ----------------------------------------------------
   *
   * A FILM RATHER THAN A BAND, for the reason in fault 2 above and for one
   * more: scratched regolith on a body this small is genuinely a coating, not
   * a layer with an inside. The moon's frosting mechanism already draws
   * exactly this — a cover deposited ON a surface, following its terrain —
   * and using it here means the asteroid adds no mechanism at all.
   *
   * The phase doc's guess was that frosting should be skipped, because "a
   * dusting competes with the Voronoi interior on a body that small". That
   * turned out to be right about the INTERIOR and wrong about the surface: the
   * mosaic is the whole picture and nothing may compete with it, but the
   * outermost 3% of the radius is not where the mosaic is. What the film does
   * there is give the shell an outside — a slightly different tone catching
   * the light on the rises and pooling in the hollows — so the silhouette
   * reads as a dusty rock rather than as a cut edge.
   *
   * Two zones only, against the moon's four. A moon's regolith has a
   * temperature story; an asteroid's dust does not — it is swept off the
   * exposed faces and settles in the low ground, and that is the whole of it.
   *
   * `depth` is the deposit's thickness as a fraction of the host's relief, and
   * it is SMALL: the point is a tone change, not a second crust. */
  var DUST = {
    surface: true,
    /* Which layer it settles on. Named as data so the film pass never asks
     * what role a layer has (D27). */
    host: "outer-shell",
    /* SETTLED AND SWEPT, and nothing else. The dust pools where the terrain
     * dips and is stripped from where it rises, which is the one fact about
     * regolith that a cross-section can actually show. */
    zones: {
      settled: { sat: [0.02, 0.12], val: [0.30, 0.48] },
      swept:   { sat: [0.04, 0.15], val: [0.20, 0.34] }
    },
    depth: [0.10, 0.55]
  };

  var ASTEROID = {
    id: "asteroid",
    label: "Asteroid",
    family: "solid",
    /* `airless` and the two solid tags. NOT `orbit-safe`: the moon dropped it
     * in Session S because a body that orbits something else cannot vouch for
     * the neighbourhood, and an asteroid is that argument at its strongest —
     * it IS the debris. A ring around a rubble pile is not a picture anyone
     * needs, and the tag gates rings and belts together.
     *
     * `fragmented` is new, and it is what the asteroid's own traits key off:
     * a body made of welded pieces can be hollowed out or shattered in ways a
     * planet cannot. Declared as a tag rather than checked by id, so a future
     * comet or a shattered moon can carry it and inherit the same traits. */
    tags: ["solid-surface", "solid-interior", "airless", "fragmented"],
    /* ITS OWN STAT TEMPLATE, not the solid one. See js/gen/stats/asteroid.js:
     * the solid template asks surface questions — how much is dry land, where
     * the coastline runs, whether the air is breathable — and every one of
     * them is answered "no" here. The interesting questions about an asteroid
     * are what it is made of, how solidly it holds together, and whether you
     * could land on it without pushing yourself off. */
    statTemplate: "asteroid",

    /* 1-500 km, from the spec — three orders of magnitude below the planet's
     * floor and the widest range in the project. The scale bar is doing real
     * work in this family. */
    radiusKm: [1, 500],

    stack: [
      {
        /* THE HARDENED CRUST, AND IT IS THE SURFACE. Authored at 1.0 for the
         * reason in fault 2: the dust above it is a film with no radius of its
         * own, so there is nothing between this and space on either branch and
         * renormalization has nothing to do.
         *
         * HEAVY WOBBLE is the asteroid's signature and it lives here, on the
         * silhouette, where it does the most work. A body this small has never
         * had the gravity to pull itself round, and the lumpy outline is most
         * of what says so at a glance. */
        role: "outer-shell",
        frac: [0.960, 1.000],
        /* `extreme`, NOT `heavy`, and this is the correction the user made
         * looking at the render: at `heavy` the asteroid came out very nearly
         * a circle, and an asteroid that reads as a circle has lost the one
         * thing that identifies it across the room.
         *
         * Below a few hundred kilometres a body has never had the gravity to
         * pull itself into a sphere, and the shape it kept is the shape it
         * broke as. The outline is what the eye reads first, so it is doing
         * the work of saying what kind of object this is before any of the
         * interior is examined — which is why all three edge statements are
         * made here and the interior then borrows them. `heavy` also gets 4
         * octaves in draw/layers.js, so the outline carries fine irregularity
         * as well. */
        /* BACK TO `heavy` ONCE FREQUENCY AND FACETING WERE DOING THE WORK.
         *
         * The route here matters more than the value. `extreme` was reached by
         * assuming the silhouette needed a BIGGER swing, which turned out to
         * be the wrong axis entirely — at `extreme` with smooth low-frequency
         * noise it was still a circle, and once `boundaryFacet` and
         * `boundaryFreq` were added the shape came from those and the extra
         * amplitude became a liability: the wobble's 0.171 swing compounded
         * with the terrain's 0.111 and the dust film, correctly following the
         * combined excursion, threw detached lobes clear of the body.
         *
         * Three independent statements about an edge — how much, how angular,
         * how many — and roundness was a failure of the last two. With those
         * fixed, `heavy` is plenty, and the render is both lumpier and free of
         * the spikes. Reaching for more of the knob that was already wrong is
         * the trap this records. */
        boundary: "heavy",
        /* HALF AGAIN, because the right amount sits between two table entries.
         * `heavy` alone reads slightly too round on this body and `extreme` is
         * far enough that the wobble compounds with the terrain and the dust
         * film throws detached lobes past the silhouette. Measured at both,
         * and this is where the outline is lumpy without the film breaking up.
         * See `wobbleScale` in gen/structure.js for why it is a multiplier
         * rather than a seventh name in the table. */
        wobbleScale: 1.5,
        /* AND ANGULAR, WHICH IS A SEPARATE STATEMENT FROM LARGE.
         *
         * Going to `extreme` doubled the amplitude and the silhouette still
         * read as a circle — measured, it swung from 0.892 to 1.010 of the
         * radius and looked round anyway. fBm is smooth by construction, so
         * more of it is only a bigger smooth blob; what was missing was not
         * size but SHAPE.
         *
         * An asteroid is a FRAGMENT. Its outline is the faces it broke along,
         * meeting at corners — flat runs and sharp turns, not a wave. That is
         * what `boundaryFacet` creases into the noise, and it is the mark that
         * finally distinguishes this silhouette from a slightly lumpy planet.
         *
         * High, but not 1: at the very top the outline starts reading as a
         * drawn polygon, and the faces of a real fragment are not perfectly
         * flat. */
        boundaryFacet: 0.80,
        /* MORE LOBES, AND SMALLER. At the default 1.7 the noise puts only
         * three or four broad undulations round the body, so even at full
         * amplitude and full faceting the outline read as a rounded triangle
         * — large and angular, and still not an asteroid.
         *
         * A collision fragment has a dozen faces, not four. Raising the
         * frequency is the third of the three independent statements about
         * this edge (how much, how angular, how many), and it is the one that
         * finally makes the silhouette read as a chip of rock rather than as
         * a lumpy world. */
        boundaryFreq: 4.2,
        /* THE SHELL'S OWN TERRAIN, and it is what the dust settles into.
         *
         * Not a planet's landforms and not a moon's crater record. An asteroid
         * is a collision fragment: a few large flat facets where it broke, a
         * scattering of craters on top, and rubble everywhere. So the field
         * leads with a LOW band — the facets — and carries craters at a wide
         * size range, some of them very large relative to the body, because on
         * a rock this small a single impact is a significant fraction of it. */
        relief: 0.115,
        reliefSpec: {
          bands: [
            { cycles: 3,  amp: 1.00 },   /* the fracture facets it broke along */
            { cycles: 9,  amp: 0.52 },   /* the shoulders between them */
            { cycles: 31, amp: 0.34 }    /* rubble and slump */
          ],
          amplitude: 0.115,
          sharpen: 0.30,
          /* FEWER AND BIGGER than a moon's. A moon is a target that has been
           * hit for four billion years; an asteroid is small enough that the
           * hit which would have made its thirtieth crater destroyed it
           * instead. So the record is a handful of large scars rather than a
           * dense field of small ones. */
          craters: { count: 11, size: [0.030, 0.155], depth: 0.55 }
        }
      },
      {
        /* THE MOSAIC, AND IT RUNS TO THE CENTRE.
         *
         * `frac` IS AUTHORED HERE, and the first version of this file omitted
         * it on a misreading of the spec's "runs to the centre" plus the
         * registry's "a layer may omit `frac` entirely". Both are true and
         * they do not combine the way it assumed. What "take what's left"
         * resolves to in gen/structure.js pass 1c is
         *
         *     placed[i].outer = placed[i - 1].outer
         *
         * — the layer above's OUTER edge, not its inner one. So the mosaic
         * started exactly where the shell started, the shell came out 0.000
         * thick, and pass 2's sliver drop removed it from the stack
         * altogether. Measured, not reasoned about: the built body had ONE
         * layer, `interior` at 0.000..1.000, on all 200 seeds
         * (test/_tmp/_asteroidstack.mjs).
         *
         * That is D122 once more and in its purest form — the authored number
         * is not the drawn number, and here the authored LAYER was not a drawn
         * layer at all. The omitted `frac` is only meaningful for a fill layer
         * whose neighbour above is itself positioned against something else;
         * a band above a fill layer has no thickness of its own, because its
         * thickness is defined by what sits beneath it and the thing beneath
         * it is defined by where it ends. The circularity is why the spec's
         * table gives the interior a range: 0.88-0.92 is where the mosaic
         * STARTS, and "runs to the centre" describes the other end, which
         * every innermost layer does for free.
         *
         * Authored high, because the mosaic is 90% of the radius by design —
         * the shells are thin bands around it and the spec is explicit that
         * this is correct rather than a compromise.
         *
         * NO CORE. The spec is explicit and it is the right call: a core is a
         * body that got hot enough to differentiate, and one that did is a
         * planet's leftovers rather than an asteroid. Drawing a small core
         * here would make every asteroid read as a tiny planet — which is the
         * exact failure the moon's colour note warns against, one family on.
         *
         * `irregular` rather than `heavy`, deliberately. The boundary between
         * the crust and the interior is a real material change, but it is
         * INSIDE the body where nothing has been weathering it, so it is
         * rougher than a planet's and calmer than the silhouette. Matching the
         * shell's `heavy` here is what crossed the two boundaries in fault 3. */
        role: "interior",
        frac: [0.862, 0.905],
        /* `heavy` RATHER THAN `irregular`, and it has to move with the shell.
         *
         * The original reasoning — that an inner boundary is calmer than the
         * weathered silhouette — is sound and led to the wrong number once the
         * outside went to `extreme`. A very lumpy shell around a nearly
         * circular mosaic reads as a rock with a machined hole in it: the
         * mosaic's outline becomes the most regular thing in the picture,
         * which is the opposite of what this body is about. The crust/interior
         * boundary is a fracture surface too.
         *
         * Still a step below the silhouette, because it genuinely is calmer —
         * nothing has been weathering it — and because keeping the two apart
         * is what gives the shell a varying thickness rather than a constant
         * band following the outline round. */
        /* `extreme` HERE TOO, and the reason is what the render showed rather
         * than what seemed reasonable.
         *
         * The argument for a calmer inner boundary is sound — nothing has been
         * weathering it — and at `heavy` it produced a swing of 0.071 against
         * the silhouette's 0.171, which rendered as a CLEAN CIRCLE of mosaic
         * sitting inside a lumpy crust. That circle then became the dominant
         * edge in the picture, because it is the high-contrast one: the
         * silhouette fades into a starfield while the mosaic's edge is bright
         * fragments against a dark band. Making the outside lumpy had not
         * fixed the roundness, it had moved it inward.
         *
         * D158's shape — two marks each calibrated alone are not a calibrated
         * pair. The two boundaries have to be judged together, because the eye
         * reads whichever of them carries the most contrast.
         *
         * They stay distinguishable through FACET rather than through
         * amplitude: same size of swing, less angular, so the shell still
         * varies in thickness around the body instead of becoming a constant
         * band following the outline round. */
        boundary: "heavy",
        /* The same scale as the shell, necessarily — `boundaryShare` makes the
         * two the same curve, and a different amplitude ratio is exactly what
         * lets them cross again. */
        wobbleScale: 1.5,
        boundaryFacet: 0.62,
        /* IT WEARS THE SHELL'S SHAPE, and this is what makes the two large
         * boundaries safe to have at once.
         *
         * With independent noise the mosaic poked OUTSIDE the crust on 11.8%
         * of bearings once both went to `extreme` — the body turning inside
         * out on part of its circumference. Two independent swings of similar
         * size always cross somewhere; the only reliable fix is for them not
         * to be independent.
         *
         * Which is also the truer statement. This body is one broken lump, and
         * the fracture surface under its crust follows the same overall shape
         * the outside does — they are not two unrelated processes the way a
         * planet's crust and mantle are. Sharing the curve keeps the shell a
         * band of VARYING thickness wrapped round a lumpy core, which is what
         * a cutaway of a fragment should look like, and makes crossing
         * impossible by construction rather than by tuning. */
        boundaryShare: "outer-shell",
        /* THE SAME FREQUENCY AS THE SHELL, necessarily. `boundaryShare` makes
         * the two boundaries the same curve; a different frequency would
         * sample that curve at a different rate and they would cross again,
         * which is the whole thing the sharing exists to prevent. */
        boundaryFreq: 4.2
      }
    ],

    /* NO `axes`. An asteroid is not tidally locked to anything in a way a
     * cross-section could show, and the tidal-lock axis exists to split a body
     * into a hot face and a cold one — a distinction that means nothing on a
     * rock with no atmosphere, no ocean and a surface temperature set almost
     * entirely by how far out it is. Declaring the axis anyway would put a
     * terminator on a body that cannot have one.
     *
     * NO `climate.subsurface` either, for the same kind of reason: there is
     * one temperature here and the card says it once. */
    climate: {
      /* THE WHOLE ROCK IS THE SAME TEMPERATURE, near enough. A body a few
       * kilometres across has no latitude worth the name — there is no
       * atmosphere to move heat around and no distance for the sun angle to
       * matter over. So the latitude term is turned almost off, and Starlight
       * moves the whole body together, which is what the spec's "-200 to
       * +100 C depending on distance from its star" actually describes. */
      latitude: 0.12,
      /* IT KEEPS ALMOST NONE OF ITS OWN HEAT, and that is a fact about being
       * small rather than about being a rock. Surface area goes as r^2 and
       * volume as r^3, so a body a few tens of kilometres across radiated
       * everything it formed with long ago and now sits at whatever its
       * sunlight puts it at — which is the spec's "-200 to +100 C depending on
       * distance from its star", stated as a mechanism.
       *
       * Not zero. Interior heat must remain a real control (a dial that does
       * nothing is worse than one that does the wrong thing), and on this body
       * the honest reading of it is "was this thing ever molten" — which
       * belongs mostly in the deep colour, where `heatLean` puts it, and only
       * faintly on the surface, which is what this figure leaves. */
      retainsHeat: 0.12
    },

    colorProfile: {
      hue: [0, 360],
      secondaryRel: "complement",
      order: ["outer-shell", "interior"],
      layers: {
        /* THE DUST FILM. A pseudo-role — it is drawn ON the shell rather than
         * as a band in the stack — so it is deliberately absent from `order`,
         * which encodes depth and a film has no radius. */
        "dust-film": DUST,
        /* SCRATCHED, DARK, NEARLY COLOURLESS. The shell is the least
         * interesting thing in the picture on purpose: it is a thin dark frame
         * whose job is to make the mosaic inside it read. Its depth gradient
         * is strong so the band has an inside and an outside rather than
         * reading as an outline. */
        "outer-shell": { sat: [0.05, 0.25], val: [0.20, 0.45],
                         depthGradient: 0.72,
                         film: DUST },
        /* THE MOSAIC'S GROUND. `mosaicFill` in draw/details.js fans 2-4
         * material tones out of this one colour, so what is authored here is
         * the CENTRE of that fan rather than any cell's own colour — which is
         * what keeps the Primary hue control moving the whole body.
         *
         * The value range is wide because the fan is wide: at the dark end the
         * body is a carbonaceous lump and at the light end a bright stony one,
         * and both are real asteroids. Saturation stays low at the floor and
         * reaches further than the shell's at the ceiling, because a metallic
         * fragment genuinely does carry colour where dust does not. */
        interior:     { sat: [0.10, 0.40], val: [0.20, 0.60],
                        depthGradient: 0.35,
                        /* WEAKLY HEAT-LEANED, AND MUCH LESS THAN A MOON'S.
                         *
                         * An asteroid is cold. It is too small to have kept
                         * any heat of its own, and the Interior heat control
                         * on this body should read as "was it ever molten"
                         * rather than as "is it molten now" — a faint warmth
                         * in the deep cells at the top of the range, never the
                         * glowing heart a planet gets. Giving it the moon's
                         * figures would make a maxed slider produce a small
                         * lava world, which is a different body. */
                        heatLean: { hue: [6, 30], amount: 0.20 },
                        heatGradient: 0.28 }
      }
    }
  };

  CC.Archetypes.register(ASTEROID);
})();
