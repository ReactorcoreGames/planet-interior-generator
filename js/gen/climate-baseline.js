/* The climate baseline — a body's mean temperature from its star and its
 * interior heat, and the temperature of what lies under the surface.
 *
 * Split out of gen/climate.js, which passed the 500-line rule. The seam is mean
 * against field: this file answers one number per body, and gen/climate.js turns
 * that into a temperature at every bearing. Attached to CC.Climate, so no caller
 * is renamed. gen/climate.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;
  var smoothstep = CC.Math.smoothstep;

  /* ---- the baseline ---------------------------------------------------- */

  /* THE ARITHMETIC EVERYTHING ELSE TUNES AGAINST, so it is stated plainly.
   *
   *     baseTemp = f(Starlight) + g(Interior heat)
   *
   * A GENUINE SUM OF TWO INDEPENDENT SOURCES. The user's requirement, verbatim:
   * "a planet with an unusual hot core that despite the planet's far distance
   * from a star, its own heat is able to sustain a warm or even hot surface."
   * So Interior heat reaches the surface, and a rogue world with a molten core
   * is a warm world — which is a genuinely good sci-fi body and the case that
   * proves the sum works.
   *
   * NEITHER MAY DOMINATE. If the star term swamped the core term, Interior
   * heat would be decorative; if the core term swamped the star term,
   * Starlight would be. Measured spans across each control's full travel:
   * Starlight contributes 0.66 of the 0..1 range, Interior heat 0.34. The star
   * leads — it is the larger physical source and the control that makes cold
   * regions conditional — but heat alone still carries a world from frozen
   * (0.04) to temperate (0.38), which is exactly the rogue-planet case. */

  /* Starlight below this has no star at all: a rogue world drifting unlit,
   * its surface temperature set entirely by its own interior heat. Eased into
   * over `STAR_FADE` rather than snapped, the same treatment Ocean depth 0
   * gets — so there is a band of "a distant, feeble sun" before the dark. */
  var STAR_DARK = 0.05;
  var STAR_FADE = 0.13;

  /* How much of the 0..1 temperature range each source commands. */
  var STAR_REACH = 0.66;
  var HEAT_REACH = 0.34;

  /* The floor: not absolute zero, because a body in the deep void still has
   * some residual warmth, and because a temperature pinned at exactly 0 makes
   * every ratio downstream degenerate. */
  var VOID_FLOOR = 0.04;

  /* How much light and heat actually arrives.
   *
   * Concave, so the bottom of the slider has travel: a feeble sun should lift
   * a world visibly out of the deep freeze rather than doing nothing until it
   * is halfway up. The exponent above 1 keeps the TOP of the slider genuinely
   * searing rather than reaching Venus by a third of the way. */
  function starTerm(starlight) {
    var lit = smoothstep(0, 1, (starlight - STAR_DARK) / STAR_FADE);
    return lit * Math.pow(clamp(starlight, 0, 1), 1.15) * STAR_REACH;
  }

  /* How much of the interior reaches the surface. A planet radiates most of
   * its internal heat away, so it is worth less per unit than starlight — but
   * it is the term that cannot be zero on a molten world, which is the whole
   * point of it. */
  function heatTerm(interiorHeat) {
    return Math.pow(clamp(interiorHeat, 0, 1), 1.30) * HEAT_REACH;
  }

  /* ---- the star itself -------------------------------------------------- */

  /* The star table lives in data/stars.js, because it is pure data and this
   * file is not. Read through here rather than reaching for `CC.Stars`
   * directly, so there is one place that decides what happens when a settings
   * object names a star that does not exist. */
  function starOf(params) {
    return CC.Stars ? CC.Stars.of(params) : { hue: 52, cast: 0, output: 1, harsh: 0.45 };
  }

  /* The body's own climate before any angular structure. Exported, because
   * both the frosting and the info panel want "what is this world like" as
   * one number, and it must be the same number the field is built from. */
  /* `spec` is the archetype's `climate` declaration, or null.
   *
   * SOME BODIES ARE NOT WARMED BY A STAR, and they have to be able to say so.
   * A star, a neutron star and a black hole are not heated by some OTHER
   * star — for a star the incident term is not merely small, it is the wrong
   * idea entirely — so `climate: { starlit: false }` removes it and leaves the
   * body's own heat as the whole of its baseline.
   *
   * DECLARED, NOT DETECTED. There must never be a role-name check here: an
   * archetype says what it is, and this file believes it. That is the same
   * contract `latitude` already has, and avoiding a growing list of "if this is
   * a star" branches is exactly the failure D27 records. */
  function baseline(params, spec) {
    var sl = params.starlight === undefined ? 0.55 : params.starlight;
    var ih = params.interiorHeat === undefined ? 0.5 : params.interiorHeat;

    /* A body that declines starlight keeps only its own heat. Defaults to
     * true, so every existing archetype is unaffected and a new one has to opt
     * out deliberately. */
    if (spec && spec.starlit === false) sl = 0;

    /* THE STAR'S OUTPUT SCALES THE LIGHT, NOT THE INTERIOR. A blue giant
     * delivers more energy per unit of Starlight than a red dwarf does; what
     * the world's own core is doing is none of the star's business. Keeping
     * the two terms separate here is what stops the star colour quietly
     * becoming a second heat slider. */
    /* HOW MUCH OF ITS OWN HEAT THE BODY STILL HAS, 0..1.
     *
     * `heatTerm` describes a PLANET's interior reaching its surface, and that
     * is a statement about a body large enough to have kept the heat it formed
     * with. A small body is not a small planet in this respect: the ratio of
     * surface area to volume goes as 1/r, so a rock a few tens of kilometres
     * across radiated everything it had within the first few hundred million
     * years and has been in equilibrium with its sunlight ever since. That is
     * why an asteroid's temperature is set almost entirely by how far out it
     * is, which is exactly what its spec says.
     *
     * Without this, the shared model reported an asteroid at a comfortable
     * 7 C on default settings — a body the card was simultaneously describing
     * as airless, and which the spec puts between -200 and +100 C. The fault
     * was not in the model: Interior heat at 0.4 is a perfectly ordinary
     * setting and on a planet it should warm the surface. It is that the
     * archetype had no way to say it is too small to have any.
     *
     * DECLARED, NOT DETECTED, and it is the mirror of `selfHeated` directly
     * above: that one raises the floor for a body that IS a furnace, this one
     * scales the term down for one that never was. Defaults to 1, so every
     * existing archetype is unaffected and a new one has to opt out
     * deliberately — the same contract `starlit` has.
     *
     * INTERIOR HEAT STAYS A REAL CONTROL at any setting short of 0. A dial
     * that does nothing is worse than one that does the wrong thing, and on an
     * asteroid the honest reading of "interior heat" is not "is it molten now"
     * but "was it ever" — which should still move the deep colour and should
     * barely move the surface. */
    var retain = (spec && spec.retainsHeat !== undefined)
      ? clamp(spec.retainsHeat, 0, 1) : 1;

    var base = VOID_FLOOR + starTerm(sl) * starOf(params).output +
               heatTerm(ih) * retain;

    /* SOME BODIES ARE THEIR OWN FURNACE, and `starlit: false` alone does not
     * say so — it only removes the star, which leaves a star being scored on
     * `interiorHeat` from the same floor a rogue planet uses. Measured before
     * this existed: an ordinary star came out at a normalized 0.21 and the
     * summary reported 83% of them "frozen".
     *
     * `selfHeated` is that floor raised. The body's own heat still MOVES the
     * figure — Interior heat must remain a real control on a star, and on the
     * hottest setting one still runs hotter than on the coolest — it simply
     * starts from a number appropriate to something undergoing fusion.
     *
     * DECLARED, NOT DETECTED, exactly as `latitude` and `starlit` are. This
     * file must never ask what role a layer has; an archetype says what it is
     * and this file believes it. A brown dwarf or a cooling white dwarf is a
     * lower figure on the same axis rather than a new branch (D27). */
    if (spec && spec.selfHeated !== undefined) {
      var floor = clamp(spec.selfHeated, 0, 1);
      base = floor + (1 - floor) * base;
    }

    return clamp(base, 0, 1);
  }

  /* ---- the second temperature ------------------------------------------ */

  /* SOME BODIES HAVE TWO TEMPERATURES AND MUST SAY SO.
   *
   * Every function in this file above answers one question: how warm is the
   * SURFACE. On almost every body that is the only question there is. On an
   * ice-shelled moon it is not, and letting one field answer both gives you a
   * frozen ball with an inexplicable sea, or a warm world with an inexplicable
   * crust. Neither is a picture that means anything.
   *
   * The two facts are genuinely different:
   *
   *   the SHELL'S SURFACE is frozen — that is why there is a shell;
   *   the OCEAN beneath is liquid, because the shell insulates it and because
   *   tidal or interior heat warms it from below.
   *
   * THE ARITHMETIC IS ALREADY HERE. Interior heat is the term that reaches the
   * surface from below (D41) and is what keeps a rogue planet warm; an ice
   * moon is that same sum with a lid on it. So this does not invent a second
   * climate — it reads the same `heatTerm` the baseline does and simply
   * declines to pay the losses that the surface pays.
   *
   *   insulate  how much of the surface's cold the lid keeps out, 0..1. At 0
   *             the sea is exactly as cold as the sky above it and there is no
   *             point declaring the spec; at 1 the surface is irrelevant and
   *             only the interior speaks.
   *   floor     the temperature the interior holds the water at regardless.
   *             What makes an ice moon's sea liquid on a body whose surface
   *             never rises above freezing.
   *
   * INTERIOR HEAT STAYS A REAL CONTROL. A dead moon's sea does freeze through
   * — the floor is a floor, not a constant, and `heatTerm` still moves the
   * figure above it. What the insulation guarantees is only that the SURFACE
   * does not warm up as the ocean does, which is the contradiction being
   * avoided.
   *
   * DECLARED, NOT DETECTED, exactly as `latitude`, `starlit` and `selfHeated`
   * are. This file must never ask what role a layer has; the archetype names
   * the layer it means and this file believes it. Returns null when the body
   * declares no second temperature or when the layer it names was not built,
   * so "has this body got a subsurface ocean" is answered by the stack rather
   * than by an assumption. */
  function subsurfaceOf(params, spec, body) {
    var sub = spec && spec.subsurface;
    if (!sub) return null;

    /* The layer the second temperature describes. A moon that rolled no ice
     * shell has no subsurface ocean either, so there is nothing to report and
     * the card asks one question rather than two. */
    if (sub.layer && !(body && body.has && body.has(sub.layer))) return null;

    var ih = params.interiorHeat === undefined ? 0.5 : params.interiorHeat;
    var floor = clamp(sub.floor === undefined ? 0.30 : sub.floor, 0, 1);
    var insulate = clamp(sub.insulate === undefined ? 0.80 : sub.insulate, 0, 1);

    /* The interior's own contribution, undiminished by the surface losses the
     * baseline applies — that is what the lid buys. */
    var warmth = floor + (1 - floor) * Math.pow(clamp(ih, 0, 1), 1.30);

    /* What the surface still manages to take out of it. At full insulation
     * nothing; at none, the ocean simply is the surface. */
    var surface = baseline(params, spec);

    return clamp(surface + (warmth - surface) * insulate, 0, 1);
  }

  /* Exported so draw/zonepaint.js can derive "cold enough that the sea is
   * solid" from the floor rather than hardcoding a number the field can
   * never actually reach. */
  CC.Climate.VOID_FLOOR = VOID_FLOOR;
  /* Exported so a harness asks the real function rather than reimplementing
   * it — a probe that duplicates the logic it tests agrees with itself and
   * not with the renderer, which has cost this project two rounds already
   * (D27, D35). */
  CC.Climate.starTerm = starTerm;
  CC.Climate.heatTerm = heatTerm;
  CC.Climate.starOf = starOf;
  CC.Climate.baseline = baseline;
  /* Exported for the same reason `baseline` is: the card and any harness ask
   * the real function rather than reimplementing it. */
  CC.Climate.subsurfaceOf = subsurfaceOf;
})();
