import { toPersianDigits } from './formatters';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
}

let wakeLockSentinel: WakeLockSentinelLike | null = null;
let permissionRequestedOnce = false;

/**
 * Creates a lightweight inline Web Worker that ticks every 200ms.
 * Web Workers avoid aggressive main-thread timer throttling when mobile tabs
 * are backgrounded or screens dim.
 */
export function createBackgroundTicker(onTick: () => void): {
  start: () => void;
  stop: () => void;
  destroy: () => void;
} {
  let worker: Worker | null = null;
  let fallbackInterval: number | null = null;

  try {
    const workerCode = `
      let timerId = null;
      self.onmessage = function(e) {
        if (e.data === 'start') {
          if (timerId) clearInterval(timerId);
          timerId = setInterval(() => self.postMessage('tick'), 200);
        } else if (e.data === 'stop') {
          if (timerId) {
            clearInterval(timerId);
            timerId = null;
          }
        }
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    worker = new Worker(url);
    worker.onmessage = () => onTick();
    URL.revokeObjectURL(url);
  } catch {
    worker = null;
  }

  return {
    start() {
      if (worker) {
        worker.postMessage('start');
      } else {
        if (fallbackInterval !== null) window.clearInterval(fallbackInterval);
        fallbackInterval = window.setInterval(onTick, 200);
      }
    },
    stop() {
      if (worker) {
        worker.postMessage('stop');
      }
      if (fallbackInterval !== null) {
        window.clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    },
    destroy() {
      this.stop();
      if (worker) {
        worker.terminate();
        worker = null;
      }
    },
  };
}

/**
 * Requests Screen Wake Lock while the timer is actively counting down.
 */
export async function acquireWakeLock(): Promise<void> {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
  try {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
    };
    if (!wakeLockSentinel || wakeLockSentinel.released) {
      wakeLockSentinel = (await nav.wakeLock?.request('screen')) ?? null;
    }
  } catch {
    // Wake lock can fail if battery saver is active or tab isn't visible yet
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (!wakeLockSentinel) return;
  try {
    await wakeLockSentinel.release();
  } catch {
    // Ignore
  } finally {
    wakeLockSentinel = null;
  }
}

/**
 * Zero-friction permission request: triggers automatically once when the user
 * presses Start for the first time, never blocking the timer.
 */
export function requestNotificationPermissionOnce(): void {
  if (permissionRequestedOnce) return;
  permissionRequestedOnce = true;

  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    try {
      void Notification.requestPermission();
    } catch {
      // Ignore permission rejection
    }
  }
}

/**
 * Dispatches a persistent local alarm notification via Service Worker (preferred for mobile)
 * or standard Notification API fallback.
 */
export async function triggerAlarmNotification(minutes: number): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const title = `زمان بازه ${toPersianDigits(minutes)} دقیقه‌ای تمام شد`;
  const options: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body: 'برای قطع زنگ و شروع دور بعدی لمس کنید',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'cycle-interval-alarm',
    requireInteraction: true,
    renotify: true,
    vibrate: [450, 220, 450, 580],
    dir: 'rtl',
    lang: 'fa',
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, options);
        return;
      }
    }
  } catch {
    // Fallback to Notification constructor
  }

  try {
    const notif = new Notification(title, options);
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  } catch {
    // Ignore if browser restricts direct Notification constructor
  }
}

export async function clearAlarmNotifications(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg && 'getNotifications' in reg) {
      const notifications = await reg.getNotifications({ tag: 'cycle-interval-alarm' });
      notifications.forEach((n) => n.close());
    }
  } catch {
    // Ignore
  }
}
