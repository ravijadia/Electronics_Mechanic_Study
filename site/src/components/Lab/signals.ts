// Signal model for the oscilloscope and function generator practicals.

export interface Sig {
  /** Instantaneous value (V) at time t (s). */
  fn: (t: number) => number;
  /** Period (s); null for a steady DC level. */
  period: number | null;
}

const frac = (x: number) => x - Math.floor(x);

export const dc = (v: number): Sig => ({fn: () => v, period: null});

export const sine = (f: number, vpp: number, offset = 0): Sig => ({
  fn: (t) => offset + (vpp / 2) * Math.sin(2 * Math.PI * f * t),
  period: 1 / f,
});

export const square = (f: number, vpp: number, offset = 0, duty = 0.5): Sig => ({
  fn: (t) => offset + (frac(f * t) < duty ? vpp / 2 : -vpp / 2),
  period: 1 / f,
});

export const triangle = (f: number, vpp: number, offset = 0): Sig => ({
  fn: (t) => {
    const p = frac(f * t);
    const u = p < 0.25 ? p * 4 : p < 0.75 ? 2 - p * 4 : p * 4 - 4;
    return offset + (vpp / 2) * u;
  },
  period: 1 / f,
});

/** Half-wave rectified sine of peak vpk (e.g. a rectifier output). */
export const halfWave = (f: number, vpk: number): Sig => ({
  fn: (t) => Math.max(0, vpk * Math.sin(2 * Math.PI * f * t)),
  period: 1 / f,
});

/** Pulse train from 0 to v with the given duty cycle (e.g. a PWM or clock). */
export const pulse = (f: number, v: number, duty: number): Sig => ({
  fn: (t) => (frac(f * t) < duty ? v : 0),
  period: 1 / f,
});

export const add = (a: Sig, b: Sig): Sig => ({fn: (t) => a.fn(t) + b.fn(t), period: a.period ?? b.period});

export interface SigStats {
  max: number;
  min: number;
  pp: number;
  mean: number;
  rms: number;
  freq: number | null;
  period: number | null;
}

export function stats(s: Sig): SigStats {
  const T = s.period ?? 1;
  const n = 2000;
  let max = -Infinity;
  let min = Infinity;
  let sum = 0;
  let sq = 0;
  for (let k = 0; k < n; k++) {
    const v = s.fn((k / n) * T);
    max = Math.max(max, v);
    min = Math.min(min, v);
    sum += v;
    sq += v * v;
  }
  return {max, min, pp: max - min, mean: sum / n, rms: Math.sqrt(sq / n), freq: s.period ? 1 / s.period : null, period: s.period};
}

/** Engineering format: 0.002, 's' → "2 ms". */
export function si(x: number, unit: string, digits = 3): string {
  if (x === 0) return `0 ${unit}`;
  const a = Math.abs(x);
  const pre: [number, string][] = [
    [1e6, 'M'],
    [1e3, 'k'],
    [1, ''],
    [1e-3, 'm'],
    [1e-6, 'µ'],
    [1e-9, 'n'],
  ];
  const [m, p] = pre.find(([m]) => a >= m * 0.9995) ?? [1e-9, 'n'];
  const v = x / m;
  return `${Number(v.toPrecision(digits))} ${p}${unit}`;
}

export const VDIV = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20];
export const TDIV = [1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2, 0.1, 0.2, 0.5];
