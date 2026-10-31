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
    /* ONE ORBIT, JUST ABOVE THE HALO, CAPPED (D298). The mirrors were a
     * random scatter at 1.34-1.62 body radii, which put most of them off the
     * top and bottom of the frame and read as debris; they are now one
     * evenly spaced ring 0.02-0.03 above the halo's edge, the edge capped at
     * 1.15 so that on a star whose corona fills the frame's height the ring
     * sinks into the glow instead — leaving room above it for the Dyson
     * shell (data/traits/dyson.js) as a whole circle. Ordered, as the
     * planet's satellites taught (D294). */
    depthAbove: [0.02, 0.03],
    edgeCap: 1.15,
    arc: [0, 360],
    repeat: [18, 34],
    spacing: "even",
    jitter: 0.08,
    mirror: false,
    offset: [0, 360],
    element: "orbital-mirror",
    tiers: 1,
    named: true,
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
     * One tier and `named` since D298, so the authored size is the drawn
     * size: about what the old scatter's surviving tier (D122) drew. */
    size: [0.050, 0.058],
    /* A RANGE, and BELOW 1: `aspect` is the panel's depth relative to its
     * span, so a low figure is a wide thin sail and a high one is a stubby
     * paddle. The range is what keeps a ring from being stamped from one die.
     * Lower than the old capsule's, because a mirror IS thin — the depth is
     * only there to have room for two materials. */
    aspect: [0.30, 0.36],
    alpha: [0.85, 1.0],
    /* `{1, 1}`: the count is the `repeat` roll (see the collectors). */
    density: { min: 1, max: 1 },
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
    /* HALFWAY BETWEEN THE STAR'S SURFACE AND THE MIRRORS' ORBIT (D299), the
     * user's call after the restack: `depthFrac` takes the band from the
     * surface up to the capped edge plus `depthAbove`'s first figure — the
     * mirrors' orbit — and sits the collectors at 48-52% of it. Stated as a
     * fraction because "halfway to the mirrors" is 0.02 below the halo's
     * edge on a dwarf and 0.06 below it on a giant (D127: a star's halo runs
     * 1.06-1.44 body radii, and no absolute band suits every archetype). */
    depthAbove: [0.025, 0.025],
    depthFrac: [0.48, 0.52],
    edgeCap: 1.15,
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
     * THEN UP AGAIN IN SESSION AE (D299), with the move down to halfway to
     * the mirrors: +30%, then the user's own hand to 0.072-0.085. Under a
     * shell they read as its control rods, and at the old size they were
     * lost in a bright corona.
     *
     * These numbers reach the canvas undivided: `tiers: 1` + `named` means no
     * tier factor multiplies them. */
    size: [0.072, 0.085],
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
