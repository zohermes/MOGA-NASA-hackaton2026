import { btnCls } from './ViewHeader';
import { CREW } from '../lib/crew';
import { useI18n, type Bi } from '../lib/i18n';
import { NLEVEL, type Advisory, type NLevel } from '../lib/nasa';

interface Props {
  items: Advisory[]; auto: boolean; deep: boolean; minimized: boolean; onMinimize: (v: boolean) => void;
  onDone: (a: Advisory) => void; onProtocol: (uid: string) => void;
}
const B = (es: string, en: string): Bi => ({ es, en });
const WHO_SELF = B('Autoadministración (tripulante afectado)', 'Self-administration (affected crew member)');
const WHO_CMO = B('CMO (Crew Medical Officer): obligatorio', 'CMO (Crew Medical Officer): mandatory');
const WHO_EVAC = B('CMO (Crew Medical Officer) junto con el Flight Surgeon', 'CMO (Crew Medical Officer) together with the Flight Surgeon');
const VAL_AUTO = B('AUTORIZACIÓN AUTÓNOMA A BORDO: El CMO ejecuta sin esperar respuesta de Tierra.', 'AUTONOMOUS ONBOARD AUTHORIZATION: The CMO acts without waiting for a reply from Earth.');
const VAL_ORBIT = B('Validación remota: Flight Surgeon (Control de Misión), con baja latencia.', 'Remote validation: Flight Surgeon (Mission Control), low latency.');
const EVAC_DEEP = B('El retorno inmediato no es posible en espacio profundo: continuar el soporte vital a bordo.', 'Immediate return is not possible in deep space: continue life support onboard.');
const tone = (l: NLevel) => (l >= 3 ? { box: 'border-crit bg-crit/10', text: 'text-crit', badge: 'bg-crit text-ink' } : { box: 'border-warn bg-warn/10', text: 'text-warn', badge: 'bg-warn text-ink' });

/** Responsable según el nivel y la latencia: autoadministración (nivel 1), CMO (niveles 2 a 4) y validación remota o autorización autónoma. */
export function authority(a: Advisory, auto: boolean): { who: Bi; val: Bi | null } {
  const who = a.level === 4 ? WHO_EVAC : a.level >= 2 || a.cmo ? WHO_CMO : WHO_SELF;
  return { who, val: a.level === 1 && !a.cmo ? null : auto ? VAL_AUTO : VAL_ORBIT };
}

/** Cartel de protocolos NASA: prioriza el problema de mayor nivel, indica acción y responsable, y lista los demás de forma compacta. */
export default function NasaBanner({ items, auto, deep, minimized, onMinimize, onDone, onProtocol }: Props) {
  const { t, tf, b, col } = useI18n();
  if (!items.length) return null;
  const top = items[0], rest = items.slice(1), tn = tone(top.level), a = authority(top, auto);
  const crewName = (id?: string) => (id ? b(CREW.find(c => c.id === id)!.name) : t('Nave', 'Ship'));
  const badge = (l: NLevel) => <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${tone(l).badge}`}>{tf('NIVEL {1}', 'LEVEL {1}', l)}</span>;

  if (minimized) return (
    <div role="alert" className={`relative flex shrink-0 flex-wrap items-center gap-2 border-b-2 px-4 py-1 ${tn.box}`}>
      {top.level >= 3 && <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-crit motion-safe:animate-pulse" />}
      {badge(top.level)}<span className="min-w-0 flex-1 truncate text-xs font-semibold">{crewName(top.crew)} · {b(top.problem)}{rest.length > 0 && <span className="ml-2 text-dim">+{rest.length}</span>}</span>
      <button className="rounded-md border border-white/20 px-2 py-0.5 text-xs" onClick={() => onMinimize(false)}>{t('Desplegar protocolo NASA', 'Expand NASA protocol')}</button>
    </div>);

  return (
    <section role="alert" aria-label={t('Protocolo médico NASA', 'NASA medical protocol')} className={`relative max-h-[40vh] shrink-0 overflow-y-auto border-b-2 px-4 py-2 ${tn.box}`}>
      {top.level >= 3 && <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-crit motion-safe:animate-pulse" />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
          {badge(top.level)}<b className={tn.text}>{b(NLEVEL[top.level])}</b>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px]">{b(top.cat)}</span><span className="text-dim">{crewName(top.crew)}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {top.incident && <button className={`${btnCls} !border-crit/70 !py-0.5 text-xs font-semibold`} onClick={() => onProtocol(top.incident!)}>{t('Abrir protocolo →', 'Open protocol →')}</button>}
          <button className={`${btnCls} !py-0.5 text-xs`} onClick={() => onMinimize(true)}>{t('Minimizar', 'Minimize')}</button>
          <button className={`${btnCls} !border-ok/60 !py-0.5 text-xs`} onClick={() => onDone(top)}>{t('Protocolo ejecutado', 'Protocol executed')}</button>
        </div>
      </div>
      <div className="mt-1.5 grid gap-x-4 gap-y-1 text-sm lg:grid-cols-3">
        <p><b className="text-xs uppercase tracking-wider text-dim">{t('Problema', 'Problem')}{col}</b> <span className="font-semibold">{b(top.problem)}</span></p>
        <p><b className="text-xs uppercase tracking-wider text-dim">{t('Acción inmediata', 'Immediate action')}{col}</b> {b(top.action)}</p>
        <p><b className="text-xs uppercase tracking-wider text-dim">{t('Responsable', 'Responsible')}{col}</b> <span className="font-semibold">{b(a.who)}</span>
          {a.val && <span className={`block text-xs ${auto ? 'font-semibold text-warn' : 'text-dim'}`}>{b(a.val)}</span>}
          {top.level === 4 && deep && <span className="block text-xs text-warn">{b(EVAC_DEEP)}</span>}</p>
      </div>
      {rest.length > 0 && (
        <details className="mt-2" open={rest.length <= 3}>
          <summary className="cursor-pointer text-xs text-dim">{tf('Otros problemas activos ({1})', 'Other active problems ({1})', rest.length)}</summary>
          <ul className="mt-1 space-y-1">
            {rest.map(r => (
              <li key={r.key} className="flex flex-wrap items-center gap-2 rounded border border-white/10 bg-ink/40 px-2 py-1 text-xs">
                {badge(r.level)}<span className="min-w-0 flex-1"><b>{crewName(r.crew)}</b> · {b(r.problem)} <span className="text-dim">— {b(authority(r, auto).who)}</span></span>
                {r.incident && <button className="rounded border border-crit/70 px-1.5 py-0.5" onClick={() => onProtocol(r.incident!)}>{t('Abrir protocolo →', 'Open protocol →')}</button>}
                <button className="rounded border border-white/20 px-1.5 py-0.5" onClick={() => onDone(r)}>{t('Protocolo ejecutado', 'Protocol executed')}</button>
              </li>))}
          </ul>
        </details>)}
    </section>
  );
}
