import { useEffect } from 'react';
import type { Level } from '../types/telemetry';
import { playEmergency, playWarning } from '../lib/audio';

/** Amarillo: un aviso al entrar. Rojo: pulso de emergencia repetido hasta que se silencie o se normalice. */
export function useAlertSound(level: Level, enabled: boolean, silenced: boolean) {
  useEffect(() => {
    if (!enabled || silenced || level === 'green') return;
    if (level === 'yellow') { playWarning(); return; }
    playEmergency();
    const id = setInterval(playEmergency, 2500);
    return () => clearInterval(id);
  }, [level, enabled, silenced]);
}
