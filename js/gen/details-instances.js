/* The detail stage's trait instances and what happens to the finished lists:
 * placing the traits, the draw order within a layer, zone membership, and the
 * elements a sector removes.
 *
 * Split out of gen/details.js, which passed the 500-line rule. Attached to
 * CC.Details; gen/details.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  /* ---- trait instances --------------------------------------------------
   *
   * Placed after the layer details so a trait's RNG stream cannot disturb
   * them, and merged into the same per-role lists so the renderer draws them
   * through one path. A trait instance is an ordinary element carrying a
   * `trait` id — draw/ never reads that field, but the tests and the future
   * overlay do. */
  function placeTraits(st) {
    var byRole = st.byRole;
    var placed = CC.TraitRoll.place(st.traits, st.body, st.params, st.seed, st.zones, st.ground);
    for (var r in placed.byRole) {
      if (!Object.prototype.hasOwnProperty.call(placed.byRole, r)) continue;
      byRole[r] = (byRole[r] || []).concat(placed.byRole[r]);
      st.total += placed.byRole[r].length;
    }
    st.placed = placed;
  }

  /* ---- draw order within a layer ---------------------------------------
   *
   * A trait may declare `under: true`, which sinks it beneath everything
   * else in its layer — including the layer's own details and any other
   * trait.
   *
   * `violent-banding` is the first user and shows why it is needed: it is a
   * set of broad concentric belts across the whole troposphere, and drawn in
   * trait order it painted straight over the storms sitting in that same
   * layer. Banding is the BACKGROUND a storm sits on, not something laid on
   * top of it.
   *
   * A stable partition rather than a sort, so nothing else about the
   * existing order moves — the elements a layer generated for itself keep
   * their relative order, and so do the traits. */
  function orderWithinLayers(st) {
    var byRole = st.byRole, placed = st.placed, seated = st.seated;
    for (var ur in byRole) {
      if (!Object.prototype.hasOwnProperty.call(byRole, ur)) continue;
      var list = byRole[ur];
      var below = [], above = [];
      for (var ui = 0; ui < list.length; ui++) {
        (list[ui].under ? below : above).push(list[ui]);
      }
      if (below.length) byRole[ur] = below.concat(above);
    }
    /* The same partition for the spanning pass, which draws every trait of a
     * body with no layers of its own to sink into — a nebula's. A cavity is
     * the ground its contents sit on; drawn after them it blotted them out.
     * No spanning trait declared `under` before, so nothing else moves. */
    placed.spanning = placed.spanning.concat(seated);
    var spBelow = [], spAbove = [];
    for (var si0 = 0; si0 < placed.spanning.length; si0++) {
      (placed.spanning[si0].under ? spBelow : spAbove).push(placed.spanning[si0]);
    }
    if (spBelow.length) placed.spanning = spBelow.concat(spAbove);
    st.total += placed.outward.length + placed.surface.length +
                placed.damage.length + placed.spanning.length;
  }

  /* ---- resolve zone membership -----------------------------------------
   *
   * ONE PASS, AT THE END, OVER EVERY ELEMENT. Each already has an angle and
   * a role, which is all a zone needs, so this is where membership belongs —
   * the alternative is every drawing primitive querying it separately, which
   * is how a single function turns into per-primitive work.
   *
   * What is carried is a COLOUR DELTA, not a zone id and not a colour. The
   * renderer adds it to whatever the layer rolled, so the same zone recipe
   * perturbs a blue world and a red one correctly (TRAIT-SYSTEM.md: "zones
   * perturb, they don't replace"). */
  function zoneMembership(st) {
    var placed = st.placed;
    if (st.zones) {
      applyZones(st.byRole, placed.outward, placed.surface, placed.damage,
                 st.zones, st.archetype, st.body);
    }
  }

  /* ---- ELEMENTS REMOVED, RATHER THAN RECOLOURED ------------------------
   *
   * Every other thing done to an element here is a PERTURBATION — a hue
   * delta, a displacement — because that is the standing rule (gen/zones.js
   * rule 1: zones perturb, they do not replace). This pass deletes, and it
   * earns the exception the same way a scoured dayside does: some places are
   * places where LESS IS HAPPENING, and the only honest way to draw less
   * happening is for there to be less.
   *
   * A CORONAL HOLE IS WHAT IT WAS BUILT FOR. A hole is a sector where the
   * magnetic field is open and the wind escapes freely, so the corona
   * genuinely has fewer plumes there — the feature IS the absence.
   *
   * IT CANNOT BE DARK PAINT, and that is not an aesthetic preference. The
   * corona is composited with `screen` (ATMOSPHERE_BLEND in draw/scene.js),
   * and under `screen` dark paint is very nearly a no-op — it can only ever
   * add light. That is why the first implementation had to be a flat,
   * hard-edged, unfaded `darker` wedge, which the user correctly called out
   * as a pie slice: a SOFT dark region on a screen-blended layer is simply
   * invisible, which is D121s `dust-formation` failure (maxdelta 19) waiting
   * to happen a second time. Removing elements works with the blend instead
   * of against it and needs no paint at all.
   *
   * IT RUNS OUTSIDE `applyZones`, and that matters: `applyZones` is called
   * only when the body has an angular axis, so a star with coronal holes and
   * no companion would have skipped thinning entirely and the trait would
   * have done nothing on most bodies — the silent D77 failure again.
   *
   * Two sources, composed: the zone field's `thinAt`, and the sectors any
   * trait declaring `thins` produced. */
  function removeElements(st) {
    var body = st.body, zones = st.zones, placed = st.placed, byRole = st.byRole;
    var thinSectors = [];
    for (var ts = 0; ts < (placed.thinning || []).length; ts++) {
      var sec0 = placed.thinning[ts];
      var trait0 = CC.Traits.get(sec0.trait);
      /* The trait names an ANCHOR and only this stage knows which layer that
       * turned out to be — `anchor` may be a list (D77), so a dwarf's optional
       * corona and an old giant's absence of one are both answered by asking
       * rather than by assuming. */
      var lay0 = trait0 ? CC.TraitRoll.anchorLayer(trait0, body) : null;
      if (!lay0) continue;
      sec0.role = lay0.role;
      thinSectors.push(sec0);
    }

    if ((zones && zones.thinAt) || thinSectors.length) {
      /* HOW MANY OF THIS ROLE'S ELEMENTS SURVIVE AT A BEARING.
       *
       * A trait sector is `{angle, half, keep, feather}`. Within `half` of the
       * centre the survival rate is `keep`; from there it eases back to 1 over
       * `feather` more, so the hole has a soft rim rather than a cut line. The
       * hard edge is precisely what made the wedge version read as a slice of
       * pie, so the feather is the point rather than a refinement.
       *
       * Sectors apply only to the role the trait anchored to, so a coronal
       * hole thins the corona and leaves the photosphere's granulation alone. */
      var keepAt = function (angle, role) {
        var keep = (zones && zones.thinAt) ? zones.thinAt(angle) : 1;
        for (var t = 0; t < thinSectors.length; t++) {
          var sec = thinSectors[t];
          if (sec.role && sec.role !== role) continue;
          /* Shortest angular distance, so a sector spanning 0 works. */
          var d = Math.abs(((angle - sec.angle + Math.PI * 3) % (Math.PI * 2))
                           - Math.PI);
          var edge = sec.half * (1 + sec.feather);
          if (d >= edge) continue;
          var u = d <= sec.half ? 0 : (d - sec.half) / (edge - sec.half);
          var k = sec.keep + (1 - sec.keep) * (u * u * (3 - 2 * u));
          if (k < keep) keep = k;
        }
        return keep;
      };

      /* DETERMINISTIC, from the element's own angle and index rather than from
       * a stream: the survival test has to give the same answer on every
       * render of a seed, and two renders must not disagree about which plumes
       * exist. Two summed sines rather than a hash, for the reason D117
       * records — a broken pseudo-random still draws, it just draws something
       * suspiciously tidy. */
      var thinOut = function (list, role) {
        var kept = [];
        for (var i = 0; i < list.length; i++) {
          var el = list[i];
          if (el.angle === undefined) { kept.push(el); continue; }
          var keep = keepAt(el.angle, role);
          if (keep >= 0.999) { kept.push(el); continue; }
          var h = Math.sin(el.angle * 37.13 + i * 0.717)
                + Math.sin(el.angle * 11.71 + i * 2.113);
          /* h runs -2..2; mapped to 0..1 and compared against the rate. */
          if ((h + 2) * 0.25 < keep) kept.push(el);
        }
        return kept;
      };

      for (var trole in byRole) {
        if (!Object.prototype.hasOwnProperty.call(byRole, trole)) continue;
        byRole[trole] = thinOut(byRole[trole], trole);
      }
    }
  }

  /* Attach each element's zone colour delta.
   *
   * Elements whose delta is negligible get nothing at all, so an unzoned or
   * barely-zoned body carries no extra per-element state and the renderer's
   * hot path is untouched. */
  function applyZones(byRole, outward, surface, damage, zones, archetype, body) {
    /* HOW MUCH ROOM A LAYER HAS, taken from the ARCHETYPE'S AUTHORED RANGE
     * rather than from the palette.
     *
     * The delta has to know roughly how dark the layer is, or a nightside on a
     * dark crust goes black (see gen/zones.js). But this stage must stay
     * palette-independent: ARCHITECTURE's caching table says a colour change
     * redraws cached geometry without regenerating it, so reading the actual
     * rolled colour here would make every hue nudge re-roll every position.
     *
     * The midpoint of the authored range is enough. It is what the layer's
     * value is *about*, it is fixed for an archetype, and being approximate
     * costs nothing: this decides how much headroom to aim for, not the final
     * colour, which is still computed from the real palette at draw time. */
    var mids = {};
    var profile = (archetype && archetype.colorProfile) || {};
    var specs = profile.layers || {};
    for (var r0 in specs) {
      if (!Object.prototype.hasOwnProperty.call(specs, r0)) continue;
      var sp = specs[r0];
      if (sp.val) mids[r0] = (sp.val[0] + sp.val[1]) / 2;
    }

    function tag(list, role) {
      var baseV = mids[role];
      for (var i = 0; i < list.length; i++) {
        var el = list[i];
        var d = zones.shiftAt(el.angle, role, baseV);
        if (Math.abs(d.h) < 0.5 && Math.abs(d.s) < 0.004 && Math.abs(d.v) < 0.004) {
          continue;
        }
        el.zone = d;
      }
    }

    /* ELEMENTS RIDE THE TIDAL SWELL, AND THEY HAVE TO BE TOLD TO.
     *
     * `swellAt` displaces a banded layer's BOUNDARY per bearing, but
     * gen/elemgen.js `radiusAt` places every element against
     * `layer.inner + t * layer.thickness` — the layer's nominal, unswollen
     * band. The renderer clips to the swollen shape, so the crescent a layer
     * GAINS on the facing side contained no elements at all and drew as flat
     * bare fill with a hard edge, while the trailing side crowded its marks
     * into a band narrower than the one they were spread across.
     *
     * That is D75/D119 arriving on schedule — the surface moved and everything
     * measured against it went stale — and it is the reason this doc runs
     * before the traits one. Fixing it here rather than in `radiusAt` keeps it
     * to one place: every builder rolls its own angle, so threading the field
     * through six call sites would be six chances to miss one, and this loop
     * already visits every element with the role it belongs to.
     *
     * Scaled by the element's own DEPTH IN THE BAND. A mark sitting at the
     * layer's outer edge should follow the boundary exactly; one at its inner
     * edge should barely move, because that edge is the layer below's
     * boundary and belongs to the layer below's swell. Displacing the whole
     * band rigidly would shear it off the layer beneath it. */
    function rideSwell(list, role) {
      var layer = null;
      for (var li = 0; li < body.layers.length; li++) {
        if (body.layers[li].role === role) { layer = body.layers[li]; break; }
      }
      if (!layer || layer.outward) return;
      var t = layer.thickness || 0;
      if (t <= 0) return;
      for (var i = 0; i < list.length; i++) {
        var el = list[i];
        if (el.radius === undefined) continue;
        /* Where in its own band this element sits, 0 at the floor and 1 at
         * the boundary — the same normalization `radiusAt` placed it with. */
        var depth = (el.radius - layer.inner) / t;
        if (depth < 0) depth = 0; else if (depth > 1) depth = 1;
        var d = zones.swellAt(el.angle, role) * t * depth;
        el.radius += d;
        /* A spanning element carries its own inner edge, which has to move
         * with it or the mark stretches instead of translating. */
        if (el.inner !== undefined) el.inner += d;
      }
    }

    for (var role in byRole) {
      if (!Object.prototype.hasOwnProperty.call(byRole, role)) continue;
      tag(byRole[role], role);
      if (zones.swellAt) rideSwell(byRole[role], role);
    }
    /* Outward traits sit beyond every layer, so they take the shallowest
     * strength the field offers rather than a role's depth. */
    tag(outward, "atmosphere");

    /* Surface and damage traits take the strength of the layer they are
     * attached to, so they feel the same zone the crust does — a scar on a
     * locked world's night face should darken with the ground around it. */
    function tagByOwnRole(list) {
      for (var si = 0; si < list.length; si++) {
        var el = list[si];
        var d = zones.shiftAt(el.angle, el.role, mids[el.role]);
        if (Math.abs(d.h) >= 0.5 || Math.abs(d.s) >= 0.004 ||
            Math.abs(d.v) >= 0.004) {
          el.zone = d;
        }
      }
    }
    tagByOwnRole(surface);
    tagByOwnRole(damage);
  }

  CC.Details.placeTraits = placeTraits;
  CC.Details.orderWithinLayers = orderWithinLayers;
  CC.Details.zoneMembership = zoneMembership;
  CC.Details.removeElements = removeElements;
})();
