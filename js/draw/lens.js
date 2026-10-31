/* The starfield bent round a black hole — an Einstein ring drawn from the
 * stars themselves rather than from a copy of the picture.
 *
 * WHY NOT A PIXEL REMAP. Lensing an image means reading the background back
 * (getImageData), moving every pixel inside the lens and writing it out: an
 * offscreen copy and a per-pixel loop over most of the frame, at every
 * resolution. The starfield does not need it. It is a list of points drawn in
 * frame space, so each star can be lensed exactly where it is drawn: a point
 * lens turns one star into two images on the same line through the hole,
 *
 *     theta = (beta +/- sqrt(beta^2 + 4 rE^2)) / 2
 *
 * the bright one outside the Einstein radius rE and a faint one inside it on
 * the far side. Each image keeps the star's bearing and is stretched ROUND
 * the hole by theta / beta and squeezed across by 1 / (1 + rE^2 / theta^2), so
 * a star nearly behind the hole becomes an arc and one exactly behind it
 * becomes the ring. Surface brightness is kept, so an image is drawn at the
 * star's own alpha: it grows, it does not brighten.
 *
 * ONE STAR, TWO STROKES, ALWAYS. Whether an image is a dot or an arc is
 * decided by the arithmetic, never by a branch on its size, so the number of
 * canvas calls is the same at every zoom (the DOM test's zoom op-count
 * check). The inner image of a far star lands inside the horizon, which the
 * layer pass paints over.
 *
 * Only the stars are lensed. A gradient or nebula field behind them stays
 * flat: bending that is the pixel remap this file exists to avoid.
 *
 * Load order: after draw/canvas.js, which calls `star` when its options carry
 * a lens. */

var CC = CC || {};

CC.Lens = (function () {
  "use strict";

  var TAU = Math.PI * 2;

  /* One image: an arc of the circle of radius `theta` round the lens, centred
   * on bearing `phi`, spanning the angle the star itself spans as seen from
   * the lens (its bearing is unchanged by the lens, so is its angular width),
   * as wide across as the star squeezed radially. */
  function image(ctx, L, phi, theta, beta, r) {
    var squeeze = 1 / (1 + L.r * L.r / Math.max(theta * theta, 1e-6));
    var w = Math.max(0.5, 2 * r * squeeze);
    theta = Math.max(theta, 0.01);
    /* ROUND CAPS, WITH THE ARC SHORTENED BY THEM: a round cap adds half the
     * width at each end, so an image no longer than it is wide is drawn as a
     * zero-length arc — a dot, as a far star should be — and only a stretched
     * one becomes an arc. (Butt caps drew every far star as a square.) */
    var half = Math.min(Math.PI, r / Math.max(beta, 1e-6));
    half = Math.max(0, half - (half < Math.PI ? w / 2 / theta : 0));
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(L.x, L.y, theta, phi - half, phi + half);
    ctx.stroke();
  }

  /* Draws star (x, y, radius r) as its two images. The caller has set the
   * alpha and colour; the colour is copied to the stroke here. */
  function star(ctx, L, x, y, r) {
    var dx = x - L.x, dy = y - L.y;
    var beta = Math.sqrt(dx * dx + dy * dy);
    var phi = Math.atan2(dy, dx);
    var root = Math.sqrt(beta * beta + 4 * L.r * L.r);
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineCap = "round";
    image(ctx, L, phi, (beta + root) / 2, beta, r);
    /* The inner image, on the far side: fainter as well as smaller, by its
     * magnification, since a pinpoint's brightness is its flux. */
    var inner = (root - beta) / 2;
    var a = ctx.globalAlpha;
    var u = beta / L.r, mu = (u * u + 2) / (2 * u * Math.sqrt(u * u + 4) + 1e-9) - 0.5;
    ctx.globalAlpha = a * Math.max(0, Math.min(1, mu));
    image(ctx, L, phi + Math.PI, inner, beta, r);
    ctx.globalAlpha = a;
  }

  /* THE RING ITSELF: STARS TOO FAINT TO SEE. A sparse starfield puts one
   * star, if that, close enough behind the hole to make an arc, so lensing
   * the visible stars alone bends the sky without drawing a ring. What draws
   * the ring is the real effect called magnification bias: the lens brightens
   * the sky's faint stars, the ones below the eye's threshold everywhere
   * else, into view along its rim. So a deep field of them is sampled behind
   * the lens only, out to `reach` Einstein radii, each at a faint base alpha
   * raised by its image's magnification — invisible where they are not
   * lensed, a crowd of arcs hugging the ring where they are.
   *
   * The count is fixed by the density and positions are in Einstein radii,
   * so the field is the same at every zoom and resolution. */
  function field(ctx, L, seed, density, unit) {
    var rng = CC.RNG.stream(seed === undefined ? "stars" : seed, "starfield/deep");
    var n = Math.round(320 + 720 * density), reach = 1.0;
    ctx.save();
    ctx.lineCap = "round";
    for (var i = 0; i < n; i++) {
      var beta = L.r * reach * Math.sqrt(rng()), phi = rng() * TAU;
      var r = (0.35 + 0.35 * rng()) * unit, a0 = 0.05 + 0.12 * rng();
      ctx.strokeStyle = rng() < 0.8 ? "#ffffff" : (rng() < 0.5 ? "#cfe0ff" : "#ffe9c8");
      var root = Math.sqrt(beta * beta + 4 * L.r * L.r);
      var u = beta / L.r, k = 2 * u * Math.sqrt(u * u + 4) + 1e-9;
      var muOut = (u * u + 2) / k + 0.5, muIn = muOut - 1;
      ctx.globalAlpha = Math.min(0.85, a0 * muOut);
      image(ctx, L, phi, (beta + root) / 2, beta, Math.max(0.35, r));
      ctx.globalAlpha = Math.min(0.85, a0 * muIn);
      image(ctx, L, phi + Math.PI, (root - beta) / 2, beta, Math.max(0.35, r));
    }
    ctx.restore();
  }

  return { star: star, field: field };
})();
