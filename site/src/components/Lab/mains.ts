// Mains socket model for Module 2 practicals (1.2.13 – 1.2.15).
//
// Holes are named as seen from the front of an Indian 3-pin socket:
//   E = top (earth), L = bottom-left, R = bottom-right.
// Correct wiring (IS 1293): phase on the right hole, neutral on the left.

export type Hole = 'L' | 'R' | 'E';

export type BoardFault =
  | 'healthy'
  | 'reversed'
  | 'noSupply'
  | 'openEarth'
  | 'poorEarth'
  | 'looseEarth'
  | 'lowVoltage';

export const FAULT_LABEL: Record<BoardFault, string> = {
  healthy: 'Healthy',
  reversed: 'Phase and neutral reversed',
  noSupply: 'No supply',
  openEarth: 'Earth open (broken earth wire)',
  poorEarth: 'Poor earth (high earth-pit resistance)',
  looseEarth: 'Loose earth connection at socket',
  lowVoltage: 'Low supply voltage',
};

export interface Board {
  id: number;
  fault: BoardFault;
  /** Phase-to-neutral voltage when healthy (V rms). */
  supplyV: number;
  /** Neutral-to-earth voltage (V rms). */
  vne: number;
  /** Earth-path resistance (Ω); Infinity when open. */
  re: number;
  /** Ghost reading a DMM shows on a floating earth. */
  phantom: number;
}

export function makeBoard(id: number, fault: BoardFault, rnd: () => number): Board {
  const base = Math.round(226 + rnd() * 10);
  return {
    id,
    fault,
    supplyV: fault === 'noSupply' ? 0 : fault === 'lowVoltage' ? Math.round(178 + rnd() * 12) : base,
    vne: Math.round((0.6 + rnd() * 1.1) * 10) / 10,
    re:
      fault === 'openEarth'
        ? Infinity
        : fault === 'poorEarth'
          ? Math.round(160 + rnd() * 80)
          : fault === 'looseEarth'
            ? Math.round(700 + rnd() * 600)
            : Math.round((1 + rnd() * 2) * 10) / 10,
    phantom: Math.round((38 + rnd() * 30) * 10) / 10,
  };
}

/** After an earthing repair the board behaves like a healthy one. */
export function repaired(b: Board): Board {
  return {...b, fault: 'healthy', re: 2};
}

function wiring(b: Board): Record<'L' | 'R', 'P' | 'N'> {
  return b.fault === 'reversed' ? {L: 'P', R: 'N'} : {L: 'N', R: 'P'};
}

/** Potential of a phase/neutral hole relative to true earth (V rms). */
export function holePotential(b: Board, h: Hole, mcbOn: boolean): number {
  if (h === 'E') return 0;
  if (!mcbOn || b.supplyV === 0) return 0;
  return wiring(b)[h] === 'P' ? b.supplyV : b.vne;
}

export const LAMP_OHMS = 529; // 100 W at 230 V
export const DMM_OHMS = 10e6;

/**
 * Voltage across an instrument of resistance `zi` connected between holes a
 * and b. `phantom` is set when the reading is a floating-earth ghost value.
 */
export function measure(
  b: Board,
  a: Hole,
  c: Hole,
  zi: number,
  mcbOn: boolean,
): {volts: number; phantom: boolean} {
  if (a === c) return {volts: 0, phantom: false};
  if (a !== 'E' && c !== 'E') {
    return {volts: Math.abs(holePotential(b, a, mcbOn) - holePotential(b, c, mcbOn)), phantom: false};
  }
  const other = holePotential(b, a === 'E' ? c : a, mcbOn);
  if (!isFinite(b.re)) {
    // Floating earth: a 10 MΩ meter picks up a capacitively coupled ghost
    // voltage; a low-resistance lamp sees nothing.
    if (zi >= 1e6 && other > 100) return {volts: b.phantom, phantom: true};
    return {volts: 0, phantom: false};
  }
  return {volts: (other * zi) / (zi + b.re), phantom: false};
}

/** Neon tester glows when the touched hole is live relative to the body. */
export function neonGlows(b: Board, h: Hole, mcbOn: boolean): boolean {
  return holePotential(b, h, mcbOn) > 90;
}

export type Glow = 'full' | 'dim' | 'none';
export function lampGlow(volts: number): {glow: Glow; level: number} {
  const level = Math.min(1, (volts / 230) ** 2);
  return {glow: level > 0.8 ? 'full' : level > 0.08 ? 'dim' : 'none', level};
}
export const GLOW_LABEL: Record<Glow, string> = {full: 'Full glow', dim: 'Dim', none: 'No glow'};

export const PAIRS: {id: string; a: Hole; b: Hole; label: string}[] = [
  {id: 'LR', a: 'L', b: 'R', label: 'Left – Right'},
  {id: 'RE', a: 'R', b: 'E', label: 'Right – Earth'},
  {id: 'LE', a: 'L', b: 'E', label: 'Left – Earth'},
];

export function pairOf(x: string | null, y: string | null): (typeof PAIRS)[number] | null {
  if (!x || !y) return null;
  return PAIRS.find((p) => (p.a === x && p.b === y) || (p.a === y && p.b === x)) ?? null;
}

export const HOLE_NAME: Record<Hole, string> = {L: 'left hole', R: 'right hole', E: 'earth (top) hole'};

// ---------- DMM on mains ----------

export const MAINS_DMM_FNS = [
  {fn: 'off', label: 'OFF'},
  {fn: 'acv750', label: 'AC V 750'},
  {fn: 'acv200', label: 'AC V 200'},
  {fn: 'dcv1000', label: 'DC V 1000'},
  {fn: 'ohm', label: 'Ω 2k'},
];

/** Display text for an AC voltage on a mains DMM function. */
export function dmmText(fn: string, volts: number, isAC = true): {text: string; unit: string} {
  if (fn === 'off') return {text: '', unit: ''};
  if (fn === 'acv750') return {text: isAC ? Math.round(volts).toString() : '0', unit: 'V AC'};
  if (fn === 'acv200') {
    if (!isAC) return {text: '0.0', unit: 'V AC'};
    return volts >= 200 ? {text: 'OL', unit: 'V AC'} : {text: volts.toFixed(1), unit: 'V AC'};
  }
  if (fn === 'dcv1000') return {text: isAC ? '0' : Math.round(volts).toString(), unit: 'V DC'};
  return {text: 'OL', unit: 'Ω'};
}
