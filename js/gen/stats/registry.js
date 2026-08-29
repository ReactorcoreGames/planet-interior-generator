/* Plain-language stats — the registry and the shared derivations.
 *
 * THE ONE RULE THIS WHOLE STAGE EXISTS TO KEEP (HAZARDS.md): a number beside
 * the render is never rolled. Every figure is derived from something that
 * shaped the image — the drawn layer radii, `details.climate`, the trait list,
 * the settings that produced all three. A card saying "frozen at the poles"
 * over a render with no ice is worse than a card with no temperature on it, so
 * there is no second source it could drift from.
 *
 * DERIVED FROM THE DRAWN RADII, NOT FROM PHYSICS (D5). The proportions are
 * textbook-diagram proportions: the crust is ~7% of the radius where a real
 * one is 0.5%. Quoting a real crust depth against a drawn crust this thick
 * would be exactly the contradiction the rule forbids.
 *
 * METRIC, WITH A COMPARISON. "Hot enough to melt lead", never "601 K". The
 * phrasebook at the bottom of HAZARDS.md is the source for the comparisons;
 * these files implement it as lookup ladders rather than prose.
 *
 *
 * ---- WHY THIS IS SPLIT BY FAMILY -------------------------------------------
 *
 * A STAT TEMPLATE IS A MINDSET, NOT A LIST OF ROWS.
 *
 * The first version was one file, and every question in it was a solid-body
 * question: what is underfoot, how much of the surface is dry land, where does
 * the coastline run, could you breathe. Those are not merely inapplicable to a
 * gas giant — they are the wrong SHAPE of question. Nobody stands on a giant.
 * The interesting facts are how deep you can go before the pressure ends you,
 * what floats at which level, and whether an operation lives in orbit, on a
 * platform, or in a hull rated for the deep.
 *
 * Bolting "if gaseous, skip the surface line" onto a solid-body template would
 * have produced a planet's card with holes in it. So the template itself is
 * per family: each declares its own line order, its own detail levels, and its
 * own reasoning, and shares only what is genuinely universal — temperature
 * conversion, radius, the hazard rating, the fingerprint.
 *
 * An archetype selects its family with `statTemplate: "gaseous"`, defaulting
 * to "solid". Adding the star and machine families is a new file here plus one
 * line in the archetype, which is the same promise the rest of the data
 * layer makes.
 *
 * Load order in index.html: this file, then the families, then anything that
 * calls `CC.Stats.build`. */

var CC = CC || {};

CC.Stats = (function () {
  "use strict";

  var clamp = CC.Math.clamp;

  var TEMPLATES = {};

  /* ---- the temperature mapping ---------------------------------------- */

  /* Climate temperatures are normalized 0..1 (HAZARDS.md: "turning that into a
   * figure is the archetype's business, because a star's 0.9 is not a planet's
   * 0.9"). This is the TERRESTRIAL mapping, and it is anchored on the climate
   * module's OWN state thresholds rather than on invented stops — so the
   * boundary between "hot" and "temperate" on the card lands exactly where the
   * boundary between hot and temperate ground lands in the render.
   *
   * A family whose temperatures live somewhere else entirely — a gas giant's
   * cloud tops, a star's photosphere — maps its own, which is precisely what
   * HAZARDS.md means by "the archetype's business". `toCelsius` stays here as
   * the shared default and the gaseous file rescales rather than replacing the
   * climate field, so both are reading one thermal model. */
  var C_TEMPERATE = -20;
  var C_HOT = 50;

  function toCelsius(t) {
    var C = CC.Climate;
    var lo = C.TEMPERATE, hi = C.HOT;
    /* Linear through the habitable band, then a power stretch at both ends so
     * the extremes reach the figures the family claims (-180 to +460, and
     * further with traits). */
    if (t >= lo && t <= hi) {
      return C_TEMPERATE + (t - lo) / (hi - lo) * (C_HOT - C_TEMPERATE);
    }
    if (t > hi) {
      var up = (t - hi) / (1 - hi);
      return C_HOT + Math.pow(up, 1.35) * 560;
    }
    var dn = (lo - t) / (lo - 0);
    return C_TEMPERATE - Math.pow(dn, 1.15) * 205;
  }

  /* ---- size, shared by every family ----------------------------------- */

  /* Radius. Rolled once from the archetype's authored range, on its own RNG
   * stream so it is stable against every other control — a colour change must
   * not resize the world. */
  function radiusKm(archetype, settings) {
    var range = archetype.radiusKm || [2400, 9800];
    var rng = CC.RNG.stream(settings.seed, "stats-size");
    var t = rng();
    /* A square-root spread, so the middle of the range is commoner than either
     * end — a contact sheet of twenty Earths and twenty giants is less useful
     * than a spread with a middle. */
    t = (t + rng()) / 2;
    return Math.round(range[0] + t * (range[1] - range[0]));
  }

  /* ---- gravity, read off the drawn body -------------------------------- */

  /* GRAVITY IS READ OFF THE DRAWN DENSE INTERIOR (D5). Surface gravity goes as
   * density times radius, and the one density signal the picture actually
   * carries is how much of the body is dense material — the metal or rock
   * heart against the whole. So a render with a huge core produces a heavy
   * world, and dragging Core size bias visibly changes both the picture and
   * this number together.
   *
   * WHICH LAYERS COUNT AS DENSE IS THE FAMILY'S CALL, passed in as a list of
   * roles rather than hardcoded here. A planet's is iron: `core` and
   * `outer-core`. A giant's is its rock heart plus the metallic-hydrogen shell
   * around it, which is genuinely the dense part of a body that is otherwise
   * gas — and reading `core` alone on a giant returned a body with almost no
   * mass, which is the wrong picture and the wrong number.
   *
   * The constants are chosen so an Earth-sized body with an Earth-ish core
   * fraction lands near 1.0 g. This is calibration, not physics. */
  function densityFractionOf(body, roles) {
    var dense = 0;
    for (var i = 0; i < body.layers.length; i++) {
      var l = body.layers[i];
      if (roles.indexOf(l.role) >= 0 && l.outer > dense) dense = l.outer;
    }
    /* Fraction of the body's VOLUME, which is what density responds to — the
     * cube is why a modest change in the drawn radius makes a real difference
     * to the figure. */
    return Math.pow(dense, 3);
  }

  /* THE RADIUS TERM IS CALIBRATED PER FAMILY, and it has to be.
   *
   * `density * (radius / 6100)` is a terrestrial scaling: it says a body twice
   * Earth's radius at Earth's density pulls twice as hard, which is true, and
   * it lands an Earth-sized rock at 1 g, which is the point. Handed a gas
   * giant it produced 7.3 g on an ordinary Jupiter and pinned every single one
   * against the 6 g clamp — the Gravity line stopped varying at all across the
   * whole family, which is worse than being wrong, because a constant carries
   * no information.
   *
   * The reason is not a bug in the arithmetic, it is D45's trap again: a giant
   * is ten times Earth's radius and a tenth of its density, and a formula
   * holding density roughly fixed while radius grows tenfold can only run
   * away. Real giants land between 0.9 and 2.5 g precisely because the two
   * effects cancel, and a family whose radius range is an order of magnitude
   * different needs its own `scale`.
   *
   * `scale` is the radius at which this family's ordinary density gives 1 g. */
  function gravityOf(body, radius, roles, scale) {
    var denseVol = densityFractionOf(body, roles || ["core", "outer-core"]);
    /* 0.29 is roughly what Earth's drawn stack gives; scale around it. */
    var density = 0.72 + denseVol * 1.55;
    return clamp(density * (radius / (scale || 6100)), 0.04, 6.0);
  }

  /* ---- the colour fingerprint ------------------------------------------ */

  /* THE BODY'S OWN PALETTE, as a row of swatches.
   *
   * It is a *detail* rather than a stat: it asserts nothing, and there is no
   * figure on it to contradict anything. What it does is make the card
   * identifiably THIS world at a glance, the way a colour bar on a book spine
   * does — two Garden Worlds with different seeds produce visibly different
   * rows even when every line of text matches.
   *
   * READ FROM `colorProfile.order`, NOT from the built layer list, and the
   * difference matters for the same reason it mattered in D12: `order` encodes
   * DEPTH, so the swatches always run surface-to-centre in a stable sequence.
   * Walking `body.layers` instead would reorder the row whenever a layer
   * appeared or vanished, and a fingerprint that changes shape when you drag
   * Ocean depth is not a fingerprint.
   *
   * Layers that are absent are skipped rather than blanked — the row is what
   * this body is made of, so a world with no ocean simply has no ocean
   * swatch. */
  function fingerprintOf(body, palette, archetype) {
    var out = [];
    if (!palette || !palette.layers) return out;
    var order = (archetype.colorProfile && archetype.colorProfile.order) || [];

    for (var i = 0; i < order.length; i++) {
      var role = order[i];
      var entry = palette.layers[role];
      if (!entry || !entry.hex) continue;
      /* Present in the DRAWN stack, not merely declared in the profile. */
      if (!body.has(role)) continue;
      out.push({ role: role, hex: entry.hex });
    }
    return out;
  }

  /* ---- the layer stack, as depths ------------------------------------- */

  /* EVERY LAYER'S OUTER EDGE AS A DEPTH BELOW THE BODY'S SURFACE, in km.
   *
   * The single most useful shared derivation for a family whose story is
   * depth rather than area. Read off the drawn radii and the rolled radius, so
   * a quoted depth and the band it names are the same statement — drag any
   * thickness control and both move.
   *
   * Returns entries outermost-first, each `{ role, depthKm, thickKm }`. */
  function depthProfileOf(body, radius) {
    var out = [];
    var surface = body.surface || 1;
    for (var i = 0; i < body.layers.length; i++) {
      var l = body.layers[i];
      if (l.outward) continue;
      out.push({
        role: l.role,
        depthKm: Math.max(0, (surface - l.outer) * radius),
        thickKm: Math.max(0, (l.outer - l.inner) * radius),
        outer: l.outer,
        inner: l.inner
      });
    }
    return out;
  }

  /* ---- registration and dispatch --------------------------------------- */

  /* A family file calls this with its id and a builder. The builder is handed
   * everything that was drawn plus the shared derivations above, and returns
   * `{ lines, levels, facts }` — the rows, the detail-level line sets, and the
   * fact bundle the flavour pools are filtered against. */
  function registerTemplate(id, template) {
    TEMPLATES[id] = template;
    return template;
  }

  function templateFor(archetype) {
    var id = archetype.statTemplate || "solid";
    return TEMPLATES[id] || TEMPLATES.solid;
  }

  /* `body` and `details` are what got drawn; `settings` is what produced them.
   * Nothing else is consulted, which is the whole guarantee. */
  function build(body, details, settings, archetype, palette) {
    var template = templateFor(archetype);
    var rng = CC.RNG.stream(settings.seed, "stats-flavour");
    var radius = radiusKm(archetype, settings);

    var shared = {
      radius: radius,
      toCelsius: toCelsius,
      gravityOf: gravityOf,
      densityFractionOf: densityFractionOf,
      depthProfile: depthProfileOf(body, radius),
      /* THE BODY'S RESOLVED COLOURS, as `role -> { h, s, v, hex }`.
       *
       * `build` has always had it — the fingerprint strip is built from it a
       * few lines below — and it simply was never passed down, because no
       * template had a question the colours answered. The asteroid does: what
       * a rock is MADE OF is a statement the picture makes in its interior's
       * own value and saturation, and a card that rolled a composition
       * independently would describe a dark carbonaceous body over a render
       * of bright silicate. Reading the palette is the only way that line can
       * be a derivation rather than a second source (the rule at the top of
       * this file).
       *
       * May be null when a body is generated headlessly without colours, so
       * a template that reads it must tolerate that. */
      palette: palette || null,
      clamp: clamp
    };

    var built = template.build(body, details, settings, archetype, rng, shared);

    return {
      name: CC.Flavour.nameOf(settings),
      typeLabel: archetype.label || archetype.id,
      hazard: built.hazard.rating,
      hazardScore: built.hazard.score,
      lines: built.lines,
      /* WHICH LINES EACH DETAIL LEVEL SHOWS — the family's call, not the
       * card's. draw/card.js used to hold this as a hardcoded list of solid
       * keys, which meant it was the one place in draw/ that knew what a
       * planet has; a gas giant's card would have asked for a `surface` row
       * that does not exist. The template owns it now and the card simply
       * reads it. */
      levels: built.levels,
      /* The body's palette as a swatch row, plus the seed that produced it —
       * the card's "fingerprint" strip. Not a stat: it asserts nothing, it
       * simply makes the card identifiably this world. */
      fingerprint: fingerprintOf(body, palette, archetype),
      seed: settings.seed,
      /* The raw figures, so a probe can assert the card against the render
       * without parsing English. */
      facts: built.facts
    };
  }

  return {
    build: build,
    registerTemplate: registerTemplate,
    templateFor: templateFor,
    toCelsius: toCelsius,
    gravityOf: gravityOf,
    densityFractionOf: densityFractionOf,
    depthProfileOf: depthProfileOf,
    radiusKm: radiusKm,
    fingerprintOf: fingerprintOf,
    RATINGS: CC.Hazard.RATINGS
  };
})();
