import React, {useState} from 'react';
import styles from './styles.module.css';

export type Marker = 'circle' | 'square' | 'triangle' | 'diamond';

export interface GraphSeries {
  id: string;
  label: string;
  /** CSS colour, normally a var(--sN) token. */
  color: string;
  marker: Marker;
  points: {v: number; imA: number}[];
  /** Best-fit resistance (Ω) for the line through the origin, if known. */
  fitR: number | null;
}

const W = 560;
const H = 320;
const M = {l: 52, r: 74, t: 14, b: 44};

function niceMax(x: number): number {
  if (x <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(x));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * p >= x) return m * p;
  }
  return 10 * p;
}

function MarkerShape({
  kind,
  x,
  y,
  color,
}: {
  kind: Marker;
  x: number;
  y: number;
  color: string;
}): React.JSX.Element {
  const common = {
    fill: color,
    stroke: 'var(--lab-panel)',
    strokeWidth: 2,
  };
  switch (kind) {
    case 'square':
      return <rect x={x - 5} y={y - 5} width={10} height={10} rx={1.5} {...common} />;
    case 'triangle':
      return <path d={`M${x} ${y - 6.5} L${x + 6} ${y + 4.5} L${x - 6} ${y + 4.5}Z`} {...common} />;
    case 'diamond':
      return <path d={`M${x} ${y - 6.5} L${x + 6.5} ${y} L${x} ${y + 6.5} L${x - 6.5} ${y}Z`} {...common} />;
    default:
      return <circle cx={x} cy={y} r={5.5} {...common} />;
  }
}

export function LegendMarker({kind, color}: {kind: Marker; color: string}): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
      <MarkerShape kind={kind} x={0} y={0} color={color} />
    </svg>
  );
}

/** Current (mA, y) against voltage (V, x), with a best-fit line per series. */
export default function VIGraph({series}: {series: GraphSeries[]}): React.JSX.Element {
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  const all = series.flatMap((s) => s.points);
  const xMax = niceMax(Math.max(1, ...all.map((p) => p.v)));
  const yMax = niceMax(Math.max(1, ...all.map((p) => p.imA)));
  const pw = W - M.l - M.r;
  const ph = H - M.t - M.b;
  const sx = (v: number) => M.l + (v / xMax) * pw;
  const sy = (i: number) => M.t + ph - (i / yMax) * ph;
  const ticks = (max: number) => [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(n < 1 ? 2 : 1));

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
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Graph of current against voltage for each resistor tested">
          {ticks(yMax).map((t) => (
            <g key={`y${t}`}>
              <line className={styles.grid} x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} />
              <text className={styles.tick} x={M.l - 8} y={sy(t) + 4} textAnchor="end">
                {fmt(t)}
              </text>
            </g>
          ))}
          {ticks(xMax).map((t) => (
            <text key={`x${t}`} className={styles.tick} x={sx(t)} y={H - M.b + 17} textAnchor="middle">
              {fmt(t)}
            </text>
          ))}
          <line className={styles.axis} x1={M.l} x2={W - M.r} y1={sy(0)} y2={sy(0)} />
          <line className={styles.axis} x1={M.l} x2={M.l} y1={M.t} y2={sy(0)} />
          <text className={styles.axisTitle} x={M.l + pw / 2} y={H - 6} textAnchor="middle">
            Voltage across R, V (volts)
          </text>
          <text
            className={styles.axisTitle}
            transform={`translate(14 ${M.t + ph / 2}) rotate(-90)`}
            textAnchor="middle">
            Current, I (mA)
          </text>

          {series.map((s) => {
            if (!s.fitR) return null;
            // Line I = V / R, clipped to the plot box.
            const vEnd = Math.min(xMax, (yMax / 1000) * s.fitR);
            const iEnd = (vEnd / s.fitR) * 1000;
            return (
              <g key={`fit${s.id}`}>
                <line
                  x1={sx(0)}
                  y1={sy(0)}
                  x2={sx(vEnd)}
                  y2={sy(iEnd)}
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <text
                  className={styles.tick}
                  x={sx(vEnd) + 6}
                  y={sy(iEnd) + 4}
                  style={{fontWeight: 600}}>
                  {s.label}
                </text>
              </g>
            );
          })}
          {series.map((s) =>
            s.points.map((p, k) => (
              <g
                key={`${s.id}-${k}`}
                onMouseEnter={() =>
                  setHover({
                    x: (sx(p.v) / W) * 100,
                    y: (sy(p.imA) / H) * 100,
                    text: `${s.label}: ${p.v.toFixed(2)} V, ${p.imA.toFixed(2)} mA`,
                  })
                }>
                <circle cx={sx(p.v)} cy={sy(p.imA)} r={12} fill="transparent" />
                <MarkerShape kind={s.marker} x={sx(p.v)} y={sy(p.imA)} color={s.color} />
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
