import type { Level } from '../types/telemetry';
import { localeOf, tr, type Lang } from './i18n';

export type Sex = 'M' | 'F';
type Range = [number, number];

export interface Param {
  id: string; label: string; unit: string; decimals: number;
  normal: Range; warn: Range; base: number; sigma: number;
  normalF?: Range; warnF?: Range; baseF?: number; // variantes para mujeres
  fault?: 'low' | 'high'; rangeText?: string;
}

/**
 * Rangos NORMALES: tomados de tus notas (personas de 16 a 60 años).
 * Rangos de PRECAUCIÓN (warn): SUPUESTOS de desarrollo, a validar con el equipo médico.
 * Las unidades las añadí yo; confírmalas.
 */
export const BIOCHEM: Param[] = [
  { id: 'rbc', label: 'Glóbulos rojos', unit: 'M/µL', decimals: 1, normal: [4.5, 5.9], warn: [4.0, 6.4], base: 5.2, sigma: 0.05,
    normalF: [4.1, 5.1], warnF: [3.7, 5.6], baseF: 4.6, fault: 'low' },
  { id: 'hb', label: 'Hemoglobina', unit: 'g/dL', decimals: 1, normal: [13.5, 17.5], warn: [12, 18.5], base: 15.5, sigma: 0.15,
    normalF: [12, 15.5], warnF: [11, 16.5], baseF: 13.7, fault: 'low' },
  { id: 'wbc', label: 'Glóbulos blancos', unit: '/µL', decimals: 0, normal: [4500, 11000], warn: [3500, 13000], base: 7000, sigma: 150 },
  { id: 'lym', label: 'Linfocitos', unit: '/µL', decimals: 0, normal: [1000, 4800], warn: [800, 5500], base: 2400, sigma: 80, fault: 'low' },
  { id: 'plt', label: 'Plaquetas', unit: '/µL', decimals: 0, normal: [150000, 400000], warn: [120000, 450000], base: 250000, sigma: 3000, fault: 'low' },
  { id: 'glu', label: 'Glucemia en ayunas', unit: 'mg/dL', decimals: 0, normal: [70, 100], warn: [60, 125], base: 88, sigma: 1.2 },
  { id: 'tsh', label: 'TSH', unit: 'mUI/L', decimals: 2, normal: [0.4, 4.0], warn: [0.2, 6.0], base: 1.8, sigma: 0.05 },
  { id: 't4l', label: 'Tiroxina libre (T4L)', unit: 'ng/dL', decimals: 2, normal: [0.8, 1.8], warn: [0.6, 2.2], base: 1.2, sigma: 0.03 },
  { id: 'iod', label: 'Yodo urinario', unit: 'µg/L', decimals: 0, normal: [100, 199], warn: [50, 299], base: 150, sigma: 4, fault: 'low' },
];

export const IMAGING: Param[] = [
  { id: 'icp', label: 'Presión intracraneal', unit: 'mm', decimals: 1, normal: [0, 5.0], warn: [0, 5.7], base: 4.3, sigma: 0.05 },
  { id: 'iop', label: 'Presión intraocular', unit: 'mmHg', decimals: 0, normal: [10, 21], warn: [8, 25], base: 15, sigma: 0.4 },
  { id: 'fvc', label: 'Capacidad vital forzada', unit: '% del teórico', decimals: 0, normal: [80, 120], warn: [70, 130], base: 100, sigma: 1.5 },
  { id: 'fev', label: 'Índice FEV1/FVC', unit: '%', decimals: 0, normal: [80, 100], warn: [75, 100], base: 88, sigma: 0.8, fault: 'low', rangeText: '> 75–80' },
];

export const EP_PARAMS: Param[] = [
  { id: 'pr', label: 'Intervalo PR', unit: 'ms', decimals: 0, normal: [120, 200], warn: [100, 220], base: 160, sigma: 3 },
  { id: 'qrs', label: 'Complejo QRS', unit: 'ms', decimals: 0, normal: [80, 100], warn: [70, 120], base: 90, sigma: 1.5 },
  { id: 'qtc', label: 'Intervalo QTc', unit: 'ms', decimals: 0, normal: [0, 450], warn: [0, 500], base: 420, sigma: 4,
    normalF: [0, 460], warnF: [0, 500], baseF: 430 },
];

export const resolve = (p: Param, sex: Sex) =>
  sex === 'F' ? { normal: p.normalF ?? p.normal, warn: p.warnF ?? p.warn, base: p.baseF ?? p.base } : { normal: p.normal, warn: p.warn, base: p.base };

export const levelFor = (v: number, normal: Range, warn: Range): Level =>
  v >= normal[0] && v <= normal[1] ? 'green' : v >= warn[0] && v <= warn[1] ? 'yellow' : 'red';

export const fmt = (v: number, dec: number, lang: Lang = 'en') =>
  v.toLocaleString(localeOf(lang), { minimumFractionDigits: dec, maximumFractionDigits: dec });

export const rangeLabel = (p: Param, sex: Sex, lang: Lang = 'en') => {
  if (p.rangeText) return p.rangeText;
  const [lo, hi] = resolve(p, sex).normal;
  return lo === 0 ? `< ${fmt(hi, p.decimals, lang)}` : `${fmt(lo, p.decimals, lang)}–${fmt(hi, p.decimals, lang)}`;
};

const EN: Record<string, { label: string; unit?: string }> = {
  rbc: { label: 'Red blood cells' }, hb: { label: 'Hemoglobin' }, wbc: { label: 'White blood cells' }, lym: { label: 'Lymphocytes' },
  plt: { label: 'Platelets' }, glu: { label: 'Fasting blood glucose' }, tsh: { label: 'TSH', unit: 'mIU/L' }, t4l: { label: 'Free thyroxine (FT4)' },
  iod: { label: 'Urinary iodine' }, icp: { label: 'Intracranial pressure' }, iop: { label: 'Intraocular pressure' },
  fvc: { label: 'Forced vital capacity', unit: '% of predicted' }, fev: { label: 'FEV1/FVC ratio' },
  pr: { label: 'PR interval' }, qrs: { label: 'QRS complex' }, qtc: { label: 'QTc interval' },
};
export const plabel = (p: Param, lang: Lang) => tr(lang, p.label, EN[p.id].label);
export const punit = (p: Param, lang: Lang) => tr(lang, p.unit, EN[p.id].unit ?? p.unit);
