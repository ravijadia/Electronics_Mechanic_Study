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

/** Monostable output with a trigger every 5 pulse-widths: output HIGH for t = 1.1RC. */
export function monostableSignal(r: number, c: number, vcc: number): Sig {
  const tw = monostablePulseWidth(r, c);
  return pulse(1 / (5 * tw), vcc, 0.2);
}

/** Trigger input (pin 2) for the monostable view: idles HIGH, a short LOW dip starts each cycle. */
export function monostableTrigger(r: number, c: number, vcc: number): Sig {
  const period = 5 * monostablePulseWidth(r, c);
  return {fn: (t) => ((t / period) - Math.floor(t / period) < 0.04 ? 0 : vcc), period};
}

/**
 * Astable with the control voltage Vc on pin 5: the capacitor swings between Vc/2 and Vc
 * (Vc = 2/3 Vcc when pin 5 is only bypassed). Returns HIGH and LOW times.
 */
export function astableTimes(r1: number, r2: number, c: number, vcc: number, vControl: number): {tHigh: number; tLow: number} {
  const vc = Math.min(vControl, vcc - 0.05);
  return {
    tHigh: (r1 + r2) * c * Math.log((vcc - vc / 2) / (vcc - vc)),
    tLow: r2 * c * Math.LN2,
  };
}

export function vcoFreq(r1: number, r2: number, c: number, vcc: number, vControl: number): number {
  const {tHigh, tLow} = astableTimes(r1, r2, c, vcc, vControl);
  return 1 / (tHigh + tLow);
}

export function vcoDuty(r1: number, r2: number, c: number, vcc: number, vControl: number): number {
  const {tHigh, tLow} = astableTimes(r1, r2, c, vcc, vControl);
  return tHigh / (tHigh + tLow);
}

export function vcoSignal(r1: number, r2: number, c: number, vcc: number, vControl: number): Sig {
  return pulse(vcoFreq(r1, r2, c, vcc, vControl), vcc, vcoDuty(r1, r2, c, vcc, vControl));
}

/** Clock for the PWM circuit: fixed period, idles HIGH, short LOW dip triggers the monostable. */
export const PWM_CLOCK_HZ = 1000;

export function pwmClockSignal(vcc: number): Sig {
  const period = 1 / PWM_CLOCK_HZ;
  return {fn: (t) => ((t / period) - Math.floor(t / period) < 0.04 ? 0 : vcc), period};
}

/** Monostable with the control voltage Vc on pin 5: the capacitor only charges up to Vc, so t = RC ln(Vcc / (Vcc - Vc)). */
export function pwmWidth(r: number, c: number, vcc: number, vControl: number): number {
  return r * c * Math.log(vcc / (vcc - Math.min(vControl, vcc - 0.05)));
}

/** Pulse longer than the clock period: the next trigger arrives while the output is still HIGH. */
export function pwmStuck(width: number): boolean {
  return width >= 0.95 / PWM_CLOCK_HZ;
}

export function pwmDuty(width: number): number {
  return Math.min(1, width * PWM_CLOCK_HZ);
}

export function pwmSignal(width: number, vcc: number): Sig {
  if (pwmStuck(width)) return {fn: () => vcc, period: 1 / PWM_CLOCK_HZ};
  return pulse(PWM_CLOCK_HZ, vcc, width * PWM_CLOCK_HZ);
}
