---
sidebar_position: 2
sidebar_label: Function Generator (IC 8038)
---

# Chapter: Function Generator Using IC 8038

**Module:** Digital Storage Oscilloscope — Electronic Mechanic Trade
**Study No.:** 1.5.43

---

## 1. Introduction

A **function generator** is a test instrument that produces different waveform shapes — sine, square, and triangle — at an adjustable frequency, used to feed a known test signal into a circuit under test (often viewed on an oscilloscope). The **IC 8038** is a popular precision waveform generator chip that produces all three of these waveforms simultaneously from a single, simple circuit — making it a common trainer-level way to build a function generator.

---

## 2. IC 8038 Overview

- A **monolithic waveform generator IC** that internally generates a triangle wave, then shapes it into a sine wave and a square wave, all available at separate output pins at the same time.
- Typical package: 14-pin DIP.
- Frequency is set mainly by an external **resistor (R) and capacitor (C)**, and can be swept over a wide range (roughly 0.001 Hz to 300 kHz depending on component values).
- Operates from a single supply (e.g. +10V to +30V) or dual supply (e.g. ±5V to ±15V).

---

## 3. Key Pins and Their Function

| Pin (typical) | Function |
|---|---|
| **Pin 1, 12 (Freq. Adjust)** | Trim potentiometers used to adjust duty cycle/distortion of the waveform |
| **Pin 2 (Sine Out)** | Sine wave output |
| **Pin 3 (Triangle Out)** | Triangle wave output |
| **Pin 4, 5 (Timing Resistors)** | External resistors set charge/discharge rate of internal timing capacitor — set frequency |
| **Pin 6 (+V)** | Positive supply |
| **Pin 7 (FM Bias)** | Used when frequency modulation is required |
| **Pin 8 (FM Sweep In)** | External voltage input for sweeping/modulating frequency |
| **Pin 9 (Square Out)** | Square wave output (open collector — needs a pull-up resistor) |
| **Pin 10 (Timing Capacitor)** | External capacitor connects here — sets frequency along with the timing resistors |
| **Pin 11 (−V/GND)** | Negative supply or ground |

---

## 4. How the Circuit Works (Basic Principle)

1. An internal current source charges the external **timing capacitor (C)** through one **timing resistor (R1)**, producing a linear voltage ramp.
2. When the ramp reaches an internal upper threshold, an internal comparator switches, and the capacitor discharges through a second **timing resistor (R2)**.
3. This charge/discharge cycle produces a **triangle wave** across the capacitor.
4. The triangle wave is fed into an internal **sine converter (shaping) network**, which uses non-linear shaping to convert the triangle into a smooth **sine wave**.
5. The same internal comparator output that controls charge/discharge also directly drives the **square wave output** — high while charging, low while discharging (or vice versa).
6. Frequency is calculated approximately by: **f ≈ 1 / (R × C)** (with R1 = R2 = R for a symmetrical waveform); using different R1 and R2 values allows adjustable duty cycle.

---

## 5. Basic Test Circuit — Steps to Build and Test

1. Connect IC 8038 on a breadboard/PCB with supply pins (Pin 6, Pin 11) wired to the chosen power supply.
2. Connect the timing resistors (Pins 4 & 5) and timing capacitor (Pin 10) per the datasheet reference circuit — select R and C values for the desired frequency range.
3. Connect a pull-up resistor from Pin 9 (Square Out) to +V, since this output is open-collector.
4. Connect the Sine Out (Pin 2) and/or Triangle Out (Pin 3) and Square Out (Pin 9) to an oscilloscope, one channel at a time.
5. Power on the circuit and observe each output waveform on the scope — verify shape, amplitude, and frequency.
6. Adjust the sine-shaping trim potentiometers (Pins 1 & 12) if the sine output looks distorted or clipped, until it is a clean sine shape.
7. Vary R or C (or use a potentiometer in place of R) to confirm the frequency changes as expected, and measure the new frequency on the scope.

---

## 6. Applications

- Low-cost bench function generator for testing amplifier, filter, and audio circuits
- Signal source for calibrating and testing oscilloscopes
- Frequency modulation experiments (using the FM Sweep input)
- Educational trainer boards for understanding waveform generation principles

---

## 7. Key Points to Remember

- IC 8038 generates sine, square, and triangle waveforms simultaneously from one chip
- Frequency is set primarily by external R and C values: f ≈ 1/(R×C)
- The square wave output (Pin 9) is open-collector and needs an external pull-up resistor
- Trim potentiometers are used to reduce distortion and clean up the sine wave output
- Output waveforms should always be verified on an oscilloscope before using the generator for further testing

---

## 8. Practice Questions

1. Name the three waveforms IC 8038 can generate simultaneously.
2. Which two external components primarily set the output frequency?
3. Why does the square wave output need a pull-up resistor?
4. What is the purpose of the trim potentiometers connected to Pins 1 and 12?
5. How would you verify that a function generator circuit is working correctly?

---

*Next module: Module 6 — Soldering/Desoldering and Various Switches*
