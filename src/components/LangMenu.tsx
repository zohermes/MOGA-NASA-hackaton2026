import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { LANGS, useI18n, type Lang } from '../lib/i18n';

/** Selector de idioma desplegable (5 idiomas). Accesible: patrón "listbox" con teclado (↑ ↓ Inicio Fin Intro Esc). */
export default function LangMenu({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState(0);
  const box = useRef<HTMLDivElement>(null), btn = useRef<HTMLButtonElement>(null), opts = useRef<(HTMLButtonElement | null)[]>([]);
  const active = LANGS.find(l => l.code === lang)!;

  const openMenu = () => { setCur(Math.max(0, LANGS.findIndex(l => l.code === lang))); setOpen(true); };
  const close = (focusBtn = true) => { setOpen(false); if (focusBtn) btn.current?.focus(); };
  const pick = (c: Lang) => { setLang(c); close(); };

  useEffect(() => { if (open) opts.current[cur]?.focus(); }, [open, cur]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) close(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setCur(c => (c + 1) % LANGS.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCur(c => (c - 1 + LANGS.length) % LANGS.length); }
    else if (e.key === 'Home') { e.preventDefault(); setCur(0); }
    else if (e.key === 'End') { e.preventDefault(); setCur(LANGS.length - 1); }
    else if (e.key === 'Tab') close(false);
  };

  return (
    <div ref={box} className={`relative ${className}`}>
      <button ref={btn} type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={`${t('Idioma', 'Language')}: ${active.name}`}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={e => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); openMenu(); } }}
        className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-text transition-colors hover:border-info/50 hover:bg-white/10">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-dim" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
          <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" />
        </svg>
        <span lang={active.code}><span className="font-mono uppercase sm:hidden">{active.code}</span><span className="hidden sm:inline">{active.name}</span></span>
        <svg viewBox="0 0 12 12" className={`h-2.5 w-2.5 text-dim transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M2 4.5l4 4 4-4" /></svg>
      </button>
      {open && (
        <ul role="listbox" aria-label={t('Idioma', 'Language')} onKeyDown={onKey}
          className="absolute right-0 top-full z-[60] mt-1.5 w-44 overflow-hidden rounded-lg border border-white/10 bg-ink/90 py-1 shadow-2xl backdrop-blur-xl">
          {LANGS.map((l, i) => (
            <li key={l.code} role="presentation">
              <button ref={el => { opts.current[i] = el; }} role="option" aria-selected={lang === l.code} lang={l.code} tabIndex={cur === i ? 0 : -1} type="button"
                onClick={() => pick(l.code)} onMouseEnter={() => setCur(i)}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm outline-none transition-colors ${cur === i ? 'bg-white/10' : ''} ${lang === l.code ? 'text-info' : 'text-text'}`}>
                <span>{l.name}</span>
                <span className="font-mono text-[10px] uppercase text-dim">{lang === l.code ? '✓' : l.code}</span>
              </button>
            </li>))}
        </ul>)}
    </div>
  );
}
