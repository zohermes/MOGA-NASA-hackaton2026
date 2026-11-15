import { createContext, useContext } from 'react';
import { LEVEL_UI, THRESHOLDS } from './thresholds';
import { TR } from './translations';
import type { Level, VitalKey } from '../types/telemetry';

export type Lang = 'es' | 'en' | 'fr' | 'it' | 'pt';
/** Idiomas disponibles: nombre en su propia lengua, configuración regional para números y fechas, y orden en TR. */
export const LANGS: { code: Lang; name: string; loc: string }[] = [
  { code: 'es', name: 'Español', loc: 'es-ES' },
  { code: 'en', name: 'English', loc: 'en-US' },
  { code: 'fr', name: 'Français', loc: 'fr-FR' },
  { code: 'it', name: 'Italiano', loc: 'it-IT' },
  { code: 'pt', name: 'Português', loc: 'pt-BR' },
];
export const LANG_CODES = LANGS.map(l => l.code);
export const isLang = (v: unknown): v is Lang => LANG_CODES.includes(v as Lang);
export const localeOf = (l: Lang) => LANGS.find(x => x.code === l)!.loc;

/** Texto multilingüe. `es` y `en` son obligatorios; el resto se resuelve con el diccionario TR (clave: el texto en español). */
export interface Bi { es: string; en: string; fr?: string; it?: string; pt?: string }

export const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'es', setLang: () => {} });

// --- Búsqueda: coincidencia exacta y, si no, plantillas con marcadores {1}, {2}… (cadenas con valores interpolados) ---
const IDX = { fr: 0, it: 1, pt: 2 } as const;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let PATTERNS: { re: RegExp; key: string }[] | null = null;
const patterns = () => PATTERNS ??= Object.keys(TR).filter(k => /\{\d\}/.test(k)).sort((a, b) => b.length - a.length).map(k => ({
  key: k, re: new RegExp('^' + k.split(/(\{\d\})/).map(p => (/^\{\d\}$/.test(p) ? '([\\s\\S]+?)' : esc(p))).join('') + '$'),
}));
const fill = (tpl: string, args: (string | number)[]) => tpl.replace(/\{(\d)\}/g, (_, i) => String(args[+i - 1] ?? ''));
const cache = new Map<string, string>();
const warned = new Set<string>();

/** Traduce una cadena escrita en español (con su versión en inglés como respaldo). */
export function tr(lang: Lang, es: string, en: string): string {
  if (lang === 'es') return es;
  if (lang === 'en') return en;
  const ck = lang + '\u0000' + es, hit = cache.get(ck);
  if (hit !== undefined) return hit;
  const i = IDX[lang];
  let out = TR[es]?.[i];
  if (out === undefined) {
    for (const p of patterns()) {
      const m = p.re.exec(es);
      if (m) { out = fill(TR[p.key][i], m.slice(1)); break; }
    }
  }
  if (out === undefined) {
    out = en;
    const meta = import.meta as unknown as { env?: { DEV?: boolean } };
    if (meta.env?.DEV && !warned.has(es)) { warned.add(es); console.warn(`[i18n] Falta la traducción (${lang}):`, es); }
  }
  cache.set(ck, out);
  return out;
}

/** Plantilla con marcadores {1}, {2}…; es/en llevan sus propios marcadores y el resto se busca por la plantilla en español. */
export function tf(lang: Lang, es: string, en: string, ...args: (string | number)[]): string {
  const base = lang === 'es' ? es : lang === 'en' ? en : (TR[es]?.[IDX[lang]] ?? en);
  return fill(base, args);
}

/** Construye un texto multilingüe evaluando `f` en cada idioma (para eventos creados en tiempo de ejecución). */
export const mkBi = (f: (l: Lang) => string): Bi => Object.fromEntries(LANG_CODES.map(l => [l, f(l)])) as unknown as Bi;
export const pickBi = (x: Bi, lang: Lang): string => x[lang] ?? tr(lang, x.es, x.en);

export const vitalLabel = (k: VitalKey, lang: Lang) => tr(lang, THRESHOLDS[k].label, THRESHOLDS[k].labelEn);
export const vitalUnit = (k: VitalKey, lang: Lang) => tr(lang, THRESHOLDS[k].unit, THRESHOLDS[k].unitEn);
export const levelLabel = (l: Level, lang: Lang) => tr(lang, LEVEL_UI[l].label, LEVEL_UI[l].en);

/** Un solo hook para todo el texto visible: t(es, en), b(multilingüe), n(número con la convención del idioma). */
export function useI18n() {
  const { lang, setLang } = useContext(LangContext);
  const loc = localeOf(lang);
  return {
    lang, setLang, loc,
    col: lang === 'fr' ? '\u00a0:' : ':', // los dos puntos del francés llevan un espacio fino delante
    t: (es: string, en: string) => tr(lang, es, en),
    tf: (es: string, en: string, ...args: (string | number)[]) => tf(lang, es, en, ...args),
    b: (x: Bi) => pickBi(x, lang),
    n: (v: number, dec = 0) => v.toLocaleString(loc, { minimumFractionDigits: dec, maximumFractionDigits: dec }),
    lv: (l: Level) => levelLabel(l, lang),
    vital: (k: VitalKey) => vitalLabel(k, lang),
    unit: (k: VitalKey) => vitalUnit(k, lang),
  };
}
