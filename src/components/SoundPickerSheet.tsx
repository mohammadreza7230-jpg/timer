import React from 'react';
import { Check, Volume2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ALARM_SOUNDS, type AlarmSoundId } from '../types/timer';
import { alarmAudio } from '../utils/audioEngine';

interface SoundPickerSheetProps {
  isOpen: boolean;
  selectedSoundId: AlarmSoundId;
  onSelect: (id: AlarmSoundId) => void;
  onClose: () => void;
}

export const SoundPickerSheet: React.FC<SoundPickerSheetProps> = ({
  isOpen,
  selectedSoundId,
  onSelect,
  onClose,
}) => {
  const handlePick = (id: AlarmSoundId) => {
    onSelect(id);
    void alarmAudio.preview(id);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="انتخاب صدای زنگ"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => {
              alarmAudio.stopActiveVoices();
              onClose();
            }}
            className="fixed inset-0 bg-[#2D2A26]/25 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative z-10 w-full max-w-md rounded-t-[32px] bg-[#FFFDF9] px-6 pt-3 pb-safe"
          >
            <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-[#E5DDD4]" />

            <h2 className="text-center text-lg font-bold text-[#2D2A26]">
              صدای زنگ
            </h2>

            <div className="mt-5 flex flex-col gap-2.5">
              {ALARM_SOUNDS.map((sound) => {
                const isSelected = sound.id === selectedSoundId;
                return (
                  <button
                    key={sound.id}
                    type="button"
                    onClick={() => handlePick(sound.id)}
                    className={`w-full min-h-[60px] flex items-center justify-between rounded-full px-5 py-3 text-right border-2 transition-colors duration-150 active:scale-[0.99] ${
                      isSelected
                        ? 'bg-[#FFF0EC] border-[#FF8C7A] text-[#2D2A26]'
                        : 'bg-[#F7F2EC] border-transparent text-[#3D3732] hover:bg-[#F1EAE1]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-full ${
                          isSelected
                            ? 'bg-[#FF8C7A] text-white'
                            : 'bg-[#FFFDF9] text-[#7A7167]'
                        }`}
                      >
                        <Volume2 className="w-4 h-4" strokeWidth={2.2} />
                      </span>
                      <div className="flex flex-col">
                        <span className="font-bold text-base leading-tight">
                          {sound.name}
                        </span>
                        <span className="text-xs text-[#7C7268] mt-0.5">
                          {sound.subtitle}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#FF8C7A]/15 text-[#D95B48]">
                        <Check className="w-4 h-4" strokeWidth={2.8} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
