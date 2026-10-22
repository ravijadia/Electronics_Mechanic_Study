export interface ColumnTip {
  en: string;
  gu: string;
}

const T = (en: string, gu: string): ColumnTip => ({en, gu});

const FREQ_MEAS = T('Frequency measured on the CRO or counter.', 'CRO અથવા કાઉન્ટર પર માપેલી ફ્રીક્વન્સી.');
const FREQ_CALC = T('Frequency worked out from the component values. It should be close to the measured one.', 'કમ્પોનન્ટની કિંમતો પરથી ગણેલી ફ્રીક્વન્સી. તે માપેલી ફ્રીક્વન્સીની નજીક હોવી જોઈએ.');
const ANSWER = T('Type your own calculated or observed value here.', 'અહીં તમારી ગણતરીથી અથવા અવલોકનથી મળેલી કિંમત લખો.');
const SNO = T('Serial number of the sample or test.', 'નમૂના અથવા ટેસ્ટનો ક્રમ નંબર.');
const GAIN = T('Voltage gain = Vout ÷ Vin. It has no unit.', 'વોલ્ટેજ ગેઇન = Vout ÷ Vin. તેનો કોઈ એકમ નથી.');

/**
 * What a table column means, in plain words, keyed by the exact header text.
 * Only the headers a trainee is likely to puzzle over are listed; the rest are self-explanatory.
 */
export const COLUMN_TIPS: Record<string, ColumnTip> = {
  Check: T('The lab marks your typed entry ✓ (correct) or ✗ (check again). Change the entry and it checks again.', 'તમે લખેલી એન્ટ્રીને લેબ ✓ (સાચી) અથવા ✗ (ફરી તપાસો) થી ચકાસે છે. એન્ટ્રી બદલો તો ફરી ચકાસાશે.'),
  'Your value': ANSWER,
  'Your answer': ANSWER,
  'Your reading': ANSWER,
  'S. No.': SNO,
  'No.': SNO,
  Reading: T('The value shown on the meter or instrument. Write it with its unit.', 'મીટર અથવા ઇન્સ્ટ્રુમેન્ટ પર દેખાતી કિંમત. તેને એકમ સાથે લખો.'),
  Measured: T('The value you measured with the meter.', 'મીટરથી માપેલી કિંમત.'),
  'Marked value': T('The value printed or colour-coded on the part.', 'ભાગ પર છાપેલી અથવા કલર કોડથી દર્શાવેલી કિંમત.'),
  Condition: T('Your verdict on the part: good, open, short, leaky…', 'ભાગ વિશે તમારો નિર્ણય: સારો, ઓપન, શોર્ટ, લીકી…'),
  Expected: T('The value you should expect from this source.', 'આ સોર્સ પાસેથી અપેક્ષિત કિંમત.'),
  'Function & range': T('The meter function and range you selected.', 'તમે પસંદ કરેલી મીટર ફંક્શન અને રેન્જ.'),
  'Calculated I = P / V': T('Current worked out from the load power rating and the supply voltage.', 'લોડના પાવર રેટિંગ અને સપ્લાય વોલ્ટેજ પરથી ગણેલો કરંટ.'),

  'Vin (V)': T('Input voltage given to the circuit.', 'સર્કિટને આપેલો ઇનપુટ વોલ્ટેજ.'),
  'Vout (V)': T('Output voltage measured across the load.', 'લોડ પર માપેલો આઉટપુટ વોલ્ટેજ.'),
  'Vout meas. (V)': T('Output voltage you measured.', 'તમે માપેલો આઉટપુટ વોલ્ટેજ.'),
  'Vout measured (V)': T('Output voltage you measured.', 'તમે માપેલો આઉટપુટ વોલ્ટેજ.'),
  'Vout calc. (V)': T('Output voltage worked out from the formula. It should be close to the measured value.', 'ફોર્મ્યુલાથી ગણેલો આઉટપુટ વોલ્ટેજ. તે માપેલી કિંમતની નજીક હોવો જોઈએ.'),
  'Vout ideal (V)': T('Output voltage the formula predicts for this code.', 'આ કોડ માટે ફોર્મ્યુલા મુજબ મળતો આઉટપુટ વોલ્ટેજ.'),
  'f meas.': FREQ_MEAS,
  'f measured (Hz)': FREQ_MEAS,
  'f measured (kHz)': FREQ_MEAS,
  'Measured f (Hz)': FREQ_MEAS,
  'f calc.': FREQ_CALC,
  'f calculated (Hz)': FREQ_CALC,
  'f calculated (kHz)': FREQ_CALC,
  'Calculated f (Hz)': FREQ_CALC,
  'Duty meas.': T('Duty cycle = ON time ÷ total time × 100, as measured.', 'ડ્યુટી સાયકલ = ON સમય ÷ કુલ સમય × 100, માપેલી.'),
  'Duty calc.': T('Duty cycle worked out from the formula.', 'ફોર્મ્યુલાથી ગણેલી ડ્યુટી સાયકલ.'),
  'T measured (ms)': T('Time period read from the CRO screen: divisions × Time/div.', 'CRO સ્ક્રીન પરથી વાંચેલો ટાઇમ પીરિયડ: ડિવિઝન × Time/div.'),
  'Gain A': GAIN,
  'Av = Vout ÷ Vin': GAIN,
  'Gain (dB)': T('20 × log10 (Gain A). Use a calculator.', '20 × log10 (Gain A). કેલ્ક્યુલેટરથી ગણો.'),
  'Error (%)': T('(Measured − Set) ÷ Set × 100. A small error means a good result.', '(માપેલું − સેટ) ÷ સેટ × 100. ઓછી એરર એટલે સારું પરિણામ.'),
  '% regulation': T('(V no load − V full load) ÷ V full load × 100. Lower is better.', '(V no load − V full load) ÷ V full load × 100. ઓછું એટલે વધુ સારું.'),

  'Vac secondary (V)': T('AC voltage (rms) across the transformer secondary.', 'ટ્રાન્સફોર્મરના સેકન્ડરી પર AC વોલ્ટેજ (rms).'),
  'Vm from CRO (V)': T('Peak voltage read from the CRO: divisions × Volts/div.', 'CRO પરથી વાંચેલો પીક વોલ્ટેજ: ડિવિઝન × Volts/div.'),
  'Vdc measured (V)': T('DC output voltage measured with the multimeter.', 'મલ્ટીમીટરથી માપેલો DC આઉટપુટ વોલ્ટેજ.'),
  'Vdc theory (V)': T('DC output worked out from the formula. Compare it with the measured value.', 'ફોર્મ્યુલાથી ગણેલો DC આઉટપુટ. તેને માપેલી કિંમત સાથે સરખાવો.'),
  'Ripple p-p (V)': T('The AC wiggle on top of the DC output, measured peak to peak on the CRO.', 'DC આઉટપુટ પર રહેલો AC ઉતાર-ચઢાવ (રિપલ), CRO પર પીક-ટુ-પીક માપેલો.'),
  'γ': T('Ripple factor = Vac (rms) ÷ Vdc. Smaller means smoother DC.', 'રિપલ ફેક્ટર = Vac (rms) ÷ Vdc. નાનો એટલે વધુ સ્મૂથ DC.'),

  'Vf (diode test)': T('Forward voltage shown by the meter’s diode-test range (about 0.6 V for silicon).', 'મીટરની ડાયોડ-ટેસ્ટ રેન્જમાં દેખાતો ફોરવર્ડ વોલ્ટેજ (સિલિકોન માટે લગભગ 0.6 V).'),
  Rf: T('Forward resistance: leads connected so the diode conducts. Low.', 'ફોરવર્ડ અવરોધ: લીડ એવી રીતે જોડો કે ડાયોડ ચાલે. ઓછો હોય.'),
  Rr: T('Reverse resistance: leads reversed. Should be very high (OL).', 'રિવર્સ અવરોધ: લીડ ઊલટા જોડો. બહુ વધારે (OL) હોવો જોઈએ.'),
  'Rr ÷ Rf': T('Reverse resistance divided by forward resistance. A good diode gives a very large ratio.', 'રિવર્સ અવરોધ ÷ ફોરવર્ડ અવરોધ. સારા ડાયોડમાં આ ગુણોત્તર બહુ મોટો આવે.'),
  'Knee voltage (V)': T('The voltage at which the diode current starts to rise sharply.', 'જે વોલ્ટેજે ડાયોડનો કરંટ ઝડપથી વધવા લાગે તે.'),
  'IZ (mA)': T('Current through the zener diode.', 'ઝેનર ડાયોડમાંથી પસાર થતો કરંટ.'),

  'VR (V)': T('Voltage across the series resistor.', 'શ્રેણીના અવરોધક પરનો વોલ્ટેજ.'),
  'VF (V)': T('Forward voltage across the LED.', 'LED પરનો ફોરવર્ડ વોલ્ટેજ.'),
  'IF (mA)': T('Forward current through the LED.', 'LED માંથી પસાર થતો ફોરવર્ડ કરંટ.'),
  'Voc (V)': T('Open-circuit voltage: measured with no load connected.', 'ઓપન-સર્કિટ વોલ્ટેજ: કોઈ લોડ જોડ્યા વગર માપેલો.'),
  'Isc (mA)': T('Short-circuit current: measured with the cell shorted through the ammeter.', 'શોર્ટ-સર્કિટ કરંટ: સેલને એમીટર દ્વારા શોર્ટ કરીને માપેલો.'),
  'P (mW)': T('Power = V × I.', 'પાવર = V × I.'),

  VB: T('Base voltage, measured to ground.', 'બેઝનો વોલ્ટેજ, ગ્રાઉન્ડ સામે માપેલો.'),
  VE: T('Emitter voltage, measured to ground.', 'ઇમિટરનો વોલ્ટેજ, ગ્રાઉન્ડ સામે માપેલો.'),
  VC: T('Collector voltage, measured to ground.', 'કલેક્ટરનો વોલ્ટેજ, ગ્રાઉન્ડ સામે માપેલો.'),
  'Vbe (V)': T('Base–emitter voltage. About 0.7 V when a silicon transistor is ON.', 'બેઝ–ઇમિટર વોલ્ટેજ. સિલિકોન ટ્રાન્ઝિસ્ટર ON હોય ત્યારે લગભગ 0.7 V.'),
  'Vce (V)': T('Collector–emitter voltage. Near 0.2 V when the transistor is fully ON (saturated).', 'કલેક્ટર–ઇમિટર વોલ્ટેજ. ટ્રાન્ઝિસ્ટર પૂરેપૂરું ON (સેચ્યુરેટેડ) હોય ત્યારે લગભગ 0.2 V.'),
  'Ic (mA)': T('Collector current.', 'કલેક્ટર કરંટ.'),

  'MSR (mm)': T('Main scale reading: the last whole-mm mark visible before the thimble edge.', 'મેઇન સ્કેલ રીડિંગ: થિમ્બલની ધાર પહેલાંનો છેલ્લો પૂરો mm માર્ક.'),
  TD: T('Thimble division in line with the datum line. Each division is 0.01 mm.', 'ડેટમ લાઇન સાથે મળતું થિમ્બલ ડિવિઝન. દરેક ડિવિઝન 0.01 mm છે.'),
  'Zero error (V)': T('What the meter shows when it should read zero.', 'જ્યારે મીટર શૂન્ય બતાવવું જોઈએ ત્યારે તે જે બતાવે તે કિંમત.'),
  'Tol. ±%': T('Tolerance: how far the real value may differ from the marked value.', 'ટોલરન્સ: ખરી કિંમત લખેલી કિંમતથી કેટલી અલગ હોઈ શકે.'),
  'Within tol.?': T('Yes if the measured value lies inside marked value ± tolerance.', 'માપેલી કિંમત લખેલી કિંમત ± ટોલરન્સની અંદર હોય તો Yes.'),

  Rp: T('Resistance of the primary winding.', 'પ્રાઇમરી વાઇન્ડિંગનો અવરોધ.'),
  Rs: T('Resistance of the secondary winding.', 'સેકન્ડરી વાઇન્ડિંગનો અવરોધ.'),
  'P–S': T('Resistance between primary and secondary. Should be very high (OL).', 'પ્રાઇમરી અને સેકન્ડરી વચ્ચેનો અવરોધ. બહુ વધારે (OL) હોવો જોઈએ.'),
  'P–core': T('Resistance between primary and the iron core. Should be OL.', 'પ્રાઇમરી અને લોખંડના કોર વચ્ચેનો અવરોધ. OL હોવો જોઈએ.'),
  'S–core': T('Resistance between secondary and the iron core. Should be OL.', 'સેકન્ડરી અને લોખંડના કોર વચ્ચેનો અવરોધ. OL હોવો જોઈએ.'),

  'Q(t)': T('Output Q before the clock pulse.', 'ક્લોક પલ્સ પહેલાંનો આઉટપુટ Q.'),
  'Q(t+1)': T('Output Q after the clock pulse.', 'ક્લોક પલ્સ પછીનો આઉટપુટ Q.'),
  'α from CRO (°)': T('Firing angle: the point in the half-cycle where the SCR turns ON, read from the CRO.', 'ફાયરિંગ એંગલ: અર્ધ-સાયકલમાં જે બિંદુએ SCR ચાલુ થાય છે તે, CRO પરથી વાંચેલો.'),
  'I = VR ÷ R (mA)': T('Circuit current worked out from the voltage across R.', 'R પરના વોલ્ટેજ પરથી ગણેલો સર્કિટ કરંટ.'),
  'fr (kHz)': T('Resonant frequency: where the response peaks.', 'રેઝોનન્ટ ફ્રીક્વન્સી: જ્યાં પ્રતિભાવ સૌથી વધુ હોય.'),

  // Used by the Ohm’s law lab, which draws its own tables.
  'Supply set (V)': T('The voltage you set on the supply with the slider.', 'સ્લાઇડરથી સપ્લાય પર સેટ કરેલો વોલ્ટેજ.'),
  'Voltmeter, V (V)': T('Voltage across the resistor, read on the voltmeter.', 'વોલ્ટમીટરમાં વાંચેલો અવરોધક પરનો વોલ્ટેજ.'),
  'Ammeter, I (mA)': T('Current through the resistor, read on the ammeter.', 'એમીટરમાં વાંચેલો અવરોધકમાંથી પસાર થતો કરંટ.'),
  'R = V / I (Ω)': T('Resistance worked out for this one reading. Convert mA to A first (1000 mA = 1 A).', 'આ એક રીડિંગ માટે ગણેલો અવરોધ. પહેલાં mA ને A માં ફેરવો (1000 mA = 1 A).'),
  'Colour-code value (Ω), your reading': T('Read the colour bands (see the chart above) and type the value in Ω. You may use k, e.g. 4.7k.', 'કલર બેન્ડ વાંચો (ઉપરનો ચાર્ટ જુઓ) અને કિંમત Ω માં લખો. k વાપરી શકાય, જેમ કે 4.7k.'),
  'Mean V / I': T('The average of V ÷ I over all your readings for this resistor.', 'આ અવરોધક માટેના બધા રીડિંગના V ÷ I ની સરેરાશ.'),
  'R from graph': T('Resistance from the slope of your V–I graph: R = ΔV ÷ ΔI.', 'તમારા V–I ગ્રાફના ઢાળ પરથી અવરોધ: R = ΔV ÷ ΔI.'),
  'Difference from colour code': T('How far R from the graph is from the colour-code value, in %. Within the tolerance (±5 % for gold) is good.', 'ગ્રાફ પરથી મળેલો R કલર કોડની કિંમતથી કેટલા % અલગ છે. ટોલરન્સ (ગોલ્ડ માટે ±5 %) ની અંદર હોય તો સારું.'),
};
