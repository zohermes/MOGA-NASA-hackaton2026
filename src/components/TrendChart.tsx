import { useI18n } from '../lib/i18n';

interface Props {
  title: string; unit: string; days: number[]; no: number[]; suit: number[]; marks: [number, number]; lo: number; hi: number;
  current: number; point: number | null; decimals?: number; disabled?: boolean;
}
const W = 640, H = 210, L = 40, R = 10, T = 12, B = 26;
const x = (d: number) => L + (d / 180) * (W - L - R);

/** Evolución por día de misión: sin contramedidas (línea continua) frente al uso diario del Mobile Gravity Suit (línea punteada). SVG propio. */
export default function TrendChart({ title, unit, days, no, suit, marks, lo, hi, current, point, decimals = 0, disabled }: Props) {
  const { t, n } = useI18n();
  const y = (v: number) => T + (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (H - T - B);
  const line = (vs: number[]) => vs.map((v, i) => `${x(days[i]).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <figure className="rounded-lg border border-line bg-panel p-3">
      <figcaption className="mb-1 text-sm font-semibold">{title} <span className="font-normal text-dim">({unit})</span></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${title}: ${t('sin contramedidas frente a uso diario del Mobile Gravity Suit', 'without countermeasures versus daily Mobile Gravity Suit use')}`}>
        <rect x={L} y={y(marks[0])} width={W - L - R} height={Math.max(0, y(lo) - y(marks[0]))} className="fill-ok/5" />
        {marks.map((m, i) => <g key={m}><line x1={L} x2={W - R} y1={y(m)} y2={y(m)} strokeDasharray="3 3" className={i ? 'stroke-crit/60' : 'stroke-warn/60'} />
          <text x={L - 4} y={y(m) + 3} textAnchor="end" className="fill-dim text-[10px]">{n(m, decimals)}</text></g>)}
        {[0, 30, 60, 90, 120, 150, 180].map(v => <text key={v} x={x(v)} y={H - 8} textAnchor="middle" className="fill-dim text-[10px]">{v} {t('d', 'd')}</text>)}
        <line x1={x(30)} x2={x(30)} y1={T} y2={H - B} className="stroke-line" />
        <line x1={x(current)} x2={x(current)} y1={T} y2={H - B} className="stroke-info" strokeWidth="1.5" />
        {!disabled && <>
          <polyline points={line(no)} fill="none" strokeWidth="2.2" className="stroke-crit" />
          <polyline points={line(suit)} fill="none" strokeWidth="2.2" strokeDasharray="6 4" className="stroke-ok" />
          {point !== null && <circle cx={x(current)} cy={y(point)} r="4.5" className="fill-info stroke-ink" strokeWidth="1.5" />}
        </>}
        {disabled && <text x={W / 2} y={H / 2} textAnchor="middle" className="fill-dim text-[13px]">{t('OCT desactivado en este modo', 'OCT disabled in this mode')}</text>}
      </svg>
    </figure>
  );
}
