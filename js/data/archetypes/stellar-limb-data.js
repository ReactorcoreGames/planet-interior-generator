/* Stars — the limb and swell tables, and the binary-companion axis that reads
 * them.
 *
 * Split out of stellar-common.js, which passed the 500-line rule. Attached to
 * CC.StellarCommon, so the four stars still read one namespace.
 * stellar-common.js must load first, and this file before any star. */

var CC = CC || {};

(function () {
  "use strict";

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

  CC.StellarCommon.LIMB = LIMB;
  CC.StellarCommon.SWELL = SWELL;
  CC.StellarCommon.binaryCompanion = binaryCompanion;
})();
