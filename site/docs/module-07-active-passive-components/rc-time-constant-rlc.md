---
sidebar_position: 5
sidebar_label: RC Time Constant & RLC Circuits
---

# Chapter: RC Time Constant, RC Differentiator, and RLC Series/Parallel Circuits

**Module:** Active and Passive Components — Electronic Mechanic Trade
**Study No.:** 1.7.64 – 1.7.66

---

## 1. Introduction

When a resistor is combined with a capacitor (or an inductor), the circuit no longer responds instantly to a change in voltage — it responds gradually, over a characteristic time. This chapter covers the **RC time constant**, the **RC differentiator**, and how resistors, inductors, and capacitors interact together in **RLC circuits**.

---

## 2. RC Time Constant

When a capacitor charges or discharges through a resistor, it doesn't change instantly — it follows an exponential curve. The **time constant (τ, tau)** is the time it takes for the capacitor's voltage to change by about 63.2% of the way toward its final value.

```
τ = R × C
```

Where τ is in seconds, R in ohms, C in farads.

- After **1τ**, the capacitor reaches ≈63% of full charge (or discharges to ≈37% of initial voltage).
- After **5τ**, the capacitor is considered essentially fully charged (>99%) or fully discharged.

**Worked Example:** R = 10kΩ, C = 100µF.
```
τ = R × C = 10,000 × 0.0001 = 1 second
```
The capacitor reaches ~63% charge after 1 second, and is essentially fully charged after ~5 seconds.

---

## 3. RC Differentiator Circuit

An **RC differentiator** is a simple RC circuit (capacitor in series with the input, resistor to ground, output taken across the resistor) whose output is proportional to the **rate of change** of the input signal.

- Works well when the RC time constant is **much smaller** than the period of the input signal.
- When a square wave is applied, the output appears as sharp positive and negative **spikes** at each edge (rising/falling transition) of the input, rather than reproducing the square wave shape.
- **Applications:** Generating trigger pulses from a square wave, edge detection in digital/timing circuits.

---

## 4. RLC Series Circuit

An **RLC series circuit** connects a resistor, inductor, and capacitor in a single loop.

- **Impedance (Z):** The total opposition to AC current, combining resistance (R) and reactance (X_L − X_C).
- **Resonance:** At a specific frequency (the resonant frequency, f₀), the inductive reactance (X_L) and capacitive reactance (X_C) become equal and cancel out, leaving only resistance to oppose current — impedance is at its minimum, and current is at its maximum.

```
f₀ = 1 / (2π√(LC))
```

- Below resonance, the circuit behaves more capacitive; above resonance, more inductive.

---

## 5. RLC Parallel Circuit

In an **RLC parallel circuit**, R, L, and C are connected across the same two nodes.

- At resonance, the inductive and capacitive branch currents cancel each other (they are equal and opposite), so the total current drawn from the supply is at its **minimum**, and the circuit's impedance is at its **maximum**.
- The resonant frequency formula is the same as for the series circuit: f₀ = 1/(2π√(LC)).
- Parallel resonant circuits are commonly used as **tank circuits** in oscillators and tuning circuits (e.g. selecting a radio station frequency).

---

## 6. Key Points to Remember

- Time constant τ = R × C defines how fast a capacitor charges/discharges through a resistor
- A capacitor is ~63% charged after 1τ, and essentially fully charged after 5τ
- An RC differentiator produces sharp pulses at the edges of a square wave input when τ is much smaller than the signal period
- In a series RLC circuit, resonance gives minimum impedance and maximum current
- In a parallel RLC circuit, resonance gives maximum impedance and minimum supply current

---

## 7. Practice Questions

1. Calculate the time constant for R = 4.7kΩ and C = 220µF.
2. After how many time constants is a capacitor considered essentially fully charged?
3. What waveform shape appears at the output of an RC differentiator fed with a square wave?
4. What happens to impedance and current in a series RLC circuit at resonance?
5. Why are parallel RLC circuits commonly used in radio tuning circuits?

---

*Next module: Module 8 — Power Supply Circuits*

:::tip Practice
Take the **MCQ quiz** for this chapter: [Quiz: RC Time Constant, RC Differentiator, RLC Series/Parallel Circuits](/tests/module-07-active-passive-components/rc-time-constant-rlc)
:::
