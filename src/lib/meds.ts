import type { Bi } from './i18n';
import type { Level, VitalKey } from '../types/telemetry';
import { THRESHOLDS } from './thresholds';

export type MedId = 'saline' | 'ors' | 'oxygen' | 'acetaminophen' | 'warming';
export interface MedDef { id: MedId; name: Bi; presentation: Bi; unit: Bi; initial: number; critical: number }
const B = (es: string, en: string): Bi => ({ es, en });

/** Inventario inicial de demostración. `critical`: nivel de existencias en el que se dispara la advertencia. */
export const MEDS: MedDef[] = [
  { id: 'saline', name: B('Solución salina al 0,9 %', '0.9 % saline solution'), presentation: B('Bolsa de 500 mL (vía intravenosa)', '500 mL bag (intravenous)'), unit: B('bolsas', 'bags'), initial: 5, critical: 3 },
  { id: 'ors', name: B('Sales de rehidratación oral', 'Oral rehydration salts'), presentation: B('Sobre para 250 mL', 'Sachet for 250 mL'), unit: B('sobres', 'sachets'), initial: 12, critical: 4 },
  { id: 'oxygen', name: B('Oxígeno suplementario', 'Supplemental oxygen'), presentation: B('Cartucho portátil', 'Portable cartridge'), unit: B('cartuchos', 'cartridges'), initial: 6, critical: 2 },
  { id: 'acetaminophen', name: B('Paracetamol', 'Acetaminophen (paracetamol)'), presentation: B('Comprimido de 500 mg', '500 mg tablet'), unit: B('dosis', 'doses'), initial: 20, critical: 6 },
  { id: 'warming', name: B('Manta térmica', 'Thermal blanket'), presentation: B('Manta de rescate', 'Rescue blanket'), unit: B('unidades', 'units'), initial: 4, critical: 2 },
];
/** Dosis predeterminada de referencia de cada medicamento (el operador puede sustituirla). */
export const DEFAULT_DOSE: Record<MedId, Bi> = {
  saline: B('500 mL de solución salina al 0,9 % en bolo', '500 mL of 0.9 % saline as a bolus'),
  ors: B('1 sobre de sales de rehidratación (250 mL) por vía oral', '1 sachet of oral rehydration salts (250 mL) by mouth'),
  oxygen: B('Oxígeno suplementario a 6 L/min durante 10 min', 'Supplemental oxygen at 6 L/min for 10 min'),
  acetaminophen: B('500 mg de paracetamol por vía oral', '500 mg of acetaminophen by mouth'),
  warming: B('1 manta térmica', '1 thermal blanket'),
};
export const initialStock = () => Object.fromEntries(MEDS.map(m => [m.id, m.initial])) as Record<MedId, number>;
export const stockLevel = (stock: number, d: MedDef): Level => (stock <= d.critical ? 'red' : stock <= d.critical * 2 ? 'yellow' : 'green');

export interface Suggestion { title: Bi; action: Bi; dose?: Bi; medId?: MedId; rationale: Bi }
export const DISCLAIMER = B('Sugerencia automática de demostración: requiere la validación del cirujano de vuelo.', 'Automated demonstration suggestion: requires validation by the flight surgeon.');

type Dir = 'low' | 'high';
const ORS = { dose: B('1 sobre de sales de rehidratación (250 mL) por vía oral', '1 sachet of oral rehydration salts (250 mL) by mouth'), medId: 'ors' as MedId };
const O2_2 = { dose: B('Oxígeno suplementario a 2 L/min durante 10 min', 'Supplemental oxygen at 2 L/min for 10 min'), medId: 'oxygen' as MedId };
const O2_6 = { dose: B('Oxígeno suplementario a 6 L/min durante 10 min', 'Supplemental oxygen at 6 L/min for 10 min'), medId: 'oxygen' as MedId };
const PARA = { dose: B('500 mg de paracetamol por vía oral', '500 mg of acetaminophen by mouth'), medId: 'acetaminophen' as MedId };
const WARM = { dose: B('1 manta térmica', '1 thermal blanket'), medId: 'warming' as MedId };

/**
 * Reglas del motor de recomendación. CONTENIDO ILUSTRATIVO: las acciones y las dosis deben ser
 * definidas y validadas por el equipo médico antes de cualquier uso real.
 */
const RULES: Record<string, Partial<Record<Dir, Partial<Record<'yellow' | 'red', Suggestion>>>>> = {
  heartRate: {
    low: {
      yellow: { title: B('Frecuencia cardíaca baja', 'Low heart rate'), action: B('Reposo, verificación del sensor y repetición de la medición en 5 min.', 'Rest, check the sensor and repeat the measurement in 5 min.'), rationale: B('Bradicardia leve, por debajo de 60 lpm.', 'Mild bradycardia, below 60 bpm.') },
      red: { title: B('Bradicardia significativa', 'Significant bradycardia'), action: B('Registrar un ECG y contactar con el cirujano de vuelo. No administrar fármacos sin indicación médica.', 'Record an ECG and contact the flight surgeon. Do not give drugs without medical direction.'), rationale: B('Frecuencia muy inferior al rango normal.', 'Rate far below the normal range.') } },
    high: {
      yellow: { title: B('Taquicardia leve', 'Mild tachycardia'), action: B('Reposo, respiración pausada durante 5 min e hidratación oral.', 'Rest, slow breathing for 5 min and oral hydration.'), ...ORS, rationale: B('Frecuencia superior a 100 lpm; la deshidratación es una causa frecuente.', 'Rate above 100 bpm; dehydration is a common cause.') },
      red: { title: B('Taquicardia significativa', 'Significant tachycardia'), action: B('Suspender la actividad, registrar un ECG y contactar con el cirujano de vuelo.', 'Stop activity, record an ECG and contact the flight surgeon.'), rationale: B('Frecuencia muy superior al rango normal.', 'Rate far above the normal range.') } },
  },
  bp: {
    low: {
      yellow: { title: B('Presión arterial baja', 'Low blood pressure'), action: B('Reposo con las piernas elevadas e hidratación oral.', 'Rest with legs elevated and oral hydration.'), ...ORS, rationale: B('Presión inferior al rango normal.', 'Pressure below the normal range.') },
      red: { title: B('Hipotensión significativa', 'Significant hypotension'), action: B('Solución salina intravenosa según el protocolo y contacto con el cirujano de vuelo.', 'Intravenous saline per protocol and contact with the flight surgeon.'), dose: B('500 mL de solución salina al 0,9 % en bolo', '500 mL of 0.9 % saline as a bolus'), medId: 'saline', rationale: B('Presión muy baja: riesgo de síncope.', 'Very low pressure: risk of syncope.') } },
    high: {
      yellow: { title: B('Presión arterial elevada', 'Elevated blood pressure'), action: B('Reposo durante 10 min, evitar estimulantes y repetir la medición.', 'Rest for 10 min, avoid stimulants and repeat the measurement.'), rationale: B('Presión superior al rango normal.', 'Pressure above the normal range.') },
      red: { title: B('Hipertensión significativa', 'Significant hypertension'), action: B('Repetir la medición y contactar con el cirujano de vuelo. Tratamiento solo con indicación médica.', 'Repeat the measurement and contact the flight surgeon. Treat only under medical direction.'), rationale: B('Presión muy elevada.', 'Very high pressure.') } },
  },
  respRate: {
    low: {
      yellow: { title: B('Respiración lenta', 'Slow breathing'), action: B('Estimular al tripulante y reevaluar en 5 min.', 'Stimulate the crew member and reassess in 5 min.'), rationale: B('Frecuencia inferior a 12 rpm.', 'Rate below 12 breaths/min.') },
      red: { title: B('Bradipnea significativa', 'Significant bradypnea'), action: B('Oxígeno suplementario y contacto con el cirujano de vuelo.', 'Supplemental oxygen and contact with the flight surgeon.'), ...O2_6, rationale: B('Frecuencia respiratoria muy baja.', 'Very low respiratory rate.') } },
    high: {
      yellow: { title: B('Respiración acelerada', 'Rapid breathing'), action: B('Revisar el CO₂ de la cabina y la ventilación; respiración guiada.', 'Check cabin CO₂ and ventilation; guided breathing.'), rationale: B('Frecuencia superior a 20 rpm.', 'Rate above 20 breaths/min.') },
      red: { title: B('Taquipnea significativa', 'Significant tachypnea'), action: B('Oxígeno suplementario y revisión del CO₂ de la cabina.', 'Supplemental oxygen and a check of cabin CO₂.'), ...O2_6, rationale: B('Frecuencia respiratoria muy alta.', 'Very high respiratory rate.') } },
  },
  temperature: {
    low: {
      yellow: { title: B('Temperatura baja', 'Low temperature'), action: B('Abrigo y manta térmica.', 'Warm clothing and a thermal blanket.'), ...WARM, rationale: B('Temperatura inferior a 36,1 °C.', 'Temperature below 36.1 °C.') },
      red: { title: B('Hipotermia', 'Hypothermia'), action: B('Manta térmica, bebida caliente y contacto con el cirujano de vuelo.', 'Thermal blanket, a warm drink and contact with the flight surgeon.'), ...WARM, rationale: B('Temperatura inferior a 35,5 °C.', 'Temperature below 35.5 °C.') } },
    high: {
      yellow: { title: B('Temperatura elevada', 'Elevated temperature'), action: B('Hidratación y control cada 15 min. Paracetamol si hay malestar.', 'Hydration and a check every 15 min. Acetaminophen if uncomfortable.'), ...PARA, rationale: B('Temperatura superior a 37,2 °C.', 'Temperature above 37.2 °C.') },
      red: { title: B('Fiebre alta', 'High fever'), action: B('Paracetamol, enfriamiento físico y consulta con el cirujano de vuelo.', 'Acetaminophen, physical cooling and a consultation with the flight surgeon.'), ...PARA, rationale: B('Temperatura superior a 38 °C.', 'Temperature above 38 °C.') } },
  },
  spo2: {
    low: {
      yellow: { title: B('Saturación de oxígeno baja', 'Low oxygen saturation'), action: B('Verificar el sensor, respirar profundamente y revisar el CO₂ de la cabina. Administrar oxígeno si persiste.', 'Check the sensor, breathe deeply and check cabin CO₂. Give oxygen if it persists.'), ...O2_2, rationale: B('SpO₂ inferior al 95 %.', 'SpO₂ below 95 %.') },
      red: { title: B('Hipoxemia', 'Hypoxemia'), action: B('Oxígeno suplementario inmediato y contacto con el cirujano de vuelo.', 'Immediate supplemental oxygen and contact with the flight surgeon.'), ...O2_6, rationale: B('SpO₂ inferior al 90 %.', 'SpO₂ below 90 %.') } },
  },
};
const GROUP: Record<VitalKey, string> = { heartRate: 'heartRate', systolic: 'bp', diastolic: 'bp', respRate: 'respRate', temperature: 'temperature', spo2: 'spo2' };

export function suggest(key: VitalKey, value: number, level: Level): Suggestion | null {
  if (level === 'green') return null;
  const dir: Dir = value < THRESHOLDS[key].normal[0] ? 'low' : 'high';
  return RULES[GROUP[key]]?.[dir]?.[level] ?? null;
}
