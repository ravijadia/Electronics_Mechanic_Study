---
sidebar_position: 1
sidebar_label: DSO Controls & Single Shot Capture
---

# Chapter: Digital Storage Oscilloscope – Front Panel Controls and Single Shot Capture

**Module:** Digital Storage Oscilloscope — Electronic Mechanic Trade
**Study No.:** 1.5.40 – 1.5.42

---

## 1. Introduction

A **Digital Storage Oscilloscope (DSO)** does everything an analog CRO does — but instead of drawing a trace directly with an electron beam, it **samples** the input signal, converts it to digital values, stores them in memory, and displays the result on an LCD/LED screen. This gives it abilities an analog scope doesn't have: freezing a single fast event, storing waveforms, measuring automatically, and connecting to a computer.

---

## 2. Basic Block Diagram

- **Attenuator/Amplifier:** Scales the input signal to a level the ADC can handle.
- **ADC (Analog-to-Digital Converter):** Samples the analog signal at regular intervals and converts each sample to a digital number.
- **Acquisition Memory:** Stores the stream of digital samples.
- **Microprocessor/Display Controller:** Processes stored samples, applies scaling/measurements, and draws the waveform on the LCD screen.
- **Time Base and Trigger circuit:** Same role as in an analog scope — controls sampling rate/sweep timing and decides when to start capturing.

---

## 3. Front Panel Controls

| Control | Function |
|---|---|
| **Volts/Div** | Sets vertical scale — how many volts each grid division represents |
| **Time/Div** | Sets horizontal scale — how much time each grid division represents |
| **Position (Vertical/Horizontal)** | Shifts the displayed waveform up/down or left/right |
| **Coupling (AC/DC/GND)** | Selects DC (full signal), AC (blocks DC offset), or GND (shows zero-volt reference) |
| **Trigger Level/Source/Slope** | Same function as analog scope — sets the voltage, channel, and edge direction that starts a capture |
| **Acquisition Mode** | Selects Normal, Average (reduces noise by averaging multiple captures), Peak Detect (catches narrow glitches), or Single (captures one event and stops) |
| **Run/Stop** | Starts or freezes continuous acquisition |
| **Single (Single Shot)** | Arms the scope to capture exactly one triggered event, then stop and hold it on screen |
| **Autoset** | Automatically adjusts Volts/Div, Time/Div, and trigger to display a stable waveform |
| **Save/Recall** | Stores a captured waveform to internal memory or a USB drive, or recalls a previously saved one |

---

## 4. Sampling and Memory Depth

- **Sample Rate:** How many samples per second the ADC takes. A higher sample rate captures fine detail in fast signals more accurately.
- **Memory Depth:** How many samples the scope can store per capture. For a given sample rate, more memory depth lets the scope capture a longer time window without losing detail.
- **Nyquist Rule:** To accurately reconstruct a signal, the sample rate must be at least twice the signal's highest frequency component. In practice, DSOs sample well above this minimum for a clean, accurate trace.

---

## 5. Capturing a Single Shot Signal

A **single shot** capture is used for one-time or non-repeating events — a power-on surge, a single pulse, a fault condition — that would be missed or hard to see in continuous run mode.

**Steps:**

1. Connect the probe to the point of interest and set correct coupling (usually DC).
2. Set **Volts/Div** and **Time/Div** to a range that should comfortably contain the expected event.
3. Set the **Trigger Source, Level, and Slope** to a value that will only be crossed by the event you want to capture (not by background noise).
4. Press the **Single** button — the scope arms itself and waits.
5. Trigger the event (e.g. power on the circuit, apply the test pulse).
6. Once triggered, the scope captures the waveform and **freezes** the display automatically.
7. If nothing was captured (display stays blank/unchanged), re-check the trigger level and re-arm by pressing **Single** again.
8. Use cursors or automatic measurements to read values off the frozen waveform, and **Save** it if needed for a report.

---

## 6. Advantages of DSO over Analog CRO

- Can capture and freeze one-time (non-repeating) events — an analog scope cannot hold a single-shot trace
- Waveforms can be stored, recalled, printed, or transferred to a computer (USB)
- Automatic measurements (Vpp, frequency, rise time, etc.) reduce reading errors
- Averaging and Peak Detect modes improve accuracy on noisy or glitchy signals

---

## 7. Key Points to Remember

- A DSO digitizes the signal (samples → ADC → memory) instead of drawing it directly like an analog CRO
- Single shot mode arms the scope to capture exactly one triggered event and hold it on screen
- Sample rate must be high enough (per the Nyquist rule) to accurately capture the signal's highest frequency
- Memory depth determines how long a time window can be captured at a given sample rate
- Trigger settings are what determine whether a single-shot capture succeeds

---

## 8. Practice Questions

1. What is the main functional difference between an analog CRO and a DSO?
2. What does "Memory Depth" control in a DSO?
3. Why would a technician use Single Shot mode instead of Run mode?
4. State the Nyquist rule in your own words.
5. List the steps to capture a single, non-repeating pulse using a DSO.

---

*Next chapter: Function Generator using IC 8038*

:::tip Practice
Take the **MCQ quiz** for this chapter: [Quiz: DSO Front Panel Controls & Single Shot Signal Capture](/tests/module-05-digital-storage-oscilloscope/dso-controls-single-shot)
:::
