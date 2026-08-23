/* A recording stub of CanvasRenderingContext2D.
 * Exercises every drawing code path without a rasterizer, and flags the
 * failure modes that actually matter here: NaN/Infinity geometry, malformed
 * color strings, and gradient stops outside 0..1. */

export function makeStubCanvas(width = 1280, height = 720) {
  const issues = [];
  const calls = [];
  let opCount = 0;

  const isBadNum = v => typeof v === "number" && !Number.isFinite(v);

  function checkNums(op, args) {
    args.forEach((a, i) => {
      if (isBadNum(a)) issues.push(`${op}: non-finite numeric arg #${i} (${a})`);
    });
  }

  const COLOR_RE = /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgba?\(\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+\s*(,\s*-?[\d.]+\s*)?\)|transparent)$/;

  function checkColor(where, v) {
    if (typeof v !== "string") return;
    if (v.includes("NaN") || v.includes("undefined") || v.includes("null")) {
      issues.push(`${where}: malformed color "${v}"`);
      return;
    }
    if (!COLOR_RE.test(v.trim())) {
      issues.push(`${where}: unrecognized color "${v}"`);
    }
  }

  function makeGradient(kind, coords) {
    checkNums(`create${kind}Gradient`, coords);
    return {
      __gradient: kind,
      addColorStop(offset, color) {
        if (isBadNum(offset) || offset < 0 || offset > 1) {
          issues.push(`addColorStop: offset out of range (${offset})`);
        }
        checkColor("addColorStop", color);
      }
    };
  }

  const state = {
    fillStyle: "#000", strokeStyle: "#000", lineWidth: 1,
    globalAlpha: 1, globalCompositeOperation: "source-over",
    font: "10px sans-serif", textAlign: "start", textBaseline: "alphabetic",
    lineCap: "butt", lineJoin: "miter"
  };
  const stack = [];

  const ctx = {
    canvas: { width, height },

    save() { stack.push({ ...state }); },
    restore() {
      if (!stack.length) { issues.push("restore() with empty stack"); return; }
      Object.assign(state, stack.pop());
    },

    beginPath() { opCount++; },
    closePath() {},
    moveTo(...a) { checkNums("moveTo", a); opCount++; },
    lineTo(...a) { checkNums("lineTo", a); opCount++; },
    /* Arcs are RECORDED, not merely counted, because their centre and radius
     * are the only handle a probe has on WHERE the body was drawn — which is
     * what the composed export's layout assertion needs. Cheap: four numbers
     * per call, and only the geometry, never the paint. */
    arc(...a) {
      checkNums("arc", a);
      calls.push({ op: "arc", x: a[0], y: a[1], r: a[2] });
      opCount++;
    },
    arcTo(...a) { checkNums("arcTo", a); opCount++; },
    ellipse(...a) { checkNums("ellipse", a); opCount++; },
    quadraticCurveTo(...a) { checkNums("quadraticCurveTo", a); opCount++; },
    bezierCurveTo(...a) { checkNums("bezierCurveTo", a); opCount++; },
    rect(...a) { checkNums("rect", a); opCount++; },

    fill(rule) { checkColor("fill/fillStyle", state.fillStyle); opCount++; },
    stroke() { checkColor("stroke/strokeStyle", state.strokeStyle); opCount++; },
    fillRect(...a) { checkNums("fillRect", a); checkColor("fillRect", state.fillStyle); opCount++; },
    strokeRect(...a) { checkNums("strokeRect", a); opCount++; },
    clearRect(...a) { checkNums("clearRect", a); opCount++; },
    clip() { opCount++; },

    fillText(text, ...a) {
      checkNums("fillText", a);
      if (text == null || String(text).includes("undefined") || String(text).includes("NaN")) {
        issues.push(`fillText: suspicious text "${text}"`);
      }
      checkColor("fillText", state.fillStyle);
      calls.push({ op: "fillText", text: String(text) });
      opCount++;
    },
    strokeText(text, ...a) { checkNums("strokeText", a); opCount++; },
    measureText(t) { return { width: String(t).length * 6 }; },

    translate(...a) { checkNums("translate", a); },
    rotate(...a) { checkNums("rotate", a); },
    scale(...a) { checkNums("scale", a); },
    setTransform(...a) { checkNums("setTransform", a); },
    setLineDash(arr) { (arr || []).forEach((v, i) => { if (isBadNum(v)) issues.push(`setLineDash: non-finite [${i}]`); }); },
    getLineDash() { return []; },

    createRadialGradient(...a) { return makeGradient("Radial", a); },
    createLinearGradient(...a) { return makeGradient("Linear", a); },
    createPattern() { return null; },
    drawImage() { opCount++; },

    toDataURL() { return "data:image/png;base64,"; }
  };

  // Property setters validate colors as they're assigned.
  for (const key of Object.keys(state)) {
    Object.defineProperty(ctx, key, {
      get: () => state[key],
      set: v => {
        if (key === "fillStyle" || key === "strokeStyle") {
          if (typeof v === "string") checkColor(key, v);
        }
        if (key === "lineWidth" && isBadNum(v)) issues.push("lineWidth: non-finite");
        if (key === "globalAlpha" && (isBadNum(v) || v < 0 || v > 1)) {
          issues.push(`globalAlpha out of range (${v})`);
        }
        if (key === "font" && String(v).includes("NaN")) issues.push(`font: "${v}"`);
        state[key] = v;
      }
    });
  }

  return {
    width, height,
    getContext: () => ctx,
    toDataURL: () => "data:image/png;base64,",
    __issues: issues,
    __calls: calls,
    __opCount: () => opCount,
    __stackDepth: () => stack.length
  };
}
