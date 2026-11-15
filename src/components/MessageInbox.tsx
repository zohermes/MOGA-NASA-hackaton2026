import { useEffect, useRef } from 'react';
import { btnCls } from './ViewHeader';
import type { Msg } from '../lib/comms';
import { fmtDT } from '../lib/history';
import { useI18n } from '../lib/i18n';

interface Props { msgs: Msg[]; crewId: string; onAck: (id: string) => void }

/** Avisos del operador sobre la pantalla del astronauta: los pendientes permanecen hasta confirmarse con "Entendido". */
export function MessageToasts({ msgs, crewId, onAck }: Props) {
  const { t, b, lang, col } = useI18n();
  const pending = msgs.filter(m => !m.ack.includes(crewId)).slice(0, 3);
  if (!pending.length) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-24 z-[66] flex w-[26rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col gap-2" aria-live="assertive">
      {pending.map(m => (
        <div key={m.id} role="alert" className={`toast-in pointer-events-auto rounded-lg border-2 ${m.urgent ? 'border-crit' : 'border-info/70'} bg-panel p-3 shadow-xl backdrop-blur-xl`}>
          <p className={`font-mono text-[11px] uppercase tracking-widest ${m.urgent ? 'text-crit' : 'text-info'}`}>{m.urgent ? t('Mensaje urgente del operador', 'Urgent message from the operator') : t('Mensaje del operador', 'Message from the operator')} · <span className="text-dim">{fmtDT(m.t, lang)}</span></p>
          <p className="mt-1 text-sm">{b(m.text)}</p>
          <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[11px] text-dim">{m.to === 'all' ? t('Para toda la tripulación', 'For the entire crew') : t('Para usted', 'For you')}{col}</span>
            <button onClick={() => onAck(m.id)} className={`${btnCls} !py-1 text-xs font-semibold`}>{t('Entendido', 'Understood')}</button></div>
        </div>))}
    </div>
  );
}

/** Bandeja de mensajes: historial completo del operador hacia este tripulante. */
export function MessageInbox({ msgs, crewId, onAck, onClose }: Props & { onClose: () => void }) {
  const { t, b, lang } = useI18n(), close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/70 p-4 backdrop-blur-sm sm:items-center" onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="inbox-title" className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-xl border border-white/10 bg-panel shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3">
          <h2 id="inbox-title" className="font-semibold">{t('Mensajes del operador', 'Messages from the operator')}</h2>
          <button ref={close} onClick={onClose} className={btnCls}>{t('Cerrar (Esc)', 'Close (Esc)')}</button>
        </div>
        {msgs.length === 0 ? <p className="p-4 text-sm text-dim">{t('No hay mensajes.', 'There are no messages.')}</p> : (
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {msgs.slice(0, 30).map(m => { const read = m.ack.includes(crewId);
              return <li key={m.id} className={`rounded border-l-4 bg-white/[0.03] p-2 text-sm ${m.urgent ? 'border-crit' : 'border-info/60'}`}>
                <p className="flex flex-wrap gap-x-2 text-xs text-dim"><span className="font-mono">{fmtDT(m.t, lang)}</span>{m.urgent && <b className="text-crit">{t('Urgente', 'Urgent')}</b>}<span className={read ? 'text-ok' : 'text-warn'}>{read ? t('Leído', 'Read') : t('Sin leer', 'Unread')}</span></p>
                <p>{b(m.text)}</p>
                {!read && <button className={`${btnCls} mt-1 !py-0.5 text-xs`} onClick={() => onAck(m.id)}>{t('Entendido', 'Understood')}</button>}
              </li>; })}
          </ul>)}
      </div>
    </div>
  );
}
