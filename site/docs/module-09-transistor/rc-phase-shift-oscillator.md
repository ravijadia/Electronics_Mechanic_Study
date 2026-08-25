---
sidebar_position: 4
sidebar_label: RC Phase Shift Oscillator
---

# Chapter: RC Phase Shift Oscillator

**Module:** Transistor — Electronic Mechanic Trade
**Study No.:** 1.9.90

---

## 1. Introduction

The **RC Phase Shift Oscillator** is a low-frequency (audio range) sine wave generator that uses a network of resistor-capacitor (RC) sections, instead of an LC tank circuit, to set the frequency of oscillation and provide the phase shift required for positive feedback.

---

## 2. Circuit Description

The circuit consists of:

- A single-stage **transistor amplifier in Common Emitter (CE) configuration** — CE gives a 180° phase shift between its input and output.
- A **feedback network of three identical RC sections** connected from the collector output back to the base input.

Each RC section contributes a phase shift; three cascaded sections together provide an additional **180° phase shift** at the chosen frequency of oscillation.

**Total phase shift around the loop = 180° (from CE amplifier) + 180° (from 3 RC sections) = 360° (= 0°),** satisfying the Barkhausen criterion for oscillation.

---

## 3. Why Three RC Sections?

- Each single RC section can provide a phase shift approaching, but never reaching, 90°.
- To reliably obtain the full 180° needed, **at least three sections** are used (each contributing 60° at the design frequency).
- Using three identical sections also simplifies the frequency formula, since each section has the same R and C values.

---

## 4. Frequency of Oscillation

For three identical RC sections (each with resistance R and capacitance C):

```
f = 1 / (2π√6 × RC)
```

---

## 5. Worked Example

**Question:** Find the frequency of oscillation of an RC phase shift oscillator with R = 10 kΩ and C = 0.01 µF in each of the three RC sections.

**Solution:**
```
f = 1 / (2π√6 × RC)
RC = 10 × 10^3 × 0.01 × 10^-6 = 1 × 10^-4
√6 ≈ 2.449
f = 1 / (2π × 2.449 × 1×10^-4)
f = 1 / (1.539 × 10^-3)
f ≈ 650 Hz
```

**Answer:** The oscillator produces a sine wave at approximately **650 Hz**, in the audio frequency range.

---

## 6. Key Features and Applications

| Feature | Detail |
|---|---|
| Waveform output | Sine wave |
| Frequency range | Audio range (low frequency) |
| Frequency stability | Moderate (less stable than crystal oscillators) |
| Frequency-setting elements | Three identical RC sections |
| Typical application | Audio signal generators, low-frequency test equipment |

---

## 7. Key Points to Remember

- Uses CE amplifier (180° shift) + 3 RC sections (180° shift) = total 360° for positive feedback
- Minimum of three RC sections is required to achieve the needed 180° phase shift
- Frequency formula: f = 1 / (2π√6 RC), using identical R and C values in each section
- Best suited for generating audio-frequency sine waves, not for high (RF) frequencies

---

## 8. Practice Questions

1. Why does an RC phase shift oscillator need at least three RC sections?
2. Derive/state the frequency formula for a 3-section RC phase shift oscillator.
3. Calculate the frequency of oscillation if R = 4.7 kΩ and C = 0.01 µF.
4. Why is the transistor connected in Common Emitter configuration in this oscillator?
5. Where would you use an RC phase shift oscillator instead of an LC oscillator?

---

*Next chapter: Multivibrators*
