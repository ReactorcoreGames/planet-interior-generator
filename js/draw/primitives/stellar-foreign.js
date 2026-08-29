/* Stellar primitives — SOLID OBJECTS AGAINST A STAR.
 *
 * `engulfed-world`, `orbital-mirror` and `coned-cylinder`. All three are a
 * solid object seen against something luminous, which is a different drawing
 * problem from the plasma-and-field marks in `stellar.js` and fails in
 * different ways.
 *
 * TWO FAILURE MODES THIS FILE EXISTS TO KEEP IN ONE PLACE, both paid for:
 *
 *   D82/D126 — A SYMBOL IS NOT A SCALE MODEL, and around a star this is at its
 *     most extreme. A collector is perhaps a kilometre across and the star is a
 *     million; at any honest scale the whole swarm is sub-pixel. The Dyson
 *     swarm's first version diffed at 70,000 changed pixels and was still
 *     invisible, because seventy-three objects at 1.4 px each change a great
 *     many pixels while no single one is legible.
 *   D80 — THE WRONG OBJECT DRAWS FINE. An engulfed planet built from `chunk`
 *     produced an enormous faceted boulder, because `chunk` IS broken rock. A
 *     planet is round, and roundness is what separates a world from a rock at
 *     any size.
 *
 * THE SAME RULES APPLY AS EVERYWHERE IN draw/. No role names, no archetype
 * names, one signature, pixels only through `view`.
 *
 * draw/primitives.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  /* ---- engulfed-world ---------------------------------------------------- */

  /* A PLANET BEING EATEN — a dark sphere inside a luminous envelope, with the
   * star's material shearing off it.
   *
   * `chunk` WAS THE FIRST ATTEMPT AND IT IS THE WRONG OBJECT. `chunk` is
   * calibrated for debris: a five-to-nine-sided lump with a deep per-corner
   * wobble, which reads as broken rock at the few pixels a belt fragment
   * occupies. Blown up to a fifth of a layer it became an enormous faceted
   * nut — a flat dark hexagon with a highlight hooked round one side — and it
   * said "boulder" at exactly the moment it needed to say "world".
   *
   * The distinction is the whole content of the trait. A planet is ROUND, and
   * roundness is what separates a world from a rock at any size; it is also
   * the one silhouette nothing else in a star's interior has, every other mark
   * here being a loop, a streak or a cell. So this is a circle, and the detail
   * that makes it read as doomed rather than merely present is the WAKE: the
   * star's material piling up on its leading face and streaming off behind it
   * as it spirals in.
   *
   * D80 for the fifth time in this project, and the cheapest instance of it —
   * the shape was one call away the whole time.
   *
   * `style` is a {body, lit, wake} set — see doomedFill. */
  function engulfedWorld(ctx, view, el, style) {
    var c = view.at(el.radius, el.angle);
    var r = view.px(el.size);
    if (r < 1) return;

    /* THE WAKE, drawn first so the world sits on top of it. A trailing arc of
     * disturbed material, swept back along the direction of travel — which is
     * tangential, because the planet is spiralling rather than falling
     * straight in. */
    var sweep = (el.spin || 1);
    ctx.strokeStyle = style.wake;
    ctx.lineCap = "round";
    for (var w = 0; w < 3; w++) {
      var off = (w - 1) * r * 0.55;
      ctx.lineWidth = view.lw(1.6 - w * 0.3);
      ctx.beginPath();
      for (var i = 0; i <= 16; i++) {
        var t = i / 16;
        /* Widening and fading as it trails away. */
        var a = el.angle - sweep * t * (r / view.px(1)) * 0.0016;
        var rr = el.radius + (off * (1 - t * 0.4)) / view.px(1);
        var q = view.at(rr, a);
        if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
    }

    /* The world: a plain dark disc. Nothing about it is faceted, because it is
     * not broken — it is intact and about to stop being so. */
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fillStyle = style.body;
    ctx.fill();

    /* THE LEADING EDGE, where the star's material is piling up against it and
     * glowing. A crescent on the side it is moving toward — which is what says
     * this is happening rather than that a dark circle has been placed. */
    ctx.beginPath();
    ctx.arc(c.x, c.y, r * 0.94, el.angle - sweep * 1.15 - Math.PI / 2,
            el.angle - sweep * 1.15 + Math.PI / 2);
    ctx.strokeStyle = style.lit;
    ctx.lineWidth = view.lw(r > 8 ? 2.4 : 1.5);
    ctx.stroke();
  }

  /* ---- orbital-mirror ---------------------------------------------------- */

  /* A SOLAR MIRROR PANEL — a metal backing and a glass face, and the glass
   * faces the star.
   *
   * IT IS TWO RECTANGLES AND NOT A CAPSULE, which is D80 on this family for
   * the fifth or sixth time. `capsule` is a pressure HULL: rounded ends, a
   * specular band down one flank, section joins across it — every one of those
   * marks says "a vessel with people in it". A mirror is the opposite kind of
   * object. It is flat, it is thin, it has a front and a back made of
   * different materials, and the entire content of the picture is WHICH WAY IT
   * FACES. A rounded rectangle cannot say that; two flat ones sharing an edge
   * can say nothing else.
   *
   * ORIENTATION IS TOWARD THE BODY CENTRE, and it is the opposite of
   * `capsule`'s `upright`. A hull hangs along the local vertical and either
   * end may point outward, so `upright` only has to pick an AXIS. A mirror has
   * a DIRECTION: the glass is on the inward side and the metal on the outward
   * one, always, because a panel turned the other way is a panel collecting
   * nothing. So the two halves are placed by sign against the local radius
   * rather than by a flag.
   *
   * AND THE SIGN WAS WRONG. `view.at` puts angle 0 at the top of the canvas
   * and increases clockwise, so the outward radius at angle `a` is
   * (sin a, -cos a) in pixels; `ctx.rotate(a)` sends local +y to
   * (-sin a, cos a), which is INWARD. The first version's comment claimed +y
   * was outward, so every panel presented its metal backing to the star and
   * its glass to empty space. Local +y is toward the star and that is where
   * the glass goes — written out as arithmetic because it cannot be checked
   * by reading the drawing code alone, and `conedCylinder` below depends on
   * exactly the same fact.
   *
   * THE GLASS TAKES THE STAR'S COLOUR, AND THAT IS A DELIBERATE EXCEPTION TO
   * D80'S OTHER HALF — DO NOT "FIX" IT.
   *
   * `hullFill` keeps a manufactured object's colour independent of the body it
   * orbits, on purpose: industry does not belong to the star, and that
   * independence is most of what makes a built thing read as an intruder
   * rather than as part of the scenery. The metal backing still obeys that
   * rule and is drawn from exactly those tones.
   *
   * The glass does not, because the glass is not the object's own colour — it
   * is the STAR, reflected. A mirror reflecting some independent hue would be
   * a mirror pointed at something else. The exception is the whole idea of the
   * trait, so it is named here rather than left to be rediscovered as a bug:
   * see `mirrorFill` in draw/details.js, which takes the emitted colour the
   * palette publishes.
   *
   * `style` is a {hull, lit, shade, trim, glass, glow} set — see mirrorFill. */
  function orbitalMirror(ctx, view, el, style) {
    var c = view.at(el.radius, el.angle);
    var len = view.px(el.size);
    if (len < 1.2) return;
    /* `aspect` is the panel's depth relative to its span, so a low figure is a
     * wide thin sail and a high one is a stubby paddle. */
    var deep = len * (el.aspect === undefined ? 0.30 : el.aspect);

    ctx.save();
    ctx.translate(c.x, c.y);
    /* Rotating by `angle` puts local +y along the INWARD radius (see the note
     * above), so +y is toward the star — which is where the glass goes, and
     * the reason this needs no flag. */
    ctx.rotate(el.angle);

    var hx = len * 0.5;
    /* THE GLASS TAKES THE LARGER SHARE, and that is a legibility call rather
     * than an engineering one. Split evenly, the glass came out as a thin
     * bright stripe along one edge of a metal slab — it read as a racing line
     * painted on a panel rather than as the panel's working face, which is the
     * one thing the object has to say. The metal is a BACKING: it only has to
     * be visibly there, so it gets the smaller share. */
    var gy0 = deep * 0.62, my1 = -deep * 0.38;

    /* THE METAL BACKING, drawn first so the glass overlaps its edge rather
     * than butting against it — a hairline of background between the two
     * would read as two objects instead of one panel. Shaded ACROSS its span
     * with a linear gradient, the same thing that makes `capsule` read as
     * machined rather than as a painted rectangle. */
    var mg = ctx.createLinearGradient(-hx, 0, hx, 0);
    mg.addColorStop(0, style.shade);
    mg.addColorStop(0.38, style.hull);
    mg.addColorStop(0.66, style.lit);
    mg.addColorStop(1, style.shade);
    ctx.fillStyle = mg;
    ctx.fillRect(-hx, 0, hx * 2, my1);

    /* THE GLASS FACE — the star's own colour, bright and emitting. A flat
     * fill of it would read as coloured card, so it runs from the emitted
     * colour at the seam to near-white at the star-facing edge: the face is
     * catching the light, so it is brightest where it points at the source. */
    var gg = ctx.createLinearGradient(0, 0, 0, gy0);
    gg.addColorStop(0, style.glass);
    /* The near-white end is held to the star-facing THIRD rather than run all
     * the way across, so most of the face keeps the star's actual colour. Run
     * edge to edge it washed the hue out and the panel read as white. */
    gg.addColorStop(0.62, style.glass);
    gg.addColorStop(1, style.glow);
    ctx.fillStyle = gg;
    ctx.fillRect(-hx, gy0, hx * 2, -gy0);

    /* A BRIGHT LIP ALONG THE FACING EDGE. Without it the panel is a coloured
     * rectangle; with it the glass reads as catching light rather than as
     * being painted, which is the difference between a mirror and a tile.
     * It is also the only mark that survives when the panel is small, so it is
     * what keeps the trait legible at the bottom of its size band. */
    ctx.strokeStyle = style.glow;
    ctx.lineWidth = Math.max(0.6, deep * 0.16);
    ctx.beginPath();
    ctx.moveTo(-hx, gy0);
    ctx.lineTo(hx, gy0);
    ctx.stroke();

    /* A hard outline round the whole panel. Nothing else out here has one,
     * and it is a large part of why the silhouette reads as manufactured. */
    if (len > 3) {
      ctx.strokeStyle = style.trim;
      ctx.lineWidth = Math.max(0.35, len * 0.030);
      ctx.strokeRect(-hx, gy0, hx * 2, my1 - gy0);
      /* The seam between the two materials, which is what states that there
       * ARE two materials rather than one panel with a gradient on it. */
      ctx.beginPath();
      ctx.moveTo(-hx, 0);
      ctx.lineTo(hx, 0);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* ---- coned-cylinder ---------------------------------------------------- */

  /* A COLLECTOR STATION — a cone with a rounded base, tip pointed at the star.
   *
   * WHY NOT `capsule` WITH `upright`. `upright` means "along the local
   * vertical", which picks an AXIS and says nothing about which end is which —
   * a capsule is symmetric, so one pointing at the star and one pointing away
   * are the same drawing. The cone is the entire point: it gives the object a
   * DIRECTION, so a rank of these reads as a rank of things aimed at something
   * rather than as a rank of cans in orbit. That is a silhouette difference,
   * which is the test D80 sets for earning a new primitive.
   *
   * IT USED TO BE A CONE ON TOP OF A BARREL AND THAT DREW A BULLET. A cone
   * with straight parallel sides behind it is the cartridge silhouette exactly
   * — the user's word for it was "bullets" — and a bullet is a projectile,
   * which is the one thing a stationkeeping collector is not. The barrel is
   * gone: the sides now run from the tip straight out to the widest point and
   * the far end is CLOSED WITH AN ARC rather than a flat cut. A rounded base
   * reads as a vessel — a tank, a dish backing, something holding volume —
   * where a flat one reads as a shape that was cropped.
   *
   * THE TIP POINTS INWARD, AND "INWARD" IS +y IN THIS FRAME. `view.at` puts
   * angle 0 at the top of the canvas and increases clockwise, so the outward
   * radius at angle `a` is (sin a, -cos a) in pixels; `ctx.rotate(a)` sends
   * local +y to (-sin a, cos a), which is the INWARD direction. The first
   * version's comment asserted the opposite and every station faced away from
   * the star it was collecting from. Stated as arithmetic here because it is
   * not something the reader can check by looking at the code alone, and the
   * mirror above depends on the same fact.
   *
   * `style` is the same {hull, lit, shade, trim} set `capsule` takes — this is
   * the same material machined into a different object, and giving it its own
   * palette would say the two were made of different stuff. */
  function conedCylinder(ctx, view, el, style) {
    var c = view.at(el.radius, el.angle);
    var len = view.px(el.size);
    if (len < 1.2) return;
    var wide = len * (el.aspect === undefined ? 0.34 : el.aspect);

    ctx.save();
    ctx.translate(c.x, c.y);
    /* Local +y is INWARD (see the note above), so the tip goes to +y and the
     * rounded base sits behind it at -y. */
    ctx.rotate(el.angle);

    var hx = wide * 0.5;
    var tip = len * 0.5;          /* toward the star */
    var base = -len * 0.5;        /* away from it */
    /* Where the flanks stop and the rounded base takes over. The cone keeps
     * most of the length; the cap is a shallow bulge, not a hemisphere — a
     * deep one turns the silhouette back into a capsule. */
    var shoulder = base + len * 0.16;

    var g = ctx.createLinearGradient(-hx, 0, hx, 0);
    g.addColorStop(0, style.shade);
    g.addColorStop(0.34, style.hull);
    g.addColorStop(0.60, style.lit);
    g.addColorStop(1, style.shade);
    ctx.fillStyle = g;

    /* ONE PATH FOR THE WHOLE SILHOUETTE — flanks and cap together, so the
     * shading runs across both and they read as one machined object. */
    ctx.beginPath();
    ctx.moveTo(0, tip);
    ctx.lineTo(hx, shoulder);
    /* The rounded base: a quadratic through a control point beyond the end,
     * which gives a fuller curve than an arc of the same depth would. */
    ctx.quadraticCurveTo(hx, base - len * 0.10, 0, base);
    ctx.quadraticCurveTo(-hx, base - len * 0.10, -hx, shoulder);
    ctx.closePath();
    ctx.fill();

    if (len > 3) {
      ctx.strokeStyle = style.trim;
      ctx.lineWidth = Math.max(0.35, len * 0.040);
      ctx.stroke();

      /* One band across the widest part. A single cheap line, and it is what
       * turns a shaded teardrop into a piece of equipment — the same trick
       * `capsule`'s section joins play. Kept to one because the shape is now
       * short enough that two crowd it. */
      ctx.lineWidth = Math.max(0.3, len * 0.030);
      ctx.beginPath();
      ctx.moveTo(-hx * 0.94, shoulder);
      ctx.lineTo(hx * 0.94, shoulder);
      ctx.stroke();
    }

    ctx.restore();
  }

  CC.Primitives.register({
    "engulfed-world": engulfedWorld,
    "orbital-mirror": orbitalMirror,
    "coned-cylinder": conedCylinder
  });
})();
