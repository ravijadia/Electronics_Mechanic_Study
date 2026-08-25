---
sidebar_position: 1
sidebar_label: Electronic Simulation Software
---

# Chapter: Electronic Simulation Software

**Module:** Electronic Circuit Simulator — Electronic Mechanic Trade
**Study No.:** 1.13.123 – 1.13.126

---

## 1. Introduction

Before a circuit is ever built on a breadboard or a PCB, it can be built and tested inside a computer. **Circuit simulation software** lets a technician draw a schematic, assign values to every component, and then predict — with mathematical accuracy — how voltages, currents, and waveforms will behave at any point in the circuit. This is one of the most important tools in modern electronics work: it turns "let's try it and see" into "let's calculate it and confirm it."

---

## 2. Why Simulate Before Building?

- **Cost saving:** No components are damaged or wasted testing a wrong design.
- **Time saving:** A design can be tested and corrected in minutes instead of hours of wiring and rewiring.
- **Safety:** High-voltage or high-current circuits can be verified without any risk of shock, fire, or burnt components.
- **What-if analysis:** Component values can be changed instantly to see their effect — impossible to do that fast with real parts.
- **Visualization:** Internal signals (like waveform shape at a transistor's collector) can be viewed on a virtual oscilloscope even where a real probe would be hard to connect.

---

## 3. Types of Simulation Tools

- **SPICE-based simulators:** Most professional and free circuit simulators are built around **SPICE** (Simulation Program with Integrated Circuit Emphasis), a simulation engine developed for analyzing analog and mixed electronic circuits using the mathematical models of components (resistors, diodes, transistors, ICs, etc.).
- **Schematic capture + simulation engine:** Nearly all simulators have two connected parts — a **schematic editor** where the circuit is drawn using symbols, and a **simulation engine** that solves the circuit equations and produces results (voltages, currents, waveforms).
- **Desktop simulators:** Installed software running on a PC, generally offering more component libraries and advanced analysis options.
- **Online/browser-based simulators:** Free, install-nothing simulators that run inside a web browser — convenient for quick checks and for learning, since a circuit can be built and simulated in a few minutes without any installation.

---

## 4. Basic Simulation Workflow

1. **Draw the schematic** — place component symbols (resistor, capacitor, diode, transistor, source, etc.) on the canvas and wire them together exactly as the real circuit should be connected.
2. **Assign component values** — set resistance, capacitance, supply voltage, frequency, and other parameters for each part.
3. **Choose the analysis type** — decide what the simulator should calculate (see Section 6).
4. **Run the simulation** — the software solves the circuit equations.
5. **View the results** — read voltages/currents on virtual meters, or view waveforms on a virtual oscilloscope/graph.
6. **Adjust and repeat** — change a value or connection and re-run instantly to compare results.

---

## 5. Worked Walkthrough: Simulating a Series RC Circuit

**Circuit:** A 5V DC source, a 1kΩ resistor, and a 100µF capacitor connected in series, with the capacitor initially uncharged.

1. Place a DC voltage source on the schematic and set it to 5V.
2. Place a resistor in series with it and set its value to 1kΩ.
3. Place a capacitor in series after the resistor and set its value to 100µF, then connect its other terminal back to the source's negative terminal to complete the loop.
4. Select **Transient Analysis** so the simulator calculates how voltage and current change with time, rather than just the final steady value.
5. Set the simulation run time to about 1 second (long enough to see the capacitor fully charge, since the time constant τ = RC = 1000 × 100×10⁻⁶ = 0.1s, and a capacitor is considered fully charged after about 5τ = 0.5s).
6. Run the simulation and view the graph of capacitor voltage vs. time — it should rise from 0V and approach 5V in the expected exponential charging curve.
7. Compare the simulated curve with the calculated formula Vc = V(1 − e^(−t/RC)) to confirm the simulator's result matches hand calculation.

---

## 6. Common Types of Analysis

| Analysis Type | What It Shows |
|---|---|
| **DC Operating Point** | The steady-state DC voltages and currents everywhere in the circuit, with capacitors treated as open and inductors as short (no time variation) |
| **Transient Analysis** | How voltages/currents change over time — used to view waveforms, charging/discharging curves, and switching behavior |
| **AC Frequency Sweep** | How the circuit responds across a range of frequencies — used to plot gain/response curves for filters and amplifiers |

---

## 7. Key Points to Remember

- Simulation lets a circuit be tested and corrected before any real component is used, saving cost, time, and risk
- Most simulators are built on the SPICE engine, using mathematical models of real components
- The simulation workflow is: draw schematic → set values → choose analysis → run → view results
- Transient analysis shows how a circuit behaves over time (e.g. capacitor charging); DC operating point shows only the final steady values
- AC frequency sweep is used to study how a circuit's response changes with frequency, such as for filters and amplifiers

---

## 8. Practice Questions

1. Name three benefits of simulating a circuit before building it physically.
2. What is SPICE, and what role does it play in circuit simulation software?
3. What is the difference between a schematic editor and a simulation engine?
4. Which analysis type would you choose to view a capacitor charging over time, and which would you choose to find only the final steady-state voltages?
5. For a series RC circuit with R = 2kΩ and C = 50µF, calculate the time constant τ and estimate how long the capacitor takes to fully charge.
6. Why is an AC frequency sweep useful when designing a filter circuit?

---

*Next chapter: Module 14 — Operational Amplifiers*

:::tip Practice
Take the **MCQ quiz** for this chapter: [Quiz: Electronic Simulation Software](/tests/module-13-circuit-simulator/electronic-simulation-software)
:::
