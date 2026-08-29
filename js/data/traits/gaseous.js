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
 * The registry must load before this file. */

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
     * the spanning pass in draw/scene.js.
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
     * See the floor block in gen/traitroll.js: this pulls the inward edge
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
     * block in gen/traitroll.js for why this rather than a hole in the deck.
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
     * pass in gen/details.js. */
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

  /* ---- things falling through the interior ------------------------------ */

  /* HELIUM RAIN — helium becoming immiscible in metallic hydrogen and settling
   * inward. It happens in the deep envelope of a cool giant and nobody will
   * ever see it, which is precisely the sort of thing a cutaway exists for.
   *
   * DROPLETS, NOT VEINS, and this is the third shape it has had.
   *
   *   `flow-line`  vanished among the layer's own three hundred.
   *   `vein`+bulk  visible, and looked like the PLANET'S MINERAL VEINS — a
   *                rock feature on a body made of gas, with a hard contour
   *                that reads as a fracture through something solid.
   *
   * Helium separating out of hydrogen is a FLUID leaving a fluid: it beads.
   * So it is a field of round, soft-edged droplets with no outline at all,
   * strung in loose downward trails — the shape of something falling through a
   * liquid, which no vein primitive can be talked into. `speckle` is the one
   * primitive here that is a plain round dot with no contour, and at three
   * tiers a field of them reads as a shower rather than as a texture. */
  var HELIUM_RAIN = {
    id: "helium-rain",
    label: "Helium Rain",
    /* ANCHORED IN THE WATER CLOUD, REACHING INWARD.
     *
     * Physically the separation happens deeper, in the metallic-hydrogen
     * region — but `molecular-h` rolls as a thin band sitting behind the much
     * larger water cloud, so a trait drawn there is occluded on most bodies
     * and was invisible on every one measured. Anchoring one layer out and
     * reaching inward draws the same downward journey across the part of the
     * envelope the viewer can actually see, which is the honest trade: this is
     * a diagram of a process, and a process nobody can see is not a diagram of
     * anything.
     *
     * A LIST, because an ice giant has no `water-cloud` at all — anchored to
     * that alone the trait rolled, reported itself on the card, and drew
     * literally nothing on half the family. See anchorLayer. */
    anchor: ["water-cloud", "icy-mantle"],
    reach: "inward",
    depth: [0.05, 0.95],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    /* Round, soft, and CONTOURLESS. `speckle` draws a plain filled dot, which
     * is the whole requirement — the mineral vein's dark outline is exactly
     * what made the previous version read as rock. */
    element: "speckle",
    tiers: 3,
    /* Large for a speckle: these are droplets, not grain. The three tiers
     * give a few fat beads among many fine ones, which is what a shower of
     * condensing liquid actually looks like. */
    size: [0.022, 0.042],
    /* THE ALPHA FLOOR WAS THE PROBLEM, not the tone.
     *
     * At 0.55 a droplet sitting in the inner half of the water cloud — which
     * carries `depthGradient: 0.55` and so is markedly darker there than its
     * authored value suggests — composited to a dim grey bead. The trait
     * declared itself bright and drew dark, which for the one feature whose
     * entire purpose is showing something nobody could ever see is the same
     * failure as not drawing at all. */
    alpha: [0.72, 0.95],
    density: { min: 200, max: 680 },
    /* Reflective metal in a dark fluid, so it is BRIGHTER than what surrounds
     * it. `lighter` is the tone that says so, and unlike the bulk vein's
     * two-tone fill it needs no special casing at all. */
    tone: "lighter",
    /* AND IT LIGHTENS WHAT IS BEHIND IT RATHER THAN BEING PAINTED OVER IT.
     *
     * `lighter` moves the droplet's own colour up a fixed step, which is a
     * statement about the paint; `screen` makes the mark brighten the layer
     * beneath, which is a statement about the material. For something falling
     * through a dark fluid the second is the one that reads — it is exactly
     * what makes `shard` say "gem" instead of "pebble" (see gemFill), and the
     * mechanism was already there for a batched speckle to borrow. */
    blend: "screen",
    requires: ["gaseous"],
    excludes: [],
    tags: ["interior", "resource"]
  };

  /* DIAMOND RAIN — and it is a real thing, which is worth stating because the
   * name sounds invented.
   *
   * In an ice giant's mantle, methane cracks under pressure and the carbon
   * compresses into diamond, which then SINKS toward the core because it is
   * denser than the slush around it. So the phenomenon is a slow fall of
   * crystals through the deep interior — not a glitter of specks near the
   * surface, which is what it was first drawn as and what prompted the "what
   * IS this exactly" question.
   *
   * SPLIT IN TWO, because the fall and its destination are different pictures
   * and only one of them was being drawn:
   *
   *   `diamond-rain`  the crystals in transit, scattered through the mantle,
   *                   pointing inward because that is the way they are going.
   *   `diamond-layer` where they end up — a dense accumulation deep down,
   *                   which is the part a cutaway is uniquely able to show.
   *
   * The two are independent: a body may show the fall, the floor, or both. */
  var DIAMOND_RAIN = {
    id: "diamond-rain",
    label: "Diamond Rain",
    /* `surface` is the reserved token for "whatever the outermost real layer
     * turned out to be" — but here the interesting layer is the bulk, and the
     * two archetypes name it differently. Anchoring to the TROPOSPHERE and
     * reaching inward needs no branch, and is also where the carbon actually
     * starts its fall from. */
    /* IN THE BULK ENVELOPE, WHERE IT ACTUALLY FORMS.
     *
     * Carbon does not start falling at the cloud tops — methane cracks under
     * pressure well down in the mantle, and the crystals sink from there. The
     * first version anchored to the troposphere because that was the layer
     * both archetypes shared; an anchor LIST says the same thing without
     * putting the feature in the wrong place. */
    anchor: ["molecular-h", "icy-mantle"],
    reach: "on",
    depth: [0.05, 0.95],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    /* A SHARD, NOT A CHUNK — and the difference is the whole trait.
     *
     * `chunk` draws a rounded angular lump because it exists to draw BROKEN
     * ROCK, which is exactly what a diamond is not. Scattered through the
     * envelope at size it produced an asteroid ring in the middle of the
     * planet.
     *
     * `shard` is few long straight facets around a stretched centre — an
     * elongated crystal — with a bright glint on one face, drawn under a
     * `screen` blend so each stone LIGHTENS what is behind it instead of
     * covering it. That transparency is what says "gem" rather than "pebble".
     * The long axis points at the body's centre, which is the direction they
     * are falling. */
    element: "shard",
    named: true,
    tiers: 3,
    /* THE ORIGINAL FIGURES. A real diamond formed this way is about a
     * centimetre across, so it is a small hard thing seen in enormous
     * quantity — and the version that read best was exactly that: many fine
     * crystals rather than a few pebbles. Enlarging them to make the split
     * legible was solving a problem the split had created. */
    size: [0.009, 0.024],
    alpha: [0.62, 0.95],
    density: { min: 60, max: 210 },
    tone: "glow",
    requires: ["gaseous"],
    excludes: [],
    tags: ["interior", "resource"]
  };

  /* PRISMATIC ICE — exotic water-ice crystals, growing sideways in the shear.
   *
   * THIS REPLACES A `diamond-layer` THAT WAS PHYSICALLY WRONG. The idea was a
   * drift of diamond accumulated on the mantle floor; the actual physics says
   * the opposite happens — it gets hot enough down there that the diamond
   * MELTS into a liquid-carbon sea, so there is no crystal floor to draw.
   *
   * What is real, and stranger, is up higher. Water under this pressure does
   * not freeze into ordinary ice: it takes exotic phases (ice VII, ice X and
   * their neighbours) with lattices nothing on a planet's surface produces.
   * They are birefringent — they split light — which is a genuine reason for
   * them to show colour rather than a decorative one.
   *
   * PERPENDICULAR, AND THAT IS THE POINT. A falling crystal points the way it
   * is going, so `diamond-rain` above is radial. These are not falling: they
   * are GROWING in a shearing flow, so their long axis lies across it, around
   * the body. One primitive, one flag, opposite reading — the same trick the
   * bulk vein's `bright` polarity uses.
   *
   * A NARROW HUE RANGE PER BODY, not a full spectrum per crystal. Rolling
   * every instance across the whole wheel reads as confetti and makes every
   * world look the same; rolling a narrow band per body and varying within it
   * gives one world cyan-through-violet and another amber-through-rose, so
   * each still reads as one place. See `chromaSpread` in gemFill. */
  var PRISMATIC_ICE = {
    id: "prismatic-ice",
    label: "Prismatic Ice",
    /* In the water cloud where it can be seen, dispersing upward from the
     * mantle beneath it. */
    anchor: ["water-cloud", "icy-mantle"],
    reach: "on",
    depth: [0.10, 0.90],
    arc: [0, 360],
    repeat: [1, 1],
    spacing: "random",
    jitter: 1,
    mirror: false,
    offset: [0, 360],
    element: "shard",
    /* Lies ACROSS the radial direction rather than along it. */
    crosswise: true,
    /* Each body rolls a hue band this many degrees wide, and the crystals
     * vary within it. Wide enough to be visibly chromatic, narrow enough that
     * the set still reads as one material. */
    chromaSpread: 90,
    named: true,
    tiers: 3,
    /* Sparse — roughly a tenth of the rain's count. These are notable
     * formations, not a shower.
     *
     * THE CEILING IS CUT 30%, THE FLOOR IS UNTOUCHED. The largest crystals
     * were reading as slabs rather than as formations; the smallest were
     * fine. Scaling the whole range would have pushed the bottom tier of a
     * `tiers: 3` trait toward sub-pixel, which is the failure STORM_BELTS'
     * feather note records — a shard too small to show its facets is not a
     * smaller crystal, it is a speck. So only the top moves. */
    size: [0.014, 0.021],
    alpha: [0.60, 0.95],
    density: { min: 22, max: 80 },
    spread: [0.6, 1.6],
    tone: "glow",
    requires: ["gaseous"],
    excludes: [],
    tags: ["interior", "resource"]
  };

  /* ---- industry -------------------------------------------------------- */

  /* GAS-MINER PLATFORMS — the canonical gas-giant operation, drawn.
   *
   * Floating at neutral buoyancy in the upper envelope, which is exactly the
   * band the stat card's "where you can work" line describes; the two are
   * saying the same thing in different media. `spacing: "even"` with very low
   * jitter, because TRAIT-SYSTEM.md's rule is that even-and-regular reads as
   * artificial — which is the entire point of a trait meant to look built. */
  var GAS_MINERS = {
    id: "gas-miner-platforms",
    label: "Gas-Miner Platforms",
    /* ANCHORED TO THE TROPOSPHERE, NOT THE CLOUD TOPS.
     *
     * A platform floats at neutral buoyancy, which is genuinely below the
     * cirrus deck — and the cirrus deck is also the brightest, busiest band in
     * the picture, where a handful of small bright dots disappeared entirely.
     * The physically right layer and the legible one turned out to be the same
     * one, which is usually how it goes. */
    anchor: "troposphere",
    reach: "on",
    depth: [0.55, 0.95],
    arc: [0, 360],
    repeat: [5, 14],
    /* RANDOM, NOT EVEN. Even spacing reads as artificial (TRAIT-SYSTEM.md),
     * which is right for a ring system and wrong for an industry that grew
     * wherever the gas was — a perfect ring of platforms looks installed by
     * decree. Close together is fine; on top of each other is not, which is
     * what `minGap` enforces. */
    spacing: "random",
    jitter: 1,
    /* Degrees. Just wider than the largest hull, so two can sit near each
     * other without merging into one unreadable smudge. */
    minGap: 7,
    mirror: false,
    offset: [0, 360],
    /* A CAPSULE, NOT A CHUNK. `chunk` is broken rock — it was the closest
     * available shape and it read as exactly that: rocks, floating in a gas
     * giant. A platform is MANUFACTURED, and what says so is straight sides,
     * hard ends, a specular highlight down one flank and a shadow down the
     * other. `capsule` draws that; `hullFill` supplies the metal, at low
     * saturation and a wide value range, deliberately NOT taking the layer's
     * hue beyond a faint tint — industry does not belong to the planet, and
     * that independence is what makes it read as an intruder.
     *
     * `upright` hangs it along the local vertical, pointing at the body's
     * centre, because that is how anything buoyant sits in a gravity field. */
    element: "capsule",
    upright: true,
    aspect: [0.30, 0.46],
    named: true,
    tiers: 2,
    /* A SYMBOL, BUT A RESTRAINED ONE.
     *
     * These are deliberately out of scale with a body 100,000 km across — a
     * platform is a symbol for an industry, the way a compass rose on a map is
     * not drawn to scale — but the first pass at making them legible
     * overshot and they read as moons. The top of the range is cut hard and
     * the floor dropped further, which also widens the gap between the two:
     * a fleet with a real size spread reads as several different installations
     * rather than as one design stamped out. */
    size: [0.017, 0.028],
    alpha: [0.90, 1.0],
    density: { min: 5, max: 16 },
    /* Half to double the slider's answer, so one world has a token presence
     * and another is heavily industrialised. See `spread` in traitroll. */
    spread: [0.5, 2.0],
    tone: "lighter",
    requires: ["gaseous"],
    excludes: [],
    tags: ["artificial"]
  };

  /* SKIMMER TRACKS — the vessels themselves, diving and climbing.
   *
   * `reach: "inward"` from the cloud tops with a short arrow: the trait is the
   * TRAJECTORY rather than the ship, which is both cheaper to draw and more
   * legible at this scale. A dozen arrows dipping into the envelope says
   * "there is an industry here" far more clearly than a dozen dots would.
   *
   * Requires the platforms, since a skimmer with nowhere to dock is a story
   * the picture cannot tell. */
  var SKIMMER_TRACKS = {
    id: "skimmer-tracks",
    label: "Skimmer Traffic",
    /* STRADDLING THE CLOUD TOPS, which is where the work actually happens.
     *
     * Anchored to the outermost layer and reaching OUTWARD, so the vessels sit
     * in the band between the top of the envelope and the space just above it
     * — dipping in and climbing out, exactly as the stat card's "skimmers can
     * dive the top N km and climb back out" line describes. Drawn inside the
     * cloud deck they were invisible against the brightest, busiest band in
     * the picture; against the dark of space they have somewhere to be seen. */
    /* `anchor: "orbit"`, because it is the ONLY reach that genuinely leaves
     * the body. `reach: "outward"` sounds like it should, and does not — it
     * clamps to the top of the anchor layer (see traitDepth), so skimmers
     * anchored to `upper-cloud` sat at r=0.967, buried in the brightest band
     * in the picture exactly as before.
     *
     * `depth` is then in BODY RADII: 0.98 is a hair under the cloud tops and
     * 1.18 is clear of them, so the fleet straddles the boundary — some
     * vessels dipping in, some climbing out, which is the operation the stat
     * card describes. `body.extent` grows to leave room, so the view frames
     * them. */
    anchor: "orbit",
    reach: "outward",
    /* STRADDLING THE CLOUD TOPS, and reaching a little further IN than out.
     * A skimmer's whole story is the dive: most of the fleet should be inside
     * the envelope at any moment, with a few clear of it and climbing. */
    depth: [0.94, 1.08],
    arc: [0, 360],
    repeat: [8, 18],
    /* Random for the same reason the platforms are — see the note there. A
     * fleet under way is not in formation. */
    spacing: "random",
    jitter: 1,
    minGap: 6,
    mirror: false,
    offset: [0, 360],
    /* THE SAME HULL AS THE PLATFORMS, lying flat instead of hanging.
     *
     * `upright: false` puts the long axis along the direction of travel, which
     * is around the body — a vessel under way rather than something moored.
     * Using one primitive for both is the point: they are the same industry,
     * and the only difference between a platform and a skimmer in a
     * cross-section is which way it is pointing. */
    element: "capsule",
    upright: false,
    aspect: [0.22, 0.34],
    named: true,
    tiers: 2,
    /* Slightly larger than the platforms — a skimmer is a ship rather than a
     * buoy — but held to the same restraint. See the platforms' note. */
    size: [0.022, 0.036],
    alpha: [0.90, 1.0],
    density: { min: 6, max: 14 },
    spread: [0.5, 2.0],
    tone: "lighter",
    requires: ["gaseous"],
    excludes: [],
    tags: ["artificial"]
  };

  CC.Traits.register([
    GREAT_STORM,
    STORM_BELTS,
    VIOLENT_BANDING,
    HELIUM_RAIN,
    DIAMOND_RAIN,
    PRISMATIC_ICE,
    GAS_MINERS,
    SKIMMER_TRACKS
  ]);
})();
