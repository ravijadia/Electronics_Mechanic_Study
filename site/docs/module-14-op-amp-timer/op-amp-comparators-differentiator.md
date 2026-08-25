---
sidebar_position: 2
sidebar_label: 'Op-Amp: Comparators & Differentiator'
---

# Chapter: Op-Amp Applications — Comparators, Differentiator

**Module:** Op Amp and Timer Applications — Electronic Mechanic Trade
**Study No.:** 1.14.129 & 1.14.130

---

## 1. Introduction

Beyond simple amplification, an op-amp used **without negative feedback** (open loop) acts as a **comparator**, while an op-amp with a **capacitor in the input path** acts as a **differentiator**, producing an output proportional to the rate of change of the input.

---

## 2. Comparator Circuit

- The op-amp is used in **open-loop** configuration (no feedback resistor).
- Since open-loop gain is extremely high, even a tiny voltage difference between the two inputs drives the output fully to +Vsat or −Vsat (near the supply rails).
- If Vin (at + input) > Vref (at − input) → output = +Vsat (high)
- If Vin (at + input) < Vref (at − input) → output = −Vsat (low)

This makes the op-amp behave as a **1-bit digital output detector** — it "compares" two analog voltages and gives a high/low output.

---

## 3. Zero-Crossing Detector

A special case of the comparator where **Vref = 0V** (inverting input grounded). The output switches state exactly every time the input AC waveform crosses zero volts, producing a square wave synchronized with the input's zero crossings.

**Applications:** Converting sine waves to square waves, frequency counters, phase detection, timing reference circuits.

---

## 4. Differentiator Circuit

Built using an inverting amplifier configuration where the **input resistor Rin is replaced by a capacitor C**, and Rf remains as feedback resistor.

```
Vout = −RC (dVin / dt)
```

The output is proportional to the **rate of change (slope)** of the input signal — a steep/fast-changing input produces a large output, and a slowly-changing (or DC) input produces a near-zero output.

**Behavior with common waveforms:**

| Input Waveform | Differentiator Output |
|---|---|
| Square wave | Sharp spikes at each transition |
| Triangular wave | Square wave |
| Sine wave | Cosine wave (90° phase shift) |

---

## 5. Worked Example

**Question:** A differentiator has R = 10kΩ and C = 0.1µF. The input voltage changes at a rate of 2V/ms. Find the output voltage.

**Solution:**
```
RC = 10 × 10³ × 0.1 × 10⁻⁶ = 1 × 10⁻³ s = 1 ms
dVin/dt = 2V / 1ms = 2000 V/s
Vout = −RC × (dVin/dt) = −(1×10⁻³) × 2000 = −2V
```

**Answer:** Output voltage is **−2V**.

---

## 6. Key Points to Remember

- A comparator uses the op-amp in open loop (no feedback) — output swings fully high or low based on which input is larger
- A zero-crossing detector is a comparator with the reference input grounded (0V)
- A differentiator replaces the input resistor with a capacitor; output depends on the rate of change of input, not its amplitude
- Differentiator formula: Vout = −RC(dVin/dt)
- Differentiators are sensitive to noise because sharp noise spikes have a very high rate of change

---

## 7. Practice Questions

1. What is the difference between an op-amp used as an amplifier and as a comparator?
2. Explain how a zero-crossing detector works.
3. A differentiator has R = 5kΩ, C = 1µF. Find Vout if dVin/dt = 100 V/s.
4. Sketch the output of a differentiator for a square wave input.
5. Why are differentiator circuits sensitive to noise?

---

*Next chapter: Op-Amp Applications — Differential & Instrumentation Amplifier*
