import { useI18n } from '../lib/i18n';
import type { Sex } from '../lib/clinical';

/** Algunos rangos de referencia dependen del sexo (hemoglobina, glóbulos rojos, QTc). */
export default function SexToggle({ sex, onSex }: { sex: Sex; onSex: (s: Sex) => void }) {
  const { t } = useI18n();
  const b = (s: Sex, label: string) => (
    <button onClick={() => onSex(s)} aria-pressed={sex === s}
      className={`px-3 py-1.5 text-sm ${sex === s ? 'bg-info text-ink font-semibold' : 'bg-raised text-dim'}`}>{label}</button>);
  return <div className="flex overflow-hidden rounded border border-line" role="group" aria-label={t('Sexo de referencia', 'Reference sex')}>{b('M', t('Hombre', 'Male'))}{b('F', t('Mujer', 'Female'))}</div>;
}
