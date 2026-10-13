// Simple 12 V lead-acid battery model for Module 3 practicals.
// Accurate enough to give realistic curve shapes, not a design tool.

export const CAPACITY_AH = 7;
export const CUTOFF_V = 10.5;
export const CHARGE_A = 0.7; // C/10
export const CHARGE_VMAX = 14.4;

/** Open-circuit (rest) voltage: 12.7 V full, ~11.8 V at 10 %, collapsing when empty. */
export const ocv = (soc: number) => {
  const s = clamp01(soc);
  return 11.7 + 1.0 * s - 15 * Math.max(0, 0.1 - s);
};

/** Internal resistance rises sharply as the battery empties. */
export const rint = (soc: number) => 0.04 + 1.5 * (1 - clamp01(soc)) ** 6;

/** Specific gravity of the electrolyte: about 1.12 empty to 1.28 full. */
export const sgOf = (soc: number) => 1.12 + 0.16 * clamp01(soc);

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export function discharge(soc: number, loadOhms: number) {
  const r = rint(soc);
  const i = ocv(soc) / (loadOhms + r);
  return {i, v: ocv(soc) - i * r};
}

export function charge(soc: number) {
  const s = clamp01(soc);
  const i = s < 0.8 ? CHARGE_A : CHARGE_A * Math.max(0.04, (1 - s) / 0.2);
  const eta = 0.35 + 1.6 * s ** 6; // over-voltage while charging
  return {i, v: Math.min(CHARGE_VMAX, Math.max(ocv(s), 11.8) + i * 0.05 + eta)};
}

/**
 * Advance the battery by `hours` in a mode. Returns the new state of charge
 * and the Ah moved (out for discharge, in for charge).
 */
export function advance(soc: number, mode: 'discharge' | 'charge' | 'idle', hours: number, loadOhms: number) {
  let s = soc;
  let ah = 0;
  const dt = 0.02;
  for (let t = 0; t < hours - 1e-9; t += dt) {
    if (mode === 'discharge') {
      if (s <= 0) break;
      const {i} = discharge(s, loadOhms);
      // Usable capacity falls at high current (Peukert effect, rated at C/20).
      s -= ((i * dt) / CAPACITY_AH) * (i / (CAPACITY_AH / 20)) ** 0.15;
      ah += i * dt;
    } else if (mode === 'charge') {
      const {i} = charge(s);
      s += (i * dt * 0.9) / CAPACITY_AH; // ~90 % charge efficiency
      ah += i * dt;
    }
    s = Math.max(0, Math.min(1, s));
  }
  return {soc: s, ah};
}
