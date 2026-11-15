import { AlertCard } from '../components/AlertCard';
import ControlPanel from '../components/ControlPanel';
import TimeSeriesChart from '../components/TimeSeriesChart';
import { useI18n } from '../lib/i18n';
import { levelOf, THRESHOLDS, utc } from '../lib/thresholds';
import type { Alert, LinkState, Sample, VitalKey } from '../types/telemetry';

interface Props {
  history: Sample[]; alerts: Alert[]; link: LinkState; ackAlert: (id: string) => void;
  running: boolean; setRunning: (r: boolean) => void; intervalMs: number; setIntervalMs: (n: number) => void; injectFault: (k: VitalKey) => void; fastKeys: VitalKey[];
}
const KEYS = Object.keys(THRESHOLDS) as VitalKey[];

/** Alta densidad: series en vivo, cola de alertas, estado del enlace con la Tierra y registro histórico. */
export default function OperatorView(p: Props) {
  const { t, n, vital, unit, col } = useI18n();
  const last = p.history[p.history.length - 1];
  const open = p.alerts.filter(a => !a.ack);
  return (
    <div className="grid gap-4 p-4 xl:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {KEYS.map(k => <TimeSeriesChart key={k} title={vital(k)} unit={unit(k)} normal={THRESHOLDS[k].normal} warn={THRESHOLDS[k].warn}
            data={p.history.map(s => s[k])} level={last ? levelOf(k, last[k]) : 'green'} />)}
        </div>
        <section className="overflow-auto rounded-lg border border-line bg-panel p-3">
          <h2 className="text-sm font-semibold">{t('Registro histórico', 'Historical log')}</h2>
          <table className="mt-2 w-full text-left text-xs">
            <thead className="text-dim"><tr><th>UTC</th><th>{t('FC', 'HR')}</th><th>{t('PA', 'BP')}</th><th>{t('FR', 'RR')}</th><th>{t('Temp.', 'Temp.')}</th><th>SpO₂</th></tr></thead>
            <tbody>{p.history.slice(-10).reverse().map(s => (
              <tr key={s.t} className="border-t border-line"><td className="py-1">{utc(s.t)}</td><td>{n(s.heartRate)}</td><td>{n(s.systolic)}/{n(s.diastolic)}</td><td>{n(s.respRate)}</td><td>{n(s.temperature, 1)}</td><td>{n(s.spo2)}</td></tr>))}</tbody>
          </table>
        </section>
      </div>
      <aside className="space-y-4">
        <section className="rounded-lg border border-line bg-panel p-4">
          <h2 className="text-sm font-semibold">{t('Enlace con la Tierra', 'Link to Earth')}</h2>
          <p className={`mt-2 text-lg font-semibold ${p.link.mode === 'synced' ? 'text-ok' : 'text-warn'}`}>{p.link.mode === 'synced' ? t('Sincronizado', 'Synchronized') : t('Sin enlace: datos en cola', 'No link: data queued')}</p>
          <p className="text-xs text-dim">{t('Pendientes', 'Pending')}{col} {p.link.pendingRecords} · {t('Última sincronización', 'Last sync')}{col} {p.link.lastSyncAt ? utc(p.link.lastSyncAt) : '—'} · {t('Latencia', 'Latency')}{col} {n(p.link.latencyMs)} ms</p>
        </section>
        <section className="rounded-lg border border-line bg-panel p-4">
          <h2 className="text-sm font-semibold">{t(`Alertas abiertas (${open.length})`, `Open alerts (${open.length})`)}</h2>
          <ul className="mt-2 max-h-72 space-y-2 overflow-auto">
            {open.length === 0 && <li className="text-sm text-dim">{t('Sin alertas pendientes.', 'No pending alerts.')}</li>}
            {open.map(a => <AlertCard key={a.id} alert={a} by="operador" onAck={() => p.ackAlert(a.id)} />)}
          </ul>
        </section>
        <ControlPanel running={p.running} onToggle={() => p.setRunning(!p.running)} intervalMs={p.intervalMs} onInterval={p.setIntervalMs} onFault={p.injectFault} history={p.history} fastKeys={p.fastKeys} />
      </aside>
    </div>
  );
}
