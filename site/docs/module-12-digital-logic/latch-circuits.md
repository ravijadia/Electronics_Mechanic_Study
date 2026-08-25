---
sidebar_position: 5
sidebar_label: Latch Circuits
---

# Chapter: Latch Circuits and Applications

**Module:** Basic Gates, Combinational Circuits, Flip-Flops — Electronic Mechanic Trade
**Study No.:** 1.12.119 – 1.12.122

---

## 1. Introduction

A **latch** is the simplest form of digital memory circuit — it can store one bit of data (0 or 1) and hold it even after the input that set it has been removed. Latches are the building blocks of flip-flops, registers, and other sequential circuits used to store and retain digital information.

---

## 2. SR Latch Using NAND Gates

The **SR (Set-Reset) latch** is built from two cross-coupled NAND gates, with each gate's output feeding back to an input of the other.

| S (Set) | R (Reset) | Q (Output) | State |
|---|---|---|---|
| 0 | 0 | Invalid | Both outputs try to go high — not allowed |
| 0 | 1 | 0 | Reset |
| 1 | 0 | 1 | Set |
| 1 | 1 | No change | Holds previous state (memory) |

*(Note: for a NAND-based SR latch, inputs are active-LOW — S=0 sets, R=0 resets, in the common "S̄ R̄ latch" convention; the table above uses active-high convention for clarity of concept.)*

---

## 3. SR Latch Using NOR Gates

Built the same way but with cross-coupled NOR gates, giving active-HIGH inputs:

| S | R | Q | State |
|---|---|---|---|
| 0 | 0 | No change | Holds previous state |
| 0 | 1 | 0 | Reset |
| 1 | 0 | 1 | Set |
| 1 | 1 | Invalid | Not allowed — both outputs forced to 0 |

---

## 4. Gated D Latch

A **D (Data) latch** avoids the invalid state problem of the SR latch by using a single data input (D) and a control/enable input. When the enable line is active, the output Q simply follows D; when disabled, Q holds its last value.

| Enable | D | Q |
|---|---|---|
| 0 | X | No change (holds last value) |
| 1 | 0 | 0 |
| 1 | 1 | 1 |

This "transparent while enabled" behavior is why it is called a latch (as opposed to a flip-flop, which only changes on a clock edge).

---

## 5. Latch vs Flip-Flop

| Latch | Flip-Flop |
|---|---|
| Level-triggered (output follows input while enable is active) | Edge-triggered (output changes only at a clock edge — rising or falling) |
| Simpler, built from basic gates | Built from latches with additional edge-detection circuitry |
| Susceptible to glitches passing through while enabled | More reliable for synchronous digital system design |

---

## 6. Applications

- Basic 1-bit memory element inside registers and RAM cells.
- Debouncing switch inputs (an SR latch can "clean up" a mechanically noisy switch signal into a clean single transition).
- Building block for flip-flops, counters, and other sequential logic circuits.

---

## 7. Key Points to Remember

- A latch stores one bit and holds it until changed — it is the basic memory element in digital electronics.
- The NAND-based SR latch has an invalid state at S=R=0 (active-low convention); the NOR-based SR latch has an invalid state at S=R=1.
- A D latch removes the invalid-state problem by deriving Set and Reset from a single Data line.
- Latches are level-triggered (transparent while enabled); flip-flops are edge-triggered.
- Latches are the fundamental building blocks used to construct flip-flops and registers.

---

## 8. Practice Questions

1. Draw the SR latch using two cross-coupled NOR gates and label its invalid state.
2. Why is the S=R=1 condition considered "invalid" in a NOR-based SR latch?
3. Explain how a D latch avoids the invalid-state problem of an SR latch.
4. What is the key difference between a latch and a flip-flop?
5. Name one practical application of an SR latch.

---

*Next chapter: Module 13 — Electronic Simulation Software*
