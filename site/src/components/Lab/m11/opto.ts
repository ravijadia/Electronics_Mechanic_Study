// Opto-electronic device models for the Module 11 practicals.
import type {DiodeSpec} from '../m08/diode';

const VT = 0.02585;

export interface LedType {
  id: string;
  name: string;
  /** Glow colour. */
  colour: string;
  /** Forward voltage at 20 mA (V). */
  vf: number;
}

export const LEDS: LedType[] = [
  {id: 'red', name: 'Red', colour: '#ff3b30', vf: 2.0},
  {id: 'yellow', name: 'Yellow', colour: '#ffcc00', vf: 2.1},
  {id: 'green', name: 'Green', colour: '#34c759', vf: 2.2},
  {id: 'blue', name: 'Blue', colour: '#2f7bff', vf: 3.1},
  {id: 'white', name: 'White', colour: '#eef3ff', vf: 3.2},
];

/** Maximum continuous LED current (A) and reverse voltage (V). */
export const LED_IMAX = 0.035;
export const LED_VRMAX = 5;

/** Diode model of an LED that drops `vf20` at 20 mA. */
export function ledSpec(vf20: number): DiodeSpec {
  const n = 2;
  const rs = 8;
  return {is: 0.02 / Math.exp((vf20 - 0.02 * rs) / (n * VT)), n, rs, rrev: 2e9, imax: 1};
}

// ---------------------------------------------------------------------------
// Solar (photovoltaic) module: single-diode model
// ---------------------------------------------------------------------------

export interface PvSpec {
  /** Short-circuit current at 1000 W/m² (A). */
  isc: number;
  /** Open-circuit voltage at 1000 W/m² (V). */
  voc: number;
  cells: number;
  rs: number;
  rsh: number;
}

/** Terminal voltage and current of the module into a load `rl` (Ω; Infinity = open) at irradiance `g` (W/m²). */
export function pvOperate(p: PvSpec, g: number, rl: number): {v: number; i: number} {
  const a = p.cells * 1.3 * VT;
  const iph = (p.isc * g) / 1000;
  const is = p.isc / (Math.exp(p.voc / a) - 1);
  const iOut = (vj: number) => iph - is * (Math.exp(vj / a) - 1) - vj / p.rsh;
  let lo = 0;
  let hi = p.voc * 1.3;
  for (let k = 0; k < 80; k++) {
    const vj = (lo + hi) / 2;
    const i = iOut(vj);
    const g2 = isFinite(rl) ? vj - i * (p.rs + rl) : -i;
    if (g2 < 0) lo = vj;
    else hi = vj;
  }
  const i = Math.max(0, iOut(lo));
  return {v: isFinite(rl) ? i * rl : lo, i: isFinite(rl) ? i : 0};
}

// ---------------------------------------------------------------------------
// Light sensors (photodiode / phototransistor) driving a relay
// ---------------------------------------------------------------------------

export interface SensorSpec {
  pt: boolean;
  name: string;
  /** Light current per lux (A/lx) and dark current (A). */
  sens: number;
  dark: number;
  /** Driver stage: base–emitter drop (V) and current gain. */
  vbe: number;
  hfe: number;
  driver: string;
  /** Sensitivity preset: R = rMin × 100^(pos/100) (Ω). */
  rMin: number;
}

export const COIL_A = 0.03; // 12 V, 400 Ω relay coil
export const PICK_A = 0.024;
export const DROP_A = 0.009;

export const presetOhms = (s: SensorSpec, pos: number) => s.rMin * 100 ** (pos / 100);

/** Sensor current and driver collector (relay coil) current. */
export function sensorDrive(s: SensorSpec, lux: number, pos: number): {is: number; ic: number} {
  const is = s.dark + s.sens * lux;
  const ib = Math.max(0, is - s.vbe / presetOhms(s, pos));
  return {is, ic: Math.min(COIL_A, ib * s.hfe)};
}

/** Light level (lx) at which the relay picks up. */
export function pickLux(s: SensorSpec, pos: number): number {
  return (s.vbe / presetOhms(s, pos) + PICK_A / s.hfe - s.dark) / s.sens;
}

/** Steps of the light-source dimmer (lx). */
export const LUX_STEPS: number[] = (() => {
  const a = [0, 5];
  for (let x = 10; x <= 300; x += 10) a.push(x);
  for (let x = 325; x <= 500; x += 25) a.push(x);
  for (let x = 550; x <= 1000; x += 50) a.push(x);
  return a;
})();
