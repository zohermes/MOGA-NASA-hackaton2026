import { useEffect, useState } from 'react';

/** Estado persistido en localStorage. Con `sync`, se actualiza también al cambiar en otra ventana de la misma aplicación. */
export function usePersisted<T>(key: string, init: T, sync = false) {
  const [v, setV] = useState<T>(() => { try { const s = localStorage.getItem(key); return s ? (JSON.parse(s) as T) : init; } catch { return init; } });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* sin almacenamiento */ } }, [key, v]);
  useEffect(() => {
    if (!sync) return;
    const on = (e: StorageEvent) => { if (e.key === key && e.newValue) { try { setV(JSON.parse(e.newValue) as T); } catch { /* valor inválido */ } } };
    window.addEventListener('storage', on);
    return () => window.removeEventListener('storage', on);
  }, [key, sync]);
  return [v, setV] as const;
}
