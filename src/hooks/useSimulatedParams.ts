import { useCallback, useEffect, useRef, useState } from 'react';
import { resolve, type Param, type Sex } from '../lib/clinical';

const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
const initial = (params: Param[], sex: Sex) => Object.fromEntries(params.map(p => [p.id, resolve(p, sex).base])) as Record<string, number>;

/** Simula parámetros de variación lenta (laboratorio, imagen, electrofisiología). perturb() empuja uno a rango crítico. */
export function useSimulatedParams(params: Param[], sex: Sex, intervalMs = 3000) {
  const [values, setValues] = useState(() => initial(params, sex));
  const fault = useRef<{ id: string; ticks: number } | null>(null);

  useEffect(() => setValues(initial(params, sex)), [params, sex]);
  useEffect(() => {
    const id = setInterval(() => {
      const f = fault.current;
      setValues(prev => {
        const next = { ...prev };
        for (const p of params) {
          const r = resolve(p, sex), cur = next[p.id] ?? r.base;
          if (f && f.id === p.id) {
            const span = r.warn[1] - r.warn[0];
            const target = p.fault === 'low' ? r.warn[0] - span * 0.1 : r.warn[1] + span * 0.1;
            next[p.id] = cur + (target - cur) * 0.6;
          } else next[p.id] = cur + (r.base - cur) * 0.2 + gauss() * p.sigma;
        }
        return next;
      });
      if (f && --f.ticks <= 0) fault.current = null;
    }, intervalMs);
    return () => clearInterval(id);
  }, [params, sex, intervalMs]);

  const perturb = useCallback(() => { fault.current = { id: params[Math.floor(Math.random() * params.length)].id, ticks: 5 }; }, [params]);
  return { values, perturb };
}
