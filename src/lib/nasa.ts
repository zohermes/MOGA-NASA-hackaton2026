import { localeOf, mkBi, pickBi, tf, vitalLabel, vitalUnit, type Bi, type Lang } from './i18n';
import { levelOf, THRESHOLDS } from './thresholds';
import type { Level, Sample, VitalKey } from '../types/telemetry';

const B = (es: string, en: string): Bi => ({ es, en });

/** Niveles de respuesta médica NASA (ilustrativos, basados en la clasificación del manual de procedimientos médicos de emergencia de la ISS). */
export type NLevel = 1 | 2 | 3 | 4;
export const NLEVEL: Record<NLevel, Bi> = {
  1: B('Ambulatorio / síntomas menores', 'Ambulatory / minor symptoms'),
  2: B('Estabilizable en órbita', 'Stabilizable in orbit'),
  3: B('Soporte vital avanzado / riesgo de vida', 'Advanced life support / life-threatening'),
  4: B('Evacuación médica (MedEvac)', 'Medical evacuation (MedEvac)'),
};
export interface Advisory { key: string; level: NLevel; cat: Bi; crew?: string; problem: Bi; action: Bi; cmo?: boolean; incident?: string }

interface R { l: NLevel; t: Bi; a: Bi }
const REST_HYD = B('Reposo y respiración pausada durante 5 min, hidratación oral y repetir la medición.', 'Rest and slow breathing for 5 min, oral hydration and repeat the measurement.');
const SIT_BP = B('Reposo, evitar estimulantes y repetir la medición; si persiste, no administrar fármacos sin indicación médica.', 'Rest, avoid stimulants and repeat the measurement; if it persists, give no drugs without medical direction.');
/** Reglas de los signos vitales: nivel NASA, problema y acción inmediata por variable, dirección y gravedad. */
const VR: Record<VitalKey, { low?: { y?: R; r?: R }; high?: { y?: R; r?: R } }> = {
  heartRate: {
    high: { y: { l: 1, t: B('Taquicardia leve', 'Mild tachycardia'), a: REST_HYD },
      r: { l: 2, t: B('Taquicardia significativa', 'Significant tachycardia'), a: B('Suspender la actividad, registrar un ECG y descartar deshidratación, fiebre e hipoxia; usar solo los fármacos vigentes del botiquín.', 'Stop activity, record an ECG and rule out dehydration, fever and hypoxia; use only in-date drugs from the medical kit.') } },
    low: { y: { l: 1, t: B('Bradicardia leve', 'Mild bradycardia'), a: B('Reposo, verificar el sensor y repetir la medición en 5 min.', 'Rest, check the sensor and repeat the measurement in 5 min.') },
      r: { l: 2, t: B('Bradicardia significativa', 'Significant bradycardia'), a: B('Registrar un ECG y preparar el DEA con sujeción en el Crew Medical Restraint System; sin fármacos sin indicación médica.', 'Record an ECG and prepare the AED with restraint in the Crew Medical Restraint System; no drugs without medical direction.') } },
  },
  systolic: {
    low: { y: { l: 1, t: B('Presión arterial baja', 'Low blood pressure'), a: B('Reposo con las piernas elevadas e hidratación oral.', 'Rest with the legs elevated and oral hydration.') },
      r: { l: 3, t: B('Shock / cardiovascular crítico', 'Shock / critical cardiovascular event'), a: B('Sujetar en el Crew Medical Restraint System, vía intraósea (en microgravedad las venas colapsan) y fluidos IV; RCP + DEA y epinefrina si hay paro.', 'Restrain in the Crew Medical Restraint System, intraosseous access (veins collapse in microgravity) and IV fluids; CPR + AED and epinephrine if arrest.') } },
    high: { y: { l: 1, t: B('Presión arterial elevada', 'Elevated blood pressure'), a: SIT_BP },
      r: { l: 2, t: B('Hipertensión significativa', 'Significant hypertension'), a: B('Repetir la medición, buscar cefalea o dolor y vigilar; tratamiento solo con indicación médica.', 'Repeat the measurement, look for headache or pain and monitor; treat only under medical direction.') } },
  },
  diastolic: {
    low: { y: { l: 1, t: B('Presión diastólica baja', 'Low diastolic pressure'), a: B('Reposo con las piernas elevadas e hidratación oral.', 'Rest with the legs elevated and oral hydration.') },
      r: { l: 2, t: B('Presión diastólica muy baja', 'Very low diastolic pressure'), a: B('Reposo con las piernas elevadas, vigilar el pulso y preparar fluidos IV.', 'Rest with the legs elevated, monitor the pulse and prepare IV fluids.') } },
    high: { y: { l: 1, t: B('Presión diastólica elevada', 'Elevated diastolic pressure'), a: SIT_BP },
      r: { l: 2, t: B('Presión diastólica muy elevada', 'Very high diastolic pressure'), a: B('Repetir la medición, buscar cefalea o dolor y vigilar; tratamiento solo con indicación médica.', 'Repeat the measurement, look for headache or pain and monitor; treat only under medical direction.') } },
  },
  respRate: {
    high: { y: { l: 1, t: B('Respiración acelerada', 'Fast breathing'), a: B('Verificar el CO₂ de la cabina y los depuradores; reposo.', 'Check the cabin CO₂ and the scrubbers; rest.') },
      r: { l: 2, t: B('Taquipnea significativa', 'Significant tachypnea'), a: B('Verificar la SpO₂ y la atmósfera de la cabina; oxígeno suplementario si la SpO₂ es baja.', 'Check SpO₂ and the cabin atmosphere; supplemental oxygen if SpO₂ is low.') } },
    low: { y: { l: 1, t: B('Respiración lenta', 'Slow breathing'), a: B('Estimular y vigilar; revisar sedantes o analgésicos recientes.', 'Stimulate and monitor; review recent sedatives or analgesics.') },
      r: { l: 3, t: B('Hipoventilación grave', 'Severe hypoventilation'), a: B('Manejo de la vía aérea con ventilación asistida y O₂ al 100 %; RCP + DEA con sujeción si hay paro.', 'Airway management with assisted ventilation and 100 % O₂; CPR + AED with restraint if arrest.') } },
  },
  temperature: {
    high: { y: { l: 1, t: B('Temperatura elevada', 'Elevated temperature'), a: B('Hidratación y analgésico o antipirético vigente del botiquín, verificando su degradación por radiación.', 'Hydration and an in-date analgesic or antipyretic from the kit, checking radiation degradation.') },
      r: { l: 2, t: B('Fiebre / posible infección', 'Fever / possible infection'), a: B('Iniciar el antibiótico vigente del botiquín según el CMO, hidratar y vigilar signos de sepsis y la estabilidad del fármaco.', 'Start the in-date antibiotic from the kit as directed by the CMO, hydrate and watch for sepsis and drug stability.') } },
    low: { y: { l: 1, t: B('Temperatura baja', 'Low temperature'), a: B('Abrigar con la manta térmica y repetir la medición.', 'Cover with the thermal blanket and repeat the measurement.') },
      r: { l: 2, t: B('Hipotermia', 'Hypothermia'), a: B('Manta térmica, calentamiento progresivo y monitorización del ECG.', 'Thermal blanket, gradual rewarming and ECG monitoring.') } },
  },
  spo2: {
    low: { y: { l: 2, t: B('Hipoxia moderada', 'Moderate hypoxia'), a: B('O₂ suplementario al 100 % con mascarilla; verificar el O₂, el CO₂ y los depuradores de la cabina.', 'Supplemental 100 % O₂ by mask; check the cabin O₂, CO₂ and scrubbers.') },
      r: { l: 3, t: B('Hipoxia grave / posible descompresión (DCS)', 'Severe hypoxia / possible decompression (DCS)'), a: B('O₂ al 100 % en traje presurizado y protocolo de recompresión en cabina; asegurar la vía aérea.', '100 % O₂ in a pressurized suit and cabin recompression protocol; secure the airway.') } },
  },
};
const COVERED: Record<string, VitalKey[]> = { 'PROT-MED-01': ['spo2', 'heartRate'], 'PROT-MED-02': ['systolic', 'diastolic'], 'PROT-MED-03': ['temperature', 'heartRate'] };
const CAT = { vital: B('Signos vitales', 'Vital signs'), cabin: B('Cabina', 'Cabin'), sans: B('SANS', 'SANS'), rad: B('Radiación', 'Radiation'), pharm: B('Farmacia', 'Pharmacy'), clin: B('Parche / ecografía', 'Patch / ultrasound'), well: B('Fatiga / estrés', 'Fatigue / stress'), prot: B('Protocolo activo', 'Active protocol'), evac: B('MedEvac', 'MedEvac') };
const EVT: Record<string, Bi> = { physical: B('física', 'physical'), psych: B('psicológica', 'psychological'), cognitive: B('cognitiva', 'cognitive') };
const num = (v: number, d: number, l: Lang) => v.toLocaleString(localeOf(l), { minimumFractionDigits: d, maximumFractionDigits: d });
const CO2_ACT = B('Verificar los depuradores (scrubbers) y la ventilación; evacuar el módulo si hay humo o amoníaco y colocar mascarillas de O₂ al 100 %.', 'Check the scrubbers and ventilation; evacuate the module if there is smoke or ammonia and fit 100 % O₂ masks.');

export interface Ctx {
  crew: { id: string; s: Sample | null }[]; o2: number; co2: number; o2Level: Level; co2Level: Level;
  hot: { names: Bi[]; level: Level } | null; sans: { level: Level; octOn: boolean } | null; rad: { rate: Level; cum: Level } | null;
  lowStock: Bi[]; anomalies: { id: string; crew: string; title: Bi; sev: Level }[]; fatigue: { crew: string; type: string; score: number }[];
  incidents: { uid: string; prot: string; crew: string; resolved: boolean; follow: string | null; start: { spo2: number; temperature: number; heartRate: number }; title: Bi }[];
}

/** Cruza cada condición de alerta de la aplicación con su nivel NASA y su protocolo. Devuelve los avisos activos, del mayor al menor nivel. */
export function buildAdvisories(c: Ctx): Advisory[] {
  const out: Advisory[] = [];
  const open = c.incidents.filter(i => !i.resolved);

  for (const i of open) {
    const worse = i.prot === 'PROT-MED-02' || (i.prot === 'PROT-MED-01' && i.start.spo2 < 90) || (i.prot === 'PROT-MED-03' && i.start.temperature >= 39 && i.start.heartRate >= 130);
    out.push({ key: `${i.crew}:prot:${i.uid}`, level: worse ? 3 : 2, cat: CAT.prot, crew: i.crew, incident: i.uid, cmo: true,
      problem: mkBi(l => `${i.prot} · ${pickBi(i.title, l)}`), action: B('Abrir la lista de verificación y ejecutar los pasos en orden; confirmar las dosis desde el cartel del protocolo.', 'Open the checklist and run the steps in order; confirm the doses from the protocol notice.') });
  }
  for (const { id, s } of c.crew) {
    if (!s) continue;
    const covered = new Set(open.filter(i => i.crew === id).flatMap(i => COVERED[i.prot] ?? []));
    (Object.keys(VR) as VitalKey[]).forEach(k => {
      const lv = levelOf(k, s[k]);
      if (lv === 'green' || covered.has(k)) return;
      const dir = s[k] < THRESHOLDS[k].normal[0] ? 'low' : 'high', r = VR[k][dir]?.[lv === 'yellow' ? 'y' : 'r'];
      if (!r) return;
      out.push({ key: `${id}:vital:${k}`, level: r.l, cat: CAT.vital, crew: id, action: r.a,
        problem: mkBi(l => `${pickBi(r.t, l)} (${vitalLabel(k, l)} ${num(s[k], THRESHOLDS[k].decimals, l)} ${vitalUnit(k, l)})`) });
    });
  }
  // Cabina
  if (c.co2Level !== 'green') {
    const lvl: NLevel = c.co2 >= 5000 ? 3 : c.co2Level === 'red' ? 2 : 1;
    out.push({ key: 'cabin:co2', level: lvl, cat: CAT.cabin, action: lvl === 1 ? B('Verificar los depuradores (scrubbers) y la ventilación; mascarilla de O₂ si hay cefalea o mareo.', 'Check the scrubbers and ventilation; O₂ mask if there is headache or dizziness.') : CO2_ACT,
      problem: mkBi(l => `${lvl === 1 ? pickBi(B('CO₂ elevado (cefalea por CO₂)', 'Elevated CO₂ (CO₂ headache)'), l) : lvl === 2 ? pickBi(B('Hipercapnia: CO₂ crítico', 'Hypercapnia: critical CO₂'), l) : pickBi(B('Exposición tóxica severa por CO₂', 'Severe toxic exposure to CO₂'), l)} (CO₂ ${num(c.co2, 0, l)} ppm)`) });
  }
  if (c.o2Level !== 'green') {
    const low = c.o2 < 20, lvl: NLevel = low ? (c.o2Level === 'red' ? 3 : 2) : (c.o2Level === 'red' ? 2 : 1);
    out.push({ key: 'cabin:o2', level: lvl, cat: CAT.cabin,
      action: low ? (lvl === 3 ? B('Mascarillas de O₂ al 100 %, sellar el módulo afectado y comprobar la presión de la cabina (posible descompresión).', '100 % O₂ masks, seal the affected module and check cabin pressure (possible decompression).') : B('Verificar el generador de oxígeno y las posibles fugas; O₂ suplementario.', 'Check the oxygen generator and possible leaks; supplemental O₂.'))
        : B('Reducir el aporte de O₂, eliminar fuentes de ignición y ventilar.', 'Reduce the O₂ supply, remove ignition sources and ventilate.'),
      problem: mkBi(l => `${pickBi(low ? (lvl === 3 ? B('Atmósfera hipóxica', 'Hypoxic atmosphere') : B('Hipoxia moderada del ambiente (O₂ bajo)', 'Moderate ambient hypoxia (low O₂)')) : B('Atmósfera enriquecida en O₂ (riesgo de incendio)', 'O₂-enriched atmosphere (fire risk)'), l)} (O₂ ${num(c.o2, 1, l)} %)`) });
  }
  if (c.hot) out.push({ key: 'cabin:hot', level: c.hot.level === 'red' ? 2 : 1, cat: CAT.cabin, cmo: true,
    problem: mkBi(l => tf(l, 'Sobrecalentamiento: {1}.', 'Overheating: {1}.', c.hot!.names.map(x => pickBi(x, l)).join(', '))),
    action: B('Pasar los equipos afectados a espera o mantenimiento y revisar el control térmico; si es soporte vital, vigilar el O₂ y el CO₂; si es el refrigerador, verificar la degradación de los fármacos.', 'Move the affected equipment to standby or maintenance and check thermal control; if life support, monitor O₂ and CO₂; if the refrigerator, check drug degradation.') });
  // SANS
  if (c.sans && c.sans.level !== 'green') {
    const red = c.sans.level === 'red';
    out.push({ key: 'sans', level: red ? 3 : 2, cat: CAT.sans, cmo: true,
      problem: red ? B('SANS crítico: posible papiledema', 'Critical SANS: possible papilledema') : B('SANS moderado', 'Moderate SANS'),
      action: c.sans.octOn
        ? B('Sesión obligatoria del Mobile Gravity Suit (LBNP, 60 min), complejo B, ecografía ocular (ONSD) y escaneo OCT.', 'Mandatory Mobile Gravity Suit session (LBNP, 60 min), B complex, ocular ultrasound (ONSD) and OCT scan.')
        : B('Sesión obligatoria del Mobile Gravity Suit (LBNP, 60 min), complejo B y ecografía ocular (ONSD); el OCT no está disponible en este modo.', 'Mandatory Mobile Gravity Suit session (LBNP, 60 min), B complex and ocular ultrasound (ONSD); OCT is not available in this mode.') });
  }
  // Radiación
  if (c.rad && c.rad.rate !== 'green') out.push({ key: 'rad:rate', level: c.rad.rate === 'red' ? 2 : 1, cat: CAT.rad, cmo: c.rad.rate === 'red',
    problem: c.rad.rate === 'red' ? B('Tasa de radiación crítica', 'Critical radiation rate') : B('Tasa de radiación elevada', 'Elevated radiation rate'),
    action: B('Permanecer en el módulo con más blindaje, suspender la actividad extravehicular y vigilar los dosímetros.', 'Stay in the module with the most shielding, suspend extravehicular activity and monitor the dosimeters.') });
  if (c.rad && c.rad.cum !== 'green') out.push({ key: 'rad:cum', level: c.rad.cum === 'red' ? 2 : 1, cat: CAT.rad, cmo: true,
    problem: c.rad.cum === 'red' ? B('Dosis acumulada cerca del límite de carrera', 'Cumulative dose near the career limit') : B('Dosis acumulada elevada', 'Elevated cumulative dose'),
    action: B('Revisar el historial de dosis con el Flight Surgeon y limitar la exposición.', 'Review the dose history with the Flight Surgeon and limit exposure.') });
  // Farmacia, parche/ecografía y bienestar
  if (c.lowStock.length) out.push({ key: 'pharm', level: 1, cat: CAT.pharm, cmo: true,
    problem: mkBi(l => tf(l, 'Existencias críticas: {1}.', 'Critical supplies: {1}.', c.lowStock.map(x => pickBi(x, l)).join(', '))),
    action: B('Reabastecer o planificar la sustitución; los medicamentos sin existencias no se pueden administrar.', 'Resupply or plan a replacement; items with no stock cannot be administered.') });
  for (const a of c.anomalies) out.push({ key: `${a.crew}:clin:${a.id}`, level: a.sev === 'red' ? 2 : 1, cat: CAT.clin, crew: a.crew, cmo: true, problem: a.title,
    action: B('Repetir la medición con el parche o la ecografía y revisar la tendencia con el CMO.', 'Repeat the measurement with the patch or ultrasound and review the trend with the CMO.') });
  for (const f of c.fatigue) out.push({ key: `${f.crew}:well:${f.type}`, level: 1, cat: CAT.well, crew: f.crew,
    problem: mkBi(l => tf(l, 'Evaluación {1} baja: {2}/100.', '{1} assessment low: {2}/100.', pickBi(EVT[f.type], l), f.score)),
    action: B('Reducir la carga de trabajo, priorizar el descanso y el apoyo psicológico; repetir la evaluación en 24 h.', 'Reduce the workload, prioritize rest and psychological support; repeat the assessment in 24 h.') });

  // Nivel 4: cuadro no estabilizable (empeoramiento tras el protocolo o dos problemas de nivel 3 en el mismo tripulante).
  for (const { id } of c.crew) {
    const worsening = open.some(i => i.crew === id && i.follow === 'worsening'), multi = out.filter(a => a.crew === id && a.level === 3 && !a.incident).length >= 2;
    if (worsening || multi) out.push({ key: `${id}:evac`, level: 4, cat: CAT.evac, crew: id, cmo: true,
      problem: worsening ? B('El cuadro empeora tras la intervención: no estabilizable a bordo', 'The condition worsens after the intervention: not stabilizable onboard') : B('Varios problemas de nivel 3 simultáneos: no estabilizable a bordo', 'Several simultaneous level 3 problems: not stabilizable onboard'),
      action: B('Preparar la MedEvac: desacoplar la cápsula (Crew Dragon / Soyuz) y retornar a la Tierra, manteniendo el soporte vital y la RCP hasta el desacople.', 'Prepare MedEvac: undock the capsule (Crew Dragon / Soyuz) and return to Earth, maintaining life support and CPR until undocking.') });
  }
  return out.sort((a, b) => b.level - a.level);
}
