/* Orbital traits — things that happen BEYOND the body.
 *
 * They live in their own file rather than in any family's because they belong
 * to none of them: a ring around a gas giant and a ring around a rocky world
 * are the same feature, drawn by the same primitive at the same radii.
 *
 * ---- `orbit-safe`, AND WHY `requires: []` WAS NOT GOOD ENOUGH ------------
 *
 * These used to declare `requires: []`, on the reasoning that anything beyond
 * the body is available to every body. That was correct while every body was
 * a planet or a giant, and it silently stopped being correct when the stellar
 * family landed — it had become an unexamined default rather than a rule.
 *
 * A debris belt at 1.28-1.95 body radii around a STAR is a claim that rock
 * and ice are sitting just above the photosphere. They would sublimate. Real
 * debris around a star lives at hundreds of stellar radii, which is off this
 * canvas by two orders of magnitude, so drawing it at ring distance does not
 * simplify a true thing — it states a false one, and the generator's standing
 * rule is that the numbers may be stylized but must never contradict the
 * picture.
 *
 * SO THEY ARE GATED, AND THE GATE IS A TAG. Note the polarity: eligibility is
 * a POSITIVE test for a tag the body carries (registry.js), so a tag has to
 * name the bodies that MAY have rings rather than the ones that may not — and
 * it is named for the physical fact, not for the families that happen to hold
 * it today, so a future cold body gets rings by declaring one tag and a future
 * hot one is excluded for free.
 *
 * ---- THE GATE SPLIT IN THREE, AND WHY -----------------------------------
 *
 * `orbit-safe` was one tag answering one question: may this body have
 * anything in orbit? Two later findings each split it.
 *
 *   `dusty-rings`       a rocky world's sparse debris ring
 *   `structured-rings`  a giant's dense, ringlet-resolved sheet
 *   `orbit-debris`      a scattered belt, which BOTH kinds of body get
 *
 * WHY RINGS SPLIT FROM DEBRIS: they were the same object drawn on a planet, a
 * giant and a moon, so all three read as one body type with different fills.
 * D76/D160's vocabulary problem arriving from the direction of sameness — a
 * mark that means the same thing everywhere stops distinguishing anything.
 * The two ring traits are mutually exclusive BY TAG rather than by an
 * `excludes`, for the same reason given below: `excludes` is a trait-to-trait
 * relation and this is a fact about the body.
 *
 * WHY THE MOON CARRIES NONE OF THEM: no moon in the solar system has a
 * confirmed ring, because the stable band between a moon's Roche limit and the
 * distance where its PARENT planet takes over is very narrow — the parent
 * strips it. The first version of the moon archetype carried `orbit-safe` on
 * the unexamined justification that "a moon may have its own ring", which is
 * this file's own D146 failure repeated one family later. See
 * js/data/archetypes/solid-moon.js.
 *
 * `excludes` would have been the wrong instrument twice over: it is a
 * trait-to-trait relation, and the alternative of testing a role name is the
 * one thing eligibility must never do.
 *
 * The stellar replacement is `accretion-disc` in data/traits/stellar-evolved.js
 * — a young star genuinely IS surrounded by the material it is still forming
 * planets out of, so the same primitive at the same radii becomes true again.
 *
 * `anchor: "orbit"` is the reserved token that places a trait outside the body
 * entirely, where `depth` is read as a multiple of the body radius rather than
 * as a fraction of a layer's thickness. The view leaves room for them via
 * `body.extent`.
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  /* Ring system — the `reach: "outward"` case. Radii are multiples of the body
   * radius rather than positions in a layer, and the view leaves room for them
   * via `body.extent`. */
  var RING_SYSTEM = {
    id: "ring-system",
    label: "Ring System",
    anchor: "orbit",
    reach: "outward",
    depth: [1.35, 2.15],
    arc: [0, 360],
    repeat: [3, 8],
    spacing: "even",
    jitter: 0.15,
    mirror: false,
    offset: [0, 360],
    element: "ring-band",
    tiers: 2,
    /* DARKER AND DENSER THAN A GIANT'S, WHICH IS A MATERIAL FACT.
     *
     * The two ring families are separated by what they are MADE OF rather
     * than by how they are lit — there is no light source in a cross-section,
     * which is why the shadow that used to do this job was removed (see
     * draw/primitives/orbital.js).
     *
     * A rocky world's ring is pulverised rock and dust: dark, and warm-toned
     * the way regolith is. `darker` is the tone that says that — it steps
     * value DOWN and saturation slightly up, which is the difference between
     * rubble and ice. Alpha runs lower to match, because sparse debris
     * scatters little of what falls on it.
     *
     * The saturation step is deliberately SMALL. Rock and dust are greys and
     * browns, and pushing chroma to separate the families would make debris
     * read as coloured glass rather than as stone — the material has to stay
     * believable while the contrast does the work. */
    alpha: [0.14, 0.42],
    density: { min: 3, max: 14 },
    tone: "darker",
    /* Cold enough for solid material to survive in orbit — see the header.
     *
     * `dusty-rings` rather than `orbit-safe`, because the tag now has to say
     * WHICH KIND of ring a body gets rather than merely that it may have one.
     * See RINGLET_SYSTEM below. A rocky world carries this one; a giant
     * carries `structured-rings` and gets the other. */
    requires: ["dusty-rings"],
    excludes: ["shattered"],
    tags: ["orbital"]
  };

  /* ---- a giant's rings are a DIFFERENT OBJECT ---------------------------
   *
   * Same region, same orbital plane, same trait grammar — and a different
   * mark, because the two things are not the same and were reading as though
   * they were. Rings on a planet, a giant and (until it was gated) a moon
   * were one flat ellipse at one alpha, so all three bodies read as one body
   * type with different fills. That is D76/D160's vocabulary problem arriving
   * from the direction of SAMENESS: a mark that means the same thing on every
   * body stops distinguishing anything.
   *
   * The physical difference is real. A rocky world's ring is sparse debris —
   * a few diffuse bands, which is what `ring-system` already says well. A
   * giant's is the Saturn case: a dense sheet resolved into hundreds of
   * ringlets with knife-edge divisions, and bright enough that the planet
   * casts a visible shadow across it. `ringlet-band` draws all three of
   * those; see the primitive for why each one is there.
   *
   * MORE BANDS, TIGHTER, AND CLOSER IN. A giant's ring system is broad and
   * begins nearer the body than a debris ring does, so `repeat` is higher and
   * `depth` starts lower — which also keeps the two silhouettes apart at a
   * glance rather than only on inspection.
   *
   * GATED THE SAME WAY, and the polarity is the header's: eligibility is a
   * POSITIVE test, so each kind of ring names the tag its bodies carry. The
   * two are mutually exclusive by tag rather than by an `excludes`, which
   * would have been the wrong instrument for the same reason the header gives
   * — it is a trait-to-trait relation, and this is a fact about the body. */
  var RINGLET_SYSTEM = {
    id: "ringlet-system",
    label: "Ring System",
    anchor: "orbit",
    reach: "outward",
    /* Starts closer in and reaches further out than the debris version. */
    depth: [1.22, 2.35],
    arc: [0, 360],
    /* Many more bands, because the structure is the object. */
    repeat: [7, 16],
    spacing: "even",
    /* Low, so the bands stay a system: a giant's rings are concentric to a
     * fault, and the ringlets inside each band carry the irregularity. */
    jitter: 0.07,
    mirror: false,
    offset: [0, 360],
    element: "ringlet-band",
    tiers: 2,
    /* BRIGHT AND TINTED, BECAUSE IT IS ICE — BUT NOT BLEACHED.
     *
     * A dense ice sheet is highly reflective, so it reads much brighter than
     * a rocky world's debris; that much `lighter` had right, and the higher
     * alpha here says the same thing (a dense sheet returns far more light
     * than scattered rubble).
     *
     * What `lighter` got WRONG is saturation. It multiplies chroma by 0.72,
     * so every giant's rings converged on the same pale near-white whatever
     * colour the body was — the mark stopped saying anything about the world
     * it belonged to, which is the sameness problem this trait pair exists to
     * solve, arriving one level down. Saturn's rings are not white; they are
     * warm buff and ochre, and the tint varies with composition.
     *
     * `bright` is the tone that says bright-and-still-coloured — see
     * draw/details.js for why it had to be a new one rather than a tweak to
     * an existing one. This is the other half of the pair; see RING_SYSTEM
     * above for why the families separate on material rather than lighting. */
    alpha: [0.24, 0.66],
    density: { min: 7, max: 22 },
    tone: "bright",
    requires: ["structured-rings"],
    excludes: ["shattered"],
    tags: ["orbital"]
  };

  /* Debris belt — the scattered sibling of the ring system. Same region, but
   * `spacing: "random"` with high jitter, which is what TRAIT-SYSTEM.md means
   * by even-and-low-jitter reading as artificial and clustered-and-high-jitter
   * reading as natural. */
  var DEBRIS_BELT = {
    id: "debris-belt",
    label: "Debris Belt",
    anchor: "orbit",
    reach: "outward",
    depth: [1.28, 1.95],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    element: "chunk",
    tiers: 3,
    size: [0.030, 0.062],
    alpha: [0.45, 0.92],
    density: { min: 60, max: 420 },
    tone: "lighter",
    /* Cold enough for solid material to survive in orbit — see the header. */
    /* Debris is the one orbital trait BOTH kinds of body get: scattered
     * rubble is scattered rubble whether it is around a rock or a giant, and
     * unlike a ring it makes no claim about structure. Gated on the tag every
     * ringed body carries, so it follows wherever rings are allowed. */
    requires: ["orbit-debris"],
    excludes: [],
    tags: ["orbital"]
  };

  CC.Traits.register([
    RING_SYSTEM,
    RINGLET_SYSTEM,
    DEBRIS_BELT
  ]);
})();
