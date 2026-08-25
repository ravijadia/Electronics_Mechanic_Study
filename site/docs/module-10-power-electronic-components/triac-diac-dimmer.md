---
sidebar_position: 2
sidebar_label: TRIAC & DIAC Dimmer/Regulator
---

# Chapter: Lamp Dimmer / Fan Motor Speed Regulator using TRIAC and DIAC

**Module:** Power Electronic Components — Electronic Mechanic Trade
**Study No.:** 1.10.98 – 1.10.100

---

## 1. Introduction

TRIAC and DIAC are power semiconductor devices widely used together to control the amount of AC power delivered to a load — the most common example being a **lamp dimmer** or a **ceiling fan speed regulator**. Both devices can conduct in **both directions** of an AC cycle, unlike an SCR, which conducts in only one direction.

---

## 2. DIAC (Diode for Alternating Current)

- A DIAC is a two-terminal, three-layer (PNP or NPN) bidirectional semiconductor device with no gate terminal.
- It remains **non-conducting** until the voltage across it exceeds its **breakover voltage (VBO)**, typically around 30V, in either polarity.
- Once VBO is reached, the DIAC switches to a low-resistance conducting state and stays on until the current through it drops below a holding value.
- Its main use is as a **triggering device** to supply a sharp pulse of gate current to a TRIAC at a precise point in the AC cycle.

---

## 3. TRIAC (Triode for Alternating Current)

- A TRIAC is a three-terminal, bidirectional device equivalent to two SCRs connected in **anti-parallel** with a common gate.
- Terminals: **MT1 (Main Terminal 1)**, **MT2 (Main Terminal 2)**, and **Gate (G)**.
- Unlike an SCR, a TRIAC can be triggered into conduction with either a positive or negative gate pulse, and it conducts current in **both directions** — making it suitable for controlling AC loads directly.
- Once triggered "on," the TRIAC continues conducting until the current through it falls to zero (natural commutation at the AC zero-crossing), after which it must be re-triggered for the next half-cycle.

---

## 4. Working Principle — Phase Control Dimmer

1. AC mains supply is fed to the load (lamp or fan motor) in series with the TRIAC's MT1–MT2 path.
2. A gate triggering network — typically a resistor (often a variable/potentiometer) in series with a capacitor — is connected across the supply, charging the capacitor once each half-cycle.
3. The DIAC is connected between this RC network and the TRIAC gate. The capacitor charges until its voltage reaches the DIAC's breakover voltage.
4. When the DIAC breaks over, it delivers a sharp pulse to the TRIAC gate, triggering it "on" for the remainder of that half-cycle.
5. By varying the resistor (potentiometer), the time taken for the capacitor to reach breakover voltage is changed — this shifts the **firing angle** within the half-cycle.
6. A **smaller firing angle** (TRIAC triggered early in the cycle) allows more of the AC waveform to reach the load → brighter lamp / higher fan speed. A **larger firing angle** (triggered late) reduces the power delivered → dimmer lamp / lower fan speed.

```
Load power ∝ conduction angle of the TRIAC within each AC half-cycle
```

---

## 5. Circuit Description

A basic TRIAC lamp dimmer/fan regulator consists of:
- AC mains → Load (lamp/fan) → TRIAC (MT1–MT2) → Neutral
- Potentiometer + fixed resistor + capacitor forming the RC timing (phase-shift) network across the TRIAC
- DIAC connecting the RC network to the TRIAC gate
- An optional RFI suppression choke/capacitor to reduce switching noise radiated onto the mains line

---

## 6. TRIAC vs SCR

| Parameter | SCR | TRIAC |
|---|---|---|
| Conduction direction | Unidirectional | Bidirectional |
| Terminals | Anode, Cathode, Gate | MT1, MT2, Gate |
| Suitable for | DC or half-wave AC control | Full AC waveform control |
| Triggering | Positive gate pulse only | Positive or negative gate pulse |

---

## 7. Applications

- Incandescent lamp dimmers
- Ceiling/table fan speed regulators
- Small AC motor speed control
- Heater/soldering iron temperature control

---

## 8. Key Points to Remember

- DIAC is a bidirectional trigger device with no gate; it switches on only above its breakover voltage
- TRIAC is a bidirectional switch equivalent to two anti-parallel SCRs with a common gate
- The RC network sets the firing angle; DIAC delivers the trigger pulse to the TRIAC gate
- Varying the potentiometer changes the firing angle and hence the power delivered to the load
- TRIAC turns off naturally at each AC current zero-crossing and must be re-triggered every half-cycle

---

## 9. Practice Questions

1. Why is a DIAC used along with a TRIAC in a dimmer circuit instead of triggering the TRIAC directly?
2. What is meant by "firing angle" in a phase-control dimmer?
3. How does a TRIAC differ from an SCR in terms of conduction and triggering?
4. What happens to the lamp brightness when the potentiometer resistance in a dimmer circuit is increased?
5. Name two applications of TRIAC-DIAC based control circuits.

---

*Next chapter: MOSFET*

:::tip Practice
Take the **MCQ quiz** for this chapter: [Quiz: Lamp Dimmer / Fan Motor Speed Regulator using TRIAC and DIAC](/tests/module-10-power-electronic-components/triac-diac-dimmer)
:::
