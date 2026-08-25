---
sidebar_position: 3
sidebar_label: Transformer
---

# Chapter: Transformer

**Module:** Power Supply Circuits — Electronic Mechanic Trade
**Study No.:** 1.8.70 – 1.8.71

---

## 1. Introduction

Almost every mains-powered electronic device needs its incoming AC voltage changed to a different, usually lower, level before it can be rectified into DC. The **transformer** is the component that does this — it transfers electrical energy between two circuits using electromagnetic induction, changing voltage (and current) without any moving parts or direct electrical connection between input and output.

---

## 2. Construction

- **Primary winding:** Coil connected to the AC input supply.
- **Secondary winding:** Coil that delivers the transformed AC output.
- **Core:** A laminated iron (or ferrite, for high-frequency transformers) core that both windings share, concentrating and guiding the magnetic flux between them.
- The primary and secondary windings are **not electrically connected** — they are linked only through the shared magnetic field in the core, which is why a transformer also provides **electrical isolation**.

---

## 3. Working Principle

1. AC current in the primary winding creates a continuously changing magnetic field in the core (since AC current itself constantly changes direction and magnitude).
2. This changing magnetic field links the secondary winding and, by **electromagnetic induction**, induces an alternating EMF (voltage) in it.
3. The size of the induced secondary voltage depends on the **turns ratio** between primary and secondary windings.

```
Vs / Vp = Ns / Np
```

Where Vp, Vs = primary/secondary voltage; Np, Ns = number of turns on primary/secondary.

For an (ideal) transformer, power in equals power out, so:

```
Vp × Ip = Vs × Is
```

---

## 4. Step-Up and Step-Down Transformers

| Type | Turns Ratio | Effect |
|---|---|---|
| **Step-down** | Ns < Np (fewer secondary turns) | Output voltage lower than input; output current higher than input |
| **Step-up** | Ns > Np (more secondary turns) | Output voltage higher than input; output current lower than input |

Most electronic power supplies use a **step-down transformer** to bring mains voltage (e.g. 230V AC) down to a lower AC voltage suitable for rectification (e.g. 12V AC).

---

## 5. Worked Example

**Question:** A transformer's primary has 1000 turns and is connected to 230V AC. The secondary has 100 turns. Find the secondary voltage.

**Solution:**
```
Vs / Vp = Ns / Np
Vs = Vp × (Ns / Np) = 230 × (100/1000) = 23V
```

**Answer:** The secondary voltage is **23V AC**.

---

## 6. Types and Applications

- **Power transformer:** Steps mains AC down for use in rectifier/power supply circuits.
- **Isolation transformer:** Same turns ratio (1:1) on primary and secondary — used purely to electrically isolate a circuit from the mains for safety, not to change voltage.
- **Auto-transformer:** A single winding with a tapped connection, shares part of the winding between primary and secondary — smaller and cheaper, but does **not** provide isolation.
- **CT (Center-Tapped) transformer:** Secondary winding has a tap at its electrical center, commonly used with full-wave rectifier circuits.

---

## 7. Key Points to Remember

- A transformer works only on AC — it needs a changing magnetic field, which DC cannot provide
- Voltage transformation ratio equals the turns ratio: Vs/Vp = Ns/Np
- Step-down transformers reduce voltage and increase current; step-up transformers do the opposite
- A transformer provides electrical isolation between primary and secondary circuits (except an auto-transformer)
- Ideal transformer power is conserved: Vp × Ip = Vs × Is

---

## 8. Practice Questions

1. Why does a transformer only work with AC and not DC?
2. A transformer has Np = 500, Ns = 50, and Vp = 230V. Find Vs.
3. What is the difference between a step-up and step-down transformer?
4. Why is a center-tapped transformer used with a full-wave rectifier?
5. What is the key difference between an isolation transformer and an auto-transformer?

---

*Next chapter: Rectifiers*

:::tip Practice
Take the **MCQ quiz** for this chapter: [Quiz: Transformer](/tests/module-08-power-supply-circuits/transformer)
:::
