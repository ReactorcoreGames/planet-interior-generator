/* Machine worlds — the stat template.
 *
 * THE MINDSET: every other card asks what a body is like to reach, land on
 * or survive near. A machine world was BUILT, so its card asks what you ask
 * of a building you have found: who made it, is anyone home, is the power
 * on, how badly is it broken, how do you get in, and what will stop you
 * (MACHINE-WORLDS.md § "Stats template").
 *
 * EVERY FIGURE MEASURES THE RENDER (D5, and the memory "stats measure the
 * render"). Nothing here reads a dial where the picture has an answer:
 *
 *   power        the reactor's drawn radius, times the share of it running —
 *                its layer's `live` and `busy` (gen/activity.js), the same
 *                figures that light its windows
 *   population   habitation's drawn band, if one was built, times the share
 *                of its lights that are on
 *   status       the layers' own `live` / `emergency`, the bands the render
 *                lights by
 *   hull         `details.rupture`: its amount, the wounds cut, the deepest
 *                layer each reached
 *   docking      the shafts, the doors and covers on them and whether each
 *                is open, the docking ports and the craft drawn in them, the
 *                platforms and whether their lights are on
 *   weapon/drive `details.bore` / `details.engines`: charged or cold, the
 *                coil stages and the bells that burn
 *
 * Size is rolled per seed — the picture has no scale — and every figure
 * derived from it is computed here, not asserted. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;
  var TAU = CC.Math.TAU;

  /* Calibration, not physics: a reactor 300 km across runs at a few times
   * all the sunlight that falls on Earth, and a habitation band lit end to
   * end holds tens of billions. */
  var WORDS = ["no", "one", "two", "three", "four", "five", "six"];
  var W_PER_KM3 = 3e8;
  var PEOPLE_PER_KM3 = 30;
  var HUMANITY_W = 2e13;          /* everything humanity uses, ~20 TW */
  var SUNLIGHT_ON_EARTH_W = 1.7e17;
  var EARTH_PEOPLE = 8e9;

  var NAMES = {
    "outer-hull": "the outer hull", "surface-systems": "the systems deck",
    habitation: "the habitation levels", machinery: "the machinery",
    computation: "the computer core", "power-core": "the reactor"
  };

  function sig(v) { return CC.Stats.compact.sig(v); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : (many || one + "s")); }
  function ball(r0, r1, R) { return 4 / 3 * Math.PI * (Math.pow(r1 * R, 3) - Math.pow(r0 * R, 3)); }
  function layerOf(body, role) {
    for (var i = 0; i < body.layers.length; i++) if (body.layers[i].role === role) return body.layers[i];
    return null;
  }
  /* The share of a layer's capacity running: its lit share, and the hive's
   * extra at the top of the dial (busy runs 1..1.7). */
  function running(L) {
    if (!L || L.live === undefined) return 1;
    return clamp(L.live * (0.55 + 0.45 * (CC.Activity.busy(L) - 1) / 0.7), 0, 1);
  }

  function sizeLine(km, shells) {
    var cmp = km < 1100 ? "about the size of Ceres, the largest asteroid"
      : km < 2000 ? "a little smaller than Pluto"
      : km < 2900 ? "about the size of Pluto"
      : km < 4200 ? "about the size of our Moon"
      : "between the Moon and Mercury in size";
    return km.toLocaleString("en-US") + " km across - " + cmp + ". Hollow: " +
           (WORDS[shells] || shells) + " nested shells round a solid heart";
  }

  /* Three significant figures at most: "264,860" is false precision. */
  function nice(v) {
    if (v >= 1e6) return sig(v);
    var k = v >= 100 ? Math.pow(10, Math.floor(Math.log(v) / Math.LN10) - 1) : 1;
    return (Math.round(v / k) * k).toLocaleString("en-US");
  }

  /* The comparison first, the figure after: "terawatts" alone tells a
   * layperson nothing. */
  function wattsLine(w, lower) {
    var cmp = w >= SUNLIGHT_ON_EARTH_W * 1.5 ? nice(w / SUNLIGHT_ON_EARTH_W) + " times all the sunlight that falls on Earth"
      : w >= SUNLIGHT_ON_EARTH_W * 0.7 ? "about all the sunlight that falls on Earth"
      : w >= HUMANITY_W * 1.5 ? nice(w / HUMANITY_W) + " times everything humanity uses"
      : w >= HUMANITY_W * 0.5 ? "about everything humanity uses"
      : "as much as " + nice(Math.max(1, w / 1e9)) + " big power stations";
    return (lower ? cmp : cap(cmp)) + " (" + nice(w / 1e12) + " terawatts)";
  }

  function litWord(share) {
    return share > 0.9 ? "nearly all" : share > 0.6 ? "most" : share > 0.4 ? "about half"
      : share > 0.25 ? "about a third" : share > 0.12 ? "about one in five" : "about one in ten";
  }

  function popLine(n, share, busy) {
    var e = n / EARTH_PEOPLE;
    var cmp = e >= 1.5 ? Math.round(e) + " times Earth's population"
      : e >= 0.7 ? "about as many people as live on Earth"
      : e >= 0.08 ? "about a " + (e >= 0.4 ? "half" : e >= 0.2 ? "quarter" : "tenth") + " of Earth's population"
      : "fewer than live in one big country";
    return "About " + nice(n) + " - " + cmp + ". Going by the lights: " + litWord(share) +
           " of the windows in the habitation levels are lit" + (busy > 1.35 ? ", and every lit deck is crowded" : "");
  }

  function statusOf(body) {
    var live = 0, em = 0;
    for (var i = 0; i < body.layers.length; i++) {
      var L = body.layers[i];
      if (L.outward || L.live === undefined) continue;
      live = Math.max(live, L.live); em = Math.max(em, L.emergency);
    }
    var hab = layerOf(body, "habitation"), heart = layerOf(body, "power-core");
    if (live < 0.02) return em > 0 ? "emergency" : "offline";
    if (!hab) return "unmanned";
    if (hab.live < 0.03) return "automated";
    return CC.Activity.busy(heart) > 1.35 ? "hive" : "crewed";
  }

  var STATUS = {
    offline: "Offline. Not a light anywhere, not even emergency power - dead, or playing dead",
    emergency: "Derelict. A few red emergency lights; the reactor is barely ticking over",
    automated: "Automated. The machines run and the reactor burns, but the habitation levels are dark: nobody is home",
    unmanned: "Automated. The machines run and the reactor burns, with nobody aboard and nowhere for anyone to be",
    crewed: "Crewed. The plant runs and there are lights on where people live",
    hive: "Swarming. Every level is lit and busy, and the ports never close"
  };
  var BUILDING = {
    offline: "Abandoned half-built. The cranes stand dark over the open sites",
    emergency: "Work stopped. A few red lights on the cranes; nobody is building",
    automated: "Under construction, by machines. Welding lights on the sites; nobody lives here yet",
    unmanned: "Under construction, by machines. Welding lights on the sites, and nowhere planned for anyone to live",
    crewed: "Under construction. Crews at work in the open sites, and people already living below",
    hive: "Under construction at a frantic pace, with every finished level already full"
  };

  function sameBearing(a, b) { var d = Math.abs(a - b) % TAU; return Math.min(d, TAU - d) < 1e-6; }

  function lengthCmp(km) {
    return km < 450 ? "about London to Paris" : km < 1100 ? "the length of Great Britain"
      : km < 2600 ? "about Paris to Moscow" : "the width of the United States";
  }

  CC.Stats.registerTemplate("machine", {
    build: function (body, details, settings, archetype, rng, shared) {
      var R = shared.radius, km = Math.round(R * 2 / 10) * 10;
      var traits = (details.traits || []).map(function (t) { return t.id; });
      var has = function (id) { return traits.indexOf(id) >= 0; };
      var building = has("under-construction");
      var status = statusOf(body);
      var dark = status === "offline" || status === "emergency";

      var shells = 0;
      for (var i = 0; i < body.layers.length; i++) if (body.layers[i].gap) shells++;

      /* POWER: the drawn reactor, times what of it runs. */
      var heart = layerOf(body, "power-core");
      var capW = heart ? W_PER_KM3 * ball(0, heart.outer, R) : 0;
      var share = running(heart);
      var power;
      if (!heart) power = "None. There is no reactor";
      else if (status === "offline") power = "None. The reactor is cold. Built to make " + wattsLine(capW, true);
      else if (heart.live < 0.02) power = "A trickle, on emergency power. Built to make " + wattsLine(capW, true);
      else power = wattsLine(capW * share) + ". Running at " + Math.round(share * 100) + "% of what it was built for";

      /* POPULATION: habitation's drawn band, times its lit share. */
      var hab = layerOf(body, "habitation");
      var people = 0, population;
      if (!hab) population = "None. There is nowhere to live - it is machine all the way down";
      else if (hab.live < 0.03) population = "Nobody, by the lights. The habitation levels are dark";
      else {
        people = ball(hab.inner, hab.outer, R) * PEOPLE_PER_KM3 * hab.live * CC.Activity.busy(hab);
        population = popLine(people, hab.live, CC.Activity.busy(hab));
      }

      /* HULL: the wounds actually cut. */
      var rup = details.rupture, wounds = (rup && rup.wounds) || [];
      var integrity = rup ? Math.round(100 * (1 - rup.amount)) : 100;
      var deepest = null, floor = 1;
      for (i = 0; i < wounds.length; i++) {
        if (wounds[i].floor < floor) { floor = wounds[i].floor; deepest = wounds[i].cuts[wounds[i].cuts.length - 1].role; }
      }
      var reach = deepest === "power-core" ? "down to the reactor's rim" : "into " + (NAMES[deepest] || "the shells");
      var hull;
      if (!wounds.length) hull = building ? "Finished - not a gap in the hull" : "100% - not a breach anywhere";
      else if (building) {
        hull = integrity + "% built. " + (wounds.length === 1 ? "One section still open to space, " + reach
               : cap(WORDS[wounds.length]) + " sections still open to space, the deepest " + reach);
      } else {
        hull = integrity + "% - " + (wounds.length === 1 ? "one breach, torn " + reach
               : WORDS[wounds.length] + " breaches, the deepest torn " + reach);
      }

      /* DOCKING: the routes in and what guards them. */
      var shafts = body.shafts || [], doors = details.doors || { doors: [], covers: [] };
      var openShafts = 0;
      for (i = 0; i < shafts.length; i++) {
        var open = true;
        for (var d = 0; d < doors.doors.length; d++) if (sameBearing(doors.doors[d].angle, shafts[i].angle) && !doors.doors[d].open) open = false;
        for (d = 0; d < doors.covers.length; d++) if (sameBearing(doors.covers[d].angle, shafts[i].angle) && !doors.covers[d].open) open = false;
        if (open) openShafts++;
      }
      var hull0 = body.layers.filter(function (l) { return !l.outward; })[0];
      var ports = 0, craft = 0, platforms = 0, armed = 0;
      (details.byRole[hull0.role] || []).forEach(function (e) {
        if (e.kind === "fixture" && e.fixture === "dock") { ports++; if (e.craft) craft++; }
      });
      (details.byRole["defense-grid"] || []).forEach(function (e) {
        if (e.kind === "glyph") { platforms++; if (e.power === 1) armed++; }
      });
      var gated = doors.doors.length || doors.covers.length;
      var routes = cap(plural(shafts.length, "shaft")) + " down to the heart" +
        (gated ? (openShafts === shafts.length ? ", all open" : openShafts ? ", " + openShafts + " open" : ", all sealed") : "");
      var dockBits = [routes];
      if (ports) dockBits.push(plural(ports, "docking port") + " on the hull" + (craft ? ", " + craft + " with ships in" : ", all empty"));
      if (wounds.length) dockBits.push(building ? "or in through the open building sites" : "or straight in through the breach");
      var docking = dockBits.join("; ");
      if (platforms) docking += ". " + (armed ? "Watched by " + armed + " armed platform" + (armed > 1 ? "s" : "")
                                              : plural(platforms, "weapon platform") + " in orbit, all dark");

      /* WEAPON and DRIVE, from what drew. */
      var bore = details.bore, eng = details.engines, weapon = null, drive = null;
      if (bore) {
        var len = Math.round((bore.r1 - bore.r0) * R / 10) * 10;
        var stages = {}, warm = {};
        bore.coils.forEach(function (c) { stages[c.stage] = 1; if (c.power) warm[c.stage] = 1; });
        var nS = Object.keys(stages).length, nW = Object.keys(warm).length;
        weapon = "A bore cannon " + len.toLocaleString("en-US") + " km long - " + lengthCmp(len) +
          " - from the reactor out through every shell" + (bore.crown ? "" : ", its muzzle shot away") + ". " +
          (bore.power === 1 ? "Charged and live" + (nW === nS ? ", every coil stage burning" : ", " + nW + " of " + nS + " coil stages burning")
            : bore.power === 2 ? "A dim red glow down the bore on emergency power" + (nW ? ", " + nW + " of " + nS + " coil stages warm" : "") +
                                 " - nowhere near enough to fire"
            : "Cold. Nothing is feeding it");
      }
      if (eng) {
        var mains = eng.bells.filter(function (b) { return b.big; });
        var firing = mains.filter(function (b) { return b.power === 1; });
        var plume = 0;
        firing.forEach(function (b) { plume = Math.max(plume, b.len); });
        plume = Math.max(plume, eng.power === 1 ? eng.wakeLen : 0);
        drive = eng.power === 1
          ? (firing.length === mains.length ? "All " + WORDS[mains.length] : firing.length + " of " + mains.length) + " drive bells firing, the plume trailing " +
            sig(Math.round(plume * R / 10) * 10) + " km behind it. It is going somewhere"
          : eng.power === 2
          ? plural(mains.length, "drive bell") + ", cold but for a dull red glow in the throats - warming up, or the last of something"
          : plural(mains.length, "drive bell") + ", all cold. Wherever it was going, it has stopped";
      }

      /* CONSTRUCTION: who built it, read from what is drawn. The cut
       * ancient-precursor trait lives here: an overgrown hull is old. */
      var growth = details.growth, construction, age;
      var skin = growth ? (growth.moss ? "moss" : "rust bloom") : "";
      if (building) {
        age = dark ? "unfinished" : "building";
        construction = dark ? "Never finished. Whoever was building it stopped, and the sites are still open"
                            : "Still being built - scaffolding and cranes stand in the open sites";
      } else if (growth && (dark || growth.wither > 0.5)) {
        age = "ancient";
        construction = "Ancient. The builders are long gone, and the " + skin + " on the hull has had ages to spread";
      } else if (growth) {
        age = "ageless";
        construction = "Older than anyone can say, and still running under a skin of " + skin + " that nobody clears away";
      } else if (dark) {
        age = wounds.length ? "old" : "unknown";
        construction = wounds.length ? "Old, by the scars. Nobody alive claims to have built it"
                                     : "Unknown. Nothing aboard is answering to say";
      } else {
        age = "kept";
        construction = (status === "automated" || status === "unmanned"
          ? "Built by someone, and kept by machines" : "Built, and kept by whoever lives aboard") +
          (wounds.length ? ". Every seam was true until something tore it open" : ". Not one seam is out of true");
      }

      var facts = {
        family: "machine", status: status, building: building, dark: dark,
        shells: shells, habitation: !!hab, people: people, power: capW * share,
        integrity: integrity, wounds: wounds.length, torn: !!rup && rup.edge === "torn",
        deepest: deepest, deep: !!rup && rup.amount > 0.6,
        shafts: shafts.length, openShafts: openShafts, ports: ports, craft: craft,
        platforms: platforms, armed: armed,
        bore: bore ? bore.power : -1, engines: eng ? eng.power : -1,
        overgrown: !!growth, withered: !!growth && growth.wither > 0.5, moss: !!growth && !!growth.moss,
        age: age, reactor: !!heart, core: !!layerOf(body, "computation"),
        lit: hab ? hab.live : 0, litWord: hab ? litWord(hab.live) : "",
        radius: R, radiation: 0, sunless: false, locked: false, gravity: 0,
        atmosphere: { present: false, pressure: 0, text: "" }, breathable: false,
        tempMin: 0, tempMax: 0, traits: traits
      };
      var hazard = CC.Hazard.of(facts);
      facts.hazardScore = hazard.score;

      var lines = [
        { key: "size", label: "Size", value: sizeLine(km, shells) },
        { key: "construction", label: "Construction", value: construction },
        { key: "power", label: "Power output", value: power },
        { key: "population", label: "Population", value: population },
        { key: "status", label: "Status", value: (building ? BUILDING : STATUS)[status] },
        { key: "hull", label: building ? "Completion" : "Hull integrity", value: hull },
        { key: "docking", label: "Docking", value: docking }
      ];
      if (weapon) lines.push({ key: "weapon", label: "Weapon", value: weapon });
      if (drive) lines.push({ key: "drive", label: "Drive", value: drive });
      lines.push(
        { key: "notable", label: "Notable", value: CC.Flavour.notableOf(facts, rng) },
        { key: "resources", label: "Resources", value: CC.Flavour.resourceOf(facts, rng) },
        { key: "approach", label: "Approach", value: CC.Flavour.approachOf(facts, rng) });
      lines.push({ key: "danger", label: "Biggest danger", value: CC.Flavour.dangerOf(facts, rng) });

      return { lines: lines, facts: facts, hazard: hazard, levels: LEVELS };
    }
  });

  var LEVELS = {
    compact: ["size", "status", "power", "population", "hull", "danger"],
    standard: ["size", "construction", "status", "power", "population", "hull",
               "docking", "weapon", "drive", "danger"],
    full: null
  };
})();
