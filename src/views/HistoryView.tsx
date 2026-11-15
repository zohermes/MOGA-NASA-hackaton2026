import { useState } from 'react';
import ViewHeader, { btnCls } from '../components/ViewHeader';
import { useMedical } from '../context/MedicalContext';
import { fmtDT, type EventKind, type EventSource } from '../lib/history';
import { useI18n, type Bi } from '../lib/i18n';
import { LEVEL_UI } from '../lib/thresholds';

const FILTERS: [string, Bi][] = [
  ['all', { es: 'Todo', en: 'All' }], ['alert', { es: 'Alertas', en: 'Alerts' }], ['anomaly', { es: 'Anomalías (parche y ecografía)', en: 'Anomalies (patch and ultrasound)' }],
  ['consult', { es: 'Consultas', en: 'Consultations' }], ['medication', { es: 'Medicación', en: 'Medication' }],
];
const KIND: Record<EventKind, Bi> = { alert: { es: 'Alerta', en: 'Alert' }, anomaly: { es: 'Anomalía', en: 'Anomaly' }, consult: { es: 'Consulta', en: 'Consultation' }, medication: { es: 'Medicación', en: 'Medication' }, action: { es: 'Acción', en: 'Action' } };
const SRC: Record<EventSource, Bi> = { 'parche': { es: 'parche bioquímico', en: 'biochemical patch' }, 'ecografía': { es: 'ecografía', en: 'ultrasound' }, 'telemetría': { es: 'telemetría', en: 'telemetry' }, 'médico': { es: 'médico', en: 'physician' }, 'operador': { es: 'operador', en: 'operator' }, 'astronauta': { es: 'astronauta', en: 'astronaut' } };
const SEV = { green: 'border-ok', yellow: 'border-warn', red: 'border-crit', info: 'border-info' };
const match = (f: string, k: EventKind) => f === 'all' || (f === 'medication' ? k === 'medication' || k === 'action' : f === k);

/** Historial médico del tripulante activo. Exclusivamente clínico: no incluye problemas de red, señal ni latencia. */
export default function HistoryView() {
  const med = useMedical(), { t, b, lang, lv, col } = useI18n();
  const [f, setF] = useState('all'), [note, setNote] = useState('');
  if (!med) return null;
  const c = med.crew[med.active], list = med.events.filter(e => e.astronautId === c.id);
  const shown = list.filter(e => match(f, e.kind)).sort((a, z) => z.t - a.t);
  const n = (...k: EventKind[]) => list.filter(e => k.includes(e.kind)).length;
  const lvl = med.levels[c.id];
  const submit = () => { med.addConsult(note); setNote(''); };
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <ViewHeader title={t(`Historial médico · ${b(c.name)}`, `Medical history · ${b(c.name)}`)} level={lvl} />
      <section className="grid gap-3 rounded-lg border border-line bg-panel p-4 sm:grid-cols-2 lg:grid-cols-4">
        {([[t('Función', 'Role'), b(c.role)], [t('Edad y sexo', 'Age and sex'), `${c.age} ${t('años', 'years')} · ${c.sex === 'M' ? t('Hombre', 'Male') : t('Mujer', 'Female')}`], [t('Grupo sanguíneo', 'Blood type'), c.blood], [t('Alergias', 'Allergies'), b(c.allergies)]] as [string, string][]).map(([a, v]) =>
          <div key={a}><p className="text-xs text-dim">{a}</p><p className="font-semibold">{v}</p></div>)}
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 text-sm sm:col-span-2 lg:col-span-4">
          <span>{t('Estado actual', 'Current status')}{col} <b className={LEVEL_UI[lvl].text}>{lv(lvl)}</b></span>
          <span>{t('Alertas', 'Alerts')}{col} <b>{n('alert')}</b></span><span>{t('Anomalías', 'Anomalies')}{col} <b>{n('anomaly')}</b></span>
          <span>{t('Consultas', 'Consultations')}{col} <b>{n('consult')}</b></span><span>{t('Medicación', 'Medication')}{col} <b>{n('medication', 'action')}</b></span>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-panel p-4">
        <h3 className="text-sm font-semibold">{t('Registrar consulta', 'Record a consultation')}</h3>
        <form className="mt-2 flex flex-wrap gap-2" onSubmit={ev => { ev.preventDefault(); submit(); }}>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder={t('Motivo, hallazgos o indicaciones', 'Reason, findings or instructions')} aria-label={t('Texto de la consulta', 'Consultation text')}
            className="min-w-0 flex-1 rounded border border-line bg-raised px-3 py-1.5 text-sm text-text placeholder:text-dim" />
          <button type="submit" className={btnCls}>{t('Agregar al historial', 'Add to history')}</button>
        </form>
        <p className="mt-2 text-xs text-dim">{t('El historial solo contiene eventos clínicos. Los problemas de conectividad con la Tierra no se registran.', 'The history contains clinical events only. Connectivity problems with Earth are not recorded.')}</p>
      </section>

      <div className="flex flex-wrap overflow-hidden rounded border border-line" role="group" aria-label={t('Filtrar historial', 'Filter history')}>
        {FILTERS.map(([id, l]) => <button key={id} aria-pressed={f === id} onClick={() => setF(id)} className={`px-3 py-1.5 text-sm ${f === id ? 'bg-info font-semibold text-ink' : 'bg-raised text-dim'}`}>{b(l)}</button>)}
      </div>
      <ol className="space-y-2">
        {shown.length === 0 && <li className="text-sm text-dim">{t('Sin registros para este filtro.', 'No records for this filter.')}</li>}
        {shown.map(e => (
          <li key={e.id} className={`rounded border-l-4 bg-panel p-3 ${SEV[e.severity]}`}>
            <p className="flex flex-wrap items-center gap-2 text-xs text-dim">
              <span className="font-mono">{fmtDT(e.t, lang)}</span><span className="rounded bg-white/5 px-2 py-0.5">{b(KIND[e.kind])}</span><span>{b(SRC[e.source])}</span>
              {e.severity !== 'info' && <b className={LEVEL_UI[e.severity].text}>{lv(e.severity)}</b>}
            </p>
            <p className="mt-1 font-semibold">{b(e.title)}</p><p className="text-sm text-dim">{b(e.detail)}</p>
          </li>))}
      </ol>
    </div>
  );
}
