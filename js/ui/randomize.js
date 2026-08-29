/* Randomize — the roll behind the pinned button.
 *
 * Split out of js/main.js, which passed the 500-line rule. This is a
 * self-contained concern: which controls get rolled, across what range, and
 * what Randomize is deliberately gentle with.
 *
 * THE RANGES ARE THE INTERESTING PART. Some controls are rolled wide because
 * their whole span is worth seeing; others sit in a narrow band around their
 * default because they SCALE the archetype profile, and the profile is what
 * makes a body look like its type. Rolling those wide gives washed-out or
 * over-cooked versions of the same world rather than a different one.
 *
 * Loaded after ui/controls.js and ui/traitpicker.js, which it drives.
 */

var CC = CC || {};

CC.Randomize = (function () {
  "use strict";

  var RANDOM_SPEC = [
    { id: "thickness-variation", lo: 35, hi: 100 },
    { id: "optional-layers", lo: 30, hi: 100 },
    { id: "core-bias", lo: -80, hi: 80 },
    /* COHESION IS ROLLED THE WHOLE WAY, for the reason Starlight is: the whole
     * span is the interesting output. A loose rubble pile riddled with voids
     * and a solid monolithic fragment are two genuinely different pictures
     * from one number, and a narrow band around the default would only ever
     * produce the middle one. It costs nothing on the bodies that have no
     * mosaic, which simply ignore it. */
    { id: "cohesion", lo: 0, hi: 100 },
    { id: "ocean-depth", lo: 0, hi: 100 },
    { id: "interior-heat", lo: 0, hi: 100 },
    { id: "rotation", lo: 0, hi: 360 },
    { id: "primary-hue", lo: 0, hi: 360 },
    { id: "secondary-offset", lo: -30, hi: 30 },
    /* Saturation, brightness and contrast stay near 100%: they scale the
     * archetype's profile, and the profile is what makes a body look like
     * its type. Rolling them wide would just produce washed-out or
     * over-cooked versions of the same world. */
    { id: "saturation", lo: 85, hi: 120 },
    { id: "brightness", lo: 88, hi: 115 },
    { id: "contrast", lo: 80, hi: 130 },
    /* The Detail controls stay near their defaults, for the same reason
     * Saturation and Brightness do: 65% density with 3 tiers is the tuned
     * look, and rolling these wide produces sparse or overloaded versions of
     * the same body rather than a genuinely different one. They are rolled at
     * all so Randomize varies the *texture* of a body, not only its shape and
     * colour — but in narrow bands. */
    /* ZONE INTENSITY IS ROLLED WIDE, from a Mercury-like resonance to a razor
     * terminator: that whole span is the interesting output, and a narrow band
     * around 100% would only ever produce the same locked world. The opposite
     * case from Saturation, which is deliberately narrow. */
    { id: "trait-count", lo: 1, hi: 3 },
    /* STARLIGHT IS ROLLED ALMOST THE WHOLE WAY, because the whole span is the
     * interesting output — a seared Mercury, a temperate world, a frozen
     * outer-system moon and an unlit rogue are four genuinely different
     * pictures from one number.
     *
     * The low end reaches 0 deliberately: Starlight 0 is a real state, not a
     * small number, and a rogue planet warmed only by its own core is one of
     * the better bodies this generator makes. The top stops at 95 so a seared
     * world stays a roll rather than the routine result. */
    { id: "starlight", lo: 0, hi: 95 },
    /* Activity rolls wide: it costs nothing on a calm world and a violent star
     * scours the surface and drives the hazard rating, which is variety rather
     * than noise. */
    { id: "star-activity", lo: 0, hi: 100 },
    /* AXIAL TILT IS ROLLED LOW AND NARROW. Its high end is the Uranus case,
     * where the poles are the warm regions — a striking picture, but a strange
     * one, and having it turn up on a third of all rolls would make it read as
     * a bug rather than as a rare world. It is fully available on the slider. */
    { id: "axial-tilt", lo: 0, hi: 35 },
    { id: "tidal-lock", lo: 25, hi: 100 },
    { id: "tidal-facing", lo: 0, hi: 360 },
    { id: "detail-density", lo: 52, hi: 82 },
    { id: "size-tiers", lo: 3, hi: 4 },
    { id: "texture-strength", lo: 80, hi: 125 },
    { id: "element-opacity", lo: 85, hi: 115 },
    /* THE BACKGROUND'S OWN NUMBERS ROLL TOO. Both are framing rather than
     * body, but unlike the background TYPE neither can produce a wrong
     * picture at any value — a gradient runs some way and a starfield has
     * some many stars — so there is no reason to pin them.
     *
     * The angle rolls its whole circle. Density stays off its floor: a
     * starfield the user has switched ON and which then rolls to nearly no
     * stars reads as the checkbox having failed, not as a sparse sky. */
    { id: "background-angle", lo: 0, hi: 359 },
    { id: "star-density", lo: 30, hi: 95 },
    /* NEBULA CLOUD SIZE ROLLS ITS WHOLE MIDDLE. Unlike Star density there is
     * no floor to keep off: every value here draws the same AMOUNT of gas,
     * just at a different size, so no roll can produce the "it failed to
     * render" picture a near-empty starfield would. Both ends are trimmed for
     * a different reason — the extremes stop reading as a nebula at all, one
     * flat wash at the bottom and mottled static at the top — so the roll
     * stays inside the range where the field has structure. */
    { id: "nebula-scale", lo: 15, hi: 85 }
  ];

  var HUE_RELATIONS = ["auto", "complement", "analogous", "triad", "split", "monochrome"];

  /* STAR COLOUR, WEIGHTED TOWARD THE COMMON KINDS. Red and orange dwarfs are
   * overwhelmingly the most numerous stars there are, and they also give the
   * most distinctive worlds, so they lead. Blue giants are rare and dramatic
   * and stay rare here for the same reason Axial tilt's extreme does: a
   * striking picture that turns up on every third roll stops reading as
   * striking. */
  var STAR_COLOURS = ["red-dwarf", "red-dwarf", "orange", "orange",
                      "sunlike", "sunlike", "white", "blue-giant"];

  /* Flow indicators is a character control rather than a taste one — it
   * changes how diagrammatic the body reads — so it is rolled across its
   * meaningful range. "none" is excluded: a body with no circulation drawn at
   * all looks like a bug rather than a choice, and the user can still pick it
   * deliberately. */
  var FLOW_MODES = ["subtle", "balanced", "balanced", "diagrammatic"];

  function randomize() {
    var rng = CC.RNG.mulberry32((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);

    if (!CC.Controls.isLocked("seed")) {
      CC.Controls.set("seed", randomSeed(rng));
    }
    for (var i = 0; i < RANDOM_SPEC.length; i++) {
      var s = RANDOM_SPEC[i];
      if (CC.Controls.isLocked(s.id)) continue;
      CC.Controls.set(s.id, Math.round(s.lo + rng() * (s.hi - s.lo)));
    }
    if (!CC.Controls.isLocked("hue-relationship")) {
      CC.Controls.set("hue-relationship", CC.Math.pick(rng, HUE_RELATIONS));
    }
    if (!CC.Controls.isLocked("flow-indicators")) {
      CC.Controls.set("flow-indicators", CC.Math.pick(rng, FLOW_MODES));
    }
    if (!CC.Controls.isLocked("star-colour")) {
      CC.Controls.set("star-colour", CC.Math.pick(rng, STAR_COLOURS));
    }

    /* THE BACKGROUND COLOUR ROLLS; THE BACKGROUND TYPE DOES NOT.
     *
     * The type is a framing choice rather than a property of the body — rolling
     * it would flip a deliberate transparent export back to a starfield — so it
     * carries no lock either, since a lock guarding nothing is noise.
     *
     * The colour is a different thing: it is the space this world sits in, and
     * varying it is free variety. But it is rolled in a NARROW DARK BAND rather
     * than across the wheel, for the same reason Saturation is narrow: the body
     * is the subject, and a bright background turns the picture into a colour
     * clash. Hue is free, value is not. */
    var bgHue = rng() * 360;
    if (!CC.Controls.isLocked("background-color")) {
      var bgSat = 0.30 + rng() * 0.50;
      /* THE DARK END IS THE COMMON CASE, NOT THE ONLY ONE. The original band
       * topped out at 0.10 value, which is near-black in every roll — the
       * control looked broken because a user could not see it changing. Most
       * rolls still land dark, since a bright backdrop turns the picture into
       * a colour clash, but one in four now reaches a genuinely lit sky: the
       * blue-behind-the-planet look that Solid + Stars exists to give. */
      var bgVal = rng() < 0.75 ? (0.05 + rng() * 0.09) : (0.16 + rng() * 0.20);
      CC.Controls.set("background-color", CC.Color.hsvToHex(bgHue, bgSat, bgVal));
    }

    /* THE SECOND COLOUR IS ROLLED AS A RELATION, NOT INDEPENDENTLY. Two free
     * hues produce a clash about as often as they produce a pair, and the
     * gradient and the nebula both read as one atmosphere rather than as two
     * unrelated washes. So it is the first hue walked a short way around the
     * wheel — near-analogous most of the time, occasionally far enough to be
     * a deliberate two-tone.
     *
     * It is allowed to be a little brighter than colour 1 because it is the
     * far end of a gradient and the core of a nebula: if both ends sit in the
     * same near-black band there is no gradient to see. Still dark enough
     * that the body stays the subject. */
    if (!CC.Controls.isLocked("background-color2")) {
      var spread = rng() < 0.75 ? 18 + rng() * 45 : 90 + rng() * 90;
      var h2 = (bgHue + (rng() < 0.5 ? -spread : spread) + 360) % 360;
      var s2 = 0.35 + rng() * 0.50;
      /* Brighter than colour 1 on purpose and by a wider margin: it is the far
       * end of a gradient and the CORE of a nebula, and cores that sit in the
       * same near-black band as the voids give a nebula with nothing to see. */
      var v2 = 0.12 + rng() * 0.26;
      CC.Controls.set("background-color2", CC.Color.hsvToHex(h2, s2, v2));
    }

    /* EXOTIC OCEANS IS ROLLED, BUT RARELY. The realistic blue-green sea is the
     * default because it is what makes these read as planets (D39); a strange
     * sea is a variation on that, not an equal partner. One body in six. */
    if (!CC.Controls.isLocked("exotic-oceans")) {
      CC.Controls.set("exotic-oceans", rng() < 0.17);
    }

    /* Clear the explicit trait selection so the roll actually happens.
     *
     * A ticked picker means "give me exactly these", which would survive
     * Randomize and make every rolled body carry the same traits — the button
     * would appear to work while quietly ignoring a whole category. The
     * picker is refilled from what was generated once the draw completes, so
     * the list still shows the body's real traits.
     *
     * `lock-trait-count` doubles as the lock for the selection itself: if the
     * user has locked their trait count they have said they care about the
     * traits, so their picks are kept. */
    if (CC.TraitPicker && !CC.Controls.isLocked("trait-count")) {
      CC.TraitPicker.clear();
      if (onReroll) onReroll();
    }

    if (onDone) onDone();
  }

  /* main.js owns the trait salt and the render loop, so this asks rather than
   * reaching for them — the one dependency this module has on its caller, and
   * it is declared rather than implicit. */
  var onReroll = null, onDone = null;

  function init(hooks) {
    onReroll = hooks.reroll || null;
    onDone = hooks.draw || null;
  }

  var SYLL = ["kor", "vel", "ash", "tan", "mir", "dro", "sel", "vor", "ket", "lun",
              "pha", "zir", "oth", "rem", "cal", "nyx", "tir", "bel", "hax", "qua"];

  function randomSeed(rng) {
    var n = 2 + Math.floor(rng() * 2);
    var s = "";
    for (var i = 0; i < n; i++) s += SYLL[Math.floor(rng() * SYLL.length)];
    return s + "-" + Math.floor(rng() * 9000 + 1000);
  }
  return {
    init: init,
    run: randomize,
    randomSeed: randomSeed,
    RANDOM_SPEC: RANDOM_SPEC
  };
})();
