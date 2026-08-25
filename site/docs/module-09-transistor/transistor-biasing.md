---
sidebar_position: 2
sidebar_label: Biasing of Transistors
---

# Chapter: Biasing of Transistors

**Module:** Transistor — Electronic Mechanic Trade
**Study No.:** 1.9.84 – 1.9.87

---

## 1. Introduction

For a transistor to work correctly as an amplifier, its junctions must be supplied with the correct DC voltages before any AC signal is applied. This process is called **biasing**. Proper biasing sets up a stable operating point (Q-point) so the transistor amplifies the signal without distortion.

---

## 2. Why Biasing Is Needed

- The **emitter-base junction** must be **forward biased** so majority carriers can flow from emitter to base.
- The **collector-base junction** must be **reverse biased** so the collector can collect carriers crossing the base.
- Without correct biasing, the transistor may stay cut off (no current flows) or saturate (behaves like a closed switch), both of which distort or block the signal.
- Biasing also compensates for changes in transistor characteristics caused by temperature variation, ensuring **operating point stability**.

---

## 3. Common Biasing Methods

### a) Fixed Bias (Base Resistor Method)

A single resistor RB connects the base to the supply VCC, setting a fixed base current.

```
IB = (VCC − VBE) / RB
```

- **Advantage:** Very simple, few components.
- **Disadvantage:** Poor stability — IC changes greatly with temperature and transistor replacement since IB is fixed regardless of IC.

### b) Collector-to-Base Bias

The base resistor RB is connected not to VCC directly, but to the collector terminal, providing negative feedback.

- If IC increases, the voltage at the collector drops, which reduces IB, which in turn reduces IC — partially self-correcting.
- **Advantage:** Better stability than fixed bias.
- **Disadvantage:** Still not ideal for large gain applications since feedback reduces gain.

### c) Voltage Divider Bias (Potential Divider Bias)

Two resistors (R1, R2) across VCC form a voltage divider that fixes the base voltage independent of transistor β. An emitter resistor RE is added for further stabilization.

- **Advantage:** Best stability among the three methods — base voltage is nearly independent of transistor parameters and temperature. Most widely used method in practical amplifier circuits.
- **Disadvantage:** More components required.

---

## 4. Stability Factor

The **stability factor (S)** indicates how much the collector current changes with change in reverse saturation current (leakage current, ICO), due to temperature:

```
S = ΔIC / ΔICO
```

- A **lower** value of S means **better stability** (ideal minimum S = 1).
- Fixed bias has the highest (worst) S; voltage divider bias has the lowest (best) S among the three methods discussed.

---

## 5. Comparison Table

| Biasing Method | Stability | Components | Common Use |
|---|---|---|---|
| Fixed Bias | Poor | Least (1 resistor) | Simple switching circuits |
| Collector-to-Base Bias | Moderate | Few | Basic amplifiers |
| Voltage Divider Bias | Best | More (R1, R2, RE, RC) | Practical audio/general-purpose amplifiers |

---

## 6. Key Points to Remember

- Emitter-base junction: forward biased; Collector-base junction: reverse biased
- Biasing sets the Q-point (operating point) for distortion-free amplification
- Voltage divider bias offers the best thermal stability and is most widely used
- Stability factor S should be as low as possible for a good bias design
- Fixed bias is simplest but least stable against temperature changes

---

## 7. Practice Questions

1. Why must the emitter-base junction be forward biased and the collector-base junction reverse biased?
2. Draw the circuit diagram for fixed bias and derive the expression for IB.
3. Why does voltage divider bias give better stability than fixed bias?
4. Define stability factor. What is its ideal minimum value?
5. Name the resistor added in voltage divider bias that provides negative feedback for stabilization.

---

*Next chapter: Oscillators*
