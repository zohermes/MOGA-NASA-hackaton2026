export type Level = 'green' | 'yellow' | 'red';
export type VitalKey = 'heartRate' | 'systolic' | 'diastolic' | 'respRate' | 'temperature' | 'spo2';
export type DeviceStatus = 'nominal' | 'degraded' | 'offline';

/** Una fila del flujo (equivalente a una línea del CSV de prueba). */
export interface Sample {
  t: number; // epoch ms (UTC)
  heartRate: number; systolic: number; diastolic: number;
  respRate: number; temperature: number; spo2: number;
  patch: DeviceStatus; ultrasound: DeviceStatus;
  fast?: VitalKey[]; // parámetros con muestreo acelerado en esta muestra
}
export interface LinkState {
  mode: 'synced' | 'delayed'; // delayed = pérdida de señal, datos en cola abordo
  pendingRecords: number; lastSyncAt: number | null; latencyMs: number;
}
export interface Alert { id: string; t: number; key: VitalKey; level: Level; message: string; ack: boolean; value?: number }
