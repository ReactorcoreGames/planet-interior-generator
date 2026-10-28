/* Claims — who already stands where on a layer, so a later detail can sit
 * AMONG the earlier ones rather than over them.
 *
 * A recipe with `claim: true` records the boxes its marks take; a later
 * recipe on the same layer with `yield: true` keeps its marks out of them.
 * Recipe order decides who claims first. The plant's pipe bundles and the
 * chips claim, and the machinery's trusses and gears yield, so the new
 * equipment fills the open plate between them (Session Z); on the hull the
 * docks claim and the sensors yield.
 *
 * A box is { r0, r1, a0, a1 }: radii in body radius, angles in radians.
 * Cleared at the start of every layer's recipe walk (one hook in
 * gen/details.js), so a second build of the same body starts clean and
 * stays deterministic.
 *
 * NOTES. A recipe may also leave geometry for a later one on the same layer
 * to build on: the circuit `texture` notes its traces, and the data pulses
 * (gen/pulses.js) ride exactly those, rather than a second guess at where
 * the board's tracks run. Cleared with the boxes.
 *
 * Loaded before gen/materials.js, gen/cellgrid.js and gen/fixtures.js. */

var CC = CC || {};

CC.Claims = (function () {
  "use strict";

  var TAU = Math.PI * 2;
  var BOXES = typeof WeakMap === "function" ? new WeakMap() : null;
  var NOTES = typeof WeakMap === "function" ? new WeakMap() : null;

  function reset(layer) {
    if (BOXES && layer) BOXES.delete(layer);
    if (NOTES && layer) NOTES.delete(layer);
  }

  /* Every box claimed on the layer so far. */
  function boxes(layer) {
    var list = BOXES ? BOXES.get(layer) : null;
    return list ? list.slice() : [];
  }

  function note(layer, key, value) {
    if (!NOTES) return;
    var n = NOTES.get(layer);
    if (!n) NOTES.set(layer, n = {});
    n[key] = value;
  }

  function noted(layer, key) {
    var n = NOTES ? NOTES.get(layer) : null;
    return n ? n[key] : undefined;
  }

  function claim(layer, box) {
    if (!BOXES) return;
    var list = BOXES.get(layer);
    if (!list) BOXES.set(layer, list = []);
    list.push(box);
  }

  /* True if `box` comes within `pad` (body radius) of any claimed box.
   * `through`: ignore whole-circle claims (a ring's band), which a radial
   * run passes through rather than stopping at (gen/conduits.js). */
  function taken(layer, box, pad, through) {
    var list = BOXES ? BOXES.get(layer) : null;
    if (!list) return false;
    pad = pad || 0;
    var rm = (box.r0 + box.r1) / 2, rh = (box.r1 - box.r0) / 2;
    var am = (box.a0 + box.a1) / 2, ah = Math.abs(box.a1 - box.a0) / 2;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (through && Math.abs(b.a1 - b.a0) >= TAU - 1e-9) continue;
      if (Math.abs(rm - (b.r0 + b.r1) / 2) >= rh + (b.r1 - b.r0) / 2 + pad) continue;
      var r = Math.max(0.05, Math.min(box.r0, b.r0));
      var d = Math.abs((((am - (b.a0 + b.a1) / 2) % TAU) + TAU + Math.PI) % TAU - Math.PI);
      if (d < ah + Math.abs(b.a1 - b.a0) / 2 + pad / r) return true;
    }
    return false;
  }

  return { reset: reset, claim: claim, taken: taken, boxes: boxes,
           note: note, noted: noted };
})();
