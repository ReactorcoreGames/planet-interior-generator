/* Moon — the frosting tables and the tidal-lock axis, split out of
 * solid-moon.js.
 *
 * SPLIT AT A REAL SEAM, not at a line count. These three are one concern —
 * what settles on a moon's surfaces and what it is made of — and the stack
 * beside them is another. The file passed the 500-line rule in CLAUDE.md and
 * this is the cut its own shape wanted, which is the same reasoning the
 * stellar data layer's split used (D128).
 *
 * Three tables, because an ice-shelled moon frosts TWO surfaces facing each
 * other across a dark ocean and a bare moon frosts one:
 *
 *   REGOLITH    the bare moon's surface — rock ground to dust by impacts
 *   BRINE       the sea floor under an ice shell, frosted upward
 *   ACCRETION   the shell's underside, frosted DOWNWARD into the water
 *
 * The tidal-lock axis joined them later, and it belongs here for the same
 * reason: it declares a DIFFERENT RECIPE PER BRANCH, which is the same kind of
 * statement a per-branch frosting makes. Both say "what this body does depends
 * on which stack it rolled", so they sit together and solid-moon.js is left
 * holding the stack and the colours.
 *
 * Published on CC.MoonFilm because solid-moon.js reads them and the project
 * has no module system by deliberate choice (CLAUDE.md). Load order in
 * index.html: this file, then solid-moon.js. */

var CC = CC || {};

CC.MoonFilm = (function () {
  "use strict";

  /* ---- REGOLITH ------------------------------------------------------
   *
   * TWO ZONES, NOT FOUR. A planet's four exist because it has a sea to divide
   * its ground into shore and abyss; an airless moon has one surface and one
   * question about it — is this rim, or is this floor?
   *
   * The zone machinery is already generic over count (D22/D23): a table with
   * no `aquatic` row simply never reaches the shelf and deep ramps, and
   * `zoneWeights` renormalizes over whatever the archetype declared. So this
   * is data, exactly as the gas giant's floor was.
   *
   * REGOLITH IS THE STRONGEST CASE FOR DEPOSITION AFTER THE PLANET, because
   * it genuinely IS deposition — impact gardening throws it up and it settles
   * back into the low ground. `depositTop` already pools material in hollows
   * and sheds it from ridges, which is precisely "pools in crater floors and
   * is swept off rims". High `smooth`, so it levels; near-zero `patch`, so it
   * is an even blanket rather than a blotchy one. A dust sheet is not patchy.
   *
   * COLOUR IS SUBTLE MINERAL TINT ON GREY, not literal grey. Faint ochre,
   * rust, blue-grey. Two things get us there without fighting the contrast
   * rule: the ranges are narrow and the gap between the two zones is small,
   * which is what the spec means by "author dullness by narrowing the ranges".
   * The floor at `host.s + 0.14` stays — a frosting that matches its rock in
   * both value and saturation is invisible, which is the D19 failure, and an
   * airless moon lands at the dry end of aridity and desaturates for free
   * anyway.
   *
   * `snow` IS KEPT, AND D22'S REASONING FOR DROPPING IT IS SUPERSEDED.
   *
   * D22 said to drop it because "a dead airless body has no weather to deposit
   * it". That was sound when the only route to whiteness was a global aridity
   * figure — a flat white moon would have been telling the wrong story. But
   * the field is ANGULAR now, and cold-trapped volatile ice in permanently
   * shadowed polar craters is real, is visually excellent, and is exactly what
   * an emergent snowline produces. So the flag stays and a warm moon's own
   * baseline denies it: close to its star it gets bare regolith because its
   * field is warm, far out it grows polar frost because its field is cold.
   * The same conditional the planet's caps use, and no new mechanism.
   *
   * The snowline sits HIGH (0.62 against a planet's 0.42) because a cold trap
   * is high ground's exception rather than its rule — it wants the top of the
   * relief and the cold end of the field at once, not merely one of them. */
  var REGOLITH = {
    surface: true,
    /* REGOLITH IS THE ROCK, GROUND UP — so its hue is the rock's hue, and the
     * authored offsets below are mineral tints departing from it rather than
     * unrelated colours. Without this the free frosting hue put moss-green
     * dust on grey stone. See `hueFrom` in gen/frosting.js. */
    hueFrom: "host",
    line: 0.62,
    /* Pushed out of reach: there is no sea, so there is no shelf, and a
     * threshold within range would divide dry ground for no reason. */
    shelf: -4.0,
    zones: {
      /* Swept rims, ridges and crater walls — thin, bare, barely covered. The
       * mineral tint that says what the rock is made of. */
      /* SMALL OFFSETS, because the world's hue `spread` multiplies them and a
       * moon's two zones must stay one material. Measured at +10/-22 the floor
       * landed 25 degrees off the rock; the spec's instruction is to author
       * dullness by narrowing the gaps between zones, and this is that. */
      regolithRim:   { hueOffset:   5, sat: [0.16, 0.34], val: [0.44, 0.56],
                       snow: true,
                       depth: 0.18, smooth: 0.62, bleed: 0.34,
                       patch: 0.12, grain: 0.14 },
      /* Crater floors and every low place — where the dust actually collects.
       * Thick, level and almost featureless, which is what a dust sheet is. */
      regolithFloor: { hueOffset: -11, sat: [0.20, 0.40], val: [0.34, 0.46],
                       depth: 0.42, smooth: 0.94, bleed: 0.26,
                       patch: 0.06, grain: 0.05 }
    }
  };

  /* ---- THE TWO FACING SURFACES ---------------------------------------
   *
   * The ice branch's payoff, and the one place a frosting deposits UPWARD.
   *
   * Two frosted surfaces across a dark ocean:
   *
   *   the rock floor takes an ordinary upward field, with frosting settling
   *   into its trenches — brine pools and dark sediment gathering in the low
   *   ground, which is exactly what deposition already does;
   *
   *   the shell's UNDERSIDE takes a second field whose frosting deposits
   *   downward into the water as accreted ice, hanging with coloured tips.
   *
   * `direction: -1` is what states the second case. draw/film.js settles
   * material outward from the rock; a mirrored deposit is a handful of sign
   * changes rather than a rewrite, and it is real work that was worth scoping
   * rather than discovering.
   *
   * NOTHING HERE NAMES A LAYER. The film pass already walks every layer that
   * carries `relief`, so two frosted surfaces need no new loop — only two
   * roles that each declare a terrain field, and a table each. What was
   * missing was that the zone table and its colours were resolved ONCE for the
   * whole body; they are per-role now, keyed the way the elements table
   * already keys relief. */
  var BRINE = {
    surface: true,
    /* No snowline reaches the bottom of an ocean, and no shelf divides it.
     * Both thresholds are pushed out of range so the two zones split the
     * floor between them by elevation alone. */
    line: 4.0,
    shelf: -4.0,
    zones: {
      /* The exposed rock of the sea floor's high ground. */
      brineRock:  { hueOffset:  6, sat: [0.14, 0.32], val: [0.26, 0.38],
                    depth: 0.20, smooth: 0.55, bleed: 0.40,
                    patch: 0.30, grain: 0.18 },
      /* Brine pools and dark sediment in every trench. The darkest thing in
       * the picture after the water itself — it is seen THROUGH the ocean,
       * which darkens whatever is under it, so it is authored dark and the
       * water does the rest. */
      /* Shares the ocean's depth budget with `accretionTip` — see the note
       * there. Slightly the shallower of the two, because sediment settling
       * on a floor is a thinner thing than ice accreting onto a shell, and
       * because the floor is the surface a reader is less likely to be
       * looking for. */
      brinePool:  { hueOffset: -40, sat: [0.34, 0.66], val: [0.20, 0.32],
                    aquatic: true,
                    depth: 0.30, smooth: 0.96, bleed: 0.24,
                    patch: 0.08, grain: 0.04 }
    }
  };

  var ACCRETION = {
    surface: true,
    /* THE DEPOSIT HANGS DOWNWARD. Everything in draw/film.js is written as
     * "outward from the rock"; -1 mirrors it, so the material builds from the
     * shell's underside DOWN into the water and its own smoothed surface is
     * measured the same way inverted. The zone maths is untouched — this is a
     * statement about which way is up, not about what a zone is. */
    direction: -1,
    /* THE THRESHOLDS HAVE TO SIT INSIDE THE FIELD'S OWN RANGE, or the ramps
     * saturate and the zones SWITCH instead of blending.
     *
     * These were 4.0 and -4.0 — "push both out of reach", reasoning that an
     * underside has no snowline and no shore. That is true about the physical
     * meaning and wrong about the arithmetic: `zoneWeights` builds each zone
     * from a smoothstep across a threshold, so a threshold far outside the
     * range makes every ramp return exactly 0 or 1. Measured, the two zones
     * came out at [1.00, 0.00] or [0.00, 1.00] at nearly every bearing, with
     * nothing in between — and because they declare very different depths
     * (0.16 against 0.36), the drawn band jumped 3.4x in thickness between
     * neighbouring bearings. That is the hard-edged, lopsided-looking deposit,
     * and it is exactly the "a zone ending on a line reads as a drawn contour"
     * failure the blend widths exist to prevent.
     *
     * `shelf` at 0 puts the boundary in the MIDDLE of the underside's own
     * range, so the shell's high spots take one zone and its dips take the
     * other, blended across BLEND either side. `line` stays out of reach
     * because the top zone genuinely has no snowline to answer to — that one
     * is a real absence rather than an arithmetic dodge, and it is safe
     * because `accretionShelf` does not declare `snow`, so the peak ramp is
     * never consulted. */
    line: 4.0,
    shelf: 0.0,
    zones: {
      /* The shell's own ice where nothing has accreted onto it. */
      accretionShelf: { hueOffset:  8, sat: [0.06, 0.20], val: [0.62, 0.78],
                        depth: 0.16, smooth: 0.70, bleed: 0.30,
                        patch: 0.14, grain: 0.10 },
      /* Accreted ice, hanging into the water with coloured tips. The tips are
       * where the ocean's own chemistry ends up, so this is the one zone on a
       * moon allowed a real hue offset and a real saturation. Low `smooth`, so
       * it DRAPES and follows rather than levelling: an accretion is
       * stalactite-shaped, and a high `smooth` would flatten exactly the tips
       * that carry the whole idea. */
      /* THE TWO DEPOSITS ARE A PAIR AND MUST BE TUNED AS ONE — D158, and it
       * took a second round to apply it to my own work.
       *
       * These reach toward each other across the SAME gap, so their depths
       * add. Deepened independently to 0.95 and 0.80 — each defensible on its
       * own against "does this cross the water" — they came to 80% and 79% of
       * the ocean's thickness, or 159% together. They met in the middle, and
       * the picture was a pale opaque mass with the dark water eaten out of
       * it: the user's words were "a rather pale looking, something ugly,
       * void". Both marks were doing exactly what their own numbers said.
       *
       * THE BUDGET IS THE GAP, and it has to be shared. Roughly a third each
       * at the deepest zone leaves a clear third of open water between the
       * two frosted surfaces — which is what makes them read as facing each
       * other across an ocean rather than as one fused band. `depth` is a
       * fraction of the HOST LAYER, so the two figures differ because the
       * shell and the crust are not the same thickness; what matters is where
       * they land against the OCEAN, and that is the number to check. */
      accretionTip:   { hueOffset: -56, sat: [0.30, 0.62], val: [0.48, 0.64],
                        aquatic: true,
                        depth: 0.36, smooth: 0.22, bleed: 0.20,
                        patch: 0.42, grain: 0.55 }
    }
  };

  /* ---- THE TIDAL-LOCK AXIS -------------------------------------------
   *
   * Lives here rather than in solid-moon.js for the same reason the frosting
   * tables do: that file crossed the 500-line rule again, and this is the cut
   * its own shape wants. An axis that declares a DIFFERENT RECIPE PER BRANCH
   * is the same kind of statement as a frosting that does — both are "what
   * this body does depends on which stack it rolled" — so the two belong
   * together and the archetype is left holding the stack and the colours.
   *
   * See `field_when` below for why the ice branch needs its own recipe at
   * all; the short version is that the planet's recipe moves SEA LEVEL, and a
   * sealed ocean under a rigid shell has nowhere to go. */
  var TIDAL_LOCK = {
    param: "tidalLock",
    facing: "tidalFacing",
    dial: "Tidal locking",
    field: {
      id: "tidal-lock",
      axis: "equatorial",
      anchor: ["atmosphere", "ice-shell", "crust", "surface"],
      residue: 0.05,
      blend: 0.25,

      /* ---- THE ICE BRANCH LOCKS DIFFERENTLY ------------------------
       *
       * A locked world's signature move is that SEA LEVEL travels: the
       * water boils off the hot face and cold-traps on the night one, and
       * every downstream system reads elevation against it, so one field
       * pinches the ocean AND drops the snowline AND moves the shore.
       *
       * THAT IS A CLAIM ABOUT A SEA WITH A SKY OVER IT, and under an ice
       * shell it is false in two independent ways:
       *
       *   a subsurface ocean has no exposed surface to evaporate FROM and
       *   nowhere to retreat TO — it is sealed;
       *
       *   the shell above it is a rigid layer at a fixed radius, so an
       *   ocean that retreats leaves the render asserting an unsupported
       *   lid spanning a void. The picture needs pillars holding it up,
       *   which is the tell that it is describing something impossible.
       *
       * Measured before this existed: sea level swung 0.149 of the body
       * radius across a fully locked ice moon.
       *
       * SO THE ICE BRANCH WRITES A SHORTER RECIPE. `gen/zones.js` reads
       * every field through `fieldAt(angle, key, neutral)`, so a key a
       * recipe OMITS takes its neutral value — the same move the gaseous
       * and stellar families already make, and it costs no code.
       * `sea` and `snow` are simply absent here, so the ocean stays the
       * full concentric band it physically is and the surface stays a
       * sphere.
       *
       * THE LOCK DOES NOT DEFORM THE SHELL, AND THAT IS A CORRECTION.
       *
       * The first version swelled the shell — negative on the tidal axis —
       * reasoning that flexing melts ice from beneath, so the shell should
       * be THINNER where the parent pulls hardest. The reasoning is right
       * and the mechanism was wrong.
       *
       * `swell` displaces a layer's OUTER boundary while the layer keeps its
       * thickness, so the whole shell slid inward and its inner edge pressed
       * down into the ocean. Measured at lock 0.8: the shell's boundary swung
       * 27% of the ocean's thickness and the water came out 1.32x wider on
       * one side than the other — which is exactly the "ocean squished on the
       * sunny side" the user reported, arriving from the fix meant to replace
       * the ocean retreat rather than from the retreat itself.
       *
       * To thin a SURFACE layer you must move its INNER edge outward, not its
       * outer edge inward, and no field does that today. Rather than build one
       * to carry a subtlety, the lock on an ice moon is left to what it can
       * already say honestly: temperature, cover and colour. The shell stays
       * an even sphere, the ocean stays an even band, and nothing in the
       * picture asserts a mechanism the geometry is not performing.
       *
       * A future session wanting the flexing to READ should build a
       * per-bearing THICKNESS field (moving the inner edge) rather than
       * reusing the boundary displacement — and check it against the ocean's
       * thickness, which is the budget it eats. */
      field_when: {
        "ice-shell": {
          id: "tidal-lock",
          axis: "equatorial",
          anchor: ["atmosphere", "ice-shell", "surface"],
          residue: 0.04,
          blend: 0.25,


          zones: [
            /* NO `sea`, NO `snow` — see above. The ocean is sealed, so
             * neither key means anything here and both take their
             * neutral value by being absent. */
            { id: "hot", label: "Tidal Bulge",
              arc: 140, relief: 0.85, air: 1.20, temp: +0.30,
              colorShift: { hue: -8, sat: +0.06, val: +0.08 },
              cover: 0.40 },
            { id: "twilight", label: "Twilight Band",
              flex: true, arc: 40, arcOpen: 170,
              relief: 1.00, air: 1.00, temp: 0.00,
              colorShift: { hue: +2, sat: +0.02, val: +0.01 },
              cover: 1.10 },
            { id: "cold", label: "Far Face",
              arc: 140, relief: 1.10, air: 0.55, temp: -0.30,
              colorShift: { hue: +6, sat: -0.04, val: -0.06 },
              cover: 1.15 },
            { id: "twilight", label: "Twilight Band",
              flex: true, arc: 40, arcOpen: 170,
              relief: 1.00, air: 1.00, temp: 0.00,
              colorShift: { hue: +2, sat: +0.02, val: +0.01 },
              cover: 1.10 }
          ]
        }
      },

      zones: [
        /* THE BARE MOON. Milder than the planet's throughout: a moon has
         * no sea to boil and no thick air to redistribute heat, so what a
         * lock produces here is a temperature difference and a scoured
         * face, not the planet's molten-vs-frozen theatre.
         *
         * `sea` and `snow` are kept on this branch. There is no ocean
         * layer, so `sea` moves the level line the frosting measures
         * elevation against — which is what makes the dayside read as dry
         * high ground — and `snow` is what puts cold-trapped volatile ice
         * in the night face's craters. */
        { id: "hot", label: "Dayside",
          arc: 140, relief: 0.80, sea: -0.85, air: 1.20,
          snow: +1.80, temp: +0.34,
          colorShift: { hue: -8, sat: +0.06, val: +0.08 },
          cover: 0.25 },
        { id: "twilight", label: "Twilight Band",
          flex: true, arc: 40, arcOpen: 170,
          relief: 1.00, sea: 0.00, air: 1.00, snow: 0.00,
          temp: 0.00,
          colorShift: { hue: +2, sat: +0.02, val: +0.01 },
          cover: 1.15 },
        /* THE COLD TRAP. This is where the kept `snow` flag pays off: a
         * locked moon's night face drags the snowline down and the rim
         * zone claims the high ground as volatile ice. */
        { id: "cold", label: "Nightside",
          arc: 140, relief: 1.15, sea: +0.10, air: 0.50,
          snow: -1.30, temp: -0.34,
          colorShift: { hue: +6, sat: -0.04, val: -0.06 },
          cover: 1.20 },
        { id: "twilight", label: "Twilight Band",
          flex: true, arc: 40, arcOpen: 170,
          relief: 1.00, sea: 0.00, air: 1.00, snow: 0.00,
          temp: 0.00,
          colorShift: { hue: +2, sat: +0.02, val: +0.01 },
          cover: 1.15 }
      ]
    }
  };

  return { REGOLITH: REGOLITH, BRINE: BRINE, ACCRETION: ACCRETION,
           TIDAL_LOCK: TIDAL_LOCK };
})();
