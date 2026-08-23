/* Small shared numeric helpers. */

export const TAU = Math.PI * 2;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
export const rrange = (rng, lo, hi) => lo + rng() * (hi - lo);

/* Fisher-Yates on a copy; used to draw N distinct items from a pool. */
export function shuffled(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

export function pickN(rng, arr, n) {
  return shuffled(rng, arr).slice(0, Math.min(n, arr.length));
}

/* Round to a sensible number of significant digits for display. */
export function sig(v, digits = 3) {
  if (v === 0) return 0;
  const mag = Math.floor(Math.log10(Math.abs(v)));
  const f = Math.pow(10, digits - 1 - mag);
  return Math.round(v * f) / f;
}
