---
sidebar_position: 3
sidebar_label: Inductors & Capacitors
---

# Chapter: Passive Components – Inductors and Capacitors

**Module:** Active and Passive Components — Electronic Mechanic Trade
**Study No.:** 1.7.58 – 1.7.60

---

## 1. Introduction

Alongside the resistor, the **inductor** and **capacitor** are the other two fundamental passive components. Unlike a resistor, which dissipates energy as heat, these two components **store** energy — an inductor stores it in a magnetic field, and a capacitor stores it in an electric field. This storing behavior is what makes them essential in filters, power supplies, and timing circuits.

---

## 2. Inductors

An **inductor** is typically a coil of wire (often wound around a core) that stores energy in a magnetic field when current flows through it, and opposes any *change* in that current.

- **Unit:** Henry (H) — practical values usually in mH or µH.
- **Symbol:** L
- **Key property:** An inductor opposes a sudden change in current — it resists current building up or collapsing quickly, which is why it's useful for smoothing/filtering.
- **Types:** Air-core inductor (no magnetic core, used at high frequencies), Iron-core inductor (higher inductance, used at power/audio frequencies), Ferrite-core inductor (used in RF and switching circuits).

**Inductors in Series/Parallel** (assuming no mutual coupling):

| Combination | Formula |
|---|---|
| Series | L_total = L1 + L2 + L3 + ... |
| Parallel | 1/L_total = 1/L1 + 1/L2 + 1/L3 + ... |

---

## 3. Capacitors

A **capacitor** consists of two conductive plates separated by an insulating material (**dielectric**), and stores energy in the electric field between the plates when a voltage is applied.

- **Unit:** Farad (F) — practical values usually in µF, nF, or pF.
- **Symbol:** C
- **Key property:** A capacitor opposes a sudden change in voltage — it resists the voltage across it from changing instantly, which is why it's used for smoothing and filtering.
- **Types:** Ceramic capacitor (small value, general purpose), Electrolytic capacitor (large value, polarized — must be connected with correct polarity), Tantalum capacitor (compact, stable, polarized), Polyester/Film capacitor (stable, used in filters/timing).

**Capacitors in Series/Parallel:**

| Combination | Formula |
|---|---|
| Series | 1/C_total = 1/C1 + 1/C2 + 1/C3 + ... |
| Parallel | C_total = C1 + C2 + C3 + ... |

*(Note: capacitor series/parallel formulas are the opposite pattern to resistors and inductors.)*

---

## 4. Comparing Inductor and Capacitor Behavior

| Property | Inductor | Capacitor |
|---|---|---|
| Stores energy in | Magnetic field | Electric field |
| Opposes change in | Current | Voltage |
| Behavior at DC (steady state) | Acts like a plain wire (short circuit) | Acts like an open circuit (blocks DC) |
| Behavior at high AC frequency | Offers high opposition (high reactance) | Offers low opposition (low reactance) |

---

## 5. Worked Example

**Question:** Two capacitors of 10µF and 20µF are connected in series. Find the total capacitance.

**Solution:**
```
1/C_total = 1/10 + 1/20 = 2/20 + 1/20 = 3/20
C_total = 20/3 ≈ 6.67µF
```

---

## 6. Key Points to Remember

- Inductors store energy in a magnetic field and oppose changes in current
- Capacitors store energy in an electric field and oppose changes in voltage
- Inductor series/parallel formulas behave like resistors; capacitor formulas are reversed (parallel adds directly, series uses the reciprocal formula)
- Electrolytic and tantalum capacitors are polarized — reversing polarity can damage or destroy them
- At DC, a capacitor blocks current (open) while an inductor conducts freely (short); at high AC frequency, this behavior reverses

---

## 7. Practice Questions

1. What form of energy does an inductor store, and what does it oppose?
2. What form of energy does a capacitor store, and what does it oppose?
3. Find the total capacitance of two 100µF capacitors connected in parallel.
4. Why must an electrolytic capacitor be connected with correct polarity?
5. How does a capacitor behave in a steady DC circuit once fully charged?

---

*Next chapter: Magnetism and Relays*
