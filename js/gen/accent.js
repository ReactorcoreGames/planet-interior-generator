/* The accent hue — the colour of lights, active systems and anything built
 * that should look like it does not belong to the material it sits in — and
 * the hue families a built body's primary is rolled from.
 *
 * MACHINE-WORLDS.md: "a strong complement to the hull hue. Grey-blue hull with
 * amber lights, or gunmetal with cyan — that two-tone industrial look." A
 * general colour-profile property, not a machine-world feature:
 *
 *   accent: { rel: [lo, hi], sat: [lo, hi], val: [lo, hi] }
 *
 * `rel` is the hue offset from the HOST — the outermost real, non-self-lit
 * layer, the one the eye reads as "what this body is made of" — so a
 * complement ±30° is [150, 210]. Rolled from its own stream, so the accent
 * moving never recolours a layer and a layer moving never re-rolls the accent
 * (only the host's hue, which it is defined against). The Accent hue offset
 * turns it from there, after the draws, so 0 changes nothing (D319).
 *
 * The result rides on every layer colour as `accent`, so an element asks for
 * it with `tone: "accent"` through the same colour object it already has
 * (draw/details.js). Null on every profile that declares none, and the tone
 * then falls back to `glow`.
 *
 * A LAYER MAY TAKE THE ACCENT AS ITS OWN HUE with `accentHue: k` on its
 * colour entry, 0..1 of the way there — the spec's "the accent is for the
 * power core", so the heart of a grey-blue world burns amber.
 *
 * HUE FAMILIES. `profile.hue` may be a list of `[lo, hi, weight]` ranges
 * instead of one `[lo, hi]`: metals come in families (steel, gunmetal,
 * bronze), and one range across the wheel gives every colour in between,
 * most of which no metal is. Rolled with ONE draw either way, so a profile
 * with a plain range keeps exactly the colours it had. */

var CC = CC || {};

CC.Accent = (function () {
  "use strict";

  var lerp = CC.Math.lerp;

  /* A primary hue from `range`, using exactly one draw of `rng`. */
  function rollHue(range, rng) {
    var u = rng();
    if (typeof range[0] === "number") return lerp(range[0], range[1], u);
    var total = 0, i;
    for (i = 0; i < range.length; i++) total += range[i][2] === undefined ? 1 : range[i][2];
    var x = u * total;
    for (i = 0; i < range.length; i++) {
      var w = range[i][2] === undefined ? 1 : range[i][2];
      if (x < w || i === range.length - 1) {
        return lerp(range[i][0], range[i][1], Math.min(1, Math.max(0, x / w)));
      }
      x -= w;
    }
    return range[0][0];
  }

  /* Move one layer colour's hue, rebuilding everything derived from it. */
  function retint(c, h) {
    var P = CC.Palette.factories;
    var dh = h - c.h;
    c.h = h;
    c.hex = CC.Color.hsvToHex(h, c.s, c.v);
    c.lighter = P.lighter(h, c.s, c.v);
    c.darker = P.darker(h, c.s, c.v);
    c.rgba = P.rgba(h, c.s, c.v);
    if (c.hotEdge) {
      var hh = CC.Palette.wrapHue(c.hotEdge.h + dh);
      c.hotEdge = { h: hh, s: c.hotEdge.s, v: c.hotEdge.v, strength: c.hotEdge.strength,
                    hex: CC.Color.hsvToHex(hh, c.hotEdge.s, c.hotEdge.v) };
    }
  }

  /* `out` maps role -> layer colour; `order` is the palette's adjacency list,
   * the non-outward layer colours outermost first. */
  function build(profile, out, order, seed, offset) {
    var spec = profile && profile.accent;
    if (!spec) return null;
    var host = null;
    for (var i = 0; i < order.length; i++) {
      if (order[i] && !order[i].emissive) { host = order[i]; break; }
    }
    if (!host) host = order[0] || { h: 0 };

    var r = CC.RNG.stream(seed, "colour/accent");
    var rel = spec.rel || [150, 210];
    var h = CC.Palette.wrapHue(host.h + lerp(rel[0], rel[1], r()) + (offset || 0));
    var s = lerp((spec.sat || [0.7, 0.9])[0], (spec.sat || [0.7, 0.9])[1], r());
    var v = lerp((spec.val || [0.9, 1.0])[0], (spec.val || [0.9, 1.0])[1], r());
    var accent = { h: h, s: s, v: v, hex: CC.Color.hsvToHex(h, s, v) };

    for (var role in out) {
      if (!Object.prototype.hasOwnProperty.call(out, role)) continue;
      var c = out[role];
      c.accent = accent;
      var k = c.heatSpec && c.heatSpec.accentHue;
      if (k) retint(c, CC.Palette.mixHue(c.h, h, k));
    }
    return accent;
  }

  return { build: build, rollHue: rollHue };
})();
