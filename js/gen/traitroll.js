/* The trait stage: pick a compatible set, then place their instances.
 *
 * TWO JOBS, two halves of one idea — "which traits does this body have" and
 * "where do their instances go":
 *
 *   select()  compatibility filtering and the count budget (gen/traitselect.js)
 *   place()   the placement grammar -> concrete elements, here, through
 *             gen/traitanchor.js, gen/traitplace.js and gen/traitfinish.js; all
 *             three attach to this namespace and load straight after it
 *
 *
 * THE GRAMMAR IS THE WHOLE SYSTEM. anchor / reach / depth / arc / repeat /
 * spacing / jitter / mirror / offset describe every trait, and a trait that
 * cannot be expressed in them means the grammar needs extending — a deliberate
 * decision rather than a special case. See docs/TRAIT-SYSTEM.md.
 *
 * Instances are built through gen/elemgen.js, the SAME builders the layer
 * details use, so a trait's `element` selects from one shared primitive list.
 * That is what stops each trait needing its own renderer.
 *
 * Output is normalized body space, like every other generation stage. */

var CC = CC || {};

CC.TraitRoll = (function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp, lerp = M.lerp;
  var TAU = M.TAU;

  /* ---- nesting ---------------------------------------------------------- */

  /* ONE TRAIT INSIDE ANOTHER — `nest: [traitIds]`, with `nestAt` the share of
   * the host's radius to sit out from its centre (default 0.45).
   *
   * A station hidden IN a wind-blown cavity, a mining flotilla working BESIDE
   * a belt of ore: the picture's claim is the relationship, and two traits
   * placed independently land wherever their own rolls put them. So after
   * every trait is placed, each of a nesting trait's clusters (`pocketId`,
   * stamped by the pocket placer; without one the whole group is a single
   * cluster) is moved, rigidly, to a host cluster of its own — hosts taken in
   * the order `nest` lists them, one cluster per host — keeping its internal
   * layout. A host element may carry `pocket: {x, y, r}` (the centre and
   * radius of the cluster it belongs to, body space); otherwise its own
   * position and size stand in. A cluster left without a host stays where
   * its own placement put it, which is an honest answer: a station with no
   * cavity to hide in hides in the thick gas instead.
   *
   * Runs after placement, so it is independent of the order the traits were
   * rolled in. Moves positions only; every trait it touches declares `rot`
   * on its marks or has none, so a move does not turn anything. */
  function nestAll(traits, lists, seed) {
    if (!traits.some(function (t) { return t.nest; })) return;
    var all = [];
    for (var l = 0; l < lists.length; l++) all = all.concat(lists[l] || []);
    function xy(e) {
      return [Math.sin(e.angle) * e.radius, -Math.cos(e.angle) * e.radius];
    }
    function shift(e, dx, dy) {
      var p = xy(e), x = p[0] + dx, y = p[1] + dy;
      e.radius = Math.sqrt(x * x + y * y);
      e.angle = Math.atan2(x, -y);
      if (e.pocket) e.pocket = { x: e.pocket.x + dx, y: e.pocket.y + dy, r: e.pocket.r };
    }
    for (var i = 0; i < traits.length; i++) {
      var t = traits[i];
      if (!t.nest) continue;
      var group = all.filter(function (e) { return e.trait === t.id; });
      if (!group.length) continue;
      /* The host clusters, one entry per distinct pocket. */
      var hosts = [], seen = {};
      for (var n = 0; n < t.nest.length; n++) {
        for (var k = 0; k < all.length; k++) {
          var h = all[k];
          if (h.trait !== t.nest[n]) continue;
          var hk = h.trait + "/" + (h.pocketId === undefined ? k : h.pocketId);
          if (seen[hk]) continue;
          seen[hk] = true;
          hosts.push(h.pocket || { x: xy(h)[0], y: xy(h)[1], r: h.size || 0 });
        }
      }
      if (!hosts.length) continue;
      var clusters = {}, order = [];
      for (k = 0; k < group.length; k++) {
        var ck = group[k].pocketId === undefined ? 0 : group[k].pocketId;
        if (!clusters[ck]) { clusters[ck] = []; order.push(ck); }
        clusters[ck].push(group[k]);
      }
      var rr = CC.RNG.stream(seed, "trait/" + t.id + "/nest");
      for (var c = 0; c < order.length && c < hosts.length; c++) {
        var members = clusters[order[c]], hp = hosts[c];
        var gx = 0, gy = 0;
        for (k = 0; k < members.length; k++) {
          var q = xy(members[k]);
          gx += q[0]; gy += q[1];
        }
        gx /= members.length; gy /= members.length;
        var dir = rr() * TAU;
        var off = hp.r * (t.nestAt === undefined ? 0.45 : t.nestAt);
        var dx = hp.x + Math.sin(dir) * off - gx;
        var dy = hp.y - Math.cos(dir) * off - gy;
        for (k = 0; k < members.length; k++) shift(members[k], dx, dy);
      }
      /* And drawn after its host, so the thing nested is ON it: a flotilla
       * over its ore, not under it. In place, so the caller's lists see it. */
      for (l = 0; l < lists.length; l++) {
        var list = lists[l];
        if (!list || !list.some(function (e2) { return e2.trait === t.id; })) continue;
        var rest = list.filter(function (e2) { return e2.trait !== t.id; });
        var mine = list.filter(function (e2) { return e2.trait === t.id; });
        list.length = 0;
        Array.prototype.push.apply(list, rest.concat(mine));
      }
    }
  }

  /* ---- the stage -------------------------------------------------------- */

    /* A TRAIT THAT IS AN ABSENCE RATHER THAN A MARK.
     *
     * `thins` says: in these angular sectors, this many of the anchor
     * layer's own elements survive. The trait draws NOTHING — it returns
     * sectors, and gen/details-instances.js removes elements inside them.
     *
     * A CORONAL HOLE IS WHY THIS EXISTS, and it is a genuinely different
     * shape of trait rather than a special case. The first version was a
     * `wedge` with `tone: "darker"` laid over the corona, which the user
     * called out as "a big wedge with a flat color and no fade" — and it
     * HAD to be flat and hard-edged, because the corona is composited with
     * `screen` and dark paint under `screen` is nearly a no-op. A soft dark
     * region there is simply invisible (D121s `dust-formation`, maxdelta
     * 19).
     *
     * A coronal hole is not a dark patch on the corona. It is a place where
     * the field is open and the wind leaves freely, so there is LESS CORONA
     * THERE. Removing the layers own plumes says exactly that, needs no
     * paint at all, and works with the blend mode instead of against it.
     *
     * It reuses the ordinary placement grammar — `repeat`, `arc`, `spacing`,
     * `offset`, `driver` all mean what they always mean — so a hole is
     * placed the same way anything else is. Only the effect differs. */
  function thinSectors(st, trait) {
    var params = st.params, seed = st.seed, thinning = st.thinning;
    var trng = CC.RNG.stream(seed, "trait/" + trait.id);
    var hangles = CC.TraitRoll.anchorAngles(trait, trng, st.zones);
    var arcLo = (trait.arc ? trait.arc[0] : 30) * Math.PI / 180;
    var arcHi = (trait.arc ? trait.arc[1] : 60) * Math.PI / 180;
    /* THE DRIVER SCALES A THINNING TRAIT TOO, and leaving it out was a
     * real omission rather than a simplification: coronal holes are most
     * prominent at solar MINIMUM, so `driver` running downward is most of
     * what the trait says about the star. Measured without it, the hole
     * count was identical at activity 0.15 and 0.7 — the one axis the
     * family has, doing nothing.
     *
     * It scales the SECTOR COUNT, which is the same thing it scales for a
     * drawn trait (there, the instance count). A quiet star shows two
     * holes and a violent one may show none. */
    if (trait.driver) {
      var hdv = params[trait.driver.param];
      if (hdv !== undefined) {
        var h0 = trait.driver.at0 === undefined ? 0 : trait.driver.at0;
        var h1 = trait.driver.at1 === undefined ? 1 : trait.driver.at1;
        var hk = lerp(h0, h1, clamp(hdv, 0, 1));
        var hn = Math.round(hangles.length * hk);
        if (hn < 0) hn = 0;
        if (hn < hangles.length) hangles = hangles.slice(0, hn);
      }
    }
    for (var hi = 0; hi < hangles.length; hi++) {
      thinning.push({
        trait: trait.id,
        angle: hangles[hi],
        /* Half-width of the sector, so a consumer needs no arithmetic. */
        half: lerp(arcLo, arcHi, trng()) * 0.5,
        /* How many elements survive at the centre. */
        keep: trait.thins.keep === undefined ? 0.15 : trait.thins.keep,
        /* How far past the sector the effect feathers out, as a fraction
         * of the half-width. A hard edge is the thing this replaces. */
        feather: trait.thins.feather === undefined ? 0.55
                                                   : trait.thins.feather
      });
    }
    st.total++;
    return thinning.slice(thinning.length - hangles.length);
  }

  /* Which pass of the scene order a trait's instances draw in. */
  function fileInstances(st, trait, layer, made) {
    var byRole = st.byRole;
    if (layer.synthetic) {
      st.outward = st.outward.concat(made);
    } else if (trait.reach === "spanning") {
      /* A SPANNING TRAIT ESCAPES ITS ANCHOR'S CLIP.
       *
       * Every in-body element is drawn inside `clipToLayer`, which is what
       * stops a mantle's detail leaking into the crust. A trait whose whole
       * point is to CROSS layers cannot live there — it would be cut at both
       * boundaries, which is precisely the half-a-storm the great storm was
       * getting. So it draws in its own pass with a clip to the body as a
       * whole, exactly as surface damage already does for its own reason.
       *
       * `fadeEnds` then dissolves it at both extremes, so it ends by fading
       * rather than by being cut — the thing the layer clip used to do
       * accidentally and badly. */
      st.spanning = st.spanning.concat(made);
    } else if (trait.cutsFrosting) {
      /* SURFACE DAMAGE IS DRAWN AFTER THE DEPOSIT, BECAUSE IT CUTS IT.
       *
       * Impact scars are excavations: they punch through whatever snow, moss
       * or silt lies on the ground and expose the rock underneath. Drawn in
       * the crust's own pass they were painted first and then covered by
       * draw/film.js's frosting a moment later — a "Heavily Cratered" world
       * generated 64-90 scars and showed none of them, because the deposit
       * bites 69-90% down the crust and the scars sit at 81-100%.
       *
       * Pushing them deeper instead would have put them in the middle of the
       * crust, where they read as inclusions rather than as surface damage.
       * The order is what was wrong, so the order is what changed. */
      st.damage = st.damage.concat(made);
    } else {
      /* EVERY OTHER IN-BODY TRAIT DRAWS INSIDE ITS ANCHOR LAYER'S OWN PASS.
       *
       * There were two extra branches here that lifted any `wedge` trait out
       * of its layer and onto the true surface, drawn after the fluid pass.
       * Both were written for `ice-caps`, which D27 CUT — caps now emerge
       * from the frosting rather than being drawn as a polygon. That left
       * the branches with exactly one client they were never meant for, the
       * impact basin, which they lifted from the crust to the top of the
       * SEA: on an ocean world the basin was relocated from r=0.905 to
       * r=0.993 and read as a dark wedge hovering in the water.
       *
       * A basin is excavated INTO the crust, so it belongs to the crust and
       * the ocean is supposed to cover it. Anchoring is the grammar's job
       * and `anchor` already answers it — nothing here should second-guess
       * which layer a trait asked for. */
      byRole[layer.role] = (byRole[layer.role] || []).concat(made);
    }
    st.total += made.length;
  }


  /* Place every selected trait.
   *
   * Returns { byRole, outward, count }. `outward` holds instances that sit
   * beyond the body — rings and debris — because those draw in a different
   * step of the scene order (behind and in front of the body) rather than
   * inside a layer's clip. */
  function place(traits, body, params, seed, zones, ground) {
    var st = {
      body: body,
      params: params,
      seed: seed,
      zones: zones,
      byRole: {},
      outward: [],
      surface: [],
      damage: [],
      spanning: [],
      thinning: [],
      total: 0
    };

    for (var i = 0; i < traits.length; i++) {
      var trait = traits[i];
      /* The sectors a thinning trait just chose, for the branch below to hand
       * to `placeOne` so a hole's own mark lands in the hole. Null for every
       * ordinary trait, which is all of them but one. */
      var sectors = null;
      /* Modifiers draw nothing themselves — they perturb the layers. */
      if (CC.Traits.isModifier(trait)) continue;
      /* Nor do traits that only switch structure data (gen/traitsets.js). */
      if (trait.sets && !trait.element) continue;

      if (trait.thins) {
        sectors = thinSectors(st, trait);
        /* A THINNING TRAIT MAY ALSO DRAW, AND THE COMBINATION IS THE POINT.
         *
         * The branch used to `continue` unconditionally: a trait either
         * removed elements or placed them, never both. That was right for as
         * long as the only thinning trait was a pure absence, and it is what
         * made the coronal hole hard to SEE — the user's report was that it
         * "blends in", which is the honest outcome of a feature defined
         * entirely as less of something. An absence reads only against a
         * baseline the eye can still measure, and on a busy corona there is no
         * such baseline.
         *
         * The fix is not to make the absence deeper. It is to give the hole
         * something of its own: the sector keeps its thinned corona AND gets
         * the escaping wind drawn into it, which is the thing that is
         * physically there when the field opens. So a trait declaring both
         * `thins` and `element` falls through to ordinary placement, and the
         * drawn instances are steered onto the sectors that were just chosen
         * (see `sectors` in placeOne) rather than being placed independently —
         * a hole whose wind blew somewhere else would be two features. */
        if (!trait.element) continue;
      }

      var layer = CC.TraitRoll.anchorLayer(trait, body);
      if (!layer) continue;
      /* The layer answers this trait with its own marks — see
       * `absorbedScale` in gen/details-traits.js. Nothing of the trait's is drawn. */
      if (layer.absorbs && layer.absorbs[trait.id]) continue;

      var made = CC.TraitRoll.placeOne(trait, body, layer, params, seed, zones,
                                       ground, sectors);

      if (!made.length) continue;

      fileInstances(st, trait, layer, made);
    }

    var byRole = st.byRole, outward = st.outward, surface = st.surface;
    var damage = st.damage, spanning = st.spanning, thinning = st.thinning;
    var total = st.total;

    nestAll(traits, [spanning, outward, damage].concat(
      Object.keys(byRole).map(function (k) { return byRole[k]; })), seed);

    return {
      byRole: byRole,
      outward: outward,
      /* Step 4 of the scene order, "surface-attached": instances drawn after
       * the fluid layers instead of inside a layer's clip.
       *
       * EMPTY, AND CORRECTLY SO. Its only client was the cut `ice-caps` trait
       * (see the note in the loop above). The channel is kept because the draw
       * order it belongs to is real and a genuinely surface-attached trait —
       * something lying ON the sea rather than under it — would want it; it is
       * not kept so that wedges can bypass their anchor. */
      surface: surface,
      /* Traits that CROSS layer boundaries — drawn in their own pass, clipped
       * to the body rather than to a band. See the note in the loop above. */
      spanning: spanning,
      /* Surface damage — drawn after the frosting, which it cuts through.
       * Carries its host layer's role like any other element, so the renderer
       * still resolves colour through the ordinary palette path. */
      damage: damage,
      /* ANGULAR SECTORS WHERE A LAYER'S OWN ELEMENTS ARE REMOVED, rather than
       * anything drawn. See the `thins` branch in the loop above — this is how
       * a coronal hole is expressed, and it carries no paint at all. */
      thinning: thinning,
      count: total,
      get: function (role) { return byRole[role] || []; }
    };
  }

  return {
    place: place
  };
})();
