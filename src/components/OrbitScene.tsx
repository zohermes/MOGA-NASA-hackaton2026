import { useEffect, useRef } from 'react';
import { pickBi, tr, type Bi, type Lang } from '../lib/i18n';
import type { PhaseId } from '../lib/mission';
import type { Level } from '../types/telemetry';

export interface Dive { target: 'craft' | 'earth'; dir: 'in' | 'out'; id: number }
interface Props {
  level: Level; linkMode: 'synced' | 'delayed'; phase: PhaseId; lang: Lang; dive: Dive | null;
  onSelect: (t: 'craft' | 'earth') => void; onDiveEnd: (d: Dive) => void;
}

const TAU = Math.PI * 2, N_PTS = 6500, LAND = 0.524, TILT = 0.44, AXIAL = 0.41, ROLL = -0.35;
const RGB: Record<Level, [number, number, number]> = { green: [76, 201, 160], yellow: [242, 181, 68], red: [255, 90, 95] };
const INFO: [number, number, number] = [106, 168, 255], AMBER: [number, number, number] = [242, 181, 68];
const rgba = (c: number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeIO = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
// [oscuro, claro] por material: 0 océano, 1 tierra, 2 hielo
const PALETTE = [[[14, 34, 74], [74, 140, 230]], [[20, 58, 52], [120, 222, 176]], [[60, 76, 100], [235, 244, 255]]];
const COLORS = [...PALETTE.flatMap(([d, l]) => Array.from({ length: 8 }, (_, k) => `rgb(${mix(d, l, (k + 0.5) / 8).join(',')})`)), 'rgb(255,212,138)'];
const CLOUD_COLORS = ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.26)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.55)'];

// --- continentes y nubes procedurales (ruido de valor 3D): estilizados, no geografía real ---
const hash = (x: number, y: number, z: number) => { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); };
const sm = (t: number) => t * t * (3 - 2 * t), lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function vnoise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
  const c = (a: number, b: number, d: number) => hash(xi + a, yi + b, zi + d);
  return lerp(lerp(lerp(c(0, 0, 0), c(1, 0, 0), xf), lerp(c(0, 1, 0), c(1, 1, 0), xf), yf), lerp(lerp(c(0, 0, 1), c(1, 0, 1), xf), lerp(c(0, 1, 1), c(1, 1, 1), xf), yf), zf);
}
const fbm = (x: number, y: number, z: number) => { let a = 0.5, s = 0, f = 1; for (let i = 0; i < 4; i++) { s += a * vnoise(x * f, y * f, z * f); a *= 0.5; f *= 2; } return s / 0.9375; };

function buildGlobe() {
  const gx = new Float32Array(N_PTS), gy = new Float32Array(N_PTS), gz = new Float32Array(N_PTS), mat = new Uint8Array(N_PTS), city = new Uint8Array(N_PTS), cloud: number[] = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N_PTS; i++) {
    const y = 1 - (i / (N_PTS - 1)) * 2, r = Math.sqrt(1 - y * y), t = ga * i;
    gx[i] = Math.cos(t) * r; gy[i] = y; gz[i] = Math.sin(t) * r;
    mat[i] = Math.abs(y) > 0.9 ? 2 : fbm(gx[i] * 1.7 + 3.1, y * 1.7 + 1.7, gz[i] * 1.7 + 5.3) > LAND ? 1 : 0;
    city[i] = mat[i] === 1 && hash(gx[i] * 91.7, y * 57.3, gz[i] * 33.1) > 0.9 ? 1 : 0;
    if (fbm(gx[i] * 2.6 + 11.3, y * 2.6 + 4.1, gz[i] * 2.6 + 8.7) > 0.57) cloud.push(i);
  }
  return { gx, gy, gz, mat, city, cloud };
}
function rng(seed: number) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const stars = (() => { const r = rng(7); return Array.from({ length: 240 }, () => ({ x: r(), y: r(), s: r() < 0.15 ? 2 : 1, p: r() * TAU })); })();
const puffs = (() => { const r = rng(21); return Array.from({ length: 28 }, () => ({ x: r() * 2 - 1, y: r() * 1.3 - 0.45, r: 0.6 + r() * 0.8, z: r() })); })();
const rays = (() => { const r = rng(5); return Array.from({ length: 46 }, () => ({ a: r() * TAU, l: 0.4 + r() * 0.6 })); })();
const LABEL: Record<PhaseId, Bi> = {
  earth: { es: 'ASTRONAUTA · PLATAFORMA', en: 'ASTRONAUT · LAUNCH PAD' }, ascent: { es: 'NAVE EN ASCENSO', en: 'SPACECRAFT ASCENDING' },
  station: { es: 'EEI', en: 'ISS' }, return: { es: 'CÁPSULA · REENTRADA', en: 'CAPSULE · REENTRY' },
};

/** Tierra + nave + haz de telemetría. Clic → descenso cinematográfico (zoom, nubes / interior del módulo). Canvas 2D, sin dependencias. */
export default function OrbitScene({ level, linkMode, phase, lang, dive, onSelect, onDiveEnd }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const props = useRef({ level, linkMode, phase, lang, dive, onSelect, onDiveEnd });
  props.current = { level, linkMode, phase, lang, dive, onSelect, onDiveEnd };

  useEffect(() => {
    const cv = ref.current!, ctx = cv.getContext('2d')!, box = cv.parentElement!;
    const globe = buildGlobe();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches, k = reduce ? 0.25 : 1, DUR = reduce ? 250 : 2400;
    const buckets: number[][] = Array.from({ length: 25 }, () => []), cloudB: number[][] = Array.from({ length: 4 }, () => []);
    const LV = Math.hypot(-0.55, 0.45, 0.7), LX = -0.55 / LV, LY = 0.45 / LV, LZ = 0.7 / LV;
    const hit = { craft: { x: -99, y: -99, r: 0 }, earth: { x: 0, y: 0, r: 0 } };
    const trail: { x: number; y: number; t: number }[] = [];
    let W = 0, H = 0, dpr = 1, hover: 'craft' | 'earth' | null = null, raf = 0;
    let yaw = 0, lastNow = 0, prevPhase: PhaseId | null = null, siteLon = 0;
    let raw = 0, target: 'craft' | 'earth' = 'craft', curDive = -1, dv: Dive | null = null, dvT0 = 0;

    const resize = () => { const r = box.getBoundingClientRect(); W = r.width; H = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = W * dpr; cv.height = H * dpr; };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(box);

    const pick = (e: PointerEvent | MouseEvent) => {
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (Math.hypot(x - hit.craft.x, y - hit.craft.y) <= hit.craft.r) return 'craft' as const;
      if (Math.hypot(x - hit.earth.x, y - hit.earth.y) <= hit.earth.r) return 'earth' as const;
      return null;
    };
    const onMove = (e: PointerEvent) => { hover = pick(e); cv.style.cursor = hover ? 'pointer' : 'default'; };
    const onLeave = () => { hover = null; cv.style.cursor = 'default'; };
    const onClick = (e: MouseEvent) => { const h = pick(e); if (h) props.current.onSelect(h); };
    cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerleave', onLeave); cv.addEventListener('click', onClick);

    const blob = (x: number, y: number, r: number, al: number) => {
      const g = ctx.createRadialGradient(x, y - r * 0.2, r * 0.1, x, y, r);
      g.addColorStop(0, `rgba(255,240,222,${al})`); g.addColorStop(0.6, `rgba(200,214,236,${al * 0.55})`); g.addColorStop(1, 'rgba(160,180,215,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    };
    /** Cielo al atardecer con bancos de nubes que pasan hacia la cámara (como en la referencia). */
    const drawSky = (a: number, d: number, t: number) => {
      ctx.save(); ctx.globalAlpha = a;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0a1630'); g.addColorStop(0.45, '#274a7a'); g.addColorStop(0.7, '#d98f55'); g.addColorStop(1, '#f4cf9a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const s = ctx.createRadialGradient(W / 2, H * 0.62, 0, W / 2, H * 0.62, H * 0.55);
      s.addColorStop(0, 'rgba(255,232,180,0.85)'); s.addColorStop(1, 'rgba(255,232,180,0)'); ctx.fillStyle = s; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      puffs.map(p => ({ p, zz: (((p.z + d * 1.5 + t * 0.03 * k) % 1) + 1) % 1 })).sort((u, v) => u.zz - v.zz).forEach(({ p, zz }) => {
        const sc = 0.12 + zz * zz * 4.5, x = W / 2 + p.x * sc * W * 0.55, y = H * 0.66 + p.y * sc * H * 0.35, r = p.r * sc * H * 0.12, al = Math.sin(zz * Math.PI) * 0.85;
        blob(x, y, r, al); blob(x + r * 0.7, y + r * 0.15, r * 0.75, al); blob(x - r * 0.7, y + r * 0.1, r * 0.8, al);
      });
      ctx.restore();
    };
    /** Túnel del módulo: marcos que pasan, líneas de fuga y luz cálida de ventana al fondo. */
    const drawTunnel = (a: number, t: number) => {
      ctx.save(); ctx.globalAlpha = a;
      const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7); bg.addColorStop(0, '#0b1f2a'); bg.addColorStop(1, '#04080e');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      const vx = W / 2, vy = H / 2;
      ctx.strokeStyle = rgba(INFO, 0.22); ctx.lineWidth = 1;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.moveTo(vx + sx * W * 0.04, vy + sy * H * 0.03); ctx.lineTo(vx + sx * W * 0.8, vy + sy * H * 0.7); ctx.stroke(); }
      for (let i = 0; i < 14; i++) {
        const u = (i / 14 + t * 0.12 * k) % 1, s = Math.pow(u, 2.3), w = W * 0.08 + s * W * 1.5, h = w * (H / W) * 0.72;
        ctx.strokeStyle = rgba(INFO, Math.sin(u * Math.PI) * 0.6); ctx.lineWidth = 1 + 3 * s;
        ctx.beginPath(); ctx.roundRect(vx - w / 2, vy - h / 2, w, h, h * 0.12); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'lighter';
      const wl = ctx.createRadialGradient(vx, vy, 0, vx, vy, H * 0.2); wl.addColorStop(0, 'rgba(255,226,170,0.95)'); wl.addColorStop(1, 'rgba(255,226,170,0)');
      ctx.fillStyle = wl; ctx.fillRect(0, 0, W, H);
      const st = ctx.createLinearGradient(vx - W * 0.35, vy, vx + W * 0.35, vy); st.addColorStop(0, 'rgba(255,230,180,0)'); st.addColorStop(0.5, 'rgba(255,230,180,0.5)'); st.addColorStop(1, 'rgba(255,230,180,0)');
      ctx.fillStyle = st; ctx.fillRect(vx - W * 0.35, vy - 1, W * 0.7, 2);
      ctx.restore();
    };

    const frame = (now: number) => {
      const dtS = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0; lastNow = now;
      const { level, linkMode, phase, lang, dive } = props.current, col = RGB[level], t = now / 1000, alert = level !== 'green';
      if (phase !== prevPhase) { prevPhase = phase; if (phase === 'earth') siteLon = -yaw; trail.length = 0; }
      yaw += dtS * (phase === 'earth' ? 0.02 : 0.13) * k;
      if (dive && dive.id !== curDive) { curDive = dive.id; dv = dive; dvT0 = now; target = dive.target; }
      if (dv) {
        const p = clamp((now - dvT0) / DUR); raw = dv.dir === 'in' ? p : 1 - p;
        if (p >= 1) { const d = dv; dv = null; raw = d.dir === 'in' ? 1 : 0; props.current.onDiveEnd(d); }
      }
      const depth = easeIO(raw), idle = raw === 0 && !dv;

      const th = (t * 0.16 * k) % TAU, cx = W * 0.5, cy = H * 0.52, R = Math.min(W / 4.1, H * 0.34), A = R * 1.8;
      const cY = Math.cos(yaw), sY = Math.sin(yaw), cZ = Math.cos(AXIAL), sZ = Math.sin(AXIAL), sr = Math.sin(ROLL), cr = Math.cos(ROLL), sT = Math.sin(TILT), cT = Math.cos(TILT);
      const orbAt = (a: number, r: number) => { const px = Math.cos(a) * r, pz = Math.sin(a) * r, x1 = px * cr, y1 = px * sr; return { x: cx + x1, y: cy - (y1 * cT - pz * sT), z: y1 * sT + pz * cT }; };
      const orb = (a: number) => orbAt(a, A);

      // --- la nave según la etapa ---
      const a0 = Math.PI / 2, rS = R * 1.03;
      const flightPos = (u: number) => { const e = u * u * (3 - 2 * u); return orbAt(a0 + 1.3 * u, rS + (A - rS) * Math.pow(e, 0.85)); };
      let craft: { x: number; y: number; z: number; kind: 'iss' | 'rocket' | 'pad'; ang: number; heat: number; fade: number; visible: boolean };
      if (phase === 'station') craft = { ...orb(th), kind: 'iss', ang: 0, heat: 0, fade: 1, visible: true };
      else if (phase === 'earth') {
        const lat = 0.5, sx0 = Math.cos(lat) * Math.sin(siteLon), sy0 = Math.sin(lat), sz0 = Math.cos(lat) * Math.cos(siteLon);
        const x1 = sx0 * cY + sz0 * sY, z1 = -sx0 * sY + sz0 * cY, x2 = x1 * cZ - sy0 * sZ, y2 = x1 * sZ + sy0 * cZ, y3 = y2 * cT - z1 * sT, z3 = y2 * sT + z1 * cT;
        craft = { x: cx + x2 * R, y: cy - y3 * R, z: z3 * R, kind: 'pad', ang: -Math.PI / 2, heat: 0, fade: 1, visible: z3 > 0.08 };
      } else {
        const cyc = (t * k) % 18, asc = phase === 'ascent', u = Math.min(1, cyc / 14);
        let p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number };
        if (asc && cyc > 14) { const a = a0 + 1.3 + (cyc - 14) * 0.16; p = orb(a); q = orb(a + 0.02); }
        else { p = flightPos(asc ? u : 1 - u); q = flightPos(asc ? Math.min(1, u + 0.02) : Math.max(0, 1 - u - 0.02)); }
        const fade = clamp(Math.min(cyc / 0.8, (18 - cyc) / 1.5));
        craft = { ...p, kind: 'rocket', ang: Math.atan2(q.y - p.y, q.x - p.x), heat: asc ? 0 : (1 - smooth(0.03, 0.45, 1 - u)) * fade, fade, visible: true };
      }
      if (craft.kind === 'rocket') {
        const last = trail[trail.length - 1];
        if (last && Math.hypot(craft.x - last.x, craft.y - last.y) > 90) trail.length = 0;
        trail.push({ x: craft.x, y: craft.y, t }); while (trail.length && t - trail[0].t > 1.2) trail.shift();
      } else trail.length = 0;
      const behind = craft.kind !== 'pad' && craft.z < 0, s = craft.kind === 'iss' ? 0.9 + 0.25 * (craft.z / A) : 1;
      const vx = craft.x - cx, vy = cy - craft.y, vl = Math.hypot(vx, vy, craft.z) || 1, nadir = { x: cx + (vx / vl) * R, y: cy - (vy / vl) * R };
      hit.craft = idle && craft.visible && !(behind && Math.hypot(vx, vy) < R) ? { x: craft.x, y: craft.y, r: 24 * s } : { x: -99, y: -99, r: 0 };
      hit.earth = idle ? { x: cx, y: cy, r: R * 1.02 } : { x: 0, y: 0, r: 0 };

      // --- fondo ---
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7); bg.addColorStop(0, '#101b2f'); bg.addColorStop(1, '#070b12');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#cfd9ea';
      for (const st of stars) { ctx.globalAlpha = reduce ? 0.5 : 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.8 + st.p)); ctx.fillRect(st.x * W, st.y * H, st.s, st.s); }
      ctx.globalAlpha = 1;

      // --- mundo con zoom ---
      const zoom = Math.exp(Math.log(target === 'earth' ? 6 : 10) * depth), fx = target === 'earth' ? cx : craft.x, fy = target === 'earth' ? cy : craft.y;
      ctx.save(); ctx.translate(fx, fy); ctx.scale(zoom, zoom); ctx.translate(-fx, -fy);

      const drawOrbit = (front: boolean) => {
        ctx.lineWidth = 1.3;
        for (let i = 0; i < 120; i++) {
          const a0_ = (i / 120) * TAU, a1 = ((i + 1) / 120) * TAU, p0 = orb(a0_), p1 = orb(a1);
          if ((p0.z + p1.z >= 0) !== front) continue;
          const d = (((th - (a0_ + a1) / 2) % TAU) + TAU) % TAU, trailK = phase === 'station' && d < 1 ? 1 - d : 0;
          ctx.strokeStyle = trailK > 0 ? rgba(col, 0.15 + 0.7 * trailK) : 'rgba(142,155,179,0.22)';
          ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
        }
        for (let i = 0; i < 14; i++) { // partículas de telemetría a lo largo de la órbita
          const m = orb(t * 0.05 * k * (i % 2 ? 1 : -1) + i * 0.45);
          if ((m.z >= 0) !== front) continue;
          ctx.fillStyle = rgba(INFO, 0.5); ctx.beginPath(); ctx.arc(m.x, m.y, 1.4, 0, TAU); ctx.fill();
        }
      };
      const drawBeam = () => {
        if (craft.kind === 'pad' || craft.fade < 0.05) return;
        const c = linkMode === 'synced' ? INFO : AMBER, flow = linkMode === 'synced' ? 0.45 : 0.05;
        ctx.save(); ctx.globalAlpha = craft.fade; ctx.setLineDash([4, 6]); ctx.lineDashOffset = linkMode === 'synced' ? -t * 30 * k : 0;
        ctx.strokeStyle = rgba(c, 0.6); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(craft.x, craft.y); ctx.lineTo(nadir.x, nadir.y); ctx.stroke(); ctx.restore();
        for (let i = 0; i < 6; i++) {
          const u = (t * flow * k + i / 6) % 1;
          ctx.fillStyle = rgba(c, Math.sin(u * Math.PI) * (linkMode === 'synced' ? 1 : 0.5) * craft.fade);
          ctx.beginPath(); ctx.arc(craft.x + (nadir.x - craft.x) * u, craft.y + (nadir.y - craft.y) * u, 2.6, 0, TAU); ctx.fill();
        }
        if (!behind) { ctx.strokeStyle = rgba(c, 0.8); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(nadir.x, nadir.y, 4 + 2 * Math.sin(t * 3 * k), 0, TAU); ctx.stroke(); }
      };
      const ring = () => {
        ctx.beginPath(); ctx.arc(0, 0, 21 + (alert && !reduce ? 3 * Math.sin(t * 6) : 0), 0, TAU);
        ctx.fillStyle = rgba(col, 0.12); ctx.fill(); ctx.strokeStyle = rgba(col, alert ? 0.9 : 0.45); ctx.lineWidth = 2; ctx.stroke();
      };
      const drawIss = () => {
        ctx.save(); ctx.translate(craft.x, craft.y); ctx.scale(s, s); ring(); ctx.rotate(-0.35);
        ctx.fillStyle = '#8E9BB3'; ctx.fillRect(-15, -1, 30, 2); ctx.fillStyle = '#3f6fb8'; ctx.strokeStyle = '#9fc2ff'; ctx.lineWidth = 0.8;
        for (const px of [-17, -10.5, 4.5, 11]) { ctx.fillRect(px, -8, 6, 16); ctx.strokeRect(px, -8, 6, 16); }
        ctx.fillStyle = '#E6EBF2'; ctx.fillRect(-4, -3.5, 8, 7); ctx.restore();
      };
      const drawRocket = () => {
        ctx.save();
        if (craft.heat > 0.02) { // plasma de reentrada
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(craft.x, craft.y, 0, craft.x, craft.y, 46 * craft.heat + 8); g.addColorStop(0, 'rgba(255,200,120,0.9)'); g.addColorStop(1, 'rgba(255,90,40,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(craft.x, craft.y, 46 * craft.heat + 8, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        }
        ctx.globalAlpha = craft.fade; ctx.translate(craft.x, craft.y); ring();
        if (phase === 'return') { // cápsula: el escudo térmico va hacia delante
          ctx.rotate(craft.ang - Math.PI / 2); ctx.fillStyle = '#E6EBF2'; ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(4, -6); ctx.lineTo(6, 4); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#ff9a55'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(6, 5); ctx.stroke();
        } else {
          ctx.rotate(craft.ang + Math.PI / 2);
          if (craft.kind === 'rocket') {
            const fl = 8 + 6 * Math.random(), fg = ctx.createLinearGradient(0, 4, 0, 10 + fl);
            fg.addColorStop(0, 'rgba(255,240,200,0.95)'); fg.addColorStop(0.5, 'rgba(255,150,60,0.7)'); fg.addColorStop(1, 'rgba(255,90,40,0)');
            ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-3, 4); ctx.lineTo(0, 10 + fl); ctx.lineTo(3, 4); ctx.fill();
          }
          ctx.fillStyle = '#E6EBF2'; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(3.5, -3); ctx.lineTo(3.5, 4); ctx.lineTo(-3.5, 4); ctx.lineTo(-3.5, -3); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#8E9BB3'; ctx.beginPath(); ctx.moveTo(-3.5, 0); ctx.lineTo(-7, 6); ctx.lineTo(-3.5, 4); ctx.moveTo(3.5, 0); ctx.lineTo(7, 6); ctx.lineTo(3.5, 4); ctx.fill();
        }
        ctx.restore();
      };
      const drawCraft = () => {
        if (!craft.visible) return;
        for (const p of trail) { const age = t - p.t, al = (1 - age / 1.2) * 0.55 * craft.fade; ctx.fillStyle = craft.heat > 0.15 ? rgba([255, 140, 60], al) : rgba([220, 230, 245], al * 0.7); ctx.beginPath(); ctx.arc(p.x, p.y, 1.5 + age * 2.5, 0, TAU); ctx.fill(); }
        if (craft.kind === 'iss') drawIss(); else drawRocket();
        if (craft.kind === 'pad') { ctx.strokeStyle = rgba(col, 0.6); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(craft.x, craft.y + 8, 9 + 5 * ((t * k) % 1), 0, TAU); ctx.stroke(); }
        ctx.font = '600 11px ui-monospace, "SF Mono", Consolas, monospace'; ctx.textAlign = 'left'; ctx.fillStyle = rgba([230, 235, 242], clamp(1 - depth * 10) * craft.fade);
        ctx.fillText(pickBi(LABEL[phase], lang), craft.x + 28 * s, craft.y - 4);
        if (hover === 'craft') { ctx.fillStyle = '#8E9BB3'; ctx.fillText(tr(lang, 'Clic: vista del astronauta', 'Click: astronaut view'), craft.x + 28 * s, craft.y + 12); }
      };

      drawOrbit(false);
      if (behind) { drawBeam(); drawCraft(); }

      // --- Tierra ---
      const dotA = target === 'earth' ? 1 - smooth(0.35, 0.7, depth) : 1; ctx.globalAlpha = dotA;
      const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R); g.addColorStop(0, '#16376b'); g.addColorStop(1, '#050b17');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
      buckets.forEach(b => { b.length = 0; }); cloudB.forEach(b => { b.length = 0; });
      for (let i = 0; i < N_PTS; i++) {
        const px = globe.gx[i], py = globe.gy[i], pz = globe.gz[i];
        const x1 = px * cY + pz * sY, z1 = -px * sY + pz * cY, x2 = x1 * cZ - py * sZ, y2 = x1 * sZ + py * cZ, y3 = y2 * cT - z1 * sT, z3 = y2 * sT + z1 * cT;
        if (z3 <= 0.02) continue;
        const shade = 0.12 + 0.88 * clamp(x2 * LX + y3 * LY + z3 * LZ), isCity = globe.city[i] === 1 && shade < 0.3;
        buckets[isCity ? 24 : globe.mat[i] * 8 + Math.min(7, Math.floor(shade * 8))].push(cx + x2 * R, cy - y3 * R, R * (isCity ? 0.012 : 0.019) * (0.55 + 0.7 * z3));
      }
      buckets.forEach((b, bi) => {
        if (!b.length) return;
        ctx.fillStyle = COLORS[bi]; ctx.beginPath();
        for (let j = 0; j < b.length; j += 3) ctx.rect(b[j] - b[j + 2] / 2, b[j + 1] - b[j + 2] / 2, b[j + 2], b[j + 2]);
        ctx.fill();
      });
      const yc = yaw * 1.1 + 0.8, cYc = Math.cos(yc), sYc = Math.sin(yc); // capa de nubes con paralaje
      for (const i of globe.cloud) {
        const px = globe.gx[i], py = globe.gy[i], pz = globe.gz[i];
        const x1 = px * cYc + pz * sYc, z1 = -px * sYc + pz * cYc, x2 = x1 * cZ - py * sZ, y2 = x1 * sZ + py * cZ, y3 = y2 * cT - z1 * sT, z3 = y2 * sT + z1 * cT;
        if (z3 <= 0.05) continue;
        const shade = 0.12 + 0.88 * clamp(x2 * LX + y3 * LY + z3 * LZ);
        cloudB[Math.min(3, Math.floor(shade * 4))].push(cx + x2 * R * 1.012, cy - y3 * R * 1.012, R * 0.03 * (0.5 + 0.7 * z3));
      }
      cloudB.forEach((b, bi) => {
        if (!b.length) return;
        ctx.fillStyle = CLOUD_COLORS[bi]; ctx.beginPath();
        for (let j = 0; j < b.length; j += 3) ctx.rect(b[j] - b[j + 2] / 2, b[j + 1] - b[j + 2] / 2, b[j + 2], b[j + 2]);
        ctx.fill();
      });
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const atm = ctx.createRadialGradient(cx, cy, R * 0.97, cx, cy, R * 1.28); atm.addColorStop(0, 'rgba(106,168,255,0.5)'); atm.addColorStop(0.4, 'rgba(80,140,255,0.14)'); atm.addColorStop(1, 'rgba(106,168,255,0)');
      ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(cx, cy, R * 1.28, 0, TAU); ctx.fill(); ctx.restore();
      ctx.strokeStyle = 'rgba(150,200,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      if (hover === 'earth') { ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(230,235,242,0.6)'; ctx.beginPath(); ctx.arc(cx, cy, R * 1.07, 0, TAU); ctx.stroke(); ctx.restore(); }
      ctx.font = '600 11px ui-monospace, "SF Mono", Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillStyle = rgba(hover === 'earth' ? [230, 235, 242] : [142, 155, 179], clamp(1 - depth * 10));
      ctx.fillText(hover === 'earth' ? tr(lang, 'CLIC: CENTRO DE CONTROL', 'CLICK: CONTROL CENTER') : tr(lang, 'TIERRA · CENTRO DE CONTROL', 'EARTH · CONTROL CENTER'), cx, cy + R + 30);

      drawOrbit(true);
      if (!behind) { drawBeam(); drawCraft(); }
      ctx.restore();

      // --- destello solar (fuera del zoom) ---
      const fa = 0.9 * (1 - smooth(0, 0.5, depth)), sx = cx - R * 2.4, sy = cy - R * 1.5;
      if (fa > 0.01) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 0.9); sg.addColorStop(0, `rgba(255,246,225,${0.8 * fa})`); sg.addColorStop(0.15, `rgba(255,226,170,${0.3 * fa})`); sg.addColorStop(1, 'rgba(255,226,170,0)');
        ctx.fillStyle = sg; ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
        const st = ctx.createLinearGradient(sx - W * 0.3, sy, sx + W * 0.3, sy); st.addColorStop(0, 'rgba(255,240,210,0)'); st.addColorStop(0.5, `rgba(255,240,210,${0.35 * fa})`); st.addColorStop(1, 'rgba(255,240,210,0)');
        ctx.fillStyle = st; ctx.fillRect(sx - W * 0.3, sy - 1, W * 0.6, 2); ctx.restore();
      }

      // --- capas de la inmersión ---
      if (depth > 0.02) {
        const vel = Math.sin(Math.PI * depth); ctx.save(); ctx.strokeStyle = `rgba(230,240,255,${0.28 * vel})`; ctx.lineWidth = 1;
        for (const r of rays) { const r0 = Math.min(W, H) * (0.12 + 0.4 * depth * r.l), r1 = r0 + Math.min(W, H) * 0.35 * vel * r.l; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(r.a) * r0, H / 2 + Math.sin(r.a) * r0); ctx.lineTo(W / 2 + Math.cos(r.a) * r1, H / 2 + Math.sin(r.a) * r1); ctx.stroke(); }
        ctx.restore();
        if (target === 'earth') { const a = smooth(0.3, 0.75, depth); if (a > 0.01) drawSky(a, depth, t); }
        else { const a = smooth(0.55, 0.9, depth); if (a > 0.01) drawTunnel(a, t); }
        const bloom = 0.7 * Math.max(0, 1 - Math.abs(depth - 0.88) / 0.14);
        if (bloom > 0.01) { ctx.fillStyle = `rgba(255,244,225,${bloom})`; ctx.fillRect(0, 0, W, H); }
        ctx.fillStyle = `rgba(7,11,18,${0.45 * smooth(0.9, 1, depth)})`; ctx.fillRect(0, 0, W, H);
        const bar = H * 0.09 * Math.sin(Math.PI * clamp(depth)); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
      }
      const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerleave', onLeave); cv.removeEventListener('click', onClick); };
  }, []);

  return <canvas ref={ref} className="block h-full w-full" role="img" aria-label={tr(lang, 'Tierra y nave en órbita. Use los botones para abrir la vista del astronauta o el centro de control.', 'Earth and spacecraft in orbit. Use the buttons to open the astronaut view or the control center.')} />;
}
