/* What is settled once every layer has a colour: adjacent bands kept apart, an
 * exotic sea kept off its floor, and the colours the whole body publishes for
 * the marks that need them.
 *
 * Split out of gen/palette.js, which passed the 500-line rule. Attached to
 * CC.Palette; gen/palette.js and gen/palette-util.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  var clamp = CC.Math.clamp;
  var P = CC.Palette;
  var makeHotEdge = P.makeHotEdge, makeLighter = P.makeLighter;
  var makeDarker = P.makeDarker, makeRgba = P.makeRgba;

  /* How far apart two adjacent layers' values must be to read as different
   * materials rather than one indistinct band. */
  var MIN_VALUE_SEPARATION = 0.11;

  /* --- guarantee adjacent bands are distinguishable ---
   *
   * Two layers whose profiles overlap can both roll into the same corner of
   * HSV — crust and mantle are the pair that does it, since their authored
   * value ranges overlap. The result is a single indistinct band where the
   * cutaway should show two materials, which is exactly the "muddy" failure
   * this phase is judged against.
   *
   * Rather than hand-tuning the ranges apart and hoping, adjacent pairs are
   * checked and separated after the fact: the inner layer is darkened until
   * it reads as distinct. Working inward keeps the archetype's overall
   * light-to-dark ordering intact. */
  function separateAdjacent(st) {
    var layers = st.layers, out = st.out, heat = st.heat;
    var i;
    var order = [];
    for (i = 0; i < layers.length; i++) {
      if (!layers[i].outward && out[layers[i].role]) order.push(out[layers[i].role]);
    }
    for (i = 1; i < order.length; i++) {
      var prev = order[i - 1], cur = order[i];
      /* A void stays black: it is not a material to be told apart from its
       * neighbour, and pushing it lighter is the one thing it must not do. */
      if (cur.flat || prev.flat) continue;

      /* COMPARE THE EDGES THAT ACTUALLY TOUCH, not the two base colours.
       *
       * Once a layer carries a gradient, its base colour is no longer what
       * sits against its neighbour — the outer core meets the inner core with
       * its HOT edge, which may be most of a hue and a third of a value away
       * from the colour this check used to read. Comparing base colours could
       * therefore pass a pair whose visible boundary had in fact collapsed,
       * and equally could "fix" a pair that was already perfectly distinct
       * where it mattered. The gradient work made this check ask the wrong
       * question; it now asks about the boundary the eye actually sees. */
      var pIn = prev.hotEdge || prev;

      var dh = Math.abs(pIn.h - cur.h);
      if (dh > 180) dh = 360 - dh;
      var dv = Math.abs(pIn.v - cur.v);
      var ds = Math.abs(pIn.s - cur.s);

      if (dv < MIN_VALUE_SEPARATION && dh < 14 && ds < 0.14) {
        /* Push away from the neighbour's TOUCHING edge, staying inside the
         * legal range — the same correction as the comparison above. */
        var target = pIn.v > 0.5
          ? Math.max(0.05, pIn.v - MIN_VALUE_SEPARATION)
          : Math.min(0.95, pIn.v + MIN_VALUE_SEPARATION);
        cur.v = target;
        cur.hex = CC.Color.hsvToHex(cur.h, cur.s, cur.v);
        cur.lighter = makeLighter(cur.h, cur.s, cur.v);
        cur.darker = makeDarker(cur.h, cur.s, cur.v);
        cur.rgba = makeRgba(cur.h, cur.s, cur.v);
        /* The thermal gradient is derived from the band's value, so it moves
         * with it — otherwise the two ends of the gradient would be built from
         * different colours and the band would step at its outer edge. */
        cur.hotEdge = makeHotEdge(cur.heatSpec, heat, cur.h, cur.s, cur.v);
      }
    }
    st.order = order;
  }

  /* --- an exotic sea must still separate from the rock beneath it ---
   *
   * WHATEVER HUE THE SEA TAKES, IT MUST READ AS DISTINCT FROM THE CRUST.
   * That is the same relational constraint the frosting uses (D19/D20) and
   * it is precisely what lets the hue roam the whole wheel without any world
   * losing its ocean into its rock — which was the original failure the
   * authored range was introduced to fix, so freeing the hue without this
   * would simply reintroduce it by another route.
   *
   * The general adjacency pass above cannot catch it: that one darkens the
   * INNER layer of a colliding pair, so it would push the crust around to
   * accommodate the sea rather than moving the sea. The ocean is the layer
   * that just had its constraint waived, so the ocean is the layer that
   * moves.
   *
   * Value, not hue. Two colours that differ only in hue at the same
   * lightness are a weak separation on a small band seen through water;
   * moving the value is what genuinely reads, and it costs the sea nothing
   * it was promised — a pale sea over dark rock and a dark sea over pale
   * rock are both perfectly exotic. */
  function separateExoticSea(st) {
    var layers = st.layers, out = st.out, profile = st.profile;
    var params = st.params, heat = st.heat;
    for (var xi = 0; xi < layers.length; xi++) {
      var xspec = (profile.layers && profile.layers[layers[xi].role]) || {};
      if (!xspec.exotic || !params.exoticOceans) continue;
      var sea = out[layers[xi].role];
      /* The layer this one floats on: the next one inward that is a real
       * layer. Found by position rather than by name, so a magma sea over a
       * different floor behaves identically. */
      var floor = (xi + 1 < layers.length) ? out[layers[xi + 1].role] : null;
      if (!sea || !floor) continue;

      var xdh = Math.abs(sea.h - floor.h);
      if (xdh > 180) xdh = 360 - xdh;
      if (xdh >= 20 || Math.abs(sea.v - floor.v) >= 0.10) continue;

      /* Push away from the floor, toward whichever end of the sea's own
       * range has more room, so the correction never runs out of gamut. */
      var up = 1 - floor.v, down = floor.v;
      sea.v = clamp(up >= down ? floor.v + 0.16 : floor.v - 0.16, 0.05, 0.95);
      sea.hex = CC.Color.hsvToHex(sea.h, sea.s, sea.v);
      sea.lighter = makeLighter(sea.h, sea.s, sea.v);
      sea.darker = makeDarker(sea.h, sea.s, sea.v);
      sea.rgba = makeRgba(sea.h, sea.s, sea.v);
      sea.hotEdge = makeHotEdge(sea.heatSpec, heat, sea.h, sea.s, sea.v);
    }
  }

  /* WHAT THIS BODY EMITS — the colour a mirror in orbit would reflect, or
   * null for a body that shines by nothing of its own.
   *
   * PUBLISHED HERE RATHER THAN LOOKED UP BY THE RENDERER, and that is the
   * whole reason it exists. An orbital mirror's glass face is the star's own
   * light, so the primitive drawing it needs the star's colour — and the one
   * thing js/draw/ may never do is ask for a layer by role name. `emissive`
   * is already computed per layer above, so this is a property of the BODY
   * expressed in terms the renderer is allowed to hold.
   *
   * TWO TESTS, AND EACH ONE WAS MEASURED RATHER THAN REASONED:
   *
   *   VISIBLE FROM OUTSIDE. A rocky planet's molten core is `emissive` too,
   *     so the naive version reported an ordinary planet as emitting a
   *     bright orange nothing outside it could see. A cutaway shows the core
   *     to the READER; it does not show it to a mirror. So the layer has to
   *     reach the body's own surface, and a world whose only self-lit layer
   *     is buried correctly answers nothing at all.
   *   BRIGHTEST, NOT OUTERMOST. "Outermost" is the intuitive rule and it is
   *     wrong here, because on a star EVERY layer is self-lit — so it picked
   *     the corona, and on an old giant the shed envelope, both of which are
   *     faint haloes rather than the light the star radiates. Measured, the
   *     giant reported #46423a at v=0.27 against a photosphere at v=0.65.
   *     What a mirror reflects is the body's LIGHT, so the test is value.
   *
   * Both together mean this reads as "the brightest thing about this body
   * that can be seen from space", which is what the word means. */
  function findEmitted(st) {
    var body = st.body, out = st.out;
    var emitted = null;
    for (var ei = 0; ei < body.layers.length; ei++) {
      var el_ = body.layers[ei];
      var ec = out[el_.role];
      if (!ec || !ec.emissive) continue;
      if (el_.outer < body.surface - 1e-6) continue;
      if (!emitted || ec.v > emitted.v) emitted = ec;
    }
    st.emitted = emitted;
  }

  /* THE BODY'S DEEP INTERIOR COLOUR — the hue of the hot machinery under the
   * visible surface, published for marks that need to look like they came
   * from DOWN THERE rather than from the layer they are drawn over.
   *
   * A coronal hole's field lines are the case this exists for. They are
   * diagrammatic marks — the same register as the mantle's flow arrows —
   * and the whole point of them is that they belong to a different part of
   * the star than the corona they cross. Borrowing an interior hue says
   * that; inventing a colour would say only "this is not part of the
   * picture", which is D123's complaint about the magenta prominences.
   *
   * A CHAIN RATHER THAN A ROLE NAME, and that is the D77 lesson: `radiative`
   * exists on main-sequence and young stars and on NEITHER of the other two.
   * A dwarf is fully convective — real physics, not an omission — and an old
   * giant has an h-shell instead. Naming one role would have coloured this
   * trait correctly on half the family and left it falling back to the
   * corona's own hue on the rest, which is the silent failure where
   * everything except the render says it worked.
   *
   * The chain runs from the most specific to the most general, and the last
   * entry is the fusion core, which every star in the generator has. */
  function findDeep(st) {
    var out = st.out;
    var deep = null;
    var DEEP_ROLES = ["radiative", "h-shell", "tachocline", "convective",
                      "fusion-core", "core", "outer-core", "mantle"];
    for (var di = 0; di < DEEP_ROLES.length; di++) {
      if (out[DEEP_ROLES[di]]) { deep = out[DEEP_ROLES[di]]; break; }
    }
    st.deep = deep;
  }

  /* ---- THE ORBITAL BAND NEEDS A COLOUR OF ITS OWN --------------------
   *
   * `anchor: "orbit"` gets a SYNTHETIC layer (gen/traitroll.js) so rings and
   * debris can be placed outside the body without a separate code path. It
   * is not a real layer, so nothing here ever built a palette entry for it,
   * and `get("orbit")` fell all the way through to the neutral fallback
   * in `result` — h:0, s:0, v:0.45. Flat grey.
   *
   * THAT IS WHY EVERY RINGED GIANT LOOKED THE SAME. The rings were not pale
   * because of their tone; they were pale because they had no colour at all,
   * and no tone can put chroma back into a colour whose saturation is zero.
   * Four giants with completely different palettes drew four identical grey
   * ring systems. A mark that cannot vary with the body is a mark that has
   * stopped carrying information, which is the same sameness problem the
   * two ring traits were split apart to solve — one level further down, and
   * invisible from the trait declarations because it lived here.
   *
   * DERIVED FROM THE BODY, NOT INVENTED. Ring material is debris from the
   * world it orbits — shattered moons, captured dust, the same rock and ice
   * the body is made of — so borrowing the outermost real layer's hue is
   * the physically honest choice as well as the one that keeps the system
   * in family. This is zones.js rule 1 again: perturb the rolled colour,
   * never replace it.
   *
   * Desaturated and lightened FROM that hue rather than set to a fixed
   * value. Rings are dust and ice, so they are never as chromatic as a
   * cloud deck — but they keep the body's tint, which is exactly the
   * variety that was missing. The per-family split (dark warm rubble vs
   * bright ice) is then the TONE's job, applied on top of this in
   * draw/details.js — so this stays one colour and the two ring traits
   * stay distinguishable. */
  function orbitalColour(st) {
    var out = st.out, order = st.order;
    if (!out.orbit) {
      /* `order` is the adjacency pass's list: the non-outward layer colours,
       * outermost first. The outermost solid layer is the body's visible
       * material, which is what ring debris would be made of. */
      var host = null;
      for (var oi = 0; oi < order.length; oi++) {
        if (order[oi] && !order[oi].emissive) { host = order[oi]; break; }
      }
      if (!host) host = order[0] || null;

      if (host) {
        var oh = host.h;
        /* Toward neutral but never all the way: enough chroma to say which
         * world this belongs to, not enough to compete with the body. */
        var os = clamp(host.s * 0.55, 0, 1);
        /* Lifted clear of the background so a ring reads against space
         * whatever the host layer's value happens to be. */
        var ov = clamp(0.52 + host.v * 0.34, 0, 1);
        out.orbit = {
          h: oh, s: os, v: ov,
          hex: CC.Color.hsvToHex(oh, os, ov),
          depth: 1,
          bandContrast: 1,
          hotEdge: null,
          heatSpec: null,
          emissive: false,
          lighter: makeLighter(oh, os, ov),
          darker: makeDarker(oh, os, ov),
          rgba: makeRgba(oh, os, ov)
        };
      }
    }
  }

  CC.Palette.separateAdjacent = separateAdjacent;
  CC.Palette.separateExoticSea = separateExoticSea;
  CC.Palette.findEmitted = findEmitted;
  CC.Palette.findDeep = findDeep;
  CC.Palette.orbitalColour = orbitalColour;
})();
