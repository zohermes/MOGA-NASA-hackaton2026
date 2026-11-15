import type { Sample, VitalKey } from '../types/telemetry';

/**
 * Proyección DEMO: regresión lineal sobre las últimas muestras, extrapolada con amortiguación.
 * Punto de reemplazo: sustituir por la inferencia del modelo ML entrenado en la base terrestre.
 */
export function forecast(history: Sample[], key: VitalKey, horizon = 15, window = 15) {
  const h = history.slice(-window), n = h.length;
  if (n < 8) return null;
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  h.forEach((s, i) => { const y = s[key]; sx += i; sy += y; sxy += i * y; sxx += i * i; });
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const now = h[n - 1][key];
  let projected = now + slope * horizon * 0.5;
  projected = Math.max(0, key === 'spo2' ? Math.min(100, projected) : projected);
  return { now, slope, projected };
}
