import { useI18n } from '../lib/i18n';
import type { Sample, VitalKey } from '../types/telemetry';
import { THRESHOLDS, utc } from '../lib/thresholds';

interface Props {
  running: boolean; onToggle: () => void;
  intervalMs: number; onInterval: (ms: number) => void;
  onFault: (k: VitalKey) => void; history: Sample[]; fastKeys: VitalKey[];
}
const HEADER = 't,hr,sys,dia,rr,temp,spo2';
const row = (s: Sample) => [utc(s.t), s.heartRate.toFixed(0), s.systolic.toFixed(0), s.diastolic.toFixed(0), s.respRate.toFixed(0), s.temperature.toFixed(1), s.spo2.toFixed(0)].join(',');

/** Simula la recepción del flujo (como el CSV de prueba), permite inyectar anomalías y exportar el registro. */
export default function ControlPanel({ running, onToggle, intervalMs, onInterval, onFault, history, fastKeys }: Props) {
  const { t, n, vital } = useI18n();
  const download = () => {
    const blob = new Blob([[HEADER, ...history.map(row)].join('\n')], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'telemetria.csv' });
    a.click(); URL.revokeObjectURL(a.href);
  };
  const btn = 'rounded border border-line bg-raised px-3 py-1.5 text-sm hover:border-info';
  const fastS = Math.max(0.25, intervalMs / 4000);
  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <h2 className="text-sm font-semibold">{t('Flujo simulado', 'Simulated data stream')}</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className={btn} onClick={onToggle}>{running ? t('Pausar flujo', 'Pause stream') : t('Reanudar flujo', 'Resume stream')}</button>
        <label className="text-sm text-dim">{t('Cadencia estándar', 'Standard interval')}
          <select className="ml-2 rounded border border-line bg-raised px-2 py-1 text-text" value={intervalMs} onChange={e => onInterval(+e.target.value)}>
            {[1000, 2000, 5000].map(ms => <option key={ms} value={ms}>{n(ms / 1000)} s</option>)}
          </select>
        </label>
        <button className={btn} onClick={download}>{t('Exportar CSV', 'Export CSV')}</button>
      </div>
      <div className={`mt-3 rounded border p-2 text-xs ${fastKeys.length ? 'border-warn/60 bg-warn/10' : 'border-line bg-ink/40'}`} role="status">
        <p className="font-semibold">{t('Muestreo adaptativo', 'Adaptive sampling')}</p>
        <p className="text-dim">{fastKeys.length
          ? t(`Muestreo acelerado (cada ${n(fastS, 2)} s) en: ${fastKeys.map(vital).join(', ')}.`, `Accelerated sampling (every ${n(fastS, 2)} s) on: ${fastKeys.map(vital).join(', ')}.`)
          : t(`Todos los parámetros a la cadencia estándar. Ante una anomalía, el parámetro afectado se muestrea cada ${n(fastS, 2)} s hasta normalizarse.`, `All parameters at the standard interval. On an anomaly, the affected parameter is sampled every ${n(fastS, 2)} s until it normalizes.`)}</p>
      </div>
      <p className="mt-4 text-xs text-dim">{t('Inyectar anomalía (6 ciclos)', 'Inject anomaly (6 cycles)')}</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {(Object.keys(THRESHOLDS) as VitalKey[]).map(k => <button key={k} className={btn} onClick={() => onFault(k)}>{vital(k).split(' (')[0]}</button>)}
      </div>
      <pre className="mt-4 max-h-40 overflow-auto rounded bg-ink p-2 text-xs text-dim" aria-label={t('Registro del flujo', 'Stream log')}>
        {[HEADER, ...history.slice(-8).map(row)].join('\n')}
      </pre>
    </section>
  );
}
