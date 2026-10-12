// Pure circuit model for the Ohm's law bench. No React here, so it can be
// reused by later practicals and reasoned about on its own.
//
//   + ──[fuse-free supply, Rint]── SW ── [Slot A] ──┬── R ──┬── −
//                                                   └─[Slot B]┘
//
// Slot A sits in line with the resistor (where an ammeter belongs).
// Slot B sits across the resistor (where a voltmeter belongs).

export type MeterFn = 'off' | 'V20' | 'V2' | 'mA200' | 'mA20';

export interface MeterState {
  fn: MeterFn;
  reversed: boolean;
  fuseBlown: boolean;
}

export type SlotA = 'open' | 'link' | 'm1' | 'm2';
export type SlotB = 'empty' | 'm1' | 'm2';

export interface ResistorSpec {
  id: string;
  /** Colour-code value in ohms. */
  nominal: number;
  /** Colour bands, e.g. ['brown', 'black', 'red', 'gold']. */
  bands: string[];
  /** Power rating in watts. */
  rating: number;
}

export const RESISTORS: ResistorSpec[] = [
  {id: 'R-A', nominal: 100, bands: ['brown', 'black', 'brown', 'gold'], rating: 0.5},
  {id: 'R-B', nominal: 470, bands: ['yellow', 'violet', 'brown', 'gold'], rating: 0.25},
  {id: 'R-C', nominal: 1000, bands: ['brown', 'black', 'red', 'gold'], rating: 0.25},
  {id: 'R-D', nominal: 2200, bands: ['red', 'red', 'red', 'gold'], rating: 0.25},
];

export const BAND_HEX: Record<string, string> = {
  black: '#1b1b1b',
  brown: '#7a4a1f',
  red: '#d4302a',
  orange: '#ef7d1a',
  yellow: '#f2c81f',
  green: '#2f9a3c',
  blue: '#2b5fd1',
  violet: '#8a3fc2',
  grey: '#8a8a8a',
  white: '#f5f5f5',
  gold: '#c9a227',
  silver: '#c0c0c0',
};

/** Bench supply internal resistance (Ω). */
export const R_SUPPLY = 0.2;
/** Resistance of a link wire (Ω). */
export const R_LINK = 0.02;
/** A DMM's internal mA fuse rating (A). */
export const METER_FUSE_A = 0.25;

export const METER_FNS: {fn: MeterFn; label: string}[] = [
  {fn: 'off', label: 'OFF'},
  {fn: 'V20', label: 'DC V 20'},
  {fn: 'V2', label: 'DC V 2'},
  {fn: 'mA200', label: 'DC mA 200'},
  {fn: 'mA20', label: 'DC mA 20'},
];

export function isVoltMode(fn: MeterFn): boolean {
  return fn === 'V20' || fn === 'V2';
}
export function isAmpMode(fn: MeterFn): boolean {
  return fn === 'mA200' || fn === 'mA20';
}

/** Internal resistance of a DMM in a given mode (Ω). Off or blown = open. */
export function meterResistance(m: MeterState): number {
  if (m.fn === 'off') return Infinity;
  if (isVoltMode(m.fn)) return 10e6;
  if (m.fuseBlown) return Infinity;
  return m.fn === 'mA200' ? 1 : 10;
}

function par(a: number, b: number): number {
  if (!isFinite(a)) return b;
  if (!isFinite(b)) return a;
  return (a * b) / (a + b);
}

export interface MeterReading {
  /** Display text, e.g. "5.02", "OL", "" when off. */
  text: string;
  /** Value in display units (V or mA), signed; null when off or OL. */
  value: number | null;
  unit: 'V' | 'mA' | '';
  /** Current through the meter (A), used for fuse checks. */
  current: number;
}

export interface BenchState {
  setVolts: number;
  powerOn: boolean;
  slotA: SlotA;
  slotB: SlotB;
  meters: {m1: MeterState; m2: MeterState};
  /** Actual resistance of the fitted resistor (Ω); Infinity if burnt open. */
  rActual: number;
}

export interface BenchResult {
  current: number; // through the resistor branch + slot B, in A
  vResistor: number; // across R
  pResistor: number; // W
  open: boolean; // no path for current
  readings: {m1: MeterReading; m2: MeterReading};
  terminalVolts: number;
}

function formatReading(m: MeterState, quantity: number, current: number): MeterReading {
  if (m.fn === 'off') return {text: '', value: null, unit: '', current};
  const volt = isVoltMode(m.fn);
  const unit = volt ? 'V' : 'mA';
  const shown = volt ? quantity : quantity * 1000;
  const sign = m.reversed ? -1 : 1;
  const range = m.fn === 'V20' ? 20 : m.fn === 'V2' ? 2 : m.fn === 'mA200' ? 200 : 20;
  const decimals = m.fn === 'V20' ? 2 : m.fn === 'V2' ? 3 : m.fn === 'mA200' ? 1 : 2;
  if (Math.abs(shown) >= range) return {text: 'OL', value: null, unit, current};
  const rounded = Number((sign * shown).toFixed(decimals));
  const text = (rounded === 0 ? 0 : rounded).toFixed(decimals);
  return {text, value: Number(text), unit, current};
}

export function solve(s: BenchState): BenchResult {
  const meterOf = (k: 'm1' | 'm2') => s.meters[k];
  const zA =
    s.slotA === 'open'
      ? Infinity
      : s.slotA === 'link'
        ? R_LINK
        : meterResistance(meterOf(s.slotA));
  const zB = s.slotB === 'empty' ? Infinity : meterResistance(meterOf(s.slotB));
  const rPar = par(s.rActual, zB);
  const total = R_SUPPLY + zA + rPar;

  const open = !s.powerOn || !isFinite(total);
  const i = open ? 0 : s.setVolts / total;
  const vPar = i * (isFinite(rPar) ? rPar : 0);
  const vA = i * (isFinite(zA) ? zA : 0);
  const iR = isFinite(s.rActual) ? vPar / s.rActual : 0;
  const iB = isFinite(zB) ? vPar / zB : 0;

  // A voltmeter in slot A with nothing else in the loop still reads the supply
  // (it is the only path, so the whole source voltage appears across it).
  const reading = (k: 'm1' | 'm2'): MeterReading => {
    const m = meterOf(k);
    if (s.slotA === k) {
      return formatReading(m, isVoltMode(m.fn) ? vA : i, i);
    }
    if (s.slotB === k) {
      return formatReading(m, isVoltMode(m.fn) ? vPar : iB, iB);
    }
    return formatReading(m, 0, 0);
  };

  return {
    current: i,
    vResistor: vPar,
    pResistor: iR * iR * (isFinite(s.rActual) ? s.rActual : 0),
    open,
    readings: {m1: reading('m1'), m2: reading('m2')},
    terminalVolts: s.powerOn ? s.setVolts - i * R_SUPPLY : 0,
  };
}

/** Deterministic PRNG so a bench "kit" keeps the same resistor values. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Actual values for each resistor in a kit: within ±5 % of the colour code. */
export function kitValues(seed: number): Record<string, number> {
  const rnd = mulberry32(seed);
  const out: Record<string, number> = {};
  for (const r of RESISTORS) {
    const err = (rnd() * 2 - 1) * 0.045;
    out[r.id] = Math.round(r.nominal * (1 + err) * 10) / 10;
  }
  return out;
}

/** Least-squares slope of V = R·I through the origin. I in A, V in V. */
export function fitResistance(points: {v: number; iA: number}[]): number | null {
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += p.v * p.iA;
    den += p.iA * p.iA;
  }
  return den > 0 ? num / den : null;
}

export function formatOhms(r: number): string {
  if (r >= 1000) return `${(r / 1000).toFixed(r >= 10000 ? 1 : 2)} kΩ`;
  return `${r.toFixed(r >= 100 ? 0 : 1)} Ω`;
}
