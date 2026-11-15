import { useEffect, useRef, useState } from 'react';
import LangMenu from '../components/LangMenu';
import OrbitScene, { type Dive } from '../components/OrbitScene';
import { CREW } from '../lib/crew';
import { useI18n } from '../lib/i18n';
import { PHASES, type PhaseId } from '../lib/mission';
import { LEVEL_UI } from '../lib/thresholds';
import type { Level } from '../types/telemetry';

export type Intent = 'planet' | 'stage';
export type Profile = number | 'operator' | 'cmo';
type Step = 'splash' | 'choose' | 'diving' | 'profile';
interface Props { level: Level; linkMode: 'synced' | 'delayed'; phase: PhaseId; onPhase: (p: PhaseId) => void; crewLevels: Level[]; onDone: (r: { profile: Profile; intent: Intent }) => void }

const glass = 'rounded-xl border border-white/10 bg-panel/60 backdrop-blur-xl';
const mono = 'font-mono text-[11px] uppercase tracking-[0.2em]';

/** Flujo de acceso: 1) Tierra  2) encrucijada  3) zoom cinemático  4) selección de perfil. Luego entrega el control a la app. */
export default function EntryFlow({ level, linkMode, phase, onPhase, crewLevels, onDone }: Props) {
  const { t, b, lang, lv } = useI18n();
  const [step, setStep] = useState<Step>('splash');
  const [intent, setIntent] = useState<Intent>('planet');
  const [dive, setDive] = useState<Dive | null>(null);
  const seq = useRef(0), last = useRef<'craft' | 'earth'>('earth');

  const go = (it: Intent, target: 'craft' | 'earth') => {
    if (step !== 'choose') return;
    last.current = target; setIntent(it); setStep('diving'); setDive({ target, dir: 'in', id: ++seq.current });
  };
  const back = () => { setStep('diving'); setDive({ target: last.current, dir: 'out', id: ++seq.current }); };
  const onDiveEnd = (d: Dive) => setStep(d.dir === 'in' ? 'profile' : 'choose');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && step === 'splash') setStep('choose');
      if (e.key === 'Escape') { if (step === 'choose') setStep('splash'); else if (step === 'profile') back(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const vis = (on: boolean) => `absolute inset-0 transition-opacity duration-700 ${on ? 'opacity-100' : 'pointer-events-none opacity-0'}`;

  return (
    <div className="fixed inset-0 z-40 bg-ink text-text">
      <div className="absolute inset-0"><OrbitScene level={level} linkMode={linkMode} phase={phase} lang={lang} dive={dive} onSelect={() => {}} onDiveEnd={onDiveEnd} /></div>

      <LangMenu className="absolute right-4 top-4 z-10" />

      {/* Paso 1 · Pantalla inicial (degradado oscuro bajo el texto para el contraste sobre la Tierra iluminada) */}
      <div aria-hidden className={`${vis(step === 'splash')} bg-gradient-to-t from-ink/85 via-ink/45 to-transparent`} style={{ top: '35%' }} />
      <div className={`${vis(step === 'splash')} flex flex-col items-center justify-end pb-[12vh] text-center`} aria-hidden={step !== 'splash'}>
        <p className={`${mono} text-info`}>{t('Monitoreo de salud de la tripulación', 'Crew health monitoring')}</p>
        <h1 className="mt-3 text-5xl font-medium tracking-[0.35em] text-white sm:text-7xl" style={{ textShadow: '0 2px 4px rgba(7,11,19,0.9), 0 0 28px rgba(7,11,19,0.85), 0 0 60px rgba(7,11,19,0.6)' }}>MOGA</h1>
        <p className="mt-2 text-lg tracking-wide text-white" style={{ textShadow: '0 1px 3px rgba(7,11,19,0.95), 0 0 18px rgba(7,11,19,0.8)' }}>{t('Control de Salud de la Misión', 'Mission Health Control')}</p>
        <p className="mt-3 max-w-md px-6 text-sm text-text" style={{ textShadow: '0 1px 6px rgba(7,11,19,0.95)' }}>{t('Telemetría médica en tiempo real, de la Tierra a la Estación y de regreso.', 'Real-time medical telemetry, from Earth to the Station and back.')}</p>
        <button onClick={() => setStep('choose')} tabIndex={step === 'splash' ? 0 : -1}
          className="pointer-events-auto mt-8 rounded-full border border-info/50 bg-info/10 px-8 py-2.5 text-sm tracking-wide backdrop-blur hover:bg-info/20">{t('Comenzar', 'Begin')}</button>
        <p className="mt-3 text-[11px] text-dim">{t('o pulse Intro', 'or press Enter')}</p>
      </div>

      {/* Paso 2 · Encrucijada */}
      <div className={`${vis(step === 'choose')} flex items-end justify-center px-4 pb-[8vh]`} aria-hidden={step !== 'choose'}>
        <div className="grid w-full max-w-5xl gap-4 md:grid-cols-[1fr_1.6fr]">
          <button onClick={() => go('planet', 'earth')} tabIndex={step === 'choose' ? 0 : -1} className={`${glass} p-6 text-left transition hover:border-info/60 hover:bg-panel/80`}>
            <p className={`${mono} text-info`}>{t('Opción A', 'Option A')}</p>
            <h2 className="mt-2 text-xl font-light">{t('Interactuar con el planeta', 'Interact with the planet')}</h2>
            <p className="mt-2 text-sm text-dim">{t('Acceso a la base de datos terrestre y al centro de control global.', 'Access to the ground database and the global control center.')}</p>
          </button>
          <div className={`${glass} p-6`}>
            <p className={`${mono} text-info`}>{t('Opción B', 'Option B')}</p>
            <h2 className="mt-2 text-xl font-light">{t('Seleccionar una etapa del viaje', 'Select a stage of the journey')}</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PHASES.map(p => (
                <button key={p.id} tabIndex={step === 'choose' ? 0 : -1} onClick={() => { onPhase(p.id); go('stage', 'craft'); }}
                  className={`rounded-lg border px-3 py-2.5 text-left text-sm transition hover:border-info/60 hover:bg-white/5 ${phase === p.id ? 'border-info/60 bg-info/10' : 'border-white/10'}`}>
                  <span className={`${mono} block text-info`}>{p.step}</span><span className="mt-0.5 block">{b(p.label)}</span>
                </button>))}
            </div>
            <p className="mt-3 text-xs text-dim">{b(PHASES.find(p => p.id === phase)!.blurb)}</p>
          </div>
        </div>
      </div>

      {/* Paso 3 · Animación (la escena hace el zoom) */}
      {step === 'diving' && <p role="status" className={`${mono} absolute inset-x-0 bottom-[10vh] text-center text-dim`}>{t('Estableciendo enlace…', 'Establishing link…')}</p>}

      {/* Paso 3b · Selector de perfil */}
      <div className={`${vis(step === 'profile')} flex items-center justify-center bg-ink/55 px-4 backdrop-blur-sm`} aria-hidden={step !== 'profile'}>
        <div className="w-full max-w-6xl">
          <p className={`${mono} text-center text-info`}>{intent === 'planet' ? t('Centro de control terrestre', 'Ground control center') : `${t('Etapa', 'Stage')} ${PHASES.find(p => p.id === phase)!.step} · ${b(PHASES.find(p => p.id === phase)!.label)}`}</p>
          <h2 className="mt-2 text-center text-3xl font-light">{t('¿Quién ingresa?', 'Who is signing in?')}</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {CREW.map((c, i) => (
              <button key={c.id} tabIndex={step === 'profile' ? 0 : -1} onClick={() => onDone({ profile: i, intent })} className={`${glass} p-5 text-left transition hover:border-info/60 hover:bg-panel/80`}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 font-mono text-sm text-info">{String(i + 1).padStart(2, '0')}</span>
                <p className="mt-4 font-medium">{b(c.name)}</p>
                <p className="text-sm text-dim">{b(c.role)}</p>
                <p className={`mt-3 text-xs font-semibold ${LEVEL_UI[crewLevels[i] ?? 'green'].text}`}>● {lv(crewLevels[i] ?? 'green')}</p>
              </button>))}
            <button tabIndex={step === 'profile' ? 0 : -1} onClick={() => onDone({ profile: 'cmo', intent })} className={`${glass} border-info/30 p-5 text-left transition hover:border-info/70 hover:bg-panel/80`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-info/40 font-mono text-xs text-info">CMO</span>
              <p className="mt-4 font-medium">CMO</p>
              <p className="text-sm text-dim">{t('Oficial Médico en Jefe', 'Chief Medical Officer')}</p>
              <p className="mt-3 text-xs text-dim">{t('Supervisión clínica de la tripulación', 'Clinical supervision of the crew')}</p>
            </button>
            <button tabIndex={step === 'profile' ? 0 : -1} onClick={() => onDone({ profile: 'operator', intent })} className={`${glass} border-info/30 p-5 text-left transition hover:border-info/70 hover:bg-panel/80`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-info/40 text-info">◎</span>
              <p className="mt-4 font-medium">{t('Operador', 'Operator')}</p>
              <p className="text-sm text-dim">{t('Centro de control y supervisión', 'Control center and supervision')}</p>
              <p className="mt-3 text-xs text-dim">{t('Toda la tripulación', 'Entire crew')}</p>
            </button>
          </div>
          <div className="mt-6 text-center"><button tabIndex={step === 'profile' ? 0 : -1} onClick={back} className="text-sm text-dim hover:text-text">‹ {t('Volver (Esc)', 'Back (Esc)')}</button></div>
        </div>
      </div>
    </div>
  );
}
