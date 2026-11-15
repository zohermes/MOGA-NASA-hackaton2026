import type { Bi } from './i18n';
import type { MedId } from './meds';
import { levelFor } from './clinical';
import type { Level, Sample, VitalKey } from '../types/telemetry';

const B = (es: string, en: string): Bi => ({ es, en });
export type ProtId = 'PROT-MED-01' | 'PROT-MED-02' | 'PROT-MED-03';
export type Follow = 'improving' | 'stable' | 'worsening';
export interface ProtDose { medId: MedId; dose: Bi }
export interface Protocol { id: ProtId; title: Bi; trigger: Bi; steps: Bi[]; doses: ProtDose[]; scenario: Partial<Record<VitalKey, number>> }

const NOTIFY = B('Notificar al equipo médico terrestre y transmitir el paquete clínico.', 'Notify the ground medical team and transmit the clinical package.');

/** Protocolos ILUSTRATIVOS de demostración: deben ser definidos y validados por el equipo médico antes de cualquier uso real. */
export const PROTOCOLS: Protocol[] = [
  { id: 'PROT-MED-01', title: B('Hipoxia aguda', 'Acute hypoxia'),
    trigger: B('Taquicardia (FC superior a 100 lpm) con SpO₂ inferior al 95 %.', 'Tachycardia (HR above 100 bpm) with SpO₂ below 95 %.'),
    steps: [B('Verificar el sensor de SpO₂ y repetir la medición.', 'Check the SpO₂ sensor and repeat the measurement.'),
      B('Sentar al astronauta y aflojar cualquier prenda que oprima el tórax.', 'Sit the astronaut upright and loosen any garment that restricts the chest.'),
      B('Administrar oxígeno suplementario a 6 L/min durante 10 min.', 'Give supplemental oxygen at 6 L/min for 10 min.'),
      B('Comprobar el O₂ y el CO₂ de la cabina en el plano de la nave.', 'Check the cabin O₂ and CO₂ on the ship layout.'),
      B('Medir de nuevo la SpO₂ y la frecuencia cardíaca cada 2 min.', 'Measure SpO₂ and heart rate again every 2 min.'), NOTIFY],
    doses: [{ medId: 'oxygen', dose: B('Oxígeno suplementario a 6 L/min durante 10 min', 'Supplemental oxygen at 6 L/min for 10 min') }],
    scenario: { spo2: 86, heartRate: 126, respRate: 26 } },
  { id: 'PROT-MED-02', title: B('Shock hipovolémico / deshidratación', 'Hypovolemic shock / dehydration'),
    trigger: B('Hipotensión (presión sistólica inferior a 90 mmHg) con cortisol elevado en el parche (superior a 23 µg/dL).', 'Hypotension (systolic pressure below 90 mmHg) with elevated cortisol on the patch (above 23 µg/dL).'),
    steps: [B('Dejar al astronauta en reposo con las piernas elevadas y sujetarlo en microgravedad.', 'Rest the astronaut with the legs elevated and secure them in microgravity.'),
      B('Medir la presión arterial y el pulso cada 5 min.', 'Measure blood pressure and pulse every 5 min.'),
      B('Obtener un acceso intravenoso y administrar 500 mL de solución salina al 0,9 % en bolo.', 'Obtain intravenous access and give 500 mL of 0.9 % saline as a bolus.'),
      B('Si está consciente, ofrecer sales de rehidratación oral.', 'If conscious, offer oral rehydration salts.'),
      B('Buscar la causa: pérdida de líquidos, sangrado, sudoración o vómitos.', 'Look for the cause: fluid loss, bleeding, sweating or vomiting.'), NOTIFY],
    doses: [{ medId: 'saline', dose: B('500 mL de solución salina al 0,9 % en bolo', '500 mL of 0.9 % saline as a bolus') }, { medId: 'ors', dose: B('1 sobre de sales de rehidratación (250 mL) por vía oral', '1 sachet of oral rehydration salts (250 mL) by mouth') }],
    scenario: { systolic: 76, diastolic: 50, heartRate: 118 } },
  { id: 'PROT-MED-03', title: B('Estrés térmico y arritmia', 'Heat stress and arrhythmia'),
    trigger: B('Temperatura corporal de 37,6 °C o más con FC de 120 lpm o más, o con ritmo cardíaco inestable.', 'Body temperature of 37.6 °C or more with HR of 120 bpm or more, or with an unstable heart rhythm.'),
    steps: [B('Suspender la actividad y trasladar al astronauta a una zona fresca del módulo.', 'Stop activity and move the astronaut to a cool area of the module.'),
      B('Retirar capas de ropa y aplicar paños fríos en el cuello, las axilas y la ingle.', 'Remove layers of clothing and apply cold cloths to the neck, armpits and groin.'),
      B('Si está consciente, hidratar con sales de rehidratación oral.', 'If conscious, hydrate with oral rehydration salts.'),
      B('Registrar un ECG y buscar signos de arritmia.', 'Record an ECG and look for signs of arrhythmia.'),
      B('Medir la temperatura y la frecuencia cardíaca cada 5 min.', 'Measure temperature and heart rate every 5 min.'), NOTIFY],
    doses: [{ medId: 'ors', dose: B('1 sobre de sales de rehidratación (250 mL) por vía oral', '1 sachet of oral rehydration salts (250 mL) by mouth') }],
    scenario: { temperature: 39, heartRate: 134 } },
];
export const protOf = (id: ProtId) => PROTOCOLS.find(p => p.id === id)!;
export const FOLLOW: Record<Follow, { label: Bi; level: Level; icon: string }> = {
  improving: { label: B('Mejora', 'Improving'), level: 'green', icon: '▲' },
  stable: { label: B('Estable', 'Stable'), level: 'yellow', icon: '■' },
  worsening: { label: B('Empeora', 'Worsening'), level: 'red', icon: '▼' },
};

/** Mediciones simuladas del parche bioquímico, derivadas del estado hemodinámico (modelo ilustrativo). */
export interface Patch { cortisol: number; lactate: number; glucose: number }
export const patchOf = (s: Sample): Patch => {
  const wob = Math.sin(s.t / 9000);
  const cortisol = 12 + wob * 0.6 + (s.systolic < 100 ? (100 - s.systolic) * 0.6 : 0) + (s.heartRate > 110 ? (s.heartRate - 110) * 0.15 : 0) + (s.temperature > 37.5 ? (s.temperature - 37.5) * 3 : 0) + (s.spo2 < 95 ? (95 - s.spo2) * 0.5 : 0);
  const lactate = 1.1 + wob * 0.05 + (s.spo2 < 95 ? (95 - s.spo2) * 0.25 : 0) + (s.heartRate > 100 ? (s.heartRate - 100) * 0.03 : 0) + (s.systolic < 90 ? (90 - s.systolic) * 0.08 : 0);
  return { cortisol, lactate, glucose: 88 + wob * 1.5 + (cortisol - 12) * 0.8 };
};
export const PATCH_PARAMS: { id: keyof Patch; label: Bi; unit: string; decimals: number; normal: [number, number]; warn: [number, number] }[] = [
  { id: 'cortisol', label: B('Cortisol', 'Cortisol'), unit: 'µg/dL', decimals: 1, normal: [6, 23], warn: [4, 30] },
  { id: 'lactate', label: B('Lactato', 'Lactate'), unit: 'mmol/L', decimals: 1, normal: [0.5, 2.0], warn: [0.3, 4.0] },
  { id: 'glucose', label: B('Glucosa', 'Glucose'), unit: 'mg/dL', decimals: 0, normal: [70, 100], warn: [60, 125] },
];
export const patchLevel = (id: keyof Patch, v: number): Level => { const p = PATCH_PARAMS.find(x => x.id === id)!; return levelFor(v, p.normal, p.warn); };

/** Conjuntos de anomalías: devuelve los protocolos cuyas condiciones se cumplen en la muestra. `hrSd` es la dispersión reciente de la FC. */
export function detect(s: Sample, hrSd: number): ProtId[] {
  const p = patchOf(s), out: ProtId[] = [];
  if (s.heartRate > 100 && s.spo2 < 95) out.push('PROT-MED-01');
  if (s.systolic < 90 && p.cortisol > 23) out.push('PROT-MED-02');
  if (s.temperature >= 37.6 && (s.heartRate >= 120 || hrSd >= 6)) out.push('PROT-MED-03');
  return out;
}

export const vitalsOf = (s: Sample) => ({ heartRate: s.heartRate, systolic: s.systolic, diastolic: s.diastolic, respRate: s.respRate, temperature: s.temperature, spo2: s.spo2 });
/** Puntaje de gravedad (0 = todo normal) usado para sugerir la evolución. */
export const SEV_KEYS: VitalKey[] = ['heartRate', 'systolic', 'diastolic', 'respRate', 'temperature', 'spo2'];
