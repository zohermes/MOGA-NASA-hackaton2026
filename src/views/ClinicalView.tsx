import { useState } from 'react';
import { AlertCard } from '../components/AlertCard';
import VitalCard from '../components/VitalCard';
import ViewHeader, { btnCls } from '../components/ViewHeader';
import HistoryView from './HistoryView';
import { useMedical } from '../context/MedicalContext';
import type { useAstronautTelemetry } from '../hooks/useAstronautTelemetry';
import { severity, type EvalType, type Incident, type Protocols } from '../hooks/useProtocols';
import { CREW } from '../lib/crew';
import { fmt } from '../lib/clinical';
import { fmtDT } from '../lib/history';
import { useI18n, type Bi } from '../lib/i18n';
import { MEDS, stockLevel } from '../lib/meds';
import { FOLLOW, PATCH_PARAMS, patchLevel, patchOf, PROTOCOLS, protOf, SEV_KEYS, type Follow } from '../lib/protocols';
import { LEVEL_UI, levelOf, THRESHOLDS, worst } from '../lib/thresholds';
import type { Level } from '../types/telemetry';

type Telemetry = ReturnType<typeof useAstronautTelemetry>;
type Sec = 'file' | 'monitor' | 'evals' | 'alerts' | 'protocols' | 'log' | 'comm' | 'follow';
interface Props { tels: Telemetry[]; active: number; P: Protocols; role: 'astronaut' | 'operator' | 'cmo'; onOpen: (u: string) => void }
const B = (es: string, en: string): Bi => ({ es, en });
const SECS: [Sec, string, string][] = [
  ['file', 'Ficha médica', 'Medical file'], ['monitor', 'Monitoreo', 'Monitoring'], ['evals', 'Evaluaciones', 'Assessments'], ['alerts', 'Alertas', 'Alerts'],
  ['protocols', 'Protocolos médicos', 'Medical protocols'], ['log', 'Registro de intervenciones', 'Intervention log'], ['comm', 'Comunicación', 'Communication'], ['follow', 'Seguimiento', 'Follow-up'],
];
const panel = 'rounded-lg border border-line bg-panel p-4';
const EVAL: Record<EvalType, { label: Bi; tests: Bi[] }> = {
  physical: { label: B('Física', 'Physical'), tests: [B('Fuerza de prensión manual', 'Handgrip strength'), B('Prueba en cicloergómetro', 'Cycle ergometer test'), B('Equilibrio y coordinación', 'Balance and coordination')] },
  psych: { label: B('Psicológica', 'Psychological'), tests: [B('Escala de estado de ánimo', 'Mood scale'), B('Calidad del sueño', 'Sleep quality'), B('Estrés percibido', 'Perceived stress')] },
  cognitive: { label: B('Cognitiva', 'Cognitive'), tests: [B('Tiempo de reacción (vigilancia psicomotora)', 'Reaction time (psychomotor vigilance)'), B('Memoria de trabajo', 'Working memory'), B('Atención sostenida', 'Sustained attention')] },
};
const evLevel = (s: number): Level => (s >= 80 ? 'green' : s >= 60 ? 'yellow' : 'red');
const BY: Record<string, Bi> = { cmo: B('CMO', 'CMO'), astronaut: B('Astronauta', 'Astronaut'), operator: B('Operador', 'Operator'), system: B('Sistema', 'System') };
const KIND: Record<string, Bi> = { auto: B('Automático', 'Automatic'), manual: B('Manual', 'Manual'), dose: B('Dosis', 'Dose'), comm: B('Comunicación', 'Communication'), follow: B('Seguimiento', 'Follow-up') };

/** Panel clínico: articula ficha, monitoreo, evaluaciones, alertas, protocolos, intervenciones, comunicación y seguimiento. */
export default function ClinicalView({ tels, active, P, role, onOpen }: Props) {
  const { t, b, n, col, lang, vital, unit, lv } = useI18n(), med = useMedical();
  const [sec, setSec] = useState<Sec>('file');
  const [type, setType] = useState<EvalType>('physical'), [test, setTest] = useState(0), [score, setScore] = useState(80), [notes, setNotes] = useState('');
  const [note, setNote] = useState('');
  if (!med) return null;
  const c = CREW[active], tel = tels[active], s = tel.latest, patch = s ? patchOf(s) : null;
  const mine = P.incidents.filter(i => i.crew === c.id), open = mine.filter(i => !i.resolved);
  const lvl = worst(tel.overall, open.length ? 'red' : 'green');
  const logs = P.log.filter(x => x.crew === c.id), openAlerts = tel.alerts.filter(a => !a.ack);
  const incLabel = (i: Incident) => `${i.prot} · ${b(protOf(i.prot).title)}`;
  const link = tel.link.mode === 'synced';

  const body = {
    file: (
      <div className="space-y-3">
        <section className={`${panel} grid gap-3 sm:grid-cols-4`}>
          {([[t('Función', 'Role'), b(c.role)], [t('Edad y sexo', 'Age and sex'), `${c.age} ${t('años', 'years')} · ${c.sex === 'M' ? t('Hombre', 'Male') : t('Mujer', 'Female')}`], [t('Grupo sanguíneo', 'Blood type'), c.blood], [t('Alergias', 'Allergies'), b(c.allergies)]] as [string, string][]).map(([a, v]) =>
            <div key={a}><p className="text-xs text-dim">{a}</p><p className="font-semibold">{v}</p></div>)}
        </section>
        <HistoryView />
      </div>),
    monitor: (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SEV_KEYS.map(k => s && <VitalCard key={k} label={vital(k)} value={fmt(s[k], THRESHOLDS[k].decimals, lang)} unit={unit(k)} level={levelOf(k, s[k])} range={`${fmt(THRESHOLDS[k].normal[0], THRESHOLDS[k].decimals, lang)}–${fmt(THRESHOLDS[k].normal[1], THRESHOLDS[k].decimals, lang)}`} />)}
        </div>
        <h3 className="text-sm font-semibold">{t('Parche bioquímico', 'Biochemical patch')}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {patch && PATCH_PARAMS.map(p => <VitalCard key={p.id} label={b(p.label)} value={fmt(patch[p.id], p.decimals, lang)} unit={p.unit} level={patchLevel(p.id, patch[p.id])} range={`${fmt(p.normal[0], p.decimals, lang)}–${fmt(p.normal[1], p.decimals, lang)}`} />)}
        </div>
        <p className="text-xs text-dim">{t('Las mediciones del parche son simuladas a partir del estado hemodinámico (modelo ilustrativo).', 'Patch measurements are simulated from the hemodynamic state (illustrative model).')}</p>
      </div>),
    evals: (
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <section className={`${panel} space-y-3`}>
          <h3 className="text-sm font-semibold">{t('Registrar una evaluación', 'Record an assessment')}{col} {b(c.name)}</h3>
          <div className="flex overflow-hidden rounded border border-line" role="group" aria-label={t('Tipo de evaluación', 'Assessment type')}>
            {(Object.keys(EVAL) as EvalType[]).map(k => <button key={k} aria-pressed={type === k} onClick={() => { setType(k); setTest(0); }} className={`flex-1 px-2 py-1.5 text-sm ${type === k ? 'bg-info font-semibold text-ink' : 'bg-raised text-dim'}`}>{b(EVAL[k].label)}</button>)}
          </div>
          <label className="block text-sm">{t('Prueba', 'Test')}
            <select value={test} onChange={e => setTest(+e.target.value)} className="mt-1 w-full rounded border border-line bg-ink/60 px-2 py-1.5 text-sm">{EVAL[type].tests.map((x, i) => <option key={x.en} value={i}>{b(x)}</option>)}</select></label>
          <label className="block text-sm"><span className="flex justify-between"><span>{t('Resultado (0 a 100)', 'Score (0 to 100)')}</span><b className={LEVEL_UI[evLevel(score)].text}>{score}</b></span>
            <input type="range" min={0} max={100} value={score} onChange={e => setScore(+e.target.value)} className="mt-1 w-full accent-info" /></label>
          <label className="block text-sm">{t('Observaciones', 'Notes')}
            <input value={notes} onChange={e => setNotes(e.target.value)} maxLength={140} className="mt-1 w-full rounded border border-line bg-ink/60 px-2 py-1.5 text-sm" /></label>
          <button className={btnCls} onClick={() => { P.addEval({ crew: c.id, type, test: EVAL[type].tests[test].es, score, notes: notes.trim() }); setNotes(''); }}>{t('Guardar evaluación', 'Save assessment')}</button>
          <p className="text-xs text-dim">{t('Verde: 80 o más · amarillo: 60 a 79 · rojo: menos de 60.', 'Green: 80 or more · yellow: 60 to 79 · red: below 60.')}</p>
        </section>
        <section className={panel}>
          <h3 className="text-sm font-semibold">{t('Evaluaciones registradas', 'Recorded assessments')}</h3>
          {(() => {
            const rows = P.evals.filter(e => e.crew === c.id);
            return rows.length === 0 ? <p className="mt-2 text-sm text-dim">{t('Aún no hay evaluaciones de este tripulante.', 'There are no assessments for this crew member yet.')}</p> : (
              <ul className="mt-2 max-h-96 space-y-1.5 overflow-y-auto">
                {rows.map(e => { const L = evLevel(e.score), tt = EVAL[e.type].tests.find(x => x.es === e.test);
                  return <li key={e.id} className={`rounded border-l-4 bg-white/[0.03] p-2 text-sm ${LEVEL_UI[L].border}`}>
                    <p className="flex flex-wrap gap-x-2 text-xs text-dim"><span className="font-mono">{fmtDT(e.t, lang)}</span><span>{b(EVAL[e.type].label)}</span><span>{b(BY[e.by])}</span></p>
                    <p><b>{tt ? b(tt) : e.test}</b> · <b className={LEVEL_UI[L].text}>{e.score}/100</b></p>{e.notes && <p className="text-xs text-dim">{e.notes}</p>}</li>; })}
              </ul>);
          })()}
        </section>
      </div>),
    alerts: (
      <section className={panel}>
        <h3 className="text-sm font-semibold">{t('Alertas abiertas', 'Open alerts')}{col} {b(c.name)}</h3>
        {openAlerts.length === 0 ? <p className="mt-2 text-sm text-ok">{t('Sin alertas abiertas.', 'No open alerts.')}</p> :
          <ul className="mt-2 max-h-[28rem] space-y-2 overflow-y-auto">{openAlerts.slice(0, 10).map(a => <AlertCard key={a.id} alert={a} by={role === 'astronaut' ? 'astronauta' : 'operador'} onAck={() => tel.ackAlert(a.id)} />)}</ul>}
        {open.length > 0 && <p role="alert" className="mt-3 rounded border border-crit bg-crit/10 p-2 text-sm text-crit">{t('Protocolo de emergencia activo', 'Emergency protocol active')}{col} {open.map(incLabel).join(' · ')}</p>}
      </section>),
    protocols: (
      <div className="space-y-3">
        {open.length > 0 && <section className={`${panel} border-crit`}><h3 className="text-sm font-semibold text-crit">{t('Protocolos activos', 'Active protocols')}</h3>
          <ul className="mt-2 space-y-1.5">{open.map(i => <li key={i.uid} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{incLabel(i)} <span className="text-xs text-dim">· {i.checks.filter(Boolean).length}/{i.checks.length}</span></span><button className={btnCls} onClick={() => onOpen(i.uid)}>{t('Abrir', 'Open')}</button></li>)}</ul></section>}
        <div className="grid gap-3 lg:grid-cols-3">
          {PROTOCOLS.map(p => (
            <section key={p.id} className={panel}>
              <p className="font-mono text-xs text-info">{p.id}</p><h3 className="font-semibold">{b(p.title)}</h3>
              <p className="mt-1 text-xs text-dim">{b(p.trigger)}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">{p.steps.map((x, k) => <li key={k}>{b(x)}</li>)}</ol>
              {role !== 'astronaut' && <button className={`${btnCls} mt-3 text-xs`} onClick={() => tel.injectScenario(p.scenario)}>{t('Simular el cuadro clínico', 'Simulate the clinical picture')}</button>}
            </section>))}
        </div>
        {role !== 'astronaut' && <p className="text-xs text-dim">{t('La simulación desvía varios signos vitales a la vez; el motor detecta el conjunto de anomalías y abre el protocolo de forma automática. Protocolos ilustrativos: requieren validación médica.', 'The simulation shifts several vital signs at once; the engine detects the anomaly cluster and opens the protocol automatically. Illustrative protocols: they require medical validation.')}</p>}
      </div>),
    log: (
      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <section className={panel}>
          <h3 className="text-sm font-semibold">{t('Bitácora de intervenciones', 'Intervention log')}{col} {b(c.name)}</h3>
          <form className="mt-2 flex gap-2" onSubmit={e => { e.preventDefault(); P.addNote(c.id, note); setNote(''); }}>
            <input value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder={t('Anotación manual', 'Manual entry')} aria-label={t('Anotación manual', 'Manual entry')} className="min-w-0 flex-1 rounded border border-line bg-ink/60 px-2 py-1.5 text-sm" />
            <button className={btnCls} type="submit">{t('Añadir', 'Add')}</button></form>
          {logs.length === 0 ? <p className="mt-3 text-sm text-dim">{t('Sin intervenciones registradas.', 'No interventions recorded.')}</p> : (
            <ol className="mt-3 max-h-[26rem] space-y-1.5 overflow-y-auto">
              {logs.map(x => <li key={x.id} className="rounded border-l-4 border-info/50 bg-white/[0.03] p-2 text-sm">
                <p className="flex flex-wrap gap-x-2 text-xs text-dim"><span className="font-mono">{fmtDT(x.t, lang)}</span><span>{b(KIND[x.kind])}</span><span>{b(BY[x.by])}</span></p><p>{b(x.text)}</p></li>)}
            </ol>)}
        </section>
        <section className={panel}>
          <h3 className="text-sm font-semibold">{t('Existencias', 'Supplies')}</h3>
          <ul className="mt-2 space-y-1 text-sm">{MEDS.map(m => <li key={m.id} className="flex justify-between"><span className="text-dim">{b(m.name)}</span><b className={LEVEL_UI[stockLevel(med.stock[m.id] ?? 0, m)].text}>{med.stock[m.id] ?? 0}</b></li>)}</ul>
        </section>
      </div>),
    comm: (
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`${panel} space-y-3`}>
          <h3 className="text-sm font-semibold">{t('Transmisión al equipo médico terrestre', 'Transmission to the ground medical team')}</h3>
          <p className={`text-sm ${link ? 'text-ok' : 'text-warn'}`}>{t('Enlace con Tierra', 'Link to Earth')}{col} <b>{link ? t('sincronizado', 'synced') : t('interrumpido (los paquetes quedan en cola)', 'interrupted (packages are queued)')}</b></p>
          <p className="text-xs text-dim">{t('El paquete incluye ficha, signos vitales, parche, protocolo, pasos completados, dosis e intervenciones.', 'The package includes file, vital signs, patch, protocol, completed steps, doses and interventions.')}</p>
          <div className="flex flex-wrap gap-2">
            <button className={btnCls} onClick={() => P.transmit(c.id, open[0]?.uid)}>{open[0] ? `${t('Transmitir a Tierra', 'Transmit to Earth')} · ${open[0].prot}` : t('Transmitir estado a Tierra', 'Transmit status to Earth')}</button>
            <button className={btnCls} onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(P.buildPackage(c.id, open[0]?.uid), null, 2)], { type: 'application/json' })); a.download = `moga-${c.id}.json`; a.click(); URL.revokeObjectURL(a.href); }}>{t('Descargar paquete (JSON)', 'Download package (JSON)')}</button>
          </div>
        </section>
        <section className={panel}>
          <h3 className="text-sm font-semibold">{t('Transmisiones', 'Transmissions')}</h3>
          {P.tx.filter(x => x.crew === c.id).length === 0 ? <p className="mt-2 text-sm text-dim">{t('Aún no se transmitió ningún paquete.', 'No package has been transmitted yet.')}</p> : (
            <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto text-sm">{P.tx.filter(x => x.crew === c.id).map(x => <li key={x.id} className="flex flex-wrap justify-between gap-2 rounded bg-white/[0.03] p-2"><span className="font-mono text-xs text-dim">{fmtDT(x.t, lang)}</span><span>{x.uid ? P.incidents.find(i => i.uid === x.uid)?.prot : t('Estado general', 'General status')} · {n(x.records)} {t('registros', 'records')}</span><b className={x.status === 'sent' ? 'text-ok' : 'text-warn'}>{x.status === 'sent' ? t('Enviado', 'Sent') : t('En cola', 'Queued')}</b></li>)}</ul>)}
        </section>
      </div>),
    follow: (
      <div className="space-y-3">
        {mine.length === 0 ? <p className={`${panel} text-sm text-dim`}>{t('Sin protocolos que seguir. La evolución se registra después de una intervención.', 'No protocols to follow. Evolution is recorded after an intervention.')}</p> : mine.map(i => {
          const now = s ? severity(s) : i.sev0, d = i.sev0 - now, sugg: Follow = d >= 1 ? 'improving' : d <= -1 ? 'worsening' : 'stable';
          return (
            <section key={i.uid} className={panel}>
              <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-semibold">{incLabel(i)}</h3><span className={`text-xs font-semibold ${i.resolved ? 'text-ok' : 'text-crit'}`}>{i.resolved ? t('Cerrado', 'Closed') : t('Activo', 'Active')}</span></div>
              <p className="text-xs text-dim">{fmtDT(i.t, lang)}</p>
              <table className="mt-2 w-full text-left text-xs"><thead className="text-dim"><tr><th className="py-1">{t('Variable', 'Variable')}</th><th>{t('Al activarse', 'At activation')}</th><th>{t('Ahora', 'Now')}</th></tr></thead>
                <tbody>{SEV_KEYS.map(k => <tr key={k} className="border-t border-line"><td className="py-1">{vital(k)}</td><td className="font-mono">{fmt(i.start.vitals[k], THRESHOLDS[k].decimals, lang)}</td><td className={`font-mono ${s ? LEVEL_UI[levelOf(k, s[k])].text : ''}`}>{s ? fmt(s[k], THRESHOLDS[k].decimals, lang) : '—'}</td></tr>)}</tbody></table>
              <p className="mt-2 text-sm">{t('Evolución sugerida por los datos', 'Evolution suggested by the data')}{col} <b className={LEVEL_UI[FOLLOW[sugg].level].text}>{FOLLOW[sugg].icon} {b(FOLLOW[sugg].label)}</b></p>
              <div className="mt-2 flex overflow-hidden rounded border border-line" role="group" aria-label={t('Evolución tras la intervención', 'Evolution after the intervention')}>
                {(Object.keys(FOLLOW) as Follow[]).map(f => <button key={f} disabled={i.resolved} aria-pressed={i.follow === f} onClick={() => P.setFollow(i.uid, f)}
                  className={`flex-1 px-2 py-1.5 text-sm ${i.follow === f ? `${LEVEL_UI[FOLLOW[f].level].bg} ${LEVEL_UI[FOLLOW[f].level].text} font-semibold` : 'bg-raised text-dim'}`}>{FOLLOW[f].icon} {b(FOLLOW[f].label)}</button>)}
              </div>
            </section>);
        })}
      </div>),
  }[sec];

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <ViewHeader title={`${t('Panel clínico', 'Clinical panel')} · ${b(c.name)}`} level={lvl}>
        <span className={`rounded px-2 py-0.5 text-xs ${LEVEL_UI[tel.overall].bg} ${LEVEL_UI[tel.overall].text}`}>{lv(tel.overall)}</span>
      </ViewHeader>
      <nav className="flex flex-wrap gap-1" aria-label={t('Módulos clínicos', 'Clinical modules')}>
        {SECS.map(([k, es, en], i) => (
          <button key={k} onClick={() => setSec(k)} aria-pressed={sec === k} className={`rounded-md border px-2.5 py-1 text-xs ${sec === k ? 'border-info/70 bg-info/15 text-text' : 'border-white/10 text-dim hover:border-info/40 hover:text-text'}`}>
            <span className="mr-1 font-mono text-info">{i + 1}</span>{t(es, en)}
            {k === 'alerts' && openAlerts.length > 0 && <b className="ml-1 text-warn">{openAlerts.length}</b>}
            {k === 'protocols' && open.length > 0 && <b className="ml-1 text-crit">{open.length}</b>}
          </button>))}
      </nav>
      {body}
    </div>
  );
}
