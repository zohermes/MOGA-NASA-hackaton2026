import { useEffect, useRef, useState } from 'react';
import AstronautView from './views/AstronautView';
import OperatorView from './views/OperatorView';
import { useAstronautTelemetry } from './hooks/useAstronautTelemetry';
import { useAlertSound } from './hooks/useAlertSound';
import { playEmergency, playWarning, unlockAudio } from './lib/audio';
import { LEVEL_UI, worst } from './lib/thresholds';
import ParamView from './views/ParamView';
import EcgView from './views/EcgView';
import RadiationView from './views/RadiationView';
import SansView from './views/SansView';
import StationView from './views/StationView';
import LangMenu from './components/LangMenu';
import EntryFlow, { type Intent, type Profile } from './views/EntryFlow';
import { useStation } from './hooks/useStation';
import { co2Level, o2Level } from './lib/station';
import CmoView from './views/CmoView';
import ClinicalView from './views/ClinicalView';
import EmergencyModal from './components/EmergencyModal';
import AlertToasts, { type Toast } from './components/AlertToasts';
import OperatorConsole from './components/OperatorConsole';
import { MessageInbox, MessageToasts } from './components/MessageInbox';
import { useProtocols } from './hooks/useProtocols';
import { protOf } from './lib/protocols';
import NasaBanner from './components/NasaBanner';
import { buildAdvisories, type Advisory, type NLevel } from './lib/nasa';
import { MACHINES, tempLevel } from './lib/station';
import { mkBi, pickBi, tf as tfm } from './lib/i18n';
import HardwarePanel from './components/HardwarePanel';
import GroundPanel from './components/GroundPanel';
import HistoryView from './views/HistoryView';
import PharmacyView from './views/PharmacyView';
import { PHASES, type PhaseId } from './lib/mission';
import { BIOCHEM, IMAGING, type Sex } from './lib/clinical';
import { CREW } from './lib/crew';
import { MEDS, stockLevel } from './lib/meds';
import { isLang, LangContext, useI18n, type Lang } from './lib/i18n';
import type { Level } from './types/telemetry';
import { useMedicalState } from './hooks/useMedicalState';
import { MedicalContext } from './context/MedicalContext';

type View = 'clinical' | 'cmo' | 'ground' | 'astronaut' | 'operator' | 'history' | 'pharmacy' | 'biochem' | 'imaging' | 'ecg' | 'radiation' | 'sans' | 'station';
const TABS: [View, string, string][] = [
  ['cmo', 'Supervisión clínica (CMO)', 'Clinical supervision (CMO)'], ['ground', 'Centro de control terrestre', 'Ground control center'], ['astronaut', 'Astronauta', 'Astronaut'], ['operator', 'Operador', 'Operator'], ['clinical', 'Panel clínico', 'Clinical panel'],
  ['history', 'Historial médico', 'Medical history'], ['pharmacy', 'Farmacia a bordo', 'Onboard pharmacy'], ['biochem', 'Bioquímica', 'Biochemistry'],
  ['imaging', 'Imágenes', 'Imaging'], ['ecg', 'ECG', 'ECG'], ['radiation', 'Radiación', 'Radiation'], ['sans', 'Evaluación Ocular (SANS)', 'Ocular Assessment (SANS)'],
  ['station', 'Plano de la Nave / Estación', 'Ship / Station Layout'],
];

function Main() {
  const { t, b, n, lang, vital, lv, col } = useI18n();
  const [rawView, setView] = useState<View>('astronaut');
  const [entry, setEntry] = useState(true);   // flujo de acceso por pasos
  const [entryKey, setEntryKey] = useState(0);
  const [role, setRole] = useState<'astronaut' | 'operator' | 'cmo'>('astronaut');
  const [hw, setHw] = useState(false);     // ventana de hardware médico
  const [deep, setDeep] = useState(false);   // modo de misión: false = órbita (baja latencia), true = espacio profundo / Marte (alta latencia)
  const [nasaDone, setNasaDone] = useState<Record<string, NLevel>>({});
  const [nasaMin, setNasaMin] = useState(false);
  const [sansRes, setSansRes] = useState<{ level: Level; octOn: boolean } | null>(null);
  const [radRes, setRadRes] = useState<{ rate: Level; cum: Level } | null>(null);
  const [inbox, setInbox] = useState(false); // bandeja de mensajes del operador (astronauta)
  // Control de acceso: el astronauta no puede abrir las vistas de Operador, del centro de control terrestre ni del CMO.
  const canSee = (v: View) => (v === 'cmo' ? role === 'cmo' : v === 'operator' || v === 'ground' ? role !== 'astronaut' : true);
  const view: View = canSee(rawView) ? rawView : role === 'cmo' ? 'cmo' : 'astronaut';
  const [active, setActive] = useState(0);   // tripulante activo (índice en CREW)
  const [sex, setSex] = useState<Sex>('M');
  const [days, setDays] = useState(1);       // días de misión en microgravedad (compartido con SANS)
  const [co2, setCo2] = useState(600);       // CO₂ de la cabina en ppm (compartido con SANS)
  const [intervalMs, setIntervalMs] = useState(2000);
  const [soundOn, setSoundOn] = useState(false);
  const [silenced, setSilenced] = useState(false);
  const [phase, setPhase] = useState<PhaseId>('station'); // etapa de la misión: filtra la telemetría

  // Un flujo de telemetría por tripulante, todos en tiempo real; la vista muestra el activo.
  const crew = [
    useAstronautTelemetry(intervalMs, phase, CREW[0].bias),
    useAstronautTelemetry(intervalMs, phase, CREW[1].bias),
    useAstronautTelemetry(intervalMs, phase, CREW[2].bias),
  ];
  const st = useStation(co2, setCo2);
  const tel = crew[active];
  const med = useMedicalState(crew, active);
  const pr = useProtocols(crew, active, role === 'cmo' ? 'cmo' : role === 'operator' ? 'operator' : 'astronaut', med);
  const modalInc = pr.visible.find(i => !i.resolved && !i.minimized);
  const pending = pr.visible.filter(i => !i.resolved && i.minimized);
  // Avisos emergentes: uno por cada alerta nueva (amarilla o roja) de la tripulación visible para el perfil.
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenAlerts = useRef(new Set<string>()), timers = useRef(new Map<string, number>());
  const dismissToast = (key: string) => { setToasts(a => a.filter(x => x.key !== key)); window.clearTimeout(timers.current.get(key)); timers.current.delete(key); };
  const alertSig = crew.map(c => c.alerts[0]?.id ?? '').join();
  useEffect(() => {
    const fresh: Toast[] = [];
    crew.forEach((c, i) => c.alerts.forEach(a => {
      const key = `${CREW[i].id}-${a.id}`;
      if (seenAlerts.current.has(key)) return;
      seenAlerts.current.add(key);
      if (!entry && (role !== 'astronaut' || i === active) && !a.ack) fresh.push({ key, crew: i, alert: a });
    }));
    if (!fresh.length) return;
    setToasts(a => [...fresh, ...a].slice(0, 4));
    if (!soundOn) (fresh.some(f => f.alert.level === 'red') ? playEmergency : playWarning)(); // con el sonido activado, el aviso sonoro continuo ya cubre la alerta
    fresh.forEach(f => { if (f.alert.level === 'yellow') timers.current.set(f.key, window.setTimeout(() => dismissToast(f.key), 12000)); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertSig]);
  // Mensajes del operador dirigidos al astronauta activo; suenan una sola vez al llegar.
  const myMsgs = med.messages.filter(m => m.to === 'all' || m.to === CREW[active].id);
  const seenMsgs = useRef(new Set<string>());
  useEffect(() => {
    if (role !== 'astronaut' || entry) return;
    const fresh = myMsgs.filter(m => !m.ack.includes(CREW[active].id) && !seenMsgs.current.has(m.id));
    fresh.forEach(m => seenMsgs.current.add(m.id));
    if (fresh.some(m => m.urgent)) playEmergency(); else if (fresh.length) playWarning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [med.messages, role, entry, active]);
  const unread = myMsgs.filter(m => !m.ack.includes(CREW[active].id)).length;
  const crewWorst = worst(...crew.map(c => c.overall)); // el sonido responde al peor estado de toda la tripulación

  useEffect(() => setSex(CREW[active].sex), [active]);
  useEffect(() => setSilenced(false), [crewWorst]); // un cambio de nivel rearma el sonido
  useAlertSound(crewWorst, soundOn, silenced);
  useEffect(() => { document.documentElement.lang = lang; document.title = 'MOGA'; }, [lang, t]);

  const sbp = tel.latest?.systolic ?? 0, dbp = tel.latest?.diastolic ?? 0;
  const sansReasons = [
    days > 30 && t(`${days} días en microgravedad`, `${days} days in microgravity`),
    co2 > 2000 && `CO₂ ${n(co2)} ppm`,
    (sbp >= 130 || dbp >= 85) && t('presión arterial elevada', 'elevated blood pressure'),
  ].filter(Boolean) as string[];
  const critMeds = MEDS.filter(m => stockLevel(med.stock[m.id] ?? 0, m) === 'red');
  const P = PHASES.find(p => p.id === phase)!;

  // Motor de protocolos NASA: cruza cada condición de alerta de la aplicación con su nivel, acción y responsable.
  const hotM = MACHINES.filter(m => st.eff[m.id] === 'active' && tempLevel(m, st.vals[m.id].t) !== 'green');
  const latest: Record<string, true> = {};
  const fatigue = pr.evals.filter(e => e.score < 60 && !latest[`${e.crew}:${e.type}`] && (latest[`${e.crew}:${e.type}`] = true)).map(e => ({ crew: e.crew, type: e.type, score: e.score }));
  const advAll = buildAdvisories({
    crew: crew.map((c, i) => ({ id: CREW[i].id, s: c.latest })), o2: st.o2, co2: st.co2, o2Level: o2Level(st.o2), co2Level: co2Level(st.co2),
    hot: hotM.length ? { names: hotM.map(m => m.name), level: hotM.some(m => tempLevel(m, st.vals[m.id].t) === 'red') ? 'red' : 'yellow' } : null,
    sans: sansRes, rad: radRes, lowStock: critMeds.map(m => m.name),
    anomalies: med.events.filter(e => e.kind === 'anomaly' && e.severity !== 'info' && e.severity !== 'green' && e.t > Date.now() - 15 * 60_000).map(e => ({ id: e.id, crew: e.astronautId, title: e.title, sev: e.severity as Level })),
    fatigue, incidents: pr.incidents.map(i => ({ uid: i.uid, prot: i.prot, crew: i.crew, resolved: i.resolved, follow: i.follow, title: protOf(i.prot).title, start: { spo2: i.start.vitals.spo2, temperature: i.start.vitals.temperature, heartRate: i.start.vitals.heartRate } })),
  }).filter(a => role !== 'astronaut' || !a.crew || a.crew === CREW[active].id);
  const advKeys = advAll.map(a => a.key).join();
  const advisories = advAll.filter(a => !((nasaDone[a.key] ?? 0) >= a.level));
  const autoAuth = deep || tel.link.mode === 'delayed'; // alta latencia o pérdida de enlace: el CMO decide a bordo
  const topSig = advisories[0] ? `${advisories[0].key}:${advisories[0].level}` : '';
  const prevTop = useRef<{ key: string; level: number }>({ key: '', level: 0 });
  useEffect(() => {
    setNasaDone(d => { const keep = Object.fromEntries(Object.entries(d).filter(([k]) => advAll.some(a => a.key === k))); return Object.keys(keep).length === Object.keys(d).length ? d : keep; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advKeys]);
  useEffect(() => {
    const top = advisories[0];
    if (top && (top.level > prevTop.current.level || (top.key !== prevTop.current.key && top.level >= 3))) setNasaMin(false);
    prevTop.current = top ? { key: top.key, level: top.level } : { key: '', level: 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topSig]);
  const markDone = (a: Advisory) => {
    setNasaDone(d => ({ ...d, [a.key]: a.level }));
    pr.addLog(a.crew ?? CREW[active].id, 'auto', role === 'cmo' ? 'cmo' : role, mkBi(l => tfm(l, 'Protocolo NASA ejecutado (nivel {1}): {2}.', 'NASA protocol executed (level {1}): {2}.', a.level, pickBi(a.problem, l))), a.incident);
  };

  const tab = ([v, es, en]: [View, string, string]) => (
    <button key={v} onClick={() => setView(v)} aria-pressed={view === v} aria-current={view === v ? 'page' : undefined}
      className={`whitespace-nowrap border-b-2 px-3 py-1.5 text-[13px] transition-colors ${view === v ? 'border-info text-text' : 'border-transparent text-dim hover:text-text'}`}>{t(es, en)}</button>);
  const finish = (r: { profile: Profile; intent: Intent }) => {
    unlockAudio();
    if (r.profile === 'operator') setRole('operator'); else if (r.profile === 'cmo') setRole('cmo'); else { setRole('astronaut'); setActive(r.profile); }
    setView(r.profile === 'cmo' ? 'cmo' : r.profile === 'operator' ? 'operator' : 'astronaut');
    setEntry(false);
  };
  const banner = 'flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-1';

  return (
    <MedicalContext.Provider value={med}>
      <AlertToasts toasts={toasts.filter(x => !crew[x.crew].alerts.find(a => `${CREW[x.crew].id}-${a.id}` === x.key)?.ack)} incidents={pr.visible} onDismiss={dismissToast}
        onProtocol={u => pr.setMinimized(u, false)} onVitals={i => { setActive(i); setView(role === 'astronaut' ? 'astronaut' : 'clinical'); }} />
      {role === 'astronaut' && !entry && <MessageToasts msgs={myMsgs} crewId={CREW[active].id} onAck={id => med.ackMessage(id, CREW[active].id)} />}
      {inbox && role === 'astronaut' && <MessageInbox msgs={myMsgs} crewId={CREW[active].id} onAck={id => med.ackMessage(id, CREW[active].id)} onClose={() => setInbox(false)} />}
      {modalInc && !entry && <EmergencyModal inc={modalInc} P={pr} stock={med.stock} onOpenPanel={() => setView('clinical')} />}
      {hw && <HardwarePanel onClose={() => setHw(false)} />}
      {entry && <EntryFlow key={entryKey} level={crewWorst} linkMode={tel.link.mode} phase={phase} onPhase={setPhase} crewLevels={crew.map(c => c.overall)} onDone={finish} />}
      <div className="flex h-screen flex-col overflow-hidden">
        <header className="z-[28] flex min-h-[4.5rem] shrink-0 flex-col justify-center border-b border-white/10 bg-panel px-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-semibold tracking-[0.3em]">MOGA</h1>
              <span className="hidden text-xs text-dim xl:inline">{t('Monitor de signos vitales', 'Vital signs monitor')}</span>
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${LEVEL_UI[tel.overall].bg} ${LEVEL_UI[tel.overall].text}`}>{lv(tel.overall)}</span>
              <div className="hidden items-center gap-1 md:flex" role="group" aria-label={t('Etapa de la misión', 'Mission stage')}>
                {PHASES.map(p => <button key={p.id} onClick={() => setPhase(p.id)} aria-pressed={phase === p.id} title={b(p.label)}
                  className={`h-5 w-5 rounded border font-mono text-[10px] ${phase === p.id ? 'border-info/70 bg-info/20 text-text' : 'border-white/10 text-dim hover:border-info/40'}`}>{p.step}</button>)}
                <span className="ml-1 font-mono text-[10px] uppercase tracking-widest text-dim">{t(`Etapa ${P.step}/4`, `Stage ${P.step}/4`)} · {b(P.label)}</span>
              </div>
              <div className="hidden items-center overflow-hidden rounded border border-white/10 text-[10px] lg:flex" role="group" aria-label={t('Modo de misión', 'Mission mode')}>
                {([[false, 'Órbita', 'Orbit'], [true, 'Espacio profundo', 'Deep space']] as [boolean, string, string][]).map(([d, es, en]) =>
                  <button key={es} onClick={() => setDeep(d)} aria-pressed={deep === d} title={d ? t('Alta latencia: el CMO decide a bordo', 'High latency: the CMO decides onboard') : t('Baja latencia: validación del Flight Surgeon', 'Low latency: Flight Surgeon validation')}
                    className={`px-1.5 py-0.5 ${deep === d ? 'bg-info/25 text-text' : 'text-dim hover:text-text'}`}>{t(es, en)}</button>)}
              </div>
              {tel.fastKeys.length > 0 && <span role="status" className="hidden rounded border border-warn/50 bg-warn/10 px-2 py-0.5 text-[11px] text-warn lg:inline">{t('Muestreo acelerado', 'Accelerated sampling')}{col} {tel.fastKeys.map(k => vital(k).split(' (')[0]).join(', ')}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {role !== 'astronaut' ? (
                <div className="flex gap-1" role="group" aria-label={t('Tripulante activo', 'Active crew member')}>
                  {CREW.map((c, i) => (
                    <button key={c.id} onClick={() => setActive(i)} aria-pressed={active === i}
                      className={`rounded-md border px-2 py-0.5 text-xs ${active === i ? 'border-info/70 bg-info/15' : 'border-white/10 text-dim hover:border-info/40'}`}>
                      {b(c.name).replace(/^Astronaut[ae]? /, 'A')} <span className={LEVEL_UI[crew[i].overall].text}>●</span>
                      {crew[i].alerts.filter(a => !a.ack).length > 0 && <span className="ml-1 text-text" aria-label={t('alertas abiertas', 'open alerts')}>{crew[i].alerts.filter(a => !a.ack).length}</span>}
                    </button>))}
                </div>
              ) : (
                <span className="rounded-md border border-white/10 px-2 py-0.5 text-xs">{b(CREW[active].name)} · <span className="text-dim">{b(CREW[active].role)}</span></span>
              )}
              <span className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-dim">{role === 'operator' ? t('Operador', 'Operator') : role === 'cmo' ? 'CMO' : t('Astronauta', 'Astronaut')}</span>
              <button onClick={() => { setEntryKey(k => k + 1); setEntry(true); }} className="flex items-center gap-1 rounded-md border border-info/40 bg-info/10 px-2 py-0.5 text-xs text-text hover:bg-info/20">
                <span aria-hidden>⌂</span>{t('Volver al Inicio', 'Back to Start')}</button>
              {role === 'astronaut' && <button onClick={() => setInbox(true)} aria-haspopup="dialog" className="rounded-md border border-white/10 px-2 py-0.5 text-xs text-dim hover:border-info/50 hover:text-text">{t('Mensajes', 'Messages')}{unread > 0 && <b className="ml-1 rounded bg-info px-1 text-ink">{unread}</b>}</button>}
              <button onClick={() => setHw(true)} aria-haspopup="dialog" className="rounded-md border border-white/10 px-2 py-0.5 text-xs text-dim hover:border-info/50 hover:text-text">{t('Hardware médico', 'Medical hardware')}</button>
              <button onClick={() => { unlockAudio(); setSoundOn(s => !s); }} aria-pressed={soundOn} className="rounded-md border border-white/10 px-2 py-0.5 text-xs text-dim hover:text-text">
                {soundOn ? t('Sonido activado', 'Sound on') : t('Activar sonido', 'Enable sound')}
              </button>
              <LangMenu />
            </div>
          </div>
          <nav className="-mb-px flex overflow-x-auto" aria-label={t('Vista', 'View')}>{TABS.filter(x => canSee(x[0])).map(tab)}</nav>
        </header>

        <NasaBanner items={advisories} auto={autoAuth} deep={deep} minimized={nasaMin} onMinimize={setNasaMin} onDone={markDone} onProtocol={u => pr.setMinimized(u, false)} />
        {pending.map(i => (
          <div key={i.uid} role="alert" className={`${banner} border-crit bg-crit/15`}>
            <span className="text-xs font-semibold text-crit"><span className="font-mono">{i.prot}</span>{col} {b(protOf(i.prot).title)} · {b(CREW.find(c => c.id === i.crew)!.name)}</span>
            <button onClick={() => pr.setMinimized(i.uid, false)} className="rounded-md border border-crit px-2 py-0.5 text-xs font-semibold">{t('Abrir protocolo →', 'Open protocol →')}</button>
          </div>))}
        {view !== 'sans' && sansReasons.length > 0 && (
          <div role="status" className={`${banner} border-warn/50 bg-warn/10`}>
            <span className="text-xs font-semibold text-warn">{t('Riesgo ocular (SANS)', 'Ocular risk (SANS)')}{col} {sansReasons.join(' · ')}</span>
            <button onClick={() => setView('sans')} className="rounded-md border border-warn/50 px-2 py-0.5 text-xs font-semibold">{t('Abrir diagnóstico SANS →', 'Open SANS diagnosis →')}</button>
          </div>
        )}
        {view !== 'station' && (o2Level(st.o2) !== 'green' || co2Level(st.co2) === 'red') && (
          <div role="alert" className={`${banner} border-crit bg-crit/10`}>
            <span className="text-xs font-semibold text-crit">{t('Alerta ambiental a bordo', 'Onboard environmental alert')}{col} O₂ {n(st.o2, 1)} % · CO₂ {n(st.co2, 0)} ppm</span>
            <button onClick={() => setView('station')} className="rounded-md border border-crit px-2 py-0.5 text-xs font-semibold">{t('Abrir el plano →', 'Open the layout →')}</button>
          </div>
        )}
        {view !== 'pharmacy' && critMeds.length > 0 && (
          <div role="alert" className={`${banner} border-crit bg-crit/10`}>
            <span className="text-xs font-semibold text-crit">{t('Existencias críticas en la farmacia', 'Critical pharmacy supply')}{col} {critMeds.map(m => `${b(m.name)} (${med.stock[m.id]})`).join(' · ')}</span>
            <button onClick={() => setView('pharmacy')} className="rounded-md border border-crit px-2 py-0.5 text-xs font-semibold">{t('Abrir la farmacia →', 'Open the pharmacy →')}</button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* SANS y el plano permanecen montados (ocultos) para conservar la sesión y que la simulación continúe en segundo plano */}
          <div hidden={view !== 'sans'}>
            <SansView heartRate={tel.latest?.heartRate ?? null} systolic={tel.latest?.systolic ?? null} diastolic={tel.latest?.diastolic ?? null}
              days={days} onDays={setDays} co2={co2} onCo2={setCo2} onInjectBp={() => tel.injectFault('systolic')} onResult={setSansRes} />
          </div>
          <div hidden={view !== 'station'} className="h-full"><StationView st={st} /></div>
          <div hidden={view !== 'radiation'}><RadiationView onStatus={setRadRes} /></div>

          {view === 'cmo' ? <CmoView tels={crew} active={active} onActive={setActive} o2={st.o2} co2={st.co2} days={days} onGo={setView} />
            : view === 'ground' ? <div className="mx-auto max-w-6xl p-4"><GroundPanel history={tel.history} alerts={tel.alerts} link={tel.link} ackAlert={tel.ackAlert} ingested={tel.history.length} phase={phase} /></div>
            : view === 'clinical' ? <ClinicalView tels={crew} active={active} P={pr} role={role} onOpen={u => pr.setMinimized(u, false)} />
            : view === 'history' ? <HistoryView />
            : view === 'pharmacy' ? <PharmacyView canManage={role !== 'astronaut'} />
            : view === 'biochem' ? <ParamView key="biochem" title="Análisis bioquímicos" titleEn="Biochemical analysis" params={BIOCHEM} sex={sex} onSex={setSex} sexSensitive source="parche" />
            : view === 'imaging' ? <ParamView key="imaging" title="Diagnóstico por imágenes" titleEn="Diagnostic imaging" params={IMAGING} sex={sex} onSex={setSex} source="ecografía" />
            : view === 'ecg' ? <EcgView heartRate={tel.latest?.heartRate ?? null} sex={sex} onSex={setSex} />
            : view === 'astronaut' ? <AstronautView s={tel.latest} overall={tel.overall} silenced={silenced} onSilence={() => setSilenced(true)} />
            : view === 'operator' ? <><OperatorView history={tel.history} alerts={tel.alerts} link={tel.link} ackAlert={tel.ackAlert} running={tel.running} setRunning={r => crew.forEach(c => c.setRunning(r))}
                intervalMs={intervalMs} setIntervalMs={setIntervalMs} injectFault={tel.injectFault} fastKeys={tel.fastKeys} />
                <OperatorConsole from={role === 'cmo' ? 'cmo' : 'operator'} /></>
            : null}
        </div>
      </div>
    </MedicalContext.Provider>
  );
}

export default function App() {
  const [lang, setLangState] = useState<Lang>(() => { try { const v = localStorage.getItem('astro.lang'); return isLang(v) ? v : 'es'; } catch { return 'es'; } });
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem('astro.lang', l); } catch { /* sin almacenamiento */ } };
  return <LangContext.Provider value={{ lang, setLang }}><Main /></LangContext.Provider>;
}
