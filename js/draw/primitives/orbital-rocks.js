/* Hard objects — a manufactured pressure hull, a faceted crystal, a debris
 * chunk, and the Voronoi helper the mosaic builds on.
 *
 * Split out of draw/primitives/orbital.js, which passed the 500-line rule. Each
 * exists because a soft irregular blob could not say what the thing IS.
 *
 * THE SAME RULES APPLY HERE AS IN draw/primitives.js. No role names, no
 * archetype names, one signature, and pixels only through `view`.
 *
 * Registered into CC.Primitives, so `KINDS` stays one table and draw/details.js
 * still has exactly one place to look a kind up. draw/primitives.js must load
 * first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = CC.Math.TAU;

  /* ---- capsule ----------------------------------------------------------- */

  /* A PRESSURE HULL — the one shape in the generator that is MANUFACTURED.
   *
   * Everything else here is weather, rock or fluid, and all of it is soft and
   * irregular. A vessel has to be the opposite: straight sides, hard ends, a
   * specular highlight down one flank and a shadow down the other. That
   * contrast is the whole reason it reads as built rather than as another
   * lump of something — the gas-miner platforms drawn as `chunk` came out, in
   * the user's words, looking like rocks.
   *
   * `el.upright` orients it: a platform hangs VERTICALLY, pointing at the
   * body's centre, because that is how something buoyant sits in a gravity
   * field. A skimmer lies HORIZONTALLY, along its direction of travel.
   *
   * `style` is a {hull, lit, shade, trim} set — see hullFill. */
  function capsule(ctx, view, el, style) {
    var c = view.at(el.radius, el.angle);
    var len = view.px(el.size);
    var wide = len * (el.aspect === undefined ? 0.34 : el.aspect);
    var r = Math.min(wide, len) * 0.5;

    ctx.save();
    ctx.translate(c.x, c.y);
    /* `angle` points away from the centre, so an upright hull is along it and
     * a flat one is across it. `rot` overrides both, as on `plate`: a ship
     * in open space has a heading of its own, not one set by where it is. */
    ctx.rotate(el.rot !== undefined ? el.rot
                                    : el.angle + (el.upright ? 0 : Math.PI / 2));

    /* The hull: a rounded rectangle, long axis along local "up". */
    var hx = wide * 0.5, hy = len * 0.5;
    function hullPath() {
      ctx.beginPath();
      ctx.moveTo(-hx + r, -hy);
      ctx.lineTo(hx - r, -hy);
      ctx.quadraticCurveTo(hx, -hy, hx, -hy + r);
      ctx.lineTo(hx, hy - r);
      ctx.quadraticCurveTo(hx, hy, hx - r, hy);
      ctx.lineTo(-hx + r, hy);
      ctx.quadraticCurveTo(-hx, hy, -hx, hy - r);
      ctx.lineTo(-hx, -hy + r);
      ctx.quadraticCurveTo(-hx, -hy, -hx + r, -hy);
      ctx.closePath();
    }

    /* A LINEAR gradient ACROSS the hull, not a radial one — metal is lit from
     * one side and shades to the other, which is what separates a machined
     * cylinder from a blob. */
    var g = ctx.createLinearGradient(-hx, 0, hx, 0);
    g.addColorStop(0, style.shade);
    g.addColorStop(0.32, style.hull);
    g.addColorStop(0.58, style.lit);
    g.addColorStop(1, style.shade);

    hullPath();
    ctx.fillStyle = g;
    ctx.fill();

    /* A hard outline. Nothing else in these layers has one, and it is a large
     * part of what makes the silhouette read as an object rather than as a
     * patch of colour. */
    ctx.lineWidth = Math.max(0.35, len * 0.045);
    ctx.strokeStyle = style.trim;
    ctx.stroke();

    /* Two banding lines across the hull — the join between pressure sections.
     * Cheap, and they turn a smooth capsule into a piece of equipment. */
    if (len > 3) {
      ctx.lineWidth = Math.max(0.3, len * 0.035);
      for (var i = -1; i <= 1; i += 2) {
        var y = hy * 0.42 * i;
        ctx.beginPath();
        ctx.moveTo(-hx, y);
        ctx.lineTo(hx, y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /* ---- shard ------------------------------------------------------------- */

  /* A GEM — sharp, faceted, and lit from within.
   *
   * `chunk` was the first attempt at diamond rain and it produced, in the
   * user's words, an asteroid ring in the middle of the planet: chunk is
   * deliberately a ROUNDED angular lump because it draws broken rock, and
   * broken rock is exactly what a diamond is not.
   *
   * A shard is a small number of long straight facets around a stretched
   * centre — an elongated crystal rather than a pebble — with one bright facet
   * catching the light. Drawn under a blend mode so it takes colour from the
   * fluid it is falling through, which is what makes it read as transparent.
   *
   * `style` is a {body, facet, glint, blend} set — see gemFill. */
  function shard(ctx, view, el, style) {
    var c = view.at(el.radius, el.angle);
    var base = Math.max(0.6, view.px(el.size));
    var seed = el.seed || 0;
    /* Few facets and a strong elongation: a crystal has a long axis. */
    var sides = 5 + Math.floor(seed * 3);
    var stretch = 1.7 + seed * 1.1;
    /* `elongate` — a stubbier crystal (a nebula's ice); absent elsewhere.
     * Well below 1 it is a rounded lump, so it takes more, smaller faces. */
    if (el.elongate !== undefined) {
      stretch = Math.max(1, 1 + (stretch - 1) * el.elongate);
      if (el.elongate < 0.5) sides += 3;
    }
    /* A FALLING crystal points the way it is going, so its long axis is
     * radial. A GROWING one in a shearing flow lies across that flow, which
     * here is around the body — the same shape saying two different things
     * depending on which way it is turned. */
    var spin = el.angle + (el.crosswise ? Math.PI / 2 : 0);

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(spin);
    if (style.blend) ctx.globalCompositeOperation = style.blend;

    function facetPath(scale) {
      ctx.beginPath();
      for (var i = 0; i < sides; i++) {
        var t = (i / sides) * TAU;
        /* Straight edges between few vertices — the flat faces are the point.
         * The wobble is small and deterministic, so no two are identical
         * without any of them losing their crystal geometry. */
        var w = 0.78 + 0.22 * Math.abs(Math.sin(seed * 17 + i * 1.9));
        var x = Math.cos(t) * base * w * scale;
        var y = Math.sin(t) * base * w * scale * stretch;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }

    facetPath(1);
    ctx.fillStyle = style.body;
    ctx.fill();

    /* An inner facet, offset — the refraction you see through a stone. */
    ctx.save();
    ctx.translate(base * 0.16, -base * stretch * 0.14);
    facetPath(0.52);
    ctx.fillStyle = style.facet;
    ctx.fill();
    ctx.restore();

    /* And the glint: one small bright face. */
    ctx.beginPath();
    ctx.moveTo(0, -base * stretch * 0.72);
    ctx.lineTo(base * 0.34, -base * stretch * 0.16);
    ctx.lineTo(-base * 0.10, -base * stretch * 0.10);
    ctx.closePath();
    ctx.fillStyle = style.glint;
    ctx.fill();

    ctx.restore();
  }

  /* ---- chunk ------------------------------------------------------------- */

  /* A small angular polygon — debris, rubble, fragments.
   *
   * Deliberately angular where `blob` is smooth: broken rock has flat faces
   * and corners, and that difference is what separates a debris belt from a
   * field of pockets without needing two colour treatments. */
  function chunk(ctx, view, el, style) {
    var c = view.at(el.radius, el.angle);
    var base = Math.max(0.7, view.px(el.size));
    var seed = el.seed || 0;
    /* MORE SIDES THAN BEFORE (3-6 became 5-9). A triangle at debris scale is
     * two or three pixels of solid colour, which is exactly what a star in the
     * background plate looks like. More corners give a silhouette that reads
     * as a broken lump even when small. */
    var sides = 5 + Math.floor(seed * 5);
    var spin = seed * TAU;

    /* `style` is a {body, lit, shadow, fleck} set when the caller wants rock
     * rather than a flat fragment; a plain fill otherwise. */
    var rich = style && style.body;

    function facePath(scale, dx, dy) {
      ctx.beginPath();
      for (var i = 0; i < sides; i++) {
        var t = (i / sides) * TAU + spin;
        /* A deterministic per-corner wobble from the element's own seed, so no
         * two chunks are the same shape and none needs an RNG. Deeper than it
         * was, so the outline is jagged rather than merely a rounded polygon —
         * broken rock has facets and notches. */
        var wob = 0.48 + 0.52 * Math.abs(Math.sin(seed * 40 + i * 2.7));
        var x = c.x + dx + Math.cos(t) * base * wob * scale;
        var y = c.y + dy + Math.sin(t) * base * wob * scale;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }

    facePath(1, 0, 0);
    ctx.fillStyle = rich ? style.body : style;
    ctx.fill();

    if (!rich) return;

    /* A LIT FACE AND A SHADOWED ONE.
     *
     * A single flat fill is the whole reason debris was mistaken for
     * starfield: a star is a small bright uniform dot, and so was a chunk.
     * Rock is not uniform — it has a face turned toward the light and one
     * turned away, and that internal contrast is what makes even a 3px mark
     * read as a solid object rather than as a point of light.
     *
     * The offset is a fixed fraction of the chunk's own size, so every
     * fragment in a belt is lit from the same direction and the belt reads as
     * one population of rocks under one sun. */
    var off = base * 0.30;
    ctx.save();
    facePath(1, 0, 0);
    ctx.clip();

    /* The shadowed side: a second copy pushed toward the light, so what
     * remains uncovered along the far edge is the dark limb of the rock. */
    ctx.beginPath();
    facePath(0.96, -off * 0.55, -off * 0.55);
    ctx.fillStyle = style.shadow;
    ctx.fill();

    /* The lit crown, smaller and offset the other way. */
    ctx.beginPath();
    facePath(0.62, off * 0.42, off * 0.42);
    ctx.fillStyle = style.lit;
    ctx.fill();

    ctx.restore();

    /* THE TERMINATOR RIM — one bright arc along the sunward edge.
     *
     * THIS IS THE MARK THAT SEPARATES A ROCK FROM A STAR, and it is a
     * different KIND of mark rather than a stronger version of the same one.
     * Everything above works by internal contrast: a lit face, a dark face,
     * grain. At three pixels across all of that averages back out to a single
     * dull dot, which is exactly what a faint star is — so the fragment kept
     * losing against the starfield no matter how the tones were tuned. The
     * lesson recorded in PROGRESS.md is that a trait separates by VOCABULARY,
     * not by contrast, and no star in this renderer has an EDGE. A crescent of
     * bright along one side is a shape the background plate simply cannot
     * produce, so even at the smallest size the eye reads a lit object rather
     * than a point of light.
     *
     * THE RIM FOLLOWS THE ROCK'S OWN OUTLINE, and the first version's mistake
     * is the whole reason this note is long. It stroked a CIRCULAR arc at a
     * fixed radius and a fixed screen angle — which is not the shape of the
     * fragment. A chunk is an irregular polygon whose corners reach different
     * radii, so a circle drawn near its mean radius cuts inside the long
     * corners and floats clear of the short ones: the result read as a
     * detached crescent hovering beside each rock, a second object rather than
     * a lit edge. It was worst on the largest fragments, where there is most
     * room for the outline to disagree with a circle.
     *
     * So the rim is walked along the SAME VERTICES the silhouette is built
     * from, keeping only the run of edges facing the light. A lit edge has to
     * BE the edge — anything else is a decal sitting near it, which is exactly
     * the "goofy up close" failure.
     *
     * The lit direction is the same fixed diagonal the faces are offset along,
     * so the whole belt is lit by one sun. That is what makes a field of these
     * read as one population of orbiting rocks rather than as scattered
     * confetti — and it costs no light model, no sun position and no
     * per-archetype anything, which is what lets it generalise to a gas
     * giant's belt or to a family not yet written. */
    if (style.rim) {
      /* Toward the light: up-and-right, matching the `+off` crown offset. */
      var lightAng = -Math.PI / 4;
      var lx = Math.cos(lightAng), ly = Math.sin(lightAng);

      /* The silhouette's vertices, in the same order and from the same wobble
       * `facePath` uses — so the rim cannot drift out of agreement with the
       * outline it is supposed to lie on. */
      var vx = [], vy = [];
      for (var v = 0; v < sides; v++) {
        var vt = (v / sides) * TAU + spin;
        var vw = 0.48 + 0.52 * Math.abs(Math.sin(seed * 40 + v * 2.7));
        vx.push(c.x + Math.cos(vt) * base * vw);
        vy.push(c.y + Math.sin(vt) * base * vw);
      }

      /* Keep an edge when its OUTWARD NORMAL faces the light. Judged per edge
       * rather than per vertex because the stroke is the edge, and this is the
       * same test a renderer uses to find a terminator — it just happens to be
       * cheap enough here to do in a loop over five to nine sides. */
      ctx.save();
      ctx.strokeStyle = style.rim;
      /* FLOORED IN PIXELS ON PURPOSE, and this is the one place in the file
       * where that is right rather than a resolution-independence bug. The
       * floor is not a COUNT and it does not add or remove elements — it
       * keeps a stroke that already exists from falling under the width at
       * which a canvas renders it as nothing. `view.lw` applies the same
       * floor to every other stroke in the app for the same reason. */
      ctx.lineWidth = Math.max(0.6, base * 0.22);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (var k = 0; k < sides; k++) {
        var k2 = (k + 1) % sides;
        /* The edge's midpoint relative to the centre is its outward direction
         * for a star-shaped polygon, which every chunk is — the wobble scales
         * each vertex along its own ray and so cannot make the shape concave
         * enough to break this. */
        var mx = (vx[k] + vx[k2]) / 2 - c.x;
        var my = (vy[k] + vy[k2]) / 2 - c.y;
        var ml = Math.sqrt(mx * mx + my * my) || 1;
        if ((mx / ml) * lx + (my / ml) * ly <= 0.10) continue;
        ctx.moveTo(vx[k], vy[k]);
        ctx.lineTo(vx[k2], vy[k2]);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    facePath(1, 0, 0);
    ctx.clip();

    /* SURFACE TEXTURE — a few flecks of grain per fragment.
     *
     * Pits and mineral speckle. Deterministic from the element's own seed, so
     * this stays a pure function of the element and costs no RNG. Only drawn
     * on fragments big enough to show it; below that the flecks would just
     * dirty the silhouette.
     *
     * THE THRESHOLD IS ASKED IN REFERENCE SPACE, NOT IN PIXELS. `base` is
     * `view.px(...)`, so testing it meant "big enough on this canvas" — and a
     * fragment that sat below 2.2px in the preview crossed it in a 4K export
     * and grew flecks that the preview did not have. Measured at 640x360
     * against 3840x2160: 9629 arcs became 11001, i.e. the export drew 1372
     * elements that were not in the picture it was exporting.
     *
     * That is the resolution-independence rule exactly: counts never scale
     * with pixels, and the preview is the real render. `view.fs` is the same
     * authored size the element was placed with, so the answer is the same at
     * every output size. */
    if (view.fs(el.size) > 2.2 && style.fleck) {
      ctx.fillStyle = style.fleck;
      var flecks = 2 + Math.floor(seed * 4);
      for (var f = 0; f < flecks; f++) {
        var fa = seed * 91 + f * 2.399;
        var fr = base * (0.15 + 0.62 * Math.abs(Math.sin(seed * 53 + f * 1.7)));
        var fx = c.x + Math.cos(fa) * fr;
        var fy = c.y + Math.sin(fa) * fr;
        var fs = Math.max(0.4, base * 0.15 * (0.5 + Math.abs(Math.cos(fa * 3))));
        ctx.beginPath();
        ctx.arc(fx, fy, fs, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /* ---- voronoi ---------------------------------------------------------- */

  /* A cell mosaic, via the vendored d3.Delaunay. Built for the asteroid
   * interior in Phase 7 and for ice shells; declared here so the vocabulary is
   * complete and the library is exercised.
   *
   * Takes a list of sites rather than one element, because a mosaic is a
   * single structure rather than a scattered instance. */
  function voronoi(ctx, view, sites, bounds, styleFor) {
    if (!sites.length || typeof d3 === "undefined" || !d3.Delaunay) return;

    var pts = [];
    for (var i = 0; i < sites.length; i++) {
      var p = view.at(sites[i].radius, sites[i].angle);
      pts.push(p.x, p.y);
    }

    var del = d3.Delaunay.from(
      sites.map(function (s) {
        var p = view.at(s.radius, s.angle);
        return [p.x, p.y];
      }));
    var vor = del.voronoi(bounds);

    for (i = 0; i < sites.length; i++) {
      var poly = vor.cellPolygon(i);
      if (!poly) continue;
      ctx.beginPath();
      for (var k = 0; k < poly.length; k++) {
        if (k === 0) ctx.moveTo(poly[k][0], poly[k][1]);
        else ctx.lineTo(poly[k][0], poly[k][1]);
      }
      ctx.closePath();
      ctx.fillStyle = styleFor(sites[i], i);
      ctx.fill();
    }
  }

  CC.Primitives.register({
    "chunk": chunk,
    "capsule": capsule,
    "shard": shard
  });

  /* `voronoi` takes a list of SITES rather than one element, so it is not a
   * `KINDS` entry — nothing dispatches to it by `el.kind`. Published on the
   * namespace directly, which is how draw/ already reaches it. */
  CC.Primitives.voronoi = voronoi;
})();
