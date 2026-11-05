/* One layer's saturation and value, in the order the layer's own stream draws
 * them: the roll, then everything that moves it. Stages of `deriveLayer`
 * (gen/palette-layer.js): `st` is the body's state and `c` the layer's own.
 *
 * Split out of gen/palette.js, which passed the 500-line rule. Attached to
 * CC.Palette; gen/palette.js and gen/palette-util.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp, lerp = M.lerp;
  var wrapHue = CC.Palette.wrapHue, mixHue = CC.Palette.mixHue;
  var emissiveSpec = CC.Palette.emissiveSpec;

    /* Saturation and value come from the archetype's profile for this role.
     * The archetype decides the *relationship*; the user's sliders scale it
     * without flattening it. */
  function rollMaterial(st, c) {
    var spec = c.spec, lrng = c.lrng;
    var s = lerp(spec.sat[0], spec.sat[1], lrng());
    var v = lerp(spec.val[0], spec.val[1], lrng());
    c.s = s;
    c.v = v;
  }

    /* WHAT THE MATERIAL IS, AS A FUNCTION OF HOW MUCH LIGHT ARRIVES.
     *
     * `climateLean` is `heatLean`'s counterpart on the other heat source.
     * `heatLean` says a layer's material changes with the body's own
     * interior heat; this says it changes with the STAR. Both perturb the
     * rolled colour rather than replacing it (zones.js rule 1), so the same
     * seed under three Starlight settings gives three visibly different
     * worlds that are still recognisably one world.
     *
     *   climateLean: { chill:  { hue, amount, sat, val },
     *                  scorch: { hue, amount, sat, val } }
     *
     * The gas giant's cloud decks are the first user and the reason it
     * exists: ammonia, ammonium hydrosulphide and water condense at
     * different temperatures, so which deck is VISIBLE is a fact about
     * temperature. A cold giant shows a pale high ammonia deck; a hot one
     * has its condensation level driven below the visible layer and shows
     * the darker chromophore-stained gas underneath. Different material,
     * not the same material tinted — which is what the phase's
     * done-condition asks Starlight to change.
     *
     * IT READS `chillAt` / `scorchAt`, the same two figures the frosting
     * reads, and authors no threshold of its own (D42).
     *
     * Weighted by (1 - depth), for the same reason the star cast is: light
     * reaches the envelope and not the core, and a core that changed colour
     * with the star would read as a wash over the picture. Self-lit layers
     * are exempt entirely, as they are from every other reflective rule
     * (D13). */
  function leanClimate(st, c) {
    var spec = c.spec, depth = c.depth, lrng = c.lrng;
    var h = c.h, s = c.s, v = c.v;
    var chillMean = st.chillMean, scorchMean = st.scorchMean;
    if (spec.climateLean && !emissiveSpec(spec)) {
      var lightReachC = 1 - depth;
      var endSpec = null, endAmt = 0;
      if (chillMean >= scorchMean) {
        endSpec = spec.climateLean.chill; endAmt = chillMean;
      } else {
        endSpec = spec.climateLean.scorch; endAmt = scorchMean;
      }
      if (endSpec && endAmt > 0) {
        var travel = clamp(endAmt * (endSpec.amount === undefined
                                     ? 0.5 : endSpec.amount)
                           * lightReachC, 0, 0.95);
        if (endSpec.hue) {
          var destC = wrapHue(lerp(endSpec.hue[0], endSpec.hue[1], lrng()));
          h = mixHue(h, destC, travel);
        }
        if (endSpec.sat) s = clamp(s + endSpec.sat * travel, 0, 1);
        if (endSpec.val) v = clamp(v + endSpec.val * travel, 0.03, 1);
      }
    }
    c.h = h;
    c.s = s;
    c.v = v;
  }

    /* Interior heat drives saturation directly: a hot world glows toward
     * the top of its range and a dead one drains toward grey. Weighted by
     * depth, so heat shows most in the layers nearest the core — which is
     * where the heat actually is. */
  function heatMaterial(st, c) {
    var spec = c.spec, depth = c.depth, s = c.s, v = c.v;
    var heat = st.heat;
    if (spec.heatDriven !== false) {
      var heatPush = (heat - 0.5) * 2;              /* -1 .. +1 */
      s = clamp(s * (1 + heatPush * 0.45 * depth), 0, 1);

      if (heatPush >= 0) {
        /* A hot world's interior genuinely glows. Self-lit layers get a
         * real push toward the top of their range in both saturation and
         * brightness, rather than merely avoiding the decay a cold world
         * suffers — "hot" should look hot, not just "not dead". */
        if (emissiveSpec(spec)) {
          s = clamp(s + heatPush * 0.22 * depth, 0, 1);
          v = clamp(v + heatPush * 0.14 * depth, 0.03, 1);
        } else {
          /* AND SO DOES ORDINARY ROCK, WHICH IT PREVIOUSLY DID NOT (D59).
           *
           * The push above was inside the emissive branch, so a non-emissive
           * layer got SATURATION from heat and nothing else. Meanwhile the
           * cold branch below drops value on every layer regardless. The
           * control was therefore asymmetric in the one way that matters
           * visually: Interior heat could dim a mantle but could never
           * brighten one, and cranking the dial to maximum made the band a
           * little more colourful and not one shade lighter.
           *
           * The coefficient is smaller than the emissive one and rides
           * depth, so the crust barely moves while the mantle — the layer
           * with real depth and the one being looked at — genuinely
           * lightens as it heats. Rock near its melting point is brighter
           * than cold rock, so this is the believable direction as well as
           * the legible one. */
          v = clamp(v + heatPush * 0.20 * depth, 0.03, 1);
        }
      } else {
        /* A dying world loses colour everywhere, not only at the core. */
        s = clamp(s * (1 + heatPush * 0.30), 0, 1);

        /* And its interior stops glowing. A cold core is dull metal, so the
         * deep layers lose brightness as well as saturation — a dead world
         * should look dead in its colour as well as in its structure,
         * without needing a trait to say so. */
        v = clamp(v * (1 + heatPush * 0.38 * depth), 0.03, 1);
      }
    }

    /* `heatValue: [atCold, atHot]` — A LAYER WHOSE LIGHTNESS IS ITS HEAT.
     *
     * The rule above weights heat by depth, which is right for a planet:
     * the heat is in the middle and a crust barely feels it. A neutron
     * star's crust is the opposite case — the body's own heat is what
     * makes it glow, and the spec's cooling crust is a whole step dimmer.
     * A multiplier on value between the two ends of the dial, independent
     * of depth. Absent on every layer that does not declare it. */
    /* An optional third figure is the heat at which the layer reaches
     * full lightness, so a dial can dim a layer at its low end only (the
     * machine world's heart, under Operational status). */
    if (spec.heatValue) {
      var hvAt = spec.heatValue[2] || 1;
      v = clamp(v * lerp(spec.heatValue[0], spec.heatValue[1], Math.min(1, heat / hvAt)), 0.03, 1);
    }
    c.s = s;
    c.v = v;
  }

  function separateFromMud(st, c) {
    var spec = c.spec, v = c.v;
    var contrast = st.contrast;

    /* Contrast between layers: push each layer's value away from the mean
     * of its profile, so adjacent bands separate more or less strongly. */
    var vMid = (spec.val[0] + spec.val[1]) / 2;
    v = vMid + (v - vMid) * contrast;

    /* Push value away from the muddy middle.
     *
     * Mid-saturation at mid-value is where colours go to die — the
     * grey-brown-purple mush that made several bodies in the first pass
     * unreadable. Nudging each layer's value toward whichever end of the
     * range it is already closer to keeps adjacent bands distinguishable
     * without changing the archetype's overall light-to-dark ordering. */
    var awayFromMid = (v - 0.5) >= 0 ? 1 : -1;
    var mudness = 1 - Math.abs(v - 0.5) / 0.5;      /* 1 at v=0.5 */
    v += awayFromMid * mudness * 0.10 * contrast;
    c.v = v;
  }

    /* HOW BRIGHT AND HOW HARD THE LIGHT IS, not only what colour it is.
     *
     * A red-dwarf world is genuinely dimmer — less light arrives and less of
     * it is at the wavelengths a surface reflects strongly — and a blue
     * giant's is harsher, which reads as higher contrast and a little more
     * saturation in what it lights. Without this the star colour would be a
     * hue rotation and nothing more, and a "dim red sun" would come out just
     * as bright as a blue one.
     *
     * Rides the same depth falloff and the same emissive exemption as the
     * hue cast, for the same reasons. */
  function lightMaterial(st, c) {
    var spec = c.spec, layer = c.layer, depth = c.depth, s = c.s, v = c.v;
    var star = st.star, starlight = st.starlight, starHarsh = st.starHarsh;
    if (star && !emissiveSpec(spec) && !layer.luminous) {
      var lightReach = (1 - depth) * clamp(starlight / 0.35, 0, 1);
      v = clamp(v * (1 + (star.output - 1) * 0.30 * lightReach), 0.03, 1);
      s = clamp(s * (1 + (starHarsh - 0.45) * 0.22 * lightReach), 0, 1);
    }
    c.s = s;
    c.v = v;
  }

    /* THE STAR-ACTIVITY COUPLING, and it is GATED ON THE CHECKBOX.
     *
     * The user's idea, and a good one: it gives the toggle a reason to exist
     * inside the simulation rather than being purely a taste switch. A
     * strange sea becomes a CONSEQUENCE of a strange star — pushed
     * saturation and brightness, a sea that looks chemically wrong under a
     * violent sun.
     *
     * The gate is what keeps the realistic default genuinely realistic: an
     * active star cannot distort a sea the user has asked to keep plausible.
     * Only a layer that declared `exotic.activity` feels it, so this is
     * archetype data rather than a role name here. */
  function activityPush(st, c) {
    var spec = c.spec, s = c.s, v = c.v;
    var params = st.params;
    if (spec.activity && params.exoticOceans) {
      var act = clamp(params.starActivity === undefined ? 0.3
                      : params.starActivity, 0, 1);
      s = clamp(s * (1 + act * spec.activity.sat), 0, 1);
      v = clamp(v * (1 + act * spec.activity.val), 0.03, 1);
    }
    c.s = s;
    c.v = v;
  }

    /* A NEARLY-MOLTEN LAYER HAS A FLOOR UNDER ITS SATURATION AND VALUE.
     *
     * Getting the hue right was not sufficient on its own. A mantle can roll
     * the bottom of its authored ranges — measured at full heat: s≈0.43,
     * v≈0.31 — and a dark desaturated red is maroon, which reads as cold
     * rock however correct its hue is. That was the residual "still feels
     * like a solid rock layer" case after the lean was fixed.
     *
     * The floor rises with the lean, so it does nothing at low heat and only
     * bites where the material is supposed to be glowing. It is a FLOOR
     * rather than a set value, so a mantle that already rolled hot and
     * saturated keeps its own roll and the variety between bodies survives.
     *
     * Scaled by the user's own sliders afterwards, so turning Saturation or
     * Brightness down still works — this raises the archetype's floor, it
     * does not overrule the person using it. */
  function moltenFloor(st, c) {
    var spec = c.spec, s = c.s, v = c.v;
    var heat = st.heat;
    if (spec.heatLean && spec.heatDriven !== false) {
      var molten = clamp((heat - 0.5) / 0.5, 0, 1) *
                   (spec.heatLean.amount === undefined ? 0.45
                    : spec.heatLean.amount);
      if (molten > 0) {
        s = Math.max(s, lerp(s, 0.62, molten * 0.85));
        v = Math.max(v, lerp(v, 0.56, molten * 0.85));
      }
    }
    c.s = s;
    c.v = v;
  }

    /* ONE DIAL MOVING THE WHOLE PALETTE — `colorProfile.dial`.
     *
     * `{ param, val, sat, hue: { to, amount } }`, each a curve over the
     * named parameter (CC.Math.curve). The nebula's Luminosity source is
     * the first user: dark is near-black and grey, reflection is cooled
     * toward blue, emission is vivid. A profile-level declaration, so it
     * applies to every layer the profile colours; absent on every other
     * archetype. Applied before the user's own Saturation and Brightness,
     * so those keep meaning what they mean.
     *
     * `hue.curve` in place of `hue.to` makes the destination itself a curve
     * over the dial — a BLACKBODY RAMP: the compact family's Surface heat
     * runs ember, amber, white, blue-white, which is the colour sequence
     * everyone reads as "how hot a star is". The step from amber to blue is
     * authored where `sat` has dipped to near-white, so it never shows. */
  function profileDial(st, c) {
    var h = c.h, s = c.s, v = c.v;
    var profile = st.profile, params = st.params;
    if (profile.dial) {
      var pd = profile.dial;
      var pdv = params[pd.param];
      pdv = clamp(pdv === undefined ? (pd.dflt === undefined ? 0.5 : pd.dflt) : pdv, 0, 1);
      if (pd.hue) {
        var pdTo = pd.hue.curve ? M.curve(pd.hue.curve, pdv) : pd.hue.to;
        h = mixHue(h, pdTo, clamp(M.curve(pd.hue.amount, pdv), 0, 1));
      }
      if (pd.sat) s = clamp(s * M.curve(pd.sat, pdv), 0, 1);
      if (pd.val) v = clamp(v * M.curve(pd.val, pdv), 0.03, 1);
    }
    c.h = h;
    c.s = s;
    c.v = v;
  }

  /* The user's own Saturation and Brightness. */
  function userScale(st, c) {
    var s = c.s, v = c.v;
    var satScale = st.satScale, valScale = st.valScale;
    s = clamp(s * satScale, 0, 1);
    v = clamp(v * valScale, 0.03, 1);
    c.s = s;
    c.v = v;
  }

    /* Keep colours off the fluorescent corner of HSV.
     *
     * High saturation together with high value gives pure spectral hue —
     * the #00ff00 look. It reads as a glowing plastic bead, not as material,
     * and it was the worst artefact in the first colour pass. Real bright
     * surfaces desaturate as they brighten, so saturation is capped by how
     * bright the layer already is.
     *
     * Self-lit layers are exempt: a molten core and a star's photosphere are
     * *supposed* to be saturated and bright, because they are emitting
     * rather than reflecting. Applying the reflective rule to them was what
     * made hot interiors look dull. They are still held off pure spectral
     * hue, just far less aggressively. */
  function fluorescentCeiling(st, c) {
    var spec = c.spec, layer = c.layer, s = c.s, v = c.v;
    var params = st.params;
    var emissive = layer.luminous || emissiveSpec(spec);
    if (spec.hueWild && params.exoticOceans) {
      /* AN EXOTIC SEA IS HELD TO A LOOSER CEILING, not exempted from one.
       *
       * The fluorescent rule exists because high saturation at high value
       * gives pure spectral hue, which reads as a glowing plastic bead
       * rather than as material (D11) — and that is still true of a sea. But
       * the strict reflective bound would forbid the pale, milky and
       * near-white seas that are most of what this control is for, since it
       * cuts saturation hard above v=0.55 and the lifted ceiling reaches
       * 0.78. A pale sea is low-saturation anyway; the bound only has to
       * stop a saturated one from also being bright. */
      s = Math.min(s, 1 - 0.42 * Math.max(0, v - 0.70) / 0.30);
    } else if (!emissive) {
      s = Math.min(s, 1 - 0.55 * Math.max(0, v - 0.55) / 0.45);
    } else {
      s = Math.min(s, 1 - 0.12 * Math.max(0, v - 0.75) / 0.25);
    }
    c.s = s;
    c.emissive = emissive;
  }

  CC.Palette.rollMaterial = rollMaterial;
  CC.Palette.leanClimate = leanClimate;
  CC.Palette.heatMaterial = heatMaterial;
  CC.Palette.separateFromMud = separateFromMud;
  CC.Palette.lightMaterial = lightMaterial;
  CC.Palette.activityPush = activityPush;
  CC.Palette.moltenFloor = moltenFloor;
  CC.Palette.profileDial = profileDial;
  CC.Palette.userScale = userScale;
  CC.Palette.fluorescentCeiling = fluorescentCeiling;
})();
