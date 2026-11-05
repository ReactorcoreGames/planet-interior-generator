/* Stars — `young-star`, `main-star`, `old-giant-star` and `dwarf-star`.
 *
 * See docs/celestials/stars.md for the spec and
 * js/data/archetypes/registry.js for what every field means.
 *
 * THE STORY IS ENERGY TRANSPORT. Every other family's cutaway answers "what is
 * this made of"; a star's answers "how does the heat get out", and the whole
 * family exists to make one contrast instantly readable:
 *
 *   RADIATIVE — photons crawl outward through a dense, still medium. Drawn as
 *     fine radial streaks. Nothing moves in bulk.
 *   CONVECTIVE — plasma physically circulates. Drawn as visible cells with
 *     curved flow arrows looping through them.
 *
 * Those are two different mark vocabularies in js/data/elements/stellar.js,
 * which is the D76 lesson applied BEFORE the fact rather than after: a
 * radiative zone drawn with slightly-different cells would be invisible next
 * to a convective one. The distinction has to be a different KIND of mark.
 *
 * The ordering of the two inverts with mass, which is real and is the most
 * interesting thing the family encodes:
 *
 *   dwarf-star       convective all the way through — no radiative zone at all
 *   main-star        radiative core, convective envelope
 *   young-star       CONVECTIVE core, radiative envelope — the inversion
 *   old-giant-star   a degenerate speck under an enormous convective envelope
 *
 *
 * ---- THE CLIMATE DECLARATION -------------------------------------------
 *
 * Every star declares `climate: { latitude: 0, starlit: false }`, and both
 * halves are load-bearing. See docs/roadmap/climate-foundation.md, which asked
 * this phase to inherit the climate system mostly by DECLINING it.
 *
 *   latitude: 0    a flat field. The body still HAS a temperature everywhere —
 *                  the stat template reads `tempAt` rather than rolling a
 *                  second one — it simply has no latitude to it, so there is
 *                  no polar term and therefore no possibility of a polar cap
 *                  on a star. That is the risk D40 declared the spec against.
 *   starlit: false a star is not warmed by some OTHER star. For a star the
 *                  incident term is not merely small, it is the wrong idea,
 *                  and it also removes the Star colour tint so a star cannot
 *                  be coloured by a dropdown describing a different object.
 *
 * BOTH ESCAPE HATCHES WERE ALREADY BUILT AND ASSERTED (D50), on a synthetic
 * archetype precisely so this phase would not have to discover them. There is
 * no role-name branch in gen/climate.js and there must never be one.
 *
 * NO FROSTING ANYWHERE IN THIS FILE (D22). Deposition is gravity pulling
 * material into hollows; a photosphere has no hollows and nothing settles on
 * it. Granulation is convective churn and is a layer detail, not a film.
 *
 *
 * ---- STAR ACTIVITY IS ONE CONTROL WITH TWO CONSUMERS ---------------------
 *
 * PARAMETERS.md struck through the old per-star `Stellar activity` row for
 * this reason and D27 is the lesson behind it: a second parameter for an
 * existing fact is how a system turns into a menu of special cases. On a
 * planet `starActivity` scours cover and drives the radiation hazard; here it
 * drives starspots, prominences, flare storms and chromospheric agitation. One
 * quantity, two sides of the same object.
 *
 * It reaches the stack through `modulate` on the active layers and through the
 * trait density in js/data/traits/stellar-magnetic.js. It is NOT a heat term
 * on either side — an active star is not necessarily a hot one.
 *

 * ---- WHY THIS DIRECTORY IS SPLIT PER ARCHETYPE --------------------------
 *
 * The rest of the data layer is split one file per FAMILY. That ran out here:
 * four archetypes reached 769 lines against the 500-line rule in CLAUDE.md,
 * and a family with two bodies and a family with four were never the same size
 * of thing.
 *
 * So the STELLAR family is split one file per archetype, with this file
 * holding what they share. That is the right cut for this family in
 * particular, because per-archetype character is the whole design — the four
 * bodies differ in STRUCTURE (which zone convects, which radiates, whether
 * there is a radiative zone at all) where the solid and gaseous families
 * differ mostly in material. An edit to how violent a young star's limb is
 * touches one file.
 *
 * WHAT LIVES HERE: the climate declaration, the hue band derivation, the two
 * shared layer builders, and the `lit` helper that makes every stellar layer
 * self-luminous. What lives in the archetype files: stacks, colours, and the
 * numbers that make one body different from another.
 *
 * Load order in index.html: the registry, this file, then the four
 * archetypes.
 *
 * AFTER THE SPLIT (Session AL) LIMB, SWELL and the binary-companion axis are in
 * stellar-limb-data.js, which attaches here and loads straight after this file. */

var CC = CC || {};

(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * Shared stellar vocabulary
   * ------------------------------------------------------------------ */

  /* THE FAMILY'S CLIMATE DECLARATION, written once. See the header for why
   * `latitude: 0` and `starlit: false`; the reasoning is identical for all
   * four bodies and duplicating it would invite one of them drifting.
   *
   * `selfHeated` is the third field, and the one this phase added.
   *
   * `starlit: false` alone removes the star and leaves the body scored on
   * `interiorHeat` from the same floor a rogue planet uses — measured, that
   * put an ordinary star at a normalized 0.21 and had the climate summary
   * calling 83% of them frozen. A star is its own furnace, so it declares a
   * floor and Interior heat moves it from there.
   *
   * PER ARCHETYPE, NOT PER FAMILY, because the four bodies genuinely differ:
   * the spec's surface temperatures run 3,000-12,000 C for a young star and
   * 2,000-4,000 C for an old giant, and one shared number would have thrown
   * that away. This is also D75 respected rather than rediscovered — the
   * figure a formula is handed IS the calibration.
   *
   * The floors leave real headroom above them so Interior heat still moves the
   * card and the palette; a control that changes nothing is worse than one
   * that is slightly wrong.
   *
   * THESE FOUR NUMBERS AND `surfaceC` IN js/gen/stats/stellar.js ARE ONE
   * CALIBRATION. The floor decides where an archetype sits in the normalized
   * band and `surfaceC` decides what that band means in degrees, so moving
   * either alone breaks the other — the first version of both put a main
   * star at 9,900-14,100 C against a spec of 3,500-8,000. Re-run
   * `node test/_tmp/starsweep.mjs <id> 30` after touching either (D75). */
  function stellarClimate(selfHeated) {
    return { latitude: 0, starlit: false, selfHeated: selfHeated };
  }

  /* ---- THIN LAYERS NEED CAPS (D90) -----------------------------------
   *
   * `frac` bounds where a layer's OUTER edge sits. Its thickness is whatever
   * is left between it and the next layer down — which no range can control,
   * and which is usually right, since a layer should absorb the slack.
   *
   * IT IS EXACTLY WRONG FOR A SKIN. Every stack in this family has one or two
   * layers that are thin BY DEFINITION — a photosphere is a surface, a
   * chromosphere is a fringe, a tachocline is a shear line — and each sits
   * above a deep interior layer whose own ceiling is well below it. Measured
   * before the caps below existed, all four stacks were broken and three of
   * them fatally:
   *
   *   old giant   photosphere 0.468 thick — 47% of the radius, swallowing the
   *               enormous convective envelope that IS the archetype
   *   dwarf       photosphere 0.555 — more than half the body, burying the
   *               fully-convective interior that is its entire signature
   *   young       photosphere 0.354, squeezing the radiative envelope
   *   main        TACHOCLINE 0.348 — a hairline shear layer came out as the
   *               largest layer in the body
   *
   * Every one of them generated correctly, coloured correctly and drew
   * correctly. The stack was simply not the stack that was authored, and only
   * printing the thicknesses showed it — which is D88's lesson applied to
   * geometry rather than to pixels: when the question is "is it the right
   * size", MEASURE, do not squint.
   *
   * `maxThickness` raises the layer's floor rather than lowering its ceiling,
   * so the layer keeps its position and the space goes inward to the interior
   * layer that should have had it. */

  /* A CORONA, WHICH THREE OF THE FOUR BODIES HAVE.
   *
   * `outward: true` hands it to the same radial-falloff path the planet's
   * atmosphere and the gas giant's cirrus deck already use (draw/layers.js
   * `falloffAlpha`) — the hot diffuse halo the spec asks for, with no new
   * drawing code. A corona is the most extreme user of that machinery in the
   * generator: it reaches well past the body and is nearly transparent for
   * most of its depth, so `fadeHold` runs LOW here where the gas giant's dense
   * cirrus deck runs high. It is a glow, not a skin.
   *
   * `over: "surface"` measures it from whatever the outermost real layer
   * turned out to be, so it rides with the chromosphere however that rolled. */
  function corona(depth, hold, wobble, plumes, presence) {
    var l = {
      role: "corona",
      frac: { over: "surface", depth: depth },
      boundary: "soft-gradient",
      outward: true,
      fadeHold: hold,
      /* THE CORONA HEAVES. See `wobbleRel` in gen/structure.js — a proportion
       * of the layer's OWN thickness, so the corona's absolute wobble comes
       * out far larger than the chromosphere's from the same figure simply
       * because a corona is far wider. That is wanted, and is the reason the
       * user's calibration is a proportion rather than a distance.
       *
       * Driven by `starActivity`, which is the family's one violence axis
       * (D27) — a young star's envelope should not share a limb with a
       * patient dwarf's, and this is most of what separates them. */
      wobbleRel: wobble,
      /* HOW VIOLENT THIS PARTICULAR STAR'S LIMB IS.
       *
       * The plume field is one recipe in js/data/elements/stellar-envelope.js
       * shared by all four bodies, because element tables are keyed by ROLE —
       * which is what makes a corona mean the same thing everywhere and is
       * worth keeping. `elementScale` (gen/details.js) is how one archetype
       * says its version is louder: `{ plume: { count, size } }`, per body,
       * without four copies of the recipe or a role check in the generator.
       *
       * SEPARATE FROM THE WOBBLE ON PURPOSE. The user asked for this in as
       * many words — a two- or three-layer thing, so that each star type gets
       * levers that move independently. Fold "how wavy is the edge" and "how
       * much fire stands off it" into one number and neither is tunable. */
      elementScale: plumes
    };
    if (presence !== undefined) l.presence = presence;
    return l;
  }

  /* THE CHROMOSPHERE — a thin, agitated shell just above the photosphere.
   *
   * Thin on purpose: the spec's 0.98-1.01 is a hairline, and a hairline is
   * what it should be. Its interest is entirely in the spicule fringe the
   * element table gives it, not in its area.
   *
   * `modulate` on `starActivity` is the axis reaching the STACK rather than
   * only the traits: a violent star's chromosphere is genuinely puffier. Small,
   * because this is a thin layer and a large modulation would swallow the
   * photosphere beneath it. */
  function chromosphere(frac, wobble) {
    return {
      role: "chromosphere",
      frac: frac,
      boundary: "slight",
      /* THE ENTIRE JOB HERE IS AMPLITUDE, NOT MACHINERY.
       *
       * A chromosphere already wobbled — it is an ordinary banded layer
       * declaring `boundary: "slight"`, so `layers.js` `boundaryFn` has been
       * shaping it all along. What it lacked was any relation between the
       * amplitude and the layer's own size: `slight` is 0.010 of the BODY
       * radius, against a fringe roughly 0.04 thick, so the ripple was a
       * quarter of the layer and fixed regardless of how violent the star
       * was.
       *
       * `wobbleRel` replaces that with a proportion of the layer's thickness
       * on the same 10%..50% calibration the corona uses, so the two edges
       * are stated in the same units and can be read against each other. */
      wobbleRel: wobble,
      /* A HAIRLINE, AND IT HAS TO BE MADE TO STAY ONE. See THIN LAYERS NEED
       * CAPS below — `frac` cannot express a thickness, only a position. */
      maxThickness: 0.055,
      modulate: [
        { param: "starActivity", amount: 0.012 }
      ]
    };
  }

  /* THE COLOUR RULE FOR THE WHOLE FAMILY, from docs/celestials/stars.md:
   *
   *   "All star layers are LUMINOUS — they ignore any global shading pass.
   *    Nothing in a star should look like it's lit from outside."
   *
   * `incandescent: true` is the existing property that says exactly that; the
   * planet's molten core and the gas giant's dynamo already use it. Every
   * layer in every stack below carries it, which is the one genuinely
   * family-wide colour statement here. Written as a helper so no layer can be
   * added later that quietly forgets. */
  function lit(spec) {
    spec.incandescent = true;
    return spec;
  }

  /* Published for the four archetype files, which are the only consumers.
   * A namespace rather than four copies, so a change to what "a corona" means
   * lands once. */
  CC.StellarCommon = {
    climate: stellarClimate,
    corona: corona,
    chromosphere: chromosphere,
    lit: lit
  };
})();
