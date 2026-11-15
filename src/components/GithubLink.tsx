import { useEffect, useState } from 'react';
import { useI18n } from '../lib/i18n';

const REPO = 'https://github.com/zohermes/MOGA-NASA-hackaton2026';
const KEY = 'astro.gh.v1';
const MARK = 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z';

function Icon({ size }: { size: number }) {
  return <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true"><path d={MARK} /></svg>;
}

/** Aviso lateral sobre la versión de escritorio: aparece unos segundos después de entrar, se minimiza a una pestaña en el borde y recuerda la elección. */
export default function GithubLink() {
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [compact, setCompact] = useState(() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } });
  useEffect(() => { const id = window.setTimeout(() => setReady(true), 4000); return () => window.clearTimeout(id); }, []);
  const set = (v: boolean) => { setCompact(v); try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* sin almacenamiento */ } };
  if (!ready) return null;
  const tip = t('Ver la versión de escritorio de MOGA en GitHub', 'View the MOGA desktop version on GitHub');
  const ring = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-info';
  return (
    <aside className="toast-in fixed bottom-24 left-0 z-[45] print:hidden" aria-label={t('Versión de escritorio', 'Desktop version')}>
      {compact ? (
        <button onClick={() => set(false)} title={t('Versión de escritorio', 'Desktop version')} aria-label={t('Desplegar', 'Expand')}
          className={`flex items-center gap-2 rounded-r-xl border border-l-0 border-info/40 bg-panel/90 px-2.5 py-3 text-info shadow-lg backdrop-blur transition hover:bg-panel hover:pr-4 ${ring}`}>
          <Icon size={20} /><span className="text-sm leading-none">›</span>
        </button>
      ) : (
        <div className="relative w-64 rounded-r-xl border border-l-0 border-info/40 bg-panel/95 p-4 pr-5 shadow-xl backdrop-blur sm:w-72">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-info to-ok" aria-hidden="true" />
          <button onClick={() => set(true)} aria-label={t('Minimizar', 'Minimize')} title={t('Minimizar', 'Minimize')}
            className={`absolute right-1.5 top-1.5 rounded px-1.5 text-base leading-none text-dim hover:text-text ${ring}`}>×</button>
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-info">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-info opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-info" /></span>
            {t('Versión de escritorio', 'Desktop version')}
          </p>
          <p className="mt-2 pr-3 text-sm leading-snug text-text">{t('¿Sabías que existe una versión de escritorio que corre mucho mejor?', 'Did you know there is a desktop version that runs much better?')}</p>
          <a href={REPO} target="_blank" rel="noopener noreferrer" title={tip} aria-label={tip}
            className={`mt-3 inline-flex items-center gap-2 rounded-md border border-info/50 bg-info/10 px-3 py-1.5 text-xs font-semibold text-info transition hover:bg-info/20 ${ring}`}>
            <Icon size={14} />{t('Verla en GitHub', 'Get it on GitHub')}<span aria-hidden="true">→</span>
          </a>
        </div>
      )}
    </aside>
  );
}
