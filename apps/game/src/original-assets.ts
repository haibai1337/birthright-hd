import { useEffect, useState } from 'react';
export interface OriginalAsset {
  file: string;
  width?: number;
  height?: number;
  frames?: string[];
  frameMs?: number;
}
export interface OriginalAssets {
  version: 1;
  private: true;
  assets: Record<string, OriginalAsset>;
  portraits: Record<string, string>;
  mapIcons: string[];
  troopIcons?: Record<number, string>;
  music: { menu: string; campaign: string; campaignFallback: boolean; note: string };
  effects: { click: string; order: string; error: string };
}
let pending: Promise<OriginalAssets | null> | undefined;
export function assetUrl(pack: OriginalAssets | null, id: string) {
  const file = pack?.assets[id]?.file;
  return file && /^(?:images|audio)\/[A-Za-z0-9_./&!+ -]+$/.test(file) && !file.includes('..')
    ? '/_private/' + file
    : undefined;
}
export function loadOriginalAssets() {
  pending ??= fetch('/_private/runtime.json')
    .then((r) => (r.ok ? r : fetch('/_private/manifest.json')))
    .then(async (r) => {
      if (!r.ok) return null;
      const data = (await r.json()) as OriginalAssets;
      if (
        data.version !== 1 ||
        data.private !== true ||
        !data.assets ||
        !data.music ||
        !data.portraits ||
        !data.mapIcons
      )
        throw new Error('Unsupported local asset manifest');
      return data;
    })
    .catch(() => null);
  return pending;
}
export function useOriginalAssets() {
  const [pack, setPack] = useState<OriginalAssets | null>(null);
  useEffect(() => {
    let active = true;
    void loadOriginalAssets().then((p) => {
      if (active) setPack(p);
    });
    return () => {
      active = false;
    };
  }, []);
  return pack;
}
