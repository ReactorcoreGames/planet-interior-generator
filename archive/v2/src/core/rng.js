/* Seeded RNG + value noise. Deterministic across runs and platforms. */

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Simple seeded 2D value noise with fBm. */
export function makeNoise2D(seed) {
  const perm = new Uint8Array(512);
  const rng = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) vals[i] = rng();

  function latt(ix, iy) {
    return vals[perm[(perm[ix & 255] + iy) & 255]];
  }
  function smooth(t) { return t * t * (3 - 2 * t); }

  function noise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const sx = smooth(fx), sy = smooth(fy);
    const v00 = latt(ix, iy), v10 = latt(ix + 1, iy);
    const v01 = latt(ix, iy + 1), v11 = latt(ix + 1, iy + 1);
    return (v00 + (v10 - v00) * sx) * (1 - sy) + (v01 + (v11 - v01) * sx) * sy;
  }

  function fbm(x, y, octaves = 3) {
    let sum = 0, amp = 0.5, freq = 1, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise(x * freq, y * freq);
      norm += amp;
      amp *= 0.5; freq *= 2.1;
    }
    return sum / norm; // 0..1
  }

  return { noise, fbm };
}
