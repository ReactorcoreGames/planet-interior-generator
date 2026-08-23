/* The side panel used when the hologram overlay is off. Carries identity,
 * physical stats, structural rows, notable features, and the layer legend. */

import { TAU } from "../core/math.js";
import { rgba } from "../core/color.js";
import { TYPE_LABELS } from "../data/palettes.js";

export function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawStatsPanel(ctx, x, y, w, h, data) {
  const { lore, profile, stats, features } = data;
  const pad = w * 0.085;
  ctx.save();

  ctx.fillStyle = "rgba(10,12,20,0.82)";
  ctx.strokeStyle = "rgba(160,170,205,0.35)";
  ctx.lineWidth = Math.max(1, h * 0.0025);
  roundRect(ctx, x, y, w, h, h * 0.02);
  ctx.fill();
  ctx.stroke();

  let cy = y + pad * 0.85;
  const left = x + pad;
  const innerW = w - pad * 2;
  ctx.textBaseline = "top";

  // Identity
  ctx.fillStyle = "#f2ead6";
  ctx.font = `600 ${Math.round(h * 0.05)}px Georgia, 'Times New Roman', serif`;
  for (const ln of wrapText(ctx, lore.name, innerW)) {
    ctx.fillText(ln, left, cy); cy += h * 0.056;
  }
  ctx.fillStyle = "#9aa2c2";
  ctx.font = `italic ${Math.round(h * 0.027)}px Georgia, serif`;
  ctx.fillText(lore.cls, left, cy);
  cy += h * 0.042;

  ctx.strokeStyle = "rgba(200,180,140,0.45)";
  ctx.lineWidth = Math.max(1, h * 0.002);
  ctx.beginPath(); ctx.moveTo(left, cy); ctx.lineTo(left + innerW, cy); ctx.stroke();
  cy += h * 0.024;

  // Physical stats as a compact two-column grid — the "starship survey" data.
  const d = stats.display;
  const grid = stats.kind === "star"
    ? [["Mass", d.mass], ["Radius", d.radius], ["Photosphere", `${Math.round(stats.tempMid)} K`],
       ["Density", d.density], ["Rotation", d.rotation], ["Escape v", d.escape]]
    : [["Mass", d.mass], ["Gravity", d.gravity], ["Diameter", d.diameterKm],
       ["Pressure", d.pressure], ["Rotation", d.rotation], ["Escape v", d.escape]];

  const colW = innerW / 2;
  const labelF = `700 ${Math.round(h * 0.0165)}px 'Segoe UI', Arial, sans-serif`;
  const valF = `${Math.round(h * 0.023)}px 'Consolas', monospace`;
  for (let i = 0; i < grid.length; i += 2) {
    for (let c = 0; c < 2 && i + c < grid.length; c++) {
      const gx = left + c * colW;
      ctx.font = labelF; ctx.fillStyle = "#7f87a8";
      ctx.fillText(grid[i + c][0].toUpperCase(), gx, cy);
      ctx.font = valF; ctx.fillStyle = "#dfe4f2";
      ctx.fillText(grid[i + c][1], gx, cy + h * 0.021);
    }
    cy += h * 0.05;
  }

  cy += h * 0.006;
  ctx.strokeStyle = "rgba(200,180,140,0.25)";
  ctx.beginPath(); ctx.moveTo(left, cy); ctx.lineTo(left + innerW, cy); ctx.stroke();
  cy += h * 0.022;

  // Temperature + weather get their own emphasis: what it's like to be there.
  ctx.font = labelF; ctx.fillStyle = "#7f87a8";
  ctx.fillText("SURFACE CONDITIONS", left, cy); cy += h * 0.024;
  ctx.font = `${Math.round(h * 0.021)}px 'Consolas', monospace`;
  ctx.fillStyle = "#dfe4f2";
  for (const ln of wrapText(ctx, d.temp, innerW)) { ctx.fillText(ln, left, cy); cy += h * 0.026; }
  ctx.font = `${Math.round(h * 0.0205)}px Georgia, serif`;
  ctx.fillStyle = "#c3c9dd";
  for (const ln of wrapText(ctx, stats.weather, innerW)) { ctx.fillText(ln, left, cy); cy += h * 0.026; }
  cy += h * 0.014;

  // Structural rows
  const rowLabelF = `700 ${Math.round(h * 0.0165)}px 'Segoe UI', Arial, sans-serif`;
  const rowValF = `${Math.round(h * 0.0215)}px Georgia, serif`;
  for (const [label, val] of lore.rows.slice(2)) {
    ctx.font = rowLabelF; ctx.fillStyle = "#7f87a8";
    ctx.fillText(label.toUpperCase(), left, cy); cy += h * 0.023;
    ctx.font = rowValF; ctx.fillStyle = "#ded7c4";
    for (const ln of wrapText(ctx, val, innerW)) { ctx.fillText(ln, left, cy); cy += h * 0.026; }
    cy += h * 0.008;
  }

  // Notable features
  if (features.length) {
    cy += h * 0.008;
    ctx.font = rowLabelF; ctx.fillStyle = "#7f87a8";
    ctx.fillText("NOTABLE", left, cy); cy += h * 0.024;
    for (const f of features) {
      ctx.font = `600 ${Math.round(h * 0.0205)}px 'Segoe UI', Arial, sans-serif`;
      ctx.fillStyle = f.tier === "rare" ? "#ffd98a" : "#cdd4e8";
      const bullet = f.tier === "rare" ? "* " : "· ";
      ctx.fillText(bullet + f.name, left, cy); cy += h * 0.024;
      ctx.font = `${Math.round(h * 0.0185)}px Georgia, serif`;
      ctx.fillStyle = "#9aa2bd";
      for (const ln of wrapText(ctx, f.note, innerW - h * 0.014)) {
        ctx.fillText(ln, left + h * 0.014, cy); cy += h * 0.022;
      }
      cy += h * 0.006;
    }
  }

  // Verdict line, anchored above the legend at the bottom.
  const legendY = y + h - pad * 0.75;
  ctx.font = `italic ${Math.round(h * 0.0195)}px Georgia, serif`;
  ctx.fillStyle = "#b8ac90";
  const vLines = wrapText(ctx, lore.verdict, innerW);
  let vy = legendY - h * 0.048 - vLines.length * h * 0.024;
  if (vy > cy + h * 0.01) {
    for (const ln of vLines) { ctx.fillText(ln, left, vy); vy += h * 0.024; }
  }

  // Layer legend dots
  ctx.font = `${Math.round(h * 0.018)}px 'Segoe UI', Arial, sans-serif`;
  ctx.fillStyle = "#7c84a4";
  ctx.fillText(`${profile.layers.length} strata · ${TYPE_LABELS[profile.type] || profile.type}`,
    left, legendY - h * 0.032);
  let lx = left;
  const dotR = h * 0.0105;
  for (const layer of profile.layers) {
    ctx.beginPath();
    ctx.arc(lx + dotR, legendY + dotR, dotR, 0, TAU);
    ctx.fillStyle = layer.c1;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
    lx += dotR * 3.1;
  }
  ctx.restore();
}
