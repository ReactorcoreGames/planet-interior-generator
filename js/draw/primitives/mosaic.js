/* The mosaic — a Voronoi field of broken rock.
 *
 * Built for the asteroid interior, and named for what it draws rather than for
 * the body that wanted it: any layer whose material is FRAGMENTS WELDED
 * TOGETHER rather than a continuous medium can ask for one. Nothing in this
 * file knows what an asteroid is.
 *
 * ---- WHAT THE DONE-CONDITION ACTUALLY ASKS ---------------------------------
 *
 * The phase doc's bar is that the interior "reads as broken rock, not as a
 * mosaic pattern laid over a circle", and `CC.Primitives.voronoi` — declared
 * in orbital.js and never called — fails it by construction: it fills each
 * cell FLAT. A field of flat polygons in slightly different colours is a
 * stained-glass window. That is a pattern, not a material.
 *
 * Four things separate rock from tiling, and this file is those four things:
 *
 *   1. VOIDS. Rubble has gaps in it. A cell that is void is not drawn at all,
 *      so the layer's own dark ground shows through as a hole — which is the
 *      one mark that says the body is not solid. Fading a cell towards the
 *      background instead would be D156's trap in reverse: a void has to
 *      genuinely be absent, not merely dim.
 *
 *   2. TEXTURE WITHIN EACH CELL. Flat material colour with a coarse mottle
 *      and a fine grain laid into it (draw/rocktexture.js). This used to be
 *      a gradient along a shared light direction plus a sheen, and it read
 *      as polished stone (ASTEROID-OVERHAUL §2): a cutaway is a cut face,
 *      lit by nothing, and rock is rough, not shaded.
 *
 *   3. INSET AND SEAM. Each cell is drawn slightly SMALLER than its polygon,
 *      leaving a dark line between neighbours. A Voronoi diagram's cells share
 *      edges exactly; rock does not — there is crushed material in every
 *      joint. The inset is what turns "adjacent regions" into "separate
 *      pieces". It is also what stops the field reading as one continuous
 *      surface with colour variation on it.
 *
 *   4. GRIT. Dark pitting and pale inclusions in two size tiers — the
 *      coarse, discrete mark the texture tiles are too fine to make.
 *
 * ---- WHY IT IS ONE ELEMENT AND NOT N -------------------------------------
 *
 * A mosaic is a SINGLE STRUCTURE, not a scatter: the cells are defined by each
 * other, so no cell can be built or drawn independently. So `gen/elemgen.js`
 * emits ONE element carrying a `sites` list, and this primitive takes the
 * ordinary `(ctx, view, el, style)` signature every other kind takes. That is
 * what keeps it a normal entry in `KINDS` — the renderer dispatches on
 * `el.kind` exactly as it does for a speckle, and draw/scene.js needed no
 * change at all.
 *
 * (`CC.Primitives.voronoi` stays where it is. It is the raw cell-geometry
 * helper, and this file is a use of it — see `cellsOf`.)
 *
 * draw/primitives.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = CC.Math.TAU;
  var clamp = CC.Math.clamp;

  /* ---- geometry ---------------------------------------------------------- */

  /* The cell polygons, in pixels, for one mosaic element.
   *
   * `bounds` is generous on purpose: the Voronoi diagram is clipped to a
   * rectangle, and the layer's own clip (draw/scene.js has already applied it)
   * is what actually cuts the field to the band. Clipping the diagram tightly
   * to the body would put straight rectangle edges inside the silhouette.
   *
   * Returns null when the library is missing or there are too few sites for a
   * triangulation, so the caller can simply not draw rather than throw. */
  function cellsOf(view, el) {
    var sites = el.sites;
    if (!sites || sites.length < 3) return null;
    if (typeof d3 === "undefined" || !d3.Delaunay) return null;

    var pts = [];
    for (var i = 0; i < sites.length; i++) {
      var p = view.at(sites[i].radius, sites[i].angle);
      pts.push([p.x, p.y]);
    }

    var r = view.px(el.radiusOuter || el.radius || 1) * 1.35;
    var del = d3.Delaunay.from(pts);
    var vor = del.voronoi([view.cx - r, view.cy - r, view.cx + r, view.cy + r]);

    var out = [];
    for (i = 0; i < sites.length; i++) {
      out.push(vor.cellPolygon(i));
    }
    return out;
  }

  /* The centroid of a polygon, and its rough radius — used to place each
   * cell's shading gradient and to size its inset. Plain averages rather than
   * the area-weighted centroid: a Voronoi cell is convex and roughly round, so
   * the difference is invisible and the arithmetic is a third of the cost on a
   * field of two hundred. */
  function centroidOf(poly) {
    var cx = 0, cy = 0, n = 0;
    for (var i = 0; i < poly.length; i++) {
      /* d3 repeats the first vertex to close the ring; skip the duplicate so
       * it does not weight one corner twice. */
      if (i === poly.length - 1 &&
          poly[i][0] === poly[0][0] && poly[i][1] === poly[0][1]) break;
      cx += poly[i][0];
      cy += poly[i][1];
      n++;
    }
    if (!n) return null;
    cx /= n; cy /= n;

    var rad = 0;
    for (i = 0; i < n; i++) {
      var dx = poly[i][0] - cx, dy = poly[i][1] - cy;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > rad) rad = d;
    }
    return { x: cx, y: cy, r: rad };
  }

  /* Trace a polygon shrunk towards its own centre.
   *
   * THE INSET IS IN PIXELS AND CAPPED AS A FRACTION, which is the compromise
   * between two failures. A pure fraction makes the seam scale with the cell,
   * so a field of mixed sizes gets hairlines between the small ones and
   * gutters between the large — the joints then read as a property of the cell
   * rather than of the rock. A pure pixel figure disappears on the small cells
   * at a low Cohesion, where there are most of them and the joints matter
   * most. So: a fixed pixel seam, never allowed past a fifth of the cell.
   *
   * The fraction cap is applied in the cell's own units, so the seam stays
   * resolution-independent in the sense that matters — it does not change what
   * is drawn, only how many pixels the same gap occupies. */
  function traceInset(ctx, poly, c, inset) {
    var k = c.r > 1e-6 ? clamp(1 - inset / c.r, 0.55, 0.985) : 1;
    ctx.beginPath();
    for (var i = 0; i < poly.length; i++) {
      var x = c.x + (poly[i][0] - c.x) * k;
      var y = c.y + (poly[i][1] - c.y) * k;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  /* ---- the primitive ----------------------------------------------------- */

  /* `style` is the rich object built by draw/details.js `mosaicFill`:
   *
   *   materials    [{ body }]  one flat colour per material index
   *   seam         the colour of the joint between fragments
   *   voidFill     what a void is filled with, or null to leave it empty
   *   iceFill      what an icy void is filled with (see `voidIce`)
   *   grainAlpha   strength of the fine gaussian grain (draw/rocktexture.js)
   *   mottleAlpha  strength of the coarse mottle
   *   grit, gritLight  the two polarities of inclusion
   */
  function mosaic(ctx, view, el, style) {
    var polys = cellsOf(view, el);
    if (!polys) return;

    var sites = el.sites;
    var mats = style.materials;
    /* The cut-face texture, or null on a canvas that cannot build one — the
     * fragments are then simply flat. Scaled with the body (texels per pixel
     * follow view.scale), so it is the same rock at every resolution. */
    var tex = CC.RockTexture ? CC.RockTexture.build(ctx) : null;
    var texScale = view.scale * 0.55;

    /* ONE SEAM PASS UNDER EVERYTHING, rather than a stroke per cell.
     *
     * The joints are drawn as a solid ground beneath the fragments and the
     * fragments are then inset over it, so every gap is filled exactly once
     * and the seam width is the inset — one number, one place. Stroking each
     * cell instead double-draws every shared edge, which on a 200-cell field
     * doubles the apparent seam and darkens the whole layer.
     *
     * It also means a VOID is simply a cell that is never drawn over: the
     * seam ground shows through it, which is the right colour for a hole. */
    ctx.save();
    ctx.beginPath();
    for (var i = 0; i < polys.length; i++) {
      var p = polys[i];
      if (!p) continue;
      for (var k = 0; k < p.length; k++) {
        if (k === 0) ctx.moveTo(p[k][0], p[k][1]);
        else ctx.lineTo(p[k][0], p[k][1]);
      }
      ctx.closePath();
    }
    ctx.fillStyle = style.seam;
    ctx.fill();

    var inset = Math.max(0.6, view.px(el.seam || 0.004));
    var hotCells = [];

    for (i = 0; i < polys.length; i++) {
      var poly = polys[i];
      if (!poly) continue;
      var s = sites[i];

      var c = centroidOf(poly);
      if (!c || c.r < 0.7) continue;

      /* A VOID IS A CELL THAT IS NOT THERE.
       *
       * Skipping it entirely leaves the seam ground — the darkest thing in the
       * field — showing through at full cell size, which reads as a cavity in
       * the rock rather than as a differently-coloured fragment. `voidFill`
       * exists for the case where the layer wants the void tinted (an icy
       * body's pockets are not black), and null means "leave the hole". */
      if (s.hollow) {
        /* AN ICY VOID IS FILLED, NOT EMPTY — the ice mechanism that replaced
         * the `ice-rich` trait (ASTEROID-OVERHAUL §3). Ice is a material, so
         * it is a property of the void rather than a scatter of blobs over it.
         * Drawn flat and pale, with the grain only: ice is smoother than rock,
         * and that difference is most of what says it is not another stone. */
        if (s.icy && style.iceFill) {
          traceInset(ctx, poly, c, inset * 0.7);
          ctx.fillStyle = style.iceFill;
          ctx.fill();
          if (tex) {
            ctx.save();
            ctx.clip();
            CC.RockTexture.lay(ctx, tex, c, s.shine, texScale,
                               style.grainAlpha * 0.8, 0);
            ctx.restore();
          }
          continue;
        }
        /* A RECESS, NOT A CUTOUT (the user, after Session U1).
         *
         * Left as bare seam ground, a void read as a pitch-black missing piece
         * — a hole in the picture rather than a hole in the rock. It is drawn
         * instead as a deep, dark, desaturated pocket: lifted a little at the
         * floor and falling away to near-black at the walls, with the cut-face
         * texture still in it. The depth gradient is the one gradient a cell
         * keeps, and it is not the retired shine: it describes how far down
         * the light reaches, not a light source on a surface. */
        if (style.voidFloor) {
          traceInset(ctx, poly, c, inset);
          var vg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
          vg.addColorStop(0, style.voidFloor);
          vg.addColorStop(0.55, style.voidMid);
          vg.addColorStop(1, style.voidWall);
          ctx.fillStyle = vg;
          ctx.fill();
          if (tex) {
            ctx.save();
            ctx.clip();
            CC.RockTexture.lay(ctx, tex, c, s.shine, texScale,
                               style.grainAlpha * 0.6, style.mottleAlpha * 0.5);
            ctx.restore();
          }
        } else if (style.voidFill) {
          traceInset(ctx, poly, c, inset * 0.5);
          ctx.fillStyle = style.voidFill;
          ctx.fill();
        }
        continue;
      }

      var m = mats[s.material % mats.length];
      /* A radioactive fragment is a different MATERIAL, so it takes the
       * flat fill and keeps every other mark — texture, grit — a stone. */
      if (s.hot && style.hot) {
        m = { body: style.hot };
        if (style.hotGlow) hotCells.push(c);
      }

      traceInset(ctx, poly, c, inset);

      /* FLAT, AND TEXTURED — NOT SHADED (ASTEROID-OVERHAUL §2).
       *
       * The fragments used to carry a gradient along a shared light direction
       * plus a sheen over the top, and the review called them "too shiny".
       * Both were continuous fields across the cell, and a surface described
       * only by continuous fields is a polished one. They also claimed a light
       * source a cutaway does not have: this is a CUT FACE, and nothing in a
       * cross-section is catching the sun. Both are gone and must not come
       * back as a light direction under another name.
       *
       * What makes the fragment stone instead is texture: the material's own
       * flat colour, then a coarse mottle and a fine gaussian grain laid into
       * the cell from draw/rocktexture.js, each fragment showing a different
       * part of the tile so neighbours do not read as one painted surface. The
       * fan still separates neighbouring fragments by value; the seams still
       * separate them by line. */
      ctx.fillStyle = m.body;
      ctx.fill();

      if (tex) {
        ctx.save();
        ctx.clip();
        CC.RockTexture.lay(ctx, tex, c, s.shine, texScale,
                           style.grainAlpha, style.mottleAlpha);
        ctx.restore();
        /* Re-traced so the grit below clips to this cell under the restored
         * transform rather than relying on the path surviving the texture. */
        traceInset(ctx, poly, c, inset);
      }

      /* ---- THE GRIT ----------------------------------------------------
       *
       * WHAT SEPARATES ORE FROM A SHADED POLYGON, and the fault it fixes was
       * visible in the render before it was describable: the fragments came
       * out CLEAN AND SHINY — smooth gradients with a sheen, reading as
       * polished stone, ceramic tile or gemstone rather than as the broken
       * ore-bearing rock this body is supposed to be made of.
       *
       * The three marks above are all SMOOTH. The material fan, the shading
       * gradient and the sheen are each a continuous field across the cell,
       * and a surface described entirely by continuous fields is by
       * construction a polished one — there is nothing in the description that
       * could read as roughness. No amount of adjusting them could have fixed
       * it, because the missing thing was not a value, it was a KIND of mark.
       *
       * That is the density thesis arriving inside a single element (and
       * D76/D160's shape: a different register, not a louder version of the
       * same one). Rock is not smooth-with-variation, it is smooth WITH GRIT
       * ON IT — mineral inclusions, pitting, and the dull matte scatter of a
       * fracture surface. So each fragment gets its own field of small marks
       * in two tiers, deterministic from the cell's own seed.
       *
       * TIED TO CELL SIZE, so a rubble pile's small fragments do not each get
       * a planet's worth of speckle. The count goes with AREA, which is what
       * keeps the grit density constant across the field rather than per-cell
       * — 30 marks in a large slab and 3 in a chip read as the same material;
       * 30 in each does not.
       *
       * SKIPPED ON TINY CELLS, where the marks would be sub-pixel and the only
       * effect would be to mud the cell's colour. The layer's own grain
       * element (see the elements table) covers the fine end. */
      if (style.grit && c.r > 3) {
        var area = c.r * c.r;
        var n = Math.min(46, Math.round(area * 0.010));
        if (n > 0) {
          ctx.save();
          ctx.clip();
          for (var q = 0; q < n; q++) {
            /* Deterministic from the site's own seed and the mark's index, so
             * the grit is stable across redraws and costs no RNG stream. */
            var h1 = Math.sin(s.shine * 811.7 + q * 12.9898) * 43758.5453;
            var h2 = Math.sin(s.shine * 447.3 + q * 78.233) * 24634.6345;
            var h3 = Math.sin(s.shine * 231.1 + q * 39.425) * 51287.1234;
            h1 -= Math.floor(h1); h2 -= Math.floor(h2); h3 -= Math.floor(h3);

            /* Placed in the cell's bounding disc and clipped to the cell, so
             * the marks reach the corners rather than clustering at the
             * centre the way a radius-uniform roll would. */
            var ga = h1 * TAU;
            var gr = Math.sqrt(h2) * c.r * 0.94;
            var gx = c.x + Math.cos(ga) * gr;
            var gy = c.y + Math.sin(ga) * gr;

            /* TWO TIERS, heavily weighted to the smaller — the same structure
             * every speckle in the project uses, and for the same reason: a
             * few coarse inclusions among many fine ones reads as material,
             * and one uniform size reads as noise. */
            var big = h3 > 0.82;
            var gs = big ? c.r * (0.030 + h3 * 0.038)
                         : c.r * (0.010 + h3 * 0.016);
            if (gs < 0.35) continue;

            /* The coarse marks are BRIGHT (an inclusion catching light) and
             * the fine ones DARK (pitting and the matte of a fracture face).
             * Both are needed: brightness alone reads as sparkle, darkness
             * alone as dirt. Together they read as ore. */
            ctx.fillStyle = big ? style.gritLight : style.grit;
            ctx.beginPath();
            ctx.arc(gx, gy, gs, 0, TAU);
            ctx.fill();
          }
          ctx.restore();
        }
      }
    }

    /* THE GLOW, over the whole field so a halo can spill onto neighbours —
     * `screen`, so it can only add light, the family's one honest emissive
     * mark. Only near the top of the Radioactivity range. */
    if (hotCells.length) {
      ctx.globalCompositeOperation = "screen";
      for (i = 0; i < hotCells.length; i++) {
        var hcl = hotCells[i];
        var hg = ctx.createRadialGradient(hcl.x, hcl.y, hcl.r * 0.2,
                                          hcl.x, hcl.y, hcl.r * 1.35);
        hg.addColorStop(0, style.hotGlow);
        hg.addColorStop(1, style.hotGlowEdge);
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(hcl.x, hcl.y, hcl.r * 1.35, 0, TAU);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /* ---- fracture ---------------------------------------------------------- */

  /* A crack running ACROSS the mosaic — through several fragments rather than
   * between them.
   *
   * Separate from the mosaic itself because it is a different claim about the
   * material: the seams say the body is an aggregate of pieces, and a fracture
   * says the aggregate has since been hit hard enough to split. A body can
   * have either without the other, so they are two elements rather than one
   * with a flag.
   *
   * It is a POLYLINE THAT IGNORES THE CELLS, and that is the whole point of
   * drawing it as its own mark. A crack that followed the seams would be
   * invisible — it would land exactly where the picture is already dark. One
   * that cuts through cell interiors is immediately legible as damage. */
  function fracture(ctx, view, el, colour) {
    var steps = 9;
    var pts = [];
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      /* A slow wander in both radius and bearing. The bearing drift is the
       * larger of the two, so the crack travels across the layer rather than
       * spiralling around it. */
      var wob = Math.sin(el.seed * 41 + t * 7.3) * 0.30 +
                Math.sin(el.seed * 97 + t * 17.1) * 0.12;
      var ang = el.angle + (t - 0.5) * el.size * 3.1 + wob * el.size;
      var rad = el.radius + Math.sin(el.seed * 61 + t * 5.1) * el.size * 0.55;
      pts.push(view.at(Math.max(0.004, rad), ang));
    }

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(0.6, view.fs(el.size) * 0.10);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();
  }

  CC.Primitives.register({
    "mosaic": mosaic,
    "fracture": fracture
  });
})();
