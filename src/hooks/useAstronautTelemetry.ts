import { useCallback, useEffect, useRef, useState } from 'react';
import type { Alert, DeviceStatus, LinkState, Sample, VitalKey } from '../types/telemetry';
import { levelOf, RANK, THRESHOLDS } from '../lib/thresholds';
import { worst } from '../lib/thresholds';
import { PROFILES, type PhaseId } from '../lib/mission';
import { PROTOCOLS } from '../lib/protocols';

const KEYS: VitalKey[] = ['heartRate', 'systolic', 'diastolic', 'respRate', 'temperature', 'spo2'];
/** Líneas base en el centro del rango normal: así el ruido normal casi nunca cruza un umbral (las desviaciones son excepcionales). */
const BASE: Record<VitalKey, number>  = { heartRate: 72, systolic: 106, diastolic: 70, respRate: 16, temperature: 36.7, spo2: 98 };
const SIGMA: Record<VitalKey, number> = { heartRate: 2.5, systolic: 2, diastolic: 1.5, respRate: 0.6, temperature: 0.04, spo2: 0.4 };
const FAULT: Record<VitalKey, number> = { heartRate: 130, systolic: 152, diastolic: 96, respRate: 28, temperature: 38.5, spo2: 87 };
/** Escala global del ruido fisiológico y probabilidad de un evento espontáneo por cada muestra estándar (≈ 1 cada 40 min por tripulante). */
const NOISE = 0.6;
const SPONTANEOUS = 1 / 1200;
const MAX_HISTORY = 240;
const BASE_TICK = 250;   // resolución del planificador (ms)
const CALM_SAMPLES = 4;  // muestras normales consecutivas antes de volver a la cadencia estándar

const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
const zero = () => Object.fromEntries(KEYS.map(k => [k, 0])) as Record<VitalKey, number>;

/**
 * Simulador de telemetría con muestreo ADAPTATIVO por parámetro: cada signo vital se muestrea a la
 * cadencia estándar (intervalMs); si sale de su rango normal pasa a una cadencia 4 veces mayor
 * (mínimo 250 ms) y vuelve a la estándar tras CALM_SAMPLES muestras normales consecutivas.
 * Contrato estable { latest, history, alerts, link, ... }: reemplazable por un adaptador WebSocket / MQTT.
 */
export function useAstronautTelemetry(intervalMs = 2000, phase: PhaseId = 'station', bias: Partial<Record<VitalKey, number>> = {}) {
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const biasRef = useRef(bias); biasRef.current = bias;
  const stdRef = useRef(intervalMs); stdRef.current = intervalMs;
  const [running, setRunning] = useState(true);
  const [history, setHistory] = useState<Sample[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [fastKeys, setFastKeys] = useState<VitalKey[]>([]);
  const [link, setLink] = useState<LinkState>({ mode: 'synced', pendingRecords: 0, lastSyncAt: Date.now(), latencyMs: 1300 });

  const cur = useRef<Record<VitalKey, number>>({ ...BASE });
  const due = useRef<Record<VitalKey, number>>(zero());
  const calm = useRef<Record<VitalKey, number>>(zero());
  const fast = useRef(new Set<VitalKey>());
  const fault = useRef<{ targets: Partial<Record<VitalKey, number>>; until: number } | null>(null);
  const prevLevels = useRef<Partial<Record<VitalKey, number>>>({});
  const devices = useRef<{ patch: DeviceStatus; ultrasound: DeviceStatus }>({ patch: 'nominal', ultrasound: 'nominal' });
  const linkRef = useRef<LinkState>(link);
  const nextStd = useRef(0);

  const tick = useCallback(() => {
    const now = Date.now(), c = cur.current, std = stdRef.current, fastMs = Math.max(BASE_TICK, std / 4);
    const P = PROFILES[phaseRef.current], B = { ...BASE, ...P.base };

    // Estado de dispositivos y enlace: solo a la cadencia estándar.
    if (now >= nextStd.current) {
      nextStd.current = now + std;
      // Evento espontáneo excepcional: una desviación aislada (70 %) o un conjunto clínico completo (30 %).
      if (!fault.current && Math.random() < SPONTANEOUS) {
        const cluster = Math.random() < 0.3, key = KEYS[Math.floor(Math.random() * KEYS.length)];
        fault.current = { targets: cluster ? PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)].scenario : { [key]: FAULT[key] }, until: now + 8 * std };
      }
      for (const d of ['patch', 'ultrasound'] as const)
        devices.current[d] = devices.current[d] === 'nominal' ? (Math.random() < P.deviceFail ? 'degraded' : 'nominal') : (Math.random() < 0.3 ? 'nominal' : 'degraded');
      const l = linkRef.current;
      const blackout = l.mode === 'delayed' ? Math.random() > 0.25 : Math.random() < P.blackout;
      linkRef.current = blackout
        ? { mode: 'delayed', pendingRecords: l.pendingRecords + 1, lastSyncAt: l.lastSyncAt, latencyMs: 0 }
        : { mode: 'synced', pendingRecords: 0, lastSyncAt: now, latencyMs: Math.round(1200 + Math.random() * 300) };
      setLink(linkRef.current);
    }
    for (const d of P.off) devices.current[d] = 'offline';

    const f = fault.current, updated: VitalKey[] = [], newAlerts: Alert[] = [];
    for (const k of KEYS) {
      if (now < due.current[k]) continue;
      const ms = fast.current.has(k) ? fastMs : std, w = ms / std; // w escala la dinámica a la cadencia del parámetro
      c[k] += (B[k] + (biasRef.current[k] ?? 0) - c[k]) * 0.15 * w + gauss() * SIGMA[k] * P.sigma * NOISE * Math.sqrt(w);
      const ft = f && now < f.until ? f.targets[k] : undefined;
      if (ft !== undefined) c[k] += (ft - c[k]) * 0.35 * w;
      if (k === 'spo2') c[k] = Math.min(100, c[k]);

      const lvl = levelOf(k, c[k]), prev = prevLevels.current[k] ?? 0;
      if (RANK[lvl] > prev && lvl !== 'green')
        newAlerts.push({ id: `${now}-${k}`, t: now, key: k, level: lvl, ack: false, value: c[k],
          message: `${THRESHOLDS[k].label}: ${c[k].toFixed(THRESHOLDS[k].decimals)} ${THRESHOLDS[k].unit}` });
      prevLevels.current[k] = RANK[lvl];

      if (lvl !== 'green') { fast.current.add(k); calm.current[k] = 0; }
      else if (fast.current.has(k) && ++calm.current[k] >= CALM_SAMPLES) fast.current.delete(k);

      const next = fast.current.has(k) ? fastMs : std;
      due.current[k] = now - due.current[k] > next ? now + next : Math.max(due.current[k] + next, now + BASE_TICK / 2);
      updated.push(k);
    }
    if (f && now >= f.until) fault.current = null;
    if (!updated.length) return;

    const sample: Sample = { t: now, ...c, ...devices.current, fast: [...fast.current] };
    setHistory(h => [...h.slice(-(MAX_HISTORY - 1)), sample]);
    if (newAlerts.length) setAlerts(a => [...newAlerts, ...a].slice(0, 50));
    setFastKeys(prev => { const nx = [...fast.current]; return prev.join() === nx.join() ? prev : nx; });
  }, []);

  useEffect(() => {
    if (!running) return;
    tick();
    const id = setInterval(tick, BASE_TICK);
    return () => clearInterval(id);
  }, [running, tick]);

  const injectFault = useCallback((key: VitalKey) => { fault.current = { targets: { [key]: FAULT[key] }, until: Date.now() + 6 * stdRef.current }; }, []);
  /** Desvía varios parámetros a la vez (conjunto de anomalías) durante 9 muestras estándar. */
  const injectScenario = useCallback((targets: Partial<Record<VitalKey, number>>) => { fault.current = { targets, until: Date.now() + 9 * stdRef.current }; }, []);
  const ackAlert = useCallback((id: string) => setAlerts(a => a.map(x => (x.id === id ? { ...x, ack: true } : x))), []);

  const latest = history[history.length - 1] ?? null;
  const overall = latest ? worst(...KEYS.map(k => levelOf(k, latest[k]))) : 'green';
  return { latest, history, alerts, link, overall, running, setRunning, injectFault, injectScenario, ackAlert, fastKeys, intervalMs };
}
