import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings, loadSettings, persistSettings } from '../apps/game/src/storage';

describe('original realm soundtrack migration', () => {
  const values = new Map<string, string>();
  beforeEach(() => {
    values.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it('replaces a legacy Adventure override while retaining all other preferences', () => {
    const old = {
      ...defaultSettings,
      campaignTrack: 'MUSIC/101.WAV',
      musicEnabled: false,
      musicVolume: 0.23,
      effectsVolume: 0.17,
      muted: true,
      labels: false,
      autosave: false,
      largeText: true,
    };
    values.set('birthright-hd.settings', JSON.stringify(old));
    const restored = loadSettings();
    expect(restored).toEqual({ ...old, campaignTrack: 'default' });
    persistSettings(restored);
    expect(loadSettings()).toEqual(restored);
  });
  it('retains a later deliberate manual recording selection', () => {
    const selected = { ...defaultSettings, campaignTrack: 'MUSIC/109.WAV' };
    persistSettings(selected);
    expect(loadSettings()).toEqual(selected);
  });
  it('keeps a user-corrected original realm selection on subsequent loads', () => {
    values.set('birthright-hd.settings', JSON.stringify(defaultSettings));
    const restored = loadSettings();
    persistSettings(restored);
    expect(loadSettings().campaignTrack).toBe('default');
  });
});
