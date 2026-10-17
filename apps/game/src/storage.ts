import {
  deserializeCampaign,
  serializeCampaign,
  type Campaign,
  type Scenario,
} from '../../../packages/core';
export const SAVE_KEY = 'birthright-hd.save.v1',
  AUTO_KEY = 'birthright-hd.auto.v1';
export interface Settings {
  labels: boolean;
  autosave: boolean;
  largeText: boolean;
}
export const defaultSettings: Settings = { labels: true, autosave: true, largeText: false };
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
  return { labels: v.labels, autosave: v.autosave, largeText: v.largeText };
}
export function persistSettings(settings: Settings) {
  localStorage.setItem('birthright-hd.settings', JSON.stringify(settings));
}
export function saveCampaign(state: Campaign, automatic = false) {
  localStorage.setItem(automatic ? AUTO_KEY : SAVE_KEY, serializeCampaign(state));
}
export function loadCampaign(scenario: Scenario, automatic = false) {
  const raw = localStorage.getItem(automatic ? AUTO_KEY : SAVE_KEY);
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
