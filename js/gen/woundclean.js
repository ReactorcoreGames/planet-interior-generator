/* Wound edge, the clean style — an unfinished world rather than a wrecked
 * one (MACHINE-WORLDS.md § "Under construction", D249).
 *
 * The same wound as the torn style, cut the same way as the dial falls; only
 * the faces differ. `jag: 0` squares the cut off, so each step ends on a
 * straight face and a flat floor, terraced like a building going up, and the
 * outline is trimmed rather than scorched (`rim: "trim"`). No debris, no
 * fire. Instead the work on it:
 *
 *   posts     the next level's pillars, standing full height on each void's
 *             floor ledge at the real pillars' bearings, waiting for the
 *             ceiling that is not there yet
 *   frame     each missing shell standing as bare steel frame before it is
 *             plated: ring girders along its top and bottom and ribs
 *             between them, reaching in from both faces, some meeting
 *   scaffold  towers against the faces, from each step's floor to its top
 *   cranes    at the surface lips, a mast on the hull with its jib reaching
 *             over the mouth and a hook let down into it
 *   sparks    welding glints on the faces and the scaffold, and a beacon on
 *             each crane, gated by Operational status as the torn style's
 *             fire is, so a stalled site is dark
 *
 * Every mark is pinned by a hash of what does not move as the wound grows
 * (absolute radius, side, step), so the site grows in place. Lengths in body
 * radius. Registered with js/gen/woundedge.js, which must load first. */

(function () {
  "use strict";

  var E = CC.WoundEdge;
  var hash = E.hash;
  var TAU = Math.PI * 2;
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* Towers: their depth into the gap and the pitch of their lifts. */
  var TOWER_KEEP = 0.85;
  /* The frame's rib pitch, in body radius along the arc. */
  var RIB_PITCH = 0.016;
  /* Welding glints, one candidate per pitch of face. */
  var GLINT_PITCH = 0.010;
  var GLINT_KEEP = 0.40;

  function lit(lay, x, y, salt) {
    return lay ? CC.Activity.gate(lay, x, y, salt) : 1;
  }

  /* The next level's pillars on one void's floor ledge, between the next,
   * narrower step's edge and this one's. */
  function posts(out, w, L, side, pillars, salt) {
    var g = L.gap;
    if (g.inner < w.floor) return;
    var aIn = CC.Rupture.edgeAt(w, side, g.inner, true);
    var aOut = CC.Rupture.edgeAt(w, side, g.inner + 1e-4, false);
    if (aIn === null || aOut === null) return;
    var lo = Math.min(aIn, aOut), hi = Math.max(aIn, aOut);
    for (var i = 0; i < pillars.length; i++) {
      var p = pillars[i];
      if (p.role !== L.role) continue;
      var pa = p.angle + Math.round((lo - p.angle) / TAU) * TAU;
      if (pa <= lo || pa >= hi) continue;
      out.push({ role: L.role, r0: g.inner, r1: g.outer, angle: pa,
                 width: p.width, side: side, clean: true, seed: p.seed });
    }
  }

  function build(body, w, spec, params, extras) {
    var L = E.byRole(body);
    var surface = E.surfaceOf(body);
    var density = params.detailDensity === undefined ? 0.65 : params.detailDensity;
    var dk = lerp(0.6, 1.25, density);
    var m = { stubs: [], frame: [], scaffold: [], sparks: [] };
    var pillars = extras.pillars || [];
    for (var ci = 0; ci < w.cuts.length; ci++) {
      var c = w.cuts[ci], lay = L[c.role];
      if (!lay) continue;
      var lo = Math.max(c.r0, w.floor), hi = Math.min(c.r1, surface);
      var busy = CC.Activity.busy(lay);
      for (var s = -1; s <= 1; s += 2) {
        var salt = w.salt * 3 + ci * 101 + (s > 0 ? 0 : 53);
        if (lay.gap && lay.gap.pillars) posts(m.stubs, w, lay, s, pillars, salt);
        /* A tower against the face, floor to top. */
        if (hi - lo > 0.012 && hash(ci + 0.5, salt + 1) < TOWER_KEEP) {
          var a = CC.Rupture.edgeAt(w, s, (lo + hi) / 2, true);
          if (a !== null) {
            m.scaffold.push({ kind: "tower", role: c.role, r0: lo, r1: hi, a: a, side: s,
                              depth: lerp(0.010, 0.016, hash(ci, salt + 2)),
                              lift: lerp(0.007, 0.010, hash(ci, salt + 3)) });
          }
        }
        /* Welding glints on the face. */
        for (var q = Math.ceil(lo / GLINT_PITCH); q <= Math.floor(hi / GLINT_PITCH); q++) {
          if (hash(q, salt + 5) > Math.min(0.9, GLINT_KEEP * dk * busy)) continue;
          var r = (q + (hash(q, salt + 6) - 0.5) * 0.8) * GLINT_PITCH;
          if (r < lo || r > hi) continue;
          var gl = lit(lay, r, s, 101);
          if (!gl) continue;
          var ga = CC.Rupture.edgeAt(w, s, r, true);
          if (ga === null) continue;
          var off = lerp(0.002, 0.014, hash(q, salt + 7));
          m.sparks.push({ kind: 0, role: c.role, r: r, a: ga - s * off / r,
                          size: lerp(0.0012, 0.0028, hash(q, salt + 8)),
                          b: (gl === 2 ? 0.4 : 1) * lerp(0.6, 1, hash(q, salt + 9)) });
        }
      }
      /* The shell's frame across the cut, from both faces in. A hollow
       * layer's frame is its band alone: the void under it stays open. */
      var fr0 = Math.max(w.floor, lay.inner), fr1 = Math.min(c.r1, lay.outer, surface);
      if (fr1 - fr0 > 0.008) {
        var mid = (fr0 + fr1) / 2;
        var fR = CC.Rupture.edgeAt(w, 1, mid, true), fL = CC.Rupture.edgeAt(w, -1, mid, true);
        if (fR !== null && fL !== null) {
          var fs = w.salt * 13 + ci * 29;
          /* Two in five meet in the middle; the rest stop short. */
          var meet = hash(ci + 0.7, fs) < 0.4;
          m.frame.push({ kind: "frame", role: c.role, r0: fr0, r1: fr1, aL: fL, aR: fR,
                         reachL: meet ? 0.5 : lerp(0.15, 0.45, hash(ci, fs + 1)),
                         reachR: meet ? 0.5 : lerp(0.15, 0.45, hash(ci, fs + 2)),
                         pitch: RIB_PITCH, girder: lerp(0.0035, 0.0055, hash(ci, fs + 3)) });
        }
      }
    }
    /* Cranes at the surface lips: the main wound always has one. */
    var top = Math.min(surface, w.cuts[0].r1) - 1e-4;
    var half = 0;
    var tR = CC.Rupture.edgeAt(w, 1, top, true), tL = CC.Rupture.edgeAt(w, -1, top, true);
    if (tR !== null && tL !== null) half = Math.abs(tR - tL) / 2 * surface;
    for (var side = -1; side <= 1; side += 2) {
      var cs = w.salt * 7 + (side > 0 ? 3 : 9);
      var first = w.size === 1 && side === (hash(1, w.salt) < 0.5 ? -1 : 1);
      if (!first && hash(2, cs) > 0.55) continue;
      var ea = side > 0 ? tR : tL;
      if (ea === null || half < 0.01) continue;
      var h = lerp(0.045, 0.085, hash(3, cs)) * Math.min(1.3, 0.6 + half * 4);
      var jib = Math.min(half * 1.6, lerp(0.06, 0.14, hash(4, cs)));
      var hullLay = L[w.cuts[0].role];
      m.scaffold.push({ kind: "crane", role: w.cuts[0].role, r: surface,
                        a: ea + side * 0.006 / surface, side: side, h: h, jib: jib,
                        drop: lerp(0.25, 0.9, hash(5, cs)) * (surface - w.floor) });
      /* Its beacon. */
      var bl = lit(hullLay, side, w.salt, 107);
      if (bl) {
        m.sparks.push({ kind: 0, role: w.cuts[0].role, r: surface + h, a: ea + side * 0.006 / surface,
                        size: 0.0030, b: bl === 2 ? 0.5 : 1 });
      }
    }
    return m;
  }

  E.register("clean", build, { jag: 0, rim: "trim" });
})();
