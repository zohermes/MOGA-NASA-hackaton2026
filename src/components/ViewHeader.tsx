import type { ReactNode } from 'react';
import type { Level } from '../types/telemetry';
import { useI18n } from '../lib/i18n';
import { LEVEL_UI } from '../lib/thresholds';

export const btnCls = 'rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:border-info/60 hover:bg-white/10';

export default function ViewHeader({ title, level, children }: { title: string; level: Level; children?: ReactNode }) {
  const ui = LEVEL_UI[level], { lv } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${ui.bg} ${ui.text}`}>{lv(level)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
