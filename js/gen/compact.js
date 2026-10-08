/* The compact family's generation pieces — neutron star, pulsar, black hole.
 *
 * Two body-level facts and two structure builders, none of them knowing an
 * archetype name. Each is opted into by DECLARATION on the archetype, and a
 * body that declares nothing gets null and renders exactly as before.
 *
 *   poles   the magnetic (or spin) axis: how far it tilts from the spin axis,
 *           how twisted the field is, how fast the body spins, and where the
 *           light cylinder sits. One resolved fact, so the field lines, the
 *           beams and the stat card all agree about where the axis points.
 *   beams   two opposed cones of emission along that axis — a pulsar's
 *           lighthouse, a black hole's jets. Light, not material, so it is
 *           drawn by the emissive pass (draw/emissive.js) and runs off the
 *           frame like the glow does.
 *
 *   lattice       a crystal lattice filling a band, broken into grains
 *   vortex-array  evenly spaced vortex lines parallel to the SPIN axis
 *
 * The builders are registered into gen/elemgen.js's dispatch, because that
 * file is past the 500-line rule; they emit ONE element per layer carrying
 * the band's own edges, the way `gradient-band` does, because a lattice and
 * a vortex array are structures and not scatters — a lattice has no position
 * of its own, only a spacing.
 *
 * Load order: after gen/elemgen.js. gen/structure.js calls `poles` and
 * `beams` at run time, so it may load before this file. */

var CC = CC || {};

CC.Compact = (function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp, lerp = M.lerp;
  var DEG = Math.PI / 180;
  var TAU = Math.PI * 2;

  /* A parameter read, 0..1, with a default. */
  function param(params, name, dflt) {
    var v = name ? params[name] : undefined;
    return clamp(v === undefined ? dflt : v, 0, 1);
  }

  /* `{ param, range }` or `{ range }` (rolled) or a plain number -> a figure. */
  function figure(spec, params, rng, dflt) {
    if (spec === undefined || spec === null) return dflt;
    if (typeof spec === "number") return spec;
    var r = spec.range || spec.deg || [0, 1];
    var u = spec.param ? param(params, spec.param, 0.5) : rng();
    return lerp(r[0], r[1], u);
  }

  /* ---- the axis --------------------------------------------------------
   *
   * `poles: { tilt, twist, spin, lightCylinder }` on the archetype.
   *
   *   tilt           degrees between the magnetic axis and the spin axis.
   *                  `{ param, deg }` reads a control (the pulsar's Beam
   *                  tilt); `{ deg }` alone rolls it per body. WHICH SIDE it
   *                  leans is rolled from the body's own stream, so two
   *                  pulsars at one setting do not lean identically.
   *   twist          how far the field lines shear out of the plain dipole.
   *   spin           the parameter that says how fast it turns, 0..1.
   *   lightCylinder  `{ radius: [at spin 0, at spin 1] }` — where
   *                  co-rotation would reach the speed of light. Faster spin
   *                  pulls it in, which is the real relation (R = c / omega).
   *                  Always resolved; WHETHER it is drawn is the
   *                  `light-cylinder` trait (js/data/traits/compact.js), so
   *                  it can be switched like any other mark. */
  function poles(spec, params, seed) {
    if (!spec) return null;
    params = params || {};
    var rng = CC.RNG.stream(seed, "poles");
    var side = rng() < 0.5 ? -1 : 1;
    var tiltDeg = figure(spec.tilt, params, rng, 0);
    var twist = figure(spec.twist, params, rng, 0);
    var spin = spec.spin ? param(params, spec.spin, 0.5) : 0.5;
    var field = spec.field ? param(params, spec.field, 0.5) : 0.5;

    var lcs = spec.lightCylinder;
    var lc = lcs ? lerp(lcs.radius[0], lcs.radius[1], spin) : null;

    return {
      tilt: side * tiltDeg * DEG,
      tiltDeg: tiltDeg,
      twist: twist,
      spin: spin,
      field: field,
      lightCylinder: lc
    };
  }

  /* ---- the beams ------------------------------------------------------
   *
   * `beams: { halfWidth, length, strength, streaks, glints, knots, collimate }`.
   * Every figure may be `{ param, range }`. Counts are [at density 0, at 1],
   * read off Detail density the way an element's are, so a beam is as busy as
   * the body it comes out of. Resolved against the axis above, so the beam
   * and the field lines cannot disagree about where the pole is. */
  function beams(spec, axis, params) {
    if (!spec) return null;
    params = params || {};
    /* `when: { param, is }` — beams only while a setting names one of the
     * listed values. A supernova remnant's pulsar fires them; a planetary
     * nebula's white dwarf and a cloud do not. */
    if (spec.when && spec.when.is.indexOf(params[spec.when.param]) < 0) return null;
    var dens = param(params, "detailDensity", 0.65);
    var none = function () { return 0.5; };
    var strength = figure(spec.strength, params, none, 1);
    if (strength <= 0.01) return null;
    function count(c) { return c ? Math.round(lerp(c[0], c[1], dens)) : 0; }
    return {
      axis: axis ? axis.tilt : 0,
      half: figure(spec.halfWidth, params, none, 8) * DEG,
      length: figure(spec.length, params, none, 3),
      strength: strength,
      /* How tightly the cone stays a cone. 0 is a straight-sided wedge — a
       * pulsar's beam; toward 1 the sides pinch in, which is a jet. */
      collimate: spec.collimate || 0,
      /* Where the beams start, in body radii: the star's surface by default.
       * A pulsar at the heart of a nebula is a tiny point at its centre. */
      base: spec.base === undefined ? 0.96 : spec.base,
      /* The beam's width where it starts; undefined keeps the primitive's
       * default (a star's polar cap). */
      root: spec.root,
      streaks: count(spec.streaks),
      glints: count(spec.glints),
      knots: count(spec.knots)
    };
  }

  /* ---- the hole --------------------------------------------------------
   *
   * `hole: { spin, accretion, disc, umbra }` on the archetype. A ROTATING
   * BLACK HOLE'S GEOMETRY, from the Kerr solution, in units of the outer
   * horizon (which is the body's surface, 1.0):
   *
   *   a          the spin, 0..0.998 of the maximum. Mapped through a sine so
   *              the slider's travel is spread over the range where the
   *              interior visibly changes — the relation is very steep at
   *              the top, and a linear map spent most of the slider on a hole
   *              that looked the same.
   *   ergosphere the static limit, r_E(theta) = M(1 + sqrt(1 - a^2 cos^2)):
   *              wide at the equator, touching the horizon at the poles.
   *   isco       the innermost stable circular orbit — where the disc's inner
   *              edge is. Spin pulls it in from 3 horizon radii toward 1.2,
   *              which is real and is the most visible thing spin does.
   *
   * The interior bands (`infall`, `cauchy-shell`, `inner-region`) are LAYERS
   * whose radii read the same spin through `modulate` — see the archetype.
   * This computes what is not a band: the ergosphere is oblate, and the disc
   * is sliced, so they are drawn by draw/hole.js from these numbers. */
  function hole(spec, params, seed) {
    if (!spec) return null;
    params = params || {};
    var s = spec.spin ? param(params, spec.spin, 0.5) : 0.5;
    var a = 0.998 * Math.sin(s * Math.PI / 2);
    var q = Math.sqrt(1 - a * a);
    var M = 1 / (1 + q);                     /* mass, in horizon radii */

    /* Prograde ISCO (Bardeen, Press & Teukolsky 1972), in M. */
    var cb = function (x) { return x < 0 ? -Math.pow(-x, 1 / 3) : Math.pow(x, 1 / 3); };
    var Z1 = 1 + cb(1 - a * a) * (cb(1 + a) + cb(1 - a));
    var Z2 = Math.sqrt(3 * a * a + Z1 * Z1);
    var isco = (3 + Z2 - Math.sqrt(Math.max(0, (3 - Z1) * (3 + Z1 + 2 * Z2)))) * M;

    var acc = spec.accretion ? param(params, spec.accretion, 0.5) : 0.5;
    var dens = param(params, "detailDensity", 0.65);
    function count(c) { return c ? Math.round(lerp(c[0], c[1], dens)) : 0; }

    var d = spec.disc || null;
    var disc = null;
    /* NO DISC AT ALL below a trickle. "At 0 the disc is absent and the image
     * is almost entirely black — a bold and correct output" (the spec). */
    if (d && acc > (d.below === undefined ? 0.04 : d.below)) {
      var feed = clamp((acc - 0.04) / 0.96, 0, 1);
      disc = {
        colour: d.colour,
        rIn: isco,
        rOut: d.outer || 6.5,
        feed: feed,
        /* A dim disc is thin; a feeding one puffs up near its inner edge into
         * a thick, hot torus. Flare is how fast it thickens outward. */
        root: lerp(0.06, 0.16, feed),
        flare: lerp(0.13, 0.24, feed),
        puff: lerp(0.0, 0.42, feed),
        streaks: Math.round(count(d.streaks) * (0.35 + 0.65 * feed)),
        spots: Math.round(count(d.spots) * feed),
        turbulence: count(d.turbulence),
        plunge: Math.round(count(d.plunge) * (0.3 + 0.7 * feed)),
        marks: d.marks === undefined ? 4 : d.marks,
        seed: CC.RNG.stream(seed, "hole/disc")()
      };
    }

    return {
      a: a, spin: s, q: q, M: M,
      isco: isco,
      /* The static limit's reach at the equator, in horizon radii. 1 means
       * there is no ergosphere at all, which is the non-spinning hole. */
      ergoEquator: 2 * M,
      ergo: function (theta) {
        var c = Math.cos(theta);
        return M * (1 + Math.sqrt(1 - a * a * c * c));
      },
      accretion: acc,
      disc: disc,
      umbra: spec.umbra || null,
      ergoColour: spec.ergoColour || (d && d.colour) || null
    };
  }

  /* ---- structure builders -------------------------------------------- */

  /* ONE element for the whole band, carrying the band's own edges. */
  function structure(kind, recipe, layer, rng, extra) {
    var a = recipe.alpha || [0.5, 0.8];
    var el = {
      kind: kind,
      tier: 0,
      angle: 0,
      radius: layer.inner,
      inner: layer.inner,
      outer: layer.outer,
      depth: 0,
      size: (recipe.size || [0.01, 0.01])[0],
      alpha: lerp(a[0], a[1], rng()),
      tone: recipe.tone || "shift",
      seed: rng()
    };
    for (var k in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, k)) el[k] = extra[k];
    }
    return el;
  }

  /* A CRYSTAL LATTICE — rows of nuclei following the curve, at a spacing set
   * by the recipe. `count` is how many GRAINS the band breaks into: each
   * grain has its own phase and a slight shear, so the boundaries between
   * them read as a polycrystal rather than as a printed pattern. */
  CC.ElemGen.registerBuilder("lattice", function (recipe, layer, plan, count, rng) {
    var s = recipe.size || [0.010, 0.010];
    var grains = [];
    var at = 0;
    var n = Math.max(3, count);
    /* Uneven grain widths: a polycrystal is not a clock face. */
    var widths = [], total = 0;
    for (var i = 0; i < n; i++) { widths.push(0.35 + rng() * 1.3); total += widths[i]; }
    for (i = 0; i < n; i++) {
      var w = widths[i] / total * Math.PI * 2;
      grains.push({ a0: at, a1: at + w, phase: rng(), shear: (rng() * 2 - 1),
                    row: rng() });
      at += w;
    }
    return [structure("lattice", recipe, layer, rng,
                      { size: lerp(s[0], s[1], rng()), grains: grains })];
  });

  /* NUCLEAR PASTA — rows across the band, in grains like the lattice, each
   * grain with its own phase so the dashes do not line up across a seam. */
  CC.ElemGen.registerBuilder("pasta", function (recipe, layer, plan, count, rng) {
    var s = recipe.size || [0.012, 0.012];
    var grains = [], at = 0, n = Math.max(3, count), widths = [], total = 0, i;
    for (i = 0; i < n; i++) { widths.push(0.4 + rng() * 1.2); total += widths[i]; }
    for (i = 0; i < n; i++) {
      var w = widths[i] / total * Math.PI * 2;
      grains.push({ a0: at, a1: at + w, phase: rng(), wave: rng() });
      at += w;
    }
    return [structure("pasta", recipe, layer, rng,
                      { size: lerp(s[0], s[1], rng()), grains: grains })];
  });

  /* DIPOLE FIELD LINES — scattered like anything else, but a loop is not AT
   * a radius: it leaves the surface and comes back. So `radius` is pinned to
   * the layer's floor, where the loop is rooted, and the reach goes on
   * `reach`. That matters because an outward layer fades each element by its
   * radius (draw/details.js `fadeAt`): keyed to its reach, every wide loop
   * took the alpha of its outermost point and vanished whole, which left the
   * field as a ring of small loops round the equator. The primitive fades
   * along the line instead, toward `outer`.
   *
   * `depth` may run past 1: a loop reaching beyond the halo is a line rising
   * steeply off a polar cap and fading out, which is the iconic picture of a
   * dipole and the one a magnetar should give. */
  CC.ElemGen.registerBuilder("dipole-loop", function (recipe, layer, plan, count, rng, opts) {
    var d = recipe.depth || [0.05, 1];
    return CC.ElemGen.scatter("dipole-loop", recipe, layer, plan, rng, opts,
      function (el, r) {
        var u = Math.pow(r(), 0.8);
        el.reach = layer.inner + lerp(d[0], d[1], u) * layer.thickness;
        el.outer = layer.outer;
        el.radius = layer.inner;
        el.depth = 0;
      });
  });

  /* VORTEX LINES IN A SPINNING SUPERFLUID. A superfluid cannot rotate as a
   * whole; it spins by threading itself with quantized vortices, all parallel
   * to the spin axis, at a density proportional to the spin rate. So the
   * spacing is read off the spin control — a faster body is more densely
   * threaded, which is the real relation and the visible one. */
  CC.ElemGen.registerBuilder("vortex-array", function (recipe, layer, plan, count, rng, opts) {
    var s = recipe.size || [0.06, 0.02];
    var spin = recipe.spinBy ? param((opts && opts.params) || {}, recipe.spinBy, 0.5) : 0.5;
    return [structure("vortex-array", recipe, layer, rng, {
      size: lerp(s[0], s[1], spin),
      phase: rng()
    })];
  });

  /* THE SINGULARITY — a mark, not a structure. A spinning hole's singularity
   * is a RING in its equator, so a cut through the spin axis meets it at two
   * points; a still one's is a point. Declared on both the innermost interior
   * band and the infall band: whichever is innermost draws it, so a hole with
   * no inner horizon still has its point at the centre. */
  CC.ElemGen.registerBuilder("singularity", function (recipe, layer, plan, count, rng, opts) {
    if (layer.inner > 1e-6) return [];
    var ring = recipe.ringBy ? param((opts && opts.params) || {}, recipe.ringBy, 0.5) : 0;
    var a = recipe.alpha || [0.8, 0.9];
    var al = lerp(a[0], a[1], rng());
    var base = { kind: "singularity", tier: 0, depth: 0, size: (recipe.size || [0.02])[0],
                 alpha: al, tone: recipe.tone || "glow", seed: rng() };
    function at(r, ang, x) {
      var e = {};
      for (var k in base) if (Object.prototype.hasOwnProperty.call(base, k)) e[k] = base[k];
      e.radius = r; e.angle = ang; e.span = x;
      return e;
    }
    /* The ring's radius, inside the band that holds it. */
    if (recipe.ring && ring > 0.12) {
      var rr = layer.outer * recipe.ring;
      return [at(rr, Math.PI / 2, rr), at(rr, -Math.PI / 2, rr)];
    }
    return [at(0, 0, 0)];
  });

  /* ---- keeping out of the jets and the disc ----------------------------
   *
   * Bearings for something built in orbit, moved off the jets and out of the
   * sliced disc. A collector parked in a relativistic jet is not believable,
   * and drawn there it is lost in the glare.
   *
   * The bearings are COMPRESSED into what is left of the circle rather than
   * nudged out of each wedge one by one, so an evenly spaced ring stays
   * evenly spaced and nothing piles up against a wedge's edge. `r` is the
   * orbit's radius and `pad` the mark's own angular half-width, both in
   * radians/body radii. A bearing runs from +y (x = sin), as everywhere. */
  function clearAngles(angles, body, r, pad) {
    var out = [], i;
    var B = body && body.beams, Dk = body && body.hole && body.hole.disc;
    var margin = 6 * DEG + (pad || 0);
    if (B) {
      var jh = B.half * 2 + 6 * DEG + margin;
      out.push({ a: B.axis, h: jh }, { a: B.axis + Math.PI, h: jh });
    }
    if (Dk) {
      var h0 = Dk.root + Dk.puff;
      if (r > Dk.rIn - 0.55 * h0 - 0.3) {
        var x = Math.max(r, Dk.rIn), u = x - Dk.rIn;
        var hx = Dk.root + u * Dk.flare + Dk.puff * Math.exp(-u * u / 1.1);
        var dh = Math.atan2(hx, r) + margin;
        out.push({ a: Math.PI / 2, h: dh }, { a: -Math.PI / 2, h: dh });
      }
    }
    if (!out.length) return angles;

    /* The circle as [start, end) intervals, with the wedges cut out. */
    var cuts = out.map(function (w) {
      var s = ((w.a - w.h) % TAU + TAU) % TAU;
      return { s: s, e: s + Math.min(w.h * 2, TAU) };
    }).sort(function (p, q) { return p.s - q.s; });
    var merged = [];
    for (i = 0; i < cuts.length; i++) {
      var m = merged[merged.length - 1];
      if (m && cuts[i].s <= m.e) m.e = Math.max(m.e, cuts[i].e);
      else merged.push({ s: cuts[i].s, e: cuts[i].e });
    }
    /* A wedge running past TAU wraps onto the start of the next lap. */
    var open = [], at = merged[0].e, total = 0;
    for (i = 1; i <= merged.length; i++) {
      var next = i < merged.length ? merged[i].s : merged[0].s + TAU;
      if (next > at) { open.push({ s: at, len: next - at }); total += next - at; }
      at = Math.max(at, i < merged.length ? merged[i].e : at);
    }
    if (total <= 0.05) return angles;

    return angles.map(function (a) {
      var f = ((a % TAU) + TAU) % TAU / TAU * total;
      for (var k = 0; k < open.length; k++) {
        if (f <= open[k].len) return open[k].s + f;
        f -= open[k].len;
      }
      return open[open.length - 1].s + open[open.length - 1].len;
    });
  }

  return { poles: poles, beams: beams, hole: hole, clearAngles: clearAngles };
})();
