/* Stellar primitives — the marks on and under the photosphere: the starspot and
 * the convection cell.
 *
 * Split out of draw/primitives/stellar.js, which passed the 500-line rule.
 * Registered into CC.Primitives; draw/primitives.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  /* ---- starspot ---------------------------------------------------------- */

  /* A DARK UMBRA INSIDE A STREAKED PENUMBRA.
   *
   * The two-part structure is the whole point. A single dark ellipse on the
   * photosphere is a granule drawn in the wrong colour — which is precisely
   * the mark the layer already makes hundreds of — and it reads as a hole in
   * the render rather than as a feature of the star.
   *
   * What a real spot has that a granule does not:
   *   - a genuinely BLACK centre, far darker than any granule lane
   *   - a lighter surround, at maybe half the umbra's darkness
   *   - RADIAL FILAMENTS through that surround, which are field lines splaying
   *     out of the spot and are the detail that says "magnetic" rather than
   *     "shadow"
   *
   * `el.squash` flattens it along the limb, because a spot is a patch on a
   * curved surface seen in cross-section and a perfect circle would read as a
   * sphere sitting on the star.
   *
   * SIZE IS A FACT ABOUT THE STAR. A dwarf's spots are proportionally enormous
   * — the spec insists on it — and a main-sequence star's are small. That is
   * carried by the trait's authored size rather than by anything here, which
   * is what lets one primitive serve both. */
  function starspot(ctx, view, el, style) {
    var rad = el.size;
    var squash = el.squash === undefined ? 0.55 : el.squash;
    var c = view.at(el.radius, el.angle);

    var rx = view.px(rad);
    var ry = rx * squash;
    if (rx < 0.35) return;

    /* The spot lies along the local tangent, so it is rotated to the body's
     * own frame rather than to the canvas. Without this every spot on the
     * left of the disc would be flattened the wrong way. */
    var rot = el.angle;

    var umbra = (style && style.umbra) || style;
    var penumbra = (style && style.penumbra) || style;
    var filament = (style && style.filament) || penumbra;

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(rot);

    /* The penumbra: the full extent, at partial darkness. */
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = penumbra;
    ctx.fill();

    /* THE FILAMENTS. Short radial strokes crossing the penumbra, between the
     * umbra's edge and the spot's rim. Cheap — a dozen lines — and they are
     * what stops the spot being two nested ellipses.
     *
     * Count scales with size so a large spot is more detailed rather than the
     * same drawing enlarged, which is the same principle the tier system
     * applies across instances. */
    var n = Math.max(6, Math.min(26, Math.round(rx * 0.9)));
    ctx.strokeStyle = filament;
    ctx.lineWidth = view.lw(0.7);
    for (var i = 0; i < n; i++) {
      /* Irregularly spaced, seeded off the element so it is stable under
       * re-render — the determinism rule the whole generator keeps. */
      var jitter = ((i * 7 + (el.seed || 0) * 31) % 1);
      var a = (i / n) * Math.PI * 2 + jitter * 0.22;
      var ca = Math.cos(a), sa = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(ca * rx * 0.42, sa * ry * 0.42);
      ctx.lineTo(ca * rx * (0.86 + jitter * 0.14),
                 sa * ry * (0.86 + jitter * 0.14));
      ctx.stroke();
    }

    /* The umbra: a much smaller, much darker core. Around 45% of the radius,
     * which is roughly the real proportion and, more usefully, leaves the
     * penumbra enough room to be legible at preview size. */
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.46, ry * 0.46, 0, 0, Math.PI * 2);
    ctx.fillStyle = umbra;
    ctx.fill();

    ctx.restore();
  }

  /* ---- convection-cell --------------------------------------------------- */

  /* A CLOSED CIRCULATION CELL — rising on one side, sinking on the other.
   *
   * THE EXISTING `cell` IS A VORTEX, NOT A CONVECTION CELL, and the difference
   * is the whole readability of this family. `cell` draws an OPEN SPIRAL: one
   * and a half turns winding inward, which reads as a curl of weather and is
   * exactly right for a gas giant's storms. Rendered across a star's
   * convective envelope it gives a field of sparse loose curls — measured, 107
   * of them across a band nearly half the radius — and the layer reads as
   * "some swirls happened here" rather than as a wall of circulating plasma.
   *
   * A convection cell is a different physical claim and needs a different
   * mark. What says convection is:
   *
   *   - a CLOSED cell, with a boundary, that tiles against its neighbours
   *   - material going UP one flank and DOWN the other, which is the entire
   *     content of the word and is what a spiral cannot show
   *   - a bright top where the hot material arrives and spreads
   *
   * So this is a rounded closed outline with two opposed arrows inside it. It
   * is D80 for the fourth time in this project: a soft blob — or here, a soft
   * spiral — cannot say what a thing IS.
   *
   * SCALE CARRIES MEANING AND THIS PRIMITIVE IS WHERE IT LANDS. The spec's
   * note is that a main-sequence photosphere has hundreds of tiny granules and
   * a red giant envelope has a dozen enormous cells. Same function, sizes an
   * order of magnitude apart, completely different read — which is only true
   * if the cell has a definite boundary, because a boundary is what makes a
   * dozen of them fill a space.
   *
   * `style` is a {line, up, down, cap} set — see convectionFill. */
  function convectionCell(ctx, view, el, style) {
    var c = view.at(el.radius, el.angle);
    /* WIDER THAN IT IS DEEP. A convection cell in a shell is squat: it spans
     * the layer radially and spreads sideways, because that is the shape the
     * geometry allows. */
    var rx = view.px(el.size);
    var ry = rx * (el.squash === undefined ? 0.78 : el.squash);
    if (rx < 0.6) return;

    ctx.save();
    ctx.translate(c.x, c.y);
    /* Aligned to the body, so "up" in the cell is outward from the centre —
     * which is what makes the rising and sinking flanks mean anything. */
    ctx.rotate(el.angle);

    /* THE CELL BOUNDARY — a rounded, slightly irregular polygon.
     *
     * NOT A ROUNDED RECTANGLE, which is what the first version drew and which
     * came out looking like a field of small buildings: hard corners and
     * straight sides read as ARCHITECTURE, and nothing about convecting plasma
     * is architectural. Not an ellipse either — real cells tile, and tiling
     * shapes have flattish sides where they press against each other, which an
     * ellipse cannot show.
     *
     * So: a polygon of six to eight sides, its vertices pushed in and out per
     * cell from the element's own seed, drawn through a smoothed curve. Flat
     * enough to tile, irregular enough to be a fluid. */
    var SIDES = el.tier <= 1 ? 8 : 6;
    var pts = [];
    for (var v = 0; v < SIDES; v++) {
      var va = (v / SIDES) * Math.PI * 2;
      /* Per-vertex wobble. Two summed sines at incommensurate frequencies —
       * the same construction `blob` uses for its outline, and for the same
       * reason: it is deterministic from the element's own seed (so the shape
       * is stable under re-render, which the whole generator requires) while
       * looking nothing like a repeating pattern.
       *
       * The first version hashed the vertex index with a multiply-and-modulo
       * and produced a near-constant for every vertex, so the polygon came out
       * regular and the cells read as a field of small buildings. Worth
       * knowing: a broken pseudo-random still DRAWS, it just draws something
       * suspiciously tidy. */
      var sd = (el.seed || 0) * 37.1;
      var wob = 0.80 + 0.34 * (0.5 + 0.30 * Math.sin(v * 2.399 + sd)
                                   + 0.20 * Math.sin(v * 5.117 + sd * 1.7));
      pts.push({ x: Math.cos(va) * rx * wob, y: Math.sin(va) * ry * wob });
    }

    /* Drawn as a closed curve through the midpoints, which rounds every corner
     * without needing a radius per vertex. */
    ctx.beginPath();
    var mx = (pts[SIDES - 1].x + pts[0].x) / 2, my = (pts[SIDES - 1].y + pts[0].y) / 2;
    ctx.moveTo(mx, my);
    for (v = 0; v < SIDES; v++) {
      var nxt = pts[(v + 1) % SIDES];
      ctx.quadraticCurveTo(pts[v].x, pts[v].y,
                           (pts[v].x + nxt.x) / 2, (pts[v].y + nxt.y) / 2);
    }
    ctx.closePath();
    ctx.strokeStyle = style.line;
    ctx.lineWidth = view.lw(el.tier === 0 ? 1.5 : el.tier === 1 ? 1.1 : 0.8);
    ctx.stroke();

    /* THE CIRCULATION INSIDE THE CELL — ONE CONTINUOUS LOOP, NOT THREE
     * SEPARATE STROKES.
     *
     * The first version drew a rising flank, a sinking flank and a cap as
     * three independent marks, and the result was a "⊓": two near-vertical
     * brackets under a straight horizontal bar. A field of them read as small
     * buildings, which is how this primitive spent two passes looking
     * architectural while the OUTLINE was never the problem.
     *
     * What convection actually looks like is one closed circuit: material
     * rises up one side, turns over along the top, sinks down the other, and
     * returns along the bottom. Drawing it as a single ellipse-ish loop inside
     * the cell says that in one mark, and — crucially — it has no straight
     * segments anywhere, which is what stops it reading as a box.
     *
     * The loop is drawn in THREE COLOUR SEGMENTS along its length rather than
     * as three shapes: bright up the rising side, brightest across the top
     * where the hot material arrives and spreads, dim down the sinking side.
     * Same geometry, and the brightness gradient is what carries the
     * direction — which is the whole reason this primitive exists rather than
     * `cell` (D80).
     *
     * Skipped on the smallest cells: below a few pixels the loop fills the
     * outline in and the cell becomes a solid lozenge, which is worse than a
     * plain boundary. */
    if (rx > 3.2) {
      var dir = el.spin || 1;
      /* THE LOOP RUNS CLOSE TO THE BOUNDARY, not concentric well inside it.
       *
       * At 0.52 the cell read as two nested rings with a dead gap between
       * them — an outline and, separately, a circle. The circulation is what
       * the boundary CONTAINS: it should nearly touch it, so the two are one
       * object. */
      var lrx = rx * 0.80, lry = ry * 0.82;
      var SEG = 24;

      /* One point on the circulation loop. `u` runs 0..1 once round. `dir`
       * flips which side rises, so neighbouring cells counter-rotate the way
       * real ones do. */
      function loopAt(u) {
        var la = u * Math.PI * 2 * dir - Math.PI * 0.5;
        return { x: Math.cos(la) * lrx, y: Math.sin(la) * lry };
      }

      /* Painted as a run of short segments so the colour can travel along the
       * loop. Cheap — two dozen line segments — and it is the only way to get
       * a gradient along a path without an offscreen buffer. */
      ctx.lineCap = "round";
      for (var q = 0; q < SEG; q++) {
        var u0 = q / SEG, u1 = (q + 1) / SEG;
        /* Where on the circuit this segment sits: 0 at the bottom, 0.5 over
         * the top. The rising side is the first quarter, the top the second,
         * the sinking side after that. */
        var phase = (u0 + 0.25) % 1;
        var col, lw;
        if (phase < 0.28)      { col = style.up;   lw = el.tier === 0 ? 1.7 : 1.2; }
        else if (phase < 0.52) { col = style.cap;  lw = el.tier === 0 ? 1.9 : 1.3; }
        else if (phase < 0.80) { col = style.down; lw = el.tier === 0 ? 1.4 : 1.0; }
        else                   { col = style.line; lw = el.tier === 0 ? 1.2 : 0.9; }
        var p0 = loopAt(u0), p1 = loopAt(u1);
        ctx.strokeStyle = col;
        ctx.lineWidth = view.lw(lw);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  CC.Primitives.register({
    "starspot": starspot,
    "convection-cell": convectionCell
  });
})();
