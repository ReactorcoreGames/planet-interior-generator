/* Scene composition: backgrounds and the two export layouts. */

import { TAU, rrange } from "../core/math.js";
import { mulberry32, hashString } from "../core/rng.js";
import { drawBody } from "./body.js";
import { drawStatsPanel } from "./panel.js";
import { drawOverlay, resolveInk } from "./overlay.js";

export const BG_MODES = {
  starfield: "Starfield (from palette)",
  solid: "Solid color",
  transparent: "Transparent"
};

/* Paint the background. Returns true if anything opaque was drawn, which the
 * body renderer needs to know: additive glow only works over opaque pixels. */
export function drawBackground(ctx, w, h, mode, opts) {
  if (mode === "transparent") {
    ctx.clearRect(0, 0, w, h);
    return false;
  }
  if (mode === "solid") {
    ctx.fillStyle = opts.color || "#0a0c14";
    ctx.fillRect(0, 0, w, h);
    return true;
  }
  // Starfield
  const rng = opts.rng || mulberry32(1);
  ctx.fillStyle = opts.color || "#0a0c14";
  ctx.fillRect(0, 0, w, h);
  const count = Math.floor((w * h) / 6000);
  for (let i = 0; i < count; i++) {
    const x = rng() * w, y = rng() * h;
    const s = rng() * 1.4 + 0.3;
    ctx.fillStyle = `rgba(255,255,255,${rrange(rng, 0.15, 0.7)})`;
    ctx.beginPath();
    ctx.arc(x, y, s * (h / 720), 0, TAU);
    ctx.fill();
  }
  return true;
}

/* 16:9 composition. With the overlay on, the body is centered and full-bleed
 * and the callouts occupy the margins; with it off, the body sits left and the
 * stats panel occupies the right third. */
export function render169(canvas, state) {
  const h = state.resolution;
  const w = Math.round(h * 16 / 9);
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  const seedNum = hashString(state.seed);
  const bgRng = mulberry32(seedNum ^ 0xbeef);

  const opaque = drawBackground(ctx, w, h, state.bgMode, {
    color: state.bgMode === "solid" ? state.bgColor : state.profile.palette.space,
    rng: bgRng
  });

  const bodyOpts = { transparent: !opaque, features: state.features };

  if (state.overlay) {
    // The body is centered but deliberately modest in size: the callout
    // columns, header, legend and scale bar all need clear space, and a body
    // sized to fill the frame pushes the text into the canvas edges.
    const cx = w * 0.5;
    const cy = h * 0.5;
    const R = Math.min(w * 0.205, h * 0.335) / state.profile.extent;
    drawBody(ctx, cx, cy, R, state.profile, seedNum, bodyOpts);
    drawOverlay(ctx, w, h, cx, cy, R, {
      profile: state.profile,
      lore: state.lore,
      stats: state.stats,
      features: state.features,
      ink: resolveInk(state.ink, state.profile.palette),
      options: state.overlayOptions || {}
    });
  } else {
    const panelW = w * 0.30;
    const panelMargin = h * 0.045;
    const bodyAreaW = w - panelW - panelMargin * 2;
    const cx = bodyAreaW * 0.52;
    const cy = h * 0.5;
    const R = Math.min(bodyAreaW * 0.5, h * 0.5) * 0.92 / state.profile.extent;
    drawBody(ctx, cx, cy, R, state.profile, seedNum, bodyOpts);
    drawStatsPanel(ctx, w - panelW - panelMargin, panelMargin, panelW, h - panelMargin * 2, {
      lore: state.lore, profile: state.profile, stats: state.stats, features: state.features
    });
  }
  return canvas;
}

/* 1:1 composition — the body alone, honoring the chosen background. */
export function render11(canvas, state) {
  const size = state.resolution;
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  const seedNum = hashString(state.seed);
  const bgRng = mulberry32(seedNum ^ 0xbeef);

  // The square export defaults to transparent unless the user picked a
  // background explicitly — it exists to be composited elsewhere.
  const mode = state.bgMode11 || state.bgMode;
  const opaque = drawBackground(ctx, size, size, mode, {
    color: mode === "solid" ? state.bgColor : state.profile.palette.space,
    rng: bgRng
  });

  const R = (size / 2) * 0.94 / state.profile.extent;
  drawBody(ctx, size / 2, size / 2, R, state.profile, seedNum, {
    transparent: !opaque, features: state.features
  });
  return canvas;
}
