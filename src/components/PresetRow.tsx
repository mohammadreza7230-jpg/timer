import React, { useRef, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toPersianDigits } from '../utils/formatters';
import { alarmAudio } from '../utils/audioEngine';

interface PresetRowProps {
  presets: number[];
  selectedMinutes: number;
  disabled: boolean;
  onSelect: (minutes: number) => void;
  onDelete: (minutes: number) => void;
  onOpenCustomSheet: () => void;
}

const PASTEL_STYLES = [
  {
    bg: 'bg-[#D8F3DC]',
    text: 'text-[#1E3B28]',
    activeBorder: 'border-[#2D5A3D]',
  },
  {
    bg: 'bg-[#E9D8FD]',
    text: 'text-[#362254]',
    activeBorder: 'border-[#573A85]',
  },
  {
    bg: 'bg-[#D6EEFF]',
    text: 'text-[#1B3A54]',
    activeBorder: 'border-[#2B5D87]',
  },
];

const LONG_PRESS_MS = 550;

export const PresetRow: React.FC<PresetRowProps> = ({
  presets,
  selectedMinutes,
  disabled,
  onSelect,
  onDelete,
  onOpenCustomSheet,
}) => {
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [holdingMinutes, setHoldingMinutes] = useState<number | null>(null);
  const pressTimerRef = useRef<number | null>(null);
  const didLongPressRef = useRef(false);

  const clearPressTimer = () => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setHoldingMinutes(null);
  };

  const handlePointerDown = (minutes: number) => {
    if (disabled) return;
    didLongPressRef.current = false;
    setHoldingMinutes(minutes);

    pressTimerRef.current = window.setTimeout(() => {
      didLongPressRef.current = true;
      setHoldingMinutes(null);
      alarmAudio.subtleHaptic(30);
      setPendingDelete(minutes);
    }, LONG_PRESS_MS);
  };

  const handlePointerUp = (minutes: number) => {
    clearPressTimer();
    if (disabled) return;
    if (!didLongPressRef.current) {
      if (pendingDelete !== null) {
        setPendingDelete(null);
      }
      alarmAudio.subtleHaptic(12);
      onSelect(minutes);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, minutes: number) => {
    e.preventDefault();
    if (disabled) return;
    clearPressTimer();
    alarmAudio.subtleHaptic(25);
    setPendingDelete(minutes);
  };

  const confirmDelete = () => {
    if (pendingDelete === null) return;
    onDelete(pendingDelete);
    setPendingDelete(null);
  };

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Contextual long-press delete confirmation bar (appears only after holding a preset) */}
      <AnimatePresence>
        {pendingDelete !== null && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-between gap-3 w-full max-w-sm rounded-full bg-[#FFF2EE] border border-[#F5C6BD] px-4 py-2"
          >
            <span className="text-sm font-medium text-[#5A2D25]">
              حذف بازه {toPersianDigits(pendingDelete)} دقیقه‌ای؟
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={confirmDelete}
                disabled={presets.length <= 1}
                className="inline-flex items-center gap-1 rounded-full bg-[#E66353] text-white text-xs font-semibold px-3.5 py-2 min-h-[36px] active:scale-95 transition-transform disabled:opacity-40 whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
                حذف
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                aria-label="انصراف"
                className="inline-flex items-center justify-center rounded-full bg-white text-[#6E655D] w-9 h-9 active:scale-95 transition-transform"
              >
                <X className="w-4 h-4" strokeWidth={2.2} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable/wrapped ergonomic thumb-zone pastel preset pills + Add button */}
      <div
        className={`w-full flex items-center justify-center flex-wrap gap-2.5 transition-opacity duration-200 ${
          disabled ? 'opacity-55 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="بازه‌های زمانی آماده"
      >
        {presets.map((minutes, index) => {
          const palette = PASTEL_STYLES[index % PASTEL_STYLES.length];
          const isSelected = selectedMinutes === minutes;
          const isHolding = holdingMinutes === minutes;

          return (
            <button
              key={minutes}
              type="button"
              disabled={disabled}
              onPointerDown={() => handlePointerDown(minutes)}
              onPointerUp={() => handlePointerUp(minutes)}
              onPointerLeave={clearPressTimer}
              onPointerCancel={clearPressTimer}
              onContextMenu={(e) => handleContextMenu(e, minutes)}
              aria-pressed={isSelected}
              title="برای حذف، نگه دارید"
              className={`relative select-none touch-manipulation min-h-[48px] min-w-[62px] px-4 rounded-full font-bold text-base tabular-digits border-2 transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C7A] focus-visible:ring-offset-2 ${
                palette.bg
              } ${palette.text} ${
                isSelected ? `${palette.activeBorder} scale-[1.04]` : 'border-transparent'
              } ${isHolding ? 'scale-95' : 'active:scale-95'}`}
            >
              <span>{toPersianDigits(minutes)}</span>
            </button>
          );
        })}

        {/* Custom interval '+' trigger */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setPendingDelete(null);
            alarmAudio.subtleHaptic(12);
            onOpenCustomSheet();
          }}
          aria-label="افزودن بازه دلخواه"
          className="inline-flex items-center justify-center min-h-[48px] min-w-[48px] rounded-full bg-[#F3ECE4] text-[#4A423B] border-2 border-transparent hover:bg-[#EAE1D7] active:scale-95 transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C7A] focus-visible:ring-offset-2"
        >
          <Plus className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
