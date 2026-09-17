---
sidebar_position: 2
sidebar_label: Types of Switches
---

# Chapter: Types of Switches

**Module:** Soldering/Desoldering and Various Switches — Electronic Mechanic Trade
**Lesson No.:** 6.2 (1.6.48 – 1.6.49)

---

## 1. Introduction

A **switch** is a device that makes or breaks an electrical circuit, controlling whether current flows or not. Switches range from a simple toggle on a wall to precision components inside electronic equipment. Understanding switch types, their contact arrangements, and ratings is essential for wiring, repair, and circuit design work.

<Video
  url="https://www.youtube.com/watch?v=bh5e2bGpIJg"
  number="6.2"
  title="Every Type of Electrical Switch Explained"
  caption="Surveys toggle, push-button, rocker, slide, rotary and dimmer switches."
/>

---

## 2. Switch Terminology

- **Pole:** The number of separate circuits a switch can control at once (e.g. Single Pole, Double Pole).
- **Throw:** The number of positions/output paths each pole can connect to (e.g. Single Throw = on/off; Double Throw = selects between two paths).
- **Contact Rating:** The maximum voltage and current a switch's contacts can safely handle (e.g. "5A, 250V AC").
- **Normally Open (NO):** Contact is open (circuit broken) in the switch's resting/unactuated state.
- **Normally Closed (NC):** Contact is closed (circuit complete) in the switch's resting/unactuated state.

---

## 3. Switch Types by Pole/Throw Configuration

| Type | Abbreviation | Description |
|---|---|---|
| **Single Pole, Single Throw** | SPST | Simple on/off switch for one circuit — most common type |
| **Single Pole, Double Throw** | SPDT | One input can be connected to either of two outputs (changeover switch) |
| **Double Pole, Single Throw** | DPST | Controls two separate circuits together with a single on/off action |
| **Double Pole, Double Throw** | DPDT | Two poles, each able to select between two positions — used e.g. to reverse motor direction |

---

## 4. Common Switch Types by Construction

<Figure
  src="/img/figures/module-06-soldering-switches/types-of-switches/toggle-switch-power.png"
  number="6.2"
  alt="A yellow industrial toggle switch mounted on a metal panel, labelled POWER with ON and OFF positions"
  caption="A toggle switch used as a panel-mounted power control."
/>

- **Toggle switch:** Lever-operated, snaps between positions; common in panels and household wiring.
- **Push-button switch:** Operated by pressing; may be momentary (returns to rest when released) or latching (stays in position until pressed again).
- **Rocker switch:** Flat paddle rocks between two positions when pressed at either end; common on power strips and appliances.

<Figure
  src="/img/figures/module-06-soldering-switches/types-of-switches/rocker-switches.png"
  number="6.3"
  alt="A bank of five white rocker light switches mounted on a wall plate"
  caption="A gang of rocker switches, as used for household lighting control."
/>
- **Slide switch:** Moved sideways along a track between positions; common in small electronics and toys.
- **Rotary switch:** A knob is turned to select between several positions/circuits — used for range selection (e.g. multimeter function selector).
- **DIP switch:** A small bank of miniature SPST switches on a PCB, used to set configuration options in electronic equipment.
- **Micro switch (limit switch):** A small switch requiring very little force/travel to actuate, often used to detect a mechanical position (e.g. door open/closed, end of travel).
- **Reed switch:** Contacts inside a sealed glass tube that close when a magnet is brought near — used in security sensors and proximity detection.
- **Relay:** An electromagnetically operated switch — a small control current energizes a coil that mechanically operates the switch contacts, allowing a low-power circuit to control a higher-power one.

---

## 5. Choosing and Testing a Switch

1. Identify the required **pole/throw configuration** for the circuit (how many circuits, how many positions).
2. Check the **voltage and current rating** of the switch against the load it will control — never use a switch rated below the circuit's actual voltage/current.
3. To test a switch with a multimeter: set the meter to **continuity/resistance** mode, connect probes across the switch terminals, and operate the switch — it should show continuity (near 0Ω / beep) when closed, and open circuit (OL / no beep) when open.
4. Check for correct behavior in every position (for multi-throw switches) — a worn or faulty switch may show intermittent or no continuity in one position.

---

## 6. Applications

- **SPST:** Simple lamp or appliance on/off control
- **SPDT:** Two-way light switching (staircase lighting), signal routing
- **DPDT:** Motor direction reversal, changeover between two power sources
- **Rotary switch:** Multimeter range selection, mode selection on equipment
- **DIP switch:** Setting device address/configuration on a PCB
- **Reed switch:** Door/window security sensors
- **Relay:** Controlling a high-power load (motor, heater) from a low-power control circuit (microcontroller, sensor)

---

## 7. Key Points to Remember

- Pole = number of circuits controlled; Throw = number of positions per pole
- Normally Open (NO) contacts are open at rest; Normally Closed (NC) contacts are closed at rest
- Always match a switch's voltage/current rating to the load it will control
- A multimeter's continuity/resistance mode is the standard way to test a switch
- A relay is an electrically-operated switch that lets a small control signal switch a larger load

---

## 8. Practice Questions

1. What do "Pole" and "Throw" mean in switch terminology?
2. Explain the difference between Normally Open and Normally Closed contacts.
3. Which type of switch would you use to reverse the direction of a DC motor, and why?
4. How would you test whether a switch is working correctly using a multimeter?
5. Why is a relay useful for controlling a high-power load from a microcontroller?

---

*Next module: Module 7 — Active and Passive Components*

:::tip Practice
Take the **MCQ quiz** for this chapter: [Quiz: Types of Switches](/tests/module-06-soldering-switches/types-of-switches)
:::
