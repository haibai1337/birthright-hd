import {
  deserializeCampaign,
  serializeCampaign,
  type Campaign,
  type Scenario,
} from '../../../packages/core';
export const SAVE_KEY = 'birthright-hd.save.v1',
  AUTO_KEY = 'birthright-hd.auto.v1';
const SOUNDTRACK_VERSION = 1;
export interface Settings {
  labels: boolean;
  autosave: boolean;
  largeText: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  effectsVolume: number;
  muted: boolean;
  campaignTrack: string;
}
export const defaultSettings: Settings = {
  labels: true,
  autosave: true,
  largeText: false,
  musicEnabled: true,
  musicVolume: 0.45,
  effectsVolume: 0.6,
  muted: false,
  campaignTrack: 'default',
};
export function loadSettings(): Settings {
  const raw = localStorage.getItem('birthright-hd.settings');
  if (!raw) return defaultSettings;
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || !parsed) throw new Error('Invalid settings');
  const v = parsed as Record<string, unknown>;
  if (
    typeof v.labels !== 'boolean' ||
    typeof v.autosave !== 'boolean' ||
    typeof v.largeText !== 'boolean'
  )
    throw new Error('Invalid settings');
  const volume = (name: string, fallback: number) => {
    const value = v[name];
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.min(1, value))
      : fallback;
  };
  return {
    labels: v.labels,
    autosave: v.autosave,
    largeText: v.largeText,
    musicEnabled: typeof v.musicEnabled === 'boolean' ? v.musicEnabled : true,
    musicVolume: volume('musicVolume', 0.45),
    effectsVolume: volume('effectsVolume', 0.6),
    muted: typeof v.muted === 'boolean' ? v.muted : false,
    campaignTrack:
      v.soundtrackVersion === SOUNDTRACK_VERSION &&
      typeof v.campaignTrack === 'string' &&
      /^(?:default|MUSIC\/\d+\.WAV)$/.test(v.campaignTrack)
        ? v.campaignTrack
        : 'default',
  };
}
export function persistSettings(settings: Settings) {
  // Older selections predate recovery of the real realm cue and must not silently
  // override it. Later explicit manual selections are retained with this version.
  localStorage.setItem(
    'birthright-hd.settings',
    JSON.stringify({ ...settings, soundtrackVersion: SOUNDTRACK_VERSION }),
  );
}
export function saveCampaign(state: Campaign, automatic = false) {
  localStorage.setItem(
    slot(state.scenarioId, state.scenarioFingerprint, automatic),
    serializeCampaign(state),
  );
}
function slot(id: string, fingerprint: string | undefined, automatic: boolean) {
  return fingerprint
    ? `birthright-hd.${automatic ? 'auto' : 'save'}.${id}.${fingerprint}`
    : automatic
      ? AUTO_KEY
      : SAVE_KEY;
}
export function loadCampaign(scenario: Scenario, automatic = false) {
  const raw = localStorage.getItem(slot(scenario.id, scenario.fingerprint, automatic));
  if (!raw) throw new Error('No saved campaign in this slot.');
  return deserializeCampaign(raw, scenario);
}
export function downloadCampaign(state: Campaign) {
  const blob = new Blob([serializeCampaign(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `birthright-turn-${state.turn}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
