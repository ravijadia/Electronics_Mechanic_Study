---
sidebar_position: 1
sidebar_label: Active/Passive Components & Resistors
---

# Chapter: Active and Passive Electronic Components, Resistors

**Module:** Active and Passive Components — Electronic Mechanic Trade
**Study No.:** 1.7.50 – 1.7.53

---

## 1. Introduction

Every electronic circuit is built from individual **components**. Before studying any specific component, it's important to understand the basic split every component falls into: **active** or **passive**. This chapter also introduces the most common passive component of all — the **resistor**.

---

## 2. Active vs Passive Components

| Type | Description | Examples |
|---|---|---|
| **Active component** | Can control the flow of electrons and add energy/gain to a circuit; needs an external power source to function | Diode, Transistor, IC, Op-amp |
| **Passive component** | Cannot add energy/gain to a circuit; only stores, dissipates, or opposes the flow of current; doesn't need a separate power source to do its basic job | Resistor, Capacitor, Inductor |

---

## 3. Resistors — Function and Types

A **resistor** opposes the flow of current, converting excess electrical energy into heat. It is used to limit current, divide voltage, and set bias conditions in circuits.

| Type | Description |
|---|---|
| **Fixed resistor (Carbon/Metal film)** | Fixed resistance value; carbon composition (cheap, general purpose) or metal film (more accurate, lower noise) |
| **Wire-wound resistor** | Resistance wire wound on a ceramic core; handles higher power (heaters, high-current circuits) |
| **Variable resistor (Potentiometer/Rheostat)** | Resistance can be adjusted by a wiper/slider — potentiometer (3 terminals, used as voltage divider), rheostat (2 terminals, used to vary current) |
| **Thermistor** | Resistance changes significantly with temperature — used for temperature sensing/compensation |
| **LDR (Light Dependent Resistor)** | Resistance changes with light intensity — used in light sensing circuits |

---

## 4. Resistor Color Code

Fixed resistors use colored bands to indicate their value.

| Color | Value | Multiplier |
|---|---|---|
| Black | 0 | ×1 |
| Brown | 1 | ×10 |
| Red | 2 | ×100 |
| Orange | 3 | ×1,000 |
| Yellow | 4 | ×10,000 |
| Green | 5 | ×100,000 |
| Blue | 6 | ×1,000,000 |
| Violet | 7 | — |
| Grey | 8 | — |
| White | 9 | — |
| Gold | — | ×0.1 (tolerance ±5%) |
| Silver | — | ×0.01 (tolerance ±10%) |

**Reading a 4-band resistor:** Band 1 = first digit, Band 2 = second digit, Band 3 = multiplier, Band 4 = tolerance.

**Example:** Yellow-Violet-Red-Gold = 47 × 100 = 4700Ω (4.7kΩ), ±5% tolerance.

---

## 5. Resistors in Series and Parallel

| Combination | Formula | Effect |
|---|---|---|
| **Series** | R_total = R1 + R2 + R3 + ... | Total resistance always increases |
| **Parallel** | 1/R_total = 1/R1 + 1/R2 + 1/R3 + ... | Total resistance is always less than the smallest individual resistor |

**Worked Example (Series):** Three resistors of 100Ω, 220Ω, and 330Ω in series: R_total = 100 + 220 + 330 = **650Ω**.

**Worked Example (Parallel):** Two resistors of 100Ω and 200Ω in parallel:
```
1/R_total = 1/100 + 1/200 = 2/200 + 1/200 = 3/200
R_total = 200/3 ≈ 66.7Ω
```

---

## 6. Power Rating

Every resistor has a **power (wattage) rating** — the maximum power it can safely dissipate as heat, calculated as P = I²R = V²/R. Using a resistor beyond its rated wattage causes it to overheat and fail. Common ratings: 1/4W, 1/2W, 1W, 2W (small signal circuits), up to several watts for wire-wound power resistors.

---

## 7. Key Points to Remember

- Active components can amplify/control and need a power source; passive components cannot add gain
- The resistor color code reads: 1st digit, 2nd digit, multiplier, tolerance
- Series resistances add directly; parallel resistances combine via the reciprocal formula and are always smaller than the smallest resistor
- A resistor's power rating must never be exceeded, or it will overheat and fail

---

## 8. Practice Questions

1. Give two examples each of active and passive components.
2. Decode the resistor color bands: Brown-Black-Orange-Gold.
3. Find the total resistance of 220Ω and 470Ω resistors connected in series, and again in parallel.
4. Why does a resistor need a power (wattage) rating?
5. What is the difference between a potentiometer and a rheostat?

---

*Next chapter: Ohm's Law, Kirchhoff's Laws & DC Series Circuits*
