/* The detail stage's fields: each layer's terrain, film mask and sea level, and
 * the per-bearing `ground` functions the trait placement asks where the rock is.
 *
 * Split out of gen/details.js, which passed the 500-line rule. Attached to
 * CC.Details; gen/details.js and gen/details-traits.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;
  var absorbedScale = CC.Details.absorbedScale;

  /* How high a fluid layer may rise before it collides with what is outside
   * it. The inner edge of the next layer out, or the body's surface when
   * that fluid is the outermost thing there is.
   *
   * An outward layer counts: an atmosphere's inner edge is exactly where the
   * sea must stop, and it is the layer the night-side bulge was drowning. */
  function ceilingAbove(fluid, body) {
    var idx = body.layers.indexOf(fluid);
    if (idx <= 0) return body.surface;

    var above = body.layers[idx - 1];

    /* A SOLID LAYER IS A HARD LID; GAS IS NOT.
     *
     * The structure stage settles an atmosphere directly onto the sea, so
     * `atmos.inner === fluid.outer` exactly and the sea has literally no
     * room — which would flatten the night-side bulge to nothing. But a
     * rising sea does not stop at the bottom of the air, it DISPLACES it:
     * water pooling on the cold face pushes the atmosphere up rather than
     * hitting a ceiling.
     *
     * So an outward layer yields a fraction of its own thickness. Enough for
     * the bulge to read, far short of the drowning D29 was chasing — the
     * atmosphere keeps most of its depth over the night sea. A solid layer
     * above still stops the fluid dead, because rock does not compress. */
    if (above.outward) return above.inner + above.thickness * 0.30;
    return above.outer;
  }

  /* ---- a layer's fields ------------------------------------------------- */

  function layerTerrain(st, i) {
    var body = st.body, seed = st.seed;
    var traits = st.traits, zones = st.zones;
    var terrain = st.terrain, film = st.film, seaLevel = st.seaLevel;
    var layer = body.layers[i];
    var role = layer.role;

    /* Surface terrain, where the role declares one. Built per layer and
     * keyed by role, so a layer's terrain never depends on what else is in
     * the stack. */
    /* AN ARCHETYPE MAY STATE ITS OWN TERRAIN, and the moon is the first that
     * has to. The elements table is keyed by ROLE globally, so `crust` is
     * one recipe shared by every body that has one — which is right for
     * strata and fractures, and wrong for the shape of the ground. A moon's
     * surface is craters on craters with no landmasses at all; a planet's is
     * continents with craters on top. Those are different fields, not one
     * field at a different amplitude, so `elementScale` could not say it.
     *
     * `reliefSpec` on the layer overrides the role's, exactly as
     * `elementScale` overrides its counts. A layer that declares none gets
     * the role's, which is every layer that existed before the moon. */
    var relief = (layer && layer.reliefSpec) || CC.Elements.reliefFor(role);
    if (relief) {
      /* Erosion rides atmosphere thickness: a thick-atmosphere world gets
       * rounded terrain, an airless one keeps sharp ridges. Reading it from
       * the built stack rather than from a parameter means it stays true
       * however the atmosphere came to be there.
       *
       * DELIBERATELY GLOBAL, NOT ANGULAR. `erode` is a smoothing pass over
       * the whole stored field, so making it vary by face would mean either
       * building the field twice or smoothing it in place per angle — real
       * machinery for a difference the picture already carries. The zone's
       * `relief` multiplier scales a baked face's amplitude to 0.55 and a
       * frozen one's to 1.25, which is what actually reads as "smoother
       * there, sharper here" at a glance. Revisit only if a body ever needs
       * one face genuinely ROUNDED and the other genuinely JAGGED at the
       * same amplitude, which no archetype asks for yet. */
      var atmos = null;
      for (var a = 0; a < body.layers.length; a++) {
        if (body.layers[a].outward) { atmos = body.layers[a]; break; }
      }
      var erosion = atmos
        ? clamp((atmos.outer - body.surface) / 0.13, 0, 1) * 0.8
        : 0;

      var absorbed = absorbedScale(layer, traits, body);
      var spec = {
        bands: relief.bands,
        /* The AMPLITUDE COMES FROM THE LAYER, not from the recipe.
         *
         * The structure stage reserved room for these peaks when it placed
         * the surface, and then rescaled everything so the surface sits at
         * exactly 1.0 (D3). Re-reading the recipe's raw figure here would
         * use a height the stack was never normalized against, and peaks
         * would drift above or below the sea by whatever the rescale factor
         * happened to be. */
        amplitude: layer.relief || relief.amplitude,
        sharpen: relief.sharpen,
        craters: (relief.craters && absorbed.craters !== 1)
          ? { count: Math.round(relief.craters.count * absorbed.craters),
              size: relief.craters.size, depth: relief.craters.depth }
          : relief.craters,
        erosion: erosion,

        /* THE ZONE HOOK, AND IT IS A GENERAL ONE (PROGRESS.md D22).
         *
         * A per-angle amplitude multiplier. Terrain was already a pure
         * function of angle, which is exactly what D15 predicted would make
         * this a one-line change: a molten dayside gets flatter relief and a
         * frozen nightside sharper, and NOTHING in draw/ changes because
         * draw/layers.js already calls terrain.at().
         *
         * Deliberately not a planet special case — any archetype's zone
         * recipe drives it through the same field. */
        ampAt: zones ? zones.reliefAt : null
      };

      terrain[role] = CC.Terrain.build(spec, seed, role);

      /* THE FLUID'S SURFACE IS NOT FLAT ON A ZONED BODY.
       *
       * gen/zones.js returns a signed offset in units of the terrain's own
       * range; it is converted to body space HERE, where that range is
       * known, so `draw/` receives a plain function of angle and learns
       * nothing about zones (D23).
       *
       * Keyed by the RELIEF-BEARING role rather than by the fluid's, because
       * that is what both the deferred pass and draw/film.js look up — the
       * sea is a property of the surface it sits on. */
      /* THE FLUID THAT ACTUALLY RESTS ON THIS LAYER, if any.
       *
       * Found by the same adjacency test draw/scene-interior.js's deferred pass and
       * draw/film.js both use — the layer immediately outside this one, when
       * it is not an outward falloff. Keeping the three in agreement matters:
       * a sea level clamped against the wrong layer is a clamp that never
       * fires, which is exactly what went wrong before (see below).
       *
       * NO FLUID, NO ANGULAR SEA LEVEL. On a dry world there is no surface
       * to displace, and building one anyway moved the frosting's snowline
       * as though a sea were boiling off a body that has none. The zone's
       * OTHER fields still apply — a waterless locked world still has a
       * scoured face and a frozen one; it simply has no waterline. */
      var fluidAbove = (i > 0 && !body.layers[i - 1].outward)
        ? body.layers[i - 1] : null;

      if (zones && fluidAbove) {
        seaLevel[role] = (function (t, fluid) {
          var r = t.range();
          var span = Math.max(1e-6, r.hi - r.lo);

          /* CAP THE POSITIVE SEA OFFSET, AGAINST THE FLUID'S OWN HEADROOM.
           *
           * The cold face's sea rise can push the ocean past whatever sits
           * outside it, drowning that layer entirely.
           *
           * THE CEILING BELONGS TO THE FLUID, NOT TO THE LAYER UNDER IT.
           * The first version measured `body.surface - crust.outer`, which
           * is the crust's headroom — but the thing being displaced is the
           * SEA, whose top starts at `fluid.outer`. Since an atmosphere's
           * inner edge sits exactly at `fluid.outer`, the sea's true
           * headroom is zero while that formula allowed ~0.12, so the clamp
           * could never fire and the night-side bulge went straight through
           * the atmosphere at every ocean depth. Measuring the gap the fluid
           * actually has is what makes the cap real.
           *
           * NO SLACK IS ADDED ON TOP. An earlier attempt allowed a fraction
           * of the terrain's peak height as extra headroom, on the reasoning
           * that a pooled night sea should stand above the mean surface — but
           * `ceiling` is already the hard limit, so any bonus put the sea
           * straight back through it. The sea's room to bulge comes from the
           * gap that genuinely exists, and where the layer above sits flush
           * there is none: a sea with nowhere to rise stays flat, which is
           * the honest answer.
           *
           * `margin` keeps a hairline so the two boundaries never land on
           * exactly the same radius and z-fight along the limb. */
          var ceiling = ceilingAbove(fluid, body);
          var margin = Math.max(1e-4, (r.hi - r.lo) * 0.02);
          var maxRise = Math.max(0, ceiling - fluid.outer - margin);

          return function (a) {
            var raw = zones.seaAt(a) * span;
            return raw > maxRise ? maxRise : raw;
          };
        })(terrain[role], fluidAbove);
      }

      /* THE SURFACE FILM MASK.
       *
       * A second, independent field on the same layer — the patchiness of
       * whatever covers the ground: vegetation, regolith, mineral staining.
       * Sampled with norm() rather than at(), because this drives COLOUR,
       * not displacement; it never moves a boundary.
       *
       * Its own key, so the film's blotches are unrelated to the landforms
       * beneath them. A film that peaked exactly where the mountains are
       * would read as snow-capping rather than as ground cover, and would
       * make the two fields look like one.
       *
       * Higher frequencies than terrain and no craters or sharpening: cover
       * varies on a smaller scale than topography does, and wants soft
       * edges rather than cliffs. */
      film[role] = CC.Terrain.build({
        bands: [
          { cycles: 5,  amp: 1.00 },
          { cycles: 17, amp: 0.55 },
          { cycles: 41, amp: 0.28 }
        ],
        amplitude: 1,
        erosion: 0.15
      }, seed, role + "/film");
    }
  }

  /* ---- the ground ------------------------------------------------------- */

  /* WHERE THE ROCK ACTUALLY IS, per role and per bearing.
   *
   * A trait anchored to the crust is placed against the crust's NOMINAL
   * band, but terrain displaces the real rock surface either side of that,
   * and wherever it dips below the fluid above it that bearing is seafloor
   * with water over it. Surface traits need to know both facts: craters were
   * being scattered around the whole circumference and a good share of them
   * landed in open ocean, floating in the water.
   *
   * Supplied as plain functions of angle, so gen/traitroll.js learns nothing
   * about terrain fields or fluids — the same arrangement draw/ has (D23). */
  function locateGround(st) {
    var body = st.body, terrain = st.terrain, seaLevel = st.seaLevel;
    var ground = {};
    for (var gi = 0; gi < body.layers.length; gi++) {
      var gLayer = body.layers[gi];
      var gTerrain = terrain[gLayer.role];
      if (!gTerrain) continue;

      var gFluid = (gi > 0 && !body.layers[gi - 1].outward)
        ? body.layers[gi - 1] : null;
      var gSea = seaLevel[gLayer.role] || null;

      ground[gLayer.role] = (function (layer, field, fluid, seaFn) {
        /* The rock's own surface radius at this bearing. */
        function top(a) { return layer.outer + field.at(a); }

        function dry(a) {
          if (!fluid) return true;
          return top(a) > fluid.outer + (seaFn ? seaFn(a) : 0);
        }

        /* EVERY DRY BEARING, SAMPLED ONCE.
         *
         * Rejection sampling finds land easily on a world that has some, and
         * fails badly on one that has almost none: at 1% land, fourteen random
         * tries miss more often than not, and 81% of that world's craters
         * still landed in open water. Walking the circumference once and
         * keeping the dry bearings turns "guess until it works" into a direct
         * draw, which is exact at any land fraction and costs one pass.
         *
         * Empty on a waterworld with no land at all, and callers fall back to
         * their own angle — a body with no shore genuinely has nowhere to put
         * an impact scar, and inventing one would be a lie about the picture.
         */
        var LAND_SAMPLES = 720;
        var landAngles = null;

        return {
          top: top,
          dry: dry,
          /* A dry bearing chosen by `u` (0..1), or null if the body has no
           * land at all.
           *
           * Drawn at RANDOM from the dry bearings rather than snapped to the
           * nearest one. Snapping would pile every displaced crater onto the
           * few bearings closest to water and draw a rash along the
           * coastlines; drawing at random spreads them across the land the
           * way the grammar's own scatter would have, had it been allowed to
           * see where the land was. */
          landAt: function (u) {
            if (!fluid) return null;
            if (!landAngles) {
              landAngles = [];
              for (var k = 0; k < LAND_SAMPLES; k++) {
                var ang = (k / LAND_SAMPLES) * Math.PI * 2;
                if (dry(ang)) landAngles.push(ang);
              }
            }
            if (!landAngles.length) return null;
            var idx = Math.floor(u * landAngles.length);
            if (idx < 0) idx = 0;
            if (idx >= landAngles.length) idx = landAngles.length - 1;
            /* Jittered within its own sample cell so the result is a
             * continuous bearing rather than one of 720 fixed spokes. */
            return landAngles[idx] +
              (u * landAngles.length - idx - 0.5) * (Math.PI * 2 / LAND_SAMPLES);
          }
        };
      })(gLayer, gTerrain, gFluid, gSea);
    }
    st.ground = ground;
  }

  CC.Details.layerTerrain = layerTerrain;
  CC.Details.locateGround = locateGround;
})();
