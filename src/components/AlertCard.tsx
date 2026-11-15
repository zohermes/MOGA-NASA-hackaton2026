import { useMedical } from '../context/MedicalContext';
import { alertBi } from '../hooks/useMedicalState';
import { useI18n } from '../lib/i18n';
import { DISCLAIMER, MEDS, stockLevel } from '../lib/meds';
import { LEVEL_UI, utc } from '../lib/thresholds';
import type { Alert } from '../types/telemetry';

type By = 'astronauta' | 'operador';
const btn = 'rounded border border-line bg-raised px-3 py-1.5 text-sm hover:border-info disabled:cursor-not-allowed disabled:opacity-50';

/** Alerta + sugerencia de tratamiento + validación. Confirmar la administración descuenta 1 unidad de las existencias. */
export function AlertCard({ alert: a, by, onAck }: { alert: Alert; by: By; onAck?: () => void }) {
  const med = useMedical(), { t, b, n, lv, col } = useI18n(), ui = LEVEL_UI[a.level];
  const sug = med ? med.suggestFor(a) : null;
  const def = sug?.medId ? MEDS.find(m => m.id === sug.medId) : undefined;
  const stock = def && med ? med.stock[def.id] ?? 0 : 0, sl = def ? stockLevel(stock, def) : 'green';
  return (
    <li className={`rounded border ${ui.border} ${ui.bg} p-3 text-sm`}>
      <p><b className={ui.text}>{lv(a.level)}</b> <span className="font-mono text-xs text-dim">{utc(a.t)}</span> · {b(alertBi(a))}</p>
      {sug && (
        <div className="mt-2 rounded border border-white/10 bg-ink/50 p-2">
          <p className="font-mono text-[11px] uppercase tracking-widest text-info">{t('Sugerencia asistida', 'Assisted suggestion')}</p>
          <p className="mt-1 font-semibold">{b(sug.title)}</p>
          <p>{b(sug.action)}</p>
          {sug.dose && med && <p className="mt-1">{t('Dosis', 'Dose')}{col} <b>{b(med.dosage(sug.medId, sug.dose))}</b>{sug.medId && med.doseOv[sug.medId] && <span className="ml-1 rounded border border-info/50 px-1 text-[10px] text-info">{t('Modificada por el operador', 'Changed by the operator')}</span>}</p>}
          {def && <p className={`mt-1 text-xs font-semibold ${LEVEL_UI[sl].text}`}>{t('Existencias a bordo', 'Onboard supply')}{col} {n(stock)} {b(def.unit)}{sl === 'red' ? t(' · CRÍTICAS', ' · CRITICAL') : sl === 'yellow' ? t(' · bajas', ' · low') : ''}</p>}
          <p className="mt-1 text-xs text-dim">{b(sug.rationale)} {b(DISCLAIMER)}</p>
        </div>)}
      <div className="mt-2 flex flex-wrap gap-2">
        {sug && med && (
          <button className={btn} disabled={!!def && stock <= 0} onClick={() => med.confirm(a, by)}>
            {def ? (stock <= 0 ? t('Sin existencias', 'Out of stock') : t(`Confirmar administración (−1 ${b(def.name)})`, `Confirm administration (−1 ${b(def.name)})`)) : t('Confirmar acción realizada', 'Confirm action taken')}
          </button>)}
        <button className={btn} onClick={onAck ?? (() => med?.dismiss(a))}>{t('Reconocer', 'Acknowledge')}</button>
      </div>
    </li>
  );
}

/** Las alertas abiertas del tripulante activo, con su sugerencia. */
export function OpenAlerts({ by, max = 3 }: { by: By; max?: number }) {
  const med = useMedical(), { t } = useI18n(), list = med ? med.openAlerts.slice(0, max) : [];
  if (!list.length) return null;
  return <ul className="space-y-2" aria-label={t('Alertas con sugerencias de tratamiento', 'Alerts with treatment suggestions')}>{list.map(a => <AlertCard key={a.id} alert={a} by={by} />)}</ul>;
}
