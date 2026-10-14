// IC 555 timer models for the Module 14 practicals (1.14.133 - 1.14.136).
import {pulse, type Sig} from '../signals';

export function astableFreq(r1: number, r2: number, c: number): number {
  return 1.44 / ((r1 + 2 * r2) * c);
}

export function astableDuty(r1: number, r2: number): number {
  return (r1 + r2) / (r1 + 2 * r2);
}

export function astableSignal(r1: number, r2: number, c: number, vcc: number): Sig {
  return pulse(astableFreq(r1, r2, c), vcc, astableDuty(r1, r2));
}

export function monostablePulseWidth(r: number, c: number): number {
  return 1.1 * r * c;
}

/** Free-running view of the monostable pulse: one trigger every 5 pulse-widths, for the scope trace. */
export function monostableSignal(r: number, c: number, vcc: number): Sig {
  const tw = monostablePulseWidth(r, c);
  return pulse(1 / (5 * tw), vcc, 0.2);
}

/**
 * Simplified VCO: driving pin 5 (control voltage) away from its default 2/3 Vcc
 * moves the threshold level, so frequency scales inversely with the control voltage.
 */
export function vcoFreq(r1: number, r2: number, c: number, vcc: number, vControl: number): number {
  const f0 = astableFreq(r1, r2, c);
  const vcDefault = (2 / 3) * vcc;
  return f0 * (vcDefault / Math.max(0.1, vControl));
}

export function vcoSignal(r1: number, r2: number, c: number, vcc: number, vControl: number): Sig {
  return pulse(vcoFreq(r1, r2, c, vcc, vControl), vcc, astableDuty(r1, r2));
}

/** Simplified PWM mode: the control voltage sets duty cycle, frequency stays near the free-running value. */
export function pwmDuty(vcc: number, vControl: number): number {
  return Math.max(0.05, Math.min(0.95, vControl / vcc));
}

export function pwmSignal(r1: number, r2: number, c: number, vcc: number, vControl: number): Sig {
  return pulse(astableFreq(r1, r2, c), vcc, pwmDuty(vcc, vControl));
}
