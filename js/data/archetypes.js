/* Archetype definitions — pure data.
 *
 * An archetype is a recipe, not code. It declares a standard layer stack and a
 * colour profile; the structure stage turns it into a concrete body and the
 * renderer draws whatever comes out. Adding the twelfth body type should be an
 * edit to this file and nothing else.
 *
 * LAYER PROPERTIES (see docs/ARCHITECTURE.md for the full table)
 *
 *   role       layer identity — drives details, colour and label
 *   frac       [min, max] outer radius as a fraction of body radius
 *   boundary   perfect | near-perfect | slight | irregular | heavy | extreme
 *              | soft-gradient
 *
 * PRESENCE — how a layer decides whether it exists at all. One mechanism,
 * three forms, evaluated by one code path in gen/structure.js:
 *
 *   (omitted)              always present
 *   presence: 1.0          a 100% roll at max slider; scales down with Optional layers
 *   presence: { param, above, fade }
 *                          present only while the named parameter is above the
 *                          threshold; `fade` gives it a soft entry rather than
 *                          popping in
 *
 * This matters more than it looks. Ocean depth and Interior heat are the first
 * two users of the parameter form, but Cohesion, Operational status and Hull
 * integrity all want the same thing later. Making presence a first-class
 * layer property means those are data edits rather than special cases in the
 * stack builder.
 *
 * THICKNESS — likewise three forms:
 *
 *   frac: [min, max]       rolled, scaled by Layer thickness variation
 *   frac: { param, ... }   driven by a parameter instead of rolled
 *   bias: "core-bias"      a named control pushes the roll within its range */

var CC = CC || {};

CC.Archetypes = (function () {
  "use strict";

  var PLANET = {
    id: "planet",
    label: "Planet",
    family: "solid",
    tags: ["solid-surface", "solid-interior"],

    /* Radius in km, for stats and the scale bar. */
    radiusKm: [2400, 9800],

    /* Outermost first. The surface — the outer edge of the crust, or of the
     * ocean where one exists — is always a perfect circle: it is what makes a
     * planet read as a sphere rather than a potato.
     *
     * PROPORTIONS ARE DELIBERATELY STYLIZED, not physical. On a real planet
     * the crust is about 0.5% of the radius and the atmosphere is a hairline;
     * drawn honestly they are invisible slivers with no room for the traits,
     * cities, ice caps and ocean detail that are the entire point of a
     * cutaway. So the outer layers are exaggerated to roughly textbook-diagram
     * thickness — the proportions of a school science poster rather than a
     * measurement. The mantle is still visibly the bulk, so the picture stays
     * believable; the thin layers are simply legible.
     *
     * This is the "believable beats accurate" rule in docs/PROJECT-VISION.md
     * applied to geometry. Stats are derived from these radii, so they stay
     * consistent with the drawing rather than contradicting it. */
    stack: [
      {
        role: "atmosphere",
        /* Sits on the surface, whatever the surface turned out to be — rock on
         * a desert world, sea on an ocean world. Depth is fixed for now;
         * atmospheric thickness gets its own parameter later. */
        /* STARLIGHT BIASES HOW MUCH AIR SURVIVES, and only biases it.
         *
         * A close-in world loses its atmosphere to escape; a distant one
         * freezes it out onto the ground as frost. So the thickest air sits in
         * the middle of the Starlight range and both extremes thin — a hump,
         * not a ramp, which is what `peak` expresses.
         *
         * DELIBERATELY GENTLE (`amount` 0.26 of the roll). The thickness is
         * still mostly the layer's own roll; Starlight leans it. Any more and
         * Starlight would be an atmosphere slider wearing a different label,
         * which is not what the control is for. See CLIMATE-PLAN.md, settled
         * decision 1. */
        frac: { param: "atmosphereDepth", over: "surface", depth: [0.07, 0.13],
                nudge: { param: "starlight", peak: 0.5, amount: 0.26 } },
        presence: 2.0,
        boundary: "soft-gradient",
        /* Drawn as a falloff outward from the surface, so this layer extends
         * past the body proper and the view must leave room for it. */
        outward: true
      },
      {
        role: "ocean",
        /* Not rolled, and measured from the crust rather than from the centre:
         * an ocean floats on whatever crust the body happens to have, so its
         * thickness is a depth added on top. Dragging Ocean depth then raises
         * the sea over a fixed sea floor, instead of moving the floor.
         *
         * THE RANGE IS A SEA LEVEL SWEPT ACROSS THE TERRAIN. `crust.outer` is
         * the terrain's MEAN and peaks reach about +relief/2 (~0.052) above
         * it, troughs the same below. The range has to span that whole band
         * for the slider to sweep dry → Earth-like → waterworld:
         *
         *   0.000  at the terrain mean — roughly half land, Earth-like
         *   0.052  around the peak height — scattered islands
         *   0.062  over every peak — a fully drowned world
         *
         * The low end sits AT the mean rather than above it. Starting at
         * +0.004 put even the shallowest sea most of the way up the terrain,
         * so land never exceeded ~22% at any slider position and everything
         * past 35% was a total waterworld — most of the travel, and most
         * random rolls, produced the same drowned picture.
         *
         * THE TOP IS CAPPED JUST PAST THE PEAKS. It previously ran to 0.150,
         * which made the deepest sea 1.31x the thickness of the crust beneath
         * it — a Hycean water-world rather than a terrestrial planet. Drowning
         * every peak is all the depth this archetype needs; anything more only
         * makes the sea implausible. The ceiling now lands near 0.45x the
         * crust.
         *
         * It cannot go negative: the ocean is a real layer sitting on the
         * crust and the monotonic ordering clamp in gen/structure.js requires
         * it to be above its host. A genuinely dry world is Ocean depth 0,
         * where presence removes the layer entirely (PROGRESS.md D15). */
        /* RAISED FROM 0.062, TOGETHER WITH THE CRUST'S RELIEF.
         *
         * The sea was drawing at ~1.2% of the body radius at mid-slider, where
         * ARCHITECTURE.md and D5 both specify ~6%. Five times too thin, and it
         * had gone unnoticed because a thin sea still produces correct
         * coastlines — it is only when something has to be VISIBLE inside the
         * water (a pinched ocean, a frozen night face) that it fails.
         *
         * Raising this alone would only drown the world sooner: sea thickness
         * at a coastline is bounded by how deep the basins are, because the
         * water surface has to sit near the terrain mean for a coastline to
         * exist at all. So the crust's `relief` rose with it, which is what
         * creates the room. See PROGRESS.md D28. */
        frac: { param: "oceanDepth", over: "crust", depth: [0.0, 0.105],
                /* Give the shallow end most of the slider — see `curve` in
                 * gen/structure.js. Coastlines live in the bottom third of
                 * this range, so a linear response wasted two thirds of the
                 * control on worlds that were already fully drowned. */
                curve: 1.7 },
        /* Fades in from almost nothing rather than appearing at a threshold.
         * `strength` runs 0->1 across the fade band and the renderer uses it
         * to scale the sea's opacity, so the last of the water evaporates
         * instead of popping out of existence. */
        presence: { param: "oceanDepth", above: 0.004, fade: 0.075 },
        boundary: "perfect"
      },
      {
        role: "crust",
        /* Thick enough to hold surface detail, cities and impact structures.
         * A hot interior thins it and a dead one leaves it thick; a deep ocean
         * drowns it further, until at maximum depth it is barely a floor under
         * the water. */
        frac: [0.90, 0.94],
        /* This layer carries surface terrain. The structure stage only needs
         * to know the HEIGHT, so it can leave room for peaks above the layer's
         * mean radius; the full field is generated in gen/terrain.js from the
         * recipe in data/elements.js. Without this the stack renormalizes the
         * surface to exactly 1.0 (D3) and every peak is scaled to sit just
         * under it, so terrain can never break the sea and no coastline can
         * ever appear. See PROGRESS.md D15. */
        /* DEEPER BASINS, so the sea has somewhere to be.
         *
         * Raised from 0.105 alongside the ocean's range. A sea's thickness at
         * a coastline is bounded by the depth of the basins it fills — the
         * water surface must sit near the terrain mean for any coastline to
         * exist — so a visibly thick ocean and real coastlines are the same
         * requirement, and deeper relief is what satisfies both. This also
         * makes the terrain itself read more strongly, which suits the
         * stylized-diagram proportions of D5. */
        relief: 0.19,
        modulate: [
          { param: "interiorHeat", amount: -0.03 },
          { param: "oceanDepth", amount: -0.035 }
        ],
        boundary: "near-perfect"
      },
      {
        role: "mantle",
        /* The bulk of the body, and the layer with the most to show: this is
         * where convection cells and flow arrows live. The gap between this
         * and the crust's outer radius is what gives the crust its visible
         * thickness, so the two ranges are set together.
         *
         * PULLED IN from 0.80-0.855 once the detail work landed. The crust and
         * ocean carry surface terrain, coastlines, strata and fractures — the
         * richest material in the cutaway and the reason to look at one — and
         * at the old proportions they shared a ~13% rim while the mantle took
         * ~40%. Crust + ocean now get roughly a fifth of the radius. The
         * mantle is still comfortably the single largest layer, so the picture
         * stays believable; this is D5's stylized-proportions argument applied
         * a second time, now that there is something in those layers to see. */
        frac: [0.72, 0.78],
        boundary: "irregular"
      },
      {
        role: "outer-core",
        /* The liquid dynamo, and the mantle's floor.
         *
         * A COOLING CORE FREEZES INWARD RATHER THAN VANISHING. The outer edge
         * of the metal region barely moves as the world cools — what changes
         * is how much of it is still liquid. The solid inner core grows
         * outward into it (see `core` below), so the two layers trade space
         * while the metal region as a whole stays the same size. Earth's
         * inner core is doing this now.
         *
         * This layer is therefore always present. It previously disappeared
         * below ~12% Interior heat, which made the whole metal region jump
         * smaller — a dead world simply had less core, and the transition
         * popped. Freezing inward is both what really happens and the more
         * interesting picture: a dying world shows a big solid heart with a
         * thin liquid shell still clinging to it.
         *
         * The floor is raised (from 0.38) so it sits close to the top of the
         * solid core's range. The shell's thickness on a dead world is simply
         * this layer minus the frozen core beneath it, so a wide gap between
         * the two authored ranges puts a floor under how thin the shell can
         * ever get — at 0.38 it bottomed out at ~19% of the metal region,
         * which does not read as "nearly frozen solid". */
        frac: [0.435, 0.52],
        boundary: "near-perfect",
        bias: "coreBias"
      },
      {
        role: "core",
        /* The solid metal heart.
         *
         * GROWS AS THE WORLD COOLS, but only a little. `modulate` pushes its
         * outer radius up as Interior heat falls, freezing the liquid shell
         * above it from the inside out.
         *
         * THE INNER CORE IS NEARLY STATIC; THE SHELL IS WHAT CHANGES. An
         * earlier version used a much stronger modulate (-0.17) over a lower
         * base range, which inverted the reading: the solid core visibly
         * *shrank* as heat rose, so the picture said "the solid core is
         * melting away" rather than "the liquid shell is freezing". Since
         * solid metal is the thing that persists, it is the part that should
         * hold still. A small modulate over a base range that sits just under
         * the outer core's floor gives a shell that is a genuine sliver on a
         * dead world and half the metal region on a molten one.
         *
         * The top of this range must stay below the outer core's floor (0.435)
         * so the two never invert at the extremes — the doccheck asserts the
         * frac table composes at every combination, and the runtime clamp
         * existing is not a reason to author an overlap.
         *
         * The BASE RANGE IS THE COLD VALUE: `modulate` multiplies its amount
         * by the parameter, so at Interior heat 0 nothing is subtracted and
         * the core sits at its rolled radius, just under the liquid shell. */
        frac: [0.395, 0.425],
        modulate: [
          { param: "interiorHeat", amount: -0.185 }
        ],
        boundary: "near-perfect",
        bias: "coreBias"
      }
    ],

    /* PARAMETER AXES — always-present sliders that reshape the body.
     *
     * An axis is not a trait. TRAIT-SYSTEM.md's third test is "does the layer
     * stack differ, or only the values in it?", and tidal locking only ever
     * changes values — so it was an axis all along, exactly like Ocean depth
     * and Interior heat. It shipped as a trait first and that was a violation
     * of the project's own rule; see PROGRESS.md D27.
     *
     * The angular field is declared here and consumed by gen/zones.js. Nothing
     * in draw/ ever sees it: the generation stage turns it into plain
     * functions of angle, and the renderer only ever receives numbers. */
    axes: {
      tidalLock: {
        /* Which settings key drives it, and which aims it. `facing` is rolled
         * per body when the user has not set it, so every locked world is not
         * oriented identically. */
        param: "tidalLock",
        facing: "tidalFacing",
        dial: "Tidal locking",

        field: {
          id: "tidal-lock",
          axis: "equatorial",
          anchor: ["atmosphere", "ocean", "crust", "surface"],
          /* How much reaches layers below the anchor list. Low: a locked
           * world's asymmetry is a surface phenomenon, and letting it into the
           * mantle made the largest band on the disc carry the terminator. */
          residue: 0.06,
          blend: 0.25,

          /* THE THREE FACES. Every figure is a DELTA or a MULTIPLIER against
           * whatever the body already rolled — never an absolute value, which
           * is what makes one recipe work on any world.
           *
           *   relief  terrain amplitude. A baked dayside is smoother.
           *   sea     SIGNED sea-level offset, in units of the terrain's own
           *           range — the same units film.js's SNOWLINE and SHELF use.
           *           This is the centre of the whole feature: sea level is
           *           what every downstream system measures elevation against,
           *           so moving it by angle pinches the ocean AND drops the
           *           snowline AND moves the shore, with no new drawing code.
           *   air     atmosphere thickness multiplier.
           *
           * -1.25 on the hot face puts sea level below every trough, so the
           * ocean is genuinely absent there rather than thin. +0.34 on the
           * cold face bulges the night sea, which is where water actually
           * migrates on a locked world — a cold trap. */
          /* `snow` MOVES THE SNOWLINE, and it is deliberately separate from
           * `sea`.
           *
           * Conflating the two was a real bug: lowering sea level on the hot
           * face makes the terrain read as *high* ground, and high ground is
           * where snow goes — so the baked dayside came out snowcapped. They
           * are different ideas. Sea level says where the water is; the
           * snowline says how cold it has to be before deposition turns
           * white, and on a locked world that is a property of the FACE, not
           * of the elevation.
           *
           * Signed, in the same terrain-range units as `sea`: negative drags
           * the snowline down (snow reaches sea level and below — an ice cap),
           * positive pushes it up out of reach. */
          /* FOUR ZONES: hot, twilight, cold, twilight. Two twilight bands
           * ensure the terminator is symmetric — without a second one, the
           * hot and cold faces abutted directly on one side, producing an
           * unexplained asymmetric depression in the ocean. Both twilight
           * zones flex together via `resolveArcs`. */
          zones: [
            /* `air` IS A SCALE HEIGHT, NOT A GAS BUDGET.
             *
             * These read 1.30 / 1.00 / 0.45 — thickest over the heated face,
             * collapsing toward the night — because a hot atmosphere is a
             * TALLER one: warm gas expands and the column puffs up, while the
             * cold face is where it contracts and freezes out. That is what
             * makes a locked world's air egg-shaped, bulging toward its star.
             *
             * The first version had 0.55 / 1.00 / 0.40, reasoning that the
             * dayside is "stripped". Escape does thin the air over geological
             * time, but it is not what a cross-section shows: with both
             * extremes below the twilight band the silhouette bulged at the
             * TERMINATOR and pinched at both poles of the axis — a peanut,
             * which is neither what the physics gives nor what the feature is
             * for. It only became visible once the geometry started reading
             * these numbers; while the renderer drew a circle regardless, the
             * values could be wrong without showing. */
            /* `temp` IS THE FIELD THAT SAYS WHAT THE MATERIAL IS.
             *
             * Signed, in the same 0..1 space the body's own climate uses, so
             * it PERTURBS rather than replaces: a hot world's night face is
             * milder than a cold world's, and neither becomes the other. It is
             * what lets the frosting paint a night cap as actual ice instead
             * of in whatever hue the global family happened to roll — the gap
             * that made a 100% locked world read as bare-vs-covered rather
             * than scorched-vs-frozen. */
            { id: "hot", label: "Dayside",
              arc: 140, relief: 0.55, sea: -0.85, air: 1.30,
              snow: +2.20, temp: +0.42,
              colorShift: { hue: -10, sat: +0.10, val: +0.10 },
              cover: 0.10 },

            { id: "twilight", label: "Twilight Band",
              flex: true, arc: 40, arcOpen: 170,
              relief: 1.00, sea: 0.00, air: 1.00, snow: 0.00,
              temp: 0.00,
              colorShift: { hue: +2, sat: +0.03, val: +0.01 },
              cover: 1.35 },

            { id: "cold", label: "Nightside",
              arc: 140, relief: 1.25, sea: +0.22, air: 0.45,
              snow: -1.10, temp: -0.40,
              colorShift: { hue: +8, sat: -0.06, val: -0.10 },
              cover: 1.30 },

            { id: "twilight", label: "Twilight Band",
              flex: true, arc: 40, arcOpen: 170,
              relief: 1.00, sea: 0.00, air: 1.00, snow: 0.00,
              temp: 0.00,
              colorShift: { hue: +2, sat: +0.03, val: +0.01 },
              cover: 1.35 }
          ]
        }
      }
    },

    /* CLIMATE — whether this body has a thermal structure of its own.
     *
     * DECLARED, LIKE `axes`, AND FOR THE SAME REASON. gen/climate.js builds a
     * field on every body, but a star or a gas giant inheriting a polar
     * cooling term would be nonsense — so an archetype that omits this gets a
     * FLAT field at its own baseline: it still has a temperature everywhere,
     * it simply has no latitude to it.
     *
     * `latitude` is how strongly the poles run colder than the equator, as a
     * multiplier on the drop. 1 is a full terrestrial gradient. A body that is
     * mostly its own heat source — a star, a young gas giant — would author a
     * small figure or omit the spec entirely.
     *
     * There is deliberately no cap primitive here and there must never be one.
     * Caps EMERGE: climate lowers a snowline and draw/film.js's existing
     * deposition model pools it into the valleys and thins it on the ridges.
     * D27 cut `ice-caps` as a drawn wedge for exactly this reason, and the
     * reasoning still holds. */
    climate: {
      latitude: 1.0
    },

    /* Hue is free; saturation and lightness follow the archetype. Phase 2
     * consumes this — it is here now so the data format settles in one place. */
    colorProfile: {
      hue: [0, 360],
      secondaryRel: "complement",
      /* Declared surface-to-centre order. Colour is derived from a layer's
       * position in THIS list, not from its measured radius, so changing one
       * layer's thickness never recolours its neighbours. Must list every
       * role in `layers`, outermost first. */
      order: ["atmosphere", "ocean", "crust", "mantle", "outer-core", "core"],
      layers: {
        /* `hue` on a layer means the material has a colour of its own that
         * holds whatever the rest of the body is made of; `hueLean` is how far
         * it drifts toward the body's primary hue. Layers without one derive
         * their hue from the primary/secondary anchors by depth. */
        atmosphere:   { sat: [0.15, 0.45], val: [0.55, 0.85] },
        /* THE OCEAN IS THE ONLY LAYER WITH AN ABSOLUTE HUE, and the reason is
         * recorded in gen/palette.js: without it, a sea on a rust-coloured
         * world came out brown, which was the single thing that most stopped
         * these reading as planets. An authored hue range is a strong claim
         * that needs a stated reason — this one has it, and the frosting's did
         * not, which is why the frosting's was removed entirely (D19/D39).
         *
         * `exotic` is what the Exotic oceans checkbox switches to. Measured
         * across 300 bodies, THREE separate limits confined the sea to
         * cyan-through-blue and all three have to lift together, or "exotic"
         * would only mean "a dark sea of a different hue":
         *
         *   the hue range itself       160..256 of 360 measured
         *   `hueLean`, which meant the user could not override it even by
         *                              setting the primary to red
         *   `val`, capped at 0.38, so no sea could ever be pale or bright
         *
         * `wild` frees the hue to the whole wheel with no lean at all; the
         * lifted `val` ceiling is what makes pale, milky, white and near-black
         * seas reachable; and `activity` is the Star activity coupling — with
         * the box on, a violent star pushes the water toward looking
         * chemically wrong, which gives the checkbox a reason to exist inside
         * the simulation rather than being only a taste switch. */
        /* DEEP WATER IS DARK WATER, and that is the one gradient in the stack
         * that needs no stylistic justification at all — light is absorbed
         * with distance through a fluid, so a sea genuinely shades from bright
         * shallows to near-black in its depths. It is also what gives the
         * ocean band the sense of VOLUME that a flat blue ring cannot have.
         *
         * Strong (0.86): the sea is a thin band and it is seen against a lit
         * surface, so a gentle ramp would be lost. This is the layer that can
         * take the most dramatic treatment of any in the stack. */
        ocean:        { sat: [0.42, 0.72], val: [0.22, 0.48],
                        hue: [186, 232], hueLean: 0.16,
                        depthGradient: 0.86,
                        exotic: { wild: 1,
                                  sat: [0.06, 0.92], val: [0.10, 0.78],
                                  activity: { sat: 0.32, val: 0.22 } } },
        /* The crust gets a DEPTH gradient rather than a thermal one: it is
         * layered rock, and it darkens downward because light falls off into a
         * solid and because deeper rock is compacted and duller. Not driven by
         * Interior heat — a crust is stratified on a dead world too.
         *
         * Kept gentle. The crust is a thin band carrying terrain, strata and
         * coastlines already, and a strong ramp under all of that would fight
         * the detail rather than seat it. */
        crust:        { sat: [0.10, 0.34], val: [0.28, 0.62],
                        depthGradient: 0.82 },
        /* SURFACE FROSTING — a pseudo-role, not a layer in the stack.
         *
         * Material deposited on the terrain: snow, vegetation, reefs, silt,
         * abyssal ooze. Drawn as part of the crust rather than as its own
         * band, so it is deliberately absent from `order`; the palette
         * resolves it by role name alone.
         *
         * FOUR ZONES, read off the height field and the sea level — peak,
         * land, shallow, deep. Each gets its own colour here and its own
         * deposition character in draw/film.js. Between them they cover a
         * body from its snowline to its abyssal plain without anything
         * resembling a biome system: it is one terrain field, read four ways.
         *
         * NO AUTHORED HUE RANGE, on purpose. The first version authored
         * 70..145 (green through olive) and rotated it by aridity; because
         * aridity was near-constant, every world landed on the same ochre and
         * none was ever green — the narrow range achieved the opposite of its
         * intent. These worlds are meant to be wildly varied, so the base hue
         * now rolls anywhere on the wheel and orange grass or pink forests are
         * a feature. What is enforced instead is CONTRAST AGAINST THE ROCK,
         * which is a relationship rather than a colour, so hue can roam freely
         * without any world losing its cover into the background.
         *
         * `hueOffset` is in degrees before this world's spread multiplier, so
         * the four zones stay a family: related colours at authored distances,
         * not four unrelated paints. */
        film:         {
          surface: true,
          zones: {
            /* Snow and ice. Achromatic and bright on a cold world; on a hot
             * one `snow` does nothing and this stays bare high ground in the
             * family's own colour. */
            /* THE VALUE RANGES ARE NARROW AND BARELY OVERLAP, on purpose.
             *
             * They were authored wide (spans of 0.24-0.32, overlapping
             * heavily) and a random roll could then put the abyssal floor
             * brighter than the snowline — the four zones had no reliable
             * lightness order. Worse, the contrast rule has to lift the whole
             * family clear of the rock, and a family that starts wide has
             * nowhere to go: 48% of all zone colours ended up pinned against
             * the ceiling with their spacing gone.
             *
             * Narrow bands, ordered peak > shallow > land > deep and centred
             * low, leave the lift room to work and keep the order stable. */
            frostPeak:    { hueOffset:  18, sat: [0.20, 0.55],
                            val: [0.60, 0.72], snow: true },
            /* The ordinary surface: vegetation, soil, dust. The zone the old
             * single `film` colour corresponds to, and the alias target. */
            frostLand:    { hueOffset:   0, sat: [0.48, 0.90],
                            val: [0.38, 0.50] },
            /* Shelf and shoreline — reefs, algal mats, bright shallow water
             * sediment. Offset furthest, because a coast that differs clearly
             * from the land above it is what makes the zones legible. */
            frostShallow: { hueOffset: -52, sat: [0.55, 0.95],
                            val: [0.48, 0.60], aquatic: true },
            /* The abyssal floor: ooze and deep sediment. Darker and duller —
             * it is the one zone that is mostly seen THROUGH the sea, which
             * darkens whatever is under it. */
            frostDeep:    { hueOffset: -84, sat: [0.35, 0.70],
                            val: [0.26, 0.38], aquatic: true }
          }
        },
        /* The mantle is the layer the eye spends most of its time on, and it
         * has to carry HOW HOT THIS WORLD IS.
         *
         * `heatLean` gives it a hot-side hue to travel toward, scaled by the
         * Interior heat dial — not a fixed hue like the core's. At heat 0 it
         * keeps the anchor-derived rock colour it always had; at heat 1 it
         * leans hard toward the same red-orange band the metal interior sits
         * in, so a hot world reads as hot all the way out from the core
         * instead of only at it. See PROGRESS.md D59.
         *
         * The value ceiling is lifted from 0.46 to 0.58. The old range was
         * darker than the CRUST above it (0.28-0.62), which is upside down for
         * a layer meant to be hotter, and it left the heat push no headroom to
         * push into — a mantle that starts at 0.46 cannot brighten far before
         * it hits the fluorescent ceiling. The floor stays low so a dead world
         * still gets a genuinely dark, cold mantle. */
        mantle:       { sat: [0.32, 0.64], val: [0.26, 0.58],
                        /* THE TARGET IS MOLTEN ROCK, WHICH IS RED-ORANGE.
                         *
                         * The range was [8, 42], whose top half is amber — and
                         * since the lean is a journey, hues approaching from
                         * the green side stalled at the top of it. Measured at
                         * full heat: 40% of mantles came out yellow-olive and
                         * a further 39% amber, which is sulphur and khaki, not
                         * lava. Narrowed to the reds so that even a mantle
                         * that only gets PART of the way still lands somewhere
                         * hot. Yellow and white are the core's business. */
                        heatLean: { hue: [2, 26], amount: 0.72 },
                        heatGradient: 0.78 },
        /* The metal interior glows. Its hue is anchored in the red-orange
         * band and leans only slightly toward the body's own colours, so a
         * blue world still has a hot core rather than a blue one.
         *
         * `incandescent` marks these as self-lit: they are exempt from the
         * saturation ceiling that keeps ordinary materials off the
         * fluorescent corner, because for molten metal the glow IS the
         * material. Without the exemption a hot core came out dull. */
        /* Both metal layers grade as well, and for the same reason the mantle
         * does: a liquid dynamo is hotter against the inner core than against
         * the mantle, and the solid core is radiating heat outward from its
         * centre. Drawing that is what makes the interior read as a heat
         * SOURCE rather than as two flat discs.
         *
         * Their hue is already pinned in the hot band, so the gradient mostly
         * moves value and saturation here — which is exactly what "glowing
         * harder toward the middle" looks like. */
        "outer-core": { sat: [0.70, 0.95], val: [0.52, 0.76],
                        hue: [10, 40], hueLean: 0.20, incandescent: true,
                        heatLean: { hue: [22, 48], amount: 0.30 },
                        heatGradient: 0.85 },
        core:         { sat: [0.48, 0.80], val: [0.84, 1.00],
                        hue: [28, 54], hueLean: 0.16, incandescent: true,
                        /* `ceiling: false` — the inner core is the one layer
                         * that SHOULD reach yellow and white. It is the
                         * hottest thing in the picture, and the ceiling that
                         * keeps molten rock out of the yellows would be
                         * fighting the very look this layer exists to have. */
                        heatLean: { hue: [40, 60], amount: 0.22,
                                    ceiling: false },
                        heatGradient: 0.88 }
      }
    }
  };

  var ALL = { planet: PLANET };

  function get(id) { return ALL[id] || PLANET; }
  function ids() { return Object.keys(ALL); }

  return { get: get, ids: ids, PLANET: PLANET };
})();
