/* Visual markers for notable features.
 *
 * Each feature carries a `draw` hint; this maps hints to small drawing
 * routines placed at the feature's stored (r, angle). Markers are deliberately
 * restrained — they should read as "something is here" and support the
 * overlay's leader line, not compete with the layer art. */

import { TAU, lerp, rrange } from "../core/math.js";
import { rgba, shadeHex } from "../core/color.js";

function featureColor(profile, feature) {
  const pal = profile.palette;
  if (feature.tier === "rare") return pal.ice || pal.core || "#ffffff";
  return pal.haze || pal.band || pal.corona || pal.core || "#ffffff";
}

export function drawFeatureMarkers(ctx, cx, cy, R, profile, features, noise, rng) {
  for (const f of features) {
    const col = featureColor(profile, f);
    const x = cx + Math.cos(f.angle) * R * f.r;
    const y = cy + Math.sin(f.angle) * R * f.r;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (f.draw) {
      case "gash":
      case "shatter": {
        // A jagged crustal fracture running along the surface.
        const span = f.draw === "shatter" ? 1.5 : rrange(rng, 0.35, 0.7);
        const segs = 18;
        ctx.strokeStyle = rgba(shadeHex(col, -0.5), 0.85);
        ctx.lineWidth = Math.max(1.2, R * (f.draw === "shatter" ? 0.02 : 0.011));
        ctx.beginPath();
        for (let i = 0; i <= segs; i++) {
          const t = i / segs;
          const th = f.angle - span / 2 + t * span;
          const jitter = 1 + 0.02 * Math.sin(t * 11 + f.angle * 3);
          const rr = R * f.r * jitter;
          const px = cx + Math.cos(th) * rr, py = cy + Math.sin(th) * rr;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        break;
      }

      case "storm":
      case "megastorm": {
        // An oval cyclone with an inner eye, sitting on the surface.
        const rad = R * (f.draw === "megastorm" ? 0.16 : 0.10);
        ctx.translate(x, y);
        ctx.rotate(f.angle + Math.PI / 2);
        const g = ctx.createRadialGradient(0, 0, rad * 0.1, 0, 0, rad);
        g.addColorStop(0, rgba(shadeHex(col, 0.4), 0.9));
        g.addColorStop(0.55, rgba(col, 0.55));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, rad, rad * 0.62, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = rgba(shadeHex(col, -0.3), 0.5);
        ctx.lineWidth = Math.max(1, rad * 0.10);
        for (let s = 0; s < 3; s++) {
          ctx.beginPath();
          ctx.ellipse(0, 0, rad * (0.35 + s * 0.22), rad * (0.22 + s * 0.14),
                      s * 0.4, 0.5, 0.5 + 4.4);
          ctx.stroke();
        }
        break;
      }

      case "spot": {
        const rad = R * 0.055;
        ctx.fillStyle = rgba(shadeHex(col, -0.55), 0.7);
        ctx.beginPath();
        ctx.ellipse(x, y, rad, rad * 0.7, f.angle, 0, TAU);
        ctx.fill();
        ctx.fillStyle = rgba(shadeHex(col, -0.3), 0.5);
        ctx.beginPath();
        ctx.ellipse(x, y, rad * 1.5, rad * 1.05, f.angle, 0, TAU);
        ctx.fill();
        break;
      }

      case "band":
      case "shear":
      case "pulse": {
        // A highlighted annular band at the feature's radius.
        ctx.strokeStyle = rgba(col, 0.4);
        ctx.lineWidth = Math.max(1.5, R * 0.022);
        ctx.beginPath();
        ctx.arc(cx, cy, R * f.r, f.angle - 0.9, f.angle + 0.9);
        ctx.stroke();
        ctx.strokeStyle = rgba(shadeHex(col, 0.4), 0.55);
        ctx.lineWidth = Math.max(0.8, R * 0.006);
        ctx.beginPath();
        ctx.arc(cx, cy, R * f.r, f.angle - 0.9, f.angle + 0.9);
        ctx.stroke();
        break;
      }

      case "patch":
      case "cells": {
        const rad = R * 0.085;
        ctx.fillStyle = rgba(col, 0.22);
        ctx.beginPath();
        ctx.ellipse(x, y, rad, rad * 0.75, f.angle, 0, TAU);
        ctx.fill();
        if (f.draw === "cells") {
          ctx.strokeStyle = rgba(shadeHex(col, 0.3), 0.4);
          ctx.lineWidth = Math.max(0.6, R * 0.004);
          for (let i = 0; i < 7; i++) {
            const a = rng() * TAU, d = rng() * rad * 0.8;
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rad * rrange(rng, 0.12, 0.26), 0, TAU);
            ctx.stroke();
          }
        }
        break;
      }

      case "spike":
      case "twincore": {
        // A dense intrusion reaching outward from the deep interior.
        const r0 = R * 0.2, r1 = R * f.r;
        ctx.strokeStyle = rgba(shadeHex(col, 0.25), 0.6);
        ctx.lineWidth = Math.max(1.5, R * 0.018);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(f.angle) * r0, cy + Math.sin(f.angle) * r0);
        ctx.lineTo(cx + Math.cos(f.angle) * r1, cy + Math.sin(f.angle) * r1);
        ctx.stroke();
        if (f.draw === "twincore") {
          const g = ctx.createRadialGradient(x, y, 0, x, y, R * 0.12);
          g.addColorStop(0, rgba(shadeHex(col, 0.5), 0.95));
          g.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, R * 0.12, 0, TAU);
          ctx.fill();
        }
        break;
      }

      case "pocket":
      case "cavity": {
        const rad = R * (f.draw === "cavity" ? 0.15 : 0.07);
        ctx.fillStyle = f.draw === "cavity"
          ? "rgba(4,6,12,0.85)" : rgba(shadeHex(col, -0.6), 0.55);
        ctx.beginPath();
        ctx.ellipse(x, y, rad, rad * 0.82, f.angle, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = rgba(shadeHex(col, 0.35), 0.65);
        ctx.lineWidth = Math.max(1, R * 0.005);
        ctx.stroke();
        break;
      }

      case "sparkle":
      case "speck":
      case "garden": {
        const n = f.draw === "speck" ? 26 : 18;
        const spread = R * 0.11;
        for (let i = 0; i < n; i++) {
          const a = rng() * TAU, d = rng() * spread;
          const s = Math.max(0.7, R * rrange(rng, 0.002, 0.006));
          ctx.fillStyle = rgba(shadeHex(col, 0.45), rrange(rng, 0.35, 0.9));
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, s, 0, TAU);
          ctx.fill();
        }
        break;
      }

      case "shine": {
        ctx.strokeStyle = rgba(shadeHex(col, 0.55), 0.35);
        ctx.lineWidth = Math.max(1.5, R * 0.014);
        ctx.beginPath();
        ctx.arc(cx, cy, R * f.r, 0, TAU);
        ctx.stroke();
        break;
      }

      case "arc":
      case "arch":
      case "ribbon": {
        const rad = R * 0.13;
        ctx.strokeStyle = rgba(shadeHex(col, 0.4), 0.6);
        ctx.lineWidth = Math.max(1.5, R * (f.draw === "ribbon" ? 0.016 : 0.010));
        ctx.beginPath();
        const a0 = f.angle - 0.3, a1 = f.angle + 0.3;
        const p0x = cx + Math.cos(a0) * R * 0.97, p0y = cy + Math.sin(a0) * R * 0.97;
        const p1x = cx + Math.cos(a1) * R * 0.97, p1y = cy + Math.sin(a1) * R * 0.97;
        const mx = cx + Math.cos(f.angle) * (R + rad * 2), my = cy + Math.sin(f.angle) * (R + rad * 2);
        ctx.moveTo(p0x, p0y);
        ctx.quadraticCurveTo(mx, my, p1x, p1y);
        ctx.stroke();
        break;
      }

      case "gap": {
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = Math.max(1.5, R * 0.018);
        ctx.beginPath();
        ctx.arc(cx, cy, R * f.r, f.angle - 0.5, f.angle + 0.5);
        ctx.stroke();
        break;
      }

      case "polygon": {
        const rad = R * 0.09;
        ctx.strokeStyle = rgba(shadeHex(col, 0.4), 0.7);
        ctx.lineWidth = Math.max(1, R * 0.006);
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
          const a = f.angle + (i / 6) * TAU;
          const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad * 0.8;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        break;
      }

      case "lattice": {
        const rad = R * 0.16;
        ctx.strokeStyle = rgba(shadeHex(col, 0.4), 0.45);
        ctx.lineWidth = Math.max(0.8, R * 0.004);
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(x - rad, y + i * rad * 0.4);
          ctx.lineTo(x + rad, y + i * rad * 0.4);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + i * rad * 0.4, y - rad);
          ctx.lineTo(x + i * rad * 0.4, y + rad);
          ctx.stroke();
        }
        break;
      }

      case "shell": {
        ctx.strokeStyle = rgba(col, 0.3);
        ctx.lineWidth = Math.max(1, R * 0.008);
        ctx.setLineDash([R * 0.03, R * 0.02]);
        ctx.beginPath();
        ctx.arc(cx, cy, R * f.r, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }

      case "derelicts": {
        for (let i = 0; i < 9; i++) {
          const a = f.angle + rrange(rng, -0.7, 0.7);
          const rr = R * f.r * rrange(rng, 0.97, 1.03);
          const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
          ctx.fillStyle = rgba(shadeHex(col, 0.2), 0.8);
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(a + rng());
          ctx.fillRect(-R * 0.012, -R * 0.004, R * 0.024, R * 0.008);
          ctx.restore();
        }
        break;
      }

      case "aurora": {
        ctx.strokeStyle = rgba(shadeHex(col, 0.5), 0.45);
        ctx.lineWidth = Math.max(1.5, R * 0.02);
        ctx.beginPath();
        ctx.arc(cx, cy, R * 1.02, f.angle - 0.45, f.angle + 0.45);
        ctx.stroke();
        break;
      }

      case "companion": {
        const rad = R * 0.05;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 3);
        g.addColorStop(0, rgba(shadeHex(col, 0.6), 1));
        g.addColorStop(0.3, rgba(col, 0.6));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, rad * 3, 0, TAU);
        ctx.fill();
        break;
      }

      default: {
        // Unknown hint: a soft point of interest so the callout still lands.
        const rad = R * 0.05;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, rgba(shadeHex(col, 0.4), 0.7));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
