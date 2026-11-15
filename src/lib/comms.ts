/** Mensaje del operador (o del CMO) a la pantalla del astronauta. `to` es el id de un tripulante o 'all'. */
export interface Msg { id: string; t: number; from: 'operator' | 'cmo'; to: string; text: import('./i18n').Bi; urgent: boolean; ack: string[]; auto?: boolean }
/** Dosis fijada por el operador para un medicamento (sustituye a la dosis predeterminada). */
export interface DoseOv { text: string; t: number }
