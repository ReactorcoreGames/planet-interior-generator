/* Stellar primitives — THE FIELD ITSELF.
 *
 * `field-lines`: the magnetic field at a coronal hole, drawn as a diagram —
 * closed loops still containing plasma at the base, open lines running out
 * above them, and the material escaping along the open ones.
 *
 * THIS FILE IS THE ONLY ONE IN draw/primitives/ WHOSE MARK IS NOT MATERIAL,
 * and that is the whole reason it is separate rather than living with the wind
 * it accompanies. Everything else drawn on a stellar limb is STUFF: plasma in
 * a loop, plasma thrown clear, metal in orbit. This is the ILLUSTRATION
 * EXPLAINING A MECHANISM — the register the mantle's flow arrows and the
 * convection swirls are in, which the star family had never used.
 *
 * That distinction is load-bearing rather than tidy. Three earlier versions of
 * the coronal hole competed with the prominences and flares on their own terms
 * — a darker wedge, a deeper absence, a brighter ray — and lost every time,
 * because a limb that already carries those marks cannot be won on brightness.
 * A mark in a different register does not have to win: it is not in the same
 * contest. See the note on `fieldLines` for the full history, and `fieldFill`
 * in draw/details.js for why this is also the one stellar mark allowed its own
 * hue.
 *
 * THE SAME RULES APPLY AS EVERYWHERE IN draw/. No role names, no archetype
 * names, one signature, pixels only through `view`.
 *
 * draw/primitives.js must load first. */

var CC = CC || {};

(function () {
  "use strict";

  /* ---- field-lines ------------------------------------------------------- */

  /* THE MAGNETIC FIELD AT A CORONAL HOLE — closed loops still holding plasma
   * down at the base, open lines running to infinity above them, and the
   * material escaping along the open ones.
   *
   * ---- WHY THIS MARK EXISTS, WHICH IS A DESIGN DECISION AND NOT A DETAIL --
   *
   * The coronal hole went through three versions and the first two failed for
   * the same reason in different ways.
   *
   *   1. A dark `wedge` over the corona. Flat, hard-edged, "a slice of pie" —
   *      and it could not have been softened, because the corona composites
   *      with `screen` and dark paint under `screen` is nearly a no-op.
   *   2. An ABSENCE: thin the corona's own plumes across a sector. Physically
   *      exact, and it is still what the trait does. On its own it was
   *      invisible — an absence is legible only against a baseline the eye can
   *      measure, and a plume field is irregular by construction, so a gap in
   *      it reads as ordinary variation.
   *   3. The wind (`openField` above): straight rays where the corona thinned.
   *      Visible at last, and still "tame" — because it was one more bright
   *      thing on a limb that already has prominences and flares on it,
   *      competing on the same terms as marks that were already working.
   *
   * THE ANSWER WAS NOT A BETTER SHAPE. It was a different REGISTER.
   *
   * Everything else on a stellar limb is MATERIAL: plasma in a loop, plasma
   * thrown clear, metal in orbit. This is the illustration explaining a
   * MECHANISM — the same register as the mantle's flow arrows and the
   * convection swirls, which the star family had never used. A mark in a
   * different register cannot be beaten by a brighter mark in the first one,
   * which is why this succeeds where three rounds of tuning did not. D76's
   * lesson at the level of the whole picture rather than of one silhouette.
   *
   * ---- WHAT IT DRAWS, AND WHY EACH PART IS THERE -------------------------
   *
   * A coronal hole is where field lines stop looping back. Closed field holds
   * plasma down; open field lets it leave, and it leaves FAST — roughly twice
   * the ordinary wind. The region reads dark in X-ray precisely because the
   * material did not stay to glow. So the mark states a contrast:
   *
   *   THE CLOSED MESH, at the base: arcs spanning the mouth, still containing.
   *     Dense on purpose. The contrast between contained and escaping IS the
   *     idea, and a couple of token arcs state it too quietly to survive on a
   *     limb this busy.
   *   THE OPEN LINES, above and through it: diverging, whipping moderately,
   *     running out past the corona's ceiling.
   *   THE PARTICLE JET, along the open lines: many small specks streaming out.
   *
   * THE JET IS WHERE THE DRAMA LIVES, AND THAT IS THE HONEST CHOICE. Real open
   * field lines are calm — nearly straight, gently diverging; the violence is
   * in what travels along them, not in the geometry. Drawing them as lightning
   * would have been a lie AND a worse picture, because a limb of jagged bolts
   * is one more kind of chaos next to the flares. Many small fast particles is
   * both what is actually happening and the thing that says "this sector is
   * hazardous" — and it is the density thesis rather than a few loud strokes.
   *
   * `el.half` is the sector's half-width, set in gen/traitroll.js when the
   * hole is rolled: the field opens across the whole hole, so the mark has to
   * know how wide the hole is. `style` is the {glow, line, core, dim} set —
   * see `fieldFill` in draw/details.js, and read its note before touching the
   * colour, which is a deliberate exception to D123. */
  function fieldLines(ctx, view, el, style) {
    var reach = el.length || el.size;
    if (!(reach > 0)) return;
    if (view.px(reach) < 2) return;

    var r0 = el.radius;
    var a0 = el.angle;
    var half = el.half === undefined ? 0.28 : el.half;
    var glow = (style && style.glow) || style;
    var line = (style && style.line) || style;
    var core = (style && style.core) || style;

    var sd = (el.seed === undefined ? 0.5 : el.seed);
    function jit(i) {
      return 0.5 * (Math.sin((sd * 12.9898 + i * 4.1) * 7.233)
                  + Math.sin((sd * 5.331 + i * 2.7) * 3.117));
    }

    /* A STROKE DRAWN THREE TIMES AT THREE WIDTHS — wide dim glow, the line,
     * then a hot near-white centre. This is the whole of what makes the mark
     * read as ELECTRIFIED rather than as ink, and it is why the shape itself
     * can stay calm and diagrammatic: the charge is in the TEXTURE, not in the
     * geometry. The same idea the prominence's two passes use, with one more
     * pass because a field line is thinner and needs the extra separation. */
    function energised(path, w) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = glow;
      ctx.lineWidth = view.lw(w * 3.4);
      path();
      ctx.stroke();
      ctx.strokeStyle = line;
      ctx.lineWidth = view.lw(w * 1.5);
      path();
      ctx.stroke();
      ctx.strokeStyle = core;
      ctx.lineWidth = view.lw(w * 0.55);
      path();
      ctx.stroke();
    }

    /* THE SAME THREE-PASS STROKE, BUT FADING OUT ALONG ITS LENGTH.
     *
     * An open field line does not have a far end — it runs until the field
     * runs out, which is past the edge of any picture of it. Drawn at constant
     * alpha it therefore has to STOP somewhere, and a stroke that stops has a
     * visible tip: a row of them ends on a common line and the whole mark
     * reads as a fringe. That is the same fault the flare's flat top was, and
     * it takes the same fix.
     *
     * `at(t)` returns the point at parameter t, so this walks the curve in
     * short segments and drops the alpha as it goes. One `globalAlpha` per
     * segment rather than a gradient, because the line leans and curves — a
     * linear gradient in screen space would fade along the wrong axis for any
     * line not pointing straight out (the lesson from `flare`'s ribbon, which
     * had exactly this problem).
     *
     * The alpha reaches zero AT the end rather than approaching it: a decaying
     * curve that merely tends to nothing still terminates at a visible value,
     * which is how the flare kept its flat top through the first attempt at
     * fixing it. */
    function energisedFade(at, w, steps) {
      var i, a, p0, p1, u;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (i = 0; i < steps; i++) {
        u = (i + 0.5) / steps;
        /* Coherent well out, then dissolving — the shoulder is held late on
         * purpose, because a line that starts fading immediately never reads
         * as having gone anywhere. Still pinned to zero at the end so there is
         * no visible tip. */
        a = (1 - u * u * u) * (1 - u);
        if (a < 0.006) continue;
        p0 = at(i / steps);
        p1 = at((i + 1) / steps);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.globalAlpha = a * 0.85;
        ctx.strokeStyle = glow;
        ctx.lineWidth = view.lw(w * 3.4);
        ctx.stroke();
        ctx.globalAlpha = a;
        ctx.strokeStyle = line;
        ctx.lineWidth = view.lw(w * 1.5);
        ctx.stroke();
        ctx.strokeStyle = core;
        ctx.lineWidth = view.lw(w * 0.55);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    /* ---- THE DOME -------------------------------------------------------
     *
     * A LOW WIREFRAME CAGE over the mouth of the hole — arcs crossing each
     * other rather than standing beside each other.
     *
     * IT WAS A ROW OF SEPARATE ARCHES AND THAT IS WHY IT READ AS HAIR. Each
     * loop spanned its own patch of limb and none of them touched, so at any
     * size below "very close up" the set merged into a band of fuzz along the
     * surface — a texture rather than a structure, and texture at the base of
     * a set of rising lines is exactly the thing that says "grass".
     *
     * A cage is the opposite: the arcs OVERLAP, so the eye reads the crossings
     * as a surface and the whole thing as one object with a shape. That is
     * also what a closed magnetic field actually looks like in any textbook
     * diagram of a coronal hole — a low dome of field lines that have looped
     * back, with the open ones escaping through it.
     *
     * Two families of arc, and the crossing between them is the entire point:
     *   - SPANNING arcs, rooted at two points across the mouth, like the old
     *     ones but wider so they overlap their neighbours.
     *   - RIB arcs, running the other way: shorter, steeper, rooted close
     *     together, which is what turns a row of arches into a lattice.
     *
     * Kept LOW — a fifth of the reach — because the dome is the floor that the
     * escaping lines rise out of, and a tall dome competes with them instead
     * of launching them. */
    var domeTop = reach * 0.20;

    /* The whole cage is drawn translucent — see the note on the arc weight
     * below. Set before the two loops and cleared after them, so the escaping
     * lines and the particles are unaffected. */
    var DOME_ALPHA = 0.62;

    /* The spanning arcs. Deliberately wide enough that each one overlaps the
     * next: a gap between neighbours is what made the old version a row. */
    /* FEWER, BECAUSE ONE CLEAR CAGE BEATS A THICKET.
     *
     * At five to eight spanning arcs plus four to seven ribs the dome had
     * fifteen-odd strokes crossing inside one sector, and the crossings — the
     * thing that was supposed to make it read as a wireframe — turned into a
     * mat instead. A wireframe is legible because you can follow each strand;
     * past a certain count you cannot, and it becomes shading.
     *
     * Three or four arcs against three ribs gives roughly a dozen crossings
     * over the mouth, which is enough to read as a woven surface and few
     * enough to read as individual lines. */
    var arcs = 3 + Math.round(Math.abs(jit(3)) * 2);
    ctx.globalAlpha = DOME_ALPHA;
    var mkArc = function (mid, wide, top) {
      return function () {
        ctx.beginPath();
        for (var i = 0; i <= 16; i++) {
          var t = i / 16;
          var arch = Math.sin(t * Math.PI);
          var p = view.at(r0 + top * arch, mid + (t - 0.5) * 2 * wide);
          if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
      };
    };
    for (var m = 0; m < arcs; m++) {
      var mf = ((m + 0.5) / arcs) * 2 - 1;
      /* Lower and flatter toward the middle of the hole, where the field is
       * most nearly open — the dome sags where the wind is getting out, which
       * is the gradient that makes it a hole rather than a lid. */
      var openness = 1 - Math.abs(mf);
      var wide = half * (0.52 - 0.20 * openness)
                      * (0.8 + 0.4 * Math.abs(jit(m + 7)));
      var top = domeTop * (0.45 + 0.75 * (1 - openness))
                        * (0.85 + 0.3 * Math.abs(jit(m + 13)));
      /* THINNER AND FAINTER THAN THE ESCAPING LINES. The dome is what the
       * escape is measured against, which makes it context rather than
       * subject: drawn at the same weight it competed with the lines it was
       * supposed to be launching. `domeAlpha` is applied around both loops
       * below — the whole cage is translucent, so its crossings read as a
       * surface seen through rather than as a stack of opaque strokes. */
      energised(mkArc(a0 + mf * half * 0.80, wide, top), 0.38);
    }

    /* THE RIBS — the other half of the lattice. Rooted close together and
     * rising steeply, so they cut ACROSS the spanning arcs above rather than
     * lying alongside them. Without these the dome is a set of parallel
     * hoops; with them it is a wireframe. */
    var ribs = 2 + Math.round(Math.abs(jit(17)) * 2);
    for (var rb = 0; rb < ribs; rb++) {
      var rf = ((rb + 0.5) / ribs) * 2 - 1 + jit(rb + 23) * 0.14;
      var rTop = domeTop * (0.75 + 0.5 * Math.abs(jit(rb + 29)));
      var rWide = half * 0.16 * (0.7 + 0.6 * Math.abs(jit(rb + 37)));
      energised(mkArc(a0 + rf * half * 0.72, rWide, rTop), 0.32);
    }
    ctx.globalAlpha = 1;

    /* ---- THE ESCAPING LINES ---------------------------------------------
     *
     * THREE TO SEVEN OF THEM, and they go a very long way.
     *
     * These are the field lines that did not close — the ones the dome above
     * failed to hold. Everything about them is the opposite of the dome: few
     * rather than many, long rather than low, and leaving rather than
     * returning. That contrast is the whole feature.
     *
     * HOW FAR: they fade out around the orbital mirrors' band, which sits at
     * 1.34-1.62 body radii (see ORBITAL_MIRRORS in data/traits/stellar-built).
     * Tying the reach to a real landmark in the picture rather than to a bare
     * number is what makes the scale read — a line that dies among the orbital
     * infrastructure has visibly crossed the whole system, where one that
     * stops at an arbitrary radius has merely stopped.
     *
     * They are also the reason this trait declares `escapes`. Clipped to the
     * body's extent they were chopped flat at the halo's edge, which is a wall
     * where the picture needs a departure. */
    var opens = 3 + Math.round(Math.abs(jit(2)) * 4);
    /* HOW FAR THE LONGEST LINE ACTUALLY GOT. Measured rather than assumed,
     * because the particles have to overrun the lines by a set proportion and
     * the lines' own reach is a roll — a constant here would drift out of
     * agreement with them the moment either was retuned. */
    var farthest = 0;
    var mkOpenAt = function (kf, lenK, wobA, k) {
      return function (t) {
        /* Barely diverging. A field is legible because its lines are
         * parallel; a strong splay reads as a spray, which is the flare's
         * silhouette and the one thing this must not be mistaken for. */
        var spread = kf * half * (0.92 + 0.14 * t);
        /* A long, loose wander rather than a whip. Low frequencies only, so
         * the line meanders over its whole length the way the sketch shows
         * instead of vibrating — a high-frequency wobble at this length reads
         * as lightning, which was tried and rejected. */
        var whip = (Math.sin(t * 1.9 + k * 2.7 + sd * 9.4) * 0.66
                  + Math.sin(t * 3.7 + k * 5.3 + sd * 4.1) * 0.34)
                  * wobA * t;
        return view.at(r0 + lenK * t, a0 + spread + whip);
      };
    };
    for (var k = 0; k < opens; k++) {
      var kf = (opens === 1 ? 0 : (k / (opens - 1)) * 2 - 1) + jit(k + 21) * 0.16;
      /* WHERE THIS ONE DIES, as an absolute radius rather than a multiple of
       * the mark's own size: scattered through and a little past the mirror
       * band, so the set fades out raggedly across it instead of all together.
       * `- r0` because the line is drawn as a length from its footpoint. */
      /* HALVED, ON THE USER'S CALL. The band was 1.30-1.85 body radii — out
       * among and past the orbital mirrors — and at that length the lines
       * dominated the frame and left the star looking small behind them. The
       * reach still crosses the corona and dies around the inner edge of the
       * mirror band, which keeps the "it has left the star" reading; it simply
       * no longer crosses the whole picture to say it.
       *
       * Kept as an absolute radius rather than a multiple of the mark's own
       * size, so where a line dies means something in the picture — see the
       * note above. `farthest` is reused by the particles below, which must
       * outrun the lines by a fixed proportion. */
      /* DOUBLED, ON THE USER'S CALL. Halving to 1.15-1.43 read as too short
       * once seen beside the shortened wind rays; doubling the reach ABOVE the
       * surface (rather than the raw figure) puts the band at 1.30-1.86, which
       * is back near the original length but now independent of it — this is
       * a fresh instruction, not a reversion. */
      var far = 1.0 + 2 * (0.15 + 0.28 * Math.abs(jit(k + 31)));
      if (far > farthest) farthest = far;
      var lenK = Math.max(reach * 0.35, far - r0);
      var wobA = 0.30 + 0.26 * Math.abs(jit(k + 41));
      /* Thinner the further it goes — a line that has travelled that far has
       * spread out, and one drawn at full weight out at the mirrors would read
       * as a foreground object rather than as the far end of this field. */
      var thin = 1 - 0.45 * Math.min(1, (far - 1.05) / 0.4);
      energisedFade(mkOpenAt(kf, lenK, wobA, k), 1.7 * thin, 26);
    }

    /* ---- THE PARTICLES --------------------------------------------------
     *
     * ROUND DOTS, forty to eighty of them, travelling twice as far as the
     * mirrors orbit.
     *
     * THEY WERE SHORT STREAKS AND DOTS ARE BETTER, which is worth stating
     * because streaks are the more obvious choice: a streak shows direction,
     * and direction is what "escaping" is about. But every other mark on this
     * limb is already a stroke — the corona's plumes, the prominence strands,
     * the flare ribbons, and now the field lines themselves — so more strokes
     * joined the texture instead of standing out from it. A round dot is the
     * one mark shape nothing else out here uses, and a field of them reads
     * instantly as PARTICLES rather than as more line work.
     *
     * The direction is carried by the lines they ride, which is where it
     * belongs: the dots do not each have to state it individually.
     *
     * THEY GO TWICE AS FAR AS THE LINES DO. The lines fade out around the
     * mirror band because a drawn line must stop somewhere; the material does
     * not stop, and saying so is the entire hazard the trait exists to state.
     * So the dots continue past the last of the field lines, out to roughly
     * twice the mirrors' orbit, and off the frame. Nothing else in the
     * generator deliberately leaves the picture — see `escapes` on the trait.
     *
     * Drawn as a soft radial gradient rather than a hard disc: a flat circle
     * at this size reads as a drawn dot, and these are meant to be glowing
     * plasma. The same reasoning as the flare's footpoint. */
    var motes = 40 + Math.round(Math.abs(jit(5)) * 40);
    for (var q = 0; q < motes; q++) {
      /* Spread along the whole flight, slightly biased outward so the stream
       * does not pile up at the base where the dome already is. The golden
       * ratio spaces them without a repeating pattern (D117). */
      /* EVENLY ALONG THE WHOLE FLIGHT, FROM THE SURFACE OUT.
       *
       * The power biased them outward, which left the stretch between the dome
       * and the mid-corona nearly bare — the dots appeared to start some way
       * above the star rather than to come out of it, and the base of the jet
       * is where a stream is densest in any real picture of one. Linear now:
       * the wind is continuous, so the dots should be too. */
      var t = (q * 0.6180339887 + Math.abs(jit(q + 61))) % 1;
      /* Across the mouth, spreading with height exactly as the lines do, so a
       * dot sits ON a field line rather than beside the set. */
      var mq = jit(q + 71) * 2;
      if (mq > 1) mq = 1; else if (mq < -1) mq = -1;
      var aq = a0 + mq * half * (0.92 + 0.14 * t)
                  + Math.sin(t * 1.9 + q * 0.7 + sd * 9.4) * 0.30 * half * t;
      /* TWICE THE MIRRORS' ORBIT at the far end, in absolute body radii so the
       * distance means something in the picture rather than in the mark. */
      /* THIRTY PER CENT PAST THE LONGEST LINE, MEASURED FROM THE LINES
       * THEMSELVES.
       *
       * It was a flat 3.1 body radii — roughly twice the mirrors' orbit — and
       * the stream scattered so far into empty space that the far dots read as
       * stray specks on the starfield rather than as this star's wind. The
       * distance also stopped meaning anything once the lines were shortened,
       * because the two numbers were unrelated: a constant cannot follow a
       * roll.
       *
       * Tying it to `farthest` keeps the relationship the picture is actually
       * making — the material outruns the field lines and keeps going — at
       * whatever length those lines happen to be. The dots die a little past
       * the last of them, which is close enough to read as the same stream and
       * far enough to say it did not stop where the drawing did. */
      /* The floor matters: if the line loop drew nothing, `farthest` is 0 and
       * every dot would collapse onto the surface — a pile of specks on the
       * limb rather than a jet. */
      var rq = r0 + (Math.max(farthest, r0 + reach * 0.5) * 1.30 - r0) * t;

      /* Fading very gently: the wind does not slow, it SPREADS, so a dot far
       * out is dimmer because there is less of it per unit sky. A steep curve
       * here would undo the long travel by making everything past the corona
       * invisible. */
      var fade = (1 - t * 0.55) * (1 - t * t * 0.30);
      if (fade < 0.02) continue;

      /* Smaller further out, but never to nothing — a dot that shrinks below a
       * pixel simply vanishes, and the far ones are the whole point. */
      /* SIZED AGAINST THE BODY, NOT AGAINST THE MARK. `reach` is the field's
       * own length and varies with the roll, so sizing the dots from it made
       * them shrink whenever the mark was modest — and the far ones, which are
       * the whole point of the long flight, are exactly the ones that could
       * least afford it. A particle is a particle at any hole size.
       *
       * They shrink only mildly with distance: enough to read as perspective,
       * far short of vanishing. A dot under a pixel is not a faint dot, it is
       * no dot, and this stream has to survive all the way out. */
      var rad = view.px(0.008 + 0.0065 * Math.abs(jit(q + 83)))
                * (1 - 0.28 * t);
      if (rad < 0.7) rad = 0.7;

      var pq = view.at(rq, aq);
      var pg = ctx.createRadialGradient(pq.x, pq.y, 0, pq.x, pq.y, rad);
      /* A hot centre on every dot rather than on one in three. These are the
       * brightest thing the trait draws and they are competing with a corona;
       * a dot whose centre is only `line` reads as a smudge. */
      pg.addColorStop(0, core);
      pg.addColorStop(0.35, (q % 3 === 0) ? core : line);
      pg.addColorStop(1, (style && style.dim) || line);
      ctx.globalAlpha = fade;
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(pq.x, pq.y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  CC.Primitives.register({
    /* Annotation rather than stuff — the one mark of its kind on this limb. */
    "field-lines": fieldLines
  });
})();
