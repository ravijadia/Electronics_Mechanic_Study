---
sidebar_position: 5
sidebar_label: Multivibrators
---

# Chapter: Multivibrators and Circuit Diagram Study

**Module:** Transistor — Electronic Mechanic Trade
**Study No.:** 1.9.91

---

## 1. Introduction

A **multivibrator** is a two-stage transistor switching circuit that uses regenerative (positive) feedback between two amplifying stages, each cross-coupled to the other, to produce output waveforms that switch between two voltage states (typically a square or rectangular waveform).

---

## 2. Types of Multivibrators

| Type | Stable States | Behavior |
|---|---|---|
| **Astable** | 0 (none stable) | Continuously switches between two states on its own — free-running square wave generator |
| **Monostable** | 1 | Has one stable state; an external trigger pulse switches it to the other state temporarily, then it automatically returns to the stable state — used to generate a single pulse of fixed duration |
| **Bistable** | 2 | Has two stable states; requires an external trigger to switch from one state to the other, and remains there until triggered again — acts as a memory/flip-flop element |

---

## 3. Astable Multivibrator — Basic Circuit

A basic transistor astable multivibrator uses:

- **Two transistors (Q1, Q2)** cross-coupled: the collector of Q1 is coupled to the base of Q2 through a capacitor, and the collector of Q2 is coupled to the base of Q1 through another capacitor.
- **Two collector resistors (RC1, RC2)** connecting each collector to VCC.
- **Two base resistors (RB1, RB2)** connecting each base to VCC (providing base current for switching).

**Working:** At any instant, one transistor is fully ON (saturated) and the other is fully OFF (cut off). The coupling capacitors charge and discharge through the base resistors, and when a capacitor's voltage reaches a threshold, it forces the ON transistor to switch OFF and the OFF transistor to switch ON. This action repeats continuously, producing a square wave output at each collector — the two outputs are 180° out of phase with each other.

The output frequency depends on the RC time constants of the coupling networks (RB × C for each stage).

---

## 4. Monostable and Bistable — Key Differences from Astable

- **Monostable:** Similar cross-coupled structure, but one coupling is resistive (DC) instead of capacitive, giving it one permanently stable state. A trigger pulse forces a temporary switch to the other (quasi-stable) state for a duration set by an RC time constant, after which it automatically reverts.
- **Bistable:** Both couplings are resistive (DC-coupled), giving two fully stable states. It only changes state when triggered — it has no automatic timing/reverting action, making it useful for digital memory and flip-flop applications.

---

## 5. Applications

- **Astable:** Square wave/clock pulse generators, LED flashers, tone generators.
- **Monostable:** Pulse width generation, timing/delay circuits, debouncing switches.
- **Bistable:** Digital memory elements, flip-flops, frequency dividers, counters.

---

## 6. Key Points to Remember

- Multivibrator = two-stage cross-coupled switching circuit producing rectangular/square waveforms
- Astable: no stable state, free-running; Monostable: one stable state, needs trigger for one pulse; Bistable: two stable states, needs trigger to change state
- Astable multivibrator uses capacitive coupling on both sides; bistable uses resistive coupling on both sides; monostable uses one of each
- Output frequency/pulse-width is set by the RC time constants of the coupling networks

---

## 7. Practice Questions

1. Differentiate between astable, monostable, and bistable multivibrators based on the number of stable states.
2. In an astable multivibrator circuit, what determines the output frequency?
3. Why is a bistable multivibrator also called a flip-flop?
4. What type of coupling (resistive/capacitive) is used on each side of a monostable multivibrator, and why?
5. Name two practical applications each for astable and bistable multivibrators.

---

*Next chapter: Clipper Circuit*
