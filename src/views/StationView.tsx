import { useState } from 'react';
import { useI18n } from '../lib/i18n';
import type { Station } from '../hooks/useStation';
import { MODULES, MACHINES, POWER_CAPACITY_KW, O2_NORMAL, o2Level, co2Level, ppmToMmHg, tempLevel, type ModuleId, type MState, type Phase } from '../lib/station';
import { LEVEL_UI, worst } from '../lib/thresholds';
import type { Level } from '../types/telemetry';

const STATE_LBL: Record<MState, [string, string]> = { active: ['Activo', 'Active'], standby: ['En espera', 'Standby'], maintenance: ['En mantenimiento', 'Maintenance'] };
const PHASE_LBL: Record<Phase, [string, string]> = { day: ['Día', 'Day'], dusk: ['Atardecer', 'Dusk'], night: ['Noche', 'Night'], dawn: ['Amanecer', 'Dawn'] };
const LVL_LBL: Record<Level, [string, string]> = { green: ['Normal', 'Normal'], yellow: ['Precaución', 'Caution'], red: ['Crítico', 'Critical'] };
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const lightTxt = (l: number): [string, string] => (l <= 0 ? ['apagadas', 'off'] : l < 1 ? [`atenuadas al ${Math.round(l * 100)} %`, `dimmed to ${Math.round(l * 100)}%`] : ['encendidas', 'on']);
const glass = 'rounded-lg border border-white/10 bg-panel';
const chip = 'rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs hover:border-info/60 hover:bg-white/10';
const seg = (on: boolean) => `px-2.5 py-1 text-xs transition-colors ${on ? 'bg-info/90 font-semibold text-ink' : 'text-dim hover:bg-white/5'}`;

/** Plano de la estación en una sola pantalla (sin desplazamiento de página): mapa, atmósfera y maquinaria a la izquierda; panel de luces a la derecha. */
export default function StationView({ st }: { st: Station }) {
  const { t, b, n, col } = useI18n();
  const L = (p: [string, string]) => t(p[0], p[1]);
  const [sel, setSel] = useState<ModuleId | null>(null);
  const [lightsOpen, setLightsOpen] = useState(true);
  const { light, eff, vals, o2, co2, modLight } = st;
  const night = light.phase === 'night';

  const modLevel = (id: ModuleId): Level => {
    const ls: Level[] = MACHINES.filter(m => m.module === id).map(m => (eff[m.id] === 'maintenance' ? 'yellow' : eff[m.id] === 'active' ? tempLevel(m, vals[m.id].t) : 'green'));
    if (id === 'ls') ls.push(o2Level(o2), co2Level(co2));
    return worst('green', ...ls);
  };
  const o2L = o2Level(o2), co2L = co2Level(co2);
  const overall = worst(o2L, co2L, ...MODULES.map(m => modLevel(m.id)));
  const totalKw = MACHINES.reduce((s, m) => s + vals[m.id].p, 0);
  const hot = MACHINES.filter(m => eff[m.id] === 'active' && tempLevel(m, vals[m.id].t) !== 'green');
  const shown = sel ? MACHINES.filter(m => m.module === sel) : MACHINES;
  const selDef = MODULES.find(m => m.id === sel);
  const stroke = (l: Level) => (l === 'red' ? '#ff5d5d' : l === 'yellow' ? '#f5b942' : night ? '#34507a' : '#5f8fd0');

  return (
    <div className="flex h-full min-h-0 gap-3 p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* Franja superior */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-medium tracking-wide">{t('Plano de la Nave / Estación', 'Ship / Station Layout')}</h2>
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${LEVEL_UI[overall].bg} ${LEVEL_UI[overall].text}`}>{L(LVL_LBL[overall])}</span>
            {night && <span role="status" className="rounded border border-info/40 bg-info/10 px-2 py-0.5 text-xs text-info">☾ {t('Modo nocturno', 'Night mode')}</span>}
          </div>
          <p className="font-mono text-xs text-dim">{hhmm(st.minutes)} UTC · {L(PHASE_LBL[light.phase])} · {t('Consumo', 'Power')} {n(totalKw, 1)}/{POWER_CAPACITY_KW} kW</p>
        </div>

        {/* Mapa */}
        <section aria-label={t('Plano de la estación', 'Station layout')} className={`${glass} relative min-h-0 flex-1 p-2`}>
          <svg viewBox="0 70 960 400" className="h-full w-full" role="group" aria-label={t('Esquema modular de la estación', 'Modular station diagram')}>
            <rect x="0" y="70" width="960" height="400" rx="8" fill={night ? '#04070d' : '#0a1220'} />
            {Array.from({ length: 24 }, (_, i) => <line key={'v' + i} x1={i * 40} y1="70" x2={i * 40} y2="470" stroke="#fff" strokeOpacity={night ? 0.012 : 0.03} />)}
            {Array.from({ length: 11 }, (_, i) => <line key={'h' + i} x1="0" y1={80 + i * 40} x2="960" y2={80 + i * 40} stroke="#fff" strokeOpacity={night ? 0.012 : 0.03} />)}
            {[[104, 270, 130, 270], [270, 270, 300, 270], [410, 270, 436, 270], [524, 270, 550, 270], [660, 270, 700, 270], [480, 190, 480, 226], [480, 314, 480, 350]].map((c, i) =>
              <line key={i} x1={c[0]} y1={c[1]} x2={c[2]} y2={c[3]} stroke="#2c3b57" strokeWidth="8" />)}
            {[[170, 130], [170, 372], [590, 130], [590, 372]].map(([x, y], i) => (
              <g key={i} opacity={night ? 0.4 : 0.8}><line x1={x + 40} y1={y < 270 ? y + 60 : y} x2={x + 40} y2={y < 270 ? 232 : 308} stroke="#2c3b57" strokeWidth="2" />
                <rect x={x} y={y} width="80" height="60" fill="#0f2747" stroke="#2a5088" strokeWidth="1" />{[20, 40, 60].map(k => <line key={k} x1={x + k} y1={y} x2={x + k} y2={y + 60} stroke="#2a5088" strokeWidth="0.6" />)}</g>))}
            {MODULES.map(m => {
              const l = modLight[m.id], ml = modLevel(m.id), on = sel === m.id, cx = m.x + m.w / 2;
              const fill = night ? '#080f1c' : '#122036';
              const glow = m.zone === 'habitat' ? (l <= 0 ? '#ff5d5d' : '#ffe9a8') : '#9fd0ff';
              const glowOp = m.zone === 'habitat' && l <= 0 ? 0.3 : 0.12 + 0.5 * l;
              const ly = m.label === 'above' ? m.y - 10 : m.label === 'below' ? m.y + m.h + 18 : m.y + m.h / 2 + 4;
              const act = () => setSel(on ? null : m.id);
              const sw = on ? 3 : 1.5, sc = on ? '#fff' : stroke(ml);
              return (
                <g key={m.id} role="button" tabIndex={0} aria-pressed={on} aria-label={b(m.name)} className="cursor-pointer outline-none focus-visible:opacity-80"
                  onClick={act} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } }}>
                  {m.id === 'hub' ? <circle cx={cx} cy={m.y + m.h / 2} r={m.w / 2} fill={fill} stroke={sc} strokeWidth={sw} />
                    : <rect x={m.x} y={m.y} width={m.w} height={m.h} rx="12" fill={fill} stroke={sc} strokeWidth={sw} />}
                  {m.zone === 'habitat' && [0.2, 0.5, 0.8].map(f => <rect key={f} x={m.x + m.w * f - 7} y={m.y + 12} width="14" height="9" rx="3" fill={glow} opacity={glowOp} />)}
                  {m.zone !== 'habitat' && m.id !== 'hub' && <rect x={m.x + 10} y={m.y + 10} width={m.w - 20} height="5" rx="2.5" fill={glow} opacity={glowOp} />}
                  {m.id === 'hub' && <circle cx={cx} cy={m.y + m.h / 2} r="13" fill={glow} opacity={glowOp} />}
                  {ml !== 'green' && <circle cx={m.x + m.w - 4} cy={m.y + 4} r="7" fill={ml === 'red' ? '#ff5d5d' : '#f5b942'} stroke="#05080f" strokeWidth="2"><title>{t('Requiere atención', 'Needs attention')}</title></circle>}
                  <text x={cx} y={ly} textAnchor="middle" fontSize="13" fill={m.label === 'inside' ? '#c9d6ea' : '#8fa3c4'} className="select-none">{b(m.short)}</text>
                </g>);
            })}
            {night && <rect x="0" y="70" width="960" height="400" fill="#000010" opacity="0.18" pointerEvents="none" />}
          </svg>
          {selDef && (
            <div className="absolute bottom-3 left-3 max-w-md rounded-md border border-white/10 bg-ink/80 px-3 py-2 text-xs backdrop-blur">
              <p className="font-medium">{b(selDef.name)} <button className="ml-2 text-info hover:underline" onClick={() => setSel(null)}>{t('Ver todos', 'Show all')}</button></p>
              <p className="text-dim">{b(selDef.desc)}</p>
              <p className="mt-1">{t('Luces', 'Lights')}{col} <b>{L(lightTxt(modLight[selDef.id]))}</b> · {t('Equipos', 'Equipment')}{col} <b>{shown.length}</b> · <b className={LEVEL_UI[modLevel(selDef.id)].text}>{L(LVL_LBL[modLevel(selDef.id)])}</b></p>
            </div>)}
        </section>

        {/* Atmósfera y maquinaria */}
        <div className="grid max-h-[40%] min-h-0 shrink-0 gap-3 lg:grid-cols-[19rem_1fr]" style={{ height: '17rem' }}>
          <section aria-label={t('Sensores ambientales', 'Environmental sensors')} className={`${glass} flex min-h-0 flex-col gap-2 overflow-y-auto p-3`}>
            <Gas label="O₂" value={n(o2, 1)} unit="%" range={`${n(O2_NORMAL[0], 1)}–${n(O2_NORMAL[1], 1)} %`} level={o2L} data={st.o2Hist} lo={18} hi={23.5} lvlTxt={L(LVL_LBL[o2L])} />
            <Gas label="CO₂" value={n(co2, 0)} unit={`ppm · ${n(ppmToMmHg(co2), 2)} mmHg`} range={t('< 2.000 ppm', '< 2,000 ppm')} level={co2L} data={st.co2Hist} lo={300} hi={3200} lvlTxt={L(LVL_LBL[co2L])} />
            {o2L !== 'green' && <Alert level={o2L} text={t(`O₂ fuera del rango seguro (${n(o2, 1)} %).`, `O₂ outside the safe range (${n(o2, 1)}%).`)}
              action={eff.oxy !== 'active' ? { label: t('Activar generador de O₂', 'Activate O₂ generator'), run: () => st.setMachine('oxy', 'active') } : undefined} />}
            {co2L !== 'green' && <Alert level={co2L} text={t(`CO₂ sobre el umbral seguro (${n(co2, 0)} ppm).`, `CO₂ above the safe threshold (${n(co2, 0)} ppm).`)}
              action={eff.scrub !== 'active' ? { label: t('Activar depurador', 'Activate scrubber'), run: () => st.setMachine('scrub', 'active') } : { label: t('Purgar CO₂', 'Purge CO₂'), run: () => st.onCo2(1800) }} />}
            {hot.length > 0 && <Alert level={worst('green', ...hot.map(m => tempLevel(m, vals[m.id].t)))} text={t(`Sobrecalentamiento: ${hot.map(m => b(m.name)).join(', ')}.`, `Overheating: ${hot.map(m => b(m.name)).join(', ')}.`)}
              action={eff.thermal !== 'active' ? { label: t('Activar control térmico', 'Activate thermal control'), run: () => st.setMachine('thermal', 'active') } : undefined} />}
            <p className="mt-auto text-[10px] leading-snug text-dim">{t('Umbrales ilustrativos; deben ser validados por el equipo de soporte vital. El CO₂ se comparte con la evaluación SANS.', 'Illustrative thresholds; to be validated by the life-support team. CO₂ is shared with the SANS assessment.')}</p>
          </section>

          <section aria-label={t('Estado de maquinaria y sistemas a bordo', 'Onboard machinery and systems status')} className={`${glass} flex min-h-0 flex-col p-3`}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium">{t('Estado de Maquinaria y Sistemas a Bordo', 'Onboard Machinery and Systems Status')}{selDef ? ` · ${b(selDef.short)}` : ''}</h3>
              <span className="text-xs text-dim">{t('Total', 'Total')}{col} <b className="text-text">{n(totalKw, 1)} kW</b> / {POWER_CAPACITY_KW} kW ({Math.round((totalKw / POWER_CAPACITY_KW) * 100)} %)</span>
            </div>
            <ul className="grid min-h-0 flex-1 content-start gap-1.5 overflow-y-auto pr-1 [grid-template-columns:repeat(auto-fill,minmax(15.5rem,1fr))]">
              {shown.map(m => {
                const tl = eff[m.id] === 'active' ? tempLevel(m, vals[m.id].t) : 'green';
                return (
                  <li key={m.id} className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
                    <p className="truncate text-xs" title={b(m.name)}>{b(m.name)}</p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                      {m.auto
                        ? <span className="text-dim" title={t('Automático según el ciclo de iluminación', 'Automatic, follows the lighting cycle')}>{L(STATE_LBL[eff[m.id]])} · {t('auto', 'auto')}</span>
                        : <select value={st.states[m.id]} onChange={e => st.setMachine(m.id, e.target.value as MState)} aria-label={`${t('Estado de', 'Status of')} ${b(m.name)}`}
                            className="rounded border border-white/10 bg-ink/60 px-1 py-0.5 text-xs">
                            {(Object.keys(STATE_LBL) as MState[]).map(s => <option key={s} value={s}>{L(STATE_LBL[s])}</option>)}
                          </select>}
                      <span className="font-mono text-dim">{n(vals[m.id].p, 2)} kW</span>
                      <span className={`font-mono font-semibold ${LEVEL_UI[tl].text}`}>{n(vals[m.id].t, 1)} °C{tl !== 'green' ? ' ▲' : ''}</span>
                    </div>
                  </li>);
              })}
            </ul>
          </section>
        </div>
      </div>

      {/* Panel de iluminación: margen derecho */}
      {lightsOpen ? (
        <aside aria-label={t('Control de iluminación', 'Lighting control')} className={`${glass} flex w-64 shrink-0 flex-col gap-3 overflow-y-auto p-3`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{t('Iluminación', 'Lighting')}</h3>
            <button className="text-xs text-dim hover:text-text" onClick={() => setLightsOpen(false)} aria-label={t('Ocultar el panel de luces', 'Hide the lighting panel')}>{t('Ocultar', 'Hide')} ›</button>
          </div>

          <div>
            <p className="font-mono text-2xl">{hhmm(st.minutes)} <span className="text-xs text-dim">UTC</span></p>
            <p className="text-xs text-dim">{L(PHASE_LBL[light.phase])} · {t('Hab.', 'Hab.')}{col} {L(lightTxt(light.habitat))}</p>
          </div>

          <div className="flex overflow-hidden rounded-md border border-white/10" role="group" aria-label={t('Origen del reloj', 'Clock source')}>
            {(['real', 'sim'] as const).map(m => <button key={m} className={`flex-1 ${seg(st.mode === m)}`} aria-pressed={st.mode === m} onClick={() => st.setMode(m)}>{m === 'real' ? t('Reloj real', 'Real clock') : t('Simulado', 'Simulated')}</button>)}
          </div>
          {st.mode === 'sim' && (
            <div className="space-y-2">
              <input type="range" min={0} max={1425} step={15} value={st.simMin} onChange={e => st.setSimMin(+e.target.value)} className="w-full accent-info" aria-label={t('Hora simulada', 'Simulated time')} />
              <div className="flex flex-wrap gap-1.5">
                <button className={chip} onClick={() => st.setSimMin((st.simMin + 60) % 1440)}>+1 h</button>
                <button className={chip} onClick={() => st.setSimMin((st.simMin + 360) % 1440)}>+6 h</button>
                <button className={chip} onClick={() => st.setSimMin(22 * 60)}>22:00</button>
              </div>
              <label className="flex items-center gap-2 text-xs text-dim"><input type="checkbox" checked={st.accel} onChange={e => st.setAccel(e.target.checked)} className="accent-info" />{t('Acelerar ×10 (1 s = 10 min)', 'Speed up ×10 (1 s = 10 min)')}</label>
            </div>)}

          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-dim">{t('Modo general', 'General mode')}</p>
            <div className="flex overflow-hidden rounded-md border border-white/10" role="group" aria-label={t('Modo de iluminación', 'Lighting mode')}>
              {([['auto', 'Automático', 'Automatic'], ['day', 'Día', 'Day'], ['night', 'Noche', 'Night']] as const).map(([k, es, en]) =>
                <button key={k} className={`flex-1 ${seg(st.lightMode === k)}`} aria-pressed={st.lightMode === k} onClick={() => st.setLightMode(k)}>{t(es, en)}</button>)}
            </div>
            <p className="mt-1 text-[10px] leading-snug text-dim">{t('Automático: de 22:00 a 06:00 se apagan las luces habitacionales; 21:00–22:00 y 06:00–07:00 se atenúan al 50 %.', 'Automatic: from 22:00 to 06:00 habitat lights switch off; 21:00–22:00 and 06:00–07:00 they dim to 50%.')}</p>
          </div>

          <div className="min-h-0">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-dim">{t('Por módulo', 'By module')}</p>
              <button className="text-[11px] text-info hover:underline" onClick={st.resetLights}>{t('Restablecer', 'Reset')}</button>
            </div>
            <ul className="space-y-1">
              {MODULES.map(m => {
                const ov = st.modOv[m.id];
                const opts: [number | null, string, string, string][] = [[null, 'Aut.', 'Auto', 'Automático'], [0, '○', '○', 'Apagadas'], [0.5, '◐', '◐', 'Atenuadas al 50 %'], [1, '●', '●', 'Encendidas']];
                return (
                  <li key={m.id} className="flex items-center justify-between gap-2">
                    <button className={`truncate text-left text-xs hover:text-info ${sel === m.id ? 'text-info' : ''}`} onClick={() => setSel(sel === m.id ? null : m.id)} title={b(m.name)}>{b(m.short)}</button>
                    <div className="flex shrink-0 overflow-hidden rounded border border-white/10" role="group" aria-label={`${t('Luces de', 'Lights of')} ${b(m.short)}`}>
                      {opts.map(([v, es, en, aria]) => {
                        const on = v === null ? ov === undefined : ov === v;
                        return <button key={String(v)} className={seg(on)} aria-pressed={on} aria-label={t(aria, aria === 'Automático' ? 'Automatic' : aria === 'Apagadas' ? 'Off' : aria === 'Encendidas' ? 'On' : 'Dimmed to 50%')}
                          onClick={() => st.setModLight(m.id, v)}>{t(es, en)}</button>;
                      })}
                    </div>
                  </li>);
              })}
            </ul>
          </div>
        </aside>
      ) : (
        <button onClick={() => setLightsOpen(true)} aria-label={t('Mostrar el panel de luces', 'Show the lighting panel')}
          className={`${glass} w-9 shrink-0 text-xs text-dim hover:text-text [writing-mode:vertical-rl]`}>‹ {t('Iluminación', 'Lighting')}</button>
      )}
    </div>
  );
}

function Gas({ label, value, unit, range, level, data, lo, hi, lvlTxt }: { label: string; value: string; unit: string; range: string; level: Level; data: number[]; lo: number; hi: number; lvlTxt: string }) {
  const { t } = useI18n(), ui = LEVEL_UI[level];
  const pts = data.map((v, i) => `${data.length < 2 ? 0 : (i / (data.length - 1)) * 100},${30 - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * 30}`).join(' ');
  return (
    <div className={`rounded-md border ${ui.border} ${ui.bg} px-3 py-2`} role="group" aria-label={`${label}: ${value} ${unit}, ${lvlTxt}`}>
      <div className="flex items-baseline justify-between"><span className="text-xs text-dim">{label}</span><span className={`text-[11px] font-semibold ${ui.text}`}>{lvlTxt}</span></div>
      <div className="flex items-end justify-between gap-2">
        <p className={`text-2xl font-semibold leading-tight ${ui.text}`}>{value}<span className="ml-1 text-[11px] font-normal text-dim">{unit}</span></p>
        <svg viewBox="0 0 100 30" className="h-7 w-20" aria-hidden><polyline points={pts} fill="none" strokeWidth="1.5" className={`stroke-current ${ui.text}`} vectorEffect="non-scaling-stroke" /></svg>
      </div>
      <p className="text-[10px] text-dim">{t('Rango normal', 'Normal range')} {range}</p>
    </div>);
}

function Alert({ level, text, action }: { level: Level; text: string; action?: { label: string; run: () => void } }) {
  const ui = LEVEL_UI[level];
  return (
    <div role={level === 'red' ? 'alert' : 'status'} className={`flex flex-wrap items-center justify-between gap-2 rounded-md border ${ui.border} ${ui.bg} px-2.5 py-1.5`}>
      <span className={`text-xs font-medium ${ui.text}`}>{text}</span>
      {action && <button onClick={action.run} className={chip}>{action.label}</button>}
    </div>);
}
