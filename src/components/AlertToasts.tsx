import { btnCls } from './ViewHeader';
import { alertBi } from '../hooks/useMedicalState';
import type { Incident } from '../hooks/useProtocols';
import { CREW } from '../lib/crew';
import { useI18n } from '../lib/i18n';
import { protOf } from '../lib/protocols';
import { LEVEL_UI, utc } from '../lib/thresholds';
import type { Alert } from '../types/telemetry';

export interface Toast { key: string; crew: number; alert: Alert }
interface Props { toasts: Toast[]; incidents: Incident[]; onDismiss: (key: string) => void; onProtocol: (uid: string) => void; onVitals: (crew: number) => void }

/** Avisos emergentes sobre la interfaz activa: aparecen en el instante de cada alerta amarilla o roja. Los rojos permanecen hasta cerrarse. */
export default function AlertToasts({ toasts, incidents, onDismiss, onProtocol, onVitals }: Props) {
  const { t, b, col, lv } = useI18n();
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed right-4 top-24 z-[65] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="assertive">
      {toasts.map(({ key, crew, alert: a }) => {
        const ui = LEVEL_UI[a.level], c = CREW[crew], inc = incidents.find(i => i.crew === c.id && !i.resolved);
        return (
          <div key={key} role="alert" className={`toast-in pointer-events-auto rounded-lg border-2 ${ui.border} bg-panel p-3 shadow-xl backdrop-blur-xl`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={`font-mono text-[11px] uppercase tracking-widest ${ui.text}`}>{a.level === 'red' ? '● ' : '○ '}{lv(a.level)} · <span className="text-dim">{utc(a.t)}</span></p>
                <p className="mt-0.5 font-semibold">{b(alertBi(a))}</p>
                <p className="text-xs text-dim">{b(c.name)} · {b(c.role)}</p>
              </div>
              <button onClick={() => onDismiss(key)} aria-label={t('Cerrar aviso', 'Dismiss notice')} className="shrink-0 rounded border border-white/10 px-1.5 text-sm leading-5 text-dim hover:border-info/60 hover:text-text">×</button>
            </div>
            {inc && <p className="mt-2 rounded border border-crit/50 bg-crit/10 px-2 py-1 text-xs text-crit">{t('Protocolo asociado', 'Associated protocol')}{col} <b className="font-mono">{inc.prot}</b> · {b(protOf(inc.prot).title)}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {inc && <button onClick={() => { onProtocol(inc.uid); onDismiss(key); }} className={`${btnCls} !border-crit/70 !py-1 text-xs font-semibold`}>{t('Abrir protocolo →', 'Open protocol →')}</button>}
              <button onClick={() => { onVitals(crew); onDismiss(key); }} className={`${btnCls} !py-1 text-xs`}>{t('Ver signos vitales', 'View vital signs')}</button>
            </div>
          </div>);
      })}
    </div>
  );
}
