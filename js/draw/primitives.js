/* The element primitive library — the drawing vocabulary.
 *
 * One function per primitive, all with the same signature:
 *
 *     draw(ctx, view, el, style)
 *
 * `el` is a generated element in normalized body space; `style` supplies the
 * colour. THIS FILE CONTAINS NO ROLE NAMES AND NO ARCHETYPE NAMES. It draws
 * whatever `el.kind` says and knows nothing about planets, crusts or oceans —
 * dispatch happens through the KINDS table at the bottom. If a body type ever
 * needs a branch in here, the design has gone wrong and the fix belongs in
 * data/elements.js.
 *
 * Pixels enter only through `view`. Every position is view.at(), every length
 * view.px(), every stroke view.lw(). That is what makes the same body the same
 * picture at 240px and at 4320px.
 *
 * SPLIT ACROSS FILES, following the pattern data/traits/, data/elements/,
 * data/archetypes/ and gen/stats/ already use — a registry plus one file per
 * group. The single file reached 1373 lines, well past the 500-line rule, and
 * the seam it wanted was obvious: the primitives below are what a body is made
 * of INSIDE its silhouette, and everything in primitives/orbital-*.js is either
 * beyond the body or belongs to a specific family.
 *
 * THE DISPATCH TABLE IS OWNED HERE AND EXTENDED BY THE OTHERS. `register()`
 * adds kinds to `KINDS`, so a new group of primitives is a new file plus a
 * script tag, with nothing to edit here. That is the same promise the trait
 * registry makes: adding a family should add no code to an existing file.
 *
 * Load order: this file first, then anything that registers into it.
 *
 * AFTER THE SPLIT (Session AL) the vein family is in draw/primitives/vein.js
 * and the flow marks in draw/primitives/flow.js. Both load straight after this
 * file and add theirs through `register`. */
var CC = CC || {};

CC.Primitives = (function () {
  "use strict";

  var TAU = CC.Math.TAU;

  /* ---- speckle ---------------------------------------------------------- */

  /* Scattered dots — grain, dust, stipple. The workhorse: this is where most
   * of the element count goes, and it is what turns a flat band into material.
   *
   * Drawn as one path per call by the batch renderer in draw/details.js, so a
   * thousand dots cost one fill rather than a thousand.
   *
   * The size floor is the important part. A grain is authored at a few
   * thousandths of the body radius, which at preview size is a fraction of a
   * pixel — a sub-pixel arc renders as nothing at all, which is exactly how
   * the first pass came out invisible. Grains are floored at a real pixel so
   * they stay material at any resolution. */
  function speckle(ctx, view, el, style) {
    var p = view.at(el.radius, el.angle);
    var r = Math.max(0.55, view.px(el.size));
    ctx.moveTo(p.x + r, p.y);
    ctx.arc(p.x, p.y, r, 0, TAU);
  }

  /* ---- blob ------------------------------------------------------------- */

  /* An irregular filled shape — deposits, pockets, inclusions. Built as a
   * closed loop of radii wobbled around a centre, so no two are alike. */
  function blob(ctx, view, el, style) {
    var c = view.at(el.radius, el.angle);
    var base = view.px(el.size);
    var lobes = el.lobes || 6;
    var rough = el.rough === undefined ? 0.3 : el.rough;
    var squash = el.squash === undefined ? 1 : el.squash;

    ctx.beginPath();
    for (var i = 0; i <= lobes; i++) {
      var t = (i / lobes) * TAU;
      /* A cheap deterministic wobble from the element's own seed — no RNG
       * call at draw time, so redrawing never changes the shape. */
      var w = 1 + Math.sin(t * 2.3 + el.seed * 31.7) * rough
                + Math.sin(t * 3.7 + el.seed * 11.3) * rough * 0.5;
      var rr = base * w;
      var x = c.x + Math.cos(t) * rr;
      var y = c.y + Math.sin(t) * rr * squash;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = style;
    ctx.fill();
  }

  /* ---- arc-band --------------------------------------------------------- */

  /* An angular band following the layer's curvature — strata, current arcs,
   * cloud belts, swirl bands. Stroked rather than filled, with a round cap, so
   * it reads as a soft streak rather than a hard segment. */
  function arcBand(ctx, view, el, style) {
    var span = el.arc || 0.6;
    var steps = Math.max(6, Math.round(span * 14));

    /* A DEPTH FILL — an arc-band standing in for a crater.
     *
     * The band is a thick round-capped stroke, so a concentric gradient across
     * its width darkens the middle of the stroke and leaves its edges the
     * colour of the surrounding rock: a pit with a shadowed floor and a rim
     * that meets the ground. Same {rim, mid, floor} triple the wedge takes. */
    if (style && style.rim) {
      var w = Math.max(0.5, view.px(el.thickness || el.size));
      /* Scaled by the body's form at this bearing: a radial gradient cannot
       * bend, so it is matched to the warp locally (draw/canvas.js). */
      var fk = view.formAt ? view.formAt(el.radius, el.angle) : 1;
      var rc = view.px(el.radius) * fk;
      var g0 = Math.max(0, rc - w * 0.5);
      var g1 = rc + w * 0.5;
      if (g1 - g0 > 0.5) {
        var g = ctx.createRadialGradient(view.cx, view.cy, g0,
                                         view.cx, view.cy, g1);
        /* Darkest just inside the middle — the floor of the pit — easing back
         * to the rim colour at both edges. */
        g.addColorStop(0, style.rim);
        g.addColorStop(0.38, style.floor);
        g.addColorStop(0.62, style.mid);
        g.addColorStop(1, style.rim);
        style = g;
      } else {
        style = style.floor;
      }
    }

    ctx.strokeStyle = style;
    ctx.lineWidth = Math.max(0.5, view.px(el.thickness || el.size));
    ctx.lineCap = "round";
    ctx.beginPath();
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var a = el.angle + (t - 0.5) * span;
      /* A slight radial drift along the arc keeps it from looking like a
       * perfect circle segment, which would read as mechanical. */
      var r = el.radius + Math.sin(t * Math.PI) * el.size * 0.18
                        * (el.seed > 0.5 ? 1 : -1);
      var p = view.at(r, a);
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  /* ---- gradient-band ---------------------------------------------------- */

  /* A full concentric band with soft edges — atmosphere sub-bands, compression
   * rings, the ocean's depth gradient. Drawn as a radial gradient that fades
   * at both edges, so it layers over the band fill without a visible seam. */
  function gradientBand(ctx, view, el, style) {
    var half = Math.max(0.002, el.size);
    var r0 = Math.max(0, el.radius - half);
    var r1 = el.radius + half;

    var g = ctx.createRadialGradient(view.cx, view.cy, view.px(r0),
                                     view.cx, view.cy, view.px(r1));
    g.addColorStop(0, style.edge);
    g.addColorStop(0.5, style.mid);
    g.addColorStop(1, style.edge);

    ctx.beginPath();
    ctx.arc(view.cx, view.cy, view.px(r1), 0, TAU);
    ctx.arc(view.cx, view.cy, view.px(r0), 0, TAU, true);
    ctx.fillStyle = g;
    ctx.fill("evenodd");
  }

  /* ---- cell ------------------------------------------------------------- */

  /* A convection cell: a closed circulation loop.
   *
   * Drawn as an ellipse elongated along the layer (because convection cells
   * are wider than they are tall in a thin shell) with a curl inside it
   * indicating which way it turns. The curl is what makes the layer read as
   * genuinely circulating rather than as a field of rings. */
  /* A convection cell reads as CIRCULATION, which means an open spiral — not
   * a closed filled ellipse.
   *
   * The first version drew a stroked ellipse with a faint fill and an inner
   * curl. Every cell came out as a small filled oval lying the same way, and a
   * mantle full of them read as bubble wrap rather than as a moving layer. The
   * fill is gone, the outline is now a broken arc rather than a closed loop,
   * and the spiral is the primary shape instead of a decoration inside one. */
  function cell(ctx, view, el, style) {
    var c = view.at(el.radius, el.angle);
    var rx = view.px(el.size);
    var ry = view.px(el.size * 0.66);
    var spin = el.spin || 1;

    ctx.save();
    ctx.translate(c.x, c.y);
    /* Lie along the body's curvature — the cell is wider than it is deep in a
     * shell — plus a per-cell tilt so a ring of them is not uniform. */
    ctx.rotate(el.angle + (el.seed - 0.5) * 0.9);

    ctx.strokeStyle = style.line;
    ctx.lineCap = "round";
    ctx.lineWidth = view.lw(el.tier === 0 ? 1.6 : el.tier === 1 ? 1.2 : 0.9);

    /* An open spiral: about one and a half turns, winding inward. Reads as
     * rotation because it does not close, and the direction is legible from
     * which way it winds. */
    var turns = 1.55;
    var steps = el.tier <= 1 ? 30 : 18;
    ctx.beginPath();
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var ang = spin * (t * turns * TAU) + el.seed * TAU;
      var rr = 1 - t * 0.78;
      var x = Math.cos(ang) * rx * rr;
      var y = Math.sin(ang) * ry * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.restore();
  }

  /* Dispatch table. draw/details.js looks a kind up here; nothing anywhere
   * switches on a layer role.
   *
   * Seeded with the primitives defined above; the files loaded after this one
   * add theirs through `register`. */
  var KINDS = {
    "speckle": speckle,
    "blob": blob,
    "arc-band": arcBand,
    "gradient-band": gradientBand,
    "cell": cell
  };

  /* Add drawing kinds to the dispatch table.
   *
   * Takes a {kind: fn} map rather than one pair at a time, so a file
   * registering a group of related primitives does it in one statement and
   * the kind STRINGS all sit together where they can be read at a glance.
   *
   * A duplicate kind THROWS rather than silently winning. Two files claiming
   * the same name is a mistake in every case — a copied block, a rename that
   * missed one — and the failure it would otherwise produce is the worst kind:
   * the body still renders, with one primitive quietly drawn as another,
   * reported by nothing. The same reasoning as D98. */
  function register(kinds) {
    for (var k in kinds) {
      if (!Object.prototype.hasOwnProperty.call(kinds, k)) continue;
      if (KINDS[k]) throw new Error("primitive kind already registered: " + k);
      KINDS[k] = kinds[k];
      API[camel(k)] = kinds[k];
    }
  }

  /* "ring-band" -> "ringBand", so every primitive is reachable by name on the
   * namespace exactly as the ones defined here are. Tests and tools call these
   * directly; going through the kind string instead would make a registered
   * primitive a second-class citizen of the API for no reason. */
  function camel(k) {
    return k.replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); });
  }

  /* A STYLE FOR A REGISTERED KIND that wants more than one colour string:
   * `fn(colour, el, alpha)` returns whatever object the primitive reads.
   * draw/details.js styleFor consults it after its own cases, so a family's
   * primitive file can bring its style with it, as it brings its builder. */
  var STYLES = {};
  function registerStyle(kind, fn) {
    if (STYLES[kind]) throw new Error("primitive style already registered: " + kind);
    STYLES[kind] = fn;
  }

  var API = {
    KINDS: KINDS,
    STYLES: STYLES,
    register: register,
    registerStyle: registerStyle,
    speckle: speckle,
    blob: blob,
    arcBand: arcBand,
    gradientBand: gradientBand,
    cell: cell
  };

  return API;
})();
