/* Stars — the stat TEMPLATE: which rows the card prints, and in what order.
 *
 * THE MINDSET (D78 — a stat template is a MINDSET, not a list of rows):
 *
 * A GIANT'S CARD ASKS HOW FAR DOWN YOU CAN GET. A STAR'S CARD DOES NOT ASK
 * THAT, because the answer is "nowhere, not even slightly", and a card whose
 * signature line is a constant carries no information. Nor does it ask what is
 * underfoot, how much is dry land, or whether you could breathe — deleting the
 * surface lines from a planet's card would leave a planet's card with holes in
 * it, which is exactly the failure D78 records.
 *
 * What a star's card asks instead: how hot is the surface and therefore what
 * colour is it, HOW IS THE ENERGY GETTING OUT (the family's whole subject),
 * how long will it last, how far out is it safe, and how violent is it.
 *
 * Every figure comes from js/gen/stats/stellar-derive.js, which must load
 * before this file. Nothing is rolled — see the rule at the top of
 * js/gen/stats/registry.js. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;
  var S = CC.Stats.stellar;
  var surfaceC = S.surfaceC, transportOf = S.transportOf;
  var coreRatioOf = S.coreRatioOf, coreLine = S.coreLine;
  var lifespanOf = S.lifespanOf, reachOf = S.reachOf;
  var activityLine = S.activityLine;

  /* ---- the template ---------------------------------------------------- */

  CC.Stats.registerTemplate("stellar", {
    build: function (body, details, settings, archetype, rng, shared) {
      var climate = details.climate;
      var radius = shared.radius;
      var tags = archetype.tags || [];

      /* THE SURFACE TEMPERATURE, from `tempAt` and nothing else.
       *
       * The field is FLAT on a star (`latitude: 0`), so min and max are the
       * same figure and there is no range to quote — which is itself the
       * proof that no polar cap can exist here. The card says one number, and
       * it says it plainly. */
      var surfC = surfaceC(climate.mean);

      /* STAR ACTIVITY REACHES THIS CARD THROUGH THE CLIMATE FIELD, not from
       * `settings` directly, so it is the same figure the render used —
       * including the stellar exception that stops Starlight easing it (see
       * the `selfLit` branch in gen/climate.js). */
      var activity = climate.activity;

      var transport = transportOf(body);
      var core = coreRatioOf(body, radius);
      var life = lifespanOf(radius, tags, settings.interiorHeat);
      var reach = reachOf(radius, surfC, activity);

      var traits = (details.traits || []).map(function (t) { return t.id; });

      /* THE FACT BUNDLE, and note what is DELIBERATELY ABSENT.
       *
       * No `landFraction`, no `crushKm`, no `deck`, no `breathable`. A giant's
       * card at least asks how deep a hull can go; on a star that question has
       * one answer for every body in the family and would be a constant. What
       * IS here — the transport regime, the core ratio, the lifespan, the
       * activity — is what differs from one star to the next.
       *
       * `family: "stellar"` is what the flavour pools branch on, so a line
       * written for a planet or a giant can never be picked for a star. */
      var facts = {
        family: "stellar",
        radius: radius,
        surfC: surfC,
        /* `tempMin`/`tempMax` are the shared names the hazard rating reads.
         * They are equal here, which is the flat field showing through, and
         * the hazard file has a stellar branch for exactly that reason. */
        tempMin: surfC, tempMax: surfC,
        spread: climate.spread,
        /* THE DONE-CONDITION, CARRIED ON THE CARD'S OWN FACT BUNDLE so a probe
         * can assert it without re-deriving anything: no star has a polar cap.
         * With `latitude: 0` this is structurally 0 or 1 and never a fraction,
         * and with `selfHeated` it is 0. */
        frozenFraction: climate.frozenFraction,
        temperate: 0,
        radiation: climate.radiation,
        activity: activity,
        interiorHeat: settings.interiorHeat,
        starlight: settings.starlight,
        /* A star is never sunless — it is the sun. Stated rather than left to
         * fall out of the arithmetic, because the universal flavour pool has a
         * "there is no sun" line and it must never be offered here. */
        sunless: false,
        locked: false,
        gravity: 6.0,
        transport: transport.kind,
        transportText: transport.text,
        core: core,
        luminosity: reach.luminosity,
        habitableZone: reach.hz,
        evolved: tags.indexOf("evolved") >= 0,
        young: tags.indexOf("young") >= 0,
        fullyConvective: tags.indexOf("fully-convective") >= 0,
        spotted: tags.indexOf("spotted") >= 0,
        shedding: body.has("shed-envelope"),
        hasCorona: body.has("corona"),
        hasTachocline: body.has("tachocline"),
        /* The envelope IS the atmosphere in the sense the hazard file asks
         * about — there is no vacuum penalty to apply to a star, and applying
         * one would be scoring it for a fact that means nothing here. */
        atmosphere: { present: true, pressure: 0, text: "" },
        breathable: false,
        traits: traits,
        dust: body.has("shed-envelope")
      };

      var hazard = CC.Hazard.of(facts);
      facts.hazardScore = hazard.score;
      facts.radiation = hazard.radiation;

      var lines = [
        /* ACROSS, AND THE SAYING IS ABOUT THE SAME FIGURE.
         *
         * The other families print a diameter and compare it against a ladder
         * of diameters. This one printed a diameter and passed the RADIUS to
         * its ladder, so a star 2.4 million km across was described as "a
         * little larger than the Sun" — true of its radius, and not what the
         * number beside it said. The ladder takes the radius because that is
         * how stellar sizes are quoted everywhere else; the printed figure is
         * the diameter because that is what "across" means. Both are now
         * derived from the one `radius`, so they cannot disagree. */
        { key: "size", label: "Size",
          value: (radius * 2).toLocaleString("en-US") + " km across - " +
                 CC.Phrasebook.starSizeSaying(radius) },
        /* THE ONE FACT A READER CAN CHECK AGAINST THE PICTURE. */
        { key: "temp", label: "Surface temperature",
          value: Math.round(surfC / 100) * 100 + " C at the photosphere - " +
                 CC.Phrasebook.saying(CC.Phrasebook.STAR_TEMP, surfC) },
        /* THE FAMILY'S SIGNATURE LINE — how the energy gets out. */
        { key: "transport", label: "Energy transport", value: transport.text },
        { key: "core", label: "Fusing core", value: coreLine(core, radius) },
        { key: "activity", label: "Activity",
          value: activityLine(activity, facts.spotted) },
        { key: "lifespan", label: "Lifespan", value: life.text },
        { key: "reach", label: "Habitable zone", value: reach.text },
        { key: "notable", label: "Notable", value: CC.Flavour.notableOf(facts, rng) },
        { key: "resources", label: "Resources", value: CC.Flavour.resourceOf(facts, rng) },
        { key: "approach", label: "Approach", value: CC.Flavour.approachOf(facts, rng) },
        { key: "danger", label: "Biggest danger", value: CC.Flavour.dangerOf(facts, rng) }
      ];

      return { lines: lines, facts: facts, hazard: hazard, levels: LEVELS };
    }
  });

  /* WHICH LINES EACH DETAIL LEVEL SHOWS — the stellar set.
   *
   * `transport` is in COMPACT, and that placement is the clearest single
   * statement of how this template differs from the other two. A planet's
   * compact card leads with what the surface is like; a giant's with how far
   * down you can get; a star's with how the heat gets out, because that is
   * what its cutaway is a picture OF. */
  var LEVELS = {
    compact: ["size", "temp", "transport", "activity", "danger"],
    standard: ["size", "temp", "transport", "core", "activity", "lifespan",
               "danger"],
    full: null
  };
})();
