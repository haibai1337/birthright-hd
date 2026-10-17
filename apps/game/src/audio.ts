import { assetUrl, type OriginalAssets } from './original-assets';
export interface AudioPreferences {
  musicVolume: number;
  effectsVolume: number;
  muted: boolean;
  campaignTrack: string;
}
/** Presentation-only audio: never reads or advances campaign RNG. */
export class OriginalAudio {
  private music: HTMLAudioElement | null = null;
  private effects = new Set<HTMLAudioElement>();
  private retiring = new Set<HTMLAudioElement>();
  private pack: OriginalAssets | null = null;
  private prefs: AudioPreferences = {
    musicVolume: 0.45,
    effectsVolume: 0.6,
    muted: false,
    campaignTrack: 'default',
  };
  private scene: 'menu' | 'campaign' = 'menu';
  private unlocked = false;
  private current = '';
  private generation = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private error = '';
  configure(pack: OriginalAssets | null, prefs: AudioPreferences, scene: 'menu' | 'campaign') {
    this.pack = pack;
    this.prefs = prefs;
    this.scene = scene;
    if (this.music) this.music.volume = prefs.muted ? 0 : prefs.musicVolume;
    for (const effect of this.effects) effect.volume = prefs.muted ? 0 : prefs.effectsVolume;
    this.sync();
  }
  unlock = () => {
    this.unlocked = true;
    this.sync();
  };
  private sync() {
    if (!this.unlocked || !this.pack) return;
    const id =
      this.scene === 'menu'
        ? this.pack.music.menu
        : this.prefs.campaignTrack === 'default'
          ? this.pack.music.campaign
          : this.prefs.campaignTrack;
    const url = assetUrl(this.pack, id);
    if (!url || id === this.current) return;
    this.current = id;
    this.error = '';
    const generation = ++this.generation;
    if (this.timer) clearInterval(this.timer);
    for (const old of this.retiring) {
      old.pause();
      old.remove();
    }
    this.retiring.clear();
    const previous = this.music,
      music = new Audio(url);
    if (previous) this.retiring.add(previous);
    this.music = music;
    music.loop = true;
    music.preload = 'auto';
    music.volume = 0;
    music.hidden = true;
    music.dataset.testid = 'original-music';
    previous?.removeAttribute('data-testid');
    document.body.append(music);
    music.addEventListener('error', () => {
      this.error = 'Unable to play recovered track ' + id;
    });
    void music
      .play()
      .then(() => {
        if (generation !== this.generation) {
          music.pause();
          music.remove();
          return;
        }
        let step = 0;
        this.timer = setInterval(() => {
          if (generation !== this.generation) return;
          step++;
          const volume = this.prefs.muted ? 0 : this.prefs.musicVolume;
          music.volume = volume * Math.min(1, step / 12);
          if (previous) previous.volume = volume * Math.max(0, 1 - step / 12);
          if (step >= 12) {
            previous?.pause();
            previous?.remove();
            if (this.timer) clearInterval(this.timer);
            this.timer = undefined;
          }
        }, 40);
      })
      .catch((e) => {
        this.error = String(e);
        this.current = '';
        previous?.pause();
        previous?.remove();
      });
  }
  effect(kind: 'click' | 'order' | 'error') {
    if (!this.unlocked || !this.pack || this.prefs.muted || this.prefs.effectsVolume === 0) return;
    const url = assetUrl(this.pack, this.pack.effects[kind]);
    if (!url) return;
    if (this.effects.size >= 4) {
      const old = this.effects.values().next().value;
      if (old) {
        old.pause();
        this.effects.delete(old);
      }
    }
    const audio = new Audio(url);
    audio.volume = this.prefs.effectsVolume;
    this.effects.add(audio);
    const done = () => this.effects.delete(audio);
    audio.addEventListener('ended', done, { once: true });
    audio.addEventListener('error', done, { once: true });
    void audio.play().catch(done);
  }
  get status() {
    return {
      unlocked: this.unlocked,
      track: this.current,
      playing: !!this.music && !this.music.paused,
      volume: this.music?.volume ?? 0,
      muted: this.prefs.muted,
      error: this.error,
    };
  }
  destroy() {
    this.generation++;
    if (this.timer) clearInterval(this.timer);
    this.music?.pause();
    this.music?.remove();
    this.music = null;
    for (const a of this.retiring) {
      a.pause();
      a.remove();
    }
    this.retiring.clear();
    for (const a of this.effects) a.pause();
    this.effects.clear();
    this.current = '';
  }
}
export const originalAudio = new OriginalAudio();
