import { useEffect, useRef } from 'react';
import { useI18n } from '../lib/i18n';

const SR = 100, N = SR * 6, W = 900, H = 220; // 100 muestras/s, ventana de 6 s
const g = (x: number, c: number, w: number, a: number) => a * Math.exp(-((x - c) ** 2) / (2 * w * w));
/** Un latido (fase 0..1): onda P, Q, R, S y onda T. */
const beat = (p: number) => g(p, 0.16, 0.025, 0.12) + g(p, 0.345, 0.008, -0.15) + g(p, 0.37, 0.01, 1) + g(p, 0.395, 0.01, -0.25) + g(p, 0.62, 0.05, 0.28);

/** Electrocardiograma sintético que sigue la frecuencia cardíaca en vivo. */
export default function EcgTrace({ heartRate, color }: { heartRate: number; color: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLCanvasElement>(null);
  const hr = useRef(heartRate); hr.current = heartRate;
  const stroke = useRef(color); stroke.current = color;

  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    const buf: number[] = new Array(N).fill(0);
    let phase = 0, acc = 0, last = performance.now(), raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(142,155,179,0.12)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = 0; x <= W; x += 20) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = 0; y <= H; y += 20) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      ctx.strokeStyle = stroke.current; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
      buf.forEach((v, i) => { const x = (i / (N - 1)) * W, y = H * 0.72 - v * 150; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
    };
    const loop = (now: number) => {
      acc += Math.min((now - last) / 1000, 0.25) * SR; last = now;
      while (acc >= 1) { acc -= 1; phase = (phase + hr.current / 60 / SR) % 1; buf.push(beat(phase) + (Math.random() - 0.5) * 0.015); buf.shift(); }
      draw(); raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} width={W} height={H} className="h-auto w-full" role="img" aria-label={t(`Electrocardiograma simulado a ${heartRate.toFixed(0)} latidos por minuto`, `Simulated electrocardiogram at ${heartRate.toFixed(0)} beats per minute`)} />;
}
