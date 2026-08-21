---
sidebar_position: 2
sidebar_label: Oscilloscope Controls
---

# Chapter: Controls and Functions of Oscilloscope

**Module:** AC/DC Measuring Instruments, Basic Workshop Practice — Electronic Mechanic Trade
**Study No.:** 1.4.37 – 1.4.39

---

## 1. Introduction

A multimeter tells you a single number. An **oscilloscope (CRO — Cathode Ray Oscilloscope)** shows you the actual *shape* of a signal — how voltage changes over time. This makes it one of the most important instruments for diagnosing electronic circuits: seeing a distorted waveform, noise, ripple, or timing problem that a multimeter simply can't reveal.

---

## 2. Basic Block Diagram

An oscilloscope is built from a few key blocks:

- **CRT (Cathode Ray Tube):** The display — an electron beam is fired at a phosphor-coated screen, drawing the trace. (Modern instruments — DSOs, Digital Storage Oscilloscopes — replace the CRT with an LCD screen, but the front-panel controls work the same way.)
- **Vertical Amplifier:** Amplifies the input signal before it deflects the beam up/down — this is what "Volts/Div" controls.
- **Time Base (Horizontal) circuit:** Sweeps the beam left to right at a steady rate — this is what "Time/Div" controls.
- **Trigger circuit:** Synchronizes the start of each horizontal sweep to a specific point on the input signal, so the waveform appears stable on screen instead of drifting.

---

## 3. Front Panel Controls

| Control | Function |
|---|---|
| **Intensity** | Adjusts the brightness of the trace |
| **Focus** | Sharpens the trace to a clean, thin line |
| **Position (Vertical / X-Y)** | Moves the trace up/down and left/right on screen |
| **Volts/Div** | Sets how many volts each vertical grid division represents — controls the vertical "zoom" |
| **Time/Div** | Sets how much time each horizontal grid division represents — controls the horizontal "zoom" |
| **AC/DC/GND coupling** | Selects whether the signal is shown as-is (DC), with DC offset blocked (AC), or the input grounded to find the zero-volt reference line (GND) |
| **Trigger Source** | Selects which signal (Channel 1, Channel 2, or an external source) starts each sweep |
| **Trigger Level** | Sets the voltage at which the trigger circuit starts a new sweep |
| **Trigger Slope** | Chooses whether triggering happens on a rising or falling edge of the signal |
| **Channel selector (CH1/CH2/DUAL)** | Selects which input channel(s) are displayed — useful for comparing two signals at once |

---

## 4. Basic Steps to Display a Waveform

1. Connect the probe to the signal being measured, and connect the probe's ground clip to the circuit's ground.
2. Select the correct channel and set coupling to **DC** (or AC if you only want to see the varying part of the signal).
3. Set **Volts/Div** so the waveform's height fits comfortably on screen.
4. Set **Time/Div** so a few complete cycles of the waveform are visible.
5. Adjust **Trigger Level** and **Source** until the waveform appears stable (not scrolling/drifting).
6. Fine-tune **Intensity**, **Focus**, and **Position** for a clear, well-placed trace.

---

## 5. Applications

- Viewing waveform shape (sine, square, distorted, noisy) to diagnose circuit faults
- Measuring signal amplitude (peak-to-peak voltage) and frequency/period directly from the screen grid
- Comparing the phase relationship between two signals (Dual-channel mode)
- Checking for ripple on a DC power supply output
- Measuring pulse width and timing in digital circuits

---

## 6. Key Points to Remember

- Volts/Div controls the vertical scale; Time/Div controls the horizontal (time) scale
- The Trigger circuit is what makes a waveform appear stable instead of drifting across the screen
- DC coupling shows the full signal including any DC offset; AC coupling blocks the DC offset and shows only the varying part
- An oscilloscope shows waveform *shape* over time — something a multimeter cannot do

---

## 7. Practice Questions

1. What is the function of the Time/Div control?
2. Why does a waveform sometimes appear to "scroll" across the screen, and which control fixes it?
3. What is the difference between AC and DC coupling?
4. Why would a technician use Dual-channel mode?
5. Name two circuit faults that are easier to diagnose with an oscilloscope than with a multimeter.

---

*Next module: Module 5 — Digital Storage Oscilloscope*
