---
sidebar_position: 3
sidebar_label: MOSFET
---

# Chapter: MOSFET

**Module:** Power Electronic Components — Electronic Mechanic Trade
**Study No.:** 1.10.101 – 1.10.104

---

## 1. Introduction

A **MOSFET (Metal Oxide Semiconductor Field Effect Transistor)** is a voltage-controlled unipolar device similar in principle to a JFET, but its gate is completely insulated from the channel by a thin layer of silicon dioxide (SiO₂). This insulated-gate construction gives the MOSFET an even higher input impedance than a JFET (typically 10¹⁰ to 10¹⁵ Ω) and makes it the most widely used transistor in modern digital ICs and power-switching circuits.

---

## 2. Terminals

- **Source (S)**, **Drain (D)**, **Gate (G)** — same functional roles as in a JFET.
- **Substrate/Body (B):** The base semiconductor material; in many discrete MOSFETs this is internally connected to the Source.

Because the gate is insulated by an oxide layer, MOSFETs are also called **IGFET (Insulated Gate FET)**.

---

## 3. Types of MOSFET

MOSFETs are classified by channel type and by mode of operation:

| Type | Channel | Operation |
|---|---|---|
| N-channel Enhancement | N-type | Channel does not exist at VGS = 0; forms only when a positive VGS is applied |
| P-channel Enhancement | P-type | Channel forms only when a negative VGS is applied |
| N-channel Depletion | N-type | Channel exists at VGS = 0; conducts until channel is depleted by gate voltage |
| P-channel Depletion | P-type | Channel exists at VGS = 0; conducts until depleted by opposite polarity gate voltage |

**Enhancement-mode MOSFETs** are the most common type used in switching and digital logic applications.

---

## 4. Working Principle — N-channel Enhancement MOSFET

1. The MOSFET is built on a lightly doped P-type substrate, with two heavily doped N+ regions forming the Source and Drain.
2. A thin SiO₂ insulating layer separates the metal Gate from the substrate between Source and Drain — no channel exists here initially.
3. When a sufficiently positive voltage is applied at the Gate (greater than the **threshold voltage, VGS(th)**), it attracts electrons toward the surface beneath the gate oxide, forming a thin N-type conducting **channel (inversion layer)** between Source and Drain.
4. Once the channel forms, current can flow from Drain to Source when VDS is applied. Increasing VGS further widens the channel and increases drain current.
5. Since the gate is separated from the channel by an insulator, **no gate current flows** under normal DC bias conditions — input impedance is extremely high.

```
Channel forms only when VGS > VGS(th)   (for N-channel Enhancement MOSFET)
```

---

## 5. Advantages over BJT

- Extremely high input impedance — draws virtually no gate current
- Faster switching speed, making it ideal for high-frequency switching applications
- Lower conduction losses at high current in power applications (low RDS(on))
- No thermal runaway issue like BJT — well suited for parallel operation in power circuits
- Simple to drive directly from digital logic output voltages in switching applications

---

## 6. Handling Precaution — ESD

The gate oxide layer is extremely thin and can be permanently punctured by static charge built up on the human body or equipment, even though no fault is visible externally. To protect MOSFETs from **Electrostatic Discharge (ESD)**:
- Store MOSFETs in anti-static (conductive foam) packaging.
- Use a grounded anti-static wrist strap while handling.
- Work on a grounded, anti-static mat.
- Avoid touching the gate lead directly; short the leads together during storage/transport where possible.
- Many modern MOSFETs include internal gate-protection (Zener) diodes to reduce ESD sensitivity.

---

## 7. Applications

- Power switching in SMPS (Switch Mode Power Supplies)
- Motor drive circuits and H-bridge switching
- Digital logic gates (CMOS technology)
- DC-DC converters and inverters

---

## 8. Key Points to Remember

- MOSFET gate is insulated from the channel by an oxide layer — input impedance is extremely high
- Enhancement-mode MOSFETs need VGS greater than threshold voltage VGS(th) to form a conducting channel
- Depletion-mode MOSFETs conduct at VGS = 0 and are controlled by depleting an existing channel
- MOSFETs are ESD-sensitive and must be handled using anti-static precautions
- MOSFETs offer faster switching and lower losses than BJTs in most switching applications

---

## 9. Practice Questions

1. Why does a MOSFET have higher input impedance than a JFET?
2. What is meant by "threshold voltage" in an enhancement-mode MOSFET?
3. Differentiate between enhancement-mode and depletion-mode MOSFETs.
4. Why must MOSFETs be handled with anti-static precautions?
5. Name two advantages of a MOSFET over a BJT in switching applications.

---

*Next chapter: Module 11 — Light Emitting Diodes*

:::tip Practice
Take the **MCQ quiz** for this chapter: [Quiz: MOSFET](/tests/module-10-power-electronic-components/mosfet)
:::
