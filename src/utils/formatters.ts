const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

/**
 * Formats remaining milliseconds into MM:SS (or H:MM:SS when >= 100 minutes)
 * using ceiling rounding so 35:00 displays cleanly and hits 00:00 right at completion.
 */
export function formatCountdown(remainingMs: number): string {
  const clampedMs = Math.max(0, remainingMs);
  const totalSeconds = Math.ceil(clampedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (totalSeconds >= 6000) {
    // 100+ minutes: H:MM:SS
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return toPersianDigits(`${hours}:${mm}:${ss}`);
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const mm = String(totalMinutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return toPersianDigits(`${mm}:${ss}`);
}

/**
 * Formats an exact timestamp as 24-hour HH:MM in Persian digits (e.g. ۱۴:۱۵).
 */
export function formatClockTime(timestampMs: number): string {
  const date = new Date(timestampMs);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return toPersianDigits(`${hh}:${mm}`);
}

/**
 * Formats elapsed overtime while the alarm is ringing (MM:SS).
 */
export function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const secs = String(totalSeconds % 60).padStart(2, '0');
  return toPersianDigits(`${mins}:${secs}`);
}
