---
sidebar_position: 3
sidebar_label: 'Op-Amp: Differential & Instrumentation Amp'
---

# Chapter: Op-Amp Applications — Differential and Instrumentation Amplifiers

**Module:** Op Amp and Timer Applications — Electronic Mechanic Trade
**Lesson No.:** 14.3 (1.14.131 & 1.14.132)

---

## 1. Introduction

Many real-world sensors (thermocouples, strain gauges, bio-signals) produce a very small differential voltage riding on a large common noise signal. A **differential amplifier** amplifies only the difference between two inputs, while an **instrumentation amplifier** improves on this with very high input impedance and excellent noise rejection — making it the standard front-end for precision sensor signal conditioning.

<Video
  url="https://www.youtube.com/watch?v=byLFy2_Y4h4"
  number="14.3"
  title="Instrumentation Amplifier Explained | Why It's Better than a Difference Amplifier"
  caption="Compares the differential amplifier to the instrumentation amplifier and why it's preferred."
/>

---

## 2. Differential Amplifier

**Circuit:** Both inputs are used — input V1 goes to the inverting terminal through R1, input V2 goes to the non-inverting terminal through a matched resistor, and feedback resistor Rf connects output to the inverting input.

```
Vout = (Rf / R1) × (V2 − V1)
```

(when all resistor ratios are matched as per the standard differential amplifier design)

The circuit amplifies only the **difference** between V1 and V2. Any voltage common to both inputs (common-mode signal, e.g. mains hum picked up equally on both leads) is ideally cancelled out.

---

## 3. Common Mode Rejection Ratio (CMRR)

CMRR measures how well an amplifier rejects signals common to both inputs (noise) while amplifying only the wanted differential signal. A **higher CMRR is better** — it means the amplifier is closer to ideal, rejecting more noise.

```
CMRR = Differential Gain / Common-Mode Gain
```

---

## 4. Instrumentation Amplifier

**Problem with the basic differential amplifier:** Its input impedance is limited by R1, which can load down sensitive sensor sources.

**Solution — the 3 op-amp instrumentation amplifier:**
- Two op-amps are used as **input buffers** (non-inverting configuration), one per input, giving very high input impedance so the sensor is not loaded.
- A single gain-setting resistor (Rgain) between the two buffer stages sets the overall gain precisely.
- The third op-amp is a **differential amplifier stage** that subtracts the two buffered signals and provides the final output.

**Key advantages over a simple differential amplifier:**
- Very high input impedance (does not load the signal source)
- Very high CMRR (excellent noise rejection)
- Gain can be adjusted with a single resistor without affecting CMRR

---

## 5. Applications

<Figure
  src="/img/figures/module-14-op-amp-timer/op-amp-differential-instrumentation/ecg-electrodes-patient.png"
  number="14.3"
  alt="A healthcare worker placing ECG electrodes on a patient's chest"
  caption="ECG electrodes pick up a very weak heart signal buried in mains-hum noise — exactly the kind of signal an instrumentation amplifier is built to amplify cleanly."
/>

- Amplifying small signals from strain gauges, thermocouples, and load cells
- Bio-medical instruments (ECG, EEG) where the wanted signal is millivolts but common-mode noise (mains hum) can be volts
- Industrial sensor signal conditioning in noisy environments

---

## 6. Key Points to Remember

- A differential amplifier amplifies only the voltage difference between two inputs: Vout = (Rf/R1)(V2 − V1)
- CMRR measures how well common (noise) signals are rejected — higher is better
- An instrumentation amplifier uses 3 op-amps: two input buffers + one differential stage
- Instrumentation amplifiers offer very high input impedance and very high CMRR, ideal for weak sensor signals
- Gain of an instrumentation amplifier is typically set by a single external resistor

---

## 7. Practice Questions

1. What is the main function of a differential amplifier?
2. Define CMRR. Why should it be as high as possible?
3. Why is a simple differential amplifier not ideal for very weak sensor signals?
4. List the three op-amps used in an instrumentation amplifier and the role of each.
5. Name two real-world applications of instrumentation amplifiers.

---

*Next chapter: Timer IC and its Applications*

:::tip Practice
Take the **MCQ quiz** for this chapter: [Quiz: Op-Amp Applications — Differential and Instrumentation Amplifiers](/tests/module-14-op-amp-timer/op-amp-differential-instrumentation)
:::
