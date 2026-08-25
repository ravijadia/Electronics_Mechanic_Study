---
sidebar_position: 4
sidebar_label: Multiplexers & Demultiplexers
---

# Chapter: Multiplexers and Demultiplexers

**Module:** Basic Gates, Combinational Circuits, Flip-Flops — Electronic Mechanic Trade
**Study No.:** 1.12.117 & 1.12.118

---

## 1. Introduction

Multiplexers and demultiplexers are combinational circuits that manage the flow of data between multiple lines and a single line, under the control of **select lines**. They are widely used to reduce wiring in data transmission, share a single communication channel among multiple signals, and route data to a specific destination.

---

## 2. Multiplexer (MUX) — Data Selector

A **multiplexer** selects one of several input data lines and connects it to a single output, based on the binary value applied to its select lines. It works like a rotary switch controlled electronically.

**Example: 4:1 Multiplexer**

| S1 | S0 | Output Y |
|---|---|---|
| 0 | 0 | I0 |
| 0 | 1 | I1 |
| 1 | 0 | I2 |
| 1 | 1 | I3 |

With 4 data inputs (I0–I3), 2 select lines (S1, S0) are needed since 2² = 4. In general, an n:1 MUX needs log₂(n) select lines.

---

## 3. Demultiplexer (DEMUX) — Data Distributor

A **demultiplexer** performs the reverse operation: it takes a single input data line and routes it to one of several output lines, chosen by the select lines.

**Example: 1:4 Demultiplexer**

| S1 | S0 | Active Output |
|---|---|---|
| 0 | 0 | Y0 = Data input |
| 0 | 1 | Y1 = Data input |
| 1 | 0 | Y2 = Data input |
| 1 | 1 | Y3 = Data input |

All non-selected outputs remain at logic 0 while the selected output follows the input data.

---

## 4. Applications

- **Multiplexer:** Data selection for ALUs, combining multiple sensor signals onto one transmission line (time-division multiplexing), reducing the number of wires needed for long-distance data transfer.
- **Demultiplexer:** Distributing a single data source to multiple destinations (e.g., routing a signal to one of several memory chips), used together with a MUX at the receiving end of a communication link to reconstruct multiple channels.
- A MUX and DEMUX pair is commonly used together: the MUX combines multiple signals for transmission over one line, and the DEMUX at the far end separates them back into individual lines.

---

## 5. Key Points to Remember

- A multiplexer (MUX) is a "many-to-one" device — it selects one of several inputs to route to a single output.
- A demultiplexer (DEMUX) is a "one-to-many" device — it routes a single input to one of several outputs.
- The number of select lines needed is log₂(number of inputs/outputs): a 4:1 MUX needs 2 select lines, an 8:1 MUX needs 3.
- MUX/DEMUX pairs are used together to share a single transmission line among multiple signal sources.
- Non-active outputs of a demultiplexer stay at logic 0.

---

## 6. Practice Questions

1. How many select lines are required for an 8:1 multiplexer?
2. Draw the truth table for a 1:2 demultiplexer.
3. Explain, with an example, why a MUX and DEMUX pair might be used together in a communication system.
4. What is the key functional difference between a multiplexer and a decoder?
5. If S1S0 = 10 on a 4:1 MUX, which input is connected to the output?

---

*Next chapter: Latch Circuits and Applications*

:::tip Practice
Take the **MCQ quiz** for this chapter: [Quiz: Multiplexers and Demultiplexers](/tests/module-12-digital-logic/multiplexers-demultiplexers)
:::
