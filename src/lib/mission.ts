import type { VitalKey } from '../types/telemetry';
import type { Bi } from './i18n';

export type PhaseId = 'earth' | 'ascent' | 'station' | 'return';
export interface PhaseDef { id: PhaseId; step: number; label: Bi; blurb: Bi; focus: Bi[]; ground: Bi[] }
const B = (es: string, en: string): Bi => ({ es, en });

export const PHASES: PhaseDef[] = [
  { id: 'earth', step: 1, label: B('En la Tierra', 'On Earth'),
    blurb: B('Prelanzamiento: chequeos médicos y calibración de la línea base.', 'Pre-launch: medical checkups and baseline calibration.'),
    focus: [B('Línea base', 'Baseline'), B('Chequeo médico', 'Medical checkup'), B('Base de datos', 'Database')],
    ground: [B('Chequeos médicos previos y calibración de la línea base.', 'Pre-flight medical checkups and baseline calibration.'),
      B('Los datos se almacenan en la base de datos terrestre (enlace local).', 'Data is stored in the ground database (local link).'),
      B('Parche bioquímico y ecografía operativos en Tierra.', 'Biochemical patch and ultrasound operational on Earth.')] },
  { id: 'ascent', step: 2, label: B('Vuelo de ida', 'Outbound flight'),
    blurb: B('Tránsito espacial con alta aceleración.', 'Space transit under high acceleration.'),
    focus: [B('Alta aceleración', 'High acceleration'), B('Ecografía fuera de línea', 'Ultrasound offline'), B('Enlace intermitente', 'Intermittent link')],
    ground: [B('Alta aceleración: se esperan frecuencia cardíaca y presión arterial elevadas.', 'High acceleration: elevated heart rate and blood pressure are expected.'),
      B('Ecografía fuera de línea durante el ascenso.', 'Ultrasound offline during ascent.'),
      B('Enlace intermitente: los datos se almacenan en cola a bordo.', 'Intermittent link: data is queued on board.')] },
  { id: 'station', step: 3, label: B('En la Estación', 'On the Station'),
    blurb: B('Monitoreo continuo de larga duración en microgravedad.', 'Continuous long-duration monitoring in microgravity.'),
    focus: [B('Larga duración', 'Long duration'), B('Parche bioquímico', 'Biochemical patch'), B('Ecografía a bordo', 'Onboard ultrasound')],
    ground: [B('Monitoreo continuo de larga duración.', 'Continuous long-duration monitoring.'),
      B('Parche bioquímico y ecografía a bordo.', 'Biochemical patch and onboard ultrasound.'),
      B('Sincronización periódica con la base de datos terrestre.', 'Periodic synchronization with the ground database.')] },
  { id: 'return', step: 4, label: B('Volviendo', 'Returning'),
    blurb: B('Reentrada y análisis posvuelo.', 'Reentry and post-flight analysis.'),
    focus: [B('Reentrada', 'Reentry'), B('Apagón de comunicaciones', 'Communications blackout'), B('Análisis posvuelo', 'Post-flight analysis')],
    ground: [B('Reentrada: carga G elevada y posible apagón de comunicaciones.', 'Reentry: high G-load and possible communications blackout.'),
      B('Los datos se recuperan al restablecerse el enlace.', 'Data is recovered once the link is restored.'),
      B('Análisis posvuelo frente a la línea base terrestre.', 'Post-flight analysis against the Earth baseline.')] },
];

/** Perfil de simulación por etapa. 'station' reproduce exactamente el comportamiento original. */
export const PROFILES: Record<PhaseId, { base: Partial<Record<VitalKey, number>>; sigma: number; deviceFail: number; blackout: number; off: ('patch' | 'ultrasound')[] }> = {
  earth:   { base: { heartRate: 70, systolic: 108, diastolic: 69 }, sigma: 0.7, deviceFail: 0.005, blackout: 0, off: [] },
  ascent:  { base: { heartRate: 88, systolic: 110, diastolic: 72, respRate: 17, spo2: 96.8, temperature: 36.9 }, sigma: 1.2, deviceFail: 0.08, blackout: 0.1, off: ['ultrasound'] },
  station: { base: {}, sigma: 1, deviceFail: 0.02, blackout: 0.03, off: [] },
  return:  { base: { heartRate: 86, systolic: 110, diastolic: 72, respRate: 17, spo2: 97, temperature: 36.9 }, sigma: 1.1, deviceFail: 0.06, blackout: 0.25, off: [] },
};

/** Carga G simulada por etapa (s = segundos). */
export const gLoad = (phase: PhaseId, s: number) =>
  phase === 'earth' ? 1 : phase === 'station' ? 0 : phase === 'ascent' ? 1.2 + 2.4 * (0.5 + 0.5 * Math.sin(s / 3)) : 1 + 3 * (0.5 + 0.5 * Math.sin(s / 2.5));
