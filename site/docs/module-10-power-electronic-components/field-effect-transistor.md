---
sidebar_position: 1
sidebar_label: Field Effect Transistor
---

# Chapter: Field Effect Transistor (FET)

**Module:** Power Electronic Components — Electronic Mechanic Trade
**Study No.:** 1.10.96 & 1.10.97

---

## 1. Introduction

A **Field Effect Transistor (FET)** is a three-terminal semiconductor device in which current flow is controlled by an electric **field** produced by a voltage applied at the control terminal, rather than by a current as in a Bipolar Junction Transistor (BJT). Because the control terminal draws almost no current, a FET is a **voltage-controlled**, **unipolar** device (conduction is carried by only one type of charge carrier — electrons or holes) and offers a very high input impedance.

---

## 2. Terminals

- **Source (S):** Terminal through which majority carriers enter the channel.
- **Drain (D):** Terminal through which majority carriers leave the channel.
- **Gate (G):** Control terminal; the voltage applied here controls the channel width and hence the drain current.

---

## 3. Construction — Junction FET (JFET)

A JFET consists of a bar of lightly doped semiconductor material forming the **channel**, with two heavily doped regions of the opposite type diffused on either side to form the **gate**, which surrounds the channel as a PN junction.

- **N-channel JFET:** Channel is N-type material; gate regions are P-type.
- **P-channel JFET:** Channel is P-type material; gate regions are N-type.

The two gate regions are internally connected and brought out as a single gate terminal.

---

## 4. Working Principle

1. In an N-channel JFET, Drain is kept positive with respect to Source (VDS), causing electrons to flow from Source to Drain through the channel.
2. The Gate-Source junction is always kept **reverse biased** (Gate negative with respect to Source for an N-channel device). This reverse bias creates a **depletion region** that extends into the channel.
3. As the reverse gate voltage (VGS) is made more negative, the depletion region widens, **narrowing the channel** and increasing its resistance — this reduces drain current (ID).
4. At a sufficiently negative VGS, the depletion regions from both sides meet at the center, **pinching off** the channel and reducing ID to nearly zero. This voltage is called the **pinch-off voltage (VP)**.
5. Because the gate junction is reverse biased, gate current is practically zero (in the order of nanoamperes) — this is why a FET has extremely high input impedance.

```
ID = IDSS × (1 − VGS/VP)²
```
Where IDSS = drain current with VGS = 0 (maximum drain current), VP = pinch-off voltage.

---

## 5. Worked Example

**Question:** A JFET has IDSS = 8 mA and VP = −4V. Find ID when VGS = −2V.

**Solution:**
```
ID = IDSS × (1 − VGS/VP)²
ID = 8mA × (1 − (−2/−4))²
ID = 8mA × (1 − 0.5)²
ID = 8mA × 0.25 = 2mA
```
**Answer:** ID = 2 mA.

---

## 6. BJT vs FET

| Parameter | BJT | FET |
|---|---|---|
| Control | Current controlled (base current) | Voltage controlled (gate voltage) |
| Input impedance | Low (kΩ range) | Very high (MΩ to GΩ range) |
| Carriers | Bipolar (electrons and holes) | Unipolar (only one type) |
| Noise | Higher | Lower |
| Thermal stability | Poorer | Better |
| Gain term | Current gain (β) | Transconductance (gm) |

---

## 7. Applications

- High input impedance amplifier stages (buffer/pre-amplifiers)
- Analog switches and choppers
- Voltage-variable resistors
- Impedance matching circuits

---

## 8. Key Points to Remember

- FET is a unipolar, voltage-controlled device with three terminals: Source, Drain, Gate
- Gate-Source junction of a JFET is always reverse biased, giving very high input impedance
- Pinch-off voltage (VP) is the VGS at which drain current becomes nearly zero
- ID = IDSS × (1 − VGS/VP)²
- FET has better thermal stability and lower noise than BJT

---

## 9. Practice Questions

1. Why does a JFET have very high input impedance compared to a BJT?
2. Define pinch-off voltage.
3. A JFET has IDSS = 10 mA and VP = −5V. Find ID at VGS = −1V.
4. Differentiate between N-channel and P-channel JFET.
5. List two applications of FET.

---

*Next chapter: TRIAC & DIAC — Lamp Dimmer / Fan Speed Regulator*

:::tip Practice
Take the **MCQ quiz** for this chapter: [Quiz: Field Effect Transistor (FET)](/tests/module-10-power-electronic-components/field-effect-transistor)
:::
