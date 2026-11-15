import { useState } from 'react';
import { useI18n } from '../lib/i18n';

const SRC = ['/nasa-logo.svg', '/nasa-logo.png'];

/** Logotipo fijo en la esquina superior izquierda. Usa el archivo oficial colocado en `public/nasa-logo.svg` (o `.png`). */
export default function NasaLogo() {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  return (
    <div className="pointer-events-none fixed left-3 top-2 z-50 flex h-16 w-[4.75rem] items-center justify-center">
      {i < SRC.length
        ? <img src={SRC[i]} alt={t('Logotipo de la NASA', 'NASA logo')} onError={() => setI(i + 1)} className="h-full w-full object-contain drop-shadow-[0_0_8px_rgba(106,168,255,0.25)]" />
        : <span title="public/nasa-logo.svg" className="flex h-full w-full items-center justify-center rounded border border-dashed border-line font-mono text-[10px] text-dim">LOGO</span>}
    </div>
  );
}
