import VitalCard from '../components/VitalCard';
import { OpenAlerts } from '../components/AlertCard';
import { useI18n } from '../lib/i18n';
import { LEVEL_UI, levelOf, THRESHOLDS, worst } from '../lib/thresholds';
import type { DeviceStatus, Level, Sample, VitalKey } from '../types/telemetry';

const DEV: Record<DeviceStatus, Level> = { nominal: 'green', degraded: 'yellow', offline: 'red' };

/** Bajo estímulo: cinco cifras grandes, dos estados de equipo y un único banner cuando algo importa. */
export default function AstronautView({ s, overall, silenced, onSilence }: { s: Sample | null; overall: Level; silenced: boolean; onSilence: () => void }) {
  const { t, n, vital, unit } = useI18n();
  const devText: Record<DeviceStatus, string> = { nominal: t('Funcionando', 'Operational'), degraded: t('Señal débil', 'Weak signal'), offline: t('Sin conexión', 'Offline') };
  const rng = (k: VitalKey) => `${n(THRESHOLDS[k].normal[0], THRESHOLDS[k].decimals)}–${n(THRESHOLDS[k].normal[1], THRESHOLDS[k].decimals)}`;
  const Device = ({ name, status }: { name: string; status: DeviceStatus }) => {
    const ui = LEVEL_UI[DEV[status]];
    return <div className={`flex items-center justify-between rounded-lg border ${ui.border} ${ui.bg} px-4 py-3`}>
      <span className="text-sm">{name}</span><span className={`text-sm font-semibold ${ui.text}`}>{devText[status]}</span></div>;
  };
  if (!s) return <p className="p-8 text-dim">{t('Esperando datos…', 'Waiting for data…')}</p>;
  const bp = worst(levelOf('systolic', s.systolic), levelOf('diastolic', s.diastolic));
  const card = (k: VitalKey, value: string) => <VitalCard large label={vital(k)} value={value} unit={unit(k)} level={levelOf(k, s[k])} range={rng(k)} />;
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      {overall !== 'green' && (
        <div role="alert" className={`flex items-center justify-between gap-3 rounded-lg border-2 ${LEVEL_UI[overall].border} ${LEVEL_UI[overall].bg} p-4`}>
          <p className={`text-xl font-semibold ${LEVEL_UI[overall].text}`}>{overall === 'red'
            ? t('Alerta crítica: contacte con el Centro de Control', 'Critical alert: contact Mission Control')
            : t('Precaución: un signo vital está fuera de rango', 'Caution: a vital sign is out of range')}</p>
          <button onClick={onSilence} disabled={silenced} className="rounded border border-line bg-raised px-4 py-2 text-sm disabled:opacity-50">{silenced ? t('Sonido silenciado', 'Sound muted') : t('Silenciar sonido', 'Mute sound')}</button>
        </div>
      )}
      <OpenAlerts by="astronauta" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {card('heartRate', n(s.heartRate))}
        <VitalCard large label={t('Presión arterial', 'Blood pressure')} value={`${n(s.systolic)}/${n(s.diastolic)}`} unit="mmHg" level={bp} range={`${rng('systolic')} / ${rng('diastolic')}`} />
        {card('respRate', n(s.respRate))}
        {card('temperature', n(s.temperature, 1))}
        {card('spo2', n(s.spo2))}
        <div className="flex flex-col justify-center gap-3">
          <Device name={t('Parche bioquímico', 'Biochemical patch')} status={s.patch} />
          <Device name={t('Ecografía', 'Ultrasound')} status={s.ultrasound} />
        </div>
      </div>
    </div>
  );
}
