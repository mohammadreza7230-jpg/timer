import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        aria-label="نصب اپلیکیشن روی گوشی"
        title="نصب اپلیکیشن"
        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full bg-[#F4EFE9] text-[#5C534B] hover:bg-[#EAE1D8] active:scale-95 transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C7A]"
      >
        <Download className="w-5 h-5" strokeWidth={2.1} />
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          aria-label="نصب روی آیفون"
          title="افزودن به صفحه اصلی"
          className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full bg-[#F4EFE9] text-[#5C534B] hover:bg-[#EAE1D8] active:scale-95 transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8C7A]"
        >
          <Download className="w-5 h-5" strokeWidth={2.1} />
        </button>

        <AnimatePresence>
          {showIOSGuide && (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center"
              role="dialog"
              aria-modal="true"
              aria-label="راهنمای نصب روی آیفون"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowIOSGuide(false)}
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
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#2D2A26]">
                    نصب روی صفحه اصلی
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowIOSGuide(false)}
                    aria-label="بستن"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#F4EFE9] text-[#5C534B]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="mt-3 text-sm leading-7 text-[#5C534B]">
                  ۱. دکمه <Share className="inline w-4 h-4 mx-1 -mt-0.5" />{' '}
                  <strong>Share</strong> در پایین سافاری را بزنید.
                  <br />
                  ۲. گزینه <strong>Add to Home Screen</strong> را انتخاب کنید تا
                  اپ بدون نیاز به اینترنت همیشه در دسترس باشد.
                </p>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-5 w-full h-12 rounded-full bg-[#FF8C7A] text-white font-bold text-base"
                >
                  متوجه شدم
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return null;
};
