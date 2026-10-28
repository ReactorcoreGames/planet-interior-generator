/* Glyphs — the `glyph` element: small built objects standing in space or on
 * a layer, drawn as one recognisable silhouette repeated (MACHINE-WORLDS.md:
 * defense platforms now; satellites, ships, mines and beacons are glyphs
 * too, as later traits).
 *
 * ONE DESIGN PER ELEMENT RECIPE, rolled once from its stream and shared by
 * every instance, so a ring of them reads as a built constellation: the
 * same unit repeated, not a crowd of different things. Size tiers change
 * the scale of the design, never the design.
 *
 * `glyph` on the recipe names the family; only "platform" exists yet:
 *
 *   hub     the body of the station: a ring, a square, a hexagon or a
 *           diamond, `hub` of the platform's half-span
 *   arms    2, 3 or 4 spars from the hub, square to the body or set at 45°
 *   ends    what each spar carries: solar wings across it, a pod, or a rim
 *           joining every spar's tip into a wheel
 *   guns    1 or 2 barrels pointing away from the body: these are weapons
 *   light   which of the void lights' three colours the hub burns in
 *           (draw/shellwalls.js lightHsv): mostly the accent
 *
 * Placement is the ordinary scatter (gen/elemgen.js), so `spacing: "even"`
 * and `jitter` on the recipe space them as they space any detail. `size` is
 * the platform's half-span in body radius. Drawn by
 * draw/primitives/glyph.js.
 *
 * gen/elemgen.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  function pick(list, rng) { return list[Math.floor(rng() * list.length)]; }

  function platform(rng) {
    var arms = pick([2, 3, 4, 4], rng);
    return {
      hubShape: pick(["ring", "square", "hex", "diamond"], rng),
      hub: 0.26 + rng() * 0.14,
      arms: arms,
      /* Square to the body (a spar points down at it) or turned 45°. A
       * three-armed station always puts one spar toward the body. */
      turn: arms === 3 ? 0 : (rng() < 0.5 ? 0 : Math.PI / arms),
      ends: pick(["wings", "wings", "pod", "rim"], rng),
      wing: 0.30 + rng() * 0.25,
      guns: rng() < 0.6 ? 1 : 2,
      gun: 0.35 + rng() * 0.30,
      light: rng() < 0.75 ? 0 : 1
    };
  }

  CC.ElemGen.registerBuilder("glyph", function (recipe, layer, plan, count, rng, opts) {
    var design = platform(rng);
    var shape = recipe.glyph || "platform";
    return CC.ElemGen.scatter("glyph", recipe, layer, plan, rng, opts, function (el) {
      el.glyph = shape;
      el.design = design;
      /* Lit, dark or on emergency power (gen/activity.js). */
      el.power = CC.Activity.gate(layer, el.radius, el.angle, 41);
    });
  });
})();
