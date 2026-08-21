---
sidebar_position: 2
sidebar_label: Ohm's/Kirchhoff's Laws & DC Series Circuits
---

# Chapter: Ohm's Law, Kirchhoff's Laws and DC Series Circuits

**Module:** Active and Passive Components — Electronic Mechanic Trade
**Study No.:** 1.7.54 – 1.7.57

---

## 1. Introduction

Two laws form the foundation of all circuit analysis: **Ohm's Law**, which relates voltage, current, and resistance; and **Kirchhoff's Laws**, which govern how current and voltage behave at junctions and around loops. Together with these, understanding a simple **DC series circuit** is the starting point for analyzing any circuit.

---

## 2. Ohm's Law

Ohm's Law states that the current through a conductor is directly proportional to the voltage across it, and inversely proportional to its resistance, at constant temperature.

```
V = I × R
```

Where V = Voltage (volts), I = Current (amperes), R = Resistance (ohms).

This can be rearranged as **I = V/R** or **R = V/I**, depending on which quantity is unknown.

**Worked Example:** A 12V supply is connected across a 6Ω resistor. Find the current.
```
I = V/R = 12/6 = 2A
```

---

## 3. Kirchhoff's Current Law (KCL)

**Statement:** The total current entering a junction (node) equals the total current leaving that junction — current cannot "pile up" or disappear at a node.

```
ΣI_in = ΣI_out
```

**Example:** If 5A enters a junction and splits into two branches, and one branch carries 2A, the other branch must carry 5 − 2 = 3A.

---

## 4. Kirchhoff's Voltage Law (KVL)

**Statement:** The sum of all voltage rises and drops around any closed loop in a circuit equals zero — in other words, the supply voltage equals the sum of all the voltage drops around the loop.

```
ΣV_supply = ΣV_drops
```

**Example:** A 12V supply drives current through three series resistors dropping 3V, 4V, and 5V respectively. Check: 3 + 4 + 5 = 12V ✓ — matches the supply.

---

## 5. DC Series Circuit

In a **series circuit**, components are connected end-to-end, forming a single path for current.

**Key properties:**

- **Current** is the same through every component in the circuit.
- **Total resistance** is the sum of all individual resistances: R_total = R1 + R2 + R3 + ...
- **Voltage** divides across each component in proportion to its resistance (Voltage Divider principle): V_x = V_supply × (R_x / R_total)
- If any one component in the path fails open (breaks), current stops flowing in the entire circuit.

**Worked Example:** A 24V supply connects to three series resistors: R1 = 2Ω, R2 = 4Ω, R3 = 6Ω.

```
R_total = 2 + 4 + 6 = 12Ω
I = V/R_total = 24/12 = 2A (same through all three resistors)

V1 = I × R1 = 2 × 2 = 4V
V2 = I × R2 = 2 × 4 = 8V
V3 = I × R3 = 2 × 6 = 12V

Check (KVL): 4 + 8 + 12 = 24V ✓
```

---

## 6. Key Points to Remember

- Ohm's Law: V = I × R — connects voltage, current, and resistance
- KCL: current entering a junction equals current leaving it
- KVL: supply voltage equals the sum of voltage drops around a closed loop
- In series: current is constant throughout, resistances add, and voltage divides proportionally
- A broken component anywhere in a series circuit stops current flow in the whole loop

---

## 7. Practice Questions

1. A 9V battery is connected across a 3Ω resistor. Find the current.
2. State Kirchhoff's Current Law in your own words.
3. Three currents of 2A, 3A, and 1A enter a junction. What single current must leave it?
4. Three resistors of 10Ω, 20Ω, and 30Ω are in series across a 60V supply. Find the current and the voltage drop across each resistor.
5. Why does current stop flowing in the whole circuit if one component fails open in a series circuit?

---

*Next chapter: Inductors and Capacitors*
