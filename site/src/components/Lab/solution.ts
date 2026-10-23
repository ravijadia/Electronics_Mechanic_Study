import type React from 'react';

/** Text in both languages. A plain string is shown as it is in both (formulas and numbers). */
export type Bi = string | {en: string; gu: string};

export const L2 = (en: string, gu: string): Bi => ({en, gu});

export function pick(b: Bi | undefined, lang: 'en' | 'gu'): string | undefined {
  if (b == null) return undefined;
  return typeof b === 'string' ? b : b[lang];
}

/**
 * Help shown when a table entry is marked wrong.
 * hint = the formula or where to look (no numbers); work = the calculation with this trainee's readings;
 * answer = the correct value. entered/expected let the lab spot the common slip automatically.
 */
export interface Fix {
  hint?: Bi;
  work?: Bi;
  answer?: React.ReactNode;
  entered?: number | null;
  expected?: number | null;
}

/** A number written with up to 4 significant figures (whole numbers from 1000 up) and no trailing zeros. */
export function fmt(x: number | null | undefined): string {
  if (x == null || !Number.isFinite(x)) return '–';
  if (x === 0) return '0';
  if (Math.abs(x) >= 1000) return String(Math.round(x));
  return String(Number(x.toPrecision(4)));
}

const SQ2 = Math.SQRT2;

type Slip = {r: number; en: string; gu: string};

const PREFIX_EN = 'Check mV ↔ V, µA ↔ mA and kΩ ↔ Ω.';
const PREFIX_GU = 'mV ↔ V, µA ↔ mA અને kΩ ↔ Ω ના એકમો તપાસો.';

const SLIPS: Slip[] = [
  {r: 1000, en: `Your value is 1000× too big. ${PREFIX_EN}`, gu: `તમારી કિંમત 1000 ગણી મોટી છે. ${PREFIX_GU}`},
  {r: 1 / 1000, en: `Your value is 1000× too small. ${PREFIX_EN}`, gu: `તમારી કિંમત 1000 ગણી નાની છે. ${PREFIX_GU}`},
  {r: 1e6, en: 'Your value is 10^6× too big. Check µ ↔ base unit (µF ↔ F, µA ↔ A).', gu: 'તમારી કિંમત 10^6 ગણી મોટી છે. µ ↔ મૂળ એકમ (µF ↔ F, µA ↔ A) તપાસો.'},
  {r: 1e-6, en: 'Your value is 10^6× too small. Check µ ↔ base unit (µF ↔ F, µA ↔ A).', gu: 'તમારી કિંમત 10^6 ગણી નાની છે. µ ↔ મૂળ એકમ (µF ↔ F, µA ↔ A) તપાસો.'},
  {r: 10, en: 'Your value is 10× too big. Is the decimal point in the right place?', gu: 'તમારી કિંમત 10 ગણી મોટી છે. દશાંશ ચિહ્ન (decimal point) સાચી જગ્યાએ છે?'},
  {r: 0.1, en: 'Your value is 10× too small. Is the decimal point in the right place?', gu: 'તમારી કિંમત 10 ગણી નાની છે. દશાંશ ચિહ્ન (decimal point) સાચી જગ્યાએ છે?'},
  {r: 100, en: 'Your value is 100× too big. Did you mix a percentage with a fraction?', gu: 'તમારી કિંમત 100 ગણી મોટી છે. ટકા (%) અને અપૂર્ણાંક ભેળવ્યા?'},
  {r: 0.01, en: 'Your value is 100× too small. Did you mix a percentage with a fraction?', gu: 'તમારી કિંમત 100 ગણી નાની છે. ટકા (%) અને અપૂર્ણાંક ભેળવ્યા?'},
  {r: 2 * SQ2, en: 'Out by 2√2: you used Vp-p where Vrms is needed (Vrms = Vp-p ÷ 2√2)? Or the other way round.', gu: '2√2 નો તફાવત: જ્યાં Vrms જોઈએ ત્યાં Vp-p વાપર્યો (Vrms = Vp-p ÷ 2√2)? અથવા ઊલટું.'},
  {r: 1 / (2 * SQ2), en: 'Out by 2√2: you used Vrms where Vp-p is needed (Vp-p = 2√2 × Vrms)? Or the other way round.', gu: '2√2 નો તફાવત: જ્યાં Vp-p જોઈએ ત્યાં Vrms વાપર્યો (Vp-p = 2√2 × Vrms)? અથવા ઊલટું.'},
  {r: 2 * Math.PI, en: 'Out by 2π: ω = 2πf. Did you use ω where f is needed (or the other way round)?', gu: '2π નો તફાવત: ω = 2πf. જ્યાં f જોઈએ ત્યાં ω વાપર્યો (કે ઊલટું)?'},
  {r: 1 / (2 * Math.PI), en: 'Out by 2π: ω = 2πf. Did you use f where ω is needed (or the other way round)?', gu: '2π નો તફાવત: ω = 2πf. જ્યાં ω જોઈએ ત્યાં f વાપર્યો (કે ઊલટું)?'},
  {r: SQ2, en: 'Out by √2: peak and RMS are mixed up (Vp = 1.414 × Vrms).', gu: '√2 નો તફાવત: પીક અને RMS ભેળવાઈ ગયા (Vp = 1.414 × Vrms).'},
  {r: 1 / SQ2, en: 'Out by √2: peak and RMS are mixed up (Vp = 1.414 × Vrms).', gu: '√2 નો તફાવત: પીક અને RMS ભેળવાઈ ગયા (Vp = 1.414 × Vrms).'},
  {r: 2, en: 'Your value is double. Peak vs peak-to-peak, or a factor of 2 in the formula?', gu: 'તમારી કિંમત બમણી છે. પીક અને પીક-ટુ-પીક, કે ફોર્મ્યુલામાં 2 નો ગુણક?'},
  {r: 0.5, en: 'Your value is half. Peak vs peak-to-peak, or a factor of 2 in the formula?', gu: 'તમારી કિંમત અડધી છે. પીક અને પીક-ટુ-પીક, કે ફોર્મ્યુલામાં 2 નો ગુણક?'},
  {r: -1, en: 'The sign is wrong. Check the polarity of the probes or the direction of the subtraction.', gu: 'ચિહ્ન (sign) ખોટું છે. પ્રોબની પોલારિટી કે બાદબાકીની દિશા તપાસો.'},
];

const near = (a: number, b: number, tol = 0.04) => Math.abs(a - b) <= tol * Math.abs(b);

/** Spot the usual slips (wrong prefix, peak/RMS, upside-down ratio, sign) from the entered and the correct value. */
export function diagnose(entered: number | null | undefined, expected: number | null | undefined): Bi | null {
  if (entered == null || expected == null) return null;
  if (!Number.isFinite(entered) || !Number.isFinite(expected) || expected === 0 || entered === 0) return null;
  const r = entered / expected;
  for (const s of SLIPS) if (near(r, s.r)) return L2(s.en, s.gu);
  if (Math.abs(Math.log(expected)) > 0.25 && near(entered * expected, 1)) {
    return L2('You gave the reciprocal. Did you divide the wrong way round (for example f = 1 ÷ T)?', 'તમે વ્યસ્ત (reciprocal) કિંમત લખી. ભાગાકાર ઊલટો કર્યો (દા.ત. f = 1 ÷ T)?');
  }
  return null;
}
