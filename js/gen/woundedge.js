/* Wound edge — the marks along the cut faces of a rupture (js/gen/rupture.js
 * cuts it, js/draw/woundedge.js draws this).
 *
 * MACHINE-WORLDS.md § "Hull integrity": the breach should read as torn
 * structure, not a clean slice. The archetype names a STYLE on its rupture
 * (`edge: "torn"`), looked up in `styles` here, so another style (stage d's
 * Under construction: clean faces and scaffolding) is one more entry and
 * the draw pass needs no case for it (it is js/gen/woundclean.js). Nothing
 * here knows the archetype.
 *
 * THE TORN STYLE, per cut step and per side of the wound:
 *
 *   plates   plating peeled off the face and bent outward into the gap; the
 *            biggest at each layer's top corner, biggest of all at the
 *            surface lips, where they read as petals blown out
 *   stubs    snapped pillars: hanging from each void's ceiling where it is
 *            torn off, and standing on the ledge of floor the next, narrower
 *            step leaves, at the real pillars' own bearings
 *   pipes    severed pipe ends out of the faces of the layers the spec names
 *            (`pipes`), where there is pipework to sever
 *   ends     a real conduit run the wound cuts, ragged at the cut
 *   debris   the field drifting out of the wound (js/gen/wounddebris.js)
 *   sparks   sparks, fire and embers, by Operational status (likewise)
 *
 * The scorched rim needs no marks: draw/woundedge.js strokes the outline.
 *
 * STABLE AS THE DIAL MOVES. Nothing is drawn from a stream. A mark on a face
 * is pinned by a hash of its ABSOLUTE radius and side, as the serration is,
 * and set on the edge where it stands (`CC.Rupture.edgeAt`), so it rides
 * its edge outward as the wound widens and appears only when the floor
 * passes below it. Detail density raises the keep thresholds, so a denser
 * body keeps every mark a sparser one had.
 *
 * Every length is in body radius. */

var CC = CC || {};

CC.WoundEdge = (function () {
  "use strict";

  var TAU = Math.PI * 2;
  function lerp(a, b, t) { return a + (b - a) * t; }

  function hash(x, salt) {
    var s = Math.sin(x * 127.1 + salt * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  /* Face plating: one candidate per PLATE_PITCH of radius. */
  var PLATE_PITCH = 0.0055;
  var PLATE_KEEP = 0.70;
  /* Severed pipe ends: one candidate per PIPE_PITCH. */
  var PIPE_PITCH = 0.0055;
  var PIPE_KEEP = 0.45;
  /* Snapped pillars kept on a ledge. */
  var STUB_KEEP = 0.8;
  /* Where a real conduit is sampled for the cut. */
  var RUN_STEP = 0.0015;

  function byRole(body) {
    var m = {};
    for (var i = 0; i < body.layers.length; i++) m[body.layers[i].role] = body.layers[i];
    return m;
  }

  function surfaceOf(body) {
    for (var i = 0; i < body.layers.length; i++) {
      if (!body.layers[i].outward) return body.layers[i].outer;
    }
    return 1;
  }

  /* Plates along one face of one step, [lo, hi] its material. */
  function facePlates(out, w, role, side, lo, hi, keep, salt) {
    var k0 = Math.ceil(lo / PLATE_PITCH), k1 = Math.floor(hi / PLATE_PITCH);
    for (var q = k0; q <= k1; q++) {
      if (hash(q, salt) > keep) continue;
      var r = (q + (hash(q, salt + 1) - 0.5) * 0.7) * PLATE_PITCH;
      var wid = lerp(0.004, 0.010, hash(q, salt + 2));
      if (r - wid / 2 < lo || r + wid / 2 > hi) continue;
      var a = CC.Rupture.edgeAt(w, side, r, true);
      if (a === null) continue;
      out.push({ role: role, r: r, a: a, side: side, wid: wid,
                 len: lerp(0.008, 0.026, Math.pow(hash(q, salt + 3), 1.4)),
                 bend: lerp(0.30, 1.15, hash(q, salt + 4)),
                 curl: lerp(-0.2, 0.6, hash(q, salt + 5)),
                 seed: hash(q, salt + 6) });
    }
  }

  /* Two to four big plates at a layer's top corner, bent up and out. The
   * outermost, at the surface, the biggest: the blown petals. */
  function cornerPlates(out, w, role, side, r, big, salt) {
    var n = 2 + Math.floor(hash(r * 997, salt) * 3);
    for (var j = 0; j < n; j++) {
      var u = hash(j, salt + 20 + r * 31);
      var wid = lerp(0.008, 0.016, u) * big;
      var rr = r - wid * (0.5 + j * 0.8);
      var a = CC.Rupture.edgeAt(w, side, rr, true);
      if (a === null) continue;
      out.push({ role: role, r: rr, a: a, side: side, wid: wid,
                 len: lerp(0.020, 0.045, hash(j, salt + 21 + r * 17)) * big * (1 - j * 0.18),
                 bend: lerp(0.75, 1.40, hash(j, salt + 22 + r * 13)),
                 curl: lerp(0.15, 0.70, hash(j, salt + 23 + r * 11)),
                 seed: hash(j, salt + 24 + r * 7), corner: true });
    }
  }

  function facePipes(out, w, role, side, lo, hi, keep, salt) {
    var k0 = Math.ceil(lo / PIPE_PITCH), k1 = Math.floor(hi / PIPE_PITCH);
    for (var q = k0; q <= k1; q++) {
      if (hash(q, salt) > keep) continue;
      var r = (q + (hash(q, salt + 1) - 0.5) * 0.6) * PIPE_PITCH;
      var n = 1 + Math.floor(Math.pow(hash(q, salt + 2), 1.8) * 3);
      var pw = lerp(0.0022, 0.0042, hash(q, salt + 3));
      if (r - n * pw < lo || r + n * pw > hi) continue;
      var a = CC.Rupture.edgeAt(w, side, r, true);
      if (a === null) continue;
      out.push({ role: role, r: r, a: a, side: side, n: n, w: pw,
                 len: lerp(0.008, 0.022, hash(q, salt + 4)),
                 droop: lerp(-0.5, 0.5, hash(q, salt + 5)),
                 seed: hash(q, salt + 6) });
    }
  }

  /* Snapped pillars on one void, `L` the hollow layer, `next` the cut below
   * it (the ledge's own edge), or null. */
  function voidStubs(out, w, L, next, side, pillars, salt) {
    var g = L.gap, h = g.outer - g.inner;
    /* From the ceiling, where it is torn off: one or two at the edge. */
    if (g.outer > w.floor + h * 0.3) {
      var n = 1 + Math.floor(hash(g.outer * 991, salt) * 2);
      for (var j = 0; j < n; j++) {
        var a = CC.Rupture.edgeAt(w, side, g.outer, true);
        if (a === null) break;
        var wd = j ? 0.0032 : 0.0075;
        out.push({ role: L.role, r0: g.outer,
                   r1: g.outer - h * lerp(0.25, 0.65, hash(j, salt + 2)),
                   angle: a - side * (wd * 0.6 + j * 0.006) / g.outer,
                   width: wd, side: side,
                   lean: lerp(0.2, 0.9, hash(j, salt + 3)), seed: hash(j, salt + 4) });
      }
    }
    /* From the floor ledge, at the bearings of the real pillars that stood
     * on it: between the next step's edge and this one's. */
    if (!next || g.inner < w.floor) return;
    var aIn = CC.Rupture.edgeAt(w, side, g.inner, true);
    var aOut = CC.Rupture.edgeAt(w, side, g.inner + 1e-4, false);
    if (aIn === null || aOut === null) return;
    var lo = Math.min(aIn, aOut), hi = Math.max(aIn, aOut);
    for (var i = 0; i < pillars.length; i++) {
      var p = pillars[i];
      if (p.role !== L.role) continue;
      var pa = p.angle;
      /* Bring the pillar's bearing within a turn of the edge's. */
      pa += Math.round((lo - pa) / TAU) * TAU;
      if (pa <= lo || pa >= hi) continue;
      var u = hash(pa * 1000, salt + 9);
      if (u > STUB_KEEP) continue;
      out.push({ role: L.role, r0: g.inner,
                 r1: g.inner + h * lerp(0.20, 0.75, hash(pa * 1000, salt + 10)),
                 angle: pa, width: p.width, side: side,
                 lean: lerp(-0.6, 0.9, hash(pa * 1000, salt + 11)), seed: p.seed });
    }
  }

  /* A real run the wound cuts: where, going outward along it, it first
   * enters the wound. */
  function runEnds(out, w, conduits) {
    for (var i = 0; i < conduits.length; i++) {
      var c = conduits[i];
      for (var r = c.r0; r <= c.r1; r += RUN_STEP) {
        if (!CC.Rupture.inside(w, r, c.angle)) continue;
        if (r > c.r0 + 0.004) {
          out.push({ role: c.role, r: r, angle: c.angle, n: c.n, w: c.w,
                     seed: c.seed });
        }
        break;
      }
    }
  }

  function torn(body, w, spec, params, extras) {
    var L = byRole(body);
    var surface = surfaceOf(body);
    var density = params.detailDensity === undefined ? 0.65 : params.detailDensity;
    var dk = lerp(0.6, 1.25, density);
    var pipes = spec.pipes || [];
    var m = { plates: [], stubs: [], pipes: [], ends: [] };
    for (var ci = 0; ci < w.cuts.length; ci++) {
      var c = w.cuts[ci], lay = L[c.role];
      if (!lay) continue;
      var lo = Math.max(c.r0, lay.inner, w.floor), hi = Math.min(c.r1, lay.outer);
      for (var s = -1; s <= 1; s += 2) {
        var salt = w.salt * 3 + ci * 101 + (s > 0 ? 0 : 53);
        if (hi > lo) {
          facePlates(m.plates, w, c.role, s, lo, hi, PLATE_KEEP * dk, salt);
          cornerPlates(m.plates, w, c.role, s, hi, hi >= surface - 1e-6 ? 1.5 : 1, salt + 7);
          if (pipes.indexOf(c.role) >= 0) {
            facePipes(m.pipes, w, c.role, s, lo, hi, PIPE_KEEP * dk, salt + 31);
          }
        }
        if (lay.gap && lay.gap.pillars) {
          voidStubs(m.stubs, w, lay, w.cuts[ci + 1] || null, s, extras.pillars || [], salt + 61);
        }
      }
    }
    runEnds(m.ends, w, extras.conduits || []);
    m.debris = CC.WoundDebris.build(body, w, params, surface);
    m.sparks = CC.WoundDebris.sparks(body, w, params, surface);
    return m;
  }

  /* A STYLE is its builder plus how the cut itself is made: `jag` scales the
   * serration and the floor's raggedness (gen/rupture.js), `rim` names how
   * the outline is stroked (draw/woundedge.js). */
  var styles = { torn: torn };
  var options = { torn: { jag: 1, rim: "scorch" } };

  /* The marks for one wound in the named style; null for a style nobody
   * registered. */
  function build(style, body, w, spec, params, extras) {
    var fn = styles[style];
    return fn ? fn(body, w, spec, params, extras) : null;
  }

  function register(style, fn, opts) {
    styles[style] = fn;
    options[style] = opts || {};
  }

  function option(style, key, dflt) {
    var o = options[style];
    return o && o[key] !== undefined ? o[key] : dflt;
  }

  return { build: build, register: register, option: option, styles: styles,
           /* For the other styles' files. */
           hash: hash, byRole: byRole, surfaceOf: surfaceOf };
})();
