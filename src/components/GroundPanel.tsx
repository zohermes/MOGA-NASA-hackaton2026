import { AlertCard } from './AlertCard';
import TimeSeriesChart from './TimeSeriesChart';
import { btnCls } from './ViewHeader';
import { forecast } from '../lib/forecast';
import { useI18n } from '../lib/i18n';
import { PHASES, type PhaseId } from '../lib/mission';
import { BASELINE } from '../lib/sans';
import { LEVEL_UI, levelOf, RANK, THRESHOLDS, utc } from '../lib/thresholds';
import type { Alert, LinkState, Sample, VitalKey } from '../types/telemetry';

interface Props { history: Sample[]; alerts: Alert[]; link: LinkState; ackAlert: (id: string) => void; ingested: number; phase: PhaseId }
const BASE_RECORDS = 48_213_904; // simulado
const CHARTS: VitalKey[] = ['heartRate', 'systolic', 'spo2', 'temperature'];
const PRED: VitalKey[] = ['heartRate', 'systolic', 'respRate', 'temperature', 'spo2'];
const panel = 'rounded-lg border border-line bg-panel p-4';
const HEADER = 't,hr,sys,dia,rr,temp,spo2';
const row = (s: Sample) => [utc(s.t), s.heartRate.toFixed(0), s.systolic.toFixed(0), s.diastolic.toFixed(0), s.respRate.toFixed(0), s.temperature.toFixed(1), s.spo2.toFixed(0)].join(',');

/** Vista terrestre: base de datos, históricos, almacenamiento y análisis predictivo. Los datos de la base y del almacenamiento son simulados. */
export default function GroundPanel({ history, alerts, link, ackAlert, ingested, phase }: Props) {
  const { t, b, n, lv, vital, unit } = useI18n();
  const P = PHASES.find(x => x.id === phase)!;
  const last = history[history.length - 1];
  const win = history.slice(-15);
  const dt = win.length > 1 ? (win[win.length - 1].t - win[0].t) / (win.length - 1) : 2000;
  const open = alerts.filter(a => !a.ack);
  const preds = PRED.map(key => ({ key, f: forecast(history, key) }));
  const worstPred = preds.reduce((w, p) => (p.f && RANK[levelOf(p.key, p.f.projected)] > RANK[w] ? levelOf(p.key, p.f.projected) : w), 'green' as 'green' | 'yellow' | 'red');
  const PREDMSG = { green: t('Sin desviaciones previstas en el horizonte.', 'No deviations expected within the horizon.'), yellow: t('Tendencia hacia el rango de precaución.', 'Trending toward the caution range.'), red: t('Posible desviación crítica prevista.', 'Possible critical deviation expected.') };
  const exportCsv = () => {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([[HEADER, ...history.map(row)].join('\n')], { type: 'text/csv' })), download: 'base_terrestre.csv' });
    a.click(); URL.revokeObjectURL(a.href);
  };
  const stats: [string, string, string][] = [
    [t('Enlace con la estación', 'Link to the station'), link.mode === 'synced' ? t('Sincronizado', 'Synchronized') : t('Sin enlace', 'No link'), link.mode === 'synced' ? t(`Latencia de ${n(link.latencyMs)} ms`, `Latency ${n(link.latencyMs)} ms`) : t(`${link.pendingRecords} registros en cola a bordo`, `${link.pendingRecords} records queued on board`)],
    [t('Registros en la base de datos', 'Records in the database'), n(BASE_RECORDS + ingested), t(`+${ingested} en esta sesión · ${n(1000 / dt, 1)} muestras/s`, `+${ingested} this session · ${n(1000 / dt, 1)} samples/s`)],
    [t('Almacenamiento', 'Storage'), '612 TB / 1 PB', t('61,2 % utilizado', '61.2 % used')],
    [t('Réplica secundaria', 'Secondary replica'), link.mode === 'synced' ? t('Al día', 'Up to date') : t('Pendiente', 'Pending'), link.mode === 'synced' ? t('Sin retraso', 'No lag') : t('Se reanuda con el enlace', 'Resumes with the link')],
  ];
  return (
    <div className="space-y-4 p-4">
      <section className={panel}>
        <p className="font-mono text-[11px] uppercase tracking-widest text-info">{t(`Etapa ${P.step} de 4`, `Stage ${P.step} of 4`)} · {b(P.label)}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{P.ground.map((l, i) => <li key={i}>{b(l)}</li>)}</ul>
        {phase === 'return' && last && (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-xs text-dim"><tr><th className="py-1">{t('Análisis posvuelo', 'Post-flight analysis')}</th><th>{t('Actual', 'Current')}</th><th>{t('Línea base', 'Baseline')}</th><th>Δ</th></tr></thead>
            <tbody>{([[vital('heartRate'), last.heartRate, BASELINE.hr], [vital('systolic'), last.systolic, BASELINE.sys], [vital('diastolic'), last.diastolic, BASELINE.dia]] as [string, number, number][]).map(([nm, v, base]) => (
              <tr key={nm} className="border-t border-line"><td className="py-2">{nm}</td><td>{n(v)}</td><td>{base}</td><td className="text-dim">{v - base >= 0 ? '+' : '−'}{n(Math.abs(v - base))}</td></tr>))}</tbody>
          </table>)}
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        {stats.map(([a, v, c]) => <div key={a} className={panel}><p className="text-xs text-dim">{a}</p><p className="mt-1 text-xl font-semibold">{v}</p><p className="text-xs text-dim">{c}</p></div>)}
      </div>
      <div className="h-2 overflow-hidden rounded bg-panel" role="progressbar" aria-label={t('Almacenamiento utilizado', 'Storage used')} aria-valuenow={61} aria-valuemin={0} aria-valuemax={100}><div className="h-full w-[61.2%] bg-info" /></div>

      <section>
        <h3 className="mb-2 text-sm font-semibold">{t('Históricos recibidos en la Tierra', 'Historical data received on Earth')}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {CHARTS.map(k => <TimeSeriesChart key={k} title={vital(k)} unit={unit(k)} normal={THRESHOLDS[k].normal} warn={THRESHOLDS[k].warn}
            data={history.map(s => s[k])} level={last ? levelOf(k, last[k]) : 'green'} />)}
        </div>
      </section>

      <section className={panel}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">{t('Análisis predictivo (demostración)', 'Predictive analysis (demo)')}</h3>
          <span className={`text-xs font-semibold ${LEVEL_UI[worstPred].text}`}>{PREDMSG[worstPred]}</span>
        </div>
        <table className="mt-2 w-full text-left text-sm">
          <thead className="text-xs text-dim"><tr><th className="py-1">{t('Signo vital', 'Vital sign')}</th><th>{t('Ahora', 'Now')}</th><th>{t(`Proyección a ~${Math.round((15 * dt) / 1000)} s`, `Projection at ~${Math.round((15 * dt) / 1000)} s`)}</th><th>{t('Estado', 'Status')}</th></tr></thead>
          <tbody>{preds.map(({ key, f }) => {
            const th = THRESHOLDS[key], l = f ? levelOf(key, f.projected) : 'green', arrow = !f || Math.abs(f.projected - f.now) < (th.normal[1] - th.normal[0]) * 0.05 ? '→' : f.projected > f.now ? '↑' : '↓';
            return <tr key={key} className="border-t border-line"><td className="py-2">{vital(key).split(' (')[0]}</td><td>{f ? n(f.now, th.decimals) : '—'}</td>
              <td>{arrow} {f ? n(f.projected, th.decimals) : '—'} {unit(key)}</td><td className={`font-semibold ${LEVEL_UI[l].text}`}>{lv(l)}</td></tr>;
          })}</tbody>
        </table>
        <p className="mt-2 text-xs text-dim">{t('Regresión lineal amortiguada sobre las últimas muestras. Punto de integración del modelo de aprendizaje automático entrenado con la base de datos terrestre.', 'Damped linear regression over the latest samples. Integration point for the machine-learning model trained on the ground database.')}</p>
      </section>

      <section className={panel}>
        <h3 className="text-sm font-semibold">{t(`Alertas abiertas (${open.length})`, `Open alerts (${open.length})`)}</h3>
        <ul className="mt-2 max-h-48 space-y-2 overflow-auto">
          {open.length === 0 && <li className="text-sm text-dim">{t('Sin alertas pendientes.', 'No pending alerts.')}</li>}
          {open.map(a => <AlertCard key={a.id} alert={a} by="operador" onAck={() => ackAlert(a.id)} />)}
        </ul>
      </section>

      <section className={`${panel} overflow-auto`}>
        <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{t('Acceso a la base de datos', 'Database access')}</h3><button className={btnCls} onClick={exportCsv}>{t('Exportar CSV', 'Export CSV')}</button></div>
        <table className="mt-2 w-full text-left text-xs">
          <thead className="text-dim"><tr><th className="py-1">UTC</th><th>{t('FC', 'HR')}</th><th>{t('PA', 'BP')}</th><th>{t('FR', 'RR')}</th><th>{t('Temp.', 'Temp.')}</th><th>SpO₂</th></tr></thead>
          <tbody>{history.slice(-6).reverse().map(s => <tr key={s.t} className="border-t border-line"><td className="py-1">{utc(s.t)}</td><td>{n(s.heartRate)}</td><td>{n(s.systolic)}/{n(s.diastolic)}</td><td>{n(s.respRate)}</td><td>{n(s.temperature, 1)}</td><td>{n(s.spo2)}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}
