import { useI18n } from '../lib/i18n';
import type { Level } from '../types/telemetry';
import { LEVEL_UI } from '../lib/thresholds';

interface Props { label: string; value: string; unit: string; level: Level; range: string; large?: boolean }

/** El estado se comunica con color + texto + borde, nunca solo con color. */
export default function VitalCard({ label, value, unit, level, range, large }: Props) {
  const { t, lv } = useI18n(), ui = LEVEL_UI[level];
  return (
    <section aria-label={`${label}: ${value} ${unit}, ${lv(level)}`}
      className={`rounded-lg border ${ui.border} ${ui.bg} p-4 ${level === 'red' ? 'motion-safe:animate-pulse' : ''}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm text-dim">{label}</h3>
        <span className={`text-xs font-semibold ${ui.text}`}>{lv(level)}</span>
      </div>
      <p className={`mt-2 font-semibold ${ui.text} ${large ? 'text-6xl' : 'text-4xl'}`}>
        {value}<span className="ml-1 text-base font-normal text-dim">{unit}</span>
      </p>
      <p className="mt-1 text-xs text-dim">{t('Rango normal', 'Normal range')} {range}</p>
    </section>
  );
}
