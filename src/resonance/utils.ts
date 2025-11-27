// random id generator
export function rid(prefix: string) {
  const r = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${r}`;
}

// derive harmonic pattern from vector magnitudes
export function deriveHarmonics(vec: number[]): number[] {
  const h = [];
  for (let i = 1; i <= Math.min(8, vec.length); i++) {
    const sample = vec.filter((_, idx) => idx % i === 0);
    const avg = sample.reduce((a, b) => a + b, 0) / (sample.length || 1);
    h.push(Number(avg.toFixed(4)));
  }
  return h;
}

// vector add
export function vecAdd(a: number[], b: number[]) {
  const len = Math.max(a.length, b.length);
  const out = [];
  for (let i = 0; i < len; i++) {
    out.push((a[i] || 0) + (b[i] || 0));
  }
  return out;
}

// vector magnitude
export function magnitude(v: number[]) {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}
