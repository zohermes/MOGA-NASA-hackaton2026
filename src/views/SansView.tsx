import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import RiskGauge from '../components/RiskGauge';
import TrendChart from '../components/TrendChart';
import ViewHeader, { btnCls } from '../components/ViewHeader';
import { useI18n, type Bi } from '../lib/i18n';
import {
  BASELINE, DEFAULTS, SCENARIOS, clamp, dOct, evaluate, icpEst, liveValues, lvCo2, lvDOct, lvDays, lvIcp, lvIop, lvOnh, lvOnsd, octOn,
  trajectory, withSuit, type Inputs, type Mode, type Scenario, type Tri,
} from '../lib/sans';
import { LEVEL_UI } from '../lib/thresholds';
import type { Level } from '../types/telemetry';

interface Props {
  heartRate: number | null; systolic: number | null; diastolic: number | null;
  days: number; onDays: (n: number) => void; co2: number; onCo2: (n: number) => void; onInjectBp: () => void;
  onResult?: (r: { level: Level; octOn: boolean }) => void;
}
type Local = Omit<Inputs, 'days' | 'co2'>;
const B = (es: string, en: string): Bi => ({ es, en });
const panel = 'rounded-lg border border-line bg-panel p-4';
const seg = (on: boolean) => `px-3 py-1.5 text-sm ${on ? 'bg-info text-ink font-semibold' : 'bg-raised text-dim'}`;
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const BAR: Record<Level, string> = { green: 'bg-ok', yellow: 'bg-warn', red: 'bg-crit' };
const delta = (v: number, b: number) => `${v - b >= 0 ? '+' : '−'}${Math.abs(v - b).toFixed(0)}`;

const VERDICT: Record<Level, { head: Bi; title: Bi; msg: Bi; steps: Bi[] }> = {
  green: { head: B('ESTADO OCULAR NORMAL', 'NORMAL OCULAR STATUS'), title: B('SIN PROBLEMAS DETECTADOS', 'NO PROBLEMS DETECTED'),
    msg: B('Parámetros estructurales y visuales dentro de la línea base terrestre. Continuar el monitoreo rutinario.', 'Structural and visual parameters within the Earth baseline. Continue routine monitoring.'),
    steps: [B('Mantener el uso preventivo del Mobile Gravity Suit (30 min/día).', 'Keep up preventive Mobile Gravity Suit use (30 min/day).'), B('Repetir los escaneos según el calendario habitual.', 'Repeat the scans on the usual schedule.')] },
  yellow: { head: B('PRECAUCIÓN / RIESGO TEMPRANO DE SANS', 'CAUTION / EARLY SANS RISK'), title: B('DESVIACIÓN MODERADA DETECTADA', 'MODERATE DEVIATION DETECTED'),
    msg: B('Signos iniciales de desplazamiento cefálico de fluidos o de engrosamiento retiniano. Aumentar la frecuencia de los escaneos y reforzar las contramedidas diarias.', 'Early signs of cephalad fluid shift or retinal thickening. Increase scan frequency and reinforce the daily countermeasures.'),
    steps: [B('Mobile Gravity Suit: 60 min/día.', 'Mobile Gravity Suit: 60 min/day.'), B('Completar el complejo vitamínico B y mantener el CO₂ de la cabina por debajo de 2000 ppm.', 'Complete the vitamin B complex and keep cabin CO₂ below 2000 ppm.'), B('Repetir el escaneo en 48 h.', 'Repeat the scan in 48 h.')] },
  red: { head: B('ALERTA CRÍTICA / MUY PREOCUPANTE', 'CRITICAL ALERT / HIGHLY CONCERNING'), title: B('PROBLEMA NEURO-OCULAR ACTIVO (HSRB: SANS Risk)', 'ACTIVE NEURO-OCULAR PROBLEM (HSRB: SANS Risk)'),
    msg: B('Posible papiledema, aplanamiento ocular o distensión del nervio óptico. Iniciar de inmediato el protocolo intensivo de mitigación y notificar al cirujano de vuelo (Flight Surgeon).', 'Possible papilledema, globe flattening or optic nerve distension. Start the intensive mitigation protocol immediately and notify the Flight Surgeon.'),
    steps: [B('Notificar al cirujano de vuelo ahora.', 'Notify the Flight Surgeon now.'), B('Mobile Gravity Suit: 60 min/día, en sesiones repartidas.', 'Mobile Gravity Suit: 60 min/day, in split sessions.'), B('Purgar el CO₂ de la cabina y completar el complejo vitamínico B.', 'Purge cabin CO₂ and complete the vitamin B complex.'), B('Repetir el escaneo en 24 h.', 'Repeat the scan within 24 h.')] },
};
const FLAT = [B('Ausente', 'Absent'), B('Leve', 'Mild'), B('Marcado', 'Marked')];
const FRISEN = [B('Grado 0 (bordes nítidos)', 'Grade 0 (sharp margins)'), B('Sospecha / grado bajo', 'Suspected / low grade'), B('Grado ≥ 1 (edema de disco óptico)', 'Grade ≥ 1 (optic disc edema)')];
const ACUITY = [B('Nítido', 'Sharp'), B('Leve esfuerzo', 'Slight strain'), B('Borroso', 'Blurry')];
const VITS = [B('Vitamina B6', 'Vitamin B6'), B('Vitamina B12', 'Vitamin B12'), B('Folato', 'Folate'), B('Riboflavina (B2)', 'Riboflavin (B2)')];

// ---- Importación (JSON / CSV) ----
const norm = (k: string) => k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const KEYS: Record<string, keyof Inputs> = { days: 'days', dias: 'days', co2: 'co2', octbase: 'octBase', octbasal: 'octBase', octnow: 'octNow', octactual: 'octNow', onsd: 'onsd',
  flat: 'flat', flattening: 'flat', aplanamiento: 'flat', onh: 'onh', frisen: 'frisen', iop: 'iop', pio: 'iop', acuity: 'acuity', agudeza: 'acuity' };
const RANGE: Record<keyof Inputs, [number, number]> = { mode: [0, 0], days: [0, 180], co2: [400, 5000], octBase: [60, 140], octNow: [60, 220], onsd: [3.5, 7], flat: [0, 2], onh: [0, 1.5], frisen: [0, 2], iop: [6, 35], acuity: [0, 2] };
const WORDS: Record<string, number> = { ausente: 0, absent: 0, none: 0, ninguno: 0, leve: 1, mild: 1, mild_: 1, sospecha: 1, marcado: 2, marked: 2, nitido: 0, sharp: 0, borroso: 2, blurry: 2 };
function toNum(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v ?? '').trim();
  const w = WORDS[norm(s)];
  if (w !== undefined) return w;
  const m = /-?\d+(?:[.,]\d+)?/.exec(s);
  return m ? parseFloat(m[0].replace(',', '.')) : null;
}
function parseData(text: string): Partial<Record<keyof Inputs, number>> {
  const rec: Record<string, unknown> = {};
  const src = text.trim();
  if (src.startsWith('{') || src.startsWith('[')) {
    const j = JSON.parse(src) as unknown;
    Object.assign(rec, Array.isArray(j) ? j[j.length - 1] : j);
  } else {
    const rows = src.split(/\r?\n/).filter(r => r.trim()), d = rows[0].includes(';') ? ';' : ',', cells = rows.map(r => r.split(d).map(c => c.trim()));
    if (cells.length >= 2 && cells[0].length > 2) cells[0].forEach((h, i) => { rec[h] = cells[cells.length - 1][i]; });
    else cells.forEach(c => { if (c.length >= 2) rec[c[0]] = c[1]; });
  }
  const out: Partial<Record<keyof Inputs, number>> = {};
  for (const [k, v] of Object.entries(rec)) {
    const key = KEYS[norm(k)], num = toNum(v);
    if (key && num !== null) out[key] = Math.round(clamp(num, RANGE[key][0], RANGE[key][1]) * 100) / 100;
  }
  if (!Object.keys(out).length) throw new Error('empty');
  return out;
}

/** Control numérico con deslizador y campo editable. */
function Field({ label, unit, value, min, max, step, onChange, level, disabled, dec = 1 }: { label: string; unit: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; level?: Level; disabled?: boolean; dec?: number }) {
  const { n } = useI18n();
  return (
    <label className={`block text-sm ${disabled ? 'opacity-40' : ''}`}>
      <span className="flex items-center justify-between gap-2"><span>{label}</span>
        <span className="flex items-center gap-1">
          <input type="number" min={min} max={max} step={step} value={value} disabled={disabled} aria-label={label}
            onChange={e => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) onChange(clamp(v, min, max)); }}
            className={`w-20 rounded border border-line bg-ink/60 px-1.5 py-0.5 text-right font-mono text-sm ${level ? LEVEL_UI[level].text : ''}`} />
          <span className="w-9 text-xs text-dim">{unit}</span></span></span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e => onChange(+e.target.value)} className="mt-1 w-full accent-info" aria-valuetext={`${n(value, dec)} ${unit}`} />
    </label>
  );
}
const Seg = ({ opts, value, onChange, label, b }: { opts: Bi[]; value: number; onChange: (v: Tri) => void; label: string; b: (x: Bi) => string }) => (
  <div className="flex overflow-hidden rounded border border-line" role="group" aria-label={label}>
    {opts.map((o, i) => <button key={o.en} className={`flex-1 ${seg(value === i)}`} aria-pressed={value === i} onClick={() => onChange(i as Tri)}>{b(o)}</button>)}
  </div>);

/** Evaluación ocular SANS. Se mantiene montada (oculta) al cambiar de pestaña para no perder la sesión del traje. */
export default function SansView({ heartRate, systolic, diastolic, days, onDays, co2, onCo2, onInjectBp, onResult }: Props) {
  const { t, tf, b, n, col } = useI18n();
  const [loc, setLoc] = useState<Local>(() => { const { days: _d, co2: _c, ...rest } = DEFAULTS; return rest; });
  const [suitSec, setSuitSec] = useState(0);
  const [running, setRunning] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [hour, setHour] = useState(14);
  const [vit, setVit] = useState<boolean[]>([false, false, false, false]);
  const [playing, setPlaying] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const live = useRef({ days, co2, base: loc.octBase });
  live.current = { days, co2, base: loc.octBase };
  const set = <K extends keyof Local>(k: K, v: Local[K]) => setLoc(s => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSuitSec(s => s + (turbo ? 60 : 1)), 1000);
    return () => clearInterval(id);
  }, [running, turbo]);
  // Modo en vivo: los días avanzan solos y los parámetros evolucionan; el veredicto responde en tiempo real.
  useEffect(() => {
    if (!playing || loc.mode !== 'live') return;
    const id = setInterval(() => {
      const { days: d, co2: c, base } = live.current, nd = Math.min(180, d + 1);
      onDays(nd); setLoc(s => ({ ...s, ...liveValues(nd, c, base) }));
      if (nd >= 180) setPlaying(false);
    }, 1000);
    return () => clearInterval(id);
  }, [playing, loc.mode, onDays]);

  const raw: Inputs = { ...loc, days, co2 };
  const base = evaluate(raw);
  const goal = base.level === 'green' ? 30 : 60;
  const suitMin = suitSec / 60, f = clamp(suitMin / goal);
  const eff = withSuit(raw, f), res = evaluate(eff);
  const level = res.level, v = VERDICT[level], octActive = octOn(loc.mode);
  const done = suitMin >= goal;
  const status: { level: Level | null; text: string } = done ? { level: 'green', text: t('META CUMPLIDA', 'GOAL MET') }
    : hour >= 12 ? (goal >= 60 ? { level: 'red', text: t('META DIARIA URGENTE', 'DAILY GOAL URGENT') } : { level: 'yellow', text: t('META DIARIA PENDIENTE', 'DAILY GOAL PENDING') })
    : { level: null, text: t('EN CURSO', 'IN PROGRESS') };
  // Comunica el veredicto al motor de protocolos NASA.
  useEffect(() => { onResult?.({ level, octOn: octActive }); }, [level, octActive, onResult]);
  const traj = useMemo(() => trajectory(co2, octActive), [co2, octActive]);
  const sys = systolic ?? BASELINE.sys, dia = diastolic ?? BASELINE.dia, hr = heartRate ?? BASELINE.hr;

  const apply = (s: Scenario) => {
    const { days: d, co2: c, ...rest } = s.apply as Partial<Inputs>;
    if (d !== undefined) onDays(d);
    if (c !== undefined) onCo2(c);
    setLoc(x => ({ ...x, ...rest })); setSuitSec(0); setRunning(false); setVit([false, false, false, false]); setHour(18); setPlaying(false);
    if (s.bp) onInjectBp();
  };
  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const f0 = e.target.files?.[0]; e.target.value = '';
    if (!f0) return;
    try {
      const d = parseData(await f0.text()), { days: dd, co2: cc, mode: _m, ...rest } = d;
      if (dd !== undefined) onDays(dd);
      if (cc !== undefined) onCo2(cc);
      setLoc(s => ({ ...s, ...(rest as Partial<Local>) }));
      setMsg({ ok: true, text: tf('Datos importados: {1} variables.', 'Data imported: {1} variables.', Object.keys(d).length) });
    } catch {
      setMsg({ ok: false, text: t('No se pudo leer el archivo. Use JSON o CSV con claves como days, co2, oct_base, oct_now, onsd, flattening, onh, frisen, iop.', 'The file could not be read. Use JSON or CSV with keys such as days, co2, oct_base, oct_now, onsd, flattening, onh, frisen, iop.') });
    }
  };
  const onExport = () => {
    const data = { days, co2, oct_base: loc.octBase, oct_now: loc.octNow, onsd: loc.onsd, flattening: loc.flat, onh: loc.onh, frisen: loc.frisen, iop: loc.iop, acuity: loc.acuity };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'sans-evaluacion.json'; a.click(); URL.revokeObjectURL(a.href);
  };

  const MODES: [Mode, string, string, string, string][] = [
    ['iss', 'Estación Espacial', 'Space Station', 'OCT + ecógrafo ocular: métricas en micrómetros (µm) y ultrasonido.', 'OCT + ocular ultrasound: micrometer (µm) metrics and ultrasound.'],
    ['mars', 'Nave a Marte / portátil', 'Mars vehicle / portable', 'Solo ecógrafo ocular USB (< 1 kg) y test visual. El OCT está desactivado y el diagnóstico se recalcula.', 'USB ocular ultrasound only (< 1 kg) plus the visual test. The OCT is off and the diagnosis is recalculated.'],
    ['live', 'Simulación en vivo', 'Live simulation', 'Todos los sensores activos. Mueva los controles o inicie la evolución automática de la misión.', 'All sensors active. Move the controls or start the automatic mission evolution.'],
  ];
  const modeInfo = MODES.find(m => m[0] === loc.mode)!;
  const tel: string[][] = [
    [t('Frecuencia cardíaca', 'Heart rate'), `${n(hr)} ${t('lpm', 'bpm')}`, `${BASELINE.hr} ${t('lpm', 'bpm')}`, delta(hr, BASELINE.hr)],
    [t('Presión arterial', 'Blood pressure'), `${n(sys)}/${n(dia)} mmHg`, `${BASELINE.sys}/${BASELINE.dia} mmHg`, `${t('sist.', 'syst.')} ${delta(sys, BASELINE.sys)}`],
    [t('CO₂ en la cabina', 'Cabin CO₂'), `${n(co2)} ppm`, `${BASELINE.co2} ppm`, delta(co2, BASELINE.co2)],
    [t('Presión intraocular', 'Intraocular pressure'), `${n(eff.iop, 1)} mmHg`, `${BASELINE.iop} mmHg`, delta(eff.iop, BASELINE.iop)],
    [t('Días de misión', 'Mission days'), `${days} ${t('d', 'd')}`, `0 ${t('d', 'd')}`, ''],
  ];
  const icp = icpEst(eff.onsd);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <ViewHeader title={t('Evaluación ocular (SANS)', 'Ocular assessment (SANS)')} level={level}>
        <input ref={file} type="file" accept=".json,.csv,application/json,text/csv" onChange={onImport} className="hidden" aria-label={t('Importar datos', 'Import data')} />
        <button className={btnCls} onClick={() => file.current?.click()}>{t('Importar JSON / CSV', 'Import JSON / CSV')}</button>
        <button className={btnCls} onClick={onExport}>{t('Exportar JSON', 'Export JSON')}</button>
      </ViewHeader>
      {msg && <p role="status" className={`rounded border px-3 py-1.5 text-sm ${msg.ok ? 'border-ok/50 bg-ok/10 text-ok' : 'border-crit/60 bg-crit/10 text-crit'}`}>{msg.text}</p>}

      {/* Selector de equipamiento diagnóstico */}
      <section className={panel} aria-label={t('Equipamiento diagnóstico a bordo', 'Onboard diagnostic equipment')}>
        <h3 className="text-sm font-semibold">{t('Equipamiento diagnóstico a bordo', 'Onboard diagnostic equipment')}</h3>
        <div className="mt-2 flex flex-wrap overflow-hidden rounded border border-line" role="group" aria-label={t('Modo instrumental', 'Instrument mode')}>
          {MODES.map(m => <button key={m[0]} className={seg(loc.mode === m[0])} aria-pressed={loc.mode === m[0]} onClick={() => { set('mode', m[0]); if (m[0] !== 'live') setPlaying(false); }}>{t(m[1], m[2])}</button>)}
        </div>
        <p className="mt-2 text-xs text-dim">{t(modeInfo[3], modeInfo[4])}</p>
        {loc.mode === 'live' && <button className={`${btnCls} mt-2`} onClick={() => setPlaying(p => !p)}>{playing ? t('Pausar la evolución', 'Pause the evolution') : t('Iniciar la evolución (1 día = 1 s)', 'Start the evolution (1 day = 1 s)')}</button>}
      </section>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('Escenarios de demostración', 'Demonstration scenarios')}>
        {SCENARIOS.map(s => <button key={s.label.en} className={btnCls} onClick={() => apply(s)}>{b(s.label)}</button>)}
      </div>

      {/* Veredicto autónomo */}
      <section className={`rounded-lg border-2 p-4 ${LEVEL_UI[level].border} ${LEVEL_UI[level].bg}`} aria-live="polite">
        <h3 className="text-sm text-dim">{t('Veredicto autónomo: ¿está todo en orden?', 'Autonomous verdict: is everything in order?')}</h3>
        <div className="mt-2 grid items-center gap-4 md:grid-cols-[11rem_1fr]">
          <RiskGauge value={res.risk} level={level} />
          <div>
            <p className={`font-mono text-[11px] uppercase tracking-widest ${LEVEL_UI[level].text}`}>{b(v.head)}</p>
            <p className={`text-xl font-semibold ${LEVEL_UI[level].text}`}>{b(v.title)}</p>
            <p className="mt-1 text-sm">{b(v.msg)}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t('Variables evaluadas', 'Evaluated variables')}>
              {res.findings.map(fi => <li key={fi.id} className={`rounded border px-2 py-0.5 text-xs ${LEVEL_UI[fi.level].border} ${LEVEL_UI[fi.level].bg}`}>{b(fi.label)}{col} <b className={LEVEL_UI[fi.level].text}>{fi.value}</b></li>)}
            </ul>
            <p className="mt-3 text-xs font-semibold text-dim">{t('Protocolo a ejecutar', 'Protocol to execute')}</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm">{v.steps.map(s => <li key={s.en}>{b(s)}</li>)}</ol>
            {!octActive && <p className="mt-2 text-xs text-dim">{t('Sin OCT: el índice se recalculó con el ecógrafo, el examen de fondo de ojo y la prueba visual.', 'Without OCT: the index was recalculated from the ultrasound, the fundus exam and the visual test.')}</p>}
          </div>
        </div>
      </section>

      {/* Ingesta de datos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`${panel} space-y-3`}>
          <h3 className="text-sm font-semibold">{t('Tomógrafo de coherencia óptica (OCT)', 'Optical coherence tomography (OCT)')}</h3>
          {!octActive && <p className="rounded border border-line bg-raised px-2 py-1 text-xs text-dim">{t('OCT desactivado en este modo: es un equipo pesado para viajes de larga distancia.', 'OCT disabled in this mode: it is heavy equipment for deep-space travel.')}</p>}
          <Field label={t('OCT basal (Tierra, antes del despegue)', 'Baseline OCT (Earth, before launch)')} unit="µm" value={loc.octBase} min={60} max={140} step={1} dec={0} disabled={!octActive} onChange={v2 => set('octBase', v2)} />
          <Field label={t('OCT actual (en vuelo)', 'Current OCT (in flight)')} unit="µm" value={loc.octNow} min={60} max={220} step={1} dec={0} disabled={!octActive} onChange={v2 => set('octNow', v2)} />
          <p className={`text-sm ${octActive ? '' : 'opacity-40'}`}>Δ OCT{col} <b className={LEVEL_UI[lvDOct(dOct(eff))].text}>{delta(eff.octNow, eff.octBase)} µm</b> <span className="text-xs text-dim">({t('verde < 20 · amarillo 20–54 · rojo ≥ 55', 'green < 20 · yellow 20–54 · red ≥ 55')})</span></p>
        </section>

        <section className={`${panel} space-y-3`}>
          <h3 className="text-sm font-semibold">{t('Ecógrafo ocular portátil (ultrasonido)', 'Portable ocular ultrasound')}</h3>
          <Field label={t('Diámetro de la vaina del nervio óptico (ONSD a 3 mm)', 'Optic nerve sheath diameter (ONSD at 3 mm)')} unit="mm" value={loc.onsd} min={3.5} max={7} step={0.1} level={lvOnsd(eff.onsd)} onChange={v2 => set('onsd', v2)} />
          <p className="-mt-2 text-xs text-dim">{t('Verde < 5,0 · amarillo 5,0–5,4 · rojo ≥ 5,5 (indica aumento de la presión intracraneal).', 'Green < 5.0 · yellow 5.0–5.4 · red ≥ 5.5 (indicates raised intracranial pressure).')}</p>
          <div><p className="mb-1 text-sm">{t('Aplanamiento posterior del globo ocular', 'Posterior globe flattening')}</p><Seg opts={FLAT} value={loc.flat} onChange={v2 => set('flat', v2)} label={t('Aplanamiento posterior del globo ocular', 'Posterior globe flattening')} b={b} /></div>
          <Field label={t('Elevación de la cabeza del nervio óptico (ONH)', 'Optic nerve head elevation (ONH)')} unit="mm" value={loc.onh} min={0} max={1.5} step={0.1} level={lvOnh(loc.onh)} onChange={v2 => set('onh', v2)} />
          <p className="-mt-2 text-xs text-dim">{t('Verde < 0,3 · amarillo 0,3–0,5 · rojo > 0,5 (respalda el diagnóstico de papiledema).', 'Green < 0.3 · yellow 0.3–0.5 · red > 0.5 (supports a papilledema diagnosis).')}</p>
        </section>

        <section className={`${panel} space-y-3`}>
          <h3 className="text-sm font-semibold">{t('Evaluación clínica y fisiológica complementaria', 'Complementary clinical and physiological assessment')}</h3>
          <div><p className="mb-1 text-sm">{t('Escala de Frisén (fondo de ojo)', 'Frisén scale (fundus)')}</p><Seg opts={FRISEN} value={loc.frisen} onChange={v2 => set('frisen', v2)} label={t('Escala de Frisén (fondo de ojo)', 'Frisén scale (fundus)')} b={b} /></div>
          {loc.frisen === 2 && <p role="alert" className="rounded border border-crit bg-crit/10 px-2 py-1 text-xs font-semibold text-crit">{t('Edema de disco óptico: alerta roja inmediata.', 'Optic disc edema: immediate red alert.')}</p>}
          <Field label={t('Presión intraocular (PIO)', 'Intraocular pressure (IOP)')} unit="mmHg" value={loc.iop} min={6} max={35} step={0.5} level={lvIop(loc.iop)} onChange={v2 => set('iop', v2)} />
          <p className="-mt-2 text-xs text-dim">{t('Verde 10–21 · amarillo 22 · rojo > 22.', 'Green 10–21 · yellow 22 · red > 22.')}</p>
          <div className={`rounded border px-3 py-2 ${LEVEL_UI[lvIcp(icp)].border} ${LEVEL_UI[lvIcp(icp)].bg}`}>
            <p className="text-sm">{t('Presión intracraneal estimada (PIC)', 'Estimated intracranial pressure (ICP)')}{col} <b className={LEVEL_UI[lvIcp(icp)].text}>{n(icp, 1)} mmHg</b></p>
            <p className="text-xs text-dim">{t('Calculada a partir del ONSD (modelo ilustrativo). Verde < 5,0 · amarillo moderada · rojo elevada.', 'Derived from the ONSD (illustrative model). Green < 5.0 · yellow moderate · red elevated.')}</p>
          </div>
        </section>

        <section className={`${panel} space-y-3`}>
          <h3 className="text-sm font-semibold">{t('Cabina y entorno (sincronizados con el panel)', 'Cabin and environment (synced with the dashboard)')}</h3>
          <Field label={t('Días en microgravedad', 'Days in microgravity')} unit={t('d', 'd')} value={days} min={0} max={180} step={1} dec={0} level={lvDays(days)} onChange={onDays} />
          <p className="-mt-2 text-xs text-dim">{days >= 30 ? t('Desde el día 30 aumenta el riesgo por el desplazamiento cefálico de unos 2 L de fluidos.', 'From day 30 the risk increases because of the cephalad shift of about 2 L of fluid.') : t('Antes del día 30 el efecto del desplazamiento de fluidos es reducido.', 'Before day 30 the effect of the fluid shift is small.')}</p>
          <Field label={t('CO₂ en la cabina', 'Cabin CO₂')} unit="ppm" value={co2} min={400} max={5000} step={50} dec={0} level={lvCo2(co2)} onChange={onCo2} />
          <p className="-mt-2 text-xs text-dim">{t('Verde < 2000 · amarillo 2000–2999 · rojo ≥ 3000. Por encima de 3000 ppm se produce vasodilatación cerebral y aumenta la presión detrás del ojo.', 'Green < 2000 · yellow 2000–2999 · red ≥ 3000. Above 3000 ppm, cerebral vasodilation occurs and pressure behind the eye increases.')}</p>
          <table className="w-full text-left text-xs">
            <thead className="text-dim"><tr><th className="py-1">{t('Variable', 'Variable')}</th><th>{t('Actual', 'Current')}</th><th>{t('Base', 'Baseline')}</th><th>Δ</th></tr></thead>
            <tbody>{tel.map(r => <tr key={r[0]} className="border-t border-line">{r.map((c, i) => <td key={i} className={`py-1 ${i === 3 ? 'text-dim' : ''}`}>{c}</td>)}</tr>)}</tbody>
          </table>
          <p className="text-[11px] text-dim">{t('La frecuencia cardíaca y la presión arterial provienen del flujo de la vista principal.', 'Heart rate and blood pressure come from the main view stream.')}</p>
        </section>
      </div>

      {/* Pruebas visuales */}
      <section className={panel}>
        <h3 className="text-sm font-semibold">{t('Pruebas visuales en pantalla', 'On-screen visual tests')}</h3>
        <div className="mt-3">
          <p className="text-sm">{t('Test rápido de cambio hipermetrópico (agudeza de cerca)', 'Quick hyperopic shift test (near acuity)')}</p>
          <p className="mb-2 text-xs text-dim">{t('Un cambio hacia la hipermetropía puede deberse al acortamiento axial del ojo.', 'A shift toward hyperopia may be caused by axial shortening of the eye.')}</p>
          <div className="max-w-md"><Seg opts={ACUITY} value={loc.acuity} onChange={v2 => set('acuity', v2)} label={t('Agudeza visual de cerca', 'Near visual acuity')} b={b} /></div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Mobile Gravity Suit */}
        <section className={`rounded-lg border-2 p-4 ${status.level ? `${LEVEL_UI[status.level].border} ${LEVEL_UI[status.level].bg}` : 'border-line bg-panel'}`}>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">{t('Mobile Gravity Suit: meta diaria', 'Mobile Gravity Suit: daily goal')}</h3>
            <span className={`text-xs font-semibold ${status.level ? LEVEL_UI[status.level].text : 'text-dim'}`}>{status.text}</span>
          </div>
          <p className="mt-1 text-xs text-dim">{t('Traje de presión negativa (LBNP portátil) que desplaza unos 2 L de fluidos de la cabeza hacia las piernas.', 'Negative-pressure suit (portable LBNP) that shifts about 2 L of fluid from the head toward the legs.')}</p>
          <p className="mt-2 text-5xl font-semibold">{clock(suitSec)}<span className="ml-2 text-base font-normal text-dim">/ {goal} min</span></p>
          <div className="mt-3 h-2 overflow-hidden rounded bg-ink" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(goal, Math.round(suitMin))}>
            <div className={`h-full ${BAR[status.level ?? 'green']}`} style={{ width: `${Math.min(100, (suitMin / goal) * 100)}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={btnCls} onClick={() => setRunning(r => !r)}>{running ? t('Pausar sesión del traje', 'Pause suit session') : t('Iniciar sesión del traje', 'Start suit session')}</button>
            <button className={btnCls} onClick={() => setSuitSec(s => s + 900)}>{t('+15 min (simular uso)', '+15 min (simulate use)')}</button>
            <button className={btnCls} onClick={() => { setSuitSec(0); setRunning(false); }}>{t('Reiniciar el día', 'Reset the day')}</button>
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-dim"><input type="checkbox" checked={turbo} onChange={e => setTurbo(e.target.checked)} className="accent-info" />{t('Acelerar ×60 para la demostración (1 s = 1 min)', 'Speed up ×60 for the demo (1 s = 1 min)')}</label>
          <p className="mt-2 text-xs text-dim">{tf('Meta dinámica: {1} min/día ({2}).', 'Dynamic goal: {1} min/day ({2}).', goal, goal === 60 ? t('alerta amarilla o roja', 'yellow or red alert') : t('prevención', 'prevention'))}</p>
          <label className="mt-3 block text-sm"><span className="flex justify-between"><span>{t('Hora del día (simulada)', 'Time of day (simulated)')}</span><b>{hour}:00</b></span>
            <input type="range" min={0} max={23} value={hour} onChange={e => setHour(+e.target.value)} className="mt-1 w-full accent-info" /></label>
          <p className="mt-3 text-sm">{t('Impacto', 'Impact')} {running && <span className="text-ok">({t('en vivo', 'live')})</span>}{col} {t('PIO', 'IOP')} <b className="text-ok">−{n(raw.iop - eff.iop, 1)} mmHg</b> · ONSD <b className="text-ok">−{n(raw.onsd - eff.onsd, 2)} mm</b> · {t('riesgo', 'risk')} <b className="text-ok">−{n(Math.max(0, base.risk - res.risk))} {t('puntos', 'points')}</b></p>
        </section>

        {/* Contramedidas */}
        <section className={panel}>
          <h3 className="text-sm font-semibold">{t('Suplementación con complejo vitamínico B', 'Vitamin B complex supplementation')}</h3>
          <p className="mt-1 text-xs text-dim">{t('Dosis diaria para fortalecer el endotelio vascular ocular.', 'Daily dose to support the ocular vascular endothelium.')}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {VITS.map((vv, i) => <li key={vv.en}><label className="flex items-center gap-2"><input type="checkbox" checked={vit[i]} onChange={e => setVit(a => a.map((x, j) => (j === i ? e.target.checked : x)))} className="accent-info" />{b(vv)}</label></li>)}
          </ul>
          <div className="mt-3 h-2 overflow-hidden rounded bg-ink" role="progressbar" aria-valuemin={0} aria-valuemax={4} aria-valuenow={vit.filter(Boolean).length}>
            <div className="h-full bg-ok" style={{ width: `${(vit.filter(Boolean).length / 4) * 100}%` }} />
          </div>
          <p className="mt-1 text-xs text-dim">{vit.filter(Boolean).length}/4 · {vit.every(Boolean) ? t('Dosis diaria completa.', 'Daily dose complete.') : t('Dosis diaria pendiente.', 'Daily dose pending.')}</p>
          <ul className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
            <li className="flex items-center gap-2"><span aria-hidden>{done ? '✔' : '○'}</span>{done ? t('Meta diaria del Mobile Gravity Suit cumplida', 'Mobile Gravity Suit daily goal met') : t('Meta diaria del Mobile Gravity Suit pendiente', 'Mobile Gravity Suit daily goal pending')}</li>
            <li className="flex items-center gap-2"><span aria-hidden>{co2 < 2000 ? '✔' : '○'}</span>{t('CO₂ de la cabina por debajo de 2000 ppm', 'Cabin CO₂ below 2000 ppm')}
              {co2 >= 2000 && <button className={`${btnCls} ml-auto`} onClick={() => onCo2(1800)}>{t('Purgar el CO₂ de la cabina (simular)', 'Purge cabin CO₂ (simulate)')}</button>}</li>
          </ul>
        </section>
      </div>

      {/* Gráficos comparativos */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t('Evolución por día de misión: con Mobile Gravity Suit frente a sin contramedidas', 'Evolution by mission day: with the Mobile Gravity Suit versus no countermeasures')}</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <TrendChart title={t('Engrosamiento retiniano (Δ OCT)', 'Retinal thickening (Δ OCT)')} unit="µm" days={traj.days} no={traj.octNo} suit={traj.octSuit} marks={[20, 55]} lo={0} hi={80}
            current={days} point={dOct(eff)} disabled={!octActive} />
          <TrendChart title={t('Vaina del nervio óptico (ONSD)', 'Optic nerve sheath (ONSD)')} unit="mm" days={traj.days} no={traj.onsdNo} suit={traj.onsdSuit} marks={[5.0, 5.5]} lo={4.0} hi={6.2}
            current={days} point={eff.onsd} decimals={1} />
        </div>
        <p className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-dim">
          <span><b className="text-crit">{t('Línea continua:', 'Solid line:')}</b> {t('sin contramedidas', 'no countermeasures')}</span>
          <span><b className="text-ok">{t('Línea punteada:', 'Dashed line:')}</b> {t('con uso diario del Mobile Gravity Suit', 'with daily Mobile Gravity Suit use')}</span>
          <span><b className="text-info">{t('Línea vertical azul:', 'Blue vertical line:')}</b> {t('día actual', 'current day')}</span>
        </p>
      </section>
      <p className="text-xs text-dim">{t('Modelo ilustrativo para demostración. No sustituye una evaluación oftalmológica.', 'Illustrative model for demonstration. It does not replace an ophthalmological evaluation.')}</p>
    </div>
  );
}
