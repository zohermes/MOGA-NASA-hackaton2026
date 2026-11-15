import type { Level, VitalKey } from '../types/telemetry';

/** Umbrales ILUSTRATIVOS para desarrollo. Sustituir por los validados por el equipo médico. */
export const THRESHOLDS: Record<VitalKey, { label: string; labelEn: string; unit: string; unitEn: string; normal: [number, number]; warn: [number, number]; decimals: number }> = {
  heartRate:   { label: 'Frecuencia cardíaca', labelEn: 'Heart rate', unit: 'lpm', unitEn: 'bpm', normal: [60, 100], warn: [50, 120], decimals: 0 },
  systolic:    { label: 'Presión sistólica', labelEn: 'Systolic pressure', unit: 'mmHg', unitEn: 'mmHg', normal: [90, 120], warn: [80, 140], decimals: 0 },
  diastolic:   { label: 'Presión diastólica', labelEn: 'Diastolic pressure', unit: 'mmHg', unitEn: 'mmHg', normal: [60, 80], warn: [50, 90], decimals: 0 },
  respRate:    { label: 'Frecuencia respiratoria', labelEn: 'Respiratory rate', unit: 'rpm', unitEn: 'br/min', normal: [12, 20], warn: [10, 25], decimals: 0 },
  temperature: { label: 'Temperatura corporal', labelEn: 'Body temperature', unit: '°C', unitEn: '°C', normal: [36.1, 37.2], warn: [35.5, 38.0], decimals: 1 },
  spo2:        { label: 'Saturación de oxígeno (SpO₂)', labelEn: 'Oxygen saturation (SpO₂)', unit: '%', unitEn: '%', normal: [95, 100], warn: [90, 100], decimals: 0 },
};

const inside = (v: number, [lo, hi]: [number, number]) => v >= lo && v <= hi;
export const levelOf = (key: VitalKey, v: number): Level =>
  inside(v, THRESHOLDS[key].normal) ? 'green' : inside(v, THRESHOLDS[key].warn) ? 'yellow' : 'red';

export const RANK: Record<Level, number> = { green: 0, yellow: 1, red: 2 };
export const worst = (...ls: Level[]): Level => ls.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'green' as Level);

export const LEVEL_UI: Record<Level, { text: string; border: string; bg: string; label: string; en: string }> = {
  green:  { text: 'text-ok',   border: 'border-ok/40',   bg: 'bg-ok/10',   label: 'Normal',     en: 'Normal' },
  yellow: { text: 'text-warn', border: 'border-warn/60', bg: 'bg-warn/10', label: 'Precaución', en: 'Caution' },
  red:    { text: 'text-crit', border: 'border-crit',    bg: 'bg-crit/15', label: 'Crítico',    en: 'Critical' },
};
export const utc = (t: number) => new Date(t).toISOString().slice(11, 19) + 'Z';
