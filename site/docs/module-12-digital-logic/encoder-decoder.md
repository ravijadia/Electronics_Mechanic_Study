---
sidebar_position: 3
sidebar_label: Encoder & Decoder
---

# Chapter: Concept of Encoder and Decoder

**Module:** Basic Gates, Combinational Circuits, Flip-Flops — Electronic Mechanic Trade
**Study No.:** 1.12.115 & 1.12.116

---

## 1. Introduction

Encoders and decoders are combinational logic circuits that convert data from one code format to another. They are used everywhere digital systems need to compress multiple input lines into fewer output lines (encoding) or expand a compact code back into individual active lines (decoding) — for example in keypad scanning, memory addressing, and display driving.

---

## 2. Encoder

An **encoder** has 2^n input lines (only one active at a time) and produces an n-bit binary output code identifying which input is active. It is the reverse operation of a decoder.

**Example: 4-to-2 Line Encoder**

| I3 | I2 | I1 | I0 | Output Y1 | Output Y0 |
|---|---|---|---|---|---|
| 0 | 0 | 0 | 1 | 0 | 0 |
| 0 | 0 | 1 | 0 | 0 | 1 |
| 0 | 1 | 0 | 0 | 1 | 0 |
| 1 | 0 | 0 | 0 | 1 | 1 |

Only one input is active (logic 1) at a time; the 2-bit output identifies which line it was.

**Limitation:** A basic encoder fails if two or more inputs are active simultaneously — a **priority encoder** solves this by outputting the code for the highest-priority active input.

---

## 3. Decoder

A **decoder** does the opposite: it takes an n-bit binary input code and activates exactly one of 2^n output lines corresponding to that code.

**Example: 2-to-4 Line Decoder**

| A1 | A0 | Y0 | Y1 | Y2 | Y3 |
|---|---|---|---|---|---|
| 0 | 0 | 1 | 0 | 0 | 0 |
| 0 | 1 | 0 | 1 | 0 | 0 |
| 1 | 0 | 0 | 0 | 1 | 0 |
| 1 | 1 | 0 | 0 | 0 | 1 |

Each unique input combination activates exactly one output line, leaving the others at 0.

---

## 4. Applications

- **Encoders:** Keyboard/keypad encoding (converting a pressed key into a binary code), priority interrupt systems in computers.
- **Decoders:** Memory address decoding (selecting one memory location out of many), driving seven-segment displays (BCD-to-7-segment decoder), instruction decoding in microprocessors.

---

## 5. Key Points to Remember

- An encoder converts one active line among many inputs into a compact binary code — it reduces the number of lines.
- A decoder converts a binary code into one active output line among many — it expands the number of lines.
- A priority encoder resolves the case where multiple encoder inputs are active at once.
- Decoders are widely used for address selection and driving displays; encoders are used for input scanning (e.g., keypads).
- A decoder with n inputs has 2^n possible outputs; an encoder with 2^n inputs has n outputs.

---

## 6. Practice Questions

1. What is the basic difference between an encoder and a decoder?
2. Draw the truth table for a 3-to-8 line decoder (partial table for at least 4 rows is acceptable).
3. Why is a priority encoder needed instead of a basic encoder in real keypad circuits?
4. Give one practical application each for an encoder and a decoder.
5. How many output lines does a decoder with a 4-bit input code have?

---

*Next chapter: Multiplexers & Demultiplexers*
