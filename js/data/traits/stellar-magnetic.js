/* Stars — traits, THE SHARED HEADER.
 *
 * Everything in this family requires the `stellar` tag, which keeps these off
 * every other body without any of them naming an archetype. See
 * js/data/traits/registry.js.
 *
 * WHAT THESE ARE FOR. The family's layer details already carry what every star
 * has — granulation, the two transport vocabularies, the corona, the spicule
 * fringe. A trait is what makes ONE star different from the next, and on a
 * self-luminous body with no surface to scar that means three kinds of thing —
 * which is also how this directory is now split, one file per kind:
 *
 *   stellar-magnetic.js  WHAT THE MAGNETIC FIELD IS DOING — prominences,
 *     starspots, flare storms, coronal holes. All four are the SAME underlying
 *     fact seen four ways, and all four are driven by `starActivity`.
 *   stellar-evolved.js   WHAT STAGE THE STAR IS AT — shed shells, dust
 *     formation, dredge-up, an engulfed planet, pulsation. Things that happen
 *     to a star over time rather than things it does every day.
 *   stellar-built.js     WHAT SOMEBODY BUILT AROUND IT — mirrors and
 *     collectors. These belong here rather than being reserved for machine
 *     worlds for the same reason the gas-miner platforms do: on a star, this is
 *     the whole of what habitation could possibly mean.
 *
 *
 * ---- WHY THIS IS SPLIT BY CONCERN AND NOT BY ARCHETYPE -------------------
 *
 * The rest of the data layer is split one file per FAMILY, and that split ran
 * out here. Four archetypes' worth of traits reached 725 lines against the
 * ≤500-line rule in CLAUDE.md, and the reason is worth recording: a family
 * with two bodies and a family with four are not the same size of thing, so
 * "one file per family" was never going to hold at four.
 *
 * The cut is BY CONCERN rather than by archetype because that is where the
 * real seam is. Every trait below is gated by tag, and several are offered on
 * more than one archetype — `prominences` on all four, `dust-formation` on the
 * evolved ones — so an archetype cut would have duplicated traits across files
 * or forced an arbitrary owner for each. Concern also matches how these change:
 * a rework of the megastructures touches one file and nothing else.
 *
 *
 * ---- STAR ACTIVITY IS ONE CONTROL WITH TWO CONSUMERS ---------------------
 *
 * The four magnetic traits declare `driver: { param: "starActivity", ... }`,
 * which scales their instance count by the SAME 0..1 figure that scours a
 * planet's surface cover and drives its radiation hazard. PARAMETERS.md struck
 * through the old per-star `Stellar activity` row precisely so this could be
 * one axis rather than two, and D27 is the lesson: a second parameter for an
 * existing fact is how a system turns into a menu of special cases.
 *
 * `at0` is what a QUIET star still gets, and they are deliberately different.
 * A quiet star still has a few prominences and a couple of spots, because the
 * Sun at solar minimum has both. A quiet star does NOT have a flare storm — a
 * flare storm is not a faint flare storm, it is an event, and scaling it down
 * to a whisper would be describing something that is not happening.
 *
 *
 * ---- THE PRIMITIVES, AND WHY THEY EXIST ----------------------------------
 *
 * D76 and D80, spent in advance rather than rediscovered. A prominence drawn
 * as a `vein` is the two-hundredth near-radial stroke in a corona that already
 * draws hundreds; a starspot drawn as a dark `cell` is a granule with the
 * wrong colour, in a layer that draws a thousand granules. Both would have
 * rolled correctly, placed correctly, and been invisible — which is exactly
 * what happened to all seven gaseous traits on their first pass.
 *
 * What separates them is SILHOUETTE and STRUCTURE, not contrast: a prominence
 * is the only mark in the generator that leaves the body and returns to it,
 * and a starspot is the only one built from a dark core inside a streaked
 * surround. See js/draw/primitives/stellar.js.
 *
 * Load order in index.html: the registry, then these three in any order.
 *
 * THIS FILE CARRIES THE SHARED HEADER because there is no code-free stellar.js
 * to hold it — a script tag loading a file with no code is a thing a future
 * session has to investigate before it can ignore.
 *
 * AFTER THE SPLIT (Session AL) the coronal holes are in stellar-corona.js, which
 * loads straight after this file: registration order is picker and roll order. */

/* Stars — the MAGNETIC traits AT THE LIMB: what the field throws off the star.
 *
 * `prominences`, `flare-storms` and `coronal-holes`. All three are the same
 * underlying fact — the star's magnetic field — seen three ways, and all three
 * scale off `starActivity` through the `driver` field. The shared header above
 * covers the whole family.
 *
 * THE SPOTS LIVE IN stellar-spots.js, and the cut is by where the mark SITS
 * rather than by what causes it. Everything here is drawn OFF the limb, over
 * black or over a fading halo, in an additive blend; a starspot is drawn ON
 * the photosphere and is the one mark in the family that is DARKER than what
 * it lies on. Those are different drawing problems with different failure
 * modes — exactly the seam draw/primitives/ is split along — and keeping them
 * apart is what got this file back under the 500-line rule after the flare
 * rework. D128 is the standing note on splitting at a real seam.
 *
 * The registry must load before this file. */
var CC = CC || {};

(function () {
  "use strict";

  /* ---- what the magnetic field is doing ------------------------------- */

  /* PROMINENCES — THE DENSITY SHOWCASE, and the phase's named example of the
   * "many cheap elements" thesis. stars.md: "3-30 prominences in 3 size tiers.
   * This is the trait most directly expressing the many-cheap-elements thesis,
   * and v2's handful of flares was the clearest failure of it."
   *
   * THREE TIERS ARE DOING THE REAL WORK. A limb carrying three enormous arcs,
   * eight medium ones and twenty small ones is a completely different picture
   * from one carrying eleven identical ones, and the difference is entirely in
   * the tier split. `named` is deliberately NOT set here — this IS a field,
   * unlike a Great Storm, and the ordinary tier behaviour is what it wants.
   *
   * ANCHORED TO THE CHROMOSPHERE, REACHING OUTWARD. A prominence rises out of
   * the surface into the corona, so its feet belong on the visible limb and
   * its arc belongs above it. `anchor` is a LIST (D77) because a dwarf star's
   * corona is optional and an old giant has no chromosphere at all — the trait
   * means "off the visible limb, whatever this body calls it", and naming one
   * role would have made it silently place nothing on a body missing that
   * layer. That is the worst failure mode: everything except the render says
   * it worked. */
  var PROMINENCES = {
    id: "prominences",
    label: "Prominences",
    anchor: ["chromosphere", "photosphere"],
    /* SPANNING, NOT `outward`, AND THAT IS THE DIFFERENCE BETWEEN A PROMINENCE
     * AND A SMUDGE ON THE LIMB.
     *
     * `reach: "outward"` does not leave the body — it clamps to the top of the
     * anchor layer (D82). So the loops were placed at r 0.976-0.999 and drawn
     * inside the chromosphere's own clip, and every part of every arch that
     * rose above r=1.0 — which is to say the entire arch — was cut away. They
     * generated at the right size, in the right place, pointing the right way,
     * and diffed at 894 pixels: the same "everything except the render says it
     * worked" failure D77 records, found by counting pixels rather than
     * squinting (D88).
     *
     * A prominence is BY DEFINITION a feature that crosses the surface: its
     * feet are on the photosphere and its arch is in the corona. That is
     * precisely what `reach: "spanning"` is for (D91), and the spanning pass
     * clips to the outermost layer — the corona — rather than to a band, so
     * the arch has the room it needs. */
    reach: "spanning",
    /* Feet at the top of the anchor, arch reaching well past it. */
    depth: [0.85, 1.05],
    /* Dissolves the inner extreme so the feet blend into the surface rather
     * than being cut off against it. */
    fadeEnds: 0.10,
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    element: "prominence",
    /* THE THREE SIZE TIERS THE SPEC ASKS FOR BY NAME. */
    tiers: 3,
    /* A fraction of the BODY radius, not of the layer: a prominence's height
     * is a fact about the star rather than about the hairline chromosphere it
     * springs from, and `sizeRel` against a layer 2% thick would have made the
     * largest of them a rounding error. Measured: the top tier reaches roughly
     * a fifth of the radius past the limb, which is about right for a large
     * quiescent prominence and reads clearly at preview size. */
    /* SIZED FOR THE TIER THAT ACTUALLY SURVIVES, not for tier 0.
     *
     * `tierSplit` drops tier 0 FIRST, and the Size-tiers slider defaults to 3
     * — so the largest prominence drawn is 0.52x the authored figure. At
     * 0.10-0.21 the measured sizes came out 0.016-0.072 of the body radius and
     * the limb read as bare. The same trap the convection cells hit an hour
     * earlier, and D76's in a milder form: the authored number is not the
     * drawn number.
     *
     * At 0.20-0.44 the top drawn tier reaches roughly a fifth of the radius
     * past the limb, which is a large quiescent prominence and is legible at
     * preview size. */
    size: [0.20, 0.44],
    /* HOW FAR APART THE FOOTPOINTS ARE, in radians of the body.
     *
     * NARROWED FROM 1.05, which was 60 degrees — a third of the visible limb
     * per loop. Rendered large (test/_tmp/promzoom.mjs) that reads as an arch
     * thrown across the star rather than as a feature standing on it: one foot
     * plants a long way round the curve from the other, so the loop follows
     * the body's own curvature and stops looking like it rises from a place.
     *
     * A real quiescent prominence is tall relative to its base. The figure is
     * now well under the height, which is what makes the loop read as reaching
     * UP rather than as spanning ACROSS — and it is also what lets several sit
     * along the limb without merging into one continuous arcade. */
    span: 0.34,
    lean: 0.55,
    /* THE FLOOR CAME UP, ON "TOO TRANSLUCENT... NEEDS MORE OOMPH".
     *
     * The band was doing two jobs and only one of them was wanted. Varying
     * alpha across instances is what stops a limb of loops reading as one
     * stamped shape repeated — that is worth keeping. But at 0.50 the faintest
     * loops were not "a smaller prominence", they were a prominence you could
     * see the corona through, and `plasmaFill` then multiplies the body pass
     * by a further 0.55: the dimmest arch reached the canvas at 0.28 of the
     * plasma colour. The spread survives, over a shorter and higher range. */
    alpha: [0.78, 1.0],
    /* RAISED WELL PAST THE SPEC'S 3-30, because the user's verdict on the
     * built version was that they "feel kinda lightweight and sparse".
     *
     * Two things make a higher count affordable now and both are new. The
     * loops are NARROWER (see `span`), so several fit along a stretch of limb
     * that one used to occupy without merging into an arcade; and Doc 1 gave
     * the corona a plume field, so a prominence is no longer alone out there —
     * it is among other marks, and a lone arch on a bare limb needs to be
     * bigger and rarer than one in a crowd. Judged against the NEW limb rather
     * than against the one the spec's figure was written for. */
    density: { min: 8, max: 54 },
    /* Rolled per body on top of the slider, and widened with the count so the
     * difference between a quiet limb and a furious one is a fact about the
     * star rather than about the slider (D85's `spread`). */
    spread: [0.45, 1.8],
    /* STAR ACTIVITY DRIVES THE COUNT. A quiet star still shows a few — the Sun
     * at minimum does — so `at0` is well above zero. */
    driver: { param: "starActivity", at0: 0.30, at1: 1.55 },
    /* They must not merge into one smear along the limb (D85's `minGap`). */
    minGap: 7,
    tone: "glow",
    requires: ["stellar"],
    excludes: [],
    tags: ["stellar", "magnetic"]
  };

  /* FLARE STORMS — the violent end of the same axis, and an EVENT rather than
   * a state.
   *
   * `driver.at0: 0` is the important field: a quiet star does not have a
   * faint flare storm, it has no flare storm. Scaling this down to a whisper
   * on a calm body would be drawing something that is not happening, which is
   * a different and worse failure than drawing nothing.
   *
   * A DIFFERENT MARK FROM A PROMINENCE, though both come off the limb. A
   * prominence is a closed loop, slow and structured and anchored at both
   * ends; a flare is an open ejection that does not come back. Same layer,
   * same axis, opposite geometry — which is exactly the "different KIND of
   * mark" test (D76).
   *
   * ---- IT WAS A `vein` AND THAT WAS THE BUG -----------------------------
   *
   * The user could not find these at all: "Flare storms - I don't think they
   * appear, I can't either see them or I don't know what to look out for."
   * They were drawing the whole time, at 1,100-3,700 changed pixels on every
   * archetype, which is the D126 signature — present, moving pixels, not
   * legible.
   *
   * The reason was D76 rather than any number. A `vein` reaching outward is a
   * near-radial stroke, and the corona ALREADY draws a field of near-radial
   * strokes: its streamers, by the hundred. Making the flare longer, brighter
   * or more numerous would only have made it a louder example of what the
   * layer does anyway, and the doc is explicit that two rounds of tuning a
   * mark that is the wrong vocabulary is the most reliably wasted work on this
   * project.
   *
   * So it has its own primitive now (draw/primitives/stellar-limb.js). A flare
   * is an EVENT: a hard bright kernel at the footpoint, a widening spray of
   * fragments, and a bright leading front. It BREAKS UP, and discontinuity is
   * a thing nothing else off this limb does — every other mark out there is
   * smooth and continuous because every other mark is a structure that
   * persists. `lean` is kept: it shears the spray along the field line it
   * broke out of. */
  var FLARE_STORMS = {
    id: "flare-storms",
    label: "Flare Storms",
    anchor: ["corona", "chromosphere", "photosphere"],
    /* SPANNING, FOR EXACTLY THE REASON THE PROMINENCES ARE (D82, D91, D133).
     *
     * `reach: "outward"` does not leave the body — it clamps to the top of the
     * anchor layer — so the flares were placed at r 1.13-1.18 reaching to
     * 1.47, and drawn inside the corona's own clip every part of them past
     * about 1.19 was cut away. Measured, that is most of the mark: the spray
     * and the bright leading front, which are the two things that say this is
     * an eruption. What survived was the kernel and the first fragment or two,
     * sitting inside the brightest part of the halo.
     *
     * That is the SECOND half of why these could not be found, and it is worth
     * separating from the first: the wrong vocabulary made the mark
     * indistinguishable, and the wrong reach then removed the part of it that
     * had the distinguishing shape. Fixing either alone would have left the
     * trait invisible and the fix looking like it had failed.
     *
     * An ejection is by definition a feature that crosses the surface and
     * keeps going, which is what `spanning` is for; the spanning pass clips to
     * the FRAME (D133), so the flare has the room it needs. */
    reach: "spanning",
    /* FOOTPOINTS ON THE VISIBLE LIMB, WHICH IS THE LOW END OF THE ANCHOR AND
     * NOT THE HIGH ONE.
     *
     * `anchor` is a list headed by the corona, so `depth` runs across the
     * CORONA's thickness — and at 0.55-1.15 the feet sat near its outer edge,
     * which put every eruption's origin out in the halo with clear space
     * between it and the star. Rendered, they read as objects floating nearby
     * rather than as material leaving the surface, which is worse than being
     * invisible: it states something false.
     *
     * A flare erupts from the PHOTOSPHERE. The corona's inner edge is the
     * visible limb, so the feet belong at the bottom of the band and the
     * spread above it is only enough that they do not all root on one line. */
    depth: [0.00, 0.14],
    /* Dissolves the far extreme, so a flare that runs out of frame ends by
     * fading rather than by being chopped. */
    fadeEnds: 0.12,
    arc: [0, 360],
    spacing: "clustered",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    element: "flare",
    tiers: 3,
    /* A fraction of the body radius, and reaching FURTHER than a prominence:
     * an ejection leaves, where a loop returns. Raised with the primitive
     * change, because the mark is now a SPRAY rather than a stroke — the
     * fragments are sized as a fraction of the reach, so a short flare has
     * small fragments and stops reading as an eruption at all. Carries the
     * surviving-tier factor (D122) like everything else here. */
    /* THE CEILING WENT UP BY HALF, THE FLOOR STAYED PUT. A storm wants a
     * couple of genuinely enormous eruptions among the ordinary ones, and
     * raising both ends would only have rescaled the whole set — it is the
     * SPREAD that reads as a storm rather than as a decoration. Carries the
     * surviving-tier factor (D122) like everything else here, so the drawn top
     * tier is about half the figure. */
    size: [0.26, 0.93],
    lean: 0.42,
    chaos: 0.6,
    /* THE FLOOR CAME UP HARD. At 0.55 the faintest events were a haze on the
     * corona — and the primitive now fades every ribbon to nothing at its own
     * tip (see `flare` in draw/primitives/stellar-limb.js), so a low trait
     * alpha is a second fade multiplied onto one that is already doing the
     * job. The dissolve belongs in the shape, where it has a direction; the
     * trait alpha only has to say how bright the event is. */
    alpha: [0.82, 1.0],
    /* RAISED AGAIN, after the primitive stopped being a solid wedge.
     *
     * The old note below was written when each flare was an opaque flat-topped
     * fan, and it was correct for that mark: a dozen of those did read as a
     * crowd. Now that every ribbon fades to nothing at its tip, flares OVERLAP
     * instead of occluding — two crossing eruptions make a denser, brighter
     * region rather than one shape hiding another — so the count that used to
     * be a texture is now a storm. Which is the density thesis doing what it
     * usually does here: the fix for "not enough of them" was to make each one
     * cheaper to stack, not to draw them louder.
     *
     * The original reasoning, still true of the top of the band: a spray is
     * several marks in itself, and a flare STORM wants distinguishable events
     * rather than an even wash. */
    density: { min: 6, max: 26 },
    /* And more clusters of them, so the extra events arrive as two or three
     * busy stretches of limb rather than spread evenly around it — which is
     * what `spacing: "clustered"` above is for and what makes a storm look
     * like weather instead of like a ring. */
    repeat: [3, 9],
    spread: [0.5, 1.6],
    /* NOTHING AT ALL on a calm star. See the note above. */
    driver: { param: "starActivity", at0: 0.0, at1: 1.8 },
    tone: "glow",
    /* `screen` so a flare LIGHTENS the corona it crosses rather than painting
     * over it — the same reasoning that makes a diamond read as transparent
     * (D80). Ejected plasma seen against a glowing halo is additive light. */
    blend: "screen",
    requires: ["stellar"],
    excludes: [],
    tags: ["stellar", "magnetic"]
  };

  /* ---- what stage the star is at -------------------------------------- */

  CC.Traits.register([
    PROMINENCES,
    FLARE_STORMS
  ]);
})();
