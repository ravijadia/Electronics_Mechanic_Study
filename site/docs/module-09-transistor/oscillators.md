---
sidebar_position: 3
sidebar_label: Oscillators
---

# Chapter: Oscillators

**Module:** Transistor — Electronic Mechanic Trade
**Study No.:** 1.9.88 & 1.9.89

---

## 1. Introduction

An **oscillator** is an electronic circuit that generates a continuous, repetitive AC waveform (sine, square, or other) **without any external AC input signal** — it converts DC power into an AC output at a specific frequency using positive feedback.

---

## 2. Basic Block Diagram

An oscillator consists of three essential parts working together:

1. **Amplifier:** Provides gain to compensate for losses in the feedback network.
2. **Feedback network:** Feeds back a fraction of the output to the input, in phase with the input (positive feedback).
3. **Frequency-determining network:** Sets the frequency of oscillation (using L-C, R-C, or a crystal).

The output of the amplifier is fed back to its own input through the feedback network — once started (from noise or switch-on transients), this loop sustains continuous oscillation.

---

## 3. Barkhausen Criterion

For sustained oscillation, two conditions must be satisfied simultaneously:

1. **Loop gain must equal unity:** `Aβ = 1` (amplifier gain A × feedback fraction β = 1)
2. **Total phase shift around the loop must be 0° (or 360°):** the feedback signal must arrive back at the input exactly in phase with the original input.

If loop gain is less than 1, oscillations die out. If greater than 1, the amplifier saturates and the waveform distorts (clipped). Practical oscillator circuits are designed with a loop gain slightly greater than 1 at switch-on, which naturally settles to unity as the amplifier's operating point stabilizes.

---

## 4. Classification of Oscillators

| Type | Frequency-Determining Element | Typical Frequency Range | Examples |
|---|---|---|---|
| **LC Oscillator** | Inductor-Capacitor tank circuit | RF range (kHz – MHz) | Hartley, Colpitts |
| **RC Oscillator** | Resistor-Capacitor network | Low/audio frequency (Hz – kHz) | RC Phase Shift, Wien Bridge |
| **Crystal Oscillator** | Piezoelectric quartz crystal | Very stable, precise frequency | Used in clocks, digital systems |

---

## 5. Brief Overview of LC Oscillators

- **Hartley Oscillator:** Uses a tapped inductor (two inductors, or one inductor with a center tap) with a single capacitor to form the LC tank circuit and provide feedback.
- **Colpitts Oscillator:** Uses a tapped capacitor (two capacitors in series) with a single inductor to form the tank circuit and provide feedback — mirror-image of the Hartley in construction.

Both operate on the same principle: the LC tank circuit determines the frequency of oscillation according to:

```
f = 1 / (2π√(LC))
```

---

## 6. Key Points to Remember

- An oscillator needs no external AC input — it converts DC to AC using positive feedback
- Barkhausen criterion: loop gain Aβ = 1 and total phase shift = 0°/360°
- LC oscillators suit high (RF) frequencies; RC oscillators suit low/audio frequencies; crystal oscillators give the highest frequency stability
- Hartley uses a tapped inductor; Colpitts uses a tapped capacitor

---

## 7. Practice Questions

1. State the Barkhausen criterion for sustained oscillations.
2. What are the three essential blocks of an oscillator circuit?
3. Differentiate between LC and RC oscillators based on frequency range.
4. What is the key constructional difference between a Hartley and a Colpitts oscillator?
5. Why does a crystal oscillator give more stable frequency output than an LC oscillator?

---

*Next chapter: RC Phase Shift Oscillator*

:::tip Practice
Take the **MCQ quiz** for this chapter: [Quiz: Oscillators](/tests/module-09-transistor/oscillators)
:::
