import { useI18n } from '../lib/i18n';
import type { Level } from '../types/telemetry';
import { LEVEL_UI } from '../lib/thresholds';

interface Props { title: string; unit: string; data: number[]; normal: [number, number]; warn: [number, number]; level: Level; decimals?: number }

/** Serie temporal en SVG puro (sin dependencias). La banda sombreada es el rango normal. */
export default function TimeSeriesChart({ title, unit, data, normal, warn, level, decimals = 1 }: Props) {
  const { t, n } = useI18n();
  const W = 320, H = 100;
  const lo = Math.min(warn[0], ...data), hi = Math.max(warn[1], ...data), pad = (hi - lo) * 0.08;
  const y = (v: number) => H - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * H;
  const x = (i: number) => (data.length < 2 ? 0 : (i / (data.length - 1)) * W);
  const pts = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = data[data.length - 1];
  return (
    <figure className="rounded-lg border border-line bg-panel p-3">
      <figcaption className="flex items-baseline justify-between text-sm">
        <span className="text-dim">{title}</span>
        <span className={`font-semibold ${LEVEL_UI[level].text}`}>{last === undefined ? '—' : n(last, decimals)} {unit}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-24 w-full" role="img" aria-label={t(`Serie temporal de ${title}`, `Time series of ${title}`)}>
        <rect x="0" y={y(normal[1])} width={W} height={y(normal[0]) - y(normal[1])} className="fill-ok/10" />
        <polyline points={pts} fill="none" strokeWidth="1.8" strokeLinejoin="round" className={`stroke-current ${LEVEL_UI[level].text}`} />
      </svg>
    </figure>
  );
}
