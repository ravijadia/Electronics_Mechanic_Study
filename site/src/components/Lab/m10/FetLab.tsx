import React, {useMemo, useState} from 'react';
import clsx from 'clsx';
import PracticalSheet from '../PracticalSheet';
import Multimeter from '../Multimeter';
import useStoredState from '../useStoredState';
import {ProbeBar, ProbePoint, useProbes} from '../Probes';
import {useScope} from '../Scope';
import {fgFreq, useFunctionGenerator} from '../FunctionGenerator';
import type {Sig} from '../signals';
import {NoteBox, ResetKit, Section, Table, Verdict, useKitSeed, useRng, type Note} from '../kit';
import {kitLabel, near} from '../m07/parts';
import {Cap, DC, METER_FNS, Res, acRms, meterRead, stageSignal} from '../m09/amp';
import {hp, par} from '../m09/bjt';
import styles from '../styles.module.css';

const num = (s?: string) => (s && s.trim() !== '' && !Number.isNaN(Number(s)) ? Number(s) : null);
const inp = (label: string, value: string | undefined, onChange: (v: string) => void, w = '5.5rem') => (
  <input className={styles.input} style={{maxWidth: w}} inputMode="decimal" aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
);

const VDD = 15;
const RD = 2200;
const RS = 470;
const RG = 1e6;
const RL = 10e3;
const R_TEST = 1e6;

/** Self-biased JFET operating point. */
function jfetQ(idss: number, vp: number) {
  let lo = 0;
  let hi = Math.min(idss, Math.abs(vp) / RS);
  for (let k = 0; k < 60; k++) {
    const id = (lo + hi) / 2;
    const f = idss * (1 - (id * RS) / Math.abs(vp)) ** 2 - id;
    if (f > 0) lo = id;
    else hi = id;
  }
  const id = lo;
  const vgs = -id * RS;
  const gm = ((2 * idss) / Math.abs(vp)) * (1 - vgs / vp);
  return {id, vgs, vs: id * RS, vd: VDD - id * RD, gm};
}

export default function FetAmpLab(): React.JSX.Element {
  const KEY = '1.10.97';
  const [seed, newKit] = useKitSeed(KEY);
  const kit = useRng(seed, (rnd) => ({idss: 0.008 + rnd() * 0.004, vp: -(3 + rnd() * 1.5)}));
  const [bypass, setBypass] = useState(true);
  const [rTest, setRTest] = useState(false);
  const [rec, setRec] = useStoredState<Record<string, number>>(`lab:${KEY}:rec`, {});
  const [ans, setAns] = useStoredState<Record<string, string>>(`lab:${KEY}:ans`, {});
  const [printed, setPrinted] = useStoredState(`lab:${KEY}:printed`, false);
  const [note, setNote] = useState<Note>(null);
  const probes = useProbes();
  const fg = useFunctionGenerator({wave: 'sine', range: 1000, dial: 1, amp: 0.5});
  const f = fgFreq(fg.state);
  const q = jfetQ(kit.idss, kit.vp);
  const rload = par(RD, RL);
  const a0 = bypass ? q.gm * rload : (q.gm * rload) / (1 + q.gm * RS);
  const k = rTest ? RG / (RG + R_TEST) : 1;
  const hIn = hp(f, 1 / (2 * Math.PI * (RG + (rTest ? R_TEST : 0)) * 0.1e-6));
  const hS = bypass ? hp(f, 1 / (2 * Math.PI * (1 / q.gm) * 100e-6)) : {mag: 1, ph: 0};
  const mag = a0 * Math.max(hS.mag, bypass ? 1 / (1 + q.gm * RS) : 1) * hIn.mag;
  const gen = fg.signal;
  const vin: Sig = useMemo(() => ({fn: (t) => gen.fn(t) * k, period: gen.period}), [JSON.stringify(fg.state), k]); // eslint-disable-line react-hooks/exhaustive-deps
  const up = q.id * rload;
  const down = Math.max(0, q.vd - q.vs - (q.vgs - kit.vp));
  const vout = useMemo(() => stageSignal(vin, f, 0, mag, Math.PI + hIn.ph, up, down), [vin, f, mag, hIn.ph, up, down]);
  const nodes: Record<string, Sig> = {GEN: gen, IN: vin, OUT: vout, G: DC(0), S: DC(q.vs), D: {fn: (t) => q.vd + vout.fn(t), period: vout.period}};
  const [mfn, setMfn] = useState('off');
  const node = (id: string | null) => (id ? nodes[id.split('@')[0]] ?? null : null);
  const ra = node(probes.red);
  const rb = node(probes.black);
  const m = meterRead(mfn, ra && rb && probes.red !== probes.black ? ra : null, ra && rb && probes.red !== probes.black ? rb : null);
  const red = probes.red?.split('@')[0];
  const black = probes.black?.split('@')[0];
  const scope = useScope('cro', {ch1: vin, ch2: vout}, {ch1: {vdiv: 0.1, pos: 2, coupling: 'AC', on: true}, ch2: {vdiv: 0.5, pos: -2, coupling: 'AC', on: true}, display: 'DUAL', tdiv: 2e-4});
  const clipped = acRms(vout) < 0.95 * mag * acRms(vin);

  const noteIt = () => {
    if (mfn === 'off' || m.volts == null) return setNote({kind: 'warn', text: 'Select a range that does not show OL.'});
    if (black !== 'G') return setNote({kind: 'warn', text: 'Black probe on ground.'});
    const dc = mfn === 'dcv20';
    let key = '';
    if (dc && (red === 'S' || red === 'D')) key = `V${red}`;
    else if (!dc && red === 'IN') key = rTest ? 'vinT' : bypass ? 'vinB' : 'vinU';
    else if (!dc && red === 'GEN') key = rTest ? 'vgenT' : 'vgen';
    else if (!dc && red === 'OUT') {
      if (rTest) return setNote({kind: 'warn', text: 'Remove the 1 MΩ test resistor for gain readings.'});
      if (clipped) return setNote({kind: 'warn', text: 'Output clipped: reduce the input.'});
      key = bypass ? 'voutB' : 'voutU';
    } else return setNote({kind: 'warn', text: dc ? 'DC: red on S or D.' : 'AC: red on GEN, IN or OUT.'});
    setRec((r) => ({...r, [key]: m.volts!}));
    setNote({kind: 'good', text: `${key}: ${m.text} ${m.unit}`});
  };

  const idTrue = rec.VD != null ? ((VDD - rec.VD) / RD) * 1000 : null;
  const gB = rec.voutB && rec.vinB ? rec.voutB / rec.vinB : null;
  const gU = rec.voutU && rec.vinU ? rec.voutU / rec.vinU : null;
  const zin = rec.vgenT && rec.vinT && rec.vgenT > rec.vinT ? (R_TEST * rec.vinT) / (rec.vgenT - rec.vinT) : null;
  const ok = {
    id: idTrue != null && near(num(ans.id), idTrue, 0.03),
    vgs: rec.VS != null && Math.abs((num(ans.vgs) ?? 99) + rec.VS) < 0.03,
    gB: gB != null && near(num(ans.gB), gB, 0.03) && near(gB, q.gm * rload, 0.08),
    gU: gU != null && near(num(ans.gU), gU, 0.03),
    zin: zin != null && near(num(ans.zin) != null ? num(ans.zin)! * 1e3 : null, zin, 0.05),
    ph: ans.ph === '180',
  };

  return (
    <PracticalSheet
      number={KEY}
      title="Construct and Test a FET Amplifier"
      aim="To build a common-source JFET amplifier with self bias, measure its operating point, voltage gain with and without the source bypass capacitor, phase and input impedance."
      apparatus={['JFET BFW10', 'VDD 15 V, RD 2.2 kΩ, RS 470 Ω, RG 1 MΩ, RL 10 kΩ, CS 100 µF', 'Test resistor 1 MΩ', 'Function generator, CRO, AC millivoltmeter / DMM']}
      procedure={[
        'DC: measure VS and VD to ground. ID = (VDD − VD) ÷ RD. VGS = −VS (the gate is at 0 V).',
        'Apply 1 kHz, about 0.5 Vpp. Measure Vin and Vout with CS fitted, then with CS removed.',
        'Compare the phase on the CRO.',
        'Insert the 1 MΩ test resistor. Measure Vgen and Vin: Zin = 1 MΩ × Vin ÷ (Vgen − Vin).',
      ]}
      precautions={['Keep the input small so the output is not clipped.', 'Do not touch the gate lead: the JFET has a very high input impedance and picks up hum.', 'Common ground for all instruments.']}
      viva={[
        {q: 'Why is the input impedance of a FET amplifier so high?', a: 'The gate junction is reverse biased, so almost no gate current flows; Zin ≈ RG.'},
        {q: 'How does self bias work?', a: 'ID through RS makes the source positive, so the gate (at 0 V) is negative relative to the source.'},
        {q: 'Voltage gain of a CS amplifier?', a: 'Av = gm × (RD ∥ RL) with CS; lower without CS.'},
        {q: 'Compare FET and BJT amplifiers.', a: 'FET: higher input impedance, lower noise, lower gain. BJT: higher gain, lower input impedance.'},
      ]}
      steps={[
        {label: 'Measure VS and VD to ground.', hint: 'Meter on DC V. Black probe on G, red on S, then D.', done: rec.VS != null && rec.VD != null},
        {label: 'Work out ID and VGS and enter them.', hint: 'ID = (VDD − VD) ÷ RD. VGS = −VS.', done: ok.id && ok.vgs},
        {label: 'Measure the gain with CS fitted.', hint: 'Meter on AC V. Note Vin (IN), then Vout (OUT). Av = Vout ÷ Vin.', done: ok.gB},
        {label: 'Remove CS and measure the gain again.', hint: 'Tap the capacitor to remove it. Same input.', done: ok.gU},
        {label: 'Compare the phase of input and output on the CRO.', hint: 'CH1 = input, CH2 = output. Enter the angle.', done: ok.ph},
        {label: 'Find Zin with the 1 MΩ test resistor.', hint: 'Note Vgen and Vin. Zin = 1 MΩ × Vin ÷ (Vgen − Vin).', done: ok.zin},
        {label: 'Enter your details and print or save the record.', done: printed},
      ]}
      onPrinted={(t) => t.name.trim() && setPrinted(true)}>
      <Section title="Bench">
        <div className={styles.controls} style={{marginTop: 0}}>
          <div>
            <div className={styles.kit}>
              <svg viewBox="0 0 360 270" role="img" aria-label="Common-source JFET amplifier">
                <path className={styles.wire} d="M40 20 H330 M40 240 H330 M200 20 V46 M200 94 V110 M200 150 V176 M200 224 V240 M120 130 H170 M120 130 V186 M120 234 V240 M70 130 H96 M104 130 H120 M200 100 H256 M264 100 H310 V176 M310 224 V240 M40 130 H70" fill="none" />
                <Res x={200} y={70} label="RD 2.2k" />
                <Res x={200} y={200} label="RS 470" />
                <Res x={120} y={210} label="RG 1M" />
                <Res x={310} y={200} label="RL" />
                <Cap x={100} y={130} />
                <Cap x={260} y={100} />
                {/* JFET symbol */}
                <path d="M184 112 V148 M184 118 H200 V110 M184 142 H200 V150 M170 130 H184 M176 125 L184 130 L176 135" stroke="var(--lab-wire)" strokeWidth={2.5} fill="none" />
                <text x={180} y={170} textAnchor="end" style={{...kitLabel, fontSize: 9}}>
                  BFW10
                </text>
                {rTest ? <Res x={30} y={130} vertical={false} len={30} label="1M" /> : <path d="M14 130 H44" stroke="#2b5fd1" strokeWidth={4} />}
                <g
                  className={styles.clickable}
                  role="button"
                  tabIndex={0}
                  aria-label={`Source bypass capacitor ${bypass ? 'fitted. Remove' : 'removed. Fit'}`}
                  onClick={() => setBypass((b) => !b)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setBypass((b) => !b);
                    }
                  }}>
                  <rect x={220} y={160} width={60} height={80} fill="transparent" />
                  <path d="M200 166 H246 V194 M246 206 V240" stroke="var(--lab-wire)" strokeWidth={2} fill="none" strokeDasharray={bypass ? undefined : '4 4'} opacity={bypass ? 1 : 0.5} />
                  {bypass ? <Cap x={246} y={200} vertical /> : <rect x={234} y={190} width={24} height={20} rx={3} fill="none" stroke="#9fb0ba" strokeDasharray="3 3" />}
                  <text x={262} y={226} style={{...kitLabel, fontSize: 10, fill: '#8fb4ff'}}>
                    CS
                  </text>
                </g>
                <text x={330} y={14} textAnchor="end" style={{...kitLabel, fontSize: 10}}>
                  VDD +15 V
                </text>
                <ProbePoint id="GEN@1" x={10} y={130} probes={probes} label="Generator side" r={4} />
                <ProbePoint id="IN@1" x={60} y={150} probes={probes} label="Amplifier input" r={4} />
                <ProbePoint id="S@1" x={214} y={160} probes={probes} label="Source" r={4} />
                <ProbePoint id="D@1" x={214} y={100} probes={probes} label="Drain" r={4} />
                <ProbePoint id="OUT@1" x={310} y={140} probes={probes} label="Output" r={4} />
                <ProbePoint id="G@1" x={60} y={240} probes={probes} label="Ground" r={4} />
                <text x={60} y={168} textAnchor="middle" style={{...kitLabel, fontSize: 9}}>
                  IN
                </text>
                <text x={10} y={116} textAnchor="middle" style={{...kitLabel, fontSize: 9}}>
                  GEN
                </text>
                <text x={324} y={140} style={{...kitLabel, fontSize: 9}}>
                  OUT
                </text>
              </svg>
            </div>
            <ProbeBar probes={probes} hint="Tap CS to fit or remove it." />
          </div>
          <div style={{display: 'grid', gap: '0.6rem', alignContent: 'start'}}>
            <Multimeter name="Millivoltmeter / DMM" fn={mfn} functions={METER_FNS} text={m.text} unit={m.unit} onFunction={(x) => (setNote(null), setMfn(x))} />
            <div className={clsx(styles.seg, styles.noPrint)} role="group" aria-label="Test resistor">
              <button type="button" aria-pressed={!rTest} onClick={() => setRTest(false)}>
                Input direct
              </button>
              <button type="button" aria-pressed={rTest} onClick={() => setRTest(true)}>
                1 MΩ in series
              </button>
            </div>
            <button type="button" className={clsx(styles.btn, styles.primary, styles.noPrint)} onClick={noteIt}>
              Note reading
            </button>
          </div>
        </div>
        <NoteBox note={note} status={clipped ? {kind: 'warn', text: 'Output clipped.'} : null} />
        <div className={styles.controls}>
          <div>{scope.view}</div>
          <div>{fg.view}</div>
        </div>
      </Section>
      <Section title="Observation table">
        <Table
          head={['Measurement', 'Value']}
          rows={[
            ['VS (DC)', rec.VS != null ? `${rec.VS.toFixed(2)} V` : '–'],
            ['VD (DC)', rec.VD != null ? `${rec.VD.toFixed(2)} V` : '–'],
            ['Vin / Vout with CS', rec.vinB && rec.voutB ? `${(rec.vinB * 1000).toFixed(1)} mV / ${(rec.voutB * 1000).toFixed(0)} mV` : '–'],
            ['Vin / Vout without CS', rec.vinU && rec.voutU ? `${(rec.vinU * 1000).toFixed(1)} mV / ${(rec.voutU * 1000).toFixed(0)} mV` : '–'],
            ['Vgen / Vin with 1 MΩ', rec.vgenT && rec.vinT ? `${(rec.vgenT * 1000).toFixed(1)} mV / ${(rec.vinT * 1000).toFixed(1)} mV` : '–'],
          ]}
        />
      </Section>
      <Section title="Result">
        <Table
          head={['', 'Your value', 'Check']}
          rows={[
            ['ID = (15 − VD) ÷ 2.2k (mA)', inp('Drain current', ans.id, (v) => setAns((a) => ({...a, id: v}))), ans.id ? <Verdict ok={ok.id} /> : '–'],
            ['VGS = −VS (V)', inp('VGS', ans.vgs, (v) => setAns((a) => ({...a, vgs: v}))), ans.vgs ? <Verdict ok={ok.vgs} /> : '–'],
            ['Gain with CS', inp('Gain with CS', ans.gB, (v) => setAns((a) => ({...a, gB: v}))), ans.gB ? <Verdict ok={ok.gB} /> : '–'],
            ['Gain without CS', inp('Gain without CS', ans.gU, (v) => setAns((a) => ({...a, gU: v}))), ans.gU ? <Verdict ok={ok.gU} /> : '–'],
            [
              'Phase',
              <select className={styles.select} aria-label="Phase" value={ans.ph ?? ''} onChange={(e) => setAns((a) => ({...a, ph: e.target.value}))}>
                <option value="">Choose…</option>
                <option value="0">0°</option>
                <option value="180">180°</option>
              </select>,
              ans.ph ? <Verdict ok={ok.ph} /> : '–',
            ],
            ['Zin (kΩ)', inp('Input impedance in kilohms', ans.zin, (v) => setAns((a) => ({...a, zin: v}))), ans.zin ? <Verdict ok={ok.zin} /> : '–'],
          ]}
        />
        <ResetKit
          onReset={() => {
            setRec({});
            setAns({});
            setPrinted(false);
            newKit();
          }}
        />
      </Section>
    </PracticalSheet>
  );
}
