import React, {useEffect, useMemo, useRef, useState} from 'react';
import clsx from 'clsx';
import {TDIV, VDIV, dc, si, stats, type Sig} from './signals';
import styles from './styles.module.css';

export type Coupling = 'DC' | 'AC' | 'GND';
export interface ChState {
  vdiv: number;
  pos: number; // divisions
  coupling: Coupling;
  on: boolean;
}
export interface ScopeState {
  ch1: ChState;
  ch2: ChState;
  tdiv: number;
  hpos: number; // divisions
  trigSrc: 1 | 2;
  trigLevel: number; // volts
  trigSlope: 'rise' | 'fall';
  trigMode: 'auto' | 'normal';
  intensity: number; // 0–10
  focus: number; // 0–10, sharp at 5
  display: 'CH1' | 'CH2' | 'DUAL' | 'ADD';
  run: boolean;
  measure: boolean;
}

export const DEFAULT_SCOPE: ScopeState = {
  ch1: {vdiv: 1, pos: 0, coupling: 'DC', on: true},
  ch2: {vdiv: 1, pos: 0, coupling: 'DC', on: false},
  tdiv: 1e-3,
  hpos: 0,
  trigSrc: 1,
  trigLevel: 0,
  trigSlope: 'rise',
  trigMode: 'auto',
  intensity: 7,
  focus: 5,
  display: 'CH1',
  run: true,
  measure: false,
};

const PX = 50; // pixels per division
const SW = 500;
const SH = 400;

function effective(sig: Sig | null | undefined, c: Coupling): Sig {
  if (!sig || c === 'GND') return dc(0);
  if (c === 'AC') {
    const m = stats(sig).mean;
    return {fn: (t) => sig.fn(t) - m, period: sig.period};
  }
  return sig;
}

/** First time in one period where the signal crosses `level` with `slope`. */
function findTrigger(s: Sig, level: number, slope: 'rise' | 'fall'): number | null {
  if (!s.period) return null;
  const n = 4000;
  const dt = s.period / n;
  // Start just before t = 0 so a crossing exactly at 0 is found.
  let prev = s.fn(-dt);
  for (let k = 0; k < n; k++) {
    const v = s.fn(k * dt);
    if (slope === 'rise' ? prev < level && v >= level : prev > level && v <= level) return k * dt;
    prev = v;
  }
  return null;
}

const step = (list: number[], v: number, d: number) => {
  const i = list.findIndex((x) => Math.abs(x - v) < v * 1e-6);
  return list[Math.max(0, Math.min(list.length - 1, (i < 0 ? 0 : i) + d))];
};

export function Knob({
  label,
  value,
  onDec,
  onInc,
  title,
}: {
  label: string;
  value: React.ReactNode;
  onDec: () => void;
  onInc: () => void;
  title?: string;
}): React.JSX.Element {
  return (
    <div className={styles.knob} title={title}>
      <span className={styles.knobLabel}>{label}</span>
      <div className={styles.knobRow}>
        <button type="button" aria-label={`${label} down`} onClick={onDec}>
          −
        </button>
        <output>{value}</output>
        <button type="button" aria-label={`${label} up`} onClick={onInc}>
          +
        </button>
      </div>
    </div>
  );
}

export interface ScopeInputs {
  ch1?: Sig | null;
  ch2?: Sig | null;
}

/**
 * Oscilloscope. `kind` "cro" = analog look, no on-screen readouts, intensity
 * and focus controls. "dso" = colour traces, readouts, Auto Set, Run/Stop and
 * automatic measurements.
 */
export function useScope(kind: 'cro' | 'dso', inputs: ScopeInputs, initial?: Partial<ScopeState>) {
  const [st, setSt] = useState<ScopeState>({...DEFAULT_SCOPE, ...initial, ch1: {...DEFAULT_SCOPE.ch1, ...initial?.ch1}, ch2: {...DEFAULT_SCOPE.ch2, ...initial?.ch2}});
  const [jitter, setJitter] = useState(0.37);
  const svgRef = useRef<SVGSVGElement>(null);
  const set = (p: Partial<ScopeState>) => setSt((s) => ({...s, ...p}));
  const setCh = (n: 1 | 2, p: Partial<ChState>) => setSt((s) => ({...s, [`ch${n}`]: {...s[`ch${n}`], ...p}}));

  const e1 = effective(inputs.ch1, st.ch1.coupling);
  const e2 = effective(inputs.ch2, st.ch2.coupling);
  const trigSig = st.trigSrc === 1 ? e1 : e2;
  const t0 = useMemo(() => findTrigger(trigSig, st.trigLevel, st.trigSlope), [trigSig.fn, trigSig.period, st.trigLevel, st.trigSlope]); // eslint-disable-line react-hooks/exhaustive-deps
  const periodic = !!(inputs.ch1?.period || inputs.ch2?.period);
  const triggered = t0 != null;

  // Untriggered in auto mode: the picture keeps sliding.
  useEffect(() => {
    if (triggered || !st.run || st.trigMode !== 'auto' || !periodic) return;
    const id = window.setInterval(() => setJitter(Math.random()), 140);
    return () => window.clearInterval(id);
  }, [triggered, st.run, st.trigMode, periodic]);

  const showTrace = triggered || st.trigMode === 'auto' || !periodic;
  const start = triggered ? t0! : jitter * (trigSig.period ?? inputs.ch1?.period ?? inputs.ch2?.period ?? 1);

  const trace = (s: Sig, ch: ChState) => {
    const n = 1400;
    const pts: string[] = [];
    for (let k = 0; k <= n; k++) {
      const xdiv = (k / n) * 10;
      const t = start + (xdiv - st.hpos) * st.tdiv;
      const ydiv = s.fn(t) / ch.vdiv + ch.pos;
      const y = Math.max(-2, Math.min(SH + 2, SH / 2 - ydiv * PX));
      pts.push(`${((k / n) * SW).toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  };

  const showCh1 = st.ch1.on && (st.display === 'CH1' || st.display === 'DUAL');
  const showCh2 = st.ch2.on && (st.display === 'CH2' || st.display === 'DUAL');
  const sum: Sig = {fn: (t) => e1.fn(t) + e2.fn(t), period: e1.period ?? e2.period};

  const blur = kind === 'cro' ? Math.abs(st.focus - 5) * 0.9 : 0;
  const opacity = kind === 'cro' ? st.intensity / 10 : 1;
  const c1 = kind === 'cro' ? '#7dff9e' : '#ffd400';
  const c2 = kind === 'cro' ? '#7dff9e' : '#36d3ff';

  const m1 = inputs.ch1 ? stats(effective(inputs.ch1, st.ch1.coupling)) : null;
  const m2 = inputs.ch2 ? stats(effective(inputs.ch2, st.ch2.coupling)) : null;

  const autoSet = () => {
    const s = inputs.ch1 ?? inputs.ch2;
    if (!s) return;
    const m = stats(s);
    const vd = VDIV.find((v) => m.pp / v <= 6) ?? VDIV[VDIV.length - 1];
    const td = m.period ? TDIV.find((t) => (10 * t) / m.period! >= 2.5) ?? TDIV[TDIV.length - 1] : 1e-3;
    setSt((x) => ({
      ...x,
      ch1: {...x.ch1, vdiv: vd, pos: m.pp ? Math.round((-(m.max + m.min) / 2 / vd) * 5) / 5 : 0, coupling: 'DC', on: !!inputs.ch1},
      ch2: inputs.ch2 ? {...x.ch2, vdiv: VDIV.find((v) => stats(inputs.ch2!).pp / v <= 6) ?? 20, on: true, coupling: 'DC'} : x.ch2,
      tdiv: td,
      hpos: 0,
      trigSrc: inputs.ch1 ? 1 : 2,
      trigLevel: Math.round(((m.max + m.min) / 2) * 100) / 100,
      trigSlope: 'rise',
      display: inputs.ch1 && inputs.ch2 ? 'DUAL' : inputs.ch1 ? 'CH1' : 'CH2',
      intensity: 7,
      focus: 5,
      run: true,
    }));
  };

  const screen = (
    <svg ref={svgRef} viewBox={`0 0 ${SW + 20} ${SH + (kind === 'dso' ? 56 : 20)}`} className={styles.scopeScreen} role="img" aria-label="Oscilloscope screen">
      <defs>
        <filter id={`glow-${kind}`} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation={kind === 'cro' ? 1.2 + blur : 0.01} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            {blur < 0.5 && <feMergeNode in="SourceGraphic" />}
          </feMerge>
        </filter>
      </defs>
      <rect width={SW + 20} height={SH + (kind === 'dso' ? 56 : 20)} rx="10" fill={kind === 'cro' ? '#0b1a10' : '#06070a'} />
      <g transform="translate(10 10)">
        {/* graticule */}
        {Array.from({length: 11}, (_, k) => (
          <line key={`v${k}`} x1={k * PX} y1={0} x2={k * PX} y2={SH} stroke={kind === 'cro' ? '#24432d' : '#2a2f38'} strokeWidth={k === 5 ? 1.2 : 0.8} strokeDasharray={k === 0 || k === 10 || k === 5 ? undefined : '2 4'} />
        ))}
        {Array.from({length: 9}, (_, k) => (
          <line key={`h${k}`} x1={0} y1={k * PX} x2={SW} y2={k * PX} stroke={kind === 'cro' ? '#24432d' : '#2a2f38'} strokeWidth={k === 4 ? 1.2 : 0.8} strokeDasharray={k === 0 || k === 8 || k === 4 ? undefined : '2 4'} />
        ))}
        {Array.from({length: 51}, (_, k) => (
          <line key={`mx${k}`} x1={k * 10} y1={SH / 2 - 3} x2={k * 10} y2={SH / 2 + 3} stroke={kind === 'cro' ? '#2f5a3b' : '#3a404c'} strokeWidth={0.8} />
        ))}
        {Array.from({length: 41}, (_, k) => (
          <line key={`my${k}`} x1={SW / 2 - 3} y1={k * 10} x2={SW / 2 + 3} y2={k * 10} stroke={kind === 'cro' ? '#2f5a3b' : '#3a404c'} strokeWidth={0.8} />
        ))}
        {/* traces */}
        <g opacity={opacity} filter={kind === 'cro' ? `url(#glow-${kind})` : undefined}>
          {showTrace && showCh1 && <polyline points={trace(e1, st.ch1)} fill="none" stroke={c1} strokeWidth={kind === 'cro' ? 1.6 : 1.8} strokeLinejoin="round" />}
          {showTrace && showCh2 && <polyline points={trace(e2, st.ch2)} fill="none" stroke={c2} strokeWidth={kind === 'cro' ? 1.6 : 1.8} strokeLinejoin="round" />}
          {showTrace && st.display === 'ADD' && <polyline points={trace(sum, st.ch1)} fill="none" stroke={kind === 'cro' ? '#7dff9e' : '#ff6bd6'} strokeWidth={1.8} />}
        </g>
        {kind === 'dso' && (
          <>
            {st.ch1.on && <text x={-8} y={SH / 2 - st.ch1.pos * PX + 4} style={{fill: c1, fontSize: 11, fontWeight: 800}}>1</text>}
            {st.ch2.on && <text x={-8} y={SH / 2 - st.ch2.pos * PX + 4} style={{fill: c2, fontSize: 11, fontWeight: 800}}>2</text>}
            {(() => {
              const ty = SH / 2 - (st.trigLevel / (st.trigSrc === 1 ? st.ch1.vdiv : st.ch2.vdiv) + (st.trigSrc === 1 ? st.ch1.pos : st.ch2.pos)) * PX;
              return <path d={`M${SW + 1} ${ty} l8 -5 v10 z`} fill="#ff8c1a" />;
            })()}
            <text x={6} y={14} style={{fill: st.run ? (triggered ? '#4cd964' : '#ff8c1a') : '#ff5a5a', fontSize: 12, fontWeight: 800}}>
              {!st.run ? 'STOP' : triggered ? "Trig'd" : st.trigMode === 'auto' ? 'Auto' : 'Trig?'}
            </text>
            {st.measure && (
              <g>
                <rect x={SW - 170} y={6} width={164} height={st.ch2.on && m2 ? 108 : 60} rx={4} fill="rgba(20,24,32,0.88)" stroke="#3a404c" />
                {m1 && st.ch1.on && (
                  <text x={SW - 162} y={22} style={{fill: c1, fontSize: 11, fontFamily: 'var(--ifm-font-family-monospace)'}}>
                    <tspan x={SW - 162} dy={0}>CH1 Vpp {si(m1.pp, 'V')}</tspan>
                    <tspan x={SW - 162} dy={15}>Freq {m1.freq ? si(m1.freq, 'Hz') : '--'}</tspan>
                    <tspan x={SW - 162} dy={15}>Per {m1.period ? si(m1.period, 's') : '--'} Vrms {si(m1.rms, 'V')}</tspan>
                  </text>
                )}
                {m2 && st.ch2.on && (
                  <text x={SW - 162} y={70} style={{fill: c2, fontSize: 11, fontFamily: 'var(--ifm-font-family-monospace)'}}>
                    <tspan x={SW - 162} dy={0}>CH2 Vpp {si(m2.pp, 'V')}</tspan>
                    <tspan x={SW - 162} dy={15}>Freq {m2.freq ? si(m2.freq, 'Hz') : '--'}</tspan>
                    <tspan x={SW - 162} dy={15}>Per {m2.period ? si(m2.period, 's') : '--'}</tspan>
                  </text>
                )}
              </g>
            )}
          </>
        )}
      </g>
      {kind === 'dso' && (
        <g transform={`translate(10 ${SH + 32})`} style={{fontSize: 13, fontWeight: 700, fontFamily: 'var(--ifm-font-family-monospace)'}}>
          {st.ch1.on && <text x={0} y={0} style={{fill: c1}}>CH1 {si(st.ch1.vdiv, 'V')} {st.ch1.coupling}</text>}
          {st.ch2.on && <text x={140} y={0} style={{fill: c2}}>CH2 {si(st.ch2.vdiv, 'V')} {st.ch2.coupling}</text>}
          <text x={290} y={0} style={{fill: '#e6e6e6'}}>M {si(st.tdiv, 's')}</text>
          <text x={390} y={0} style={{fill: '#ff8c1a'}}>
            T{st.trigSrc} {st.trigSlope === 'rise' ? '↑' : '↓'} {si(st.trigLevel, 'V')}
          </text>
        </g>
      )}
    </svg>
  );

  const chControls = (n: 1 | 2) => {
    const ch = st[`ch${n}`];
    return (
      <div className={styles.knobGroup}>
        <div className={styles.knobGroupHead}>
          <b>CH{n}</b>
          <button type="button" className={styles.miniToggle} aria-pressed={ch.on} onClick={() => setCh(n, {on: !ch.on})}>
            {ch.on ? 'ON' : 'OFF'}
          </button>
        </div>
        <Knob label="VOLTS/DIV" value={si(ch.vdiv, 'V')} onDec={() => setCh(n, {vdiv: step(VDIV, ch.vdiv, -1)})} onInc={() => setCh(n, {vdiv: step(VDIV, ch.vdiv, 1)})} />
        <Knob label="POSITION" value={`${ch.pos > 0 ? '+' : ''}${ch.pos.toFixed(1)} div`} onDec={() => setCh(n, {pos: Math.round((ch.pos - 0.2) * 10) / 10})} onInc={() => setCh(n, {pos: Math.round((ch.pos + 0.2) * 10) / 10})} />
        <div className={styles.seg} role="group" aria-label={`CH${n} coupling`}>
          {(['AC', 'DC', 'GND'] as Coupling[]).map((c) => (
            <button key={c} type="button" aria-pressed={ch.coupling === c} onClick={() => setCh(n, {coupling: c})}>
              {c}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const controls = (
    <div className={styles.scopeControls}>
      {chControls(1)}
      {(inputs.ch2 !== undefined || kind === 'dso') && chControls(2)}
      <div className={styles.knobGroup}>
        <div className={styles.knobGroupHead}>
          <b>HORIZONTAL</b>
        </div>
        <Knob label="TIME/DIV" value={si(st.tdiv, 's')} onDec={() => set({tdiv: step(TDIV, st.tdiv, -1)})} onInc={() => set({tdiv: step(TDIV, st.tdiv, 1)})} />
        <Knob label="POSITION" value={`${st.hpos > 0 ? '+' : ''}${st.hpos.toFixed(1)} div`} onDec={() => set({hpos: Math.round((st.hpos - 0.2) * 10) / 10})} onInc={() => set({hpos: Math.round((st.hpos + 0.2) * 10) / 10})} />
      </div>
      <div className={styles.knobGroup}>
        <div className={styles.knobGroupHead}>
          <b>TRIGGER</b>
        </div>
        <Knob label="LEVEL" value={si(st.trigLevel, 'V', 2)} onDec={() => set({trigLevel: Math.round((st.trigLevel - (st.trigSrc === 1 ? st.ch1.vdiv : st.ch2.vdiv) / 5) * 1000) / 1000})} onInc={() => set({trigLevel: Math.round((st.trigLevel + (st.trigSrc === 1 ? st.ch1.vdiv : st.ch2.vdiv) / 5) * 1000) / 1000})} />
        <div className={styles.seg} role="group" aria-label="Trigger slope and source">
          <button type="button" aria-pressed={st.trigSlope === 'rise'} onClick={() => set({trigSlope: 'rise'})}>
            ↑ Rise
          </button>
          <button type="button" aria-pressed={st.trigSlope === 'fall'} onClick={() => set({trigSlope: 'fall'})}>
            ↓ Fall
          </button>
          <button type="button" onClick={() => set({trigSrc: st.trigSrc === 1 ? 2 : 1})}>
            Source CH{st.trigSrc}
          </button>
          <button type="button" onClick={() => set({trigMode: st.trigMode === 'auto' ? 'normal' : 'auto'})}>
            {st.trigMode === 'auto' ? 'Auto' : 'Normal'}
          </button>
        </div>
      </div>
      <div className={styles.knobGroup}>
        <div className={styles.knobGroupHead}>
          <b>DISPLAY</b>
        </div>
        <div className={styles.seg} role="group" aria-label="Vertical mode">
          {(['CH1', 'CH2', 'DUAL', 'ADD'] as const).map((d) => (
            <button key={d} type="button" aria-pressed={st.display === d} onClick={() => set({display: d})}>
              {d}
            </button>
          ))}
        </div>
        {kind === 'cro' ? (
          <>
            <Knob label="INTENSITY" value={st.intensity} onDec={() => set({intensity: Math.max(0, st.intensity - 1)})} onInc={() => set({intensity: Math.min(10, st.intensity + 1)})} />
            <Knob label="FOCUS" value={st.focus} onDec={() => set({focus: Math.max(0, st.focus - 1)})} onInc={() => set({focus: Math.min(10, st.focus + 1)})} />
          </>
        ) : (
          <div className={styles.seg} role="group" aria-label="DSO functions" style={{marginTop: '0.5rem'}}>
            <button type="button" onClick={autoSet}>
              AUTO SET
            </button>
            <button type="button" aria-pressed={!st.run} onClick={() => set({run: !st.run})}>
              {st.run ? 'RUN' : 'STOP'}
            </button>
            <button type="button" aria-pressed={st.measure} onClick={() => set({measure: !st.measure})}>
              MEASURE
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const view = (
    <div className={styles.scopeWrap}>
      <div className={clsx(styles.scopeBezel, kind === 'dso' && styles.scopeBezelDso)}>
        <div className={styles.scopeName}>{kind === 'cro' ? 'Dual-trace CRO' : 'Digital Storage Oscilloscope'}</div>
        {screen}
      </div>
      {controls}
    </div>
  );

  return {state: st, set, setCh, view, screen, controls, triggered, autoSet, m1, m2, svgRef};
}
