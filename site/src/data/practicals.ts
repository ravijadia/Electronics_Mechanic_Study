// 1st-year practical index (Electronic Mechanic trade), classified by how far
// each exercise can be done on screen. Module 1 (workshop safety) is left out.
//
//   sim         – full virtual bench: wire it, measure it, record readings
//   interactive – identify / choose / sequence trainer (no circuit to solve)
//   handson     – a physical skill; needs the real workshop
//   software    – the exercise itself is about using simulation software

export type PracticalKind = 'sim' | 'interactive' | 'handson' | 'software';

export interface Practical {
  no: string;
  title: string;
  kind: PracticalKind;
  /** Site path of the finished virtual practical, if built. */
  path?: string;
}

export interface PracticalModule {
  module: number;
  title: string;
  /** Study-material link for the module, if it exists. */
  docs?: string;
  items: Practical[];
}

const p = (no: string, title: string, kind: PracticalKind, path?: string): Practical => ({
  no,
  title,
  kind,
  path,
});

export const PRACTICAL_MODULES: PracticalModule[] = [
  {
    module: 2,
    title: 'Basics of AC and Electrical Cables & Single Range Meters',
    docs: '/docs/module-02-ac-electrical-cables-meters',
    items: [
      p('1.2.13', 'Identify the phase, neutral and earth on power socket; use testers to monitor AC power', 'sim', '/practicals/1-2-13'),
      p('1.2.14', 'Construct a test lamp and use it to check mains healthiness', 'sim', '/practicals/1-2-14'),
      p('1.2.15', 'Measure the voltage between phase and ground and rectify earthing', 'sim', '/practicals/1-2-15'),
      p('1.2.16', 'Identify and test different AC mains cables', 'interactive', '/practicals/1-2-16'),
      p('1.2.17', 'Prepare terminations, skin the electrical wires / cables using wire stripper and cutter', 'handson'),
      p('1.2.18', 'Measure the gauge of the wire using SWG and outside micrometer', 'sim', '/practicals/1-2-18'),
      p('1.2.19', 'Refer table and find current carrying capacity of wires', 'interactive', '/practicals/1-2-19'),
      p('1.2.20', 'Crimp the lugs to wire end', 'handson'),
      p('1.2.21', 'Measure AC and DC voltages using multimeter', 'sim', '/practicals/1-2-21'),
      p('1.2.22', 'Identify the type of meters by dial and scale marking / symbols', 'interactive', '/practicals/1-2-22'),
      p('1.2.23', 'Demonstrate various analog measuring instruments', 'sim', '/practicals/1-2-23'),
      p('1.2.24', 'Find the minimum and maximum measurable range of the meter', 'sim', '/practicals/1-2-24'),
      p('1.2.25', 'Carry out mechanical zero setting of a meter', 'sim', '/practicals/1-2-25'),
      p('1.2.26', 'Check the continuity of wires, meter probes and fuse etc.', 'sim', '/practicals/1-2-26'),
      p('1.2.27', 'Measure voltage and current using clamp meter', 'sim', '/practicals/1-2-27'),
    ],
  },
  {
    module: 3,
    title: 'Cells & Batteries',
    docs: '/docs/module-03-cells-and-batteries',
    items: [
      p('1.3.28', 'Identify the +ve and −ve terminals of the battery', 'interactive'),
      p('1.3.29', 'Identify the rated output voltage and AH capacity of given battery', 'interactive'),
      p('1.3.30', 'Measure the voltages of the given cells/battery using analog/digital multimeter', 'sim'),
      p('1.3.31', 'Charge and discharge the battery through load resistor', 'sim'),
      p('1.3.32', 'Maintain the secondary cells', 'interactive'),
      p('1.3.33', 'Measure the specific gravity of electrolyte using hydrometer', 'sim'),
      p('1.3.34', 'Test a battery and verify whether the battery is ready for use or needs recharging', 'sim'),
    ],
  },
  {
    module: 4,
    title: 'AC & DC Measuring Instruments',
    docs: '/docs/module-04-ac-dc-measuring-instruments',
    items: [
      p('1.4.35', 'Use the multimeter to measure various functions (AC V, DC V, AC I, DC I, R)', 'sim'),
      p('1.4.36', 'Identify the different types of meter for measuring AC & DC parameters', 'interactive'),
      p('1.4.37', 'Identify the different controls on the CRO/DSO front panel and observe the function of each control', 'sim'),
      p('1.4.38', 'Measure VDC, VAC and time period of a sine wave using CRO/DSO', 'sim'),
      p('1.4.39', 'Identify the different controls on the function generator front panel and observe the function of each control', 'sim'),
    ],
  },
  {
    module: 5,
    title: 'Digital Storage Oscilloscope',
    docs: '/docs/module-05-digital-storage-oscilloscope',
    items: [
      p('1.5.40', 'Identify the different controls on the front panel of a Digital Storage Oscilloscope', 'sim'),
      p('1.5.41', 'Measure the amplitude, frequency and time period of typical electronic signal using DSO', 'sim'),
      p('1.5.42', 'Take a print of a signal from DSO by connecting a printer and tally with applied signal', 'interactive'),
      p('1.5.43', 'Construct and test function generator using IC 8038', 'sim'),
    ],
  },
  {
    module: 6,
    title: 'Soldering/Desoldering and Various Switches',
    docs: '/docs/module-06-soldering-switches',
    items: [
      p('1.6.44', 'Practice soldering on different electronic components, small transformer and lugs', 'handson'),
      p('1.6.45', 'Practice soldering IC bases on PCBs', 'handson'),
      p('1.6.46', 'Practice desoldering using pump and wick', 'handson'),
      p('1.6.47', 'Join the broken PCB track and test', 'handson'),
      p('1.6.48', 'Identify and use SPST, SPDT, DPST, DPDT, tumbler, push button, toggle, piano switches', 'interactive'),
      p('1.6.49', 'Make a panel board using different types of switches for a given application', 'sim'),
    ],
  },
  {
    module: 7,
    title: 'Active and Passive Components',
    docs: '/docs/module-07-active-passive-components',
    items: [
      p('1.7.50', 'Identify the different types of active electronic components', 'interactive'),
      p('1.7.51', 'Measure the resistor value by colour code and verify the same by measuring with multimeter', 'sim'),
      p('1.7.52', 'Identify resistors by their appearance and check physical defects', 'interactive'),
      p('1.7.53', 'Identify the power rating of carbon resistors by their size', 'interactive'),
      p('1.7.54', 'Practice on measurement of parameters in combinational electrical circuit by applying Ohm’s Law for different resistor values and voltage sources', 'sim', '/practicals/1-7-54'),
      p('1.7.55', 'Measurement of current and voltage in electrical circuits to verify Kirchhoff’s Law', 'sim'),
      p('1.7.56', 'Verify laws of series and parallel circuits with voltage source in different combinations', 'sim'),
      p('1.7.57', 'Measure the resistance, voltage, current through series and parallel connected network using multimeter', 'sim'),
      p('1.7.58', 'Identify different inductors and measure the values using LCR meter', 'sim'),
      p('1.7.59', 'Identify the different capacitors and measure capacitance of various capacitors using LCR meter', 'sim'),
      p('1.7.60', 'Identify and test the circuit breaker and other protecting devices', 'sim'),
      p('1.7.61', 'Dismantle and identify the different parts of a relay', 'interactive'),
      p('1.7.62', 'Connect a timer relay in a circuit and test for its working', 'sim'),
      p('1.7.63', 'Connect a contactor in a circuit and test for its working', 'sim'),
      p('1.7.64', 'Construct and test RC time constant circuit', 'sim'),
      p('1.7.65', 'Construct a RC differentiator circuit and convert triangular wave into square wave', 'sim'),
      p('1.7.66', 'Construct and test series and parallel resonance circuit', 'sim'),
    ],
  },
  {
    module: 8,
    title: 'Power Supply Circuits & IC Regulators',
    docs: '/docs/module-08-power-supply-circuits',
    items: [
      p('1.8.67', 'Identify different types of diodes, diode modules and their specifications', 'interactive'),
      p('1.8.68', 'Test the given diode using multimeter and determine forward to reverse resistance ratio', 'sim'),
      p('1.8.69', 'Measure the voltage and current through a diode in a circuit and verify its forward characteristics', 'sim'),
      p('1.8.70', 'Identify different types of transformers and test', 'interactive'),
      p('1.8.71', 'Identify the primary and secondary windings of transformer and test the polarity', 'sim'),
      p('1.8.72', 'Construct and test a half-wave, full-wave and bridge rectifier circuit', 'sim'),
      p('1.8.73', 'Measure ripple voltage, ripple frequency and ripple factor of rectifiers for different load and filter capacitors', 'sim'),
      p('1.8.74', 'Identify and test zener diode', 'sim'),
      p('1.8.75', 'Construct and test zener diode based voltage regulator circuit', 'sim'),
      p('1.8.76', 'Calculate the percentage regulation of regulated power supply', 'sim'),
      p('1.8.77', 'Construct and test a +12 V fixed voltage regulator using 3-terminal regulator IC', 'sim'),
      p('1.8.78', 'Identify the different types of fixed +ve and −ve regulator ICs and the different current ratings', 'interactive'),
      p('1.8.79', 'Observe the output voltage of IC 723 and IC 78S40 regulators by varying the input voltage with fixed load', 'sim'),
      p('1.8.80', 'Construct and test a 1.2 V to 30 V variable output regulated power supply using IC LM317T', 'sim'),
    ],
  },
  {
    module: 9,
    title: 'Transistor, Amplifier, Oscillator and Wave Shaping Circuits',
    docs: '/docs/module-09-transistor',
    items: [
      p('1.9.81', 'Identify different transistors by package type, B-E-C pins, power, switching transistor, heatsink etc.', 'interactive'),
      p('1.9.82', 'Test the condition of a given transistor using ohmmeter', 'sim'),
      p('1.9.83', 'Construct and test a transistor based switching circuit to control a relay', 'sim'),
      p('1.9.84', 'Construct and test fixed bias, emitter bias and voltage divider bias transistor amplifier', 'sim'),
      p('1.9.85', 'Construct and test a CE amplifier with and without emitter bypass capacitor', 'sim'),
      p('1.9.86', 'Construct and test a Common Collector / Emitter Follower amplifier', 'sim'),
      p('1.9.87', 'Construct and test a two stage RC coupled amplifier', 'sim'),
      p('1.9.88', 'Demonstrate Colpitts and Hartley oscillator circuits and compare the output frequency by CRO', 'sim'),
      p('1.9.89', 'Construct and test RC phase-shift oscillator circuits', 'sim'),
      p('1.9.90', 'Construct and test a crystal oscillator circuit', 'sim'),
      p('1.9.91', 'Demonstrate astable, monostable and bistable multivibrator using transistors', 'sim'),
      p('1.9.92', 'Construct and test shunt clipper', 'sim'),
      p('1.9.93', 'Construct and test series and dual clipper circuit using diodes', 'sim'),
      p('1.9.94', 'Construct and test clamper circuit using diodes', 'sim'),
      p('1.9.95', 'Construct and test zener diode as a peak clipper', 'sim'),
    ],
  },
  {
    module: 10,
    title: 'Power Electronic Components',
    docs: '/docs/module-10-power-electronic-components',
    items: [
      p('1.10.96', 'Identify different power electronic components, their specification and terminals', 'interactive'),
      p('1.10.97', 'Construct and test a FET amplifier', 'sim'),
      p('1.10.98', 'Construct and test a circuit of SCR using UJT triggering', 'sim'),
      p('1.10.99', 'Construct a simple dimmer circuit using TRIAC', 'sim'),
      p('1.10.100', 'Construct UJT based free running oscillator and change its frequency', 'sim'),
      p('1.10.101', 'Identify various power MOSFETs by its number and test by using multimeter', 'sim'),
      p('1.10.102', 'Construct MOSFET test circuit with a small load', 'sim'),
      p('1.10.103', 'Identify IGBTs by their numbers and test by using multimeter', 'sim'),
      p('1.10.104', 'Construct IGBT test circuit with a small load', 'sim'),
    ],
  },
  {
    module: 11,
    title: 'Opto-Electronics',
    docs: '/docs/module-11-opto-electronics',
    items: [
      p('1.11.105', 'Test LEDs with DC supply and measure voltage drop and current using multimeter', 'sim'),
      p('1.11.106', 'Construct a circuit to test photovoltaic cell', 'sim'),
      p('1.11.107', 'Construct a circuit to switch a lamp load using photodiode', 'sim'),
      p('1.11.108', 'Construct a circuit to switch a lamp load using phototransistor', 'sim'),
    ],
  },
  {
    module: 12,
    title: 'Basic Gates, Combinational Circuits, Flip-Flops',
    docs: '/docs/module-12-digital-logic',
    items: [
      p('1.12.109', 'Verify the truth tables of all logic gate ICs by connecting switches and LEDs', 'sim'),
      p('1.12.110', 'Construct and verify the truth table of all the gates using NAND and NOR gates', 'sim'),
      p('1.12.111', 'Use digital IC tester to test the various digital ICs (TTL and CMOS)', 'sim'),
      p('1.12.112', 'Construct half adder circuit using ICs and verify the truth table', 'sim'),
      p('1.12.113', 'Construct full adder with two half adder circuits using ICs and verify the truth table', 'sim'),
      p('1.12.114', 'Construct the adder-cum-subtractor circuit and verify the result', 'sim'),
      p('1.12.115', 'Construct and test a 2 to 4 decoder', 'sim'),
      p('1.12.116', 'Construct and test a 4 to 2 encoder', 'sim'),
      p('1.12.117', 'Construct and test a 4 to 1 multiplexer', 'sim'),
      p('1.12.118', 'Construct and test a 1 to 4 demultiplexer', 'sim'),
      p('1.12.119', 'Identify different flip-flop ICs by the number printed on them', 'interactive'),
      p('1.12.120', 'Construct and test four bit latch using 7475', 'sim'),
      p('1.12.121', 'Construct and test R-S flip-flop using IC 7400 with and without clock pulse', 'sim'),
      p('1.12.122', 'Verify the truth tables of flip-flop ICs (RS, D, T, JK, MSJK) by connecting switches and LEDs', 'sim'),
    ],
  },
  {
    module: 13,
    title: 'Electronic Circuit Simulator',
    docs: '/docs/module-13-circuit-simulator',
    items: [
      p('1.13.123', 'Prepare simple digital and electronic circuits using the software', 'software'),
      p('1.13.124', 'Simulate and test the prepared digital and analog circuits', 'software'),
      p('1.13.125', 'Convert the prepared circuit into a layout diagram', 'software'),
      p('1.13.126', 'Prepare simple, power electronic and domestic electronic circuits using simulation software', 'software'),
    ],
  },
  {
    module: 14,
    title: 'Op-Amp & Timer 555 Applications',
    docs: '/docs/module-14-op-amp-timer',
    items: [
      p('1.14.127', 'Use analog IC tester to test various analog ICs', 'sim'),
      p('1.14.128', 'Construct and test Op-Amp circuits: inverting, non-inverting, summing amplifiers', 'sim'),
      p('1.14.129', 'Construct and test differentiator and integrator', 'sim'),
      p('1.14.130', 'Construct and test a zero crossing detector', 'sim'),
      p('1.14.131', 'Construct and test instrumentation amplifier', 'sim'),
      p('1.14.132', 'Construct and test binary weighted and R-2R ladder type digital-to-analog converters', 'sim'),
      p('1.14.133', 'Construct and test astable multivibrator circuit using IC 555', 'sim'),
      p('1.14.134', 'Construct and test monostable multivibrator circuit using IC 555', 'sim'),
      p('1.14.135', 'Construct and test VCO (V to F converter) using IC 555', 'sim'),
      p('1.14.136', 'Construct and test 555 timer as pulse width modulator', 'sim'),
    ],
  },
];
