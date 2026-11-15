import EcgTrace from '../components/EcgTrace';
import SexToggle from '../components/SexToggle';
import VitalCard from '../components/VitalCard';
import ViewHeader, { btnCls } from '../components/ViewHeader';
import { useSimulatedParams } from '../hooks/useSimulatedParams';
import { EP_PARAMS, fmt, levelFor, plabel, punit, rangeLabel, resolve, type Sex } from '../lib/clinical';
import { useI18n } from '../lib/i18n';
import { levelOf, worst } from '../lib/thresholds';

const COLOR = { green: '#4CC9A0', yellow: '#F2B544', red: '#FF5A5F' } as const;

/** Electrocardiograma + electrofisiología. El trazado usa la frecuencia cardíaca de la telemetría en vivo. */
export default function EcgView({ heartRate, sex, onSex }: { heartRate: number | null; sex: Sex; onSex: (s: Sex) => void }) {
  const { t, n, lang } = useI18n();
  const { values, perturb } = useSimulatedParams(EP_PARAMS, sex);
  const hr = heartRate ?? 72, hrLevel = levelOf('heartRate', hr);
  const rhythm = hr > 100 ? t('Taquicardia', 'Tachycardia') : hr < 50 ? t('Bradicardia', 'Bradycardia') : t('Sinusal', 'Sinus');
  const rows = EP_PARAMS.map(p => {
    const r = resolve(p, sex), v = values[p.id] ?? r.base;
    return { p, v, level: levelFor(v, r.normal, r.warn) };
  });
  const overall = worst(hrLevel, ...rows.map(r => r.level));
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <ViewHeader title={t('Electrocardiograma y electrofisiología', 'Electrocardiogram and electrophysiology')} level={overall}>
        <SexToggle sex={sex} onSex={onSex} />
        <button className={btnCls} onClick={perturb}>{t('Simular desviación', 'Simulate deviation')}</button>
      </ViewHeader>
      <section className="rounded-lg border border-line bg-panel p-3">
        <EcgTrace heartRate={hr} color={COLOR[overall]} />
        <p className="mt-2 text-xs text-dim">{t(`Trazado simulado a ${n(hr)} lpm. Onda P, complejo QRS y onda T.`, `Simulated trace at ${n(hr)} bpm. P wave, QRS complex and T wave.`)}</p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <VitalCard label={t('Ritmo basal', 'Baseline rhythm')} value={rhythm} unit={t(`${n(hr)} lpm`, `${n(hr)} bpm`)} level={hrLevel} range={t('ritmo sinusal', 'sinus rhythm')} />
        {rows.map(({ p, v, level }) => <VitalCard key={p.id} label={plabel(p, lang)} value={fmt(v, p.decimals, lang)} unit={punit(p, lang)} level={level} range={rangeLabel(p, sex, lang)} />)}
      </div>
      <p className="text-xs text-dim">{t('Un QRS de hasta 120 ms se marca como precaución. QTc: hombres < 450 ms; mujeres < 460 ms.', 'A QRS of up to 120 ms is flagged as caution. QTc: men < 450 ms; women < 460 ms.')}</p>
    </div>
  );
}
