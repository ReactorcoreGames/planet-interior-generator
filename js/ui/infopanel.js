/* The info panel — the stat card, rendered as DOM beside the preview.
 *
 * IT IS DOM, NOT CANVAS, and that is a deliberate split. On screen the card is
 * text a user selects and copies, so it should be real text: a canvas-drawn
 * card would be an image of words. Composing the card INTO an exported PNG is
 * a separate feature (PARAMETERS.md's "Composition" dropdown, Phase 8) and
 * would draw the same `stats.lines` through the canvas; this module owns the
 * on-screen half only.
 *
 * IT RENDERS WHAT `CC.Stats` HANDS IT AND DECIDES NOTHING. No thresholds, no
 * comparisons, no phrasing live here — if this file ever grows a number, the
 * card and the picture have gained a second source they can disagree from,
 * which is the one failure mode this whole phase can introduce. The only
 * judgement it makes is which CSS class a hazard rating gets, and even that is
 * a lookup keyed by the rating `CC.Stats` already computed. */

var CC = CC || {};

CC.InfoPanel = (function () {
  "use strict";

  var host = null;

  /* Ratings, coldest to hottest, so the swatch reads as a scale rather than as
   * a set of unrelated colours. Indexes match CC.Stats.RATINGS. */
  var RATING_CLASS = {
    "Benign": "benign", "Mild": "mild", "Hazardous": "hazardous",
    "Severe": "severe", "Lethal": "lethal", "Absolute": "absolute"
  };

  /* The detail-level table lives in draw/card.js, which owns it because the
   * canvas card must be drawable with no interface present — `draw/` may not
   * depend on `ui/`. Both renderers therefore show the same set of lines by
   * construction rather than by two copies agreeing. */

  function render(stats, level) {
    if (!host) return;
    host.innerHTML = "";
    if (!stats) return;

    var keep = CC.Card.levelKeys(level || "standard");

    var head = document.createElement("div");
    head.className = "info-head";

    var name = document.createElement("h3");
    name.className = "info-name";
    name.textContent = stats.name;

    var sub = document.createElement("div");
    sub.className = "info-sub";

    var type = document.createElement("span");
    type.className = "info-type";
    type.textContent = stats.typeLabel;

    var badge = document.createElement("span");
    badge.className = "hazard-badge " + (RATING_CLASS[stats.hazard] || "mild");
    badge.textContent = stats.hazard;
    badge.title = "Hazard rating, derived from the temperature, atmosphere, " +
      "radiation and gravity shown below - never rolled separately.";

    sub.appendChild(type);
    sub.appendChild(badge);
    head.appendChild(name);
    head.appendChild(sub);
    host.appendChild(head);

    var dl = document.createElement("dl");
    dl.className = "info-lines";
    for (var i = 0; i < stats.lines.length; i++) {
      var line = stats.lines[i];
      if (keep && keep.indexOf(line.key) < 0) continue;
      var dt = document.createElement("dt");
      dt.textContent = line.label;
      var dd = document.createElement("dd");
      dd.textContent = line.value;
      dd.setAttribute("data-key", line.key);
      dl.appendChild(dt);
      dl.appendChild(dd);
    }
    host.appendChild(dl);
    host.appendChild(fingerprintStrip(stats));
  }

  /* THE FINGERPRINT STRIP — the body's palette, plus the seed that made it.
   *
   * The one part of the card that is decoration rather than information, and
   * it earns its place by making two otherwise-identical cards tell themselves
   * apart: same preset, different seed, visibly different row of colour.
   *
   * The seed sits beside it because the two answer the same question — "which
   * world is this" — and because it is the string a user needs in order to get
   * back here. Selectable, like the rest of the card. */
  function fingerprintStrip(stats) {
    var wrap = document.createElement("div");
    wrap.className = "info-fingerprint";

    var swatches = document.createElement("div");
    swatches.className = "fp-swatches";
    var fp = stats.fingerprint || [];
    for (var i = 0; i < fp.length; i++) {
      var sw = document.createElement("span");
      sw.className = "fp-swatch";
      sw.style.background = fp[i].hex;
      /* The role is the tooltip rather than a printed label: six labels would
       * cost more room than the strip is worth, and the colours are the
       * point. */
      sw.title = fp[i].role + " - " + fp[i].hex;
      swatches.appendChild(sw);
    }

    var seed = document.createElement("span");
    seed.className = "fp-seed";
    seed.textContent = stats.seed;
    seed.title = "The seed that generated this body. Paste a copied " +
      "seed + settings string into the Seed field to restore an exact world.";

    wrap.appendChild(swatches);
    wrap.appendChild(seed);
    return wrap;
  }

  /* SHOWING THE CARD ONLY SHOWS THE CARD. It reserves nothing, resizes
   * nothing, and reflows nothing.
   *
   * It used to flag the preview so a CSS `padding-right` kicked in, which
   * narrowed the canvas to make room. That single mechanism caused three
   * defects: the body was sized from a box the card controlled, so toggling it
   * resized and cropped the render; the preview's background stopped where the
   * canvas stopped, ending in mid-air under the card; and the class was applied
   * at the END of the first draw, so the first frame was measured against the
   * wrong box and painted a squished oval.
   *
   * The room the card needs is now a shift of the body's centre, read from
   * `--card-room` in main.js and applied whether the card is visible or not —
   * so the composition does not depend on this function at all. Which is why
   * there is nothing left here but the card's own visibility. */
  function setVisible(on) {
    if (!host) return;
    host.hidden = !on;
  }

  function init(el) { host = el; }

  return { init: init, render: render, setVisible: setVisible };
})();
