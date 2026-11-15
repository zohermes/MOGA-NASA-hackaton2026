# MOGA

Monitoreo de salud de la tripulación (React 18 + Vite + TypeScript + Tailwind). Idiomas: español, inglés, francés, italiano y portugués.

```bash
npm install && npm run dev
```

## Estructura
- `src/App.tsx`: cabecera, pestañas, perfiles (Astronauta, Operador, CMO) y ventanas de emergencia.
- `src/views/EntryFlow.tsx`: pantalla inicial (planeta, etapas y selector de perfil).
- `src/views/ClinicalView.tsx`: panel clínico (ficha, monitoreo, evaluaciones, alertas, protocolos, intervenciones, comunicación, seguimiento).
- `src/lib/protocols.ts` y `src/hooks/useProtocols.ts`: protocolos `PROT-MED-01..03` y motor de detección.
- `src/lib/translations.ts`: diccionario FR/IT/PT (clave = texto en español).
- `public/nasa-logo.svg` (o `.png`): coloque aquí el logotipo oficial de la NASA.

## Notas
- Los umbrales, los protocolos, las dosis, el modelo del parche y las especificaciones del hardware son ilustrativos y requieren validación médica.
- Pulse "Activar sonido" para las alertas sonoras (el navegador exige un gesto).
