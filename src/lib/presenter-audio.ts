export class AudioManager {
  private cache = new Map<string, HTMLAudioElement>();
  private currentUrl: string | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private volume = 0.8;
  private fadeMs = 150;
  private fadeTimer: number | null = null;

  preload(urls: Array<string | null | undefined>) {
    for (const raw of urls) {
      const url = raw ?? null;
      if (!url || this.cache.has(url)) continue;
      const audio = new Audio(url);
      audio.preload = "auto";
      audio.loop = true;
      audio.volume = this.volume;
      this.cache.set(url, audio);
    }
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.currentAudio) this.currentAudio.volume = this.volume;
    for (const audio of this.cache.values()) {
      audio.volume = this.volume;
    }
  }

  setSource(url: string | null, loop = true) {
    if (url === this.currentUrl) {
      if (this.currentAudio) this.currentAudio.loop = loop;
      return;
    }
    this.stop();
    this.currentUrl = url;
    if (!url) return;
    const audio = this.cache.get(url) ?? new Audio(url);
    audio.preload = "auto";
    audio.loop = loop;
    audio.currentTime = 0;
    audio.volume = this.volume;
    this.cache.set(url, audio);
    this.currentAudio = audio;
  }

  async play() {
    if (!this.currentAudio) return;
    try {
      await this.currentAudio.play();
      this.fadeTo(this.volume);
    } catch (error) {
      throw error instanceof Error ? error : new Error("Failed to play audio.");
    }
  }

  pause() {
    if (!this.currentAudio) return;
    this.currentAudio.pause();
    this.clearFade();
  }

  stop() {
    if (!this.currentAudio) {
      this.currentUrl = null;
      return;
    }
    this.currentAudio.pause();
    try {
      this.currentAudio.currentTime = 0;
    } catch {}
    this.clearFade();
    this.currentAudio = null;
    this.currentUrl = null;
  }

  async restart() {
    if (!this.currentAudio) return;
    this.currentAudio.pause();
    this.currentAudio.currentTime = 0;
    await this.play();
  }

  dispose() {
    this.stop();
    for (const audio of this.cache.values()) {
      audio.pause();
      audio.src = "";
    }
    this.cache.clear();
  }

  private fadeTo(target: number) {
    if (!this.currentAudio) return;
    this.clearFade();
    const audio = this.currentAudio;
    const start = audio.volume;
    const delta = target - start;
    const steps = 5;
    const stepMs = Math.max(20, Math.floor(this.fadeMs / steps));
    let i = 0;
    this.fadeTimer = window.setInterval(() => {
      i += 1;
      if (!this.currentAudio || this.currentAudio !== audio || i >= steps) {
        audio.volume = target;
        this.clearFade();
        return;
      }
      audio.volume = Math.max(0, Math.min(1, start + (delta * i) / steps));
    }, stepMs);
  }

  private clearFade() {
    if (this.fadeTimer != null) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
  }
}

