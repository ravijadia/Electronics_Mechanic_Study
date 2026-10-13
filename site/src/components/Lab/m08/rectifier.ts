// Rectifier and capacitor-filter model (Module 8). Mains is 50 Hz.
import type {Sig} from '../signals';

export type RectType = 'hw' | 'fw' | 'bridge';
export const F_MAINS = 50;
export const VD = 0.7;

/**
 * Bridge diodes D1–D4 between nodes, anode → cathode, when fitted correctly:
 * D1 AC1→P, D2 AC2→P, D3 M→AC1, D4 M→AC2.
 */
const BRIDGE: [string, string][] = [
  ['AC1', 'P'],
  ['AC2', 'P'],
  ['M', 'AC1'],
  ['M', 'AC2'],
];

function reach(edges: [string, string][], from: string, to: string): boolean {
  const seen = new Set([from]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [a, b] of edges) if (seen.has(a) && !seen.has(b)) (seen.add(b), (grew = true));
  }
  return seen.has(to);
}

export interface RectResult {
  /** Secondary voltage driving the rectifier (across the whole winding used). */
  input: Sig;
  output: Sig;
  /** Transformer secondary short-circuited by a wrongly fitted diode. */
  short: boolean;
}

/**
 * `fit[i]`: 1 = diode i fitted correctly, −1 = reversed, 0 = not fitted.
 * `vrms` is the voltage of the winding used (each half for a centre-tapped
 * full-wave rectifier).
 */
export function rectify(type: RectType, fit: number[], vrms: number, c: number, rl: number): RectResult {
  const vm = vrms * Math.SQRT2;
  const w = 2 * Math.PI * F_MAINS;
  const input: Sig = {fn: (t) => vm * Math.sin(w * t), period: 1 / F_MAINS};

  // Output with no capacitor (signed), and whether the winding is shorted.
  let short = false;
  let raw: (v: number) => number;
  if (type === 'hw') {
    raw = (v) => (fit[0] === 1 ? Math.max(0, v - VD) : fit[0] === -1 ? Math.min(0, v + VD) : 0);
  } else if (type === 'fw') {
    // D1 from the top end, D2 from the bottom end (which is at −v).
    if (fit[0] && fit[1] && fit[0] !== fit[1]) short = true;
    raw = (v) => {
      const d1 = fit[0] === 1 ? Math.max(0, v - VD) : fit[0] === -1 ? Math.min(0, v + VD) : 0;
      const d2 = fit[1] === 1 ? Math.max(0, -v - VD) : fit[1] === -1 ? Math.min(0, -v + VD) : 0;
      return d1 + d2;
    };
  } else {
    const edges = BRIDGE.flatMap(([a, b], k) => (fit[k] === 1 ? [[a, b]] : fit[k] === -1 ? [[b, a]] : []) as [string, string][]);
    short = reach(edges, 'AC1', 'AC2') || reach(edges, 'AC2', 'AC1');
    const half = (hi: string, lo: string) => (reach(edges, hi, 'P') && reach(edges, 'M', lo) ? 1 : reach(edges, hi, 'M') && reach(edges, 'P', lo) ? -1 : 0);
    const pos = half('AC1', 'AC2');
    const neg = half('AC2', 'AC1');
    raw = (v) => {
      const s = v >= 0 ? pos : neg;
      return s * Math.max(0, Math.abs(v) - 2 * VD);
    };
  }
  if (short) return {input, output: {fn: () => 0, period: 1 / F_MAINS}, short};

  if (!c) return {input, output: {fn: (t) => raw(input.fn(t)), period: 1 / F_MAINS}, short};

  // Capacitor filter: charges to the peak, then discharges through the load.
  const n = 4000;
  const T = 1 / F_MAINS;
  const dt = T / n;
  const k = Math.exp(-dt / (rl * c));
  let vc = 0;
  const out = new Float64Array(n);
  for (let p = 0; p < 6; p++) {
    for (let i = 0; i < n; i++) {
      const a = Math.abs(raw(input.fn(i * dt)));
      vc = Math.max(a, vc * k);
      out[i] = vc;
    }
  }
  const sign = raw(vm) < 0 || raw(-vm) < 0 ? -1 : 1;
  return {input, output: {fn: (t) => sign * out[Math.floor(((((t / T) % 1) + 1) % 1) * n) % n], period: T}, short};
}

/** DC (mean) and AC (rms of the ripple) values of a periodic signal. */
export function dcAc(s: Sig): {dc: number; ac: number; pp: number} {
  const T = s.period ?? 1;
  const n = 2000;
  let sum = 0;
  let sq = 0;
  let mx = -Infinity;
  let mn = Infinity;
  for (let i = 0; i < n; i++) {
    const v = s.fn((i / n) * T);
    sum += v;
    sq += v * v;
    mx = Math.max(mx, v);
    mn = Math.min(mn, v);
  }
  const dc = sum / n;
  return {dc, ac: Math.sqrt(Math.max(0, sq / n - dc * dc)), pp: mx - mn};
}
