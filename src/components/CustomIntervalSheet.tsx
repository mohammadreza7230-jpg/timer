import React, { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toPersianDigits } from '../utils/formatters';
import { alarmAudio } from '../utils/audioEngine';

interface CustomIntervalSheetProps {
  isOpen: boolean;
  initialMinutes?: number;
  onClose: () => void;
  onAdd: (minutes: number) => void;
}

const MIN_MINUTES = 1;
const MAX_MINUTES = 180;

export const CustomIntervalSheet: React.FC<CustomIntervalSheetProps> = ({
  isOpen,
  initialMinutes = 25,
  onClose,
  onAdd,
}) => {
  const [minutes, setMinutes] = useState(initialMinutes);

  useEffect(() => {
    if (isOpen) {
      setMinutes(Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, initialMinutes)));
    }
  }, [isOpen, initialMinutes]);

  const adjust = (delta: number) => {
    alarmAudio.subtleHaptic(10);
    setMinutes((prev) => Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, prev + delta)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alarmAudio.subtleHaptic(18);
    onAdd(minutes);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="افزودن بازه دلخواه"
        >
          {/* Soft translucent scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#2D2A26]/25 backdrop-blur-[2px]"
          />

          {/* Bottom sheet container */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative z-10 w-full max-w-md rounded-t-[32px] bg-[#FFFDF9] px-6 pt-3 pb-safe"
          >
            {/* Drag handle */}
            <div className="mx-auto mb-5 h-1.5 w-11 rounded-full bg-[#E5DDD4]" />

            <h2 className="text-center text-lg font-bold text-[#2D2A26]">
              بازه زمانی دلخواه
            </h2>

            {/* Center tactile minute picker */}
            <div className="mt-7 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => adjust(-5)}
                disabled={minutes <= MIN_MINUTES}
                aria-label="کم کردن ۵ دقیقه"
                className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[#E9D8FD] text-[#362254] font-bold text-sm tabular-digits active:scale-95 transition-transform disabled:opacity-40"
              >
                {toPersianDigits('-5')}
              </button>

              <button
                type="button"
                onClick={() => adjust(-1)}
                disabled={minutes <= MIN_MINUTES}
                aria-label="کم کردن ۱ دقیقه"
                className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[#D6EEFF] text-[#1B3A54] active:scale-95 transition-transform disabled:opacity-40"
              >
                <Minus className="w-5 h-5" strokeWidth={2.5} />
              </button>

              <div className="min-w-[110px] text-center select-none">
                <div className="text-5xl font-extrabold tabular-digits text-[#2B2622] leading-none">
                  {toPersianDigits(minutes)}
                </div>
                <div className="mt-1.5 text-sm font-medium text-[#7C7268]">دقیقه</div>
              </div>

              <button
                type="button"
                onClick={() => adjust(1)}
                disabled={minutes >= MAX_MINUTES}
                aria-label="اضافه کردن ۱ دقیقه"
                className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[#D8F3DC] text-[#1E3B28] active:scale-95 transition-transform disabled:opacity-40"
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </button>

              <button
                type="button"
                onClick={() => adjust(5)}
                disabled={minutes >= MAX_MINUTES}
                aria-label="اضافه کردن ۵ دقیقه"
                className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[#E9D8FD] text-[#362254] font-bold text-sm tabular-digits active:scale-95 transition-transform disabled:opacity-40"
              >
                {toPersianDigits('+5')}
              </button>
            </div>

            {/* Smooth slider for rapid selection */}
            <div className="mt-7 px-1">
              <input
                type="range"
                min={MIN_MINUTES}
                max={MAX_MINUTES}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                aria-label="انتخاب دقیقه"
                className="w-full h-2.5 rounded-full appearance-none cursor-pointer bg-[#F2E8DE] accent-[#FF8C7A]"
              />
              <div className="mt-2 flex items-center justify-between text-xs font-medium text-[#8C8277] tabular-digits">
                <span>{toPersianDigits(1)} دقیقه</span>
                <span>{toPersianDigits(60)} دقیقه</span>
                <span>{toPersianDigits(180)} دقیقه</span>
              </div>
            </div>

            {/* Primary Add CTA */}
            <button
              type="submit"
              className="mt-7 w-full h-14 rounded-full bg-[#FF8C7A] hover:bg-[#F77F6C] active:scale-[0.98] text-white font-bold text-lg transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C7A] focus-visible:ring-offset-2"
            >
              افزودن
            </button>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
};
