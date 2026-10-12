import React, {useState} from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import {PRACTICAL_MODULES, type PracticalKind} from '@site/src/data/practicals';
import styles from './practicals.module.css';

const KIND: Record<PracticalKind, {label: string; short: string; icon: string; blurb: string}> = {
  sim: {
    label: 'Virtual bench',
    short: 'Bench',
    icon: '⚡',
    blurb: 'Wire it, measure with virtual instruments, record readings and print the record.',
  },
  interactive: {
    label: 'Interactive trainer',
    short: 'Trainer',
    icon: '◎',
    blurb: 'Identify, choose and put steps in order: signs, tools, components, procedures.',
  },
  handson: {
    label: 'Workshop only',
    short: 'Workshop',
    icon: '✋',
    blurb: 'A physical skill (soldering, filing, crimping). Practise it in the workshop.',
  },
  software: {
    label: 'Use simulation software',
    short: 'Software',
    icon: '▣',
    blurb: 'This module is about using circuit-simulation software itself.',
  },
};

type Filter = 'all' | 'ready' | PracticalKind;

const all = PRACTICAL_MODULES.flatMap((m) => m.items);
const count = (k: PracticalKind) => all.filter((x) => x.kind === k).length;
const ready = all.filter((x) => x.path).length;

export default function Practicals(): React.JSX.Element {
  const [filter, setFilter] = useState<Filter>('all');
  const show = (kind: PracticalKind, built: boolean) =>
    filter === 'all' || (filter === 'ready' ? built : filter === kind);

  const filters: [Filter, string][] = [
    ['all', `All (${all.length})`],
    ['ready', `Ready now (${ready})`],
    ['sim', `${KIND.sim.short} (${count('sim')})`],
    ['interactive', `${KIND.interactive.short} (${count('interactive')})`],
    ['handson', `${KIND.handson.short} (${count('handson')})`],
    ['software', `${KIND.software.short} (${count('software')})`],
  ];

  return (
    <Layout
      title="Virtual Lab: 1st Year Practicals"
      description="Virtual practicals for the Electronic Mechanic trade, 1st year: wire the circuit, measure, record and print your practical record.">
      <main className={clsx('container', styles.page)}>
        <Heading as="h1">Virtual Lab: 1st Year Practicals</Heading>
        <p className={styles.lead}>
          1st-year practicals on a virtual trainer kit: wire it, measure, record, print your record.
        </p>

        <div className={styles.stats}>
          {(['sim', 'interactive', 'handson', 'software'] as PracticalKind[]).map((k) => (
            <div key={k} className={styles.stat}>
              <span className={styles.statNum}>{count(k)}</span>
              <span className={styles.statLabel}>
                <span aria-hidden="true">{KIND[k].icon}</span> {KIND[k].label}
              </span>
              <span className={styles.statBlurb}>{KIND[k].blurb}</span>
            </div>
          ))}
        </div>
        <p className={styles.summary}>
          <b>{ready}</b> of {count('sim') + count('interactive')} on-screen practicals ready. More added module by module.
        </p>

        <div className={styles.filters} role="group" aria-label="Filter practicals">
          {filters.map(([f, label]) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}>
              {label}
            </button>
          ))}
        </div>

        {PRACTICAL_MODULES.map((m) => {
          const items = m.items.filter((x) => show(x.kind, !!x.path));
          if (items.length === 0) return null;
          return (
            <section key={m.module} className={styles.module}>
              <div className={styles.moduleHead}>
                <Heading as="h2" id={`module-${m.module}`}>
                  Module {m.module}: {m.title}
                </Heading>
                {m.docs && (
                  <Link to={m.docs} className={styles.moduleLink}>
                    Study material →
                  </Link>
                )}
              </div>
              <ul className={styles.list}>
                {items.map((x) => (
                  <li key={x.no} className={clsx(styles.item, x.path && styles.itemReady)}>
                    <span className={styles.no}>{x.no}</span>
                    <span className={styles.title}>
                      {x.path ? <Link to={x.path}>{x.title}</Link> : x.title}
                    </span>
                    <span className={clsx(styles.badge, styles[x.kind])}>
                      <span aria-hidden="true">{KIND[x.kind].icon}</span> {KIND[x.kind].short}
                    </span>
                    <span className={styles.action}>
                      {x.path ? (
                        <Link className={clsx('button button--primary button--sm')} to={x.path}>
                          Open
                        </Link>
                      ) : x.kind === 'sim' || x.kind === 'interactive' ? (
                        <span className={styles.soon}>Coming soon</span>
                      ) : (
                        <span className={styles.soon}>Not simulated</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </main>
    </Layout>
  );
}
