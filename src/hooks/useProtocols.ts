import { useEffect, useRef } from 'react';
import { usePersisted } from './usePersisted';
import type { useAstronautTelemetry } from './useAstronautTelemetry';
import type { Medical } from '../context/MedicalContext';
import { CREW } from '../lib/crew';
import { mkBi, pickBi, tf, type Bi } from '../lib/i18n';
import { MEDS, type MedId } from '../lib/meds';
import { detect, patchOf, protOf, SEV_KEYS, vitalsOf, type Follow, type Patch, type ProtId, FOLLOW } from '../lib/protocols';
import { levelOf, RANK } from '../lib/thresholds';
import type { Sample } from '../types/telemetry';

type Telemetry = ReturnType<typeof useAstronautTelemetry>;
export type Actor = 'cmo' | 'astronaut' | 'operator';
export interface Incident {
  uid: string; prot: ProtId; crew: string; t: number; checks: boolean[]; doses: MedId[]; follow: Follow | null;
  resolved: boolean; resolvedT: number | null; minimized: boolean; muted: boolean; sev0: number;
  start: { vitals: ReturnType<typeof vitalsOf>; patch: Patch };
}
export type LogKind = 'auto' | 'manual' | 'dose' | 'comm' | 'follow';
export interface LogEntry { id: string; t: number; crew: string; uid?: string; kind: LogKind; by: Actor | 'system'; text: Bi }
export interface Tx { id: string; t: number; crew: string; uid?: string; status: 'sent' | 'queued'; records: number }
export type EvalType = 'physical' | 'psych' | 'cognitive';
export interface Evaluation { id: string; t: number; crew: string; type: EvalType; test: string; score: number; notes: string; by: Actor }

export const severity = (s: Sample) => SEV_KEYS.reduce((a, k) => a + RANK[levelOf(k, s[k])], 0);
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const BY_SRC = { cmo: 'médico', astronaut: 'astronauta', operator: 'operador' } as const;

/**
 * Motor de protocolos de emergencia: detecta conjuntos de anomalías en la telemetría y el parche,
 * abre un incidente con lista de verificación y mantiene la bitácora, las transmisiones, los seguimientos y las evaluaciones.
 */
export function useProtocols(tels: Telemetry[], active: number, actor: Actor, med: Medical) {
  const [incidents, setIncidents] = usePersisted<Incident[]>('astro.incidents.v1', []);
  const [log, setLog] = usePersisted<LogEntry[]>('astro.interv.v1', []);
  const [tx, setTx] = usePersisted<Tx[]>('astro.tx.v1', []);
  const [evals, setEvals] = usePersisted<Evaluation[]>('astro.evals.v1', []);
  const hits = useRef(new Map<string, number>()), cool = useRef(new Map<string, number>());
  const incRef = useRef(incidents); incRef.current = incidents;

  const addLog = (crew: string, kind: LogKind, by: LogEntry['by'], text: Bi, u?: string) =>
    setLog(l => [{ id: `lg-${uid()}`, t: Date.now(), crew, uid: u, kind, by, text }, ...l].slice(0, 500));
  const patch = (u: string, f: (i: Incident) => Incident) => setIncidents(a => a.map(i => (i.uid === u ? f(i) : i)));

  // Detección: un conjunto debe mantenerse en 2 muestras consecutivas; tras cerrar un protocolo hay 60 s de espera.
  const sig = tels.map(x => x.latest?.t ?? 0).join();
  useEffect(() => {
    tels.forEach((tel, i) => {
      const s = tel.latest; if (!s) return;
      const hr = tel.history.slice(-6).map(h => h.heartRate), m = hr.reduce((a, b) => a + b, 0) / hr.length;
      const sd = hr.length > 3 ? Math.sqrt(hr.reduce((a, b) => a + (b - m) ** 2, 0) / hr.length) : 0;
      const now = detect(s, sd), cid = CREW[i].id;
      for (const id of ['PROT-MED-01', 'PROT-MED-02', 'PROT-MED-03'] as ProtId[]) {
        const key = `${cid}:${id}`;
        if (!now.includes(id)) { hits.current.set(key, 0); continue; }
        const n = (hits.current.get(key) ?? 0) + 1; hits.current.set(key, n);
        if (n < 2 || incRef.current.some(x => x.crew === cid && x.prot === id && !x.resolved) || Date.now() - (cool.current.get(key) ?? 0) < 60_000) continue;
        const p = protOf(id), inc: Incident = { uid: `inc-${uid()}`, prot: id, crew: cid, t: Date.now(), checks: p.steps.map(() => false), doses: [], follow: null,
          resolved: false, resolvedT: null, minimized: false, muted: false, sev0: severity(s), start: { vitals: vitalsOf(s), patch: patchOf(s) } };
        incRef.current = [inc, ...incRef.current];
        setIncidents(a => [inc, ...a].slice(0, 60));
        addLog(cid, 'auto', 'system', mkBi(l => tf(l, '{1} activado automáticamente: {2}.', '{1} automatically activated: {2}.', id, pickBi(p.title, l))), inc.uid);
        med.logEvent({ astronautId: cid, kind: 'alert', source: 'telemetría', severity: 'red',
          title: mkBi(l => tf(l, '{1} activado: {2}', '{1} activated: {2}', id, pickBi(p.title, l))), detail: mkBi(l => pickBi(p.trigger, l)) });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  // Los paquetes en cola salen al restablecerse el enlace.
  useEffect(() => {
    tx.filter(x => x.status === 'queued').forEach(x => {
      const idx = CREW.findIndex(c => c.id === x.crew);
      if (idx >= 0 && tels[idx].link.mode === 'synced') {
        setTx(a => a.map(y => (y.id === x.id ? { ...y, status: 'sent' } : y)));
        addLog(x.crew, 'comm', 'system', { es: 'Enlace restablecido: el paquete en cola se transmitió al equipo médico terrestre.', en: 'Link restored: the queued package was transmitted to the ground medical team.' }, x.uid);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, tx]);

  const crewIdx = (id: string) => Math.max(0, CREW.findIndex(c => c.id === id));
  const find = (u: string) => incRef.current.find(i => i.uid === u);

  return {
    incidents, log, tx, evals, actor,
    visible: incidents.filter(i => actor !== 'astronaut' || i.crew === CREW[active].id),
    addLog,
    toggleStep: (u: string, k: number) => {
      const inc = find(u); if (!inc) return;
      const on = !inc.checks[k], p = protOf(inc.prot);
      patch(u, i => ({ ...i, checks: i.checks.map((c, j) => (j === k ? on : c)) }));
      addLog(inc.crew, 'auto', actor, mkBi(l => on ? tf(l, 'Paso {1} completado: {2}', 'Step {1} completed: {2}', k + 1, pickBi(p.steps[k], l)) : tf(l, 'Paso {1} desmarcado: {2}', 'Step {1} unchecked: {2}', k + 1, pickBi(p.steps[k], l))), u);
    },
    confirmDose: (u: string, medId: MedId) => {
      const inc = find(u); if (!inc) return;
      const p = protOf(inc.prot), d = p.doses.find(x => x.medId === medId)!;
      if (!med.dispense(medId, BY_SRC[actor], inc.crew, med.dosage(medId, d.dose), mkBi(l => `${inc.prot} · ${pickBi(p.title, l)}`))) return;
      patch(u, i => ({ ...i, doses: [...i.doses, medId] }));
      addLog(inc.crew, 'dose', actor, mkBi(l => tf(l, 'Dosis confirmada: {1} ({2}).', 'Dose confirmed: {1} ({2}).', pickBi(MEDS.find(m => m.id === medId)!.name, l), pickBi(med.dosage(medId, d.dose), l))), u);
    },
    setFollow: (u: string, f: Follow) => {
      const inc = find(u); if (!inc) return;
      patch(u, i => ({ ...i, follow: f }));
      addLog(inc.crew, 'follow', actor, mkBi(l => tf(l, 'Seguimiento registrado: {1}.', 'Follow-up recorded: {1}.', pickBi(FOLLOW[f].label, l))), u);
    },
    resolve: (u: string) => {
      const inc = find(u); if (!inc) return;
      cool.current.set(`${inc.crew}:${inc.prot}`, Date.now());
      patch(u, i => ({ ...i, resolved: true, resolvedT: Date.now(), minimized: true }));
      addLog(inc.crew, 'auto', actor, mkBi(l => tf(l, '{1} cerrado.', '{1} closed.', inc.prot)), u);
    },
    setMinimized: (u: string, v: boolean) => patch(u, i => ({ ...i, minimized: v })),
    mute: (u: string) => patch(u, i => ({ ...i, muted: true })),
    addNote: (crew: string, text: string, u?: string) => { const s = text.trim(); if (s) addLog(crew, 'manual', actor, { es: s, en: s }, u); },
    addEval: (e: Omit<Evaluation, 'id' | 't' | 'by'>) => setEvals(a => [{ ...e, id: `ev-${uid()}`, t: Date.now(), by: actor }, ...a].slice(0, 300)),
    /** Genera el paquete clínico (siempre en español, idioma de la bitácora de origen) y lo transmite o lo deja en cola. */
    buildPackage: (crew: string, u?: string) => {
      const c = CREW.find(x => x.id === crew)!, i = crewIdx(crew), s = tels[i].latest, inc = u ? find(u) : undefined;
      return {
        sistema: 'MOGA', generadoUTC: new Date().toISOString(),
        tripulante: { id: c.id, nombre: c.name.es, funcion: c.role.es, edad: c.age, sexo: c.sex, grupoSanguineo: c.blood, alergias: c.allergies.es },
        signosVitales: s ? vitalsOf(s) : null, parche: s ? patchOf(s) : null,
        protocolo: inc ? { id: inc.prot, titulo: protOf(inc.prot).title.es, activadoUTC: new Date(inc.t).toISOString(), pasosCompletados: inc.checks.filter(Boolean).length, pasosTotales: inc.checks.length, dosis: inc.doses, seguimiento: inc.follow } : null,
        intervenciones: log.filter(x => x.crew === crew && (!u || x.uid === u)).map(x => ({ utc: new Date(x.t).toISOString(), por: x.by, texto: x.text.es })),
      };
    },
    transmit: (crew: string, u?: string) => {
      const i = crewIdx(crew), queued = tels[i].link.mode === 'delayed', n = log.filter(x => x.crew === crew && (!u || x.uid === u)).length + 1;
      setTx(a => [{ id: `tx-${uid()}`, t: Date.now(), crew, uid: u, status: (queued ? 'queued' : 'sent') as Tx['status'], records: n }, ...a].slice(0, 100));
      addLog(crew, 'comm', actor, queued
        ? { es: 'Paquete clínico en cola: el enlace con Tierra está interrumpido y se enviará al restablecerse.', en: 'Clinical package queued: the link to Earth is interrupted and it will be sent once restored.' }
        : { es: 'Paquete clínico transmitido al equipo médico terrestre.', en: 'Clinical package transmitted to the ground medical team.' }, u);
    },
  };
}
export type Protocols = ReturnType<typeof useProtocols>;
