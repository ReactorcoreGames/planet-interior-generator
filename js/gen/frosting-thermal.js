/* The surface frosting's thermal variants — the same family as the cold face
 * and the baked face would have it.
 *
 * Split out of gen/frosting.js, which passed the 500-line rule. Attached to
 * CC.Frosting; gen/frosting.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;

  /* `["a","b"], "Cold"` -> `["aCold","bCold"]`. */
  function suffixed(keys, suffix) {
    var out = [];
    for (var i = 0; i < keys.length; i++) out.push(keys[i] + suffix);
    return out;
  }

  /* Which zone stands for "the ordinary surface of this body" — the one the
   * `film` alias points at. The first that is neither the snowline nor
   * underwater; the first of all of them if every zone is one of those. */
  function ordinaryKey(keys, zones) {
    for (var i = 0; i < keys.length; i++) {
      var z = zones[keys[i]] || {};
      if (!z.snow && !z.aquatic) return keys[i];
    }
    return keys[0];
  }

  /* Shortest signed hue rotation from `from` to `to`, in degrees. Lets a
   * colour be pulled a FRACTION of the way toward another without travelling
   * the long way round the wheel — the same reasoning as gen/palette-util.js's
   * mixHue and draw/film-zones.js's hueBlend. */
  function shortestTo(from, to) {
    var d = (to - from) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  /*
   * A SECOND SET OF THE FOUR ZONES, AS THE COLD FACE WOULD HAVE THEM.
   *
   * This is the change that makes tidal locking alter what the material IS
   * rather than only where it sits. `arid` above is one number for the whole
   * body, so it can say "this world is dry" but never "this FACE is frozen"
   * — which is why a night cap came out in the family hue.
   *
   * Rather than make every rule angular, the family is resolved twice: once
   * as rolled, and once as the same family driven to its frozen extreme. The
   * renderer blends between them by `tempAt`, so a face that is genuinely
   * cold reads as ice and a face that is not keeps its ecology — and the two
   * sets share hue, spread and every roll, so a world still looks like one
   * world at both ends.
   *
   * Only written when the body is actually zoned. An unzoned world gets the
   * single set exactly as before and pays nothing.
   */
  function addThermalVariants(out, keys, rolled, arid, helpers) {
    var wrapHue = helpers.wrapHue, makeLighter = helpers.makeLighter,
        makeDarker = helpers.makeDarker, makeRgba = helpers.makeRgba;
    var kk;
    /* One frozen counterpart per declared zone, named by suffix rather than
     * listed — so a two-zone or five-zone archetype gets its thermal sets
     * for free and this file never counts. */
    var frozenKeys = suffixed(keys, "Cold");
    for (kk = 0; kk < keys.length; kk++) {
      var src = out[keys[kk]];

      /* Ice is ACHROMATIC, BRIGHT, and slightly blue — the one place a
       * near-zero saturation is correct, because frozen volatile has no
       * colour of its own whatever it froze out of. The residual hue is
       * pulled toward the blue end rather than set to it, so a red world's
       * ice still carries a trace of the world it belongs to. */
      var ch2 = wrapHue(src.h + shortestTo(src.h, 205) * 0.55);
      var cs2 = clamp(src.s * 0.16, 0, 1);
      var cv2 = clamp(0.80 + (1 - src.v) * 0.18, 0.03, 0.97);

      /* The two submerged zones stay darker: ice over water reads as sea
       * ice, which is not the same white as a snowfield and needs to keep
       * some of the depth beneath it. */
      if (src.arid !== undefined && rolled[kk].spec.aquatic) {
        cs2 = clamp(src.s * 0.30, 0, 1);
        cv2 = clamp(cv2 * 0.78, 0.03, 1);
      }

      out[frozenKeys[kk]] = {
        h: ch2, s: cs2, v: cv2,
        hex: CC.Color.hsvToHex(ch2, cs2, cv2),
        depth: 0,
        arid: arid,
        emissive: false,
        lighter: makeLighter(ch2, cs2, cv2),
        darker: makeDarker(ch2, cs2, cv2),
        rgba: makeRgba(ch2, cs2, cv2)
      };
    }

    /* AND THE SCORCHED SET, which is the other half of the same idea.
     *
     * A baked face is not merely "less covered" — its ground is burnt: dark,
     * desaturated, ashen rather than vegetated. Without this the hot face
     * borrows the temperate family's colours at low coverage and reads as a
     * world that simply has less grass. */
    var burntKeys = suffixed(keys, "Hot");
    for (kk = 0; kk < keys.length; kk++) {
      var hs = out[keys[kk]];
      /* Toward ash: hue dragged to the warm-neutral end, saturation cut
       * hard, value pulled down. Scorched ground is dark, not bright. */
      var hh2 = wrapHue(hs.h + shortestTo(hs.h, 28) * 0.45);
      var hsat = clamp(hs.s * 0.42, 0, 1);
      var hval = clamp(hs.v * 0.55, 0.05, 1);

      out[burntKeys[kk]] = {
        h: hh2, s: hsat, v: hval,
        hex: CC.Color.hsvToHex(hh2, hsat, hval),
        depth: 0,
        arid: arid,
        emissive: false,
        lighter: makeLighter(hh2, hsat, hval),
        darker: makeDarker(hh2, hsat, hval),
        rgba: makeRgba(hh2, hsat, hval)
      };
    }
  }

  CC.Frosting.addThermalVariants = addThermalVariants;
  CC.Frosting.ordinaryKey = ordinaryKey;
})();
