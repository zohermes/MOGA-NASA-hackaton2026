/** Sintetizador Web Audio sin assets. Requiere un gesto del usuario para desbloquearse (política del navegador). */
let ctx: AudioContext | null = null;

export function unlockAudio() {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
}
function beep(freq: number, at: number, dur: number, gain: number, type: OscillatorType) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime + at;
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.linearRampToValueAtTime(0, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
/** Precaución: dos tonos suaves. */
export const playWarning = () => { beep(660, 0, 0.18, 0.12, 'sine'); beep(660, 0.28, 0.18, 0.12, 'sine'); };
/** Emergencia: tres pulsos alternos, timbre áspero y distinguible del anterior. */
export const playEmergency = () => { beep(988, 0, 0.14, 0.2, 'square'); beep(740, 0.2, 0.14, 0.2, 'square'); beep(988, 0.4, 0.14, 0.2, 'square'); };
