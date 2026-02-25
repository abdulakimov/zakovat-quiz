export type AudioChannelName = "clip" | "timer";

type PlayOptions = {
  loop?: boolean;
};

export class AudioManager {
  private clipElement: HTMLMediaElement | null = null;
  private timerAudio: HTMLAudioElement | null = null;
  private volume = 0.8;

  constructor() {
    if (typeof window !== "undefined") {
      this.timerAudio = new Audio();
      this.timerAudio.preload = "auto";
      this.timerAudio.loop = true;
      this.timerAudio.volume = this.volume;
    }
  }

  setClipElement(el: HTMLMediaElement | null) {
    this.clipElement = el;
    if (this.clipElement) {
      this.clipElement.volume = this.volume;
    }
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.timerAudio) this.timerAudio.volume = this.volume;
    if (this.clipElement) this.clipElement.volume = this.volume;
  }

  async playClip(url: string | null, options: PlayOptions = {}) {
    if (!url) return;
    const el = this.clipElement;
    if (!el) return;
    el.loop = Boolean(options.loop);
    try {
      if (el.src !== url) {
        el.src = url;
      }
      try {
        el.currentTime = 0;
      } catch {}
      await el.play();
    } catch (error) {
      throw error instanceof Error ? error : new Error("Failed to play clip media.");
    }
  }

  stopClip() {
    const el = this.clipElement;
    if (!el) return;
    el.pause();
    try {
      el.currentTime = 0;
    } catch {}
  }

  async playTimer(url: string | null, options: PlayOptions = {}) {
    if (!this.timerAudio) return;
    if (!url) {
      this.stopTimer();
      return;
    }
    this.timerAudio.loop = options.loop ?? true;
    if (this.timerAudio.src !== url) {
      this.timerAudio.src = url;
    }
    try {
      this.timerAudio.currentTime = 0;
    } catch {}
    try {
      await this.timerAudio.play();
    } catch (error) {
      throw error instanceof Error ? error : new Error("Failed to play timer audio.");
    }
  }

  stopTimer() {
    if (!this.timerAudio) return;
    this.timerAudio.pause();
    try {
      this.timerAudio.currentTime = 0;
    } catch {}
  }

  stopAll() {
    this.stopClip();
    this.stopTimer();
  }

  dispose() {
    this.stopAll();
    if (this.timerAudio) {
      this.timerAudio.src = "";
    }
    this.clipElement = null;
  }
}
