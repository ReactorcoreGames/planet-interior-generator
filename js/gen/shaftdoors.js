/* Shaft doors — blast doors down the access shafts and covers over their
 * mouths (js/draw/shaftdoors.js draws them).
 *
 * Two general properties of an archetype's `shafts` (gen/shells.js), which
 * the machine world's Blast doors and Shaft covers traits switch on through
 * `sets` (gen/traitsets.js):
 *
 *   shafts: { ...,
 *     doors: { thick },      an airlock pair where the shaft crosses each
 *                            shell below the outermost: a slab at the top and
 *                            the bottom of the band, in two halves
 *     covers: { thick }      a silo cover over the mouth, where the shaft
 *                            meets space: a plate in the mouth that slides
 *                            aside into the hull
 *   }
 *
 * OPEN OR SHUT BY OPERATIONAL STATUS. A door is a route's state, and a
 * route's state is traffic: a derelict is sealed, a busy world has most of
 * its doors open. Each door asks its layer's activity gate
 * (CC.Activity.gate) with a stable hash of where it is, so doors open in
 * place as the dial is dragged: lit, it is open with a chance that rises
 * with the hive multiplier; dark, shut; on emergency power, jammed part
 * open. An airlock pair shares one state, so a pair never reads as one door
 * open and its twin shut by chance.
 *
 * Output { doors: [{ role, r0, r1, angle, half, open, power }],
 *          covers: [{ role, r0, r1, angle, half, slide, open, power }] },
 * lengths in body radius; `half` is the slot's body-space half-width, `open`
 * 0 shut to 1 fully open. Null on a body with neither. */

var CC = CC || {};

CC.ShaftDoors = (function () {
  "use strict";

  function lerp(a, b, t) { return a + (b - a) * t; }
  function hash(x, salt) {
    var s = Math.sin(x * 157.3 + salt * 271.9) * 43758.5453;
    return s - Math.floor(s);
  }

  /* The chance a powered door stands open, before the hive multiplier. */
  var OPEN = 0.55;

  /* 0 shut .. 1 open, and the door's power (1 lit, 0 dark, 2 emergency). */
  function state(layer, x, y, salt) {
    var g = CC.Activity.gate(layer, x, y, salt);
    if (g === 0) return { open: 0, power: 0 };
    if (g === 2) return { open: lerp(0.10, 0.35, hash(x, y + salt)), power: 2 };
    var p = Math.min(0.9, OPEN * CC.Activity.busy(layer));
    /* Never all the way: the leaves' jaws stay showing, so an open door
     * still reads as a door. */
    return { open: hash(x + 0.5, y + salt) < p ? lerp(0.55, 0.78, hash(y, x + salt)) : 0, power: 1 };
  }

  function build(archetype, body, params) {
    var spec = archetype && archetype.shafts;
    if (!spec || !body.shafts || (!spec.doors && !spec.covers)) return null;
    var shafted = [];
    for (var i = 0; i < body.layers.length; i++) {
      var L = body.layers[i];
      if (L.shafted && !L.outward) shafted.push(L);
    }
    if (!shafted.length) return null;
    var top = shafted[0];
    var out = { doors: [], covers: [] };
    for (var s = 0; s < body.shafts.length; s++) {
      var sh = body.shafts[s];
      if (spec.doors) {
        var thick = spec.doors.thick || 0.012;
        for (i = 1; i < shafted.length; i++) {
          var D = shafted[i];
          if (D.thickness < thick * 3) continue;
          var st = state(D, s + 1, i, 41);
          var inset = thick * 0.4;
          out.doors.push({ role: D.role, r0: D.outer - inset - thick, r1: D.outer - inset,
                           angle: sh.angle, half: sh.half, open: st.open, power: st.power });
          out.doors.push({ role: D.role, r0: D.inner + inset, r1: D.inner + inset + thick,
                           angle: sh.angle, half: sh.half, open: st.open, power: st.power });
        }
      }
      if (spec.covers) {
        var sv = state(top, s + 1, 0, 43);
        /* Which way it slides, per shaft. */
        /* Seated in the top of the shaft, flush with the hull: the body is
         * clipped to its surface here. */
        var ct = spec.covers.thick || 0.012;
        out.covers.push({ role: top.role, r0: top.outer - ct, r1: top.outer,
                          angle: sh.angle, half: sh.half, slide: hash(s, 47) < 0.5 ? -1 : 1,
                          open: sv.open, power: sv.power });
      }
    }
    return out.doors.length || out.covers.length ? out : null;
  }

  return { build: build };
})();
