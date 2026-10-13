// Diode and zener model for the Module 8 practicals.

export interface DiodeSpec {
  /** Saturation current (A) and ideality factor. */
  is: number;
  n: number;
  /** Bulk series resistance (Ω). */
  rs: number;
  /** Reverse leakage resistance below breakdown (Ω). */
  rrev: number;
  /** Zener voltage and dynamic resistance; omit for an ordinary diode. */
  vz?: number;
  rz?: number;
  /** Maximum forward / zener current before it burns (A). */
  imax: number;
}

const VT = 0.02585;

export const SI: DiodeSpec = {is: 4e-9, n: 1.9, rs: 0.08, rrev: 800e6, imax: 1};
export const SIGNAL: DiodeSpec = {is: 3e-9, n: 1.85, rs: 0.6, rrev: 1e9, vz: 110, rz: 50, imax: 0.2};
export const GE: DiodeSpec = {is: 2e-6, n: 1.15, rs: 2, rrev: 350e3, imax: 0.05};
export const zener = (vz: number, watts = 0.5): DiodeSpec => ({is: 4e-9, n: 1.9, rs: 0.5, rrev: 200e6, vz, rz: vz < 6 ? 12 : 6, imax: watts / vz});

/** Forward voltage at a forward current. */
export function vForward(d: DiodeSpec, i: number): number {
  return d.n * VT * Math.log(i / d.is + 1) + i * d.rs;
}

/**
 * Source `vs` (signed: + means forward bias) in series with `r` and the diode.
 * Returns the current (A, + forward) and the diode voltage (V, + forward).
 */
export function solveSeries(d: DiodeSpec, vs: number, r: number): {i: number; vd: number} {
  // A burnt (open) diode: is = 0 and infinite leakage resistance.
  if (vs >= 0 && d.is === 0) return {i: 0, vd: vs};
  if (vs >= 0) {
    let lo = 0;
    let hi = vs / Math.max(r, 1e-3);
    for (let k = 0; k < 80; k++) {
      const mid = (lo + hi) / 2;
      if (vs - mid * r - vForward(d, mid) > 0) lo = mid;
      else hi = mid;
    }
    return {i: lo, vd: vForward(d, lo)};
  }
  const vr = -vs;
  if (!isFinite(d.rrev) && d.vz == null) return {i: 0, vd: -vr};
  // Leakage resistance first; if that would put more than Vz across it, it breaks down.
  const iLeak = vr / (r + d.rrev);
  if (d.vz != null && iLeak * d.rrev > d.vz) {
    const i = (vr - d.vz) / (r + d.rz!);
    return {i: -i, vd: -(d.vz + i * d.rz!)};
  }
  return {i: -iLeak, vd: -iLeak * d.rrev};
}
