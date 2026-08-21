---
sidebar_position: 2
sidebar_label: Semiconductor & Diode
---

# Basic Electronics: Semiconductor and Diode

**Module:** Basic Electronics — Electronic Mechanic Trade
**Topic:** Semiconductor Materials & Diode Basics
**Study No.:** 1.8.67 – 69

---

## 1. Introduction

The very first and most important concept in the world of electronics is the **Semiconductor**. Whether it's a mobile phone, a TV, or an inverter — all these devices work using components made from semiconductor material. In this chapter we'll understand what a semiconductor is, how it works, and the very first and most basic component made from it — the **Diode**.

---

## 2. Types of Materials

Based on their ability to allow electric current to pass through, materials are divided into three categories:

| Type | Example | Property |
|---|---|---|
| Conductor | Copper, Silver | Electricity passes through easily |
| Insulator | Rubber, Glass | Electricity does not pass through at all |
| Semiconductor | Silicon, Germanium | Electricity passes through under certain conditions |

The special property of a semiconductor is that its **conductivity** can be controlled — by changing the temperature, or by mixing in certain special elements (doping). This same property is what allows components like diodes, transistors, and ICs to be made from it.

---

## 3. Doping & P-N Type Material

Pure silicon has very low conductivity. To make it useful, a small amount of another element is mixed into it — this process is called **Doping**.

- **N-type:** Mixing an element like Phosphorus into silicon gives extra electrons — increasing free negative charge carriers.
- **P-type:** Mixing an element like Boron into silicon creates "holes" — empty spaces where electrons are missing, which behave like positive charge carriers.

When P-type and N-type materials are joined together, a junction forms between them — called a **PN Junction**. This PN junction is the **Diode**.

---

## 4. What is a Diode?

A **Diode** is an electronic component that allows current to flow in only **one direction**. It has two terminals:

- **Anode** — the P-type side
- **Cathode** — the N-type side, usually marked with a band

### Circuit Symbol

The diode symbol looks like a triangle with a line — current flows in the direction the triangle's tip points toward the line (from anode to cathode).

---

## 5. Working Principle

### a) Forward Bias

When the battery's positive terminal is connected to the anode and the negative terminal to the cathode, the diode is in **forward bias**. In this state:

- A silicon diode starts conducting current at approximately **0.7V**
- A germanium diode's voltage is approximately **0.3V**
- The diode allows current to pass through (ON state)

### b) Reverse Bias

When the battery polarity is reversed (positive to cathode, negative to anode), the diode is in **reverse bias**. In this state:

- The diode does not allow current to pass through (OFF state)
- A very small "leakage current" flows, considered negligible
- If the reverse voltage exceeds the diode's limit, the diode can be damaged (**Breakdown Voltage**)

---

## 6. Worked Example

**Question:** A silicon diode is connected in series with a 6V battery and a 470Ω resistor in forward bias. How much current will flow in the circuit?

**Solution:**

We know the forward voltage drop of a silicon diode is approximately 0.7V.

```
Battery voltage (V) = 6V
Voltage drop across diode (Vd) = 0.7V
Remaining voltage across resistor (VR) = V − Vd = 6 − 0.7 = 5.3V

By Ohm's Law:
I = VR / R
I = 5.3 / 470
I ≈ 0.0113 A
I ≈ 11.3 mA
```

**Answer:** Approximately **11.3 mA** of current will flow in the circuit.

---

## 7. Applications of Diode

- **Rectification:** Converting AC to DC (in power supplies)
- **Switching:** As an ON/OFF switch in digital circuits
- **Voltage Regulation:** Using a Zener Diode
- **Signal Demodulation:** In radio circuits
- **Protection:** Protecting circuits from reverse polarity

---

## 8. Key Points to Remember

- A semiconductor's conductivity lies between that of a conductor and an insulator
- Doping creates N-type and P-type materials
- A PN junction is a diode
- A diode stays ON in forward bias, OFF in reverse bias
- Normal forward voltage drop of a silicon diode ≈ 0.7V

---

## 9. Practice Questions

1. What is the difference between a semiconductor and an insulator?
2. How are N-type and P-type materials formed?
3. When does a diode start conducting in forward bias?
4. What is the difference between the forward voltage of a germanium diode and a silicon diode?
5. A diode is connected in series with a 9V battery and a 1kΩ resistor. How much current will flow in the circuit? (assume a silicon diode)

---

*Next topic: Zener Diode and its applications*

:::tip Practice
For an **MCQ test** on this chapter, go to the [Module 8 Test](/tests/module-08-test).
:::
