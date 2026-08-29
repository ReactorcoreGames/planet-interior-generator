/* Stars — the EVOLVED traits: what stage the star is at.
 *
 * `shed-shells`, `dust-formation`, `dredge-up`, `engulfed-planet`,
 * `pulsating` and `accretion-disc`. Things that happen to a star over its life rather than things
 * it does every day, and all of them gated on the `evolved` or `shedding`
 * tags so they are offered only where they mean something. The shared header for the family
 * leads stellar-magnetic.js.
 *
 * The registry must load before this file. */
var CC = CC || {};

(function () {
  "use strict";

  /* SHED SHELLS — concentric rings of cast-off material beyond the star.
   *
   * DISTINCT FROM THE `shed-envelope` LAYER, which is the continuous fog an
   * old giant always has. This is the structure IN it: a star does not shed
   * smoothly, it does so in pulses, so the material sits in discrete shells
   * at the radii of the last few episodes. A layer says "there is material out
   * here"; this says "and it left in four separate events", which is a fact
   * about the star's history that a cutaway is uniquely able to show.
   *
   * `anchor: "orbit"` is the reserved token for a trait beyond the body, and
   * `ring-band` is the existing primitive for a concentric band out there —
   * the same one a planet's ring system uses. A shed shell and a ring are
   * genuinely the same drawing at different radii and opacities, which is the
   * trait grammar working as intended. */
  var SHED_SHELLS = {
    id: "shed-shells",
    label: "Shed Shells",
    anchor: "orbit",
    reach: "outward",
    /* OUTSIDE THE SHED ENVELOPE the layer already draws, which reaches about
     * 1.3 on this archetype — these are the discrete pulses within and just
     * beyond that fog, so they start where it is still substantial. */
    depth: [1.16, 1.62],
    arc: [0, 360],
    repeat: [2, 5],
    spacing: "even",
    jitter: 0.35,
    mirror: false,
    offset: [0, 360],
    element: "ring-band",
    tiers: 2,
    alpha: [0.10, 0.34],
    density: { min: 2, max: 6 },
    spread: [0.7, 1.4],
    tone: "lighter",
    /* `shedding` is declared by the old giant alone, so this is offered where
     * it makes sense without naming the archetype. */
    requires: ["stellar", "shedding"],
    excludes: [],
    tags: ["stellar", "evolved"]
  };

  /* DUST FORMATION — grains condensing in the cool outer envelope, which is
   * where most of the dust in a galaxy actually comes from.
   *
   * DARK, and that is the point: dust is the one thing near a star that does
   * not glow. A field of dark specks against the envelope is a genuinely
   * different mark from everything else in the family, and `tone: "darker"` on
   * a `speckle` is the cheapest possible way to say it. */
  var DUST_FORMATION = {
    id: "dust-formation",
    label: "Dust Formation",
    anchor: ["shed-envelope", "photosphere"],
    reach: "on",
    /* LOW IN THE ENVELOPE, where there is still something to be seen against.
     *
     * The shed envelope is drawn through the outward falloff, so it is nearly
     * transparent across its outer half. Dust scattered evenly through it put
     * most of its motes over empty space, where a dark speck on black is
     * nothing at all. Grains also condense where the gas is densest, which is
     * the same place — so the physics and the legibility agree. */
    depth: [0.02, 0.55],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    element: "speckle",
    tiers: 3,
    /* COARSER AND MUCH MORE OPAQUE than the first version, which authored
     * 0.005-0.013 at alpha 0.22-0.58 and diffed at a MAXDELTA OF 19 — a
     * thousand motes placed correctly and, between the tier alpha and the
     * layer's own falloff multiplying them down, no visible change at all.
     *
     * The failure is D80's other half: darkening needs room beneath to darken
     * INTO, and a dim halo over black space has almost none. So the grains are
     * bigger and nearly opaque, which is also what dust actually does — it
     * OCCLUDES, and being the one thing near a star that blocks light rather
     * than emitting it is the whole reason the trait is interesting. */
    size: [0.012, 0.030],
    alpha: [0.72, 1.0],
    density: { min: 300, max: 1600 },
    spread: [0.7, 1.5],
    tone: "darker",
    requires: ["stellar", "evolved"],
    excludes: [],
    tags: ["stellar", "evolved"]
  };

  /* DREDGE-UP — convection reaching so deep it brings fusion products from the
   * shells up to the surface.
   *
   * This is the one trait that says something about the RELATIONSHIP between
   * two layers rather than about one, so it is the family's user of
   * `reach: "spanning"` (D91): a dredge-up plume genuinely runs from the shell
   * region up through the envelope, and either layer's clip would cut it in
   * half. `fadeEnds` dissolves both radial extremes so it ends by fading
   * rather than by stopping, which is right — the material disperses as it
   * arrives rather than piling up at a boundary. */
  var DREDGE_UP = {
    id: "dredge-up",
    label: "Dredge-Up",
    anchor: "convective",
    reach: "spanning",
    /* Reaching well below the anchor's floor, into the shells, and up to near
     * the surface. */
    depth: [-0.35, 0.92],
    fadeEnds: 0.24,
    arc: [0, 360],
    repeat: [3, 9],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    element: "vein",
    tiers: 2,
    sizeRel: true,
    size: [0.55, 1.15],
    lean: 0.28,
    chaos: 0.5,
    alpha: [0.40, 0.85],
    density: { min: 4, max: 16 },
    spread: [0.6, 1.4],
    tone: "glow",
    blend: "screen",
    requires: ["stellar", "evolved"],
    excludes: [],
    tags: ["stellar", "evolved"]
  };

  /* AN ENGULFED PLANET — a world the star swallowed when it swelled, still
   * spiralling in through the envelope.
   *
   * `chunk` is the right primitive precisely because it is broken ROCK, and
   * rock is the one material that has no business being inside a star. D80
   * records the gas-miner platforms failing because `chunk` made them look
   * like rocks; here that is the entire intended reading. A dark solid body
   * inside a luminous envelope is the strongest contrast the family can make.
   *
   * `named: true` because this is ONE object, not a field, and the ordinary
   * tier behaviour would draw the body's single most striking feature at
   * 0.14x (D76). */
  var ENGULFED_PLANET = {
    id: "engulfed-planet",
    label: "Engulfed Planet",
    anchor: "convective",
    reach: "on",
    depth: [0.25, 0.70],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    /* ITS OWN PRIMITIVE, after `chunk` was tried and was the wrong object.
     *
     * `chunk` is broken ROCK, calibrated for debris a few pixels across, and
     * at trait scale it drew an enormous faceted lump — a boulder, exactly
     * when the picture needed a world. A planet is ROUND, and roundness is
     * what separates a world from a rock at any size. See engulfedWorld. */
    element: "engulfed-world",
    tiers: 1,
    named: true,
    sizeRel: true,
    /* A PLANET'S SCALE AGAINST A STAR'S ENVELOPE — small. The previous 0.16
     * to 0.30 of the layer put a world a third the size of the convective
     * zone inside it, which is not a swallowed planet, it is a second star.
     * The drama is in how LITTLE it is against what ate it. */
    size: [0.045, 0.085],
    alpha: [0.80, 1.0],
    /* ONE, and one only. Two engulfed planets in one cutaway reads as a
     * pattern rather than as an event. */
    density: { min: 1, max: 1 },
    tone: "darker",
    requires: ["stellar", "evolved"],
    excludes: [],
    tags: ["stellar", "evolved"]
  };

  /* PULSATION — the envelope breathing in and out, which is what an evolved
   * star does and is why its distance is not a fixed number.
   *
   * Drawn as concentric shells within the envelope at alternating tone: the
   * compression and rarefaction of a standing wave, which is a mark the
   * convective vocabulary does not make. `alternate` is the gas giant's
   * banding machinery pointed at a different physical fact, which is the trait
   * grammar and the element format being deliberately close paying off. */
  var PULSATING = {
    id: "pulsating",
    label: "Pulsating",
    anchor: "convective",
    reach: "on",
    depth: [0.10, 0.95],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "even",
    jitter: 0,
    mirror: false,
    offset: [0, 0],
    element: "gradient-band",
    tiers: 1,
    bandWidth: [0.75, 1.0],
    alternate: ["lighter", "darker"],
    alpha: [0.18, 0.42],
    density: { min: 5, max: 14 },
    tone: "lighter",
    /* Under the convection cells, because the pulsation is the medium the
     * cells are moving IN rather than something drawn over them (D85). */
    under: true,
    requires: ["stellar", "evolved"],
    excludes: [],
    tags: ["stellar", "evolved"]
  };

  /* AN ACCRETION DISC — the material a young star is still forming planets
   * out of, and the one thing that legitimately orbits a star at this scale.
   *
   * IT IS THE REPLACEMENT FOR THE RING SYSTEM AND THE DEBRIS BELT, which used
   * to be offered on every star because data/traits/orbital.js declared
   * `requires: []`. That was false at these radii — rock a fifth of a body
   * radius above a photosphere sublimates, and real debris around a star sits
   * hundreds of stellar radii out, off this canvas entirely. See that file's
   * header for the gate.
   *
   * A PROTOPLANETARY DISC AT 1.3 BODY RADII IS EQUALLY UNTRUE TO SCALE, and
   * is drawn anyway, because it is untrue in the way the whole generator is
   * untrue: D82, a symbol is not a scale model. The difference that matters is
   * what the picture CLAIMS. A ring says "solid bodies survive here", which is
   * false. A disc says "this star is still surrounded by the stuff it is
   * forming out of", which is true of a young star and is its single most
   * recognisable fact.
   *
   * DENSER AND MORE NUMEROUS THAN A RING SYSTEM, which is the whole visual
   * difference between the two given they share `ring-band`. A planetary ring
   * is a few sharp bands with gaps that read as swept clean; a disc is many
   * overlapping ones with no clear gaps, because it has not been swept yet —
   * that is precisely what "still forming planets" means, and it is carried by
   * count and by opacity rather than by a new primitive.
   *
   * `requires: ["young"]` gates it to the archetype carrying that tag, so
   * nothing here names an archetype. */
  var ACCRETION_DISC = {
    id: "accretion-disc",
    label: "Accretion Disc",
    anchor: "orbit",
    reach: "outward",
    /* STARTS FURTHER OUT THAN A PLANET'S RINGS WOULD, for D127's reason: a
     * young star's corona reaches about 1.32, and a band drawn inside a
     * bright halo has nothing to silhouette against. It also has to stay
     * inside the frame — this is the exact trait family that diffed at ZERO
     * pixels on a young star once already. */
    depth: [1.38, 2.05],
    arc: [0, 360],
    repeat: [5, 12],
    spacing: "even",
    /* Higher than a ring system's 0.15: the bands are not cleanly separated,
     * so they wander into each other rather than reading as swept gaps. */
    jitter: 0.55,
    mirror: false,
    offset: [0, 360],
    element: "ring-band",
    tiers: 2,
    /* Fainter per band than a ring, and there are more of them — the disc is
     * a continuous thing being approximated by bands, so no single band may
     * read as an edge. */
    alpha: [0.10, 0.34],
    density: { min: 6, max: 20 },
    spread: [0.7, 1.5],
    tone: "lighter",
    requires: ["stellar", "young"],
    excludes: [],
    tags: ["stellar", "evolved"]
  };

  /* ---- what somebody built around it ---------------------------------- */

  CC.Traits.register([
    SHED_SHELLS,
    DUST_FORMATION,
    DREDGE_UP,
    ENGULFED_PLANET,
    PULSATING,
    ACCRETION_DISC
  ]);
})();
