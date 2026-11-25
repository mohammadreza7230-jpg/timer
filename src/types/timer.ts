export type AlarmSoundId = 'morning' | 'crystal' | 'pulse' | 'crisp';

export interface AlarmSoundOption {
  id: AlarmSoundId;
  name: string;
  subtitle: string;
}

export const ALARM_SOUNDS: AlarmSoundOption[] = [
  {
    id: 'morning',
    name: 'نسیم صبح',
    subtitle: 'آرام و ملودیک',
  },
  {
    id: 'crystal',
    name: 'بلور روشن',
    subtitle: 'شفاف و واضح',
  },
  {
    id: 'pulse',
    name: 'موج آرام',
    subtitle: 'نرم و پیوسته',
  },
  {
    id: 'crisp',
    name: 'زنگ دقیق',
    subtitle: 'رسا و بیدارباش',
  },
];

export type TimerPhase = 'idle' | 'running' | 'ringing';

export const DEFAULT_PRESETS: number[] = [15, 30, 35, 45, 60];

export interface PersistedTimerState {
  presets: number[];
  selectedMinutes: number;
  soundId: AlarmSoundId;
  phase: TimerPhase;
  targetEndTime: number | null;
  totalDurationMs: number;
  ringingSince: number | null;
}
