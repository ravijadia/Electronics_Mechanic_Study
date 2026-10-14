// Ideal op-amp models for the Module 14 practicals (1.14.127 - 1.14.132).
// Every circuit is analysed with the two "golden rules": no input current,
// equal input voltages under feedback. Output is clipped to the supply rails.
import type {Sig} from '../signals';

/** Output saturation voltage for a given supply (741 typically swings to within ~1.5 V of the rail). */
export const vsat = (vcc = 15): number => vcc - 1.5;

export function clip(v: number, sat: number): number {
  return Math.max(-sat, Math.min(sat, v));
}

export const isSaturated = (v: number, vcc = 15): boolean => Math.abs(v) >= vsat(vcc) - 1e-9;

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

/**
 * 3-op-amp instrumentation amplifier: gain set by a single resistor Rgain between the two input buffers.
 * `cmLeak` is the common-mode gain left over by mismatched resistors in the output stage (0 = perfectly matched).
 */
export function instrumentationAmp(v1: number, v2: number, rGain: number, r: number, vcc = 15, cmLeak = 0): number {
  const gain = 1 + (2 * r) / rGain;
  return clip(gain * (v2 - v1) + cmLeak * ((v1 + v2) / 2), vsat(vcc));
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
  const h = T / 400;
  return {
    fn: (t) => clip(-r * c * ((sig.fn(t + h) - sig.fn(t - h)) / (2 * h)), sat),
    period: sig.period,
  };
}

/**
 * Integrator: Vout = -(1/RC)∫Vin dt, found numerically over one period and re-centred.
 * An input with a DC component has nothing to re-centre on: the output ramps into the rail.
 */
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
  const dcIn = running / T;
  if (Math.abs(dcIn) > 0.01) {
    const rail = dcIn > 0 ? -sat : sat;
    return {fn: () => rail, period: sig.period};
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
// 1.14.132 Digital-to-analog converters  (bits[0] is the LSB, bits[n-1] the MSB)
// ---------------------------------------------------------------------------

/**
 * Binary-weighted-resistor DAC: inverting summing amplifier with input resistors R, 2R, 4R, 8R
 * (MSB to LSB) and Rf = R/2, so one step is Vref/16 and the output is negative.
 * `errs` is the fractional error of each bit's input resistor weight.
 */
export function binaryWeightedDac(bits: boolean[], vref: number, errs: number[] = []): number {
  const n = bits.length;
  return -vref * bits.reduce((s, b, i) => s + (b ? ((2 ** i) / 2 ** n) * (1 + (errs[i] ?? 0)) : 0), 0);
}

/** R-2R ladder DAC (buffered, non-inverting): evenly-spaced positive steps of Vref/2^n. */
export function r2rDac(bits: boolean[], vref: number, errs: number[] = []): number {
  const n = bits.length;
  return vref * bits.reduce((s, b, i) => s + (b ? ((2 ** i) / 2 ** n) * (1 + (errs[i] ?? 0)) : 0), 0);
}

export function bitsToCode(bits: boolean[]): number {
  return bits.reduce((s, b, i) => s + (b ? 2 ** i : 0), 0);
}
