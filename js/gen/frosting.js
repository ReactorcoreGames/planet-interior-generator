/* Surface frosting colour — four zones, one family.
 *
 * Split out of gen/palette.js, which passed the 500-line rule once the four
 * zones landed. This is a self-contained stage: it reads the archetype's
 * frosting spec plus the already-resolved layer colours, and writes the four
 * zone entries back into the same map.
 *
 * See PROGRESS.md D20 for the zone model and the three colour traps that
 * shaped it, and D19 for the host-lookup bug that came before.
 *
 * The colour helpers (lighter/darker/rgba factories, hue wrapping) belong to
 * gen/palette.js and are handed in as `helpers` rather than duplicated, so
 * there is exactly one definition of what "a lighter relative of this colour"
 * means. Loaded after gen/palette.js.
 */

var CC = CC || {};

CC.Frosting = (function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp, lerp = M.lerp;

  /* gen/palette.js owns the colour-relative factories and hue wrapping. They
   * are handed in rather than reimplemented here so there is exactly one
   * definition of what "a lighter relative of this colour" means. */
  var wrapHue, makeLighter, makeDarker, makeRgba;

  /* --- the surface frosting ---
   *
   * A pseudo-role: it has a colour profile but is not a layer in the stack,
   * so build()'s layer loop never reaches it. Called after that loop, and off
   * its own RNG stream, so it cannot disturb the layers or the adjacency pass.
   *
   * FOUR COLOURS, ONE PER ELEVATION ZONE — peak, land, shallow, deep. They are
   * generated as a family rather than independently: one base hue, with each
   * zone offset from it by an authored amount. That is what keeps a world's
   * cover looking like one planet's ecology instead of four unrelated paints,
   * while still letting the shore differ from the hilltops.
   *
   * HUE IS ESSENTIALLY FREE. The user's call, and the right one: these worlds
   * are already wildly varied, so orange grass or pink forests on a brown
   * world is a feature. The first version authored 70..145 degrees and rotated
   * it by a near-constant aridity figure, which meant every body landed on the
   * same ochre — the narrow range was doing the opposite of its job.
   *
   * WHAT IS CONSTRAINED IS CONTRAST, NOT HUE. Frosting has to read as lying ON
   * the rock, and that is a relationship, not a colour: it is guaranteed to be
   * clearly lighter and more saturated than the crust it covers. Making the
   * separation relational rather than absolute is what allows the hue to roam
   * free without any world losing its cover to the background. */
  /* THE ZONE TABLE — the thing D22 said must move out of draw/film.js.
   *
   * An archetype's `colorProfile.layers.film` declares its zones as an
   * ordered map, outermost-down, each carrying BOTH its colour ranges and its
   * deposition character. Keeping the two together is the point: the four
   * character knobs and the colour they pair with are one statement about a
   * material, and having them in two files a thousand lines apart is what
   * made the planet's numbers look like constants of the renderer rather than
   * facts about a planet.
   *
   *   depth   how thick it lies, as a fraction of the host layer
   *   smooth  how much flatter than the rock its top surface is. High values
   *           pool and level out; low values drape and follow the ground
   *   bleed   how far its underside fingers down into the rock
   *   patch   how much of the mask's variation reaches the alpha. Low is an
   *           even coat, high is broken and blotchy
   *   grain   amplitude of the fine wobble on the top surface — the
   *           difference between a poured glaze and a crumbly one
   *
   * ANY COUNT, NOT FOUR. A planet declares four (peak, land, shallow, deep);
   * a giant's crushed floor declares two. `zoneWeights` in draw/film.js is
   * written against the table's length and the `snow` / `aquatic` flags
   * rather than against four fixed positions, so neither number appears
   * anywhere in the renderer.
   *
   * `line` and `shelf` are the per-archetype thresholds that used to be
   * SNOWLINE 0.42 and SHELF -0.16 — Earth-ish numbers that had no business
   * being universal. Both are offsets from the level line, in units of the
   * terrain's own range, exactly as before.
   *
   * Returns null for an archetype with no frosting at all, which is how a
   * body with no terrain-carrying layer pays nothing. */
  /* WHICH FROSTING SPEC BELONGS TO WHICH LAYER.
   *
   * There used to be exactly one, `colorProfile.layers.film`, resolved once
   * for the whole body — which was right while every archetype had a single
   * frosted surface. The ice-shelled moon has TWO, facing each other across a
   * dark ocean: a rock floor frosted upward with brine pools, and the shell's
   * underside frosted downward as accreted ice. They are different materials,
   * different colours and different directions, so one table cannot describe
   * both.
   *
   * A spec is therefore found in one of three places, most specific first:
   *
   *   layers[role].film_when[otherRole]   the branch form — this layer frosts
   *                                       differently when that layer exists.
   *                                       A moon's crust is a cratered surface
   *                                       on the dry branch and a sea floor on
   *                                       the ice one.
   *   layers[role].film                   this layer's own frosting
   *   layers.film                         the body's single frosting, which is
   *                                       what every existing archetype
   *                                       declares and what it keeps meaning
   *
   * The fallback is last, so nothing that worked before this moves: a planet
   * and a gas giant each declare one `layers.film` and every terrain-carrying
   * layer resolves to it exactly as it always did.
   *
   * `has` answers whether a role was built, so the branch is decided by the
   * stack that actually exists rather than by what the archetype might roll. */
  function specFor(profile, role, has) {
    var layers = profile && profile.layers;
    if (!layers) return null;

    var own = layers[role];
    if (own) {
      if (own.film_when && has) {
        for (var key in own.film_when) {
          if (!Object.prototype.hasOwnProperty.call(own.film_when, key)) continue;
          if (has(key)) return own.film_when[key];
        }
      }
      if (own.film) return own.film;
    }
    return layers.film || null;
  }

  /* Every DISTINCT frosting spec on a body, keyed by the role it frosts.
   * Callers that resolve colours walk this; callers that only need one table
   * per layer use `specFor` directly. */
  function specsByRole(profile, roles, has) {
    var out = {};
    for (var i = 0; i < roles.length; i++) {
      var spec = specFor(profile, roles[i], has);
      if (spec) out[roles[i]] = spec;
    }
    return out;
  }

  function zoneTable(spec) {
    if (!spec || !spec.zones) return null;

    var keys = [];
    var rows = [];
    for (var k in spec.zones) {
      if (!Object.prototype.hasOwnProperty.call(spec.zones, k)) continue;
      var z = spec.zones[k];
      keys.push(k);
      rows.push({
        key: k,
        /* Defaults are the planet's ordinary ground cover, so a zone that
         * declares only a colour still deposits something reasonable. */
        depth: z.depth === undefined ? 0.32 : z.depth,
        smooth: z.smooth === undefined ? 0.50 : z.smooth,
        bleed: z.bleed === undefined ? 0.70 : z.bleed,
        patch: z.patch === undefined ? 0.60 : z.patch,
        grain: z.grain === undefined ? 0.25 : z.grain,
        /* Which zone the snowline governs, and which are seen through water.
         * Read from the same flags the colour stage already keys off, so the
         * two can never disagree about which zone is which. */
        snow: !!z.snow,
        aquatic: !!z.aquatic
      });
    }
    if (!rows.length) return null;

    return {
      zones: rows,
      keys: keys,
      /* The two thresholds. Defaults are the planet's, so an archetype that
       * declares zones without thresholds behaves exactly as before. */
      line: spec.line === undefined ? 0.42 : spec.line,
      shelf: spec.shelf === undefined ? -0.16 : spec.shelf,
      /* WHICH WAY THE MATERIAL SETTLES. +1 outward from the rock, which is
       * every deposit in the generator until the ice moon; -1 mirrors it, so
       * the material builds from a surface DOWNWARD into whatever is below —
       * accreted ice hanging off the underside of a shell.
       *
       * Defaulted rather than required, so every existing table keeps the only
       * behaviour it has ever had. */
      direction: spec.direction === -1 ? -1 : 1
    };
  }

  function resolve(spec, out, layers, params, seed, heat, primary,
                   satScale, valScale, helpers, thermal, streamKey) {
    wrapHue = helpers.wrapHue;
    makeLighter = helpers.makeLighter;
    makeDarker = helpers.makeDarker;
    makeRgba = helpers.makeRgba;

    /* EACH FROSTING GETS ITS OWN STREAM.
     *
     * A body may now declare more than one — an ice moon's brine floor and the
     * accreted ice hanging off its shell are two materials resolved in the
     * same build. Sharing one stream would hand both the identical aridity
     * roll, hue spread and per-zone jitter, so the two surfaces facing each
     * other across the ocean would come out as one material drawn twice. That
     * would read as a colour-rule bug rather than as the missing seed it is.
     *
     * The default key is the one every existing archetype used, so a body with
     * a single frosting rolls exactly what it always rolled. */
    var frng = CC.RNG.stream(seed, streamKey || "colour/film");
    var wet = params.oceanDepth === undefined ? 0.4 : params.oceanDepth;

    /* Climate still exists — it just no longer dictates the hue.
     *
     * 0 = cold and wet, 1 = hot and dry. Built from the two sliders PLUS a
     * per-body roll, because the sliders are global: without the roll this was
     * identical on every seed and the whole mechanism collapsed into a fixed
     * offset (D19). It now drives saturation and how much snow a world gets,
     * which is what climate should actually control. */
    var aridRoll = (frng() - 0.5) * 0.7;

    /* ARIDITY IS DRIVEN BY THE CLIMATE BASELINE, NOT BY INTERIOR HEAT ALONE.
     *
     * `heat` is what the body's own core is doing, which is only half of how
     * hot its surface is — a world close to a fierce star is arid whatever its
     * core is like, and a rogue world in the dark is not arid however molten
     * it is. Reading the baseline instead means Starlight reaches this figure,
     * which is what makes snow genuinely conditional on being COLD.
     *
     * Falls back to `heat` when there is no field, so a caller without one
     * gets exactly the old behaviour rather than a surprise. */
    var surfaceHeat = (thermal && thermal.base !== undefined) ? thermal.base : heat;

    /* THE WEIGHTS HAD TO BE REBALANCED WHEN THE SOURCE CHANGED, and that is
     * worth recording because the first attempt at this reintroduced D19's
     * exact failure.
     *
     * The old formula was `heat * 0.6 + (1 - wet) * 0.55`, calibrated against
     * Interior heat — a control that sits near 0.5 on a typical world and is
     * rolled around it. The climate baseline is a different animal: it reaches
     * a genuine 1.0 on a seared world and its whole point is to span the
     * range. Feeding it into the old weights pinned `arid` at 0.56..1.00 across
     * every body, which is the SAME collapse D19 found (a constant aridity
     * degenerating the mechanism into one fixed offset) arriving by a new
     * route — and because `snowiness` is `1 - arid * 1.25`, it meant no world
     * was ever snowy: a temperate planet's polar cap was placed correctly by
     * the snowline and then painted in the family hue, which is precisely the
     * failure D35 exists to prevent.
     *
     * So the surface term is CENTRED rather than scaled: it says how far this
     * world is from temperate, in both directions, which is what the figure
     * has always meant. A cold world now comes out genuinely wet and snowy
     * instead of merely less arid than a hot one. */
    var arid = clamp(0.42 + (surfaceHeat - 0.45) * 0.85
                     + (1 - wet) * 0.30 - 0.15 + aridRoll, 0, 1);

    /* The family's base hue: anywhere on the wheel.
     *
     * FREE IS RIGHT FOR A PLANET AND WRONG FOR REGOLITH, and the difference is
     * what the material IS. A planet's cover is vegetation, reefs and silt —
     * things with chemistry of their own — so "orange grass or pink forests
     * are a feature" (D19), and constraining the hue was the failure that made
     * every world the same ochre.
     *
     * Regolith is not that. It is the rock itself, ground to dust by four
     * billion years of impacts, so its hue is the rock's hue by definition —
     * and a green moon reads as an error rather than as variety. Measured on a
     * bare moon before this existed: zones at hue 138 and 97 over rock at 169,
     * which is moss on stone.
     *
     * `hueFrom: "host"` says so. It takes the rock's hue and lets the authored
     * per-zone offsets work from there, so the mineral tints — faint ochre,
     * rust, blue-grey — are a small departure from the ground rather than an
     * unrelated colour. DECLARED, so nothing else changes: every existing
     * frosting omits it and keeps the free roll it has always had. */
    var base = frng() * 360;
    if (spec.hueFrom === "host") {
      /* Resolved below once the host is found; the roll above is still spent
       * so a body's other frosting rolls do not shift. */
      base = null;
    }

    /* How far this world's zones spread apart in hue. A low roll gives a world
     * whose cover is all one colour at different depths; a high one gives a
     * planet where the reefs and the hilltops are frankly different colours.
     * Rolling the spread — rather than fixing it — is what stops every world
     * having the same relationship between its zones. */
    var spread = lerp(0.35, 1.65, frng());

    var zones = spec.zones || {};
    /* THE ZONE NAMES ARE THE ARCHETYPE'S, NOT A FIXED FOUR (D22).
     *
     * This was a hardcoded ["frostPeak", "frostLand", "frostShallow",
     * "frostDeep"], which is a planet's list. Taking the declaration order
     * instead is what lets a giant's floor declare two zones and a later
     * family declare three, without a line of this file knowing how many
     * there are. */
    var table = zoneTable(spec);
    var keys = table ? table.keys : [];
    if (!keys.length) return null;

    /* The host: the outermost layer that CARRIES TERRAIN — the rock the
     * frosting actually lies on. Not "the outermost solid layer", which on an
     * ocean world is the sea the frosting is drawn under. Getting this wrong
     * was the single biggest cause of the first version reading as invisible;
     * see D19. */
    var host = null;
    for (var fi = 0; fi < layers.length; fi++) {
      var lr = layers[fi];
      if (!lr.outward && CC.Elements.reliefFor(lr.role) && out[lr.role]) {
        host = out[lr.role];
        break;
      }
    }

    /* The rock's own hue, for a frosting that declares it is made of the rock.
     * Falls back to the free roll if there is no host to read, so this can
     * never leave a body with no frosting hue at all. */
    if (base === null) {
      base = host ? host.h : frng() * 360;
    }

    /* ROLL ALL FOUR ZONES FIRST, then place the family as a unit.
     *
     * The zones are rolled here and written at the end, because the contrast
     * rule has to see the whole set before it can move any of it. Lifting each
     * zone independently to clear the rock was the first attempt and it
     * destroyed the spacing the four are authored with: every zone under the
     * threshold got pushed to the same floor, so a body's four colours came
     * out within 0.10 of each other in value and the ceiling flattened what
     * was left. Over 60 seeds, 28% of all zone colours sat exactly on the
     * ceiling and 25 bodies had effectively one lightness for all four. */
    var rolled = [];
    var kk;
    for (kk = 0; kk < keys.length; kk++) {
      var rz = zones[keys[kk]] || {};

      var roff = (rz.hueOffset === undefined ? 0 : rz.hueOffset) * spread;
      var rh = wrapHue(base + roff + (frng() - 0.5) * 26);

      var rsat = rz.sat || [0.45, 0.85];
      var rval = rz.val || [0.45, 0.80];
      var rs = lerp(rsat[0], rsat[1], frng());
      var rv = lerp(rval[0], rval[1], frng());

      /* Climate touches saturation only. An arid world's cover is drier and
       * duller; a wet one's is vivid. Underwater zones are exempt — the sea
       * floor does not care how dry the air is. */
      if (!rz.aquatic) rs = rs * (1 - arid * 0.28);

      /* SNOW IS ACHROMATIC AND BRIGHT, and is the one zone that is not simply
       * a hue from the family. A cold world's peaks go white; a hot world's
       * "peaks" are just more bare high ground, so the zone keeps its colour
       * and stays part of the family. One number, and it is the same aridity
       * figure already in hand. */
      if (rz.snow) {
        var snowiness = clamp(1 - arid * 1.25, 0, 1);
        rs = rs * (1 - snowiness * 0.88);
        rv = rv + (1 - rv) * snowiness * 0.75;
      }

      rolled.push({
        key: keys[kk], spec: rz,
        h: rh,
        s: clamp(rs * satScale, 0, 1),
        v: clamp(rv * valScale, 0.03, 1)
      });
    }

    /* Shift the family so its darkest DRY zone clears the rock, which
     * preserves peak-brighter-than-land instead of collapsing it. The lift is
     * larger over dark rock, because down there the eye judges a ratio rather
     * than a difference — a cover 0.19 above a v=0.26 crust still reads as
     * dark-on-dark (D19).
     *
     * THE UNDERWATER ZONES ARE EXCLUDED FROM SETTING THE FLOOR. They are seen
     * through the sea, which darkens and tints whatever is beneath it, so they
     * have no need to out-value bare rock — and being the darkest members of
     * the family, letting them set the floor dragged the entire set upward:
     * with `frostDeep` authored at 0.26-0.38 and a floor of 0.54-0.82, half of
     * every body's zone colours ended up pinned against the ceiling. They
     * still ride the same shift, so the family stays a family. */
    if (host) {
      var need = 0.20 + (1 - clamp(host.v / 0.5, 0, 1)) * 0.14;
      var lowestDry = 1;
      for (kk = 0; kk < rolled.length; kk++) {
        if (rolled[kk].spec.aquatic) continue;
        if (rolled[kk].v < lowestDry) lowestDry = rolled[kk].v;
      }
      var shift = (host.v + need) - lowestDry;
      if (shift > 0) {
        for (kk = 0; kk < rolled.length; kk++) rolled[kk].v += shift;
      }
    }

    /* If the shift pushed the top of the family past the ceiling, SLIDE THE
     * WHOLE SET BACK DOWN rather than clamping or squeezing it.
     *
     * Clamping was the first attempt and it flattened the family: several
     * zones landed on the ceiling together and their spacing was gone.
     * Squeezing toward the mean was the second, and it still pinned 40% of all
     * zone colours, because the mean itself had been carried up there.
     *
     * Sliding preserves every gap exactly — the family keeps its full internal
     * spread and simply sits lower. The dry zones may end up slightly closer
     * to the rock than `need` asked for, which is the right trade: a visible
     * difference between the four zones matters more than the last few
     * hundredths of contrast against the crust, and the saturation rule below
     * still guarantees they separate. */
    /* Snow is exempt from setting the ceiling. It is SUPPOSED to be near-white
     * on a cold world, and letting it lead the slide dragged the other three
     * zones down under their own rock — 22 dry zones lost their contrast, one
     * landing 0.23 BELOW the crust. It is clamped on its own afterwards. */
    var ceilingTop = 0.86;
    var highest = 0;
    for (kk = 0; kk < rolled.length; kk++) {
      if (rolled[kk].spec.snow) continue;
      if (rolled[kk].v > highest) highest = rolled[kk].v;
    }
    if (highest > ceilingTop) {
      var drop = highest - ceilingTop;
      for (kk = 0; kk < rolled.length; kk++) rolled[kk].v -= drop;
    }

    /* Whatever the slide left, no zone may fall back under the rock. Applied
     * per zone and only upward, so it repairs the few that the slide pushed
     * too far without re-flattening the set. Aquatic zones are held to a
     * gentler floor: they are seen through water, which separates them from
     * the rock on its own. */
    if (host) {
      for (kk = 0; kk < rolled.length; kk++) {
        var floor = host.v + (rolled[kk].spec.aquatic ? 0.04 : 0.12);
        if (rolled[kk].v < floor) rolled[kk].v = floor;
      }
    }

    /* Snow's own ceiling — high, because white peaks are the point. */
    for (kk = 0; kk < rolled.length; kk++) {
      if (rolled[kk].spec.snow && rolled[kk].v > 0.97) rolled[kk].v = 0.97;
    }

    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      var z = rolled[k].spec;
      var h = rolled[k].h;
      var s = rolled[k].s;
      var v = clamp(rolled[k].v, 0.03, 1);

      /* Saturation still separates PER ZONE, unlike value. Value had to move
       * as a family to keep the zones apart from each other; saturation has no
       * such ordering to protect, and a zone that merely fails to be more
       * saturated than its rock reads as differently-lit stone. */
      if (host && s < host.s + 0.14) s = clamp(host.s + 0.14, 0, 1);

      /* Keep off the fluorescent corner: bright AND fully saturated is a
       * colour no material has. Snow is exempt because its saturation has
       * already been driven toward zero. */
      if (!z.snow) s = Math.min(s, 1 - 0.5 * Math.max(0, v - 0.6) / 0.4);

      out[key] = {
        h: h, s: s, v: v,
        hex: CC.Color.hsvToHex(h, s, v),
        depth: 0,
        arid: arid,
        emissive: false,
        lighter: makeLighter(h, s, v),
        darker: makeDarker(h, s, v),
        rgba: makeRgba(h, s, v)
      };
    }

    /* --- THE THERMAL VARIANTS ------------------------------------------- */
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
    if (thermal && thermal.tempAt) {
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

    /* `film` stays as an alias for the ORDINARY GROUND zone. Anything that
     * asks for the old single colour — stats, future overlays — still gets a
     * sensible answer rather than the neutral fallback.
     *
     * The planet's is `frostLand`, which is its second; an archetype with a
     * different set gets the first non-aquatic zone that is not the snowline,
     * which is the same thing said generically. */
    out.film = out[ordinaryKey(keys, zones)];
    return out.film;
  }

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
   * the long way round the wheel — the same reasoning as gen/palette.js's
   * mixHue and draw/film.js's hueBlend. */
  function shortestTo(from, to) {
    var d = (to - from) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }

  return {
    resolve: resolve,
    zoneTable: zoneTable,
    specFor: specFor,
    specsByRole: specsByRole
  };
})();
