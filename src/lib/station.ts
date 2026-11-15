import type { Bi } from './i18n';
import type { Level } from '../types/telemetry';

const B = (es: string, en: string): Bi => ({ es, en });

export type ModuleId = 'hub' | 'hab1' | 'hab2' | 'lab' | 'ls' | 'airA' | 'airB' | 'store';
export type Zone = 'habitat' | 'work' | 'transit';
export interface ModuleDef { id: ModuleId; name: Bi; short: Bi; desc: Bi; zone: Zone; x: number; y: number; w: number; h: number; label: 'below' | 'above' | 'inside' }

/** Plano esquemático (viewBox 960 × 540). Geometría estilizada, no a escala. */
export const MODULES: ModuleDef[] = [
  { id: 'airA', name: B('Esclusa A', 'Airlock A'), short: B('Esclusa A', 'Airlock A'), zone: 'transit', x: 36, y: 246, w: 68, h: 48, label: 'below',
    desc: B('Cámara de presurización para las actividades extravehiculares.', 'Pressurization chamber for extravehicular activities.') },
  { id: 'ls', name: B('Sala de máquinas y soporte vital', 'Machinery room and life support'), short: B('Soporte vital', 'Life support'), zone: 'work', x: 130, y: 232, w: 140, h: 76, label: 'below',
    desc: B('Generación de oxígeno, depuración de CO₂, control térmico y reciclaje de agua.', 'Oxygen generation, CO₂ removal, thermal control and water recycling.') },
  { id: 'hab1', name: B('Módulo habitacional A (dormitorios)', 'Habitat module A (sleeping quarters)'), short: B('Habitacional A', 'Habitat A'), zone: 'habitat', x: 300, y: 240, w: 110, h: 60, label: 'below',
    desc: B('Cabinas de descanso individuales de la tripulación.', 'Individual crew rest cabins.') },
  { id: 'hub', name: B('Nodo central de conexión', 'Central connecting node'), short: B('Nodo central', 'Central node'), zone: 'transit', x: 436, y: 226, w: 88, h: 88, label: 'inside',
    desc: B('Punto de unión entre los módulos; concentra la circulación de aire y las comunicaciones.', 'Junction between modules; houses air circulation and communications.') },
  { id: 'hab2', name: B('Módulo habitacional B (comedor y esparcimiento)', 'Habitat module B (dining and recreation)'), short: B('Habitacional B', 'Habitat B'), zone: 'habitat', x: 550, y: 240, w: 110, h: 60, label: 'below',
    desc: B('Zona de comidas, ejercicio y convivencia.', 'Area for meals, exercise and socializing.') },
  { id: 'airB', name: B('Esclusa B', 'Airlock B'), short: B('Esclusa B', 'Airlock B'), zone: 'transit', x: 700, y: 246, w: 68, h: 48, label: 'below',
    desc: B('Cámara de presurización para las actividades extravehiculares.', 'Pressurization chamber for extravehicular activities.') },
  { id: 'lab', name: B('Laboratorio médico', 'Medical laboratory'), short: B('Laboratorio médico', 'Medical laboratory'), zone: 'work', x: 440, y: 90, w: 80, h: 100, label: 'above',
    desc: B('Ecografía teleoperada, análisis de parches bioquímicos y atención médica a bordo.', 'Tele-operated ultrasound, biochemical patch analysis and onboard medical care.') },
  { id: 'store', name: B('Almacén y farmacia', 'Storage and pharmacy'), short: B('Almacén', 'Storage'), zone: 'transit', x: 440, y: 350, w: 80, h: 90, label: 'below',
    desc: B('Farmacia a bordo, muestras y suministros.', 'Onboard pharmacy, samples and supplies.') },
];

export type MState = 'active' | 'standby' | 'maintenance';
export interface MachineDef { id: string; module: ModuleId; name: Bi; kw: number; temp: number; warn: number; max: number; init: MState; auto?: 'lights' }

/** Maquinaria de demostración. Potencias y temperaturas ilustrativas. `warn` y `max`: umbrales de temperatura (precaución y crítico). */
export const MACHINES: MachineDef[] = [
  { id: 'oxy', module: 'ls', name: B('Generador de oxígeno por electrólisis', 'Electrolysis oxygen generator'), kw: 2.4, temp: 46, warn: 60, max: 72, init: 'active' },
  { id: 'scrub', module: 'ls', name: B('Depurador de CO₂', 'CO₂ scrubber'), kw: 1.3, temp: 52, warn: 65, max: 78, init: 'active' },
  { id: 'thermal', module: 'ls', name: B('Sistema de control térmico', 'Thermal control system'), kw: 3.6, temp: 34, warn: 48, max: 60, init: 'active' },
  { id: 'water', module: 'ls', name: B('Reciclador de agua', 'Water recovery system'), kw: 1.6, temp: 38, warn: 52, max: 64, init: 'active' },
  { id: 'us', module: 'lab', name: B('Equipo de ecografía teleoperada', 'Tele-operated ultrasound unit'), kw: 0.35, temp: 31, warn: 40, max: 48, init: 'standby' },
  { id: 'patch', module: 'lab', name: B('Analizador de parches bioquímicos', 'Biochemical patch analyzer'), kw: 0.22, temp: 28, warn: 38, max: 46, init: 'active' },
  { id: 'centri', module: 'lab', name: B('Centrífuga de laboratorio', 'Laboratory centrifuge'), kw: 0.5, temp: 30, warn: 42, max: 52, init: 'standby' },
  { id: 'fridge', module: 'store', name: B('Refrigerador de medicamentos', 'Medication refrigerator'), kw: 0.15, temp: 4, warn: 7, max: 9, init: 'active' },
  { id: 'light1', module: 'hab1', name: B('Iluminación del módulo habitacional A', 'Habitat A lighting'), kw: 0.8, temp: 33, warn: 50, max: 62, init: 'active', auto: 'lights' },
  { id: 'light2', module: 'hab2', name: B('Iluminación del módulo habitacional B', 'Habitat B lighting'), kw: 0.8, temp: 33, warn: 50, max: 62, init: 'active', auto: 'lights' },
  { id: 'mgs', module: 'hab2', name: B('Mobile Gravity Suit (traje de presión negativa)', 'Mobile Gravity Suit (negative-pressure suit)'), kw: 0.4, temp: 29, warn: 40, max: 50, init: 'standby' },
  { id: 'air', module: 'hub', name: B('Sistema de circulación de aire', 'Air circulation system'), kw: 0.8, temp: 30, warn: 44, max: 56, init: 'active' },
  { id: 'comms', module: 'hub', name: B('Sistema de comunicaciones', 'Communications system'), kw: 0.9, temp: 40, warn: 54, max: 66, init: 'active' },
  { id: 'pumpA', module: 'airA', name: B('Bomba de presurización de la esclusa A', 'Airlock A pressurization pump'), kw: 0.4, temp: 26, warn: 40, max: 52, init: 'standby' },
  { id: 'pumpB', module: 'airB', name: B('Bomba de presurización de la esclusa B', 'Airlock B pressurization pump'), kw: 0.4, temp: 26, warn: 40, max: 52, init: 'maintenance' },
];
export const POWER_CAPACITY_KW = 30; // generación ilustrativa

/** Ciclo de iluminación: descanso orbital de 22:00 a 06:00 (hora de la misión, UTC). */
export type Phase = 'day' | 'dusk' | 'night' | 'dawn';
export function lightLevels(minutes: number): { habitat: number; work: number; transit: number; phase: Phase } {
  const h = minutes / 60;
  if (h >= 22 || h < 6) return { habitat: 0, work: 0.75, transit: 0.5, phase: 'night' };
  if (h >= 21) return { habitat: 0.5, work: 1, transit: 1, phase: 'dusk' };
  if (h < 7) return { habitat: 0.5, work: 1, transit: 1, phase: 'dawn' };
  return { habitat: 1, work: 1, transit: 1, phase: 'day' };
}

/** Umbrales ambientales ILUSTRATIVOS (a validar por el equipo de soporte vital). */
export const O2_NORMAL: [number, number] = [20, 23];
export const O2_WARN: [number, number] = [19.5, 23.5];
export const o2Level = (v: number): Level => (v >= O2_NORMAL[0] && v <= O2_NORMAL[1] ? 'green' : v >= O2_WARN[0] && v <= O2_WARN[1] ? 'yellow' : 'red');
export const co2Level = (ppm: number): Level => (ppm > 3000 ? 'red' : ppm >= 2000 ? 'yellow' : 'green');
export const ppmToMmHg = (ppm: number) => ppm * 0.00076; // a 1 atm
export const tempLevel = (m: MachineDef, t: number): Level => (t > m.max ? 'red' : t > m.warn ? 'yellow' : 'green');
