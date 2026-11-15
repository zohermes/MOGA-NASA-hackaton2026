import { useEffect, useRef } from 'react';
import SexToggle from '../components/SexToggle';
import VitalCard from '../components/VitalCard';
import ViewHeader, { btnCls } from '../components/ViewHeader';
import { useMedical } from '../context/MedicalContext';
import { useSimulatedParams } from '../hooks/useSimulatedParams';
import { fmt, levelFor, plabel, punit, rangeLabel, resolve, type Param, type Sex } from '../lib/clinical';
import { mkBi, tf, useI18n } from '../lib/i18n';
import { RANK, worst } from '../lib/thresholds';
import type { Level } from '../types/telemetry';

interface Props { title: string; titleEn: string; params: Param[]; sex: Sex; onSex: (s: Sex) => void; sexSensitive?: boolean; source: 'parche' | 'ecografía' }

/** Vista genérica de parámetros (bioquímica e imágenes). Una desviación clínica se registra en el historial médico. */
export default function ParamView({ title, titleEn, params, sex, onSex, sexSensitive, source }: Props) {
  const { t, lang } = useI18n(), med = useMedical();
  const { values, perturb } = useSimulatedParams(params, sex);
  const rows = params.map(p => {
    const r = resolve(p, sex), v = values[p.id] ?? r.base;
    return { p, v, level: levelFor(v, r.normal, r.warn) };
  });
  const prev = useRef<Record<string, Level>>({});
  const sig = rows.map(r => r.level).join();
  useEffect(() => {
    for (const { p, v, level } of rows) {
      const before = prev.current[p.id] ?? 'green';
      if (level !== 'green' && RANK[level] > RANK[before] && med)
        med.logClinical(source, level,
          mkBi(l => tf(l, '{1} fuera de rango', '{1} out of range', plabel(p, l))),
          mkBi(l => tf(l, '{1}: {2} {3} (referencia: {4}).', '{1}: {2} {3} (reference: {4}).', plabel(p, l), fmt(v, p.decimals, l), punit(p, l), rangeLabel(p, sex, l))));
      prev.current[p.id] = level;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <ViewHeader title={t(title, titleEn)} level={worst(...rows.map(r => r.level))}>
        {sexSensitive && <SexToggle sex={sex} onSex={onSex} />}
        <button className={btnCls} onClick={perturb}>{t('Simular desviación', 'Simulate deviation')}</button>
      </ViewHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ p, v, level }) => <VitalCard key={p.id} label={plabel(p, lang)} value={fmt(v, p.decimals, lang)} unit={punit(p, lang)} level={level} range={rangeLabel(p, sex, lang)} />)}
      </div>
      <p className="text-xs text-dim">{t('Valores de referencia para personas de 16 a 60 años. Las desviaciones clínicas se registran en el historial médico.', 'Reference values for people aged 16 to 60. Clinical deviations are recorded in the medical history.')}</p>
    </div>
  );
}
