/* Gaseous bodies — traits for `gas-giant` and `ice-giant`.
 *
 * Everything here requires the `gaseous` tag, which is what keeps them off a
 * rocky world without any of them naming an archetype. See
 * js/data/traits/registry.js.
 *
 * WHAT THESE ARE FOR. The family's layer details already carry what every
 * giant has — banding, jets, storm curls, the pressure gradient. A trait is
 * what makes ONE giant different from the next, and on a body with no surface
 * to scar that means three kinds of thing:
 *
 *   NAMED WEATHER — a single storm large enough to have a name, a belt of
 *     them, banding driven past what the layer details give.
 *   THINGS FALLING THROUGH THE INTERIOR — helium and carbon separating out
 *     under pressure and raining inward. Nobody will ever see these, which is
 *     exactly why a cutaway is the only way to show them.
 *   INDUSTRY — the platforms and skimmers the stat card's "where you can
 *     work" line describes. On a giant this is the whole of what habitation
 *     means, so it belongs here rather than being reserved for machine worlds.
 *
 * NO NEW PRIMITIVES AND NO NEW GRAMMAR FIELDS. Every trait below is the
 * existing anchor/reach/depth/arc/repeat vocabulary pointed at gaseous roles,
 * which is the Phase 5 claim holding for the trait layer as well as for the
 * archetypes.
 *
 * The registry must load before this file.
 *
 * THE FAMILY IS THREE FILES, split at Session AL by what the trait is: this one
 * (storms and banding), gaseous-precip.js (rains and ice) and gaseous-built.js
 * (miners and skimmers). They load in that order, which is the order the picker
 * lists them in and the order the roll walks them, so it must not change. */

var CC = CC || {};

(function () {
  "use strict";

  /* ---- named weather --------------------------------------------------- */

  /* THE GREAT STORM — the single most recognisable thing a gas giant can
   * have, and deliberately ONE feature rather than a field.
   *
   * `repeat: [1, 7]` with a wide arc, in the same shape IMPACT_BASIN uses on a
   * planet: the grammar's "a handful of large features" end. A storm that
   * scattered into a dozen instances would read as texture, and texture is
   * what the troposphere's own storm curls already provide — a trait has to be
   * a different KIND of mark, not a louder example of the same one (D60). Seven
   * is the ceiling for that reason: past it the count starts describing the
   * layer rather than punctuating it.
   *
   * NO `minGap`, AND THAT IS DELIBERATE. The platforms use one because two
   * merged hulls read as a smudge; two merged storms do not. `spacing:
   * "random"` with full jitter means a high roll can land several of these on
   * top of each other, and because the primitive is feathered and drawn under
   * 1.0 alpha they composite into one enormous irregular disturbance rather
   * than clipping into a hard blob. That pile-up is a wanted outcome — the
   * rare world whose weather has merged into a single planet-scale anomaly —
   * so nothing here prevents it.
   *
   * See the note on `element` below for why it needs a primitive of its own
   * rather than either the layer's spiral or a filled oval. */
  var GREAT_STORM = {
    id: "great-storm",
    label: "Great Storm",
    /* SPANS FROM THE CIRRUS DECK DOWN INTO THE BANDED LAYER.
     *
     * A great storm is not confined to one band — it is a column of weather
     * reaching from the visible top of the atmosphere well down into the
     * troposphere, which is most of what makes it read as enormous rather
     * than as a mark on a stripe.
     *
     * `reach: "spanning"` is implemented for the first time here; it lets the
     * depth range run OUTSIDE the anchor's 0..1 box, and the element draws in
     * its own unclipped pass so no layer boundary cuts it. See traitDepth and
     * the spanning pass in draw/scene-surface.js.
     *
     * -2.6 reaches roughly two troposphere-thicknesses below its floor; 1.15
     * carries it just past the cloud tops. `fadeEnds` dissolves both extremes
     * so it ends by fading rather than by stopping. */
    anchor: "troposphere",
    reach: "spanning",
    /* Centred on the cloud-top boundary. The storm's own SIZE is what makes
     * it span — a radius of ~1 troposphere-thickness reaches roughly a full
     * layer above and below wherever it is centred — so the depth range only
     * has to place its centre near the top of the band rather than scatter it
     * across a wide span. */
    depth: [0.55, 1.05],
    /* Dissolves the outer and inner 26% of its radial extent. */
    fadeEnds: 0.26,
    /* HOW DEEP IS TOO DEEP, answered structurally.
     *
     * `fadeEnds` softens how the storm ENDS; it does nothing about where. A
     * storm at the top of the size range reached r=0.404 on a measured body —
     * far enough in to sit against the self-lit metallic-hydrogen shell, and a
     * cloud feature overlapping a fluid conductor at thousands of kelvin is
     * not a bold picture, it is a wrong one.
     *
     * The base of the WATER CLOUD is the honest line: deep enough that the
     * column still reads as running a very long way down into the envelope —
     * which is the whole reason to draw a giant in cross-section — and
     * shallow enough that it never argues with the interior. Naming the layer
     * rather than a number means the limit tracks the stack when it rolls
     * thick or thin, and `icy-mantle` is the ice giant's name for the same
     * place. `floorFrac` catches a body with neither.
     *
     * See the floor block in gen/traitfinish.js: this pulls the inward edge
     * back and leaves the outward end alone, so the bulge through the cloud
     * deck is unaffected. */
    floorAt: ["water-cloud", "icy-mantle"],
    floorFrac: 0.55,
    arc: [30, 55],
    repeat: [1, 7],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    /* ITS OWN PRIMITIVE, after two attempts that were not.
     *
     * `cell` was first, and it was simply the ninety-first cell in a layer
     * that draws ninety — a trait has to read as a different KIND of mark, not
     * a louder example of the same one (D60). `blob` was second, and it fixed
     * the silhouette while producing something flat, textureless and pale: a
     * single `fill()` cannot show a wall, an eye, or the bands a cyclone drags
     * round itself.
     *
     * `storm` is a radial gradient from a bright wall to a dark eye, with
     * concentric bands drawn under a multiply/overlay blend so they read as
     * depth in the cloud rather than as stripes painted on it. See the
     * primitive, and `stormFill` for why the tones are built off the layer
     * colour directly instead of through the `glow` tone — glow pulls
     * saturation, and a storm should be the MOST saturated thing here.
     *
     * `named` takes the LARGEST size tier instead of the smallest — without it
     * a `tiers: 1` trait is drawn at 0.14x and this storm came out three times
     * SMALLER than the ordinary cells around it. See tierSplit. */
    element: "storm",
    named: true,
    tiers: 1,
    /* Sized against the anchor's own thickness, so a storm stays proportional
     * however the troposphere rolled. Large: this is the body's headline
     * feature and should be visible at contact-sheet scale. */
    sizeRel: true,
    /* THE ORIGINAL FIGURES, restored once the troposphere was returned to its
     * original thickness.
     *
     * These were shrunk twice: once by hand, and once implicitly when
     * `upper-cloud` became a wide outward halo and pushed the troposphere from
     * ~0.13 to ~0.22 of the radius, which made the same fraction draw nearly
     * twice as large. Both causes are gone — the cloud deck is back to a thin
     * skin whose density comes from its falloff curve rather than its width,
     * and the troposphere's range is narrow enough that a proportion of it
     * means something stable. */
    /* THE FLOOR MATTERS AS MUCH AS THE CEILING, which the previous figures
     * got wrong. At [0.60, 1.05] against STORM_BELTS' [0.34, 0.58] — both
     * `sizeRel` against the same troposphere thickness — the two ranges very
     * nearly touched, so a low great-storm roll beside a high belt roll
     * produced a "great" storm no larger than the ordinary ovals around it.
     * The headline feature was being outclassed by the texture, which is D60
     * failing from the size direction rather than the vocabulary one.
     *
     * The floor is now roughly double the belt ceiling, so the SMALLEST great
     * storm is still unambiguously the biggest thing in the band, and the
     * ceiling reaches about two troposphere-thicknesses — genuinely enormous,
     * and about the proportion the Great Red Spot bears to its own belt. */
    size: [1.10, 2.00],
    alpha: [0.85, 1.0],
    /* Tracks `repeat`. The two say different things — repeat is how many
     * anchor points, density is how many instances the sliders allow — but a
     * max of 2 here would clamp a 7-storm roll straight back down to 2. */
    density: { min: 1, max: 7 },
    /* A SOFT PERIMETER, AND A WIDE ONE NOW THE STORM IS LARGE.
     *
     * See the storm primitive: a hard-filled shape reads as an object and a
     * feathered one reads as a region of weather. The feather is a FRACTION
     * of the radius, so 0.26 on a storm twice the old size still gives a
     * proportionally identical edge — but proportion is not what the eye
     * judges here. A big shape needs a proportionally SOFTER edge to read as
     * diffuse, because the hard part of the perimeter is longer in absolute
     * terms and there is more of it to look at.
     *
     * Paired with the curved outline, this is what turns the storms from
     * translucent wedges laid over the planet into weather sitting in it. */
    feather: 0.42,
    /* LESS LOBE VARIATION THAN THE PRIMITIVE'S 0.34 DEFAULT.
     *
     * `rough` is the amplitude of the two sine terms that wobble the radius,
     * and it is applied as a fraction — so at this size it swings the
     * perimeter by a large absolute distance and produces the long tapering
     * points visible on a big storm. Pulled back so the silhouette stays
     * irregular without growing horns. */
    rough: 0.22,
    /* ROUNDER THAN THE 0.72 DEFAULT. A heavily squashed ellipse at this size
     * reads as a lens or a leaf; a storm should be closer to round. */
    squash: 0.88,
    /* More lobes, so the curve has more points to pass through and the
     * outline reads as an organic wobble rather than as a rounded triangle. */
    lobes: 11,
    /* THE STORM SHOWING THROUGH THE CIRRUS DECK.
     *
     * The deck is an outward layer screened over everything beneath it, so
     * the top of a spanning storm was being washed pale exactly where it
     * emerged — which is why the family looked like its weather stopped below
     * the clouds. This is a second, smaller, fainter instance at the same
     * bearing and a higher radius, drawn in the spanning pass after the
     * outward layers and therefore ON TOP of the haze. See the companion
     * block in gen/traitfinish.js for why this rather than a hole in the deck.
     *
     * `lift` is in body radii, MEASURED RATHER THAN GUESSED. The troposphere
     * runs out to 1.000 and the cirrus deck sits at 1.000-1.045, so a storm
     * centred around r=0.95-0.99 needs only a small push to land INSIDE the
     * deck. The first figure was 0.055, which put half the companions at
     * 1.044-1.049 — at or past the deck's outer edge, where its falloff has
     * already taken it to nothing, so they were disturbing empty space.
     * 0.030 centres them in the deck's band, where it is densest and where a
     * disturbance therefore has something to show against.
     *
     * BIGGER AND STRONGER THAN THE FIRST ATTEMPT TOO. At 0.42x size and 0.45x
     * alpha the mark could not be seen against the brightest band in the
     * picture — the same "it draws but cannot be seen" failure the storm
     * primitive's own comments record four times over. It now keeps most of
     * the parent's footprint and two thirds of its opacity: still clearly
     * secondary to the storm below, no longer a rumour. */
    companion: { lift: 0.030, size: 0.72, alpha: 0.68, feather: 0.55 },
    /* The tone ladder is bypassed entirely — `stormFill` builds its four
     * stops from the layer colour directly. Left as `lighter` so anything
     * that reads `tone` generically gets a sensible answer. */
    tone: "lighter",
    requires: ["gaseous"],
    excludes: [],
    tags: ["atmospheric"]
  };

  /* STORM BELTS — the same idea at the other end of the grammar: many storms
   * pinned into a latitude band rather than one anywhere.
   *
   * `spacing: "even"` with moderate jitter, because a real storm belt is a
   * chain of vortices strung along one jet — regular enough to read as a belt,
   * irregular enough not to read as a dotted line. */
  var STORM_BELTS = {
    id: "storm-belts",
    label: "Storm Belts",
    anchor: "troposphere",
    reach: "on",
    depth: [0.30, 0.72],
    arc: [0, 360],
    repeat: [14, 30],
    spacing: "even",
    jitter: 0.45,
    mirror: true,
    offset: [0, 360],
    /* The same primitive as the great storm, smaller and many. A chain of
     * shaded cyclones along one jet is a shape the layer's own spirals never
     * make, and at this size each one still shows its wall and eye. */
    element: "storm",
    named: true,
    tiers: 2,
    sizeRel: true,
    /* The original figures, restored with the great storm's — see the note
     * there. */
    size: [0.34, 0.58],
    alpha: [0.75, 0.98],
    density: { min: 14, max: 44 },
    /* A HEAVIER FEATHER THAN THE GREAT STORM'S, because these are small.
     *
     * At belt size the turbulence strokes fall near a pixel and stop reading,
     * which leaves only the faceted silhouette — and a small hard-edged
     * polygon is a rock. The soft perimeter is doing most of the work of
     * saying "weather" at this scale, so it gets more of it. */
    feather: 0.48,
    /* Rounder and gentler than the primitive's defaults, matching the great
     * storm. These are small enough that the faceted outline was never as
     * offensive here, but a belt of soft ovals and one enormous soft storm
     * belong to the same weather system — a belt of hard little shards beside
     * a soft giant reads as two unrelated features. */
    rough: 0.26,
    squash: 0.80,
    tone: "lighter",
    requires: ["gaseous"],
    /* NO LONGER EXCLUSIVE WITH `great-storm`, and the first version was simply
     * wrong about this.
     *
     * The reasoning was that one enormous storm would be lost among a belt of
     * small ones. Jupiter disproves it: the Great Red Spot sits IN a belt of
     * smaller white and brown ovals, and the size contrast between them is a
     * large part of why the Spot reads as remarkable. Excluding the pair threw
     * away the best-looking combination the family has. */
    excludes: [],
    tags: ["atmospheric"]
  };

  /* VIOLENT BANDING — the banding pushed past what the layer details give.
   *
   * Drawn as extra concentric bands ON TOP of the troposphere's own comb,
   * alternating in the same direction so they reinforce rather than cancel —
   * the lesson from the layer-detail work, where two interleaved combs
   * composited back to a flat wash. Fewer and wider than the standard comb, so
   * they read as the dominant belts of a world whose jets are running hard. */
  var VIOLENT_BANDING = {
    id: "violent-banding",
    label: "Violent Banding",
    anchor: "troposphere",
    reach: "on",
    depth: [0.04, 0.96],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "even",
    jitter: 0.1,
    mirror: false,
    offset: [0, 0],
    element: "gradient-band",
    /* BENEATH EVERYTHING ELSE IN THE LAYER. Banding is the background a storm
     * sits on; drawn in trait order it painted over them. See the draw-order
     * pass in gen/details-instances.js. */
    under: true,
    named: true,
    tiers: 1,
    /* WIDER AND FEWER THAN THE LAYER'S OWN COMB, so the two do not merely add
     * more of the same stripe. The troposphere draws 14-30 narrow bands; this
     * lays a dozen broad ones across them, which reads as a world whose jets
     * have organised into a few dominant belts rather than as extra texture. */
    bandWidth: [1.05, 1.55],
    alternate: ["lighter", "darker"],
    alpha: [0.72, 0.97],
    density: { min: 7, max: 15 },
    tone: "lighter",
    requires: ["gaseous"],
    excludes: [],
    tags: ["atmospheric"]
  };

  CC.Traits.register([
    GREAT_STORM,
    STORM_BELTS,
    VIOLENT_BANDING
  ]);
})();
