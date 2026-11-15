import { useEffect, useRef } from 'react';
import { usePersisted } from './usePersisted';
import type { useAstronautTelemetry } from './useAstronautTelemetry';
import { CREW } from '../lib/crew';
import type { DoseOv, Msg } from '../lib/comms';
import { SEED_EVENTS, type EventKind, type EventSource, type MedEvent } from '../lib/history';
import { localeOf, mkBi, pickBi, tf, vitalLabel, vitalUnit, type Bi, type Lang } from '../lib/i18n';
import { DEFAULT_DOSE, initialStock, MEDS, suggest, type MedId } from '../lib/meds';
import { THRESHOLDS } from '../lib/thresholds';
import type { Alert, Level } from '../types/telemetry';

type Telemetry = ReturnType<typeof useAstronautTelemetry>;

const unitOf = (a: Alert) => THRESHOLDS[a.key];
const colon = (l: Lang) => (l === 'fr' ? '\u00a0: ' : ': ');
/** Texto de una alerta en todos los idiomas. */
export const alertBi = (a: Alert): Bi => {
  const th = unitOf(a), v = a.value ?? 0;
  return mkBi(l => `${vitalLabel(a.key, l)}${colon(l)}${v.toLocaleString(localeOf(l), { minimumFractionDigits: th.decimals, maximumFractionDigits: th.decimals })} ${vitalUnit(a.key, l)}`);
};

/**
 * Perfiles, historial, recomendaciones e inventario. El historial es EXCLUSIVAMENTE clínico:
 * alertas de signos vitales, anomalías clínicas del parche y la ecografía, consultas y medicación.
 * Los problemas de red, señal o latencia no se registran.
 */
export function useMedicalState(tels: Telemetry[], active: number) {
  const [events, setEvents] = usePersisted<MedEvent[]>('astro.events.v2', SEED_EVENTS);
  const [stock, setStock] = usePersisted<Record<MedId, number>>('astro.stock.v1', initialStock());
  const [messages, setMessages] = usePersisted<Msg[]>('astro.msgs.v1', [], true);
  const [doseOv, setDoseOv] = usePersisted<Partial<Record<MedId, DoseOv>>>('astro.dose.v1', {}, true);
  const seen = useRef(new Set<string>());

  /** Dosis vigente: la fijada por el operador o, si no hay, la predeterminada. */
  const dosage = (id: MedId | undefined, def: Bi): Bi => { const o = id ? doseOv[id] : undefined; return o ? mkBi(() => o.text) : def; };
  const sendMessage = (m: { from: Msg['from']; to: string; text: string; urgent: boolean }) => {
    const s = m.text.trim(); if (!s) return;
    setMessages(a => [{ id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, t: Date.now(), from: m.from, to: m.to, text: mkBi(() => s), urgent: m.urgent, ack: [] }, ...a].slice(0, 100));
  };

  const push = (x: { astronautId?: string; kind: EventKind; source: EventSource; severity: Level | 'info'; title: Bi; detail: Bi }) =>
    setEvents(ev => [{ ...x, astronautId: x.astronautId ?? CREW[active].id, id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, t: Date.now() }, ...ev].slice(0, 400));

  // Registro automático: solo alertas clínicas de signos vitales de cada tripulante.
  useEffect(() => {
    const add: MedEvent[] = [];
    tels.forEach((tel, i) => {
      for (const a of tel.alerts) {
        const eid = `al-${CREW[i].id}-${a.id}`;
        if (seen.current.has(eid)) continue;
        seen.current.add(eid);
        add.push({ id: eid, astronautId: CREW[i].id, t: a.t, kind: 'alert', source: 'telemetría', severity: a.level,
          title: mkBi(l => a.level === 'red' ? tf(l, 'Alerta crítica: {1}', 'Critical alert: {1}', vitalLabel(a.key, l)) : tf(l, 'Alerta de precaución: {1}', 'Caution alert: {1}', vitalLabel(a.key, l))), detail: alertBi(a) });
      }
    });
    if (add.length) setEvents(e => [...add, ...e].slice(0, 400));
  }, [tels, setEvents]);

  const suggestFor = (a: Alert) => (a.value === undefined ? null : suggest(a.key, a.value, a.level));

  /** Valida la sugerencia: descuenta 1 unidad de las existencias, lo registra en el historial y cierra la alerta. */
  const confirm = (a: Alert, by: 'astronauta' | 'operador') => {
    const s = suggestFor(a);
    if (!s) return;
    const def = s.medId ? MEDS.find(m => m.id === s.medId) : undefined;
    if (def && (stock[def.id] ?? 0) <= 0) return;
    if (def) setStock(st => ({ ...st, [def.id]: Math.max(0, (st[def.id] ?? 0) - 1) }));
    const al = alertBi(a);
    push({ kind: def ? 'medication' : 'action', source: by, severity: 'info',
      title: mkBi(l => def ? tf(l, '{1}: dosis administrada', '{1}: dose administered', pickBi(def.name, l)) : tf(l, 'Acción realizada: {1}', 'Action taken: {1}', pickBi(s.title, l))),
      detail: mkBi(l => {
        const dose = s.dose ? tf(l, ' Dosis: {1}.', ' Dose: {1}.', pickBi(dosage(s.medId, s.dose), l)) : '';
        return by === 'operador'
          ? tf(l, '{1}{2} Confirmado por el operador. Motivo: {3}.', '{1}{2} Confirmed by the operator. Reason: {3}.', pickBi(s.action, l), dose, pickBi(al, l))
          : tf(l, '{1}{2} Confirmado por el astronauta. Motivo: {3}.', '{1}{2} Confirmed by the astronaut. Reason: {3}.', pickBi(s.action, l), dose, pickBi(al, l));
      }) });
    tels[active].ackAlert(a.id);
  };

  return {
    crew: CREW, active, tels, events, stock, suggestFor, confirm,
    levels: Object.fromEntries(CREW.map((c, i) => [c.id, tels[i].overall])) as Record<string, Level>,
    openAlerts: tels[active].alerts.filter(a => !a.ack),
    dismiss: (a: Alert) => tels[active].ackAlert(a.id),
    resupply: (id: MedId, n = 5) => setStock(st => ({ ...st, [id]: (st[id] ?? 0) + n })),
    addConsult: (text: string) => { if (text.trim()) push({ kind: 'consult', source: 'operador', severity: 'info', title: { es: 'Consulta registrada', en: 'Consultation recorded' }, detail: { es: text.trim(), en: text.trim() } }); },
    /** Anomalía clínica detectada por el parche bioquímico o la ecografía. */
    logClinical: (source: 'parche' | 'ecografía', severity: Level, title: Bi, detail: Bi) => push({ kind: 'anomaly', source, severity, title, detail }),
    /** Registro directo en el historial médico (protocolos de emergencia). */
    logEvent: push,
    /** Administra una dosis durante una emergencia: descuenta 1 unidad y lo registra en el historial. */
    dispense: (medId: MedId, by: 'astronauta' | 'médico' | 'operador', crewId: string, dose: Bi, reason: Bi) => {
      const def = MEDS.find(m => m.id === medId);
      if (!def || (stock[medId] ?? 0) <= 0) return false;
      setStock(st => ({ ...st, [medId]: Math.max(0, (st[medId] ?? 0) - 1) }));
      push({ astronautId: crewId, kind: 'medication', source: by, severity: 'info',
        title: mkBi(l => tf(l, '{1}: dosis administrada', '{1}: dose administered', pickBi(def.name, l))),
        detail: mkBi(l => tf(l, 'Dosis: {1}. Motivo: {2}.', 'Dose: {1}. Reason: {2}.', pickBi(dose, l), pickBi(reason, l))) });
      return true;
    },
    messages, doseOv, dosage, sendMessage, defaultDose: (id: MedId) => DEFAULT_DOSE[id],
    ackMessage: (id: string, crewId: string) => setMessages(a => a.map(m => (m.id === id && !m.ack.includes(crewId) ? { ...m, ack: [...m.ack, crewId] } : m))),
    /** El operador fija (o restablece, con texto vacío) la dosis de un medicamento y la tripulación recibe un aviso automático. */
    setDose: (id: MedId, text: string | null, from: Msg['from']) => {
      const s = text?.trim() ?? '', def = MEDS.find(m => m.id === id)!;
      setDoseOv(o => { const n = { ...o }; if (s) n[id] = { text: s, t: Date.now() }; else delete n[id]; return n; });
      setMessages(a => [{ id: `msg-${Date.now()}-${id}`, t: Date.now(), from, to: 'all', urgent: false, ack: [], auto: true,
        text: mkBi(l => s ? tf(l, 'Dosis actualizada: {1}. Nueva indicación: {2}.', 'Dose updated: {1}. New instruction: {2}.', pickBi(def.name, l), s) : tf(l, 'Dosis restablecida a la indicación predeterminada: {1}.', 'Dose reset to the default instruction: {1}.', pickBi(def.name, l))) }, ...a].slice(0, 100));
    },
    resetDemo: () => { setEvents(SEED_EVENTS); setStock(initialStock()); },
  };
}
