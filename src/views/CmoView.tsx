import { AlertCard } from '../components/AlertCard';
import ViewHeader, { btnCls } from '../components/ViewHeader';
import { useMedical } from '../context/MedicalContext';
import type { useAstronautTelemetry } from '../hooks/useAstronautTelemetry';
import { CREW } from '../lib/crew';
import { fmtDT } from '../lib/history';
import { useI18n } from '../lib/i18n';
import { MEDS, stockLevel } from '../lib/meds';
import { co2Level, o2Level } from '../lib/station';
import { LEVEL_UI, worst } from '../lib/thresholds';
import type { Level } from '../types/telemetry';

type Telemetry = ReturnType<typeof useAstronautTelemetry>;
interface Props { tels: Telemetry[]; active: number; onActive: (i: number) => void; o2: number; co2: number; days: number; onGo: (v: 'history' | 'pharmacy' | 'sans' | 'station' | 'astronaut' | 'clinical') => void }
const panel = 'rounded-lg border border-line bg-panel p-4';

/** Perfil CMO (Oficial Médico en Jefe): supervisión clínica de toda la tripulación, alertas con validación de tratamiento, entorno y farmacia. */
export default function CmoView({ tels, active, onActive, o2, co2, days, onGo }: Props) {
  const med = useMedical(), { t, b, n, lv, col, lang } = useI18n();
  if (!med) return null;
  const overall = worst(...tels.map(x => x.overall));
  const open = tels.flatMap((x, i) => x.alerts.filter(a => !a.ack).map(a => ({ a, i, ack: x.ackAlert })));
  const crit = MEDS.filter(m => stockLevel(med.stock[m.id] ?? 0, m) === 'red');
  const env: [string, string, Level][] = [
    ['O₂', `${n(o2, 1)} %`, o2Level(o2)], ['CO₂', `${n(co2, 0)} ppm`, co2Level(co2)],
    [t('Días en microgravedad', 'Days in microgravity'), `${n(days)} ${t('d', 'd')}`, days >= 30 ? 'yellow' : 'green'],
  ];
  const recent = [...med.events].sort((x, y) => y.t - x.t).slice(0, 6);
  const nameOf = (id?: string) => { const c = CREW.find(x => x.id === id); return c ? b(c.name) : t('Tripulación', 'Crew'); };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <ViewHeader title={t('Supervisión clínica (CMO)', 'Clinical supervision (CMO)')} level={overall}>
        <button className={btnCls} onClick={() => onGo('clinical')}>{t('Panel clínico', 'Clinical panel')}</button>
        <button className={btnCls} onClick={() => onGo('history')}>{t('Historial médico', 'Medical history')}</button>
        <button className={btnCls} onClick={() => onGo('pharmacy')}>{t('Farmacia a bordo', 'Onboard pharmacy')}</button>
      </ViewHeader>
      <p className="text-xs text-dim">{t('Oficial Médico en Jefe: vista de toda la tripulación. Puede validar los tratamientos sugeridos y consultar el historial y la farmacia.', 'Chief Medical Officer: whole-crew view. You can validate suggested treatments and review the history and the pharmacy.')}</p>

      <div className="grid gap-4 md:grid-cols-3">
        {CREW.map((c, i) => {
          const tl = tels[i], s = tl.latest, ui = LEVEL_UI[tl.overall], na = tl.alerts.filter(a => !a.ack).length;
          return (
            <section key={c.id} className={`rounded-lg border p-4 ${active === i ? 'border-info/70' : ui.border} bg-panel`} aria-label={b(c.name)}>
              <div className="flex items-baseline justify-between gap-2"><h3 className="font-semibold">{b(c.name)}</h3><b className={`text-xs ${ui.text}`}>● {lv(tl.overall)}</b></div>
              <p className="text-xs text-dim">{b(c.role)} · {c.age} {t('años', 'years')} · {c.blood}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <dt className="text-dim">{t('Frecuencia cardíaca', 'Heart rate')}</dt><dd className="text-right font-mono">{s ? n(s.heartRate) : '—'} {t('lpm', 'bpm')}</dd>
                <dt className="text-dim">{t('Presión arterial', 'Blood pressure')}</dt><dd className="text-right font-mono">{s ? `${n(s.systolic)}/${n(s.diastolic)}` : '—'}</dd>
                <dt className="text-dim">SpO₂</dt><dd className="text-right font-mono">{s ? n(s.spo2) : '—'} %</dd>
                <dt className="text-dim">{t('Alergias', 'Allergies')}</dt><dd className="text-right">{b(c.allergies)}</dd>
                <dt className="text-dim">{t('Alertas abiertas', 'Open alerts')}</dt><dd className={`text-right font-semibold ${na ? 'text-warn' : ''}`}>{na}</dd>
              </dl>
              <div className="mt-3 flex gap-2">
                <button className={btnCls} onClick={() => onActive(i)} aria-pressed={active === i}>{active === i ? t('Seleccionado', 'Selected') : t('Seleccionar', 'Select')}</button>
                <button className={btnCls} onClick={() => { onActive(i); onGo('astronaut'); }}>{t('Ver signos vitales', 'View vital signs')}</button>
              </div>
            </section>);
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={panel}>
          <h3 className="text-sm font-semibold">{t('Alertas abiertas de la tripulación', 'Open crew alerts')}</h3>
          {open.length === 0 ? <p className="mt-2 text-sm text-ok">{t('Sin alertas abiertas.', 'No open alerts.')}</p> : (
            <ul className="mt-2 max-h-96 space-y-2 overflow-y-auto">
              {open.slice(0, 8).map(({ a, i, ack }) => (
                <div key={`${i}-${a.id}`}><p className="mb-1 text-xs text-dim">{b(CREW[i].name)}</p><AlertCard alert={a} by="operador" onAck={() => ack(a.id)} /></div>))}
            </ul>)}
        </section>
        <div className="space-y-4">
          <section className={panel}>
            <h3 className="text-sm font-semibold">{t('Entorno de la nave', 'Ship environment')}</h3>
            <ul className="mt-2 grid grid-cols-3 gap-2">
              {env.map(([k, v, lvl]) => <li key={k} className={`rounded border p-2 ${LEVEL_UI[lvl].border} ${LEVEL_UI[lvl].bg}`}><p className="text-xs text-dim">{k}</p><p className={`font-mono text-lg ${LEVEL_UI[lvl].text}`}>{v}</p></li>)}
            </ul>
            <div className="mt-3 flex gap-2"><button className={btnCls} onClick={() => onGo('station')}>{t('Abrir el plano →', 'Open the layout →')}</button><button className={btnCls} onClick={() => onGo('sans')}>{t('Abrir diagnóstico SANS →', 'Open SANS diagnosis →')}</button></div>
          </section>
          <section className={panel}>
            <h3 className="text-sm font-semibold">{t('Existencias críticas en la farmacia', 'Critical pharmacy supply')}</h3>
            <p className={`mt-2 text-sm ${crit.length ? 'text-crit' : 'text-ok'}`}>{crit.length ? crit.map(m => `${b(m.name)} (${med.stock[m.id]})`).join(' · ') : t('Existencias suficientes.', 'Supplies are sufficient.')}</p>
          </section>
        </div>
      </div>

      <section className={panel}>
        <h3 className="text-sm font-semibold">{t('Eventos clínicos recientes', 'Recent clinical events')}</h3>
        {recent.length === 0 ? <p className="mt-2 text-sm text-dim">{t('Sin eventos registrados.', 'No events recorded.')}</p> : (
          <ol className="mt-2 space-y-1.5 text-sm">
            {recent.map(e => <li key={e.id} className="flex flex-wrap gap-x-2"><span className="font-mono text-xs text-dim">{fmtDT(e.t, lang)}</span><span className="text-dim">{nameOf(e.astronautId)}{col}</span><span>{b(e.title)}</span></li>)}
          </ol>)}
      </section>
    </div>
  );
}
