import React from 'react';
import { formatClockTime, formatCountdown } from '../utils/formatters';
import type { TimerPhase } from '../types/timer';

interface TimerRingProps {
  remainingMs: number;
  totalDurationMs: number;
  nextAlarmTimestamp: number;
  phase: TimerPhase;
}

export const TimerRing: React.FC<TimerRingProps> = ({
  remainingMs,
  totalDurationMs,
  nextAlarmTimestamp,
  phase,
}) => {
  const size = 300;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = center - strokeWidth - 6;
  const circumference = 2 * Math.PI * radius;

  const progress =
    phase === 'idle'
      ? 1
      : totalDurationMs > 0
      ? Math.max(0, Math.min(1, remainingMs / totalDurationMs))
      : 0;

  const strokeDashoffset = circumference * (1 - progress);
  const formattedTime = formatCountdown(remainingMs);
  const formattedNextAlarm = formatClockTime(nextAlarmTimestamp);

  return (
    <div className="relative flex items-center justify-center w-[min(78vw,310px)] sm:w-[340px] aspect-square select-none">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full -rotate-90"
        role="img"
        aria-label={`زمان باقی‌مانده ${formattedTime}`}
      >
        {/* Soft pastel track circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="#FFF9F3"
          stroke="#F2E8DE"
          strokeWidth={strokeWidth}
        />

        {/* Smooth active progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={phase === 'running' ? '#FF8C7A' : '#F7B5A9'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-[stroke-dashoffset,stroke] duration-200 ease-linear"
        />
      </svg>

      {/* Center readout: crisp tabular countdown + quiet next-alarm time */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <div
          dir="ltr"
          className="tabular-digits font-bold tracking-tight text-[#2B2622] leading-none text-[3.5rem] sm:text-[4.25rem]"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {formattedTime}
        </div>

        <p className="mt-4 text-sm sm:text-base font-medium text-[#7C7268] tabular-digits">
          <span>زنگ بعدی: </span>
          <span className="text-[#4A423B] font-semibold">{formattedNextAlarm}</span>
        </p>
      </div>
    </div>
  );
};
