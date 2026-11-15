import { useState } from 'react';
import { btnCls } from './ViewHeader';
import { useMedical } from '../context/MedicalContext';
import { CREW } from '../lib/crew';
import { fmtDT } from '../lib/history';
import { useI18n } from '../lib/i18n';
import { MEDS } from '../lib/meds';

const panel = 'rounded-lg border border-line bg-panel p-4';
const field = 'w-full rounded border border-line bg-ink/60 px-2 py-1.5 text-sm';

/** Consola del operador: envía avisos de texto a la pantalla del astronauta y modifica las dosis de los medicamentos. Solo accesible para Operador y CMO. */
export default function OperatorConsole({ from }: { from: 'operator' | 'cmo' }) {
  const { t, b, lang, col } = useI18n(), med = useMedical();
  const [to, setTo] = useState('all'), [text, setText] = useState(''), [urgent, setUrgent] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  if (!med) return null;
  const who = (id: string) => (id === 'all' ? t('Toda la tripulación', 'Entire crew') : b(CREW.find(c => c.id === id)!.name));
  const targets = (m: { to: string }) => (m.to === 'all' ? CREW.map(c => c.id) : [m.to]);
  const send = () => { med.sendMessage({ from, to, text, urgent }); setText(''); setUrgent(false); };

  return (
    <div className="grid gap-4 px-4 pb-4 lg:grid-cols-2">
      <section className={`${panel} space-y-3`} aria-label={t('Mensajes a la tripulación', 'Messages to the crew')}>
        <h2 className="text-sm font-semibold">{t('Mensajes a la tripulación', 'Messages to the crew')}</h2>
        <form className="space-y-2" onSubmit={e => { e.preventDefault(); send(); }}>
          <div className="flex flex-wrap gap-2">
            <label className="min-w-0 flex-1 text-xs text-dim">{t('Destinatario', 'Recipient')}
              <select value={to} onChange={e => setTo(e.target.value)} className={`${field} mt-1`}>
                <option value="all">{t('Toda la tripulación', 'Entire crew')}</option>
                {CREW.map(c => <option key={c.id} value={c.id}>{b(c.name)}</option>)}</select></label>
            <div className="text-xs text-dim">{t('Prioridad', 'Priority')}
              <div className="mt-1 flex overflow-hidden rounded border border-line" role="group" aria-label={t('Prioridad', 'Priority')}>
                {([[false, t('Normal', 'Normal')], [true, t('Urgente', 'Urgent')]] as [boolean, string][]).map(([u, l]) =>
                  <button type="button" key={l} aria-pressed={urgent === u} onClick={() => setUrgent(u)} className={`px-3 py-1.5 text-sm ${urgent === u ? (u ? 'bg-crit font-semibold text-ink' : 'bg-info font-semibold text-ink') : 'bg-raised text-dim'}`}>{l}</button>)}
              </div></div>
          </div>
          <label className="block text-xs text-dim">{t('Mensaje', 'Message')}
            <textarea value={text} onChange={e => setText(e.target.value)} maxLength={280} rows={3} className={`${field} mt-1 resize-none`} placeholder={t('Escriba el aviso para el astronauta…', 'Write the notice for the astronaut…')} /></label>
          <div className="flex items-center justify-between"><span className="text-xs text-dim">{text.length}/280</span>
            <button type="submit" className={btnCls} disabled={!text.trim()}>{t('Enviar a la pantalla del astronauta', 'Send to the astronaut screen')}</button></div>
        </form>
        <h3 className="border-t border-line pt-2 text-xs font-semibold text-dim">{t('Mensajes enviados', 'Sent messages')}</h3>
        {med.messages.length === 0 ? <p className="text-sm text-dim">{t('Aún no se envió ningún mensaje.', 'No message has been sent yet.')}</p> : (
          <ul className="max-h-64 space-y-1.5 overflow-y-auto">
            {med.messages.slice(0, 10).map(m => {
              const pending = targets(m).filter(id => !m.ack.includes(id));
              return (
                <li key={m.id} className={`rounded border-l-4 bg-white/[0.03] p-2 text-sm ${m.urgent ? 'border-crit' : 'border-info/60'}`}>
                  <p className="flex flex-wrap gap-x-2 text-xs text-dim"><span className="font-mono">{fmtDT(m.t, lang)}</span><span>→ {who(m.to)}</span>{m.urgent && <b className="text-crit">{t('Urgente', 'Urgent')}</b>}{m.auto && <span>{t('Automático', 'Automatic')}</span>}</p>
                  <p>{b(m.text)}</p>
                  <p className={`text-xs ${pending.length ? 'text-warn' : 'text-ok'}`}>{pending.length ? `${t('Pendiente de lectura', 'Awaiting read receipt')}${col} ${pending.map(id => who(id)).join(', ')}` : t('Leído por todos los destinatarios', 'Read by all recipients')}</p>
                </li>);
            })}
          </ul>)}
      </section>

      <section className={`${panel} space-y-3`} aria-label={t('Dosis de medicamentos', 'Medication doses')}>
        <h2 className="text-sm font-semibold">{t('Dosis de medicamentos', 'Medication doses')}</h2>
        <p className="text-xs text-dim">{t('La dosis que escriba reemplaza a la indicación predeterminada en las sugerencias y en los protocolos de emergencia, y la tripulación recibe un aviso automático.', 'The dose you enter replaces the default instruction in the suggestions and in the emergency protocols, and the crew receives an automatic notice.')}</p>
        <ul className="space-y-3">
          {MEDS.map(m => {
            const ov = med.doseOv[m.id], cur = drafts[m.id] ?? ov?.text ?? b(med.defaultDose(m.id)), changed = cur.trim() !== (ov?.text ?? b(med.defaultDose(m.id)));
            return (
              <li key={m.id} className="rounded border border-line p-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-semibold">{b(m.name)}</p>
                  {ov && <span className="text-[11px] text-info">{t('Modificada por el operador', 'Changed by the operator')} · {fmtDT(ov.t, lang)}</span>}</div>
                <p className="text-xs text-dim">{t('Predeterminada', 'Default')}{col} {b(med.defaultDose(m.id))}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <input value={cur} onChange={e => setDrafts(d => ({ ...d, [m.id]: e.target.value }))} maxLength={120} aria-label={`${t('Dosis vigente', 'Current dose')}: ${b(m.name)}`} className={`${field} min-w-0 flex-1`} />
                  <button className={btnCls} disabled={!changed || !cur.trim()} onClick={() => { med.setDose(m.id, cur, from); setDrafts(d => { const n = { ...d }; delete n[m.id]; return n; }); }}>{t('Aplicar', 'Apply')}</button>
                  {ov && <button className={btnCls} onClick={() => { med.setDose(m.id, null, from); setDrafts(d => { const n = { ...d }; delete n[m.id]; return n; }); }}>{t('Restablecer', 'Reset')}</button>}
                </div>
              </li>);
          })}
        </ul>
      </section>
    </div>
  );
}
