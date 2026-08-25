---
sidebar_position: 1
sidebar_label: Cells and Batteries
---

# Chapter: Cells and Batteries

**Module:** Cells and Batteries — Electronic Mechanic Trade
**Study No.:** 1.3.28

---

## 1. Introduction

Every portable electronic or electrical device — a torch, a mobile phone, an inverter, a UPS — needs a source of DC power that doesn't depend on the mains supply. That source is a **cell** or a **battery**. In this chapter we'll learn what a cell is, the types of cells and batteries, and the basic terms used to describe them.

---

## 2. What is a Cell?

A **cell** is a device that converts chemical energy directly into electrical energy. It has:

- **Two electrodes** — an anode (negative) and a cathode (positive), usually made of different metals or metal compounds
- An **electrolyte** — a chemical solution or paste that allows ions to move between the electrodes
- A **container** that holds the electrodes and electrolyte

When the electrodes are connected through an external circuit, a chemical reaction at each electrode drives electrons through the circuit — that flow of electrons is the current the cell supplies.

A **battery** is simply two or more cells connected together (in series, parallel, or a combination) to get the voltage or current rating a device needs.

---

## 3. Primary vs Secondary Cells

| Type | Description | Examples |
|---|---|---|
| **Primary cell** | Chemical reaction is not reversible — once discharged, the cell is discarded, cannot be recharged | Zinc-Carbon cell, Alkaline cell |
| **Secondary cell** | Chemical reaction is reversible — the cell can be recharged and reused many times | Lead-Acid battery, Nickel-Cadmium (Ni-Cd), Lithium-ion (Li-ion) |

---

## 4. Common Types of Cells

- **Zinc-Carbon cell** — cheapest, used in low-drain devices (remote controls, wall clocks). Voltage ≈ 1.5V.
- **Alkaline cell** — longer life than zinc-carbon, used in torches, toys, cameras. Voltage ≈ 1.5V.
- **Lead-Acid battery** — used in vehicles, inverters, UPS. Rechargeable, high current capability. Voltage per cell ≈ 2V (a 12V battery = 6 cells in series).
- **Nickel-Cadmium (Ni-Cd)** — rechargeable, used in power tools, emergency lighting. Voltage per cell ≈ 1.2V.
- **Lithium-ion (Li-ion)** — rechargeable, high energy density, lightweight, used in mobile phones, laptops, EVs. Voltage per cell ≈ 3.7V.

---

## 5. Important Terms

- **EMF (Electromotive Force):** The total voltage of a cell measured with no load (no current) connected — the cell's full "push."
- **Terminal Voltage:** The voltage measured across the cell's terminals while it is supplying current to a load. It is always slightly less than EMF because of the cell's own internal resistance.
- **Internal Resistance (r):** The small resistance inside the cell itself, due to the electrolyte and electrode material. Terminal Voltage = EMF − (Current × Internal Resistance).
- **Capacity (Ah — Ampere-hour):** How much current a fully charged cell/battery can deliver over time. A 100 Ah battery can theoretically supply 100A for 1 hour, or 5A for 20 hours, and so on.
- **C-rating:** Charge/discharge current expressed as a multiple of the battery's capacity. For a 100 Ah battery, a "0.5C" discharge = 50A.

---

## 6. Series and Parallel Combination of Cells

| Combination | Effect on Voltage | Effect on Current Capacity |
|---|---|---|
| **Series** (+ of one cell to − of next) | Voltages add up | Current capacity (Ah) stays the same as one cell |
| **Parallel** (+ to +, − to −) | Voltage stays the same as one cell | Current capacity (Ah) adds up |

**Example:** Four 1.5V, 2Ah cells connected in series give 6V, 2Ah. The same four cells connected in parallel give 1.5V, 8Ah.

---

## 7. Worked Example

**Question:** A cell has an EMF of 12V and an internal resistance of 0.2Ω. When connected to a load, it supplies a current of 5A. What is the terminal voltage?

**Solution:**

```
EMF = 12V
Internal resistance (r) = 0.2Ω
Current (I) = 5A

Terminal Voltage = EMF − (I × r)
Terminal Voltage = 12 − (5 × 0.2)
Terminal Voltage = 12 − 1 = 11V
```

**Answer:** The terminal voltage is **11V**.

---

## 8. Key Points to Remember

- A cell converts chemical energy to electrical energy
- Primary cells cannot be recharged; secondary cells can
- Series connection adds voltage; parallel connection adds current capacity (Ah)
- Terminal voltage is always less than EMF when current is flowing, due to internal resistance

---

## 9. Practice Questions

1. What is the difference between a primary cell and a secondary cell?
2. Name two examples each of primary and secondary cells.
3. What happens to voltage and capacity when cells are connected in parallel?
4. A battery is rated 60 Ah. What current can it theoretically supply for 10 hours?
5. A cell with EMF 6V and internal resistance 0.5Ω supplies a current of 2A. Find the terminal voltage.

---

*Next chapter: Secondary Battery – Charge, Discharge and Maintenance*

:::tip Practice
Take the **MCQ quiz** for this chapter: [Quiz: Cells and Batteries](/tests/module-03-cells-and-batteries/cells-and-batteries)
:::
