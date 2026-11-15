import type { Bi } from './i18n';
import type { Level } from '../types/telemetry';

/** Línea base calibrada en Tierra (sentado, en reposo); la usa el panel de la Tierra. */
export const BASELINE = { iop: 15, hr: 72, sys: 106, dia: 70, co2: 400 };

/** Modo instrumental: EEI (OCT + ecógrafo), Marte/portátil (solo ecógrafo USB + test visual), simulación en vivo. */
export type Mode = 'iss' | 'mars' | 'live';
export type Tri = 0 | 1 | 2;
export interface Inputs {
  mode: Mode; days: number; co2: number;
  octBase: number; octNow: number;          // µm
  onsd: number; flat: Tri; onh: number;     // mm · aplanamiento (0 ausente, 1 leve, 2 marcado) · mm
  frisen: Tri; iop: number;                 // 0 grado 0, 1 sospecha, 2 grado ≥ 1 · mmHg
  acuity: Tri;                              // agudeza de cerca (0 nítido, 1 leve esfuerzo, 2 borroso)
}
const B = (es: string, en: string): Bi => ({ es, en });
export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

/** Dispositivos de la misión: solo en Marte se desactiva el OCT. */
export const octOn = (m: Mode) => m !== 'mars';
export const DEFAULTS: Inputs = { mode: 'iss', days: 0, co2: 600, octBase: 95, octNow: 99, onsd: 4.3, flat: 0, onh: 0.1, frisen: 0, iop: 15, acuity: 0 };

// ---- Semáforos con los umbrales indicados por el protocolo ----
const step = (v: number, yellow: number, red: number): Level => (v >= red ? 'red' : v >= yellow ? 'yellow' : 'green');
export const dOct = (i: Pick<Inputs, 'octBase' | 'octNow'>) => i.octNow - i.octBase;
export const lvDOct = (d: number) => step(d, 20, 55);
export const lvOnsd = (v: number) => step(v, 5.0, 5.5);
export const lvOnh = (v: number): Level => (v > 0.5 ? 'red' : v >= 0.3 ? 'yellow' : 'green');
export const lvIop = (v: number): Level => (v > 22 ? 'red' : v > 21 || v < 10 ? 'yellow' : 'green');
export const lvTri = (v: Tri): Level => (['green', 'yellow', 'red'] as const)[v];
export const lvCo2 = (v: number) => step(v, 2000, 3000);
export const lvDays = (d: number): Level => (d >= 30 ? 'yellow' : 'green');
/** PIC estimada a partir del ONSD (modelo ilustrativo): 5,0 mmHg coincide con ONSD = 5,0 mm. */
export const icpEst = (onsd: number) => Math.max(0, 1 + 4 * (onsd - 4.0));
export const lvIcp = (v: number) => step(v, 5.0, 7.0);

/** Efecto del Mobile Gravity Suit al completar la meta del día (f = progreso 0–1): reduce PIO, ONSD y ΔOCT. */
export function withSuit(i: Inputs, f: number): Inputs {
  const k = clamp(f);
  return { ...i, iop: i.iop - 2.5 * k, onsd: Math.max(3.8, i.onsd - 0.4 * k), octNow: i.octNow - 12 * k };
}

export interface Finding { id: string; label: Bi; value: string; level: Level }
const W = { oct: 22, onsd: 20, flat: 12, onh: 10, frisen: 14, iop: 8, acuity: 4, days: 3, co2: 2 };

/** Peso de cada factor (0–1 de gravedad). Sin OCT, su peso se excluye y el índice se recalcula con el resto. */
export function severity(i: Inputs) {
  const dayS = i.days < 30 ? 0.15 * (i.days / 30) : 0.15 + 0.85 * clamp((i.days - 30) / 150);
  const s: { id: keyof typeof W; sev: number }[] = [
    { id: 'oct', sev: clamp(dOct(i) / 55) }, { id: 'onsd', sev: clamp((i.onsd - 4.4) / 1.2) }, { id: 'flat', sev: i.flat / 2 },
    { id: 'onh', sev: clamp(i.onh / 0.6) }, { id: 'frisen', sev: i.frisen / 2 }, { id: 'iop', sev: clamp((i.iop - 15) / 10) },
    { id: 'acuity', sev: i.acuity / 2 }, { id: 'days', sev: dayS }, { id: 'co2', sev: clamp((i.co2 - 1000) / 4000) },
  ];
  return s.filter(x => x.id !== 'oct' || octOn(i.mode));
}

/** Resultado: índice 0–100, nivel (el peor entre la banda del índice y cualquier umbral individual) y hallazgos. */
export function evaluate(i: Inputs) {
  const sv = severity(i), tot = sv.reduce((a, x) => a + W[x.id], 0);
  const score = (100 * sv.reduce((a, x) => a + W[x.id] * x.sev, 0)) / tot;
  const d = dOct(i), icp = icpEst(i.onsd);
  const F: Finding[] = [];
  if (octOn(i.mode)) F.push({ id: 'oct', label: B('Δ OCT', 'Δ OCT'), value: `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(0)} µm`, level: lvDOct(d) });
  F.push(
    { id: 'onsd', label: B('ONSD (3 mm)', 'ONSD (3 mm)'), value: `${i.onsd.toFixed(1)} mm`, level: lvOnsd(i.onsd) },
    { id: 'flat', label: B('Aplanamiento del globo', 'Globe flattening'), value: ['—', '+', '++'][i.flat], level: lvTri(i.flat) },
    { id: 'onh', label: B('Elevación de la cabeza del nervio óptico', 'Optic nerve head elevation'), value: `${i.onh.toFixed(1)} mm`, level: lvOnh(i.onh) },
    { id: 'frisen', label: B('Escala de Frisén', 'Frisén scale'), value: ['0', '?', '≥ 1'][i.frisen], level: lvTri(i.frisen) },
    { id: 'iop', label: B('Presión intraocular', 'Intraocular pressure'), value: `${i.iop.toFixed(1)} mmHg`, level: lvIop(i.iop) },
    { id: 'icp', label: B('PIC estimada', 'Estimated ICP'), value: `${icp.toFixed(1)} mmHg`, level: lvIcp(icp) },
  );
  const rank = { green: 0, yellow: 1, red: 2 } as const;
  const band: Level = score >= 70 ? 'red' : score >= 35 ? 'yellow' : 'green';
  const extra: Level = i.acuity === 2 ? 'yellow' : 'green';
  const level = [band, extra, ...F.map(f => f.level)].reduce((a, b) => (rank[b] > rank[a] ? b : a), 'green' as Level);
  const risk = Math.round(level === 'red' ? Math.max(70, score) : level === 'yellow' ? Math.max(35, Math.min(69, score)) : Math.min(34, score));
  return { risk, level, findings: F, icp };
}

/** Evolución de referencia por día de misión (modelo ilustrativo): ΔOCT y ONSD, sin contramedidas y con Suit diario. */
export function trajectory(co2: number, octEnabled: boolean) {
  const m = 1 + 0.25 * clamp((co2 - 2000) / 2000), days: number[] = [], octNo: number[] = [], octSuit: number[] = [], onsdNo: number[] = [], onsdSuit: number[] = [];
  for (let d = 0; d <= 180; d += 5) {
    const g = 1 - Math.exp(-d / 60);
    days.push(d);
    octNo.push(octEnabled ? 4 + 66 * g * m : NaN); octSuit.push(octEnabled ? 4 + 66 * g * m * 0.45 : NaN);
    onsdNo.push(4.3 + 1.6 * g * m); onsdSuit.push(4.3 + 1.6 * g * m * 0.45);
  }
  return { days, octNo, octSuit, onsdNo, onsdSuit };
}

// ---- Escenarios de demostración ----
export interface Scenario { label: Bi; apply: Partial<Inputs>; bp?: boolean }
export const SCENARIOS: Scenario[] = [
  { label: B('Simular: base en Tierra, sano', 'Simulate: Earth baseline, healthy'),
    apply: { days: 0, co2: 600, octBase: 95, octNow: 99, onsd: 4.3, flat: 0, onh: 0.1, frisen: 0, iop: 15, acuity: 0 } },
  { label: B('Simular: órbita, día 45 (preventivo)', 'Simulate: orbit, day 45 (preventive)'),
    apply: { days: 45, co2: 2500, octBase: 95, octNow: 123, onsd: 5.2, flat: 1, onh: 0.25, frisen: 0, iop: 20, acuity: 1 } },
  { label: B('Simular: emergencia SANS en Marte', 'Simulate: SANS emergency on Mars'), bp: true,
    apply: { days: 115, co2: 4200, octBase: 95, octNow: 157, onsd: 5.8, flat: 2, onh: 0.6, frisen: 2, iop: 24, acuity: 2 } },
];

/** Evolución automática en el modo de simulación en vivo: a medida que avanzan los días, empeoran los parámetros. */
export function liveValues(day: number, co2: number, octBase: number): Partial<Inputs> {
  const g = (1 - Math.exp(-day / 60)) * (1 + 0.25 * clamp((co2 - 2000) / 2000));
  return {
    octNow: Math.round(octBase + 4 + 66 * g), onsd: Math.round((4.3 + 1.6 * g) * 10) / 10, onh: Math.round((0.1 + 0.5 * g) * 10) / 10,
    iop: Math.round((15 + 9 * g) * 10) / 10, flat: g > 0.8 ? 2 : g > 0.45 ? 1 : 0, frisen: g > 0.8 ? 2 : g > 0.6 ? 1 : 0,
  };
}
