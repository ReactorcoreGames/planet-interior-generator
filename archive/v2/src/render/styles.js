/* Art styles.
 *
 * A style is a transform applied to an already-built profile. Because every
 * visual decision in a profile is data (wobble amplitude, noise, texture,
 * edge width), a style can rewrite those fields without the renderer knowing
 * which style is active. This is why three very different looks share one
 * engine instead of needing three forks of the program.
 *
 *   artistic  — the original hand-illustrated look, untouched.
 *   semitech  — tamed: gentle boundary variation, texture at low strength,
 *               gradients dominant. Organic but predictable.
 *   vector    — true circles, flat two-stop gradients, crisp hairlines, no
 *               procedural texture. Designed so a downstream hue/curves
 *               filter produces clean, predictable results.
 */

export const STYLES = {
  artistic: {
    id: "artistic",
    label: "Artistic",
    hint: "The original illustrated look — organic boundaries, rich procedural texture."
  },
  semitech: {
    id: "semitech",
    label: "Semi-technical",
    hint: "Tamed boundaries and faint texture. Still organic, much easier to filter."
  },
  vector: {
    id: "vector",
    label: "Vector / Technical",
    hint: "Perfect circles, flat gradients, crisp edges, no texture. Best for recoloring."
  }
};

export const STYLE_ORDER = ["artistic", "semitech", "vector"];

/* Texture strength multipliers per style. `null` removes texture entirely. */
const TEXTURE_SCALE = { artistic: 1, semitech: 0.35, vector: 0 };

/* Boundary geometry multipliers. */
const GEOM = {
  artistic: { wobble: 1, noise: 1 },
  semitech: { wobble: 0.28, noise: 0.22 },
  vector: { wobble: 0, noise: 0 }
};

/* Reduce a texture's visual weight, or drop it. Counts scale down so the
 * semi-technical look thins out rather than merely fading. */
function scaleTexture(tx, scale) {
  if (!tx) return null;
  if (scale <= 0) {
    // Vector keeps the core glow — without it the innermost layer reads as a
    // flat disc and the cutaway loses its focal point — but nothing else.
    return tx.type === "glowcore" ? { ...tx, flat: true } : null;
  }
  const out = { ...tx, strength: scale };
  if (typeof tx.count === "number") {
    out.count = Math.max(1, Math.round(tx.count * (0.4 + scale * 0.6)));
  }
  if (typeof tx.density === "number") out.density = tx.density * scale;
  return out;
}

/* Apply a style to a profile, returning a new profile. Non-destructive so the
 * same base profile can be rendered in several styles for comparison. */
export function applyStyle(profile, styleId) {
  const style = STYLES[styleId] ? styleId : "artistic";
  if (style === "artistic") return profile;

  const g = GEOM[style];
  const texScale = TEXTURE_SCALE[style];

  const layers = profile.layers.map(layer => {
    const out = {
      ...layer,
      wobbleAmp: layer.wobbleAmp * g.wobble,
      noiseAmp: layer.noiseAmp * g.noise,
      texture: scaleTexture(layer.texture, texScale)
    };

    if (style === "vector") {
      // Crisp, fully opaque hairline boundaries read as draughtsmanship.
      out.edge = layer.edge
        ? { ...layer.edge, width: 0.0035, alpha: Math.min(1, layer.edge.alpha + 0.3) }
        : null;
      // Flatten translucent shells (old-star envelopes) so filters behave.
      out.alpha = layer.alpha == null ? 1 : Math.min(1, layer.alpha + 0.25);
      out.flatFill = true;
    } else {
      out.edge = layer.edge
        ? { ...layer.edge, alpha: Math.min(1, layer.edge.alpha + 0.12) }
        : null;
    }
    return out;
  });

  const effects = { ...profile.effects };

  if (style === "vector") {
    // Soft volumetric effects fight a technical read; keep them, but tighter
    // and weaker so the drawing stays graphic.
    if (effects.haze) effects.haze = { ...effects.haze, alpha: effects.haze.alpha * 0.5 };
    if (effects.corona) effects.corona = { ...effects.corona, alpha: effects.corona.alpha * 0.55 };
    if (effects.flares) effects.flares = { ...effects.flares, crisp: true };
    if (effects.oceanArc) effects.oceanArc = { ...effects.oceanArc, crisp: true };
  } else if (style === "semitech") {
    if (effects.haze) effects.haze = { ...effects.haze, alpha: effects.haze.alpha * 0.8 };
    if (effects.corona) effects.corona = { ...effects.corona, alpha: effects.corona.alpha * 0.85 };
  }

  return { ...profile, layers, effects, style };
}
