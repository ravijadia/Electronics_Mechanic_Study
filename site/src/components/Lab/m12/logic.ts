// Gate-level model for the Module 12 digital logic practicals.
// A "bit" can be null: a net with no path to VCC, GND or a switch (floating).

export type Bit = boolean | null;

export interface GatePin {
  /** Input pin numbers (1 or 2) and the output pin number. */
  ins: number[];
  out: number;
}

export interface GateIcType {
  id: string;
  name: string;
  fn: string;
  /** Pins per package (14 for all gate ICs used here). */
  pins: number;
  vcc: number;
  gnd: number;
  gates: GatePin[];
  eval: (ins: Bit[]) => Bit;
}

const nand2 = (a: Bit, b: Bit): Bit => (a == null || b == null ? null : !(a && b));
const nor2 = (a: Bit, b: Bit): Bit => (a == null || b == null ? null : !(a || b));
const and2 = (a: Bit, b: Bit): Bit => (a == null || b == null ? null : a && b);
const or2 = (a: Bit, b: Bit): Bit => (a == null || b == null ? null : a || b);
const xor2 = (a: Bit, b: Bit): Bit => (a == null || b == null ? null : a !== b);
const not1 = (a: Bit): Bit => (a == null ? null : !a);

// Standard quad 2-input-gate pinout shared by 7400/7408/7432/7486.
const QUAD2 = [
  {ins: [1, 2], out: 3},
  {ins: [4, 5], out: 6},
  {ins: [9, 10], out: 8},
  {ins: [12, 13], out: 11},
];

export const GATE_ICS: Record<string, GateIcType> = {
  '7400': {id: '7400', name: '7400', fn: 'NAND', pins: 14, vcc: 14, gnd: 7, gates: QUAD2, eval: (i) => nand2(i[0], i[1])},
  '7402': {
    id: '7402',
    name: '7402',
    fn: 'NOR',
    pins: 14,
    vcc: 14,
    gnd: 7,
    gates: [
      {ins: [2, 3], out: 1},
      {ins: [5, 6], out: 4},
      {ins: [8, 9], out: 10},
      {ins: [11, 12], out: 13},
    ],
    eval: (i) => nor2(i[0], i[1]),
  },
  '7408': {id: '7408', name: '7408', fn: 'AND', pins: 14, vcc: 14, gnd: 7, gates: QUAD2, eval: (i) => and2(i[0], i[1])},
  '7432': {id: '7432', name: '7432', fn: 'OR', pins: 14, vcc: 14, gnd: 7, gates: QUAD2, eval: (i) => or2(i[0], i[1])},
  '7486': {id: '7486', name: '7486', fn: 'XOR', pins: 14, vcc: 14, gnd: 7, gates: QUAD2, eval: (i) => xor2(i[0], i[1])},
  '7404': {
    id: '7404',
    name: '7404',
    fn: 'NOT',
    pins: 14,
    vcc: 14,
    gnd: 7,
    gates: [
      {ins: [1], out: 2},
      {ins: [3], out: 4},
      {ins: [5], out: 6},
      {ins: [9], out: 8},
      {ins: [11], out: 10},
      {ins: [13], out: 12},
    ],
    eval: (i) => not1(i[0]),
  },
};

export const GATE_IC_IDS = Object.keys(GATE_ICS);

/** Truth table for a single 2-input gate function (for reference / checking). */
export function gateTruth(fn: string, a: boolean, b: boolean): boolean {
  switch (fn) {
    case 'NAND':
      return !(a && b);
    case 'NOR':
      return !(a || b);
    case 'AND':
      return a && b;
    case 'OR':
      return a || b;
    case 'XOR':
      return a !== b;
    case 'NOT':
      return !a;
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Generic combinational netlist: one or more gate ICs wired on a board.
// ---------------------------------------------------------------------------

export interface PlacedIc {
  id: string;
  type: string;
}

/** One IC instance's pin terminal id, e.g. "U1.3". */
export const pinId = (ic: string, pin: number) => `${ic}.${pin}`;

/**
 * Resolve every net's logic level by repeatedly evaluating gates whose
 * inputs are already known, starting from the given seed levels (VCC, GND,
 * switches). Nets never reached stay `null` (floating).
 */
export function evalBoard(ics: PlacedIc[], netOf: (id: string) => string, seed: Record<string, Bit>): Record<string, Bit> {
  const known: Record<string, Bit> = {...seed};
  for (let pass = 0, maxPass = ics.reduce((n, ic) => n + GATE_ICS[ic.type].gates.length, 0) + 2; pass < maxPass; pass++) {
    let changed = false;
    for (const ic of ics) {
      const t = GATE_ICS[ic.type];
      for (const g of t.gates) {
        const outNet = netOf(pinId(ic.id, g.out));
        if (known[outNet] !== undefined) continue;
        const ins = g.ins.map((p) => {
          const n = netOf(pinId(ic.id, p));
          return known[n] ?? null;
        });
        if (ins.some((v) => v == null)) continue;
        known[outNet] = t.eval(ins as boolean[]);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return known;
}

// ---------------------------------------------------------------------------
// Stateful flip-flops / latches (used by the fixed-circuit benches).
// ---------------------------------------------------------------------------

export type FfKind = 'rs' | 'd' | 't' | 'jk' | 'msjk';

/** Next Q for a clocked flip-flop, given its inputs and the current Q. */
export function ffNext(kind: FfKind, inA: boolean, inB: boolean, q: boolean): {q: boolean; invalid: boolean} {
  switch (kind) {
    case 'rs':
      if (inA && inB) return {q, invalid: true}; // S=R=1
      if (inA) return {q: true, invalid: false};
      if (inB) return {q: false, invalid: false};
      return {q, invalid: false};
    case 'd':
      return {q: inA, invalid: false};
    case 't':
      return {q: inA ? !q : q, invalid: false};
    case 'jk':
    case 'msjk': {
      const j = inA;
      const k = inB;
      if (j && k) return {q: !q, invalid: false};
      if (j) return {q: true, invalid: false};
      if (k) return {q: false, invalid: false};
      return {q, invalid: false};
    }
  }
}

/** Gated D latch: transparent while enabled, holds while disabled. */
export function dLatch(d: boolean, enable: boolean, q: boolean): boolean {
  return enable ? d : q;
}
