/* The shared rendering engine: perturbed concentric layers plus declared
 * effects. Every body type flows through this one function. */

import { TAU, clamp, lerp, rrange } from "../core/math.js";
import { rgba, shadeHex } from "../core/color.js";
import { makeNoise2D, mulberry32 } from "../core/rng.js";
import { drawFeatureMarkers } from "./features.js";

export function layerRadius(theta, baseR, layer, noise, seedOff) {
  if (!layer.wobbleAmp && !layer.noiseAmp) return baseR; // vector style: true circle
  const s = layer.noiseScale;
  const n = noise.fbm(Math.cos(theta) * s + seedOff * 7.3, Math.sin(theta) * s + seedOff * 3.1, 3);
  return baseR * (1 +
    layer.wobbleAmp * Math.sin(layer.wobbleFreq * theta + seedOff * 2.4) +
    layer.noiseAmp * (n - 0.5) * 2);
}

export function traceLayerPath(ctx, cx, cy, baseR, layer, noise, seedOff, steps = 200) {
  ctx.beginPath();
  // A perfect circle needs no polygonal approximation, and arc() gives a
  // genuinely smooth edge at any export resolution.
  if (!layer.wobbleAmp && !layer.noiseAmp) {
    ctx.arc(cx, cy, baseR, 0, TAU);
    ctx.closePath();
    return;
  }
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * TAU;
    const r = layerRadius(th, baseR, layer, noise, seedOff);
    const x = cx + Math.cos(th) * r;
    const y = cy + Math.sin(th) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawRing(ctx, cx, cy, R, ring, half) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ring.tilt);
  const big = R * 4;
  ctx.beginPath();
  if (half === "back") ctx.rect(-big, -big, big * 2, big);
  else ctx.rect(-big, 0, big * 2, big);
  ctx.clip();
  const bands = 2 + ring.gaps;
  for (let b = 0; b < bands; b++) {
    const t0 = b / bands, t1 = (b + 0.72) / bands;
    const rIn = lerp(ring.rIn, ring.rOut, t0) * R;
    const rOut = lerp(ring.rIn, ring.rOut, t1) * R;
    ctx.beginPath();
    ctx.ellipse(0, 0, rOut, rOut * ring.squash, 0, 0, TAU);
    ctx.ellipse(0, 0, rIn, rIn * ring.squash, 0, 0, TAU, true);
    ctx.fillStyle = rgba(ring.color, ring.alpha * (0.55 + 0.45 * (1 - b / bands)));
    ctx.fill("evenodd");
  }
  ctx.restore();
}

function drawGlow(ctx, cx, cy, r0, r1, color, alpha, composite) {
  ctx.save();
  if (composite) ctx.globalCompositeOperation = composite;
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.6, rgba(color, alpha * 0.35));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* ============================================================
 * Flares — rewritten.
 *
 * The old version stroked two fixed-width quadratic curves, which produced
 * thin, hard-edged hairpins that read as scribble rather than plasma. This
 * builds each flare as a tapered ribbon: a filled polygon whose half-width
 * follows a curve (narrow at the footpoint, widest at mid-arch, tapering to
 * nothing at the tip), drawn several times at increasing width and falling
 * alpha to fake a volumetric soft edge. A bright thin core is laid inside
 * the widest passes so the flare still has definition.
 * ============================================================ */

/* Centerline of one prominence loop.
 *
 * Built in a local frame anchored to the limb — "up" is radially outward from
 * the star's centre, "across" is tangential — rather than in polar
 * coordinates. Sweeping a polar angle across the loop drags it sideways
 * around the limb (it reads as a ribbon orbiting the star), and easing that
 * sweep instead curls the ends inward into a lasso. In a local frame the arch
 * is just a simple parabola-like curve: across goes -1 → +1 while up follows
 * a sine bump, which is exactly the shape of a real magnetic loop. */
function flarePath(cx, cy, base, aMid, halfSep, len, arch, segs) {
  // Unit vectors of the local frame at the loop's midpoint.
  const ux = Math.cos(aMid), uy = Math.sin(aMid);          // radially outward
  const tx = -uy, ty = ux;                                  // tangential

  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const across = (t * 2 - 1) * halfSep;                   // -halfSep .. +halfSep
    // Slight flattening at the apex so it reads as an arch, not a spike.
    const up = Math.pow(Math.sin(t * Math.PI), 0.8) * len * arch;
    const x = cx + ux * base + ux * up + tx * across;
    const y = cy + uy * base + uy * up + ty * across;
    pts.push([x, y, t]);
  }
  return pts;
}

function ribbonPath(ctx, pts, halfWidth) {
  // Build a closed polygon by offsetting the centerline perpendicular to its
  // local direction, out along one side and back along the other.
  const n = pts.length;
  const norms = [];
  for (let i = 0; i < n; i++) {
    const p = pts[Math.max(0, i - 1)], q = pts[Math.min(n - 1, i + 1)];
    let dx = q[0] - p[0], dy = q[1] - p[1];
    const m = Math.hypot(dx, dy) || 1;
    norms.push([-dy / m, dx / m]);
  }
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const [x, y, t] = pts[i];
    // Taper: zero at the footpoint, full at ~40% along, zero at the tip.
    const w = halfWidth * Math.sin(Math.pow(t, 0.65) * Math.PI);
    const [nx, ny] = norms[i];
    const px = x + nx * w, py = y + ny * w;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  for (let i = n - 1; i >= 0; i--) {
    const [x, y, t] = pts[i];
    const w = halfWidth * Math.sin(Math.pow(t, 0.65) * Math.PI);
    const [nx, ny] = norms[i];
    ctx.lineTo(x - nx * w, y - ny * w);
  }
  ctx.closePath();
}

function drawFlares(ctx, cx, cy, R, flares, rng, glowComp, alphaScale = 1) {
  ctx.save();
  if (glowComp) ctx.globalCompositeOperation = glowComp;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (let i = 0; i < flares.count; i++) {
    // Where on the limb the loop is anchored, and how far apart its two
    // footpoints sit (as a distance, not an angle — see flarePath).
    const aMid = rng() * TAU;
    const halfSep = R * rrange(rng, 0.10, 0.24);
    const len = R * flares.len * rrange(rng, 0.85, 1.3);
    const base = R * 0.94;
    const arch = rrange(rng, 0.9, 1.2);
    const pts = flarePath(cx, cy, base, aMid, halfSep, len, arch, 44);

    // Width scales with the flare's own length so big flares look massive
    // rather than merely long, with a floor tied to the body radius so they
    // never thin out to a hairline at small render sizes.
    const coreW = Math.max(2.6, R * 0.030 + len * 0.075);

    const A = a => Math.min(1, a * alphaScale);

    if (flares.crisp) {
      // Vector style: a clean tapered shape with one soft halo, no fuzz.
      ribbonPath(ctx, pts, coreW * 1.5);
      ctx.fillStyle = rgba(flares.color, A(0.20));
      ctx.fill();
      ribbonPath(ctx, pts, coreW * 0.75);
      ctx.fillStyle = rgba(flares.color, A(0.85));
      ctx.fill();
      continue;
    }

    // Soft build-up: several increasingly wide, increasingly faint passes.
    // Together they approximate a volumetric glow with no blur filter.
    const passes = [
      { w: 5.2, a: 0.055 },
      { w: 3.4, a: 0.085 },
      { w: 2.2, a: 0.13 },
      { w: 1.45, a: 0.20 },
      { w: 1.0, a: 0.30 }
    ];
    for (const p of passes) {
      ribbonPath(ctx, pts, coreW * p.w);
      ctx.fillStyle = rgba(flares.color, A(p.a));
      ctx.fill();
    }

    // Bright inner filament, kept thin so the soft mass around it reads.
    ribbonPath(ctx, pts, coreW * 0.42);
    ctx.fillStyle = rgba(shadeHex(flares.color, 0.35), A(0.75));
    ctx.fill();

    // A warm bloom pooled at the footpoint, where plasma is densest.
    const [fx0, fy0] = pts[0];
    const fg = ctx.createRadialGradient(fx0, fy0, 0, fx0, fy0, coreW * 4.5);
    fg.addColorStop(0, rgba(flares.color, A(0.5)));
    fg.addColorStop(1, rgba(flares.color, 0));
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(fx0, fy0, coreW * 4.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/* ============================================================
 * Layer textures
 * ============================================================ */

function drawTexture(ctx, cx, cy, layerR, innerR, layer, noise, seedOff, rng) {
  const tx = layer.texture;
  if (!tx) return;
  const strength = tx.strength == null ? 1 : tx.strength;
  ctx.save();
  traceLayerPath(ctx, cx, cy, layerR, layer, noise, seedOff);
  ctx.clip();

  if (tx.type === "glowcore") {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, layerR);
    g.addColorStop(0, rgba(tx.color, tx.strong ? 1 : 0.9));
    g.addColorStop(0.5, rgba(tx.color, tx.strong ? 0.7 : 0.35));
    g.addColorStop(1, rgba(tx.color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx - layerR, cy - layerR, layerR * 2, layerR * 2);
    if (tx.strong && !tx.flat) {
      ctx.globalAlpha = 0.35 * strength;
      ctx.strokeStyle = rgba(tx.color, 0.8);
      ctx.lineWidth = Math.max(1, layerR * 0.02);
      const spokes = 9;
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * TAU + rng() * 0.4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * layerR * 0.15, cy + Math.sin(a) * layerR * 0.15);
        const midA = a + rrange(rng, -0.3, 0.3);
        ctx.quadraticCurveTo(
          cx + Math.cos(midA) * layerR * 0.55, cy + Math.sin(midA) * layerR * 0.55,
          cx + Math.cos(a + rrange(rng, -0.5, 0.5)) * layerR * 0.9,
          cy + Math.sin(a + rrange(rng, -0.5, 0.5)) * layerR * 0.9);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  else if (tx.type === "bands") {
    ctx.lineWidth = Math.max(1, (layerR - innerR) * 0.08);
    for (let b = 1; b <= tx.count; b++) {
      const r = lerp(innerR, layerR, b / (tx.count + 1));
      ctx.strokeStyle = rgba(tx.color, 0.5 * strength);
      traceLayerPath(ctx, cx, cy, r, layer, noise, seedOff + b * 0.37, 140);
      ctx.stroke();
    }
  }

  else if (tx.type === "speckle") {
    const n = Math.floor(120 * tx.density);
    ctx.fillStyle = rgba(tx.color, 0.5 * strength);
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU;
      const rr = lerp(innerR, layerR, rng());
      const s = Math.max(0.7, layerR * 0.008 * (0.5 + rng()));
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, s, 0, TAU);
      ctx.fill();
    }
  }

  else if (tx.type === "swirlbands") {
    const thick = Math.max(1, (layerR - innerR) * 0.10);
    for (let b = 0; b < tx.count; b++) {
      const r = lerp(innerR + thick, layerR - thick, (b + 0.5) / tx.count);
      const a0 = rng() * TAU;
      const span = rrange(rng, 1.2, 3.4);
      ctx.strokeStyle = rgba(tx.color, rrange(rng, 0.25, 0.5) * strength);
      ctx.lineWidth = thick * rrange(rng, 0.5, 1.1);
      ctx.lineCap = "round";
      ctx.beginPath();
      const segs = 40;
      for (let s = 0; s <= segs; s++) {
        const th = a0 + (s / segs) * span;
        const wobR = r * (1 + 0.04 * Math.sin(th * 3 + b) +
          0.03 * (noise.fbm(Math.cos(th) * 2 + b, Math.sin(th) * 2 + seedOff, 2) - 0.5) * 2);
        const x = cx + Math.cos(th) * wobR, y = cy + Math.sin(th) * wobR;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (tx.curl && rng() < 0.5) {
        const th = a0 + span;
        const px = cx + Math.cos(th) * r, py = cy + Math.sin(th) * r;
        ctx.beginPath();
        ctx.arc(px, py, thick * 1.4, th, th + 4.2);
        ctx.stroke();
      }
    }
  }

  else if (tx.type === "plasma") {
    ctx.lineCap = "round";
    for (let i = 0; i < tx.count; i++) {
      const a = rng() * TAU;
      const rr = lerp(innerR, layerR, rng());
      const bright = rng() < 0.6;
      ctx.strokeStyle = rgba(bright ? tx.color : tx.dark, rrange(rng, 0.3, 0.6) * strength);
      ctx.lineWidth = Math.max(1, layerR * rrange(rng, 0.008, 0.02));
      ctx.beginPath();
      const span = rrange(rng, 0.25, 0.8);
      const segs = 12;
      for (let s = 0; s <= segs; s++) {
        const th = a + (s / segs) * span;
        const jr = rr * (1 + 0.06 * (noise.fbm(Math.cos(th) * 4 + i, Math.sin(th) * 4 + seedOff, 2) - 0.5) * 2);
        const x = cx + Math.cos(th) * jr, y = cy + Math.sin(th) * jr;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  else if (tx.type === "wisps") {
    ctx.lineCap = "round";
    for (let i = 0; i < tx.count; i++) {
      const a = rng() * TAU;
      const rr = lerp(innerR, layerR, rng());
      ctx.strokeStyle = rgba(rng() < 0.5 ? tx.color : tx.dark, rrange(rng, 0.15, 0.35) * strength);
      ctx.lineWidth = Math.max(1, layerR * rrange(rng, 0.006, 0.016));
      ctx.beginPath();
      const span = rrange(rng, 0.6, 1.8);
      const drift = rrange(rng, -0.12, 0.12) * layerR;
      const segs = 20;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const th = a + t * span;
        const jr = rr + drift * Math.sin(t * Math.PI) +
          layerR * 0.05 * (noise.fbm(Math.cos(th) * 2.5 + i * 2, Math.sin(th) * 2.5 + seedOff, 2) - 0.5) * 2;
        const x = cx + Math.cos(th) * jr, y = cy + Math.sin(th) * jr;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  ctx.restore();
}

/* ============================================================
 * Whole-body draw
 * ============================================================ */

export function drawBody(ctx, cx, cy, R, profile, seedNum, opts = {}) {
  const noise = makeNoise2D(seedNum ^ 0x9e3779b9);
  const rng = mulberry32(seedNum ^ 0x51ab3f);
  const fx = profile.effects;
  // Additive blending reads correctly over a dark backdrop but turns a soft
  // radial gradient into a flat opaque disc over transparency, so the big
  // volumetric glows (corona, haze) fall back to source-over and are damped.
  //
  // Flares are exempt: they are bounded tapered shapes rather than full-disc
  // gradients, so they composite cleanly onto alpha. Damping them was making
  // them almost invisible in the transparent 1:1 export, which is the export
  // most likely to be composited over a bright background.
  const glowComp = opts.transparent ? null : "lighter";
  const glowScale = opts.transparent ? 0.55 : 1;
  const flareScale = opts.transparent ? 1.35 : 1;

  if (fx.corona) {
    drawGlow(ctx, cx, cy, R * 0.85, R * fx.corona.outer, fx.corona.color, fx.corona.alpha * glowScale, glowComp);
    drawGlow(ctx, cx, cy, R * 0.5, R * (fx.corona.outer + 0.08), fx.corona.color, fx.corona.alpha * 0.4 * glowScale, glowComp);
  }
  if (fx.haze) {
    drawGlow(ctx, cx, cy, R * 0.92, R * fx.haze.outer, fx.haze.color, fx.haze.alpha * glowScale);
  }
  if (fx.ring) drawRing(ctx, cx, cy, R, fx.ring, "back");

  // Flares sit under the disc so they appear to emerge from the limb.
  if (fx.flares) drawFlares(ctx, cx, cy, R, fx.flares, rng, glowComp, flareScale);

  // Concentric layers, outermost first; inner layers paint over outer ones.
  const n = profile.layers.length;
  for (let i = 0; i < n; i++) {
    const layer = profile.layers[i];
    const layerR = R * layer.frac;
    const nextFrac = i + 1 < n ? profile.layers[i + 1].frac : 0;
    const innerR = R * nextFrac;
    const seedOff = i * 1.618 + 0.31;
    const alpha = layer.alpha != null ? layer.alpha : 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    traceLayerPath(ctx, cx, cy, layerR, layer, noise, seedOff);
    if (layer.flatFill) {
      // Vector style: a shallow linear ramp instead of a radial one. Flat,
      // even coverage is what makes downstream filtering predictable.
      const g = ctx.createLinearGradient(cx - layerR, cy - layerR, cx + layerR, cy + layerR);
      g.addColorStop(0, layer.c1);
      g.addColorStop(1, layer.c0);
      ctx.fillStyle = g;
    } else {
      const g = ctx.createRadialGradient(cx, cy, innerR * 0.85, cx, cy, layerR);
      g.addColorStop(0, layer.c1);
      g.addColorStop(1, layer.c0);
      ctx.fillStyle = g;
    }
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    drawTexture(ctx, cx, cy, layerR, innerR, layer, noise, seedOff, rng);
    ctx.restore();

    if (layer.edge) {
      ctx.save();
      ctx.globalAlpha = alpha * layer.edge.alpha;
      ctx.strokeStyle = layer.edge.color;
      ctx.lineWidth = Math.max(0.8, R * layer.edge.width);
      traceLayerPath(ctx, cx, cy, layerR, layer, noise, seedOff);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Surface-attached effects. Ocean arcs must follow the crust's own
  // perturbed boundary rather than a plain circle: on a wobbly world a
  // circular arc crosses outside the surface wherever the boundary dips
  // inward, leaving water apparently floating in space.
  if (fx.oceanArc) {
    const surface = profile.layers[0];
    const seedOff = 0.31;
    ctx.save();
    traceLayerPath(ctx, cx, cy, R * surface.frac, surface, noise, seedOff);
    ctx.clip();
    ctx.lineCap = fx.oceanArc.crisp ? "butt" : "round";
    ctx.lineJoin = "round";

    const strokeAlongSurface = (from, to, inset, width, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = R * width;
      ctx.beginPath();
      const segs = Math.max(8, Math.ceil(Math.abs(to - from) * 24));
      for (let i = 0; i <= segs; i++) {
        const th = from + (to - from) * (i / segs);
        // Track the actual boundary, then sit just below it.
        const rr = layerRadius(th, R * surface.frac, surface, noise, seedOff) - R * inset;
        const x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    for (let a = 0; a < fx.oceanArc.arcs; a++) {
      const st = fx.oceanArc.start + a * 2.1;
      const span = fx.oceanArc.span * rrange(rng, 0.7, 1.1);
      strokeAlongSurface(st, st + span, fx.oceanArc.width * 0.55,
        fx.oceanArc.width, rgba(fx.oceanArc.color, 0.9));
      if (fx.oceanArc.ice) {
        strokeAlongSurface(st - 0.25, st, fx.oceanArc.width * 0.4,
          fx.oceanArc.width * 0.6, rgba(fx.oceanArc.iceColor, 0.95));
      }
    }
    ctx.restore();
  }

  // Notable features drawn into the body itself.
  if (opts.features && opts.features.length) {
    drawFeatureMarkers(ctx, cx, cy, R, profile, opts.features, noise, mulberry32(seedNum ^ 0x2f7d));
  }

  // Global depth shading. Skipped in vector style, where an off-center
  // highlight would defeat the flat, filterable look.
  if (profile.style !== "vector") {
    ctx.save();
    traceLayerPath(ctx, cx, cy, R * profile.layers[0].frac, profile.layers[0], noise, 0.31);
    ctx.clip();
    const sh = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R * 1.15);
    sh.addColorStop(0, "rgba(255,255,255,0.10)");
    sh.addColorStop(0.55, "rgba(0,0,0,0)");
    sh.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = sh;
    ctx.fillRect(cx - R * 1.2, cy - R * 1.2, R * 2.4, R * 2.4);
    ctx.restore();
  }

  if (fx.ring) drawRing(ctx, cx, cy, R, fx.ring, "front");
}
