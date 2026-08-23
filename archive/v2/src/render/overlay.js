/* Hologram / technical-schematic overlay.
 *
 * Draws leader lines from points inside the body out to labelled callouts
 * ranged down the left and right margins, with stat nuggets listed beneath
 * each label. Also draws a corner header block (name, class, verdict) and a
 * legend for elements that aren't a single contiguous thing.
 *
 * Callout placement is deterministic and collision-free: targets are sorted
 * into a left and a right column by which side of the body they sit on, then
 * distributed down evenly spaced slots. Leader lines use an elbow (diagonal
 * from the target, then a short horizontal run into the text) which is the
 * convention technical illustration uses and which keeps text baselines
 * aligned regardless of where the target sits. */

import { TAU, clamp, lerp } from "../core/math.js";
import { rgba, shadeHex, deriveInk } from "../core/color.js";
import { statNuggets } from "../lore/stats.js";

export const INK_PRESETS = {
  auto: { label: "Auto (from palette)", color: null },
  cyan: { label: "Cyan", color: "#7fe9ff" },
  amber: { label: "Amber", color: "#ffc46b" },
  green: { label: "Green", color: "#8dffa8" },
  white: { label: "White", color: "#eef2ff" },
  red: { label: "Red", color: "#ff8a8a" },
  violet: { label: "Violet", color: "#c9a3ff" }
};

export function resolveInk(inkId, palette) {
  const preset = INK_PRESETS[inkId];
  if (preset && preset.color) return preset.color;
  return deriveInk(palette);
}

/* Choose which things get a callout, and where each one points. */
function buildTargets(profile, features, stats, R, cx, cy, opts) {
  const targets = [];
  const layers = profile.layers;

  // Layer callouts: point at the mid-radius of each layer's annulus, at an
  // angle spread around the circle so leader lines don't stack up.
  if (opts.showLayers !== false) {
    const n = layers.length;
    for (let i = 0; i < n; i++) {
      const outer = layers[i].frac;
      const inner = i + 1 < n ? layers[i + 1].frac : 0;
      const mid = (outer + inner) / 2;
      // Alternate sides and walk down the circle so successive layers don't
      // all exit at the same angle.
      const side = i % 2 === 0 ? -1 : 1;
      const t = (i + 0.5) / n;
      const ang = side * lerp(0.55, 2.55, t);
      targets.push({
        kind: "layer",
        label: layers[i].name || `Layer ${i + 1}`,
        sub: layers[i].desc || "",
        nuggets: [],
        x: cx + Math.cos(ang) * R * mid,
        y: cy + Math.sin(ang) * R * mid,
        side: Math.cos(ang) >= 0 ? "right" : "left"
      });
    }
  }

  // Feature callouts point at the exact spot the marker was drawn.
  // A feature named after a structural layer ("The Tachocline") would sit
  // beside that layer's own callout and read as a duplicate, so skip it.
  if (opts.showFeatures !== false) {
    const layerKeys = new Set(
      targets.filter(t => t.kind === "layer")
        .map(t => t.label.toLowerCase().replace(/\s+(ii|iii|iv|v|vi)$/, "").trim()));
    const norm = s => s.toLowerCase().replace(/^the\s+/, "").trim();
    // Features are sometimes prefixed with the body's name ("Aelmimi
    // Tachocline"), so compare the trailing words too.
    const clashes = name => {
      const n = norm(name);
      if (layerKeys.has(n)) return true;
      const parts = n.split(/\s+/);
      return parts.length > 1 && layerKeys.has(parts.slice(1).join(" "));
    };

    for (const f of features) {
      if (clashes(f.name)) continue;
      const x = cx + Math.cos(f.angle) * R * f.r;
      const y = cy + Math.sin(f.angle) * R * f.r;
      targets.push({
        kind: "feature",
        tier: f.tier,
        label: f.name,
        sub: f.note,
        nuggets: [],
        x, y,
        side: x >= cx ? "right" : "left"
      });
    }
  }

  // Attach stat nuggets to the layer they actually describe: surface figures
  // on the outermost callout, bulk figures on the core. Round-robin placement
  // reads as noise ("vacuum" under Outer Core), which defeats the purpose of
  // annotating the diagram instead of listing the numbers.
  if (opts.showStats !== false) {
    const hosts = targets.filter(t => t.kind === "layer");
    if (hosts.length) {
      const d = stats.display;
      const surface = hosts[0];
      const core = hosts[hosts.length - 1];
      const mid = hosts[Math.floor(hosts.length / 2)];

      if (stats.kind === "star") {
        surface.nuggets.push(d.temp, d.radius);
        core.nuggets.push(d.mass, d.density);
      } else {
        surface.nuggets.push(d.temp);
        if (d.pressure !== "no defined surface") surface.nuggets.push(d.pressure);
        surface.nuggets.push(d.gravity);
        mid.nuggets.push(d.diameterKm);
        core.nuggets.push(d.mass, d.density);
      }
      // Escape velocity belongs with whichever callout is least loaded.
      hosts.reduce((a, b) => (a.nuggets.length <= b.nuggets.length ? a : b))
        .nuggets.push(d.escape);
    }
  }

  return targets;
}

/* Assign each target a text anchor in its margin column, evenly spaced and
 * ordered by vertical position so leader lines never cross.
 *
 * Callout text is wrapped to a fixed column width and its measured line count
 * drives the slot height, which is what keeps neighbouring callouts from
 * overlapping each other or running across the illustration. The column width
 * is derived from the gap between the canvas edge and the body, so text can
 * never reach the body no matter how large the render. */
function layoutColumns(ctx, targets, w, h, cx, R, lineH) {
  // Keep a clear channel between the text column and the body's outer extent,
  // and a margin between the text and the canvas edge.
  const pad = w * 0.032;
  const gutter = w * 0.05;
  const bodyLeft = cx - R * 1.30;
  const colW = Math.max(w * 0.13, Math.min(w * 0.225, bodyLeft - pad - gutter));

  // Rebalance the columns. Targets are assigned a side by geometry, which can
  // stack most of them on one side and leave the other nearly empty; the
  // crowded column then compresses to unreadability. Move the targets nearest
  // the vertical centre line across until the split is even.
  const cols = { left: [], right: [] };
  for (const t of targets) cols[t.side].push(t);
  const balance = () => {
    const [big, small] = cols.left.length >= cols.right.length
      ? ["left", "right"] : ["right", "left"];
    while (cols[big].length - cols[small].length > 1) {
      // The best candidate to move is the one closest to the centre line,
      // since its leader line changes direction least.
      let bestI = 0, bestD = Infinity;
      cols[big].forEach((t, i) => {
        const d = Math.abs(t.x - cx);
        if (d < bestD) { bestD = d; bestI = i; }
      });
      const moved = cols[big].splice(bestI, 1)[0];
      moved.side = small;
      cols[small].push(moved);
    }
  };
  balance();

  // Measure with the same font the sub-line is drawn in.
  const subFont = `${Math.round(h * 0.0165)}px 'Segoe UI', Arial, sans-serif`;

  for (const side of ["left", "right"]) {
    const list = cols[side].sort((a, b) => a.y - b.y);
    if (!list.length) continue;

    ctx.save();
    ctx.font = subFont;
    for (const t of list) {
      t.subLines = t.sub ? wrap(ctx, t.sub, colW) : [];
      // A long note on a layer callout is decoration; on a feature callout it
      // is the point. Trim layer notes rather than let them dominate.
      if (t.kind === "layer" && t.subLines.length > 1) t.subLines = t.subLines.slice(0, 1);
      else if (t.subLines.length > 3) t.subLines = t.subLines.slice(0, 3);
    }
    ctx.restore();

    const heights = list.map(t =>
      lineH * (1 + t.subLines.length + t.nuggets.length) + lineH * 0.6);
    const totalH = heights.reduce((a, b) => a + b, 0);
    const top = h * 0.175, bottom = h * 0.955;
    const avail = bottom - top;
    const scale = totalH > avail ? avail / totalH : 1;

    let y = top + Math.max(0, (avail - totalH * scale) / 2);
    list.forEach((t, i) => {
      t.textY = y;
      t.textH = heights[i] * scale;
      t.colW = colW;
      t.anchorX = side === "left" ? pad : w - pad;
      y += heights[i] * scale;
    });
  }
  return targets;
}

function drawLeader(ctx, t, ink, R) {
  // Elbow: target → diagonal → short horizontal run → text anchor.
  const anchorY = t.textY + 1;
  const stubLen = R * 0.10;
  const elbowX = t.side === "left" ? t.anchorX + stubLen : t.anchorX - stubLen;

  ctx.save();
  ctx.strokeStyle = rgba(ink, 0.55);
  ctx.lineWidth = Math.max(1, R * 0.004);
  ctx.beginPath();
  ctx.moveTo(t.x, t.y);
  ctx.lineTo(elbowX, anchorY);
  ctx.lineTo(t.anchorX, anchorY);
  ctx.stroke();

  // Target node: a small ring, filled for rare features so they read as
  // the point of interest they are.
  const nodeR = Math.max(2, R * (t.tier === "rare" ? 0.014 : 0.009));
  ctx.beginPath();
  ctx.arc(t.x, t.y, nodeR, 0, TAU);
  if (t.tier === "rare") {
    ctx.fillStyle = rgba(ink, 0.9);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(t.x, t.y, nodeR * 2.1, 0, TAU);
    ctx.strokeStyle = rgba(ink, 0.5);
    ctx.stroke();
  } else {
    ctx.strokeStyle = rgba(ink, 0.85);
    ctx.lineWidth = Math.max(1, R * 0.0035);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCallout(ctx, t, ink, h) {
  const align = t.side === "left" ? "left" : "right";
  const x = t.anchorX;
  const lineH = h * 0.021;
  let y = t.textY;

  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = "top";

  // Label — truncated to the column so a long feature name can't bleed out.
  ctx.font = `600 ${Math.round(h * 0.0195)}px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillStyle = t.tier === "rare" ? shadeHex(ink, 0.35) : ink;
  // "*" rather than a diamond glyph: the geometric-shape block is absent from
  // the default Windows UI fonts and renders as a tofu box in the export.
  let label = t.tier === "rare" ? "* " + t.label.toUpperCase() : t.label.toUpperCase();
  if (t.colW && ctx.measureText(label).width > t.colW) {
    while (label.length > 4 && ctx.measureText(label + "…").width > t.colW) {
      label = label.slice(0, -1);
    }
    label += "…";
  }
  ctx.fillText(label, x, y);
  y += lineH;

  // Descriptive sub-lines, pre-wrapped to the column during layout.
  if (t.subLines && t.subLines.length) {
    ctx.font = `${Math.round(h * 0.0165)}px 'Segoe UI', Arial, sans-serif`;
    ctx.fillStyle = rgba(ink, 0.62);
    for (const ln of t.subLines) {
      ctx.fillText(ln, x, y);
      y += lineH * 0.92;
    }
  }

  // Stat nuggets, tick-marked so they read as data points off the line
  if (t.nuggets.length) {
    ctx.font = `${Math.round(h * 0.016)}px 'Consolas', 'SF Mono', monospace`;
    ctx.fillStyle = rgba(ink, 0.85);
    for (const ng of t.nuggets) {
      const s = align === "left" ? "· " + ng : ng + " ·";
      ctx.fillText(s, x, y);
      y += lineH * 0.88;
    }
  }
  ctx.restore();
}

/* Header block: identity and the survey verdict. */
function drawHeader(ctx, x, y, w, h, lore, stats, ink) {
  ctx.save();
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  ctx.font = `600 ${Math.round(h * 0.052)}px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillStyle = ink;
  ctx.fillText(lore.name.toUpperCase(), x, y);
  let cy = y + h * 0.058;

  ctx.font = `${Math.round(h * 0.021)}px 'Segoe UI', Arial, sans-serif`;
  ctx.fillStyle = rgba(ink, 0.7);
  ctx.fillText(`${lore.cls}  ·  ${lore.rows[0][1]}`, x, cy);
  cy += h * 0.03;

  ctx.strokeStyle = rgba(ink, 0.35);
  ctx.lineWidth = Math.max(1, h * 0.0015);
  ctx.beginPath();
  ctx.moveTo(x, cy); ctx.lineTo(x + w, cy); ctx.stroke();
  cy += h * 0.016;

  ctx.font = `${Math.round(h * 0.0175)}px 'Segoe UI', Arial, sans-serif`;
  ctx.fillStyle = rgba(ink, 0.6);
  for (const line of wrap(ctx, lore.verdict, w)) {
    ctx.fillText(line, x, cy);
    cy += h * 0.023;
  }
  ctx.restore();
  return cy;
}

function wrap(ctx, text, maxWidth) {
  const words = String(text).split(" ");
  const lines = [];
  let line = "";
  for (const wd of words) {
    const test = line ? line + " " + wd : wd;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = wd; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/* Legend for non-contiguous elements: things represented by a swatch or a
 * marker style rather than by a single labelled region. */
function drawLegend(ctx, x, y, h, ink, profile, features) {
  const entries = [];
  const fx = profile.effects;

  if (fx.oceanArc) entries.push({ swatch: fx.oceanArc.color, text: "Hydrosphere / surface liquid" });
  if (fx.oceanArc && fx.oceanArc.ice) entries.push({ swatch: fx.oceanArc.iceColor, text: "Ice cap / frozen margin" });
  if (fx.haze) entries.push({ swatch: fx.haze.color, text: "Atmosphere" });
  if (fx.corona) entries.push({ swatch: fx.corona.color, text: "Corona" });
  if (fx.ring) entries.push({ swatch: fx.ring.color, text: "Ring system" });
  if (fx.flares) entries.push({ swatch: fx.flares.color, text: "Flare activity" });
  if (features.some(f => f.tier === "rare")) {
    entries.push({ node: "rare", text: "Anomaly — unexplained" });
  }
  if (features.some(f => f.tier === "common")) {
    entries.push({ node: "common", text: "Notable feature" });
  }
  if (!entries.length) return;

  ctx.save();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = `${Math.round(h * 0.016)}px 'Segoe UI', Arial, sans-serif`;
  const rowH = h * 0.026;
  const sw = h * 0.014;

  ctx.fillStyle = rgba(ink, 0.5);
  ctx.font = `600 ${Math.round(h * 0.015)}px 'Segoe UI', Arial, sans-serif`;
  ctx.fillText("LEGEND", x, y);
  let cy = y + rowH;

  ctx.font = `${Math.round(h * 0.016)}px 'Segoe UI', Arial, sans-serif`;
  for (const e of entries) {
    if (e.swatch) {
      ctx.fillStyle = rgba(e.swatch, 0.9);
      ctx.fillRect(x, cy - sw / 2, sw, sw);
      ctx.strokeStyle = rgba(ink, 0.35);
      ctx.lineWidth = 1;
      ctx.strokeRect(x, cy - sw / 2, sw, sw);
    } else {
      ctx.beginPath();
      ctx.arc(x + sw / 2, cy, sw * 0.38, 0, TAU);
      if (e.node === "rare") { ctx.fillStyle = rgba(ink, 0.9); ctx.fill(); }
      else { ctx.strokeStyle = rgba(ink, 0.85); ctx.lineWidth = 1.2; ctx.stroke(); }
    }
    ctx.fillStyle = rgba(ink, 0.72);
    ctx.fillText(e.text, x + sw * 1.9, cy);
    cy += rowH;
  }
  ctx.restore();
}

/* Faint technical furniture: reticle rings, tick marks, and a scale bar.
 * Sells the "instrument readout" read without adding information noise. */
function drawReticle(ctx, cx, cy, R, ink, stats, h, canvasH) {
  ctx.save();
  ctx.strokeStyle = rgba(ink, 0.18);
  ctx.lineWidth = Math.max(0.8, R * 0.0025);

  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.06, 0, TAU);
  ctx.stroke();

  ctx.setLineDash([R * 0.012, R * 0.024]);
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.14, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);

  // Angular ticks every 15°, longer every 90°.
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    const major = i % 6 === 0;
    const r0 = R * 1.06, r1 = R * (major ? 1.10 : 1.08);
    ctx.strokeStyle = rgba(ink, major ? 0.4 : 0.2);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
  }

  // Scale bar, pinned near the canvas bottom rather than to the body radius,
  // so it never collides with a large body or its corona.
  const barY = Math.max(cy + R * 1.24, canvasH * 0.93);
  const halfW = R * 0.5;
  ctx.strokeStyle = rgba(ink, 0.4);
  ctx.lineWidth = Math.max(1, R * 0.003);
  ctx.beginPath();
  ctx.moveTo(cx - halfW, barY); ctx.lineTo(cx + halfW, barY);
  ctx.moveTo(cx - halfW, barY - R * 0.012); ctx.lineTo(cx - halfW, barY + R * 0.012);
  ctx.moveTo(cx + halfW, barY - R * 0.012); ctx.lineTo(cx + halfW, barY + R * 0.012);
  ctx.stroke();

  ctx.fillStyle = rgba(ink, 0.6);
  ctx.font = `${Math.round(h * 0.015)}px 'Consolas', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  // The bar spans R (half the body's width on screen), so it measures one
  // body radius. Labelling it with the diameter would be off by 2x.
  const spanKm = Math.round(stats.radiusKm);
  ctx.fillText(`${spanKm.toLocaleString("en-US")} km  (1 radius)`, cx, barY + h * 0.012);
  ctx.restore();
}

/* Main entry. Draws the full overlay over an already-rendered body. */
export function drawOverlay(ctx, w, h, cx, cy, R, ctxData) {
  const { profile, lore, stats, features, ink, options } = ctxData;
  const pad = w * 0.028;
  const lineH = h * 0.021;

  drawReticle(ctx, cx, cy, R, ink, stats, h, h);

  const targets = buildTargets(profile, features, stats, R, cx, cy, options);
  layoutColumns(ctx, targets, w, h, cx, R, lineH);

  for (const t of targets) drawLeader(ctx, t, ink, R);
  for (const t of targets) drawCallout(ctx, t, ink, h);

  const headerW = w * 0.30;
  drawHeader(ctx, pad, h * 0.045, headerW, h, lore, stats, ink);

  drawLegend(ctx, pad, h * 0.80, h, ink, profile, features);

  // Corner branding, subtle and consistent with the instrument framing.
  ctx.save();
  ctx.font = `${Math.round(h * 0.014)}px 'Segoe UI', Arial, sans-serif`;
  ctx.fillStyle = rgba(ink, 0.32);
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("CELESTIAL CUTAWAY  ·  reactorcore", w - pad, h - pad * 0.6);
  ctx.restore();
}
