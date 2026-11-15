import { useI18n } from '../lib/i18n';
import type { Level } from '../types/telemetry';
import { LEVEL_UI } from '../lib/thresholds';

export default function RiskGauge({ value, level }: { value: number; level: Level }) {
  const { t } = useI18n();
  const R = 54, C = 2 * Math.PI * R;
  return (
    <div className="relative mx-auto h-40 w-40">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" role="img" aria-label={t(`Índice de riesgo SANS: ${Math.round(value)} por ciento`, `SANS risk index: ${Math.round(value)} percent`)}>
        <circle cx="70" cy="70" r={R} fill="none" strokeWidth="12" className="stroke-line" />
        <circle cx="70" cy="70" r={R} fill="none" strokeWidth="12" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - value / 100)}
          className={`stroke-current ${LEVEL_UI[level].text}`} style={{ transition: 'stroke-dashoffset .4s' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-semibold ${LEVEL_UI[level].text}`}>{Math.round(value)} %</span>
        <span className="text-xs text-dim">{t('Riesgo SANS', 'SANS risk')}</span>
      </div>
    </div>
  );
}
