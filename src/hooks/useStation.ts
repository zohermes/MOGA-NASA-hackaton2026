import { useEffect, useMemo, useRef, useState } from 'react';
import { lightLevels, MACHINES, MODULES, type MachineDef, type ModuleId, type MState } from '../lib/station';

const noise = (a: number) => (Math.random() - 0.5) * 2 * a;
const initStates = () => Object.fromEntries(MACHINES.map(m => [m.id, m.init])) as Record<string, MState>;
const initVals = () => Object.fromEntries(MACHINES.map(m => [m.id, { p: m.init === 'active' ? m.kw : m.init === 'standby' ? m.kw * 0.12 : 0, t: m.init === 'maintenance' ? 22 : m.temp }])) as Record<string, { p: number; t: number }>;
const MAX_H = 60;

/**
 * Estado de la estación: reloj de la misión, ciclo de luces, maquinaria y atmósfera interna.
 * El CO₂ es el mismo valor compartido con la evaluación ocular (SANS). Acoplamientos de demostración:
 * depurador de CO₂ fuera de servicio → el CO₂ sube; generador de O₂ fuera de servicio → el O₂ baja;
 * control térmico fuera de servicio → las máquinas activas se calientan.
 */
export function useStation(co2: number, onCo2: (n: number) => void) {
  const [states, setStates] = useState<Record<string, MState>>(initStates);
  const [vals, setVals] = useState(initVals);
  const [o2, setO2] = useState(20.9);
  const [o2Hist, setO2Hist] = useState<number[]>([]);
  const [co2Hist, setCo2Hist] = useState<number[]>([]);
  const [mode, setMode] = useState<'real' | 'sim'>('real');
  const [simMin, setSimMin] = useState(14 * 60);
  const [accel, setAccel] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [lightMode, setLightMode] = useState<'auto' | 'day' | 'night'>('auto'); // automático (reloj) o forzado
  const [modOv, setModOv] = useState<Partial<Record<ModuleId, number>>>({});    // nivel manual por módulo (0, 0.5, 1)

  const minutes = mode === 'real' ? new Date(now).getUTCHours() * 60 + new Date(now).getUTCMinutes() : simMin;
  const light = lightLevels(lightMode === 'day' ? 12 * 60 : lightMode === 'night' ? 23 * 60 : minutes);
  const modLight = useMemo(() => Object.fromEntries(MODULES.map(m => [m.id, modOv[m.id] ?? light[m.zone]])) as Record<ModuleId, number>, [modOv, light.habitat, light.work, light.transit]);
  const eff = useMemo(() => {
    const o: Record<string, MState> = {};
    for (const m of MACHINES) o[m.id] = m.auto === 'lights' ? (modLight[m.module] > 0 ? 'active' : 'standby') : states[m.id];
    return o;
  }, [states, modLight]);

  const ref = useRef({ eff, modLight, co2, onCo2 });
  ref.current = { eff, modLight, co2, onCo2 };
  const thermal = useRef(0);

  // Reloj de la misión (cada segundo). En modo simulado puede avanzar 10 min por segundo.
  useEffect(() => {
    const id = setInterval(() => { setNow(Date.now()); if (mode === 'sim' && accel) setSimMin(m => (m + 10) % 1440); }, 1000);
    return () => clearInterval(id);
  }, [mode, accel]);

  // Maquinaria y atmósfera (cada 2 s).
  useEffect(() => {
    const id = setInterval(() => {
      const { eff, modLight, co2, onCo2 } = ref.current;
      thermal.current = eff.thermal !== 'active' ? Math.min(20, thermal.current + 0.4) : Math.max(0, thermal.current - 0.8);
      setVals(prev => {
        const next = { ...prev };
        for (const m of MACHINES) {
          const st = eff[m.id], p0 = prev[m.id];
          const tp = st === 'active' ? m.kw * (m.auto === 'lights' ? modLight[m.module] : 1) : st === 'standby' ? m.kw * 0.12 : 0;
          const tt = st === 'active' ? m.temp + (m.id === 'fridge' ? 0 : thermal.current) : st === 'standby' ? 22 + (m.temp - 22) * 0.4 : 22;
          next[m.id] = { p: Math.max(0, p0.p + (tp - p0.p) * 0.5 + (st === 'active' ? noise(m.kw * 0.015) : 0)), t: p0.t + (tt - p0.t) * 0.25 + noise(st === 'active' ? 0.25 : 0.05) };
        }
        return next;
      });
      setO2(v => { const n = eff.oxy === 'active' ? v + (20.9 - v) * 0.2 + noise(0.01) : Math.max(16, v - 0.03 + noise(0.005)); setO2Hist(h => [...h.slice(-(MAX_H - 1)), n]); return n; });
      const c = eff.scrub === 'active' ? co2 : Math.min(5000, co2 + 40);
      if (c !== co2) onCo2(c);
      setCo2Hist(h => [...h.slice(-(MAX_H - 1)), c]);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return {
    states, eff, vals, o2, o2Hist, co2, co2Hist, onCo2, mode, setMode, simMin, setSimMin, accel, setAccel, minutes, light, modLight, lightMode, setLightMode, modOv,
    setModLight: (id: ModuleId, v: number | null) => setModOv(o => { const n = { ...o }; if (v === null) delete n[id]; else n[id] = v; return n; }),
    resetLights: () => { setModOv({}); setLightMode('auto'); },
    setMachine: (id: string, s: MState) => setStates(st => ({ ...st, [id]: s })),
    machines: MACHINES as MachineDef[],
  };
}
export type Station = ReturnType<typeof useStation>;
