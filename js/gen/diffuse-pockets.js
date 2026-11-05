/* Where a gas body's traits go — the `pocket` placer, and the `web` builder.
 *
 * The trait grammar places instances ROUND a body: an anchor layer, a depth in
 * its band, a set of bearings. A nebula has no band to be in. Its traits
 * belong where its gas is — a belt of ice where the cloud is thick, a station
 * hidden in a void, pillars standing on a bank of dense gas with their heads
 * toward the light — so a nebula trait declares `place: "pocket"` and this
 * placer moves the elements the ordinary builder made (gen/traitroll.js
 * `placeOne`). Positions are in BODY SPACE, for a trait drawn in the spanning
 * pass, after all the gas and through the plain view.
 *
 * THE POCKET FIELDS, all optional:
 *
 *   pockets     [lo, hi] how many clusters
 *   perPocket   [lo, hi] marks in each cluster, rolled per cluster — the
 *               count is then theirs, not the slider's (`plan` below)
 *   pocketSize  [lo, hi] each cluster's radius, in body radii
 *   eachSize    true — roll pocketSize per cluster, not once for all: some
 *               fields tight, some loose
 *   huddle      chance the clusters gather near one another rather than
 *               spread through the cloud (a station complex, fleets together)
 *   apart       keep a scattered mark this many of its own sizes clear of the
 *               others in its cluster (ships that are not stacked)
 *   stretch     [lo, hi] how elongated a cluster is (1 = round) — a BELT
 *   seek        how strongly a cluster seeks the density field
 *               (CC.Diffuse.field): + thick gas, - voids, 0 uniform
 *   front       true — prefer thick gas with thinner gas toward the aim: an
 *               ionisation front, where pillars stand
 *   within      [lo, hi] the radial span searched, in body radii
 *   band        true — search the anchor layer's own annulus instead (a shell)
 *   formation   "scatter" (default) | "centre" (one element per pocket, at
 *               its centre) | "row" (side by side across the aim) | "line"
 *               (in file along a shared heading — a flotilla)
 *   aim         "light" | "centre" | "random" | "heading" — which way each
 *               mark points, stamped as `aim` (a body-space bearing) and as
 *               `rot` (the same bearing, for primitives that read `rot`)
 *   hueShift    [lo, hi] degrees, rolled once per pocket with a random sign,
 *               stamped as `hueShift` (an off-hue pocket of gas)
 *   paint       [[h, s, v], ...] liveries, one per pocket, no two pockets
 *               alike while the list lasts; stamped as `paint: {h, s, v}`
 *               (draw/details-gas.js hullFill)
 *   round       chance a pocket ignores `stretch` and is a rounder field
 *               (stretch 1 to 1.5) — a belt that is sometimes a patch
 *   oval        chance a pocket is a FIELD rather than a belt: round to oval
 *               (stretch 1 to 1.8), its radius grown so it covers the area
 *               the streak would have, and filled about evenly rather than
 *               thick in the middle (D303)
 *   loose       chance a pocket's radius is doubled or more: a field now and
 *               then spread thin rather than clustered
 *   elongate    stamped as is: how drawn-out a shard is (1 = the primitive's
 *               own, below 1 stubbier)
 *   extras      [{ kind, size, alpha, tone, blend, spikes, under }] — marks
 *               added at each pocket's centre, `size` in pocket radii (a
 *               cluster's shared glow, a cavity's star); each carries the
 *               pocket's `axis` and `stretch`, so a mark may lie along a belt
 *   tip         an aimed mark that runs this many sizes ALONG its aim from
 *               its position (a pillar from its foot), for `clearCore`
 *   clearCore   [aimed marks] body radii round the middle the mark may not
 *               cross — a pillar aimed inward stops short of the dead star
 *   byAnchor    { <role>: { ...any of the above } } — overrides for the layer
 *               the trait actually anchored to: on a shell, search the band
 *               and aim at the dead star
 *
 * Every element is stamped `pocket: {x, y, r}` and `pocketId`, so another
 * trait can nest in it, a cluster to a host (gen/traitroll.js `nestAll`).
 *
 * NOT CUT AT THE RIM. The spanning pass is clipped at the body's edge, and a
 * belt scattered from a pocket near the rim ran off it and was cut flat.
 * Pulling the marks in instead lined the strays up along the edge as an arc.
 * So a pocket trait declares `escapes` (js/data/traits/diffuse.js) and is
 * drawn outside the clip: a mark lands where its pocket scatters it, and one
 * past the cloud's soft edge is material drifting out of it. The only bound
 * is on where a belt is CENTRED — held in by most of its width (EDGE), so a
 * belt is in the gas with its fringe trailing out, not mostly in space.
 * Names no archetype.
 *
 * Load order: after gen/diffuse.js. */

var CC = CC || {};

(function () {
  "use strict";

  var M = CC.Math;
  var clamp = M.clamp, lerp = M.lerp;
  var TAU = Math.PI * 2;
  /* A belt's middle is held inside this share of the surface, less most of
   * its width: the halo past it is too faint for a field to sit in. */
  var EDGE = 0.94;

  function opt(trait, layer, key, dflt) {
    var o = trait.byAnchor && trait.byAnchor[layer.role];
    if (o && o[key] !== undefined) return o[key];
    return trait[key] === undefined ? dflt : trait[key];
  }
  function roll(range, r, dflt) {
    if (range === undefined) return dflt;
    return Array.isArray(range) ? lerp(range[0], range[1], r()) : range;
  }
  function toPolar(el, x, y) {
    el.radius = Math.sqrt(x * x + y * y);
    el.angle = Math.atan2(x, -y);
  }

  /* The bearing a mark points along, from where it sits. */
  function aimAt(kind, light, x, y, r, heading) {
    if (kind === "light") return light + (r() - 0.5) * 0.5;
    if (kind === "centre") return Math.atan2(-x, y) + (r() - 0.5) * 0.3;
    if (kind === "heading") return heading + (r() - 0.5) * 0.12;
    return r() * TAU;
  }

  /* Pick pocket centres: area-uniform candidates in the span, kept by a
   * weighted reservoir on the density field, held apart from each other. */
  function centres(n, trait, layer, f, light, size, r) {
    var band = opt(trait, layer, "band", false);
    var span = band ? [Math.max(0, layer.inner), layer.outer]
                    : opt(trait, layer, "within", [0, 0.8]);
    var seek = opt(trait, layer, "seek", 1);
    var front = opt(trait, layer, "front", false);
    var aimKind = opt(trait, layer, "aim", "random");
    /* Huddled: every candidate after the first drawn round one spot, a few
     * cluster-widths out, rather than through the whole span. */
    var hub = null;
    if (n > 1 && r() < opt(trait, layer, "huddle", 0)) {
      var hr = Math.sqrt(lerp(span[0] * span[0], span[1] * span[1], r())), ha = r() * TAU;
      hub = { x: Math.sin(ha) * hr, y: -Math.cos(ha) * hr, r: size * (2.2 + 0.4 * n) };
    }
    var cands = [];
    for (var c = 0; c < Math.max(24, n * 18); c++) {
      var x, y;
      if (hub) {
        var hd = hub.r * Math.sqrt(r()), hb = r() * TAU;
        x = hub.x + Math.sin(hb) * hd; y = hub.y - Math.cos(hb) * hd;
        var hl = Math.sqrt(x * x + y * y);
        if (hl > span[1]) { x *= span[1] / hl; y *= span[1] / hl; }
      } else {
        var u = lerp(span[0] * span[0], span[1] * span[1], r());
        var rad = Math.sqrt(u), a = r() * TAU;
        x = Math.sin(a) * rad; y = -Math.cos(a) * rad;
      }
      var d = f(x, y);
      var w = seek >= 0 ? Math.pow(0.04 + d, seek) : Math.pow(1.04 - d, -seek);
      if (front) {
        /* Thinner gas a step toward where the mark will point: the edge a
         * star's light has eaten back to. */
        var b = aimAt(aimKind, light, x, y, function () { return 0.5; }, 0);
        var ahead = f(x + Math.sin(b) * size * 1.6, y - Math.cos(b) * size * 1.6);
        w *= 0.08 + Math.max(0, d - ahead);
      }
      cands.push({ x: x, y: y, key: Math.pow(r(), 1 / Math.max(1e-4, w)) });
    }
    cands.sort(function (p, q) { return q.key - p.key; });
    var out = [];
    for (var i = 0; i < cands.length && out.length < n; i++) {
      var ok = true;
      for (var j = 0; j < out.length; j++) {
        var dx = cands[i].x - out[j].x, dy = cands[i].y - out[j].y;
        if (dx * dx + dy * dy < size * size * (hub ? 4 : 7.5)) { ok = false; break; }
      }
      if (ok) out.push(cands[i]);
    }
    /* An impossible separation takes the best left rather than fewer. */
    for (i = 0; out.length < n && i < cands.length; i++) {
      if (out.indexOf(cands[i]) < 0) out.push(cands[i]);
    }
    return out;
  }

  /* THE COUNT, PER CLUSTER — `perPocket` (gen/traitroll.js asks before it
   * builds). The clusters are counted here, ahead of the build, so the count
   * the builder makes is the sum of theirs. */
  function plan(trait, layer, count, r) {
    var per = opt(trait, layer, "perPocket", null);
    if (!per || opt(trait, layer, "formation", "scatter") === "centre") return null;
    var n = Math.max(1, Math.round(roll(opt(trait, layer, "pockets", [1, 3]), r, 2)));
    var counts = [], total = 0;
    for (var i = 0; i < n; i++) {
      var c = Math.max(1, Math.round(lerp(per[0] - 0.49, per[1] + 0.49, r())));
      counts.push(c);
      total += c;
    }
    return { count: total, counts: counts };
  }

  /* Closest approach to the middle of the run from (x, y) along `b`. */
  function nearestToCentre(x, y, b, len) {
    var ux = Math.sin(b), uy = -Math.cos(b);
    var t = clamp(-(x * ux + y * uy), 0, len);
    var px = x + ux * t, py = y + uy * t;
    return Math.sqrt(px * px + py * py);
  }

  function pocketPlacer(made, trait, body, layer, params, seed, r, pre) {
    if (!made.length) return made;
    var f = CC.Diffuse.field(seed);
    var light = CC.Diffuse.lightOf(seed);
    var edge = EDGE * (body.surface || 1);
    var formation = opt(trait, layer, "formation", "scatter");
    var aimKind = opt(trait, layer, "aim", "random");
    var sizeR = opt(trait, layer, "pocketSize", [0.08, 0.14]);
    var size = roll(sizeR, r, 0.1);
    var n = formation === "centre" ? made.length
          : pre ? pre.counts.length
          : Math.max(1, Math.round(roll(opt(trait, layer, "pockets", [1, 3]), r, 2)));
    var pts = centres(n, trait, layer, f, light, size, r);
    var stretchR = opt(trait, layer, "stretch", 1);
    var hueR = opt(trait, layer, "hueShift", null);
    var paintR = opt(trait, layer, "paint", null);
    var each = opt(trait, layer, "eachSize", false);
    var apart = opt(trait, layer, "apart", 0);
    var tip = opt(trait, layer, "tip", 0);
    var clearCore = opt(trait, layer, "clearCore", 0);

    var roundP = opt(trait, layer, "round", 0);
    var looseP = opt(trait, layer, "loose", 0);
    var ovalP = opt(trait, layer, "oval", 0);
    /* The liveries, shuffled once, so fleets take different colours. */
    var liveries = paintR ? paintR.slice() : null;
    for (var li = liveries ? liveries.length - 1 : 0; li > 0; li--) {
      var lj = Math.floor(r() * (li + 1)), lt = liveries[li];
      liveries[li] = liveries[lj]; liveries[lj] = lt;
    }
    var pockets = pts.map(function (p, pi) {
      var base = each ? roll(sizeR, r, 0.1) : size;
      if (looseP && r() < looseP) base *= lerp(1.8, 2.6, r());
      var st = roll(stretchR, r, 1);
      if (roundP && r() < roundP) st = lerp(1, 1.5, r());
      var field = false;
      if (ovalP && r() < ovalP) {
        var ov = lerp(1, 1.8, r());
        base *= Math.sqrt(st / ov);
        st = ov;
        field = true;
      }
      var pk = { x: p.x, y: p.y, r: base * (0.8 + 0.4 * r()),
                 axis: r() * TAU, stretch: st, field: field,
                 heading: r() * TAU };
      if (hueR) pk.hue = (r() < 0.5 ? -1 : 1) * roll(hueR, r, 0);
      if (liveries) {
        var lv = liveries[pi % liveries.length];
        pk.paint = { h: lv[0], s: lv[1], v: lv[2] };
      }
      return pk;
    });

    /* Round-robin over the clusters, each taking only its own share, so the
     * size tiers are mixed through every cluster rather than the largest all
     * landing in the first. */
    var want = pre ? pre.counts : null;
    var per = pockets.map(function () { return 0; });
    var members = pockets.map(function () { return []; });
    var next = 0;
    for (var i = 0; i < made.length; i++) {
      var el = made[i];
      var k = i % pockets.length;
      if (want) {
        for (var g = 0; g < pockets.length; g++) {
          var kk = (next + g) % pockets.length;
          if (per[kk] < want[kk]) { k = kk; break; }
        }
        next = k + 1;
      }
      var pk = pockets[k];
      var idx = per[k]++;
      var x = pk.x, y = pk.y;
      if (formation === "row" || formation === "line") {
        /* Side by side across the aim (a row of pillars), or in file along
         * a shared heading (ships in formation). */
        var b = formation === "line" ? pk.heading
              : aimAt(aimKind, light, x, y, function () { return 0.5; }, 0);
        var across = b + Math.PI / 2;
        var slot = (idx % 2 ? 1 : -1) * Math.ceil(idx / 2);
        var gap = el.size * (formation === "line" ? 1.2 : 0.55) * (0.85 + 0.3 * r());
        var back = formation === "line" ? Math.abs(slot) * el.size * 0.8 : 0;
        x += Math.sin(across) * slot * gap - Math.sin(b) * back;
        y += -Math.cos(across) * slot * gap + Math.cos(b) * back;
      } else if (formation !== "centre") {
        /* The belt's middle held in from the edge by most of its width,
         * once, so the field sits in the gas and only its fringe trails out. */
        if (!pk.held) {
          pk.held = true;
          var pr = Math.sqrt(pk.x * pk.x + pk.y * pk.y);
          var lim = edge - pk.r * Math.min(pk.stretch, 2) * 0.7;
          if (pr > lim && pr > 1e-6) { pk.x *= Math.max(0, lim) / pr; pk.y *= Math.max(0, lim) / pr; }
        }
        /* Triangular falloff about the centre, along the pocket's own axis
         * stretched into a belt. Re-rolled when it lands on top of a
         * neighbour (`apart`). */
        for (var tries = 0; tries < (apart ? 12 : 1); tries++) {
          var u = (r() + r() - 1) * pk.r * pk.stretch;
          var v = (r() + r() - 1) * pk.r;
          if (pk.field) {
            /* A field: a disc filled a little thicker toward the middle,
             * its edge left ragged, stretched along the axis. */
            var fd = Math.pow(r(), 0.62) * (0.9 + 0.2 * r()), fb = r() * TAU;
            u = Math.cos(fb) * fd * pk.r * pk.stretch;
            v = Math.sin(fb) * fd * pk.r;
          }
          x = pk.x + Math.sin(pk.axis) * u + Math.cos(pk.axis) * v;
          y = pk.y - Math.cos(pk.axis) * u + Math.sin(pk.axis) * v;
          var clash = false;
          for (var m = 0; apart && m < members[k].length && !clash; m++) {
            var o = members[k][m];
            var dx = o.x - x, dy = o.y - y;
            var need = apart * (el.size + o.el.size) * 0.5;
            clash = dx * dx + dy * dy < need * need;
          }
          if (!clash) break;
        }
      } else {
        el.size = pk.r;
      }
      members[k].push({ el: el, x: x, y: y });
      el.aim = aimAt(aimKind, light, x, y, r, pk.heading);
      el.rot = el.aim;
      el.light = light;
      if (pk.hue !== undefined) el.hueShift = pk.hue;
      if (pk.paint) el.paint = pk.paint;
      if (trait.elongate !== undefined) el.elongate = trait.elongate;
      /* A built thing dimmed — a derelict's dead hull (draw/details-gas.js
       * hullFill). */
      if (trait.dim !== undefined) el.dim = trait.dim;
      /* A lane's width against its length (draw/primitives/diffuse.js). */
      if (trait.girth !== undefined) el.girth = trait.girth;
      el.pocketId = k;
    }

    members.forEach(function (list, kp) {
      var pk = pockets[kp];
      list.forEach(function (it) {
        /* An aimed column stops short of the middle: shortened until its run
         * no longer crosses `clearCore` (a pillar over the dead star). */
        if (tip && clearCore) {
          var full = it.el.size;
          while (it.el.size > full * 0.3 &&
                 nearestToCentre(it.x, it.y, it.el.aim, it.el.size * tip) < clearCore) {
            it.el.size *= 0.9;
          }
        }
        toPolar(it.el, it.x, it.y);
        it.el.pocket = { x: pk.x, y: pk.y, r: pk.r };
      });
    });

    /* Marks shared by a whole pocket: a cluster's glow, its brightest star. */
    var extras = opt(trait, layer, "extras", null);
    if (extras) {
      pockets.forEach(function (pk) {
        extras.forEach(function (ex) {
          var e = {
            kind: ex.kind, tier: 0,
            size: pk.r * roll(ex.size, r, 1),
            alpha: roll(ex.alpha, r, 0.5),
            tone: ex.tone || "glow",
            seed: r(),
            light: light,
            pocket: { x: pk.x, y: pk.y, r: pk.r },
            pocketId: pockets.indexOf(pk),
            axis: pk.axis, stretch: pk.stretch
          };
          if (ex.blend) e.blend = ex.blend;
          if (ex.spikes !== undefined) e.spikes = ex.spikes;
          toPolar(e, pk.x, pk.y);
          /* A glow goes UNDER the cluster's own marks (`under`); a star at
           * the middle of a cavity goes over it. */
          if (ex.under) made.unshift(e); else made.push(e);
        });
      });
    }

    /* `dial: { param, alpha, emit, absorb }` — curves over one setting, the
     * recipe `dial` of gen/diffuse.js for a trait: a cavity in a dark cloud
     * lets the light behind through, one in a glowing cloud is a dark hole. */
    var dl = trait.dial;
    if (dl) {
      var x0 = clamp(params[dl.param] === undefined ? 0.5 : params[dl.param], 0, 1);
      made.forEach(function (e) {
        if (e.trait !== undefined && e.trait !== trait.id) return;
        if (e.kind !== trait.element) return;
        if (dl.alpha) e.alpha *= M.curve(dl.alpha, x0);
        if (dl.emit) e.emit = M.curve(dl.emit, x0);
        if (dl.absorb) e.absorb = M.curve(dl.absorb, x0);
      });
    }
    /* Sunk beneath the other traits in the spanning pass (gen/details.js),
     * extras included: the trait is ground, not a thing on it. */
    if (trait.under) made.forEach(function (e) { e.under = true; });
    return made;
  }

  pocketPlacer.plan = plan;
  CC.ElemGen.registerPlacer("pocket", pocketPlacer);

  /* ---- the web ------------------------------------------------------------
   *
   * A FILAMENT WEB is a network, not a scatter: threads that MEET, closing
   * into cells, the way a supernova's shock tangles into the Veil. One
   * element per patch, carrying its strands as offsets from its centre in
   * body radii, so it moves with its pocket. Each point joins its two or three
   * nearest neighbours; a joint shared by three strands is what reads as a
   * mesh rather than as loose threads. */
  function buildWeb(recipe, layer, plan, count, rng, opts) {
    var out = [];
    var sz = recipe.size || [0.2, 0.3];
    var al = recipe.alpha || [0.3, 0.5];
    for (var p = 0; p < plan.length; p++) {
      for (var i = 0; i < plan[p].count; i++) {
        var R = lerp(sz[0], sz[1], rng()) * plan[p].size;
        /* Many short strands, not a few long ones: long straight edges between
         * few points read as a constellation diagram. More points on a larger
         * patch, so its cells stay the same size rather than stretching. */
        var grow = clamp(Math.pow(R / 0.28, 2), 0.6, 2.4);
        var n = Math.round((70 + Math.floor(rng() * 40)) * grow);
        var pts = [];
        for (var k = 0; k < n; k++) {
          var rr = R * Math.sqrt(rng()), a = rng() * TAU;
          pts.push([Math.sin(a) * rr, -Math.cos(a) * rr]);
        }
        var seen = {}, segs = [];
        for (k = 0; k < n; k++) {
          var near = pts.map(function (q, j) {
            var dx = q[0] - pts[k][0], dy = q[1] - pts[k][1];
            return { j: j, d: dx * dx + dy * dy };
          }).sort(function (a2, b2) { return a2.d - b2.d; });
          var links = 2 + (rng() < 0.4 ? 1 : 0);
          for (var m = 1; m <= links && m < near.length; m++) {
            var j = near[m].j;
            var key = Math.min(k, j) + ":" + Math.max(k, j);
            if (seen[key]) continue;
            seen[key] = true;
            segs.push([pts[k][0], pts[k][1], pts[j][0], pts[j][1], rng()]);
          }
        }
        out.push({
          kind: "web", tier: plan[p].tier, angle: 0, radius: 0,
          size: R, segs: segs,
          alpha: lerp(al[0], al[1], rng()) * plan[p].alpha,
          tone: recipe.tone || "lighter", seed: rng(),
          blend: recipe.blend
        });
      }
    }
    return out;
  }
  CC.ElemGen.registerBuilder("web", buildWeb);
})();
