---
sidebar_position: 5
sidebar_label: Zener Diode
---

# Chapter: Working Principle of Zener Diodes

**Module:** Power Supply Circuits — Electronic Mechanic Trade
**Study No.:** 1.8.74 – 1.8.75

---

## 1. Introduction

A normal (rectifier) diode is designed to never be operated in reverse breakdown — doing so usually destroys it. The **Zener diode** is a special-purpose diode designed specifically to operate safely in reverse breakdown, at a precise, repeatable voltage. This property makes it extremely useful as a simple, stable **voltage reference** or **voltage regulator** element.

---

## 2. Zener Breakdown

- When a Zener diode is **forward-biased**, it behaves exactly like a normal diode — conducting with a small forward voltage drop (~0.7V for silicon).
- When **reverse-biased** with increasing voltage, at a specific voltage called the **Zener voltage (Vz)**, the diode enters **breakdown** — current increases sharply while the voltage across it stays essentially constant at Vz.
- Unlike an ordinary diode's destructive reverse breakdown, this breakdown is **controlled and non-destructive**, as long as the current through the diode is kept within its rated limits (usually by a series resistor).
- Zener diodes are manufactured with specific, standardized Zener voltages (e.g. 3.3V, 5.1V, 6.2V, 9.1V, 12V, etc.) to suit different reference/regulation needs.

---

## 3. Basic Zener Voltage Regulator Circuit

**Circuit:** A series resistor (R_s) connects the unregulated DC input to the Zener diode, which is connected in **reverse** across the load, with its cathode toward the positive supply.

**Working:**

1. The series resistor limits current from the supply and drops the excess voltage above Vz.
2. As long as the Zener diode is in breakdown, the voltage across it — and therefore across the load connected in parallel with it — stays fixed at Vz, regardless of small variations in supply voltage or load current.
3. If the input voltage rises, the extra voltage is absorbed by the series resistor (more current flows through the Zener, more voltage dropped across R_s), keeping the output at Vz.
4. If the load current increases (load draws more), the Zener current decreases correspondingly to compensate, again keeping the output voltage steady — as long as the Zener still has enough current flowing through it to remain in breakdown.

```
R_s = (V_in − V_z) / I_z
```

---

## 4. Worked Example

**Question:** An unregulated 12V DC supply feeds a Zener regulator circuit with Vz = 5.6V. The desired Zener current is 20mA. Find the required series resistor value.

**Solution:**
```
R_s = (V_in − V_z) / I_z
R_s = (12 − 5.6) / 0.02
R_s = 6.4 / 0.02 = 320Ω
```

**Answer:** A series resistor of **320Ω** (nearest standard value, e.g. 330Ω) is required.

---

## 5. Applications

- Simple, low-cost **voltage regulation** for low-current loads
- **Voltage reference** in more complex regulator and comparator circuits
- **Over-voltage protection** — clamping a signal or supply line so it cannot exceed a safe voltage
- **Waveform clipping/shaping** circuits

---

## 6. Key Points to Remember

- A Zener diode is designed to operate safely and repeatably in reverse breakdown at its rated Zener voltage (Vz)
- In breakdown, the voltage across a Zener diode stays essentially constant even as current through it varies
- A series resistor is always required to limit current through the Zener diode to a safe value
- Zener regulation works by the series resistor absorbing changes in supply voltage or load current, keeping Vz constant across the load

---

## 7. Practice Questions

1. How is a Zener diode's reverse breakdown different from an ordinary diode's reverse breakdown?
2. What is the purpose of the series resistor in a Zener regulator circuit?
3. A 15V unregulated supply feeds a Zener regulator with Vz = 6.2V and desired Iz = 25mA. Find the series resistor value.
4. Name two applications of a Zener diode besides voltage regulation.
5. What happens to the output voltage if the load current increases slightly, in a properly designed Zener regulator?

---

*Next chapter: Regulated Power Supply and IC Voltage Regulators*

:::tip Practice
Take the **MCQ quiz** for this chapter: [Quiz: Working Principle of Zener Diodes](/tests/module-08-power-supply-circuits/zener-diodes)
:::
