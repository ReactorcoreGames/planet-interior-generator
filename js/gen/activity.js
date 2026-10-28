/* Activity — how alive a built body is, and which of its lights are on.
 *
 * MACHINE-WORLDS.md § "Operational status": derelict → automated → crewed,
 * and it should change the whole render rather than one glow. A general
 * archetype property names the parameter that drives it:
 *
 *   activity: { param: "interiorHeat" }
 *
 * and a general layer property says when that layer wakes:
 *
 *   lit: [wake, full]     the level at which its first lights come on and
 *                         the level by which all of them are on
 *
 * The machinery and the reactor wake early (automated: nobody home, the
 * plant running); habitation wakes late (crewed). So the dial reads as a
 * sequence rather than one dimmer.
 *
 * STAMPED ON THE LAYERS at the structure stage (js/gen/shells.js, the step
 * that already copies the built-body layer properties):
 *
 *   layer.live        0..1, the share of its lights that are on
 *   layer.emergency   0..1, the share of its dark lights that burn the
 *                     emergency red instead
 *   layer.busy        1 up to the default, then rising to 1 + HIVE at the
 *                     top of the dial: how much MORE than the approved look
 *                     is lit — more lit windows and chips, more traffic,
 *                     more craft docked (a builder multiplies its own lit
 *                     share by it)
 *
 * A body without `activity` gets none of them, and every gate below then answers
 * "lit", so no other archetype moves.
 *
 * WHICH LIGHTS — A STABLE ROLL PER LIGHT. `gate` hashes the light's own
 * position rather than drawing from a stream, so no geometry stream changes
 * and dragging the dial turns lights on IN PLACE: a light with a low roll is
 * among the first on and stays on. A builder decides what an off light is:
 * a window goes dark, a void light is dropped, a pulse is not sent.
 *
 * EMERGENCY POWER. Near the bottom of the dial the body is on emergency
 * power: every layer's lights are out except a few in the emergency red.
 * They hand over to normal lighting across 7-12%, as the plant wakes, and at
 * 0% they are out too, so a fully offline world is one setting away (the
 * user, Session Z: the band reads about 10% wide, and 0% is dead dark).
 *
 * THE HIVE. Past the default (55%) `busy` climbs, so the top of the dial is
 * busier than the approved look rather than equal to it (the user: wider
 * variety). Nothing below 55% moves. */

var CC = CC || {};

CC.Activity = (function () {
  "use strict";

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function smooth(a, b, x) {
    var t = clamp01((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  }

  /* The share of a dark layer's lights kept on emergency power, at the
   * bottom of the dial. */
  var EMERGENCY = 0.06;
  var EMERGENCY_RISE = [0.0, 0.04];
  var EMERGENCY_FADE = [0.07, 0.12];
  /* How much more is lit at the top of the dial, and where that starts. */
  var HIVE = 0.7;
  var HIVE_FROM = 0.55;

  /* The body's level, 0..1, or null when the archetype declares none. */
  function level(archetype, params) {
    var a = archetype && archetype.activity;
    if (!a) return null;
    var v = params ? params[a.param] : undefined;
    return clamp01(v === undefined ? 0.5 : v);
  }

  /* `layers` built and renormalized; `specs` role -> authored stack entry. */
  function stamp(layers, specs, archetype, params) {
    var lv = level(archetype, params);
    if (lv === null) return;
    var em = EMERGENCY * smooth(EMERGENCY_RISE[0], EMERGENCY_RISE[1], lv) *
             (1 - smooth(EMERGENCY_FADE[0], EMERGENCY_FADE[1], lv));
    var dflt = archetype.activity.lit || [0.05, 0.40];
    for (var i = 0; i < layers.length; i++) {
      var sp = specs[layers[i].role];
      var c = (sp && sp.lit) || dflt;
      var live = smooth(c[0], c[1], lv);
      layers[i].live = live;
      layers[i].emergency = em * (1 - live);
      layers[i].busy = 1 + HIVE * smooth(HIVE_FROM, 1, lv);
      layers[i].activity = lv;
    }
  }

  /* A stable 0..1 roll from a light's position. */
  function roll(x, y, salt) {
    var s = Math.sin(x * 127.1 + y * 311.7 + (salt || 0) * 74.7) * 43758.5453;
    return s - Math.floor(s);
  }

  /* One light's state: 0 dark, 1 lit, 2 emergency. `x`, `y` are anything
   * that pins the light (radius and bearing, usually). */
  function gate(layer, x, y, salt) {
    if (!layer || layer.live === undefined) return 1;
    var u = roll(x, y, salt);
    if (u < layer.live) return 1;
    if (u > 1 - layer.emergency) return 2;
    return 0;
  }

  /* The layer's hive multiplier, 1 on a body declaring no activity. */
  function busy(layer) { return (layer && layer.busy) || 1; }

  return { level: level, stamp: stamp, roll: roll, gate: gate, busy: busy };
})();
