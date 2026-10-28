/* Shell walls — what is seen THROUGH a void and DOWN a shaft.
 *
 * A void under a hollow layer (js/gen/shells.js) used to show the starfield,
 * which read as a cut through to space rather than as a hollow inside a
 * structure. So a void gets a back wall: the far side of the hollow, dark,
 * ruled into decks, and densely dotted with small lights — "countless
 * facilities" (the user, Session Z). A shaft gets the same treatment in its
 * own register: a narrower, darker back wall with a column of signal lights
 * running down it, so one shaft reads as one lit route to the heart.
 *
 * PROPERTIES OF A GAP AND A SLOT, NOT OF A BODY. Any layer carrying `gap`
 * gets a wall, and any body carrying `shafts` gets the shaft walls; nothing
 * here or in js/draw/shellwalls.js knows which archetype it is drawing.
 *
 * Counts come from Detail density and BODY-SPACE AREA, never from pixels, so
 * the same body carries the same lights at every resolution. Rolled from
 * their own streams, so a wall's lights never reshuffle a pillar. */

var CC = CC || {};

CC.ShellWalls = (function () {
  "use strict";

  var TAU = Math.PI * 2;
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* Lights per unit of body-space area at Detail density 0 and 1, as rows
   * (facilities) and as lone points. A void at the surface is about 0.2 of
   * body area, so the default density puts several hundred in it. */
  var ROWS_PER_AREA = [90, 300];
  var LONE_PER_AREA = [500, 1700];
  /* Spacing between lights in one facility row, and between decks, in body
   * radius. The same at every depth, because a window is a window. */
  var LIGHT_PITCH = 0.0055;
  var DECK_PITCH = 0.0085;
  /* Signal lights down a shaft, one per this much depth. */
  var SIGNAL_PITCH = 0.030;

  /* Light kinds: 0 the accent hue, 1 a cold white, 2 a warm warning amber
   * (3, the emergency red, only on emergency power: gen/activity.js).
   * Mostly accent, which is what makes the colour read as the body's. */
  function lightKind(r) {
    var u = r();
    return u < 0.62 ? 0 : (u < 0.90 ? 1 : 2);
  }

  /* Push a light unless the body's activity has it dark (gen/activity.js);
   * on emergency power it burns the emergency red, kind 3. */
  function push(lights, L, layer, salt) {
    var st = CC.Activity.gate(layer, L.r, L.a !== undefined ? L.a : L.x, salt);
    if (st === 0) return;
    if (st === 2) L.k = 3;
    lights.push(L);
  }

  function blocked(a, rMid, shafts) {
    if (!shafts) return false;
    for (var s = 0; s < shafts.length; s++) {
      if (CC.Shells.angDist(a, shafts[s].angle) <
          CC.Shells.halfAngle(shafts[s].half, rMid)) return true;
    }
    return false;
  }

  function wallFor(L, density, shafts, seed) {
    var g = L.gap;
    var r = CC.RNG.stream(seed, "detail/wall/" + L.role);
    var T = g.outer - g.inner;
    var mid = (g.inner + g.outer) / 2;
    var area = Math.PI * (g.outer * g.outer - g.inner * g.inner);

    /* DECKS — floor lines at an even pitch across the void, held clear of
     * both faces. Facility rows sit on them, which is what makes the lights
     * read as storeys rather than as stars. */
    var nDecks = Math.max(2, Math.round(T / DECK_PITCH));
    var decks = [];
    for (var k = 0; k < nDecks; k++) {
      decks.push(g.inner + T * (0.12 + 0.76 * (nDecks === 1 ? 0.5 : k / (nDecks - 1))));
    }

    var lights = [];
    var rows = Math.round(area * lerp(ROWS_PER_AREA[0], ROWS_PER_AREA[1], density));
    for (k = 0; k < rows; k++) {
      var deck = decks[Math.floor(r() * decks.length)];
      var len = 3 + Math.floor(r() * r() * 14);
      var step = LIGHT_PITCH / deck;
      var a0 = r() * TAU;
      var kind = lightKind(r);
      /* A facility is lit or dark as a whole, and a few windows in each
       * are out. */
      var lit = 0.45 + 0.55 * r();
      for (var j = 0; j < len; j++) {
        if (r() < 0.12) continue;
        var a = a0 + j * step;
        if (blocked(a, mid, shafts)) continue;
        push(lights, { r: deck - T * 0.06, a: a, k: kind, b: lit }, L, 1);
      }
    }
    /* BUSIER PAST THE DEFAULT (gen/activity.js `busy`): more facilities
     * lit, rolled from a stream of their own so the ones already there
     * never move. */
    var extra = Math.round(rows * (CC.Activity.busy(L) - 1));
    var rh = CC.RNG.stream(seed, "detail/wall/hive/" + L.role);
    for (k = 0; k < extra; k++) {
      var hd = decks[Math.floor(rh() * decks.length)];
      var hn = 3 + Math.floor(rh() * rh() * 14), ha0 = rh() * TAU, hk = lightKind(rh);
      var hb = 0.45 + 0.55 * rh();
      for (var hj = 0; hj < hn; hj++) {
        if (rh() < 0.12) continue;
        var hA = ha0 + hj * LIGHT_PITCH / hd;
        if (blocked(hA, mid, shafts)) continue;
        push(lights, { r: hd - T * 0.06, a: hA, k: hk, b: hb }, L, 5);
      }
    }
    var lone = Math.round(area * lerp(LONE_PER_AREA[0], LONE_PER_AREA[1], density));
    for (k = 0; k < lone; k++) {
      var la = r() * TAU;
      if (blocked(la, mid, shafts)) continue;
      push(lights, { r: g.inner + T * (0.08 + 0.84 * r()), a: la,
                     k: lightKind(r), b: 0.25 + 0.6 * r() }, L, 2);
    }

    /* RIBS — the back wall's structural frame, evenly spaced, about twice
     * as many as the pillars so the two rhythms do not coincide. */
    var ribs = Math.max(12, Math.round(lerp(140, 380, density) * mid));
    return { role: L.role, inner: g.inner, outer: g.outer, decks: decks,
             ribs: ribs, ribStart: r() * TAU / ribs, lights: lights };
  }

  /* One wall per shaft, from the floor of the deepest shafted layer's void
   * (or that layer's floor) to the top of the outermost. */
  function shaftWalls(body, density, seed) {
    if (!body.shafts) return [];
    var top = 0, bottom = Infinity, role = null, topL = null;
    for (var i = 0; i < body.layers.length; i++) {
      var L = body.layers[i];
      if (!L.shafted || L.outward) continue;
      if (L.outer > top) { top = L.outer; role = L.role; topL = L; }
      bottom = Math.min(bottom, L.gap ? L.gap.inner : L.inner);
    }
    if (!(bottom < top)) return [];
    var out = [];
    for (var s = 0; s < body.shafts.length; s++) {
      var sh = body.shafts[s];
      var r = CC.RNG.stream(seed, "detail/shaftwall/" + s);
      var n = Math.max(4, Math.round((top - bottom) / SIGNAL_PITCH));
      var signals = [];
      var phase = r();
      for (var k = 0; k < n; k++) {
        /* Every fourth a beacon in the warning colour, the rest the accent;
         * a few dimmed, as a run of lights never all burns at once. */
        push(signals, { r: bottom + (top - bottom) * ((k + phase) / n),
                        a: sh.angle, k: (k % 4 === 3) ? 2 : 0,
                        b: r() < 0.15 ? 0.35 : 1 }, topL, 3);
      }
      /* Faint lights on the shaft's own walls — hatches and landings. */
      var side = [];
      var ns = Math.round(lerp(20, 60, density) * (top - bottom) / 0.5);
      for (k = 0; k < ns; k++) {
        push(side, { r: lerp(bottom, top, r()), x: (r() < 0.5 ? -1 : 1) * (0.55 + 0.3 * r()),
                     k: lightKind(r), b: 0.3 + 0.5 * r() }, topL, 4 + s);
      }
      out.push({ role: role, angle: sh.angle, half: sh.half, r0: bottom, r1: top,
                 signals: signals, side: side });
    }
    return out;
  }

  function build(body, params, seed) {
    var density = params.detailDensity === undefined ? 0.65 : params.detailDensity;
    var voids = [];
    for (var i = 0; i < body.layers.length; i++) {
      var L = body.layers[i];
      if (L.gap) voids.push(wallFor(L, density, body.shafts, seed));
    }
    var shafts = shaftWalls(body, density, seed);
    if (!voids.length && !shafts.length) return null;
    return { voids: voids, shafts: shafts };
  }

  return { build: build };
})();
