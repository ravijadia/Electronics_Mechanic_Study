// Simple BJT (NPN) model for the Module 9 practicals: DC bias points and
// small-signal gain. Voltages in V, currents in A.

export const VBE = 0.65;
export const VCE_SAT = 0.2;
export const VT = 0.026;

export interface Q {
  ib: number;
  ic: number;
  vb: number;
  ve: number;
  vc: number;
  vce: number;
  sat: boolean;
}

/**
 * Bias point for a transistor with base Thevenin source (vth, rth), emitter
 * resistor re and collector resistor rc from vcc.
 */
export function biasPoint(vcc: number, vth: number, rth: number, rc: number, re: number, beta: number): Q {
  let ib = Math.max(0, (vth - VBE) / (rth + (beta + 1) * re));
  let ic = beta * ib;
  let ve = (ib + ic) * re;
  let vc = vcc - ic * rc;
  let sat = false;
  if (vc - ve < VCE_SAT) {
    // Saturated: Ic set by the collector circuit, base takes what it can.
    sat = true;
    const icSat = (vcc - VCE_SAT) / (rc + re);
    ic = Math.max(0, icSat);
    ib = Math.max(0, (vth - VBE - ic * re) / (rth + re));
    ve = (ib + ic) * re;
    vc = ve + VCE_SAT;
  }
  return {ib, ic, vb: ve + (ib > 0 ? VBE : Math.min(vth, VBE)), ve, vc, vce: vc - ve, sat};
}

export type BiasKind = 'fixed' | 'emitter' | 'divider';

export interface BiasValues {
  vcc: number;
  rb?: number;
  r1?: number;
  r2?: number;
  rc: number;
  re: number;
}

export function biasOf(kind: BiasKind, v: BiasValues, beta: number): Q {
  if (kind === 'divider') {
    const vth = (v.vcc * v.r2!) / (v.r1! + v.r2!);
    const rth = (v.r1! * v.r2!) / (v.r1! + v.r2!);
    return biasPoint(v.vcc, vth, rth, v.rc, v.re, beta);
  }
  return biasPoint(v.vcc, v.vcc, v.rb!, v.rc, kind === 'fixed' ? 0 : v.re, beta);
}

export const par = (a: number, b: number) => (isFinite(a) ? (isFinite(b) ? (a * b) / (a + b) : a) : b);

/** Voltage gain magnitude of a CE stage. `reUnbypassed` is the emitter resistance left in the signal path. */
export function ceGain(q: Q, rc: number, rl: number, reUnbypassed: number): number {
  if (q.ic <= 0 || q.sat) return 0;
  const re = VT / q.ic;
  return par(rc, rl) / (re + reUnbypassed);
}

/** Output swing limits around the Q point for a CE stage (V, relative to Vc). */
export function ceSwing(q: Q, rc: number, rl: number): {up: number; down: number} {
  return {up: q.ic * par(rc, rl), down: Math.max(0, q.vce - VCE_SAT)};
}

/** First-order high-pass gain factor and phase lead (rad) at f for corner fc. */
export function hp(f: number, fc: number): {mag: number; ph: number} {
  const x = f / fc;
  return {mag: x / Math.sqrt(1 + x * x), ph: Math.atan2(1, x)};
}
/** First-order low-pass gain factor and phase lag (rad, negative). */
export function lp(f: number, fc: number): {mag: number; ph: number} {
  const x = f / fc;
  return {mag: 1 / Math.sqrt(1 + x * x), ph: -Math.atan(x)};
}
