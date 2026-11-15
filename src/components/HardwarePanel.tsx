import { useEffect, useRef } from 'react';
import { HARDWARE } from '../lib/hardware';
import { useI18n } from '../lib/i18n';

/**
 * Ficha técnica del hardware médico a bordo: los 10 equipos se muestran a la vez en una sola cuadrícula (5 × 2),
 * sin carruseles, paginación ni barras de desplazamiento. La tipografía se escala con la altura de la ventana.
 * Se cierra con Esc, con el botón o al pulsar fuera.
 */
export default function HardwarePanel({ onClose }: { onClose: () => void }) {
  const { t, b, n, col } = useI18n();
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/75 p-2 backdrop-blur-sm sm:p-3" onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="hw-title" className="flex max-h-full w-full max-w-[96rem] flex-col rounded-xl border border-white/10 bg-panel shadow-2xl" style={{ fontSize: 'clamp(9.5px, 1.35vh, 12.5px)' }}>
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
            <h2 id="hw-title" className="font-semibold" style={{ fontSize: '1.45em' }}>{t('Hardware médico a bordo', 'Onboard medical hardware')}</h2>
            <p className="font-mono uppercase tracking-widest text-info" style={{ fontSize: '0.85em' }}>{t('Equipos catalogados', 'Cataloged devices')}{col} {n(HARDWARE.length)}</p>
          </div>
          <button ref={close} onClick={onClose} className="shrink-0 rounded-md border border-white/10 bg-white/5 px-3 py-1 hover:border-info/60">{t('Cerrar (Esc)', 'Close (Esc)')}</button>
        </div>
        <ul className="grid min-h-0 flex-1 grid-cols-2 gap-2 p-2 sm:p-3 md:grid-cols-3 lg:grid-cols-5 lg:grid-rows-2 max-lg:overflow-y-auto">
          {HARDWARE.map(h => (
            <li key={h.id} className="min-h-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] p-2.5 leading-snug">
              <span className="rounded bg-info/10 px-1.5 py-0.5 font-mono uppercase tracking-widest text-info" style={{ fontSize: '0.8em' }}>{b(h.cat)}</span>
              <h3 className="mt-1.5 font-semibold leading-tight" style={{ fontSize: '1.12em' }}>{b(h.name)}</h3>
              <p className="mt-1 text-dim">{b(h.desc)}</p>
              <ul className="mt-1.5 space-y-0.5 border-t border-white/10 pt-1.5">
                {h.specs.map(s => <li key={s.en} className="flex gap-1"><span aria-hidden className="text-info">▸</span><span>{b(s)}</span></li>)}
              </ul>
            </li>))}
        </ul>
        <p className="shrink-0 border-t border-white/10 px-4 py-1.5 text-dim" style={{ fontSize: '0.85em' }}>{t('Especificaciones ilustrativas del prototipo; no corresponden a equipos certificados para uso clínico.', 'Illustrative prototype specifications; they do not correspond to devices certified for clinical use.')}</p>
      </div>
    </div>
  );
}
