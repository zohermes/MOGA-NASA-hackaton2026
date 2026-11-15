import type { Sex } from './clinical';
import type { Bi } from './i18n';
import type { VitalKey } from '../types/telemetry';

export interface CrewMember { id: string; name: Bi; role: Bi; age: number; sex: Sex; blood: string; allergies: Bi; bias: Partial<Record<VitalKey, number>> }

/** Tripulación de demostración. `bias` desplaza la línea base de cada persona sin salir del rango normal. */
export const CREW: CrewMember[] = [
  { id: 'a01', name: { es: 'Astronauta 01', en: 'Astronaut 01' }, role: { es: 'Comandante', en: 'Commander' }, age: 44, sex: 'M', blood: 'O+', allergies: { es: 'Ninguna conocida', en: 'None known' }, bias: {} },
  { id: 'a02', name: { es: 'Astronauta 02', en: 'Astronaut 02' }, role: { es: 'Ingeniera de vuelo', en: 'Flight engineer' }, age: 38, sex: 'F', blood: 'A+', allergies: { es: 'Penicilina', en: 'Penicillin' }, bias: { heartRate: 3, systolic: -3, diastolic: -2, temperature: -0.1 } },
  { id: 'a03', name: { es: 'Astronauta 03', en: 'Astronaut 03' }, role: { es: 'Especialista de misión', en: 'Mission specialist' }, age: 51, sex: 'M', blood: 'B+', allergies: { es: 'Ninguna conocida', en: 'None known' }, bias: { heartRate: -3, systolic: 1, diastolic: 1, spo2: -0.5 } },
];
