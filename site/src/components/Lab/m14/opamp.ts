// Ideal op-amp models for the Module 14 practicals (1.14.127 - 1.14.132).
// Every circuit is analysed with the two "golden rules": no input current,
// equal input voltages under feedback. Output is clipped to the supply rails.
import type {Sig} from '../signals';

/** Output saturation voltage for a given supply (741 typically swings to within ~1.5 V of the rail). */
export const vsat = (vcc = 15): number => vcc - 1.5;

export function clip(v: number, sat: number): number {
  return Math.max(-sat, Math.min(sat, v));
}

export function invAmp(vin: number, rin: number, rf: number, vcc = 15): number {
  return clip(-(rf / rin) * vin, vsat(vcc));
}

export function nonInvAmp(vin: number, rin: number, rf: number, vcc = 15): number {
  return clip((1 + rf / rin) * vin, vsat(vcc));
}

export function summingAmp(ins: {v: number; r: number}[], rf: number, vcc = 15): number {
  const sum = ins.reduce((s, i) => s + i.v / i.r, 0);
  return clip(-rf * sum, vsat(vcc));
}

/** 3-op-amp instrumentation amplifier: gain set by a single resistor Rgain between the two input buffers. */
export function instrumentationAmp(v1: number, v2: number, rGain: number, r: number, vcc = 15): number {
  const gain = 1 + (2 * r) / rGain;
  return clip(gain * (v2 - v1), vsat(vcc));
}

export function inAmpGain(rGain: number, r: number): number {
  return 1 + (2 * r) / rGain;
}

/** Open-loop comparator with Vref = 0: output snaps to +Vsat / -Vsat as the input crosses zero. */
export function zeroCrossSignal(sig: Sig, vcc = 15): Sig {
  const sat = vsat(vcc);
  return {fn: (t) => (sig.fn(t) >= 0 ? sat : -sat), period: sig.period};
}

/** Differentiator: Vout = -RC(dVin/dt), found by a central-difference numeric derivative. */
export function differentiatorSignal(sig: Sig, r: number, c: number, vcc = 15): Sig {
  const sat = vsat(vcc);
  const T = sig.period ?? 1;
  const h = T / 4000;
  return {
    fn: (t) => clip(-r * c * ((sig.fn(t + h) - sig.fn(t - h)) / (2 * h)), sat),
    period: sig.period,
  };
}

/** Integrator: Vout = -(1/RC)∫Vin dt, found numerically over one period and re-centred (assumes a zero-mean AC input). */
export function integratorSignal(sig: Sig, r: number, c: number, vcc = 15): Sig {
  const sat = vsat(vcc);
  const T = sig.period ?? 1;
  const n = 400;
  const dt = T / n;
  const acc: number[] = [0];
  let running = 0;
  for (let k = 0; k < n; k++) {
    running += sig.fn(k * dt) * dt;
    acc.push(running);
  }
  const mean = acc.reduce((s, v) => s + v, 0) / acc.length;
  const scale = -1 / (r * c);
  return {
    fn: (t) => {
      const tt = ((t % T) + T) % T;
      const k = Math.min(n, Math.max(0, Math.round(tt / dt)));
      return clip((acc[k] - mean) * scale, sat);
    },
    period: sig.period,
  };
}

// ---------------------------------------------------------------------------
// 1.14.132 Digital-to-analog converters
// ---------------------------------------------------------------------------

/** Binary-weighted-resistor DAC (summing amplifier, Rf = R, weights R:2R:4R:8R…). bits[0] is the LSB. */
export function binaryWeightedDac(bits: boolean[], vref: number): number {
  return vref * bits.reduce((s, b, i) => s + (b ? 1 / 2 ** i : 0), 0);
}

/** R-2R ladder DAC: evenly-spaced steps of Vref/2^n. bits[0] is the LSB. */
export function r2rDac(bits: boolean[], vref: number): number {
  const n = bits.length;
  const code = bits.reduce((s, b, i) => s + (b ? 2 ** i : 0), 0);
  return (vref * code) / 2 ** n;
}

export function bitsToCode(bits: boolean[]): number {
  return bits.reduce((s, b, i) => s + (b ? 2 ** i : 0), 0);
}
