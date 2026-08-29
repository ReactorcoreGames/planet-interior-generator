/* Orbital, gaseous and machine primitives — the second half of the drawing
 * vocabulary.
 *
 * Split out of draw/primitives.js, which passed the 500-line rule. The seam is
 * a real one rather than a byte count: everything here is either BEYOND the
 * body (ring bands, debris chunks) or belongs to a specific family's material
 * vocabulary (a gas giant's storms, a machine world's hulls, a crystal's
 * shards), while the primitives left behind are what any body is made of
 * inside its own silhouette.
 *
 * THE SAME RULES APPLY HERE AS THERE. No role names, no archetype names, one
 * signature, and pixels only through `view`. These primitives are named by
 * gaseous and orbital traits, but nothing in this file knows that — a rocky
 * world rolling a debris belt draws the same chunks.
 *
 * Registered into CC.Primitives rather than defining a namespace of their own,
 * so `KINDS` stays one table and draw/details.js still has exactly one place
 * to look a kind up. draw/primitives.js must load first.
 */

var CC = CC || {};

(function () {
  "use strict";

  var TAU = CC.Math.TAU;
  var clamp = CC.Math.clamp;

  /* ---- ring-band --------------------------------------------------------- */

  /* A concentric band beyond the body — ring systems.
   *
   * Drawn as a flat ellipse rather than a circle, because a ring seen from a
   * cutaway's viewpoint is edge-on-ish: a perfect circle would read as a halo
   * rather than as a disc of orbiting material. The squash is fixed rather
   * than rolled so every ring in a system shares one orbital plane, which is
   * most of what makes them read as a system.
   *
   * `el.gap` marks a division — drawn at much lower alpha rather than skipped,
   * so a gap reads as a thinning rather than as a missing band. */
  function ringBand(ctx, view, el, style) {
    var r = view.px(el.radius);
    var w = Math.max(0.6, view.px(el.size));
    var squash = 0.26;

    ctx.save();
    ctx.translate(view.cx, view.cy);
    ctx.scale(1, squash);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.strokeStyle = style;
    /* Divided by the squash so the stroke stays visually the authored width
     * rather than being flattened along with the geometry. */
    ctx.lineWidth = w / squash;
    ctx.stroke();
    ctx.restore();
  }


  /* ---- ringlet-band ------------------------------------------------------ */

  /* A GIANT'S RING, which is a different object from a rocky world's.
   *
   * WHY THIS EXISTS AT ALL. `ring-band` draws one flat uniform ellipse per
   * band, and it was the mark for a ring around a planet, a giant and (until
   * it was gated) a moon alike. Drawing the same object at the same radii on
   * three body types made all three read as one body with different fills —
   * the vocabulary problem D76/D160 keep surfacing, arriving from the
   * direction of sameness rather than of invisibility. A mark that means the
   * same thing everywhere stops distinguishing anything.
   *
   * The physical difference is real and is what this draws. A rocky world's
   * ring is sparse debris — a few diffuse bands, which is what `ring-band`
   * already says well. A giant's is the Saturn case: an enormous, dense,
   * SHARPLY STRUCTURED sheet, resolved into hundreds of individual ringlets
   * with knife-edge divisions between them. The structure IS the object.
   *
   * Three things `ring-band` cannot say, and each is one of the three passes
   * below:
   *
   *   1. RINGLETS. The band is not one stroke but a bundle of finer ones at
   *      slightly different radii and alphas. This is the density thesis
   *      applied to a single mark — more, smaller, fainter — and it is most
   *      of what separates the two silhouettes at a glance.
   *   2. A KNIFE-EDGE DIVISION. A giant's gaps are sharp, not gradual: the
   *      Cassini division is a hard edge, because a resonance sweeps a band
   *      genuinely empty. `el.gap` therefore draws a CLEAN break with bright
   *      shoulders either side, rather than `ring-band`'s low-alpha thinning
   *      — which is the right reading for scattered debris and the wrong one
   *      here.
   *   3. THE PLANET'S SHADOW. A dense ring is lit by the star and the body
   *      occludes part of it, so the far side runs into shadow. Nothing else
   *      in the generator casts one, and it is what makes the ring read as a
   *      lit SHEET rather than as a drawn circle.
   *
   * Same signature and same `view`-only pixel access as every other
   * primitive. It names no role and no archetype: a trait asks for it by
   * kind, and this file does not know which body rolled that trait. */
  function ringletBand(ctx, view, el, style) {
    var r = view.px(el.radius);
    var w = Math.max(0.6, view.px(el.size));
    /* The same squash as `ring-band`, deliberately: a giant's rings are a
     * different OBJECT, not a different orbital plane, and two families
     * disagreeing about the viewing angle would read as a drawing error. */
    var squash = 0.26;

    /* How many ringlets this band resolves into. Tied to the band's own drawn
     * width so a thick band is genuinely more structured rather than the same
     * count stretched — a wide band with three strokes in it reads as three
     * rings, not as one dense one. Capped, because past a point they overlap
     * into a solid fill and the structure is lost again. */
    var n = Math.max(3, Math.min(9, Math.round(w / 1.6) + 3));

    ctx.save();
    ctx.translate(view.cx, view.cy);
    ctx.scale(1, squash);

    if (el.gap) {
      /* A DIVISION IS A CLEAN BREAK WITH BRIGHT SHOULDERS.
       *
       * Two thin, brighter strokes at the band's edges and nothing between
       * them. A resonance does not thin a ring, it empties it — and the
       * material piles up at the boundaries, which is why the shoulders are
       * brighter than the ringlets they sit beside rather than dimmer. */
      ctx.strokeStyle = style;
      ctx.lineWidth = Math.max(0.5, w * 0.22) / squash;
      var half = w * 0.5;
      for (var g = -1; g <= 1; g += 2) {
        ctx.beginPath();
        ctx.arc(0, 0, r + g * half, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    ctx.strokeStyle = style;
    for (var i = 0; i < n; i++) {
      /* Spread across the band's own width, and never all at one alpha: a
       * bundle of identical strokes is a solid fill with extra draw calls.
       * The variation is deterministic in `i` rather than rolled, so this
       * costs no RNG and redraws identically — colour must never re-roll
       * geometry (gen/details.js's standing rule). */
      var t = n === 1 ? 0.5 : i / (n - 1);
      var off = (t - 0.5) * w;
      /* A cheap deterministic wobble so the ringlets are not evenly spaced —
       * evenly spaced reads as a printed scale. */
      var jitter = Math.sin(i * 12.9898 + r * 0.031) * w * 0.16;

      ctx.lineWidth = Math.max(0.4, w * (0.10 + 0.09 * (1 - Math.abs(t - 0.5) * 2))) / squash;
      /* Brightest in the middle of the band, falling off at its edges, so a
       * band has a core rather than being a slab. */
      ctx.globalAlpha = 0.45 + 0.55 * (1 - Math.abs(t - 0.5) * 2);
      ctx.beginPath();
      ctx.arc(0, 0, r + off + jitter, 0, TAU);
      ctx.stroke();
    }

    /* THE BODY'S SHADOW FALLS ACROSS THE FAR SIDE.
     *
     * Drawn as a `destination-out` wedge, so it REMOVES ring rather than
     * painting dark over it — dark paint would sit on top of the background
     * as much as on the ring, and the ring is translucent. Removing is also
     * what a shadow physically is here: that material is not lit.
     *
     * Deliberately soft-edged and partial. A hard black wedge would read as a
     * missing chunk, and the penumbra of a body that size is genuinely wide.
     * `el.shadow` is the bearing the star is in; a trait that omits it gets no
     * shadow rather than an arbitrary one. */
    if (el.shadow !== undefined && el.shadow !== null) {
      var sr = view.px(el.radius) + w;
      var grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, sr));
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(1, "rgba(0,0,0,1)");
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      /* A wedge opposite the star, about a fifth of the turn wide. */
      ctx.arc(0, 0, sr * 1.25, el.shadow - 0.32, el.shadow + 0.32);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  /* ---- storm ------------------------------------------------------------- */

  /* A HAZARD ZONE IN CROSS-SECTION — the irregular lobed patch, given weather.
   *
   * THIS REVERTED, and the reason is worth recording. The first version was a
   * `blob`: an irregular lobed polygon, which read well — the user's words
   * were "the shapes and sizes are good", and specifically that the outline
   * showed the region a diving vessel would know to avoid. The complaint was
   * that it was "flat, textureless and pale".
   *
   * The second version answered that by making it a shaded cyclone with
   * concentric bands and an eye, which is a TOP-DOWN view of a storm. In a
   * cross-section that is simply the wrong projection: you are looking at the
   * side of the planet, so a storm is a turbulent volume you cut through, not
   * a spiral seen from above. Fixing the material by changing the shape threw
   * away the half that was already right.
   *
   * So the outline is the original lobed polygon again, and the three things
   * that were actually missing are added inside it:
   *
   *   1. TURBULENCE — fBm noise sampled in BODY SPACE, so the texture is
   *      locked to the planet and does not swim when the view pans or zooms.
   *      Drawn as a field of short strokes rather than per-pixel, which keeps
   *      it resolution-independent like everything else here.
   *   2. DEPTH — a linear gradient darkening downward through the storm, so
   *      the part reaching deeper into the envelope reads as deeper.
   *   3. TRANSLUCENCY — the whole thing is composited so the banding and
   *      layer detail behind it still show through. A storm is weather in a
   *      gas, not a lid on it.
   *
   * `style` is a {top, bottom, turb, blend, alpha} set — see stormFill. */
  function storm(ctx, view, el, style) {
    var c = view.at(el.radius, el.angle);
    var base = view.px(el.size);
    var lobes = el.lobes || 7;
    var rough = el.rough === undefined ? 0.34 : el.rough;
    var squash = el.squash === undefined ? 0.72 : el.squash;
    var seed = el.seed || 0;

    /* THE OUTLINE IS A CLOSED CURVE THROUGH THE SAME LOBE RADII.
     *
     * IT USED TO BE `blob`'S ANGULAR POLYGON, and the note here defended that
     * at length: the facets read as a HAZARD ZONE on a diagram rather than as
     * a photograph, it had been changed away from twice and reverted twice.
     * That reasoning was sound FOR THE SIZE THE STORM WAS THEN. It does not
     * survive the size the storm is now.
     *
     * A great storm is authored at 1.10-2.00 troposphere-thicknesses, roughly
     * double what it was. Seven straight segments around a small mark read as
     * a slightly irregular blob; the SAME seven segments around a mark that
     * spans a third of the body are metre-long straight edges, and the result
     * reads as a translucent shard of glass laid over the planet. That is not
     * the hazard-zone idea working at a bigger scale, it is a different and
     * worse shape.
     *
     * So the radii are unchanged — same two sine terms, same seed, same
     * irregular silhouette — and only the INTERPOLATION between them changes,
     * from straight to curved. The storm keeps its lopsided, non-circular
     * outline (which is what stops it reading as a printed dot) and loses the
     * facets (which are what made it read as a crystal).
     *
     * Midpoint-quadratic: each lobe radius becomes a control point and the
     * curve passes through the midpoints between them. That is the standard
     * way to close a smooth loop through scattered points without needing
     * tangents, and it costs one pass and no extra state.
     *
     * Two sine terms from the element's own seed, no RNG at draw time, so the
     * shape never changes on a redraw. */
    /* A QUADRATIC THROUGH MIDPOINTS PASSES INSIDE ITS CONTROL POINTS, so the
     * curved outline encloses a visibly smaller area than the polygon through
     * the same radii did — measured at roughly 12-15% narrower, which would
     * have quietly undone the size increase the storms were just given. The
     * radii are scaled back out so the curve reaches the authored size and
     * `size` keeps meaning what it says. */
    var CURVE_GAIN = 1.15;

    function lobeAt(i) {
      var t = (i / lobes) * TAU;
      var w = 1 + Math.sin(t * 2.3 + seed * 31.7) * rough
                + Math.sin(t * 3.7 + seed * 11.3) * rough * 0.5;
      var rr = base * w * CURVE_GAIN;
      return { x: c.x + Math.cos(t) * rr, y: c.y + Math.sin(t) * rr * squash };
    }

    function outline() {
      ctx.beginPath();
      var prev = lobeAt(0);
      /* Start at the midpoint of the last-to-first edge, so the loop closes
       * without a seam. */
      var last = lobeAt(lobes - 1);
      ctx.moveTo((last.x + prev.x) / 2, (last.y + prev.y) / 2);
      for (var i = 1; i <= lobes; i++) {
        var p = lobeAt(i % lobes);
        /* `prev` is the control point; the curve passes through the midpoint
         * between it and the next lobe. */
        ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + p.x) / 2,
                             (prev.y + p.y) / 2);
        prev = p;
      }
      ctx.closePath();
    }

    ctx.save();
    /* TRANSLUCENT, so the body's own banding and detail read through it. The
     * blend mode does the rest — see stormFill for which one and why. */
    ctx.globalAlpha = style.alpha === undefined ? 0.72 : style.alpha;
    if (style.blend) ctx.globalCompositeOperation = style.blend;

    /* THE EDGE IS FEATHERED, NOT CUT.
     *
     * A hard-filled polygon at small size is a rock: once the turbulence
     * strokes fall below a pixel the only thing left is a crisp faceted
     * silhouette, and that is exactly what the small storms read as. A soft
     * perimeter is what says "this is a region of weather" rather than "this
     * is an object".
     *
     * Done as a radial gradient on the ALPHA rather than by blurring, so it
     * costs one gradient and stays resolution-independent. The shape itself is
     * unchanged — the outline is still the angular polygon, it simply stops
     * having a hard boundary. */
    var feather = el.feather === undefined ? 0.30 : el.feather;

    /* THE DEPTH GRADIENT. Down is toward the body's centre, so the axis runs
     * along the element's own bearing rather than along the screen — a storm
     * on the left limb darkens toward the right, and the picture stays correct
     * whatever the global rotation is. */
    var dx = Math.cos(el.angle), dy = Math.sin(el.angle);
    var g = ctx.createLinearGradient(c.x + dx * base, c.y + dy * base,
                                     c.x - dx * base, c.y - dy * base);
    g.addColorStop(0, style.top);
    g.addColorStop(1, style.bottom);

    outline();
    ctx.fillStyle = g;
    ctx.fill();

    /* THE SOFT EDGE — painted as a second fill whose alpha runs out, NOT as an
     * erase.
     *
     * `destination-out` was the obvious way to feather and it does not work
     * here: the storm is drawn straight onto the scene under a `multiply` or
     * `overlay` blend, so a composite operation applies to the whole canvas
     * rather than to the storm in isolation. The erase either did nothing
     * visible or would have punched a hole in the layers behind. Isolating it
     * properly needs an offscreen buffer per storm, which is real cost for a
     * feature that has a cheaper form.
     *
     * The cheaper form: fill the shape a second time with a radial gradient
     * that is TRANSPARENT in the middle and carries the layer's own colour at
     * the rim, so the storm's edge blends back toward its surroundings instead
     * of stopping. Same reading, one extra fill, no buffer, and it composites
     * correctly under any blend mode because it is an ordinary paint. */
    if (feather > 0.001 && style.rim) {
      /* Same clamping rule as the fade above: the outer stop has to sit at or
       * past the outline's furthest lobe, or everything beyond it is filled
       * with solid rim colour instead of being feathered. */
      var edge = base * (1 + rough * 1.5) * CURVE_GAIN;
      var fg = ctx.createRadialGradient(c.x, c.y, edge * (1 - feather),
                                        c.x, c.y, edge);
      fg.addColorStop(0, style.rimClear);
      fg.addColorStop(1, style.rim);
      outline();
      ctx.fillStyle = fg;
      ctx.fill();
    }

    /* AND, FOR A SPANNING STORM, THE RADIAL ENDS DISSOLVE TOO.
     *
     * A storm crossing from the cirrus deck down into the banded layer has no
     * layer boundary to stop it any more (it draws in its own unclipped pass),
     * so it has to end by fading. Same technique as the feather: the layer's
     * own colour painted back over both radial extremes, along the body's
     * radial direction — toward space at the top, toward the interior at the
     * bottom, which is the direction the feature actually thins in. */
    if (el.fadeEnds && style.rim) {
      /* THE GRADIENT MUST REACH PAST THE SHAPE'S FURTHEST POINT.
       *
       * A canvas gradient CLAMPS to its endpoint colour beyond its last stop,
       * so any part of the shape outside the gradient's span is painted in
       * `rim` at full opacity — the layer's own colour, which is exactly
       * "invisible". The outline reaches `base * (1 + rough * 1.5)` at its
       * furthest lobe, so anything shorter erases the storm from the outside
       * in.
       *
       * The first attempt multiplied by `squash`, which was backwards twice
       * over: squash compresses the shape PERPENDICULAR to the radial axis,
       * not along it, and multiplying by a number below 1 made the span
       * shorter when it needed to be longer. Measured: an 85px shape given a
       * 52px gradient, so the outer two thirds was solid rim colour. That is
       * the fourth "it draws but cannot be seen" failure this phase and the
       * third caused by a span that did not cover what it was painting. */
      /* `CURVE_GAIN` for the same reason the feather's `edge` carries it: the
       * outline's furthest point moved outward when the radii were scaled to
       * compensate for the curve, and a gradient that stops short of the shape
       * paints the remainder in solid `rim` — the fifth instance of the
       * failure this comment already describes. */
      var reach = base * (1 + rough * 1.5) * CURVE_GAIN;
      var ex = Math.cos(el.angle), ey = Math.sin(el.angle);
      var eg = ctx.createLinearGradient(c.x + ex * reach, c.y + ey * reach,
                                        c.x - ex * reach, c.y - ey * reach);
      eg.addColorStop(0, style.rim);
      eg.addColorStop(el.fadeEnds, style.rimClear);
      eg.addColorStop(1 - el.fadeEnds, style.rimClear);
      eg.addColorStop(1, style.rim);
      outline();
      ctx.fillStyle = eg;
      ctx.fill();
    }

    /* THE TURBULENCE, clipped inside the storm.
     *
     * Short strokes whose angle and length come from fBm sampled at the
     * element's position in BODY space (el.radius / el.angle), NOT at its
     * pixel position — which is what keeps the pattern welded to the planet
     * under pan and zoom, and is the same reasoning draw/grain.js follows for
     * the frosting's tooth.
     *
     * The count scales with the storm's own size in body units rather than
     * with its pixel size, so a storm has the same amount of structure at
     * every resolution. */
    ctx.clip();
    if (CC.RNG && CC.RNG.makeNoise2D) {
      var n = stormNoise();
      /* A GRID, NOT A SCATTER. Two sine terms produce a Lissajous figure
       * rather than a spread — the strokes landed along a curve and left most
       * of the storm empty, which is why the first attempt read as untextured.
       * A jittered grid covers the shape by construction. */
      var G = 8;
      ctx.lineCap = "round";
      ctx.strokeStyle = style.turb;
      for (var gy = 0; gy < G; gy++) {
        for (var gx = 0; gx < G; gx++) {
          /* Cell centre in the storm's own -1..1 box, plus a jitter of most of
           * a whole cell.
           *
           * At a fraction of a cell the strokes stayed near their lattice
           * points and the field read as a woven crosshatch — a regular
           * pattern, which is the opposite of turbulence. Jittering by
           * ~1.6 cells lets neighbours cross and leaves gaps, so the grid
           * stops being visible while the coverage it guarantees remains. */
          var u = (gx + 0.5) / G * 2 - 1;
          var v = (gy + 0.5) / G * 2 - 1;
          u += Math.sin(seed * 53.1 + gx * 12.9 + gy * 4.7) * (3.2 / G);
          v += Math.sin(seed * 17.7 + gy * 27.3 + gx * 8.1) * (3.2 / G);

          /* Sampled in BODY space — the storm's own bearing and radius plus
           * the stroke's offset within it — so the pattern is welded to the
           * planet and does not swim when the view pans or zooms. The scale
           * gives the field structure at the size of a storm rather than of a
           * planet. */
          var f = n.fbm((el.radius + v * el.size) * 34,
                        (el.angle + u * el.size) * 34, 3);

          /* Spread across the CURVED outline's extent, not the raw radius —
           * otherwise the strokes stop short of the widened perimeter and the
           * storm gets a smooth untextured margin. */
          var px = c.x + u * base * CURVE_GAIN;
          var py = c.y + v * base * squash * CURVE_GAIN;
          /* Mostly along the flow — a storm is being sheared by the jets it
           * sits between — with the noise turning each stroke off that axis. */
          /* Mostly along the flow — a storm is sheared by the jets it sits
           * between — with the noise turning each stroke well off that axis.
           * A narrow angular spread is what made the first version read as
           * hatching rather than as churn. */
          var ang = el.angle + Math.PI / 2 + (f - 0.5) * 4.4;
          var len = base * (0.22 + f * 0.46);
          ctx.lineWidth = Math.max(0.4, base * (0.05 + f * 0.09));
          ctx.beginPath();
          ctx.moveTo(px - Math.cos(ang) * len * 0.5,
                     py - Math.sin(ang) * len * 0.5);
          ctx.lineTo(px + Math.cos(ang) * len * 0.5,
                     py + Math.sin(ang) * len * 0.5);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  /* One noise field for every storm on every body, built once.
   *
   * It does not need to be per body: the field is sampled at the storm's own
   * position in body space, so two worlds' storms already land on different
   * parts of it. Building one costs a 256-entry table instead of one per
   * element. */
  var STORM_NOISE = null;
  function stormNoise() {
    if (!STORM_NOISE) STORM_NOISE = CC.RNG.makeNoise2D(0x51057);
    return STORM_NOISE;
  }

  /* ---- capsule ----------------------------------------------------------- */

  /* A PRESSURE HULL — the one shape in the generator that is MANUFACTURED.
   *
   * Everything else here is weather, rock or fluid, and all of it is soft and
   * irregular. A vessel has to be the opposite: straight sides, hard ends, a
   * specular highlight down one flank and a shadow down the other. That
   * contrast is the whole reason it reads as built rather than as another
   * lump of something — the gas-miner platforms drawn as `chunk` came out, in
   * the user's words, looking like rocks.
   *
   * `el.upright` orients it: a platform hangs VERTICALLY, pointing at the
   * body's centre, because that is how something buoyant sits in a gravity
   * field. A skimmer lies HORIZONTALLY, along its direction of travel.
   *
   * `style` is a {hull, lit, shade, trim} set — see hullFill. */
  function capsule(ctx, view, el, style) {
    var c = view.at(el.radius, el.angle);
    var len = view.px(el.size);
    var wide = len * (el.aspect === undefined ? 0.34 : el.aspect);
    var r = Math.min(wide, len) * 0.5;

    ctx.save();
    ctx.translate(c.x, c.y);
    /* `angle` points away from the centre, so an upright hull is along it and
     * a flat one is across it. */
    ctx.rotate(el.angle + (el.upright ? 0 : Math.PI / 2));

    /* The hull: a rounded rectangle, long axis along local "up". */
    var hx = wide * 0.5, hy = len * 0.5;
    function hullPath() {
      ctx.beginPath();
      ctx.moveTo(-hx + r, -hy);
      ctx.lineTo(hx - r, -hy);
      ctx.quadraticCurveTo(hx, -hy, hx, -hy + r);
      ctx.lineTo(hx, hy - r);
      ctx.quadraticCurveTo(hx, hy, hx - r, hy);
      ctx.lineTo(-hx + r, hy);
      ctx.quadraticCurveTo(-hx, hy, -hx, hy - r);
      ctx.lineTo(-hx, -hy + r);
      ctx.quadraticCurveTo(-hx, -hy, -hx + r, -hy);
      ctx.closePath();
    }

    /* A LINEAR gradient ACROSS the hull, not a radial one — metal is lit from
     * one side and shades to the other, which is what separates a machined
     * cylinder from a blob. */
    var g = ctx.createLinearGradient(-hx, 0, hx, 0);
    g.addColorStop(0, style.shade);
    g.addColorStop(0.32, style.hull);
    g.addColorStop(0.58, style.lit);
    g.addColorStop(1, style.shade);

    hullPath();
    ctx.fillStyle = g;
    ctx.fill();

    /* A hard outline. Nothing else in these layers has one, and it is a large
     * part of what makes the silhouette read as an object rather than as a
     * patch of colour. */
    ctx.lineWidth = Math.max(0.35, len * 0.045);
    ctx.strokeStyle = style.trim;
    ctx.stroke();

    /* Two banding lines across the hull — the join between pressure sections.
     * Cheap, and they turn a smooth capsule into a piece of equipment. */
    if (len > 3) {
      ctx.lineWidth = Math.max(0.3, len * 0.035);
      for (var i = -1; i <= 1; i += 2) {
        var y = hy * 0.42 * i;
        ctx.beginPath();
        ctx.moveTo(-hx, y);
        ctx.lineTo(hx, y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /* ---- shard ------------------------------------------------------------- */

  /* A GEM — sharp, faceted, and lit from within.
   *
   * `chunk` was the first attempt at diamond rain and it produced, in the
   * user's words, an asteroid ring in the middle of the planet: chunk is
   * deliberately a ROUNDED angular lump because it draws broken rock, and
   * broken rock is exactly what a diamond is not.
   *
   * A shard is a small number of long straight facets around a stretched
   * centre — an elongated crystal rather than a pebble — with one bright facet
   * catching the light. Drawn under a blend mode so it takes colour from the
   * fluid it is falling through, which is what makes it read as transparent.
   *
   * `style` is a {body, facet, glint, blend} set — see gemFill. */
  function shard(ctx, view, el, style) {
    var c = view.at(el.radius, el.angle);
    var base = Math.max(0.6, view.px(el.size));
    var seed = el.seed || 0;
    /* Few facets and a strong elongation: a crystal has a long axis. */
    var sides = 5 + Math.floor(seed * 3);
    var stretch = 1.7 + seed * 1.1;
    /* A FALLING crystal points the way it is going, so its long axis is
     * radial. A GROWING one in a shearing flow lies across that flow, which
     * here is around the body — the same shape saying two different things
     * depending on which way it is turned. */
    var spin = el.angle + (el.crosswise ? Math.PI / 2 : 0);

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(spin);
    if (style.blend) ctx.globalCompositeOperation = style.blend;

    function facetPath(scale) {
      ctx.beginPath();
      for (var i = 0; i < sides; i++) {
        var t = (i / sides) * TAU;
        /* Straight edges between few vertices — the flat faces are the point.
         * The wobble is small and deterministic, so no two are identical
         * without any of them losing their crystal geometry. */
        var w = 0.78 + 0.22 * Math.abs(Math.sin(seed * 17 + i * 1.9));
        var x = Math.cos(t) * base * w * scale;
        var y = Math.sin(t) * base * w * scale * stretch;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }

    facetPath(1);
    ctx.fillStyle = style.body;
    ctx.fill();

    /* An inner facet, offset — the refraction you see through a stone. */
    ctx.save();
    ctx.translate(base * 0.16, -base * stretch * 0.14);
    facetPath(0.52);
    ctx.fillStyle = style.facet;
    ctx.fill();
    ctx.restore();

    /* And the glint: one small bright face. */
    ctx.beginPath();
    ctx.moveTo(0, -base * stretch * 0.72);
    ctx.lineTo(base * 0.34, -base * stretch * 0.16);
    ctx.lineTo(-base * 0.10, -base * stretch * 0.10);
    ctx.closePath();
    ctx.fillStyle = style.glint;
    ctx.fill();

    ctx.restore();
  }

  /* ---- chunk ------------------------------------------------------------- */

  /* A small angular polygon — debris, rubble, fragments.
   *
   * Deliberately angular where `blob` is smooth: broken rock has flat faces
   * and corners, and that difference is what separates a debris belt from a
   * field of pockets without needing two colour treatments. */
  function chunk(ctx, view, el, style) {
    var c = view.at(el.radius, el.angle);
    var base = Math.max(0.7, view.px(el.size));
    var seed = el.seed || 0;
    /* MORE SIDES THAN BEFORE (3-6 became 5-9). A triangle at debris scale is
     * two or three pixels of solid colour, which is exactly what a star in the
     * background plate looks like. More corners give a silhouette that reads
     * as a broken lump even when small. */
    var sides = 5 + Math.floor(seed * 5);
    var spin = seed * TAU;

    /* `style` is a {body, lit, shadow, fleck} set when the caller wants rock
     * rather than a flat fragment; a plain fill otherwise. */
    var rich = style && style.body;

    function facePath(scale, dx, dy) {
      ctx.beginPath();
      for (var i = 0; i < sides; i++) {
        var t = (i / sides) * TAU + spin;
        /* A deterministic per-corner wobble from the element's own seed, so no
         * two chunks are the same shape and none needs an RNG. Deeper than it
         * was, so the outline is jagged rather than merely a rounded polygon —
         * broken rock has facets and notches. */
        var wob = 0.48 + 0.52 * Math.abs(Math.sin(seed * 40 + i * 2.7));
        var x = c.x + dx + Math.cos(t) * base * wob * scale;
        var y = c.y + dy + Math.sin(t) * base * wob * scale;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }

    facePath(1, 0, 0);
    ctx.fillStyle = rich ? style.body : style;
    ctx.fill();

    if (!rich) return;

    /* A LIT FACE AND A SHADOWED ONE.
     *
     * A single flat fill is the whole reason debris was mistaken for
     * starfield: a star is a small bright uniform dot, and so was a chunk.
     * Rock is not uniform — it has a face turned toward the light and one
     * turned away, and that internal contrast is what makes even a 3px mark
     * read as a solid object rather than as a point of light.
     *
     * The offset is a fixed fraction of the chunk's own size, so every
     * fragment in a belt is lit from the same direction and the belt reads as
     * one population of rocks under one sun. */
    var off = base * 0.30;
    ctx.save();
    facePath(1, 0, 0);
    ctx.clip();

    /* The shadowed side: a second copy pushed toward the light, so what
     * remains uncovered along the far edge is the dark limb of the rock. */
    ctx.beginPath();
    facePath(0.96, -off * 0.55, -off * 0.55);
    ctx.fillStyle = style.shadow;
    ctx.fill();

    /* The lit crown, smaller and offset the other way. */
    ctx.beginPath();
    facePath(0.62, off * 0.42, off * 0.42);
    ctx.fillStyle = style.lit;
    ctx.fill();

    ctx.restore();

    /* THE TERMINATOR RIM — one bright arc along the sunward edge.
     *
     * THIS IS THE MARK THAT SEPARATES A ROCK FROM A STAR, and it is a
     * different KIND of mark rather than a stronger version of the same one.
     * Everything above works by internal contrast: a lit face, a dark face,
     * grain. At three pixels across all of that averages back out to a single
     * dull dot, which is exactly what a faint star is — so the fragment kept
     * losing against the starfield no matter how the tones were tuned. The
     * lesson recorded in PROGRESS.md is that a trait separates by VOCABULARY,
     * not by contrast, and no star in this renderer has an EDGE. A crescent of
     * bright along one side is a shape the background plate simply cannot
     * produce, so even at the smallest size the eye reads a lit object rather
     * than a point of light.
     *
     * THE RIM FOLLOWS THE ROCK'S OWN OUTLINE, and the first version's mistake
     * is the whole reason this note is long. It stroked a CIRCULAR arc at a
     * fixed radius and a fixed screen angle — which is not the shape of the
     * fragment. A chunk is an irregular polygon whose corners reach different
     * radii, so a circle drawn near its mean radius cuts inside the long
     * corners and floats clear of the short ones: the result read as a
     * detached crescent hovering beside each rock, a second object rather than
     * a lit edge. It was worst on the largest fragments, where there is most
     * room for the outline to disagree with a circle.
     *
     * So the rim is walked along the SAME VERTICES the silhouette is built
     * from, keeping only the run of edges facing the light. A lit edge has to
     * BE the edge — anything else is a decal sitting near it, which is exactly
     * the "goofy up close" failure.
     *
     * The lit direction is the same fixed diagonal the faces are offset along,
     * so the whole belt is lit by one sun. That is what makes a field of these
     * read as one population of orbiting rocks rather than as scattered
     * confetti — and it costs no light model, no sun position and no
     * per-archetype anything, which is what lets it generalise to a gas
     * giant's belt or to a family not yet written. */
    if (style.rim) {
      /* Toward the light: up-and-right, matching the `+off` crown offset. */
      var lightAng = -Math.PI / 4;
      var lx = Math.cos(lightAng), ly = Math.sin(lightAng);

      /* The silhouette's vertices, in the same order and from the same wobble
       * `facePath` uses — so the rim cannot drift out of agreement with the
       * outline it is supposed to lie on. */
      var vx = [], vy = [];
      for (var v = 0; v < sides; v++) {
        var vt = (v / sides) * TAU + spin;
        var vw = 0.48 + 0.52 * Math.abs(Math.sin(seed * 40 + v * 2.7));
        vx.push(c.x + Math.cos(vt) * base * vw);
        vy.push(c.y + Math.sin(vt) * base * vw);
      }

      /* Keep an edge when its OUTWARD NORMAL faces the light. Judged per edge
       * rather than per vertex because the stroke is the edge, and this is the
       * same test a renderer uses to find a terminator — it just happens to be
       * cheap enough here to do in a loop over five to nine sides. */
      ctx.save();
      ctx.strokeStyle = style.rim;
      /* FLOORED IN PIXELS ON PURPOSE, and this is the one place in the file
       * where that is right rather than a resolution-independence bug. The
       * floor is not a COUNT and it does not add or remove elements — it
       * keeps a stroke that already exists from falling under the width at
       * which a canvas renders it as nothing. `view.lw` applies the same
       * floor to every other stroke in the app for the same reason. */
      ctx.lineWidth = Math.max(0.6, base * 0.22);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (var k = 0; k < sides; k++) {
        var k2 = (k + 1) % sides;
        /* The edge's midpoint relative to the centre is its outward direction
         * for a star-shaped polygon, which every chunk is — the wobble scales
         * each vertex along its own ray and so cannot make the shape concave
         * enough to break this. */
        var mx = (vx[k] + vx[k2]) / 2 - c.x;
        var my = (vy[k] + vy[k2]) / 2 - c.y;
        var ml = Math.sqrt(mx * mx + my * my) || 1;
        if ((mx / ml) * lx + (my / ml) * ly <= 0.10) continue;
        ctx.moveTo(vx[k], vy[k]);
        ctx.lineTo(vx[k2], vy[k2]);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    facePath(1, 0, 0);
    ctx.clip();

    /* SURFACE TEXTURE — a few flecks of grain per fragment.
     *
     * Pits and mineral speckle. Deterministic from the element's own seed, so
     * this stays a pure function of the element and costs no RNG. Only drawn
     * on fragments big enough to show it; below that the flecks would just
     * dirty the silhouette.
     *
     * THE THRESHOLD IS ASKED IN REFERENCE SPACE, NOT IN PIXELS. `base` is
     * `view.px(...)`, so testing it meant "big enough on this canvas" — and a
     * fragment that sat below 2.2px in the preview crossed it in a 4K export
     * and grew flecks that the preview did not have. Measured at 640x360
     * against 3840x2160: 9629 arcs became 11001, i.e. the export drew 1372
     * elements that were not in the picture it was exporting.
     *
     * That is the resolution-independence rule exactly: counts never scale
     * with pixels, and the preview is the real render. `view.fs` is the same
     * authored size the element was placed with, so the answer is the same at
     * every output size. */
    if (view.fs(el.size) > 2.2 && style.fleck) {
      ctx.fillStyle = style.fleck;
      var flecks = 2 + Math.floor(seed * 4);
      for (var f = 0; f < flecks; f++) {
        var fa = seed * 91 + f * 2.399;
        var fr = base * (0.15 + 0.62 * Math.abs(Math.sin(seed * 53 + f * 1.7)));
        var fx = c.x + Math.cos(fa) * fr;
        var fy = c.y + Math.sin(fa) * fr;
        var fs = Math.max(0.4, base * 0.15 * (0.5 + Math.abs(Math.cos(fa * 3))));
        ctx.beginPath();
        ctx.arc(fx, fy, fs, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /* ---- voronoi ---------------------------------------------------------- */

  /* A cell mosaic, via the vendored d3.Delaunay. Built for the asteroid
   * interior in Phase 7 and for ice shells; declared here so the vocabulary is
   * complete and the library is exercised.
   *
   * Takes a list of sites rather than one element, because a mosaic is a
   * single structure rather than a scattered instance. */
  function voronoi(ctx, view, sites, bounds, styleFor) {
    if (!sites.length || typeof d3 === "undefined" || !d3.Delaunay) return;

    var pts = [];
    for (var i = 0; i < sites.length; i++) {
      var p = view.at(sites[i].radius, sites[i].angle);
      pts.push(p.x, p.y);
    }

    var del = d3.Delaunay.from(
      sites.map(function (s) {
        var p = view.at(s.radius, s.angle);
        return [p.x, p.y];
      }));
    var vor = del.voronoi(bounds);

    for (i = 0; i < sites.length; i++) {
      var poly = vor.cellPolygon(i);
      if (!poly) continue;
      ctx.beginPath();
      for (var k = 0; k < poly.length; k++) {
        if (k === 0) ctx.moveTo(poly[k][0], poly[k][1]);
        else ctx.lineTo(poly[k][0], poly[k][1]);
      }
      ctx.closePath();
      ctx.fillStyle = styleFor(sites[i], i);
      ctx.fill();
    }
  }
  CC.Primitives.register({
    "ring-band": ringBand,
    /* A giant's ring is a different OBJECT from a rocky world's — resolved
     * ringlets, knife-edge divisions, and the body's own shadow across it.
     * See ringletBand. */
    "ringlet-band": ringletBand,
    "chunk": chunk,
    /* The gaseous family's three. Each exists because a soft irregular blob
     * could not say what the thing IS — a shaded cyclone, a manufactured
     * pressure hull, a faceted crystal. See each function's note. */
    "storm": storm,
    "capsule": capsule,
    "shard": shard
  });

  /* `voronoi` takes a list of SITES rather than one element, so it is not a
   * `KINDS` entry — nothing dispatches to it by `el.kind`. Published on the
   * namespace directly, which is how draw/ already reaches it. */
  CC.Primitives.voronoi = voronoi;
})();
