import type { Bi } from './i18n';

const B = (es: string, en: string): Bi => ({ es, en });
export interface Hardware { id: string; cat: Bi; name: Bi; desc: Bi; specs: Bi[] }

/** Catálogo del hardware médico a bordo. Las especificaciones son ilustrativas del prototipo y no corresponden a equipos certificados. */
export const HARDWARE: Hardware[] = [
  { id: 'patch', cat: B('Bioquímica', 'Biochemistry'), name: B('Parche bioquímico', 'Biochemical patch'),
    desc: B('Adhesivo cutáneo que analiza el sudor y el líquido intersticial de forma continua, sin extracción de sangre.', 'Skin adhesive that analyzes sweat and interstitial fluid continuously, with no blood draw.'),
    specs: [B('Analitos: Na⁺, K⁺, lactato, glucosa y cortisol', 'Analytes: Na⁺, K⁺, lactate, glucose and cortisol'), B('Muestreo: una lectura cada 30 s', 'Sampling: one reading every 30 s'), B('Duración: 7 días por parche', 'Lifetime: 7 days per patch'), B('Enlace: Bluetooth de baja energía', 'Link: Bluetooth Low Energy'), B('Incertidumbre: ±5 %', 'Uncertainty: ±5 %')] },
  { id: 'echo', cat: B('Imágenes', 'Imaging'), name: B('Ecógrafo portátil con telemetría', 'Portable ultrasound with telemetry'),
    desc: B('Ecografía guiada a distancia: las imágenes se transmiten a Tierra con compresión sin pérdida.', 'Remotely guided ultrasound: images are sent to Earth with lossless compression.'),
    specs: [B('Sonda lineal de 7 a 15 MHz', 'Linear probe, 7 to 15 MHz'), B('Conexión: USB-C, alimentación por el bus', 'Connection: USB-C, bus powered'), B('Masa: menos de 1 kg', 'Mass: under 1 kg'), B('Transmisión diferida con retardo de enlace', 'Store-and-forward transmission under link delay')] },
  { id: 'ocular', cat: B('Oftalmología', 'Ophthalmology'), name: B('Ecógrafo ocular USB', 'USB ocular ultrasound'),
    desc: B('Mide la vaina del nervio óptico, el aplanamiento del globo y la elevación de la cabeza del nervio óptico.', 'Measures the optic nerve sheath, globe flattening and optic nerve head elevation.'),
    specs: [B('Sonda de 10 a 18 MHz', 'Probe, 10 to 18 MHz'), B('Medida principal: ONSD a 3 mm de la retina', 'Main measure: ONSD at 3 mm behind the retina'), B('Masa: menos de 1 kg', 'Mass: under 1 kg'), B('Uso previsto: Estación y nave a Marte', 'Intended use: Station and Mars vehicle')] },
  { id: 'oct', cat: B('Oftalmología', 'Ophthalmology'), name: B('Tomógrafo de coherencia óptica (OCT)', 'Optical coherence tomography (OCT)'),
    desc: B('Mide el grosor retiniano en micrómetros. Por su peso solo se instala en la Estación Espacial.', 'Measures retinal thickness in micrometers. Because of its weight it is installed only on the Space Station.'),
    specs: [B('Resolución axial: 5 µm', 'Axial resolution: 5 µm'), B('Fuente: diodo superluminiscente de 840 nm', 'Source: 840 nm superluminescent diode'), B('Masa: unos 18 kg', 'Mass: about 18 kg'), B('Métrica clave: Δ OCT respecto de la línea base terrestre', 'Key metric: Δ OCT against the Earth baseline')] },
  { id: 'ecg', cat: B('Cardiología', 'Cardiology'), name: B('Electrocardiógrafo ambulatorio', 'Ambulatory electrocardiograph'),
    desc: B('Registro del ritmo cardíaco con electrodos de parche, también durante el ejercicio y el sueño.', 'Heart rhythm recording with patch electrodes, including during exercise and sleep.'),
    specs: [B('Derivaciones: 12', 'Leads: 12'), B('Frecuencia de muestreo: 500 Hz', 'Sampling rate: 500 Hz'), B('Autonomía: 72 h', 'Battery life: 72 h'), B('Análisis automático del intervalo QT', 'Automatic QT interval analysis')] },
  { id: 'bio', cat: B('Sensores biométricos', 'Biometric sensors'), name: B('Sensores biométricos vestibles', 'Wearable biometric sensors'),
    desc: B('Monitorización continua de los signos vitales que alimenta el panel y el sistema de alertas.', 'Continuous vital-sign monitoring that feeds the dashboard and the alert system.'),
    specs: [B('Frecuencia cardíaca y respiratoria', 'Heart and respiratory rate'), B('Saturación de oxígeno (SpO₂) por pulsioximetría', 'Oxygen saturation (SpO₂) by pulse oximetry'), B('Presión arterial oscilométrica', 'Oscillometric blood pressure'), B('Temperatura central estimada', 'Estimated core temperature'), B('Muestreo adaptativo: se acelera ante desviaciones', 'Adaptive sampling: speeds up on deviations')] },
  { id: 'gas', cat: B('Ambiente', 'Environment'), name: B('Analizadores de gases de cabina', 'Cabin gas analyzers'),
    desc: B('Vigilan la atmósfera de cada módulo y alimentan las alarmas de O₂ y CO₂ del plano de la nave.', 'Monitor the atmosphere of every module and feed the O₂ and CO₂ alarms of the ship layout.'),
    specs: [B('CO₂: infrarrojo no dispersivo, de 0 a 5000 ppm', 'CO₂: non-dispersive infrared, 0 to 5000 ppm'), B('O₂: sensor paramagnético, de 0 a 25 %', 'O₂: paramagnetic sensor, 0 to 25 %'), B('Un sensor por módulo, con redundancia doble', 'One sensor per module, with dual redundancy'), B('Actualización cada 5 s', 'Update every 5 s')] },
  { id: 'rad', cat: B('Ambiente', 'Environment'), name: B('Dosímetros de radiación', 'Radiation dosimeters'),
    desc: B('Registran la dosis acumulada de cada tripulante y el campo de radiación de la cabina.', 'Record each crew member’s accumulated dose and the cabin radiation field.'),
    specs: [B('Dosímetro personal activo de silicio', 'Active personal silicon dosimeter'), B('Magnitud: dosis equivalente en mSv', 'Quantity: dose equivalent in mSv'), B('Alarma ante eventos de partículas solares', 'Alarm on solar particle events')] },
  { id: 'lbnp', cat: B('Contramedidas', 'Countermeasures'), name: B('Mobile Gravity Suit (LBNP portátil)', 'Mobile Gravity Suit (portable LBNP)'),
    desc: B('Traje de presión negativa en la parte inferior del cuerpo que desplaza fluidos desde la cabeza hacia las piernas.', 'Lower-body negative-pressure suit that shifts fluids from the head toward the legs.'),
    specs: [B('Presión negativa: de −20 a −50 mmHg', 'Negative pressure: −20 to −50 mmHg'), B('Sesión diaria: 30 min (preventiva) o 60 min', 'Daily session: 30 min (preventive) or 60 min'), B('Fluido desplazado: unos 2 L', 'Fluid displaced: about 2 L')] },
  { id: 'pharm', cat: B('Farmacia', 'Pharmacy'), name: B('Farmacia automatizada', 'Automated pharmacy'),
    desc: B('Dispensador con control de existencias: descuenta una unidad al confirmar cada administración.', 'Dispenser with stock control: deducts one unit when each administration is confirmed.'),
    specs: [B('Control de existencias en tiempo real', 'Real-time stock control'), B('Aviso al llegar al nivel crítico', 'Warning at the critical level'), B('Registro en el historial médico', 'Logged in the medical history')] },
];
