---
sidebar_position: 1
sidebar_label: Operational Amplifiers
---

# Chapter: Operational Amplifier and its Applications

**Module:** Op Amp and Timer Applications — Electronic Mechanic Trade
**Study No.:** 1.14.127 & 1.14.128

---

## 1. Introduction

An **Operational Amplifier (Op-Amp)** is a high-gain, direct-coupled differential amplifier IC used as a basic building block in analog electronics — from simple signal amplifiers to comparators, filters, and oscillators. It amplifies the voltage difference between its two inputs by a very large factor.

---

## 2. Pin Diagram — IC 741

The **IC 741** is the most common general-purpose op-amp, available as an 8-pin DIP package:

| Pin | Name | Function |
|---|---|---|
| 1 | Offset Null | Used with pin 5 to null output offset voltage |
| 2 | Inverting Input (−) | Input, output is inverted (out of phase) |
| 3 | Non-Inverting Input (+) | Input, output is in phase |
| 4 | V− (VEE) | Negative supply |
| 5 | Offset Null | Used with pin 1 |
| 6 | Output | Amplified output |
| 7 | V+ (VCC) | Positive supply |
| 8 | NC | No connection |

---

## 3. Ideal Op-Amp Characteristics

- Infinite open-loop voltage gain (A → ∞)
- Infinite input impedance (draws no input current)
- Zero output impedance
- Infinite bandwidth
- Zero offset voltage (output = 0 when both inputs are equal)

Real op-amps like the 741 approach these ideals closely enough for most practical circuits.

---

## 4. Working Principle — Two Golden Rules

For an op-amp in a negative-feedback circuit:

1. **No current flows into either input terminal** (infinite input impedance).
2. **The voltage at both input terminals is equal** (virtual short/virtual ground), because open-loop gain is so high that any difference drives the output to try to cancel it.

These two rules are used to analyze every op-amp circuit.

---

## 5. Inverting Amplifier

Input is applied to the inverting (−) terminal through resistor Rin, with feedback resistor Rf from output back to the inverting input. The non-inverting (+) input is grounded.

```
Vout = −(Rf / Rin) × Vin
```

The output is **180° out of phase** with the input, and gain is set purely by the resistor ratio.

---

## 6. Non-Inverting Amplifier

Input is applied directly to the non-inverting (+) terminal. Rin connects the inverting input to ground, and Rf feeds back from output to the inverting input.

```
Vout = (1 + Rf / Rin) × Vin
```

The output is **in phase** with the input, and gain is always ≥ 1.

---

## 7. Worked Example

**Question:** An inverting amplifier has Rin = 1kΩ and Rf = 10kΩ. Find the output voltage for a 0.5V input.

**Solution:**
```
Vout = −(Rf / Rin) × Vin
Vout = −(10kΩ / 1kΩ) × 0.5V = −5V
```

**Answer:** Output voltage is **−5V** (gain magnitude = 10, inverted).

---

## 8. Key Points to Remember

- Op-amp amplifies the difference between its two input voltages by a very large open-loop gain
- Inverting amplifier: gain = −Rf/Rin, output inverted
- Non-inverting amplifier: gain = 1 + Rf/Rin, output in phase, gain always ≥ 1
- Negative feedback (Rf) stabilizes gain and makes it dependent only on resistor values, not on the op-amp's internal gain
- Ideal op-amp draws no input current and has zero voltage difference between its inputs under feedback

---

## 9. Practice Questions

1. List four characteristics of an ideal op-amp.
2. Draw the pin diagram of IC 741 and label all pins.
3. A non-inverting amplifier has Rin = 2kΩ and Rf = 8kΩ. Find its gain.
4. Why is the output of an inverting amplifier 180° out of phase with the input?
5. State the two "golden rules" used to analyze op-amp circuits.

---

*Next chapter: Op-Amp Applications — Comparators & Differentiator*

:::tip Practice
Take the **MCQ quiz** for this chapter: [Quiz: Operational Amplifier and its Applications](/tests/module-14-op-amp-timer/operational-amplifiers)
:::
