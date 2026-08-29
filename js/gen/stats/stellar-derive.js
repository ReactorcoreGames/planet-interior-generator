/* Stars — the stat template for the stellar family.
 *
 * THE MINDSET, and it is the whole reason this file exists separately (D78 —
 * a stat template is a MINDSET, not a list of rows):
 *
 * A GIANT'S CARD ASKS HOW FAR DOWN YOU CAN GET. A STAR'S CARD DOES NOT ASK
 * THAT, because the answer is "nowhere, not even slightly", and a card whose
 * signature line is a constant carries no information. Nor does it ask what is
 * underfoot, how much is dry land, or whether you could breathe. Deleting the
 * surface lines from a planet's card would leave a planet's card with holes in
 * it, which is exactly the failure D78 records.
 *
 * The questions a star actually raises are:
 *
 *   HOW HOT IS THE SURFACE, and therefore what colour is it — the one fact
 *     about a star a reader can check against the picture, and the fact that
 *     every other stellar property follows from.
 *   HOW IS THE ENERGY GETTING OUT — the family's whole subject. Which zone is
 *     convecting and which is radiating, read off the DRAWN STACK, so the
 *     sentence and the two vocabularies in the render are one statement.
 *   HOW LONG WILL IT LAST, and what stage is it at. A star is the only body in
 *     the generator whose interesting timescale is not "forever".
 *   HOW FAR OUT IS IT SAFE, and where does the habitable zone fall. That is
 *     the question a star raises for everything ELSE in its system, and it is
 *     the closest a star has to "where you can work".
 *   HOW VIOLENT IS IT — starspots, flares, prominences. `starActivity`, said
 *     in words, and the same axis the traits and the render read.
 *
 * EVERY FIGURE IS DERIVED (the rule at the top of the registry). The surface
 * temperature is the climate field's `tempAt` rescaled to a star's range — NOT
 * a second temperature rolled beside it, which climate-foundation.md asked for
 * by name. The transport line reads `body.has(...)` on the layers that were
 * actually drawn. The lifespan is read off the drawn radius and the archetype's
 * stage. Nothing here can disagree with the picture.
 *
 * D75 SHAPED EVERY CONSTANT BELOW. A star's radius range is 100,000 to
 * 70,000,000 km against a planet's 2,400-9,800, and its temperatures are in the
 * thousands where a planet's are in the tens. Every threshold in this file was
 * measured against what the stacks actually produce rather than adapted from a
 * family whose inputs live somewhere else — see `test/_tmp/starsweep.mjs`,
 * which prints min/max over forty bodies per archetype and took thirty seconds
 * to write.
 *
 * The registry must load before this file.
 *
 * ---- WHY THIS IS SPLIT ---------------------------------------------------
 *
 * 531 lines against the 500-line rule in CLAUDE.md. The cut separates WHAT A
 * STAR'S CARD MEASURES from WHICH ROWS IT PRINTS:
 *
 *   stellar-derive.js    this file — the seven derivations. Surface
 *     temperature from the climate field, the transport regime read off the
 *     drawn stack, the core ratio, the lifespan, the habitable zone, and the
 *     two sentence-builders that turn a figure into English.
 *   stellar.js           the template — the fact bundle, the line order, and
 *     the detail levels.
 *
 * That is the seam because the two change for different reasons: a derivation
 * changes when the physics or the calibration moves, and the template changes
 * when the card's shape does. It also keeps `surfaceC` — half of a paired
 * calibration (D119) — in a file small enough to read in one sitting.
 *
 * Published on `CC.Stats.stellar` so the template and any probe reach the SAME
 * functions. A probe that reimplements what it is testing can agree with
 * itself while the app does something else.
 *
 * js/gen/stats/registry.js must load before this file. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;


  /* ---- temperature, at the photosphere --------------------------------- */

  /* A STAR'S SURFACE IS MEASURED IN THOUSANDS OF DEGREES, and the terrestrial
   * mapping cannot reach there: `toCelsius` tops out around 460 C at the very
   * end of its range, which is four hundred degrees short of the COLDEST star
   * in the family.
   *
   * So this rescales the SAME normalized field rather than introducing a
   * second one — the archetype's business, exactly as HAZARDS.md says ("a
   * star's 0.9 is not a planet's 0.9"), and precisely what
   * climate-foundation.md asked this phase to do rather than rolling a
   * temperature beside the climate.
   *
   * THE CONSTANTS BELOW WERE MEASURED, NOT GUESSED, AND THE FIRST SET WAS
   * WRONG — which is D75 arriving on schedule in the one place this file
   * warned about it.
   *
   * The first version was fitted against an assumed input band of 0.48..1.0
   * and put an ordinary main-sequence star at 9,900-14,100 C, against a spec
   * of 3,500-8,000. The error was not in the curve, it was in the RANGE: with
   * every star declaring a `selfHeated` floor, `climate.mean` does not use
   * anything like the full 0..1. Measured over thirty bodies per archetype it
   * runs 0.54..0.87 across the whole family, and each archetype occupies a
   * narrow window inside that — which is the entire calibration.
   *
   * A thirty-second sweep printing min/max is what settled it, exactly as D75
   * says. `test/_tmp/starsweep.mjs` is that sweep; run it after touching
   * either these constants or any `selfHeated` floor, because the two are one
   * calibration and moving either alone breaks it.
   *
   * The curve is quadratic so that the difference between a 4,000 K star and
   * a 12,000 K one takes real travel across the band — a linear map made every
   * archetype land in a two-thousand-degree huddle in the middle. */
  var C_FLOOR = 0.48, C_CEIL = 0.90;
  function surfaceC(t) {
    var u = clamp(t, 0, 1);
    var up = Math.max(0, (u - C_FLOOR) / (C_CEIL - C_FLOOR));
    return 1900 + Math.pow(up, 2.0) * 13500;
  }

  /* ---- how the energy gets out ----------------------------------------- */

  /* THE FAMILY'S SIGNATURE LINE, and it is read entirely off the DRAWN STACK.
   *
   * `body.has(role)` asks what was actually built, so a main star whose
   * tachocline did not roll does not get a sentence about one, and the
   * inversion between a young star and a main star is described by looking at
   * which layer sits where rather than by consulting the archetype id. That
   * matters for the same reason the trait system's tag gating does: nothing in
   * the generator should name an archetype to find out what it is.
   *
   * THE ORDER OF THE TWO ZONES IS THE FACT. Which one is on the outside is the
   * whole of what distinguishes a young star from a main-sequence one, so this
   * compares their drawn radii rather than merely listing what is present. */
  function transportOf(body) {
    var conv = null, rad = null, convCore = null;
    for (var i = 0; i < body.layers.length; i++) {
      var l = body.layers[i];
      if (l.role === "convective") conv = l;
      else if (l.role === "radiative") rad = l;
      else if (l.role === "convective-core") convCore = l;
    }

    /* ORDER MATTERS HERE, AND THE FIRST VERSION HAD IT WRONG.
     *
     * A shell-burning giant and a fully-convective dwarf have the SAME shape
     * as far as these three variables go — one convective layer, no radiative
     * zone, no convective core — so whichever test runs first claims both. The
     * fully-convective test ran first, and every old giant's card announced
     * "convective all the way through, which is why a star like this burns for
     * so long", which is the dwarf's sentence and the opposite of true about a
     * body at the end of its life.
     *
     * What separates them is not the transport layers at all: it is whether
     * there are FUSING SHELLS around a dead core. So that is what is asked
     * first, and it is read off the drawn stack like everything else here. */
    if (conv && (body.has("h-shell") || body.has("he-shell"))) {
      return {
        text: "One vast convective envelope over shells of fusing hydrogen" +
              (body.has("he-shell") ? " and helium" : "") +
              ". The core itself has stopped burning and is holding itself " +
              "up by degeneracy pressure alone.",
        kind: "shell-burning"
      };
    }

    /* Fully convective — the dwarf's signature, and it is an ABSENCE. */
    if (conv && !rad && !convCore) {
      return {
        text: "Convective all the way through. There is no radiative zone at " +
              "all - the same plasma that touches the core reaches the " +
              "surface, which is why a star like this stays mixed and burns " +
              "for so long.",
        kind: "fully-convective"
      };
    }

    /* The inversion: convection at the CENTRE, radiation outside it. */
    if (convCore && rad) {
      return {
        text: "Inverted, compared with a star like the Sun: the core " +
              "convects and the envelope above it radiates. That is what a " +
              "young, heavy star does, and it is the fastest way to burn " +
              "through a core.",
        kind: "convective-core"
      };
    }

    /* The main-sequence arrangement. */
    if (conv && rad) {
      return {
        text: "Radiation carries the heat out of the deep interior, then " +
              "convection takes over for the outer third and delivers it to " +
              "the surface." +
              (body.has("tachocline")
                ? " The shear layer where the two meet is where the magnetic " +
                  "field is generated."
                : ""),
        kind: "radiative-core"
      };
    }

    /* A convective envelope over nothing this function recognises. Reached
     * only by a stack with no radiative zone, no convective core and no fusing
     * shells, which no archetype currently declares — kept because a future
     * one might, and a silent wrong answer is worse than a vague right one. */
    if (conv) {
      return {
        text: "One convective envelope, carrying the heat the whole way out.",
        kind: "convective-only"
      };
    }

    return { text: "Energy transport is not clearly resolved in this cutaway.",
             kind: "unclear" };
  }

  /* ---- how small the core is, against the body ------------------------- */

  /* THE OLD GIANT'S NAMED DONE-CONDITION, SAID IN WORDS.
   *
   * "An old giant shows its absurd core-to-envelope ratio" is a claim about
   * the picture, and the card should be able to state the same number so the
   * two are visibly one statement. Read off the drawn radii, so dragging Core
   * size bias moves the render and this sentence together.
   *
   * Offered for every star, because the ratio is interesting on all of them —
   * it is merely EXTREME on a giant. */
  function coreRatioOf(body, radius) {
    var innermost = null;
    for (var i = 0; i < body.layers.length; i++) {
      var l = body.layers[i];
      if (l.outward) continue;
      if (!innermost || l.outer < innermost.outer) innermost = l;
    }
    if (!innermost) return null;

    var frac = innermost.outer;
    var km = frac * radius;
    /* Volume, not radius, is what makes the contrast land: a core at 4% of the
     * radius is one sixteen-thousandth of the volume, and that figure is the
     * one that reads as absurd. */
    var volShare = Math.pow(frac, 3);
    return { role: innermost.role, frac: frac, km: km, volShare: volShare };
  }

  function coreLine(core, radius) {
    if (!core) return "Not resolved.";
    var km = Math.round(core.km / 1000) * 1000;
    var n = km.toLocaleString("en-US");
    var pct = (core.frac * 100).toFixed(1);

    /* THE RUNGS ARE MEASURED, NOT GUESSED (D75). Across the four archetypes
     * the innermost drawn layer runs about 2% of the radius (an old giant's
     * degenerate core at the bottom of its bias range) to about 17% (a main
     * star's fusion core at the top of its). */
    if (core.frac < 0.075) {
      return n + " km across - " + pct + "% of the radius, and roughly one " +
             "part in " + Math.round(1 / core.volShare).toLocaleString("en-US") +
             " of the volume. Everything you can see is the part that is not " +
             "doing the work.";
    }
    if (core.frac < 0.13) {
      return n + " km across - " + pct + "% of the radius. Small, and the " +
             "entire reason the rest of it is bright.";
    }
    return n + " km across - " + pct + "% of the radius, which is a generous " +
           "core for a star this size.";
  }

  /* ---- how long it lasts ------------------------------------------------ */

  /* LIFESPAN IS THE ONE TIMESCALE A STAR HAS THAT NOTHING ELSE IN THE
   * GENERATOR DOES, and it inverts against every intuition a reader brings:
   * the biggest, brightest stars are the shortest-lived, and the dim little
   * ones outlast everything. That inversion is worth a line on its own.
   *
   * Derived from the drawn radius and the archetype's stage tags, so a bigger
   * star on screen is genuinely a shorter-lived one on the card. Not physics —
   * it is the same stylized-radii rule as everything else here (D5) — but the
   * DIRECTION is right, which is what makes it worth printing. */
  function lifespanOf(radius, tags, heat) {
    var evolved = tags.indexOf("evolved") >= 0;
    var young = tags.indexOf("young") >= 0;

    if (evolved) {
      return { text: "It is already at the end. A star does this for a few " +
                     "million years at most, and then it is a white dwarf " +
                     "inside a shell of its own former self.",
               short: true };
    }

    /* Bigger burns faster. The exponent is steep on purpose — the real
     * relation is steeper still, and a gentle one would make the inversion
     * invisible, which is the only reason the line is here. */
    var rel = radius / 700000;
    var billions = 10 / Math.pow(Math.max(rel, 0.02), 2.6);
    /* A hotter interior burns its fuel faster, which keeps Interior heat
     * meaningful on this line as well as on the colour. */
    billions /= (0.6 + clamp(heat === undefined ? 0.5 : heat, 0, 1) * 0.9);

    if (young) {
      return { text: "A few million years old, which is nothing. It has not " +
                     "settled down yet and will not for a long while.",
               short: false };
    }
    if (billions > 400) {
      return { text: "Trillions of years. It burns so slowly that it will " +
                     "still be here long after every other star has gone out, " +
                     "and the universe is not old enough for one of these to " +
                     "have died yet.",
               short: false };
    }
    if (billions > 40) {
      return { text: Math.round(billions) + " billion years or so of fuel - " +
                     "several times the current age of the universe.",
               short: false };
    }
    if (billions > 4) {
      return { text: "Roughly " + Math.round(billions) + " billion years of " +
                     "fuel, which is a comfortable, unremarkable stellar life.",
               short: false };
    }
    return { text: "A few hundred million years, at this size. It is spending " +
                   "its fuel far faster than it can afford to.",
             short: true };
  }

  /* ---- where it is safe, and where anything could live ----------------- */

  /* THE STAR'S EQUIVALENT OF "WHERE YOU CAN WORK", and the reason it is not
   * the giant's ladder with different numbers: on a giant the question is how
   * DEEP an operation can sit, and here the answer to that is "nowhere". A
   * star's version of the same question points OUTWARD — how far off you have
   * to be, and where in that space a world could hold liquid water.
   *
   * Both figures scale with the star's output, which is read off its own
   * surface temperature and drawn radius, so a big hot star pushes both lines
   * out together exactly as it should.
   *
   * DELIBERATELY A LADDER RATHER THAN A VERDICT, for the same reason the
   * giant's operations line is (D78): how close a ship can get is a claim
   * about the setting's technology, not about the star. */
  function reachOf(radius, surfC, activity) {
    /* Luminosity goes as area times the fourth power of temperature. Both
     * terms are read off things the picture shows. Normalized against a
     * Sun-ish star so the figure is "times the Sun", which is the only unit a
     * reader has for this. */
    var rel = Math.pow(radius / 696000, 2) *
              Math.pow((surfC + 273) / 5778, 4);
    /* The habitable zone's distance goes as the square root of luminosity,
     * which is one of the few places the real relation is simple enough to
     * use directly. In AU. */
    var hz = Math.sqrt(Math.max(rel, 1e-6));

    var text;
    if (hz > 30) {
      text = "The habitable zone is out past where the ice giants would be - " +
             "anything close enough to be warm is close enough to be sterilised.";
    } else if (hz > 4) {
      text = "The habitable zone sits around " + hz.toFixed(0) + " AU, out " +
             "where the giants form. A world there is a long way from " +
             "everything else in the system.";
    } else if (hz > 0.55) {
      text = "The habitable zone is around " + hz.toFixed(2) + " AU - close " +
             "enough to ordinary that a system here could look familiar.";
    } else if (hz > 0.12) {
      text = "The habitable zone is at " + hz.toFixed(2) + " AU, tight in " +
             "against the star. Anything there is tidally locked, and it is " +
             "in range every time the star flares.";
    } else {
      text = "The habitable zone is so tight that nothing could hold an " +
             "orbit in it. There is warm and there is frozen, and no gap " +
             "between them.";
    }

    if (activity > 0.62) {
      text += " None of that helps much: this star is active enough to strip " +
              "an atmosphere off whatever is sitting in it.";
    }
    return { text: text, hz: hz, luminosity: rel };
  }

  /* ---- how violent it is ----------------------------------------------- */

  /* STAR ACTIVITY, SAID IN WORDS — the same 0..1 axis that drives the
   * starspots, the prominences and the flare storms in the render, and the
   * same one that scours a planet's surface cover when the body being drawn is
   * the planet instead. ONE CONTROL, TWO CONSUMERS (D27): this line and the
   * traits in js/data/traits/stellar-magnetic.js read the identical figure, so
   * the card cannot promise a quiet star over a render covered in
   * prominences. */
  function activityLine(activity, spotted) {
    if (activity > 0.80) {
      return "Violent. Flare storms without warning, prominences reaching a " +
             "long way out, and enough of the surface under spots to change " +
             "how much light it puts out week to week.";
    }
    if (activity > 0.55) {
      return "Active. Regular flares, visible spotting, and prominences off " +
             "the limb most of the time.";
    }
    if (activity > 0.28) {
      return "Ordinary. It flares, it spots, and it does neither often enough " +
             "to plan around." + (spotted ? " Heavier spotting than its size " +
             "suggests, which is normal for this kind of star." : "");
    }
    return "Quiet, and unusually so. Clean limb, few spots, and long stretches " +
           "with nothing happening at all.";
  }

  /* Published for the template and for probes. Exporting the real functions
   * rather than duplicating them is what stops a check drifting from the code
   * it checks. */
  CC.Stats.stellar = {
    surfaceC: surfaceC,
    transportOf: transportOf,
    coreRatioOf: coreRatioOf,
    coreLine: coreLine,
    lifespanOf: lifespanOf,
    reachOf: reachOf,
    activityLine: activityLine
  };
})();
