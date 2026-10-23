import React, {useCallback, useMemo, useState} from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import Heading from '@theme/Heading';
import {ALL_PRACTICALS} from '@site/src/progress/useProgress';
import {listSubmissions, readingsOf, submitEnabled, type Listing, type Submission} from '@site/src/submit/client';
import type {SnapshotTable} from '@site/src/submit/snapshot';
import styles from './trainer.module.css';

const KEY_STORE = 'emt:trainer-key';

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const when = (t: number) => new Date(t).toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'});

interface Row {
  id: string;
  roll: string;
  name: string;
  done: Map<string, Submission>;
}

function loadKey(): string {
  try {
    return window.sessionStorage.getItem(KEY_STORE) ?? '';
  } catch {
    return '';
  }
}

export default function Trainer(): React.JSX.Element {
  const [key, setKey] = useState('');
  const [data, setData] = useState<Listing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [batch, setBatch] = useState('');
  const [search, setSearch] = useState('');
  const [allCols, setAllCols] = useState(false);
  const [pick, setPick] = useState<Submission | null>(null);
  const [tables, setTables] = useState<SnapshotTable[] | null>(null);

  const load = useCallback(async (k: string) => {
    setBusy(true);
    setError('');
    const res = await listSubmissions(k);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    try {
      window.sessionStorage.setItem(KEY_STORE, k);
    } catch {
      // ignore
    }
    setData(res);
    setBatch((b) => (b && res.batches.includes(b) ? b : res.batches[0] ?? res.submissions[0]?.batch ?? ''));
    setPick(null);
  }, []);

  // Pick up the key typed earlier in this browser tab.
  React.useEffect(() => {
    const k = loadKey();
    if (k) {
      setKey(k);
      void load(k);
    }
  }, [load]);

  const batches = useMemo(() => (data ? [...new Set([...data.batches, ...data.submissions.map((s) => s.batch)])] : []), [data]);

  const {rows, cols} = useMemo(() => {
    if (!data || !batch) return {rows: [] as Row[], cols: [] as typeof ALL_PRACTICALS};
    const inBatch = (b: string) => norm(b) === norm(batch);
    const map = new Map<string, Row>();
    const row = (roll: string, name: string) => {
      const id = norm(roll) || norm(name);
      let r = map.get(id);
      if (!r) map.set(id, (r = {id, roll, name, done: new Map()}));
      return r;
    };
    data.roster.filter((x) => inBatch(x.batch)).forEach((x) => row(x.roll, x.name));
    data.submissions.filter((s) => inBatch(s.batch)).forEach((s) => row(s.roll, s.name).done.set(s.practical, s));
    const used = new Set([...map.values()].flatMap((r) => [...r.done.keys()]));
    const list = [...map.values()].sort((a, b) => a.roll.localeCompare(b.roll, undefined, {numeric: true}));
    return {rows: list, cols: ALL_PRACTICALS.filter((p) => allCols || used.has(p.no))};
  }, [data, batch, allCols]);

  const shown = rows.filter((r) => !search.trim() || `${r.roll} ${r.name}`.toLowerCase().includes(search.trim().toLowerCase()));
  const total = rows.reduce((n, r) => n + r.done.size, 0);
  const colDone = (no: string) => rows.filter((r) => r.done.has(no)).length;

  const open = async (s: Submission) => {
    setPick(s);
    setTables(null);
    const res = await readingsOf(key, s.id);
    setTables(res.ok ? res.tables : []);
  };

  const exportCsv = () => {
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [['Roll', 'Name', 'Practicals sent', ...cols.map((c) => c.no)].map(q).join(',')];
    for (const r of shown) lines.push([r.roll, r.name, r.done.size, ...cols.map((c) => (r.done.has(c.no) ? 'Yes' : ''))].map(q).join(','));
    const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], {type: 'text/csv'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = `practicals-${batch || 'batch'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout title="Trainer dashboard" description="Practical records sent by trainees.">
      <Head>
        <meta name="robots" content="noindex" />
      </Head>
      <main className={clsx('container', styles.page)}>
        <Heading as="h1">Trainer dashboard</Heading>

        {!submitEnabled ? (
          <p className={styles.note}>
            Sending to the trainer is not switched on yet. Follow <code>trainer-setup/SETUP.md</code>, then paste the web app URL into{' '}
            <code>site/src/submit/config.ts</code>.
          </p>
        ) : (
          <>
            <form
              className={styles.bar}
              onSubmit={(e) => {
                e.preventDefault();
                void load(key.trim());
              }}>
              <label>
                Trainer key{' '}
                <input type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" className={styles.input} />
              </label>
              <button type="submit" className="button button--primary" disabled={busy || !key.trim()}>
                {busy ? 'Loading…' : data ? 'Refresh' : 'Open'}
              </button>
              {error && <span className={styles.err}>{error}</span>}
            </form>

            {data && (
              <>
                <div className={styles.bar}>
                  <label>
                    Batch{' '}
                    <select value={batch} onChange={(e) => setBatch(e.target.value)} className={styles.input}>
                      {batches.map((b) => (
                        <option key={b}>{b}</option>
                      ))}
                    </select>
                  </label>
                  <input type="search" placeholder="Find a trainee" value={search} onChange={(e) => setSearch(e.target.value)} className={styles.input} />
                  <label>
                    <input type="checkbox" checked={allCols} onChange={(e) => setAllCols(e.target.checked)} /> Show all practicals
                  </label>
                  <button type="button" className="button button--secondary button--sm" onClick={exportCsv} disabled={!shown.length}>
                    Download as Excel (CSV)
                  </button>
                </div>

                <p className={styles.note}>
                  {rows.length} trainees · {total} records received · {rows.filter((r) => r.done.size === 0).length} have sent nothing. Click a ✓ to see the readings and open the PDF.
                </p>

                {rows.length === 0 ? (
                  <p className={styles.note}>Nothing received for this batch yet.</p>
                ) : (
                  <div className={styles.scroll}>
                    <table className={styles.grid}>
                      <thead>
                        <tr>
                          <th className={styles.who}>Trainee</th>
                          <th>Sent</th>
                          {cols.map((c) => (
                            <th key={c.no} title={c.title}>
                              <span className={styles.vert}>{c.no}</span>
                              <small>{colDone(c.no)}</small>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {shown.map((r) => (
                          <tr key={r.id}>
                            <th className={styles.who} scope="row">
                              {r.roll && <span className={styles.roll}>{r.roll}</span>} {r.name}
                            </th>
                            <td className={styles.count}>{r.done.size}</td>
                            {cols.map((c) => {
                              const s = r.done.get(c.no);
                              return (
                                <td key={c.no} className={styles.cell}>
                                  {s && (
                                    <button
                                      type="button"
                                      className={clsx(styles.tick, s.stepsDone < s.stepsTotal - 1 && styles.partial)}
                                      aria-label={`${r.name}, ${c.no}, sent ${when(s.submitted)}`}
                                      title={`${when(s.submitted)} · steps ${s.stepsDone}/${s.stepsTotal}`}
                                      onClick={() => void open(s)}>
                                      ✓
                                    </button>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className={styles.legend}>
                  <span className={styles.tick}>✓</span> sent · <span className={clsx(styles.tick, styles.partial)}>✓</span> sent with steps left unfinished
                </p>

                {pick && (
                  <section className={styles.detail} aria-live="polite">
                    <div className={styles.detailHead}>
                      <div>
                        <Heading as="h2">
                          {pick.practical} {pick.title.replace(/^\d+\.\d+\.\d+\s*/, '')}
                        </Heading>
                        <p>
                          {pick.name} · Roll {pick.roll} · {pick.batch} · sent {when(pick.submitted)}
                          {pick.attempts > 1 && ` (sent ${pick.attempts} times, latest shown)`}
                        </p>
                        <p>
                          Steps {pick.stepsDone}/{pick.stepsTotal} · ✓ {pick.correct} correct · ✗ {pick.wrong} wrong entries
                        </p>
                      </div>
                      <div>
                        <a className="button button--primary" href={pick.pdf} target="_blank" rel="noreferrer">
                          Open PDF
                        </a>{' '}
                        <button type="button" className="button button--secondary" onClick={() => setPick(null)}>
                          Close
                        </button>
                      </div>
                    </div>
                    {tables == null && <p>Loading readings…</p>}
                    {tables?.length === 0 && <p>No readings were recorded.</p>}
                    {tables?.map((t, i) => (
                      <div key={i} className={styles.scroll}>
                        <table className={styles.readings}>
                          {t.title && <caption>{t.title}</caption>}
                          <tbody>
                            {t.rows.map((row, j) => (
                              <tr key={j}>
                                {row.map((c, k) => (j === 0 ? <th key={k}>{c}</th> : <td key={k}>{c}</td>))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>
    </Layout>
  );
}
