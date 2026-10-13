// Nodal DC solver for small resistor networks (Module 7 circuit-law benches).
// Node "N" is ground. Every node has a tiny leak to ground so a floating
// node solves to 0 V instead of making the matrix singular.

export interface Branch {
  a: string;
  b: string;
  ohms: number;
}

export interface CurrentSource {
  /** Current flows out of `from` through the source into `to` (A). */
  from: string;
  to: string;
  amps: number;
}

const GMIN = 1e-9;

export function solveNodes(branches: Branch[], sources: CurrentSource[]): Record<string, number> {
  const names = new Set<string>();
  for (const b of branches) (names.add(b.a), names.add(b.b));
  for (const s of sources) (names.add(s.from), names.add(s.to));
  names.delete('N');
  const idx = [...names];
  const at = Object.fromEntries(idx.map((n, k) => [n, k]));
  const n = idx.length;
  const G = Array.from({length: n}, () => new Array<number>(n + 1).fill(0));
  for (let k = 0; k < n; k++) G[k][k] += GMIN;
  for (const br of branches) {
    if (!isFinite(br.ohms) || br.a === br.b) continue;
    const g = 1 / Math.max(br.ohms, 1e-6);
    const a = at[br.a];
    const b = at[br.b];
    if (a != null) G[a][a] += g;
    if (b != null) G[b][b] += g;
    if (a != null && b != null) {
      G[a][b] -= g;
      G[b][a] -= g;
    }
  }
  for (const s of sources) {
    // Injected into `to`, drawn from `from`.
    if (at[s.to] != null) G[at[s.to]][n] += s.amps;
    if (at[s.from] != null) G[at[s.from]][n] -= s.amps;
  }
  // Gaussian elimination with partial pivoting.
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(G[r][c]) > Math.abs(G[p][c])) p = r;
    [G[c], G[p]] = [G[p], G[c]];
    const d = G[c][c];
    for (let r = 0; r < n; r++) {
      if (r === c || G[r][c] === 0) continue;
      const f = G[r][c] / d;
      for (let k = c; k <= n; k++) G[r][k] -= f * G[c][k];
    }
  }
  const v: Record<string, number> = {N: 0};
  idx.forEach((name, k) => (v[name] = G[k][n] / G[k][k]));
  return v;
}

/** Resistance seen between two nodes (test current of 1 mA). */
export function resistanceBetween(branches: Branch[], a: string, b: string): number {
  const v = solveNodes(branches, [{from: b, to: a, amps: 1e-3}]);
  const r = ((v[a] ?? 0) - (v[b] ?? 0)) / 1e-3;
  return r > 1e8 ? Infinity : r;
}
