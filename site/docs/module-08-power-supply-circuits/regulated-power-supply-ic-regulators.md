---
sidebar_position: 6
sidebar_label: Regulated Power Supply & IC Regulators
---

# Chapter: Regulated Power Supply and Integrated Circuit Voltage Regulators

**Module:** Power Supply Circuits — Electronic Mechanic Trade
**Study No.:** 1.8.76 – 1.8.80

---

## 1. Introduction

The chapters so far — transformer, rectifier, and Zener diode — are the building blocks of a complete **regulated DC power supply**: a circuit that takes AC mains input and delivers a steady, constant DC output regardless of variations in input voltage or load. This chapter puts those blocks together, and introduces **IC voltage regulators**, which simplify regulation into a single component.

---

## 2. Block Diagram of a Regulated Power Supply

```
AC Mains → Transformer → Rectifier → Filter Capacitor → Regulator → DC Output
  (230V)     (steps down)  (AC→pulsating DC) (smooths ripple)  (steadies output)
```

- **Transformer:** Steps mains AC down to a safe, lower AC voltage.
- **Rectifier:** Converts AC to pulsating DC (half-wave, full-wave, or bridge).
- **Filter capacitor:** Smooths the pulsating DC into DC with reduced ripple.
- **Regulator:** Removes remaining ripple and holds the output at a fixed voltage, even if input voltage or load current changes.

---

## 3. Why Regulation Is Needed

Even after filtering, the DC output still has some ripple, and its average value changes with mains voltage fluctuations and with how much current the load draws. Many electronic circuits (ICs, microcontrollers, sensors) require a **precise, steady DC voltage** to work correctly — a **regulator** stage is what delivers that.

---

## 4. IC Voltage Regulators

Rather than building a discrete Zener-based regulator for every supply, most practical circuits use a single **IC voltage regulator** — a chip that internally combines a voltage reference, error amplifier, and pass transistor to deliver a stable, fixed (or adjustable) output voltage.

**78xx series (Fixed positive voltage regulators):**

- 3-pin package: Input, Ground, Output.
- The "xx" indicates the fixed output voltage — e.g. **7805** = +5V, **7809** = +9V, **7812** = +12V.
- Requires the input voltage to be a few volts higher than the desired output (to give the internal circuitry enough headroom to regulate).

**79xx series (Fixed negative voltage regulators):**

- Same 3-pin style, but regulates a fixed **negative** output voltage — e.g. **7905** = −5V, **7912** = −12V.
- Used in circuits needing a dual (+/−) supply, such as op-amp circuits.

**LM317 (Adjustable positive voltage regulator):**

- 3-pin package: Input, Output, Adjust.
- Output voltage is set using two external resistors forming a voltage divider connected to the Adjust pin — allows any output voltage within the IC's range (typically 1.25V to ~37V) to be set by the designer.

---

## 5. Basic 7805 Regulator Circuit

**Circuit:** Filtered DC input → 7805 Input pin; 7805 Ground pin → common ground; 7805 Output pin → regulated +5V output. Small filter capacitors are typically placed on both the input and output pins (per datasheet) to improve stability and suppress noise.

**Working:** The IC internally senses its output voltage and continuously adjusts its internal pass transistor to hold the output at exactly 5V, compensating automatically for changes in input voltage (within its rated range) or load current (within its rated current limit).

---

## 6. Advantages of IC Regulators over Discrete Zener Regulation

- Far better voltage stability and load regulation
- Built-in protections in most IC regulators: **thermal shutdown** (protects against overheating), **short-circuit/overcurrent protection**, and **safe-operating-area protection**
- Fewer external components, simpler and more reliable to build
- Consistent, well-documented performance across units (from the datasheet)

---

## 7. Key Points to Remember

- A regulated power supply = Transformer → Rectifier → Filter → Regulator
- 78xx regulators give fixed positive output voltages; 79xx give fixed negative outputs; LM317 gives an adjustable output
- IC regulators need the input voltage to be somewhat higher than the desired output voltage to regulate correctly
- Most IC regulators include thermal shutdown and overcurrent protection, unlike a basic discrete Zener regulator
- The "xx" in a 78xx/79xx part number directly indicates its fixed output voltage

---

## 8. Practice Questions

1. List the four stages of a complete regulated DC power supply, in order.
2. What output voltage does a 7812 IC regulator provide?
3. How is the output voltage set on an LM317 regulator?
4. Name two built-in protection features common in IC voltage regulators.
5. Why must the input voltage to a 7805 regulator be higher than 5V?

---

*Next module: Module 9 — Transistor*
