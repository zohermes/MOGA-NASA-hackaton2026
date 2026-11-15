import { OpenAlerts } from '../components/AlertCard';
import ViewHeader, { btnCls } from '../components/ViewHeader';
import { useMedical } from '../context/MedicalContext';
import { fmtDT } from '../lib/history';
import { useI18n } from '../lib/i18n';
import { MEDS, stockLevel } from '../lib/meds';
import { LEVEL_UI, worst } from '../lib/thresholds';
import type { Level } from '../types/telemetry';

const BAR: Record<Level, string> = { green: 'bg-ok', yellow: 'bg-warn', red: 'bg-crit' };

/** Inventario de farmacia a bordo. Las existencias bajan solo al confirmar una administración. */
export default function PharmacyView({ canManage = true }: { canManage?: boolean }) {
  const med = useMedical(), { t, b, n, lang, col } = useI18n();
  if (!med) return null;
  const WORD: Record<Level, string> = { green: t('Existencias normales', 'Normal supply'), yellow: t('Existencias bajas', 'Low supply'), red: t('EXISTENCIAS CRÍTICAS', 'CRITICAL SUPPLY') };
  const rows = MEDS.map(m => { const s = med.stock[m.id] ?? 0; return { m, s, level: stockLevel(s, m) }; });
  const critical = rows.filter(r => r.level === 'red');
  const used = med.events.filter(e => e.kind === 'medication').sort((a, z) => z.t - a.t).slice(0, 8);
  const name = (id: string) => { const c = med.crew.find(x => x.id === id); return c ? b(c.name) : id; };
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <ViewHeader title={t('Farmacia a bordo', 'Onboard pharmacy')} level={worst(...rows.map(r => r.level))}>
        {canManage && <button className={btnCls} onClick={med.resetDemo}>{t('Restablecer demostración', 'Reset demo')}</button>}
      </ViewHeader>
      {critical.length > 0 && (
        <div role="alert" className={`rounded-lg border-2 p-3 ${LEVEL_UI.red.border} ${LEVEL_UI.red.bg}`}>
          <p className="font-semibold text-crit">{t('Existencias críticas', 'Critical supply')}{col} {critical.map(r => `${b(r.m.name)} (${r.s})`).join(' · ')}</p>
          <p className="text-sm text-dim">{t('Reabastezca o planifique el reemplazo. Los medicamentos sin existencias no se pueden administrar.', 'Resupply or plan a replacement. Items with no stock cannot be administered.')}</p>
        </div>)}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ m, s, level }) => (
          <section key={m.id} className={`rounded-lg border p-4 ${LEVEL_UI[level].border} ${LEVEL_UI[level].bg}`}>
            <div className="flex items-baseline justify-between gap-2"><h3 className="text-sm font-semibold">{b(m.name)}</h3><span className={`text-xs font-semibold ${LEVEL_UI[level].text}`}>{WORD[level]}</span></div>
            <p className="text-xs text-dim">{b(m.presentation)}</p>
            <p className={`mt-2 text-4xl font-semibold ${LEVEL_UI[level].text}`}>{n(s)}<span className="ml-1 text-base font-normal text-dim">{b(m.unit)}</span></p>
            <div className="mt-2 h-2 overflow-hidden rounded bg-ink" role="progressbar" aria-label={t(`Existencias de ${b(m.name)}`, `Supply of ${b(m.name)}`)} aria-valuenow={s} aria-valuemin={0} aria-valuemax={m.initial}>
              <div className={`h-full ${BAR[level]}`} style={{ width: `${Math.min(100, (s / m.initial) * 100)}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between"><span className="text-xs text-dim">{t('Nivel crítico', 'Critical level')}{col} {m.critical}</span>{canManage && <button className={btnCls} onClick={() => med.resupply(m.id)}>{t('Reabastecer +5', 'Resupply +5')}</button>}</div>
          </section>))}
      </div>
      <section className="rounded-lg border border-line bg-panel p-4">
        <h3 className="mb-2 text-sm font-semibold">{t('Sugerencias pendientes', 'Pending suggestions')} · {b(med.crew[med.active].name)}</h3>
        {med.openAlerts.length === 0 ? <p className="text-sm text-dim">{t('Sin alertas abiertas.', 'No open alerts.')}</p> : <OpenAlerts by="operador" max={5} />}
      </section>
      <section className="rounded-lg border border-line bg-panel p-4">
        <h3 className="mb-2 text-sm font-semibold">{t('Últimas administraciones', 'Latest administrations')}</h3>
        <ul className="space-y-1 text-sm">
          {used.length === 0 && <li className="text-dim">{t('Aún no hay administraciones registradas.', 'No administrations recorded yet.')}</li>}
          {used.map(e => <li key={e.id} className="border-t border-line pt-1"><span className="font-mono text-xs text-dim">{fmtDT(e.t, lang)}</span> · <b>{name(e.astronautId)}</b> · {b(e.title)}</li>)}
        </ul>
      </section>
    </div>
  );
}
