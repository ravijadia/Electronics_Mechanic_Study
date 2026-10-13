import React, {useState} from 'react';
import {LegendMarker, type Marker} from './VIGraph';
import styles from './styles.module.css';

export interface XYSeries {
  id: string;
  label: string;
  color: string;
  marker: Marker;
  points: {x: number; y: number}[];
}

const W = 560;
const H = 300;
const M = {l: 52, r: 70, t: 14, b: 44};

function nice(lo: number, hi: number): [number, number, number] {
  const span = Math.max(hi - lo, 1e-6);
  const raw = span / 5;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw)!;
  return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step, step];
}

function MarkerAt({kind, x, y, color}: {kind: Marker; x: number; y: number; color: string}) {
  const c = {fill: color, stroke: 'var(--lab-panel)', strokeWidth: 2};
  if (kind === 'square') return <rect x={x - 5} y={y - 5} width={10} height={10} rx={1.5} {...c} />;
  if (kind === 'triangle') return <path d={`M${x} ${y - 6.5} L${x + 6} ${y + 4.5} L${x - 6} ${y + 4.5}Z`} {...c} />;
  if (kind === 'diamond') return <path d={`M${x} ${y - 6.5} L${x + 6.5} ${y} L${x} ${y + 6.5} L${x - 6.5} ${y}Z`} {...c} />;
  return <circle cx={x} cy={y} r={5.5} {...c} />;
}

/** Line chart of measured points (e.g. battery voltage against time). */
export default function XYGraph({
  series,
  xLabel,
  yLabel,
  yRange,
  xUnit = '',
  yUnit = '',
}: {
  series: XYSeries[];
  xLabel: string;
  yLabel: string;
  /** Fixed y range; otherwise fitted to the data. */
  yRange?: [number, number];
  xUnit?: string;
  yUnit?: string;
}): React.JSX.Element {
  const [hover, setHover] = useState<{x: number; y: number; text: string} | null>(null);
  const all = series.flatMap((s) => s.points);
  const [x0, x1, xs] = nice(0, Math.max(1, ...all.map((p) => p.x)));
  const [y0, y1, ys] = yRange
    ? [yRange[0], yRange[1], nice(yRange[0], yRange[1])[2]]
    : nice(Math.min(...all.map((p) => p.y)), Math.max(...all.map((p) => p.y)));
  const pw = W - M.l - M.r;
  const ph = H - M.t - M.b;
  const sx = (v: number) => M.l + ((v - x0) / (x1 - x0)) * pw;
  const sy = (v: number) => M.t + ph - ((v - y0) / (y1 - y0)) * ph;
  const range = (a: number, b: number, s: number) => {
    const out: number[] = [];
    for (let v = a; v <= b + s / 1000; v += s) out.push(Number(v.toFixed(6)));
    return out;
  };
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))));

  return (
    <div>
      {series.length > 1 && (
        <div className={styles.legend}>
          {series.map((s) => (
            <span key={s.id}>
              <LegendMarker kind={s.marker} color={s.color} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div className={styles.graph} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${yLabel} against ${xLabel}`}>
          {range(y0, y1, ys).map((t) => (
            <g key={`y${t}`}>
              <line className={styles.grid} x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} />
              <text className={styles.tick} x={M.l - 8} y={sy(t) + 4} textAnchor="end">
                {fmt(t)}
              </text>
            </g>
          ))}
          {range(x0, x1, xs).map((t) => (
            <text key={`x${t}`} className={styles.tick} x={sx(t)} y={H - M.b + 17} textAnchor="middle">
              {fmt(t)}
            </text>
          ))}
          <line className={styles.axis} x1={M.l} x2={W - M.r} y1={M.t + ph} y2={M.t + ph} />
          <line className={styles.axis} x1={M.l} x2={M.l} y1={M.t} y2={M.t + ph} />
          <text className={styles.axisTitle} x={M.l + pw / 2} y={H - 6} textAnchor="middle">
            {xLabel}
          </text>
          <text className={styles.axisTitle} transform={`translate(14 ${M.t + ph / 2}) rotate(-90)`} textAnchor="middle">
            {yLabel}
          </text>
          {series.map((s) => {
            const pts = [...s.points].sort((a, b) => a.x - b.x);
            if (pts.length < 2) return null;
            const last = pts[pts.length - 1];
            return (
              <g key={`l${s.id}`}>
                <polyline
                  points={pts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
                {series.length > 1 && (
                  <text className={styles.tick} x={sx(last.x) + 8} y={sy(last.y) + 4} style={{fontWeight: 600}}>
                    {s.label}
                  </text>
                )}
              </g>
            );
          })}
          {series.map((s) =>
            s.points.map((p, k) => (
              <g
                key={`${s.id}${k}`}
                onMouseEnter={() =>
                  setHover({x: (sx(p.x) / W) * 100, y: (sy(p.y) / H) * 100, text: `${s.label}: ${fmt(p.x)} ${xUnit}, ${fmt(p.y)} ${yUnit}`})
                }>
                <circle cx={sx(p.x)} cy={sy(p.y)} r={12} fill="transparent" />
                <MarkerAt kind={s.marker} x={sx(p.x)} y={sy(p.y)} color={s.color} />
              </g>
            )),
          )}
        </svg>
        {hover && (
          <div className={styles.tooltip} style={{left: `${hover.x}%`, top: `${hover.y}%`}}>
            {hover.text}
          </div>
        )}
      </div>
    </div>
  );
}
