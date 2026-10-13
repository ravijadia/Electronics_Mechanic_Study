import React, {useState} from 'react';
import {Knob} from './Scope';
import {dc, si, sine, square, triangle, type Sig} from './signals';
import styles from './styles.module.css';

export type Wave = 'sine' | 'square' | 'triangle';

export interface FGState {
  wave: Wave;
  range: number; // Hz multiplier: 1, 10, 100 … 100k
  dial: number; // 0.1 – 2.0
  amp: number; // Vpp at the output (before attenuator), 0–20
  offset: number; // V
  atten: boolean; // −20 dB
  on: boolean;
}

export const DEFAULT_FG: FGState = {wave: 'sine', range: 1000, dial: 1, amp: 5, offset: 0, atten: false, on: true};

const RANGES = [1, 10, 100, 1000, 10000, 100000];
const WAVE_ICON: Record<Wave, string> = {sine: '∿ Sine', square: '⊓ Square', triangle: '⋀ Triangle'};

export function fgFreq(s: FGState) {
  return s.range * s.dial;
}
export function fgVpp(s: FGState) {
  return s.atten ? s.amp / 10 : s.amp;
}

export function fgSignal(s: FGState): Sig {
  if (!s.on) return dc(0);
  const f = fgFreq(s);
  const v = fgVpp(s);
  const o = s.atten ? s.offset / 10 : s.offset;
  return s.wave === 'sine' ? sine(f, v, o) : s.wave === 'square' ? square(f, v, o) : triangle(f, v, o);
}

/**
 * Function generator front panel. `counter` shows the built-in frequency
 * display; turn it off when the trainee must measure on the scope.
 */
export function useFunctionGenerator(initial?: Partial<FGState>, counter = true) {
  const [st, setSt] = useState<FGState>({...DEFAULT_FG, ...initial});
  const set = (p: Partial<FGState>) => setSt((s) => ({...s, ...p}));
  const view = (
    <div className={styles.fg}>
      <div className={styles.fgHead}>
        <b>Function generator</b>
        <span className={styles.fgDisplay} aria-label="Frequency display">
          {counter ? (st.on ? si(fgFreq(st), 'Hz', 4) : '----') : '— — —'}
        </span>
      </div>
      <div className={styles.seg} role="group" aria-label="Waveform">
        {(Object.keys(WAVE_ICON) as Wave[]).map((w) => (
          <button key={w} type="button" aria-pressed={st.wave === w} onClick={() => set({wave: w})}>
            {WAVE_ICON[w]}
          </button>
        ))}
      </div>
      <span className={styles.knobLabel} style={{display: 'block', marginTop: '0.5rem'}}>
        FREQUENCY RANGE (Hz)
      </span>
      <div className={styles.seg} role="group" aria-label="Frequency range">
        {RANGES.map((r) => (
          <button key={r} type="button" aria-pressed={st.range === r} onClick={() => set({range: r})}>
            ×{r >= 1000 ? `${r / 1000}k` : r}
          </button>
        ))}
      </div>
      <label className={styles.knobLabel} style={{display: 'block', marginTop: '0.5rem'}}>
        FREQUENCY DIAL: {st.dial.toFixed(2)}
        <input className={styles.range} type="range" min={0.1} max={2} step={0.01} value={st.dial} onChange={(e) => set({dial: Number(e.target.value)})} />
      </label>
      <div className={styles.fgKnobs}>
        <Knob label="AMPLITUDE" value={`${st.amp.toFixed(1)} Vpp`} onDec={() => set({amp: Math.max(0, Math.round((st.amp - 0.5) * 10) / 10)})} onInc={() => set({amp: Math.min(20, Math.round((st.amp + 0.5) * 10) / 10)})} />
        <Knob label="DC OFFSET" value={`${st.offset > 0 ? '+' : ''}${st.offset.toFixed(1)} V`} onDec={() => set({offset: Math.max(-5, Math.round((st.offset - 0.5) * 10) / 10)})} onInc={() => set({offset: Math.min(5, Math.round((st.offset + 0.5) * 10) / 10)})} />
      </div>
      <div className={styles.seg} role="group" aria-label="Output" style={{marginTop: '0.5rem'}}>
        <button type="button" aria-pressed={st.atten} onClick={() => set({atten: !st.atten})}>
          ATT −20 dB
        </button>
        <button type="button" aria-pressed={st.on} onClick={() => set({on: !st.on})}>
          OUTPUT {st.on ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
  return {state: st, set, view, signal: fgSignal(st)};
}
