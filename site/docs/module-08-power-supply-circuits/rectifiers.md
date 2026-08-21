---
sidebar_position: 4
sidebar_label: Rectifiers
---

# Chapter: Rectifiers

**Module:** Power Supply Circuits — Electronic Mechanic Trade
**Study No.:** 1.8.72 – 1.8.73

---

## 1. Introduction

A **rectifier** converts alternating current (AC) into direct current (DC) by allowing current to flow in only one direction, using the one-way conducting property of diodes. It is the essential first stage of nearly every DC power supply, sitting right after the transformer.

---

## 2. Half-Wave Rectifier

**Circuit:** A single diode is placed in series between the transformer's secondary and the load.

**Working:**

- During the **positive** half-cycle of AC input, the diode is forward-biased and conducts — current flows to the load, reproducing that half-cycle at the output.
- During the **negative** half-cycle, the diode is reverse-biased and blocks current — the output is zero during this half.

**Result:** Output is a series of one-directional pulses, occurring only once per full AC cycle — DC content is present, but with large gaps and heavy ripple.

**Drawbacks:** Poor efficiency, high ripple, half the input cycle is wasted (unused).

---

## 3. Full-Wave Rectifier (Center-Tapped)

**Circuit:** Two diodes, each connected to one end of a **center-tapped** transformer secondary; the center tap forms the common/ground reference for the output.

**Working:**

- On one half-cycle, one diode conducts (forward-biased) while the other is reverse-biased.
- On the other half-cycle, the roles reverse — the second diode conducts.
- Because one diode or the other conducts on *every* half-cycle, current flows to the load during both halves of the AC input.

**Result:** Output pulses occur twice per AC cycle — smoother than half-wave, with less ripple, and better use of the transformer's power.

---

## 4. Full-Wave Bridge Rectifier

**Circuit:** Four diodes arranged in a bridge configuration; does not require a center-tapped transformer.

**Working:**

- During one half-cycle, one diagonal pair of diodes conducts, directing current through the load in a fixed direction.
- During the other half-cycle, the other diagonal pair conducts — current still flows through the load in the **same** direction.

**Result:** Same double-pulse-per-cycle output as the center-tapped full-wave rectifier, but without needing a center tap — the most common rectifier configuration in modern power supplies, often built as a single "bridge rectifier" package.

---

## 5. Comparing the Three Rectifier Types

| Type | Diodes Needed | Transformer | Ripple Frequency | Efficiency |
|---|---|---|---|---|
| **Half-wave** | 1 | Standard | Same as AC input frequency | Low |
| **Full-wave (Center-tapped)** | 2 | Center-tapped | Double the AC input frequency | Higher |
| **Full-wave Bridge** | 4 | Standard (no center tap) | Double the AC input frequency | Higher |

---

## 6. Ripple and the Need for Filtering

The output of any rectifier alone is **pulsating DC**, not smooth DC — it still contains a large AC component called **ripple**. A **filter capacitor** placed across the output (after the rectifier) charges up during each output pulse and discharges slowly into the load between pulses, smoothing the pulses into a much steadier DC voltage. Rectifiers with a higher ripple frequency (full-wave types) are easier to filter smooth than half-wave, since the capacitor has less time to discharge between pulses.

---

## 7. Key Points to Remember

- A rectifier converts AC to pulsating DC using the one-way conduction of diodes
- Half-wave rectifiers use 1 diode and only use half the AC cycle — high ripple, low efficiency
- Full-wave rectifiers (center-tapped or bridge) use both halves of the AC cycle — lower ripple, higher efficiency
- A bridge rectifier uses 4 diodes and doesn't need a center-tapped transformer
- A filter capacitor is needed after any rectifier to smooth the pulsating DC into steady DC

---

## 8. Practice Questions

1. Why does a half-wave rectifier waste half of the input AC cycle?
2. How many diodes does a full-wave bridge rectifier use, and how many conduct at any instant?
3. Why does a full-wave rectifier produce less ripple than a half-wave rectifier?
4. What is the purpose of a filter capacitor after a rectifier?
5. Name one advantage of a bridge rectifier over a center-tapped full-wave rectifier.

---

*Next chapter: Zener Diode Working Principle*
