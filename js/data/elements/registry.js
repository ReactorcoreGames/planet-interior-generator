/* Detail element recipes — the registry.
 *
 * Maps a LAYER ROLE to the elements that layer always has. This is the table
 * that keeps `draw/` free of body-type branches: the renderer walks whatever
 * these files say and dispatches on `kind`, never on role or archetype.
 *
 * ONE FILE PER FAMILY, exactly as js/data/archetypes/ is split, and for the
 * same two reasons: the single file passed the 500-line rule in CLAUDE.md when
 * the gaseous roles landed, and "a new family is a data edit" is most literally
 * true when it means one new file and one new script tag. This file holds the
 * API, the shared recipe fragments and the documentation of the data format;
 * `solid.js`, `gaseous.js` and their successors hold the roles and call
 * `register()`.
 *
 * Load order in index.html: this file first, then the families.
 *
 * Layer details are STANDARD EQUIPMENT — "this is what this layer is". Optional
 * additions that make one body different from another are TRAITS and live in
 * data/traits.js. If a layer would look wrong without it, it belongs here. See
 * docs/TRAIT-SYSTEM.md for the distinction.
 *
 * RECIPE FIELDS
 *
 *   kind      which primitive draws it (draw/primitives.js)
 *   count     [at density 0, at density 1] — every element interprets the
 *             Detail density slider in its own terms, which is why this is a
 *             range per element rather than one global multiplier
 *   tiers     how many size classes: a few large, more medium, many small.
 *             THIS FIELD IS MOST OF WHAT MAKES OUTPUT LOOK INTRICATE
 *   size      [min, max] in body-space units, at tier 0 (the largest)
 *   sizeRel   true if `size` is a fraction of the LAYER's thickness instead
 *   depth     [inner, outer] across the layer's own thickness, 0..1. Normalized
 *             to the LAYER, never to a measured radius, so an element rides
 *             with its layer when a neighbour changes thickness (PROGRESS D12)
 *   alpha     [min, max] opacity before the global Element opacity multiplier
 *   texture   true if the Texture strength slider scales it (grain, stipple)
 *   flow      true if the Flow indicators dropdown governs it (arrows, lines)
 *   arc       [min, max] angular extent in degrees, for band-like elements
 *   tone      how the element's colour derives from its layer's band colour:
 *             "lighter" | "darker" | "shift" | "glow"
 *
 * BAND FIELDS — for `gradient-band`, the concentric-shell primitive
 *
 *   bandWidth  how thick each band is. For an ALTERNATING comb this is a
 *              fraction of the band's own SPACING, not of the layer: see
 *              gen/elemgen.js's buildBands for why, and for the failure that
 *              taught it. For a plain set it is a fraction of the layer
 *   alternate  ["lighter", "darker"] — consecutive bands cycle through these
 *              tones. This is the whole of gas-giant banding
 *
 * VEIN FIELDS — for `vein`
 *
 *   lean       how far the stroke wanders off the radial, 0..1ish. Defaults to
 *              0.9, which is a crust fracture finding its way through rock.
 *              A star's radiative streaks want ~0.06: a streak that wanders is
 *              a squiggle
 *   bulk       filled tapering lode instead of a stroked hairline
 *   bright     inverts the lode's polarity — a reflective seam, not a dark one
 *   chaos      per-instance scatter of length and girth, independently
 *
 * FLOW FIELDS — for `arrow` and `flow-line`
 *
 *   zonal      [lo, hi] — the element travels AROUND the body rather than
 *              through it, with this much lean
 *   bands      how many radial belts to split the layer into, flipping the
 *              flow direction between adjacent ones. Counter-rotating jets
 *
 * COUNTS ARE A FLOOR, NOT A TARGET. The figures in docs/celestials/*.md were
 * authored against much thinner layers than the stylized proportions gave us
 * (PROGRESS.md D5, and the open question at the end of that file). A count that
 * looked dense in a hairline crust reads as sparse in one seven times thicker,
 * so these run well above the documented ranges. Sparse is the failure mode. */

var CC = CC || {};

CC.Elements = (function () {
  "use strict";

  var ROLES = {};

  /* ---- shared recipe fragments ---------------------------------------- */

  /* Grain speckle: the base texture of any solid layer. Three tiers of dots,
   * heavily weighted to the smallest, which is what reads as material rather
   * than as scattered confetti. Every solid layer gets some.
   *
   * Exported, because both family files use it and there must be exactly one
   * definition of what "the base texture of a layer" means. */
  function grain(lo, hi, size) {
    return {
      kind: "speckle",
      count: [lo, hi],
      tiers: 3,
      size: size || [0.010, 0.020],
      depth: [0.03, 0.97],
      alpha: [0.27, 0.67],
      texture: true,
      tone: "shift"
    };
  }

  /* ---- registration ---------------------------------------------------- */

  /* Families call this at load time with a map of role -> recipe table. Merged
   * rather than assigned, so two families may be registered in any order and
   * neither can silently drop the other. */
  function register(table) {
    for (var role in table) {
      if (Object.prototype.hasOwnProperty.call(table, role)) {
        ROLES[role] = table[role];
      }
    }
  }

  /* Surface terrain draws as its own pass rather than as a listed element: it
   * is a boundary displacement plus a fill, not a scattered instance, and both
   * the crust and the ocean consume it. Declared alongside the elements so the
   * table stays the one place that says what a role has. */
  function reliefFor(role) {
    var r = ROLES[role];
    return (r && r.relief) || null;
  }

  function elementsFor(role) {
    var r = ROLES[role];
    return (r && r.elements) || [];
  }

  function roles() { return Object.keys(ROLES); }

  return {
    register: register,
    grain: grain,
    elementsFor: elementsFor,
    reliefFor: reliefFor,
    roles: roles,
    get ROLES() { return ROLES; }
  };
})();
