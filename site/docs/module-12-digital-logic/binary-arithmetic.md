---
sidebar_position: 2
sidebar_label: Binary Arithmetic
---

# Chapter: Binary Arithmetic

**Module:** Basic Gates, Combinational Circuits, Flip-Flops — Electronic Mechanic Trade
**Study No.:** 1.12.112 – 1.12.114

---

## 1. Introduction

Digital circuits store and process information as binary numbers (0s and 1s). Before designing arithmetic circuits like adders, a technician must understand how binary addition and subtraction work, including how negative numbers are represented using **complements** — the method digital systems use since they have no separate "minus" hardware for subtraction.

---

## 2. Binary Addition Rules

| A | B | Sum | Carry |
|---|---|---|---|
| 0 | 0 | 0 | 0 |
| 0 | 1 | 1 | 0 |
| 1 | 0 | 1 | 0 |
| 1 | 1 | 0 | 1 |

**Example:** Add 1011 (11) and 0110 (6):
```
  1011
+ 0110
------
 10001   → decimal 17
```

---

## 3. 1's Complement and 2's Complement

- **1's complement:** Invert every bit (0→1, 1→0). Example: 1's complement of 1010 is 0101.
- **2's complement:** Take the 1's complement, then add 1 to the result. Example: 2's complement of 1010 → 1's complement = 0101 → +1 = 0110.
- 2's complement is the standard method digital systems use to represent **negative numbers** and to perform subtraction using only adder circuits (subtraction becomes "add the 2's complement").

---

## 4. Binary Subtraction Using 2's Complement

**Steps:**
1. Take the 2's complement of the number being subtracted.
2. Add it to the first number.
3. If there is a carry out of the leftmost bit, discard it — the result is positive.
4. If there is no carry out, the result is negative and is itself in 2's complement form (re-complement to read its magnitude).

**Worked Example:** Subtract 3 from 9 using 4-bit 2's complement (9 = 1001, 3 = 0011).

```
2's complement of 0011:
  1's complement = 1100
  +1             = 1101

Add:
   1001
 + 1101
 ------
  10110   → discard carry (leftmost extra bit) → 0110 = decimal 6
```

**Answer:** 9 − 3 = 6 ✔ (matches ordinary subtraction)

---

## 5. Half Adder and Full Adder (Introduction)

| Circuit | Inputs | Outputs | Function |
|---|---|---|---|
| **Half Adder** | A, B | Sum, Carry | Adds two single bits; Sum = A XOR B, Carry = A AND B |
| **Full Adder** | A, B, Carry-in | Sum, Carry-out | Adds two bits plus a carry from a previous stage; used to chain multiple bits together for multi-bit addition |

A full adder is essentially two half adders combined with an OR gate to handle the incoming carry, and multiple full adders are cascaded to add binary numbers of any length.

---

## 6. Key Points to Remember

- Binary addition follows simple rules: 1+1 produces a Sum of 0 with a Carry of 1.
- 1's complement inverts all bits; 2's complement is 1's complement + 1.
- Digital systems perform subtraction by adding the 2's complement, avoiding the need for separate subtractor hardware.
- A discarded carry-out after 2's complement addition means the result is positive; no carry-out means the result is negative (in 2's complement form).
- A half adder adds 2 bits (no carry-in); a full adder adds 2 bits plus a carry-in, enabling multi-bit binary addition.

---

## 7. Practice Questions

1. Find the 2's complement of 1100.
2. Add binary 1101 and 1011, showing the carry at each step.
3. Subtract 5 from 12 using 4-bit 2's complement arithmetic (show all steps).
4. What is the difference between a half adder and a full adder?
5. Write the truth table for a half adder.
6. Why do digital circuits prefer 2's complement over 1's complement for representing negative numbers?

---

*Next chapter: Encoder & Decoder*

:::tip Practice
Take the **MCQ quiz** for this chapter: [Quiz: Binary Arithmetic](/tests/module-12-digital-logic/binary-arithmetic)
:::
