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
 * ---- CONSISTENCY WITH THE STAR TABLE ------------------------------------
 *
 * `js/data/stars.js` already describes stars — from the other side, as the
 * thing a planet orbits. A `main-star` body and the `Star colour` a planet
 * orbits are the same physical object seen from two sides, so the archetypes
 * here take their hue bands from `CC.Stars.STARS` rather than authoring a
 * second opinion about what colour a star is. See `hueFromStars` below: if a
 * blue giant renders one way as a body and tints planets another way, that is
 * a contradiction the tool would eventually be caught in.
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
 * archetypes. */

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

  /* THE HUE BAND, TAKEN FROM THE STAR TABLE RATHER THAN INVENTED.
   *
   * `CC.Stars.STARS` is the existing description of what colour a star is, and
   * it spans 18 deg (red dwarf) through 224 deg (blue giant). Rather than
   * author a second range per archetype, each body names the two table entries
   * that bracket what it can be and the band is read off them at load time.
   *
   * The spec says hue is FREE for every star type and that what distinguishes
   * one from another is saturation and lightness. That is honoured — these
   * bands are wide — but a red giant should not roll blue, and the table
   * already knows where red and blue are. Widening the shared table is what
   * the roadmap asked for in preference to authoring a second one.
   *
   * ---- TWO THINGS THE FIRST VERSION GOT WRONG, both found on a contact sheet
   * rather than on any single render, which is what a contact sheet is for:
   *
   * 1. IT PADDED BELOW ZERO. `pad` was subtracted from the low end, so a band
   *    starting at 18 became -42 — and `wrapHue` maps that to 318, which is
   *    MAGENTA. Half the sheet came out pink and violet: not "hue is free",
   *    but hue wrapping off the bottom of the scale into the one part of the
   *    wheel no star occupies. The low end is clamped at 0 now (pure red),
   *    which is where the stellar sequence genuinely ends.
   *
   * 2. THE PAD WAS FAR TOO GENEROUS. At 60-70 degrees the main star's band
   *    came out 326 degrees wide — very nearly the entire wheel — and a range
   *    that admits every colour is not a range. What made those stars stop
   *    reading as stars was not that green was reachable but that NOTHING was
   *    unreachable, so the family lost the red-through-blue character that is
   *    the one thing a viewer already knows about star colour.
   *
   * The pads below are modest. The spec's freedom is real — a green or violet
   * star is still reachable at the ends of the widest band — it simply is not
   * the default outcome. */
  function hueFromStars(loId, hiId, pad) {
    var T = (CC.Stars && CC.Stars.STARS) || {};
    var lo = T[loId], hi = T[hiId];
    /* If the table ever loses a row this must not silently produce a nonsense
     * band; falling back to the full wheel is the honest failure. */
    if (!lo || !hi) return [0, 360];
    var p = pad === undefined ? 0 : pad;
    /* NEVER BELOW ZERO — see note 1 above. Padding off the bottom wraps into
     * magenta, which is the one region of the wheel no star belongs in. */
    return [Math.max(0, lo.hue - p), Math.min(359, hi.hue + p)];
  }

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

  /* ---- LIMB DARKENING, THE FAMILY'S CHEAPEST GLOW --------------------
   *
   * A star was drawn at a uniform brightness across its whole face, and that
   * is most of why one read as a flat coloured DISC rather than as a glowing
   * sphere. Real emitting surfaces are brightest at the centre of the disc
   * and fall away toward the edge, because near the limb your line of sight
   * only grazes the cooler upper material.
   *
   * `limbDarkening` is a general layer property (gen/structure.js,
   * draw/scene.js `paintLimbDarkening`) rather than anything a photosphere
   * owns — an incandescent shell on a machine world would want the same.
   *
   * TWO FIGURES, NOT ONE, and the second one matters more than it looks. The
   * photosphere is a skin a few percent thick, so darkening it alone puts the
   * entire falloff into a hairline ring at the very edge, which reads as a
   * drawn OUTLINE — precisely the flat-disc-with-a-border look this exists to
   * remove. Giving the deep layer beneath it a share of the same curve makes
   * the falloff span most of the visible face, so the body reads as round
   * rather than as circled.
   *
   * The numbers are per archetype below, because the four bodies are meant to
   * differ: a tired old giant's envelope is genuinely more limb-darkened than
   * a taut main-sequence surface. */
  var LIMB = {
    /* The visible surface takes the strong figure. */
    surface: 0.42,
    /* Whatever lies immediately under it takes a gentler share, so the two
     * read as one continuous curve across the exposed face. */
    interior: 0.20
  };

  /* ---- THE BINARY COMPANION, AS AN AXIS ------------------------------
   *
   * stars.md describes `binary-companion` as a trait that ZONES THE PRIMARY —
   * a tidal bulge, a brighter and more agitated facing hemisphere,
   * prominences biased toward the companion. TRAIT-SYSTEM.md's third test
   * ("does the layer stack differ, or only the values in it?") makes that an
   * AXIS rather than a trait, exactly as tidal locking turned out to be
   * (D27), so it is declared here beside the four stacks it applies to.
   *
   * ---- THE USER REJECTED DRAWING A SECOND STAR ------------------------
   *
   * In as many words: *"I do not want to draw another sun."* This is a
   * DISTORTION AXIS, not a companion object. Three shapes were weighed:
   *
   *   NOT squashing the whole body into an oval. That means touching
   *     `view.at()` and every `arc()` clip in draw/scene.js — shared geometry
   *     all four families sit on — and a mildly elliptical disc reads as "the
   *     render is slightly off" long before it reads as "something is pulling
   *     on this star".
   *
   *   YES the OUTWARD LAYERS bulge toward the pull. A tidal bulge on a star
   *     genuinely is a bulge in the tenuous outer envelope rather than a
   *     deformation of the fusing interior, so THE BODY STAYS ROUND AND THE
   *     CUTAWAY STAYS READABLE — which is the point, since the layer stack is
   *     the part that was signed off.
   *
   *   YES, riding on the same field: the FACING HEMISPHERE IS MORE VIOLENT.
   *     Brighter, hotter, more agitated on the side facing the companion.
   *
   * ---- IT IS ALMOST FREE, WHICH IS WHY IT WON -------------------------
   *
   * `gen/zones.js` already publishes `airAt` — "how tall is the outward layer
   * at this bearing" — and draw/scene.js already composes it into the same
   * `thicknessAt` the coronal wobble multiplies into. So a star declaring a
   * zone recipe that drives `air` gets a drawn-out corona with NO NEW DRAWING
   * CODE, and the same field carries the colour shift for the hot face.
   *
   * ---- WHICH PARAMETER DRIVES IT --------------------------------------
   *
   * `param` and `facing` are data, so this is a naming decision rather than
   * work — and the two halves resolve differently.
   *
   * The FACING half is reused wholesale: `tidalFacing` already exists, already
   * round-trips through the settings string, and "which way is the interesting
   * side pointing" means exactly the same thing on a star as on a planet. The
   * user asked for that control by name.
   *
   * The INTENSITY half also reuses `tidalLock`'s slider, because a second
   * slider for the same idea is D27's mistake — but it renames the DIAL, so
   * the GUI does not read "Tidal locking" on a body with nothing to be locked
   * to. `dial` was declared on the planet's axis from the start and had never
   * been consumed; js/ui/controls.js reads it now.
   *
   * THIS MAKES A DEAD CONTROL LIVE. `tidalLock` currently does nothing
   * whatsoever on a star.
   *
   * ---- THE PARTIAL-AXIS QUESTION, CHECKED -----------------------------
   *
   * This recipe declares only `air`, `temp` and `colorShift` — no `sea`, no
   * `snow`, no `relief`, no `cover`, because a star has no sea level and no
   * snowline. gen/zones.js reads every field through `fieldAt(angle, key,
   * default)`, so an omitted key simply takes its neutral value. Clean by
   * construction; no code change was needed. */
  /* ---- HOW HARD EACH BODY'S SKIN IS PULLED ---------------------------
   *
   * `swell` is the FOURTH consumer of `tidalLock` and the one that finally
   * makes the axis reach the part of the picture the eye is actually on.
   * Bulging only the corona was where a real tidal bulge lives and it was the
   * right first move — but the corona is the faintest thing in the frame, so
   * the one layer that moved was the one least able to show it.
   *
   * STATED AS A FRACTION OF THE LAYER'S OWN THICKNESS (D131). A chromosphere
   * is ~0.05 of the radius and a photosphere ~0.062, so 0.40 here is roughly
   * 0.02 of the body — small in absolute terms and large where it counts. A
   * body-radius figure could not serve both a skin and a mantle; this one
   * means the same thing on every layer it touches.
   *
   * PER ARCHETYPE, because a young star and a patient dwarf must not deform
   * identically — the same argument as every other figure in this family. The
   * dwarf is the awkward one and D138 named the reason: its envelope is feeble
   * while its surface is furious, so the two halves pull opposite ways and one
   * multiplier cannot say it. Its corona bulge stays modest (that is `air`,
   * unchanged) while its skin takes the family's strongest swell.
   *
   * KEPT WELL UNDER 1. At 1.0 a layer's boundary would meet the one beneath it
   * on the far side, and the band would close to nothing — the v2 warning
   * arriving in a new place. */
  var SWELL = {
    /* Steady, and the reference the other three are read against. */
    main: 1.05,
    /* Violent and young: the loudest skin in the family. */
    young: 1.40,
    /* A furious surface on a feeble envelope — see above. */
    dwarf: 1.25,
    /* Tenuous and already shedding: it deforms easily, but its photosphere is
     * enormous in absolute terms, so a large proportion is a very large
     * displacement. Damped for that reason rather than because the physics is
     * gentler. */
    giant: 0.80
  };

  function binaryCompanion(swell) {
    var sw = swell === undefined ? SWELL.main : swell;
    return {
      tidalLock: {
        /* One axis, renamed rather than duplicated — see above. */
        param: "tidalLock",
        facing: "tidalFacing",
        dial: "Binary companion",
        dialTitle: "How hard a close companion star is pulling on this one. " +
                   "The outer envelope bulges toward it and the facing " +
                   "hemisphere runs hotter and more agitated. The body itself " +
                   "stays round: a tidal bulge on a star is a bulge in the " +
                   "thin outer layers, not a deformation of the interior.",
        facingDial: "Companion bearing",

        field: {
          id: "binary-companion",
          axis: "equatorial",
          /* ANCHORED ON THE OUTWARD LAYERS AND NOTHING ELSE. `anchor` is a
           * list (D77) because the four bodies name their outermost layer
           * differently — three have a `corona`, the old giant has a
           * `shed-envelope` — and naming one would have placed nothing at all
           * on the body that lacks it. */
          anchor: ["corona", "shed-envelope", "chromosphere"],

          /* THE SWELL REACHES ONE LAYER FURTHER DOWN, ON ITS OWN LIST.
           *
           * The obvious move is to add `photosphere` to `anchor` above and be
           * done. Measured, that is wrong: `anchor` is shared by `air`,
           * `temp` and `colorShift`, so extending it deepens all three. On a
           * main star the convective zone's factor goes 0.209 -> 0.380, and
           * the interior starts carrying the terminator — the one outcome the
           * whole axis exists to avoid (D84), arriving as a side effect of a
           * change that was only ever about geometry.
           *
           * The two lists are answering different questions and there is no
           * reason they should agree: how far down a hot face TINTS is about
           * light, and how far down a bulge DEFORMS is about matter.
           *
           * `chromosphere` AND `photosphere` are both named because the four
           * stacks name their outer layers differently and the old giant has
           * no chromosphere at all (D77). Naming one role would place nothing
           * on the body that lacks it — the failure mode where everything
           * except the render says it worked, which is exactly how the plume
           * field missed the old giant in Session O (D138).
           *
           * `corona` and `shed-envelope` stay on the list so the OUTWARD layer
           * has a depth factor of 1 — it does not consume `swell` itself (it
           * takes the same pull through `air`), but keeping it deepest-first
           * is what makes the falloff read from the outside in. */
          swellAnchor: ["corona", "shed-envelope", "chromosphere", "photosphere"],
          /* ZERO RESIDUE, WHICH `residue` ITSELF IS NOT ALLOWED TO BE.
           *
           * A faint interior asymmetry in COLOUR is a feature — it is what
           * makes a zoned world more interesting than one where the effect
           * stops dead at the crust, which is why `residue: 0.03` exists
           * above. A faint interior asymmetry in GEOMETRY is not the same
           * thing: a fusing core does not know which way its companion is, and
           * the cutaway is the part the user signed off. The deep stack stays
           * exactly round. */
          swellResidue: 0,
          /* A WIDER CROSS-FADE THAN THE COLOUR GETS — see `swellBlend` in
           * gen/zones.js. The shared 0.30 is right for a terminator in tint
           * and draws as a faceted kink in an outline. */
          swellBlend: 0.60,
          /* VERY LOW RESIDUE. The interior must not carry the terminator: the
           * cutaway is the part that was signed off, and a fusing core does
           * not know which way its companion is. Lower even than the planet's
           * 0.06, because a star's interior has an even better claim to being
           * unaffected. */
          residue: 0.03,
          blend: 0.30,

          /* FOUR ZONES, and the two twilight bands are there for the reason
           * the planet's are: without a second one the near and far faces abut
           * directly on one side and the envelope comes out lopsided in a way
           * that reads as a bug rather than as a bulge. */
          zones: [
            /* `air` IS THE BULGE, and it is the whole geometric statement.
             * 1.55 on the facing side against 0.80 on the far side gives an
             * envelope that visibly reaches toward the companion while the
             * photosphere beneath it stays a circle.
             *
             * Kept well under 2: the user's warning about v2 applies to this
             * as much as to the wobble — if the silhouette stops reading as a
             * star, it has gone too far. */
            /* `swell` IS THE SAME STATEMENT ON THE BANDED LAYERS. Signed and
             * in units of each layer's own thickness, so the facing side's
             * skin rises and the trailing side's is drawn thin — which is
             * what a tidal bulge does and is more legible than a bulge alone,
             * because the eye reads the DIFFERENCE round the limb.
             *
             * THE TWILIGHT BANDS DO NOT SIT AT ZERO, and that is specific to
             * geometry. Zero is right for `temp` and `colorShift` — the limb
             * genuinely is the unperturbed state between the two faces. It is
             * wrong here, because a zone's figure is held FLAT across its
             * whole arc and blended only at its edges: declaring 0 over a
             * 50-170 degree band pinned the boundary back to its unswollen
             * radius across that entire arc, so it had to climb to the full
             * swell inside the narrow blend region. Measured at 0.033 of the
             * layer per degree, which draws as a hard faceted KINK in the
             * silhouette — a crease produced by the very field the cross-fade
             * is meant to smooth, which is the same shape of error `shiftAt`
             * documents above for the value delta.
             *
             * A midpoint turns the profile into a staircase the blend can
             * round off, and the transition then spans the whole arc. */
            { id: "near", label: "Facing the companion",
              arc: 130, air: 1.55, temp: +0.16, swell: +sw,
              colorShift: { hue: -6, sat: +0.06, val: +0.12 } },

            { id: "twilight", label: "Limb", flex: true, arc: 50, arcOpen: 170,
              air: 1.05, temp: 0.00, swell: +sw * 0.28,
              colorShift: { hue: 0, sat: 0, val: 0 } },

            /* The far side thins rather than matching the near side's rise.
             * A tidal bulge is genuinely two-lobed, but drawing both lobes on
             * a cutaway reads as an off-centre body rather than as something
             * pulling on it — and the user asked for a pull toward a
             * direction, which wants one lobe. */
            { id: "far", label: "Trailing side",
              arc: 130, air: 0.80, temp: -0.10, swell: -sw * 0.45,
              colorShift: { hue: +5, sat: -0.04, val: -0.07 } },

            { id: "twilight", label: "Limb", flex: true, arc: 50, arcOpen: 170,
              air: 1.05, temp: 0.00, swell: +sw * 0.28,
              colorShift: { hue: 0, sat: 0, val: 0 } }
          ]
        }
      }
    };
  }

  /* Published for the four archetype files, which are the only consumers.
   * A namespace rather than four copies, so a change to what "a corona" means
   * lands once. */
  CC.StellarCommon = {
    climate: stellarClimate,
    hueFromStars: hueFromStars,
    corona: corona,
    chromosphere: chromosphere,
    lit: lit,
    LIMB: LIMB,
    SWELL: SWELL,
    binaryCompanion: binaryCompanion
  };
})();
