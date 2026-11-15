import { localeOf, type Bi, type Lang } from './i18n';
import type { Level } from '../types/telemetry';

export type EventKind = 'alert' | 'anomaly' | 'consult' | 'medication' | 'action';
export type EventSource = 'parche' | 'ecografía' | 'telemetría' | 'médico' | 'operador' | 'astronauta';
/** Solo eventos clínicos. Los problemas de red, señal o latencia nunca se registran aquí. */
export interface MedEvent { id: string; astronautId: string; t: number; kind: EventKind; source: EventSource; severity: Level | 'info'; title: Bi; detail: Bi }

export const fmtDT = (t: number, lang: Lang) =>
  new Date(t).toLocaleString(localeOf(lang), { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC';

const d = (m: number, day: number, h: number, min: number) => Date.UTC(2026, m - 1, day, h, min);
const B = (es: string, en: string): Bi => ({ es, en });
const e = (id: string, a: string, t: number, kind: EventKind, source: EventSource, severity: MedEvent['severity'], title: Bi, detail: Bi): MedEvent => ({ id, astronautId: a, t, kind, source, severity, title, detail });

/** Historial de demostración previo a esta sesión. */
export const SEED_EVENTS: MedEvent[] = [
  e('s01', 'a01', d(1, 18, 10, 30), 'consult', 'médico', 'green', B('Evaluación médica de aptitud', 'Medical fitness evaluation'), B('Apto para el vuelo. Se registró la línea base cardiovascular.', 'Fit for flight. Cardiovascular baseline recorded.')),
  e('s02', 'a01', d(4, 9, 14, 12), 'anomaly', 'parche', 'yellow', B('Glucemia en ayunas de 104 mg/dL', 'Fasting glucose of 104 mg/dL'), B('Lectura del parche bioquímico superior a 100 mg/dL. El control repetido fue normal.', 'Biochemical patch reading above 100 mg/dL. The repeat check was normal.')),
  e('s03', 'a01', d(6, 2, 9, 5), 'anomaly', 'ecografía', 'yellow', B('Presión intraocular estimada de 21,5 mmHg', 'Estimated intraocular pressure of 21.5 mmHg'), B('En el límite superior. Seguimiento en la próxima ecografía.', 'At the upper limit. Follow-up at the next ultrasound.')),
  e('s04', 'a01', d(8, 21, 16, 40), 'alert', 'telemetría', 'yellow', B('Alerta de precaución: frecuencia cardíaca', 'Caution alert: heart rate'), B('FC de 104 lpm tras una sesión de ejercicio. Se normalizó en 6 min.', 'HR of 104 bpm after an exercise session. Normalized within 6 min.')),
  e('s05', 'a01', d(10, 5, 11, 20), 'consult', 'médico', 'info', B('Consulta de seguimiento', 'Follow-up consultation'), B('Sin hallazgos nuevos. Se mantiene el plan de contramedidas.', 'No new findings. The countermeasure plan is maintained.')),
  e('s06', 'a02', d(2, 3, 9, 0), 'consult', 'médico', 'green', B('Evaluación médica de aptitud', 'Medical fitness evaluation'), B('Hemoglobina de 12,1 g/dL y QTc de 438 ms, ambos dentro del rango.', 'Hemoglobin of 12.1 g/dL and QTc of 438 ms, both within range.')),
  e('s07', 'a02', d(5, 14, 13, 30), 'anomaly', 'parche', 'yellow', B('Hemoglobina de 11,8 g/dL', 'Hemoglobin of 11.8 g/dL'), B('Ligeramente por debajo del rango de 12,0 a 15,5 g/dL. Se indicó un suplemento y repetir el análisis.', 'Slightly below the 12.0–15.5 g/dL range. A supplement was prescribed and the test is to be repeated.')),
  e('s08', 'a02', d(7, 27, 10, 15), 'anomaly', 'ecografía', 'yellow', B('Presión intracraneal estimada de 5,1 mm', 'Estimated intracranial pressure of 5.1 mm'), B('Levemente por encima del umbral de 5,0 mm. Control en 30 días.', 'Slightly above the 5.0 mm threshold. Recheck in 30 days.')),
  e('s09', 'a02', d(9, 30, 15, 45), 'alert', 'telemetría', 'red', B('Alerta crítica: presión sistólica', 'Critical alert: systolic pressure'), B('Presión sistólica de 78 mmHg tras una maniobra ortostática. Se resolvió con hidratación oral.', 'Systolic pressure of 78 mmHg after an orthostatic maneuver. Resolved with oral hydration.')),
  e('s10', 'a02', d(10, 19, 8, 50), 'medication', 'operador', 'info', B('Sales de rehidratación oral administradas', 'Oral rehydration salts administered'), B('1 sobre por vía oral, confirmado por el operador.', '1 sachet by mouth, confirmed by the operator.')),
  e('s11', 'a03', d(1, 25, 11, 10), 'consult', 'médico', 'yellow', B('Evaluación médica de aptitud', 'Medical fitness evaluation'), B('Presión arterial en el límite superior (121/79 mmHg). Se indicó un control periódico.', 'Blood pressure at the upper limit (121/79 mmHg). Periodic monitoring advised.')),
  e('s12', 'a03', d(3, 30, 17, 0), 'alert', 'telemetría', 'yellow', B('Alerta de precaución: presión sistólica', 'Caution alert: systolic pressure'), B('Presión sistólica de 128 mmHg durante una simulación en centrífuga.', 'Systolic pressure of 128 mmHg during a centrifuge simulation.')),
  e('s13', 'a03', d(6, 18, 12, 25), 'anomaly', 'parche', 'yellow', B('TSH de 4,3 mUI/L', 'TSH of 4.3 mIU/L'), B('Levemente superior al rango de 0,4 a 4,0 mUI/L. Repetir junto con la T4L.', 'Slightly above the 0.4–4.0 mIU/L range. Repeat together with FT4.')),
  e('s14', 'a03', d(9, 9, 9, 40), 'anomaly', 'ecografía', 'info', B('Capacidad vital forzada del 96 % del valor teórico', 'Forced vital capacity of 96 % of predicted'), B('Control respiratorio sin hallazgos.', 'Respiratory check with no findings.')),
  e('s15', 'a03', d(10, 28, 14, 5), 'consult', 'médico', 'info', B('Consulta de seguimiento', 'Follow-up consultation'), B('Continuar con las contramedidas para el SANS y con el control de la presión arterial.', 'Continue the SANS countermeasures and blood pressure monitoring.')),
];
