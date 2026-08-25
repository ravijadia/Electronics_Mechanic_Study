---
sidebar_position: 7
sidebar_label: Clamper Circuits
---

# Chapter: Clamper Circuits

**Module:** Transistor — Electronic Mechanic Trade
**Study No.:** 1.9.94 & 1.9.95

---

## 1. Introduction

A **clamper circuit** is a diode-based wave-shaping circuit that shifts an entire input waveform up or down to a different DC level, **without changing its shape**. Unlike a clipper, which removes part of the waveform, a clamper preserves the full waveform and simply repositions it relative to a new reference voltage — this is why it is also called a **DC restorer** or **DC level shifter**.

---

## 2. Basic Principle and Components

A basic clamper circuit consists of:

- A **capacitor** connected in series with the input signal
- A **diode** connected in parallel (shunt) with the output
- Optionally, a **DC bias source** in series with the diode for a biased clamper, and a **load resistor**

**Working:** During the half-cycle when the diode conducts, the capacitor charges up to (nearly) the peak value of the input voltage. This charged capacitor then acts as a small DC battery in series with the input for the rest of the waveform, shifting the entire signal up or down by that charged voltage. For correct clamping, the **RC time constant** of the circuit (R = load resistance, C = clamping capacitor) must be much **larger** than the time period of the input signal, so the capacitor does not significantly discharge between cycles.

---

## 3. Types of Clampers

### a) Positive Clamper

Shifts the entire waveform **upward** so that its lowest point rests at (or near) 0V — the whole waveform now appears above the reference (all positive).

### b) Negative Clamper

Shifts the entire waveform **downward** so that its highest point rests at (or near) 0V — the whole waveform now appears below the reference (all negative).

### c) Biased Clamper

Adding a DC bias voltage in series with the diode shifts the clamped waveform to rest at any chosen reference level (instead of exactly 0V) — positively or negatively biased, depending on the polarity of the added source.

---

## 4. Clamper vs. Clipper — Key Difference

| Aspect | Clipper | Clamper |
|---|---|---|
| Waveform shape | Altered (part removed) | Preserved (shape unchanged) |
| Function | Removes part of the signal | Shifts DC reference level of the signal |
| Key component | Diode (series or shunt) | Diode + Capacitor |
| RC time constant | Not critical | Must be much greater than input signal period |
| Also known as | Limiter | DC restorer |

---

## 5. Applications

- Restoring the DC level of a signal after AC coupling (e.g., in television receivers to restore picture brightness levels)
- Shifting signal levels to suit the input range of following stages
- Testing and protection circuits where a known DC reference must be re-established

---

## 6. Key Points to Remember

- A clamper shifts a waveform's DC level up or down while keeping its shape unchanged
- Also called a DC restorer, as it uses a capacitor and diode combination
- The RC time constant must be much larger than the input signal's time period for correct clamping
- Positive clamper shifts the waveform upward; negative clamper shifts it downward
- A biased clamper can shift the waveform to rest at any chosen DC reference, not just 0V

---

## 7. Practice Questions

1. How does a clamper circuit differ from a clipper circuit?
2. What two components are essential in a basic clamper circuit?
3. Why must the RC time constant be much larger than the input signal's time period in a clamper?
4. Differentiate between a positive clamper and a negative clamper.
5. Name a practical application where clamper circuits are used.

---

*Next chapter: Module 10 — Field Effect Transistor*

:::tip Practice
Take the **MCQ quiz** for this chapter: [Quiz: Clamper Circuits](/tests/module-09-transistor/clamper-circuits)
:::
