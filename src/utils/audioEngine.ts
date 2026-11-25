import type { AlarmSoundId } from '../types/timer';

/**
 * 100% offline Web Audio API alarm engine with:
 * - User-gesture AudioContext unlocking for mobile browsers
 * - Low-power silent keep-alive source while timer is active
 * - 4 distinct calm/clear alarm chime patterns
 * - Continuous looping playback + continuous vibration pattern until explicitly stopped
 */
class AlarmAudioEngine {
  private ctx: AudioContext | null = null;
  private loopTimer: number | null = null;
  private vibrationTimer: number | null = null;
  private keepAliveNode: AudioBufferSourceNode | null = null;
  private keepAliveGain: GainNode | null = null;
  private activeNodes: Set<AudioNode> = new Set();
  private isRinging = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioCtx();
    }
    return this.ctx;
  }

  /**
   * Must be invoked inside a user gesture (tap Start / tap Sound) to unlock audio on iOS & Android.
   */
  public async unlock(): Promise<void> {
    const ctx = this.getContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Ignore resume errors when called outside gesture
      }
    }

    // Play a 1-sample silent buffer to unlock iOS Safari Web Audio
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      // Safe fallback
    }
  }

  /**
   * Keeps the mobile browser audio session warm while a countdown is running,
   * maximizing reliability when the screen dims or locks.
   */
  public startKeepAlive(): void {
    const ctx = this.getContext();
    if (!ctx || this.keepAliveNode) return;

    try {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gain = ctx.createGain();
      gain.gain.value = 0.0001; // Effectively silent

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      this.keepAliveNode = source;
      this.keepAliveGain = gain;
    } catch {
      // Ignore if blocked
    }
  }

  public stopKeepAlive(): void {
    if (this.keepAliveNode) {
      try {
        this.keepAliveNode.stop();
        this.keepAliveNode.disconnect();
      } catch {
        // Ignore
      }
      this.keepAliveNode = null;
    }
    if (this.keepAliveGain) {
      try {
        this.keepAliveGain.disconnect();
      } catch {
        // Ignore
      }
      this.keepAliveGain = null;
    }
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    startOffset: number,
    duration: number,
    peakGain: number,
    type: OscillatorType = 'sine',
    harmonicFreq?: number
  ): void {
    const now = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    // Smooth percussive/bell envelope without clicks
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    this.activeNodes.add(osc);
    this.activeNodes.add(gain);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      this.activeNodes.delete(osc);
      this.activeNodes.delete(gain);
    };

    osc.start(now);
    osc.stop(now + duration + 0.04);

    if (harmonicFreq) {
      const hOsc = ctx.createOscillator();
      const hGain = ctx.createGain();
      hOsc.type = 'sine';
      hOsc.frequency.setValueAtTime(harmonicFreq, now);

      hGain.gain.setValueAtTime(0.0001, now);
      hGain.gain.exponentialRampToValueAtTime(peakGain * 0.35, now + 0.015);
      hGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.7);

      hOsc.connect(hGain);
      hGain.connect(ctx.destination);

      this.activeNodes.add(hOsc);
      this.activeNodes.add(hGain);

      hOsc.onended = () => {
        hOsc.disconnect();
        hGain.disconnect();
        this.activeNodes.delete(hOsc);
        this.activeNodes.delete(hGain);
      };

      hOsc.start(now);
      hOsc.stop(now + duration * 0.75 + 0.03);
    }
  }

  private playPhrase(soundId: AlarmSoundId): number {
    const ctx = this.getContext();
    if (!ctx) return 1800;

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    switch (soundId) {
      case 'morning': {
        // Warm rising bell triad: C5 -> E5 -> G5 -> C6
        this.playTone(ctx, 523.25, 0.0, 0.55, 0.32, 'sine', 1046.5);
        this.playTone(ctx, 659.25, 0.2, 0.55, 0.32, 'sine', 1318.5);
        this.playTone(ctx, 783.99, 0.4, 0.65, 0.35, 'sine', 1567.98);
        this.playTone(ctx, 1046.5, 0.62, 0.9, 0.28, 'sine');
        return 1900;
      }
      case 'crystal': {
        // Clear bright chime: A5 -> E6 -> A5 -> C#6
        this.playTone(ctx, 880.0, 0.0, 0.45, 0.34, 'triangle', 1760.0);
        this.playTone(ctx, 1318.51, 0.22, 0.55, 0.32, 'sine', 2637.0);
        this.playTone(ctx, 1108.73, 0.52, 0.75, 0.30, 'triangle', 2217.46);
        return 1650;
      }
      case 'pulse': {
        // Soft warm dual-note wave: F4+A4 -> G4+C5
        this.playTone(ctx, 349.23, 0.0, 0.75, 0.30, 'sine', 698.46);
        this.playTone(ctx, 440.0, 0.05, 0.75, 0.26, 'sine');
        this.playTone(ctx, 392.0, 0.55, 0.85, 0.32, 'sine', 783.99);
        this.playTone(ctx, 523.25, 0.6, 0.85, 0.28, 'sine');
        return 2000;
      }
      case 'crisp':
      default: {
        // Unmistakable modern double-bell alert: G5-G5 ... B5-B5
        this.playTone(ctx, 783.99, 0.0, 0.22, 0.38, 'triangle', 1567.98);
        this.playTone(ctx, 783.99, 0.22, 0.25, 0.38, 'triangle', 1567.98);
        this.playTone(ctx, 987.77, 0.56, 0.24, 0.40, 'triangle', 1975.53);
        this.playTone(ctx, 987.77, 0.78, 0.32, 0.40, 'triangle', 1975.53);
        return 1550;
      }
    }
  }

  public stopActiveVoices(): void {
    this.activeNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore already stopped nodes
      }
    });
    this.activeNodes.clear();
  }

  public async preview(soundId: AlarmSoundId): Promise<void> {
    if (this.isRinging) return;
    await this.unlock();
    this.stopActiveVoices();
    this.playPhrase(soundId);
  }

  public startContinuousAlarm(soundId: AlarmSoundId): void {
    this.stopContinuousAlarm();
    this.isRinging = true;

    const triggerCycle = () => {
      if (!this.isRinging) return;
      const intervalMs = this.playPhrase(soundId);
      this.loopTimer = window.setTimeout(triggerCycle, intervalMs);
    };

    triggerCycle();

    // Continuous vibration loop on supported mobile devices
    const triggerVibration = () => {
      if (!this.isRinging) return;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate([450, 220, 450, 580]);
        } catch {
          // Ignore unsupported vibrate
        }
      }
    };

    triggerVibration();
    this.vibrationTimer = window.setInterval(triggerVibration, 1750);
  }

  public stopContinuousAlarm(): void {
    this.isRinging = false;

    if (this.loopTimer !== null) {
      window.clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }

    if (this.vibrationTimer !== null) {
      window.clearInterval(this.vibrationTimer);
      this.vibrationTimer = null;
    }

    this.stopActiveVoices();

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignore
      }
    }
  }

  public subtleHaptic(durationMs = 20): void {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(durationMs);
      } catch {
        // Ignore
      }
    }
  }
}

export const alarmAudio = new AlarmAudioEngine();
