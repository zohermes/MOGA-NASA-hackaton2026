import { useEffect, useRef, useState } from 'react';
import VitalCard from '../components/VitalCard';
import ViewHeader, { btnCls } from '../components/ViewHeader';
import { useI18n } from '../lib/i18n';
import { LEVEL_UI, worst } from '../lib/thresholds';
import type { Level } from '../types/telemetry';

type Env = 'iss' | 'deep';
const ENV: Record<Env, { es: string; en: string; base: number; sigma: number; normal: number; warn: number; range: [number, number] }> = {
  iss:  { es: 'Estación Espacial', en: 'Space Station', base: 0.45, sigma: 0.02, normal: 0.5, warn: 0.8, range: [0.4, 0.5] },
  deep: { es: 'Espacio profundo y Luna', en: 'Deep space and the Moon', base: 1.25, sigma: 0.08, normal: 1.5, warn: 2.5, range: [1.0, 1.5] },
};
const CAREER_LIMIT = 600; // mSv
const BAR: Record<Level, string> = { green: 'bg-ok', yellow: 'bg-warn', red: 'bg-crit' };
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

/** Cada ciclo de 2 s simula 1 h de exposición. El acumulado parte de 180 mSv. Los umbrales de precaución son supuestos. */
export default function RadiationView({ onStatus }: { onStatus?: (s: { rate: Level; cum: Level }) => void }) {
  const { t, n, b, lv } = useI18n();
  const [env, setEnv] = useState<Env>('iss');
  const [rate, setRate] = useState(ENV.iss.base);
  const [cum, setCum] = useState(180);
  const storm = useRef(0);

  useEffect(() => {
    const e = ENV[env];
    const id = setInterval(() => {
      const r = Math.max(0, e.base + gauss() * e.sigma) * (storm.current > 0 ? 3.5 : 1);
      if (storm.current > 0) storm.current--;
      setRate(r); setCum(c => c + r / 24);
    }, 2000);
    return () => clearInterval(id);
  }, [env]);

  const e = ENV[env];
  const rateLevel: Level = rate <= e.normal ? 'green' : rate <= e.warn ? 'yellow' : 'red';
  const pct = cum / CAREER_LIMIT;
  const cumLevel: Level = pct >= 0.9 ? 'red' : pct >= 0.7 ? 'yellow' : 'green';
  useEffect(() => { onStatus?.({ rate: rateLevel, cum: cumLevel }); }, [rateLevel, cumLevel, onStatus]);
  const lvl = lv;
  const REFERENCE: [string, string, string][] = [
    [t('Fondo natural en la Tierra', 'Natural background on Earth'), t('2,4–3,0 mSv/año', '2.4–3.0 mSv/year'), t('0,008 mSv/día', '0.008 mSv/day')],
    [t('Estación Espacial', 'Space Station'), t('≈ 0,4–0,5 mSv/día', '≈ 0.4–0.5 mSv/day'), t('150–200 mSv/año', '150–200 mSv/year')],
    [t('Espacio profundo y Luna', 'Deep space and the Moon'), t('1,0–1,5 mSv/día', '1.0–1.5 mSv/day'), t('100–500 mSv', '100–500 mSv')],
    [t('Límite de carrera espacial', 'Space career limit'), '600 mSv', ''],
  ];
  const tab = (v: Env) => (
    <button onClick={() => setEnv(v)} aria-pressed={env === v}
      className={`px-3 py-1.5 text-sm ${env === v ? 'bg-info text-ink font-semibold' : 'bg-raised text-dim'}`}>{b(ENV[v])}</button>);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <ViewHeader title={t('Parámetros de radiación', 'Radiation parameters')} level={worst(rateLevel, cumLevel)}>
        <div className="flex overflow-hidden rounded border border-line" role="group" aria-label={t('Entorno', 'Environment')}>{tab('iss')}{tab('deep')}</div>
        <button className={btnCls} onClick={() => { storm.current = 5; }}>{t('Simular tormenta solar', 'Simulate solar storm')}</button>
      </ViewHeader>
      <div className="grid gap-4 md:grid-cols-2">
        <VitalCard label={t(`Tasa de dosis: ${b(e)}`, `Dose rate: ${b(e)}`)} value={n(rate, 2)} unit={t('mSv/día', 'mSv/day')} level={rateLevel} range={`${n(e.range[0], 1)}–${n(e.range[1], 1)}`} />
        <section className={`rounded-lg border p-4 ${LEVEL_UI[cumLevel].border} ${LEVEL_UI[cumLevel].bg}`}>
          <div className="flex items-baseline justify-between"><h3 className="text-sm text-dim">{t('Dosis acumulada de carrera', 'Cumulative career dose')}</h3>
            <span className={`text-xs font-semibold ${LEVEL_UI[cumLevel].text}`}>{lvl(cumLevel)}</span></div>
          <p className={`mt-2 text-4xl font-semibold ${LEVEL_UI[cumLevel].text}`}>{n(cum, 1)}<span className="ml-1 text-base font-normal text-dim">/ {CAREER_LIMIT} mSv</span></p>
          <div className="mt-3 h-2 overflow-hidden rounded bg-ink" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full ${BAR[cumLevel]}`} style={{ width: `${Math.min(100, pct * 100)}%` }} />
          </div>
          <p className="mt-1 text-xs text-dim">{t(`${n(pct * 100)} % del límite. Precaución a partir del 70 %; alerta a partir del 90 %.`, `${n(pct * 100)} % of the limit. Caution from 70 %; alert from 90 %.`)}</p>
        </section>
      </div>
      <section className="overflow-auto rounded-lg border border-line bg-panel p-4">
        <h3 className="text-sm font-semibold">{t('Valores de referencia', 'Reference values')}</h3>
        <table className="mt-2 w-full text-left text-sm">
          <thead className="text-xs text-dim"><tr><th className="py-1">{t('Entorno', 'Environment')}</th><th>{t('Dosis', 'Dose')}</th><th>{t('Equivalente', 'Equivalent')}</th></tr></thead>
          <tbody>{REFERENCE.map(([a, b, c]) => <tr key={a} className="border-t border-line"><td className="py-2">{a}</td><td>{b}</td><td className="text-dim">{c}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}
