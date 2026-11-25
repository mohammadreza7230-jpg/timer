import React, { useEffect, useState } from 'react';
import { BellRing, RotateCw, Square } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { formatClockTime, formatElapsed, toPersianDigits } from '../utils/formatters';

interface AlarmOverlayProps {
  isRinging: boolean;
  intervalMinutes: number;
  ringingSince: number | null;
  onStopAndNextRound: () => void;
  onStopCompletely: () => void;
}

export const AlarmOverlay: React.FC<AlarmOverlayProps> = ({
  isRinging,
  intervalMinutes,
  ringingSince,
  onStopAndNextRound,
  onStopCompletely,
}) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isRinging) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [isRinging]);

  const elapsedMs = ringingSince ? Math.max(0, now - ringingSince) : 0;

  return (
    <AnimatePresence>
      {isRinging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          role="alertdialog"
          aria-modal="true"
          aria-label="هشدار پایان زمان"
          className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-[#FFE3DC] via-[#FFF0E7] to-[#FFD8CE] px-6 pt-safe pb-safe select-none"
        >
          {/* Top current clock & interval context */}
          <div className="mt-8 flex flex-col items-center text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#FFFDF9]/80 text-[#E86D5B] animate-alarm-breathe">
              <BellRing className="w-9 h-9" strokeWidth={2.2} />
            </div>

            <div className="mt-6 text-5xl sm:text-6xl font-extrabold tabular-digits text-[#2D231F] leading-none">
              {formatClockTime(now)}
            </div>

            <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-[#3B2621]">
              زمان به پایان رسید
            </h1>

            <p className="mt-2 text-base font-medium text-[#7D574E] tabular-digits">
              بازه {toPersianDigits(intervalMinutes)} دقیقه‌ای
              <span className="mx-2" aria-hidden="true">
                ·
              </span>
              <span dir="ltr" className="inline-block">
                +{formatElapsed(elapsedMs)}
              </span>
            </p>
          </div>

          {/* Bottom thumb-zone decision actions with calm pulsing aura */}
          <div className="w-full max-w-sm flex flex-col items-center gap-5 mb-6">
            <div className="relative w-full flex items-center justify-center">
              {/* Calm breathing pulse ripples behind primary CTA */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full bg-[#FF8C7A]/35 animate-alarm-ripple-1"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full bg-[#FF8C7A]/25 animate-alarm-ripple-2"
              />

              <button
                type="button"
                onClick={onStopAndNextRound}
                className="relative z-10 w-full min-h-[82px] rounded-full bg-[#FF8C7A] hover:bg-[#F47B68] active:scale-[0.97] text-white px-6 py-4 flex flex-col items-center justify-center transition-transform duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/80"
              >
                <span className="inline-flex items-center gap-2.5 text-xl sm:text-2xl font-extrabold">
                  <RotateCw className="w-6 h-6" strokeWidth={2.6} />
                  قطع و دور بعد
                </span>
                <span className="mt-1 text-sm font-medium text-white/90">
                  شروع دوباره {toPersianDigits(intervalMinutes)} دقیقه
                </span>
              </button>
            </div>

            {/* Secondary smaller full-stop button underneath */}
            <button
              type="button"
              onClick={onStopCompletely}
              className="w-full max-w-[230px] min-h-[54px] rounded-full bg-[#FFFDF9]/85 hover:bg-[#FFFDF9] border-2 border-[#E67E6E]/55 text-[#9B3B2E] font-bold text-base inline-flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C7A]"
            >
              <Square className="w-4 h-4 fill-current" strokeWidth={2.2} />
              توقف کامل
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
