/* The mosaic builder — Voronoi cells, voids and seams from one Cohesion dial.
 *
 * Split out of gen/elemgen.js, which passed the 500-line rule, and registered
 * through `CC.ElemGen.registerBuilder`. gen/elemgen.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;
  var lerp = CC.Math.lerp;
  var TAU = CC.Math.TAU;
  var radiusAt = CC.ElemGen.radiusAt;
  var areaSpread = CC.ElemGen.areaSpread;

  /* ---- the mosaic ------------------------------------------------------- */

  /* A Voronoi field of broken rock: ONE element carrying every cell site.
   *
   * WHY IT IS ONE ELEMENT. Every other builder here emits N independent
   * instances, because every other mark IS independent — move one speckle and
   * the rest are unaffected. A Voronoi cell has no shape of its own; it is
   * defined entirely by where its neighbours are. So the mosaic is a single
   * structure and it is built and drawn as one, which is also what lets it be
   * an ordinary `KINDS` entry rather than a special pass in draw/scene.js.
   *
   * `count` is therefore the CELL COUNT rather than the instance count — the
   * one place in this file where that is true, and it is true because a mosaic
   * with two hundred cells is one mosaic, not two hundred mosaics.
   *
   * ---- COHESION IS THE WHOLE PARAMETER -----------------------------------
   *
   * The spec (docs/celestials/solid-bodies.md) folds `rubble-pile` and
   * `void-riddled` into one axis, and the reason it is worth a slider is that
   * it drives four things AT ONCE and they have to move together:
   *
   *   cell count   low cohesion is many small fragments; high is few large
   *                ones. A loose aggregate is made of gravel, a monolith of
   *                slabs
   *   cell size    follows from the count, but the SPREAD widens as cohesion
   *                falls — a rubble pile has boulders in among the gravel
   *   voids        the fraction of cells that are holes. This is the mark that
   *                actually says "rubble pile", and it goes to nearly nothing
   *                at full cohesion
   *   seam width   the joints open up as the body loosens
   *
   * Driving them from one number is what makes the two ends read as genuinely
   * different bodies rather than as the same picture with a dial nudged.
   *
   * `mosaicCohesion` on the recipe names the parameter, so the coupling is
   * declared in the elements table rather than assumed here.
   *
   * ---- WHY THE SITES ARE NOT A UNIFORM SCATTER ---------------------------
   *
   * `areaSpread` is used for the radius exactly as everywhere else, so the
   * cells are uniform per unit AREA and the field does not crowd the centre.
   * But a purely random point set produces Voronoi cells of wildly uneven
   * size, with long thin slivers wherever two sites land close together —
   * which reads as cracked glass rather than as rock.
   *
   * One round of Lloyd relaxation would fix it properly and needs the diagram,
   * which does not exist at generation time. The cheap equivalent is to lay
   * the sites on a JITTERED POLAR LATTICE: rings of cells with a per-ring
   * phase offset and a bounded jitter. That gives cells that vary in size
   * without producing slivers, and it costs nothing.
   *
   * The jitter is what keeps it from reading as a lattice. At zero it is a
   * honeycomb; at the figure below it is rubble. */
  function buildMosaic(recipe, layer, count, rng, opts) {
    var params = (opts && opts.params) || null;
    var cells = Math.max(3, Math.round(count));

    /* Cohesion, 0..1. Absent means "solid" rather than "loose": a layer that
     * asks for a mosaic without naming a parameter wants a plain aggregate,
     * not a body falling apart. */
    var coh = 1;
    if (recipe.mosaicCohesion && params &&
        params[recipe.mosaicCohesion] !== undefined) {
      coh = clamp(params[recipe.mosaicCohesion], 0, 1);
    }

    /* FEWER, LARGER CELLS AS THE BODY TIGHTENS. The authored `count` is the
     * loose end — the count a rubble pile wants — and cohesion scales it down
     * towards a monolith. Not to nothing: even a solid fragment of rock has
     * internal structure, and a mosaic of three cells is not a mosaic. */
    cells = Math.max(6, Math.round(cells * lerp(1.0, 0.28, coh)));

    var dLo = recipe.depth ? recipe.depth[0] : 0.0;
    var dHi = recipe.depth ? recipe.depth[1] : 1.0;

    /* HOW MANY OF THE CELLS ARE HOLES.
     *
     * The authored range is at cohesion 0 and cohesion 1 respectively, so the
     * elements table states the two ends of the picture directly rather than
     * a base figure and a multiplier. At the tight end it is deliberately not
     * zero — a fragment with no voids at all is a disc of tiles, and a couple
     * of pockets is what keeps it reading as rock. */
    var vr = recipe.voids || [0.30, 0.02];
    /* Eased, not linear (D313): the loose end is now nine-tenths hole, and a
     * straight line would put half the default body in voids. Squared, the
     * middle of the dial is a quarter and the drama is at the bottom. */
    var voidChance = vr[1] + (vr[0] - vr[1]) * (1 - coh) * (1 - coh);

    /* HOW MANY MATERIALS. The spec asks for 2-4, "enough variation to read as
     * different materials, not enough to look like confetti". Rolled per body
     * rather than fixed, so two asteroids differ in composition and not only
     * in colour. */
    var mr = recipe.materials || [2, 4];
    var materials = Math.round(lerp(mr[0], mr[1], rng()));

    /* THE LATTICE. Rings chosen so the cells come out roughly round: a ring
     * count near the square root of the cell count gives each ring about as
     * many cells as there are rings, which is the isotropic case. */
    var rings = Math.max(1, Math.round(Math.sqrt(cells * 0.62)));

    /* Each ring takes a share of the cells proportional to its own
     * circumference, which is what keeps the density uniform per unit AREA
     * rather than per unit radius — `areaSpread`'s argument, applied to a
     * lattice. The radii are wanted before the placement loop, so they are
     * measured in one pass first. */
    var radii = [];
    var total = 0;
    for (var r0 = 0; r0 < rings; r0++) {
      var tr = areaSpread((r0 + 0.5) / rings, layer, dLo, dHi);
      var rr = Math.max(0.05, radiusAt(layer, tr));
      radii.push({ t: tr, r: rr });
      total += rr;
    }

    var sites = [];
    var placed = 0;
    var jitter = recipe.jitter === undefined ? 0.52 : recipe.jitter;

    /* ON A WARPED BODY, laid out where the cells will be seen — see
     * `mosaicSites` in js/gen/form.js for why the polar lattice below crowds
     * the narrow side once the form is applied. */
    var form = opts && opts.form;
    if (form) {
      var at = CC.Form.mosaicSites(form, layer.outer, cells, jitter, rng, coh);
      for (var fi = 0; fi < at.length; fi++) {
        sites.push({
          angle: at[fi].angle,
          radius: at[fi].radius,
          material: Math.floor(rng() * materials),
          hollow: rng() < voidChance,
          shine: rng()
        });
      }
      placed = cells;
    }

    for (var ring = 0; ring < rings && placed < cells; ring++) {
      var want = Math.max(1, Math.round(cells * radii[ring].r / total));
      if (ring === rings - 1) want = Math.max(1, cells - placed);
      want = Math.min(want, cells - placed);

      var phase = rng() * TAU;
      var step = TAU / want;

      for (var i = 0; i < want; i++) {
        var angle = phase + step * i + (rng() * 2 - 1) * step * jitter;
        /* The radial jitter is a fraction of the ring SPACING rather than of
         * the body, so it stays inside the band whatever the layer's thickness
         * rolled to — the `sizeRel` argument applied to placement. */
        var rJit = (rng() * 2 - 1) * (1 / rings) * jitter * 0.9;
        var tt = clamp(radii[ring].t + rJit * (dHi - dLo), dLo, dHi);

        sites.push({
          angle: angle,
          radius: radiusAt(layer, tt),
          /* WHICH MATERIAL THIS FRAGMENT IS. Rolled per cell, so neighbouring
           * fragments genuinely differ — the alternative, banding the
           * materials by radius, would read as strata, and this layer is
           * explicitly not stratified. */
          material: Math.floor(rng() * materials),
          hollow: rng() < voidChance,
          /* Which fragments catch the light. Rolled here rather than derived
           * from the material, because a sheen is a property of the individual
           * face's angle rather than of the mineral. */
          shine: rng()
        });
        placed++;
      }
    }

    /* ICE IN THE VOIDS, ON A BODY COLD ENOUGH TO KEEP IT.
     *
     * The replacement for the retired `ice-rich` trait (ASTEROID-OVERHAUL §3):
     * what a body is made of belongs to the mosaic, so ice is a property of
     * its voids rather than a scatter of blobs over them. Driven by the named
     * parameter — Starlight, on the asteroid, which is the frost line stated
     * as a dial: far enough out and the voids hold ice, close in and they are
     * empty. `voidIce: { param, full, none }` — the parameter value at which
     * every void is icy, and the one above which none is.
     *
     * Rolled after every site exists, so it never shifts the geometry. */
    var iceFrac = 0;
    var vi = recipe.voidIce;
    if (vi && params && params[vi.param] !== undefined) {
      var iv = (vi.none - params[vi.param]) / Math.max(1e-6, vi.none - vi.full);
      iv = clamp(iv, 0, 1);
      iceFrac = iv * iv * (3 - 2 * iv);
    }
    if (iceFrac > 0) {
      for (var ic = 0; ic < sites.length; ic++) {
        if (sites[ic].hollow) sites[ic].icy = rng() < iceFrac;
      }
    }

    /* RADIOACTIVE FRAGMENTS (ASTEROID-OVERHAUL §8). Not the whole interior:
     * the point is that SOME pieces are hot, so a share of the solid cells —
     * none below about a third of the range, a tenth at the top — is
     * marked. Composition, never structure: it moves no cell, no void and no
     * count. Chosen by a hash of each site's own roll rather than a new draw,
     * so the rest of the mosaic is the same rock with or without it.
     * `mosaicRadio` names the parameter, as `mosaicCohesion` does. */
    var radio = 0;
    if (recipe.mosaicRadio && params && params[recipe.mosaicRadio] !== undefined) {
      radio = clamp(params[recipe.mosaicRadio], 0, 1);
    }
    var hotShare = CC.Math.smoothstep(0.35, 1.0, radio) * 0.11;
    var hotCount = 0;
    if (hotShare > 0) {
      for (var hc = 0; hc < sites.length; hc++) {
        if (sites[hc].hollow) continue;
        var hh = Math.sin(sites[hc].shine * 7919.31 + 4.17) * 43758.5453;
        if (hh - Math.floor(hh) < hotShare) { sites[hc].hot = true; hotCount++; }
      }
    }

    /* THE SEAM OPENS AS THE BODY LOOSENS. Authored in body-space units so it
     * is resolution-independent, like every other size in this file. */
    var sm = recipe.seam || [0.010, 0.0022];
    var seam = lerp(sm[0], sm[1], coh);

    var el = {
      kind: "mosaic",
      tier: 0,
      /* A mosaic has no position of its own — it IS the layer. The angle and
       * radius are carried anyway because draw/details.js reads them for the
       * zone tint and the thermal gradient, and the layer's midpoint is the
       * honest answer to "where is this element". */
      angle: 0,
      radius: layer.inner + layer.thickness * 0.5,
      depth: 0.5,
      size: layer.thickness,
      alpha: recipe.alpha ? lerp(recipe.alpha[0], recipe.alpha[1], rng()) : 1,
      tone: recipe.tone || "shift",
      seed: rng(),
      sites: sites,
      seam: seam,
      materialCount: materials,
      iceFraction: iceFrac,
      cohesion: coh,
      radioactivity: radio,
      hotCount: hotCount,
      /* What the primitive clips its Voronoi rectangle to. The layer's outer
       * edge rather than 1.0, so a mosaic in a thin band does not build a
       * diagram across the whole body. */
      radiusOuter: layer.outer
    };
    if (opts && opts.decorate) opts.decorate(el, rng, recipe, { tier: 0 });
    return [el];
  }

  /* THE ONE BUILDER THAT TAKES `count` RATHER THAN `plan`, and it is not an
   * oversight: a mosaic's count is a CELL count, and cells are defined by their
   * neighbours, so there is nothing for a size tier to mean. */
  CC.ElemGen.registerBuilder("mosaic", function (recipe, layer, plan, count, rng, opts) {
    return buildMosaic(recipe, layer, count, rng, opts);
  });
})();
