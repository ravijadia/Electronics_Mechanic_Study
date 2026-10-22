import React, {createContext, useContext} from 'react';
import clsx from 'clsx';
import {COLUMN_TIPS} from './columnTips';
import styles from './styles.module.css';

export type GuideLang = 'en' | 'gu';

export interface GuideStep {
  label: React.ReactNode;
  hint?: React.ReactNode;
  done: boolean;
}

/** Set by <PracticalSheet> so tables further down can point at the next step. */
export interface SheetGuide {
  lang: GuideLang;
  steps: GuideStep[];
}

export const SheetGuideContext = createContext<SheetGuide | null>(null);

const TEXT = {
  en: {
    next: 'Next',
    step: 'step',
    of: 'of',
    allDone: 'All steps done ✓ Check your table, then complete the Result.',
    columns: 'What do the columns mean?',
  },
  gu: {
    next: 'હવે',
    step: 'પગલું',
    of: 'માંથી',
    allDone: 'બધાં પગલાં પૂર્ણ ✓ તમારું ટેબલ તપાસો, પછી Result પૂરું કરો.',
    columns: 'કૉલમનો અર્થ શું છે?',
  },
};

/**
 * One line above an observation table: the step the trainee should do next,
 * taken from the Steps panel, so they need not scroll back up to find it.
 */
export function NextStep(): React.JSX.Element | null {
  const guide = useContext(SheetGuideContext);
  if (!guide || guide.steps.length === 0) return null;
  const t = TEXT[guide.lang];
  const current = guide.steps.findIndex((s) => !s.done);
  const gu = guide.lang === 'gu';
  if (current < 0) {
    return (
      <div className={clsx(styles.nextStep, styles.nextDone, styles.noPrint, gu && styles.gu)} lang={gu ? 'gu' : undefined}>
        {t.allDone}
      </div>
    );
  }
  const s = guide.steps[current];
  return (
    <div className={clsx(styles.nextStep, styles.noPrint, gu && styles.gu)} lang={gu ? 'gu' : undefined} aria-live="polite">
      <span className={styles.nextTag}>
        {t.next}: {t.step} {current + 1} {t.of} {guide.steps.length}
      </span>{' '}
      {s.label}
      {s.hint && <span className={styles.stepHint}>{s.hint}</span>}
    </div>
  );
}

/** A collapsed list explaining the table columns that need it. Renders nothing when none do. */
export function ColumnHelp({heads}: {heads: React.ReactNode[]}): React.JSX.Element | null {
  const guide = useContext(SheetGuideContext);
  const lang = guide?.lang ?? 'en';
  const seen = new Set<string>();
  const items: {name: string; text: string}[] = [];
  for (const h of heads) {
    if (typeof h !== 'string') continue;
    const name = h.trim();
    const tip = COLUMN_TIPS[name];
    if (!tip || seen.has(name)) continue;
    seen.add(name);
    items.push({name, text: tip[lang]});
  }
  if (items.length === 0) return null;
  const gu = lang === 'gu';
  return (
    <details className={clsx(styles.colHelp, styles.noPrint, gu && styles.gu)} lang={gu ? 'gu' : undefined}>
      <summary>ⓘ {TEXT[lang].columns}</summary>
      <dl>
        {items.map((i) => (
          <React.Fragment key={i.name}>
            <dt>{i.name}</dt>
            <dd>{i.text}</dd>
          </React.Fragment>
        ))}
      </dl>
    </details>
  );
}
