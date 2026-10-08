/* Diffuse bodies — detail recipes for the nebula.
 *
 * See js/data/elements/registry.js for what every field means,
 * js/gen/diffuse.js for the placement fields (`reach`, `follow`, `lattice`)
 * and docs/celestials/diffuse-bodies.md for the spec.
 *
 * THE HIGHEST ELEMENT BUDGET IN THE GENERATOR, and almost none of it has an
 * edge. Every mark comes from draw/primitives/diffuse.js and dissolves rather
 * than ends (D156). Every region carries the same body — a `cloud-field`
 * reading one density field — and what separates the regions is the KIND of
 * mark laid over it, not its brightness (D76):
 *
 *   halo           threads and motes — almost nothing, drawn finely
 *   sparse-region  threads and dust, a little gas
 *   dense-region   BILLOWS — heaped cloud — with filaments draped over them
 *                  and dark lanes lying across both
 *   core-region    KNOTS lit on one side, bright rims, and the stars being
 *                  born inside them
 *
 * PLACEMENT IS BY REGION, NOT BY BAND: every mark here is placed across its
 * region's whole outline by js/gen/diffuse.js, weighted toward thick gas, so
 * `depth` is not used. `reach` is the radial share of the region instead.
 *
 * SIZES ARE AUTHORED FOR THE TIER THAT SURVIVES (D122): Size tiers defaults
 * to 3, which drops tier 0, so the largest instance drawn is 0.52x the figure
 * here — and a recipe declaring `tiers: 2` keeps the two SMALLEST tiers, so
 * its largest is 0.27x. The lanes were tiny black commas until that was
 * counted. Counts run above the spec's ranges, which were a floor (registry.js).
 *
 * The registry must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  /* ---- LUMINOSITY SOURCE ------------------------------------------------
   *
   * Each recipe's answer to the one slider (js/gen/diffuse.js `dial`; the
   * full statement is in js/data/archetypes/diffuse-nebula.js). Curves over
   * 0 dark / 0.35 reflection / 1 emission. */
  var L = "luminosity";
  var DIAL = {
    /* The gas itself: blocks light when dark, is lit from one flank when
     * reflecting, gives off its own when emitting. */
    cloud:  { param: L, emit:   [[0, 0.06], [0.35, 0.60], [1, 1]],
                        absorb: [[0, 1.00], [0.35, 0.32], [0.7, 0.06], [1, 0]],
                        side:   [[0, 0.70], [0.35, 1.00], [0.75, 0.20], [1, 0]] },
    /* Glowing gas marks fade with the glow, but never to nothing: even a
     * dark cloud catches a little light on its billows. */
    glow:   { param: L, alpha: [[0, 0.30], [0.35, 0.75], [1, 1]] },
    dust:   { param: L, alpha: [[0, 0.35], [0.35, 0.70], [1, 1]] },
    lane:   { param: L, alpha: [[0, 0.40], [0.35, 0.85], [1, 1]] },
    /* A lit edge is lit by SOMETHING — outside starlight on a dark cloud,
     * the nebula's own stars on an emission one — so it never vanishes. */
    rim:    { param: L, alpha: [[0, 0.35], [0.35, 0.85], [1, 1]],
                        count: [[0, 0.5], [0.35, 1]] },
    /* NO INTERNAL LIGHT SOURCES BELOW THE MIDDLE — the spec's statement. A
     * reflection nebula is lit from outside, so the stars are not inside it.
     * Larger as well as more numerous toward emission: they are what is
     * lighting the gas. */
    stars:  { param: L, count: [[0, 0], [0.45, 0], [0.7, 0.7], [1, 1.2]],
                        size:  [[0.45, 0.7], [1, 1.35]] }
  };

  /* The region's body — see buildCloudField. */
  /* SCREENED, so the gas only ever adds light to what is behind it — the
   * same reason the atmosphere is (draw/scene.js) — and in the `bright`
   * tone, which lifts value without bleaching the hue. */
  function cloud(lattice, alpha, fade) {
    return { kind: "cloud-field", count: [1, 1], lattice: lattice,
             alpha: alpha, tone: "bright", blend: "screen", fade: fade,
             dial: DIAL.cloud };
  }

  /* Motes and dust: the finest tier of the density thesis, emitted as
   * speckle so thousands of them batch into a handful of fills. They follow
   * the gas only loosely — dust is everywhere, thickest where the gas is. */
  function motes(lo, hi, alpha, tone) {
    return {
      kind: "mote",
      count: [lo, hi],
      tiers: 3,
      size: [0.0045, 0.0095],
      follow: 0.6,
      /* Filled 24 at a time: one path of two thousand dots costs seconds
       * (draw/details.js `chunk`). */
      chunk: 24,
      dial: DIAL.dust,
      alpha: alpha,
      texture: true,
      tone: tone || "lighter"
    };
  }

  CC.Elements.register({

    halo: {
      elements: [
        cloud(24, [0.30, 0.45]),
        /* The wisps: long, faint, draped round the cloud — out where the gas
         * is thin, so `reach` keeps them to the outer half. */
        { kind: "filament", count: [30, 80], tiers: 3, size: [0.70, 1.30],
          reach: [0.45, 1.0], follow: 0.4, alpha: [0.12, 0.28], tone: "lighter",
          dial: DIAL.glow },
        motes(600, 1500, [0.16, 0.40])
      ]
    },

    "sparse-region": {
      elements: [
        cloud(28, [0.40, 0.55]),
        { kind: "puff", count: [40, 96], tiers: 3, size: [0.10, 0.24],
          follow: 1.2, alpha: [0.08, 0.20], tone: "lighter",
          dial: DIAL.glow },
        { kind: "filament", count: [40, 100], tiers: 3, size: [0.60, 1.10],
          follow: 0.8, alpha: [0.14, 0.30], tone: "lighter",
          dial: DIAL.glow },
        motes(800, 2000, [0.20, 0.44], "lighter")
      ]
    },

    "dense-region": {
      elements: [
        cloud(32, [0.50, 0.70]),
        /* THE VISIBLE BULK. Heaped, lumpy cloud — the spec's "billowing
         * blobs" — where the gas is thickest. */
        { kind: "billow", count: [40, 100], tiers: 3, size: [0.12, 0.28],
          follow: 2.0, alpha: [0.16, 0.34], tone: "lighter",
          dial: DIAL.glow },
        { kind: "puff", count: [60, 140], tiers: 3, size: [0.07, 0.17],
          follow: 1.4, alpha: [0.12, 0.28], tone: "shift",
          dial: DIAL.glow },
        { kind: "filament", count: [50, 120], tiers: 3, size: [0.45, 0.90],
          follow: 1.0, alpha: [0.18, 0.40], tone: "lighter",
          dial: DIAL.glow },
        /* DARK LANES — obscuring dust lying ACROSS the bright gas, so they
         * seek the thick field: a lane over a void obscures nothing. */
        { kind: "lane", count: [5, 14], tiers: 2, size: [2.6, 4.4],
          follow: 1.6, alpha: [0.40, 0.65], tone: "darker",
          dial: DIAL.lane },
        motes(800, 2000, [0.20, 0.46], "lighter")
      ]
    },

    "core-region": {
      elements: [
        cloud(24, [0.60, 0.80], 0.75),
        { kind: "puff", count: [40, 90], tiers: 3, size: [0.07, 0.16],
          follow: 1.6, alpha: [0.18, 0.38], tone: "glow",
          dial: DIAL.glow },
        /* Dense knots, lit on the side that faces the middle — in the
         * peaks of the field, where the gas is thick enough to clump. */
        { kind: "knot", count: [10, 26], tiers: 3, size: [0.10, 0.20],
          follow: 2.4, alpha: [0.55, 0.85], tone: "lighter",
          dial: DIAL.rim },
        /* Bright rims on their own — the lit edge of a clump too dark to
         * see. */
        { kind: "rim", count: [8, 20], tiers: 3, size: [0.10, 0.22],
          follow: 1.8, alpha: [0.50, 0.80], tone: "glow",
          dial: DIAL.rim },
        { kind: "lane", count: [2, 5], tiers: 2, size: [1.6, 2.6],
          follow: 2.0, alpha: [0.40, 0.65], tone: "darker",
          dial: DIAL.lane },
        /* PROTOSTARS — the spec's optional innermost "layer" is points, and
         * as a band 0-0.30 it would collide with a core-region authored at
         * 0.10-0.34. They are elements of the dense heart instead, and
         * Luminosity source decides whether they exist. */
        { kind: "protostar", count: [3, 15], tiers: 2, size: [0.07, 0.13],
          follow: 2.0, alpha: [0.85, 1.0], tone: "glow",
          dial: DIAL.stars },
        motes(500, 1300, [0.26, 0.56], "lighter")
      ]
    },

    /* ---- THE SHELL STACK ------------------------------------------------
     *
     * Empty in the middle. Every mark here is placed in its layer's OWN
     * annulus (`band`) rather than across its disc, and the shell's knots and
     * rims face the CENTRE (`centre`), because a shell is lit by the dead star
     * inside it — the one place in the family where facing the middle is the
     * truth rather than a ring artefact (D223). */

    /* The leading edge of the blast: thin, wavy, fading outward. */
    "outer-shock": {
      elements: [
        { kind: "cloud-field", count: [1, 1], lattice: 40, band: true,
          alpha: [0.16, 0.26], tone: "bright", blend: "screen", fade: 0.2,
          dial: DIAL.cloud },
        { kind: "filament", count: [40, 110], tiers: 3, size: [0.50, 1.00],
          band: true, follow: 0.6, alpha: [0.16, 0.34], tone: "lighter",
          dial: DIAL.glow },
        motes(300, 800, [0.16, 0.36])
      ]
    },

    /* THE BRIGHT RING — the material itself. Its form's own `elementScale`
     * (the archetype) tips the mix: knotted and smooth for a planetary
     * nebula, a web of filaments for a supernova remnant. */
    shell: {
      elements: [
        { kind: "cloud-field", count: [1, 1], lattice: 40, band: true,
          alpha: [0.60, 0.80], tone: "bright", blend: "screen", fade: 0.14,
          dial: DIAL.cloud },
        { kind: "billow", count: [30, 70], tiers: 3, size: [0.10, 0.20],
          band: true, follow: 1.8, alpha: [0.14, 0.30], tone: "lighter",
          dial: DIAL.glow },
        { kind: "filament", count: [50, 130], tiers: 3, size: [0.30, 0.70],
          band: true, follow: 1.0, alpha: [0.20, 0.42], tone: "lighter",
          dial: DIAL.glow },
        /* Cometary knots: dense clumps lit on the side facing the star. */
        { kind: "knot", count: [16, 40], tiers: 3, size: [0.06, 0.13],
          band: true, centre: true, follow: 2.0, alpha: [0.50, 0.80],
          tone: "lighter", dial: DIAL.rim },
        { kind: "rim", count: [10, 26], tiers: 3, size: [0.08, 0.16],
          band: true, centre: true, follow: 1.6, alpha: [0.45, 0.75],
          tone: "glow", dial: DIAL.rim },
        motes(700, 1800, [0.22, 0.48])
      ]
    },

    /* SWEPT EMPTY. A faint glow of the hottest, thinnest gas and a few
     * threads — enough that the middle reads as a place, not a hole. */
    cavity: {
      elements: [
        { kind: "cloud-field", count: [1, 1], lattice: 20,
          alpha: [0.14, 0.24], tone: "bright", blend: "screen", fade: 0.7,
          dial: DIAL.cloud },
        { kind: "filament", count: [8, 22], tiers: 3, size: [0.30, 0.60],
          follow: 0.5, alpha: [0.08, 0.18], tone: "lighter", dial: DIAL.glow },
        motes(120, 320, [0.12, 0.28])
      ]
    },

    /* The dead star: one point. A white dwarf on a planetary nebula; on a
     * supernova remnant the same point fires the pulsar's beams (the
     * archetype's `beams`). Not dialled: it shines whatever the gas does.
     * `tiers: 1` draws at the smallest tier, 0.14x (D224). */
    "remnant-star": {
      elements: [
        /* AT THE CENTRE, exactly (`reach: [0, 0]`): scattered anywhere in
         * the band's small disc it sat visibly off-centre. */
        { kind: "protostar", count: [1, 1], tiers: 1, size: [0.30, 0.36],
          reach: [0, 0], alpha: [1, 1], tone: "glow",
          /* A trace only: a pulsar's beams already say where the source is,
           * and a white dwarf reads as a soft point. At full strength the
           * spikes were the first thing anyone saw — a hard X every time. */
          spikes: 0.3 }
      ]
    }
  });
})();
