---
sidebar_position: 4
sidebar_label: Magnetism & Relay
---

# Chapter: Magnetism and Relays

**Module:** Active and Passive Components — Electronic Mechanic Trade
**Study No.:** 1.7.61 – 1.7.63

---

## 1. Introduction

**Magnetism** and electricity are closely linked — current flowing through a conductor produces a magnetic field, and a changing magnetic field can induce current in a conductor. This relationship (electromagnetism) is the working principle behind transformers, motors, and — most relevant here — the **relay**, an electromagnetically-operated switch used throughout electronic and electrical systems.

---

## 2. Basic Magnetism

- A magnet has two poles — **North (N)** and **South (S)**. Like poles repel; unlike poles attract.
- **Magnetic field:** The region around a magnet where its magnetic force acts, represented by field lines running from N to S outside the magnet.
- **Magnetic flux (Φ):** The total quantity of magnetic field lines passing through an area, measured in Webers (Wb).
- **Flux density (B):** Flux per unit area, measured in Tesla (T).

---

## 3. Electromagnetism

- When current flows through a straight conductor, a circular magnetic field forms around it (right-hand rule: if the thumb points in the direction of current, the fingers curl in the direction of the field).
- When a conductor is wound into a **coil**, the magnetic fields of each turn combine, producing a stronger, more concentrated field similar to that of a bar magnet — this is an **electromagnet**.
- Winding the coil around an **iron core** further concentrates and strengthens the field, since iron conducts magnetic flux far better than air.
- **Electromagnetic Induction:** A changing magnetic field near a conductor induces an EMF (voltage) in it — the basic principle behind transformers and generators.

---

## 4. The Relay

A **relay** is an electrically-operated switch: a small control current energizes an electromagnetic coil, which mechanically pulls a set of switch contacts to open or close a separate, often higher-power, circuit.

**Basic Construction:**

- **Coil:** Wound around an iron core; energizing it with the rated control voltage creates a magnetic field.
- **Armature:** A movable metal lever, pulled toward the energized core by the magnetic field.
- **Contacts:** Fixed contact points that the armature connects or disconnects as it moves — typically providing both Normally Open (NO) and Normally Closed (NC) paths.
- **Spring:** Returns the armature to its rest position when the coil is de-energized.

**Working:**

1. When the coil is **not energized**, the spring holds the armature at rest — the NC contact is closed, NO contact is open.
2. When the coil is **energized** (control voltage applied), the magnetic field pulls the armature — the NO contact closes, NC contact opens.
3. When power to the coil is removed, the spring returns the armature to its rest position.

---

## 5. Why Use a Relay?

- Lets a **low-power control circuit** (e.g. a microcontroller, sensor, or low-voltage switch) safely control a **high-power load** (motor, heater, mains-voltage appliance) without the control circuit carrying that current directly.
- Provides **electrical isolation** between the control circuit and the load circuit — useful for safety and for isolating noise-sensitive circuits from noisy, high-current loads.
- A single small control signal can switch one or more separate circuits simultaneously (multi-pole relays).

---

## 6. Applications

- Automatic control of motors, pumps, and heaters from a low-voltage control circuit
- Automotive electrical systems (headlights, horn, starter motor control)
- Home automation and appliance control from microcontrollers
- Protection circuits (e.g. tripping a supply on an overload/fault signal)

---

## 7. Key Points to Remember

- Current through a conductor creates a magnetic field; a coil concentrates this field, forming an electromagnet
- A relay uses an energized coil's magnetic field to mechanically operate switch contacts
- De-energized state = NC contact closed, NO contact open; energized state = reversed
- Relays provide electrical isolation and let a small control signal switch a much larger load

---

## 8. Practice Questions

1. What happens to a relay's NO and NC contacts when its coil is energized?
2. Why does winding a coil around an iron core increase its magnetic strength?
3. Give two reasons a relay is used instead of connecting the load directly to the control circuit.
4. Name two practical applications of relays.
5. What returns a relay's armature to its rest position when the coil is de-energized?

---

*Next chapter: RC Time Constant, Differentiator and RLC Circuits*
