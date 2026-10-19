import { assetUrl, type OriginalAssets } from './original-assets';
export interface AudioPreferences {
  musicEnabled: boolean;
  musicVolume: number;
  effectsVolume: number;
  muted: boolean;
  campaignTrack: string;
}
export type AudioEffect = keyof OriginalAssets['effects'];
/** Presentation-only audio; one music element, independent channel preferences and master mute. */
export class OriginalAudio {
  private music: HTMLAudioElement | null = null;
  private effects = new Set<HTMLAudioElement>();
  private listeners = new Set<() => void>();
  private pack: OriginalAssets | null = null;
  private prefs: AudioPreferences = {
    musicEnabled: true,
    musicVolume: 0.45,
    effectsVolume: 0.6,
    muted: false,
    campaignTrack: 'default',
  };
  private scene: 'menu' | 'campaign' = 'menu';
  private unlocked = false;
  private current = '';
  private request = 0;
  private starting = false;
  private error = '';
  private sceneSuspended = 0;
  suspendMusic() {
    this.sceneSuspended++;
    this.sync();
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.sceneSuspended--;
        this.sync();
      }
    };
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit = () => {
    for (const listener of this.listeners) listener();
  };
  configure(pack: OriginalAssets | null, prefs: AudioPreferences, scene: 'menu' | 'campaign') {
    this.pack = pack;
    this.prefs = prefs;
    this.scene = scene;
    for (const effect of this.effects) effect.volume = prefs.muted ? 0 : prefs.effectsVolume;
    this.sync();
    this.emit();
  }
  unlock = () => {
    this.unlocked = true;
    this.sync();
    this.emit();
  };
  private audible() {
    return (
      this.sceneSuspended === 0 &&
      this.prefs.musicEnabled &&
      !this.prefs.muted &&
      this.prefs.musicVolume > 0
    );
  }
  private sync() {
    if (!this.unlocked || !this.pack) return;
    const id =
      this.scene === 'menu'
        ? this.pack.music.menu
        : this.prefs.campaignTrack === 'default'
          ? this.pack.music.campaign
          : this.prefs.campaignTrack;
    const url = assetUrl(this.pack, id);
    if (!url) {
      this.music?.pause();
      this.error = `Original recording ${id} is unavailable. Run the original asset import.`;
      return;
    }
    if (!this.music) {
      const music = new Audio();
      this.music = music;
      music.loop = true;
      music.preload = 'auto';
      music.hidden = true;
      music.dataset.testid = 'original-music';
      music.addEventListener('playing', this.emit);
      music.addEventListener('pause', this.emit);
      music.addEventListener('error', () => {
        if (this.music !== music) return;
        this.starting = false;
        this.error = `Unable to load original ${this.current}. Check the asset import and retry playback.`;
        this.emit();
      });
      document.body.append(music);
    }
    const music = this.music;
    if (id !== this.current) {
      this.request++;
      this.starting = false;
      music.pause();
      this.current = id;
      this.error = '';
      music.src = url;
      music.dataset.track = id;
      music.load();
    }
    music.volume = this.prefs.muted || !this.prefs.musicEnabled ? 0 : this.prefs.musicVolume;
    if (!this.audible()) {
      this.request++;
      this.starting = false;
      music.pause();
      return;
    }
    // Same recording does not mean it is playing: resume after mute, zero volume,
    // an explicit Off setting, or a browser autoplay rejection.
    if (!music.paused || this.starting) return;
    if (music.error) music.load();
    this.starting = true;
    const request = ++this.request;
    void music
      .play()
      .then(() => {
        if (request !== this.request) return;
        this.starting = false;
        this.error = '';
        if (!this.audible()) music.pause();
        this.emit();
      })
      .catch((error: unknown) => {
        if (request !== this.request) return;
        this.starting = false;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        this.error =
          error instanceof DOMException && error.name === 'NotAllowedError'
            ? 'Playback is waiting for a click or key press. Use Resume playback to try again.'
            : `Unable to play original ${id}. Check the imported recording and retry playback.`;
        this.emit();
      });
  }
  effect(kind: AudioEffect) {
    const id = this.pack?.effects[kind];
    return id ? this.recording(id, kind) : undefined;
  }
  /** Original scene cues share the existing effects channel and live mute/volume controls. */
  recording(id: string, kind = 'cinematic') {
    if (!this.unlocked || !this.pack || this.prefs.muted || this.prefs.effectsVolume === 0) return;
    const url = id ? assetUrl(this.pack, id) : undefined;
    if (!url) return;
    if (this.effects.size >= 4) {
      const old = this.effects.values().next().value;
      if (old) {
        old.pause();
        old.remove();
        this.effects.delete(old);
      }
    }
    const audio = new Audio(url);
    audio.volume = this.prefs.effectsVolume;
    audio.dataset.testid = 'original-effect';
    audio.dataset.effect = kind;
    document.body.append(audio);
    this.effects.add(audio);
    const done = () => {
      this.effects.delete(audio);
      audio.remove();
    };
    audio.addEventListener('ended', done, { once: true });
    audio.addEventListener('error', done, { once: true });
    void audio.play().catch(done);
    return () => {
      audio.pause();
      done();
    };
  }
  get status() {
    return {
      unlocked: this.unlocked,
      track: this.current,
      playing: !!this.music && !this.music.paused,
      volume: this.music?.volume ?? 0,
      muted: this.prefs.muted,
      musicEnabled: this.prefs.musicEnabled,
      error: this.error,
    };
  }
  destroy() {
    this.request++;
    this.starting = false;
    this.music?.pause();
    this.music?.remove();
    this.music = null;
    for (const effect of this.effects) {
      effect.pause();
      effect.remove();
    }
    this.effects.clear();
    this.current = '';
    this.unlocked = false;
    this.error = '';
    this.emit();
  }
}
export const originalAudio = new OriginalAudio();
