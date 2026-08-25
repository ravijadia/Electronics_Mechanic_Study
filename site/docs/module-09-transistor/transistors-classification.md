---
sidebar_position: 1
sidebar_label: Transistors & Classification
---

# Chapter: Transistors and Classification

**Module:** Transistor — Electronic Mechanic Trade
**Study No.:** 1.9.81 – 1.9.83

---

## 1. Introduction

A **transistor** is a three-terminal semiconductor device used to amplify or switch electronic signals. It is the building block of nearly all modern electronic circuits — amplifiers, oscillators, switches, and digital logic gates. The most common type used in basic electronics is the **Bipolar Junction Transistor (BJT)**.

---

## 2. Construction

A BJT is formed by sandwiching one type of semiconductor material between two layers of the opposite type, creating two PN junctions:

- **NPN transistor:** A P-type layer sandwiched between two N-type layers.
- **PNP transistor:** An N-type layer sandwiched between two P-type layers.

Each transistor has three terminals:

- **Emitter (E):** Heavily doped; emits (supplies) majority charge carriers into the base.
- **Base (B):** Very thin and lightly doped; controls the flow of carriers from emitter to collector.
- **Collector (C):** Moderately doped and physically larger; collects the carriers passed through the base.

---

## 3. Symbols

- **NPN:** Arrow on the emitter points **outward** (away from the base) — "Not Pointing iN."
- **PNP:** Arrow on the emitter points **inward** (toward the base) — "Pointing iN Permanently."

The arrow always represents the direction of conventional current flow at the emitter.

---

## 4. Transistor Configurations

A transistor can be connected in a circuit in three basic ways, depending on which terminal is common to both the input and output:

| Configuration | Common Terminal | Current Gain | Typical Use |
|---|---|---|---|
| **Common Base (CB)** | Base | Voltage gain high, current gain < 1 | High-frequency applications |
| **Common Emitter (CE)** | Emitter | High current & voltage gain | Most widely used — general amplifiers |
| **Common Collector (CC)** | Collector | High current gain, voltage gain ≈ 1 | Impedance matching (buffer/emitter follower) |

---

## 5. Current Relations

In any transistor, the emitter current is the sum of the base and collector currents:

```
IE = IB + IC
```

**Current gain factors:**

- **Alpha (α)** — common base current gain:
```
α = IC / IE        (typically 0.95 to 0.99)
```

- **Beta (β)** — common emitter current gain:
```
β = IC / IB        (typically 20 to 200+)
```

**Relationship between α and β:**

```
β = α / (1 − α)          and          α = β / (1 + β)
```

---

## 6. Worked Example

**Question:** A transistor has IB = 20 µA and IC = 2 mA. Find IE and β.

**Solution:**
```
IE = IB + IC = 0.02 mA + 2 mA = 2.02 mA
β  = IC / IB = 2 mA / 0.02 mA = 100
```

**Answer:** IE = **2.02 mA**, β = **100**

---

## 7. Key Points to Remember

- A BJT has two PN junctions and three terminals: Emitter, Base, Collector
- NPN and PNP differ in doping arrangement and the direction of the emitter arrow in the symbol
- Base is thin and lightly doped so most carriers from the emitter pass through to the collector
- IE = IB + IC always holds true
- Common Emitter (CE) configuration is the most widely used due to good voltage and current gain

---

## 8. Practice Questions

1. Draw and label the symbols for NPN and PNP transistors.
2. Why is the base region made thin and lightly doped?
3. State the relationship between α and β.
4. A transistor has β = 50 and IB = 40 µA. Find IC and IE.
5. Which transistor configuration gives voltage gain close to unity, and where is it used?
6. Compare CB, CE, and CC configurations in terms of current gain.

---

*Next chapter: Biasing of Transistors*
