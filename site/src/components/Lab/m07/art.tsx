// Component drawings for the Module 7 identification practicals.
// Each part is drawn in a 160 × 110 box; `pins` gives the two test points.
import React from 'react';
import {AxialResistor} from './parts';

export type PartKind =
  | 'diode'
  | 'led'
  | 'zener'
  | 'to92'
  | 'to220'
  | 'to3'
  | 'dip8'
  | 'dip14'
  | 'resistor'
  | 'metalfilm'
  | 'ceramic'
  | 'electrolytic'
  | 'film'
  | 'tantalum'
  | 'mica'
  | 'gang'
  | 'trimmerCap'
  | 'axialInductor'
  | 'ferriteRod'
  | 'toroid'
  | 'ironChoke'
  | 'smdInductor'
  | 'airCore'
  | 'transformer'
  | 'cement'
  | 'vitreous'
  | 'smd'
  | 'pot'
  | 'preset'
  | 'ldr'
  | 'ntc'
  | 'signalDiode'
  | 'bridgeRound'
  | 'bridgeSquare'
  | 'stud'
  | 'to39';

export interface PartOpts {
  mark?: string;
  bands?: string[];
  burnt?: boolean;
  cracked?: boolean;
  brokenLead?: boolean;
  bulged?: boolean;
}

const T = (x: number, y: number, s: string, fill = '#eee', size = 9, anchor: 'middle' | 'start' = 'middle') => (
  <text x={x} y={y} textAnchor={anchor} style={{fill, fontSize: size, fontWeight: 700, fontFamily: 'var(--ifm-font-family-monospace)'}}>
    {s}
  </text>
);
const LEAD = '#a9b1b6';
const leg = (x1: number, y1: number, x2: number, y2: number, w = 2) => <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={LEAD} strokeWidth={w} />;

/** Test points (left, right) in the 160 × 110 box. */
export const PINS: Record<PartKind, [number, number, number, number]> = {
  diode: [12, 55, 148, 55],
  led: [68, 102, 92, 102],
  zener: [12, 55, 148, 55],
  to92: [64, 104, 96, 104],
  to220: [64, 104, 96, 104],
  to3: [60, 100, 100, 100],
  dip8: [40, 96, 120, 96],
  dip14: [30, 96, 130, 96],
  resistor: [12, 55, 148, 55],
  metalfilm: [12, 55, 148, 55],
  ceramic: [66, 104, 94, 104],
  electrolytic: [68, 104, 92, 104],
  film: [62, 104, 98, 104],
  tantalum: [70, 104, 90, 104],
  mica: [62, 104, 98, 104],
  gang: [40, 102, 120, 102],
  trimmerCap: [60, 102, 100, 102],
  axialInductor: [12, 55, 148, 55],
  ferriteRod: [20, 88, 140, 88],
  toroid: [44, 100, 116, 100],
  ironChoke: [52, 104, 108, 104],
  smdInductor: [52, 55, 108, 55],
  airCore: [14, 80, 146, 80],
  transformer: [40, 104, 70, 104],
  cement: [12, 55, 148, 55],
  vitreous: [8, 55, 152, 55],
  smd: [58, 55, 102, 55],
  pot: [56, 104, 104, 104],
  preset: [58, 100, 102, 100],
  ldr: [70, 104, 90, 104],
  ntc: [70, 104, 90, 104],
  signalDiode: [12, 55, 148, 55],
  bridgeRound: [62, 104, 98, 104],
  bridgeSquare: [44, 100, 116, 100],
  stud: [80, 8, 80, 104],
  to39: [64, 104, 96, 104],
};

const Burn = ({cx, cy, rx, ry}: {cx: number; cy: number; rx: number; ry: number}) => (
  <g>
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#22140c" opacity={0.85} />
    <ellipse cx={cx + 3} cy={cy - 2} rx={rx * 0.5} ry={ry * 0.45} fill="#0d0805" opacity={0.9} />
  </g>
);
const Crack = ({x, y, h}: {x: number; y: number; h: number}) => <path d={`M${x} ${y} l5 ${h * 0.35} l-5 ${h * 0.3} l6 ${h * 0.35}`} stroke="#111" strokeWidth={1.8} fill="none" />;

export function PartArt({kind, o = {}}: {kind: PartKind; o?: PartOpts}): React.JSX.Element {
  const m = o.mark ?? '';
  const [x1, y1, x2, y2] = PINS[kind];
  let body: React.ReactNode = null;
  let defectAt = {cx: 80, cy: 55, rx: 18, ry: 10};
  switch (kind) {
    case 'diode':
    case 'zener': {
      const glass = kind === 'zener';
      body = (
        <g>
          {leg(x1, 55, 60, 55)}
          {leg(100, 55, x2, 55)}
          <rect x={58} y={glass ? 47 : 44} width={44} height={glass ? 16 : 22} rx={glass ? 7 : 4} fill={glass ? '#e98f3c' : '#1e1e1e'} opacity={glass ? 0.85 : 1} />
          <rect x={90} y={glass ? 47 : 44} width={6} height={glass ? 16 : 22} fill={glass ? '#222' : '#cfd4d7'} />
          {!glass && T(74, 76, m || '1N4007', '#ccc', 8)}
          {glass && T(80, 80, m || '5V1', '#ccc', 8)}
        </g>
      );
      break;
    }
    case 'led':
      body = (
        <g>
          {leg(72, 70, x1, y1)}
          {leg(88, 70, 88, 92)}
          {leg(88, 92, x2, y2)}
          <path d="M62 70 V40 a18 18 0 0 1 36 0 V70 Z" fill={m || '#e23b3b'} opacity={0.85} />
          <rect x={60} y={66} width={40} height={6} rx={1} fill={m || '#e23b3b'} />
          <path d="M98 66 v6" stroke="#fff" strokeWidth={2} />
        </g>
      );
      defectAt = {cx: 80, cy: 50, rx: 14, ry: 14};
      break;
    case 'to92':
      body = (
        <g>
          {leg(68, 70, x1, y1)}
          {leg(80, 70, 80, 104)}
          {leg(92, 70, x2, y2)}
          <path d="M60 70 V36 a20 14 0 0 1 40 0 V70 Z" fill="#1d1d1d" />
          {T(80, 52, m || 'BC547', '#ccc', 8)}
        </g>
      );
      break;
    case 'to220':
      body = (
        <g>
          <rect x={56} y={6} width={48} height={22} rx={2} fill="#b9c0c5" />
          <circle cx={80} cy={16} r={6} fill="#24313a" />
          <rect x={56} y={26} width={48} height={42} rx={2} fill="#1d1d1d" />
          {leg(68, 68, x1, y1, 3)}
          {leg(80, 68, 80, 104, 3)}
          {leg(92, 68, x2, y2, 3)}
          {T(80, 46, m.split(' ')[0] || 'IRF540', '#ccc', 8)}
          {m.split(' ')[1] && T(80, 58, m.split(' ')[1], '#999', 7)}
        </g>
      );
      defectAt = {cx: 80, cy: 46, rx: 18, ry: 14};
      break;
    case 'to3':
      body = (
        <g>
          <path d="M20 55 Q20 30 50 32 L110 32 Q140 30 140 55 Q140 80 110 78 L50 78 Q20 80 20 55Z" fill="#c9ced1" stroke="#8d969b" />
          <circle cx={32} cy={55} r={5} fill="#24313a" />
          <circle cx={128} cy={55} r={5} fill="#24313a" />
          <circle cx={80} cy={55} r={20} fill="#b4babe" stroke="#8d969b" />
          {T(80, 58, m || '2N3055', '#333', 8)}
          {leg(68, 78, x1, y1, 3)}
          {leg(92, 78, x2, y2, 3)}
        </g>
      );
      break;
    case 'dip8':
    case 'dip14': {
      const n = kind === 'dip8' ? 4 : 7;
      const w = n * 18 + 8;
      const x0 = 80 - w / 2;
      body = (
        <g>
          {Array.from({length: n}, (_, k) => (
            <g key={k}>
              <rect x={x0 + 9 + k * 18} y={18} width={6} height={12} fill={LEAD} />
              <rect x={x0 + 9 + k * 18} y={78} width={6} height={18} fill={LEAD} />
            </g>
          ))}
          <rect x={x0} y={28} width={w} height={52} rx={3} fill="#1d1d1d" />
          <circle cx={x0 + 10} cy={70} r={3} fill="#3a3a3a" />
          <path d={`M${x0} 48 a6 6 0 0 1 0 12`} fill="#3a3a3a" />
          {T(80, 58, m || (kind === 'dip8' ? 'NE555' : '74LS00'), '#ccc', 9)}
        </g>
      );
      break;
    }
    case 'resistor':
    case 'metalfilm':
      body = <AxialResistor cx={80} cy={55} len={62} dia={18} lead={50} bands={o.bands ?? ['brown', 'black', 'red', 'gold']} body={kind === 'metalfilm' ? '#7fb2d9' : '#e8d7b0'} brokenLead={o.brokenLead} />;
      break;
    case 'ceramic':
      body = (
        <g>
          {leg(72, 70, x1, y1)}
          {leg(88, 70, x2, y2)}
          <ellipse cx={80} cy={46} rx={24} ry={26} fill="#d9a441" />
          {T(80, 50, m || '104', '#3a2a0a', 11)}
        </g>
      );
      defectAt = {cx: 80, cy: 46, rx: 14, ry: 14};
      break;
    case 'electrolytic':
      body = (
        <g>
          {leg(72, 86, x1, y1)}
          {leg(88, 86, x2, y2)}
          <path d={o.bulged ? 'M56 12 Q80 2 104 12 V86 H56 Z' : 'M56 16 H104 V86 H56 Z'} fill="#1f3f8f" />
          <rect x={92} y={16} width={12} height={70} fill="#c9d6ea" />
          {[30, 46, 62].map((y) => T(98, y, '−', '#1f3f8f', 12))}
          {T(74, 44, (m || '100µF 25V').split(' ')[0], '#e6ecf5', 8)}
          {T(74, 58, (m || '100µF 25V').split(' ')[1] ?? '', '#e6ecf5', 8)}
          <path d="M60 16 H100" stroke="#8aa1c8" strokeWidth={2} />
        </g>
      );
      defectAt = {cx: 74, cy: 50, rx: 14, ry: 14};
      break;
    case 'film':
      body = (
        <g>
          {leg(68, 78, x1, y1)}
          {leg(92, 78, x2, y2)}
          <rect x={52} y={22} width={56} height={56} rx={6} fill="#c43b2f" />
          {T(80, 48, (m || '2A473J').slice(0, 2), '#fde', 10)}
          {T(80, 62, (m || '2A473J').slice(2), '#fde', 10)}
        </g>
      );
      break;
    case 'tantalum':
      body = (
        <g>
          {leg(74, 76, x1, y1)}
          {leg(86, 76, x2, y2)}
          <path d="M66 76 V38 a14 16 0 0 1 28 0 V76 Z" fill="#e6b422" />
          {T(80, 52, '+', '#3a2a0a', 12)}
          {T(80, 66, m || '106', '#3a2a0a', 9)}
          <path d="M70 34 h4 M72 32 v4" stroke="#3a2a0a" />
        </g>
      );
      break;
    case 'mica':
      body = (
        <g>
          {leg(68, 76, x1, y1)}
          {leg(92, 76, x2, y2)}
          <rect x={50} y={24} width={60} height={52} rx={10} fill="#8a3b2b" />
          {T(80, 54, m || '471', '#f3d5c8', 11)}
        </g>
      );
      break;
    case 'gang':
      body = (
        <g>
          <rect x={30} y={30} width={100} height={60} rx={4} fill="#b9c0c5" stroke="#8d969b" />
          {[40, 54, 68, 82, 96, 110].map((x) => (
            <path key={x} d={`M${x} 36 v48`} stroke="#8d969b" strokeWidth={3} />
          ))}
          <rect x={74} y={6} width={12} height={26} fill="#d7dbde" />
          {leg(40, 90, x1, y1, 3)}
          {leg(120, 90, x2, y2, 3)}
          {T(80, 104, m || '2 × 365 pF', '#ccc', 8)}
        </g>
      );
      break;
    case 'trimmerCap':
      body = (
        <g>
          {leg(66, 76, x1, y1)}
          {leg(94, 76, x2, y2)}
          <rect x={56} y={36} width={48} height={40} rx={4} fill="#e8e3d5" />
          <circle cx={80} cy={56} r={14} fill="#2f9a3c" />
          <path d="M70 56 h20" stroke="#e8e3d5" strokeWidth={3} />
          {T(80, 30, m || '5–60 pF', '#ccc', 8)}
        </g>
      );
      break;
    case 'axialInductor':
      body = (
        <g>
          {leg(x1, 55, 56, 55)}
          {leg(104, 55, x2, 55)}
          <rect x={54} y={44} width={52} height={22} rx={10} fill="#3d8c56" />
          {(o.bands ?? ['silver', 'red', 'red', 'black', 'gold']).map((b, k) => (
            <rect key={k} x={60 + k * 8} y={44} width={4} height={22} fill={{silver: '#c0c0c0', gold: '#c9a227', black: '#1b1b1b', brown: '#7a4a1f', red: '#d4302a', orange: '#ef7d1a', yellow: '#f2c81f', violet: '#8a3fc2', blue: '#2b5fd1', green: '#2f9a3c', grey: '#8a8a8a', white: '#f5f5f5'}[b]} />
          ))}
        </g>
      );
      break;
    case 'ferriteRod':
      body = (
        <g>
          <rect x={14} y={42} width={132} height={16} rx={7} fill="#3a3a3a" />
          {Array.from({length: 22}, (_, k) => (
            <path key={k} d={`M${46 + k * 3} 38 v24`} stroke="#c87533" strokeWidth={2.2} />
          ))}
          <path d={`M46 60 Q30 80 ${x1} ${y1} M112 60 Q130 80 ${x2} ${y2}`} stroke="#c87533" strokeWidth={1.6} fill="none" />
        </g>
      );
      break;
    case 'toroid':
      body = (
        <g>
          <circle cx={80} cy={48} r={34} fill="#5b6770" />
          <circle cx={80} cy={48} r={14} fill="var(--lab-kit, #24313a)" />
          {Array.from({length: 26}, (_, k) => {
            const a = (k / 26) * Math.PI * 2;
            return <line key={k} x1={80 + 12 * Math.cos(a)} y1={48 + 12 * Math.sin(a)} x2={80 + 36 * Math.cos(a)} y2={48 + 36 * Math.sin(a)} stroke="#c87533" strokeWidth={2.4} />;
          })}
          {leg(66, 80, x1, y1)}
          {leg(94, 80, x2, y2)}
        </g>
      );
      break;
    case 'ironChoke':
      body = (
        <g>
          <rect x={36} y={14} width={88} height={70} fill="#6d7378" />
          {[20, 32, 44, 56, 68].map((y) => (
            <path key={y} d={`M36 ${y} h88`} stroke="#555b60" />
          ))}
          <rect x={58} y={20} width={44} height={58} rx={4} fill="#c87533" />
          {T(80, 52, m || '1 H', '#3a1d0a', 11)}
          {leg(62, 84, x1, y1)}
          {leg(98, 84, x2, y2)}
        </g>
      );
      break;
    case 'smdInductor':
      body = (
        <g>
          <rect x={56} y={33} width={48} height={44} rx={4} fill="#2a2a2a" />
          <rect x={52} y={45} width={8} height={20} fill={LEAD} />
          <rect x={100} y={45} width={8} height={20} fill={LEAD} />
          {T(80, 59, m || '100', '#ccc', 11)}
        </g>
      );
      break;
    case 'airCore':
      body = (
        <g>
          {Array.from({length: 9}, (_, k) => (
            <ellipse key={k} cx={42 + k * 10} cy={50} rx={6} ry={22} fill="none" stroke="#d08a3c" strokeWidth={2.5} />
          ))}
          <path d={`M36 50 Q24 60 ${x1} ${y1} M128 50 Q138 60 ${x2} ${y2}`} stroke="#d08a3c" strokeWidth={2.5} fill="none" />
        </g>
      );
      break;
    case 'transformer':
      body = (
        <g>
          <rect x={30} y={18} width={100} height={66} fill="#6d7378" />
          <rect x={52} y={24} width={56} height={54} rx={4} fill="#d9c58c" />
          {T(80, 50, m || '230/12V', '#3a2a0a', 9)}
          {T(80, 64, '500mA', '#3a2a0a', 8)}
          {leg(40, 84, x1, y1)}
          {leg(70, 84, x2, y2)}
          {leg(100, 84, 100, 104)}
          {leg(120, 84, 120, 104)}
        </g>
      );
      break;
    case 'cement':
      body = (
        <g>
          {leg(x1, 55, 40, 55)}
          {leg(120, 55, x2, 55)}
          <rect x={36} y={38} width={88} height={34} rx={2} fill="#f1efe8" stroke="#c9c4b4" />
          {T(80, 59, m || '5W 10ΩJ', '#333', 10)}
        </g>
      );
      defectAt = {cx: 80, cy: 55, rx: 26, ry: 12};
      break;
    case 'vitreous':
      body = (
        <g>
          <rect x={22} y={40} width={116} height={30} rx={4} fill="#3f7d4a" />
          <rect x={14} y={46} width={10} height={18} fill={LEAD} />
          <rect x={136} y={46} width={10} height={18} fill={LEAD} />
          {T(80, 59, m || '25W 100Ω', '#e3efe5', 10)}
        </g>
      );
      defectAt = {cx: 80, cy: 55, rx: 30, ry: 12};
      break;
    case 'smd':
      body = (
        <g>
          <rect x={62} y={42} width={36} height={26} fill="#1d1d1d" />
          <rect x={56} y={42} width={8} height={26} fill={LEAD} />
          <rect x={96} y={42} width={8} height={26} fill={LEAD} />
          {T(80, 59, m || '103', '#eee', 11)}
        </g>
      );
      defectAt = {cx: 80, cy: 55, rx: 12, ry: 9};
      break;
    case 'pot':
      body = (
        <g>
          <circle cx={80} cy={50} r={32} fill="#9aa3a8" stroke="#6d777c" />
          <circle cx={80} cy={50} r={12} fill="#d7dbde" />
          <path d="M80 40 v20" stroke="#6d777c" strokeWidth={3} />
          {T(80, 26, m || 'B10K', '#222', 9)}
          {leg(60, 80, x1, y1, 3)}
          {leg(80, 82, 80, 104, 3)}
          {leg(100, 80, x2, y2, 3)}
        </g>
      );
      break;
    case 'preset':
      body = (
        <g>
          <rect x={56} y={30} width={48} height={48} rx={3} fill="#2b5fd1" />
          <circle cx={80} cy={54} r={14} fill="#f2f2f2" />
          <path d="M74 54 h12 M80 48 v12" stroke="#2b5fd1" strokeWidth={3} />
          {T(80, 26, m || '103', '#ccc', 9)}
          {leg(62, 78, x1, y1)}
          {leg(80, 78, 80, 100)}
          {leg(98, 78, x2, y2)}
        </g>
      );
      break;
    case 'ldr':
      body = (
        <g>
          {leg(74, 72, x1, y1)}
          {leg(86, 72, x2, y2)}
          <circle cx={80} cy={46} r={26} fill="#e9d9b5" stroke="#b39c6a" />
          <path d="M62 36 h30 v6 h-30 v6 h30 v6 h-30 v6 h30" stroke="#c0482f" strokeWidth={2.4} fill="none" />
        </g>
      );
      defectAt = {cx: 80, cy: 46, rx: 16, ry: 16};
      break;
    case 'ntc':
      body = (
        <g>
          {leg(74, 74, x1, y1)}
          {leg(86, 74, x2, y2)}
          <ellipse cx={80} cy={48} rx={22} ry={26} fill="#4a3a2e" />
          {T(80, 52, m || '10D-9', '#e8d7b0', 8)}
        </g>
      );
      defectAt = {cx: 80, cy: 48, rx: 14, ry: 14};
      break;
    case 'signalDiode':
      body = (
        <g>
          {leg(x1, 55, 66, 55)}
          {leg(94, 55, x2, 55)}
          <rect x={64} y={49} width={32} height={12} rx={5} fill="#e98f3c" opacity={0.75} />
          <rect x={86} y={49} width={4} height={12} fill="#222" />
          {T(80, 78, m || '1N4148', '#ccc', 8)}
        </g>
      );
      break;
    case 'bridgeRound':
      body = (
        <g>
          {[62, 74, 86, 98].map((x) => leg(x, 70, x, 104))}
          <circle cx={80} cy={46} r={28} fill="#1d1d1d" />
          {T(80, 44, m || 'W10M', '#ccc', 8)}
          {T(64, 66, '+', '#ccc', 10)}
          {T(80, 30, '~ ~', '#ccc', 9)}
        </g>
      );
      break;
    case 'bridgeSquare':
      body = (
        <g>
          <rect x={36} y={10} width={88} height={78} rx={4} fill="#2a2a2a" />
          <circle cx={80} cy={49} r={7} fill="#4a4a4a" />
          {T(80, 32, m || 'KBPC3510', '#ccc', 8)}
          {T(50, 80, '+', '#ccc', 11)}
          {T(110, 80, '−', '#ccc', 11)}
          {T(50, 24, '~', '#ccc', 11)}
          {T(110, 24, '~', '#ccc', 11)}
          {leg(44, 88, x1, y1, 3)}
          {leg(116, 88, x2, y2, 3)}
        </g>
      );
      break;
    case 'to39':
      body = (
        <g>
          {leg(68, 76, x1, y1)}
          {leg(80, 76, 80, 104)}
          {leg(92, 76, x2, y2)}
          <ellipse cx={80} cy={76} rx={26} ry={6} fill="#9aa3a8" />
          <rect x={56} y={36} width={48} height={40} fill="#c9ced1" />
          <ellipse cx={80} cy={36} rx={24} ry={6} fill="#e1e4e7" />
          <rect x={100} y={64} width={8} height={6} fill="#9aa3a8" />
          {T(80, 60, m || 'SL100', '#333', 8)}
        </g>
      );
      break;
    case 'stud':
      body = (
        <g>
          <path d="M60 30 h40 l8 14 l-8 14 h-40 l-8 -14 Z" fill="#c9ced1" stroke="#8d969b" />
          <rect x={68} y={58} width={24} height={40} fill="#b4babe" />
          {Array.from({length: 7}, (_, k) => (
            <path key={k} d={`M68 ${62 + k * 5} h24`} stroke="#8d969b" />
          ))}
          {leg(80, 30, x1, y1, 4)}
          {T(80, 48, m || '70HF', '#333', 8)}
        </g>
      );
      break;
  }
  return (
    <g>
      {body}
      {o.burnt && <Burn {...defectAt} />}
      {o.cracked && <Crack x={defectAt.cx - 2} y={defectAt.cy - defectAt.ry} h={defectAt.ry * 2} />}
      {o.brokenLead && kind !== 'resistor' && kind !== 'metalfilm' && <rect x={x2 - 6} y={y2 - 24} width={14} height={30} fill="var(--lab-kit, #24313a)" />}
    </g>
  );
}
