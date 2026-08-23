/* Colour utilities: hex/rgb/hsl/hsv conversion, mixing, hue rotation.
 *
 * Ported from archive/v2/src/core/color.js and translated out of ES module
 * syntax. HSV is new for v3: the colour system is specified in HSV profiles
 * (saturation + value ranges per layer), not HSL. Both spaces are kept —
 * HSL is still the right one for "lighten/darken toward white/black". */

var CC = CC || {};

CC.Color = (function () {
  "use strict";

  var clamp = CC.Math.clamp;
  var lerp = CC.Math.lerp;

  function hexToRgb(hex) {
    var h = String(hex).replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16)
    ];
  }

  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(function (v) {
      return clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
    }).join("");
  }

  function rgba(hex, a) {
    var c = hexToRgb(hex);
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + clamp(a, 0, 1) + ")";
  }

  function mixHex(h1, h2, t) {
    var a = hexToRgb(h1), b = hexToRgb(h2);
    return rgbToHex(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
  }

  /* amt -1..1 : darken..lighten */
  function shadeHex(hex, amt) {
    return amt >= 0 ? mixHex(hex, "#ffffff", amt) : mixHex(hex, "#000000", -amt);
  }

  /* --- HSV: the space the colour profiles are authored in --- */

  /* h 0..360, s 0..1, v 0..1 */
  function hsvToRgb(h, s, v) {
    h = ((h % 360) + 360) % 360;
    s = clamp(s, 0, 1);
    v = clamp(v, 0, 1);
    var c = v * s;
    var hp = h / 60;
    var x = c * (1 - Math.abs((hp % 2) - 1));
    var r = 0, g = 0, b = 0;
    if (hp < 1) { r = c; g = x; }
    else if (hp < 2) { r = x; g = c; }
    else if (hp < 3) { g = c; b = x; }
    else if (hp < 4) { g = x; b = c; }
    else if (hp < 5) { r = x; b = c; }
    else { r = c; b = x; }
    var m = v - c;
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var d = max - min;
    var h = 0;
    if (d !== 0) {
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    return [h, max === 0 ? 0 : d / max, max];
  }

  function hsvToHex(h, s, v) {
    var c = hsvToRgb(h, s, v);
    return rgbToHex(c[0], c[1], c[2]);
  }

  function hexToHsv(hex) {
    var c = hexToRgb(hex);
    return rgbToHsv(c[0], c[1], c[2]);
  }

  /* Direct to an rgba() string — the common case in drawing code, and it
   * avoids a pointless round-trip through hex. */
  function hsva(h, s, v, a) {
    var c = hsvToRgb(h, s, v);
    return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," +
           Math.round(c[2]) + "," + clamp(a, 0, 1) + ")";
  }

  /* --- HSL: still the right space for lighten/darken and hue rotation --- */

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var l = (max + min) / 2;
    var h = 0, s = 0;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return [h, s, l];
  }

  function hslToRgb(h, s, l) {
    h = ((h % 1) + 1) % 1;
    if (s === 0) { var v = l * 255; return [v, v, v]; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    var hue = function (t) {
      t = ((t % 1) + 1) % 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
  }

  function hexToHsl(hex) {
    var c = hexToRgb(hex);
    return rgbToHsl(c[0], c[1], c[2]);
  }

  function hslToHex(h, s, l) {
    var c = hslToRgb(h, s, l);
    return rgbToHex(c[0], c[1], c[2]);
  }

  /* Rotate hue by `deg` degrees, optionally scaling saturation. Near-greyscale
   * colours are left alone so the shift reads as a recolour of the *material*,
   * not a tint of everything. */
  function hueShiftHex(hex, deg, satScale) {
    satScale = satScale === undefined ? 1 : satScale;
    if (!deg && satScale === 1) return hex;
    var c = hexToHsl(hex);
    if (c[1] < 0.06) return hex;
    return hslToHex(c[0] + deg / 360, clamp(c[1] * satScale, 0, 1), c[2]);
  }

  /* Relative luminance, for contrast decisions. */
  function luminance(hex) {
    var c = hexToRgb(hex).map(function (v) {
      var x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  return {
    hexToRgb: hexToRgb,
    rgbToHex: rgbToHex,
    rgba: rgba,
    mixHex: mixHex,
    shadeHex: shadeHex,
    hsvToRgb: hsvToRgb,
    rgbToHsv: rgbToHsv,
    hsvToHex: hsvToHex,
    hexToHsv: hexToHsv,
    hsva: hsva,
    rgbToHsl: rgbToHsl,
    hslToRgb: hslToRgb,
    hexToHsl: hexToHsl,
    hslToHex: hslToHex,
    hueShiftHex: hueShiftHex,
    luminance: luminance
  };
})();
