/* Stars — the BUILT traits: what somebody put in orbit.
 *
 * `orbital-mirrors` and `stellar-collector`. These live with the star family
 * rather than being reserved for machine worlds for the same reason the
 * gas-miner platforms live with the giants: on a star, this is the whole of
 * what habitation could possibly mean. The shared header for the family leads
 * stellar-magnetic.js.
 *
 * THEY DO NOT EXCLUDE ONE ANOTHER, and that is a change from how they were
 * first written. The collector used to declare `excludes: ["dyson-structure"]`
 * on the reasoning that a star wearing both is one picture with two answers to
 * the same question. It is not: a mirror ring and a rank of collector stations
 * are two different pieces of infrastructure, the way a solar farm and a
 * refinery are, and a system that built one has every reason to build the
 * other. A star wearing both is a star somebody is taking seriously.
 *
 * TWO CONSTRAINTS THAT ARE EASY TO GET WRONG HERE, both learned the hard way:
 *
 *   D127 — the orbital band around a star is bounded on BOTH sides. Too far
 *     out and the elements leave the frame (this exact pair diffed at ZERO
 *     pixels on a young star); too far in and they are inside the corona,
 *     where a manufactured object has nothing to silhouette against. Doc 1 of
 *     the polish phase made the glow LARGER, so the inner bound moved out
 *     rather than in.
 *   D126/D82 — a symbol is not a scale model, and this is the most extreme
 *     case of it in the generator. A collector is perhaps a kilometre across
 *     and the star is a million; at any honest scale the whole swarm is
 *     sub-pixel, so the only question is how big a symbol must be to be read.
 *
 * The registry must load before this file. */
var CC = CC || {};

(function () {
  "use strict";

  /* ORBITAL MIRRORS — a ring of solar panels, each a metal backing with a
   * glass face turned toward the star.
   *
   * IT USED TO BE A DYSON SWARM OF CAPSULES, and the rename is not cosmetic:
   * it is now a different object, and `stars.md` already used this name. A
   * swarm of rounded capsules said "a lot of small vessels are in orbit",
   * which is a fleet rather than an installation — and `capsule` is a PRESSURE
   * HULL, so every mark on it (rounded ends, section joins, a specular band
   * down one flank) says "there are people inside this". A mirror says
   * something the generator could not say before: that the star is being
   * FARMED, and that the panels are all pointed at it.
   *
   * THE PRIMITIVE IS NEW BECAUSE THE SHAPE CARRIES THE MEANING (D80). Two flat
   * rectangles sharing an edge — one metal, one glass — can say which way an
   * object faces; a rounded rectangle cannot say it at any size or contrast.
   * That is the test for earning a primitive, and this is the fifth or sixth
   * time this family has met it.
   *
   * THE GLASS TAKES THE STAR'S OWN COLOUR AND GLOWS, which is a deliberate
   * exception to the rule that `hullFill` keeps a manufactured object's colour
   * independent of the body (D80). The metal half still obeys it. The glass
   * does not, because the glass is not the object's colour — it is the star,
   * reflected, and that is the entire idea of the trait. See `mirrorFill` in
   * js/draw/details.js, which carries the same warning, and CC.Palette's
   * `emitted`, which is where the colour comes from. */
  var ORBITAL_MIRRORS = {
    id: "orbital-mirrors",
    label: "Orbital Mirrors",
    anchor: "orbit",
    reach: "outward",
    /* OUTSIDE THE CORONA — AND THIS TOOK TWO TRIES IN OPPOSITE DIRECTIONS.
     *
     * `anchor: "orbit"` places in BODY RADII, and a star's outward layers
     * reach 1.09 to 1.32 depending on the archetype, which is far further than
     * any other family's because a corona is enormous. That makes the usable
     * band narrow and it is bounded on BOTH sides:
     *
     *   TOO FAR OUT and the elements leave the frame entirely — the first
     *     version put them at 1.30-1.80 and the collector trait diffed at ZERO
     *     PIXELS on a young star, whose extent is 1.34.
     *   TOO FAR IN and they are inside the corona, where a manufactured object
     *     has nothing to silhouette against: the correction to 1.14-1.42 drew
     *     73 collectors as bright specks lost in a bright halo.
     *
     * What a panel needs is BLACK BEHIND IT. The hard edges and the glowing
     * face that make it read as manufactured only work against something
     * plain, so the band starts just past where the corona has faded and stays
     * inside the frame. */
    depth: [1.34, 1.62],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    element: "orbital-mirror",
    tiers: 2,
    /* D82: A SYMBOL IS NOT A SCALE MODEL, AND THIS IS THE MOST EXTREME CASE
     * OF IT IN THE GENERATOR.
     *
     * A solar panel is perhaps a kilometre across. The star it orbits is a
     * million. At ANY honest scale the entire ring is less than one pixel, so
     * the only question is how big a symbol has to be to do its job — the way
     * a compass rose on a map is not drawn to scale because its purpose is to
     * be read, not to be measured.
     *
     * Measured at the first size: 1.4 to 5.4 pixels on a 900px render. The
     * pixel diff reported 70,000 changed pixels and the ring was still
     * invisible to look at, which is the one case where counting pixels is not
     * enough — 73 objects can change a lot of pixels while no single one of
     * them is legible. `maxdelta` was the tell: high contrast, no size.
     *
     * ALSO SIZED FOR THE SURVIVING TIER (D122). At `tiers: 2` and the default
     * Size-tiers of 3, the largest drawn is 0.52x the authored figure, so the
     * authored number has to carry that too. */
    size: [0.115, 0.230],
    /* A RANGE, and BELOW 1: `aspect` is the panel's depth relative to its
     * span, so a low figure is a wide thin sail and a high one is a stubby
     * paddle. The range is what keeps a ring from being stamped from one die.
     * Lower than the old capsule's, because a mirror IS thin — the depth is
     * only there to have room for two materials. */
    aspect: [0.26, 0.44],
    alpha: [0.75, 1.0],
    density: { min: 14, max: 70 },
    spread: [0.6, 1.5],
    /* Random with a gap, not even: an installation that grew over time reads
     * as built by people, and perfectly even spacing at this count reads as a
     * drawn diagram (D85). The collectors below make the opposite call for the
     * opposite reason — see the note there. */
    minGap: 3,
    tone: "lighter",
    requires: ["stellar"],
    excludes: [],
    tags: ["stellar", "artificial"]
  };

  /* STELLAR COLLECTORS — a handful of large stations on one evenly-spaced
   * orbit, each a cylinder with a cone on the end pointing at the star.
   *
   * DISTINCT FROM THE MIRRORS IN KIND, not merely in count. They used to be
   * the same `capsule` at a bigger size, which made them the same technology
   * at two scales of ambition and gave the two traits no reason to coexist.
   * A coned cylinder aimed at the star is a different object doing a different
   * job, so both can now sit on one star without the picture giving two
   * answers to one question — see the file header.
   *
   * THE CONE IS THE WHOLE REASON THIS IS NOT `capsule` WITH `upright`.
   * `upright` means "along the local vertical": it picks an AXIS, and a
   * capsule is symmetric, so one pointing at the star and one pointing away
   * are the same drawing. The cone gives the shape a DIRECTION, which is what
   * makes a rank of them read as aimed at something. */
  var STELLAR_COLLECTOR = {
    id: "stellar-collector",
    label: "Stellar Collector",
    anchor: "orbit",
    reach: "outward",
    /* CLOSER TO THE STAR THAN THE MIRRORS, AND STATED RELATIVE TO THIS BODY'S
     * OWN HALO RATHER THAN AS AN ABSOLUTE RADIUS.
     *
     * `depthAbove` is body radii ABOVE wherever the outward layers actually
     * reached, and it exists because of what measuring showed: a star's halo
     * runs from 1.06 on a quiet dwarf to 1.40 on an old giant, while the frame
     * holds a full circle only to about 1.15. NO fixed band clears every
     * corona and stays on canvas — an absolute 1.26-1.38 left four bodies in
     * forty with zero collectors visible, which is a trait that rolls, reports
     * and draws nothing (D121).
     *
     * Relative, "just clear of the glow" means the same thing on all four
     * archetypes, which is what the user asked for by asking for them closer.
     * The band is deliberately NARROW — these sit on one orbit, and a wide
     * band would scatter them radially and undo the even spacing.
     *
     * THE BAND NOW STRADDLES ZERO, WHICH MEANS "IN THE CORONA" RATHER THAN
     * "JUST ABOVE IT" — the user asked for them moved closer in, and closer
     * than clear-of-the-glow is inside the glow. The lower end dips slightly
     * BELOW where the outward layers reached, so the innermost stations sit
     * with corona in front of and behind them rather than silhouetted on its
     * outer edge. That is what puts them at the star instead of merely near
     * it, and with the halved size below they no longer overpower the layer
     * they are sitting in. */
    /* HALFWAY INTO THE CORONA, which is the user's third and final call on
     * where these sit — first "closer", then "deeper", now a specific depth.
     *
     * The figure is NEGATIVE because `depthAbove` is measured from wherever
     * the outward layers actually reached: 0 is the top of the halo and -0.5
     * would be half a body radius below it. A star's corona runs roughly 0.06
     * to 0.40 radii thick depending on archetype, so a band of -0.16 to -0.09
     * lands around the middle of a typical one and stays inside a thin one.
     *
     * Stated relative rather than absolute for the reason the original note
     * below gives, and it matters more at this depth than it did above the
     * halo: an absolute band that is mid-corona on an old giant would be
     * underground on a dwarf. */
    depthAbove: [-0.03, -0.02],
    arc: [0, 360],
    /* THE COUNT IS THE `repeat` ROLL, NOT THE DENSITY SLIDER. With
     * `spacing: "even"` the placement produces exactly this many anchor
     * points, and traitroll.js raises the count to match them — which is how
     * "between 1 and 12 at random" is said in this grammar without a new
     * field. `density` below is therefore a floor that the placement
     * overrides, not the figure in charge.
     *
     * THE FLOOR IS 2 RATHER THAN 1, DELIBERATELY. Even spacing with a count of
     * one puts a single object on an otherwise empty orbit, and even spacing
     * is precisely what makes the eye read the orbit as a SET — so one lonely
     * station reads as eleven that failed to draw rather than as a modest
     * installation. Two is the smallest count that still reads as an
     * arrangement. */
    repeat: [2, 12],
    /* EVEN, WHICH IS THE OPPOSITE CALL FROM THE MIRRORS ABOVE, and both are
     * deliberate. TRAIT-SYSTEM.md: even-and-low-jitter reads as artificial.
     * That is wrong for an installation that grew, and exactly right for a
     * small number of large stations placed on purpose — a stationkeeping
     * orbit IS a diagram, and these are few enough to count. */
    spacing: "even",
    /* ENOUGH JITTER TO BREAK THE AXES, AND NOT ENOUGH TO STOP READING AS A
     * RING. At a low count, perfectly even spacing puts every station on a
     * cardinal bearing — and the cardinal bearings are exactly where a square
     * frame runs out first, because the corners reach further than the edges.
     * Measured, a two- or three-station body could put ALL of them off canvas
     * at once. A fifth of a step is invisible as irregularity and moves them
     * off the worst bearings. */
    jitter: 0.42,
    mirror: false,
    offset: [0, 360],
    element: "coned-cylinder",
    /* ONE TIER, AND `named`, AND THAT IS A DECISION RATHER THAN A DEFAULT.
     *
     * The size band below is 10% wide — deliberate uniformity, because the
     * user asked for these to be alike. Tiers exist to manufacture SPREAD, so
     * running tierSplit over a band authored for uniformity fights itself, and
     * the surviving-tier factor (D122, 0.52x) would silently shrink a band
     * that was calibrated by hand.
     *
     * `named: true` takes the largest tier rather than the smallest, so
     * TIER_SIZE[0] = 1.00 and THE AUTHORED SIZE IS THE DRAWN SIZE. Checked
     * before authoring the numbers: `named` does NOT cap the instance count at
     * one (it selects tiers and waives the tier alpha penalty; the count is
     * computed separately in traitroll.js), which is what makes it usable for
     * a trait that is 2-12 objects rather than one headline feature. */
    tiers: 1,
    named: true,
    /* HALVED AGAIN, ON THE USER'S SECOND CALIBRATION — "at least 50% smaller
     * on average". The previous band (0.135-0.150) was authored when these
     * were bullet-shaped and sitting clear of the halo, where a station had to
     * be large to read at all against empty space. Sat down inside the corona
     * they have the glow behind them for contrast, so they can be the size an
     * installation actually looks: small things around a huge thing.
     *
     * The band is a little wider than the old one in relative terms — a 16%
     * spread against the original 11% — because at this size a perfectly
     * uniform rank starts to read as a repeated stamp rather than as a set of
     * built objects. Still narrow enough to keep them alike, which is what the
     * tiers/named decision above is protecting.
     *
     * THEN DOWN A FURTHER 20% on the user's next look, together with the move
     * to mid-corona above. The two go together: sunk into the halo the
     * stations have glow both in front of and behind them, so they read at a
     * smaller size than they needed out in the dark — and staying large while
     * moving in would have made them loom over the layer instead of sitting
     * in it.
     *
     * These numbers reach the canvas undivided: `tiers: 1` + `named` means no
     * tier factor multiplies them. */
    size: [0.04, 0.05],
    /* Stubbier than a mirror panel: a station is a habitat with mass in it,
     * and the cone needs width at its base to read as a cone.
     *
     * WIDENED WITH THE SIZE CUT, and the two go together. `aspect` is width
     * over LENGTH, so halving the size halves the width at a fixed ratio — and
     * a shape that loses width faster than the eye loses acuity stops being a
     * cone and becomes a sliver. At 0.34 the smallest stations were four
     * pixels across at preview scale and the rounded base had nothing to
     * round. Taking it to 0.62-0.86 keeps the drawn WIDTH close to what it was
     * before the cut while the length comes down, which is the proportion a
     * squat station wants anyway: these are tanks aimed at a star, not
     * needles. */
    aspect: [0.62, 0.86],
    alpha: [0.80, 1.0],
    /* `{1, 1}` IS "EXTENT, NOT COUNT" — the same thing an ice cap declares,
     * and it is what actually makes the `repeat` roll the number of stations.
     *
     * traitroll.js takes the density figure and then raises it to the number
     * of anchor points, never lowers it. So `{2, 12}` did NOT mean "two to
     * twelve": at the default Detail density it computed about eight, and
     * eight beat almost every repeat roll — measured across eighty bodies the
     * count came out 8, 9, 10 or 11 and NEVER the 2 or 3 the roll had asked
     * for. The user asked for the number of collectors to be a fact about the
     * world rather than a texture setting, and a density band is a texture
     * setting by construction.
     *
     * At `{1, 1}` the placement wins outright and the count IS `repeat`. */
    density: { min: 1, max: 1 },
    tone: "lighter",
    requires: ["stellar"],
    /* NOTHING. The mirrors and the collectors are different infrastructure and
     * a star may wear both — see the file header. */
    excludes: [],
    tags: ["stellar", "artificial"]
  };

  CC.Traits.register([
    ORBITAL_MIRRORS,
    STELLAR_COLLECTOR
  ]);
})();
