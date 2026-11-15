import { useEffect, useRef } from 'react';
import { btnCls } from './ViewHeader';
import { useMedical } from '../context/MedicalContext';
import type { Incident, Protocols } from '../hooks/useProtocols';
import { playEmergency } from '../lib/audio';
import { CREW } from '../lib/crew';
import { useI18n } from '../lib/i18n';
import { MEDS, stockLevel } from '../lib/meds';
import { FOLLOW, protOf, type Follow } from '../lib/protocols';
import { LEVEL_UI } from '../lib/thresholds';

/** Ventana de emergencia prioritaria: ID del protocolo, lista de verificación, dosis, transmisión y seguimiento. */
export default function EmergencyModal({ inc, P, stock, onOpenPanel }: { inc: Incident; P: Protocols; stock: Record<string, number>; onOpenPanel: () => void }) {
  const { t, b, n, col, lang } = useI18n(), med = useMedical();
  const p = protOf(inc.prot), c = CREW.find(x => x.id === inc.crew)!, first = useRef<HTMLButtonElement>(null);
  const done = inc.checks.filter(Boolean).length, all = done === inc.checks.length, canClose = all && inc.follow !== null;

  // Alerta sonora repetida mientras la ventana está abierta (se puede silenciar).
  useEffect(() => {
    if (inc.muted) return;
    playEmergency();
    const id = setInterval(playEmergency, 2500);
    return () => clearInterval(id);
  }, [inc.uid, inc.muted]);
  useEffect(() => { first.current?.focus(); }, [inc.uid]);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-ink/80 p-3 backdrop-blur-sm sm:items-center">
      <div role="alertdialog" aria-modal="true" aria-labelledby="em-title" aria-describedby="em-trigger" className="w-full max-w-3xl rounded-xl border-2 border-crit bg-panel shadow-[0_0_40px_rgba(255,77,79,0.25)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-crit/40 bg-crit/15 p-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-crit motion-safe:animate-pulse">{t('Protocolo de emergencia', 'Emergency protocol')}</p>
            <h2 id="em-title" className="text-xl font-semibold"><span className="font-mono text-crit">{inc.prot}</span>{col} {b(p.title)}</h2>
            <p className="text-sm text-dim">{b(c.name)} · {b(c.role)} · {new Date(inc.t).toLocaleTimeString(lang === 'es' ? 'es-ES' : lang === 'pt' ? 'pt-BR' : lang === 'fr' ? 'fr-FR' : lang === 'it' ? 'it-IT' : 'en-US', { timeZone: 'UTC', hour12: false })} UTC</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!inc.muted && <button ref={first} className={btnCls} onClick={() => P.mute(inc.uid)}>{t('Silenciar alarma', 'Silence alarm')}</button>}
            <button className={btnCls} onClick={() => P.setMinimized(inc.uid, true)}>{t('Minimizar', 'Minimize')}</button>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[1.4fr_1fr]">
          <section aria-label={t('Lista de verificación', 'Checklist')}>
            <p id="em-trigger" className="text-sm text-dim"><b className="text-text">{t('Criterio de activación', 'Activation criteria')}{col}</b> {b(p.trigger)}</p>
            <h3 className="mt-3 flex items-baseline justify-between text-sm font-semibold"><span>{t('Lista de verificación', 'Checklist')}</span><span className="font-mono text-xs text-dim">{done}/{inc.checks.length}</span></h3>
            <div className="mt-1 h-1.5 overflow-hidden rounded bg-ink" role="progressbar" aria-valuemin={0} aria-valuemax={inc.checks.length} aria-valuenow={done}><div className="h-full bg-ok" style={{ width: `${(done / inc.checks.length) * 100}%` }} /></div>
            <ol className="mt-2 space-y-1.5">
              {p.steps.map((s, k) => (
                <li key={k}><label className={`flex cursor-pointer items-start gap-2 rounded border p-2 text-sm ${inc.checks[k] ? 'border-ok/40 bg-ok/10 text-dim' : 'border-white/10 hover:border-info/50'}`}>
                  <input type="checkbox" checked={inc.checks[k]} onChange={() => P.toggleStep(inc.uid, k)} className="mt-0.5 accent-info" />
                  <span><b className="mr-1 font-mono text-xs text-info">{k + 1}.</b>{b(s)}</span></label></li>))}
            </ol>
          </section>

          <div className="space-y-4">
            <section aria-label={t('Dosis a confirmar', 'Doses to confirm')}>
              <h3 className="text-sm font-semibold">{t('Dosis a confirmar', 'Doses to confirm')}</h3>
              <ul className="mt-1 space-y-1.5">
                {p.doses.map(d => {
                  const m = MEDS.find(x => x.id === d.medId)!, s = stock[d.medId] ?? 0, given = inc.doses.includes(d.medId);
                  return (
                    <li key={d.medId} className={`rounded border p-2 text-xs ${LEVEL_UI[stockLevel(s, m)].border}`}>
                      <p className="font-semibold">{b(m.name)} <span className="font-normal text-dim">({n(s)} {b(m.unit)})</span></p>
                      <p className="text-dim">{b(med ? med.dosage(d.medId, d.dose) : d.dose)}{med?.doseOv[d.medId] && <span className="ml-1 rounded border border-info/50 px-1 text-[10px] text-info">{t('Modificada por el operador', 'Changed by the operator')}</span>}</p>
                      <button className={`${btnCls} mt-1 !py-0.5 text-xs`} disabled={given || s <= 0} onClick={() => P.confirmDose(inc.uid, d.medId)}>
                        {given ? t('Dosis confirmada', 'Dose confirmed') : s <= 0 ? t('Sin existencias', 'Out of stock') : P.actor === 'cmo' ? t('Confirmar dosis (CMO)', 'Confirm dose (CMO)') : t('Confirmar dosis', 'Confirm dose')}</button>
                    </li>);
                })}
              </ul>
            </section>
            <section aria-label={t('Seguimiento', 'Follow-up')}>
              <h3 className="text-sm font-semibold">{t('Evolución tras la intervención', 'Evolution after the intervention')}</h3>
              <div className="mt-1 flex overflow-hidden rounded border border-line" role="group">
                {(Object.keys(FOLLOW) as Follow[]).map(f => (
                  <button key={f} aria-pressed={inc.follow === f} onClick={() => P.setFollow(inc.uid, f)}
                    className={`flex-1 px-2 py-1.5 text-xs ${inc.follow === f ? `${LEVEL_UI[FOLLOW[f].level].bg} ${LEVEL_UI[FOLLOW[f].level].text} font-semibold` : 'bg-raised text-dim'}`}>{FOLLOW[f].icon} {b(FOLLOW[f].label)}</button>))}
              </div>
            </section>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 p-4">
          <div className="flex flex-wrap gap-2">
            <button className={btnCls} onClick={() => P.transmit(inc.crew, inc.uid)}>{t('Transmitir a Tierra', 'Transmit to Earth')}</button>
            <button className={btnCls} onClick={() => { P.setMinimized(inc.uid, true); onOpenPanel(); }}>{t('Abrir el panel clínico', 'Open the clinical panel')}</button>
          </div>
          <div className="flex items-center gap-3">
            {!canClose && <span className="text-xs text-dim">{t('Complete los pasos y registre la evolución para cerrar.', 'Complete the steps and record the evolution to close.')}</span>}
            <button className={`${btnCls} ${canClose ? 'border-ok/60 bg-ok/10' : ''}`} disabled={!canClose} onClick={() => P.resolve(inc.uid)}>{t('Cerrar protocolo', 'Close protocol')}</button>
          </div>
        </div>
        <p className="px-4 pb-3 text-[11px] text-dim">{t('Protocolo ilustrativo de demostración: requiere la validación del equipo médico antes de cualquier uso real.', 'Illustrative demonstration protocol: requires validation by the medical team before any real use.')}</p>
      </div>
    </div>
  );
}
