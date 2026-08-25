---
sidebar_position: 6
sidebar_label: Clipper Circuit
---

# Chapter: Clipper Circuit

**Module:** Transistor — Electronic Mechanic Trade
**Study No.:** 1.9.92 & 1.9.93

---

## 1. Introduction

A **clipper (or limiter) circuit** is a diode-based wave-shaping circuit that removes (clips off) a portion of an input waveform above or below a certain reference voltage level, without distorting the remaining part of the waveform. Clippers are used to protect circuits from over-voltage, shape waveforms, and generate square waves from sine waves.

---

## 2. Basic Principle

A clipper uses one or more diodes, arranged either in **series** or in **shunt (parallel)** with the load, along with a DC reference (bias) voltage in some designs, to allow the diode to conduct only during part of the input cycle — the portion during which it does not conduct is "clipped" from the output.

---

## 3. Types of Clippers

### a) Series Clipper

The diode is connected **in series** with the load.

- When the diode is forward biased by the input, it conducts and the signal passes to the output.
- When the diode is reverse biased, it does not conduct, and the output is zero (clipped) during that portion of the cycle.

### b) Shunt (Parallel) Clipper

The diode is connected **in parallel** with the load.

- When the diode conducts (forward biased), it effectively short-circuits that portion of the signal to ground/reference, clamping the output near zero (or the reference level).
- When the diode is reverse biased (not conducting), the full input signal appears across the load.

### c) Positive Clipper

Removes (clips) the **positive half** or the portion of the waveform above a set positive level, allowing the negative portion to pass unchanged.

### d) Negative Clipper

Removes (clips) the **negative half** or the portion of the waveform below a set negative level, allowing the positive portion to pass unchanged.

### e) Biased Clipper

A DC reference (bias) voltage is added in series with the diode, which shifts the clipping level away from 0V to any desired positive or negative reference voltage.

---

## 4. Comparison Table

| Type | Diode Placement | Clips |
|---|---|---|
| Series clipper | In series with load | Signal below diode's forward-conduction threshold |
| Shunt clipper | In parallel with load | Signal above/below diode's conduction threshold |
| Positive clipper | — | Positive portion of waveform |
| Negative clipper | — | Negative portion of waveform |
| Biased clipper | — | Waveform above/below a set DC reference level (not just 0V) |

---

## 5. Applications

- Protecting sensitive circuits from voltage spikes/over-voltage
- Converting sine waves into approximate square waves
- Waveform shaping in signal-processing and communication circuits
- Amplitude limiting in receivers

---

## 6. Key Points to Remember

- A clipper removes part of a waveform above/below a chosen reference level using diodes
- Series clipper: diode in series with load; Shunt clipper: diode in parallel with load
- Positive clippers remove the positive portion; negative clippers remove the negative portion
- Adding a DC bias voltage in series with the diode shifts the clipping reference level (biased clipper)
- Clippers are widely used for waveform shaping and circuit protection

---

## 7. Practice Questions

1. What is the function of a clipper circuit?
2. Differentiate between a series clipper and a shunt clipper.
3. How does a biased clipper differ from a simple (unbiased) clipper?
4. Sketch the output waveform of a positive clipper for a sine wave input.
5. State two practical applications of clipper circuits.

---

*Next chapter: Clamper Circuits*

:::tip Practice
Take the **MCQ quiz** for this chapter: [Quiz: Clipper Circuit](/tests/module-09-transistor/clipper-circuit)
:::
