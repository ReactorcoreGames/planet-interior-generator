/* Fixtures — the `fixture` element: the built equipment a machine layer
 * carries, one recognisable unit repeated (MACHINE-WORLDS.md § "Layer
 * details"). `fixture` on the recipe names which:
 *
 *   fins     a radiator bank: a comb of thin radial fins at one even pitch,
 *            standing on a manifold, warm at the root where the heat comes in
 *   sensor   a sensor array: a plinth along the deck carrying a row of
 *            masts, each topped by a dish or a lattice antenna, each with a
 *            light at its tip
 *   dock     a docking port: a bay cut down into the band from its outer
 *            face, a cradle at its floor, approach lights down both walls,
 *            sometimes a craft in it
 *   truss    a lattice frame: bays of a fixed pitch, braced, laid either
 *            along the band as a girder or across it as a tower
 *   gear     a gear train: a toothed wheel and 0-3 smaller ones meshing
 *            with it, each turned the opposite way to its neighbour
 *   rotor    a turbine disc: a hub, a ring of angled blades, a casing
 *
 * ONE DESIGN PER RECIPE, rolled once and shared by every instance, as the
 * glyph's platforms are (gen/glyph.js): a ring of identical radiator banks
 * reads as built, a crowd of different ones does not. Size tiers scale the
 * design and never change it, so a smaller fin bank is shorter and holds
 * fewer fins at the SAME pitch, and a smaller gear has fewer teeth of the
 * same size. A design may also `place` each instance: lay out a gear's
 * train, a truss's bays.
 *
 * WHERE A UNIT STANDS. Fins and sensors stand on a floor: `radius` is the
 * root, the depth range's inner edge, so a ring of them stands on one deck
 * line whatever the tier; `size` is the height. `hang: true` hangs them
 * from the range's OUTER edge instead, pointing in: a radiator bank on the
 * ceiling mirroring one on the floor. A dock hangs from the band's outer
 * face, because a port opens outward. Trusses, gears and rotors sit where
 * the scatter put them, `radius` their centre. `width` (body radius) is a
 * unit's extent round the band.
 *
 * Placement is the ordinary scatter (gen/elemgen.js), so `spacing: "even"`
 * and `jitter` space them. A unit that would straddle an access shaft is
 * dropped: half a dock clipped by a slot reads as a fault, an empty slot in
 * a regular ring reads as the shaft interrupting it.
 *
 * AMONG WHAT IS ALREADY THERE (gen/claims.js). `claim: true` records each
 * unit's footprint; `yield: true` keeps a unit out of every footprint
 * claimed before it on the layer, its own recipe's included. A yielding
 * unit that is not evenly spaced tries a few other places before it is
 * dropped, so a set filling the gaps between the pipes keeps its count.
 *
 * ON THE SURFACE. A recipe with `seat` (gen/details.js) is drawn on the
 * body's real outline in the unclipped pass, so a mast can stand out into
 * space and a dock opens onto it.
 *
 * Drawn by draw/primitives/fixtures.js and draw/primitives/machinery.js.
 *
 * gen/elemgen.js and gen/claims.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = Math.PI * 2;
  function pick(list, rng) { return list[Math.floor(rng() * list.length)]; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* Body-space pitch of a radiator's fins: the same comb on every bank. */
  var FIN_PITCH = 0.0042;
  /* Body-space pitch of a gear's teeth, round its rim. */
  var TOOTH_PITCH = 0.0036;

  /* A footprint in the unit's own frame: x across, y up from `radius`. */
  function foot(el, x0, x1, y0, y1) { el.foot = [x0, x1, y0, y1]; }

  /* A GEAR TRAIN. The first wheel at the unit's centre, each further one
   * smaller and meshing with the one before it: centres a tooth's depth
   * less than the sum of the radii apart, in a direction that keeps it
   * clear of every wheel already laid. */
  function train(el, r, d) {
    var R = el.size;
    var wheels = [{ x: 0, y: 0, R: R, spin: 0 }];
    var n = Math.floor(r() * (d.train + 1));
    for (var i = 0; i < n; i++) {
      var prev = wheels[wheels.length - 1];
      var Rn = prev.R * pick([0.45, 0.55, 0.7], r);
      var dist = prev.R + Rn - TOOTH_PITCH * 0.7;
      for (var tries = 0; tries < 6; tries++) {
        var t = r() * TAU;
        var w = { x: prev.x + Math.cos(t) * dist, y: prev.y + Math.sin(t) * dist,
                  R: Rn, spin: (wheels.length % 2) * 0.5 };
        var clear = wheels.every(function (o) {
          return o === prev || Math.hypot(o.x - w.x, o.y - w.y) > o.R + w.R + TOOTH_PITCH;
        });
        if (clear) { wheels.push(w); break; }
      }
    }
    el.wheels = wheels;
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    wheels.forEach(function (w) {
      x0 = Math.min(x0, w.x - w.R); x1 = Math.max(x1, w.x + w.R);
      y0 = Math.min(y0, w.y - w.R); y1 = Math.max(y1, w.y + w.R);
    });
    el.width = x1 - x0;
    foot(el, x0, x1, y0, y1);
  }

  var DESIGNS = {
    fins: {
      design: function (rng) {
        return {
          /* Width of a bank against its height. */
          aspect: lerp(0.7, 1.3, rng()),
          /* Every few fins a heavier one, a stiffener: 0 for none. */
          brace: pick([0, 4, 5, 6], rng),
          /* Fins stepped down at the ends of the bank, or square. */
          stepped: rng() < 0.5
        };
      },
      place: function (el) {
        el.width = el.size * el.design.aspect;
        el.fins = Math.max(2, Math.floor(el.width / FIN_PITCH));
        foot(el, -el.width / 2, el.width / 2, 0, el.size);
      }
    },
    sensor: {
      design: function (rng) {
        var masts = 2 + Math.floor(rng() * 4);
        var tops = [];
        var mode = pick(["dish", "mast", "mixed"], rng);
        for (var i = 0; i < masts; i++) {
          tops.push(mode === "mixed" ? (i % 2 ? "mast" : "dish") : mode);
        }
        return {
          masts: masts,
          tops: tops,
          /* The middle mast stands tallest, or they all stand level. */
          crown: rng() < 0.6,
          aspect: lerp(0.9, 1.4, rng()),
          light: rng() < 0.7 ? 0 : 2
        };
      },
      place: function (el) {
        el.width = el.size * el.design.aspect;
        foot(el, -el.width / 2, el.width / 2, 0, el.size);
      }
    },
    dock: {
      design: function (rng) {
        return {
          aspect: lerp(1.3, 2.0, rng()),
          /* A share of berths with a craft in them. */
          occupied: lerp(0.35, 0.75, rng()),
          lights: 3 + Math.floor(rng() * 4)
        };
      },
      place: function (el, r, layer) {
        el.width = el.size * el.design.aspect;
        /* More berths taken in a busier port (gen/activity.js `busy`). */
        el.craft = r() < Math.min(0.95, el.design.occupied * CC.Activity.busy(layer));
        /* The mouth as well as the bay: nothing stands in front of a port. */
        foot(el, -el.width * 0.65, el.width * 0.65, -el.size, el.size);
      }
    },
    truss: {
      design: function (rng) {
        return {
          /* Body-space bay: square, one pitch for every frame. */
          bay: lerp(0.0080, 0.0110, rng()),
          brace: pick(["x", "zig", "zig", "k"], rng),
          /* Share of frames laid across the band, as towers. */
          towers: lerp(0.3, 0.6, rng())
        };
      },
      place: function (el, r) {
        var d = el.design;
        var long = Math.max(2, Math.round(el.size / d.bay));
        var short = 1 + (r() < 0.35 ? 1 : 0);
        var tower = r() < d.towers;
        el.cols = tower ? short : long;
        el.rows = tower ? long : short;
        el.width = el.cols * d.bay;
        el.height = el.rows * d.bay;
        foot(el, -el.width / 2, el.width / 2, -el.height / 2, el.height / 2);
      }
    },
    gear: {
      design: function (rng) {
        return {
          /* How many wheels a train may add to the first. */
          train: 1 + Math.floor(rng() * 3),
          spokes: pick([0, 3, 4, 5, 6], rng),
          /* Lightening holes in a spokeless web. */
          holes: 4 + Math.floor(rng() * 3),
          hub: lerp(0.22, 0.34, rng())
        };
      },
      place: function (el, r) {
        train(el, r, el.design);
        el.teeth = el.wheels.map(function (w) {
          return Math.max(8, Math.round(TAU * w.R / TOOTH_PITCH));
        });
      }
    },
    rotor: {
      design: function (rng) {
        return {
          blades: pick([12, 16, 18, 24], rng),
          /* Blade lean, radians: a turbine's blades are set at an angle. */
          lean: lerp(0.35, 0.7, rng()) * (rng() < 0.5 ? -1 : 1),
          hub: lerp(0.24, 0.36, rng()),
          casing: rng() < 0.7
        };
      },
      place: function (el) {
        el.width = el.size * 2;
        foot(el, -el.size, el.size, -el.size, el.size);
      }
    }
  };

  /* A unit's footprint as a claim box. */
  function boxOf(el) {
    var f = el.foot, up = el.hang ? -1 : 1;
    var r = Math.max(0.05, el.radius);
    var ya = el.radius + f[2] * up, yb = el.radius + f[3] * up;
    return { r0: Math.min(ya, yb), r1: Math.max(ya, yb),
             a0: el.angle + f[0] / r, a1: el.angle + f[1] / r };
  }

  /* True if the box comes within `pad` of a shaft slot ({from, to}). */
  function inSlot(slots, box, pad) {
    if (!slots) return false;
    var mid = (box.a0 + box.a1) / 2, half = (box.a1 - box.a0) / 2 + pad;
    for (var i = 0; i < slots.length; i++) {
      var sm = (slots[i].from + slots[i].to) / 2;
      var sh = Math.abs(slots[i].to - slots[i].from) / 2;
      var d = Math.abs(((mid - sm) % TAU + TAU + Math.PI) % TAU - Math.PI);
      if (d < half + sh) return true;
    }
    return false;
  }

  CC.ElemGen.registerBuilder("fixture", function (recipe, layer, plan, count, rng, opts) {
    var kind = DESIGNS[recipe.fixture] ? recipe.fixture : "fins";
    var D = DESIGNS[kind];
    var design = D.design(rng);
    var T = layer.thickness;
    var dLo = recipe.depth ? recipe.depth[0] : 0.05;
    var dHi = recipe.depth ? recipe.depth[1] : 0.95;
    var standing = kind === "fins" || kind === "sensor";
    var made = CC.ElemGen.scatter("fixture", recipe, layer, plan, rng, opts, function (el, r) {
      el.fixture = kind;
      el.design = design;
      /* A seated unit is re-seated on the outline at draw time; its claim
       * is made against the face it will stand on. */
      if (kind === "dock" || recipe.seat !== undefined) el.radius = layer.outer;
      else if (standing) el.radius = layer.inner + T * (recipe.hang ? dHi : dLo);
      if (recipe.hang) el.hang = true;
      D.place(el, r, layer);
    });

    /* Shafts first, then everything claimed before; a scattered unit that
     * lands badly tries again elsewhere. */
    var retry = recipe.yield && recipe.spacing !== "even" && !standing && kind !== "dock";
    var pad = 0.004;
    return made.filter(function (el) {
      for (var k = 0; k < (retry ? 30 : 1); k++) {
        if (k > 0) {
          el.angle = rng() * TAU;
          el.radius = CC.ElemGen.radiusAt(layer, CC.ElemGen.areaSpread(rng(), layer, dLo, dHi));
        }
        var box = boxOf(el);
        if (inSlot(layer.slots, box, pad / Math.max(0.05, el.radius))) continue;
        /* A unit set down in the band keeps wholly inside it, so the band's
         * clip never cuts a wheel in half. */
        if (!standing && kind !== "dock" &&
            (box.r0 < layer.inner + pad || box.r1 > layer.outer - pad)) continue;
        if (recipe.yield && CC.Claims.taken(layer, box, pad)) continue;
        if (recipe.claim) CC.Claims.claim(layer, box);
        /* Its lights on, dark or on emergency power by the body's
         * activity, and fewer craft in a quieter port (gen/activity.js). */
        el.power = CC.Activity.gate(layer, el.radius, el.angle, 51);
        if (el.craft && CC.Activity.roll(el.angle, 7, 52) > (layer.live === undefined ? 1 : layer.live)) el.craft = false;
        return true;
      }
      return false;
    });
  });

  CC.Fixtures = { FIN_PITCH: FIN_PITCH, TOOTH_PITCH: TOOTH_PITCH };
})();
