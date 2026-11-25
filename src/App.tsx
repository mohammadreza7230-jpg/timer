import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Square, Volume2 } from 'lucide-react';
import {
  DEFAULT_PRESETS,
  type AlarmSoundId,
  type PersistedTimerState,
  type TimerPhase,
} from './types/timer';
import { formatCountdown } from './utils/formatters';
import { alarmAudio } from './utils/audioEngine';
import {
  acquireWakeLock,
  clearAlarmNotifications,
  createBackgroundTicker,
  releaseWakeLock,
  requestNotificationPermissionOnce,
  triggerAlarmNotification,
} from './utils/backgroundTimer';
import { TimerRing } from './components/TimerRing';
import { PresetRow } from './components/PresetRow';
import { CustomIntervalSheet } from './components/CustomIntervalSheet';
import { SoundPickerSheet } from './components/SoundPickerSheet';
import { AlarmOverlay } from './components/AlarmOverlay';
import { PWAInstallButton } from './components/PWAInstallButton';

const STORAGE_KEY = 'pastel_cycle_timer_v1';

function loadInitialState(): PersistedTimerState {
  const fallback: PersistedTimerState = {
    presets: DEFAULT_PRESETS,
    selectedMinutes: 35,
    soundId: 'morning',
    phase: 'idle',
    targetEndTime: null,
    totalDurationMs: 35 * 60_000,
    ringingSince: null,
  };

  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedTimerState>;

    const presets =
      Array.isArray(parsed.presets) && parsed.presets.length > 0
        ? parsed.presets.filter((n) => typeof n === 'number' && n >= 1 && n <= 180)
        : DEFAULT_PRESETS;

    const validPresets = presets.length > 0 ? presets : DEFAULT_PRESETS;
    const selectedMinutes =
      typeof parsed.selectedMinutes === 'number' && parsed.selectedMinutes >= 1
        ? parsed.selectedMinutes
        : validPresets[0];

    const soundId: AlarmSoundId =
      parsed.soundId === 'morning' ||
      parsed.soundId === 'crystal' ||
      parsed.soundId === 'pulse' ||
      parsed.soundId === 'crisp'
        ? parsed.soundId
        : 'morning';

    const phase: TimerPhase =
      parsed.phase === 'running' || parsed.phase === 'ringing' ? parsed.phase : 'idle';

    const targetEndTime =
      typeof parsed.targetEndTime === 'number' ? parsed.targetEndTime : null;

    const totalDurationMs =
      typeof parsed.totalDurationMs === 'number' && parsed.totalDurationMs > 0
        ? parsed.totalDurationMs
        : selectedMinutes * 60_000;

    // If app was closed while running and deadline already passed, enter ringing state immediately
    if (phase === 'running' && targetEndTime !== null && targetEndTime <= Date.now()) {
      return {
        presets: validPresets,
        selectedMinutes,
        soundId,
        phase: 'ringing',
        targetEndTime: null,
        totalDurationMs,
        ringingSince: targetEndTime,
      };
    }

    return {
      presets: validPresets,
      selectedMinutes,
      soundId,
      phase,
      targetEndTime: phase === 'running' ? targetEndTime : null,
      totalDurationMs,
      ringingSince:
        phase === 'ringing' && typeof parsed.ringingSince === 'number'
          ? parsed.ringingSince
          : null,
    };
  } catch {
    return fallback;
  }
}

export default function App() {
  const [initial] = useState<PersistedTimerState>(loadInitialState);

  const [presets, setPresets] = useState<number[]>(initial.presets);
  const [selectedMinutes, setSelectedMinutes] = useState<number>(initial.selectedMinutes);
  const [soundId, setSoundId] = useState<AlarmSoundId>(initial.soundId);
  const [phase, setPhase] = useState<TimerPhase>(initial.phase);
  const [targetEndTime, setTargetEndTime] = useState<number | null>(initial.targetEndTime);
  const [totalDurationMs, setTotalDurationMs] = useState<number>(initial.totalDurationMs);
  const [ringingSince, setRingingSince] = useState<number | null>(initial.ringingSince);

  const [remainingMs, setRemainingMs] = useState<number>(() => {
    if (initial.phase === 'running' && initial.targetEndTime !== null) {
      return Math.max(0, initial.targetEndTime - Date.now());
    }
    if (initial.phase === 'ringing') return 0;
    return initial.selectedMinutes * 60_000;
  });

  const [idleNow, setIdleNow] = useState<number>(() => Date.now());
  const [isCustomSheetOpen, setIsCustomSheetOpen] = useState(false);
  const [isSoundSheetOpen, setIsSoundSheetOpen] = useState(false);

  // Refs for latest values inside worker / visibility callbacks
  const phaseRef = useRef(phase);
  const targetEndRef = useRef(targetEndTime);
  const soundIdRef = useRef(soundId);
  const selectedMinutesRef = useRef(selectedMinutes);

  useEffect(() => {
    phaseRef.current = phase;
    targetEndRef.current = targetEndTime;
    soundIdRef.current = soundId;
    selectedMinutesRef.current = selectedMinutes;
  }, [phase, targetEndTime, soundId, selectedMinutes]);

  // Persist 100% offline to localStorage on every state update
  useEffect(() => {
    const payload: PersistedTimerState = {
      presets,
      selectedMinutes,
      soundId,
      phase,
      targetEndTime,
      totalDurationMs,
      ringingSince,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [presets, selectedMinutes, soundId, phase, targetEndTime, totalDurationMs, ringingSince]);

  // Keep "زنگ بعدی" preview clock fresh while idle
  useEffect(() => {
    if (phase !== 'idle') return;
    setIdleNow(Date.now());
    const id = window.setInterval(() => setIdleNow(Date.now()), 10_000);
    return () => window.clearInterval(id);
  }, [phase]);

  // Trigger continuous alarm loop + notification
  const fireAlarm = useCallback((triggeredAt?: number) => {
    if (phaseRef.current === 'ringing') return;
    phaseRef.current = 'ringing';
    setPhase('ringing');
    setTargetEndTime(null);
    setRemainingMs(0);
    setRingingSince(triggeredAt ?? Date.now());

    alarmAudio.stopKeepAlive();
    alarmAudio.startContinuousAlarm(soundIdRef.current);
    void triggerAlarmNotification(selectedMinutesRef.current);
  }, []);

  // If app loaded directly into ringing state (e.g., after reload post-deadline), start alarm loop
  useEffect(() => {
    if (initial.phase === 'ringing') {
      alarmAudio.startContinuousAlarm(initial.soundId);
    }
    return () => {
      alarmAudio.stopContinuousAlarm();
      alarmAudio.stopKeepAlive();
      void releaseWakeLock();
    };
  }, [initial.phase, initial.soundId]);

  // Drift-free background Web Worker ticker + visibility/focus sync
  useEffect(() => {
    if (phase !== 'running' || targetEndTime === null) return;

    const syncRemaining = () => {
      const target = targetEndRef.current;
      if (phaseRef.current !== 'running' || target === null) return;

      const diff = target - Date.now();
      if (diff <= 0) {
        fireAlarm(target);
      } else {
        setRemainingMs(diff);
      }
    };

    const ticker = createBackgroundTicker(syncRemaining);
    syncRemaining();
    ticker.start();

    const handleVisibilityOrFocus = () => {
      syncRemaining();
      if (document.visibilityState === 'visible' && phaseRef.current === 'running') {
        void acquireWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      ticker.destroy();
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [phase, targetEndTime, fireAlarm]);

  // Keep browser document title synced with live countdown
  useEffect(() => {
    if (phase === 'running') {
      document.title = `${formatCountdown(remainingMs)} — تایمر زنگ`;
    } else if (phase === 'ringing') {
      document.title = 'زنگ! — تایمر زنگ چرخه‌ای';
    } else {
      document.title = 'تایمر زنگ چرخه‌ای';
    }
  }, [phase, remainingMs]);

  const startRound = useCallback(async (minutes: number) => {
    await alarmAudio.unlock();
    requestNotificationPermissionOnce();
    alarmAudio.startKeepAlive();
    void acquireWakeLock();
    alarmAudio.subtleHaptic(18);

    const durationMs = minutes * 60_000;
    const end = Date.now() + durationMs;

    setTotalDurationMs(durationMs);
    setTargetEndTime(end);
    setRemainingMs(durationMs);
    setRingingSince(null);
    setPhase('running');
  }, []);

  const handleToggleStartStop = () => {
    if (phase === 'running') {
      alarmAudio.subtleHaptic(15);
      alarmAudio.stopKeepAlive();
      void releaseWakeLock();
      setPhase('idle');
      setTargetEndTime(null);
      setRemainingMs(selectedMinutes * 60_000);
    } else {
      void startRound(selectedMinutes);
    }
  };

  const handleStopAndNextRound = () => {
    alarmAudio.stopContinuousAlarm();
    void clearAlarmNotifications();
    void startRound(selectedMinutes);
  };

  const handleStopCompletely = () => {
    alarmAudio.subtleHaptic(15);
    alarmAudio.stopContinuousAlarm();
    alarmAudio.stopKeepAlive();
    void clearAlarmNotifications();
    void releaseWakeLock();

    setPhase('idle');
    setTargetEndTime(null);
    setRingingSince(null);
    setRemainingMs(selectedMinutes * 60_000);
  };

  const handleSelectPreset = (minutes: number) => {
    if (phase !== 'idle') return;
    setSelectedMinutes(minutes);
    setTotalDurationMs(minutes * 60_000);
    setRemainingMs(minutes * 60_000);
  };

  const handleDeletePreset = (minutesToDelete: number) => {
    setPresets((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((m) => m !== minutesToDelete);
      if (selectedMinutes === minutesToDelete) {
        const fallbackMin = next[0];
        setSelectedMinutes(fallbackMin);
        setTotalDurationMs(fallbackMin * 60_000);
        setRemainingMs(fallbackMin * 60_000);
      }
      return next;
    });
  };

  const handleAddCustomPreset = (customMinutes: number) => {
    setPresets((prev) => {
      if (prev.includes(customMinutes)) return prev;
      return [...prev, customMinutes].sort((a, b) => a - b);
    });
    if (phase === 'idle') {
      setSelectedMinutes(customMinutes);
      setTotalDurationMs(customMinutes * 60_000);
      setRemainingMs(customMinutes * 60_000);
    }
  };

  const nextAlarmTimestamp =
    phase === 'running' && targetEndTime !== null
      ? targetEndTime
      : idleNow + selectedMinutes * 60_000;

  return (
    <div className="min-h-[100dvh] w-full bg-[#FFFDF9] text-[#2D2A26] flex flex-col items-center">
      {/* Main single-screen portrait-ergonomic layout */}
      <main className="w-full max-w-md min-h-[100dvh] flex flex-col justify-between px-6 pt-safe pb-safe">
        {/* Top bar: minimal single sound selector icon (+ subtle install button only if installable) */}
        <header className="w-full flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => {
              alarmAudio.subtleHaptic(10);
              setIsSoundSheetOpen(true);
            }}
            aria-label="انتخاب صدای زنگ"
            title="صدای زنگ"
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full bg-[#F4EFE9] text-[#5C534B] hover:bg-[#EAE1D8] active:scale-95 transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C7A]"
          >
            <Volume2 className="w-5 h-5" strokeWidth={2.1} />
          </button>

          <PWAInstallButton />
        </header>

        {/* Center focal anchor: smooth progress ring + large countdown + next alarm time */}
        <section className="flex-1 flex flex-col items-center justify-center py-6">
          <TimerRing
            remainingMs={remainingMs}
            totalDurationMs={totalDurationMs}
            nextAlarmTimestamp={nextAlarmTimestamp}
            phase={phase}
          />
        </section>

        {/* Bottom ergonomic thumb-zone: preset buttons + primary Start / Stop CTA */}
        <section className="w-full flex flex-col items-center gap-6 pb-2">
          <PresetRow
            presets={presets}
            selectedMinutes={selectedMinutes}
            disabled={phase !== 'idle'}
            onSelect={handleSelectPreset}
            onDelete={handleDeletePreset}
            onOpenCustomSheet={() => setIsCustomSheetOpen(true)}
          />

          <button
            type="button"
            onClick={handleToggleStartStop}
            className={`w-full min-h-[64px] rounded-full font-extrabold text-xl inline-flex items-center justify-center gap-2.5 transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C7A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9] ${
              phase === 'running'
                ? 'bg-[#FFF0EC] hover:bg-[#FFE6E0] border-2 border-[#FF8C7A] text-[#C84B3B]'
                : 'bg-[#FF8C7A] hover:bg-[#F57D6A] border-2 border-transparent text-white'
            }`}
          >
            {phase === 'running' ? (
              <>
                <Square className="w-5 h-5 fill-current" strokeWidth={2.2} />
                <span>توقف</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" strokeWidth={2.2} />
                <span>شروع</span>
              </>
            )}
          </button>
        </section>
      </main>

      {/* Overlay 1: Custom interval Bottom Sheet */}
      <CustomIntervalSheet
        isOpen={isCustomSheetOpen}
        initialMinutes={selectedMinutes}
        onClose={() => setIsCustomSheetOpen(false)}
        onAdd={handleAddCustomPreset}
      />

      {/* Lightweight Sound Selector Sheet */}
      <SoundPickerSheet
        isOpen={isSoundSheetOpen}
        selectedSoundId={soundId}
        onSelect={(id) => setSoundId(id)}
        onClose={() => setIsSoundSheetOpen(false)}
      />

      {/* Overlay 2: Full-screen Continuous Alarm Screen */}
      <AlarmOverlay
        isRinging={phase === 'ringing'}
        intervalMinutes={selectedMinutes}
        ringingSince={ringingSince}
        onStopAndNextRound={handleStopAndNextRound}
        onStopCompletely={handleStopCompletely}
      />
    </div>
  );
}
