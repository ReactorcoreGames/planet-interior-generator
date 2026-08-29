/* Stars — the MAGNETIC traits ON THE SURFACE: starspots.
 *
 * `starspot-clusters` and `heavy-spotting`. Split out of stellar-magnetic.js,
 * which carries the family's shared header and the traits that stand OFF the
 * limb — see the note there for why the cut is by where a mark sits rather
 * than by what causes it. Both files are the same underlying fact, the star's
 * magnetic field, and both scale off `starActivity` through `driver`.
 *
 * WHAT IS DIFFERENT ABOUT A SPOT, and why it is worth its own file: it is the
 * only mark in this family that is DARKER than the layer it sits on. Every
 * other stellar mark is brighter, because every other one is material catching
 * or emitting light. A spot is the absence of light, drawn on an opaque
 * surface — so it is the one place in the family where `tone: "darker"` works
 * at all, and the reason it works is that the photosphere is not composited
 * with `screen` the way the corona is (see `coronal-holes`, which had to
 * become an absence for exactly that reason).
 *
 * The registry must load before this file. */
var CC = CC || {};

(function () {
  "use strict";

  /* STARSPOT CLUSTERS — cool patches on the photosphere, and the one trait in
   * the family that is DARKER than what it sits on.
   *
   * That polarity is deliberate and it is what makes them legible. Every other
   * mark on a star is brighter than its layer, because everything else is
   * material catching or emitting light; a spot is the absence of light, and
   * being the only dark thing in the picture is most of why it reads.
   *
   * CLUSTERED, NOT SCATTERED. Real spots come in groups — active regions —
   * and a scatter of individual dots would read as damage to the render.
   * `spacing: "clustered"` is what TRAIT-SYSTEM.md means by clustered-and-
   * high-jitter reading as natural.
   *
   * SIZE IS A FACT ABOUT WHICH STAR THIS IS. The spec is explicit that a
   * dwarf's spots are proportionally much larger than a main-sequence star's,
   * and that is carried by `sizeRel` against the photosphere plus the `spotted`
   * tag's own bias below — one trait, two very different pictures. */
  var STARSPOT_CLUSTERS = {
    id: "starspot-clusters",
    label: "Starspot Clusters",
    anchor: "photosphere",
    reach: "on",
    /* HIGH IN THE LAYER. The photosphere is a thin skin with a thousand
     * granules in it; a spot placed at the layer's inner edge is drawn under
     * all of them and reads as a smudge. A spot is a feature OF the visible
     * surface, so it sits at the top of it. */
    depth: [0.55, 0.95],
    arc: [0, 360],
    repeat: [2, 6],
    spacing: "clustered",
    jitter: 0.8,
    mirror: false,
    offset: [0, 360],
    element: "starspot",
    tiers: 3,
    /* A fraction of the body radius. Large enough to be unmistakable at
     * preview size — D82's lesson, that a symbol has to be readable to do its
     * job, and a spot drawn at true scale on a body this size would be a
     * pixel. */
    /* Sized for the surviving tier, as the prominences are — see the note
     * there. A spot has to be unmistakable at preview size (D82: a symbol is
     * not a scale model, and a true-scale sunspot on a body this size is a
     * pixel).
     *
     * A MUCH WIDER BAND THAN THE FIRST VERSION'S 0.070-0.150, which is the
     * user's ask: "potential for a much crazier range both in terms of amount
     * min-max and size min-max, for a much larger range of variety". The point
     * is not bigger spots — it is that one star should have three enormous
     * ones and another forty small ones, which is a fact about the SPREAD and
     * not about the average.
     *
     * The floor is held where it is rather than dropped further. Below about
     * 0.05 of the body radius, and after the tier factor takes its 0.52x
     * (D122), a spot stops being distinguishable from the granulation the
     * photosphere already draws — which is D76's trap, a mark that is a
     * quieter example of what its layer does anyway. The ceiling is where the
     * variety comes from. */
    size: [0.055, 0.270],
    squash: 0.5,
    alpha: [0.60, 1.0],
    /* WIDENED AT BOTH ENDS, and the top of it is what the word "crazier"
     * buys: forty small spots is a genuinely different picture from eighteen.
     * The floor drops to 2 so a nearly-clean star is also reachable. */
    density: { min: 2, max: 44 },
    /* THE PER-BODY LEVER, AND IT IS DOING MOST OF THE WORK (D85). The slider
     * says how much texture the user wants; this says how spotty THIS star is,
     * and a 0.35-2.1 band is what makes two stars at identical settings look
     * like different stars rather than the same one twice. */
    spread: [0.35, 2.1],
    /* A quiet star has a couple of spots; a violent one is covered. */
    driver: { param: "starActivity", at0: 0.25, at1: 1.7 },
    minGap: 5,
    tone: "darker",
    requires: ["stellar"],
    excludes: [],
    tags: ["stellar", "magnetic"]
  };

  /* HEAVY SPOTTING — the dwarf's signature, as a separate trait rather than as
   * a different number on the one above.
   *
   * The spec removed `heavy-starspots` as a trait and folded it into the
   * activity axis, and that is honoured: this does not add an axis. What it
   * adds is the SCALE difference the spec insists on — "starspots should be
   * proportionally much larger here than on a main-sequence star" — which is a
   * statement about a kind of star rather than about how active it is, and
   * therefore is not the same fact as `starActivity`.
   *
   * `requires: ["spotted"]` gates it to the archetypes that carry the tag, so
   * it is offered on a dwarf and not on a main star, without either trait
   * naming an archetype. */
  var HEAVY_SPOTTING = {
    id: "heavy-spotting",
    label: "Heavy Spotting",
    anchor: "photosphere",
    reach: "on",
    depth: [0.55, 0.95],
    arc: [0, 360],
    repeat: [2, 5],
    spacing: "clustered",
    jitter: 0.9,
    mirror: false,
    offset: [0, 360],
    element: "starspot",
    tiers: 2,
    /* ROUGHLY DOUBLE the ordinary trait's, which is the entire content of the
     * word "heavy" and the reason this exists at all. */
    /* Roughly double the ordinary trait's, on the same surviving-tier
     * reasoning — which is the entire content of the word "heavy". Widened
     * with it, and kept clear of the ordinary trait at the BOTTOM: if the two
     * bands overlapped heavily there would be no picture "heavy spotting"
     * could produce that `starspot-clusters` could not, and the trait would
     * stop earning its place. */
    size: [0.130, 0.480],
    squash: 0.5,
    alpha: [0.60, 1.0],
    /* Fewer than the ordinary trait by design — these are the enormous ones.
     * The top end is raised anyway so a dwarf can be genuinely mottled. */
    density: { min: 2, max: 16 },
    spread: [0.45, 1.8],
    driver: { param: "starActivity", at0: 0.45, at1: 1.5 },
    minGap: 12,
    tone: "darker",
    requires: ["stellar", "spotted"],
    /* Two spot fields on one photosphere is a muddle rather than a busier
     * star — the large one already implies the small. */
    excludes: ["starspot-clusters"],
    tags: ["stellar", "magnetic"]
  };

  CC.Traits.register([
    STARSPOT_CLUSTERS,
    HEAVY_SPOTTING
  ]);
})();
